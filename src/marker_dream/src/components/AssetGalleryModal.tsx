import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GalleryAsset, SavedLevel } from '../types/map';
import {
  X,
  Search,
  Upload,
  FolderOpen,
  FolderPlus,
  Image as ImageIcon,
  Check,
  Tag,
  Sparkles,
  Loader2,
  Share2,
  Plus,
} from 'lucide-react';
import { readUploadedImage } from '../utils/tileGenerator';
import { readUploadedVideo, isVideoFile } from '../utils/videoUtils';
import { LocalFolderGalleryView } from './gallery';
import { localAssetSyncService, LocalSyncState } from '../services/localAssetSyncService';
import { extractCrossPhaseAssets, SharedPhaseAsset } from '../utils/assetSharingEngine';
import { loadLevelsGallery } from '../utils/storage';
import { PERMANENT_GALLERY_CATEGORIES } from './AssetGalleryStudio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (dataUrl: string, assetName?: string, asset?: GalleryAsset) => void;
  galleryAssets?: GalleryAsset[];
  categories?: string[];
  title?: string;
  subtitle?: string;
  onUploadNewAsset?: (newAsset: GalleryAsset) => void;
  onUploadMultipleAssets?: (newAssets: GalleryAsset[], newCategories: string[]) => void;
  savedLevels?: SavedLevel[];
  activeLevelId?: string | null;
}

export const AssetGalleryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectAsset,
  galleryAssets = [],
  categories = [],
  title = 'Galeria Oficial de Assets',
  subtitle = 'Escolha um PNG ou importe pastas completas já agrupadas por categoria',
  onUploadNewAsset,
  onUploadMultipleAssets,
  savedLevels = [],
  activeLevelId = null,
}) => {
  const [localAssets, setLocalAssets] = useState<GalleryAsset[]>(galleryAssets);
  const [localCategories, setLocalCategories] = useState<string[]>(categories);
  const [internalLevels, setInternalLevels] = useState<SavedLevel[]>(savedLevels);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('all');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [syncState, setSyncState] = useState<LocalSyncState>(localAssetSyncService.getState());
  const [activeSourceTab, setActiveSourceTab] = useState<'local_folder' | 'phase_assets' | 'shared_phases'>('local_folder');

  // Carrega fases salvas do banco se não fornecidas diretamente
  useEffect(() => {
    if (savedLevels && savedLevels.length > 0) {
      setInternalLevels(savedLevels);
    } else if (isOpen) {
      loadLevelsGallery().then((levels) => {
        if (levels && levels.length > 0) {
          setInternalLevels(levels);
        }
      });
    }
  }, [savedLevels, isOpen]);

  // Extrai assets compartilhados de todas as outras fases salvas
  const { allSharedAssets, phases } = useMemo(() => {
    return extractCrossPhaseAssets(internalLevels, null, activeLevelId);
  }, [internalLevels, activeLevelId]);

  // Filtra assets compartilhados por fase selecionada e busca
  const filteredSharedAssets = useMemo(() => {
    return allSharedAssets.filter((asset) => {
      const matchPhase =
        selectedPhaseFilter === 'all' || asset.sourcePhaseId === selectedPhaseFilter;
      const matchSearch =
        !search.trim() ||
        asset.name.toLowerCase().includes(search.toLowerCase().trim()) ||
        asset.sourcePhaseName.toLowerCase().includes(search.toLowerCase().trim());
      return matchPhase && matchSearch;
    });
  }, [allSharedAssets, selectedPhaseFilter, search]);

  const handleSelectSharedAsset = (sharedAsset: SharedPhaseAsset) => {
    const cloned: GalleryAsset = {
      id: `asset-shared-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: sharedAsset.name,
      dataUrl: sharedAsset.dataUrl,
      width: sharedAsset.width,
      height: sharedAsset.height,
      category: sharedAsset.category || 'Compartilhados',
      tags: Array.from(new Set([...(sharedAsset.tags || []), 'compartilhado', sharedAsset.sourcePhaseName])),
      motionLayers: sharedAsset.motionLayers ? JSON.parse(JSON.stringify(sharedAsset.motionLayers)) : undefined,
      mediaType: sharedAsset.mediaType,
      videoUrl: sharedAsset.videoUrl,
      videoChromaKey: sharedAsset.videoChromaKey,
      pivotX: sharedAsset.pivotX,
      pivotY: sharedAsset.pivotY,
      createdAt: new Date().toISOString(),
      isPersistentPhaseAsset: true,
    };
    onUploadNewAsset?.(cloned);
    onSelectAsset(cloned.dataUrl, cloned.name, cloned);
    onClose();
  };

  useEffect(() => {
    const unsub = localAssetSyncService.subscribe((state) => {
      setSyncState(state);
    });
    return unsub;
  }, []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  // Sincroniza props externas com estado local
  useEffect(() => {
    setLocalAssets(galleryAssets);
  }, [galleryAssets]);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  // Lista dinâmica e unificada de todas as categorias
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    PERMANENT_GALLERY_CATEGORIES.forEach((c) => set.add(c));
    localCategories.forEach((c) => set.add(c));
    localAssets.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return Array.from(set);
  }, [localCategories, localAssets]);

  // Filtra assets por categoria e busca por texto
  const filteredAssets = useMemo(() => {
    return localAssets.filter((asset) => {
      const matchCat =
        selectedCategory === 'all' ||
        (selectedCategory === 'uncategorized' && !asset.category) ||
        (selectedCategory === 'Itens de Inventário/Exploração'
          ? asset.category === 'Itens de Inventário/Exploração' ||
            asset.category === 'Inventário' ||
            asset.category === 'Itens' ||
            asset.category === 'Itens de Inventário' ||
            asset.category === 'Exploração' ||
            (asset.tags && (asset.tags.includes('item') || asset.tags.includes('inventario') || asset.tags.includes('quest') || asset.tags.includes('consumivel') || asset.tags.includes('livro') || asset.tags.includes('carta')))
          : asset.category === selectedCategory);
      const matchSearch =
        !search.trim() ||
        asset.name.toLowerCase().includes(search.toLowerCase().trim());
      return matchCat && matchSearch;
    });
  }, [localAssets, selectedCategory, search]);

  const handleConfirmSelect = (asset: GalleryAsset) => {
    onSelectAsset(asset.dataUrl, asset.name, asset);
    onClose();
  };

  // =========================================================================
  // 1. IMPORTAÇÃO POR PASTA (Folder Upload)
  // Cada pasta vira uma CATEGORIA automaticamente!
  // =========================================================================
  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newAssets: GalleryAsset[] = [];
    const discoveredCategories = new Set(allCategories);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp|svg)$/i.test(file.name);
      const isVid = file.type.startsWith('video/') || isVideoFile(file);
      if (!isImg && !isVid) continue;

      // webkitRelativePath formato ex: "NomeDaPasta/subpasta/arquivo.png"
      let folderCategory = 'Geral';
      const relPath = (file as any).webkitRelativePath || '';
      if (relPath) {
        const parts = relPath.split('/');
        if (parts.length > 1) {
          // Nome da pasta que contém o arquivo diretamente
          folderCategory = parts[parts.length - 2] || parts[0];
        }
      }
      discoveredCategories.add(folderCategory);

      try {
        if (isVid) {
          const vidRes = await readUploadedVideo(file);
          const cleanName = file.name.replace(/\.[^/.]+$/, '').trim() || `Vídeo #${localAssets.length + i + 1}`;
          const newAsset: GalleryAsset = {
            id: `asset-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            name: cleanName,
            dataUrl: vidRes.dataUrl,
            width: vidRes.width,
            height: vidRes.height,
            mediaType: 'video',
            videoUrl: vidRes.videoUrl,
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
            pivotX: 0.5,
            pivotY: 0.5,
            tags: ['video', 'custom', 'chroma'],
            category: folderCategory,
            createdAt: new Date().toISOString(),
          };
          newAssets.push(newAsset);
          onUploadNewAsset?.(newAsset);
        } else {
          const { dataUrl, width, height } = await readUploadedImage(file);
          const cleanName = file.name.replace(/\.[^/.]+$/, '').trim() || `Asset #${localAssets.length + i + 1}`;
          const newAsset: GalleryAsset = {
            id: `asset-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            name: cleanName,
            dataUrl,
            width,
            height,
            category: folderCategory,
            createdAt: new Date().toISOString(),
          };
          newAssets.push(newAsset);
          onUploadNewAsset?.(newAsset);
        }
      } catch (err) {
        console.error('Erro ao ler asset da pasta:', file.name, err);
      }
    }

    if (newAssets.length > 0) {
      setLocalAssets((prev) => [...newAssets, ...prev]);
      const catList = Array.from(discoveredCategories);
      setLocalCategories(catList);
      onUploadMultipleAssets?.(newAssets, catList);

      // Auto-seleciona a primeira categoria descoberta para o usuário ver os assets imediatamente
      const firstDiscovered = newAssets[0]?.category || 'all';
      setSelectedCategory(firstDiscovered);
    }

    setIsProcessing(false);
    e.target.value = '';
  };

  // =========================================================================
  // 2. IMPORTAÇÃO DE ARQUIVOS (PNG, WEBP, VÍDEOS MP4/WEBM/ETC) AVULSOS OU EM MASSA
  // =========================================================================
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newAssets: GalleryAsset[] = [];
    const defaultCat = selectedCategory !== 'all' && selectedCategory !== 'uncategorized' ? selectedCategory : 'Geral';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        if (isVideoFile(file)) {
          const vidRes = await readUploadedVideo(file);
          const cleanName = file.name.replace(/\.[^/.]+$/, '').trim() || `Vídeo #${localAssets.length + i + 1}`;
          const newAsset: GalleryAsset = {
            id: `asset-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            name: cleanName,
            dataUrl: vidRes.dataUrl,
            width: vidRes.width,
            height: vidRes.height,
            mediaType: 'video',
            videoUrl: vidRes.videoUrl,
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
            pivotX: 0.5,
            pivotY: 0.5,
            tags: ['video', 'custom', 'chroma'],
            category: defaultCat,
            createdAt: new Date().toISOString(),
          };
          newAssets.push(newAsset);
          onUploadNewAsset?.(newAsset);
        } else {
          const { dataUrl, width, height } = await readUploadedImage(file);
          const cleanName = file.name.replace(/\.[^/.]+$/, '').trim() || `Asset #${localAssets.length + i + 1}`;
          const newAsset: GalleryAsset = {
            id: `asset-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            name: cleanName,
            dataUrl,
            width,
            height,
            createdAt: new Date().toISOString(),
            category: defaultCat,
          };
          newAssets.push(newAsset);
          onUploadNewAsset?.(newAsset);
        }
      } catch (err) {
        console.error('Erro ao ler arquivo importado:', err);
      }
    }

    if (newAssets.length > 0) {
      setLocalAssets((prev) => [...newAssets, ...prev]);
      onUploadMultipleAssets?.(newAssets, [defaultCat]);
      if (newAssets.length === 1) {
        setSelectedAssetId(newAssets[0].id);
      }
    }

    setIsProcessing(false);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      {/* Hidden inputs para importação */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/webp,image/jpeg,image/svg+xml,image/gif,video/mp4,video/webm,video/ogg,video/quicktime,video/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-ignore
        webkitdirectory=""
        directory=""
        onChange={handleFolderUpload}
        className="hidden"
      />

      <div
        className="w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scaleUp relative text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* OVERLAY DE PROCESSAMENTO SE ESTIVER IMPORTANDO MUITOS ARQUIVOS */}
        {isProcessing && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <span className="font-black text-sm text-amber-300">Importando e organizando assets em categorias...</span>
            <span className="text-xs text-slate-400">Processando imagens e identificando pastas</span>
          </div>
        )}

        {/* HEADER */}
        <div className="p-4 px-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>{title}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                  {localAssets.length} assets
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Fechar galeria"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS DE SELEÇÃO: PASTA DO COMPUTADOR vs ACERVO DA FASE vs COMPARTILHAMENTO DE FASES */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-black border-b border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSourceTab('local_folder')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSourceTab === 'local_folder'
                ? 'bg-amber-400 text-black shadow-md font-black'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>📁 Pasta do Computador (Tempo Real)</span>
            {syncState.status === 'connected' && (
              <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{syncState.folderName || 'Conectado'}</span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSourceTab('phase_assets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSourceTab === 'phase_assets'
                ? 'bg-amber-400 text-black shadow-md font-black'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>🏛️ Acervo desta Fase ({localAssets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSourceTab('shared_phases')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSourceTab === 'shared_phases'
                ? 'bg-amber-400 text-black shadow-md font-black'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-blue-400" />
            <span>🌐 Compartilhamento de Fases ({allSharedAssets.length})</span>
          </button>
        </div>

        {activeSourceTab === 'local_folder' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
            <LocalFolderGalleryView
              isModalMode={true}
              onSelectAsset={(dataUrl, name, asset) => {
                onSelectAsset(dataUrl, name, asset);
                onClose();
              }}
              onUploadNewAsset={onUploadNewAsset}
            />
          </div>
        ) : activeSourceTab === 'shared_phases' ? (
          <div className="flex-1 flex flex-col min-h-0 bg-black">
            {/* TOOLBAR COMPARTILHAMENTO: BUSCA + IMPORTAR PNG */}
            <div className="p-3 px-6 bg-zinc-950 border-b border-zinc-850 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar asset compartilhado por nome ou fase..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-black border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Importar imagens ou vídeos diretamente para a fase"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>+ Importar PNG</span>
              </button>
            </div>

            {/* SELETOR DE ORIGEM (FASES SALVAS) */}
            <div className="px-6 py-2 bg-zinc-950/80 border-b border-zinc-850 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mr-1">Fases:</span>
              <button
                type="button"
                onClick={() => setSelectedPhaseFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedPhaseFilter === 'all'
                    ? 'bg-amber-400 text-black font-black shadow-md'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                Todas as Fases ({allSharedAssets.length})
              </button>
              {phases.map((ph) => (
                <button
                  key={ph.id}
                  type="button"
                  onClick={() => setSelectedPhaseFilter(ph.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    selectedPhaseFilter === ph.id
                      ? 'bg-blue-500 text-white font-black shadow-md'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>📦 {ph.name}</span>
                  <span className="font-mono text-[10px] opacity-75">({ph.assetCount})</span>
                </button>
              ))}
            </div>

            {/* GRID DE ASSETS COMPARTILHADOS */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              {filteredSharedAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-3">
                    <Share2 className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-zinc-300">Nenhum asset compartilhado encontrado</p>
                  <p className="text-xs text-zinc-500 max-w-sm mt-1">
                    Crie e salve outras fases ou importe assets para que apareçam automaticamente aqui no compartilhamento.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {filteredSharedAssets.map((asset) => {
                    const isSelected = selectedAssetId === asset.id;
                    const isVid = asset.mediaType === 'video' || Boolean(asset.videoUrl);
                    const isMotion = Boolean(asset.motionLayers && asset.motionLayers.length > 0);

                    return (
                      <div
                        key={asset.id}
                        onClick={() => setSelectedAssetId(asset.id)}
                        onDoubleClick={() => handleSelectSharedAsset(asset)}
                        className={`group relative flex flex-col items-center gap-2 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-900 border-amber-400 ring-2 ring-amber-400/40 shadow-xl'
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
                        }`}
                      >
                        {/* Selo da Fase de Origem */}
                        <div className="w-full flex items-center justify-between gap-1">
                          <span className="text-[9px] font-mono font-bold text-blue-300 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800/60 truncate max-w-[120px]" title={`Origem: ${asset.sourcePhaseName}`}>
                            📦 {asset.sourcePhaseName}
                          </span>
                          {isMotion && (
                            <span className="text-[9px] font-bold text-pink-300 bg-pink-950/80 px-1 py-0.5 rounded border border-pink-800/60">
                              Motion
                            </span>
                          )}
                          {isVid && (
                            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-800/60">
                              Vídeo
                            </span>
                          )}
                        </div>

                        {/* Thumbnail */}
                        <div
                          className="w-full aspect-square rounded-xl overflow-hidden p-2 flex items-center justify-center border border-zinc-800 group-hover:border-zinc-700 transition-colors relative"
                          style={{
                            backgroundImage:
                              'linear-gradient(45deg, #18181b 25%, transparent 25%), linear-gradient(-45deg, #18181b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #18181b 75%), linear-gradient(-45deg, transparent 75%, #18181b 75%)',
                            backgroundSize: '16px 16px',
                            backgroundColor: '#09090b',
                          }}
                        >
                          <img
                            src={asset.dataUrl}
                            alt={asset.name}
                            className="max-w-full max-h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-200 pointer-events-none"
                            loading="lazy"
                          />
                        </div>

                        {/* Informações */}
                        <div className="w-full text-center">
                          <div className="text-xs font-bold text-zinc-200 truncate group-hover:text-amber-300 transition-colors">
                            {asset.name}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            {asset.width && asset.height ? `${asset.width}x${asset.height}` : asset.category || 'Asset'}
                          </div>
                        </div>

                        {/* Botão rápido Usar */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSharedAsset(asset);
                          }}
                          className="w-full py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-[10px] font-black tracking-tight shadow-sm opacity-90 group-hover:opacity-100 transition-all cursor-pointer mt-1"
                        >
                          Usar nesta Fase
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* TOOLBAR: BUSCA + BOTÕES DE IMPORTAR PASTA E IMPORTS */}
            <div className="p-3 px-6 bg-slate-900 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          {/* Busca por nome */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar asset por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* BOTÕES DE IMPORTAÇÃO: PASTA (COM CATEGORIAS) E IMPORTS */}
          <div className="flex items-center gap-2">
            {/* BOTÃO PRINCIPAL: IMPORTAR PASTA (AGRUPA POR CATEGORIA) */}
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 active:scale-95 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              title="Importe uma pasta inteira: cada subpasta vira uma categoria automaticamente!"
            >
              <FolderPlus className="w-4 h-4 text-slate-950" />
              <span>📁 Importar Pasta</span>
            </button>

            {/* BOTÃO SECUNDÁRIO: IMPORTS (IMAGENS E VÍDEOS) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Importar imagens ou vídeos diretamente do computador"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Imports</span>
            </button>
          </div>
        </div>

        {/* BARRA DE CATEGORIAS DINÂMICAS */}
        {allCategories.length > 0 && (
          <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Todas ({localAssets.length})
            </button>
            {allCategories.map((cat) => {
              const count = localAssets.filter((a) => {
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
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat === 'Itens de Inventário/Exploração' ? (
                    <span>🎒</span>
                  ) : cat === 'Motion Canvas' ? (
                    <span>✨</span>
                  ) : cat === 'Telas Interativas' ? (
                    <span>📱</span>
                  ) : (
                    <Tag className="w-3 h-3" />
                  )}
                  <span>{cat}</span>
                  <span className="text-[10px] font-mono opacity-80">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* GRADE DE ASSETS */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {filteredAssets.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3.5">
              <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 shadow-inner">
                <ImageIcon className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">Nenhum asset encontrado</h4>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                {search
                  ? 'Nenhum item corresponde à sua busca por texto.'
                  : 'Você ainda não possui assets cadastrados nesta categoria. Você pode importar uma pasta inteira (o conteúdo será agrupado por categoria) ou arquivos de imagens/vídeos avulsos!'}
              </p>
              
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Importar Pasta (com Categorias)</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Imports</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredAssets.map((asset) => {
                const isSelected = selectedAssetId === asset.id;
                const isVideo = asset.mediaType === 'video' || Boolean(asset.videoUrl);
                return (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    onDoubleClick={() => handleConfirmSelect(asset)}
                    className={`group relative p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-between gap-2 select-none ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    {/* Badge de Vídeo */}
                    {isVideo && (
                      <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-black tracking-wider uppercase shadow-md flex items-center gap-1">
                        <span>🎬 VÍDEO</span>
                      </div>
                    )}

                    {/* Badge de Selecionado */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md animate-scaleUp">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}

                    {/* Preview da Imagem com fundo xadrez suave */}
                    <div
                      className="w-full aspect-square rounded-xl overflow-hidden p-2 flex items-center justify-center border border-slate-800/80 group-hover:border-slate-700 transition-colors relative"
                      style={{
                        backgroundImage:
                          'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                        backgroundSize: '16px 16px',
                        backgroundColor: '#0f172a',
                      }}
                    >
                      <img
                        src={asset.dataUrl}
                        alt={asset.name}
                        className="max-w-full max-h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-200 pointer-events-none"
                        loading="lazy"
                      />
                    </div>

                    {/* Informações do Asset */}
                    <div className="w-full text-center">
                      <div className="text-xs font-bold text-slate-200 truncate group-hover:text-amber-300 transition-colors">
                        {asset.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1.5 mt-0.5">
                        {asset.width && asset.height ? (
                          <span>
                            {asset.width}x{asset.height}
                          </span>
                        ) : null}
                        {asset.category && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400 font-sans text-[9px]">
                            {asset.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
          </>
        )}

        {/* RODAPÉ */}
        <div className="p-4 px-6 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {activeSourceTab === 'local_folder'
                ? 'Dica: Clique em qualquer asset da pasta local para aplicá-lo com persistência permanente.'
                : 'Dica: Dê duplo clique em qualquer asset para aplicar diretamente.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              {activeSourceTab === 'local_folder' ? 'Fechar' : 'Cancelar'}
            </button>
            {activeSourceTab === 'phase_assets' && (
              <button
                type="button"
                disabled={!selectedAssetId}
                onClick={() => {
                  const found = localAssets.find((a) => a.id === selectedAssetId);
                  if (found) handleConfirmSelect(found);
                }}
                className={`px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedAssetId
                    ? 'bg-amber-400 text-black shadow-lg shadow-amber-500/25 hover:bg-amber-300'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Usar Asset Selecionado</span>
              </button>
            )}

            {activeSourceTab === 'shared_phases' && (
              <button
                type="button"
                disabled={!selectedAssetId}
                onClick={() => {
                  const found = filteredSharedAssets.find((a) => a.id === selectedAssetId);
                  if (found) handleSelectSharedAsset(found);
                }}
                className={`px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedAssetId
                    ? 'bg-amber-400 text-black shadow-lg shadow-amber-500/25 hover:bg-amber-300'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Importar & Usar na Fase</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
