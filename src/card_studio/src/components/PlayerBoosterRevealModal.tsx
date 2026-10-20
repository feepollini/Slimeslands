import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Check, X, Eye, PackageOpen, Layers } from 'lucide-react';
import { CardData } from '../types/card';
import { CardFrameSVG } from './CardFrameSVG';
import { CardBackSVG } from './CardBackSVG';
import { CardInfoPopover } from './CardInfoPopover';
import { SoundManager } from '../../../ui/utils/SoundManager';

export interface PlayerBoosterRevealModalProps {
  isOpen: boolean;
  packName: string;
  packSubtitle?: string;
  cards: CardData[];
  onClose: () => void;
  onCollect: (cards: CardData[]) => void;
}

export const PlayerBoosterRevealModal: React.FC<PlayerBoosterRevealModalProps> = ({
  isOpen,
  packName,
  packSubtitle = '9 Cartas Mágicas & Criaturas',
  cards,
  onClose,
  onCollect,
}) => {
  // Array of flipped states for each of the 9 cards
  const [flipped, setFlipped] = useState<boolean[]>(() =>
    new Array(cards.length).fill(false)
  );
  const [inspectingCard, setInspectingCard] = useState<CardData | null>(null);
  const [isCollected, setIsCollected] = useState(false);

  // Reset state when cards or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setFlipped(new Array(cards.length).fill(false));
      setIsCollected(false);
      setInspectingCard(null);
    }
  }, [isOpen, cards]);

  const flippedCount = flipped.filter(Boolean).length;
  const allFlipped = cards.length > 0 && flippedCount === cards.length;

  const flipCard = useCallback(
    (index: number) => {
      setFlipped((prev) => {
        if (prev[index]) return prev;
        const next = [...prev];
        next[index] = true;
        return next;
      });
      try {
        SoundManager.playAction('card_flip');
      } catch (_) {}
    },
    []
  );

  const flipAll = useCallback(() => {
    cards.forEach((_, idx) => {
      setTimeout(() => {
        flipCard(idx);
      }, idx * 110);
    });
  }, [cards, flipCard]);

  const handleCardClick = (index: number, card: CardData) => {
    if (!flipped[index]) {
      flipCard(index);
    } else {
      setInspectingCard(card);
    }
  };

  const handleCollect = () => {
    if (isCollected) return;
    setIsCollected(true);
    // Ensure all cards are flipped when collecting
    setFlipped(new Array(cards.length).fill(true));
    try {
      SoundManager.playAction('fanfare');
    } catch (_) {}
    onCollect(cards);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  if (!isOpen || cards.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex flex-col justify-between overflow-hidden select-none p-3 sm:p-5"
      style={{ animation: 'fadeIn 0.25s ease-out' }}
    >
      {/* =====================================================================
          TOP HEADER: PACK IDENTITY & REVEAL ACTIONS
         ===================================================================== */}
      <header className="flex items-center justify-between gap-4 max-w-7xl w-full mx-auto pb-3 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <PackageOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-wide text-white flex items-center gap-2">
              <span>{packName}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {flippedCount}/{cards.length} Reveladas
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {packSubtitle} · Toque em uma carta para virar ou inspecionar detalhes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!allFlipped && (
            <button
              onClick={flipAll}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Revelar Todas</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* =====================================================================
          CENTER: 9-CARD INTERACTIVE REVEAL GRID
         ===================================================================== */}
      <main className="flex-1 w-full max-w-7xl mx-auto overflow-y-auto no-scrollbar py-4 flex items-center justify-center">
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5 sm:gap-3.5 w-full items-start">
          {cards.map((card, idx) => {
            const isCardFlipped = flipped[idx];
            const slotNum = idx + 1;
            const isSlot9 = slotNum === 9;

            return (
              <div
                key={card.id || `card-${idx}`}
                className="flex flex-col items-center group relative cursor-pointer"
                onClick={() => handleCardClick(idx, card)}
              >
                {/* Slot Badge */}
                <div className="w-full flex items-center justify-between text-[10px] font-mono mb-1 px-1">
                  <span
                    className={`font-bold ${
                      isSlot9 ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  >
                    #{slotNum}
                  </span>
                  <span
                    className={`font-semibold ${
                      isSlot9
                        ? 'text-amber-300 font-bold tracking-wider'
                        : card.entityType === 'Magia'
                        ? 'text-purple-300'
                        : 'text-slate-300'
                    }`}
                  >
                    {isSlot9 ? 'ESPECIAL' : card.cardClass || 'Comum'}
                  </span>
                </div>

                {/* 3D Flip Card Container */}
                <div
                  className={`relative w-full aspect-[680/990] rounded-lg transition-transform duration-500 transform-gpu ${
                    isSlot9
                      ? 'shadow-xl shadow-amber-500/20 ring-2 ring-amber-500/60'
                      : 'shadow-lg shadow-black/40 hover:scale-[1.03]'
                  }`}
                  style={{
                    perspective: '1200px',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div
                    className="relative w-full h-full rounded-lg transition-transform duration-600 ease-out"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: isCardFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
                    }}
                  >
                    {/* Front Face: Official CardFrameSVG */}
                    <div
                      className="absolute inset-0 w-full h-full rounded-lg overflow-hidden bg-black backface-hidden"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                      }}
                    >
                      <CardFrameSVG
                        card={card}
                        interactive={false}
                        animateChroma={isCardFlipped}
                        idScope={`booster-reveal-${card.id}-${idx}`}
                      />

                      {/* Small Info Hint Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingCard(card);
                        }}
                        className="absolute bottom-2 right-2 p-1 rounded-md bg-black/60 hover:bg-black/85 border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px]"
                        title="Ver Atributos Detalhados"
                      >
                        <Eye className="w-3 h-3 text-sky-400" />
                        <span>Info</span>
                      </button>
                    </div>

                    {/* Back Face: Official CardBackSVG */}
                    <div
                      className="absolute inset-0 w-full h-full rounded-lg overflow-hidden bg-[#0A0D14] backface-hidden flex items-center justify-center border border-slate-700/60"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                      }}
                    >
                      <CardBackSVG
                        card={card}
                        interactive={false}
                        idScope={`booster-back-${card.id}-${idx}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none flex items-end justify-center pb-2">
                        <span className="text-[10px] font-bold text-amber-200/90 tracking-widest uppercase animate-pulse">
                          Toque p/ Virar
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Title & Rank Preview */}
                <div className="w-full mt-1.5 px-0.5 text-center">
                  <div className="text-[11px] font-bold text-white truncate">
                    {isCardFlipped ? card.title : '???'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {isCardFlipped
                      ? `${card.cardRank || 'S'} · ${card.entityType || 'Criatura'}`
                      : 'Oculta'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* =====================================================================
          BOTTOM FOOTER: COLLECT ACTION & PROGRESS
         ===================================================================== */}
      <footer className="flex items-center justify-between gap-4 max-w-7xl w-full mx-auto pt-3 border-t border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>
            {allFlipped
              ? 'Todas as 9 cartas foram reveladas!'
              : `${flippedCount} de ${cards.length} cartas reveladas`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCollect}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg ${
              isCollected
                ? 'bg-slate-800 text-slate-500 cursor-default'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 hover:scale-105 active:scale-95'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>
              {isCollected
                ? 'Guardado no Inventário!'
                : 'Coletar e Guardar no Inventário'}
            </span>
          </button>
        </div>
      </footer>

      {/* =====================================================================
          INTERACTIVE INSPECTION POPOVER (SECTION 16)
         ===================================================================== */}
      {inspectingCard && (
        <CardInfoPopover
          card={inspectingCard}
          onClose={() => setInspectingCard(null)}
        />
      )}
    </div>
  );
};
