import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GalleryAsset, MapMarker, MapProject, MarkerLayer, ActiveTool, MarkerType, SavedLevel } from '../types/map';
import {
  Upload,
  Trash2,
  Copy,
  FlipHorizontal,
  FlipVertical,
  CheckSquare,
  Square,
  Plus,
  Images,
  FolderOpen,
  Sparkles,
  Layers,
  PenTool,
  RotateCw,
  Dices,
  Check,
  Shuffle,
  FolderPlus,
  Folder,
  Settings2,
  Tag,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  Sliders,
  FolderKanban,
  Edit2,
  Filter,
  Film,
  Share2,
} from 'lucide-react';
import { readUploadedImage } from '../utils/tileGenerator';
import { isVideoFile, readUploadedVideo } from '../utils/videoUtils';
import { VideoAssetCanvas } from './video/VideoAssetCanvas';
import { VideoChromaKeyModal } from './video/VideoChromaKeyModal';
import { LocalFolderGalleryView } from './gallery';
import { localAssetSyncService } from '../services/localAssetSyncService';
import {
  extractCrossPhaseAssets,
  cloneAssetToCurrentProject,
  SharedPhaseAsset,
} from '../utils/assetSharingEngine';
import { loadLevelsGallery } from '../utils/storage';

export const PERMANENT_GALLERY_CATEGORIES = [
  'Motion Canvas',
  'Telas Interativas',
  'Itens de Inventário/Exploração',
  'Marcadores da Fase',
  'Carimbos',
  'Geral',
];

interface Props {
  project: MapProject;
  onUpdateProject: (updates: Partial<MapProject>) => void;
  onAddMarkerAt: (x: number, y: number, biomeId: string) => void;
  onUpdateMarker?: (markerId: string, updates: Partial<MapMarker>) => void;
  currentScrollY?: number;
  activeTool?: ActiveTool;
  setActiveTool?: (tool: ActiveTool) => void;
  onSelectMarker?: (markerId: string | null) => void;
  onOpenMarkerPen?: () => void;
  onOpenLayers?: () => void;
  savedLevels?: SavedLevel[];
  activeLevelId?: string | null;
}

export const AssetGalleryStudio: React.FC<Props> = ({
  project,
  onUpdateProject,
  currentScrollY = 150,
  activeTool,
  setActiveTool,
  onSelectMarker,
  onOpenMarkerPen,
  onOpenLayers,
  savedLevels,
  activeLevelId,
}) => {
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isAdvancedManagerOpen, setIsAdvancedManagerOpen] = useState<boolean>(false);
  const [gallerySourceTab, setGallerySourceTab] = useState<'local_folder' | 'phase_assets' | 'shared_phases'>('local_folder');
  const [dropMarkerType, setDropMarkerType] = useState<MarkerType>('npc');
  const [chromaModalAsset, setChromaModalAsset] = useState<GalleryAsset | null>(null);

  // Compartilhamento de Fases
  const [internalLevels, setInternalLevels] = useState<SavedLevel[]>(savedLevels || []);
  const [selectedSharedPhaseId, setSelectedSharedPhaseId] = useState<string>('all');
  const [sharedSearchQuery, setSharedSearchQuery] = useState<string>('');
  const [copiedSharedAssetId, setCopiedSharedAssetId] = useState<string | null>(null);

  useEffect(() => {
    if (savedLevels && savedLevels.length > 0) {
      setInternalLevels(savedLevels);
    } else {
      loadLevelsGallery().then((loaded) => {
        if (loaded && loaded.length > 0) {
          setInternalLevels(loaded);
        }
      });
    }
  }, [savedLevels]);

  const { allSharedAssets: sharedPhaseAssets, phases: sharedPhasesList } = useMemo(() => {
    return extractCrossPhaseAssets(internalLevels, project, activeLevelId);
  }, [internalLevels, project, activeLevelId]);

  const filteredSharedAssets = useMemo(() => {
    return sharedPhaseAssets.filter((item: SharedPhaseAsset) => {
      if (selectedSharedPhaseId !== 'all' && item.sourcePhaseId !== selectedSharedPhaseId) {
        return false;
      }
      if (sharedSearchQuery.trim()) {
        const query = sharedSearchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesPhase = item.sourcePhaseName.toLowerCase().includes(query);
        const matchesCat = (item.category || '').toLowerCase().includes(query);
        if (!matchesName && !matchesPhase && !matchesCat) return false;
      }
      return true;
    });
  }, [sharedPhaseAssets, selectedSharedPhaseId, sharedSearchQuery]);

  // Filtros e busca
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Lista de categorias do projeto (sempre inclui as permanentes, mesmo vazias)
  const categories = useMemo(() => {
    const list = project.galleryCategories || [];
    const fromAssets = new Set<string>();
    (project.galleryAssets || []).forEach((a) => {
      if (a.category && a.category.trim()) fromAssets.add(a.category.trim());
    });
    const combined = Array.from(new Set([...PERMANENT_GALLERY_CATEGORIES, ...list, ...Array.from(fromAssets)]));
    return combined;
  }, [project.galleryCategories, project.galleryAssets]);

  // Camadas do projeto (inicializa camadas padrão caso não existam)
  const layers: MarkerLayer[] = useMemo(() => {
    if (project.markerLayers && project.markerLayers.length > 0) {
      return [...project.markerLayers].sort((a, b) => b.order - a.order);
    }
    return [
      { id: 'layer-1', name: 'Camada 1 - Chão & Base', visible: true, locked: false, order: 0, color: '#38bdf8' },
    ];
  }, [project.markerLayers]);

  // Garante que o projeto tenha ao menos uma camada registrada
  useEffect(() => {
    if (!project.markerLayers || project.markerLayers.length === 0) {
      onUpdateProject({
        markerLayers: [
          { id: 'layer-1', name: 'Camada 1 - Chão & Base', visible: true, locked: false, order: 0, color: '#38bdf8' },
        ],
        activeMarkerLayerId: 'layer-1',
      });
    }
  }, [project.markerLayers]);

  const activeLayerId = project.activeMarkerLayerId || project.markerPenConfig?.targetLayerId || layers[0]?.id || 'layer-1';

  // 1. Sincroniza automaticamente todos os assets e composições do Motion Canvas e Telas Interativas
  useEffect(() => {
    const existingGallery = project.galleryAssets || [];
    // Limpa automaticamente peças avulsas residuais geradas anteriormente
    const cleanedExisting = existingGallery.filter(
      (a) =>
        a.category !== 'Peças Motion Canvas' &&
        !a.id.startsWith('gallery-piece-') &&
        !a.id.startsWith('asset-piece-')
    );

    const knownUrls = new Set(cleanedExisting.map((g) => g.dataUrl));
    const importedFromMarkers: GalleryAsset[] = [];
    const hasMotionLayers = (m: MapMarker) => !!(m.motionLayers && m.motionLayers.length > 0);
    const isInteractiveScreenMarker = (m: MapMarker) => Boolean(
      (m as any).interactiveScreenConfig ||
      (m as any).stationConfig ||
      (m as any).type === 'station' ||
      m.dialogueId ||
      (m as any).dialogueTree
    );

    (project.markers || []).forEach((m) => {
      const isMotion = hasMotionLayers(m);
      const isInteractive = isInteractiveScreenMarker(m);
      const isItemOrCollectible = m.type === 'collectible' || (m as any).isItem || Boolean((m as any).itemReward);
      let cat = 'Marcadores da Fase';
      if (isMotion) {
        cat = 'Motion Canvas';
      } else if (isInteractive) {
        cat = 'Telas Interativas';
      } else if (isItemOrCollectible) {
        cat = 'Itens de Inventário/Exploração';
      }

      if (m.customIconPng && !knownUrls.has(m.customIconPng)) {
        knownUrls.add(m.customIconPng);
        importedFromMarkers.push({
          id: `asset-marker-${m.id}`,
          name: isMotion
            ? `${m.name || 'Composição'} (Motion Canvas)`
            : isInteractive
            ? `${m.name || 'Tela Interativa'}`
            : isItemOrCollectible
            ? `${m.name || 'Item de Exploração'}`
            : m.name || 'Marcador da Fase',
          dataUrl: m.customIconPng,
          width: m.size || 64,
          height: m.size || 64,
          category: cat,
          motionLayers: isMotion ? JSON.parse(JSON.stringify(m.motionLayers)) : undefined,
          createdAt: new Date().toISOString(),
        });
      }
    });

    // Sincroniza também itens de inventário e exploração cadastrados no projeto
    const inventoryItems = [
      ...(project.playerInventory?.items || []),
      ...(project.itemCatalog || []),
    ];
    inventoryItems.forEach((item) => {
      const img = item.iconPng || (item as any).pngUrl;
      if (img && !knownUrls.has(img)) {
        knownUrls.add(img);
        importedFromMarkers.push({
          id: `asset-item-${item.id}`,
          name: item.name || 'Item de Inventário',
          dataUrl: img,
          width: 64,
          height: 64,
          category: 'Itens de Inventário/Exploração',
          tags: ['item', 'inventario', 'exploracao', (item as any).category || (item as any).type || 'consumivel'],
          createdAt: new Date().toISOString(),
        });
      }
    });

    const hadPiecesToRemove = cleanedExisting.length !== existingGallery.length;
    if (importedFromMarkers.length > 0 || hadPiecesToRemove) {
      const allCats = new Set([
        ...PERMANENT_GALLERY_CATEGORIES,
        ...(project.galleryCategories || []),
      ]);

      onUpdateProject({
        galleryAssets: [...cleanedExisting, ...importedFromMarkers],
        galleryCategories: Array.from(allCats),
      });
    }
  }, [project.markers, project.playerInventory, project.itemCatalog]);

  const assets = project.galleryAssets || [];

  // Filtragem de assets por categoria e busca
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchCategory =
        selectedCategory === 'all'
          ? true
          : selectedCategory === 'uncategorized'
          ? !asset.category || asset.category === 'Geral'
          : selectedCategory === 'Itens de Inventário/Exploração'
          ? asset.category === 'Itens de Inventário/Exploração' ||
            asset.category === 'Inventário' ||
            asset.category === 'Itens' ||
            asset.category === 'Itens de Inventário' ||
            asset.category === 'Exploração' ||
            (asset.tags && (asset.tags.includes('item') || asset.tags.includes('inventario') || asset.tags.includes('quest') || asset.tags.includes('consumivel') || asset.tags.includes('livro') || asset.tags.includes('carta')))
          : asset.category === selectedCategory;

      const matchSearch =
        !searchQuery.trim() ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.category && asset.category.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchCategory && matchSearch;
    });
  }, [assets, selectedCategory, searchQuery]);

  // 2. Upload em massa de arquivos (Imagens e Vídeos)
  const handleMassUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newAssets: GalleryAsset[] = [];
    const defaultCat =
      selectedCategory !== 'all' && selectedCategory !== 'uncategorized'
        ? selectedCategory
        : 'Itens de Inventário/Exploração';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        if (isVideoFile(file)) {
          const vid = await readUploadedVideo(file);
          const cleanName = file.name.replace(/\.[^/.]+$/, '').trim() || `Vídeo #${assets.length + i + 1}`;
          newAssets.push({
            id: `asset-vid-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            name: cleanName,
            dataUrl: vid.dataUrl,
            videoUrl: vid.videoUrl,
            mediaType: 'video',
            width: vid.width,
            height: vid.height,
            category: defaultCat,
            videoChromaKey: {
              enabled: true,
              color: '#00ff00',
              tolerance: 35,
              smoothness: 12,
              cropSquare: true,
              cropOffsetX: 0.5,
              cropOffsetY: 0.5,
            },
            pivotX: 0.5,
            pivotY: 0.5,
            createdAt: new Date().toISOString(),
          });
        } else {
          const res = await readUploadedImage(file);
          const cleanName = file.name.replace(/\.[^/.]+$/, '').trim() || `Asset #${assets.length + i + 1}`;
          newAssets.push({
            id: `asset-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            name: cleanName,
            dataUrl: res.dataUrl,
            mediaType: 'image',
            width: res.width,
            height: res.height,
            category: defaultCat,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Erro ao importar arquivo:', file.name, err);
      }
    }

    if (newAssets.length > 0) {
      const currentCats = new Set(project.galleryCategories || ['Geral']);
      currentCats.add(defaultCat);

      const newCatalogItems: import('../types/map').InventoryItemDefinition[] = newAssets
        .filter((a) => a.mediaType !== 'video')
        .map((a) => ({
          id: `item-${a.id}`,
          name: a.name,
          iconPng: a.dataUrl,
          iconEmoji: '📦',
          shortDescription: 'Item interativo de exploração importado para o jogo.',
          category: 'collectible' as const,
          rarity: 'common' as const,
          stackable: true,
          maxStack: 99,
          usableActions: ['use', 'inspect', 'drop'],
        }));

      const existingCatalog = project.itemCatalog || [];

      onUpdateProject({
        galleryAssets: [...newAssets, ...assets],
        galleryCategories: Array.from(currentCats),
        itemCatalog: [...newCatalogItems, ...existingCatalog],
      });
    }

    setIsProcessing(false);
    e.target.value = '';
  };

  // 3. Upload por Pastas (Folder Import)
  // Cada pasta vira uma CATEGORIA automaticamente (suporta imagens e vídeos)!
  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newAssets: GalleryAsset[] = [];
    const discoveredCategories = new Set(project.galleryCategories || ['Geral']);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = isVideoFile(file);
      const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|svg)$/i.test(file.name);
      if (!isVideo && !isImage) continue;

      let folderCategory = 'Itens de Inventário/Exploração';
      const relPath = (file as any).webkitRelativePath || '';
      if (relPath) {
        const parts = relPath.split('/');
        if (parts.length > 1) {
          folderCategory = parts[parts.length - 2] || parts[0];
        }
      }
      discoveredCategories.add(folderCategory);

      try {
        if (isVideo) {
          const vid = await readUploadedVideo(file);
          const cleanName = file.name.replace(/\.[^/.]+$/, '').trim() || `Vídeo #${assets.length + i + 1}`;
          newAssets.push({
            id: `asset-vid-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            name: cleanName,
            dataUrl: vid.dataUrl,
            videoUrl: vid.videoUrl,
            mediaType: 'video',
            width: vid.width,
            height: vid.height,
            category: folderCategory,
            videoChromaKey: {
              enabled: true,
              color: '#00ff00',
              tolerance: 35,
              smoothness: 12,
              cropSquare: true,
              cropOffsetX: 0.5,
              cropOffsetY: 0.5,
            },
            pivotX: 0.5,
            pivotY: 0.5,
            createdAt: new Date().toISOString(),
          });
        } else {
          const res = await readUploadedImage(file);
          const cleanName = file.name.replace(/\.[^/.]+$/, '').trim() || `Asset #${assets.length + i + 1}`;
          newAssets.push({
            id: `asset-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            name: cleanName,
            dataUrl: res.dataUrl,
            mediaType: 'image',
            width: res.width,
            height: res.height,
            category: folderCategory,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Erro ao importar da pasta:', file.name, err);
      }
    }

    if (newAssets.length > 0) {
      const newCatalogItems: import('../types/map').InventoryItemDefinition[] = newAssets
        .filter((a) => a.mediaType !== 'video')
        .map((a) => ({
          id: `item-${a.id}`,
          name: a.name,
          iconPng: a.dataUrl,
          iconEmoji: '📦',
          shortDescription: 'Item interativo de exploração importado de pasta.',
          category: 'collectible' as const,
          rarity: 'common' as const,
          stackable: true,
          maxStack: 99,
          usableActions: ['use', 'inspect', 'drop'],
        }));

      const existingCatalog = project.itemCatalog || [];

      onUpdateProject({
        galleryAssets: [...newAssets, ...assets],
        galleryCategories: Array.from(discoveredCategories),
        itemCatalog: [...newCatalogItems, ...existingCatalog],
      });
    }

    setIsProcessing(false);
    e.target.value = '';
  };

  // Salvar configurações de Chroma Key, Corte Square e Pivô
  const handleSaveChromaKey = (saved: {
    chromaKey: import('../types/map').VideoChromaKeyConfig;
    pivotX: number;
    pivotY: number;
  }) => {
    if (!chromaModalAsset) return;

    const updatedGallery = assets.map((a) =>
      a.id === chromaModalAsset.id
        ? {
            ...a,
            videoChromaKey: saved.chromaKey,
            pivotX: saved.pivotX,
            pivotY: saved.pivotY,
          }
        : a
    );

    const updatedMarkers = (project.markers || []).map((m) => {
      const match =
        (m.videoUrl && m.videoUrl === chromaModalAsset.videoUrl) ||
        (m.customIconPng && m.customIconPng === chromaModalAsset.dataUrl);

      if (match) {
        return {
          ...m,
          videoChromaKey: saved.chromaKey,
          pivotX: saved.pivotX,
          pivotY: saved.pivotY,
        };
      }
      return m;
    });

    onUpdateProject({
      galleryAssets: updatedGallery,
      markers: updatedMarkers,
    });
    setChromaModalAsset(null);
  };

  // 4. Criação e manipulação de Categorias
  const handleCreateCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = new Set(project.galleryCategories || ['Geral']);
    current.add(trimmed);
    onUpdateProject({ galleryCategories: Array.from(current) });
    setNewCategoryName('');
    setSelectedCategory(trimmed);
  };

  const handleDeleteCategory = (catToDelete: string) => {
    const remainingCats = (project.galleryCategories || ['Geral']).filter((c) => c !== catToDelete);
    // Assets dessa categoria voltam para Geral
    const updatedAssets = assets.map((a) => (a.category === catToDelete ? { ...a, category: 'Geral' } : a));
    onUpdateProject({
      galleryCategories: remainingCats.length > 0 ? remainingCats : ['Geral'],
      galleryAssets: updatedAssets,
    });
    if (selectedCategory === catToDelete) setSelectedCategory('all');
  };

  const handleAssignCategoryToSelected = (categoryName: string) => {
    if (selectedAssetIds.size === 0) return;
    const updated = assets.map((a) => (selectedAssetIds.has(a.id) ? { ...a, category: categoryName } : a));
    onUpdateProject({ galleryAssets: updated });
  };

  // 5. Seleção manual e em massa
  const handleToggleSelect = (id: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredAssets.map((a) => a.id);
    const allSelected = visibleIds.every((id) => selectedAssetIds.has(id));
    if (allSelected) {
      setSelectedAssetIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedAssetIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  // 6. Ações em Lote: Excluir, Duplicar, Mirror
  const handleDeleteSelected = () => {
    if (selectedAssetIds.size === 0) return;
    const remaining = assets.filter((a) => !selectedAssetIds.has(a.id));
    onUpdateProject({ galleryAssets: remaining });
    setSelectedAssetIds(new Set());
  };

  const handleDeleteSingle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateProject({ galleryAssets: assets.filter((a) => a.id !== id) });
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleDuplicateSelected = () => {
    if (selectedAssetIds.size === 0) return;
    const duplicated: GalleryAsset[] = [];
    assets.forEach((a) => {
      if (selectedAssetIds.has(a.id)) {
        duplicated.push({
          ...a,
          id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: `${a.name} (Cópia)`,
          createdAt: new Date().toISOString(),
        });
      }
    });
    onUpdateProject({ galleryAssets: [...duplicated, ...assets] });
  };

  const handleDuplicateSingle = (asset: GalleryAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    const copy: GalleryAsset = {
      ...asset,
      id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${asset.name} (Cópia)`,
      createdAt: new Date().toISOString(),
    };
    onUpdateProject({ galleryAssets: [copy, ...assets] });
  };

  // Espelhamento Horizontal
  const mirrorDataUrl = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.translate(img.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleMirrorSelected = async () => {
    if (selectedAssetIds.size === 0) return;
    setIsProcessing(true);
    const updated = await Promise.all(
      assets.map(async (a) => {
        if (selectedAssetIds.has(a.id)) {
          const mirroredUrl = await mirrorDataUrl(a.dataUrl);
          return { ...a, dataUrl: mirroredUrl, mirrored: !a.mirrored };
        }
        return a;
      })
    );
    onUpdateProject({ galleryAssets: updated });
    setIsProcessing(false);
  };

  const handleMirrorSingle = async (asset: GalleryAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    const mirroredUrl = await mirrorDataUrl(asset.dataUrl);
    const updated = assets.map((a) => (a.id === asset.id ? { ...a, dataUrl: mirroredUrl, mirrored: !a.mirrored } : a));
    onUpdateProject({ galleryAssets: updated });
    setIsProcessing(false);
  };

  // 7. Inserir no mapa como Marcador (Conforme o tipo selecionado: NPC, Objeto, Tela, Luz, etc.)
  const handleInsertMarkerFromGallery = (
    asset: GalleryAsset,
    e?: React.MouseEvent,
    forcedType?: MarkerType
  ) => {
    if (e) e.stopPropagation();

    const targetType: MarkerType = forcedType || dropMarkerType || 'npc';
    const isNpc = targetType === 'npc';
    const isInteractive = targetType === 'interactive_screen';
    const isLight = targetType === 'light';

    const targetX = Math.round((project.mapWidth || 768) / 2);
    const targetY = Math.max(80, Math.round(currentScrollY + 120));

    const newMarker: MapMarker = {
      id: `marker-${targetType}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: asset.name || (isNpc ? 'Novo NPC' : isInteractive ? 'Nova Tela' : isLight ? 'Ponto de Luz' : 'Objeto Neutro'),
      description: isNpc ? 'Personagem NPC' : isInteractive ? 'Tela Interativa' : isLight ? 'Ponto de Iluminação' : 'Objeto de cenário neutro',
      type: targetType,
      color: isNpc ? '#10b981' : isInteractive ? '#a855f7' : isLight ? '#eab308' : '#64748b',
      status: 'discovered',
      x: targetX,
      y: targetY,
      layerId: activeLayerId,
      customIconPng: asset.dataUrl,
      size: (asset as any)?.size && typeof (asset as any).size === 'number' && (asset as any).size >= 16 && (asset as any).size <= 3000 ? (asset as any).size : 150,
      solidCollision: !isLight,
      hasShadow: true,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      npcBounce: isNpc,
      effect: isNpc ? 'jelly' : 'none',
      effectIntensity: isNpc ? 0.45 : 1.0,
      jellyIntensity: isNpc ? 0.45 : 1.0,
      npcPatrol: isNpc ? {
        enabled: false,
        preset: 'horizontal',
        walkStyle: 'jelly',
        speed: 2.0,
        distance: 60,
        pauseTime: 1.5,
        loop: true,
      } : undefined,
      motionLayers: asset.motionLayers ? JSON.parse(JSON.stringify(asset.motionLayers)) : undefined,
      motionAsset: Boolean(asset.motionLayers && asset.motionLayers.length > 0),
      mediaType: asset.mediaType || (asset.videoUrl ? 'video' : 'image'),
      videoUrl: asset.videoUrl,
      videoChromaKey: asset.videoChromaKey,
      pivotX: asset.pivotX ?? 0.5,
      pivotY: asset.pivotY ?? 0.5,
    };

    onUpdateProject({
      markers: [...(project.markers || []), newMarker],
    });
    onSelectMarker?.(newMarker.id);
  };

  const handleInsertSelectedFromGallery = () => {
    if (selectedAssetIds.size === 0) return;
    const targetType: MarkerType = dropMarkerType || 'npc';
    const isNpc = targetType === 'npc';
    const isInteractive = targetType === 'interactive_screen';
    const isLight = targetType === 'light';

    const selected = assets.filter((a) => selectedAssetIds.has(a.id));
    const newMarkers: MapMarker[] = selected.map((asset, idx) => {
      const targetX = Math.round((project.mapWidth || 768) / 2 + (idx % 3 - 1) * 60);
      const targetY = Math.max(80, Math.round(currentScrollY + 120 + Math.floor(idx / 3) * 60));

      return {
        id: `marker-${targetType}-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        name: asset.name || (isNpc ? `NPC ${idx + 1}` : `Objeto ${idx + 1}`),
        description: isNpc ? 'Personagem NPC' : isInteractive ? 'Tela Interativa' : isLight ? 'Ponto de Iluminação' : 'Objeto de cenário neutro',
        type: targetType,
        color: isNpc ? '#10b981' : isInteractive ? '#a855f7' : isLight ? '#eab308' : '#64748b',
        status: 'discovered',
        x: targetX,
        y: targetY,
        layerId: activeLayerId,
        customIconPng: asset.dataUrl,
        size: (asset as any)?.size && typeof (asset as any).size === 'number' && (asset as any).size >= 16 && (asset as any).size <= 3000 ? (asset as any).size : 150,
        solidCollision: !isLight,
        hasShadow: true,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        npcBounce: isNpc,
        effect: isNpc ? 'jelly' : 'none',
        effectIntensity: isNpc ? 0.45 : 1.0,
        jellyIntensity: isNpc ? 0.45 : 1.0,
        npcPatrol: isNpc ? {
          enabled: false,
          preset: 'horizontal',
          walkStyle: 'jelly',
          speed: 2.0,
          distance: 60,
          pauseTime: 1.5,
          loop: true,
        } : undefined,
        motionLayers: asset.motionLayers ? JSON.parse(JSON.stringify(asset.motionLayers)) : undefined,
        motionAsset: Boolean(asset.motionLayers && asset.motionLayers.length > 0),
        mediaType: asset.mediaType || (asset.videoUrl ? 'video' : 'image'),
        videoUrl: asset.videoUrl,
        videoChromaKey: asset.videoChromaKey,
        pivotX: asset.pivotX ?? 0.5,
        pivotY: asset.pivotY ?? 0.5,
      };
    });

    onUpdateProject({
      markers: [...(project.markers || []), ...newMarkers],
    });
    setSelectedAssetIds(new Set());
  };



  const handleUseSharedAsset = (sharedItem: SharedPhaseAsset, action: 'insert' | 'copy' | 'stamp') => {
    const { updatedProject, clonedAsset, isNew } = cloneAssetToCurrentProject(
      sharedItem,
      project,
      sharedItem.sourcePhaseName
    );
    if (isNew) {
      onUpdateProject({
        galleryAssets: updatedProject.galleryAssets,
        galleryCategories: updatedProject.galleryCategories,
      });
    }
    setCopiedSharedAssetId(sharedItem.id);
    setTimeout(() => setCopiedSharedAssetId(null), 1800);

    if (action === 'insert') {
      handleInsertMarkerFromGallery(clonedAsset, undefined, dropMarkerType);
    } else if (action === 'stamp') {
      onUpdateProject({
        stampBrushConfig: {
          ...(project.stampBrushConfig || {
            size: 52,
            feather: 14,
            spacing: 36,
            randomRotation: true,
            randomMirror: true,
            opacity: 0.9,
            activeLayerId: 'layer-ground-1',
          }),
          pngUrl: clonedAsset.dataUrl,
        },
      });
      setActiveTool?.('stamp_brush');
    }
  };

  return (
    <div className="space-y-4">
      {/* Inputs ocultos para importação */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png, image/jpeg, image/webp, video/mp4, video/webm, video/ogg, video/quicktime, video/*"
        className="hidden"
        onChange={handleMassUpload}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-ignore
        webkitdirectory=""
        directory=""
        className="hidden"
        onChange={handleFolderUpload}
      />

      {/* CABEÇALHO COMPACTO: ACERVO & ATALHOS */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-100">Galeria de Assets</span>
          <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
            {gallerySourceTab === 'local_folder'
              ? 'Local'
              : gallerySourceTab === 'phase_assets'
              ? assets.length
              : sharedPhaseAssets.length}
          </span>
        </div>

        {/* Atalhos para Studios Dedicados, Importação Rápida e Tela Cheia */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold transition-all cursor-pointer"
            title="Importar imagem PNG/JPG avulsa para a fase"
          >
            <Plus className="w-3 h-3 text-emerald-400" />
            <span>+ PNG</span>
          </button>
          {onOpenMarkerPen && (
            <button
              onClick={onOpenMarkerPen}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/20 text-[10px] font-semibold transition-all cursor-pointer"
              title="Abrir Marker Pen"
            >
              <PenTool className="w-3 h-3" />
              <span>Marker Pen</span>
            </button>
          )}
          {onOpenLayers && (
            <button
              onClick={onOpenLayers}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-[10px] font-semibold transition-all cursor-pointer"
              title="Abrir Camadas"
            >
              <Layers className="w-3 h-3" />
              <span>Camadas</span>
            </button>
          )}
          <button
            onClick={() => setIsAdvancedManagerOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[10px] font-bold transition-all cursor-pointer"
            title="Abrir Gerenciador de Assets em Tela Cheia"
          >
            <FolderKanban className="w-3 h-3" />
            <span>Tela Cheia</span>
          </button>
        </div>
      </div>

      {/* SELETOR DE ORIGEM COMPACTO + SELETOR DE TIPO DE MARCADOR */}
      <div className="flex flex-col gap-1.5 p-1.5 bg-slate-950 border border-slate-800 rounded-xl mb-2">
        {/* Origem compacta de 3 abas */}
        <div className="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded-lg border border-slate-800 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setGallerySourceTab('local_folder')}
            className={`flex items-center gap-1 py-1 px-2 rounded-md text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              gallerySourceTab === 'local_folder'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Pasta Local sincronizada do PC em tempo real"
          >
            <Folder className="w-3 h-3" />
            <span>📁 Local</span>
          </button>

          <button
            onClick={() => setGallerySourceTab('phase_assets')}
            className={`flex items-center gap-1 py-1 px-2 rounded-md text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              gallerySourceTab === 'phase_assets'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                : 'text-slate-400 hover:text-white'
            }`}
            title={`Acervo desta Fase (${assets.length} assets)`}
          >
            <Images className="w-3 h-3" />
            <span>🏛️ Fase ({assets.length})</span>
          </button>

          <button
            onClick={() => setGallerySourceTab('shared_phases')}
            className={`flex items-center gap-1 py-1 px-2 rounded-md text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              gallerySourceTab === 'shared_phases'
                ? 'bg-sky-500 text-slate-950 shadow-sm font-black'
                : 'text-slate-400 hover:text-white'
            }`}
            title={`Compartilhamento de assets salvos em outras fases (${sharedPhaseAssets.length} assets)`}
          >
            <Share2 className="w-3 h-3" />
            <span>🌐 Outras Fases ({sharedPhaseAssets.length})</span>
          </button>
        </div>

        {/* Seletor do Tipo de Marcador ao Inserir/Arrastar */}
        <div className="flex items-center justify-between gap-1 bg-slate-900/90 border border-amber-500/30 rounded-lg px-2 py-1">
          <span className="text-[10px] text-amber-400 font-bold shrink-0">Soltar no Mapa:</span>
          <select
            value={dropMarkerType}
            onChange={(e) => setDropMarkerType(e.target.value as MarkerType)}
            className="bg-transparent text-amber-300 font-bold text-xs focus:outline-none cursor-pointer truncate"
            title="Escolha o tipo de marcador gerado ao arrastar para o mapa ou clicar + Mapa"
          >
            <option value="npc" className="bg-slate-900 text-emerald-400">🚶 NPC (Personagem)</option>
            <option value="neutral" className="bg-slate-900 text-slate-200">📦 Objeto / Neutro</option>
            <option value="interactive_screen" className="bg-slate-900 text-purple-400">📱 Tela Interativa</option>
            <option value="light" className="bg-slate-900 text-amber-300">💡 Ponto de Luz</option>
            <option value="collectible" className="bg-slate-900 text-cyan-300">💎 Coletável</option>
            <option value="portal" className="bg-slate-900 text-indigo-300">🚪 Portal</option>
          </select>
        </div>
      </div>

      {gallerySourceTab === 'local_folder' ? (
        <div className="space-y-2">
          <LocalFolderGalleryView
            phaseAssets={assets}
            dropMarkerType={dropMarkerType}
            onUploadNewAsset={(newAsset) => {
              const targetAsset: GalleryAsset = {
                ...newAsset,
                category: newAsset.category && newAsset.category !== 'Imports' && newAsset.category !== 'Geral'
                  ? newAsset.category
                  : 'Itens de Inventário/Exploração',
              };
              const existing = project.galleryAssets || [];
              const updatedGallery = [targetAsset, ...existing];

              const newItemCatalogEntry: import('../types/map').InventoryItemDefinition = {
                id: `item-${targetAsset.id}`,
                name: targetAsset.name,
                iconPng: targetAsset.dataUrl,
                iconEmoji: '📦',
                shortDescription: 'Item interativo de exploração importado para o jogo.',
                category: 'collectible',
                rarity: 'common',
                stackable: true,
                maxStack: 99,
                usableActions: ['use', 'inspect', 'drop'],
              };
              const existingCatalog = project.itemCatalog || [];

              onUpdateProject({
                galleryAssets: updatedGallery,
                itemCatalog: [newItemCatalogEntry, ...existingCatalog],
              });
            }}
            onInsertMarker={(localAsset, permanentAsset, targetType) => {
              const existing = project.galleryAssets || [];
              if (!existing.some((a) => a.dataUrl === permanentAsset.dataUrl)) {
                onUpdateProject({
                  galleryAssets: [permanentAsset, ...existing],
                });
              }
              handleInsertMarkerFromGallery(permanentAsset, undefined, targetType || dropMarkerType);
            }}
            onSetAsStamp={(permanentDataUrl, assetName) => {
              const existing = project.galleryAssets || [];
              const updatedAssets = existing.some((a) => a.dataUrl === permanentDataUrl)
                ? existing
                : [
                    {
                      id: `stamp-asset-${Date.now()}`,
                      name: assetName,
                      dataUrl: permanentDataUrl,
                      category: 'Carimbos',
                      createdAt: new Date().toISOString(),
                      isPersistentPhaseAsset: true,
                    },
                    ...existing,
                  ];
              onUpdateProject({
                galleryAssets: updatedAssets,
                stampBrushConfig: {
                  ...(project.stampBrushConfig || {
                    size: 52,
                    feather: 14,
                    spacing: 36,
                    randomRotation: true,
                    randomMirror: true,
                    opacity: 0.9,
                    activeLayerId: 'layer-ground-1',
                  }),
                  pngUrl: permanentDataUrl,
                },
              });
              setActiveTool?.('stamp_brush');
            }}
          />
        </div>
      ) : gallerySourceTab === 'shared_phases' ? (
        <div className="space-y-2.5">
          {/* Informação do Compartilhamento */}
          <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-sky-300 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                Compartilhamento de Fases
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
                {sharedPhaseAssets.length} assets
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Use assets criados em outras fases diretamente aqui. Ao clicar ou arrastar, o asset é clonado automaticamente para esta fase.
            </p>
          </div>

          {/* Filtro por Fase Origem */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-semibold text-slate-300">Filtro por Fase:</span>
              <button
                onClick={() => setSelectedSharedPhaseId('all')}
                className="text-sky-400 hover:underline"
              >
                Todas ({sharedPhaseAssets.length})
              </button>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedSharedPhaseId('all')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold shrink-0 transition-colors ${
                  selectedSharedPhaseId === 'all'
                    ? 'bg-sky-500/30 text-sky-200 border border-sky-400'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Todas
              </button>
              {sharedPhasesList.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedSharedPhaseId(p.id)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold shrink-0 transition-colors flex items-center gap-1 ${
                    selectedSharedPhaseId === p.id
                      ? 'bg-sky-500/30 text-sky-200 border border-sky-400'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span className="truncate max-w-[100px]">{p.name}</span>
                  <span className="font-mono text-[9px] opacity-70">({p.assetCount})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Campo de Busca */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={sharedSearchQuery}
              onChange={(e) => setSharedSearchQuery(e.target.value)}
              placeholder="Buscar asset compartilhado..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-7 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
            {sharedSearchQuery && (
              <button
                onClick={() => setSharedSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Grid de assets compartilhados */}
          {filteredSharedAssets.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center bg-slate-950/60">
              <Share2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-300">Nenhum asset encontrado</p>
              <p className="text-[10px] text-slate-500 mt-1">
                {sharedPhaseAssets.length === 0
                  ? 'Nenhuma outra fase possui assets salvos ainda. Salve fases no dashboard para compartilhar seus assets.'
                  : 'Nenhum asset corresponde à busca ou filtro de fase selecionado.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredSharedAssets.map((item: SharedPhaseAsset) => {
                const isVideo = item.mediaType === 'video' || !!item.videoUrl;
                const wasCopied = copiedSharedAssetId === item.id;

                return (
                  <div
                    key={`${item.sourcePhaseId}-${item.id}`}
                    draggable={true}
                    onDragStart={(e) => {
                      const { updatedProject, clonedAsset, isNew } = cloneAssetToCurrentProject(
                        item,
                        project,
                        item.sourcePhaseName
                      );
                      if (isNew) {
                        onUpdateProject({
                          galleryAssets: updatedProject.galleryAssets,
                          galleryCategories: updatedProject.galleryCategories,
                        });
                      }
                      const targetType = dropMarkerType || 'npc';
                      const isNpc = targetType === 'npc';
                      e.dataTransfer.setData(
                        'application/json',
                        JSON.stringify({
                          type: 'marker_asset',
                          asset: {
                            id: clonedAsset.id,
                            name: clonedAsset.name,
                            width: 150,
                            height: 150,
                            size: 150,
                            category: clonedAsset.category || 'Compartilhado',
                            isPersistentPhaseAsset: true,
                            targetMarkerType: targetType,
                            type: targetType,
                            npcBounce: isNpc,
                            effect: isNpc ? 'jelly' : 'none',
                            motionLayers: clonedAsset.motionLayers,
                            mediaType: isVideo ? 'video' : 'image',
                            videoUrl: clonedAsset.videoUrl,
                            videoChromaKey: clonedAsset.videoChromaKey,
                            pivotX: clonedAsset.pivotX ?? 0.5,
                            pivotY: clonedAsset.pivotY ?? 0.5,
                          },
                        })
                      );
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className="p-2 rounded-xl border border-slate-800/80 bg-slate-950 hover:border-sky-500/50 hover:bg-slate-900/60 transition-all flex flex-col justify-between group cursor-grab active:cursor-grabbing"
                  >
                    <div>
                      {/* Origem e Tipo */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span
                          className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-500/30 truncate max-w-[80px]"
                          title={`Fase: ${item.sourcePhaseName}`}
                        >
                          📦 {item.sourcePhaseName}
                        </span>
                        {isVideo && (
                          <span className="text-[7px] font-mono font-bold px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                            VÍDEO
                          </span>
                        )}
                      </div>

                      {/* Preview */}
                      <div className="aspect-square bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden border border-slate-800/60 p-1 mb-1.5">
                        {isVideo ? (
                          <VideoAssetCanvas
                            videoUrl={item.videoUrl || item.dataUrl}
                            chromaKey={item.videoChromaKey}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <img
                            src={item.dataUrl}
                            alt={item.name}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        )}
                      </div>

                      {/* Nome */}
                      <p className="text-[10px] font-semibold text-slate-200 truncate" title={item.name}>
                        {item.name}
                      </p>
                    </div>

                    {/* Botões de Ação */}
                    <div className="grid grid-cols-3 gap-1 pt-1.5 mt-1.5 border-t border-slate-900 text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleUseSharedAsset(item, 'insert')}
                        className="py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center justify-center transition-colors"
                        title="+ Inserir no Mapa"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUseSharedAsset(item, 'stamp')}
                        className="py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold flex items-center justify-center transition-colors"
                        title="Usar como Carimbo"
                      >
                        <Sparkles className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUseSharedAsset(item, 'copy')}
                        className={`py-1 rounded border font-bold flex items-center justify-center transition-colors ${
                          wasCopied
                            ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                        }`}
                        title="Copiar para o Acervo desta Fase"
                      >
                        {wasCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">

          {/* FILTRO DE CATEGORIAS RÁPIDO NA LATERAL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <Tag className="w-3 h-3 text-amber-400" />
                <span>Categoria:</span>
              </span>
              <button
                onClick={() => setSelectedCategory('all')}
                className="text-[10px] text-amber-400 hover:underline"
              >
                Todas ({assets.length})
              </button>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold shrink-0 transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-400'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Todas
              </button>
              {categories.map((cat) => {
                const count = assets.filter((a) => {
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
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold shrink-0 transition-colors flex items-center gap-1 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-amber-500/30 text-amber-200 border border-amber-400 font-bold shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat === 'Itens de Inventário/Exploração' && <span>🎒</span>}
                    {cat === 'Motion Canvas' && <span>✨</span>}
                    {cat === 'Telas Interativas' && <span>📱</span>}
                    {cat === 'Marcadores da Fase' && <span>📍</span>}
                    {cat === 'Carimbos' && <span>🖌️</span>}
                    <span>{cat}</span>
                    <span className="font-mono text-[9px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BOTÕES DE IMPORTAÇÃO RÁPIDA */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => folderInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/40 text-xs font-semibold transition-all disabled:opacity-50"
              title="Importar pastas completas (cada pasta vira uma categoria)"
            >
              <FolderPlus className="w-3.5 h-3.5 text-purple-300" />
              <span>📁 Importar Pasta(s)</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-semibold transition-all disabled:opacity-50"
              title="Importar imagens avulsas"
            >
              <Upload className="w-3.5 h-3.5 text-amber-300" />
              <span>📥 Imagens em Massa</span>
            </button>
          </div>

          {/* BARRA DE AÇÕES EM LOTE */}
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <button
                onClick={handleSelectAllVisible}
                className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium text-[11px]"
              >
                {filteredAssets.length > 0 &&
                filteredAssets.every((a) => selectedAssetIds.has(a.id)) ? (
                  <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>Selecionar Todos ({filteredAssets.length})</span>
              </button>

              <span className="text-[10px] font-mono text-slate-400">
                {selectedAssetIds.size} selecionado{selectedAssetIds.size !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-900 text-[10px]">
              <button
                onClick={handleDeleteSelected}
                disabled={selectedAssetIds.size === 0}
                className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold disabled:opacity-40 transition-colors"
                title="Excluir selecionados"
              >
                <Trash2 className="w-3 h-3" />
                <span>Excluir</span>
              </button>
              <button
                onClick={handleDuplicateSelected}
                disabled={selectedAssetIds.size === 0}
                className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold disabled:opacity-40 transition-colors"
                title="Duplicar selecionados"
              >
                <Copy className="w-3 h-3 text-sky-400" />
                <span>Duplicar</span>
              </button>
              <button
                onClick={handleMirrorSelected}
                disabled={selectedAssetIds.size === 0 || isProcessing}
                className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold disabled:opacity-40 transition-colors"
                title="Espelhar selecionados"
              >
                <FlipHorizontal className="w-3 h-3 text-emerald-400" />
                <span>Mirror</span>
              </button>
              <button
                onClick={handleInsertSelectedFromGallery}
                disabled={selectedAssetIds.size === 0}
                className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold disabled:opacity-40 transition-colors"
                title={`Inserir selecionados no mapa como ${dropMarkerType}`}
              >
                <Plus className="w-3 h-3 text-amber-400" />
                <span>+ Mapa</span>
              </button>
            </div>
          </div>

          {/* GRID COM OS ASSETS */}
          <div className="space-y-1.5">
            {filteredAssets.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center bg-slate-950/60">
                <FolderOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-300">Nenhum asset nesta categoria</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Importe imagens ou use o botão de Gerenciamento Avançado.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
                {filteredAssets.map((asset) => {
                  const isSelected = selectedAssetIds.has(asset.id);
                  const isNpc = dropMarkerType === 'npc';
                  const isVideo = asset.mediaType === 'video' || !!asset.videoUrl;

                  return (
                    <div
                      key={asset.id}
                      draggable={true}
                      onDragStart={(e) => {
                        const targetType = dropMarkerType || 'npc';
                        e.dataTransfer.setData(
                          'application/json',
                          JSON.stringify({
                            type: 'marker_asset',
                            asset: {
                              id: asset.id,
                              name: asset.name,
                              width: 150,
                              height: 150,
                              size: (asset as any)?.size && typeof (asset as any).size === 'number' && (asset as any).size >= 16 && (asset as any).size <= 3000 ? (asset as any).size : 150,
                              category: asset.category || 'Geral',
                              isPersistentPhaseAsset: true,
                              targetMarkerType: targetType,
                              type: targetType,
                              npcBounce: isNpc,
                              effect: isNpc ? 'jelly' : 'none',
                              motionLayers: asset.motionLayers,
                              mediaType: isVideo ? 'video' : 'image',
                              videoUrl: asset.videoUrl,
                              videoChromaKey: asset.videoChromaKey,
                              pivotX: asset.pivotX ?? 0.5,
                              pivotY: asset.pivotY ?? 0.5,
                            },
                          })
                        );
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => handleToggleSelect(asset.id)}
                      className={`p-2 rounded-xl border cursor-grab active:cursor-grabbing group flex flex-col justify-between transition-all relative ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/40 shadow-sm'
                          : 'bg-slate-950 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSelect(asset.id);
                          }}
                          className="p-0.5 text-slate-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                          )}
                        </button>
                        <div className="flex items-center gap-1">
                          {isVideo && (
                            <span className="text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-0.5">
                              <Film className="w-2.5 h-2.5" />
                              <span>VÍDEO</span>
                            </span>
                          )}
                          <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-500/30 truncate max-w-[65px]">
                            {asset.category || 'Geral'}
                          </span>
                        </div>
                      </div>

                      <div className="w-full aspect-square rounded-lg bg-slate-900 p-2 flex items-center justify-center overflow-hidden mb-2 border border-slate-800/80 group-hover:border-slate-700 transition-colors relative">
                        {isVideo ? (
                          <VideoAssetCanvas
                            videoUrl={asset.videoUrl || asset.dataUrl}
                            chromaKey={asset.videoChromaKey}
                            className="max-w-full max-h-full object-contain filter drop-shadow-md select-none pointer-events-none"
                          />
                        ) : (
                          <img
                            src={asset.dataUrl}
                            alt={asset.name}
                            className="max-w-full max-h-full object-contain filter drop-shadow-md select-none pointer-events-none transition-transform group-hover:scale-105"
                          />
                        )}
                      </div>

                      <div className="mb-2">
                        <span className="text-xs font-semibold text-slate-200 block truncate" title={asset.name}>
                          {asset.name}
                        </span>
                      </div>

                      {/* Botão de Chroma Key e Pivô para Assets de Vídeo */}
                      {isVideo && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setChromaModalAsset(asset);
                          }}
                          className="w-full mb-1.5 py-1 px-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center justify-center gap-1 transition"
                          title="Configurar Chroma Key, Tolerância e Corte Square"
                        >
                          <Sliders className="w-3 h-3 text-emerald-400" />
                          <span>Chroma Key & Pivô</span>
                        </button>
                      )}

                      <div className="grid grid-cols-4 gap-1 pt-1.5 border-t border-slate-900 text-[10px]">
                        <button
                          type="button"
                          onClick={(e) => handleInsertMarkerFromGallery(asset, e, dropMarkerType)}
                          className="col-span-2 py-1 px-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center justify-center gap-1 transition-colors"
                          title={`Inserir no mapa como ${dropMarkerType}`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Mapa</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleMirrorSingle(asset, e)}
                          className="py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center transition-colors"
                          title="Espelhar"
                        >
                          <FlipHorizontal className="w-3 h-3 text-emerald-400" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSingle(asset.id, e)}
                          className="py-1 rounded bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 flex items-center justify-center transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}






      {/* ======================================================== */}
      {/* 4. MODAL GRANDE: GERENCIAMENTO AVANÇADO (PAISAGEM)       */}
      {/* ======================================================== */}
      {isAdvancedManagerOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fade-in">
          <div className="w-full max-w-6xl h-[90vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10">
            {/* Topo do Modal */}
            <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-amber-500 flex items-center justify-center text-slate-950 shadow-md">
                  <FolderKanban className="w-5 h-5 font-bold" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Gerenciamento Avançado do Acervo</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                      {assets.length} assets
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Importe pastas completas como categorias, organize e faça ações em lote
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAdvancedManagerOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* SELETOR DE ORIGEM DENTRO DO MODAL + SELETOR DE MARCADOR */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-2.5 bg-slate-950 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setGallerySourceTab('local_folder')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    gallerySourceTab === 'local_folder'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>📁 Pasta Local do PC (Tempo Real)</span>
                </button>

                <button
                  onClick={() => setGallerySourceTab('phase_assets')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    gallerySourceTab === 'phase_assets'
                      ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Images className="w-3.5 h-3.5" />
                  <span>🏛️ Acervo da Fase ({assets.length})</span>
                </button>

                <button
                  onClick={() => setGallerySourceTab('shared_phases')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    gallerySourceTab === 'shared_phases'
                      ? 'bg-sky-400 text-slate-950 shadow-md font-black'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>🌐 Compartilhamento de Fases ({sharedPhaseAssets.length})</span>
                </button>
              </div>

              {/* Botão Rápido de Importar PNG + Seletor de Tipo de Marcador */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
                  title="Importar imagens avulsas (PNG, JPG, WebP) diretamente para esta fase"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ Importar PNG</span>
                </button>

                <div className="flex items-center gap-2 bg-slate-900/90 border border-amber-500/30 rounded-xl px-3 py-1.5">
                  <span className="text-xs text-amber-400 font-bold">Soltar no Mapa como:</span>
                  <select
                    value={dropMarkerType}
                    onChange={(e) => setDropMarkerType(e.target.value as MarkerType)}
                    className="bg-transparent text-amber-200 font-bold text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="npc" className="bg-slate-900 text-emerald-400">🚶 NPC (Personagem)</option>
                    <option value="neutral" className="bg-slate-900 text-slate-200">📦 Objeto / Neutro</option>
                    <option value="interactive_screen" className="bg-slate-900 text-purple-400">📱 Tela Interativa</option>
                    <option value="light" className="bg-slate-900 text-amber-300">💡 Ponto de Luz</option>
                    <option value="collectible" className="bg-slate-900 text-cyan-300">💎 Coletável</option>
                    <option value="portal" className="bg-slate-900 text-indigo-300">🚪 Portal</option>
                  </select>
                </div>
              </div>
            </div>

            {gallerySourceTab === 'local_folder' ? (
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                <LocalFolderGalleryView
                  phaseAssets={assets}
                  dropMarkerType={dropMarkerType}
                  onUploadNewAsset={(newAsset) => {
                    const targetAsset: GalleryAsset = {
                      ...newAsset,
                      category: newAsset.category && newAsset.category !== 'Imports' && newAsset.category !== 'Geral'
                        ? newAsset.category
                        : 'Itens de Inventário/Exploração',
                    };
                    const existing = project.galleryAssets || [];
                    const updatedGallery = [targetAsset, ...existing];

                    const newItemCatalogEntry: import('../types/map').InventoryItemDefinition = {
                      id: `item-${targetAsset.id}`,
                      name: targetAsset.name,
                      iconPng: targetAsset.dataUrl,
                      iconEmoji: '📦',
                      shortDescription: 'Item interativo de exploração importado para o jogo.',
                      category: 'collectible',
                      rarity: 'common',
                      stackable: true,
                      maxStack: 99,
                      usableActions: ['use', 'inspect', 'drop'],
                    };
                    const existingCatalog = project.itemCatalog || [];

                    onUpdateProject({
                      galleryAssets: updatedGallery,
                      itemCatalog: [newItemCatalogEntry, ...existingCatalog],
                    });
                  }}
                  onInsertMarker={(localAsset, permanentAsset, targetType) => {
                    const existing = project.galleryAssets || [];
                    if (!existing.some((a) => a.dataUrl === permanentAsset.dataUrl)) {
                      onUpdateProject({
                        galleryAssets: [permanentAsset, ...existing],
                      });
                    }
                    handleInsertMarkerFromGallery(permanentAsset, undefined, targetType || dropMarkerType);
                  }}
                  onSetAsStamp={(permanentDataUrl, assetName) => {
                    const existing = project.galleryAssets || [];
                    const updatedAssets = existing.some((a) => a.dataUrl === permanentDataUrl)
                      ? existing
                      : [
                          {
                            id: `stamp-asset-${Date.now()}`,
                            name: assetName,
                            dataUrl: permanentDataUrl,
                            category: 'Carimbos',
                            createdAt: new Date().toISOString(),
                            isPersistentPhaseAsset: true,
                          },
                          ...existing,
                        ];
                    onUpdateProject({
                      galleryAssets: updatedAssets,
                      stampBrushConfig: {
                        ...(project.stampBrushConfig || {
                          size: 52,
                          feather: 14,
                          spacing: 36,
                          randomRotation: true,
                          randomMirror: true,
                          opacity: 0.9,
                          activeLayerId: 'layer-ground-1',
                        }),
                        pngUrl: permanentDataUrl,
                      },
                    });
                    setActiveTool?.('stamp_brush');
                  }}
                />
              </div>
            ) : gallerySourceTab === 'shared_phases' ? (
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin space-y-4">
                {/* Banner e controles */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-sky-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-sky-400" />
                      Compartilhamento de Assets entre Fases
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Reutilize personagens, cenários, animações e telas criados em outras fases sem duplicar upload manual.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="relative w-64 md:w-80">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={sharedSearchQuery}
                        onChange={(e) => setSharedSearchQuery(e.target.value)}
                        placeholder="Buscar por nome, fase ou categoria..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                      {sharedSearchQuery && (
                        <button
                          onClick={() => setSharedSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Filtro de Fases em Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setSelectedSharedPhaseId('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 ${
                      selectedSharedPhaseId === 'all'
                        ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>Todas as Fases</span>
                    <span className="font-mono text-[10px] opacity-80">({sharedPhaseAssets.length})</span>
                  </button>
                  {sharedPhasesList.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedSharedPhaseId(p.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 ${
                        selectedSharedPhaseId === p.id
                          ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <span className="truncate max-w-[140px]">{p.name}</span>
                      <span className="font-mono text-[10px] opacity-80">({p.assetCount})</span>
                    </button>
                  ))}
                </div>

                {/* Grid de Assets Compartilhados */}
                {filteredSharedAssets.length === 0 ? (
                  <div className="p-12 rounded-2xl border border-dashed border-slate-800 text-center bg-slate-950/40 my-6">
                    <Share2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-slate-300">Nenhum asset compartilhado encontrado</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      {sharedPhaseAssets.length === 0
                        ? 'Crie e salve fases no Dashboard para que seus assets fiquem automaticamente disponíveis em todas as outras fases.'
                        : 'Nenhum resultado corresponde à sua busca ou filtro de fase selecionado.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                    {filteredSharedAssets.map((item: SharedPhaseAsset) => {
                      const isVideo = item.mediaType === 'video' || !!item.videoUrl;
                      const wasCopied = copiedSharedAssetId === item.id;

                      return (
                        <div
                          key={`${item.sourcePhaseId}-${item.id}`}
                          draggable={true}
                          onDragStart={(e) => {
                            const { updatedProject, clonedAsset, isNew } = cloneAssetToCurrentProject(
                              item,
                              project,
                              item.sourcePhaseName
                            );
                            if (isNew) {
                              onUpdateProject({
                                galleryAssets: updatedProject.galleryAssets,
                                galleryCategories: updatedProject.galleryCategories,
                              });
                            }
                            const targetType = dropMarkerType || 'npc';
                            const isNpc = targetType === 'npc';
                            e.dataTransfer.setData(
                              'application/json',
                              JSON.stringify({
                                type: 'marker_asset',
                                asset: {
                                  id: clonedAsset.id,
                                  name: clonedAsset.name,
                                  width: 150,
                                  height: 150,
                                  size: 150,
                                  category: clonedAsset.category || 'Compartilhado',
                                  isPersistentPhaseAsset: true,
                                  targetMarkerType: targetType,
                                  type: targetType,
                                  npcBounce: isNpc,
                                  effect: isNpc ? 'jelly' : 'none',
                                  motionLayers: clonedAsset.motionLayers,
                                  mediaType: isVideo ? 'video' : 'image',
                                  videoUrl: clonedAsset.videoUrl,
                                  videoChromaKey: clonedAsset.videoChromaKey,
                                  pivotX: clonedAsset.pivotX ?? 0.5,
                                  pivotY: clonedAsset.pivotY ?? 0.5,
                                },
                              })
                            );
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          className="p-2.5 rounded-2xl border border-slate-800 bg-slate-950/70 hover:border-sky-500/50 hover:bg-slate-900/60 transition-all flex flex-col justify-between group cursor-grab active:cursor-grabbing shadow-sm"
                        >
                          <div>
                            {/* Origem e Tipo */}
                            <div className="flex items-center justify-between gap-1 mb-2">
                              <span
                                className="text-[9px] font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-500/30 truncate max-w-[120px]"
                                title={`Fase de Origem: ${item.sourcePhaseName}`}
                              >
                                📦 {item.sourcePhaseName}
                              </span>
                              {isVideo && (
                                <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                                  VÍDEO
                                </span>
                              )}
                            </div>

                            {/* Preview */}
                            <div className="aspect-square bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden border border-slate-800/80 p-2 mb-2">
                              {isVideo ? (
                                <VideoAssetCanvas
                                  videoUrl={item.videoUrl || item.dataUrl}
                                  chromaKey={item.videoChromaKey}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <img
                                  src={item.dataUrl}
                                  alt={item.name}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                  loading="lazy"
                                />
                              )}
                            </div>

                            {/* Informações */}
                            <p className="text-xs font-semibold text-slate-200 truncate" title={item.name}>
                              {item.name}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">
                              {item.category || 'Geral'}
                            </p>
                          </div>

                          {/* Ações */}
                          <div className="grid grid-cols-3 gap-1 pt-2 mt-2 border-t border-slate-900 text-xs">
                            <button
                              type="button"
                              onClick={() => handleUseSharedAsset(item, 'insert')}
                              className="py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center justify-center gap-1 transition-colors"
                              title="+ Inserir Marcador no Mapa"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span className="text-[10px]">Mapa</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUseSharedAsset(item, 'stamp')}
                              className="py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold flex items-center justify-center gap-1 transition-colors"
                              title="Usar como Carimbo no Pincel"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span className="text-[10px]">Carimbo</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUseSharedAsset(item, 'copy')}
                              className={`py-1.5 rounded-lg border font-bold flex items-center justify-center gap-1 transition-colors ${
                                wasCopied
                                  ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                              }`}
                              title="Copiar permanentemente para esta fase"
                            >
                              {wasCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span className="text-[10px]">{wasCopied ? 'OK' : 'Copiar'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Barra de Ações Rápidas do Modal */}
                <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => folderInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-98 disabled:opacity-50"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>📁 Importar Pasta(s)</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all active:scale-98 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>📥 Imagens em Massa</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Campo de Busca */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nome..."
                    className="w-56 bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Corpo do Modal: 2 Colunas (Categorias à Esquerda, Grid de Assets à Direita) */}
            <div className="flex-1 flex overflow-hidden">
              {/* Coluna Esquerda: Categorias */}
              <div className="w-72 bg-slate-950/70 border-r border-slate-800 p-4 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                      <Tag className="w-3.5 h-3.5 text-purple-400" />
                      <span>Categorias</span>
                    </span>
                    <span className="text-[10px] font-mono text-purple-300 font-bold">
                      {categories.length}
                    </span>
                  </div>

                  {/* Input para Nova Categoria */}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateCategory(newCategoryName);
                      }}
                      placeholder="Nova Categoria..."
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                    />
                    <button
                      onClick={() => handleCreateCategory(newCategoryName)}
                      disabled={!newCategoryName.trim()}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold disabled:opacity-40 transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Lista de Categorias */}
                  <div className="space-y-1 pt-1">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        selectedCategory === 'all'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-900/60 text-slate-300 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Folder className="w-3.5 h-3.5" />
                        <span>Todas as Categorias</span>
                      </span>
                      <span className="font-mono text-[10px] opacity-80">{assets.length}</span>
                    </button>

                    {categories.map((cat) => {
                      const count = assets.filter((a) => {
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
                      const isSelected = selectedCategory === cat;
                      const isPermanent = PERMANENT_GALLERY_CATEGORIES.includes(cat);

                      return (
                        <div
                          key={cat}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                            isSelected
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'bg-slate-900/60 text-slate-300 hover:bg-slate-900 hover:text-white'
                          }`}
                        >
                          <button
                            onClick={() => setSelectedCategory(cat)}
                            className="flex-1 text-left flex items-center gap-2 truncate cursor-pointer"
                          >
                            {cat === 'Itens de Inventário/Exploração' ? (
                              <span className="text-sm">🎒</span>
                            ) : (
                              <Folder className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span className="truncate">{cat}</span>
                          </button>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono text-[10px] opacity-80">{count}</span>
                            {!isPermanent && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCategory(cat);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-300 transition-opacity cursor-pointer"
                                title="Excluir categoria"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ação em lote: Mover selecionados para categoria */}
                {selectedAssetIds.size > 0 && (
                  <div className="p-3 rounded-2xl bg-slate-900 border border-purple-500/40 space-y-2 mt-4">
                    <span className="text-[10px] font-bold text-purple-300 uppercase block">
                      Mover {selectedAssetIds.size} selecionado(s) para:
                    </span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleAssignCategoryToSelected(e.target.value);
                      }}
                      defaultValue=""
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                    >
                      <option value="" disabled>
                        Escolha a categoria...
                      </option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Coluna Direita: Grid Amplo de Assets */}
              <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
                <div>
                  {/* Toolbar de Lote no Modal */}
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 text-xs">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSelectAllVisible}
                        className="flex items-center gap-2 font-semibold text-slate-300 hover:text-white"
                      >
                        {filteredAssets.length > 0 &&
                        filteredAssets.every((a) => selectedAssetIds.has(a.id)) ? (
                          <CheckSquare className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                        <span>
                          Selecionar Todos ({filteredAssets.length})
                        </span>
                      </button>

                      {selectedAssetIds.size > 0 && (
                        <span className="font-mono text-purple-300 font-bold bg-purple-500/20 px-2 py-0.5 rounded-lg border border-purple-500/30">
                          {selectedAssetIds.size} marcado{selectedAssetIds.size !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDuplicateSelected}
                        disabled={selectedAssetIds.size === 0}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold disabled:opacity-40 transition-colors flex items-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5 text-sky-400" />
                        <span>Duplicar</span>
                      </button>
                      <button
                        onClick={handleMirrorSelected}
                        disabled={selectedAssetIds.size === 0}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold disabled:opacity-40 transition-colors flex items-center gap-1.5"
                      >
                        <FlipHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Mirror</span>
                      </button>
                      <button
                        onClick={handleInsertSelectedFromGallery}
                        disabled={selectedAssetIds.size === 0}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold disabled:opacity-40 transition-colors flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Mapa</span>
                      </button>
                      <button
                        onClick={handleDeleteSelected}
                        disabled={selectedAssetIds.size === 0}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-semibold disabled:opacity-40 transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>

                  {/* Grid de Cards Amplo */}
                  {filteredAssets.length === 0 ? (
                    <div className="p-16 rounded-3xl border border-dashed border-slate-800 text-center bg-slate-950/40">
                      <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-slate-200">Nenhum asset encontrado</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Use o botão "Importar Pasta(s)" acima para carregar suas coleções divididas em categorias automaticamente.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                      {filteredAssets.map((asset) => {
                        const isSelected = selectedAssetIds.has(asset.id);
                        const isVideo = asset.mediaType === 'video' || !!asset.videoUrl;

                        return (
                          <div
                            key={asset.id}
                            onClick={() => handleToggleSelect(asset.id)}
                            className={`p-2 rounded-2xl border cursor-pointer group flex flex-col justify-between transition-all relative ${
                              isSelected
                                ? 'bg-purple-950/40 border-purple-400 ring-2 ring-purple-400/50 shadow-lg'
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSelect(asset.id);
                                }}
                                className="p-0.5 text-slate-400 hover:text-white"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-purple-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                                )}
                              </button>
                              <div className="flex items-center gap-1">
                                {isVideo && (
                                  <span className="text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-0.5">
                                    <Film className="w-2.5 h-2.5" />
                                    <span>VÍDEO</span>
                                  </span>
                                )}
                                <span className="text-[8px] font-mono font-semibold px-1 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-500/30 truncate max-w-[70px]">
                                  {asset.category || 'Geral'}
                                </span>
                              </div>
                            </div>

                            <div className="w-full aspect-square rounded-xl bg-slate-900 p-2 flex items-center justify-center overflow-hidden mb-2 border border-slate-800/80 group-hover:border-slate-700 transition-colors relative">
                              {isVideo ? (
                                <VideoAssetCanvas
                                  videoUrl={asset.videoUrl || asset.dataUrl}
                                  chromaKey={asset.videoChromaKey}
                                  className="max-w-full max-h-full object-contain filter drop-shadow select-none pointer-events-none"
                                />
                              ) : (
                                <img
                                  src={asset.dataUrl}
                                  alt={asset.name}
                                  className="max-w-full max-h-full object-contain filter drop-shadow select-none pointer-events-none transition-transform group-hover:scale-105"
                                />
                              )}
                            </div>

                            <div>
                              <span className="text-xs font-semibold text-slate-200 block truncate" title={asset.name}>
                                {asset.name}
                              </span>
                              <span className="text-[9px] font-mono text-slate-500 block">
                                {isVideo
                                  ? 'Vídeo MP4/WebM'
                                  : asset.width && asset.height
                                  ? `${asset.width}×${asset.height}px`
                                  : 'PNG'}
                              </span>
                            </div>

                            {/* Botão Chroma Key nos cards do modal avançado */}
                            {isVideo && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setChromaModalAsset(asset);
                                }}
                                className="w-full mt-1.5 py-1 px-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center justify-center gap-1 transition"
                                title="Configurar Chroma Key, Tolerância e Corte Square"
                              >
                                <Sliders className="w-3 h-3 text-emerald-400" />
                                <span>Chroma Key & Pivô</span>
                              </button>
                            )}

                            <div className="grid grid-cols-3 gap-1 pt-2 mt-2 border-t border-slate-900 text-[10px]">
                              <button
                                type="button"
                                onClick={(e) => handleInsertMarkerFromGallery(asset, e, dropMarkerType)}
                                className="py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center justify-center transition-colors"
                                title="+ Mapa"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleMirrorSingle(asset, e)}
                                className="py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center transition-colors"
                                title="Mirror"
                              >
                                <FlipHorizontal className="w-3 h-3 text-emerald-400" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSingle(asset.id, e)}
                                className="py-1 rounded bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 flex items-center justify-center transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pop-up Modal de Chroma Key, Tolerância, Corte Square e Pivô */}
      {chromaModalAsset && (
        <VideoChromaKeyModal
          isOpen={!!chromaModalAsset}
          onClose={() => setChromaModalAsset(null)}
          videoUrl={chromaModalAsset.videoUrl || chromaModalAsset.dataUrl}
          initialChromaKey={chromaModalAsset.videoChromaKey}
          initialPivotX={chromaModalAsset.pivotX ?? 0.5}
          initialPivotY={chromaModalAsset.pivotY ?? 0.5}
          onSave={handleSaveChromaKey}
        />
      )}
    </div>
  );
};
