import React, { useState, useRef } from 'react';
import {
  Layers,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  ClipboardPaste,
  ArrowUp,
  ArrowDown,
  Upload,
  FolderOpen,
  FolderPlus,
  Crown,
  Edit2,
  Check,
  Sparkles,
  Info,
  GripVertical,
  FlipHorizontal,
  FlipVertical,
} from 'lucide-react';
import { MarkerMotionLayer, GalleryAsset } from '../types/map';
import { AssetGalleryModal } from './AssetGalleryModal';

interface Props {
  layers: MarkerMotionLayer[];
  activeLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onUpdateLayers: (layers: MarkerMotionLayer[]) => void;
  onReplaceBaseAssetPng?: (newPngUrl: string) => void;
  galleryAssets?: GalleryAsset[];
  galleryCategories?: string[];
  onSavePieceToGallery?: (piece: { name: string; dataUrl: string }) => void;
  onSelectStudioTab?: (tab: 'layers' | 'draw' | 'physics') => void;
  onTriggerSave?: () => void;
  onSyncMotionItemToCatalog?: (params: {
    tag: string;
    displayName: string;
    equipSlot?: MarkerMotionLayer['equipSlot'];
    iconPng?: string;
    buyPrice?: number;
  }) => void;
  equippedMotionTags?: string[];
  onToggleEquipMotionTag?: (tag: string) => void;
}

export const MotionCanvasLayersPanel: React.FC<Props> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  onUpdateLayers,
  onReplaceBaseAssetPng,
  galleryAssets = [],
  galleryCategories = [],
  onSavePieceToGallery,
  onSelectStudioTab,
  onTriggerSave,
  onSyncMotionItemToCatalog,
  equippedMotionTags = [],
  onToggleEquipMotionTag,
}) => {
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<'replace_base' | 'add_piece'>('add_piece');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

  const layerClipboardRef = useRef<MarkerMotionLayer | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceBasePngInputRef = useRef<HTMLInputElement | null>(null);

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0] || null;
  const baseLayer = layers.find((l) => l.isBaseAsset) || layers[0] || null;
  const baseIndex = layers.findIndex((l) => l.isBaseAsset);

  const showNotification = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
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
    showNotification(`✨ Camada "${moved.name}" reordenada!`);
  };

  // Espelhar camada horizontal ou verticalmente
  const handleToggleFlip = (layerId: string, axis: 'x' | 'y', e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextLayers = layers.map((l) => {
      if (l.id !== layerId) return l;
      if (axis === 'x') {
        const nextVal = !l.flipX;
        showNotification(`${nextVal ? '🪞 Espelho H Ativado' : '↩️ Espelho H Desativado'} em "${l.name}"`);
        return { ...l, flipX: nextVal };
      }
      const nextVal = !l.flipY;
      showNotification(`${nextVal ? '🪞 Espelho V Ativado' : '↩️ Espelho V Desativado'} em "${l.name}"`);
      return { ...l, flipY: nextVal };
    });
    onUpdateLayers(nextLayers);
  };

  // Adicionar camada vazia na frente
  const handleAddLayerFront = () => {
    const newLayer: MarkerMotionLayer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
    onUpdateLayers([...layers, newLayer]);
    onSelectLayer(newLayer.id);
    showNotification('✨ Nova camada adicionada à frente do asset!');
  };

  // Adicionar camada vazia atrás
  const handleAddLayerBehind = () => {
    const bIdx = layers.findIndex((l) => l.isBaseAsset);
    const insertIdx = bIdx >= 0 ? bIdx : 0;
    const newLayer: MarkerMotionLayer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
    showNotification('✨ Nova camada adicionada atrás do asset base!');
  };

  // Importar imagem PNG como peça independente
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

      onUpdateLayers([...layers, newLayer]);
      onSelectLayer(newLayer.id);
      showNotification(`✨ Peça "${newLayer.name}" importada com sucesso!`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  // Trocar PNG da camada do asset base
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
      showNotification('🔄 Imagem da base trocada com sucesso!');
      if (replaceBasePngInputRef.current) replaceBasePngInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  // Copiar camada
  const handleCopyLayer = () => {
    if (!activeLayer) return;
    layerClipboardRef.current = JSON.parse(JSON.stringify(activeLayer));
    showNotification('📋 Camada copiada para a área de transferência!');
  };

  // Colar camada
  const handlePasteLayer = () => {
    if (!layerClipboardRef.current) {
      showNotification('⚠️ Nenhuma camada copiada para colar.');
      return;
    }
    const copy = layerClipboardRef.current;
    const newLayer: MarkerMotionLayer = {
      ...copy,
      id: `copy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${copy.name} (Cópia)`,
      isBaseAsset: false, // Garante que nunca seja colada como base
      x: (copy.x ?? 0) + 16,
      y: (copy.y ?? 0) + 16,
    };
    onUpdateLayers([...layers, newLayer]);
    onSelectLayer(newLayer.id);
    showNotification('✨ Camada colada com sucesso!');
  };

  // Duplicar camada com REGRA RIGOROSA: IMPEDIR QUE CAMADA PAI SEJA DUPLICADA
  const handleDuplicateLayer = () => {
    if (!activeLayer) return;
    if (activeLayer.isBaseAsset) {
      showNotification('⚠️ A camada pai do asset é a raiz e não pode ser duplicada.');
      return;
    }
    const newLayer: MarkerMotionLayer = {
      ...JSON.parse(JSON.stringify(activeLayer)),
      id: `dup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${activeLayer.name} (Cópia)`,
      isBaseAsset: false,
      x: (activeLayer.x ?? 0) + 14,
      y: (activeLayer.y ?? 0) + 14,
    };
    onUpdateLayers([...layers, newLayer]);
    onSelectLayer(newLayer.id);
    showNotification(`✨ Peça "${activeLayer.name}" duplicada!`);
  };

  // Alternar visibilidade
  const handleToggleLayerVisible = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = layers.map((l) =>
      l.id === id ? { ...l, visible: l.visible === false ? true : false } : l
    );
    onUpdateLayers(updated);
  };

  // Excluir camada (bloqueado para base)
  const handleDeleteLayer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (layers.length <= 1) return;
    const target = layers.find((l) => l.id === id);
    if (target?.isBaseAsset) {
      showNotification('⚠️ A camada base do asset não pode ser excluída.');
      return;
    }
    const updated = layers.filter((l) => l.id !== id);
    onUpdateLayers(updated);
    if (activeLayerId === id) {
      onSelectLayer(updated[0]?.id || '');
    }
    showNotification('🗑️ Camada removida.');
  };

  // Renomear camada
  const handleSaveLayerName = (id: string) => {
    if (!editingName.trim()) {
      setEditingLayerId(null);
      return;
    }
    const updated = layers.map((l) =>
      l.id === id ? { ...l, name: editingName.trim() } : l
    );
    onUpdateLayers(updated);
    setEditingLayerId(null);
    showNotification('✏️ Nome da camada atualizado!');
  };

  // Selecionar da galeria
  const handleSelectFromGallery = (dataUrl: string, assetName?: string) => {
    if (galleryTarget === 'replace_base') {
      const updated = layers.map((l) =>
        l.isBaseAsset ? { ...l, pngUrl: dataUrl } : l
      );
      onUpdateLayers(updated);
      onReplaceBaseAssetPng?.(dataUrl);
      showNotification('🔄 Imagem da base trocada pela Galeria!');
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
      onUpdateLayers([...layers, newLayer]);
      onSelectLayer(newLayer.id);
      showNotification(`✨ Peça "${assetName || 'Galeria'}" adicionada à pilha!`);
    }
    setIsGalleryModalOpen(false);
  };

  const getPhysicsLabel = (mode?: string) => {
    switch (mode) {
      case 'pendulum':
        return '🕰️ Pêndulo';
      case 'jelly':
        return '🍮 Gelatina';
      case 'close_up':
        return '📖 Dobra';
      case 'cloth':
        return '🧣 Tecido';
      case 'flag':
        return '🚩 Bandeira';
      case 'breathe':
        return '🫁 Respiração';
      case 'float':
        return '🎈 Flutuar';
      case 'shake':
        return '⚡ Tremor';
      case 'spring':
        return '🌀 Mola';
      case 'blink':
        return '👁️ Piscar Olhos';
      default:
        return 'Estática';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 select-none overflow-hidden">
      {/* 1. CABEÇALHO DO PAINEL LATERAL DEDICADO DE CAMADAS */}
      <div className="p-4 border-b border-slate-800/90 bg-slate-900/60 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-sm">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white tracking-wide">
                  Camadas & Peças
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold">
                  {layers.length}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Hierarquia, profundidade Z e animações de peças
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onTriggerSave && (
              <button
                type="button"
                onClick={onTriggerSave}
                className="py-1.5 px-3 rounded-lg bg-white hover:bg-zinc-200 text-black text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Salvar alterações no marcador e na Galeria"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Salvar</span>
              </button>
            )}
          </div>
        </div>

        {/* FEEDBACK TEMPORÁRIO */}
        {feedback && (
          <div className="py-1.5 px-3 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold text-center animate-pulse">
            {feedback}
          </div>
        )}

        {/* 2. BOTÕES DE AÇÃO: ADICIONAR CAMADAS & PEÇAS */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            type="button"
            onClick={handleAddLayerFront}
            className="py-1.5 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Criar nova camada no topo da pilha (na frente do asset)"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Frente</span>
          </button>

          <button
            type="button"
            onClick={handleAddLayerBehind}
            className="py-1.5 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sky-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Criar nova camada no fundo (atrás do asset base)"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>+ Atrás</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setGalleryTarget('add_piece');
              setIsGalleryModalOpen(true);
            }}
            className="py-1.5 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Escolher peça do acervo da Galeria"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Peça Galeria</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="py-1.5 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Carregar imagem PNG local como peça independente"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-300" />
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

        {/* 3. BARRA DE UTILITÁRIOS: COPIAR, COLAR, DUPLICAR (PROTEGENDO A BASE) */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800/90 text-xs">
          <button
            type="button"
            onClick={handleCopyLayer}
            className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold flex items-center justify-center gap-1 border border-slate-800 transition-colors cursor-pointer"
            title="Copiar camada selecionada"
          >
            <Copy className="w-3 h-3 text-sky-400" />
            <span>Copiar</span>
          </button>

          <button
            type="button"
            onClick={handlePasteLayer}
            className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold flex items-center justify-center gap-1 border border-slate-800 transition-colors cursor-pointer"
            title="Colar camada da área de transferência"
          >
            <ClipboardPaste className="w-3 h-3 text-emerald-400" />
            <span>Colar</span>
          </button>

          <button
            type="button"
            onClick={handleDuplicateLayer}
            disabled={activeLayer?.isBaseAsset}
            className={`py-1.5 px-2 rounded-lg border transition-colors flex items-center justify-center gap-1 font-semibold ${
              activeLayer?.isBaseAsset
                ? 'bg-slate-900/40 border-slate-800/50 text-slate-600 cursor-not-allowed'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-amber-300 cursor-pointer'
            }`}
            title={
              activeLayer?.isBaseAsset
                ? 'A camada pai do asset é a raiz e não pode ser duplicada'
                : 'Duplicar peça selecionada'
            }
          >
            <Layers className="w-3 h-3 text-amber-400" />
            <span>Duplicar</span>
          </button>
        </div>
      </div>

      {/* 4. CARD DESTAQUE: CAMADA PAI DO ASSET (BASE RAIZ) */}
      <div className="p-3 mx-3 my-2.5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-slate-900 border-2 border-amber-500/40 shadow-lg shadow-amber-950/30 shrink-0 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Crown className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <span>Camada Pai (Base Raiz)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold uppercase">
                  Imutável
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
                {baseLayer ? baseLayer.name : 'Asset Principal'}
              </div>
            </div>
          </div>

          {baseLayer && (
            <button
              type="button"
              onClick={() => onSelectLayer(baseLayer.id)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                activeLayer?.id === baseLayer.id
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                  : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-amber-400'
              }`}
            >
              {activeLayer?.id === baseLayer.id ? 'Ativa' : 'Selecionar'}
            </button>
          )}
        </div>

        {/* Preview & Troca de PNG da Base */}
        <div className="flex items-center gap-2">
          {baseLayer?.pngUrl && (
            <div
              className="w-10 h-10 rounded-lg border border-amber-500/40 shrink-0 flex items-center justify-center p-1 bg-slate-950 overflow-hidden"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                backgroundSize: '8px 8px',
                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
              }}
            >
              <img
                src={baseLayer.pngUrl}
                alt="Base"
                className="w-full h-full object-contain"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5 flex-1">
            <button
              type="button"
              onClick={() => {
                setGalleryTarget('replace_base');
                setIsGalleryModalOpen(true);
              }}
              className="py-1.5 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold border border-amber-500/40 flex items-center justify-center gap-1 transition-all cursor-pointer truncate"
              title="Trocar imagem base usando a Galeria oficial"
            >
              <FolderOpen className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">Trocar Galeria</span>
            </button>
            <button
              type="button"
              onClick={() => replaceBasePngInputRef.current?.click()}
              className="py-1.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-bold border border-slate-700 flex items-center justify-center gap-1 transition-all cursor-pointer truncate"
              title="Trocar imagem base usando arquivo local"
            >
              <Upload className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">Trocar Local</span>
            </button>
          </div>
          <input
            ref={replaceBasePngInputRef}
            type="file"
            accept="image/png,image/webp"
            onChange={handleReplaceBasePng}
            className="hidden"
          />
        </div>
      </div>

      {/* 4.5 PAINEL DE CONJUNTOS / MOTION ITEMS AGRUPADOS POR TAG (ROUPINHAS, SKINS, CINTO, ARMA) */}
      {(() => {
        const tagGroups = new Map<
          string,
          { tag: string; count: number; slot?: MarkerMotionLayer['equipSlot']; allVisible: boolean; samplePng?: string; sampleName: string }
        >();
        for (const l of layers) {
          if (l.isBaseAsset) continue;
          const t = (l.inventoryItemTag || '').trim();
          if (!t) continue;
          const prev = tagGroups.get(t);
          if (!prev) {
            tagGroups.set(t, {
              tag: t,
              count: 1,
              slot: l.equipSlot,
              allVisible: l.visible !== false,
              samplePng: l.pngUrl,
              sampleName: l.name,
            });
          } else {
            prev.count += 1;
            prev.allVisible = prev.allVisible && l.visible !== false;
            if (!prev.samplePng && l.pngUrl) prev.samplePng = l.pngUrl;
          }
        }
        const groupsList = Array.from(tagGroups.values());
        if (groupsList.length === 0) return null;

        return (
          <div className="px-3 pb-2.5 shrink-0">
            <div className="p-2.5 rounded-2xl bg-fuchsia-950/25 border border-fuchsia-500/35 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-fuchsia-300 flex items-center gap-1.5">
                  <span>🎒 Conjuntos & Motion Items ({groupsList.length})</span>
                </span>
                <span className="text-[9px] text-fuchsia-300/70 font-mono">
                  Agrupamento por Tag
                </span>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-0.5">
                {groupsList.map((grp) => {
                  const isEquippedInHero = equippedMotionTags
                    .map((x) => x.toLowerCase())
                    .includes(grp.tag.toLowerCase());
                  return (
                    <div
                      key={grp.tag}
                      className="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl bg-slate-950/90 border border-fuchsia-500/30 text-[10px]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-fuchsia-200 truncate flex items-center gap-1">
                          <span>#{grp.tag}</span>
                          <span className="px-1.5 py-0.2 rounded bg-fuchsia-500/20 text-fuchsia-300 text-[8px] font-mono">
                            {grp.count} {grp.count === 1 ? 'camada' : 'camadas'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const nextVis = !grp.allVisible;
                            onUpdateLayers(
                              layers.map((l) =>
                                (l.inventoryItemTag || '').trim() === grp.tag
                                  ? { ...l, visible: nextVis }
                                  : l
                              )
                            );
                            if (onToggleEquipMotionTag) {
                              onToggleEquipMotionTag(grp.tag);
                            }
                            showNotification(
                              nextVis
                                ? `👕 Conjunto "#${grp.tag}" vestido/visível (${grp.count} peça(s))!`
                                : `🙈 Conjunto "#${grp.tag}" oculto como não-equipado!`
                            );
                          }}
                          className={`px-1.5 py-0.5 rounded-lg font-bold border transition-all cursor-pointer ${
                            grp.allVisible || isEquippedInHero
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                          }`}
                          title="Testar vestir / tirar todas as camadas deste item de uma só vez"
                        >
                          {grp.allVisible ? '👕 Vestido' : '🙈 Oculto'}
                        </button>
                        {onSyncMotionItemToCatalog && (
                          <button
                            type="button"
                            onClick={() => {
                              onSyncMotionItemToCatalog({
                                tag: grp.tag,
                                displayName: grp.tag
                                  .replace(/^skin_|^item_|^traje_/i, '')
                                  .replace(/_/g, ' ')
                                  .replace(/\b\w/g, (c) => c.toUpperCase()),
                                equipSlot: grp.slot || 'skin',
                                iconPng: grp.samplePng,
                              });
                              showNotification(
                                `✨ Motion Item "#${grp.tag}" enviado para o Inventário, Lojas e Quests!`
                              );
                            }}
                            className="px-1.5 py-0.5 rounded-lg bg-fuchsia-500/25 hover:bg-fuchsia-500/40 text-fuchsia-200 border border-fuchsia-400/40 font-bold transition-all cursor-pointer"
                            title="Sincronizar este grupo como Item Equipável no Inventário, Lojas e Quests"
                          >
                            +Loja/Mochila
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 5. LISTA DE CAMADAS ESPAÇOSA, AMPLA E COM ROLAGEM VERTICAL LIVRE (SEM MAX-H CONSTRITIVO) */}
      <div className="px-3 pb-2 flex items-center justify-between text-xs font-bold text-slate-400 shrink-0">
        <span>Ordem de Profundidade (Z-Index)</span>
        <span className="text-[10px] font-mono text-slate-500">
          Topo = Frente | Fundo = Trás
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-2">
        {[...layers].reverse().map((layer, reverseIdx) => {
          const originalIdx = layers.length - 1 - reverseIdx;
          const isSelected = layer.id === (activeLayer?.id || layers[0]?.id);
          const isBase = !!layer.isBaseAsset;
          const isBehindBase = baseIndex >= 0 && originalIdx < baseIndex;
          const isEditing = editingLayerId === layer.id;

          return (
            <div
              key={layer.id}
              draggable={!isEditing}
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
              className={`p-2.5 rounded-2xl border transition-all space-y-2 select-none cursor-pointer ${
                draggedLayerId === layer.id
                  ? 'opacity-40 border-dashed border-amber-400 scale-[0.98]'
                  : dragOverLayerId === layer.id
                  ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400 shadow-lg scale-[1.01]'
                  : isSelected
                  ? isBase
                    ? 'bg-amber-950/70 border-amber-400 shadow-md shadow-amber-950/40 text-white'
                    : 'bg-zinc-800 border-zinc-400 shadow-md text-white'
                  : isBase
                  ? 'bg-zinc-900 border-amber-500/30 text-amber-200 hover:border-amber-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Ícone de Arrastar / Grip Handle */}
                  <div
                    className="p-1 rounded text-slate-500 hover:text-amber-400 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
                    title="Clique e arraste para mover esta camada para cima ou para baixo"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Setas de Reordenar Z-Index (como atalho alternativo) */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveLayer(layer.id, 'up');
                      }}
                      disabled={originalIdx === layers.length - 1}
                      className="p-1 rounded hover:bg-slate-800 disabled:opacity-20 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Trazer para frente (subir na ordem Z)"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveLayer(layer.id, 'down');
                      }}
                      disabled={originalIdx === 0}
                      className="p-1 rounded hover:bg-slate-800 disabled:opacity-20 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Enviar para trás (descer na ordem Z)"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Thumbnail com fundo xadrez */}
                  <div
                    className="w-9 h-9 rounded-xl border border-slate-800 shrink-0 flex items-center justify-center p-0.5 bg-slate-950 overflow-hidden"
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                      backgroundSize: '6px 6px',
                      backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px',
                    }}
                  >
                    {layer.pngUrl ? (
                      <img
                        src={layer.pngUrl}
                        alt={layer.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono font-bold">
                        P{originalIdx + 1}
                      </span>
                    )}
                  </div>

                  {/* Nome da Camada (com edição inline) */}
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveLayerName(layer.id);
                            if (e.key === 'Escape') setEditingLayerId(null);
                          }}
                          autoFocus
                          className="bg-slate-950 border border-amber-400 rounded px-1.5 py-0.5 text-xs text-white w-full focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveLayerName(layer.id)}
                          className="p-1 rounded bg-amber-500 text-slate-950 hover:bg-amber-400"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs truncate max-w-[130px]">
                          {layer.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLayerId(layer.id);
                            setEditingName(layer.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-amber-400 text-slate-500 transition-opacity p-0.5"
                          title="Renomear camada"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}

                    {/* Selos de Profundidade e Hierarquia */}
                    <div className="flex items-center gap-1 mt-0.5">
                      {isBase ? (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-300 text-[9px] font-black uppercase flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5" />
                          <span>Base</span>
                        </span>
                      ) : isBehindBase ? (
                        <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[9px] font-bold uppercase">
                          Atrás
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[9px] font-bold uppercase">
                          Frente
                        </span>
                      )}

                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px] font-mono">
                        {getPhysicsLabel(layer.physicsMode)}
                      </span>

                      {layer.inventoryItemTag && (
                        <span
                          className="px-1.5 py-0.2 rounded bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-400/40 text-[9px] font-black truncate max-w-[110px]"
                          title={`Motion Item Equipável: #${layer.inventoryItemTag}`}
                        >
                          🎒 #{layer.inventoryItemTag}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ações da Linha da Camada */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Espelhar Horizontal Rápido */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleFlip(layer.id, 'x', e)}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      layer.flipX
                        ? 'bg-sky-500/30 border-sky-400 text-sky-200'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-sky-300'
                    }`}
                    title={layer.flipX ? 'Espelho Horizontal Ativo (Clique para desfazer)' : 'Espelhar Horizontalmente (Flip H)'}
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                  </button>

                  {/* Espelhar Vertical Rápido */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleFlip(layer.id, 'y', e)}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      layer.flipY
                        ? 'bg-sky-500/30 border-sky-400 text-sky-200'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-sky-300'
                    }`}
                    title={layer.flipY ? 'Espelho Vertical Ativo (Clique para desfazer)' : 'Espelhar Verticalmente (Flip V)'}
                  >
                    <FlipVertical className="w-3.5 h-3.5" />
                  </button>

                  {/* Visibilidade */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleLayerVisible(layer.id, e)}
                    className={`p-1.5 rounded-lg bg-slate-950 border border-slate-800 transition-colors cursor-pointer ${
                      layer.visible === false
                        ? 'text-slate-600 hover:text-slate-400'
                        : 'text-amber-400 hover:text-amber-300'
                    }`}
                    title={
                      layer.visible === false
                        ? 'Exibir camada'
                        : 'Ocultar camada'
                    }
                  >
                    {layer.visible === false ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Excluir (Bloqueado para Base) */}
                  {layers.length > 1 && !isBase && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteLayer(layer.id, e)}
                      className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-950/50 text-slate-500 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
                      title="Excluir peça"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Informações detalhadas da camada quando selecionada */}
              {isSelected && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>
                      Pivô:{' '}
                      <strong className="text-amber-300">
                        {Math.round((layer.pivotX ?? 0.5) * 100)}% X,{' '}
                        {Math.round((layer.pivotY ?? 0.5) * 100)}% Y
                      </strong>
                    </span>
                    <span>
                      Escala:{' '}
                      <strong className="text-sky-300">
                        {(layer.scale ?? 1.0).toFixed(2)}x
                        {((layer.scaleX ?? 1) !== 1 || (layer.scaleY ?? 1) !== 1) && (
                          <span className="text-purple-300 ml-1">
                            ({Math.round((layer.scaleX ?? 1) * 100)}% X, {Math.round((layer.scaleY ?? 1) * 100)}% Y)
                          </span>
                        )}
                      </strong>
                    </span>
                  </div>

                  {/* Barra de Ações Rápidas de Espelhamento e Ajuste */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={(e) => handleToggleFlip(layer.id, 'x', e)}
                      className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all border cursor-pointer ${
                        layer.flipX
                          ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-xs'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title="Espelhar Horizontalmente (Inverter Lado)"
                    >
                      <FlipHorizontal className="w-3 h-3" />
                      <span>Espelhar H {layer.flipX ? '✓' : ''}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleToggleFlip(layer.id, 'y', e)}
                      className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all border cursor-pointer ${
                        layer.flipY
                          ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-xs'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title="Espelhar Verticalmente (Inverter Cima/Baixo)"
                    >
                      <FlipVertical className="w-3 h-3" />
                      <span>Espelhar V {layer.flipY ? '✓' : ''}</span>
                    </button>

                    {onSelectStudioTab && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStudioTab('physics');
                        }}
                        className="py-1 px-2.5 rounded-lg text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold transition-all cursor-pointer whitespace-nowrap"
                      >
                        Física →
                      </button>
                    )}
                  </div>

                  {/* Controle de Deforme (Comprimir / Expandir Horizontal e Vertical) */}
                  <div className="pt-2 border-t border-slate-800/60 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between text-[10px] text-purple-300 font-bold">
                      <span>Deforme (Squash & Stretch)</span>
                      <span className="font-mono text-[9px] text-slate-400">
                        {Math.round((layer.scaleX ?? 1) * 100)}% H × {Math.round((layer.scaleY ?? 1) * 100)}% V
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div>
                        <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
                          <span>Horizontal (Largura)</span>
                          <span className="font-mono text-purple-300">{(layer.scaleX ?? 1.0).toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="2.5"
                          step="0.05"
                          value={layer.scaleX ?? 1.0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const updated = layers.map((l) =>
                              l.id === layer.id ? { ...l, scaleX: val } : l
                            );
                            onUpdateLayers(updated);
                          }}
                          className="w-full h-1.5 accent-purple-400 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
                          <span>Vertical (Altura)</span>
                          <span className="font-mono text-purple-300">{(layer.scaleY ?? 1.0).toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="2.5"
                          step="0.05"
                          value={layer.scaleY ?? 1.0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const updated = layers.map((l) =>
                              l.id === layer.id ? { ...l, scaleY: val } : l
                            );
                            onUpdateLayers(updated);
                          }}
                          className="w-full h-1.5 accent-purple-400 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Presets Rápidos de Deforme */}
                    <div className="flex items-center gap-1 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = layers.map((l) =>
                            l.id === layer.id ? { ...l, scaleX: 1.0, scaleY: 1.0 } : l
                          );
                          onUpdateLayers(updated);
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] font-bold text-slate-300 hover:text-white"
                        title="Restaurar proporção original 1:1"
                      >
                        Normal (1:1)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = layers.map((l) =>
                            l.id === layer.id ? { ...l, scaleX: 1.25, scaleY: 0.8 } : l
                          );
                          onUpdateLayers(updated);
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] font-bold text-purple-300 hover:text-purple-200"
                        title="Achatar levemente"
                      >
                        Achatar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = layers.map((l) =>
                            l.id === layer.id ? { ...l, scaleX: 0.8, scaleY: 1.25 } : l
                          );
                          onUpdateLayers(updated);
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] font-bold text-purple-300 hover:text-purple-200"
                        title="Esticar verticalmente"
                      >
                        Esticar
                      </button>
                    </div>
                  </div>

                  {/* 🎒 VÍNCULO MOTION ITEM (ROUPA / SKIN / CINTO / ARMA EQUIPÁVEL EM JOGO) */}
                  {!isBase && (
                    <div
                      className="pt-2.5 border-t border-fuchsia-500/30 space-y-2 bg-fuchsia-950/15 -mx-1 px-2 py-2 rounded-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-fuchsia-300 flex items-center gap-1">
                          <span>🎒 Motion Item (Roupa / Cinto / Equipável)</span>
                        </span>
                        {layer.inventoryItemTag && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/40">
                            {
                              layers.filter(
                                (l) =>
                                  !l.isBaseAsset &&
                                  (l.inventoryItemTag || '').trim() ===
                                    (layer.inventoryItemTag || '').trim()
                              ).length
                            }{' '}
                            peça(s) no grupo
                          </span>
                        )}
                      </div>

                      <p className="text-[9px] text-slate-400 leading-relaxed">
                        Coloque a mesma <strong>Tag de Item</strong> em várias camadas (ex: peitoral + mangas ={' '}
                        <code className="text-fuchsia-300">skin_real</code>) ou crie peças avulsas (<code className="text-fuchsia-300">cinto_ouro</code>). Em jogo, elas ficam ocultas até o jogador adquirir/equipar o item!
                      </p>

                      <div className="space-y-1.5">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-300 mb-0.5">
                            Tag do Item / Conjunto (Agrupador)
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={layer.inventoryItemTag || ''}
                              placeholder="Ex: skin_armadura_solar, cinto_couro, espada_fogo..."
                              onChange={(e) => {
                                const val = e.target.value.replace(/\s+/g, '_');
                                const updated = layers.map((l) =>
                                  l.id === layer.id
                                    ? {
                                        ...l,
                                        inventoryItemTag: val || undefined,
                                        equipSlot: l.equipSlot || 'skin',
                                        gameVisibilityRule: l.gameVisibilityRule || 'when_equipped',
                                      }
                                    : l
                                );
                                onUpdateLayers(updated);
                              }}
                              className="flex-1 bg-slate-950 border border-fuchsia-500/40 rounded-lg px-2 py-1 text-[10px] text-white font-mono focus:outline-hidden focus:border-fuchsia-400"
                            />
                            {layer.inventoryItemTag && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = layers.map((l) =>
                                    l.id === layer.id
                                      ? { ...l, inventoryItemTag: undefined }
                                      : l
                                  );
                                  onUpdateLayers(updated);
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 text-[9px] font-bold"
                                title="Remover tag de item desta camada"
                              >
                                Limpar
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Atalhos rápidos de tags existentes em outras camadas ou sugestões */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {Array.from(
                            new Set<string>([
                              ...layers
                                .map((l) => (l.inventoryItemTag || '').trim())
                                .filter(Boolean),
                              'skin_traje_real',
                              'cinto_alquimista',
                              'capa_vento',
                              'espada_solar',
                              'asas_celestiais',
                            ])
                          )
                            .slice(0, 6)
                            .map((presetTag) => {
                              const isActiveTag =
                                (layer.inventoryItemTag || '').trim() === presetTag;
                              return (
                                <button
                                  key={presetTag}
                                  type="button"
                                  onClick={() => {
                                    const autoSlot: MarkerMotionLayer['equipSlot'] =
                                      presetTag.includes('cinto')
                                        ? 'belt'
                                        : presetTag.includes('capa')
                                        ? 'cape'
                                        : presetTag.includes('espada') || presetTag.includes('arma')
                                        ? 'weapon'
                                        : presetTag.includes('asa')
                                        ? 'wings'
                                        : 'skin';
                                    const updated = layers.map((l) =>
                                      l.id === layer.id
                                        ? {
                                            ...l,
                                            inventoryItemTag: presetTag,
                                            equipSlot: l.equipSlot || autoSlot,
                                            gameVisibilityRule:
                                              l.gameVisibilityRule || 'when_equipped',
                                          }
                                        : l
                                    );
                                    onUpdateLayers(updated);
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border transition-all cursor-pointer ${
                                    isActiveTag
                                      ? 'bg-fuchsia-500/30 border-fuchsia-400 text-fuchsia-100'
                                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-fuchsia-300'
                                  }`}
                                >
                                  #{presetTag}
                                </button>
                              );
                            })}
                        </div>

                        {layer.inventoryItemTag && (
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            <div>
                              <label className="block text-[9px] text-slate-400 mb-0.5">
                                Categoria / Slot Visual
                              </label>
                              <select
                                value={layer.equipSlot || 'skin'}
                                onChange={(e) => {
                                  const slot = e.target.value as MarkerMotionLayer['equipSlot'];
                                  const tag = (layer.inventoryItemTag || '').trim();
                                  // Sincroniza o slot em todas as camadas do mesmo grupo
                                  const updated = layers.map((l) =>
                                    l.id === layer.id || (tag && (l.inventoryItemTag || '').trim() === tag)
                                      ? { ...l, equipSlot: slot }
                                      : l
                                  );
                                  onUpdateLayers(updated);
                                }}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-1.5 py-1 text-[10px] text-white"
                              >
                                <option value="skin">🥋 Roupa / Skin Completa</option>
                                <option value="armor">🛡️ Peitoral / Armadura</option>
                                <option value="belt">🎗️ Cinto / Faixa</option>
                                <option value="weapon">⚔️ Arma / Espada</option>
                                <option value="cape">🧣 Capa / Manto</option>
                                <option value="wings">🪽 Asas</option>
                                <option value="head">🪖 Cabeça / Chapéu</option>
                                <option value="boots">👢 Botas / Calçado</option>
                                <option value="accessory">💍 Acessório / Amuleto</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[9px] text-slate-400 mb-0.5">
                                Regra de Revelação em Jogo
                              </label>
                              <select
                                value={layer.gameVisibilityRule || 'when_equipped'}
                                onChange={(e) => {
                                  const rule = e.target.value as MarkerMotionLayer['gameVisibilityRule'];
                                  const tag = (layer.inventoryItemTag || '').trim();
                                  const updated = layers.map((l) =>
                                    l.id === layer.id || (tag && (l.inventoryItemTag || '').trim() === tag)
                                      ? { ...l, gameVisibilityRule: rule }
                                      : l
                                  );
                                  onUpdateLayers(updated);
                                }}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-1.5 py-1 text-[10px] text-white"
                              >
                                <option value="when_equipped">🎒 Ao Equipar na Mochila</option>
                                <option value="when_acquired">🛍️ Ao Adquirir (Loja/Quest)</option>
                                <option value="always">👁️ Sempre Visível</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {layer.inventoryItemTag && onSyncMotionItemToCatalog && (
                          <button
                            type="button"
                            onClick={() => {
                              const cleanTag = (layer.inventoryItemTag || '').trim();
                              if (!cleanTag) return;
                              onSyncMotionItemToCatalog({
                                tag: cleanTag,
                                displayName:
                                  layer.name && !layer.name.toLowerCase().startsWith('peça')
                                    ? layer.name
                                    : cleanTag
                                        .replace(/^skin_|^item_|^traje_/i, '')
                                        .replace(/_/g, ' ')
                                        .replace(/\b\w/g, (c) => c.toUpperCase()),
                                equipSlot: layer.equipSlot || 'skin',
                                iconPng: layer.pngUrl,
                              });
                              showNotification(
                                `✨ Item "#${cleanTag}" criado/sincronizado no Inventário com a tag Motion Item! Disponível em Lojas, Quests e Mochila.`
                              );
                            }}
                            className="w-full mt-1 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Gerar / Sincronizar Motion Item no Inventário & Lojas</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL OFICIAL DA GALERIA */}
      <AssetGalleryModal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        galleryAssets={galleryAssets}
        categories={galleryCategories}
        title={
          galleryTarget === 'replace_base'
            ? 'Trocar Imagem Base do Asset'
            : 'Adicionar Peça da Galeria'
        }
        subtitle="Selecione um asset oficial para incorporar ao Motion Canvas"
        onSelectAsset={handleSelectFromGallery}
      />
    </div>
  );
};
