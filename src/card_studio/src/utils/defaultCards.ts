import { CardData } from '../types/card';
import { DEFAULT_PRESET_PALETTES } from './colorExtractor';

export const SAMPLE_ARTWORKS = {
  hestridiaForest: '',
  abyssalLeviathan: '',
  solarArchangel: '',
};

/**
 * Clean base template card (no fake sample models or fake SVG illustrations).
 * Ready for real folder imports, image uploads, or procedural generation.
 */
export const BLANK_TEMPLATE_CARD: CardData = {
  id: 'slimelands-base-template',
  title: 'Lumys Arcano',
  pvText: 'PV500',
  elementText: 'ARCANO',
  rankBadgeText: 'S',
  loreHeader: 'Lumys, o Slime Arcano',
  loreBody:
    'Um pequeno slime que absorve a energia mágica presente nas florestas ancestrais de Worlds of Slimelands.',
  magicPrefix: '⚔️ Explosão Celestial (Custo 0 · ∞)',
  magicDescription: 'Libera toda a reserva cósmica em um colapso estelar.',
  showLoreBox: true,
  loreBoxOpacity: 88,
  loreBoxY: 724,
  pillCount: 4,
  dockAutoFit: true,
  pills: [
    {
      id: 'p1',
      mode: 'stat',
      badgeValue: '2',
      badgeColor: '#0084FF',
      mainText: '180',
    },
    {
      id: 'p2',
      mode: 'stat',
      badgeValue: '4',
      badgeColor: '#10B981',
      mainText: '320',
    },
    {
      id: 'p3',
      mode: 'stat',
      badgeValue: '6',
      badgeColor: '#9333EA',
      mainText: '460',
    },
    {
      id: 'p4',
      mode: 'stat',
      badgeValue: '∞',
      badgeColor: '#DF9A1E',
      mainText: '550',
      isChromaticSpecial: true,
    },
  ],
  imageUrl: null,
  videoUrl: null,
  mediaType: 'image',
  imageScale: 1,
  imageOffsetX: 0,
  imageOffsetY: 0,
  backgroundFill: 'dark',
  autoAdaptColors: true,
  frameTopColor: '#2A0944',
  frameMidColor: '#140324',
  frameBottomColor: '#020005',
  strokeColor: '#A855F7',
  strokeWidth: 2,
  strokeGlow: 100,
  elementTextColor: '#9333EA',
  rankCircleColor: '#6B00FF',
  extractedSwatches: DEFAULT_PRESET_PALETTES,
  isPremium: true,
  prismaticIntensity: 100,
  microGlitterIntensity: 100,
  contourLightSpeed: 1.8,
  parallaxDepth: 100,
  autoShowcaseEnabled: false,
  showcaseDurationSec: 5,
  isRankChromatic: true,
  isPvChromatic: false,
  invertElementCapsule: true,
  showcaseVfx: 'none',
  showcaseVfxIntensity: 85,
  vfxPlayOnNormalView: false,
  backImageUrl: null,
  backImageScale: 1,
  backImageOffsetX: 0,
  backImageOffsetY: 0,
  baseCharacterId: 'char-lumys',
  cardClass: 'Mítica',
  cardRank: 'S',
  entityType: 'Criatura',
  pvNumber: 500,
  maxDamage: 550,
  summonStaminaCost: 8,
  origin: 'Manual',
  deckId: 'deck-main',
  createdAt: '2026-10-18T12:00:00.000Z',
  rulesVersion: 'v1.4-slimelands',
};

// Start with an empty gallery list (only the active template on stage when empty) — no 3 fake sample models!
export const INITIAL_CARDS: CardData[] = [];
