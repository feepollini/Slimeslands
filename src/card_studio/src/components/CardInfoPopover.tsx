import React, { useEffect, useRef } from 'react';
import { X, Shield, Zap, Flame, Sparkles, Infinity as InfinityIcon } from 'lucide-react';
import { CardData } from '../types/card';

interface CardInfoPopoverProps {
  card: CardData | null;
  onClose: () => void;
  onLoadIntoEditor?: (card: CardData) => void;
}

/**
 * Single Reusable Interactive Card Info Modal/Popover (Section 16).
 * Triggered by Long-Press on mobile or Info Click on desktop across Gallery, Boosters, and Canvas.
 * Intelligently separates Creature attributes from Magic card attributes.
 */
export const CardInfoPopover: React.FC<CardInfoPopoverProps> = ({
  card,
  onClose,
  onLoadIntoEditor,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!card) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [card, onClose]);

  if (!card) return null;

  const isMagic = card.entityType === 'Magia';
  const cardClass = card.cardClass || 'Lendária';
  const cardRank = card.cardRank || card.rankBadgeText || 'S';
  const summonCost = card.summonStaminaCost ?? 5;
  const pvVal =
    card.pvNumber ??
    (parseInt(card.pvText.replace(/\D/g, ''), 10) || 500);

  // Build ability list from either procedural `generatedAbilities` or visual `pills`
  const abilities =
    card.generatedAbilities && card.generatedAbilities.length > 0
      ? card.generatedAbilities
      : card.pills.slice(0, card.pillCount || 4).map((p, idx) => {
          const isFree = Boolean(p.isChromaticSpecial);
          const mana = isFree ? 0 : parseInt(p.badgeValue, 10) || (idx + 1) * 2;
          const dmg = parseInt(p.mainText, 10) || 0;
          return {
            id: p.id,
            templateId: p.id,
            name:
              p.mode === 'text'
                ? p.mainText
                : `Habilidade ${idx + 1}`,
            description:
              idx === (card.pillCount || 4) - 1 && card.magicDescription
                ? card.magicDescription
                : 'Habilidade elemental canalizada em combate.',
            tier:
              idx === 0
                ? ('Básica' as const)
                : idx === 1
                ? ('Intermediária' as const)
                : idx === 2
                ? ('Forte' as const)
                : ('Suprema' as const),
            damage: dmg,
            manaCost: mana,
            isFree,
            parryStaminaCost: mana * 0.5,
            specialEffect:
              idx === (card.pillCount || 4) - 1 ? card.magicDescription : undefined,
            unlockOrder: idx + 1,
          };
        });

  const maxAttack =
    card.maxDamage ??
    Math.max(...abilities.map((a) => a.damage), 0);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0E1117] border border-slate-800 rounded-xl shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Header with Thumbnail & Identity */}
        <div className="flex items-start justify-between gap-4 p-4 border-b border-slate-800/80 bg-[#131720]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-14 h-20 rounded-md overflow-hidden bg-slate-900 border border-slate-700 shrink-0 flex items-center justify-center"
              style={{ borderColor: card.strokeColor }}
            >
              {card.imageUrl ? (
                <img
                  src={card.imageUrl}
                  alt={card.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-slate-400">
                  {card.elementText}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-semibold text-amber-400">{cardClass}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums font-bold text-white">
                  Rank {cardRank}
                </span>
                <span aria-hidden="true">·</span>
                <span>{isMagic ? 'Carta de Magia' : 'Criatura'}</span>
                <span aria-hidden="true">·</span>
                <span>{card.elementText}</span>
              </div>

              <h3 className="text-lg font-bold text-white truncate mt-0.5">
                {card.title}
              </h3>

              <p className="text-xs text-slate-300 line-clamp-2 mt-1">
                {card.loreBody || 'Registro oficial do ecossistema Worlds of Slimelands.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fechar informativo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Combat Attributes Bar (Separates Creature Stats from Magic Stats as required by Section 12 & 16) */}
        <div className="grid grid-cols-3 divide-x divide-slate-800/80 border-b border-slate-800/80 bg-[#0B0D13]">
          {isMagic ? (
            <>
              <div className="p-3 text-center">
                <div className="text-[11px] text-slate-400">Custo de Mana</div>
                <div className="text-base font-bold font-mono tabular-nums text-sky-400 mt-0.5">
                  {summonCost} Mana
                </div>
              </div>
              <div className="p-3 text-center">
                <div className="text-[11px] text-slate-400">Alvo Permitido</div>
                <div className="text-xs font-semibold text-white mt-1 truncate">
                  Campo / Aliado
                </div>
              </div>
              <div className="p-3 text-center">
                <div className="text-[11px] text-slate-400">Origem</div>
                <div className="text-xs font-semibold text-emerald-400 mt-1">
                  {card.origin || 'Booster'}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 text-center">
                <div className="text-[11px] text-slate-400">Pontos de Vida</div>
                <div className="text-base font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                  {pvVal} PV
                </div>
              </div>
              <div className="p-3 text-center">
                <div className="text-[11px] text-slate-400">Ataque Máximo</div>
                <div className="text-base font-bold font-mono tabular-nums text-rose-400 mt-0.5">
                  {maxAttack} Dano
                </div>
              </div>
              <div className="p-3 text-center">
                <div className="text-[11px] text-slate-400">Invocação (Estamina)</div>
                <div className="text-base font-bold font-mono tabular-nums text-amber-400 mt-0.5">
                  {summonCost} / 9 Est.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Detailed Abilities List */}
        <div className="p-4 space-y-2.5 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200">
              {isMagic ? 'Efeito da Carta Mágica' : `Habilidades Desbloqueadas (${abilities.length})`}
            </span>
            {!isMagic && (
              <span>Custo de Parry = Mana × 0,5 Estamina</span>
            )}
          </div>

          {abilities.map((ab, idx) => (
            <div
              key={ab.id || idx}
              className="p-3 rounded-lg bg-[#141923] border border-slate-800/90 flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    0{idx + 1}.
                  </span>
                  <span className="text-sm font-bold text-white truncate">
                    {ab.name}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    · {ab.tier}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs font-mono tabular-nums">
                  {ab.isFree ? (
                    <span className="text-fuchsia-300 font-bold flex items-center gap-1">
                      <InfinityIcon className="w-3.5 h-3.5" /> 0 Mana (Gratuita)
                    </span>
                  ) : (
                    <span className="text-sky-400 font-semibold flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {ab.manaCost} Mana
                    </span>
                  )}

                  {!isMagic && (
                    <>
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <Flame className="w-3 h-3" /> {ab.damage} Dano
                      </span>
                      <span
                        className="text-amber-300 flex items-center gap-1"
                        title="Estamina necessária para o oponente defender com Parry (Mana × 0,5)"
                      >
                        <Shield className="w-3 h-3" /> Parry: {ab.parryStaminaCost.toFixed(1).replace('.0', '')} Est.
                      </span>
                    </>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {ab.description}
              </p>

              {ab.specialEffect && (
                <p className="text-[11px] text-amber-300/90 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span>{ab.specialEffect}</span>
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer Metadata & Quick Load Button */}
        <div className="px-4 py-3 border-t border-slate-800/80 bg-[#131720] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Origem: {card.origin || 'Manual'}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {card.rulesVersion || 'v1.4-slimelands'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onLoadIntoEditor && (
              <button
                onClick={() => {
                  onLoadIntoEditor(card);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
              >
                Editar no Estúdio
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
