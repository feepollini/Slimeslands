import React, { useState } from 'react';
import type { MapProject, SavedLevel } from '../../types/map';
import {
  LayoutGrid,
  MonitorPlay,
  Play,
  Compass,
  ArrowLeft,
  Smartphone,
  Globe,
} from 'lucide-react';
import { WorldMapCanvasEditor, getOrCreateWorldMapConfig } from '../workspace/WorldMapCanvasEditor';
import { PortraitEmulator } from '../PortraitEmulator';

interface WorldMapSoloScreenProps {
  project: MapProject;
  setProject: React.Dispatch<React.SetStateAction<MapProject>>;
  savedLevels: SavedLevel[];
  onLoadLevel: (level: SavedLevel) => void;
  onGoToDashboard: () => void;
  onGoToEditor: () => void;
  onPlayLevel?: (level: SavedLevel) => void;
  showToast: (msg: string) => void;
}

export const WorldMapSoloScreen: React.FC<WorldMapSoloScreenProps> = ({
  project,
  setProject,
  savedLevels,
  onLoadLevel,
  onGoToDashboard,
  onGoToEditor,
  onPlayLevel,
  showToast,
}) => {
  const [emulatorOrientation, setEmulatorOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isWebMode, setIsWebMode] = useState<boolean>(false);
  const [showEmulator, setShowEmulator] = useState<boolean>(true);
  const [emulatorWidthMode, setEmulatorWidthMode] = useState<'normal' | 'wide'>('normal');
  const worldMap = getOrCreateWorldMapConfig(project);

  const emulatorWidthClass =
    emulatorOrientation === 'landscape'
      ? emulatorWidthMode === 'wide'
        ? 'w-[960px] 2xl:w-[1100px]'
        : 'w-[840px] 2xl:w-[940px]'
      : emulatorWidthMode === 'wide'
      ? 'w-[720px] 2xl:w-[800px]'
      : 'w-[620px] xl:w-[660px] 2xl:w-[700px]';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-white select-none">
      {/* Barra de Título Superior do Editor Solo de Mapa */}
      <header className="flex items-center justify-between px-5 py-2.5 bg-black/95 backdrop-blur-md border-b border-zinc-850 shrink-0 z-40">
        <div className="flex items-center gap-3">
          {/* Botão Voltar ao Dashboard */}
          <button
            type="button"
            onClick={onGoToDashboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white font-medium transition-colors cursor-pointer"
            title="Voltar ao Dashboard de Fases"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span>Dashboard</span>
          </button>

          <div className="h-4 w-[1px] bg-zinc-800" />

          {/* Identidade do Editor de Mapa */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">
                  Editor de Mapa Global (Overworld)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Solo
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono block">
                {worldMap.title || 'Mapa do Reino'} • {worldMap.pointsOfInterest.length} Pontos de Interesse
              </span>
            </div>
          </div>
        </div>

        {/* Ações da Direita */}
        <div className="flex items-center gap-2.5">
          {/* Alternador de Orientação do Emulador */}
          {showEmulator && (
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEmulatorOrientation('portrait');
                  setIsWebMode(false);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  emulatorOrientation === 'portrait'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>Retrato</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmulatorOrientation('landscape');
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  emulatorOrientation === 'landscape'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>Paisagem</span>
              </button>

              <button
                type="button"
                onClick={() => setEmulatorWidthMode((m) => (m === 'normal' ? 'wide' : 'normal'))}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  emulatorWidthMode === 'wide'
                    ? 'bg-zinc-700 text-amber-300 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title={emulatorWidthMode === 'wide' ? 'Reduzir para largura normal' : 'Expandir largura do painel do emulador'}
              >
                {emulatorWidthMode === 'wide' ? 'Amplo' : 'Padrão'}
              </button>
            </div>
          )}

          {/* Botão de Toggle do Emulador */}
          <button
            type="button"
            onClick={() => setShowEmulator((s) => !s)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              showEmulator
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title={showEmulator ? 'Ocultar emulador do celular' : 'Exibir emulador do celular ao vivo'}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{showEmulator ? 'Ocultar Emulador' : 'Ver Emulador'}</span>
          </button>

          {/* Botão Ir para Editor de Fases */}
          <button
            type="button"
            onClick={onGoToEditor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white font-medium transition-colors cursor-pointer"
            title="Abrir Editor de Fases"
          >
            <MonitorPlay className="w-3.5 h-3.5 text-emerald-400" />
            <span>Editor de Fases</span>
          </button>
        </div>
      </header>

      {/* Workspace Principal do Mapa Solo: Canvas Panorâmico + Menu Lateral (à direita) + Emulador Opcional */}
      <div className="flex-1 flex overflow-hidden bg-black">
        {/* Editor de Mapa Solo (Canvas + Menu Lateral na Direita) */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-850 bg-black">
          <WorldMapCanvasEditor
            project={project}
            setProject={setProject}
            savedLevels={savedLevels}
            onLoadLevel={onLoadLevel}
            showToast={showToast}
          />
        </div>

        {/* Emulador com o Mapa Interativo ao Vivo */}
        {showEmulator && (
          <div className={`${emulatorWidthClass} h-full flex flex-col items-center justify-start p-4 bg-zinc-950 shrink-0 overflow-y-auto border-l border-zinc-850 shadow-2xl transition-all duration-200 select-none`}>
            <PortraitEmulator
              project={project}
              savedLevels={savedLevels}
              activeTab="map"
              canvasView="extended"
              isWorldMapSolo={true}
              onLoadLevel={onLoadLevel}
              activeMarkerId={null}
              onSelectMarker={() => {}}
              onUpdatePlayer={() => {}}
              onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
              orientation={emulatorOrientation}
              onToggleOrientation={setEmulatorOrientation}
              isWebMode={isWebMode}
              onToggleWebMode={setIsWebMode}
            />
          </div>
        )}
      </div>
    </div>
  );
};
