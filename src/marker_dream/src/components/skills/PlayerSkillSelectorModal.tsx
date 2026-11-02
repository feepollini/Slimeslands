/*
 * ============================================================================
 * DIRETRIZ RIGIDA DE PRESERVACAO DA FORJA DE SKILLS & ENGINE:
 * Nao recriar, nao imaginar, nao modificar efeitos, texturas, animacoes, logicas,
 * nao resumir, nao censurar, nao mentir. Em caso de duvida pare imediatamente.
 * Nao alucinar, nao poluir, nao manchar o projeto, nao adicionar novas funcs,
 * nao quebrar nada. A forja de skills e suas habilidades foram desenvolvidas
 * com perfeicao e devem ser mantidas intactas.
 * O modulo TreeChat nao pode ser alterado na etapa 1 e deve permanecer intacto.
 * ============================================================================
 */

import React, { useState, useMemo } from 'react';
import { X, Search, Check } from 'lucide-react';
import { VFX_PRESETS } from '../../vfx_engine/vfx/presets';

interface PlayerSkillSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSkillId: string;
  onSelectSkill: (skillId: string) => void;
}

const TAG_EMOJI: Record<string, string> = {
  fogo: '🔥',
  gelo: '❄️',
  energia: '⚡',
  agua: '💧',
  terra: '🪨',
  ar: '💨',
  planta: '🌿',
  luz: '☀️',
  trevas: '💀',
  toxico: '🧪',
  magia: '🔮',
  cura: '💖',
  buffs: '🛡️',
  flecheiro: '🏹',
  invocador: '📜',
  pocao: '🧪',
};

export const PlayerSkillSelectorModal: React.FC<PlayerSkillSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedSkillId,
  onSelectSkill,
}) => {
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return VFX_PRESETS;
    return VFX_PRESETS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.number.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-2 bg-black/60 select-none">
      <div className="relative w-80 max-w-[92vw] max-h-[380px] flex flex-col rounded-xl bg-slate-950 border border-amber-500/50 shadow-2xl overflow-hidden text-white">
        {/* Header Compacto */}
        <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-black text-amber-300 uppercase tracking-wide">
            🔮 Trocar Skill do Player
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Busca Rápida */}
        <div className="p-2 border-b border-slate-800 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar skill ou elemento..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-2 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Lista Ultra-Compacta (1 linha por skill, zero peso) */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-900/80 p-1">
          {list.map((preset) => {
            const isEquipped = preset.id === selectedSkillId;
            const emoji = TAG_EMOJI[preset.tags[0]] || '✨';

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  onSelectSkill(preset.id);
                  onClose();
                }}
                className={`w-full px-2 py-1.5 rounded text-left flex items-center justify-between gap-1 text-[11px] transition-colors cursor-pointer ${
                  isEquipped
                    ? 'bg-amber-500/20 text-amber-200 font-bold border border-amber-500/40'
                    : 'hover:bg-slate-800/80 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="text-xs shrink-0">{emoji}</span>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    #{preset.number}
                  </span>
                  <span className="truncate">{preset.name}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0 text-[10px] font-mono text-slate-400">
                  <span>{preset.cooldownSec}s</span>
                  {isEquipped && <Check className="w-3 h-3 text-amber-400 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Rodapé Informativo Mínimo */}
        <div className="px-2.5 py-1.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400 shrink-0">
          <span>{list.length} skills disponíveis</span>
          <span className="text-amber-400 font-mono">Clique para equipar</span>
        </div>
      </div>
    </div>
  );
};
