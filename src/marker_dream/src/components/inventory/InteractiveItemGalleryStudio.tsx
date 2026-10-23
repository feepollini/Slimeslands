import React, { useRef, useState, useMemo } from 'react';
import type {
  MapProject,
  GalleryAsset,
  InventoryItemDefinition,
  PlayerConfig,
  MapMarker,
  PlayerInventoryConfig,
  InventoryItemAction,
  ItemStateTag,
  ItemCurrencyType,
} from '../../types/map';
import {
  FolderOpen,
  Plus,
  Trash2,
  Package,
  Upload,
  Search,
  Zap,
  X,
  Check,
  Database,
  Crosshair,
  RotateCcw,
  Swords,
  Heart,
  ChevronDown,
  ChevronUp,
  Maximize2,
  BookOpen,
  Coins,
  Trees,
  Tag,
} from 'lucide-react';
import { readUploadedImage } from '../../utils/tileGenerator';
import {
  getOrCreatePlayerInventory,
  ITEM_STATE_TAGS_METADATA,
  ITEM_CURRENCIES_METADATA,
  getCurrencyMeta,
  resolveItemStateTags,
} from '../../utils/inventoryHelpers';
import { InventoryManagerStudio } from './InventoryManagerStudio';

interface Props {
  project: MapProject;
  selectedCharacter?: PlayerConfig;
  player?: PlayerConfig;
  onUpdateProject: (updates: Partial<MapProject>) => void;
  onUpdateCurrentCharacter?: (updates: Partial<PlayerConfig>) => void;
  onCenterCameraOnPlayer?: () => void;
  showToast?: (msg: string) => void;
  compactMode?: boolean;
  initialTab?: 'acervo' | 'test_spawn' | 'catalogo' | 'mochila';
  onOpenFullInventoryEditor?: () => void;
}

const ALL_ITEM_ACTIONS: { id: InventoryItemAction; label: string }[] = [
  { id: 'use', label: '🧪 Usar / Consumir' },
  { id: 'equip', label: '⚔️ Equipar' },
  { id: 'read', label: '📖 Ler (Livro/Carta)' },
  { id: 'inspect', label: '🔍 Inspecionar' },
  { id: 'drop', label: '🗑️ Descartar' },
  { id: 'deliver', label: '🎁 Entregar (Quest)' },
];

const UNIVERSAL_BIOME_PRESETS: { id: string; name: string; color: string; emoji: string }[] = [
  { id: 'forest', name: 'Floresta / Bosque', color: '#10b981', emoji: '🌲' },
  { id: 'grass', name: 'Planície / Gramado', color: '#22c55e', emoji: '🌿' },
  { id: 'snow', name: 'Neve / Tundra Glacial', color: '#38bdf8', emoji: '❄️' },
  { id: 'desert', name: 'Deserto / Dunas', color: '#f59e0b', emoji: '🏜️' },
  { id: 'swamp', name: 'Pântano / Mangue', color: '#84cc16', emoji: '🐸' },
  { id: 'mountain', name: 'Montanha / Rocha', color: '#94a3b8', emoji: '⛰️' },
  { id: 'dungeon', name: 'Masmorra / Ruínas', color: '#a855f7', emoji: '🏰' },
  { id: 'volcano', name: 'Vulcânico / Cinzas', color: '#ef4444', emoji: '🌋' },
];

export const InteractiveItemGalleryStudio: React.FC<Props> = ({
  project,
  selectedCharacter: propSelectedCharacter,
  player,
  onUpdateProject,
  onCenterCameraOnPlayer,
  showToast = () => {},
  initialTab = 'acervo',
  onOpenFullInventoryEditor,
}) => {
  const selectedCharacter = propSelectedCharacter || player || project.player;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const modalPngInputRef = useRef<HTMLInputElement>(null);

  const [mainSubTab, setMainSubTab] = useState<'acervo' | 'test_spawn' | 'catalogo' | 'mochila'>(initialTab);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStateTagFilter, setActiveStateTagFilter] = useState<ItemStateTag | 'all'>('all');

  // Estado da Ficha Retrátil no Próprio Card (Accordion inline)
  const [expandedCardKey, setExpandedCardKey] = useState<string | null>(null);
  const [inlineDraft, setInlineDraft] = useState<InventoryItemDefinition | null>(null);

  // Estado do Modo Avançado em Pop-up Maior Dedicado
  const [editingItem, setEditingItem] = useState<InventoryItemDefinition | null>(null);
  const [advancedModalTab, setAdvancedModalTab] = useState<
    'geral' | 'bioma_spawn' | 'economia' | 'atributos' | 'leitura_quests'
  >('geral');

  // Parâmetros do Laboratório Test Spawn
  const [spawnRadius, setSpawnRadius] = useState<number>(75);
  const [manualSpawnCount, setManualSpawnCount] = useState<number>(1);
  const [selectedBiomeFilterForSpawn, setSelectedBiomeFilterForSpawn] = useState<string>('all');

  const playerInventory: PlayerInventoryConfig = getOrCreatePlayerInventory(project);

  // Lista combinada de Biomas da Fase Atual + Biomas Universais para o Seletor de Biomas
  const availableBiomesForSelector = useMemo(() => {
    const mapBiomes = (project.biomes || []).map((b) => ({
      id: b.id,
      name: `${b.name} (Fase Atual)`,
      shortName: b.name,
      color: b.color || '#10b981',
      emoji: '🗺️',
      isPhaseBiome: true,
    }));

    const existingIds = new Set(mapBiomes.map((b) => b.id));
    const extras = UNIVERSAL_BIOME_PRESETS.filter((u) => !existingIds.has(u.id)).map((u) => ({
      id: u.id,
      name: u.name,
      shortName: u.name.split('/')[0].trim(),
      color: u.color,
      emoji: u.emoji,
      isPhaseBiome: false,
    }));

    return [...mapBiomes, ...extras];
  }, [project.biomes]);

  // Marcadores de Test Spawn e Spawn Natural atualmente ativos no mapa
  const activeTestSpawnMarkers = useMemo(
    () =>
      (project.markers || []).filter(
        (m) =>
          m.id.startsWith('marker-collectible-spawn-') ||
          m.id.startsWith('marker-biome-natural-spawn-')
      ),
    [project.markers]
  );

  // Alterna uma Tag de Estado dentro de um rascunho de item (sincronizando ações e flags)
  const toggleStateTagOnItem = (
    draft: InventoryItemDefinition,
    tag: ItemStateTag
  ): InventoryItemDefinition => {
    const currentTags = resolveItemStateTags(draft);
    const hasTag = currentTags.includes(tag);
    const nextTags = hasTag ? currentTags.filter((t) => t !== tag) : [...currentTags, tag];

    const currentActions = new Set<InventoryItemAction>(draft.usableActions || ['inspect']);
    if (!hasTag) {
      if (tag === 'consumable') currentActions.add('use');
      if (tag === 'equipable') currentActions.add('equip');
      if (tag === 'deliverable') currentActions.add('deliver');
      if (tag === 'storable') currentActions.add('drop');
    } else {
      if (tag === 'consumable') currentActions.delete('use');
      if (tag === 'equipable') currentActions.delete('equip');
      if (tag === 'deliverable') currentActions.delete('deliver');
    }

    const nextNaturalBiomeSpawn =
      tag === 'natural_biome_spawn'
        ? {
            enabled: !hasTag,
            biomeIds:
              draft.naturalBiomeSpawn?.biomeIds && draft.naturalBiomeSpawn.biomeIds.length > 0
                ? draft.naturalBiomeSpawn.biomeIds
                : project.biomes?.[0]?.id
                ? [project.biomes[0].id]
                : ['forest'],
            spawnDensityPerBiome: draft.naturalBiomeSpawn?.spawnDensityPerBiome ?? 3,
            spawnChancePercent: draft.naturalBiomeSpawn?.spawnChancePercent ?? 80,
            avoidPaths: draft.naturalBiomeSpawn?.avoidPaths ?? true,
          }
        : draft.naturalBiomeSpawn;

    return {
      ...draft,
      stateTags: nextTags,
      usableActions: Array.from(currentActions),
      naturalBiomeSpawn: nextNaturalBiomeSpawn,
    };
  };

  // Alterna um Bioma específico na lista de Spawn Natural do Item
  const toggleBiomeOnItem = (
    draft: InventoryItemDefinition,
    biomeId: string
  ): InventoryItemDefinition => {
    const currentBiomes = draft.naturalBiomeSpawn?.biomeIds || [];
    const exists = currentBiomes.includes(biomeId);
    const nextBiomes = exists
      ? currentBiomes.filter((id) => id !== biomeId)
      : [...currentBiomes, biomeId];

    const currentTags = new Set<ItemStateTag>(resolveItemStateTags(draft));
    if (nextBiomes.length > 0) {
      currentTags.add('natural_biome_spawn');
    }

    return {
      ...draft,
      stateTags: Array.from(currentTags),
      naturalBiomeSpawn: {
        enabled: nextBiomes.length > 0,
        biomeIds: nextBiomes,
        spawnDensityPerBiome: draft.naturalBiomeSpawn?.spawnDensityPerBiome ?? 3,
        spawnChancePercent: draft.naturalBiomeSpawn?.spawnChancePercent ?? 85,
        avoidPaths: draft.naturalBiomeSpawn?.avoidPaths ?? true,
      },
    };
  };

  // Processa lista de arquivos (de Pasta, Multi-PNG ou Drag & Drop) com auto-registro em massa
  const processBulkFilesImport = async (files: FileList | File[], sourceLabel: string) => {
    if (!files || files.length === 0) return;

    setIsImporting(true);
    const newAssets: GalleryAsset[] = [];
    const newCatalogItems: InventoryItemDefinition[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp|svg)$/i.test(file.name);
      if (!isImg) continue;

      try {
        const { dataUrl, width, height } = await readUploadedImage(file);
        const cleanName = file.name.replace(/\.[^/.]+$/, '').trim() || `Item #${i + 1}`;
        const assetId = `asset-item-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;

        const asset: GalleryAsset = {
          id: assetId,
          name: cleanName,
          dataUrl,
          width,
          height,
          category: 'Itens de Inventário/Exploração',
          createdAt: new Date().toISOString(),
          isPersistentPhaseAsset: true,
        };

        const catalogItem: InventoryItemDefinition = {
          id: `item-${assetId}`,
          name: cleanName,
          iconPng: dataUrl,
          iconEmoji: '📦',
          shortDescription: `Item interativo auto-registrado via ${sourceLabel}.`,
          category: 'collectible',
          rarity: 'common',
          stackable: true,
          maxStack: 99,
          buyPrice: 50,
          sellPrice: 25,
          currencyType: 'gold',
          stateTags: ['collectible', 'storable', 'tradable', 'buyable'],
          naturalBiomeSpawn: {
            enabled: false,
            biomeIds: project.biomes?.[0]?.id ? [project.biomes[0].id] : ['forest'],
            spawnDensityPerBiome: 3,
            spawnChancePercent: 80,
            avoidPaths: true,
          },
          usableActions: ['use', 'inspect', 'drop'],
          consumableEffect: { hpRestore: 20, manaRestore: 0 },
          equipmentStats: { slot: 'weapon', attack: 10, defense: 5, speed: 0 },
        };

        newAssets.push(asset);
        newCatalogItems.push(catalogItem);
      } catch (err) {
        console.warn('Erro ao importar arquivo em massa:', file.name, err);
      }
    }

    if (newAssets.length > 0) {
      const existingAssets = project.galleryAssets || [];
      const existingCatalog = project.itemCatalog || [];

      onUpdateProject({
        galleryAssets: [...newAssets, ...existingAssets],
        itemCatalog: [...newCatalogItems, ...existingCatalog],
      });

      showToast(`📦 ${newAssets.length} itens importados em massa e auto-registrados no projeto!`);
    } else {
      showToast('⚠️ Nenhuma imagem PNG/JPG/WebP válida encontrada na seleção.');
    }

    setIsImporting(false);
  };

  // 1. IMPORTAÇÃO DE PASTA LOCAL COMPLETA
  const handleConnectFolder = () => {
    setIsImporting(false);
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
      folderInputRef.current.click();
    }
  };

  const handleFolderInputFallback = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processBulkFilesImport(files, 'importação de pasta');
    }
    e.target.value = '';
  };

  // 2. IMPORTAÇÃO DE PNGS MULTI-SELECIONADOS
  const handleMassPngUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processBulkFilesImport(files, 'importação em massa de PNGs');
    }
    e.target.value = '';
  };

  // 2.5 DRAG & DROP EM MASSA
  const handleDropFiles = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processBulkFilesImport(e.dataTransfer.files, 'Drag & Drop em massa');
    }
  };

  // 3. SISTEMA DE TEST SPAWN MANUAL (1 A 1) E EM ANEL AO REDOR DO PERSONAGEM
  const handleSpawnItemNearPlayer = (
    itemName: string,
    itemDataUrl?: string,
    itemEmoji?: string,
    qtyToSpawn: number = manualSpawnCount
  ) => {
    const px = project.player?.x ?? selectedCharacter?.x ?? 384;
    const py = project.player?.y ?? selectedCharacter?.y ?? 100;
    const count = Math.max(1, Math.min(12, qtyToSpawn));

    const newMarkers: MapMarker[] = [];
    for (let i = 0; i < count; i++) {
      const baseAngle = count === 1 ? Math.random() * Math.PI * 2 : (i * 2 * Math.PI) / count;
      const jitter = count === 1 ? 0 : (Math.random() - 0.5) * 0.25;
      const angle = baseAngle + jitter;
      const dist = spawnRadius + (Math.random() - 0.5) * 14;
      const spawnX = Math.max(
        24,
        Math.min((project.mapWidth || 768) - 24, Math.round(px + Math.cos(angle) * dist))
      );
      const spawnY = Math.max(24, Math.round(py + Math.sin(angle) * dist));

      newMarkers.push({
        id: `marker-collectible-spawn-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        name: itemName,
        description: 'Item interativo gerado pelo Modo Test Spawn.',
        type: 'collectible',
        color: '#f59e0b',
        status: 'discovered',
        x: spawnX,
        y: spawnY,
        size: 56,
        customIconPng: itemDataUrl,
        questResource: {
          id: `res-${Date.now()}-${i}`,
          name: itemName,
          iconEmoji: itemEmoji || '📦',
          iconPng: itemDataUrl,
        },
        questRequiredAmount: 1,
        solidCollision: false,
        hasShadow: true,
      });
    }

    onUpdateProject({
      markers: [...(project.markers || []), ...newMarkers],
    });

    onCenterCameraOnPlayer?.();
    showToast(
      `⚡ Test Spawn Manual: ${count}x "${itemName}" criado(s) a ~${spawnRadius}px do herói!`
    );
  };

  // 4. GERADOR DE SPAWN NATURAL POR BIOMA NA FASE ATUAL
  const handleGenerateNaturalBiomeSpawns = (specificItem?: InventoryItemDefinition) => {
    const itemsToProcess = specificItem
      ? [specificItem]
      : (project.itemCatalog || []).filter(
          (it) =>
            resolveItemStateTags(it).includes('natural_biome_spawn') ||
            it.naturalBiomeSpawn?.enabled
        );

    if (itemsToProcess.length === 0) {
      showToast(
        '⚠️ Nenhum item possui a tag "🌿 Spawn Bioma" ativa. Marque a tag de Spawn Natural por Bioma em um ou mais itens primeiro!'
      );
      return;
    }

    const strips = project.strips || [];
    const tileSize = project.tileSize || 64;
    const mapWidth = project.mapWidth || 768;
    const mapHeight = Math.max(project.mapHeight || 1600, strips.length * tileSize || 1200);
    const biomesById = new Map((project.biomes || []).map((b) => [b.id, b]));

    const generatedMarkers: MapMarker[] = [];

    for (const item of itemsToProcess) {
      const cfg = item.naturalBiomeSpawn;
      const targetBiomeIds = cfg?.biomeIds || [];
      const density = Math.max(1, Math.min(12, cfg?.spawnDensityPerBiome ?? 3));
      const chance = Math.max(5, Math.min(100, cfg?.spawnChancePercent ?? 85));
      const avoidPaths = cfg?.avoidPaths ?? true;

      // Encontra todas as faixas (strips) da fase que correspondem aos biomas selecionados
      const matchingStripIndices: number[] = [];
      strips.forEach((st, idx) => {
        if (
          selectedBiomeFilterForSpawn !== 'all' &&
          st.biomeId !== selectedBiomeFilterForSpawn
        ) {
          return;
        }
        const biomeObj = biomesById.get(st.biomeId);
        const biomeNameLower = (biomeObj?.name || '').toLowerCase();

        const isDirectMatch = targetBiomeIds.includes(st.biomeId);
        const isSemanticMatch = targetBiomeIds.some((bId) => {
          if (bId === 'forest' && (biomeNameLower.includes('floresta') || biomeNameLower.includes('bosque') || biomeNameLower.includes('mata'))) return true;
          if (bId === 'grass' && (biomeNameLower.includes('planície') || biomeNameLower.includes('grama') || biomeNameLower.includes('campo'))) return true;
          if (bId === 'snow' && (biomeNameLower.includes('neve') || biomeNameLower.includes('gelo') || biomeNameLower.includes('glacial'))) return true;
          if (bId === 'desert' && (biomeNameLower.includes('deserto') || biomeNameLower.includes('areia') || biomeNameLower.includes('duna'))) return true;
          if (bId === 'swamp' && (biomeNameLower.includes('pântano') || biomeNameLower.includes('mangue'))) return true;
          if (bId === 'mountain' && (biomeNameLower.includes('montanha') || biomeNameLower.includes('rocha') || biomeNameLower.includes('pedra'))) return true;
          if (bId === 'dungeon' && (biomeNameLower.includes('masmorra') || biomeNameLower.includes('ruína') || biomeNameLower.includes('caverna'))) return true;
          return false;
        });

        if (isDirectMatch || isSemanticMatch || targetBiomeIds.length === 0) {
          matchingStripIndices.push(idx);
        }
      });

      // Se a fase não tiver faixas daquele bioma específico (ou se o filtro permitir), distribui em regiões naturais da fase
      const effectiveRegions =
        matchingStripIndices.length > 0
          ? matchingStripIndices.slice(0, 6)
          : [Math.floor(strips.length * 0.2), Math.floor(strips.length * 0.5), Math.floor(strips.length * 0.8)];

      for (const stripIdx of effectiveRegions) {
        if (Math.random() * 100 > chance) continue;

        for (let d = 0; d < density; d++) {
          let spawnX = Math.round(48 + Math.random() * (mapWidth - 96));
          if (avoidPaths && Math.abs(spawnX - mapWidth / 2) < 75) {
            spawnX = spawnX < mapWidth / 2 ? Math.max(48, spawnX - 95) : Math.min(mapWidth - 48, spawnX + 95);
          }

          const baseStripY =
            strips.length > 0
              ? stripIdx * tileSize + Math.random() * tileSize
              : Math.random() * (mapHeight - 120) + 60;
          const spawnY = Math.max(36, Math.min(mapHeight - 36, Math.round(baseStripY)));

          const stripBiome = strips[stripIdx] ? biomesById.get(strips[stripIdx].biomeId) : undefined;

          generatedMarkers.push({
            id: `marker-biome-natural-spawn-${Date.now()}-${item.id}-${stripIdx}-${d}-${Math.random().toString(36).slice(2, 5)}`,
            name: item.name,
            description: `Spawn Natural no Bioma ${stripBiome?.name || 'da Fase'}`,
            type: 'collectible',
            color: stripBiome?.color || '#10b981',
            status: 'discovered',
            x: spawnX,
            y: spawnY,
            size: 54,
            customIconPng: item.iconPng,
            questResource: {
              id: `res-biome-${item.id}-${d}`,
              name: item.name,
              iconEmoji: item.iconEmoji || '🌿',
              iconPng: item.iconPng,
            },
            questRequiredAmount: 1,
            solidCollision: false,
            hasShadow: true,
          });
        }
      }
    }

    if (generatedMarkers.length === 0) {
      showToast('⚠️ Nenhum ponto de spawn foi gerado (verifique a % de chance ou o filtro de bioma).');
      return;
    }

    onUpdateProject({
      markers: [...(project.markers || []), ...generatedMarkers],
    });

    showToast(
      `🌿 Spawn Natural por Bioma: ${generatedMarkers.length} itens distribuídos nos biomas da fase!`
    );
  };

  // Filtra galeria para exibir itens de inventário e marcadores interativos
  const interactiveAssets = useMemo(() => {
    return (project.galleryAssets || []).filter((a) => {
      const isInteractiveCat =
        a.category === 'Itens de Inventário/Exploração' ||
        a.category === 'Inventário' ||
        a.category === 'Itens' ||
        a.category === 'Exploração' ||
        a.category === 'Marcadores' ||
        a.category === 'Imports';

      if (!isInteractiveCat) return false;
      const matchesSearch = !searchQuery.trim() || a.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (activeStateTagFilter !== 'all') {
        const regDef = (project.itemCatalog || []).find(
          (it) => it.name === a.name || it.iconPng === a.dataUrl
        );
        const tags = resolveItemStateTags(regDef);
        if (!tags.includes(activeStateTagFilter)) return false;
      }

      return true;
    });
  }, [project.galleryAssets, project.itemCatalog, searchQuery, activeStateTagFilter]);

  // Lista unificada para o Spawn Manual 1 a 1 (une Catálogo Central + Acervo + Itens da Mochila)
  const unifiedTestableItems = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        iconPng?: string;
        iconEmoji?: string;
        rarity: string;
        category: string;
        shortDescription?: string;
        catalogDef?: InventoryItemDefinition;
      }
    >();

    for (const catItem of project.itemCatalog || []) {
      const key = catItem.name.toLowerCase().trim();
      map.set(key, {
        id: catItem.id,
        name: catItem.name,
        iconPng: catItem.iconPng,
        iconEmoji: catItem.iconEmoji || '📦',
        rarity: catItem.rarity || 'common',
        category: catItem.category || 'collectible',
        shortDescription: catItem.shortDescription,
        catalogDef: catItem,
      });
    }

    for (const asset of project.galleryAssets || []) {
      const isInteractiveCat =
        asset.category === 'Itens de Inventário/Exploração' ||
        asset.category === 'Inventário' ||
        asset.category === 'Itens' ||
        asset.category === 'Exploração';
      if (!isInteractiveCat) continue;

      const key = asset.name.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, {
          id: asset.id,
          name: asset.name,
          iconPng: asset.dataUrl,
          iconEmoji: '📦',
          rarity: 'common',
          category: 'collectible',
          shortDescription: 'Asset interativo pronto para coleta.',
        });
      }
    }

    for (const invItem of playerInventory.items || []) {
      const key = invItem.name.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, {
          id: invItem.id,
          name: invItem.name,
          iconPng: invItem.iconPng,
          iconEmoji: invItem.iconEmoji || '📦',
          rarity: invItem.rarity || 'common',
          category: invItem.type || 'collectible',
          shortDescription: invItem.description,
        });
      }
    }

    let list = Array.from(map.values());
    if (searchQuery.trim()) {
      list = list.filter((it) => it.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (activeStateTagFilter !== 'all') {
      list = list.filter((it) =>
        resolveItemStateTags(it.catalogDef).includes(activeStateTagFilter)
      );
    }
    return list;
  }, [project.itemCatalog, project.galleryAssets, playerInventory.items, searchQuery, activeStateTagFilter]);

  // Auto Test Spawn em Anel: Spawna todos os itens em um círculo 360° ao redor do personagem
  const handleAutoTestSpawnAll = () => {
    const pool = unifiedTestableItems;
    if (pool.length === 0) {
      showToast('⚠️ Importe ou crie primeiro alguns itens para executar o Test Spawn em Anel.');
      return;
    }

    const px = project.player?.x ?? selectedCharacter?.x ?? 384;
    const py = project.player?.y ?? selectedCharacter?.y ?? 100;

    const count = pool.length;
    const effectiveRadius = Math.max(spawnRadius, 60 + Math.min(count * 6, 110));

    const spawnedMarkers: MapMarker[] = pool.map((item, i) => {
      const angle = (i * 2 * Math.PI) / count;
      const spawnX = Math.max(
        24,
        Math.min((project.mapWidth || 768) - 24, Math.round(px + Math.cos(angle) * effectiveRadius))
      );
      const spawnY = Math.max(24, Math.round(py + Math.sin(angle) * effectiveRadius));

      return {
        id: `marker-collectible-spawn-ring-${Date.now()}-${i}`,
        name: item.name,
        description: item.shortDescription || 'Item interativo gerado por Test Spawn em Anel.',
        type: 'collectible',
        color: '#f59e0b',
        status: 'discovered',
        x: spawnX,
        y: spawnY,
        size: 56,
        customIconPng: item.iconPng,
        questResource: {
          id: `res-${item.id}`,
          name: item.name,
          iconEmoji: item.iconEmoji || '📦',
          iconPng: item.iconPng,
        },
        questRequiredAmount: 1,
        solidCollision: false,
        hasShadow: true,
      };
    });

    onUpdateProject({
      markers: [...(project.markers || []), ...spawnedMarkers],
    });

    onCenterCameraOnPlayer?.();
    showToast(`⚡ Test Spawn em Anel: ${count} itens gerados ao redor do herói (${effectiveRadius}px)!`);
  };

  // Limpa todos os marcadores de Test Spawn e Spawn Natural do mapa
  const handleClearTestSpawns = () => {
    if (activeTestSpawnMarkers.length === 0) {
      showToast('Nenhum item de Test Spawn ativo no mapa no momento.');
      return;
    }
    const remaining = (project.markers || []).filter(
      (m) =>
        !m.id.startsWith('marker-collectible-spawn-') &&
        !m.id.startsWith('marker-biome-natural-spawn-')
    );
    onUpdateProject({ markers: remaining });
    showToast(`🧹 ${activeTestSpawnMarkers.length} spawns de teste removidos do mapa!`);
  };

  // Adiciona um item diretamente à mochila do personagem
  const handleAddItemToCharacterBackpack = (
    assetName: string,
    assetDataUrl?: string,
    assetEmoji?: string
  ) => {
    const existingItems = playerInventory.items || [];
    const existingItemIdx = existingItems.findIndex(
      (it) =>
        it.name.toLowerCase() === assetName.toLowerCase() ||
        (assetDataUrl && it.iconPng === assetDataUrl)
    );

    const registeredDef = (project.itemCatalog || []).find(
      (it) =>
        it.name.toLowerCase() === assetName.toLowerCase() ||
        (assetDataUrl && it.iconPng === assetDataUrl)
    );

    let nextItems = [...existingItems];
    if (existingItemIdx >= 0) {
      nextItems[existingItemIdx] = {
        ...nextItems[existingItemIdx],
        quantity: (nextItems[existingItemIdx].quantity || 1) + 1,
      };
    } else {
      nextItems.push({
        id: `inv-item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        definitionId: registeredDef?.id,
        name: assetName,
        description:
          registeredDef?.shortDescription || 'Item coletável e interativo de exploração.',
        iconPng: assetDataUrl || registeredDef?.iconPng,
        iconEmoji: assetEmoji || registeredDef?.iconEmoji || '📦',
        quantity: 1,
        type: (registeredDef?.category as any) || 'collectible',
        rarity: registeredDef?.rarity || 'common',
        currencyType: registeredDef?.currencyType || 'gold',
        stateTags: resolveItemStateTags(registeredDef),
        naturalBiomeSpawn: registeredDef?.naturalBiomeSpawn,
        usableActions: registeredDef?.usableActions || ['use', 'inspect', 'drop'],
        consumableEffect: registeredDef?.consumableEffect,
        stats: {
          attack: registeredDef?.equipmentStats?.attack,
          defense: registeredDef?.equipmentStats?.defense,
          speed: registeredDef?.equipmentStats?.speed,
          healthRestore: registeredDef?.consumableEffect?.hpRestore,
        },
      });
    }

    onUpdateProject({
      playerInventory: {
        ...playerInventory,
        items: nextItems,
      },
    });

    const targetHeroName = selectedCharacter?.name || project.player?.name || 'Herói';
    showToast(`🎒 +1x "${assetName}" enviado para a mochila de ${targetHeroName}!`);
  };

  // Resolve ou cria uma definição de item para edição (usado tanto na Ficha Retrátil quanto no Pop-up Avançado)
  const buildOrResolveItemDefinition = (
    assetName: string,
    assetDataUrl?: string,
    catalogDef?: InventoryItemDefinition
  ): InventoryItemDefinition => {
    if (catalogDef) {
      return {
        ...catalogDef,
        currencyType: catalogDef.currencyType || 'gold',
        stateTags: resolveItemStateTags(catalogDef),
        naturalBiomeSpawn: catalogDef.naturalBiomeSpawn || {
          enabled: resolveItemStateTags(catalogDef).includes('natural_biome_spawn'),
          biomeIds: project.biomes?.[0]?.id ? [project.biomes[0].id] : ['forest'],
          spawnDensityPerBiome: 3,
          spawnChancePercent: 80,
          avoidPaths: true,
        },
        consumableEffect: catalogDef.consumableEffect || { hpRestore: 0, manaRestore: 0 },
        equipmentStats: catalogDef.equipmentStats || {
          slot: 'weapon',
          attack: 10,
          defense: 5,
          speed: 0,
        },
        usableActions: catalogDef.usableActions || ['use', 'inspect', 'drop'],
      };
    }

    const existingDefinition = (project.itemCatalog || []).find(
      (it) =>
        it.name.toLowerCase() === assetName.toLowerCase() ||
        (assetDataUrl && it.iconPng === assetDataUrl)
    );

    if (existingDefinition) {
      return {
        ...existingDefinition,
        currencyType: existingDefinition.currencyType || 'gold',
        stateTags: resolveItemStateTags(existingDefinition),
        naturalBiomeSpawn: existingDefinition.naturalBiomeSpawn || {
          enabled: resolveItemStateTags(existingDefinition).includes('natural_biome_spawn'),
          biomeIds: project.biomes?.[0]?.id ? [project.biomes[0].id] : ['forest'],
          spawnDensityPerBiome: 3,
          spawnChancePercent: 80,
          avoidPaths: true,
        },
        consumableEffect: existingDefinition.consumableEffect || { hpRestore: 0, manaRestore: 0 },
        equipmentStats: existingDefinition.equipmentStats || {
          slot: 'weapon',
          attack: 10,
          defense: 5,
          speed: 0,
        },
        usableActions: existingDefinition.usableActions || ['use', 'inspect', 'drop'],
      };
    }

    return {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: assetName,
      iconPng: assetDataUrl,
      iconEmoji: '📦',
      shortDescription: 'Item interativo customizado com tags de estado e biomas.',
      category: 'collectible',
      rarity: 'common',
      stackable: true,
      maxStack: 99,
      buyPrice: 50,
      sellPrice: 25,
      currencyType: 'gold',
      stateTags: ['collectible', 'storable', 'tradable', 'buyable'],
      naturalBiomeSpawn: {
        enabled: false,
        biomeIds: project.biomes?.[0]?.id ? [project.biomes[0].id] : ['forest'],
        spawnDensityPerBiome: 3,
        spawnChancePercent: 80,
        avoidPaths: true,
      },
      usableActions: ['use', 'inspect', 'drop'],
      consumableEffect: {
        hpRestore: 20,
        manaRestore: 10,
      },
      equipmentStats: {
        slot: 'weapon',
        attack: 10,
        defense: 5,
        speed: 0,
      },
    };
  };

  // Alterna a Ficha Retrátil no próprio card
  const handleToggleInlineCardSheet = (
    cardKey: string,
    assetName: string,
    assetDataUrl?: string,
    catalogDef?: InventoryItemDefinition
  ) => {
    if (expandedCardKey === cardKey) {
      setExpandedCardKey(null);
      setInlineDraft(null);
      return;
    }
    const resolved = buildOrResolveItemDefinition(assetName, assetDataUrl, catalogDef);
    setExpandedCardKey(cardKey);
    setInlineDraft(resolved);
  };

  // Abre o Pop-up Maior Dedicado (Modo Avançado)
  const handleOpenRegisterModal = (
    assetName: string,
    assetDataUrl?: string,
    catalogDef?: InventoryItemDefinition
  ) => {
    const resolved = buildOrResolveItemDefinition(assetName, assetDataUrl, catalogDef);
    setEditingItem(resolved);
    setAdvancedModalTab('geral');
  };

  // Salva alterações do registro do item (usado pela Ficha Retrátil e pelo Pop-up Avançado)
  const handleSaveItemRegistration = (
    updatedDef: InventoryItemDefinition,
    closeInline: boolean = false
  ) => {
    const catalog = project.itemCatalog || [];
    const idx = catalog.findIndex(
      (it) =>
        it.id === updatedDef.id ||
        it.name.toLowerCase() === updatedDef.name.toLowerCase() ||
        (updatedDef.iconPng && it.iconPng === updatedDef.iconPng)
    );

    let nextCatalog = [...catalog];
    if (idx >= 0) {
      nextCatalog[idx] = updatedDef;
    } else {
      nextCatalog.push(updatedDef);
    }

    const updatedGallery = (project.galleryAssets || []).map((a) => {
      if (
        (updatedDef.iconPng && a.dataUrl === updatedDef.iconPng) ||
        a.id === updatedDef.id.replace('item-', '')
      ) {
        return { ...a, name: updatedDef.name };
      }
      return a;
    });

    onUpdateProject({
      itemCatalog: nextCatalog,
      galleryAssets: updatedGallery,
    });

    if (closeInline) {
      setExpandedCardKey(null);
      setInlineDraft(null);
    }
    setEditingItem(null);
    showToast(`✨ Ficha de "${updatedDef.name}" salva com Tags de Estado e Biomas!`);
  };

  // Exclui item do catálogo
  const handleDeleteCatalogItem = (itemId: string) => {
    const updatedCatalog = (project.itemCatalog || []).filter((it) => it.id !== itemId);
    onUpdateProject({ itemCatalog: updatedCatalog });
    showToast('Item removido do catálogo central.');
  };

  // Exclui item da galeria
  const handleDeleteItemAsset = (assetId: string) => {
    const updatedAssets = (project.galleryAssets || []).filter((a) => a.id !== assetId);
    onUpdateProject({ galleryAssets: updatedAssets });
    showToast('Item removido da galeria interativa.');
  };

  const itemCatalogList = useMemo(() => {
    return (project.itemCatalog || []).filter((it) => {
      const matchesSearch =
        !searchQuery.trim() || it.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeStateTagFilter !== 'all') {
        if (!resolveItemStateTags(it).includes(activeStateTagFilter)) return false;
      }
      return true;
    });
  }, [project.itemCatalog, searchQuery, activeStateTagFilter]);

  // Renderiza as Pílulas/Tags de Estado diretamente nos Cards
  const renderItemStateBadges = (def?: InventoryItemDefinition) => {
    const tags = resolveItemStateTags(def);
    const currencyMeta = getCurrencyMeta(def?.currencyType);
    const buyPrice = def?.buyPrice ?? 50;
    const biomeCount = def?.naturalBiomeSpawn?.biomeIds?.length || 0;

    return (
      <div className="flex flex-wrap items-center gap-1 mt-1">
        {tags.map((tagId) => {
          const meta = ITEM_STATE_TAGS_METADATA.find((m) => m.id === tagId);
          if (!meta) return null;
          return (
            <span
              key={tagId}
              className={`px-1.5 py-0.5 rounded border text-[9px] font-bold flex items-center gap-0.5 leading-none ${meta.badgeClass}`}
              title={meta.description}
            >
              <span>{meta.emoji}</span>
              <span>
                {tagId === 'natural_biome_spawn' && biomeCount > 0
                  ? `Spawn (${biomeCount} Bioma${biomeCount > 1 ? 's' : ''})`
                  : meta.shortLabel}
              </span>
            </span>
          );
        })}

        {tags.includes('buyable') && (
          <span
            className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold flex items-center gap-0.5 leading-none ${currencyMeta.colorClass}`}
            title={`Comprável com ${currencyMeta.label}`}
          >
            <span>{currencyMeta.emoji}</span>
            <span>
              {def?.currencyType === 'barter'
                ? def?.barterRequirementText || 'Troca'
                : `${buyPrice} ${currencyMeta.shortLabel}`}
            </span>
          </span>
        )}
      </div>
    );
  };

  // Renderiza o bloco da Ficha Retrátil inline dentro de qualquer card
  const renderInlineCollapsibleSheet = (cardKey: string) => {
    if (expandedCardKey !== cardKey || !inlineDraft) return null;

    const draftTags = resolveItemStateTags(inlineDraft);
    const isEquip = draftTags.includes('equipable');
    const hasNaturalBiome =
      draftTags.includes('natural_biome_spawn') || Boolean(inlineDraft.naturalBiomeSpawn?.enabled);

    return (
      <div
        className="mt-2.5 pt-2.5 border-t border-amber-500/30 bg-zinc-900/95 rounded-lg p-2.5 space-y-2.5 text-[11px] animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">
            ⚡ Ficha Retrátil Rápida
          </span>
          <button
            type="button"
            onClick={() => {
              setEditingItem({ ...inlineDraft });
              setAdvancedModalTab('geral');
            }}
            className="px-2 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
            title="Abrir o Pop-up Maior Dedicado com todas as configurações avançadas"
          >
            <Maximize2 className="w-2.5 h-2.5" />
            <span>Modo Avançado (Pop-up)</span>
          </button>
        </div>

        {/* Nome & Emoji */}
        <div className="grid grid-cols-4 gap-1.5">
          <div className="col-span-3">
            <label className="text-[9px] text-zinc-400 block mb-0.5">Nome do Item</label>
            <input
              type="text"
              value={inlineDraft.name}
              onChange={(e) => setInlineDraft({ ...inlineDraft, name: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white font-semibold focus:outline-none focus:border-amber-400"
            />
          </div>
          <div>
            <label className="text-[9px] text-zinc-400 block mb-0.5">Emoji</label>
            <input
              type="text"
              value={inlineDraft.iconEmoji || '📦'}
              onChange={(e) => setInlineDraft({ ...inlineDraft, iconEmoji: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-1 py-1 text-center text-xs"
            />
          </div>
        </div>

        {/* Seletor Rápido de Tags de Estado no Card */}
        <div className="space-y-1">
          <label className="text-[9px] text-zinc-400 font-semibold block">
            Tags de Estados Interativos (Clique para ativar/desativar):
          </label>
          <div className="flex flex-wrap gap-1">
            {ITEM_STATE_TAGS_METADATA.map((meta) => {
              const isActive = draftTags.includes(meta.id);
              return (
                <button
                  key={meta.id}
                  type="button"
                  onClick={() => setInlineDraft(toggleStateTagOnItem(inlineDraft, meta.id))}
                  className={`px-1.5 py-1 rounded border text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                    isActive
                      ? meta.activeBtnClass
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                  title={meta.description}
                >
                  <span>{meta.emoji}</span>
                  <span>{meta.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Seletor de Biomas Inline (Exibido quando Spawn Natural por Bioma está ativo) */}
        {hasNaturalBiome && (
          <div className="p-2 rounded-lg bg-lime-950/25 border border-lime-500/35 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-lime-300 flex items-center gap-1">
                <Trees className="w-3 h-3" />
                <span>Seletor de Biomas (Spawn Natural):</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  handleSaveItemRegistration(inlineDraft, false);
                  handleGenerateNaturalBiomeSpawns(inlineDraft);
                }}
                className="px-1.5 py-0.5 rounded bg-lime-500 hover:bg-lime-400 text-black font-extrabold text-[9px] cursor-pointer"
                title="Gerar agora na fase atual de acordo com os biomas marcados"
              >
                🌿 Gerar no Mapa
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {availableBiomesForSelector.map((b) => {
                const selected = (inlineDraft.naturalBiomeSpawn?.biomeIds || []).includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setInlineDraft(toggleBiomeOnItem(inlineDraft, b.id))}
                    className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold flex items-center gap-1 cursor-pointer ${
                      selected
                        ? 'bg-lime-500/25 border-lime-400 text-lime-200 font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: b.color }}
                    />
                    <span>{b.shortName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Economia Rápida: Tipo de Moeda + Preço Compra/Venda + Atributo Principal */}
        <div className="grid grid-cols-3 gap-1.5 font-mono">
          <div>
            <label className="text-[9px] text-zinc-400 block mb-0.5 font-sans">Tipo de Moeda</label>
            <select
              value={inlineDraft.currencyType || 'gold'}
              onChange={(e) =>
                setInlineDraft({
                  ...inlineDraft,
                  currencyType: e.target.value as ItemCurrencyType,
                })
              }
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-1 py-1 text-[10px] text-amber-200 font-sans font-semibold cursor-pointer"
            >
              {ITEM_CURRENCIES_METADATA.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.shortLabel}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[9px] text-zinc-400 block mb-0.5 font-sans">Compra / Venda</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={inlineDraft.buyPrice ?? 50}
                onChange={(e) =>
                  setInlineDraft({ ...inlineDraft, buyPrice: Number(e.target.value) || 0 })
                }
                title="Preço de Compra"
                className="w-1/2 bg-zinc-950 border border-zinc-700 rounded px-1 py-1 text-[10px] text-amber-300 font-bold tabular-nums"
              />
              <input
                type="number"
                value={inlineDraft.sellPrice ?? 25}
                onChange={(e) =>
                  setInlineDraft({ ...inlineDraft, sellPrice: Number(e.target.value) || 0 })
                }
                title="Preço de Venda"
                className="w-1/2 bg-zinc-950 border border-zinc-700 rounded px-1 py-1 text-[10px] text-emerald-300 font-bold tabular-nums"
              />
            </div>
          </div>

          {isEquip ? (
            <div>
              <label className="text-[9px] text-zinc-400 block mb-0.5 font-sans">+Ataque</label>
              <input
                type="number"
                value={inlineDraft.equipmentStats?.attack ?? 10}
                onChange={(e) =>
                  setInlineDraft({
                    ...inlineDraft,
                    equipmentStats: {
                      slot: inlineDraft.equipmentStats?.slot || 'weapon',
                      ...(inlineDraft.equipmentStats || {}),
                      attack: Number(e.target.value) || 0,
                    },
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1 text-[10px] text-rose-300 font-bold tabular-nums"
              />
            </div>
          ) : (
            <div>
              <label className="text-[9px] text-zinc-400 block mb-0.5 font-sans">Cura HP</label>
              <input
                type="number"
                value={inlineDraft.consumableEffect?.hpRestore ?? 0}
                onChange={(e) =>
                  setInlineDraft({
                    ...inlineDraft,
                    consumableEffect: {
                      ...(inlineDraft.consumableEffect || {}),
                      hpRestore: Number(e.target.value) || 0,
                    },
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1 text-[10px] text-emerald-300 font-bold tabular-nums"
              />
            </div>
          )}
        </div>

        {/* Botões Salvar Rápido ou Fechar */}
        <div className="flex items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => handleSaveItemRegistration(inlineDraft, true)}
            className="flex-1 py-1.5 px-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
          >
            <Check className="w-3 h-3" />
            <span>Salvar no Card</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setExpandedCardKey(null);
              setInlineDraft(null);
            }}
            className="py-1.5 px-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="space-y-4"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDropFiles}
    >
      {/* Inputs Ocultos de Importação */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleMassPngUpload}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-ignore
        webkitdirectory=""
        directory=""
        className="hidden"
        onChange={handleFolderInputFallback}
      />
      <input
        ref={modalPngInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f && editingItem) {
            try {
              const res = await readUploadedImage(f);
              setEditingItem({ ...editingItem, iconPng: res.dataUrl });
            } catch (err) {
              console.error(err);
            }
          }
          e.target.value = '';
        }}
      />

      {onOpenFullInventoryEditor && (
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="text-[11px] text-amber-200">
            <span className="font-bold">
              Quer tela cheia com Projetos de Inventário &amp; Seletor de Fases no Emulador?
            </span>{' '}
            Abra o Editor Dedicado de Inventários.
          </div>
          <button
            type="button"
            onClick={onOpenFullInventoryEditor}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[11px] whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            🎒 Abrir Editor Completo ➔
          </button>
        </div>
      )}

      {/* BARRA FIXA DE IMPORTAÇÃO EM MASSA (PASTAS + MULTI-PNGS + DRAG & DROP) */}
      <div
        className={`p-3 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
          isDragOver
            ? 'bg-emerald-950/50 border-emerald-400 ring-2 ring-emerald-500/40'
            : 'bg-zinc-900/90 border-zinc-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <FolderOpen className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-extrabold text-white block">
              Importação em Massa de Pastas &amp; Itens PNG (Auto-Registro com Tags de Estado)
            </span>
            <span className="text-[11px] text-zinc-400 block">
              Arraste vários PNGs aqui ou importe uma pasta inteira para registrar itens com Ficha Retrátil e Pop-up Avançado.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleConnectFolder}
            disabled={isImporting}
            className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Importar Pasta Inteira</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar PNGs em Massa</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenRegisterModal('Novo Item Interativo')}
            className="py-1.5 px-3 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Novo Item</span>
          </button>
        </div>
      </div>

      {/* BARRA DE NAVEGAÇÃO INTERNA DO EDITOR DE INVENTÁRIOS & ITENS */}
      <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMainSubTab('acervo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              mainSubTab === 'acervo'
                ? 'bg-amber-500 text-black font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Acervo de Sprites ({interactiveAssets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setMainSubTab('test_spawn')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              mainSubTab === 'test_spawn'
                ? 'bg-amber-500 text-black font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Test Spawn &amp; Spawn por Bioma ({unifiedTestableItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setMainSubTab('catalogo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              mainSubTab === 'catalogo'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Catálogo Central ({itemCatalogList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setMainSubTab('mochila')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              mainSubTab === 'mochila'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>
              Mochila &amp; Equipamentos ({playerInventory.items?.length || 0}/
              {playerInventory.maxSlots || 30})
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {activeTestSpawnMarkers.length > 0 && (
            <button
              type="button"
              onClick={handleClearTestSpawns}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-rose-500/20 border border-zinc-800 hover:border-rose-500/40 text-zinc-300 hover:text-rose-300 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Remover todos os itens de teste e de bioma gerados no mapa"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Spawns ({activeTestSpawnMarkers.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleGenerateNaturalBiomeSpawns()}
            className="px-2.5 py-1.5 rounded-lg bg-lime-500/20 hover:bg-lime-500/30 border border-lime-500/40 text-lime-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Distribuir itens com tag 'Spawn Bioma' nas faixas correspondentes dos biomas da fase"
          >
            <Trees className="w-3.5 h-3.5" />
            <span>Spawn Natural Biomas</span>
          </button>

          <button
            type="button"
            onClick={handleAutoTestSpawnAll}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Cria no mapa ao redor do herói um anel com todos os itens para testar coleta"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Spawn em Anel (360°)</span>
          </button>
        </div>
      </div>

      {/* BARRA DE FILTRO POR TAGS DE ESTADO (Exibida em Acervo, Test Spawn e Catálogo) */}
      {mainSubTab !== 'mochila' && (
        <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-850 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1 pr-1 shrink-0">
            <Tag className="w-3 h-3 text-amber-400" />
            <span>Filtrar por Estado:</span>
          </span>

          <button
            type="button"
            onClick={() => setActiveStateTagFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
              activeStateTagFilter === 'all'
                ? 'bg-white text-black'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Todos os Estados
          </button>

          {ITEM_STATE_TAGS_METADATA.map((meta) => {
            const active = activeStateTagFilter === meta.id;
            return (
              <button
                key={meta.id}
                type="button"
                onClick={() => setActiveStateTagFilter(active ? 'all' : meta.id)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 transition-all ${
                  active
                    ? meta.activeBtnClass
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
                title={meta.description}
              >
                <span>{meta.emoji}</span>
                <span>{meta.shortLabel}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* SUB-ABA: MODO TEST SPAWN, SPAWN MANUAL 1 A 1 & SPAWN NATURAL POR BIOMA */}
      {mainSubTab === 'test_spawn' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/40 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-amber-400" />
                  <span>Laboratório Test Spawn (Anel 360°, Manual 1 a 1 &amp; Spawn Natural por Bioma)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Gere itens em anel ao redor de{' '}
                  <strong className="text-zinc-200">{project.player?.name || 'Herói'}</strong> (X:{' '}
                  <span className="font-mono tabular-nums">{Math.round(project.player?.x || 384)}</span> · Y:{' '}
                  <span className="font-mono tabular-nums">{Math.round(project.player?.y || 100)}</span>), spawne
                  manualmente 1 a 1 ou distribua automaticamente pelos <strong>Biomas da Fase</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleGenerateNaturalBiomeSpawns()}
                  className="px-3 py-1.5 rounded-lg bg-lime-500 hover:bg-lime-400 text-black font-extrabold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Trees className="w-3.5 h-3.5" />
                  <span>🌿 Gerar Spawn Natural nos Biomas</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoTestSpawnAll}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Spawnar Todos em Anel ({unifiedTestableItems.length})</span>
                </button>
              </div>
            </div>

            {/* Painel de Seletor de Biomas da Fase para Teste de Spawn Natural */}
            <div className="p-3 rounded-xl bg-lime-950/20 border border-lime-500/30 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-lime-300 flex items-center gap-1.5">
                  <Trees className="w-3.5 h-3.5" />
                  <span>Biomas da Fase Ativa:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedBiomeFilterForSpawn('all')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                    selectedBiomeFilterForSpawn === 'all'
                      ? 'bg-lime-500 text-black border-lime-400'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white'
                  }`}
                >
                  Todos os Biomas ({project.biomes?.length || 0})
                </button>
                {(project.biomes || []).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBiomeFilterForSpawn(b.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 cursor-pointer ${
                      selectedBiomeFilterForSpawn === b.id
                        ? 'bg-lime-500/25 border-lime-400 text-lime-200 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: b.color }}
                    />
                    <span>{b.name}</span>
                  </button>
                ))}
              </div>

              <span className="text-[11px] text-lime-200/80 font-mono">
                {
                  (project.itemCatalog || []).filter(
                    (it) =>
                      resolveItemStateTags(it).includes('natural_biome_spawn') ||
                      it.naturalBiomeSpawn?.enabled
                  ).length
                }{' '}
                itens configurados com Spawn por Bioma
              </span>
            </div>

            {/* Controles de Raio, Quantidade e Limpeza */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-850 text-xs">
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-medium">Raio ao Redor do Herói:</span>
                  <span className="font-mono font-bold text-amber-300 tabular-nums">{spawnRadius}px</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={160}
                  step={5}
                  value={spawnRadius}
                  onChange={(e) => setSpawnRadius(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-zinc-950 rounded-lg cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-medium">Qtd. por Clique Manual:</span>
                  <span className="font-mono font-bold text-blue-300 tabular-nums">{manualSpawnCount}x</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[1, 3, 5, 8].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setManualSpawnCount(q)}
                      className={`flex-1 py-1 rounded text-xs font-mono font-semibold cursor-pointer transition-colors ${
                        manualSpawnCount === q
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      {q}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-medium">Spawns Ativos no Mapa:</span>
                  <span className="font-mono font-bold text-emerald-300 tabular-nums">
                    {activeTestSpawnMarkers.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearTestSpawns}
                  disabled={activeTestSpawnMarkers.length === 0}
                  className="w-full py-1 px-2.5 rounded bg-zinc-950 hover:bg-rose-500/20 disabled:opacity-40 border border-zinc-800 hover:border-rose-500/40 text-zinc-300 hover:text-rose-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpar Spawns de Teste</span>
                </button>
              </div>
            </div>
          </div>

          {/* Busca Rápida para o Menu de Spawn Manual 1 a 1 */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar itens para Spawn Manual 1 a 1..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Lista de Itens para Spawn Manual 1 a 1 com Tags de Estado e Ficha Retrátil */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
            {unifiedTestableItems.map((item) => {
              const cardKey = `spawn-${item.id}`;
              const isCardExpanded = expandedCardKey === cardKey;
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl bg-zinc-950 border flex flex-col justify-between gap-2.5 transition-all ${
                    isCardExpanded
                      ? 'border-amber-500 ring-1 ring-amber-500/30'
                      : 'border-zinc-800 hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                        {item.iconPng ? (
                          <img src={item.iconPng} alt={item.name} className="w-full h-full object-contain p-1" />
                        ) : (
                          <span className="text-xl">{item.iconEmoji || '📦'}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-white block truncate" title={item.name}>
                          {item.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                          <span>{item.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.rarity}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenRegisterModal(item.name, item.iconPng, item.catalogDef)}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-blue-500/20 border border-zinc-800 hover:border-blue-500/40 text-zinc-400 hover:text-blue-300 transition-colors cursor-pointer shrink-0"
                      title="Abrir Pop-up Maior Dedicado (Modo Avançado)"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Badges de Estado e Moeda */}
                  {renderItemStateBadges(item.catalogDef)}

                  <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-900">
                    <button
                      type="button"
                      onClick={() =>
                        handleSpawnItemNearPlayer(
                          item.name,
                          item.iconPng,
                          item.iconEmoji,
                          manualSpawnCount
                        )
                      }
                      className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Spawn ({manualSpawnCount}x)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleAddItemToCharacterBackpack(item.name, item.iconPng, item.iconEmoji)
                      }
                      className="py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-semibold text-xs cursor-pointer whitespace-nowrap"
                      title="Enviar 1x direto para a mochila sem precisar caminhar"
                    >
                      +Mochila
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleToggleInlineCardSheet(cardKey, item.name, item.iconPng, item.catalogDef)
                      }
                      className={`py-1.5 px-2 rounded-lg border font-semibold text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap transition-colors ${
                        isCardExpanded
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-blue-300'
                      }`}
                      title="Expandir/Recolher Ficha Retrátil no próprio card"
                    >
                      <span>Ficha</span>
                      {isCardExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {/* Ficha Retrátil Inline no próprio Card */}
                  {renderInlineCollapsibleSheet(cardKey)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-ABA 1: ACERVO & IMPORTAÇÃO DIRETA DE ITENS INTERATIVOS */}
      {mainSubTab === 'acervo' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome do item ou asset interativo..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {interactiveAssets.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <Package className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-xs font-bold text-zinc-300">
                Nenhum asset PNG encontrado neste filtro.
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Use os botões <strong>Importar Pasta Inteira</strong> ou <strong>Importar PNGs em Massa</strong> acima (ou arraste imagens aqui), ou acesse a aba <strong>Test Spawn &amp; Spawn por Bioma</strong>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
              {interactiveAssets.map((asset) => {
                const registeredDef = (project.itemCatalog || []).find(
                  (it) => it.name === asset.name || it.iconPng === asset.dataUrl
                );
                const cardKey = `asset-${asset.id}`;
                const isCardExpanded = expandedCardKey === cardKey;

                return (
                  <div
                    key={asset.id}
                    className={`group relative p-3 rounded-xl bg-zinc-950 border flex flex-col justify-between gap-2.5 transition-all select-none ${
                      isCardExpanded
                        ? 'border-amber-500 ring-1 ring-amber-500/30'
                        : 'border-zinc-800 hover:border-amber-500/60'
                    }`}
                  >
                    <div
                      className="relative h-28 w-full rounded-lg border border-zinc-800/80 p-2 flex items-center justify-center overflow-hidden"
                      style={{
                        backgroundImage:
                          'linear-gradient(45deg, #18181b 25%, transparent 25%), linear-gradient(-45deg, #18181b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #18181b 75%), linear-gradient(-45deg, transparent 75%, #18181b 75%)',
                        backgroundSize: '12px 12px',
                        backgroundColor: '#09090b',
                      }}
                    >
                      <img
                        src={asset.dataUrl}
                        alt={asset.name}
                        className="max-w-full max-h-full object-contain filter drop-shadow-md transition-transform group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() => handleOpenRegisterModal(asset.name, asset.dataUrl, registeredDef)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-blue-600 border border-zinc-700 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                        title="Abrir Modo Avançado em Pop-up Maior Dedicado"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-bold text-zinc-100 block truncate" title={asset.name}>
                        {asset.name}
                      </span>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>
                          {registeredDef?.category || 'collectible'} · {registeredDef?.rarity || 'common'}
                        </span>
                      </div>
                      {renderItemStateBadges(registeredDef)}
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-zinc-850">
                      <button
                        type="button"
                        onClick={() => handleSpawnItemNearPlayer(asset.name, asset.dataUrl, '📦', 1)}
                        className="w-full py-1.5 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Cria este item no mapa diretamente próximo da posição atual do herói"
                      >
                        <Zap className="w-3 h-3 fill-current text-amber-400" />
                        <span>Spawn Perto do Player</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleInlineCardSheet(cardKey, asset.name, asset.dataUrl, registeredDef)
                          }
                          className={`flex-1 py-1 px-1.5 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                            isCardExpanded
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                              : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-750 text-zinc-200'
                          }`}
                          title="Abrir Ficha Retrátil Rápida no próprio card"
                        >
                          <span>Ficha</span>
                          {isCardExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenRegisterModal(asset.name, asset.dataUrl, registeredDef)}
                          className="py-1 px-2 rounded-lg bg-zinc-900 hover:bg-blue-600/25 border border-zinc-750 hover:border-blue-500/40 text-blue-300 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Abrir Pop-up Maior Dedicado (Modo Avançado)"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddItemToCharacterBackpack(asset.name, asset.dataUrl)}
                          className="py-1 px-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Adicionar direto à mochila do personagem atual"
                        >
                          <span>+Mochila</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteItemAsset(asset.id)}
                          className="p-1 rounded-lg bg-zinc-900 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-500/30 transition-colors cursor-pointer"
                          title="Excluir item da galeria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Ficha Retrátil Inline no próprio Card */}
                    {renderInlineCollapsibleSheet(cardKey)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-ABA 2: CATÁLOGO CENTRAL E BANCO DE DADOS DE ITENS DO JOGO */}
      {mainSubTab === 'catalogo' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                <span>Catálogo de Itens com Tags de Estados &amp; Biomas</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Use a <strong>Ficha Rápida</strong> no card para editar tags de estado, moeda e biomas, ou clique em <strong>Avançado</strong> para abrir o pop-up dedicado.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenRegisterModal('Novo Item do Jogo')}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Item (Pop-up Avançado)</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar item no catálogo..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {itemCatalogList.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <Database className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs font-bold text-zinc-300">Nenhum item encontrado com este filtro.</p>
              <p className="text-xs text-zinc-500">
                Importe uma pasta/PNGs acima ou clique em <strong>Novo Item</strong>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
              {itemCatalogList.map((item) => {
                const cardKey = `cat-${item.id}`;
                const isCardExpanded = expandedCardKey === cardKey;
                const currencyMeta = getCurrencyMeta(item.currencyType);

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl bg-zinc-950 border flex flex-col justify-between gap-2.5 transition-all ${
                      isCardExpanded
                        ? 'border-amber-500 ring-1 ring-amber-500/30'
                        : 'border-zinc-800 hover:border-blue-500/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-750 flex items-center justify-center overflow-hidden shrink-0">
                        {item.iconPng ? (
                          <img src={item.iconPng} alt={item.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xl">{item.iconEmoji || '📦'}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-white truncate block">{item.name}</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                          <span>{item.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.rarity || 'common'}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                          {item.shortDescription || 'Sem descrição cadastrada.'}
                        </p>
                      </div>
                    </div>

                    {/* Tags de Estado e Moeda */}
                    {renderItemStateBadges(item)}

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-2 border-t border-zinc-900 tabular-nums">
                      <span>
                        Compra:{' '}
                        <strong className="text-amber-300">
                          {currencyMeta.emoji} {item.buyPrice ?? 50}
                        </strong>{' '}
                        · Venda: <strong className="text-emerald-300">{item.sellPrice ?? 25}</strong>
                      </span>
                      <span>
                        Stack: <strong className="text-zinc-200">{item.maxStack || 99}x</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleInlineCardSheet(cardKey, item.name, item.iconPng, item)}
                        className={`flex-1 py-1.5 px-2 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                          isCardExpanded
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                        }`}
                      >
                        <span>Ficha Rápida</span>
                        {isCardExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenRegisterModal(item.name, item.iconPng, item)}
                        className="py-1.5 px-2.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Abrir Pop-up Maior Dedicado (Modo Avançado)"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Avançado</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSpawnItemNearPlayer(item.name, item.iconPng, item.iconEmoji, 1)}
                        className="py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Spawnar este item perto do herói no mapa"
                      >
                        <Zap className="w-3 h-3 fill-current" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCatalogItem(item.id)}
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 border border-zinc-800 transition-colors cursor-pointer"
                        title="Excluir item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Ficha Retrátil Inline no próprio Card */}
                    {renderInlineCollapsibleSheet(cardKey)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-ABA 3: MOCHILA & EQUIPAMENTOS DO JOGADOR */}
      {mainSubTab === 'mochila' && (
        <InventoryManagerStudio
          project={project}
          onUpdateProject={onUpdateProject}
          galleryAssets={project.galleryAssets || []}
          showToast={showToast}
        />
      )}

      {/* POP-UP MAIOR DEDICADO (MODO AVANÇADO DE REGISTRO, TAGS DE ESTADO, MOEDA & BIOMAS) */}
      {editingItem && (
        <div className="fixed inset-0 z-100 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-750 rounded-2xl shadow-2xl flex flex-col select-none max-h-[92vh] overflow-hidden">
            {/* Cabeçalho do Pop-up Avançado */}
            <div className="px-6 py-4 bg-zinc-900/90 border-b border-zinc-850 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-xl bg-zinc-950 border border-amber-500/40 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {editingItem.iconPng ? (
                    <img
                      src={editingItem.iconPng}
                      alt={editingItem.name}
                      className="w-full h-full object-contain p-1.5"
                    />
                  ) : (
                    <span className="text-2xl">{editingItem.iconEmoji || '📦'}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white">
                      Modo Avançado — Ficha Completa do Item Interativo
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-mono font-bold uppercase">
                      Pop-up Dedicado
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Configure Tags de Estado (Coletável, Armazenável, Entregável, Equipável, Consumível, Comprável/Vendável), Moeda e Spawn Natural por Bioma
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Abas Internas do Pop-up Avançado */}
            <div className="px-6 py-2.5 bg-zinc-950 border-b border-zinc-850 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {[
                { id: 'geral', label: '1. Identidade & Tags de Estado', icon: Tag },
                { id: 'bioma_spawn', label: '2. Spawn Natural por Bioma', icon: Trees },
                { id: 'economia', label: '3. Compra/Venda & Tipo de Moeda', icon: Coins },
                { id: 'atributos', label: '4. Cura & Equipamento', icon: Swords },
                { id: 'leitura_quests', label: '5. Livros & Entrega de Quests', icon: BookOpen },
              ].map((tb) => {
                const Icon = tb.icon;
                const active = advancedModalTab === tb.id;
                return (
                  <button
                    key={tb.id}
                    type="button"
                    onClick={() => setAdvancedModalTab(tb.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-amber-500 text-black'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tb.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Conteúdo do Pop-up Avançado */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* ABA 1: IDENTIDADE, SPRITE & TAGS DE ESTADO */}
              {advancedModalTab === 'geral' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">
                        Nome Oficial do Item
                      </label>
                      <input
                        type="text"
                        value={editingItem.name}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">
                        Sprite PNG ou Emoji
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingItem.iconEmoji || '📦'}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, iconEmoji: e.target.value })
                          }
                          className="w-12 bg-zinc-900 border border-zinc-750 rounded-lg px-2 py-2 text-center text-sm"
                          title="Emoji de fallback"
                        />
                        <button
                          type="button"
                          onClick={() => modalPngInputRef.current?.click()}
                          className="flex-1 py-2 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Trocar PNG</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* MATRIZ COMPLETA DE TAGS DE ESTADO */}
                  <div className="p-4 rounded-xl bg-zinc-900/90 border border-amber-500/35 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                          <Tag className="w-4 h-4" />
                          <span>Tags de Estados do Item (Comportamento no Jogo)</span>
                        </span>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Marque todos os estados aplicáveis: Coletável, Armazenável, Entregável, Equipável, Consumível, Vendável/Trocável, Comprável e Spawn Natural por Bioma.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-amber-300 font-bold">
                        {resolveItemStateTags(editingItem).length} estados ativos
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {ITEM_STATE_TAGS_METADATA.map((meta) => {
                        const isChecked = resolveItemStateTags(editingItem).includes(meta.id);
                        return (
                          <button
                            key={meta.id}
                            type="button"
                            onClick={() =>
                              setEditingItem(toggleStateTagOnItem(editingItem, meta.id))
                            }
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                              isChecked
                                ? `${meta.activeBtnClass} shadow-sm`
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-sm">{meta.emoji}</span>
                              <span
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  isChecked
                                    ? 'bg-black/40 text-white'
                                    : 'bg-zinc-900 text-zinc-500'
                                }`}
                              >
                                {isChecked ? 'ATIVO' : 'OFF'}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs font-bold block text-white">
                                {meta.shortLabel}
                              </span>
                              <span className="text-[10px] opacity-80 line-clamp-2 leading-tight mt-0.5 block">
                                {meta.description}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">
                        Categoria Principal
                      </label>
                      <select
                        value={editingItem.category}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, category: e.target.value as any })
                        }
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-2 text-xs text-white font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="collectible">Coletável / Exploração</option>
                        <option value="potion">Poção / Elixir</option>
                        <option value="consumable">Consumível / Alimento</option>
                        <option value="weapon">Arma / Ferramenta</option>
                        <option value="armor">Armadura / Escudo</option>
                        <option value="accessory">Acessório / Anel</option>
                        <option value="key">Chave / Mecanismo</option>
                        <option value="material">Material de Crafting</option>
                        <option value="quest">Item de Missão (Quest)</option>
                        <option value="book">Livro / Pergaminho / Carta</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">
                        Raridade do Item
                      </label>
                      <select
                        value={editingItem.rarity || 'common'}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, rarity: e.target.value as any })
                        }
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-2 text-xs text-white font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="common">Comum (Cinza/Branco)</option>
                        <option value="uncommon">Incomum (Verde)</option>
                        <option value="rare">Raro (Azul)</option>
                        <option value="epic">Épico (Roxo)</option>
                        <option value="legendary">Lendário (Dourado)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">
                        Subcategoria / Tag Livre
                      </label>
                      <input
                        type="text"
                        value={editingItem.subCategory || ''}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, subCategory: e.target.value })
                        }
                        placeholder="Ex: relic, herb, scroll..."
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Vínculo Direto com Camadas do Motion Canvas (Motion Item) */}
                  <div className="p-3 rounded-xl bg-fuchsia-950/20 border border-fuchsia-500/35 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-fuchsia-300 flex items-center gap-1.5">
                        <span>🎬 Vínculo Motion Item (Roupa / Skin / Cinto / Arma com Física 2D)</span>
                      </span>
                      <span className="text-[10px] font-mono text-fuchsia-200/80">
                        Revela camadas no Herói ao adquirir/equipar
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                          Tag de Grupo no Motion Canvas (inventoryItemTag)
                        </label>
                        <input
                          type="text"
                          value={editingItem.motionLayerTag || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\s+/g, '_');
                            const nextTags = new Set(resolveItemStateTags(editingItem));
                            if (val) {
                              nextTags.add('motion_item');
                              nextTags.add('equipable');
                            }
                            setEditingItem({
                              ...editingItem,
                              motionLayerTag: val || undefined,
                              stateTags: Array.from(nextTags),
                            });
                          }}
                          placeholder="Ex: skin_armadura_solar, cinto_real, espada_fogo..."
                          className="w-full bg-zinc-950 border border-fuchsia-500/40 rounded-lg px-3 py-1.5 text-xs text-fuchsia-200 font-mono focus:outline-none focus:border-fuchsia-400"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                          Slot Visual do Equipamento Motion
                        </label>
                        <select
                          value={editingItem.motionEquipSlot || 'skin'}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              motionEquipSlot: e.target.value as any,
                            })
                          }
                          className="w-full bg-zinc-950 border border-zinc-750 rounded-lg px-3 py-1.5 text-xs text-white font-semibold"
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
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Descrição Curta (Exibida no Tooltip da Mochila)
                    </label>
                    <input
                      type="text"
                      value={editingItem.shortDescription || ''}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, shortDescription: e.target.value })
                      }
                      className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Descrição Detalhada &amp; Lore (História do Item ao Inspecionar)
                    </label>
                    <textarea
                      value={editingItem.detailedDescription || ''}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, detailedDescription: e.target.value })
                      }
                      rows={2}
                      placeholder="Descreva a história, origem ou instruções especiais deste item..."
                      className="w-full bg-zinc-900 border border-zinc-750 rounded-lg p-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* ABA 2: SPAWN NATURAL POR BIOMA + SELETOR DE BIOMAS */}
              {advancedModalTab === 'bioma_spawn' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-lime-950/20 border border-lime-500/40 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-lime-500/20 border border-lime-500/40 flex items-center justify-center text-lime-300 text-lg">
                        🌿
                      </div>
                      <div>
                        <span className="text-sm font-extrabold text-white block">
                          Spawn Natural por Bioma + Seletor de Biomas
                        </span>
                        <span className="text-xs text-zinc-400">
                          Defina em quais biomas da fase este item cresce ou aparece naturalmente e sua densidade por faixa.
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setEditingItem(toggleStateTagOnItem(editingItem, 'natural_biome_spawn'))
                      }
                      className={`px-4 py-2 rounded-xl font-extrabold text-xs cursor-pointer transition-all ${
                        resolveItemStateTags(editingItem).includes('natural_biome_spawn')
                          ? 'bg-lime-500 text-black shadow-md'
                          : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                      }`}
                    >
                      {resolveItemStateTags(editingItem).includes('natural_biome_spawn')
                        ? '✅ Spawn por Bioma ATIVO'
                        : 'Ativar Spawn por Bioma'}
                    </button>
                  </div>

                  {/* Seletor Visual de Biomas (Biomas da Fase Atual + Biomas Universais) */}
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        Selecione os Biomas onde "{editingItem.name}" nasce naturalmente:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const allIds = availableBiomesForSelector.map((b) => b.id);
                            const tags = new Set(resolveItemStateTags(editingItem));
                            tags.add('natural_biome_spawn');
                            setEditingItem({
                              ...editingItem,
                              stateTags: Array.from(tags),
                              naturalBiomeSpawn: {
                                ...(editingItem.naturalBiomeSpawn || {}),
                                enabled: true,
                                biomeIds: allIds,
                              },
                            });
                          }}
                          className="text-[11px] text-lime-300 hover:underline cursor-pointer font-semibold"
                        >
                          Selecionar Todos
                        </button>
                        <span className="text-zinc-700">|</span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingItem({
                              ...editingItem,
                              naturalBiomeSpawn: {
                                ...(editingItem.naturalBiomeSpawn || {}),
                                enabled: false,
                                biomeIds: [],
                              },
                            })
                          }
                          className="text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                        >
                          Limpar Seleção
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                      {availableBiomesForSelector.map((b) => {
                        const selected = (editingItem.naturalBiomeSpawn?.biomeIds || []).includes(
                          b.id
                        );
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setEditingItem(toggleBiomeOnItem(editingItem, b.id))}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              selected
                                ? 'bg-lime-500/20 border-lime-400 text-lime-100 ring-1 ring-lime-400/30'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20"
                                style={{ backgroundColor: b.color }}
                              />
                              <div className="min-w-0">
                                <span className="text-xs font-bold block truncate">
                                  {b.shortName}
                                </span>
                                <span className="text-[9px] text-zinc-400 block">
                                  {b.isPhaseBiome ? 'Bioma da Fase' : 'Preset Universal'}
                                </span>
                              </div>
                            </div>
                            {selected && <Check className="w-4 h-4 text-lime-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Parâmetros de Densidade e Probabilidade de Spawn por Bioma */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-300 font-semibold">
                          Densidade por Faixa:
                        </span>
                        <span className="font-mono font-bold text-lime-300">
                          {editingItem.naturalBiomeSpawn?.spawnDensityPerBiome ?? 3}x / bioma
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={12}
                        value={editingItem.naturalBiomeSpawn?.spawnDensityPerBiome ?? 3}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            naturalBiomeSpawn: {
                              enabled: true,
                              biomeIds: editingItem.naturalBiomeSpawn?.biomeIds || [],
                              ...(editingItem.naturalBiomeSpawn || {}),
                              spawnDensityPerBiome: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full accent-lime-500 cursor-pointer"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-300 font-semibold">
                          Chance de Aparecer:
                        </span>
                        <span className="font-mono font-bold text-amber-300">
                          {editingItem.naturalBiomeSpawn?.spawnChancePercent ?? 85}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={editingItem.naturalBiomeSpawn?.spawnChancePercent ?? 85}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            naturalBiomeSpawn: {
                              enabled: true,
                              biomeIds: editingItem.naturalBiomeSpawn?.biomeIds || [],
                              ...(editingItem.naturalBiomeSpawn || {}),
                              spawnChancePercent: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <label className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingItem.naturalBiomeSpawn?.avoidPaths !== false}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            naturalBiomeSpawn: {
                              enabled: true,
                              biomeIds: editingItem.naturalBiomeSpawn?.biomeIds || [],
                              ...(editingItem.naturalBiomeSpawn || {}),
                              avoidPaths: e.target.checked,
                            },
                          })
                        }
                        className="accent-lime-500 w-4 h-4"
                      />
                      <div>
                        <span className="font-bold text-white block">Evitar Trilha Central</span>
                        <span className="text-[10px] text-zinc-400">
                          Gera nas bordas naturais e vegetação do bioma
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        handleSaveItemRegistration(editingItem, false);
                        handleGenerateNaturalBiomeSpawns(editingItem);
                      }}
                      className="px-4 py-2 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Trees className="w-4 h-4" />
                      <span>Salvar &amp; Gerar Spawn Natural deste Item nos Biomas Agora</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ABA 3: ECONOMIA, COMPRA/VENDA, TIPO DE MOEDA & AÇÕES */}
              {advancedModalTab === 'economia' && (
                <div className="space-y-4">
                  {/* Seletor Visual de Tipo de Moeda */}
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span>Seletor de Tipo de Moeda (Compra, Venda &amp; Troca)</span>
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {ITEM_CURRENCIES_METADATA.map((cur) => {
                        const isSelected = (editingItem.currencyType || 'gold') === cur.id;
                        return (
                          <button
                            key={cur.id}
                            type="button"
                            onClick={() =>
                              setEditingItem({ ...editingItem, currencyType: cur.id })
                            }
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? `${cur.colorClass} ring-1 ring-white/30 font-extrabold`
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            <span className="text-lg block">{cur.emoji}</span>
                            <span className="text-xs font-bold block mt-1">{cur.shortLabel}</span>
                          </button>
                        );
                      })}
                    </div>

                    {editingItem.currencyType === 'barter' && (
                      <div className="pt-2">
                        <label className="text-[11px] text-orange-300 font-semibold block mb-1">
                          Item Exigido para Escambo / Troca (Ex: "3x Tronco de Carvalho"):
                        </label>
                        <input
                          type="text"
                          value={editingItem.barterRequirementText || ''}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              barterRequirementText: e.target.value,
                            })
                          }
                          placeholder="Ex: 3x Madeira Antiga ou 1x Chave de Bronze"
                          className="w-full bg-zinc-950 border border-orange-500/40 rounded-lg px-3 py-1.5 text-xs text-white"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
                    <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                      <label className="text-[11px] text-zinc-400 block mb-1 font-sans">
                        Preço de Compra ({getCurrencyMeta(editingItem.currencyType).label}):
                      </label>
                      <input
                        type="number"
                        value={editingItem.buyPrice ?? 50}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, buyPrice: Number(e.target.value) || 0 })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-bold tabular-nums"
                      />
                    </div>

                    <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                      <label className="text-[11px] text-zinc-400 block mb-1 font-sans">
                        Preço de Venda ({getCurrencyMeta(editingItem.currencyType).label}):
                      </label>
                      <input
                        type="number"
                        value={editingItem.sellPrice ?? 25}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, sellPrice: Number(e.target.value) || 0 })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-emerald-300 font-bold tabular-nums"
                      />
                    </div>

                    <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                      <label className="text-[11px] text-zinc-400 block mb-1 font-sans">
                        Limite Máximo por Slot (Stack):
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={editingItem.maxStack ?? 99}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            maxStack: Number(e.target.value) || 1,
                            stackable: Number(e.target.value) > 1,
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white font-bold tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Flags de Proteção */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingItem.stackable !== false}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, stackable: e.target.checked })
                        }
                        className="accent-amber-500"
                      />
                      <div>
                        <span className="font-bold text-white block">Empilhável no Slot</span>
                        <span className="text-[10px] text-zinc-400">
                          Agrupa múltiplos no mesmo slot
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingItem.isUnique)}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, isUnique: e.target.checked })
                        }
                        className="accent-amber-500"
                      />
                      <div>
                        <span className="font-bold text-white block">Item Único</span>
                        <span className="text-[10px] text-zinc-400">
                          Apenas 1 exemplar permitido
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingItem.isQuestProtected)}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, isQuestProtected: e.target.checked })
                        }
                        className="accent-amber-500"
                      />
                      <div>
                        <span className="font-bold text-white block">Protegido de Quest</span>
                        <span className="text-[10px] text-zinc-400">Não pode ser descartado</span>
                      </div>
                    </label>
                  </div>

                  {/* Ações Permitidas na Mochila */}
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2.5">
                    <span className="text-xs font-bold text-white block">
                      Ações Interativas Habilitadas na Mochila
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {ALL_ITEM_ACTIONS.map((act) => {
                        const isChecked = (editingItem.usableActions || []).includes(act.id);
                        return (
                          <button
                            key={act.id}
                            type="button"
                            onClick={() => {
                              const current = editingItem.usableActions || [];
                              const next = isChecked
                                ? current.filter((a) => a !== act.id)
                                : [...current, act.id];
                              setEditingItem({ ...editingItem, usableActions: next });
                            }}
                            className={`p-2 rounded-lg border text-left text-xs font-semibold transition-colors cursor-pointer ${
                              isChecked
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {act.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 4: EFEITOS DE CURA & COMBATE */}
              {advancedModalTab === 'atributos' && (
                <div className="space-y-4">
                  {/* Bloco de Efeitos ao Consumir */}
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                    <span className="text-xs font-bold text-rose-300 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-400" />
                      <span>Efeitos ao Consumir / Usar (Poções, Comidas e Coletáveis)</span>
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Restaura HP:</label>
                        <input
                          type="number"
                          value={editingItem.consumableEffect?.hpRestore ?? 0}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              consumableEffect: {
                                ...(editingItem.consumableEffect || {}),
                                hpRestore: Number(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-rose-300 font-bold tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Restaura MP:</label>
                        <input
                          type="number"
                          value={editingItem.consumableEffect?.manaRestore ?? 0}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              consumableEffect: {
                                ...(editingItem.consumableEffect || {}),
                                manaRestore: Number(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-blue-300 font-bold tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">
                          Boost Velocidade:
                        </label>
                        <input
                          type="number"
                          value={editingItem.consumableEffect?.speedBoost ?? 0}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              consumableEffect: {
                                ...(editingItem.consumableEffect || {}),
                                speedBoost: Number(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-bold tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">
                          Duração (seg):
                        </label>
                        <input
                          type="number"
                          value={editingItem.consumableEffect?.durationSec ?? 0}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              consumableEffect: {
                                ...(editingItem.consumableEffect || {}),
                                durationSec: Number(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-bold tabular-nums"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        Mensagem de Feedback ao Usar (Opcional):
                      </label>
                      <input
                        type="text"
                        value={editingItem.consumableEffect?.customMessage || ''}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            consumableEffect: {
                              ...(editingItem.consumableEffect || {}),
                              customMessage: e.target.value,
                            },
                          })
                        }
                        placeholder="Ex: Você sentiu uma energia ancestral percorrer seu corpo!"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200"
                      />
                    </div>
                  </div>

                  {/* Bloco de Atributos de Equipamento */}
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-2">
                      <Swords className="w-4 h-4 text-amber-400" />
                      <span>Atributos de Equipamento (Armas, Armaduras e Acessórios)</span>
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">
                          Slot de Equip.:
                        </label>
                        <select
                          value={editingItem.equipmentStats?.slot || 'weapon'}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              equipmentStats: {
                                ...(editingItem.equipmentStats || {}),
                                slot: e.target.value as any,
                              },
                            })
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white font-sans font-semibold"
                        >
                          <option value="weapon">Arma</option>
                          <option value="armor">Armadura</option>
                          <option value="accessory">Acessório</option>
                          <option value="helmet">Elmo</option>
                          <option value="boots">Botas</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">+ Ataque:</label>
                        <input
                          type="number"
                          value={editingItem.equipmentStats?.attack ?? 0}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              equipmentStats: {
                                slot: editingItem.equipmentStats?.slot || 'weapon',
                                ...(editingItem.equipmentStats || {}),
                                attack: Number(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-bold tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">+ Defesa:</label>
                        <input
                          type="number"
                          value={editingItem.equipmentStats?.defense ?? 0}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              equipmentStats: {
                                slot: editingItem.equipmentStats?.slot || 'armor',
                                ...(editingItem.equipmentStats || {}),
                                defense: Number(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-blue-300 font-bold tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">
                          + Velocidade:
                        </label>
                        <input
                          type="number"
                          value={editingItem.equipmentStats?.speed ?? 0}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              equipmentStats: {
                                slot: editingItem.equipmentStats?.slot || 'boots',
                                ...(editingItem.equipmentStats || {}),
                                speed: Number(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-bold tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 5: LEITURA & ENTREGA DE QUESTS */}
              {advancedModalTab === 'leitura_quests' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                    <span className="text-xs font-bold text-blue-300 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-400" />
                      <span>Conteúdo de Leitura (Para Livros, Cartas, Diários e Pergaminhos)</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">
                          Título do Documento / Livro:
                        </label>
                        <input
                          type="text"
                          value={editingItem.readableContent?.title || ''}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              readableContent: {
                                type: editingItem.readableContent?.type || 'book',
                                pages: editingItem.readableContent?.pages || [
                                  { pageNumber: 1, text: '' },
                                ],
                                ...(editingItem.readableContent || {}),
                                title: e.target.value,
                              },
                            })
                          }
                          placeholder="Ex: Diário do Guardião Antigo"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">
                          Autor / Origem:
                        </label>
                        <input
                          type="text"
                          value={editingItem.readableContent?.author || ''}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              readableContent: {
                                type: editingItem.readableContent?.type || 'book',
                                pages: editingItem.readableContent?.pages || [
                                  { pageNumber: 1, text: '' },
                                ],
                                ...(editingItem.readableContent || {}),
                                author: e.target.value,
                              },
                            })
                          }
                          placeholder="Ex: Mestre Alquimista"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        Texto da Página Principal:
                      </label>
                      <textarea
                        rows={4}
                        value={editingItem.readableContent?.pages?.[0]?.text || ''}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            readableContent: {
                              type: editingItem.readableContent?.type || 'book',
                              title: editingItem.readableContent?.title || editingItem.name,
                              ...(editingItem.readableContent || {}),
                              pages: [{ pageNumber: 1, text: e.target.value }],
                            },
                          })
                        }
                        placeholder="Escreva o conteúdo que aparece quando o jogador clica em 'Ler' na mochila..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 resize-none"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                    <span className="text-xs font-bold text-purple-300 block">
                      🎁 Vínculo com Entrega de Quests &amp; Eventos da Fase
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">
                          ID de Quest Vinculada (Item Entregável):
                        </label>
                        <input
                          type="text"
                          value={editingItem.linkedQuestId || ''}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, linkedQuestId: e.target.value })
                          }
                          placeholder="Ex: quest_porta_antiga"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">
                          ID de Evento / Diálogo ao Usar ou Entregar:
                        </label>
                        <input
                          type="text"
                          value={editingItem.linkedEventId || ''}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, linkedEventId: e.target.value })
                          }
                          placeholder="Ex: event_abrir_portal"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé do Pop-up Avançado */}
            <div className="px-6 py-4 bg-zinc-900/90 border-t border-zinc-850 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSaveItemRegistration(editingItem);
                    handleSpawnItemNearPlayer(
                      editingItem.name,
                      editingItem.iconPng,
                      editingItem.iconEmoji,
                      1
                    );
                  }}
                  className="px-3.5 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Salvar &amp; Testar Spawn Perto do Herói</span>
                </button>

                {resolveItemStateTags(editingItem).includes('natural_biome_spawn') && (
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveItemRegistration(editingItem);
                      handleGenerateNaturalBiomeSpawns(editingItem);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-lime-500/20 hover:bg-lime-500/30 border border-lime-500/40 text-lime-300 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Trees className="w-3.5 h-3.5" />
                    <span>Salvar &amp; Gerar nos Biomas</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveItemRegistration(editingItem)}
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Ficha Completa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
