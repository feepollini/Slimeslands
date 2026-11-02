import {
  ElementalPalette,
  SlimeActor,
  VfxPresetId,
} from '../types';

export type SkillAimGeometryType =
  | 'sniper_rail_corridor'
  | 'ballistic_arrow_salvo'
  | 'conic_breach_sector'
  | 'parabolic_artillery_drop'
  | 'kinetic_dash_vault'
  | 'tectonic_wall_barricade'
  | 'self_aegis_bastion'
  | 'chain_tether_corridor';

export interface SkillTacticalSpec {
  presetId: VfxPresetId;
  geometry: SkillAimGeometryType;
  labelPt: string;
  /** Maximum cast/attack distance from the player in world units (px) */
  maxRange: number;
  /** Optional minimum deadzone distance from the player */
  minRange: number;
  /** Cone spread angle in degrees (for conic_breach_sector & ballistic_arrow_salvo) */
  spreadDeg: number;
  /** Number of projectiles/rays (for ballistic_arrow_salvo or wall segments) */
  rayCount: number;
  /** Impact AoE radius or corridor half-width in world units */
  impactRadius: number;
  /** Corridor width for linear beams/chains/walls */
  corridorWidth: number;
  /** True if skill is centered on the caster regardless of cursor distance */
  selfCentered: boolean;
  /** True if projectiles ricochet to nearest secondary target */
  hasRicochet?: boolean;
  /** True if projectiles follow curved homing arcs */
  isHomingArc?: boolean;
}

export interface ClampedSkillAimResult {
  casterX: number;
  casterY: number;
  rawTargetX: number;
  rawTargetY: number;
  clampedX: number;
  clampedY: number;
  aimAngle: number;
  rawDistance: number;
  effectiveDistance: number;
  isOutOfRange: boolean;
  isInsideDeadzone: boolean;
  spec: SkillTacticalSpec;
  lockedTargets: SlimeActor[];
}

const DEFAULT_SPEC: Omit<SkillTacticalSpec, 'presetId'> = {
  geometry: 'parabolic_artillery_drop',
  labelPt: 'ZONA DE IMPACTO',
  maxRange: 640,
  minRange: 0,
  spreadDeg: 0,
  rayCount: 1,
  impactRadius: 135,
  corridorWidth: 64,
  selfCentered: false,
};

export const SKILL_TACTICAL_SPECS: Record<VfxPresetId, SkillTacticalSpec> = {
  // =========================================================================
  // 01-04 & 09-10: HACK & SLASH & MELEE (Short-to-Mid Cleaves, Cones & Vaults)
  // =========================================================================
  vorpal_combo: {
    presetId: 'vorpal_combo',
    geometry: 'conic_breach_sector',
    labelPt: 'CORTE VORPAL 115°',
    maxRange: 275,
    minRange: 0,
    spreadDeg: 115,
    rayCount: 4,
    impactRadius: 275,
    corridorWidth: 90,
    selfCentered: false,
  },
  judgement_cut: {
    presetId: 'judgement_cut',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'FENDA DIMENSIONAL',
    maxRange: 690,
    minRange: 60,
    spreadDeg: 0,
    rayCount: 6,
    impactRadius: 155,
    corridorWidth: 60,
    selfCentered: false,
  },
  reaper_scythe: {
    presetId: 'reaper_scythe',
    geometry: 'conic_breach_sector',
    labelPt: 'FOICE CEIFADORA 240°',
    maxRange: 310,
    minRange: 0,
    spreadDeg: 240,
    rayCount: 3,
    impactRadius: 310,
    corridorWidth: 120,
    selfCentered: false,
  },
  steel_tempest: {
    presetId: 'steel_tempest',
    geometry: 'chain_tether_corridor',
    labelPt: 'CORREDOR DE TORNADO',
    maxRange: 680,
    minRange: 0,
    spreadDeg: 18,
    rayCount: 1,
    impactRadius: 95,
    corridorWidth: 118,
    selfCentered: false,
  },
  blade_dance: {
    presetId: 'blade_dance',
    geometry: 'ballistic_arrow_salvo',
    labelPt: 'TELECINESE 6x LÂMINAS',
    maxRange: 740,
    minRange: 50,
    spreadDeg: 42,
    rayCount: 6,
    impactRadius: 125,
    corridorWidth: 60,
    selfCentered: false,
    isHomingArc: true,
  },
  world_ender: {
    presetId: 'world_ender',
    geometry: 'kinetic_dash_vault',
    labelPt: 'SALTO COLOSSAL CRATERA',
    maxRange: 470,
    minRange: 60,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 185,
    corridorWidth: 84,
    selfCentered: false,
  },

  // =========================================================================
  // 05-06 & 11-14: DISPAROS, EXPLOSÕES & BALÍSTICA (Long Snipes, Cones & Rockets)
  // =========================================================================
  thermobaric_cannon: {
    presetId: 'thermobaric_cannon',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'ARTILHARIA CLUSTER',
    maxRange: 780,
    minRange: 90,
    spreadDeg: 0,
    rayCount: 5,
    impactRadius: 165,
    corridorWidth: 64,
    selfCentered: false,
  },
  hextech_swarm: {
    presetId: 'hextech_swarm',
    geometry: 'ballistic_arrow_salvo',
    labelPt: 'ENXAME 10x MÍSSEIS HOMING',
    maxRange: 860,
    minRange: 80,
    spreadDeg: 58,
    rayCount: 7,
    impactRadius: 140,
    corridorWidth: 70,
    selfCentered: false,
    isHomingArc: true,
  },
  railgun_snipe: {
    presetId: 'railgun_snipe',
    geometry: 'sniper_rail_corridor',
    labelPt: 'RAILGUN HIPERSÔNICO MACH-5',
    maxRange: 1080,
    minRange: 110,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 68,
    corridorWidth: 62,
    selfCentered: false,
  },
  buckshot_blast: {
    presetId: 'buckshot_blast',
    geometry: 'conic_breach_sector',
    labelPt: 'CONE ESCOPETA INCENDIÁRIA 56°',
    maxRange: 430,
    minRange: 0,
    spreadDeg: 56,
    rayCount: 8,
    impactRadius: 430,
    corridorWidth: 90,
    selfCentered: false,
  },
  mega_rocket: {
    presetId: 'mega_rocket',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'OGIVA BALÍSTICA NUCLEAR',
    maxRange: 890,
    minRange: 120,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 215,
    corridorWidth: 76,
    selfCentered: false,
  },
  chrono_bomb: {
    presetId: 'chrono_bomb',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'DOMO CRONO-TEMPORAL',
    maxRange: 710,
    minRange: 60,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 175,
    corridorWidth: 60,
    selfCentered: false,
  },

  // =========================================================================
  // 07 & 15-19: GELO, CORRENTES, VENENO, NATUREZA & ILUSÃO
  // =========================================================================
  crystal_arrow: {
    presetId: 'crystal_arrow',
    geometry: 'ballistic_arrow_salvo',
    labelPt: 'FLECHA DE CRISTAL LONGO ALCANCE',
    maxRange: 940,
    minRange: 80,
    spreadDeg: 10,
    rayCount: 1,
    impactRadius: 150,
    corridorWidth: 52,
    selfCentered: false,
  },
  hellfire_chains: {
    presetId: 'hellfire_chains',
    geometry: 'chain_tether_corridor',
    labelPt: 'CORRENTES DE PUXÃO INFERNAL',
    maxRange: 640,
    minRange: 50,
    spreadDeg: 14,
    rayCount: 2,
    impactRadius: 95,
    corridorWidth: 82,
    selfCentered: false,
  },
  arctic_blizzard: {
    presetId: 'arctic_blizzard',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'NEVASCA ÁRTICA EM ÁREA',
    maxRange: 760,
    minRange: 0,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 195,
    corridorWidth: 70,
    selfCentered: false,
  },
  caustic_acid: {
    presetId: 'caustic_acid',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'BOMBARDEIO QUÍMICO CÁUSTICO',
    maxRange: 720,
    minRange: 60,
    spreadDeg: 0,
    rayCount: 3,
    impactRadius: 165,
    corridorWidth: 64,
    selfCentered: false,
  },
  thorn_roots: {
    presetId: 'thorn_roots',
    geometry: 'chain_tether_corridor',
    labelPt: 'TRILHA DE RAÍZES ESPINHOSAS',
    maxRange: 630,
    minRange: 40,
    spreadDeg: 22,
    rayCount: 3,
    impactRadius: 105,
    corridorWidth: 96,
    selfCentered: false,
  },
  mirror_shatter: {
    presetId: 'mirror_shatter',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'FRATURA DE ESPELHOS PRISMÁTICOS',
    maxRange: 670,
    minRange: 0,
    spreadDeg: 0,
    rayCount: 6,
    impactRadius: 160,
    corridorWidth: 64,
    selfCentered: false,
  },

  // =========================================================================
  // 08 & 20-24: MAGIAS CÓSMICAS, RAIOS, LASERS & ULTIMATES
  // =========================================================================
  void_cataclysm: {
    presetId: 'void_cataclysm',
    geometry: 'sniper_rail_corridor',
    labelPt: 'FEIXE DE PLASMA ABISSAL',
    maxRange: 920,
    minRange: 70,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 130,
    corridorWidth: 88,
    selfCentered: false,
  },
  cosmic_singularity: {
    presetId: 'cosmic_singularity',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'SINGULARIDADE BURACO NEGRO',
    maxRange: 810,
    minRange: 90,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 210,
    corridorWidth: 80,
    selfCentered: false,
  },
  divine_sword: {
    presetId: 'divine_sword',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'QUEDA DE ESPADA CELESTIAL',
    maxRange: 820,
    minRange: 60,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 175,
    corridorWidth: 72,
    selfCentered: false,
  },
  thunder_storm: {
    presetId: 'thunder_storm',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'TEMPESTADE DE RAIOS (4x)',
    maxRange: 850,
    minRange: 60,
    spreadDeg: 0,
    rayCount: 4,
    impactRadius: 180,
    corridorWidth: 70,
    selfCentered: false,
  },
  death_lotus: {
    presetId: 'death_lotus',
    geometry: 'conic_breach_sector',
    labelPt: 'VÓRTICE LÓTUS DE ADAGAS 360°',
    maxRange: 380,
    minRange: 0,
    spreadDeg: 360,
    rayCount: 12,
    impactRadius: 380,
    corridorWidth: 100,
    selfCentered: false,
  },
  tectonic_rupture: {
    presetId: 'tectonic_rupture',
    geometry: 'chain_tether_corridor',
    labelPt: 'FISSURA TECTÔNICA LINEAR',
    maxRange: 720,
    minRange: 50,
    spreadDeg: 0,
    rayCount: 5,
    impactRadius: 110,
    corridorWidth: 104,
    selfCentered: false,
  },

  // =========================================================================
  // 25-36: DASHS, PULOS C/ STUN, BARREIRAS DE ROCHA, CURAS & ESCUDOS
  // =========================================================================
  venom_dash: {
    presetId: 'venom_dash',
    geometry: 'kinetic_dash_vault',
    labelPt: 'AVANÇO TÓXICO VELOZ (DASH)',
    maxRange: 490,
    minRange: 60,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 95,
    corridorWidth: 72,
    selfCentered: false,
  },
  meteor_crush_leap: {
    presetId: 'meteor_crush_leap',
    geometry: 'kinetic_dash_vault',
    labelPt: 'SALTO METEORO C/ STUN',
    maxRange: 580,
    minRange: 80,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 165,
    corridorWidth: 78,
    selfCentered: false,
  },
  phantom_blade_dash: {
    presetId: 'phantom_blade_dash',
    geometry: 'kinetic_dash_vault',
    labelPt: 'CORTE FANTASMA TRANSLOCAÇÃO',
    maxRange: 560,
    minRange: 70,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 110,
    corridorWidth: 76,
    selfCentered: false,
  },
  sanctuary_aura_heal: {
    presetId: 'sanctuary_aura_heal',
    geometry: 'self_aegis_bastion',
    labelPt: 'SANTUÁRIO DE CURA EM ÁREA',
    maxRange: 290,
    minRange: 0,
    spreadDeg: 360,
    rayCount: 6,
    impactRadius: 290,
    corridorWidth: 60,
    selfCentered: true,
  },
  celestial_mend_beam: {
    presetId: 'celestial_mend_beam',
    geometry: 'self_aegis_bastion',
    labelPt: 'CONEXÃO DE CURA CELESTIAL',
    maxRange: 380,
    minRange: 0,
    spreadDeg: 360,
    rayCount: 4,
    impactRadius: 380,
    corridorWidth: 60,
    selfCentered: true,
  },
  aegis_dome_shield: {
    presetId: 'aegis_dome_shield',
    geometry: 'self_aegis_bastion',
    labelPt: 'DOMO PROTETOR ÉGIDE',
    maxRange: 210,
    minRange: 0,
    spreadDeg: 360,
    rayCount: 6,
    impactRadius: 210,
    corridorWidth: 50,
    selfCentered: true,
  },
  berserk_overdrive_buff: {
    presetId: 'berserk_overdrive_buff',
    geometry: 'self_aegis_bastion',
    labelPt: 'SOBRECARGA BERSERKER (SELF)',
    maxRange: 195,
    minRange: 0,
    spreadDeg: 360,
    rayCount: 4,
    impactRadius: 195,
    corridorWidth: 45,
    selfCentered: true,
  },
  glacial_mirror_coat: {
    presetId: 'glacial_mirror_coat',
    geometry: 'self_aegis_bastion',
    labelPt: ' ARMADURA DE ESPELHO GLACIAL',
    maxRange: 205,
    minRange: 0,
    spreadDeg: 360,
    rayCount: 6,
    impactRadius: 205,
    corridorWidth: 48,
    selfCentered: true,
  },
  earthen_bulwark: {
    presetId: 'earthen_bulwark',
    geometry: 'tectonic_wall_barricade',
    labelPt: 'MURALHA DE MONÓLITOS (5x)',
    maxRange: 540,
    minRange: 70,
    spreadDeg: 0,
    rayCount: 5,
    impactRadius: 135,
    corridorWidth: 240,
    selfCentered: false,
  },
  hellfire_cataclysm_zone: {
    presetId: 'hellfire_cataclysm_zone',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'CATACLISMO DE PILARES DE FOGO',
    maxRange: 750,
    minRange: 60,
    spreadDeg: 0,
    rayCount: 5,
    impactRadius: 185,
    corridorWidth: 70,
    selfCentered: false,
  },
  boulder_avalanche: {
    presetId: 'boulder_avalanche',
    geometry: 'chain_tether_corridor',
    labelPt: 'AVALANCHE DE ROCHA COLOSSAL',
    maxRange: 730,
    minRange: 70,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 135,
    corridorWidth: 112,
    selfCentered: false,
  },
  phoenix_rebirth_nova: {
    presetId: 'phoenix_rebirth_nova',
    geometry: 'self_aegis_bastion',
    labelPt: 'SUPERNOVA FÊNIX (AUTO-AOE)',
    maxRange: 340,
    minRange: 0,
    spreadDeg: 360,
    rayCount: 8,
    impactRadius: 340,
    corridorWidth: 80,
    selfCentered: true,
  },

  // =========================================================================
  // 37-48: GRIMÓRIO EXPANDIDO AAA
  // =========================================================================
  abyssal_tsunami: {
    presetId: 'abyssal_tsunami',
    geometry: 'conic_breach_sector',
    labelPt: 'ONDA TSUNAMI ABISSAL 52°',
    maxRange: 620,
    minRange: 50,
    spreadDeg: 52,
    rayCount: 5,
    impactRadius: 620,
    corridorWidth: 150,
    selfCentered: false,
  },
  hydro_maelstrom: {
    presetId: 'hydro_maelstrom',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'TURBILHÃO MAELSTROMOCEÂNICO',
    maxRange: 740,
    minRange: 60,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 195,
    corridorWidth: 75,
    selfCentered: false,
  },
  eden_overgrowth: {
    presetId: 'eden_overgrowth',
    geometry: 'self_aegis_bastion',
    labelPt: 'DESABROCHAR JARDIM DO ÉDEN',
    maxRange: 350,
    minRange: 0,
    spreadDeg: 360,
    rayCount: 8,
    impactRadius: 350,
    corridorWidth: 70,
    selfCentered: true,
  },
  dragon_breath_cone: {
    presetId: 'dragon_breath_cone',
    geometry: 'conic_breach_sector',
    labelPt: 'SOPRO DE DRAGÃO DRACÔNICO 68°',
    maxRange: 510,
    minRange: 0,
    spreadDeg: 68,
    rayCount: 7,
    impactRadius: 510,
    corridorWidth: 130,
    selfCentered: false,
  },
  volcanic_caldera: {
    presetId: 'volcanic_caldera',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'CALDEIRA VULCÂNICA EM ERUPÇÃO',
    maxRange: 760,
    minRange: 70,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 190,
    corridorWidth: 70,
    selfCentered: false,
  },
  absolute_zero_dome: {
    presetId: 'absolute_zero_dome',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'CÚPULA ZERO ABSOLUTO',
    maxRange: 740,
    minRange: 50,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 200,
    corridorWidth: 75,
    selfCentered: false,
  },
  necrotic_plague_cloud: {
    presetId: 'necrotic_plague_cloud',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'NUVEM DE PRAGA NECRÓTICA',
    maxRange: 720,
    minRange: 50,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 185,
    corridorWidth: 70,
    selfCentered: false,
  },
  solar_orbital_prism: {
    presetId: 'solar_orbital_prism',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'CONVERGÊNCIA DE PRISMAS SOLARES',
    maxRange: 840,
    minRange: 70,
    spreadDeg: 0,
    rayCount: 4,
    impactRadius: 175,
    corridorWidth: 68,
    selfCentered: false,
  },
  abyssal_tentacle_rift: {
    presetId: 'abyssal_tentacle_rift',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'FENDA DE TENTÁCULOS ABISSAIS',
    maxRange: 710,
    minRange: 50,
    spreadDeg: 0,
    rayCount: 5,
    impactRadius: 175,
    corridorWidth: 68,
    selfCentered: false,
  },
  tesla_chain_overload: {
    presetId: 'tesla_chain_overload',
    geometry: 'ballistic_arrow_salvo',
    labelPt: 'ARCO TESLA EM CADEIA (RICOCHETE)',
    maxRange: 760,
    minRange: 50,
    spreadDeg: 24,
    rayCount: 3,
    impactRadius: 145,
    corridorWidth: 64,
    selfCentered: false,
    hasRicochet: true,
  },
  tectonic_iron_maiden: {
    presetId: 'tectonic_iron_maiden',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'PRISÃO DE MONÓLITOS TECTÔNICOS',
    maxRange: 690,
    minRange: 60,
    spreadDeg: 0,
    rayCount: 6,
    impactRadius: 155,
    corridorWidth: 68,
    selfCentered: false,
  },
  seraphic_ascension: {
    presetId: 'seraphic_ascension',
    geometry: 'kinetic_dash_vault',
    labelPt: 'ASCENSÃO SERÁFICA DIVINA',
    maxRange: 620,
    minRange: 60,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 185,
    corridorWidth: 82,
    selfCentered: false,
  },

  // =========================================================================
  // 49-56: ESCUDOS ESFÉRICOS 3D TEXTURIZADOS & EXPANSÃO ELEMENTAL
  // =========================================================================
  cryo_sphere_aegis: {
    presetId: 'cryo_sphere_aegis',
    geometry: 'self_aegis_bastion',
    labelPt: 'ESFERA CRIOGÊNICA 3D (SELF)',
    maxRange: 215,
    minRange: 0,
    spreadDeg: 360,
    rayCount: 6,
    impactRadius: 215,
    corridorWidth: 50,
    selfCentered: true,
  },
  magma_carapace_sphere: {
    presetId: 'magma_carapace_sphere',
    geometry: 'self_aegis_bastion',
    labelPt: 'CARAPAÇA DE MAGMA 3D (SELF)',
    maxRange: 215,
    minRange: 0,
    spreadDeg: 360,
    rayCount: 6,
    impactRadius: 215,
    corridorWidth: 50,
    selfCentered: true,
  },
  hydro_bubble_sanctuary: {
    presetId: 'hydro_bubble_sanctuary',
    geometry: 'self_aegis_bastion',
    labelPt: 'BOLHA HIDRO-SANTUÁRIO 3D',
    maxRange: 225,
    minRange: 0,
    spreadDeg: 360,
    rayCount: 6,
    impactRadius: 225,
    corridorWidth: 50,
    selfCentered: true,
  },
  briar_thorn_dome: {
    presetId: 'briar_thorn_dome',
    geometry: 'self_aegis_bastion',
    labelPt: 'DOMO DE ESPINHOS BRIAR 3D',
    maxRange: 230,
    minRange: 0,
    spreadDeg: 360,
    rayCount: 6,
    impactRadius: 230,
    corridorWidth: 50,
    selfCentered: true,
  },
  void_event_barrier: {
    presetId: 'void_event_barrier',
    geometry: 'self_aegis_bastion',
    labelPt: 'HORIZONTE DE EVENTOS 3D',
    maxRange: 235,
    minRange: 0,
    spreadDeg: 360,
    rayCount: 6,
    impactRadius: 235,
    corridorWidth: 50,
    selfCentered: true,
  },
  tempest_cyclone_shield: {
    presetId: 'tempest_cyclone_shield',
    geometry: 'self_aegis_bastion',
    labelPt: 'ESCUDO CICLONE DE VENTO 3D',
    maxRange: 225,
    minRange: 0,
    spreadDeg: 360,
    rayCount: 6,
    impactRadius: 225,
    corridorWidth: 50,
    selfCentered: true,
  },
  venom_miasma_monsoon: {
    presetId: 'venom_miasma_monsoon',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'MONÇÃO DE MIASMA TÓXICO',
    maxRange: 760,
    minRange: 60,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 195,
    corridorWidth: 70,
    selfCentered: false,
  },
  astral_supernova_bastion: {
    presetId: 'astral_supernova_bastion',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'BASTIÃO SUPERNOVA ASTRAL',
    maxRange: 820,
    minRange: 70,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 205,
    corridorWidth: 76,
    selfCentered: false,
  },

  // =========================================================================
  // 57-64: FLECHEIROS, ATIRADORES KITER & INVOCADORES (LONG RANGE SPECIALISTS!)
  // =========================================================================
  ranger_arrow_volley: {
    presetId: 'ranger_arrow_volley',
    geometry: 'ballistic_arrow_salvo',
    labelPt: 'SALVA DE FLECHAS EM CONE (5x)',
    maxRange: 920,
    minRange: 75,
    spreadDeg: 38,
    rayCount: 5,
    impactRadius: 120,
    corridorWidth: 56,
    selfCentered: false,
  },
  sky_arrow_rain: {
    presetId: 'sky_arrow_rain',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'CHUVA DE FLECHAS PARABÓLICA',
    maxRange: 980,
    minRange: 110,
    spreadDeg: 0,
    rayCount: 14,
    impactRadius: 190,
    corridorWidth: 70,
    selfCentered: false,
  },
  locust_plague_swarm: {
    presetId: 'locust_plague_swarm',
    geometry: 'ballistic_arrow_salvo',
    labelPt: 'NUVEM DE GAFANHOTOS PERSEGUIDORA',
    maxRange: 840,
    minRange: 60,
    spreadDeg: 44,
    rayCount: 6,
    impactRadius: 155,
    corridorWidth: 68,
    selfCentered: false,
    isHomingArc: true,
  },
  hornet_hive_summon: {
    presetId: 'hornet_hive_summon',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'INVOCAÇÃO DE COLMEIA DE VESPAS',
    maxRange: 810,
    minRange: 60,
    spreadDeg: 0,
    rayCount: 5,
    impactRadius: 165,
    corridorWidth: 64,
    selfCentered: false,
  },
  piercing_sniper_shot: {
    presetId: 'piercing_sniper_shot',
    geometry: 'sniper_rail_corridor',
    labelPt: 'FLECHA SNIPER PERFURANTE ULTRA-ALCANCE',
    maxRange: 1160,
    minRange: 120,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 64,
    corridorWidth: 52,
    selfCentered: false,
  },
  bramble_snare_arrow: {
    presetId: 'bramble_snare_arrow',
    geometry: 'ballistic_arrow_salvo',
    labelPt: 'FLECHA DE ESPINHOS ENRAIZADORA',
    maxRange: 910,
    minRange: 80,
    spreadDeg: 14,
    rayCount: 1,
    impactRadius: 145,
    corridorWidth: 54,
    selfCentered: false,
  },
  scarab_beetle_barrage: {
    presetId: 'scarab_beetle_barrage',
    geometry: 'self_aegis_bastion',
    labelPt: 'ÓRBITA DE ESCARAVELHOS (AUTO-SWARM)',
    maxRange: 390,
    minRange: 0,
    spreadDeg: 360,
    rayCount: 8,
    impactRadius: 390,
    corridorWidth: 64,
    selfCentered: true,
  },
  frostbite_ricochet_arrow: {
    presetId: 'frostbite_ricochet_arrow',
    geometry: 'ballistic_arrow_salvo',
    labelPt: 'FLECHA GLACIAL C/ RICOCHETE TRIPLO',
    maxRange: 950,
    minRange: 80,
    spreadDeg: 16,
    rayCount: 1,
    impactRadius: 140,
    corridorWidth: 54,
    selfCentered: false,
    hasRicochet: true,
  },

  // =========================================================================
  // 65-82: ARSENAL OFICIAL DE ASSETS
  // =========================================================================
  ninja_shuriken_storm: {
    presetId: 'ninja_shuriken_storm',
    geometry: 'ballistic_arrow_salvo',
    labelPt: 'LEQUE DE SHURIKENS NINJA (5x)',
    maxRange: 820,
    minRange: 60,
    spreadDeg: 45,
    rayCount: 5,
    impactRadius: 110,
    corridorWidth: 54,
    selfCentered: false,
  },
  cryo_shuriken_prism: {
    presetId: 'cryo_shuriken_prism',
    geometry: 'ballistic_arrow_salvo',
    labelPt: 'TRÍADE DE SHURIKENS CRIOGÊNICOS',
    maxRange: 840,
    minRange: 60,
    spreadDeg: 28,
    rayCount: 3,
    impactRadius: 115,
    corridorWidth: 54,
    selfCentered: false,
  },
  carnivorous_plant_garden: {
    presetId: 'carnivorous_plant_garden',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'JARDIM DE PLANTAS CARNÍVORAS',
    maxRange: 690,
    minRange: 50,
    spreadDeg: 0,
    rayCount: 4,
    impactRadius: 165,
    corridorWidth: 64,
    selfCentered: false,
  },
  spike_trap_ambush: {
    presetId: 'spike_trap_ambush',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'EMBOSCADA DE ESPINHOS PERFURANTES',
    maxRange: 670,
    minRange: 50,
    spreadDeg: 0,
    rayCount: 5,
    impactRadius: 160,
    corridorWidth: 64,
    selfCentered: false,
  },
  vertical_portal_barrage: {
    presetId: 'vertical_portal_barrage',
    geometry: 'chain_tether_corridor',
    labelPt: 'BARRAGEM DE PORTAL DIMENSIONAL',
    maxRange: 790,
    minRange: 70,
    spreadDeg: 18,
    rayCount: 4,
    impactRadius: 120,
    corridorWidth: 108,
    selfCentered: false,
  },
  meteor_extinction_rain: {
    presetId: 'meteor_extinction_rain',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'CHUVA DE METEOROS DA EXTINÇÃO',
    maxRange: 960,
    minRange: 100,
    spreadDeg: 0,
    rayCount: 6,
    impactRadius: 220,
    corridorWidth: 80,
    selfCentered: false,
  },
  runic_swords_sanctuary: {
    presetId: 'runic_swords_sanctuary',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'SANTUÁRIO DE ESPADAS RÚNICAS',
    maxRange: 780,
    minRange: 60,
    spreadDeg: 0,
    rayCount: 6,
    impactRadius: 175,
    corridorWidth: 68,
    selfCentered: false,
  },
  mystic_lotus_pool: {
    presetId: 'mystic_lotus_pool',
    geometry: 'self_aegis_bastion',
    labelPt: 'LAGO MÍSTICO DE LÓTUS (SELF-AURA)',
    maxRange: 310,
    minRange: 0,
    spreadDeg: 360,
    rayCount: 6,
    impactRadius: 310,
    corridorWidth: 60,
    selfCentered: true,
  },
  stone_barrier_bulwark: {
    presetId: 'stone_barrier_bulwark',
    geometry: 'tectonic_wall_barricade',
    labelPt: 'BALUARTE DE ROCHA MACIÇA',
    maxRange: 550,
    minRange: 70,
    spreadDeg: 0,
    rayCount: 4,
    impactRadius: 130,
    corridorWidth: 230,
    selfCentered: false,
  },
  elemental_crag_wall: {
    presetId: 'elemental_crag_wall',
    geometry: 'tectonic_wall_barricade',
    labelPt: 'PAREDE DE PENHASCOS ELEMENTAIS',
    maxRange: 570,
    minRange: 70,
    spreadDeg: 0,
    rayCount: 5,
    impactRadius: 135,
    corridorWidth: 250,
    selfCentered: false,
  },
  fang_ridge_barricade: {
    presetId: 'fang_ridge_barricade',
    geometry: 'tectonic_wall_barricade',
    labelPt: 'BARRICADA DE PRESAS ROCHOSAS',
    maxRange: 540,
    minRange: 70,
    spreadDeg: 0,
    rayCount: 5,
    impactRadius: 130,
    corridorWidth: 235,
    selfCentered: false,
  },
  tectonic_monolith_surge: {
    presetId: 'tectonic_monolith_surge',
    geometry: 'tectonic_wall_barricade',
    labelPt: 'SURTO DE MONÓLITOS TECTÔNICOS',
    maxRange: 590,
    minRange: 70,
    spreadDeg: 0,
    rayCount: 5,
    impactRadius: 140,
    corridorWidth: 245,
    selfCentered: false,
  },
  embedded_greatsword_altar: {
    presetId: 'embedded_greatsword_altar',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'ALTAR DA MONTANTE CRAVADA',
    maxRange: 740,
    minRange: 60,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 170,
    corridorWidth: 68,
    selfCentered: false,
  },
  ancient_ruin_pillars: {
    presetId: 'ancient_ruin_pillars',
    geometry: 'tectonic_wall_barricade',
    labelPt: 'COLUNAS DE RUÍNAS ANCESTRAIS',
    maxRange: 610,
    minRange: 70,
    spreadDeg: 0,
    rayCount: 4,
    impactRadius: 145,
    corridorWidth: 240,
    selfCentered: false,
  },
  glacial_crystal_cluster: {
    presetId: 'glacial_crystal_cluster',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'AGLOMERADO DE CRISTAIS GLACIAIS',
    maxRange: 750,
    minRange: 50,
    spreadDeg: 0,
    rayCount: 5,
    impactRadius: 170,
    corridorWidth: 68,
    selfCentered: false,
  },
  thorny_vine_thicket: {
    presetId: 'thorny_vine_thicket',
    geometry: 'chain_tether_corridor',
    labelPt: 'BOSQUE DE VINHAS ESPINHOSAS',
    maxRange: 650,
    minRange: 50,
    spreadDeg: 24,
    rayCount: 4,
    impactRadius: 125,
    corridorWidth: 105,
    selfCentered: false,
  },
  arcane_splash_geyser: {
    presetId: 'arcane_splash_geyser',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'GÊISER DE ERUPÇÃO ARCANA',
    maxRange: 730,
    minRange: 50,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 165,
    corridorWidth: 64,
    selfCentered: false,
  },
  runic_sigil_invocation: {
    presetId: 'runic_sigil_invocation',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'INVOCAÇÃO DE SIGILO RÚNICO',
    maxRange: 770,
    minRange: 50,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 185,
    corridorWidth: 70,
    selfCentered: false,
  },
  fireball_orb: {
    presetId: 'fireball_orb',
    geometry: 'sniper_rail_corridor',
    labelPt: 'BOLA DE FOGO (ORBE PIROCLÁSTICO)',
    maxRange: 760,
    minRange: 45,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 135,
    corridorWidth: 74,
    selfCentered: false,
  },
  big_fire_ball_colossus: {
    presetId: 'big_fire_ball_colossus',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'BIG FIRE BALL (SOL COLOSSAL 3D)',
    maxRange: 840,
    minRange: 75,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 235,
    corridorWidth: 145,
    selfCentered: false,
  },
  expanding_flame_wave: {
    presetId: 'expanding_flame_wave',
    geometry: 'conic_breach_sector',
    labelPt: 'LABAREDA DE FOGO EXPANSIVA',
    maxRange: 620,
    minRange: 30,
    spreadDeg: 78,
    rayCount: 5,
    impactRadius: 620,
    corridorWidth: 180,
    selfCentered: false,
  },

  // =========================================================================
  // 86-95: ARSENAL ALQUÍMICO DE POÇÕES (ARREMESSO PARABÓLICO + ÁREA DE IMPACTO)
  // =========================================================================
  potion_toxic_miasma: {
    presetId: 'potion_toxic_miasma',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'POÇÃO NÉVOA VENENOSA (AOE 185px)',
    maxRange: 720,
    minRange: 50,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 185,
    corridorWidth: 70,
    selfCentered: false,
  },
  potion_frost_freeze: {
    presetId: 'potion_frost_freeze',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'POÇÃO CONGELAMENTO GLACIAL (AOE 180px)',
    maxRange: 710,
    minRange: 50,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 180,
    corridorWidth: 70,
    selfCentered: false,
  },
  potion_tar_sludge: {
    presetId: 'potion_tar_sludge',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'POÇÃO PICHE & LENTIDÃO 85% (AOE 195px)',
    maxRange: 680,
    minRange: 50,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 195,
    corridorWidth: 70,
    selfCentered: false,
  },
  potion_hellfire_conflagration: {
    presetId: 'potion_hellfire_conflagration',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'POÇÃO FOGO ALQUÍMICO (AOE 180px)',
    maxRange: 730,
    minRange: 50,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 180,
    corridorWidth: 70,
    selfCentered: false,
  },
  potion_corrosive_acid: {
    presetId: 'potion_corrosive_acid',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'POÇÃO ÁCIDO CORROSIVO (AOE 175px)',
    maxRange: 740,
    minRange: 50,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 175,
    corridorWidth: 70,
    selfCentered: false,
  },
  potion_shock_volt: {
    presetId: 'potion_shock_volt',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'POÇÃO CHOQUE VOLTAICO (AOE 175px)',
    maxRange: 750,
    minRange: 50,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 175,
    corridorWidth: 70,
    selfCentered: false,
  },
  potion_healing_mist: {
    presetId: 'potion_healing_mist',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'POÇÃO NÉVOA CURATIVA (AOE 190px)',
    maxRange: 700,
    minRange: 40,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 190,
    corridorWidth: 70,
    selfCentered: false,
  },
  potion_spectral_madness: {
    presetId: 'potion_spectral_madness',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'POÇÃO LOUCURA ESPECTRAL (AOE 180px)',
    maxRange: 720,
    minRange: 50,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 180,
    corridorWidth: 70,
    selfCentered: false,
  },
  potion_gravity_vortex: {
    presetId: 'potion_gravity_vortex',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'POÇÃO VÓRTICE GRAVITACIONAL (AOE 190px)',
    maxRange: 700,
    minRange: 50,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 190,
    corridorWidth: 70,
    selfCentered: false,
  },
  potion_smoke_screen: {
    presetId: 'potion_smoke_screen',
    geometry: 'parabolic_artillery_drop',
    labelPt: 'POÇÃO FUMAÇA OFUSCANTE (AOE 210px)',
    maxRange: 760,
    minRange: 40,
    spreadDeg: 0,
    rayCount: 1,
    impactRadius: 210,
    corridorWidth: 70,
    selfCentered: false,
  },
};

export function getSkillTacticalSpec(presetId: VfxPresetId): SkillTacticalSpec {
  const raw =
    SKILL_TACTICAL_SPECS[presetId] || {
      ...DEFAULT_SPEC,
      presetId,
    };

  // Compact tactical scale so ranges, cones, AoE circles, and corridors are proportional to character size
  const rangeScale = 0.42;
  const radiusScale = raw.geometry === 'conic_breach_sector' ? 0.42 : 0.36;
  const widthScale = raw.geometry === 'tectonic_wall_barricade' ? 0.42 : 0.38;
  const spreadScale = raw.spreadDeg >= 350 ? 1.0 : 0.78;

  return {
    ...raw,
    maxRange: Math.max(75, Math.round((raw.maxRange * rangeScale) / 5) * 5),
    minRange: raw.minRange > 0 ? Math.max(20, Math.round((raw.minRange * rangeScale) / 5) * 5) : 0,
    impactRadius: Math.max(28, Math.round(raw.impactRadius * radiusScale)),
    corridorWidth: Math.max(18, Math.round(raw.corridorWidth * widthScale)),
    spreadDeg: Math.round(raw.spreadDeg * spreadScale),
  };
}

/**
 * Computes the clamped target coordinates within the player's [minRange, maxRange]
 * and evaluates which enemy NPCs are currently locked inside the skill's geometric footprint!
 */
export function computeClampedSkillAim(
  casterX: number,
  casterY: number,
  rawTargetX: number,
  rawTargetY: number,
  presetId: VfxPresetId,
  slimes: SlimeActor[],
  casterId?: string
): ClampedSkillAimResult {
  const spec = getSkillTacticalSpec(presetId);
  const dx = rawTargetX - casterX;
  const dy = rawTargetY - casterY;
  const rawDistance = Math.hypot(dx, dy);
  const aimAngle = rawDistance > 0.001 ? Math.atan2(dy, dx) : 0;

  if (spec.selfCentered) {
    const locked = slimes.filter((s) => {
      if (s.id === casterId) return false;
      const d = Math.hypot(s.x - casterX, s.y - casterY);
      return d <= spec.impactRadius + s.radius;
    });
    return {
      casterX,
      casterY,
      rawTargetX,
      rawTargetY,
      clampedX: casterX,
      clampedY: casterY,
      aimAngle,
      rawDistance,
      effectiveDistance: 0,
      isOutOfRange: false,
      isInsideDeadzone: false,
      spec,
      lockedTargets: locked,
    };
  }

  const isOutOfRange = rawDistance > spec.maxRange;
  const isInsideDeadzone = spec.minRange > 0 && rawDistance < spec.minRange;

  const effectiveDistance = Math.max(
    spec.minRange,
    Math.min(spec.maxRange, rawDistance)
  );

  const clampedX = casterX + Math.cos(aimAngle) * effectiveDistance;
  const clampedY = casterY + Math.sin(aimAngle) * effectiveDistance;

  // Evaluate geometric hit-lock against all potential targets in the arena
  const lockedTargets: SlimeActor[] = [];
  for (let i = 0; i < slimes.length; i++) {
    const target = slimes[i];
    if (target.id === casterId) continue;

    if (
      isTargetInsideSkillGeometry(
        casterX,
        casterY,
        clampedX,
        clampedY,
        aimAngle,
        effectiveDistance,
        spec,
        target
      )
    ) {
      lockedTargets.push(target);
    }
  }

  return {
    casterX,
    casterY,
    rawTargetX,
    rawTargetY,
    clampedX,
    clampedY,
    aimAngle,
    rawDistance,
    effectiveDistance,
    isOutOfRange,
    isInsideDeadzone,
    spec,
    lockedTargets,
  };
}

function normalizeAngleDelta(a: number, b: number): number {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff);
}

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const lenSq = vx * vx + vy * vy;
  if (lenSq <= 0.0001) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / lenSq));
  return Math.hypot(px - (x1 + t * vx), py - (y1 + t * vy));
}

function isTargetInsideSkillGeometry(
  casterX: number,
  casterY: number,
  clampedX: number,
  clampedY: number,
  aimAngle: number,
  effectiveDistance: number,
  spec: SkillTacticalSpec,
  target: SlimeActor
): boolean {
  const tx = target.x;
  const ty = target.y;
  const tr = target.radius * 0.85;

  switch (spec.geometry) {
    case 'sniper_rail_corridor':
    case 'chain_tether_corridor': {
      const endX = casterX + Math.cos(aimAngle) * spec.maxRange;
      const endY = casterY + Math.sin(aimAngle) * spec.maxRange;
      const dSeg = distToSegment(tx, ty, casterX, casterY, endX, endY);
      return dSeg <= spec.corridorWidth * 0.5 + tr;
    }

    case 'conic_breach_sector': {
      const dCaster = Math.hypot(tx - casterX, ty - casterY);
      if (dCaster > spec.maxRange + tr) return false;
      if (spec.spreadDeg >= 350) return true;
      const angToTarget = Math.atan2(ty - casterY, tx - casterX);
      const halfSpreadRad = ((spec.spreadDeg * 0.5) * Math.PI) / 180;
      const angularPad = dCaster > 10 ? Math.atan2(tr, dCaster) : 0.22;
      return normalizeAngleDelta(angToTarget, aimAngle) <= halfSpreadRad + angularPad;
    }

    case 'ballistic_arrow_salvo': {
      const count = Math.max(1, spec.rayCount);
      const spreadRad = (spec.spreadDeg * Math.PI) / 180;
      const reach = Math.max(effectiveDistance, spec.maxRange * 0.85);
      for (let r = 0; r < count; r++) {
        const frac = count === 1 ? 0 : r / (count - 1) - 0.5;
        const rayAng = aimAngle + frac * spreadRad;
        const rx = casterX + Math.cos(rayAng) * reach;
        const ry = casterY + Math.sin(rayAng) * reach;
        if (distToSegment(tx, ty, casterX, casterY, rx, ry) <= 16 + tr) {
          return true;
        }
      }
      return Math.hypot(tx - clampedX, ty - clampedY) <= spec.impactRadius * 0.7 + tr;
    }

    case 'tectonic_wall_barricade': {
      const perpAngle = aimAngle + Math.PI * 0.5;
      const halfW = spec.corridorWidth * 0.5;
      const wx1 = clampedX - Math.cos(perpAngle) * halfW;
      const wy1 = clampedY - Math.sin(perpAngle) * halfW;
      const wx2 = clampedX + Math.cos(perpAngle) * halfW;
      const wy2 = clampedY + Math.sin(perpAngle) * halfW;
      return distToSegment(tx, ty, wx1, wy1, wx2, wy2) <= 22 + tr;
    }

    case 'kinetic_dash_vault': {
      const onPath =
        distToSegment(tx, ty, casterX, casterY, clampedX, clampedY) <=
        spec.corridorWidth * 0.5 + tr;
      const onLanding = Math.hypot(tx - clampedX, ty - clampedY) <= spec.impactRadius + tr;
      return onPath || onLanding;
    }

    case 'parabolic_artillery_drop':
    default: {
      return Math.hypot(tx - clampedX, ty - clampedY) <= spec.impactRadius + tr;
    }
  }
}

/**
 * Renders the compact Tactical Range Limit Perimeter & Skill Aiming Telemetry Preview
 * directly on the arena canvas ONLY while the player holds the attack click!
 */
export function renderSkillAimPreviewModule(
  ctx: CanvasRenderingContext2D,
  player: SlimeActor,
  hoverWorldX: number,
  hoverWorldY: number,
  presetId: VfxPresetId,
  palette: ElementalPalette,
  slimes: SlimeActor[]
) {
  const aim = computeClampedSkillAim(
    player.x,
    player.y,
    hoverWorldX,
    hoverWorldY,
    presetId,
    slimes,
    player.id
  );
  const {
    spec,
    casterX,
    casterY,
    clampedX,
    clampedY,
    aimAngle,
    effectiveDistance,
    isOutOfRange,
  } = aim;
  const now = performance.now() * 0.001;

  ctx.save();

  // 1. COMPACT OUTER MAXIMUM ATTACK RANGE PERIMETER RING (From Player)
  drawOuterAttackRangeBoundary(
    ctx,
    casterX,
    casterY,
    spec.maxRange,
    spec.minRange,
    aimAngle,
    palette,
    isOutOfRange,
    spec,
    now
  );

  // 2. BESPOKE COMPACT GEOMETRY TELEMETRY BY SKILL ARCHETYPE
  switch (spec.geometry) {
    case 'sniper_rail_corridor':
      drawSniperRailCorridorPreview(ctx, aim, palette, now);
      break;

    case 'ballistic_arrow_salvo':
      drawBallisticArrowSalvoPreview(ctx, aim, palette, slimes, now);
      break;

    case 'conic_breach_sector':
      drawConicBreachSectorPreview(ctx, aim, palette, now);
      break;

    case 'parabolic_artillery_drop':
      drawParabolicArtilleryDropPreview(ctx, aim, palette, now);
      break;

    case 'kinetic_dash_vault':
      drawKineticDashVaultPreview(ctx, aim, palette, now);
      break;

    case 'tectonic_wall_barricade':
      drawTectonicWallBarricadePreview(ctx, aim, palette, now);
      break;

    case 'self_aegis_bastion':
      drawSelfAegisBastionPreview(ctx, aim, palette, now);
      break;

    case 'chain_tether_corridor':
      drawChainTetherCorridorPreview(ctx, aim, palette, now);
      break;
  }

  // 3. OUT-OF-RANGE CLAMPING TETHER & CURSOR INDICATOR
  if (isOutOfRange && !spec.selfCentered) {
    ctx.save();
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.55)';
    ctx.lineWidth = 1.1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(clampedX, clampedY);
    ctx.lineTo(hoverWorldX, hoverWorldY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.translate(hoverWorldX, hoverWorldY);
    ctx.strokeStyle = '#FB7185';
    ctx.lineWidth = 1.4;
    const cr = 5;
    ctx.beginPath();
    ctx.moveTo(-cr, -cr);
    ctx.lineTo(cr, cr);
    ctx.moveTo(cr, -cr);
    ctx.lineTo(-cr, cr);
    ctx.stroke();
    ctx.restore();
  }

  // 4. REAL-TIME TARGET LOCK BRACKETS ON ENEMIES INSIDE THE PREVIEW GEOMETRY
  for (let i = 0; i < aim.lockedTargets.length; i++) {
    const t = aim.lockedTargets[i];
    drawTargetLockReticle(ctx, t, palette, now);
  }

  // 5. MICRO TELEMETRY READOUT PILL AT CLAMPED AIM POINT
  drawAimTelemetryReadoutPill(
    ctx,
    spec.selfCentered ? casterX : clampedX,
    (spec.selfCentered ? casterY - spec.impactRadius : clampedY) - 16,
    spec,
    Math.round(effectiveDistance),
    aim.lockedTargets.length,
    palette
  );

  ctx.restore();
}

function drawOuterAttackRangeBoundary(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  maxRange: number,
  minRange: number,
  aimAngle: number,
  palette: ElementalPalette,
  isOutOfRange: boolean,
  spec: SkillTacticalSpec,
  _now: number
) {
  ctx.save();
  ctx.translate(cx, cy);

  // Subtle dashed perimeter circle
  ctx.strokeStyle = isOutOfRange
    ? 'rgba(251, 113, 133, 0.48)'
    : 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1.1;
  ctx.setLineDash([7, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, maxRange, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Highlighted active sector arc along the outer range boundary in the direction of aimAngle
  const arcHalf = Math.max(0.2, ((spec.spreadDeg || 24) * 0.5 * Math.PI) / 180);
  ctx.strokeStyle = isOutOfRange ? '#FB7185' : palette.primary;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, 0, maxRange, aimAngle - arcHalf, aimAngle + arcHalf);
  ctx.stroke();

  // Minimum deadzone ring (if any)
  if (minRange > 0) {
    ctx.strokeStyle = 'rgba(251, 113, 133, 0.25)';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, minRange, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

/**
 * 1. SNIPER / RAILGUN / PIERCING BEAM TELEMETRY (Compact)
 */
function drawSniperRailCorridorPreview(
  ctx: CanvasRenderingContext2D,
  aim: ClampedSkillAimResult,
  palette: ElementalPalette,
  now: number
) {
  const { casterX, casterY, aimAngle, spec } = aim;
  const len = spec.maxRange;
  const halfW = spec.corridorWidth * 0.5;

  ctx.save();
  ctx.translate(casterX, casterY);
  ctx.rotate(aimAngle);

  const corrGrad = ctx.createLinearGradient(0, 0, len, 0);
  corrGrad.addColorStop(0, `${palette.primary}2E`);
  corrGrad.addColorStop(1, `${palette.core}38`);
  ctx.fillStyle = corrGrad;
  ctx.fillRect(spec.minRange, -halfW, len - spec.minRange, halfW * 2);

  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(spec.minRange, -halfW);
  ctx.lineTo(len, -halfW);
  ctx.moveTo(spec.minRange, halfW);
  ctx.lineTo(len, halfW);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.0;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len, 0);
  ctx.stroke();
  ctx.setLineDash([]);

  const chevronSpacing = 52;
  const scrollOffset = (now * 160) % chevronSpacing;
  ctx.strokeStyle = palette.core;
  ctx.lineWidth = 1.2;
  for (let d = spec.minRange + scrollOffset; d < len - 10; d += chevronSpacing) {
    ctx.beginPath();
    ctx.moveTo(d - 6, -halfW * 0.6);
    ctx.lineTo(d + 4, 0);
    ctx.lineTo(d - 6, halfW * 0.6);
    ctx.stroke();
  }

  ctx.translate(len, 0);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -halfW * 1.1);
  ctx.lineTo(8, 0);
  ctx.lineTo(0, halfW * 1.1);
  ctx.lineTo(-8, 0);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

/**
 * 2. BALLISTIC ARROW SALVO / SHURIKEN FAN / HOMING SWARM / RICOCHET TELEMETRY (Compact)
 */
function drawBallisticArrowSalvoPreview(
  ctx: CanvasRenderingContext2D,
  aim: ClampedSkillAimResult,
  palette: ElementalPalette,
  slimes: SlimeActor[],
  now: number
) {
  const { casterX, casterY, clampedX, clampedY, aimAngle, effectiveDistance, spec } = aim;
  const count = Math.max(1, spec.rayCount);
  const spreadRad = (spec.spreadDeg * Math.PI) / 180;
  const reach =
    count === 1 ? effectiveDistance : Math.max(effectiveDistance, spec.maxRange * 0.88);

  ctx.save();

  if (count > 1) {
    ctx.save();
    ctx.translate(casterX, casterY);
    const fanGrad = ctx.createRadialGradient(0, 0, 14, 0, 0, reach);
    fanGrad.addColorStop(0, `${palette.primary}22`);
    fanGrad.addColorStop(1, `${palette.primary}06`);
    ctx.fillStyle = fanGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, reach, aimAngle - spreadRad * 0.5, aimAngle + spreadRad * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  for (let r = 0; r < count; r++) {
    const frac = count === 1 ? 0 : r / (count - 1) - 0.5;
    const rayAng = aimAngle + frac * spreadRad;
    const endX = count === 1 ? clampedX : casterX + Math.cos(rayAng) * reach;
    const endY = count === 1 ? clampedY : casterY + Math.sin(rayAng) * reach;

    ctx.save();
    if (spec.isHomingArc) {
      const perpX = -Math.sin(aimAngle) * frac * 85;
      const perpY = Math.cos(aimAngle) * frac * 85;
      const ctrlX = (casterX + clampedX) * 0.5 + perpX;
      const ctrlY = (casterY + clampedY) * 0.5 + perpY;

      ctx.strokeStyle = r % 2 === 0 ? palette.primary : palette.core;
      ctx.lineWidth = 1.3;
      ctx.setLineDash([5, 4]);
      ctx.lineDashOffset = -now * 90;
      ctx.beginPath();
      ctx.moveTo(casterX, casterY);
      ctx.quadraticCurveTo(ctrlX, ctrlY, clampedX, clampedY);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle =
        count === 1 || r === Math.floor(count / 2) ? '#FFFFFF' : palette.primary;
      ctx.lineWidth = count === 1 ? 1.6 : 1.2;
      ctx.setLineDash([7, 4]);
      ctx.lineDashOffset = -now * 110;
      ctx.beginPath();
      ctx.moveTo(casterX, casterY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.translate(endX, endY);
      ctx.rotate(rayAng);
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = palette.primary;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(6.5, 0);
      ctx.lineTo(-5, -4);
      ctx.lineTo(-2.5, 0);
      ctx.lineTo(-5, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(clampedX, clampedY);
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(0, 0, Math.min(28, spec.impactRadius * 0.45), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (spec.hasRicochet) {
    const bounceCandidates = slimes
      .filter((s) => !s.isPlayer)
      .map((s) => ({ s, d: Math.hypot(s.x - clampedX, s.y - clampedY) }))
      .filter((item) => item.d <= 220)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);

    let prevX = clampedX;
    let prevY = clampedY;
    ctx.save();
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.3;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -now * 80;
    for (let b = 0; b < bounceCandidates.length; b++) {
      const next = bounceCandidates[b].s;
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
      prevX = next.x;
      prevY = next.y;
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * 3. CONIC BREACH SECTOR TELEMETRY (Compact)
 */
function drawConicBreachSectorPreview(
  ctx: CanvasRenderingContext2D,
  aim: ClampedSkillAimResult,
  palette: ElementalPalette,
  now: number
) {
  const { casterX, casterY, aimAngle, spec } = aim;
  const r = spec.maxRange;
  const spreadRad = (spec.spreadDeg * Math.PI) / 180;
  const startAng = aimAngle - spreadRad * 0.5;
  const endAng = aimAngle + spreadRad * 0.5;

  ctx.save();
  ctx.translate(casterX, casterY);

  const coneGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, r);
  coneGrad.addColorStop(0, `${palette.core}32`);
  coneGrad.addColorStop(0.6, `${palette.primary}22`);
  coneGrad.addColorStop(1, `${palette.primary}0C`);
  ctx.fillStyle = coneGrad;
  ctx.beginPath();
  if (spec.spreadDeg >= 350) {
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  } else {
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, startAng, endAng);
    ctx.closePath();
  }
  ctx.fill();

  ctx.strokeStyle = `${palette.primary}55`;
  ctx.lineWidth = 1.0;
  for (const frac of [0.5, 1.0]) {
    ctx.beginPath();
    ctx.arc(0, 0, r * frac, startAng, endAng);
    ctx.stroke();
  }

  const waveFrac = (now * 0.85) % 1;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = 1 - waveFrac * 0.75;
  ctx.beginPath();
  ctx.arc(0, 0, r * waveFrac, startAng, endAng);
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (spec.spreadDeg < 350) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(startAng) * r, Math.sin(startAng) * r);
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(endAng) * r, Math.sin(endAng) * r);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * 4. PARABOLIC ARTILLERY & GROUND AoE TELEMETRY (Compact)
 */
function drawParabolicArtilleryDropPreview(
  ctx: CanvasRenderingContext2D,
  aim: ClampedSkillAimResult,
  palette: ElementalPalette,
  now: number
) {
  const { casterX, casterY, clampedX, clampedY, effectiveDistance, spec } = aim;
  const r = spec.impactRadius;

  ctx.save();

  const midX = (casterX + clampedX) * 0.5;
  const arcHeight = Math.min(95, Math.max(28, effectiveDistance * 0.24));
  const midY = (casterY + clampedY) * 0.5 - arcHeight;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1.0;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(casterX, casterY);
  ctx.lineTo(clampedX, clampedY);
  ctx.stroke();

  ctx.strokeStyle = palette.core;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.lineDashOffset = -now * 95;
  ctx.beginPath();
  ctx.moveTo(casterX, casterY);
  ctx.quadraticCurveTo(midX, midY, clampedX, clampedY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.translate(clampedX, clampedY);

  const zoneGrad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
  zoneGrad.addColorStop(0, `${palette.core}30`);
  zoneGrad.addColorStop(0.6, `${palette.primary}1E`);
  zoneGrad.addColorStop(1, `${palette.primary}06`);
  ctx.fillStyle = zoneGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.1;
  ctx.setLineDash([5, 4]);
  ctx.save();
  ctx.rotate(now * 0.9);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.setLineDash([]);

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.lineTo(7, 0);
  ctx.moveTo(0, -7);
  ctx.lineTo(0, 7);
  ctx.stroke();

  ctx.restore();
}

/**
 * 5. KINETIC DASH & STUN LEAP TELEMETRY (Compact)
 */
function drawKineticDashVaultPreview(
  ctx: CanvasRenderingContext2D,
  aim: ClampedSkillAimResult,
  palette: ElementalPalette,
  now: number
) {
  const { casterX, casterY, clampedX, clampedY, aimAngle, effectiveDistance, spec } = aim;
  const halfW = spec.corridorWidth * 0.5;

  ctx.save();

  ctx.save();
  ctx.translate(casterX, casterY);
  ctx.rotate(aimAngle);
  const laneGrad = ctx.createLinearGradient(0, 0, effectiveDistance, 0);
  laneGrad.addColorStop(0, `${palette.primary}14`);
  laneGrad.addColorStop(1, `${palette.core}34`);
  ctx.fillStyle = laneGrad;
  ctx.fillRect(0, -halfW, effectiveDistance, halfW * 2);

  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 1.3;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(0, -halfW);
  ctx.lineTo(effectiveDistance, -halfW);
  ctx.moveTo(0, halfW);
  ctx.lineTo(effectiveDistance, halfW);
  ctx.stroke();
  ctx.setLineDash([]);

  const steps = 3;
  for (let s = 1; s <= steps; s++) {
    const d = (effectiveDistance * s) / (steps + 1);
    const pulse = (now * 3 + s * 0.25) % 1;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + (1 - pulse) * 0.35})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(d, 0, 9, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.translate(clampedX, clampedY);
  ctx.fillStyle = `${palette.primary}22`;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, spec.impactRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * 6. TECTONIC WALL & MONOLITH BARRICADE TELEMETRY (Compact)
 */
function drawTectonicWallBarricadePreview(
  ctx: CanvasRenderingContext2D,
  aim: ClampedSkillAimResult,
  palette: ElementalPalette,
  _now: number
) {
  const { casterX, casterY, clampedX, clampedY, aimAngle, spec } = aim;
  const wallLen = spec.corridorWidth;
  const wallThickness = 22;
  const pillarCount = Math.max(3, spec.rayCount);

  ctx.save();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 1.1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(casterX, casterY);
  ctx.lineTo(clampedX, clampedY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.translate(clampedX, clampedY);
  ctx.rotate(aimAngle + Math.PI * 0.5);

  ctx.fillStyle = `${palette.primary}22`;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-wallLen * 0.5, -wallThickness * 0.5, wallLen, wallThickness, 6);
  ctx.fill();
  ctx.stroke();

  const slotSpan = Math.max(16, wallLen - 18);
  for (let i = 0; i < pillarCount; i++) {
    const u = pillarCount === 1 ? 0 : i / (pillarCount - 1) - 0.5;
    const px = u * slotSpan;
    ctx.fillStyle = `${palette.core}40`;
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(px, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * 7. SELF AEGIS BASTION / 3D SPHERICAL SHIELD / AURA TELEMETRY (Compact)
 */
function drawSelfAegisBastionPreview(
  ctx: CanvasRenderingContext2D,
  aim: ClampedSkillAimResult,
  palette: ElementalPalette,
  now: number
) {
  const { casterX, casterY, spec } = aim;
  const r = spec.impactRadius;

  ctx.save();
  ctx.translate(casterX, casterY);

  const auraGrad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
  auraGrad.addColorStop(0, `${palette.primary}06`);
  auraGrad.addColorStop(0.75, `${palette.primary}1C`);
  auraGrad.addColorStop(1, `${palette.core}35`);
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  const nodes = Math.max(4, spec.rayCount);
  for (let i = 0; i < nodes; i++) {
    const a = (i * Math.PI * 2) / nodes + now * 1.2;
    const nx = Math.cos(a) * r;
    const ny = Math.sin(a) * r;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(nx, ny, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * 8. CHAIN TETHER / FISSURE / VINE CORRIDOR TELEMETRY (Compact)
 */
function drawChainTetherCorridorPreview(
  ctx: CanvasRenderingContext2D,
  aim: ClampedSkillAimResult,
  palette: ElementalPalette,
  now: number
) {
  const { casterX, casterY, aimAngle, spec } = aim;
  const len = spec.maxRange;
  const halfW = spec.corridorWidth * 0.5;

  ctx.save();
  ctx.translate(casterX, casterY);
  ctx.rotate(aimAngle);

  const laneGrad = ctx.createLinearGradient(0, 0, len, 0);
  laneGrad.addColorStop(0, `${palette.primary}26`);
  laneGrad.addColorStop(1, `${palette.core}1E`);
  ctx.fillStyle = laneGrad;
  ctx.beginPath();
  ctx.roundRect(0, -halfW, len, halfW * 2, 8);
  ctx.fill();

  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(0, -halfW, len, halfW * 2, 8);
  ctx.stroke();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  const steps = 20;
  for (let s = 0; s <= steps; s++) {
    const u = s / steps;
    const x = u * len;
    const y = Math.sin(u * Math.PI * 4 - now * 8) * (halfW * 0.48);
    if (s === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws compact tactical lock brackets around any enemy NPC currently inside the skill's geometry!
 */
function drawTargetLockReticle(
  ctx: CanvasRenderingContext2D,
  target: SlimeActor,
  palette: ElementalPalette,
  now: number
) {
  const r = target.radius * 1.15 + Math.sin(now * 8) * 1.5;
  const corner = 6;

  ctx.save();
  ctx.translate(target.x, target.y - target.z);
  ctx.strokeStyle = '#FFFFFF';
  ctx.shadowColor = palette.primary;
  ctx.shadowBlur = 5;
  ctx.lineWidth = 1.6;

  ctx.beginPath();
  ctx.moveTo(-r, -r + corner);
  ctx.lineTo(-r, -r);
  ctx.lineTo(-r + corner, -r);
  ctx.moveTo(r - corner, -r);
  ctx.lineTo(r, -r);
  ctx.lineTo(r, -r + corner);
  ctx.moveTo(r, r - corner);
  ctx.lineTo(r, r);
  ctx.lineTo(r - corner, r);
  ctx.moveTo(-r + corner, r);
  ctx.lineTo(-r, r);
  ctx.lineTo(-r, r - corner);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws a sleek micro telemetry pill above the clamped aim point
 */
function drawAimTelemetryReadoutPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spec: SkillTacticalSpec,
  distMeters: number,
  lockedCount: number,
  palette: ElementalPalette
) {
  ctx.save();
  ctx.translate(x, y);

  const lockBadge = lockedCount > 0 ? ` • 🎯${lockedCount}` : '';
  const text = `${distMeters}m/${spec.maxRange}m${lockBadge}`;

  ctx.font = 'bold 8px monospace';
  const textW = ctx.measureText(text).width;
  const pillW = textW + 12;
  const pillH = 15;

  ctx.fillStyle = 'rgba(7, 9, 15, 0.85)';
  ctx.strokeStyle = lockedCount > 0 ? '#FFFFFF' : palette.primary;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(-pillW * 0.5, -pillH * 0.5, pillW, pillH, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0.5);

  ctx.restore();
}

