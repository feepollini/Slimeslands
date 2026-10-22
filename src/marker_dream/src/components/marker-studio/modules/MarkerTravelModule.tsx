import React from 'react';
import { MarkerModuleCommonProps } from '../types';

export const MarkerTravelModule: React.FC<MarkerModuleCommonProps> = ({
  marker,
  markers,
  project,
  onUpdateMarker,
}) => {
  return (
    <div className="p-3 bg-slate-950 border border-purple-500/40 rounded-xl space-y-2.5">
      <span className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
        <span>🌌</span>
        <span>Configurações do Portal de Viagem</span>
      </span>

      <label className="flex items-center justify-between gap-2 cursor-pointer bg-slate-900 px-2.5 py-1.5 rounded-xl border border-purple-500/30">
        <span className="text-[10px] font-bold text-purple-200">
          🌌 Teleporte automático com fade suave ao encostar
        </span>
        <input
          type="checkbox"
          checked={marker.travelAuto !== false}
          onChange={(e) => onUpdateMarker(marker.id, { travelAuto: e.target.checked })}
          className="w-4 h-4 accent-purple-400 rounded cursor-pointer shrink-0"
        />
      </label>

      <div>
        <label className="text-[10px] text-slate-400 block mb-1">
          Portal de Destino Conectado:
        </label>
        <select
          value={marker.targetTravelMarkerId || ''}
          onChange={(e) => {
            const newTargetId = e.target.value || undefined;
            onUpdateMarker(marker.id, { targetTravelMarkerId: newTargetId });
          }}
          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-400 font-semibold"
        >
          <option value="">(Selecione um marcador de destino)</option>
          {(project?.markers || markers || [])
            .filter((m) => m.id !== marker.id && (m.type === 'travel' || m.travelAuto !== undefined))
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.subBiomeId ? '💜' : '🗺️'} {m.name} ({Math.round(m.x)}, {Math.round(m.y)})
              </option>
            ))}
        </select>
      </div>
    </div>
  );
};
