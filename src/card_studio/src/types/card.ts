import { ShowcaseVfxType } from './vfx';
import {
  CardClass,
  MatrixRarity,
  CardRank,
  CardEntityType,
  CardOrigin,
  GeneratedAbilityInstance,
} from './slimelands';

export interface BottomStatPill {
  id: string;
  mode: 'stat' | 'text';
  badgeValue: string;
  badgeColor: string;
  mainText: string;
  isChromaticSpecial?: boolean; // Chromatic rainbow circle with Infinity (∞) symbol for zero-cost special attacks
}

export interface CardColorPalette {
  id: string;
  name: string;
  frameTopColor: string;    // Deep metallic/rich color at the top of the frame (e.g. #4B0000)
  frameMidColor: string;    // Mid transition color (e.g. #260000)
  frameBottomColor: string; // Bottom color of the outer frame (e.g. #020000)
  strokeColor: string;      // Glowing inner contour line color (e.g. #FF0000)
  elementTextColor: string; // Color of vertical element letters (e.g. #007A1C)
  rankCircleColor: string;  // Color of the rank badge circle (e.g. #6B00FF)
}

export interface CardData {
  id: string;
  title: string;
  pvText: string; // e.g. "PV500" rendered vertically
  elementText: string; // e.g. "TERRA" rendered vertically inside the white pill
  rankBadgeText: string; // e.g. "S" inside the colored circle below element
  loreHeader: string;
  loreBody: string;
  magicPrefix: string; // e.g. "✨ Habilidade mágica"
  magicDescription: string; // e.g. "Renascer da Floresta: revive três cartas aliadas."
  showLoreBox: boolean;
  loreBoxOpacity: number; // 0 to 100
  loreBoxY: number; // Vertical position adjustment (default 725)
  pillCount: 1 | 2 | 3 | 4; // Variable number of bottom capsules (1, 2, 3, or 4)
  dockAutoFit: boolean; // Whether the bottom recessed dock contour shrinks to hug the active capsules or stays full-width
  pills: [BottomStatPill, BottomStatPill, BottomStatPill, BottomStatPill];
  // Image & Video Media settings
  imageUrl: string | null;
  videoUrl: string | null;
  mediaType: 'image' | 'video';
  imageScale: number;
  imageOffsetX: number;
  imageOffsetY: number;
  backgroundFill: 'white' | 'transparent' | 'dark';
  // Frame & Contour Adaptive Colors
  autoAdaptColors: boolean;
  frameTopColor: string;
  frameMidColor: string;
  frameBottomColor: string;
  strokeColor: string;
  strokeWidth: number;
  strokeGlow: number;
  elementTextColor: string;
  rankCircleColor: string;
  extractedSwatches: CardColorPalette[];
  // Premium Holographic & Fullscreen Showcase Settings
  isPremium: boolean;
  prismaticIntensity: number;      // 0 to 100 (default 100)
  microGlitterIntensity: number;   // 0 to 100 (default 100)
  contourLightSpeed: number;       // Key light & contour cycle speed (default 1.8 = 100% speed)
  parallaxDepth: number;           // 0 to 100 (default 100)
  autoShowcaseEnabled: boolean;    // Expand after 2s, hide UI, stay 3-8s fullscreen
  showcaseDurationSec: number;     // 3 to 8 seconds
  isRankChromatic?: boolean;       // Optional chromatic rank circle (e.g. 'S' circle)
  isPvChromatic?: boolean;         // Optional chromatic vertical PV text (e.g. 'PV500')
  invertElementCapsule?: boolean;  // Element capsule filled with element color + white vertical text
  // Fullscreen Showcase Procedural VFX Settings
  showcaseVfx?: ShowcaseVfxType;   // 'frost' | 'hellfire' | 'venom' | 'acid-melt' | 'dimensional-slash' | 'arcane-storm' | 'none'
  showcaseVfxIntensity?: number;   // 10 to 100
  vfxPlayOnNormalView?: boolean;   // Allow testing/keeping VFX active even before fullscreen expansion
  // Card Back (Verso) Settings
  backImageUrl?: string | null;
  backImageScale?: number;
  backImageOffsetX?: number;
  backImageOffsetY?: number;
  // Worlds of Slimelands Procedural Metadata & Production Management
  baseCharacterId?: string;
  cardClass?: MatrixRarity;
  cardRank?: CardRank;
  entityType?: CardEntityType;
  pvNumber?: number;
  maxDamage?: number;
  summonStaminaCost?: number;      // 1 to 9 Stamina
  generatedAbilities?: GeneratedAbilityInstance[];
  origin?: CardOrigin;
  deckId?: string;
  createdAt?: string;
  rulesVersion?: string;
  // Matrix Blueprint & Classification Subgroups
  rarity?: MatrixRarity;
  family?: string;
  biome?: string;
  themeCollections?: string[];
  isClassified?: boolean;
  isMatrixBlueprint?: boolean;
  matrixId?: string;
  versionId?: string;
}
