import React from 'react';
import type { MapProject } from '../../types/map';
import type { TerrainPenConfig } from '../../types/terrainPen';
import { Eraser, Trash2 } from 'lucide-react';

interface Props {
  config: TerrainPenConfig;
  updateConfig: (updates: Partial<TerrainPenConfig>) => void;
  project: MapProject;
  onUpdateProject: (updates: Partial<MapProject>) => void;
  activeLayerId: string;
}

export const EraserModePanel: React.FC<Props> = ({
  config,
  updateConfig,
  project,
  onUpdateProject,
  activeLayerId,
}) => {
  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* PAINEL PRINCIPAL DA BORRACHA */}
      <div className="p-3.5 bg-slate-900 border border-rose-500/40 rounded-2xl space-y-3 shadow-lg shadow-rose-950/20">
        <div className="flex items-center justify-between pb-1 border-b border-rose-500/20 text-xs font-bold text-rose-300">
          <span className="flex items-center gap-1.5">
            <Eraser className="w-3.5 h-3.5 text-rose-400" />
            <span>Borracha do Terreno Vivo</span>
          </span>
          <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-mono font-bold border border-rose-500/30">
            Pincel Ativo
          </span>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed">
          Arraste o cursor pelo mapa para apagar tufos de grama viva, flores, áreas fluidas de água e texturas de solo com precisão.
        </p>

        {/* Raio do Pincel da Borracha */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Raio da Borracha (Área de Apagar)</span>
            <span className="font-mono text-rose-300 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 text-xs">
              {config.brushRadius}px
            </span>
          </div>
          <input
            type="range"
            min={16}
            max={200}
            step={4}
            value={config.brushRadius}
            onChange={(e) => updateConfig({ brushRadius: parseInt(e.target.value, 10) })}
            className="w-full accent-rose-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-slate-500">
            <span>Precisão Fina (16px)</span>
            <span>Médio (48px)</span>
            <span>Grande Área (200px)</span>
          </div>
        </div>
      </div>

      {/* LIMPEZA RÁPIDA EM 1 CLIQUE */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center gap-1.5 pb-1 border-b border-slate-800 text-xs font-bold text-slate-200">
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          <span>Limpeza Rápida em Massa</span>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          Deseja remover elementos indesejados de uma só vez? Use os atalhos abaixo:
        </p>

        <div className="space-y-2">
          {/* Botão 1: Limpar Marcadores Antigos em Formas (Círculos/Quadrados) */}
          <button
            type="button"
            onClick={() => {
              const currentMarkers = project.markers || [];
              const filtered = currentMarkers.filter((m) => {
                const isShapeMarker =
                  m.id.startsWith('terrain-water-') ||
                  m.id.startsWith('terrain-noise-') ||
                  m.id.startsWith('water_') ||
                  m.id.startsWith('noise_');
                return !isShapeMarker;
              });
              const count = currentMarkers.length - filtered.length;
              onUpdateProject({ markers: filtered });
              alert(`✅ ${count} marcadores antigos em formas (círculos/quadrados) foram removidos!`);
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-xs active:scale-98"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🧼</span>
              <span className="text-left leading-tight">
                Limpar Formas Antigas (Círculos/Quadrados)
              </span>
            </div>
            <span className="text-[10px] bg-rose-500/30 px-1.5 py-0.5 rounded font-mono">
              {(project.markers || []).filter((m) =>
                m.id.startsWith('terrain-water-') ||
                m.id.startsWith('terrain-noise-') ||
                m.id.startsWith('water_') ||
                m.id.startsWith('noise_')
              ).length}
            </span>
          </button>

          {/* Botão 2: Limpar Águas e Solos Pincelados */}
          <button
            type="button"
            onClick={() => {
              const overlays = project.motionOverlays || [];
              const remaining = overlays.filter((o) =>
                o.effect !== 'water' &&
                o.effect !== 'terrain' &&
                o.effect !== 'noise' &&
                o.effect !== 'ground' &&
                !o.id.startsWith('terrain-overlay-')
              );
              const count = overlays.length - remaining.length;
              onUpdateProject({ motionOverlays: remaining });
              alert(`✅ ${count} áreas pinceladas de água/solo foram removidas!`);
            }}
            className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-between transition-all cursor-pointer active:scale-98"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🌊</span>
              <span className="text-left leading-tight">
                Limpar Águas e Solos Pincelados
              </span>
            </div>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-mono text-cyan-300">
              {(project.motionOverlays || []).filter((o) =>
                o.effect === 'water' ||
                o.effect === 'terrain' ||
                o.effect === 'noise' ||
                o.effect === 'ground' ||
                o.id.startsWith('terrain-overlay-')
              ).length}
            </span>
          </button>

          {/* Botão 3: Limpar Grama e Flores da Camada Atual */}
          <button
            type="button"
            onClick={() => {
              const targetLayerId = config.targetLayerId || activeLayerId;
              const currentMarkers = project.markers || [];
              const remaining = currentMarkers.filter((m) => {
                const isTerrain = m.id.startsWith('terrain-grass-') || m.id.startsWith('terrain-flower-');
                return !(isTerrain && m.layerId === targetLayerId);
              });
              const count = currentMarkers.length - remaining.length;
              onUpdateProject({ markers: remaining });
              alert(`✅ ${count} tufos de grama/flores da camada atual foram removidos!`);
            }}
            className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-between transition-all cursor-pointer active:scale-98"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🌱</span>
              <span className="text-left leading-tight">
                Limpar Grama/Flores da Camada
              </span>
            </div>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-mono text-emerald-300">
              {(project.markers || []).filter((m) => {
                const targetLayerId = config.targetLayerId || activeLayerId;
                return (m.id.startsWith('terrain-grass-') || m.id.startsWith('terrain-flower-')) && m.layerId === targetLayerId;
              }).length}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
