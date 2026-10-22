import React from 'react';
import type { MapProject, SavedLevel } from '../../types/map';
import { QuestEditorStudio } from './QuestEditorStudio';
import {
  ArrowLeft,
  GitBranch,
  Play,
  Package,
  Users,
  Map as MapIcon,
} from 'lucide-react';

interface QuestSoloScreenProps {
  project: MapProject;
  setProject: React.Dispatch<React.SetStateAction<MapProject>>;
  savedLevels?: SavedLevel[];
  onGoToDashboard: () => void;
  onGoToEditor: () => void;
  onGoToCharacters?: () => void;
  onGoToInventory?: () => void;
  onPlayLevel?: () => void;
  showToast: (msg: string) => void;
}

export const QuestSoloScreen: React.FC<QuestSoloScreenProps> = ({
  project,
  setProject,
  onGoToDashboard,
  onGoToEditor,
  onGoToCharacters,
  onGoToInventory,
  onPlayLevel,
  showToast,
}) => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-white select-none">
      {/* Header Principal do Editor de Quests Independente (Seção 17) */}
      <header className="px-4 py-2 bg-black/95 border-b border-zinc-850 flex flex-wrap items-center justify-between gap-3 shrink-0 z-30">
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
            <MapIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Editor de Fases (Espelhado)</span>
          </button>

          {onGoToCharacters && (
            <button
              type="button"
              onClick={onGoToCharacters}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Heróis & Níveis (XP)</span>
            </button>
          )}

          {onGoToInventory && (
            <button
              type="button"
              onClick={onGoToInventory}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span>Inventários & Itens</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
            Fase Ativa Vinculada: <strong className="text-white">{project.name}</strong>
          </span>
          {onPlayLevel && (
            <button
              type="button"
              onClick={onPlayLevel}
              className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Jogar Fase</span>
            </button>
          )}
        </div>
      </header>

      {/* Corpo do Editor */}
      <div className="flex-1 overflow-hidden">
        <QuestEditorStudio
          project={project}
          onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
          mode="standalone"
          showToast={showToast}
        />
      </div>
    </div>
  );
};
