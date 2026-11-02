import {
  AcidPool,
  ArenaBackgroundConfig,
  BlackHoleSingularity,
  ChainWhip,
  ChanneledBeam,
  DimensionCutLine,
  ElementalPalette,
  FacetedCrystal,
  FlamePillarZone,
  FloatingText,
  FrostVein,
  GiantSwordDrop,
  GroundRuneSigil,
  HealTether,
  Particle,
  PlayerMovementInput,
  RibbonProjectile,
  RockMonolith,
  ShaderParams,
  ShockRing,
  SlashBladeArc,
  SlimeActor,
  SlimeAfterimage,
  SlimeDirectionalSprites,
  VfxPresetId,
  VineWhip,
} from './types';
import { slimeVoiceEngine } from './modules/slimeVoiceModule';
import { fastNoise, getGlowSprite, removeSwapPop } from './core/mathLut';
import {
  getInstancedElementStamp,
  InstancedParticlePool,
} from './core/instancedPool';
import {
  getBeamPlasmaTextureSprite,
  getCelestialSwordTextureSprite,
  getErodedSlashFlipbook,
  getGroundDecalTextureSprite,
  getProceduralCrystalSprite,
  getShockwaveTextureSprite,
  getTornadoVortexTextureSprite,
  getVoronoiExplosionFlipbook,
} from './core/proceduralTextures';
import {
  detonateBoulderAvalancheModule,
  renderFlamePillarZonesModule,
  renderRockMonolithsModule,
  spawnBoulderAvalancheModule,
  spawnEarthenBulwarkModule,
  spawnHellfireCataclysmZoneModule,
  spawnPhoenixRebirthNovaModule,
} from './modules/environmentVfxModule';
import {
  renderHealTethersModule,
  renderSlimeAfterimagesModule,
  spawnAegisDomeShieldModule,
  spawnBerserkOverdriveBuffModule,
  spawnCelestialMendBeamModule,
  spawnGlacialMirrorCoatModule,
  spawnMeteorCrushLeapModule,
  spawnPhantomBladeDashModule,
  spawnSanctuaryAuraHealModule,
  spawnVenomDashModule,
} from './modules/mobilityAndSupportModule';
import {
  buildSkillLoadoutForTags,
  createArenaSlimes,
  getVisualsForClassTags,
  renderSlimeActorsModule,
  updateSlimesAIAndPhysicsModule,
} from './modules/slimeActorModule';
import {
  clearTreeChatSessions,
  renderTreeChatSessionsModule,
  updateTreeChatSessionsModule,
} from './modules/treeChatModule';
import { applyCombatActionToDnaBond } from './modules/treeChatProceduralStatsModule';
import {
  clearArcaneGrimoireEntities,
  getArcaneGrimoireEntityCount,
  renderArcaneGrimoireFrontModule,
  renderArcaneGrimoireGroundModule,
  spawnAbsoluteZeroDomeModule,
  spawnAbyssalTentacleRiftModule,
  spawnAbyssalTsunamiModule,
  spawnAstralSupernovaBastionModule,
  spawnBrambleSnareArrowModule,
  spawnBriarThornDomeModule,
  spawnCryoSphereAegisModule,
  spawnDragonBreathConeModule,
  spawnEdenOvergrowthModule,
  spawnExpandingFlameWaveModule,
  spawnFireballOrbModule,
  spawnBigFireBallColossusModule,
  spawnFrostbiteRicochetArrowModule,
  spawnHornetHiveSummonModule,
  spawnHydroBubbleSanctuaryModule,
  spawnHydroMaelstromModule,
  spawnLocustPlagueSwarmModule,
  spawnMagmaCarapaceSphereModule,
  spawnNecroticPlagueCloudModule,
  spawnPiercingSniperShotModule,
  spawnRangerArrowVolleyModule,
  spawnScarabBeetleBarrageModule,
  spawnSeraphicAscensionModule,
  spawnSkyArrowRainModule,
  spawnSolarOrbitalPrismModule,
  spawnTectonicIronMaidenModule,
  spawnTempestCycloneShieldModule,
  spawnTeslaChainOverloadModule,
  spawnVenomMiasmaMonsoonModule,
  spawnVoidEventBarrierModule,
  spawnVolcanicCalderaModule,
  updateArcaneGrimoireModule,
} from './modules/arcaneGrimoireModule';
import {
  preloadAllAssetsOfc,
} from './core/assetsOfcRegistry';
import {
  clearAssetsOfcEntities,
  getAssetsOfcEntityCount,
  renderAssetsOfcFrontModule,
  renderAssetsOfcGroundModule,
  spawnAncientRuinPillarsModule,
  spawnArcaneSplashGeyserModule,
  spawnCarnivorousPlantGardenModule,
  spawnCryoShurikenPrismModule,
  spawnElementalCragWallModule,
  spawnEmbeddedGreatswordAltarModule,
  spawnFangRidgeBarricadeModule,
  spawnGlacialCrystalClusterModule,
  spawnMeteorExtinctionRainModule,
  spawnMysticLotusPoolModule,
  spawnNinjaShurikenStormModule,
  spawnRunicSigilInvocationModule,
  spawnRunicSwordsSanctuaryModule,
  spawnSpikeTrapAmbushModule,
  spawnStoneBarrierBulwarkModule,
  spawnTectonicMonolithSurgeModule,
  spawnThornyVineThicketModule,
  spawnVerticalPortalBarrageModule,
  updateAssetsOfcModule,
} from './modules/assetsOfcSkillsModule';
import {
  computeClampedSkillAim,
  renderSkillAimPreviewModule,
} from './modules/skillAimPreviewModule';
import {
  renderPotionPuddlesGroundModule,
  renderThrownPotionsAirModule,
  spawnThrownPotionModule,
  updatePotionAlchemyModule,
} from './modules/potionAlchemyModule';
import { ELEMENTAL_PALETTES } from './presets';
import { soundEngine } from './soundEngine';

interface TornadoVortex {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  height: number;
  life: number;
  maxLife: number;
  palette: ElementalPalette;
  seed: number;
  casterId?: string;
  hitSlimeIds: Set<string>;
}

interface GroundDangerBox {
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
  life: number;
  maxLife: number;
  palette: ElementalPalette;
  style: 'slashing_cleave' | 'railgun_laser' | 'tectonic_lane';
}

interface ScheduledEruption {
  x: number;
  y: number;
  delay: number;
  radius: number;
  palette: ElementalPalette;
  type: 'tectonic_geyser' | 'sky_thunder';
  casterId?: string;
}

interface ImpactFlashFrame {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  palette: ElementalPalette;
}

export class VfxEngine {
  // Zero-GC Instanced Particle Pool
  public particlePool = new InstancedParticlePool(4096);
  public get particles(): Particle[] {
    return this.particlePool.active;
  }

  public crystals: FacetedCrystal[] = [];
  public rockMonoliths: RockMonolith[] = [];
  public flameZones: FlamePillarZone[] = [];
  public frostVeins: FrostVein[] = [];
  public groundRunes: GroundRuneSigil[] = [];
  public projectiles: RibbonProjectile[] = [];
  public slashArcs: SlashBladeArc[] = [];
  public dimensionCuts: DimensionCutLine[] = [];
  public beams: ChanneledBeam[] = [];
  public shockRings: ShockRing[] = [];
  public tornadoes: TornadoVortex[] = [];
  public chainWhips: ChainWhip[] = [];
  public giantSwords: GiantSwordDrop[] = [];
  public blackHoles: BlackHoleSingularity[] = [];
  public acidPools: AcidPool[] = [];
  public vineWhips: VineWhip[] = [];
  public afterimages: SlimeAfterimage[] = [];
  public healTethers: HealTether[] = [];
  public dangerBoxes: GroundDangerBox[] = [];
  public scheduledEruptions: ScheduledEruption[] = [];
  public floatingTexts: FloatingText[] = [];
  public impactFlashes: ImpactFlashFrame[] = [];

  // 4 Intelligent Semi-Spherical Teardrop Slimes
  public slimes: SlimeActor[] = [];
  public simulationEnabled = true;

  // Custom Arena Floor & Background Image Configuration
  public arenaBg: ArenaBackgroundConfig = {
    presetId: 'obsidian_grid',
    customImage: null,
    customImageUrl: null,
    customImageName: null,
    showTacticalGrid: true,
    dimness: 0.18,
    fitMode: 'cover',
  };

  public heroX = 250;
  public heroY = 400;

  public shakeX = 0;
  public shakeY = 0;
  private shakeTrauma = 0;
  private hitstopTimer = 0;
  public screenDarkness = 0;
  private projectileIdCounter = 1;

  public frameTimeMs = 0.22;
  private viewportWidth = 1280;
  private viewportHeight = 720;
  private width = 2750;
  private height = 1700;

  // Interactive Camera Pan & Zoom State
  public cameraX = 1375;
  public cameraY = 850;
  public cameraZoom = 0.68;
  private isBakePreview = false;

  // WASD Player Input State
  public playerInput: PlayerMovementInput = {
    up: false,
    down: false,
    left: false,
    right: false,
    sprint: false,
  };

  // Tactical Skill Range & Geometric Aim Preview State
  public aimPreviewState: {
    enabled: boolean;
    isAimingHold: boolean;
    hoverWorldX: number;
    hoverWorldY: number;
    activePresetId: VfxPresetId;
    activePalette: ElementalPalette;
  } = {
    enabled: true,
    isAimingHold: false,
    hoverWorldX: 1550,
    hoverWorldY: 850,
    activePresetId: 'crystal_arrow',
    activePalette: ELEMENTAL_PALETTES[5],
  };

  public setAimPreviewHover(worldX: number, worldY: number) {
    this.aimPreviewState.hoverWorldX = worldX;
    this.aimPreviewState.hoverWorldY = worldY;
  }

  public setAimPreviewHolding(isHolding: boolean) {
    this.aimPreviewState.isAimingHold = isHolding;
  }

  public setAimPreviewConfig(
    presetId: VfxPresetId,
    palette: ElementalPalette,
    enabled?: boolean
  ) {
    this.aimPreviewState.activePresetId = presetId;
    this.aimPreviewState.activePalette = palette;
    if (enabled !== undefined) {
      this.aimPreviewState.enabled = enabled;
    }
  }

  public setPlayerInput(input: Partial<PlayerMovementInput>) {
    Object.assign(this.playerInput, input);
  }

  public getPlayerSlime(): SlimeActor | undefined {
    return this.slimes.find((s) => s.isPlayer) || this.slimes[0];
  }

  constructor(width: number, height: number) {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.isBakePreview = width <= 512 && height <= 512;

    if (this.isBakePreview) {
      this.width = width;
      this.height = height;
      this.cameraZoom = 1.0;
      this.cameraX = width * 0.5;
      this.cameraY = height * 0.5;
    } else {
      // Expanded World Canvas so 10+ characters have ample room to explore & battle without crowding
      this.width = Math.max(2750, Math.round(width * 2.15));
      this.height = Math.max(1700, Math.round(height * 2.15));
      this.cameraZoom = 0.68;
      this.cameraX = this.width * 0.5;
      this.cameraY = this.height * 0.48;
    }

    preloadAllAssetsOfc();
    this.slimes = createArenaSlimes(this.width, this.height);
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }

  public getViewportWidth(): number {
    return this.viewportWidth;
  }

  public getViewportHeight(): number {
    return this.viewportHeight;
  }

  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.viewportWidth * 0.5) / this.cameraZoom + this.cameraX,
      y: (screenY - this.viewportHeight * 0.5) / this.cameraZoom + this.cameraY,
    };
  }

  public panCamera(dxScreen: number, dyScreen: number) {
    const padX = this.width * 0.25;
    const padY = this.height * 0.25;
    this.cameraX = Math.max(
      -padX,
      Math.min(this.width + padX, this.cameraX - dxScreen / this.cameraZoom)
    );
    this.cameraY = Math.max(
      -padY,
      Math.min(this.height + padY, this.cameraY - dyScreen / this.cameraZoom)
    );
  }

  public zoomCameraAt(nextZoom: number, screenX?: number, screenY?: number) {
    const clamped = Math.max(0.32, Math.min(2.25, nextZoom));
    const sx = screenX ?? this.viewportWidth * 0.5;
    const sy = screenY ?? this.viewportHeight * 0.5;
    const before = this.screenToWorld(sx, sy);
    this.cameraZoom = clamped;
    this.cameraX = before.x - (sx - this.viewportWidth * 0.5) / this.cameraZoom;
    this.cameraY = before.y - (sy - this.viewportHeight * 0.5) / this.cameraZoom;
  }

  public resetCamera() {
    this.cameraZoom = 0.68;
    this.cameraX = this.width * 0.5;
    this.cameraY = this.height * 0.48;
  }

  public nextProjectileId(): number {
    return this.projectileIdCounter++;
  }

  public spawnParticle(
    spec: Omit<Particle, 'trail'> & { trail?: Array<{ x: number; y: number }> }
  ): Particle {
    return this.particlePool.acquire(spec);
  }

  public resize(width: number, height: number) {
    this.viewportWidth = width;
    this.viewportHeight = height;
    if (!this.isBakePreview) {
      this.width = Math.max(this.width, Math.max(2750, Math.round(width * 2.15)));
      this.height = Math.max(this.height, Math.max(1700, Math.round(height * 2.15)));
    } else {
      this.width = width;
      this.height = height;
    }
    if (this.slimes.length === 0) {
      this.slimes = createArenaSlimes(this.width, this.height);
    }
  }

  public clearAll() {
    this.particlePool.clearAll();
    this.crystals.length = 0;
    this.rockMonoliths.length = 0;
    this.flameZones.length = 0;
    this.frostVeins.length = 0;
    this.groundRunes.length = 0;
    this.projectiles.length = 0;
    this.slashArcs.length = 0;
    this.dimensionCuts.length = 0;
    this.beams.length = 0;
    this.shockRings.length = 0;
    this.tornadoes.length = 0;
    this.chainWhips.length = 0;
    this.giantSwords.length = 0;
    this.blackHoles.length = 0;
    this.acidPools.length = 0;
    this.vineWhips.length = 0;
    this.afterimages.length = 0;
    this.healTethers.length = 0;
    this.dangerBoxes.length = 0;
    this.scheduledEruptions.length = 0;
    this.floatingTexts.length = 0;
    this.impactFlashes.length = 0;
    this.screenDarkness = 0;
    clearArcaneGrimoireEntities();
    clearAssetsOfcEntities();
    clearTreeChatSessions();
    // Preserve custom characters (> 4), custom 4-directional sprites, and class tags across arena resets
    const prevSlimes = [...this.slimes];
    const freshDefaults = createArenaSlimes(this.width, this.height);

    for (let i = 0; i < freshDefaults.length; i++) {
      const def = freshDefaults[i];
      const prev = prevSlimes.find((p) => p.id === def.id);
      if (prev) {
        def.name = prev.name;
        def.team = prev.team;
        def.personality = prev.personality;
        def.customSprites = prev.customSprites;
        if (prev.allowedTags) {
          def.allowedTags = [...prev.allowedTags];
          const vis = getVisualsForClassTags(def.allowedTags);
          def.roleTitle = vis.roleTitle;
          def.skills = buildSkillLoadoutForTags(def.allowedTags, i * 3);
        }
      }
    }

    const extraCustomSlimes = prevSlimes
      .filter((p) => p.isCustomCharacter)
      .map((p, idx) => ({
        ...p,
        x: p.baseX,
        y: p.baseY,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        hp: p.maxHp,
        shieldHp: 0,
        isDesperate: false,
        desperateTimer: 0,
        lastAttackerId: null,
        isLeaping: false,
        isDashing: false,
        hitFlashTimer: 0,
        flattenTimer: 0,
        stunTimer: 0,
        frozenTimer: 0,
        shockTimer: 0,
        poisonTimer: 0,
        burnTimer: 0,
        corrodeTimer: 0,
        rootTimer: 0,
        soakedTimer: 0,
        gravityStretchTimer: 0,
        shieldBuffTimer: 0,
        mirrorCoatTimer: 0,
        berserkBuffTimer: 0,
        regenBuffTimer: 0,
        squashX: 1,
        squashY: 1,
        skills: buildSkillLoadoutForTags(p.allowedTags, idx * 5 + 2),
      }));

    this.slimes = [...freshDefaults, ...extraCustomSlimes];
  }

  public getActiveEntityCount(): number {
    return (
      this.particles.length +
      this.crystals.length +
      this.rockMonoliths.length +
      this.flameZones.length +
      this.projectiles.length +
      this.slashArcs.length +
      this.dimensionCuts.length +
      this.groundRunes.length +
      this.shockRings.length +
      this.tornadoes.length +
      this.chainWhips.length +
      this.giantSwords.length +
      this.blackHoles.length +
      this.acidPools.length +
      this.vineWhips.length +
      this.afterimages.length +
      this.healTethers.length +
      getArcaneGrimoireEntityCount() +
      getAssetsOfcEntityCount()
    );
  }

  public addTrauma(_amount: number, _scale: number) {
    // Screen shake permanently disabled per user request
    this.shakeTrauma = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  public triggerHitstop(ms: number) {
    if (ms > 0) {
      this.hitstopTimer = Math.max(this.hitstopTimer, ms / 1000);
    }
  }

  /**
   * Manual trigger from UI or Canvas pointer click (picks nearest friendly slime as caster)
   */
  public triggerPreset(
    preset: VfxPresetId,
    targetX: number,
    targetY: number,
    palette: ElementalPalette,
    params: ShaderParams
  ) {
    const caster = this.slimes[0];
    if (caster) {
      this.triggerPresetFromCaster(caster, preset, targetX, targetY, palette, params);
    } else {
      this.dispatchPresetInternal(
        undefined,
        this.heroX,
        this.heroY,
        preset,
        targetX,
        targetY,
        palette,
        params
      );
    }
  }

  /**
   * Autonomous or Directed Cast from a specific SlimeActor
   * Automatically clamps target coordinates to the skill's tactical [minRange, maxRange] limit!
   */
  public triggerPresetFromCaster(
    caster: SlimeActor,
    preset: VfxPresetId,
    targetX: number,
    targetY: number,
    palette: ElementalPalette,
    params: ShaderParams
  ) {
    const clampedAim = computeClampedSkillAim(
      caster.x,
      caster.y,
      targetX,
      targetY,
      preset,
      this.slimes,
      caster.id
    );
    const finalTargetX = clampedAim.clampedX;
    const finalTargetY = clampedAim.clampedY;

    caster.lastCastPresetId = preset;
    caster.facingAngle = clampedAim.aimAngle;
    caster.squashX = 1.26;
    caster.squashY = 0.78;

    this.dispatchPresetInternal(
      caster,
      caster.x,
      caster.y,
      preset,
      finalTargetX,
      finalTargetY,
      palette,
      params
    );
  }

  private dispatchPresetInternal(
    caster: SlimeActor | undefined,
    casterX: number,
    casterY: number,
    preset: VfxPresetId,
    targetX: number,
    targetY: number,
    palette: ElementalPalette,
    params: ShaderParams
  ) {
    soundEngine.setEnabled(params.enableSound);
    const scale =
      params.effectScale *
      0.7 *
      (caster && caster.berserkBuffTimer > 0 ? 1.18 : 1.0);
    const pMult = params.particleMultiplier;

    const dx = targetX - casterX;
    const dy = targetY - casterY;
    const aimAngle = Math.atan2(dy, dx);
    const cid = caster?.id;

    switch (preset) {
      // 01-08: Original 8 Effects
      case 'vorpal_combo':
        this.spawnVorpalCombo(casterX, casterY, targetX, targetY, aimAngle, palette, scale, pMult, params, cid);
        break;
      case 'judgement_cut':
        this.spawnJudgementCut(targetX, targetY, palette, scale, pMult, params, cid);
        break;
      case 'reaper_scythe':
        this.spawnReaperScythe(targetX, targetY, aimAngle, palette, scale, pMult, params, cid);
        break;
      case 'steel_tempest':
        this.spawnSteelTempest(casterX, casterY, aimAngle, palette, scale, pMult, params, cid);
        break;
      case 'thermobaric_cannon':
        this.spawnThermobaricCannon(casterX, casterY, targetX, targetY, aimAngle, palette, scale, pMult, cid);
        break;
      case 'hextech_swarm':
        this.spawnHextechSwarm(casterX, casterY, targetX, targetY, aimAngle, palette, scale, cid);
        break;
      case 'crystal_arrow':
        this.spawnCrystalArrow(casterX, casterY, targetX, targetY, aimAngle, palette, scale, cid);
        break;
      case 'void_cataclysm':
        this.spawnVoidCataclysm(casterX, casterY, targetX, targetY, aimAngle, palette, scale, pMult, params, cid);
        break;

      // 09-24: Expanded 16 Effects
      case 'blade_dance':
        this.spawnBladeDance(casterX, casterY, targetX, targetY, palette, scale, params, cid);
        break;
      case 'world_ender':
        this.spawnWorldEnder(casterX, casterY, targetX, targetY, aimAngle, palette, scale, pMult, params, cid);
        break;
      case 'railgun_snipe':
        this.spawnRailgunSnipe(casterX, casterY, targetX, targetY, aimAngle, palette, scale, pMult, params, cid);
        break;
      case 'buckshot_blast':
        this.spawnBuckshotBlast(casterX, casterY, aimAngle, palette, scale, pMult, params, cid);
        break;
      case 'mega_rocket':
        this.spawnMegaRocket(casterX, casterY, targetX, targetY, aimAngle, palette, scale, cid);
        break;
      case 'chrono_bomb':
        this.spawnChronoBomb(casterX, casterY, targetX, targetY, aimAngle, palette, scale, cid);
        break;
      case 'hellfire_chains':
        this.spawnHellfireChains(casterX, casterY, targetX, targetY, aimAngle, palette, scale, pMult, params, cid);
        break;
      case 'arctic_blizzard':
        this.spawnArcticBlizzard(targetX, targetY, palette, scale, pMult, params, cid);
        break;
      case 'caustic_acid':
        this.spawnCausticAcid(casterX, casterY, targetX, targetY, aimAngle, palette, scale, cid);
        break;
      case 'thorn_roots':
        this.spawnThornRoots(casterX, casterY, targetX, targetY, aimAngle, palette, scale, pMult, params, cid);
        break;
      case 'mirror_shatter':
        this.spawnMirrorShatter(targetX, targetY, palette, scale, pMult, params, cid);
        break;
      case 'cosmic_singularity':
        this.spawnCosmicSingularity(targetX, targetY, palette, scale, pMult, params, cid);
        break;
      case 'divine_sword':
        this.spawnDivineSword(targetX, targetY, palette, scale, cid);
        break;
      case 'thunder_storm':
        this.spawnThunderStorm(targetX, targetY, palette, scale, cid);
        break;
      case 'death_lotus':
        this.spawnDeathLotus(targetX, targetY, palette, scale, pMult, params, cid);
        break;
      case 'tectonic_rupture':
        this.spawnTectonicRupture(casterX, casterY, aimAngle, palette, scale, cid);
        break;

      // 25-32: Mobility (Dashes, Stun Leaps) & Support (Heals, Shields, Buffs) Module
      case 'venom_dash':
        spawnVenomDashModule(this, caster, casterX, casterY, targetX, targetY, aimAngle, palette, scale, pMult);
        break;
      case 'meteor_crush_leap':
        spawnMeteorCrushLeapModule(this, caster, casterX, casterY, targetX, targetY, palette, scale, pMult, params);
        break;
      case 'phantom_blade_dash':
        spawnPhantomBladeDashModule(this, caster, casterX, casterY, targetX, targetY, aimAngle, palette, scale, pMult, params);
        break;
      case 'sanctuary_aura_heal':
        spawnSanctuaryAuraHealModule(this, casterX, casterY, palette, scale, pMult, cid);
        break;
      case 'celestial_mend_beam':
        spawnCelestialMendBeamModule(this, casterX, casterY, palette, scale, pMult, cid);
        break;
      case 'aegis_dome_shield':
        spawnAegisDomeShieldModule(this, caster, casterX, casterY, palette, scale, pMult);
        break;
      case 'berserk_overdrive_buff':
        spawnBerserkOverdriveBuffModule(this, caster, casterX, casterY, palette, scale, pMult);
        break;
      case 'glacial_mirror_coat':
        spawnGlacialMirrorCoatModule(this, caster, casterX, casterY, palette, scale, pMult);
        break;

      // 33-36: Environment Module (2.5D Rock Monolith Barriers, Area Flame Pillars, Colossal Boulders, Phoenix Nova)
      case 'earthen_bulwark':
        spawnEarthenBulwarkModule(this, casterX, casterY, targetX, targetY, aimAngle, palette, scale, pMult, params, cid);
        break;
      case 'hellfire_cataclysm_zone':
        spawnHellfireCataclysmZoneModule(this, targetX, targetY, palette, scale, pMult, params, cid);
        break;
      case 'boulder_avalanche':
        spawnBoulderAvalancheModule(this, casterX, casterY, targetX, targetY, aimAngle, palette, scale, cid);
        break;
      case 'phoenix_rebirth_nova':
        spawnPhoenixRebirthNovaModule(this, casterX, casterY, palette, scale, pMult, params, cid);
        break;

      // 37-48: Expanded Arcane Grimoire Module (12 Spells with Custom Shaders & Enemy Reactions)
      case 'abyssal_tsunami':
        spawnAbyssalTsunamiModule(this, casterX, casterY, targetX, targetY, aimAngle, palette, scale, pMult, params, cid);
        break;
      case 'hydro_maelstrom':
        spawnHydroMaelstromModule(this, targetX, targetY, palette, scale, pMult, params, cid);
        break;
      case 'eden_overgrowth':
        spawnEdenOvergrowthModule(this, caster, casterX, casterY, palette, scale, pMult, params);
        break;
      case 'dragon_breath_cone':
        spawnDragonBreathConeModule(this, casterX, casterY, aimAngle, palette, scale, pMult, params, cid);
        break;
      case 'volcanic_caldera':
        spawnVolcanicCalderaModule(this, targetX, targetY, palette, scale, pMult, params, cid);
        break;
      case 'absolute_zero_dome':
        spawnAbsoluteZeroDomeModule(this, targetX, targetY, palette, scale, pMult, params, cid);
        break;
      case 'necrotic_plague_cloud':
        spawnNecroticPlagueCloudModule(this, targetX, targetY, palette, scale, pMult, params, cid);
        break;
      case 'solar_orbital_prism':
        spawnSolarOrbitalPrismModule(this, targetX, targetY, palette, scale, pMult, params, cid);
        break;
      case 'abyssal_tentacle_rift':
        spawnAbyssalTentacleRiftModule(this, targetX, targetY, palette, scale, pMult, params, cid);
        break;
      case 'tesla_chain_overload':
        spawnTeslaChainOverloadModule(this, casterX, casterY, targetX, targetY, palette, scale, pMult, params, cid);
        break;
      case 'tectonic_iron_maiden':
        spawnTectonicIronMaidenModule(this, targetX, targetY, palette, scale, pMult, params, cid);
        break;
      case 'seraphic_ascension':
        spawnSeraphicAscensionModule(this, caster, casterX, casterY, targetX, targetY, palette, scale, pMult, params);
        break;

      // 49-56: 3D Spherical Shields & Elemental Expansion
      case 'cryo_sphere_aegis':
        spawnCryoSphereAegisModule(this, caster, casterX, casterY, palette, scale, pMult, params);
        break;
      case 'magma_carapace_sphere':
        spawnMagmaCarapaceSphereModule(this, caster, casterX, casterY, palette, scale, pMult, params);
        break;
      case 'hydro_bubble_sanctuary':
        spawnHydroBubbleSanctuaryModule(this, caster, casterX, casterY, palette, scale, pMult, params);
        break;
      case 'briar_thorn_dome':
        spawnBriarThornDomeModule(this, caster, casterX, casterY, palette, scale, pMult, params);
        break;
      case 'void_event_barrier':
        spawnVoidEventBarrierModule(this, caster, casterX, casterY, palette, scale, pMult, params);
        break;
      case 'tempest_cyclone_shield':
        spawnTempestCycloneShieldModule(this, caster, casterX, casterY, palette, scale, pMult, params);
        break;
      case 'venom_miasma_monsoon':
        spawnVenomMiasmaMonsoonModule(this, targetX, targetY, palette, scale, pMult, params, cid);
        break;
      case 'astral_supernova_bastion':
        spawnAstralSupernovaBastionModule(this, caster, casterX, casterY, targetX, targetY, palette, scale, pMult, params);
        break;

      // 57-64: Flecheiros (Kiter), Disparos à Distância & Invocadores de Enxame de Insetos
      case 'ranger_arrow_volley':
        spawnRangerArrowVolleyModule(this, caster, casterX, casterY, aimAngle, palette, scale, params);
        break;
      case 'sky_arrow_rain':
        spawnSkyArrowRainModule(this, caster, casterX, casterY, targetX, targetY, palette, scale, params);
        break;
      case 'locust_plague_swarm':
        spawnLocustPlagueSwarmModule(this, caster, casterX, casterY, targetX, targetY, palette, scale, params);
        break;
      case 'hornet_hive_summon':
        spawnHornetHiveSummonModule(this, caster, casterX, casterY, targetX, targetY, palette, scale, params);
        break;
      case 'piercing_sniper_shot':
        spawnPiercingSniperShotModule(this, caster, casterX, casterY, aimAngle, palette, scale, params);
        break;
      case 'bramble_snare_arrow':
        spawnBrambleSnareArrowModule(this, caster, casterX, casterY, aimAngle, palette, scale, params);
        break;
      case 'scarab_beetle_barrage':
        spawnScarabBeetleBarrageModule(this, caster, casterX, casterY, palette, scale, params);
        break;
      case 'frostbite_ricochet_arrow':
        spawnFrostbiteRicochetArrowModule(this, caster, casterX, casterY, aimAngle, palette, scale, params);
        break;

      // 65-82: Arsenal Oficial de Assets (1 Habilidade dedicada por pasta de Asset, sem misturar pastas)
      case 'ninja_shuriken_storm':
        spawnNinjaShurikenStormModule(this, caster, casterX, casterY, aimAngle, palette, scale, params);
        break;
      case 'cryo_shuriken_prism':
        spawnCryoShurikenPrismModule(this, caster, casterX, casterY, aimAngle, palette, scale, params);
        break;
      case 'carnivorous_plant_garden':
        spawnCarnivorousPlantGardenModule(this, caster, casterX, casterY, targetX, targetY, palette, scale, params);
        break;
      case 'spike_trap_ambush':
        spawnSpikeTrapAmbushModule(this, caster, casterX, casterY, targetX, targetY, palette, scale, params);
        break;
      case 'vertical_portal_barrage':
        spawnVerticalPortalBarrageModule(this, caster, casterX, casterY, targetX, targetY, aimAngle, palette, scale, params);
        break;
      case 'meteor_extinction_rain':
        spawnMeteorExtinctionRainModule(this, caster, targetX, targetY, palette, scale, params);
        break;
      case 'runic_swords_sanctuary':
        spawnRunicSwordsSanctuaryModule(this, caster, casterX, casterY, targetX, targetY, palette, scale, params);
        break;
      case 'mystic_lotus_pool':
        spawnMysticLotusPoolModule(this, caster, casterX, casterY, palette, scale, params);
        break;
      case 'stone_barrier_bulwark':
        spawnStoneBarrierBulwarkModule(this, caster, targetX, targetY, palette, scale);
        break;
      case 'elemental_crag_wall':
        spawnElementalCragWallModule(this, caster, targetX, targetY, palette, scale);
        break;
      case 'fang_ridge_barricade':
        spawnFangRidgeBarricadeModule(this, caster, targetX, targetY, palette, scale);
        break;
      case 'tectonic_monolith_surge':
        spawnTectonicMonolithSurgeModule(this, caster, targetX, targetY, palette, scale);
        break;
      case 'embedded_greatsword_altar':
        spawnEmbeddedGreatswordAltarModule(this, caster, targetX, targetY, palette, scale);
        break;
      case 'ancient_ruin_pillars':
        spawnAncientRuinPillarsModule(this, caster, targetX, targetY, palette, scale);
        break;
      case 'glacial_crystal_cluster':
        spawnGlacialCrystalClusterModule(this, caster, targetX, targetY, palette, scale);
        break;
      case 'thorny_vine_thicket':
        spawnThornyVineThicketModule(this, caster, targetX, targetY, palette, scale);
        break;
      case 'arcane_splash_geyser':
        spawnArcaneSplashGeyserModule(this, caster, targetX, targetY, palette, scale);
        break;
      case 'runic_sigil_invocation':
        spawnRunicSigilInvocationModule(this, caster, targetX, targetY, palette, scale);
        break;

      // 83-85: Arsenal Piroclástico Especial (Bola de Fogo, Big Fire Ball & Labareda Expansiva)
      case 'fireball_orb':
        spawnFireballOrbModule(this, casterX, casterY, targetX, targetY, aimAngle, palette, scale, params, cid);
        break;
      case 'big_fire_ball_colossus':
        spawnBigFireBallColossusModule(this, casterX, casterY, targetX, targetY, aimAngle, palette, scale, params, cid);
        break;
      case 'expanding_flame_wave':
        spawnExpandingFlameWaveModule(this, casterX, casterY, aimAngle, palette, scale, params, cid);
        break;

      // 86-95: Arsenal Alquímico de Poções Arremessáveis (10 Poções com Giro 3D no Ar & Dano em Área)
      case 'potion_toxic_miasma':
      case 'potion_frost_freeze':
      case 'potion_tar_sludge':
      case 'potion_hellfire_conflagration':
      case 'potion_corrosive_acid':
      case 'potion_shock_volt':
      case 'potion_healing_mist':
      case 'potion_spectral_madness':
      case 'potion_gravity_vortex':
      case 'potion_smoke_screen':
        spawnThrownPotionModule(this, caster, casterX, casterY, targetX, targetY, preset, palette, scale, params, cid);
        break;
    }
  }

  // ============================================================================
  // 01 - 24 PRESET IMPLEMENTATIONS (WITH INSTANCED PARTICLE POOLING)
  // ============================================================================
  private spawnVorpalCombo(
    casterX: number,
    casterY: number,
    x: number,
    y: number,
    aimAngle: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playSlash(1.1);

    this.slashArcs.push({
      x,
      y,
      radius: 120 * scale,
      thickness: 34 * scale,
      startAngle: aimAngle - 1.55,
      sweepAngle: 2.95,
      life: 0,
      maxLife: 0.21,
      delay: 0,
      palette,
      seed: Math.random() * 100,
      flip: false,
      style: 'serrated_vorpal',
      eccentricity: 0.65,
      tiltAngle: aimAngle - 0.35,
    });

    this.slashArcs.push({
      x: x + Math.cos(aimAngle) * 14,
      y: y + Math.sin(aimAngle) * 14,
      radius: 130 * scale,
      thickness: 38 * scale,
      startAngle: aimAngle + 1.65,
      sweepAngle: -3.1,
      life: 0,
      maxLife: 0.22,
      delay: 0.1,
      palette,
      seed: Math.random() * 100,
      flip: true,
      style: 'serrated_vorpal',
      eccentricity: 0.62,
      tiltAngle: aimAngle + 0.4,
    });

    this.slashArcs.push({
      x,
      y,
      radius: 145 * scale,
      thickness: 44 * scale,
      startAngle: aimAngle - Math.PI,
      sweepAngle: Math.PI * 1.88,
      life: 0,
      maxLife: 0.25,
      delay: 0.2,
      palette,
      seed: Math.random() * 100,
      flip: false,
      style: 'serrated_vorpal',
      eccentricity: 0.52,
      tiltAngle: aimAngle,
    });

    const crossAngles = [aimAngle - 0.78, aimAngle + 0.78];
    crossAngles.forEach((ang, idx) => {
      const len = 180 * scale;
      this.dimensionCuts.push({
        x1: x - Math.cos(ang) * len,
        y1: y - Math.sin(ang) * len,
        x2: x + Math.cos(ang) * len,
        y2: y + Math.sin(ang) * len,
        width: 14 * scale,
        life: 0,
        maxLife: 0.32,
        delay: 0.3 + idx * 0.03,
        palette,
        shatterOnEnd: false,
      });
    });

    this.impactFlashes.push({
      x,
      y,
      radius: 140 * scale,
      life: 0,
      maxLife: 0.09,
      palette,
    });

    const emberCount = Math.floor(34 * pMult);
    for (let i = 0; i < emberCount; i++) {
      const spread = aimAngle + (Math.random() - 0.5) * 2.4;
      const spd = (180 + Math.random() * 480) * scale;
      const eY = y + (Math.random() - 0.5) * 32;
      this.spawnParticle({
        x: x + (Math.random() - 0.5) * 32,
        y: eY,
        z: 12,
        vx: Math.cos(spread) * spd,
        vy: Math.sin(spread) * spd,
        vz: 80,
        size: (3.5 + Math.random() * 5) * scale,
        color: i % 3 === 0 ? palette.accent : palette.primary,
        coreColor: palette.core,
        alpha: 1,
        life: 0,
        maxLife: 0.25 + Math.random() * 0.35,
        drag: 0.92,
        gravity: 340,
        bounce: 0.55,
        floorY: eY + 32,
        type: i % 2 === 0 ? 'slash_ember' : 'needle_spark',
        rotation: spread,
        vRot: 0,
        stretch: 3.0,
        seed: i,
      });
    }

    this.applyAreaEffect(x, y, 160 * scale, 1840, 'VORPAL X4!', palette, {
      casterId,
      knockbackForce: 260,
      originX: casterX,
      originY: casterY,
    });
    this.addTrauma(0.55, params.screenShakeIntensity);
  }

  private spawnJudgementCut(
    x: number,
    y: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playSlash(1.45);
    soundEngine.playCrystalShatter();
    this.screenDarkness = 0.65;

    this.shockRings.push({
      x,
      y,
      radius: 135 * scale,
      maxRadius: 12 * scale,
      thickness: 6 * scale,
      life: 0,
      maxLife: 0.18,
      palette,
      perspectiveY: 0.92,
      rotation: 0,
    });

    const cutCount = 15;
    for (let i = 0; i < cutCount; i++) {
      const ang = (i / cutCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const offsetDist = (Math.random() - 0.5) * 58 * scale;
      const cx = x + Math.cos(ang + Math.PI / 2) * offsetDist;
      const cy = y + Math.sin(ang + Math.PI / 2) * offsetDist;
      const halfLen = (85 + Math.random() * 65) * scale;

      this.dimensionCuts.push({
        x1: cx - Math.cos(ang) * halfLen,
        y1: cy - Math.sin(ang) * halfLen,
        x2: cx + Math.cos(ang) * halfLen,
        y2: cy + Math.sin(ang) * halfLen,
        width: (4.5 + (i % 3) * 3.5) * scale,
        life: 0,
        maxLife: 0.28 + (i % 4) * 0.04,
        delay: i * 0.014,
        palette,
        shatterOnEnd: i === cutCount - 1,
      });
    }

    const shardCount = Math.floor(28 * pMult);
    for (let i = 0; i < shardCount; i++) {
      const ang = (Math.PI * 2 * i) / shardCount;
      const spd = (140 + Math.random() * 360) * scale;
      this.spawnParticle({
        x: x + (Math.random() - 0.5) * 60 * scale,
        y: y + (Math.random() - 0.5) * 60 * scale,
        z: 10,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        vz: 50,
        size: (8 + Math.random() * 10) * scale,
        color: i % 2 === 0 ? palette.primary : palette.accent,
        coreColor: palette.core,
        alpha: 1,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.28,
        drag: 0.93,
        gravity: 160,
        bounce: 0.4,
        floorY: y + 80,
        type: 'reality_shard',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 18,
        stretch: 1,
        seed: i,
      });
    }

    this.applyAreaEffect(x, y, 165 * scale, 2450, 'JUDGEMENT CUT!', palette, {
      casterId,
      lunarMark: true,
    });
    this.addTrauma(0.62, params.screenShakeIntensity);
  }

  private spawnReaperScythe(
    x: number,
    y: number,
    aimAngle: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playSlash(0.68);
    this.screenDarkness = 0.45;

    this.slashArcs.push({
      x,
      y,
      radius: 170 * scale,
      thickness: 56 * scale,
      startAngle: aimAngle - 2.35,
      sweepAngle: 4.7,
      life: 0,
      maxLife: 0.32,
      delay: 0,
      palette,
      seed: Math.random() * 100,
      flip: false,
      style: 'phantom_scythe',
      eccentricity: 0.58,
      tiltAngle: aimAngle,
    });

    this.slashArcs.push({
      x,
      y,
      radius: 190 * scale,
      thickness: 32 * scale,
      startAngle: aimAngle + 2.35,
      sweepAngle: -4.7,
      life: 0,
      maxLife: 0.34,
      delay: 0.08,
      palette,
      seed: Math.random() * 100 + 50,
      flip: true,
      style: 'phantom_scythe',
      eccentricity: 0.58,
      tiltAngle: aimAngle,
    });

    this.groundRunes.push({
      x,
      y,
      radius: 25,
      maxRadius: 160 * scale,
      rotation: aimAngle,
      vRot: -2.4,
      life: 0,
      maxLife: 0.55,
      style: 'void_eye',
      palette,
      perspectiveY: 0.55,
    });

    this.applyAreaEffect(x, y, 190 * scale, 2120, 'CEIFADOR!', palette, {
      casterId,
      knockbackForce: -290,
      originX: x,
      originY: y,
    });
    this.addTrauma(0.58, params.screenShakeIntensity);
  }

  private spawnSteelTempest(
    casterX: number,
    casterY: number,
    aimAngle: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playSlash(1.25);

    this.slashArcs.push({
      x: casterX + Math.cos(aimAngle) * 65,
      y: casterY + Math.sin(aimAngle) * 65,
      radius: 98 * scale,
      thickness: 28 * scale,
      startAngle: aimAngle - 1.3,
      sweepAngle: 2.6,
      life: 0,
      maxLife: 0.22,
      delay: 0,
      palette,
      seed: Math.random() * 100,
      flip: false,
      style: 'wind_razor',
      eccentricity: 0.55,
      tiltAngle: aimAngle,
    });

    const speed = 620;
    this.tornadoes.push({
      x: casterX + Math.cos(aimAngle) * 40,
      y: casterY + Math.sin(aimAngle) * 40,
      vx: Math.cos(aimAngle) * speed,
      vy: Math.sin(aimAngle) * speed,
      radius: 56 * scale,
      height: 160 * scale,
      life: 0,
      maxLife: 1.0,
      palette,
      seed: Math.random() * 100,
      casterId,
      hitSlimeIds: new Set(),
    });
  }

  private spawnThermobaricCannon(
    casterX: number,
    casterY: number,
    targetX: number,
    targetY: number,
    aimAngle: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    casterId?: string
  ) {
    soundEngine.playSkillshotLaunch();
    const speed = 1220;
    const muzzleX = casterX + Math.cos(aimAngle) * 36;
    const muzzleY = casterY + Math.sin(aimAngle) * 36;

    const dist = Math.hypot(targetX - muzzleX, targetY - muzzleY);
    this.projectiles.push({
      id: this.projectileIdCounter++,
      preset: 'thermobaric_cannon',
      casterId,
      x: muzzleX,
      y: muzzleY,
      startX: muzzleX,
      startY: muzzleY,
      controlX: (muzzleX + targetX) * 0.5,
      controlY: (muzzleY + targetY) * 0.5,
      targetX,
      targetY,
      vx: Math.cos(aimAngle) * speed,
      vy: Math.sin(aimAngle) * speed,
      speed,
      angle: aimAngle,
      progress: 0,
      useBezier: false,
      life: 0,
      maxLife: Math.max(0.06, dist / speed),
      scale,
      palette,
      history: [],
    });
  }

  private detonateThermobaric(
    x: number,
    y: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    isClusterSub = false,
    casterId?: string
  ) {
    soundEngine.playArcaneImpact();
    const s = isClusterSub ? scale * 0.52 : scale;

    if (!isClusterSub) {
      this.impactFlashes.push({
        x,
        y,
        radius: 170 * s,
        life: 0,
        maxLife: 0.09,
        palette,
      });
    }

    this.shockRings.push({
      x,
      y,
      radius: 10,
      maxRadius: 180 * s,
      thickness: 12 * s,
      life: 0,
      maxLife: 0.36,
      palette,
      perspectiveY: 0.55,
      rotation: 0,
    });

    const lobeCount = Math.floor((isClusterSub ? 8 : 18) * pMult);
    for (let i = 0; i < lobeCount; i++) {
      const ang = (Math.PI * 2 * i) / lobeCount;
      const spd = (35 + Math.random() * 185) * s;
      this.spawnParticle({
        x: x + (Math.random() - 0.5) * 18 * s,
        y: y + (Math.random() - 0.5) * 14 * s,
        z: 14,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.65 - 35,
        vz: 70,
        size: (20 + Math.random() * 24) * s,
        color: i % 2 === 0 ? palette.primary : palette.secondary,
        coreColor: palette.core,
        alpha: 1,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.25,
        drag: 0.91,
        gravity: -85,
        bounce: 0,
        floorY: y + 999,
        type: 'fireball_lobe',
        rotation: 0,
        vRot: 0,
        stretch: 1,
        seed: i,
      });
    }

    if (!isClusterSub) {
      for (let k = 0; k < 4; k++) {
        const subAng = (k / 4) * Math.PI * 2 + 0.45;
        const subDist = (85 + Math.random() * 35) * scale;
        const subTX = x + Math.cos(subAng) * subDist;
        const subTY = y + Math.sin(subAng) * subDist * 0.68;
        this.projectiles.push({
          id: this.projectileIdCounter++,
          preset: 'thermobaric_cannon',
          casterId,
          x,
          y,
          startX: x,
          startY: y,
          controlX: (x + subTX) * 0.5,
          controlY: Math.min(y, subTY) - 95 * scale,
          targetX: subTX,
          targetY: subTY,
          vx: 0,
          vy: 0,
          speed: 420,
          angle: subAng,
          progress: 0,
          useBezier: true,
          life: 0,
          maxLife: 0.28 + k * 0.04,
          scale: scale * 0.65,
          palette,
          history: [],
          isClusterSub: true,
        });
      }
    }

    this.applyAreaEffect(
      x,
      y,
      160 * s,
      isClusterSub ? 620 : 2180,
      isClusterSub ? 'CLUSTER!' : 'BOOM TERMOBÁRICO!',
      palette,
      {
        casterId,
        knockbackForce: isClusterSub ? 110 : 320,
        originX: x,
        originY: y,
      }
    );
    this.addTrauma(isClusterSub ? 0.22 : 0.72, params.screenShakeIntensity);
  }

  private spawnHextechSwarm(
    casterX: number,
    casterY: number,
    targetX: number,
    targetY: number,
    aimAngle: number,
    palette: ElementalPalette,
    scale: number,
    casterId?: string
  ) {
    soundEngine.playSkillshotLaunch();

    this.groundRunes.push({
      x: targetX,
      y: targetY,
      radius: 15,
      maxRadius: 115 * scale,
      rotation: 0,
      vRot: 2.2,
      life: 0,
      maxLife: 0.85,
      style: 'hextech_astrolabe',
      palette,
      perspectiveY: 0.58,
    });

    const missileCount = 10;
    const perpAngle = aimAngle + Math.PI / 2;

    for (let i = 0; i < missileCount; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const tier = Math.floor(i / 2) + 1;
      const arcSpread = (75 + tier * 52) * side * scale;
      const midX = (casterX + targetX) * 0.45 + Math.cos(perpAngle) * arcSpread;
      const midY = (casterY + targetY) * 0.45 + Math.sin(perpAngle) * arcSpread - 45 * scale;
      const tx = targetX + (Math.random() - 0.5) * 65 * scale;
      const ty = targetY + (Math.random() - 0.5) * 45 * scale;

      this.projectiles.push({
        id: this.projectileIdCounter++,
        preset: 'hextech_swarm',
        casterId,
        x: casterX,
        y: casterY,
        startX: casterX,
        startY: casterY,
        controlX: midX,
        controlY: midY,
        targetX: tx,
        targetY: ty,
        vx: 0,
        vy: 0,
        speed: 800,
        angle: aimAngle,
        progress: 0,
        useBezier: true,
        life: 0,
        maxLife: 0.34 + i * 0.04,
        scale: scale * 0.82,
        palette,
        history: [],
      });
    }
  }

  private detonateHextechMissile(
    x: number,
    y: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playArcaneImpact(0.6);

    this.shockRings.push({
      x,
      y,
      radius: 6,
      maxRadius: 70 * scale,
      thickness: 5 * scale,
      life: 0,
      maxLife: 0.24,
      palette,
      perspectiveY: 0.62,
      rotation: Math.random() * Math.PI,
      isHexagonal: true,
    });

    const count = Math.floor(8 * pMult);
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count;
      const spd = (95 + Math.random() * 200) * scale;
      this.spawnParticle({
        x,
        y,
        z: 10,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        vz: 40,
        size: (4 + Math.random() * 4) * scale,
        color: i % 2 === 0 ? palette.primary : palette.secondary,
        coreColor: palette.core,
        alpha: 1,
        life: 0,
        maxLife: 0.24,
        drag: 0.91,
        gravity: 120,
        bounce: 0.4,
        floorY: y + 40,
        type: i % 3 === 0 ? 'hex_glyph' : 'needle_spark',
        rotation: ang,
        vRot: 6,
        stretch: 2.2,
        seed: i,
      });
    }

    this.applyAreaEffect(x, y, 85 * scale, 360, 'HEX-POD', palette, { casterId });
  }

  private spawnCrystalArrow(
    casterX: number,
    casterY: number,
    targetX: number,
    targetY: number,
    aimAngle: number,
    palette: ElementalPalette,
    scale: number,
    casterId?: string
  ) {
    soundEngine.playSkillshotLaunch();
    const speed = 1150;
    const muzzleX = casterX + Math.cos(aimAngle) * 36;
    const muzzleY = casterY + Math.sin(aimAngle) * 36;

    const dist = Math.hypot(targetX - muzzleX, targetY - muzzleY);
    this.projectiles.push({
      id: this.projectileIdCounter++,
      preset: 'crystal_arrow',
      casterId,
      x: muzzleX,
      y: muzzleY,
      startX: muzzleX,
      startY: muzzleY,
      controlX: (muzzleX + targetX) * 0.5,
      controlY: (muzzleY + targetY) * 0.5,
      targetX,
      targetY,
      vx: Math.cos(aimAngle) * speed,
      vy: Math.sin(aimAngle) * speed,
      speed,
      angle: aimAngle,
      progress: 0,
      useBezier: false,
      life: 0,
      maxLife: Math.max(0.06, dist / speed),
      scale,
      palette,
      history: [],
    });
  }

  private detonateCrystalPrison(
    x: number,
    y: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playCrystalFreeze();

    this.groundRunes.push({
      x,
      y,
      radius: 16,
      maxRadius: 155 * scale,
      rotation: 0,
      vRot: 0.45,
      life: 0,
      maxLife: 1.3,
      style: 'freljord_star',
      palette,
      perspectiveY: 0.55,
    });

    this.FrostVeinBurst(x, y, palette, scale);

    const crystalSpecs = [
      { ang: -Math.PI / 2 - 0.35, len: 108, w: 30, layer: 'back' as const },
      { ang: -Math.PI / 2 + 0.35, len: 108, w: 30, layer: 'back' as const },
      { ang: -Math.PI / 2 - 0.68, len: 82, w: 24, layer: 'back' as const },
      { ang: -Math.PI / 2 + 0.68, len: 82, w: 24, layer: 'back' as const },
      { ang: -Math.PI / 2, len: 138, w: 40, layer: 'front' as const },
      { ang: -Math.PI / 2 - 0.22, len: 112, w: 32, layer: 'front' as const },
      { ang: -Math.PI / 2 + 0.22, len: 112, w: 32, layer: 'front' as const },
    ];

    crystalSpecs.forEach((spec, idx) => {
      this.crystals.push({
        x: x + Math.cos(spec.ang) * 14 * scale,
        y: y + (spec.layer === 'front' ? 12 : -10) * scale,
        angle: spec.ang,
        length: 0,
        maxLength: spec.len * scale,
        width: spec.w * scale,
        life: 0,
        maxLife: 1.1 + idx * 0.03,
        shatterAtEnd: true,
        palette,
        seed: idx * 23 + 7,
        layer: spec.layer,
      });
    });

    this.applyAreaEffect(x, y, 155 * scale, 1620, 'CONGELADO!', palette, {
      casterId,
      freezeDuration: 1.25,
    });
    this.addTrauma(0.5, params.screenShakeIntensity);
  }

  private FrostVeinBurst(x: number, y: number, palette: ElementalPalette, scale: number) {
    const segments: FrostVein['segments'] = [];
    const branches = 8;
    for (let b = 0; b < branches; b++) {
      let currX = x;
      let currY = y;
      let ang = (Math.PI * 2 * b) / branches + (Math.random() - 0.5) * 0.3;
      const steps = 4;
      for (let s = 0; s < steps; s++) {
        const len = (18 + Math.random() * 20) * scale;
        ang += (Math.random() - 0.5) * 0.65;
        const nx = currX + Math.cos(ang) * len;
        const ny = currY + Math.sin(ang) * len * 0.58;
        segments.push({
          x1: currX,
          y1: currY,
          x2: nx,
          y2: ny,
          width: (steps - s) * 1.35 * scale,
          depth: s / steps,
        });
        currX = nx;
        currY = ny;
      }
    }
    this.frostVeins.push({
      x,
      y,
      segments,
      life: 0,
      maxLife: 1.2,
      palette,
    });
  }

  private shatterCrystal(c: FacetedCrystal, pMult: number) {
    soundEngine.playCrystalShatter();
    const tipX = c.x + Math.cos(c.angle) * c.maxLength * 0.65;
    const tipY = c.y + Math.sin(c.angle) * c.maxLength * 0.65;
    const shardCount = Math.max(3, Math.floor(6 * pMult));

    for (let i = 0; i < shardCount; i++) {
      const ang = c.angle + (Math.random() - 0.5) * 2.2;
      const spd = 120 + Math.random() * 250;
      this.spawnParticle({
        x: tipX,
        y: tipY,
        z: 10,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        vz: 60,
        size: 6 + Math.random() * 6,
        color: i % 2 === 0 ? c.palette.primary : c.palette.accent,
        coreColor: c.palette.core,
        alpha: 1,
        life: 0,
        maxLife: 0.35,
        drag: 0.92,
        gravity: 360,
        bounce: 0.5,
        floorY: c.y + 30,
        type: 'crystal_shard',
        rotation: Math.random() * Math.PI * 2,
        vRot: 14,
        stretch: 1.2,
        seed: i,
      });
    }
  }

  private spawnVoidCataclysm(
    casterX: number,
    casterY: number,
    targetX: number,
    targetY: number,
    aimAngle: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playBeamChannel();
    this.screenDarkness = 0.5;
    const muzzleX = casterX + Math.cos(aimAngle) * 38;
    const muzzleY = casterY + Math.sin(aimAngle) * 38;
    const endX = muzzleX + Math.cos(aimAngle) * 850;
    const endY = muzzleY + Math.sin(aimAngle) * 850;

    this.beams.push({
      startX: muzzleX,
      startY: muzzleY,
      endX,
      endY,
      angle: aimAngle,
      width: 64 * scale,
      life: 0,
      maxLife: 0.62,
      palette,
      seed: Math.random() * 100,
    });

    this.slimes.forEach((s) => {
      if (casterId && s.id === casterId) return;
      const distToLine = this.pointToSegmentDistance(s.x, s.y, muzzleX, muzzleY, endX, endY);
      if (distToLine <= s.radius + 52 * scale) {
        this.damageSlime(s, 2450, 'RAIO PLASMA!', palette, casterId, {
          shockDuration: 0.85,
        });
      }
    });

    this.addTrauma(0.68, params.screenShakeIntensity);
  }

  private spawnBladeDance(
    casterX: number,
    casterY: number,
    targetX: number,
    targetY: number,
    palette: ElementalPalette,
    scale: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playSlash(1.38);
    const bladeCount = 6;

    for (let i = 0; i < bladeCount; i++) {
      const fanAngle = ((i - (bladeCount - 1) / 2) / bladeCount) * 2.2 + Math.PI;
      const startX = casterX + Math.cos(fanAngle) * 80 * scale;
      const startY = casterY + Math.sin(fanAngle) * 80 * scale;

      const strikeAngle = (i / bladeCount) * Math.PI * 2 + 0.3;
      const overshootX = targetX + Math.cos(strikeAngle) * 110 * scale;
      const overshootY = targetY + Math.sin(strikeAngle) * 110 * scale;

      this.projectiles.push({
        id: this.projectileIdCounter++,
        preset: 'blade_dance',
        casterId,
        x: startX,
        y: startY,
        startX,
        startY,
        controlX: (startX + targetX) * 0.5,
        controlY: (startY + targetY) * 0.5 - 85 * scale,
        targetX: overshootX,
        targetY: overshootY,
        vx: 0,
        vy: 0,
        speed: 1400,
        angle: strikeAngle,
        progress: 0,
        useBezier: true,
        life: 0,
        maxLife: 0.24,
        delay: i * 0.05,
        scale,
        palette,
        history: [],
      });

      this.dimensionCuts.push({
        x1: targetX - Math.cos(strikeAngle) * 125 * scale,
        y1: targetY - Math.sin(strikeAngle) * 125 * scale,
        x2: targetX + Math.cos(strikeAngle) * 125 * scale,
        y2: targetY + Math.sin(strikeAngle) * 125 * scale,
        width: 9 * scale,
        life: 0,
        maxLife: 0.25,
        delay: 0.12 + i * 0.05,
        palette,
        shatterOnEnd: false,
      });
    }

    this.applyAreaEffect(targetX, targetY, 150 * scale, 2140, 'DANÇA DE LÂMINAS!', palette, {
      casterId,
      lunarMark: true,
    });
    this.addTrauma(0.45, params.screenShakeIntensity);
  }

  private spawnWorldEnder(
    casterX: number,
    casterY: number,
    targetX: number,
    targetY: number,
    aimAngle: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playSlash(0.55);
    soundEngine.playArcaneImpact();

    const boxLength = Math.min(420 * scale, Math.hypot(targetX - casterX, targetY - casterY) + 90 * scale);
    const boxWidth = 110 * scale;

    this.dangerBoxes.push({
      x: casterX + Math.cos(aimAngle) * 35,
      y: casterY + Math.sin(aimAngle) * 35,
      angle: aimAngle,
      length: boxLength,
      width: boxWidth,
      life: 0,
      maxLife: 0.52,
      palette,
      style: 'slashing_cleave',
    });

    this.slashArcs.push({
      x: targetX,
      y: targetY,
      radius: 160 * scale,
      thickness: 60 * scale,
      startAngle: aimAngle - 1.4,
      sweepAngle: 2.8,
      life: 0,
      maxLife: 0.34,
      delay: 0,
      palette,
      seed: Math.random() * 100,
      flip: false,
      style: 'serrated_vorpal',
      eccentricity: 0.38,
      tiltAngle: aimAngle,
    });

    // Heavy Pancake Flatten when hit by World Ender!
    this.applyAreaEffect(targetX, targetY, 175 * scale, 2650, 'ESMAGAMENTO COLOSSAL!', palette, {
      casterId,
      flattenDuration: 1.35,
      stunDuration: 0.95,
    });
    this.addTrauma(0.78, params.screenShakeIntensity);
  }

  private spawnRailgunSnipe(
    casterX: number,
    casterY: number,
    targetX: number,
    targetY: number,
    aimAngle: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playSkillshotLaunch();
    soundEngine.playArcaneImpact();

    const muzzleX = casterX + Math.cos(aimAngle) * 38;
    const muzzleY = casterY + Math.sin(aimAngle) * 38;
    const totalDist = Math.max(580, Math.hypot(targetX - muzzleX, targetY - muzzleY) + 150);
    const endX = muzzleX + Math.cos(aimAngle) * totalDist;
    const endY = muzzleY + Math.sin(aimAngle) * totalDist;

    this.dimensionCuts.push({
      x1: muzzleX,
      y1: muzzleY,
      x2: endX,
      y2: endY,
      width: 17 * scale,
      life: 0,
      maxLife: 0.32,
      delay: 0,
      palette,
      shatterOnEnd: false,
    });

    for (let m = 1; m <= 4; m++) {
      const distStep = (totalDist * 0.82 * m) / 4;
      const rx = muzzleX + Math.cos(aimAngle) * distStep;
      const ry = muzzleY + Math.sin(aimAngle) * distStep;
      this.shockRings.push({
        x: rx,
        y: ry,
        radius: 8,
        maxRadius: (65 + m * 15) * scale,
        thickness: 7 * scale,
        life: 0,
        maxLife: 0.3,
        delay: m * 0.025,
        palette,
        perspectiveY: 0.42,
        rotation: aimAngle + Math.PI / 2,
      });
    }

    this.slimes.forEach((s) => {
      if (casterId && s.id === casterId) return;
      const dist = this.pointToSegmentDistance(s.x, s.y, muzzleX, muzzleY, endX, endY);
      if (dist <= s.radius + 36 * scale) {
        this.damageSlime(s, 2680, 'SNIPER RAILGUN!', palette, casterId, {
          knockbackX: Math.cos(aimAngle) * 420,
          knockbackY: Math.sin(aimAngle) * 420,
        });
      }
    });

    this.addTrauma(0.65, params.screenShakeIntensity);
  }

  private spawnBuckshotBlast(
    casterX: number,
    casterY: number,
    aimAngle: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playArcaneImpact();
    const muzzleX = casterX + Math.cos(aimAngle) * 38;
    const muzzleY = casterY + Math.sin(aimAngle) * 38;

    this.slashArcs.push({
      x: muzzleX + Math.cos(aimAngle) * 90 * scale,
      y: muzzleY + Math.sin(aimAngle) * 90 * scale,
      radius: 150 * scale,
      thickness: 46 * scale,
      startAngle: aimAngle - 0.55,
      sweepAngle: 1.1,
      life: 0,
      maxLife: 0.22,
      delay: 0,
      palette,
      seed: Math.random() * 100,
      flip: false,
      style: 'wind_razor',
      eccentricity: 0.85,
      tiltAngle: aimAngle,
    });

    const pelletCount = Math.floor(24 * pMult);
    for (let i = 0; i < pelletCount; i++) {
      const spread = aimAngle + (Math.random() - 0.5) * 0.95;
      const spd = (480 + Math.random() * 620) * scale;
      this.spawnParticle({
        x: muzzleX,
        y: muzzleY,
        z: 18,
        vx: Math.cos(spread) * spd,
        vy: Math.sin(spread) * spd,
        vz: 50,
        size: (4.5 + Math.random() * 4) * scale,
        color: i % 3 === 0 ? palette.accent : palette.primary,
        coreColor: palette.core,
        alpha: 1,
        life: 0,
        maxLife: 0.28,
        drag: 0.93,
        gravity: 420,
        bounce: 0.65,
        floorY: muzzleY + 45,
        type: 'needle_spark',
        rotation: spread,
        vRot: 0,
        stretch: 4.0,
        seed: i,
      });
    }

    this.slimes.forEach((s) => {
      if (casterId && s.id === casterId) return;
      const dx = s.x - muzzleX;
      const dy = s.y - muzzleY;
      const dist = Math.hypot(dx, dy);
      const angDiff = Math.abs(
        Math.atan2(Math.sin(Math.atan2(dy, dx) - aimAngle), Math.cos(Math.atan2(dy, dx) - aimAngle))
      );
      if (dist <= 440 * scale && angDiff <= 0.62) {
        this.damageSlime(s, 2050, 'BUCKSHOT!', palette, casterId, {
          knockbackX: Math.cos(aimAngle) * 360,
          knockbackY: Math.sin(aimAngle) * 360,
        });
      }
    });

    this.addTrauma(0.58, params.screenShakeIntensity);
  }

  private spawnMegaRocket(
    casterX: number,
    casterY: number,
    targetX: number,
    targetY: number,
    aimAngle: number,
    palette: ElementalPalette,
    scale: number,
    casterId?: string
  ) {
    soundEngine.playSkillshotLaunch();
    const speed = 980;
    const muzzleX = casterX + Math.cos(aimAngle) * 40;
    const muzzleY = casterY + Math.sin(aimAngle) * 40;

    const dist = Math.hypot(targetX - muzzleX, targetY - muzzleY);
    this.projectiles.push({
      id: this.projectileIdCounter++,
      preset: 'mega_rocket',
      casterId,
      x: muzzleX,
      y: muzzleY,
      startX: muzzleX,
      startY: muzzleY,
      controlX: (muzzleX + targetX) * 0.5,
      controlY: (muzzleY + targetY) * 0.5,
      targetX,
      targetY,
      vx: Math.cos(aimAngle) * speed,
      vy: Math.sin(aimAngle) * speed,
      speed,
      angle: aimAngle,
      progress: 0,
      useBezier: false,
      life: 0,
      maxLife: Math.max(0.08, dist / speed),
      scale: scale * 1.22,
      palette,
      history: [],
    });
  }

  private detonateMegaRocket(
    x: number,
    y: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playArcaneImpact(1.3);
    this.screenDarkness = 0.55;

    this.impactFlashes.push({
      x,
      y,
      radius: 215 * scale,
      life: 0,
      maxLife: 0.11,
      palette,
    });

    this.shockRings.push({
      x,
      y,
      radius: 15,
      maxRadius: 230 * scale,
      thickness: 15 * scale,
      life: 0,
      maxLife: 0.45,
      palette,
      perspectiveY: 0.52,
      rotation: 0,
    });

    const capCount = Math.floor(22 * pMult);
    for (let i = 0; i < capCount; i++) {
      const ang = (Math.PI * 2 * i) / capCount;
      const spd = (55 + Math.random() * 130) * scale;
      this.spawnParticle({
        x: x + (Math.random() - 0.5) * 24 * scale,
        y: y - 45 * scale,
        z: 40,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.5 - 120 * scale,
        vz: 85,
        size: (26 + Math.random() * 28) * scale,
        color: i % 2 === 0 ? palette.primary : palette.secondary,
        coreColor: palette.core,
        alpha: 1,
        life: 0,
        maxLife: 0.48,
        drag: 0.92,
        gravity: -90,
        bounce: 0,
        floorY: 9999,
        type: 'fireball_lobe',
        rotation: 0,
        vRot: 0,
        stretch: 1,
        seed: i,
      });
    }

    this.applyAreaEffect(x, y, 215 * scale, 2980, 'MEGA MÍSSIL!', palette, {
      casterId,
      knockupVelocity: 390,
      knockbackForce: 340,
      originX: x,
      originY: y,
    });
    this.addTrauma(0.85, params.screenShakeIntensity);
  }

  private spawnChronoBomb(
    casterX: number,
    casterY: number,
    targetX: number,
    targetY: number,
    aimAngle: number,
    palette: ElementalPalette,
    scale: number,
    casterId?: string
  ) {
    soundEngine.playSkillshotLaunch();
    const muzzleX = casterX + Math.cos(aimAngle) * 35;
    const muzzleY = casterY + Math.sin(aimAngle) * 35;

    this.projectiles.push({
      id: this.projectileIdCounter++,
      preset: 'chrono_bomb',
      casterId,
      x: muzzleX,
      y: muzzleY,
      startX: muzzleX,
      startY: muzzleY,
      controlX: (muzzleX + targetX) * 0.5,
      controlY: Math.min(muzzleY, targetY) - 130 * scale,
      targetX,
      targetY,
      vx: 0,
      vy: 0,
      speed: 750,
      angle: aimAngle,
      progress: 0,
      useBezier: true,
      life: 0,
      maxLife: 0.38,
      scale,
      palette,
      history: [],
    });
  }

  private detonateChronoBomb(
    x: number,
    y: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playCrystalFreeze();
    soundEngine.playArcaneImpact();

    this.groundRunes.push({
      x,
      y,
      radius: 20,
      maxRadius: 165 * scale,
      rotation: 0,
      vRot: 4.5,
      life: 0,
      maxLife: 1.0,
      style: 'chrono_clock',
      palette,
      perspectiveY: 0.58,
    });

    this.shockRings.push({
      x,
      y,
      radius: 170 * scale,
      maxRadius: 10 * scale,
      thickness: 9 * scale,
      life: 0,
      maxLife: 0.25,
      palette,
      perspectiveY: 0.58,
      rotation: 0,
    });

    this.applyAreaEffect(x, y, 165 * scale, 1980, 'PARADOXO TEMPORAL!', palette, {
      casterId,
      stunDuration: 1.15,
    });
    this.addTrauma(0.52, params.screenShakeIntensity);
  }

  private spawnHellfireChains(
    casterX: number,
    casterY: number,
    targetX: number,
    targetY: number,
    aimAngle: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playSlash(0.75);
    soundEngine.playArcaneImpact();

    const startX = casterX + Math.cos(aimAngle) * 32;
    const startY = casterY + Math.sin(aimAngle) * 32;

    this.chainWhips.push({
      startX,
      startY,
      targetX,
      targetY,
      life: 0,
      maxLife: 0.55,
      palette,
      scale,
    });

    this.applyAreaEffect(targetX, targetY, 130 * scale, 1820, 'PUXÃO DE CORRENTE!', palette, {
      casterId,
      knockbackForce: -440,
      originX: casterX,
      originY: casterY,
      stunDuration: 0.65,
    });
    this.addTrauma(0.5, params.screenShakeIntensity);
  }

  private spawnArcticBlizzard(
    x: number,
    y: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playCrystalFreeze();

    this.groundRunes.push({
      x,
      y,
      radius: 30,
      maxRadius: 180 * scale,
      rotation: 0,
      vRot: 3.2,
      life: 0,
      maxLife: 1.4,
      style: 'freljord_star',
      palette,
      perspectiveY: 0.55,
    });

    for (let w = 0; w < 4; w++) {
      this.slashArcs.push({
        x,
        y,
        radius: (130 + (w % 2) * 35) * scale,
        thickness: 26 * scale,
        startAngle: w * 1.57,
        sweepAngle: Math.PI * 1.45,
        life: 0,
        maxLife: 0.45,
        delay: w * 0.08,
        palette,
        seed: w * 19,
        flip: false,
        style: 'wind_razor',
        eccentricity: 0.55,
        tiltAngle: 0,
      });
    }

    const count = Math.floor(34 * pMult);
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count;
      const dist = (30 + Math.random() * 140) * scale;
      const px = x + Math.cos(ang) * dist;
      const py = y + Math.sin(ang) * dist * 0.55;
      const tangent = ang + Math.PI / 2;
      const spd = (140 + Math.random() * 210) * scale;

      this.spawnParticle({
        x: px,
        y: py,
        z: 16,
        vx: Math.cos(tangent) * spd,
        vy: Math.sin(tangent) * spd * 0.55,
        vz: 15,
        size: (5 + Math.random() * 6) * scale,
        color: i % 2 === 0 ? palette.primary : palette.accent,
        coreColor: palette.core,
        alpha: 1,
        life: 0,
        maxLife: 0.65,
        drag: 0.96,
        gravity: -15,
        bounce: 0,
        floorY: 9999,
        type: 'snowflake',
        rotation: tangent,
        vRot: 8,
        stretch: 1,
        seed: i,
      });
    }

    this.applyAreaEffect(x, y, 180 * scale, 1890, 'NEVASCA GLACIAL!', palette, {
      casterId,
      freezeDuration: 1.05,
    });
    this.addTrauma(0.4, params.screenShakeIntensity);
  }

  private spawnCausticAcid(
    casterX: number,
    casterY: number,
    targetX: number,
    targetY: number,
    aimAngle: number,
    palette: ElementalPalette,
    scale: number,
    casterId?: string
  ) {
    soundEngine.playSkillshotLaunch();
    const muzzleX = casterX + Math.cos(aimAngle) * 35;
    const muzzleY = casterY + Math.sin(aimAngle) * 35;

    this.projectiles.push({
      id: this.projectileIdCounter++,
      preset: 'caustic_acid',
      casterId,
      x: muzzleX,
      y: muzzleY,
      startX: muzzleX,
      startY: muzzleY,
      controlX: (muzzleX + targetX) * 0.5,
      controlY: Math.min(muzzleY, targetY) - 140 * scale,
      targetX,
      targetY,
      vx: 0,
      vy: 0,
      speed: 720,
      angle: aimAngle,
      progress: 0,
      useBezier: true,
      life: 0,
      maxLife: 0.36,
      scale,
      palette,
      history: [],
    });
  }

  private detonateCausticAcid(
    x: number,
    y: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playCrystalShatter();

    this.acidPools.push({
      x,
      y,
      radius: 140 * scale,
      life: 0,
      maxLife: 1.6,
      palette,
      seed: Math.random() * 100,
      casterId,
    });

    this.applyAreaEffect(x, y, 145 * scale, 1680, 'POÇA DE ÁCIDO!', palette, {
      casterId,
      poisonDuration: 2.4,
    });
  }

  private spawnThornRoots(
    casterX: number,
    casterY: number,
    targetX: number,
    targetY: number,
    aimAngle: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playSlash(0.85);
    const startX = casterX + Math.cos(aimAngle) * 32;
    const startY = casterY + Math.sin(aimAngle) * 32;
    const perp = aimAngle + Math.PI / 2;

    for (let v = -1; v <= 1; v++) {
      const points: Array<{ x: number; y: number }> = [];
      const steps = 16;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const wave =
          Math.sin(t * Math.PI * 3 + v * 1.4) *
          (26 + Math.abs(v) * 16) *
          scale *
          Math.sin(t * Math.PI);
        const px =
          startX +
          (targetX - startX) * t +
          Math.cos(perp) * (wave + v * 20 * scale * t);
        const py =
          startY +
          (targetY - startY) * t +
          Math.sin(perp) * (wave + v * 20 * scale * t);
        points.push({ x: px, y: py });
      }
      this.vineWhips.push({
        points,
        life: 0,
        maxLife: 0.9,
        palette,
        scale,
      });
    }

    this.applyAreaEffect(targetX, targetY, 145 * scale, 1780, 'ENRAIZADO!', palette, {
      casterId,
      stunDuration: 0.95,
    });
  }

  private spawnMirrorShatter(
    x: number,
    y: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playCrystalShatter();

    this.shockRings.push({
      x,
      y,
      radius: 10,
      maxRadius: 160 * scale,
      thickness: 8 * scale,
      life: 0,
      maxLife: 0.35,
      palette,
      perspectiveY: 0.75,
      rotation: 0,
      isHexagonal: true,
    });

    const count = Math.floor(32 * pMult);
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count;
      const spd = (140 + Math.random() * 340) * scale;
      this.spawnParticle({
        x,
        y,
        z: 18,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        vz: 110,
        size: (8 + Math.random() * 10) * scale,
        color: i % 2 === 0 ? '#00F0FF' : '#FF2A85',
        coreColor: '#FFFFFF',
        alpha: 1,
        life: 0,
        maxLife: 0.42,
        drag: 0.93,
        gravity: 340,
        bounce: 0.6,
        floorY: y + 48,
        type: 'mirror_prism',
        rotation: ang,
        vRot: 18,
        stretch: 1,
        seed: i,
      });
    }

    this.applyAreaEffect(x, y, 160 * scale, 2190, 'ILUSÃO DESFEITA!', palette, {
      casterId,
    });
  }

  private spawnCosmicSingularity(
    x: number,
    y: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playBeamChannel();
    this.screenDarkness = 0.55;

    this.blackHoles.push({
      x,
      y,
      radius: 10,
      maxRadius: 150 * scale,
      rotation: 0,
      life: 0,
      maxLife: 1.2,
      palette,
      casterId,
    });

    this.applyAreaEffect(x, y, 200 * scale, 2540, 'SINGULARIDADE!', palette, {
      casterId,
      knockbackForce: -380,
      originX: x,
      originY: y,
    });
    this.addTrauma(0.68, params.screenShakeIntensity);
  }

  private spawnDivineSword(
    x: number,
    y: number,
    palette: ElementalPalette,
    scale: number,
    casterId?: string
  ) {
    soundEngine.playSkillshotLaunch();

    this.groundRunes.push({
      x,
      y,
      radius: 25,
      maxRadius: 170 * scale,
      rotation: 0,
      vRot: 2.0,
      life: 0,
      maxLife: 1.1,
      style: 'lunar_seal',
      palette,
      perspectiveY: 0.55,
    });

    this.giantSwords.push({
      x,
      y,
      currentHeight: 410 * scale,
      scale,
      life: 0,
      maxLife: 1.0,
      impacted: false,
      palette,
      casterId,
    });
  }

  private spawnThunderStorm(
    x: number,
    y: number,
    palette: ElementalPalette,
    scale: number,
    casterId?: string
  ) {
    soundEngine.playBeamChannel();

    for (let i = 0; i < 6; i++) {
      const offsetAng = (i / 6) * Math.PI * 2;
      const dist = i === 0 ? 0 : (45 + Math.random() * 70) * scale;
      this.scheduledEruptions.push({
        x: x + Math.cos(offsetAng) * dist,
        y: y + Math.sin(offsetAng) * dist * 0.65,
        delay: i * 0.065,
        radius: 95 * scale,
        palette,
        type: 'sky_thunder',
        casterId,
      });
    }
  }

  private spawnDeathLotus(
    targetX: number,
    targetY: number,
    palette: ElementalPalette,
    scale: number,
    pMult: number,
    params: ShaderParams,
    casterId?: string
  ) {
    soundEngine.playSlash(1.4);

    for (let r = 0; r < 3; r++) {
      this.slashArcs.push({
        x: targetX,
        y: targetY,
        radius: (110 + r * 30) * scale,
        thickness: 26 * scale,
        startAngle: r * 2.1,
        sweepAngle: Math.PI * 1.85,
        life: 0,
        maxLife: 0.34,
        delay: r * 0.05,
        palette,
        seed: r * 29,
        flip: r % 2 === 1,
        style: 'serrated_vorpal',
        eccentricity: 0.6,
        tiltAngle: 0,
      });
    }

    const daggerCount = Math.floor(20 * pMult);
    for (let i = 0; i < daggerCount; i++) {
      const ang = (i / daggerCount) * Math.PI * 4;
      const spd = (340 + (i % 3) * 130) * scale;
      this.spawnParticle({
        x: targetX,
        y: targetY,
        z: 16,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.72,
        vz: 20,
        size: 11 * scale,
        color: i % 2 === 0 ? palette.primary : palette.accent,
        coreColor: palette.core,
        alpha: 1,
        life: 0,
        maxLife: 0.38,
        drag: 0.96,
        gravity: 0,
        bounce: 0,
        floorY: 9999,
        type: 'kunai_dagger',
        rotation: ang,
        vRot: 0,
        stretch: 2.4,
        seed: i,
      });
    }

    this.applyAreaEffect(targetX, targetY, 180 * scale, 2280, 'LÓTUS DA MORTE!', palette, {
      casterId,
    });
    this.addTrauma(0.5, params.screenShakeIntensity);
  }

  private spawnTectonicRupture(
    casterX: number,
    casterY: number,
    aimAngle: number,
    palette: ElementalPalette,
    scale: number,
    casterId?: string
  ) {
    soundEngine.playArcaneImpact();
    const startX = casterX + Math.cos(aimAngle) * 55;
    const startY = casterY + Math.sin(aimAngle) * 55;

    for (let i = 0; i < 5; i++) {
      const dist = i * 90 * scale;
      this.scheduledEruptions.push({
        x: startX + Math.cos(aimAngle) * dist,
        y: startY + Math.sin(aimAngle) * dist,
        delay: i * 0.075,
        radius: (65 + i * 8) * scale,
        palette,
        type: 'tectonic_geyser',
        casterId,
      });
    }
  }

  private triggerScheduledEruption(e: ScheduledEruption, params: ShaderParams) {
    const scale = params.effectScale * 0.7;
    const pMult = params.particleMultiplier;

    if (e.type === 'sky_thunder') {
      soundEngine.playArcaneImpact(0.75);
      this.dimensionCuts.push({
        x1: e.x + (Math.random() - 0.5) * 60,
        y1: e.y - 440 * scale,
        x2: e.x,
        y2: e.y,
        width: 14 * scale,
        life: 0,
        maxLife: 0.24,
        delay: 0,
        palette: e.palette,
        shatterOnEnd: false,
      });

      this.shockRings.push({
        x: e.x,
        y: e.y,
        radius: 8,
        maxRadius: e.radius,
        thickness: 8 * scale,
        life: 0,
        maxLife: 0.3,
        palette: e.palette,
        perspectiveY: 0.55,
        rotation: 0,
      });

      this.applyAreaEffect(e.x, e.y, e.radius * 1.15, 620, 'TROVÃO!', e.palette, {
        casterId: e.casterId,
        shockDuration: 0.6,
      });
    } else if (e.type === 'tectonic_geyser') {
      soundEngine.playArcaneImpact(0.8);
      this.shockRings.push({
        x: e.x,
        y: e.y,
        radius: 8,
        maxRadius: e.radius * 1.25,
        thickness: 10 * scale,
        life: 0,
        maxLife: 0.34,
        palette: e.palette,
        perspectiveY: 0.55,
        rotation: 0,
      });

      const count = Math.floor(10 * pMult);
      for (let i = 0; i < count; i++) {
        const spread = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
        const spd = (170 + Math.random() * 320) * scale;
        this.spawnParticle({
          x: e.x + (Math.random() - 0.5) * 24,
          y: e.y,
          z: 10,
          vx: Math.cos(spread) * spd * 0.45,
          vy: Math.sin(spread) * spd,
          vz: 160,
          size: (7 + Math.random() * 9) * scale,
          color: i % 2 === 0 ? e.palette.primary : '#78716C',
          coreColor: e.palette.core,
          alpha: 1,
          life: 0,
          maxLife: 0.38,
          drag: 0.93,
          gravity: 600,
          bounce: 0.5,
          floorY: e.y + 24,
          type: 'rock_chunk',
          rotation: Math.random() * Math.PI * 2,
          vRot: 10,
          stretch: 1.2,
          seed: i,
        });
      }

      this.applyAreaEffect(e.x, e.y, e.radius * 1.2, 740, 'RUPTURA!', e.palette, {
        casterId: e.casterId,
        knockupVelocity: 310,
      });
    }
  }

  // ============================================================================
  // REACTIVE SLIME DAMAGE, FLATTENING, HEALING, SHIELDS & 0-HP DESPERATION
  // ============================================================================
  private pointToSegmentDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  public findMostInjuredAlly(casterId?: string): SlimeActor | undefined {
    const caster = this.slimes.find((s) => s.id === casterId);
    const allies = caster
      ? this.slimes.filter((s) => s.team === caster.team)
      : this.slimes;
    let lowest = allies[0];
    for (let i = 1; i < allies.length; i++) {
      if (allies[i].hp / allies[i].maxHp < lowest.hp / lowest.maxHp) {
        lowest = allies[i];
      }
    }
    return lowest;
  }

  public healSingleSlime(
    target: SlimeActor,
    amount: number,
    label: string,
    palette: ElementalPalette
  ) {
    target.hp = Math.min(target.maxHp, target.hp + amount);
    if (target.isDesperate && target.hp >= target.maxHp * 0.5) {
      target.isDesperate = false;
      target.lastAttackerId = null;
    }
    target.squashX = 0.85;
    target.squashY = 1.25;
    this.spawnFloatingText(
      target.x,
      target.y - target.radius - 16,
      `+${amount} PV`,
      label,
      '#39FF14'
    );
  }

  public applySupportHealAndBuff(
    x: number,
    y: number,
    radius: number,
    palette: ElementalPalette,
    opts: {
      casterId?: string;
      healAmount?: number;
      regenDuration?: number;
      label: string;
    }
  ) {
    const caster = this.slimes.find((s) => s.id === opts.casterId);
    this.slimes.forEach((s) => {
      if (caster && s.team !== caster.team) return;
      const dist = Math.hypot(s.x - x, s.y - y);
      if (dist <= radius + s.radius) {
        if (opts.healAmount) {
          this.healSingleSlime(s, opts.healAmount, opts.label, palette);
        }
        if (opts.regenDuration) {
          s.regenBuffTimer = Math.max(s.regenBuffTimer, opts.regenDuration);
        }
      }
    });
  }

  public applyAreaEffect(
    x: number,
    y: number,
    radius: number,
    baseDamage: number,
    label: string,
    palette: ElementalPalette,
    opts?: {
      casterId?: string;
      freezeDuration?: number;
      stunDuration?: number;
      flattenDuration?: number;
      shockDuration?: number;
      poisonDuration?: number;
      burnDuration?: number;
      corrodeDuration?: number;
      rootDuration?: number;
      soakedDuration?: number;
      gravityStretchDuration?: number;
      lunarMark?: boolean;
      knockbackForce?: number;
      knockupVelocity?: number;
      originX?: number;
      originY?: number;
      grantCasterShield?: number;
      healAlliesAmount?: number;
    }
  ) {
    const caster = this.slimes.find((s) => s.id === opts?.casterId);

    if (caster && opts?.grantCasterShield) {
      caster.shieldHp = Math.min(caster.maxShieldHp, caster.shieldHp + opts.grantCasterShield);
      caster.shieldBuffTimer = Math.max(caster.shieldBuffTimer, 3.5);
    }

    this.slimes.forEach((s) => {
      const dist = Math.hypot(s.x - x, s.y - y);
      if (dist > radius + s.radius) return;

      // Friendly heal if applicable
      if (caster && s.team === caster.team) {
        if (opts?.healAlliesAmount) {
          this.healSingleSlime(s, opts.healAlliesAmount, label, palette);
        }
        return;
      }

      const dmg = Math.round(baseDamage * (0.92 + Math.random() * 0.16));
      let kbX = 0;
      let kbY = 0;
      if (opts?.knockbackForce !== undefined && opts.originX !== undefined && opts.originY !== undefined) {
        const ang = Math.atan2(s.y - opts.originY, s.x - opts.originX);
        kbX = Math.cos(ang) * opts.knockbackForce;
        kbY = Math.sin(ang) * opts.knockbackForce;
      }

      this.damageSlime(s, dmg, label, palette, opts?.casterId, {
        freezeDuration: opts?.freezeDuration,
        stunDuration: opts?.stunDuration,
        flattenDuration: opts?.flattenDuration,
        shockDuration: opts?.shockDuration,
        poisonDuration: opts?.poisonDuration,
        burnDuration: opts?.burnDuration,
        corrodeDuration: opts?.corrodeDuration,
        rootDuration: opts?.rootDuration,
        soakedDuration: opts?.soakedDuration,
        gravityStretchDuration: opts?.gravityStretchDuration,
        lunarMark: opts?.lunarMark,
        knockupVelocity: opts?.knockupVelocity,
        knockbackX: kbX,
        knockbackY: kbY,
      });
    });
  }

  public damageSlime(
    s: SlimeActor,
    dmg: number,
    label: string,
    palette: ElementalPalette,
    attackerId?: string,
    opts?: {
      freezeDuration?: number;
      stunDuration?: number;
      flattenDuration?: number;
      shockDuration?: number;
      poisonDuration?: number;
      burnDuration?: number;
      corrodeDuration?: number;
      rootDuration?: number;
      soakedDuration?: number;
      gravityStretchDuration?: number;
      lunarMark?: boolean;
      knockupVelocity?: number;
      knockbackX?: number;
      knockbackY?: number;
    }
  ) {
    let remainingDmg = dmg;

    // 1. Mirror Coat Reflection / Shield Absorption
    if (s.mirrorCoatTimer > 0) {
      remainingDmg = Math.round(remainingDmg * 0.45);
      this.spawnFloatingText(s.x, s.y - s.radius - 26, 'REFLETIDO!', 'ARMADURA PRISMA', '#36E2FF');
    }

    if (s.shieldHp > 0) {
      const absorbed = Math.min(s.shieldHp, remainingDmg);
      s.shieldHp -= absorbed;
      remainingDmg -= absorbed;
      if (s.shieldHp <= 0) {
        s.shieldBuffTimer = 0;
      }
    }

    // 2. Subtract HP & Check 0-HP DESPERATION STATE
    s.hp = Math.max(0, s.hp - remainingDmg);
    s.hitFlashTimer = 0.14;
    if (attackerId) {
      s.lastAttackerId = attackerId;
      const attacker = this.slimes.find((a) => a.id === attackerId);
      if (attacker && attacker.id !== s.id) {
        applyCombatActionToDnaBond(attacker, s, 'attack');
      }
    }

    if (s.hp <= 0 && !s.isDesperate) {
      s.hp = 1; // Keep at 1 PV while entering Desperation Flee Mode!
      s.isDesperate = true;
      s.desperateTimer = 4.5;
      this.spawnFloatingText(
        s.x,
        s.y - s.radius - 32,
        'DESESPERO! FOGE!',
        '0 PV - CORRENDO P/ REGENERAR!',
        '#FF2A4B'
      );
    }

    // 3. Apply Reactive Hit Deformations & Crowd-Control
    if (opts?.flattenDuration) {
      s.flattenTimer = Math.max(s.flattenTimer, opts.flattenDuration);
      s.squashX = 1.92;
      s.squashY = 0.25;
    } else {
      s.squashX = 1.36;
      s.squashY = 0.7;
    }

    if (opts?.stunDuration) s.stunTimer = Math.max(s.stunTimer, opts.stunDuration);
    if (opts?.freezeDuration) s.frozenTimer = Math.max(s.frozenTimer, opts.freezeDuration);
    if (opts?.shockDuration) s.shockTimer = Math.max(s.shockTimer, opts.shockDuration);
    if (opts?.poisonDuration) s.poisonTimer = Math.max(s.poisonTimer, opts.poisonDuration);
    if (opts?.burnDuration) s.burnTimer = Math.max(s.burnTimer, opts.burnDuration);
    if (opts?.corrodeDuration) {
      s.corrodeTimer = Math.max(s.corrodeTimer || 0, opts.corrodeDuration);
      s.shieldHp = 0;
      s.shieldBuffTimer = 0;
    }
    if (opts?.rootDuration) s.rootTimer = Math.max(s.rootTimer || 0, opts.rootDuration);
    if (opts?.soakedDuration) s.soakedTimer = Math.max(s.soakedTimer || 0, opts.soakedDuration);
    if (opts?.gravityStretchDuration) {
      s.gravityStretchTimer = Math.max(s.gravityStretchTimer || 0, opts.gravityStretchDuration);
    }
    if (opts?.lunarMark) s.lunarMarkTimer = 3.0;
    if (opts?.knockupVelocity) s.vz = Math.max(s.vz, opts.knockupVelocity);
    if (opts?.knockbackX) s.vx += opts.knockbackX;
    if (opts?.knockbackY) s.vy += opts.knockbackY;

    // 4. Reactive Slime Gel Splatter Droplets on Hit!
    for (let k = 0; k < 6; k++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 95 + Math.random() * 195;
      this.spawnParticle({
        x: s.x,
        y: s.y - s.radius * 0.4,
        z: s.z + 10,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.65 - 45,
        vz: 110,
        size: 6 + Math.random() * 5,
        color: s.color,
        coreColor: s.coreColor,
        alpha: 1,
        life: 0,
        maxLife: 0.38,
        drag: 0.93,
        gravity: 480,
        bounce: 0.55,
        floorY: s.y + 18,
        type: 'slime_droplet',
        rotation: ang,
        vRot: 0,
        stretch: 1.4,
        seed: k,
      });
    }

    this.spawnFloatingText(
      s.x + (Math.random() - 0.5) * 32,
      s.y - s.radius - s.z - 14,
      `${dmg}`,
      label,
      palette.core
    );
  }

  public spawnFloatingText(
    x: number,
    y: number,
    text: string,
    subtext: string | undefined,
    color: string
  ) {
    this.floatingTexts.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 60,
      vy: -135 - Math.random() * 40,
      text,
      subtext,
      color,
      life: 0,
      maxLife: 0.82,
      isCrit: true,
    });
  }

  // ============================================================================
  // MAIN SIMULATION LOOP (ZERO-GC POOL + O(1) SWAP-AND-POP)
  // ============================================================================
  public update(rawDt: number, params: ShaderParams) {
    const t0 = performance.now();
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= rawDt;
      this.updateCameraShake(rawDt);
      this.frameTimeMs = performance.now() - t0;
      return;
    }

    const dt = Math.min(0.05, rawDt) * params.timeScale;
    this.updateCameraShake(rawDt);
    this.screenDarkness = Math.max(0, this.screenDarkness - dt * 2.2);

    // 1. Update Slimes AI, Physics, TreeChat Procedural Dialogues & Acoustic Ripples
    slimeVoiceEngine.updateRipples(dt);
    updateTreeChatSessionsModule(this, dt, params);
    updateSlimesAIAndPhysicsModule(this, dt, this.simulationEnabled, params);
    updateArcaneGrimoireModule(this, dt, params);
    updateAssetsOfcModule(this, dt, params);
    updatePotionAlchemyModule(this, dt, params);

    // Smooth Camera Tracking for Player Slime when moving
    const player = this.getPlayerSlime();
    if (
      player &&
      (this.playerInput.up ||
        this.playerInput.down ||
        this.playerInput.left ||
        this.playerInput.right)
    ) {
      this.cameraX += (player.x - this.cameraX) * Math.min(1, dt * 3.8);
      this.cameraY += (player.y - this.cameraY) * Math.min(1, dt * 3.8);
    }

    // 2. Scheduled Delayed Eruptions
    for (let i = this.scheduledEruptions.length - 1; i >= 0; i--) {
      const e = this.scheduledEruptions[i];
      e.delay -= dt;
      if (e.delay <= 0) {
        this.triggerScheduledEruption(e, params);
        removeSwapPop(this.scheduledEruptions, i);
      }
    }

    // 3. Impact Flashes
    for (let i = this.impactFlashes.length - 1; i >= 0; i--) {
      const f = this.impactFlashes[i];
      f.life += dt;
      if (f.life >= f.maxLife) {
        removeSwapPop(this.impactFlashes, i);
      }
    }

    // 4. Danger Boxes
    for (let i = this.dangerBoxes.length - 1; i >= 0; i--) {
      const b = this.dangerBoxes[i];
      b.life += dt;
      if (b.life >= b.maxLife) {
        removeSwapPop(this.dangerBoxes, i);
      }
    }

    // 5. Rock Monoliths
    for (let i = this.rockMonoliths.length - 1; i >= 0; i--) {
      const rm = this.rockMonoliths[i];
      rm.life += dt;
      const growT = Math.min(1, rm.life / 0.14);
      const easeOutBack = 1 + 2.2 * Math.pow(growT - 1, 3) + 1.2 * Math.pow(growT - 1, 2);
      rm.height = rm.maxHeight * Math.max(0, easeOutBack);
      if (rm.life >= rm.maxLife) {
        removeSwapPop(this.rockMonoliths, i);
      }
    }

    // 6. Flame Pillar Zones
    for (let i = this.flameZones.length - 1; i >= 0; i--) {
      const fz = this.flameZones[i];
      fz.life += dt;
      fz.tickTimer += dt;
      if (fz.tickTimer >= 0.45) {
        fz.tickTimer = 0;
        this.applyAreaEffect(fz.x, fz.y, fz.radius, 520, 'CHAMAS!', fz.palette, {
          casterId: fz.casterId,
          burnDuration: 1.0,
        });
      }
      if (fz.life >= fz.maxLife) {
        removeSwapPop(this.flameZones, i);
      }
    }

    // 7. Slime Afterimages & Heal Tethers
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const a = this.afterimages[i];
      a.life += dt;
      if (a.life >= a.maxLife) {
        removeSwapPop(this.afterimages, i);
      }
    }

    for (let i = this.healTethers.length - 1; i >= 0; i--) {
      const ht = this.healTethers[i];
      ht.life += dt;
      if (ht.life >= ht.maxLife) {
        removeSwapPop(this.healTethers, i);
      }
    }

    // 8. Chain Whips
    for (let i = this.chainWhips.length - 1; i >= 0; i--) {
      const c = this.chainWhips[i];
      c.life += dt;
      if (c.life >= c.maxLife) {
        removeSwapPop(this.chainWhips, i);
      }
    }

    // 9. Giant Swords (Flattens Slimes on Impact!)
    for (let i = this.giantSwords.length - 1; i >= 0; i--) {
      const s = this.giantSwords[i];
      s.life += dt;
      if (!s.impacted) {
        s.currentHeight = Math.max(0, s.currentHeight - dt * 2400 * s.scale);
        if (s.currentHeight <= 0) {
          s.impacted = true;
          soundEngine.playArcaneImpact();
          this.impactFlashes.push({
            x: s.x,
            y: s.y,
            radius: 190 * s.scale,
            life: 0,
            maxLife: 0.1,
            palette: s.palette,
          });
          this.shockRings.push({
            x: s.x,
            y: s.y,
            radius: 15,
            maxRadius: 205 * s.scale,
            thickness: 14 * s.scale,
            life: 0,
            maxLife: 0.42,
            palette: s.palette,
            perspectiveY: 0.55,
            rotation: 0,
          });
          this.applyAreaEffect(s.x, s.y, 185 * s.scale, 2850, 'JULGAMENTO DIVINO!', s.palette, {
            casterId: s.casterId,
            flattenDuration: 1.35,
            stunDuration: 1.0,
          });
          this.addTrauma(0.8, params.screenShakeIntensity);
        }
      }
      if (s.life >= s.maxLife) {
        removeSwapPop(this.giantSwords, i);
      }
    }

    // 10. Black Holes
    for (let i = this.blackHoles.length - 1; i >= 0; i--) {
      const bh = this.blackHoles[i];
      bh.life += dt;
      bh.rotation += dt * 5.5;
      this.slimes.forEach((sl) => {
        if (bh.casterId && sl.id === bh.casterId) return;
        const dx = bh.x - sl.x;
        const dy = bh.y - sl.y;
        const dist = Math.hypot(dx, dy);
        if (dist < bh.maxRadius * 1.6 && dist > 10) {
          sl.vx += (dx / dist) * 580 * dt;
          sl.vy += (dy / dist) * 580 * dt;
        }
      });
      if (bh.life >= bh.maxLife) {
        removeSwapPop(this.blackHoles, i);
      }
    }

    // 11. Acid Pools & Vine Whips
    for (let i = this.acidPools.length - 1; i >= 0; i--) {
      const ap = this.acidPools[i];
      ap.life += dt;
      if (ap.life >= ap.maxLife) {
        removeSwapPop(this.acidPools, i);
      }
    }

    for (let i = this.vineWhips.length - 1; i >= 0; i--) {
      const vw = this.vineWhips[i];
      vw.life += dt;
      if (vw.life >= vw.maxLife) {
        removeSwapPop(this.vineWhips, i);
      }
    }

    // 12. Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.delay && p.delay > 0) {
        p.delay -= dt;
        continue;
      }
      p.life += dt;

      if (p.useBezier) {
        const t = Math.min(1, p.life / p.maxLife);
        const inv = 1 - t;
        const nx = inv * inv * p.startX + 2 * inv * t * p.controlX + t * t * p.targetX;
        const ny = inv * inv * p.startY + 2 * inv * t * p.controlY + t * t * p.targetY;
        p.angle = Math.atan2(ny - p.y, nx - p.x);
        p.x = nx;
        p.y = ny;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      p.history.unshift({ x: p.x, y: p.y, angle: p.angle });
      if (p.history.length > 14) p.history.pop();

      if (p.life >= p.maxLife) {
        if (p.preset === 'thermobaric_cannon') {
          this.detonateThermobaric(
            p.targetX,
            p.targetY,
            p.palette,
            p.scale,
            params.particleMultiplier,
            params,
            p.isClusterSub,
            p.casterId
          );
        } else if (p.preset === 'hextech_swarm') {
          this.detonateHextechMissile(
            p.targetX,
            p.targetY,
            p.palette,
            p.scale,
            params.particleMultiplier,
            params,
            p.casterId
          );
        } else if (p.preset === 'crystal_arrow') {
          this.detonateCrystalPrison(
            p.targetX,
            p.targetY,
            p.palette,
            p.scale,
            params.particleMultiplier,
            params,
            p.casterId
          );
        } else if (p.preset === 'mega_rocket') {
          this.detonateMegaRocket(
            p.targetX,
            p.targetY,
            p.palette,
            p.scale,
            params.particleMultiplier,
            params,
            p.casterId
          );
        } else if (p.preset === 'chrono_bomb') {
          this.detonateChronoBomb(
            p.targetX,
            p.targetY,
            p.palette,
            p.scale,
            params.particleMultiplier,
            params,
            p.casterId
          );
        } else if (p.preset === 'caustic_acid') {
          this.detonateCausticAcid(
            p.targetX,
            p.targetY,
            p.palette,
            p.scale,
            params.particleMultiplier,
            params,
            p.casterId
          );
        } else if (p.preset === 'boulder_avalanche') {
          detonateBoulderAvalancheModule(
            this,
            p.targetX,
            p.targetY,
            p.palette,
            p.scale,
            params.particleMultiplier,
            params,
            p.casterId
          );
        }
        removeSwapPop(this.projectiles, i);
      }
    }

    // 13. Tornadoes
    for (let i = this.tornadoes.length - 1; i >= 0; i--) {
      const tor = this.tornadoes[i];
      tor.life += dt;
      tor.x += tor.vx * dt;
      tor.y += tor.vy * dt;

      this.slimes.forEach((sl) => {
        if (tor.casterId && sl.id === tor.casterId) return;
        if (!tor.hitSlimeIds.has(sl.id)) {
          const dist = Math.hypot(sl.x - tor.x, sl.y - tor.y);
          if (dist <= tor.radius + sl.radius) {
            tor.hitSlimeIds.add(sl.id);
            this.damageSlime(sl, 1890, 'AIRBORNE!', tor.palette, tor.casterId, {
              knockupVelocity: 410,
            });
          }
        }
      });

      if (tor.life >= tor.maxLife) {
        removeSwapPop(this.tornadoes, i);
      }
    }

    // 14. Slash Arcs, Dimension Cuts, Beams, Crystals, Frost Veins, Ground Runes, Shock Rings
    for (let i = this.slashArcs.length - 1; i >= 0; i--) {
      const s = this.slashArcs[i];
      if (s.delay > 0) {
        s.delay -= dt;
        continue;
      }
      s.life += dt;
      if (s.life >= s.maxLife) removeSwapPop(this.slashArcs, i);
    }

    for (let i = this.dimensionCuts.length - 1; i >= 0; i--) {
      const c = this.dimensionCuts[i];
      if (c.delay > 0) {
        c.delay -= dt;
        continue;
      }
      c.life += dt;
      if (c.life >= c.maxLife) removeSwapPop(this.dimensionCuts, i);
    }

    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.life += dt;
      if (b.life >= b.maxLife) removeSwapPop(this.beams, i);
    }

    for (let i = this.crystals.length - 1; i >= 0; i--) {
      const c = this.crystals[i];
      c.life += dt;
      const growT = Math.min(1, c.life / 0.11);
      const easeOutBack = 1 + 2.4 * Math.pow(growT - 1, 3) + 1.4 * Math.pow(growT - 1, 2);
      c.length = c.maxLength * Math.max(0, easeOutBack);
      if (c.life >= c.maxLife) {
        if (c.shatterAtEnd) this.shatterCrystal(c, params.particleMultiplier);
        removeSwapPop(this.crystals, i);
      }
    }

    for (let i = this.frostVeins.length - 1; i >= 0; i--) {
      const fv = this.frostVeins[i];
      fv.life += dt;
      if (fv.life >= fv.maxLife) removeSwapPop(this.frostVeins, i);
    }

    for (let i = this.groundRunes.length - 1; i >= 0; i--) {
      const r = this.groundRunes[i];
      r.life += dt;
      r.rotation += r.vRot * dt;
      const t = Math.min(1, r.life / 0.16);
      r.radius = r.maxRadius * (1 - Math.pow(1 - t, 3));
      if (r.life >= r.maxLife) removeSwapPop(this.groundRunes, i);
    }

    for (let i = this.shockRings.length - 1; i >= 0; i--) {
      const sr = this.shockRings[i];
      if (sr.delay && sr.delay > 0) {
        sr.delay -= dt;
        continue;
      }
      sr.life += dt;
      const t = sr.life / sr.maxLife;
      const ease = 1 - Math.pow(1 - t, 3);
      sr.radius = sr.radius + (sr.maxRadius - sr.radius) * ease;
      if (sr.life >= sr.maxLife) removeSwapPop(this.shockRings, i);
    }

    // 15. Update Pooled Particles (Zero Allocation Trail Shift & Release)
    const activeParticles = this.particlePool.active;
    for (let i = activeParticles.length - 1; i >= 0; i--) {
      const p = activeParticles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particlePool.releaseAt(i);
        continue;
      }

      if (
        p.type === 'needle_spark' ||
        p.type === 'slash_ember' ||
        p.type === 'kunai_dagger'
      ) {
        // Shift pre-allocated trail coordinates in-place (Zero GC)
        for (let k = p.trail.length - 1; k > 0; k--) {
          p.trail[k].x = p.trail[k - 1].x;
          p.trail[k].y = p.trail[k - 1].y;
        }
        p.trail[0].x = p.x;
        p.trail[0].y = p.y;
      }

      const dragFactor = Math.pow(p.drag, dt * 60);
      p.vx *= dragFactor;
      p.vy *= dragFactor;
      p.vy += p.gravity * dt;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRot * dt;

      if (p.bounce > 0 && p.y >= p.floorY && p.vy > 0) {
        p.y = p.floorY;
        p.vy = -p.vy * p.bounce;
        p.vx *= 0.8;
      }

      p.alpha = 1 - Math.pow(p.life / p.maxLife, 1.5);
    }

    // 16. Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      ft.x += ft.vx * dt;
      ft.y += ft.vy * dt;
      ft.vy += 290 * dt;
      if (ft.life >= ft.maxLife) removeSwapPop(this.floatingTexts, i);
    }

    this.frameTimeMs = performance.now() - t0;
  }

  private updateCameraShake(_dt: number) {
    // Screen shake permanently disabled
    this.shakeTrauma = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  // ============================================================================
  // MASTER RENDER PIPELINE (WITH CAMERA PAN/ZOOM & INSTANCED ELEMENT STAMPING)
  // ============================================================================
  public render(ctx: CanvasRenderingContext2D, params: ShaderParams) {
    // Clear outer viewport void before applying world camera transform
    ctx.fillStyle = '#030509';
    ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);

    ctx.save();
    if (!this.isBakePreview) {
      ctx.translate(this.viewportWidth * 0.5, this.viewportHeight * 0.5);
      ctx.scale(this.cameraZoom, this.cameraZoom);
      ctx.translate(-this.cameraX, -this.cameraY);
    }

    this.renderArenaFloor(ctx);

    if (this.screenDarkness > 0.01) {
      ctx.fillStyle = `rgba(3, 5, 12, ${this.screenDarkness * 0.72})`;
      ctx.fillRect(-150, -150, this.width + 300, this.height + 300);
    }

    // 1. Ground Decals, Acid Pools, Flame Pillar Zones, Runes & Black Holes
    this.renderDangerBoxes(ctx);
    renderArcaneGrimoireGroundModule(ctx);
    renderAssetsOfcGroundModule(ctx);
    renderPotionPuddlesGroundModule(ctx);
    this.renderAcidPools(ctx);
    renderFlamePillarZonesModule(ctx, this.flameZones);
    this.renderFrostVeins(ctx);
    this.renderGroundRunes(ctx, params);
    this.renderShockRings(ctx);
    this.renderBlackHoles(ctx);

    // 2. Back Crystals, Vine Whips & Slime Dash Afterimages
    this.renderCrystals(ctx, 'back');
    this.renderVineWhips(ctx);
    renderSlimeAfterimagesModule(ctx, this.afterimages);

    // 2B. Tactical Skill Range Perimeter & Geometric Aiming Preview (Only visible while holding click!)
    if (
      !this.isBakePreview &&
      this.aimPreviewState.enabled &&
      this.aimPreviewState.isAimingHold
    ) {
      const playerSlime = this.getPlayerSlime();
      if (playerSlime && !playerSlime.treeChatSessionId) {
        renderSkillAimPreviewModule(
          ctx,
          playerSlime,
          this.aimPreviewState.hoverWorldX,
          this.aimPreviewState.hoverWorldY,
          this.aimPreviewState.activePresetId,
          this.aimPreviewState.activePalette,
          this.slimes
        );
      }
    }

    // 3. Intelligent Characters & Healing Tethers
    renderHealTethersModule(ctx, this.healTethers, this.slimes);
    renderSlimeActorsModule(ctx, this.slimes);

    // 4. Front Crystals, 2.5D Rock Monoliths, Tidal Waves & Giant Celestial Swords
    this.renderCrystals(ctx, 'front');
    renderRockMonolithsModule(ctx, this.rockMonoliths);
    renderArcaneGrimoireFrontModule(ctx);
    renderAssetsOfcFrontModule(ctx);
    this.renderGiantSwords(ctx);

    // 5. Chain Whips, Slash Arcs, Dimension Cuts, Tornadoes, Projectiles & Beams
    this.renderChainWhips(ctx);
    this.renderSlashArcs(ctx, params);
    this.renderDimensionCuts(ctx, params);
    this.renderTornadoes(ctx);
    this.renderProjectiles(ctx, params);
    renderThrownPotionsAirModule(ctx);
    this.renderBeams(ctx);

    // 6. Instanced Particles & Frame-0 Impact Flashes
    this.renderParticlesInstanced(ctx);
    this.renderImpactFlashes(ctx);

    // 7. TreeChat Procedural Dialogues (3-Pill Fan, 3D Thought Bubble & Center Tension Bar) + Combat Floating Text
    renderTreeChatSessionsModule(ctx, this.slimes);
    this.renderFloatingTexts(ctx);

    ctx.restore();
  }

  public renderEffectsOnly(ctx: CanvasRenderingContext2D, params: ShaderParams) {
    this.renderDangerBoxes(ctx);
    renderArcaneGrimoireGroundModule(ctx);
    renderAssetsOfcGroundModule(ctx);
    renderPotionPuddlesGroundModule(ctx);
    this.renderAcidPools(ctx);
    renderFlamePillarZonesModule(ctx, this.flameZones);
    this.renderFrostVeins(ctx);
    this.renderGroundRunes(ctx, params);
    this.renderShockRings(ctx);
    this.renderBlackHoles(ctx);
    this.renderCrystals(ctx, 'back');
    this.renderVineWhips(ctx);
    renderSlimeAfterimagesModule(ctx, this.afterimages);
    this.renderCrystals(ctx, 'front');
    renderRockMonolithsModule(ctx, this.rockMonoliths);
    renderArcaneGrimoireFrontModule(ctx);
    renderAssetsOfcFrontModule(ctx);
    this.renderGiantSwords(ctx);
    this.renderChainWhips(ctx);
    this.renderSlashArcs(ctx, params);
    this.renderDimensionCuts(ctx, params);
    this.renderTornadoes(ctx);
    this.renderProjectiles(ctx, params);
    renderThrownPotionsAirModule(ctx);
    this.renderBeams(ctx);
    this.renderParticlesInstanced(ctx);
    this.renderImpactFlashes(ctx);
  }

  private renderArenaFloor(ctx: CanvasRenderingContext2D) {
    const W = this.width;
    const H = this.height;
    const bg = this.arenaBg;

    // 1. Custom Uploaded Background Image (if loaded)
    if (
      bg.customImage &&
      bg.customImage.complete &&
      bg.customImage.naturalWidth > 0
    ) {
      ctx.fillStyle = '#04060A';
      ctx.fillRect(-60, -60, W + 120, H + 120);

      const img = bg.customImage;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;

      ctx.save();
      if (bg.fitMode === 'tile') {
        const pat = ctx.createPattern(img, 'repeat');
        if (pat) {
          ctx.fillStyle = pat;
          ctx.fillRect(-60, -60, W + 120, H + 120);
        }
      } else if (bg.fitMode === 'contain') {
        const scale = Math.min(W / iw, H / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        ctx.drawImage(img, (W - dw) * 0.5, (H - dh) * 0.5, dw, dh);
      } else {
        // 'cover'
        const scale = Math.max((W + 40) / iw, (H + 40) / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        ctx.drawImage(img, (W - dw) * 0.5, (H - dh) * 0.5, dw, dh);
      }
      ctx.restore();
    } else {
      // 2. Built-in Procedural Biome Floors
      const cx = W * 0.5;
      const cy = H * 0.48;
      const bgGrad = ctx.createRadialGradient(cx, cy, 40, cx, cy, W * 0.78);

      if (bg.presetId === 'magma_colosseum') {
        bgGrad.addColorStop(0, '#2B0D08');
        bgGrad.addColorStop(0.55, '#170705');
        bgGrad.addColorStop(1, '#080202');
      } else if (bg.presetId === 'glacial_sanctuary') {
        bgGrad.addColorStop(0, '#0C2438');
        bgGrad.addColorStop(0.55, '#071524');
        bgGrad.addColorStop(1, '#030911');
      } else if (bg.presetId === 'chemtech_lab') {
        bgGrad.addColorStop(0, '#0B2418');
        bgGrad.addColorStop(0.55, '#06150E');
        bgGrad.addColorStop(1, '#020805');
      } else if (bg.presetId === 'eden_courtyard') {
        bgGrad.addColorStop(0, '#12261A');
        bgGrad.addColorStop(0.55, '#0B1810');
        bgGrad.addColorStop(1, '#040906');
      } else if (bg.presetId === 'checker_void') {
        bgGrad.addColorStop(0, '#181826');
        bgGrad.addColorStop(0.6, '#0E0E17');
        bgGrad.addColorStop(1, '#06060A');
      } else {
        // 'obsidian_grid'
        bgGrad.addColorStop(0, '#101522');
        bgGrad.addColorStop(0.6, '#090C15');
        bgGrad.addColorStop(1, '#04060A');
      }

      ctx.fillStyle = bgGrad;
      ctx.fillRect(-60, -60, W + 120, H + 120);

      // Biome-specific procedural floor texture accents
      ctx.save();
      if (bg.presetId === 'checker_void') {
        const tile = 64;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
        for (let y = 0; y < H; y += tile) {
          for (let x = 0; x < W; x += tile) {
            if (((x / tile) + (y / tile)) % 2 === 0) {
              ctx.fillRect(x, y, tile, tile);
            }
          }
        }
      } else if (bg.presetId === 'magma_colosseum') {
        ctx.globalAlpha = 0.24;
        const crater = getGroundDecalTextureSprite(
          'tectonic_crater',
          '#FF5500',
          '#9A1B00',
          '#FFCC66',
          '#1A0502'
        );
        const dim = Math.min(W, H) * 0.85;
        ctx.drawImage(crater, cx - dim * 0.5, cy - dim * 0.42, dim, dim * 0.84);
      } else if (bg.presetId === 'glacial_sanctuary') {
        ctx.globalAlpha = 0.22;
        const ice = getGroundDecalTextureSprite(
          'permafrost_ice',
          '#38BDF8',
          '#0284C7',
          '#E0F2FE',
          '#082F49'
        );
        const dim = Math.min(W, H) * 0.85;
        ctx.drawImage(ice, cx - dim * 0.5, cy - dim * 0.42, dim, dim * 0.84);
      } else if (bg.presetId === 'chemtech_lab') {
        ctx.globalAlpha = 0.2;
        const acid = getGroundDecalTextureSprite(
          'acid_caustic',
          '#39FF14',
          '#15803D',
          '#DCFCE7',
          '#052E16'
        );
        const dim = Math.min(W, H) * 0.82;
        ctx.drawImage(acid, cx - dim * 0.5, cy - dim * 0.42, dim, dim * 0.84);
      } else if (bg.presetId === 'eden_courtyard') {
        ctx.globalAlpha = 0.2;
        const ripples = getGroundDecalTextureSprite(
          'water_ripples',
          '#34D399',
          '#059669',
          '#ECFDF5',
          '#064E3B'
        );
        const dim = Math.min(W, H) * 0.85;
        ctx.drawImage(ripples, cx - dim * 0.5, cy - dim * 0.42, dim, dim * 0.84);
      }
      ctx.restore();
    }

    // 3. Adjustable Contrast Dimness Overlay (so bright custom wallpapers don't wash out VFX shaders)
    if (bg.dimness > 0.01) {
      ctx.fillStyle = `rgba(3, 5, 11, ${Math.min(0.9, bg.dimness)})`;
      ctx.fillRect(-60, -60, W + 120, H + 120);
    }

    // 4. Optional Tactical Perspective Grid & Discoverable Region Landmarks
    if (bg.showTacticalGrid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.045)';
      ctx.lineWidth = 1;
      const step = 80;
      for (let x = 0; x <= W; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Outer World Boundary Frame
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, W, H);
      ctx.restore();
    }
  }

  private renderDangerBoxes(ctx: CanvasRenderingContext2D) {
    if (this.dangerBoxes.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < this.dangerBoxes.length; i++) {
      const b = this.dangerBoxes[i];
      const t = b.life / b.maxLife;
      const alpha = 1 - Math.pow(t, 1.4);

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.globalAlpha = alpha;

      // Stamp turbulent plasma corridor texture instead of flat fillRect
      const beamTex = getBeamPlasmaTextureSprite(
        b.palette.primary,
        b.palette.secondary,
        b.palette.core
      );
      ctx.drawImage(beamTex, 0, -b.width * 0.65, b.length, b.width * 1.3);

      // Stamp Voronoi fissure eruption at the impact tip of the cleave lane
      const flipbook = getVoronoiExplosionFlipbook(
        b.palette.primary,
        b.palette.secondary,
        b.palette.core,
        b.palette.dark
      );
      const stage = Math.min(7, Math.floor(t * 7.99));
      ctx.drawImage(
        flipbook[stage],
        b.length - b.width * 0.75,
        -b.width * 0.75,
        b.width * 1.5,
        b.width * 1.5
      );

      ctx.restore();
    }
    ctx.restore();
  }

  private renderAcidPools(ctx: CanvasRenderingContext2D) {
    if (this.acidPools.length === 0) return;
    ctx.save();

    for (let i = 0; i < this.acidPools.length; i++) {
      const ap = this.acidPools[i];
      const t = ap.life / ap.maxLife;
      const grow = Math.min(1, ap.life / 0.16);
      const alpha = t < 0.72 ? 1 : 1 - (t - 0.72) / 0.28;
      const r = ap.radius * grow;

      const acidTex = getGroundDecalTextureSprite(
        'acid_caustic',
        ap.palette.primary,
        ap.palette.secondary,
        ap.palette.core,
        ap.palette.dark
      );

      ctx.save();
      ctx.translate(ap.x, ap.y);
      ctx.scale(1, 0.56);
      ctx.globalAlpha = alpha;

      // Base organic domain-warped caustic slime pool
      ctx.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.rotate(ap.seed + ap.life * 0.35);
      ctx.drawImage(acidTex, -r * 1.15, -r * 1.15, r * 2.3, r * 2.3);
      ctx.restore();

      // Secondary counter-rotating bioluminescent caustic foam layer
      ctx.globalCompositeOperation = 'lighter';
      ctx.save();
      ctx.rotate(-ap.seed - ap.life * 0.55);
      ctx.globalAlpha = alpha * 0.68;
      ctx.drawImage(acidTex, -r * 0.92, -r * 0.92, r * 1.84, r * 1.84);
      ctx.restore();

      ctx.restore();
    }
    ctx.restore();
  }

  private renderBlackHoles(ctx: CanvasRenderingContext2D) {
    if (this.blackHoles.length === 0) return;
    ctx.save();

    for (let i = 0; i < this.blackHoles.length; i++) {
      const bh = this.blackHoles[i];
      const t = bh.life / bh.maxLife;
      const grow = Math.min(1, bh.life / 0.2);
      const shrink = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
      const r = bh.maxRadius * grow * shrink;

      const holeTex = getGroundDecalTextureSprite(
        'black_hole',
        bh.palette.primary,
        bh.palette.secondary,
        bh.palette.core,
        bh.palette.dark
      );

      // 1. Tilted Relativistic Accretion Disk & Swirling Nebula Shader
      ctx.save();
      ctx.translate(bh.x, bh.y);
      ctx.scale(1, 0.62);
      ctx.rotate(bh.rotation);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(holeTex, -r * 1.35, -r * 1.35, r * 2.7, r * 2.7);

      ctx.globalCompositeOperation = 'lighter';
      ctx.rotate(-bh.rotation * 1.8);
      ctx.globalAlpha = 0.78;
      ctx.drawImage(holeTex, -r * 1.05, -r * 1.05, r * 2.1, r * 2.1);
      ctx.restore();

      // 2. Spherical Gravitational Lensing Event Horizon & Photon Ring
      ctx.save();
      ctx.translate(bh.x, bh.y);
      const coreR = r * 0.42;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(holeTex, -coreR * 1.2, -coreR * 1.2, coreR * 2.4, coreR * 2.4);
      ctx.restore();
    }
    ctx.restore();
  }

  private renderVineWhips(ctx: CanvasRenderingContext2D) {
    if (this.vineWhips.length === 0) return;
    ctx.save();

    for (let i = 0; i < this.vineWhips.length; i++) {
      const vw = this.vineWhips[i];
      const t = vw.life / vw.maxLife;
      const revealCount = Math.min(
        vw.points.length,
        Math.ceil((vw.life / 0.22) * vw.points.length)
      );
      if (revealCount < 2) continue;

      const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'lighter';

      const thornStamp = getInstancedElementStamp(
        'petal_thorn',
        vw.palette.primary,
        vw.palette.core
      );

      for (let k = 0; k < revealCount - 1; k++) {
        const p1 = vw.points[k];
        const p2 = vw.points[k + 1];
        const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const taper = 1.0 - (k / vw.points.length) * 0.55;

        if (thornStamp) {
          ctx.save();
          ctx.translate((p1.x + p2.x) * 0.5, (p1.y + p2.y) * 0.5);
          ctx.rotate(ang);
          ctx.drawImage(
            thornStamp,
            -segLen * 0.85,
            -14 * vw.scale * taper,
            segLen * 1.7,
            28 * vw.scale * taper
          );
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  private renderChainWhips(ctx: CanvasRenderingContext2D) {
    if (this.chainWhips.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < this.chainWhips.length; i++) {
      const cw = this.chainWhips[i];
      const t = cw.life / cw.maxLife;
      const alpha = 1 - Math.pow(t, 1.6);
      ctx.globalAlpha = alpha;

      const dx = cw.targetX - cw.startX;
      const dy = cw.targetY - cw.startY;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Turbulent plasma chain spine
      const beamTex = getBeamPlasmaTextureSprite(
        cw.palette.primary,
        cw.palette.secondary,
        cw.palette.core
      );
      ctx.save();
      ctx.translate(cw.startX, cw.startY);
      ctx.rotate(angle);
      ctx.drawImage(beamTex, 0, -24 * cw.scale, dist, 48 * cw.scale);
      ctx.restore();

      // Glowing forged rune links along the whip
      const linkStamp = getInstancedElementStamp(
        'hex_glyph',
        cw.palette.primary,
        cw.palette.core
      );
      if (linkStamp) {
        const links = Math.max(8, Math.floor(dist / (22 * cw.scale)));
        for (let k = 0; k <= links; k++) {
          const lt = k / links;
          const wave =
            Math.sin(lt * Math.PI * 3 - cw.life * 28) * (1 - lt) * 18 * cw.scale;
          const lx = cw.startX + dx * lt - Math.sin(angle) * wave;
          const ly = cw.startY + dy * lt + Math.cos(angle) * wave;

          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(angle + (k % 2 === 0 ? 0.35 : -0.35));
          const sz = 28 * cw.scale;
          ctx.drawImage(linkStamp, -sz * 0.65, -sz * 0.4, sz * 1.3, sz * 0.8);
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  private renderGiantSwords(ctx: CanvasRenderingContext2D) {
    if (this.giantSwords.length === 0) return;
    ctx.save();

    for (let i = 0; i < this.giantSwords.length; i++) {
      const gs = this.giantSwords[i];
      const t = gs.life / gs.maxLife;
      const alpha = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;

      const swordSprite = getCelestialSwordTextureSprite(
        gs.palette.primary,
        gs.palette.secondary,
        gs.palette.core
      );
      const beamTex = getBeamPlasmaTextureSprite(
        gs.palette.primary,
        gs.palette.secondary,
        gs.palette.core
      );

      ctx.save();
      ctx.translate(gs.x, gs.y - gs.currentHeight);
      ctx.globalAlpha = alpha;

      const s = gs.scale;

      // 1. Vertical Sky Pillar God-Ray trailing above the falling sword
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(beamTex, 0, -45 * s, 260 * s, 90 * s);
      ctx.restore();

      // 2. Normal-Mapped Celestial Greatsword with Feathered Light Wings
      ctx.globalCompositeOperation = 'lighter';
      const sw = 165 * s;
      const sh = 260 * s;
      ctx.drawImage(swordSprite, -sw * 0.5, -sh + 22 * s, sw, sh);

      ctx.restore();
    }
    ctx.restore();
  }

  private renderSlashArcs(ctx: CanvasRenderingContext2D, params: ShaderParams) {
    if (this.slashArcs.length === 0) return;

    for (let i = 0; i < this.slashArcs.length; i++) {
      const s = this.slashArcs[i];
      if (s.delay > 0) continue;

      const t = s.life / s.maxLife;
      const headProgress = Math.min(1, Math.pow(t / 0.42, 0.5));
      const tailProgress =
        t < 0.16 ? 0 : Math.min(1, Math.pow((t - 0.16) / 0.84, 1.35));
      const alpha = 1 - Math.pow(t, 1.85);

      const curStart = s.startAngle + s.sweepAngle * tailProgress;
      const curEnd = s.startAngle + s.sweepAngle * headProgress;
      const activeSpan = curEnd - curStart;
      if (Math.abs(activeSpan) < 0.05) continue;

      const slashFrames = getErodedSlashFlipbook(
        s.palette.primary,
        s.palette.secondary,
        s.palette.core,
        s.palette.dark
      );
      const frameIdx = Math.min(6, Math.floor(t * 6.99));
      const midAngle = (curStart + curEnd) * 0.5;
      const stampDim = (s.radius + s.thickness * 0.68) * 2.25;

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.tiltAngle);
      ctx.scale(1, s.eccentricity);
      ctx.globalAlpha = alpha;

      // 1. Polar-UV Anisotropic Voronoi-Eroded Energy Aura (Secondary Layer)
      ctx.save();
      ctx.rotate(midAngle);
      if (s.sweepAngle < 0) ctx.scale(1, -1);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.65;
      ctx.drawImage(
        slashFrames[frameIdx],
        -stampDim * 0.5,
        -stampDim * 0.5,
        stampDim,
        stampDim
      );
      ctx.restore();

      // 2. Dynamic Style-Specific Ribbon Mesh (Follows exact curStart -> curEnd)
      const steps = 28;
      const drawDynamicSlashRibbon = (
        tailLag: number,
        radialOffset: number,
        thickScale: number,
        jagAmplitude: number
      ) => {
        const ribbonStart =
          s.startAngle + s.sweepAngle * Math.max(0, tailProgress - tailLag);
        const span = curEnd - ribbonStart;
        ctx.beginPath();
        for (let k = 0; k <= steps; k++) {
          const u = k / steps;
          const ang = ribbonStart + span * u;
          // Scythe bulges near the head (u=0.78); Vorpal/Wind tapers smoothly
          const profile =
            s.style === 'phantom_scythe'
              ? Math.pow(u, 0.55) * Math.sin(u * Math.PI * 0.92) * 1.35
              : Math.sin(u * Math.PI) * (0.75 + u * 0.45);
          const jag =
            jagAmplitude > 0
              ? fastNoise(s.seed + k * 0.55 + t * 16) *
                jagAmplitude *
                s.thickness *
                profile
              : 0;
          const r =
            s.radius +
            radialOffset +
            s.thickness * 0.5 * profile * thickScale +
            jag;
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        for (let k = steps; k >= 0; k--) {
          const u = k / steps;
          const ang = ribbonStart + span * u;
          const profile =
            s.style === 'phantom_scythe'
              ? Math.pow(u, 0.55) * Math.sin(u * Math.PI * 0.92) * 1.35
              : Math.sin(u * Math.PI) * (0.75 + u * 0.45);
          const innerTear =
            fastNoise(s.seed + 77 + k * 0.8 - t * 20) *
            0.16 *
            s.thickness *
            (1 - u);
          const r =
            s.radius +
            radialOffset -
            s.thickness * 0.45 * profile * thickScale +
            innerTear;
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      };

      // Layer A: Dark Under-Contrast Silhouette (Crucial for Riot/Hades value hierarchy)
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = s.palette.dark + 'D9';
      drawDynamicSlashRibbon(0.04, 0, 1.12, 0.14);

      // Layer B: Primary Saturated Motion Body + Staggered Multi-Tail Smears
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = s.palette.secondary;
      drawDynamicSlashRibbon(
        0.02,
        0,
        0.88,
        s.style === 'serrated_vorpal' ? 0.28 : 0.08
      );

      if (s.style === 'wind_razor') {
        // Triple aerodynamic wind-shear ribbons
        ctx.fillStyle = s.palette.primary;
        drawDynamicSlashRibbon(0.05, -s.thickness * 0.38, 0.32, 0);
        drawDynamicSlashRibbon(0.0, s.thickness * 0.35, 0.36, 0);
      } else {
        ctx.fillStyle = s.palette.primary;
        drawDynamicSlashRibbon(
          0,
          s.thickness * 0.08,
          0.56,
          s.style === 'serrated_vorpal' ? 0.18 : 0.04
        );
      }

      // Layer C: Razor-Sharp Specular Leading Blade Edge (#FFFFFF)
      ctx.fillStyle = s.palette.core;
      drawDynamicSlashRibbon(-0.04, s.thickness * 0.22, 0.22, 0);

      // Layer D: Leading Blade Tip Cruciform Glint
      const tipX = Math.cos(curEnd) * (s.radius + s.thickness * 0.18);
      const tipY = Math.sin(curEnd) * (s.radius + s.thickness * 0.18);
      const glow = getGlowSprite(s.palette.primary, s.palette.core);
      const glintSz = s.thickness * 1.45;
      ctx.drawImage(
        glow,
        tipX - glintSz * 0.5,
        tipY - glintSz * 0.5,
        glintSz,
        glintSz
      );

      ctx.restore();
    }
  }

  private renderDimensionCuts(ctx: CanvasRenderingContext2D, params: ShaderParams) {
    if (this.dimensionCuts.length === 0) return;
    ctx.save();

    for (let i = 0; i < this.dimensionCuts.length; i++) {
      const c = this.dimensionCuts[i];
      if (c.delay > 0) continue;

      const t = c.life / c.maxLife;
      const env = t < 0.18 ? t / 0.18 : 1 - (t - 0.18) / 0.82;
      const w = c.width * Math.max(0, env);
      if (w < 0.3) continue;

      const dx = c.x2 - c.x1;
      const dy = c.y2 - c.y1;
      const len = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      const isLightning = Math.abs(dy) > Math.abs(dx) * 1.6 && len > 240;

      if (isLightning) {
        // Fractal Branched Sky Lightning Bolt (Midpoint-displaced electric zig-zag + forks!)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, env * 1.3);

        const segs = 14;
        const pts: Array<{ x: number; y: number }> = [];
        const flickerSeed = Math.floor(c.life * 45) * 17 + i * 31;
        for (let s = 0; s <= segs; s++) {
          const u = s / segs;
          const jitter =
            s === 0 || s === segs
              ? 0
              : fastNoise(flickerSeed + s * 2.3) * 34 * Math.sin(u * Math.PI);
          const px = c.x1 + dx * u - Math.sin(ang) * jitter;
          const py = c.y1 + dy * u + Math.cos(ang) * jitter;
          pts.push({ x: px, y: py });
        }

        // Outer electric corona
        ctx.strokeStyle = c.palette.primary;
        ctx.lineWidth = w * 1.45;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        for (let s = 0; s < pts.length; s++) {
          if (s === 0) ctx.moveTo(pts[s].x, pts[s].y);
          else ctx.lineTo(pts[s].x, pts[s].y);
        }
        ctx.stroke();

        // Secondary forked lightning branches
        ctx.lineWidth = w * 0.45;
        ctx.beginPath();
        for (let s = 3; s < segs - 2; s += 3) {
          const branchSide = s % 2 === 0 ? 1 : -1;
          const bAng = ang + branchSide * 0.62;
          const bLen = len * 0.22;
          const bx1 = pts[s].x;
          const by1 = pts[s].y;
          const bxMid =
            bx1 +
            Math.cos(bAng) * bLen * 0.5 +
            fastNoise(flickerSeed + s * 9) * 16;
          const byMid = by1 + Math.sin(bAng) * bLen * 0.5;
          const bx2 = bx1 + Math.cos(bAng + branchSide * 0.2) * bLen;
          const by2 = by1 + Math.sin(bAng + branchSide * 0.2) * bLen;
          ctx.moveTo(bx1, by1);
          ctx.lineTo(bxMid, byMid);
          ctx.lineTo(bx2, by2);
        }
        ctx.stroke();

        // White-hot core bolt
        ctx.strokeStyle = c.palette.core;
        ctx.lineWidth = w * 0.48;
        ctx.beginPath();
        for (let s = 0; s < pts.length; s++) {
          if (s === 0) ctx.moveTo(pts[s].x, pts[s].y);
          else ctx.lineTo(pts[s].x, pts[s].y);
        }
        ctx.stroke();
        ctx.restore();
      } else {
        // Razor Dimensional Spatial Rift (Dark void core split + glowing plasma edges)
        const beamTex = getBeamPlasmaTextureSprite(
          c.palette.primary,
          c.palette.secondary,
          c.palette.core
        );

        ctx.save();
        ctx.translate(c.x1, c.y1);
        ctx.rotate(ang);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, env * 1.25);
        ctx.drawImage(beamTex, 0, -w * 2.1, len, w * 4.2);

        // Crisp razor-sharp spatial slit core
        ctx.fillStyle = c.palette.core;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(len * 0.5, -w * 0.45);
        ctx.lineTo(len, 0);
        ctx.lineTo(len * 0.5, w * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
  }

  private renderTornadoes(ctx: CanvasRenderingContext2D) {
    if (this.tornadoes.length === 0) return;
    ctx.save();

    for (let i = 0; i < this.tornadoes.length; i++) {
      const tor = this.tornadoes[i];
      const t = tor.life / tor.maxLife;
      const alpha =
        t < 0.15 ? t / 0.15 : t > 0.78 ? 1 - (t - 0.78) / 0.22 : 1;

      const pal = tor.palette;
      const primaryHex = pal?.primary || '#00D9FF';
      const secondaryHex = pal?.secondary || '#D49B35';
      const coreHex = pal?.core || '#FFFFFF';

      const phase = Math.floor(tor.life * 24) % 4;
      const vortexSprite = getTornadoVortexTextureSprite(
        primaryHex,
        secondaryHex,
        coreHex,
        phase
      );
      const shockSprite = getShockwaveTextureSprite(
        primaryHex,
        secondaryHex,
        coreHex,
        false
      );

      ctx.save();
      ctx.translate(tor.x, tor.y);
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'lighter';

      // 1. Swirling Ground Wind Vortex Base
      ctx.save();
      ctx.scale(1, 0.52);
      ctx.rotate(tor.life * 14);
      const baseR = tor.radius * 1.45;
      ctx.drawImage(shockSprite, -baseR, -baseR, baseR * 2, baseR * 2);
      ctx.restore();

      // 2. Volumetric 3D Helical Wind Funnel Texture
      const fw = tor.radius * 2.8;
      const fh = tor.height * 1.25;
      ctx.drawImage(vortexSprite, -fw * 0.5, -fh + 18, fw, fh);

      ctx.restore();
    }

    ctx.restore();
  }

  private renderFrostVeins(ctx: CanvasRenderingContext2D) {
    if (this.frostVeins.length === 0) return;
    ctx.save();

    for (let i = 0; i < this.frostVeins.length; i++) {
      const fv = this.frostVeins[i];
      const t = fv.life / fv.maxLife;
      const alpha = t < 0.7 ? 0.92 : (1 - (t - 0.7) / 0.3) * 0.92;
      const revealProgress = Math.min(1, fv.life / 0.16);

      ctx.globalAlpha = alpha;
      // Dark ice shadow crevice first
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = fv.palette.dark;
      ctx.lineCap = 'round';
      for (let s = 0; s < fv.segments.length; s++) {
        const seg = fv.segments[s];
        if (seg.depth > revealProgress) continue;
        ctx.lineWidth = seg.width * 2.6;
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
      }

      // Luminous crystalline frost ridge & specular core
      ctx.globalCompositeOperation = 'lighter';
      for (let s = 0; s < fv.segments.length; s++) {
        const seg = fv.segments[s];
        if (seg.depth > revealProgress) continue;

        ctx.strokeStyle = fv.palette.primary;
        ctx.lineWidth = seg.width * 1.7;
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();

        ctx.strokeStyle = fv.palette.core;
        ctx.lineWidth = seg.width * 0.65;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private renderGroundRunes(ctx: CanvasRenderingContext2D, params: ShaderParams) {
    if (this.groundRunes.length === 0) return;
    ctx.save();

    for (let i = 0; i < this.groundRunes.length; i++) {
      const r = this.groundRunes[i];
      const t = r.life / r.maxLife;
      const alpha =
        t < 0.12 ? t / 0.12 : 1 - Math.pow((t - 0.12) / 0.88, 1.5);

      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.scale(1, r.perspectiveY);
      ctx.globalAlpha = Math.max(0, alpha);

      if (r.style === 'freljord_star') {
        // Shattered Permafrost Ice Rime on the floor (ZERO pentagrams!)
        const iceTex = getGroundDecalTextureSprite(
          'permafrost_ice',
          r.palette.primary,
          r.palette.secondary,
          r.palette.core,
          r.palette.dark
        );
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(
          iceTex,
          -r.radius * 1.1,
          -r.radius * 1.1,
          r.radius * 2.2,
          r.radius * 2.2
        );
      } else if (r.style === 'sanctuary_mandala') {
        // Soothing Concentric Harmonic Fluid Waves (ZERO pentagrams!)
        const waveTex = getGroundDecalTextureSprite(
          'water_ripples',
          r.palette.primary,
          r.palette.secondary,
          r.palette.core,
          r.palette.dark
        );
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(
          waveTex,
          -r.radius * 1.08,
          -r.radius * 1.08,
          r.radius * 2.16,
          r.radius * 2.16
        );
      } else if (r.style === 'chrono_clock') {
        // Temporal Stasis Distortion Bubble + 2 Rotating Time Hands (ZERO pentagrams!)
        const waveTex = getGroundDecalTextureSprite(
          'water_ripples',
          r.palette.primary,
          r.palette.secondary,
          r.palette.core,
          r.palette.dark
        );
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(
          waveTex,
          -r.radius * 1.05,
          -r.radius * 1.05,
          r.radius * 2.1,
          r.radius * 2.1
        );

        // Minimalist time-dilation hands
        ctx.strokeStyle = r.palette.core;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(
          Math.cos(r.rotation * 2.2) * r.radius * 0.65,
          Math.sin(r.rotation * 2.2) * r.radius * 0.65
        );
        ctx.moveTo(0, 0);
        ctx.lineTo(
          Math.cos(-r.rotation * 0.6) * r.radius * 0.42,
          Math.sin(-r.rotation * 0.6) * r.radius * 0.42
        );
        ctx.stroke();
      } else if (r.style === 'hextech_astrolabe') {
        // Clean Sci-Fi Tactical Lock Reticle (4 segmented arcs, ZERO pentagrams!)
        ctx.globalCompositeOperation = 'lighter';
        ctx.rotate(r.rotation);
        ctx.strokeStyle = r.palette.primary;
        ctx.lineWidth = 3.2;
        for (let q = 0; q < 4; q++) {
          const a0 = (q * Math.PI) / 2 + 0.18;
          const a1 = ((q + 1) * Math.PI) / 2 - 0.18;
          ctx.beginPath();
          ctx.arc(0, 0, r.radius * 0.88, a0, a1);
          ctx.stroke();
        }
      } else {
        // 'infernal_target' | 'void_eye' | 'lunar_seal': Tectonic Shattered Impact Crater
        const craterTex = getGroundDecalTextureSprite(
          'tectonic_crater',
          r.palette.primary,
          r.palette.secondary,
          r.palette.core,
          r.palette.dark
        );
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(
          craterTex,
          -r.radius * 1.12,
          -r.radius * 1.12,
          r.radius * 2.24,
          r.radius * 2.24
        );
      }

      ctx.restore();
    }
    ctx.restore();
  }

  private renderShockRings(ctx: CanvasRenderingContext2D) {
    if (this.shockRings.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < this.shockRings.length; i++) {
      const sr = this.shockRings[i];
      if (sr.delay && sr.delay > 0) continue;

      const t = sr.life / sr.maxLife;
      const alpha = Math.pow(1 - t, 1.55);

      const pal = sr.palette;
      const primaryHex = pal?.primary || '#00F0FF';
      const secondaryHex = pal?.secondary || '#1A52B8';
      const coreHex = pal?.core || '#FFFFFF';

      const shockTex = getShockwaveTextureSprite(
        primaryHex,
        secondaryHex,
        coreHex,
        Boolean(sr.isHexagonal)
      );

      ctx.save();
      ctx.translate(sr.x, sr.y);
      ctx.rotate(sr.rotation + t * 0.8);
      ctx.scale(1, sr.perspectiveY);
      ctx.globalAlpha = alpha;

      const dim = sr.radius * 2.3;
      ctx.drawImage(shockTex, -dim * 0.5, -dim * 0.5, dim, dim);
      ctx.restore();
    }
    ctx.restore();
  }

  private renderCrystals(ctx: CanvasRenderingContext2D, layer: 'back' | 'front') {
    for (let i = 0; i < this.crystals.length; i++) {
      const c = this.crystals[i];
      if (c.layer !== layer || c.length <= 2) continue;

      const t = c.life / c.maxLife;
      const alpha = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;

      const crystalSprite = getProceduralCrystalSprite(
        c.palette.primary,
        c.palette.secondary,
        c.palette.core,
        c.seed % 3
      );

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle + Math.PI / 2);
      ctx.globalAlpha = alpha;

      const L = c.length * 1.15;
      const W = c.width * 1.45;

      // Base normal-mapped refractive crystal prism
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(crystalSprite, -W * 0.5, -L, W, L * 1.06);

      // Additive internal caustic glow pass
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.65;
      ctx.drawImage(crystalSprite, -W * 0.45, -L * 0.98, W * 0.9, L);

      ctx.restore();
    }
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D, params: ShaderParams) {
    if (this.projectiles.length === 0) return;
    ctx.save();

    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      if (p.delay && p.delay > 0) continue;

      const beamTex = getBeamPlasmaTextureSprite(
        p.palette.primary,
        p.palette.secondary,
        p.palette.core
      );

      // 1. Textured Plasma Slipstream Ribbon Trail (replaces flat lineTo stroke)
      if (p.history.length > 1) {
        ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < p.history.length - 1; k++) {
          const pt1 = p.history[k];
          const pt2 = p.history[k + 1];
          const segLen = Math.hypot(pt2.x - pt1.x, pt2.y - pt1.y);
          if (segLen < 1) continue;
          const segAng = Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x);
          const trailFade = 1 - k / p.history.length;

          ctx.save();
          ctx.translate(pt1.x, pt1.y);
          ctx.rotate(segAng);
          ctx.globalAlpha = trailFade * 0.85;
          const w = 26 * p.scale * trailFade;
          ctx.drawImage(beamTex, -segLen * 0.2, -w * 0.5, segLen * 1.4, w);
          ctx.restore();
        }
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      if (p.preset === 'boulder_avalanche') {
        // 3D Normal-Mapped Spinning Colossal Granite Boulder (Rock walls sprout on ground impact, not mid-air!)
        ctx.globalCompositeOperation = 'source-over';
        const rockStamp = getInstancedElementStamp(
          'rock_chunk',
          p.palette.primary,
          p.palette.core
        );
        const sz = 78 * p.scale;
        ctx.rotate(p.life * 14);
        if (rockStamp) {
          ctx.drawImage(rockStamp, -sz / 2, -sz / 2, sz, sz);
        }
      } else if (p.preset === 'crystal_arrow') {
        // Refractive Ice/Crystal Warhead
        ctx.globalCompositeOperation = 'lighter';
        const crystalSprite = getProceduralCrystalSprite(
          p.palette.primary,
          p.palette.secondary,
          p.palette.core,
          0
        );
        ctx.save();
        ctx.rotate(Math.PI / 2);
        const w = 38 * p.scale;
        const l = 78 * p.scale;
        ctx.drawImage(crystalSprite, -w * 0.5, -l * 0.6, w, l);
        ctx.restore();
      } else {
        // Volumetric Voronoi-Eroded Plasma Warhead
        ctx.globalCompositeOperation = 'lighter';
        const flipbook = getVoronoiExplosionFlipbook(
          p.palette.primary,
          p.palette.secondary,
          p.palette.core,
          p.palette.dark
        );
        const stage = Math.floor((p.life * 18) % 5);
        const sz = 62 * p.scale;
        ctx.drawImage(flipbook[stage], -sz * 0.55, -sz * 0.5, sz * 1.1, sz);

        const swordSprite = getCelestialSwordTextureSprite(
          p.palette.primary,
          p.palette.secondary,
          p.palette.core
        );
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(
          swordSprite,
          -24 * p.scale,
          -42 * p.scale,
          48 * p.scale,
          68 * p.scale
        );
      }

      ctx.restore();
    }
    ctx.restore();
  }

  private renderBeams(ctx: CanvasRenderingContext2D) {
    if (this.beams.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < this.beams.length; i++) {
      const b = this.beams[i];
      const t = b.life / b.maxLife;
      const env =
        t < 0.1 ? t / 0.1 : t < 0.72 ? 1 : 1 - (t - 0.72) / 0.28;
      const w = b.width * Math.max(0, env);
      if (w <= 1) continue;

      const beamTex = getBeamPlasmaTextureSprite(
        b.palette.primary,
        b.palette.secondary,
        b.palette.core
      );
      const flipbook = getVoronoiExplosionFlipbook(
        b.palette.primary,
        b.palette.secondary,
        b.palette.core,
        b.palette.dark
      );

      ctx.save();
      ctx.translate(b.startX, b.startY);
      ctx.rotate(b.angle);

      const len = Math.hypot(b.endX - b.startX, b.endY - b.startY);

      // 1. Outer Helical Plasma Corona & Lightning Filaments
      ctx.drawImage(beamTex, 0, -w * 1.5, len, w * 3.0);

      // 2. Inner High-Frequency White-Hot Core Stream
      ctx.drawImage(beamTex, 0, -w * 0.65, len, w * 1.3);

      // 3. Muzzle & Terminal Voronoi Plasma Vortex Flares
      const stage = Math.min(7, Math.floor(t * 7.99));
      const muzzleDim = w * 2.8;
      ctx.drawImage(
        flipbook[stage],
        -muzzleDim * 0.4,
        -muzzleDim * 0.5,
        muzzleDim,
        muzzleDim
      );
      ctx.drawImage(
        flipbook[(stage + 2) % 8],
        len - muzzleDim * 0.6,
        -muzzleDim * 0.5,
        muzzleDim,
        muzzleDim
      );

      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * INSTANCED PARTICLE RENDERER (Uses Pre-Baked 64x64 Element Stamps & Glow Cache)
   */
  private renderParticlesInstanced(ctx: CanvasRenderingContext2D) {
    const active = this.particlePool.active;
    if (active.length === 0) return;
    ctx.save();

    for (let i = 0; i < active.length; i++) {
      const p = active[i];
      if (p.alpha <= 0.01) continue;

      ctx.globalAlpha = p.alpha;

      // 1. Voronoi + FBM Stepped Alpha-Erosion Flipbook for Explosions & Fire Lobes
      if (p.type === 'fireball_lobe' || p.type === 'flame_tongue') {
        const lifeT = Math.min(1, p.life / Math.max(0.01, p.maxLife));
        const stageIdx = Math.min(7, Math.floor(lifeT * 7.99));
        const flipbook = getVoronoiExplosionFlipbook(
          p.color,
          p.color,
          p.coreColor,
          '#180905'
        );
        ctx.globalCompositeOperation = lifeT > 0.68 ? 'source-over' : 'lighter';
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const sz = p.size * (2.6 + lifeT * 0.75);
        ctx.drawImage(flipbook[stageIdx], -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
        continue;
      }

      // 2. Check Pre-Baked Instanced Stamp Atlas (Single drawImage call!)
      const stamp = getInstancedElementStamp(p.type, p.color, p.coreColor);
      if (stamp) {
        ctx.globalCompositeOperation =
          p.type === 'rock_chunk' || p.type === 'slime_droplet'
            ? 'source-over'
            : 'lighter';
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const sz = p.size * 2.4;
        ctx.drawImage(stamp, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
        continue;
      }

      // 3. Volumetric Voronoi Smoke Puff or Anisotropic Plasma Spark
      if (p.type === 'smoke_puff') {
        const lifeT = Math.min(1, p.life / Math.max(0.01, p.maxLife));
        const stageIdx = Math.min(7, 3 + Math.floor(lifeT * 4.99));
        const flipbook = getVoronoiExplosionFlipbook(
          p.color,
          '#57534E',
          p.coreColor,
          '#1C1917'
        );
        ctx.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const sz = p.size * (2.5 + lifeT * 1.1);
        ctx.drawImage(flipbook[stageIdx], -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      } else {
        ctx.globalCompositeOperation = 'lighter';
        const tailX =
          p.trail && p.trail.length > 2 && p.trail[2]
            ? p.trail[2].x
            : p.x - p.vx * 0.035;
        const tailY =
          p.trail && p.trail.length > 2 && p.trail[2]
            ? p.trail[2].y
            : p.y - p.vy * 0.035;
        const dx = p.x - tailX;
        const dy = p.y - tailY;
        const segLen = Math.max(p.size * 2.2, Math.hypot(dx, dy) * 1.35);
        const ang = Math.atan2(dy, dx);

        const beamTex = getBeamPlasmaTextureSprite(
          p.color,
          p.color,
          p.coreColor
        );
        ctx.save();
        ctx.translate(tailX, tailY);
        ctx.rotate(ang);
        const w = p.size * 2.2;
        ctx.drawImage(beamTex, 0, -w * 0.5, segLen, w);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  private renderImpactFlashes(ctx: CanvasRenderingContext2D) {
    if (this.impactFlashes.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < this.impactFlashes.length; i++) {
      const f = this.impactFlashes[i];
      const t = f.life / f.maxLife;
      ctx.globalAlpha = 1 - t;

      const pal = f.palette;
      const primaryHex = pal?.primary || '#FF7700';
      const secondaryHex = pal?.secondary || '#B81D00';
      const coreHex = pal?.core || '#FFFFF0';
      const darkHex = pal?.dark || '#210500';

      const flipbook = getVoronoiExplosionFlipbook(
        primaryHex,
        secondaryHex,
        coreHex,
        darkHex
      );
      const shockTex = getShockwaveTextureSprite(
        primaryHex,
        secondaryHex,
        coreHex,
        false
      );

      const dim = f.radius * (2.1 - t * 0.4);
      ctx.drawImage(
        flipbook[0],
        f.x - dim * 0.5,
        f.y - dim * 0.5,
        dim,
        dim
      );
      ctx.drawImage(
        shockTex,
        f.x - dim * 0.65,
        f.y - dim * 0.65,
        dim * 1.3,
        dim * 1.3
      );
    }

    ctx.restore();
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D) {
    if (this.floatingTexts.length === 0) return;
    ctx.save();

    for (let i = 0; i < this.floatingTexts.length; i++) {
      const ft = this.floatingTexts[i];
      const t = ft.life / ft.maxLife;
      const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;

      ctx.save();
      ctx.translate(ft.x, ft.y);
      ctx.globalAlpha = Math.max(0, alpha);

      ctx.font = 'italic 900 19px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 4;
      ctx.strokeText(ft.text, 0, 0);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);

      if (ft.subtext) {
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#38BDF8';
        ctx.fillText(ft.subtext, 0, -17);
      }

      ctx.restore();
    }
    ctx.restore();
  }
}

export function generateSpritesheetCanvas(
  presetId: VfxPresetId,
  palette: ElementalPalette,
  params: ShaderParams,
  cols = 4,
  rows = 4,
  frameSize = 256
): HTMLCanvasElement {
  const sheet = document.createElement('canvas');
  sheet.width = cols * frameSize;
  sheet.height = rows * frameSize;
  const sCtx = sheet.getContext('2d');
  if (!sCtx) return sheet;

  const simEngine = new VfxEngine(frameSize, frameSize);
  simEngine.simulationEnabled = false;
  simEngine.slimes = [];
  simEngine.heroX = frameSize * 0.22;
  simEngine.heroY = frameSize * 0.5;

  const bakeParams: ShaderParams = {
    ...params,
    enableSound: false,
    screenShakeIntensity: 0,
    hitstopMs: 0,
    effectScale: params.effectScale * (frameSize / 360),
  };

  simEngine.triggerPreset(presetId, frameSize * 0.58, frameSize * 0.5, palette, bakeParams);

  const totalFrames = cols * rows;
  const dt = 0.68 / totalFrames;

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = frameSize;
  frameCanvas.height = frameSize;
  const fCtx = frameCanvas.getContext('2d');

  for (let f = 0; f < totalFrames; f++) {
    simEngine.update(dt, bakeParams);
    if (fCtx) {
      fCtx.clearRect(0, 0, frameSize, frameSize);
      simEngine.renderEffectsOnly(fCtx, bakeParams);

      const col = f % cols;
      const row = Math.floor(f / cols);
      sCtx.drawImage(frameCanvas, col * frameSize, row * frameSize);
    }
  }

  return sheet;
}
