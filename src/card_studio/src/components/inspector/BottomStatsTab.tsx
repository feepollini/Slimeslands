import React from 'react';
import { CardData, BottomStatPill } from '../../types/card';
import { Sparkles, Zap, Flame, Shield, Droplets, Layers, Check } from 'lucide-react';
import {
  FORGE_PASSIVE_ABILITIES,
  FORGE_ACTIVE_SKILLS,
  ENCHANTMENT_REGISTRY,
  VFX_REGISTRY,
  ForgePassiveAbility,
  ForgeActiveSkill,
  findForgeEnchantmentById,
  findForgeVfxById,
  getDefaultVfxForSlot,
} from '../../utils/forgeAbilitiesCatalog';

interface Props {
  card: CardData;
  onChange: (updates: Partial<CardData>) => void;
}

const PILL_ACCENTS = [
  '#0084FF',
  '#10B981',
  '#9333EA',
  '#DF9A1E',
  '#EF4444',
  '#06B6D4',
  '#EC4899',
  '#F59E0B',
];

export const BottomStatsTab: React.FC<Props> = ({ card, onChange }) => {
  const isMagicCard = card.entityType === 'Magia';
  const isItemCard = card.entityType === 'Item';
  const showSummonSlot = card.showSummonCostPill ?? !isItemCard;

  const currentSummonPill: BottomStatPill = card.summonCostPill || {
    id: 'pill-summon-cost',
    mode: 'stat',
    badgeValue: isMagicCard
      ? String(card.magicManaCost ?? 3)
      : card.summonStaminaCost !== undefined
      ? String(card.summonStaminaCost)
      : '3',
    badgeColor: isMagicCard ? '#0084FF' : '#F59E0B',
    mainText: isMagicCard ? 'MANA' : 'INVOC.',
    isSummonCost: true,
    costResource: isMagicCard ? 'mana' : 'stamina',
  };

  const updatePill = (index: number, updates: Partial<BottomStatPill>) => {
    const nextPills = [...card.pills] as [
      BottomStatPill,
      BottomStatPill,
      BottomStatPill,
      BottomStatPill
    ];
    nextPills[index] = { ...nextPills[index], ...updates };
    onChange({ pills: nextPills });
  };

  const updateSummonPill = (updates: Partial<BottomStatPill>) => {
    const updated: BottomStatPill = {
      ...currentSummonPill,
      ...updates,
      isSummonCost: true,
      costResource: isMagicCard ? 'mana' : 'stamina',
    };
    const numericVal = parseInt(updated.badgeValue, 10);
    if (isMagicCard) {
      onChange({
        summonCostPill: updated,
        magicManaCost: !isNaN(numericVal) ? numericVal : card.magicManaCost,
        pills: [
          updated,
          card.pills[1],
          card.pills[2],
          card.pills[3],
        ],
      });
    } else {
      onChange({
        summonCostPill: updated,
        summonStaminaCost: !isNaN(numericVal) ? numericVal : card.summonStaminaCost,
      });
    }
  };

  const handleSwitchMode = (targetMode: 'Criatura' | 'Magia') => {
    if (targetMode === 'Magia') {
      const manaCost = card.magicManaCost ?? card.summonStaminaCost ?? 3;
      const defaultPassive =
        FORGE_PASSIVE_ABILITIES.find((p) => p.id === card.linkedPassiveId) ||
        FORGE_PASSIVE_ABILITIES[0];
      const manaPill: BottomStatPill = {
        id: 'pill-summon-cost',
        mode: 'stat',
        badgeValue: String(manaCost),
        badgeColor: '#0084FF',
        mainText: 'MANA',
        isSummonCost: true,
        costResource: 'mana',
      };
      onChange({
        entityType: 'Magia',
        showSummonCostPill: true,
        summonCostPill: manaPill,
        magicManaCost: manaCost,
        magicAbilityKind: card.magicAbilityKind || 'passive',
        linkedPassiveId: defaultPassive?.id || 'first_strike',
        magicPrefix: defaultPassive
          ? `✨ Passiva de Tabuleiro: ${defaultPassive.name} (${defaultPassive.triggerText})`
          : card.magicPrefix,
        magicDescription: defaultPassive
          ? `${defaultPassive.description} — ${defaultPassive.effectText}`
          : card.magicDescription,
        pvText:
          card.pvText && card.pvText.startsWith('MANA')
            ? `PV${card.pvNumber ?? 400}`
            : card.pvText || 'PV400',
      });
    } else {
      const stamCost = card.summonStaminaCost ?? card.magicManaCost ?? 3;
      const stamPill: BottomStatPill = {
        id: 'pill-summon-cost',
        mode: 'stat',
        badgeValue: String(stamCost),
        badgeColor: '#F59E0B',
        mainText: 'INVOC.',
        isSummonCost: true,
        costResource: 'stamina',
      };
      onChange({
        entityType: 'Criatura',
        showSummonCostPill: true,
        summonCostPill: stamPill,
        summonStaminaCost: stamCost,
      });
    }
  };

  const handleSelectPassive = (passive: ForgePassiveAbility) => {
    onChange({
      magicAbilityKind: 'passive',
      linkedPassiveId: passive.id,
      showLoreBox: true,
      magicPrefix: `✨ Passiva de Tabuleiro: ${passive.name} (${passive.triggerText})`,
      magicDescription: `${passive.description} — ${passive.effectText}`,
      loreHeader: `${card.title} · Magia ${card.cardClass || 'Rara'} (Mana ${
        card.magicManaCost ?? currentSummonPill.badgeValue
      })`,
    });
  };

  const handleSelectActive = (active: ForgeActiveSkill) => {
    onChange({
      magicAbilityKind: 'active',
      linkedActiveSkillId: active.id,
      showLoreBox: true,
      magicPrefix: `⚡ Ativa de Tabuleiro: ${active.name} (Alcance ${active.range} · CD ${active.cooldown}t)`,
      magicDescription: active.description,
      loreHeader: `${card.title} · Magia ${card.cardClass || 'Rara'} (Mana ${
        card.magicManaCost ?? currentSummonPill.badgeValue
      })`,
    });
  };

  const activePillCount = card.pillCount || 4;
  const visiblePills = card.pills.slice(0, activePillCount);
  const magicAbilityKind = card.magicAbilityKind || 'passive';

  return (
    <div className="space-y-4">
      {/* Seletor de Estado da Carta: Criatura vs Carta de Magia */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Estado / Modo da Carta
          </span>
          <span
            className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
              isMagicCard
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
            }`}
          >
            {isMagicCard ? '✨ Carta de Magia' : '⚔️ Criatura / Unidade'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleSwitchMode('Criatura')}
            className={`py-2.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5 ${
              !isMagicCard
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Modo Criatura (5 Slots)
          </button>

          <button
            type="button"
            onClick={() => handleSwitchMode('Magia')}
            className={`py-2.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5 ${
              isMagicCard
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            Modo Carta de Magia
          </button>
        </div>

        <p className="text-[10px] text-slate-400 leading-relaxed">
          {isMagicCard
            ? 'Cartas de Magia mantêm PV, Classe e Rank no fluxo de raridade, não usam ataques 1–4 e possuem Custo de Invocação em MANA + Passiva/Ativa de Tabuleiro da Forja.'
            : 'Criaturas possuem de 1 a 4 cápsulas de habilidade + o 5º Slot fixo de Custo de Invocação em Estamina (independente da raridade).'}
        </p>
      </div>

      {/* =====================================================================
          MODO CARTA DE MAGIA (Custo em Mana + Seletor de Passivas/Ativas da Forja)
         ===================================================================== */}
      {isMagicCard ? (
        <div className="space-y-4">
          {/* Cápsula Única: Custo de Invocação em Mana */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-950/50 via-slate-900/90 to-cyan-950/30 border border-cyan-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-cyan-400" />
                Cápsula de Invocação (Custo em Mana)
              </span>
              <span className="text-[10px] font-mono text-cyan-400/90 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                💧 MANA · TABULEIRO
              </span>
            </div>

            <div className="grid grid-cols-12 gap-2.5">
              <div className="col-span-4">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Custo (Mana)
                </label>
                <input
                  type="text"
                  value={currentSummonPill.badgeValue}
                  onChange={(e) => updateSummonPill({ badgeValue: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-cyan-500/40 rounded-lg text-xs text-cyan-200 font-bold text-center focus:outline-none focus:border-cyan-400"
                  placeholder="3"
                />
              </div>

              <div className="col-span-5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Rótulo da Cápsula
                </label>
                <input
                  type="text"
                  value={currentSummonPill.mainText}
                  onChange={(e) => updateSummonPill({ mainText: e.target.value.toUpperCase() })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white font-semibold focus:outline-none focus:border-cyan-400"
                  placeholder="MANA"
                />
              </div>

              <div className="col-span-3">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Cor Mana
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={currentSummonPill.badgeColor || '#0084FF'}
                    onChange={(e) => updateSummonPill({ badgeColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>
            </div>

            {/* Botões rápidos de Custo de Mana 1 a 9 */}
            <div>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Atalho de Custo de Mana (Fluxo de Geração: 1 a 9)
              </span>
              <div className="grid grid-cols-9 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((costVal) => {
                  const active = String(currentSummonPill.badgeValue) === String(costVal);
                  return (
                    <button
                      key={costVal}
                      type="button"
                      onClick={() => updateSummonPill({ badgeValue: String(costVal) })}
                      className={`py-1 rounded text-[10px] font-extrabold transition-all border ${
                        active
                          ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow'
                          : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {costVal}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Seletor de Passivas / Ativas da Forja */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-purple-500/35 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Vínculo de Tabuleiro (Passivas & Ativas da Forja)
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Selecione a passiva ou ativa que esta carta de magia executa quando está em tabuleiro.
                </p>
              </div>
            </div>

            {/* Alternador Passivas vs Ativas */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => onChange({ magicAbilityKind: 'passive' })}
                className={`py-1.5 px-2.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  magicAbilityKind === 'passive'
                    ? 'bg-purple-500/25 text-purple-200 border border-purple-500/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Passivas da Forja ({FORGE_PASSIVE_ABILITIES.length})
              </button>
              <button
                type="button"
                onClick={() => onChange({ magicAbilityKind: 'active' })}
                className={`py-1.5 px-2.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  magicAbilityKind === 'active'
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Ativas da Forja ({FORGE_ACTIVE_SKILLS.length})
              </button>
            </div>

            {/* Lista de Passivas ou Ativas da Forja */}
            {magicAbilityKind === 'passive' ? (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {FORGE_PASSIVE_ABILITIES.map((passive) => {
                  const isSelected = card.linkedPassiveId === passive.id;
                  return (
                    <button
                      key={passive.id}
                      type="button"
                      onClick={() => handleSelectPassive(passive)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-purple-950/60 border-purple-400/70 shadow-sm'
                          : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-base shrink-0">
                        {passive.icon || '✨'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white truncate">
                            {passive.name}
                          </span>
                          <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                            {passive.triggerText}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-300 mt-0.5 line-clamp-2">
                          {passive.description}
                        </p>
                        <span className="inline-block text-[9px] text-cyan-300 font-medium mt-1">
                          Efeito: {passive.effectText}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-purple-400 shrink-0 mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {FORGE_ACTIVE_SKILLS.map((active) => {
                  const isSelected = card.linkedActiveSkillId === active.id;
                  return (
                    <button
                      key={active.id}
                      type="button"
                      onClick={() => handleSelectActive(active)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-amber-950/60 border-amber-400/70 shadow-sm'
                          : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-base shrink-0">
                        ⚡
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white truncate">
                            {active.name}
                          </span>
                          <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                            Alcance {active.range} · CD {active.cooldown}t
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-300 mt-0.5 line-clamp-2">
                          {active.description}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Edição Fina do Texto da Passiva/Ativa na Carta */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-amber-400 mb-1">
                  Título / Prefixo na Caixa da Carta
                </label>
                <input
                  type="text"
                  value={card.magicPrefix}
                  onChange={(e) => onChange({ magicPrefix: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-amber-300 font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Descrição do Efeito em Tabuleiro
                </label>
                <textarea
                  rows={2}
                  value={card.magicDescription}
                  onChange={(e) => onChange({ magicDescription: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =====================================================================
           MODO CRIATURA (1 a 4 Cápsulas de Habilidade + 5º Slot Custo de Estamina)
           ===================================================================== */
        <div className="space-y-4">
          {/* 5º SLOT — CUSTO DE INVOCAÇÃO EM ESTAMINA */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-slate-950 border border-amber-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  5º Slot · Custo de Invocação (Estamina)
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Independente da raridade (Comum a Mítica), toda carta invocável recebe este custo no fluxo de geração.
                </p>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showSummonSlot}
                  onChange={(e) => onChange({ showSummonCostPill: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-[10px] font-bold uppercase text-amber-300">
                  Ativo
                </span>
              </label>
            </div>

            {showSummonSlot && (
              <>
                <div className="grid grid-cols-12 gap-2.5">
                  <div className="col-span-4">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      Estamina (⚡)
                    </label>
                    <input
                      type="text"
                      value={currentSummonPill.badgeValue}
                      onChange={(e) => updateSummonPill({ badgeValue: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-amber-500/40 rounded-lg text-xs text-amber-300 font-extrabold text-center focus:outline-none focus:border-amber-400"
                      placeholder="3"
                    />
                  </div>

                  <div className="col-span-5">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      Texto do 5º Slot
                    </label>
                    <input
                      type="text"
                      value={currentSummonPill.mainText}
                      onChange={(e) =>
                        updateSummonPill({ mainText: e.target.value.toUpperCase() })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white font-semibold focus:outline-none focus:border-amber-400"
                      placeholder="INVOC."
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      Cor Selo
                    </label>
                    <input
                      type="color"
                      value={currentSummonPill.badgeColor || '#F59E0B'}
                      onChange={(e) => updateSummonPill({ badgeColor: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                {/* Atalho rápido 1 a 9 Estamina */}
                <div className="grid grid-cols-9 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((stamVal) => {
                    const active = String(currentSummonPill.badgeValue) === String(stamVal);
                    return (
                      <button
                        key={stamVal}
                        type="button"
                        onClick={() => updateSummonPill({ badgeValue: String(stamVal) })}
                        className={`py-1 rounded text-[10px] font-extrabold transition-all border ${
                          active
                            ? 'bg-amber-500 text-slate-950 border-amber-300 shadow'
                            : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {stamVal}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Quantidade de Cápsulas de Habilidade (Slots 1 a 4) */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                Cápsulas de Habilidade (Slots 1 a 4)
              </span>
              <span className="text-[10px] font-mono text-amber-400">
                {activePillCount} Hab. + {showSummonSlot ? '1 Invoc. (5º Slot)' : '0 Invoc.'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {([1, 2, 3, 4] as const).map((count) => {
                const isSelected = activePillCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => onChange({ pillCount: count })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                        : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {count} {count === 1 ? 'Hab.' : 'Habs.'}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <div>
                <span className="text-[11px] font-semibold text-slate-300 block">
                  Auto-Ajustar Moldura Inferior (Dock)
                </span>
                <span className="text-[10px] text-slate-500">
                  Adapta o recorte inferior para acomodar as habilidades + 5º slot de invocação
                </span>
              </div>
              <button
                type="button"
                onClick={() => onChange({ dockAutoFit: !(card.dockAutoFit ?? true) })}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  card.dockAutoFit ?? true
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {card.dockAutoFit ?? true ? 'Auto-Fit ON' : 'Largura Fixa'}
              </button>
            </div>
          </div>

          {/* Lista de Cápsulas de Habilidade 1 a 4 (Lincadas aos Ataques Reais, Efeitos Especiais e Animações da 1ª Forja) */}
          {visiblePills.map((pill, idx) => {
            const isChromatic = Boolean(pill.isChromaticSpecial);
            const genAb = card.generatedAbilities?.[idx];
            const attackType = pill.attackType || genAb?.attackType || 'damage';
            const isEncMode = attackType === 'enchantment';
            const currentRes = pill.costResource || genAb?.costResource || (idx >= 2 ? 'mana' : 'stamina');
            const selectedEncId = pill.enchantmentId || genAb?.enchantmentId || '';
            const selectedEnc = findForgeEnchantmentById(selectedEncId);
            const selectedVfxId =
              pill.vfxId ||
              genAb?.vfxId ||
              getDefaultVfxForSlot(idx, isEncMode || Boolean(selectedEncId));
            const selectedVfx = findForgeVfxById(selectedVfxId) || VFX_REGISTRY[0];
            const attackName =
              pill.attackName ??
              genAb?.name ??
              (idx === 0
                ? 'Golpe Básico'
                : idx === 1
                ? 'Investida Elemental'
                : idx === 2
                ? 'Explosão de Núcleo'
                : 'Supremacia Ancestral');

            return (
              <div
                key={pill.id}
                className={`p-3.5 rounded-xl border space-y-3 transition-all ${
                  isChromatic
                    ? 'bg-gradient-to-br from-purple-950/40 via-slate-900/80 to-amber-950/30 border-amber-500/40'
                    : isEncMode
                    ? 'bg-gradient-to-br from-cyan-950/35 via-slate-900/80 to-slate-950 border-cyan-500/40'
                    : 'bg-slate-900/60 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    Cápsula #{idx + 1} · {isEncMode ? '🔮 Encantamento' : '⚔️ Ataque'}
                    {isChromatic && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-gradient-to-r from-pink-500 via-amber-400 to-cyan-400 text-slate-950">
                        ∞ CROMÁTICA
                      </span>
                    )}
                  </span>
                  <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => updatePill(idx, { mode: 'stat' })}
                      className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all ${
                        pill.mode === 'stat'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Custo + Valor
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePill(idx, { mode: 'text' })}
                      className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all ${
                        pill.mode === 'text'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Apenas Texto
                    </button>
                  </div>
                </div>

                {/* Alternador de Tipo de Ataque (Dano vs Encantamento da 1ª Forja) + Recurso (Estamina vs Mana) */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        const fallbackDmg =
                          !isNaN(parseInt(pill.mainText, 10))
                            ? pill.mainText
                            : String(genAb?.damage || (idx + 1) * 200);
                        updatePill(idx, {
                          attackType: 'damage',
                          mainText: fallbackDmg,
                        });
                      }}
                      className={`flex-1 py-1 text-[10px] font-bold uppercase rounded transition-all ${
                        !isEncMode
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ⚔️ Dano
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const defaultEnc = selectedEnc || ENCHANTMENT_REGISTRY[0];
                        updatePill(idx, {
                          attackType: 'enchantment',
                          enchantmentId: defaultEnc.id,
                          enchantmentValue: defaultEnc.defaultValue,
                          enchantmentTurns: defaultEnc.defaultTurns,
                          attackName: defaultEnc.name,
                          badgeValue: isChromatic ? '∞' : String(defaultEnc.defaultCost),
                          costResource: defaultEnc.defaultResource,
                          mainText: defaultEnc.name.split(' ')[0].toUpperCase().slice(0, 7),
                          vfxId: pill.vfxId || getDefaultVfxForSlot(idx, true),
                        });
                      }}
                      className={`flex-1 py-1 text-[10px] font-bold uppercase rounded transition-all ${
                        isEncMode
                          ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🔮 Encantamento
                    </button>
                  </div>

                  <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        updatePill(idx, {
                          costResource: 'stamina',
                          badgeColor: '#F59E0B',
                        })
                      }
                      className={`flex-1 py-1 text-[10px] font-bold uppercase rounded transition-all ${
                        currentRes === 'stamina'
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ⚡ Estamina
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updatePill(idx, {
                          costResource: 'mana',
                          badgeColor: '#0084FF',
                        })
                      }
                      className={`flex-1 py-1 text-[10px] font-bold uppercase rounded transition-all ${
                        currentRes === 'mana'
                          ? 'bg-blue-500/25 text-blue-300 border border-blue-500/50'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      💎 Mana
                    </button>
                  </div>
                </div>

                {/* Nome Real do Ataque no Tabuleiro */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Nome do Ataque / Habilidade no Tabuleiro
                  </label>
                  <input
                    type="text"
                    value={attackName}
                    onChange={(e) => updatePill(idx, { attackName: e.target.value })}
                    placeholder="Ex: Salto Elástico, Prisão Glacial..."
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-amber-200 font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>

                {pill.mode === 'stat' && (
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/90 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles
                        className={`w-4 h-4 ${
                          isChromatic ? 'text-amber-400 animate-spin' : 'text-slate-500'
                        }`}
                      />
                      <div>
                        <span className="text-[11px] font-bold text-slate-200 block">
                          Círculo Cromático Especial (∞)
                        </span>
                        <span className="text-[9px] text-slate-400 block">
                          Ataque especial sem custo (0 Estamina/Mana) com símbolo do infinito
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updatePill(idx, {
                          isChromaticSpecial: !isChromatic,
                          badgeValue: !isChromatic
                            ? '∞'
                            : pill.badgeValue === '∞'
                            ? '2'
                            : pill.badgeValue,
                        })
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all border shrink-0 ${
                        isChromatic
                          ? 'bg-gradient-to-r from-rose-500 via-amber-400 to-cyan-400 text-slate-950 border-white/40 shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {isChromatic ? '∞ Ativado' : 'Ativar ∞'}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-12 gap-2.5">
                  {pill.mode === 'stat' && (
                    <div className="col-span-4">
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        {isChromatic
                          ? 'Símbolo'
                          : currentRes === 'stamina'
                          ? 'Custo (⚡ Estam.)'
                          : 'Custo (💎 Mana)'}
                      </label>
                      <input
                        type="text"
                        value={isChromatic ? '∞' : pill.badgeValue}
                        disabled={isChromatic}
                        onChange={(e) => updatePill(idx, { badgeValue: e.target.value })}
                        className={`w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 ${
                          isChromatic
                            ? 'opacity-60 cursor-not-allowed font-extrabold text-amber-300'
                            : ''
                        }`}
                      />
                    </div>
                  )}

                  <div className={pill.mode === 'stat' ? 'col-span-8' : 'col-span-12'}>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      {pill.mode === 'stat'
                        ? isEncMode
                          ? 'Rótulo na Cápsula (Ex: FREEZE, CURA)'
                          : 'Valor Principal (Dano na Cápsula)'
                        : 'Texto da Cápsula'}
                    </label>
                    <input
                      type="text"
                      value={pill.mainText}
                      onChange={(e) => updatePill(idx, { mainText: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Seletor de Efeito Especial / Encantamento (Da 1ª Forja) */}
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-cyan-500/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                      🔮 Efeito Especial (1ª Forja)
                    </label>
                    {selectedEnc && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-200 border border-cyan-500/30">
                        {selectedEnc.icon} {selectedEnc.name}
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedEncId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        updatePill(idx, {
                          enchantmentId: undefined,
                          enchantmentValue: undefined,
                          enchantmentTurns: undefined,
                        });
                        return;
                      }
                      const enc = findForgeEnchantmentById(val);
                      if (enc) {
                        updatePill(idx, {
                          enchantmentId: enc.id,
                          enchantmentValue: enc.defaultValue,
                          enchantmentTurns: enc.defaultTurns,
                          ...(isEncMode
                            ? {
                                attackName: enc.name,
                                mainText: enc.name.split(' ')[0].toUpperCase().slice(0, 7),
                                badgeValue: isChromatic ? '∞' : String(enc.defaultCost),
                                costResource: enc.defaultResource,
                              }
                            : {}),
                        });
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    {!isEncMode && <option value="">— Nenhum Efeito Secundário (Apenas Dano) —</option>}
                    {ENCHANTMENT_REGISTRY.map((enc) => (
                      <option key={enc.id} value={enc.id}>
                        {enc.icon} {enc.name} — {enc.description}
                      </option>
                    ))}
                  </select>
                  {selectedEnc && (
                    <p className="text-[10px] text-cyan-200/80 leading-snug">
                      {selectedEnc.icon} <strong>{selectedEnc.name}:</strong> {selectedEnc.description}
                    </p>
                  )}
                </div>

                {/* Seletor de Animação (VFX da 1ª Forja) */}
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-amber-500/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                      ✨ Animação de Combate (VFX)
                    </label>
                    {selectedVfx && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-200 border border-amber-500/30">
                        {selectedVfx.icon} {selectedVfx.name}
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedVfxId}
                    onChange={(e) => updatePill(idx, { vfxId: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {VFX_REGISTRY.map((vfx) => (
                      <option key={vfx.id} value={vfx.id}>
                        {vfx.icon} {vfx.name} ({vfx.category.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  {selectedVfx && (
                    <p className="text-[10px] text-slate-400 leading-snug">
                      {selectedVfx.description}
                    </p>
                  )}
                </div>

                {pill.mode === 'stat' && !isChromatic && (
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Cor do Círculo da Cápsula
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PILL_ACCENTS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => updatePill(idx, { badgeColor: color })}
                          className={`w-5 h-5 rounded-full border transition-transform ${
                            pill.badgeColor === color
                              ? 'scale-125 border-white shadow-md'
                              : 'border-slate-700 hover:scale-110'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <input
                        type="color"
                        value={pill.badgeColor}
                        onChange={(e) => updatePill(idx, { badgeColor: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 ml-auto"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
