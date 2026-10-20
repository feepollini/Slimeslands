export type CardClass =
  | 'Comum'
  | 'Rara'
  | 'Épica'
  | 'Lendária'
  | 'Mítica'
  | 'Limitada';

export type MatrixRarity = CardClass | 'Não classificada';

export type CardRank = 'S' | 'A' | 'B' | 'C' | 'D';

export type CardEntityType = 'Criatura' | 'Magia' | 'Item';

export type CardOrigin =
  | 'Manual'
  | 'Escaneamento'
  | 'Drop de Mapa'
  | 'Booster'
  | 'Pasta Importada';

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
  abilities: CharacterAbilityTemplate[];
  allowedClasses: CardClass[];
  availableForDrops: boolean;
  availableForScan: boolean;
  availableForBoosters: boolean;
  active: boolean;
  isProvisional?: boolean;
  rarity?: MatrixRarity;
  family?: string;
  biome?: string;
  themeCollections?: string[];
  isClassified?: boolean;
  // Specific to Magic cards
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

export interface BoosterModel {
  id: string;
  name: string;
  description: string;
  totalCards: number; // Default 9
  active: boolean;
  slots: BoosterSlotConfig[];
  specialSlotRankProbs: Record<CardRank, number>; // Default A: 75%, S: 25%
  // Pack filter criteria (references to matrices)
  filterBiome?: string;
  filterFamily?: string;
  filterCollection?: string;
  filterEntityType?: CardEntityType;
  specificMatrixIds?: string[];
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
