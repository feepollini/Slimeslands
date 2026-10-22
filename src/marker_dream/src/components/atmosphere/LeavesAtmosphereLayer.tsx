import React, { useMemo } from 'react';
import { LeavesConfig } from '../../types/map';
import { getLeafGroupSvgs } from '../../data/defaultAtmosphereAssets';

interface LeavesAtmosphereProps {
  leavesConfig: LeavesConfig | undefined;
  isLeavesActive: boolean;
  scale: number;
  totalMapWidth: number;
  totalMapHeight: number;
}

export const LeavesGroundLayer: React.FC<LeavesAtmosphereProps> = ({
  leavesConfig,
  isLeavesActive,
  scale,
  totalMapWidth,
  totalMapHeight,
}) => {
  const leaves = useMemo(() => {
    if (!isLeavesActive) return [];
    const customPngs = leavesConfig?.customLeafPngs && leavesConfig.customLeafPngs.length > 0
      ? leavesConfig.customLeafPngs
      : [];
    const leafSources = customPngs.length > 0
      ? customPngs
      : getLeafGroupSvgs(leavesConfig?.preset, leavesConfig?.customTint);

    const userCount = leavesConfig?.leafCount;
    const leafCount = userCount ?? Math.max(16, Math.min(32, Math.round((totalMapWidth * totalMapHeight) / 95000)));

    const baseSize = leavesConfig?.baseSize ?? 36;
    const randomScalePercent = leavesConfig?.randomScalePercent ?? 60;
    const baseSpeed = leavesConfig?.speed ?? 4.2;
    const maxOpacity = leavesConfig?.opacity ?? 0.95;

    return Array.from({ length: leafCount }).map((_, i) => {
      const posX = ((i * 223 + 37) % Math.max(60, totalMapWidth - 60)) * scale;
      const posY = ((i * 349 + 71) % Math.max(60, totalMapHeight - 60)) * scale;
      const duration = baseSpeed + ((i * 11) % 5) * (baseSpeed * 0.08);
      const delay = -1 * (((i * 17) % 12) * (baseSpeed * 0.08));
      const randNorm = (((i * 47 + (i % 7) * 31) % 100) / 50) - 1.0;
      const scaleMultiplier = Math.max(0.35, 1.0 + randNorm * (randomScalePercent / 100));
      const size = Math.max(14, Math.round(baseSize * scaleMultiplier));
      const svgUrl = leafSources[i % leafSources.length];

      return {
        id: `ground-leaf-${i}`,
        posX,
        posY,
        size,
        duration,
        delay,
        svgUrl,
        opacity: maxOpacity,
      };
    });
  }, [
    isLeavesActive,
    leavesConfig?.customLeafPngs,
    leavesConfig?.preset,
    leavesConfig?.customTint,
    leavesConfig?.leafCount,
    leavesConfig?.baseSize,
    leavesConfig?.randomScalePercent,
    leavesConfig?.speed,
    leavesConfig?.opacity,
    totalMapWidth,
    totalMapHeight,
    scale,
  ]);

  if (!isLeavesActive || leaves.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[6] overflow-hidden">
      {leaves.map((leaf) => (
        <div
          key={leaf.id}
          className="absolute pointer-events-none select-none animate-autumn-leaf-ground"
          style={{
            left: `${leaf.posX}px`,
            top: `${leaf.posY}px`,
            width: `${leaf.size}px`,
            height: `${leaf.size}px`,
            animationDuration: `${leaf.duration}s`,
            animationDelay: `${leaf.delay}s`,
          }}
        >
          <img
            src={leaf.svgUrl}
            alt="Leaf on Ground"
            className="w-full h-full object-contain pointer-events-none select-none"
          />
        </div>
      ))}
    </div>
  );
};

export const LeavesAirLayer: React.FC<LeavesAtmosphereProps> = ({
  leavesConfig,
  isLeavesActive,
  scale,
  totalMapWidth,
  totalMapHeight,
}) => {
  const leaves = useMemo(() => {
    if (!isLeavesActive) return [];
    const customPngs = leavesConfig?.customLeafPngs && leavesConfig.customLeafPngs.length > 0
      ? leavesConfig.customLeafPngs
      : [];
    const leafSources = customPngs.length > 0
      ? customPngs
      : getLeafGroupSvgs(leavesConfig?.preset, leavesConfig?.customTint);

    const userCount = leavesConfig?.leafCount;
    const leafCount = userCount ?? Math.max(16, Math.min(32, Math.round((totalMapWidth * totalMapHeight) / 95000)));

    const baseSize = leavesConfig?.baseSize ?? 36;
    const randomScalePercent = leavesConfig?.randomScalePercent ?? 60;
    const baseSpeed = leavesConfig?.speed ?? 4.2;
    const maxOpacity = leavesConfig?.opacity ?? 0.95;

    return Array.from({ length: leafCount }).map((_, i) => {
      const posX = ((i * 223 + 37) % Math.max(60, totalMapWidth - 60)) * scale;
      const posY = ((i * 349 + 71) % Math.max(60, totalMapHeight - 60)) * scale;
      const duration = baseSpeed + ((i * 11) % 5) * (baseSpeed * 0.08);
      const delay = -1 * (((i * 17) % 12) * (baseSpeed * 0.08));
      const randNorm = (((i * 47 + (i % 7) * 31) % 100) / 50) - 1.0;
      const scaleMultiplier = Math.max(0.35, 1.0 + randNorm * (randomScalePercent / 100));
      const size = Math.max(14, Math.round(baseSize * scaleMultiplier));
      const svgUrl = leafSources[i % leafSources.length];

      return {
        id: `air-leaf-${i}`,
        posX,
        posY,
        size,
        duration,
        delay,
        svgUrl,
        opacity: maxOpacity,
      };
    });
  }, [
    isLeavesActive,
    leavesConfig?.customLeafPngs,
    leavesConfig?.preset,
    leavesConfig?.customTint,
    leavesConfig?.leafCount,
    leavesConfig?.baseSize,
    leavesConfig?.randomScalePercent,
    leavesConfig?.speed,
    leavesConfig?.opacity,
    totalMapWidth,
    totalMapHeight,
    scale,
  ]);

  if (!isLeavesActive || leaves.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[9940] overflow-hidden">
      {leaves.map((leaf) => (
        <div
          key={leaf.id}
          className="absolute pointer-events-none select-none animate-autumn-leaf-air"
          style={{
            left: `${leaf.posX}px`,
            top: `${leaf.posY}px`,
            width: `${leaf.size}px`,
            height: `${leaf.size}px`,
            animationDuration: `${leaf.duration}s`,
            animationDelay: `${leaf.delay}s`,
          }}
        >
          <img
            src={leaf.svgUrl}
            alt="Leaf in Air"
            className="w-full h-full object-contain pointer-events-none select-none drop-shadow-[0_8px_10px_rgba(0,0,0,0.4)]"
          />
        </div>
      ))}
    </div>
  );
};
