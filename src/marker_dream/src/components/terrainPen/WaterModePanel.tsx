import React from 'react';
import type { MapProject } from '../../types/map';
import type { TerrainPenConfig } from '../../types/terrainPen';
import { Waves, Upload, Trash2 } from 'lucide-react';

interface Props {
  config: TerrainPenConfig;
  updateConfig: (updates: Partial<TerrainPenConfig>) => void;
  project: MapProject;
  onUpdateProject?: (updates: Partial<MapProject>) => void;
  onUploadWaterTexture: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const WaterModePanel: React.FC<Props> = ({
  config,
  updateConfig,
  project,
  onUpdateProject,
  onUploadWaterTexture,
}) => {
  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* MÓDULO DE ÁGUA POR TEXTURA PNG DE REPETIÇÃO (MÁSCARA PINCELADA) */}
      <div className="p-3.5 bg-slate-900 border border-cyan-800/60 rounded-2xl space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-800/40 text-xs font-bold text-cyan-300">
          <span className="flex items-center gap-1.5">
            <Waves className="w-3.5 h-3.5 text-cyan-400" />
            <span>Textura PNG de Repetição (Água)</span>
          </span>
          {config.waterTexturePng && (
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              PNG Ativo
            </span>
          )}
        </div>

        {/* ÁREA DE IMPORTAÇÃO DE PNG */}
        <div className="space-y-2">
          <label className="w-full flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-cyan-500/40 hover:border-cyan-400 bg-slate-950/70 hover:bg-slate-950 text-cyan-200 transition-all cursor-pointer group">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Upload className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>Importar Textura PNG de Água (Seamless)</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">
              Selecione seu PNG de padrão repetitivo que casa perfeitamente
            </span>
            <input
              type="file"
              accept="image/png,image/webp,image/jpeg"
              onChange={onUploadWaterTexture}
              className="hidden"
            />
          </label>

          {/* Preview e Remoção do PNG Carregado */}
          {config.waterTexturePng ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center">
                  <img
                    src={config.waterTexturePng}
                    alt="Textura de Água"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Textura de Água Customizada</div>
                  <div className="text-[10px] text-emerald-400 font-medium">Repetindo suavemente na máscara</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  updateConfig({ waterTexturePng: undefined });
                  if (project.motionOverlays && project.motionOverlays.length > 0) {
                    const updated = project.motionOverlays.map((ov) =>
                      ov.effect === 'water' ? { ...ov, waterTexturePng: undefined } : ov
                    );
                    onUpdateProject?.({ motionOverlays: updated });
                  }
                }}
                className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Remover Textura PNG"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 italic text-center">
              Nenhum PNG carregado ainda. Padrão cristalino suave ativo como base.
            </div>
          )}
        </div>

        {/* CONTROLES DE FLUXO & ESCALA DA TEXTURA */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          {/* Escala da Textura PNG */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Escala da Textura (Tamanho do Padrão):</span>
              <span className="font-mono text-cyan-300 font-bold text-xs">
                {(config.waterTextureScale ?? 1.0).toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={0.2}
              max={3.0}
              step={0.05}
              value={config.waterTextureScale ?? 1.0}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                updateConfig({ waterTextureScale: val });
                if (project.motionOverlays) {
                  const updated = project.motionOverlays.map((ov) =>
                    ov.effect === 'water' ? { ...ov, textureScale: val } : ov
                  );
                  onUpdateProject?.({ motionOverlays: updated });
                }
              }}
              className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded cursor-pointer"
            />
          </div>

          {/* Velocidade do Fluxo */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Velocidade do Fluxo / Deslocamento:</span>
              <span className="font-mono text-cyan-300 font-bold text-xs">
                {(config.waterFlowSpeed ?? 1.0).toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0.0}
              max={3.0}
              step={0.1}
              value={config.waterFlowSpeed ?? 1.0}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                updateConfig({ waterFlowSpeed: val });
                if (project.motionOverlays) {
                  const updated = project.motionOverlays.map((ov) =>
                    ov.effect === 'water' ? { ...ov, flowSpeed: val, speed: val } : ov
                  );
                  onUpdateProject?.({ motionOverlays: updated });
                }
              }}
              className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded cursor-pointer"
            />
          </div>

          {/* Direção / Ângulo do Fluxo */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Direção do Fluxo:</span>
              <span className="font-mono text-cyan-300 font-bold text-xs">
                {config.waterFlowAngle ?? 45}°
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: '➡️ Leste', angle: 0 },
                { label: '↘️ Sudeste', angle: 45 },
                { label: '⬇️ Sul', angle: 90 },
                { label: '↙️ Sudoeste', angle: 135 },
              ].map((dir) => (
                <button
                  key={dir.angle}
                  type="button"
                  onClick={() => {
                    updateConfig({ waterFlowAngle: dir.angle });
                    if (project.motionOverlays) {
                      const updated = project.motionOverlays.map((ov) =>
                        ov.effect === 'water' ? { ...ov, flowAngle: dir.angle } : ov
                      );
                      onUpdateProject?.({ motionOverlays: updated });
                    }
                  }}
                  className={`py-1 px-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                    (config.waterFlowAngle ?? 45) === dir.angle
                      ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {dir.label}
                </button>
              ))}
            </div>
          </div>

          {/* Opacidade da Textura */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Opacidade da Textura na Máscara:</span>
              <span className="font-mono text-cyan-300 font-bold text-xs">
                {Math.round((config.waterTextureOpacity ?? 0.85) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={config.waterTextureOpacity ?? 0.85}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                updateConfig({ waterTextureOpacity: val });
                if (project.motionOverlays) {
                  const updated = project.motionOverlays.map((ov) =>
                    ov.effect === 'water' ? { ...ov, textureOpacity: val } : ov
                  );
                  onUpdateProject?.({ motionOverlays: updated });
                }
              }}
              className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded cursor-pointer"
            />
          </div>

          {/* Cor de Fundo da Água (Tint) */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-300 font-medium">Cor de Fundo da Água:</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.waterColor || '#0284c7'}
                onChange={(e) => {
                  const val = e.target.value;
                  updateConfig({ waterColor: val });
                  if (project.motionOverlays) {
                    const updated = project.motionOverlays.map((ov) =>
                      ov.effect === 'water' ? { ...ov, color: val } : ov
                    );
                    onUpdateProject?.({ motionOverlays: updated });
                  }
                }}
                className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
              />
              <span className="font-mono text-[10px] text-slate-400 uppercase">
                {config.waterColor || '#0284c7'}
              </span>
            </div>
          </div>

          {/* Raio & Espaçamento do Pincel */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Raio do Pincel:</span>
                <span className="font-mono text-cyan-300 font-bold">{config.brushRadius}px</span>
              </div>
              <input
                type="range"
                min={20}
                max={160}
                step={4}
                value={config.brushRadius}
                onChange={(e) => updateConfig({ brushRadius: parseInt(e.target.value, 10) })}
                className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Espaçamento:</span>
                <span className="font-mono text-cyan-300 font-bold">{config.spacing}px</span>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                step={2}
                value={config.spacing}
                onChange={(e) => updateConfig({ spacing: parseInt(e.target.value, 10) })}
                className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
