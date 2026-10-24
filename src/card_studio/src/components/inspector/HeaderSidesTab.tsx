import React, { useEffect, useState } from 'react';
import { CardData } from '../../types/card';
import { MobbyManager, Mobby } from '../../../../core/MobbyManager';

interface HeaderSidesTabProps {
  activeCard: CardData;
  updateActiveCard: (updater: (prev: CardData) => CardData) => void;
}

export const HeaderSidesTab: React.FC<HeaderSidesTabProps> = ({
  activeCard,
  updateActiveCard,
}) => {
  const [mobbys, setMobbys] = useState<Mobby[]>(() => MobbyManager.getMobbys());

  useEffect(() => {
    const refresh = () => setMobbys([...MobbyManager.getMobbys()]);
    window.addEventListener('slimelands:mobby-card-link-updated', refresh);
    return () => window.removeEventListener('slimelands:mobby-card-link-updated', refresh);
  }, []);

  const currentLinkedMobby =
    mobbys.find((m) => m.id === activeCard.linkedMobbyId) ||
    MobbyManager.getLinkedMobbyForCard(activeCard.id, activeCard.title);

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

      {/* PARÂMETRO DE VÍNCULO BIDIRECIONAL: CARTA ⇄ MOBBY (MOBBYS DUELOS) */}
      <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/40 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <span>👾</span>
            <span>Vínculo Mobby (Mobbys Duelos)</span>
          </span>
          {currentLinkedMobby && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              🔗 {currentLinkedMobby.name}
            </span>
          )}
        </div>

        <select
          value={currentLinkedMobby?.id || ''}
          onChange={(e) => {
            const nextMobbyId = e.target.value;
            const foundMobby = mobbys.find((m) => m.id === nextMobbyId);
            MobbyManager.setBidirectionalLink(
              nextMobbyId || null,
              activeCard.id,
              activeCard.title
            );
            updateActiveCard((prev) => ({
              ...prev,
              linkedMobbyId: foundMobby ? foundMobby.id : undefined,
              linkedMobbyName: foundMobby ? foundMobby.name : undefined,
            }));
            setMobbys([...MobbyManager.getMobbys()]);
          }}
          className="w-full px-3 py-2 rounded-lg bg-[#121521] border border-amber-500/40 text-xs font-bold text-amber-200 focus:outline-none focus:border-amber-400"
        >
          <option value="">— Nenhum Mobby Vinculado —</option>
          {mobbys.map((m) => (
            <option key={m.id} value={m.id}>
              👾 {m.name} (HP {m.hp} · ATK {m.atk})
            </option>
          ))}
        </select>

        {currentLinkedMobby && (
          <div className="flex items-center gap-2 pt-1">
            <img
              src={currentLinkedMobby.image}
              alt={currentLinkedMobby.name}
              className="w-9 h-9 rounded-lg object-contain bg-black/60 border border-amber-500/30 shrink-0"
            />
            <div className="flex-1 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (!currentLinkedMobby.image) return;
                  updateActiveCard((prev) => ({
                    ...prev,
                    imageUrl: currentLinkedMobby.image,
                    mediaType: 'image',
                  }));
                }}
                className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-bold text-amber-200 cursor-pointer"
                title="Usar a PNG deste Mobby como ilustração desta Carta"
              >
                🖼️ Puxar PNG do Mobby
              </button>
              {activeCard.imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    MobbyManager.setBidirectionalLink(
                      currentLinkedMobby.id,
                      activeCard.id,
                      activeCard.title,
                      activeCard.imageUrl || undefined
                    );
                    setMobbys([...MobbyManager.getMobbys()]);
                  }}
                  className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] font-bold text-emerald-200 cursor-pointer"
                  title="Enviar a arte desta Carta para o Mobby vinculado"
                >
                  🖼️ Enviar Arte p/ Mobby
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-300">
            {activeCard.entityType === 'Magia'
              ? '🛡️ Aba Lateral Esquerda (DF — Defesa Extra p/ PV do Player)'
              : 'Aba Lateral Esquerda (Pontos de Vida - PV)'}
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
            {activeCard.isPvChromatic
              ? `${activeCard.entityType === 'Magia' ? 'DF' : 'PV'} Cromático ON`
              : `${activeCard.entityType === 'Magia' ? 'DF' : 'PV'} Cromático (Opcional)`}
          </button>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            {activeCard.entityType === 'Magia'
              ? 'Texto Vertical Esquerdo (Ex: DF500 — Entra como Defesa Extra no PV do Player)'
              : 'Texto Vertical Esquerdo (Ex: PV500)'}
          </label>
          <input
            type="text"
            maxLength={8}
            value={
              activeCard.entityType === 'Magia'
                ? (activeCard.pvText || 'DF300').replace(/^PV/i, 'DF')
                : activeCard.pvText
            }
            onChange={(e) => {
              const rawVal = e.target.value.toUpperCase();
              const numVal = parseInt(rawVal.replace(/\D/g, ''), 10);
              updateActiveCard((prev) => ({
                ...prev,
                pvText: rawVal,
                ...( !isNaN(numVal) && numVal > 0 ? { pvNumber: numVal } : {} ),
              }));
            }}
            className="w-full px-3.5 py-2 rounded-lg bg-[#121521] border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-red-500"
          />
          {activeCard.entityType === 'Magia' && (
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[10px] text-cyan-300 font-semibold">Presets DF:</span>
              {[200, 350, 500, 750, 1000].map((dfVal) => (
                <button
                  key={dfVal}
                  type="button"
                  onClick={() =>
                    updateActiveCard((prev) => ({
                      ...prev,
                      pvNumber: dfVal,
                      pvText: `DF${dfVal}`,
                    }))
                  }
                  className="px-2 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 text-[10px] font-mono font-bold text-cyan-200 cursor-pointer"
                >
                  +DF{dfVal}
                </button>
              ))}
            </div>
          )}
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
