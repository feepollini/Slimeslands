import React, { useState } from 'react';
import type { SavedLevel } from '../../types/map';
import { Plus, Smartphone, Layers, Settings, X } from 'lucide-react';

interface ScreenTabsBarProps {
  savedLevels: SavedLevel[];
  activeLevelId: string | null;
  onSwitchLevel: (level: SavedLevel) => void;
  onOpenLevelSettings: (kind: 'vertical' | 'extended') => void;
  onRequestCloseLevel: (level: SavedLevel) => void;
  onCreateNewCanvas: (kind: 'vertical' | 'extended') => void;
  onOpenDashboard?: () => void;
  onOpenCreateModal?: () => void;
}

export const ScreenTabsBar: React.FC<ScreenTabsBarProps> = ({
  savedLevels,
  activeLevelId,
  onSwitchLevel,
  onOpenLevelSettings,
  onRequestCloseLevel,
  onCreateNewCanvas,
  onOpenDashboard,
  onOpenCreateModal,
}) => {
  const [canvasPresetOpen, setCanvasPresetOpen] = useState<boolean>(false);

  return (
    <div className="order-first flex items-center gap-1.5 px-3 py-1 bg-black border-b border-zinc-850 overflow-x-auto shrink-0 select-none">
      <span className="text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-wider shrink-0">
        Telas
      </span>
      {savedLevels
        .filter((lvl) => !lvl.closedInTabs || lvl.id === activeLevelId)
        .map((lvl) => {
        const kind: 'vertical' | 'extended' =
          lvl.projectData?.canvasKind ||
          ((lvl.projectData?.subBiomes || []).length > 0 ? 'extended' : 'vertical');
        const isActive = lvl.id === activeLevelId;

        return (
          <div
            key={lvl.id}
            className={`group flex items-center gap-0.5 rounded-md border shrink-0 transition-colors ${
              isActive
                ? 'bg-zinc-900 text-white border-white'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
            }`}
          >
            <button
              onClick={() => onSwitchLevel(lvl)}
              title={lvl.name}
              className="px-2.5 py-1 text-[11px] font-medium whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              {kind === 'extended' ? (
                <Layers className="w-3 h-3 text-zinc-400" />
              ) : (
                <Smartphone className="w-3 h-3 text-blue-400" />
              )}
              <span>{lvl.name}</span>
            </button>
            {isActive && (
              <button
                onClick={() => onOpenLevelSettings(kind)}
                title={kind === 'extended' ? 'Configurar fase' : 'Configurar biomas'}
                className="px-1 py-1 text-zinc-500 hover:text-white cursor-pointer"
              >
                <Settings className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRequestCloseLevel(lvl);
              }}
              title={`Fechar tela ${lvl.name}`}
              className="px-1.5 py-1 text-zinc-500 hover:text-red-400 rounded-r-md transition-colors text-[10px] font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        );
      })}

      {canvasPresetOpen && !onOpenCreateModal ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              onCreateNewCanvas('vertical');
              setCanvasPresetOpen(false);
            }}
            title="Nova tela vertical"
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap bg-blue-950/80 border border-blue-700 text-blue-300 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Smartphone className="w-3 h-3" />
            <span>Vertical</span>
          </button>
          <button
            onClick={() => {
              onCreateNewCanvas('extended');
              setCanvasPresetOpen(false);
            }}
            title="Nova tela extended"
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap bg-zinc-900 border border-zinc-700 text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <Layers className="w-3 h-3" />
            <span>Extended</span>
          </button>
          <button
            onClick={() => setCanvasPresetOpen(false)}
            title="Fechar"
            className="p-1 rounded-md text-zinc-500 hover:text-white shrink-0 cursor-pointer"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            if (onOpenCreateModal) {
              onOpenCreateModal();
            } else {
              setCanvasPresetOpen((prev) => !prev);
            }
          }}
          title="Nova fase / Novo Canvas Personalizado"
          className="p-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-dashed border-zinc-700 text-zinc-400 hover:text-white transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}

      {onOpenDashboard && (
        <button
          type="button"
          onClick={onOpenDashboard}
          title="Abrir Dashboard de Fases & Canvas Personalizado"
          className="ml-auto px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 hover:text-white text-[10px] font-semibold tracking-tight transition-colors shrink-0 cursor-pointer flex items-center gap-1"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          <span>Hub Fases</span>
        </button>
      )}
    </div>
  );
};
