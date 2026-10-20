import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { CardData } from '../../types/card';

interface LoreMagicTabProps {
  activeCard: CardData;
  updateActiveCard: (updater: (prev: CardData) => CardData) => void;
}

export const LoreMagicTab: React.FC<LoreMagicTabProps> = ({
  activeCard,
  updateActiveCard,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 rounded-lg bg-[#121521] border border-slate-800">
        <span className="text-xs font-semibold text-slate-200">
          Exibir Caixa de Lore na Carta
        </span>
        <button
          onClick={() =>
            updateActiveCard((prev) => ({
              ...prev,
              showLoreBox: !prev.showLoreBox,
            }))
          }
          className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
            activeCard.showLoreBox
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {activeCard.showLoreBox ? (
            <>
              <Eye className="w-3.5 h-3.5" /> Visível
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5" /> Oculta
            </>
          )}
        </button>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">
          Subtítulo em Negrito (Topo da Caixa)
        </label>
        <input
          type="text"
          value={activeCard.loreHeader}
          onChange={(e) =>
            updateActiveCard((prev) => ({
              ...prev,
              loreHeader: e.target.value,
            }))
          }
          placeholder="Hetridia, Deusa da Floresta"
          className="w-full px-3 py-2 rounded-lg bg-[#121521] border border-slate-800 text-sm text-white focus:outline-none focus:border-red-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">
          História / Lore da Carta
        </label>
        <textarea
          rows={3}
          value={activeCard.loreBody}
          onChange={(e) =>
            updateActiveCard((prev) => ({
              ...prev,
              loreBody: e.target.value,
            }))
          }
          className="w-full px-3 py-2 rounded-lg bg-[#121521] border border-slate-800 text-xs leading-relaxed text-white focus:outline-none focus:border-red-500"
        />
      </div>

      <div className="pt-2 border-t border-slate-800/80 space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Prefixo da Habilidade (Negrito)
          </label>
          <input
            type="text"
            value={activeCard.magicPrefix}
            onChange={(e) =>
              updateActiveCard((prev) => ({
                ...prev,
                magicPrefix: e.target.value,
              }))
            }
            placeholder="✨ Habilidade mágica"
            className="w-full px-3 py-2 rounded-lg bg-[#121521] border border-slate-800 text-xs text-white focus:outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Descrição da Habilidade
          </label>
          <textarea
            rows={2}
            value={activeCard.magicDescription}
            onChange={(e) =>
              updateActiveCard((prev) => ({
                ...prev,
                magicDescription: e.target.value,
              }))
            }
            className="w-full px-3 py-2 rounded-lg bg-[#121521] border border-slate-800 text-xs text-white focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Opacidade do Fundo</span>
            <span className="font-mono tabular-nums text-slate-300">
              {activeCard.loreBoxOpacity}%
            </span>
          </div>
          <input
            type="range"
            min="25"
            max="100"
            value={activeCard.loreBoxOpacity}
            onChange={(e) =>
              updateActiveCard((prev) => ({
                ...prev,
                loreBoxOpacity: Number(e.target.value),
              }))
            }
            className="w-full accent-red-500 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Altura Vertical</span>
            <span className="font-mono tabular-nums text-slate-300">
              {activeCard.loreBoxY}px
            </span>
          </div>
          <input
            type="range"
            min="640"
            max="745"
            value={activeCard.loreBoxY}
            onChange={(e) =>
              updateActiveCard((prev) => ({
                ...prev,
                loreBoxY: Number(e.target.value),
              }))
            }
            className="w-full accent-red-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
