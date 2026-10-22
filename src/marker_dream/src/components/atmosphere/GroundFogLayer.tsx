import React, { useMemo } from 'react';
import { FogConfig, CloudConfig } from '../../types/map';
import { DEFAULT_FOG_SVG } from '../../data/defaultAtmosphereAssets';

interface GroundFogLayerProps {
  fogConfig: FogConfig | undefined;
  cloudsConfig: CloudConfig | undefined;
  scale: number;
  totalMapWidth: number;
  totalMapHeight: number;
  groundFogLayerRef?: React.RefObject<HTMLDivElement | null> | React.RefObject<HTMLDivElement>;
}

export const GroundFogLayer: React.FC<GroundFogLayerProps> = ({
  fogConfig,
  cloudsConfig,
  scale,
  totalMapWidth,
  totalMapHeight,
  groundFogLayerRef,
}) => {
  const isFogEnabled = (fogConfig?.enabled !== false && fogConfig?.enabled === true) ||
    (cloudsConfig?.enabled !== false && cloudsConfig?.showGroundFog !== false);

  const proceduralGroundFog = useMemo(() => {
    if (!isFogEnabled) return [];

    const fogPngs = fogConfig?.customFogPngs && fogConfig.customFogPngs.length > 0 
      ? fogConfig.customFogPngs 
      : (fogConfig?.customFogPng ? [fogConfig.customFogPng] : []);
    
    const density = Math.max(1, Math.min(10, fogConfig?.fogCount ?? 5));
    const fogCount = Math.max(3, Math.min(18, Math.round(density * 1.6)));
    const fogSpeedSec = (fogConfig?.speed ?? 32);
    const userOpacity = fogConfig?.opacity ?? 0.22;
    const tintColor = fogConfig?.tintColor || '#ffffff';

    const cols = Math.max(2, Math.ceil(Math.sqrt(fogCount * (totalMapWidth / totalMapHeight))));
    const rows = Math.max(2, Math.ceil(fogCount / cols));
    const cellW = totalMapWidth / cols;
    const cellH = totalMapHeight / rows;

    return Array.from({ length: fogCount }).map((_, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols) % rows;
      const posX = (c * cellW + (cellW * 0.1) + ((i * 79) % (cellW * 0.7))) * scale;
      const posY = (r * cellH + (cellH * 0.1) + ((i * 53) % (cellH * 0.7))) * scale;
      const seedSize = i % 3;
      const delay = -1 * (i * (fogSpeedSec / Math.max(1, fogCount)));
      const opacity = userOpacity * (0.8 + ((i % 3) * 0.15));
      const pngUrl = fogPngs.length > 0 ? fogPngs[i % fogPngs.length] : DEFAULT_FOG_SVG;

      return {
        id: `ground-fog-${i}`,
        posY,
        posX,
        width: seedSize === 0 ? '360px' : seedSize === 1 ? '480px' : '620px',
        height: seedSize === 0 ? '120px' : seedSize === 1 ? '160px' : '210px',
        duration: fogSpeedSec + (i % 8),
        delay,
        opacity,
        pngUrl,
        tintColor,
      };
    });
  }, [
    isFogEnabled,
    fogConfig?.fogCount,
    fogConfig?.opacity,
    fogConfig?.speed,
    fogConfig?.tintColor,
    fogConfig?.customFogPngs,
    fogConfig?.customFogPng,
    totalMapWidth,
    totalMapHeight,
    scale,
  ]);

  if (!isFogEnabled || proceduralGroundFog.length === 0) {
    return null;
  }

  return (
    <div 
      ref={groundFogLayerRef}
      className="absolute inset-0 pointer-events-none z-[8] overflow-hidden"
    >
      {proceduralGroundFog.map((fog) => (
        <div
          key={fog.id}
          className="absolute animate-cloud-float pointer-events-none"
          style={{
            top: `${fog.posY}px`,
            left: `${fog.posX}px`,
            width: fog.width,
            height: fog.height,
            animationDuration: `${fog.duration}s`,
            animationDelay: `${fog.delay}s`,
            opacity: fog.opacity,
            mixBlendMode: 'screen',
            willChange: 'transform',
          }}
        >
          <img 
            src={fog.pngUrl} 
            alt="Fog PNG" 
            className="w-full h-full object-contain filter brightness-110 pointer-events-none select-none" 
          />
        </div>
      ))}
    </div>
  );
};
