import React, { useMemo } from 'react';
import { CloudConfig } from '../../types/map';
import { DEFAULT_CLOUD_SVG } from '../../data/defaultAtmosphereAssets';

interface SkyCloudsLayerProps {
  cloudsConfig: CloudConfig | undefined;
  scale: number;
  totalMapWidth: number;
  totalMapHeight: number;
  cloudsLayerRef?: React.RefObject<HTMLDivElement | null> | React.RefObject<HTMLDivElement>;
}

export const SkyCloudsLayer: React.FC<SkyCloudsLayerProps> = ({
  cloudsConfig,
  scale,
  totalMapWidth,
  totalMapHeight,
  cloudsLayerRef,
}) => {
  const proceduralSkyClouds = useMemo(() => {
    if (cloudsConfig?.enabled === false || cloudsConfig?.showTopClouds === false) return [];
    
    const cloudPngs = cloudsConfig?.customCloudPngs && cloudsConfig.customCloudPngs.length > 0 
      ? cloudsConfig.customCloudPngs 
      : (cloudsConfig?.customCloudPng ? [cloudsConfig.customCloudPng] : []);

    // Densidade rigorosamente calibrada de 1 a 10 (elimina multiplicações abusivas)
    const density = Math.max(1, Math.min(10, cloudsConfig?.cloudCount || 4));
    const cloudCount = Math.max(3, Math.min(22, Math.round(density * 1.8 + 2)));
    const speedSec = cloudsConfig?.speed ?? 35;
    const randomScalePercent = cloudsConfig?.randomScalePercent ?? 60; // 0% a 200%
    const baseScale = (cloudsConfig?.baseCloudScale ?? 100) / 100; // 0.4 a 3.0

    return Array.from({ length: cloudCount }).map((_, i) => {
      const seedY = (i * 263 + (i % 7) * 97) % Math.max(100, totalMapHeight - 60);
      const seedX = (i * 419 + (i % 11) * 131) % Math.max(100, totalMapWidth - 80);
      const seedSize = (i * 19) % 3;
      const seedPng = (i * 53) % Math.max(1, cloudPngs.length);
      const delay = -1 * (i * (speedSec / Math.max(1, cloudCount)));
      const opacityVal = 0.42 + ((i % 4) * 0.12);

      const posY = seedY * scale;
      const posX = seedX * scale;

      const baseW = seedSize === 0 ? 160 : seedSize === 1 ? 250 : 360;
      const randNorm = (((i * 43 + (i % 7) * 29) % 100) / 50) - 1.0;
      const scaleMultiplier = Math.max(0.2, baseScale * (1.0 + randNorm * (randomScalePercent / 100)));
      const finalWidth = Math.round(baseW * scaleMultiplier);
      const pngUrl = cloudPngs.length > 0 ? cloudPngs[seedPng % cloudPngs.length] : DEFAULT_CLOUD_SVG;

      return {
        id: `cloud-${i}`,
        posY,
        posX,
        finalWidth,
        duration: speedSec + (i % 6),
        delay,
        opacity: opacityVal,
        pngUrl,
      };
    });
  }, [
    cloudsConfig?.enabled,
    cloudsConfig?.showTopClouds,
    cloudsConfig?.customCloudPngs,
    cloudsConfig?.customCloudPng,
    cloudsConfig?.cloudCount,
    cloudsConfig?.speed,
    cloudsConfig?.randomScalePercent,
    cloudsConfig?.baseCloudScale,
    totalMapHeight,
    totalMapWidth,
    scale,
  ]);

  if (cloudsConfig?.enabled === false || cloudsConfig?.showTopClouds === false) {
    return null;
  }

  return (
    <div 
      ref={cloudsLayerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden transition-transform duration-700 ease-in-out"
      style={{ zIndex: 9999 }}
    >
      {proceduralSkyClouds.map((cloud) => (
        <div
          key={cloud.id}
          className="absolute animate-cloud-float filter drop-shadow-sm pointer-events-none"
          style={{
            top: `${cloud.posY}px`,
            left: `${cloud.posX}px`,
            width: `${cloud.finalWidth}px`,
            animationDuration: `${cloud.duration}s`,
            animationDelay: `${cloud.delay}s`,
            opacity: cloud.opacity,
            willChange: 'transform',
          }}
        >
          <img 
            src={cloud.pngUrl} 
            alt="Cloud PNG" 
            className="w-full h-full object-contain pointer-events-none select-none" 
          />
        </div>
      ))}
    </div>
  );
};
