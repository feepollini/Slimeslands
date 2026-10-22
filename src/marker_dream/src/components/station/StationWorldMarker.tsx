import React from 'react';
import { MapMarker } from '../../types/map';
import { DEFAULT_INCUBATOR_SVG } from '../../data/defaultStationAssets';
import { MotionAssetCanvas } from '../MotionAssetCanvas';
import { EffectType } from '../../utils/motionCanvasEngine';
import { Lock } from 'lucide-react';

interface StationWorldMarkerProps {
  marker: MapMarker;
  markerSize: number;
  isSelected?: boolean;
}

export const StationWorldMarker: React.FC<StationWorldMarkerProps> = ({
  marker,
  markerSize,
  isSelected,
}) => {
  const station = marker.stationConfig;
  const baseImg = marker.customIconPng || station?.baseAssetPng || DEFAULT_INCUBATOR_SVG;
  const slots = station?.slots || [];
  const isCompleted = station?.processStatus === 'completed';
  const isRunning = station?.processStatus === 'running';
  const isLocked = Boolean(
    station?.unlockCondition &&
      station.unlockCondition.type !== 'always' &&
      !station.unlockCondition.isUnlocked
  );

  // markerSize representa o tamanho visual calculado no mundo
  const currentBaseSize = markerSize;
  const baseEffect = (station?.baseMotionEffect || marker.effect || 'none') as EffectType;

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center select-none pointer-events-auto transition-transform ${
        isSelected ? 'scale-105 drop-shadow-[0_0_10px_rgba(245,158,11,0.9)]' : 'hover:scale-102'
      }`}
      style={{
        width: currentBaseSize,
        height: currentBaseSize,
        minWidth: currentBaseSize,
        minHeight: currentBaseSize,
      }}
    >
      {/* Keyframe para animação de trepidação orgânica meio jelly (apenas 1 ou 2 ovos por vez) */}
      <style>{`
        @keyframes eggOrganicJelly {
          0%, 62%, 100% {
            transform: translate(-50%, -50%) rotate(var(--egg-rot, 0deg)) scale(1, 1);
          }
          67% {
            transform: translate(-50%, -50%) rotate(calc(var(--egg-rot, 0deg) - 4deg)) scale(1.15, 0.88);
          }
          72% {
            transform: translate(-50%, -50%) rotate(calc(var(--egg-rot, 0deg) + 6deg)) scale(0.88, 1.15);
          }
          77% {
            transform: translate(-50%, -50%) rotate(calc(var(--egg-rot, 0deg) - 3deg)) scale(1.08, 0.94);
          }
          83% {
            transform: translate(-50%, -50%) rotate(calc(var(--egg-rot, 0deg) + 2deg)) scale(0.96, 1.04);
          }
          89% {
            transform: translate(-50%, -50%) rotate(var(--egg-rot, 0deg)) scale(1, 1);
          }
        }
      `}</style>

      {/* 1. Halo ou Brilho de Calor se a Chocadeira estiver Aquecendo / Processando */}
      {isRunning && (
        <div
          className="absolute inset-[-15%] rounded-full pointer-events-none animate-pulse -z-10"
          style={{
            background:
              'radial-gradient(circle, rgba(251, 146, 60, 0.45) 0%, rgba(245, 158, 11, 0.2) 50%, transparent 75%)',
            filter: 'blur(6px)',
          }}
        />
      )}

      {/* 2. Asset Base da Estação / Chocadeira (Com Motion Canvas ou PNG puro) - Z-Index 10 */}
      <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none">
        {baseEffect !== 'none' ? (
          <MotionAssetCanvas
            src={baseImg}
            alt={marker.name}
            effect={baseEffect}
            speed={station?.baseMotionSpeed || marker.effectSpeed || 1.0}
            intensity={station?.baseMotionIntensity || marker.effectIntensity || 1.0}
            strokes={marker.effectStrokes}
            motionLayers={marker.motionLayers}
            width={Math.round(currentBaseSize)}
            height={Math.round(currentBaseSize)}
            className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.55)] pointer-events-none"
          />
        ) : (
          <img
            src={baseImg}
            alt={marker.name}
            className="w-full h-full object-contain filter drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)] pointer-events-none"
            style={{
              transform: `rotate(${marker.rotation || 0}deg) scale(${marker.flipX ? -1 : 1}, ${marker.flipY ? -1 : 1})`,
            }}
          />
        )}
      </div>

      {/* 3. Sub-Assets Aplicados nos Slots Sobre a Chocadeira - Z-Index >= 35 (Sempre à Frente da Base) */}
      {!isCompleted &&
        slots.map((slot, idx) => {
          if (!slot.currentAssetPng) return null;
          const slotScale = slot.scale ?? 0.52;
          const subSize = currentBaseSize * slotScale;

          // Conversão de offset relativo (-80 a 80 em base 100) para o tamanho atual da base
          const offX = (slot.offsetX / 100) * currentBaseSize;
          const offY = (slot.offsetY / 100) * currentBaseSize;

          return (
            <div
              key={slot.id}
              className="absolute pointer-events-none transition-all duration-300"
              style={{
                left: `calc(50% + ${offX}px)`,
                top: `calc(50% + ${offY}px)`,
                width: subSize,
                height: subSize,
                transform: `translate(-50%, -50%) rotate(${slot.rotation || 0}deg)`,
                zIndex: 35 + idx + Math.max(0, Math.round(offY + 50)),
                animation: isRunning ? 'eggOrganicJelly 4.5s cubic-bezier(0.34, 1.56, 0.64, 1) infinite' : undefined,
                animationDelay: isRunning ? `${(idx * 1.5) % 4.5}s` : undefined,
                ['--egg-rot' as any]: `${slot.rotation || 0}deg`,
              }}
            >
              <img
                src={slot.currentAssetPng}
                alt={slot.currentAssetName || 'Item no Slot'}
                className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.65)]"
              />
            </div>
          );
        })}

      {/* 4. Criatura / Item Resultante Surgido Sobre a Estação Após o Tempo */}
      {isCompleted && station?.resultAssetPng && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 animate-bounce"
          style={{
            width: markerSize * 0.85,
            height: markerSize * 0.85,
            animationDuration: '1.2s',
          }}
        >
          {/* Brilho divino de eclosão */}
          <div
            className="absolute inset-[-20%] rounded-full pointer-events-none animate-spin"
            style={{
              background:
                'radial-gradient(circle, rgba(254, 240, 138, 0.5) 0%, rgba(251, 191, 36, 0.2) 40%, transparent 70%)',
              filter: 'blur(4px)',
              animationDuration: '10s',
            }}
          />
          <img
            src={station.resultAssetPng}
            alt={station.resultAssetName || 'Resultado'}
            className="w-full h-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.7)]"
          />
        </div>
      )}

      {/* 5. Badge Visual de Bloqueio (Se a estação estiver trancada por Level/Custo/Quest) */}
      {isLocked && (
        <div
          className="absolute -top-1 -right-1 z-30 w-6 h-6 rounded-full bg-slate-950/90 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-md animate-pulse"
          title={station?.unlockCondition?.lockedMessage || 'Bloqueado'}
        >
          <Lock className="w-3 h-3 text-amber-400" />
        </div>
      )}
    </div>
  );
};
