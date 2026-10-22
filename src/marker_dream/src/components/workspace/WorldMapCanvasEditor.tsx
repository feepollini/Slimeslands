import React, { useState, useRef, useEffect } from 'react';
import type { MapProject, WorldMapConfig, WorldMapPOI, WorldMapLayer, WorldMapAtmosphereConfig, SavedLevel } from '../../types/map';
import {
  Upload,
  Plus,
  Compass,
  MapPin,
  Trash2,
  Copy,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Link,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Layers,
  Eye,
  EyeOff,
  Cloud,
  Sun,
  Moon,
  CloudRain,
  Snowflake,
  Sunset,
  CloudFog,
  Image as ImageIcon,
  Move,
  Sliders,
  RotateCcw,
  Palette,
  ExternalLink,
  GitBranch,
  Zap,
  Undo2,
  Waypoints,
  Save,
  FolderPlus,
  Globe,
  X,
} from 'lucide-react';
import { DEFAULT_CLOUD_SVG, DEFAULT_FOG_SVG } from '../../data/defaultAtmosphereAssets';

// Imagens padrão de Mapas Panorâmicos (SVG estilizados e decorativos)
export const DEFAULT_WORLD_MAP_BACKGROUNDS = [
  {
    id: 'fantasy_parchment',
    name: 'Pergaminho de Fantasia',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="667" viewBox="0 0 1600 667"><defs><linearGradient id="parch" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e130c"/><stop offset="35%" stop-color="%232e1d12"/><stop offset="70%" stop-color="%2324170e"/><stop offset="100%" stop-color="%23140b06"/></linearGradient><radialGradient id="ocean" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="%230f2b38"/><stop offset="100%" stop-color="%2305131b"/></radialGradient></defs><rect width="1600" height="667" fill="url(%23ocean)"/><path d="M0,240 Q180,180 340,250 T680,210 T1040,270 T1380,220 T1600,260 L1600,667 L0,667 Z" fill="url(%23parch)" opacity="0.95"/><path d="M60,110 Q140,70 230,120 T390,100 T470,170 T380,220 T180,210 Z" fill="url(%23parch)" opacity="0.9"/><path d="M620,80 Q760,40 920,90 T1140,80 T1230,170 T1060,200 T820,180 Z" fill="url(%23parch)" opacity="0.9"/><path d="M1290,90 Q1380,60 1480,95 T1570,160 T1490,210 T1360,180 Z" fill="url(%23parch)" opacity="0.85"/><circle cx="800" cy="333" r="140" fill="none" stroke="%23d97706" stroke-width="1.5" stroke-dasharray="6,6" opacity="0.3"/><circle cx="800" cy="333" r="280" fill="none" stroke="%23d97706" stroke-width="1" stroke-dasharray="10,10" opacity="0.18"/><text x="800" y="325" fill="%23fbbf24" font-family="serif" font-size="28" font-weight="bold" letter-spacing="8" text-anchor="middle" opacity="0.28">TERRAS CONHECIDAS</text><text x="800" y="360" fill="%23d97706" font-family="sans-serif" font-size="12" letter-spacing="4" text-anchor="middle" opacity="0.25">MAPA MÚNDI • REINO CENTRAL</text></svg>',
  },
  {
    id: 'ocean_archipelago',
    name: 'Arquipélago dos Mares',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="667" viewBox="0 0 1600 667"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="%23041926"/><stop offset="50%" stop-color="%2306283d"/><stop offset="100%" stop-color="%2303131d"/></linearGradient><linearGradient id="isle" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="%23166534"/><stop offset="100%" stop-color="%2314532d"/></linearGradient></defs><rect width="1600" height="667" fill="url(%23bg)"/><path d="M120,280 Q220,180 360,240 T520,380 T380,520 T180,480 Z" fill="url(%23isle)" stroke="%2322c55e" stroke-width="2" opacity="0.85"/><path d="M680,180 Q840,110 990,200 T1120,360 T980,510 T720,440 Z" fill="url(%23isle)" stroke="%2322c55e" stroke-width="2" opacity="0.85"/><path d="M1240,240 Q1380,160 1510,250 T1580,420 T1420,530 T1260,420 Z" fill="url(%23isle)" stroke="%2322c55e" stroke-width="2" opacity="0.85"/><path d="M340,300 C480,240 600,220 740,240 S1020,320 1180,310 S1320,300 1420,320" fill="none" stroke="%2338bdf8" stroke-width="2" stroke-dasharray="8,8" opacity="0.45"/></svg>',
  },
  {
    id: 'dark_realm',
    name: 'Reino Noturno & Vulcânico',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="667" viewBox="0 0 1600 667"><defs><linearGradient id="darkBg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2309090b"/><stop offset="40%" stop-color="%2318181b"/><stop offset="100%" stop-color="%23020617"/></linearGradient><linearGradient id="volc" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="%23451a03"/><stop offset="100%" stop-color="%237f1d1d"/></linearGradient></defs><rect width="1600" height="667" fill="url(%23darkBg)"/><path d="M0,180 Q280,120 540,230 T1100,190 T1600,240 L1600,667 L0,667 Z" fill="url(%23volc)" opacity="0.88"/><circle cx="480" cy="240" r="16" fill="%23f97316" filter="drop-shadow(0 0 12px %23ea580c)"/><circle cx="1120" cy="220" r="18" fill="%23ef4444" filter="drop-shadow(0 0 16px %23dc2626)"/><path d="M220,360 L540,310 L940,360 L1380,310" fill="none" stroke="%23f97316" stroke-width="2.5" stroke-dasharray="10,6" opacity="0.6"/></svg>',
  },
];

export const POI_ICONS_PRESETS = [
  { id: 'castle', label: 'Castelo', emoji: '🏰', color: '#f59e0b' },
  { id: 'town', label: 'Vila', emoji: '🏘️', color: '#10b981' },
  { id: 'invisible_node', label: 'Ponto Guiador (Invisível)', emoji: '⚓', color: '#38bdf8' },
  { id: 'dungeon', label: 'Caverna', emoji: '⛰️', color: '#6366f1' },
  { id: 'tower', label: 'Torre', emoji: '🗼', color: '#ec4899' },
  { id: 'shrine', label: 'Santuário', emoji: '✨', color: '#06b6d4' },
  { id: 'portal', label: 'Portal', emoji: '🌌', color: '#a855f7' },
  { id: 'boss', label: 'Chefe', emoji: '💀', color: '#ef4444' },
  { id: 'camp', label: 'Acampamento', emoji: '⛺', color: '#84cc16' },
  { id: 'treasure', label: 'Tesouro', emoji: '💎', color: '#eab308' },
  { id: 'ship', label: 'Porto', emoji: '⚓', color: '#38bdf8' },
];

export const DEFAULT_WORLD_MAP_LAYERS: WorldMapLayer[] = [
  { id: 'background', name: 'Fundo Panorâmico', visible: true, opacity: 1.0 },
  { id: 'routes', name: 'Rotas & Trilhas', visible: true, opacity: 1.0 },
  { id: 'pois', name: 'Pontos de Interesse', visible: true, opacity: 1.0 },
  { id: 'decorations', name: 'Decorações & Rosa dos Ventos', visible: true, opacity: 1.0 },
  { id: 'atmosphere', name: 'Nuvens & Atmosfera Viva', visible: true, opacity: 0.85 },
  { id: 'grid', name: 'Grade Náutica & Coordenadas', visible: false, opacity: 0.4 },
];

export const DEFAULT_WORLD_MAP_ATMOSPHERE: WorldMapAtmosphereConfig = {
  weather: 'clouds',
  cloudsEnabled: true,
  cloudsSpeed: 30,
  cloudsOpacity: 0.7,
  fogEnabled: false,
  fogOpacity: 0.35,
  lightingTint: '#ffffff',
  lightingOpacity: 1.0,
};

export function getOrCreateWorldMapConfig(project: MapProject): WorldMapConfig {
  if (project.worldMap && project.worldMap.pointsOfInterest) {
    return {
      id: project.worldMap.id || 'map-main-default',
      ...project.worldMap,
      layers: project.worldMap.layers || DEFAULT_WORLD_MAP_LAYERS,
      atmosphere: project.worldMap.atmosphere || DEFAULT_WORLD_MAP_ATMOSPHERE,
    };
  }
  return {
    id: 'map-main-default',
    enabled: true,
    title: project.title ? `Mapa Mundi - ${project.title}` : 'Mapa Principal do Reino',
    backgroundPng: DEFAULT_WORLD_MAP_BACKGROUNDS[0].url,
    mapWidth: 1600,
    mapHeight: 667,
    initialScrollX: 0,
    layers: DEFAULT_WORLD_MAP_LAYERS,
    atmosphere: DEFAULT_WORLD_MAP_ATMOSPHERE,
    pointsOfInterest: [
      {
        id: 'poi-start',
        name: 'Vila Inicial',
        description: 'Ponto de partida dos aventureiros.',
        x: 240,
        y: 330,
        iconEmoji: '🏘️',
        iconType: 'town',
        status: 'unlocked',
        badgeText: 'Início',
        scale: 1.0,
      },
      {
        id: 'poi-castle',
        name: 'Castelo do Rei',
        description: 'Fortaleza real protegida por guardas experientes.',
        x: 780,
        y: 260,
        iconEmoji: '🏰',
        iconType: 'castle',
        status: 'unlocked',
        badgeText: 'Fase 2',
        scale: 1.2,
      },
      {
        id: 'poi-boss',
        name: 'Covil das Trevas',
        description: 'Área perigosa onde reside o guardião supremo.',
        x: 1340,
        y: 310,
        iconEmoji: '💀',
        iconType: 'boss',
        status: 'locked',
        badgeText: 'Chefe Final',
        scale: 1.25,
      },
    ],
  };
}

interface Props {
  project: MapProject;
  setProject: React.Dispatch<React.SetStateAction<MapProject>>;
  savedLevels?: SavedLevel[];
  onLoadLevel?: (level: SavedLevel) => void;
  showToast: (msg: string) => void;
}

type SidebarTab = 'pois' | 'layers' | 'atmosphere' | 'background';

export const WorldMapCanvasEditor: React.FC<Props> = ({
  project,
  setProject,
  savedLevels = [],
  onLoadLevel,
  showToast,
}) => {
  const worldMap = getOrCreateWorldMapConfig(project);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('pois');
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(
    worldMap.pointsOfInterest[0]?.id || null
  );
  const [zoom, setZoom] = useState<number>(0.85);
  const [isDraggingPoi, setIsDraggingPoi] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 30, y: 30 });
  const panStartRef = useRef<{ x: number; y: number; startX: number; startY: number }>({
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
  });
  const viewportRef = useRef<HTMLDivElement>(null);
  const bgUploadInputRef = useRef<HTMLInputElement>(null);
  const poiIconInputRef = useRef<HTMLInputElement>(null);
  const poiBannerInputRef = useRef<HTMLInputElement>(null);

  // Estado do Modo de Inserção Contínua com Ramificação
  const [continuousMode, setContinuousMode] = useState<boolean>(false);
  const [activeParentPoiId, setActiveParentPoiId] = useState<string | null>(null);
  const [continuousPreset, setContinuousPreset] = useState<string>('town');
  const [mouseMapPos, setMouseMapPos] = useState<{ x: number; y: number } | null>(null);
  const [showMapManagerModal, setShowMapManagerModal] = useState<boolean>(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  const selectedPoi = worldMap.pointsOfInterest.find((p) => p.id === selectedPoiId) || null;
  const layers = worldMap.layers || DEFAULT_WORLD_MAP_LAYERS;
  const atmosphere = worldMap.atmosphere || DEFAULT_WORLD_MAP_ATMOSPHERE;

  // Lista de mapas salvos no projeto
  const savedWorldMaps: WorldMapConfig[] =
    project.savedWorldMaps && project.savedWorldMaps.length > 0
      ? project.savedWorldMaps
      : [worldMap];

  // Função para salvar o mapa ativo na biblioteca de mapas salvos
  const handleSaveCurrentMap = () => {
    const mapId = worldMap.id || 'map-main-default';
    const nowIso = new Date().toISOString();
    const updatedMap: WorldMapConfig = {
      ...worldMap,
      id: mapId,
      updatedAt: nowIso,
    };

    const existingIndex = savedWorldMaps.findIndex((m) => m.id === mapId);
    let nextSavedList: WorldMapConfig[] = [];

    if (existingIndex >= 0) {
      nextSavedList = [...savedWorldMaps];
      nextSavedList[existingIndex] = updatedMap;
    } else {
      nextSavedList = [...savedWorldMaps, updatedMap];
    }

    setProject((prev) => ({
      ...prev,
      worldMap: updatedMap,
      savedWorldMaps: nextSavedList,
      activeWorldMapId: mapId,
    }));

    showToast(`💾 Mapa "${updatedMap.title || 'Mapa Global'}" salvo com sucesso!`);
  };

  // Função para criar um novo mapa global em branco
  const handleCreateNewMap = () => {
    const newMapId = `map-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const count = savedWorldMaps.length + 1;

    const newMap: WorldMapConfig = {
      id: newMapId,
      enabled: true,
      title: `Novo Mapa Global ${count}`,
      description: 'Mapa panorâmico com locais e trilhas exclusivas.',
      createdAt: nowIso,
      updatedAt: nowIso,
      backgroundPng: DEFAULT_WORLD_MAP_BACKGROUNDS[0].url,
      mapWidth: 1600,
      mapHeight: 667,
      initialScrollX: 0,
      layers: DEFAULT_WORLD_MAP_LAYERS,
      atmosphere: DEFAULT_WORLD_MAP_ATMOSPHERE,
      pointsOfInterest: [
        {
          id: `poi-start-${Date.now()}`,
          name: 'Ponto Inicial',
          description: 'Ponto de partida deste mapa.',
          x: 250,
          y: 330,
          iconEmoji: '🚩',
          iconType: 'town',
          status: 'unlocked',
          badgeText: 'Início',
          scale: 1.0,
        },
      ],
    };

    const nextSavedList = [...savedWorldMaps, newMap];

    setProject((prev) => ({
      ...prev,
      worldMap: newMap,
      savedWorldMaps: nextSavedList,
      activeWorldMapId: newMapId,
    }));

    setSelectedPoiId(newMap.pointsOfInterest[0]?.id || null);
    showToast(`✨ Novo mapa "${newMap.title}" criado e ativado!`);
  };

  // Função para alternar o mapa global ativo
  const handleSwitchMap = (targetMapId: string) => {
    const matched = savedWorldMaps.find((m) => m.id === targetMapId);
    if (!matched) return;

    setProject((prev) => ({
      ...prev,
      worldMap: matched,
      activeWorldMapId: targetMapId,
    }));

    setSelectedPoiId(matched.pointsOfInterest[0]?.id || null);
    showToast(`🗺️ Alternado para o mapa: "${matched.title || 'Mapa Salvo'}"`);
  };

  // Função para duplicar mapa
  const handleDuplicateMap = (mapToDup: WorldMapConfig) => {
    const newMapId = `map-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const duplicated: WorldMapConfig = {
      ...mapToDup,
      id: newMapId,
      title: `${mapToDup.title || 'Mapa'} (Cópia)`,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const nextSavedList = [...savedWorldMaps, duplicated];

    setProject((prev) => ({
      ...prev,
      worldMap: duplicated,
      savedWorldMaps: nextSavedList,
      activeWorldMapId: newMapId,
    }));

    setSelectedPoiId(duplicated.pointsOfInterest[0]?.id || null);
    showToast(`📋 Mapa duplicado: "${duplicated.title}"`);
  };

  // Função para excluir mapa salvo
  const handleDeleteMap = (mapIdToDelete: string) => {
    if (savedWorldMaps.length <= 1) {
      showToast('⚠️ É necessário manter pelo menos 1 mapa no projeto.');
      return;
    }

    const nextSavedList = savedWorldMaps.filter((m) => m.id !== mapIdToDelete);
    const activeIsDeleted = (worldMap.id || 'map-main-default') === mapIdToDelete;
    const nextActive = activeIsDeleted ? nextSavedList[0] : worldMap;

    setProject((prev) => ({
      ...prev,
      worldMap: nextActive,
      savedWorldMaps: nextSavedList,
      activeWorldMapId: nextActive.id,
    }));

    showToast('🗑️ Mapa removido da biblioteca.');
  };

  // Atualiza configuração do mapa
  const updateWorldMap = (updates: Partial<WorldMapConfig>) => {
    const updated: WorldMapConfig = {
      ...worldMap,
      ...updates,
    };
    setProject((prev) => ({
      ...prev,
      worldMap: updated,
    }));
  };

  // Atualiza uma camada específica
  const updateLayer = (layerId: string, updates: Partial<WorldMapLayer>) => {
    const nextLayers = layers.map((l) => (l.id === layerId ? { ...l, ...updates } : l));
    updateWorldMap({ layers: nextLayers });
  };

  // Atualiza a atmosfera do mapa
  const updateAtmosphere = (updates: Partial<WorldMapAtmosphereConfig>) => {
    const nextAtmo = { ...atmosphere, ...updates };
    updateWorldMap({ atmosphere: nextAtmo });
  };

  // Atualiza um POI específico
  const updatePoi = (id: string, updates: Partial<WorldMapPOI>) => {
    const nextList = worldMap.pointsOfInterest.map((p) => (p.id === id ? { ...p, ...updates } : p));
    updateWorldMap({ pointsOfInterest: nextList });
  };

  // Adiciona novo Ponto de Interesse
  const handleAddNewPoi = () => {
    const newId = `poi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newPoi: WorldMapPOI = {
      id: newId,
      name: `Novo Local ${worldMap.pointsOfInterest.length + 1}`,
      description: 'Ponto de interesse explorável no mapa interativo.',
      x: Math.round((worldMap.mapWidth || 1600) / 2 + (Math.random() - 0.5) * 300),
      y: Math.round((worldMap.mapHeight || 667) / 2 + (Math.random() - 0.5) * 200),
      iconEmoji: '📍',
      iconType: 'castle',
      status: 'unlocked',
      badgeText: `Local ${worldMap.pointsOfInterest.length + 1}`,
      scale: 1.0,
    };
    updateWorldMap({
      pointsOfInterest: [...worldMap.pointsOfInterest, newPoi],
    });
    setSelectedPoiId(newId);
    setActiveSidebarTab('pois');
    showToast('✨ Ponto de Interesse adicionado ao Mapa!');
  };

  // Exclui POI selecionado
  const handleDeletePoi = (id: string) => {
    const nextList = worldMap.pointsOfInterest.filter((p) => p.id !== id);
    updateWorldMap({ pointsOfInterest: nextList });
    if (selectedPoiId === id) {
      setSelectedPoiId(nextList[0]?.id || null);
    }
    showToast('Ponto de interesse removido.');
  };

  // Upload de PNG de Fundo do Mapa
  const handleUploadBgFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        const img = new Image();
        img.onload = () => {
          updateWorldMap({
            backgroundPng: dataUrl,
            mapWidth: Math.max(1200, img.naturalWidth || 1600),
            mapHeight: Math.max(500, img.naturalHeight || 667),
          });
          showToast('🗺️ Imagem de fundo do mapa importada com sucesso!');
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Upload de PNG de ícone para o POI selecionado
  const handleUploadPoiIcon = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPoiId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        updatePoi(selectedPoiId, { iconPng: dataUrl });
        showToast('🖼️ PNG personalizado do ponto atualizado!');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Upload de Banner da Janela de Viagem
  const handleUploadPoiBanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPoiId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        updatePoi(selectedPoiId, { bannerPng: dataUrl });
        showToast('🖼️ Banner da janela de viagem atualizado!');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Clique no canvas em Modo de Inserção Contínua (Cria marcador e encadeia/ramifica)
  const handleContinuousCanvasClick = (e: React.MouseEvent) => {
    if (!continuousMode) return;
    const canvasEl = document.getElementById('world-map-canvas-plane');
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / zoom;
    const rawY = (e.clientY - rect.top) / zoom;
    const clampedX = Math.max(30, Math.min((worldMap.mapWidth || 1600) - 30, Math.round(rawX)));
    const clampedY = Math.max(30, Math.min((worldMap.mapHeight || 667) - 30, Math.round(rawY)));

    // Verifica se clicou próximo de algum POI existente
    const existingPoi = worldMap.pointsOfInterest.find(
      (p) => Math.hypot(p.x - clampedX, p.y - clampedY) < 32
    );

    if (existingPoi) {
      // Troca nó pai para iniciar nova ramificação a partir dele
      setActiveParentPoiId(existingPoi.id);
      setSelectedPoiId(existingPoi.id);
      showToast(`🌿 Ramificação definida a partir de: "${existingPoi.name}"`);
      return;
    }

    // Cria novo POI no ponto clicado
    const newId = `poi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const presetObj = POI_ICONS_PRESETS.find((p) => p.id === continuousPreset) || POI_ICONS_PRESETS[1];
    const count = worldMap.pointsOfInterest.length + 1;

    const newPoi: WorldMapPOI = {
      id: newId,
      name: `${presetObj.label} ${count}`,
      description: 'Novo destino encadeado na trilha do mapa.',
      x: clampedX,
      y: clampedY,
      iconEmoji: presetObj.emoji,
      iconType: presetObj.id,
      status: 'unlocked',
      badgeText: `Local ${count}`,
      scale: 1.0,
      parentId: activeParentPoiId || undefined,
      rewardSlots: [
        '🪙 150', '💎 10', '📜 Chave', '🧪 Poção', '🗡️ Espada',
        '🪵 5', '🪨 5', '⭐ XP+200', '🌸 Flor', '📜 Missão'
      ],
    };

    const nextConnections = [...(worldMap.routeConnections || [])];
    if (activeParentPoiId) {
      nextConnections.push({
        id: `route-${Date.now()}`,
        fromId: activeParentPoiId,
        toId: newId,
        style: 'dashed',
        color: '#f59e0b',
      });
    }

    updateWorldMap({
      pointsOfInterest: [...worldMap.pointsOfInterest, newPoi],
      routeConnections: nextConnections,
    });

    setSelectedPoiId(newId);
    setActiveParentPoiId(newId); // Avança encadeamento contínuo
    showToast(`📍 Marcador "${newPoi.name}" adicionado à trilha!`);
  };

  // Drag & Drop no canvas do mapa para reposicionar POIs
  const handlePoiPointerDown = (e: React.PointerEvent, poi: WorldMapPOI) => {
    e.stopPropagation();
    setSelectedPoiId(poi.id);
    setIsDraggingPoi(poi.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingPoi) {
      const canvasEl = document.getElementById('world-map-canvas-plane');
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      const rawX = (e.clientX - rect.left) / zoom;
      const rawY = (e.clientY - rect.top) / zoom;
      const clampedX = Math.max(30, Math.min((worldMap.mapWidth || 1600) - 30, Math.round(rawX)));
      const clampedY = Math.max(30, Math.min((worldMap.mapHeight || 667) - 30, Math.round(rawY)));
      updatePoi(isDraggingPoi, { x: clampedX, y: clampedY });
    } else if (isPanning) {
      setPanOffset({
        x: panStartRef.current.x + (e.clientX - panStartRef.current.startX),
        y: panStartRef.current.y + (e.clientY - panStartRef.current.startY),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingPoi) {
      setIsDraggingPoi(null);
    }
    if (isPanning) {
      setIsPanning(false);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !isDraggingPoi) {
      setIsPanning(true);
      panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        x: panOffset.x,
        y: panOffset.y,
      };
    }
  };

  const mapW = worldMap.mapWidth || 1600;
  const mapH = worldMap.mapHeight || 667;

  // Camadas de visibilidade
  const isBgVisible = layers.find((l) => l.id === 'background')?.visible !== false;
  const bgOpacity = layers.find((l) => l.id === 'background')?.opacity ?? 1.0;
  const isRoutesVisible = layers.find((l) => l.id === 'routes')?.visible !== false;
  const routesOpacity = layers.find((l) => l.id === 'routes')?.opacity ?? 1.0;
  const isPoisVisible = layers.find((l) => l.id === 'pois')?.visible !== false;
  const poisOpacity = layers.find((l) => l.id === 'pois')?.opacity ?? 1.0;
  const isDecorationsVisible = layers.find((l) => l.id === 'decorations')?.visible !== false;
  const decorationsOpacity = layers.find((l) => l.id === 'decorations')?.opacity ?? 1.0;
  const isAtmoVisible = layers.find((l) => l.id === 'atmosphere')?.visible !== false;
  const atmoOpacity = layers.find((l) => l.id === 'atmosphere')?.opacity ?? 0.85;
  const isGridVisible = layers.find((l) => l.id === 'grid')?.visible === true;
  const gridOpacity = layers.find((l) => l.id === 'grid')?.opacity ?? 0.4;

  return (
    <div className="flex-1 h-full flex flex-col bg-zinc-950 select-none overflow-hidden relative">
      {/* Barra de Ferramentas Superior do Editor Solo de Mapa */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <input
                type="text"
                value={worldMap.title || 'Mapa do Reino'}
                onChange={(e) => updateWorldMap({ title: e.target.value })}
                className="bg-zinc-800/80 border border-zinc-700 rounded px-2 py-0.5 text-xs font-bold text-white max-w-[220px] focus:outline-none focus:border-amber-400"
                placeholder="Nome do Mapa"
              />
              <span className="text-[10px] text-zinc-400 block font-mono">
                Editor Solo de Mapa • {worldMap.pointsOfInterest.length} Locais
              </span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-zinc-800" />

          {/* Botão Adicionar Ponto de Interesse */}
          <button
            type="button"
            onClick={handleAddNewPoi}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-extrabold shadow-sm transition-all cursor-pointer active:scale-95"
            title="Adicionar novo Ponto de Interesse (Local clicável no mapa)"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Adicionar Ponto</span>
          </button>

          {/* Botão do Modo de Inserção Contínua com Ramificação */}
          <button
            type="button"
            onClick={() => {
              const next = !continuousMode;
              setContinuousMode(next);
              if (next && !activeParentPoiId && worldMap.pointsOfInterest.length > 0) {
                setActiveParentPoiId(selectedPoiId || worldMap.pointsOfInterest[0].id);
              }
              showToast(
                next
                  ? '⚡ Modo Inserção Contínua ATIVADO! Clique no mapa para posicionar marcadores encadeados e criar ramificações.'
                  : 'Modo Inserção Contínua desativado.'
              );
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold shadow-sm transition-all cursor-pointer active:scale-95 ${
              continuousMode
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 ring-2 ring-amber-300 animate-pulse'
                : 'bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 hover:text-white'
            }`}
            title="Modo Trilha Contínua: Clique no mapa para adicionar marcadores encadeados e ramificações"
          >
            <GitBranch className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{continuousMode ? 'Modo Trilha ON' : 'Inserção Contínua'}</span>
          </button>

          <div className="h-4 w-[1px] bg-zinc-800" />

          {/* Botão Salvar Mapa Ativo */}
          <button
            type="button"
            onClick={handleSaveCurrentMap}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            title="Salvar alterações do mapa atual"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Mapa</span>
          </button>

          {/* Botão Gerenciador de Múltiplos Mapas */}
          <button
            type="button"
            onClick={() => setShowMapManagerModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            title="Abrir Biblioteca de Múltiplos Mapas (Criar, Alternar e Duplicar)"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-200" />
            <span>Múltiplos Mapas ({savedWorldMaps.length})</span>
          </button>
        </div>

        {/* Controles de Zoom e Dimensão */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-850 p-0.5 rounded-lg border border-zinc-750">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}
              className="p-1 hover:bg-zinc-750 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-bold text-zinc-300 px-1">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
              className="p-1 hover:bg-zinc-750 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(0.85);
                setPanOffset({ x: 30, y: 30 });
              }}
              className="p-1 hover:bg-zinc-750 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Resetar Zoom e Centralizar"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Área Principal: Menu Lateral à ESQUERDA + Canvas Panorâmico ao CENTRO */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Painel Lateral ESQUERDO: Abas de Pontos, Camadas, Atmosfera e Fundo */}
        <div className="w-[420px] xl:w-[460px] 2xl:w-[500px] bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0 z-20 shadow-xl overflow-hidden">
          {/* Seletor de Abas do Menu Lateral do Mapa */}
          <div className="grid grid-cols-4 p-1.5 bg-zinc-950 border-b border-zinc-800 gap-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setActiveSidebarTab('pois')}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeSidebarTab === 'pois'
                  ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Pontos</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSidebarTab('layers')}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeSidebarTab === 'layers'
                  ? 'bg-indigo-600 text-white font-extrabold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Camadas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSidebarTab('atmosphere')}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeSidebarTab === 'atmosphere'
                  ? 'bg-cyan-600 text-white font-extrabold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Atmosfera</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSidebarTab('background')}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeSidebarTab === 'background'
                  ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Fundo</span>
            </button>
          </div>

          {/* Conteúdo da Aba 1: PONTOS DE INTERESSE */}
          {activeSidebarTab === 'pois' && (
            <div className="flex-1 flex flex-col overflow-y-auto">
              {/* Card de Controle Acessível do Modo Inserção Contínua com Ramificação */}
              <div className="p-3 bg-zinc-950/80 border-b border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${continuousMode ? 'bg-amber-400 animate-ping' : 'bg-zinc-600'}`} />
                    <span className="text-xs font-bold text-white">Inserção Contínua (Trilha)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !continuousMode;
                      setContinuousMode(next);
                      if (next && !activeParentPoiId && worldMap.pointsOfInterest.length > 0) {
                        setActiveParentPoiId(selectedPoiId || worldMap.pointsOfInterest[0].id);
                      }
                      showToast(next ? '⚡ Modo Inserção Contínua ATIVADO!' : 'Modo Inserção Contínua desativado.');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-all ${
                      continuousMode
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700'
                    }`}
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>{continuousMode ? 'ATIVADO' : 'Ativar Modo'}</span>
                  </button>
                </div>

                {continuousMode && (
                  <div className="space-y-2 pt-1 border-t border-zinc-800/80 text-[11px]">
                    <div className="flex items-center justify-between text-zinc-300">
                      <span className="text-zinc-400">Origem da Ramificação:</span>
                      <span className="font-bold text-amber-300 truncate max-w-[180px]">
                        {activeParentPoiId
                          ? worldMap.pointsOfInterest.find((p) => p.id === activeParentPoiId)?.name || 'Ponto Pai'
                          : 'Nenhum (Ponto Livre)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setActiveParentPoiId(null)}
                        className="flex-1 py-1 px-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-[10px] font-bold text-zinc-300 hover:text-white text-center cursor-pointer"
                      >
                        🌿 Novo Ramo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (worldMap.pointsOfInterest.length > 0) {
                            const lastPoi = worldMap.pointsOfInterest[worldMap.pointsOfInterest.length - 1];
                            handleDeletePoi(lastPoi.id);
                          }
                        }}
                        className="py-1 px-2.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-[10px] font-bold text-rose-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Undo2 className="w-3 h-3" />
                        <span>Desfazer</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Barra de ação de pontos */}
              <div className="p-3 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Lista de Locais</span>
                  <span className="text-[10px] text-zinc-400">
                    {worldMap.pointsOfInterest.length} pontos no mapa
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddNewPoi}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>Novo Ponto</span>
                </button>
              </div>

              {/* Lista dos POIs */}
              <div className="p-2 space-y-1 max-h-[160px] overflow-y-auto border-b border-zinc-800 bg-zinc-950/20">
                {worldMap.pointsOfInterest.map((p) => {
                  const isSel = p.id === selectedPoiId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPoiId(p.id)}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all border ${
                        isSel
                          ? 'bg-amber-500/15 border-amber-500/50 text-white'
                          : 'bg-zinc-850/60 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                          {p.iconPng ? (
                            <img src={p.iconPng} alt="" className="w-4 h-4 object-contain" />
                          ) : (
                            <span className="text-xs">{p.iconEmoji || '📍'}</span>
                          )}
                        </div>
                        <span className="font-semibold truncate">{p.name}</span>
                        {p.badgeText && (
                          <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full font-bold">
                            {p.badgeText}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePoi(p.id);
                          }}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                          title="Remover ponto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Inspetor do Ponto Selecionado */}
              {selectedPoi ? (
                <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                      Propriedades do Local
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      ID: {selectedPoi.id.slice(-6)}
                    </span>
                  </div>

                  {/* Nome e Descrição */}
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Nome do Ponto
                      </label>
                      <input
                        type="text"
                        value={selectedPoi.name}
                        onChange={(e) => updatePoi(selectedPoi.id, { name: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                        placeholder="Ex: Castelo Real, Vila dos Elfos"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Descrição
                      </label>
                      <textarea
                        rows={2}
                        value={selectedPoi.description || ''}
                        onChange={(e) => updatePoi(selectedPoi.id, { description: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                        placeholder="Breve história ou objetivos deste local..."
                      />
                    </div>
                  </div>

                  {/* Ícone PNG Customizado do Ponto */}
                  <div className="space-y-2 p-3 bg-zinc-850 rounded-xl border border-zinc-800">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                      <span>Ícone PNG do Local</span>
                      {selectedPoi.iconPng && (
                        <button
                          type="button"
                          onClick={() => updatePoi(selectedPoi.id, { iconPng: undefined })}
                          className="text-rose-400 hover:underline text-[9px]"
                        >
                          Remover PNG
                        </button>
                      )}
                    </label>

                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0 p-1">
                        {selectedPoi.iconPng ? (
                          <img
                            src={selectedPoi.iconPng}
                            alt="Ícone POI"
                            className="w-full h-full object-contain filter drop-shadow"
                          />
                        ) : (
                          <span className="text-2xl">{selectedPoi.iconEmoji || '📍'}</span>
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <button
                          type="button"
                          onClick={() => poiIconInputRef.current?.click()}
                          className="w-full py-1.5 px-3 bg-zinc-800 hover:bg-zinc-750 text-white rounded-lg text-xs font-semibold border border-zinc-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Upload className="w-3 h-3 text-amber-400" />
                          <span>Importar PNG Próprio</span>
                        </button>
                        <input
                          ref={poiIconInputRef}
                          type="file"
                          accept="image/png, image/webp"
                          className="hidden"
                          onChange={handleUploadPoiIcon}
                        />
                        <span className="text-[9px] text-zinc-400 block text-center">
                          Aceita PNG transparente
                        </span>
                      </div>
                    </div>

                    {/* Presets de Ícones e Emojis */}
                    <div className="pt-1">
                      <span className="text-[9px] text-zinc-400 block mb-1">Ou escolha um ícone padrão:</span>
                      <div className="grid grid-cols-5 gap-1">
                        {POI_ICONS_PRESETS.map((ic) => (
                          <button
                            key={ic.id}
                            type="button"
                            onClick={() =>
                              updatePoi(selectedPoi.id, {
                                iconEmoji: ic.emoji,
                                iconType: ic.id,
                                iconPng: undefined,
                              })
                            }
                            className={`p-1.5 rounded-lg text-center hover:bg-zinc-800 transition-colors border ${
                              selectedPoi.iconType === ic.id && !selectedPoi.iconPng
                                ? 'bg-amber-500/20 border-amber-500/50'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                            }`}
                            title={ic.label}
                          >
                            <span className="text-sm block">{ic.emoji}</span>
                            <span className="text-[8px] text-zinc-400 truncate block">{ic.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Vínculo com Fase Salva */}
                  <div className="space-y-1.5 p-3 bg-zinc-850 rounded-xl border border-zinc-800">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                      <Link className="w-3.5 h-3.5" />
                      <span>Vincular a uma Fase</span>
                    </label>

                    <select
                      value={selectedPoi.targetLevelId || ''}
                      onChange={(e) => {
                        const lId = e.target.value;
                        const matchedLevel = savedLevels.find((l) => l.id === lId);
                        updatePoi(selectedPoi.id, {
                          targetLevelId: lId || undefined,
                          targetLevelName: matchedLevel?.name || undefined,
                        });
                      }}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="">-- Nenhuma fase vinculada --</option>
                      {savedLevels.map((lvl) => (
                        <option key={lvl.id} value={lvl.id}>
                          🎮 {lvl.name} ({lvl.projectData?.canvasKind === 'extended' ? 'Extended' : 'Vertical'})
                        </option>
                      ))}
                    </select>

                    {selectedPoi.targetLevelId && (
                      <div className="flex items-center justify-between text-[10px] text-emerald-400 pt-1">
                        <span>✓ Fase conectada ao ponto</span>
                        {onLoadLevel && (
                          <button
                            type="button"
                            onClick={() => {
                              const lvl = savedLevels.find((l) => l.id === selectedPoi.targetLevelId);
                              if (lvl) onLoadLevel(lvl);
                            }}
                            className="underline hover:text-emerald-300 font-bold"
                          >
                            Abrir Fase
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Personalização da Janela / Pop-up de Game (Banner, Nível, Botão Viajar) */}
                  <div className="space-y-3 p-3 bg-zinc-850 rounded-xl border border-zinc-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                      🎮 Pop-up RPG de Viagem
                    </span>

                    {/* Banner Ilustrado da Janela */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                        <span>Banner Ilustrado do Topo</span>
                        {selectedPoi.bannerPng && (
                          <button
                            type="button"
                            onClick={() => updatePoi(selectedPoi.id, { bannerPng: undefined })}
                            className="text-rose-400 hover:underline text-[9px]"
                          >
                            Remover Banner
                          </button>
                        )}
                      </label>

                      {selectedPoi.bannerPng ? (
                        <div className="h-16 w-full rounded-lg overflow-hidden border border-zinc-700 relative">
                          <img src={selectedPoi.bannerPng} alt="Banner" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => poiBannerInputRef.current?.click()}
                          className="w-full py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-lg text-xs font-semibold border border-zinc-700 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-amber-400" />
                          <span>Importar Banner PNG/JPG</span>
                        </button>
                      )}
                      <input
                        ref={poiBannerInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUploadPoiBanner}
                      />
                    </div>

                    {/* Nível Recomendado & Texto do Botão Viajar */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                          Nv. Recomendado
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={selectedPoi.recommendedLevel || 1}
                          onChange={(e) => updatePoi(selectedPoi.id, { recommendedLevel: parseInt(e.target.value) || 1 })}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                          Texto do Botão
                        </label>
                        <input
                          type="text"
                          value={selectedPoi.travelButtonText || ''}
                          onChange={(e) => updatePoi(selectedPoi.id, { travelButtonText: e.target.value })}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                          placeholder="Ex: VIAJAR AGORA"
                        />
                      </div>
                    </div>

                    {/* Editor dos Slots Circulares de Slimes dessa Área (Presets 5, 10, 15 ou Personalizado) */}
                    <div className="space-y-2 pt-1 border-t border-zinc-800">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div>
                          <label className="text-[10.5px] font-bold uppercase tracking-wider text-amber-300 block">
                            👾 Slimes dessa Área ({selectedPoi.rewardSlotCount || selectedPoi.rewardSlots?.length || 10} Slots)
                          </label>
                          <span className="text-[9px] text-zinc-400">
                            Monstros que encontramos nesta área (iniciam como silhueta até serem escaneados)
                          </span>
                        </div>
                        {selectedPoi.rewardSlots?.some((s) => !!s) && (
                          <button
                            type="button"
                            onClick={() => {
                              const count = selectedPoi.rewardSlotCount || 10;
                              updatePoi(selectedPoi.id, { rewardSlots: Array(count).fill(''), rewardSlotConfigs: [] });
                              showToast('🧹 Slots de Slimes limpos com sucesso!');
                            }}
                            className="text-[9px] text-rose-400 hover:underline cursor-pointer"
                          >
                            Limpar Slots
                          </button>
                        )}
                      </div>

                      {/* Presets de Quantidade: 5, 10, 15 ou Personalizado */}
                      <div className="flex items-center gap-1.5 flex-wrap p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-bold">
                        <span className="text-zinc-400 text-[9px] uppercase font-mono mr-0.5">Presets:</span>
                        {[5, 10, 15].map((preset) => {
                          const active = (selectedPoi.rewardSlotCount || selectedPoi.rewardSlots?.length || 10) === preset;
                          return (
                            <button
                              key={`preset-slimes-${preset}`}
                              type="button"
                              onClick={() => {
                                const cur = [...(selectedPoi.rewardSlots || [])];
                                while (cur.length < preset) cur.push('');
                                const trimmed = cur.slice(0, preset);
                                updatePoi(selectedPoi.id, { rewardSlotCount: preset, rewardSlots: trimmed });
                                showToast(`👾 Presets de Slimes: ${preset} slots configurados!`);
                              }}
                              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                active
                                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                                  : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700'
                              }`}
                            >
                              {preset} Slimes {preset === 10 ? '★' : ''}
                            </button>
                          );
                        })}

                        <div className="flex items-center gap-1 ml-auto">
                          <span className="text-zinc-500 text-[9px]">Custom:</span>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={selectedPoi.rewardSlotCount || selectedPoi.rewardSlots?.length || 10}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 5;
                              const clamped = Math.max(1, Math.min(30, val));
                              const cur = [...(selectedPoi.rewardSlots || [])];
                              while (cur.length < clamped) cur.push('');
                              const trimmed = cur.slice(0, clamped);
                              updatePoi(selectedPoi.id, { rewardSlotCount: clamped, rewardSlots: trimmed });
                            }}
                            className="w-12 bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-center text-white font-mono border border-zinc-700"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-1.5 pt-1">
                        {Array.from({ length: selectedPoi.rewardSlotCount || selectedPoi.rewardSlots?.length || 10 }).map((_, idx) => {
                          const currentVal = selectedPoi.rewardSlots?.[idx] ?? '';
                          const isImage = currentVal.startsWith('data:image') || currentVal.startsWith('http');
                          const slotConfig = selectedPoi.rewardSlotConfigs?.find((s) => s.slotIndex === idx);
                          const isRevealed = slotConfig?.isRevealed ?? false;

                          return (
                            <div key={`slot-editor-${idx}`} className="space-y-1 flex flex-col items-center relative">
                              <span className="text-[8px] text-zinc-400 font-mono flex items-center gap-0.5">
                                S{idx + 1}
                                {isImage && (
                                  <span
                                    className={isRevealed ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}
                                    title={isRevealed ? 'Monstro Revelado (Escaneado em Cores)' : 'Silhueta Oculta (Não Escaneado)'}
                                  >
                                    {isRevealed ? '👁️' : '👤'}
                                  </span>
                                )}
                              </span>

                              {/* Circulo de Preview e Upload do PNG */}
                              <label
                                className={`w-10 h-10 rounded-full border border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden relative ${
                                  isImage
                                    ? isRevealed
                                      ? 'border-emerald-400 bg-emerald-950/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                      : 'border-amber-400 bg-black/80 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                                    : 'border-zinc-700 bg-zinc-900 hover:border-amber-500'
                                }`}
                                title={`Upload PNG para Slot ${idx + 1} (Clique para Inserir)`}
                              >
                                {isImage ? (
                                  <div className="relative w-full h-full flex items-center justify-center p-0.5">
                                    <img
                                      src={currentVal}
                                      alt={`Slot ${idx + 1}`}
                                      className={`w-full h-full object-contain ${
                                        !isRevealed
                                          ? 'filter brightness-0 contrast-200 opacity-85'
                                          : 'filter drop-shadow'
                                      }`}
                                    />
                                    {!isRevealed && (
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <Lock className="w-3.5 h-3.5 text-amber-300 drop-shadow-md" />
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <Upload className="w-3.5 h-3.5 text-zinc-500 hover:text-amber-400" />
                                )}

                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                      const dataUrl = ev.target?.result as string;
                                      if (dataUrl) {
                                        const currentSlots = [...(selectedPoi.rewardSlots || Array(10).fill(''))];
                                        currentSlots[idx] = dataUrl;

                                        const currentConfigs = [...(selectedPoi.rewardSlotConfigs || [])];
                                        const existingIdx = currentConfigs.findIndex((s) => s.slotIndex === idx);
                                        const newConfig = {
                                          slotIndex: idx,
                                          imageUrl: dataUrl,
                                          isRevealed: false, // Oculto por padrão como silhueta ao inserir PNG
                                          encounterEventLink:
                                            slotConfig?.encounterEventLink ||
                                            `https://meujogo.com/evento-encontro-local-${selectedPoi.id}-slot-${idx + 1}`,
                                          title: `Recompensa #${idx + 1}`,
                                        };

                                        if (existingIdx >= 0) {
                                          currentConfigs[existingIdx] = newConfig;
                                        } else {
                                          currentConfigs.push(newConfig);
                                        }

                                        updatePoi(selectedPoi.id, {
                                          rewardSlots: currentSlots,
                                          rewardSlotConfigs: currentConfigs,
                                        });
                                        showToast(
                                          `🖼️ PNG inserido no Slot #${idx + 1} (Silhueta Oculta até Evento)`
                                        );
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                    e.target.value = '';
                                  }}
                                />
                              </label>

                              {/* Botão de Configuração de Link e Estado */}
                              <button
                                type="button"
                                onClick={() => setEditingSlotIndex(editingSlotIndex === idx ? null : idx)}
                                className={`text-[8px] px-1 py-0.5 rounded border transition-all ${
                                  editingSlotIndex === idx
                                    ? 'bg-amber-500 text-black border-amber-400 font-bold'
                                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-amber-300'
                                }`}
                              >
                                {isImage ? (isRevealed ? '✓ Visível' : '👤 Silhueta') : 'Config'}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Painel Expansível de Configuração do Slot Selecionado (Link de Evento e Revelação) */}
                      {editingSlotIndex !== null && (
                        <div className="mt-2 p-3 bg-zinc-900 border border-amber-500/50 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1">
                              <Link className="w-3 h-3 text-amber-400" />
                              Configurar Slot #{editingSlotIndex + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingSlotIndex(null)}
                              className="text-[9px] text-zinc-400 hover:text-white"
                            >
                              ✕ Fechar
                            </button>
                          </div>

                          {/* Toggle Silhueta vs Revelado */}
                          <div className="flex items-center justify-between p-2 bg-black/60 rounded-lg border border-zinc-800">
                            <div>
                              <span className="text-[10px] font-bold text-white block">
                                Estado de Visibilidade
                              </span>
                              <span className="text-[8px] text-zinc-400 block">
                                Ao inserir um PNG, ele inicia oculta como Silhueta até o evento.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const idx = editingSlotIndex;
                                const currentConfigs = [...(selectedPoi.rewardSlotConfigs || [])];
                                const existingIdx = currentConfigs.findIndex((s) => s.slotIndex === idx);
                                const currentSlotVal = selectedPoi.rewardSlots?.[idx] || '';
                                const targetConfig = currentConfigs[existingIdx] || {
                                  slotIndex: idx,
                                  imageUrl: currentSlotVal,
                                  isRevealed: false,
                                  encounterEventLink: `https://meujogo.com/evento-encontro-local-${selectedPoi.id}-slot-${idx + 1}`,
                                };

                                const nextState = !targetConfig.isRevealed;
                                const updatedConfig = { ...targetConfig, isRevealed: nextState };

                                if (existingIdx >= 0) {
                                  currentConfigs[existingIdx] = updatedConfig;
                                } else {
                                  currentConfigs.push(updatedConfig);
                                }

                                updatePoi(selectedPoi.id, { rewardSlotConfigs: currentConfigs });
                                showToast(
                                  nextState
                                    ? `✨ Slot #${idx + 1} definido como REVELADO!`
                                    : `👤 Slot #${idx + 1} definido como SILHUETA OCULTA!`
                                );
                              }}
                              className={`px-2.5 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer border ${
                                selectedPoi.rewardSlotConfigs?.find((s) => s.slotIndex === editingSlotIndex)
                                  ?.isRevealed
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                              }`}
                            >
                              {selectedPoi.rewardSlotConfigs?.find((s) => s.slotIndex === editingSlotIndex)
                                ?.isRevealed
                                ? '👁️ Visível / Revelado'
                                : '👤 Silhueta Oculta'}
                            </button>
                          </div>

                          {/* Input do Link do Evento de Encontro */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-amber-200/90 block">
                              🔗 Link do Futuro Evento de Encontro (libera a visão do PNG)
                            </label>
                            <input
                              type="text"
                              value={
                                selectedPoi.rewardSlotConfigs?.find((s) => s.slotIndex === editingSlotIndex)
                                  ?.encounterEventLink || ''
                              }
                              onChange={(e) => {
                                const idx = editingSlotIndex;
                                const currentConfigs = [...(selectedPoi.rewardSlotConfigs || [])];
                                const existingIdx = currentConfigs.findIndex((s) => s.slotIndex === idx);
                                const currentSlotVal = selectedPoi.rewardSlots?.[idx] || '';
                                const targetConfig = currentConfigs[existingIdx] || {
                                  slotIndex: idx,
                                  imageUrl: currentSlotVal,
                                  isRevealed: false,
                                  encounterEventLink: '',
                                };

                                const updatedConfig = {
                                  ...targetConfig,
                                  encounterEventLink: e.target.value,
                                };

                                if (existingIdx >= 0) {
                                  currentConfigs[existingIdx] = updatedConfig;
                                } else {
                                  currentConfigs.push(updatedConfig);
                                }

                                updatePoi(selectedPoi.id, { rewardSlotConfigs: currentConfigs });
                              }}
                              className="w-full bg-black/80 border border-zinc-700 rounded p-1.5 text-[9px] font-mono text-amber-300 focus:border-amber-400 focus:outline-none"
                              placeholder="ex: https://meujogo.com/evento-encontro-fase1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Configuração de Ponto Invisível (Guia de Rota) */}
                  <div className="flex items-center justify-between p-2.5 bg-zinc-850 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-2">
                      <EyeOff className="w-4 h-4 text-amber-400" />
                      <div>
                        <span className="text-xs font-bold text-white block">Ponto Invisível (Guia de Rota)</span>
                        <span className="text-[10px] text-zinc-400">Usado apenas para curvar e ajustar o traçado no mapa</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!selectedPoi.isInvisible}
                      onChange={(e) => updatePoi(selectedPoi.id, { isInvisible: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* Estado / Status & Badge */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Estado
                      </label>
                      <select
                        value={selectedPoi.status || 'unlocked'}
                        onChange={(e) =>
                          updatePoi(selectedPoi.id, {
                            status: e.target.value as 'unlocked' | 'locked' | 'completed',
                          })
                        }
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-1.5 text-xs text-white focus:outline-none"
                      >
                        <option value="unlocked">🟢 Desbloqueado</option>
                        <option value="locked">🔒 Bloqueado</option>
                        <option value="completed">⭐ Concluído</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Etiqueta / Badge
                      </label>
                      <input
                        type="text"
                        value={selectedPoi.badgeText || ''}
                        onChange={(e) => updatePoi(selectedPoi.id, { badgeText: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                        placeholder="Ex: Fase 1, Chefe"
                      />
                    </div>
                  </div>

                  {/* Escala e Posição X / Y */}
                  <div className="space-y-2 pt-1 border-t border-zinc-800">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
                      <span>Escala do Marcador / Asset</span>
                      <div className="flex items-center gap-1 font-mono">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = selectedPoi.scale || 1.0;
                            updatePoi(selectedPoi.id, { scale: Math.max(0.2, parseFloat((cur - 0.25).toFixed(2))) });
                          }}
                          className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center font-bold"
                          title="Diminuir Escala"
                        >
                          -
                        </button>
                        <span className="font-mono text-amber-400 font-bold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                          {Math.round((selectedPoi.scale || 1.0) * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = selectedPoi.scale || 1.0;
                            updatePoi(selectedPoi.id, { scale: Math.min(6.0, parseFloat((cur + 0.25).toFixed(2))) });
                          }}
                          className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center font-bold"
                          title="Aumentar Escala"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="0.2"
                      max="6.0"
                      step="0.05"
                      value={selectedPoi.scale || 1.0}
                      onChange={(e) =>
                        updatePoi(selectedPoi.id, { scale: parseFloat(e.target.value) || 1.0 })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />

                    {/* Presets Rápidos de Escala (Até 600%) */}
                    <div className="grid grid-cols-6 gap-1 pt-0.5">
                      {[1.0, 1.5, 2.0, 3.0, 4.5, 6.0].map((sVal) => {
                        const pct = Math.round(sVal * 100);
                        const isCurrent = Math.abs((selectedPoi.scale || 1.0) - sVal) < 0.04;
                        return (
                          <button
                            key={`scale-preset-${pct}`}
                            type="button"
                            onClick={() => updatePoi(selectedPoi.id, { scale: sVal })}
                            className={`py-1 rounded text-[9.5px] font-bold font-mono transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                                : 'bg-zinc-850 hover:bg-zinc-750 text-zinc-300'
                            }`}
                          >
                            {pct}%
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[9px] text-zinc-400">X:</span>
                        <input
                          type="number"
                          value={selectedPoi.x}
                          onChange={(e) =>
                            updatePoi(selectedPoi.id, { x: parseInt(e.target.value) || 0 })
                          }
                          className="w-full bg-zinc-800 px-2 py-1 rounded text-xs text-white font-mono mt-0.5"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400">Y:</span>
                        <input
                          type="number"
                          value={selectedPoi.y}
                          onChange={(e) =>
                            updatePoi(selectedPoi.id, { y: parseInt(e.target.value) || 0 })
                          }
                          className="w-full bg-zinc-800 px-2 py-1 rounded text-xs text-white font-mono mt-0.5"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500 my-auto">
                  <Compass className="w-10 h-10 mx-auto mb-2 text-zinc-600" />
                  <p className="text-xs font-bold text-zinc-300">Nenhum Ponto Selecionado</p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Clique em um ponto no mapa ou no botão acima para adicionar um novo local.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Conteúdo da Aba 2: CAMADAS DO MAPA (LAYERS) */}
          {activeSidebarTab === 'layers' && (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">Camadas do Mapa Panorâmico</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Controle a visibilidade e transparência de cada camada gráfica do mapa múndi.
                </p>
              </div>

              {/* Presets Rápidos de Camadas */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    const newLayers = layers.map((l) => ({ ...l, visible: true, opacity: 1.0 }));
                    updateWorldMap({ layers: newLayers });
                    showToast('✓ Todas as camadas ativadas');
                  }}
                  className="py-1 px-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer text-center"
                >
                  🌟 Exibir Tudo 100%
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newLayers = layers.map((l) => {
                      if (l.id === 'pois') return { ...l, visible: true, opacity: 1.0 };
                      if (l.id === 'routes') return { ...l, visible: true, opacity: 0.85 };
                      if (l.id === 'background') return { ...l, visible: true, opacity: 0.35 };
                      return { ...l, visible: false };
                    });
                    updateWorldMap({ layers: newLayers });
                    showToast('📍 Foco nos Pontos de Interesse');
                  }}
                  className="py-1 px-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer text-center"
                >
                  📍 Foco em Pontos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newLayers = layers.map((l) => ({
                      ...l,
                      visible: l.id === 'background',
                      opacity: 1.0,
                    }));
                    updateWorldMap({ layers: newLayers });
                    showToast('🗺️ Exibindo apenas Imagem de Fundo');
                  }}
                  className="py-1 px-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer text-center"
                >
                  🗺️ Apenas Fundo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newLayers = layers.map((l) => ({
                      ...l,
                      visible: l.id === 'grid' || l.id === 'decorations' || l.id === 'routes' || l.id === 'background',
                      opacity: l.id === 'grid' ? 0.6 : 1.0,
                    }));
                    updateWorldMap({ layers: newLayers });
                    showToast('🧭 Modo Náutico & Cartografia');
                  }}
                  className="py-1 px-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer text-center"
                >
                  🧭 Modo Cartografia
                </button>
              </div>

              <div className="space-y-2">
                {layers.map((layer) => {
                  const isVis = layer.visible !== false;
                  return (
                    <div
                      key={layer.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isVis
                          ? 'bg-zinc-850 border-zinc-700/80 text-white'
                          : 'bg-zinc-950/60 border-zinc-850 text-zinc-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateLayer(layer.id, { visible: !isVis })}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isVis
                                ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                                : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                            }`}
                            title={isVis ? 'Ocultar camada' : 'Exibir camada'}
                          >
                            {isVis ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <div>
                            <span className="text-xs font-bold block leading-tight">{layer.name}</span>
                            <span className="text-[9px] text-zinc-400 font-mono">
                              {layer.id.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-zinc-400">
                          {Math.round((layer.opacity ?? 1.0) * 100)}%
                        </span>
                      </div>

                      {/* Slider de Opacidade */}
                      <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center gap-2">
                        <span className="text-[9px] text-zinc-400 shrink-0">Opacidade:</span>
                        <input
                          type="range"
                          min="0.0"
                          max="1.0"
                          step="0.05"
                          value={layer.opacity ?? 1.0}
                          onChange={(e) =>
                            updateLayer(layer.id, { opacity: parseFloat(e.target.value) || 0 })
                          }
                          className="flex-1 accent-indigo-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-[11px] text-zinc-400">
                <span className="font-bold text-indigo-400 block mb-0.5">💡 Dica de Camadas:</span>
                As alterações de visibilidade e opacidade sincronizam instantaneamente com o canvas de edição e com o emulador do jogador.
              </div>
            </div>
          )}

          {/* Conteúdo da Aba 3: MENU ATMOSFERA DO MAPA */}
          {activeSidebarTab === 'atmosphere' && (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Cloud className="w-4 h-4 text-cyan-400" />
                  <span>Atmosfera & Clima do Mapa</span>
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Adicione vida com nuvens em parallax, névoa dos vales e iluminação sobre o continente.
                </p>
              </div>

              {/* Seletor de Clima Rápido */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Condição Climática
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'clear', label: 'Céu Limpo', icon: Sun, color: '#f59e0b' },
                    { id: 'clouds', label: 'Nuvens Parallax', icon: Cloud, color: '#38bdf8' },
                    { id: 'fog', label: 'Névoa Mística', icon: CloudFog, color: '#94a3b8' },
                    { id: 'rain', label: 'Chuva Suave', icon: CloudRain, color: '#60a5fa' },
                    { id: 'snow', label: 'Neve de Inverno', icon: Snowflake, color: '#e0f2fe' },
                    { id: 'dawn', label: 'Alvorecer', icon: Sunset, color: '#f97316' },
                    { id: 'night', label: 'Noite Estrelada', icon: Moon, color: '#818cf8' },
                  ].map((w) => {
                    const IconComp = w.icon;
                    const isSel = atmosphere.weather === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => updateAtmosphere({ weather: w.id as any })}
                        className={`p-2 rounded-xl border flex items-center gap-2 text-left transition-all cursor-pointer ${
                          isSel
                            ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm'
                            : 'bg-zinc-850 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <IconComp className="w-4 h-4 shrink-0" style={{ color: w.color }} />
                        <span className="text-xs font-semibold">{w.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Controles de Nuvens */}
              <div className="p-3 bg-zinc-850 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-white">Nuvens Sobre o Mapa</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={atmosphere.cloudsEnabled !== false}
                    onChange={(e) => updateAtmosphere({ cloudsEnabled: e.target.checked })}
                    className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                  />
                </div>

                {atmosphere.cloudsEnabled !== false && (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
                        <span>Velocidade de Deslocamento</span>
                        <span className="font-mono text-cyan-400">
                          {atmosphere.cloudsSpeed || 30}s
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="70"
                        step="5"
                        value={atmosphere.cloudsSpeed || 30}
                        onChange={(e) =>
                          updateAtmosphere({ cloudsSpeed: parseInt(e.target.value) || 30 })
                        }
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
                        <span>Densidade / Opacidade das Nuvens</span>
                        <span className="font-mono text-cyan-400">
                          {Math.round((atmosphere.cloudsOpacity ?? 0.7) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={atmosphere.cloudsOpacity ?? 0.7}
                        onChange={(e) =>
                          updateAtmosphere({ cloudsOpacity: parseFloat(e.target.value) || 0.5 })
                        }
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Controles de Névoa */}
              <div className="p-3 bg-zinc-850 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CloudFog className="w-4 h-4 text-zinc-300" />
                    <span className="text-xs font-bold text-white">Névoa Rasteira dos Vales</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!atmosphere.fogEnabled}
                    onChange={(e) => updateAtmosphere({ fogEnabled: e.target.checked })}
                    className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                  />
                </div>

                {atmosphere.fogEnabled && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
                      <span>Opacidade da Névoa</span>
                      <span className="font-mono text-zinc-300">
                        {Math.round((atmosphere.fogOpacity ?? 0.35) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="0.8"
                      step="0.05"
                      value={atmosphere.fogOpacity ?? 0.35}
                      onChange={(e) =>
                        updateAtmosphere({ fogOpacity: parseFloat(e.target.value) || 0.3 })
                      }
                      className="w-full accent-zinc-400 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Tonalidade de Iluminação Global */}
              <div className="p-3 bg-zinc-850 rounded-xl border border-zinc-800 space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  <span>Iluminação do Continente</span>
                </span>
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[
                    { label: 'Neutro', tint: '#ffffff' },
                    { label: 'Ouro', tint: '#f59e0b' },
                    { label: 'Rubro', tint: '#dc2626' },
                    { label: 'Noite', tint: '#1e1b4b' },
                  ].map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => updateAtmosphere({ lightingTint: t.tint })}
                      className={`p-1.5 rounded-lg text-center border transition-all ${
                        atmosphere.lightingTint === t.tint
                          ? 'bg-amber-500/20 border-amber-400 text-white font-bold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full mx-auto mb-1 border border-white/20"
                        style={{ backgroundColor: t.tint }}
                      />
                      <span className="text-[9px] block">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo da Aba 4: FUNDO DO MAPA & DIMENSÕES */}
          {activeSidebarTab === 'background' && (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">Imagem de Fundo e Dimensões</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  A imagem PNG preenche 100% da tela na vertical e permite rolagem horizontal livre.
                </p>
              </div>

              {/* Upload de Imagem Própria */}
              <div className="p-4 bg-zinc-850 rounded-xl border border-zinc-800 text-center space-y-2">
                <Upload className="w-8 h-8 mx-auto text-amber-400" />
                <span className="text-xs font-bold text-white block">Importar Fundo PNG</span>
                <p className="text-[10px] text-zinc-400">
                  Carregue uma imagem do seu mundo (PNG, JPG ou WebP)
                </p>
                <button
                  type="button"
                  onClick={() => bgUploadInputRef.current?.click()}
                  className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Selecionar Arquivo no PC
                </button>
                <input
                  ref={bgUploadInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadBgFile}
                />
              </div>

              {/* Presets de Fundo Disponíveis */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Temas de Fundo Prontos
                </span>
                <div className="space-y-1.5">
                  {DEFAULT_WORLD_MAP_BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => updateWorldMap({ backgroundPng: bg.url })}
                      className={`w-full p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        worldMap.backgroundPng === bg.url
                          ? 'bg-amber-500/20 border-amber-400 text-white'
                          : 'bg-zinc-850 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <span className="text-xs font-semibold">{bg.name}</span>
                      {worldMap.backgroundPng === bg.url && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimensões Panorâmicas */}
              <div className="p-3 bg-zinc-850 rounded-xl border border-zinc-800 space-y-3">
                <span className="text-xs font-bold text-white block">Dimensões do Palco Panorâmico</span>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
                    <span>Largura Panorâmica</span>
                    <span className="font-mono text-amber-400">{mapW}px</span>
                  </div>
                  <input
                    type="range"
                    min="1200"
                    max="3600"
                    step="100"
                    value={mapW}
                    onChange={(e) => updateWorldMap({ mapWidth: parseInt(e.target.value) || 1600 })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
                    <span>Altura Vertical de Referência</span>
                    <span className="font-mono text-zinc-400">{mapH}px</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="1000"
                    step="20"
                    value={mapH}
                    onChange={(e) => updateWorldMap({ mapHeight: parseInt(e.target.value) || 667 })}
                    className="w-full accent-zinc-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Palco Central do Canvas Panorâmico */}
        <div
          ref={viewportRef}
          onMouseDown={handleCanvasMouseDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="order-first flex-1 h-full overflow-hidden relative cursor-grab active:cursor-grabbing bg-radial from-zinc-900 to-black select-none"
        >
          {/* Instruções Sutis no Canto Superior Esquerdo */}
          <div className="absolute top-3 left-4 z-20 pointer-events-none flex items-center gap-2 text-[11px] text-zinc-400 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-zinc-800 shadow-md">
            <Move className="w-3.5 h-3.5 text-amber-400" />
            <span>Arraste o mapa para navegar • Arraste os pontos para reposicionar</span>
          </div>

          {/* Banner Flutuante de Ação do Modo de Inserção Contínua com Ramificação */}
          {continuousMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-black/90 backdrop-blur-xl border border-amber-500/60 rounded-2xl px-4 py-2 shadow-2xl flex items-center gap-3 text-xs text-white animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="font-bold text-amber-300">Modo Trilha Contínua Ativo</span>
              </div>

              <div className="h-4 w-[1px] bg-zinc-700" />

              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-zinc-400">Ramificando de:</span>
                {activeParentPoiId ? (
                  <span className="font-extrabold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800 flex items-center gap-1">
                    <GitBranch className="w-3 h-3 text-emerald-400" />
                    <span>{worldMap.pointsOfInterest.find((p) => p.id === activeParentPoiId)?.name || 'Ponto Pai'}</span>
                  </span>
                ) : (
                  <span className="text-zinc-500 italic">Nenhum (Novo Ponto)</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveParentPoiId(null)}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-bold border border-zinc-700 transition-colors cursor-pointer"
                  title="Novo Ramo: O próximo clique criará um ponto sem conexão direta"
                >
                  Nova Ramificação
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (worldMap.pointsOfInterest.length > 0) {
                      const lastPoi = worldMap.pointsOfInterest[worldMap.pointsOfInterest.length - 1];
                      handleDeletePoi(lastPoi.id);
                    }
                  }}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-rose-900/60 text-zinc-300 hover:text-rose-200 text-[10px] font-bold border border-zinc-700 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Desfazer o último ponto adicionado"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Desfazer</span>
                </button>
              </div>

              <div className="h-4 w-[1px] bg-zinc-700" />

              {/* Seletor de Preset do Modo Contínuo */}
              <div className="flex items-center gap-1">
                {POI_ICONS_PRESETS.slice(0, 5).map((preset) => (
                  <button
                    key={`preset-quick-${preset.id}`}
                    type="button"
                    onClick={() => setContinuousPreset(preset.id)}
                    className={`p-1 rounded-md text-[11px] transition-all cursor-pointer ${
                      continuousPreset === preset.id
                        ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                    title={`Inserir como: ${preset.label}`}
                  >
                    <span>{preset.emoji}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Plano do Mapa com Zoom e Pan */}
          <div
            id="world-map-canvas-plane"
            onClick={handleContinuousCanvasClick}
            style={{
              width: `${mapW}px`,
              height: `${mapH}px`,
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
            className="absolute top-0 left-0 shadow-2xl rounded-xl border border-zinc-800 overflow-hidden select-none bg-black"
          >
            {/* Camada 1: Imagem de Fundo do Mapa (preenche na vertical) */}
            {isBgVisible && (
              <div
                className="absolute inset-0 pointer-events-none select-none transition-opacity duration-200"
                style={{ opacity: bgOpacity }}
              >
                {worldMap.backgroundPng ? (
                  <img
                    src={worldMap.backgroundPng}
                    alt="Mapa Fundo"
                    className="w-full h-full object-cover select-none pointer-events-none filter drop-shadow"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 p-8 text-center border-2 border-dashed border-zinc-800">
                    <Compass className="w-12 h-12 mb-2 text-zinc-700" />
                    <p className="text-sm font-semibold">Nenhuma imagem de fundo carregada</p>
                  </div>
                )}
              </div>
            )}

            {/* Camada 2: Rotas e Trilhas entre POIs com Suporte a Ramificações */}
            {isRoutesVisible && (
              <svg
                className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-200"
                style={{ width: `${mapW}px`, height: `${mapH}px`, opacity: routesOpacity }}
              >
                <defs>
                  <linearGradient id="editorRouteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
                  </linearGradient>
                </defs>

                {/* Coleta todos os pares de rotas encadeadas e ramificações */}
                {(() => {
                  const pairs: Array<{ from: WorldMapPOI; to: WorldMapPOI; id: string }> = [];

                  if (worldMap.routeConnections && worldMap.routeConnections.length > 0) {
                    worldMap.routeConnections.forEach((rc) => {
                      const f = worldMap.pointsOfInterest.find((p) => p.id === rc.fromId);
                      const t = worldMap.pointsOfInterest.find((p) => p.id === rc.toId);
                      if (f && t) pairs.push({ from: f, to: t, id: rc.id });
                    });
                  }

                  worldMap.pointsOfInterest.forEach((poi) => {
                    if (poi.parentId) {
                      const parent = worldMap.pointsOfInterest.find((p) => p.id === poi.parentId);
                      if (parent && !pairs.some((p) => p.from.id === parent.id && p.to.id === poi.id)) {
                        pairs.push({ from: parent, to: poi, id: `parent-${parent.id}-${poi.id}` });
                      }
                    }
                  });

                  if (pairs.length === 0) {
                    worldMap.pointsOfInterest.forEach((poi, idx) => {
                      const nextPoi = worldMap.pointsOfInterest[idx + 1];
                      if (nextPoi) pairs.push({ from: poi, to: nextPoi, id: `seq-${poi.id}-${nextPoi.id}` });
                    });
                  }

                  return pairs.map((pair) => {
                    const mx = (pair.from.x + pair.to.x) / 2;
                    const my = (pair.from.y + pair.to.y) / 2 - 25;

                    return (
                      <g key={`editor-path-${pair.id}`} className="transition-all duration-300">
                        {/* Camada 1: Valeta / Sombra profunda do caminho RPG */}
                        <path
                          d={`M ${pair.from.x} ${pair.from.y} Q ${mx} ${my} ${pair.to.x} ${pair.to.y}`}
                          fill="none"
                          stroke="#180e06"
                          strokeWidth={9}
                          strokeLinecap="round"
                          opacity={0.85}
                        />
                        {/* Camada 2: Borda de pergaminho/estrada de pedra dourada */}
                        <path
                          d={`M ${pair.from.x} ${pair.from.y} Q ${mx} ${my} ${pair.to.x} ${pair.to.y}`}
                          fill="none"
                          stroke="#b45309"
                          strokeWidth={6}
                          strokeLinecap="round"
                          opacity={0.9}
                        />
                        {/* Camada 3: Trilha de energia/pegadas luminosas com pontilhado de jogo */}
                        <path
                          d={`M ${pair.from.x} ${pair.from.y} Q ${mx} ${my} ${pair.to.x} ${pair.to.y}`}
                          fill="none"
                          stroke="#fef08a"
                          strokeWidth={3}
                          strokeDasharray="9,6"
                          strokeLinecap="round"
                          className="animate-pulse"
                        />
                        {/* Marcador de Passo intermediário da jornada RPG */}
                        <circle
                          cx={mx}
                          cy={my}
                          r={4.5}
                          fill="#f59e0b"
                          stroke="#78350f"
                          strokeWidth={2}
                          className="shadow-sm"
                        />
                        <circle cx={mx} cy={my} r={2} fill="#fef08a" />
                      </g>
                    );
                  });
                })()}

                {/* Linha Guia em Tempo Real no Modo Contínuo */}
                {continuousMode && activeParentPoiId && mouseMapPos && (() => {
                  const parentPoi = worldMap.pointsOfInterest.find((p) => p.id === activeParentPoiId);
                  if (!parentPoi) return null;
                  return (
                    <g key="live-continuous-guide-line">
                      <path
                        d={`M ${parentPoi.x} ${parentPoi.y} L ${mouseMapPos.x} ${mouseMapPos.y}`}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        strokeDasharray="5,5"
                        className="animate-pulse"
                      />
                      <circle
                        cx={mouseMapPos.x}
                        cy={mouseMapPos.y}
                        r={12}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="3,3"
                      />
                    </g>
                  );
                })()}
              </svg>
            )}

            {/* Camada 3: Pontos de Interesse (POIs) com PNGs */}
            {isPoisVisible && (
              <div
                className="absolute inset-0 pointer-events-none z-20 transition-opacity duration-200"
                style={{ opacity: poisOpacity }}
              >
                {worldMap.pointsOfInterest.map((poi) => {
                  const isSelected = poi.id === selectedPoiId;
                  const isParentNode = continuousMode && poi.id === activeParentPoiId;
                  const poiScale = poi.scale || 1.0;
                  const isLocked = poi.status === 'locked';
                  const isCompleted = poi.status === 'completed';

                  return (
                    <div
                      key={poi.id}
                      onPointerDown={(e) => handlePoiPointerDown(e, poi)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPoiId(poi.id);
                        if (continuousMode) {
                          setActiveParentPoiId(poi.id);
                          showToast(`🌿 Nó selecionado para ramificação: "${poi.name}"`);
                        } else {
                          setActiveSidebarTab('pois');
                        }
                      }}
                      style={{
                        left: `${poi.x}px`,
                        top: `${poi.y}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className={`absolute pointer-events-auto cursor-grab active:cursor-grabbing group select-none flex flex-col items-center transition-transform ${
                        isSelected ? 'z-30' : ''
                      }`}
                    >
                      {/* Anel Pulsante do Nó Origem da Ramificação no Modo Contínuo */}
                      {isParentNode && (
                        <div className="absolute -inset-4 rounded-full border-2 border-dashed border-amber-400 animate-spin opacity-85 pointer-events-none" />
                      )}

                      {/* Tag / Badge (Mantém tamanho fixo independente do zoom do mapa) */}
                      {poi.badgeText && (
                        <span
                          style={{
                            transform: `scale(${1 / Math.max(0.1, zoom)})`,
                            transformOrigin: 'bottom center',
                          }}
                          className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow-md mb-1 border border-amber-300"
                        >
                          {poi.badgeText}
                        </span>
                      )}

                      {/* Ícone PNG Puro do POI ou Ponto Invisível (Sem Container Box) */}
                      {poi.isInvisible ? (
                        <div
                          style={{
                            transform: `scale(${poiScale * (isSelected ? 1.1 : 1.0)})`,
                          }}
                          className={`w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center shadow-lg transition-all ${
                            isSelected
                              ? 'border-amber-400 bg-amber-500/20 text-amber-300 ring-2 ring-amber-400/50'
                              : 'border-zinc-500 bg-zinc-900/80 text-zinc-400 hover:border-amber-400 hover:text-white'
                          }`}
                          title={`Ponto Guia Invisível: ${poi.name}`}
                        >
                          <EyeOff className="w-4 h-4 text-amber-400" />
                        </div>
                      ) : (
                        <div className="relative flex flex-col items-center">
                          <div
                            style={{
                              transform: `scale(${poiScale * (isSelected ? 1.15 : 1.0)})`,
                              transformOrigin: 'bottom center',
                            }}
                            className="relative transition-transform group-hover: brightness-110"
                          >
                            {poi.iconPng ? (
                              <img
                                src={poi.iconPng}
                                alt={poi.name}
                                className={`w-14 h-14 object-contain select-none pointer-events-none transition-all ${
                                  isLocked
                                    ? 'filter grayscale(100%) contrast(110%) brightness(80%) drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)]'
                                    : 'filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)]'
                                }`}
                                draggable={false}
                              />
                            ) : (
                              <div
                                className={`text-4xl select-none transition-all ${
                                  isLocked
                                    ? 'filter grayscale(100%) brightness(80%) drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)]'
                                    : 'filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)]'
                                }`}
                              >
                                {poi.iconEmoji || '📍'}
                              </div>
                            )}

                            {/* Ícone de Cadeado em Destaque na Frente quando Bloqueado */}
                            {isLocked && (
                              <div className="absolute inset-0 flex items-center justify-center z-20">
                                {worldMap.customLockIconPng ? (
                                  <img
                                    src={worldMap.customLockIconPng}
                                    alt="Bloqueado"
                                    className="w-7 h-7 object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-black/90 border border-rose-500/80 text-rose-400 flex items-center justify-center shadow-lg">
                                    <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Cápsula na Frente e Inferior com Apenas o Nome do Ponto (Tamanho fixo no zoom) */}
                          <div
                            style={{
                              transform: `scale(${1 / Math.max(0.1, zoom)})`,
                              transformOrigin: 'top center',
                            }}
                            className={`mt-1 px-2.5 py-0.5 rounded-full bg-black/90 backdrop-blur-md border text-[10px] font-black shadow-lg whitespace-nowrap transition-colors ${
                              isSelected
                                ? 'border-amber-300 text-amber-300 bg-amber-950/90 ring-2 ring-amber-400/40'
                                : 'border-amber-400/50 text-amber-300'
                            }`}
                          >
                            {poi.name}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Camada 4: Decorações, Rosa dos Ventos & Título */}
            {isDecorationsVisible && (
              <div
                className="absolute inset-0 pointer-events-none z-25 transition-opacity duration-200"
                style={{ opacity: decorationsOpacity }}
              >
                {/* Rosa dos Ventos Náutica Decorativa no Canto Superior Direito */}
                <div className="absolute top-6 right-6 w-24 h-24 opacity-30 select-none">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3,3" />
                    <circle cx="50" cy="50" r="46" fill="none" stroke="#d97706" strokeWidth="0.8" />
                    <polygon points="50,10 54,46 50,42 46,46" fill="#fbbf24" />
                    <polygon points="50,90 54,54 50,58 46,54" fill="#d97706" />
                    <polygon points="90,50 54,54 58,50 54,46" fill="#d97706" />
                    <polygon points="10,50 46,54 42,50 46,46" fill="#d97706" />
                    <text x="50" y="8" fill="#fbbf24" fontSize="7" fontWeight="bold" textAnchor="middle">N</text>
                    <text x="50" y="98" fill="#d97706" fontSize="7" fontWeight="bold" textAnchor="middle">S</text>
                    <text x="96" y="52" fill="#d97706" fontSize="7" fontWeight="bold" textAnchor="start">L</text>
                    <text x="4" y="52" fill="#d97706" fontSize="7" fontWeight="bold" textAnchor="end">O</text>
                  </svg>
                </div>
              </div>
            )}

            {/* Camada 4.5: Grade Náutica & Coordenadas */}
            {isGridVisible && (
              <svg
                className="absolute inset-0 pointer-events-none z-15 transition-opacity duration-200"
                style={{ width: `${mapW}px`, height: `${mapH}px`, opacity: gridOpacity }}
              >
                <defs>
                  <pattern id="nauticalGridPattern" width="120" height="120" patternUnits="userSpaceOnUse">
                    <path d="M 120 0 L 0 0 0 120" fill="none" stroke="#fbbf24" strokeWidth="0.75" strokeDasharray="3,3" opacity="0.6" />
                    <circle cx="60" cy="60" r="1.5" fill="#f59e0b" opacity="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#nauticalGridPattern)" />
              </svg>
            )}

            {/* Camada 5: Atmosfera Viva do Mapa (Nuvens, Névoa, Noite, Alvorecer, Chuva, Neve) */}
            {isAtmoVisible && (
              <div
                className="absolute inset-0 pointer-events-none z-30 overflow-hidden transition-opacity duration-300"
                style={{ opacity: atmoOpacity }}
              >
                {/* Nuvens Flutuantes Parallax Contínuas */}
                {atmosphere.cloudsEnabled !== false && atmosphere.weather !== 'clear' && (
                  <div className="absolute inset-0 overflow-hidden">
                    <div
                      className="absolute inset-0 flex"
                      style={{
                        animation: `worldMapCloudsDrift ${atmosphere.cloudsSpeed || 30}s linear infinite`,
                        width: '200%',
                      }}
                    >
                      <div className="w-1/2 h-full relative" style={{ opacity: atmosphere.cloudsOpacity ?? 0.7 }}>
                        <img src={DEFAULT_CLOUD_SVG} alt="" className="absolute top-10 left-[10%] w-[420px] object-contain filter drop-shadow" />
                        <img src={DEFAULT_CLOUD_SVG} alt="" className="absolute top-48 left-[55%] w-[480px] object-contain filter drop-shadow" />
                        <img src={DEFAULT_CLOUD_SVG} alt="" className="absolute bottom-12 left-[25%] w-[380px] object-contain filter drop-shadow" />
                      </div>
                      <div className="w-1/2 h-full relative" style={{ opacity: atmosphere.cloudsOpacity ?? 0.7 }}>
                        <img src={DEFAULT_CLOUD_SVG} alt="" className="absolute top-10 left-[10%] w-[420px] object-contain filter drop-shadow" />
                        <img src={DEFAULT_CLOUD_SVG} alt="" className="absolute top-48 left-[55%] w-[480px] object-contain filter drop-shadow" />
                        <img src={DEFAULT_CLOUD_SVG} alt="" className="absolute bottom-12 left-[25%] w-[380px] object-contain filter drop-shadow" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Efeito de Chuva Suave sobre o Mapa */}
                {atmosphere.weather === 'rain' && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                    <div
                      className="w-full h-[200%]"
                      style={{
                        backgroundImage: `repeating-linear-gradient(105deg, transparent, transparent 18px, rgba(147, 197, 253, 0.45) 19px, transparent 20px)`,
                        animation: 'worldMapRainDrift 0.8s linear infinite',
                      }}
                    />
                  </div>
                )}

                {/* Efeito de Neve de Inverno sobre o Mapa */}
                {atmosphere.weather === 'snow' && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
                    <div
                      className="w-full h-[200%]"
                      style={{
                        backgroundImage: `radial-gradient(circle, #ffffff 1.5px, transparent 1.6px), radial-gradient(circle, #e0f2fe 1px, transparent 1.1px)`,
                        backgroundSize: '80px 80px, 120px 120px',
                        animation: 'worldMapSnowDrift 4s linear infinite',
                      }}
                    />
                  </div>
                )}

                {/* Névoa Rasteira sobre o Continente */}
                {atmosphere.fogEnabled && (
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-white/10 via-white/5 to-transparent mix-blend-screen"
                    style={{ opacity: atmosphere.fogOpacity ?? 0.35 }}
                  >
                    <img
                      src={DEFAULT_FOG_SVG}
                      alt=""
                      className="w-full h-full object-cover animate-pulse duration-[6000ms]"
                    />
                  </div>
                )}

                {/* Clima: Noite Estrelada */}
                {atmosphere.weather === 'night' && (
                  <div className="absolute inset-0 bg-slate-950/45 mix-blend-multiply transition-all duration-700" />
                )}

                {/* Clima: Alvorecer Dourado */}
                {atmosphere.weather === 'dawn' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-rose-500/10 mix-blend-screen transition-all duration-700" />
                )}

                {/* Iluminação Personalizada Global */}
                {atmosphere.lightingTint && atmosphere.lightingTint !== '#ffffff' && (
                  <div
                    className="absolute inset-0 mix-blend-color pointer-events-none"
                    style={{
                      backgroundColor: atmosphere.lightingTint,
                      opacity: atmosphere.lightingOpacity ?? 0.3,
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE GERENCIAMENTO DE MÚLTIPLOS MAPAS */}
      {showMapManagerModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 pointer-events-auto"
          onClick={() => setShowMapManagerModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-zinc-900 border border-zinc-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="px-5 py-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Gerenciador de Múltiplos Mapas</h3>
                  <p className="text-[11px] text-zinc-400">
                    Crie, alterne, duplique e gerencie os mapas do reino do seu projeto.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMapManagerModal(false)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ações do Gerenciador */}
            <div className="p-4 bg-zinc-950/60 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300">
                Mapas Cadastrados ({savedWorldMaps.length})
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCreateNewMap}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Criar Novo Mapa</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveCurrentMap}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Mapa Atual</span>
                </button>
              </div>
            </div>

            {/* Lista de Mapas Salvos */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {savedWorldMaps.map((m, idx) => {
                const isActive = (worldMap.id || 'map-main-default') === m.id;

                return (
                  <div
                    key={m.id || `map-item-${idx}`}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                      isActive
                        ? 'bg-indigo-950/40 border-indigo-500/80 ring-1 ring-indigo-500/50'
                        : 'bg-zinc-850/80 border-zinc-750 hover:bg-zinc-850'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      {/* Miniatura do Mapa */}
                      <div className="w-16 h-12 rounded-lg bg-zinc-950 border border-zinc-700 overflow-hidden relative shrink-0">
                        {m.backgroundPng ? (
                          <img
                            src={m.backgroundPng}
                            alt={m.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            <Compass className="w-5 h-5" />
                          </div>
                        )}
                        {isActive && (
                          <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-indigo-500 text-white text-[8px] font-black uppercase tracking-wider">
                            Ativo
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate">
                            {m.title || `Mapa #${idx + 1}`}
                          </h4>
                          {isActive && (
                            <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-800">
                              Em Edição
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {m.description || 'Mapa panorâmico interativo.'}
                        </p>
                        <span className="text-[9px] font-mono text-zinc-500 block mt-1">
                          📍 {m.pointsOfInterest?.length || 0} Locais • Atualizado em{' '}
                          {m.updatedAt ? new Date(m.updatedAt).toLocaleDateString('pt-BR') : 'Hoje'}
                        </span>
                      </div>
                    </div>

                    {/* Botões de Ação do Mapa */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => handleSwitchMap(m.id!)}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          Ativar
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDuplicateMap(m)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        title="Duplicar este Mapa"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {savedWorldMaps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMap(m.id!)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-900/60 text-zinc-400 hover:text-rose-200 transition-colors cursor-pointer"
                          title="Excluir este Mapa"
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

      {/* Estilos de Animação de Nuvens, Chuva e Neve */}
      <style>{`
        @keyframes worldMapCloudsDrift {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes worldMapRainDrift {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
        @keyframes worldMapSnowDrift {
          0% { transform: translateY(-50%) translateX(-10px); }
          50% { transform: translateY(-25%) translateX(10px); }
          100% { transform: translateY(0) translateX(-10px); }
        }
      `}</style>
    </div>
  );
};
