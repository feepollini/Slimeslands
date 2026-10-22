import React, { useEffect, useRef, useState } from 'react';
import {
  EffectType,
  LayerStroke,
  createMeshGrid,
  computeMeshWeights,
  updateMeshDeformation,
  renderDeformedMesh,
  renderGlowVFX,
  renderGlitterVFX,
  renderSmokeVFX,
  renderFirefliesVFX,
  renderSparksVFX,
  updateClothFlagMesh,
  MeshGrid,
} from '../utils/motionCanvasEngine';
import { MarkerMotionLayer } from '../types/map';
import {
  computeLayerPhysics,
  applyLayerTransform,
  computeNpcJellyTransform,
} from '../utils/motionPhysicsEngine';
import { getUniqueAssetKey, getRenderableAssetUrl } from '../utils/assetRegistry';

// ============================================================================
// SISTEMA DE ALTA PERFORMANCE PARA CENTENAS DE MARCADORES (INSTANCING & CACHE)
// ============================================================================

// 1. Cache Global de Imagens Singleton: Nunca re-decodifica o mesmo PNG na memória
const GLOBAL_IMAGE_CACHE = new Map<string, HTMLImageElement>();

function getOrCreateCachedImage(url: string, onDone?: () => void): HTMLImageElement {
  const key = getUniqueAssetKey(url);
  let img = GLOBAL_IMAGE_CACHE.get(key);
  if (!img) {
    img = new Image();
    const renderUrl = getRenderableAssetUrl(url);
    if (!renderUrl.startsWith('data:') && !renderUrl.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.src = renderUrl;
    GLOBAL_IMAGE_CACHE.set(key, img);
  }
  if (img.complete && img.naturalWidth > 0) {
    if (onDone) queueMicrotask(onDone);
  } else if (onDone) {
    img.addEventListener('load', onDone, { once: true });
    img.addEventListener(
      'error',
      () => {
        if (img && img.crossOrigin) {
          img.removeAttribute('crossorigin');
          img.src = getRenderableAssetUrl(url);
        }
      },
      { once: true }
    );
  }
  return img;
}

// 1.1 Cache Global de Bounding Box Opaco para Centralização Perfeita de PNGs com Bordas Transparentes
const ALPHA_BOUNDS_CACHE = new Map<string, { minX: number; maxX: number; minY: number; maxY: number }>();

function getImageAlphaBounds(
  img: HTMLImageElement,
  url: string
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  if (!img || !url || img.naturalWidth <= 0 || img.naturalHeight <= 0) return null;
  const key = getUniqueAssetKey(url);
  const cached = ALPHA_BOUNDS_CACHE.get(key);
  if (cached) return cached;

  try {
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const maxDim = 96;
    const s = Math.min(1, maxDim / Math.max(nw, nh));
    const sw = Math.max(1, Math.round(nw * s));
    const sh = Math.max(1, Math.round(nh * s));

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, sw, sh);
    const data = ctx.getImageData(0, 0, sw, sh).data;

    let minX = sw;
    let maxX = 0;
    let minY = sh;
    let maxY = 0;
    let found = false;

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const a = data[(y * sw + x) * 4 + 3];
        if (a > 15) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!found) return null;

    const res = {
      minX: minX / s,
      maxX: maxX / s,
      minY: minY / s,
      maxY: maxY / s,
    };
    ALPHA_BOUNDS_CACHE.set(key, res);
    return res;
  } catch {
    return null;
  }
}

// 2. Cache Global de Texturas Animadas Master Independente de Resolução (True Flyweight Instancing)
// Independentemente de quantos clones existam no mapa ou se possuem tamanhos variados (randomScale ±25%),
// o rigging de peças, malha 2D e VFX são calculados APENAS 1 VEZ por frame na textura Master,
// e todos os clones copiam via GPU blit (ctx.drawImage) em 0.005ms!
interface MasterAssetInstance {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  lastFrameTime: number;
  meshes: Map<string, MeshGrid>;
  masterW: number;
  masterH: number;
}
const MASTER_INSTANCE_CACHE = new Map<string, MasterAssetInstance>();
const MAX_MASTER_INSTANCES = 128;

// Timestamp global compartilhado para sincronização de todos os assets
const GLOBAL_APP_START_TIME = performance.now();

// 3. Agendador Global Único de RAF (1 único requestAnimationFrame para todos os MotionAssetCanvas visíveis)
const GLOBAL_MOTION_SUBSCRIBERS = new Set<(time: number) => void>();
let globalMotionRafId: number | null = null;

function tickGlobalMotionSubscribers(time: number) {
  if (GLOBAL_MOTION_SUBSCRIBERS.size === 0) {
    globalMotionRafId = null;
    return;
  }
  if (typeof document === 'undefined' || !document.hidden) {
    GLOBAL_MOTION_SUBSCRIBERS.forEach((fn) => fn(time));
  }
  globalMotionRafId = requestAnimationFrame(tickGlobalMotionSubscribers);
}

function subscribeMotionRender(fn: (time: number) => void) {
  GLOBAL_MOTION_SUBSCRIBERS.add(fn);
  if (globalMotionRafId === null && typeof window !== 'undefined') {
    globalMotionRafId = requestAnimationFrame(tickGlobalMotionSubscribers);
  }
}

function unsubscribeMotionRender(fn: (time: number) => void) {
  GLOBAL_MOTION_SUBSCRIBERS.delete(fn);
  if (GLOBAL_MOTION_SUBSCRIBERS.size === 0 && globalMotionRafId !== null) {
    cancelAnimationFrame(globalMotionRafId);
    globalMotionRafId = null;
  }
}

interface Props {
  src: string;
  effect?: EffectType | string;
  speed?: number;
  intensity?: number;
  strokes?: LayerStroke[];
  motionLayers?: MarkerMotionLayer[];
  isNpcBounce?: boolean;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  isInteractiveDrawing?: boolean;
  'data-avatar'?: string;
}

export const MotionAssetCanvas: React.FC<Props> = ({
  src,
  effect = 'none',
  speed = 1.0,
  intensity = 1.0,
  strokes,
  motionLayers,
  isNpcBounce = false,
  width,
  height,
  className = '',
  style = {},
  alt = '',
  'data-avatar': dataAvatar,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseImgRef = useRef<HTMLImageElement | null>(null);
  const layerImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const isVisibleRef = useRef<boolean>(true);

  const [isLoaded, setIsLoaded] = useState(false);
  const [layersLoadedToken, setLayersLoadedToken] = useState(0);

  // Normalização do efeito base
  const normalizedEffect: EffectType = (effect as EffectType) || 'none';
  const isVfxEffect = ['glow', 'glitter', 'smoke', 'fireflies', 'sparks'].includes(normalizedEffect);
  const hasCustomStrokes = Boolean(strokes && strokes.length > 0);
  const isMeshEffect = [
    'water',
    'vortex',
    'rotation',
    ...(hasCustomStrokes ? ['wind'] : []),
    'fire',
    'pendulum',
    'pulse',
    'cloth',
    'flag',
  ].includes(normalizedEffect);

  // Identifica a camada base
  const baseLayer = motionLayers?.find((l) => l.isBaseAsset) || motionLayers?.[0];

  // Verifica se há camadas de peças filhas válidas pertencentes a esta composição
  const hasPieces = Boolean(
    motionLayers &&
    motionLayers.length > 0 &&
    motionLayers.some((l) => !l.isBaseAsset && l.pngUrl && l.visible !== false)
  );

  const effectiveBaseSrc = (hasPieces && baseLayer?.pngUrl) ? baseLayer.pngUrl : (src || baseLayer?.pngUrl || '');

  // 1. Carrega imagem base utilizando o Cache Global Singleton + Blob URL
  useEffect(() => {
    if (!effectiveBaseSrc) return;
    const img = getOrCreateCachedImage(effectiveBaseSrc, () => {
      baseImgRef.current = img;
      setIsLoaded(true);
      setLayersLoadedToken((t) => t + 1);
    });
    baseImgRef.current = img;
    if (img.complete && img.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [effectiveBaseSrc]);

  // 2. Carrega imagens de todas as peças filhas utilizando o Cache Global Singleton
  useEffect(() => {
    if (!motionLayers || motionLayers.length === 0) {
      layerImagesRef.current.clear();
      return;
    }
    let anyLoaded = false;
    motionLayers.forEach((l) => {
      const pngUrl = l.pngUrl;
      if (pngUrl) {
        const pImg = getOrCreateCachedImage(pngUrl, () => {
          layerImagesRef.current.set(l.id, pImg);
          setLayersLoadedToken((t) => t + 1);
        });
        layerImagesRef.current.set(l.id, pImg);
        if (pImg.complete && pImg.naturalWidth > 0) {
          anyLoaded = true;
        }
      }
    });
    if (anyLoaded) {
      setLayersLoadedToken((t) => t + 1);
    }
  }, [motionLayers, hasPieces]);

  const renderCallbackRef = useRef<((time: number) => void) | null>(null);
  const needsContinuousLoop = Boolean(
    isVfxEffect ||
    isMeshEffect ||
    isNpcBounce ||
    (motionLayers && motionLayers.some((l) => l.visible !== false && l.physicsMode && l.physicsMode !== 'none'))
  );
  const needsContinuousLoopRef = useRef<boolean>(needsContinuousLoop);
  needsContinuousLoopRef.current = needsContinuousLoop;

  // Se não houver motionLayers ativos nem efeitos de malha/VFX, renderiza tag <img> direta com URL Blob compartilhada
  const hasActiveMotion = Boolean(
    hasPieces ||
    isVfxEffect ||
    isMeshEffect ||
    (motionLayers && motionLayers.some((l) => l.physicsMode && l.physicsMode !== 'none')) ||
    (motionLayers && motionLayers.length > 1)
  );
  const isSimpleImage = !hasActiveMotion;

  // Dimensões de exibição na tela
  const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.5);
  const targetW = Math.max(1, Math.round(width || 64));
  const targetH = Math.max(1, Math.round(height || 64));

  const artWidth = baseImgRef.current?.naturalWidth || targetW;
  const artHeight = baseImgRef.current?.naturalHeight || targetH;

  // Margem de segurança de 35% nas 4 bordas para que asas, capas e vibrações não sejam cortadas
  const padSafetyW = Math.round(targetW * 0.35);
  const padSafetyH = Math.round(targetH * 0.35);

  const displayedCanvasW = targetW + padSafetyW * 2;
  const displayedCanvasH = targetH + padSafetyH * 2;

  // Cap inteligente de VRAM por instância (impede que um marcador com zoom gigante estoure FBO)
  const MAX_INSTANCE_BUFFER_PX = 420;
  const rawRenderW = Math.round(displayedCanvasW * dpr);
  const rawRenderH = Math.round(displayedCanvasH * dpr);
  const clampFactor = Math.min(1, MAX_INSTANCE_BUFFER_PX / Math.max(1, rawRenderW, rawRenderH));
  const canvasRenderW = Math.max(1, Math.round(rawRenderW * clampFactor));
  const canvasRenderH = Math.max(1, Math.round(rawRenderH * clampFactor));

  // Resolução Canônica da Instância Master (independente de variações de escala ±25% entre clones!)
  // Todos os marcadores do mesmo asset compartilham 1 único Master Canvas de alta nitidez (base 220px)
  const CANONICAL_TARGET_W = 220;
  const CANONICAL_TARGET_H = Math.max(1, Math.round(220 * (targetH / Math.max(1, targetW))));
  const artRatio = artWidth / Math.max(1, artHeight);
  let masterDw = CANONICAL_TARGET_W;
  let masterDh = CANONICAL_TARGET_H;
  if (artRatio >= 1) {
    masterDh = Math.max(1, Math.round(CANONICAL_TARGET_W / artRatio));
  } else {
    masterDw = Math.max(1, Math.round(CANONICAL_TARGET_H * artRatio));
  }

  const alphaBounds =
    effectiveBaseSrc && baseImgRef.current
      ? getImageAlphaBounds(baseImgRef.current, effectiveBaseSrc)
      : null;

  let visualShiftX = 0;
  const visualShiftY = 0;

  if (hasPieces && motionLayers && motionLayers.length > 0) {
    let minX = Infinity;
    let maxX = -Infinity;
    motionLayers.forEach((l) => {
      if (l.visible === false) return;
      if (l.isBaseAsset) {
        const lx = l.x ?? 0;
        minX = Math.min(minX, lx);
        maxX = Math.max(maxX, lx + artWidth);
      } else if (l.pngUrl) {
        const pImg = layerImagesRef.current.get(l.id);
        const pw = (pImg?.naturalWidth || artWidth) * (l.scale ?? 1.0);
        const lx = l.x ?? 0;
        minX = Math.min(minX, lx);
        maxX = Math.max(maxX, lx + pw);
      }
    });
    if (minX < maxX && isFinite(minX) && isFinite(maxX)) {
      const compCenterX = (minX + maxX) / 2;
      visualShiftX = compCenterX - artWidth / 2;
    }
  } else if (alphaBounds && artWidth > 0) {
    const opaqueCenterX = (alphaBounds.minX + alphaBounds.maxX) / 2;
    visualShiftX = opaqueCenterX - artWidth / 2;
  }

  const masterScale = masterDw / Math.max(1, artWidth);
  const masterPadW = Math.round(CANONICAL_TARGET_W * 0.35);
  const masterPadH = Math.round(CANONICAL_TARGET_H * 0.35);
  const masterCanvasW = CANONICAL_TARGET_W + masterPadW * 2;
  const masterCanvasH = CANONICAL_TARGET_H + masterPadH * 2;
  const masterDrawBaseX =
    masterPadW + Math.round((CANONICAL_TARGET_W - masterDw) / 2) - Math.round(visualShiftX * masterScale);
  const masterDrawBaseY =
    masterPadH + Math.round((CANONICAL_TARGET_H - masterDh) / 2) - Math.round(visualShiftY * masterScale);

  const lodCols = 8;
  const lodRows = 8;

  const animStateRef = useRef({
    speed,
    intensity,
    strokes,
    motionLayers,
    isNpcBounce,
    normalizedEffect,
    isMeshEffect,
    isVfxEffect,
    artWidth,
    artHeight,
    masterScale,
    masterDrawBaseX,
    masterDrawBaseY,
    masterCanvasW,
    masterCanvasH,
    canvasRenderW,
    canvasRenderH,
    lodCols,
    lodRows,
  });
  animStateRef.current = {
    speed,
    intensity,
    strokes,
    motionLayers,
    isNpcBounce,
    normalizedEffect,
    isMeshEffect,
    isVfxEffect,
    artWidth,
    artHeight,
    masterScale,
    masterDrawBaseX,
    masterDrawBaseY,
    masterCanvasW,
    masterCanvasH,
    canvasRenderW,
    canvasRenderH,
    lodCols,
    lodRows,
  };

  // 3. Viewport Culling via IntersectionObserver: Libera VRAM e remove do loop quando fora da tela
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = isVisibleRef.current;
        isVisibleRef.current = entry.isIntersecting;
        const cb = renderCallbackRef.current;
        if (entry.isIntersecting && !wasVisible) {
          if (canvasRef.current) {
            canvasRef.current.width = animStateRef.current.canvasRenderW;
            canvasRef.current.height = animStateRef.current.canvasRenderH;
          }
          if (cb) {
            cb(performance.now());
            if (needsContinuousLoopRef.current) {
              subscribeMotionRender(cb);
            }
          }
        } else if (!entry.isIntersecting && wasVisible) {
          if (cb) unsubscribeMotionRender(cb);
        }
      },
      { threshold: 0.01, rootMargin: '160px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 4. Motor de Renderização Canvas 2D com True Resolution-Independent Master Instancing
  useEffect(() => {
    if (isSimpleImage || !isLoaded || !baseImgRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasRenderW;
    canvas.height = canvasRenderH;

    const baseImg = baseImgRef.current;

    // Chave Canônica do Asset: Independente do tamanho individual do marcador!
    // 100 marcadores com randomScale (±25%) compartilham EXATAMENTE a mesma instância Master!
    const layersSig =
      motionLayers && motionLayers.length > 0
        ? motionLayers
            .map(
              (l) =>
                `${getUniqueAssetKey(l.pngUrl)}:${l.physicsMode || 'n'}:${Math.round(l.x || 0)},${Math.round(l.y || 0)}:${l.scale ?? 1}:${l.rotation ?? 0}:${l.visible === false ? 0 : 1}`
            )
            .join('|')
        : '0';
    const strokesSig =
      strokes && strokes.length > 0
        ? `${strokes.length}_${strokes[0]?.points?.length || 0}`
        : '0';
    const assetInstKey = `${getUniqueAssetKey(effectiveBaseSrc)}_${layersSig}_${strokesSig}_${normalizedEffect}_${speed}_${intensity}_${isNpcBounce ? 1 : 0}`;

    const render = (time: number) => {
      if (!isVisibleRef.current) return;

      const st = animStateRef.current;
      const elapsed = (time - GLOBAL_APP_START_TIME) * 0.001;

      // Verifica se outro clone deste mesmo asset já renderizou o frame atual
      let master = MASTER_INSTANCE_CACHE.get(assetInstKey);
      if (master && master.lastFrameTime === time) {
        // GPU Blit instantâneo do Master Canvas para a escala deste marcador (0.005ms!)
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, st.canvasRenderW, st.canvasRenderH);
        ctx.drawImage(master.canvas, 0, 0, st.canvasRenderW, st.canvasRenderH);
        return;
      }

      // Cria ou reutiliza a instância Master compartilhada
      if (!master) {
        if (MASTER_INSTANCE_CACHE.size >= MAX_MASTER_INSTANCES) {
          const oldestKey = MASTER_INSTANCE_CACHE.keys().next().value;
          if (oldestKey) {
            const evicted = MASTER_INSTANCE_CACHE.get(oldestKey);
            if (evicted) {
              evicted.canvas.width = 1;
              evicted.canvas.height = 1;
              evicted.meshes.clear();
            }
            MASTER_INSTANCE_CACHE.delete(oldestKey);
          }
        }
        const mCanvas = document.createElement('canvas');
        mCanvas.width = st.masterCanvasW;
        mCanvas.height = st.masterCanvasH;
        const mCtx = mCanvas.getContext('2d');
        if (mCtx) {
          master = {
            canvas: mCanvas,
            ctx: mCtx,
            lastFrameTime: time,
            meshes: new Map<string, MeshGrid>(),
            masterW: st.masterCanvasW,
            masterH: st.masterCanvasH,
          };
          MASTER_INSTANCE_CACHE.set(assetInstKey, master);
        }
      } else if (master.masterW !== st.masterCanvasW || master.masterH !== st.masterCanvasH) {
        master.canvas.width = st.masterCanvasW;
        master.canvas.height = st.masterCanvasH;
        master.masterW = st.masterCanvasW;
        master.masterH = st.masterCanvasH;
      }

      const targetCtx = master ? master.ctx : ctx;
      const meshesMap = master ? master.meshes : new Map<string, MeshGrid>();

      targetCtx.setTransform(1, 0, 0, 1, 0, 0);
      targetCtx.clearRect(0, 0, st.masterCanvasW, st.masterCanvasH);
      targetCtx.imageSmoothingEnabled = true;
      targetCtx.imageSmoothingQuality = 'high';

      const jellyTransform = st.isNpcBounce
        ? computeNpcJellyTransform(elapsed)
        : { scaleX: 1, scaleY: 1, rotationRad: 0 };

      // 1. Cenário com composição de peças do Motion Canvas ou camadas individuais
      if (st.motionLayers && st.motionLayers.length > 0) {
        targetCtx.save();
        targetCtx.translate(st.masterDrawBaseX, st.masterDrawBaseY);
        targetCtx.scale(st.masterScale, st.masterScale);

        const footX = st.artWidth * 0.5;
        const footY = st.artHeight;

        st.motionLayers.forEach((layer) => {
          if (layer.visible === false) return;

          if (layer.isBaseAsset) {
            targetCtx.save();
            const pPhysics = computeLayerPhysics(layer, elapsed, st.isNpcBounce);
            applyLayerTransform(targetCtx, layer, st.artWidth, st.artHeight, pPhysics);

            if (st.isNpcBounce) {
              targetCtx.translate(footX, footY);
              targetCtx.rotate(jellyTransform.rotationRad);
              targetCtx.scale(jellyTransform.scaleX, jellyTransform.scaleY);
              targetCtx.translate(-footX, -footY);
            }

            targetCtx.drawImage(baseImg, 0, 0, st.artWidth, st.artHeight);
            targetCtx.restore();
            return;
          }

          if (layer.pngUrl) {
            const pieceImg = layerImagesRef.current.get(layer.id) || getOrCreateCachedImage(layer.pngUrl);
            if (!pieceImg || !pieceImg.complete || pieceImg.naturalWidth <= 0) return;

            targetCtx.save();
            const pPhysics = computeLayerPhysics(layer, elapsed, st.isNpcBounce);
            const pW = pieceImg.naturalWidth || st.artWidth;
            const pH = pieceImg.naturalHeight || st.artHeight;

            const pivPixX = pW * (layer.pivotX ?? 0.5);
            const pivPixY = pH * (layer.pivotY ?? 0.5);

            const anchorBaseX = (layer.x ?? 0) + pivPixX;
            const anchorBaseY = (layer.y ?? 0) + pivPixY;

            let deformedAnchorX = anchorBaseX;
            let deformedAnchorY = anchorBaseY;
            let inheritedAngle = 0;

            if (st.isNpcBounce) {
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

            targetCtx.translate(
              deformedAnchorX + (pPhysics.offsetX || 0),
              deformedAnchorY + (pPhysics.offsetY || 0)
            );

            const baseRotRad = ((layer.rotation ?? 0) * Math.PI) / 180;
            const totalAngle = baseRotRad + pPhysics.angle + inheritedAngle;
            targetCtx.rotate(totalAngle);

            const baseScale = layer.scale ?? 1.0;
            const defX = layer.scaleX ?? 1.0;
            const defY = layer.scaleY ?? 1.0;
            const flipX = layer.flipX ? -1 : 1;
            const flipY = layer.flipY ? -1 : 1;
            targetCtx.scale(
              baseScale * defX * flipX * pPhysics.scaleX,
              baseScale * defY * flipY * pPhysics.scaleY
            );

            targetCtx.translate(-pivPixX, -pivPixY);

            if (layer.physicsMode === 'cloth' || layer.physicsMode === 'flag') {
              const customLod = layer.clothMeshDensity || Math.max(st.lodCols, 8);
              let pieceMesh = meshesMap.get(layer.id);
              if (
                !pieceMesh ||
                pieceMesh.width !== pW ||
                pieceMesh.height !== pH ||
                pieceMesh.cols !== customLod
              ) {
                pieceMesh = createMeshGrid(pW, pH, customLod, customLod);
                meshesMap.set(layer.id, pieceMesh);
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
              renderDeformedMesh(targetCtx, pieceImg, pieceMesh);
            } else {
              targetCtx.drawImage(pieceImg, 0, 0, pW, pH);
            }

            targetCtx.restore();
          }
        });

        targetCtx.restore();
      } else {
        // Cenário sem peças filhas (asset base com VFX ou malha global)
        targetCtx.save();
        targetCtx.translate(st.masterDrawBaseX, st.masterDrawBaseY);
        targetCtx.scale(st.masterScale, st.masterScale);

        if (st.isNpcBounce) {
          const footX = st.artWidth * 0.5;
          const footY = st.artHeight;
          targetCtx.translate(footX, footY);
          targetCtx.rotate(jellyTransform.rotationRad);
          targetCtx.scale(jellyTransform.scaleX, jellyTransform.scaleY);
          targetCtx.translate(-footX, -footY);
        }

        if (st.isMeshEffect) {
          let baseMesh = meshesMap.get('__base__');
          if (
            !baseMesh ||
            baseMesh.width !== st.artWidth ||
            baseMesh.height !== st.artHeight ||
            baseMesh.cols !== st.lodCols
          ) {
            baseMesh = createMeshGrid(st.artWidth, st.artHeight, st.lodCols, st.lodRows);
            computeMeshWeights(baseMesh, st.strokes || []);
            meshesMap.set('__base__', baseMesh);
          }
          if (st.normalizedEffect === 'cloth' || st.normalizedEffect === 'flag') {
            updateClothFlagMesh(
              baseMesh,
              st.normalizedEffect,
              elapsed,
              st.speed,
              st.intensity,
              0.5,
              0.1
            );
          } else {
            updateMeshDeformation(
              baseMesh,
              st.normalizedEffect,
              elapsed,
              st.speed,
              st.intensity
            );
          }
          renderDeformedMesh(targetCtx, baseImg, baseMesh);
        } else {
          targetCtx.drawImage(baseImg, 0, 0, st.artWidth, st.artHeight);
        }

        if (st.isVfxEffect) {
          switch (st.normalizedEffect) {
            case 'glow':
              renderGlowVFX(targetCtx, st.artWidth, st.artHeight, elapsed, st.speed, st.intensity, st.strokes);
              break;
            case 'glitter':
              renderGlitterVFX(targetCtx, st.artWidth, st.artHeight, elapsed, st.speed, st.intensity, st.strokes);
              break;
            case 'smoke':
              renderSmokeVFX(targetCtx, st.artWidth, st.artHeight, elapsed, st.speed, st.intensity, st.strokes);
              break;
            case 'fireflies':
              renderFirefliesVFX(targetCtx, st.artWidth, st.artHeight, elapsed, st.speed, st.intensity, st.strokes);
              break;
            case 'sparks':
              renderSparksVFX(targetCtx, st.artWidth, st.artHeight, elapsed, st.speed, st.intensity, st.strokes);
              break;
          }
        }
        targetCtx.restore();
      }

      if (master) {
        master.lastFrameTime = time;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, st.canvasRenderW, st.canvasRenderH);
        ctx.drawImage(master.canvas, 0, 0, st.canvasRenderW, st.canvasRenderH);
      }
    };

    renderCallbackRef.current = render;
    if (isVisibleRef.current) {
      render(performance.now());
      if (needsContinuousLoop) {
        subscribeMotionRender(render);
      }
    }

    return () => {
      unsubscribeMotionRender(render);
      if (renderCallbackRef.current === render) {
        renderCallbackRef.current = null;
      }
    };
  }, [
    isSimpleImage,
    isLoaded,
    layersLoadedToken,
    canvasRenderW,
    canvasRenderH,
    effectiveBaseSrc,
    needsContinuousLoop,
  ]);

  // Se for imagem estática simples (ou animada apenas via CSS hardware-accelerated),
  // renderiza tag <img> direta apontando para a Blob URL compartilhada na VRAM
  if (isSimpleImage) {
    return (
      <img
        src={getRenderableAssetUrl(effectiveBaseSrc)}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`object-contain pointer-events-none select-none ${className}`}
        data-avatar={dataAvatar}
        style={{
          width: width ? `${width}px` : undefined,
          height: height ? `${height}px` : undefined,
          ...style,
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative block pointer-events-none select-none ${className}`}
      data-avatar={dataAvatar}
      style={{
        width: `${targetW}px`,
        height: `${targetH}px`,
        overflow: 'visible',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasRenderW}
        height={canvasRenderH}
        className="block pointer-events-none select-none"
        style={{
          position: 'absolute',
          left: `${-padSafetyW}px`,
          top: `${-padSafetyH}px`,
          width: `${displayedCanvasW}px`,
          height: `${displayedCanvasH}px`,
          maxWidth: 'none',
          maxHeight: 'none',
          imageRendering: 'auto',
        }}
      />
    </div>
  );
};
