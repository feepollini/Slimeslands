import React, { useState, useMemo } from 'react';
import type { SavedLevel, MapProject, WorldMapConfig, WorldMapPOI } from '../../types/map';
import {
  Plus,
  Search,
  MonitorPlay,
  ArrowUpDown,
  Smartphone,
  Upload,
  Film,
  Layers,
  MapPin,
  Play,
  Compass,
  Users,
  Package,
  GitBranch,
  Edit3,
  Copy,
  Trash2,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Sliders,
  Eye,
  Move,
  Brain,
  Headphones,
} from 'lucide-react';
import { PhasePreviewCard } from './PhasePreviewCard';
import { CreatePhaseModal } from './CreatePhaseModal';
import { exportProjectJSON } from '../../utils/exportHelpers';
import { getOrCreateWorldMapConfig } from '../workspace/WorldMapCanvasEditor';
import { getOrCreateScreensConfig } from '../screens/ScreensStudio';
import { loadCharactersRoster } from '../../utils/characterHelpers';
import { loadInventoryProjects } from '../../utils/inventoryHelpers';
import { ensureProjectQuestsConfig } from '../../utils/questEngine';
import { createStandaloneInterceptTestLevel } from '../../utils/interceptTestPhaseGenerator';

interface Props {
  project?: MapProject;
  savedLevels: SavedLevel[];
  activeLevelId: string | null;
  onOpenLevelInEditor: (level: SavedLevel) => void;
  onPlayLevel: (level: SavedLevel) => void;
  onDuplicateLevel: (level: SavedLevel) => void;
  onDeleteLevel: (levelId: string) => void;
  onRenameLevel?: (levelId: string, newName: string) => void;
  onCreateCustomLevel: (params: {
    name: string;
    description?: string;
    canvasKind: 'vertical' | 'extended';
    width: number;
    height: number;
    tilePng: string;
    baseColor?: string;
    repeatCount?: number;
  }) => void;
  onImportJSONFile?: (file: File) => void;
  onImportPNGFiles?: (files: FileList | File[]) => void;
  onGoToIntro: () => void;
  onGoToEditor: () => void;
  onOpenWorldMap?: (targetMap?: WorldMapConfig) => void;
  onOpenCharacters?: () => void;
  onOpenInventory?: () => void;
  onOpenQuests?: () => void;
  onOpenHudUniversal?: (screenId?: string) => void;
  onOpenMindMap?: () => void;
  onOpenMotionStudio?: () => void;
  onOpenAudioStudio?: () => void;
  onOpenSkillsForge?: () => void;
  onUpdateProject?: (updates: Partial<MapProject>) => void;
}

export const PhaseDashboardScreen: React.FC<Props> = ({
  project,
  savedLevels,
  activeLevelId,
  onOpenLevelInEditor,
  onPlayLevel,
  onDuplicateLevel,
  onDeleteLevel,
  onRenameLevel,
  onCreateCustomLevel,
  onImportJSONFile,
  onImportPNGFiles,
  onGoToIntro,
  onGoToEditor,
  onOpenWorldMap,
  onOpenCharacters,
  onOpenInventory,
  onOpenQuests,
  onOpenHudUniversal,
  onOpenMindMap,
  onOpenMotionStudio,
  onOpenAudioStudio,
  onOpenSkillsForge,
  onUpdateProject,
}) => {
  const currentProjectMap = project ? getOrCreateWorldMapConfig(project) : null;
  const worldMap = currentProjectMap;
  const screensConfig = useMemo(() => (project ? getOrCreateScreensConfig(project) : null), [project]);
  const charactersCount = useMemo(() => loadCharactersRoster(project).length, [project]);
  const inventoryProjectsCount = useMemo(() => loadInventoryProjects(project).length, [project]);
  const questsCount = useMemo(() => ensureProjectQuestsConfig(project).quests.length, [project]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'vertical' | 'extended'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'name'>('recent');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeGalleryTab, setActiveGalleryTab] = useState<
    'phases' | 'maps' | 'screens' | 'characters' | 'inventory' | 'quests'
  >('phases');

  // Galeria Real de Mapas Globais (Overworld) persistida
  const SAVED_WORLD_MAPS_STORAGE_KEY = 'marker_dream_saved_world_maps_v2';

  const [savedWorldMaps, setSavedWorldMaps] = useState<WorldMapConfig[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(SAVED_WORLD_MAPS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (currentProjectMap) {
              const idx = parsed.findIndex((m: WorldMapConfig) => m.id === currentProjectMap.id);
              if (idx >= 0) {
                parsed[idx] = currentProjectMap;
              } else {
                parsed.unshift(currentProjectMap);
              }
            }
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Erro ao ler galeria de mapas salvos:', e);
      }
    }
    const defaultList: WorldMapConfig[] = [
      currentProjectMap || {
        id: 'map-main-default',
        enabled: true,
        title: 'Mapa Global de Slimelands (Overworld)',
        description: 'Mapa panorâmico principal com castelos, vilas mágicas e rotas de exploração.',
        mapWidth: 1600,
        mapHeight: 667,
        pointsOfInterest: [
          {
            id: 'poi-start',
            name: '👑 Fase Mestra (Capital Real)',
            description: 'Ponto de partida dos heróis e capital do reino.',
            x: 240,
            y: 330,
            iconEmoji: '🏰',
            iconType: 'castle',
            status: 'unlocked',
            badgeText: 'Fase 1',
            scale: 1.0,
            rewardSlotCount: 10,
          },
          {
            id: 'poi-village',
            name: '💜 Vila Extended (NPCs & Quests)',
            description: 'Vila pacífica com mercadores, mestres de forja e missões secundárias.',
            x: 780,
            y: 260,
            iconEmoji: '🏘️',
            iconType: 'town',
            status: 'unlocked',
            badgeText: 'Vila',
            scale: 1.2,
            rewardSlotCount: 10,
          },
          {
            id: 'poi-boss',
            name: '💀 Covil das Trevas',
            description: 'Área perigosa com slimes corrompidos e o guardião supremo.',
            x: 1340,
            y: 310,
            iconEmoji: '💀',
            iconType: 'boss',
            status: 'locked',
            badgeText: 'Chefe Final',
            scale: 1.25,
            rewardSlotCount: 15,
          },
        ],
      },
      {
        id: 'map-sky-islands',
        enabled: true,
        title: 'Ilhas Flutuantes & Céu Arcano',
        description: 'Região aérea com arquipélago flutuante, santuários de vento e monstros alados.',
        mapWidth: 1800,
        mapHeight: 720,
        pointsOfInterest: [
          {
            id: 'poi-sky-dock',
            name: 'Cais das Nuvens',
            description: 'Ponto de atracagem de balões e barcos voadores.',
            x: 320,
            y: 360,
            iconEmoji: '⚓',
            status: 'unlocked',
            badgeText: 'Atracadouro',
            scale: 1.1,
            rewardSlotCount: 5,
          },
          {
            id: 'poi-sanctuary',
            name: 'Santuário dos Ventos',
            description: 'Templo sagrado onde elementais guardam relíquias ancestrais.',
            x: 960,
            y: 280,
            iconEmoji: '🏛️',
            status: 'locked',
            badgeText: 'Santuário',
            scale: 1.3,
            rewardSlotCount: 10,
          },
        ],
      },
    ];
    return defaultList;
  });

  const persistWorldMaps = (maps: WorldMapConfig[]) => {
    setSavedWorldMaps(maps);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SAVED_WORLD_MAPS_STORAGE_KEY, JSON.stringify(maps));
      } catch (e) {
        console.warn('Erro ao salvar galeria de mapas:', e);
      }
    }
  };

  const handleEditMap = (targetMap: WorldMapConfig) => {
    if (onUpdateProject) {
      onUpdateProject({ worldMap: targetMap });
    }
    if (onOpenWorldMap) {
      onOpenWorldMap(targetMap);
    } else {
      onGoToEditor();
    }
  };

  const handleCreateNewMap = () => {
    const newId = `map-${Date.now()}`;
    const newMap: WorldMapConfig = {
      id: newId,
      enabled: true,
      title: `Novo Mapa Global #${savedWorldMaps.length + 1}`,
      description: 'Mapa panorâmico explorável do reino com pontos de interesse e conexões de fase.',
      mapWidth: 1600,
      mapHeight: 667,
      pointsOfInterest: [
        {
          id: `poi-${Date.now()}-1`,
          name: 'Nova Região Inexplorada',
          description: 'Ponto de partida da nova jornada.',
          x: 340,
          y: 320,
          iconEmoji: '🚩',
          status: 'unlocked',
          badgeText: 'Fase 1',
          scale: 1.0,
          rewardSlotCount: 10,
        },
      ],
    };
    const nextList = [...savedWorldMaps, newMap];
    persistWorldMaps(nextList);
    handleEditMap(newMap);
  };

  const handleDuplicateMap = (sourceMap: WorldMapConfig) => {
    const newId = `map-${Date.now()}`;
    const cloned: WorldMapConfig = {
      ...sourceMap,
      id: newId,
      title: `${sourceMap.title || 'Mapa'} (Cópia)`,
      pointsOfInterest: (sourceMap.pointsOfInterest || []).map((poi) => ({
        ...poi,
        id: `poi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      })),
    };
    const nextList = [...savedWorldMaps, cloned];
    persistWorldMaps(nextList);
  };

  const handleDeleteMap = (mapId: string) => {
    if (savedWorldMaps.length <= 1) return;
    const nextList = savedWorldMaps.filter((m) => m.id !== mapId);
    persistWorldMaps(nextList);
  };

  // Filtra e ordena as fases
  const filteredLevels = useMemo(() => {
    let result = [...savedLevels];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (lvl) =>
          lvl.name.toLowerCase().includes(q) ||
          lvl.description?.toLowerCase().includes(q)
      );
    }

    if (filterType !== 'all') {
      result = result.filter((lvl) => {
        const isExt = lvl.stats
          ? lvl.stats.canvasKind === 'extended'
          : lvl.projectData?.canvasKind === 'extended' ||
            ((lvl.projectData?.subBiomes || []).length > 0 && (!lvl.projectData?.biomes || lvl.projectData.biomes.length === 0));
        return filterType === 'extended' ? isExt : !isExt;
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return sortBy === 'recent' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [savedLevels, searchQuery, filterType, sortBy]);

  // Estatísticas globais
  const stats = useMemo(() => {
    const total = savedLevels.length;
    let totalMarkers = 0;
    let verticalCount = 0;
    let extendedCount = 0;

    savedLevels.forEach((lvl) => {
      totalMarkers += lvl.stats ? lvl.stats.markersCount : (lvl.projectData?.markers || []).length;
      const isExt = lvl.stats
        ? lvl.stats.canvasKind === 'extended'
        : lvl.projectData?.canvasKind === 'extended' ||
          ((lvl.projectData?.subBiomes || []).length > 0 && (!lvl.projectData?.biomes || lvl.projectData.biomes.length === 0));
      if (isExt) extendedCount++;
      else verticalCount++;
    });

    return { total, totalMarkers, verticalCount, extendedCount };
  }, [savedLevels]);

  const activeLevel = savedLevels.find((l) => l.id === activeLevelId);

  const handleJSONFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportJSONFile) {
      onImportJSONFile(file);
    }
  };

  return (
    <div className="h-full max-h-screen w-full bg-black text-white flex flex-col select-none overflow-y-auto overflow-x-hidden font-sans">
      {/* Linha técnica superior em 4 cores (vermelho, laranja, verde, azul) */}
      <div className="w-full h-[2px] flex shrink-0">
        <div className="h-full flex-1 bg-red-600" />
        <div className="h-full flex-1 bg-orange-500" />
        <div className="h-full flex-1 bg-emerald-500" />
        <div className="h-full flex-1 bg-blue-600" />
      </div>

      {/* Conteúdo Principal da Dashboard (Com rolagem vertical ativa e cards compactos) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 md:px-6 md:py-5 space-y-4 pb-16">
        {/* SELETOR PRINCIPAL DOS 7 TIPOS DE EDITOR DA ENGINE (COMPACTO) */}
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>Marker Dream • Estúdios e Editores da Engine (10 Editores Integrados)</span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {activeLevel && (
                <button
                  type="button"
                  onClick={() => onPlayLevel(activeLevel)}
                  className="px-3 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  title="Jogar a fase ativa no Modo Play"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Play Fase Ativa</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onGoToIntro()}
                className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                title="Ver introdução"
              >
                <Film className="w-3 h-3 text-zinc-400" />
                <span>Intro</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-2.5">
            {/* 1. EDITOR DE FASE */}
            <div className="rounded-xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800 p-3 flex flex-col justify-between hover:border-orange-500/50 transition-all group shadow-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
                    <MonitorPlay className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30 font-bold truncate">
                    {stats.total} Fases
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white group-hover:text-orange-300 transition-colors leading-tight">
                  1. Editor de Fase
                </h3>
                <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">
                  Cenários, obstáculos, NPCs, diálogos e mecânicas.
                </p>
              </div>

              <div className="pt-2.5 mt-2 border-t border-zinc-800/80 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onGoToEditor()}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-black text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm truncate"
                >
                  <MonitorPlay className="w-3 h-3 shrink-0" />
                  <span className="truncate">{activeLevel ? 'Editar Ativa' : 'Abrir Fase'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-xs text-zinc-200 font-semibold transition-colors cursor-pointer shrink-0"
                  title="Criar nova fase"
                >
                  <Plus className="w-3.5 h-3.5 text-orange-400" />
                </button>
              </div>
            </div>

            {/* 2. EDITOR DE MAPA */}
            <div className="rounded-xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800 p-3 flex flex-col justify-between hover:border-amber-500/50 transition-all group shadow-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Compass className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold truncate">
                    Overworld
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors leading-tight">
                  2. Editor de Mapa
                </h3>
                <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">
                  Mapa global, rotas de mundo e conexões de fases.
                </p>
              </div>

              <div className="pt-2.5 mt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => (onOpenWorldMap ? onOpenWorldMap() : onGoToEditor())}
                  className="w-full py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm truncate"
                >
                  <Compass className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">Abrir Mapa</span>
                </button>
              </div>
            </div>

            {/* 3. EDITOR DE PERSONAGENS */}
            <div className="rounded-xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800 p-3 flex flex-col justify-between hover:border-blue-500/50 transition-all group shadow-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold truncate">
                    {charactersCount} Heróis
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors leading-tight">
                  3. Personagens
                </h3>
                <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">
                  Sprites, direções, atributos e limite de inventário.
                </p>
              </div>

              <div className="pt-2.5 mt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => (onOpenCharacters ? onOpenCharacters() : onGoToEditor())}
                  className="w-full py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm truncate"
                >
                  <Users className="w-3 h-3 shrink-0" />
                  <span className="truncate">Personagens</span>
                </button>
              </div>
            </div>

            {/* 4. EDITOR DE INVENTÁRIOS */}
            <div className="rounded-xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800 p-3 flex flex-col justify-between hover:border-emerald-500/50 transition-all group shadow-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <Package className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold truncate">
                    {inventoryProjectsCount} Projetos
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors leading-tight">
                  4. Inventários
                </h3>
                <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">
                  Projetos de inventário, catálogo de itens e Test Spawn.
                </p>
              </div>

              <div className="pt-2.5 mt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => (onOpenInventory ? onOpenInventory() : onGoToEditor())}
                  className="w-full py-1.5 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-extrabold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm truncate"
                >
                  <Package className="w-3 h-3 shrink-0" />
                  <span className="truncate">Inventários</span>
                </button>
              </div>
            </div>

            {/* 5. EDITOR DE QUESTS & PROGRESSÃO GLOBAL */}
            <div className="rounded-xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800 p-3 flex flex-col justify-between hover:border-purple-500/50 transition-all group shadow-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                    <GitBranch className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold truncate">
                    {questsCount} Quests V2
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors leading-tight">
                  5. Editor de Quests
                </h3>
                <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">
                  Eventos, comércio, grafo ramificado e recompensas.
                </p>
              </div>

              <div className="pt-2.5 mt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => (onOpenQuests ? onOpenQuests() : onGoToEditor())}
                  className="w-full py-1.5 px-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-extrabold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm truncate"
                >
                  <GitBranch className="w-3 h-3 shrink-0" />
                  <span className="truncate">Abrir Quests</span>
                </button>
              </div>
            </div>

            {/* 6. EDITOR UNIVERSAL DE HUD & TELAS MESTRE */}
            <div className="rounded-xl bg-gradient-to-b from-cyan-950/40 via-zinc-900/90 to-zinc-950 border border-cyan-500/40 p-3 flex flex-col justify-between hover:border-cyan-400 transition-all group shadow-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold truncate">
                    Universal
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors leading-tight">
                  6. HUD &amp; Telas
                </h3>
                <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">
                  Joystick, Header PV/EXP, Barra Vidro e HUD global.
                </p>
              </div>

              <div className="pt-2.5 mt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => (onOpenHudUniversal ? onOpenHudUniversal() : onGoToEditor())}
                  className="w-full py-1.5 px-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-extrabold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm truncate"
                >
                  <Smartphone className="w-3 h-3 shrink-0" />
                  <span className="truncate">HUD Universal</span>
                </button>
              </div>
            </div>

            {/* 7. EDITOR DE MAPA MENTAL & CONCEITOS */}
            <div className="rounded-xl bg-gradient-to-b from-pink-950/40 via-zinc-900/90 to-zinc-950 border border-pink-500/40 p-3 flex flex-col justify-between hover:border-pink-400 transition-all group shadow-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="w-7 h-7 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shrink-0">
                    <Brain className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30 font-bold truncate">
                    Síntese • GDD
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors leading-tight">
                  7. Mapa Mental
                </h3>
                <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">
                  Grafo de fases, edição rápida in-card e compilador.
                </p>
              </div>

              <div className="pt-2.5 mt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => (onOpenMindMap ? onOpenMindMap() : onGoToEditor())}
                  className="w-full py-1.5 px-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-[11px] font-extrabold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm shadow-pink-600/20 truncate"
                >
                  <Brain className="w-3 h-3 shrink-0" />
                  <span className="truncate">Mapa Mental</span>
                </button>
              </div>
            </div>

            {/* 8. ESTÚDIO MOTION CANVAS 2D & ROUPAS EQUIPÁVEIS (SOLO) */}
            <div className="rounded-xl bg-gradient-to-b from-fuchsia-950/45 via-zinc-900/90 to-zinc-950 border border-fuchsia-500/45 p-3 flex flex-col justify-between hover:border-fuchsia-400 transition-all group shadow-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="w-7 h-7 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-300 shrink-0">
                    <Film className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/30 font-bold truncate">
                    Paper-Doll 2D
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white group-hover:text-fuchsia-300 transition-colors leading-tight">
                  8. Motion &amp; Skins
                </h3>
                <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">
                  Rigging 2D, física, roupas, cintos e itens equipáveis por Tag.
                </p>
              </div>

              <div className="pt-2.5 mt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => (onOpenMotionStudio ? onOpenMotionStudio() : onGoToEditor())}
                  className="w-full py-1.5 px-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-[11px] font-extrabold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm shadow-fuchsia-600/20 truncate"
                >
                  <Film className="w-3 h-3 shrink-0" />
                  <span className="truncate">Motion Studio</span>
                </button>
              </div>
            </div>

            {/* 9. AUDIO STUDIO (SOLO) */}
            <div className="rounded-xl bg-gradient-to-b from-emerald-950/45 via-zinc-900/90 to-zinc-950 border border-emerald-500/45 p-3 flex flex-col justify-between hover:border-emerald-400 transition-all group shadow-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                    <Headphones className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 font-bold truncate">
                    Audio Engine
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors leading-tight">
                  9. Audio Studio
                </h3>
                <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">
                  Mixagem de canais, BGM, SFX e vozes da fase.
                </p>
              </div>

              <div className="pt-2.5 mt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => (onOpenAudioStudio ? onOpenAudioStudio() : onGoToEditor())}
                  className="w-full py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm shadow-emerald-600/20 truncate"
                >
                  <Headphones className="w-3 h-3 shrink-0" />
                  <span className="truncate">Audio Studio</span>
                </button>
              </div>
            </div>

            {/* 10. SKILLS FORGE (SOLO) */}
            <div className="rounded-xl bg-gradient-to-b from-amber-950/45 via-zinc-900/90 to-zinc-950 border border-amber-500/45 p-3 flex flex-col justify-between hover:border-amber-400 transition-all group shadow-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30 font-bold truncate">
                    Skills Matrix
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors leading-tight">
                  10. Skills Forge
                </h3>
                <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">
                  Forja de magias, habilidades ativas, passivas e custos.
                </p>
              </div>

              <div className="pt-2.5 mt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => (onOpenSkillsForge ? onOpenSkillsForge() : onGoToEditor())}
                  className="w-full py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-extrabold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm shadow-amber-600/20 truncate"
                >
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span className="truncate">Skills Forge</span>
                </button>
              </div>
            </div>
          </div>
        </section>
        {/* Cápsula Compacta de Status & Informações da Galeria (Substituindo o painel gigante anterior) */}
        <div className="rounded-2xl bg-zinc-950/90 border border-zinc-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[11px] font-mono font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span>
                {activeGalleryTab === 'phases'
                  ? 'Galeria de Fases'
                  : activeGalleryTab === 'maps'
                  ? 'Galeria de Mapas'
                  : activeGalleryTab === 'screens'
                  ? 'Galeria de Telas & HUD'
                  : activeGalleryTab === 'characters'
                  ? 'Galeria de Personagens & Slimes'
                  : activeGalleryTab === 'inventory'
                  ? 'Galeria de Inventários'
                  : 'Galeria de Quests'}
              </span>
            </span>

            <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />

            <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono text-zinc-300">
              <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-white font-bold">
                🎮 {stats.total} Fases
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-orange-300 font-bold">
                📍 {stats.totalMarkers} Marcadores
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-blue-300 hidden md:inline">
                📐 {stats.verticalCount} Vert · {stats.extendedCount} Fixo
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-emerald-300 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="truncate max-w-[160px]" title={activeLevel?.name || 'Nenhuma'}>
                  Ativa: {activeLevel?.name || 'Nenhuma'}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3 py-1 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Fase</span>
            </button>
          </div>
        </div>

        {/* Barra de Navegação Superior da Galeria: Sub-abas / Outras Galerias compatíveis com seus respectivos Editores */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-zinc-850 scrollbar-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveGalleryTab('phases')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeGalleryTab === 'phases'
                  ? 'bg-orange-500 text-slate-950 shadow-md font-black ring-1 ring-orange-300'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
              }`}
            >
              <MonitorPlay className="w-3.5 h-3.5" />
              <span>Fases ({savedLevels.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGalleryTab('maps')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeGalleryTab === 'maps'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-1 ring-amber-300'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Mapas &amp; Overworld ({worldMap?.pointsOfInterest?.length || 0} Locais)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGalleryTab('screens')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeGalleryTab === 'screens'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black ring-1 ring-cyan-300'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Telas &amp; HUD</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGalleryTab('characters')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeGalleryTab === 'characters'
                  ? 'bg-rose-500 text-white shadow-md font-black ring-1 ring-rose-300'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Personagens &amp; Slimes ({charactersCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGalleryTab('inventory')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeGalleryTab === 'inventory'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black ring-1 ring-emerald-300'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Inventários ({inventoryProjectsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGalleryTab('quests')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeGalleryTab === 'quests'
                  ? 'bg-purple-600 text-white shadow-md font-black ring-1 ring-purple-300'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Quests ({questsCount})</span>
            </button>
          </div>

          {/* Botão de Atalho para o Editor correspondente à aba ativa */}
          <div className="shrink-0">
            {activeGalleryTab === 'phases' && (
              <button
                type="button"
                onClick={() => onGoToEditor()}
                className="px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <MonitorPlay className="w-3.5 h-3.5" />
                <span>Abrir Editor de Fase</span>
              </button>
            )}
            {activeGalleryTab === 'maps' && (
              <button
                type="button"
                onClick={() => (onOpenWorldMap ? onOpenWorldMap() : onGoToEditor())}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Abrir Editor de Mapa</span>
              </button>
            )}
            {activeGalleryTab === 'screens' && (
              <button
                type="button"
                onClick={() => (onOpenHudUniversal ? onOpenHudUniversal() : onGoToEditor())}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Abrir HUD Universal</span>
              </button>
            )}
            {activeGalleryTab === 'characters' && (
              <button
                type="button"
                onClick={() => (onOpenCharacters ? onOpenCharacters() : onGoToEditor())}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Abrir Editor de Personagens</span>
              </button>
            )}
            {activeGalleryTab === 'inventory' && (
              <button
                type="button"
                onClick={() => (onOpenInventory ? onOpenInventory() : onGoToEditor())}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Abrir Editor de Inventários</span>
              </button>
            )}
            {activeGalleryTab === 'quests' && (
              <button
                type="button"
                onClick={() => (onOpenQuests ? onOpenQuests() : onGoToEditor())}
                className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Abrir Editor de Quests</span>
              </button>
            )}
          </div>
        </div>



        {/* 3. CONTEÚDO DINÂMICO CONFORME A SUB-ABA SELECIONADA */}
        {activeGalleryTab === 'phases' && (
          <>
            {/* Barra de Controles, Busca e Filtros P&B */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950 p-2.5 rounded-xl border border-zinc-850">
              {/* Busca */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar fases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                />
              </div>

              {/* Filtros */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-white text-black font-semibold'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  Todas ({savedLevels.length})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterType('vertical')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                    filterType === 'vertical'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3 h-3 text-current" />
                  <span>Vertical ({stats.verticalCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterType('extended')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                    filterType === 'extended'
                      ? 'bg-zinc-200 text-black font-semibold'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3 h-3 text-current" />
                  <span>Fixo Extended ({stats.extendedCount})</span>
                </button>
              </div>

              {/* Ordenação & Importar JSON */}
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-xs font-medium text-zinc-300 focus:outline-none focus:border-white cursor-pointer"
                >
                  <option value="recent">Recentes</option>
                  <option value="oldest">Antigas</option>
                  <option value="name">Nome (A-Z)</option>
                </select>

                <label
                  className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Importar backup JSON"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleJSONFileInput}
                  />
                </label>
              </div>
            </div>

            {/* Grid de Fases */}
            {filteredLevels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredLevels.map((lvl) => (
                  <PhasePreviewCard
                    key={lvl.id}
                    level={lvl}
                    isActive={lvl.id === activeLevelId}
                    onOpenInEditor={(target) => {
                      onOpenLevelInEditor(target);
                      onGoToEditor();
                    }}
                    onDuplicate={onDuplicateLevel}
                    onDelete={onDeleteLevel}
                    onRename={onRenameLevel}
                    onExportJSON={(target) => exportProjectJSON(target.projectData)}
                    onPlayInEmulator={(target) => {
                      onPlayLevel(target);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl bg-zinc-950 border border-dashed border-zinc-800 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-white">Nenhuma fase encontrada</h3>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    {searchQuery
                      ? `Nenhuma fase corresponde à busca "${searchQuery}".`
                      : 'Crie uma nova fase para começar.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-black font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar Nova Fase</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* SUB-ABA: GALERIA DE MAPAS & OVERWORLD */}
        {activeGalleryTab === 'maps' && (
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">
                  Galeria de Mapas Globais &amp; Overworlds ({savedWorldMaps.length})
                </span>
                <h3 className="text-lg font-bold text-white mt-1.5 flex items-center gap-2">
                  <span>Biblioteca de Mapas do Reino</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                  Crie, duplique e edite mapas panorâmicos com pontos de interesse, rotas com estilo gamer e slimes escaneáveis.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCreateNewMap}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25 transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Criar Novo Mapa Global</span>
                </button>
              </div>
            </div>

            {/* Listagem Real de Mapas */}
            <div className="space-y-6">
              {savedWorldMaps.map((mapItem, mapIdx) => {
                const isActive = (project?.worldMap?.id || 'map-main-default') === mapItem.id;
                return (
                  <div
                    key={mapItem.id || `map-${mapIdx}`}
                    className={`rounded-2xl border p-5 space-y-4 transition-all ${
                      isActive
                        ? 'bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.15)]'
                        : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    {/* Header do Card do Mapa */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-850 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-bold text-white flex items-center gap-2">
                            <span>🗺️ {mapItem.title || `Mapa Global #${mapIdx + 1}`}</span>
                          </h4>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                              ● Ativo no Projeto
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                            {mapItem.mapWidth || 1600}px × {mapItem.mapHeight || 667}px
                          </span>
                          <span className="text-[10px] font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            {mapItem.pointsOfInterest?.length || 0} Marcadores
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                          {mapItem.description || 'Mapa de exploração com rotas conectadas e regiões com monstros/slimes.'}
                        </p>
                      </div>

                      {/* Ações do Mapa */}
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditMap(mapItem)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                          title="Abrir este mapa no Editor de Mapa"
                        >
                          <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Editar no Editor de Mapa</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateMap(mapItem)}
                          className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Duplicar mapa"
                        >
                          <Copy className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Duplicar</span>
                        </button>

                        {savedWorldMaps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMap(mapItem.id || '')}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Excluir este mapa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Grade de Marcadores / POIs deste Mapa */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                        <span className="flex items-center gap-1.5 text-amber-300 font-bold uppercase tracking-wider text-[11px]">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          <span>Pontos de Interesse &amp; Slimes desta Região ({mapItem.pointsOfInterest?.length || 0}):</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEditMap(mapItem)}
                          className="text-[11px] text-amber-400 hover:text-amber-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Adicionar Ponto no Mapa</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(mapItem.pointsOfInterest || []).map((poi) => (
                          <div
                            key={poi.id}
                            className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/50 transition-all flex flex-col justify-between gap-3 group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-xl bg-black/70 border border-amber-400/40 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                {poi.iconPng ? (
                                  <img src={poi.iconPng} alt={poi.name} className="w-full h-full object-contain p-1" />
                                ) : (
                                  <span className="text-2xl">{poi.iconEmoji || '🏰'}</span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h5 className="text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                                  {poi.name}
                                </h5>
                                <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono mt-0.5">
                                  <span>X: {poi.x}</span>
                                  <span>·</span>
                                  <span>Y: {poi.y}</span>
                                  <span>·</span>
                                  <span className="text-amber-400">Escala: {Math.round((poi.scale || 1.0) * 100)}%</span>
                                </div>
                                <div className="text-[10.5px] text-zinc-400 mt-1 flex items-center gap-2">
                                  <span>👾 {poi.rewardSlotCount || poi.rewardSlots?.length || 10} Slimes</span>
                                  <span>·</span>
                                  <span className={poi.status === 'locked' ? 'text-rose-400' : 'text-emerald-400'}>
                                    {poi.status === 'locked' ? '🔒 Bloqueado' : '🔓 Liberado'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Botão de Ação Direta para Editar o Marcador */}
                            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
                              <button
                                type="button"
                                onClick={() => handleEditMap(mapItem)}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                              >
                                <Edit3 className="w-3 h-3 stroke-[2.5]" />
                                <span>Editar no Mapa</span>
                              </button>

                              {poi.targetLevelId && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const linkedLevel = savedLevels.find((l) => l.id === poi.targetLevelId);
                                    if (linkedLevel) onPlayLevel(linkedLevel);
                                  }}
                                  className="py-1.5 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                                  title="Testar Fase Vinculada no Modo Play"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Fase</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUB-ABA: GALERIA DE TELAS & HUD */}
        {activeGalleryTab === 'screens' && (
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30">
                  Estúdio de Telas e HUDs Universais
                </span>
                <h3 className="text-lg font-bold text-white mt-1.5">
                  Galeria de Telas &amp; Interfaces Mestre
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                  Escolha qualquer tela abaixo para abrir diretamente seu editor visual, reposicionar elementos no emulador ou personalizar atalhos WASD e botões touch.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenHudUniversal && onOpenHudUniversal('screen_player_hud')}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/25 transition-all"
                >
                  <Smartphone className="w-4 h-4 stroke-[2.5]" />
                  <span>Abrir Estúdio Geral de HUD</span>
                </button>
              </div>
            </div>

            {/* As 4 Telas Mestre com Ações Reais de Edição */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* TELA #1: Player HUD Retrato 9:16 */}
              <div className="p-5 rounded-2xl bg-zinc-950 border-2 border-cyan-500/40 hover:border-cyan-400 transition-all space-y-4 flex flex-col justify-between shadow-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold uppercase tracking-wider">
                      TELA #1 • Retrato Mobile
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 font-bold">360 × 640px (9:16)</span>
                  </div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span>📱 Player HUD (Modo Retrato 9:16)</span>
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Controles touch verticais com analógico móvel, joystick flutuante, anéis circulares de PV/EXP, barra de vidro retrátil com 6 slots e toasts de recompensas.
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Joystick Touch</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Header PV/EXP</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Barra Vidro 6 Slots</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Toasts Deslizantes</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-zinc-850">
                  <button
                    type="button"
                    onClick={() => onOpenHudUniversal && onOpenHudUniversal('screen_player_hud')}
                    className="flex-1 py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Editar HUD Retrato</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (activeLevel) onPlayLevel(activeLevel);
                      else onGoToEditor();
                    }}
                    className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                    title="Ver em execução no Modo Play"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Play</span>
                  </button>
                </div>
              </div>

              {/* TELA #2: Player HUD Paisagem 16:9 */}
              <div className="p-5 rounded-2xl bg-zinc-950 border-2 border-cyan-500/40 hover:border-cyan-400 transition-all space-y-4 flex flex-col justify-between shadow-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold uppercase tracking-wider">
                      TELA #2 • Paisagem Wide
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 font-bold">854 × 480px (16:9)</span>
                  </div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span>🖥️ Player HUD (Modo Paisagem 16:9)</span>
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Layout horizontal panorâmico para monitores wide e desktop, suporte nativo a teclas WASD/Setas, barra superior estendida, atalhos rápidos (I, M, J, Espaço).
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Modo Web WASD</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Layout Panorâmico</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Atalhos no Teclado</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Posicionamento Livre</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-zinc-850">
                  <button
                    type="button"
                    onClick={() => onOpenHudUniversal && onOpenHudUniversal('screen_player_hud_landscape')}
                    className="flex-1 py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Editar HUD Paisagem</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (activeLevel) onPlayLevel(activeLevel);
                      else onGoToEditor();
                    }}
                    className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                    title="Ver em execução no Modo Play"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Play</span>
                  </button>
                </div>
              </div>

              {/* TELA #3: Inventário Geral */}
              <div className="p-5 rounded-2xl bg-zinc-950 border-2 border-amber-500/40 hover:border-amber-400 transition-all space-y-4 flex flex-col justify-between shadow-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold uppercase tracking-wider">
                      TELA #3 • Mochila &amp; Itens
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 font-bold">Atalho: Tecla &quot;I&quot;</span>
                  </div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span>🎒 Tela de Inventário Geral</span>
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Interface global com grade de 24 a 48 slots, slots de equipamentos (Arma, Armadura, Acessório), contadores de ouro e gemas, e tabela de preços.
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Grade 30 Slots</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Ouro &amp; Gemas</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Equipamentos</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Loot &amp; Drops</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-zinc-850">
                  <button
                    type="button"
                    onClick={() => (onOpenInventory ? onOpenInventory() : onGoToEditor())}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Editar Tela de Inventário</span>
                  </button>
                </div>
              </div>

              {/* TELA #4: Pop-up de Jornada & Tarefas */}
              <div className="p-5 rounded-2xl bg-zinc-950 border-2 border-purple-500/40 hover:border-purple-400 transition-all space-y-4 flex flex-col justify-between shadow-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold uppercase tracking-wider">
                      TELA #4 • Missões &amp; Quests
                    </span>
                    <span className="text-[10px] font-mono text-purple-400 font-bold">Pop-up Central</span>
                  </div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span>✦ Pop-up de Jornada &amp; Tarefas (Quests)</span>
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Modal central com abas &quot;Jornada&quot; (missões principais) e &quot;Tarefas&quot; (side quests), recompensas em ouro, itens e rastreador retrátil no HUD.
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Jornada Principal</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Tarefas Secundárias</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Recompensas</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Tracker Retrátil</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-zinc-850">
                  <button
                    type="button"
                    onClick={() => (onOpenQuests ? onOpenQuests() : onGoToEditor())}
                    className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Editar Tela de Quests</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-ABA: GALERIA DE PERSONAGENS & SLIMES */}
        {activeGalleryTab === 'characters' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30">
                  Roster Global ({charactersCount})
                </span>
                <h3 className="text-lg font-bold text-white mt-1.5">
                  Galeria de Personagens, Heróis e Slimes
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                  Configure heróis jogáveis, monstros e slimes escaneáveis em cada bioma ou região do mapa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => (onOpenCharacters ? onOpenCharacters() : onGoToEditor())}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-500/25 transition-all shrink-0"
              >
                <Users className="w-4 h-4" />
                <span>Abrir Editor de Personagens</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {loadCharactersRoster(project).map((char) => (
                <div
                  key={char.id}
                  className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-rose-500/60 transition-all flex flex-col items-center text-center space-y-2.5 group"
                >
                  <div className="w-16 h-16 rounded-full bg-black/60 border-2 border-rose-400/50 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                    {char.avatarPng ? (
                      <img src={char.avatarPng} alt={char.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-3xl">👤</span>
                    )}
                  </div>
                  <div className="min-w-0 w-full">
                    <h5 className="text-xs font-bold text-white truncate group-hover:text-rose-300 transition-colors">
                      {char.name}
                    </h5>
                    <span className="text-[10px] text-zinc-400 block font-mono">Nv. {char.level || 1} • {char.role || 'Herói'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => (onOpenCharacters ? onOpenCharacters() : onGoToEditor())}
                    className="w-full py-1.5 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Editar</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUB-ABA: INVENTÁRIOS */}
        {activeGalleryTab === 'inventory' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
                  Gestão de Itens ({inventoryProjectsCount})
                </span>
                <h3 className="text-lg font-bold text-white mt-1.5">
                  Projetos de Inventário &amp; Catálogo
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                  Itens colecionáveis, consumíveis, equipamentos, tabelas de preços e spawn de teste.
                </p>
              </div>
              <button
                type="button"
                onClick={() => (onOpenInventory ? onOpenInventory() : onGoToEditor())}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 transition-all shrink-0"
              >
                <Package className="w-4 h-4" />
                <span>Abrir Editor de Inventários</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadInventoryProjects(project).map((invProj) => (
                <div
                  key={invProj.id}
                  className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/50 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <h5 className="text-sm font-bold text-white flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-400" />
                      <span>{invProj.name}</span>
                    </h5>
                    <p className="text-xs text-zinc-400">
                      {invProj.itemCatalog?.length || 0} Itens cadastrados • Mochila com {invProj.playerInventory?.maxSlots || 30} slots
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => (onOpenInventory ? onOpenInventory() : onGoToEditor())}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Catálogo &amp; Mochila</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUB-ABA: QUESTS */}
        {activeGalleryTab === 'quests' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30">
                  Progresso &amp; Missões ({questsCount})
                </span>
                <h3 className="text-lg font-bold text-white mt-1.5">
                  Quests &amp; Árvore de Eventos
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                  Grafo ramificado de missões, comércio, recompensas atômicas e rastreamento em tempo real.
                </p>
              </div>
              <button
                type="button"
                onClick={() => (onOpenQuests ? onOpenQuests() : onGoToEditor())}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-500/25 transition-all shrink-0"
              >
                <GitBranch className="w-4 h-4" />
                <span>Abrir Editor de Quests</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ensureProjectQuestsConfig(project).quests.map((quest) => (
                <div
                  key={quest.id}
                  className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/50 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 font-bold uppercase">
                        {quest.category === 'main' ? '⭐ Principal' : '📌 Secundária'}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {quest.steps?.length || 0} Etapas
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-white mt-1">
                      {quest.title || 'Missão sem Título'}
                    </h5>
                    <p className="text-xs text-zinc-400 line-clamp-2">
                      {quest.description || 'Objetivo da missão na fase ou mapa mundi.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => (onOpenQuests ? onOpenQuests() : onGoToEditor())}
                    className="w-full py-2 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Quest na Árvore</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal Aprimorado de Criação de Fase */}
      <CreatePhaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateCustomLevel={(params) => {
          onCreateCustomLevel(params);
          onGoToEditor();
        }}
        onImportPNGFiles={onImportPNGFiles}
      />
    </div>
  );
};
