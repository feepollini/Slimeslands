import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Compass,
  Layers,
  MessageSquare,
  FileJson,
  User,
  Gamepad2,
  Save,
  Film,
  Radio,
  Play,
  SunMedium,
  Smartphone,
  CheckCircle2,
  ChevronDown,
  FolderPlus,
  Loader2,
  Images,
  Users,
  Package,
  GitBranch,
  Brain,
} from 'lucide-react';

import type { TabId } from '../types/map';

interface Props {
  activeTab: TabId;
  canvasKind: 'vertical' | 'extended';
  activeLevelName?: string;
  activeLevelKind?: 'vertical' | 'extended';
  hasUnsavedChanges?: boolean;
  justSaved?: boolean;
  onSelectTab: (tab: TabId) => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onQuickSaveLevel?: () => void;
  onSaveAsNewLevel?: () => void;
  onPlayPhase?: () => void;
  lastSavedTimestamp?: string | null;
  isSavingLevel?: boolean;
  onOpenDashboard?: () => void;
  onOpenWorldMap?: () => void;
  onOpenCharacters?: () => void;
  onOpenInventory?: () => void;
  onOpenQuests?: () => void;
  onOpenHudUniversal?: () => void;
  onOpenMindMap?: () => void;
  onOpenMotionStudio?: () => void;
}

export const TopNav: React.FC<Props> = ({
  activeTab,
  canvasKind,
  activeLevelName,
  activeLevelKind,
  hasUnsavedChanges = false,
  justSaved = false,
  onSelectTab,
  onExportPNG,
  onExportJSON,
  onQuickSaveLevel,
  onSaveAsNewLevel,
  onPlayPhase,
  lastSavedTimestamp,
  isSavingLevel = false,
  onOpenDashboard,
  onOpenWorldMap,
  onOpenCharacters,
  onOpenInventory,
  onOpenQuests,
  onOpenHudUniversal,
  onOpenMindMap,
  onOpenMotionStudio,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isBiomeWorkspace = activeTab === 'editor' || activeTab === 'biomes' || activeTab === 'extended' || (activeTab as string) === 'terreno';
  const tabs = [
    { id: 'levels' as const, label: 'Fases', icon: Gamepad2 },
    { id: 'map' as const, label: 'Destinos & Mapa', icon: Compass },
    { id: 'assets' as const, label: 'Assets', icon: Images },
    { id: 'screens' as const, label: 'Telas', icon: Smartphone },
    { id: 'quests' as const, label: 'Quests (Fase)', icon: GitBranch },
    { id: 'events' as const, label: 'Eventos', icon: Radio },
    {
      id: 'editor' as const,
      label: 'Editor',
      icon: Layers,
      forceActive: isBiomeWorkspace,
      isSpecialEditor: true,
      badge: canvasKind === 'extended' ? 'Extended' : undefined,
    },
    {
      id: 'terreno' as any,
      label: 'Terreno',
      icon: Layers,
      forceActive: activeTab === 'biomes' || activeTab === 'extended' || (activeTab as string) === 'terreno',
    },
    { id: 'player' as const, label: 'Jogador', icon: User },
    { id: 'pets' as const, label: 'Pets & Deck', icon: Gamepad2 },
    { id: 'dialogue' as const, label: 'Diálogos', icon: MessageSquare },
    { id: 'clouds' as const, label: 'Atmosfera', icon: SunMedium },
    { id: 'motion_canvas' as const, label: 'Motion Canvas', icon: Film },
  ];

  const currentLevelKind = activeLevelKind || canvasKind;

  return (
    <header className="flex items-center justify-between gap-4 px-5 py-2.5 border-b border-zinc-850 bg-black/95 backdrop-blur-md sticky top-0 z-50">
      {/* Zone 1: Brand Wordmark, Hub Button & Active Phase Badge */}
      <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
        <button
          type="button"
          onClick={onOpenDashboard}
          className="flex items-center gap-2.5 text-left group cursor-pointer hover:opacity-90 transition-opacity"
          title="Abrir Dashboard de Fases"
        >
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-750 flex items-center justify-center text-white">
            <div className="w-2.5 h-2.5 bg-orange-500 rounded-xs" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white block leading-tight">
              Marker Dream
            </span>
            <span className="text-[10px] text-zinc-400 font-mono block leading-tight">
              a easy game engine
            </span>
          </div>
        </button>

        {onOpenDashboard && (
          <button
            type="button"
            onClick={onOpenDashboard}
            className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-[11px] font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Ir para o Dashboard de Gerenciamento das Fases"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span>Dashboard</span>
          </button>
        )}

        {onOpenWorldMap && (
          <button
            type="button"
            onClick={onOpenWorldMap}
            className="px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Abrir o Editor Solo de Mapa Global (Overworld)"
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Mapa Global (Solo)</span>
          </button>
        )}

        {onOpenCharacters && (
          <button
            type="button"
            onClick={onOpenCharacters}
            className="px-2.5 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-[11px] font-semibold text-blue-300 hover:text-blue-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Abrir o Editor de Personagens"
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Personagens</span>
          </button>
        )}

        {onOpenInventory && (
          <button
            type="button"
            onClick={onOpenInventory}
            className="px-2.5 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-[11px] font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Abrir o Editor Completo de Inventários & Itens do Game"
          >
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Inventário &amp; Itens</span>
          </button>
        )}

        {onOpenQuests && (
          <button
            type="button"
            onClick={onOpenQuests}
            className="px-2.5 py-1 rounded-md bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-[11px] font-semibold text-purple-300 hover:text-purple-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Abrir o Editor Independente de Quests & Progressão Global (V2)"
          >
            <GitBranch className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Editor de Quests</span>
          </button>
        )}

        {onOpenHudUniversal && (
          <button
            type="button"
            onClick={onOpenHudUniversal}
            className="px-2.5 py-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Abrir o Editor Universal Dedicado de HUD & Telas Mestre (Vale para Todas as Fases)"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">HUD Universal (Mestre)</span>
          </button>
        )}

        {onOpenMindMap && (
          <button
            type="button"
            onClick={onOpenMindMap}
            className="px-2.5 py-1 rounded-md bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-[11px] font-bold text-pink-300 hover:text-pink-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-pink-500/10"
            title="Abrir o Editor de Mapa Mental & Conceitos"
          >
            <Brain className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Mapa Mental</span>
          </button>
        )}

        {onOpenMotionStudio && (
          <button
            type="button"
            onClick={onOpenMotionStudio}
            className="px-2.5 py-1 rounded-md bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-500/40 text-[11px] font-bold text-fuchsia-300 hover:text-fuchsia-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-fuchsia-500/10"
            title="Abrir o Estúdio Independente de Motion Canvas 2D & Roupas Equipáveis"
          >
            <Film className="w-3.5 h-3.5 text-fuchsia-400" />
            <span className="hidden sm:inline">Motion &amp; Skins</span>
          </button>
        )}

        {/* Indicador Cristalino da Fase Atual */}
        {activeLevelName && (
          <button
            type="button"
            onClick={() => onSelectTab('levels')}
            className={`flex items-center gap-2 px-3 py-1 rounded-md border transition-colors text-xs cursor-pointer group ${
              hasUnsavedChanges
                ? 'bg-zinc-900 border-orange-500/60 text-orange-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
            }`}
            title="Fase ativa em edição. Clique para abrir a Galeria de Fases."
          >
            {currentLevelKind === 'extended' ? (
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            )}
            <div className="flex flex-col text-left leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Fase</span>
                {hasUnsavedChanges ? (
                  <span className="flex items-center gap-1 text-[9px] font-semibold text-orange-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                    <span>Modificada</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Salva</span>
                  </span>
                )}
              </div>
              <span className="text-[12px] font-semibold text-white group-hover:text-zinc-200 truncate max-w-[130px] 2xl:max-w-[200px]">
                {activeLevelName}
              </span>
            </div>
          </button>
        )}
      </div>

      {/* Zone 2: Navigation Tabs Segmented Control */}
      <nav className="flex items-center gap-1 p-1 bg-zinc-950 rounded-lg border border-zinc-800 text-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activeTab === tab.id || ('forceActive' in tab && (tab as { forceActive?: boolean }).forceActive === true);
          const isSpecial = Boolean((tab as any).isSpecialEditor);

          let buttonStyle = '';
          let iconStyle = '';
          let badgeStyle = '';

          if (isSpecial) {
            if (isActive) {
              buttonStyle = 'bg-white text-black font-bold shadow-xs';
              iconStyle = 'text-black';
              badgeStyle = 'bg-black text-white';
            } else {
              buttonStyle = 'text-zinc-300 hover:text-white hover:bg-zinc-900 font-semibold';
              iconStyle = 'text-orange-400';
              badgeStyle = 'bg-zinc-900 text-zinc-300 border border-zinc-800';
            }
          } else {
            if (isActive) {
              buttonStyle = 'bg-zinc-850 text-white font-semibold border border-zinc-700 shadow-xs';
              iconStyle = 'text-white';
              badgeStyle = 'bg-zinc-800 text-zinc-300';
            } else {
              buttonStyle = 'text-zinc-400 hover:text-white hover:bg-zinc-900 font-medium';
              iconStyle = 'text-zinc-400';
              badgeStyle = 'bg-zinc-900 text-zinc-400';
            }
          }

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${buttonStyle}`}
            >
              <Icon className={`w-3.5 h-3.5 ${iconStyle}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-1 py-0.2 text-[9px] rounded font-mono font-semibold uppercase ${badgeStyle}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Export & Save Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* BOTÃO PRINCIPAL DE SALVAR FASE */}
        {onQuickSaveLevel && (
          <div className="relative flex items-center" ref={dropdownRef}>
            <div
              className={`flex items-center rounded-md border transition-colors shadow-xs ${
                justSaved
                  ? 'bg-zinc-900 border-emerald-500'
                  : hasUnsavedChanges
                  ? 'bg-zinc-900 border-orange-500'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <button
                type="button"
                onClick={onQuickSaveLevel}
                disabled={isSavingLevel}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer rounded-l-md ${
                  justSaved
                    ? 'text-emerald-400'
                    : hasUnsavedChanges
                    ? 'text-orange-400 hover:text-orange-300'
                    : 'text-zinc-200 hover:text-white'
                }`}
                title="Salvar alterações (Ctrl+S)"
              >
                {isSavingLevel ? (
                  <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin" />
                ) : justSaved ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                ) : (
                  <Save className={`w-3.5 h-3.5 ${hasUnsavedChanges ? 'text-orange-400 animate-pulse' : 'text-zinc-400'}`} />
                )}

                <span>
                  {isSavingLevel
                    ? 'Salvando...'
                    : justSaved
                    ? 'Salvo!'
                    : 'Salvar'}
                </span>

                {hasUnsavedChanges && !justSaved && !isSavingLevel && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping inline-block" />
                )}

                {lastSavedTimestamp && !isSavingLevel && (
                  <span
                    className={`text-[10px] font-mono px-1 py-0.5 rounded border ${
                      justSaved
                        ? 'bg-zinc-950 text-emerald-400 border-emerald-500/40'
                        : hasUnsavedChanges
                        ? 'bg-zinc-950 text-orange-400 border-orange-500/40'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    {lastSavedTimestamp}
                  </span>
                )}
              </button>

              {/* Botão de Dropdown */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className={`p-1.5 border-l rounded-r-md transition-colors cursor-pointer ${
                  justSaved
                    ? 'border-emerald-500/40 text-emerald-400 hover:bg-zinc-800'
                    : hasUnsavedChanges
                    ? 'border-orange-500/40 text-orange-400 hover:bg-zinc-800'
                    : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
                title="Mais opções de salvamento"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Menu Dropdown */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl p-1 z-50 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onQuickSaveLevel();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold text-zinc-200 hover:bg-zinc-900 hover:text-white transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Save className="w-3.5 h-3.5 text-orange-400" />
                    <span>Salvar Fase Atual</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1 py-0.5 rounded">Ctrl+S</span>
                </button>

                {onSaveAsNewLevel && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onSaveAsNewLevel();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold text-zinc-200 hover:bg-zinc-900 hover:text-white transition-colors text-left cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
                    <span>Salvar Como Nova Fase...</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onSelectTab('levels');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold text-zinc-200 hover:bg-zinc-900 hover:text-white transition-colors text-left cursor-pointer"
                >
                  <Gamepad2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Galeria de Fases</span>
                </button>

                <div className="border-t border-zinc-850 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onExportJSON();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors text-left cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Exportar Matriz JSON</span>
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onExportJSON}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Exportar JSON"
        >
          <FileJson className="w-3.5 h-3.5 text-zinc-400" />
          <span>JSON</span>
        </button>

        <button
          onClick={onExportPNG}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Exportar mapa em PNG"
        >
          <Download className="w-3.5 h-3.5" />
          <span>PNG</span>
        </button>

        {onPlayPhase && (
          <button
            onClick={onPlayPhase}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-black bg-emerald-500 hover:bg-emerald-400 rounded-md transition-colors whitespace-nowrap shrink-0 shadow-xs cursor-pointer active:scale-95"
            title="Ativar Modo Play desta Fase (jogar sem o editor em primeiro plano)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play Fase</span>
          </button>
        )}
      </div>
    </header>
  );
};
