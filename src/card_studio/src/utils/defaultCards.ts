import { CardData } from '../types/card';
import { DEFAULT_PRESET_PALETTES } from './colorExtractor';
import matrixData from '../../../core/matrix_snapshot.json';

export const SAMPLE_ARTWORKS = {
  hestridiaForest: '/cards/Slime_Zen_no_Santu_rio_Florestal.png',
  abyssalLeviathan: '/cards/Slime_oce_nico_surfando_na_concha-7.png',
  solarArchangel: '/cards/Slime_de_Fogo_em_Investida_Explosiva.png',
};

export const BLANK_TEMPLATE_CARD: CardData = (matrixData.cards && matrixData.cards[0]) ? (matrixData.cards[0] as CardData) : {
  id: 'slimelands-base-template',
  title: 'Regente da Alvorada',
  pvText: 'PV1250',
  elementText: 'DIVINO',
  rankBadgeText: 'S',
  loreHeader: 'Regente da Alvorada · Panteão Celestial',
  loreBody: 'Entidade primordial da aurora de Slimelands que comanda as constelações sagradas.',
  magicPrefix: '⚔️ Luz Divina (Custo 0 · ∞)',
  magicDescription: 'Desencadeia o despertar da aurora sagrada em todo o campo.',
  showLoreBox: true,
  loreBoxOpacity: 88,
  loreBoxY: 724,
  pillCount: 4,
  dockAutoFit: true,
  pills: [
    { id: 'p1', mode: 'stat', badgeValue: '2', badgeColor: '#0084FF', mainText: '450' },
    { id: 'p2', mode: 'stat', badgeValue: '4', badgeColor: '#10B981', mainText: '720' },
    { id: 'p3', mode: 'stat', badgeValue: '6', badgeColor: '#9333EA', mainText: '1100' },
    { id: 'p4', mode: 'stat', badgeValue: '∞', badgeColor: '#DF9A1E', mainText: '1750', isChromaticSpecial: true }
  ],
  imageUrl: '/cards/01_Regente_da_Alvorada.png',
  videoUrl: null,
  mediaType: 'image',
  imageScale: 1,
  imageOffsetX: 0,
  imageOffsetY: 0,
  backgroundFill: 'dark',
  autoAdaptColors: false,
  frameTopColor: '#4A3B00',
  frameMidColor: '#241D00',
  frameBottomColor: '#050400',
  strokeColor: '#FFD700',
  strokeWidth: 2,
  strokeGlow: 100,
  elementTextColor: '#EAB308',
  rankCircleColor: '#F59E0B',
  extractedSwatches: DEFAULT_PRESET_PALETTES,
  isPremium: true,
  prismaticIntensity: 100,
  microGlitterIntensity: 90,
  contourLightSpeed: 1.8,
  parallaxDepth: 100,
  autoShowcaseEnabled: false,
  showcaseDurationSec: 5,
  isRankChromatic: true,
  isPvChromatic: false,
  invertElementCapsule: true,
  showcaseVfx: 'arcane-storm',
  showcaseVfxIntensity: 85,
  vfxPlayOnNormalView: false,
  backImageUrl: '/backcard.jpg',
  baseCharacterId: 'char-regente',
  cardClass: 'Mítica',
  cardRank: 'S',
  entityType: 'Criatura',
  pvNumber: 1250,
  maxDamage: 1750,
  summonStaminaCost: 8,
  deckId: 'deck-divinos',
  createdAt: new Date().toISOString()
};

// INITIAL_CARDS alimentado com todas as 289 cartas dos Decks Temáticos
export const INITIAL_CARDS: CardData[] = (matrixData.cards || []) as CardData[];

export function createInitialPlayerInventory(): CardData[] {
  return INITIAL_CARDS.slice(0, 15);
}
