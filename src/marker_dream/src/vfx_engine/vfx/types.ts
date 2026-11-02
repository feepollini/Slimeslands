export type VfxPresetId =
  // 01-04 & 09-10: Hack & Slash & Melee (6)
  | 'vorpal_combo'
  | 'judgement_cut'
  | 'reaper_scythe'
  | 'steel_tempest'
  | 'blade_dance'
  | 'world_ender'
  // 05-06 & 11-14: Disparos, Explosões & Balística (6)
  | 'thermobaric_cannon'
  | 'hextech_swarm'
  | 'railgun_snipe'
  | 'buckshot_blast'
  | 'mega_rocket'
  | 'chrono_bomb'
  // 07 & 15-19: Gelo, Correntes, Veneno, Natureza & Ilusão (6)
  | 'crystal_arrow'
  | 'hellfire_chains'
  | 'arctic_blizzard'
  | 'caustic_acid'
  | 'thorn_roots'
  | 'mirror_shatter'
  // 08 & 20-24: Magias Cósmicas, Raios, Lasers & Ultimates (6)
  | 'void_cataclysm'
  | 'cosmic_singularity'
  | 'divine_sword'
  | 'thunder_storm'
  | 'death_lotus'
  | 'tectonic_rupture'
  // 25-36: Dashs, Pulos c/ Stun, Barreiras de Rocha, Chamas em Área, Curas & Escudos (12)
  | 'venom_dash'
  | 'meteor_crush_leap'
  | 'phantom_blade_dash'
  | 'sanctuary_aura_heal'
  | 'celestial_mend_beam'
  | 'aegis_dome_shield'
  | 'berserk_overdrive_buff'
  | 'glacial_mirror_coat'
  | 'earthen_bulwark'
  | 'hellfire_cataclysm_zone'
  | 'boulder_avalanche'
  | 'phoenix_rebirth_nova'
  // 37-48: Grimório Expandido AAA (Água, Planta, Magma, Crio, Necro, Prisma, Abismo, Tesla, Serafim) (12)
  | 'abyssal_tsunami'
  | 'hydro_maelstrom'
  | 'eden_overgrowth'
  | 'dragon_breath_cone'
  | 'volcanic_caldera'
  | 'absolute_zero_dome'
  | 'necrotic_plague_cloud'
  | 'solar_orbital_prism'
  | 'abyssal_tentacle_rift'
  | 'tesla_chain_overload'
  | 'tectonic_iron_maiden'
  | 'seraphic_ascension'
  // 49-56: Escudos Esféricos 3D Texturizados & Expansão Elemental (8)
  | 'cryo_sphere_aegis'
  | 'magma_carapace_sphere'
  | 'hydro_bubble_sanctuary'
  | 'briar_thorn_dome'
  | 'void_event_barrier'
  | 'tempest_cyclone_shield'
  | 'venom_miasma_monsoon'
  | 'astral_supernova_bastion'
  // 57-64: Flecheiros, Atiradores Kiter & Invocadores de Enxame de Insetos (8)
  | 'ranger_arrow_volley'
  | 'sky_arrow_rain'
  | 'locust_plague_swarm'
  | 'hornet_hive_summon'
  | 'piercing_sniper_shot'
  | 'bramble_snare_arrow'
  | 'scarab_beetle_barrage'
  | 'frostbite_ricochet_arrow'
  // 65-82: Arsenal Oficial de Assets (1 Skill Dedicada e Pura por Pasta de Asset, Sem Misturar Assets)
  | 'ninja_shuriken_storm'
  | 'cryo_shuriken_prism'
  | 'carnivorous_plant_garden'
  | 'spike_trap_ambush'
  | 'vertical_portal_barrage'
  | 'meteor_extinction_rain'
  | 'runic_swords_sanctuary'
  | 'mystic_lotus_pool'
  | 'stone_barrier_bulwark'
  | 'elemental_crag_wall'
  | 'fang_ridge_barricade'
  | 'tectonic_monolith_surge'
  | 'embedded_greatsword_altar'
  | 'ancient_ruin_pillars'
  | 'glacial_crystal_cluster'
  | 'thorny_vine_thicket'
  | 'arcane_splash_geyser'
  | 'runic_sigil_invocation'
  // 83-85: Arsenal Piroclástico Especial (Bola de Fogo, Big Fire Ball & Labareda Expansiva)
  | 'fireball_orb'
  | 'big_fire_ball_colossus'
  | 'expanding_flame_wave'
  // 86-95: Arsenal Alquímico de Poções Arremessáveis (Giro 3D no Ar, Dano em Área & Névoas)
  | 'potion_toxic_miasma'
  | 'potion_frost_freeze'
  | 'potion_tar_sludge'
  | 'potion_hellfire_conflagration'
  | 'potion_corrosive_acid'
  | 'potion_shock_volt'
  | 'potion_healing_mist'
  | 'potion_spectral_madness'
  | 'potion_gravity_vortex'
  | 'potion_smoke_screen';

export type ElementalPaletteId =
  | 'crimson_blood'
  | 'vergil_mirage'
  | 'void_abyss'
  | 'infernal_magma'
  | 'hextech_arcane'
  | 'freljord_ice'
  | 'toxic_venom'
  | 'celestial_gold';

export type VfxCategory =
  | 'Hack & Slash'
  | 'Disparo & Explosão'
  | 'Cristal & Controle'
  | 'Cósmico & Ultimate'
  | 'Rocha, Chamas, Dash & Buffs'
  | 'Alquimia & Poções';

export type VfxTag =
  | 'fogo'
  | 'agua'
  | 'terra'
  | 'ar'
  | 'planta'
  | 'luz'
  | 'energia'
  | 'magia'
  | 'gelo'
  | 'trevas'
  | 'toxico'
  | 'cura'
  | 'buffs'
  | 'flecheiro'
  | 'invocador'
  | 'pocao';

export type SlimePersonality =
  | 'auto'
  | 'flecheiro_kiter'
  | 'invocador_enxame'
  | 'mago_artilheiro'
  | 'assassino_flanco'
  | 'berserker_frontal';

export type SlimeTacticalState =
  | 'reposicionando'
  | 'mirando_disparo'
  | 'recuando_kite'
  | 'invocando'
  | 'avancando'
  | 'caminhada_pacifica'
  | 'interacao_social'
  | 'duelo_treechat';

export interface ElementalPalette {
  id: ElementalPaletteId;
  name: string;
  core: string;
  primary: string;
  secondary: string;
  accent: string;
  dark: string;
}

export interface VfxSpellDossier {
  paraQue: string;
  comoFunciona: string;
  shaderETextura: string;
  reacaoInimigo: string;
  statusAceite: string;
}

export interface VfxPresetMeta {
  id: VfxPresetId;
  number: string;
  name: string;
  category: VfxCategory;
  tags: VfxTag[];
  shortcut: string;
  defaultPalette: ElementalPaletteId;
  cooldownSec: number;
  dossier?: VfxSpellDossier;
}

export interface ShaderParams {
  effectScale: number;
  hitstopMs: number;
  chromaticAberration: number;
  erosionSharpness: number;
  particleMultiplier: number;
  bloomIntensity: number;
  screenShakeIntensity: number;
  timeScale: number;
  enableSound: boolean;
}

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  coreColor: string;
  alpha: number;
  life: number;
  maxLife: number;
  drag: number;
  gravity: number;
  bounce: number;
  floorY: number;
  type:
    | 'needle_spark'
    | 'crystal_shard'
    | 'snowflake'
    | 'hex_glyph'
    | 'wind_wisp'
    | 'fireball_lobe'
    | 'smoke_puff'
    | 'slash_ember'
    | 'reality_shard'
    | 'acid_bubble'
    | 'shell_casing'
    | 'kunai_dagger'
    | 'petal_thorn'
    | 'mirror_prism'
    | 'heal_cross'
    | 'slime_droplet'
    | 'sweat_drop'
    | 'rock_chunk'
    | 'flame_tongue'
    | 'glass_splinter'
    | 'potion_bubble'
    | 'heart_bubble';
  rotation: number;
  vRot: number;
  stretch: number;
  seed: number;
  trail: Array<{ x: number; y: number }>;
}

export interface FacetedCrystal {
  x: number;
  y: number;
  angle: number;
  length: number;
  maxLength: number;
  width: number;
  life: number;
  maxLife: number;
  shatterAtEnd: boolean;
  palette: ElementalPalette;
  seed: number;
  layer: 'back' | 'front';
}

export interface RockMonolith {
  x: number;
  y: number;
  tiltAngle: number;
  height: number;
  maxHeight: number;
  width: number;
  life: number;
  maxLife: number;
  palette: ElementalPalette;
  seed: number;
  cracks: Array<{ x1: number; y1: number; x2: number; y2: number }>;
}

export interface FlamePillarZone {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  tickTimer: number;
  palette: ElementalPalette;
  seed: number;
  casterId?: string;
}

export interface FrostVein {
  x: number;
  y: number;
  segments: Array<{ x1: number; y1: number; x2: number; y2: number; width: number; depth: number }>;
  life: number;
  maxLife: number;
  palette: ElementalPalette;
}

export interface GroundRuneSigil {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
  style:
    | 'freljord_star'
    | 'hextech_astrolabe'
    | 'lunar_seal'
    | 'infernal_target'
    | 'void_eye'
    | 'chrono_clock'
    | 'sanctuary_mandala';
  palette: ElementalPalette;
  perspectiveY: number;
}

export interface RibbonProjectile {
  id: number;
  preset: VfxPresetId;
  casterId?: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  controlX: number;
  controlY: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  speed: number;
  angle: number;
  progress: number;
  useBezier: boolean;
  life: number;
  maxLife: number;
  delay?: number;
  scale: number;
  palette: ElementalPalette;
  history: Array<{ x: number; y: number; angle: number }>;
  isClusterSub?: boolean;
}

export interface SlashBladeArc {
  x: number;
  y: number;
  radius: number;
  thickness: number;
  startAngle: number;
  sweepAngle: number;
  life: number;
  maxLife: number;
  delay: number;
  palette: ElementalPalette;
  seed: number;
  flip: boolean;
  style: 'serrated_vorpal' | 'phantom_scythe' | 'wind_razor' | 'dimension_cut';
  eccentricity: number;
  tiltAngle: number;
}

export interface DimensionCutLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  life: number;
  maxLife: number;
  delay: number;
  palette: ElementalPalette;
  shatterOnEnd: boolean;
}

export interface ChanneledBeam {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  angle: number;
  width: number;
  life: number;
  maxLife: number;
  palette: ElementalPalette;
  seed: number;
}

export interface ShockRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  thickness: number;
  life: number;
  maxLife: number;
  delay?: number;
  palette: ElementalPalette;
  perspectiveY: number;
  rotation: number;
  isHexagonal?: boolean;
}

export interface ChainWhip {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  life: number;
  maxLife: number;
  palette: ElementalPalette;
  scale: number;
}

export interface GiantSwordDrop {
  x: number;
  y: number;
  currentHeight: number;
  scale: number;
  life: number;
  maxLife: number;
  impacted: boolean;
  palette: ElementalPalette;
  casterId?: string;
}

export interface BlackHoleSingularity {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  rotation: number;
  life: number;
  maxLife: number;
  palette: ElementalPalette;
  casterId?: string;
}

export interface AcidPool {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  palette: ElementalPalette;
  seed: number;
  casterId?: string;
}

export interface VineWhip {
  points: Array<{ x: number; y: number }>;
  life: number;
  maxLife: number;
  palette: ElementalPalette;
  scale: number;
}

export interface SlimeAfterimage {
  x: number;
  y: number;
  z: number;
  radius: number;
  squashX: number;
  squashY: number;
  tiltAngle: number;
  color: string;
  coreColor: string;
  life: number;
  maxLife: number;
}

export interface HealTether {
  startX: number;
  startY: number;
  targetId: string;
  targetX: number;
  targetY: number;
  life: number;
  maxLife: number;
  palette: ElementalPalette;
}

export interface FloatingText {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  subtext?: string;
  color: string;
  life: number;
  maxLife: number;
  isCrit: boolean;
}

export interface SlimeSkillSlot {
  presetId: VfxPresetId;
  cooldown: number;
  maxCooldown: number;
}

export interface SlimeActor {
  id: string;
  name: string;
  roleTitle: string;
  team: 0 | 1;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  baseX: number;
  baseY: number;
  radius: number;
  color: string;
  coreColor: string;
  darkColor: string;
  defaultPalette: ElementalPaletteId;

  // Vitals & Shield
  hp: number;
  maxHp: number;
  shieldHp: number;
  maxShieldHp: number;

  // Desperation Flee State (when HP reaches 0)
  isDesperate: boolean;
  desperateTimer: number;
  lastAttackerId: string | null;
  sweatEmitTimer: number;

  // Active Leap / Dash State
  isLeaping: boolean;
  leapStartX: number;
  leapStartY: number;
  leapTargetX: number;
  leapTargetY: number;
  leapTimer: number;
  leapDuration: number;
  leapPalette?: ElementalPalette;

  isDashing: boolean;
  dashTimer: number;
  dashPoisonTrail: boolean;
  dashEmitTimer: number;
  dashPalette?: ElementalPalette;

  // Reactive Hit / Crowd-Control States
  hitFlashTimer: number;
  flattenTimer: number; // Pancake flattened state when smashed
  stunTimer: number; // Stars spinning overhead
  frozenTimer: number; // Ice crystal entombment
  shockTimer: number; // High-frequency electric jitter
  poisonTimer: number; // Bubbling venom DoT
  burnTimer: number; // Scorching fire DoT
  lunarMarkTimer: number;
  corrodeTimer?: number; // Acid melt / droop deformation
  rootTimer?: number; // Thorny vine entanglement
  soakedTimer?: number; // Hydro-bubble & water splash crown
  gravityStretchTimer?: number; // Black-hole spaghettification stretch

  // Active Buffs & 3D Spherical Shield Style
  shieldBuffTimer: number; // 3D Spherical shield duration
  mirrorCoatTimer: number; // Reflective frost sphere coat
  berserkBuffTimer: number; // Attack & cooldown haste aura
  regenBuffTimer: number; // Continuous healing aura
  shieldStyle?:
    | 'frost_sphere'
    | 'aegis_hex_sphere'
    | 'magma_sphere'
    | 'hydro_bubble_sphere'
    | 'briar_nature_sphere'
    | 'void_gravity_sphere';

  // Spring-Mass Teardrop Jelly Physics
  squashX: number;
  squashY: number;
  vSquash: number;
  wobblePhase: number;
  facingAngle: number;
  dropletTilt: number;

  // AI & Skill Cooldowns
  skills: SlimeSkillSlot[];
  lastCastPresetId?: VfxPresetId;
  aiDecisionTimer: number;
  hopTimer: number;

  // Class Tag Filter (e.g. ['fogo'] -> casts ONLY 'fogo' spells) & Tactical Personality
  allowedTags?: VfxTag[];
  personality?: SlimePersonality;
  tacticalState?: SlimeTacticalState;
  kitePhaseTimer?: number;
  strafeDir?: number;
  isCustomCharacter?: boolean;
  isPlayer?: boolean;

  // 4-Directional Custom PNG Sprite Overrides & Active Movement Direction
  moveDirection?: SlimeDirection;
  customSprites?: SlimeDirectionalSprites;

  // Walking Jelly Step Cycle, Procedural Region Discovery & Tag Affinity Socializing
  walkCyclePhase?: number;
  wanderTargetX?: number;
  wanderTargetY?: number;
  wanderTimer?: number;
  socialInteractTimer?: number;
  socialCooldownTimer?: number;
  socialPartnerId?: string | null;
  socialEmote?: string | null;
  proceduralDnaSeed?: number;
  currentRegionIndex?: number;
  currentRegionName?: string;
  visitedRegionsMask?: number;
  discoverySparkTimer?: number;
  socialDesire?: number; // 0..100 elaborate procedural desire to converse
  regionsExploredSinceLastChat?: number; // Regions discovered before wanting to chat
  treeChatSessionId?: string | null;
  treeChatBrawlTimer?: number;
  treeChatBrawlOpponentId?: string | null;
  voiceId?: string;
  voiceName?: string;

  // DNA Affinity & Relationship Bonds per Character ID
  dnaBonds?: Record<string, DnaRelationshipBond>;
  relationshipCapsule?: {
    tier: RelationshipTierId;
    label: string;
    textColor: string;
    borderColor: string;
    timer: number;
    maxTimer: number;
    partnerId: string;
  } | null;
  romanticSnugglePartnerId?: string | null;
  heartBubbleEmitTimer?: number;
}

export type RelationshipTierId =
  | 'inimigo_mortal'
  | 'inimigo'
  | 'rival'
  | 'desconhecido'
  | 'conhecido'
  | 'amigo'
  | 'melhor_amigo'
  | 'paquera'
  | 'par_romantico'
  | 'alma_gemea';

export interface DnaRelationshipBond {
  targetId: string;
  affinity: number; // -100 to +100
  romance: number; // 0 to 100
  trust: number; // -100 to +100
  rivalry: number; // 0 to 100
  interactionsCount: number;
  sameSpecies: boolean;
  tier: RelationshipTierId;
}

export interface PlayerMovementInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  sprint?: boolean;
}

export type SlimeDirection = 'up' | 'down' | 'left' | 'right';

export interface SlimeDirectionalSprites {
  up?: HTMLImageElement;
  down?: HTMLImageElement;
  left?: HTMLImageElement;
  right?: HTMLImageElement;
  upUrl?: string;
  downUrl?: string;
  leftUrl?: string;
  rightUrl?: string;
  scale?: number;
  folderName?: string;
}

export type ArenaFloorPresetId =
  | 'obsidian_grid'
  | 'magma_colosseum'
  | 'glacial_sanctuary'
  | 'chemtech_lab'
  | 'eden_courtyard'
  | 'checker_void';

export interface ArenaBackgroundConfig {
  presetId: ArenaFloorPresetId;
  customImage?: HTMLImageElement | null;
  customImageUrl?: string | null;
  customImageName?: string | null;
  showTacticalGrid: boolean;
  dimness: number; // 0.0 to 0.85 dark overlay for VFX readability
  fitMode: 'cover' | 'contain' | 'tile';
}

