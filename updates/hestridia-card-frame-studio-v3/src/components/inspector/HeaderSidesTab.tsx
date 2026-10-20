import React from 'react';
import { CardData } from '../../types/card';

interface HeaderSidesTabProps {
  activeCard: CardData;
  updateActiveCard: (updater: (prev: CardData) => CardData) => void;
}

export const HeaderSidesTab: React.FC<HeaderSidesTabProps> = ({
  activeCard,
  updateActiveCard,
}) => {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          Nome no Topo da Carta
        </label>
        <input
          type="text"
          value={activeCard.title}
          onChange={(e) =>
            updateActiveCard((prev) => ({
              ...prev,
              title: e.target.value,
            }))
          }
          placeholder="Ex: Hestridia God"
          className="w-full px-3.5 py-2.5 rounded-lg bg-[#121521] border border-slate-800 text-sm text-white focus:outline-none focus:border-red-500"
        />
      </div>

      <div className="pt-3 border-t border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-300">
            Aba Lateral Esquerda (Pontos de Vida)
          </h4>
          <button
            onClick={() =>
              updateActiveCard((prev) => ({
                ...prev,
                isPvChromatic: !prev.isPvChromatic,
              }))
            }
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
              activeCard.isPvChromatic
                ? 'bg-gradient-to-r from-pink-500/30 via-cyan-500/30 to-amber-500/30 border border-cyan-400/60 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeCard.isPvChromatic ? 'PV Cromático ON' : 'PV Cromático (Opcional)'}
          </button>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Texto Vertical Esquerdo (Ex: PV500)
          </label>
          <input
            type="text"
            maxLength={8}
            value={activeCard.pvText}
            onChange={(e) =>
              updateActiveCard((prev) => ({
                ...prev,
                pvText: e.target.value.toUpperCase(),
              }))
            }
            className="w-full px-3.5 py-2 rounded-lg bg-[#121521] border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/80 space-y-4">
        <h4 className="text-xs font-semibold text-slate-300">
          Aba Lateral Direita (Elemento & Classe)
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Elemento (Cápsula)
            </label>
            <input
              type="text"
              maxLength={7}
              value={activeCard.elementText}
              onChange={(e) =>
                updateActiveCard((prev) => ({
                  ...prev,
                  elementText: e.target.value.toUpperCase(),
                }))
              }
              placeholder="TERRA"
              className="w-full px-3 py-2 rounded-lg bg-[#121521] border border-slate-800 text-sm font-semibold text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Letra do Rank (Círculo)
            </label>
            <input
              type="text"
              maxLength={2}
              value={activeCard.rankBadgeText}
              onChange={(e) =>
                updateActiveCard((prev) => ({
                  ...prev,
                  rankBadgeText: e.target.value.toUpperCase(),
                }))
              }
              placeholder="S"
              className="w-full px-3 py-2 rounded-lg bg-[#121521] border border-slate-800 text-sm font-semibold text-white focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Style Toggle for Element Capsule: Standard White BG vs Element Color BG + White Text */}
        <div className="p-3 rounded-lg bg-[#121521] border border-slate-800 flex items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-slate-200 block">
              Estilo da Cápsula de Elemento ({activeCard.elementText || 'TERRA'})
            </span>
            <span className="text-[11px] text-slate-400">
              {activeCard.invertElementCapsule
                ? 'Fundo na cor do elemento + Texto Branco'
                : 'Fundo Branco + Texto na cor do elemento'}
            </span>
          </div>
          <button
            onClick={() =>
              updateActiveCard((prev) => ({
                ...prev,
                invertElementCapsule: !prev.invertElementCapsule,
              }))
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeCard.invertElementCapsule
                ? 'bg-emerald-600/25 border border-emerald-500/50 text-emerald-200'
                : 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {activeCard.invertElementCapsule
              ? 'Fundo Colorido + Texto Branco'
              : 'Inverter para Fundo Colorido'}
          </button>
        </div>

        {/* Chromatic Rank Circle Toggle */}
        <div className="p-3 rounded-lg bg-[#121521] border border-slate-800 flex items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-slate-200 block">
              Círculo de Ranking ({activeCard.rankBadgeText || 'S'}) Cromático
            </span>
            <span className="text-[11px] text-slate-400">
              Substitui a cor sólida pelo efeito cromático animado
            </span>
          </div>
          <button
            onClick={() =>
              updateActiveCard((prev) => ({
                ...prev,
                isRankChromatic: !prev.isRankChromatic,
              }))
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeCard.isRankChromatic
                ? 'bg-gradient-to-r from-pink-500/30 via-cyan-500/30 to-amber-500/30 border border-cyan-400/60 text-white'
                : 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {activeCard.isRankChromatic ? 'Cromático Ativo' : 'Ativar Cromático'}
          </button>
        </div>

        <div>
          <span className="block text-xs text-slate-400 mb-1.5">
            Predefinições Rápidas de Elemento:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'TERRA', color: '#007A1C' },
              { label: 'FOGO', color: '#D91B1B' },
              { label: 'AGUA', color: '#0055CC' },
              { label: 'VENTO', color: '#0D9488' },
              { label: 'LUZ', color: '#CA8A04' },
              { label: 'TREVA', color: '#6B00FF' },
            ].map((el) => (
              <button
                key={el.label}
                onClick={() =>
                  updateActiveCard((prev) => ({
                    ...prev,
                    elementText: el.label,
                    elementTextColor: el.color,
                  }))
                }
                className="px-2.5 py-1 text-xs font-semibold rounded bg-[#121521] border border-slate-800 hover:border-slate-600 text-slate-200 cursor-pointer"
              >
                {el.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="p-2.5 rounded-lg bg-[#121521] border border-slate-800 flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-xs font-medium text-slate-200 block">
                Cor do Elemento
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {activeCard.elementTextColor}
              </span>
            </div>
            <input
              type="color"
              value={activeCard.elementTextColor}
              onChange={(e) =>
                updateActiveCard((prev) => ({
                  ...prev,
                  elementTextColor: e.target.value,
                }))
              }
              className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
            />
          </label>

          <label className="p-2.5 rounded-lg bg-[#121521] border border-slate-800 flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-xs font-medium text-slate-200 block">
                Cor Círculo Rank
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {activeCard.isRankChromatic ? 'Cromático' : activeCard.rankCircleColor}
              </span>
            </div>
            <input
              type="color"
              value={activeCard.rankCircleColor}
              onChange={(e) =>
                updateActiveCard((prev) => ({
                  ...prev,
                  isRankChromatic: false,
                  rankCircleColor: e.target.value,
                }))
              }
              className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
