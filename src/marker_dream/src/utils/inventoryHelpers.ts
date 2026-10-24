import type {
  MapProject,
  PlayerInventoryConfig,
  PlayerInventoryItem,
  InventoryItemDefinition,
  InventoryItemCategory,
  InventoryItemRarity,
  InventoryItemAction,
  InventoryProject,
  ItemStateTag,
  ItemCurrencyType,
  MarkerMotionLayer,
  PlayerConfig,
  GalleryAsset,
} from '../types/map';
import { readUploadedImage } from './tileGenerator';
import { dehydrateObjectAssetsToDisk } from '../../../core/DiskAssetEngine';

export const INVENTORY_PROJECTS_STORAGE_KEY = 'marker_dream_inventory_projects_v1';

export interface ItemStateTagMeta {
  id: ItemStateTag;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
  badgeClass: string;
  activeBtnClass: string;
}

export const ITEM_STATE_TAGS_METADATA: ItemStateTagMeta[] = [
  {
    id: 'collectible',
    label: 'Coletável no Mapa',
    shortLabel: 'Coletável',
    emoji: '🖐️',
    description: 'Pode ser recolhido pelo jogador no chão das fases (por proximidade ou clique).',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    activeBtnClass: 'bg-amber-500/25 text-amber-200 border-amber-400',
  },
  {
    id: 'storable',
    label: 'Armazenável (Mochila/Baú)',
    shortLabel: 'Armazenável',
    emoji: '🎒',
    description: 'Pode ser guardado nos slots da mochila do herói ou baús de acampamento.',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
    activeBtnClass: 'bg-blue-500/25 text-blue-200 border-blue-400',
  },
  {
    id: 'deliverable',
    label: 'Entregável (Quest / NPC)',
    shortLabel: 'Entregável',
    emoji: '🎁',
    description: 'Pode ser entregue a NPCs para concluir missões, encomendas ou diálogos.',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
    activeBtnClass: 'bg-purple-500/25 text-purple-200 border-purple-400',
  },
  {
    id: 'equipable',
    label: 'Equipável pelo Herói',
    shortLabel: 'Equipável',
    emoji: '⚔️',
    description: 'Pode ser equipado em slots de Arma, Armadura, Elmo, Botas ou Acessório.',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    activeBtnClass: 'bg-rose-500/25 text-rose-200 border-rose-400',
  },
  {
    id: 'consumable',
    label: 'Consumível (Efeito Imediato)',
    shortLabel: 'Consumível',
    emoji: '🧪',
    description: 'Consumido ao usar na mochila para restaurar HP, MP ou conceder bônus.',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    activeBtnClass: 'bg-emerald-500/25 text-emerald-200 border-emerald-400',
  },
  {
    id: 'tradable',
    label: 'Vendável / Trocável',
    shortLabel: 'Vendável/Trocável',
    emoji: '🤝',
    description: 'Pode ser vendido em mercadores ou trocado com NPCs e estações.',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
    activeBtnClass: 'bg-cyan-500/25 text-cyan-200 border-cyan-400',
  },
  {
    id: 'buyable',
    label: 'Comprável em Lojas',
    shortLabel: 'Comprável',
    emoji: '🪙',
    description: 'Disponível para compra em lojas/mercadores com a moeda configurada.',
    badgeClass: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40',
    activeBtnClass: 'bg-yellow-500/25 text-yellow-200 border-yellow-400',
  },
  {
    id: 'natural_biome_spawn',
    label: 'Spawn Natural por Bioma',
    shortLabel: 'Spawn Bioma',
    emoji: '🌿',
    description: 'Gera automaticamente nas faixas dos biomas selecionados na fase.',
    badgeClass: 'bg-lime-500/15 text-lime-300 border-lime-500/40',
    activeBtnClass: 'bg-lime-500/25 text-lime-200 border-lime-400',
  },
  {
    id: 'motion_item',
    label: 'Motion Item (Roupa/Peça Animada)',
    shortLabel: 'Motion Item',
    emoji: '🎬',
    description: 'Vincula este item a camadas do Motion Canvas (roupas, skins, cintos, armas, asas) que são reveladas no herói ao adquirir ou equipar.',
    badgeClass: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/50',
    activeBtnClass: 'bg-fuchsia-500/30 text-fuchsia-200 border-fuchsia-400',
  },
];

export interface ItemCurrencyMeta {
  id: ItemCurrencyType;
  label: string;
  shortLabel: string;
  emoji: string;
  symbol: string;
  colorClass: string;
}

export const ITEM_CURRENCIES_METADATA: ItemCurrencyMeta[] = [
  {
    id: 'gold',
    label: 'Moedas de Ouro',
    shortLabel: 'Ouro',
    emoji: '🪙',
    symbol: 'g',
    colorClass: 'text-amber-300 border-amber-500/40 bg-amber-500/15',
  },
  {
    id: 'gems',
    label: 'Gemas / Diamantes',
    shortLabel: 'Gemas',
    emoji: '💎',
    symbol: '💎',
    colorClass: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/15',
  },
  {
    id: 'crystals',
    label: 'Cristais Arcanos',
    shortLabel: 'Cristais',
    emoji: '🔮',
    symbol: '🔮',
    colorClass: 'text-purple-300 border-purple-500/40 bg-purple-500/15',
  },
  {
    id: 'tokens',
    label: 'Fichas de Guilda',
    shortLabel: 'Fichas',
    emoji: '🎟️',
    symbol: 'tk',
    colorClass: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/15',
  },
  {
    id: 'souls',
    label: 'Essência / Almas',
    shortLabel: 'Almas',
    emoji: '🔥',
    symbol: '🔥',
    colorClass: 'text-rose-300 border-rose-500/40 bg-rose-500/15',
  },
  {
    id: 'barter',
    label: 'Escambo (Troca por Item)',
    shortLabel: 'Escambo',
    emoji: '🤝',
    symbol: 'troca',
    colorClass: 'text-orange-300 border-orange-500/40 bg-orange-500/15',
  },
];

export function getCurrencyMeta(currencyType?: ItemCurrencyType): ItemCurrencyMeta {
  return (
    ITEM_CURRENCIES_METADATA.find((c) => c.id === (currencyType || 'gold')) ||
    ITEM_CURRENCIES_METADATA[0]
  );
}

export function resolveItemStateTags(item?: Partial<InventoryItemDefinition>): ItemStateTag[] {
  if (!item) return ['collectible', 'storable'];
  if (Array.isArray(item.stateTags) && item.stateTags.length > 0) {
    return item.stateTags;
  }

  const tags = new Set<ItemStateTag>(['collectible', 'storable']);
  const cat = item.category || 'collectible';
  const actions = item.usableActions || [];

  if (
    cat === 'weapon' ||
    cat === 'armor' ||
    cat === 'accessory' ||
    cat === 'equipment' ||
    actions.includes('equip')
  ) {
    tags.add('equipable');
  }

  if (
    cat === 'potion' ||
    cat === 'consumable' ||
    actions.includes('use') ||
    (item.consumableEffect?.hpRestore ?? 0) > 0 ||
    (item.consumableEffect?.manaRestore ?? 0) > 0
  ) {
    tags.add('consumable');
  }

  if (cat === 'quest' || cat === 'key' || actions.includes('deliver') || item.linkedQuestId) {
    tags.add('deliverable');
  }

  if (!item.isQuestProtected && (item.sellPrice ?? 25) > 0) {
    tags.add('tradable');
  }

  if ((item.buyPrice ?? 50) > 0) {
    tags.add('buyable');
  }

  if (item.naturalBiomeSpawn?.enabled) {
    tags.add('natural_biome_spawn');
  }

  return Array.from(tags);
}

export const DEFAULT_ITEM_CATALOG: InventoryItemDefinition[] = [
  {
    id: 'item-sword-starter',
    name: 'Espada do Herói',
    shortDescription: 'Lâmina afiada forjada pelos ferreiros do reino central.',
    iconEmoji: '⚔️',
    category: 'weapon',
    rarity: 'uncommon',
    stackable: false,
    maxStack: 1,
    buyPrice: 120,
    sellPrice: 60,
    currencyType: 'gold',
    stateTags: ['collectible', 'storable', 'equipable', 'buyable', 'tradable'],
    usableActions: ['equip', 'inspect', 'drop'],
    equipmentStats: { slot: 'weapon', attack: 14, speed: 2 },
  },
  {
    id: 'item-shield-starter',
    name: 'Escudo do Guardião',
    shortDescription: 'Escudo de carvalho reforçado com bordas de ferro batido.',
    iconEmoji: '🛡️',
    category: 'armor',
    rarity: 'common',
    stackable: false,
    maxStack: 1,
    buyPrice: 90,
    sellPrice: 45,
    currencyType: 'gold',
    stateTags: ['collectible', 'storable', 'equipable', 'buyable', 'tradable'],
    usableActions: ['equip', 'inspect', 'drop'],
    equipmentStats: { slot: 'armor', defense: 8 },
  },
  {
    id: 'item-potion-health',
    name: 'Poção de Vida Menor',
    shortDescription: 'Restaura instantaneamente a energia vital do herói.',
    iconEmoji: '🧪',
    category: 'potion',
    rarity: 'common',
    stackable: true,
    maxStack: 10,
    buyPrice: 35,
    sellPrice: 15,
    currencyType: 'gold',
    stateTags: ['collectible', 'storable', 'consumable', 'buyable', 'tradable'],
    usableActions: ['use', 'inspect', 'drop'],
    consumableEffect: { hpRestore: 50 },
  },
  {
    id: 'item-key-bronze',
    name: 'Chave de Bronze do Portão',
    shortDescription: 'Abre passagens secretas e arcas trancadas encontradas nas fases.',
    iconEmoji: '🔑',
    category: 'key',
    rarity: 'uncommon',
    stackable: true,
    maxStack: 5,
    buyPrice: 80,
    sellPrice: 40,
    currencyType: 'tokens',
    stateTags: ['collectible', 'storable', 'deliverable', 'buyable'],
    usableActions: ['use', 'deliver', 'inspect'],
  },
  {
    id: 'item-apple-mystic',
    name: 'Maçã Dourada Mística',
    shortDescription: 'Fruto colhido nos bosques eternos. Concede vitalidade temporária.',
    iconEmoji: '🍎',
    category: 'collectible',
    rarity: 'rare',
    stackable: true,
    maxStack: 20,
    buyPrice: 50,
    sellPrice: 25,
    currencyType: 'gold',
    stateTags: [
      'collectible',
      'storable',
      'consumable',
      'tradable',
      'buyable',
      'natural_biome_spawn',
    ],
    naturalBiomeSpawn: {
      enabled: true,
      biomeIds: ['b1', 'forest', 'grass'],
      spawnDensityPerBiome: 3,
      spawnChancePercent: 85,
      avoidPaths: true,
    },
    usableActions: ['use', 'inspect', 'drop'],
    consumableEffect: { hpRestore: 25, manaRestore: 15 },
  },
];

export const DEFAULT_PLAYER_INVENTORY: PlayerInventoryConfig = {
  enabled: true,
  maxSlots: 25,
  columns: 5,
  currencies: {
    gold: 150,
    gems: 10,
  },
  equippedWeaponId: 'item-sword-starter',
  equippedArmorId: 'item-shield-starter',
  equippedAccessoryId: null,
  items: [
    {
      id: 'item-sword-starter',
      name: 'Espada do Herói',
      description: 'Lâmina afiada forjada pelos ferreiros do reino central.',
      iconEmoji: '⚔️',
      quantity: 1,
      type: 'weapon',
      rarity: 'uncommon',
      equipped: true,
      slotIndex: 0,
      currencyType: 'gold',
      stateTags: ['collectible', 'storable', 'equipable', 'buyable', 'tradable'],
      stats: { attack: 14, speed: 2 },
    },
    {
      id: 'item-shield-starter',
      name: 'Escudo do Guardião',
      description: 'Escudo de carvalho reforçado com bordas de ferro batido.',
      iconEmoji: '🛡️',
      quantity: 1,
      type: 'armor',
      rarity: 'common',
      equipped: true,
      slotIndex: 1,
      currencyType: 'gold',
      stateTags: ['collectible', 'storable', 'equipable', 'buyable', 'tradable'],
      stats: { defense: 8 },
    },
    {
      id: 'item-potion-health',
      name: 'Poção de Vida Menor',
      description: 'Restaura instantaneamente a energia vital do herói.',
      iconEmoji: '🧪',
      quantity: 3,
      maxStack: 10,
      type: 'potion',
      rarity: 'common',
      slotIndex: 2,
      currencyType: 'gold',
      stateTags: ['collectible', 'storable', 'consumable', 'buyable', 'tradable'],
      stats: { healthRestore: 50 },
    },
    {
      id: 'item-key-bronze',
      name: 'Chave de Bronze do Portão',
      description: 'Abre passagens secretas e arcas trancadas encontradas nas fases.',
      iconEmoji: '🔑',
      quantity: 1,
      type: 'key',
      rarity: 'uncommon',
      slotIndex: 3,
      currencyType: 'tokens',
      stateTags: ['collectible', 'storable', 'deliverable', 'buyable'],
    },
    {
      id: 'item-apple-mystic',
      name: 'Maçã Dourada Mística',
      description: 'Fruto colhido nos bosques eternos. Concede vitalidade temporária.',
      iconEmoji: '🍎',
      quantity: 5,
      maxStack: 20,
      type: 'collectible',
      rarity: 'rare',
      slotIndex: 4,
      currencyType: 'gold',
      stateTags: [
        'collectible',
        'storable',
        'consumable',
        'tradable',
        'buyable',
        'natural_biome_spawn',
      ],
    },
  ],
};

export const DEFAULT_INVENTORY_PROJECTS: InventoryProject[] = [
  {
    id: 'inv_proj_rpg_main',
    name: 'Inventário RPG Principal',
    description:
      'Projeto padrão de aventura com armas iniciais, poções de cura, chaves e itens coletáveis.',
    themeColor: '#f59e0b',
    createdAt: '2026-10-20T12:00:00.000Z',
    updatedAt: '2026-10-20T12:00:00.000Z',
    itemCatalog: DEFAULT_ITEM_CATALOG,
    interactiveAssets: [],
    playerInventory: DEFAULT_PLAYER_INVENTORY,
  },
  {
    id: 'inv_proj_survival_craft',
    name: 'Sobrevivência & Coleta Natural',
    description:
      'Inventário de exploração focado em ervas medicinais, madeira, cristais, frutas e recursos com Spawn Natural por Bioma.',
    themeColor: '#10b981',
    createdAt: '2026-10-20T12:05:00.000Z',
    updatedAt: '2026-10-20T12:05:00.000Z',
    itemCatalog: [
      {
        id: 'item-wood-oak',
        name: 'Tronco de Carvalho Antigo',
        shortDescription: 'Madeira nobre coletada nas florestas densas para construção e fogueiras.',
        iconEmoji: '🪵',
        category: 'material',
        rarity: 'common',
        stackable: true,
        maxStack: 99,
        buyPrice: 12,
        sellPrice: 6,
        currencyType: 'gold',
        stateTags: ['collectible', 'storable', 'tradable', 'deliverable', 'natural_biome_spawn'],
        naturalBiomeSpawn: {
          enabled: true,
          biomeIds: ['b1', 'forest', 'grass'],
          spawnDensityPerBiome: 4,
          spawnChancePercent: 90,
          avoidPaths: true,
        },
        usableActions: ['deliver', 'inspect', 'drop'],
      },
      {
        id: 'item-herb-emerald',
        name: 'Erva Esmeralda da Vida',
        shortDescription: 'Planta medicinal luminosa que regenera 35 HP ao ser consumida.',
        iconEmoji: '🌿',
        category: 'consumable',
        rarity: 'uncommon',
        stackable: true,
        maxStack: 50,
        buyPrice: 28,
        sellPrice: 14,
        currencyType: 'gold',
        stateTags: [
          'collectible',
          'storable',
          'consumable',
          'tradable',
          'buyable',
          'natural_biome_spawn',
        ],
        naturalBiomeSpawn: {
          enabled: true,
          biomeIds: ['b1', 'b2', 'forest', 'swamp'],
          spawnDensityPerBiome: 3,
          spawnChancePercent: 80,
          avoidPaths: true,
        },
        usableActions: ['use', 'inspect', 'drop'],
        consumableEffect: { hpRestore: 35 },
      },
      {
        id: 'item-crystal-mana',
        name: 'Cristal de Orvalho Lunar',
        shortDescription: 'Fragmento cristalino encontrado perto de rios que restaura 40 MP.',
        iconEmoji: '💎',
        category: 'collectible',
        rarity: 'rare',
        stackable: true,
        maxStack: 30,
        buyPrice: 15,
        sellPrice: 8,
        currencyType: 'gems',
        stateTags: [
          'collectible',
          'storable',
          'consumable',
          'deliverable',
          'tradable',
          'buyable',
          'natural_biome_spawn',
        ],
        naturalBiomeSpawn: {
          enabled: true,
          biomeIds: ['b2', 'b3', 'snow', 'water', 'mountain'],
          spawnDensityPerBiome: 2,
          spawnChancePercent: 65,
          avoidPaths: true,
        },
        usableActions: ['use', 'deliver', 'inspect', 'drop'],
        consumableEffect: { manaRestore: 40 },
      },
      {
        id: 'item-pickaxe-explorer',
        name: 'Picareta do Explorador',
        shortDescription:
          'Ferramenta resistente para extrair minérios raros e abrir trilhas rochosas.',
        iconEmoji: '⛏️',
        category: 'weapon',
        rarity: 'uncommon',
        stackable: false,
        maxStack: 1,
        buyPrice: 110,
        sellPrice: 55,
        currencyType: 'gold',
        stateTags: ['collectible', 'storable', 'equipable', 'buyable', 'tradable'],
        usableActions: ['equip', 'inspect'],
        equipmentStats: { slot: 'weapon', attack: 11, defense: 3 },
      },
    ],
    interactiveAssets: [],
    playerInventory: {
      enabled: true,
      maxSlots: 30,
      columns: 5,
      currencies: { gold: 90, gems: 5 },
      equippedWeaponId: 'item-pickaxe-explorer',
      equippedArmorId: null,
      equippedAccessoryId: null,
      items: [
        {
          id: 'item-pickaxe-explorer',
          name: 'Picareta do Explorador',
          description:
            'Ferramenta resistente para extrair minérios raros e abrir trilhas rochosas.',
          iconEmoji: '⛏️',
          quantity: 1,
          type: 'weapon',
          rarity: 'uncommon',
          equipped: true,
          slotIndex: 0,
          stats: { attack: 11, defense: 3 },
        },
        {
          id: 'item-herb-emerald',
          name: 'Erva Esmeralda da Vida',
          description: 'Planta medicinal luminosa que regenera 35 HP ao ser consumida.',
          iconEmoji: '🌿',
          quantity: 6,
          maxStack: 50,
          type: 'potion',
          rarity: 'uncommon',
          slotIndex: 1,
          stats: { healthRestore: 35 },
        },
        {
          id: 'item-wood-oak',
          name: 'Tronco de Carvalho Antigo',
          description: 'Madeira nobre coletada nas florestas densas para construção e fogueiras.',
          iconEmoji: '🪵',
          quantity: 12,
          maxStack: 99,
          type: 'material',
          rarity: 'common',
          slotIndex: 2,
        },
      ],
    },
  },
  {
    id: 'inv_proj_arcane_dungeon',
    name: 'Relíquias & Masmorra Arcana',
    description:
      'Projeto de inventário focado em grimórios, pergaminhos mágicos, elixires e artefatos lendários.',
    themeColor: '#8b5cf6',
    createdAt: '2026-10-20T12:10:00.000Z',
    updatedAt: '2026-10-20T12:10:00.000Z',
    itemCatalog: [
      {
        id: 'item-staff-astral',
        name: 'Cajado Estelar de Orion',
        shortDescription: 'Canaliza energia cósmica ampliando o poder mágico do portador.',
        iconEmoji: '🪄',
        category: 'weapon',
        rarity: 'epic',
        stackable: false,
        maxStack: 1,
        buyPrice: 45,
        sellPrice: 20,
        currencyType: 'crystals',
        stateTags: ['collectible', 'storable', 'equipable', 'buyable', 'tradable'],
        usableActions: ['equip', 'inspect'],
        equipmentStats: { slot: 'weapon', attack: 26, speed: 3 },
      },
      {
        id: 'item-elixir-solar',
        name: 'Elixir Solar Supremo',
        shortDescription: 'Restaura 100 HP e 80 MP simultaneamente com brilho dourado.',
        iconEmoji: '✨',
        category: 'potion',
        rarity: 'legendary',
        stackable: true,
        maxStack: 10,
        buyPrice: 25,
        sellPrice: 12,
        currencyType: 'gems',
        stateTags: ['collectible', 'storable', 'consumable', 'buyable', 'tradable'],
        usableActions: ['use', 'inspect', 'drop'],
        consumableEffect: { hpRestore: 100, manaRestore: 80 },
      },
      {
        id: 'item-scroll-ancient',
        name: 'Pergaminho do Portal Antigo',
        shortDescription: 'Inscrições rúnicas usadas para destrancar santuários ocultos.',
        iconEmoji: '📜',
        category: 'quest',
        rarity: 'rare',
        stackable: true,
        maxStack: 5,
        buyPrice: 150,
        sellPrice: 75,
        currencyType: 'souls',
        stateTags: ['collectible', 'storable', 'deliverable', 'natural_biome_spawn'],
        naturalBiomeSpawn: {
          enabled: true,
          biomeIds: ['b3', 'dungeon', 'ruins'],
          spawnDensityPerBiome: 1,
          spawnChancePercent: 50,
          avoidPaths: false,
        },
        usableActions: ['read', 'deliver', 'use', 'inspect'],
      },
    ],
    interactiveAssets: [],
    playerInventory: {
      enabled: true,
      maxSlots: 20,
      columns: 5,
      currencies: { gold: 420, gems: 35 },
      equippedWeaponId: 'item-staff-astral',
      equippedArmorId: null,
      equippedAccessoryId: null,
      items: [
        {
          id: 'item-staff-astral',
          name: 'Cajado Estelar de Orion',
          description: 'Canaliza energia cósmica ampliando o poder mágico do portador.',
          iconEmoji: '🪄',
          quantity: 1,
          type: 'weapon',
          rarity: 'epic',
          equipped: true,
          slotIndex: 0,
          stats: { attack: 26, speed: 3 },
        },
        {
          id: 'item-elixir-solar',
          name: 'Elixir Solar Supremo',
          description: 'Restaura 100 HP e 80 MP simultaneamente com brilho dourado.',
          iconEmoji: '✨',
          quantity: 2,
          maxStack: 10,
          type: 'potion',
          rarity: 'legendary',
          slotIndex: 1,
          stats: { healthRestore: 100 },
        },
      ],
    },
  },
];

export function loadInventoryProjects(project?: MapProject): InventoryProject[] {
  if (project?.savedInventoryProjects && project.savedInventoryProjects.length > 0) {
    return project.savedInventoryProjects;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem(INVENTORY_PROJECTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar projetos de inventário do localStorage:', e);
    }
  }

  if (project?.itemCatalog && project.itemCatalog.length > 0) {
    const customFirst: InventoryProject = {
      id: project.activeInventoryProjectId || 'inv_proj_rpg_main',
      name: DEFAULT_INVENTORY_PROJECTS[0].name,
      description: DEFAULT_INVENTORY_PROJECTS[0].description,
      themeColor: '#f59e0b',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      itemCatalog: project.itemCatalog,
      interactiveAssets: (project.galleryAssets || []).filter(
        (a) =>
          a.category === 'Itens de Inventário/Exploração' ||
          a.category === 'Itens Interativos' ||
          a.id.startsWith('asset-item-')
      ),
      playerInventory: getOrCreatePlayerInventory(project),
    };
    return [customFirst, ...DEFAULT_INVENTORY_PROJECTS.slice(1)];
  }

  return DEFAULT_INVENTORY_PROJECTS;
}

export function saveInventoryProjectsToStorage(projects: InventoryProject[]): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(INVENTORY_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.warn('Erro ao salvar projetos de inventário no localStorage:', e);
    }
  }
  dehydrateObjectAssetsToDisk(projects, 'items')
    .then((cleanProjects) =>
      fetch('/api/save-engine-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: INVENTORY_PROJECTS_STORAGE_KEY, data: cleanProjects }),
      })
    )
    .catch(() => {});
}

export function getOrCreatePlayerInventory(project: MapProject): PlayerInventoryConfig {
  if (project.playerInventory && project.playerInventory.items) {
    return project.playerInventory;
  }
  if (project.player?.inventory && project.player.inventory.items) {
    return project.player.inventory;
  }
  return DEFAULT_PLAYER_INVENTORY;
}

export function getOrCreateItemCatalog(project: MapProject): InventoryItemDefinition[] {
  if (project.itemCatalog && project.itemCatalog.length > 0) {
    return project.itemCatalog;
  }
  return DEFAULT_ITEM_CATALOG;
}

export function addItemToPlayerInventory(
  inventory: PlayerInventoryConfig,
  catalog: InventoryItemDefinition[],
  catalogItemId: string,
  amount: number = 1
): { inventory: PlayerInventoryConfig; added: boolean } {
  const def = catalog.find((c) => c.id === catalogItemId);
  if (!def) {
    return { inventory, added: false };
  }

  const itemsCopy: PlayerInventoryItem[] = inventory.items.map((it) => ({ ...it }));
  const isStackable = def.stackable !== false;
  const maxStack = def.maxStack || 99;

  if (isStackable) {
    const existingIdx = itemsCopy.findIndex(
      (it) =>
        it.id === def.id ||
        it.name.toLowerCase() === def.name.toLowerCase() ||
        (def.iconPng && it.iconPng === def.iconPng)
    );
    if (existingIdx >= 0) {
      itemsCopy[existingIdx] = {
        ...itemsCopy[existingIdx],
        quantity: Math.min(maxStack, (itemsCopy[existingIdx].quantity || 1) + amount),
        iconPng: def.iconPng || itemsCopy[existingIdx].iconPng,
      };
      return {
        inventory: {
          ...inventory,
          items: itemsCopy,
        },
        added: true,
      };
    }
  }

  const usedSlots = new Set(
    itemsCopy.map((it, idx) => (typeof it.slotIndex === 'number' ? it.slotIndex : idx))
  );
  let targetSlot = 0;
  while (usedSlots.has(targetSlot) && targetSlot < (inventory.maxSlots || 30)) {
    targetSlot++;
  }

  const mappedType: PlayerInventoryItem['type'] =
    def.category === 'weapon'
      ? 'weapon'
      : def.category === 'armor'
      ? 'armor'
      : def.category === 'accessory'
      ? 'accessory'
      : def.category === 'potion' || def.category === 'consumable'
      ? 'potion'
      : def.category === 'key' || def.category === 'quest'
      ? 'key'
      : def.category === 'material'
      ? 'material'
      : 'collectible';

  const newItem: PlayerInventoryItem = {
    id: def.id,
    name: def.name,
    description: def.shortDescription || 'Item coletado no mapa.',
    iconPng: def.iconPng,
    iconEmoji: def.iconEmoji || '📦',
    quantity: Math.max(1, amount),
    maxStack,
    type: mappedType,
    rarity: def.rarity || 'common',
    slotIndex: targetSlot,
    currencyType: def.currencyType || 'gold',
    stateTags: resolveItemStateTags(def),
    naturalBiomeSpawn: def.naturalBiomeSpawn,
    stats: {
      attack: def.equipmentStats?.attack,
      defense: def.equipmentStats?.defense,
      speed: def.equipmentStats?.speed,
      healthRestore: def.consumableEffect?.hpRestore,
    },
    motionLayerTag: def.motionLayerTag,
    motionEquipSlot: def.motionEquipSlot,
  };

  return {
    inventory: {
      ...inventory,
      items: [...itemsCopy, newItem],
    },
    added: true,
  };
}

/**
 * Filtra as camadas do Motion Canvas do personagem em tempo real durante o jogo:
 * - Camadas sem `inventoryItemTag` ou com `gameVisibilityRule === 'always'` permanecem visíveis (desde que `layer.visible !== false`).
 * - Camadas agrupadas por `inventoryItemTag` ficam ocultas em jogo até que o item correspondente seja adquirido (`when_acquired`) ou equipado (`when_equipped`).
 * - Múltiplas camadas com a mesma `inventoryItemTag` (ex: Peitoral + Ombreira Esq + Ombreira Dir = 'skin_cavaleiro_solar') são reveladas/equipadas juntas!
 */
export function resolveVisibleMotionLayersForPlayer(
  layers: MarkerMotionLayer[] | undefined,
  player?: PlayerConfig,
  playerInventory?: PlayerInventoryConfig,
  mapCollectedItems?: { id: string; name: string; count: number; iconPng?: string }[],
  itemCatalog?: InventoryItemDefinition[]
): MarkerMotionLayer[] {
  if (!layers || layers.length === 0) return [];

  const equippedTags = new Set<string>(
    (player?.equippedMotionTags || []).map((t) => t.trim().toLowerCase()).filter(Boolean)
  );
  const unlockedTags = new Set<string>(
    (player?.unlockedMotionTags || []).map((t) => t.trim().toLowerCase()).filter(Boolean)
  );

  const invItems = playerInventory?.items || player?.inventory?.items || [];
  const catalog = itemCatalog || [];

  // Mapear itens da mochila do jogador e itens coletados na fase
  for (const item of invItems) {
    if ((item.quantity ?? 1) <= 0) continue;
    const def = catalog.find(
      (c) => c.id === item.definitionId || c.id === item.id || c.name.toLowerCase() === item.name.toLowerCase()
    );
    const tag = (item.motionLayerTag || def?.motionLayerTag || '').trim().toLowerCase();
    const idNorm = (item.id || '').trim().toLowerCase();
    const nameNorm = (item.name || '').trim().toLowerCase();

    if (tag) unlockedTags.add(tag);
    if (idNorm) unlockedTags.add(idNorm);
    if (nameNorm) unlockedTags.add(nameNorm);

    const isEquipped =
      Boolean(item.equipped) ||
      playerInventory?.equippedWeaponId === item.id ||
      playerInventory?.equippedArmorId === item.id ||
      playerInventory?.equippedAccessoryId === item.id;

    if (isEquipped) {
      if (tag) equippedTags.add(tag);
      if (idNorm) equippedTags.add(idNorm);
      if (nameNorm) equippedTags.add(nameNorm);
    }
  }

  // Também considerar itens coletados diretamente na sessão da fase (mapCollectedItems)
  if (mapCollectedItems && mapCollectedItems.length > 0) {
    for (const col of mapCollectedItems) {
      if ((col.count ?? 1) <= 0) continue;
      const def = catalog.find(
        (c) => c.id === col.id || c.name.toLowerCase() === col.name.toLowerCase()
      );
      const tag = (def?.motionLayerTag || '').trim().toLowerCase();
      const idNorm = (col.id || '').trim().toLowerCase();
      const nameNorm = (col.name || '').trim().toLowerCase();
      if (tag) unlockedTags.add(tag);
      if (idNorm) unlockedTags.add(idNorm);
      if (nameNorm) unlockedTags.add(nameNorm);
    }
  }

  return layers.filter((layer) => {
    if (layer.visible === false) return false;
    if (layer.isBaseAsset) return true;

    const rawTag = (layer.inventoryItemTag || '').trim();
    if (!rawTag) return true;

    const rule = layer.gameVisibilityRule || 'when_equipped';
    if (rule === 'always') return true;

    const normTag = rawTag.toLowerCase();
    const linkedId = (layer.linkedItemId || '').trim().toLowerCase();

    if (rule === 'when_acquired') {
      return (
        unlockedTags.has(normTag) ||
        equippedTags.has(normTag) ||
        (Boolean(linkedId) && (unlockedTags.has(linkedId) || equippedTags.has(linkedId)))
      );
    }

    // Default: 'when_equipped'
    return (
      equippedTags.has(normTag) ||
      (Boolean(linkedId) && equippedTags.has(linkedId))
    );
  });
}

/**
 * Cria ou sincroniza automaticamente um Item no Catálogo Global (`project.itemCatalog`)
 * a partir de uma Tag de Motion Item (agrupamento de camadas do Motion Canvas).
 */
export function buildOrUpdateMotionCatalogItem(
  existingCatalog: InventoryItemDefinition[],
  params: {
    tag: string;
    displayName: string;
    equipSlot?: MarkerMotionLayer['equipSlot'];
    iconPng?: string;
    buyPrice?: number;
    rarity?: InventoryItemDefinition['rarity'];
    attackBonus?: number;
    defenseBonus?: number;
  }
): { updatedCatalog: InventoryItemDefinition[]; itemDef: InventoryItemDefinition } {
  const cleanTag = params.tag.trim();
  const itemId = `motion-item-${cleanTag.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;
  const existingIdx = existingCatalog.findIndex(
    (it) => it.motionLayerTag === cleanTag || it.id === itemId
  );

  const slotMap: Record<string, NonNullable<InventoryItemDefinition['equipmentStats']>['slot']> = {
    skin: 'skin',
    head: 'helmet',
    armor: 'armor',
    belt: 'belt',
    boots: 'boots',
    weapon: 'weapon',
    cape: 'cape',
    wings: 'wings',
    accessory: 'accessory',
  };

  const categoryMap: Record<string, InventoryItemDefinition['category']> = {
    weapon: 'weapon',
    skin: 'armor',
    head: 'armor',
    armor: 'armor',
    belt: 'accessory',
    boots: 'armor',
    cape: 'accessory',
    wings: 'accessory',
    accessory: 'accessory',
  };

  const resolvedSlot = params.equipSlot || 'skin';
  const prev = existingIdx >= 0 ? existingCatalog[existingIdx] : undefined;

  const stateTags = Array.from(
    new Set<ItemStateTag>([
      ...(prev?.stateTags || []),
      'motion_item',
      'equipable',
      'storable',
      'buyable',
      'collectible',
      'deliverable',
      'tradable',
    ])
  );

  const itemDef: InventoryItemDefinition = {
    id: prev?.id || itemId,
    name: params.displayName || prev?.name || `Traje: ${cleanTag}`,
    iconPng: params.iconPng || prev?.iconPng,
    iconEmoji:
      resolvedSlot === 'weapon'
        ? '⚔️'
        : resolvedSlot === 'belt'
        ? 'ベルト'
        : resolvedSlot === 'wings'
        ? '🪽'
        : resolvedSlot === 'cape'
        ? '🧣'
        : resolvedSlot === 'head'
        ? '🪖'
        : '🥋',
    shortDescription:
      prev?.shortDescription ||
      `Equipamento visual animado (Motion Item: #${cleanTag}). Revela as camadas correspondentes no personagem ao equipar.`,
    detailedDescription:
      prev?.detailedDescription ||
      `Item conectado diretamente ao Motion Canvas 2D pela tag "${cleanTag}". Pode ser vendido em lojas, entregue em Quests ou equipado na Mochila para ativar a roupa/peça com física em tempo real no herói.`,
    category: categoryMap[resolvedSlot] || 'armor',
    subCategory: resolvedSlot,
    rarity: params.rarity || prev?.rarity || 'epic',
    stackable: false,
    maxStack: 1,
    buyPrice: params.buyPrice ?? prev?.buyPrice ?? 120,
    sellPrice: Math.round((params.buyPrice ?? prev?.buyPrice ?? 120) * 0.5),
    currencyType: prev?.currencyType || 'gold',
    stateTags,
    usableActions: ['equip', 'inspect', 'drop'],
    equipmentStats: {
      slot: slotMap[resolvedSlot] || 'armor',
      attack: params.attackBonus ?? prev?.equipmentStats?.attack ?? (resolvedSlot === 'weapon' ? 15 : 4),
      defense: params.defenseBonus ?? prev?.equipmentStats?.defense ?? (resolvedSlot === 'weapon' ? 2 : 12),
      speed: prev?.equipmentStats?.speed ?? (resolvedSlot === 'wings' || resolvedSlot === 'boots' ? 5 : 0),
    },
    motionLayerTag: cleanTag,
    motionEquipSlot: resolvedSlot,
  };

  const updatedCatalog = [...existingCatalog];
  if (existingIdx >= 0) {
    updatedCatalog[existingIdx] = itemDef;
  } else {
    updatedCatalog.unshift(itemDef);
  }

  return { updatedCatalog, itemDef };
}

/**
 * Classifica inteligentemente um item importado de pasta pelo nome do arquivo e subpasta.
 */
function inferInventoryItemMetaFromPath(
  rawFileName: string,
  relativePath: string,
  overrideCategory?: InventoryItemCategory | 'auto',
  overrideRarity?: InventoryItemRarity | 'auto'
): {
  cleanName: string;
  category: InventoryItemCategory;
  rarity: InventoryItemRarity;
  emoji: string;
  stateTags: ItemStateTag[];
  usableActions: InventoryItemAction[];
  stackable: boolean;
  maxStack: number;
  buyPrice: number;
  sellPrice: number;
  attack?: number;
  defense?: number;
  hpRestore?: number;
  manaRestore?: number;
} {
  const baseNoExt = rawFileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
  const cleanName = baseNoExt
    ? baseNoExt.charAt(0).toUpperCase() + baseNoExt.slice(1)
    : 'Item Importado';

  const norm = `${relativePath} ${baseNoExt}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Inferir Raridade
  let rarity: InventoryItemRarity = 'common';
  if (overrideRarity && overrideRarity !== 'auto') {
    rarity = overrideRarity;
  } else if (/\b(lendari|legendary|mitic|mythic|suprem|divin|ouro|gold)\b/.test(norm)) {
    rarity = 'legendary';
  } else if (/\b(epic|epico|arcan|astral|sombri|dracon|real)\b/.test(norm)) {
    rarity = 'epic';
  } else if (/\b(raro|rare|prata|silver|cristal|runa|magic)\b/.test(norm)) {
    rarity = 'rare';
  } else if (/\b(incomum|uncommon|ferro|iron|aco|steel|bronze)\b/.test(norm)) {
    rarity = 'uncommon';
  }

  // Inferir Categoria
  let category: InventoryItemCategory = 'collectible';
  if (overrideCategory && overrideCategory !== 'auto') {
    category = overrideCategory;
  } else if (
    /\b(arma|weapon|espada|sword|arco|bow|cajado|staff|lanca|spear|machado|axe|adaga|dagger|varinha|wand|martelo|hammer|katana|clava|faca)\b/.test(
      norm
    )
  ) {
    category = 'weapon';
  } else if (
    /\b(armadura|armor|escudo|shield|elmo|helmet|capacete|bota|boot|peitoral|chest|manto|capa|cape|luva|glove|cinto|belt)\b/.test(
      norm
    )
  ) {
    category = 'armor';
  } else if (
    /\b(pocao|potion|elixir|comida|food|fruta|fruit|erva|herb|cura|heal|mana|bebida|pao|carne|maca|apple|cogumelo|mushroom|tônico|tonico)\b/.test(
      norm
    )
  ) {
    category = 'potion';
  } else if (
    /\b(chave|key|quest|missao|pergaminho|scroll|livro|book|carta|letter|mapa|reliquia|relic|artefato|emblema|selo)\b/.test(
      norm
    )
  ) {
    category = 'key';
  } else if (/\b(moeda|coin|ouro|gold|gema|gem|diamante|diamond|tesouro|bau|chest| saco )\b/.test(norm)) {
    category = 'currency';
  } else if (/\b(drop|osso|bone|presa|fang|pele|couro|leather|asa|wing|garra|claw|olho|slime)\b/.test(norm)) {
    category = 'drop';
  }

  const rarityMultiplier =
    rarity === 'legendary'
      ? 4
      : rarity === 'epic'
      ? 2.5
      : rarity === 'rare'
      ? 1.8
      : rarity === 'uncommon'
      ? 1.3
      : 1;

  if (category === 'weapon') {
    return {
      cleanName,
      category: 'weapon',
      rarity,
      emoji: '⚔️',
      stateTags: ['collectible', 'storable', 'equipable', 'buyable', 'tradable'],
      usableActions: ['equip', 'inspect', 'drop'],
      stackable: false,
      maxStack: 1,
      buyPrice: Math.round(100 * rarityMultiplier),
      sellPrice: Math.round(50 * rarityMultiplier),
      attack: Math.round(12 * rarityMultiplier),
      defense: Math.round(2 * rarityMultiplier),
    };
  }

  if (category === 'armor') {
    return {
      cleanName,
      category: 'armor',
      rarity,
      emoji: '🛡️',
      stateTags: ['collectible', 'storable', 'equipable', 'buyable', 'tradable'],
      usableActions: ['equip', 'inspect', 'drop'],
      stackable: false,
      maxStack: 1,
      buyPrice: Math.round(95 * rarityMultiplier),
      sellPrice: Math.round(45 * rarityMultiplier),
      attack: 0,
      defense: Math.round(12 * rarityMultiplier),
    };
  }

  if (category === 'potion' || category === 'consumable') {
    return {
      cleanName,
      category: 'potion',
      rarity,
      emoji: '🧪',
      stateTags: ['collectible', 'storable', 'consumable', 'buyable', 'tradable'],
      usableActions: ['use', 'inspect', 'drop'],
      stackable: true,
      maxStack: 50,
      buyPrice: Math.round(35 * rarityMultiplier),
      sellPrice: Math.round(15 * rarityMultiplier),
      hpRestore: Math.round(35 * rarityMultiplier),
      manaRestore: Math.round(15 * rarityMultiplier),
    };
  }

  if (category === 'key' || category === 'quest') {
    return {
      cleanName,
      category: 'key',
      rarity: rarity === 'common' ? 'rare' : rarity,
      emoji: '🔑',
      stateTags: ['collectible', 'storable', 'deliverable'],
      usableActions: ['deliver', 'inspect', 'read'],
      stackable: true,
      maxStack: 10,
      buyPrice: Math.round(120 * rarityMultiplier),
      sellPrice: Math.round(60 * rarityMultiplier),
    };
  }

  if (category === 'currency') {
    return {
      cleanName,
      category: 'currency',
      rarity,
      emoji: '🪙',
      stateTags: ['collectible', 'storable', 'tradable'],
      usableActions: ['inspect', 'drop'],
      stackable: true,
      maxStack: 999,
      buyPrice: Math.round(50 * rarityMultiplier),
      sellPrice: Math.round(50 * rarityMultiplier),
    };
  }

  return {
    cleanName,
    category,
    rarity,
    emoji: category === 'drop' ? '💀' : '📦',
    stateTags: ['collectible', 'storable', 'tradable', 'buyable'],
    usableActions: ['use', 'inspect', 'drop'],
    stackable: true,
    maxStack: 99,
    buyPrice: Math.round(50 * rarityMultiplier),
    sellPrice: Math.round(25 * rarityMultiplier),
    hpRestore: 20,
  };
}

/**
 * Processa a importação de uma Pasta Inteira (ou múltiplos arquivos PNG/JPG/WebP) para o Editor de Inventários,
 * gravando cada asset diretamente na unidade de memória local (/public/assets/engine/hud/) via DiskAssetEngine
 * e gerando automaticamente GalleryAssets, ItemCatalog e PlayerInventoryItems.
 */
export async function processInventoryFolderFilesToDisk(
  files: FileList | File[],
  options?: {
    sourceLabel?: string;
    defaultBiomeId?: string;
    overrideCategory?: InventoryItemCategory | 'auto';
    overrideRarity?: InventoryItemRarity | 'auto';
    startingSlotIndex?: number;
    onProgress?: (current: number, total: number, fileName: string) => void;
  }
): Promise<{
  folderName: string;
  newAssets: GalleryAsset[];
  newCatalogItems: InventoryItemDefinition[];
  newBackpackItems: PlayerInventoryItem[];
}> {
  const fileArray = Array.from(files || []).filter((file) => {
    if (!file || !file.name) return false;
    if (file.name.startsWith('.')) return false;
    return file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
  });

  // Ordenação natural por caminho/nome
  fileArray.sort((a, b) => {
    const pathA = (a as any).webkitRelativePath || a.name;
    const pathB = (b as any).webkitRelativePath || b.name;
    return pathA.localeCompare(pathB, undefined, { numeric: true, sensitivity: 'base' });
  });

  let detectedFolderName = '';
  for (const f of fileArray) {
    const rel = ((f as any).webkitRelativePath || '') as string;
    if (rel && rel.includes('/')) {
      detectedFolderName = rel.split('/')[0].replace(/[_-]+/g, ' ').trim();
      if (detectedFolderName) break;
    }
  }
  if (!detectedFolderName) {
    detectedFolderName = 'Pack de Itens Importado';
  }

  const newAssets: GalleryAsset[] = [];
  const newCatalogItems: InventoryItemDefinition[] = [];
  const newBackpackItems: PlayerInventoryItem[] = [];
  const sourceLabel = options?.sourceLabel || `pasta "${detectedFolderName}"`;
  const defaultBiomeId = options?.defaultBiomeId || 'forest';
  const baseSlotIdx = options?.startingSlotIndex ?? 0;

  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    const relPath = ((file as any).webkitRelativePath || file.name) as string;
    options?.onProgress?.(i + 1, fileArray.length, file.name);

    try {
      // Salva diretamente no disco em /public/assets/engine/hud/ (Zero Base64 na RAM)
      const { dataUrl, width, height } = await readUploadedImage(file, 'hud');

      const meta = inferInventoryItemMetaFromPath(
        file.name,
        relPath,
        options?.overrideCategory,
        options?.overrideRarity
      );

      const stamp = `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
      const assetId = `asset-item-${stamp}`;
      const itemId = `item-${assetId}`;

      const asset: GalleryAsset = {
        id: assetId,
        name: meta.cleanName,
        dataUrl,
        width,
        height,
        category: 'Itens de Inventário/Exploração',
        createdAt: new Date().toISOString(),
        isPersistentPhaseAsset: true,
      };

      const catalogItem: InventoryItemDefinition = {
        id: itemId,
        name: meta.cleanName,
        iconPng: dataUrl,
        iconEmoji: meta.emoji,
        shortDescription: `Item importado via ${sourceLabel} (salvo em disco local).`,
        category: meta.category,
        rarity: meta.rarity,
        stackable: meta.stackable,
        maxStack: meta.maxStack,
        buyPrice: meta.buyPrice,
        sellPrice: meta.sellPrice,
        currencyType: 'gold',
        stateTags: meta.stateTags,
        naturalBiomeSpawn: {
          enabled: false,
          biomeIds: [defaultBiomeId],
          spawnDensityPerBiome: 3,
          spawnChancePercent: 80,
          avoidPaths: true,
        },
        usableActions: meta.usableActions,
        consumableEffect: {
          hpRestore: meta.hpRestore ?? 20,
          manaRestore: meta.manaRestore ?? 0,
        },
        equipmentStats: {
          slot: meta.category === 'armor' ? 'armor' : 'weapon',
          attack: meta.attack ?? 10,
          defense: meta.defense ?? 5,
          speed: 0,
        },
      };

      const backpackItem: PlayerInventoryItem = {
        id: `inv-${itemId}`,
        definitionId: itemId,
        name: meta.cleanName,
        description: catalogItem.shortDescription,
        iconPng: dataUrl,
        iconEmoji: meta.emoji,
        quantity: 1,
        maxStack: meta.maxStack,
        type: meta.category,
        category: meta.category,
        rarity: meta.rarity,
        equipped: false,
        slotIndex: baseSlotIdx + newBackpackItems.length,
        buyPrice: meta.buyPrice,
        sellPrice: meta.sellPrice,
        currencyType: 'gold',
        stateTags: meta.stateTags,
        naturalBiomeSpawn: catalogItem.naturalBiomeSpawn,
        usableActions: meta.usableActions,
        consumableEffect: catalogItem.consumableEffect,
        stats: {
          attack: meta.attack,
          defense: meta.defense,
          healthRestore: meta.hpRestore,
        },
      };

      newAssets.push(asset);
      newCatalogItems.push(catalogItem);
      newBackpackItems.push(backpackItem);
    } catch (err) {
      console.warn('Falha ao importar item da pasta para o disco:', file.name, err);
    }
  }

  return {
    folderName: detectedFolderName,
    newAssets,
    newCatalogItems,
    newBackpackItems,
  };
}


