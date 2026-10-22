import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Brush,
  Layers,
  Sparkles,
  Image as ImageIcon,
  Move,
  Crosshair,
  Hand,
  Maximize,
  Lasso,
  Eraser,
  Scissors,
  Copy,
  Zap,
  ZapOff,
  Check,
  X,
  Play,
  Pause,
  Bandage,
  Activity,
  WandSparkles,
  FolderOpen,
} from 'lucide-react';
import { MapMarker, MarkerMotionLayer } from '../types/map';
import {
  MeshGrid,
  EffectType,
  LayerStroke,
  createMeshGrid,
  computeMeshWeights,
  updateMeshDeformation,
  renderDeformedMesh,
  updateClothFlagMesh,
} from '../utils/motionCanvasEngine';
import {
  computeLayerPhysics,
  applyLayerTransform,
  computeNpcJellyTransform,
} from '../utils/motionPhysicsEngine';
import { extractCutoutPiece } from '../utils/motionCutoutExtractor';
import { repairInpaintArea } from '../utils/motionInpaintRepair';
import { MotionPivotReticle } from './MotionPivotReticle';
import type { BrushMode, ExtractionAction } from './MotionBrushStudio';

export type MotionCanvasTool = 'move' | 'brush' | 'pivot' | 'pan';
export type GizmoHandle = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';

interface Props {
  marker: MapMarker | null;
  activeLayer: MarkerMotionLayer | null;
  layers?: MarkerMotionLayer[];
  brushSize: number;
  brushMode?: BrushMode;
  onBrushModeChange?: (mode: BrushMode) => void;
  smoothLevel?: number;
  activeTool?: MotionCanvasTool;
  onActiveToolChange?: (tool: MotionCanvasTool) => void;
  onAddStroke: (stroke: LayerStroke) => void;
  onUpdateActiveLayer?: (updates: Partial<MarkerMotionLayer>) => void;
  onCreateCutoutPiece?: (layer: MarkerMotionLayer) => void;
  onReplaceBaseAssetPng?: (newPngUrl: string) => void;
  onSelectMarkerRequest?: () => void;
  onSelectLayer?: (layerId: string) => void;
  isPrimordialJelly?: boolean;
  onTogglePrimordialJelly?: () => void;
  extractionAction?: ExtractionAction;
  onExtractionActionChange?: (action: ExtractionAction) => void;
  autoExtract?: boolean;
  onAutoExtractChange?: (auto: boolean) => void;
  onOpenStartupHub?: () => void;
}

export const MotionCanvasWorkspace: React.FC<Props> = ({
  marker,
  activeLayer,
  layers = [],
  brushSize,
  brushMode = 'brush',
  onBrushModeChange,
  smoothLevel = 2,
  activeTool = 'brush',
  onActiveToolChange,
  onAddStroke,
  onUpdateActiveLayer,
  onCreateCutoutPiece,
  onReplaceBaseAssetPng,
  onSelectMarkerRequest,
  onSelectLayer,
  isPrimordialJelly: propIsPrimordialJelly,
  onTogglePrimordialJelly,
  extractionAction = 'copy',
  onExtractionActionChange,
  autoExtract = true,
  onAutoExtractChange,
  onOpenStartupHub,
}) => {
  // Viewport Pan e Zoom Livres
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMiddlePanning, setIsMiddlePanning] = useState<boolean>(false);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  const [showPivotReticle, setShowPivotReticle] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseImgRef = useRef<HTMLImageElement | null>(null);
  const [baseImgLoaded, setBaseImgLoaded] = useState(false);

  // Cache de imagens das peças filhas importadas
  const layerImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  // Cache de malhas densas para deformação de Tecido e Bandeira
  const layerMeshesRef = useRef<Map<string, MeshGrid>>(new Map());

  // Estados de interação no canvas
  const [isInteracting, setIsInteracting] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panInitialRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragInitialLayerOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentStrokePoints = useRef<{ x: number; y: number }[]>([]);

  const [layersLoadedToken, setLayersLoadedToken] = useState(0);

  // Estados e refs do Gizmo de Deforme e Hit-Test para auto-seleção de peças
  const [hoverGizmoHandle, setHoverGizmoHandle] = useState<GizmoHandle | null>(null);
  const activeGizmoDragRef = useRef<{
    handle: GizmoHandle;
    startPointer: { x: number; y: number };
    initialScale: number;
    initialScaleX: number;
    initialScaleY: number;
    initialPos: { x: number; y: number };
    rotRad: number;
    dispW: number;
    dispH: number;
  } | null>(null);
  const hitCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Imagem base prioritária: se houver camada base em layers, usa ela; senão usa marker
  const baseLayer = layers.find((l) => l.isBaseAsset) || layers[0];
  const rawImageSrc = baseLayer?.pngUrl || layers.find((l) => l.pngUrl)?.pngUrl || marker?.customIconPng || marker?.bannerImagePng || '';
  const imageSrc = rawImageSrc || (layers.length > 0 ? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"></svg>' : '');

  // Carrega imagem base do marcador ou camada base
  useEffect(() => {
    if (!imageSrc) {
      baseImgRef.current = null;
      setBaseImgLoaded(false);
      return;
    }
    const img = new Image();
    if (!imageSrc.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.src = imageSrc;
    const handleLoaded = () => {
      baseImgRef.current = img;
      setBaseImgLoaded(true);
      setLayersLoadedToken((t) => t + 1);
    };
    if (img.complete && img.naturalWidth > 0) {
      handleLoaded();
    } else {
      img.onload = handleLoaded;
    }
  }, [imageSrc]);

  // Carrega imagens de peças filhas
  useEffect(() => {
    layers.forEach((l) => {
      const pngUrl = l.pngUrl;
      if (pngUrl) {
        const existing = layerImagesRef.current.get(l.id);
        if (existing && existing.src === pngUrl && existing.complete && existing.naturalWidth > 0) {
          return;
        }
        const pImg = new Image();
        if (!pngUrl.startsWith('data:') && !pngUrl.startsWith('blob:')) {
          pImg.crossOrigin = 'anonymous';
        }
        pImg.src = pngUrl;
        const handlePieceLoaded = () => {
          layerImagesRef.current.set(l.id, pImg);
          setLayersLoadedToken((t) => t + 1);
        };
        if (pImg.complete && pImg.naturalWidth > 0) {
          handlePieceLoaded();
        } else {
          pImg.onload = handlePieceLoaded;
        }
        pImg.onerror = () => {
          if (pImg.crossOrigin) {
            const retryImg = new Image();
            retryImg.onload = () => {
              layerImagesRef.current.set(l.id, retryImg);
              setLayersLoadedToken((t) => t + 1);
            };
            retryImg.src = pngUrl;
          }
        };
      }
    });
  }, [layers]);

  // Dimensões do Asset: 100% da arte natural SEM LIMITADOR
  const artWidth = baseImgRef.current?.naturalWidth || 480;
  const artHeight = baseImgRef.current?.naturalHeight || 480;

  // Borda de segurança: 25% em toda a volta para movimentos, pêndulos e rotações sem corte
  const safetyRatio = 0.25;
  const padX = Math.round(artWidth * safetyRatio);
  const padY = Math.round(artHeight * safetyRatio);
  const canvasWidth = artWidth + padX * 2;
  const canvasHeight = artHeight + padY * 2;

  // Atalhos de teclado: Barra de Espaço para Pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Zoom livre com Ctrl + Scroll (Wheel)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      setZoom((prev) => {
        const next = Math.max(0.15, Math.min(6.0, prev * zoomFactor));
        return Number(next.toFixed(3));
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Estado de teste: Gelatina Primordial do Asset Pai
  const [internalPrimordialJelly, setInternalPrimordialJelly] = useState<boolean>(false);
  const isPrimordialJelly = propIsPrimordialJelly !== undefined ? propIsPrimordialJelly : internalPrimordialJelly;
  const isPrimordialJellyRef = useRef<boolean>(isPrimordialJelly);
  isPrimordialJellyRef.current = isPrimordialJelly;

  const togglePrimordialJelly = () => {
    if (onTogglePrimordialJelly) {
      onTogglePrimordialJelly();
    } else {
      setInternalPrimordialJelly((v) => !v);
    }
  };

  // Estado de Animação: Play / Pause (para congelar e permitir desenhar/recortar/usar esponja com precisão)
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

  // Canvas temporário para apagar pixels PNG
  const erasingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const eraserLastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Pontos de seleção pendentes (quando autoExtract estiver OFF)
  const [pendingPoints, setPendingPoints] = useState<{ x: number; y: number }[]>([]);

  // Calcula com precisão de pixel a coordenada no sistema local da imagem da camada
  // Desfazendo deslocamento, rotação, pivô e escala
  const getLayerLocalCoord = useCallback((
    canvasPos: { x: number; y: number },
    layer: MarkerMotionLayer | null,
    targetImg: HTMLImageElement
  ) => {
    const isBase = !!layer?.isBaseAsset;
    const dispW = isBase ? artWidth : (targetImg.naturalWidth || artWidth);
    const dispH = isBase ? artHeight : (targetImg.naturalHeight || artHeight);

    const natW = targetImg.naturalWidth || dispW;
    const natH = targetImg.naturalHeight || dispH;

    const posX = layer?.x ?? 0;
    const posY = layer?.y ?? 0;

    const pivX = dispW * (layer?.pivotX ?? 0.5);
    const pivY = dispH * (layer?.pivotY ?? 0.5);

    const rotDeg = layer?.rotation ?? 0;
    const rotRad = (rotDeg * Math.PI) / 180;

    const scale = layer?.scale ?? 1.0;
    const defX = layer?.scaleX ?? 1.0;
    const defY = layer?.scaleY ?? 1.0;
    const scaleX = scale * defX * (layer?.flipX ? -1 : 1);
    const scaleY = scale * defY * (layer?.flipY ? -1 : 1);

    // 1. Desloca em relação ao centro de rotação (pivô) da camada
    const rx = canvasPos.x - (padX + posX + pivX);
    const ry = canvasPos.y - (padY + posY + pivY);

    // 2. Aplica rotação inversa (-rotRad)
    const cosR = Math.cos(-rotRad);
    const sinR = Math.sin(-rotRad);
    const unRotX = rx * cosR - ry * sinR;
    const unRotY = rx * sinR + ry * cosR;

    // 3. Aplica escala inversa
    const dx = scaleX !== 0 ? unRotX / scaleX : unRotX;
    const dy = scaleY !== 0 ? unRotY / scaleY : unRotY;

    // 4. Retorna para as coordenadas do topo-esquerdo da imagem exibida
    const localDispX = dx + pivX;
    const localDispY = dy + pivY;

    // 5. Converte para a resolução natural dos pixels da imagem
    const scaleToNatX = natW / dispW;
    const scaleToNatY = natH / dispH;

    const pixelX = localDispX * scaleToNatX;
    const pixelY = localDispY * scaleToNatY;

    // Raio da borracha ajustado aos pixels naturais da imagem
    const effectiveRadius = (brushSize / 2) * scaleToNatX / (Math.abs(scale) || 1);

    return {
      x: pixelX,
      y: pixelY,
      radius: effectiveRadius,
    };
  }, [artWidth, artHeight, padX, padY, brushSize]);

  // Converte ponto no espaço local da imagem da camada para coordenadas no canvas
  const localToCanvasCoord = useCallback((
    lx: number,
    ly: number,
    layer: MarkerMotionLayer,
    dispW: number,
    dispH: number
  ) => {
    const posX = layer.x ?? 0;
    const posY = layer.y ?? 0;
    const pivX = dispW * (layer.pivotX ?? 0.5);
    const pivY = dispH * (layer.pivotY ?? 0.5);
    const rotDeg = layer.rotation ?? 0;
    const rotRad = (rotDeg * Math.PI) / 180;
    const scale = layer.scale ?? 1.0;
    const defX = layer.scaleX ?? 1.0;
    const defY = layer.scaleY ?? 1.0;
    const sx = scale * defX * (layer.flipX ? -1 : 1);
    const sy = scale * defY * (layer.flipY ? -1 : 1);

    const rx = (lx - pivX) * sx;
    const ry = (ly - pivY) * sy;

    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);
    const rotX = rx * cosR - ry * sinR;
    const rotY = rx * sinR + ry * cosR;

    return {
      x: padX + posX + pivX + rotX,
      y: padY + posY + pivY + rotY,
    };
  }, [padX, padY]);

  // Retorna os 4 cantos e 4 centros de arestas do Gizmo da camada no canvas
  const getLayerGizmoCorners = useCallback((
    layer: MarkerMotionLayer,
    targetImg: HTMLImageElement
  ) => {
    const isBase = !!layer.isBaseAsset;
    const dispW = isBase ? artWidth : (targetImg.naturalWidth || artWidth);
    const dispH = isBase ? artHeight : (targetImg.naturalHeight || artHeight);

    const nw = localToCanvasCoord(0, 0, layer, dispW, dispH);
    const ne = localToCanvasCoord(dispW, 0, layer, dispW, dispH);
    const se = localToCanvasCoord(dispW, dispH, layer, dispW, dispH);
    const sw = localToCanvasCoord(0, dispH, layer, dispW, dispH);

    const n = localToCanvasCoord(dispW * 0.5, 0, layer, dispW, dispH);
    const s = localToCanvasCoord(dispW * 0.5, dispH, layer, dispW, dispH);
    const e = localToCanvasCoord(dispW, dispH * 0.5, layer, dispW, dispH);
    const w = localToCanvasCoord(0, dispH * 0.5, layer, dispW, dispH);

    return { nw, ne, se, sw, n, s, e, w };
  }, [artWidth, artHeight, localToCanvasCoord]);

  // Hit-test para alças do Gizmo
  const getGizmoHandleAtPos = useCallback((
    pos: { x: number; y: number },
    layer: MarkerMotionLayer,
    targetImg: HTMLImageElement
  ): GizmoHandle | null => {
    const corners = getLayerGizmoCorners(layer, targetImg);
    if (!corners) return null;

    const hitRadius = 10;
    const handles: { handle: GizmoHandle; pt: { x: number; y: number } }[] = [
      { handle: 'nw', pt: corners.nw },
      { handle: 'ne', pt: corners.ne },
      { handle: 'se', pt: corners.se },
      { handle: 'sw', pt: corners.sw },
      { handle: 'n', pt: corners.n },
      { handle: 's', pt: corners.s },
      { handle: 'e', pt: corners.e },
      { handle: 'w', pt: corners.w },
    ];

    for (const h of handles) {
      if (Math.hypot(pos.x - h.pt.x, pos.y - h.pt.y) <= hitRadius) {
        return h.handle;
      }
    }
    return null;
  }, [getLayerGizmoCorners]);

  // Hit-test Pixel-Perfect com leitura de canal alfa para auto-selecionar camada ao clicar no canvas
  const findLayerAtPos = useCallback((pos: { x: number; y: number }): MarkerMotionLayer | null => {
    if (!hitCanvasRef.current) {
      const c = document.createElement('canvas');
      c.width = 1;
      c.height = 1;
      hitCanvasRef.current = c;
    }
    const hitCanvas = hitCanvasRef.current;
    const hitCtx = hitCanvas.getContext('2d', { willReadFrequently: true });
    if (!hitCtx) return null;

    // Percorre do topo da pilha para a base (camadas superiores têm prioridade no clique)
    const reversedLayers = [...layers].reverse();
    for (const layer of reversedLayers) {
      if (layer.visible === false) continue;
      const img = layer.isBaseAsset
        ? baseImgRef.current
        : (layer.pngUrl ? layerImagesRef.current.get(layer.id) : null);

      if (!img || img.naturalWidth === 0 || img.naturalHeight === 0) continue;

      const local = getLayerLocalCoord(pos, layer, img);
      const px = Math.floor(local.x);
      const py = Math.floor(local.y);

      if (px >= 0 && px < img.naturalWidth && py >= 0 && py < img.naturalHeight) {
        hitCtx.clearRect(0, 0, 1, 1);
        hitCtx.drawImage(img, px, py, 1, 1, 0, 0, 1, 1);
        const alpha = hitCtx.getImageData(0, 0, 1, 1).data[3];
        if (alpha > 15) {
          return layer;
        }
      }
    }
    return null;
  }, [layers, getLayerLocalCoord]);

  // Redesenha a camada de desenho / feedback do pincel, borrachas, esponja e Gizmo
  const redrawDrawingOverlay = useCallback(() => {
    const drawCanvas = drawingCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

    // 1. GIZMO NO MODO MOVER: Renderiza caixa de deforme com 8 alças na camada ativa
    if (activeTool === 'move' && activeLayer) {
      const targetImg = activeLayer.isBaseAsset
        ? baseImgRef.current
        : (activeLayer.pngUrl ? layerImagesRef.current.get(activeLayer.id) : null);

      if (targetImg && targetImg.naturalWidth > 0) {
        const corners = getLayerGizmoCorners(activeLayer, targetImg);
        if (corners) {
          ctx.save();
          // Linha delimitadora da caixa
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(corners.nw.x, corners.nw.y);
          ctx.lineTo(corners.ne.x, corners.ne.y);
          ctx.lineTo(corners.se.x, corners.se.y);
          ctx.lineTo(corners.sw.x, corners.sw.y);
          ctx.closePath();
          ctx.stroke();

          // Desenha as 8 alças
          const drawHandle = (pt: { x: number; y: number }, type: 'corner' | 'h' | 'v') => {
            ctx.save();
            ctx.translate(pt.x, pt.y);
            if (type === 'corner') {
              // Quadrado Ciano para Escala Proporcional
              ctx.fillStyle = '#38bdf8';
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.fillRect(-5, -5, 10, 10);
              ctx.strokeRect(-5, -5, 10, 10);
            } else if (type === 'h') {
              // Círculo Fúcsia para Deforme Horizontal (scaleX)
              ctx.fillStyle = '#f43f5e';
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            } else if (type === 'v') {
              // Círculo Âmbar para Deforme Vertical (scaleY)
              ctx.fillStyle = '#fbbf24';
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            }
            ctx.restore();
          };

          drawHandle(corners.nw, 'corner');
          drawHandle(corners.ne, 'corner');
          drawHandle(corners.se, 'corner');
          drawHandle(corners.sw, 'corner');
          drawHandle(corners.e, 'h');
          drawHandle(corners.w, 'h');
          drawHandle(corners.n, 'v');
          drawHandle(corners.s, 'v');

          // Tag de Deforme mostrando porcentagem H x V
          const defX = activeLayer.scaleX ?? 1.0;
          const defY = activeLayer.scaleY ?? 1.0;
          if (defX !== 1.0 || defY !== 1.0) {
            ctx.font = 'bold 10px monospace';
            const label = `H: ${Math.round(defX * 100)}% × V: ${Math.round(defY * 100)}%`;
            const textW = ctx.measureText(label).width;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(corners.n.x - textW / 2 - 6, corners.n.y - 24, textW + 12, 18, 4);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fcd34d';
            ctx.fillText(label, corners.n.x - textW / 2, corners.n.y - 11);
          }
          ctx.restore();
        }
      }
      return;
    }

    if (activeTool !== 'brush') return;

    // 2. Feedback visual da Esponja de Reparo (Cicatrizador Spot Healing)
    if (brushMode === 'sponge') {
      const pts = currentStrokePoints.current;
      const last = pts[pts.length - 1];
      if (last) {
        ctx.save();
        ctx.strokeStyle = '#10b981';
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(last.x, last.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (pts.length > 1) {
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.lineWidth = brushSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          pts.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.stroke();
        }
        ctx.restore();
      }
      return;
    }

    // Feedback visual do tamanho da borracha
    if (brushMode === 'erase_strokes' || brushMode === 'erase_png') {
      const pts = currentStrokePoints.current;
      const last = pts[pts.length - 1];
      if (last) {
        ctx.save();
        ctx.strokeStyle = brushMode === 'erase_png' ? '#f43f5e' : '#f59e0b';
        ctx.fillStyle = brushMode === 'erase_png' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(last.x, last.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    // 3. Desenha traço em andamento ou pendente para confirmação
    const activePts = currentStrokePoints.current.length > 0 ? currentStrokePoints.current : pendingPoints;
    const isPending = currentStrokePoints.current.length === 0 && pendingPoints.length > 0;

    const actionColor = extractionAction === 'cut_repair'
      ? '#10b981'
      : extractionAction === 'cut'
      ? '#f43f5e'
      : '#38bdf8';

    const actionFill = extractionAction === 'cut_repair'
      ? 'rgba(16, 185, 129, 0.25)'
      : extractionAction === 'cut'
      ? 'rgba(244, 63, 94, 0.22)'
      : 'rgba(56, 189, 248, 0.22)';

    if (activePts.length > 0) {
      ctx.save();
      if (brushMode === 'lasso') {
        // Modo Laço: linha conectada com fechamento visual
        ctx.strokeStyle = isPending ? actionColor : '#e879f9';
        ctx.shadowColor = isPending ? actionColor : '#d946ef';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2.5;
        ctx.setLineDash(isPending ? [4, 4] : [6, 4]);
        ctx.beginPath();
        activePts.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // Linha conectora até a origem para feedback de área fechada
        if (activePts.length > 2) {
          ctx.strokeStyle = isPending ? actionColor : 'rgba(232, 121, 249, 0.5)';
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          const first = activePts[0];
          const last = activePts[activePts.length - 1];
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(first.x, first.y);
          ctx.stroke();

          // Preenchimento semitransparente da área do laço
          ctx.fillStyle = actionFill;
          ctx.beginPath();
          activePts.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Modo Pincel / Lápis Livre
        ctx.strokeStyle = isPending ? actionColor : 'rgba(244, 63, 94, 0.9)';
        ctx.shadowColor = actionColor;
        ctx.shadowBlur = 8;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        activePts.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [brushSize, brushMode, activeTool, activeLayer, pendingPoints, extractionAction, getLayerGizmoCorners]);

  // Loop de Renderização a 60 FPS com Deformação de Malha e Borda de Segurança de 25%
  useEffect(() => {
    const canvas = canvasRef.current;
    const baseImg = baseImgRef.current;
    if (!canvas || !baseImg || !baseImgLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const drawCanvas = drawingCanvasRef.current;
    if (drawCanvas) {
      drawCanvas.width = canvasWidth;
      drawCanvas.height = canvasHeight;
    }

    // Coleta traços para malha do corpo principal
    const strokes: LayerStroke[] = [];
    if (activeLayer && activeLayer.strokes && !activeLayer.pngUrl) {
      strokes.push(...activeLayer.strokes);
    }

    // No editor de canvas, a malha pertence exclusivamente à camada ativa.
    // E 'jelly' NÃO é um efeito de malha local: é o movimento global de NPC (.animate-jelly).
    // Dessa forma, ao abrir o editor o asset NUNCA entra com malha ou distorção indesejada.
    const rawEffect = (activeLayer?.effect || 'none') as EffectType;
    const effect = rawEffect === 'jelly' ? 'none' : rawEffect;
    const speed = activeLayer?.speed ?? 1.0;
    const intensity = activeLayer?.intensity ?? 1.0;

    const isMesh = effect !== 'none';
    const grid = isMesh ? createMeshGrid(canvasWidth, canvasHeight, 32, 32) : null;
    if (grid && strokes.length > 0) {
      computeMeshWeights(grid, strokes);
    }

    let animId: number;
    const startTime = performance.now();

    const loop = (time: number) => {
      // Quando pausado (Modo Edição), o tempo é congelado no repouso (0) e a gelatina é desativada para corte e retoque precisos
      const elapsed = isPausedRef.current ? 0 : (time - startTime) * 0.001;
      const currentJelly = isPausedRef.current ? false : isPrimordialJellyRef.current;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Centro de deformação de Squash & Stretch (pés do personagem pai: 50% largura, 100% altura)
      const footX = artWidth * 0.5;
      const footY = artHeight;
      const jellyTransform = currentJelly
        ? computeNpcJellyTransform(elapsed)
        : { scaleX: 1, scaleY: 1, rotationRad: 0 };

      // Renderiza camadas de acordo com a ordem do array (z-index)
      // Camadas com índice inferior a isBaseAsset renderizam ATRÁS do asset principal
      // Camadas com índice superior a isBaseAsset renderizam NA FRENTE do asset principal
      const hasBaseLayer = layers.some((l) => l.isBaseAsset);

      if (!hasBaseLayer) {
        // Fallback para projetos sem camada base explícita
        if (isMesh && grid) {
          updateMeshDeformation(grid, effect, elapsed, speed, intensity);
          const offCanvas = document.createElement('canvas');
          offCanvas.width = canvasWidth;
          offCanvas.height = canvasHeight;
          const offCtx = offCanvas.getContext('2d');
          if (offCtx) {
            offCtx.drawImage(baseImg, padX, padY, artWidth, artHeight);
            renderDeformedMesh(ctx, offCanvas, grid);
          } else {
            ctx.drawImage(baseImg, padX, padY, artWidth, artHeight);
          }
        } else {
          ctx.drawImage(baseImg, padX, padY, artWidth, artHeight);
        }
      }

      layers.forEach((layer) => {
        if (layer.visible === false) return;

        if (layer.isBaseAsset) {
          // Renderiza o corpo base principal exatamente nesta camada do stack
          ctx.save();
          const pPhysics = computeLayerPhysics(layer, elapsed, currentJelly);
          ctx.translate(padX, padY);
          applyLayerTransform(ctx, layer, artWidth, artHeight, pPhysics);

          // Se a Gelatina Primordial estiver ativada: aplica Squash & Stretch idêntico ao mapa (.animate-jelly)
          if (currentJelly) {
            ctx.translate(footX, footY);
            ctx.rotate(jellyTransform.rotationRad);
            ctx.scale(jellyTransform.scaleX, jellyTransform.scaleY);
            ctx.translate(-footX, -footY);
          }

          const currentBase = (erasingCanvasRef.current && activeLayer?.isBaseAsset)
            ? erasingCanvasRef.current
            : baseImg;

          if (isMesh && grid) {
            updateMeshDeformation(grid, effect, elapsed, speed, intensity);
            const offCanvas = document.createElement('canvas');
            offCanvas.width = canvasWidth;
            offCanvas.height = canvasHeight;
            const offCtx = offCanvas.getContext('2d');
            if (offCtx) {
              offCtx.drawImage(currentBase, 0, 0, artWidth, artHeight);
              renderDeformedMesh(ctx, offCanvas, grid);
            } else {
              ctx.drawImage(currentBase, 0, 0, artWidth, artHeight);
            }
          } else {
            ctx.drawImage(currentBase, 0, 0, artWidth, artHeight);
          }
          ctx.restore();
          return;
        }

        // Renderiza camadas de peças recortadas ou importadas
        if (layer.pngUrl) {
          const pieceImg = layerImagesRef.current.get(layer.id);
          if (!pieceImg) return;

          ctx.save();
          // Passa currentJelly como estímulo físico para as peças penduradas
          const pPhysics = computeLayerPhysics(layer, elapsed, currentJelly);
          const pW = pieceImg.naturalWidth || artWidth;
          const pH = pieceImg.naturalHeight || artHeight;

          // Ponto do pivô em pixels locais da peça
          const pivPixX = pW * (layer.pivotX ?? 0.5);
          const pivPixY = pH * (layer.pivotY ?? 0.5);

          // Ponto de âncora da peça cravado na malha do corpo pai (coordenadas relativas à arte do pai)
          const anchorBaseX = (layer.x ?? 0) + pivPixX;
          const anchorBaseY = (layer.y ?? 0) + pivPixY;

          // Quando a Gelatina Primordial deforma o corpo pai, a âncora viaja 1:1 presa na malha deformada do pai
          let deformedAnchorX = anchorBaseX;
          let deformedAnchorY = anchorBaseY;
          let inheritedAngle = 0;

          if (currentJelly) {
            const dx = anchorBaseX - footX;
            const dy = anchorBaseY - footY;
            const sDx = dx * jellyTransform.scaleX;
            const sDy = dy * jellyTransform.scaleY;
            const cosR = Math.cos(jellyTransform.rotationRad);
            const sinR = Math.sin(jellyTransform.rotationRad);
            deformedAnchorX = footX + (sDx * cosR - sDy * sinR);
            deformedAnchorY = footY + (sDx * sinR + sDy * cosR);
            inheritedAngle = jellyTransform.rotationRad;
          }

          ctx.translate(padX, padY);
          // 1. Conecta o pivô da peça milimetricamente à âncora fixa na malha do corpo pai (Rigging direto)
          ctx.translate(deformedAnchorX + (pPhysics.offsetX || 0), deformedAnchorY + (pPhysics.offsetY || 0));

          // 2. Aplica rotação da camada + balanço físico (pêndulo, mola) + rotação transmitida pelo pai
          const baseRotRad = ((layer.rotation ?? 0) * Math.PI) / 180;
          const totalAngle = baseRotRad + pPhysics.angle + inheritedAngle;
          ctx.rotate(totalAngle);

          // 3. Aplica escala, deforme (comprimir/expandir) e espelhamento da peça
          const baseScale = layer.scale ?? 1.0;
          const defX = layer.scaleX ?? 1.0;
          const defY = layer.scaleY ?? 1.0;
          const flipX = layer.flipX ? -1 : 1;
          const flipY = layer.flipY ? -1 : 1;
          ctx.scale(baseScale * defX * flipX * pPhysics.scaleX, baseScale * defY * flipY * pPhysics.scaleY);

          // 4. Retorna exatamente do pivô da peça para alinhar a imagem na articulação
          ctx.translate(-pivPixX, -pivPixY);

          const currentPiece = (erasingCanvasRef.current && activeLayer?.id === layer.id)
            ? erasingCanvasRef.current
            : pieceImg;

          if (layer.physicsMode === 'cloth' || layer.physicsMode === 'flag') {
            const lod = layer.clothMeshDensity || 32;
            let pieceMesh = layerMeshesRef.current.get(layer.id);
            if (!pieceMesh || pieceMesh.width !== pW || pieceMesh.height !== pH || pieceMesh.cols !== lod) {
              pieceMesh = createMeshGrid(pW, pH, lod, lod);
              layerMeshesRef.current.set(layer.id, pieceMesh);
            }

            updateClothFlagMesh(
              pieceMesh,
              layer.physicsMode,
              elapsed,
              layer.speed ?? 1.0,
              layer.intensity ?? 1.0,
              layer.pivotX ?? 0.5,
              layer.pivotY ?? 0.1,
              {
                clothSag: layer.clothSag,
                flagWindAngle: layer.flagWindAngle,
                flagRippleFreq: layer.flagRippleFreq,
              }
            );

            renderDeformedMesh(ctx, currentPiece, pieceMesh);
          } else {
            ctx.drawImage(currentPiece, 0, 0, pW, pH);
          }
          ctx.restore();
        }
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    baseImgLoaded,
    canvasWidth,
    canvasHeight,
    artWidth,
    artHeight,
    padX,
    padY,
    activeLayer,
    layers,
    layersLoadedToken,
    imageSrc,
    isPrimordialJelly,
    marker?.effect,
    marker?.effectSpeed,
    marker?.effectIntensity,
  ]);

  // Conversão de posição do cursor para o sistema de coordenadas do canvas
  // Conversão matematicamente exata com razão de bounding box (imune a zoom, pan, DPR e redimensionamento proporcional)
  const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const x = ((e.clientX - rect.left) / rect.width) * canvasWidth;
    const y = ((e.clientY - rect.top) / rect.height) * canvasHeight;
    return {
      x: Math.max(0, Math.min(canvasWidth, x)),
      y: Math.max(0, Math.min(canvasHeight, y)),
    };
  };

  // Histórico do último ponto local da borracha para interpolação contínua
  const eraseLastLocalPosRef = useRef<{ x: number; y: number } | null>(null);

  // Aplica apagamento contínuo com interpolação suave
  const applyPngErasePath = useCallback((
    fromPos: { x: number; y: number },
    toPos: { x: number; y: number },
    radius: number
  ) => {
    const offCanvas = erasingCanvasRef.current;
    if (!offCanvas) return;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;

    offCtx.save();
    offCtx.globalCompositeOperation = 'destination-out';
    offCtx.lineWidth = radius * 2;
    offCtx.lineCap = 'round';
    offCtx.lineJoin = 'round';

    offCtx.beginPath();
    offCtx.moveTo(fromPos.x, fromPos.y);
    offCtx.lineTo(toPos.x, toPos.y);
    offCtx.stroke();

    offCtx.beginPath();
    offCtx.arc(toPos.x, toPos.y, radius, 0, Math.PI * 2);
    offCtx.fill();
    offCtx.restore();
  }, []);

  // Clique do botão do meio (pan) ou ferramentas (Navegar / Pincel / Pivô)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // 1. Pan livre com botão do meio (e.button === 1) ou espaço segurado ou ferramenta pan
    if (e.button === 1 || isSpacePressed || activeTool === 'pan') {
      e.preventDefault();
      setIsMiddlePanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panInitialRef.current = { ...pan };
      return;
    }

    if (e.button !== 0) return;
    const pos = getCanvasPos(e);
    if (!pos) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}

    setIsInteracting(true);

    if (activeTool === 'move') {
      // 1. Primeiro testa se clicou em uma alça do Gizmo da camada ativa (para deforme ou escala)
      const targetImg = activeLayer?.isBaseAsset
        ? baseImgRef.current
        : (activeLayer?.pngUrl ? layerImagesRef.current.get(activeLayer.id) : null);

      let clickedGizmoHandle: GizmoHandle | null = null;
      if (activeLayer && targetImg && targetImg.naturalWidth > 0) {
        clickedGizmoHandle = getGizmoHandleAtPos(pos, activeLayer, targetImg);
      }

      if (clickedGizmoHandle && activeLayer && targetImg) {
        const isBase = !!activeLayer.isBaseAsset;
        const dispW = isBase ? artWidth : (targetImg.naturalWidth || artWidth);
        const dispH = isBase ? artHeight : (targetImg.naturalHeight || artHeight);
        const rotDeg = activeLayer.rotation ?? 0;
        const rotRad = (rotDeg * Math.PI) / 180;

        activeGizmoDragRef.current = {
          handle: clickedGizmoHandle,
          startPointer: { x: e.clientX, y: e.clientY },
          initialScale: activeLayer.scale ?? 1.0,
          initialScaleX: activeLayer.scaleX ?? 1.0,
          initialScaleY: activeLayer.scaleY ?? 1.0,
          initialPos: { x: activeLayer.x ?? 0, y: activeLayer.y ?? 0 },
          rotRad,
          dispW,
          dispH,
        };
        return;
      }

      // 2. Se não clicou no gizmo, detecta a peça clicada no canvas (hit-test pixel-perfect transparente)
      const clickedLayer = findLayerAtPos(pos);
      const layerToMove = clickedLayer || activeLayer;

      if (clickedLayer && clickedLayer.id !== activeLayer?.id) {
        onSelectLayer?.(clickedLayer.id);
      }

      dragStartPos.current = { x: e.clientX, y: e.clientY };
      dragInitialLayerOffset.current = {
        x: layerToMove?.x ?? 0,
        y: layerToMove?.y ?? 0,
      };
    } else if (activeTool === 'brush') {
      if (brushMode === 'sponge') {
        // Pincel Esponja de Reparo (Spot Healing / Content-Aware)
        currentStrokePoints.current = [pos];
        redrawDrawingOverlay();
      } else if (brushMode === 'erase_strokes') {
        // Borracha de Traços Pen Motion
        if (activeLayer?.strokes && activeLayer.strokes.length > 0) {
          const filtered = activeLayer.strokes.filter((s) => {
            return !s.points.some((p) => Math.hypot(p.x - pos.x, p.y - pos.y) <= brushSize);
          });
          if (filtered.length !== activeLayer.strokes.length) {
            onUpdateActiveLayer?.({ strokes: filtered });
          }
        }
        currentStrokePoints.current = [pos];
        redrawDrawingOverlay();
      } else if (brushMode === 'erase_png') {
        // Borracha de Pixels PNG (apaga e esculpe pixels com precisão milimétrica)
        const targetImg = activeLayer?.isBaseAsset
          ? baseImgRef.current
          : (activeLayer?.pngUrl ? layerImagesRef.current.get(activeLayer.id) : null);

        if (targetImg && targetImg.naturalWidth > 0) {
          const off = document.createElement('canvas');
          off.width = targetImg.naturalWidth;
          off.height = targetImg.naturalHeight;
          const offCtx = off.getContext('2d');
          if (offCtx) {
            offCtx.drawImage(targetImg, 0, 0);
            erasingCanvasRef.current = off;
            const local = getLayerLocalCoord(pos, activeLayer, targetImg);
            eraseLastLocalPosRef.current = { x: local.x, y: local.y };
            applyPngErasePath(local, local, local.radius);
          }
        }
        currentStrokePoints.current = [pos];
        redrawDrawingOverlay();
      } else {
        // PINCEL / LAÇO
        currentStrokePoints.current = [pos];
        redrawDrawingOverlay();
      }
    } else if (activeTool === 'pivot') {
      // PONTO PIVÔ: Clicar posiciona especificamente o PIVÔ da camada ativa
      const pieceImg = activeLayer?.pngUrl ? layerImagesRef.current.get(activeLayer.id) : null;
      const pieceW = pieceImg ? pieceImg.naturalWidth : artWidth;
      const pieceH = pieceImg ? pieceImg.naturalHeight : artHeight;

      const clickInArtX = pos.x - (padX + (activeLayer?.x ?? 0));
      const clickInArtY = pos.y - (padY + (activeLayer?.y ?? 0));

      const pivX = Math.max(0, Math.min(1, clickInArtX / pieceW));
      const pivY = Math.max(0, Math.min(1, clickInArtY / pieceH));

      onUpdateActiveLayer?.({
        pivotX: Number(pivX.toFixed(3)),
        pivotY: Number(pivY.toFixed(3)),
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isMiddlePanning) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({
        x: Math.round(panInitialRef.current.x + dx),
        y: Math.round(panInitialRef.current.y + dy),
      });
      return;
    }

    const pos = getCanvasPos(e);
    if (!pos) return;

    // Se o usuário não está clicando: atualiza hover do Gizmo ou mira do cursor da borracha/esponja
    if (!isInteracting) {
      if (activeTool === 'move' && activeLayer) {
        const targetImg = activeLayer.isBaseAsset
          ? baseImgRef.current
          : (activeLayer.pngUrl ? layerImagesRef.current.get(activeLayer.id) : null);
        if (targetImg && targetImg.naturalWidth > 0) {
          const hoveredHandle = getGizmoHandleAtPos(pos, activeLayer, targetImg);
          setHoverGizmoHandle(hoveredHandle);
        } else {
          setHoverGizmoHandle(null);
        }
      }

      if (
        activeTool === 'brush' &&
        (brushMode === 'erase_png' || brushMode === 'erase_strokes' || brushMode === 'sponge')
      ) {
        currentStrokePoints.current = [pos];
        redrawDrawingOverlay();
      }
      return;
    }

    // Se estiver arrastando uma alça do Gizmo de Deforme
    if (activeGizmoDragRef.current) {
      const gizmo = activeGizmoDragRef.current;
      const screenDx = (e.clientX - gizmo.startPointer.x) / zoom;
      const screenDy = (e.clientY - gizmo.startPointer.y) / zoom;

      // Rotaciona a variação do ponteiro pelo ângulo da camada invertido
      const cosInv = Math.cos(-gizmo.rotRad);
      const sinInv = Math.sin(-gizmo.rotRad);
      const localDx = screenDx * cosInv - screenDy * sinInv;
      const localDy = screenDx * sinInv + screenDy * cosInv;

      if (gizmo.handle === 'e' || gizmo.handle === 'w') {
        // Deforme Horizontal: comprime ou expande scaleX
        const sign = gizmo.handle === 'e' ? 1 : -1;
        const delta = (localDx / (gizmo.dispW * 0.5)) * sign;
        const nextScaleX = Math.max(0.1, Math.min(4.0, gizmo.initialScaleX + delta));
        onUpdateActiveLayer?.({ scaleX: Number(nextScaleX.toFixed(3)) });
      } else if (gizmo.handle === 'n' || gizmo.handle === 's') {
        // Deforme Vertical: comprime ou expande scaleY
        const sign = gizmo.handle === 's' ? 1 : -1;
        const delta = (localDy / (gizmo.dispH * 0.5)) * sign;
        const nextScaleY = Math.max(0.1, Math.min(4.0, gizmo.initialScaleY + delta));
        onUpdateActiveLayer?.({ scaleY: Number(nextScaleY.toFixed(3)) });
      } else {
        // Cantos: escala proporcional uniforme
        const signX = (gizmo.handle === 'se' || gizmo.handle === 'ne') ? 1 : -1;
        const signY = (gizmo.handle === 'se' || gizmo.handle === 'sw') ? 1 : -1;
        const avgDelta = (localDx * signX + localDy * signY) / (Math.max(gizmo.dispW, gizmo.dispH) * 0.75);
        const nextScale = Math.max(0.1, Math.min(5.0, gizmo.initialScale + avgDelta));
        onUpdateActiveLayer?.({ scale: Number(nextScale.toFixed(3)) });
      }

      redrawDrawingOverlay();
      return;
    }

    if (activeTool === 'move') {
      // NAVEGAR: translada exclusivamente a peça ativa
      const dx = (e.clientX - dragStartPos.current.x) / zoom;
      const dy = (e.clientY - dragStartPos.current.y) / zoom;
      onUpdateActiveLayer?.({
        x: Math.round(dragInitialLayerOffset.current.x + dx),
        y: Math.round(dragInitialLayerOffset.current.y + dy),
      });
    } else if (activeTool === 'brush') {
      if (brushMode === 'sponge') {
        const pts = currentStrokePoints.current;
        const last = pts[pts.length - 1];
        if (!last || Math.hypot(pos.x - last.x, pos.y - last.y) > 3) {
          pts.push(pos);
          redrawDrawingOverlay();
        }
      } else if (brushMode === 'erase_strokes') {
        if (activeLayer?.strokes && activeLayer.strokes.length > 0) {
          const filtered = activeLayer.strokes.filter((s) => {
            return !s.points.some((p) => Math.hypot(p.x - pos.x, p.y - pos.y) <= brushSize);
          });
          if (filtered.length !== activeLayer.strokes.length) {
            onUpdateActiveLayer?.({ strokes: filtered });
          }
        }
        currentStrokePoints.current = [pos];
        redrawDrawingOverlay();
      } else if (brushMode === 'erase_png') {
        const targetImg = activeLayer?.isBaseAsset
          ? baseImgRef.current
          : (activeLayer?.pngUrl ? layerImagesRef.current.get(activeLayer.id) : null);

        if (erasingCanvasRef.current && eraseLastLocalPosRef.current && targetImg) {
          const local = getLayerLocalCoord(pos, activeLayer, targetImg);
          applyPngErasePath(eraseLastLocalPosRef.current, local, local.radius);
          eraseLastLocalPosRef.current = { x: local.x, y: local.y };
        }
        currentStrokePoints.current = [pos];
        redrawDrawingOverlay();
      } else {
        const pts = currentStrokePoints.current;
        const last = pts[pts.length - 1];
        if (!last) {
          pts.push(pos);
          redrawDrawingOverlay();
        } else {
          const dist = Math.hypot(pos.x - last.x, pos.y - last.y);
          if (dist > 2) {
            const steps = Math.min(10, Math.floor(dist / 2));
            for (let i = 1; i <= steps; i++) {
              const t = i / steps;
              pts.push({
                x: last.x + (pos.x - last.x) * t,
                y: last.y + (pos.y - last.y) * t,
              });
            }
            redrawDrawingOverlay();
          }
        }
      }
    } else if (activeTool === 'pivot') {
      // PONTO PIVÔ: arrasto ajusta o pivô da camada ativa
      const pieceImg = activeLayer?.pngUrl ? layerImagesRef.current.get(activeLayer.id) : null;
      const pieceW = pieceImg ? pieceImg.naturalWidth : artWidth;
      const pieceH = pieceImg ? pieceImg.naturalHeight : artHeight;

      const clickInArtX = pos.x - (padX + (activeLayer?.x ?? 0));
      const clickInArtY = pos.y - (padY + (activeLayer?.y ?? 0));

      const pivX = Math.max(0, Math.min(1, clickInArtX / pieceW));
      const pivY = Math.max(0, Math.min(1, clickInArtY / pieceH));

      onUpdateActiveLayer?.({
        pivotX: Number(pivX.toFixed(3)),
        pivotY: Number(pivY.toFixed(3)),
      });
    }
  };

  const handlePointerUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e) {
      try {
        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
    }
    if (isMiddlePanning) {
      setIsMiddlePanning(false);
    }
    if (activeGizmoDragRef.current) {
      activeGizmoDragRef.current = null;
    }
    if (!isInteracting) return;
    setIsInteracting(false);

    if (activeTool === 'brush') {
      if (brushMode === 'sponge') {
        // Aplica o reparo da Esponja de Cicatrização via algoritmo Content-Aware
        const pts = [...currentStrokePoints.current];
        currentStrokePoints.current = [];

        if (pts.length > 0) {
          const targetImg = activeLayer?.isBaseAsset
            ? baseImgRef.current
            : (activeLayer?.pngUrl ? layerImagesRef.current.get(activeLayer.id) : null);

          if (targetImg && targetImg.naturalWidth > 0) {
            const natW = targetImg.naturalWidth;
            const natH = targetImg.naturalHeight;
            const off = document.createElement('canvas');
            off.width = natW;
            off.height = natH;
            const offCtx = off.getContext('2d', { willReadFrequently: true });
            if (offCtx) {
              offCtx.drawImage(targetImg, 0, 0);

              const localPoints = pts.map((p) => {
                const loc = getLayerLocalCoord(p, activeLayer, targetImg);
                return { x: loc.x, y: loc.y };
              });
              const firstLoc = getLayerLocalCoord(pts[0], activeLayer, targetImg);
              const brushRad = Math.max(6, firstLoc.radius * 2);

              const repaired = repairInpaintArea(offCtx, natW, natH, localPoints, 'brush', brushRad);
              if (repaired) {
                const repairedDataUrl = off.toDataURL('image/png');
                if (activeLayer?.isBaseAsset) {
                  onReplaceBaseAssetPng?.(repairedDataUrl);
                  if (baseImgRef.current) {
                    baseImgRef.current.onload = () => {
                      setLayersLoadedToken((t) => t + 1);
                      redrawDrawingOverlay();
                    };
                    baseImgRef.current.src = repairedDataUrl;
                  }
                } else if (activeLayer) {
                  onUpdateActiveLayer?.({ pngUrl: repairedDataUrl });
                  const updatedImg = new Image();
                  updatedImg.onload = () => {
                    setLayersLoadedToken((t) => t + 1);
                    redrawDrawingOverlay();
                  };
                  updatedImg.src = repairedDataUrl;
                  layerImagesRef.current.set(activeLayer.id, updatedImg);
                }
              }
            }
          }
        }
        redrawDrawingOverlay();
        return;
      }

      if (brushMode === 'erase_png') {
        if (erasingCanvasRef.current) {
          const newPngUrl = erasingCanvasRef.current.toDataURL('image/png');
          if (activeLayer?.isBaseAsset) {
            onReplaceBaseAssetPng?.(newPngUrl);
            if (baseImgRef.current) {
              baseImgRef.current.src = newPngUrl;
            }
          } else if (activeLayer) {
            onUpdateActiveLayer?.({ pngUrl: newPngUrl });
            const updatedImg = new Image();
            updatedImg.src = newPngUrl;
            layerImagesRef.current.set(activeLayer.id, updatedImg);
          }
          erasingCanvasRef.current = null;
          eraseLastLocalPosRef.current = null;
        }
        currentStrokePoints.current = [];
        redrawDrawingOverlay();
        return;
      }

      if (brushMode === 'erase_strokes') {
        currentStrokePoints.current = [];
        redrawDrawingOverlay();
        return;
      }

      const pts = [...currentStrokePoints.current];
      currentStrokePoints.current = [];

      // Executa ou prepara extração
      if (pts.length > 2 && baseImgRef.current && baseImgLoaded) {
        if (autoExtract) {
          executeCutoutExtraction(pts);
        } else {
          setPendingPoints(pts);
          redrawDrawingOverlay();
        }
      } else {
        redrawDrawingOverlay();
      }
    }
  };

  // Executa a extração do recorte em modo Copy, Cut ou Cut & Repair
  const executeCutoutExtraction = (pts: { x: number; y: number }[]) => {
    // Determina a imagem de origem correta (peça ativa ou base)
    const isBase = !activeLayer || !!activeLayer.isBaseAsset;
    const targetSourceImg = (!isBase && activeLayer?.pngUrl)
      ? layerImagesRef.current.get(activeLayer.id) || baseImgRef.current
      : baseImgRef.current;

    if (!targetSourceImg || targetSourceImg.naturalWidth === 0) return;

    // Se estiver extraindo de uma camada filha, ajusta os pontos pelo deslocamento dela
    const adjustedPts = isBase
      ? pts
      : pts.map((p) => ({
          x: p.x - (activeLayer?.x ?? 0),
          y: p.y - (activeLayer?.y ?? 0),
        }));

    const sourceDispW = isBase ? artWidth : (targetSourceImg.naturalWidth || artWidth);
    const sourceDispH = isBase ? artHeight : (targetSourceImg.naturalHeight || artHeight);

    const cutout = extractCutoutPiece(
      targetSourceImg,
      adjustedPts,
      brushMode === 'lasso' ? 'lasso' : 'brush',
      brushSize,
      smoothLevel,
      padX,
      padY,
      sourceDispW,
      sourceDispH,
      extractionAction
    );

    if (cutout && cutout.dataUrl) {
      // Se modo 'cut' ou 'cut_repair', aplica o resultado modificado/reparado na imagem de origem
      if ((extractionAction === 'cut' || extractionAction === 'cut_repair') && cutout.modifiedSourceDataUrl) {
        if (isBase) {
          onReplaceBaseAssetPng?.(cutout.modifiedSourceDataUrl);
          if (baseImgRef.current) {
            baseImgRef.current.onload = () => {
              setLayersLoadedToken((t) => t + 1);
            };
            baseImgRef.current.src = cutout.modifiedSourceDataUrl;
          }
        } else if (activeLayer) {
          onUpdateActiveLayer?.({ pngUrl: cutout.modifiedSourceDataUrl });
          const updatedImg = new Image();
          updatedImg.onload = () => {
            setLayersLoadedToken((t) => t + 1);
          };
          updatedImg.src = cutout.modifiedSourceDataUrl;
          layerImagesRef.current.set(activeLayer.id, updatedImg);
        }
      }

      const actionTag = extractionAction === 'cut_repair'
        ? 'Cut & Repair'
        : extractionAction === 'cut'
        ? 'Cut'
        : 'Copy';

      const finalPieceX = isBase ? cutout.x : (activeLayer?.x ?? 0) + cutout.x;
      const finalPieceY = isBase ? cutout.y : (activeLayer?.y ?? 0) + cutout.y;

      const newPieceLayer: MarkerMotionLayer = {
        id: `cutout-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: `Pedaço ${layers.length + 1} (${brushMode === 'lasso' ? 'Laço' : 'Pincel'}) [${actionTag}]`,
        isBaseAsset: false,
        visible: true,
        pngUrl: cutout.dataUrl,
        effect: 'none',
        speed: 1.0,
        intensity: 1.0,
        scale: 1.0,
        scaleX: 1.0,
        scaleY: 1.0,
        rotation: 0,
        flipX: false,
        flipY: false,
        x: finalPieceX,
        y: finalPieceY,
        pivotX: cutout.pivotX,
        pivotY: cutout.pivotY,
        physicsMode: 'none',
        brushSize,
        strokes: [],
      };

      const newPieceImg = new Image();
      newPieceImg.onload = () => {
        setLayersLoadedToken((t) => t + 1);
        redrawDrawingOverlay();
      };
      newPieceImg.src = cutout.dataUrl;
      layerImagesRef.current.set(newPieceLayer.id, newPieceImg);

      onCreateCutoutPiece?.(newPieceLayer);
      onActiveToolChange?.('move');
      setPendingPoints([]);
      currentStrokePoints.current = [];
      redrawDrawingOverlay();
    }
  };

  // Coordenadas calculadas do Pivô com base na peça da camada ativa
  const activePieceImg = activeLayer?.pngUrl ? layerImagesRef.current.get(activeLayer.id) : null;
  const activeW = activePieceImg ? activePieceImg.naturalWidth : artWidth;
  const activeH = activePieceImg ? activePieceImg.naturalHeight : artHeight;

  const activePivotPixelX =
    padX + (activeLayer?.x ?? 0) + activeW * (activeLayer?.pivotX ?? 0.5);
  const activePivotPixelY =
    padY + (activeLayer?.y ?? 0) + activeH * (activeLayer?.pivotY ?? 0.5);

  const getCursorClass = () => {
    if (isMiddlePanning || isSpacePressed || activeTool === 'pan') return 'cursor-grab active:cursor-grabbing';
    if (activeTool === 'move') {
      if (hoverGizmoHandle === 'nw' || hoverGizmoHandle === 'se') return 'cursor-nwse-resize';
      if (hoverGizmoHandle === 'ne' || hoverGizmoHandle === 'sw') return 'cursor-nesw-resize';
      if (hoverGizmoHandle === 'e' || hoverGizmoHandle === 'w') return 'cursor-ew-resize';
      if (hoverGizmoHandle === 'n' || hoverGizmoHandle === 's') return 'cursor-ns-resize';
      return 'cursor-move';
    }
    if (activeTool === 'pivot') return 'cursor-crosshair';
    if (brushMode === 'sponge') return 'cursor-crosshair';
    return brushMode === 'lasso' ? 'cursor-crosshair' : 'cursor-crosshair';
  };

  // Reseta visualização
  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full relative overflow-hidden bg-black flex flex-col select-none"
    >
      {/* Top Bar Minimalista do Motion Canvas */}
      <div className="px-4 py-2 bg-black/90 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-300 z-20 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-orange-400" />
          <span className="font-bold text-zinc-100 tracking-wide">Motion Canvas</span>
          {marker ? (
            <span className="text-[11px] font-mono text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              {marker.name}
            </span>
          ) : baseLayer?.name ? (
            <span className="text-[11px] font-mono text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              {baseLayer.name}
            </span>
          ) : null}
          {activeLayer && (
            <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Camada: {activeLayer.name}</span>
            </span>
          )}
        </div>

        {/* Controles de Zoom, Eixo & Centralização */}
        <div className="flex items-center gap-2">
          {onOpenStartupHub && (
            <button
              type="button"
              onClick={onOpenStartupHub}
              className="p-1.5 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-500/50 text-amber-300 hover:text-amber-200 text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Abrir Hub do Motion Canvas (Trocar Objeto / Galeria / Importar PNG / Criar Livre)"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Trocar Asset / Galeria</span>
            </button>
          )}

          <button
            onClick={() => setShowPivotReticle((prev) => !prev)}
            className={`p-1.5 px-2 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              showPivotReticle
                ? 'bg-amber-400/20 border-amber-400/50 text-amber-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Alternar visibilidade da mira do pivô"
          >
            <Crosshair className="w-3 h-3" />
            <span>Eixo {showPivotReticle ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleResetView}
            className="p-1.5 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            title="Centralizar e resetar visualização"
          >
            <Maximize className="w-3 h-3 text-sky-400" />
            <span>Centralizar</span>
          </button>

          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.15, z - 0.2))}
              className="p-1.5 hover:text-white text-zinc-400 transition-colors cursor-pointer"
              title="Reduzir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[10px] text-zinc-300 min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(6.0, z + 0.2))}
              className="p-1.5 hover:text-white text-zinc-400 transition-colors cursor-pointer"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1.0)}
              className="p-1.5 hover:text-white text-zinc-400 border-l border-zinc-800 transition-colors cursor-pointer"
              title="Resetar Zoom (100%)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Viewport Livre Infinita para Pan e Zoom (bg-black neutro) */}
      <div
        className="flex-1 relative overflow-hidden bg-black bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] flex items-center justify-center cursor-default"
        onPointerDown={(e) => {
          if (e.button === 1 || isSpacePressed || activeTool === 'pan') {
            setIsMiddlePanning(true);
            panStartRef.current = { x: e.clientX, y: e.clientY };
            panInitialRef.current = { ...pan };
          }
        }}
        onPointerMove={(e) => {
          if (isMiddlePanning) {
            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;
            setPan({
              x: Math.round(panInitialRef.current.x + dx),
              y: Math.round(panInitialRef.current.y + dy),
            });
          }
        }}
        onPointerUp={() => setIsMiddlePanning(false)}
      >
        {!imageSrc ? (
          <div className="flex flex-col items-center justify-center text-center p-8 max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl space-y-3 z-10">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Nenhum Asset Selecionado</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Selecione qualquer marcador, escolha da Galeria ou importe um PNG local para começar a animar nesta bancada.
            </p>
            {(onOpenStartupHub || onSelectMarkerRequest) && (
              <button
                type="button"
                onClick={onOpenStartupHub || onSelectMarkerRequest}
                className="px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4 text-amber-500" />
                <span>Escolher da Galeria ou Importar PNG</span>
              </button>
            )}
          </div>
        ) : (
          <div
            className="relative shadow-[0_30px_70px_rgba(0,0,0,0.95)] border border-zinc-800 rounded-2xl select-none"
            style={{
              width: canvasWidth,
              height: canvasHeight,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              backgroundImage:
                'linear-gradient(45deg, #18181b 25%, transparent 25%), linear-gradient(-45deg, #18181b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #18181b 75%), linear-gradient(-45deg, transparent 75%, #18181b 75%)',
              backgroundSize: '24px 24px',
              backgroundColor: '#09090b',
            }}
          >
            {/* Guia visual sutil delimitando os 25% de margem de segurança */}
            <div
              className="absolute pointer-events-none border border-dashed border-zinc-600/50 rounded-lg z-10"
              style={{
                left: padX,
                top: padY,
                width: artWidth,
                height: artHeight,
              }}
            >
              <span className="absolute -top-5 left-1 text-[9px] font-mono text-zinc-500 uppercase">
                Arte ({artWidth}x{artHeight}) + 25% Borda de Segurança
              </span>
            </div>

            {/* 1. Canvas de Renderização da Malha e Peças a 60 FPS */}
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="absolute inset-0 pointer-events-none block"
              style={{
                width: canvasWidth,
                height: canvasHeight,
              }}
            />

            {/* 2. Canvas Interativo de Desenho, Movimento e Pivô */}
            <canvas
              ref={drawingCanvasRef}
              width={canvasWidth}
              height={canvasHeight}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className={`absolute inset-0 block z-20 touch-none ${getCursorClass()}`}
              style={{
                width: canvasWidth,
                height: canvasHeight,
              }}
            />

            {/* 3. Marcador Visual de Eixo do Ponto Pivô da Camada Ativa */}
            {showPivotReticle && activeLayer && (
              <MotionPivotReticle
                x={activePivotPixelX}
                y={activePivotPixelY}
                zoom={1.0}
                rotation={activeLayer.rotation ?? 0}
                label={`Pivô [${activeLayer.name}] (${Math.round((activeLayer.pivotX ?? 0.5) * 100)}%, ${Math.round(
                  (activeLayer.pivotY ?? 0.5) * 100
                )}%)`}
              />
            )}
          </div>
        )}

        {/* Banner Flutuante de Confirmação quando Auto Extrair estiver DESLIGADO */}
        {pendingPoints.length > 0 && !autoExtract && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/95 border border-zinc-700 rounded-xl p-2.5 px-4 shadow-2xl flex items-center gap-3 backdrop-blur-md">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>{brushMode === 'lasso' ? 'Laço Fechado' : 'Traço Pronto'}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                  extractionAction === 'cut_repair'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : extractionAction === 'cut'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                }`}
              >
                {extractionAction === 'cut_repair'
                  ? 'Modo Recortar & Reparar'
                  : extractionAction === 'cut'
                  ? 'Modo Recortar'
                  : 'Modo Copiar'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => executeCutoutExtraction(pendingPoints)}
              className="py-1.5 px-3.5 rounded-lg text-xs font-bold bg-white hover:bg-zinc-200 text-black flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                {extractionAction === 'cut_repair'
                  ? 'Recortar, Reparar Fundo & Criar Peça'
                  : extractionAction === 'cut'
                  ? 'Recortar & Criar Camada'
                  : 'Copiar & Criar Camada'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingPoints([]);
                redrawDrawingOverlay();
              }}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Cancelar seleção"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* BARRA DE FERRAMENTAS FLUTUANTE INFERIOR (SOBREPOSIÇÃO DOCKED) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-[96vw] overflow-x-auto flex items-center gap-2 bg-black/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-1.5 shadow-2xl">
          {/* Grupo de Ferramentas de Desenho e Edição */}
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800/80 rounded-xl p-1">
            <button
              onClick={() => {
                onActiveToolChange?.('brush');
                onBrushModeChange?.('brush');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTool === 'brush' && brushMode === 'brush'
                  ? 'bg-white text-black font-black shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Pincel de Traço Livre"
            >
              <Brush className="w-3.5 h-3.5" />
              <span>Pincel</span>
            </button>

            <button
              onClick={() => {
                onActiveToolChange?.('brush');
                onBrushModeChange?.('lasso');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTool === 'brush' && brushMode === 'lasso'
                  ? 'bg-white text-black font-black shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Laço de Seleção (Área Fechada)"
            >
              <Lasso className="w-3.5 h-3.5" />
              <span>Laço</span>
            </button>

            <button
              onClick={() => {
                onActiveToolChange?.('brush');
                onBrushModeChange?.('erase_strokes');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTool === 'brush' && brushMode === 'erase_strokes'
                  ? 'bg-amber-500 text-black font-black shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Borracha para apagar traços Pen Motion"
            >
              <Eraser className="w-3.5 h-3.5 text-amber-400" />
              <span>Borracha Traço</span>
            </button>

            <button
              onClick={() => {
                onActiveToolChange?.('brush');
                onBrushModeChange?.('erase_png');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTool === 'brush' && brushMode === 'erase_png'
                  ? 'bg-red-500 text-white font-black shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Borracha para esculpir transparência na PNG"
            >
              <ImageIcon className="w-3.5 h-3.5 text-red-400" />
              <span>Borracha PNG</span>
            </button>

            <button
              onClick={() => {
                onActiveToolChange?.('brush');
                onBrushModeChange?.('sponge');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTool === 'brush' && brushMode === 'sponge'
                  ? 'bg-emerald-500 text-black font-black shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Esponja de Reparo (Spot Healing / Content-Aware)"
            >
              <WandSparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Esponja</span>
            </button>

            <div className="w-[1px] h-4 bg-zinc-800 mx-0.5" />

            <button
              onClick={() => onActiveToolChange?.('move')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTool === 'move'
                  ? 'bg-amber-400 text-black font-black shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Mover Peça (X, Y) com Gizmo de Deforme e Auto-Seleção"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Mover Peça</span>
            </button>

            <button
              onClick={() => onActiveToolChange?.('pivot')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTool === 'pivot'
                  ? 'bg-sky-400 text-black font-black shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Ponto Pivô (Eixo de Rotação)"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Ponto Pivô</span>
            </button>

            <button
              onClick={() => onActiveToolChange?.('pan')}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTool === 'pan'
                  ? 'bg-emerald-400 text-black font-black shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Mover Viewport (Pan)"
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Pan</span>
            </button>
          </div>

          <div className="w-[1px] h-5 bg-zinc-800" />

          {/* Grupo de Extração [Copiar vs Recortar vs Reparar] & Auto Extract */}
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800/80 rounded-xl p-1">
            <div className="flex items-center gap-0.5 bg-zinc-900 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => onExtractionActionChange?.('copy')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  extractionAction === 'copy'
                    ? 'bg-sky-500 text-black font-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Copiar: Duplica em nova peça preservando a camada pai intacta"
              >
                <Copy className="w-3 h-3" />
                <span>Copiar</span>
              </button>

              <button
                type="button"
                onClick={() => onExtractionActionChange?.('cut')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  extractionAction === 'cut'
                    ? 'bg-red-500 text-white font-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Recortar: Extrai a peça e apaga da camada pai"
              >
                <Scissors className="w-3 h-3" />
                <span>Recortar</span>
              </button>

              <button
                type="button"
                onClick={() => onExtractionActionChange?.('cut_repair')}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  extractionAction === 'cut_repair'
                    ? 'bg-emerald-500 text-black font-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Recortar & Reparar: Extrai a peça e cicatriza o buraco na camada pai"
              >
                <Bandage className="w-3 h-3 text-emerald-400" />
                <span>Recortar & Reparar</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onAutoExtractChange?.(!autoExtract)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                autoExtract
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
              title={
                autoExtract
                  ? 'Auto Extrair LIGADO: gera camada ao soltar o mouse'
                  : 'Auto Extrair DESLIGADO: exibe contorno para confirmação'
              }
            >
              {autoExtract ? <Zap className="w-3 h-3 text-emerald-400" /> : <ZapOff className="w-3 h-3 text-zinc-500" />}
              <span>Auto: {autoExtract ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <div className="w-[1px] h-5 bg-zinc-800" />

          {/* Botão Play / Pause da Animação */}
          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              isPaused
                ? 'bg-amber-500 hover:bg-amber-400 text-black font-black'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black font-black'
            }`}
            title={isPaused ? "Retomar movimento físico e animação (Play)" : "Congelar movimento no frame de repouso (Pause)"}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            <span>{isPaused ? 'Pausado' : 'Animando'}</span>
          </button>

          {/* Botão Teste de Física (Gelatina Primordial / Pêndulos) */}
          <button
            type="button"
            onClick={togglePrimordialJelly}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isPrimordialJelly
                ? 'bg-amber-400 text-black font-black animate-pulse shadow-md'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
            }`}
            title="Ativa o movimento de teste de pêndulo e gelatina no asset pai"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>{isPrimordialJelly ? 'Física ON' : 'Testar Física'}</span>
          </button>
        </div>
      </div>

      {/* Rodapé Informativo: Pan & Zoom Tips */}
      <div className="px-4 py-1.5 bg-black border-t border-zinc-900 text-[10px] text-zinc-500 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-zinc-400">
            <Hand className="w-3 h-3 text-emerald-400" />
            <span>Pan: Clique botão do meio / Espaço</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-zinc-400">
            <ZoomIn className="w-3 h-3 text-sky-400" />
            <span>Zoom: Ctrl + Scroll</span>
          </span>
          <span>•</span>
          <span className="text-zinc-400 font-mono">
            {activeTool === 'brush' && 'Traçar e soltar arranca o pedaço como nova camada'}
            {activeTool === 'move' && `Movendo a peça: (${activeLayer?.x ?? 0}px, ${activeLayer?.y ?? 0}px)`}
            {activeTool === 'pivot' && 'Clique para ajustar o ponto pivô'}
            {activeTool === 'pan' && 'Arrastando a visão'}
          </span>
        </div>

        <div className="font-mono text-zinc-500">
          Posição: ({pan.x}px, {pan.y}px) | Zoom: {Math.round(zoom * 100)}%
        </div>
      </div>
    </div>
  );
};
