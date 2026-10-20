import { CardData, BottomStatPill } from '../types/card';
import {
  BaseCharacter,
  BoosterModel,
  CardClass,
  CardOrigin,
  CardRank,
  CharacterAbilityTemplate,
  ClassBalanceTable,
  DeckCategory,
  GeneratedAbilityInstance,
  ParryAttackerInput,
  SimulationSummary,
} from '../types/slimelands';
import { DEFAULT_PRESET_PALETTES } from './colorExtractor';
import { SAMPLE_ARTWORKS } from './defaultCards';

export const RULES_VERSION = 'v1.4-slimelands';

export const OFFICIAL_CLASSES: CardClass[] = [
  'Comum',
  'Rara',
  'Épica',
  'Lendária',
  'Mítica',
  'Limitada',
];

export const OFFICIAL_RANKS: CardRank[] = ['S', 'A', 'B', 'C', 'D'];

export const DEFAULT_DECK_CATEGORIES: DeckCategory[] = [
  {
    id: 'deck-main',
    name: 'Deck Principal',
    description: 'Cartas ativas prontas para batalha no tabuleiro.',
    accentColor: '#10B981',
  },
  {
    id: 'deck-slimes',
    name: 'Slimes Ancestrais',
    description: 'Criaturas elementais escaneadas nas florestas e abismos.',
    accentColor: '#3B82F6',
  },
  {
    id: 'deck-grimoire',
    name: 'Grimório de Magias',
    description: 'Feitiços e encantamentos arcanos de suporte e destruição.',
    accentColor: '#A855F7',
  },
  {
    id: 'deck-mythic',
    name: 'Relíquias & Míticas',
    description: 'Versões de alto poder (Rank S/A, Lendárias, Míticas e Limitadas).',
    accentColor: '#F59E0B',
  },
];

/**
 * Default Worlds of Slimelands Base Characters & Magic Cards.
 * A single BaseCharacter can originate countless card instances of different Classes and Ranks.
 */
export const INITIAL_BASE_CHARACTERS: BaseCharacter[] = [
  {
    id: 'char-lumys',
    name: 'Lumys, o Slime Arcano',
    description:
      'Um pequeno slime que absorve a energia mágica presente nas florestas ancestrais, convertendo luz estelar em pulsos arcanos.',
    imageUrl: SAMPLE_ARTWORKS.hestridiaForest,
    entityType: 'Criatura',
    element: 'ARCANO',
    allowedClasses: ['Comum', 'Rara', 'Épica', 'Lendária', 'Mítica', 'Limitada'],
    availableForDrops: true,
    availableForScan: true,
    availableForBoosters: true,
    active: true,
    isProvisional: false,
    abilities: [
      {
        id: 'ab-lumys-1',
        name: 'Pulso Arcano',
        description: 'Dispara uma onda curta de mana condensada.',
        tier: 'Básica',
        unlockPriority: 1,
      },
      {
        id: 'ab-lumys-2',
        name: 'Esferas Místicas',
        description: 'Conjura três orbes luminosos que perseguem o alvo.',
        tier: 'Intermediária',
        unlockPriority: 2,
      },
      {
        id: 'ab-lumys-3',
        name: 'Tempestade Astral',
        description: 'Sobrecarrega o campo com relâmpagos de éter puro.',
        tier: 'Forte',
        specialEffect: 'Reduz 1 de mana do oponente no próximo turno.',
        unlockPriority: 3,
      },
      {
        id: 'ab-lumys-4',
        name: 'Explosão Celestial',
        description: 'Libera toda a reserva cósmica em um colapso estelar.',
        tier: 'Suprema',
        specialEffect: 'Ignora 20% de redução de dano.',
        unlockPriority: 4,
        canBeFreeInMythic: true,
      },
    ],
  },
  {
    id: 'char-hestridia',
    name: 'Hetridia, Guardiã Silvestre',
    description:
      'Guardiã da vida ancestral que percorre os bosques esquecidos de Slimelands, nutrindo as raízes primordiais.',
    imageUrl: SAMPLE_ARTWORKS.hestridiaForest,
    entityType: 'Criatura',
    element: 'TERRA',
    allowedClasses: ['Comum', 'Rara', 'Épica', 'Lendária', 'Mítica', 'Limitada'],
    availableForDrops: true,
    availableForScan: true,
    availableForBoosters: true,
    active: true,
    isProvisional: false,
    abilities: [
      {
        id: 'ab-hest-1',
        name: 'Chicote de Cipó',
        description: 'Golpeia rapidamente com raízes espinhosas.',
        tier: 'Básica',
        unlockPriority: 1,
      },
      {
        id: 'ab-hest-2',
        name: 'Esporos Vitais',
        description: 'Nuvem botânica que corrói a defesa adversária.',
        tier: 'Intermediária',
        specialEffect: 'Regenera 50 PV ao final do turno.',
        unlockPriority: 2,
      },
      {
        id: 'ab-hest-3',
        name: 'Fúria do Bosque',
        description: 'Ergue pilares de madeira petrificada sob o inimigo.',
        tier: 'Forte',
        unlockPriority: 3,
      },
      {
        id: 'ab-hest-4',
        name: 'Renascer da Floresta',
        description: 'Canaliza a alma da floresta para devastar o campo.',
        tier: 'Suprema',
        specialEffect: 'Revive ou fortalece aliados de elemento Terra.',
        unlockPriority: 4,
        canBeFreeInMythic: true,
      },
    ],
  },
  {
    id: 'char-kaelen',
    name: 'Kaelen, Slime Leviatã do Abismo',
    description:
      'Das fossas onde a luz jamais toca, o slime primordial desperta marés pressurizadas capazes de partir rochas.',
    imageUrl: SAMPLE_ARTWORKS.abyssalLeviathan,
    entityType: 'Criatura',
    element: 'AGUA',
    allowedClasses: ['Comum', 'Rara', 'Épica', 'Lendária', 'Mítica', 'Limitada'],
    availableForDrops: true,
    availableForScan: true,
    availableForBoosters: true,
    active: true,
    isProvisional: false,
    abilities: [
      {
        id: 'ab-kael-1',
        name: 'Jato Abissal',
        description: 'Disparo de água em alta pressão.',
        tier: 'Básica',
        unlockPriority: 1,
      },
      {
        id: 'ab-kael-2',
        name: 'Vórtice Salino',
        description: 'Prende o inimigo em um redemoinho cortante.',
        tier: 'Intermediária',
        unlockPriority: 2,
      },
      {
        id: 'ab-kael-3',
        name: 'Maré Esmagadora',
        description: 'Onda colossal que varre a linha de frente.',
        tier: 'Forte',
        specialEffect: 'Aplica Congelamento leve.',
        unlockPriority: 3,
      },
      {
        id: 'ab-kael-4',
        name: 'Maremoto Astral',
        description: 'Invoca a pressão total do oceano primordial.',
        tier: 'Suprema',
        specialEffect: 'Congela duas cartas inimigas por 1 turno.',
        unlockPriority: 4,
        canBeFreeInMythic: true,
      },
    ],
  },
  {
    id: 'char-ignisvor',
    name: 'Ignisvor, o Slime de Magma',
    description:
      'Forjado nas caldeiras vulcânicas do Monte Cinzento, seu núcleo ferve a temperaturas capazes de derreter aço.',
    imageUrl: SAMPLE_ARTWORKS.solarArchangel,
    entityType: 'Criatura',
    element: 'FOGO',
    allowedClasses: ['Comum', 'Rara', 'Épica', 'Lendária', 'Mítica', 'Limitada'],
    availableForDrops: true,
    availableForScan: true,
    availableForBoosters: true,
    active: true,
    isProvisional: false,
    abilities: [
      {
        id: 'ab-ignis-1',
        name: 'Cuspe de Brasa',
        description: 'Lança projéteis incandescentes de lava.',
        tier: 'Básica',
        unlockPriority: 1,
      },
      {
        id: 'ab-ignis-2',
        name: 'Onda Piroclástica',
        description: 'Expande um anel de calor abrasador.',
        tier: 'Intermediária',
        unlockPriority: 2,
      },
      {
        id: 'ab-ignis-3',
        name: 'Erupção Rubra',
        description: 'Rompe o solo abaixo do oponente com gêiseres de magma.',
        tier: 'Forte',
        specialEffect: 'Causa queimadura contínua.',
        unlockPriority: 3,
      },
      {
        id: 'ab-ignis-4',
        name: 'Supernova Vulcânica',
        description: 'Detona o próprio núcleo em uma explosão solar devastadora.',
        tier: 'Suprema',
        specialEffect: 'Dano perfurante contra escudos.',
        unlockPriority: 4,
        canBeFreeInMythic: true,
      },
    ],
  },
  // MAGIC CARDS (Separated from Creature classes/stats as required by Section 12)
  {
    id: 'mag-convergencia',
    name: 'Convergência Estelar de Slimelands',
    description:
      'Alinha os cristais de éter do campo de batalha, restaurando o fluxo arcano e amplificando o próximo feitiço.',
    imageUrl: SAMPLE_ARTWORKS.abyssalLeviathan,
    entityType: 'Magia',
    element: 'MAGIA',
    allowedClasses: ['Comum', 'Rara', 'Lendária', 'Mítica'],
    availableForDrops: true,
    availableForScan: false,
    availableForBoosters: true,
    active: true,
    magicManaCost: 3,
    magicTarget: 'Aliado ou Jogador',
    magicCondition: 'Ativável durante a fase principal',
    abilities: [
      {
        id: 'ab-mag-conv',
        name: 'Convergência Estelar',
        description: 'Restaura 3 de Mana e concede +150 de poder ao próximo ataque.',
        tier: 'Magia',
        specialEffect: 'Compra 1 carta adicional se possuir um Slime Arcano.',
        unlockPriority: 1,
      },
    ],
  },
  {
    id: 'mag-escudo-real',
    name: 'Manto de Viscosidade Real',
    description:
      'Reveste a criatura aliada com uma membrana prismática elástica que absorve impactos letais.',
    imageUrl: SAMPLE_ARTWORKS.solarArchangel,
    entityType: 'Magia',
    element: 'MAGIA',
    allowedClasses: ['Comum', 'Rara', 'Lendária', 'Mítica'],
    availableForDrops: true,
    availableForScan: false,
    availableForBoosters: true,
    active: true,
    magicManaCost: 2,
    magicTarget: '1 Criatura Aliada',
    magicCondition: 'Pode ser ativada em resposta a um ataque',
    abilities: [
      {
        id: 'ab-mag-escudo',
        name: 'Barreira Gelatinosa',
        description: 'Reduz o custo de Parry do próximo ataque recebido em 2 pontos de Estamina.',
        tier: 'Magia',
        specialEffect: 'Reflete 25% do dano bloqueado.',
        unlockPriority: 1,
      },
    ],
  },
];

/**
 * Default Balance Table for all 6 Classes x 5 Ranks (S > A > B > C > D)
 * Following Sections 4, 5, 6, 7, 8, 9, 10, 13 of the specification.
 */
export const DEFAULT_CLASS_BALANCE_TABLES: Record<CardClass, ClassBalanceTable> = {
  Comum: {
    cardClass: 'Comum',
    enabled: true,
    abilityCountMin: 1,
    abilityCountMax: 2,
    guaranteedFreeAbility: false,
    summonCostRange: [1, 3],
    scanProbability: 58,
    dropProbability: 62,
    boosterSpecialProbability: 45,
    ranks: {
      S: {
        rank: 'S',
        pvMin: 400,
        pvMax: 500,
        pvIncrement: 5,
        damageMin: 300,
        damageMax: 550,
        damageIncrement: 10,
        summonCostMin: 3,
        summonCostMax: 3,
        rankProbability: 5,
      },
      A: {
        rank: 'A',
        pvMin: 320,
        pvMax: 420,
        pvIncrement: 5,
        damageMin: 220,
        damageMax: 400,
        damageIncrement: 10,
        summonCostMin: 2,
        summonCostMax: 3,
        rankProbability: 15,
      },
      B: {
        rank: 'B',
        pvMin: 250,
        pvMax: 340,
        pvIncrement: 5,
        damageMin: 160,
        damageMax: 300,
        damageIncrement: 10,
        summonCostMin: 2,
        summonCostMax: 2,
        rankProbability: 25,
      },
      C: {
        rank: 'C',
        pvMin: 180,
        pvMax: 260,
        pvIncrement: 5,
        damageMin: 100,
        damageMax: 200,
        damageIncrement: 10,
        summonCostMin: 1,
        summonCostMax: 2,
        rankProbability: 30,
      },
      D: {
        rank: 'D',
        pvMin: 100,
        pvMax: 180,
        pvIncrement: 5,
        damageMin: 50,
        damageMax: 100,
        damageIncrement: 5,
        summonCostMin: 1,
        summonCostMax: 1,
        rankProbability: 25,
      },
    },
  },
  Rara: {
    cardClass: 'Rara',
    enabled: true,
    abilityCountMin: 3,
    abilityCountMax: 3,
    guaranteedFreeAbility: false,
    summonCostRange: [2, 4],
    scanProbability: 27,
    dropProbability: 25,
    boosterSpecialProbability: 35,
    ranks: {
      S: {
        rank: 'S',
        pvMin: 600,
        pvMax: 780,
        pvIncrement: 10,
        damageMin: 500,
        damageMax: 850,
        damageIncrement: 10,
        summonCostMin: 4,
        summonCostMax: 4,
        rankProbability: 6,
      },
      A: {
        rank: 'A',
        pvMin: 500,
        pvMax: 650,
        pvIncrement: 10,
        damageMin: 400,
        damageMax: 680,
        damageIncrement: 10,
        summonCostMin: 3,
        summonCostMax: 4,
        rankProbability: 16,
      },
      B: {
        rank: 'B',
        pvMin: 420,
        pvMax: 540,
        pvIncrement: 10,
        damageMin: 300,
        damageMax: 520,
        damageIncrement: 10,
        summonCostMin: 3,
        summonCostMax: 3,
        rankProbability: 26,
      },
      C: {
        rank: 'C',
        pvMin: 340,
        pvMax: 440,
        pvIncrement: 10,
        damageMin: 220,
        damageMax: 380,
        damageIncrement: 10,
        summonCostMin: 2,
        summonCostMax: 3,
        rankProbability: 28,
      },
      D: {
        rank: 'D',
        pvMin: 260,
        pvMax: 350,
        pvIncrement: 10,
        damageMin: 150,
        damageMax: 260,
        damageIncrement: 10,
        summonCostMin: 2,
        summonCostMax: 2,
        rankProbability: 24,
      },
    },
  },
  Épica: {
    cardClass: 'Épica',
    enabled: false, // Initially disabled as required by Section 4 & 13
    abilityCountMin: 3,
    abilityCountMax: 3,
    guaranteedFreeAbility: false,
    summonCostRange: [3, 6],
    scanProbability: 0,
    dropProbability: 0,
    boosterSpecialProbability: 4,
    ranks: {
      S: {
        rank: 'S',
        pvMin: 850,
        pvMax: 1100,
        pvIncrement: 10,
        damageMin: 750,
        damageMax: 1250,
        damageIncrement: 10,
        summonCostMin: 6,
        summonCostMax: 6,
        rankProbability: 6,
      },
      A: {
        rank: 'A',
        pvMin: 720,
        pvMax: 920,
        pvIncrement: 10,
        damageMin: 600,
        damageMax: 1000,
        damageIncrement: 10,
        summonCostMin: 5,
        summonCostMax: 6,
        rankProbability: 16,
      },
      B: {
        rank: 'B',
        pvMin: 600,
        pvMax: 760,
        pvIncrement: 10,
        damageMin: 480,
        damageMax: 800,
        damageIncrement: 10,
        summonCostMin: 4,
        summonCostMax: 5,
        rankProbability: 26,
      },
      C: {
        rank: 'C',
        pvMin: 500,
        pvMax: 640,
        pvIncrement: 10,
        damageMin: 360,
        damageMax: 620,
        damageIncrement: 10,
        summonCostMin: 3,
        summonCostMax: 4,
        rankProbability: 28,
      },
      D: {
        rank: 'D',
        pvMin: 400,
        pvMax: 520,
        pvIncrement: 10,
        damageMin: 260,
        damageMax: 450,
        damageIncrement: 10,
        summonCostMin: 3,
        summonCostMax: 3,
        rankProbability: 24,
      },
    },
  },
  Lendária: {
    cardClass: 'Lendária',
    enabled: true,
    abilityCountMin: 4,
    abilityCountMax: 4,
    guaranteedFreeAbility: false,
    summonCostRange: [5, 7],
    scanProbability: 12,
    dropProbability: 10,
    boosterSpecialProbability: 15,
    ranks: {
      S: {
        rank: 'S',
        pvMin: 1200,
        pvMax: 1600,
        pvIncrement: 50,
        damageMin: 1100,
        damageMax: 1800,
        damageIncrement: 50,
        summonCostMin: 7,
        summonCostMax: 7,
        rankProbability: 5,
      },
      A: {
        rank: 'A',
        pvMin: 1000,
        pvMax: 1300,
        pvIncrement: 50,
        damageMin: 900,
        damageMax: 1450,
        damageIncrement: 50,
        summonCostMin: 6,
        summonCostMax: 7,
        rankProbability: 15,
      },
      B: {
        rank: 'B',
        pvMin: 850,
        pvMax: 1100,
        pvIncrement: 50,
        damageMin: 700,
        damageMax: 1150,
        damageIncrement: 50,
        summonCostMin: 6,
        summonCostMax: 6,
        rankProbability: 25,
      },
      C: {
        rank: 'C',
        pvMin: 700,
        pvMax: 900,
        pvIncrement: 50,
        damageMin: 550,
        damageMax: 900,
        damageIncrement: 50,
        summonCostMin: 5,
        summonCostMax: 6,
        rankProbability: 30,
      },
      D: {
        rank: 'D',
        pvMin: 550,
        pvMax: 750,
        pvIncrement: 50,
        damageMin: 400,
        damageMax: 700,
        damageIncrement: 50,
        summonCostMin: 5,
        summonCostMax: 5,
        rankProbability: 25,
      },
    },
  },
  Mítica: {
    cardClass: 'Mítica',
    enabled: true,
    abilityCountMin: 4,
    abilityCountMax: 4,
    guaranteedFreeAbility: true, // 1 of the 4 abilities has 0 Mana Cost (Chromatic ∞)
    summonCostRange: [7, 9],
    scanProbability: 2.5,
    dropProbability: 2.5,
    boosterSpecialProbability: 0.9,
    ranks: {
      S: {
        rank: 'S',
        pvMin: 1800,
        pvMax: 2500,
        pvIncrement: 50,
        damageMin: 1600,
        damageMax: 2400,
        damageIncrement: 50,
        summonCostMin: 9,
        summonCostMax: 9,
        rankProbability: 5,
      },
      A: {
        rank: 'A',
        pvMin: 1550,
        pvMax: 2000,
        pvIncrement: 50,
        damageMin: 1350,
        damageMax: 1950,
        damageIncrement: 50,
        summonCostMin: 8,
        summonCostMax: 9,
        rankProbability: 15,
      },
      B: {
        rank: 'B',
        pvMin: 1300,
        pvMax: 1650,
        pvIncrement: 50,
        damageMin: 1100,
        damageMax: 1600,
        damageIncrement: 50,
        summonCostMin: 8,
        summonCostMax: 8,
        rankProbability: 25,
      },
      C: {
        rank: 'C',
        pvMin: 1100,
        pvMax: 1400,
        pvIncrement: 50,
        damageMin: 900,
        damageMax: 1300,
        damageIncrement: 50,
        summonCostMin: 7,
        summonCostMax: 8,
        rankProbability: 30,
      },
      D: {
        rank: 'D',
        pvMin: 900,
        pvMax: 1150,
        pvIncrement: 50,
        damageMin: 700,
        damageMax: 1050,
        damageIncrement: 50,
        summonCostMin: 7,
        summonCostMax: 7,
        rankProbability: 25,
      },
    },
  },
  Limitada: {
    cardClass: 'Limitada',
    enabled: true,
    abilityCountMin: 3,
    abilityCountMax: 4,
    guaranteedFreeAbility: true,
    summonCostRange: [5, 8],
    scanProbability: 0.5,
    dropProbability: 0.5,
    boosterSpecialProbability: 0.1,
    limitedCollectionTag: 'Festival Astral de Slimelands',
    ranks: {
      S: {
        rank: 'S',
        pvMin: 1500,
        pvMax: 2100,
        pvIncrement: 50,
        damageMin: 1400,
        damageMax: 2100,
        damageIncrement: 50,
        summonCostMin: 8,
        summonCostMax: 8,
        rankProbability: 8,
      },
      A: {
        rank: 'A',
        pvMin: 1250,
        pvMax: 1700,
        pvIncrement: 50,
        damageMin: 1150,
        damageMax: 1700,
        damageIncrement: 50,
        summonCostMin: 7,
        summonCostMax: 8,
        rankProbability: 18,
      },
      B: {
        rank: 'B',
        pvMin: 1050,
        pvMax: 1400,
        pvIncrement: 50,
        damageMin: 900,
        damageMax: 1350,
        damageIncrement: 50,
        summonCostMin: 6,
        summonCostMax: 7,
        rankProbability: 26,
      },
      C: {
        rank: 'C',
        pvMin: 850,
        pvMax: 1150,
        pvIncrement: 50,
        damageMin: 700,
        damageMax: 1050,
        damageIncrement: 50,
        summonCostMin: 5,
        summonCostMax: 6,
        rankProbability: 26,
      },
      D: {
        rank: 'D',
        pvMin: 700,
        pvMax: 950,
        pvIncrement: 50,
        damageMin: 550,
        damageMax: 850,
        damageIncrement: 50,
        summonCostMin: 5,
        summonCostMax: 5,
        rankProbability: 22,
      },
    },
  },
};

/**
 * Default Official 9-Card Booster Model (Section 13 & 14):
 * - Slots 1 to 4: Comum (4)
 * - Slots 5 to 6: Rara (2)
 * - Slots 7 to 8: Magia (2)
 * - Slot 9: Carta especial de rank alto (A ou S) (1)
 */
export const DEFAULT_BOOSTER_MODELS: BoosterModel[] = [
  {
    id: 'booster-standard-9',
    name: 'Booster Oficial — Ecos de Slimelands',
    description:
      'Pacote oficial de 9 cartas: 4 Comuns, 2 Raras, 2 Magias e 1 Carta Especial garantida de Rank Alto (A ou S).',
    totalCards: 9,
    active: true,
    specialSlotRankProbs: {
      S: 28,
      A: 72,
      B: 0,
      C: 0,
      D: 0,
    },
    slots: [
      { slotIndex: 1, label: 'Slot 1 · Comum', category: 'Comum', fixedClass: 'Comum', allowedRanks: ['S', 'A', 'B', 'C', 'D'] },
      { slotIndex: 2, label: 'Slot 2 · Comum', category: 'Comum', fixedClass: 'Comum', allowedRanks: ['S', 'A', 'B', 'C', 'D'] },
      { slotIndex: 3, label: 'Slot 3 · Comum', category: 'Comum', fixedClass: 'Comum', allowedRanks: ['S', 'A', 'B', 'C', 'D'] },
      { slotIndex: 4, label: 'Slot 4 · Comum', category: 'Comum', fixedClass: 'Comum', allowedRanks: ['S', 'A', 'B', 'C', 'D'] },
      { slotIndex: 5, label: 'Slot 5 · Rara', category: 'Rara', fixedClass: 'Rara', allowedRanks: ['S', 'A', 'B', 'C', 'D'] },
      { slotIndex: 6, label: 'Slot 6 · Rara', category: 'Rara', fixedClass: 'Rara', allowedRanks: ['S', 'A', 'B', 'C', 'D'] },
      { slotIndex: 7, label: 'Slot 7 · Magia', category: 'Magia', allowedRanks: ['S', 'A', 'B', 'C', 'D'] },
      { slotIndex: 8, label: 'Slot 8 · Magia', category: 'Magia', allowedRanks: ['S', 'A', 'B', 'C', 'D'] },
      { slotIndex: 9, label: 'Slot 9 · Especial Rank Alto (A/S)', category: 'Especial_Alto_Rank', allowedRanks: ['S', 'A'] },
    ],
  },
];

/**
 * Generates stepped numerical values strictly inside [min, max] obeying `increment`.
 * Example: min=400, max=500, increment=5 -> 400, 405, 410 ... 500.
 */
export function rollSteppedValue(min: number, max: number, increment: number): number {
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  const step = Math.max(1, Math.round(increment));
  const totalSteps = Math.floor((safeMax - safeMin) / step);
  if (totalSteps <= 0) return safeMin;
  const chosenStep = Math.floor(Math.random() * (totalSteps + 1));
  return Math.min(safeMax, safeMin + chosenStep * step);
}

/**
 * Weighted random picker that automatically normalizes positive weights and never picks 0-weight items.
 */
export function pickWeighted<T>(items: { item: T; weight: number }[]): T {
  const valid = items.filter((x) => x.weight > 0);
  if (valid.length === 0) {
    return items[0].item;
  }
  const totalWeight = valid.reduce((acc, cur) => acc + cur.weight, 0);
  let r = Math.random() * totalWeight;
  for (const entry of valid) {
    r -= entry.weight;
    if (r <= 0) {
      return entry.item;
    }
  }
  return valid[valid.length - 1].item;
}

/**
 * Auto-fills provisional fantasy content coherent with Worlds of Slimelands
 * when importing folders or creating characters with missing fields, without overwriting user edits.
 */
const SLIME_TITLES = [
  'Slime Cristalina da Aurora',
  'Viscoso Abissal de Vórtex',
  'Guardião Gelatinoso de Musgo',
  'Slime Prismático do Éter',
  'Colosso de Âmbar Vivo',
  'Soberano Slime das Cinzas',
  'Orbe Vivente de Neblina',
  'Slime Dracônico de Obsidiana',
];

const SLIME_ELEMENTS = ['ARCANO', 'TERRA', 'AGUA', 'FOGO', 'VENENO', 'LUZ', 'SOMBRA'];

export function ensureCoherentCharacterFields(
  partial: Partial<BaseCharacter>,
  indexSeed = 0
): BaseCharacter {
  const isMagic = partial.entityType === 'Magia';
  const fallbackName =
    partial.name?.trim() ||
    SLIME_TITLES[indexSeed % SLIME_TITLES.length];
  const element =
    partial.element?.trim() ||
    (isMagic ? 'MAGIA' : SLIME_ELEMENTS[indexSeed % SLIME_ELEMENTS.length]);

  const defaultAbilities: CharacterAbilityTemplate[] = isMagic
    ? [
        {
          id: `ab-prov-${Date.now()}-1`,
          name: 'Ressonância de Mana',
          description: 'Canaliza a energia ancestral de Slimelands para alterar o campo.',
          tier: 'Magia',
          specialEffect: 'Reduz em 1 o custo de estamina do próximo Parry.',
          unlockPriority: 1,
          isProvisional: true,
        },
      ]
    : [
        {
          id: `ab-prov-${Date.now()}-1`,
          name: 'Impacto Viscoso',
          description: 'Investida elástica rápida que desequilibra o oponente.',
          tier: 'Básica',
          unlockPriority: 1,
          isProvisional: true,
        },
        {
          id: `ab-prov-${Date.now()}-2`,
          name: 'Esfera de Plasma Elemental',
          description: 'Dispara um núcleo pressurizado de energia elemental.',
          tier: 'Intermediária',
          unlockPriority: 2,
          isProvisional: true,
        },
        {
          id: `ab-prov-${Date.now()}-3`,
          name: 'Torrente Ancestral',
          description: 'Onda concentrada que rompe barreiras defensivas.',
          tier: 'Forte',
          specialEffect: 'Aplica vulnerabilidade elemental por 1 turno.',
          unlockPriority: 3,
          isProvisional: true,
        },
        {
          id: `ab-prov-${Date.now()}-4`,
          name: 'Cataclismo de Slimelands',
          description: 'Libera o poder supremo do núcleo em área total.',
          tier: 'Suprema',
          specialEffect: 'Ignora 25% do bloqueio de Parry.',
          unlockPriority: 4,
          canBeFreeInMythic: true,
          isProvisional: true,
        },
      ];

  return {
    id: partial.id || `char-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: fallbackName,
    description:
      partial.description?.trim() ||
      `Criatura elemental nativa de Worlds of Slimelands sintonizada com a força de ${element}.`,
    imageUrl: partial.imageUrl || SAMPLE_ARTWORKS.hestridiaForest,
    entityType: partial.entityType || 'Criatura',
    element,
    abilities:
      partial.abilities && partial.abilities.length > 0
        ? partial.abilities
        : defaultAbilities,
    allowedClasses:
      partial.allowedClasses && partial.allowedClasses.length > 0
        ? partial.allowedClasses
        : ['Comum', 'Rara', 'Lendária', 'Mítica', 'Limitada'],
    availableForDrops: partial.availableForDrops ?? true,
    availableForScan: partial.availableForScan ?? true,
    availableForBoosters: partial.availableForBoosters ?? true,
    active: partial.active ?? true,
    isProvisional: partial.isProvisional ?? true,
    magicManaCost: partial.magicManaCost ?? 3,
    magicTarget: partial.magicTarget ?? '1 Alvo no Tabuleiro',
    magicCondition: partial.magicCondition ?? 'Fase Principal ou Reação',
  };
}

/**
 * Exact Parry Cost Calculator using integer half-points (Section 11).
 * Formula: Parry Cost = Attacker Mana * 0.5
 * Supports multiple attackers and verifies against available Stamina (max 9, milestones 3/6/9).
 */
export function evaluateParryDefense(
  attackers: ParryAttackerInput[],
  availableStamina: number,
  blockEfficiencyPct = 80
) {
  const availableHalfUnits = Math.round(availableStamina * 2);
  let totalHalfUnitsRequired = 0;
  let totalBlockedDamage = 0;
  let totalUnblockedDamage = 0;

  const breakdown = attackers.map((atk) => {
    const safeMana = Math.max(0, Math.min(9, Math.round(atk.manaUsed)));
    const parryHalfUnits = safeMana; // Since safeMana * 0.5 = safeMana half-units!
    const parryStaminaCost = parryHalfUnits / 2;

    if (atk.selectedToDefend) {
      totalHalfUnitsRequired += parryHalfUnits;
      const blocked = Math.round(atk.incomingDamage * (blockEfficiencyPct / 100));
      const remaining = Math.max(0, atk.incomingDamage - blocked);
      totalBlockedDamage += blocked;
      totalUnblockedDamage += remaining;
    } else {
      totalUnblockedDamage += atk.incomingDamage;
    }

    return {
      ...atk,
      parryStaminaCost,
    };
  });

  const totalStaminaCost = totalHalfUnitsRequired / 2;
  const canAffordAllSelected = totalHalfUnitsRequired <= availableHalfUnits;
  const remainingStamina = Math.max(0, (availableHalfUnits - totalHalfUnitsRequired) / 2);

  return {
    breakdown,
    totalStaminaCost,
    canAffordAllSelected,
    remainingStamina,
    totalBlockedDamage,
    totalUnblockedDamage,
  };
}

/**
 * SINGLE REUSABLE PROCEDURAL GENERATOR (Sections 1, 3, 4, 5, 6, 7, 8, 9, 10, 12, 17, 18)
 * Used across Map Scanning, Map Drops, Boosters, Folder Batch Imports, and Manual Instant Rolls.
 */
export interface ProceduralGenerationRequest {
  character?: BaseCharacter;
  charactersPool: BaseCharacter[];
  balanceTables: Record<CardClass, ClassBalanceTable>;
  origin: CardOrigin;
  forcedClass?: CardClass;
  forcedRank?: CardRank;
  allowedClassesOverride?: CardClass[];
  allowedRanksOverride?: CardRank[];
  onlyMagic?: boolean;
  excludeMagic?: boolean;
  deckId?: string;
}

export function generateProceduralCard(req: ProceduralGenerationRequest): CardData {
  const {
    charactersPool,
    balanceTables,
    origin,
    forcedClass,
    forcedRank,
    allowedClassesOverride,
    allowedRanksOverride,
    onlyMagic,
    excludeMagic,
    deckId = 'deck-main',
  } = req;

  // 1. Select eligible Base Character
  let chosenChar = req.character;
  if (!chosenChar) {
    const eligibleChars = charactersPool.filter((c) => {
      if (!c.active) return false;
      if (onlyMagic && c.entityType !== 'Magia') return false;
      if (excludeMagic && c.entityType === 'Magia') return false;
      if (origin === 'Escaneamento' && !c.availableForScan) return false;
      if (origin === 'Drop de Mapa' && !c.availableForDrops) return false;
      if (origin === 'Booster' && !c.availableForBoosters) return false;
      return true;
    });
    const pool = eligibleChars.length > 0 ? eligibleChars : charactersPool;
    chosenChar = pool[Math.floor(Math.random() * pool.length)] || INITIAL_BASE_CHARACTERS[0];
  }

  // 2. Determine enabled & eligible Classes for this character
  const enabledClasses = OFFICIAL_CLASSES.filter((cls) => {
    const table = balanceTables[cls];
    if (!table || !table.enabled) return false;
    if (!chosenChar!.allowedClasses.includes(cls)) return false;
    if (allowedClassesOverride && !allowedClassesOverride.includes(cls)) return false;
    return true;
  });

  const chosenClass: CardClass =
    forcedClass && balanceTables[forcedClass]?.enabled
      ? forcedClass
      : (chosenChar.rarity && chosenChar.rarity !== 'Não classificada' && balanceTables[chosenChar.rarity as CardClass]?.enabled)
      ? (chosenChar.rarity as CardClass)
      : enabledClasses.length > 0
      ? pickWeighted(
          enabledClasses.map((cls) => {
            const t = balanceTables[cls];
            const weight =
              origin === 'Escaneamento'
                ? t.scanProbability
                : origin === 'Drop de Mapa'
                ? t.dropProbability
                : t.boosterSpecialProbability;
            return { item: cls, weight };
          })
        )
      : 'Comum';

  const classTable = balanceTables[chosenClass] || balanceTables.Comum;

  // 3. Determine Rank (S, A, B, C, D)
  const candidateRanks: CardRank[] =
    allowedRanksOverride && allowedRanksOverride.length > 0
      ? OFFICIAL_RANKS.filter((r) => allowedRanksOverride.includes(r))
      : OFFICIAL_RANKS;

  const chosenRank: CardRank =
    forcedRank && candidateRanks.includes(forcedRank)
      ? forcedRank
      : pickWeighted(
          candidateRanks.map((r) => ({
            item: r,
            weight: classTable.ranks[r]?.rankProbability ?? 20,
          }))
        );

  const rankRule = classTable.ranks[chosenRank] || classTable.ranks.B;

  // 4. Handle MAGIC CARDS vs CREATURE CARDS (Section 12)
  const isMagicCard = chosenChar.entityType === 'Magia';

  // Roll PV & Summon Cost for Creatures
  const rolledPv = isMagicCard
    ? 0
    : rollSteppedValue(rankRule.pvMin, rankRule.pvMax, rankRule.pvIncrement);

  const rolledSummonCost = isMagicCard
    ? Math.max(1, Math.min(9, chosenChar.magicManaCost ?? 3))
    : Math.max(
        1,
        Math.min(9, rollSteppedValue(rankRule.summonCostMin, rankRule.summonCostMax, 1))
      );

  // 5. Determine number of abilities for this Class (Section 7)
  const abilityCount = isMagicCard
    ? 1
    : (Math.max(
        1,
        Math.min(
          4,
          rollSteppedValue(classTable.abilityCountMin, classTable.abilityCountMax, 1)
        )
      ) as 1 | 2 | 3 | 4);

  // Select abilities from BaseCharacter sorted by unlockPriority (preserving identity)
  const sortedTemplates = [...chosenChar.abilities].sort(
    (a, b) => a.unlockPriority - b.unlockPriority
  );
  const selectedTemplates = sortedTemplates.slice(0, abilityCount);
  while (selectedTemplates.length < abilityCount) {
    const idx = selectedTemplates.length + 1;
    selectedTemplates.push({
      id: `ab-auto-${idx}`,
      name: `Ataque Elemental ${idx}`,
      description: 'Golpe canalizado pela essência de Slimelands.',
      tier: idx === 1 ? 'Básica' : idx === 2 ? 'Intermediária' : idx === 3 ? 'Forte' : 'Suprema',
      unlockPriority: idx as 1 | 2 | 3 | 4,
    });
  }

  // 6. Distribute Damage & Mana Coherently across Abilities (Sections 8 & 9)
  // Ability 1: Básica (Mana 1-2, ~30-45% of max)
  // Ability 2: Intermediária (Mana 3-4, ~50-68% of max)
  // Ability 3: Forte (Mana 5-6, ~72-86% of max)
  // Ability 4: Suprema (Mana 7-9, ~88-100% of max)
  const tierDamageFactors: [number, number][] = [
    [0.28, 0.45],
    [0.48, 0.66],
    [0.70, 0.86],
    [0.88, 1.0],
  ];
  const tierManaRanges: [number, number][] = [
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 9],
  ];

  // Decide which ability index is Free (0 Mana) if guaranteedFreeAbility is active (e.g., Mítica)
  const freeIndex =
    !isMagicCard && classTable.guaranteedFreeAbility
      ? selectedTemplates.length - 1 // Make the signature/highest ability free (Chromatic ∞)
      : -1;

  const generatedAbilities: GeneratedAbilityInstance[] = selectedTemplates.map(
    (tpl, idx) => {
      if (isMagicCard) {
        const mana = Math.max(1, Math.min(9, chosenChar!.magicManaCost ?? 3));
        return {
          id: `${tpl.id}-inst-${idx}`,
          templateId: tpl.id,
          name: tpl.name,
          description: tpl.description,
          tier: 'Magia',
          damage: 0,
          manaCost: mana,
          isFree: false,
          parryStaminaCost: (mana * 1) / 2,
          specialEffect: tpl.specialEffect,
          unlockOrder: idx + 1,
        };
      }

      // Scale factor based on slot position so multiple abilities always progress in damage
      const factorPair =
        abilityCount === 1
          ? [0.75, 1.0]
          : tierDamageFactors[Math.min(3, idx)];

      const slotMinDmg = Math.max(
        rankRule.damageMin,
        Math.round(rankRule.damageMax * factorPair[0])
      );
      const slotMaxDmg = Math.max(
        slotMinDmg,
        Math.round(rankRule.damageMax * factorPair[1])
      );

      const dmg = rollSteppedValue(
        Math.min(slotMinDmg, rankRule.damageMax),
        Math.min(slotMaxDmg, rankRule.damageMax),
        rankRule.damageIncrement
      );

      const isFree = idx === freeIndex;
      const manaRange = tierManaRanges[Math.min(3, idx)];
      const manaCost = isFree
        ? 0
        : Math.max(1, Math.min(9, rollSteppedValue(manaRange[0], manaRange[1], 1)));

      return {
        id: `${tpl.id}-inst-${idx}`,
        templateId: tpl.id,
        name: tpl.name,
        description: tpl.description,
        tier: tpl.tier,
        damage: dmg,
        manaCost,
        isFree,
        parryStaminaCost: manaCost * 0.5,
        specialEffect: tpl.specialEffect,
        unlockOrder: idx + 1,
      };
    }
  );

  // Ensure strictly increasing damage when there are multiple creature attacks
  if (!isMagicCard && generatedAbilities.length > 1) {
    for (let i = 1; i < generatedAbilities.length; i++) {
      if (generatedAbilities[i].damage <= generatedAbilities[i - 1].damage) {
        generatedAbilities[i].damage = Math.min(
          rankRule.damageMax,
          generatedAbilities[i - 1].damage + rankRule.damageIncrement
        );
      }
    }
  }

  const maxDamage = isMagicCard
    ? 0
    : Math.max(...generatedAbilities.map((a) => a.damage), 0);

  // 7. Map generated abilities onto the 4 BottomStatPills of the visual CardFrameSVG
  const badgePaletteByMana = (mana: number) => {
    if (mana <= 2) return '#0084FF';
    if (mana <= 4) return '#10B981';
    if (mana <= 6) return '#9333EA';
    return '#DF9A1E';
  };

  const defaultPills: [BottomStatPill, BottomStatPill, BottomStatPill, BottomStatPill] = [
    { id: 'p1', mode: 'stat', badgeValue: '2', badgeColor: '#0084FF', mainText: '150' },
    { id: 'p2', mode: 'stat', badgeValue: '4', badgeColor: '#10B981', mainText: '300' },
    { id: 'p3', mode: 'stat', badgeValue: '6', badgeColor: '#9333EA', mainText: '600' },
    { id: 'p4', mode: 'stat', badgeValue: '8', badgeColor: '#DF9A1E', mainText: '900' },
  ];

  generatedAbilities.forEach((ab, i) => {
    if (i < 4) {
      if (isMagicCard) {
        defaultPills[i] = {
          id: `p${i + 1}`,
          mode: 'stat',
          badgeValue: String(ab.manaCost),
          badgeColor: '#9333EA',
          mainText: 'MAGIA',
          isChromaticSpecial: ab.isFree,
        };
      } else {
        defaultPills[i] = {
          id: `p${i + 1}`,
          mode: 'stat',
          badgeValue: ab.isFree ? '∞' : String(ab.manaCost),
          badgeColor: badgePaletteByMana(ab.manaCost),
          mainText: String(ab.damage),
          isChromaticSpecial: ab.isFree,
        };
      }
    }
  });

  // Choose palette based on Element
  const elementPaletteMap: Record<string, typeof DEFAULT_PRESET_PALETTES[0]> = {
    TERRA: DEFAULT_PRESET_PALETTES[2],
    AGUA: DEFAULT_PRESET_PALETTES[1],
    FOGO: DEFAULT_PRESET_PALETTES[0],
    ARCANO: DEFAULT_PRESET_PALETTES[3],
    MAGIA: DEFAULT_PRESET_PALETTES[3],
    LUZ: DEFAULT_PRESET_PALETTES[4],
    VENENO: DEFAULT_PRESET_PALETTES[2],
    SOMBRA: DEFAULT_PRESET_PALETTES[3],
  };
  const pal =
    elementPaletteMap[chosenChar.element.toUpperCase()] || DEFAULT_PRESET_PALETTES[0];

  const isPremiumByDefault =
    chosenClass === 'Lendária' ||
    chosenClass === 'Mítica' ||
    chosenClass === 'Limitada' ||
    chosenRank === 'S';

  const topAbility = generatedAbilities[generatedAbilities.length - 1];

  // 8. Build the complete CardData instance with the requested defaults (2px stroke, 100% glow, 100% prismatic, 100% glitter, 100% parallax, 100% keylight speed)
  return {
    id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: chosenChar.name.split(',')[0].trim(),
    pvText: isMagicCard ? `MANA${rolledSummonCost}` : `PV${rolledPv}`,
    elementText: chosenChar.element.slice(0, 6).toUpperCase(),
    rankBadgeText: chosenRank,
    loreHeader: `${chosenChar.name} · ${chosenClass} (Estamina ${rolledSummonCost})`,
    loreBody: chosenChar.description,
    magicPrefix: isMagicCard
      ? `✨ Magia (${chosenChar.magicTarget || 'Campo'})`
      : `⚔️ ${topAbility.name} (${topAbility.isFree ? 'Custo 0 · ∞' : `${topAbility.manaCost} Mana`})`,
    magicDescription:
      topAbility.specialEffect || topAbility.description,
    showLoreBox: true,
    loreBoxOpacity: 92,
    loreBoxY: 724,
    pillCount: abilityCount,
    dockAutoFit: true,
    pills: defaultPills,
    imageUrl: chosenChar.imageUrl ? chosenChar.imageUrl : null,
    videoUrl: null,
    mediaType: 'image',
    imageScale: 1,
    imageOffsetX: 0,
    imageOffsetY: 0,
    backgroundFill: 'dark',
    autoAdaptColors: true,
    frameTopColor: pal.frameTopColor,
    frameMidColor: pal.frameMidColor,
    frameBottomColor: pal.frameBottomColor,
    strokeColor: pal.strokeColor,
    // Mandatory new user defaults: 2px contour & 100% shine/effects
    strokeWidth: 2,
    strokeGlow: 100,
    elementTextColor: pal.elementTextColor,
    rankCircleColor: pal.rankCircleColor,
    extractedSwatches: DEFAULT_PRESET_PALETTES,
    isPremium: isPremiumByDefault,
    prismaticIntensity: 100,
    microGlitterIntensity: 100,
    contourLightSpeed: 1.8,
    parallaxDepth: 100,
    autoShowcaseEnabled: false,
    showcaseDurationSec: 5,
    isRankChromatic:
      chosenClass === 'Mítica' ||
      chosenClass === 'Lendária' ||
      chosenClass === 'Limitada' ||
      chosenRank === 'S',
    isPvChromatic:
      chosenClass === 'Mítica' ||
      chosenClass === 'Lendária' ||
      chosenClass === 'Limitada',
    invertElementCapsule: true,
    showcaseVfx: 'none',
    showcaseVfxIntensity: 85,
    vfxPlayOnNormalView: false,
    backImageUrl: null,
    backImageScale: 1,
    backImageOffsetX: 0,
    backImageOffsetY: 0,
    // Worlds of Slimelands Procedural Instance Fields
    baseCharacterId: chosenChar.id,
    cardClass: chosenClass,
    cardRank: chosenRank,
    entityType: chosenChar.entityType,
    pvNumber: rolledPv,
    maxDamage,
    summonStaminaCost: rolledSummonCost,
    generatedAbilities,
    origin,
    deckId,
    createdAt: new Date().toISOString(),
    rulesVersion: RULES_VERSION,
    // Matrix Instance Links & Subgroups (Section 8)
    rarity: chosenClass,
    family: chosenChar.family,
    biome: chosenChar.biome,
    themeCollections: chosenChar.themeCollections,
    isClassified: true,
    isMatrixBlueprint: false,
    matrixId: chosenChar.id,
    versionId: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
}

/**
 * Generates an official 9-card Booster Pack using the exact same procedural engine (Section 13).
 * Automatically normalizes Special Slot (Slot 9) class probabilities across enabled classes.
 */
export function generateBoosterPack(
  booster: BoosterModel,
  charactersPool: BaseCharacter[],
  balanceTables: Record<CardClass, ClassBalanceTable>,
  deckId = 'deck-main'
): CardData[] {
  const packCards: CardData[] = [];

  // 1. Filter out unclassified blueprints: only classified characters enter boosters (Section 3 & 12)
  const classifiedPool = charactersPool.filter(
    (c) => c.active && c.rarity !== 'Não classificada' && c.isClassified !== false
  );

  // 2. Filter by booster criteria if specified
  const filteredPool = classifiedPool.filter((c) => {
    if (booster.biomes && booster.biomes.length > 0 && c.biome && !booster.biomes.includes(c.biome)) return false;
    if (booster.families && booster.families.length > 0 && c.family && !booster.families.includes(c.family)) return false;
    if (booster.themeCollections && booster.themeCollections.length > 0) {
      const match = c.themeCollections?.some((col) => booster.themeCollections!.includes(col));
      if (!match) return false;
    }
    if (booster.matrixIds && booster.matrixIds.length > 0 && !booster.matrixIds.includes(c.id)) return false;
    return true;
  });

  const effectivePool = filteredPool.length > 0 
    ? filteredPool 
    : classifiedPool.length > 0 
    ? classifiedPool 
    : charactersPool;

  const pickCharacterForCategory = (category: CardClass, onlyMagic?: boolean, excludeMagic?: boolean): BaseCharacter | undefined => {
    const candidates = effectivePool.filter((c) => {
      if (onlyMagic && c.entityType !== 'Magia') return false;
      if (excludeMagic && c.entityType === 'Magia') return false;
      if (c.rarity && c.rarity !== 'Não classificada') {
        return c.rarity === category;
      }
      return c.allowedClasses.includes(category);
    });
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    return undefined;
  };

  for (const slot of booster.slots) {
    if (slot.category === 'Comum') {
      const chosenChar = pickCharacterForCategory('Comum', false, true);
      packCards.push(
        generateProceduralCard({
          character: chosenChar,
          charactersPool: effectivePool,
          balanceTables,
          origin: 'Booster',
          forcedClass: 'Comum',
          allowedRanksOverride: slot.allowedRanks,
          excludeMagic: true,
          deckId,
        })
      );
    } else if (slot.category === 'Rara') {
      const chosenChar = pickCharacterForCategory('Rara', false, true);
      packCards.push(
        generateProceduralCard({
          character: chosenChar,
          charactersPool: effectivePool,
          balanceTables,
          origin: 'Booster',
          forcedClass: 'Rara',
          allowedRanksOverride: slot.allowedRanks,
          excludeMagic: true,
          deckId,
        })
      );
    } else if (slot.category === 'Magia') {
      const magicCandidates = effectivePool.filter((c) => c.entityType === 'Magia');
      const chosenChar = magicCandidates.length > 0 
        ? magicCandidates[Math.floor(Math.random() * magicCandidates.length)]
        : undefined;

      packCards.push(
        generateProceduralCard({
          character: chosenChar,
          charactersPool: effectivePool,
          balanceTables,
          origin: 'Booster',
          onlyMagic: true,
          allowedRanksOverride: slot.allowedRanks,
          deckId,
        })
      );
    } else if (slot.category === 'Especial_Alto_Rank') {
      // Slot 9: High Rank (A or S) across all enabled classes with normalized probabilities
      const enabledClasses = OFFICIAL_CLASSES.filter(
        (cls) =>
          balanceTables[cls]?.enabled &&
          balanceTables[cls].boosterSpecialProbability > 0
      );
      const specialClass = pickWeighted(
        enabledClasses.map((cls) => ({
          item: cls,
          weight: balanceTables[cls].boosterSpecialProbability,
        }))
      );
      const specialRank = pickWeighted(
        (['S', 'A'] as CardRank[]).map((r) => ({
          item: r,
          weight: booster.specialSlotRankProbs[r] ?? (r === 'A' ? 75 : 25),
        }))
      );

      const chosenChar = pickCharacterForCategory(specialClass, false, true);

      packCards.push(
        generateProceduralCard({
          character: chosenChar,
          charactersPool: effectivePool,
          balanceTables,
          origin: 'Booster',
          forcedClass: specialClass,
          forcedRank: specialRank,
          excludeMagic: true,
          deckId,
        })
      );
    } else {
      const forcedCls = slot.fixedClass || 'Comum';
      const chosenChar = pickCharacterForCategory(forcedCls);
      packCards.push(
        generateProceduralCard({
          character: chosenChar,
          charactersPool: effectivePool,
          balanceTables,
          origin: 'Booster',
          forcedClass: slot.fixedClass,
          allowedRanksOverride: slot.allowedRanks,
          deckId,
        })
      );
    }
  }

  return packCards;
}

/**
 * Statistical Monte Carlo Simulator (Section 19)
 * Simulates 100, 1,000, 10,000, or 100,000 cards or boosters without polluting the real inventory.
 */
export function runMonteCarloSimulation(
  count: number,
  mode: 'scan' | 'drop' | 'booster-special',
  charactersPool: BaseCharacter[],
  balanceTables: Record<CardClass, ClassBalanceTable>
): SimulationSummary {
  const byClass: Record<CardClass, number> = {
    Comum: 0,
    Rara: 0,
    Épica: 0,
    Lendária: 0,
    Mítica: 0,
    Limitada: 0,
  };
  const byRank: Record<CardRank, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  const byCombo: Record<string, number> = {};

  let totalPv = 0;
  let totalMaxDamage = 0;
  let totalSummonCost = 0;

  // Calculate normalized expected probabilities for enabled classes
  const enabledClasses = OFFICIAL_CLASSES.filter((c) => balanceTables[c]?.enabled);
  const rawWeights = enabledClasses.map((c) => {
    const t = balanceTables[c];
    const w =
      mode === 'scan'
        ? t.scanProbability
        : mode === 'drop'
        ? t.dropProbability
        : t.boosterSpecialProbability;
    return { cls: c, weight: Math.max(0, w) };
  });
  const totalWeight = rawWeights.reduce((acc, x) => acc + x.weight, 0) || 1;

  for (let i = 0; i < count; i++) {
    const cls = pickWeighted(rawWeights.map((x) => ({ item: x.cls, weight: x.weight })));
    const classTable = balanceTables[cls];
    const allowedRanks: CardRank[] =
      mode === 'booster-special' ? ['S', 'A'] : OFFICIAL_RANKS;

    const rnk = pickWeighted(
      allowedRanks.map((r) => ({
        item: r,
        weight: classTable.ranks[r]?.rankProbability ?? 20,
      }))
    );

    const rule = classTable.ranks[rnk];
    const pv = rollSteppedValue(rule.pvMin, rule.pvMax, rule.pvIncrement);
    const dmg = rollSteppedValue(rule.damageMin, rule.damageMax, rule.damageIncrement);
    const cost = rollSteppedValue(rule.summonCostMin, rule.summonCostMax, 1);

    byClass[cls]++;
    byRank[rnk]++;
    const comboKey = `${cls} · Rank ${rnk}`;
    byCombo[comboKey] = (byCombo[comboKey] || 0) + 1;

    totalPv += pv;
    totalMaxDamage += dmg;
    totalSummonCost += cost;
  }

  const expectedVsObserved = OFFICIAL_CLASSES.map((cls) => {
    const rw = rawWeights.find((x) => x.cls === cls)?.weight ?? 0;
    const configuredPct = balanceTables[cls]?.enabled ? (rw / totalWeight) * 100 : 0;
    const observedPct = (byClass[cls] / count) * 100;
    return {
      cardClass: cls,
      configuredPct: Number(configuredPct.toFixed(2)),
      observedPct: Number(observedPct.toFixed(2)),
      count: byClass[cls],
    };
  });

  return {
    totalCards: count,
    totalBoosters: mode === 'booster-special' ? count : Math.ceil(count / 9),
    byClass,
    byRank,
    byCombo,
    avgPv: Math.round(totalPv / count),
    avgMaxDamage: Math.round(totalMaxDamage / count),
    avgSummonCost: Number((totalSummonCost / count).toFixed(2)),
    mythicCount: byClass.Mítica,
    limitedCount: byClass.Limitada,
    expectedVsObserved,
  };
}
