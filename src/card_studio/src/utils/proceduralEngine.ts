import { CardData, BottomStatPill, CardColorPalette } from '../types/card';
import {
  BaseCharacter,
  BoosterModel,
  CardClass,
  CardEntityType,
  CardOrigin,
  CardRank,
  CharacterAbilityTemplate,
  ClassBalanceTable,
  DeckCategory,
  GeneratedAbilityInstance,
  MatrixRecordKind,
  ParryAttackerInput,
  SimulationSummary,
  SubgroupCatalog,
} from '../types/slimelands';
import { DEFAULT_PRESET_PALETTES } from './colorExtractor';
import { SAMPLE_ARTWORKS } from './defaultCards';
import {
  FORGE_PASSIVE_ABILITIES,
  FORGE_ACTIVE_SKILLS,
  ENCHANTMENT_REGISTRY,
  VFX_REGISTRY,
  findForgePassiveById,
  findForgeActiveById,
  findForgeEnchantmentById,
  getDefaultVfxForSlot,
} from './forgeAbilitiesCatalog';

export const RULES_VERSION = 'v2.0-slimelands-matrix';

export const OFFICIAL_CLASSES: CardClass[] = [
  'Comum',
  'Rara',
  'Épica',
  'Lendária',
  'Mítica',
  'Limitada',
];

export const OFFICIAL_RANKS: CardRank[] = ['S', 'A', 'B', 'C', 'D'];

export const OFFICIAL_ENTITY_TYPES: CardEntityType[] = [
  'Criatura',
  'Magia',
  'Item',
];

/**
 * Shared Independent Secondary Subgroup Catalog (Sections 5 & 6).
 * Subgroups are shared across all rarities without mixing cards of different rarities.
 */
export const DEFAULT_SUBGROUP_CATALOG: SubgroupCatalog = {
  families: [
    'Slimes Naturais',
    'Slimes Tóxicos',
    'Slimes Rochosos',
    'Slimes Cromáticos',
    'Slimes Vikings',
    'Slimes Orientais',
    'Slimes Divinos',
    'Slimes Arcanos',
    'Slimes Abissais',
    'Slimes Vulcânicos',
    'Feitiços Arcanos',
    'Relíquias Ancestrais',
  ],
  biomes: [
    'Floresta',
    'Pântano',
    'Deserto',
    'Neve',
    'Vulcânico',
    'Reino Sombrio',
    'Abismo Oceânico',
    'Santuário Solar',
  ],
  collections: [
    'Set Base Slimelands',
    'Criaturas Sombrias',
    'Halloween',
    'Coleção Oriental',
    'Coleção dos Deuses',
    'Festival de Inverno',
    'Coleção de Aniversário',
  ],
};

export const DEFAULT_DECK_CATEGORIES: DeckCategory[] = [
  {
    "id": "deck-divinos",
    "name": "Panteão Divino & Celestiais",
    "description": "Deuses ancestrais, constelações do zodíaco, regentes celestiais e titãs cósmicos.",
    "accentColor": "#EAB308"
  },
  {
    "id": "deck-elementais",
    "name": "Guardiões Elementais & Natureza",
    "description": "Titãs de fogo, magma, oceano, rocha, raízes, tempestades e montanhas.",
    "accentColor": "#06B6D4"
  },
  {
    "id": "deck-sombras",
    "name": "Cripta das Sombras & Necromancia",
    "description": "Necromantes, ceifadores, vampiros, múmias e horrores das profundezas.",
    "accentColor": "#9333EA"
  },
  {
    "id": "deck-guerreiros",
    "name": "Clã dos Ronins & Guerreiros",
    "description": "Samurais honrados, shoguns, ninjas furtivos, vikings nórdicos e mestres marciais.",
    "accentColor": "#EF4444"
  },
  {
    "id": "deck-gourmet",
    "name": "Reino Gourmet & Travessos",
    "description": "Pudins lendários, panquecas de mel, doces encantados e pequeninos ajudantes.",
    "accentColor": "#EC4899"
  },
  {
    "id": "deck-grimorio",
    "name": "Grimório Arcano & Relíquias",
    "description": "Poções mágicas, elixires lunares, ampulhetas do tempo, armas e feitiços.",
    "accentColor": "#6366F1"
  },
  {
    "id": "deck-main",
    "name": "Matriz Geral",
    "description": "Acervo completo de cartas ativas.",
    "accentColor": "#10B981"
  }
];

/**
 * Default Worlds of Slimelands Base Characters & Magic Cards.
 * A single BaseCharacter can originate countless card instances of different Classes and Ranks.
 */
export const INITIAL_BASE_CHARACTERS: BaseCharacter[] = [
  {
    id: 'char-slime-verde',
    name: 'Slime Verde',
    description:
      'Criatura elemental da floresta de Slimelands que canaliza seiva vital e ataques elásticos rápidos.',
    imageUrl: SAMPLE_ARTWORKS.hestridiaForest,
    entityType: 'Criatura',
    element: 'TERRA',
    matrixRarity: 'Comum',
    classificationState: 'classified',
    editState: 'configured',
    family: 'Slimes Naturais',
    biome: 'Floresta',
    collections: ['Set Base Slimelands'],
    allowedClasses: ['Comum'],
    availableForDrops: true,
    availableForScan: true,
    availableForBoosters: true,
    active: true,
    isProvisional: false,
    abilities: [
      {
        id: 'ab-verde-1',
        name: 'Salto Elástico',
        description: 'Investida rápida coberta de musgo vivo.',
        tier: 'Básica',
        unlockPriority: 1,
      },
      {
        id: 'ab-verde-2',
        name: 'Jato de Seiva',
        description: 'Dispara seiva pressurizada que reduz a agilidade.',
        tier: 'Intermediária',
        unlockPriority: 2,
      },
    ],
  },
  {
    id: 'char-slime-musgo',
    name: 'Slime Musgo',
    description:
      'Camuflado entre raízes antigas da Floresta, absorve umidade para endurecer sua membrana.',
    imageUrl: SAMPLE_ARTWORKS.hestridiaForest,
    entityType: 'Criatura',
    element: 'TERRA',
    matrixRarity: 'Comum',
    classificationState: 'classified',
    editState: 'configured',
    family: 'Slimes Naturais',
    biome: 'Floresta',
    collections: ['Set Base Slimelands'],
    allowedClasses: ['Comum'],
    availableForDrops: true,
    availableForScan: true,
    availableForBoosters: true,
    active: true,
    isProvisional: false,
    abilities: [
      {
        id: 'ab-musgo-1',
        name: 'Esporos de Musgo',
        description: 'Libera partículas densas ao redor do alvo.',
        tier: 'Básica',
        unlockPriority: 1,
      },
      {
        id: 'ab-musgo-2',
        name: 'Raiz Prensora',
        description: 'Prende os pés do adversário no solo úmido.',
        tier: 'Intermediária',
        unlockPriority: 2,
      },
    ],
  },
  {
    id: 'char-slime-guardiao',
    name: 'Slime Guardião',
    description:
      'Protetor veterano das clareiras sagradas da Floresta, dotado de núcleo cristalino resistente.',
    imageUrl: SAMPLE_ARTWORKS.hestridiaForest,
    entityType: 'Criatura',
    element: 'TERRA',
    matrixRarity: 'Rara',
    classificationState: 'classified',
    editState: 'configured',
    family: 'Slimes Rochosos',
    biome: 'Floresta',
    collections: ['Set Base Slimelands'],
    allowedClasses: ['Rara'],
    availableForDrops: true,
    availableForScan: true,
    availableForBoosters: true,
    active: true,
    isProvisional: false,
    abilities: [
      {
        id: 'ab-guard-1',
        name: 'Escudo de Casca',
        description: 'Golpeia com placas de madeira petrificada.',
        tier: 'Básica',
        unlockPriority: 1,
      },
      {
        id: 'ab-guard-2',
        name: 'Cravação Silvestre',
        description: 'Ergue estacas naturais que perfuram a guarda.',
        tier: 'Intermediária',
        unlockPriority: 2,
      },
      {
        id: 'ab-guard-3',
        name: 'Sentinela do Bosque',
        description: 'Impacto sísmico que protege aliados adjacentes.',
        tier: 'Forte',
        specialEffect: 'Reduz 1 de dano recebido no próximo turno.',
        unlockPriority: 3,
      },
    ],
  },
  {
    id: 'char-slime-venenoso',
    name: 'Slime Venenoso',
    description:
      'Habita os charcos profundos do Pântano, destilando toxinas ácidas que corroem escudos.',
    imageUrl: SAMPLE_ARTWORKS.abyssalLeviathan,
    entityType: 'Criatura',
    element: 'VENENO',
    matrixRarity: 'Rara',
    classificationState: 'classified',
    editState: 'configured',
    family: 'Slimes Tóxicos',
    biome: 'Pântano',
    collections: ['Set Base Slimelands', 'Criaturas Sombrias'],
    allowedClasses: ['Rara'],
    availableForDrops: true,
    availableForScan: true,
    availableForBoosters: true,
    active: true,
    isProvisional: false,
    abilities: [
      {
        id: 'ab-ven-1',
        name: 'Gota Corrosiva',
        description: 'Ácido concentrado que enfraquece a armadura.',
        tier: 'Básica',
        unlockPriority: 1,
      },
      {
        id: 'ab-ven-2',
        name: 'Névoa do Pântano',
        description: 'Cobre a arena com vapores venenosos densos.',
        tier: 'Intermediária',
        unlockPriority: 2,
      },
      {
        id: 'ab-ven-3',
        name: 'Erupção Tóxica',
        description: 'Explosão de lodo ácido de alto alcance.',
        tier: 'Forte',
        specialEffect: 'Aplica Veneno por 2 turnos.',
        unlockPriority: 3,
      },
    ],
  },
  {
    id: 'char-lumys',
    name: 'Lumys, o Slime Arcano',
    description:
      'Um pequeno slime que absorve a energia mágica presente nas florestas ancestrais, convertendo luz estelar em pulsos arcanos.',
    imageUrl: SAMPLE_ARTWORKS.hestridiaForest,
    entityType: 'Criatura',
    element: 'ARCANO',
    matrixRarity: 'Lendária',
    classificationState: 'classified',
    editState: 'configured',
    family: 'Slimes Arcanos',
    biome: 'Floresta',
    collections: ['Set Base Slimelands', 'Coleção dos Deuses'],
    allowedClasses: ['Lendária'],
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
      'Guardiã mítica da vida ancestral que percorre os bosques esquecidos de Slimelands, nutrindo as raízes primordiais.',
    imageUrl: SAMPLE_ARTWORKS.hestridiaForest,
    entityType: 'Criatura',
    element: 'TERRA',
    matrixRarity: 'Mítica',
    classificationState: 'classified',
    editState: 'configured',
    family: 'Slimes Divinos',
    biome: 'Floresta',
    collections: ['Set Base Slimelands', 'Coleção dos Deuses'],
    allowedClasses: ['Mítica'],
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
    matrixRarity: 'Lendária',
    classificationState: 'classified',
    editState: 'configured',
    family: 'Slimes Abissais',
    biome: 'Abismo Oceânico',
    collections: ['Set Base Slimelands', 'Criaturas Sombrias'],
    allowedClasses: ['Lendária'],
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
    matrixRarity: 'Limitada',
    classificationState: 'classified',
    editState: 'configured',
    family: 'Slimes Vulcânicos',
    biome: 'Vulcânico',
    collections: ['Halloween', 'Criaturas Sombrias'],
    allowedClasses: ['Limitada'],
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
  // MAGIC CARDS (Separated from Creature classes/stats as required by Section 5.4 & 13)
  {
    id: 'mag-convergencia',
    name: 'Convergência Estelar de Slimelands',
    description:
      'Alinha os cristais de éter do campo de batalha, restaurando o fluxo arcano e amplificando o próximo feitiço.',
    imageUrl: SAMPLE_ARTWORKS.abyssalLeviathan,
    entityType: 'Magia',
    element: 'MAGIA',
    matrixRarity: 'Rara',
    classificationState: 'classified',
    editState: 'configured',
    family: 'Feitiços Arcanos',
    biome: 'Floresta',
    collections: ['Set Base Slimelands'],
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
    matrixRarity: 'Comum',
    classificationState: 'classified',
    editState: 'configured',
    family: 'Feitiços Arcanos',
    biome: 'Pântano',
    collections: ['Set Base Slimelands', 'Criaturas Sombrias'],
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

export const DEFAULT_BALANCE_TABLES = DEFAULT_CLASS_BALANCE_TABLES;

/**
 * Default Official 9-Card Booster Models (Sections 12, 13 & 14):
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
    priceCoins: 150,
    themeLabel: 'Geral · Todos os Biomas',
    filters: {
      rarities: ['Comum', 'Rara', 'Épica', 'Lendária', 'Mítica', 'Limitada'],
      families: [],
      biomes: [],
      collections: [],
      types: ['Criatura', 'Magia', 'Item'],
      specificMatrixIds: [],
    },
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
  {
    id: 'booster-floresta-9',
    name: 'Booster Floresta',
    description:
      'Pack temático do Bioma Floresta: seleciona matrizes classificadas em Floresta (ex.: Slime Verde, Slime Musgo, Slime Guardião, Herisdia) e Magias.',
    totalCards: 9,
    active: true,
    priceCoins: 180,
    themeLabel: 'Bioma: Floresta',
    filters: {
      rarities: ['Comum', 'Rara', 'Épica', 'Lendária', 'Mítica', 'Limitada'],
      families: [],
      biomes: ['Floresta'],
      collections: [],
      types: ['Criatura', 'Magia'],
      specificMatrixIds: [],
    },
    specialSlotRankProbs: {
      S: 32,
      A: 68,
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
  {
    id: 'booster-pantano-sombrio-9',
    name: 'Booster Pântano & Criaturas Sombrias',
    description:
      'Pack temático filtrado por Bioma Pântano / Reino Sombrio e Coleção Criaturas Sombrias.',
    totalCards: 9,
    active: true,
    priceCoins: 220,
    themeLabel: 'Pântano & Criaturas Sombrias',
    filters: {
      rarities: ['Comum', 'Rara', 'Épica', 'Lendária', 'Mítica', 'Limitada'],
      families: ['Slimes Tóxicos', 'Slimes Cromáticos'],
      biomes: ['Pântano', 'Reino Sombrio'],
      collections: ['Criaturas Sombrias', 'Halloween'],
      types: ['Criatura', 'Magia'],
      specificMatrixIds: [],
    },
    specialSlotRankProbs: {
      S: 35,
      A: 65,
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
    matrixRarity: partial.matrixRarity,
    family: partial.family,
    biome: partial.biome,
    collections: partial.collections || [],
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
    const parryHalfUnits = safeMana;
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
 * SECTION 3: IMPORTAÇÃO DE CARTAS NEUTRAS
 * Creates an independent Matrix record in neutral state without rolling Rank, PV, Damage, Mana, Summon Cost, or random Rarity.
 */
export function createNeutralMatrixCard(input: {
  title: string;
  imageUrl: string;
  description?: string;
  palette?: CardColorPalette;
  deckId?: string;
}): CardData {
  const cleanTitle = (input.title || 'Carta Sem Nome').trim().toUpperCase();
  const pal = input.palette || DEFAULT_PRESET_PALETTES[0];
  const matrixId = `mtx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const defaultBaseAbilities: CharacterAbilityTemplate[] = [
    {
      id: `${matrixId}-ab-1`,
      name: 'Golpe Básico',
      description: 'Habilidade inicial aguardando configuração na Matriz.',
      tier: 'Básica',
      unlockPriority: 1,
      isProvisional: true,
    },
    {
      id: `${matrixId}-ab-2`,
      name: 'Técnica Especial',
      description: 'Habilidade secundária da Matriz.',
      tier: 'Intermediária',
      unlockPriority: 2,
      isProvisional: true,
    },
  ];

  return {
    id: matrixId,
    recordKind: 'matrix',
    classificationState: 'Não classificada',
    editState: 'Importada / Neutra',
    isNeutralMatrix: true,
    title: cleanTitle,
    pvText: 'PV—',
    elementText: 'NEUTRA',
    rankBadgeText: '—',
    loreHeader: `${cleanTitle} · Matriz Não Classificada`,
    loreBody:
      input.description?.trim() ||
      'Matriz importada em estado neutro. Classifique sua raridade, família, bioma, coleção e tipo antes de distribuir em packs.',
    magicPrefix: '⚙️ Matriz Neutra (Sem Atributos Sorteados)',
    magicDescription:
      'Atributos variáveis (Rank, PV, Dano, Mana, Invocação) serão gerados apenas quando solicitado.',
    showLoreBox: true,
    loreBoxOpacity: 92,
    loreBoxY: 724,
    pillCount: 1,
    dockAutoFit: true,
    showSummonCostPill: true,
    summonCostPill: {
      id: 'pill-summon-cost',
      mode: 'stat',
      badgeValue: '—',
      badgeColor: '#F59E0B',
      mainText: 'INVOC.',
      isSummonCost: true,
      costResource: 'stamina',
    },
    pills: [
      { id: 'p1', mode: 'text', badgeValue: '—', badgeColor: '#475569', mainText: 'NEUTRA' },
      { id: 'p2', mode: 'text', badgeValue: '—', badgeColor: '#475569', mainText: '—' },
      { id: 'p3', mode: 'text', badgeValue: '—', badgeColor: '#475569', mainText: '—' },
      { id: 'p4', mode: 'text', badgeValue: '—', badgeColor: '#475569', mainText: '—' },
    ],
    imageUrl: input.imageUrl,
    videoUrl: null,
    mediaType: 'image',
    imageScale: 1,
    imageOffsetX: 0,
    imageOffsetY: 0,
    backgroundFill: 'dark',
    autoAdaptColors: false,
    frameTopColor: pal.frameTopColor,
    frameMidColor: pal.frameMidColor,
    frameBottomColor: pal.frameBottomColor,
    strokeColor: pal.strokeColor,
    strokeWidth: 2,
    strokeGlow: 80,
    elementTextColor: pal.elementTextColor,
    rankCircleColor: pal.rankCircleColor,
    extractedSwatches: [pal, ...DEFAULT_PRESET_PALETTES.slice(0, 4)],
    isPremium: false,
    prismaticIntensity: 60,
    microGlitterIntensity: 50,
    contourLightSpeed: 1.5,
    parallaxDepth: 80,
    autoShowcaseEnabled: false,
    showcaseDurationSec: 5,
    isRankChromatic: false,
    isPvChromatic: false,
    invertElementCapsule: true,
    showcaseVfx: 'none',
    showcaseVfxIntensity: 80,
    vfxPlayOnNormalView: false,
    backImageUrl: null,
    backImageScale: 1,
    backImageOffsetX: 0,
    backImageOffsetY: 0,
    deckId: input.deckId || 'deck-main',
    entityType: 'Criatura',
    origin: 'Importação de Pasta',
    cardClass: undefined,
    cardRank: undefined,
    pvNumber: undefined,
    maxDamage: undefined,
    summonStaminaCost: undefined,
    family: undefined,
    biome: undefined,
    collections: [],
    baseAbilities: defaultBaseAbilities,
    generatedAbilities: [],
    createdAt: new Date().toISOString(),
    rulesVersion: RULES_VERSION,
  };
}

/**
 * Builds a classified Matrix card from a BaseCharacter definition.
 */
export function createMatrixFromBaseCharacter(
  char: BaseCharacter,
  deckId = 'deck-main'
): CardData {
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
    elementPaletteMap[char.element.toUpperCase()] || DEFAULT_PRESET_PALETTES[0];
  const assignedRarity: CardClass =
    char.matrixRarity || char.allowedClasses[0] || 'Comum';
  const isMagic = char.entityType === 'Magia';
  const defaultPassive = FORGE_PASSIVE_ABILITIES[0];
  const defaultManaCost = char.magicManaCost ?? 3;

  return {
    id: `mtx-${char.id}`,
    recordKind: 'matrix',
    classificationState: 'Classificada',
    editState: 'Pronta para Packs',
    isNeutralMatrix: false,
    title: char.name.split(',')[0].trim(),
    pvText: isMagic ? 'DF—' : 'PV—',
    elementText: char.element.slice(0, 6).toUpperCase(),
    rankBadgeText: '—',
    loreHeader: isMagic
      ? `${char.name} · Magia ${assignedRarity} (+DF no PV · Mana ${defaultManaCost})`
      : `${char.name} · Matriz ${assignedRarity}`,
    loreBody: char.description,
    magicPrefix: isMagic
      ? `✨ Passiva: ${defaultPassive?.name || char.magicTarget || 'Tabuleiro'}`
      : `🧬 Matriz Base (${char.abilities.length} Habilidades)`,
    magicDescription: isMagic
      ? defaultPassive
        ? `${defaultPassive.description} (${defaultPassive.effectText})`
        : char.abilities[0]?.specialEffect || char.description
      : char.abilities[0]?.specialEffect ||
        char.abilities[0]?.description ||
        char.description,
    magicAbilityKind: isMagic ? 'passive' : undefined,
    linkedPassiveId: isMagic ? (defaultPassive?.id || 'first_strike') : undefined,
    showLoreBox: true,
    loreBoxOpacity: 92,
    loreBoxY: 724,
    pillCount: isMagic
      ? 1
      : (Math.min(4, Math.max(1, char.abilities.length)) as 1 | 2 | 3 | 4),
    dockAutoFit: true,
    showSummonCostPill: true,
    summonCostPill: isMagic
      ? {
          id: 'pill-summon-cost',
          mode: 'stat',
          badgeValue: String(defaultManaCost),
          badgeColor: '#0084FF',
          mainText: 'MANA',
          isSummonCost: true,
          costResource: 'mana',
        }
      : {
          id: 'pill-summon-cost',
          mode: 'stat',
          badgeValue: '—',
          badgeColor: '#F59E0B',
          mainText: 'INVOC.',
          isSummonCost: true,
          costResource: 'stamina',
        },
    pills: [
      {
        id: 'p1',
        mode: isMagic ? 'stat' : 'text',
        badgeValue: isMagic ? String(defaultManaCost) : '1',
        badgeColor: '#0084FF',
        mainText: isMagic
          ? 'MANA'
          : char.abilities[0]?.name.slice(0, 8).toUpperCase() || 'ATAQUE 1',
        isSummonCost: isMagic,
        costResource: isMagic ? 'mana' : undefined,
      },
      {
        id: 'p2',
        mode: 'text',
        badgeValue: '2',
        badgeColor: '#10B981',
        mainText: char.abilities[1]?.name.slice(0, 8).toUpperCase() || 'ATAQUE 2',
      },
      {
        id: 'p3',
        mode: 'text',
        badgeValue: '3',
        badgeColor: '#9333EA',
        mainText: char.abilities[2]?.name.slice(0, 8).toUpperCase() || 'ATAQUE 3',
      },
      {
        id: 'p4',
        mode: 'text',
        badgeValue: '4',
        badgeColor: '#DF9A1E',
        mainText: char.abilities[3]?.name.slice(0, 8).toUpperCase() || 'ATAQUE 4',
      },
    ],
    imageUrl: char.imageUrl ? char.imageUrl : null,
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
    strokeWidth: 2,
    strokeGlow: 100,
    elementTextColor: pal.elementTextColor,
    rankCircleColor: pal.rankCircleColor,
    extractedSwatches: DEFAULT_PRESET_PALETTES,
    isPremium:
      assignedRarity === 'Lendária' ||
      assignedRarity === 'Mítica' ||
      assignedRarity === 'Limitada',
    prismaticIntensity: 100,
    microGlitterIntensity: 100,
    contourLightSpeed: 1.8,
    parallaxDepth: 100,
    autoShowcaseEnabled: false,
    showcaseDurationSec: 5,
    isRankChromatic:
      assignedRarity === 'Mítica' ||
      assignedRarity === 'Lendária' ||
      assignedRarity === 'Limitada',
    isPvChromatic:
      assignedRarity === 'Mítica' ||
      assignedRarity === 'Lendária' ||
      assignedRarity === 'Limitada',
    invertElementCapsule: true,
    showcaseVfx: 'none',
    showcaseVfxIntensity: 85,
    vfxPlayOnNormalView: false,
    backImageUrl: null,
    backImageScale: 1,
    backImageOffsetX: 0,
    backImageOffsetY: 0,
    baseCharacterId: char.id,
    cardClass: assignedRarity,
    cardRank: undefined,
    entityType: char.entityType,
    family: char.family,
    biome: char.biome,
    collections: char.collections || [],
    baseAbilities: char.abilities,
    generatedAbilities: [],
    origin: 'Manual',
    deckId,
    createdAt: new Date().toISOString(),
    rulesVersion: RULES_VERSION,
    magicManaCost: char.magicManaCost,
    magicTarget: char.magicTarget,
    magicCondition: char.magicCondition,
  };
}

/**
 * SECTION 8, 9 & 10: GENERATE VERSION OR INSTANCE FROM A CLASSIFIED MATRIX
 * Never re-rolls the Matrix's rarity, family, biome, collections, type, or base ability names.
 * Only generates the variable numerical attributes (Rank, PV, Damage, Mana, Summon Cost)
 * according to the Matrix's assigned Rarity and the Balance Table.
 */
export interface MatrixGenerationRequest {
  matrix: CardData;
  balanceTables: Record<CardClass, ClassBalanceTable>;
  targetRecordKind: 'version' | 'instance';
  origin?: CardOrigin;
  forcedRank?: CardRank;
  allowedRanksOverride?: CardRank[];
  deckId?: string;
}

export function generateFromMatrix(req: MatrixGenerationRequest): CardData {
  const {
    matrix,
    balanceTables,
    targetRecordKind,
    origin = 'Booster',
    forcedRank,
    allowedRanksOverride,
    deckId,
  } = req;

  // If this is an instance generation for a Booster and the admin enabled a Fixed Version on the matrix,
  // clone the fixed attributes directly while assigning a unique instance ID!
  if (
    targetRecordKind === 'instance' &&
    matrix.useFixedVersionInPacks &&
    !matrix.isNeutralMatrix &&
    matrix.cardRank &&
    (matrix.pvNumber !== undefined || matrix.entityType === 'Item')
  ) {
    return {
      ...matrix,
      id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      recordKind: 'instance',
      sourceMatrixId: matrix.sourceMatrixId || matrix.id,
      origin,
      deckId: deckId || matrix.deckId,
      generatedAbilities: matrix.generatedAbilities
        ? matrix.generatedAbilities.map((ab) => ({ ...ab }))
        : [],
      summonCostPill: matrix.summonCostPill ? { ...matrix.summonCostPill } : undefined,
      pills: [
        { ...matrix.pills[0] },
        { ...matrix.pills[1] },
        { ...matrix.pills[2] },
        { ...matrix.pills[3] },
      ],
      createdAt: new Date().toISOString(),
    };
  }

  // Rarity is strictly inherited from the Matrix (Section 4: "A raridade da matriz não deve ser sorteada novamente")
  const matrixRarity: CardClass = matrix.cardClass || 'Comum';
  const classTable = balanceTables[matrixRarity] || balanceTables.Comum;
  const entityType: CardEntityType = matrix.entityType || 'Criatura';
  const isCreature = entityType === 'Criatura';
  const isMagicCard = entityType === 'Magia';
  const isItemCard = entityType === 'Item';

  // Determine Rank (S, A, B, C, D)
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

  // Both Creature AND Magic cards have PV, Class, and Rank in the Rarity flow!
  // Only Item cards do not roll PV / Summon Cost.
  const rolledPv =
    isCreature || isMagicCard
      ? rollSteppedValue(rankRule.pvMin, rankRule.pvMax, rankRule.pvIncrement)
      : 0;

  // Independent of rarity, Creature cards roll Stamina Summon Cost (5th slot) and Magic cards roll Mana Summon Cost!
  const rolledSummonCost = isCreature
    ? Math.max(1, Math.min(9, rollSteppedValue(rankRule.summonCostMin, rankRule.summonCostMax, 1)))
    : isMagicCard
    ? Math.max(
        1,
        Math.min(
          9,
          matrix.magicManaCost ??
            rollSteppedValue(rankRule.summonCostMin, rankRule.summonCostMax, 1)
        )
      )
    : 0;

  // Determine number of abilities for this Rarity (Magic cards do not use attack ability slots 1-4)
  const abilityCount = !isCreature
    ? 1
    : (Math.max(
        1,
        Math.min(
          4,
          rollSteppedValue(classTable.abilityCountMin, classTable.abilityCountMax, 1)
        )
      ) as 1 | 2 | 3 | 4);

  // Resolve linked Forja Passive / Active for Magic Cards
  let magicAbilityKind: 'passive' | 'active' = matrix.magicAbilityKind || 'passive';
  let linkedPassiveId = matrix.linkedPassiveId;
  let linkedActiveSkillId = matrix.linkedActiveSkillId;
  let resolvedMagicName = matrix.title;
  let resolvedMagicPrefix = matrix.magicPrefix;
  let resolvedMagicDesc = matrix.magicDescription;

  if (isMagicCard) {
    if (magicAbilityKind === 'active') {
      const chosenActive =
        findForgeActiveById(linkedActiveSkillId) ||
        FORGE_ACTIVE_SKILLS[Math.floor(Math.random() * FORGE_ACTIVE_SKILLS.length)];
      if (chosenActive) {
        linkedActiveSkillId = chosenActive.id;
        resolvedMagicName = chosenActive.name;
        resolvedMagicPrefix = `⚡ Ativa de Tabuleiro: ${chosenActive.name} (Alcance ${chosenActive.range} · CD ${chosenActive.cooldown}t)`;
        resolvedMagicDesc = chosenActive.description;
      }
    } else {
      const chosenPassive =
        findForgePassiveById(linkedPassiveId) ||
        FORGE_PASSIVE_ABILITIES[Math.floor(Math.random() * FORGE_PASSIVE_ABILITIES.length)];
      if (chosenPassive) {
        linkedPassiveId = chosenPassive.id;
        resolvedMagicName = chosenPassive.name;
        resolvedMagicPrefix = `✨ Passiva de Tabuleiro: ${chosenPassive.name} (${chosenPassive.triggerText})`;
        resolvedMagicDesc = `${chosenPassive.description} — ${chosenPassive.effectText}`;
      }
    }
  }

  // Preserve base ability names from the Matrix
  const baseTemplates: CharacterAbilityTemplate[] =
    matrix.baseAbilities && matrix.baseAbilities.length > 0
      ? [...matrix.baseAbilities].sort((a, b) => a.unlockPriority - b.unlockPriority)
      : matrix.generatedAbilities && matrix.generatedAbilities.length > 0
      ? matrix.generatedAbilities.map((ga, idx) => ({
          id: ga.templateId || ga.id,
          name: ga.name,
          description: ga.description,
          tier: ga.tier,
          specialEffect: ga.specialEffect,
          unlockPriority: (idx + 1) as 1 | 2 | 3 | 4,
        }))
      : [
          {
            id: `${matrix.id}-ab-1`,
            name: isMagicCard ? resolvedMagicName : 'Ataque Viscoso',
            description: isMagicCard
              ? resolvedMagicDesc
              : matrix.loreBody || 'Habilidade canalizada de Slimelands.',
            tier: isMagicCard ? 'Magia' : 'Básica',
            unlockPriority: 1,
          },
          {
            id: `${matrix.id}-ab-2`,
            name: 'Investida Elemental',
            description: 'Segundo ataque da matriz.',
            tier: 'Intermediária',
            unlockPriority: 2,
          },
          {
            id: `${matrix.id}-ab-3`,
            name: 'Explosão de Núcleo',
            description: 'Terceiro ataque da matriz.',
            tier: 'Forte',
            unlockPriority: 3,
          },
          {
            id: `${matrix.id}-ab-4`,
            name: 'Supremacia Ancestral',
            description: 'Habilidade suprema da matriz.',
            tier: 'Suprema',
            unlockPriority: 4,
          },
        ];

  const selectedTemplates = baseTemplates.slice(0, abilityCount);
  while (selectedTemplates.length < abilityCount) {
    const idx = selectedTemplates.length + 1;
    selectedTemplates.push({
      id: `${matrix.id}-ab-auto-${idx}`,
      name: `Habilidade ${idx}`,
      description: 'Habilidade adicional liberada pela raridade.',
      tier: idx === 1 ? 'Básica' : idx === 2 ? 'Intermediária' : idx === 3 ? 'Forte' : 'Suprema',
      unlockPriority: idx as 1 | 2 | 3 | 4,
    });
  }

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

  const freeIndex =
    isCreature && classTable.guaranteedFreeAbility
      ? selectedTemplates.length - 1
      : -1;

  const impactVfxPool = VFX_REGISTRY.filter((v) => v.category === 'impact');
  const elemVfxPool = VFX_REGISTRY.filter((v) => v.category === 'elemental' || v.category === 'status');
  const ultVfxPool = VFX_REGISTRY.filter((v) => v.category === 'ultimate');

  const generatedAbilities: GeneratedAbilityInstance[] = selectedTemplates.map(
    (tpl, idx) => {
      const existingPill = matrix.pills?.[idx];
      if (!isCreature) {
        return {
          id: `${tpl.id}-inst-${idx}`,
          templateId: tpl.id,
          name: isMagicCard ? resolvedMagicName : tpl.name,
          description: isMagicCard ? resolvedMagicDesc : tpl.description,
          tier: isMagicCard ? 'Magia' : 'Básica',
          damage: 0,
          manaCost: isMagicCard ? rolledSummonCost : 0,
          isFree: isItemCard,
          parryStaminaCost: isMagicCard ? rolledSummonCost * 0.5 : 0,
          specialEffect: isMagicCard ? resolvedMagicDesc : tpl.specialEffect,
          unlockOrder: idx + 1,
          attackType: 'damage',
          vfxId: existingPill?.vfxId || tpl.vfxId || 'vfx_siphon_cast',
          costResource: 'mana',
        };
      }

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

      // Resolve Attack Type, Special Effect (Enchantment), Resource, and VFX from Forge V1
      let attackType: 'damage' | 'enchantment' =
        existingPill?.attackType || tpl.attackType || 'damage';
      let enchantmentId: string | undefined =
        existingPill?.enchantmentId || tpl.enchantmentId;
      let enchantmentValue: number | undefined =
        existingPill?.enchantmentValue ?? tpl.enchantmentValue;
      let enchantmentTurns: number | undefined =
        existingPill?.enchantmentTurns ?? tpl.enchantmentTurns;
      let costResource: 'stamina' | 'mana' =
        existingPill?.costResource ||
        tpl.costResource ||
        (idx >= 2 ? 'mana' : 'stamina');

      // On slot 2 or 3 (idx 1 or 2), if not manually configured, roll a Special Effect / Enchantment from Forge V1
      if (!enchantmentId && (idx === 1 || idx === 2) && ENCHANTMENT_REGISTRY.length > 0) {
        const shouldRollEnc = idx === 1 ? Math.random() < 0.45 : Math.random() < 0.55;
        if (shouldRollEnc) {
          const pickedEnc =
            ENCHANTMENT_REGISTRY[Math.floor(Math.random() * ENCHANTMENT_REGISTRY.length)];
          if (pickedEnc) {
            enchantmentId = pickedEnc.id;
            enchantmentValue = pickedEnc.defaultValue;
            enchantmentTurns = pickedEnc.defaultTurns;
            // Can be pure enchantment or damage + enchantment
            if (Math.random() < 0.45) {
              attackType = 'enchantment';
              costResource = pickedEnc.defaultResource;
            }
          }
        }
      }

      const encDef = findForgeEnchantmentById(enchantmentId);
      let vfxId = existingPill?.vfxId || tpl.vfxId;
      if (!vfxId) {
        if (idx === 3 && ultVfxPool.length > 0) {
          vfxId = ultVfxPool[Math.floor(Math.random() * ultVfxPool.length)].id;
        } else if ((attackType === 'enchantment' || enchantmentId) && elemVfxPool.length > 0) {
          vfxId = elemVfxPool[Math.floor(Math.random() * elemVfxPool.length)].id;
        } else if (impactVfxPool.length > 0) {
          vfxId = impactVfxPool[idx % impactVfxPool.length].id;
        } else {
          vfxId = getDefaultVfxForSlot(idx, attackType === 'enchantment');
        }
      }

      const finalName =
        existingPill?.attackName ||
        (attackType === 'enchantment' && encDef ? encDef.name : tpl.name);
      const finalSpecialEffect =
        encDef
          ? `${encDef.icon} ${encDef.name}: ${encDef.description}`
          : tpl.specialEffect;

      return {
        id: `${tpl.id}-inst-${idx}`,
        templateId: tpl.id,
        name: finalName,
        description: encDef ? encDef.description : tpl.description,
        tier: tpl.tier,
        damage: attackType === 'enchantment' ? (encDef?.defaultValue || 0) : dmg,
        manaCost: attackType === 'enchantment' && encDef && !isFree ? encDef.defaultCost : manaCost,
        isFree,
        parryStaminaCost: manaCost * 0.5,
        specialEffect: finalSpecialEffect,
        unlockOrder: idx + 1,
        attackType,
        enchantmentId,
        enchantmentValue,
        enchantmentTurns,
        vfxId,
        costResource,
      };
    }
  );

  if (isCreature && generatedAbilities.length > 1) {
    for (let i = 1; i < generatedAbilities.length; i++) {
      if (
        generatedAbilities[i].attackType !== 'enchantment' &&
        generatedAbilities[i - 1].attackType !== 'enchantment' &&
        generatedAbilities[i].damage <= generatedAbilities[i - 1].damage
      ) {
        generatedAbilities[i].damage = Math.min(
          rankRule.damageMax,
          generatedAbilities[i - 1].damage + rankRule.damageIncrement
        );
      }
    }
  }

  const maxDamage = isCreature
    ? Math.max(...generatedAbilities.map((a) => a.damage), 0)
    : 0;

  const badgePaletteByMana = (mana: number, res?: 'stamina' | 'mana') => {
    if (res === 'stamina' && mana <= 3) return '#F59E0B';
    if (mana <= 2) return '#0084FF';
    if (mana <= 4) return '#10B981';
    if (mana <= 6) return '#9333EA';
    return '#DF9A1E';
  };

  const defaultPills: [BottomStatPill, BottomStatPill, BottomStatPill, BottomStatPill] = [
    { id: 'p1', mode: 'stat', badgeValue: '2', badgeColor: '#F59E0B', mainText: '150', attackName: 'Golpe Básico', attackType: 'damage', costResource: 'stamina', vfxId: 'vfx_slash_basic' },
    { id: 'p2', mode: 'stat', badgeValue: '4', badgeColor: '#10B981', mainText: '300', attackName: 'Investida Elemental', attackType: 'damage', costResource: 'stamina', vfxId: 'vfx_claw_flurry' },
    { id: 'p3', mode: 'stat', badgeValue: '6', badgeColor: '#9333EA', mainText: '600', attackName: 'Explosão de Núcleo', attackType: 'damage', costResource: 'mana', vfxId: 'vfx_dimensional_slash' },
    { id: 'p4', mode: 'stat', badgeValue: '8', badgeColor: '#DF9A1E', mainText: '900', attackName: 'Supremacia Ancestral', attackType: 'damage', costResource: 'mana', vfxId: 'vfx_celestial_judgment', isSpecialUltimate: true },
  ];

  generatedAbilities.forEach((ab, i) => {
    if (i < 4) {
      if (isMagicCard) {
        defaultPills[i] = {
          id: `p${i + 1}`,
          mode: 'stat',
          badgeValue: String(rolledSummonCost),
          badgeColor: '#0084FF',
          mainText: 'MANA',
          isChromaticSpecial: false,
          isSummonCost: true,
          costResource: 'mana',
          attackName: resolvedMagicName,
          vfxId: ab.vfxId,
        };
      } else if (isItemCard) {
        defaultPills[i] = {
          id: `p${i + 1}`,
          mode: 'stat',
          badgeValue: 'ITEM',
          badgeColor: '#F59E0B',
          mainText: 'EQUIP',
          isChromaticSpecial: false,
        };
      } else {
        const encDef = findForgeEnchantmentById(ab.enchantmentId);
        const isEnc = ab.attackType === 'enchantment' && !!encDef;
        defaultPills[i] = {
          id: `p${i + 1}`,
          mode: 'stat',
          badgeValue: ab.isFree ? '∞' : String(ab.manaCost),
          badgeColor: badgePaletteByMana(ab.manaCost, ab.costResource),
          mainText: isEnc ? encDef!.name.split(' ')[0].toUpperCase().slice(0, 7) : String(ab.damage),
          isChromaticSpecial: ab.isFree,
          costResource: ab.costResource || (i >= 2 ? 'mana' : 'stamina'),
          attackName: ab.name,
          attackType: ab.attackType || 'damage',
          enchantmentId: ab.enchantmentId,
          enchantmentValue: ab.enchantmentValue,
          enchantmentTurns: ab.enchantmentTurns,
          vfxId: ab.vfxId || getDefaultVfxForSlot(i, isEnc),
          isSpecialUltimate: i === 3 || ab.tier === 'Suprema',
        };
      }
    }
  });

  // 5th Capsule Slot: Custo de Invocação (Stamina for Creatures, Mana for Magic Cards, absent on Items)
  const summonCostPill: BottomStatPill | undefined = isItemCard
    ? undefined
    : isMagicCard
    ? {
        id: 'pill-summon-cost',
        mode: 'stat',
        badgeValue: String(rolledSummonCost),
        badgeColor: '#0084FF',
        mainText:
          matrix.summonCostPill?.costResource === 'mana' && matrix.summonCostPill?.mainText
            ? matrix.summonCostPill.mainText
            : 'MANA',
        isSummonCost: true,
        costResource: 'mana',
      }
    : {
        id: 'pill-summon-cost',
        mode: 'stat',
        badgeValue: String(rolledSummonCost),
        badgeColor: '#F59E0B',
        mainText: matrix.summonCostPill?.mainText || 'INVOC.',
        isSummonCost: true,
        costResource: 'stamina',
      };

  const isPremiumByDefault =
    matrixRarity === 'Lendária' ||
    matrixRarity === 'Mítica' ||
    matrixRarity === 'Limitada' ||
    chosenRank === 'S';

  const topAbility = generatedAbilities[generatedAbilities.length - 1];
  const prefixId = targetRecordKind === 'version' ? 'ver' : 'inst';

  return {
    ...matrix,
    id: `${prefixId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    recordKind: targetRecordKind,
    sourceMatrixId: matrix.sourceMatrixId || matrix.id,
    classificationState: 'Classificada',
    editState: targetRecordKind === 'version' ? 'Versão Aleatória' : 'Pronta para Packs',
    isNeutralMatrix: false,
    pvText: isItemCard ? 'ITEM' : isMagicCard ? `DF${rolledPv}` : `PV${rolledPv}`,
    elementText:
      matrix.elementText && matrix.elementText !== 'NEUTRA' && matrix.elementText !== 'MATRIZ'
        ? matrix.elementText
        : (matrix.biome || matrix.family || entityType).slice(0, 6).toUpperCase(),
    rankBadgeText: chosenRank,
    loreHeader: isCreature
      ? `${matrix.title} · ${matrixRarity} (Estamina ${rolledSummonCost})`
      : isMagicCard
      ? `${matrix.title} · Magia ${matrixRarity} (+${rolledPv} DF · Mana ${rolledSummonCost})`
      : `${matrix.title} · ${entityType} (${matrixRarity})`,
    magicPrefix: isMagicCard
      ? resolvedMagicPrefix
      : isItemCard
      ? `🛡️ Item (${matrixRarity})`
      : `⚔️ ${topAbility.name} (${topAbility.isFree ? 'Custo 0 · ∞' : `${topAbility.manaCost} Mana`})`,
    magicDescription: isMagicCard
      ? resolvedMagicDesc
      : topAbility.specialEffect || topAbility.description,
    magicAbilityKind: isMagicCard ? magicAbilityKind : undefined,
    linkedPassiveId: isMagicCard ? linkedPassiveId : undefined,
    linkedActiveSkillId: isMagicCard ? linkedActiveSkillId : undefined,
    pillCount: abilityCount,
    showSummonCostPill: isItemCard ? false : (matrix.showSummonCostPill ?? true),
    summonCostPill,
    pills: defaultPills,
    isPremium: isPremiumByDefault,
    isRankChromatic:
      matrixRarity === 'Mítica' ||
      matrixRarity === 'Lendária' ||
      matrixRarity === 'Limitada' ||
      chosenRank === 'S',
    isPvChromatic:
      matrixRarity === 'Mítica' ||
      matrixRarity === 'Lendária' ||
      matrixRarity === 'Limitada',
    cardClass: matrixRarity,
    cardRank: chosenRank,
    entityType,
    origin,
    deckId: deckId || matrix.deckId || 'deck-main',
    pvNumber: isCreature || isMagicCard ? rolledPv : undefined,
    maxDamage: isCreature ? maxDamage : undefined,
    summonStaminaCost: isCreature ? rolledSummonCost : undefined,
    magicManaCost: isMagicCard ? rolledSummonCost : matrix.magicManaCost,
    generatedAbilities,
    baseAbilities: baseTemplates,
    createdAt: new Date().toISOString(),
    rulesVersion: RULES_VERSION,
  };
}

/**
 * Legacy helper preserved for compatibility — builds a classified Matrix from a BaseCharacter and rolls its attributes.
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

  let chosenChar = req.character;
  if (!chosenChar) {
    const eligibleChars = charactersPool.filter((c) => {
      if (!c.active) return false;
      if (onlyMagic && c.entityType !== 'Magia') return false;
      if (excludeMagic && c.entityType === 'Magia') return false;
      return true;
    });
    const pool = eligibleChars.length > 0 ? eligibleChars : charactersPool;
    chosenChar = pool[Math.floor(Math.random() * pool.length)] || INITIAL_BASE_CHARACTERS[0];
  }

  const baseMatrix = createMatrixFromBaseCharacter(chosenChar, deckId);
  if (forcedClass && balanceTables[forcedClass]?.enabled) {
    baseMatrix.cardClass = forcedClass;
  } else if (allowedClassesOverride && allowedClassesOverride.length > 0) {
    const valid = allowedClassesOverride.filter((c) => balanceTables[c]?.enabled);
    if (valid.length > 0 && (!baseMatrix.cardClass || !valid.includes(baseMatrix.cardClass))) {
      baseMatrix.cardClass = valid[0];
    }
  }

  return generateFromMatrix({
    matrix: baseMatrix,
    balanceTables,
    targetRecordKind: 'instance',
    origin,
    forcedRank,
    allowedRanksOverride,
    deckId,
  });
}

/**
 * SECTION 12 & 13: PACK ELIGIBILITY FILTERING BY MATRIX CLASSIFICATIONS
 * Queries classified Matrices without duplicating records.
 */
export function getEligibleMatricesForPack(
  booster: BoosterModel,
  matrixCatalog: CardData[],
  balanceTables: Record<CardClass, ClassBalanceTable>
): CardData[] {
  const classifiedMatrices = matrixCatalog.filter((card) => {
    if (card.recordKind === 'instance') return false;
    if (card.classificationState === 'Não classificada' || card.isNeutralMatrix) return false;
    if (!card.cardClass) return false;
    const rarityTable = balanceTables[card.cardClass];
    if (!rarityTable || !rarityTable.enabled) return false;
    return true;
  });

  const filters = booster.filters;
  if (!filters) return classifiedMatrices;

  const filtered = classifiedMatrices.filter((card) => {
    if (
      filters.specificMatrixIds &&
      filters.specificMatrixIds.length > 0 &&
      !filters.specificMatrixIds.includes(card.id)
    ) {
      return false;
    }
    if (
      filters.rarities &&
      filters.rarities.length > 0 &&
      card.cardClass &&
      !filters.rarities.includes(card.cardClass)
    ) {
      return false;
    }
    if (
      filters.biomes &&
      filters.biomes.length > 0 &&
      (!card.biome || !filters.biomes.includes(card.biome))
    ) {
      return false;
    }
    if (
      filters.families &&
      filters.families.length > 0 &&
      (!card.family || !filters.families.includes(card.family))
    ) {
      return false;
    }
    if (
      filters.collections &&
      filters.collections.length > 0 &&
      (!card.collections || !card.collections.some((c) => filters.collections!.includes(c)))
    ) {
      return false;
    }
    if (
      filters.types &&
      filters.types.length > 0 &&
      card.entityType &&
      !filters.types.includes(card.entityType)
    ) {
      return false;
    }
    return true;
  });

  return filtered.length > 0 ? filtered : classifiedMatrices;
}

/**
 * Generates an official 9-card Booster Pack using Matrix references (Sections 12, 13 & 14).
 * - Slots 1 to 4: Comum (4)
 * - Slots 5 to 6: Rara (2)
 * - Slots 7 to 8: Magia (2)
 * - Slot 9: Carta especial de rank alto (A ou S) (1)
 */
export function generateBoosterPack(
  booster: BoosterModel,
  charactersPool: BaseCharacter[],
  balanceTables: Record<CardClass, ClassBalanceTable>,
  deckId = 'deck-main',
  matrixCards: CardData[] = []
): CardData[] {
  const fallbackMatrices = charactersPool
    .filter((c) => c.active)
    .map((c) => createMatrixFromBaseCharacter(c, deckId));

  const combinedPool = [
    ...matrixCards.filter((c) => c.recordKind !== 'instance'),
    ...fallbackMatrices.filter(
      (fb) =>
        !matrixCards.some(
          (m) =>
            m.baseCharacterId === fb.baseCharacterId ||
            m.title.toUpperCase() === fb.title.toUpperCase()
        )
    ),
  ];

  const eligibleMatrices = getEligibleMatricesForPack(booster, combinedPool, balanceTables);

  const pickRandomMatrix = (candidates: CardData[], fallbackAll: CardData[]): CardData => {
    const pool =
      candidates.length > 0
        ? candidates
        : fallbackAll.length > 0
        ? fallbackAll
        : fallbackMatrices;
    return pool[Math.floor(Math.random() * pool.length)] || fallbackMatrices[0];
  };

  const packCards: CardData[] = [];

  for (const slot of booster.slots) {
    if (slot.category === 'Comum') {
      const commonPool = eligibleMatrices.filter(
        (m) => m.cardClass === 'Comum' && m.entityType !== 'Magia'
      );
      const fallbackCommon = combinedPool.filter(
        (m) => m.cardClass === 'Comum' && m.entityType !== 'Magia' && !m.isNeutralMatrix
      );
      const chosenMatrix = pickRandomMatrix(commonPool, fallbackCommon);
      packCards.push(
        generateFromMatrix({
          matrix: { ...chosenMatrix, cardClass: chosenMatrix.cardClass || 'Comum' },
          balanceTables,
          targetRecordKind: 'instance',
          origin: 'Booster',
          allowedRanksOverride: slot.allowedRanks,
          deckId,
        })
      );
    } else if (slot.category === 'Rara') {
      const rarePool = eligibleMatrices.filter(
        (m) => m.cardClass === 'Rara' && m.entityType !== 'Magia'
      );
      const fallbackRare = combinedPool.filter(
        (m) => m.cardClass === 'Rara' && m.entityType !== 'Magia' && !m.isNeutralMatrix
      );
      const chosenMatrix = pickRandomMatrix(rarePool, fallbackRare);
      packCards.push(
        generateFromMatrix({
          matrix: { ...chosenMatrix, cardClass: chosenMatrix.cardClass || 'Rara' },
          balanceTables,
          targetRecordKind: 'instance',
          origin: 'Booster',
          allowedRanksOverride: slot.allowedRanks,
          deckId,
        })
      );
    } else if (slot.category === 'Magia') {
      const magicPool = eligibleMatrices.filter((m) => m.entityType === 'Magia');
      const fallbackMagic = combinedPool.filter(
        (m) => m.entityType === 'Magia' && !m.isNeutralMatrix
      );
      const chosenMatrix = pickRandomMatrix(magicPool, fallbackMagic);
      packCards.push(
        generateFromMatrix({
          matrix: { ...chosenMatrix, entityType: 'Magia' },
          balanceTables,
          targetRecordKind: 'instance',
          origin: 'Booster',
          allowedRanksOverride: slot.allowedRanks,
          deckId,
        })
      );
    } else if (slot.category === 'Especial_Alto_Rank') {
      const nonMagicEligible = eligibleMatrices.filter((m) => m.entityType !== 'Magia');
      const enabledClasses = OFFICIAL_CLASSES.filter(
        (cls) =>
          balanceTables[cls]?.enabled &&
          balanceTables[cls].boosterSpecialProbability > 0 &&
          nonMagicEligible.some((m) => m.cardClass === cls)
      );
      const fallbackEnabledClasses = OFFICIAL_CLASSES.filter(
        (cls) =>
          balanceTables[cls]?.enabled &&
          balanceTables[cls].boosterSpecialProbability > 0
      );
      const activePoolClasses =
        enabledClasses.length > 0 ? enabledClasses : fallbackEnabledClasses;

      const specialClass = pickWeighted(
        activePoolClasses.map((cls) => ({
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

      const specialCandidates = nonMagicEligible.filter(
        (m) => m.cardClass === specialClass
      );
      const chosenMatrix = pickRandomMatrix(specialCandidates, nonMagicEligible);

      packCards.push(
        generateFromMatrix({
          matrix: { ...chosenMatrix, cardClass: chosenMatrix.cardClass || specialClass },
          balanceTables,
          targetRecordKind: 'instance',
          origin: 'Booster',
          forcedRank: specialRank,
          deckId,
        })
      );
    } else {
      const chosenMatrix = pickRandomMatrix(eligibleMatrices, combinedPool);
      packCards.push(
        generateFromMatrix({
          matrix: {
            ...chosenMatrix,
            cardClass: slot.fixedClass || chosenMatrix.cardClass || 'Comum',
          },
          balanceTables,
          targetRecordKind: 'instance',
          origin: 'Booster',
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
