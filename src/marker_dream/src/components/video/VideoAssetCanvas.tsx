import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VideoChromaKeyConfig } from '../../types/map';
import { getUniqueAssetKey, getRenderableAssetUrl } from '../../utils/assetRegistry';

interface VideoAssetCanvasProps {
  videoUrl: string;
  chromaKey?: VideoChromaKeyConfig;
  targetDurationSec?: number; // Sincroniza velocidade automaticamente com a duração do ataque
  playTrigger?: number; // Reinicia reprodução imediatamente ao disparar (0ms de atraso)
  className?: string;
  style?: React.CSSProperties;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  paused?: boolean;
  onLoadedMetadata?: (e: { width: number; height: number; duration: number }) => void;
  onClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onContextMenu?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onSampleColor?: (hexColor: string, rgb: [number, number, number]) => void;
  pipetteActive?: boolean;
}

// Converte hex string (#RRGGBB ou #RGB) para [r, g, b]
function hexToRgb(hex?: string): [number, number, number] {
  if (!hex || typeof hex !== 'string') return [0, 255, 0];
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [0, 255, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// ============================================================================
// MOTOR DE INSTANCIAMENTO DE VÍDEO E CHROMA KEY (SHARED MASTER VIDEO POOL)
// ============================================================================
// Se 50 marcadores usarem o mesmo vídeo em loop no mapa e no emulador,
// APENAS 1 decodificador <video> e 1 buffer de Chroma Key são executados por frame!
const MAX_CHROMA_PROC_DIM = 360;

interface SharedVideoDecoder {
  video: HTMLVideoElement;
  offCanvas: HTMLCanvasElement;
  offCtx: CanvasRenderingContext2D | null;
  masterCanvas: HTMLCanvasElement;
  masterCtx: CanvasRenderingContext2D | null;
  lastProcessedTime: number;
  lastChromaSig: string;
  lastRenderFrameId: number;
  ready: boolean;
  refCount: number;
}

const SHARED_VIDEO_DECODERS = new Map<string, SharedVideoDecoder>();
let globalVideoFrameCounter = 0;
const GLOBAL_VIDEO_SUBSCRIBERS = new Set<(frameId: number) => void>();
let globalVideoRafId: number | null = null;

function tickGlobalVideoSubscribers() {
  if (GLOBAL_VIDEO_SUBSCRIBERS.size === 0) {
    globalVideoRafId = null;
    return;
  }
  globalVideoFrameCounter = (globalVideoFrameCounter + 1) | 0;
  if (typeof document === 'undefined' || !document.hidden) {
    GLOBAL_VIDEO_SUBSCRIBERS.forEach((fn) => fn(globalVideoFrameCounter));
  }
  globalVideoRafId = requestAnimationFrame(tickGlobalVideoSubscribers);
}

function subscribeVideoRender(fn: (frameId: number) => void) {
  GLOBAL_VIDEO_SUBSCRIBERS.add(fn);
  if (globalVideoRafId === null && typeof window !== 'undefined') {
    globalVideoRafId = requestAnimationFrame(tickGlobalVideoSubscribers);
  }
}

function unsubscribeVideoRender(fn: (frameId: number) => void) {
  GLOBAL_VIDEO_SUBSCRIBERS.delete(fn);
  if (GLOBAL_VIDEO_SUBSCRIBERS.size === 0 && globalVideoRafId !== null) {
    cancelAnimationFrame(globalVideoRafId);
    globalVideoRafId = null;
  }
}

function getChromaSignature(ck?: VideoChromaKeyConfig): string {
  if (!ck) return 'none';
  return `${ck.enabled ? 1 : 0}_${ck.color || '#00ff00'}_${ck.tolerance ?? 35}_${ck.smoothness ?? 12}_${ck.cropSquare ?? true}_${ck.scale ?? 1}_${ck.flipH ? 1 : 0}_${ck.cropOffsetX ?? 0.5}_${ck.cropOffsetY ?? 0.5}_${ck.videoSpeed ?? 1}`;
}

function acquireSharedVideoDecoder(url: string): SharedVideoDecoder {
  const key = getUniqueAssetKey(url);
  let entry = SHARED_VIDEO_DECODERS.get(key);
  if (entry) {
    entry.refCount++;
    return entry;
  }

  const video = document.createElement('video');
  const renderUrl = getRenderableAssetUrl(url);
  if (!renderUrl.startsWith('data:') && !renderUrl.startsWith('blob:')) {
    video.crossOrigin = 'anonymous';
  }
  video.preload = 'auto';
  video.muted = true;
  video.defaultMuted = true;
  video.setAttribute('muted', '');
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('autoplay', '');
  video.loop = true;
  video.setAttribute('loop', '');
  video.src = renderUrl;

  const offCanvas = document.createElement('canvas');
  const masterCanvas = document.createElement('canvas');

  entry = {
    video,
    offCanvas,
    offCtx: offCanvas.getContext('2d', { willReadFrequently: true }),
    masterCanvas,
    masterCtx: masterCanvas.getContext('2d', { alpha: true }),
    lastProcessedTime: -1,
    lastChromaSig: '',
    lastRenderFrameId: -1,
    ready: false,
    refCount: 1,
  };

  const markReady = () => {
    if (entry) entry.ready = true;
    if (video.paused) {
      video.play().catch(() => {});
    }
  };

  video.addEventListener('loadeddata', markReady);
  video.addEventListener('canplay', markReady);
  video.load();

  SHARED_VIDEO_DECODERS.set(key, entry);
  return entry;
}

function releaseSharedVideoDecoder(url: string) {
  const key = getUniqueAssetKey(url);
  const entry = SHARED_VIDEO_DECODERS.get(key);
  if (!entry) return;
  entry.refCount = Math.max(0, entry.refCount - 1);
  if (entry.refCount === 0) {
    entry.video.pause();
  }
}

function renderVideoFrameToMaster(
  video: HTMLVideoElement,
  offCanvas: HTMLCanvasElement,
  offCtx: CanvasRenderingContext2D,
  masterCanvas: HTMLCanvasElement,
  masterCtx: CanvasRenderingContext2D,
  currentChromaKey?: VideoChromaKeyConfig
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw <= 0 || vh <= 0) return;

  // Reduz resolução interna de processamento para MAX_CHROMA_PROC_DIM (até 25x mais rápido sem perda visual em marcadores)
  const procScale = Math.min(1, MAX_CHROMA_PROC_DIM / Math.max(vw, vh));
  const pw = Math.max(1, Math.round(vw * procScale));
  const ph = Math.max(1, Math.round(vh * procScale));

  const cropSquare = currentChromaKey?.cropSquare ?? (currentChromaKey as any)?.squareCrop ?? true;
  const minDim = Math.min(pw, ph);
  const destW = cropSquare ? minDim : pw;
  const destH = cropSquare ? minDim : ph;

  if (masterCanvas.width !== destW || masterCanvas.height !== destH) {
    masterCanvas.width = destW;
    masterCanvas.height = destH;
  }
  if (offCanvas.width !== pw || offCanvas.height !== ph) {
    offCanvas.width = pw;
    offCanvas.height = ph;
  }

  const scale = currentChromaKey?.scale ?? 1.0;
  const flipH = currentChromaKey?.flipH ?? false;
  const offsetX = Math.max(0, Math.min(1, currentChromaKey?.cropOffsetX ?? 0.5));
  const offsetY = Math.max(0, Math.min(1, currentChromaKey?.cropOffsetY ?? 0.5));

  const panRangeX = Math.max(pw, destW);
  const panRangeY = Math.max(ph, destH);
  const panX = (0.5 - offsetX) * panRangeX;
  const panY = (0.5 - offsetY) * panRangeY;

  if (currentChromaKey && currentChromaKey.enabled) {
    try {
      offCtx.drawImage(video, 0, 0, pw, ph);
      const frame = offCtx.getImageData(0, 0, pw, ph);
      const data = frame.data;
      const colorHex = currentChromaKey.color || (currentChromaKey as any).keyColor || '#00ff00';
      const [tr, tg, tb] = hexToRgb(colorHex);

      const rawTol = currentChromaKey.tolerance ?? 35;
      const normalizedTol = rawTol <= 1 ? rawTol * 100 : rawTol;
      const rawSmooth = currentChromaKey.smoothness ?? 12;
      const normalizedSmooth = rawSmooth <= 1 ? rawSmooth * 100 : rawSmooth;

      const tol = (normalizedTol / 100) * 240;
      const smooth = Math.max(0.1, (normalizedSmooth / 100) * 70);
      const tolSq = tol * tol;
      const tolPlusSmooth = tol + smooth;
      const tolPlusSmoothSq = tolPlusSmooth * tolPlusSmooth;
      const invSmooth = 1 / smooth;

      for (let i = 0, len = data.length; i < len; i += 4) {
        const dr = data[i] - tr;
        const dg = data[i + 1] - tg;
        const db = data[i + 2] - tb;
        const distSq = dr * dr + dg * dg + db * db;

        if (distSq < tolSq) {
          data[i + 3] = 0;
        } else if (distSq < tolPlusSmoothSq) {
          const dist = Math.sqrt(distSq);
          const alphaRatio = (dist - tol) * invSmooth;
          data[i + 3] = (data[i + 3] * alphaRatio) | 0;
        }
      }

      offCtx.putImageData(frame, 0, 0);
      masterCtx.clearRect(0, 0, destW, destH);
      masterCtx.save();
      masterCtx.translate(destW / 2, destH / 2);
      masterCtx.scale(flipH ? -scale : scale, scale);
      masterCtx.drawImage(
        offCanvas,
        -pw / 2 + panX / Math.max(0.1, scale),
        -ph / 2 + panY / Math.max(0.1, scale),
        pw,
        ph
      );
      masterCtx.restore();
      return;
    } catch {
      // Fallback sem getImageData caso haja CORS
    }
  }

  masterCtx.clearRect(0, 0, destW, destH);
  masterCtx.save();
  masterCtx.translate(destW / 2, destH / 2);
  masterCtx.scale(flipH ? -scale : scale, scale);
  masterCtx.drawImage(
    video,
    -pw / 2 + panX / Math.max(0.1, scale),
    -ph / 2 + panY / Math.max(0.1, scale),
    pw,
    ph
  );
  masterCtx.restore();
}

export const VideoAssetCanvas: React.FC<VideoAssetCanvasProps> = ({
  videoUrl,
  chromaKey,
  targetDurationSec,
  playTrigger,
  className = '',
  style,
  loop = true,
  paused = false,
  onLoadedMetadata,
  onClick,
  onPointerDown,
  onContextMenu,
  onSampleColor,
  pipetteActive = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const offCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chromaKeyRef = useRef<VideoChromaKeyConfig | undefined>(chromaKey);
  const targetDurationSecRef = useRef<number | undefined>(targetDurationSec);
  const isVisibleRef = useRef<boolean>(true);
  const [videoLoaded, setVideoLoaded] = useState(false);

  chromaKeyRef.current = chromaKey;
  targetDurationSecRef.current = targetDurationSec;

  // Se for vídeo em loop normal (sem gatilho individual de ataque e sem conta-gotas), usa o Decodificador Master Compartilhado!
  const useSharedMaster = loop && playTrigger === undefined && !pipetteActive;

  // Viewport Culling via IntersectionObserver: Pausa processamento quando fora da tela
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.01, rootMargin: '160px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Inicializa o vídeo (Compartilhado no Pool ou Dedicado para one-shot/ataque)
  useEffect(() => {
    if (!videoUrl) {
      setVideoLoaded(false);
      videoRef.current = null;
      return;
    }

    if (useSharedMaster) {
      const shared = acquireSharedVideoDecoder(videoUrl);
      videoRef.current = shared.video;

      const onReady = () => {
        setVideoLoaded(true);
        if (onLoadedMetadata && shared.video.videoWidth > 0) {
          onLoadedMetadata({
            width: shared.video.videoWidth,
            height: shared.video.videoHeight,
            duration: shared.video.duration,
          });
        }
      };

      if (shared.ready || (shared.video.readyState >= 2 && shared.video.videoWidth > 0)) {
        onReady();
      } else {
        shared.video.addEventListener('loadeddata', onReady, { once: true });
        shared.video.addEventListener('canplay', onReady, { once: true });
      }

      return () => {
        shared.video.removeEventListener('loadeddata', onReady);
        shared.video.removeEventListener('canplay', onReady);
        releaseSharedVideoDecoder(videoUrl);
      };
    }

    // Modo dedicado (para ataques one-shot com playTrigger ou modal com pipetteActive)
    setVideoLoaded(false);
    const video = document.createElement('video');
    const renderUrl = getRenderableAssetUrl(videoUrl);
    if (!renderUrl.startsWith('data:') && !renderUrl.startsWith('blob:')) {
      video.crossOrigin = 'anonymous';
    }
    video.preload = 'auto';
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    if (!paused) {
      video.setAttribute('autoplay', '');
    }
    if (loop) {
      video.loop = true;
      video.setAttribute('loop', '');
    }
    video.src = renderUrl;
    videoRef.current = video;

    const tryPlay = () => {
      if (!paused && video.paused) {
        video.play().catch(() => {});
      }
    };

    const handleLoaded = () => {
      setVideoLoaded(true);
      if (onLoadedMetadata) {
        onLoadedMetadata({
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration,
        });
      }
      const targetSec = targetDurationSecRef.current;
      if (targetSec && targetSec > 0 && video.duration > 0) {
        const keySpeed = chromaKeyRef.current?.videoSpeed;
        if (!keySpeed || keySpeed === 1.0) {
          const autoSpeed = Math.max(0.25, Math.min(3.5, Number((video.duration / targetSec).toFixed(2))));
          video.playbackRate = autoSpeed;
        }
      }
      tryPlay();
    };

    const handleEnded = () => {
      if (loop && !paused) {
        video.currentTime = 0;
        tryPlay();
      }
    };

    video.addEventListener('loadeddata', handleLoaded);
    video.addEventListener('canplay', handleLoaded);
    video.addEventListener('ended', handleEnded);

    if (video.readyState >= 2 && video.videoWidth > 0) {
      handleLoaded();
    } else {
      video.load();
    }

    return () => {
      video.removeEventListener('loadeddata', handleLoaded);
      video.removeEventListener('canplay', handleLoaded);
      video.removeEventListener('ended', handleEnded);
      video.pause();
      video.src = '';
    };
  }, [videoUrl, loop, useSharedMaster]);

  // Disparo reativo de ataque: reinicia para o frame 0 e dá play
  useEffect(() => {
    if (playTrigger !== undefined && videoRef.current && !useSharedMaster) {
      const video = videoRef.current;
      video.currentTime = 0;
      if (!paused) {
        video.play().catch(() => {});
      }
    }
  }, [playTrigger, paused, useSharedMaster]);

  // Controle de pause para vídeos dedicados
  useEffect(() => {
    if (useSharedMaster) return;
    const video = videoRef.current;
    if (!video || !videoLoaded) return;
    if (paused) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [paused, videoLoaded, useSharedMaster]);

  // Loop de Renderização Sincronizado via Agendador Único Global + Instanciamento Master
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !videoLoaded || paused) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    if (useSharedMaster) {
      const shared = SHARED_VIDEO_DECODERS.get(getUniqueAssetKey(videoUrl));
      if (!shared || !shared.offCtx || !shared.masterCtx) return;

      const renderShared = (frameId: number) => {
        if (!isVisibleRef.current) return;
        const vid = shared.video;
        if (vid.paused && !vid.seeking) {
          vid.play().catch(() => {});
        }
        if (vid.readyState < 2 || vid.videoWidth <= 0) return;

        const ck = chromaKeyRef.current;
        const targetSpeed = ck?.videoSpeed || 1.0;
        if (Math.abs(vid.playbackRate - targetSpeed) > 0.01) {
          vid.playbackRate = targetSpeed;
        }

        const curSig = getChromaSignature(ck);
        const curTime = vid.currentTime;

        // Só processa Chroma Key se ainda não foi processado neste frame E o tempo do vídeo ou configuração mudou!
        if (
          shared.lastRenderFrameId !== frameId &&
          (Math.abs(curTime - shared.lastProcessedTime) > 0.002 ||
            shared.lastChromaSig !== curSig ||
            shared.masterCanvas.width === 0)
        ) {
          renderVideoFrameToMaster(
            vid,
            shared.offCanvas,
            shared.offCtx!,
            shared.masterCanvas,
            shared.masterCtx!,
            ck
          );
          shared.lastProcessedTime = curTime;
          shared.lastChromaSig = curSig;
          shared.lastRenderFrameId = frameId;
        }

        const mw = shared.masterCanvas.width;
        const mh = shared.masterCanvas.height;
        if (mw > 0 && mh > 0) {
          if (canvas.width !== mw || canvas.height !== mh) {
            canvas.width = mw;
            canvas.height = mh;
          }
          ctx.clearRect(0, 0, mw, mh);
          ctx.drawImage(shared.masterCanvas, 0, 0);
        }
      };

      renderShared(globalVideoFrameCounter);
      subscribeVideoRender(renderShared);
      return () => {
        unsubscribeVideoRender(renderShared);
      };
    }

    // Renderização dedicada (ataques ou modal de edição)
    if (!offCanvasRef.current) {
      offCanvasRef.current = document.createElement('canvas');
    }
    const offCanvas = offCanvasRef.current;
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    if (!offCtx) return;

    let lastTime = -1;
    let lastSig = '';

    const renderDedicated = () => {
      if (!isVisibleRef.current) return;
      if (!paused && video.paused && !video.seeking && !video.ended) {
        video.play().catch(() => {});
      }
      if (video.readyState < 2 || video.videoWidth <= 0) return;

      const ck = chromaKeyRef.current;
      const currentTargetSec = targetDurationSecRef.current;
      let targetSpeed = ck?.videoSpeed || 1.0;
      if (currentTargetSec && currentTargetSec > 0 && video.duration > 0) {
        if (!ck?.videoSpeed || ck.videoSpeed === 1.0) {
          targetSpeed = Math.max(0.25, Math.min(3.5, Number((video.duration / currentTargetSec).toFixed(2))));
        }
      }
      if (Math.abs(video.playbackRate - targetSpeed) > 0.01) {
        video.playbackRate = targetSpeed;
      }

      const curSig = getChromaSignature(ck);
      const curTime = video.currentTime;
      if (Math.abs(curTime - lastTime) > 0.002 || curSig !== lastSig) {
        renderVideoFrameToMaster(video, offCanvas, offCtx, canvas, ctx, ck);
        lastTime = curTime;
        lastSig = curSig;
      }
    };

    renderDedicated();
    subscribeVideoRender(renderDedicated);
    return () => {
      unsubscribeVideoRender(renderDedicated);
    };
  }, [videoLoaded, videoUrl, paused, useSharedMaster]);

  // Lógica de Conta-Gotas (Pipette) ao clicar no canvas
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (pipetteActive && onSampleColor && videoRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas) return;

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (vw <= 0 || vh <= 0) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        const cropSquare = chromaKey?.cropSquare ?? (chromaKey as any)?.squareCrop ?? true;
        const minDim = Math.min(vw, vh);
        const destW = cropSquare ? minDim : vw;
        const destH = cropSquare ? minDim : vh;

        const canvasX = clientX * (destW / rect.width);
        const canvasY = clientY * (destH / rect.height);

        const scale = chromaKey?.scale ?? 1.0;
        const flipH = chromaKey?.flipH ?? false;
        const offsetX = Math.max(0, Math.min(1, chromaKey?.cropOffsetX ?? 0.5));
        const offsetY = Math.max(0, Math.min(1, chromaKey?.cropOffsetY ?? 0.5));
        const panRangeX = Math.max(vw, destW);
        const panRangeY = Math.max(vh, destH);
        const panX = (0.5 - offsetX) * panRangeX;
        const panY = (0.5 - offsetY) * panRangeY;

        const localX =
          (canvasX - destW / 2) / (flipH ? -scale : scale) - panX / Math.max(0.1, scale) + vw / 2;
        const localY = (canvasY - destH / 2) / scale - panY / Math.max(0.1, scale) + vh / 2;
        const pixelX = Math.max(0, Math.min(vw - 1, Math.round(localX)));
        const pixelY = Math.max(0, Math.min(vh - 1, Math.round(localY)));

        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = 1;
        sampleCanvas.height = 1;
        const sCtx = sampleCanvas.getContext('2d');
        if (sCtx) {
          sCtx.drawImage(video, pixelX, pixelY, 1, 1, 0, 0, 1, 1);
          const pixel = sCtx.getImageData(0, 0, 1, 1).data;
          const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
          onSampleColor(hex, [pixel[0], pixel[1], pixel[2]]);
          return;
        }
      }

      if (onClick) onClick(e);
    },
    [pipetteActive, onSampleColor, chromaKey, onClick]
  );

  return (
    <canvas
      ref={canvasRef}
      className={`${className} ${pipetteActive ? 'cursor-crosshair' : ''}`}
      style={{
        ...style,
        imageRendering: 'auto',
      }}
      onClick={handleCanvasClick}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
    />
  );
};
