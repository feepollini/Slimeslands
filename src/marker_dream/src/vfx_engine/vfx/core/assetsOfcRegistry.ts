// ============================================================================
// OFFICIAL ASSET PACK REGISTRY & PRELOADER (/assetsofc & /veneno - 100 PNGs)
// Preloads, caches, and maps the 100 400x400 transparent PNGs to their exact
// elemental/material variations (Bone, Wood, Iron, Stone, Ice, Fire, Void, Nature)
// without ever mixing different asset categories or variants in the same cast.
// ============================================================================

import { ElementalPalette, ElementalPaletteId } from '../types';

export type AssetOfcCategory =
  | 'armadilhas_espinhos'
  | 'barreiras_elementais'
  | 'barreiras_pedra'
  | 'cipos'
  | 'cristais_gelo'
  | 'cristais_variados'
  | 'espadas_cravadas'
  | 'flechas'
  | 'flores_magicas'
  | 'meteoros'
  | 'misseis'
  | 'pilares_01'
  | 'pilares_02'
  | 'plantas_carnivoras'
  | 'pocas_magicas'
  | 'portais_verticais'
  | 'rochas_01'
  | 'rochas_02'
  | 'runas_01'
  | 'runas_02'
  | 'runas_03'
  | 'sangue'
  | 'shurikens'
  | 'veneno';

export type ExtraProjectileRuneKey =
  | 'flecha_gelo'
  | 'missil_gelo'
  | 'runa_simples'
  | 'shuriken_gelo';

const imageCache = new Map<string, HTMLImageElement>();
let preloadStarted = false;

function loadPng(url: string): HTMLImageElement {
  const existing = imageCache.get(url);
  if (existing) return existing;

  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  imageCache.set(url, img);
  return img;
}

export function isImageReady(img?: HTMLImageElement | null): img is HTMLImageElement {
  return Boolean(img && img.complete && img.naturalWidth > 0);
}

const FOUR_VARIANT_CATEGORIES: AssetOfcCategory[] = [
  'armadilhas_espinhos',
  'barreiras_elementais',
  'barreiras_pedra',
  'cipos',
  'cristais_gelo',
  'cristais_variados',
  'espadas_cravadas',
  'flechas',
  'flores_magicas',
  'meteoros',
  'misseis',
  'pilares_01',
  'pilares_02',
  'plantas_carnivoras',
  'pocas_magicas',
  'portais_verticais',
  'rochas_01',
  'rochas_02',
  'runas_01',
  'runas_02',
  'runas_03',
  'sangue',
  'shurikens',
  'veneno',
];

export function preloadAllAssetsOfc(): void {
  if (preloadStarted || typeof window === 'undefined') return;
  preloadStarted = true;

  for (const cat of FOUR_VARIANT_CATEGORIES) {
    for (let idx = 1; idx <= 4; idx++) {
      const num = idx < 10 ? `0${idx}` : `${idx}`;
      loadPng(`/assetsofc/${cat}/${cat}_${num}.png`);
    }
  }

  // Extras: Projeteis & Runa
  loadPng('/assetsofc/extras_projeteis_runa/flecha_gelo.png');
  loadPng('/assetsofc/extras_projeteis_runa/missil_gelo.png');
  loadPng('/assetsofc/extras_projeteis_runa/runa_simples.png');
  loadPng('/assetsofc/extras_projeteis_runa/shuriken_gelo.png');
}

/**
 * Returns a specific 1..4 indexed image from a category in /assetsofc.
 */
export function getAssetOfcVariant(
  category: AssetOfcCategory,
  variant1To4: number
): HTMLImageElement {
  preloadAllAssetsOfc();
  const clamped = ((((variant1To4 - 1) % 4) + 4) % 4) + 1;
  const num = `0${clamped}`;
  return loadPng(`/assetsofc/${category}/${category}_${num}.png`);
}

/**
 * Returns one of the 4 special sprites in /assetsofc/extras_projeteis_runa/
 */
export function getExtraProjectileRuneAsset(
  key: ExtraProjectileRuneKey
): HTMLImageElement {
  preloadAllAssetsOfc();
  return loadPng(`/assetsofc/extras_projeteis_runa/${key}.png`);
}

/**
 * Deterministic 1..4 variant resolver for a given category and ElementalPalette.
 * Ensures all entities spawned in a single skill cast use the EXACT SAME variant
 * matching the element/material (including Bone, Wood, Iron, Stone, Ice, Magma, Void, Nature).
 */
export function getVariantIndexForPalette(
  category: AssetOfcCategory,
  palette?: ElementalPalette | ElementalPaletteId
): 1 | 2 | 3 | 4 {
  const pid: ElementalPaletteId =
    typeof palette === 'string'
      ? palette
      : palette?.id || 'freljord_ice';

  const isIceOrBlue =
    pid === 'freljord_ice' || pid === 'vergil_mirage' || pid === 'hextech_arcane';
  const isFire = pid === 'infernal_magma';
  const isBlood = pid === 'crimson_blood';
  const isFireOrRed = isFire || isBlood;
  const isVoidOrPurple = pid === 'void_abyss';
  const isNatureOrToxic = pid === 'toxic_venom';
  const isGold = pid === 'celestial_gold';

  switch (category) {
    // 01=Blue/Ice, 02=Fire/Red, 03=Purple/Void, 04=Gold/Nature
    case 'shurikens':
    case 'flechas':
    case 'misseis':
    case 'espadas_cravadas':
    case 'pocas_magicas':
    case 'portais_verticais':
    case 'pilares_01':
      if (isIceOrBlue) return 1;
      if (isFireOrRed) return 2;
      if (isVoidOrPurple) return 3;
      return 4;

    case 'armadilhas_espinhos':
      // 01 = Estacas de Madeira (Nature/Toxic)
      // 02 = Espinhos de Ossos & Crânios (Blood / Void / Necro)
      // 03 = Lanças de Ferro/Metal (Ice / Hextech / Mirage)
      // 04 = Espinhos de Pedra com Musgo (Magma / Gold / Earth)
      if (isNatureOrToxic) return 1;
      if (isBlood || isVoidOrPurple) return 2;
      if (isIceOrBlue) return 3;
      return 4;

    case 'rochas_01':
      // 01 = Basalto com Musgo (Nature/Toxic)
      // 02 = Presas de Osso Gigantes (Blood / Void / Bone)
      // 03 = Rochas Afiadas (Magma / Fire)
      // 04 = Colunas Prismáticas de Basalto (Ice / Gold / Hextech)
      if (isNatureOrToxic) return 1;
      if (isBlood || isVoidOrPurple) return 2;
      if (isFire) return 3;
      return 4;

    case 'rochas_02':
      // 01 = Barreira de Rocha Musgosa (Nature/Toxic)
      // 02 = Barreira de Magma/Fogo (Infernal Magma)
      // 03 = Barreira de Cristal Glacial (Ice / Hextech / Mirage)
      // 04 = Barreira de Ossos & Presas (Blood / Void / Gold)
      if (isNatureOrToxic) return 1;
      if (isFire) return 2;
      if (isIceOrBlue) return 3;
      return 4;

    case 'barreiras_pedra':
      // 01 = Gelo/Cristal Azul, 02 = Magma/Fogo, 03 = Pedra com Cipós/Natureza, 04 = Vazio Roxo
      if (isIceOrBlue) return 1;
      if (isFireOrRed) return 2;
      if (isVoidOrPurple) return 4;
      return 3;

    case 'barreiras_elementais':
      // 01 = Magma/Fogo, 02 = Rocha com Musgo/Terra, 03 = Rocha Bruta, 04 = Vazio Roxo
      if (isFireOrRed) return 1;
      if (isNatureOrToxic || isGold) return 2;
      if (isVoidOrPurple) return 4;
      return 3;

    case 'meteoros':
      // 01 = Monólito de Magma, 02 = Monólito de Gelo, 03 = Monólito do Vazio, 04 = Monólito de Rocha
      if (isFireOrRed) return 1;
      if (isIceOrBlue) return 2;
      if (isVoidOrPurple) return 3;
      return 4;

    case 'cipos':
      // 01 = Natureza Verde, 02 = Vazio Roxo, 03 = Fogo/Brasas, 04 = Gelo Azul
      if (isNatureOrToxic || isGold) return 1;
      if (isVoidOrPurple) return 2;
      if (isFireOrRed) return 3;
      return 4;

    case 'flores_magicas':
      // 01 = Lótus de Gelo, 02 = Lótus do Vazio, 03 = Lótus Solar Dourada, 04 = Lótus de Fogo Carmesim
      if (isIceOrBlue) return 1;
      if (isVoidOrPurple) return 2;
      if (isGold || isNatureOrToxic) return 3;
      return 4;

    case 'plantas_carnivoras':
      // 01 = Dionaea Dentada Verde (Nature/Toxic)
      // 02 = Espinheira Carmesim (Fire)
      // 03 = Jarros Roxos Venenosos (Void / Ice)
      // 04 = Flor-Mandíbula de Osso/Dentes (Blood / Gold)
      if (isNatureOrToxic) return 1;
      if (isFire) return 2;
      if (isVoidOrPurple || isIceOrBlue) return 3;
      return 4;

    case 'runas_01':
    case 'runas_02':
    case 'runas_03':
      // 01 = Azul/Gelo, 02 = Roxo/Vazio, 03 = Verde/Natureza, 04 = Ouro/Fogo
      if (isIceOrBlue) return 1;
      if (isVoidOrPurple) return 2;
      if (isNatureOrToxic) return 3;
      return 4;

    case 'pilares_02':
    case 'cristais_gelo':
    case 'cristais_variados':
    case 'veneno':
    case 'sangue':
    default:
      if (isIceOrBlue) return 1;
      if (isFireOrRed) return 2;
      if (isVoidOrPurple) return 3;
      return 4;
  }
}

/**
 * Maps an ElementalPalette (or ElementalPaletteId) to the exact variant (1..4)
 * for each specific assetsofc folder. Never mixes variants across instances of the same cast.
 */
export function getAssetOfcForPalette(
  category: AssetOfcCategory,
  palette?: ElementalPalette | ElementalPaletteId,
  _unusedSeed = 0
): HTMLImageElement {
  const variant = getVariantIndexForPalette(category, palette);
  return getAssetOfcVariant(category, variant);
}
