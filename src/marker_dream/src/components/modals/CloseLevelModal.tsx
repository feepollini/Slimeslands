import React from 'react';
import type { SavedLevel } from '../../types/map';

interface CloseLevelModalProps {
  closingLevel: SavedLevel | null;
  onCancel: () => void;
  onConfirmClose: (saveBeforeClose: boolean) => void;
}

export const CloseLevelModal: React.FC<CloseLevelModalProps> = ({
  closingLevel,
  onCancel,
  onConfirmClose,
}) => {
  if (!closingLevel) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0 text-lg">
            ⚠️
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white">Fechar aba da fase no workspace?</h3>
            <p className="text-xs text-slate-300 mt-1">
              Você está prestes a fechar a aba de{' '}
              <span className="font-semibold text-amber-300">"{closingLevel.name}"</span>.
              A fase continuará salva na Galeria / Hub de Fases. Deseja salvar as alterações recentes antes de fechar a aba?
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmClose(false)}
            className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 hover:text-rose-200 transition-colors"
          >
            Não Salvar
          </button>
          <button
            onClick={() => onConfirmClose(true)}
            className="w-full sm:w-auto px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-colors"
          >
            Salvar Fase e Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
