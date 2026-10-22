import React from 'react';
import type { TerrainPenConfig } from '../../types/terrainPen';
import { GROUND_QUICK_TEXTURES } from './constants';
import { generateTerrainNoisePNG } from '../../utils/terrainTextures';
import { Paintbrush, Sliders, RefreshCw, Plus, Palette, Trash2 } from 'lucide-react';

interface Props {
  config: TerrainPenConfig;
  updateConfig: (updates: Partial<TerrainPenConfig>) => void;
}

export const NoiseGroundModePanel: React.FC<Props> = ({ config, updateConfig }) => {
  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* TEXTURA DA TINTA DO CHÃO */}
      <div className="p-3.5 bg-slate-900 border border-amber-800/60 rounded-2xl space-y-3">
        <div className="flex items-center gap-1.5 pb-1 border-b border-amber-800/40 text-xs font-bold text-amber-300">
          <Paintbrush className="w-3.5 h-3.5 text-amber-400" />
          <span>Textura da Tinta do Chão (Pincel)</span>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed">
          Pinte caminhos, trechos de areia, lama, musgo ou água com textura de ruído micro-granulada.
        </p>

        {/* Cor Selecionada */}
        <div className="flex items-center gap-2.5 p-2 bg-slate-950 rounded-xl border border-slate-800">
          <input
            type="color"
            value={config.groundPaintColor || '#16a34a'}
            onChange={(e) => updateConfig({ groundPaintColor: e.target.value })}
            className="w-9 h-9 rounded-lg border-0 bg-transparent cursor-pointer shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-slate-400">Cor Selecionada do Terreno</div>
            <div className="font-mono text-amber-300 font-bold text-xs uppercase">
              {config.groundPaintColor || '#16a34a'}
            </div>
          </div>
        </div>

        {/* Texturas Rápidas para Pintar */}
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold block">Texturas Rápidas para Pintar:</span>
          <div className="grid grid-cols-2 gap-1.5">
            {GROUND_QUICK_TEXTURES.map((p) => {
              const isSelected = (config.groundPaintColor || '#16a34a').toLowerCase() === p.hex.toLowerCase();
              return (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => updateConfig({ groundPaintColor: p.hex })}
                  className={`py-1.5 px-2 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-200 border-amber-400 shadow-xs'
                      : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{p.emoji}</span>
                    <span className="text-[11px] truncate">{p.name}</span>
                  </span>
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: p.hex }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* PARÂMETROS DA TINTA & RUÍDO */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center gap-1.5 pb-1 border-b border-slate-800 text-xs font-bold text-amber-300">
          <Sliders className="w-3.5 h-3.5" />
          <span>Parâmetros de Granulação do Chão</span>
        </div>

        {/* Intensidade do Ruído */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Contraste / Intensidade do Grão</span>
            <span className="font-mono text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs">
              {Math.round((config.groundNoiseIntensity ?? 0.28) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.05}
            max={0.8}
            step={0.02}
            value={config.groundNoiseIntensity ?? 0.28}
            onChange={(e) => updateConfig({ groundNoiseIntensity: parseFloat(e.target.value) })}
            className="w-full accent-amber-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
          />
        </div>

        {/* Escala do Grão */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Frequência / Densidade do Grão</span>
            <span className="font-mono text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs">
              {((config.groundNoiseScale ?? 0.045) * 100).toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min={0.01}
            max={0.15}
            step={0.005}
            value={config.groundNoiseScale ?? 0.045}
            onChange={(e) => updateConfig({ groundNoiseScale: parseFloat(e.target.value) })}
            className="w-full accent-amber-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
          />
        </div>

        {/* Raio & Espaçamento do Pincel */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Raio do Pincel:</span>
              <span className="font-mono text-amber-300 font-bold">{config.brushRadius}px</span>
            </div>
            <input
              type="range"
              min={16}
              max={160}
              step={4}
              value={config.brushRadius}
              onChange={(e) => updateConfig({ brushRadius: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-400 h-1.5 bg-slate-950 rounded cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Espaçamento:</span>
              <span className="font-mono text-amber-300 font-bold">{config.spacing}px</span>
            </div>
            <input
              type="range"
              min={8}
              max={80}
              step={2}
              value={config.spacing}
              onChange={(e) => updateConfig({ spacing: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-400 h-1.5 bg-slate-950 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Botão Sortear Seed & Botão Adicionar Carimbo */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => updateConfig({ groundNoiseSeed: Math.floor(Math.random() * 100000) })}
            className="py-2 px-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Sortear Grão</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const hex = config.groundPaintColor || '#16a34a';
              const dataUrl = generateTerrainNoisePNG(
                hex,
                128,
                config.groundNoiseIntensity ?? 0.28,
                config.groundNoiseScale ?? 0.045,
                config.groundNoiseSeed ?? 42
              );
              const newAsset = {
                id: `noise_${Date.now()}`,
                name: `Solo ${hex.toUpperCase()}`,
                dataUrl,
                scale: 1.0,
                weight: 80,
                enabled: true,
              };
              updateConfig({
                assets: [...(config.assets || []), newAsset],
              });
            }}
            className="py-2 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Carimbo</span>
          </button>
        </div>
      </div>

      {/* ACERVO DE TEXTURAS DE CHÃO */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-xs font-bold text-amber-300">
          <span className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" />
            <span>Carimbos de Terreno Ativos ({config.assets?.length || 0})</span>
          </span>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {(config.assets || []).map((asset, idx) => (
            <div key={asset.id} className="p-2 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
              <div className="w-12 h-12 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                <img src={asset.dataUrl} alt={asset.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-200 truncate">{asset.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-400">Escala: {asset.scale.toFixed(2)}x</span>
                  <span className="text-[10px] text-amber-400">Peso: {asset.weight}%</span>
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
