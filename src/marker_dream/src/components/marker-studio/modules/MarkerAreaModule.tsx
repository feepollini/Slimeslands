import React from 'react';
import { MarkerModuleCommonProps } from '../types';

export const MarkerAreaModule: React.FC<MarkerModuleCommonProps> = ({
  marker,
  onUpdateMarker,
}) => {
  return (
    <div className="p-3 bg-slate-950 border border-blue-500/40 rounded-xl space-y-2.5">
      <span className="font-bold text-blue-300 text-xs flex items-center gap-1.5">
        <span>📐</span>
        <span>Dimensões e Zona da Área</span>
      </span>

      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => onUpdateMarker(marker.id, { areaShape: 'rect' })}
          className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
            (marker.areaShape || 'rect') === 'rect'
              ? 'bg-blue-500/25 border-blue-400 text-blue-200 font-bold shadow-sm'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          ⬛ Retangular
        </button>
        <button
          type="button"
          onClick={() => onUpdateMarker(marker.id, { areaShape: 'circle' })}
          className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
            marker.areaShape === 'circle'
              ? 'bg-blue-500/25 border-blue-400 text-blue-200 font-bold shadow-sm'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          ⭕ Circular
        </button>
      </div>

      {marker.areaShape === 'circle' ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-300">
            <span>Raio da Área:</span>
            <span className="font-mono text-blue-300 font-bold">
              {marker.areaRadius || 80}px
            </span>
          </div>
          <input
            type="range"
            min="32"
            max="400"
            step="8"
            value={marker.areaRadius || 80}
            onChange={(e) => onUpdateMarker(marker.id, { areaRadius: Number(e.target.value) })}
            className="w-full accent-blue-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <span>Largura:</span>
              <span className="font-mono text-blue-300 font-bold">{marker.areaWidth || 160}px</span>
            </div>
            <input
              type="range"
              min="40"
              max="600"
              step="10"
              value={marker.areaWidth || 160}
              onChange={(e) => onUpdateMarker(marker.id, { areaWidth: Number(e.target.value) })}
              className="w-full accent-blue-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <span>Altura:</span>
              <span className="font-mono text-blue-300 font-bold">{marker.areaHeight || 120}px</span>
            </div>
            <input
              type="range"
              min="40"
              max="600"
              step="10"
              value={marker.areaHeight || 120}
              onChange={(e) => onUpdateMarker(marker.id, { areaHeight: Number(e.target.value) })}
              className="w-full accent-blue-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};
