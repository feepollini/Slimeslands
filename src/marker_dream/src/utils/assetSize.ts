import React, { useEffect, useState } from 'react';
import { MotionAssetCanvas } from '../components/MotionAssetCanvas';
import { MarkerMotionLayer } from '../types/map';
import { getUniqueAssetKey, getRenderableAssetUrl } from './assetRegistry';

// Tamanho natural de um asset (PNG do marcador/herói), com cache global indexado por hash O(1).
// Notifica apenas os observadores daquele asset específico ao carregar, evitando re-render global em cascata.
const cache = new Map<string, { w: number; h: number }>();
const pending = new Set<string>();
const keyListeners = new Map<string, Set<() => void>>();

function ensureLoaded(url: string, key: string) {
  if (cache.has(key) || pending.has(key)) return;
  pending.add(key);
  const img = new Image();
  img.onload = () => {
    pending.delete(key);
    cache.set(key, { w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    const subs = keyListeners.get(key);
    if (subs) {
      subs.forEach((fn) => fn());
      keyListeners.delete(key);
    }
  };
  img.onerror = () => {
    pending.delete(key);
    keyListeners.delete(key);
  };
  img.src = getRenderableAssetUrl(url);
}

/** Retorna {w,h} naturais ou null enquanto carrega (dispara re-render apenas nos componentes deste asset). */
export function useAssetSize(url: string | undefined | null): { w: number; h: number } | null {
  const key = url ? getUniqueAssetKey(url) : '';
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!key || cache.has(key)) return;
    const fn = () => setTick((t) => t + 1);
    let subs = keyListeners.get(key);
    if (!subs) {
      subs = new Set();
      keyListeners.set(key, subs);
    }
    subs.add(fn);
    return () => {
      const currentSubs = keyListeners.get(key);
      if (currentSubs) {
        currentSubs.delete(fn);
        if (currentSubs.size === 0) keyListeners.delete(key);
      }
    };
  }, [key]);

  if (!url || !key) return null;
  const hit = cache.get(key);
  if (hit) return hit;
  ensureLoaded(url, key);
  return null;
}

/** Caixa exibida (object-contain) de um asset dentro de um box quadrado S. */
export function containedBox(
  boxSize: number,
  natural: { w: number; h: number } | null
): { dw: number; dh: number } {
  if (!natural || natural.w <= 0 || natural.h <= 0) return { dw: boxSize, dh: boxSize };
  if (natural.w >= natural.h) {
    return { dw: boxSize, dh: (boxSize * natural.h) / natural.w };
  }
  return { dw: (boxSize * natural.w) / natural.h, dh: boxSize };
}

export const GroundShadow: React.FC<{
  url?: string | null;
  box: number;
  widthK?: number;
  opacity?: number;
  offsetX?: number;
  offsetY?: number;
  blur?: number;
  shape?: 'silhouette' | 'ellipse';
  rotation?: number;
  motionLayers?: MarkerMotionLayer[];
  isNpcBounce?: boolean;
  pivotX?: number;
  pivotY?: number;
}> = ({
  url,
  box,
  widthK = 0.72,
  opacity = 0.45,
  offsetX = 0,
  offsetY = 0,
  blur = 3,
  shape = 'ellipse',
  rotation = 0,
  motionLayers,
  isNpcBounce = false,
  pivotX,
  pivotY,
}) => {
  const nat = useAssetSize(url || undefined);
  const { dw, dh } = containedBox(box, nat);

  // Linha base dos pés do personagem dentro da caixa quadrada (box x box)
  const feetY = (box + dh) / 2;
  const feetPercentY = Math.max(10, Math.min(100, (feetY / Math.max(1, box)) * 100));

  // Modo Silhueta: projeta o recorte fiel no chão incluindo todas as peças de movimento (asas, capas, etc.)
  const isVideo = url ? (url.startsWith('data:video/') || /\.(mp4|webm|ogg|mov|mkv)(\?|$)/i.test(url)) : false;
  if (shape === 'silhouette' && url && !isVideo) {
    const hasMotionLayers = Boolean(
      motionLayers &&
      motionLayers.length > 0 &&
      motionLayers.some((l) => !l.isBaseAsset && l.pngUrl && l.visible !== false)
    );

    const child = hasMotionLayers
      ? React.createElement(MotionAssetCanvas, {
          src: url,
          motionLayers,
          isNpcBounce,
          width: box,
          height: box,
          className: 'w-full h-full object-contain pointer-events-none',
        })
      : React.createElement('img', {
          src: getRenderableAssetUrl(url),
          alt: '',
          loading: 'lazy',
          decoding: 'async',
          className: 'w-full h-full object-contain pointer-events-none',
          draggable: false,
        });

    return React.createElement(
      'div',
      {
        className: 'absolute pointer-events-none select-none z-0',
        style: {
          left: `calc(50% + ${offsetX}px)`,
          top: `calc(50% + ${offsetY}px)`,
          width: box,
          height: box,
          transformOrigin: `50% ${feetPercentY}%`,
          transform: `translate(-50%, -50%) scaleY(0.30) rotate(${rotation * 0.2}deg)`,
          filter: `brightness(0) blur(${Math.max(0.5, blur)}px)`,
          opacity: Math.max(0.05, Math.min(1, opacity)),
        },
      },
      child
    );
  }

  // Modo elipse suave cravado sob os pés / pivô calibrado do personagem
  // Zero FBO allocation: expande o gradiente radial proporcionalmente ao blur sem criar textura de filtro extra na GPU
  const finalX = pivotX !== undefined ? box * pivotX : box * 0.5;
  const feetBase = url ? feetY - 2 : box * 0.94;
  const finalY = (pivotY !== undefined && pivotY > 0.65) ? box * pivotY : feetBase;
  const blurPad = Math.max(1, blur) * 2.2;
  const shadowWidth = Math.max(16, (dw || box * 0.65) * widthK) + blurPad * 2;
  const shadowHeight = Math.max(6, (dh || box * 0.65) * 0.20) + blurPad;

  return React.createElement('div', {
    className: 'absolute pointer-events-none select-none z-0',
    style: {
      left: `calc(${finalX}px + ${offsetX}px)`,
      top: `calc(${finalY}px - ${offsetY}px)`,
      transform: 'translate(-50%, -50%)',
      width: shadowWidth,
      height: shadowHeight,
      borderRadius: '50%',
      background:
        'radial-gradient(ellipse at center, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 38%, rgba(0,0,0,0.18) 65%, rgba(0,0,0,0) 92%)',
      opacity: Math.max(0.05, Math.min(1, opacity)),
    },
  });
};
