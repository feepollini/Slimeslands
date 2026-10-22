import React from 'react';
import type { TerrainPenConfig, FlowerPreset } from '../../types/terrainPen';
import { FLOWER_PRESETS } from './constants';
import { generateFlowerSpritePNG, FlowerStyle } from '../../utils/terrainTextures';
import { Flower2, Sliders, Plus, Trash2 } from 'lucide-react';

interface Props {
  config: TerrainPenConfig;
  updateConfig: (updates: Partial<TerrainPenConfig>) => void;
  onSelectFlowerPreset: (preset: FlowerPreset) => void;
}

export const FlowersModePanel: React.FC<Props> = ({
  config,
  updateConfig,
  onSelectFlowerPreset,
}) => {
  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* PRESETS DE FLORES */}
      <div className="p-3.5 bg-slate-900 border border-pink-800/60 rounded-2xl space-y-3">
        <div className="flex items-center gap-1.5 pb-1 border-b border-pink-800/40 text-xs font-bold text-pink-300">
          <Flower2 className="w-3.5 h-3.5 text-pink-400" />
          <span>Presets de Flores Jelly Procedurais</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {FLOWER_PRESETS.map((p) => {
            const isSelected = (config.flowerPreset || 'daisy') === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectFlowerPreset(p.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? 'bg-pink-950/80 border-pink-400 text-pink-200 shadow-sm ring-1 ring-pink-400/40'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">{p.icon}</span>
                  <span className="w-3 h-3 rounded-full border border-white/20 shadow-xs" style={{ backgroundColor: p.color }} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">{p.label}</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{p.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* PARÂMETROS DE FLORES */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center gap-1.5 pb-1 border-b border-slate-800 text-xs font-bold text-pink-300">
          <Sliders className="w-3.5 h-3.5" />
          <span>Escala & Dispersão de Flores</span>
        </div>

        {/* Raio do Pincel de Flores */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Raio do Campo Floral</span>
            <span className="font-mono text-pink-300 font-bold bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20 text-xs">
              {config.brushRadius}px
            </span>
          </div>
          <input
            type="range"
            min={20}
            max={120}
            step={4}
            value={config.brushRadius}
            onChange={(e) => updateConfig({ brushRadius: parseInt(e.target.value, 10) })}
            className="w-full accent-pink-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
          />
        </div>

        {/* Escala da Flor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Escala das Pétalas</span>
            <span className="font-mono text-pink-300 font-bold bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20 text-xs">
              {config.bladeBaseScale.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min={0.4}
            max={2.5}
            step={0.05}
            value={config.bladeBaseScale}
            onChange={(e) => updateConfig({ bladeBaseScale: parseFloat(e.target.value) })}
            className="w-full accent-pink-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
          />
        </div>

        {/* Botão Gerar & Adicionar Flor */}
        <button
          type="button"
          onClick={() => {
            const preset = config.flowerPreset || 'daisy';
            const dataUrl = generateFlowerSpritePNG(preset as FlowerStyle);
            const newAsset = {
              id: `flower_${preset}_${Date.now()}`,
              name: `Flor ${FLOWER_PRESETS.find((p) => p.id === preset)?.label || 'Flor'}`,
              dataUrl,
              scale: 1.0,
              weight: 80,
              enabled: true,
            };
            updateConfig({
              assets: [...(config.assets || []), newAsset],
            });
          }}
          className="w-full py-2 px-3 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Gerar Nova Flor Procedural</span>
        </button>
      </div>

      {/* ACERVO DE FLORES */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-xs font-bold text-pink-300">
          <span className="flex items-center gap-1.5">
            <Flower2 className="w-3.5 h-3.5" />
            <span>Flores Ativas ({config.assets?.length || 0})</span>
          </span>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {(config.assets || []).map((asset, idx) => (
            <div key={asset.id} className="p-2 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
              <div className="w-12 h-12 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center p-1 shrink-0">
                <img src={asset.dataUrl} alt={asset.name} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-200 truncate">{asset.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-400">Escala: {asset.scale.toFixed(2)}x</span>
                  <span className="text-[10px] text-pink-400">Peso: {asset.weight}%</span>
                </div>
              </div>
              {config.assets.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const updated = config.assets.filter((_, i) => i !== idx);
                    updateConfig({ assets: updated });
                  }}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
