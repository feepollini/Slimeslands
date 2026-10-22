import React from 'react';
import type {
  MapProject,
  ActiveTool,
  TabId,
  LimitsBrushMode,
  MarkerMotionLayer,
  GalleryAsset,
  MapMarker,
  MotionOverlayStroke,
  SavedLevel,
} from '../../types/map';
import type { BrushMode, ExtractionAction } from '../MotionBrushStudio';
import type { EffectType } from '../../utils/motionCanvasEngine';
import { MotionCanvasWorkspace } from '../MotionCanvasWorkspace';
import { VerticalMapCanvas } from '../VerticalMapCanvas';
import { MiniMap } from '../MiniMap';
import { MotionCanvasStartupModal } from '../modals/MotionCanvasStartupModal';
import { SaveMotionDecisionModal } from '../modals/SaveMotionDecisionModal';
import { AssetGalleryModal } from '../AssetGalleryModal';

export interface EditorCanvasViewportProps {
  activeTab: TabId;
  activeTool: ActiveTool;
  setActiveTab: (tab: TabId) => void;
  project: MapProject;
  setProject: React.Dispatch<React.SetStateAction<MapProject>>;
  onLoadLevel?: (level: SavedLevel) => void;
  canvasView: 'vertical' | 'extended';
  selectedMarkerId: string | null;
  setSelectedMarkerId: (id: string | null) => void;
  setMotionCanvasMarkerId: (id: string | null) => void;
  pushHistory: (proj: MapProject) => void;
  showToast: (msg: string) => void;

  // Motion Canvas Workspace Props
  motionCanvasMarkerId: string | null;
  motionCanvasActiveLayerId: string | null;
  setMotionCanvasActiveLayerId: (id: string | null) => void;
  motionCanvasLayers: MarkerMotionLayer[];
  setMotionCanvasLayers: React.Dispatch<React.SetStateAction<MarkerMotionLayer[]>>;
  motionCanvasBrushSize: number;
  motionCanvasBrushMode: BrushMode;
  setMotionCanvasBrushMode: (mode: BrushMode) => void;
  motionCanvasSmoothLevel: number;
  motionCanvasActiveTool: any;
  setMotionCanvasActiveTool: (tool: any) => void;
  isPrimordialJelly: boolean;
  setIsPrimordialJelly: React.Dispatch<React.SetStateAction<boolean>>;
  handleReplaceBaseAssetPng: (png: string) => void;
  motionCanvasExtractionAction: ExtractionAction;
  setMotionCanvasExtractionAction: (act: ExtractionAction) => void;
  motionCanvasAutoExtract: boolean;
  setMotionCanvasAutoExtract: (auto: boolean) => void;
  // Hub Guiado de Inicialização e Decisão de Salvamento do Motion Canvas
  isStartupModalOpen?: boolean;
  setIsStartupModalOpen?: (open: boolean) => void;
  isSaveDecisionModalOpen?: boolean;
  setIsSaveDecisionModalOpen?: (open: boolean) => void;
  isGalleryPickerOpen?: boolean;
  setIsGalleryPickerOpen?: (open: boolean) => void;
  isReeditionMode?: boolean;
  motionOriginMarkerId?: string | null;
  motionOriginAssetName?: string | null;
  saveSnapshotPreview?: string | null;
  candidateMarker?: MapMarker | null;
  handleConfirmSelectedMarker?: (marker: MapMarker) => void;
  handleStartFromScratch?: () => void;
  handleImportLocalPng?: (file: File) => void;
  handleLoadAssetFromGallery?: (dataUrl: string, assetName?: string, asset?: GalleryAsset) => void;
  handleExecuteSaveOverwrite?: () => void;
  handleExecuteSaveAsNew?: (newName: string) => void;
  savedLevels?: SavedLevel[];
  activeLevelId?: string | null;

  // Map Canvas & Limits Props
  limitsBrushMode: LimitsBrushMode;
  limitsBrushSize: number;
  limitsMirror: boolean;
  handleUpdateSubBiome: (id: string, updates: any) => void;
  handleAddMarkerAt: (x: number, y: number, biomeId: string) => void;
  handleAddSubBiomeMarkerAt: (subBiomeId: string, localX: number, localY: number) => void;
  handleAddMotionMarker: (info: any) => void;

  // Motion Pen & VFX Overlays
  motionBrushSize: number;
  motionAuto: boolean;
  motionEffect: EffectType;
  motionSpeed: number;
  motionIntensity: number;
  motionApiRef: React.RefObject<any>;
  effectBrushSize: number;
  effectType: string;
  effectSpeed: number;
  effectIntensity: number;
  effectScale: number;
  selectedOverlayId: string | null;
  setSelectedOverlayId: (id: string | null) => void;
  handleUpdateOverlay: (id: string, updates: Partial<MotionOverlayStroke>) => void;
  handleUpdateMarkerPos: (id: string, x: number, y: number) => void;
  handleUpdateMarker: (id: string, updates: Partial<MapMarker>) => void;
  handleDeleteMarker: (id: string) => void;
  handleDuplicateMarker: (id: string) => void;
  handleReorderMarker: (id: string, dir: 'up' | 'down') => void;

  // Zoom & Viewport Scroll
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  currentScrollY: number;
  setCurrentScrollY: (y: number) => void;
  currentViewportHeight: number;
  setCurrentViewportHeight: (h: number) => void;
  scrollTargetY: number | null;
  setScrollTargetY: (y: number | null) => void;
  syncScrollTargetY: { y: number; id: number } | null;
  setSyncScrollTargetY: (target: { y: number; id: number } | null) => void;

  // Import / Drop
  handleDropPNG: (dataUrl: string, name: string) => void;
  handleDropMarkerAsset: (asset: any, pos: { rawX: number; rawY: number }) => void;
  globalUploadRef: React.RefObject<HTMLInputElement | null>;
  onOpenCreateModal?: () => void;
}

export const EditorCanvasViewport: React.FC<EditorCanvasViewportProps> = ({
  activeTab,
  activeTool,
  setActiveTab,
  project,
  setProject,
  canvasView,
  selectedMarkerId,
  setSelectedMarkerId,
  setMotionCanvasMarkerId,
  pushHistory,
  showToast,
  motionCanvasMarkerId,
  motionCanvasActiveLayerId,
  setMotionCanvasActiveLayerId,
  motionCanvasLayers,
  setMotionCanvasLayers,
  motionCanvasBrushSize,
  motionCanvasBrushMode,
  setMotionCanvasBrushMode,
  motionCanvasSmoothLevel,
  motionCanvasActiveTool,
  setMotionCanvasActiveTool,
  isPrimordialJelly,
  setIsPrimordialJelly,
  handleReplaceBaseAssetPng,
  motionCanvasExtractionAction,
  setMotionCanvasExtractionAction,
  motionCanvasAutoExtract,
  setMotionCanvasAutoExtract,
  limitsBrushMode,
  limitsBrushSize,
  limitsMirror,
  handleUpdateSubBiome,
  handleAddMarkerAt,
  handleAddSubBiomeMarkerAt,
  handleAddMotionMarker,
  motionBrushSize,
  motionAuto,
  motionEffect,
  motionSpeed,
  motionIntensity,
  motionApiRef,
  effectBrushSize,
  effectType,
  effectSpeed,
  effectIntensity,
  effectScale,
  selectedOverlayId,
  setSelectedOverlayId,
  handleUpdateOverlay,
  handleUpdateMarkerPos,
  handleUpdateMarker,
  handleDeleteMarker,
  handleDuplicateMarker,
  handleReorderMarker,
  zoom,
  setZoom,
  currentScrollY,
  setCurrentScrollY,
  currentViewportHeight,
  setCurrentViewportHeight,
  scrollTargetY,
  setScrollTargetY,
  syncScrollTargetY,
  setSyncScrollTargetY,
  handleDropPNG,
  handleDropMarkerAsset,
  globalUploadRef,
  onOpenCreateModal,
  isStartupModalOpen,
  setIsStartupModalOpen,
  isSaveDecisionModalOpen,
  setIsSaveDecisionModalOpen,
  isGalleryPickerOpen,
  setIsGalleryPickerOpen,
  isReeditionMode,
  motionOriginMarkerId,
  motionOriginAssetName,
  saveSnapshotPreview,
  candidateMarker,
  handleConfirmSelectedMarker,
  handleStartFromScratch,
  handleImportLocalPng,
  handleLoadAssetFromGallery,
  handleExecuteSaveOverwrite,
  handleExecuteSaveAsNew,
  savedLevels,
  activeLevelId,
  onLoadLevel,
}) => {
  return (
    <div className="flex-1 relative flex overflow-hidden">
      {activeTab === 'motion_canvas' ? (
        <MotionCanvasWorkspace
          marker={project.markers.find((m) => m.id === (selectedMarkerId || motionCanvasMarkerId)) || null}
          activeLayer={motionCanvasLayers.find((l) => l.id === motionCanvasActiveLayerId) || motionCanvasLayers[0] || null}
          layers={motionCanvasLayers}
          brushSize={motionCanvasBrushSize}
          brushMode={motionCanvasBrushMode}
          onBrushModeChange={setMotionCanvasBrushMode}
          smoothLevel={motionCanvasSmoothLevel}
          activeTool={motionCanvasActiveTool}
          onActiveToolChange={setMotionCanvasActiveTool}
          isPrimordialJelly={isPrimordialJelly}
          onTogglePrimordialJelly={() => setIsPrimordialJelly((v) => !v)}
          onReplaceBaseAssetPng={handleReplaceBaseAssetPng}
          extractionAction={motionCanvasExtractionAction}
          onExtractionActionChange={setMotionCanvasExtractionAction}
          autoExtract={motionCanvasAutoExtract}
          onAutoExtractChange={setMotionCanvasAutoExtract}
          onOpenStartupHub={() => setIsStartupModalOpen?.(true)}
          onAddStroke={(stroke) => {
            setMotionCanvasLayers((prev) => {
              const activeId = motionCanvasActiveLayerId || prev[0]?.id;
              return prev.map((l) =>
                l.id === activeId ? { ...l, strokes: [...(l.strokes || []), stroke] } : l
              );
            });
          }}
          onUpdateActiveLayer={(updates) => {
            setMotionCanvasLayers((prev) => {
              const activeId = motionCanvasActiveLayerId || prev[0]?.id;
              return prev.map((l) =>
                l.id === activeId ? { ...l, ...updates } : l
              );
            });
          }}
          onCreateCutoutPiece={(newPiece) => {
            const pieceLayer: MarkerMotionLayer = { ...newPiece, isBaseAsset: false };
            setMotionCanvasLayers((prev) => [...prev, pieceLayer]);
            setMotionCanvasActiveLayerId(pieceLayer.id);
            setMotionCanvasActiveTool('move');
            showToast('✨ Pedaço recortado e criado como nova camada!');
          }}
          onSelectLayer={setMotionCanvasActiveLayerId}
          onSelectMarkerRequest={() => setActiveTab('motion_canvas')}
        />
      ) : (
        <>
          {/* The Main Scrolling Canvas */}
          <div className="flex-1 h-full relative">
            <VerticalMapCanvas
              project={project}
              activeTool={activeTool}
              activeTab={activeTab}
              canvasView={canvasView}
              limitsBrushMode={limitsBrushMode}
              limitsBrushSize={limitsBrushSize}
              mirrorLimits={limitsMirror}
              onDragStart={() => pushHistory(project)}
              onUpdateSubBiome={handleUpdateSubBiome}
              onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
              selectedMarkerId={selectedMarkerId}
              onSelectMarker={(id) => {
                setSelectedMarkerId(id);
                if (id) setMotionCanvasMarkerId(id);
                if (id && activeTab === 'editor') setActiveTab('markers');
              }}
              onAddMarkerAt={handleAddMarkerAt}
              onAddSubBiomeMarkerAt={handleAddSubBiomeMarkerAt}
              onAddMotionMarkerAt={handleAddMotionMarker}
              motionBrushSize={motionBrushSize}
              motionAuto={motionAuto}
              motionEffect={motionEffect}
              motionSpeed={motionSpeed}
              motionIntensity={motionIntensity}
              motionApiRef={motionApiRef}
              effectBrushSize={effectBrushSize}
              effectType={effectType}
              effectSpeed={effectSpeed}
              effectIntensity={effectIntensity}
              effectScale={effectScale}
              selectedOverlayId={selectedOverlayId}
              onSelectOverlay={setSelectedOverlayId}
              onUpdateOverlay={handleUpdateOverlay}
              onUpdateMarkerPos={handleUpdateMarkerPos}
              onUpdateMarker={handleUpdateMarker}
              onDeleteMarker={handleDeleteMarker}
              onDuplicateMarker={handleDuplicateMarker}
              onReorderMarker={handleReorderMarker}
              zoom={zoom}
              onScrollChange={(y, _, viewH) => {
                setCurrentScrollY(y);
                setCurrentViewportHeight(viewH);
              }}
              scrollTargetY={syncScrollTargetY?.y ?? scrollTargetY}
              onResetScrollTarget={() => {
                setScrollTargetY(null);
                setSyncScrollTargetY(null);
              }}
              onDropPNG={handleDropPNG}
              onDropMarkerAsset={handleDropMarkerAsset}
              onTriggerImportPNG={() => globalUploadRef.current?.click()}
              onTriggerCreatePhaseModal={onOpenCreateModal}
              onZoomIn={() => setZoom((z) => Math.min(3.0, z + 0.15))}
              onZoomOut={() => setZoom((z) => Math.max(0.15, z - 0.15))}
            />
          </div>

          {/* Minimap Radar Bar */}
          <div className="p-3 bg-black border-l border-zinc-850 flex items-center justify-center shrink-0">
            {canvasView === 'vertical' ? (
              <MiniMap
                project={project}
                scrollY={currentScrollY}
                viewportHeight={currentViewportHeight}
                onNavigateY={(targetY) => {
                  setScrollTargetY(targetY);
                  setSyncScrollTargetY({ y: targetY, id: Date.now() });
                }}
              />
            ) : (
              <div className="text-[9px] text-zinc-500 font-mono text-center leading-tight uppercase" style={{ writingMode: 'vertical-rl' }}>
                radar vertical
              </div>
            )}
          </div>
        </>
      )}

      {/* Hub Guiado de Inicialização e Confirmação de Objeto */}
      <MotionCanvasStartupModal
        isOpen={!!isStartupModalOpen}
        onClose={() => setIsStartupModalOpen?.(false)}
        candidateMarker={candidateMarker || null}
        onConfirmMarker={(marker) => handleConfirmSelectedMarker?.(marker)}
        onOpenGallery={() => {
          setIsStartupModalOpen?.(false);
          setIsGalleryPickerOpen?.(true);
        }}
        onImportLocalPng={(file) => handleImportLocalPng?.(file)}
        onStartFromScratch={() => handleStartFromScratch?.()}
        phaseMarkers={project.markers}
        onSelectOtherMarker={(marker) => handleConfirmSelectedMarker?.(marker)}
      />

      {/* Modal de Decisão ao Salvar: Sobrepor Original vs Salvar como Novo */}
      <SaveMotionDecisionModal
        isOpen={!!isSaveDecisionModalOpen}
        onClose={() => setIsSaveDecisionModalOpen?.(false)}
        originalName={motionOriginAssetName || 'Composição Motion'}
        layersCount={motionCanvasLayers.length}
        previewPngUrl={saveSnapshotPreview || motionCanvasLayers.find((l) => l.isBaseAsset)?.pngUrl}
        onSaveOverwrite={() => handleExecuteSaveOverwrite?.()}
        onSaveAsNew={(newName) => handleExecuteSaveAsNew?.(newName)}
      />

      {/* Galeria Aberta Diretamente pelo Hub do Motion Canvas */}
      <AssetGalleryModal
        isOpen={!!isGalleryPickerOpen}
        onClose={() => setIsGalleryPickerOpen?.(false)}
        onSelectAsset={(dataUrl, assetName, asset) => handleLoadAssetFromGallery?.(dataUrl, assetName, asset)}
        galleryAssets={project.galleryAssets || []}
        categories={project.galleryCategories || ['Geral']}
        savedLevels={savedLevels || []}
        activeLevelId={activeLevelId || null}
        title="Galeria para Motion Canvas"
        subtitle="Escolha um PNG da fase, compartilhado de outras fases ou Composição Motion para reedição"
      />
    </div>
  );
};
