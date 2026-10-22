import React, { useState } from 'react';
import { MapProject, SavedLevel } from '../types/map';
import {
  FolderPlus,
  Gamepad2,
  Trash2,
  Copy,
  CheckCircle2,
  Play,
  Save,
  Clock,
  MapPin,
  Layers,
  Sparkles,
  Smartphone,
  Shield,
  FileCheck,
} from 'lucide-react';

interface Props {
  currentProject: MapProject;
  savedLevels: SavedLevel[];
  activeLevelId: string | null;
  hasUnsavedChanges?: boolean;
  onSaveCurrentAsLevel: (name?: string, description?: string, options?: { asNew?: boolean }) => void;
  onUpdateSavedLevel: (levelId: string, updates: Partial<SavedLevel>) => void;
  onOverwriteSavedLevel: (levelId: string) => void;
  onLoadLevel: (level: SavedLevel) => void;
  onDuplicateLevel: (level: SavedLevel) => void;
  onDeleteLevel: (levelId: string) => void;
  onCreateNewEmptyLevel: () => void;
}

export const LevelGalleryStudio: React.FC<Props> = ({
  currentProject,
  savedLevels,
  activeLevelId,
  hasUnsavedChanges = false,
  onSaveCurrentAsLevel,
  onUpdateSavedLevel,
  onOverwriteSavedLevel,
  onLoadLevel,
  onDuplicateLevel,
  onDeleteLevel,
  onCreateNewEmptyLevel,
}) => {
  const [newLevelName, setNewLevelName] = useState<string>('');
  const [isSavingModalOpen, setIsSavingModalOpen] = useState<boolean>(false);

  const handleSaveAsNew = () => {
    const nameToUse = newLevelName.trim() || `${currentProject.title || 'Fase'} (Cópia ${savedLevels.length + 1})`;
    onSaveCurrentAsLevel(nameToUse, currentProject.description || 'Fase personalizada', { asNew: true });
    setNewLevelName('');
    setIsSavingModalOpen(false);
  };

  const activeLevel = savedLevels.find((l) => l.id === activeLevelId);

  return (
    <div className="space-y-4">
      {/* Header Banner da Galeria */}
      <div className="p-3.5 bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border border-amber-500/40 rounded-xl space-y-1.5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <Gamepad2 className="w-4 h-4 text-amber-400" />
            <span>Galeria de Fases & Níveis do Jogo</span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40">
            {savedLevels.length} {savedLevels.length === 1 ? 'Fase Salva' : 'Fases Salvas'}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Cada fase armazena uma matriz autônoma e completa com seus biomas, NPCs, colisões, clima, iluminação, spawn e telas interativas.
        </p>
      </div>

      {/* Botões de Ação Rápida */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <button
          type="button"
          onClick={() => onSaveCurrentAsLevel()}
          className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          title="Salvar alterações na fase ativa agora (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Salvar Fase</span>
        </button>

        <button
          type="button"
          onClick={() => setIsSavingModalOpen(!isSavingModalOpen)}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
          title="Clonar esta fase como um novo nível independente"
        >
          <Copy className="w-3.5 h-3.5 text-amber-400" />
          <span>Salvar Nova...</span>
        </button>

        <button
          type="button"
          onClick={onCreateNewEmptyLevel}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
          title="Criar um nível vazio do zero"
        >
          <FolderPlus className="w-3.5 h-3.5 text-sky-400" />
          <span>Do Zero</span>
        </button>
      </div>

      {/* Modal para Salvar Como Nova Fase */}
      {isSavingModalOpen && (
        <div className="p-3 bg-slate-950 border-2 border-amber-500/60 rounded-xl space-y-2 animate-fadeIn shadow-xl">
          <label className="text-[11px] font-bold text-amber-300 block">
            Nome da Nova Fase a Salvar no Acervo:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newLevelName}
              onChange={(e) => setNewLevelName(e.target.value)}
              placeholder={`${currentProject.title || 'Fase'} (Nova)`}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-medium"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveAsNew}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors shrink-0 cursor-pointer"
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setIsSavingModalOpen(false)}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Lista de Fases Salvas */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <span>Minhas Fases Cadastradas ({savedLevels.length})</span>
          {activeLevel && (
            <span className="text-[10px] text-amber-400 font-mono">
              Ativa: {activeLevel.name}
            </span>
          )}
        </div>

        {savedLevels.length === 0 ? (
          <div className="p-6 rounded-2xl border-2 border-dashed border-slate-800 text-center space-y-2 bg-slate-950/50">
            <Gamepad2 className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">
              Nenhuma fase salva ainda. Clique em <strong>"Salvar Fase"</strong> acima para registrar seu mapa atual na galeria!
            </p>
          </div>
        ) : (
          savedLevels.map((lvl) => {
            const isActive = lvl.id === activeLevelId;
            const pData = lvl.projectData;
            const st = lvl.stats;
            const isExtended = st
              ? st.canvasKind === 'extended'
              : pData?.canvasKind === 'extended' || ((pData?.subBiomes || []).length > 0 && (pData?.biomes || []).length === 0);
            const bioCount = st ? (isExtended ? st.subBiomesCount : st.biomesCount) : (isExtended ? (pData?.subBiomes?.length || 0) : (pData?.biomes?.length || 0));
            const markCount = st ? st.markersCount : (pData?.markers?.length || 0);
            const scrCount = st ? st.screensCount : (pData?.screensConfig?.screens?.length || 1);

            return (
              <div
                key={lvl.id}
                className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                  isActive
                    ? 'bg-gradient-to-b from-amber-950/40 to-slate-950 border-amber-500/80 ring-1 ring-amber-500/40 shadow-xl'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-md'
                }`}
              >
                {/* Cabeçalho do Card */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm shrink-0">{isExtended ? '💜' : '🗺️'}</span>
                    <input
                      type="text"
                      value={lvl.name}
                      onChange={(e) => onUpdateSavedLevel(lvl.id, { name: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-amber-200 font-black focus:outline-none focus:border-amber-400 truncate flex-1"
                      placeholder="Nome da Fase"
                    />
                    {isActive && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-400/60 text-amber-300 text-[10px] font-bold flex items-center gap-1 shrink-0">
                        {hasUnsavedChanges ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span>Modificada</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Fase Ativa</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteLevel(lvl.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Excluir Fase"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Resumo da Matriz da Fase */}
                <div className="grid grid-cols-4 gap-1.5 text-[10px] text-slate-400 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-1 truncate" title="Biomas">
                    <Layers className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{isExtended ? `${bioCount} Sub` : `${bioCount} Bio`}</span>
                  </div>
                  <div className="flex items-center gap-1 truncate" title="Marcadores e NPCs">
                    <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{markCount} Marc</span>
                  </div>
                  <div className="flex items-center gap-1 truncate" title="Telas e Interface">
                    <Smartphone className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span>{scrCount} Telas</span>
                  </div>
                  <div className="flex items-center gap-1 truncate" title="Data do último salvamento">
                    <Clock className="w-3 h-3 text-sky-400 shrink-0" />
                    <span className="truncate">{new Date(lvl.updatedAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                {/* Ações da Fase */}
                <div className="flex items-center gap-2 pt-1 text-xs">
                  {!isActive ? (
                    <button
                      type="button"
                      onClick={() => onLoadLevel(lvl)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Carregar esta Fase</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOverwriteSavedLevel(lvl.id)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/30 text-emerald-200 font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      title="Gravar matriz completa e sincronizar no IndexedDB agora"
                    >
                      <Save className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Atualizar Salve (Ctrl+S)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onDuplicateLevel(lvl)}
                    className="p-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Duplicar fase para criar uma variação"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px]">Duplicar</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
