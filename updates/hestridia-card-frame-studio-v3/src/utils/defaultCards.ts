import { CardData, CardColorPalette } from '../types/card';
import {
  DEFAULT_CLASS_BALANCE_TABLES,
  INITIAL_BASE_CHARACTERS,
  createMatrixFromBaseCharacter,
  generateFromMatrix,
} from './proceduralEngine';

import { SAMPLE_ARTWORKS } from './sampleArtworks';
export { SAMPLE_ARTWORKS };

export const DEFAULT_BALANCE_TABLES = DEFAULT_CLASS_BALANCE_TABLES;

export const DEFAULT_PRESET_PALETTES: CardColorPalette[] = [
  {
    id: 'palette-ouro-solar',
    name: 'Ouro Solar',
    frameTopColor: '#A3630D',
    frameMidColor: '#FDE68A',
    frameBottomColor: '#422006',
    strokeColor: '#DF9A1E',
    elementTextColor: '#FCE9A8',
    rankCircleColor: '#291502',
  },
  {
    id: 'palette-abismo-ciano',
    name: 'Abismo Ciano',
    frameTopColor: '#0E7490',
    frameMidColor: '#A5F3FC',
    frameBottomColor: '#083344',
    strokeColor: '#00D8FF',
    elementTextColor: '#CFFAFE',
    rankCircleColor: '#041E29',
  },
  {
    id: 'palette-esmeralda-ancestral',
    name: 'Esmeralda Ancestral',
    frameTopColor: '#047857',
    frameMidColor: '#A7F3D0',
    frameBottomColor: '#022C22',
    strokeColor: '#10B981',
    elementTextColor: '#D1FAE5',
    rankCircleColor: '#021B15',
  },
  {
    id: 'palette-vazio-carmesim',
    name: 'Vazio Carmesim',
    frameTopColor: '#9F1239',
    frameMidColor: '#FECDD3',
    frameBottomColor: '#4C0519',
    strokeColor: '#F43F5E',
    elementTextColor: '#FFE4E6',
    rankCircleColor: '#2B020E',
  },
  {
    id: 'palette-eter-violeta',
    name: 'Éter Violeta',
    frameTopColor: '#6D28D9',
    frameMidColor: '#DDD6FE',
    frameBottomColor: '#2E1065',
    strokeColor: '#A855F7',
    elementTextColor: '#EDE9FE',
    rankCircleColor: '#170736',
  },
];

export const DEFAULT_CARD_DATA: CardData = {
  id: 'mtx-char-hestridia',
  recordKind: 'matrix',
  classificationState: 'Classificada',
  editState: 'Pronta para Packs',
  isNeutralMatrix: false,
  title: 'HERISDIA',
  pvText: 'PV1850',
  elementText: 'ARCANO',
  rankBadgeText: 'S',
  loreHeader: 'Herisdia, Soberana Mítica · Mítica (Estamina 9)',
  loreBody:
    'Entidade primordial nascida da convergência de mana pura de Worlds of Slimelands.',
  magicPrefix: '✨ Singularidade Prismática (Custo 0 · ∞)',
  magicDescription: 'Habilidade Mítica gratuita garantida com selo infinito cromático.',
  showLoreBox: true,
  loreBoxOpacity: 92,
  loreBoxY: 724,
  pillCount: 4,
  dockAutoFit: true,
  pills: [
    {
      id: 'pill-1',
      mode: 'stat',
      badgeValue: '2',
      badgeColor: '#0084FF',
      mainText: '750',
      isChromaticSpecial: false,
    },
    {
      id: 'pill-2',
      mode: 'stat',
      badgeValue: '4',
      badgeColor: '#10B981',
      mainText: '1150',
      isChromaticSpecial: false,
    },
    {
      id: 'pill-3',
      mode: 'stat',
      badgeValue: '6',
      badgeColor: '#9333EA',
      mainText: '1650',
      isChromaticSpecial: false,
    },
    {
      id: 'pill-4',
      mode: 'stat',
      badgeValue: '∞',
      badgeColor: '#DF9A1E',
      mainText: '2200',
      isChromaticSpecial: true,
    },
  ],
  imageUrl: SAMPLE_ARTWORKS.hestridiaForest,
  videoUrl: null,
  mediaType: 'image',
  imageScale: 1,
  imageOffsetX: 0,
  imageOffsetY: 0,
  backgroundFill: 'dark',
  autoAdaptColors: true,
  frameTopColor: '#A3630D',
  frameMidColor: '#FDE68A',
  frameBottomColor: '#422006',
  strokeColor: '#DF9A1E',
  strokeWidth: 2,
  strokeGlow: 100,
  elementTextColor: '#FCE9A8',
  rankCircleColor: '#291502',
  extractedSwatches: DEFAULT_PRESET_PALETTES,
  isPremium: true,
  prismaticIntensity: 100,
  microGlitterIntensity: 100,
  contourLightSpeed: 1.8,
  parallaxDepth: 100,
  autoShowcaseEnabled: false,
  showcaseDurationSec: 5,
  isRankChromatic: true,
  isPvChromatic: true,
  invertElementCapsule: true,
  showcaseVfx: 'none',
  showcaseVfxIntensity: 85,
  vfxPlayOnNormalView: false,
  backImageUrl: SAMPLE_ARTWORKS.cardBack,
  backImageScale: 1,
  backImageOffsetX: 0,
  backImageOffsetY: 0,
  baseCharacterId: 'char-hestridia',
  cardClass: 'Mítica',
  cardRank: 'S',
  entityType: 'Criatura',
  family: 'Slimes Divinos',
  biome: 'Floresta',
  collections: ['Coleção dos Deuses'],
  pvNumber: 1850,
  maxDamage: 2200,
  summonStaminaCost: 9,
  origin: 'Manual',
  deckId: 'deck-mythic',
  createdAt: '2026-10-19T12:00:00.000Z',
  rulesVersion: '2.0.0',
};

/**
 * Creates the initial Matrix Catalog containing classified Matrices from INITIAL_BASE_CHARACTERS,
 * plus sample initial Versions so the Matrix Gallery is immediately populated and organized.
 */
export function createDefaultGalleryCards(): CardData[] {
  return INITIAL_BASE_CHARACTERS.map((char) => {
    const baseMatrix = createMatrixFromBaseCharacter(
      char,
      char.entityType === 'Magia'
        ? 'deck-magic'
        : char.matrixRarity === 'Mítica' || char.matrixRarity === 'Lendária'
        ? 'deck-mythic'
        : 'deck-main'
    );
    // Keep the Matrix itself as a classified Matrix record with a sample preview of attributes
    const previewRoll = generateFromMatrix({
      matrix: baseMatrix,
      balanceTables: DEFAULT_BALANCE_TABLES,
      targetRecordKind: 'version',
      origin: 'Manual',
      forcedRank: char.matrixRarity === 'Mítica' ? 'S' : undefined,
    });

    return {
      ...previewRoll,
      id: `mtx-${char.id}`,
      recordKind: 'matrix',
      classificationState: 'Classificada',
      editState: 'Pronta para Packs',
      isNeutralMatrix: false,
      backImageUrl: SAMPLE_ARTWORKS.cardBack,
    };
  });
}

/**
 * Creates initial Player Inventory instances (separate from Matrix definitions, Section 7 & 8).
 */
export function createInitialPlayerInventory(matrices: CardData[]): CardData[] {
  const classified = matrices.filter(
    (m) => m.classificationState === 'Classificada' && !m.isNeutralMatrix
  );
  const samplePool = classified.slice(0, 6);
  return samplePool.map((mtx, idx) =>
    generateFromMatrix({
      matrix: mtx,
      balanceTables: DEFAULT_BALANCE_TABLES,
      targetRecordKind: 'instance',
      origin: 'Booster',
      forcedRank: idx === 0 ? 'S' : idx === 1 ? 'A' : undefined,
    })
  );
}

export const BLANK_TEMPLATE_CARD: CardData = {
  ...DEFAULT_CARD_DATA,
  id: 'mtx-blank-template',
  recordKind: 'matrix',
  classificationState: 'Não classificada',
  editState: 'Importada / Neutra',
  isNeutralMatrix: true,
  title: 'NOVA MATRIZ',
  pvText: 'PV—',
  elementText: 'NEUTRA',
  rankBadgeText: '—',
  loreHeader: 'Nova Matriz · Não Classificada',
  loreBody: 'Matriz criada em estado neutro. Classifique sua raridade, família, bioma, coleção e tipo.',
  magicPrefix: '⚙️ Matriz Neutra (Sem Atributos Sorteados)',
  magicDescription: 'Atributos variáveis serão gerados pelo motor procedural quando solicitado.',
  pillCount: 1,
  pills: [
    { id: 'p1', mode: 'text', badgeValue: '—', badgeColor: '#475569', mainText: 'NEUTRA' },
    { id: 'p2', mode: 'text', badgeValue: '—', badgeColor: '#475569', mainText: '—' },
    { id: 'p3', mode: 'text', badgeValue: '—', badgeColor: '#475569', mainText: '—' },
    { id: 'p4', mode: 'text', badgeValue: '—', badgeColor: '#475569', mainText: '—' },
  ],
  imageUrl: null,
  cardClass: undefined,
  cardRank: undefined,
  pvNumber: undefined,
  maxDamage: undefined,
  summonStaminaCost: undefined,
  family: undefined,
  biome: undefined,
  collections: [],
  generatedAbilities: [],
};

export const INITIAL_CARDS: CardData[] = createDefaultGalleryCards();

