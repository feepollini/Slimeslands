import React, { useState, useRef, useEffect } from 'react';
import {
  MapMarker,
  InteractiveScreenConfig,
  StationSubAssetSlot,
  StationActivationTrigger,
  StationUnlockType,
  MapProject,
  GalleryAsset,
} from '../../types/map';
import {
  X,
  Plus,
  Minus,
  ZoomIn,
  ZoomOut,
  Sliders,
  Flame,
  Sparkles,
  Upload,
  Check,
  Lock,
  Eye,
  Layers,
  Settings,
  RotateCw,
  Trash2,
  Move,
  Maximize2,
  FolderOpen,
  Image as ImageIcon,
  Palette,
  Clock,
  Shield,
  Play,
  Copy,
  Bot,
  MessageSquare,
} from 'lucide-react';
import { MotionAssetCanvas } from '../MotionAssetCanvas';
import { EffectType } from '../../utils/motionCanvasEngine';
import { AssetGalleryModal } from '../AssetGalleryModal';
import {
  DEFAULT_INCUBATOR_SVG,
  EGG_GOLD_SVG,
  EGG_BLUE_SVG,
  EGG_RED_SVG,
  EGG_GREEN_SVG,
  DEFAULT_HATCHLING_SVG,
  createDefaultStationConfig,
} from '../../data/defaultStationAssets';

interface StationStudioCanvasModalProps {
  marker: MapMarker;
  project?: MapProject;
  galleryAssets?: GalleryAsset[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateMarker: (id: string, updates: Partial<MapMarker>) => void;
}

export const StationStudioCanvasModal: React.FC<StationStudioCanvasModalProps> = ({
  marker,
  project,
  galleryAssets = [],
  isOpen,
  onClose,
  onUpdateMarker,
}) => {
  if (!isOpen) return null;

  const currentConfig: InteractiveScreenConfig =
    marker.stationConfig || createDefaultStationConfig('incubator');

  const [stationConfig, setStationConfig] = useState<InteractiveScreenConfig>(currentConfig);
  // Qual aba lateral está ativa: 'selection' (Seleção), 'screen' (Controles da Tela), 'return' (Retorno & Ações)
  const [activeSideTab, setActiveSideTab] = useState<'selection' | 'screen' | 'return'>('selection');
  // Alvo selecionado: 'base' para a Chocadeira/Base, ou número para o Slot
  const [selectedTarget, setSelectedTarget] = useState<'base' | number>(0);
  const [previewMode, setPreviewMode] = useState<'edit' | 'running' | 'result'>('edit');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [showEggsInPreview, setShowEggsInPreview] = useState<boolean>(true);

  // Modal de Galeria
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const galleryTargetRef = useRef<'base' | 'slot' | 'result' | 'palette'>('base');

  // Dragging de movimentação de slot no canvas
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const [isDraggingSlot, setIsDraggingSlot] = useState<boolean>(false);
  const activeDragSlotIdRef = useRef<string | null>(null);

  // Dragging de redimensionamento da BASE PNG pelas quinas
  const [isResizingBase, setIsResizingBase] = useState<boolean>(false);
  const resizeBaseStartRef = useRef<{
    centerX: number;
    centerY: number;
  } | null>(null);

  // Dragging de redimensionamento do OVO / SLOT pelas quinas
  const [isResizingSlot, setIsResizingSlot] = useState<boolean>(false);
  const resizeSlotStartRef = useRef<{
    slotId: string;
    centerX: number;
    centerY: number;
  } | null>(null);

  // Dragging de rotação do OVO / SLOT pelo knob
  const [isRotatingSlot, setIsRotatingSlot] = useState<boolean>(false);
  const rotateSlotStartRef = useRef<{
    slotId: string;
    centerX: number;
    centerY: number;
  } | null>(null);

  // Hidden upload inputs
  const baseUploadRef = useRef<HTMLInputElement>(null);
  const resultUploadRef = useRef<HTMLInputElement>(null);
  const slotUploadRef = useRef<HTMLInputElement>(null);
  const paletteUploadRef = useRef<HTMLInputElement>(null);
  const slotResultUploadRef = useRef<HTMLInputElement>(null);
  const activeSlotResultUploadIdxRef = useRef<number | null>(null);
  const [returnSubTab, setReturnSubTab] = useState<'global' | 'per_egg'>('global');

  useEffect(() => {
    if (marker.stationConfig) {
      setStationConfig(marker.stationConfig);
    }
  }, [marker.id]);

  const updateConfig = (updates: Partial<InteractiveScreenConfig>) => {
    const updated = { ...stationConfig, ...updates };
    setStationConfig(updated);
    onUpdateMarker(marker.id, {
      stationConfig: updated,
      customIconPng: updates.baseAssetPng || marker.customIconPng,
    });
  };

  const slots = stationConfig.slots || [];
  const selectedSlotIndex = typeof selectedTarget === 'number' ? selectedTarget : null;
  const selectedSlot = selectedSlotIndex !== null ? slots[selectedSlotIndex] || null : null;

  const updateSelectedSlot = (updates: Partial<StationSubAssetSlot>) => {
    if (selectedSlotIndex === null || !selectedSlot) return;
    const newSlots = slots.map((s, idx) => (idx === selectedSlotIndex ? { ...s, ...updates } : s));
    updateConfig({ slots: newSlots });
  };

  const removeSelectedSlot = () => {
    if (selectedSlotIndex === null) return;
    const newSlots = slots.filter((_, idx) => idx !== selectedSlotIndex);
    updateConfig({ slots: newSlots, slotsCount: newSlots.length });
    if (newSlots.length > 0) {
      setSelectedTarget(Math.max(0, selectedSlotIndex - 1));
    } else {
      setSelectedTarget('base');
    }
  };

  // Funções de alinhamento visual de slots
  const applyPresetLayout = (layout: 'circle' | 'line' | 'arc' | 'grid') => {
    const count = stationConfig.slotsCount || slots.length || 6;
    let newSlots: StationSubAssetSlot[] = [];

    if (layout === 'circle') {
      newSlots = Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
        return {
          id: `slot-${i + 1}`,
          name: `Slot ${i + 1}`,
          offsetX: Math.round(Math.cos(angle) * 26),
          offsetY: Math.round(Math.sin(angle) * 16),
          scale: 0.52,
          rotation: Math.round((angle * 180) / Math.PI + 90),
          currentAssetPng: slots[i]?.currentAssetPng || EGG_GOLD_SVG,
          currentAssetName: slots[i]?.currentAssetName || 'Ovo',
        };
      });
    } else if (layout === 'line') {
      const spacing = 60 / Math.max(1, count - 1);
      newSlots = Array.from({ length: count }, (_, i) => ({
        id: `slot-${i + 1}`,
        name: `Slot ${i + 1}`,
        offsetX: Math.round(-30 + i * spacing),
        offsetY: 0,
        scale: 0.5,
        rotation: 0,
        currentAssetPng: slots[i]?.currentAssetPng || EGG_GOLD_SVG,
        currentAssetName: slots[i]?.currentAssetName || 'Ovo',
      }));
    } else if (layout === 'arc') {
      newSlots = Array.from({ length: count }, (_, i) => {
        const progress = count > 1 ? i / (count - 1) : 0.5;
        const angle = Math.PI * 0.2 + progress * Math.PI * 0.6;
        return {
          id: `slot-${i + 1}`,
          name: `Slot ${i + 1}`,
          offsetX: Math.round(Math.cos(angle) * 28),
          offsetY: Math.round(-Math.sin(angle) * 28 * 0.65),
          scale: 0.52,
          rotation: Math.round((progress - 0.5) * 40),
          currentAssetPng: slots[i]?.currentAssetPng || EGG_GOLD_SVG,
          currentAssetName: slots[i]?.currentAssetName || 'Ovo',
        };
      });
    } else {
      const cols = 2;
      newSlots = Array.from({ length: count }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return {
          id: `slot-${i + 1}`,
          name: `Slot ${i + 1}`,
          offsetX: col === 0 ? -22 : 22,
          offsetY: Math.round(-18 + row * 18),
          scale: 0.5,
          rotation: 0,
          currentAssetPng: slots[i]?.currentAssetPng || EGG_GOLD_SVG,
          currentAssetName: slots[i]?.currentAssetName || 'Ovo',
        };
      });
    }

    updateConfig({ slots: newSlots, slotsCount: count });
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (dataUrl: string, name: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSuccess(reader.result, file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Abre galeria com alvo definido
  const handleOpenGalleryFor = (target: 'base' | 'slot' | 'result' | 'palette' | string) => {
    galleryTargetRef.current = target as any;
    setIsGalleryOpen(true);
  };

  const handleSelectFromGallery = (dataUrl: string, assetName?: string) => {
    const target = galleryTargetRef.current as string;
    if (target === 'base') {
      updateConfig({ baseAssetPng: dataUrl });
    } else if (target === 'slot') {
      updateSelectedSlot({ currentAssetPng: dataUrl, currentAssetName: assetName || 'Item' });
    } else if (target === 'result') {
      updateConfig({ resultAssetPng: dataUrl, resultAssetName: assetName || 'Resultado' });
    } else if (target?.startsWith('slot_result_')) {
      const slotIdx = parseInt(target.replace('slot_result_', ''));
      if (!isNaN(slotIdx) && slots[slotIdx]) {
        const updated = [...slots];
        updated[slotIdx] = {
          ...updated[slotIdx],
          resultAssetPng: dataUrl,
          resultAssetName: assetName || updated[slotIdx].resultAssetName || `Criatura #${slotIdx + 1}`,
        };
        updateConfig({ slots: updated });
      }
    } else if (target === 'palette') {
      const currentPalette = stationConfig.availablePaletteAssets || [];
      const newPalette = [
        ...currentPalette,
        { id: `pal-${Date.now()}`, name: assetName || 'Novo Item', pngUrl: dataUrl },
      ];
      updateConfig({ availablePaletteAssets: newPalette });
    }
    setIsGalleryOpen(false);
  };

  // ==================== PONTEIROS E GIZMOS ====================

  // Início do arraste do slot (corpo)
  const handlePointerDownSlot = (e: React.PointerEvent, slotId: string, idx: number) => {
    e.stopPropagation();
    setSelectedTarget(idx);
    setActiveSideTab('selection');
    setIsDraggingSlot(true);
    activeDragSlotIdRef.current = slotId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Início do redimensionamento interativo do OVO / SLOT pelas 4 quinas
  const handlePointerDownSlotResize = (e: React.PointerEvent, slotId: string) => {
    e.stopPropagation();
    if (!canvasViewportRef.current) return;
    const targetEl = (e.target as HTMLElement).closest('[data-slot-container="true"]');
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    setIsResizingSlot(true);
    resizeSlotStartRef.current = { slotId, centerX, centerY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Início da rotação interativa do OVO / SLOT pelo knob
  const handlePointerDownSlotRotate = (e: React.PointerEvent, slotId: string) => {
    e.stopPropagation();
    if (!canvasViewportRef.current) return;
    const targetEl = (e.target as HTMLElement).closest('[data-slot-container="true"]');
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    setIsRotatingSlot(true);
    rotateSlotStartRef.current = { slotId, centerX, centerY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Início do redimensionamento interativo da Base PNG pelas 4 quinas
  const handlePointerDownBaseResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!canvasViewportRef.current) return;
    const rect = canvasViewportRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    setIsResizingBase(true);
    resizeBaseStartRef.current = { centerX, centerY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Movimento no Canvas (despacha para o gizmo ativo)
  const handlePointerMoveCanvas = (e: React.PointerEvent) => {
    // 1. Redimensionamento da Base PNG por arraste de quina
    if (isResizingBase && resizeBaseStartRef.current) {
      const { centerX, centerY } = resizeBaseStartRef.current;
      const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      // Nominal 140px raio com zoom 1.0
      const targetScale = Math.max(0.4, Math.min(2.5, (dist / 140) / zoomLevel));
      const roundedScale = Math.round(targetScale * 100) / 100;
      updateConfig({ baseAssetScale: roundedScale });
      return;
    }

    // 2. Redimensionamento do OVO / SLOT por arraste de quina (Gizmo de Tamanho do Ovo)
    if (isResizingSlot && resizeSlotStartRef.current) {
      const { slotId, centerX, centerY } = resizeSlotStartRef.current;
      const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      const baseVisualSize = 280 * (stationConfig.baseAssetScale || 1.0) * zoomLevel;
      // Escala nominal relativa ao tamanho da base
      const targetScale = Math.max(0.18, Math.min(1.5, (dist * 2) / baseVisualSize));
      const roundedScale = Math.round(targetScale * 100) / 100;

      const newSlots = slots.map((s) => (s.id === slotId ? { ...s, scale: roundedScale } : s));
      updateConfig({ slots: newSlots });
      return;
    }

    // 3. Rotação do OVO / SLOT pelo knob de rotação
    if (isRotatingSlot && rotateSlotStartRef.current) {
      const { slotId, centerX, centerY } = rotateSlotStartRef.current;
      const rad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      let deg = Math.round((rad * 180) / Math.PI) + 90; // Topo é 0 deg
      if (deg > 180) deg -= 360;
      if (deg < -180) deg += 360;

      const newSlots = slots.map((s) => (s.id === slotId ? { ...s, rotation: deg } : s));
      updateConfig({ slots: newSlots });
      return;
    }

    // 4. Arraste de pino de slot (Posicionamento)
    if (isDraggingSlot && activeDragSlotIdRef.current && canvasViewportRef.current) {
      const rect = canvasViewportRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const baseVisualSize = 280 * (stationConfig.baseAssetScale || 1.0) * zoomLevel;
      const relX = ((e.clientX - centerX) / (baseVisualSize / 2)) * 50;
      const relY = ((e.clientY - centerY) / (baseVisualSize / 2)) * 50;

      const clampedX = Math.round(Math.max(-75, Math.min(75, relX)));
      const clampedY = Math.round(Math.max(-75, Math.min(75, relY)));

      const newSlots = slots.map((s) =>
        s.id === activeDragSlotIdRef.current ? { ...s, offsetX: clampedX, offsetY: clampedY } : s
      );
      updateConfig({ slots: newSlots });
    }
  };

  const handlePointerUpCanvas = () => {
    setIsDraggingSlot(false);
    activeDragSlotIdRef.current = null;
    setIsResizingBase(false);
    resizeBaseStartRef.current = null;
    setIsResizingSlot(false);
    resizeSlotStartRef.current = null;
    setIsRotatingSlot(false);
    rotateSlotStartRef.current = null;
  };

  const baseImg = stationConfig.baseAssetPng || DEFAULT_INCUBATOR_SVG;
  const baseScale = stationConfig.baseAssetScale || 1.0;
  const activationTrigger = stationConfig.activationTrigger || 'both';
  const triggerRadius = stationConfig.triggerRadius ?? 80;
  const unlockCondition = stationConfig.unlockCondition || { type: 'always' };

  // Tamanho visual da base renderizada no canvas
  const baseRenderPx = Math.round(280 * baseScale * zoomLevel);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4 bg-slate-950/95 backdrop-blur-xl select-none animate-fadeIn">
      {/* Hidden file inputs para upload direto de PNG */}
      <input
        ref={baseUploadRef}
        type="file"
        accept="image/png,image/webp,image/jpeg,image/svg+xml"
        className="hidden"
        onChange={(e) => handleFileUpload(e, (dataUrl) => updateConfig({ baseAssetPng: dataUrl }))}
      />
      <input
        ref={resultUploadRef}
        type="file"
        accept="image/png,image/webp,image/jpeg,image/svg+xml"
        className="hidden"
        onChange={(e) =>
          handleFileUpload(e, (dataUrl, name) =>
            updateConfig({ resultAssetPng: dataUrl, resultAssetName: name })
          )
        }
      />
      <input
        ref={slotUploadRef}
        type="file"
        accept="image/png,image/webp,image/jpeg,image/svg+xml"
        className="hidden"
        onChange={(e) =>
          handleFileUpload(e, (dataUrl, name) =>
            updateSelectedSlot({ currentAssetPng: dataUrl, currentAssetName: name })
          )
        }
      />
      <input
        ref={slotResultUploadRef}
        type="file"
        accept="image/png,image/webp,image/jpeg,image/svg+xml"
        className="hidden"
        onChange={(e) =>
          handleFileUpload(e, (dataUrl, name) => {
            const idx = activeSlotResultUploadIdxRef.current;
            if (idx !== null && slots[idx]) {
              const updated = [...slots];
              updated[idx] = {
                ...updated[idx],
                resultAssetPng: dataUrl,
                resultAssetName: name || updated[idx].resultAssetName || `Criatura #${idx + 1}`,
              };
              updateConfig({ slots: updated });
            }
          })
        }
      />
      <input
        ref={paletteUploadRef}
        type="file"
        accept="image/png,image/webp,image/jpeg,image/svg+xml"
        className="hidden"
        onChange={(e) =>
          handleFileUpload(e, (dataUrl, name) => {
            const currentPalette = stationConfig.availablePaletteAssets || [];
            updateConfig({
              availablePaletteAssets: [
                ...currentPalette,
                { id: `pal-${Date.now()}`, name, pngUrl: dataUrl },
              ],
            });
          })
        }
      />

      {/* MODAL DE GALERIA OFICIAL DO PROJETO */}
      {isGalleryOpen && (
        <AssetGalleryModal
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
          onSelectAsset={handleSelectFromGallery}
          galleryAssets={galleryAssets.length > 0 ? galleryAssets : project?.galleryAssets || []}
          categories={project?.galleryCategories || []}
          onUploadNewAsset={(newAsset) => {
            if (project) {
              project.galleryAssets = [newAsset, ...(project.galleryAssets || [])];
            }
          }}
          onUploadMultipleAssets={(newAssets, newCategories) => {
            if (project) {
              project.galleryAssets = [...newAssets, ...(project.galleryAssets || [])];
              const cats = new Set(project.galleryCategories || ['Geral']);
              newCategories.forEach((c) => cats.add(c));
              project.galleryCategories = Array.from(cats);
            }
          }}
          title="Galeria de Assets do Projeto"
          subtitle="Escolha um PNG ou importe pastas completas já agrupadas por categoria"
        />
      )}

      {/* ========================================================================= */}
      {/* CONTAINER PRINCIPAL DO STUDIO: CANVAS À ESQUERDA + MENU LATERAL À DIREITA  */}
      {/* ========================================================================= */}
      <div className="w-full h-full max-w-[1650px] max-h-[960px] bg-slate-950 border border-amber-500/30 rounded-3xl shadow-2xl relative flex overflow-hidden text-slate-100">
        
        {/* ==================== SEÇÃO 1: CANVAS CENTRAL ==================== */}
        <div className="flex-1 h-full relative flex flex-col overflow-hidden">
          
          {/* FLOATING TOP TOOLBAR NO CANVAS */}
          <header className="absolute top-4 inset-x-6 z-40 flex items-center justify-between pointer-events-none">
            {/* Identificação */}
            <div className="pointer-events-auto flex items-center gap-2">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-xl">
                <span className="text-xl select-none">🥚</span>
                <div>
                  <div className="flex items-center gap-1.5 font-black text-xs text-amber-300">
                    <span>{marker.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({slots.length} slots)</span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Canvas Studio</div>
                </div>
              </div>

              {/* Alternador Rápido de Pré-Visualização */}
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-xl">
                <button
                  type="button"
                  onClick={() => setPreviewMode('edit')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewMode === 'edit'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('running')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewMode === 'running'
                      ? 'bg-orange-500 text-white font-black shadow-md animate-pulse'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-orange-200" />
                  <span>Aquecer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('result')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewMode === 'result'
                      ? 'bg-emerald-400 text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-950" />
                  <span>Eclodir</span>
                </button>
              </div>
            </div>

            {/* Controles de Zoom e Atalho para Base PNG */}
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedTarget('base');
                  setActiveSideTab('selection');
                }}
                className={`px-3 py-1.5 rounded-2xl backdrop-blur-md border shadow-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  selectedTarget === 'base'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                    : 'bg-slate-900/90 border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Base: {Math.round(baseScale * 100)}%</span>
              </button>

              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-xl">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                  title="Menos Zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-xs font-bold text-slate-300 w-9 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(2.0, Math.round((z + 0.1) * 10) / 10))}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                  title="Mais Zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Botão Concluir & Salvar */}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 active:scale-95 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer ml-1"
              >
                <Check className="w-4 h-4" />
                <span>Concluir</span>
              </button>
            </div>
          </header>

          {/* O CANVAS VIEWPORT INTERATIVO COM GIZMOS */}
          <main
            ref={canvasViewportRef}
            onPointerMove={handlePointerMoveCanvas}
            onPointerUp={handlePointerUpCanvas}
            onClick={() => {
              // Clique no fundo vazio seleciona a Base da estação
              setSelectedTarget('base');
            }}
            className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center cursor-default select-none"
            style={{
              backgroundImage: `
                radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.45) 0%, rgba(2, 6, 23, 0.98) 100%),
                radial-gradient(rgba(245, 158, 11, 0.15) 1px, transparent 1px)
              `,
              backgroundSize: '100% 100%, 28px 28px',
            }}
          >
            {/* Eixos Centrais */}
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-amber-500/15 pointer-events-none" />
            <div className="absolute inset-y-0 left-1/2 w-[1px] bg-amber-500/15 pointer-events-none" />

            {/* Anel de Alcance da Proximidade */}
            {(activationTrigger === 'proximity' || activationTrigger === 'both') && (
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-amber-400/25 pointer-events-none flex items-center justify-center"
                style={{
                  width: triggerRadius * 2 * zoomLevel,
                  height: triggerRadius * 2 * zoomLevel,
                  backgroundColor: 'rgba(245, 158, 11, 0.015)',
                }}
              />
            )}

            {/* ================= APARATO DA BASE PNG ================= */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTarget('base');
                setActiveSideTab('selection');
              }}
              className={`relative flex items-center justify-center transition-shadow cursor-pointer ${
                selectedTarget === 'base' ? 'ring-2 ring-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.3)]' : ''
              }`}
              style={{
                width: `${baseRenderPx}px`,
                height: `${baseRenderPx}px`,
              }}
            >
              {/* 4 QUINAS DO GIZMO DE TAMANHO DA BASE PNG */}
              {selectedTarget === 'base' && (
                <>
                  <div
                    onPointerDown={handlePointerDownBaseResize}
                    className="absolute -top-2 -left-2 w-4 h-4 rounded-sm bg-amber-400 border-2 border-slate-950 shadow-md cursor-nwse-resize hover:scale-125 transition-transform z-50"
                    title="Arraste para redimensionar a Base PNG"
                  />
                  <div
                    onPointerDown={handlePointerDownBaseResize}
                    className="absolute -top-2 -right-2 w-4 h-4 rounded-sm bg-amber-400 border-2 border-slate-950 shadow-md cursor-nesw-resize hover:scale-125 transition-transform z-50"
                    title="Arraste para redimensionar a Base PNG"
                  />
                  <div
                    onPointerDown={handlePointerDownBaseResize}
                    className="absolute -bottom-2 -left-2 w-4 h-4 rounded-sm bg-amber-400 border-2 border-slate-950 shadow-md cursor-nesw-resize hover:scale-125 transition-transform z-50"
                    title="Arraste para redimensionar a Base PNG"
                  />
                  <div
                    onPointerDown={handlePointerDownBaseResize}
                    className="absolute -bottom-2 -right-2 w-4 h-4 rounded-sm bg-amber-400 border-2 border-slate-950 shadow-md cursor-nwse-resize hover:scale-125 transition-transform z-50"
                    title="Arraste para redimensionar a Base PNG"
                  />
                </>
              )}

              {/* Halo de Calor em Simulação */}
              {previewMode === 'running' && (
                <div
                  className="absolute inset-[-15%] rounded-full pointer-events-none animate-pulse -z-10"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(251, 146, 60, 0.45) 0%, rgba(245, 158, 11, 0.2) 50%, transparent 75%)',
                    filter: 'blur(12px)',
                  }}
                />
              )}

              {/* Imagem Base da Estação */}
              {stationConfig.baseMotionEffect && stationConfig.baseMotionEffect !== 'none' ? (
                <MotionAssetCanvas
                  src={baseImg}
                  alt={marker.name}
                  effect={stationConfig.baseMotionEffect as EffectType}
                  speed={stationConfig.baseMotionSpeed || 1.0}
                  intensity={stationConfig.baseMotionIntensity || 1.0}
                  width={baseRenderPx}
                  height={baseRenderPx}
                  className="w-full h-full object-contain filter drop-shadow-[0_12px_30px_rgba(0,0,0,0.85)] pointer-events-none"
                />
              ) : (
                <img
                  src={baseImg}
                  alt="Base"
                  className="w-full h-full object-contain filter drop-shadow-[0_12px_30px_rgba(0,0,0,0.85)] pointer-events-none"
                />
              )}

              {/* Modo Eclosão Final */}
              {previewMode === 'result' ? (
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 animate-bounce flex flex-col items-center justify-center"
                  style={{
                    width: `${baseRenderPx * 0.75}px`,
                    height: `${baseRenderPx * 0.75}px`,
                    animationDuration: '1.2s',
                  }}
                >
                  <div
                    className="absolute inset-[-20%] rounded-full pointer-events-none animate-spin"
                    style={{
                      background:
                        'radial-gradient(circle, rgba(254, 240, 138, 0.6) 0%, rgba(251, 191, 36, 0.25) 45%, transparent 75%)',
                      filter: 'blur(8px)',
                      animationDuration: '8s',
                    }}
                  />
                  <img
                    src={stationConfig.resultAssetPng || DEFAULT_HATCHLING_SVG}
                    alt="Resultado"
                    className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]"
                  />
                  <div className="mt-2 px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-full shadow-lg">
                    ✨ {stationConfig.resultAssetName || 'Pintinho Mítico'}
                  </div>
                </div>
              ) : (
                /* ================= PINOS E OVOS DOS SLOTS COM GIZMO ================= */
                slots.map((slot, idx) => {
                  const isSelected = selectedTarget === idx;
                  const slotScale = slot.scale ?? 0.52;
                  const eggSize = baseRenderPx * slotScale;

                  const offX = (slot.offsetX / 100) * baseRenderPx;
                  const offY = (slot.offsetY / 100) * baseRenderPx;

                  return (
                    <div
                      key={slot.id}
                      data-slot-container="true"
                      onPointerDown={(e) => handlePointerDownSlot(e, slot.id, idx)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTarget(idx);
                        setActiveSideTab('selection');
                      }}
                      className={`absolute flex items-center justify-center cursor-pointer transition-shadow ${
                        isSelected ? 'z-40' : 'z-20'
                      }`}
                      style={{
                        left: `calc(50% + ${offX}px)`,
                        top: `calc(50% + ${offY}px)`,
                        width: `${eggSize}px`,
                        height: `${eggSize}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {/* GIZMO DE SELEÇÃO, TAMANHO E ROTAÇÃO DO OVO */}
                      {isSelected && (
                        <div
                          className="absolute inset-0 border-2 border-amber-400 border-dashed rounded-2xl pointer-events-none shadow-[0_0_20px_rgba(245,158,11,0.6)]"
                          style={{
                            transform: `rotate(${slot.rotation || 0}deg)`,
                          }}
                        >
                          {/* 4 Quinas de Redimensionamento do Ovo */}
                          <div
                            onPointerDown={(e) => handlePointerDownSlotResize(e, slot.id)}
                            className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-sm bg-amber-400 border-2 border-slate-950 pointer-events-auto cursor-nwse-resize hover:scale-125 transition-transform"
                            title="Arraste para redimensionar o Ovo"
                          />
                          <div
                            onPointerDown={(e) => handlePointerDownSlotResize(e, slot.id)}
                            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-sm bg-amber-400 border-2 border-slate-950 pointer-events-auto cursor-nesw-resize hover:scale-125 transition-transform"
                            title="Arraste para redimensionar o Ovo"
                          />
                          <div
                            onPointerDown={(e) => handlePointerDownSlotResize(e, slot.id)}
                            className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 rounded-sm bg-amber-400 border-2 border-slate-950 pointer-events-auto cursor-nesw-resize hover:scale-125 transition-transform"
                            title="Arraste para redimensionar o Ovo"
                          />
                          <div
                            onPointerDown={(e) => handlePointerDownSlotResize(e, slot.id)}
                            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-sm bg-amber-400 border-2 border-slate-950 pointer-events-auto cursor-nwse-resize hover:scale-125 transition-transform"
                            title="Arraste para redimensionar o Ovo"
                          />

                          {/* Knob Superior de Rotação do Ovo */}
                          <div
                            onPointerDown={(e) => handlePointerDownSlotRotate(e, slot.id)}
                            className="absolute -top-7 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-amber-400 border-2 border-slate-950 pointer-events-auto cursor-grab hover:scale-125 transition-transform flex items-center justify-center shadow-md"
                            title="Arraste para girar o Ovo"
                          >
                            <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
                          </div>
                          {/* Linha guia até o knob */}
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-[1.5px] h-3 bg-amber-400 pointer-events-none" />
                        </div>
                      )}

                      {/* Imagem do Ovo / Sub-Asset */}
                      {showEggsInPreview && slot.currentAssetPng && (
                        <div
                          className={`w-full h-full pointer-events-none flex items-center justify-center ${
                            previewMode === 'running' ? 'animate-bounce' : ''
                          }`}
                          style={{
                            transform: `rotate(${slot.rotation || 0}deg)`,
                            animationDuration: previewMode === 'running' ? '0.6s' : undefined,
                          }}
                        >
                          <img
                            src={slot.currentAssetPng}
                            alt={slot.name}
                            className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]"
                          />
                        </div>
                      )}

                      {/* Pino Numerado de Seleção Rápida */}
                      <div
                        className={`absolute w-7 h-7 rounded-full flex items-center justify-center font-black text-xs transition-all shadow-xl pointer-events-auto ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/60 scale-125'
                            : 'bg-slate-900/90 text-amber-300 border-2 border-amber-400/60 hover:scale-110'
                        }`}
                        title={`Slot #${idx + 1}`}
                      >
                        {idx + 1}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </main>

          {/* DOCK INFERIOR NO CANVAS (PRESETS DE FORMAÇÃO E SLOTS) */}
          <footer className="absolute bottom-4 inset-x-6 z-40 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-2xl">
              {/* Presets */}
              <div className="flex items-center gap-1 border-r border-slate-800 pr-3">
                <button
                  type="button"
                  onClick={() => applyPresetLayout('circle')}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Formação Ninho Circular"
                >
                  <span>⭕ Ninho</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetLayout('arc')}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-teal-300 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Formação Arco"
                >
                  <span>🪜 Arco</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetLayout('line')}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-purple-300 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Formação Linha"
                >
                  <span>➖ Linha</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetLayout('grid')}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Formação Grade"
                >
                  <span>💠 Grade</span>
                </button>
              </div>

              {/* Quantidade de Slots */}
              <div className="flex items-center gap-1.5 border-r border-slate-800 pr-3">
                <button
                  type="button"
                  disabled={slots.length <= 1}
                  onClick={() => {
                    if (slots.length <= 1) return;
                    const newSlots = slots.slice(0, slots.length - 1);
                    updateConfig({ slots: newSlots, slotsCount: newSlots.length });
                    if (selectedSlotIndex !== null && selectedSlotIndex >= newSlots.length) {
                      setSelectedTarget(newSlots.length - 1);
                    }
                  }}
                  className="p-1 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 cursor-pointer disabled:opacity-30 transition-colors"
                  title="Remover Slot"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-xs font-black text-amber-300 px-1">
                  {slots.length} Slots
                </span>
                <button
                  type="button"
                  disabled={slots.length >= 8}
                  onClick={() => {
                    if (slots.length >= 8) return;
                    const nextId = `slot-${slots.length + 1}`;
                    const newSlots = [
                      ...slots,
                      {
                        id: nextId,
                        name: `Slot ${slots.length + 1}`,
                        offsetX: 0,
                        offsetY: 0,
                        scale: 0.52,
                        rotation: 0,
                        currentAssetPng: EGG_GOLD_SVG,
                        currentAssetName: 'Ovo Dourado',
                      },
                    ];
                    updateConfig({ slots: newSlots, slotsCount: newSlots.length });
                    setSelectedTarget(newSlots.length - 1);
                  }}
                  className="p-1 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 cursor-pointer disabled:opacity-30 transition-colors"
                  title="Adicionar Slot"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Pílulas de Seleção Rápida */}
              <div className="flex items-center gap-1">
                {slots.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedTarget(idx);
                      setActiveSideTab('selection');
                    }}
                    className={`w-7 h-7 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center ${
                      selectedTarget === idx
                        ? 'bg-amber-400 text-slate-950 font-black shadow-md scale-110'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              {/* Toggle de Visualização de Ovos */}
              <button
                type="button"
                onClick={() => setShowEggsInPreview((v) => !v)}
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ml-1 ${
                  showEggsInPreview
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
                title="Alternar Ovos Visíveis / Apenas Pinos"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </footer>
        </div>

        {/* ========================================================================= */}
        {/* SEÇÃO 2: O MENU LATERAL DEDICADO COM SUB-ABAS (ESSENCIAL)                  */}
        {/* ========================================================================= */}
        <aside className="w-96 h-full bg-slate-900/95 border-l border-amber-500/25 flex flex-col z-50 shrink-0 backdrop-blur-xl text-xs overflow-hidden">
          
          {/* BARRA DE NAVEGAÇÃO DE SUB-ABAS NO MENU LATERAL */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/70">
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSideTab('selection')}
                className={`py-2 px-1 rounded-lg font-black text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeSideTab === 'selection'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Propriedades visuais do item selecionado"
              >
                <span>🎯</span>
                <span>Seleção</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSideTab('screen')}
                className={`py-2 px-1 rounded-lg font-black text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeSideTab === 'screen'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Controles da Tela, Tempo e Desbloqueio"
              >
                <span>⚙️</span>
                <span>Tela & Regras</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSideTab('return')}
                className={`py-2 px-1 rounded-lg font-black text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeSideTab === 'return'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Asset de Retorno / Eclosão e Paleta"
              >
                <span>✨</span>
                <span>Retorno</span>
              </button>
            </div>
          </div>

          {/* CORPO DO MENU LATERAL COM SCROLL SUAVE */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* ========================================================================= */}
            {/* SUB-ABA 1: 🎯 SELEÇÃO / VISUAL DO ITEM SELECIONADO                         */}
            {/* ========================================================================= */}
            {activeSideTab === 'selection' && (
              <div className="space-y-4">
                {/* 1. SELETOR DE ALVO (Base vs Slots) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Alvo Ativo:
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedTarget('base')}
                      className={`flex-1 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                        selectedTarget === 'base'
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      🏢 Base da Estação
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTarget(0)}
                      className={`flex-1 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                        typeof selectedTarget === 'number'
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      🥚 Slot #{typeof selectedTarget === 'number' ? selectedTarget + 1 : 1}
                    </button>
                  </div>

                  {/* Pílulas de Slots para troca rápida dentro da aba de seleção */}
                  {typeof selectedTarget === 'number' && (
                    <div className="flex items-center gap-1 pt-1">
                      {slots.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedTarget(idx)}
                          className={`flex-1 py-1 rounded-lg font-black text-[11px] transition-all cursor-pointer ${
                            selectedTarget === idx
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ---------------- CASO 1: BASE DA ESTAÇÃO SELECIONADA ---------------- */}
                {selectedTarget === 'base' ? (
                  <div className="space-y-4">
                    {/* Preview da Base PNG */}
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300 text-xs">Imagem Base da Estação:</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {Math.round(baseScale * 100)}% ({baseRenderPx}px)
                        </span>
                      </div>

                      <div className="w-full h-36 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center p-2 relative overflow-hidden group">
                        <img
                          src={baseImg}
                          alt="Base"
                          className="w-full h-full object-contain filter drop-shadow-md"
                        />
                      </div>

                      {/* BOTÕES DE INSERIR / TROCAR PNG */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => baseUploadRef.current?.click()}
                          className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 active:scale-95 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Inserir PNG</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenGalleryFor('base')}
                          className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-300 border border-amber-500/40 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Galeria</span>
                        </button>
                      </div>
                    </div>

                    {/* Tamanho da Base PNG */}
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-300 flex items-center gap-1">
                          <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Tamanho da Base PNG:</span>
                        </span>
                        <span className="font-mono font-bold text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {Math.round(baseScale * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="220"
                        step="5"
                        value={Math.round(baseScale * 100)}
                        onChange={(e) => updateConfig({ baseAssetScale: parseInt(e.target.value) / 100 })}
                        className="w-full accent-amber-400 cursor-pointer h-2"
                      />
                      <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                        <span>40% (Compacto)</span>
                        <span>100% (Padrão)</span>
                        <span>220% (Gigante)</span>
                      </div>
                    </div>

                    {/* Efeito Motion Canvas da Base */}
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-300 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Efeito Motion da Base:</span>
                        </span>
                      </div>
                      <select
                        value={stationConfig.baseMotionEffect || 'none'}
                        onChange={(e) => updateConfig({ baseMotionEffect: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-amber-300 font-bold outline-none"
                      >
                        <option value="none">Estático (Sem Motion)</option>
                        <option value="jelly">🍮 Gelatina (Jelly Bounce)</option>
                        <option value="breathe">🫁 Respiração (Breathe)</option>
                        <option value="water">🌊 Ondulação Aquática (Water)</option>
                        <option value="fire">🔥 Fogo / Brasas (Fire)</option>
                        <option value="glow">✨ Pulso de Brilho (Glow)</option>
                        <option value="float">🎈 Flutuação Suave (Float)</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  /* ---------------- CASO 2: SLOT ESPECÍFICO SELECIONADO ---------------- */
                  selectedSlot && (
                    <div className="space-y-4">
                      {/* Preview do PNG do Slot */}
                      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-amber-300 text-xs">
                            Asset do Slot #{selectedSlotIndex! + 1}:
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {selectedSlot.currentAssetName || 'Item'}
                          </span>
                        </div>

                        <div className="w-full h-32 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center p-2 relative">
                          {selectedSlot.currentAssetPng ? (
                            <img
                              src={selectedSlot.currentAssetPng}
                              alt={selectedSlot.name}
                              className="w-full h-full object-contain filter drop-shadow-md"
                              style={{ transform: `rotate(${selectedSlot.rotation || 0}deg)` }}
                            />
                          ) : (
                            <span className="text-slate-400 text-xs">Nenhum PNG no Slot</span>
                          )}
                        </div>

                        {/* BOTÕES DE INSERIR / TROCAR PNG NO SLOT */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => slotUploadRef.current?.click()}
                            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 active:scale-95 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Inserir PNG</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenGalleryFor('slot')}
                            className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-300 border border-amber-500/40 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Galeria</span>
                          </button>
                        </div>

                        {/* Paleta Rápida de Ovos Pré-Definidos */}
                        <div className="pt-2 border-t border-slate-850">
                          <label className="text-[10px] text-slate-400 font-bold block mb-1.5">
                            Ovos Padrão (Troca Rápida):
                          </label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[
                              { name: 'Dourado', url: EGG_GOLD_SVG },
                              { name: 'Cósmico', url: EGG_BLUE_SVG },
                              { name: 'Fogo', url: EGG_RED_SVG },
                              { name: 'Floresta', url: EGG_GREEN_SVG },
                            ].map((item) => (
                              <button
                                key={item.name}
                                type="button"
                                onClick={() =>
                                  updateSelectedSlot({
                                    currentAssetPng: item.url,
                                    currentAssetName: `Ovo ${item.name}`,
                                  })
                                }
                                className="p-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                              >
                                <img src={item.url} alt={item.name} className="w-6 h-6 object-contain" />
                                <span className="text-[9px] text-slate-400">{item.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Tamanho e Rotação do Item do Slot */}
                      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                        {/* Tamanho do Item */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-300 flex items-center gap-1">
                              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                              <span>Tamanho do Item / Ovo:</span>
                            </span>
                            <span className="font-mono font-bold text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {Math.round((selectedSlot.scale ?? 0.52) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="140"
                            value={Math.round((selectedSlot.scale ?? 0.52) * 100)}
                            onChange={(e) => updateSelectedSlot({ scale: parseInt(e.target.value) / 100 })}
                            className="w-full accent-amber-400 cursor-pointer h-2"
                          />
                        </div>

                        {/* Rotação / Inclinação */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-800">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-300 flex items-center gap-1">
                              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                              <span>Rotação:</span>
                            </span>
                            <span className="font-mono font-bold text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {selectedSlot.rotation || 0}°
                            </span>
                          </div>
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            value={selectedSlot.rotation || 0}
                            onChange={(e) => updateSelectedSlot({ rotation: parseInt(e.target.value) })}
                            className="w-full accent-amber-400 cursor-pointer h-2"
                          />
                        </div>

                        {/* Coordenadas X e Y */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[10px]">
                          <div>
                            <span className="text-slate-400 block mb-1">Posição X: {selectedSlot.offsetX}%</span>
                            <input
                              type="range"
                              min="-75"
                              max="75"
                              value={selectedSlot.offsetX}
                              onChange={(e) => updateSelectedSlot({ offsetX: parseInt(e.target.value) })}
                              className="w-full accent-amber-400 cursor-pointer h-1.5"
                            />
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-1">Posição Y: {selectedSlot.offsetY}%</span>
                            <input
                              type="range"
                              min="-75"
                              max="75"
                              value={selectedSlot.offsetY}
                              onChange={(e) => updateSelectedSlot({ offsetY: parseInt(e.target.value) })}
                              className="w-full accent-amber-400 cursor-pointer h-1.5"
                            />
                          </div>
                        </div>

                        {/* Botão de Excluir este Slot */}
                        <div className="pt-2 border-t border-slate-800 flex justify-end">
                          <button
                            type="button"
                            onClick={removeSelectedSlot}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir Slot #{selectedSlotIndex! + 1}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* SUB-ABA 2: ⚙️ CONTROLES DA TELA (REGRAS, TEMPO, GATILHOS E ACESSO)        */}
            {/* ========================================================================= */}
            {activeSideTab === 'screen' && (
              <div className="space-y-4">
                {/* Identificação da Tela */}
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                  <span className="font-black text-amber-300 text-xs block">Textos da Tela:</span>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Título da Tela:</label>
                    <input
                      type="text"
                      value={stationConfig.stationTitle || ''}
                      onChange={(e) => updateConfig({ stationTitle: e.target.value })}
                      placeholder="Ex: Chocadeira Mágica"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Instrução / Subtítulo:</label>
                    <input
                      type="text"
                      value={stationConfig.stationSubtitle || ''}
                      onChange={(e) => updateConfig({ stationSubtitle: e.target.value })}
                      placeholder="Ex: Insira os ovos no ninho aquecido e aguarde"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Tempo de Processamento */}
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Tempo de Incubação / Processo:</span>
                    </span>
                    <span className="font-mono font-bold text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {stationConfig.processTimeSeconds || 10}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="120"
                    value={stationConfig.processTimeSeconds || 10}
                    onChange={(e) => updateConfig({ processTimeSeconds: parseInt(e.target.value) || 1 })}
                    className="w-full accent-amber-400 cursor-pointer h-2"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>1s (Instantâneo)</span>
                    <span>10s</span>
                    <span>120s (2 min)</span>
                  </div>
                </div>

                {/* Gatilho de Ativação no Mapa */}
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                  <label className="text-[10px] text-slate-300 font-bold block">
                    Modo de Ativação no Mapa:
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['proximity', 'click', 'both'] as StationActivationTrigger[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updateConfig({ activationTrigger: mode })}
                        className={`py-2 rounded-xl text-center font-bold text-[10px] transition-all cursor-pointer border ${
                          activationTrigger === mode
                            ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {mode === 'proximity' && '🚶 Perto'}
                        {mode === 'click' && '👆 Toque'}
                        {mode === 'both' && '🔀 Ambos'}
                      </button>
                    ))}
                  </div>

                  {/* Raio de Proximidade */}
                  {(activationTrigger === 'proximity' || activationTrigger === 'both') && (
                    <div className="pt-2 border-t border-slate-850 space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Raio de Detecção:</span>
                        <span className="font-mono font-bold text-amber-300">{triggerRadius}px</span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="240"
                        step="5"
                        value={triggerRadius}
                        onChange={(e) => updateConfig({ triggerRadius: parseInt(e.target.value) })}
                        className="w-full accent-amber-400 cursor-pointer h-1.5"
                      />
                    </div>
                  )}
                </div>

                {/* Condições de Desbloqueio e Acesso */}
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                  <label className="text-[10px] text-slate-300 font-bold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Regra de Acesso / Desbloqueio:</span>
                  </label>
                  <select
                    value={unlockCondition.type}
                    onChange={(e) =>
                      updateConfig({
                        unlockCondition: {
                          ...unlockCondition,
                          type: e.target.value as StationUnlockType,
                        },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-amber-300 font-bold outline-none"
                  >
                    <option value="always">🔓 Livre para todos (Sempre Desbloqueado)</option>
                    <option value="level">🎖️ Requer Nível Mínimo do Herói</option>
                    <option value="purchased">💰 Compra / Custo em Recursos</option>
                    <option value="quest">📜 Requer Missão Cumprida</option>
                    <option value="event">⚡ Requer Evento Anterior</option>
                  </select>

                  {/* Nível Requerido */}
                  {unlockCondition.type === 'level' && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-300">Nível do Herói:</span>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={unlockCondition.minLevel || 3}
                        onChange={(e) =>
                          updateConfig({
                            unlockCondition: {
                              ...unlockCondition,
                              minLevel: parseInt(e.target.value) || 1,
                            },
                          })
                        }
                        className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-center font-mono font-black text-amber-300 text-xs"
                      />
                    </div>
                  )}

                  {/* Custo em Recursos */}
                  {unlockCondition.type === 'purchased' && (
                    <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Recurso:</span>
                        <input
                          type="text"
                          placeholder="Ex: Ouro"
                          value={unlockCondition.costResourceName || 'Ouro'}
                          onChange={(e) =>
                            updateConfig({
                              unlockCondition: {
                                ...unlockCondition,
                                costResourceName: e.target.value,
                              },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Preço:</span>
                        <input
                          type="number"
                          placeholder="50"
                          value={unlockCondition.costAmount || 50}
                          onChange={(e) =>
                            updateConfig({
                              unlockCondition: {
                                ...unlockCondition,
                                costAmount: parseInt(e.target.value) || 1,
                              },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-center font-mono font-black text-amber-300 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Mensagem quando Bloqueado */}
                  {unlockCondition.type !== 'always' && (
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">
                        Mensagem de Bloqueio no Jogo:
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 🔒 Requer nível superior para usar!"
                        value={unlockCondition.lockedMessage || ''}
                        onChange={(e) =>
                          updateConfig({
                            unlockCondition: {
                              ...unlockCondition,
                              lockedMessage: e.target.value,
                            },
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SUB-ABA 3: ✨ AÇÕES & RETORNO (ASSETS VINCULADOS E RESULTADO)             */}
            {/* ========================================================================= */}
            {activeSideTab === 'return' && (
              <div className="space-y-4">
                {/* SELETOR DE MODO DE SAÍDA: GERAL OU POR OVO (6 OVOS -> 6 SAÍDAS) */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setReturnSubTab('global')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      returnSubTab === 'global'
                        ? 'bg-amber-400 text-slate-950 font-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Saída Geral ({stationConfig.resultAssetName || 'Padrão'})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReturnSubTab('per_egg')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      returnSubTab === 'per_egg'
                        ? 'bg-amber-400 text-slate-950 font-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Por Ovo / Slot ({slots.length} Saídas)</span>
                  </button>
                </div>

                {/* --- MODO A: SAÍDA GERAL / PADRÃO --- */}
                {returnSubTab === 'global' && (
                  <div className="space-y-4 animate-fade-in">
                    {/* 1. ASSET DE RETORNO / RESULTADO APÓS O TEMPO */}
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-amber-300 text-xs flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Asset de Retorno Geral:</span>
                        </span>
                      </div>

                      <div className="w-full h-36 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center p-2 relative overflow-hidden">
                        <img
                          src={stationConfig.resultAssetPng || DEFAULT_HATCHLING_SVG}
                          alt="Resultado"
                          className="w-24 h-24 object-contain filter drop-shadow-[0_8px_16px_rgba(245,158,11,0.5)] animate-bounce"
                          style={{ animationDuration: '2s' }}
                        />
                      </div>

                      {/* BOTÕES DE INSERIR / TROCAR PNG DE RETORNO */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => resultUploadRef.current?.click()}
                          className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 active:scale-95 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Inserir PNG</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenGalleryFor('result')}
                          className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-emerald-300 border border-emerald-500/40 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Galeria</span>
                        </button>
                      </div>

                      {/* Nome do Item Resultante */}
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">
                          Nome da Criatura / Item Resultante:
                        </label>
                        <input
                          type="text"
                          value={stationConfig.resultAssetName || ''}
                          onChange={(e) => updateConfig({ resultAssetName: e.target.value })}
                          placeholder="Ex: Pintinho Mítico Dourado"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-amber-400"
                        />
                      </div>

                      {/* Botão de Testar Visualmente no Canvas */}
                      <button
                        type="button"
                        onClick={() => setPreviewMode(previewMode === 'result' ? 'edit' : 'result')}
                        className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <span>{previewMode === 'result' ? 'Voltar para Edição' : '🧪 Simular Eclosão no Canvas'}</span>
                      </button>
                    </div>

                    {/* 2. 🐣 MODO NPC AUTOMÁTICO EMBUTIDO (ECLOSÃO NO MAPA) */}
                    <div className="p-3 bg-slate-950 rounded-2xl border border-teal-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-teal-300 text-xs flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5 text-teal-400" />
                          <span>Modo NPC Automático ao Eclodir:</span>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateConfig({
                              spawnNpcOnHatch: stationConfig.spawnNpcOnHatch === false ? true : false,
                            })
                          }
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border ${
                            stationConfig.spawnNpcOnHatch !== false
                              ? 'bg-teal-500/30 border-teal-400 text-teal-100 shadow-sm'
                              : 'bg-slate-900 border-slate-750 text-slate-400'
                          }`}
                        >
                          {stationConfig.spawnNpcOnHatch !== false ? '🟢 Ativado' : '⚪ Desativado'}
                        </button>
                      </div>

                      <p className="text-[10px] text-slate-400">
                        Ao terminar de chocar, nascem NPCs no mapa perto da chocadeira com seus respectivos PNGs e caminhada automática configurada.
                      </p>

                      {stationConfig.spawnNpcOnHatch !== false && (
                        <div className="space-y-2.5 pt-2 border-t border-slate-800">
                          {/* Seletor com nossos marcadores NPC existentes */}
                          <div>
                            <label className="text-[10px] text-slate-300 font-bold block mb-1">
                              Vincular / Copiar de Marcador NPC Existente:
                            </label>
                            <select
                              value={stationConfig.spawnNpcLinkMarkerId || ''}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                const foundMarker = (project?.markers || []).find((m) => m.id === selectedId);
                                if (foundMarker) {
                                  updateConfig({
                                    spawnNpcLinkMarkerId: selectedId,
                                    resultAssetName: foundMarker.name || stationConfig.resultAssetName,
                                    resultAssetPng: foundMarker.customIconPng || stationConfig.resultAssetPng,
                                    spawnNpcDialogue: foundMarker.npcPhrases?.[0] || stationConfig.spawnNpcDialogue,
                                  });
                                } else {
                                  updateConfig({ spawnNpcLinkMarkerId: undefined });
                                }
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-teal-300 font-bold outline-none"
                            >
                              <option value="">✨ Criar Novo NPC com o PNG de Saída</option>
                              {(project?.markers || [])
                                .filter((m) => m.type === 'npc' && m.id !== marker.id)
                                .map((npc) => (
                                  <option key={npc.id} value={npc.id}>
                                    👑 {npc.name || 'NPC sem nome'} ({npc.id.slice(0, 8)})
                                  </option>
                                ))}
                            </select>
                          </div>

                          {/* Modo de Caminhada Automática do NPC Nascido */}
                          <div>
                            <label className="text-[10px] text-slate-300 font-bold block mb-1">
                              Modo de Caminhada do NPC:
                            </label>
                            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                              {[
                                { id: 'wander', label: 'Vagando Livre', icon: '🎲' },
                                { id: 'patrol', label: 'Patrulha Linear', icon: '↔️' },
                                { id: 'bounce', label: 'Pulinho Slime', icon: '🟢' },
                                { id: 'idle', label: 'Parado / Sentinela', icon: '🛑' },
                              ].map((mode) => (
                                <button
                                  key={mode.id}
                                  type="button"
                                  onClick={() => updateConfig({ spawnNpcMovementType: mode.id as any })}
                                  className={`p-2 rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer text-left ${
                                    (stationConfig.spawnNpcMovementType || 'wander') === mode.id
                                      ? 'bg-teal-500/30 border-teal-400 text-teal-100 font-bold shadow'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  <span>{mode.icon}</span>
                                  <span className="text-[10px] leading-tight">{mode.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Raio de Patrulha / Distância */}
                          {stationConfig.spawnNpcMovementType !== 'idle' && (
                            <div className="space-y-1 pt-1">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-slate-400">Raio de Caminhada ao Redor:</span>
                                <span className="font-mono font-bold text-teal-300">
                                  {stationConfig.spawnNpcPatrolRadius || 100}px
                                </span>
                              </div>
                              <input
                                type="range"
                                min="32"
                                max="260"
                                step="8"
                                value={stationConfig.spawnNpcPatrolRadius || 100}
                                onChange={(e) =>
                                  updateConfig({ spawnNpcPatrolRadius: parseInt(e.target.value) || 100 })
                                }
                                className="w-full accent-teal-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                              />
                            </div>
                          )}

                          {/* Fala / Diálogo do NPC Nascido (OPCIONAL - Padrão: Sem Diálogo / Só Caminha) */}
                          <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-300 font-bold flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                                <span>Diálogo / Fala do NPC:</span>
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateConfig({
                                    spawnNpcHasDialogue: !stationConfig.spawnNpcHasDialogue,
                                  })
                                }
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors border ${
                                  stationConfig.spawnNpcHasDialogue
                                    ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                                    : 'bg-slate-950 border-slate-750 text-slate-400'
                                }`}
                              >
                                {stationConfig.spawnNpcHasDialogue ? '🟢 Com Diálogo' : '⚪ Sem Diálogo (Só Caminha)'}
                              </button>
                            </div>
                            <p className="text-[9px] text-slate-400">
                              {stationConfig.spawnNpcHasDialogue
                                ? 'O NPC exibirá balão com texto ao interagir.'
                                : 'Padrão: O NPC nascido apenas vaga e caminha pelo mapa sem diálogos obrigatórios.'}
                            </p>
                            {stationConfig.spawnNpcHasDialogue && (
                              <input
                                type="text"
                                value={stationConfig.spawnNpcDialogue || ''}
                                onChange={(e) => updateConfig({ spawnNpcDialogue: e.target.value })}
                                placeholder="Ex: Piu! Acabei de nascer na chocadeira!"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-teal-400"
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- MODO B: SAÍDAS POR OVO / SLOT (SE 6 OVOS, 6 PNGS E 6 MARCADORES) --- */}
                {returnSubTab === 'per_egg' && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-[11px] text-amber-300 font-medium">
                      💡 <b>{slots.length} Ovos = {slots.length} Criaturas / Marcadores:</b> Cada ovo na chocadeira pode nascer com seu próprio PNG e configurações de NPC! Ovos sem PNG personalizado herdam a Saída Geral automaticamente.
                    </div>

                    {slots.map((slot, sIdx) => {
                      const slotOutputPng = slot.resultAssetPng || stationConfig.resultAssetPng || DEFAULT_HATCHLING_SVG;
                      const isCustomized = Boolean(slot.resultAssetPng || slot.resultAssetName || slot.spawnNpcLinkMarkerId);

                      return (
                        <div key={slot.id || sIdx} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                              <span>🥚</span>
                              <span>Slot {sIdx + 1}: {slot.currentAssetName || slot.name}</span>
                            </span>
                            {isCustomized && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...slots];
                                  updated[sIdx] = {
                                    ...updated[sIdx],
                                    resultAssetPng: undefined,
                                    resultAssetName: undefined,
                                    spawnNpcLinkMarkerId: undefined,
                                    spawnNpcDialogue: undefined,
                                    spawnNpcHasDialogue: undefined,
                                  };
                                  updateConfig({ slots: updated });
                                }}
                                className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                              >
                                ✕ Usar Saída Geral
                              </button>
                            )}
                          </div>

                          {/* Comparativo Visual: Ovo de Entrada ➔ Criatura de Saída */}
                          <div className="grid grid-cols-2 gap-2 items-center bg-slate-900 p-2 rounded-xl border border-slate-800">
                            {/* Entrada: Ovo */}
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-700 p-1 flex items-center justify-center shrink-0">
                                <img
                                  src={slot.currentAssetPng || DEFAULT_INCUBATOR_SVG}
                                  alt={slot.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[9px] uppercase font-bold text-slate-500">Entrada (Ovo):</div>
                                <div className="text-[11px] text-slate-300 font-bold truncate">
                                  {slot.currentAssetName || `Ovo #${sIdx + 1}`}
                                </div>
                              </div>
                            </div>

                            {/* Saída: Criatura / Marcador */}
                            <div className="flex items-center gap-2 border-l border-slate-800 pl-2">
                              <div className="w-10 h-10 rounded-lg bg-slate-950 border border-amber-500/40 p-1 flex items-center justify-center shrink-0">
                                <img
                                  src={slotOutputPng}
                                  alt="Saída"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[9px] uppercase font-bold text-amber-400/80">Saída (NPC):</div>
                                <div className="text-[11px] text-amber-200 font-bold truncate">
                                  {slot.resultAssetName || (stationConfig.resultAssetName ? `${stationConfig.resultAssetName} #${sIdx + 1}` : `Pintinho #${sIdx + 1}`)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Ações: Inserir PNG e Galeria para este Ovo */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                activeSlotResultUploadIdxRef.current = sIdx;
                                slotResultUploadRef.current?.click();
                              }}
                              className="py-1.5 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Inserir PNG</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenGalleryFor(`slot_result_${sIdx}` as any)}
                              className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-700 text-amber-300 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <FolderOpen className="w-3 h-3" />
                              <span>Galeria</span>
                            </button>
                          </div>

                          {/* Nome da Criatura deste Ovo */}
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold block mb-0.5">
                              Nome da Criatura deste Ovo:
                            </label>
                            <input
                              type="text"
                              value={slot.resultAssetName || ''}
                              onChange={(e) => {
                                const updated = [...slots];
                                updated[sIdx] = { ...updated[sIdx], resultAssetName: e.target.value };
                                updateConfig({ slots: updated });
                              }}
                              placeholder={`Ex: Criatura #${sIdx + 1}`}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-bold outline-none focus:border-amber-400"
                            />
                          </div>

                          {/* Vincular a Marcador NPC Existente */}
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold block mb-0.5">
                              Vincular a Marcador NPC Existente:
                            </label>
                            <select
                              value={slot.spawnNpcLinkMarkerId || ''}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                const foundMarker = (project?.markers || []).find((m) => m.id === selectedId);
                                const updated = [...slots];
                                if (foundMarker) {
                                  updated[sIdx] = {
                                    ...updated[sIdx],
                                    spawnNpcLinkMarkerId: selectedId,
                                    resultAssetName: foundMarker.name || updated[sIdx].resultAssetName,
                                    resultAssetPng: foundMarker.customIconPng || updated[sIdx].resultAssetPng,
                                    spawnNpcDialogue: foundMarker.npcPhrases?.[0] || updated[sIdx].spawnNpcDialogue,
                                  };
                                } else {
                                  updated[sIdx] = {
                                    ...updated[sIdx],
                                    spawnNpcLinkMarkerId: undefined,
                                  };
                                }
                                updateConfig({ slots: updated });
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-teal-300 font-bold outline-none"
                            >
                              <option value="">✨ Criar Novo NPC com o PNG de Saída</option>
                              {(project?.markers || [])
                                .filter((m) => m.type === 'npc' && m.id !== marker.id)
                                .map((npc) => (
                                  <option key={npc.id} value={npc.id}>
                                    👑 {npc.name || 'NPC sem nome'} ({npc.id.slice(0, 8)})
                                  </option>
                                ))}
                            </select>
                          </div>

                          {/* Diálogo opcional deste ovo específico */}
                          <div className="pt-1.5 border-t border-slate-900 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 flex items-center gap-1 font-bold">
                              <MessageSquare className="w-3 h-3 text-slate-500" />
                              <span>Diálogo deste NPC:</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...slots];
                                updated[sIdx] = {
                                  ...updated[sIdx],
                                  spawnNpcHasDialogue: !slot.spawnNpcHasDialogue,
                                };
                                updateConfig({ slots: updated });
                              }}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer border ${
                                slot.spawnNpcHasDialogue
                                  ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-500'
                              }`}
                            >
                              {slot.spawnNpcHasDialogue ? '🟢 Com Diálogo' : '⚪ Sem Diálogo (Padrão: Só Anda)'}
                            </button>
                          </div>
                          {slot.spawnNpcHasDialogue && (
                            <input
                              type="text"
                              value={slot.spawnNpcDialogue || ''}
                              onChange={(e) => {
                                const updated = [...slots];
                                updated[sIdx] = { ...updated[sIdx], spawnNpcDialogue: e.target.value };
                                updateConfig({ slots: updated });
                              }}
                              placeholder={`Fala do NPC #${sIdx + 1}`}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-teal-400"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. PALETA DE ASSETS PERMITIDOS NOS SLOTS */}
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300 flex items-center gap-1">
                      <Palette className="w-3.5 h-3.5 text-amber-400" />
                      <span>Assets Permitidos nos Slots:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => paletteUploadRef.current?.click()}
                      className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Adicionar PNG</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Estes são os PNGs que o jogador pode colocar nos slots dentro do jogo.
                  </p>

                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {(stationConfig.availablePaletteAssets || [
                      { id: '1', name: 'Dourado', pngUrl: EGG_GOLD_SVG },
                      { id: '2', name: 'Cósmico', pngUrl: EGG_BLUE_SVG },
                      { id: '3', name: 'Fogo', pngUrl: EGG_RED_SVG },
                      { id: '4', name: 'Floresta', pngUrl: EGG_GREEN_SVG },
                    ]).map((pal, pIdx) => (
                      <div
                        key={pal.id || pIdx}
                        className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center relative group"
                      >
                        <img src={pal.pngUrl} alt={pal.name} className="w-7 h-7 object-contain" />
                        <span className="text-[9px] text-slate-400 font-bold mt-1 line-clamp-1">{pal.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
