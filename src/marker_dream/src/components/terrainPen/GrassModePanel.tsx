import React from 'react';
import type { TerrainPenConfig, GrassBladePreset } from '../../types/terrainPen';
import { GRASS_PRESETS } from './constants';
import {
  Sliders,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Wind,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';

interface Props {
  config: TerrainPenConfig;
  updateConfig: (updates: Partial<TerrainPenConfig>) => void;
  onSelectGrassPreset: (preset: GrassBladePreset) => void;
  onUploadCustomSprite: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const GrassModePanel: React.FC<Props> = ({
  config,
  updateConfig,
  onSelectGrassPreset,
  onUploadCustomSprite,
}) => {
  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* SEÇÃO 1: GEOMETRIA EIXO POR EIXO */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center gap-1.5 pb-1 border-b border-slate-800 text-xs font-bold text-emerald-300">
          <Sliders className="w-3.5 h-3.5" />
          <span>Geometria Eixo por Eixo</span>
        </div>

        {/* Escala Vertical Y */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Escala Vertical (Eixo Y - Altura)</span>
            <span className="font-mono text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-xs">
              {config.verticalHeightScale.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min={0.2}
            max={3.0}
            step={0.05}
            value={config.verticalHeightScale}
            onChange={(e) => updateConfig({ verticalHeightScale: parseFloat(e.target.value) })}
            className="w-full accent-emerald-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
          />
        </div>

        {/* Escala Horizontal X */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Escala Horizontal (Eixo X - Largura)</span>
            <span className="font-mono text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-xs">
              {config.horizontalWidthScale.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min={0.2}
            max={3.0}
            step={0.05}
            value={config.horizontalWidthScale}
            onChange={(e) => updateConfig({ horizontalWidthScale: parseFloat(e.target.value) })}
            className="w-full accent-emerald-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
          />
        </div>

        {/* Escala Base Global */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Escala Base Global da Lâmina</span>
            <span className="font-mono text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-xs">
              {config.bladeBaseScale.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min={0.3}
            max={2.5}
            step={0.05}
            value={config.bladeBaseScale}
            onChange={(e) => updateConfig({ bladeBaseScale: parseFloat(e.target.value) })}
            className="w-full accent-emerald-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
          />
        </div>

        {/* Inclinação da Lâmina (Blade Tilt) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Inclinação Angular da Lâmina (Tilt)</span>
            <span className="font-mono text-cyan-300 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 text-xs">
              {config.bladeTilt}°
            </span>
          </div>
          <input
            type="range"
            min={-60}
            max={60}
            step={1}
            value={config.bladeTilt}
            onChange={(e) => updateConfig({ bladeTilt: parseInt(e.target.value, 10) })}
            className="w-full accent-cyan-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* SEÇÃO 2: DENSIDADE, ESPAÇAMENTO & RAIO */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center gap-1.5 pb-1 border-b border-slate-800 text-xs font-bold text-emerald-300">
          <Sliders className="w-3.5 h-3.5" />
          <span>Densidade, Espaçamento & Raio do Pincel</span>
        </div>

        {/* Densidade Relativa */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Densidade Relativa do Gramado</span>
            <span className="font-mono text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-xs">
              {config.relativeDensity}%
            </span>
          </div>
          <input
            type="range"
            min={20}
            max={350}
            step={5}
            value={config.relativeDensity}
            onChange={(e) => updateConfig({ relativeDensity: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
          />
        </div>

        {/* Espaçamento da Passada */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Espaçamento entre Tufos (Passada)</span>
            <span className="font-mono text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-xs">
              {config.spacing}px
            </span>
          </div>
          <input
            type="range"
            min={6}
            max={120}
            step={2}
            value={config.spacing}
            onChange={(e) => updateConfig({ spacing: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
          />
        </div>

        {/* Raio do Pincel de Dispersão */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Raio de Dispersão do Pincel</span>
            <span className="font-mono text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-xs">
              {config.brushRadius}px
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={150}
            step={2}
            value={config.brushRadius}
            onChange={(e) => updateConfig({ brushRadius: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* SEÇÃO 3: VARIAÇÕES ALEATÓRIAS */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <span className="text-xs font-bold text-slate-200 block pb-1 border-b border-slate-800">
          Variações Aleatórias Automáticas
        </span>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateConfig({ randomMirrorH: !config.randomMirrorH })}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              config.randomMirrorH
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-xs'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span>Espelho H</span>
          </button>
          <button
            type="button"
            onClick={() => updateConfig({ randomMirrorV: !config.randomMirrorV })}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              config.randomMirrorV
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-xs'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            <FlipVertical className="w-3.5 h-3.5" />
            <span>Espelho V</span>
          </button>
        </div>

        {/* Rotação Aleatória */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => updateConfig({ randomRotation: !config.randomRotation })}
              className="flex items-center gap-1.5 font-medium text-slate-300 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Rotação Aleatória:</span>
              <span className={`text-[10px] font-bold ${config.randomRotation ? 'text-emerald-400' : 'text-slate-500'}`}>
                {config.randomRotation ? 'Ativa' : 'Desativada'}
              </span>
            </button>
            <span className="font-mono text-emerald-300 font-bold text-xs">
              ±{config.randomRotationMax}°
            </span>
          </div>
          {config.randomRotation && (
            <input
              type="range"
              min={5}
              max={45}
              step={1}
              value={config.randomRotationMax}
              onChange={(e) => updateConfig({ randomRotationMax: parseInt(e.target.value, 10) })}
              className="w-full accent-emerald-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
          )}
        </div>

        {/* Faixa de Escala Min e Max */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Escala Mínima:</span>
              <span className="font-mono text-emerald-300 font-bold">{config.randomScaleMin.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={0.4}
              max={1.0}
              step={0.05}
              value={config.randomScaleMin}
              onChange={(e) => updateConfig({ randomScaleMin: parseFloat(e.target.value) })}
              className="w-full accent-emerald-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Escala Máxima:</span>
              <span className="font-mono text-emerald-300 font-bold">{config.randomScaleMax.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={2.0}
              step={0.05}
              value={config.randomScaleMax}
              onChange={(e) => updateConfig({ randomScaleMax: parseFloat(e.target.value) })}
              className="w-full accent-emerald-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 4: FÍSICA DE VENTO & GELATINA */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-emerald-300 flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span>Física de Movimento do Gramado:</span>
          </span>
          <span className="text-[10px] font-mono text-cyan-300 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            {config.effect === 'wind' && '💨 Vento Orgânico'}
            {config.effect === 'jelly' && '🍮 Gelatina Elástica'}
            {config.effect === 'none' && '⚪ Estático'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => updateConfig({ effect: 'wind' })}
            className={`py-1.5 px-2 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              config.effect === 'wind'
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold shadow-xs'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>💨</span>
            <span>Vento</span>
          </button>
          <button
            type="button"
            onClick={() => updateConfig({ effect: 'jelly' })}
            className={`py-1.5 px-2 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              config.effect === 'jelly'
                ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-bold shadow-xs'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>🍮</span>
            <span>Gelatina</span>
          </button>
          <button
            type="button"
            onClick={() => updateConfig({ effect: 'none' })}
            className={`py-1.5 px-2 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              config.effect === 'none'
                ? 'bg-slate-800 border-slate-600 text-slate-200 font-bold shadow-xs'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>⚪</span>
            <span>Estático</span>
          </button>
        </div>

        {config.effect !== 'none' && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">⚡ Velocidade:</span>
                <span className="font-mono text-cyan-300 font-bold">{config.effectSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={3.0}
                step={0.1}
                value={config.effectSpeed}
                onChange={(e) => updateConfig({ effectSpeed: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">💥 Intensidade:</span>
                <span className="font-mono text-cyan-300 font-bold">{config.effectIntensity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={3.0}
                step={0.1}
                value={config.effectIntensity}
                onChange={(e) => updateConfig({ effectIntensity: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* SEÇÃO 5: PRESETS PROCEDURAIS DE LÂMINAS */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200">Presets de Lâminas (Procedural)</span>
          <span className="text-[10px] text-emerald-400 font-mono">Shaders & Sprites</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {GRASS_PRESETS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectGrassPreset(opt.id)}
              className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                config.activePreset === opt.id
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </span>
                {config.activePreset === opt.id && <Check className="w-3 h-3 text-emerald-400" />}
              </div>
              <span className="text-[10px] text-slate-400">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SEÇÃO 6: ACERVO MULTI-ASSETS & PESOS (%) DE SORTEIO */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-emerald-300">Acervo Multi-Tufos & Pesos</span>
            <span className="text-[10px] text-slate-400 font-mono">({config.assets?.length || 0})</span>
          </div>
          <label className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-slate-950 font-bold text-[10px] transition-colors cursor-pointer shadow-xs">
            <Plus className="w-3 h-3" />
            <span>Novo PNG</span>
            <input
              type="file"
              accept="image/png,image/webp"
              onChange={onUploadCustomSprite}
              className="hidden"
            />
          </label>
        </div>

        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          {(config.assets || []).map((asset, idx) => (
            <div
              key={asset.id}
              className={`p-2.5 rounded-xl border transition-all ${
                asset.enabled
                  ? 'bg-slate-950/80 border-slate-800 text-slate-200'
                  : 'bg-slate-950/40 border-slate-900/60 text-slate-500 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={asset.enabled}
                    onChange={(e) => {
                      const updated = [...config.assets];
                      updated[idx] = { ...asset, enabled: e.target.checked };
                      updateConfig({ assets: updated });
                    }}
                    className="rounded accent-emerald-500 cursor-pointer"
                  />
                  <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
                    <img src={asset.dataUrl} alt={asset.name} className="w-full h-full object-contain" />
                  </div>
                  <span className="text-xs font-semibold">{asset.name}</span>
                </div>

                {config.assets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = config.assets.filter((_, i) => i !== idx);
                      updateConfig({ assets: updated });
                    }}
                    className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                    title="Remover este tufo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Escala:</span>
                    <span className="font-mono text-emerald-300 font-bold">{asset.scale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.3}
                    max={2.5}
                    step={0.05}
                    value={asset.scale}
                    onChange={(e) => {
                      const updated = [...config.assets];
                      updated[idx] = { ...asset, scale: parseFloat(e.target.value) };
                      updateConfig({ assets: updated });
                    }}
                    className="w-full accent-emerald-400 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Peso (Sorteio):</span>
                    <span className="font-mono text-emerald-300 font-bold">{asset.weight}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    step={1}
                    value={asset.weight}
                    onChange={(e) => {
                      const updated = [...config.assets];
                      updated[idx] = { ...asset, weight: parseInt(e.target.value, 10) };
                      updateConfig({ assets: updated });
                    }}
                    className="w-full accent-emerald-400 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
