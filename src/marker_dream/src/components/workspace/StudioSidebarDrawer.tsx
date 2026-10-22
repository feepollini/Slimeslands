import React, { useState } from 'react';
import type {
  MapProject,
  SavedLevel,
  TabId,
  ActiveTool,
  MarkerMotionLayer,
  LimitsBrushMode,
  MapMarker,
  GalleryAsset,
} from '../../types/map';
import type { BrushMode, ExtractionAction } from '../MotionBrushStudio';
import type { EffectType } from '../../utils/motionCanvasEngine';

import { ScreensStudio } from '../screens/ScreensStudio';
import { AssetGalleryStudio } from '../AssetGalleryStudio';
import { MarkerPenStudio } from '../MarkerPenStudio';
import { TerrainPenStudio } from '../terrainPen/TerrainPenStudio';
import { MarkerLayersStudio } from '../MarkerLayersStudio';
import { LevelGalleryStudio } from '../LevelGalleryStudio';
import { BiomeStudio } from '../BiomeStudio';
import { SubBiomeStudio } from '../SubBiomeStudio';
import { AtmosphereStudio } from '../AtmosphereStudio';
import { MarkerStudio } from '../MarkerStudio';
import { LimitsStudio } from '../LimitsStudio';
import { MotionStudio } from '../MotionStudio';
import { EffectStudio } from '../EffectStudio';
import { PlayerStudio } from '../PlayerStudio';
import { PetStudio } from '../PetStudio';
import { SpawnStudio } from '../SpawnStudio';
import { DialogueInteractionStudio } from '../DialogueInteractionStudio';
import { StampStudio } from '../StampStudio';
import { MotionCanvasStudio } from '../MotionCanvasStudio';
import { EventGalleryStudio } from '../EventGalleryStudio';
import { PhaseMapLocationsStudio } from './PhaseMapLocationsStudio';
import { QuestEditorStudio } from '../quests/QuestEditorStudio';
import { applyCharacterToPhase } from '../../utils/characterHelpers';

interface StudioSidebarDrawerProps {
  activeTab: TabId;
  onClose: () => void;
  project: MapProject;
  setProject: React.Dispatch<React.SetStateAction<MapProject>>;
  savedLevels: SavedLevel[];
  activeLevelId: string | null;
  onOpenSoloMapEditor?: () => void;
  onOpenCharactersEditor?: () => void;
  onOpenInventoryEditor?: () => void;
  onOpenQuestsEditor?: () => void;
  hasUnsavedChanges: boolean;
  onSaveCurrentAsLevel: () => void;
  onUpdateSavedLevel: (id: string, updates: Partial<SavedLevel>) => void;
  onOverwriteSavedLevel: (id: string) => void;
  onLoadLevel: (level: SavedLevel) => void;
  onDuplicateLevel: (level: SavedLevel) => void;
  onDeleteLevel: (id: string) => void;
  onCreateNewEmptyLevel: () => void;
  selectedMarkerId: string | null;
  setSelectedMarkerId: (id: string | null) => void;
  setActiveTab: (tab: TabId) => void;
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  setCanvasRightView: (view: any) => void;
  currentScrollY: number;
  setScrollTargetY: (y: number) => void;
  setSyncScrollTargetY: (target: { y: number; id: number }) => void;
  showToast: (msg: string) => void;
  // Biome Handlers
  onUpdateBiome: (id: string, updates: any) => void;
  onAddBiomeFromPNG: (tilePng: string, name: string, w: number, h: number, baseColor?: string) => void;
  onRemoveBiome: (id: string) => void;
  onMoveBiome: (index: number, direction: 'up' | 'down') => void;
  onAddSubBiome: (dataUrl: string, name: string, w: number, h: number) => void;
  onUpdateSubBiome: (id: string, updates: any) => void;
  onRemoveSubBiome: (id: string) => void;
  canvasView: 'vertical' | 'extended';
  // Marker Handlers
  onAddMarkerAt: (x: number, y: number, biomeId: string) => void;
  onUpdateMarker: (id: string, updates: Partial<MapMarker>) => void;
  onDeleteMarker: (id: string) => void;
  onDropMarkerAsset: (asset: any, coords: { rawX: number; rawY: number }) => void;
  // Limits Handlers
  limitsBrushMode: LimitsBrushMode;
  setLimitsBrushMode: (mode: LimitsBrushMode) => void;
  limitsBrushSize: number;
  setLimitsBrushSize: (size: number) => void;
  limitsMirror: boolean;
  setLimitsMirror: (m: boolean) => void;
  // Motion Pen Handlers
  motionBrushSize: number;
  setMotionBrushSize: (size: number) => void;
  motionAuto: boolean;
  setMotionAuto: (auto: boolean) => void;
  motionEffect: EffectType;
  setMotionEffect: (eff: EffectType) => void;
  motionSpeed: number;
  setMotionSpeed: (spd: number) => void;
  motionIntensity: number;
  setMotionIntensity: (int: number) => void;
  motionApiRef: React.RefObject<any>;
  // Effect Pen Handlers
  effectBrushSize: number;
  setEffectBrushSize: (size: number) => void;
  effectType: any;
  setEffectType: (type: any) => void;
  effectSpeed: number;
  setEffectSpeed: (spd: number) => void;
  effectIntensity: number;
  setEffectIntensity: (int: number) => void;
  effectScale: number;
  setEffectScale: (sc: number) => void;
  selectedOverlayId: string | null;
  setSelectedOverlayId: (id: string | null) => void;
  onUpdateOverlay: (id: string, updates: any) => void;
  onDeleteOverlay: (id: string) => void;
  onDuplicateOverlay: (id: string) => void;
  onMoveOverlayOrder: (id: string, direction: 'up' | 'down') => void;
  onClearAllOverlays: () => void;
  // Player Handlers
  onUpdatePlayer: (updates: any) => void;
  // Spawn Handlers
  setTestSpawnTriggerId: (id: number) => void;
  // Dialogue Handlers
  setTestDialogueMarkerId: (id: string | null) => void;
  // Motion Canvas Studio
  motionCanvasMarkerId: string | null;
  setMotionCanvasMarkerId: (id: string | null) => void;
  motionCanvasActiveLayerId: string | null;
  setMotionCanvasActiveLayerId: (id: string | null) => void;
  motionCanvasLayers: MarkerMotionLayer[];
  setMotionCanvasLayers: React.Dispatch<React.SetStateAction<MarkerMotionLayer[]>>;
  motionCanvasBrushSize: number;
  setMotionCanvasBrushSize: (size: number) => void;
  motionCanvasBrushMode: BrushMode;
  setMotionCanvasBrushMode: (mode: BrushMode) => void;
  motionCanvasSmoothLevel: number;
  setMotionCanvasSmoothLevel: (lvl: number) => void;
  motionCanvasActiveTool: any;
  setMotionCanvasActiveTool: (tool: any) => void;
  isPrimordialJelly: boolean;
  setIsPrimordialJelly: React.Dispatch<React.SetStateAction<boolean>>;
  onReplaceBaseAssetPng: (png: string) => void;
  motionCanvasExtractionAction: ExtractionAction;
  setMotionCanvasExtractionAction: (act: ExtractionAction) => void;
  motionCanvasAutoExtract: boolean;
  setMotionCanvasAutoExtract: (auto: boolean) => void;
  onSaveMotionCanvas: () => void;
  onLoadMotionComposition: (asset: GalleryAsset) => void;
}

export const StudioSidebarDrawer: React.FC<StudioSidebarDrawerProps> = ({
  activeTab,
  onClose,
  project,
  setProject,
  savedLevels,
  activeLevelId,
  onOpenSoloMapEditor,
  onOpenCharactersEditor,
  onOpenInventoryEditor,
  onOpenQuestsEditor,
  hasUnsavedChanges,
  onSaveCurrentAsLevel,
  onUpdateSavedLevel,
  onOverwriteSavedLevel,
  onLoadLevel,
  onDuplicateLevel,
  onDeleteLevel,
  onCreateNewEmptyLevel,
  selectedMarkerId,
  setSelectedMarkerId,
  setActiveTab,
  activeTool,
  setActiveTool,
  setCanvasRightView,
  currentScrollY,
  setScrollTargetY,
  setSyncScrollTargetY,
  showToast,
  onUpdateBiome,
  onAddBiomeFromPNG,
  onRemoveBiome,
  onMoveBiome,
  onAddSubBiome,
  onUpdateSubBiome,
  onRemoveSubBiome,
  canvasView,
  onAddMarkerAt,
  onUpdateMarker,
  onDeleteMarker,
  onDropMarkerAsset,
  limitsBrushMode,
  setLimitsBrushMode,
  limitsBrushSize,
  setLimitsBrushSize,
  limitsMirror,
  setLimitsMirror,
  motionBrushSize,
  setMotionBrushSize,
  motionAuto,
  setMotionAuto,
  motionEffect,
  setMotionEffect,
  motionSpeed,
  setMotionSpeed,
  motionIntensity,
  setMotionIntensity,
  motionApiRef,
  effectBrushSize,
  setEffectBrushSize,
  effectType,
  setEffectType,
  effectSpeed,
  setEffectSpeed,
  effectIntensity,
  setEffectIntensity,
  effectScale,
  setEffectScale,
  selectedOverlayId,
  setSelectedOverlayId,
  onUpdateOverlay,
  onDeleteOverlay,
  onDuplicateOverlay,
  onMoveOverlayOrder,
  onClearAllOverlays,
  onUpdatePlayer,
  setTestSpawnTriggerId,
  setTestDialogueMarkerId,
  motionCanvasMarkerId,
  setMotionCanvasMarkerId,
  motionCanvasActiveLayerId,
  setMotionCanvasActiveLayerId,
  motionCanvasLayers,
  setMotionCanvasLayers,
  motionCanvasBrushSize,
  setMotionCanvasBrushSize,
  motionCanvasBrushMode,
  setMotionCanvasBrushMode,
  motionCanvasSmoothLevel,
  setMotionCanvasSmoothLevel,
  motionCanvasActiveTool,
  setMotionCanvasActiveTool,
  isPrimordialJelly,
  setIsPrimordialJelly,
  onReplaceBaseAssetPng,
  motionCanvasExtractionAction,
  setMotionCanvasExtractionAction,
  motionCanvasAutoExtract,
  setMotionCanvasAutoExtract,
  onSaveMotionCanvas,
  onLoadMotionComposition,
}) => {
  if (activeTab === 'editor') return null;

  const isTerrainTab = activeTab === 'biomes' || activeTab === 'extended' || (activeTab as string) === 'terreno';

  return (
    <div
      className={`${
        activeTab === 'quests'
          ? 'w-[760px] 2xl:w-[920px]'
          : 'w-[420px] xl:w-[460px] 2xl:w-[500px]'
      } shrink-0 self-stretch border-r border-zinc-850 bg-black/95 p-5 overflow-y-auto select-none z-20`}
    >
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-850">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
            {activeTab === 'map' && 'Destinos & Localizações do Mapa (Overworld)'}
            {activeTab === 'screens' && 'Gestão de Telas & HUD (Interface do Jogo)'}
            {activeTab === 'quests' && 'Editor Espelhado de Quests na Fase (V2)'}
            {activeTab === 'spawn' && 'Spawn Studio (Sistema de Spawn Cinemático)'}
            {activeTab === 'events' && 'Galeria de Eventos (Cenas, Gatilhos & Atmosfera)'}
            {activeTab === 'assets' && 'Galeria de Assets (Acervo)'}
            {activeTab === 'marker_pen' && 'Marker Pen Studio (Pincel)'}
            {activeTab === 'layers' && 'Camadas de Marcadores (Layers)'}
            {activeTab === 'levels' && 'Galeria de Fases'}
            {isTerrainTab && (canvasView === 'extended' ? 'Extended Biomes (Terreno Livre)' : 'Gestão de Terreno (Biomas)')}
            {activeTab === 'markers' && 'Marcadores & Pontos'}
            {activeTab === 'limits' && 'Definição de Limites & Colisão'}
            {activeTab === 'motion' && 'Motion Pen & Recortes'}
            {activeTab === 'effect' && 'Effect Pen Studio (Efeitos Visuais & VFX)'}
            {activeTab === 'player' && 'Configuração do Jogador'}
            {activeTab === 'pets' && 'Estúdio Dedicado de Pets, Cartas & Deck (3 Slots)'}
            {activeTab === 'dialogue' && 'Cena de Diálogo & RPG'}
            {activeTab === 'stamp' && 'Pincel de Carimbo de Chão'}
            {activeTab === 'terrain_pen' && 'Pen Terrain Studio (Pincel de Terreno Vivo)'}
            {activeTab === 'motion_canvas' && 'Motion Canvas (Estúdio de Animação)'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'quests' && onOpenQuestsEditor && (
            <button
              type="button"
              onClick={onOpenQuestsEditor}
              className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white cursor-pointer"
            >
              ↗ Abrir Editor de Quests Independente (Tela Cheia)
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 px-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
          >
            ✕ Fechar
          </button>
        </div>
      </div>

      {activeTab === 'quests' && (
        <div className="h-[calc(100vh-180px)] rounded-xl overflow-hidden border border-zinc-800">
          <QuestEditorStudio
            project={project}
            onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
            mode="phase_mirror"
            selectedPhaseMarker={
              selectedMarkerId
                ? project.markers.find((m) => m.id === selectedMarkerId) || null
                : null
            }
            onSelectPhaseMarker={(mId) => setSelectedMarkerId(mId)}
            showToast={showToast}
          />
        </div>
      )}

      {activeTab === 'screens' && (
        <ScreensStudio
          project={project}
          onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
          galleryAssets={project.galleryAssets || []}
          onOpenGallery={() => setActiveTab('assets')}
          onTestDialogue={(mId: string) => {
            const m = project.markers.find((mk) => mk.id === mId);
            if (m) {
              setSelectedMarkerId(m.id);
              setCanvasRightView('emulator');
            }
          }}
          onSaveLevel={onSaveCurrentAsLevel}
          showToast={showToast}
        />
      )}

      {activeTab === 'assets' && (
        <AssetGalleryStudio
          project={project}
          onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
          onAddMarkerAt={(x, y, biomeId) => onAddMarkerAt(x, y, biomeId)}
          currentScrollY={currentScrollY}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          onSelectMarker={(markerId) => {
            setSelectedMarkerId(markerId);
            if (markerId) {
              setCanvasRightView('markers');
            }
          }}
          onOpenMarkerPen={() => {
            setActiveTab('marker_pen');
            setActiveTool('marker_pen');
          }}
          onOpenLayers={() => setActiveTab('layers')}
          savedLevels={savedLevels}
          activeLevelId={activeLevelId}
        />
      )}

      {activeTab === 'marker_pen' && (
        <MarkerPenStudio
          project={project}
          onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          onOpenLayers={() => setActiveTab('layers')}
          onOpenGallery={() => setActiveTab('assets')}
        />
      )}

      {activeTab === 'terrain_pen' && (
        <TerrainPenStudio
          project={project}
          onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          onOpenLayers={() => setActiveTab('layers')}
        />
      )}

      {activeTab === 'layers' && (
        <MarkerLayersStudio
          project={project}
          onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
          selectedMarkerId={selectedMarkerId}
          onSelectMarker={(id) => {
            setSelectedMarkerId(id);
            if (id) {
              setMotionCanvasMarkerId(id);
              const found = project.markers.find((m) => m.id === id);
              if (found) {
                setScrollTargetY(found.y);
                setSyncScrollTargetY({ y: found.y, id: Date.now() });
              }
            }
          }}
          onOpenMarkerPen={() => {
            setActiveTab('marker_pen');
            setActiveTool('marker_pen');
          }}
        />
      )}

      {activeTab === 'levels' && (
        <LevelGalleryStudio
          currentProject={project}
          savedLevels={savedLevels}
          activeLevelId={activeLevelId}
          hasUnsavedChanges={hasUnsavedChanges}
          onSaveCurrentAsLevel={onSaveCurrentAsLevel}
          onUpdateSavedLevel={onUpdateSavedLevel}
          onOverwriteSavedLevel={onOverwriteSavedLevel}
          onLoadLevel={onLoadLevel}
          onDuplicateLevel={onDuplicateLevel}
          onDeleteLevel={onDeleteLevel}
          onCreateNewEmptyLevel={onCreateNewEmptyLevel}
        />
      )}

      {isTerrainTab && (
        canvasView === 'extended' || activeTab === 'extended' ? (
          <SubBiomeStudio
            subBiomes={project.subBiomes || []}
            markers={project.markers}
            onAddSubBiome={onAddSubBiome}
            onUpdateSubBiome={onUpdateSubBiome}
            onRemoveSubBiome={onRemoveSubBiome}
            onOpenLimitsTab={() => setActiveTab('limits')}
            galleryAssets={project.galleryAssets || []}
            galleryCategories={project.galleryCategories || []}
          />
        ) : (
          <BiomeStudio
            biomes={project.biomes}
            onUpdateBiome={onUpdateBiome}
            onAddBiomeFromPNG={onAddBiomeFromPNG}
            onRemoveBiome={onRemoveBiome}
            onMoveBiome={onMoveBiome}
            onOpenLimitsTab={() => setActiveTab('limits')}
          />
        )
      )}

      {activeTab === 'clouds' && (
        <AtmosphereStudio
          cloudConfig={project.clouds || { enabled: true, edgeOpacity: 0.8, centerTransparency: 0.1, speed: 16 }}
          onUpdateCloudConfig={(updates) => {
            setProject((prev) => ({
              ...prev,
              clouds: {
                ...(prev.clouds || { enabled: true, edgeOpacity: 0.8, centerTransparency: 0.1, speed: 16 }),
                ...updates,
              },
            }));
          }}
          fogConfig={project.fogConfig || { enabled: false, fogCount: 5, opacity: 0.22, speed: 32, tintColor: '#ffffff', groundLevelPercent: 60 }}
          onUpdateFogConfig={(updates) => {
            setProject((prev) => ({
              ...prev,
              fogConfig: {
                ...(prev.fogConfig || { enabled: false, fogCount: 5, opacity: 0.22, speed: 32, tintColor: '#ffffff', groundLevelPercent: 60 }),
                ...updates,
              },
            }));
          }}
          lightingConfig={project.lighting}
          onUpdateLightingConfig={(updates) => {
            setProject((prev) => ({
              ...prev,
              lighting: {
                ...(prev.lighting || {}),
                ...updates,
              },
            }));
          }}
          leavesConfig={project.leavesConfig}
          onUpdateLeavesConfig={(updates) => {
            setProject((prev) => ({
              ...prev,
              leavesConfig: {
                ...(prev.leavesConfig || { enabled: false, baseSize: 36, randomScalePercent: 60, leafCount: 24, speed: 4.2, opacity: 0.95 }),
                ...updates,
              },
            }));
          }}
          rainConfig={project.rainConfig}
          onUpdateRainConfig={(updates) => {
            setProject((prev) => ({
              ...prev,
              rainConfig: {
                ...(prev.rainConfig || { enabled: false, intensity: 42, splashCount: 24, splashSize: 26, speed: 0.5 }),
                ...updates,
              },
            }));
          }}
          windConfig={project.windConfig}
          onUpdateWindConfig={(updates) => {
            setProject((prev) => ({
              ...prev,
              windConfig: {
                ...(prev.windConfig || { enabled: false, gustCount: 7, speed: 4.5, curvature: 32, opacity: 0.38, color: '#ffffff' }),
                ...updates,
              },
            }));
          }}
          bugsConfig={project.bugsConfig}
          onUpdateBugsConfig={(updates) => {
            setProject((prev) => ({
              ...prev,
              bugsConfig: {
                ...(prev.bugsConfig || { enabled: false, preset: 'all', activeSpecies: ['fireflies', 'butterflies', 'flies'], bugCount: 22, size: 16, speed: 3.2, landOnPlayer: true, wingFlapSpeed: 0.08 }),
                ...updates,
              },
            }));
          }}
          antsConfig={project.antsConfig}
          onUpdateAntsConfig={(updates) => {
            setProject((prev) => ({
              ...prev,
              antsConfig: {
                ...(prev.antsConfig || { enabled: false, antCount: 42, soloCount: 14, leafScale: 1.7, leafChance: 0.60, size: 11, speed: 1.2, scatterRadius: 65 }),
                ...updates,
              },
            }));
          }}
          snowConfig={project.snowConfig}
          onUpdateSnowConfig={(updates) => {
            setProject((prev) => ({
              ...prev,
              snowConfig: {
                ...(prev.snowConfig || { enabled: false, density: 6, speed: 3.2, windDrift: 15, accumulateOnPlayer: true, accumulateOnGround: true, chromaticSparkle: true }),
                ...updates,
              },
            }));
          }}
          biomes={project.biomes}
          subBiomes={project.subBiomes || []}
          onUpdateBiome={onUpdateBiome}
          onUpdateSubBiome={onUpdateSubBiome}
          isExtended={canvasView === 'extended'}
        />
      )}

      {activeTab === 'markers' && (
        <MarkerStudio
          markers={project.markers}
          subBiomes={project.subBiomes || []}
          biomes={project.biomes}
          savedLevels={savedLevels}
          selectedMarkerId={selectedMarkerId}
          onSelectMarker={(id) => {
            setSelectedMarkerId(id);
            if (id) setMotionCanvasMarkerId(id);
          }}
          onUpdateMarker={onUpdateMarker}
          onDeleteMarker={onDeleteMarker}
          onFocusMarker={(m) => {
            setScrollTargetY(m.y);
            setSyncScrollTargetY({ y: m.y, id: Date.now() });
          }}
          onOpenSavedMarker={(level, markerId) => {
            onLoadLevel(level);
            setSelectedMarkerId(markerId);
            if (markerId) setMotionCanvasMarkerId(markerId);
          }}
          onTriggerAddMarkerMode={() => {
            setActiveTool('add_marker');
          }}
          onOpenDialogueTab={() => setActiveTab('dialogue')}
          savedDialogues={project.savedDialogues || []}
          markerLayers={project.markerLayers || []}
          activeMarkerLayerId={project.activeMarkerLayerId}
          onOpenLayersTab={() => setActiveTab('layers')}
          galleryAssets={project.galleryAssets || []}
          galleryCategories={project.galleryCategories || []}
          onUploadNewAsset={(newAsset) => {
            setProject((prev) => ({
              ...prev,
              galleryAssets: [newAsset, ...(prev.galleryAssets || [])],
            }));
          }}
          onAddMarkerWithAsset={(asset) => {
            onDropMarkerAsset(asset, { rawX: 384, rawY: currentScrollY + 300 });
          }}
        />
      )}

      {activeTab === 'limits' && (
        <LimitsStudio
          project={project}
          subBiomes={project.subBiomes || []}
          onUpdateSubBiome={onUpdateSubBiome}
          limitsBrushMode={limitsBrushMode}
          onUpdateLimitsBrushMode={setLimitsBrushMode}
          limitsBrushSize={limitsBrushSize}
          onUpdateLimitsBrushSize={setLimitsBrushSize}
          mirrorLimits={limitsMirror}
          onUpdateMirrorLimits={setLimitsMirror}
          canvasKind={(project.canvasKind || 'vertical') as 'vertical' | 'extended'}
          onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
          onSwitchToEditorTab={() => setActiveTab('editor')}
        />
      )}

      {activeTab === 'motion' && (
        <MotionStudio
          motionBrushSize={motionBrushSize}
          onMotionBrushSize={setMotionBrushSize}
          motionAuto={motionAuto}
          onMotionAuto={setMotionAuto}
          motionEffect={
            (() => {
              const sm = project.markers.find((m) => m.id === selectedMarkerId);
              return (sm?.effect as EffectType) || motionEffect;
            })()
          }
          onMotionEffect={(newEff) => {
            setMotionEffect(newEff);
            if (selectedMarkerId) {
              const sm = project.markers.find((m) => m.id === selectedMarkerId);
              onUpdateMarker(selectedMarkerId, {
                effect: newEff,
                npcBounce: newEff === 'jelly' ? true : (sm?.type === 'npc' ? (sm.npcBounce !== false) : false),
                effectSpeed: motionSpeed,
                effectIntensity: motionIntensity,
              });
            }
          }}
          motionSpeed={
            (() => {
              const sm = project.markers.find((m) => m.id === selectedMarkerId);
              return sm?.effectSpeed ?? motionSpeed;
            })()
          }
          onMotionSpeed={(newSpd) => {
            setMotionSpeed(newSpd);
            if (selectedMarkerId) {
              onUpdateMarker(selectedMarkerId, { effectSpeed: newSpd });
            }
          }}
          motionIntensity={
            (() => {
              const sm = project.markers.find((m) => m.id === selectedMarkerId);
              return sm?.effectIntensity ?? motionIntensity;
            })()
          }
          onMotionIntensity={(newInt) => {
            setMotionIntensity(newInt);
            if (selectedMarkerId) {
              onUpdateMarker(selectedMarkerId, { effectIntensity: newInt });
            }
          }}
          onMotionExtract={() => motionApiRef.current?.extract()}
          onMotionClear={() => motionApiRef.current?.clear()}
          selectedMarker={project.markers.find((m) => m.id === selectedMarkerId) || null}
          onUpdateMarker={onUpdateMarker}
          markers={project.markers}
          onSelectMarker={(id) => {
            setSelectedMarkerId(id);
            if (id) setMotionCanvasMarkerId(id);
          }}
          onDeleteMarker={onDeleteMarker}
          onFocusMarker={(m: MapMarker) => {
            setScrollTargetY(m.y);
            setSyncScrollTargetY({ y: m.y, id: Date.now() });
          }}
        />
      )}

      {activeTab === 'effect' && (
        <EffectStudio
          effectBrushSize={effectBrushSize}
          onEffectBrushSize={setEffectBrushSize}
          effectType={effectType}
          onEffectType={setEffectType}
          effectSpeed={effectSpeed}
          onEffectSpeed={setEffectSpeed}
          effectIntensity={effectIntensity}
          onEffectIntensity={setEffectIntensity}
          effectScale={effectScale}
          onEffectScale={setEffectScale}
          overlays={project.motionOverlays || []}
          selectedOverlayId={selectedOverlayId}
          onSelectOverlay={setSelectedOverlayId}
          onUpdateOverlay={onUpdateOverlay}
          onDeleteOverlay={onDeleteOverlay}
          onDuplicateOverlay={onDuplicateOverlay}
          onMoveOverlayOrder={onMoveOverlayOrder}
          onClearAllOverlays={onClearAllOverlays}
        />
      )}

      {activeTab === 'player' && (
        <PlayerStudio
          player={project.player || { id: 'p1', name: 'Herói', x: 384, y: 100, color: '#3b82f6', speed: 4 }}
          project={project}
          onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
          onUpdatePlayer={onUpdatePlayer}
          onApplyCharacter={(char) => setProject((prev) => applyCharacterToPhase(char, prev, true))}
          onOpenCharactersEditor={onOpenCharactersEditor}
          onOpenInventoryEditor={onOpenInventoryEditor}
          onOpenPetStudio={() => setActiveTab('pets')}
          showToast={showToast}
          onCenterCameraOnPlayer={() => {
            const pY = project.player?.y || 100;
            setScrollTargetY(pY);
            setSyncScrollTargetY({ y: pY, id: Date.now() });
          }}
          galleryAssets={project.galleryAssets || []}
          galleryCategories={project.galleryCategories || []}
          onUploadNewAsset={(newAsset) => {
            setProject((prev) => ({
              ...prev,
              galleryAssets: [newAsset, ...(prev.galleryAssets || [])],
            }));
          }}
        />
      )}

      {activeTab === 'pets' && (
        <PetStudio
          player={project.player || { id: 'p1', name: 'Herói', x: 384, y: 100, color: '#3b82f6', speed: 4 }}
          project={project}
          onUpdatePlayer={onUpdatePlayer}
          showToast={showToast}
          galleryAssets={project.galleryAssets || []}
          galleryCategories={project.galleryCategories || []}
          onUploadNewAsset={(newAsset) => {
            setProject((prev) => ({
              ...prev,
              galleryAssets: [newAsset, ...(prev.galleryAssets || [])],
            }));
          }}
        />
      )}

      {activeTab === 'spawn' && (
        <SpawnStudio
          spawnConfig={project.spawnConfig}
          onUpdateSpawnConfig={(newConfig) => {
            setProject((prev) => ({ ...prev, spawnConfig: newConfig }));
          }}
          markers={project.markers}
          player={project.player}
          galleryAssets={project.galleryAssets || []}
          galleryCategories={project.galleryCategories || []}
          onClose={() => setActiveTab('editor')}
          onFocusCoordinates={(x, y) => {
            setScrollTargetY(y);
            setSyncScrollTargetY({ y, id: Date.now() });
          }}
          onTestSpawnAnimation={() => {
            const tgtY = project.spawnConfig?.targetY || project.player?.y || 100;
            setScrollTargetY(tgtY);
            setSyncScrollTargetY({ y: tgtY, id: Date.now() });
            setTestSpawnTriggerId(Date.now());
          }}
        />
      )}

      {activeTab === 'dialogue' && (
        <DialogueInteractionStudio
          markers={project.markers}
          selectedMarkerId={selectedMarkerId}
          onSelectMarker={(id) => {
            setSelectedMarkerId(id);
            if (id) setMotionCanvasMarkerId(id);
          }}
          onUpdateMarker={onUpdateMarker}
          savedDialogues={project.savedDialogues || []}
          onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
          onTestDialogue={(marker) => {
            setSelectedMarkerId(marker.id);
            setTestDialogueMarkerId(marker.id);
            setScrollTargetY(marker.y);
            setSyncScrollTargetY({ y: marker.y, id: Date.now() });
          }}
        />
      )}

      {activeTab === 'stamp' && (
        <StampStudio
          brushConfig={
            project.stampBrushConfig || {
              pngUrl: null,
              size: 52,
              feather: 14,
              spacing: 36,
              randomRotation: true,
              randomMirror: true,
              opacity: 0.9,
              activeLayerId: 'layer-ground-1',
            }
          }
          onUpdateBrushConfig={(updates) => {
            setProject((prev) => ({
              ...prev,
              stampBrushConfig: {
                ...(prev.stampBrushConfig || {
                  pngUrl: null,
                  size: 52,
                  feather: 14,
                  spacing: 36,
                  randomRotation: true,
                  randomMirror: true,
                  opacity: 0.9,
                  activeLayerId: 'layer-ground-1',
                }),
                ...updates,
              },
            }));
          }}
          layers={
            project.stampLayers && project.stampLayers.length > 0
              ? project.stampLayers
              : [
                  { id: 'layer-ground-1', name: 'Chão Base', visible: true, opacity: 1 },
                  { id: 'layer-ground-2', name: 'Sobrechão / Vegetação', visible: true, opacity: 1 },
                ]
          }
          onUpdateLayers={(newLayers) => {
            setProject((prev) => ({
              ...prev,
              stampLayers: newLayers,
            }));
          }}
          stamps={project.groundStamps || []}
          onUpdateStamps={(newStamps) => {
            setProject((prev) => ({
              ...prev,
              groundStamps: newStamps,
            }));
          }}
          onClearActiveLayerStamps={() => {
            const activeId = project.stampBrushConfig?.activeLayerId || 'layer-ground-1';
            setProject((prev) => ({
              ...prev,
              groundStamps: (prev.groundStamps || []).filter((s) => s.layerId !== activeId),
            }));
            showToast('Camada de carimbos limpa!');
          }}
          onUndoLastStamp={() => {
            setProject((prev) => {
              const cur = prev.groundStamps || [];
              if (cur.length === 0) return prev;
              return {
                ...prev,
                groundStamps: cur.slice(0, cur.length - 1),
              };
            });
            showToast('Último carimbo desfeito!');
          }}
          galleryAssets={project.galleryAssets || []}
          categories={project.galleryCategories || []}
          onUploadNewAsset={(newAsset) => {
            setProject((prev) => ({
              ...prev,
              galleryAssets: [newAsset, ...(prev.galleryAssets || [])],
            }));
          }}
        />
      )}

      {activeTab === 'motion_canvas' && (
        <MotionCanvasStudio
          markers={project.markers}
          selectedMarkerId={selectedMarkerId || motionCanvasMarkerId}
          onSelectMarker={(id) => {
            setSelectedMarkerId(id);
            setMotionCanvasMarkerId(id);
          }}
          activeLayerId={motionCanvasActiveLayerId}
          onSelectLayer={setMotionCanvasActiveLayerId}
          layers={motionCanvasLayers}
          onUpdateLayers={(newLayers) => {
            setMotionCanvasLayers(newLayers);
          }}
          brushSize={motionCanvasBrushSize}
          onBrushSizeChange={setMotionCanvasBrushSize}
          brushMode={motionCanvasBrushMode}
          onBrushModeChange={setMotionCanvasBrushMode}
          smoothLevel={motionCanvasSmoothLevel}
          onSmoothLevelChange={setMotionCanvasSmoothLevel}
          activeTool={motionCanvasActiveTool}
          onActiveToolChange={setMotionCanvasActiveTool}
          isPrimordialJelly={isPrimordialJelly}
          onTogglePrimordialJelly={() => setIsPrimordialJelly((v) => !v)}
          onReplaceBaseAssetPng={onReplaceBaseAssetPng}
          extractionAction={motionCanvasExtractionAction}
          onExtractionActionChange={setMotionCanvasExtractionAction}
          autoExtract={motionCanvasAutoExtract}
          onAutoExtractChange={setMotionCanvasAutoExtract}
          onClearActiveLayerStrokes={() => {
            setMotionCanvasLayers((prev) => {
              const activeId = motionCanvasActiveLayerId || prev[0]?.id;
              return prev.map((l) =>
                l.id === activeId ? { ...l, strokes: [] } : l
              );
            });
            showToast('Traços da camada limpos!');
          }}
          onSaveToMarker={onSaveMotionCanvas}
          galleryAssets={project.galleryAssets || []}
          galleryCategories={project.galleryCategories || []}
          onLoadMotionComposition={onLoadMotionComposition}
        />
      )}

      {activeTab === 'events' && (
        <EventGalleryStudio
          project={project}
          onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
          selectedMarkerId={selectedMarkerId}
          onSelectMarker={setSelectedMarkerId}
          onFocusMarker={(m) => {
            setScrollTargetY(m.y);
            setSyncScrollTargetY({ y: m.y, id: Date.now() });
          }}
        />
      )}

      {activeTab === 'map' && (
        <PhaseMapLocationsStudio
          project={project}
          setProject={setProject}
          activeLevelId={activeLevelId}
          savedLevels={savedLevels}
          onOpenSoloMapEditor={onOpenSoloMapEditor}
          onAddMarkerAt={(x, y, biomeId) => onAddMarkerAt(x, y, biomeId || '')}
          showToast={showToast}
        />
      )}
    </div>
  );
};
