import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  ArrowUpDown,
  X,
  FolderOpen,
  Upload,
  Plus,
} from 'lucide-react';
import { LocalFolderAsset, GalleryAsset, MarkerType } from '../../types/map';
import { localAssetSyncService, LocalSyncState } from '../../services/localAssetSyncService';
import { LocalFolderConnectionBanner } from './LocalFolderConnectionBanner';
import { LocalAssetCard } from './LocalAssetCard';
import { readUploadedImage } from '../../utils/tileGenerator';
import { readUploadedVideo, isVideoFile } from '../../utils/videoUtils';

interface Props {
  onInsertMarker?: (asset: LocalFolderAsset, permanentAsset: GalleryAsset, targetType?: MarkerType) => void;
  onSelectAsset?: (dataUrl: string, assetName?: string, asset?: GalleryAsset) => void;
  onUploadNewAsset?: (permanentAsset: GalleryAsset) => void;
  onSetAsStamp?: (permanentDataUrl: string, assetName: string) => void;
  onTriggerFileUpload?: () => void;
  isModalMode?: boolean;
  phaseAssets?: GalleryAsset[];
  dropMarkerType?: MarkerType;
}

export const PERMANENT_ENGINE_CATEGORIES = [
  'Motion Canvas',
  'Telas Interativas',
  'Itens de Inventário/Exploração',
  'Marcadores da Fase',
  'Carimbos',
];

export const LocalFolderGalleryView: React.FC<Props> = ({
  onInsertMarker,
  onSelectAsset,
  onUploadNewAsset,
  onSetAsStamp,
  onTriggerFileUpload,
  isModalMode = false,
  phaseAssets = [],
  dropMarkerType = 'npc',
}) => {
  const [syncState, setSyncState] = useState<LocalSyncState>(localAssetSyncService.getState());
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [includeSubfolders, setIncludeSubfolders] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'date_desc' | 'size_desc' | 'size_asc'>('name_asc');
  const internalFileInputRef = useRef<HTMLInputElement>(null);

  const handleInternalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const isVid = file.type.startsWith('video/') || isVideoFile(file);
        if (isVid) {
          const vidRes = await readUploadedVideo(file);
          const newAsset: GalleryAsset = {
            id: `asset-local-upload-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name.replace(/\.[^/.]+$/, '').trim() || 'Vídeo Upload',
            dataUrl: vidRes.dataUrl,
            width: vidRes.width,
            height: vidRes.height,
            mediaType: 'video',
            videoUrl: vidRes.videoUrl,
            category: 'Itens de Inventário/Exploração',
            createdAt: new Date().toISOString(),
          };
          onUploadNewAsset?.(newAsset);
        } else {
          const { dataUrl, width, height } = await readUploadedImage(file);
          const newAsset: GalleryAsset = {
            id: `asset-local-upload-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name.replace(/\.[^/.]+$/, '').trim() || 'Imagem Upload',
            dataUrl,
            width,
            height,
            category: 'Itens de Inventário/Exploração',
            createdAt: new Date().toISOString(),
          };
          onUploadNewAsset?.(newAsset);
        }
      } catch (err) {
        console.error('Erro ao importar arquivo avulso:', err);
      }
    }
    e.target.value = '';
  };

  // Subscreve ao serviço de sincronização em tempo real
  useEffect(() => {
    const unsubscribe = localAssetSyncService.subscribe((newState) => {
      setSyncState(newState);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Extração inteligente de categorias / diretórios com contagens (1 clique)
  const categoryOptions = useMemo(() => {
    const dirMap = new Map<string, { label: string; count: number; isEngine?: boolean }>();
    const totalCount = syncState.assets.length;

    // 1. Categorias permanentes da engine (SEMPRE presentes, mesmo vazias com 0!)
    PERMANENT_ENGINE_CATEGORIES.forEach((cat) => {
      const count = phaseAssets.filter((a) => {
        if (cat === 'Marcadores da Fase') return a.category === cat || a.category === 'Marcadores';
        if (cat === 'Itens de Inventário/Exploração') {
          return (
            a.category === 'Itens de Inventário/Exploração' ||
            a.category === 'Inventário' ||
            a.category === 'Itens' ||
            a.category === 'Itens de Inventário' ||
            a.category === 'Exploração' ||
            (a.tags && (a.tags.includes('item') || a.tags.includes('inventario') || a.tags.includes('quest') || a.tags.includes('consumivel') || a.tags.includes('livro') || a.tags.includes('carta')))
          );
        }
        return a.category === cat;
      }).length;
      dirMap.set(cat, { label: cat, count, isEngine: true });
    });

    // 2. Pastas locais do PC
    syncState.assets.forEach((asset) => {
      if (asset.directory && asset.directory !== 'Raiz') {
        const existing = dirMap.get(asset.directory);
        if (existing) {
          existing.count++;
        } else {
          const label = asset.directory.split('/').pop() || asset.directory;
          dirMap.set(asset.directory, { label, count: 1 });
        }
      }

      if (asset.categories && asset.categories.length > 0) {
        asset.categories.forEach((cat) => {
          if (cat && cat !== 'Geral' && !dirMap.has(cat)) {
            const count = syncState.assets.filter(
              (a) => a.categories?.includes(cat) || a.directory === cat || a.directory.endsWith('/' + cat)
            ).length;
            if (count > 0 && !dirMap.has(cat)) {
              dirMap.set(cat, { label: cat, count });
            }
          }
        });
      }
    });

    const engineList: { path: string; label: string; count: number; isEngine?: boolean }[] = [];
    const localList: { path: string; label: string; count: number; isEngine?: boolean }[] = [];

    dirMap.forEach((data, path) => {
      if (data.isEngine) {
        engineList.push({ path, label: data.label, count: data.count, isEngine: true });
      } else {
        localList.push({ path, label: data.label, count: data.count });
      }
    });

    localList.sort((a, b) => b.count - a.count);

    return [
      { path: '', label: 'Todas as Categorias', count: totalCount },
      ...engineList,
      ...localList,
    ];
  }, [syncState.assets, phaseAssets]);

  // Filtragem e Ordenação dos Assets da Pasta Local e da Engine
  const filteredAssets = useMemo(() => {
    let list: LocalFolderAsset[] = [];

    // Se selecionou categoria nativa da engine (Motion Canvas, Telas Interativas, etc.)
    if (PERMANENT_ENGINE_CATEGORIES.includes(selectedPath)) {
      const matched = phaseAssets.filter((a) => {
        if (selectedPath === 'Marcadores da Fase') return a.category === selectedPath || a.category === 'Marcadores';
        if (selectedPath === 'Itens de Inventário/Exploração') {
          return (
            a.category === 'Itens de Inventário/Exploração' ||
            a.category === 'Inventário' ||
            a.category === 'Itens' ||
            a.category === 'Itens de Inventário' ||
            a.category === 'Exploração' ||
            (a.tags && (a.tags.includes('item') || a.tags.includes('inventario') || a.tags.includes('quest') || a.tags.includes('consumivel') || a.tags.includes('livro') || a.tags.includes('carta')))
          );
        }
        return a.category === selectedPath;
      });
      list = matched.map((pa) => ({
        id: pa.id,
        name: pa.name,
        filename: pa.name + '.png',
        relativePath: pa.name,
        directory: pa.category || 'Geral',
        categories: [pa.category || 'Geral'],
        previewUrl: pa.dataUrl,
        size: Math.round((pa.dataUrl.length * 3) / 4),
        lastModified: Date.now(),
        type: 'image' as const,
        motionLayers: pa.motionLayers,
      } as any));

      if (selectedPath === 'Itens de Inventário/Exploração') {
        const localMatches = syncState.assets.filter(
          (a) =>
            a.directory === 'Itens de Inventário/Exploração' ||
            a.directory.toLowerCase().includes('inventar') ||
            a.directory.toLowerCase().includes('item') ||
            a.directory.toLowerCase().includes('explora') ||
            a.categories?.some((c) =>
              c.toLowerCase().includes('inventar') ||
              c.toLowerCase().includes('item') ||
              c.toLowerCase().includes('explora') ||
              c.toLowerCase().includes('quest') ||
              c.toLowerCase().includes('consumivel') ||
              c.toLowerCase().includes('livro') ||
              c.toLowerCase().includes('carta')
            )
        );
        list = [...list, ...localMatches];
      }
    } else {
      list = [...syncState.assets];

      // 1. Filtro por pasta / subcategoria (1 Clique)
      if (selectedPath) {
        if (includeSubfolders) {
          list = list.filter(
            (a) =>
              a.directory === selectedPath ||
              a.directory.startsWith(selectedPath + '/') ||
              a.categories?.includes(selectedPath)
          );
        } else {
          list = list.filter(
            (a) =>
              a.directory === selectedPath ||
              (a.categories && a.categories[a.categories.length - 1] === selectedPath)
          );
        }
      }
    }

    // 2. Filtro por tipo de arquivo
    if (fileTypeFilter !== 'all') {
      list = list.filter((a) => a.type === fileTypeFilter);
    }

    // 3. Filtro por texto de busca
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.filename.toLowerCase().includes(q) ||
          a.directory.toLowerCase().includes(q)
      );
    }

    // 4. Ordenação
    return list.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'date_desc') return b.lastModified - a.lastModified;
      if (sortBy === 'size_desc') return b.size - a.size;
      if (sortBy === 'size_asc') return a.size - b.size;
      return 0;
    });
  }, [syncState.assets, phaseAssets, selectedPath, includeSubfolders, fileTypeFilter, searchQuery, sortBy]);

  // Contagem por tipo
  const counts = useMemo(() => {
    let images = 0;
    let videos = 0;
    let audios = 0;
    syncState.assets.forEach((a) => {
      if (a.type === 'image') images++;
      else if (a.type === 'video') videos++;
      else if (a.type === 'audio') audios++;
    });
    return { all: syncState.assets.length, images, videos, audios };
  }, [syncState.assets]);

  return (
    <div className="space-y-2">
      {/* 1. Banner de Conexão com a Pasta do PC (Linha Única) */}
      <LocalFolderConnectionBanner syncState={syncState} />

      {/* Input de upload avulso */}
      <input
        ref={internalFileInputRef}
        type="file"
        multiple
        accept="image/png, image/jpeg, image/webp, image/gif, video/mp4, video/webm, video/*"
        className="hidden"
        onChange={handleInternalFileUpload}
      />

      {/* Barra de Ações Rápidas: Importar PNGs Avulsos mesmo com pasta conectada */}
      <div className="flex items-center justify-between gap-2 p-2 bg-black border border-zinc-800 rounded-xl">
        <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-semibold">
          <Upload className="w-3.5 h-3.5 text-amber-400" />
          <span>Upload Direto de PNGs:</span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (onTriggerFileUpload) onTriggerFileUpload();
            else internalFileInputRef.current?.click();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-bold text-xs shadow-md transition-all cursor-pointer"
          title="Importar imagens PNG avulsas diretamente para a fase"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Importar PNG</span>
        </button>
      </div>

      {/* Conteúdo visível apenas se a pasta estiver conectada */}
      {syncState.status !== 'disconnected' && (
        <div className="space-y-2">
          {/* 2. Barra de Busca e Filtros Limpos */}
          <div className="space-y-1.5">
            {/* Linha 1: Input de Busca com Clear Button */}
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar assets..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-7 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
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

            {/* Linha 2: Filtros Compactos de Tipo e Ordenação */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                {[
                  { id: 'all' as const, label: 'Todos', count: counts.all },
                  { id: 'image' as const, label: 'Imgs', count: counts.images },
                  { id: 'video' as const, label: 'Vídeos', count: counts.videos },
                  { id: 'audio' as const, label: 'Áudios', count: counts.audios },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setFileTypeFilter(btn.id)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      fileTypeFilter === btn.id
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>{btn.label}</span>
                    <span className="font-mono text-[9px] opacity-75">({btn.count})</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <ArrowUpDown className="w-3 h-3 text-slate-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-0.5 text-[10px] text-slate-300 font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="name_asc">A-Z</option>
                  <option value="name_desc">Z-A</option>
                  <option value="date_desc">Recentes</option>
                  <option value="size_desc">Maior MB</option>
                  <option value="size_asc">Menor KB</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. SELETOR DE CATEGORIAS RÁPIDO (1 CLIQUE - ACIMA DO GRID) */}
          <div className="space-y-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800/90 shadow-sm">
            {/* Dropdown Direto + Subpastas + Clear */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <select
                  value={selectedPath}
                  onChange={(e) => setSelectedPath(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-bold focus:outline-none focus:border-amber-400 cursor-pointer truncate"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat.path} value={cat.path}>
                      {cat.path === '' ? `✨ ${cat.label} (${cat.count})` : `📁 ${cat.label} (${cat.count})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {selectedPath && (
                  <button
                    type="button"
                    onClick={() => setSelectedPath('')}
                    className="p-1 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] text-amber-400 font-bold border border-slate-800 transition-colors cursor-pointer"
                    title="Ver todas as categorias"
                  >
                    ✕ Todas
                  </button>
                )}

                <label className="flex items-center gap-1 text-[10px] text-slate-400 font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeSubfolders}
                    onChange={(e) => setIncludeSubfolders(e.target.checked)}
                    className="w-3 h-3 accent-amber-400 rounded cursor-pointer"
                  />
                  <span>Subpastas</span>
                </label>
              </div>
            </div>

            {/* Chips / Pílulas de Acesso Rápido em 1 Clique */}
            {categoryOptions.length > 1 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 pt-0.5 scrollbar-thin">
                {categoryOptions.map((cat) => {
                  const isSelected = selectedPath === cat.path;
                  return (
                    <button
                      key={cat.path}
                      type="button"
                      onClick={() => setSelectedPath(cat.path)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {cat.path === 'Itens de Inventário/Exploração' && <span>🎒</span>}
                      {cat.path === 'Motion Canvas' && <span>✨</span>}
                      {cat.path === 'Telas Interativas' && <span>📱</span>}
                      {cat.path === 'Marcadores da Fase' && <span>📍</span>}
                      {cat.path === 'Carimbos' && <span>🖌️</span>}
                      <span>{cat.path === '' ? 'Todas' : cat.label}</span>
                      <span
                        className={`font-mono text-[9px] ${
                          isSelected ? 'text-slate-900 font-black' : 'opacity-70 text-slate-500'
                        }`}
                      >
                        ({cat.count})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Grade de Assets (Grid 3x Focado no Asset com Thumbnails Limpos) */}
          {filteredAssets.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-1">
              <p className="text-xs font-bold text-slate-300">Nenhum asset encontrado</p>
              <p className="text-[10px] text-slate-500">
                {searchQuery
                  ? `Nenhum arquivo corresponde à busca "${searchQuery}".`
                  : 'Esta categoria não possui arquivos compatíveis.'}
              </p>
            </div>
          ) : (
            <div
              className={`grid gap-2 ${
                isModalMode
                  ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 max-h-[70vh] overflow-y-auto pr-1'
                  : 'grid-cols-3 max-h-[calc(100vh-270px)] overflow-y-auto pr-1'
              }`}
            >
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={async () => {
                    if (onSelectAsset) {
                      const permanent = await localAssetSyncService.makeAssetPersistent(asset);
                      onUploadNewAsset?.(permanent);
                      onSelectAsset(permanent.dataUrl, permanent.name, permanent);
                    }
                  }}
                  className={onSelectAsset ? 'cursor-pointer' : undefined}
                >
                  <LocalAssetCard
                    asset={asset}
                    dropMarkerType={dropMarkerType}
                    onSelectForMarker={(localA, permanent, targetType) => {
                      onUploadNewAsset?.(permanent);
                      onInsertMarker?.(localA, permanent, targetType || dropMarkerType);
                    }}
                    onSetAsStamp={onSetAsStamp}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
