import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  ChevronDown,
  Upload,
  Copy,
  ClipboardPaste,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Maximize2,
  Crosshair,
  Activity,
  Move,
  Scissors,
  Hand,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Image as ImageIcon,
  Brush,
  Eraser,
  Crown,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Link2,
  Unlink,
} from 'lucide-react';
import { MapMarker, MarkerMotionLayer, GalleryAsset } from '../types/map';
import {
  PHYSICS_MODES,
  PIVOT_PRESETS,
  PhysicsMode,
} from '../utils/motionPhysicsEngine';
import {
  MotionBrushStudio,
  BrushMode,
  ExtractionAction,
} from './MotionBrushStudio';
import { AssetGalleryModal } from './AssetGalleryModal';

export type MotionCanvasTool = 'move' | 'brush' | 'pivot' | 'pan';
export type StudioTab = 'layers' | 'draw' | 'physics' | 'gallery';

interface Props {
  markers: MapMarker[];
  selectedMarkerId: string | null;
  onSelectMarker: (id: string) => void;
  activeLayerId: string | null;
  onSelectLayer: (id: string) => void;
  layers: MarkerMotionLayer[];
  onUpdateLayers: (layers: MarkerMotionLayer[]) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  brushMode: BrushMode;
  onBrushModeChange: (mode: BrushMode) => void;
  smoothLevel: number;
  onSmoothLevelChange: (level: number) => void;
  activeTool: MotionCanvasTool;
  onActiveToolChange: (tool: MotionCanvasTool) => void;
  onClearActiveLayerStrokes: () => void;
  onSaveToMarker: () => void;
  onReplaceBaseAssetPng?: (newPngUrl: string) => void;
  onFocusMarkerOnMap?: (m: MapMarker) => void;
  isPrimordialJelly?: boolean;
  onTogglePrimordialJelly?: () => void;
  extractionAction?: ExtractionAction;
  onExtractionActionChange?: (action: ExtractionAction) => void;
  autoExtract?: boolean;
  onAutoExtractChange?: (auto: boolean) => void;
  galleryAssets?: GalleryAsset[];
  galleryCategories?: string[];
  onSavePieceToGallery?: (piece: { name: string; dataUrl: string }) => void;
  onLoadMotionComposition?: (asset: GalleryAsset) => void;
}

export const MotionCanvasStudio: React.FC<Props> = ({
  markers,
  selectedMarkerId,
  onSelectMarker,
  activeLayerId,
  onSelectLayer,
  layers,
  onUpdateLayers,
  brushSize,
  onBrushSizeChange,
  brushMode,
  onBrushModeChange,
  smoothLevel,
  onSmoothLevelChange,
  activeTool = 'brush',
  onActiveToolChange,
  onClearActiveLayerStrokes,
  onSaveToMarker,
  onReplaceBaseAssetPng,
  isPrimordialJelly = false,
  onTogglePrimordialJelly,
  extractionAction = 'copy',
  onExtractionActionChange,
  autoExtract = true,
  onAutoExtractChange,
  galleryAssets = [],
  galleryCategories = [],
  onSavePieceToGallery,
  onLoadMotionComposition,
}) => {
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<'replace_base' | 'add_piece'>('replace_base');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [studioTab, setStudioTab] = useState<StudioTab>('layers');
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

  // Clipboard interno de camadas
  const layerClipboardRef = useRef<MarkerMotionLayer | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceBasePngInputRef = useRef<HTMLInputElement | null>(null);

  // Pilhas de Histórico de Undo (Ctrl+Z) e Redo (Ctrl+Y / Ctrl+Shift+Z)
  const historyStackRef = useRef<MarkerMotionLayer[][]>([]);
  const redoStackRef = useRef<MarkerMotionLayer[][]>([]);

  const pushLayerHistory = (currentLayers: MarkerMotionLayer[]) => {
    historyStackRef.current.push(JSON.parse(JSON.stringify(currentLayers)));
    if (historyStackRef.current.length > 30) {
      historyStackRef.current.shift();
    }
    redoStackRef.current = [];
  };

  const handleUndo = () => {
    if (historyStackRef.current.length === 0) {
      setSaveFeedback('ℹ️ Nada para desfazer no Motion Studio.');
      setTimeout(() => setSaveFeedback(null), 1800);
      return;
    }
    const prev = historyStackRef.current.pop()!;
    redoStackRef.current.push(JSON.parse(JSON.stringify(layers)));
    onUpdateLayers(prev);
    setSaveFeedback('↩️ Desfeito com sucesso! (Ctrl+Z)');
    setTimeout(() => setSaveFeedback(null), 1800);
  };

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) {
      setSaveFeedback('ℹ️ Nada para refazer no Motion Studio.');
      setTimeout(() => setSaveFeedback(null), 1800);
      return;
    }
    const next = redoStackRef.current.pop()!;
    historyStackRef.current.push(JSON.parse(JSON.stringify(layers)));
    onUpdateLayers(next);
    setSaveFeedback('↪️ Refeito com sucesso! (Ctrl+Y)');
    setTimeout(() => setSaveFeedback(null), 1800);
  };

  // Marcadores elegíveis da galeria / fase
  const eligibleMarkers = markers.filter(
    (m) => !!m.customIconPng || m.type === 'neutral' || !!m.bannerImagePng || m.type === 'npc'
  );
  const displayMarkers = eligibleMarkers.length > 0 ? eligibleMarkers : markers;

  // Camada ativa
  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0] || null;

  // Identifica a camada base do asset (camada raiz)
  const baseLayer = layers.find((l) => l.isBaseAsset) || layers[0] || null;
  const baseIndex = layers.findIndex((l) => l.isBaseAsset);

  // Atualiza uma propriedade na camada ativa (com sincronização automática para a camada linkada/parceira)
  const updateActiveLayerProp = (updates: Partial<MarkerMotionLayer>) => {
    if (!activeLayer) return;
    const linkedId = activeLayer.linkedLayerId;

    // Propriedades que são sincronizadas entre camadas irmãs/gêmeas
    const syncableKeys: (keyof MarkerMotionLayer)[] = [
      'physicsMode', 'speed', 'intensity', 'effect', 'wingPhaseOffset',
      'clothSag', 'clothMeshDensity', 'flagWindAngle', 'flagRippleFreq'
    ];
    const hasSyncable = Object.keys(updates).some((k) => syncableKeys.includes(k as any));

    const updated = layers.map((l) => {
      if (l.id === activeLayer.id) {
        return { ...l, ...updates };
      }
      if (linkedId && l.id === linkedId && hasSyncable) {
        const linkedUpdates: Partial<MarkerMotionLayer> = {};
        for (const k of syncableKeys) {
          if (k in updates) {
            (linkedUpdates as any)[k] = updates[k];
          }
        }
        return { ...l, ...linkedUpdates };
      }
      return l;
    });
    onUpdateLayers(updated);
  };

  // Linkar duas camadas para sincronizarem animações e parâmetros
  const handleLinkLayers = (layerAId: string, layerBId: string) => {
    const layerA = layers.find((l) => l.id === layerAId);
    const layerB = layers.find((l) => l.id === layerBId);
    if (!layerA || !layerB) return;

    const isWing = layerA.physicsMode === 'wing_flap' || layerB.physicsMode === 'wing_flap';
    const chosenMode = layerA.physicsMode !== 'none' ? layerA.physicsMode : layerB.physicsMode;
    const chosenSpeed = layerA.speed ?? layerB.speed ?? 1.0;
    const chosenIntensity = layerA.intensity ?? layerB.intensity ?? 1.0;
    const chosenPhase = layerA.wingPhaseOffset ?? layerB.wingPhaseOffset ?? 0;

    const updated = layers.map((l) => {
      if (l.id === layerAId) {
        return {
          ...l,
          linkedLayerId: layerBId,
          physicsMode: chosenMode,
          speed: chosenSpeed,
          intensity: chosenIntensity,
          wingPhaseOffset: chosenPhase,
          syncWingMirror: false,
        };
      }
      if (l.id === layerBId) {
        return {
          ...l,
          linkedLayerId: layerAId,
          physicsMode: chosenMode,
          speed: chosenSpeed,
          intensity: chosenIntensity,
          wingPhaseOffset: chosenPhase,
          syncWingMirror: isWing ? true : false,
        };
      }
      return l;
    });

    onUpdateLayers(updated);
    setSaveFeedback(`🔗 Camadas "${layerA.name}" e "${layerB.name}" vinculadas e sincronizadas!`);
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  // Desvincular camadas
  const handleUnlinkLayer = (layerId: string) => {
    const target = layers.find((l) => l.id === layerId);
    const linkedId = target?.linkedLayerId;

    const updated = layers.map((l) => {
      if (l.id === layerId || (linkedId && l.id === linkedId)) {
        return {
          ...l,
          linkedLayerId: undefined,
          syncWingMirror: false,
        };
      }
      return l;
    });

    onUpdateLayers(updated);
    setSaveFeedback('🔓 Camadas desvinculadas com sucesso.');
    setTimeout(() => setSaveFeedback(null), 2500);
  };

  // Trocar PNG da camada do asset base sem afetar outras camadas
  const handleReplaceBasePng = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const updated = layers.map((l) =>
        l.isBaseAsset ? { ...l, pngUrl: dataUrl } : l
      );
      onUpdateLayers(updated);
      onReplaceBaseAssetPng?.(dataUrl);
      setSaveFeedback('🔄 Imagem PNG do asset base trocada com sucesso! (Outras camadas preservadas)');
      setTimeout(() => setSaveFeedback(null), 3500);
      if (replaceBasePngInputRef.current) replaceBasePngInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  // Selecionar imagem oficial da Galeria de Assets (para Base ou para nova Peça)
  const handleSelectFromGallery = (dataUrl: string, assetName?: string) => {
    if (galleryTarget === 'replace_base') {
      const updated = layers.map((l) =>
        l.isBaseAsset ? { ...l, pngUrl: dataUrl } : l
      );
      onUpdateLayers(updated);
      onReplaceBaseAssetPng?.(dataUrl);
      setSaveFeedback('🔄 Imagem PNG do asset base trocada com sucesso da Galeria!');
      setTimeout(() => setSaveFeedback(null), 3500);
    } else {
      const newLayer: MarkerMotionLayer = {
        id: `piece-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: assetName || `Peça Galeria ${layers.length + 1}`,
        visible: true,
        pngUrl: dataUrl,
        effect: 'none',
        speed: 1.0,
        intensity: 1.0,
        scale: 1.0,
        rotation: 0,
        flipX: false,
        flipY: false,
        pivotX: 0.5,
        pivotY: 0.1,
        physicsMode: 'none',
        x: 0,
        y: 0,
        brushSize: 24,
        strokes: [],
      };
      const updated = [...layers, newLayer];
      onUpdateLayers(updated);
      onSelectLayer(newLayer.id);
      setStudioTab('physics');
      onActiveToolChange('move');
      setSaveFeedback(`✨ Peça "${assetName || 'Galeria'}" adicionada e pronta para animar!`);
      setTimeout(() => setSaveFeedback(null), 3500);
    }
    setIsGalleryModalOpen(false);
  };

  // Reordenar camada (subir para frente / descer para trás)
  const handleMoveLayer = (id: string, direction: 'up' | 'down') => {
    const idx = layers.findIndex((l) => l.id === id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
    if (targetIdx < 0 || targetIdx >= layers.length) return;

    const nextLayers = [...layers];
    const [removed] = nextLayers.splice(idx, 1);
    nextLayers.splice(targetIdx, 0, removed);
    onUpdateLayers(nextLayers);
  };

  // Reordenar camada via Drag & Drop (clicar e arrastar)
  const handleDropLayer = (targetId: string) => {
    if (!draggedLayerId || draggedLayerId === targetId) {
      setDraggedLayerId(null);
      setDragOverLayerId(null);
      return;
    }
    const fromIdx = layers.findIndex((l) => l.id === draggedLayerId);
    const toIdx = layers.findIndex((l) => l.id === targetId);
    if (fromIdx === -1 || toIdx === -1) {
      setDraggedLayerId(null);
      setDragOverLayerId(null);
      return;
    }

    const nextLayers = [...layers];
    const [moved] = nextLayers.splice(fromIdx, 1);
    nextLayers.splice(toIdx, 0, moved);
    onUpdateLayers(nextLayers);
    onSelectLayer(moved.id);
    setDraggedLayerId(null);
    setDragOverLayerId(null);
    setSaveFeedback(`✨ Camada "${moved.name}" reordenada!`);
    setTimeout(() => setSaveFeedback(null), 2500);
  };

  // Adiciona camada vazia na frente (topo do stack) 100% ESTÁTICA
  const handleAddLayer = () => {
    const newLayer: MarkerMotionLayer = {
      id: `mlayer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `Camada Frente ${layers.length + 1}`,
      visible: true,
      effect: 'none',
      speed: 1.0,
      intensity: 1.0,
      scale: 1.0,
      rotation: 0,
      flipX: false,
      flipY: false,
      pivotX: 0.5,
      pivotY: 0.5,
      physicsMode: 'none',
      x: 0,
      y: 0,
      brushSize: 24,
      strokes: [],
    };
    const updated = [...layers, newLayer];
    onUpdateLayers(updated);
    onSelectLayer(newLayer.id);
  };

  // Adiciona camada atrás do asset base (abaixo do asset no stack) 100% ESTÁTICA
  const handleAddLayerBehind = () => {
    const bIdx = layers.findIndex((l) => l.isBaseAsset);
    const insertIdx = bIdx >= 0 ? bIdx : 0;
    const newLayer: MarkerMotionLayer = {
      id: `mlayer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `Camada Trás ${layers.length + 1}`,
      visible: true,
      effect: 'none',
      speed: 1.0,
      intensity: 1.0,
      scale: 1.0,
      rotation: 0,
      flipX: false,
      flipY: false,
      pivotX: 0.5,
      pivotY: 0.5,
      physicsMode: 'none',
      x: 0,
      y: 0,
      brushSize: 24,
      strokes: [],
    };
    const updated = [...layers];
    updated.splice(insertIdx, 0, newLayer);
    onUpdateLayers(updated);
    onSelectLayer(newLayer.id);
  };

  // Importar imagem PNG como peça independente 100% ESTÁTICA
  const handleImportPngPiece = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const pieceName = file.name.replace(/\.[^/.]+$/, '');

      const newLayer: MarkerMotionLayer = {
        id: `piece-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: pieceName || `Peça ${layers.length + 1}`,
        visible: true,
        pngUrl: dataUrl,
        effect: 'none',
        speed: 1.0,
        intensity: 1.0,
        scale: 1.0,
        rotation: 0,
        flipX: false,
        flipY: false,
        pivotX: 0.5,
        pivotY: 0.1,
        physicsMode: 'none',
        x: 0,
        y: 0,
        brushSize: 24,
        strokes: [],
      };

      const updated = [...layers, newLayer];
      onUpdateLayers(updated);
      onSelectLayer(newLayer.id);
      setStudioTab('physics');
      onActiveToolChange('move'); // Já coloca em modo mover peça!

      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  // Copiar camada
  const handleCopyLayer = () => {
    if (!activeLayer) return;
    layerClipboardRef.current = JSON.parse(JSON.stringify(activeLayer));
    setSaveFeedback('📋 Camada copiada! (Ctrl+C)');
    setTimeout(() => setSaveFeedback(null), 2500);
  };

  // Colar camada
  const handlePasteLayer = () => {
    if (!layerClipboardRef.current) {
      setSaveFeedback('⚠️ Nenhuma camada copiada para colar.');
      setTimeout(() => setSaveFeedback(null), 2500);
      return;
    }
    pushLayerHistory(layers);
    const copy = layerClipboardRef.current;
    const newLayer: MarkerMotionLayer = {
      ...copy,
      id: `copy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${copy.name} (Cópia)`,
      x: (copy.x ?? 0) + 16,
      y: (copy.y ?? 0) + 16,
    };
    const updated = [...layers, newLayer];
    onUpdateLayers(updated);
    onSelectLayer(newLayer.id);
    setSaveFeedback('✨ Camada colada com sucesso! (Ctrl+V)');
    setTimeout(() => setSaveFeedback(null), 2500);
  };

  // Duplicar camada (impedindo duplicação da camada pai)
  const handleDuplicateLayer = () => {
    if (!activeLayer) return;
    if (activeLayer.isBaseAsset) {
      setSaveFeedback('⚠️ A camada pai do asset é a raiz e não pode ser duplicada.');
      setTimeout(() => setSaveFeedback(null), 3000);
      return;
    }
    pushLayerHistory(layers);
    const newLayer: MarkerMotionLayer = {
      ...JSON.parse(JSON.stringify(activeLayer)),
      id: `dup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${activeLayer.name} (Cópia)`,
      isBaseAsset: false,
      x: (activeLayer.x ?? 0) + 12,
      y: (activeLayer.y ?? 0) + 12,
    };
    const updated = [...layers, newLayer];
    onUpdateLayers(updated);
    onSelectLayer(newLayer.id);
    setSaveFeedback('✨ Camada duplicada com sucesso! (Ctrl+D)');
    setTimeout(() => setSaveFeedback(null), 2500);
  };

  const handleToggleLayerVisible = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    pushLayerHistory(layers);
    const updated = layers.map((l) =>
      l.id === id ? { ...l, visible: l.visible === false ? true : false } : l
    );
    onUpdateLayers(updated);
  };

  const handleDeleteLayer = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (layers.length <= 1) return;
    const target = layers.find((l) => l.id === id);
    if (target?.isBaseAsset) {
      setSaveFeedback('⚠️ A camada base do asset não pode ser excluída.');
      setTimeout(() => setSaveFeedback(null), 2500);
      return;
    }
    pushLayerHistory(layers);
    const updated = layers.filter((l) => l.id !== id);
    onUpdateLayers(updated);
    if (activeLayerId === id) {
      onSelectLayer(updated[0]?.id || '');
    }
    setSaveFeedback('🗑️ Peça excluída com sucesso! (Delete)');
    setTimeout(() => setSaveFeedback(null), 2500);
  };

  const handleTriggerSave = () => {
    onSaveToMarker();
    setSaveFeedback('💾 Animação e peças salvas no marcador e na fase com sucesso! (Ctrl+S)');
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  // Atalhos Globais no Motion Studio: Ctrl+Z, Ctrl+Y, Ctrl+C, Ctrl+V, Ctrl+D, Ctrl+S, Del, Setas de Nudge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;

      // 1. Desfazer: Ctrl+Z
      if (isCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // 2. Refazer: Ctrl+Y ou Ctrl+Shift+Z
      if (isCtrl && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // 3. Copiar: Ctrl+C
      if (isCtrl && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopyLayer();
        return;
      }

      // 4. Colar: Ctrl+V
      if (isCtrl && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePasteLayer();
        return;
      }

      // 5. Duplicar: Ctrl+D
      if (isCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateLayer();
        return;
      }

      // 6. Salvar: Ctrl+S
      if (isCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleTriggerSave();
        return;
      }

      // 7. Excluir: Delete ou Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeLayer && !activeLayer.isBaseAsset && layers.length > 1) {
          e.preventDefault();
          handleDeleteLayer(activeLayer.id);
          return;
        }
      }

      // 8. Nudge das peças com setas direcionais (1px, ou 10px com Shift)
      if (activeLayer && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;

        updateActiveLayerProp({
          x: (activeLayer.x ?? 0) + dx,
          y: (activeLayer.y ?? 0) + dy,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [layers, activeLayer, activeLayerId]);

  const handleSaveCompositionToGallery = () => {
    const mainPng = baseLayer?.pngUrl || activeLayer?.pngUrl;
    if (!mainPng) {
      setSaveFeedback('⚠️ Nenhuma imagem PNG encontrada nesta composição para salvar.');
      setTimeout(() => setSaveFeedback(null), 3000);
      return;
    }
    const currentMarker = displayMarkers.find((m) => m.id === selectedMarkerId);
    const assetName = currentMarker?.name ? `${currentMarker.name} (Motion)` : 'Composição Motion Canvas';
    onSavePieceToGallery?.({
      name: assetName,
      dataUrl: mainPng,
    });
    setSaveFeedback(`📁 "${assetName}" salvo com sucesso no acervo da Galeria!`);
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  return (
    <div className="space-y-3.5 text-slate-200">
      {/* 1. SELETOR DE ABAS PRINCIPAIS - Interface Limpa e Organizada */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
        <button
          type="button"
          onClick={() => setStudioTab('layers')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            studioTab === 'layers'
              ? 'bg-amber-400 text-black font-black shadow-xs'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span>Camadas & Asset</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
              studioTab === 'layers' ? 'bg-black/30 text-black' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            {layers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStudioTab('draw');
            onActiveToolChange('brush');
          }}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            studioTab === 'draw'
              ? 'bg-white text-black font-black shadow-xs'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Brush className="w-4 h-4 shrink-0" />
          <span>Pincel & Borracha</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStudioTab('physics');
            if (activeTool === 'brush') onActiveToolChange('move');
          }}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            studioTab === 'physics'
              ? 'bg-emerald-500 text-black font-black shadow-xs'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Activity className="w-4 h-4 shrink-0" />
          <span>Física & Posição</span>
        </button>

        <button
          type="button"
          onClick={() => setStudioTab('gallery')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            studioTab === 'gallery'
              ? 'bg-sky-500 text-black font-black shadow-xs'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <FolderOpen className="w-4 h-4 shrink-0" />
          <span>Galeria Motion</span>
          {galleryAssets.filter((a) => a.category === 'Motion Canvas').length > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                studioTab === 'gallery' ? 'bg-black/30 text-black' : 'bg-zinc-800 text-sky-300'
              }`}
            >
              {galleryAssets.filter((a) => a.category === 'Motion Canvas').length}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* ABA 1: CAMADAS & ASSET (Com Destaque para o Asset Pai, Trocar PNG e Gelatina) */}
      {/* ============================================================== */}
      {studioTab === 'layers' && (
        <div className="space-y-3">
          {/* 1.1 Seletor do Marcador / Asset em Edição */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Asset / Marcador em Edição
            </label>
            <div className="relative">
              <select
                value={selectedMarkerId || ''}
                onChange={(e) => onSelectMarker(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-medium focus:outline-hidden focus:border-amber-500 appearance-none cursor-pointer"
              >
                {!selectedMarkerId ? (
                  <option value="">
                    {baseLayer?.name ? `🎨 ${baseLayer.name} (Asset Local / Galeria)` : '🎨 Composição em Edição'}
                  </option>
                ) : (
                  <option value="" disabled>
                    Selecione um marcador ou asset neutro da galeria...
                  </option>
                )}
                {displayMarkers.map((m) => {
                  const tag =
                    m.type === 'neutral'
                      ? '🎨 Asset Neutro'
                      : m.type === 'npc'
                      ? '👤 NPC'
                      : `📍 ${m.type}`;
                  return (
                    <option key={m.id} value={m.id}>
                      {m.name} [{tag}]
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* 1.2 CARD DA CAMADA PAI DO ASSET (Base) - DESTAQUE ESPECIAL */}
          <div className="p-3.5 bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/50 rounded-2xl space-y-3 shadow-lg shadow-amber-950/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <span>Camada Pai do Asset (Base)</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold uppercase">
                      Raiz
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {baseLayer ? baseLayer.name : 'Asset Principal'}
                  </div>
                </div>
              </div>

              {baseLayer && (
                <button
                  type="button"
                  onClick={() => onSelectLayer(baseLayer.id)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                    activeLayer?.id === baseLayer.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-amber-400'
                  }`}
                >
                  {activeLayer?.id === baseLayer.id ? 'Selecionada' : 'Selecionar'}
                </button>
              )}
            </div>

            {/* BOTÕES PRINCIPAIS DO ASSET PAI: TROCAR PNG & MAKE IT PRIMORDIAL GELATINA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              {/* Botão 1: Trocar Imagem PNG (Pai) - Opção Galeria e Arquivo Local */}
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setGalleryTarget('replace_base');
                    setIsGalleryModalOpen(true);
                  }}
                  className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 border border-amber-500/40 transition-all shadow-sm cursor-pointer"
                  title="Substituir imagem da base escolhendo do acervo oficial da Galeria"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span className="truncate">Galeria</span>
                </button>
                <button
                  type="button"
                  onClick={() => replaceBasePngInputRef.current?.click()}
                  className="py-2.5 px-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center gap-1 border border-slate-700 hover:border-slate-600 transition-all shadow-sm cursor-pointer"
                  title="Substituir por arquivo local do computador"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">Local</span>
                </button>
              </div>
              <input
                ref={replaceBasePngInputRef}
                type="file"
                accept="image/png,image/webp"
                onChange={handleReplaceBasePng}
                className="hidden"
              />

              {/* Botão 2: Make it Primordial Gelatina (Gelly Button!) */}
              <button
                type="button"
                onClick={onTogglePrimordialJelly}
                className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isPrimordialJelly
                    ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-slate-950 shadow-lg shadow-amber-500/50 ring-2 ring-amber-300 animate-pulse'
                    : 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/50 shadow-sm'
                }`}
                title="Ativar/desativar movimento de squash & stretch (gelatina) para ver o balanço e a reação física das peças penduradas"
              >
                <span className="text-base">🍮</span>
                <span className="truncate">
                  {isPrimordialJelly ? 'Gelatina Ativa!' : 'Make it Primordial Gelatina'}
                </span>
              </button>
            </div>

            <p className="text-[10px] text-amber-200/80 leading-relaxed bg-amber-950/30 p-2 rounded-xl border border-amber-500/20">
              💡 <strong>Dica da Gelatina:</strong> Ao ativar o botão <strong>Gelly</strong>, o asset recebe a animação de squash & stretch do mapa. Assim você testa em tempo real se os pêndulos e peças penduradas reagem à inércia do corpo pai!
            </p>
          </div>

          {/* 1.3 Ações de Camadas & Peças */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Pilha de Camadas ({layers.length})</span>
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleAddLayer}
                  className="p-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-bold flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                  title="Adicionar camada vazia no topo (frente do asset)"
                >
                  <Plus className="w-3 h-3 text-emerald-400" />
                  <span>+ Frente</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddLayerBehind}
                  className="p-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] font-bold flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                  title="Adicionar camada atrás do asset base (fundo do stack)"
                >
                  <Plus className="w-3 h-3 text-sky-400" />
                  <span>+ Atrás</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGalleryTarget('add_piece');
                    setIsGalleryModalOpen(true);
                  }}
                  className="p-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-500/30 transition-colors cursor-pointer"
                  title="Adicionar peça do acervo oficial da Galeria"
                >
                  <FolderOpen className="w-3 h-3 text-amber-400" />
                  <span>+ Peça Galeria</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1 px-2 rounded-lg bg-fuchsia-600/30 hover:bg-fuchsia-600/50 text-fuchsia-200 text-[10px] font-bold flex items-center gap-1 border border-fuchsia-500/40 transition-colors cursor-pointer"
                  title="Importar imagem PNG como peça independente"
                >
                  <Upload className="w-3 h-3 text-fuchsia-300" />
                  <span>+ PNG Local</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/webp"
                  onChange={handleImportPngPiece}
                  className="hidden"
                />
              </div>
            </div>

            {/* Ações de Copiar / Colar / Duplicar Camada */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-[10px]">
              <button
                type="button"
                onClick={handleCopyLayer}
                className="py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold flex items-center justify-center gap-1 border border-slate-800 transition-colors cursor-pointer"
                title="Copiar camada ativa"
              >
                <Copy className="w-3 h-3 text-sky-400" />
                <span>Copiar</span>
              </button>
              <button
                type="button"
                onClick={handlePasteLayer}
                className="py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold flex items-center justify-center gap-1 border border-slate-800 transition-colors cursor-pointer"
                title="Colar camada copiada"
              >
                <ClipboardPaste className="w-3 h-3 text-emerald-400" />
                <span>Colar</span>
              </button>
              <button
                type="button"
                onClick={handleDuplicateLayer}
                disabled={activeLayer?.isBaseAsset}
                className={`py-1 px-2 rounded-lg border transition-colors flex items-center justify-center gap-1 font-semibold ${
                  activeLayer?.isBaseAsset
                    ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 cursor-pointer'
                }`}
                title={
                  activeLayer?.isBaseAsset
                    ? 'A camada pai do asset é a raiz e não pode ser duplicada'
                    : 'Duplicar camada ativa'
                }
              >
                <Layers className="w-3 h-3 text-amber-400" />
                <span>Duplicar</span>
              </button>
            </div>

            {/* Lista de Camadas com Reordenação Livre (Frente / Trás do Asset) */}
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {/* Exibimos as camadas de cima para baixo (topo = frente) */}
              {[...layers].reverse().map((layer, reverseIdx) => {
                const originalIdx = layers.length - 1 - reverseIdx;
                const isSelected = layer.id === (activeLayer?.id || layers[0]?.id);
                const isBase = !!layer.isBaseAsset;
                const isBehindBase = baseIndex >= 0 && originalIdx < baseIndex;
                const isAheadBase = baseIndex >= 0 && originalIdx > baseIndex;

                return (
                  <div
                    key={layer.id}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', layer.id);
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggedLayerId(layer.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverLayerId !== layer.id) {
                        setDragOverLayerId(layer.id);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      if (dragOverLayerId === layer.id) {
                        setDragOverLayerId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDropLayer(layer.id);
                    }}
                    onDragEnd={() => {
                      setDraggedLayerId(null);
                      setDragOverLayerId(null);
                    }}
                    onClick={() => onSelectLayer(layer.id)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                      draggedLayerId === layer.id
                        ? 'opacity-40 border-dashed border-amber-400 scale-[0.98]'
                        : dragOverLayerId === layer.id
                        ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400 shadow-md scale-[1.01]'
                        : isSelected
                        ? isBase
                          ? 'bg-amber-950/60 border-amber-400 text-white shadow-xs'
                          : 'bg-fuchsia-950/50 border-fuchsia-500/80 text-white shadow-xs'
                        : isBase
                        ? 'bg-slate-950 border-amber-500/30 text-amber-200 hover:border-amber-400'
                        : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {/* Handle para arrastar */}
                      <div
                        className="p-0.5 text-slate-500 hover:text-amber-400 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
                        title="Clique e arraste para reordenar"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>

                      {/* Setas de Reordenar (▲ Trazer para frente / ▼ Enviar para trás) */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveLayer(layer.id, 'up');
                          }}
                          disabled={originalIdx === layers.length - 1}
                          className="p-0.5 hover:text-white disabled:opacity-20 text-slate-400 transition-colors"
                          title="Trazer para frente (subir na ordem Z)"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveLayer(layer.id, 'down');
                          }}
                          disabled={originalIdx === 0}
                          className="p-0.5 hover:text-white disabled:opacity-20 text-slate-400 transition-colors"
                          title="Enviar para trás (descer na ordem Z)"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Tag do Tipo de Camada */}
                      {isBase ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase shrink-0 flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5" />
                          <span>Base</span>
                        </span>
                      ) : isBehindBase ? (
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[9px] font-bold uppercase shrink-0">
                          ⬇️ Trás
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 text-[9px] font-bold uppercase shrink-0">
                          ⬆️ Frente
                        </span>
                      )}

                      <span className="truncate font-semibold">{layer.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Botão de Link / Sincronia entre Camadas com mesmo efeito */}
                      {layer.linkedLayerId ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnlinkLayer(layer.id);
                          }}
                          className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title={`🔗 Sincronizada com "${layers.find((l) => l.id === layer.linkedLayerId)?.name || 'Camada'}". Clique para desvincular.`}
                        >
                          <Link2 className="w-3 h-3 text-emerald-400" />
                          <span>Linkada</span>
                        </button>
                      ) : (
                        (() => {
                          const matching = layers.filter(
                            (other) =>
                              other.id !== layer.id &&
                              !other.linkedLayerId &&
                              ((layer.physicsMode && layer.physicsMode !== 'none' && other.physicsMode === layer.physicsMode) ||
                                (layer.effect && layer.effect !== 'none' && other.effect === layer.effect))
                          );
                          if (matching.length === 0) return null;
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLinkLayers(layer.id, matching[0].id);
                              }}
                              className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title={`🔗 Vincular e sincronizar com "${matching[0].name}"`}
                            >
                              <Link2 className="w-3 h-3 text-amber-400" />
                              <span>Link ({matching[0].name.slice(0, 7)})</span>
                            </button>
                          );
                        })()
                      )}

                      <span
                        className="text-[9px] font-mono text-sky-400/90 bg-slate-900 px-1 py-0.5 rounded border border-slate-800"
                        title={`Pivô: ${Math.round((layer.pivotX ?? 0.5) * 100)}% X, ${Math.round(
                          (layer.pivotY ?? 0.5) * 100
                        )}% Y`}
                      >
                        P: {Math.round((layer.pivotX ?? 0.5) * 100)}%, {Math.round((layer.pivotY ?? 0.5) * 100)}%
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleToggleLayerVisible(layer.id, e)}
                        className={`p-1 rounded-md transition-colors ${
                          layer.visible === false
                            ? 'text-slate-600 hover:text-slate-400'
                            : 'text-amber-400 hover:text-amber-300'
                        }`}
                        title={layer.visible === false ? 'Exibir camada' : 'Ocultar camada'}
                      >
                        {layer.visible === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>

                      {layers.length > 1 && !isBase && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteLayer(layer.id, e)}
                          className="p-1 rounded-md text-slate-600 hover:text-red-400 transition-colors"
                          title="Excluir peça"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: PINCEL & BORRACHAS (Lápis, Laço, Borracha Traço e Borracha PNG) */}
      {/* ============================================================== */}
      {studioTab === 'draw' && (
        <div className="space-y-3">
          <MotionBrushStudio
            brushMode={brushMode}
            onBrushModeChange={onBrushModeChange}
            brushSize={brushSize}
            onBrushSizeChange={onBrushSizeChange}
            smoothLevel={smoothLevel}
            onSmoothLevelChange={onSmoothLevelChange}
            extractionAction={extractionAction}
            onExtractionActionChange={onExtractionActionChange}
            autoExtract={autoExtract}
            onAutoExtractChange={onAutoExtractChange}
            onClearStrokes={onClearActiveLayerStrokes}
          />

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
            <button
              type="button"
              onClick={onClearActiveLayerStrokes}
              className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-800 transition-colors cursor-pointer"
            >
              <Eraser className="w-3.5 h-3.5 text-rose-400" />
              <span>Limpar Traços da Camada Ativa</span>
            </button>
            <p className="text-[10px] text-slate-400 leading-relaxed text-center">
              Você pode alternar entre <strong>Borracha de Traços</strong> (apaga malha) e <strong>Borracha de Pixels PNG</strong> (esculpe transparência direta).
            </p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 3: FÍSICA & POSIÇÃO (Mover Peça, Ponto Pivô e Modos de Física) */}
      {/* ============================================================== */}
      {studioTab === 'physics' && (
        <div className="space-y-3">
          {/* Sub-barra de seleção da ferramenta de transformação */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => onActiveToolChange('move')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
                activeTool === 'move'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mover Peça (X, Y)"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Mover Peça</span>
            </button>

            <button
              type="button"
              onClick={() => onActiveToolChange('pivot')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
                activeTool === 'pivot'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Ponto Pivô (eixo de rotação)"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Ponto Pivô</span>
            </button>

            <button
              type="button"
              onClick={() => onActiveToolChange('pan')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
                activeTool === 'pan'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Pan da Tela"
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Pan Tela</span>
            </button>
          </div>

          {/* Posicionar Peça (Quando activeTool === 'move') */}
          {activeTool === 'move' && activeLayer && (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                <span className="flex items-center gap-1.5">
                  <Move className="w-4 h-4 text-amber-400" />
                  <span>Posição & Transformação ({activeLayer.name})</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  X: {activeLayer.x ?? 0}px | Y: {activeLayer.y ?? 0}px
                </span>
              </div>

              {/* Espelhamento */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateActiveLayerProp({ flipX: !activeLayer.flipX })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeLayer.flipX
                      ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <FlipHorizontal className="w-4 h-4" />
                  <span>Espelhar H {activeLayer.flipX ? '(Ativo)' : ''}</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateActiveLayerProp({ flipY: !activeLayer.flipY })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeLayer.flipY
                      ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <FlipVertical className="w-4 h-4" />
                  <span>Espelhar V {activeLayer.flipY ? '(Ativo)' : ''}</span>
                </button>
              </div>

              {/* Rotação */}
              <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Giro / Rotação</span>
                  </span>
                  <span className="font-mono text-amber-300 font-bold">
                    {activeLayer.rotation ?? 0}°
                  </span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={activeLayer.rotation ?? 0}
                  onChange={(e) => updateActiveLayerProp({ rotation: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateActiveLayerProp({
                        rotation: (((activeLayer.rotation ?? 0) - 90 + 180) % 360) - 180,
                      })
                    }
                    className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-slate-300 cursor-pointer"
                  >
                    -90°
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActiveLayerProp({ rotation: 0 })}
                    className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-slate-400 cursor-pointer"
                  >
                    Reset (0°)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateActiveLayerProp({
                        rotation: (((activeLayer.rotation ?? 0) + 90 + 180) % 360) - 180,
                      })
                    }
                    className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-slate-300 cursor-pointer"
                  >
                    +90°
                  </button>
                </div>
              </div>

              {/* Escala */}
              <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Escala da Peça</span>
                  </span>
                  <span className="font-mono text-emerald-300 font-bold">
                    {(activeLayer.scale ?? 1.0).toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.05"
                  value={activeLayer.scale ?? 1.0}
                  onChange={(e) => updateActiveLayerProp({ scale: Number(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Deforme: Compressão e Expansão Horizontal (scaleX) e Vertical (scaleY) */}
              <div className="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-1 font-bold">
                    <span>📐 Deforme (Comprimir / Expandir)</span>
                  </span>
                  <span className="font-mono text-fuchsia-300 font-bold text-[11px]">
                    H: {Math.round((activeLayer.scaleX ?? 1.0) * 100)}% | V: {Math.round((activeLayer.scaleY ?? 1.0) * 100)}%
                  </span>
                </div>

                {/* Slider Horizontal */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-fuchsia-400">Horizontal (H - Largura)</span>
                    <span className="font-mono text-slate-300 font-bold">
                      {((activeLayer.scaleX ?? 1.0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.05"
                    value={activeLayer.scaleX ?? 1.0}
                    onChange={(e) => updateActiveLayerProp({ scaleX: Number(e.target.value) })}
                    className="w-full accent-fuchsia-500 cursor-pointer"
                  />
                </div>

                {/* Slider Vertical */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-amber-400">Vertical (V - Altura)</span>
                    <span className="font-mono text-slate-300 font-bold">
                      {((activeLayer.scaleY ?? 1.0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.05"
                    value={activeLayer.scaleY ?? 1.0}
                    onChange={(e) => updateActiveLayerProp({ scaleY: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Presets Rápidos de Deforme */}
                <div className="grid grid-cols-5 gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => updateActiveLayerProp({ scaleX: 1.0, scaleY: 1.0 })}
                    className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-slate-300 hover:text-white cursor-pointer text-center"
                    title="Proporção Normal 1:1"
                  >
                    1:1
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActiveLayerProp({ scaleX: 1.35, scaleY: 0.7 })}
                    className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-fuchsia-300 hover:text-white cursor-pointer text-center"
                    title="Achatar Vertical (Squash)"
                  >
                    Achatar
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActiveLayerProp({ scaleX: 0.7, scaleY: 1.35 })}
                    className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-amber-300 hover:text-white cursor-pointer text-center"
                    title="Esticar Vertical (Stretch)"
                  >
                    Esticar
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActiveLayerProp({ scaleX: 0.6, scaleY: 1.0 })}
                    className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-sky-300 hover:text-white cursor-pointer text-center"
                    title="Fino / Estreito"
                  >
                    Fino
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActiveLayerProp({ scaleX: 1.4, scaleY: 1.0 })}
                    className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-emerald-300 hover:text-white cursor-pointer text-center"
                    title="Largo / Amplo"
                  >
                    Largo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ponto Pivô (Quando activeTool === 'pivot') */}
          {activeTool === 'pivot' && activeLayer && (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-sky-300 font-bold flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-sky-400" />
                  <span>Pivô de: {activeLayer.name}</span>
                </span>
                <span className="font-mono text-[10px] text-sky-300/80 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-500/30">
                  {Math.round((activeLayer.pivotX ?? 0.5) * 100)}% X |{' '}
                  {Math.round((activeLayer.pivotY ?? 0.5) * 100)}% Y
                </span>
              </div>

              {/* Presets Rápidos */}
              <div className="grid grid-cols-3 gap-1">
                {PIVOT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      updateActiveLayerProp({ pivotX: preset.x, pivotY: preset.y })
                    }
                    className="py-1 px-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-800 hover:border-sky-500/40 text-center transition-colors truncate cursor-pointer"
                    title={`${preset.label} (${preset.x * 100}%, ${preset.y * 100}%)`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Sliders X e Y */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400">Eixo X: {Math.round((activeLayer.pivotX ?? 0.5) * 100)}%</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={activeLayer.pivotX ?? 0.5}
                    onChange={(e) => updateActiveLayerProp({ pivotX: Number(e.target.value) })}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-slate-400">Eixo Y: {Math.round((activeLayer.pivotY ?? 0.5) * 100)}%</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={activeLayer.pivotY ?? 0.5}
                    onChange={(e) => updateActiveLayerProp({ pivotY: Number(e.target.value) })}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modo Pan */}
          {activeTool === 'pan' && (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                <Hand className="w-4 h-4 text-emerald-400" />
                <span>Navegação Livre da Tela</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Arraste a tela livremente com o botão esquerdo ou do meio. Use <strong>Ctrl + Scroll</strong> para dar zoom contínuo.
              </p>
            </div>
          )}

          {/* Configuração de Física da Peça Ativa */}
          {activeLayer && (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Física da Peça ({activeLayer.name})</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400/80 uppercase">
                  {activeLayer.physicsMode || 'none'}
                </span>
              </div>

              <div className="space-y-1.5">
                {PHYSICS_MODES.map((mode) => {
                  const isCur = (activeLayer.physicsMode || 'none') === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => updateActiveLayerProp({ physicsMode: mode.id as PhysicsMode })}
                      className={`w-full p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isCur
                          ? 'bg-emerald-950/60 border-emerald-400 text-white shadow-xs'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-200">{mode.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{mode.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Opções específicas do modo Close Up ou Piscar Olhos */}
              {(activeLayer.physicsMode === 'close_up' || activeLayer.physicsMode === 'blink') && (
                <div className="p-2.5 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                    <span>
                      {activeLayer.physicsMode === 'blink'
                        ? '👁️ Eixo do Piscar (Pálpebra)'
                        : '📖 Eixo da Dobra (Close Up)'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {activeLayer.physicsMode === 'blink'
                        ? (activeLayer.foldAxis || 'vertical') === 'vertical'
                          ? 'Vertical (Pálpebra Natural)'
                          : 'Horizontal (Fechamento Lateral)'
                        : (activeLayer.foldAxis || 'horizontal') === 'horizontal'
                          ? 'Horizontal (Livro / Asa)'
                          : 'Vertical (Concha / Dobra V)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateActiveLayerProp({ foldAxis: 'horizontal' })}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        (activeLayer.foldAxis ?? (activeLayer.physicsMode === 'blink' ? 'vertical' : 'horizontal')) === 'horizontal'
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-xs'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>↔️ Horizontal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveLayerProp({ foldAxis: 'vertical' })}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        (activeLayer.foldAxis ?? (activeLayer.physicsMode === 'blink' ? 'vertical' : 'horizontal')) === 'vertical'
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-xs'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>↕️ Vertical</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Opções específicas: Bater de Asas (Wing Flap) */}
              {activeLayer.physicsMode === 'wing_flap' && (
                <div className="p-2.5 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                    <span>🦇 Sincronia das Asas</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(activeLayer.wingPhaseOffset || 0) === 180 ? 'Alternada (180°)' : 'Sincronizada (0°)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateActiveLayerProp({ wingPhaseOffset: 0 })}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        (activeLayer.wingPhaseOffset || 0) === 0
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-xs'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>✨ Em Fase (0°)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveLayerProp({ wingPhaseOffset: 180 })}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        (activeLayer.wingPhaseOffset || 0) === 180
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-xs'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🔄 Alternada (180°)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Opções específicas: Tecido / Pano Macio (Cloth) */}
              {activeLayer.physicsMode === 'cloth' && (
                <div className="p-2.5 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                    <span>🧣 Peso e Caimento Gravitacional (Sag)</span>
                    <span className="font-mono text-emerald-300 font-bold">
                      {(activeLayer.clothSag ?? 1.0).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.1"
                    value={activeLayer.clothSag ?? 1.0}
                    onChange={(e) => updateActiveLayerProp({ clothSag: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Densidade da Malha:</span>
                    <div className="flex gap-1">
                      {[8, 14, 20].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => updateActiveLayerProp({ clothMeshDensity: d })}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-colors cursor-pointer ${
                            (activeLayer.clothMeshDensity || 14) === d
                              ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          {d}x{d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Opções específicas: Bandeira ao Vento (Flag) */}
              {activeLayer.physicsMode === 'flag' && (
                <div className="p-2.5 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                    <span>🚩 Direção do Vento</span>
                    <span className="font-mono text-emerald-300 font-bold">
                      {activeLayer.flagWindAngle || 0}°
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[10px]">
                    {[
                      { deg: 0, label: '➡️ Horizontal' },
                      { deg: 45, label: '↘️ Diagonal' },
                      { deg: -45, label: '↗️ Subida' },
                      { deg: 90, label: '⬇️ Descida' },
                    ].map((w) => (
                      <button
                        key={w.deg}
                        type="button"
                        onClick={() => updateActiveLayerProp({ flagWindAngle: w.deg })}
                        className={`py-1 px-1 rounded border text-center font-bold transition-colors cursor-pointer ${
                          (activeLayer.flagWindAngle || 0) === w.deg
                            ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="5"
                    value={activeLayer.flagWindAngle || 0}
                    onChange={(e) => updateActiveLayerProp({ flagWindAngle: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Frequência da Rajada:</span>
                    <span className="font-mono text-emerald-300 font-bold">
                      {(activeLayer.flagRippleFreq ?? 1.0).toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.5"
                    step="0.1"
                    value={activeLayer.flagRippleFreq ?? 1.0}
                    onChange={(e) => updateActiveLayerProp({ flagRippleFreq: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              )}

              {/* Opções específicas: Giro Contínuo (Spin) */}
              {activeLayer.physicsMode === 'spin' && (
                <div className="p-2.5 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                    <span>⚙️ Sentido da Rotação</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {activeLayer.spinDirection === 'ccw' ? 'Anti-Horário (↺)' : 'Horário (↻)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateActiveLayerProp({ spinDirection: 'cw' })}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        (activeLayer.spinDirection || 'cw') === 'cw'
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-xs'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>↻ Horário</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveLayerProp({ spinDirection: 'ccw' })}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeLayer.spinDirection === 'ccw'
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-xs'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>↺ Anti-Horário</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Opções específicas: Órbita Flutuante (Orbit) */}
              {activeLayer.physicsMode === 'orbit' && (
                <div className="p-2.5 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                    <span>🔮 Raio da Órbita</span>
                    <span className="font-mono text-emerald-300 font-bold">
                      {activeLayer.orbitRadius || 24}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="2"
                    value={activeLayer.orbitRadius || 24}
                    onChange={(e) => updateActiveLayerProp({ orbitRadius: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              )}

              {/* Card de Vinculação & Sincronia de Camadas Gêmeas (Linked Animation) */}
              <div className="p-3 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-950 border border-indigo-500/30 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                    <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Sincronia de Camadas Gêmeas</span>
                  </div>
                  {activeLayer.linkedLayerId && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Link Ativo
                    </span>
                  )}
                </div>

                {activeLayer.linkedLayerId ? (
                  (() => {
                    const linkedPartner = layers.find((l) => l.id === activeLayer.linkedLayerId);
                    return (
                      <div className="space-y-2.5">
                        <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[10px] text-slate-400">Vinculada sincronizadamente a:</div>
                            <div className="text-xs font-bold text-white truncate flex items-center gap-1.5 mt-0.5">
                              <span className="text-indigo-400">🔗</span>
                              <span className="truncate">{linkedPartner?.name || 'Camada Parceira'}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUnlinkLayer(activeLayer.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                            title="Desfazer vínculo entre as duas camadas"
                          >
                            <Unlink className="w-3 h-3 text-rose-400" />
                            <span>Desvincular</span>
                          </button>
                        </div>

                        {/* Controles de Espelhamento Simétrico (para Bater de Asas) */}
                        {activeLayer.physicsMode === 'wing_flap' && (
                          <div className="p-2.5 bg-indigo-950/40 rounded-xl border border-indigo-500/25 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-indigo-200">
                              <span>🦋 Simetria do Bater de Asas</span>
                              <span className="text-[10px] font-mono text-indigo-400">
                                {activeLayer.syncWingMirror ? 'Asa Oposta (Invertida)' : 'Asa Base (Normal)'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight">
                              Para que as duas asas batam juntas em direção oposta (abrindo e fechando de forma anatômica), uma das asas deve ter a rotação invertida.
                            </p>
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => updateActiveLayerProp({ syncWingMirror: false })}
                                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                                  !activeLayer.syncWingMirror
                                    ? 'bg-indigo-500/30 border-indigo-400 text-indigo-200 shadow-xs'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                <span>Normal (+1x)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => updateActiveLayerProp({ syncWingMirror: true })}
                                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                                  activeLayer.syncWingMirror
                                    ? 'bg-indigo-500/30 border-indigo-400 text-indigo-200 shadow-xs'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                <span>🦋 Invertida (-1x)</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Vincule esta camada a outra (ex: <b className="text-white">Asa Esquerda & Asa Direita</b>) para que sincronizem velocidade, intensidade e física em tempo real.
                    </p>
                    <div className="space-y-1.5 pt-0.5">
                      {layers
                        .filter((l) => l.id !== activeLayer.id)
                        .map((otherLayer) => {
                          const isSamePhysics = otherLayer.physicsMode === activeLayer.physicsMode;
                          return (
                            <button
                              key={otherLayer.id}
                              type="button"
                              onClick={() => handleLinkLayers(activeLayer.id, otherLayer.id)}
                              className={`w-full py-2 px-2.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                                isSamePhysics
                                  ? 'bg-indigo-950/50 border-indigo-500/40 text-indigo-200 hover:bg-indigo-900/60'
                                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Link2 className={`w-3.5 h-3.5 shrink-0 ${isSamePhysics ? 'text-indigo-400' : 'text-slate-500'}`} />
                                <span className="truncate">{otherLayer.name}</span>
                              </div>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                isSamePhysics ? 'bg-indigo-500/25 text-indigo-300' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {isSamePhysics ? 'Mesmo Efeito' : 'Vincular'}
                              </span>
                            </button>
                          );
                        })}
                      {layers.filter((l) => l.id !== activeLayer.id).length === 0 && (
                        <div className="text-[11px] text-slate-500 italic p-1 text-center">
                          Crie ou recorte uma segunda peça para poder vinculá-las.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sliders de Velocidade e Intensidade */}
              <div className="space-y-2.5 pt-1">
                <div className="space-y-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {activeLayer.physicsMode === 'blink'
                        ? 'Ritmo / Frequência do Piscar'
                        : activeLayer.physicsMode === 'close_up'
                        ? 'Velocidade da Dobra'
                        : 'Velocidade da Oscilação'}
                    </span>
                    <span className="font-mono text-emerald-300 font-bold">
                      {(activeLayer.speed ?? 1.0).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.5"
                    step="0.1"
                    value={activeLayer.speed ?? 1.0}
                    onChange={(e) => updateActiveLayerProp({ speed: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {activeLayer.physicsMode === 'blink'
                        ? 'Profundidade da Piscada (Abertura)'
                        : activeLayer.physicsMode === 'close_up'
                        ? 'Profundidade do Fechamento'
                        : 'Intensidade / Amplitude do Balanço'}
                    </span>
                    <span className="font-mono text-emerald-300 font-bold">
                      {(activeLayer.intensity ?? 1.0).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.5"
                    step="0.05"
                    value={activeLayer.intensity ?? 1.0}
                    onChange={(e) => updateActiveLayerProp({ intensity: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 4: ACERVO / GALERIA MOTION (Acesso Rápido a Assets Salvos) */}
      {/* ============================================================== */}
      {studioTab === 'gallery' && (
        <div className="space-y-3">
          <div className="p-3 bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-500/30 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-sky-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Acervo Motion Canvas</span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Composições salvas prontas para reedição ou uso imediato
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setGalleryTarget('replace_base');
                setIsGalleryModalOpen(true);
              }}
              className="py-1 px-2.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <FolderOpen className="w-3 h-3 text-sky-400" />
              <span>Ver Geral</span>
            </button>
          </div>

          {/* Lista de Composições de Motion Canvas */}
          {galleryAssets.filter((a) => a.category === 'Motion Canvas').length === 0 ? (
            <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-500">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-300">Nenhuma composição salva ainda</div>
              <p className="text-[11px] text-slate-500">
                Edite suas peças e camadas e clique em <b>"Salvar Composição de Peças"</b> abaixo para guardá-la aqui e re-editar quando quiser!
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {galleryAssets
                .filter((a) => a.category === 'Motion Canvas')
                .map((asset) => {
                  const piecesCount = asset.motionLayers?.length || 1;
                  const isFullComposition = asset.category === 'Motion Canvas';

                  return (
                    <div
                      key={asset.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-lg border border-slate-800 shrink-0 flex items-center justify-center p-1 bg-slate-900 overflow-hidden"
                          style={{
                            backgroundImage:
                              'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                            backgroundSize: '6px 6px',
                          }}
                        >
                          <img
                            src={asset.dataUrl}
                            alt={asset.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 truncate">
                            {asset.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                isFullComposition
                                  ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {isFullComposition ? 'Composição' : 'Peça'}
                            </span>
                            {asset.motionLayers && (
                              <span className="text-[9px] text-slate-400 font-mono">
                                {piecesCount} peças
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (asset.motionLayers && asset.motionLayers.length > 0) {
                              const rawLayers = JSON.parse(JSON.stringify(asset.motionLayers));
                              const foundBase = rawLayers.find((l: any) => l.isBaseAsset) || rawLayers[0];
                              const baseSrc = foundBase?.pngUrl || asset.dataUrl;
                              const layersToLoad = rawLayers.map((l: any) => {
                                const isBase = l.id === foundBase?.id;
                                return {
                                  ...l,
                                  isBaseAsset: isBase,
                                  pngUrl: isBase ? (l.pngUrl || baseSrc) : l.pngUrl,
                                };
                              });
                              onUpdateLayers(layersToLoad);
                              onSelectLayer(layersToLoad[0].id);
                              if (baseSrc) {
                                onReplaceBaseAssetPng?.(baseSrc);
                              }
                              onLoadMotionComposition?.({ ...asset, motionLayers: layersToLoad });
                              setStudioTab('layers');
                              setSaveFeedback(`🎬 "${asset.name}" carregado para reedição!`);
                              setTimeout(() => setSaveFeedback(null), 3000);
                            } else {
                              onLoadMotionComposition?.(asset);
                              setStudioTab('layers');
                            }
                          }}
                          className="py-1 px-2.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="Carregar todas as camadas e peças no estúdio para re-editar"
                        >
                          <RotateCw className="w-3 h-3" />
                          <span>Re-editar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Guia Rápido de Atalhos de Teclado */}
      <div className="p-3 bg-slate-950/90 border border-slate-800/80 rounded-2xl space-y-1.5 text-[10px]">
        <div className="flex items-center justify-between text-slate-400 font-bold">
          <span className="flex items-center gap-1 text-slate-300">
            <span>⌨️ Atalhos de Teclado</span>
          </span>
          <span className="text-amber-400 font-mono text-[9px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
            Studio Ativo
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-slate-400">
          <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800/50">
            <span>Desfazer / Refazer</span>
            <span className="font-mono text-slate-200 font-bold">Ctrl+Z / Y</span>
          </div>
          <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800/50">
            <span>Copiar / Colar</span>
            <span className="font-mono text-slate-200 font-bold">Ctrl+C / V</span>
          </div>
          <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800/50">
            <span>Duplicar Peça</span>
            <span className="font-mono text-slate-200 font-bold">Ctrl+D</span>
          </div>
          <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800/50">
            <span>Salvar Marcador</span>
            <span className="font-mono text-amber-300 font-bold">Ctrl+S</span>
          </div>
          <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800/50">
            <span>Excluir Peça</span>
            <span className="font-mono text-rose-300 font-bold">Delete</span>
          </div>
          <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800/50">
            <span>Mover Peça</span>
            <span className="font-mono text-sky-300 font-bold">Setas (Shift=10px)</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RODAPÉ FIXO: APENAS UM BOTÃO DEFINITIVO DE SALVAR COMPOSIÇÃO */}
      {/* ============================================================== */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleTriggerSave}
          className="w-full py-3 px-4 bg-white hover:bg-zinc-200 text-black rounded-lg text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-black" />
          <span>Salvar Composição de Peças (Ctrl+S)</span>
        </button>

        {saveFeedback && (
          <p className="text-[11px] font-bold text-center text-emerald-400 mt-2 animate-pulse">
            {saveFeedback}
          </p>
        )}
      </div>

      {/* Modal Oficial da Galeria de Assets */}
      <AssetGalleryModal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        galleryAssets={galleryAssets}
        categories={galleryCategories}
        title={galleryTarget === 'replace_base' ? 'Trocar Imagem Base do Asset' : 'Adicionar Peça da Galeria'}
        subtitle="Selecione um asset do acervo oficial para utilizar no Motion Canvas"
        onSelectAsset={handleSelectFromGallery}
      />
    </div>
  );
};
