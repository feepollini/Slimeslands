import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  MapProject,
  MapMarker,
  ActiveTool,
  MarkerType,
  NpcPatrolConfig,
  SubBiomeConfig,
  MotionOverlayStroke,
  LimitsBrushMode,
  GroundStamp,
} from '../types/map';
import { DEFAULT_TERRAIN_PEN_CONFIG } from '../types/terrainPen';
import {
  generateGrassSpritePNG,
  renderGroundStampsPixelCanvas,
  drawSingleGroundStampPixel,
  renderInstancedVegetationCanvas,
  NATURE_LAYER_ID,
  MAX_MAP_DIMENSION,
} from '../utils/terrainTextures';
import {
  getBiomeSegmentSpans,
  getTotalMapHeight,
  generateCurvedPath,
  getBiomeAtY,
  COLLISION_CELL,
} from '../utils/mapMath';
import {
  Tent,
  Castle,
  Skull,
  Gem,
  Landmark,
  Sparkles,
  Compass,
  Mountain,
  Anchor,
  Check,
  Lock,
  Upload,
  X,
  Navigation,
  RotateCw,
  Maximize2,
  Trash2,
  Image as ImageIcon,
  Zap,
  User,
  Copy,
  ArrowUp,
  ArrowDown,
  FolderOpen,
  Film,
  Eye,
  EyeOff,
  Plus,
} from 'lucide-react';
import { drawBiomeSpansWithFeather } from '../utils/canvasSeamBlend';
import { GroundShadow } from '../utils/assetSize';
import { MotionAssetCanvas } from './MotionAssetCanvas';
import { VideoAssetCanvas } from './video/VideoAssetCanvas';
import { VideoChromaKeyModal } from './video/VideoChromaKeyModal';
import { isVideoFile, readUploadedVideo } from '../utils/videoUtils';
import { AssetGalleryModal } from './AssetGalleryModal';
import { renderMotionOverlayStroke, renderUnifiedWaterOverlays, EffectType, isVfxOverlayEffect } from '../utils/motionCanvasEngine';
import { StationWorldMarker } from './station';
import {
  internAssetUrl,
  getUniqueAssetKey,
  getRenderableAssetUrl,
  cloneMarkerShared,
  cloneMotionLayersShared,
} from '../utils/assetRegistry';

// Cache global para máscaras de transparência (Alpha Hit-Testing em PNGs indexado por hash O(1))
const pngAlphaCache = new Map<string, { width: number; height: number; data: Uint8ClampedArray }>();

const getPngAlphaData = (src: string): { width: number; height: number; data: Uint8ClampedArray } | null => {
  if (!src) return null;
  const key = getUniqueAssetKey(src);
  const cached = pngAlphaCache.get(key);
  if (cached) return cached;

  const img = new Image();
  const renderUrl = getRenderableAssetUrl(src);
  if (!renderUrl.startsWith('data:') && !renderUrl.startsWith('blob:')) {
    img.crossOrigin = 'anonymous';
  }
  img.src = renderUrl;

  const extractData = () => {
    if (img.naturalWidth === 0 || img.naturalHeight === 0) return;
    try {
      const canvas = document.createElement('canvas');
      const maxDim = 128;
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        pngAlphaCache.set(key, { width: w, height: h, data: imgData.data });
      }
    } catch {
      // Fallback em caso de restrição
    }
  };

  if (img.complete && img.naturalWidth > 0) {
    extractData();
  } else {
    img.onload = extractData;
  }

  return pngAlphaCache.get(key) || null;
};

interface Props {
  project: MapProject;
  activeTool: ActiveTool;
  activeTab?: string;
  canvasView?: 'vertical' | 'extended';
  limitsBrushMode?: LimitsBrushMode;
  limitsBrushSize?: number;
  mirrorLimits?: boolean;
  onUpdateProject?: (updates: Partial<MapProject>) => void;
  selectedMarkerId: string | null;
  onSelectMarker: (markerId: string | null) => void;
  onAddMarkerAt: (x: number, y: number, biomeId: string) => void;
  onAddSubBiomeMarkerAt?: (subBiomeId: string, localX: number, localY: number) => void;
  onAddMotionMarkerAt?: (info: {
    x: number;
    y: number;
    subBiomeId?: string;
    biomeId?: string;
    dataUrl: string;
    w: number;
    h: number;
  }) => void;
  motionBrushSize?: number;
  motionAuto?: boolean;
  motionEffect?: EffectType;
  motionSpeed?: number;
  motionIntensity?: number;
  motionApiRef?: React.MutableRefObject<{ extract: () => void; clear: () => void } | null>;
  onUpdateMarkerPos: (markerId: string, x: number, y: number) => void;
  onUpdateMarker?: (markerId: string, updates: Partial<MapMarker>) => void;
  onDeleteMarker?: (markerId: string) => void;
  onDuplicateMarker?: (markerId: string) => void;
  onReorderMarker?: (markerId: string, direction: 'up' | 'down') => void;
  zoom: number;
  onScrollChange?: (scrollY: number, totalHeight: number, viewportHeight: number) => void;
  scrollTargetY?: number | null;
  onResetScrollTarget?: () => void;
  onDropPNG?: (dataUrl: string, fileName: string) => void;
  onDropMarkerAsset?: (
    asset: {
      name: string;
      dataUrl?: string;
      type?: MarkerType;
      size?: number;
      solidCollision?: boolean;
      hasShadow?: boolean;
      npcBounce?: boolean;
      effect?: any;
    },
    coords: { rawX: number; rawY: number }
  ) => void;
  onTriggerImportPNG?: () => void;
  onTriggerCreatePhaseModal?: () => void;
  onUpdateSubBiome?: (id: string, updates: Partial<SubBiomeConfig>) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onDragStart?: () => void;
  effectBrushSize?: number;
  effectType?: string;
  effectSpeed?: number;
  effectIntensity?: number;
  effectScale?: number;
  selectedOverlayId?: string | null;
  onSelectOverlay?: (id: string | null) => void;
  onUpdateOverlay?: (id: string, updates: Partial<MotionOverlayStroke>) => void;
}

export const VerticalMapCanvas: React.FC<Props> = ({
  project,
  activeTool,
  activeTab,
  canvasView,
  limitsBrushMode = 'paint',
  limitsBrushSize = 1,
  mirrorLimits = false,
  onUpdateProject,
  selectedMarkerId,
  onSelectMarker,
  onAddMarkerAt,
  onAddSubBiomeMarkerAt,
  onAddMotionMarkerAt,
  motionBrushSize = 12,
  motionAuto = true,
  motionEffect = 'jelly',
  motionSpeed = 1.0,
  motionIntensity = 1.0,
  motionApiRef,
  onUpdateMarkerPos,
  onUpdateMarker,
  onDeleteMarker,
  onDuplicateMarker,
  onReorderMarker,
  zoom,
  onScrollChange,
  scrollTargetY,
  onResetScrollTarget,
  onDropPNG,
  onDropMarkerAsset,
  onTriggerImportPNG,
  onTriggerCreatePhaseModal,
  onUpdateSubBiome,
  onZoomIn,
  onZoomOut,
  onDragStart,
  effectBrushSize = 12,
  effectType = 'smoke',
  effectSpeed = 1.0,
  effectIntensity = 1.0,
  effectScale = 1.0,
  selectedOverlayId = null,
  onSelectOverlay,
  onUpdateOverlay,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const groundStampsCanvasRef = useRef<HTMLCanvasElement>(null);
  const vegetationCanvasRef = useRef<HTMLCanvasElement>(null);
  const mapFrameRef = useRef<HTMLDivElement>(null);

  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  const [draggedMarkerLocalPos, setDraggedMarkerLocalPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const draggedMarkerLocalPosRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ mouseX: number; mouseY: number; panX: number; panY: number }>({
    mouseX: 0,
    mouseY: 0,
    panX: 0,
    panY: 0,
  });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDraggingFileOver, setIsDraggingFileOver] = useState(false);
  const [expandedQuickActionId, setExpandedQuickActionId] = useState<string | null>(null);
  const quickActionFileInputRef = useRef<HTMLInputElement>(null);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [targetMarkerForGallery, setTargetMarkerForGallery] = useState<string | null>(null);
  const [activeChromaMarkerId, setActiveChromaMarkerId] = useState<string | null>(null);

  const activeChromaMarker = useMemo(
    () => (activeChromaMarkerId ? (project.markers || []).find((m) => m.id === activeChromaMarkerId) || null : null),
    [activeChromaMarkerId, project.markers]
  );

  // Escuta tecla Espaço para ativar Pan (Ferramenta Mão livre 🖐️ como no Figma/Photoshop)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !e.repeat &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        setIsSpacePressed(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Escuta arraste e soltura global para o Pan nunca travar ou bugar ao passar da borda da tela
  useEffect(() => {
    if (!isPanning) return;
    const onGlobalMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStartRef.current.mouseX;
      const dy = e.clientY - panStartRef.current.mouseY;
      setPan({
        x: Math.round(panStartRef.current.panX + dx),
        y: Math.round(panStartRef.current.panY + dy),
      });
    };
    const onGlobalMouseUp = () => {
      setIsPanning(false);
    };
    window.addEventListener('mousemove', onGlobalMouseMove, { passive: true });
    window.addEventListener('mouseup', onGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
    };
  }, [isPanning]);

  // Garante soltura limpa do marcador arrastado mesmo se o mouse sair da janela
  useEffect(() => {
    if (!draggingMarkerId) return;
    const onGlobalMarkerUp = () => {
      const pending = draggedMarkerLocalPosRef.current;
      if (pending) {
        draggedMarkerLocalPosRef.current = null;
        setDraggedMarkerLocalPos(null);
        onUpdateMarkerPos(pending.id, pending.x, pending.y);
      }
      setDraggingMarkerId(null);
    };
    window.addEventListener('mouseup', onGlobalMarkerUp);
    return () => window.removeEventListener('mouseup', onGlobalMarkerUp);
  }, [draggingMarkerId, onUpdateMarkerPos]);

  const handleQuickActionLocalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && targetMarkerForGallery) {
      const currentMarker = project.markers.find((m) => m.id === targetMarkerForGallery);
      if (isVideoFile(file)) {
        try {
          const vid = await readUploadedVideo(file);
          onUpdateMarker?.(targetMarkerForGallery, {
            customIconPng: vid.dataUrl,
            mediaType: 'video',
            videoUrl: vid.videoUrl,
            videoChromaKey: {
              enabled: true,
              color: '#00ff00',
              tolerance: 35,
              smoothness: 12,
              cropSquare: true,
              cropOffsetX: 0.5,
              cropOffsetY: 0.5,
              videoSpeed: 1.0,
              scale: 1.0,
              flipH: false,
            },
            pivotX: currentMarker?.pivotX ?? 0.5,
            pivotY: currentMarker?.pivotY ?? 0.5,
            size: currentMarker?.size && currentMarker.size >= 16 ? currentMarker.size : 150,
          });
          // Abre imediatamente o modal de Chroma Key para calibrar com o vídeo carregado
          setActiveChromaMarkerId(targetMarkerForGallery);
        } catch (err) {
          console.error('Erro ao ler vídeo no marcador:', err);
        }
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          if (dataUrl) {
            onUpdateMarker?.(targetMarkerForGallery, {
              customIconPng: dataUrl,
              mediaType: 'image',
              videoUrl: undefined,
              videoChromaKey: undefined,
              size: currentMarker?.size && currentMarker.size >= 16 ? currentMarker.size : 150,
            });
          }
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };

  // Drag e interação com Objetos de Efeito (Effect Pen Overlays)
  const draggingOverlayIdRef = useRef<string | null>(null);
  const dragOverlayStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragOverlayInitialPointsRef = useRef<{ x: number; y: number }[]>([]);

  // Centraliza o canvas no marcador (focar câmera da cápsula)
  const focusMarkerCanvas = (m: MapMarker) => {
    const c = containerRef.current;
    const frame = mapFrameRef.current;
    if (!c || !frame) return;
    const cRect = c.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const ox = isExtended && m.subBiomeId ? (subBiomeOriginX(m.subBiomeId) ?? 0) : 0;
    const markerWorldX = ox + m.x;
    const markerWorldY = m.y;
    const currentMarkerScreenX = frameRect.left + markerWorldX * zoom;
    const currentMarkerScreenY = frameRect.top + markerWorldY * zoom;
    const deltaX = (cRect.left + cRect.width / 2) - currentMarkerScreenX;
    const deltaY = (cRect.top + cRect.height / 2) - currentMarkerScreenY;
    setPan((prev) => ({
      x: Math.round(prev.x + deltaX),
      y: Math.round(prev.y + deltaY),
    }));
  };

  const totalMapWidth = project.mapWidth || 768;
  // Spans memoizados: sem isso cada scroll recriava o array e forçava redesenho total do mapa
  const spans = useMemo(() => getBiomeSegmentSpans(project.biomes), [project.biomes]);
  const totalMapHeight = getTotalMapHeight(project.biomes);

  // A VISTA segue o canvas central (desacoplada da aba lateral): abrir marcadores,
  // jogador etc. não troca mais o mapa de lugar.
  const isExtended =
    canvasView === 'extended' ||
    project.canvasKind === 'extended' ||
    activeTab === 'extended' ||
    ((project.subBiomes || []).length > 0 && project.biomes.length === 0);
  const hasContent = isExtended
    ? (project.subBiomes || []).length > 0
    : project.biomes.length > 0;
  const subBiomes = project.subBiomes || [];
  const SUB_BIOME_GAP = 40;

  // Origem X (em px do canvas) de cada sub-bioma na fileira do Extended.
  const subBiomeOriginX = (subBiomeId: string): number | null => {
    let cursorX = 0;
    for (const sb of subBiomes) {
      if (sb.id === subBiomeId) return cursorX;
      cursorX += (sb.tileWidth || 400) + SUB_BIOME_GAP;
    }
    return null;
  };

  // Descobre em qual sub-bioma caiu um X do canvas (ou null se no vão).
  const subBiomeAtCanvasX = (clientX: number): { sb: (typeof subBiomes)[number]; localX: number } | null => {
    let cursorX = 0;
    for (const sb of subBiomes) {
      const w = sb.tileWidth || 400;
      if (clientX >= cursorX && clientX < cursorX + w) {
        return { sb, localX: clientX - cursorX };
      }
      cursorX += w + SUB_BIOME_GAP;
    }
    return null;
  };

  // Visualização de Grama/Flores no Editor: por padrão falso para máxima performance (apenas marcadores de área leves)
  const [showGrassInEditor, setShowGrassInEditor] = useState<boolean>(false);

  const totalTerrainCount = useMemo(() => {
    return (project.markers || []).filter(
      (m) =>
        (isExtended ? Boolean(m.subBiomeId) : !m.subBiomeId) &&
        (m.id.startsWith('terrain-grass-') || m.id.startsWith('terrain-flower-'))
    ).length;
  }, [project.markers, isExtended]);

  const grassPatches = useMemo(() => {
    if (showGrassInEditor) return [];
    const terrainMarkers = (project.markers || []).filter(
      (m) =>
        (isExtended ? Boolean(m.subBiomeId) : !m.subBiomeId) &&
        (m.id.startsWith('terrain-grass-') || m.id.startsWith('terrain-flower-'))
    );
    if (terrainMarkers.length === 0) return [];

    // Agrupa por proximidade espacial (célula de grade de 240px)
    const CELL_SIZE = 240;
    const grid = new Map<string, { type: 'grass' | 'flower'; markers: MapMarker[] }>();

    for (const m of terrainMarkers) {
      const isFlower = m.id.startsWith('terrain-flower-');
      const type: 'grass' | 'flower' = isFlower ? 'flower' : 'grass';
      const ox = isExtended && m.subBiomeId ? (subBiomeOriginX(m.subBiomeId) ?? 0) : 0;
      const gx = ox + m.x;
      const gy = m.y;
      const cellKey = `${type}:${Math.floor(gx / CELL_SIZE)},${Math.floor(gy / CELL_SIZE)}`;
      let entry = grid.get(cellKey);
      if (!entry) {
        entry = { type, markers: [] };
        grid.set(cellKey, entry);
      }
      entry.markers.push(m);
    }

    const patches: Array<{
      id: string;
      type: 'grass' | 'flower';
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
      count: number;
    }> = [];

    grid.forEach((entry, key) => {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const m of entry.markers) {
        const ox = isExtended && m.subBiomeId ? (subBiomeOriginX(m.subBiomeId) ?? 0) : 0;
        const x = ox + m.x;
        const y = m.y;
        const halfSize = (m.size || 40) / 2;
        if (x - halfSize < minX) minX = x - halfSize;
        if (y - halfSize < minY) minY = y - halfSize;
        if (x + halfSize > maxX) maxX = x + halfSize;
        if (y + halfSize > maxY) maxY = y + halfSize;
      }

      patches.push({
        id: `patch-${key}`,
        type: entry.type,
        minX: Math.max(0, Math.floor(minX - 12)),
        minY: Math.max(0, Math.floor(minY - 12)),
        maxX: Math.ceil(maxX + 12),
        maxY: Math.ceil(maxY + 12),
        count: entry.markers.length,
      });
    });

    return patches;
  }, [project.markers, isExtended, showGrassInEditor, subBiomes]);

  // Verifica se o clique em coordenadas do cliente atingiu um pixel visível (opaco) do marcador
  const isPixelOpaqueAtPoint = (
    marker: MapMarker,
    clientX: number,
    clientY: number,
    canvasRect: DOMRect | null
  ): boolean => {
    if (!canvasRect) return true;
    const originX = isExtended && marker.subBiomeId ? (subBiomeOriginX(marker.subBiomeId) ?? 0) : 0;
    const markerCanvasX = (originX + marker.x) * zoom;
    const markerCanvasY = marker.y * zoom;
    const markerPixelSize = (marker.size || 150) * zoom;

    const clickCanvasX = clientX - canvasRect.left;
    const clickCanvasY = clientY - canvasRect.top;

    let dx = clickCanvasX - markerCanvasX;
    let dy = clickCanvasY - markerCanvasY;

    const halfBox = markerPixelSize / 2;
    // Bounding box rápido com folga de rotação
    if (Math.abs(dx) > halfBox * 1.5 || Math.abs(dy) > halfBox * 1.5) {
      return false;
    }

    // Se não tiver PNG (pino clássico vetorial), considera círculo
    if (!marker.customIconPng && marker.mediaType !== 'video' && !marker.videoUrl) {
      return Math.hypot(dx, dy) <= halfBox;
    }

    // Desfaz a rotação do marcador
    const rotDeg = marker.rotation || 0;
    if (rotDeg !== 0) {
      const rad = (-rotDeg * Math.PI) / 180;
      const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
      dx = rx;
      dy = ry;
    }

    // Desfaz flips
    if (marker.flipX) dx = -dx;
    if (marker.flipY) dy = -dy;

    // Normaliza nas dimensões [0, 1] da imagem
    const u = (dx + halfBox) / markerPixelSize;
    const v = (dy + halfBox) / markerPixelSize;

    if (u < 0 || u > 1 || v < 0 || v > 1) {
      return false;
    }

    // Se o marcador já estiver selecionado, ou for Vídeo / Motion / Tela Interativa, aceita qualquer ponto na caixa
    if (
      marker.id === selectedMarkerId ||
      marker.mediaType === 'video' ||
      Boolean(marker.videoUrl) ||
      Boolean(marker.motionLayers && marker.motionLayers.length > 0) ||
      marker.type === 'interactive_screen'
    ) {
      return true;
    }

    const alphaInfo = getPngAlphaData(marker.customIconPng || '');
    if (!alphaInfo) return true;

    const px = Math.min(alphaInfo.width - 1, Math.max(0, Math.floor(u * alphaInfo.width)));
    const py = Math.min(alphaInfo.height - 1, Math.max(0, Math.floor(v * alphaInfo.height)));
    const alphaVal = alphaInfo.data[(py * alphaInfo.width + px) * 4 + 3];

    return alphaVal > 20;
  };

  // Encontra o marcador visível do topo cujo pixel no ponto é opaco
  const findTopmostOpaqueMarker = (
    clientX: number,
    clientY: number,
    excludeMarkerIds: string[] = []
  ): MapMarker | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const canvasRect = canvas.getBoundingClientRect();

    const effectiveLayers = project.markerLayers && project.markerLayers.length > 0
      ? project.markerLayers
      : [{ id: 'layer-default', name: 'Camada Padrão', visible: true, locked: false, order: 0 }];

    const visibleMarkers = project.markers.filter((m) => {
      if (m.id.startsWith('terrain-')) return false;
      if (excludeMarkerIds.includes(m.id)) return false;
      if (isExtended ? !m.subBiomeId : Boolean(m.subBiomeId)) return false;
      const l = effectiveLayers.find((layer) => layer.id === m.layerId) || effectiveLayers[0];
      const parentGroup = l?.groupId ? effectiveLayers.find((g) => g.id === l.groupId) : null;
      const isVisible = l ? l.visible && (!parentGroup || parentGroup.visible !== false) : true;
      const isLocked = !!l?.locked || !!parentGroup?.locked;
      return isVisible && !isLocked;
    });

    const sorted = [...visibleMarkers].sort((a, b) => {
      if (a.id === selectedMarkerId) return -1;
      if (b.id === selectedMarkerId) return 1;
      const lA = effectiveLayers.find((layer) => layer.id === a.layerId)?.order || 0;
      const lB = effectiveLayers.find((layer) => layer.id === b.layerId)?.order || 0;
      if (lA !== lB) return lB - lA;
      const yA = a.markerOff ? 1 : Math.round(a.y + (a.size || 44) * 0.35);
      const yB = b.markerOff ? 1 : Math.round(b.y + (b.size || 44) * 0.35);
      return yB - yA;
    });

    for (const m of sorted) {
      if (isPixelOpaqueAtPoint(m, clientX, clientY, canvasRect)) {
        return m;
      }
    }
    return null;
  };

  let canvasW = Math.min(MAX_MAP_DIMENSION, totalMapWidth);
  let canvasH = Math.min(MAX_MAP_DIMENSION, totalMapHeight);
  if (isExtended) {
    if (subBiomes.length === 0) {
      canvasW = 800;
      canvasH = 600;
    } else {
      let wSum = 0;
      let hMax = 400;
      subBiomes.forEach((sb) => {
        wSum += Math.min(MAX_MAP_DIMENSION, sb.tileWidth || 400) + 40;
        const sbH = Math.min(MAX_MAP_DIMENSION, sb.tileHeight || 400);
        if (sbH > hMax) hMax = sbH;
      });
      canvasW = Math.max(800, wSum - 40);
      canvasH = Math.min(MAX_MAP_DIMENSION, hMax);
    }
  }

  const tileImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Load and cache PNG image elements
  useEffect(() => {
    project.biomes.forEach((biome) => {
      const src = biome.tilePng;
      const existing = tileImagesRef.current.get(biome.id);
      if (!existing || existing.src !== src) {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          renderTiles();
        };
        tileImagesRef.current.set(biome.id, img);
      }
    });
  }, [project.biomes]);

  const subBiomeImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    (project.subBiomes || []).forEach((sb) => {
      const src = sb.tilePng;
      const existing = subBiomeImagesRef.current.get(sb.id);
      if (!existing || existing.src !== src) {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          renderTiles();
        };
        subBiomeImagesRef.current.set(sb.id, img);
      }
    });
  }, [project.subBiomes]);

  const [isPaintingLimits, setIsPaintingLimits] = useState(false);
  const [limitsHover, setLimitsHover] = useState<{ x: number; y: number } | null>(null);

  // ===== Motion Pen: traço livre que vira asset recortado com gelatina =====
  const motionOverlayRef = useRef<HTMLCanvasElement>(null);
  const motionStrokesRef = useRef<{ x: number; y: number }[][]>([]);
  const motionCurrentRef = useRef<{ x: number; y: number }[] | null>(null);
  const motionPaintingRef = useRef<boolean>(false);
  const motionHoverPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastDrawnBoxRef = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);

  // Projeção matematicamente exata de coordenadas da tela para as coordenadas internas do mapa
  // Imune a bordas, DPI, variações de zoom, dimensões estendidas e aumento proporcional do mapa
  const getMapCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const el = canvasRef.current || mapFrameRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const borderLeft = el === canvasRef.current ? 0 : (el.clientLeft || 0);
      const borderTop = el === canvasRef.current ? 0 : (el.clientTop || 0);
      const contentW = el === canvasRef.current ? rect.width : (el.clientWidth || rect.width);
      const contentH = el === canvasRef.current ? rect.height : (el.clientHeight || rect.height);
      const rawX = ((clientX - rect.left - borderLeft) / (contentW || 1)) * canvasW;
      const rawY = ((clientY - rect.top - borderTop) / (contentH || 1)) * canvasH;
      return {
        x: Math.max(0, Math.min(canvasW, rawX)),
        y: Math.max(0, Math.min(canvasH, rawY)),
      };
    },
    [canvasW, canvasH]
  );

  const motionPos = (e: React.MouseEvent<HTMLDivElement>): { x: number; y: number } | null => {
    return getMapCoords(e.clientX, e.clientY);
  };

  // Loop de Animação a 60 FPS para Sobreposições do Motion Pen (Efeitos Vivos sem Corte)
  useEffect(() => {
    let animId: number;
    const over = motionOverlayRef.current;
    if (!over) return;
    const ctx = over.getContext('2d');
    if (!ctx) return;

    const renderLoop = (time: number) => {
      // 1. Coleta overlays ativos
      const overlays = (project.motionOverlays || []).filter((ov) => ov.effect !== 'grass');
      const waterOverlays = overlays.filter(
        (ov) => ov.visible !== false && ov.effect === 'water' && ov.points && ov.points.length > 0
      );
      const nonWaterOverlays = overlays.filter(
        (ov) => ov.visible !== false && ov.effect !== 'water' && ov.points && ov.points.length > 0
      );

      // Inclui o traço de água que está sendo pintado ao vivo agora mesmo
      const allWaterOverlays = [...waterOverlays];
      const cfg = project.terrainPenConfig || DEFAULT_TERRAIN_PEN_CONFIG;
      if (
        isTerrainPenPaintingRef.current &&
        cfg.mode === 'water' &&
        terrainStrokePointsRef.current &&
        terrainStrokePointsRef.current.length > 0
      ) {
        allWaterOverlays.push({
          id: 'live-terrain-water-stroke',
          effect: 'water',
          brushSize: Math.max(16, (cfg.brushRadius || 42) * 2),
          scale: 1.0,
          speed: cfg.waterFlowSpeed ?? cfg.effectSpeed ?? 1.0,
          intensity: cfg.waterOpacity ?? 1.0,
          points: terrainStrokePointsRef.current,
          color: cfg.waterColor || '#0284c7',
          waterTexturePng: cfg.waterTexturePng,
          textureScale: cfg.waterTextureScale ?? 1.0,
          flowSpeed: cfg.waterFlowSpeed ?? 1.0,
          flowAngle: cfg.waterFlowAngle ?? 45,
          textureOpacity: cfg.waterTextureOpacity ?? 0.85,
          waterWaveEcho: cfg.waterWaveEcho ?? true,
          waterWaveDeform: cfg.waterWaveDeform ?? 0.25,
        });
      }

      // 2. Traço da Motion Pen ou Effect Pen sendo desenhado ao vivo
      const allPaths = [...motionStrokesRef.current];
      if (motionCurrentRef.current) allPaths.push(motionCurrentRef.current);

      const hasLiveTerrainNoise =
        isTerrainPenPaintingRef.current &&
        cfg.mode === 'noise' &&
        Boolean(terrainStrokePointsRef.current && terrainStrokePointsRef.current.length > 0);
      const isPenToolActive =
        activeTool === 'motion_pen' ||
        activeTool === 'effect_pen' ||
        (activeTool === 'terrain_pen' && (cfg.mode === 'water' || cfg.mode === 'noise'));

      const hasActiveWork =
        allWaterOverlays.length > 0 ||
        nonWaterOverlays.length > 0 ||
        allPaths.length > 0 ||
        hasLiveTerrainNoise ||
        Boolean(selectedOverlayId);

      if (!hasActiveWork) {
        if (over.width !== 1 || over.height !== 1) {
          over.width = 1;
          over.height = 1;
        }
        if (isPenToolActive) {
          animId = requestAnimationFrame(renderLoop);
        }
        return; // Zera consumo de VRAM quando não há efeitos ou traços ativos
      }

      // Máximo seguro de buffer Canvas 2D para GPU (impede crash Out of Memory do Chrome em mapas longos)
      const MAX_OVERLAY_DIM = 4096;
      const targetW = Math.min(MAX_OVERLAY_DIM, Math.round(canvasW * zoom));
      const targetH = Math.min(MAX_OVERLAY_DIM, Math.round(canvasH * zoom));

      if (over.width !== targetW || over.height !== targetH) {
        over.width = targetW;
        over.height = targetH;
      }

      const timeSec = time * 0.001;
      ctx.clearRect(0, 0, targetW, targetH);

      const isEff = activeTool === 'effect_pen';
      const liveWidth = isEff
        ? Math.max(1, effectBrushSize * effectScale)
        : motionBrushSize;

      ctx.save();
      ctx.scale(zoom, zoom);

      if (allWaterOverlays.length > 0) {
        renderUnifiedWaterOverlays(ctx, canvasW, canvasH, timeSec, allWaterOverlays);
      }

      // Renderiza as outras sobreposições (fogo, fumaça, terreno, etc.)
      for (const ov of nonWaterOverlays) {
        renderMotionOverlayStroke(ctx, canvasW, canvasH, timeSec, ov);
      }

      // Desenha caixa de seleção com alças para overlay selecionado
      for (const ov of overlays) {
        if (ov.visible === false) continue;
        if (selectedOverlayId && ov.id === selectedOverlayId && ov.points && ov.points.length > 0) {
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          for (const p of ov.points) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
          }
          const scale = ov.scale || 1.0;
          const pad = Math.max(8, (ov.brushSize * scale) / 2 + 6);
          const boxX = minX - pad;
          const boxY = minY - pad;
          const boxW = Math.max(16, (maxX - minX) + pad * 2);
          const boxH = Math.max(16, (maxY - minY) + pad * 2);

          ctx.save();
          // Borda tracejada âmbar brilhante
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5 / zoom;
          ctx.setLineDash([4 / zoom, 3 / zoom]);
          ctx.strokeRect(boxX, boxY, boxW, boxH);

          // Cantos quadrados de redimensionamento/alça
          ctx.fillStyle = '#f59e0b';
          const cornerSize = 6 / zoom;
          ctx.fillRect(boxX - cornerSize / 2, boxY - cornerSize / 2, cornerSize, cornerSize);
          ctx.fillRect(boxX + boxW - cornerSize / 2, boxY - cornerSize / 2, cornerSize, cornerSize);
          ctx.fillRect(boxX - cornerSize / 2, boxY + boxH - cornerSize / 2, cornerSize, cornerSize);
          ctx.fillRect(boxX + boxW - cornerSize / 2, boxY + boxH - cornerSize / 2, cornerSize, cornerSize);

          // Tag de identificação do efeito
          ctx.font = `bold ${Math.max(9, Math.round(10 / zoom))}px sans-serif`;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          const label = `${ov.name || ov.effect} (${(scale).toFixed(1)}x)`;
          const textMetrics = ctx.measureText(label);
          ctx.fillRect(boxX, boxY - 18 / zoom, textMetrics.width + 12 / zoom, 16 / zoom);
          ctx.fillStyle = '#fbbf24';
          ctx.fillText(label, boxX + 6 / zoom, boxY - 6 / zoom);
          ctx.restore();
        }
      }

      // 2. Traço da Motion Pen ou Effect Pen sendo desenhado ao vivo
      const liveColor = isEff ? 'rgba(245, 158, 11, 0.9)' : 'rgba(232, 121, 249, 0.9)';

      for (const path of allPaths) {
        if (path.length === 0) continue;
        ctx.save();
        ctx.strokeStyle = liveColor;
        ctx.lineWidth = liveWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
        ctx.restore();
      }

      // 2.1 Traço ao vivo de Terreno/Grama do Pen Terrain (água já está unificada no renderUnifiedWaterOverlays acima)
      if (isTerrainPenPaintingRef.current && terrainStrokePointsRef.current && terrainStrokePointsRef.current.length > 0) {
        if (cfg.mode === 'noise') {
          renderMotionOverlayStroke(ctx, canvasW, canvasH, timeSec, {
            id: 'live-preview-terrain-stroke',
            effect: 'terrain',
            brushSize: Math.max(16, (cfg.brushRadius || 42) * 2),
            scale: 1.0,
            speed: 1.0,
            intensity: cfg.groundPaintOpacity ?? 0.85,
            points: terrainStrokePointsRef.current,
            color: cfg.groundPaintColor || '#16a34a',
          });
        }
      }

      // 3. Cursor guia do pincel no hover
      if ((activeTool === 'motion_pen' || activeTool === 'effect_pen') && motionHoverPosRef.current) {
        const hp = motionHoverPosRef.current;
        const curSize = activeTool === 'effect_pen'
          ? Math.max(1, effectBrushSize * effectScale)
          : motionBrushSize;
        const strokeCol = activeTool === 'effect_pen'
          ? 'rgba(245, 158, 11, 0.9)'
          : 'rgba(232, 121, 249, 0.9)';
        const fillCol = activeTool === 'effect_pen'
          ? 'rgba(245, 158, 11, 0.2)'
          : 'rgba(232, 121, 249, 0.2)';

        ctx.save();
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, Math.max(1, curSize / 2), 0, Math.PI * 2);
        ctx.strokeStyle = strokeCol;
        ctx.lineWidth = 1.5 / zoom;
        ctx.stroke();
        ctx.fillStyle = fillCol;
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [
    project.motionOverlays,
    activeTool,
    motionBrushSize,
    motionEffect,
    motionSpeed,
    motionIntensity,
    effectBrushSize,
    effectType,
    effectSpeed,
    effectIntensity,
    effectScale,
    selectedOverlayId,
    zoom,
    canvasW,
    canvasH,
  ]);

  // HMR touch: renderLoop ativo e sincronizado a 60 FPS
  const redrawMotionPreview = () => {};

  const clearMotion = () => {
    motionStrokesRef.current = [];
    motionCurrentRef.current = null;
    motionPaintingRef.current = false;
    const over = motionOverlayRef.current;
    if (over) {
      const ctx = over.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, over.width, over.height);
    }
  };

  const extractMotion = () => {
    const main = canvasRef.current;
    if (!main || !onAddMotionMarkerAt) return;
    const strokes = motionStrokesRef.current;
    if (strokes.length === 0) return;
    const pad = motionBrushSize;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const path of strokes) {
      for (const p of path) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
    const sx = Math.max(0, Math.floor(minX - pad));
    const sy = Math.max(0, Math.floor(minY - pad));
    const sw = Math.min(main.width - sx, Math.ceil(maxX + pad) - sx);
    const sh = Math.min(main.height - sy, Math.ceil(maxY + pad) - sy);
    if (sw < 2 || sh < 2) return;
    // Copia os pixels do mapa + máscara só do traçado
    const copy = document.createElement('canvas');
    copy.width = sw;
    copy.height = sh;
    const cctx = copy.getContext('2d');
    if (!cctx) return;
    cctx.drawImage(main, sx, sy, sw, sh, 0, 0, sw, sh);
    const mask = document.createElement('canvas');
    mask.width = sw;
    mask.height = sh;
    const mctx = mask.getContext('2d');
    if (!mctx) return;
    mctx.strokeStyle = '#ffffff';
    mctx.lineWidth = motionBrushSize;
    mctx.lineCap = 'round';
    mctx.lineJoin = 'round';
    mctx.fillStyle = '#ffffff';
    for (const path of strokes) {
      if (path.length === 0) continue;
      mctx.beginPath();
      if (path.length === 1) {
        mctx.arc(path[0].x - sx, path[0].y - sy, motionBrushSize / 2, 0, Math.PI * 2);
        mctx.fill();
        continue;
      }
      mctx.moveTo(path[0].x - sx, path[0].y - sy);
      for (let i = 1; i < path.length; i++) mctx.lineTo(path[i].x - sx, path[i].y - sy);
      mctx.stroke();
    }
    cctx.globalCompositeOperation = 'destination-in';
    cctx.drawImage(mask, 0, 0);
    // Recorta bordas transparentes (pivô = centro do recorte)
    const img = cctx.getImageData(0, 0, sw, sh);
    let tx0 = sw;
    let ty0 = sh;
    let tx1 = -1;
    let ty1 = -1;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        if (img.data[(y * sw + x) * 4 + 3] > 8) {
          if (x < tx0) tx0 = x;
          if (y < ty0) ty0 = y;
          if (x > tx1) tx1 = x;
          if (y > ty1) ty1 = y;
        }
      }
    }
    if (tx1 < 0) return;
    const tw = tx1 - tx0 + 1;
    const th = ty1 - ty0 + 1;
    const final = document.createElement('canvas');
    final.width = tw;
    final.height = th;
    const fctx = final.getContext('2d');
    if (!fctx) return;
    fctx.drawImage(copy, tx0, ty0, tw, th, 0, 0, tw, th);
    const dataUrl = final.toDataURL('image/png');
    const cx = sx + tx0 + tw / 2;
    const cy = sy + ty0 + th / 2;
    if (isExtended) {
      const hit = subBiomeAtCanvasX(cx);
      if (!hit) return;
      const h = hit.sb.tileHeight || 400;
      if (cy < 0 || cy >= h) return;
      onAddMotionMarkerAt({
        x: hit.localX,
        y: cy,
        subBiomeId: hit.sb.id,
        dataUrl,
        w: tw,
        h: th,
      });
    } else {
      const span = spans.find((s) => cy >= s.startY && cy < s.endY);
      onAddMotionMarkerAt({
        x: cx,
        y: cy,
        biomeId: span ? span.biome.id : project.biomes[0]?.id || '',
        dataUrl,
        w: tw,
        h: th,
      });
    }
    clearMotion();
  };

  useEffect(() => {
    if (motionApiRef) motionApiRef.current = { extract: extractMotion, clear: clearMotion };
  });

  useEffect(() => {
    clearMotion();
  }, [activeTool, activeTab, canvasView]);

  const paintCellAtEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = getMapCoords(e.clientX, e.clientY);
    if (!p) return;
    const clientX = p.x;
    const clientY = p.y;

    const CELL_SIZE = COLLISION_CELL;
    const radius = Math.floor(limitsBrushSize / 2);

    // --- Vista Extended: pinta a colisão DA FASE VISÍVEL (coordenadas locais por sub-bioma) ---
    if (isExtended) {
      const tab = activeTab || 'editor';
      if (tab !== 'limits' && tab !== 'extended' && tab !== 'editor') return;
      const GAP = 40;
      const list = project.subBiomes || [];
      let cursorX = 0;
      let targetSb: (typeof list)[number] | null = null;
      let localOriginX = 0;
      for (const sb of list) {
        const w = sb.tileWidth || 400;
        if (clientX >= cursorX && clientX < cursorX + w) {
          targetSb = sb;
          localOriginX = cursorX;
          break;
        }
        cursorX += w + GAP;
      }
      if (!targetSb) return;
      const localX = clientX - localOriginX;
      const localY = clientY;
      const targetW = targetSb.tileWidth || 400;
      const targetH = targetSb.tileHeight || 400;
      if (localX < 0 || localY < 0 || localX >= targetW || localY >= targetH) return;

      const centerCol = Math.floor(localX / CELL_SIZE);
      const centerRow = Math.floor(localY / CELL_SIZE);
      const cellsSet = new Set(targetSb.walkableCells || []);
      const blockedSet = new Set(targetSb.blockedCells || []);
      for (let dc = -radius; dc <= radius; dc++) {
        for (let dr = -radius; dr <= radius; dr++) {
          const c = centerCol + dc;
          const r = centerRow + dr;
          if (c >= 0 && r >= 0 && c < Math.ceil(targetW / CELL_SIZE) && r < Math.ceil(targetH / CELL_SIZE)) {
            const key = `${c},${r}`;
            if (limitsBrushMode === 'paint') {
              cellsSet.add(key);
              blockedSet.delete(key);
            } else if (limitsBrushMode === 'block') {
              blockedSet.add(key);
              cellsSet.delete(key);
            } else {
              cellsSet.delete(key);
              blockedSet.delete(key);
            }
          }
        }
      }
      const nextCells = Array.from(cellsSet);
      const nextBlocked = Array.from(blockedSet);
      if (onUpdateSubBiome) {
        onUpdateSubBiome(targetSb.id, {
          walkableCells: nextCells,
          blockedCells: nextBlocked,
          ...(limitsBrushMode === 'paint' ? { restrictPlayerToPaintedAreas: true } : {}),
        });
      } else if (onUpdateProject) {
        onUpdateProject({
          subBiomes: (project.subBiomes || []).map((sb) =>
            sb.id === targetSb!.id ? {
              ...sb,
              walkableCells: nextCells,
              blockedCells: nextBlocked,
              ...(limitsBrushMode === 'paint' ? { restrictPlayerToPaintedAreas: true } : {}),
            } : sb
          ),
        });
      }
      return;
    }

    // --- Vista vertical (biomas geral): só pinta com os painéis de limites/editor ---
    const tab = activeTab || 'editor';
    if ((tab !== 'limits' && tab !== 'editor') || !onUpdateProject) return;
    const centerCol = Math.floor(clientX / CELL_SIZE);
    const centerRow = Math.floor(clientY / CELL_SIZE);

    const cellsSet = new Set(project.walkableCells || []);
    const blockedSet = new Set(project.blockedCells || []);

    const applyCell = (c: number, r: number) => {
      if (
        c < 0 ||
        r < 0 ||
        c >= Math.ceil(totalMapWidth / CELL_SIZE) ||
        r >= Math.ceil(totalMapHeight / CELL_SIZE)
      ) {
        return;
      }
      const key = `${c},${r}`;
      if (limitsBrushMode === 'paint') {
        cellsSet.add(key);
        blockedSet.delete(key);
      } else if (limitsBrushMode === 'block') {
        blockedSet.add(key);
        cellsSet.delete(key);
      } else {
        cellsSet.delete(key);
        blockedSet.delete(key);
      }
      // Espelho: reflete na mesma posição relativa de TODAS as repetições da tile do bioma
      if (mirrorLimits) {
        const yPx = r * CELL_SIZE + CELL_SIZE / 2;
        const span = spans.find((s) => yPx >= s.startY && yPx < s.endY);
        if (span) {
          const tileH = span.biome.tileHeight > 0 ? span.biome.tileHeight : 64;
          const local = (yPx - span.startY) % tileH;
          for (let ty = span.startY + local; ty < span.endY; ty += tileH) {
            const rr = Math.floor(ty / CELL_SIZE);
            if (rr === r) continue;
            if (rr < 0 || rr >= Math.ceil(totalMapHeight / CELL_SIZE)) continue;
            const k2 = `${c},${rr}`;
            if (limitsBrushMode === 'paint') {
              cellsSet.add(k2);
              blockedSet.delete(k2);
            } else if (limitsBrushMode === 'block') {
              blockedSet.add(k2);
              cellsSet.delete(k2);
            } else {
              cellsSet.delete(k2);
              blockedSet.delete(k2);
            }
          }
        }
      }
    };

    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        applyCell(centerCol + dc, centerRow + dr);
      }
    }

    onUpdateProject({ 
      walkableCells: Array.from(cellsSet),
      blockedCells: Array.from(blockedSet),
      ...(limitsBrushMode === 'paint' ? { restrictPlayerToPaintedAreas: true } : {}),
    });
  };

  // Main canvas render: renders tiles at the EXACT pixel dimensions of the PNG with subtle seam feathering
  const renderTiles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isExtended) {
      // No modo extended, a renderização dos sub-biomas é feita via DOM <img> 100% acelerado pela GPU.
      // Mantemos o canvas interno em 1x1 para evitar que o navegador aloque 400MB de VRAM (ex: 10000x10000px).
      if (canvas.width !== 1 || canvas.height !== 1) {
        canvas.width = 1;
        canvas.height = 1;
      }
      return;
    }

    if (project.biomes.length === 0) return;

    if (canvas.width !== totalMapWidth || canvas.height !== totalMapHeight) {
      canvas.width = totalMapWidth;
      canvas.height = totalMapHeight;
    }

    ctx.clearRect(0, 0, totalMapWidth, totalMapHeight);

    // Renderiza biomas com desvanecer suave na pontinha do corte
    drawBiomeSpansWithFeather(ctx, spans, tileImagesRef.current, totalMapWidth);

    // Grid Overlay
    if (project.gridType === 'squares') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;

      spans.forEach((span) => {
        const tileH = span.biome.tileHeight > 0 ? span.biome.tileHeight : 64;
        for (let y = span.startY; y <= span.endY; y += tileH) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(totalMapWidth, y);
          ctx.stroke();
        }
      });
    }

    // Walkable limits overlay (Verde - Área permitida/circulação)
    const cells = new Set(project.walkableCells || []);
    if (cells.size > 0 || (activeTab === 'limits' && limitsBrushMode === 'paint')) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
      ctx.lineWidth = 1;
      const CELL_SIZE = COLLISION_CELL;
      cells.forEach((key) => {
        const [c, r] = key.split(',').map(Number);
        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
      });
    }

    // Blocked limits overlay (Vermelho - Paredes / Obstáculos sólidos de colisão)
    const blocked = new Set(project.blockedCells || []);
    if (blocked.size > 0 || (activeTab === 'limits' && limitsBrushMode === 'block')) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.85)';
      ctx.lineWidth = 1;
      const CELL_SIZE = COLLISION_CELL;
      blocked.forEach((key) => {
        const [c, r] = key.split(',').map(Number);
        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
      });
    }
  }, [project.mapWidth, project.gridType, spans, totalMapHeight, totalMapWidth, project.biomes.length, project.walkableCells, project.blockedCells, activeTab, limitsBrushMode, project.subBiomes, canvasView]);

  useEffect(() => {
    renderTiles();
  }, [renderTiles]);

  // Handle external scrollTarget (Radar / Minimap seek)
  useEffect(() => {
    if (
      scrollTargetY !== null &&
      scrollTargetY !== undefined &&
      !isNaN(scrollTargetY) &&
      containerRef.current &&
      mapFrameRef.current
    ) {
      const c = containerRef.current;
      const frame = mapFrameRef.current;
      const cRect = c.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      const currentScreenY = frameRect.top + scrollTargetY * zoom;
      const deltaY = (cRect.top + cRect.height / 2) - currentScreenY;
      setPan((prev) => ({
        ...prev,
        y: Math.round(prev.y + deltaY),
      }));
      if (onResetScrollTarget) onResetScrollTarget();
    }
  }, [scrollTargetY, zoom, onResetScrollTarget]);

  // Sincroniza a posição visível do mapa com o MiniMap / Radar
  useEffect(() => {
    if (!onScrollChange || !containerRef.current || !mapFrameRef.current) return;
    const c = containerRef.current;
    const frame = mapFrameRef.current;
    const cRect = c.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const rawScrollY = (cRect.top - frameRect.top) / zoom;
    const visibleScrollY = Math.max(0, Math.min(totalMapHeight, rawScrollY));
    const viewportHeight = cRect.height / zoom;
    onScrollChange(visibleScrollY, totalMapHeight, viewportHeight);
  }, [pan.y, zoom, totalMapHeight, onScrollChange]);

  // Click handler
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'add_marker') return;

    const p = getMapCoords(e.clientX, e.clientY);
    if (!p) return;

    const clickX = p.x;
    const clickY = p.y;

    // Na vista Extended o clique cria marcador DA FASE (coordenadas locais).
    if (isExtended) {
      const hit = subBiomeAtCanvasX(clickX);
      if (!hit || !onAddSubBiomeMarkerAt) return;
      const h = hit.sb.tileHeight || 400;
      const localY = Math.max(16, Math.min(h - 16, clickY));
      onAddSubBiomeMarkerAt(hit.sb.id, Math.round(hit.localX), Math.round(localY));
      return;
    }

    const span = spans.find((s) => clickY >= s.startY && clickY < s.endY);
    const biomeId = span ? span.biome.id : project.biomes[0]?.id || '';

    onAddMarkerAt(Math.round(clickX), Math.round(clickY), biomeId);
  };

  // Ctrl+scroll = zoom; botão do meio = pan (qualquer ferramenta)
  const zoomInRef = useRef(onZoomIn);
  const zoomOutRef = useRef(onZoomOut);
  const lastZoomRef = useRef(zoom);
  const zoomAnchorRef = useRef<{ clientX: number; clientY: number } | null>(null);

  useEffect(() => {
    zoomInRef.current = onZoomIn;
    zoomOutRef.current = onZoomOut;
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom suave ancorado na posição exata do cursor do mouse
        zoomAnchorRef.current = { clientX: e.clientX, clientY: e.clientY };
        if (e.deltaY < 0) zoomInRef.current?.();
        else if (e.deltaY > 0) zoomOutRef.current?.();
      } else {
        // Rolagem e Pan fluido de viewport com o mouse wheel / trackpad
        const deltaX = e.shiftKey ? e.deltaY : (e.deltaX || 0);
        const deltaY = e.shiftKey ? 0 : e.deltaY;
        setPan((prev) => ({
          x: Math.round(prev.x - deltaX),
          y: Math.round(prev.y - deltaY),
        }));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Compensa o Pan para manter o ponto do mouse ou centro da tela perfeitamente fixo durante o Zoom
  useEffect(() => {
    const oldZoom = lastZoomRef.current;
    lastZoomRef.current = zoom;
    const el = containerRef.current;
    const frame = mapFrameRef.current;
    if (!el || !frame || oldZoom === zoom) return;

    const rect = el.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const anchor = zoomAnchorRef.current;
    zoomAnchorRef.current = null;

    if (anchor) {
      const relX = (anchor.clientX - frameRect.left) / oldZoom;
      const relY = (anchor.clientY - frameRect.top) / oldZoom;

      const newFrameLeft = anchor.clientX - relX * zoom;
      const newFrameTop = anchor.clientY - relY * zoom;

      setPan((prev) => ({
        x: Math.round(prev.x + (newFrameLeft - frameRect.left)),
        y: Math.round(prev.y + (newFrameTop - frameRect.top)),
      }));
    } else {
      const centerClientX = rect.left + rect.width / 2;
      const centerClientY = rect.top + rect.height / 2;
      const relX = (centerClientX - frameRect.left) / oldZoom;
      const relY = (centerClientY - frameRect.top) / oldZoom;

      const newFrameLeft = centerClientX - relX * zoom;
      const newFrameTop = centerClientY - relY * zoom;

      setPan((prev) => ({
        x: Math.round(prev.x + (newFrameLeft - frameRect.left)),
        y: Math.round(prev.y + (newFrameTop - frameRect.top)),
      }));
    }
  }, [zoom]);

  // Limpeza automática de overlays legados com effect 'grass' (não devem existir como fitas)
  useEffect(() => {
    if (project.motionOverlays && project.motionOverlays.some((ov) => ov.effect === 'grass')) {
      onUpdateProject?.({
        motionOverlays: project.motionOverlays.filter((ov) => ov.effect !== 'grass'),
      });
    }
  }, [project.motionOverlays, onUpdateProject]);

  // Carimbo (Stamp Brush) State & Handlers
  const isStampingRef = useRef<boolean>(false);
  const lastStampPosRef = useRef<{ x: number; y: number } | null>(null);
  const [stampHover, setStampHover] = useState<{ x: number; y: number } | null>(null);
  const pendingStampsRef = useRef<GroundStamp[]>([]);
  const projectStampsRef = useRef<GroundStamp[]>(project.groundStamps || []);
  useEffect(() => {
    projectStampsRef.current = project.groundStamps || [];
  }, [project.groundStamps]);

  // Throttler de RAF para hover dos cursores de pincel (impede 100+ re-renders desnecessários por segundo)
  const hoverRafRef = useRef<number | null>(null);
  const pendingHoverPosRef = useRef<{
    tool: string;
    pos: { x: number; y: number } | null;
  } | null>(null);

  const updateHoverThrottled = useCallback((tool: string, pos: { x: number; y: number } | null) => {
    pendingHoverPosRef.current = { tool, pos };
    if (!hoverRafRef.current) {
      hoverRafRef.current = requestAnimationFrame(() => {
        hoverRafRef.current = null;
        const cur = pendingHoverPosRef.current;
        if (!cur) return;
        if (cur.tool === 'stamp_brush') setStampHover(cur.pos);
        else if (cur.tool === 'terrain_pen') setTerrainPenHover(cur.pos);
        else if (cur.tool === 'marker_pen') setMarkerPenHover(cur.pos);
        else if (cur.tool === 'limits') setLimitsHover(cur.pos);
      });
    }
  }, []);

  const placeStampAtEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = getMapCoords(e.clientX, e.clientY);
    if (!p) return;

    const rawX = p.x;
    const rawY = p.y;

    const cfg = project.stampBrushConfig || {
      pngUrl: null,
      size: 52,
      feather: 14,
      spacing: 36,
      randomRotation: true,
      randomMirror: true,
      opacity: 0.9,
      activeLayerId: 'layer-ground-1',
    };

    const spacing = Math.max(16, cfg.spacing || 36);

    if (lastStampPosRef.current) {
      const dist = Math.hypot(rawX - lastStampPosRef.current.x, rawY - lastStampPosRef.current.y);
      if (dist < spacing) return;
    }

    lastStampPosRef.current = { x: rawX, y: rawY };

    const png = cfg.pngUrl || cfg.savedPresets?.[0]?.dataUrl;
    if (!png) return;
    const internedPng = internAssetUrl(png);

    const rotation = cfg.randomRotation ? Math.floor(Math.random() * 360) : 0;
    const flipX = cfg.randomMirror ? Math.random() > 0.5 : false;
    const flipY = cfg.randomMirror ? Math.random() > 0.5 : false;

    const activeLayerId = cfg.activeLayerId || project.stampLayers?.[0]?.id || 'layer-ground-1';

    const newStamp: GroundStamp = {
      id: `stamp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      x: Number(rawX.toFixed(2)),
      y: Number(rawY.toFixed(2)),
      pngUrl: internedPng,
      size: cfg.size || 52,
      feather: cfg.feather ?? 14,
      rotation,
      flipX,
      flipY,
      opacity: cfg.opacity ?? 0.9,
      layerId: activeLayerId,
    };

    // 1. Desenha incrementalmente direto no canvas em O(1) (0.01ms) sem limpar ou recalcular carimbos anteriores
    const stCanvas = groundStampsCanvasRef.current;
    if (stCanvas) {
      drawSingleGroundStampPixel(
        stCanvas,
        newStamp,
        project.stampLayers || [],
        canvasW,
        canvasH,
        zoom
      );
    }

    // 2. Registra na lista em memória e na fila da sessão para commit limpo ao soltar o clique
    projectStampsRef.current = [...(projectStampsRef.current || []), newStamp];
    pendingStampsRef.current.push(newStamp);
  };

  // Marker Pen (Pincel Dispersor de Marcadores e Moldes Instanciados)
  const isMarkerPenPaintingRef = useRef<boolean>(false);
  const lastMarkerPenPosRef = useRef<{ x: number; y: number } | null>(null);
  const [markerPenHover, setMarkerPenHover] = useState<{ x: number; y: number } | null>(null);
  const pendingMarkerPenMarkersRef = useRef<MapMarker[]>([]);
  const [liveStrokeMarkers, setLiveStrokeMarkers] = useState<MapMarker[]>([]);

  // Pen Terrain (Pincel de Terreno Vivo: Grama, Água e Texturas)
  const isTerrainPenPaintingRef = useRef<boolean>(false);
  const lastTerrainPenPosRef = useRef<{ x: number; y: number } | null>(null);
  const terrainStrokePointsRef = useRef<{ x: number; y: number }[] | null>(null);
  const [terrainPenHover, setTerrainPenHover] = useState<{ x: number; y: number } | null>(null);
  const pendingTerrainPenMarkersRef = useRef<MapMarker[]>([]);
  const projectMarkersRef = useRef<MapMarker[]>(project.markers || []);
  useEffect(() => {
    projectMarkersRef.current = project.markers || [];
  }, [project.markers]);

  const eraseTerrainAtPos = (rawX: number, rawY: number, radius: number) => {
    // 1. Apaga marcadores de terreno (tufos de grama, flores, ou quaisquer marcadores 'terrain-*')
    const currentMarkers = projectMarkersRef.current || [];
    let markersChanged = false;
    const remainingMarkers = currentMarkers.filter((m) => {
      const isTerrainMarker =
        m.id.startsWith('terrain-') ||
        m.id.startsWith('grass_') ||
        m.id.startsWith('flower_');
      if (!isTerrainMarker) return true;

      let mx = m.x;
      let my = m.y;
      if (isExtended && m.subBiomeId) {
        const originX = subBiomeOriginX(m.subBiomeId) ?? 0;
        mx += originX;
      }
      const dist = Math.hypot(mx - rawX, my - rawY);
      if (dist <= radius) {
        markersChanged = true;
        return false;
      }
      return true;
    });

    if (markersChanged) {
      projectMarkersRef.current = remainingMarkers;
      onUpdateProject?.({ markers: remainingMarkers });
    }

    // 2. Apaga sobreposições de água ou terreno pinceladas (MotionOverlayStroke)
    const currentOverlays = project.motionOverlays || [];
    if (currentOverlays.length > 0) {
      let overlaysChanged = false;
      const nextOverlays: MotionOverlayStroke[] = [];

      for (const ov of currentOverlays) {
        const isTerrainOverlay =
          ov.effect === 'water' ||
          ov.effect === 'terrain' ||
          ov.effect === 'noise' ||
          ov.effect === 'ground' ||
          ov.id.startsWith('terrain-overlay-');

        if (!isTerrainOverlay) {
          nextOverlays.push(ov);
          continue;
        }

        const threshold = radius + (ov.brushSize || 30) * 0.5;
        const pts = ov.points || [];
        const isNear = pts.some((p) => Math.hypot(p.x - rawX, p.y - rawY) <= threshold);

        if (isNear) {
          overlaysChanged = true;
          const remainingPts = pts.filter((p) => Math.hypot(p.x - rawX, p.y - rawY) > threshold);
          if (remainingPts.length >= 2) {
            nextOverlays.push({
              ...ov,
              points: remainingPts,
            });
          }
        } else {
          nextOverlays.push(ov);
        }
      }

      if (overlaysChanged) {
        onUpdateProject?.({ motionOverlays: nextOverlays });
      }
    }

    // 3. Apaga carimbos de chão se estiverem no raio
    if (project.groundStamps && project.groundStamps.length > 0) {
      const remainingStamps = project.groundStamps.filter((s) => {
        return Math.hypot(s.x - rawX, s.y - rawY) > radius;
      });
      if (remainingStamps.length !== project.groundStamps.length) {
        onUpdateProject?.({ groundStamps: remainingStamps });
      }
    }
  };

  const placeTerrainPenAtEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = getMapCoords(e.clientX, e.clientY);
    if (!p) return;

    const rawX = p.x;
    const rawY = p.y;

    const cfg = project.terrainPenConfig || DEFAULT_TERRAIN_PEN_CONFIG;
    if (cfg.mode === 'water' || cfg.mode === 'noise' || cfg.mode === 'eraser') {
      // Água e terreno são sobreposições contínuas; borracha apaga
      return;
    }
    const spacing = Math.max(22, cfg.spacing || 28);

    const prev = lastTerrainPenPosRef.current;
    const dist = prev ? Math.hypot(rawX - prev.x, rawY - prev.y) : 0;

    if (prev && dist < spacing) return;

    // Limita steps contínuos por evento para não sobrecarregar a memória
    const numSteps = prev ? Math.max(1, Math.min(8, Math.floor(dist / spacing))) : 1;
    lastTerrainPenPosRef.current = { x: rawX, y: rawY };

    let assets = (cfg.assets || []).filter((a) => a.enabled);
    if (assets.length === 0) {
      const defaultPng = generateGrassSpritePNG(cfg.activePreset || 'cluster');
      assets = [
        {
          id: 'grass_cluster',
          name: 'Tufo Denso Padrão',
          dataUrl: defaultPng,
          scale: 1.0,
          weight: 100,
          enabled: true,
        },
      ];
    }

    // Com instanciamento de clones em Canvas único (0 nós DOM), suporta até 5.000 tufos sem peso
    const currentTerrainMarkersCount = (projectMarkersRef.current || []).filter((m) =>
      m.id.startsWith('terrain-')
    ).length;
    if (currentTerrainMarkersCount >= 5000) {
      return;
    }

    const totalWeight = assets.reduce((sum, a) => sum + (a.weight || 1), 0);
    const densityFactor = Math.max(0.2, (cfg.relativeDensity || 130) / 100);
    const countPerStep = Math.max(1, Math.min(2, Math.round(1.2 * densityFactor)));

    const newMarkers: MapMarker[] = [];
    // Camada dedicada do tipo Natureza para o Terrain Pen (não mistura com marcadores comuns)
    const targetLayerId =
      cfg.targetLayerId && cfg.targetLayerId !== 'layer-default'
        ? cfg.targetLayerId
        : NATURE_LAYER_ID;

    for (let step = 1; step <= numSteps; step++) {
      const t = numSteps === 1 ? 1 : step / numSteps;
      const curX = prev ? prev.x + (rawX - prev.x) * t : rawX;
      const curY = prev ? prev.y + (rawY - prev.y) * t : rawY;

      for (let i = 0; i < countPerStep; i++) {
        let rand = Math.random() * totalWeight;
        let chosenAsset = assets[0];
        for (const a of assets) {
          if (rand < (a.weight || 1)) {
            chosenAsset = a;
            break;
          }
          rand -= (a.weight || 1);
        }

        const brushRadius = Math.max(0, cfg.brushRadius || 48);
        const angle = Math.random() * 2 * Math.PI;
        const distR = Math.sqrt(Math.random()) * brushRadius;
        const spotX = curX + Math.cos(angle) * distR;
        const spotY = curY + Math.sin(angle) * distR;

        let subBiomeId: string | undefined;
        let finalX = Math.round(spotX);
        let finalY = Math.round(spotY);
        let biomeId: string | undefined;

        if (isExtended) {
          const hit = subBiomeAtCanvasX(spotX);
          if (!hit) continue;
          subBiomeId = hit.sb.id;
          finalX = Math.round(hit.localX);
        } else {
          const span = spans.find((s) => finalY >= s.startY && finalY < s.endY);
          biomeId = span ? span.biome.id : project.biomes[0]?.id || '';
        }

        const baseScale = cfg.bladeBaseScale || 0.85;
        const assetScale = chosenAsset.scale || 1.0;
        const scaleRange = Math.max(0.01, (cfg.randomScaleMax || 1.25) - (cfg.randomScaleMin || 0.8));
        const randScale = (cfg.randomScaleMin || 0.8) + Math.random() * scaleRange;
        const finalSize = Math.round(48 * baseScale * assetScale * randScale);

        const tilt = cfg.bladeTilt || 0;
        const rotJitter = cfg.randomRotation ? (Math.random() * 2 - 1) * (cfg.randomRotationMax || 20) : 0;
        const finalRotation = Math.round(tilt + rotJitter);

        const flipX = cfg.randomMirrorH ? Math.random() > 0.5 : false;
        const flipY = cfg.randomMirrorV ? Math.random() > 0.5 : false;

        const finalScaleX = Number(((cfg.horizontalWidthScale || 1.0) * (chosenAsset.scaleX || 1.0)).toFixed(2));
        const finalScaleY = Number(((cfg.verticalHeightScale || 1.0) * (chosenAsset.scaleY || 1.0)).toFixed(2));

        const isFlower = cfg.mode === 'flowers';
        const prefix = isFlower ? 'terrain-flower-' : 'terrain-grass-';
        const defaultName = isFlower ? 'Flor' : 'Tufo de Grama';
        const markerColor = isFlower ? '#f472b6' : '#16a34a';
        const effect: 'wind' | 'jelly' | 'water' | 'none' = isFlower ? 'wind' : (cfg.effect || 'wind');
        const pivotX = 0.5;
        const pivotY = 1.0;

        const marker: MapMarker = {
          id: `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${step}-${i}`,
          name: `${defaultName} (${chosenAsset.name})`,
          description: 'Decalque instanciado de terreno vivo',
          type: 'neutral',
          color: markerColor,
          status: 'discovered',
          x: finalX,
          y: finalY,
          biomeId,
          subBiomeId,
          layerId: targetLayerId,
          customIconPng: internAssetUrl(chosenAsset.dataUrl),
          size: finalSize,
          scaleX: finalScaleX,
          scaleY: finalScaleY,
          pivotX,
          pivotY,
          rotation: finalRotation,
          flipX,
          flipY,
          solidCollision: false,
          hasShadow: false,
          effect,
          effectSpeed: cfg.effectSpeed || 1.0,
          effectIntensity: cfg.effectIntensity || 1.0,
        };

        newMarkers.push(marker);
      }
    }

    if (newMarkers.length > 0) {
      projectMarkersRef.current = [...(projectMarkersRef.current || []), ...newMarkers];
      pendingTerrainPenMarkersRef.current.push(...newMarkers);
    }
  };

  const placeMarkerPenAtEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = getMapCoords(e.clientX, e.clientY);
    if (!p) return;

    const rawX = p.x;
    const rawY = p.y;

    const allGallery = project.galleryAssets || [];
    const cfg = project.markerPenConfig || {
      selectedAssetIds: [],
      selectedTemplateMarkerIds: [],
      size: 150,
      spacing: 65,
      randomMirrorH: true,
      randomMirrorV: false,
      randomScale: true,
      randomRotation: false,
    };

    const spacing = Math.max(16, cfg.spacing || 65);

    if (lastMarkerPenPosRef.current) {
      const dist = Math.hypot(rawX - lastMarkerPenPosRef.current.x, rawY - lastMarkerPenPosRef.current.y);
      if (dist < spacing) return;
    }

    // Constrói pool unificado de candidatos: Marcadores Molde (com lógica/IA/vídeo/motion) + Assets da Galeria
    type PenCandidate =
      | { kind: 'template'; marker: MapMarker }
      | { kind: 'asset'; asset: import('../types/map').GalleryAsset };

    const candidates: PenCandidate[] = [];
    const templateIds = cfg.selectedTemplateMarkerIds || [];
    if (templateIds.length > 0) {
      for (const tid of templateIds) {
        const found = (project.markers || []).find((m) => m.id === tid);
        if (found) candidates.push({ kind: 'template', marker: found });
      }
    }

    const selectedIds = cfg.selectedAssetIds || [];
    if (selectedIds.length > 0) {
      for (const aid of selectedIds) {
        const found = allGallery.find((a) => a.id === aid);
        if (found) candidates.push({ kind: 'asset', asset: found });
      }
    }

    if (candidates.length === 0) {
      for (const a of allGallery) {
        candidates.push({ kind: 'asset', asset: a });
      }
    }

    if (candidates.length === 0) return;

    lastMarkerPenPosRef.current = { x: rawX, y: rawY };
    const picked = candidates[Math.floor(Math.random() * candidates.length)];

    let subBiomeId: string | undefined;
    let finalX = Math.round(rawX);
    let finalY = Math.round(rawY);
    let biomeId: string | undefined;

    if (isExtended) {
      const hit = subBiomeAtCanvasX(rawX);
      if (!hit) return;
      subBiomeId = hit.sb.id;
      finalX = Math.round(hit.localX);
    } else {
      const span = spans.find((s) => finalY >= s.startY && finalY < s.endY);
      biomeId = span ? span.biome.id : project.biomes[0]?.id || '';
    }

    const targetLayerId = cfg.targetLayerId || project.activeMarkerLayerId || project.markerLayers?.[0]?.id || 'layer-default';

    // Variações aleatórias configuradas
    const baseSize = cfg.size || (picked.kind === 'template' ? picked.marker.size || 150 : 150);
    const scaleMultiplier = cfg.randomScale ? 0.75 + Math.random() * 0.5 : 1.0; // ±25%
    const finalSize = Math.round(baseSize * scaleMultiplier);

    let newMarker: MapMarker;

    if (picked.kind === 'template') {
      // INSTANCIAMENTO COMPLETO DE MARCADOR MOLDE (Flyweight: compartilha texturas/vídeos/malhas, preserva IA, diálogos e lógicas)
      const cloned = cloneMarkerShared(picked.marker);
      const flipX = cfg.randomMirrorH ? Math.random() > 0.5 : Boolean(cloned.flipX);
      const flipY = cfg.randomMirrorV ? Math.random() > 0.5 : Boolean(cloned.flipY);
      const rotation = cfg.randomRotation ? Math.floor(Math.random() * 360) : (cloned.rotation || 0);

      newMarker = {
        ...cloned,
        id: `marker-${cloned.type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        x: finalX,
        y: finalY,
        biomeId,
        subBiomeId,
        layerId: cfg.targetLayerId || cloned.layerId || targetLayerId,
        size: finalSize,
        flipX,
        flipY,
        rotation,
      };
    } else {
      const chosenAsset = picked.asset;
      const flipX = cfg.randomMirrorH ? Math.random() > 0.5 : Boolean(chosenAsset.videoChromaKey?.flipH);
      const flipY = cfg.randomMirrorV ? Math.random() > 0.5 : false;
      const rotation = cfg.randomRotation ? Math.floor(Math.random() * 360) : 0;

      const chosenType = cfg.markerType || 'neutral';
      const isNpc = chosenType === 'npc';

      let npcPatrolConfig: NpcPatrolConfig | undefined = undefined;
      if (isNpc && cfg.npcAutoMove !== false) {
        let patrolPreset: 'horizontal' | 'vertical' | 'custom' | 'procedural' = 'procedural';
        if (cfg.npcMoveMode === 'horizontal') patrolPreset = 'horizontal';
        else if (cfg.npcMoveMode === 'vertical') patrolPreset = 'vertical';
        else if (cfg.npcMoveMode === 'random') {
          patrolPreset = Math.random() > 0.5 ? 'horizontal' : 'vertical';
        } else {
          patrolPreset = 'procedural';
        }

        npcPatrolConfig = {
          enabled: true,
          preset: patrolPreset,
          walkStyle: 'jelly',
          speed: cfg.npcMoveSpeed || 2.5,
          distance: cfg.npcMoveDistance || 80,
          pauseTime: 1.5,
          loop: true,
        };
      }

      const typeColorMap: Record<string, string> = {
        neutral: '#64748b',
        npc: '#10b981',
        treasure: '#f59e0b',
        camp: '#8b5cf6',
        boss: '#ef4444',
        castle: '#3b82f6',
        light: '#eab308',
        collectible: '#ec4899',
        town: '#06b6d4',
        shrine: '#a855f7',
        portal: '#6366f1',
        event: '#f97316',
      };

      const typeLabelMap: Record<string, string> = {
        neutral: 'Objeto Neutro',
        npc: 'NPC',
        treasure: 'Baú de Tesouro',
        camp: 'Acampamento',
        boss: 'Chefe',
        castle: 'Castelo',
        light: 'Tocha / Luz',
        collectible: 'Colecionável',
        town: 'Vila',
        shrine: 'Santuário',
        portal: 'Portal',
        event: 'Evento',
      };

      const isJelly = isNpc || cfg.neutralEffect === 'jelly';
      const isVideoAsset = chosenAsset.mediaType === 'video' || Boolean(chosenAsset.videoUrl);
      const hasMotionLayers = Boolean(chosenAsset.motionLayers && chosenAsset.motionLayers.length > 0);

      newMarker = {
        id: `marker-${chosenType}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: chosenAsset.name || typeLabelMap[chosenType] || 'Marcador',
        description: isNpc
          ? 'Personagem NPC no cenário'
          : chosenType === 'neutral'
          ? 'Objeto de cenário neutro'
          : `Marcador de ${chosenType}`,
        type: chosenType,
        color: typeColorMap[chosenType] || '#64748b',
        status: 'discovered',
        x: finalX,
        y: finalY,
        biomeId,
        subBiomeId,
        layerId: targetLayerId,
        // Instanciamento Flyweight: compartilha referências de imagem, vídeo, chroma key e malha Motion
        customIconPng: internAssetUrl(chosenAsset.dataUrl),
        mediaType: isVideoAsset ? 'video' : 'image',
        videoUrl: isVideoAsset ? internAssetUrl(chosenAsset.videoUrl || chosenAsset.dataUrl) : undefined,
        videoChromaKey: isVideoAsset ? chosenAsset.videoChromaKey : undefined,
        motionLayers: hasMotionLayers ? cloneMotionLayersShared(chosenAsset.motionLayers) : undefined,
        motionAsset: hasMotionLayers,
        pivotX: chosenAsset.pivotX ?? 0.5,
        pivotY: chosenAsset.pivotY ?? 0.5,
        size: finalSize,
        rotation,
        flipX,
        flipY,
        solidCollision: chosenType === 'light' ? false : true,
        hasShadow: true,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        npcBounce: isJelly ? true : undefined,
        effect: cfg.neutralEffect && cfg.neutralEffect !== 'none' ? cfg.neutralEffect : (isJelly ? 'jelly' : 'none'),
        effectSpeed: cfg.effectSpeed || 1.0,
        effectIntensity: cfg.effectIntensity || 1.0,
        npcPatrol: npcPatrolConfig,
      };
    }

    const nextMarkers = [...(projectMarkersRef.current || []), newMarker];
    projectMarkersRef.current = nextMarkers;
    pendingMarkerPenMarkersRef.current.push(newMarker);
    setLiveStrokeMarkers([...pendingMarkerPenMarkersRef.current]);
  };

  // Busca se há um overlay de efeito clicado na posição do mouse
  const findOverlayAtPos = (pos: { x: number; y: number }) => {
    const overlays = project.motionOverlays || [];
    for (let i = overlays.length - 1; i >= 0; i--) {
      const ov = overlays[i];
      if (ov.visible === false) continue;
      const scale = ov.scale || 1.0;
      const hitRadius = Math.max(16, (ov.brushSize * scale) / 2 + 10);
      for (const pt of ov.points) {
        if (Math.hypot(pos.x - pt.x, pos.y - pt.y) <= hitRadius) {
          return ov;
        }
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // 1. Pan RESTRITO exclusivamente ao Botão do Meio do Mouse (e.button === 1)
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      return;
    }

    // Ferramenta Marcador: clique posiciona, arrasto de marcador move o marcador
    if (activeTool === 'add_marker') return;

    // Effect Pen: seleciona, inicia arrasto de overlay ou desenha novo efeito vivo
    if (activeTool === 'effect_pen' && e.button === 0) {
      const p = motionPos(e);
      if (!p) return;
      const hit = findOverlayAtPos(p);
      if (hit) {
        onSelectOverlay?.(hit.id);
        draggingOverlayIdRef.current = hit.id;
        dragOverlayStartPosRef.current = p;
        dragOverlayInitialPointsRef.current = JSON.parse(JSON.stringify(hit.points));
        return;
      }
      // Se clicou fora, desseleciona e inicia o novo traço com Effect Pen
      onSelectOverlay?.(null);
      motionCurrentRef.current = [p];
      motionPaintingRef.current = true;
      return;
    }

    // Marker Pen: dispersa marcadores da galeria ou moldes ao clicar e arrastar
    if (activeTool === 'marker_pen' && e.button === 0) {
      const allGallery = project.galleryAssets || [];
      const hasTemplates = (project.markerPenConfig?.selectedTemplateMarkerIds?.length || 0) > 0;
      if (allGallery.length === 0 && !hasTemplates) return;
      onDragStart?.();
      isMarkerPenPaintingRef.current = true;
      lastMarkerPenPosRef.current = null;
      placeMarkerPenAtEvent(e);
      return;
    }
    // Pen Terrain: dispersa tufos de grama viva ou inicia traçado contínuo de água/terreno
    if (activeTool === 'terrain_pen' && e.button === 0) {
      onDragStart?.();
      isTerrainPenPaintingRef.current = true;
      lastTerrainPenPosRef.current = null;
      const cfg = project.terrainPenConfig || DEFAULT_TERRAIN_PEN_CONFIG;
      const p = getMapCoords(e.clientX, e.clientY);
      if (p) {
        const rawX = p.x;
        const rawY = p.y;
        if (cfg.mode === 'water' || cfg.mode === 'noise') {
          terrainStrokePointsRef.current = [{ x: rawX, y: rawY }, { x: rawX + 0.1, y: rawY + 0.1 }];
        } else if (cfg.mode === 'eraser') {
          eraseTerrainAtPos(rawX, rawY, cfg.brushRadius || 48);
        } else {
          placeTerrainPenAtEvent(e);
        }
      }
      return;
    }
    // Pincel de Carimbo: inicia o carimbo imediatamente e continua ao arrastar
    if (activeTool === 'stamp_brush' && e.button === 0) {
      const cfg = project.stampBrushConfig;
      const png = cfg?.pngUrl || cfg?.savedPresets?.[0]?.dataUrl;
      if (!png) return;
      onDragStart?.();
      isStampingRef.current = true;
      lastStampPosRef.current = null;
      placeStampAtEvent(e);
      return;
    }
    // Motion Pen: inicia o traço livre (NUNCA pinta limites junto).
    if (activeTool === 'motion_pen' && e.button === 0) {
      const p = motionPos(e);
      if (!p) return;
      motionCurrentRef.current = [p];
      motionPaintingRef.current = true;
      redrawMotionPreview();
      return;
    }
    const tab = activeTab || 'editor';
    // Pincel de Limites / Circulação: apenas na aba limits
    if (tab === 'limits' && e.button === 0) {
      onDragStart?.();
      setIsPaintingLimits(true);
      paintCellAtEvent(e);
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // 0. Pan via Botão do Meio do Mouse
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.mouseX;
      const dy = e.clientY - panStartRef.current.mouseY;
      setPan({
        x: Math.round(panStartRef.current.panX + dx),
        y: Math.round(panStartRef.current.panY + dy),
      });
      return;
    }

    // 0.5. Arraste de Marcador em 60fps local (commit único ao soltar o clique para zero travamento)
    if (draggingMarkerId) {
      const p = getMapCoords(e.clientX, e.clientY);
      if (p) {
        const rawX = p.x;
        const rawY = p.y;
        const dragged = project.markers.find((m) => m.id === draggingMarkerId);
        let nextX = Math.round(rawX);
        let nextY = Math.round(rawY);
        if (isExtended) {
          let sbId = dragged?.subBiomeId;
          if (!sbId) {
            const hit = subBiomeAtCanvasX(rawX);
            if (hit) sbId = hit.sb.id;
          }
          if (sbId) {
            const originX = subBiomeOriginX(sbId) ?? 0;
            const sb = subBiomes.find((s) => s.id === sbId);
            const w = sb?.tileWidth || 400;
            const h = sb?.tileHeight || 400;
            nextX = Math.round(Math.max(16, Math.min(w - 16, rawX - originX)));
            nextY = Math.round(Math.max(16, Math.min(h - 16, rawY)));
          }
        } else {
          nextX = Math.round(Math.max(16, Math.min(totalMapWidth - 16, rawX)));
          nextY = Math.round(Math.max(16, Math.min(totalMapHeight - 16, rawY)));
        }
        const nextPos = { id: draggingMarkerId, x: nextX, y: nextY };
        draggedMarkerLocalPosRef.current = nextPos;
        setDraggedMarkerLocalPos(nextPos);
      }
      return;
    }

    // 1. Arraste de Objeto de Efeito Interativo (Effect Overlay Drag & Drop)
    if (draggingOverlayIdRef.current && dragOverlayStartPosRef.current) {
      const p = motionPos(e);
      if (p) {
        const dx = p.x - dragOverlayStartPosRef.current.x;
        const dy = p.y - dragOverlayStartPosRef.current.y;
        const targetId = draggingOverlayIdRef.current;
        const newPoints = dragOverlayInitialPointsRef.current.map((pt) => ({
          x: Math.round(pt.x + dx),
          y: Math.round(pt.y + dy),
        }));
        onUpdateOverlay?.(targetId, { points: newPoints });
      }
      return;
    }

    // Effect Pen: atualiza hover do cursor e traçado ao vivo
    if (activeTool === 'effect_pen') {
      motionHoverPosRef.current = motionPos(e);
      if (motionPaintingRef.current) {
        const p = motionPos(e);
        if (p) {
          const cur = motionCurrentRef.current || [];
          const last = cur[cur.length - 1];
          if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1.5) {
            cur.push(p);
            motionCurrentRef.current = cur;
          }
        }
      }
      return;
    }

    if (activeTool === 'add_marker') {
      setIsPaintingLimits(false);
      return;
    }
    // Marker Pen: atualiza hover do cursor e aplica marcadores em arraste contínuo
    if (activeTool === 'marker_pen') {
      const p = getMapCoords(e.clientX, e.clientY);
      updateHoverThrottled('marker_pen', p);
      if (isMarkerPenPaintingRef.current) {
        placeMarkerPenAtEvent(e);
      }
      return;
    }
    // Pen Terrain: atualiza hover do cursor e aplica tufos de grama em arraste contínuo
    if (activeTool === 'terrain_pen') {
      const p = getMapCoords(e.clientX, e.clientY);
      updateHoverThrottled('terrain_pen', p);

      if (p && isTerrainPenPaintingRef.current) {
        const rawX = p.x;
        const rawY = p.y;
        const cfg = project.terrainPenConfig || DEFAULT_TERRAIN_PEN_CONFIG;
        if (cfg.mode === 'water' || cfg.mode === 'noise') {
          const pts = terrainStrokePointsRef.current || [];
          const last = pts[pts.length - 1];
          if (!last || Math.hypot(rawX - last.x, rawY - last.y) >= 4) {
            pts.push({ x: rawX, y: rawY });
            terrainStrokePointsRef.current = pts;
          }
        } else if (cfg.mode === 'eraser') {
          eraseTerrainAtPos(rawX, rawY, cfg.brushRadius || 48);
        } else {
          placeTerrainPenAtEvent(e);
        }
      }
      return;
    }
    // Pincel de Carimbo: atualiza hover do cursor e aplica carimbos em arraste contínuo
    if (activeTool === 'stamp_brush') {
      const p = getMapCoords(e.clientX, e.clientY);
      updateHoverThrottled('stamp_brush', p);
      if (isStampingRef.current) {
        placeStampAtEvent(e);
      }
      return;
    }
    // Motion Pen: continua o traço livre ou atualiza o cursor hover (sem limites junto).
    if (activeTool === 'motion_pen') {
      motionHoverPosRef.current = motionPos(e);
      if (motionPaintingRef.current) {
        const p = motionPos(e);
        if (p) {
          const cur = motionCurrentRef.current || [];
          const last = cur[cur.length - 1];
          if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1.5) {
            cur.push(p);
            motionCurrentRef.current = cur;
          }
        }
      }
      redrawMotionPreview();
      return;
    }
    const tab = activeTab || 'editor';
    if (tab === 'limits') {
      const p = getMapCoords(e.clientX, e.clientY);
      updateHoverThrottled('limits', p);
      if (isPaintingLimits) {
        paintCellAtEvent(e);
        return;
      }
    } else if (limitsHover) {
      setLimitsHover(null);
    }

    if (isPaintingLimits) {
      if (isExtended) {
        if (tab !== 'extended' && tab !== 'editor') {
          setIsPaintingLimits(false);
          return;
        }
        paintCellAtEvent(e);
        return;
      }
      if (tab === 'editor') {
        paintCellAtEvent(e);
        return;
      }
      setIsPaintingLimits(false);
    }
  };

  const handleMouseUp = () => {
    // Commit imediato de marcador arrastado
    if (draggedMarkerLocalPosRef.current) {
      const pending = draggedMarkerLocalPosRef.current;
      draggedMarkerLocalPosRef.current = null;
      setDraggedMarkerLocalPos(null);
      onUpdateMarkerPos(pending.id, pending.x, pending.y);
    }

    // Finaliza arrasto de overlay de efeito
    if (draggingOverlayIdRef.current) {
      draggingOverlayIdRef.current = null;
      dragOverlayStartPosRef.current = null;
      dragOverlayInitialPointsRef.current = [];
    }

    if (isMarkerPenPaintingRef.current) {
      isMarkerPenPaintingRef.current = false;
      lastMarkerPenPosRef.current = null;
      if (pendingMarkerPenMarkersRef.current.length > 0) {
        pendingMarkerPenMarkersRef.current = [];
        setLiveStrokeMarkers([]);
        const nextList = [...(projectMarkersRef.current || [])];
        onUpdateProject?.({ markers: nextList });
      }
    }
    if (isTerrainPenPaintingRef.current) {
      isTerrainPenPaintingRef.current = false;
      lastTerrainPenPosRef.current = null;

      // Se pintou área contínua de Água ou Terreno (Noise):
      if (terrainStrokePointsRef.current && terrainStrokePointsRef.current.length > 0) {
        const pts = [...terrainStrokePointsRef.current];
        terrainStrokePointsRef.current = null;
        const cfg = project.terrainPenConfig || DEFAULT_TERRAIN_PEN_CONFIG;
        const isWater = cfg.mode === 'water';
        const isTerrain = cfg.mode === 'noise';
        if (isWater || isTerrain) {
          const newOverlay: MotionOverlayStroke = {
            id: `terrain-overlay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: isWater ? `Água Contínua` : `Terreno ${cfg.noiseTone || 'Musgo'}`,
            effect: isWater ? 'water' : 'terrain',
            brushSize: Math.max(16, (cfg.brushRadius || 42) * 2),
            scale: 1.0,
            speed: isWater ? (cfg.waterFlowSpeed ?? 1.0) : (cfg.effectSpeed || 1.0),
            intensity: isWater ? (cfg.waterOpacity ?? 1.0) : (cfg.groundPaintOpacity ?? 0.85),
            points: pts,
            color: isWater ? (cfg.waterColor || '#0284c7') : (cfg.groundPaintColor || '#16a34a'),
            waterTexturePng: isWater ? cfg.waterTexturePng : undefined,
            textureScale: isWater ? (cfg.waterTextureScale ?? 1.0) : undefined,
            flowSpeed: isWater ? (cfg.waterFlowSpeed ?? 1.0) : undefined,
            flowAngle: isWater ? (cfg.waterFlowAngle ?? 45) : undefined,
            textureOpacity: isWater ? (cfg.waterTextureOpacity ?? 0.85) : undefined,
            waterWaveEcho: isWater ? (cfg.waterWaveEcho ?? true) : undefined,
            waterWaveDeform: isWater ? (cfg.waterWaveDeform ?? 0.25) : undefined,
            visible: true,
            createdAt: Date.now(),
          };
          onUpdateProject?.({
            motionOverlays: [...(project.motionOverlays || []), newOverlay],
          });
        }
      }

      if (pendingTerrainPenMarkersRef.current.length > 0) {
        pendingTerrainPenMarkersRef.current = [];
        const nextList = [...(projectMarkersRef.current || [])];
        const currentLayers = project.markerLayers && project.markerLayers.length > 0
          ? project.markerLayers
          : [{ id: 'layer-default', name: 'Camada Padrão', visible: true, locked: false, order: 0, color: '#3b82f6' }];
        const hasNatureLayer = currentLayers.some((l) => l.id === NATURE_LAYER_ID);
        const nextLayers = hasNatureLayer
          ? undefined
          : [
              ...currentLayers,
              {
                id: NATURE_LAYER_ID,
                name: '🌿 Natureza (Terrain Pen)',
                visible: true,
                locked: false,
                order: currentLayers.length,
                color: '#10b981',
              },
            ];
        onUpdateProject?.({
          markers: nextList,
          ...(nextLayers ? { markerLayers: nextLayers } : {}),
        });
      }
    }
    if (isStampingRef.current) {
      isStampingRef.current = false;
      lastStampPosRef.current = null;
      if (pendingStampsRef.current.length > 0) {
        pendingStampsRef.current = [];
        const nextList = [...(projectStampsRef.current || [])];
        onUpdateProject?.({ groundStamps: nextList });
      }
    }

    // Effect Pen: finaliza o novo traçado e registra a sobreposição no projeto
    if (activeTool === 'effect_pen' && motionPaintingRef.current) {
      motionPaintingRef.current = false;
      const cur = motionCurrentRef.current;
      motionCurrentRef.current = null;

      if (cur && cur.length > 0) {
        const newOverlay: import('../types/map').MotionOverlayStroke = {
          id: `effect-overlay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: `Efeito ${effectType}`,
          effect: effectType,
          brushSize: effectBrushSize,
          scale: effectScale,
          speed: effectSpeed,
          intensity: effectIntensity,
          points: cur,
          visible: true,
          createdAt: Date.now(),
        };
        onUpdateProject?.({
          motionOverlays: [...(project.motionOverlays || []), newOverlay],
        });
        onSelectOverlay?.(newOverlay.id);
      }
      clearMotion();
      setIsPaintingLimits(false);
      setIsPanning(false);
      setDraggingMarkerId(null);
      return;
    }

    // Motion Pen: solta o traço e extrai o recorte
    if (motionPaintingRef.current) {
      motionPaintingRef.current = false;
      const cur = motionCurrentRef.current;
      motionCurrentRef.current = null;

      if (isVfxOverlayEffect(motionEffect)) {
        if (cur && cur.length > 0) {
          const newOverlay: import('../types/map').MotionOverlayStroke = {
            id: `motion-overlay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: `Efeito ${motionEffect}`,
            effect: motionEffect,
            brushSize: motionBrushSize,
            scale: 1.0,
            speed: motionSpeed,
            intensity: motionIntensity,
            points: cur,
            visible: true,
            createdAt: Date.now(),
          };
          onUpdateProject?.({
            motionOverlays: [...(project.motionOverlays || []), newOverlay],
          });
          onSelectOverlay?.(newOverlay.id);
        }
        clearMotion();
      } else {
        // Modo Gelatina Padrão e Modos de Malha (Água, Vento, Fogo, Vórtice, etc.):
        // Extraem o recorte da área do mapa!
        if (cur && cur.length > 0) {
          motionStrokesRef.current = [...motionStrokesRef.current, cur];
          redrawMotionPreview();
        }
        if (motionAuto) extractMotion();
      }

      setIsPaintingLimits(false);
      setIsPanning(false);
      setDraggingMarkerId(null);
      return;
    }
    setIsPaintingLimits(false);
    setIsPanning(false);
    setDraggingMarkerId(null);
  };

  const renderMarkerIcon = (type: MarkerType) => {
    switch (type) {
      case 'port':
        return <Anchor className="w-4 h-4 text-white" />;
      case 'town':
        return <Landmark className="w-4 h-4 text-white" />;
      case 'castle':
        return <Castle className="w-4 h-4 text-white" />;
      case 'boss':
        return <Skull className="w-4 h-4 text-white" />;
      case 'treasure':
        return <Gem className="w-4 h-4 text-white" />;
      case 'shrine':
        return <Sparkles className="w-4 h-4 text-white" />;
      case 'oasis':
        return <Compass className="w-4 h-4 text-white" />;
      case 'cave':
      case 'tower':
        return <Mountain className="w-4 h-4 text-white" />;
      case 'event':
        return <Zap className="w-4 h-4 text-white" />;
      case 'npc':
        return <User className="w-4 h-4 text-white" />;
      default:
        return <Tent className="w-4 h-4 text-white" />;
    }
  };

  const markerLookup = new Map<string, MapMarker>(project.markers.map((m) => [m.id, m]));
  const stampLayerLookup = new Map((project.stampLayers || []).map((l) => [l.id, l]));
  const effectiveMarkerLayers =
    project.markerLayers && project.markerLayers.length > 0
      ? project.markerLayers
      : [{ id: 'layer-default', name: 'Camada Padrão', visible: true, locked: false, order: 0 }];
  const markerLayerLookup = new Map(effectiveMarkerLayers.map((l) => [l.id, l]));

  // Viewport bounds para descarte de nós DOM fora da tela (Viewport Culling)
  // Considera o offset de centralização do mapFrame dentro do container
  const containerW = containerRef.current ? containerRef.current.clientWidth : 1400;
  const containerH = containerRef.current ? containerRef.current.clientHeight : 900;
  const frameOffsetX = Math.max(0, (containerW - canvasW * zoom) / 2);
  const frameOffsetY = isExtended ? Math.max(0, (containerH - canvasH * zoom) / 2) : 24;
  const cullPad = 500;
  const cullMinX = (-pan.x - frameOffsetX - cullPad) / zoom;
  const cullMaxX = (-pan.x - frameOffsetX + containerW + cullPad) / zoom;
  const cullMinY = (-pan.y - frameOffsetY - cullPad) / zoom;
  const cullMaxY = (-pan.y - frameOffsetY + containerH + cullPad) / zoom;

  // Bounds de culling em ref para não recriar o loop a cada frame de renderização
  const cullBoundsRef = useRef({ minX: cullMinX, maxX: cullMaxX, minY: cullMinY, maxY: cullMaxY });
  useEffect(() => {
    cullBoundsRef.current = { minX: cullMinX, maxX: cullMaxX, minY: cullMinY, maxY: cullMaxY };
  }, [cullMinX, cullMaxX, cullMinY, cullMaxY]);

  // Renderiza Carimbos de Chão (GroundStamps) diretamente como pixels num único Canvas (0 nós DOM e 0 máscaras CSS)
  const renderStampsCanvas = useCallback(() => {
    if (isStampingRef.current) return;
    const stCanvas = groundStampsCanvasRef.current;
    if (!stCanvas) return;
    renderGroundStampsPixelCanvas(
      stCanvas,
      project.groundStamps || [],
      project.stampLayers || [],
      canvasW,
      canvasH,
      zoom,
      () => renderStampsCanvas()
    );
  }, [project.groundStamps, project.stampLayers, canvasW, canvasH, zoom]);

  useEffect(() => {
    renderStampsCanvas();
  }, [renderStampsCanvas]);

  // Instâncias de vegetação (Grama e Flores) clonadas a partir do 1º Tufo Mestre em Canvas único (0 nós DOM)
  const vegetationInstances = useMemo(() => {
    const raw = (project.markers || []).filter(
      (m) =>
        (isExtended ? Boolean(m.subBiomeId) : !m.subBiomeId) &&
        (m.id.startsWith('terrain-grass-') || m.id.startsWith('terrain-flower-'))
    );
    // Ordena por Y da raiz para manter sobreposição natural de profundidade
    return [...raw].sort((a, b) => a.y - b.y);
  }, [project.markers, isExtended]);

  useEffect(() => {
    const vegCanvas = vegetationCanvasRef.current;
    if (!vegCanvas) return;
    if (vegetationInstances.length === 0) {
      if (vegCanvas.width !== 1 || vegCanvas.height !== 1) {
        vegCanvas.width = 1;
        vegCanvas.height = 1;
      }
      return;
    }

    let animId: number;
    const getOriginX = (sbId?: string) => (isExtended && sbId ? (subBiomeOriginX(sbId) ?? 0) : 0);
    const isLayerVis = (lId?: string) => {
      const ml = markerLayerLookup.get(lId || '') || effectiveMarkerLayers[0];
      const pg = ml?.groupId ? markerLayerLookup.get(ml.groupId) : null;
      return !ml || (ml.visible !== false && (!pg || pg.visible !== false));
    };

    const tick = (now: number) => {
      renderInstancedVegetationCanvas(
        vegCanvas,
        vegetationInstances,
        canvasW,
        canvasH,
        zoom,
        now * 0.001,
        cullBoundsRef.current,
        getOriginX,
        isLayerVis,
        null
      );
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [vegetationInstances, canvasW, canvasH, zoom, isExtended, project.subBiomes, project.markerLayers]);

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => {
        if (e.button === 1 || isSpacePressed) e.preventDefault();
        handleMouseDown(e);
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (!isPanning) {
          handleMouseUp();
        }
        setLimitsHover(null);
        setMarkerPenHover(null);
        setStampHover(null);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFileOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingFileOver(false);
        }
      }}
      onDrop={async (e) => {
        e.preventDefault();
        setIsDraggingFileOver(false);

        // 1. Processa marcador arrastado da galeria de marcadores
        const markerDataStr = e.dataTransfer.getData('application/json');
        if (markerDataStr) {
          try {
            const data = JSON.parse(markerDataStr);
            if (data && data.type === 'marker_asset' && onDropMarkerAsset) {
              const p = getMapCoords(e.clientX, e.clientY);
              if (p) {
                onDropMarkerAsset(data.asset, { rawX: p.x, rawY: p.y });
                return;
              }
            }
          } catch (err) {
            console.warn('Erro ao processar drop de marcador:', err);
          }
        }

        // 2. Processa arquivo de imagem PNG solto
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/') && onDropPNG) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              onDropPNG(reader.result, file.name);
            }
          };
          reader.readAsDataURL(file);
        }
      }}
      className={`relative w-full h-full overflow-hidden bg-black select-none ${
        isPanning
          ? 'cursor-grabbing'
          : activeTab === 'limits'
          ? 'cursor-crosshair'
          : (activeTool === 'add_marker' || activeTool === 'marker_pen' || activeTool === 'effect_pen' || activeTool === 'motion_pen' || activeTool === 'stamp_brush')
          ? 'cursor-crosshair'
          : 'cursor-default'
      }`}
    >
      {/* File Drop Overlay */}
      {isDraggingFileOver && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-sm border-4 border-dashed border-amber-400 flex flex-col items-center justify-center pointer-events-none">
          <div className="p-6 bg-slate-900 border border-amber-500/50 rounded-2xl shadow-2xl flex flex-col items-center gap-3">
            <p className="text-base font-bold text-amber-300">
              Solte a imagem PNG aqui
            </p>
            <p className="text-xs text-slate-400">
              O bioma será adicionado com o tamanho original da PNG!
            </p>
          </div>
        </div>
      )}

      {/* Empty State when no content exists */}
      {!hasContent && (
        <div className="flex flex-col items-center justify-center min-h-[460px] p-8 text-center m-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {isExtended ? 'Nenhum Bioma Extended carregado' : 'Nenhum bioma carregado'}
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mb-5 leading-relaxed">
            {isExtended
              ? 'Crie seu canvas de fase com tamanho personalizado ou importe imagens PNG para começar a construir.'
              : 'Crie seu canvas com resolução e formato personalizados, ou importe imagens PNG.'}
          </p>
          <div className="flex items-center gap-3">
            {onTriggerCreatePhaseModal && (
              <button
                onClick={onTriggerCreatePhaseModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Canvas Personalizado</span>
              </button>
            )}
            {onTriggerImportPNG && (
              <button
                onClick={onTriggerImportPNG}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Importar imagem PNG</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Map Frame (or Extended Biomes Frame) */}
      {hasContent && (
        <div
          className="relative w-full h-full min-w-full min-h-full flex items-start justify-center transition-none pointer-events-auto"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
            transformOrigin: 'top center',
            willChange: isPanning ? 'transform' : 'auto',
          }}
        >
          <div
            ref={mapFrameRef}
            className={`relative shadow-2xl origin-top border border-zinc-800 rounded-lg bg-zinc-950 shrink-0 ${
              isExtended ? 'm-auto' : 'mx-auto my-6'
            }`}
            style={{
              width: canvasW * zoom,
              height: canvasH * zoom,
            }}
            onClick={handleMapClick}
          >
          {/* Extended Biomes Background Layer — Renderizado via DOM <img> 100% acelerado pela GPU (suporta 10000x10000 sem alocar 400MB de Canvas) */}
          {isExtended && (
            <div className="absolute inset-0 pointer-events-none select-none">
              {subBiomes.map((sb, idx) => {
                const origX = subBiomeOriginX(sb.id) ?? 0;
                const sbW = sb.tileWidth || 400;
                const sbH = sb.tileHeight || 400;
                const sbCells = sb.walkableCells || [];
                const sbBlocked = sb.blockedCells || [];

                return (
                  <div
                    key={sb.id}
                    className="absolute border border-purple-500/50 rounded overflow-hidden"
                    style={{
                      left: origX * zoom,
                      top: 0,
                      width: sbW * zoom,
                      height: sbH * zoom,
                      backgroundColor: sb.baseColor || '#020617',
                    }}
                  >
                    {sb.tilePng && (
                      <img
                        src={sb.tilePng}
                        alt={sb.name}
                        className="w-full h-full object-fill pointer-events-none select-none"
                        style={{
                          imageRendering: 'auto',
                        }}
                        loading="lazy"
                      />
                    )}

                    {/* SVG de Células de Circulação (Verde) e Bloqueio (Vermelho) — Vector GPU leve */}
                    {(sbCells.length > 0 || sbBlocked.length > 0) && (
                      <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                        {sbCells.map((key) => {
                          const [c, r] = key.split(',').map(Number);
                          if (Number.isNaN(c) || Number.isNaN(r)) return null;
                          return (
                            <rect
                              key={`w-${key}`}
                              x={c * COLLISION_CELL * zoom}
                              y={r * COLLISION_CELL * zoom}
                              width={COLLISION_CELL * zoom}
                              height={COLLISION_CELL * zoom}
                              fill="rgba(16, 185, 129, 0.35)"
                              stroke="rgba(52, 211, 153, 0.8)"
                              strokeWidth={1}
                            />
                          );
                        })}
                        {sbBlocked.map((key) => {
                          const [c, r] = key.split(',').map(Number);
                          if (Number.isNaN(c) || Number.isNaN(r)) return null;
                          return (
                            <rect
                              key={`b-${key}`}
                              x={c * COLLISION_CELL * zoom}
                              y={r * COLLISION_CELL * zoom}
                              width={COLLISION_CELL * zoom}
                              height={COLLISION_CELL * zoom}
                              fill="rgba(239, 68, 68, 0.45)"
                              stroke="rgba(248, 113, 113, 0.9)"
                              strokeWidth={1}
                            />
                          );
                        })}
                      </svg>
                    )}

                    {/* Header Badge do Sub-bioma */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-slate-950/85 border border-purple-500/60 text-purple-200 text-xs font-bold pointer-events-none select-none shadow">
                      {sb.name || `Extended Biome ${idx + 1}`} ({sbW}×{sbH}px)
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Native Canvas: no vertical biomas desenha os spans. No extended fica 1x1 em buffer para 0MB de VRAM, mantendo getBoundingClientRect() para cliques e mouse */}
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 block pointer-events-none ${isExtended ? 'opacity-0' : ''}`}
            style={{
              width: canvasW * zoom,
              height: canvasH * zoom,
              transform: 'translate3d(0, 0, 0)',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
            }}
          />

          {/* Overlay do Motion Pen / Water / Overlays — Renderizado diretamente em tamanho total sem corte */}
          <canvas
            ref={motionOverlayRef}
            className="absolute inset-0 block pointer-events-none z-20"
            style={{
              width: canvasW * zoom,
              height: canvasH * zoom,
              transform: 'translate3d(0, 0, 0)',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
            }}
          />

          {/* Camada de Chão: Carimbos (Ground Stamps) em Pixels Nativos (Zero nós DOM / Zero CSS Masks) */}
          <canvas
            ref={groundStampsCanvasRef}
            className="absolute inset-0 block pointer-events-none z-10"
            style={{
              width: canvasW * zoom,
              height: canvasH * zoom,
              transform: 'translate3d(0, 0, 0)',
              backfaceVisibility: 'hidden',
            }}
          />

          {/* Cursor Preview do Pincel de Carimbo com raio e desfoque suave */}
          {activeTool === 'stamp_brush' && stampHover && (
            <div
              className="absolute rounded-full border-2 border-dashed border-amber-400/90 bg-amber-400/15 pointer-events-none z-20 transition-none"
              style={{
                left: stampHover.x * zoom,
                top: stampHover.y * zoom,
                width: (project.stampBrushConfig?.size || 52) * zoom,
                height: (project.stampBrushConfig?.size || 52) * zoom,
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 ${Math.max(4, (project.stampBrushConfig?.feather || 14) * zoom)}px rgba(245, 158, 11, 0.45)`,
              }}
            >
              <div className="absolute inset-0 rounded-full border border-amber-300/40" />
            </div>
          )}

          {/* Cursor Preview do Marker Pen com raio e indicador visual do que será traçado */}
          {activeTool === 'marker_pen' && markerPenHover && (() => {
            const penCfg = project.markerPenConfig;
            const penSize = (penCfg?.size || 150) * zoom;
            const tplIds = penCfg?.selectedTemplateMarkerIds || [];
            const selIds = penCfg?.selectedAssetIds || [];
            const activeTemplate = tplIds.length > 0
              ? (project.markers || []).find((m) => tplIds.includes(m.id))
              : undefined;
            const activeAsset = selIds.length > 0
              ? (project.galleryAssets || []).find((a) => selIds.includes(a.id))
              : (project.galleryAssets || [])[0];
            const previewImgUrl = activeTemplate?.customIconPng || activeAsset?.dataUrl;

            return (
              <div
                className="absolute rounded-2xl border-2 border-dashed border-sky-400/90 bg-sky-500/15 pointer-events-none z-30 transition-none flex items-center justify-center shadow-lg overflow-hidden backdrop-blur-[1px]"
                style={{
                  left: markerPenHover.x * zoom,
                  top: markerPenHover.y * zoom,
                  width: penSize,
                  height: penSize,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {previewImgUrl ? (
                  <img
                    src={getRenderableAssetUrl(previewImgUrl)}
                    alt=""
                    className="w-full h-full object-contain opacity-50 select-none pointer-events-none drop-shadow-md"
                  />
                ) : (
                  <span className="text-xs select-none pointer-events-none opacity-80">✏️</span>
                )}
                {/* Indicador de Mira Central */}
                <div className="absolute w-2 h-2 rounded-full bg-sky-400 border border-slate-950 pointer-events-none shadow-xs" />
              </div>
            );
          })()}

          {/* Cursor Preview do Pen Terrain com raio de dispersão de grama / água / flor / solo / borracha */}
          {activeTool === 'terrain_pen' && terrainPenHover && (
            <div
              className={`absolute rounded-full border-2 border-dashed pointer-events-none z-20 transition-none flex items-center justify-center shadow-lg ${
                project.terrainPenConfig?.mode === 'eraser'
                  ? 'border-rose-400 bg-rose-500/20 shadow-rose-500/30'
                  : project.terrainPenConfig?.mode === 'water'
                  ? 'border-cyan-400 bg-cyan-500/20 shadow-cyan-500/30'
                  : project.terrainPenConfig?.mode === 'flowers'
                  ? 'border-pink-400 bg-pink-500/20 shadow-pink-500/30'
                  : project.terrainPenConfig?.mode === 'noise'
                  ? 'border-amber-400 bg-amber-500/20 shadow-amber-500/30'
                  : 'border-emerald-400 bg-emerald-500/20 shadow-emerald-500/30'
              }`}
              style={{
                left: terrainPenHover.x * zoom,
                top: terrainPenHover.y * zoom,
                width: Math.max(20, (project.terrainPenConfig?.brushRadius || 42) * 2) * zoom,
                height: Math.max(20, (project.terrainPenConfig?.brushRadius || 42) * 2) * zoom,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <span className="text-[10px] select-none pointer-events-none opacity-80">
                {project.terrainPenConfig?.mode === 'eraser'
                  ? '🧹'
                  : project.terrainPenConfig?.mode === 'water'
                  ? '🌊'
                  : project.terrainPenConfig?.mode === 'flowers'
                  ? '🌸'
                  : project.terrainPenConfig?.mode === 'noise'
                  ? '🎨'
                  : '🌱'}
              </span>
            </div>
          )}

          {/* Cursor Preview do Pincel de Limites (Circulação / Colisão / Borracha) */}
          {activeTab === 'limits' && limitsHover && (
            <div
              className={`absolute pointer-events-none z-30 transition-none flex items-center justify-center border-2 border-dashed ${
                limitsBrushMode === 'paint'
                  ? 'border-emerald-400 bg-emerald-500/25 shadow-[0_0_12px_rgba(52,211,153,0.6)]'
                  : limitsBrushMode === 'block'
                  ? 'border-rose-400 bg-rose-500/30 shadow-[0_0_14px_rgba(244,63,94,0.7)]'
                  : 'border-amber-400 bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
              }`}
              style={{
                left: limitsHover.x * zoom,
                top: limitsHover.y * zoom,
                width: limitsBrushSize * COLLISION_CELL * zoom,
                height: limitsBrushSize * COLLISION_CELL * zoom,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  limitsBrushMode === 'paint'
                    ? 'bg-emerald-400'
                    : limitsBrushMode === 'block'
                    ? 'bg-rose-500'
                    : 'bg-amber-400'
                }`}
              />
            </div>
          )}

          {/* Biome label pips (only if not extended) */}
          {!isExtended && spans.map((span) => (
            <div
              key={span.biome.id}
              className="absolute left-3 z-10 pointer-events-none flex items-center gap-2"
              style={{
                top: span.startY * zoom + 12 * zoom,
              }}
            >
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded backdrop-blur-md border border-white/10 bg-slate-950/80 text-slate-100 shadow-md"
              >
                {span.biome.name} · {span.biome.tileRepeatCount}x ({span.biome.tileWidth}×{span.biome.tileHeight}px)
              </span>
            </div>
          ))}

          {/* 1. Camada de Natureza Instanciada (Grama e Flores clonadas do 1º Tufo Mestre em Canvas Único — Zero nós DOM) */}
          <canvas
            ref={vegetationCanvasRef}
            className="absolute inset-0 block pointer-events-none select-none z-[12]"
            style={{
              width: canvasW * zoom,
              height: canvasH * zoom,
              transform: 'translate3d(0, 0, 0)',
              backfaceVisibility: 'hidden',
            }}
          />

          {/* SVG Overlay for Routes */}
          {/* Marcadores da FASE VISÍVEL: vertical mostra os do mapa; Extended mostra os de cada sub-bioma */}
          <div className="absolute inset-0 pointer-events-none z-30">
            {/* 2. Marcadores Interativos da Fase (Grama é decalque instanciado na camada de terreno acima) */}
            {(liveStrokeMarkers.length > 0 ? [...project.markers, ...liveStrokeMarkers] : project.markers)
              .filter((marker) => (isExtended ? Boolean(marker.subBiomeId) : !marker.subBiomeId))
              .filter((marker) => {
                const isTerrainDecal = marker.id.startsWith('terrain-grass-') || marker.id.startsWith('terrain-flower-');
                return !isTerrainDecal;
              })
              .filter((marker) => {
                if (marker.id === selectedMarkerId || marker.id === draggingMarkerId) return true;
                const originX = isExtended && marker.subBiomeId ? (subBiomeOriginX(marker.subBiomeId) ?? 0) : 0;
                const mx = originX + marker.x;
                const my = marker.y;
                const r = marker.size || 150;
                return (
                  mx + r >= cullMinX &&
                  mx - r <= cullMaxX &&
                  my + r >= cullMinY &&
                  my - r <= cullMaxY
                );
              })
              .map((marker) => {
              const markerLayer = markerLayerLookup.get(marker.layerId || '') || effectiveMarkerLayers[0];
              const parentGroup = markerLayer?.groupId ? markerLayerLookup.get(markerLayer.groupId) : null;
              if (markerLayer && (!markerLayer.visible || (parentGroup && parentGroup.visible === false))) return null;
              const isLayerLocked = !!markerLayer?.locked || !!parentGroup?.locked;
              const layerOrder = markerLayer ? markerLayer.order : 0;

              const isSelected = marker.id === selectedMarkerId;
              const isHovered = marker.id === hoveredMarkerId;
              const isStation = marker.type === 'interactive_screen';
              const stationScale = isStation ? (marker.stationConfig?.baseAssetScale ?? 1.0) : 1.0;
              const markerPixelSize = (marker.size || 150) * zoom;
              const effectiveMarkerPixelSize = isStation ? Math.max(18, Math.round(markerPixelSize * stationScale)) : markerPixelSize;
              const markerRotation = marker.rotation || 0;

              // No Extended, x/y do marcador são LOCAIS do sub-bioma: soma a origem dele na fileira.
              const originX = isExtended && marker.subBiomeId ? (subBiomeOriginX(marker.subBiomeId) ?? 0) : 0;
              const effectiveX = draggedMarkerLocalPos && draggedMarkerLocalPos.id === marker.id ? draggedMarkerLocalPos.x : marker.x;
              const effectiveY = draggedMarkerLocalPos && draggedMarkerLocalPos.id === marker.id ? draggedMarkerLocalPos.y : marker.y;
              const markerCanvasX = (originX + effectiveX) * zoom;
              const markerCanvasY = effectiveY * zoom;
              const mapCanvasWidth = (isExtended ? canvasW : totalMapWidth) * zoom;
              const mapCanvasHeight = (isExtended ? canvasH : totalMapHeight) * zoom;

              // Balão SEMPRE DENTRO DA CENA: clampeamento horizontal estrito e vertical dinâmico
              const BALLOON_CANVAS_WIDTH = Math.min(240, mapCanvasWidth - 24);
              const CANVAS_PADDING = 12;
              const idealCanvasLeft = markerCanvasX - BALLOON_CANVAS_WIDTH / 2;
              const clampedCanvasLeft = Math.max(
                CANVAS_PADDING,
                Math.min(idealCanvasLeft, mapCanvasWidth - BALLOON_CANVAS_WIDTH - CANVAS_PADDING)
              );
              // Compensação precisa para o pai que possui -translate-x-1/2
              const balloonCanvasOffset = clampedCanvasLeft - markerCanvasX + markerPixelSize / 2;
              const notchCanvasLeft = Math.max(
                16,
                Math.min(markerCanvasX - clampedCanvasLeft, BALLOON_CANVAS_WIDTH - 16)
              );

              // Posição do jogador em coordenadas do canvas
              const playerCanvasY = (project.player?.y || 100) * zoom;
              const isPlayerBelowMarkerCanvas = playerCanvasY >= markerCanvasY;

              // Decisão de Direção do Pop-up (Para Cima vs Para Baixo) garantindo NUNCA Cobrir o Jogador:
              let isCanvasAbove = isPlayerBelowMarkerCanvas;
              if (markerCanvasY < 210) isCanvasAbove = false;
              else if (markerCanvasY > mapCanvasHeight - 230) isCanvasAbove = true;

              return (
                <div
                  key={marker.id}
                  className={`absolute group -translate-x-1/2 -translate-y-1/2 ${
                    isLayerLocked ||
                    activeTab === 'limits' ||
                    activeTool === 'stamp_brush' ||
                    activeTool === 'terrain_pen' ||
                    activeTool === 'marker_pen' ||
                    activeTool === 'effect_pen' ||
                    activeTool === 'motion_pen'
                      ? 'pointer-events-none'
                      : 'pointer-events-auto cursor-pointer'
                  }`}
                  style={{
                    left: markerCanvasX,
                    top: markerCanvasY,
                    width: effectiveMarkerPixelSize,
                    height: effectiveMarkerPixelSize,
                    zIndex: isSelected
                      ? 10000
                      : (marker.markerOff
                          ? (layerOrder * 1000 + 1)
                          : (layerOrder * 1000 + Math.round(markerCanvasY + markerPixelSize * 0.35))),
                  }}
                  onMouseEnter={() => !isLayerLocked && activeTab !== 'limits' && setHoveredMarkerId(marker.id)}
                  onMouseLeave={() => !isLayerLocked && setHoveredMarkerId(null)}
                  onMouseDown={(e) => {
                    if (isLayerLocked || activeTab === 'limits') return;
                    if ((e.target as HTMLElement).closest('.quick-action-balloon')) {
                      e.stopPropagation();
                      return;
                    }
                    // Pan restrito exclusivamente ao clique do meio do mouse (e.button === 1)
                    if (e.button === 1) {
                      e.preventDefault();
                      setIsPanning(true);
                      panStartRef.current = {
                        mouseX: e.clientX,
                        mouseY: e.clientY,
                        panX: pan.x,
                        panY: pan.y,
                      };
                      return;
                    }
                    const canvasRect = canvasRef.current?.getBoundingClientRect() || null;
                    const isHit = isSelected || isPixelOpaqueAtPoint(marker, e.clientX, e.clientY, canvasRect);
                    if (isHit) {
                      e.stopPropagation();
                      if (e.button === 0) {
                        onSelectMarker(marker.id);
                        onDragStart?.();
                        setDraggingMarkerId(marker.id);
                      }
                      return;
                    }

                    // Se clicou na área transparente da PNG, passa para o marcador que estiver atrás!
                    const underneath = findTopmostOpaqueMarker(e.clientX, e.clientY, [marker.id]);
                    if (underneath) {
                      e.stopPropagation();
                      onSelectMarker(underneath.id);
                      if (e.button === 0) {
                        onDragStart?.();
                        setDraggingMarkerId(underneath.id);
                      }
                      return;
                    }
                  }}
                  onClick={(e) => {
                    if (isLayerLocked || activeTab === 'limits') return;
                    if ((e.target as HTMLElement).closest('.quick-action-balloon')) {
                      e.stopPropagation();
                      return;
                    }
                    const canvasRect = canvasRef.current?.getBoundingClientRect() || null;
                    const isHit = isPixelOpaqueAtPoint(marker, e.clientX, e.clientY, canvasRect);
                    if (isHit) {
                      e.stopPropagation();
                      onSelectMarker(marker.id);
                      return;
                    }

                    const underneath = findTopmostOpaqueMarker(e.clientX, e.clientY, [marker.id]);
                    if (underneath) {
                      e.stopPropagation();
                      onSelectMarker(underneath.id);
                      return;
                    }

                    // Clicou no vazio da transparência: desseleciona
                    onSelectMarker(null);
                  }}
                >
                  {/* Gizmos dos Raios de Percepção do Action NPC (Detecção e Área Sensorial) */}
                  {isSelected && marker.type === 'npc' && marker.actionNpc?.enabled && (() => {
                    const dRadius = (marker.actionNpc.detectionRadius || 110) * zoom;
                    const sRadius = (marker.actionNpc.sensoryRadius || 260) * zoom;
                    return (
                      <>
                        {/* Raio Sensorial Maior (Ciano) */}
                        <div
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/40 bg-cyan-500/5 pointer-events-none border-dashed animate-pulse"
                          style={{
                            width: sRadius * 2,
                            height: sRadius * 2,
                          }}
                        >
                          <span className="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-900/90 text-cyan-300 font-mono text-[9px] border border-cyan-400/30 whitespace-nowrap">
                            Sensorial: {marker.actionNpc.sensoryRadius || 260}px
                          </span>
                        </div>

                        {/* Raio Interno de Detecção / Combate (Vermelho/Rosa) */}
                        <div
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-500/60 bg-red-500/10 pointer-events-none"
                          style={{
                            width: dRadius * 2,
                            height: dRadius * 2,
                          }}
                        >
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-900/90 text-red-300 font-mono text-[9px] border border-red-500/40 whitespace-nowrap">
                            Detecção: {marker.actionNpc.detectionRadius || 110}px
                          </span>
                        </div>
                      </>
                    );
                  })()}

                  {/* Halo de Iluminação Dinâmica Aprimorado (3 Camadas + Flicker Orgânico) */}
                  {marker.type === 'light' && (() => {
                    const lColor = marker.lightConfig?.color || '#f59e0b';
                    const lRadius = (marker.lightConfig?.radius || 180) * zoom;
                    const lIntensity = marker.lightConfig?.intensity ?? 0.85;
                    const useThreeLayer = project.lighting?.threeLayerRender !== false;
                    const flickerMode = project.lighting?.flickerStyle || (marker.lightConfig?.flicker !== false ? 'flame' : 'none');
                    const animClass = flickerMode === 'flame'
                      ? 'animate-flame-flicker'
                      : flickerMode === 'pulse'
                      ? 'animate-pulse'
                      : '';
                    const bloomIntensity = project.lighting?.lightBloom ?? 0.75;

                    return (
                      <div
                        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none ${animClass}`}
                        style={{
                          width: lRadius * 2,
                          height: lRadius * 2,
                          transformOrigin: '50% 50%',
                          background: useThreeLayer
                            ? `radial-gradient(circle at center, #ffffff 0%, #fff7ed 12%, ${lColor} 32%, ${lColor}77 55%, ${lColor}1a 75%, transparent 100%)`
                            : `radial-gradient(circle, ${lColor} 0%, ${lColor}33 45%, transparent 70%)`,
                          opacity: lIntensity,
                          mixBlendMode: 'screen',
                          filter: `drop-shadow(0 0 ${(16 * bloomIntensity).toFixed(0)}px ${lColor})`,
                        }}
                      />
                    );
                  })()}
                  {/* Sombrinha do asset com ajuste de blur, silhueta realista e offset X e Y */}
                  {(marker.customIconPng || marker.type === 'npc' || marker.type === 'neutral' || marker.type === 'light' || isStation) && (!marker.motionAsset || marker.hasShadow !== false) && (
                    <GroundShadow
                      url={(marker.mediaType === 'video' || marker.videoUrl) ? null : marker.customIconPng}
                      box={effectiveMarkerPixelSize}
                      offsetX={(marker.shadowOffsetX || 0) * zoom}
                      offsetY={(marker.shadowOffsetY || 0) * zoom}
                      blur={(marker.shadowBlur ?? 3) * zoom}
                      opacity={marker.shadowOpacity ?? 0.45}
                      shape={(marker.mediaType === 'video' || marker.videoUrl) ? 'ellipse' : (marker.shadowShape || (marker.motionAsset ? 'silhouette' : 'ellipse'))}
                      rotation={marker.rotation || 0}
                      motionLayers={(marker.mediaType === 'video' || marker.videoUrl) ? undefined : marker.motionLayers}
                      pivotX={marker.pivotX}
                      pivotY={marker.pivotY}
                      isNpcBounce={
                        marker.motionAsset
                          ? marker.npcBounce !== false && (marker.effect === 'jelly' || marker.type === 'npc' || marker.npcBounce === true)
                          : marker.effect !== 'none' && (marker.effect === 'jelly' || (marker.type === 'npc' && marker.npcBounce !== false && (!marker.effect || marker.effect === 'jelly')))
                      }
                    />
                  )}
                  {/* Marcador Pin com Suporte a PNG, Redimensionamento e Giro (Gelatina isolada em wrapper dedicado para não brigar com transform) */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-transform ${
                      marker.customIconPng
                        ? isSelected
                          ? 'scale-105 filter drop-shadow-[0_0_8px_rgba(56,189,248,0.95)] drop-shadow-[0_0_16px_rgba(56,189,248,0.5)]'
                          : 'hover:scale-105'
                        : isSelected
                        ? 'rounded-full shadow-xl ring-4 ring-sky-400 scale-105'
                        : 'rounded-full shadow-xl hover:scale-105'
                    }`}
                    style={{
                      width: effectiveMarkerPixelSize,
                      height: effectiveMarkerPixelSize,
                      backgroundColor: marker.customIconPng ? 'transparent' : marker.color || '#3b82f6',
                    }}
                  >
                    {/* Wrapper da Gelatina e Vento Orgânico */}
                    {(() => {
                      const isGrassOrWind = marker.effect === 'wind' || marker.id.startsWith('terrain-grass-');
                      const windAmp = marker.effectIntensity ?? 1.0;
                      const windDur = `${2.0 / (marker.effectSpeed ?? 1.0)}s`;
                      const windDelay = `${-Number((((marker.x * 0.018 + marker.y * 0.011) % 3.2)).toFixed(2))}s`;

                      const animClass = isGrassOrWind
                        ? 'animate-grass-wind cursor-pointer hover:scale-y-75 hover:rotate-6 transition-transform'
                        : (!marker.motionAsset && marker.effect !== 'none' && (
                            marker.effect === 'jelly' ||
                            (marker.type === 'npc' && marker.npcBounce !== false && (!marker.effect || marker.effect === 'jelly'))
                          ))
                          ? (marker.jellyStyle === 'spring' ? 'animate-jelly-spring' :
                             marker.jellyStyle === 'step_walk' ? 'animate-jelly-step' :
                             marker.jellyStyle === 'squash_intense' ? 'animate-jelly-squash' :
                             marker.jellyStyle === 'organic_jitter' ? 'animate-jelly-organic' :
                             marker.jellyStyle === 'pulse_beat' ? 'animate-jelly-pulse' : 'animate-jelly')
                          : '';

                      return (
                        <div
                          data-jelly-container={marker.id}
                          className={`w-full h-full flex items-center justify-center ${animClass}`}
                          style={{
                            transformOrigin: '50% 100%',
                            ['--wind-amp' as any]: windAmp,
                            ['--wind-dur' as any]: windDur,
                            ['--wind-delay' as any]: windDelay,
                            ['--jelly-amp' as any]: marker.effectIntensity ?? marker.jellyIntensity ?? (marker.type === 'npc' ? 0.45 : 0.6),
                            ...((marker.effectSpeed ?? marker.jellySpeed) !== undefined ? { ['--jelly-dur' as any]: `${1.3 / (marker.effectSpeed ?? marker.jellySpeed!)}s` } : {}),
                          }}
                        >
                      {/* Wrapper da Rotação e Espelho (transform origin calibrado pelo pivô) */}
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          transformOrigin: `${(marker.pivotX ?? 0.5) * 100}% ${(marker.pivotY ?? 0.5) * 100}%`,
                          transform: `rotate(${markerRotation}deg) scale(${marker.flipX ? -(marker.scaleX ?? 1) : (marker.scaleX ?? 1)}, ${marker.flipY ? -(marker.scaleY ?? 1) : (marker.scaleY ?? 1)})`,
                        }}
                        className="flex items-center justify-center shrink-0"
                      >
                        {marker.type === 'interactive_screen' ? (
                          <StationWorldMarker
                            marker={marker}
                            markerSize={effectiveMarkerPixelSize}
                            isSelected={isSelected}
                          />
                        ) : (marker.mediaType === 'video' || marker.videoUrl) ? (
                          <VideoAssetCanvas
                            key={marker.videoUrl || marker.customIconPng || marker.id}
                            videoUrl={marker.videoUrl || marker.customIconPng || ''}
                            chromaKey={marker.videoChromaKey}
                            className="w-full h-full object-contain filter drop-shadow-md select-none pointer-events-none"
                          />
                        ) : marker.customIconPng ? (
                          (marker.id.startsWith('terrain-grass-') || marker.id.startsWith('terrain-flower-') || (marker.effect === 'wind' && (!marker.motionLayers || marker.motionLayers.length === 0) && (!marker.effectStrokes || marker.effectStrokes.length === 0))) ? (
                            <img
                              src={getRenderableAssetUrl(marker.customIconPng)}
                              alt={marker.name}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-contain select-none pointer-events-none"
                            />
                          ) : (
                            <MotionAssetCanvas
                              src={marker.customIconPng}
                              alt={marker.name}
                              effect={marker.effect}
                              speed={marker.effectSpeed ?? marker.jellySpeed ?? 1.0}
                              intensity={marker.effectIntensity ?? marker.jellyIntensity ?? 1.0}
                              strokes={marker.effectStrokes}
                              motionLayers={marker.motionLayers}
                              isNpcBounce={
                                marker.motionAsset
                                  ? marker.npcBounce !== false && (marker.effect === 'jelly' || marker.type === 'npc' || marker.npcBounce === true)
                                  : marker.effect !== 'none' && (marker.effect === 'jelly' || (marker.type === 'npc' && marker.npcBounce !== false && (!marker.effect || marker.effect === 'jelly')))
                              }
                              width={Math.round(effectiveMarkerPixelSize)}
                              height={Math.round(effectiveMarkerPixelSize)}
                              className="w-full h-full object-contain filter drop-shadow-md select-none pointer-events-none"
                            />
                          )
                        ) : (
                          renderMarkerIcon(marker.type)
                        )}
                      </div>
                    </div>
                  );
                })()}

                    {/* Status Pip */}
                    {marker.status === 'completed' && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border border-slate-900 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                    {marker.status === 'locked' && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border border-slate-900 flex items-center justify-center">
                        <Lock className="w-2 h-2 text-white" />
                      </span>
                    )}
                  </div>

                  {/* Nome sutil quando não selecionado (apenas em hover) */}
                  {!isSelected && isHovered && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap pointer-events-none z-40">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/90 text-slate-100 border border-slate-700/80 shadow-md text-xs font-medium">
                        <span>{marker.name}</span>
                        <span className="text-slate-400 text-[10px]">({Math.round(marker.y)}m)</span>
                      </div>
                    </div>
                  )}

                  {/* BALÃO DE INFO SEMPRE DENTRO DA CENA: Banner no topo + Cápsula de Descrição com Título abaixo */}
                  {isSelected && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      className={`quick-action-balloon absolute ${
                        isCanvasAbove ? 'bottom-full mb-3 animate-balloon-up' : 'top-full mt-3 animate-balloon-down'
                      } flex flex-col items-center gap-1.5 z-50 pointer-events-auto select-text`}
                      style={{
                        left: balloonCanvasOffset,
                        width: BALLOON_CANVAS_WIDTH,
                      }}
                    >
                      {/* Ponta / Notch do balão apontando diretamente para o centro do marcador */}
                      {!isCanvasAbove ? (
                        <div
                          className="absolute -top-1.5 w-3 h-3 bg-slate-950 border-l border-t border-slate-700 rotate-45 z-20 shadow-xs pointer-events-none"
                          style={{ left: notchCanvasLeft - 6 }}
                        />
                      ) : (
                        <div
                          className="absolute -bottom-1.5 w-3 h-3 bg-slate-950 border-r border-b border-slate-700 rotate-45 z-20 shadow-xs pointer-events-none"
                          style={{ left: notchCanvasLeft - 6 }}
                        />
                      )}

                      {/* Cápsula de ações rápidas: duplicar, focar, remover, fechar */}
                      <div className="w-full rounded-2xl bg-slate-950/95 border-2 border-slate-700 px-2.5 py-1.5 shadow-xl space-y-1">
                        <div className="flex items-center gap-1">
                          <span
                            className="text-xs font-black text-slate-100 tracking-tight truncate flex-1"
                            title={marker.name}
                          >
                            {marker.name}
                          </span>
                          <button
                            onClick={() => onReorderMarker?.(marker.id, 'up')}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition-colors shrink-0"
                            title="Trazer para frente na camada (Subir)"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onReorderMarker?.(marker.id, 'down')}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition-colors shrink-0"
                            title="Enviar para trás na camada (Descer)"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDuplicateMarker?.(marker.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors shrink-0"
                            title="Duplicar marcador"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => focusMarkerCanvas(marker)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors shrink-0"
                            title="Focar câmera"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteMarker?.(marker.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors shrink-0"
                            title="Remover marcador"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onSelectMarker(null)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
                            title="Fechar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="pt-1 border-t border-slate-800/80 space-y-1">
                          {/* Linha 1: Troca Rápida de Imagem PNG (Preview + Galeria + Local + Remover) */}
                          <div className="flex items-center gap-1.5 py-0.5">
                            {marker.customIconPng ? (
                              <div
                                className="w-6 h-6 rounded-md border border-amber-500/50 bg-slate-950 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-xs"
                                style={{ transform: `rotate(${marker.rotation || 0}deg)` }}
                                title="PNG Atual"
                              >
                                <img src={marker.customIconPng} alt={marker.name} className="w-full h-full object-contain" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-md border border-slate-700 bg-slate-900 flex items-center justify-center shrink-0 text-slate-400">
                                <ImageIcon className="w-3.5 h-3.5" />
                              </div>
                            )}

                            <div className="flex-1 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTargetMarkerForGallery(marker.id);
                                  setIsGalleryModalOpen(true);
                                }}
                                className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer"
                                title="Escolher asset oficial da galeria"
                              >
                                <FolderOpen className="w-3 h-3 text-amber-400" />
                                <span>Galeria</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTargetMarkerForGallery(marker.id);
                                  quickActionFileInputRef.current?.click();
                                }}
                                className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-[9.5px] font-semibold transition-all cursor-pointer"
                                title="Carregar imagem ou vídeo local do computador"
                              >
                                <Upload className="w-3 h-3 text-slate-400" />
                                <span>Local</span>
                              </button>

                              {(marker.mediaType === 'video' || Boolean(marker.videoUrl)) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveChromaMarkerId(marker.id);
                                  }}
                                  className="flex items-center justify-center gap-1 py-1 px-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer shadow-sm animate-pulse"
                                  title="Configurar Chroma Key, Velocidade, Zoom e Pivô do Vídeo"
                                >
                                  <Film className="w-3 h-3 text-emerald-400" />
                                  <span>Chroma</span>
                                </button>
                              )}
                            </div>

                            {(marker.customIconPng || marker.videoUrl) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateMarker?.(marker.id, {
                                    customIconPng: undefined,
                                    videoUrl: undefined,
                                    mediaType: undefined,
                                    videoChromaKey: undefined,
                                    motionLayers: undefined,
                                    motionAsset: false,
                                  });
                                }}
                                className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                                title="Remover asset e voltar ao ícone nativo"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Linha 2: Tamanho PNG em linha única (Ícone + Slider + Input numérico px) */}
                          <div className="flex items-center gap-1.5 py-0.5 text-[10px]">
                            <span className="text-slate-400 font-semibold shrink-0 flex items-center gap-1" title="Tamanho PNG">
                              <Maximize2 className="w-3 h-3 text-amber-400" />
                            </span>
                            <input
                              type="range"
                              min={16}
                              max={1200}
                              step={2}
                              value={Math.min(1200, Math.round(marker.size || 150))}
                              onChange={(e) =>
                                onUpdateMarker?.(marker.id, { size: Math.max(16, Number(e.target.value) || 16) })
                              }
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="flex-1 accent-amber-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
                              title="Deslize para alterar tamanho"
                            />
                            <div className="flex items-center gap-0.5 shrink-0">
                              <input
                                type="number"
                                min={16}
                                max={3000}
                                value={Math.round(marker.size || 150)}
                                onChange={(e) => {
                                  const val = Math.max(16, Number(e.target.value) || 16);
                                  onUpdateMarker?.(marker.id, { size: val });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-right font-mono text-[10px] text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                              />
                              <span className="text-[9px] text-slate-500 font-mono">px</span>
                            </div>
                          </div>

                          {/* Linha 3: Rotação em linha única */}
                          <div className="flex items-center gap-1.5 py-0.5 text-[10px]">
                            <span className="text-slate-400 font-semibold shrink-0 flex items-center gap-1" title="Girar asset">
                              <RotateCw className="w-3 h-3 text-slate-400" />
                            </span>
                            <input
                              type="range"
                              min={0}
                              max={360}
                              step={5}
                              value={Math.round(marker.rotation || 0)}
                              onChange={(e) =>
                                onUpdateMarker?.(marker.id, { rotation: Number(e.target.value) || 0 })
                              }
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="flex-1 accent-slate-300 cursor-pointer h-1 bg-slate-800 rounded-lg"
                              title="Girar asset"
                            />
                            <span className="font-mono text-slate-300 text-[10px] w-9 text-right shrink-0">
                              {Math.round(marker.rotation || 0)}°
                            </span>
                          </div>
                        </div>

                          {/* Linha de Marcador OFF e Botão Expandir Avançado */}
                          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateMarker?.(marker.id, { markerOff: !marker.markerOff });
                              }}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                                marker.markerOff
                                  ? 'bg-amber-500/30 text-amber-300 border border-amber-400/60 shadow-xs'
                                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                              }`}
                              title="Marcador OFF: vira piso/chão puro (sem colisão, herói e NPCs passam livremente por cima)"
                            >
                              <span>{marker.markerOff ? '🔘' : '⚪'}</span>
                              <span>{marker.markerOff ? 'Marcador OFF (Chão)' : 'Marcador OFF'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedQuickActionId((prev) => (prev === marker.id ? null : marker.id));
                              }}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-colors cursor-pointer ${
                                expandedQuickActionId === marker.id
                                  ? 'bg-sky-500/30 text-sky-300 border border-sky-400/60'
                                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                              }`}
                              title="Expandir controles avançados de sombra e colisão"
                            >
                              <span>⚙️</span>
                              <span>{expandedQuickActionId === marker.id ? 'Fechar' : 'Avançado'}</span>
                            </button>
                          </div>

                          {/* Painel Avançado Expansível: Sombra Realista e Ajuste de Colisão */}
                          {expandedQuickActionId === marker.id && (
                            <div
                              className="pt-1.5 border-t border-slate-800/90 space-y-2 text-[10px]"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              {/* Atalhos Rápidos de Tamanho (Dentro do Avançado) */}
                              <div className="space-y-1 bg-slate-900/95 p-1.5 rounded-xl border border-slate-800">
                                <div className="flex items-center justify-between text-[9px] text-slate-400">
                                  <span>Atalhos de Tamanho:</span>
                                  <span className="font-mono text-amber-300 font-bold">{Math.round(marker.size || 150)}px</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {[64, 100, 150, 256, 400, 600, 800, 1200].map((sz) => (
                                    <button
                                      key={sz}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onUpdateMarker?.(marker.id, { size: sz });
                                      }}
                                      className={`flex-1 py-0.5 text-[8.5px] font-mono rounded border transition-colors cursor-pointer ${
                                        Math.round(marker.size || 150) === sz
                                          ? 'bg-amber-500/30 border-amber-400 text-amber-300 font-bold'
                                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                      }`}
                                    >
                                      {sz}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Controles de Sombra Realista */}
                              <div className="space-y-1.5 bg-slate-900/95 p-2 rounded-xl border border-slate-800">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-200 flex items-center gap-1">
                                    <span>🌑</span>
                                    <span>Sombra Realista</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateMarker?.(marker.id, {
                                        hasShadow: marker.hasShadow === false ? true : false,
                                      })
                                    }
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-colors cursor-pointer ${
                                      marker.hasShadow !== false
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                                    }`}
                                  >
                                    {marker.hasShadow !== false ? 'Ativa' : 'Desativada'}
                                  </button>
                                </div>

                                {marker.hasShadow !== false && (
                                  <div className="space-y-1.5 pt-1">
                                    {/* Formato: Silhueta da PNG vs Elipse Suave */}
                                    <div className="grid grid-cols-2 gap-1 text-[9px]">
                                      <button
                                        type="button"
                                        onClick={() => onUpdateMarker?.(marker.id, { shadowShape: 'silhouette' })}
                                        className={`p-1 rounded border text-center transition-colors cursor-pointer ${
                                          marker.shadowShape === 'silhouette'
                                            ? 'bg-amber-500/30 border-amber-400 text-amber-200 font-bold'
                                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                        }`}
                                        title="Projeta a silhueta das camadas e do corpo no chão"
                                      >
                                        🎭 Silhueta
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onUpdateMarker?.(marker.id, { shadowShape: 'ellipse' })}
                                        className={`p-1 rounded border text-center transition-colors cursor-pointer ${
                                          (marker.shadowShape || 'ellipse') === 'ellipse'
                                            ? 'bg-amber-500/30 border-amber-400 text-amber-200 font-bold'
                                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                        }`}
                                        title="Elipse de chão suave"
                                      >
                                        ⭕ Elipse Chão
                                      </button>
                                    </div>

                                    {/* Desfoque / Blur da Sombra */}
                                    <div>
                                      <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5">
                                        <span>Desfoque (Blur):</span>
                                        <span className="font-mono text-amber-300 font-bold">
                                          {marker.shadowBlur ?? 3}px
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min={0}
                                        max={20}
                                        step={1}
                                        value={marker.shadowBlur ?? 3}
                                        onChange={(e) =>
                                          onUpdateMarker?.(marker.id, { shadowBlur: Number(e.target.value) })
                                        }
                                        className="w-full accent-amber-400 cursor-pointer h-1"
                                      />
                                    </div>

                                    {/* Opacidade da Sombra */}
                                    <div>
                                      <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5">
                                        <span>Opacidade:</span>
                                        <span className="font-mono text-amber-300 font-bold">
                                          {Math.round((marker.shadowOpacity ?? 0.45) * 100)}%
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min={0.1}
                                        max={1.0}
                                        step={0.05}
                                        value={marker.shadowOpacity ?? 0.45}
                                        onChange={(e) =>
                                          onUpdateMarker?.(marker.id, { shadowOpacity: parseFloat(e.target.value) })
                                        }
                                        className="w-full accent-amber-400 cursor-pointer h-1"
                                      />
                                    </div>

                                    {/* Offset X e Y */}
                                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                      <div>
                                        <div className="flex items-center justify-between text-[8px] text-slate-400">
                                          <span>Offset X:</span>
                                          <span className="font-mono text-amber-300">{marker.shadowOffsetX || 0}px</span>
                                        </div>
                                        <input
                                          type="range"
                                          min={-40}
                                          max={40}
                                          step={1}
                                          value={marker.shadowOffsetX || 0}
                                          onChange={(e) =>
                                            onUpdateMarker?.(marker.id, { shadowOffsetX: Number(e.target.value) })
                                          }
                                          className="w-full accent-amber-400 cursor-pointer h-1"
                                        />
                                      </div>
                                      <div>
                                        <div className="flex items-center justify-between text-[8px] text-slate-400">
                                          <span>Offset Y:</span>
                                          <span className="font-mono text-amber-300">{marker.shadowOffsetY || 0}px</span>
                                        </div>
                                        <input
                                          type="range"
                                          min={-40}
                                          max={40}
                                          step={1}
                                          value={marker.shadowOffsetY || 0}
                                          onChange={(e) =>
                                            onUpdateMarker?.(marker.id, { shadowOffsetY: Number(e.target.value) })
                                          }
                                          className="w-full accent-amber-400 cursor-pointer h-1"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Controles de Colisão Física e Pés */}
                              <div className="space-y-1.5 bg-slate-900/95 p-2 rounded-xl border border-slate-800">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-200 flex items-center gap-1">
                                    <span>🛡️</span>
                                    <span>Colisão Física</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateMarker?.(marker.id, {
                                        solidCollision: marker.solidCollision === false ? true : false,
                                      })
                                    }
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-colors cursor-pointer ${
                                      marker.solidCollision !== false
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                                    }`}
                                  >
                                    {marker.solidCollision !== false ? '🛡️ Sólido' : 'Passável'}
                                  </button>
                                </div>

                                {marker.solidCollision !== false && !marker.markerOff && (
                                  <div className="space-y-1 pt-0.5">
                                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                                      <span>Raio nos Pés:</span>
                                      <span className="font-mono text-emerald-300 font-bold">
                                        {Math.round((marker.collisionRadiusScale ?? 0.25) * 100)}%
                                      </span>
                                    </div>
                                    <input
                                      type="range"
                                      min={0.1}
                                      max={0.5}
                                      step={0.02}
                                      value={marker.collisionRadiusScale ?? 0.25}
                                      onChange={(e) =>
                                        onUpdateMarker?.(marker.id, { collisionRadiusScale: parseFloat(e.target.value) })
                                      }
                                      className="w-full accent-emerald-400 cursor-pointer h-1"
                                    />
                                    <p className="text-[8px] text-slate-500">
                                      Foco nos pés: herói passa suavemente sem travar no ar da imagem.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              );
            })}

            {/* Player Character Marker */}
            {(() => {
              const player = project.player || { id: 'p1', name: 'Herói', x: 384, y: 100, color: '#3b82f6' };
              // Escala do herói pelo bioma/fase onde ele está (único controle de escala)
              let biomeMult = 1.0;
              if (isExtended) {
                const hit = subBiomeAtCanvasX(player.x);
                biomeMult = hit?.sb.playerScale ?? 1.0;
              } else {
                biomeMult = getBiomeAtY(player.y, spans)?.playerScale ?? 1.0;
              }
              const baseSize = 48 * zoom * biomeMult;
              const isBounce = player.autoBounce !== false;
              // Qualquer PNG vale (padrão ou direcional), igual ao celular
              const heroPng =
                player.avatarPng ||
                player.avatarDownPng ||
                player.avatarUpPng ||
                player.avatarLeftPng ||
                player.avatarRightPng;

              if (typeof window !== 'undefined') {
                (window as any).__editorCanvasZoom = zoom;
              }

              return (
                <div
                  id="editor-player-marker"
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{
                    transform: `translate3d(${player.x * zoom}px, ${player.y * zoom}px, 0) translate(-50%, -100%)`,
                    willChange: 'transform',
                    zIndex: Math.round(player.y * zoom),
                    transformOrigin: '50% 100%',
                  }}
                >
                  {/* Sombrinha do asset do herói (tamanho real + pivô) */}
                  <GroundShadow url={heroPng} box={baseSize} />
                    <div
                      className={`relative flex flex-col items-center ${
                        isBounce
                          ? player.jellyStyle === 'spring'
                            ? 'animate-jelly-spring'
                            : player.jellyStyle === 'step_walk'
                            ? 'animate-jelly-step'
                            : player.jellyStyle === 'squash_intense'
                            ? 'animate-jelly-squash'
                            : player.jellyStyle === 'organic_jitter'
                            ? 'animate-jelly-organic'
                            : player.jellyStyle === 'pulse_beat'
                            ? 'animate-jelly-pulse'
                            : 'animate-jelly'
                          : ''
                      }`}
                      style={{
                        transformOrigin: '50% 100%',
                        ['--jelly-dur' as any]: player.jellySpeed
                          ? `${((player.jellyStyle === 'pulse_beat' ? 0.75 : 1.3) / Math.max(0.2, player.jellySpeed)).toFixed(2)}s`
                          : undefined,
                        ['--jelly-amp' as any]: player.jellyIdleIntensity ?? 0.35,
                        animationDuration: player.jellySpeed
                          ? `${((player.jellyStyle === 'pulse_beat' ? 0.75 : 1.3) / Math.max(0.2, player.jellySpeed)).toFixed(2)}s`
                          : undefined,
                      }}
                    >
                    {/* Tag de nome: false explícito SEMPRE oculta; undefined mostra só sem PNG */}
                    {(player.showNameTag === true || (player.showNameTag !== false && !heroPng)) && (
                      <div className="px-2 py-0.5 rounded bg-slate-950/90 border border-blue-400 text-[10px] font-bold text-blue-300 shadow-md mb-0.5 whitespace-nowrap">
                        {player.name || 'Herói'}
                      </div>
                    )}
                    {heroPng ? (
                      <MotionAssetCanvas
                        src={heroPng}
                        alt={player.name}
                        motionLayers={player.motionLayers}
                        isNpcBounce={false}
                        width={Math.round(baseSize)}
                        height={Math.round(baseSize)}
                        className="object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)] select-none"
                        style={{
                          width: baseSize,
                          height: baseSize,
                        }}
                      />
                    ) : (
                      <div
                        className="rounded-full border-2 border-white flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.9)] overflow-hidden bg-slate-900"
                        style={{
                          width: baseSize,
                          height: baseSize,
                          backgroundColor: player.color || '#3b82f6',
                        }}
                      >
                        <span className="text-base">🛡️</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
      )}

      {/* Input oculto para upload de arquivo local no Quick Action */}
      <input
        ref={quickActionFileInputRef}
        type="file"
        accept="image/png,image/webp,image/jpeg,image/gif,video/mp4,video/webm,video/ogg,video/quicktime,video/*"
        className="hidden"
        onChange={handleQuickActionLocalFile}
      />

      {/* Modal da Galeria de Assets no Quick Action do Canvas */}
      {isGalleryModalOpen && (
        <AssetGalleryModal
          isOpen={isGalleryModalOpen}
          onClose={() => {
            setIsGalleryModalOpen(false);
            setTargetMarkerForGallery(null);
          }}
          galleryAssets={project.galleryAssets || []}
          categories={project.galleryCategories || []}
          title={
            targetMarkerForGallery
              ? `Escolher Asset para "${project.markers.find((m) => m.id === targetMarkerForGallery)?.name || 'Marcador'}"`
              : 'Galeria Oficial de Assets'
          }
          onSelectAsset={(dataUrl, assetName, asset) => {
            if (targetMarkerForGallery) {
              const matchedAsset = asset || (project.galleryAssets || []).find((a) => a.dataUrl === dataUrl);
              const currentMarker = project.markers.find((m) => m.id === targetMarkerForGallery);
              const isVid = matchedAsset?.mediaType === 'video' || Boolean(matchedAsset?.videoUrl);
              onUpdateMarker?.(targetMarkerForGallery, {
                customIconPng: dataUrl,
                mediaType: isVid ? 'video' : undefined,
                videoUrl: isVid ? matchedAsset?.videoUrl : undefined,
                videoChromaKey: isVid
                  ? (matchedAsset?.videoChromaKey || {
                      enabled: true,
                      color: '#00ff00',
                      tolerance: 35,
                      smoothness: 12,
                      cropSquare: true,
                      cropOffsetX: 0.5,
                      cropOffsetY: 0.5,
                      videoSpeed: 1.0,
                      scale: 1.0,
                      flipH: false,
                    })
                  : undefined,
                pivotX: isVid ? (matchedAsset?.pivotX ?? currentMarker?.pivotX ?? 0.5) : currentMarker?.pivotX,
                pivotY: isVid ? (matchedAsset?.pivotY ?? currentMarker?.pivotY ?? 0.5) : currentMarker?.pivotY,
                flipX: isVid ? (matchedAsset?.videoChromaKey?.flipH ?? currentMarker?.flipX) : currentMarker?.flipX,
                size: currentMarker?.size && currentMarker.size >= 16 ? currentMarker.size : 150,
                motionLayers: matchedAsset?.motionLayers ? cloneMotionLayersShared(matchedAsset.motionLayers) : undefined,
                motionAsset: Boolean(matchedAsset?.motionLayers && matchedAsset.motionLayers.length > 0),
                ...(assetName && (!currentMarker?.name || currentMarker.name === 'Marcador')
                  ? { name: assetName }
                  : {}),
              });
            }
            setIsGalleryModalOpen(false);
            setTargetMarkerForGallery(null);
          }}
          onUploadNewAsset={(newAsset) => {
            onUpdateProject?.({
              galleryAssets: [newAsset, ...(project.galleryAssets || [])],
            });
          }}
        />
      )}

      {/* Modal de Chroma Key acessível diretamente pelo Canvas / Quick Action */}
      {activeChromaMarker && (
        <VideoChromaKeyModal
          isOpen={!!activeChromaMarker}
          videoUrl={activeChromaMarker.videoUrl || activeChromaMarker.customIconPng || ''}
          initialChromaKey={activeChromaMarker.videoChromaKey}
          initialPivotX={activeChromaMarker.pivotX ?? 0.5}
          initialPivotY={activeChromaMarker.pivotY ?? 0.5}
          onClose={() => setActiveChromaMarkerId(null)}
          onSave={({ chromaKey, pivotX, pivotY }) => {
            onUpdateMarker?.(activeChromaMarker.id, {
              videoChromaKey: chromaKey,
              pivotX,
              pivotY,
              flipX: chromaKey.flipH ?? activeChromaMarker.flipX,
            });
            setActiveChromaMarkerId(null);
          }}
        />
      )}
    </div>
  );
};
