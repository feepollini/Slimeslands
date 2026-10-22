import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';

interface SaveAsNewLevelModalProps {
  isOpen: boolean;
  defaultTitle: string;
  onClose: () => void;
  onSaveAsNew: (newName: string) => void;
}

export const SaveAsNewLevelModal: React.FC<SaveAsNewLevelModalProps> = ({
  isOpen,
  defaultTitle,
  onClose,
  onSaveAsNew,
}) => {
  const [levelName, setLevelName] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setLevelName(`${defaultTitle || 'Fase'} (Cópia)`);
    }
  }, [isOpen, defaultTitle]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = levelName.trim() || `${defaultTitle || 'Fase'} (Cópia)`;
    onSaveAsNew(finalName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-amber-500/50 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
              <Save className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Salvar como Nova Fase</h3>
              <p className="text-[11px] text-slate-400">
                Cria uma nova entrada independente no acervo de fases com todo o estado atual
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-amber-300">Nome da Nova Fase:</label>
          <input
            type="text"
            value={levelName}
            onChange={(e) => setLevelName(e.target.value)}
            placeholder={`${defaultTitle || 'Fase'} (Cópia)`}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-bold"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-md transition-all cursor-pointer"
          >
            Salvar Nova Fase
          </button>
        </div>
      </form>
    </div>
  );
};
