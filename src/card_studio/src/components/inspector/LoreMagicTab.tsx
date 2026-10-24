import React from 'react';
import { CardData } from '../../types/card';
import { Sparkles, Shield, Flame, Check } from 'lucide-react';
import {
  FORGE_PASSIVE_ABILITIES,
  FORGE_ACTIVE_SKILLS,
  ForgePassiveAbility,
  ForgeActiveSkill,
} from '../../utils/forgeAbilitiesCatalog';

interface Props {
  card: CardData;
  onChange: (updates: Partial<CardData>) => void;
}

export const LoreMagicTab: React.FC<Props> = ({ card, onChange }) => {
  const magicAbilityKind = card.magicAbilityKind || 'passive';

  const handleSelectPassive = (passive: ForgePassiveAbility) => {
    onChange({
      magicAbilityKind: 'passive',
      linkedPassiveId: passive.id,
      showLoreBox: true,
      magicPrefix: `✨ Passiva de Tabuleiro: ${passive.name} (${passive.triggerText})`,
      magicDescription: `${passive.description} — ${passive.effectText}`,
    });
  };

  const handleSelectActive = (active: ForgeActiveSkill) => {
    onChange({
      magicAbilityKind: 'active',
      linkedActiveSkillId: active.id,
      showLoreBox: true,
      magicPrefix: `⚡ Ativa de Tabuleiro: ${active.name} (Alcance ${active.range} · CD ${active.cooldown}t)`,
      magicDescription: active.description,
    });
  };

  return (
    <div className="space-y-4">
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Caixa de Lore e Magia
          </span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={card.showLoreBox}
              onChange={(e) => onChange({ showLoreBox: e.target.checked })}
              className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
            />
            <span className="text-xs text-slate-400">Exibir na Carta</span>
          </label>
        </div>

        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Opacidade do Fundo</span>
              <span className="text-amber-400 font-mono">{card.loreBoxOpacity}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={card.loreBoxOpacity}
              onChange={(e) => onChange({ loreBoxOpacity: Number(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Posição Vertical (Y)</span>
              <span className="text-amber-400 font-mono">{card.loreBoxY}px</span>
            </div>
            <input
              type="range"
              min="640"
              max="770"
              value={card.loreBoxY}
              onChange={(e) => onChange({ loreBoxY: Number(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Bônus de Defesa Extra (DF) para Cartas de Magia */}
      {card.entityType === 'Magia' && (
        <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Defesa Extra da Magia (DF → PV do Player)
            </span>
            <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-500/40">
              {(card.pvText || 'DF300').replace(/^PV/i, 'DF')}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Define quanto de <strong>Defesa Extra (DF)</strong> esta magia (passiva ou ativa) soma diretamente ao PV do Player.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={9999}
              step={50}
              value={card.pvNumber ?? (parseInt((card.pvText || '').replace(/\D/g, ''), 10) || 300)}
              onChange={(e) => {
                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                onChange({
                  pvNumber: val,
                  pvText: `DF${val}`,
                });
              }}
              className="w-28 px-3 py-1.5 rounded-lg bg-slate-950 border border-cyan-500/40 text-sm font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
            />
            <div className="flex items-center gap-1 flex-wrap">
              {[200, 300, 500, 750, 1000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    onChange({
                      pvNumber: preset,
                      pvText: `DF${preset}`,
                    })
                  }
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-cyan-900/50 border border-slate-700 hover:border-cyan-400/60 text-[10px] font-mono font-bold text-cyan-200 cursor-pointer"
                >
                  +{preset} DF
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Seletor Direto de Passivas / Ativas da Forja */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-purple-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Vincular Passiva / Ativa da Forja
          </span>
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
            Tabuleiro
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => onChange({ magicAbilityKind: 'passive' })}
            className={`py-1.5 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
              magicAbilityKind === 'passive'
                ? 'bg-purple-500/25 text-purple-200 border border-purple-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3 h-3" />
            Passivas ({FORGE_PASSIVE_ABILITIES.length})
          </button>
          <button
            type="button"
            onClick={() => onChange({ magicAbilityKind: 'active' })}
            className={`py-1.5 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
              magicAbilityKind === 'active'
                ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3 h-3" />
            Ativas ({FORGE_ACTIVE_SKILLS.length})
          </button>
        </div>

        {magicAbilityKind === 'passive' ? (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {FORGE_PASSIVE_ABILITIES.map((passive) => {
              const isSelected = card.linkedPassiveId === passive.id;
              return (
                <button
                  key={passive.id}
                  type="button"
                  onClick={() => handleSelectPassive(passive)}
                  className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-purple-950/60 border-purple-400/70 text-white'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm shrink-0">{passive.icon || '✨'}</span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold truncate">{passive.name}</div>
                      <div className="text-[9px] text-slate-400 truncate">
                        {passive.triggerText} · {passive.effectText}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {FORGE_ACTIVE_SKILLS.map((active) => {
              const isSelected = card.linkedActiveSkillId === active.id;
              return (
                <button
                  key={active.id}
                  type="button"
                  onClick={() => handleSelectActive(active)}
                  className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-amber-950/60 border-amber-400/70 text-white'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm shrink-0">⚡</span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold truncate">{active.name}</div>
                      <div className="text-[9px] text-slate-400 truncate">
                        Alcance {active.range} · CD {active.cooldown}t
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          Subtítulo / Cabeçalho de Lore
        </label>
        <input
          type="text"
          value={card.loreHeader}
          onChange={(e) => onChange({ loreHeader: e.target.value })}
          className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          História da Criatura / Carta (Lore)
        </label>
        <textarea
          rows={3}
          value={card.loreBody}
          onChange={(e) => onChange({ loreBody: e.target.value })}
          className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1.5">
          Prefixo da Magia / Habilidade
        </label>
        <input
          type="text"
          value={card.magicPrefix}
          onChange={(e) => onChange({ magicPrefix: e.target.value })}
          className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-sm text-amber-300 font-semibold focus:outline-none focus:border-amber-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          Descrição do Efeito
        </label>
        <textarea
          rows={3}
          value={card.magicDescription}
          onChange={(e) => onChange({ magicDescription: e.target.value })}
          className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
        />
      </div>
    </div>
  );
};
