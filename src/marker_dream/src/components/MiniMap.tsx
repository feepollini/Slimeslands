import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { MapProject } from '../types/map';
import { getBiomeSegmentSpans, getTotalMapHeight } from '../utils/mapMath';
import { Compass } from 'lucide-react';

interface Props {
  project: MapProject;
  scrollY: number;
  viewportHeight: number;
  onNavigateY: (targetY: number) => void;
}

export const MiniMap: React.FC<Props> = ({
  project,
  scrollY,
  viewportHeight,
  onNavigateY,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const spans = useMemo(() => getBiomeSegmentSpans(project.biomes), [project.biomes]);
  const totalMapHeight = Math.max(100, getTotalMapHeight(project.biomes));
  const totalMapWidth = Math.max(100, project.mapWidth || 768);

  const miniHeight = 380;
  const scaleY = totalMapHeight > 0 ? miniHeight / totalMapHeight : 1;

  const safeScrollY = isNaN(scrollY) ? 0 : scrollY;
  const safeViewportH = isNaN(viewportHeight) ? 600 : viewportHeight;

  const viewportIndicatorTop = Math.max(0, Math.min(miniHeight - 16, safeScrollY * scaleY));
  const viewportIndicatorHeight = Math.max(16, Math.min(miniHeight, safeViewportH * scaleY));

  const handleSeek = useCallback(
    (clientY: number) => {
      if (!containerRef.current || scaleY <= 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clickY = Math.max(0, Math.min(rect.height, clientY - rect.top));
      const targetWorldY = clickY / scaleY;
      if (isFinite(targetWorldY)) {
        onNavigateY(Math.max(0, Math.min(totalMapHeight, targetWorldY)));
      }
    },
    [scaleY, totalMapHeight, onNavigateY]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    handleSeek(e.clientY);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleSeek(e.clientY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleSeek]);

  return (
    <div className="flex flex-col items-center select-none">
      <div className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
        <Compass className="w-3 h-3 text-amber-400" />
        <span>Radar</span>
      </div>

      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className={`relative w-12 h-[380px] rounded-xl bg-black border border-zinc-800 overflow-hidden cursor-ns-resize shadow-inner transition-colors ${
          isDragging ? 'ring-2 ring-amber-400/50 border-amber-500/80' : 'hover:border-zinc-750'
        }`}
        title="Clique ou arraste para controlar a rolagem simultânea das duas telas"
      >
        {/* Biome color segments */}
        {spans.map((span) => {
          const segTop = span.startY * scaleY;
          const segH = span.height * scaleY;

          return (
            <div
              key={span.biome.id}
              className="absolute left-0 right-0 border-b border-black/30"
              style={{
                top: segTop,
                height: segH,
                backgroundColor: span.biome.baseColor,
              }}
              title={`${span.biome.name} (${span.biome.tileRepeatCount}x)`}
            />
          );
        })}

        {/* Marker points */}
        {project.markers.map((m) => (
          <div
            key={m.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-black shadow-xs pointer-events-none"
            style={{
              left: `${(m.x / totalMapWidth) * 100}%`,
              top: m.y * scaleY,
              backgroundColor: m.color,
            }}
          />
        ))}

        {/* Player / Spawn Indicator on Radar */}
        {(() => {
          const px = project.player?.x ?? project.spawnConfig?.targetX ?? 384;
          const py = project.player?.y ?? project.spawnConfig?.targetY ?? 100;
          const top = py * scaleY;
          const left = `${Math.max(8, Math.min(92, (px / totalMapWidth) * 100))}%`;

          return (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center justify-center"
              style={{ top, left }}
              title={`Player Spawn (${Math.round(px)}, ${Math.round(py)})`}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border border-black shadow-[0_0_8px_rgba(52,211,153,0.9)] flex items-center justify-center animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-black" />
              </div>
            </div>
          );
        })()}

        {/* Visible camera viewport box */}
        <div
          className="absolute left-0 right-0 border-2 border-amber-400 bg-amber-400/20 rounded pointer-events-none transition-all shadow-[0_0_8px_rgba(245,158,11,0.3)]"
          style={{
            top: viewportIndicatorTop,
            height: viewportIndicatorHeight,
          }}
        >
          {/* Linha central do retículo no indicador de câmera */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[1px] bg-amber-300/80" />
        </div>
      </div>
      <span className="text-[9px] text-zinc-500 font-mono mt-1 text-center">
        {Math.round(scrollY)}m
      </span>
    </div>
  );
};
