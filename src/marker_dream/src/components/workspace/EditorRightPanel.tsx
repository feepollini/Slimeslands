import React, { useState, useEffect } from 'react';
import { Layers, MapPin, Smartphone, Pause, Play, Zap } from 'lucide-react';
import { MotionCanvasLayersPanel } from '../MotionCanvasLayersPanel';
import { MarkerStudio } from '../MarkerStudio';
import { MarkerLayersStudio } from '../MarkerLayersStudio';
import { PortraitEmulator } from '../PortraitEmulator';
import type { MapProject, SavedLevel, MapMarker, GalleryAsset, MarkerMotionLayer, ActiveTool, TabId } from '../../types/map';
import type { EffectType } from '../../utils/motionCanvasEngine';

export interface EditorRightPanelProps {
  activeTab: string;
  motionRightView: 'layers' | 'emulator';
  setMotionRightView: (v: 'layers' | 'emulator') => void;
  canvasRightView: 'emulator' | 'markers' | 'layers' | 'split';
  setCanvasRightView: (v: 'emulator' | 'markers' | 'layers' | 'split') => void;
  motionCanvasLayers: MarkerMotionLayer[];
  motionCanvasActiveLayerId: string | null;
  setMotionCanvasActiveLayerId: (id: string | null) => void;
  setMotionCanvasLayers: React.Dispatch<React.SetStateAction<MarkerMotionLayer[]>>;
  handleReplaceBaseAssetPng: (newPngUrl: string) => void;
  handleSaveMotionCanvas: () => void;
  project: MapProject;
  setProject: React.Dispatch<React.SetStateAction<MapProject>>;
  savedLevels: SavedLevel[];
  selectedMarkerId: string | null;
  setSelectedMarkerId: (id: string | null) => void;
  setMotionCanvasMarkerId: (id: string | null) => void;
  handleUpdateMarker: (id: string, updates: Partial<MapMarker>) => void;
  handleDeleteMarker: (id: string) => void;
  setScrollTargetY: (y: number | null) => void;
  setSyncScrollTargetY: (val: { y: number; id: number } | null) => void;
  switchCanvasLevel: (level: SavedLevel) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setActiveTab: (tab: TabId) => void;
  handleDropMarkerAsset: (asset: GalleryAsset, pos: { rawX: number; rawY: number }) => void;
  currentScrollY: number;
  canvasView: 'vertical' | 'extended';
  handleLoadLevel: (level: SavedLevel) => void;
  globalUploadRef: React.RefObject<HTMLInputElement | null>;
  syncScrollTargetY: { y: number; id: number } | null;
  scrollTargetY: number | null;
  testDialogueMarkerId: string | null;
  setTestDialogueMarkerId: (id: string | null) => void;
  handleUpdatePlayer: (updates: any) => void;
  activeTool: ActiveTool;
  handleAddMotionMarker: (info: any) => void;
  motionBrushSize: number;
  motionAuto: boolean;
  motionEffect: EffectType;
  motionSpeed: number;
  motionIntensity: number;
  testSpawnTriggerId: number | null;
}

export const EditorRightPanel: React.FC<EditorRightPanelProps> = ({
  activeTab,
  motionRightView,
  setMotionRightView,
  canvasRightView,
  setCanvasRightView,
  motionCanvasLayers,
  motionCanvasActiveLayerId,
  setMotionCanvasActiveLayerId,
  setMotionCanvasLayers,
  handleReplaceBaseAssetPng,
  handleSaveMotionCanvas,
  project,
  setProject,
  savedLevels,
  selectedMarkerId,
  setSelectedMarkerId,
  setMotionCanvasMarkerId,
  handleUpdateMarker,
  handleDeleteMarker,
  setScrollTargetY,
  setSyncScrollTargetY,
  switchCanvasLevel,
  setActiveTool,
  setActiveTab,
  handleDropMarkerAsset,
  currentScrollY,
  canvasView,
  handleLoadLevel,
  globalUploadRef,
  syncScrollTargetY,
  scrollTargetY,
  testDialogueMarkerId,
  setTestDialogueMarkerId,
  handleUpdatePlayer,
  activeTool,
  handleAddMotionMarker,
  motionBrushSize,
  motionAuto,
  motionEffect,
  motionSpeed,
  motionIntensity,
  testSpawnTriggerId,
}) => {
  const [isEmulatorHibernating, setIsEmulatorHibernating] = useState(false);
  const [emulatorOrientation, setEmulatorOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Sincroniza orientação do emulador quando o usuário alterna entre HUD Retrato e HUD Paisagem na aba Telas
  useEffect(() => {
    const activeScId = project.screensConfig?.activeScreenId;
    if (activeScId === 'screen_player_hud_landscape') {
      setEmulatorOrientation('landscape');
    } else if (activeScId === 'screen_player_hud' && activeTab === 'screens') {
      setEmulatorOrientation('portrait');
    }
  }, [project.screensConfig?.activeScreenId, activeTab]);

  // Acorda automaticamente o emulador quando o usuário dispara "Play Phase" / Teste de Spawn ou Teste de Diálogo
  useEffect(() => {
    if (testSpawnTriggerId || testDialogueMarkerId) {
      setIsEmulatorHibernating(false);
    }
  }, [testSpawnTriggerId, testDialogueMarkerId]);

  const renderHibernatingPlaceholder = () => (
    <div
      className={`${
        emulatorOrientation === 'landscape' ? 'w-[720px] h-[420px]' : 'w-[360px] h-[680px]'
      } rounded-[38px] border-2 border-dashed border-zinc-800 bg-zinc-950/80 flex flex-col items-center justify-center p-6 text-center gap-4 my-auto shadow-inner`}
    >
      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
        <Zap className="w-6 h-6" />
      </div>
      <div className="space-y-1.5">
        <h4 className="text-sm font-bold text-white">Preview em Modo Economia (0% VRAM)</h4>
        <p className="text-xs text-zinc-400 leading-relaxed">
          O segundo canvas e os loops de 60 FPS do emulador estão pausados para dedicar 100% da GPU e memória à edição do mapa.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setIsEmulatorHibernating(false)}
        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer active:scale-95"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        <span>Reativar Emulador ao Vivo</span>
      </button>
    </div>
  );

  return (
    <>
      {activeTab === 'motion_canvas' && motionRightView === 'layers' ? (
        <div className="w-[420px] 2xl:w-[460px] bg-black border-l border-zinc-850 flex flex-col h-full shrink-0 shadow-2xl z-20 overflow-hidden select-none">
          {/* Barra superior de alternância rápida: Camadas vs Emulador */}
          <div className="flex items-center justify-between p-2.5 bg-zinc-950 border-b border-zinc-850 shrink-0">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-orange-400" />
              <span>Painel de Camadas</span>
            </span>
            <button
              type="button"
              onClick={() => setMotionRightView('emulator')}
              className="py-1 px-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[11px] font-medium border border-zinc-750 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Alternar para visualização do Emulador Mobile"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Ver Emulador</span>
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <MotionCanvasLayersPanel
              layers={motionCanvasLayers}
              activeLayerId={motionCanvasActiveLayerId}
              onSelectLayer={setMotionCanvasActiveLayerId}
              onUpdateLayers={setMotionCanvasLayers}
              onReplaceBaseAssetPng={handleReplaceBaseAssetPng}
              galleryAssets={project.galleryAssets || []}
              galleryCategories={project.galleryCategories || []}
              onTriggerSave={handleSaveMotionCanvas}
            />
          </div>
        </div>
      ) : (
        <div
          className={`p-3.5 bg-black border-l border-zinc-850 flex flex-col items-center justify-start overflow-y-auto shrink-0 shadow-2xl relative transition-all duration-200 select-none ${
            activeTab !== 'motion_canvas' &&
            (canvasRightView === 'split' ||
              (emulatorOrientation === 'landscape' && canvasRightView === 'emulator'))
              ? 'w-[840px] 2xl:w-[980px]'
              : (canvasRightView === 'layers' || canvasRightView === 'markers') && activeTab !== 'motion_canvas'
              ? 'w-[440px] 2xl:w-[480px]'
              : 'w-[600px] xl:w-[660px]'
          }`}
        >
          {activeTab === 'motion_canvas' ? (
            <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-zinc-850">
              <span className="text-xs font-semibold text-zinc-400">Emulador Mobile</span>
              <button
                type="button"
                onClick={() => setMotionRightView('layers')}
                className="py-1 px-2.5 rounded-md bg-zinc-900 border border-zinc-750 text-zinc-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 cursor-pointer hover:bg-zinc-800 transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Menu de Camadas</span>
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between pb-2 mb-2.5 border-b border-zinc-850 shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                {canvasRightView === 'emulator' && (
                  <>
                    <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                    <span>Emulador Mobile</span>
                  </>
                )}
                {canvasRightView === 'markers' && (
                  <>
                    <MapPin className="w-3.5 h-3.5 text-orange-400" />
                    <span>Editor de Marcador</span>
                  </>
                )}
                {canvasRightView === 'layers' && (
                  <>
                    <Layers className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Painel de Camadas</span>
                  </>
                )}
                {canvasRightView === 'split' && (
                  <>
                    <Layers className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Camadas & Emulador</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {(canvasRightView === 'emulator' || canvasRightView === 'split') && (
                  <button
                    type="button"
                    onClick={() => setIsEmulatorHibernating((prev) => !prev)}
                    className={`px-2 py-1 rounded-md border text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                      isEmulatorHibernating
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                    title={
                      isEmulatorHibernating
                        ? 'Reativar o Emulador Mobile ao vivo'
                        : 'Hibernar o segundo canvas do Emulador para economizar 100% da GPU/VRAM durante edições pesadas'
                    }
                  >
                    {isEmulatorHibernating ? (
                      <>
                        <Play className="w-3 h-3 fill-current text-amber-400" />
                        <span>Ativar Preview</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3 h-3 text-zinc-400" />
                        <span>Pausar GPU</span>
                      </>
                    )}
                  </button>
                )}

                <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-md border border-zinc-800 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setCanvasRightView('emulator')}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                      canvasRightView === 'emulator'
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Exibir somente o Emulador Mobile"
                  >
                    <Smartphone className="w-3 h-3 text-blue-400" />
                    <span>Emulador</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCanvasRightView('markers')}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                      canvasRightView === 'markers'
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Exibir o Editor de Marcadores"
                  >
                    <MapPin className="w-3 h-3 text-orange-400" />
                    <span>Marcador</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCanvasRightView('layers')}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                      canvasRightView === 'layers'
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Exibir o Painel de Camadas"
                  >
                    <Layers className="w-3 h-3 text-zinc-400" />
                    <span>Camadas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCanvasRightView('split')}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                      canvasRightView === 'split'
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Dividir entre Camadas e Emulador"
                  >
                    <span>Dividir</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo da coluna lateral direita: Apenas Marcador, Apenas Camadas, Apenas Emulador ou Dividido */}
          {activeTab !== 'motion_canvas' && canvasRightView === 'markers' ? (
            <div className="w-full flex-1 overflow-y-auto">
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
                onUpdateMarker={handleUpdateMarker}
                onDeleteMarker={handleDeleteMarker}
                onFocusMarker={(m) => {
                  setScrollTargetY(m.y);
                  setSyncScrollTargetY({ y: m.y, id: Date.now() });
                }}
                onOpenSavedMarker={(level, markerId) => {
                  switchCanvasLevel(level);
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
                  handleDropMarkerAsset(asset as any, { rawX: 384, rawY: currentScrollY + 300 });
                }}
              />
            </div>
          ) : activeTab !== 'motion_canvas' && canvasRightView === 'layers' ? (
            <div className="w-full flex-1 overflow-y-auto">
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
            </div>
          ) : activeTab !== 'motion_canvas' && canvasRightView === 'split' ? (
            <div
              className={`w-full flex-1 flex ${
                emulatorOrientation === 'landscape'
                  ? 'flex-col items-center gap-4 overflow-y-auto'
                  : 'items-start gap-4 overflow-hidden'
              }`}
            >
              {emulatorOrientation === 'landscape' ? (
                <>
                  <div className="w-full flex flex-col items-center justify-start shrink-0">
                    {isEmulatorHibernating ? (
                      renderHibernatingPlaceholder()
                    ) : (
                      <PortraitEmulator
                        project={project}
                        savedLevels={savedLevels}
                        activeTab={activeTab}
                        canvasView={canvasView}
                        onLoadLevel={handleLoadLevel}
                        activeMarkerId={selectedMarkerId}
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
                        onTriggerImportPNG={() => globalUploadRef.current?.click()}
                        scrollTargetY={syncScrollTargetY?.y ?? scrollTargetY}
                        testDialogueMarkerId={testDialogueMarkerId}
                        onCloseDialogue={() => setTestDialogueMarkerId(null)}
                        onUpdatePlayer={handleUpdatePlayer}
                        onUpdateMarker={handleUpdateMarker}
                        activeTool={activeTool}
                        onAddMotionMarkerAt={handleAddMotionMarker}
                        motionBrushSize={motionBrushSize}
                        motionAuto={motionAuto}
                        onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
                        motionEffect={motionEffect}
                        motionSpeed={motionSpeed}
                        motionIntensity={motionIntensity}
                        testSpawnTriggerId={testSpawnTriggerId}
                        orientation={emulatorOrientation}
                        onToggleOrientation={setEmulatorOrientation}
                      />
                    )}
                  </div>
                  <div className="w-full flex-1 min-h-[260px] border-t border-slate-800/80 pt-3">
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
                  </div>
                </>
              ) : (
                <>
                  <div className="w-[380px] 2xl:w-[440px] h-full flex flex-col overflow-y-auto pr-3 border-r border-slate-800/80 shrink-0">
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
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto h-full">
                    {isEmulatorHibernating ? (
                      renderHibernatingPlaceholder()
                    ) : (
                      <PortraitEmulator
                        project={project}
                        savedLevels={savedLevels}
                        activeTab={activeTab}
                        canvasView={canvasView}
                        onLoadLevel={handleLoadLevel}
                        activeMarkerId={selectedMarkerId}
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
                        onTriggerImportPNG={() => globalUploadRef.current?.click()}
                        scrollTargetY={syncScrollTargetY?.y ?? scrollTargetY}
                        testDialogueMarkerId={testDialogueMarkerId}
                        onCloseDialogue={() => setTestDialogueMarkerId(null)}
                        onUpdatePlayer={handleUpdatePlayer}
                        onUpdateMarker={handleUpdateMarker}
                        activeTool={activeTool}
                        onAddMotionMarkerAt={handleAddMotionMarker}
                        motionBrushSize={motionBrushSize}
                        motionAuto={motionAuto}
                        onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
                        motionEffect={motionEffect}
                        motionSpeed={motionSpeed}
                        motionIntensity={motionIntensity}
                        testSpawnTriggerId={testSpawnTriggerId}
                        orientation={emulatorOrientation}
                        onToggleOrientation={setEmulatorOrientation}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          ) : isEmulatorHibernating && activeTab !== 'motion_canvas' ? (
            renderHibernatingPlaceholder()
          ) : (
            <PortraitEmulator
              project={project}
              savedLevels={savedLevels}
              activeTab={activeTab}
              canvasView={canvasView}
              onLoadLevel={handleLoadLevel}
              activeMarkerId={selectedMarkerId}
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
              onTriggerImportPNG={() => globalUploadRef.current?.click()}
              scrollTargetY={syncScrollTargetY?.y ?? scrollTargetY}
              testDialogueMarkerId={testDialogueMarkerId}
              onCloseDialogue={() => setTestDialogueMarkerId(null)}
              onUpdatePlayer={handleUpdatePlayer}
              onUpdateMarker={handleUpdateMarker}
              activeTool={activeTool}
              onAddMotionMarkerAt={handleAddMotionMarker}
              motionBrushSize={motionBrushSize}
              motionAuto={motionAuto}
              onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
              motionEffect={motionEffect}
              motionSpeed={motionSpeed}
              motionIntensity={motionIntensity}
              testSpawnTriggerId={testSpawnTriggerId}
              orientation={emulatorOrientation}
              onToggleOrientation={setEmulatorOrientation}
            />
          )}
        </div>
      )}
    </>
  );
};
