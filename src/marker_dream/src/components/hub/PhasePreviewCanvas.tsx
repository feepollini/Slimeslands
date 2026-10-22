import React, { useEffect, useRef, useState } from 'react';
import type { MapProject } from '../../types/map';
import { Layers } from 'lucide-react';
import { getUniqueAssetKey } from '../../utils/assetRegistry';

interface Props {
  projectData?: MapProject;
  thumbnailPng?: string;
  className?: string;
}

const previewImageCache = new Map<string, HTMLImageElement>();

function getCachedPreviewImage(url: string, onLoad?: () => void): HTMLImageElement {
  const key = getUniqueAssetKey(url);
  let img = previewImageCache.get(key);
  if (!img) {
    img = new Image();
    img.src = url;
    previewImageCache.set(key, img);
  }
  if (!img.complete && onLoad) {
    img.addEventListener('load', onLoad, { once: true });
  }
  return img;
}

export const PhasePreviewCanvas: React.FC<Props> = ({
  projectData,
  thumbnailPng,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderFailed, setRenderFailed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [redrawTick, setRedrawTick] = useState(0);

  // Lazy mount do contexto Canvas2D apenas quando o card entra na viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
          } else {
            setIsVisible(false);
          }
        }
      },
      { rootMargin: '160px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (thumbnailPng || !isVisible || !projectData) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isMounted = true;
    const triggerRedraw = () => {
      if (isMounted) setRedrawTick((t) => t + 1);
    };

    try {
      const isExtended = projectData.canvasKind === 'extended';
      const biomes = projectData.biomes || [];
      const subBiomes = projectData.subBiomes || [];
      const markers = projectData.markers || [];
      const player = projectData.player;

      let worldW = projectData.mapWidth || 768;
      let worldH = 1000;

      if (isExtended) {
        let maxH = 400;
        let totalW = 0;
        for (const sb of subBiomes) {
          totalW += (sb.tileWidth || 400) + 20;
          if ((sb.tileHeight || 400) > maxH) maxH = sb.tileHeight || 400;
        }
        worldW = Math.max(300, totalW);
        worldH = Math.max(300, maxH);
      } else {
        let totalH = 0;
        for (const b of biomes) {
          const rep = b.tileRepeatCount || (b as any).repeatCount || 1;
          totalH += (b.tileHeight || 256) * rep;
        }
        worldH = Math.max(400, totalH);
      }

      const canvasW = canvas.width;
      const canvasH = canvas.height;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvasW, canvasH);

      const scaleX = canvasW / worldW;
      const scaleY = canvasH / worldH;
      const scale = Math.min(scaleX, scaleY);

      const renderW = worldW * scale;
      const renderH = worldH * scale;
      const offsetX = (canvasW - renderW) / 2;
      const offsetY = (canvasH - renderH) / 2;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // 1. Desenha Biomas ou SubBiomas usando cache de texturas
      if (isExtended && subBiomes.length > 0) {
        let curX = 0;
        for (const sb of subBiomes) {
          const sbW = sb.tileWidth || 400;
          const sbH = sb.tileHeight || 400;
          ctx.fillStyle = sb.baseColor || '#1e293b';
          ctx.fillRect(curX, 0, sbW, sbH);

          if (sb.tilePng) {
            const img = getCachedPreviewImage(sb.tilePng, triggerRedraw);
            if (img.complete && img.naturalWidth > 0) {
              ctx.drawImage(img, curX, 0, sbW, sbH);
            }
          }

          ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
          ctx.lineWidth = 2;
          ctx.strokeRect(curX, 0, sbW, sbH);

          curX += sbW + 20;
        }
      } else if (biomes.length > 0) {
        let curY = 0;
        for (const b of biomes) {
          const bH = (b.tileHeight || 256) * (b.tileRepeatCount || 1);
          ctx.fillStyle = b.baseColor || '#14532d';
          ctx.fillRect(0, curY, worldW, bH);

          if (b.tilePng) {
            const img = getCachedPreviewImage(b.tilePng, triggerRedraw);
            if (img.complete && img.naturalWidth > 0) {
              const ptrn = ctx.createPattern(img, 'repeat');
              if (ptrn) {
                ctx.fillStyle = ptrn;
                ctx.fillRect(0, curY, worldW, bH);
              }
            }
          }

          curY += bH;
        }
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, worldW, worldH);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
        ctx.lineWidth = 1;
        const step = 40;
        for (let x = 0; x <= worldW; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, worldH);
          ctx.stroke();
        }
        for (let y = 0; y <= worldH; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(worldW, y);
          ctx.stroke();
        }
      }

      // 2. Desenha Marcadores do Cenário (sem shadowBlur pesado se houver muitos)
      const useGlow = markers.length < 40;
      for (const m of markers) {
        const mx = m.x;
        const my = m.y;
        const sz = Math.max(8, (m.size || 60) * 0.7);

        ctx.save();
        ctx.beginPath();
        ctx.arc(mx, my, sz / 2, 0, Math.PI * 2);
        ctx.fillStyle = m.color || (m.type === 'npc' ? '#10b981' : '#f59e0b');
        if (useGlow) {
          ctx.shadowColor = m.color || '#f59e0b';
          ctx.shadowBlur = 6;
        }
        ctx.fill();
        ctx.restore();
      }

      // 3. Desenha Posição do Jogador
      if (player) {
        const px = player.x || worldW / 2;
        const py = player.y || 100;
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();

      const grad = ctx.createRadialGradient(
        canvasW / 2,
        canvasH / 2,
        canvasW * 0.35,
        canvasW / 2,
        canvasH / 2,
        canvasW * 0.75
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(2, 6, 23, 0.65)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasW, canvasH);
    } catch (err) {
      if (isMounted) setRenderFailed(true);
    }

    return () => {
      isMounted = false;
    };
  }, [projectData, thumbnailPng, isVisible, redrawTick]);

  if (thumbnailPng && !renderFailed) {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-slate-950 flex items-center justify-center ${className}`}
      >
        <img
          src={thumbnailPng}
          alt="Preview da Fase"
          loading="lazy"
          className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-105"
          onError={() => setRenderFailed(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-slate-950 flex items-center justify-center ${className}`}
    >
      {isVisible && (
        <canvas
          ref={canvasRef}
          width={320}
          height={180}
          className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
      {(!projectData?.biomes || projectData.biomes.length === 0) &&
        (!projectData?.subBiomes || projectData.subBiomes.length === 0) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 pointer-events-none text-slate-500">
            <Layers className="w-6 h-6 stroke-1 text-slate-400" />
            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400">
              Canvas em Branco
            </span>
          </div>
        )}
    </div>
  );
};
