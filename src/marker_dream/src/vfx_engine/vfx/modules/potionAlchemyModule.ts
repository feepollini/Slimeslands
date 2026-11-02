// ============================================================================
// MODULE: POTION ALCHEMY ARSENAL (#86 - #95)
// Throwable Splash Potions with Parabolic Arc, 3D End-over-End Tumbling Bottle
// Physics, High-Res Painted Bottle Sprites, Multi-Layered Textured Puddles,
// Bespoke Elemental Surface Shaders, and Batch Asset Importer.
// ============================================================================

import { ElementalPalette, ShaderParams, SlimeActor, VfxPresetId } from '../types';
import { fastNoise, getGlowSprite, removeSwapPop } from '../core/mathLut';
import {
  getGroundDecalTextureSprite,
  getProceduralCrystalSprite,
  getTornadoVortexTextureSprite,
  getVoronoiExplosionFlipbook,
} from '../core/proceduralTextures';
import { getAssetOfcVariant, isImageReady } from '../core/assetsOfcRegistry';
import { soundEngine } from '../soundEngine';
import { applyCombatActionToDnaBond } from './treeChatProceduralStatsModule';
import type { VfxEngine } from '../vfxEngine';

export interface PotionAssetConfig {
  id: VfxPresetId;
  fileIndex: string;
  fileSlug: string;
  name: string;
  subtitle: string;
  description: string;
  element: string;
  paletteId: string;
  fluidColor: string;
  glowColor: string;
  coreColor: string;
  accentColor: string;
  bottleShape: 'round_flask' | 'conical_flask' | 'alchemist_vial' | 'square_bottle';
  impactRadius: number;
  throwRange: number;
  effectType:
    | 'toxic_miasma'
    | 'frost_freeze'
    | 'tar_sludge'
    | 'hellfire_burn'
    | 'corrosive_acid'
    | 'shock_volt'
    | 'healing_mist'
    | 'spectral_madness'
    | 'gravity_vortex'
    | 'smoke_screen';
  statusLabel: string;
  puddleDuration: number;
  userAssetUrl?: string;
  userAssetImage?: HTMLImageElement;
}

export const POTION_REGISTRY: Record<string, PotionAssetConfig> = {
  potion_toxic_miasma: {
    id: 'potion_toxic_miasma',
    fileIndex: '01',
    fileSlug: '01_nevoa_venenosa.png',
    name: 'Poção de Névoa Venenosa',
    subtitle: 'Miasma Químico Verde',
    description: 'Estilhaça liberando névoa tóxica efervescente que sufoca e causa dano contínuo por veneno.',
    element: 'Tóxico / Quimtec',
    paletteId: 'toxic_venom',
    fluidColor: '#39FF14',
    glowColor: '#10B981',
    coreColor: '#F4FFE6',
    accentColor: '#B8FF70',
    bottleShape: 'round_flask',
    impactRadius: 185,
    throwRange: 720,
    effectType: 'toxic_miasma',
    statusLabel: 'NÉVOA VENENOSA!',
    puddleDuration: 4.5,
  },
  potion_frost_freeze: {
    id: 'potion_frost_freeze',
    fileIndex: '02',
    fileSlug: '02_congelamento.png',
    name: 'Poção de Congelamento Absoluto',
    subtitle: 'Frasco Glacial Criogênico',
    description: 'Detona com onda criogênica instantânea que congela slimes em estase de gelo e ergue cristais.',
    element: 'Gelo / Crio',
    paletteId: 'freljord_ice',
    fluidColor: '#36E2FF',
    glowColor: '#1A52B8',
    coreColor: '#FFFFFF',
    accentColor: '#BFFFFF',
    bottleShape: 'conical_flask',
    impactRadius: 180,
    throwRange: 710,
    effectType: 'frost_freeze',
    statusLabel: 'CONGELAMENTO!',
    puddleDuration: 4.0,
  },
  potion_tar_sludge: {
    id: 'potion_tar_sludge',
    fileIndex: '03',
    fileSlug: '03_piche_lentidao.png',
    name: 'Poção de Piche & Lentidão',
    subtitle: 'Lodo Viscoso Piche Negro',
    description: 'Cria poça viscosa borbulhante no solo que reduz em 85% a velocidade dos alvos e anula arrancadas.',
    element: 'Terra / Piche',
    paletteId: 'void_abyss',
    fluidColor: '#92400E',
    glowColor: '#451A03',
    coreColor: '#FDE68A',
    accentColor: '#B45309',
    bottleShape: 'square_bottle',
    impactRadius: 195,
    throwRange: 680,
    effectType: 'tar_sludge',
    statusLabel: 'PICHE PEGAJOSO (LENTIDÃO)!',
    puddleDuration: 5.2,
  },
  potion_hellfire_conflagration: {
    id: 'potion_hellfire_conflagration',
    fileIndex: '04',
    fileSlug: '04_fogo_alquimico.png',
    name: 'Poção de Fogo Alquímico (Em Chamas)',
    subtitle: 'Napalm Infernal Líquido',
    description: 'Quebra espalhando fissuras de magma e labaredas que infligem queimadura contínua e empurrão térmico.',
    element: 'Fogo / Magma',
    paletteId: 'infernal_magma',
    fluidColor: '#FF5500',
    glowColor: '#B81D00',
    coreColor: '#FFFFF0',
    accentColor: '#FFDD66',
    bottleShape: 'round_flask',
    impactRadius: 180,
    throwRange: 730,
    effectType: 'hellfire_burn',
    statusLabel: 'EM CHAMAS (FOGO ALQUÍMICO)!',
    puddleDuration: 4.2,
  },
  potion_corrosive_acid: {
    id: 'potion_corrosive_acid',
    fileIndex: '05',
    fileSlug: '05_acido_corrosivo.png',
    name: 'Poção de Ácido Corrosivo',
    subtitle: 'Ácido Sulfúrico Cáustico',
    description: 'Derrete escudos protetores instantaneamente e reduz a resistência do inimigo com espuma cáustica.',
    element: 'Ácido / Veneno',
    paletteId: 'toxic_venom',
    fluidColor: '#84CC16',
    glowColor: '#3F6212',
    coreColor: '#ECFCCB',
    accentColor: '#BEF264',
    bottleShape: 'alchemist_vial',
    impactRadius: 175,
    throwRange: 740,
    effectType: 'corrosive_acid',
    statusLabel: 'ÁCIDO CORROSIVO (ESCUDO DISSOLVIDO)!',
    puddleDuration: 4.0,
  },
  potion_shock_volt: {
    id: 'potion_shock_volt',
    fileIndex: '06',
    fileSlug: '06_choque_eletrico.png',
    name: 'Poção de Choque Eletrizante',
    subtitle: 'Eletrólito Voltaico Instável',
    description: 'Explosão elétrica com arcos Tesla em cadeia na poça que eletrocuta e atordoa (micro-stun).',
    element: 'Energia / Raio',
    paletteId: 'hextech_arcane',
    fluidColor: '#FACC15',
    glowColor: '#CA8A04',
    coreColor: '#FFFFFF',
    accentColor: '#FEF08A',
    bottleShape: 'conical_flask',
    impactRadius: 175,
    throwRange: 750,
    effectType: 'shock_volt',
    statusLabel: 'CHOQUE VOLTAICO (ELETROCUTADO)!',
    puddleDuration: 3.6,
  },
  potion_healing_mist: {
    id: 'potion_healing_mist',
    fileIndex: '07',
    fileSlug: '07_nevoa_curativa.png',
    name: 'Poção de Névoa Curativa',
    subtitle: 'Elixir de Regeneração Vital',
    description: 'Ao quebrar, gera fonte sagrada turquesa que regenera vida de aliados e do jogador, limpando debuffs.',
    element: 'Luz / Cura',
    paletteId: 'celestial_gold',
    fluidColor: '#14B8A6',
    glowColor: '#0F766E',
    coreColor: '#F0FDFA',
    accentColor: '#5EEAD4',
    bottleShape: 'round_flask',
    impactRadius: 190,
    throwRange: 700,
    effectType: 'healing_mist',
    statusLabel: 'NÉVOA CURATIVA (REGENERAÇÃO)!',
    puddleDuration: 4.8,
  },
  potion_spectral_madness: {
    id: 'potion_spectral_madness',
    fileIndex: '08',
    fileSlug: '08_loucura.png',
    name: 'Poção da Loucura & Névoa Espectral',
    subtitle: 'Extrato Espectral do Vazio',
    description: 'Libera fenda lilás alucinógena com almas errantes em órbita que causa pânico/desespero nos inimigos.',
    element: 'Trevas / Vazio',
    paletteId: 'void_abyss',
    fluidColor: '#D946EF',
    glowColor: '#7E22CE',
    coreColor: '#FAF5FF',
    accentColor: '#F0ABFC',
    bottleShape: 'alchemist_vial',
    impactRadius: 180,
    throwRange: 720,
    effectType: 'spectral_madness',
    statusLabel: 'LOUCURA ESPECTRAL (DESESPERO)!',
    puddleDuration: 4.2,
  },
  potion_gravity_vortex: {
    id: 'potion_gravity_vortex',
    fileIndex: '09',
    fileSlug: '09_gravidade.png',
    name: 'Poção de Gravidade & Vórtice',
    subtitle: 'Singularidade Cristalina do Vazio',
    description: 'Cria vórtice galáctico de horizonte de eventos que atrai todos os slimes da área para o centro.',
    element: 'Gravidade / Vazio',
    paletteId: 'void_abyss',
    fluidColor: '#A855F7',
    glowColor: '#4C1D95',
    coreColor: '#F3E8FF',
    accentColor: '#D8B4FE',
    bottleShape: 'square_bottle',
    impactRadius: 190,
    throwRange: 700,
    effectType: 'gravity_vortex',
    statusLabel: 'VÓRTICE GRAVITACIONAL (PUXÃO)!',
    puddleDuration: 3.6,
  },
  potion_smoke_screen: {
    id: 'potion_smoke_screen',
    fileIndex: '10',
    fileSlug: '10_fumaca_ofuscante.png',
    name: 'Poção de Fumaça Ofuscante',
    subtitle: 'Cortina Tática de Nuvem Cumulus',
    description: 'Nuvem volumétrica espessa de fumaça prateada que ofusca visão, desacelera e bloqueia agressão.',
    element: 'Ar / Fumaça',
    paletteId: 'crimson_blood',
    fluidColor: '#CBD5E1',
    glowColor: '#64748B',
    coreColor: '#FFFFFF',
    accentColor: '#E2E8F0',
    bottleShape: 'round_flask',
    impactRadius: 210,
    throwRange: 760,
    effectType: 'smoke_screen',
    statusLabel: 'CORTINA DE FUMAÇA OFUSCANTE!',
    puddleDuration: 5.0,
  },
};

const POTION_STORAGE_PREFIX = 'aistudio_potion_asset_v1_';

/**
 * Registers a user-provided image asset for a potion and persists it in localStorage when possible.
 */
export function registerPotionCustomAsset(
  potionId: string,
  imageOrUrl: HTMLImageElement | string,
  persist = true
): void {
  const conf = POTION_REGISTRY[potionId];
  if (!conf) return;
  if (typeof imageOrUrl === 'string') {
    const img = new Image();
    img.src = imageOrUrl;
    conf.userAssetUrl = imageOrUrl;
    conf.userAssetImage = img;
    if (persist && imageOrUrl.startsWith('data:image/')) {
      try {
        localStorage.setItem(POTION_STORAGE_PREFIX + potionId, imageOrUrl);
      } catch {
        // Ignore quota limits
      }
    }
  } else {
    conf.userAssetImage = imageOrUrl;
    conf.userAssetUrl = imageOrUrl.src;
  }
}

export function clearPotionCustomAsset(potionId: string): void {
  const conf = POTION_REGISTRY[potionId];
  if (!conf) return;
  delete conf.userAssetUrl;
  delete conf.userAssetImage;
  try {
    localStorage.removeItem(POTION_STORAGE_PREFIX + potionId);
  } catch {
    // Ignore storage error
  }
}

/**
 * Automatically matches and loads a batch of uploaded potion PNG files
 * (e.g. 01_nevoa_venenosa.png .. 10_fumaca_ofuscante.png) into POTION_REGISTRY.
 */
export function registerPotionBatchFiles(
  files: FileList | File[],
  onComplete?: (matchedCount: number) => void
): void {
  const fileArray = Array.from(files);
  if (fileArray.length === 0) {
    onComplete?.(0);
    return;
  }

  const matchRules: Array<{ id: VfxPresetId; keywords: string[] }> = [
    { id: 'potion_toxic_miasma', keywords: ['01', 'veneno', 'nevoa_venenosa', 'toxic', 'miasma'] },
    { id: 'potion_frost_freeze', keywords: ['02', 'congela', 'gelo', 'frost', 'freeze'] },
    { id: 'potion_tar_sludge', keywords: ['03', 'piche', 'lentidao', 'tar', 'sludge'] },
    { id: 'potion_hellfire_conflagration', keywords: ['04', 'fogo', 'alquimico', 'chama', 'hellfire'] },
    { id: 'potion_corrosive_acid', keywords: ['05', 'acido', 'corrosiv', 'acid'] },
    { id: 'potion_shock_volt', keywords: ['06', 'choque', 'eletric', 'shock', 'volt'] },
    { id: 'potion_healing_mist', keywords: ['07', 'curativ', 'cura', 'heal'] },
    { id: 'potion_spectral_madness', keywords: ['08', 'loucura', 'espectral', 'madness'] },
    { id: 'potion_gravity_vortex', keywords: ['09', 'gravidade', 'vortice', 'gravity'] },
    { id: 'potion_smoke_screen', keywords: ['10', 'fumaca', 'ofuscante', 'smoke'] },
  ];

  let processed = 0;
  let matched = 0;

  fileArray.forEach((file, idx) => {
    const lower = file.name.toLowerCase();
    let targetId: VfxPresetId | null = null;

    for (const rule of matchRules) {
      if (rule.keywords.some((kw) => lower.includes(kw))) {
        targetId = rule.id;
        break;
      }
    }

    if (!targetId && idx < matchRules.length) {
      targetId = matchRules[idx].id;
    }

    if (!targetId) {
      processed++;
      if (processed === fileArray.length) onComplete?.(matched);
      return;
    }

    const chosenId = targetId;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        registerPotionCustomAsset(chosenId, reader.result, true);
        matched++;
      }
      processed++;
      if (processed === fileArray.length) {
        onComplete?.(matched);
      }
    };
    reader.onerror = () => {
      processed++;
      if (processed === fileArray.length) {
        onComplete?.(matched);
      }
    };
    reader.readAsDataURL(file);
  });
}

// Restore any previously saved custom potion PNGs from localStorage on module load
if (typeof window !== 'undefined') {
  Object.keys(POTION_REGISTRY).forEach((potionId) => {
    try {
      const saved = localStorage.getItem(POTION_STORAGE_PREFIX + potionId);
      if (saved) {
        registerPotionCustomAsset(potionId, saved, false);
      }
    } catch {
      // Ignore storage error
    }
  });
}

export function getAllPotionConfigs(): PotionAssetConfig[] {
  return Object.values(POTION_REGISTRY);
}

// ============================================================================
// HIGH-RES PAINTED BOTTLE SPRITE GENERATOR (256x256)
// Matches the exact 10 uploaded potion bottle designs (01 through 10)
// ============================================================================

const paintedBottleSpriteCache = new Map<string, HTMLCanvasElement>();
const paintedBottleDataUrlCache = new Map<string, string>();

function drawCorkStopper(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  topW: number,
  botW: number,
  h: number
): void {
  ctx.save();
  // Cork body
  const corkGrad = ctx.createLinearGradient(cx - topW * 0.5, topY, cx + topW * 0.5, topY + h);
  corkGrad.addColorStop(0, '#DF9A4F');
  corkGrad.addColorStop(0.35, '#B8702A');
  corkGrad.addColorStop(0.75, '#7C4514');
  corkGrad.addColorStop(1, '#4E2909');

  ctx.fillStyle = corkGrad;
  ctx.beginPath();
  ctx.moveTo(cx - topW * 0.5, topY + 6);
  ctx.lineTo(cx + topW * 0.5, topY + 6);
  ctx.lineTo(cx + botW * 0.5, topY + h);
  ctx.quadraticCurveTo(cx, topY + h + 6, cx - botW * 0.5, topY + h);
  ctx.closePath();
  ctx.fill();

  // Cork top ellipse
  const topEllipseGrad = ctx.createRadialGradient(cx - 8, topY + 4, 2, cx, topY + 6, topW * 0.55);
  topEllipseGrad.addColorStop(0, '#F6C47E');
  topEllipseGrad.addColorStop(0.65, '#C88038');
  topEllipseGrad.addColorStop(1, '#8D521B');
  ctx.fillStyle = topEllipseGrad;
  ctx.beginPath();
  ctx.ellipse(cx, topY + 6, topW * 0.5, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cork natural pores/craters
  ctx.fillStyle = 'rgba(65, 32, 8, 0.55)';
  ctx.beginPath();
  ctx.ellipse(cx - 6, topY + 6, 4.5, 2.2, 0.2, 0, Math.PI * 2);
  ctx.ellipse(cx + 9, topY + 7, 3.2, 1.8, -0.3, 0, Math.PI * 2);
  ctx.ellipse(cx - 10, topY + 18, 3, 4.5, 0.1, 0, Math.PI * 2);
  ctx.ellipse(cx + 7, topY + 22, 2.5, 3.8, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGlassRimAndNeck(
  ctx: CanvasRenderingContext2D,
  cx: number,
  rimY: number,
  rimW: number,
  neckW: number,
  neckH: number,
  tintColor = 'rgba(180, 215, 230, 0.55)'
): void {
  ctx.save();
  // Neck cylinder
  const neckGrad = ctx.createLinearGradient(cx - neckW * 0.5, rimY, cx + neckW * 0.5, rimY);
  neckGrad.addColorStop(0, 'rgba(255,255,255,0.65)');
  neckGrad.addColorStop(0.25, tintColor);
  neckGrad.addColorStop(0.7, 'rgba(30, 45, 58, 0.45)');
  neckGrad.addColorStop(1, 'rgba(255,255,255,0.5)');
  ctx.fillStyle = neckGrad;
  ctx.fillRect(cx - neckW * 0.5, rimY + 10, neckW, neckH);

  // Thick glass collar rim
  const rimGrad = ctx.createLinearGradient(cx - rimW * 0.5, rimY, cx + rimW * 0.5, rimY + 14);
  rimGrad.addColorStop(0, 'rgba(240, 249, 255, 0.85)');
  rimGrad.addColorStop(0.3, tintColor);
  rimGrad.addColorStop(0.75, 'rgba(40, 58, 72, 0.65)');
  rimGrad.addColorStop(1, 'rgba(225, 242, 254, 0.78)');
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.roundRect(cx - rimW * 0.5, rimY, rimW, 15, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();
}

export function getPaintedPotionBottleSprite(potionId: string): HTMLCanvasElement {
  const cached = paintedBottleSpriteCache.get(potionId);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const cx = 128;
  const conf = POTION_REGISTRY[potionId] || POTION_REGISTRY.potion_toxic_miasma;

  switch (conf.effectType) {
    case 'toxic_miasma': {
      // 01: Bulbous round dark-emerald glass flask with glowing S-shaped neon green vapor inside
      drawCorkStopper(ctx, cx, 26, 54, 42, 34);
      drawGlassRimAndNeck(ctx, cx, 46, 72, 48, 34, 'rgba(90, 140, 110, 0.5)');

      const by = 152;
      const br = 76;
      // Dark green glass sphere base
      const bodyGrad = ctx.createRadialGradient(cx - 22, by - 22, 12, cx, by, br);
      bodyGrad.addColorStop(0, '#366938');
      bodyGrad.addColorStop(0.55, '#193D1B');
      bodyGrad.addColorStop(0.88, '#0D2610');
      bodyGrad.addColorStop(1, '#3D6B42');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(cx, by, br, 0, Math.PI * 2);
      ctx.fill();

      // Inner glowing S-shaped toxic vapor plume
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, by, br - 5, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';

      const plumeGrad = ctx.createRadialGradient(cx + 8, by + 18, 6, cx, by, br * 0.9);
      plumeGrad.addColorStop(0, '#E2FF99');
      plumeGrad.addColorStop(0.35, '#4DFF14');
      plumeGrad.addColorStop(0.75, '#189E0B');
      plumeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = plumeGrad;
      ctx.beginPath();
      ctx.arc(cx, by + 10, br * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // S-curve swirling smoke ribbon inside flask
      ctx.strokeStyle = '#9EFF4D';
      ctx.lineWidth = 22;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#39FF14';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(cx, by - 58);
      ctx.bezierCurveTo(cx + 42, by - 32, cx - 48, by + 4, cx + 22, by + 36);
      ctx.bezierCurveTo(cx + 48, by + 48, cx - 20, by + 62, cx, by + 56);
      ctx.stroke();

      ctx.strokeStyle = '#F2FFCC';
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.restore();

      // Specular curved window highlight & outer rim
      ctx.strokeStyle = 'rgba(220, 255, 225, 0.78)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, by, br, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.ellipse(cx - 38, by - 34, 18, 8, -0.68, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'frost_freeze': {
      // 02: Faceted diamond crystalline bottle with diamond crystal stopper & frost ferns
      // Diamond crystal stopper
      ctx.save();
      const stopGrad = ctx.createLinearGradient(cx - 28, 18, cx + 28, 64);
      stopGrad.addColorStop(0, '#FFFFFF');
      stopGrad.addColorStop(0.45, '#9BD7F5');
      stopGrad.addColorStop(1, '#3A6B9C');
      ctx.fillStyle = stopGrad;
      ctx.beginPath();
      ctx.moveTo(cx, 16);
      ctx.lineTo(cx + 28, 44);
      ctx.lineTo(cx + 16, 66);
      ctx.lineTo(cx - 16, 66);
      ctx.lineTo(cx - 28, 44);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      drawGlassRimAndNeck(ctx, cx, 60, 66, 44, 32, 'rgba(140, 200, 240, 0.6)');

      // Faceted diamond bottle body
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - 24, 90);
      ctx.lineTo(cx + 24, 90);
      ctx.lineTo(cx + 76, 142);
      ctx.lineTo(cx + 36, 228);
      ctx.lineTo(cx - 36, 228);
      ctx.lineTo(cx - 76, 142);
      ctx.closePath();

      const glassGrad = ctx.createLinearGradient(cx - 76, 90, cx + 76, 228);
      glassGrad.addColorStop(0, 'rgba(220, 242, 255, 0.78)');
      glassGrad.addColorStop(0.5, 'rgba(95, 165, 215, 0.55)');
      glassGrad.addColorStop(1, 'rgba(40, 95, 150, 0.85)');
      ctx.fillStyle = glassGrad;
      ctx.fill();
      ctx.clip();

      // Cerulean ice liquid half-fill
      const liqGrad = ctx.createLinearGradient(cx, 128, cx, 228);
      liqGrad.addColorStop(0, '#7CE8FF');
      liqGrad.addColorStop(0.3, '#2589BD');
      liqGrad.addColorStop(1, '#124E78');
      ctx.fillStyle = liqGrad;
      ctx.beginPath();
      ctx.moveTo(cx - 80, 134);
      ctx.quadraticCurveTo(cx - 25, 126, cx, 133);
      ctx.quadraticCurveTo(cx + 25, 140, cx + 80, 132);
      ctx.lineTo(cx + 80, 232);
      ctx.lineTo(cx - 80, 232);
      ctx.closePath();
      ctx.fill();

      // Crystalline frost fern fronds inside bottom
      ctx.strokeStyle = 'rgba(235, 252, 255, 0.92)';
      ctx.lineWidth = 2.2;
      const fronds = [-26, -8, 12, 28];
      for (const fx of fronds) {
        ctx.beginPath();
        ctx.moveTo(cx + fx * 0.6, 226);
        ctx.quadraticCurveTo(cx + fx * 1.1, 190, cx + fx * 1.35, 162);
        ctx.stroke();
        for (let b = 0; b < 5; b++) {
          const by = 216 - b * 11;
          const bx = cx + fx * (0.65 + b * 0.14);
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx - 8, by - 7);
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + 8, by - 7);
          ctx.stroke();
        }
      }
      ctx.restore();

      // Facet ridge lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx - 24, 90);
      ctx.lineTo(cx + 24, 90);
      ctx.lineTo(cx + 76, 142);
      ctx.lineTo(cx + 36, 228);
      ctx.lineTo(cx - 36, 228);
      ctx.lineTo(cx - 76, 142);
      ctx.closePath();
      ctx.moveTo(cx - 76, 142);
      ctx.lineTo(cx + 76, 142);
      ctx.moveTo(cx - 12, 90);
      ctx.lineTo(cx - 28, 142);
      ctx.lineTo(cx - 14, 228);
      ctx.moveTo(cx + 12, 90);
      ctx.lineTo(cx + 28, 142);
      ctx.lineTo(cx + 14, 228);
      ctx.stroke();
      break;
    }

    case 'tar_sludge': {
      // 03: Square-shouldered apothecary bottle with thick dark-brown/black dripping tar
      drawCorkStopper(ctx, cx, 26, 56, 44, 34);
      drawGlassRimAndNeck(ctx, cx, 48, 74, 48, 36, 'rgba(130, 110, 105, 0.55)');

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cx - 64, 82, 128, 144, [28, 28, 18, 18]);
      const glassGrad = ctx.createLinearGradient(cx - 64, 82, cx + 64, 226);
      glassGrad.addColorStop(0, 'rgba(215, 200, 195, 0.65)');
      glassGrad.addColorStop(0.5, 'rgba(90, 72, 68, 0.45)');
      glassGrad.addColorStop(1, 'rgba(45, 32, 28, 0.8)');
      ctx.fillStyle = glassGrad;
      ctx.fill();
      ctx.clip();

      // Thick dark-brown/obsidian tar body with big glossy drips
      const tarGrad = ctx.createLinearGradient(cx - 60, 120, cx + 60, 226);
      tarGrad.addColorStop(0, '#5C341D');
      tarGrad.addColorStop(0.35, '#2A1408');
      tarGrad.addColorStop(1, '#120703');
      ctx.fillStyle = tarGrad;
      ctx.beginPath();
      ctx.moveTo(cx - 66, 124);
      ctx.quadraticCurveTo(cx, 114, cx + 66, 124);
      ctx.lineTo(cx + 66, 230);
      ctx.lineTo(cx - 66, 230);
      ctx.closePath();
      ctx.fill();

      // Upper lighter brown meniscus wave & hanging tar droplet highlight
      ctx.fillStyle = '#6E3F23';
      ctx.beginPath();
      ctx.ellipse(cx, 124, 62, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glossy tar drip lobes on front wall
      ctx.fillStyle = '#3B1D0C';
      ctx.beginPath();
      ctx.arc(cx - 8, 168, 13, 0, Math.PI * 2);
      ctx.arc(cx + 30, 174, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 230, 200, 0.75)';
      ctx.beginPath();
      ctx.arc(cx - 11, 171, 3, 0, Math.PI * 2);
      ctx.arc(cx + 28, 176, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = 'rgba(240, 225, 215, 0.78)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cx - 64, 82, 128, 144, [28, 28, 18, 18]);
      ctx.stroke();
      break;
    }

    case 'hellfire_burn': {
      // 04: Round bulbous flask with ruby liquid and roaring golden-orange flame tongue inside
      drawCorkStopper(ctx, cx, 26, 54, 42, 34);
      drawGlassRimAndNeck(ctx, cx, 46, 72, 48, 34, 'rgba(185, 125, 120, 0.55)');

      const by = 152;
      const br = 76;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, by, br, 0, Math.PI * 2);
      const glassGrad = ctx.createRadialGradient(cx - 24, by - 24, 10, cx, by, br);
      glassGrad.addColorStop(0, 'rgba(220, 140, 130, 0.55)');
      glassGrad.addColorStop(0.6, 'rgba(120, 32, 18, 0.75)');
      glassGrad.addColorStop(1, 'rgba(75, 16, 8, 0.92)');
      ctx.fillStyle = glassGrad;
      ctx.fill();
      ctx.clip();

      // Ruby liquid fill
      const liqGrad = ctx.createLinearGradient(cx, by - 18, cx, by + br);
      liqGrad.addColorStop(0, '#B92B15');
      liqGrad.addColorStop(0.5, '#8A1607');
      liqGrad.addColorStop(1, '#4A0802');
      ctx.fillStyle = liqGrad;
      ctx.fillRect(cx - br, by - 16, br * 2, br + 20);
      ctx.fillStyle = '#D94326';
      ctx.beginPath();
      ctx.ellipse(cx, by - 16, br * 0.92, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Roaring S-shaped fire tongue inside
      ctx.globalCompositeOperation = 'lighter';
      const fireGrad = ctx.createRadialGradient(cx, by + 24, 4, cx, by + 6, 68);
      fireGrad.addColorStop(0, '#FFFFFF');
      fireGrad.addColorStop(0.3, '#FFEE55');
      fireGrad.addColorStop(0.65, '#FF6600');
      fireGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.moveTo(cx - 8, by + 68);
      ctx.bezierCurveTo(cx - 52, by + 42, cx - 28, by - 8, cx + 8, by - 56);
      ctx.bezierCurveTo(cx + 38, by - 18, cx + 48, by + 36, cx + 10, by + 68);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 225, 210, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, by, br, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.ellipse(cx - 38, by - 34, 18, 8, -0.68, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'corrosive_acid': {
      // 05: Tall cylindrical test-tube vial with lime-green acid & 3D glossy green bubbles
      drawCorkStopper(ctx, cx, 18, 52, 40, 32);
      drawGlassRimAndNeck(ctx, cx, 38, 72, 54, 24, 'rgba(190, 230, 175, 0.55)');

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cx - 46, 58, 92, 172, [14, 14, 46, 46]);
      const glassGrad = ctx.createLinearGradient(cx - 46, 58, cx + 46, 230);
      glassGrad.addColorStop(0, 'rgba(235, 255, 220, 0.72)');
      glassGrad.addColorStop(0.5, 'rgba(130, 195, 70, 0.45)');
      glassGrad.addColorStop(1, 'rgba(65, 115, 25, 0.85)');
      ctx.fillStyle = glassGrad;
      ctx.fill();
      ctx.clip();

      // Lime-green acid liquid fill
      const acidGrad = ctx.createLinearGradient(cx, 88, cx, 230);
      acidGrad.addColorStop(0, '#9EF01A');
      acidGrad.addColorStop(0.45, '#5BB318');
      acidGrad.addColorStop(1, '#2B6E07');
      ctx.fillStyle = acidGrad;
      ctx.fillRect(cx - 48, 92, 96, 142);

      ctx.fillStyle = '#C9FF66';
      ctx.beginPath();
      ctx.ellipse(cx, 92, 44, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glossy 3D spherical green bubbles rising inside
      const bubbles = [
        { x: cx - 14, y: 188, r: 14 },
        { x: cx + 14, y: 170, r: 11 },
        { x: cx - 6, y: 146, r: 12 },
        { x: cx + 12, y: 124, r: 9 },
        { x: cx - 16, y: 114, r: 7 },
        { x: cx, y: 208, r: 8 },
      ];
      for (const b of bubbles) {
        const bGrad = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, 1, b.x, b.y, b.r);
        bGrad.addColorStop(0, '#F4FFE6');
        bGrad.addColorStop(0.55, '#8CE822');
        bGrad.addColorStop(1, '#2D6A0A');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(240, 255, 230, 0.82)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cx - 46, 58, 92, 172, [14, 14, 46, 46]);
      ctx.stroke();
      break;
    }

    case 'shock_volt': {
      // 06: Waisted/hourglass hexagonal bottle with golden fluid and blazing lightning bolt inside
      drawCorkStopper(ctx, cx, 22, 54, 42, 32);
      drawGlassRimAndNeck(ctx, cx, 42, 70, 46, 28, 'rgba(220, 210, 170, 0.55)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - 24, 68);
      ctx.lineTo(cx + 24, 68);
      ctx.lineTo(cx + 58, 108);
      ctx.lineTo(cx + 42, 150);
      ctx.lineTo(cx + 60, 198);
      ctx.lineTo(cx + 38, 228);
      ctx.lineTo(cx - 38, 228);
      ctx.lineTo(cx - 60, 198);
      ctx.lineTo(cx - 42, 150);
      ctx.lineTo(cx - 58, 108);
      ctx.closePath();

      const bodyGrad = ctx.createLinearGradient(cx - 58, 68, cx + 58, 228);
      bodyGrad.addColorStop(0, 'rgba(255, 240, 180, 0.7)');
      bodyGrad.addColorStop(0.5, 'rgba(180, 125, 20, 0.75)');
      bodyGrad.addColorStop(1, 'rgba(95, 55, 5, 0.9)');
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.clip();

      // Golden electrolyte fill
      const voltGrad = ctx.createRadialGradient(cx, 158, 8, cx, 158, 72);
      voltGrad.addColorStop(0, '#FFF7AE');
      voltGrad.addColorStop(0.5, '#F59E0B');
      voltGrad.addColorStop(1, '#78350F');
      ctx.fillStyle = voltGrad;
      ctx.fillRect(cx - 64, 96, 128, 136);

      // Blazing white-gold lightning bolt inside bottle
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = '#FEF08A';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(cx + 12, 86);
      ctx.lineTo(cx - 18, 142);
      ctx.lineTo(cx + 14, 152);
      ctx.lineTo(cx - 16, 216);
      ctx.stroke();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4.5;
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 250, 220, 0.85)';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(cx - 24, 68);
      ctx.lineTo(cx + 24, 68);
      ctx.lineTo(cx + 58, 108);
      ctx.lineTo(cx + 42, 150);
      ctx.lineTo(cx + 60, 198);
      ctx.lineTo(cx + 38, 228);
      ctx.lineTo(cx - 38, 228);
      ctx.lineTo(cx - 60, 198);
      ctx.lineTo(cx - 42, 150);
      ctx.lineTo(cx - 58, 108);
      ctx.closePath();
      ctx.stroke();
      break;
    }

    case 'healing_mist': {
      // 07: Pear/teardrop flask with luminous turquoise-cyan liquid & rising healing mist ribbon
      drawCorkStopper(ctx, cx, 22, 52, 40, 32);
      drawGlassRimAndNeck(ctx, cx, 42, 68, 44, 34, 'rgba(165, 235, 230, 0.55)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - 22, 74);
      ctx.bezierCurveTo(cx - 28, 112, cx - 74, 134, cx - 70, 178);
      ctx.bezierCurveTo(cx - 66, 216, cx - 34, 228, cx, 228);
      ctx.bezierCurveTo(cx + 34, 228, cx + 66, 216, cx + 70, 178);
      ctx.bezierCurveTo(cx + 74, 134, cx + 28, 112, cx + 22, 74);
      ctx.closePath();

      const pearGrad = ctx.createRadialGradient(cx, 172, 12, cx, 165, 76);
      pearGrad.addColorStop(0, '#99F6E4');
      pearGrad.addColorStop(0.55, '#14B8A6');
      pearGrad.addColorStop(1, '#0F5257');
      ctx.fillStyle = pearGrad;
      ctx.fill();
      ctx.clip();

      // Luminous rising mist ribbon + sparkles
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#CCFBF1';
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#2DD4BF';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(cx - 10, 214);
      ctx.bezierCurveTo(cx - 34, 178, cx + 32, 146, cx, 88);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      const motes = [
        [cx - 24, 165, 3.5],
        [cx + 22, 182, 4],
        [cx - 8, 138, 3],
        [cx + 16, 152, 2.5],
        [cx, 196, 3.5],
      ];
      for (const [mx, my, mr] of motes) {
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(225, 255, 252, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 22, 74);
      ctx.bezierCurveTo(cx - 28, 112, cx - 74, 134, cx - 70, 178);
      ctx.bezierCurveTo(cx - 66, 216, cx - 34, 228, cx, 228);
      ctx.bezierCurveTo(cx + 34, 228, cx + 66, 216, cx + 70, 178);
      ctx.bezierCurveTo(cx + 74, 134, cx + 28, 112, cx + 22, 74);
      ctx.closePath();
      ctx.stroke();
      break;
    }

    case 'spectral_madness': {
      // 08: Tall cylindrical apothecary bottle with purple glass & glowing neon-magenta wisp
      drawCorkStopper(ctx, cx, 20, 54, 42, 32);
      drawGlassRimAndNeck(ctx, cx, 40, 70, 46, 30, 'rgba(195, 160, 225, 0.55)');

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cx - 52, 68, 104, 160, [26, 26, 18, 18]);
      const bodyGrad = ctx.createLinearGradient(cx - 52, 68, cx + 52, 228);
      bodyGrad.addColorStop(0, 'rgba(175, 115, 220, 0.68)');
      bodyGrad.addColorStop(0.5, 'rgba(88, 28, 135, 0.82)');
      bodyGrad.addColorStop(1, 'rgba(46, 16, 101, 0.94)');
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.clip();

      // Glowing S-shaped neon magenta spectral wisp
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#E879F9';
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#D946EF';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(cx - 8, 214);
      ctx.bezierCurveTo(cx + 38, 188, cx - 38, 146, cx + 8, 102);
      ctx.stroke();

      ctx.strokeStyle = '#FDF4FF';
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = 'rgba(245, 220, 255, 0.82)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cx - 52, 68, 104, 160, [26, 26, 18, 18]);
      ctx.stroke();
      break;
    }

    case 'gravity_vortex': {
      // 09: Faceted dark-amethyst pentagonal bottle with purple gem stopper & spiral galaxy vortex
      ctx.save();
      const gemGrad = ctx.createLinearGradient(cx - 26, 16, cx + 26, 62);
      gemGrad.addColorStop(0, '#F3E8FF');
      gemGrad.addColorStop(0.45, '#A855F7');
      gemGrad.addColorStop(1, '#3B0764');
      ctx.fillStyle = gemGrad;
      ctx.beginPath();
      ctx.moveTo(cx, 16);
      ctx.lineTo(cx + 26, 42);
      ctx.lineTo(cx + 15, 64);
      ctx.lineTo(cx - 15, 64);
      ctx.lineTo(cx - 26, 42);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#E9D5FF';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      drawGlassRimAndNeck(ctx, cx, 58, 66, 44, 28, 'rgba(165, 130, 215, 0.6)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - 24, 84);
      ctx.lineTo(cx + 24, 84);
      ctx.lineTo(cx + 76, 138);
      ctx.lineTo(cx + 42, 228);
      ctx.lineTo(cx - 42, 228);
      ctx.lineTo(cx - 76, 138);
      ctx.closePath();

      const bodyGrad = ctx.createRadialGradient(cx, 158, 6, cx, 158, 78);
      bodyGrad.addColorStop(0, '#4C1D95');
      bodyGrad.addColorStop(0.6, '#1E1B4B');
      bodyGrad.addColorStop(1, '#090514');
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.clip();

      // Spiral galaxy vortex inside
      ctx.globalCompositeOperation = 'lighter';
      for (let arm = 0; arm < 3; arm++) {
        const baseA = (arm * Math.PI * 2) / 3;
        ctx.strokeStyle = arm === 0 ? '#FFFFFF' : '#C084FC';
        ctx.lineWidth = arm === 0 ? 5 : 8;
        ctx.beginPath();
        for (let s = 0; s < 28; s++) {
          const r = s * 2.1;
          const a = baseA + s * 0.24;
          const vx = cx + Math.cos(a) * r;
          const vy = 158 + Math.sin(a) * r * 0.85;
          if (s === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
        ctx.stroke();
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, 158, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = 'rgba(233, 213, 255, 0.85)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(cx - 24, 84);
      ctx.lineTo(cx + 24, 84);
      ctx.lineTo(cx + 76, 138);
      ctx.lineTo(cx + 42, 228);
      ctx.lineTo(cx - 42, 228);
      ctx.lineTo(cx - 76, 138);
      ctx.closePath();
      ctx.stroke();
      break;
    }

    case 'smoke_screen': {
      // 10: Cylindrical apothecary jar with dense billowing white-silver cumulus smoke inside
      drawCorkStopper(ctx, cx, 20, 56, 44, 32);
      drawGlassRimAndNeck(ctx, cx, 40, 74, 48, 30, 'rgba(200, 215, 225, 0.6)');

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cx - 56, 68, 112, 160, [26, 26, 18, 18]);
      const jarGrad = ctx.createLinearGradient(cx - 56, 68, cx + 56, 228);
      jarGrad.addColorStop(0, 'rgba(226, 232, 240, 0.72)');
      jarGrad.addColorStop(0.5, 'rgba(100, 116, 139, 0.65)');
      jarGrad.addColorStop(1, 'rgba(51, 65, 85, 0.85)');
      ctx.fillStyle = jarGrad;
      ctx.fill();
      ctx.clip();

      // Dense billowing cumulus smoke puffs inside jar
      const puffs = [
        { x: cx - 18, y: 125, r: 30 },
        { x: cx + 18, y: 132, r: 28 },
        { x: cx - 22, y: 162, r: 32 },
        { x: cx + 16, y: 168, r: 30 },
        { x: cx, y: 148, r: 34 },
        { x: cx - 10, y: 196, r: 28 },
        { x: cx + 14, y: 198, r: 26 },
      ];
      for (const pf of puffs) {
        const pfGrad = ctx.createRadialGradient(
          pf.x - pf.r * 0.25,
          pf.y - pf.r * 0.25,
          2,
          pf.x,
          pf.y,
          pf.r
        );
        pfGrad.addColorStop(0, '#FFFFFF');
        pfGrad.addColorStop(0.55, '#E2E8F0');
        pfGrad.addColorStop(0.85, '#94A3B8');
        pfGrad.addColorStop(1, 'rgba(100, 116, 139, 0)');
        ctx.fillStyle = pfGrad;
        ctx.beginPath();
        ctx.arc(pf.x, pf.y, pf.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(248, 250, 252, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cx - 56, 68, 112, 160, [26, 26, 18, 18]);
      ctx.stroke();
      break;
    }
  }

  paintedBottleSpriteCache.set(potionId, canvas);
  return canvas;
}

export function getPaintedPotionBottleDataUrl(potionId: string): string {
  const cached = paintedBottleDataUrlCache.get(potionId);
  if (cached) return cached;
  const sprite = getPaintedPotionBottleSprite(potionId);
  const url = sprite.toDataURL('image/png');
  paintedBottleDataUrlCache.set(potionId, url);
  return url;
}

// ============================================================================
// TINTED / COMPOSITED HIGH-RES PUDDLE TEXTURE CACHE
// Combines /public/assetsofc/veneno & /public/assetsofc/pocas_magicas with color tints
// ============================================================================

const tintedPuddleAssetCache = new Map<string, HTMLCanvasElement>();

function getTintedOfficialPuddleSprite(
  category: 'veneno' | 'pocas_magicas' | 'cristais_gelo',
  frameIdx: number,
  tintColor: string,
  coreColor: string
): HTMLCanvasElement | null {
  const variant = ((Math.abs(frameIdx) % 4) + 1) as 1 | 2 | 3 | 4;
  const img = getAssetOfcVariant(category, variant);
  if (!isImageReady(img)) return null;

  const key = `${category}_${frameIdx}_${tintColor}_${coreColor}`;
  const cached = tintedPuddleAssetCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Draw original high-res asset
  ctx.drawImage(img, 0, 0, size, size);

  // Apply color-preserving tint for non-venom or custom-colored puddles
  if (category === 'pocas_magicas') {
    ctx.globalCompositeOperation = 'source-atop';
    const grad = ctx.createRadialGradient(size / 2, size / 2, 12, size / 2, size / 2, size * 0.48);
    grad.addColorStop(0, coreColor + '77');
    grad.addColorStop(0.55, tintColor + 'AA');
    grad.addColorStop(1, tintColor + 'CC');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  tintedPuddleAssetCache.set(key, canvas);
  return canvas;
}

// ============================================================================
// ENTITIES & RUNTIME STATE
// ============================================================================

export interface ThrownPotionEntity {
  id: number;
  potionId: VfxPresetId;
  config: PotionAssetConfig;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  x: number;
  y: number;
  arcZ: number;
  maxArcHeight: number;
  spinAngle: number;
  spinSpeed: number;
  wobblePhase: number;
  life: number;
  maxLife: number;
  progress: number;
  scale: number;
  palette: ElementalPalette;
  casterId?: string;
  trailHistory: Array<{ x: number; y: number; arcZ: number; angle: number }>;
}

export interface PuddleSplatterLobe {
  angle: number;
  distRatio: number;
  radiusRatio: number;
  stretchX: number;
  stretchY: number;
  phaseOffset: number;
}

export interface PuddleSurfaceBlister {
  rx: number;
  ry: number;
  maxR: number;
  phase: number;
  speed: number;
}

export interface PotionHazardPuddle {
  id: number;
  potionId: VfxPresetId;
  config: PotionAssetConfig;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  tickTimer: number;
  palette: ElementalPalette;
  casterId?: string;
  seed: number;
  splatterLobes: PuddleSplatterLobe[];
  blisters: PuddleSurfaceBlister[];
}

let potionIdCounter = 1;
export const activeThrownPotions: ThrownPotionEntity[] = [];
export const activePotionPuddles: PotionHazardPuddle[] = [];

/**
 * Spawns a thrown potion with realistic parabolic ballistics and tumbling bottle spin
 */
export function spawnThrownPotionModule(
  engine: VfxEngine,
  _caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  targetX: number,
  targetY: number,
  potionId: VfxPresetId,
  palette: ElementalPalette,
  scale: number,
  _params: ShaderParams,
  casterId?: string
): void {
  const config = POTION_REGISTRY[potionId] || POTION_REGISTRY.potion_toxic_miasma;
  soundEngine.playSkillshotLaunch();

  const dx = targetX - casterX;
  const dy = targetY - casterY;
  const dist = Math.hypot(dx, dy);

  // Parabolic flight time: 0.42s to 0.72s
  const flightDuration = Math.min(0.72, Math.max(0.42, dist / 960));
  // Peak apex altitude (arcZ in px)
  const maxArcHeight = Math.min(170, Math.max(75, dist * 0.24));
  // End-over-end bottle spin: 3 to 5 full revolutions during flight
  const totalTurns = (Math.random() < 0.5 ? -1 : 1) * (3.5 + Math.random() * 1.5) * Math.PI * 2;
  const spinSpeed = totalTurns / flightDuration;

  activeThrownPotions.push({
    id: potionIdCounter++,
    potionId,
    config,
    startX: casterX,
    startY: casterY,
    targetX,
    targetY,
    x: casterX,
    y: casterY,
    arcZ: 0,
    maxArcHeight,
    spinAngle: Math.random() * Math.PI,
    spinSpeed,
    wobblePhase: Math.random() * Math.PI * 2,
    life: 0,
    maxLife: flightDuration,
    progress: 0,
    scale,
    palette,
    casterId,
    trailHistory: [],
  });
}

/**
 * Updates physics for thrown potions and lingering hazard puddles
 */
export function updatePotionAlchemyModule(
  engine: VfxEngine,
  dt: number,
  params: ShaderParams
): void {
  // 1. Update In-Flight Thrown Potions
  for (let i = activeThrownPotions.length - 1; i >= 0; i--) {
    const p = activeThrownPotions[i];
    p.life += dt;
    p.progress = Math.min(1, p.life / p.maxLife);
    const prog = p.progress;

    // Ground coordinates interpolation
    p.x = p.startX + (p.targetX - p.startX) * prog;
    p.y = p.startY + (p.targetY - p.startY) * prog;

    // Parabolic vertical altitude (0 at start, peak at mid-flight, 0 at target)
    p.arcZ = 4 * p.maxArcHeight * prog * (1 - prog);

    // End-over-end bottle tumbling rotation
    p.spinAngle += p.spinSpeed * dt;
    p.wobblePhase += dt * 8;

    p.trailHistory.unshift({
      x: p.x,
      y: p.y,
      arcZ: p.arcZ,
      angle: p.spinAngle,
    });
    if (p.trailHistory.length > 12) p.trailHistory.pop();

    // Spawn tiny fluid droplet trail in air
    if (Math.random() < 0.65) {
      engine.spawnParticle({
        x: p.x + (Math.random() - 0.5) * 6,
        y: p.y - p.arcZ,
        z: 6,
        vx: (Math.random() - 0.5) * 35,
        vy: (Math.random() - 0.5) * 35,
        vz: 15,
        size: (2.5 + Math.random() * 3) * p.scale,
        color: p.config.fluidColor,
        coreColor: p.config.coreColor,
        alpha: 0.9,
        life: 0,
        maxLife: 0.28,
        drag: 0.92,
        gravity: 80,
        bounce: 0.2,
        floorY: p.y + 10,
        type: 'potion_bubble',
        rotation: Math.random() * Math.PI * 2,
        vRot: 0,
        stretch: 1,
        seed: i,
      });
    }

    // Impact & Shatter
    if (p.progress >= 1) {
      detonatePotionShatter(engine, p, params);
      removeSwapPop(activeThrownPotions, i);
    }
  }

  // 2. Update Lingering Hazard Puddles & Rich Elemental Surface Particles
  for (let i = activePotionPuddles.length - 1; i >= 0; i--) {
    const pud = activePotionPuddles[i];
    pud.life += dt;
    pud.tickTimer += dt;

    // Expand to max radius with liquid spring overshoot during initial 0.22s
    if (pud.radius < pud.maxRadius) {
      pud.radius = Math.min(pud.maxRadius, pud.radius + pud.maxRadius * dt * 5.8);
    }

    // Update surface blisters and pop them at peak inflation
    for (let b = 0; b < pud.blisters.length; b++) {
      const bl = pud.blisters[b];
      const prevPhase = bl.phase;
      bl.phase = (bl.phase + dt * bl.speed) % 1;
      if (bl.phase < prevPhase && Math.random() < 0.55) {
        const bx = pud.x + bl.rx * pud.radius;
        const by = pud.y + bl.ry * pud.radius * 0.56;
        engine.spawnParticle({
          x: bx,
          y: by,
          z: 5,
          vx: (Math.random() - 0.5) * 26,
          vy: -20 - Math.random() * 36,
          vz: 28,
          size: 3.5 + Math.random() * 3.5,
          color: pud.config.fluidColor,
          coreColor: pud.config.coreColor,
          alpha: 0.9,
          life: 0,
          maxLife: 0.35,
          drag: 0.92,
          gravity: 110,
          bounce: 0.2,
          floorY: by + 12,
          type: 'slime_droplet',
          rotation: Math.random() * Math.PI * 2,
          vRot: 0,
          stretch: 1.25,
          seed: b,
        });
      }
    }

    // Spawn bespoke elemental particles per potion type
    if (Math.random() < 0.65) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * pud.radius * 0.88;
      const px = pud.x + Math.cos(ang) * r;
      const py = pud.y + Math.sin(ang) * r * 0.56;

      let pType:
        | 'potion_bubble'
        | 'flame_tongue'
        | 'acid_bubble'
        | 'snowflake'
        | 'heal_cross'
        | 'needle_spark'
        | 'smoke_puff' = 'potion_bubble';
      let vy = -25 - Math.random() * 40;
      let vx = (Math.random() - 0.5) * 24;
      let grav = -40;
      let pSize = 3.5 + Math.random() * 4.5;

      switch (pud.config.effectType) {
        case 'toxic_miasma':
          pType = Math.random() < 0.5 ? 'acid_bubble' : 'smoke_puff';
          pSize = 5 + Math.random() * 6;
          vy = -30 - Math.random() * 35;
          break;
        case 'frost_freeze':
          pType = 'snowflake';
          pSize = 4 + Math.random() * 4.5;
          vy = -12 - Math.random() * 20;
          grav = -10;
          break;
        case 'tar_sludge':
          pType = 'potion_bubble';
          pSize = 4.5 + Math.random() * 4;
          vy = -8 - Math.random() * 14;
          grav = 45;
          break;
        case 'hellfire_burn':
          pType = 'flame_tongue';
          pSize = 6 + Math.random() * 7;
          vy = -45 - Math.random() * 55;
          break;
        case 'corrosive_acid':
          pType = 'acid_bubble';
          pSize = 3.5 + Math.random() * 4.5;
          vy = -38 - Math.random() * 40;
          break;
        case 'shock_volt':
          pType = 'needle_spark';
          pSize = 4.5 + Math.random() * 5;
          vx = (Math.random() - 0.5) * 90;
          vy = (Math.random() - 0.5) * 70;
          grav = 0;
          break;
        case 'healing_mist':
          pType = Math.random() < 0.6 ? 'heal_cross' : 'potion_bubble';
          pSize = 4.5 + Math.random() * 4;
          vy = -32 - Math.random() * 35;
          break;
        case 'spectral_madness':
          pType = 'potion_bubble';
          pSize = 4.5 + Math.random() * 5;
          vx = Math.cos(ang + Math.PI * 0.5) * 55;
          vy = Math.sin(ang + Math.PI * 0.5) * 32 - 22;
          break;
        case 'gravity_vortex':
          pType = 'potion_bubble';
          // Suction inward toward singularity center!
          vx = (pud.x - px) * 2.4;
          vy = (pud.y - py) * 2.4;
          grav = 0;
          break;
        case 'smoke_screen':
          pType = 'smoke_puff';
          pSize = 9 + Math.random() * 10;
          vy = -16 - Math.random() * 22;
          break;
      }

      engine.spawnParticle({
        x: px,
        y: py,
        z: 4,
        vx,
        vy,
        vz: 18,
        size: pSize,
        color: pud.config.fluidColor,
        coreColor: pud.config.coreColor,
        alpha: 0.88,
        life: 0,
        maxLife: 0.48 + Math.random() * 0.35,
        drag: 0.94,
        gravity: grav,
        bounce: 0,
        floorY: py + 20,
        type: pType,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 4,
        stretch: 1.2,
        seed: Math.floor(Math.random() * 99),
      });
    }

    // Periodic area tick effect every 0.35s
    if (pud.tickTimer >= 0.35) {
      pud.tickTimer = 0;
      applyPotionPuddleTick(engine, pud);
    }

    if (pud.life >= pud.maxLife) {
      removeSwapPop(activePotionPuddles, i);
    }
  }
}

/**
 * Detonates a potion upon landing: shattering glass, splash shockwave, area damage, and rich puddle creation
 */
function detonatePotionShatter(
  engine: VfxEngine,
  potion: ThrownPotionEntity,
  params: ShaderParams
): void {
  const { targetX: x, targetY: y, config, scale, palette, casterId } = potion;

  // Sound effects: crystal glass shatter + impact
  soundEngine.playCrystalShatter();
  soundEngine.playArcaneImpact();

  // 1. Frame-0 Impact Flash
  engine.impactFlashes.push({
    x,
    y,
    radius: config.impactRadius * 0.95 * scale,
    life: 0,
    maxLife: 0.09,
    palette,
  });

  // 2. Dual Concentric Liquid Splash Shock Rings
  engine.shockRings.push({
    x,
    y,
    radius: 14,
    maxRadius: config.impactRadius * scale,
    thickness: 11 * scale,
    life: 0,
    maxLife: 0.34,
    palette,
    perspectiveY: 0.56,
    rotation: 0,
  });
  engine.shockRings.push({
    x,
    y,
    radius: 6,
    maxRadius: config.impactRadius * 0.68 * scale,
    thickness: 6 * scale,
    life: 0,
    maxLife: 0.45,
    palette,
    perspectiveY: 0.56,
    rotation: Math.PI * 0.25,
  });

  // 3. Flying Glass Shards (Zero-allocation particle pooling)
  const shardCount = Math.floor(20 * params.particleMultiplier);
  for (let k = 0; k < shardCount; k++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = (95 + Math.random() * 270) * scale;
    engine.spawnParticle({
      x,
      y,
      z: 14,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd * 0.65 - 30,
      vz: 80 + Math.random() * 80,
      size: (4 + Math.random() * 5) * scale,
      color: '#FFFFFF',
      coreColor: config.fluidColor,
      alpha: 1,
      life: 0,
      maxLife: 0.38 + Math.random() * 0.25,
      drag: 0.92,
      gravity: 380,
      bounce: 0.45,
      floorY: y + 25,
      type: 'glass_splinter',
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 16,
      stretch: 1.8,
      seed: k,
    });
  }

  // 4. Liquid Crown Splash Droplets
  const dropCount = Math.floor(26 * params.particleMultiplier);
  for (let k = 0; k < dropCount; k++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = (75 + Math.random() * 230) * scale;
    engine.spawnParticle({
      x,
      y,
      z: 10,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd * 0.6 - 48,
      vz: 95 + Math.random() * 85,
      size: (5.5 + Math.random() * 6.5) * scale,
      color: config.fluidColor,
      coreColor: config.coreColor,
      alpha: 0.96,
      life: 0,
      maxLife: 0.44 + Math.random() * 0.24,
      drag: 0.91,
      gravity: 340,
      bounce: 0.5,
      floorY: y + 28,
      type: 'slime_droplet',
      rotation: ang,
      vRot: 0,
      stretch: 1.45,
      seed: k,
    });
  }

  // 5. Popping Wooden Cork / Crystal Stopper
  engine.spawnParticle({
    x,
    y: y - 8,
    z: 22,
    vx: (Math.random() - 0.5) * 65,
    vy: -65 - Math.random() * 50,
    vz: 115,
    size: 7.5 * scale,
    color: '#A16207',
    coreColor: '#FDE68A',
    alpha: 1,
    life: 0,
    maxLife: 0.62,
    drag: 0.94,
    gravity: 360,
    bounce: 0.6,
    floorY: y + 20,
    type: 'shell_casing',
    rotation: 0.4,
    vRot: 14,
    stretch: 1,
    seed: 1,
  });

  // 6. Immediate Area Damage & Status Burst
  applyImmediatePotionBurst(engine, potion);

  // 7. Generate Organic Splatter Lobes & Surface Blisters for the Puddle
  const splatterLobes: PuddleSplatterLobe[] = [];
  const lobeCount = 11;
  for (let l = 0; l < lobeCount; l++) {
    const baseAngle = (l / lobeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    splatterLobes.push({
      angle: baseAngle,
      distRatio: 0.45 + Math.random() * 0.42,
      radiusRatio: 0.26 + Math.random() * 0.24,
      stretchX: 0.85 + Math.random() * 0.4,
      stretchY: 0.75 + Math.random() * 0.35,
      phaseOffset: Math.random() * Math.PI * 2,
    });
  }

  const blisters: PuddleSurfaceBlister[] = [];
  const blisterCount = 14;
  for (let b = 0; b < blisterCount; b++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * 0.78;
    blisters.push({
      rx: Math.cos(a) * d,
      ry: Math.sin(a) * d,
      maxR: 5 + Math.random() * 9,
      phase: Math.random(),
      speed: 0.65 + Math.random() * 0.85,
    });
  }

  activePotionPuddles.push({
    id: potionIdCounter++,
    potionId: potion.potionId,
    config,
    x,
    y,
    radius: 24,
    maxRadius: config.impactRadius * scale,
    life: 0,
    maxLife: config.puddleDuration,
    tickTimer: 0,
    palette,
    casterId,
    seed: Math.floor(Math.random() * 100),
    splatterLobes,
    blisters,
  });

  engine.addTrauma(0.48, params.screenShakeIntensity);
}

/**
 * Applies immediate impact effects on explosion
 */
function applyImmediatePotionBurst(engine: VfxEngine, potion: ThrownPotionEntity): void {
  const { targetX: x, targetY: y, config, scale, palette, casterId } = potion;
  const radius = config.impactRadius * scale;

  let initialDamage = 1750;
  const statusText = config.statusLabel;

  switch (config.effectType) {
    case 'toxic_miasma':
      initialDamage = 1450;
      engine.applyAreaEffect(x, y, radius, initialDamage, statusText, palette, {
        casterId,
        poisonDuration: 3.5,
      });
      break;

    case 'frost_freeze':
      initialDamage = 1680;
      engine.applyAreaEffect(x, y, radius, initialDamage, statusText, palette, {
        casterId,
        freezeDuration: 1.8,
      });
      break;

    case 'tar_sludge':
      initialDamage = 950;
      engine.applyAreaEffect(x, y, radius, initialDamage, statusText, palette, {
        casterId,
        stunDuration: 0.6,
      });
      break;

    case 'hellfire_burn':
      initialDamage = 1920;
      engine.applyAreaEffect(x, y, radius, initialDamage, statusText, palette, {
        casterId,
        burnDuration: 3.4,
        knockbackForce: 240,
        originX: x,
        originY: y,
      });
      break;

    case 'corrosive_acid':
      initialDamage = 1800;
      engine.applyAreaEffect(x, y, radius, initialDamage, statusText, palette, {
        casterId,
        corrodeDuration: 3.8,
      });
      break;

    case 'shock_volt':
      initialDamage = 1880;
      engine.applyAreaEffect(x, y, radius, initialDamage, statusText, palette, {
        casterId,
        shockDuration: 0.85,
        stunDuration: 0.7,
      });
      break;

    case 'healing_mist':
      initialDamage = 0;
      engine.slimes.forEach((s) => {
        const dist = Math.hypot(s.x - x, s.y - y);
        if (dist <= radius) {
          s.hp = Math.min(s.maxHp, s.hp + 1200);
          s.poisonTimer = 0;
          s.burnTimer = 0;
          s.corrodeTimer = 0;
          s.frozenTimer = 0;
          s.shockTimer = 0;
          engine.spawnFloatingText(s.x, s.y - s.radius - 20, '+1200 HP', 'PURIFICADO!', '#10B981');
          if (casterId && casterId !== s.id) {
            const caster = engine.slimes.find((c) => c.id === casterId);
            if (caster) {
              applyCombatActionToDnaBond(caster, s, 'heal');
            }
          }
        }
      });
      break;

    case 'spectral_madness':
      initialDamage = 1350;
      engine.applyAreaEffect(x, y, radius, initialDamage, statusText, palette, {
        casterId,
        stunDuration: 0.8,
      });
      engine.slimes.forEach((s) => {
        if (casterId && s.id === casterId) return;
        if (Math.hypot(s.x - x, s.y - y) <= radius) {
          s.isDesperate = true;
          s.desperateTimer = 2.4;
          engine.spawnFloatingText(s.x, s.y - s.radius - 15, 'MEDO!', 'EM PÂNICO', '#C084FC');
        }
      });
      break;

    case 'gravity_vortex':
      initialDamage = 1650;
      engine.applyAreaEffect(x, y, radius, initialDamage, statusText, palette, {
        casterId,
        knockbackForce: -360,
        originX: x,
        originY: y,
      });
      break;

    case 'smoke_screen':
      initialDamage = 450;
      engine.applyAreaEffect(x, y, radius, initialDamage, statusText, palette, {
        casterId,
        stunDuration: 0.5,
      });
      break;
  }
}

/**
 * Periodically applies lingering zone effects to slimes standing inside hazard puddle
 */
function applyPotionPuddleTick(engine: VfxEngine, pud: PotionHazardPuddle): void {
  const { x, y, radius, config, palette, casterId } = pud;

  engine.slimes.forEach((s) => {
    if (casterId && s.id === casterId && config.effectType !== 'healing_mist') return;
    const dist = Math.hypot(s.x - x, s.y - y);
    if (dist > radius) return;

    switch (config.effectType) {
      case 'toxic_miasma':
        s.poisonTimer = Math.max(s.poisonTimer, 1.2);
        engine.damageSlime(s, 240, 'MIASMA TÓXICO', palette, casterId);
        break;

      case 'tar_sludge':
        s.vx *= 0.25;
        s.vy *= 0.25;
        s.squashX = 1.35;
        s.squashY = 0.7;
        break;

      case 'hellfire_burn':
        s.burnTimer = Math.max(s.burnTimer, 1.2);
        engine.damageSlime(s, 310, 'EM CHAMAS', palette, casterId);
        break;

      case 'corrosive_acid':
        s.corrodeTimer = Math.max(s.corrodeTimer || 0, 1.2);
        s.shieldHp = 0;
        engine.damageSlime(s, 260, 'ÁCIDO', palette, casterId);
        break;

      case 'shock_volt':
        if (Math.random() < 0.4) {
          s.shockTimer = Math.max(s.shockTimer, 0.4);
          engine.damageSlime(s, 280, 'ELETROCHOQUE', palette, casterId);
        }
        break;

      case 'healing_mist':
        if (s.hp < s.maxHp) {
          s.hp = Math.min(s.maxHp, s.hp + 140);
        }
        break;

      case 'gravity_vortex': {
        const dx = x - s.x;
        const dy = y - s.y;
        const d = Math.hypot(dx, dy);
        if (d > 10) {
          s.vx += (dx / d) * 320 * 0.05;
          s.vy += (dy / d) * 320 * 0.05;
        }
        break;
      }

      case 'smoke_screen':
        s.vx *= 0.55;
        s.vy *= 0.55;
        break;
    }
  });
}

/**
 * Renders multi-layered, richly textured ground hazard puddles and bespoke elemental surface effects
 */
export function renderPotionPuddlesGroundModule(ctx: CanvasRenderingContext2D): void {
  if (activePotionPuddles.length === 0) return;
  ctx.save();

  for (let i = 0; i < activePotionPuddles.length; i++) {
    const pud = activePotionPuddles[i];
    const t = pud.life / pud.maxLife;
    const alpha = t < 0.1 ? t / 0.1 : t > 0.82 ? Math.max(0, 1 - (t - 0.82) / 0.18) : 1;
    const r = pud.radius;
    const { config, palette, life, seed } = pud;

    // ========================================================================
    // LAYER 1: ISOMETRIC GROUND PLANE (Organic Splatter + Pixel-Shader Decal + Official Puddle Sprite)
    // ========================================================================
    ctx.save();
    ctx.translate(pud.x, pud.y);
    ctx.scale(1, 0.56);
    ctx.globalAlpha = alpha;

    // 1A. Deep Ambient Floor Shadow / Wet Contact Border
    ctx.globalCompositeOperation = 'source-over';
    const shadowGrad = ctx.createRadialGradient(0, 0, r * 0.25, 0, 0, r * 1.12);
    shadowGrad.addColorStop(0, 'rgba(3, 6, 14, 0.72)');
    shadowGrad.addColorStop(0.75, 'rgba(5, 8, 18, 0.48)');
    shadowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.12, 0, Math.PI * 2);
    ctx.fill();

    // 1B. Organic Multi-Lobe Liquid Splatter Silhouette
    ctx.fillStyle = config.glowColor;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    for (let l = 0; l < pud.splatterLobes.length; l++) {
      const lobe = pud.splatterLobes[l];
      const pulse = 1 + Math.sin(life * 3.2 + lobe.phaseOffset) * 0.06;
      const lx = Math.cos(lobe.angle) * r * lobe.distRatio;
      const ly = Math.sin(lobe.angle) * r * lobe.distRatio;
      const lr = r * lobe.radiusRatio * pulse;
      ctx.moveTo(lx + lr, ly);
      ctx.ellipse(lx, ly, lr * lobe.stretchX, lr * lobe.stretchY, lobe.angle, 0, Math.PI * 2);
    }
    ctx.fill();

    // Specular rim along splatter lobes
    ctx.strokeStyle = config.fluidColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // 1C. Pixel-Shader Ground Decal Texture Layer
    let decalType:
      | 'tectonic_crater'
      | 'acid_caustic'
      | 'permafrost_ice'
      | 'water_ripples'
      | 'black_hole' = 'acid_caustic';
    if (config.effectType === 'frost_freeze') decalType = 'permafrost_ice';
    else if (config.effectType === 'hellfire_burn') decalType = 'tectonic_crater';
    else if (config.effectType === 'gravity_vortex') decalType = 'black_hole';
    else if (config.effectType === 'healing_mist' || config.effectType === 'shock_volt')
      decalType = 'water_ripples';

    const shaderDecal = getGroundDecalTextureSprite(
      decalType,
      config.fluidColor,
      config.glowColor,
      config.coreColor,
      palette.dark
    );
    ctx.save();
    ctx.rotate(
      config.effectType === 'gravity_vortex'
        ? -life * 1.8
        : Math.sin(life * 0.4 + seed) * 0.15
    );
    ctx.globalAlpha = alpha * 0.85;
    ctx.drawImage(shaderDecal, -r * 1.05, -r * 1.05, r * 2.1, r * 2.1);
    ctx.restore();

    // 1D. High-Res Painted Puddle Sprite Layer (/assetsofc/veneno or /assetsofc/pocas_magicas)
    const puddleCategory =
      config.effectType === 'toxic_miasma' || config.effectType === 'corrosive_acid'
        ? 'veneno'
        : 'pocas_magicas';
    const paintedPuddle = getTintedOfficialPuddleSprite(
      puddleCategory,
      seed,
      config.fluidColor,
      config.coreColor
    );
    if (paintedPuddle) {
      ctx.save();
      const breathScale = 1 + Math.sin(life * 2.8 + seed) * 0.04;
      ctx.scale(breathScale, breathScale);
      ctx.globalCompositeOperation =
        config.effectType === 'tar_sludge' ? 'source-over' : 'lighter';
      ctx.globalAlpha = alpha * (config.effectType === 'tar_sludge' ? 0.85 : 0.72);
      ctx.drawImage(paintedPuddle, -r * 1.08, -r * 1.08, r * 2.16, r * 2.16);
      ctx.restore();
    }

    // 1E. Animated Surface Blisters / Effervescent Cells (for liquid/sludge/acid/venom puddles)
    if (
      config.effectType !== 'frost_freeze' &&
      config.effectType !== 'gravity_vortex' &&
      config.effectType !== 'smoke_screen'
    ) {
      for (let b = 0; b < pud.blisters.length; b++) {
        const bl = pud.blisters[b];
        const bx = bl.rx * r;
        const by = bl.ry * r;
        const curR = bl.maxR * Math.sin(bl.phase * Math.PI);
        if (curR <= 1) continue;

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = config.effectType === 'tar_sludge' ? '#1E0D05' : config.fluidColor;
        ctx.beginPath();
        ctx.arc(bx, by, curR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = config.coreColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Specular dome dot
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(bx - curR * 0.3, by - curR * 0.3, Math.max(1.2, curR * 0.28), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 1F. Bespoke Isometric Plane Overlays per Potion Type
    switch (config.effectType) {
      case 'corrosive_acid': {
        // Sizzling chemical white-lime foam perimeter ring
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#ECFCCB';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -life * 40;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }

      case 'shock_volt': {
        // Live procedural fractal Tesla lightning arcs jumping across the puddle surface
        ctx.globalCompositeOperation = 'lighter';
        const arcCount = 5;
        for (let a = 0; a < arcCount; a++) {
          const a1 = ((a + Math.floor(life * 16)) * 2.1 + seed) % (Math.PI * 2);
          const a2 = a1 + 1.8 + fastNoise(life * 12 + a * 3.1) * 1.4;
          const r1 = r * (0.2 + fastNoise(a + life * 8) * 0.65);
          const r2 = r * (0.35 + fastNoise(a + 5 + life * 9) * 0.55);
          const x1 = Math.cos(a1) * r1;
          const y1 = Math.sin(a1) * r1;
          const x2 = Math.cos(a2) * r2;
          const y2 = Math.sin(a2) * r2;

          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          const steps = 5;
          for (let s = 1; s < steps; s++) {
            const frac = s / steps;
            const jx =
              x1 + (x2 - x1) * frac + (fastNoise(s * 7.3 + life * 28 + a) - 0.5) * 36;
            const jy =
              y1 + (y2 - y1) * frac + (fastNoise(s * 11.1 + life * 31 + a) - 0.5) * 36;
            ctx.lineTo(jx, jy);
          }
          ctx.lineTo(x2, y2);
          ctx.stroke();

          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
        break;
      }

      case 'healing_mist': {
        // Rotating sacred harmonic sanctuary rings
        ctx.globalCompositeOperation = 'lighter';
        ctx.rotate(life * 0.65);
        ctx.strokeStyle = '#5EEAD4';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
        ctx.stroke();

        // 8-point star geometry inside spring
        ctx.strokeStyle = 'rgba(240, 253, 250, 0.7)';
        ctx.lineWidth = 1.8;
        for (let sq = 0; sq < 2; sq++) {
          ctx.save();
          ctx.rotate((sq * Math.PI) / 4);
          const sr = r * 0.52;
          ctx.strokeRect(-sr, -sr, sr * 2, sr * 2);
          ctx.restore();
        }
        break;
      }

      case 'gravity_vortex': {
        // Counter-rotating spiral galaxy arms + pitch-black event horizon core
        const vortexSprite = getTornadoVortexTextureSprite(
          config.fluidColor,
          config.glowColor,
          config.coreColor
        );
        ctx.save();
        ctx.rotate(-life * 3.4);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.9;
        ctx.drawImage(vortexSprite, -r * 1.05, -r * 1.05, r * 2.1, r * 2.1);
        ctx.restore();

        // Pitch-black singularity core + Hawking radiation photon ring
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#030108';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#F3E8FF';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.25 + Math.sin(life * 14) * 2, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
    }

    ctx.restore();

    // ========================================================================
    // LAYER 2: 2.5D VERTICAL UPRIGHT VOLUMETRICS (Rising Plumes, Ice Spires, Fire Columns, Cumulus Clouds)
    // Rendered in screen-space aspect above the puddle
    // ========================================================================
    ctx.save();
    ctx.translate(pud.x, pud.y);
    ctx.globalAlpha = alpha;

    switch (config.effectType) {
      case 'toxic_miasma': {
        // Rising serpentine neon-green miasma plumes above the puddle
        ctx.globalCompositeOperation = 'lighter';
        for (let p = 0; p < 5; p++) {
          const pAngle = (p / 5) * Math.PI * 2 + seed;
          const pr = r * 0.45;
          const bx = Math.cos(pAngle) * pr;
          const by = Math.sin(pAngle) * pr * 0.56;
          const sway = Math.sin(life * 3.5 + p * 1.7) * 16;
          const h = 55 + Math.sin(life * 2.2 + p) * 14;

          const mistGrad = ctx.createLinearGradient(bx, by, bx + sway, by - h);
          mistGrad.addColorStop(0, 'rgba(57, 255, 20, 0.55)');
          mistGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.3)');
          mistGrad.addColorStop(1, 'transparent');

          ctx.strokeStyle = mistGrad;
          ctx.lineWidth = 18;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(bx - sway * 0.7, by - h * 0.5, bx + sway, by - h);
          ctx.stroke();
        }
        break;
      }

      case 'frost_freeze': {
        // 2.5D Erupting Ice Crystal Spires across the frozen glacier puddle
        const procCrystal = getProceduralCrystalSprite(
          config.fluidColor,
          config.glowColor,
          config.coreColor
        );
        const spireCount = 6;
        for (let c = 0; c < spireCount; c++) {
          const cAngle = (c / spireCount) * Math.PI * 2 + 0.4;
          const cr = c === 0 ? 0 : r * 0.54;
          const cx = Math.cos(cAngle) * cr;
          const cy = Math.sin(cAngle) * cr * 0.56;
          const spireScale = (c === 0 ? 0.62 : 0.42) * Math.min(1, pud.life * 5);

          ctx.save();
          ctx.translate(cx, cy);
          const img = getAssetOfcVariant('cristais_gelo', (((c + seed) % 4) + 1) as 1 | 2 | 3 | 4);
          if (isImageReady(img)) {
            const w = 120 * spireScale;
            const h = 140 * spireScale;
            ctx.drawImage(img, -w * 0.5, -h * 0.82, w, h);
          } else {
            const w = 95 * spireScale;
            const h = 120 * spireScale;
            ctx.drawImage(procCrystal, -w * 0.5, -h * 0.82, w, h);
          }
          ctx.restore();
        }
        break;
      }

      case 'hellfire_burn': {
        // Animated 8-frame Voronoi Fire Flipbook columns roaring on the magma puddle
        const fireFrames = getVoronoiExplosionFlipbook(
          config.fluidColor,
          config.glowColor,
          config.coreColor,
          palette.dark
        );
        ctx.globalCompositeOperation = 'lighter';
        for (let f = 0; f < 5; f++) {
          const fAngle = (f / 5) * Math.PI * 2 + life * 0.4;
          const fr = f === 0 ? 0 : r * 0.48;
          const fx = Math.cos(fAngle) * fr;
          const fy = Math.sin(fAngle) * fr * 0.56;
          const frameIdx = Math.floor(life * 14 + f * 2) % fireFrames.length;
          const fireImg = fireFrames[frameIdx];
          const fw = (f === 0 ? 115 : 85) * (0.9 + Math.sin(life * 9 + f) * 0.12);
          ctx.globalAlpha = alpha * 0.78;
          ctx.drawImage(fireImg, fx - fw * 0.5, fy - fw * 0.72, fw, fw);
        }
        break;
      }

      case 'healing_mist': {
        // Vertical shafts of turquoise-emerald celestial light rising from the spring
        ctx.globalCompositeOperation = 'lighter';
        for (let b = 0; b < 4; b++) {
          const bx = Math.cos(b * 1.6 + life * 0.7) * r * 0.45;
          const by = Math.sin(b * 1.6 + life * 0.7) * r * 0.25;
          const bw = 22 + Math.sin(life * 4 + b) * 6;
          const bh = 85;
          const beamGrad = ctx.createLinearGradient(bx, by, bx, by - bh);
          beamGrad.addColorStop(0, 'rgba(94, 234, 212, 0.48)');
          beamGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = beamGrad;
          ctx.fillRect(bx - bw * 0.5, by - bh, bw, bh);
        }
        break;
      }

      case 'spectral_madness': {
        // 4 Orbiting Phantom Soul Wisps with glowing ectoplasmic ribbon trails
        ctx.globalCompositeOperation = 'lighter';
        for (let w = 0; w < 4; w++) {
          const baseA = life * 2.8 + (w * Math.PI) / 2;
          const wr = r * 0.58;
          ctx.strokeStyle = '#D946EF';
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          for (let s = 0; s < 8; s++) {
            const sa = baseA - s * 0.14;
            const wx = Math.cos(sa) * wr;
            const wy = Math.sin(sa) * wr * 0.56 - 18 - Math.sin(sa * 2 + w) * 12;
            if (s === 0) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
          }
          ctx.stroke();

          const headX = Math.cos(baseA) * wr;
          const headY = Math.sin(baseA) * wr * 0.56 - 18 - Math.sin(baseA * 2 + w) * 12;
          ctx.fillStyle = '#FAF5FF';
          ctx.beginPath();
          ctx.arc(headX, headY, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'smoke_screen': {
        // Multi-layered billowing volumetric cumulus smoke cloud bank
        ctx.globalCompositeOperation = 'source-over';
        const cloudCount = 9;
        for (let c = 0; c < cloudCount; c++) {
          const ca = (c / cloudCount) * Math.PI * 2 + life * 0.22;
          const cr = c === 0 ? 0 : r * (0.38 + (c % 2) * 0.24);
          const cx = Math.cos(ca) * cr;
          const cy = Math.sin(ca) * cr * 0.52 - 14;
          const puffR = r * (c === 0 ? 0.52 : 0.38) * (1 + Math.sin(life * 2.1 + c) * 0.08);

          const smokeGrad = ctx.createRadialGradient(
            cx - puffR * 0.22,
            cy - puffR * 0.25,
            puffR * 0.1,
            cx,
            cy,
            puffR
          );
          smokeGrad.addColorStop(0, 'rgba(248, 250, 252, 0.85)');
          smokeGrad.addColorStop(0.55, 'rgba(203, 213, 225, 0.68)');
          smokeGrad.addColorStop(0.85, 'rgba(100, 116, 139, 0.38)');
          smokeGrad.addColorStop(1, 'rgba(71, 85, 105, 0)');

          ctx.fillStyle = smokeGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, puffR, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
    }

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Renders thrown potions in the air, including ground shadow and 3D tumbling high-res bottle
 */
export function renderThrownPotionsAirModule(ctx: CanvasRenderingContext2D): void {
  if (activeThrownPotions.length === 0) return;
  ctx.save();

  for (let i = 0; i < activeThrownPotions.length; i++) {
    const p = activeThrownPotions[i];

    // 1. Dynamic Ground Shadow (ellipse on floor underneath the potion)
    const altitudeRatio = Math.max(0, 1 - p.arcZ / p.maxArcHeight);
    const shadowScale = 0.5 + altitudeRatio * 0.5;
    const shadowAlpha = 0.22 + altitudeRatio * 0.38;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(1, 0.5);
    ctx.globalAlpha = shadowAlpha;
    ctx.fillStyle = '#05070E';
    ctx.beginPath();
    ctx.arc(0, 0, 18 * p.scale * shadowScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Motion-Blur Ghost Trail of Spinning Bottle
    for (let tr = p.trailHistory.length - 1; tr >= 1; tr -= 2) {
      const node = p.trailHistory[tr];
      const trailAlpha = (1 - tr / p.trailHistory.length) * 0.22;
      ctx.save();
      ctx.translate(node.x, node.y - node.arcZ);
      ctx.rotate(node.angle);
      ctx.scale(p.scale * 0.9, p.scale * 0.9);
      ctx.globalAlpha = trailAlpha;
      const bottleSprite = getPaintedPotionBottleSprite(p.potionId);
      ctx.drawImage(bottleSprite, -24, -24, 48, 48);
      ctx.restore();
    }

    // 3. In-Air Bottle at (x, y - arcZ) with 3D End-over-End Tumbling Rotation
    const airX = p.x;
    const airY = p.y - p.arcZ;

    ctx.save();
    ctx.translate(airX, airY);
    ctx.rotate(p.spinAngle);
    ctx.scale(p.scale, p.scale);

    // Outer volumetric glow halo around the spinning bottle
    const glow = getGlowSprite(p.config.fluidColor, p.config.coreColor);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.42;
    ctx.drawImage(glow, -30, -30, 60, 60);
    ctx.restore();

    // Render custom uploaded PNG if present, otherwise render the high-res painted bottle sprite!
    if (p.config.userAssetImage && p.config.userAssetImage.complete && p.config.userAssetImage.naturalWidth > 0) {
      ctx.drawImage(p.config.userAssetImage, -26, -26, 52, 52);
    } else {
      const bottleSprite = getPaintedPotionBottleSprite(p.potionId);
      ctx.drawImage(bottleSprite, -26, -26, 52, 52);
    }

    ctx.restore();
  }

  ctx.restore();
}
