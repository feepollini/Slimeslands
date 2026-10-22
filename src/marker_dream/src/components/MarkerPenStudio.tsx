import React, { useState, useRef, useMemo } from 'react';
import { MapProject, MarkerPenConfig, MarkerType, GalleryAsset } from '../types/map';
import { OFFICIAL_EFFECTS } from '../utils/motionCanvasEngine';
import { internAssetUrl } from '../utils/assetRegistry';
import { isVideoFile, readUploadedVideo } from '../utils/videoUtils';
import {
  PenTool,
  FlipHorizontal,
  FlipVertical,
  Dices,
  RotateCw,
  Check,
  Search,
  Upload,
  X,
  Film,
} from 'lucide-react';

interface Props {
  project: MapProject;
  onUpdateProject: (updates: Partial<MapProject>) => void;
  activeTool?: string;
  setActiveTool?: (tool: any) => void;
  onOpenLayers?: () => void;
  onOpenGallery?: () => void;
}

const MARKER_TYPE_OPTIONS: { id: MarkerType; label: string; icon: string }[] = [
  { id: 'neutral', label: 'Neutro', icon: '🪨' },
  { id: 'npc', label: 'NPC', icon: '🧍' },
  { id: 'light', label: 'Luz', icon: '💡' },
  { id: 'collectible', label: 'Item', icon: '📦' },
  { id: 'camp', label: 'Marco', icon: '📍' },
  { id: 'event', label: 'Evento', icon: '⚡' },
  { id: 'travel', label: 'Portal', icon: '🌌' },
];

export const MarkerPenStudio: React.FC<Props> = ({
  project,
  onUpdateProject,
  activeTool,
  setActiveTool,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const assets = project.galleryAssets || [];
  const configuredCategories = project.galleryCategories || ['Geral'];

  const allCategories = useMemo(() => {
    const set = new Set<string>(configuredCategories);
    assets.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return Array.from(set);
  }, [configuredCategories, assets]);

  const rawLayers =
    project.markerLayers && project.markerLayers.length > 0
      ? project.markerLayers
      : [
          { id: 'layer-default', name: 'Camada Padrão', visible: true, locked: false, order: 0, color: '#3b82f6' },
        ];
  const layers = [...rawLayers]
    .filter((l) => !l.isGroup)
    .sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
  const activeLayerId =
    project.activeMarkerLayerId && layers.some((l) => l.id === project.activeMarkerLayerId)
      ? project.activeMarkerLayerId
      : layers[0]?.id || 'layer-default';

  const markerPenConfig: MarkerPenConfig = project.markerPenConfig || {
    selectedAssetIds: [],
    size: 150,
    spacing: 65,
    randomMirrorH: true,
    randomMirrorV: false,
    randomScale: true,
    randomRotation: false,
    targetLayerId: activeLayerId,
  };

  const activeMarkerType: MarkerType = markerPenConfig.markerType || 'neutral';
  const isNpcAutoMove = markerPenConfig.npcAutoMove ?? true;
  const npcMoveMode = markerPenConfig.npcMoveMode || 'procedural';
  const npcDistance = markerPenConfig.npcMoveDistance || 80;
  const npcSpeed = markerPenConfig.npcMoveSpeed || 2.5;

  const updateMarkerPenConfig = (updates: Partial<MarkerPenConfig>) => {
    onUpdateProject({
      markerPenConfig: {
        ...markerPenConfig,
        ...updates,
      },
    });
  };

  const isPenActive = activeTool === 'marker_pen';
  const selectedIds = useMemo(
    () => new Set(markerPenConfig.selectedAssetIds || []),
    [markerPenConfig.selectedAssetIds]
  );

  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assets.filter((a) => {
      const cat = a.category || 'Geral';
      const matchCat = selectedCategory === 'all' || cat === selectedCategory;
      const matchSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q) ||
        (a.tags && a.tags.some((t) => t.toLowerCase().includes(q)));
      return matchCat && matchSearch;
    });
  }, [assets, selectedCategory, searchQuery]);

  // Alterna caixa de seleção do asset e ativa a caneta
  const toggleAssetCheckbox = (assetId: string) => {
    if (!isPenActive && setActiveTool) {
      setActiveTool('marker_pen');
    }
    const next = new Set(selectedIds);
    if (next.has(assetId)) {
      next.delete(assetId);
    } else {
      next.add(assetId);
    }
    updateMarkerPenConfig({ selectedAssetIds: Array.from(next) });
  };

  const handleSelectAllFiltered = () => {
    if (!isPenActive && setActiveTool) {
      setActiveTool('marker_pen');
    }
    const next = new Set(selectedIds);
    filteredAssets.forEach((a) => next.add(a.id));
    updateMarkerPenConfig({ selectedAssetIds: Array.from(next) });
  };

  const handleClearSelection = () => {
    updateMarkerPenConfig({ selectedAssetIds: [] });
  };

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cleanName = file.name.replace(/\.[^/.]+$/, '').trim() || 'Asset';
    const targetCat = selectedCategory === 'all' ? 'Geral' : selectedCategory;

    if (isVideoFile(file)) {
      try {
        const vid = await readUploadedVideo(file);
        const newAsset: GalleryAsset = {
          id: `asset-vid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: cleanName,
          category: targetCat,
          dataUrl: internAssetUrl(vid.dataUrl),
          mediaType: 'video',
          videoUrl: internAssetUrl(vid.videoUrl),
          videoChromaKey: {
            enabled: true,
            color: '#00ff00',
            tolerance: 35,
            smoothness: 12,
            cropSquare: true,
            cropOffsetX: 0.5,
            cropOffsetY: 0.5,
            videoSpeed: 1.0,
            scale: 1.0,
            flipH: false,
          },
          createdAt: new Date().toISOString(),
        };
        const nextAssets = [newAsset, ...(project.galleryAssets || [])];
        const nextSelected = Array.from(new Set([...selectedIds, newAsset.id]));
        onUpdateProject({
          galleryAssets: nextAssets,
          markerPenConfig: {
            ...markerPenConfig,
            selectedAssetIds: nextSelected,
          },
        });
        if (!isPenActive && setActiveTool) setActiveTool('marker_pen');
      } catch (err) {
        console.error('Erro ao importar vídeo:', err);
      }
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (!dataUrl) return;
      const newAsset: GalleryAsset = {
        id: `asset-user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName,
        category: targetCat,
        dataUrl: internAssetUrl(dataUrl),
        createdAt: new Date().toISOString(),
      };
      const nextAssets = [newAsset, ...(project.galleryAssets || [])];
      const nextSelected = Array.from(new Set([...selectedIds, newAsset.id]));
      onUpdateProject({
        galleryAssets: nextAssets,
        markerPenConfig: {
          ...markerPenConfig,
          selectedAssetIds: nextSelected,
        },
      });
      if (!isPenActive && setActiveTool) setActiveTool('marker_pen');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-2.5 text-slate-100 select-none pb-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/webp,image/jpeg,image/gif,video/mp4,video/webm,video/ogg,video/quicktime"
        className="hidden"
        onChange={handleDirectUpload}
      />

      {/* 1. TOPO COMPACTO E DISCRETO: ATIVAÇÃO, AJUSTES DE TRAÇADO & TIPO DE MARCADOR */}
      <div className="p-2.5 bg-slate-900/95 border border-slate-800 rounded-xl space-y-2.5">
        {/* Linha 1: Toggle da Caneta + Camada Alvo */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTool?.(isPenActive ? 'pan' : 'marker_pen')}
            className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-between font-bold text-xs transition-all cursor-pointer ${
              isPenActive
                ? 'bg-sky-400 text-slate-950 shadow-sm'
                : 'bg-slate-950 hover:bg-slate-800 text-sky-400 border border-sky-500/40'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5" />
              <span>{isPenActive ? 'Caneta Ativa' : 'Ativar Caneta'}</span>
            </span>
            <span className="text-[10px] font-mono font-black uppercase">
              {isPenActive ? 'ON' : 'OFF'}
            </span>
          </button>

          <select
            value={markerPenConfig.targetLayerId || activeLayerId}
            onChange={(e) => {
              const target = e.target.value;
              onUpdateProject({ activeMarkerLayerId: target });
              updateMarkerPenConfig({ targetLayerId: target });
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 font-semibold focus:outline-none focus:border-sky-400 cursor-pointer max-w-[130px] truncate"
            title="Camada de destino"
          >
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Linha 2: Sliders Compactos Lado a Lado (Tamanho e Espaçamento) */}
        <div className="grid grid-cols-2 gap-2.5 px-0.5">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-medium">Tamanho</span>
              <span className="font-mono text-sky-300 font-bold">{markerPenConfig.size}px</span>
            </div>
            <input
              type="range"
              min={24}
              max={260}
              value={markerPenConfig.size}
              onChange={(e) => updateMarkerPenConfig({ size: Number(e.target.value) })}
              className="w-full accent-sky-400 h-1 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-medium">Espaçamento</span>
              <span className="font-mono text-sky-300 font-bold">{markerPenConfig.spacing}px</span>
            </div>
            <input
              type="range"
              min={20}
              max={240}
              step={5}
              value={markerPenConfig.spacing}
              onChange={(e) => updateMarkerPenConfig({ spacing: Number(e.target.value) })}
              className="w-full accent-sky-400 h-1 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Linha 3: Variações Discretas em 1 Linha */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => updateMarkerPenConfig({ randomMirrorH: !markerPenConfig.randomMirrorH })}
            className={`py-1 px-1.5 rounded-lg border text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              markerPenConfig.randomMirrorH
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Espelhar Horizontalmente"
          >
            <FlipHorizontal className="w-3 h-3 shrink-0" />
            <span className="truncate">Esp. H</span>
          </button>

          <button
            type="button"
            onClick={() => updateMarkerPenConfig({ randomMirrorV: !markerPenConfig.randomMirrorV })}
            className={`py-1 px-1.5 rounded-lg border text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              markerPenConfig.randomMirrorV
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Espelhar Verticalmente"
          >
            <FlipVertical className="w-3 h-3 shrink-0" />
            <span className="truncate">Esp. V</span>
          </button>

          <button
            type="button"
            onClick={() => updateMarkerPenConfig({ randomScale: !markerPenConfig.randomScale })}
            className={`py-1 px-1.5 rounded-lg border text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              markerPenConfig.randomScale
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Variação de Escala (±25%)"
          >
            <Dices className="w-3 h-3 shrink-0" />
            <span className="truncate">Escala</span>
          </button>

          <button
            type="button"
            onClick={() => updateMarkerPenConfig({ randomRotation: !markerPenConfig.randomRotation })}
            className={`py-1 px-1.5 rounded-lg border text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              markerPenConfig.randomRotation
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Giro Aleatório (0°-360°)"
          >
            <RotateCw className="w-3 h-3 shrink-0" />
            <span className="truncate">Giro</span>
          </button>
        </div>

        {/* Linha 4: Seletor Direto do Tipo de Marcador */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {MARKER_TYPE_OPTIONS.map((opt) => {
              const isSelected = activeMarkerType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateMarkerPenConfig({ markerType: opt.id })}
                  className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sub-linha discreta: Patrulha se for NPC, ou Efeito rápido se for outro tipo */}
          {activeMarkerType === 'npc' ? (
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px]">
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-emerald-300 shrink-0">
                <input
                  type="checkbox"
                  checked={isNpcAutoMove}
                  onChange={(e) => updateMarkerPenConfig({ npcAutoMove: e.target.checked })}
                  className="rounded accent-emerald-400 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Patrulha IA</span>
              </label>
              {isNpcAutoMove && (
                <div className="flex items-center gap-1.5 flex-1 justify-end">
                  <select
                    value={npcMoveMode}
                    onChange={(e) => updateMarkerPenConfig({ npcMoveMode: e.target.value as any })}
                    className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-200 focus:outline-none"
                  >
                    <option value="procedural">Livre</option>
                    <option value="horizontal">Horiz.</option>
                    <option value="vertical">Vert.</option>
                    <option value="random">Sorteio</option>
                  </select>
                  <span className="text-slate-500 font-mono">{npcDistance}px</span>
                  <input
                    type="range"
                    min={20}
                    max={200}
                    step={10}
                    value={npcDistance}
                    onChange={(e) => updateMarkerPenConfig({ npcMoveDistance: Number(e.target.value) })}
                    className="w-14 accent-emerald-400 h-1 bg-slate-900 rounded cursor-pointer"
                    title={`Raio: ${npcDistance}px`}
                  />
                  <span className="text-slate-500 font-mono">{npcSpeed.toFixed(1)}x</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => updateMarkerPenConfig({ neutralEffect: 'none' })}
                className={`px-2 py-0.5 rounded-md border text-[9px] font-semibold whitespace-nowrap cursor-pointer ${
                  (markerPenConfig.neutralEffect || 'none') === 'none'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Estático
              </button>
              {OFFICIAL_EFFECTS.map((fx) => (
                <button
                  key={fx.id}
                  type="button"
                  onClick={() => updateMarkerPenConfig({ neutralEffect: fx.id as any })}
                  className={`px-2 py-0.5 rounded-md border text-[9px] font-semibold flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                    markerPenConfig.neutralEffect === fx.id
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{fx.icon}</span>
                  <span>{fx.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. GALERIA EM TEMPO REAL COM CAIXAS DE SELEÇÃO E CATEGORIAS */}
      <div className="p-2.5 bg-slate-900/95 border border-slate-800 rounded-xl flex flex-col gap-2.5 flex-1">
        {/* Barra Superior da Galeria: Contagem de Selecionados + Ações Rápidas + Importar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-200">
            <span>Assets para Traçar</span>
            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-500/30 text-sky-300 font-mono text-[10px]">
              {selectedIds.size > 0 ? `${selectedIds.size} marcado(s)` : `Todos (${assets.length})`}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {filteredAssets.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 font-semibold cursor-pointer"
              >
                Todos
              </button>
            )}
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-rose-950/60 border border-slate-800 text-[10px] text-rose-400 font-semibold cursor-pointer"
              >
                Limpar
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 py-1 px-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-[10px] font-bold cursor-pointer"
              title="Importar PNG ou Vídeo para a galeria"
            >
              <Upload className="w-3 h-3" />
              <span>+ Asset</span>
            </button>
          </div>
        </div>

        {/* Categorias em Abas Rápidas */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap text-[10px] transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-sky-400 text-slate-950'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Todas ({assets.length})
          </button>
          {allCategories.map((cat) => {
            const count = assets.filter((a) => (a.category || 'Geral') === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap text-[10px] transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-sky-400 text-slate-950'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Busca Compacta */}
        {assets.length > 4 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar assets..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Grade da Galeria com Caixas de Seleção (Checkboxes) */}
        {filteredAssets.length === 0 ? (
          <div className="p-6 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl text-center space-y-2">
            <p className="text-xs text-slate-400">
              {assets.length === 0
                ? 'Nenhum asset na galeria.'
                : 'Nenhum asset nesta categoria.'}
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs font-bold hover:bg-sky-500/30 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Adicionar PNG / Vídeo</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-h-[380px] overflow-y-auto p-1.5 bg-slate-950 rounded-xl border border-slate-800/80 custom-scrollbar">
            {filteredAssets.map((asset) => {
              const isChecked = selectedIds.has(asset.id);
              const isVid = asset.mediaType === 'video' || Boolean(asset.videoUrl);
              const isMotion = Boolean(asset.motionLayers && asset.motionLayers.length > 0);
              return (
                <div
                  key={asset.id}
                  onClick={() => toggleAssetCheckbox(asset.id)}
                  className={`relative aspect-square rounded-xl border cursor-pointer p-1.5 flex flex-col items-center justify-center transition-all group ${
                    isChecked
                      ? 'bg-sky-500/15 border-sky-400 ring-1 ring-sky-400/60'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                  title={asset.name}
                >
                  <img
                    src={asset.dataUrl}
                    alt={asset.name}
                    className="w-full h-full object-contain select-none pointer-events-none"
                    loading="lazy"
                  />

                  {/* Caixa de Seleção (Checkbox) no canto superior direito */}
                  <div
                    className={`absolute top-1.5 right-1.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isChecked
                        ? 'bg-sky-400 border-sky-300 text-slate-950 shadow-xs'
                        : 'bg-slate-950/85 border-slate-600 text-transparent group-hover:border-slate-400'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>

                  {/* Indicador discreto de Vídeo ou Motion */}
                  {isVid && (
                    <span className="absolute top-1.5 left-1.5 px-1 rounded bg-purple-600/90 text-white text-[7px] font-bold flex items-center gap-0.5">
                      <Film className="w-2 h-2" />
                    </span>
                  )}
                  {!isVid && isMotion && (
                    <span className="absolute top-1.5 left-1.5 px-1 rounded bg-amber-400/90 text-slate-950 text-[7px] font-black">
                      ✨
                    </span>
                  )}

                  {/* Nome curto na base */}
                  <div className="absolute inset-x-0 bottom-0 py-0.5 px-1 bg-slate-950/85 rounded-b-xl text-[8px] text-center text-slate-300 truncate pointer-events-none">
                    {asset.name}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
