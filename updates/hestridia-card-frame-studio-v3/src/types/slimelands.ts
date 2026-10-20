export type CardClass =
  | 'Comum'
  | 'Rara'
  | 'Épica'
  | 'Lendária'
  | 'Mítica'
  | 'Limitada';

export type CardRank = 'S' | 'A' | 'B' | 'C' | 'D';

export type CardEntityType = 'Criatura' | 'Magia' | 'Item';

export type CardOrigin =
  | 'Manual'
  | 'Escaneamento'
  | 'Drop de Mapa'
  | 'Booster'
  | 'Loja'
  | 'Pasta Importada'
  | 'Importação de Pasta';

export type MatrixRecordKind = 'matrix' | 'version' | 'instance';

export type MatrixClassificationState =
  | 'unclassified'
  | 'classified'
  | 'Não classificada'
  | 'Classificada';

export type MatrixEditState =
  | 'neutral'
  | 'provisional'
  | 'configured'
  | 'version_saved'
  | 'Importada / Neutra'
  | 'Classificada'
  | 'Pronta para Packs'
  | 'Versão Aleatória'
  | 'Versão Manual';

export interface SubgroupCatalog {
  families: string[];
  biomes: string[];
  collections: string[];
}

export interface CharacterAbilityTemplate {
  id: string;
  name: string;
  description: string;
  tier: 'Básica' | 'Intermediária' | 'Forte' | 'Suprema' | 'Magia';
  specialEffect?: string;
  unlockPriority: 1 | 2 | 3 | 4;
  canBeFreeInMythic?: boolean;
  isProvisional?: boolean;
}

export interface BaseCharacter {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  entityType: CardEntityType;
  element: string;
  // Primary Rarity in the Matrix (undefined when newly imported / unclassified)
  matrixRarity?: CardClass;
  classificationState?: MatrixClassificationState;
  editState?: MatrixEditState;
  // Independent Secondary Subgroups (Section 5 & 6)
  family?: string;
  biome?: string;
  collections?: string[];
  abilities: CharacterAbilityTemplate[];
  allowedClasses: CardClass[];
  availableForDrops: boolean;
  availableForScan: boolean;
  availableForBoosters: boolean;
  active: boolean;
  isProvisional?: boolean;
  // Specific to Magic / Item cards
  magicManaCost?: number;
  magicTarget?: string;
  magicCondition?: string;
}

export interface GeneratedAbilityInstance {
  id: string;
  templateId: string;
  name: string;
  description: string;
  tier: 'Básica' | 'Intermediária' | 'Forte' | 'Suprema' | 'Magia';
  damage: number;
  manaCost: number; // 0 to 9 (0 when free ability)
  isFree: boolean;
  parryStaminaCost: number; // manaCost * 0.5
  specialEffect?: string;
  unlockOrder: number;
}

export interface RankBalanceRule {
  rank: CardRank;
  pvMin: number;
  pvMax: number;
  pvIncrement: number; // 5, 10, 50, 100, or custom
  damageMin: number;
  damageMax: number;
  damageIncrement: number; // 5, 10, 50, 100, or custom
  summonCostMin: number; // 1 to 9 Stamina
  summonCostMax: number; // 1 to 9 Stamina
  rankProbability: number; // Percentage weight within class (sums to 100)
}

export interface ClassBalanceTable {
  cardClass: CardClass;
  enabled: boolean; // Épica initially false as specified
  abilityCountMin: 1 | 2 | 3 | 4;
  abilityCountMax: 1 | 2 | 3 | 4;
  guaranteedFreeAbility: boolean; // True for Mítica
  summonCostRange: [number, number];
  scanProbability: number;
  dropProbability: number;
  boosterSpecialProbability: number; // Comum 45%, Rara 35%, Lendária 15%, Épica 4%, Mítica 0.9%, Limitada 0.1%
  limitedCollectionTag?: string;
  ranks: Record<CardRank, RankBalanceRule>;
}

export interface BoosterSlotConfig {
  slotIndex: number; // 1 to 9
  label: string;
  category: 'Comum' | 'Rara' | 'Magia' | 'Especial_Alto_Rank' | 'Custom';
  fixedClass?: CardClass;
  allowedRanks: CardRank[];
}

export interface BoosterPackFilters {
  biomes?: string[];
  families?: string[];
  collections?: string[];
  allowedRarities?: CardClass[];
  rarities?: CardClass[];
  types?: CardEntityType[];
  specificMatrixIds?: string[];
}

export interface BoosterModel {
  id: string;
  name: string;
  description: string;
  themeLabel?: string;
  accentColor?: string;
  priceCoins?: number;
  totalCards: number; // Default 9
  active: boolean;
  filters?: BoosterPackFilters;
  slots: BoosterSlotConfig[];
  specialSlotRankProbs: Record<CardRank, number>; // Default A: 72%, S: 28%
}

export interface BoosterOpenHistoryEntry {
  id: string;
  boosterId: string;
  boosterName: string;
  openedAt: string;
  instanceIds: string[];
  cards: import('./card').CardData[];
}

export interface DeckCategory {
  id: string;
  name: string;
  description: string;
  accentColor: string;
}

export interface ParryAttackerInput {
  id: string;
  attackerName: string;
  abilityName: string;
  manaUsed: number; // 1 to 9
  incomingDamage: number;
  selectedToDefend: boolean;
}

export interface SimulationSummary {
  totalCards: number;
  totalBoosters: number;
  byClass: Record<CardClass, number>;
  byRank: Record<CardRank, number>;
  byCombo: Record<string, number>;
  avgPv: number;
  avgMaxDamage: number;
  avgSummonCost: number;
  mythicCount: number;
  limitedCount: number;
  expectedVsObserved: {
    cardClass: CardClass;
    configuredPct: number;
    observedPct: number;
    count: number;
  }[];
}
