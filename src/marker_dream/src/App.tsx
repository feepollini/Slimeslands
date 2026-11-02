import React, { useState, useRef, useCallback } from 'react';
import type {
  ActiveTool,
  TabId,
  PlayerConfig,
  LimitsBrushMode,
} from './types/map';
import { TopNav } from './components/TopNav';
import { Toolbar } from './components/Toolbar';
import { ScreenTabsBar } from './components/workspace/ScreenTabsBar';
import { FloatingToolsBar } from './components/workspace/FloatingToolsBar';
import { StudioSidebarDrawer } from './components/workspace/StudioSidebarDrawer';
import { EditorRightPanel } from './components/workspace/EditorRightPanel';
import { EditorCanvasViewport } from './components/workspace/EditorCanvasViewport';
import { CloseLevelModal } from './components/modals/CloseLevelModal';
import { SaveAsNewLevelModal } from './components/modals/SaveAsNewLevelModal';
import { usePhasePersistence } from './hooks/usePhasePersistence';
import { useMotionCanvasManager } from './hooks/useMotionCanvasManager';
import { useMarkerManager } from './hooks/useMarkerManager';
import { useBiomeManager } from './hooks/useBiomeManager';
import { useVfxOverlayManager } from './hooks/useVfxOverlayManager';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { exportMapToPNG, exportProjectJSON } from './utils/exportHelpers';
import { cloneMarkerShared } from './utils/assetRegistry';
import type { EffectType } from './utils/motionCanvasEngine';
import { EngineIntroScreen } from './components/hub/EngineIntroScreen';
import { PhaseDashboardScreen } from './components/hub/PhaseDashboardScreen';
import { PhasePlayScreen } from './components/hub/PhasePlayScreen';
import { CreatePhaseModal } from './components/hub/CreatePhaseModal';
import { getOrCreateScreensConfig } from './components/screens/ScreensStudio';
import { WorldMapSoloScreen } from './components/hub/WorldMapSoloScreen';
import { CharactersSoloScreen } from './components/playerEditor/CharactersSoloScreen';
import { InventorySoloScreen } from './components/inventory/InventorySoloScreen';
import { QuestSoloScreen } from './components/quests/QuestSoloScreen';
import { HudUniversalSoloScreen } from './components/screens/HudUniversalSoloScreen';
import { MindMapSoloScreen } from './components/mindmap/MindMapSoloScreen';
import { MotionSoloScreen } from './components/motion/MotionSoloScreen';
import { AudioStudioSoloScreen } from './components/audio/AudioStudioSoloScreen';
import { SkillsForgeSoloScreen } from './components/skills/SkillsForgeSoloScreen';
import { saveSingleLevelSlot } from './utils/storage';

export default function App() {
  // Engine Screen Architecture: 'intro' | 'dashboard' | 'editor' | 'play' | 'world_map' | 'characters' | 'inventory' | 'quests' | 'hud_universal' | 'mindmap' | 'motion_studio' | 'audio_studio' | 'skills_forge'
  const [hubView, setHubView] = useState<'intro' | 'dashboard' | 'editor' | 'play' | 'world_map' | 'characters' | 'inventory' | 'quests' | 'hud_universal' | 'mindmap' | 'motion_studio' | 'audio_studio' | 'skills_forge'>(() => {
    if (typeof window !== 'undefined') {
      const skip = localStorage.getItem('marker_dream_skip_intro');
      if (skip === 'true') {
        return 'dashboard';
      }
    }
    return 'intro';
  });

  // Navigation & Tool State
  const [activeTab, setActiveTab] = useState<TabId>('editor');
  const [activeTool, setActiveTool] = useState<ActiveTool>('pan');
  const [canvasRightView, setCanvasRightView] = useState<'emulator' | 'markers' | 'layers' | 'split'>('emulator');
  const [isCreatePhaseModalOpen, setIsCreatePhaseModalOpen] = useState<boolean>(false);

  // Limits Studio State
  const [limitsBrushMode, setLimitsBrushMode] = useState<LimitsBrushMode>('block');
  const [limitsBrushSize, setLimitsBrushSize] = useState<number>(1);
  const [limitsMirror, setLimitsMirror] = useState<boolean>(false);

  // Viewport, Zoom & Canvas Scroll Tracking
  const [zoom, setZoom] = useState<number>(1.0);
  const [currentScrollY, setCurrentScrollY] = useState<number>(0);
  const [currentViewportHeight, setCurrentViewportHeight] = useState<number>(600);
  const [scrollTargetY, setScrollTargetY] = useState<number | null>(null);
  const [syncScrollTargetY, setSyncScrollTargetY] = useState<{ y: number; id: number } | null>(null);

  // Motion Pen (Freehand drawing with jelly physics)
  const [motionBrushSize, setMotionBrushSize] = useState<number>(12);
  const [motionAuto, setMotionAuto] = useState<boolean>(true);
  const [motionEffect, setMotionEffect] = useState<EffectType>('jelly');
  const [motionSpeed, setMotionSpeed] = useState<number>(1.0);
  const [motionIntensity, setMotionIntensity] = useState<number>(1.0);
  const motionApiRef = useRef<{ extract: () => void; clear: () => void } | null>(null);

  // Clipboard for Markers
  const clipboardRef = useRef<{ type: 'marker' | 'subBiome'; data: any } | null>(null);

  // Ref holders to decouple hook closures
  const motionCanvasLayersRef = useRef<any[]>([]);
  const selectedMarkerIdRef = useRef<string | null>(null);
  const motionCanvasMarkerIdRef = useRef<string | null>(null);
  const isPrimordialJellyRef = useRef<boolean>(false);

  // Centralized Matrix Persistence Engine (IndexedDB, Autosave, Level Tabs)
  const persistence = usePhasePersistence({
    getMotionCanvasLayers: () => motionCanvasLayersRef.current,
    getTargetMarkerId: () => selectedMarkerIdRef.current || motionCanvasMarkerIdRef.current,
    getIsPrimordialJelly: () => isPrimordialJellyRef.current,
    onResetSelection: () => {
      markerManager.setSelectedMarkerId(null);
      motionCanvas.setMotionCanvasMarkerId(null);
      motionCanvas.setMotionCanvasLayers([]);
      markerManager.setTestDialogueMarkerId(null);
      setActiveTool('pan');
    },
    onSelectTab: (tab) => setActiveTab(tab),
  });

  const { project, setProject, savedLevels, activeLevelId, pushHistory, showToast } = persistence;

  // Canvas Mode: derived from active project setup (infinite vertical vs bounded extended)
  const canvasView: 'vertical' | 'extended' =
    project.canvasKind === 'extended' ||
    activeTab === 'extended' ||
    ((project.subBiomes || []).length > 0 && project.biomes.length === 0)
      ? 'extended'
      : 'vertical';

  // Marker, NPC Actions & Routes Engine
  const markerManager = useMarkerManager({
    project,
    setProject,
    canvasView,
    activeTab,
    setActiveTab,
    setActiveTool,
    setCanvasRightView,
    pushHistory,
    showToast,
    motionEffect,
    motionSpeed,
    motionIntensity,
  });

  // Motion Canvas Animation & Cutout Studio
  const motionCanvas = useMotionCanvasManager({
    project,
    setProject,
    selectedMarkerId: markerManager.selectedMarkerId,
    setSelectedMarkerId: markerManager.setSelectedMarkerId,
    activeTab,
    pushHistory,
    showToast,
    currentScrollY,
  });

  // Keep synchronization refs up-to-date
  motionCanvasLayersRef.current = motionCanvas.motionCanvasLayers;
  selectedMarkerIdRef.current = markerManager.selectedMarkerId;
  motionCanvasMarkerIdRef.current = motionCanvas.motionCanvasMarkerId;
  isPrimordialJellyRef.current = motionCanvas.isPrimordialJelly;

  // VFX Overlays Manager
  const vfxOverlay = useVfxOverlayManager({ project, setProject, pushHistory, showToast });

  // Biome & Sub-Biome Tile Management
  const biomeManager = useBiomeManager({ project, setProject });

  const isTerrainTab = activeTab === 'biomes' || activeTab === 'extended' || (activeTab as string) === 'terreno';

  // Player Character Updates
  const handleUpdatePlayer = useCallback((updates: Partial<PlayerConfig>) => {
    setProject((prev) => ({
      ...prev,
      player: {
        ...(prev.player || { id: 'p1', name: 'Herói', x: 384, y: 100, color: '#3b82f6', speed: 4 }),
        ...updates,
      },
    }));
  }, [setProject]);

  // Top Nav Tab Selection
  const handleTopNavSelect = useCallback((tab: TabId) => {
    if (tab === 'levels') {
      setHubView('dashboard');
      return;
    }
    if (tab === 'editor' || tab === 'terreno') {
      if (activeTab === 'biomes' || activeTab === 'extended' || activeTab === 'terreno') {
        setActiveTab('editor');
      } else {
        setActiveTab(canvasView === 'extended' ? 'extended' : 'biomes');
      }
      return;
    }
    setActiveTab(tab);
  }, [activeTab, canvasView]);

  // Import backup project JSON file directly into saved levels gallery
  const handleImportJSONFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object') {
        showToast('Arquivo JSON inválido.');
        return;
      }
      const newName = parsed.title || file.name.replace(/\.json$/i, '') || 'Fase Importada';
      const newLevel = {
        id: `level-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: newName,
        description: 'Importado de backup JSON',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectData: parsed,
      };
      persistence.setSavedLevels((prev) => [newLevel, ...prev]);
      showToast(`Fase "${newName}" importada com sucesso!`);
    } catch {
      showToast('Falha ao processar arquivo JSON.');
    }
  }, [persistence, showToast]);

  // Play Phase Trigger (abre Modo Play dedicado mantendo a mesma fase e estados variáveis)
  const handlePlayPhase = useCallback(() => {
    markerManager.setSelectedMarkerId(null);
    markerManager.setTestDialogueMarkerId(null);

    const spawnX = project.spawnConfig?.targetX ?? project.player?.x ?? 384;
    const spawnY = project.spawnConfig?.targetY ?? project.player?.y ?? 100;

    handleUpdatePlayer({ x: spawnX, y: spawnY });
    setScrollTargetY(spawnY);
    setSyncScrollTargetY({ y: spawnY, id: Date.now() });

    setHubView('play');
    setTimeout(() => {
      markerManager.setTestSpawnTriggerId(Date.now());
    }, 60);
    showToast('🎮 Modo Play Ativado!');
  }, [project.spawnConfig, project.player, handleUpdatePlayer, markerManager, showToast]);

  // Copy & Paste Markers (Instanciado: Zero Duplicação de Memória Binária)
  const handleCopy = useCallback(() => {
    if (markerManager.selectedMarkerId) {
      const m = project.markers.find((item) => item.id === markerManager.selectedMarkerId);
      if (m) {
        clipboardRef.current = { type: 'marker', data: cloneMarkerShared(m) };
        showToast(`Marcador "${m.name}" copiado! (Ctrl+C)`);
        return;
      }
    }
    showToast('Selecione um marcador ou objeto para copiar (Ctrl+C)');
  }, [markerManager.selectedMarkerId, project.markers, showToast]);

  const handlePaste = useCallback(() => {
    if (!clipboardRef.current) {
      showToast('Área de transferência vazia. Copie com Ctrl+C primeiro');
      return;
    }
    if (clipboardRef.current.type === 'marker') {
      const src = clipboardRef.current.data;
      pushHistory(project);
      const copy = {
        ...cloneMarkerShared(src),
        id: `marker-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: `${src.name} (Cópia)`,
        x: src.x + 36,
        y: src.y + 36,
      };
      setProject((prev) => ({ ...prev, markers: [...prev.markers, copy] }));
      markerManager.setSelectedMarkerId(copy.id);
      showToast(`Marcador "${copy.name}" colado! (Ctrl+V)`);
    }
  }, [clipboardRef, pushHistory, project, setProject, markerManager, showToast]);

  // Global Shortcuts: Ctrl+S, Ctrl+Z, Ctrl+Y, Ctrl+C, Ctrl+V, Motion Studio Keys
  useGlobalShortcuts({
    activeTab,
    onSavePhase: () => persistence.handleSaveCurrentAsLevel(),
    onUndo: persistence.handleUndo,
    onRedo: persistence.handleRedo,
    onCopy: handleCopy,
    onPaste: handlePaste,
    onMotionUndo: motionCanvas.handleMotionUndo,
    onMotionRedo: motionCanvas.handleMotionRedo,
    onMotionCopy: motionCanvas.handleMotionCopy,
    onMotionPaste: motionCanvas.handleMotionPaste,
    onMotionDuplicate: motionCanvas.handleMotionDuplicate,
    onMotionSave: motionCanvas.handleSaveMotionCanvas,
    onMotionDelete: motionCanvas.handleMotionDelete,
    onMotionNudge: motionCanvas.handleMotionNudge,
  });

  // Grid cycling
  const handleCycleGrid = useCallback(() => {
    const sequence: ('squares' | 'hex' | 'none')[] = ['squares', 'hex', 'none'];
    const currentIdx = sequence.indexOf(project.gridType);
    const nextGrid = sequence[(currentIdx + 1) % sequence.length];
    setProject((prev) => ({ ...prev, gridType: nextGrid }));
  }, [project.gridType, setProject]);

  const handleMotionTool = useCallback(() => {
    if (activeTool === 'motion_pen' && activeTab === 'motion') {
      setActiveTool('pan');
      setActiveTab('editor');
    } else {
      setActiveTool('motion_pen');
      setActiveTab('motion');
      if (['glow', 'glitter', 'smoke', 'fireflies', 'sparks'].includes(motionEffect)) {
        setMotionEffect('jelly');
      }
    }
  }, [activeTool, activeTab, motionEffect]);

  const handleEffectTool = useCallback(() => {
    if (activeTool === 'effect_pen' && activeTab === 'effect') {
      setActiveTool('pan');
      setActiveTab('editor');
    } else {
      setActiveTool('effect_pen');
      setActiveTab('effect');
    }
  }, [activeTool, activeTab]);

  // Screen 1: Cinematic Intro Screen ("Marker Dream: a easy game engine")
  if (hubView === 'intro') {
    return (
      <EngineIntroScreen
        onEnterDashboard={() => setHubView('dashboard')}
        onEnterEditor={() => setHubView('editor')}
      />
    );
  }

  // Screen 2: Phase Management Dashboard Screen
  if (hubView === 'dashboard') {
    return (
      <PhaseDashboardScreen
        project={project}
        savedLevels={savedLevels}
        activeLevelId={activeLevelId}
        onOpenLevelInEditor={(level) => {
          persistence.switchCanvasLevel(level);
          setHubView('editor');
        }}
        onPlayLevel={(level) => {
          persistence.switchCanvasLevel(level);
          setHubView('play');
          setTimeout(() => {
            markerManager.setTestSpawnTriggerId(Date.now());
          }, 80);
        }}
        onDuplicateLevel={persistence.handleDuplicateLevel}
        onDeleteLevel={persistence.handleDeleteLevel}
        onRenameLevel={(id, name) => persistence.handleUpdateSavedLevel(id, { name })}
        onCreateCustomLevel={(params) => {
          persistence.handleCreateCustomLevel(params);
          setHubView('editor');
        }}
        onImportJSONFile={handleImportJSONFile}
        onImportPNGFiles={(files) => {
          biomeManager.handleGlobalPNGUpload({ target: { files } } as any);
        }}
        onGoToIntro={() => setHubView('intro')}
        onGoToEditor={() => setHubView('editor')}
        onOpenWorldMap={(targetMap) => {
          if (
            targetMap &&
            typeof targetMap === 'object' &&
            !(targetMap instanceof Event) &&
            'pointsOfInterest' in targetMap &&
            Array.isArray((targetMap as any).pointsOfInterest)
          ) {
            setProject((prev) => ({ ...prev, worldMap: targetMap }));
          }
          setHubView('world_map');
        }}
        onOpenCharacters={() => setHubView('characters')}
        onOpenInventory={() => setHubView('inventory')}
        onOpenQuests={() => setHubView('quests')}
        onOpenHudUniversal={(screenId) => {
          if (screenId && typeof screenId === 'string') {
            const curScreens = getOrCreateScreensConfig(project);
            const updated = { ...curScreens, activeScreenId: screenId };
            setProject((prev) => ({ ...prev, screensConfig: updated }));
          }
          setHubView('hud_universal');
        }}
        onOpenMindMap={() => setHubView('mindmap')}
        onOpenMotionStudio={() => setHubView('motion_studio')}
        onOpenAudioStudio={() => setHubView('audio_studio')}
        onOpenSkillsForge={() => setHubView('skills_forge')}
        onUpdateProject={(updates) => {
          if (updates && typeof updates === 'object' && !(updates instanceof Event)) {
            setProject((prev) => ({ ...prev, ...updates }));
          }
        }}
      />
    );
  }

  // Screen 2.76: Dedicated Standalone Audio Studio (Fish Audio Engine)
  if (hubView === 'audio_studio') {
    return (
      <AudioStudioSoloScreen
        project={project}
        setProject={setProject}
        onGoToDashboard={() => setHubView('dashboard')}
        onGoToEditor={() => setHubView('editor')}
        onOpenSkillsForge={() => setHubView('skills_forge')}
      />
    );
  }

  // Screen 2.77: Dedicated Standalone Skills Forge (VFX Studio Pro Arena)
  if (hubView === 'skills_forge') {
    return (
      <SkillsForgeSoloScreen
        project={project}
        setProject={setProject}
        onGoToDashboard={() => setHubView('dashboard')}
        onGoToEditor={() => setHubView('editor')}
        onOpenAudioStudio={() => setHubView('audio_studio')}
      />
    );
  }

  // Screen 2.75: Dedicated Standalone Motion Canvas & Paper-Doll Studio (Modo Independente de Motion)
  if (hubView === 'motion_studio') {
    return (
      <MotionSoloScreen
        project={project}
        onUpdateProject={setProject}
        onBack={() => setHubView('dashboard')}
        onOpenInventoryEditor={() => setHubView('inventory')}
        onOpenCharactersEditor={() => setHubView('characters')}
      />
    );
  }

  // Screen 2.8: Dedicated Solo World Map Editor Screen (Modo Solo de Mapa Global)
  if (hubView === 'world_map') {
    return (
      <WorldMapSoloScreen
        project={project}
        setProject={setProject}
        savedLevels={savedLevels}
        onLoadLevel={(level) => {
          persistence.switchCanvasLevel(level);
          setHubView('editor');
        }}
        onGoToDashboard={() => setHubView('dashboard')}
        onGoToEditor={() => setHubView('editor')}
        onPlayLevel={handlePlayPhase}
        showToast={showToast}
      />
    );
  }

  // Screen 2.9: Dedicated Multi-Character Editor Screen (Editor de Personagens)
  if (hubView === 'characters') {
    return (
      <CharactersSoloScreen
        project={project}
        setProject={setProject}
        savedLevels={savedLevels}
        onGoToDashboard={() => setHubView('dashboard')}
        onGoToEditor={() => setHubView('editor')}
        onOpenQuests={() => setHubView('quests')}
        onPlayLevel={handlePlayPhase}
        showToast={showToast}
      />
    );
  }

  // Screen 2.95: Dedicated Inventory & Items Editor Screen (Editor de Inventários & Itens do Game)
  if (hubView === 'inventory') {
    return (
      <>
        <InventorySoloScreen
          project={project}
          setProject={setProject}
          savedLevels={savedLevels}
          onGoToDashboard={() => setHubView('dashboard')}
          onGoToEditor={() => setHubView('editor')}
          onOpenCharacters={() => setHubView('characters')}
          onOpenQuests={() => setHubView('quests')}
          onPlayLevel={handlePlayPhase}
          showToast={showToast}
        />
        {persistence.toastMsg && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-amber-300 border border-amber-500/50 px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl backdrop-blur-md pointer-events-none flex items-center gap-2">
            <span>✨</span>
            <span>{persistence.toastMsg}</span>
          </div>
        )}
      </>
    );
  }

  // Screen 2.98: Dedicated Standalone Quest & Global Progression Editor Screen (Seção 17)
  if (hubView === 'quests') {
    return (
      <>
        <QuestSoloScreen
          project={project}
          setProject={setProject}
          savedLevels={savedLevels}
          onGoToDashboard={() => setHubView('dashboard')}
          onGoToEditor={() => setHubView('editor')}
          onGoToCharacters={() => setHubView('characters')}
          onGoToInventory={() => setHubView('inventory')}
          onPlayLevel={handlePlayPhase}
          showToast={showToast}
        />
        {persistence.toastMsg && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-amber-300 border border-amber-500/50 px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl backdrop-blur-md pointer-events-none flex items-center gap-2">
            <span>✨</span>
            <span>{persistence.toastMsg}</span>
          </div>
        )}
      </>
    );
  }

  // Screen 2.99: Dedicated Universal HUD & Master Screens Editor
  if (hubView === 'hud_universal') {
    return (
      <>
        <HudUniversalSoloScreen
          project={project}
          setProject={setProject}
          savedLevels={savedLevels}
          onSyncHudToAllLevels={(universalScreens) => {
            persistence.setSavedLevels((prevLevels) =>
              prevLevels.map((lvl) => ({
                ...lvl,
                projectData: {
                  ...lvl.projectData,
                  screensConfig: universalScreens,
                },
              }))
            );
          }}
          onGoToDashboard={() => setHubView('dashboard')}
          onGoToEditor={() => setHubView('editor')}
          onPlayLevel={handlePlayPhase}
          showToast={showToast}
        />
        {persistence.toastMsg && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-amber-300 border border-amber-500/50 px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl backdrop-blur-md pointer-events-none flex items-center gap-2">
            <span>✨</span>
            <span>{persistence.toastMsg}</span>
          </div>
        )}
      </>
    );
  }

  // Screen 2.999: Dedicated Mind Map & Concepts Studio
  if (hubView === 'mindmap') {
    return (
      <>
        <MindMapSoloScreen
          onGoToDashboard={() => setHubView('dashboard')}
          onGoToEditor={() => setHubView('editor')}
          showToast={showToast}
          project={project}
          setProject={setProject}
          savedLevels={savedLevels}
          onCompileLevel={(newLevel, mode) => {
            persistence.setSavedLevels((prev) => {
              const filtered = prev.filter((l) => l.id !== newLevel.id);
              const next = [newLevel, ...filtered];
              saveSingleLevelSlot(newLevel, next);
              return next;
            });
            if (mode === 'editor') {
              persistence.switchCanvasLevel(newLevel);
              setHubView('editor');
            } else if (mode === 'play') {
              persistence.switchCanvasLevel(newLevel);
              setTimeout(() => {
                handlePlayPhase();
              }, 80);
            }
          }}
        />
        {persistence.toastMsg && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-amber-300 border border-amber-500/50 px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl backdrop-blur-md pointer-events-none flex items-center gap-2">
            <span>✨</span>
            <span>{persistence.toastMsg}</span>
          </div>
        )}
      </>
    );
  }

  // Screen 2.5: Dedicated Play Mode Screen (Sem o editor em primeiro plano, com estados e variáveis reais da fase)
  if (hubView === 'play') {
    const activeLevelName =
      project.title || savedLevels.find((l) => l.id === activeLevelId)?.name || 'Minha Fase';
    return (
      <>
        <PhasePlayScreen
          project={project}
          setProject={setProject}
          savedLevels={savedLevels}
          activeLevelId={activeLevelId}
          activeLevelName={activeLevelName}
          canvasView={canvasView}
          hasUnsavedChanges={persistence.hasUnsavedChanges}
          justSaved={persistence.justSaved}
          isSavingLevel={persistence.isSavingLevel}
          testSpawnTriggerId={markerManager.testSpawnTriggerId}
          onTriggerSpawn={() => {
            const spawnX = project.spawnConfig?.targetX ?? project.player?.x ?? 384;
            const spawnY = project.spawnConfig?.targetY ?? project.player?.y ?? 100;
            handleUpdatePlayer({ x: spawnX, y: spawnY });
            markerManager.setTestSpawnTriggerId(Date.now());
          }}
          onUpdatePlayer={handleUpdatePlayer}
          onUpdateMarker={markerManager.handleUpdateMarker}
          onLoadLevel={persistence.handleLoadLevel}
          onQuickSaveLevel={() => persistence.handleSaveCurrentAsLevel()}
          onGoToEditor={() => setHubView('editor')}
          onOpenLandscapeHudConfig={() => {
            const curScreens = getOrCreateScreensConfig(project);
            setProject((prev) => ({
              ...prev,
              screensConfig: {
                ...curScreens,
                activeScreenId: 'screen_player_hud_landscape',
              },
            }));
            setActiveTab('screens');
            setHubView('editor');
          }}
          onGoToDashboard={() => setHubView('dashboard')}
        />
        {persistence.toastMsg && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-amber-300 border border-amber-500/50 px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl backdrop-blur-md pointer-events-none flex items-center gap-2">
            <span>✨</span>
            <span>{persistence.toastMsg}</span>
          </div>
        )}
      </>
    );
  }

  // Screen 3: Complete Level Studio & Editor
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-white select-none">
      {/* 3-Zone Top Navigation Bar */}
      <TopNav
        activeTab={activeTab}
        canvasKind={canvasView}
        activeLevelName={project.title || savedLevels.find((l) => l.id === activeLevelId)?.name || 'Minha Fase'}
        activeLevelKind={canvasView}
        hasUnsavedChanges={persistence.hasUnsavedChanges}
        justSaved={persistence.justSaved}
        onSelectTab={handleTopNavSelect}
        onExportPNG={() => exportMapToPNG(project)}
        onExportJSON={() => exportProjectJSON(project)}
        onQuickSaveLevel={() => persistence.handleSaveCurrentAsLevel()}
        onSaveAsNewLevel={() => persistence.setSaveAsNewModalOpen(true)}
        onPlayPhase={handlePlayPhase}
        lastSavedTimestamp={persistence.lastSavedTimestamp}
        isSavingLevel={persistence.isSavingLevel}
        onOpenDashboard={() => setHubView('dashboard')}
        onOpenWorldMap={() => setHubView('world_map')}
        onOpenCharacters={() => setHubView('characters')}
        onOpenInventory={() => setHubView('inventory')}
        onOpenQuests={() => setHubView('quests')}
        onOpenHudUniversal={() => setHubView('hud_universal')}
        onOpenMindMap={() => setHubView('mindmap')}
        onOpenMotionStudio={() => setHubView('motion_studio')}
        onOpenAudioStudio={() => setHubView('audio_studio')}
        onOpenSkillsForge={() => setHubView('skills_forge')}
      />

      {/* Régua de TELAS (canvas tabs) */}
      <ScreenTabsBar
        savedLevels={savedLevels}
        activeLevelId={activeLevelId}
        onSwitchLevel={persistence.switchCanvasLevel}
        onOpenLevelSettings={(kind) => setActiveTab(kind === 'extended' ? 'extended' : 'biomes')}
        onRequestCloseLevel={persistence.setClosingLevel}
        onCreateNewCanvas={persistence.createNewCanvas}
        onOpenDashboard={() => setHubView('dashboard')}
        onOpenCreateModal={() => setIsCreatePhaseModalOpen(true)}
      />

      {/* Hidden global PNG file input */}
      <input
        ref={biomeManager.globalUploadRef}
        type="file"
        multiple
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={biomeManager.handleGlobalPNGUpload}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden bg-black">
        {/* Left Side: Map Studio & Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-850 bg-black">
          <Toolbar
            onImportPNG={() => biomeManager.globalUploadRef.current?.click()}
              zoom={zoom}
              onZoomIn={() => setZoom((z) => Math.min(3.0, z + 0.15))}
              onZoomOut={() => setZoom((z) => Math.max(0.15, z - 0.15))}
              onResetZoom={() => setZoom(1.0)}
              gridType={project.gridType}
              onCycleGrid={handleCycleGrid}
              canUndo={persistence.canUndo}
              canRedo={persistence.canRedo}
              onUndo={persistence.handleUndo}
              onRedo={persistence.handleRedo}
            />

          {/* Interactive Map Viewport with Left Sidebar Drawer + Center Canvas + Radar */}
          <div className="flex-1 relative flex overflow-hidden">
            <StudioSidebarDrawer
              activeTab={activeTab}
              onClose={() => setActiveTab('editor')}
              project={project}
              setProject={setProject}
              savedLevels={savedLevels}
              activeLevelId={activeLevelId}
              onOpenSoloMapEditor={() => setHubView('world_map')}
              onOpenCharactersEditor={() => setHubView('characters')}
              onOpenInventoryEditor={() => setHubView('inventory')}
              onOpenQuestsEditor={() => setHubView('quests')}
              hasUnsavedChanges={persistence.hasUnsavedChanges}
              onSaveCurrentAsLevel={() => persistence.handleSaveCurrentAsLevel()}
              onUpdateSavedLevel={persistence.handleUpdateSavedLevel}
              onOverwriteSavedLevel={persistence.handleOverwriteSavedLevel}
              onLoadLevel={persistence.handleLoadLevel}
              onDuplicateLevel={persistence.handleDuplicateLevel}
              onDeleteLevel={persistence.handleDeleteLevel}
              onCreateNewEmptyLevel={persistence.handleCreateNewEmptyLevel}
              selectedMarkerId={markerManager.selectedMarkerId}
              setSelectedMarkerId={markerManager.setSelectedMarkerId}
              setActiveTab={setActiveTab}
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              setCanvasRightView={setCanvasRightView}
              currentScrollY={currentScrollY}
              setScrollTargetY={setScrollTargetY}
              setSyncScrollTargetY={setSyncScrollTargetY}
              showToast={showToast}
              onUpdateBiome={biomeManager.handleUpdateBiome}
              onAddBiomeFromPNG={biomeManager.handleAddBiomeFromPNG}
              onRemoveBiome={biomeManager.handleRemoveBiome}
              onMoveBiome={biomeManager.handleMoveBiome}
              onAddSubBiome={biomeManager.handleAddSubBiome}
              onUpdateSubBiome={biomeManager.handleUpdateSubBiome}
              onRemoveSubBiome={biomeManager.handleRemoveSubBiome}
              canvasView={canvasView}
              onAddMarkerAt={markerManager.handleAddMarkerAt}
              onUpdateMarker={markerManager.handleUpdateMarker}
              onDeleteMarker={markerManager.handleDeleteMarker}
              onDropMarkerAsset={markerManager.handleDropMarkerAsset}
              limitsBrushMode={limitsBrushMode}
              setLimitsBrushMode={setLimitsBrushMode}
              limitsBrushSize={limitsBrushSize}
              setLimitsBrushSize={setLimitsBrushSize}
              limitsMirror={limitsMirror}
              setLimitsMirror={setLimitsMirror}
              motionBrushSize={motionBrushSize}
              setMotionBrushSize={setMotionBrushSize}
              motionAuto={motionAuto}
              setMotionAuto={setMotionAuto}
              motionEffect={motionEffect}
              setMotionEffect={setMotionEffect}
              motionSpeed={motionSpeed}
              setMotionSpeed={setMotionSpeed}
              motionIntensity={motionIntensity}
              setMotionIntensity={setMotionIntensity}
              motionApiRef={motionApiRef}
              {...vfxOverlay}
              onUpdatePlayer={handleUpdatePlayer}
              setTestSpawnTriggerId={markerManager.setTestSpawnTriggerId}
              setTestDialogueMarkerId={markerManager.setTestDialogueMarkerId}
              motionCanvasMarkerId={motionCanvas.motionCanvasMarkerId}
              setMotionCanvasMarkerId={motionCanvas.setMotionCanvasMarkerId}
              motionCanvasActiveLayerId={motionCanvas.motionCanvasActiveLayerId}
              setMotionCanvasActiveLayerId={motionCanvas.setMotionCanvasActiveLayerId}
              motionCanvasLayers={motionCanvas.motionCanvasLayers}
              setMotionCanvasLayers={motionCanvas.setMotionCanvasLayers}
              motionCanvasBrushSize={motionCanvas.motionCanvasBrushSize}
              setMotionCanvasBrushSize={motionCanvas.setMotionCanvasBrushSize}
              motionCanvasBrushMode={motionCanvas.motionCanvasBrushMode}
              setMotionCanvasBrushMode={motionCanvas.setMotionCanvasBrushMode}
              motionCanvasSmoothLevel={motionCanvas.motionCanvasSmoothLevel}
              setMotionCanvasSmoothLevel={motionCanvas.setMotionCanvasSmoothLevel}
              motionCanvasActiveTool={motionCanvas.motionCanvasActiveTool}
              setMotionCanvasActiveTool={motionCanvas.setMotionCanvasActiveTool}
              isPrimordialJelly={motionCanvas.isPrimordialJelly}
              setIsPrimordialJelly={motionCanvas.setIsPrimordialJelly}
              onReplaceBaseAssetPng={motionCanvas.handleReplaceBaseAssetPng}
              motionCanvasExtractionAction={motionCanvas.motionCanvasExtractionAction}
              setMotionCanvasExtractionAction={motionCanvas.setMotionCanvasExtractionAction}
              motionCanvasAutoExtract={motionCanvas.motionCanvasAutoExtract}
              setMotionCanvasAutoExtract={motionCanvas.setMotionCanvasAutoExtract}
              onSaveMotionCanvas={motionCanvas.handleSaveMotionCanvas}
              onLoadMotionComposition={motionCanvas.handleLoadMotionComposition}
            />

            <EditorCanvasViewport
              activeTab={activeTab}
              activeTool={activeTool}
              setActiveTab={setActiveTab}
              project={project}
              setProject={setProject}
              canvasView={canvasView}
              pushHistory={pushHistory}
              showToast={showToast}
              onOpenCreateModal={() => setIsCreatePhaseModalOpen(true)}
              {...motionCanvas}
              {...markerManager}
              {...vfxOverlay}
              {...biomeManager}
              limitsBrushMode={limitsBrushMode}
              limitsBrushSize={limitsBrushSize}
              limitsMirror={limitsMirror}
              motionBrushSize={motionBrushSize}
              motionAuto={motionAuto}
              motionEffect={motionEffect}
              motionSpeed={motionSpeed}
              motionIntensity={motionIntensity}
              motionApiRef={motionApiRef}
              zoom={zoom}
              setZoom={setZoom}
              currentScrollY={currentScrollY}
              setCurrentScrollY={setCurrentScrollY}
              currentViewportHeight={currentViewportHeight}
              setCurrentViewportHeight={setCurrentViewportHeight}
              scrollTargetY={scrollTargetY}
              setScrollTargetY={setScrollTargetY}
              syncScrollTargetY={syncScrollTargetY}
              setSyncScrollTargetY={setSyncScrollTargetY}
              savedLevels={savedLevels}
              activeLevelId={activeLevelId}
              onLoadLevel={persistence.handleLoadLevel}
            />

            <FloatingToolsBar
              activeTab={activeTab}
              activeTool={activeTool}
              setActiveTab={setActiveTab}
              setActiveTool={setActiveTool}
              onMotionTool={handleMotionTool}
              onEffectTool={handleEffectTool}
            />
          </div>
        </div>

        {/* Right Side: Portrait Emulator / Dedicated Layers Panel / Split View */}
        <EditorRightPanel
          activeTab={activeTab}
          motionRightView={motionCanvas.motionRightView}
          setMotionRightView={motionCanvas.setMotionRightView}
          canvasRightView={canvasRightView}
          setCanvasRightView={setCanvasRightView}
          motionCanvasLayers={motionCanvas.motionCanvasLayers}
          motionCanvasActiveLayerId={motionCanvas.motionCanvasActiveLayerId}
          setMotionCanvasActiveLayerId={motionCanvas.setMotionCanvasActiveLayerId}
          setMotionCanvasLayers={motionCanvas.setMotionCanvasLayers}
          handleReplaceBaseAssetPng={motionCanvas.handleReplaceBaseAssetPng}
          handleSaveMotionCanvas={motionCanvas.handleSaveMotionCanvas}
          project={project}
          setProject={setProject}
          savedLevels={savedLevels}
          selectedMarkerId={markerManager.selectedMarkerId}
          setSelectedMarkerId={markerManager.setSelectedMarkerId}
          setMotionCanvasMarkerId={motionCanvas.setMotionCanvasMarkerId}
          handleUpdateMarker={markerManager.handleUpdateMarker}
          handleDeleteMarker={markerManager.handleDeleteMarker}
          setScrollTargetY={setScrollTargetY}
          setSyncScrollTargetY={setSyncScrollTargetY}
          switchCanvasLevel={persistence.switchCanvasLevel}
          setActiveTool={setActiveTool}
          setActiveTab={setActiveTab}
          handleDropMarkerAsset={markerManager.handleDropMarkerAsset}
          currentScrollY={currentScrollY}
          canvasView={canvasView}
          handleLoadLevel={persistence.handleLoadLevel}
          globalUploadRef={biomeManager.globalUploadRef}
          syncScrollTargetY={syncScrollTargetY}
          scrollTargetY={scrollTargetY}
          testDialogueMarkerId={markerManager.testDialogueMarkerId}
          setTestDialogueMarkerId={markerManager.setTestDialogueMarkerId}
          handleUpdatePlayer={handleUpdatePlayer}
          activeTool={activeTool}
          handleAddMotionMarker={markerManager.handleAddMotionMarker}
          motionBrushSize={motionBrushSize}
          motionAuto={motionAuto}
          motionEffect={motionEffect}
          motionSpeed={motionSpeed}
          motionIntensity={motionIntensity}
          testSpawnTriggerId={markerManager.testSpawnTriggerId}
        />
      </div>

      {/* Floating Toast notification */}
      {persistence.toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-amber-300 border border-amber-500/50 px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl backdrop-blur-md pointer-events-none flex items-center gap-2">
          <span>✨</span>
          <span>{persistence.toastMsg}</span>
        </div>
      )}

      {/* Modal Dialog for Tab Close Confirmation */}
      <CloseLevelModal
        closingLevel={persistence.closingLevel}
        onCancel={() => persistence.setClosingLevel(null)}
        onConfirmClose={persistence.handleConfirmCloseLevel}
      />

      {/* Modal Dialog for Save As New Level */}
      <SaveAsNewLevelModal
        isOpen={persistence.saveAsNewModalOpen}
        defaultTitle={project.title || 'Fase'}
        onClose={() => persistence.setSaveAsNewModalOpen(false)}
        onSaveAsNew={(newName) => {
          persistence.handleSaveCurrentAsLevel(newName, undefined, { asNew: true });
        }}
      />

      {/* Modal Aprimorado de Criação de Novas Fases / Telas Customizadas */}
      <CreatePhaseModal
        isOpen={isCreatePhaseModalOpen}
        onClose={() => setIsCreatePhaseModalOpen(false)}
        onCreateCustomLevel={(params) => {
          persistence.handleCreateCustomLevel(params);
          setIsCreatePhaseModalOpen(false);
          setHubView('editor');
        }}
        onImportPNGFiles={(files) => {
          biomeManager.handleGlobalPNGUpload({ target: { files } } as any);
          setIsCreatePhaseModalOpen(false);
        }}
      />
    </div>
  );
}
