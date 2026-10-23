import React from 'react';
import { MindMapStudio } from './MindMapStudio';
import { ArrowLeft, Brain, Layers } from 'lucide-react';
import type { MapProject, SavedLevel } from '../../types/map';

interface MindMapSoloScreenProps {
  onGoToDashboard: () => void;
  onGoToEditor: () => void;
  showToast: (msg: string) => void;
  project?: MapProject;
  setProject?: React.Dispatch<React.SetStateAction<MapProject>>;
  savedLevels?: SavedLevel[];
  onCompileLevel?: (newLevel: SavedLevel, mode: 'editor' | 'play' | 'stay') => void;
}

export const MindMapSoloScreen: React.FC<MindMapSoloScreenProps> = ({
  onGoToDashboard,
  onGoToEditor,
  showToast,
  project,
  setProject,
  savedLevels,
  onCompileLevel,
}) => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-white select-none">
      <header className="px-4 py-2 bg-black/95 border-b border-zinc-850 flex items-center justify-between gap-3 shrink-0 z-30">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGoToDashboard}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={onGoToEditor}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-pink-400" />
            <span>Voltar ao Editor</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-pink-400 animate-pulse" />
          <span className="text-xs font-bold text-white tracking-wide">
            EDITOR DE MAPA MENTAL &amp; MOTOR DE SÍNTESE REATIVA
          </span>
        </div>
      </header>

      <div className="flex-1 w-full h-full overflow-hidden">
        <MindMapStudio
          showToast={showToast}
          project={project}
          setProject={setProject}
          savedLevels={savedLevels}
          onCompileLevel={onCompileLevel}
        />
      </div>
    </div>
  );
};
