import React from 'react';
import { ActiveCombatVfx, ActiveProjectile, ActiveSpeechBalloon } from '../../utils/npcActionEngine';
import { VideoAssetCanvas } from '../video/VideoAssetCanvas';
import { MotionAssetCanvas } from '../MotionAssetCanvas';
import { AttackAssetConfig } from '../../types/map';

interface ActionNpcCombatOverlayProps {
  vfxList: ActiveCombatVfx[];
  projectiles: ActiveProjectile[];
  speechBalloons: Map<string, ActiveSpeechBalloon>;
  scale?: number;
  originOffsetX?: number; // Para sub-biomas extended
}

// Renderizador modular de asset de ataque (Vídeo com Chroma Key, Motion Canvas ou PNG)
const RenderAttackAsset: React.FC<{
  asset: AttackAssetConfig;
  size: number;
  className?: string;
  playbackSpeed?: number;
}> = ({ asset, size, className = '', playbackSpeed }) => {
  if (asset.type === 'video' && asset.url) {
    const effectiveSpeed = playbackSpeed || asset.videoChromaKey?.videoSpeed || 1.0;
    return (
      <VideoAssetCanvas
        key={asset.url}
        videoUrl={asset.url}
        chromaKey={{
          enabled: asset.videoChromaKey?.enabled ?? true,
          color: asset.videoChromaKey?.color || '#00ff00',
          tolerance: asset.videoChromaKey?.tolerance ?? 35,
          smoothness: asset.videoChromaKey?.smoothness ?? 12,
          cropSquare: asset.videoChromaKey?.cropSquare,
          cropOffsetX: asset.videoChromaKey?.cropOffsetX,
          cropOffsetY: asset.videoChromaKey?.cropOffsetY,
          scale: asset.videoChromaKey?.scale,
          flipH: asset.videoChromaKey?.flipH,
          videoSpeed: effectiveSpeed,
        }}
        className={`w-full h-full object-contain ${className}`}
      />
    );
  }

  if (asset.type === 'motion' && (asset.url || (asset.motionLayers && asset.motionLayers.length > 0))) {
    return (
      <MotionAssetCanvas
        src={asset.url || ''}
        motionLayers={asset.motionLayers}
        isNpcBounce={false}
        width={Math.round(size)}
        height={Math.round(size)}
        className={`w-full h-full object-contain ${className}`}
      />
    );
  }

  if (asset.url) {
    return (
      <img
        src={asset.url}
        alt={asset.name || 'attack asset'}
        className={`w-full h-full object-contain ${className}`}
      />
    );
  }

  return null;
};

export const ActionNpcCombatOverlay: React.FC<ActionNpcCombatOverlayProps> = ({
  vfxList,
  projectiles,
  speechBalloons,
  scale = 1.0,
  originOffsetX = 0,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-visible">
      {/* 1. Projéteis em Voo */}
      {projectiles.map((p) => {
        const renderX = (originOffsetX + p.x) * scale;
        const renderY = p.y * scale;
        const sizePx = Math.max(14, (p.attackAsset?.size || p.size) * (p.attackAsset?.scale || 1.0) * scale);
        const rotDeg = (p.angle * 180) / Math.PI;

        return (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
            style={{
              left: `${renderX}px`,
              top: `${renderY}px`,
              width: `${sizePx}px`,
              height: `${sizePx}px`,
              transform: `translate(-50%, -50%) rotate(${rotDeg}deg)`,
            }}
          >
            {p.attackAsset && p.attackAsset.type !== 'none' && p.attackAsset.url ? (
              <RenderAttackAsset
                asset={p.attackAsset}
                size={sizePx}
                playbackSpeed={p.attackAsset.videoChromaKey?.videoSpeed}
                className="filter drop-shadow(0 2px 8px rgba(0,0,0,0.6))"
              />
            ) : p.projectileType === 'custom' && p.customUrl ? (
              <img
                src={p.customUrl}
                alt="projétil"
                className="w-full h-full object-contain filter drop-shadow(0 2px 6px rgba(0,0,0,0.5))"
              />
            ) : p.projectileType === 'fireball' ? (
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Rastro de fogo */}
                <div className="absolute -left-3 w-4 h-2 bg-gradient-to-r from-transparent to-amber-500 rounded-full blur-xs opacity-80" />
                {/* Núcleo flamejante */}
                <div className="w-full h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-200 shadow-[0_0_12px_#f59e0b] animate-pulse" />
              </div>
            ) : p.projectileType === 'magic_orb' ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-300 shadow-[0_0_14px_#818cf8] animate-pulse" />
                <div className="absolute w-2/3 h-2/3 rounded-full bg-white opacity-90 blur-xs" />
              </div>
            ) : p.projectileType === 'arrow' ? (
              <div className="w-full h-1 bg-amber-200 relative flex items-center justify-end shadow-md">
                <div className="w-2.5 h-2.5 bg-slate-200 rotate-45 transform translate-x-1 border-r border-t border-slate-700" />
                <div className="absolute -left-1 w-2 h-2 bg-red-500 clip-feather" />
              </div>
            ) : p.projectileType === 'rock' ? (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-stone-400 to-stone-700 border border-stone-800 shadow-md transform rotate-12" />
            ) : p.projectileType === 'knife' ? (
              <div className="w-full h-2 bg-gradient-to-r from-slate-600 via-slate-200 to-white rounded-r shadow-md" />
            ) : (
              // Fallback orb
              <div className="w-full h-full rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
            )}
          </div>
        );
      })}

      {/* 2. Efeitos Visuais 2D de Impacto e Contato */}
      {vfxList.map((vfx) => {
        const renderX = (originOffsetX + vfx.x) * scale;
        const renderY = vfx.y * scale;
        const opacity = Math.max(0, 1 - vfx.progress);
        const assetSize = Math.max(24, (vfx.attackAsset?.size || 48) * (vfx.attackAsset?.scale || 1.0) * scale);

        const customAssetNode = vfx.attackAsset && vfx.attackAsset.type !== 'none' && vfx.attackAsset.url ? (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: `${renderX}px`,
              top: `${renderY}px`,
              width: `${assetSize}px`,
              height: `${assetSize}px`,
              opacity,
              transform: `translate(-50%, -50%) scale(${0.8 + vfx.progress * 0.4})`,
            }}
          >
            <RenderAttackAsset
              asset={vfx.attackAsset}
              size={assetSize}
              playbackSpeed={vfx.attackAsset.videoChromaKey?.videoSpeed}
              className="filter drop-shadow(0 2px 10px rgba(0,0,0,0.7))"
            />
          </div>
        ) : null;

        if (vfx.type === 'slash_arc') {
          const arcScale = (vfx.scale || 1.0) * (0.8 + vfx.progress * 0.4);
          const rotDeg = ((vfx.angle || 0) * 180) / Math.PI;

          return (
            <React.Fragment key={vfx.id}>
              {customAssetNode}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  left: `${renderX}px`,
                  top: `${renderY}px`,
                  transform: `translate(-50%, -50%) rotate(${rotDeg}deg) scale(${arcScale})`,
                  opacity,
                }}
              >
                <svg className="w-20 h-20 overflow-visible" viewBox="0 0 80 80">
                  <path
                    d="M10 70 Q 40 10, 75 25 Q 45 35, 10 70 Z"
                    fill="url(#slashGrad)"
                    filter="drop-shadow(0 0 8px #67e8f9)"
                  />
                  <defs>
                    <linearGradient id="slashGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                      <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </React.Fragment>
          );
        }

        if (vfx.type === 'jump_shockwave') {
          const ringRadius = (30 + vfx.progress * 50) * scale;

          return (
            <React.Fragment key={vfx.id}>
              {customAssetNode}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full border-2 border-amber-300 shadow-[0_0_12px_#f59e0b]"
                style={{
                  left: `${renderX}px`,
                  top: `${renderY}px`,
                  width: `${ringRadius * 2}px`,
                  height: `${ringRadius * 1.3}px`,
                  transform: 'translate(-50%, -50%) rotateX(60deg)',
                  opacity,
                }}
              />
            </React.Fragment>
          );
        }

        if (vfx.type === 'dash_impact' || vfx.type === 'contact_spark') {
          const sparkSize = (24 + vfx.progress * 20) * (vfx.scale || 1.0) * scale;

          return (
            <React.Fragment key={vfx.id}>
              {customAssetNode}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  left: `${renderX}px`,
                  top: `${renderY}px`,
                  width: `${sparkSize}px`,
                  height: `${sparkSize}px`,
                  opacity,
                }}
              >
                <svg className="w-full h-full animate-spin" style={{ animationDuration: '0.4s' }} viewBox="0 0 40 40">
                  {/* Centelhas radiais de contato */}
                  <line x1="20" y1="5" x2="20" y2="35" stroke="#fef08a" strokeWidth="3" strokeLinecap="round" />
                  <line x1="5" y1="20" x2="35" y2="20" stroke="#fef08a" strokeWidth="3" strokeLinecap="round" />
                  <line x1="9" y1="9" x2="31" y2="31" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="31" y1="9" x2="9" y2="31" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="20" cy="20" r="5" fill="#ffffff" filter="drop-shadow(0 0 6px #ffffff)" />
                </svg>
              </div>
            </React.Fragment>
          );
        }

        if (vfx.type === 'damage_number') {
          const driftY = -vfx.progress * 28;

          return (
            <div
              key={vfx.id}
              className="absolute -translate-x-1/2 pointer-events-none select-none font-black text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              style={{
                left: `${renderX}px`,
                top: `${renderY + driftY}px`,
                color: vfx.color || '#ef4444',
                opacity,
                transform: `translate(-50%, 0) scale(${1 + (1 - vfx.progress) * 0.3})`,
              }}
            >
              {vfx.text}
            </div>
          );
        }

        return null;
      })}

      {/* 3. Balões de Fala dos NPCs */}
      {Array.from(speechBalloons.entries()).map(([mId, balloon]) => {
        return null; // Os balões serão posicionados diretamente sobre cada elemento DOM do NPC para sincronia perfeita com o zoom
      })}
    </div>
  );
};
