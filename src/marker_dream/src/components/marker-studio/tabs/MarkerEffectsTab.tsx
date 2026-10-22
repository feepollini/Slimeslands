import React from 'react';
import { MapMarker } from '../../../types/map';
import { OFFICIAL_EFFECTS } from '../../../utils/motionCanvasEngine';

interface MarkerEffectsTabProps {
  selectedMarker: MapMarker;
  onUpdateMarker: (id: string, updates: Partial<MapMarker>) => void;
}

export const MarkerEffectsTab: React.FC<MarkerEffectsTabProps> = ({
  selectedMarker,
  onUpdateMarker,
}) => {
  const activeEffect = selectedMarker.effect !== undefined
    ? selectedMarker.effect
    : (selectedMarker.type === 'npc' && selectedMarker.npcBounce !== false ? 'jelly' : 'none');

  const effSpeed = selectedMarker.effectSpeed ?? selectedMarker.jellySpeed ?? 1.0;
  const effIntensity = selectedMarker.effectIntensity ?? selectedMarker.jellyIntensity ?? 1.0;

  return (
    <div className="space-y-3">
      {/* EFEITO UNIVERSAL DE MOVIMENTO & MALHA 2D */}
      <div className="p-3 bg-slate-950 border border-sky-500/30 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold text-sky-200">
            <span>✨</span>
            <span>Efeito Universal de Movimento:</span>
          </span>
          <span className="text-[10px] font-mono text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
            {OFFICIAL_EFFECTS.find((e: any) => e.id === activeEffect)?.icon || '⚪'}{' '}
            {OFFICIAL_EFFECTS.find((e: any) => e.id === activeEffect)?.label || 'Nenhum'}
          </span>
        </div>

        <select
          value={activeEffect}
          onChange={(e) => {
            const eff = e.target.value;
            if (eff === 'none') {
              // Desativa totalmente o efeito e a gelatina
              onUpdateMarker(selectedMarker.id, {
                effect: 'none',
                npcBounce: false,
              });
            } else if (eff === 'jelly') {
              // Ativa gelatina
              onUpdateMarker(selectedMarker.id, {
                effect: 'jelly',
                npcBounce: true,
              });
            } else {
              // Outro efeito universal (água, fogo, etc.)
              onUpdateMarker(selectedMarker.id, {
                effect: eff,
                npcBounce: false,
              });
            }
          }}
          className="w-full bg-slate-900 border border-sky-500/40 rounded-lg px-2.5 py-1.5 text-xs text-sky-300 font-bold focus:outline-none focus:border-sky-400 cursor-pointer"
        >
          <optgroup label="⚪ Padrão">
            <option value="none">⚪ Nenhum (Estático / Desativado)</option>
          </optgroup>
          <optgroup label="🌀 Deformação de Malha 2D (Mesh)">
            <option value="jelly">🍮 Gelatina Elástica (Wobbly)</option>
            <option value="water">🌊 Água Correndo (Fluxo Contínuo)</option>
            <option value="vortex">🌀 Vórtice / Redemoinho</option>
            <option value="rotation">🔄 Torção Angular</option>
            <option value="wind">💨 Vento / Balanço Orgânico</option>
            <option value="fire">🔥 Fogo / Convecção Térmica</option>
            <option value="pendulum">⏱️ Pêndulo Invertido</option>
            <option value="pulse">💓 Pulsar & Zoom</option>
          </optgroup>
          <optgroup label="💡 Iluminação & Partículas (VFX)">
            <option value="glow">💡 Make This Bright (Luz 3D Phong)</option>
            <option value="glitter">✨ Mini-Glitter Diamante</option>
            <option value="smoke">🌫️ Fumaça Densa Volumétrica</option>
            <option value="fireflies">🪲 Vagalumes Bioluminescentes</option>
            <option value="sparks">⚡ Arco Elétrico / Plasma Fractal</option>
          </optgroup>
        </select>

        {activeEffect !== 'none' && (
          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <p className="text-[10px] text-sky-300/90 leading-relaxed bg-sky-950/40 border border-sky-500/20 rounded-lg p-2">
              {OFFICIAL_EFFECTS.find((e: any) => e.id === activeEffect)?.icon}{' '}
              <strong>{OFFICIAL_EFFECTS.find((e: any) => e.id === activeEffect)?.label}:</strong>{' '}
              {OFFICIAL_EFFECTS.find((e: any) => e.id === activeEffect)?.description}.
            </p>

            {/* Estilo Específico de Gelatina se activeEffect === 'jelly' */}
            {activeEffect === 'jelly' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-amber-300 block">
                  Estilo da Gelatina:
                </label>
                <select
                  value={selectedMarker.jellyStyle || 'classic'}
                  onChange={(e) =>
                    onUpdateMarker(selectedMarker.id, {
                      jellyStyle: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-900 border border-amber-500/30 rounded-lg px-2 py-1 text-xs text-amber-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="classic">🍮 Clássica / Squash &amp; Stretch Suave</option>
                  <option value="spring">🌀 Mola Elástica Dinâmica</option>
                  <option value="step_walk">🐾 Passo a Passo Firme</option>
                  <option value="squash_intense">💥 Esmagamento Intenso</option>
                  <option value="organic_jitter">✨ Tremulação Orgânica Viva</option>
                  <option value="pulse_beat">💓 Pulsação Rítmica (Batimento)</option>
                </select>
              </div>
            )}

            {/* Sliders de Velocidade e Intensidade */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">⚡ Velocidade:</span>
                  <span className="font-mono text-sky-300 font-bold">
                    {effSpeed.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={effSpeed}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateMarker(selectedMarker.id, {
                      effectSpeed: val,
                      jellySpeed: val,
                    });
                  }}
                  className="w-full accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">💥 Intensidade:</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {effIntensity.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={effIntensity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateMarker(selectedMarker.id, {
                      effectIntensity: val,
                      jellyIntensity: val,
                    });
                  }}
                  className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
