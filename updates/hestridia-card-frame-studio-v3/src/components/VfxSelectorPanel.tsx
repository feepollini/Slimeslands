import React from 'react';
import {
  Flame,
  Snowflake,
  Skull,
  Droplets,
  Swords,
  Zap,
  Ban,
  Play,
  Eye,
} from 'lucide-react';
import { CardData } from '../types/card';
import { SHOWCASE_VFX_PRESETS, ShowcaseVfxType } from '../types/vfx';

interface VfxSelectorPanelProps {
  card: CardData;
  onUpdateCard: (updater: (prev: CardData) => CardData) => void;
  onTriggerShowcaseWithVfx: (vfxType: ShowcaseVfxType) => void;
}

export const VfxSelectorPanel: React.FC<VfxSelectorPanelProps> = ({
  card,
  onUpdateCard,
  onTriggerShowcaseWithVfx,
}) => {
  const currentVfx = card.showcaseVfx || 'none';
  const currentIntensity = card.showcaseVfxIntensity ?? 85;

  const renderVfxIcon = (id: ShowcaseVfxType) => {
    switch (id) {
      case 'frost':
        return <Snowflake className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
      case 'hellfire':
        return <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
      case 'venom':
        return <Skull className="w-3.5 h-3.5 text-lime-400 shrink-0" />;
      case 'acid-melt':
        return <Droplets className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case 'dimensional-slash':
        return <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      case 'arcane-storm':
        return <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      default:
        return <Ban className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  };

  return (
    <div className="pt-3 border-t border-slate-800/80 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold text-white block">
            Efeitos VFX Procedurais (No Modo Só Arte / Fullscreen)
          </span>
          <span className="text-[11px] text-slate-400">
            Dispara automaticamente quando o frame expande após 2s (ou ative o preview contínuo)
          </span>
        </div>
        <button
          onClick={() =>
            onUpdateCard((prev) => ({
              ...prev,
              isPremium: true,
              vfxPlayOnNormalView: !prev.vfxPlayOnNormalView,
            }))
          }
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            card.vfxPlayOnNormalView
              ? 'bg-emerald-500/25 border-emerald-400/70 text-emerald-200'
              : 'bg-[#0B0D14] border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Manter o efeito VFX visível mesmo com o frame normal aberto"
        >
          <Eye className="w-3 h-3" />
          {card.vfxPlayOnNormalView ? 'VFX Sempre Visível' : 'Preview Contínuo'}
        </button>
      </div>

      {/* Grid of Procedural VFX Presets */}
      <div className="grid grid-cols-2 gap-1.5">
        {SHOWCASE_VFX_PRESETS.map((preset) => {
          const isSelected = currentVfx === preset.id;
          return (
            <div
              key={preset.id}
              onClick={() =>
                onUpdateCard((prev) => ({
                  ...prev,
                  isPremium: true,
                  showcaseVfx: preset.id,
                }))
              }
              className={`p-2 rounded-lg border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                isSelected
                  ? `bg-gradient-to-r ${preset.badgeBg} shadow-sm`
                  : 'bg-[#0B0D14] border-slate-800/90 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {renderVfxIcon(preset.id)}
                  <span className="text-[11px] font-bold truncate">
                    {preset.shortName}
                  </span>
                </div>
                {preset.id !== 'none' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTriggerShowcaseWithVfx(preset.id);
                    }}
                    className="px-1.5 py-0.5 rounded bg-black/40 hover:bg-black/70 text-[10px] font-semibold text-white flex items-center gap-0.5 shrink-0 cursor-pointer"
                    title="Disparar expansão com este VFX agora"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    Ver
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight line-clamp-2">
                {preset.subtitle}
              </p>
            </div>
          );
        })}
      </div>

      {/* VFX Intensity Slider */}
      {currentVfx !== 'none' && (
        <div className="flex items-center gap-3 pt-1">
          <span className="text-[11px] text-slate-400 whitespace-nowrap">
            Intensidade do VFX:
          </span>
          <input
            type="range"
            min="20"
            max="100"
            step="5"
            value={currentIntensity}
            onChange={(e) =>
              onUpdateCard((prev) => ({
                ...prev,
                showcaseVfxIntensity: Number(e.target.value),
              }))
            }
            className="flex-1 accent-amber-400 cursor-pointer"
          />
          <span className="text-xs font-mono tabular-nums font-bold text-amber-300">
            {currentIntensity}%
          </span>
        </div>
      )}
    </div>
  );
};
