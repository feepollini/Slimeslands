import React from 'react';
import { MarkerModuleCommonProps } from '../types';
import { Flame } from 'lucide-react';

export const MarkerLightModule: React.FC<MarkerModuleCommonProps> = ({
  marker,
  onUpdateMarker,
}) => {
  return (
    <div className="p-3 bg-slate-950 border border-amber-500/40 rounded-xl space-y-2.5">
      <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
        <Flame className="w-3.5 h-3.5 text-amber-400" />
        <span>Iluminação & Halo de Luz</span>
      </span>

      {/* Presets Rápidos de Luz */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
          Presets de Luz:
        </label>
        <div className="grid grid-cols-3 gap-1 text-[10px]">
          {[
            { id: 'torch', label: '🕯️ Tocha', radius: 160, color: '#f59e0b', intensity: 0.85, flicker: true },
            { id: 'lamp', label: '💡 Poste', radius: 220, color: '#fef08a', intensity: 0.8, flicker: false },
            { id: 'crystal', label: '💎 Cristal', radius: 180, color: '#38bdf8', intensity: 0.85, flicker: true },
            { id: 'campfire', label: '🔥 Fogueira', radius: 260, color: '#f97316', intensity: 0.9, flicker: true },
            { id: 'arcane', label: '🔮 Arcano', radius: 200, color: '#c084fc', intensity: 0.8, flicker: true },
          ].map((pr) => (
            <button
              key={pr.id}
              type="button"
              onClick={() =>
                onUpdateMarker(marker.id, {
                  lightConfig: {
                    preset: pr.id as any,
                    radius: pr.radius,
                    color: pr.color,
                    intensity: pr.intensity,
                    flicker: pr.flicker,
                  },
                })
              }
              className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                marker.lightConfig?.preset === pr.id
                  ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-bold shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {pr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders de Raio e Brilho */}
      <div className="space-y-1.5 pt-1 border-t border-slate-850">
        <div className="flex items-center justify-between text-[10px] text-slate-300">
          <span>Raio de Iluminação:</span>
          <span className="font-mono text-amber-300 font-bold">
            {marker.lightConfig?.radius || 180}px
          </span>
        </div>
        <input
          type="range"
          min="40"
          max="500"
          step="10"
          value={marker.lightConfig?.radius || 180}
          onChange={(e) =>
            onUpdateMarker(marker.id, {
              lightConfig: {
                ...(marker.lightConfig || {}),
                radius: Number(e.target.value),
                preset: 'custom',
              },
            })
          }
          className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />

        <div className="flex items-center justify-between text-[10px] text-slate-300 pt-1">
          <span>Intensidade / Brilho:</span>
          <span className="font-mono text-amber-300 font-bold">
            {Math.round((marker.lightConfig?.intensity ?? 0.8) * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0.2"
          max="1.0"
          step="0.05"
          value={marker.lightConfig?.intensity ?? 0.8}
          onChange={(e) =>
            onUpdateMarker(marker.id, {
              lightConfig: {
                ...(marker.lightConfig || {}),
                intensity: Number(e.target.value),
                preset: 'custom',
              },
            })
          }
          className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />

        {/* Cor da luz */}
        <div className="flex items-center justify-between pt-1 text-[10px]">
          <span className="text-slate-300 font-medium">Cor da Luz:</span>
          <div className="flex items-center gap-1.5">
            {['#f59e0b', '#fef08a', '#38bdf8', '#f97316', '#c084fc', '#ffffff'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() =>
                  onUpdateMarker(marker.id, {
                    lightConfig: {
                      ...(marker.lightConfig || {}),
                      color: c,
                      preset: 'custom',
                    },
                  })
                }
                style={{ backgroundColor: c }}
                className={`w-4 h-4 rounded-full border transition-transform hover:scale-125 cursor-pointer ${
                  (marker.lightConfig?.color || '#f59e0b') === c ? 'ring-2 ring-white scale-110' : 'border-slate-700'
                }`}
              />
            ))}
            <input
              type="color"
              value={marker.lightConfig?.color || '#f59e0b'}
              onChange={(e) =>
                onUpdateMarker(marker.id, {
                  lightConfig: {
                    ...(marker.lightConfig || {}),
                    color: e.target.value,
                    preset: 'custom',
                  },
                })
              }
              className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
            />
          </div>
        </div>

        {/* Tremeluzir (flicker) */}
        <label className="flex items-center justify-between gap-2 cursor-pointer pt-1 text-[10px]">
          <span className="text-slate-300">🔥 Tremeluzir (Efeito Chama/Flicker)</span>
          <input
            type="checkbox"
            checked={marker.lightConfig?.flicker !== false}
            onChange={(e) =>
              onUpdateMarker(marker.id, {
                lightConfig: {
                  ...(marker.lightConfig || {}),
                  flicker: e.target.checked,
                },
              })
            }
            className="w-3.5 h-3.5 accent-amber-400 rounded cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
