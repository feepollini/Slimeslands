import React from 'react';
import { ArrowLeft, Layers, Headphones } from 'lucide-react';
import { SkillCreatorWorkspace } from '../../vfx_engine/SkillsForgeApp';
import type { MapProject } from '../../types/map';

interface SkillsForgeSoloScreenProps {
  onGoToDashboard: () => void;
  onGoToEditor: () => void;
  onOpenAudioStudio?: () => void;
  showToast?: (msg: string) => void;
  project?: MapProject;
  setProject?: React.Dispatch<React.SetStateAction<MapProject>>;
}

export const SkillsForgeSoloScreen: React.FC<SkillsForgeSoloScreenProps> = ({
  onGoToDashboard,
  onGoToEditor,
  onOpenAudioStudio,
}) => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-white select-none relative">
      {/* Top Universal Bridge Bar (Marker Dream Integrator) */}
      <header className="px-3 py-1.5 bg-black/95 border-b border-zinc-800/80 flex items-center justify-between gap-3 shrink-0 z-50">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGoToDashboard}
            className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={onGoToEditor}
            className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Voltar ao Editor</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-300 tracking-wide uppercase">
            ⚡ Skills Forge &amp; VFX Arena
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
            vfx-studio-pro
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAudioStudio && (
            <button
              type="button"
              onClick={onOpenAudioStudio}
              className="px-3 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-emerald-500/10"
              title="Ir diretamente para o Audio Studio"
            >
              <Headphones className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ir para Audio Studio</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Skills Forge & VFX Arena */}
      <div className="flex-1 w-full h-full overflow-hidden relative">
        <SkillCreatorWorkspace
          onBackToDashboard={onGoToDashboard}
          onOpenFishAudio={onOpenAudioStudio || onGoToDashboard}
        />
      </div>
    </div>
  );
};
