import React from 'react';
import { MarkerModuleCommonProps } from '../types';

export const MarkerNeutralModule: React.FC<MarkerModuleCommonProps> = ({
  marker,
  onUpdateMarker,
}) => {
  return (
    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
      <span className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
        <span>🪨</span>
        <span>Propriedades do Elemento de Cenário</span>
      </span>

      <button
        type="button"
        onClick={() => onUpdateMarker(marker.id, { markerOff: !marker.markerOff })}
        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
          marker.markerOff
            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
        }`}
      >
        <div>
          <div className="text-xs font-bold">Modo Chão / Piso Puro</div>
          <div className="text-[10px] text-slate-400">Desativa colisões e o herói anda por cima</div>
        </div>
        <span className="text-lg">{marker.markerOff ? '🔘' : '⚪'}</span>
      </button>
    </div>
  );
};
