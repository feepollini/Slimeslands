import React from 'react';
import { BottomStatPill, CardData } from '../../types/card';

interface BottomStatsTabProps {
  activeCard: CardData;
  updateActiveCard: (updater: (prev: CardData) => CardData) => void;
  handleUpdatePill: (index: number, changes: Partial<BottomStatPill>) => void;
}

export const BottomStatsTab: React.FC<BottomStatsTabProps> = ({
  activeCard,
  updateActiveCard,
  handleUpdatePill,
}) => {
  return (
    <div className="space-y-4">
      <div className="p-3.5 rounded-xl bg-[#121521] border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200">
            Quantidade de Cápsulas na Carta
          </span>
          <span className="text-xs font-mono text-red-400 font-bold">
            {activeCard.pillCount || 4}{' '}
            {(activeCard.pillCount || 4) === 1 ? 'Cápsula' : 'Cápsulas'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {([1, 2, 3, 4] as const).map((count) => {
            const isSelected = (activeCard.pillCount || 4) === count;
            return (
              <button
                key={count}
                onClick={() =>
                  updateActiveCard((prev) => ({
                    ...prev,
                    pillCount: count,
                  }))
                }
                className={`py-2 px-3 rounded-lg text-xs font-bold font-mono tabular-nums border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-red-600/20 border-red-500 text-white'
                    : 'bg-[#0B0D14] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {count} {count === 1 ? 'Pílula' : 'Pílulas'}
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div>
            <span className="text-xs font-medium text-slate-300 block">
              Recorte do Contorno Inferior
            </span>
            <span className="text-[11px] text-slate-400">
              Ajustar largura da aba inferior automaticamente ao nº de cápsulas
            </span>
          </div>
          <button
            onClick={() =>
              updateActiveCard((prev) => ({
                ...prev,
                dockAutoFit: !(prev.dockAutoFit ?? true),
              }))
            }
            className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              activeCard.dockAutoFit ?? true
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {activeCard.dockAutoFit ?? true ? 'Auto-Ajustar' : 'Largura Fixa (4)'}
          </button>
        </div>
      </div>

      {activeCard.pills
        .slice(0, activeCard.pillCount || 4)
        .map((pill, idx) => (
          <div
            key={pill.id}
            className="p-3.5 rounded-xl bg-[#121521] border border-slate-800 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                Cápsula #{idx + 1}
              </span>
              <div className="flex items-center gap-1 bg-[#0B0D14] p-0.5 rounded-md border border-slate-800">
                <button
                  onClick={() => handleUpdatePill(idx, { mode: 'stat' })}
                  className={`px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                    pill.mode === 'stat'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Custo + Dano
                </button>
                <button
                  onClick={() => handleUpdatePill(idx, { mode: 'text' })}
                  className={`px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                    pill.mode === 'text'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Apenas Texto
                </button>
              </div>
            </div>

            {pill.mode === 'stat' ? (
              <div className="space-y-2.5">
                {/* Toggle for Special Zero-Cost Chromatic Attack (∞) */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0B0D14] border border-slate-800/90">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{
                        background:
                          'linear-gradient(135deg, #FF0066, #00EAFF, #FFB800)',
                      }}
                    >
                      ∞
                    </span>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-200 block leading-tight">
                        Ataque Especial Cromático (Sem Custo)
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Bolinha cromática animada com ícone de Infinito (∞)
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleUpdatePill(idx, {
                        isChromaticSpecial: !pill.isChromaticSpecial,
                      })
                    }
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      pill.isChromaticSpecial
                        ? 'bg-gradient-to-r from-pink-500/30 via-cyan-500/30 to-amber-500/30 border border-cyan-400/60 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {pill.isChromaticSpecial ? '∞ Ativo' : 'Ativar ∞'}
                  </button>
                </div>

                <div className="grid grid-cols-12 gap-2.5 items-center">
                  <div className="col-span-4">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {pill.isChromaticSpecial ? 'Símbolo' : 'Nº Círculo'}
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      disabled={Boolean(pill.isChromaticSpecial)}
                      value={pill.isChromaticSpecial ? '∞' : pill.badgeValue}
                      onChange={(e) =>
                        handleUpdatePill(idx, {
                          badgeValue: e.target.value,
                        })
                      }
                      className={`w-full px-2.5 py-1.5 rounded bg-[#0B0D14] border border-slate-700 text-xs font-bold text-white text-center ${
                        pill.isChromaticSpecial ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  <div className="col-span-5">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Valor do Ataque
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={pill.mainText}
                      onChange={(e) =>
                        handleUpdatePill(idx, {
                          mainText: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-[#0B0D14] border border-slate-700 text-xs font-bold text-white"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {pill.isChromaticSpecial ? 'Cromático' : 'Cor'}
                    </label>
                    {pill.isChromaticSpecial ? (
                      <div
                        className="w-full h-8 rounded border border-white/30 flex items-center justify-center text-xs font-bold text-white"
                        style={{
                          background:
                            'linear-gradient(135deg, #FF0066, #00EAFF, #FFB800)',
                        }}
                        title="Círculo Cromático Ativo"
                      >
                        ∞
                      </div>
                    ) : (
                      <input
                        type="color"
                        value={pill.badgeColor}
                        onChange={(e) =>
                          handleUpdatePill(idx, {
                            badgeColor: e.target.value,
                          })
                        }
                        className="w-full h-8 rounded cursor-pointer bg-transparent border-0"
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Texto Centralizado (Ex: magic)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={pill.mainText}
                  onChange={(e) =>
                    handleUpdatePill(idx, {
                      mainText: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded bg-[#0B0D14] border border-slate-700 text-xs font-bold text-white"
                />
              </div>
            )}
          </div>
        ))}
    </div>
  );
};
