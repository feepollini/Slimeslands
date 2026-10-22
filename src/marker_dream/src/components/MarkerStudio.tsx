import React, { useRef, useState } from 'react';
import { MapMarker, MarkerType, VideoChromaKeyConfig } from '../types/map';
import { readUploadedImage } from '../utils/tileGenerator';
import { readUploadedVideo, isVideoFile } from '../utils/videoUtils';
import { VideoChromaKeyModal } from './video/VideoChromaKeyModal';
import {
  MapPin,
  Navigation,
  Tent,
  Search,
  Trash2,
  Anchor,
  Landmark,
  Castle,
  Skull,
  Gem,
  Sparkles,
  Mountain,
  Plus,
  Upload,
  Image as ImageIcon,
  X,
  Zap,
  User,
  FolderOpen,
  ArrowLeft,
  ChevronDown,
  Palette,
} from 'lucide-react';
import { AssetGalleryModal } from './AssetGalleryModal';
import {
  MarkerStationModule,
  MarkerNpcModule,
  MarkerTravelModule,
  MarkerLightModule,
  MarkerMissionModule,
  MarkerAreaModule,
  MarkerNeutralModule,
  MarkerVisualTab,
  MarkerPhysicsTab,
  MarkerEffectsTab,
  MarkerEventsTab,
} from './marker-studio';
import { createDefaultStationConfig } from '../data/defaultStationAssets';

interface Props {
  markers: MapMarker[];
  subBiomes?: import('../types/map').SubBiomeConfig[];
  biomes?: import('../types/map').BiomeTileConfig[];
  savedLevels?: import('../types/map').SavedLevel[];
  selectedMarkerId: string | null;
  onSelectMarker: (id: string | null) => void;
  onUpdateMarker: (id: string, updates: Partial<MapMarker>) => void;
  onDeleteMarker: (id: string) => void;
  onFocusMarker: (marker: MapMarker) => void;
  onTriggerAddMarkerMode: () => void;
  onOpenSavedMarker?: (level: import('../types/map').SavedLevel, markerId: string) => void;
  onOpenDialogueTab?: () => void;
  savedDialogues?: import('../types/map').SavedDialogue[];
  markerLayers?: import('../types/map').MarkerLayer[];
  activeMarkerLayerId?: string;
  onOpenLayersTab?: () => void;
  galleryAssets?: import('../types/map').GalleryAsset[];
  galleryCategories?: string[];
  onUploadNewAsset?: (newAsset: import('../types/map').GalleryAsset) => void;
  onAddMarkerWithAsset?: (asset: {
    name: string;
    dataUrl?: string;
    type?: MarkerType;
    size?: number;
    solidCollision?: boolean;
    hasShadow?: boolean;
    npcBounce?: boolean;
    effect?: any;
  }) => void;
}

const MARKER_ICONS: { type: MarkerType; label: string }[] = [
  { type: 'travel', label: '🌌 Portal Travel (Teleporte / Fase / Sub-Bioma)' },
  { type: 'collectible', label: '📦 Item Interativo (Coletável para a Bolsa)' },
  { type: 'deliverable', label: '🚩 Entregável (Destino Quest)' },
  { type: 'camp', label: 'Acampamento' },
  { type: 'town', label: 'Vila' },
  { type: 'castle', label: 'Castelo' },
  { type: 'boss', label: 'Chefe' },
  { type: 'treasure', label: 'Tesouro' },
  { type: 'shrine', label: 'Santuário' },
  { type: 'port', label: 'Porto' },
  { type: 'cave', label: 'Caverna' },
  { type: 'tower', label: 'Torre' },
];

const MARKER_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Amber
  '#22c55e', // Emerald
  '#0284c7', // Sky Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
];

export const DEFAULT_PRESET_MARKERS = [
  {
    id: 'preset-npc-elder',
    name: 'Ancião da Vila',
    type: 'npc' as MarkerType,
    category: 'Personagens',
    emoji: '🧙‍♂️',
    color: '#10b981',
    size: 150,
    solidCollision: true,
    hasShadow: true,
    npcBounce: true,
    effect: 'jelly',
    description: 'NPC sábio com diálogos e missões',
  },
  {
    id: 'preset-npc-guard',
    name: 'Guarda do Portão',
    type: 'npc' as MarkerType,
    category: 'Personagens',
    emoji: '🛡️',
    color: '#06b6d4',
    size: 150,
    solidCollision: true,
    hasShadow: true,
    npcBounce: true,
    effect: 'jelly',
    description: 'Guarda vigilante com patrulha',
  },
  {
    id: 'preset-npc-merchant',
    name: 'Mercador Nômade',
    type: 'npc' as MarkerType,
    category: 'Personagens',
    emoji: '🎒',
    color: '#f59e0b',
    size: 150,
    solidCollision: true,
    hasShadow: true,
    npcBounce: true,
    effect: 'jelly',
    description: 'Vendedor com recompensas e itens',
  },
  {
    id: 'preset-light-torch',
    name: 'Tocha Rústica',
    type: 'light' as MarkerType,
    category: 'Luz & Magia',
    emoji: '🕯️',
    color: '#f59e0b',
    size: 150,
    solidCollision: false,
    hasShadow: true,
    effect: 'fire',
    description: 'Fonte de luz cálida com tremeluzir',
  },
  {
    id: 'preset-light-campfire',
    name: 'Fogueira Quente',
    type: 'light' as MarkerType,
    category: 'Luz & Magia',
    emoji: '🔥',
    color: '#f97316',
    size: 150,
    solidCollision: true,
    hasShadow: true,
    effect: 'fire',
    description: 'Fogueira com partículas e iluminação dinâmica',
  },
  {
    id: 'preset-light-crystal',
    name: 'Cristal Arcano',
    type: 'light' as MarkerType,
    category: 'Luz & Magia',
    emoji: '💎',
    color: '#38bdf8',
    size: 150,
    solidCollision: true,
    hasShadow: true,
    effect: 'glow',
    description: 'Cristal que emite halo de luz mágica',
  },
  {
    id: 'preset-treasure-chest',
    name: 'Baú do Tesouro',
    type: 'treasure' as MarkerType,
    category: 'Baús & Itens',
    emoji: '📦',
    color: '#f59e0b',
    size: 150,
    solidCollision: true,
    hasShadow: true,
    description: 'Baú com 6 slots de recompensas',
  },
  {
    id: 'preset-portal-travel',
    name: 'Portal Dimensional',
    type: 'travel' as MarkerType,
    category: 'Portais & Viagem',
    emoji: '🌌',
    color: '#8b5cf6',
    size: 150,
    solidCollision: false,
    hasShadow: false,
    effect: 'vortex',
    description: 'Teleporte para outra fase ou região',
  },
  {
    id: 'preset-boss-skull',
    name: 'Chefe da Dungeon',
    type: 'boss' as MarkerType,
    category: 'Personagens',
    emoji: '💀',
    color: '#ef4444',
    size: 180,
    solidCollision: true,
    hasShadow: true,
    effect: 'pulse',
    description: 'Inimigo poderoso com colisão física',
  },
  {
    id: 'preset-nature-tree',
    name: 'Árvore Anciã',
    type: 'neutral' as MarkerType,
    category: 'Cenário',
    emoji: '🌳',
    color: '#22c55e',
    size: 150,
    solidCollision: true,
    hasShadow: true,
    effect: 'wind',
    description: 'Elemento neutro com colisão de tronco',
  },
  {
    id: 'preset-camp-tent',
    name: 'Tenda de Acampamento',
    type: 'camp' as MarkerType,
    category: 'Cenário',
    emoji: '⛺',
    color: '#a855f7',
    size: 150,
    solidCollision: true,
    hasShadow: true,
    description: 'Ponto de descanso para o herói',
  },
];

export const MarkerStudio: React.FC<Props> = ({
  markers,
  subBiomes = [],
  biomes = [],
  savedLevels = [],
  selectedMarkerId,
  onSelectMarker,
  onUpdateMarker,
  onDeleteMarker,
  onFocusMarker,
  onTriggerAddMarkerMode,
  onOpenSavedMarker,
  onOpenDialogueTab,
  savedDialogues = [],
  markerLayers = [],
  activeMarkerLayerId,
  onOpenLayersTab,
  galleryAssets = [],
  galleryCategories = [],
  onUploadNewAsset,
  onAddMarkerWithAsset,
}) => {
  const [studioMainTab, setStudioMainTab] = useState<'markers' | 'gallery'>('markers');
  const [gallerySearch, setGallerySearch] = useState('');
  const [galleryCategory, setGalleryCategory] = useState<string>('all');
  const galleryUploadRef = useRef<HTMLInputElement>(null);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryModalTarget, setGalleryModalTarget] = useState<'icon' | 'banner'>('icon');
  const [isVideoChromaModalOpen, setIsVideoChromaModalOpen] = useState(false);
  const markerFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const eventVideoFileInputRef = useRef<HTMLInputElement>(null);
  const selectedMarker = markers.find((m) => m.id === selectedMarkerId);

  const availableLayers = (markerLayers && markerLayers.length > 0)
    ? markerLayers
    : [{ id: 'layer-default', name: 'Camada Padrão', visible: true, locked: false, order: 0, color: '#3b82f6' }];
  const effectiveDefaultLayerId = activeMarkerLayerId || availableLayers[0]?.id || 'layer-default';
  const selectedMarkerLayerId = selectedMarker?.layerId || effectiveDefaultLayerId;
  const currentMarkerLayer = selectedMarker
    ? availableLayers.find((l) => l.id === selectedMarkerLayerId) || availableLayers[0]
    : null;
  // Filtra tufos de natureza instanciados (Terrain Pen) para não poluir a lista individual de marcadores:
  // toda a vegetação aparece consolidada como 1 único Grupo de Natureza!
  const interactiveMarkers = markers.filter((m) => !m.id.startsWith('terrain-'));
  const natureCloneMarkers = markers.filter((m) => m.id.startsWith('terrain-'));
  const verticalCount = interactiveMarkers.filter((m) => !m.subBiomeId).length;
  const extendedCount = interactiveMarkers.length - verticalCount;
  const [showUniversal, setShowUniversal] = useState(true);
  const [showMotionGroup, setShowMotionGroup] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'props' | 'visual' | 'physics' | 'effects' | 'events' | 'rpg'>('props');
  const [isMarkerTypeCollapsed, setIsMarkerTypeCollapsed] = useState<boolean>(false);

  const verticalMarkers = interactiveMarkers.filter((m) => !m.subBiomeId);
  const markersOfSubBiome = (sbId: string) => interactiveMarkers.filter((m) => m.subBiomeId === sbId);
  const phaseLabel = (subBiomeId?: string) =>
    subBiomeId
      ? `💜 ${subBiomes.find((sb) => sb.id === subBiomeId)?.name || 'Fase Extended'}`
      : '🗺️ Mapa vertical';
  // MODO do marcador (seletor único): cada modo tem seu menu, sem misturar parâmetros
  const modeOf = (t: MapMarker['type']): 'neutral' | 'light' | 'npc' | 'mission' | 'travel' | 'event' | 'area' | 'interactive_screen' | 'ponto' =>
    t === 'interactive_screen'
      ? 'interactive_screen'
      : t === 'neutral'
      ? 'neutral'
      : t === 'light'
      ? 'light'
      : t === 'travel'
      ? 'travel'
      : t === 'collectible' || t === 'deliverable'
      ? 'mission'
      : t === 'event'
      ? 'event'
      : t === 'area'
      ? 'area'
      : t === 'npc'
      ? 'npc'
      : 'ponto';
  const markerMode = selectedMarker ? modeOf(selectedMarker.type) : 'ponto';
  type QuestPatch = Partial<NonNullable<MapMarker['quest']>> & { kind: NonNullable<MapMarker['quest']>['kind'] };
  const updateQuest = (patch: QuestPatch) => {
    if (!selectedMarker) return;
    const base: NonNullable<MapMarker['quest']> = selectedMarker.quest || { kind: patch.kind };
    onUpdateMarker(selectedMarker.id, { quest: { ...base, ...patch } });
  };
  const setMarkerMode = (mode: 'neutral' | 'light' | 'npc' | 'mission' | 'travel' | 'event' | 'area' | 'interactive_screen' | 'ponto') => {
    if (!selectedMarker) return;
    if (mode === 'interactive_screen') {
      const cfg = selectedMarker.stationConfig || createDefaultStationConfig('incubator');
      onUpdateMarker(selectedMarker.id, {
        type: 'interactive_screen',
        customIconPng: selectedMarker.customIconPng || cfg.baseAssetPng,
        solidCollision: true,
        stationConfig: cfg,
      });
    } else if (mode === 'neutral') {
      onUpdateMarker(selectedMarker.id, {
        type: 'neutral',
        solidCollision: selectedMarker.solidCollision !== false,
        hasShadow: selectedMarker.hasShadow !== false,
      });
    } else if (mode === 'light') {
      onUpdateMarker(selectedMarker.id, {
        type: 'light',
        solidCollision: selectedMarker.solidCollision || false,
        hasShadow: selectedMarker.hasShadow !== false,
        lightConfig: selectedMarker.lightConfig || {
          preset: 'torch',
          radius: 180,
          color: '#f59e0b',
          intensity: 0.85,
          flicker: true,
        },
      });
    } else if (mode === 'area') {
      onUpdateMarker(selectedMarker.id, {
        type: 'area',
        areaShape: selectedMarker.areaShape || 'rect',
        areaWidth: selectedMarker.areaWidth || 160,
        areaHeight: selectedMarker.areaHeight || 120,
        areaRadius: selectedMarker.areaRadius || 80,
        areaColor: selectedMarker.areaColor || '#3b82f6',
        solidCollision: false,
      });
    } else if (mode === 'ponto') {
      onUpdateMarker(selectedMarker.id, { type: 'camp' });
    } else if (mode === 'travel') {
      onUpdateMarker(selectedMarker.id, {
        type: 'travel',
        travelTargetType: selectedMarker.travelTargetType || 'marker',
        popupStyle: selectedMarker.popupStyle || 'compact',
        travelAuto: true,
      });
    } else if (mode === 'mission') {
      onUpdateMarker(selectedMarker.id, {
        type: 'collectible',
        questResourceType: selectedMarker.questResourceType || 'wood',
        popupStyle: selectedMarker.popupStyle || 'compact',
        questResource: selectedMarker.questResource || { id: 'res-wood', name: 'Madeira', iconEmoji: '🪵' },
        questRequiredAmount: selectedMarker.questRequiredAmount || 5,
      });
    } else if (mode === 'event') {
      onUpdateMarker(selectedMarker.id, {
        type: 'event',
        eventKind: selectedMarker.eventKind || 'popup',
        popupStyle: 'compact',
      });
    } else {
      onUpdateMarker(selectedMarker.id, {
        type: 'npc',
        size: selectedMarker.size && selectedMarker.size > 64 ? selectedMarker.size : 150,
        popupStyle: 'compact',
        npcBounce: selectedMarker.npcBounce !== false,
        effect: selectedMarker.effect ?? 'jelly',
        effectIntensity: selectedMarker.effectIntensity ?? 0.45,
        jellyIntensity: selectedMarker.jellyIntensity ?? 0.45,
      });
    }
  };

  const handleUploadIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMarker) return;
    try {
      if (isVideoFile(file)) {
        const res = await readUploadedVideo(file);
        const defaultChroma: VideoChromaKeyConfig = {
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
        };
        onUpdateMarker(selectedMarker.id, {
          customIconPng: res.dataUrl,
          videoUrl: res.videoUrl,
          mediaType: 'video',
          videoChromaKey: selectedMarker.videoChromaKey || defaultChroma,
          pivotX: selectedMarker.pivotX ?? 0.5,
          pivotY: selectedMarker.pivotY ?? 0.5,
          size: selectedMarker.size && selectedMarker.size > 64 ? selectedMarker.size : 150,
          motionLayers: undefined,
          motionAsset: false,
          effectStrokes: undefined,
        });
        setIsVideoChromaModalOpen(true);
      } else {
        const res = await readUploadedImage(file);
        onUpdateMarker(selectedMarker.id, {
          customIconPng: res.dataUrl,
          videoUrl: undefined,
          mediaType: undefined,
          videoChromaKey: undefined,
          size: selectedMarker.size && selectedMarker.size > 64 ? selectedMarker.size : 150,
          motionLayers: undefined,
          motionAsset: false,
          effectStrokes: undefined,
        });
      }
    } catch (err) {
      console.error('Erro ao fazer upload do ícone do marcador:', err);
    }
    e.target.value = '';
  };

  const handleUploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMarker) return;
    try {
      const res = await readUploadedImage(file);
      onUpdateMarker(selectedMarker.id, {
        bannerImagePng: res.dataUrl,
      });
    } catch (err) {
      console.error(err);
    }
    e.target.value = '';
  };

  const handleUploadEventVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMarker) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateMarker(selectedMarker.id, { eventVideoUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUploadToGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (isVideoFile(file)) {
        const res = await readUploadedVideo(file);
        const newAsset: import('../types/map').GalleryAsset = {
          id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          dataUrl: res.dataUrl,
          mediaType: 'video',
          videoUrl: res.videoUrl,
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
          category: 'Vídeos',
          tags: ['video', 'custom', 'chroma'],
          width: res.width,
          height: res.height,
          createdAt: new Date().toISOString(),
        };
        onUploadNewAsset?.(newAsset);
      } else {
        const res = await readUploadedImage(file);
        const newAsset: import('../types/map').GalleryAsset = {
          id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          dataUrl: res.dataUrl,
          category: 'Objetos',
          tags: ['custom', 'marcador'],
          width: res.width,
          height: res.height,
          createdAt: new Date().toISOString(),
        };
        onUploadNewAsset?.(newAsset);
      }
    } catch (err) {
      console.error('Erro ao enviar asset para a galeria:', err);
    }
    e.target.value = '';
  };

  const renderIcon = (marker: MapMarker) => {
    if (marker.customIconPng) {
      return (
        <img
          src={marker.customIconPng}
          alt={marker.name}
          className="w-full h-full object-contain"
        />
      );
    }

    switch (marker.type) {
      case 'port':
        return <Anchor className="w-3.5 h-3.5" />;
      case 'town':
        return <Landmark className="w-3.5 h-3.5" />;
      case 'castle':
        return <Castle className="w-3.5 h-3.5" />;
      case 'boss':
        return <Skull className="w-3.5 h-3.5" />;
      case 'treasure':
        return <Gem className="w-3.5 h-3.5" />;
      case 'shrine':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'cave':
      case 'tower':
        return <Mountain className="w-3.5 h-3.5" />;
      case 'event':
        return <Zap className="w-3.5 h-3.5" />;
      case 'npc':
        return <User className="w-3.5 h-3.5" />;
      default:
        return <Tent className="w-3.5 h-3.5" />;
    }
  };

  const filteredGalleryAssets = galleryAssets.filter((asset) => {
    const matchesSearch = !gallerySearch || asset.name.toLowerCase().includes(gallerySearch.toLowerCase());
    const matchesCategory = galleryCategory === 'all' || asset.category === galleryCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredPresetMarkers = DEFAULT_PRESET_MARKERS.filter((preset) => {
    const matchesSearch =
      !gallerySearch ||
      preset.name.toLowerCase().includes(gallerySearch.toLowerCase()) ||
      preset.description.toLowerCase().includes(gallerySearch.toLowerCase());
    const matchesCategory = galleryCategory === 'all' || preset.category === galleryCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      <input
        ref={markerFileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/gif, video/mp4, video/webm, video/ogg, video/quicktime, video/*"
        className="hidden"
        onChange={handleUploadIcon}
      />
      <input
        ref={bannerFileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleUploadBanner}
      />
      <input
        ref={eventVideoFileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleUploadEventVideo}
      />
      <input
        ref={galleryUploadRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/gif, video/mp4, video/webm, video/ogg, video/quicktime, video/*"
        className="hidden"
        onChange={handleUploadToGallery}
      />

      {/* Navegação Superior: Marcadores vs Galeria */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setStudioMainTab('markers')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            studioMainTab === 'markers'
              ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Marcadores ({interactiveMarkers.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setStudioMainTab('gallery')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            studioMainTab === 'gallery'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Galeria de Marcadores</span>
        </button>
      </div>

      {/* PAINEL DA GALERIA DE MARCADORES (DRAG AND DROP NO MAPA) */}
      {studioMainTab === 'gallery' && (
        <div className="space-y-3.5">
          {/* Header & Upload */}
          <div className="p-3 bg-gradient-to-r from-amber-950/40 via-slate-900 to-orange-950/40 border border-amber-500/30 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-300 block">
                  🏛️ Galeria de Marcadores &amp; Assets
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Arraste qualquer item diretamente para o canvas do mapa 🖐️
                </span>
              </div>
              <button
                type="button"
                onClick={() => galleryUploadRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-colors cursor-pointer"
                title="Importar imagens ou vídeos diretamente do computador para a galeria"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Imports</span>
              </button>
            </div>

            {/* Busca e Filtro de Categorias */}
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={gallerySearch}
                  onChange={(e) => setGallerySearch(e.target.value)}
                  placeholder="Buscar asset ou modelo..."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Categorias */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-semibold">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'Personagens', label: '🧍 NPCs' },
                  { id: 'Luz & Magia', label: '💡 Luz & Magia' },
                  { id: 'Baús & Itens', label: '📦 Baús & Itens' },
                  { id: 'Portais & Viagem', label: '🌌 Portais' },
                  { id: 'Cenário', label: '🌳 Cenário' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setGalleryCategory(cat.id)}
                    className={`px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors cursor-pointer ${
                      galleryCategory === cat.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dica Visual de Arraste */}
          <div className="p-2.5 bg-sky-950/30 border border-sky-500/20 rounded-xl flex items-center gap-2.5 text-[11px] text-sky-200">
            <span className="text-lg">🎯</span>
            <div>
              <strong className="block font-bold text-sky-300">Arrastar &amp; Soltar no Mapa:</strong>
              <span className="text-[10px] text-slate-400">
                Pressione sobre um card e solte sobre qualquer região do mapa canvas para criar o marcador!
              </span>
            </div>
          </div>

          {/* 1. Assets do Usuário / Projeto */}
          {galleryAssets.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-300 uppercase tracking-wide">
                <span>Assets do Projeto ({filteredGalleryAssets.length})</span>
                <span className="text-[9px] text-slate-400 font-mono">Assets &amp; Vídeos</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {filteredGalleryAssets.map((asset) => {
                  const isVid = asset.mediaType === 'video' || Boolean(asset.videoUrl);
                  return (
                    <div
                      key={asset.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          'application/json',
                          JSON.stringify({
                            type: 'marker_asset',
                            asset: {
                              name: asset.name,
                              dataUrl: asset.dataUrl,
                              type: 'neutral',
                              size: 150,
                              solidCollision: true,
                              hasShadow: true,
                              mediaType: isVid ? 'video' : undefined,
                              videoUrl: isVid ? asset.videoUrl : undefined,
                              videoChromaKey: isVid ? asset.videoChromaKey : undefined,
                              pivotX: isVid ? (asset.pivotX ?? 0.5) : 0.5,
                              pivotY: isVid ? (asset.pivotY ?? 0.5) : 0.5,
                            },
                          })
                        );
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className="p-2 bg-slate-900 border border-slate-800 hover:border-amber-400/70 rounded-xl flex flex-col justify-between gap-1.5 transition-all group cursor-grab active:cursor-grabbing hover:shadow-lg hover:bg-slate-850 relative"
                    >
                      {/* Badge de Vídeo */}
                      {isVid && (
                        <div className="absolute top-1.5 left-1.5 z-10 px-1 py-0.2 rounded bg-rose-600 text-white text-[8px] font-black tracking-wider uppercase shadow">
                          🎬 VÍDEO
                        </div>
                      )}

                      <div className="w-full aspect-square rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-center p-2 relative overflow-hidden">
                        <img
                          src={asset.dataUrl}
                          alt={asset.name}
                          className="w-full h-full object-contain pointer-events-none group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-1 right-1 text-[8px] bg-slate-950/80 text-slate-400 px-1 rounded font-mono">
                          {asset.width}x{asset.height}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-200 block truncate" title={asset.name}>
                          {asset.name}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            onAddMarkerWithAsset?.({
                              name: asset.name,
                              dataUrl: asset.dataUrl,
                              type: 'neutral',
                              size: 150,
                              solidCollision: true,
                              hasShadow: true,
                              mediaType: isVid ? 'video' : undefined,
                              videoUrl: isVid ? asset.videoUrl : undefined,
                              videoChromaKey: isVid ? asset.videoChromaKey : undefined,
                              pivotX: isVid ? (asset.pivotX ?? 0.5) : 0.5,
                              pivotY: isVid ? (asset.pivotY ?? 0.5) : 0.5,
                            } as any);
                          }}
                          className="w-full py-1 px-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Adicionar ao centro do mapa"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Inserir</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Modelos & Presets Prontos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-300 uppercase tracking-wide">
              <span>Modelos Prontos ({filteredPresetMarkers.length})</span>
              <span className="text-[9px] text-slate-400 font-mono">Presets Nativos</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {filteredPresetMarkers.map((preset) => (
                <div
                  key={preset.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      'application/json',
                      JSON.stringify({
                        type: 'marker_asset',
                        asset: {
                          name: preset.name,
                          type: preset.type,
                          size: preset.size,
                          solidCollision: preset.solidCollision,
                          hasShadow: preset.hasShadow,
                          npcBounce: preset.npcBounce,
                          effect: preset.effect,
                        },
                      })
                    );
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="p-2.5 bg-slate-900 border border-slate-800 hover:border-amber-400/70 rounded-xl flex flex-col justify-between gap-2 transition-all group cursor-grab active:cursor-grabbing hover:shadow-lg"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-inner"
                      style={{ backgroundColor: `${preset.color}25`, border: `1px solid ${preset.color}60` }}
                    >
                      {preset.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-100 block truncate" title={preset.name}>
                        {preset.name}
                      </span>
                      <span className="text-[9px] text-slate-400 block truncate">
                        {preset.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-[9px] text-slate-400 leading-tight line-clamp-2">
                    {preset.description}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      onAddMarkerWithAsset?.({
                        name: preset.name,
                        type: preset.type,
                        size: preset.size,
                        solidCollision: preset.solidCollision,
                        hasShadow: preset.hasShadow,
                        npcBounce: preset.npcBounce,
                        effect: preset.effect,
                      });
                    }}
                    className="w-full py-1 px-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-700 hover:border-amber-400 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    title="Adicionar ao mapa"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Inserir</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA DE MARCADORES (LISTA E EDITOR) */}
      {studioMainTab === 'markers' && (
        <>
      {/* Top action: Add marker button */}
      <button
        onClick={onTriggerAddMarkerMode}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium text-xs shadow-md transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>Clique no mapa para marcar</span>
      </button>

      {/* Selected Marker Editor */}
      {selectedMarker && (
        <div className="p-3 bg-slate-900 border-2 border-amber-500/60 rounded-xl space-y-3 shadow-xl">
          {/* Topo do Editor: Voltar, Nome, Fase e Excluir */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onSelectMarker(null)}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-amber-300 py-1 px-2 rounded-lg bg-slate-950 border border-slate-800 transition-colors cursor-pointer"
                title="Voltar para a lista completa"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Lista</span>
              </button>

              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={selectedMarker.name}
                  onChange={(e) => onUpdateMarker(selectedMarker.id, { name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1 text-xs text-amber-200 font-bold focus:outline-none"
                  placeholder="Nome do marcador..."
                />
              </div>

              <button
                type="button"
                onClick={() => onDeleteMarker(selectedMarker.id)}
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg bg-slate-950 border border-slate-800 transition-colors cursor-pointer"
                title="Excluir marcador"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span className="font-semibold text-slate-300">{phaseLabel(selectedMarker.subBiomeId)}</span>
              <button
                type="button"
                onClick={() => onUpdateMarker(selectedMarker.id, { markerOff: !selectedMarker.markerOff })}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  selectedMarker.markerOff
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-400/70 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
                title="Marcador OFF: vira piso/chão puro (sem colisão física e desenhado atrás de tudo, herói e NPCs passam livremente por cima)"
              >
                <span>{selectedMarker.markerOff ? '🔘' : '⚪'}</span>
                <span>{selectedMarker.markerOff ? 'Marcador OFF (Modo Chão)' : 'Marcador OFF'}</span>
              </button>
            </div>
          </div>

          {/* 🖼️ Imagem ou Vídeo do Marcador (Fora das abas, logo no topo) */}
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Aparência &amp; Asset (PNG / Vídeo)</span>
              </span>
              {selectedMarker.customIconPng && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateMarker(selectedMarker.id, {
                      customIconPng: undefined,
                      mediaType: undefined,
                      videoUrl: undefined,
                      videoChromaKey: undefined,
                      motionLayers: undefined,
                      motionAsset: false,
                      effectStrokes: undefined,
                    })
                  }
                  className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <X className="w-3 h-3" />
                  <span>Remover Asset</span>
                </button>
              )}
            </div>

            {selectedMarker.customIconPng ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-lg border border-amber-500/50 bg-slate-900 p-1 flex items-center justify-center shrink-0 shadow-inner relative overflow-hidden group"
                    style={{
                      transform: `rotate(${selectedMarker.rotation || 0}deg)`,
                    }}
                  >
                    <img
                      src={selectedMarker.customIconPng}
                      alt={selectedMarker.name}
                      className="w-full h-full object-contain"
                    />
                    {(selectedMarker.mediaType === 'video' || selectedMarker.videoUrl) && (
                      <span className="absolute top-0.5 right-0.5 text-[8px] bg-rose-600/90 text-white px-1 rounded font-black tracking-wider uppercase shadow">
                        VÍDEO
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setGalleryModalTarget('icon');
                          setIsGalleryModalOpen(true);
                        }}
                        className="text-xs px-2.5 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 rounded-lg transition-colors flex items-center gap-1.5 font-bold cursor-pointer"
                        title="Escolher asset do acervo oficial da Galeria"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Abrir Galeria</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => markerFileInputRef.current?.click()}
                        className="text-xs px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer font-bold border border-slate-700"
                        title="Carregar arquivo local (PNG ou Vídeo MP4/WebM) do seu computador"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Imports</span>
                      </button>
                    </div>

                    {(selectedMarker.mediaType === 'video' || selectedMarker.videoUrl) && (
                      <button
                        type="button"
                        onClick={() => setIsVideoChromaModalOpen(true)}
                        className="text-xs px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 rounded-lg transition-all flex items-center gap-1.5 font-bold cursor-pointer shadow-sm animate-pulse hover:animate-none w-fit"
                        title="Configurar recorte Chroma Key (cor, tolerância, corte square e ponto de pivô)"
                      >
                        <Palette className="w-3.5 h-3.5 text-emerald-400" />
                        <span>🎭 Chroma Key &amp; Pivô</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGalleryModalTarget('icon');
                    setIsGalleryModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 hover:bg-amber-500/30 rounded-lg text-xs font-bold text-amber-300 transition-colors cursor-pointer"
                  title="Escolher asset oficial da galeria ou criados pelo Motion Canvas"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Abrir Galeria</span>
                </button>
                <button
                  type="button"
                  onClick={() => markerFileInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-700 hover:border-amber-400 hover:bg-slate-900 rounded-lg text-xs text-slate-300 transition-colors cursor-pointer"
                  title="Carregar arquivo local (PNG ou Vídeo) do seu computador"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  <span>Imports</span>
                </button>
              </div>
            )}
          </div>

          {/* Seletor de Tipo / Modo de Marcador (Seção Retrátil / Accordion) */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsMarkerTypeCollapsed((prev) => !prev)}
              className="w-full px-2.5 py-2 flex items-center justify-between text-left hover:bg-slate-900/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                  Tipo do Marcador:
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px] flex items-center gap-1 shadow-sm">
                  <span>
                    {
                      {
                        npc: '🧍',
                        interactive_screen: '🥚',
                        neutral: '🪨',
                        light: '💡',
                        area: '📐',
                        travel: '🌌',
                        mission: '📦',
                        event: '⚡',
                        ponto: '📍',
                      }[markerMode] || '📍'
                    }
                  </span>
                  <span>
                    {
                      {
                        npc: 'NPC',
                        interactive_screen: 'Tela/Estação',
                        neutral: 'Neutro',
                        light: 'Luz',
                        area: 'Área',
                        travel: 'Viagem',
                        mission: 'Item/Quest',
                        event: 'Evento',
                        ponto: 'Ponto',
                      }[markerMode] || 'Marcador'
                    }
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <span className="text-[9px] text-slate-500 font-medium">
                  {isMarkerTypeCollapsed ? 'Expandir' : 'Recolher'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    isMarkerTypeCollapsed ? '-rotate-90' : 'rotate-0'
                  }`}
                />
              </div>
            </button>

            {!isMarkerTypeCollapsed && (
              <div className="p-2 pt-1.5 border-t border-slate-900 grid grid-cols-3 gap-1 text-[10px] font-bold">
                {[
                  { id: 'npc', label: 'NPC', icon: '🧍' },
                  { id: 'interactive_screen', label: 'Tela/Estação', icon: '🥚' },
                  { id: 'neutral', label: 'Neutro', icon: '🪨' },
                  { id: 'light', label: 'Luz', icon: '💡' },
                  { id: 'area', label: 'Área', icon: '📐' },
                  { id: 'travel', label: 'Viagem', icon: '🌌' },
                  { id: 'mission', label: 'Item/Quest', icon: '📦' },
                  { id: 'event', label: 'Evento', icon: '⚡' },
                  { id: 'ponto', label: 'Ponto', icon: '📍' },
                ].map((m) => {
                  const isActive = markerMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMarkerMode(m.id as any)}
                      className={`py-1.5 px-1 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                        isActive
                          ? `bg-amber-500/20 border-amber-400 text-amber-200 font-extrabold shadow-sm ring-1 ring-amber-400/40`
                          : `bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700`
                      }`}
                    >
                      <span className="text-sm">{m.icon}</span>
                      <span className="text-[9px] leading-tight">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sub-Abas do Marcador: Propriedades, Visual, Física, Efeitos, Eventos */}
          <div className="grid grid-cols-5 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            {[
              { id: 'props', label: 'Propriedades', icon: '⚙️' },
              { id: 'visual', label: 'Visual', icon: '🎨' },
              { id: 'physics', label: 'Física', icon: '🏃' },
              { id: 'effects', label: 'Efeitos', icon: '✨' },
              { id: 'events', label: 'Eventos', icon: '⚡' },
            ].map((sub) => {
              const isCurrent = activeSubTab === sub.id || (sub.id === 'events' && activeSubTab === 'rpg');
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setActiveSubTab(sub.id as any)}
                  className={`py-1.5 px-0.5 rounded-lg text-[9.5px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <span className="text-xs">{sub.icon}</span>
                  <span className="truncate">{sub.label}</span>
                </button>
              );
            })}
          </div>

          {/* CONTEÚDO CONDICIONAL POR SUB-ABA */}
          <div className="space-y-3 pt-1">
            {/* ========================================================================= */}
            {/* SUB-ABA 0: PROPRIEDADES EXCLUSIVAS DO TIPO DO MARCADOR                   */}
            {/* ========================================================================= */}
            {activeSubTab === 'props' && (
              <div className="space-y-3">
                {/* Banner de Identificação do Modo */}
                <div className="p-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 text-lg flex items-center justify-center border border-amber-500/40">
                      {markerMode === 'interactive_screen' && '🥚'}
                      {markerMode === 'npc' && '🧍'}
                      {markerMode === 'neutral' && '🪨'}
                      {markerMode === 'light' && '💡'}
                      {markerMode === 'area' && '📐'}
                      {markerMode === 'travel' && '🌌'}
                      {markerMode === 'mission' && '📦'}
                      {markerMode === 'event' && '⚡'}
                      {markerMode === 'ponto' && '📍'}
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-slate-100 uppercase tracking-wide">
                        Propriedades: {
                          markerMode === 'interactive_screen' ? 'Estação Interativa com Tela' :
                          markerMode === 'npc' ? 'Personagem NPC' :
                          markerMode === 'neutral' ? 'Elemento Neutro / Cenário' :
                          markerMode === 'light' ? 'Fonte de Luz & Halo' :
                          markerMode === 'area' ? 'Área de Gatilho / Zona' :
                          markerMode === 'travel' ? 'Portal de Viagem / Teleporte' :
                          markerMode === 'mission' ? 'Item de Missão' :
                          markerMode === 'event' ? 'Marcador de Evento' :
                          'Ponto de Interesse'
                        }
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {markerMode === 'interactive_screen' && 'Tela própria, slots de múltiplos assets sobrepostos e temporizador'}
                        {markerMode === 'npc' && 'Auto-caminhada, balões de diálogo e animação'}
                        {markerMode === 'neutral' && 'Elemento de cenário, piso e colisão de chão'}
                        {markerMode === 'light' && 'Iluminação dinâmica, raio de tocha e fogueira'}
                        {markerMode === 'area' && 'Formato e dimensões da zona no mapa'}
                        {markerMode === 'travel' && 'Destino de teletransporte e transição de fase'}
                        {markerMode === 'mission' && 'Itens apanháveis e pontos de entrega'}
                        {markerMode === 'event' && 'Cena acionada por contato ou proximidade'}
                        {markerMode === 'ponto' && 'Ponto de acampamento ou referência'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* --- MODO INTERATIVO + TELA (CHOCADEIRA, FORJA, CALDEIRÃO) --- */}
                {(markerMode === 'interactive_screen' || selectedMarker.type === 'interactive_screen') && (
                  <MarkerStationModule marker={selectedMarker} markers={markers} savedLevels={savedLevels} galleryAssets={galleryAssets} onUpdateMarker={onUpdateMarker} />
                )}

                {/* --- 1. PROPRIEDADES DO MODO NPC --- */}
                {(markerMode === 'npc' || selectedMarker.type === 'npc') && (
                  <MarkerNpcModule marker={selectedMarker} markers={markers} savedLevels={savedLevels} onUpdateMarker={onUpdateMarker} />
                )}

                {/* --- 2. PROPRIEDADES DO MODO VIAGEM / TRAVEL --- */}
                {(markerMode === 'travel' || selectedMarker.type === 'travel') && (
                  <MarkerTravelModule marker={selectedMarker} markers={markers} savedLevels={savedLevels} onUpdateMarker={onUpdateMarker} />
                )}

                {/* --- 3. PROPRIEDADES DO MODO LUZ --- */}
                {(markerMode === 'light' || selectedMarker.type === 'light' || selectedMarker.lightConfig) && (
                  <MarkerLightModule marker={selectedMarker} markers={markers} savedLevels={savedLevels} onUpdateMarker={onUpdateMarker} />
                )}

                {/* --- 4. PROPRIEDADES DO MODO MISSÃO / ITEM --- */}
                {(markerMode === 'mission' || selectedMarker.type === 'collectible' || selectedMarker.type === 'deliverable') && (
                  <MarkerMissionModule marker={selectedMarker} markers={markers} savedLevels={savedLevels} onUpdateMarker={onUpdateMarker} />
                )}

                {/* --- 5. PROPRIEDADES DO MODO ÁREA --- */}
                {(markerMode === 'area' || selectedMarker.type === 'area') && (
                  <MarkerAreaModule marker={selectedMarker} markers={markers} savedLevels={savedLevels} onUpdateMarker={onUpdateMarker} />
                )}

                {/* --- 6. PROPRIEDADES DO MODO NEUTRO / PONTO --- */}
                {(markerMode === 'neutral' || markerMode === 'ponto') && (
                  <MarkerNeutralModule marker={selectedMarker} markers={markers} savedLevels={savedLevels} onUpdateMarker={onUpdateMarker} />
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* SUB-ABA 1: VISUAL                                                         */}
            {/* ========================================================================= */}
            {activeSubTab === 'visual' && (
              <MarkerVisualTab
                selectedMarker={selectedMarker}
                availableLayers={availableLayers}
                effectiveDefaultLayerId={effectiveDefaultLayerId}
                markerMode={markerMode}
                onOpenLayersTab={onOpenLayersTab}
                onUpdateMarker={onUpdateMarker}
                onFocusMarker={onFocusMarker}
                renderIcon={renderIcon}
              />
            )}

            {/* ========================================================================= */}
            {/* SUB-ABA 2: FÍSICA                                                         */}
            {/* ========================================================================= */}
            {activeSubTab === 'physics' && (
              <MarkerPhysicsTab
                selectedMarker={selectedMarker}
                onUpdateMarker={onUpdateMarker}
              />
            )}

            {/* ========================================================================= */}
            {/* SUB-ABA 3: EFEITOS (Motion Canvas & Malha 2D)                              */}
            {/* ========================================================================= */}
            {activeSubTab === 'effects' && (
              <MarkerEffectsTab
                selectedMarker={selectedMarker}
                onUpdateMarker={onUpdateMarker}
              />
            )}

            {/* ========================================================================= */}
            {/* SUB-ABA 4: EVENTOS MODULARES (Gatilhos, Ações, Som, Cinemática, Quests)  */}
            {/* ========================================================================= */}
            {(activeSubTab === 'events' || activeSubTab === 'rpg') && (
              <MarkerEventsTab
                selectedMarker={selectedMarker}
                markers={markers}
                savedLevels={savedLevels}
                savedDialogues={savedDialogues}
                onUpdateMarker={onUpdateMarker}
                onOpenDialogueTab={onOpenDialogueTab}
              />
            )}
          </div>
        </div>
      )}

      {/* Markers List — todas as fases, com selo de origem */}
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span>Marcadores — todas as fases</span>
        <span className="font-mono">🗺️ {verticalCount} · 💜 {extendedCount}</span>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {/* Card Consolidado Único para Camada de Natureza (Terrain Pen) — 1 Tufo Mestre + Clones Instanciados */}
        {natureCloneMarkers.length > 0 && (
          <div className="p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/25 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-sm shrink-0">
                🌿
              </span>
              <div className="min-w-0">
                <span className="text-xs font-bold text-emerald-200 block truncate">
                  Camada Natureza (Terrain Pen)
                </span>
                <span className="text-[10px] font-mono text-emerald-400/90 block">
                  1 Tufo Mestre · {natureCloneMarkers.length} clones instanciados
                </span>
              </div>
            </div>
            {onOpenLayersTab && (
              <button
                type="button"
                onClick={onOpenLayersTab}
                className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold shrink-0 cursor-pointer transition-colors"
                title="Gerenciar visibilidade na aba de Camadas"
              >
                Camada ↗
              </button>
            )}
          </div>
        )}

        {/* Marcadores Padrão */}
        <div className="space-y-1.5">
          {interactiveMarkers.filter((m) => !m.motionAsset).map((m) => {
            const isSelected = m.id === selectedMarkerId;

            return (
              <div
                key={m.id}
                onClick={() => onSelectMarker(m.id)}
                className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-slate-800/90 border-amber-400 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 overflow-hidden"
                    style={{
                      backgroundColor: m.color,
                      transform: `rotate(${m.rotation || 0}deg)`,
                    }}
                  >
                    {renderIcon(m)}
                  </span>
                  <span className="text-xs font-medium truncate">{m.name}</span>
                  {m.subBiomeId && (
                    <span
                      className="text-[9px] font-bold text-purple-300 bg-purple-500/20 border border-purple-500/40 rounded px-1 py-px shrink-0 truncate max-w-[110px]"
                      title={`Fase: ${subBiomes.find((sb) => sb.id === m.subBiomeId)?.name || 'Extended'}`}
                    >
                      💜 {subBiomes.find((sb) => sb.id === m.subBiomeId)?.name || 'Fase'}
                    </span>
                  )}
                  {(() => {
                    const mLayer = availableLayers.find((l) => l.id === (m.layerId || effectiveDefaultLayerId)) || availableLayers[0];
                    if (!mLayer) return null;
                    return (
                      <span
                        className="text-[9px] font-semibold rounded px-1 py-px shrink-0 truncate max-w-[90px] flex items-center gap-0.5"
                        style={{
                          backgroundColor: `${mLayer.color || '#3b82f6'}22`,
                          borderColor: `${mLayer.color || '#3b82f6'}55`,
                          borderWidth: 1,
                          color: mLayer.color || '#93c5fd',
                        }}
                        title={`Camada: ${mLayer.name} ${!mLayer.visible ? '(Oculta)' : ''} ${mLayer.locked ? '(Bloqueada)' : ''}`}
                      >
                        {mLayer.locked && '🔒'}
                        {!mLayer.visible && '🚫'}
                        <span>{mLayer.name}</span>
                      </span>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono-data text-[11px] text-slate-400">
                    {Math.round(m.y)}m
                  </span>
                  {!m.subBiomeId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFocusMarker(m);
                    }}
                    className="p-1 text-slate-400 hover:text-white"
                    title="Focar câmera"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                  </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Grupo Retrátil de Recortes Motion Pen */}
        {markers.filter((m) => m.motionAsset).length > 0 && (
          <div className="rounded-xl border border-fuchsia-900/40 bg-fuchsia-950/20 overflow-hidden">
            <button
              onClick={() => setShowMotionGroup((v) => !v)}
              className="w-full flex items-center justify-between p-2 text-[10px] font-bold uppercase tracking-wider text-fuchsia-300 hover:bg-fuchsia-900/20 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <span>✨ Recortes Motion Pen</span>
                <span className="px-1.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 text-[9px] font-mono">
                  {markers.filter((m) => m.motionAsset).length}
                </span>
              </span>
              <span className="text-xs text-fuchsia-400">{showMotionGroup ? '▼' : '▶'}</span>
            </button>
            {showMotionGroup && (
              <div className="p-1.5 space-y-1 border-t border-fuchsia-900/30">
                {markers.filter((m) => m.motionAsset).map((m) => {
                  const isSelected = m.id === selectedMarkerId;
                  return (
                    <div
                      key={m.id}
                      onClick={() => onSelectMarker(m.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-fuchsia-900/40 border-fuchsia-400 text-white'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-fuchsia-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded flex items-center justify-center shrink-0 overflow-hidden bg-fuchsia-950 border border-fuchsia-500/40">
                          {m.customIconPng ? (
                            <img src={m.customIconPng} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[10px]">✨</span>
                          )}
                        </span>
                        <span className="text-xs font-medium truncate">{m.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-mono text-fuchsia-400/80">
                          {m.motionActive ? 'Ativo' : 'Dormindo'}
                        </span>
                        <span className="font-mono-data text-[10px] text-slate-400">
                          {Math.round(m.y)}m
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🌐 Marcadores Universais — todas as fases: em produção + galeria de salvas */}
      <div className="pt-3 border-t border-slate-800 space-y-2">
        <button
          onClick={() => setShowUniversal((v) => !v)}
          className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-white"
        >
          <span>🌐 Marcadores universais (todas as fases)</span>
          <span>{showUniversal ? '▾' : '▸'}</span>
        </button>
        {showUniversal && (
          <div className="space-y-2">
            {/* Em produção — mapa vertical */}
            <div>
              <div className="text-[10px] font-bold text-sky-300 mb-1">
                🗺️ Em produção — vertical ({verticalMarkers.length})
              </div>
              {verticalMarkers.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic">Nenhum.</p>
              ) : (
                verticalMarkers.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => onSelectMarker(m.id)}
                    className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:border-slate-600 cursor-pointer mb-1"
                  >
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 overflow-hidden" style={{ backgroundColor: m.color }}>
                      {renderIcon(m)}
                    </span>
                    <span className="text-[11px] text-slate-200 truncate">{m.name}</span>
                  </div>
                ))
              )}
            </div>
            {/* Em produção — cada fase Extended */}
            {subBiomes.map((sb) => {
              const list = markersOfSubBiome(sb.id);
              return (
                <div key={sb.id}>
                  <div className="text-[10px] font-bold text-purple-300 mb-1">
                    💜 {sb.name} ({list.length})
                  </div>
                  {list.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">Nenhum.</p>
                  ) : (
                    list.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => onSelectMarker(m.id)}
                        className="flex items-center gap-2 p-1.5 rounded-lg border border-purple-500/20 bg-slate-950 hover:border-purple-400 cursor-pointer mb-1"
                      >
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 overflow-hidden" style={{ backgroundColor: m.color }}>
                          {renderIcon(m)}
                        </span>
                        <span className="text-[11px] text-slate-200 truncate">{m.name}</span>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
            {/* Galeria — fases salvas */}
            <div>
              <div className="text-[10px] font-bold text-amber-300 mb-1">
                🎮 Fases salvas — galeria ({savedLevels.length})
              </div>
              {savedLevels.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic">Nenhuma fase salva.</p>
              ) : (
                savedLevels.map((lvl) => {
                  const lvlMarkers: MapMarker[] = (lvl.projectData?.markers || []).filter(
                    (m) => !m.id.startsWith('terrain-')
                  );
                  const lvlSubBiomes = lvl.projectData?.subBiomes || [];
                  return (
                    <div key={lvl.id} className="mb-2 p-1.5 rounded-xl border border-slate-800 bg-slate-950/60">
                      <div className="text-[11px] font-bold text-amber-200 truncate">
                        🎮 {lvl.name} ({lvlMarkers.length})
                      </div>
                      {lvlMarkers.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic">Sem marcadores.</p>
                      ) : (
                        lvlMarkers.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => onOpenSavedMarker?.(lvl, m.id)}
                            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                            title="Abrir fase e selecionar"
                          >
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 overflow-hidden" style={{ backgroundColor: m.color }}>
                              {renderIcon(m)}
                            </span>
                            <span className="text-[11px] text-slate-300 truncate flex-1">{m.name}</span>
                            {m.subBiomeId && (
                              <span className="text-[9px] text-purple-300 shrink-0">
                                💜 {lvlSubBiomes.find((sb) => sb.id === m.subBiomeId)?.name || 'Fase'}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* Modal Oficial de Seleção da Galeria de Assets */}
      {selectedMarker && (
        <AssetGalleryModal
          isOpen={isGalleryModalOpen}
          onClose={() => setIsGalleryModalOpen(false)}
          galleryAssets={galleryAssets}
          categories={galleryCategories}
          onUploadNewAsset={onUploadNewAsset}
          title={galleryModalTarget === 'banner' ? `Banner para "${selectedMarker.name}"` : `Galeria para "${selectedMarker.name}"`}
          subtitle="Selecione qualquer asset ou peça criada para vestir este marcador"
          onSelectAsset={(dataUrl, assetName, asset) => {
            if (galleryModalTarget === 'banner') {
              onUpdateMarker(selectedMarker.id, { bannerImagePng: dataUrl });
            } else {
              const matchedAsset = asset || galleryAssets?.find((a) => a.dataUrl === dataUrl);
              const isVideo = matchedAsset?.mediaType === 'video' || Boolean(matchedAsset?.videoUrl);
              const newLayers = !isVideo && matchedAsset?.motionLayers && matchedAsset.motionLayers.length > 0
                ? JSON.parse(JSON.stringify(matchedAsset.motionLayers))
                : undefined;
              onUpdateMarker(selectedMarker.id, {
                customIconPng: dataUrl,
                mediaType: isVideo ? 'video' : undefined,
                videoUrl: isVideo ? matchedAsset?.videoUrl : undefined,
                videoChromaKey: isVideo ? matchedAsset?.videoChromaKey : undefined,
                pivotX: isVideo ? (matchedAsset?.pivotX ?? 0.5) : selectedMarker.pivotX,
                pivotY: isVideo ? (matchedAsset?.pivotY ?? 0.5) : selectedMarker.pivotY,
                size: (selectedMarker.size && selectedMarker.size > 64) ? selectedMarker.size : 150,
                bannerImagePng: selectedMarker.bannerImagePng || dataUrl,
                motionLayers: newLayers,
                motionAsset: Boolean(newLayers),
                shadowShape: isVideo ? 'ellipse' : selectedMarker.shadowShape,
                effectStrokes: newLayers ? (matchedAsset as any)?.effectStrokes : undefined,
                ...(assetName && (!selectedMarker.name || selectedMarker.name === 'Marcador')
                  ? { name: assetName }
                  : {}),
              });
            }
          }}
        />
      )}

      {/* Modal de Calibração de Chroma Key, Tolerância, Corte Square e Ponto de Pivô para Marcador com Vídeo */}
      {selectedMarker && (selectedMarker.mediaType === 'video' || Boolean(selectedMarker.videoUrl)) && (
        <VideoChromaKeyModal
          isOpen={isVideoChromaModalOpen}
          videoUrl={selectedMarker.videoUrl || selectedMarker.customIconPng || ''}
          initialChromaKey={selectedMarker.videoChromaKey}
          initialPivotX={selectedMarker.pivotX ?? 0.5}
          initialPivotY={selectedMarker.pivotY ?? 0.5}
          onClose={() => setIsVideoChromaModalOpen(false)}
          onSave={({ chromaKey, pivotX, pivotY }) => {
            onUpdateMarker(selectedMarker.id, {
              videoChromaKey: chromaKey,
              pivotX,
              pivotY,
              flipX: chromaKey.flipH ?? selectedMarker.flipX,
            });
            setIsVideoChromaModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
