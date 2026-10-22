import React, { useState } from 'react';
import {
  Sparkles,
  RotateCw,
  Plus,
  X,
  Layers,
  Image as ImageIcon,
  Check,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  originalName: string;
  layersCount: number;
  previewPngUrl?: string;
  onSaveOverwrite: () => void;
  onSaveAsNew: (newName: string) => void;
}

export const SaveMotionDecisionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  originalName,
  layersCount,
  previewPngUrl,
  onSaveOverwrite,
  onSaveAsNew,
}) => {
  const [newName, setNewName] = useState<string>(`${originalName} (Novo Motion)`);
  const [selectedOption, setSelectedOption] = useState<'overwrite' | 'as_new'>('overwrite');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedOption === 'overwrite') {
      onSaveOverwrite();
    } else {
      onSaveAsNew(newName.trim() || `${originalName} (Novo Motion)`);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10">
        {/* Top Header */}
        <div className="px-6 py-4 bg-black border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Salvar Composição
              </span>
              <h2 className="text-base font-bold text-white mt-0.5">
                Como deseja salvar esta animação?
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Preview Box */}
          <div className="flex items-center gap-3 bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800">
            <div className="w-14 h-14 bg-black rounded-xl border border-zinc-800 p-1 flex items-center justify-center shrink-0 overflow-hidden">
              {previewPngUrl ? (
                <img
                  src={previewPngUrl}
                  alt={originalName}
                  className="w-full h-full object-contain filter drop-shadow-md"
                />
              ) : (
                <ImageIcon className="w-6 h-6 text-zinc-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{originalName}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-sky-400" />
                  <span>{layersCount} camada{layersCount !== 1 ? 's' : ''}</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">Pronto para salvar</span>
              </div>
            </div>
          </div>

          {/* Duas Opções de Escolha */}
          <div className="space-y-2.5">
            {/* Opção 1: Sobrepor / Atualizar o Original */}
            <div
              onClick={() => setSelectedOption('overwrite')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                selectedOption === 'overwrite'
                  ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/40 shadow-sm'
                  : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  selectedOption === 'overwrite'
                    ? 'bg-amber-500 text-black font-bold'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                <RotateCw className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">
                    💾 Sobrepor / Atualizar Original
                  </h4>
                  {selectedOption === 'overwrite' && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-black flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Atualiza diretamente o marcador <strong className="text-zinc-200">"{originalName}"</strong> e sua composição correspondente no acervo da galeria.
                </p>
              </div>
            </div>

            {/* Opção 2: Salvar como Novo Asset Motion */}
            <div
              onClick={() => setSelectedOption('as_new')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                selectedOption === 'as_new'
                  ? 'bg-sky-500/10 border-sky-500 ring-1 ring-sky-500/40 shadow-sm'
                  : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  selectedOption === 'as_new'
                    ? 'bg-sky-500 text-black font-bold'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                <Plus className="w-4 h-4 font-bold" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">
                    ✨ Salvar como Novo Asset Motion
                  </h4>
                  {selectedOption === 'as_new' && (
                    <span className="w-4 h-4 rounded-full bg-sky-500 text-black flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Mantém o asset original intacto e cria um novo asset independente no Acervo da Galeria e no Mapa.
                </p>

                {selectedOption === 'as_new' && (
                  <div className="mt-3 pt-2 border-t border-zinc-800/80" onClick={(e) => e.stopPropagation()}>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1 font-bold">
                      Nome do Novo Asset Motion:
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Ex: Personagem (Andando - Variação)"
                      className="w-full bg-black border border-zinc-700 focus:border-sky-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-black border-t border-zinc-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Continuar Editando
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
              selectedOption === 'overwrite'
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                : 'bg-sky-500 hover:bg-sky-400 text-black shadow-sky-500/20'
            }`}
          >
            {selectedOption === 'overwrite' ? (
              <>
                <RotateCw className="w-4 h-4" />
                <span>Confirmar & Sobrepor</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Salvar como Novo Asset</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
