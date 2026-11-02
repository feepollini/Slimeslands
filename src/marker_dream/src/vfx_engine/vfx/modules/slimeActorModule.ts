// ============================================================================
// MODULE: 4 INTELLIGENT SEMI-SPHERICAL DROPLET SLIMES (AI, REACTIVE PHYSICS & RENDER)
// Autonomous combat, randomized 36-skill repertoire, reactive pancake flatten,
// and 0-HP Desperation Flee & Attacker Chase state
// ============================================================================

import { ELEMENTAL_PALETTES, VFX_PRESETS } from '../presets';
import {
  ElementalPaletteId,
  ShaderParams,
  SlimeActor,
  SlimeDirectionalSprites,
  SlimePersonality,
  SlimeSkillSlot,
  VfxPresetId,
  VfxPresetMeta,
  VfxTag,
} from '../types';
import { getGlowSprite } from '../core/mathLut';
import { getInstancedElementStamp } from '../core/instancedPool';
import {
  getGroundDecalTextureSprite,
  getProceduralCrystalSprite,
  getSphericalShieldTextureSprite,
  getVoronoiExplosionFlipbook,
  SphericalShieldStyle,
} from '../core/proceduralTextures';
import { detonateMeteorCrushLeapLanding } from './mobilityAndSupportModule';
import { startTreeChatSession } from './treeChatModule';
import {
  areSameSpecies,
  evaluateDialogueInitiationAffinity,
  getOrCreateDnaBond,
} from './treeChatProceduralStatsModule';
import { slimeVoiceEngine } from './slimeVoiceModule';
import { treeChatVoiceManager } from '../../extra_modules/TreeChatVoice';
import type { VfxEngine } from '../vfxEngine';

const SUPPORT_AND_DEFENSE_SKILLS: VfxPresetId[] = [
  'sanctuary_aura_heal',
  'celestial_mend_beam',
  'aegis_dome_shield',
  'berserk_overdrive_buff',
  'glacial_mirror_coat',
  'earthen_bulwark',
  'phoenix_rebirth_nova',
  'eden_overgrowth',
  'seraphic_ascension',
  'cryo_sphere_aegis',
  'magma_carapace_sphere',
  'hydro_bubble_sanctuary',
  'briar_thorn_dome',
  'void_event_barrier',
  'tempest_cyclone_shield',
  'astral_supernova_bastion',
  'runic_swords_sanctuary',
  'mystic_lotus_pool',
];

/**
 * Returns only the VFX presets matching the character's allowedTags.
 * If allowedTags is empty/undefined, returns all 48 VFX presets.
 */
export function getPresetsForAllowedTags(
  allowedTags?: VfxTag[]
): VfxPresetMeta[] {
  if (!allowedTags || allowedTags.length === 0) {
    return VFX_PRESETS;
  }
  const filtered = VFX_PRESETS.filter((p) =>
    p.tags.some((t) => allowedTags.includes(t))
  );
  return filtered.length > 0 ? filtered : VFX_PRESETS;
}

export function buildSkillLoadoutForTags(
  allowedTags?: VfxTag[],
  seedOffset = 0
): SlimeSkillSlot[] {
  const pool = getPresetsForAllowedTags(allowedTags);
  const slots: SlimeSkillSlot[] = [];
  for (let i = 0; i < 4; i++) {
    const meta = pool[(seedOffset * 5 + i * 3) % pool.length];
    slots.push({
      presetId: meta.id,
      cooldown: i * 0.4,
      maxCooldown: meta.cooldownSec,
    });
  }
  return slots;
}

export function getVisualsForClassTags(tags?: VfxTag[]): {
  color: string;
  coreColor: string;
  darkColor: string;
  defaultPalette: ElementalPaletteId;
  roleTitle: string;
} {
  const primaryTag = tags && tags.length > 0 ? tags[0] : undefined;
  switch (primaryTag) {
    case 'fogo':
      return {
        color: '#FF4500',
        coreColor: '#FFF7ED',
        darkColor: '#450A0A',
        defaultPalette: 'infernal_magma',
        roleTitle: `CLASSE: ${tags!.map((t) => t.toUpperCase()).join(' • ')}`,
      };
    case 'agua':
    case 'gelo':
      return {
        color: '#00D9FF',
        coreColor: '#F0F9FF',
        darkColor: '#082F49',
        defaultPalette: 'freljord_ice',
        roleTitle: `CLASSE: ${tags!.map((t) => t.toUpperCase()).join(' • ')}`,
      };
    case 'toxico':
    case 'planta':
      return {
        color: '#39FF14',
        coreColor: '#F7FEE7',
        darkColor: '#14532D',
        defaultPalette: 'toxic_venom',
        roleTitle: `CLASSE: ${tags!.map((t) => t.toUpperCase()).join(' • ')}`,
      };
    case 'luz':
    case 'cura':
    case 'buffs':
      return {
        color: '#FFD747',
        coreColor: '#FEFCE8',
        darkColor: '#422006',
        defaultPalette: 'celestial_gold',
        roleTitle: `CLASSE: ${tags!.map((t) => t.toUpperCase()).join(' • ')}`,
      };
    case 'trevas':
    case 'magia':
      return {
        color: '#C84BFF',
        coreColor: '#FAF5FF',
        darkColor: '#3B0764',
        defaultPalette: 'void_abyss',
        roleTitle: `CLASSE: ${tags!.map((t) => t.toUpperCase()).join(' • ')}`,
      };
    case 'terra':
      return {
        color: '#F59E0B',
        coreColor: '#FFFBEB',
        darkColor: '#451A03',
        defaultPalette: 'celestial_gold',
        roleTitle: `CLASSE: ${tags!.map((t) => t.toUpperCase()).join(' • ')}`,
      };
    case 'ar':
    case 'energia':
      return {
        color: '#38BDF8',
        coreColor: '#F0FDFA',
        darkColor: '#0F172A',
        defaultPalette: 'vergil_mirage',
        roleTitle: `CLASSE: ${tags!.map((t) => t.toUpperCase()).join(' • ')}`,
      };
    default:
      return {
        color: '#38BDF8',
        coreColor: '#FFFFFF',
        darkColor: '#0F172A',
        defaultPalette: 'hextech_arcane',
        roleTitle: 'CLASSE: MULTIELEMENTAL (TODAS)',
      };
  }
}

export function resolveEffectivePersonality(
  s: Pick<SlimeActor, 'personality' | 'allowedTags'>
): Exclude<SlimePersonality, 'auto'> {
  if (s.personality && s.personality !== 'auto') {
    return s.personality;
  }
  const tags = s.allowedTags || [];
  if (tags.includes('flecheiro') || tags.includes('ar')) {
    return 'flecheiro_kiter';
  }
  if (
    tags.includes('invocador') ||
    tags.includes('toxico') ||
    tags.includes('planta')
  ) {
    return 'invocador_enxame';
  }
  if (
    tags.includes('magia') ||
    tags.includes('luz') ||
    tags.includes('cura') ||
    tags.includes('gelo') ||
    tags.includes('agua')
  ) {
    return 'mago_artilheiro';
  }
  if (tags.includes('trevas') || tags.includes('energia')) {
    return 'assassino_flanco';
  }
  return 'berserker_frontal';
}

export function createCustomSlimeCharacter(options: {
  id?: string;
  name: string;
  team: 0 | 1;
  x: number;
  y: number;
  allowedTags: VfxTag[];
  personality?: SlimePersonality;
  customSprites?: SlimeDirectionalSprites;
}): SlimeActor {
  const vis = getVisualsForClassTags(options.allowedTags);
  return {
    id: options.id || `slime_custom_${Date.now()}_${Math.floor(Math.random() * 999)}`,
    name: options.name.toUpperCase(),
    roleTitle: vis.roleTitle,
    team: options.team,
    x: options.x,
    y: options.y,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    baseX: options.x,
    baseY: options.y,
    radius: 33,
    color: vis.color,
    coreColor: vis.coreColor,
    darkColor: vis.darkColor,
    defaultPalette: vis.defaultPalette,
    hp: 14000,
    maxHp: 14000,
    shieldHp: 0,
    maxShieldHp: 3500,
    isDesperate: false,
    desperateTimer: 0,
    lastAttackerId: null,
    sweatEmitTimer: 0,
    isLeaping: false,
    leapStartX: 0,
    leapStartY: 0,
    leapTargetX: 0,
    leapTargetY: 0,
    leapTimer: 0,
    leapDuration: 0.42,
    isDashing: false,
    dashTimer: 0,
    dashPoisonTrail: false,
    dashEmitTimer: 0,
    hitFlashTimer: 0,
    flattenTimer: 0,
    stunTimer: 0,
    frozenTimer: 0,
    shockTimer: 0,
    poisonTimer: 0,
    burnTimer: 0,
    lunarMarkTimer: 0,
    shieldBuffTimer: 0,
    mirrorCoatTimer: 0,
    berserkBuffTimer: 0,
    regenBuffTimer: 0,
    squashX: 1,
    squashY: 1,
    vSquash: 0,
    wobblePhase: Math.random() * Math.PI * 2,
    facingAngle: options.team === 0 ? 0 : Math.PI,
    dropletTilt: 0,
    skills: buildSkillLoadoutForTags(options.allowedTags, Math.floor(Math.random() * 12)),
    allowedTags: options.allowedTags,
    personality: options.personality || 'auto',
    tacticalState: 'reposicionando',
    kitePhaseTimer: 0.45,
    strafeDir: Math.random() < 0.5 ? 1 : -1,
    isCustomCharacter: true,
    customSprites: options.customSprites,
    aiDecisionTimer: 0.45,
    hopTimer: 0.25,
  };
}

export function createArenaSlimes(width: number, height: number): SlimeActor[] {
  const cx = width * 0.5;
  const cy = height * 0.47;
  const spreadX = Math.min(270, width * 0.24);
  const spreadY = Math.min(130, height * 0.17);

  return [
    {
      id: 'slime_player',
      name: 'HERÓI (VOCÊ)',
      roleTitle: '👑 CONTROLÁVEL COM WASD',
      team: 0,
      isPlayer: true,
      x: cx,
      y: cy + 40,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      baseX: cx,
      baseY: cy + 40,
      radius: 36,
      color: '#00E5FF',
      coreColor: '#F0FDFA',
      darkColor: '#083344',
      defaultPalette: 'hextech_arcane',
      hp: 18000,
      maxHp: 18000,
      shieldHp: 0,
      maxShieldHp: 4000,
      isDesperate: false,
      desperateTimer: 0,
      lastAttackerId: null,
      sweatEmitTimer: 0,
      isLeaping: false,
      leapStartX: 0,
      leapStartY: 0,
      leapTargetX: 0,
      leapTargetY: 0,
      leapTimer: 0,
      leapDuration: 0.42,
      isDashing: false,
      dashTimer: 0,
      dashPoisonTrail: false,
      dashEmitTimer: 0,
      hitFlashTimer: 0,
      flattenTimer: 0,
      stunTimer: 0,
      frozenTimer: 0,
      shockTimer: 0,
      poisonTimer: 0,
      burnTimer: 0,
      lunarMarkTimer: 0,
      shieldBuffTimer: 0,
      mirrorCoatTimer: 0,
      berserkBuffTimer: 0,
      regenBuffTimer: 0,
      squashX: 1,
      squashY: 1,
      vSquash: 0,
      wobblePhase: 0,
      facingAngle: 0,
      dropletTilt: 0,
      allowedTags: ['ar', 'magia', 'energia', 'fogo', 'gelo'],
      personality: 'berserker_frontal',
      tacticalState: 'caminhada_pacifica',
      kitePhaseTimer: 0.5,
      strafeDir: 1,
      skills: buildSkillLoadoutForTags(['ar', 'magia', 'energia', 'fogo', 'gelo'], 0),
      aiDecisionTimer: 0.35,
      hopTimer: 0,
    },
    {
      id: 'slime_ignis',
      name: 'IGNIS-REX',
      roleTitle: 'RUBI BERSERKER',
      team: 0,
      x: cx - spreadX,
      y: cy - spreadY,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      baseX: cx - spreadX,
      baseY: cy - spreadY,
      radius: 34,
      color: '#FF2A4B',
      coreColor: '#FFF0F3',
      darkColor: '#4C0519',
      defaultPalette: 'crimson_blood',
      hp: 14000,
      maxHp: 14000,
      shieldHp: 0,
      maxShieldHp: 3500,
      isDesperate: false,
      desperateTimer: 0,
      lastAttackerId: null,
      sweatEmitTimer: 0,
      isLeaping: false,
      leapStartX: 0,
      leapStartY: 0,
      leapTargetX: 0,
      leapTargetY: 0,
      leapTimer: 0,
      leapDuration: 0.42,
      isDashing: false,
      dashTimer: 0,
      dashPoisonTrail: false,
      dashEmitTimer: 0,
      hitFlashTimer: 0,
      flattenTimer: 0,
      stunTimer: 0,
      frozenTimer: 0,
      shockTimer: 0,
      poisonTimer: 0,
      burnTimer: 0,
      lunarMarkTimer: 0,
      shieldBuffTimer: 0,
      mirrorCoatTimer: 0,
      berserkBuffTimer: 0,
      regenBuffTimer: 0,
      squashX: 1,
      squashY: 1,
      vSquash: 0,
      wobblePhase: 0,
      facingAngle: 0,
      dropletTilt: 0,
      allowedTags: ['fogo'],
      personality: 'berserker_frontal',
      tacticalState: 'avancando',
      kitePhaseTimer: 0.5,
      strafeDir: 1,
      skills: buildSkillLoadoutForTags(['fogo'], 0),
      aiDecisionTimer: 0.35,
      hopTimer: 0,
    },
    {
      id: 'slime_aero',
      name: 'AERO-VEX',
      roleTitle: 'FLECHEIRO KITER • GELO & AR',
      team: 0,
      x: cx - spreadX * 0.85,
      y: cy + spreadY,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      baseX: cx - spreadX * 0.85,
      baseY: cy + spreadY,
      radius: 32,
      color: '#00D9FF',
      coreColor: '#ECFEFF',
      darkColor: '#083344',
      defaultPalette: 'vergil_mirage',
      hp: 13000,
      maxHp: 13000,
      shieldHp: 0,
      maxShieldHp: 3500,
      isDesperate: false,
      desperateTimer: 0,
      lastAttackerId: null,
      sweatEmitTimer: 0,
      isLeaping: false,
      leapStartX: 0,
      leapStartY: 0,
      leapTargetX: 0,
      leapTargetY: 0,
      leapTimer: 0,
      leapDuration: 0.42,
      isDashing: false,
      dashTimer: 0,
      dashPoisonTrail: false,
      dashEmitTimer: 0,
      hitFlashTimer: 0,
      flattenTimer: 0,
      stunTimer: 0,
      frozenTimer: 0,
      shockTimer: 0,
      poisonTimer: 0,
      burnTimer: 0,
      lunarMarkTimer: 0,
      shieldBuffTimer: 0,
      mirrorCoatTimer: 0,
      berserkBuffTimer: 0,
      regenBuffTimer: 0,
      squashX: 1,
      squashY: 1,
      vSquash: 0,
      wobblePhase: 1.6,
      facingAngle: 0,
      dropletTilt: 0,
      allowedTags: ['flecheiro', 'gelo', 'ar'],
      personality: 'flecheiro_kiter',
      tacticalState: 'reposicionando',
      kitePhaseTimer: 0.45,
      strafeDir: -1,
      skills: buildSkillLoadoutForTags(['flecheiro', 'gelo', 'ar'], 3),
      aiDecisionTimer: 0.55,
      hopTimer: 0.2,
    },
    {
      id: 'slime_tox',
      name: 'TOX-NOX',
      roleTitle: 'INVOCADOR DE ENXAMES • PLANTA & TÓXICO',
      team: 1,
      x: cx + spreadX,
      y: cy - spreadY,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      baseX: cx + spreadX,
      baseY: cy - spreadY,
      radius: 34,
      color: '#39FF14',
      coreColor: '#F7FEE7',
      darkColor: '#14532D',
      defaultPalette: 'toxic_venom',
      hp: 14000,
      maxHp: 14000,
      shieldHp: 0,
      maxShieldHp: 3500,
      isDesperate: false,
      desperateTimer: 0,
      lastAttackerId: null,
      sweatEmitTimer: 0,
      isLeaping: false,
      leapStartX: 0,
      leapStartY: 0,
      leapTargetX: 0,
      leapTargetY: 0,
      leapTimer: 0,
      leapDuration: 0.42,
      isDashing: false,
      dashTimer: 0,
      dashPoisonTrail: false,
      dashEmitTimer: 0,
      hitFlashTimer: 0,
      flattenTimer: 0,
      stunTimer: 0,
      frozenTimer: 0,
      shockTimer: 0,
      poisonTimer: 0,
      burnTimer: 0,
      lunarMarkTimer: 0,
      shieldBuffTimer: 0,
      mirrorCoatTimer: 0,
      berserkBuffTimer: 0,
      regenBuffTimer: 0,
      squashX: 1,
      squashY: 1,
      vSquash: 0,
      wobblePhase: 3.1,
      facingAngle: Math.PI,
      dropletTilt: 0,
      allowedTags: ['invocador', 'toxico', 'planta'],
      personality: 'invocador_enxame',
      tacticalState: 'invocando',
      kitePhaseTimer: 0.5,
      strafeDir: 1,
      skills: buildSkillLoadoutForTags(['invocador', 'toxico', 'planta'], 6),
      aiDecisionTimer: 0.55,
      hopTimer: 0.4,
    },
    {
      id: 'slime_astra',
      name: 'ASTRA-LUX',
      roleTitle: 'MAGO ARTILHEIRO • LUZ & CURA',
      team: 1,
      x: cx + spreadX * 0.85,
      y: cy + spreadY,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      baseX: cx + spreadX * 0.85,
      baseY: cy + spreadY,
      radius: 33,
      color: '#C84BFF',
      coreColor: '#FAF5FF',
      darkColor: '#3B0764',
      defaultPalette: 'void_abyss',
      hp: 13500,
      maxHp: 13500,
      shieldHp: 0,
      maxShieldHp: 3500,
      isDesperate: false,
      desperateTimer: 0,
      lastAttackerId: null,
      sweatEmitTimer: 0,
      isLeaping: false,
      leapStartX: 0,
      leapStartY: 0,
      leapTargetX: 0,
      leapTargetY: 0,
      leapTimer: 0,
      leapDuration: 0.42,
      isDashing: false,
      dashTimer: 0,
      dashPoisonTrail: false,
      dashEmitTimer: 0,
      hitFlashTimer: 0,
      flattenTimer: 0,
      stunTimer: 0,
      frozenTimer: 0,
      shockTimer: 0,
      poisonTimer: 0,
      burnTimer: 0,
      lunarMarkTimer: 0,
      shieldBuffTimer: 0,
      mirrorCoatTimer: 0,
      berserkBuffTimer: 0,
      regenBuffTimer: 0,
      squashX: 1,
      squashY: 1,
      vSquash: 0,
      wobblePhase: 4.7,
      facingAngle: Math.PI,
      dropletTilt: 0,
      allowedTags: ['luz', 'magia', 'cura', 'buffs'],
      personality: 'mago_artilheiro',
      tacticalState: 'reposicionando',
      kitePhaseTimer: 0.6,
      strafeDir: -1,
      skills: buildSkillLoadoutForTags(['luz', 'magia', 'cura', 'buffs'], 9),
      aiDecisionTimer: 0.9,
      hopTimer: 0.6,
    },
  ];
}

export function updateSlimesAIAndPhysicsModule(
  engine: VfxEngine,
  dt: number,
  simulationEnabled: boolean,
  params: ShaderParams
) {
  const slimes = engine.slimes;
  const w = engine.getWidth();
  const h = engine.getHeight();
  const marginX = 75;
  const minY = 85;
  const maxY = h - 135;

  // Automatically & randomly link ALL generated audios in the Fish Audio Gallery to each NPC's ID
  treeChatVoiceManager.syncGalleryVoicesForSlimes(slimes);

  for (let i = 0; i < slimes.length; i++) {
    const s = slimes[i];
    s.wobblePhase += dt * (s.berserkBuffTimer > 0 ? 11 : 7);

    // Tick spoken gallery audio emote timer in both combat and exploration modes
    if (s.socialInteractTimer && s.socialInteractTimer > 0) {
      s.socialInteractTimer = Math.max(0, s.socialInteractTimer - dt);
      if (s.socialInteractTimer <= 0 && !s.treeChatSessionId && s.socialEmote?.startsWith('💬')) {
        s.socialEmote = null;
      }
    }
    if (s.relationshipCapsule) {
      s.relationshipCapsule.timer -= dt;
      if (s.relationshipCapsule.timer <= 0) {
        s.relationshipCapsule = null;
      }
    }

    // 1. Update Status & Buff Timers
    if (s.hitFlashTimer > 0) s.hitFlashTimer = Math.max(0, s.hitFlashTimer - dt);
    if (s.flattenTimer > 0) s.flattenTimer = Math.max(0, s.flattenTimer - dt);
    if (s.stunTimer > 0) s.stunTimer = Math.max(0, s.stunTimer - dt);
    if (s.frozenTimer > 0) s.frozenTimer = Math.max(0, s.frozenTimer - dt);
    if (s.shockTimer > 0) s.shockTimer = Math.max(0, s.shockTimer - dt);
    if (s.lunarMarkTimer > 0) s.lunarMarkTimer = Math.max(0, s.lunarMarkTimer - dt);
    if (s.shieldHp > 0 && s.shieldBuffTimer <= 0) {
      s.shieldBuffTimer = 5.0;
    }
    if (s.shieldBuffTimer > 0) {
      s.shieldBuffTimer = Math.max(0, s.shieldBuffTimer - dt);
      if (s.shieldBuffTimer <= 0) s.shieldHp = 0;
    }
    if (s.mirrorCoatTimer > 0) s.mirrorCoatTimer = Math.max(0, s.mirrorCoatTimer - dt);
    if (s.berserkBuffTimer > 0) s.berserkBuffTimer = Math.max(0, s.berserkBuffTimer - dt);

    // Poison & Burn DoT visual bubbles
    if (s.poisonTimer > 0) {
      s.poisonTimer = Math.max(0, s.poisonTimer - dt);
      if (Math.random() < dt * 9) {
        engine.spawnParticle({
          x: s.x + (Math.random() - 0.5) * s.radius,
          y: s.y - Math.random() * s.radius,
          z: s.z + 10,
          vx: (Math.random() - 0.5) * 20,
          vy: -45 - Math.random() * 40,
          vz: 20,
          size: 5.5,
          color: '#39FF14',
          coreColor: '#FFFFFF',
          alpha: 1,
          life: 0,
          maxLife: 0.4,
          drag: 0.94,
          gravity: -25,
          bounce: 0,
          floorY: 9999,
          type: 'acid_bubble',
          rotation: 0,
          vRot: 0,
          stretch: 1,
          seed: i,
        });
      }
    }

    if (s.burnTimer > 0) {
      s.burnTimer = Math.max(0, s.burnTimer - dt);
      if (Math.random() < dt * 10) {
        engine.spawnParticle({
          x: s.x + (Math.random() - 0.5) * s.radius,
          y: s.y - Math.random() * s.radius,
          z: s.z + 10,
          vx: (Math.random() - 0.5) * 30,
          vy: -75 - Math.random() * 60,
          vz: 35,
          size: 7,
          color: '#FF7700',
          coreColor: '#FFFFF0',
          alpha: 1,
          life: 0,
          maxLife: 0.35,
          drag: 0.94,
          gravity: -50,
          bounce: 0,
          floorY: 9999,
          type: 'flame_tongue',
          rotation: 0,
          vRot: 0,
          stretch: 1.6,
          seed: i,
        });
      }
    }

    if (s.regenBuffTimer > 0) {
      s.regenBuffTimer = Math.max(0, s.regenBuffTimer - dt);
      s.hp = Math.min(s.maxHp, s.hp + 950 * dt);
    }

    // 2. Tick Skill Cooldowns (Faster during Berserk Overdrive)
    const cdRate = s.berserkBuffTimer > 0 ? 1.65 : 1.0;
    for (let k = 0; k < s.skills.length; k++) {
      if (s.skills[k].cooldown > 0) {
        s.skills[k].cooldown = Math.max(0, s.skills[k].cooldown - dt * cdRate);
      }
    }

    // 3. Handle Active Parabolic Stun Leap (Meteor Crush Leap)
    if (s.isLeaping) {
      s.leapTimer += dt;
      const u = Math.min(1, s.leapTimer / s.leapDuration);
      s.x = s.leapStartX + (s.leapTargetX - s.leapStartX) * u;
      s.y = s.leapStartY + (s.leapTargetY - s.leapStartY) * u;
      s.z = Math.sin(u * Math.PI) * 235;
      s.squashX = u < 0.5 ? 0.72 : 1.25;
      s.squashY = u < 0.5 ? 1.42 : 0.78;

      if (u >= 1) {
        s.isLeaping = false;
        s.z = 0;
        s.squashX = 1.65;
        s.squashY = 0.45;
        detonateMeteorCrushLeapLanding(
          engine,
          s.x,
          s.y,
          s.leapPalette || ELEMENTAL_PALETTES[3],
          params.effectScale * 0.7,
          params.particleMultiplier,
          params,
          s.id
        );
      }
      continue;
    }

    // 4. Handle 0-HP DESPERATION FLEE STATE (Foge correndo do atacante até regenerar PV!)
    if (s.isDesperate) {
      // Regenerate HP while desperately fleeing
      s.hp = Math.min(s.maxHp, s.hp + s.maxHp * 0.22 * dt);

      // Emit panic sweat droplets while fleeing
      s.sweatEmitTimer -= dt;
      if (s.sweatEmitTimer <= 0) {
        s.sweatEmitTimer = 0.11;
        engine.spawnParticle({
          x: s.x + (Math.random() - 0.5) * 24,
          y: s.y - s.radius * 0.9,
          z: s.z + 12,
          vx: -s.vx * 0.35 + (Math.random() - 0.5) * 70,
          vy: -95 - Math.random() * 55,
          vz: 60,
          size: 5.5,
          color: '#38BDF8',
          coreColor: '#FFFFFF',
          alpha: 1,
          life: 0,
          maxLife: 0.36,
          drag: 0.94,
          gravity: 380,
          bounce: 0,
          floorY: 9999,
          type: 'sweat_drop',
          rotation: -Math.PI / 2,
          vRot: 0,
          stretch: 1.5,
          seed: i,
        });
      }

      // Find the attacker (or nearest enemy) and run away in panic!
      const attacker =
        slimes.find((other) => other.id === s.lastAttackerId) ||
        slimes.find((other) => other.team !== s.team);

      if (attacker && s.frozenTimer <= 0 && s.stunTimer <= 0) {
        let fleeDx = s.x - attacker.x;
        let fleeDy = s.y - attacker.y;
        const dist = Math.hypot(fleeDx, fleeDy) || 1;
        fleeDx /= dist;
        fleeDy /= dist;

        // Corner avoidance steering so desperate slime loops around the arena instead of getting stuck
        const centerPullX = (w * 0.5 - s.x) / (w * 0.5);
        const centerPullY = (h * 0.46 - s.y) / (h * 0.46);
        const steerX = fleeDx * 0.72 + centerPullY * 0.55;
        const steerY = fleeDy * 0.72 - centerPullX * 0.55;
        const steerLen = Math.hypot(steerX, steerY) || 1;

        const panicSpeed = 295;
        s.vx += (steerX / steerLen) * panicSpeed * 4.5 * dt;
        s.vy += (steerY / steerLen) * panicSpeed * 4.5 * dt;
        s.facingAngle = Math.atan2(s.vy, s.vx);

        // Frantic little hops while running away
        if (s.z <= 0) {
          s.vz = 155;
          s.squashX = 0.78;
          s.squashY = 1.32;
        }
      }

      // Recovery Burst when HP reaches 100%!
      if (s.hp >= s.maxHp) {
        s.hp = s.maxHp;
        s.isDesperate = false;
        s.lastAttackerId = null;
        s.shieldHp = 1800;
        s.shieldBuffTimer = 2.5;
        const pal =
          ELEMENTAL_PALETTES.find((p) => p.id === s.defaultPalette) ||
          ELEMENTAL_PALETTES[0];
        engine.shockRings.push({
          x: s.x,
          y: s.y,
          radius: 12,
          maxRadius: 150,
          thickness: 12,
          life: 0,
          maxLife: 0.38,
          palette: pal,
          perspectiveY: 0.55,
          rotation: 0,
        });
        engine.spawnFloatingText(
          s.x,
          s.y - s.radius - 24,
          'SEGUNDO FÔLEGO!',
          'PV RESTAURADO 100%',
          '#39FF14'
        );
      }
    } else if (
      (simulationEnabled || (s.treeChatBrawlTimer && s.treeChatBrawlTimer > 0)) &&
      s.frozenTimer <= 0 &&
      s.stunTimer <= 0 &&
      s.flattenTimer <= 0
    ) {
      // Decrement TreeChat Brawl Timer if this fight was triggered by 100% conversation tension
      if (s.treeChatBrawlTimer && s.treeChatBrawlTimer > 0) {
        s.treeChatBrawlTimer = Math.max(0, s.treeChatBrawlTimer - dt);
        if (s.treeChatBrawlTimer <= 0) {
          s.treeChatBrawlOpponentId = null;
          s.tacticalState = 'caminhada_pacifica';
          s.socialEmote = '😤 FIM DA BRIGA';
        }
      }

      // 5. Intelligent Combat AI & Chasing Desperate Targets (or TreeChat Brawl Opponent!)
      if (s.isPlayer) {
        // ===================================================================
        // 5A. WASD PLAYER SLIME LOCOMOTION & RESPONSIVE JELLY PHYSICS
        // ===================================================================
        const pInput = engine.playerInput;
        let moveX = 0;
        let moveY = 0;
        if (pInput.left) moveX -= 1;
        if (pInput.right) moveX += 1;
        if (pInput.up) moveY -= 1;
        if (pInput.down) moveY += 1;

        const isMoving = moveX !== 0 || moveY !== 0;
        if (isMoving) {
          const moveLen = Math.hypot(moveX, moveY) || 1;
          const dirX = moveX / moveLen;
          const dirY = moveY / moveLen;
          const speed = pInput.sprint ? 340 : 230;
          s.vx += dirX * speed * 8.5 * dt;
          s.vy += dirY * speed * 8.5 * dt;
          s.facingAngle = Math.atan2(dirY, dirX);
          s.walkCyclePhase = (s.walkCyclePhase ?? 0) + dt * 14;
          s.dropletTilt = dirX * 0.22;
          s.squashX = 1 + Math.sin(s.walkCyclePhase) * 0.14;
          s.squashY = 1 - Math.sin(s.walkCyclePhase) * 0.14;

          if (Math.random() < dt * 10) {
            engine.spawnParticle({
              x: s.x + (Math.random() - 0.5) * 16,
              y: s.y + s.radius * 0.35,
              z: 2,
              vx: -dirX * 25 + (Math.random() - 0.5) * 20,
              vy: -dirY * 25 + (Math.random() - 0.5) * 20,
              vz: 12 + Math.random() * 15,
              size: 4.5,
              color: s.color,
              coreColor: s.coreColor,
              alpha: 0.85,
              life: 0,
              maxLife: 0.45,
              drag: 0.92,
              gravity: 120,
              bounce: 0.4,
              floorY: s.y + s.radius * 0.4,
              type: 'slime_droplet',
              rotation: 0,
              vRot: 0,
              stretch: 1,
              seed: Math.floor(Math.random() * 999),
            });
          }
        }
        s.vx *= Math.pow(0.008, dt);
        s.vy *= Math.pow(0.008, dt);
        s.z = Math.max(0, s.z + s.vz * dt);
        if (s.z > 0) s.vz -= 680 * dt;
        else { s.z = 0; s.vz = 0; }
      } else {
        const brawlEnemy = s.treeChatBrawlOpponentId
          ? slimes.find((other) => other.id === s.treeChatBrawlOpponentId && !other.isDesperate)
          : undefined;
        const desperateEnemy = slimes.find(
          (other) => other.team !== s.team && other.isDesperate
        );
        const enemies = slimes.filter((other) => other.team !== s.team);
        let targetEnemy = brawlEnemy || desperateEnemy || enemies[0];
        if (!brawlEnemy && !desperateEnemy && enemies.length > 1) {
          // Pick closest enemy
          let bestDist = Infinity;
          for (let e = 0; e < enemies.length; e++) {
            const d = Math.hypot(enemies[e].x - s.x, enemies[e].y - s.y);
            if (d < bestDist) {
              bestDist = d;
              targetEnemy = enemies[e];
            }
          }
        }

      if (targetEnemy) {
        const dx = targetEnemy.x - s.x;
        const dy = targetEnemy.y - s.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = dx / dist;
        const ny = dy / dist;

        const personality = resolveEffectivePersonality(s);
        s.kitePhaseTimer = (s.kitePhaseTimer ?? 0.5) - dt;
        if (!s.strafeDir) s.strafeDir = i % 2 === 0 ? 1 : -1;

        // Check how fast the enemy is advancing toward this character
        const enemyApproachSpeed = -(targetEnemy.vx * nx + targetEnemy.vy * ny);

        // Corner/wall avoidance vector so kiting characters curve smoothly around the arena
        const centerPullX = (w * 0.5 - s.x) / (w * 0.45);
        const centerPullY = (h * 0.45 - s.y) / (h * 0.42);

        let allowCastingNow = true;

        if (desperateEnemy && personality === 'berserker_frontal') {
          s.tacticalState = 'avancando';
          s.facingAngle = Math.atan2(dy, dx);
          const chaseSpeed = 255 * (s.berserkBuffTimer > 0 ? 1.3 : 1);
          s.vx += nx * chaseSpeed * 3.8 * dt;
          s.vy += ny * chaseSpeed * 3.8 * dt;
        } else if (
          personality === 'flecheiro_kiter' ||
          personality === 'invocador_enxame' ||
          personality === 'mago_artilheiro'
        ) {
          // ===================================================================
          // RANGED KITER / ARCHER / SWARM SUMMONER PERSONALITY:
          // 1. If enemy is too close OR charging toward us -> RUN AWAY until safe distance!
          // 2. Once at safe distance -> alternate REPOSITION -> STOP & SHOOT -> REPOSITION!
          // ===================================================================
          const safeDist =
            personality === 'flecheiro_kiter'
              ? 285
              : personality === 'invocador_enxame'
              ? 265
              : 255;
          const panicAlertDist = safeDist + 65;

          const enemyChargingUs =
            dist < safeDist || (dist < panicAlertDist && enemyApproachSpeed > 42);

          if (enemyChargingUs) {
            // RETREAT / KITE STATE: Run away until gaining sufficient distance!
            s.tacticalState = 'recuando_kite';
            const fleeX = -nx * 0.78 + centerPullY * 0.45 * s.strafeDir + centerPullX * 0.35;
            const fleeY = -ny * 0.78 - centerPullX * 0.45 * s.strafeDir + centerPullY * 0.35;
            const fleeLen = Math.hypot(fleeX, fleeY) || 1;
            const kiteSpeed = personality === 'flecheiro_kiter' ? 295 : 265;

            s.vx += (fleeX / fleeLen) * kiteSpeed * 4.2 * dt;
            s.vy += (fleeY / fleeLen) * kiteSpeed * 4.2 * dt;
            // Face the retreat direction while running away!
            s.facingAngle = Math.atan2(s.vy, s.vx);

            // Hold shots while sprinting away, UNLESS enemy is right on top of us (emergency peel shot!)
            allowCastingNow = dist < 145 && s.aiDecisionTimer <= -0.25;
            s.kitePhaseTimer = 0.28; // As soon as we reach safe distance, we'll be ready to aim & fire!
          } else {
            // Safe distance achieved! Cycle: REPOSITION -> AIM & SHOOT -> REPOSITION
            if (s.kitePhaseTimer <= 0) {
              if (s.tacticalState === 'reposicionando') {
                s.tacticalState =
                  personality === 'invocador_enxame' ? 'invocando' : 'mirando_disparo';
                s.kitePhaseTimer = 0.38;
              } else {
                s.tacticalState = 'reposicionando';
                s.kitePhaseTimer = 0.55 + Math.random() * 0.25;
                s.strafeDir = -s.strafeDir;
              }
            }

            if (s.tacticalState === 'reposicionando') {
              // Step to a new firing angle while maintaining long range
              const idealRange = safeDist + 45;
              const rangeForce = (dist - idealRange) * 1.6;
              const perpX = -ny * s.strafeDir;
              const perpY = nx * s.strafeDir;
              const moveX = nx * rangeForce + perpX * 155 + centerPullX * 45;
              const moveY = ny * rangeForce + perpY * 155 + centerPullY * 45;
              s.vx += moveX * dt * 2.8;
              s.vy += moveY * dt * 2.8;
              s.facingAngle = Math.atan2(s.vy, s.vx);
              allowCastingNow = false;
            } else {
              // 'mirando_disparo' or 'invocando': Plant feet, face target enemy, and FIRE!
              s.vx *= Math.pow(0.02, dt);
              s.vy *= Math.pow(0.02, dt);
              s.facingAngle = Math.atan2(dy, dx);
              allowCastingNow = true;
            }
          }
        } else if (personality === 'assassino_flanco') {
          // Hit & Run Flanker: Dart in when skills ready, disengage out when on cooldown
          const hasReadySkill = s.skills.some((sk) => sk.cooldown <= 0);
          const perpX = -ny * s.strafeDir;
          const perpY = nx * s.strafeDir;
          if (hasReadySkill && s.aiDecisionTimer <= 0.15) {
            s.tacticalState = 'avancando';
            s.vx += (nx * 240 + perpX * 110) * dt * 3.4;
            s.vy += (ny * 240 + perpY * 110) * dt * 3.4;
            s.facingAngle = Math.atan2(dy, dx);
            allowCastingNow = dist < 240;
          } else {
            s.tacticalState = 'recuando_kite';
            const rangeForce = (dist - 270) * 1.8;
            s.vx += (nx * rangeForce + perpX * 165) * dt * 3.0;
            s.vy += (ny * rangeForce + perpY * 165) * dt * 3.0;
            s.facingAngle = Math.atan2(s.vy, s.vx);
            allowCastingNow = false;
          }
        } else {
          // 'berserker_frontal': Aggressive frontline brawler that chases down kiters using procedural angular surround slot so 10+ brawlers encircle rather than stacking
          s.tacticalState = 'avancando';
          s.facingAngle = Math.atan2(dy, dx);
          const dna = getProceduralActorDna(s);
          const slotAngle = ((dna % 360) * Math.PI) / 180;
          const surroundRadius = 118 + (dna % 35);
          const slotTargetX = targetEnemy.x + Math.cos(slotAngle) * surroundRadius;
          const slotTargetY = targetEnemy.y + Math.sin(slotAngle) * surroundRadius * 0.78;
          const sdx = slotTargetX - s.x;
          const sdy = slotTargetY - s.y;
          const sDist = Math.hypot(sdx, sdy) || 1;
          const perpX = -ny * s.strafeDir;
          const perpY = nx * s.strafeDir;
          s.vx += ((sdx / sDist) * Math.min(260, sDist * 2.4) + perpX * 55) * dt * 2.8;
          s.vy += ((sdy / sDist) * Math.min(260, sDist * 2.4) + perpY * 55) * dt * 2.8;
          allowCastingNow = true;
        }

        // Subtle same-tag tactical cohesion & anti-clumping steering during combat
        for (let a = 0; a < slimes.length; a++) {
          if (a === i) continue;
          const peer = slimes[a];
          const pdx = peer.x - s.x;
          const pdy = peer.y - s.y;
          const pDist = Math.hypot(pdx, pdy) || 1;
          const personalSpace = getAssetCollisionRadius(s) + getAssetCollisionRadius(peer) + 34;
          if (pDist < personalSpace) {
            const repel = ((personalSpace - pDist) / personalSpace) * 340;
            s.vx -= (pdx / pDist) * repel * dt;
            s.vy -= (pdy / pDist) * repel * dt;
          }
        }

        // Bouncy slime hop locomotion (only when moving)
        s.hopTimer -= dt;
        if (s.hopTimer <= 0 && s.z <= 0 && Math.hypot(s.vx, s.vy) > 25) {
          s.hopTimer = 0.42 + Math.random() * 0.25;
          s.vz = 130;
          s.squashX = 0.86;
          s.squashY = 1.18;
        }

        // AI Skill Decision: Cast strictly from this character's allowedTags class repertoire!
        s.aiDecisionTimer -= dt;
        if (s.aiDecisionTimer <= 0 && allowCastingNow) {
          const readySlots = s.skills.filter((sk) => sk.cooldown <= 0);
          if (readySlots.length > 0) {
            const allowedPool = getPresetsForAllowedTags(s.allowedTags);
            const allowedIds = new Set(allowedPool.map((p) => p.id));

            const chosenSlot =
              readySlots[Math.floor(Math.random() * readySlots.length)];

            let presetToCast: VfxPresetId = allowedIds.has(chosenSlot.presetId)
              ? chosenSlot.presetId
              : allowedPool[Math.floor(Math.random() * allowedPool.length)].id;

            // Check if ally is injured or desperate -> override with a support skill ONLY if it also matches allowedTags
            const injuredAlly = slimes.find(
              (ally) =>
                ally.team === s.team &&
                (ally.isDesperate || ally.hp < ally.maxHp * 0.55)
            );
            if (injuredAlly && Math.random() < 0.42) {
              const matchingSupport = SUPPORT_AND_DEFENSE_SKILLS.filter((id) =>
                allowedIds.has(id)
              );
              if (matchingSupport.length > 0) {
                presetToCast =
                  matchingSupport[
                    Math.floor(Math.random() * matchingSupport.length)
                  ];
              }
            }

            const presetMeta =
              VFX_PRESETS.find((p) => p.id === presetToCast) || allowedPool[0];
            const pal =
              ELEMENTAL_PALETTES.find(
                (p) =>
                  p.id ===
                  (Math.random() < 0.72
                    ? presetMeta.defaultPalette
                    : s.defaultPalette)
              ) || ELEMENTAL_PALETTES[0];

            // Lock facing angle onto target enemy at the moment of firing!
            s.facingAngle = Math.atan2(dy, dx);

            engine.triggerPresetFromCaster(
              s,
              presetToCast,
              targetEnemy.x,
              targetEnemy.y,
              pal,
              params
            );

            // Rotate a brand-new random skill strictly from this character's allowedTags pool!
            const randomNextMeta =
              allowedPool[Math.floor(Math.random() * allowedPool.length)];
            chosenSlot.presetId = randomNextMeta.id;
            chosenSlot.maxCooldown = randomNextMeta.cooldownSec;
            chosenSlot.cooldown = randomNextMeta.cooldownSec;

            // Immediately transition kiter back to 'reposicionando' after firing a shot!
            if (
              personality === 'flecheiro_kiter' ||
              personality === 'invocador_enxame' ||
              personality === 'mago_artilheiro'
            ) {
              s.tacticalState = 'reposicionando';
              s.kitePhaseTimer = 0.52 + Math.random() * 0.25;
              s.strafeDir = -(s.strafeDir || 1);
            }

            s.aiDecisionTimer = 0.68 + Math.random() * 0.48;
          } else {
            s.aiDecisionTimer = 0.2;
          }
        }
      }
    }
    } else if (!simulationEnabled) {
      // =========================================================================
      // 5B. SIMULAÇÃO OFF: Descoberta Procedural de Regiões, Autonomia de DNA & Vontade Elaborada de Conversar (TreeChat)
      // =========================================================================
      s.isDesperate = false;
      s.hp = Math.min(s.maxHp, s.hp + 1500 * dt);
      const dna = getProceduralActorDna(s);

      // Procedural DNA personality traits for exploration vs. socializing
      const sociabilityTrait = 0.35 + ((dna % 65) / 100); // 0.35 (lone explorer) to 1.0 (extrovert)
      const minRegionsToExplore = 2 + (dna % 2); // Must explore at least 2-3 regions before wanting to chat
      const rhythmPhase = (dna % 314) * 0.02;

      // Initialize elaborate social desire LOW so NPCs NEVER auto-chat immediately; they explore first!
      if (s.socialDesire === undefined) {
        s.socialDesire = 6 + (dna % 16);
        s.regionsExploredSinceLastChat = 0;
        s.socialCooldownTimer = 7.5 + (dna % 6);
      }

      if (s.socialCooldownTimer && s.socialCooldownTimer > 0) {
        s.socialCooldownTimer = Math.max(0, s.socialCooldownTimer - dt);
      }
      if (s.discoverySparkTimer && s.discoverySparkTimer > 0) {
        s.discoverySparkTimer = Math.max(0, s.discoverySparkTimer - dt);
      }

      // Detect current 3x3 world region sector and track procedural discovery
      const col = Math.max(0, Math.min(2, Math.floor((s.x / Math.max(1, w)) * 3)));
      const row = Math.max(0, Math.min(2, Math.floor((s.y / Math.max(1, h)) * 3)));
      const regIdx = row * 3 + col;
      const regMeta = ARENA_REGIONS[regIdx] || ARENA_REGIONS[4];
      const visitedMask = s.visitedRegionsMask ?? 0;

      if (s.currentRegionIndex !== regIdx) {
        const hadPreviousRegion = s.currentRegionIndex !== undefined;
        s.currentRegionIndex = regIdx;
        s.currentRegionName = regMeta.name;
        const isFirstVisit = (visitedMask & (1 << regIdx)) === 0;
        s.visitedRegionsMask = visitedMask | (1 << regIdx);
        if ((s.visitedRegionsMask & 0x1ff) === 0x1ff) {
          s.visitedRegionsMask = 1 << regIdx;
        }
        if (hadPreviousRegion) {
          s.regionsExploredSinceLastChat = (s.regionsExploredSinceLastChat ?? 0) + 1;
          // Discovering a new region fuels their desire to share travel stories!
          const discoveryBoost = isFirstVisit ? 16 + (dna % 8) : 9 + (dna % 5);
          s.socialDesire = Math.min(100, (s.socialDesire ?? 0) + discoveryBoost);
        }
        if (isFirstVisit) {
          s.discoverySparkTimer = 2.2;
        }
      }

      // If this NPC is currently inside an active TreeChat conversation, treeChatModule drives their turn!
      if (s.treeChatSessionId) {
        s.tacticalState = 'interacao_social';
      } else {
        s.tacticalState = 'caminhada_pacifica';

        // Elaborate multi-factor Social Desire buildup while exploring the world:
        // 1. Individual DNA biorhythm
        const bioWave = 0.65 + 0.35 * Math.sin(performance.now() * 0.0008 + rhythmPhase);
        let desireGainRate = (1.6 + sociabilityTrait * 2.1) * bioWave;

        // 2. Biome Elemental Resonance (feels inspired in regions matching their allowedTags)
        const myTags = s.allowedTags || [];
        let biomeMatches = 0;
        for (let t = 0; t < myTags.length; t++) {
          if (regMeta.tags.includes(myTags[t])) biomeMatches++;
        }
        if (biomeMatches > 0) {
          desireGainRate += biomeMatches * 1.4;
        }

        // 3. Proximity resonance with same-species (same asset) or bonded peers while walking
        for (let j = 0; j < slimes.length; j++) {
          if (j === i) continue;
          const peer = slimes[j];
          if (peer.isPlayer) continue;
          const d = Math.hypot(peer.x - s.x, peer.y - s.y);
          if (d < 360) {
            const aff = computeTagAffinity(s, peer);
            const sameSpec = areSameSpecies(s, peer);
            const bond = getOrCreateDnaBond(s, peer);
            if (sameSpec) {
              desireGainRate += 4.2; // Same-species (same asset) slimes bond much faster!
            } else if (aff.score >= 2 || bond.affinity >= 20 || bond.romance >= 20) {
              desireGainRate += 2.8;
            }
          }
        }

        s.socialDesire = Math.min(100, (s.socialDesire ?? 0) + desireGainRate * dt);

        const exploredEnough =
          (s.regionsExploredSinceLastChat ?? 0) >= minRegionsToExplore;
        const readyToChat =
          !s.isPlayer &&
          exploredEnough &&
          (s.socialDesire ?? 0) >= 76 &&
          (!s.socialCooldownTimer || s.socialCooldownTimer <= 0);

        s.socialEmote =
          s.discoverySparkTimer && s.discoverySparkTimer > 0 && s.currentRegionName
            ? `🗺️ ${s.currentRegionName}`
            : null;

        // Only seek a TreeChat partner when this NPC has explored enough regions AND built up high socialDesire!
        // Strictly NPC-to-NPC only (never initiate with the player!)
        if (readyToChat) {
          let bestCandidate: SlimeActor | null = null;
          let bestMatchScore = -1;

          for (let j = 0; j < slimes.length; j++) {
            const other = slimes[j];
            if (
              other.id === s.id ||
              other.isPlayer ||
              other.treeChatSessionId ||
              (other.treeChatBrawlTimer && other.treeChatBrawlTimer > 0) ||
              (other.socialCooldownTimer && other.socialCooldownTimer > 0) ||
              (other.socialDesire ?? 0) < 42
            ) {
              continue;
            }
            const d = Math.hypot(other.x - s.x, other.y - s.y);
            const detectRange =
              getAssetCollisionRadius(s) + getAssetCollisionRadius(other) + 145;
            if (d < detectRange) {
              // Earned procedural dialogue affinity evaluation (stats, debuffs, exploration pride, archetypes)
              const aff = evaluateDialogueInitiationAffinity(s, other);
              if (aff.canInitiate && aff.matchScore > bestMatchScore) {
                bestMatchScore = aff.matchScore;
                bestCandidate = other;
              }
            }
          }

          // Dialogue initiates because it was EARNED through procedural stats (ZERO blind RNG)
          if (bestCandidate) {
            startTreeChatSession(s, bestCandidate);
          }
        }
      }

      if (s.isPlayer) {
        // ===================================================================
        // WASD PLAYER SLIME LOCOMOTION IN EXPLORATION MODE
        // ===================================================================
        const pInput = engine.playerInput;
        let moveX = 0;
        let moveY = 0;
        if (pInput.left) moveX -= 1;
        if (pInput.right) moveX += 1;
        if (pInput.up) moveY -= 1;
        if (pInput.down) moveY += 1;

        const isMoving = moveX !== 0 || moveY !== 0;
        if (isMoving) {
          const moveLen = Math.hypot(moveX, moveY) || 1;
          const dirX = moveX / moveLen;
          const dirY = moveY / moveLen;
          const speed = pInput.sprint ? 340 : 230;
          s.vx += dirX * speed * 8.5 * dt;
          s.vy += dirY * speed * 8.5 * dt;
          s.facingAngle = Math.atan2(dirY, dirX);
          s.walkCyclePhase = (s.walkCyclePhase ?? 0) + dt * 14;
          s.dropletTilt = dirX * 0.22;
          s.squashX = 1 + Math.sin(s.walkCyclePhase) * 0.14;
          s.squashY = 1 - Math.sin(s.walkCyclePhase) * 0.14;

          if (Math.random() < dt * 10) {
            engine.spawnParticle({
              x: s.x + (Math.random() - 0.5) * 16,
              y: s.y + s.radius * 0.35,
              z: 2,
              vx: -dirX * 25 + (Math.random() - 0.5) * 20,
              vy: -dirY * 25 + (Math.random() - 0.5) * 20,
              vz: 12 + Math.random() * 15,
              size: 4.5,
              color: s.color,
              coreColor: s.coreColor,
              alpha: 0.85,
              life: 0,
              maxLife: 0.45,
              drag: 0.92,
              gravity: 120,
              bounce: 0.4,
              floorY: s.y + s.radius * 0.4,
              type: 'slime_droplet',
              rotation: 0,
              vRot: 0,
              stretch: 1,
              seed: Math.floor(Math.random() * 999),
            });
          }
        }
        s.vx *= Math.pow(0.008, dt);
        s.vy *= Math.pow(0.008, dt);
        s.z = Math.max(0, s.z + s.vz * dt);
        if (s.z > 0) s.vz -= 680 * dt;
        else { s.z = 0; s.vz = 0; }
      } else if (!s.treeChatSessionId) {
        // Check if this NPC has a Romantic Partner ('par_romantico' / 'alma_gemea' / high romance)
        let romanticPartner: SlimeActor | null = null;
        for (let j = 0; j < slimes.length; j++) {
          if (j === i) continue;
          const peer = slimes[j];
          if (peer.isDesperate || (peer.treeChatBrawlTimer && peer.treeChatBrawlTimer > 0)) continue;
          const bond = getOrCreateDnaBond(s, peer);
          if (
            bond.tier === 'par_romantico' ||
            bond.tier === 'alma_gemea' ||
            bond.romance >= 44 ||
            s.romanticSnugglePartnerId === peer.id
          ) {
            romanticPartner = peer;
            break;
          }
        }

        const distToLover = romanticPartner
          ? Math.hypot(romanticPartner.x - s.x, romanticPartner.y - s.y)
          : Infinity;
        const snuggleSpan = romanticPartner
          ? (getAssetCollisionRadius(s) + getAssetCollisionRadius(romanticPartner)) * 0.88 + 4
          : 54;

        // ROMANTIC SNUGGLE & SLOW SYNCHRONIZED SWAY WITH BUBBLING HEARTS!
        if (romanticPartner && !romanticPartner.isPlayer && distToLover < 135) {
          const midX = (s.x + romanticPartner.x) * 0.5;
          const midY = (s.y + romanticPartner.y) * 0.5;
          const isLeft = s.id < romanticPartner.id;
          const targetX = midX + (isLeft ? -snuggleSpan * 0.5 : snuggleSpan * 0.5);
          const targetY = midY;

          s.vx += (targetX - s.x) * 5.2 * dt;
          s.vy += (targetY - s.y) * 5.2 * dt;
          s.facingAngle = isLeft ? 0 : Math.PI;

          // Slow, affectionate side-to-side sway in unison + gentle breathing pulse
          const now = performance.now();
          const swayWave = Math.sin(now * 0.0028);
          const breatheWave = Math.sin(now * 0.0056);
          s.dropletTilt = swayWave * 0.22;
          s.squashX = 1 + breatheWave * 0.065;
          s.squashY = 1 - breatheWave * 0.065;

          // Bubble up glowing 3D heart particles around the snuggling couple!
          s.heartBubbleEmitTimer = (s.heartBubbleEmitTimer ?? 0) - dt;
          if (s.heartBubbleEmitTimer <= 0) {
            s.heartBubbleEmitTimer = 0.24 + Math.random() * 0.18;
            const heartColors = ['#FF38B8', '#F472B6', '#FB7185', '#E879F9'];
            const hCol = heartColors[Math.floor(Math.random() * heartColors.length)];
            engine.spawnParticle({
              x: s.x + (Math.random() - 0.5) * (s.radius * 1.4),
              y: s.y - s.radius * (0.4 + Math.random() * 0.7),
              z: s.z + 12 + Math.random() * 14,
              vx: Math.sin(now * 0.004 + i) * 16 + (Math.random() - 0.5) * 14,
              vy: -32 - Math.random() * 26,
              vz: 18 + Math.random() * 16,
              size: 9 + Math.random() * 5,
              color: hCol,
              coreColor: '#FFF0F5',
              alpha: 0.95,
              life: 0,
              maxLife: 1.35 + Math.random() * 0.45,
              drag: 0.96,
              gravity: -15, // Floats gently upward like a soap bubble!
              bounce: 0,
              floorY: s.y + 40,
              type: 'heart_bubble',
              rotation: (Math.random() - 0.5) * 0.35,
              vRot: (Math.random() - 0.5) * 0.8,
              stretch: 1,
              seed: Math.floor(Math.random() * 999),
            });
          }
        } else {
          s.wanderTimer = (s.wanderTimer ?? 0) - dt;
          const distToTarget =
            s.wanderTargetX !== undefined && s.wanderTargetY !== undefined
              ? Math.hypot(s.wanderTargetX - s.x, s.wanderTargetY - s.y)
              : 0;

          // If they have a distant romantic partner, guide their wander target toward their beloved!
          if (romanticPartner && !romanticPartner.isPlayer && distToLover >= 135) {
            s.wanderTargetX = romanticPartner.x + (s.id < romanticPartner.id ? -32 : 32);
            s.wanderTargetY = romanticPartner.y;
          } else if (
            s.wanderTargetX === undefined ||
            s.wanderTargetY === undefined ||
            s.wanderTimer <= 0 ||
            distToTarget < 48
          ) {
            const nextWay = pickProceduralDiscoveryWaypoint(
              s,
              slimes,
              w,
              h,
              marginX,
              minY,
              maxY
            );
            s.wanderTargetX = nextWay.x;
            s.wanderTargetY = nextWay.y;
            s.wanderTimer = 3.5 + ((dna % 7) * 0.45) + Math.random() * 2.2;
          }

          const wdx = s.wanderTargetX - s.x;
          const wdy = s.wanderTargetY - s.y;
          const wDist = Math.hypot(wdx, wdy) || 1;
          const walkAccel = 235 + (dna % 35);

          // Dynamic Flocking: Same-species & Friends attract closer; Enemies repel or spark tension
          let flockX = 0;
          let flockY = 0;
          for (let j = 0; j < slimes.length; j++) {
            if (j === i) continue;
            const peer = slimes[j];
            const pdx = peer.x - s.x;
            const pdy = peer.y - s.y;
            const pDist = Math.hypot(pdx, pdy) || 1;
            const bond = getOrCreateDnaBond(s, peer);
            const isLover =
              bond.tier === 'par_romantico' ||
              bond.tier === 'alma_gemea' ||
              bond.tier === 'paquera';
            const isFriend = bond.tier === 'amigo' || bond.tier === 'melhor_amigo';
            const sameSpec = bond.sameSpecies;

            const safeDist =
              getAssetCollisionRadius(s) +
              getAssetCollisionRadius(peer) +
              (isLover ? 6 : isFriend || sameSpec ? 24 : 42);

            if (pDist < safeDist) {
              const repel = ((safeDist - pDist) / safeDist) * (isLover ? 90 : 260);
              flockX -= (pdx / pDist) * repel;
              flockY -= (pdy / pDist) * repel;
            } else if (pDist < 520) {
              const aff = computeTagAffinity(s, peer);
              let pullStrength = 0;
              if (isLover) pullStrength = 95;
              else if (isFriend) pullStrength = 52;
              else if (sameSpec) pullStrength = 64; // Same asset species naturally gravitate together!
              else if (aff.score > 0) pullStrength = 22 * Math.min(3, aff.score);

              if (pullStrength > 0) {
                flockX += (pdx / pDist) * pullStrength;
                flockY += (pdy / pDist) * pullStrength;
              }
            }
          }

          s.vx += ((wdx / wDist) * walkAccel + flockX) * dt;
          s.vy += ((wdy / wDist) * walkAccel + flockY) * dt;
          if (Math.hypot(s.vx, s.vy) > 10) {
            s.facingAngle = Math.atan2(s.vy, s.vx);
          }

          s.hopTimer -= dt;
          if (s.hopTimer <= 0 && s.z <= 0 && Math.hypot(s.vx, s.vy) > 18) {
            s.hopTimer = 0.44 + Math.random() * 0.16;
            s.vz = 75;
            s.squashX = 1.05;
            s.squashY = 0.95;
          }
        }
      }
    }

    // 6. Asset-Based Rigid + Elastic Collision Resolution (Prevents 10+ Characters from Crowding/Overlapping)
    for (let j = i + 1; j < slimes.length; j++) {
      const other = slimes[j];
      const dx = other.x - s.x;
      const dy = other.y - s.y;
      const dist = Math.hypot(dx, dy);
      const bondPair = getOrCreateDnaBond(s, other);
      const areLovers =
        bondPair.tier === 'par_romantico' ||
        bondPair.tier === 'alma_gemea' ||
        bondPair.romance >= 44;
      const minDist =
        getAssetCollisionRadius(s) +
        getAssetCollisionRadius(other) +
        (areLovers ? 2 : 16);

      if (dist < minDist) {
        const safeDist = Math.max(0.5, dist);
        const nx = dist > 0.1 ? dx / safeDist : Math.cos(i * 1.7 + j);
        const ny = dist > 0.1 ? dy / safeDist : Math.sin(i * 1.7 + j);
        const overlap = minDist - safeDist;

        // A. Direct Positional Separation so PNG assets never stack on top of each other
        const posPush = overlap * 0.52;
        s.x -= nx * posPush;
        s.y -= ny * posPush;
        other.x += nx * posPush;
        other.y += ny * posPush;

        // B. Elastic Velocity Impulse + Subtle Tangential Slide so characters glide around one another
        const velPush = overlap * 18 * dt + 42 * dt;
        const tangX = -ny * 0.28;
        const tangY = nx * 0.28;
        s.vx -= (nx + tangX) * velPush;
        s.vy -= (ny + tangY) * velPush;
        other.vx += (nx + tangX) * velPush;
        other.vy += (ny + tangY) * velPush;
      }
    }

    // Rock Monolith Barrier physical deflection
    for (let m = 0; m < engine.rockMonoliths.length; m++) {
      const rock = engine.rockMonoliths[m];
      const dx = s.x - rock.x;
      const dy = s.y - rock.y;
      const dist = Math.hypot(dx, dy);
      const minDist = getAssetCollisionRadius(s) + rock.width * 0.65;
      if (dist < minDist && dist > 0.1) {
        const nx = dx / dist;
        const ny = dy / dist;
        s.x = rock.x + nx * minDist;
        s.y = rock.y + ny * minDist;
        s.vx += nx * 160;
        s.vy += ny * 160;
      }
    }

    // 7. Integrate Velocity, Gravity & Arena Bounds
    const damping = Math.pow(0.06, dt);
    s.vx *= damping;
    s.vy *= damping;
    s.x += s.vx * dt;
    s.y += s.vy * dt;

    const assetMargin = Math.max(marginX, getAssetCollisionRadius(s) + 14);
    if (s.x < assetMargin) {
      s.x = assetMargin;
      s.vx = Math.abs(s.vx) * 0.6;
    } else if (s.x > w - assetMargin) {
      s.x = w - assetMargin;
      s.vx = -Math.abs(s.vx) * 0.6;
    }
    if (s.y < minY) {
      s.y = minY;
      s.vy = Math.abs(s.vy) * 0.6;
    } else if (s.y > maxY) {
      s.y = maxY;
      s.vy = -Math.abs(s.vy) * 0.6;
    }

    // Vertical Z Hop / Knock-Up Physics
    if (s.z > 0 || s.vz !== 0) {
      s.z += s.vz * dt;
      s.vz -= 980 * dt;
      if (s.z <= 0) {
        s.z = 0;
        s.vz = 0;
        if (s.flattenTimer <= 0) {
          s.squashX = 1.24;
          s.squashY = 0.78;
        }
      }
    }

    // Advance Walking Jelly Step Cycle Phase proportional to walking speed
    const speedMag = Math.hypot(s.vx, s.vy);
    const walkFreq =
      speedMag > 14 ? 11.5 + Math.min(8.5, speedMag * 0.04) : 3.2;
    s.walkCyclePhase = (s.walkCyclePhase ?? i * 1.3) + dt * walkFreq;

    // 8. Reactive Squash & Stretch (Pancake Flatten vs Gravity Stretch vs Acid Melt vs Walk Jelly Wobble)
    if (s.flattenTimer > 0) {
      s.squashX += (1.88 - s.squashX) * 18 * dt;
      s.squashY += (0.28 - s.squashY) * 18 * dt;
    } else if (s.gravityStretchTimer && s.gravityStretchTimer > 0) {
      s.squashX += (0.56 - s.squashX) * 16 * dt;
      s.squashY += (1.72 - s.squashY) * 16 * dt;
    } else if (s.corrodeTimer && s.corrodeTimer > 0) {
      s.squashX += (1.46 - s.squashX) * 14 * dt;
      s.squashY += (0.58 - s.squashY) * 14 * dt;
    } else {
      const walkJellyAmp = speedMag > 14 ? 0.065 : 0.032;
      const targetSX = 1 + Math.sin(s.walkCyclePhase) * walkJellyAmp;
      const targetSY = 1 - Math.sin(s.walkCyclePhase) * walkJellyAmp;
      s.squashX += (targetSX - s.squashX) * 14 * dt;
      s.squashY += (targetSY - s.squashY) * 14 * dt;
    }

    // Teardrop apex tilt follows horizontal velocity
    const targetTilt = Math.max(-0.45, Math.min(0.45, -s.vx * 0.0022));
    s.dropletTilt += (targetTilt - s.dropletTilt) * 14 * dt;

    // 9. Compute 4-Way Movement/Facing Direction ('up' | 'down' | 'left' | 'right')
    const dirAngle =
      s.isLeaping
        ? Math.atan2(s.leapTargetY - s.leapStartY, s.leapTargetX - s.leapStartX)
        : speedMag > 16
        ? Math.atan2(s.vy, s.vx)
        : s.facingAngle;

    if (dirAngle >= -Math.PI * 0.75 && dirAngle < -Math.PI * 0.25) {
      s.moveDirection = 'up';
    } else if (dirAngle >= Math.PI * 0.25 && dirAngle < Math.PI * 0.75) {
      s.moveDirection = 'down';
    } else if (dirAngle >= -Math.PI * 0.25 && dirAngle < Math.PI * 0.25) {
      s.moveDirection = 'right';
    } else {
      s.moveDirection = 'left';
    }
  }
}

function resolveDirectionalSprite(s: SlimeActor): {
  img: HTMLImageElement | null;
  flipX: boolean;
} {
  const cs = s.customSprites;
  if (!cs) return { img: null, flipX: false };
  const dir = s.moveDirection || 'down';

  const isLoaded = (el?: HTMLImageElement) =>
    Boolean(el && el.complete && el.naturalWidth > 0);

  if (dir === 'up' && isLoaded(cs.up)) return { img: cs.up!, flipX: false };
  if (dir === 'down' && isLoaded(cs.down)) return { img: cs.down!, flipX: false };
  if (dir === 'left' && isLoaded(cs.left)) return { img: cs.left!, flipX: false };
  if (dir === 'right' && isLoaded(cs.right)) return { img: cs.right!, flipX: false };

  // Smart mirror fallback if left or right is missing
  if (dir === 'left' && isLoaded(cs.right)) return { img: cs.right!, flipX: true };
  if (dir === 'right' && isLoaded(cs.left)) return { img: cs.left!, flipX: true };

  // Fallback to any loaded direction
  if (isLoaded(cs.down)) return { img: cs.down!, flipX: false };
  if (isLoaded(cs.right)) return { img: cs.right!, flipX: dir === 'left' };
  if (isLoaded(cs.left)) return { img: cs.left!, flipX: dir === 'right' };
  if (isLoaded(cs.up)) return { img: cs.up!, flipX: false };

  return { img: null, flipX: false };
}

export function getCharacterVisualBounds(s: SlimeActor): {
  boundSize: number;
  centerYOffset: number;
  drawW: number;
  drawH: number;
} {
  const customDirSprite = resolveDirectionalSprite(s);
  if (customDirSprite.img) {
    const img = customDirSprite.img;
    const cs = s.customSprites;
    const userScale = cs?.scale ?? 1.25;
    const refDim = Math.max(
      1,
      cs?.down?.naturalHeight || 0,
      cs?.up?.naturalHeight || 0,
      cs?.left?.naturalHeight || 0,
      cs?.right?.naturalHeight || 0,
      cs?.down?.naturalWidth || 0,
      cs?.up?.naturalWidth || 0,
      img.naturalHeight,
      img.naturalWidth
    );
    const targetWorldSize = s.radius * 3.85 * userScale;
    const pixelScale = targetWorldSize / refDim;
    const drawW = img.naturalWidth * pixelScale;
    const drawH = img.naturalHeight * pixelScale;
    const boundSize = Math.max(drawW, drawH);
    return {
      boundSize,
      centerYOffset: -drawH * 0.3,
      drawW,
      drawH,
    };
  }
  const boundSize = s.radius * 2.4;
  return {
    boundSize,
    centerYOffset: -s.radius * 0.35,
    drawW: boundSize,
    drawH: boundSize,
  };
}

/**
 * Physical Collision Footprint derived directly from the character's visual PNG/Asset bounds
 * so 10+ characters never overlap or crowd on top of each other.
 */
export function getAssetCollisionRadius(s: SlimeActor): number {
  const bounds = getCharacterVisualBounds(s);
  return Math.max(s.radius * 1.38, Math.min(bounds.drawW, bounds.drawH) * 0.44);
}

const ARENA_REGIONS: Array<{
  name: string;
  col: number;
  row: number;
  tags: VfxTag[];
}> = [
  { name: 'SANTUÁRIO GLACIAL', col: 0, row: 0, tags: ['gelo', 'agua', 'buffs'] },
  { name: 'PICOS ASTRAIS', col: 1, row: 0, tags: ['luz', 'magia', 'cura'] },
  { name: 'FORJA VULCÂNICA', col: 2, row: 0, tags: ['fogo', 'terra'] },
  { name: 'BOSQUE DO ÉDEN', col: 0, row: 1, tags: ['planta', 'cura', 'flecheiro'] },
  { name: 'NEXO ARCANO', col: 1, row: 1, tags: ['magia', 'energia', 'luz'] },
  { name: 'VALE DAS TEMPESTADES', col: 2, row: 1, tags: ['ar', 'energia', 'flecheiro'] },
  { name: 'ALQUIMIA QUIMTECH', col: 0, row: 2, tags: ['toxico', 'invocador', 'planta'] },
  { name: 'RUÍNAS ABISSAIS', col: 1, row: 2, tags: ['trevas', 'magia', 'invocador'] },
  { name: 'BASTIÃO DE ROCHA', col: 2, row: 2, tags: ['terra', 'buffs', 'fogo'] },
];

export function getProceduralActorDna(s: SlimeActor): number {
  if (s.proceduralDnaSeed !== undefined) return s.proceduralDnaSeed;
  const str = `${s.id}:${s.name}:${(s.allowedTags || []).join(',')}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const seed = Math.abs(h) || 1337;
  s.proceduralDnaSeed = seed;
  return seed;
}

function computeTagAffinity(
  a: SlimeActor,
  b: SlimeActor
): { score: number; primarySharedTag: VfxTag | null } {
  const tagsA = a.allowedTags || [];
  const tagsB = b.allowedTags || [];
  if (tagsA.length === 0 || tagsB.length === 0) {
    return { score: a.team === b.team ? 1 : 0, primarySharedTag: null };
  }
  let sharedCount = 0;
  let primary: VfxTag | null = null;
  for (let i = 0; i < tagsA.length; i++) {
    if (tagsB.includes(tagsA[i])) {
      sharedCount++;
      if (!primary) primary = tagsA[i];
    }
  }
  return {
    score: sharedCount * 2 + (a.team === b.team ? 1 : 0),
    primarySharedTag: primary,
  };
}

function pickProceduralDiscoveryWaypoint(
  s: SlimeActor,
  slimes: SlimeActor[],
  w: number,
  h: number,
  marginX: number,
  minY: number,
  maxY: number
): { x: number; y: number } {
  const dna = getProceduralActorDna(s);
  const visitedMask = s.visitedRegionsMask ?? 0;
  const myTags = s.allowedTags || [];

  // Score all 9 regions based on: (1) unvisited curiosity, (2) tag resonance, (3) presence of same-tag peers, (4) anti-crowding
  let bestIdx = (dna + Math.floor(performance.now() * 0.001)) % ARENA_REGIONS.length;
  let bestScore = -999;

  for (let idx = 0; idx < ARENA_REGIONS.length; idx++) {
    const reg = ARENA_REGIONS[idx];
    const isVisited = (visitedMask & (1 << idx)) !== 0;
    let score = isVisited ? 0 : 35; // High curiosity drive for unvisited regions!

    // Tag resonance with biome
    for (let t = 0; t < myTags.length; t++) {
      if (reg.tags.includes(myTags[t])) score += 14;
    }

    const regCenterX = ((reg.col + 0.5) / 3) * w;
    const regCenterY = ((reg.row + 0.5) / 3) * h;

    // Count peers in this region: attract to same-tag peers (up to 2), penalize overcrowded regions (>3)
    let peersInRegion = 0;
    let sameTagBonus = 0;
    for (let j = 0; j < slimes.length; j++) {
      const other = slimes[j];
      if (other.id === s.id) continue;
      if (Math.hypot(other.x - regCenterX, other.y - regCenterY) < w * 0.2) {
        peersInRegion++;
        const aff = computeTagAffinity(s, other);
        if (aff.score >= 2) sameTagBonus += 12;
      }
    }

    if (peersInRegion <= 2) {
      score += sameTagBonus;
    } else {
      // Strong anti-clustering penalty when >2 characters are already in that sector!
      score -= (peersInRegion - 2) * 28;
    }

    // Procedural DNA variance so each character picks a unique expedition route
    score += ((dna * (idx + 3)) % 23) + Math.random() * 18;

    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  }

  const chosen = ARENA_REGIONS[bestIdx];
  const cellW = w / 3;
  const cellH = h / 3;
  // Deterministic + organic offset inside the chosen region so characters spread out within the biome
  const slotAngle = ((dna % 360) * Math.PI) / 180 + Math.random() * 1.2;
  const slotDist = 55 + (dna % 110) + Math.random() * 85;
  const rawX = (chosen.col + 0.5) * cellW + Math.cos(slotAngle) * slotDist;
  const rawY = (chosen.row + 0.5) * cellH + Math.sin(slotAngle) * slotDist * 0.75;

  return {
    x: Math.max(marginX + 80, Math.min(w - marginX - 80, rawX)),
    y: Math.max(minY + 60, Math.min(maxY - 60, rawY)),
  };
}

/**
 * RENDERER: 4 SEMI-SPHERICAL TEARDROP SLIMES (OR CUSTOM 4-DIRECTIONAL PNG ASSETS) WITH REACTIVE STATES & BUFFS
 */
export function renderSlimeActorsModule(
  ctx: CanvasRenderingContext2D,
  slimes: SlimeActor[]
) {
  for (let i = 0; i < slimes.length; i++) {
    const s = slimes[i];
    ctx.save();

    // 1. Soft Elliptical Ground Shadow
    const shadowScale = Math.max(0.38, 1 - s.z / 320);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.beginPath();
    ctx.ellipse(
      s.x,
      s.y + s.radius * 0.35,
      s.radius * 1.15 * s.squashX * shadowScale,
      s.radius * 0.45 * shadowScale,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Team Ground Ring Indicator
    ctx.strokeStyle =
      s.team === 0 ? 'rgba(56, 189, 248, 0.38)' : 'rgba(244, 63, 94, 0.38)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(
      s.x,
      s.y + s.radius * 0.35,
      s.radius * 1.28 * shadowScale,
      s.radius * 0.52 * shadowScale,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    // Keep ground clean: no permanent spatial audio debug rings around the player

    // Electric Shock or Frozen Micro-Tremor Offset
    const jitterX =
      s.shockTimer > 0
        ? (Math.random() - 0.5) * 10
        : s.frozenTimer > 0
        ? (Math.random() - 0.5) * 2.5
        : 0;
    const jitterY =
      s.shockTimer > 0
        ? (Math.random() - 0.5) * 10
        : s.frozenTimer > 0
        ? (Math.random() - 0.5) * 2.5
        : 0;

    ctx.translate(s.x + jitterX, s.y - s.z + jitterY);

    // 1B. Ground Reaction Decals Under Enemy Slime (Acid Melt Puddle or Hydro Soak Ring)
    if ((s.corrodeTimer && s.corrodeTimer > 0) || s.poisonTimer > 0) {
      ctx.save();
      ctx.scale(1, 0.52);
      const acidTex = getGroundDecalTextureSprite(
        'acid_caustic',
        '#39FF14',
        '#15803D',
        '#F4FFE6',
        '#052E16'
      );
      const pDim = s.radius * 2.6;
      ctx.drawImage(acidTex, -pDim * 0.5, -pDim * 0.3, pDim, pDim);
      ctx.restore();
    }

    if (s.soakedTimer && s.soakedTimer > 0) {
      ctx.save();
      ctx.scale(1, 0.55);
      ctx.globalCompositeOperation = 'lighter';
      const rippleTex = getGroundDecalTextureSprite(
        'water_ripples',
        '#38BDF8',
        '#0284C7',
        '#FFFFFF',
        '#082F49'
      );
      const wDim = s.radius * 2.5;
      ctx.drawImage(rippleTex, -wDim * 0.5, -wDim * 0.35, wDim, wDim);
      ctx.restore();
    }

    // 2. Berserk Overdrive Ki Flame Aura (if active)
    if (s.berserkBuffTimer > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = getGlowSprite('#FF2A4B', '#FFD747');
      const pulse = 1 + Math.sin(performance.now() * 0.02) * 0.15;
      const sz = s.radius * 3.4 * pulse;
      ctx.drawImage(glow, -sz / 2, -sz * 0.6, sz, sz);
      ctx.restore();
    }

    // 3. Character Body: Custom 4-Directional PNG Asset (with subtle organic walking jelly step)
    //    OR Procedural Semi-Spherical Teardrop Slime
    const customDirSprite = resolveDirectionalSprite(s);
    const charBounds = getCharacterVisualBounds(s);
    const speedMag = Math.hypot(s.vx, s.vy);
    const isMoving = speedMag > 14 || s.z > 1;
    const walkPhase = s.walkCyclePhase ?? s.wobblePhase;
    // Subtle organic jelly step effect when walking (~4.5% elastic bounce, 1.5% idle breathing)
    const jellyAmp = isMoving ? 0.046 : 0.015;
    const jellyWave = Math.sin(walkPhase) * jellyAmp;
    const hopAirStretch = Math.min(0.04, s.z * 0.0011);
    const walkJellyX = 1 + jellyWave - hopAirStretch * 0.6;
    const walkJellyY = 1 - jellyWave + hopAirStretch;

    if (customDirSprite.img) {
      const img = customDirSprite.img;
      const drawW = charBounds.drawW;
      const drawH = charBounds.drawH;

      ctx.save();
      // Anchor subtle jelly squash/stretch at ground contact point so feet stay planted
      ctx.scale(
        (customDirSprite.flipX ? -1 : 1) * walkJellyX,
        walkJellyY
      );
      ctx.drawImage(img, -drawW * 0.5, -drawH * 0.78, drawW, drawH);

      if (s.hitFlashTimer > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.75;
        ctx.drawImage(img, -drawW * 0.5, -drawH * 0.78, drawW, drawH);
      }
      ctx.restore();
    } else {
      ctx.save();
      const desperateScale = s.isDesperate ? 0.84 : 1.0;
      ctx.scale(s.squashX * desperateScale, s.squashY * desperateScale);

      const r = s.radius;
      const tipX = s.dropletTilt * r * 0.75;
      const tipY = -r * 1.28;

      const drawTeardropPath = (scaleMul = 1.0) => {
        const R = r * scaleMul;
        const TX = tipX * scaleMul;
        const TY = tipY * scaleMul;
        ctx.beginPath();
        ctx.moveTo(TX, TY);
        ctx.bezierCurveTo(
          R * 0.96,
          -R * 0.78,
          R * 1.18,
          -R * 0.08,
          R * 1.02,
          R * 0.28
        );
        ctx.quadraticCurveTo(0, R * 0.52, -R * 1.02, R * 0.28);
        ctx.bezierCurveTo(
          -R * 1.18,
          -R * 0.08,
          -R * 0.96,
          -R * 0.78,
          TX,
          TY
        );
        ctx.closePath();
      };

      // Dark Outer Gel Rim
      ctx.fillStyle = s.hitFlashTimer > 0 ? '#FFFFFF' : s.darkColor;
      drawTeardropPath(1.06);
      ctx.fill();

      // Translucent Subsurface Gradient Body (Reacts to Freeze, Burn Char, Acid Corrosion & Shock)
      const bodyGrad = ctx.createRadialGradient(
        tipX * 0.3,
        -r * 0.35,
        r * 0.12,
        0,
        -r * 0.2,
        r * 1.15
      );
      if (s.hitFlashTimer > 0) {
        bodyGrad.addColorStop(0, '#FFFFFF');
        bodyGrad.addColorStop(1, '#FFFFFF');
      } else if (s.frozenTimer > 0) {
        bodyGrad.addColorStop(0, '#FFFFFF');
        bodyGrad.addColorStop(0.5, '#38BDF8');
        bodyGrad.addColorStop(1, '#0369A1');
      } else if (s.burnTimer > 0) {
        // Charred Magma-Cracked Body when burning!
        bodyGrad.addColorStop(0, '#FFDD66');
        bodyGrad.addColorStop(0.45, '#EA580C');
        bodyGrad.addColorStop(1, '#1C1917');
      } else if ((s.corrodeTimer && s.corrodeTimer > 0) || s.poisonTimer > 0) {
        // Virulent Necrotic Acid Body when corroded!
        bodyGrad.addColorStop(0, '#ECFCCB');
        bodyGrad.addColorStop(0.5, '#39FF14');
        bodyGrad.addColorStop(1, '#3B0764');
      } else {
        bodyGrad.addColorStop(0, s.coreColor);
        bodyGrad.addColorStop(0.52, s.color);
        bodyGrad.addColorStop(1, s.darkColor);
      }
      ctx.fillStyle = bodyGrad;
      drawTeardropPath(1.0);
      ctx.fill();

      // Inner Floating Slime Nucleus Core
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = s.coreColor + 'AA';
      ctx.beginPath();
      ctx.arc(tipX * 0.2, -r * 0.28, r * 0.34, 0, Math.PI * 2);
      ctx.fill();

      // Glossy Specular Highlight Crescent on Top-Left Dome
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.beginPath();
      ctx.ellipse(
        -r * 0.36 + tipX * 0.25,
        -r * 0.58,
        r * 0.24,
        r * 0.11,
        -0.48,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();

      // 4. Expressive Reactive Eyes (Battle vs Flattened/Stunned X_X vs Desperate Panic O_O)
      const lookX = Math.cos(s.facingAngle) * 5;
      const lookY = Math.sin(s.facingAngle) * 2.5 - r * 0.22;

      if (
        s.flattenTimer > 0 ||
        s.stunTimer > 0 ||
        s.shockTimer > 0 ||
        (s.gravityStretchTimer && s.gravityStretchTimer > 0)
      ) {
        // X _ X Dizzy / Flattened Eyes
        ctx.strokeStyle = '#090D16';
        ctx.lineWidth = 2.6;
        [-10, 10].forEach((ox) => {
          const ex = ox + lookX * 0.4;
          const ey = lookY;
          ctx.beginPath();
          ctx.moveTo(ex - 4, ey - 4);
          ctx.lineTo(ex + 4, ey + 4);
          ctx.moveTo(ex + 4, ey - 4);
          ctx.lineTo(ex - 4, ey + 4);
          ctx.stroke();
        });
      } else if (s.isDesperate) {
        // Wide Panic Eyes (O _ O) with tiny trembling pupils
        [-10, 10].forEach((ox) => {
          const ex = ox + lookX * 0.5;
          const ey = lookY;
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#090D16';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ex, ey, 6.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#090D16';
          ctx.beginPath();
          ctx.arc(ex, ey, 2.1, 0, Math.PI * 2);
          ctx.fill();
        });
      } else {
        // Fierce Focused Combat Eyes
        [-10, 10].forEach((ox, idx) => {
          const ex = ox + lookX;
          const ey = lookY;
          ctx.fillStyle = '#090D16';
          ctx.beginPath();
          ctx.ellipse(ex, ey, 4.2, 5.2, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(ex - 1.2, ey - 1.8, 1.7, 0, Math.PI * 2);
          ctx.fill();

          // Determined brow slant
          ctx.strokeStyle = '#090D16';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          if (idx === 0) {
            ctx.moveTo(ex - 5, ey - 6);
            ctx.lineTo(ex + 4, ey - 3.5);
          } else {
            ctx.moveTo(ex - 4, ey - 3.5);
            ctx.lineTo(ex + 5, ey - 6);
          }
          ctx.stroke();
        });
      }
      ctx.restore(); // End procedural slime squash/stretch transform
    }

    // 4B. ENEMY SHADER REACTION OVERLAYS (Ice Block, Fire Shroud, Root Vines, Electric Arcs)
    if (s.frozenTimer > 0) {
      // 2.5D Refractive Ice Crystal Prism Entombment around Frozen Slime!
      ctx.save();
      ctx.globalAlpha = 0.78;
      ctx.globalCompositeOperation = 'lighter';
      const iceCrystal = getProceduralCrystalSprite(
        '#36E2FF',
        '#1A52B8',
        '#FFFFFF',
        0
      );
      const cw = s.radius * 2.35;
      const ch = s.radius * 2.95;
      ctx.drawImage(iceCrystal, -cw * 0.5, -ch * 0.78, cw, ch);
      ctx.restore();
    }

    if (s.burnTimer > 0) {
      // Voronoi-Eroded Flame Shroud licking up the burning Slime!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const fireFlip = getVoronoiExplosionFlipbook(
        '#FF7700',
        '#B81D00',
        '#FFFFF0',
        '#210500'
      );
      const stage = Math.floor((performance.now() * 0.016) % 6);
      const fDim = s.radius * 2.3;
      ctx.drawImage(fireFlip[stage], -fDim * 0.5, -fDim * 0.75, fDim, fDim);
      ctx.restore();
    }

    if (s.rootTimer && s.rootTimer > 0) {
      // Thorny Botanical Vines wrapped around the rooted Slime!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const thornStamp = getInstancedElementStamp(
        'petal_thorn',
        '#39FF14',
        '#FFFFFF'
      );
      if (thornStamp) {
        for (let v = 0; v < 4; v++) {
          const a = (v * Math.PI) / 2 + 0.3;
          const vx = Math.cos(a) * s.radius * 0.65;
          const vy = Math.sin(a) * s.radius * 0.25 - s.radius * 0.25;
          ctx.save();
          ctx.translate(vx, vy);
          ctx.rotate(a);
          ctx.drawImage(thornStamp, -18, -10, 36, 20);
          ctx.restore();
        }
      }
      ctx.restore();
    }

    if (s.shockTimer > 0) {
      // High-Voltage Fractal Electric Arcs jumping across the shocked Slime!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#00D9FF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let b = 0; b < 3; b++) {
        let bx = (Math.random() - 0.5) * s.radius * 1.4;
        let by = -Math.random() * s.radius * 1.2;
        ctx.moveTo(bx, by);
        for (let step = 0; step < 3; step++) {
          bx += (Math.random() - 0.5) * 24;
          by += (Math.random() - 0.5) * 24;
          ctx.lineTo(bx, by);
        }
      }
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }

    // 5. Active 3D Spherical Elemental Shield Orb (Ice, Hex, Magma, Hydro Bubble, Briar, Void)
    if (s.shieldHp > 0 || s.shieldBuffTimer > 0 || s.mirrorCoatTimer > 0) {
      const style: SphericalShieldStyle =
        s.mirrorCoatTimer > 0
          ? 'frost_sphere'
          : s.shieldStyle || 'aegis_hex_sphere';

      let pHex = '#00D9FF',
        sHex = '#0284C7',
        cHex = '#FFFFFF',
        dHex = '#082F49';

      if (style === 'frost_sphere') {
        pHex = '#38BDF8';
        sHex = '#0369A1';
        cHex = '#F0F9FF';
        dHex = '#082F49';
      } else if (style === 'magma_sphere') {
        pHex = '#FF5500';
        sHex = '#9A1B00';
        cHex = '#FFF7ED';
        dHex = '#1C0603';
      } else if (style === 'hydro_bubble_sphere') {
        pHex = '#00E5FF';
        sHex = '#0284C7';
        cHex = '#FFFFFF';
        dHex = '#042F49';
      } else if (style === 'briar_nature_sphere') {
        pHex = '#39FF14';
        sHex = '#15803D';
        cHex = '#F7FEE7';
        dHex = '#052E16';
      } else if (style === 'void_gravity_sphere') {
        pHex = '#C84BFF';
        sHex = '#4C1D95';
        cHex = '#FAF5FF';
        dHex = '#090214';
      }

      const sphereTex = getSphericalShieldTextureSprite(
        style,
        pHex,
        sHex,
        cHex,
        dHex
      );

      const now = performance.now();
      const breathe = 1.0 + Math.sin(now * 0.005) * 0.018;
      // Shield diameter is strictly 5% larger than the PNG / character bound in general!
      const orbDim = charBounds.boundSize * 1.05 * breathe;

      ctx.save();
      ctx.translate(0, charBounds.centerYOffset);

      // Pass A: Translucent 3D Spherical Rim (Almost transparent at center so character is 100% clear)
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.65;
      ctx.drawImage(sphereTex, -orbDim * 0.5, -orbDim * 0.5, orbDim, orbDim);

      // Pass B: Additive Fresnel Horizon, Voronoi Seams & Specular Reflection Highlight
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.48;
      ctx.drawImage(sphereTex, -orbDim * 0.5, -orbDim * 0.5, orbDim, orbDim);

      ctx.restore();
    }

    // 6. Spinning Stun Stars Overhead when Stunned or Flattened!
    if (s.stunTimer > 0 || s.flattenTimer > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const starY = -s.radius * s.squashY * 1.35 - 12;
      const starStamp = getInstancedElementStamp(
        'hex_glyph',
        '#FFD747',
        '#FFFFFF'
      );
      for (let st = 0; st < 3; st++) {
        const a = (st * Math.PI * 2) / 3 + performance.now() * 0.008;
        const sx = Math.cos(a) * 24;
        const sy = starY + Math.sin(a) * 7;
        if (starStamp) {
          ctx.drawImage(starStamp, sx - 11, sy - 11, 22, 22);
        }
      }
      ctx.restore();
    }

    // 7. HUD Overhead: Single Sleek Game-Design Capsule Bar + External Name Above It
    const topOfAsset = Math.min(-s.radius * 1.6, -charBounds.drawH * 0.8);
    const capW = 86;
    const capH = 10;
    const capR = capH * 0.5;
    const capY = topOfAsset - 16;

    // A. Relationship Tree Milestone Capsule (ONLY Colored Text according to each Relationship State!)
    if (s.relationshipCapsule && s.relationshipCapsule.timer > 0) {
      const rc = s.relationshipCapsule;
      const fadeAlpha = Math.min(1, rc.timer / 0.45) * Math.min(1, (rc.maxTimer - rc.timer + 0.15) / 0.25);
      ctx.save();
      ctx.globalAlpha = fadeAlpha;
      ctx.font = '900 9.5px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const textMetrics = ctx.measureText(rc.label);
      const pillW = Math.max(58, textMetrics.width + 18);
      const pillH = 16;
      const pillX = -pillW * 0.5;
      const pillY = capY - 34;

      // Sleek dark translucent capsule frame
      ctx.fillStyle = 'rgba(5, 9, 20, 0.92)';
      ctx.strokeStyle = rc.borderColor;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, pillH * 0.5);
      ctx.fill();
      ctx.stroke();

      // Colored text ONLY inside the capsule (colored according to the relationship state)
      ctx.fillStyle = rc.textColor;
      ctx.fillText(rc.label, 0, pillY + pillH * 0.5 + 0.5);
      ctx.restore();
    }

    // Clean, crisp character name directly above the HP capsule bar (only the name)
    ctx.font = '900 11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';
    ctx.strokeText(s.name, 0, capY - 6);
    ctx.fillStyle = s.isPlayer ? '#FDE047' : s.team === 0 ? '#E0F2FE' : '#FFE4E6';
    ctx.fillText(s.name, 0, capY - 6);

    // Small elemental class accent dot to the left of the external name
    const nameHalfW = Math.min(54, ctx.measureText(s.name).width * 0.5 + 7);
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(-nameHalfW, capY - 9.5, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // C. Single Unified Game-Design Capsule Bar (HP + Shield + Tick Notches + Specular Glass)
    ctx.save();
    // 1. Outer Dark Metallic Capsule Bezel
    ctx.fillStyle = 'rgba(5, 9, 20, 0.92)';
    ctx.strokeStyle =
      s.team === 0 ? 'rgba(56, 189, 248, 0.72)' : 'rgba(251, 113, 133, 0.72)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(-capW * 0.5, capY, capW, capH, capR);
    ctx.fill();
    ctx.stroke();

    // 2. Inner Clipped Capsule Chamber
    const pad = 1.6;
    const inX = -capW * 0.5 + pad;
    const inY = capY + pad;
    const inW = capW - pad * 2;
    const inH = capH - pad * 2;
    const inR = Math.max(2, inH * 0.5);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(inX, inY, inW, inH, inR);
    ctx.clip();

    // Dark recessed track background
    ctx.fillStyle = '#090E1A';
    ctx.fillRect(inX, inY, inW, inH);

    // Glossy Game HP Fill Gradient
    const hpRatio = Math.max(0, Math.min(1, s.hp / s.maxHp));
    if (hpRatio > 0) {
      const hpGrad = ctx.createLinearGradient(0, inY, 0, inY + inH);
      if (s.isDesperate) {
        hpGrad.addColorStop(0, '#FDE047');
        hpGrad.addColorStop(0.5, '#F59E0B');
        hpGrad.addColorStop(1, '#B45309');
      } else if (s.team === 0) {
        hpGrad.addColorStop(0, '#6EE7B7');
        hpGrad.addColorStop(0.45, '#10B981');
        hpGrad.addColorStop(1, '#047857');
      } else {
        hpGrad.addColorStop(0, '#FDA4AF');
        hpGrad.addColorStop(0.45, '#F43F5E');
        hpGrad.addColorStop(1, '#9F1239');
      }
      ctx.fillStyle = hpGrad;
      ctx.fillRect(inX, inY, inW * hpRatio, inH);
    }

    // Integrated Shield Overlay inside the SAME Single Capsule!
    if (s.shieldHp > 0) {
      const shRatio = Math.max(0, Math.min(1, s.shieldHp / s.maxShieldHp));
      const shW = inW * shRatio;
      const shGrad = ctx.createLinearGradient(0, inY, 0, inY + inH);
      shGrad.addColorStop(0, 'rgba(224, 242, 254, 0.85)');
      shGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.72)');
      shGrad.addColorStop(1, 'rgba(2, 132, 199, 0.78)');
      ctx.fillStyle = shGrad;
      ctx.fillRect(inX, inY, shW, inH);

      // Crystalline shield leading edge spark
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(inX + shW - 1.5, inY, 1.5, inH);
    }

    // Subtle 25% Game Health Segment Notches
    ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
    for (let q = 1; q <= 3; q++) {
      const tx = inX + inW * (q * 0.25);
      ctx.fillRect(tx - 0.5, inY, 1, inH * 0.58);
    }

    // Top Glass Specular Shine Strip along the Capsule
    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.fillRect(inX + 2, inY + 0.6, inW - 4, inH * 0.32);

    ctx.restore(); // End inner capsule clip

    // Micro Skill Readiness Gems integrated along the bottom rim of the capsule bezel
    const numSkills = Math.min(4, s.skills.length);
    for (let k = 0; k < numSkills; k++) {
      const sk = s.skills[k];
      const isReady = sk.cooldown <= 0.05;
      const gx = -12 + k * 8;
      const gy = capY + capH + 0.3;
      ctx.fillStyle = isReady ? '#38BDF8' : 'rgba(51, 65, 85, 0.75)';
      ctx.beginPath();
      ctx.arc(gx, gy, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }
}
