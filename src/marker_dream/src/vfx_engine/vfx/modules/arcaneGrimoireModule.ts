// ============================================================================
// MODULE: EXPANDED ARCANE GRIMOIRE (#37 - #48)
// 12 High-Craft 2D/2.5D Spells with Pixel-Shader Textures & Enemy Hit Reactions
// - #37 Tsunami Abissal (Leviatã Hidrostático)
// - #38 Turbilhão Hidro-Vórtice (Maelstrom)
// - #39 Florescer do Éden (Árvore & Pétalas Solares)
// - #40 Lança-Chamas Dracônico (Sopro de Magma)
// - #41 Erupção Vulcânica (Caldeira & Meteoros)
// - #42 Zero Absoluto (Cúpula Criogênica)
// - #43 Praga Necrótica (Enxame & Corrosão)
// - #44 Julgamento de Hélio (Prisma Orbital Solar)
// - #45 Fenda do Abismo (Tentáculos & Olho de Sombra)
// - #46 Bobina de Tesla (Corrente de Arco Voltaico)
// - #47 Tumba de Jazer (Sarcófago de Basalto)
// - #48 Ascensão Seráfica (Balança & Asas Celestiais)
// ============================================================================

import { ElementalPalette, ShaderParams, SlimeActor } from '../types';
import { removeSwapPop } from '../core/mathLut';
import {
  getBeamPlasmaTextureSprite,
  getBioluminescentCanopySprite,
  getChitinScarabSwarmSprite,
  getElementalArrowTextureSprite,
  getGroundDecalTextureSprite,
  getSphericalShieldTextureSprite,
  getTidalWaveCrestSprite,
  getVoronoiExplosionFlipbook,
  SphericalShieldStyle,
} from '../core/proceduralTextures';
import { soundEngine } from '../soundEngine';
import { getCharacterVisualBounds } from './slimeActorModule';
import {
  getAssetOfcForPalette,
  getExtraProjectileRuneAsset,
  isImageReady,
} from '../core/assetsOfcRegistry';
import type { VfxEngine } from '../vfxEngine';

export interface TidalWaveEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  width: number;
  height: number;
  life: number;
  maxLife: number;
  palette: ElementalPalette;
  casterId?: string;
  hitSlimeIds: Set<string>;
}

export interface EdenCanopyEntity {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  tickTimer: number;
  palette: ElementalPalette;
  casterId?: string;
}

export interface SphericalBarrierOrbEntity {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  delay: number;
  style: SphericalShieldStyle;
  palette: ElementalPalette;
  followSlimeId?: string;
}

export interface ArrowProjectileEntity {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  gravityZ: number;
  angle: number;
  scale: number;
  life: number;
  maxLife: number;
  delay: number;
  palette: ElementalPalette;
  casterId?: string;
  mode: 'volley' | 'sky_rain' | 'sniper_pierce' | 'bramble_snare' | 'frost_ricochet';
  ricochetsLeft: number;
  hitSlimeIds: Set<string>;
}

export interface InsectSwarmAgentEntity {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  angle: number;
  orbitOffset: number;
  size: number;
  life: number;
  maxLife: number;
  biteTimer: number;
  palette: ElementalPalette;
  casterId?: string;
  casterTeam: 0 | 1;
  isScarab?: boolean;
}

export interface HornetHiveTotemEntity {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  spawnWaveTimer: number;
  palette: ElementalPalette;
  casterId?: string;
  casterTeam: 0 | 1;
}

export interface PyroclasticFireballEntity {
  x: number;
  y: number;
  z: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  scale: number;
  life: number;
  maxLife: number;
  scorchTick: number;
  mode: 'standard_fireball' | 'colossal_sun';
  palette: ElementalPalette;
  casterId?: string;
  hitSlimeIds: Set<string>;
}

export interface ExpandingFlameWaveEntity {
  originX: number;
  originY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  startWidth: number;
  maxWidth: number;
  currentWidth: number;
  startSpread: number;
  maxSpread: number;
  currentSpread: number;
  scale: number;
  life: number;
  maxLife: number;
  crestTick: number;
  palette: ElementalPalette;
  casterId?: string;
  hitSlimeIds: Set<string>;
}

const activeTidalWaves: TidalWaveEntity[] = [];
const activeEdenCanopies: EdenCanopyEntity[] = [];
const activeSphericalOrbs: SphericalBarrierOrbEntity[] = [];
const activeArrows: ArrowProjectileEntity[] = [];
const activeInsects: InsectSwarmAgentEntity[] = [];
const activeHives: HornetHiveTotemEntity[] = [];
const activePyroFireballs: PyroclasticFireballEntity[] = [];
const activeExpandingFlames: ExpandingFlameWaveEntity[] = [];

export function clearArcaneGrimoireEntities() {
  activeTidalWaves.length = 0;
  activeEdenCanopies.length = 0;
  activeSphericalOrbs.length = 0;
  activeArrows.length = 0;
  activeInsects.length = 0;
  activeHives.length = 0;
  activePyroFireballs.length = 0;
  activeExpandingFlames.length = 0;
}

export function getArcaneGrimoireEntityCount(): number {
  return (
    activeTidalWaves.length +
    activeEdenCanopies.length +
    activeSphericalOrbs.length +
    activeArrows.length +
    activeInsects.length +
    activeHives.length +
    activePyroFireballs.length +
    activeExpandingFlames.length
  );
}

export function updateArcaneGrimoireModule(
  engine: VfxEngine,
  dt: number,
  params: ShaderParams
) {
  const scale = params.effectScale * 0.7;

  // 1. Update Crashing Tidal Waves (#37 Tsunami Abissal)
  for (let i = activeTidalWaves.length - 1; i >= 0; i--) {
    const tw = activeTidalWaves[i];
    tw.life += dt;
    tw.x += tw.vx * dt;
    tw.y += tw.vy * dt;

    // Emit trailing sea-foam spray & water droplets
    if (Math.random() < dt * 32) {
      const perp = tw.angle + Math.PI / 2;
      const spread = (Math.random() - 0.5) * tw.width;
      engine.spawnParticle({
        x: tw.x + Math.cos(perp) * spread,
        y: tw.y + Math.sin(perp) * spread,
        z: 16 + Math.random() * 28,
        vx: -tw.vx * 0.25 + (Math.random() - 0.5) * 90,
        vy: -tw.vy * 0.25 - 60 - Math.random() * 80,
        vz: 90,
        size: (6 + Math.random() * 7) * scale,
        color: tw.palette.primary,
        coreColor: tw.palette.core,
        alpha: 1,
        life: 0,
        maxLife: 0.36,
        drag: 0.93,
        gravity: 420,
        bounce: 0.4,
        floorY: tw.y + 24,
        type: 'sweat_drop',
        rotation: tw.angle,
        vRot: 0,
        stretch: 1.5,
        seed: i,
      });
    }

    // Sweeping Hydro Collision with Enemy Slimes
    engine.slimes.forEach((s) => {
      if (tw.casterId && s.id === tw.casterId) return;
      if (tw.hitSlimeIds.has(s.id)) return;
      const dist = Math.hypot(s.x - tw.x, s.y - tw.y);
      if (dist <= tw.width * 0.65 + s.radius) {
        tw.hitSlimeIds.add(s.id);
        s.soakedTimer = 2.6;
        engine.damageSlime(s, 2320, 'TSUNAMI ABISSAL!', tw.palette, tw.casterId, {
          knockupVelocity: 360,
          knockbackX: Math.cos(tw.angle) * 420,
          knockbackY: Math.sin(tw.angle) * 420,
        });
      }
    });

    if (tw.life >= tw.maxLife) {
      removeSwapPop(activeTidalWaves, i);
    }
  }

  // 2. Update Bioluminescent Eden Canopies (#39 Florescer do Éden)
  for (let i = activeEdenCanopies.length - 1; i >= 0; i--) {
    const ec = activeEdenCanopies[i];
    ec.life += dt;
    ec.tickTimer += dt;

    if (Math.random() < dt * 24) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * ec.radius * 0.9;
      engine.spawnParticle({
        x: ec.x + Math.cos(ang) * r,
        y: ec.y + Math.sin(ang) * r * 0.58,
        z: 12,
        vx: Math.cos(ang + 1.4) * 55,
        vy: -55 - Math.random() * 65,
        vz: 45,
        size: (6 + Math.random() * 6) * scale,
        color: Math.random() < 0.5 ? '#39FF14' : '#FFD747',
        coreColor: '#FFFFFF',
        alpha: 1,
        life: 0,
        maxLife: 0.55,
        drag: 0.95,
        gravity: -25,
        bounce: 0,
        floorY: 9999,
        type: Math.random() < 0.5 ? 'petal_thorn' : 'heal_cross',
        rotation: ang,
        vRot: 5,
        stretch: 1.4,
        seed: i,
      });
    }

    if (ec.tickTimer >= 0.45) {
      ec.tickTimer = 0;
      engine.applySupportHealAndBuff(ec.x, ec.y, ec.radius, ec.palette, {
        casterId: ec.casterId,
        healAmount: 980,
        regenDuration: 1.5,
        label: '+SEIVA DO ÉDEN!',
      });
    }

    if (ec.life >= ec.maxLife) {
      removeSwapPop(activeEdenCanopies, i);
    }
  }

  // 3. Update 3D Ray-Casted Spherical Barrier Orbs & Bubbles (#42, #49 - #56)
  for (let i = activeSphericalOrbs.length - 1; i >= 0; i--) {
    const orb = activeSphericalOrbs[i];
    if (orb.delay > 0) {
      orb.delay -= dt;
      continue;
    }
    orb.life += dt;

    if (orb.followSlimeId) {
      const host = engine.slimes.find((s) => s.id === orb.followSlimeId);
      if (host) {
        const bounds = getCharacterVisualBounds(host);
        orb.x = host.x;
        orb.y = host.y - host.z + bounds.centerYOffset;
        orb.maxRadius = bounds.boundSize * 1.05 * 0.5;
      }
    }

    const growT = Math.min(1, orb.life / 0.16);
    const easeOutBack =
      1 + 1.8 * Math.pow(growT - 1, 3) + 0.8 * Math.pow(growT - 1, 2);
    orb.radius = orb.maxRadius * Math.max(0.1, easeOutBack);

    if (orb.life >= orb.maxLife) {
      removeSwapPop(activeSphericalOrbs, i);
    }
  }

  // 4. Update 2.5D Fletched Arrow Projectiles (#57, #58, #61, #62, #64)
  for (let i = activeArrows.length - 1; i >= 0; i--) {
    const ar = activeArrows[i];
    if (ar.delay > 0) {
      ar.delay -= dt;
      continue;
    }
    ar.life += dt;
    const prevX = ar.x;
    const prevY = ar.y - ar.z;

    ar.x += ar.vx * dt;
    ar.y += ar.vy * dt;
    ar.z += ar.vz * dt;
    ar.vz -= ar.gravityZ * dt;

    const curScreenY = ar.y - ar.z;
    ar.angle = Math.atan2(curScreenY - prevY, ar.x - prevX);

    // Slipstream wind/ember trail
    if (Math.random() < dt * 28) {
      engine.spawnParticle({
        x: ar.x,
        y: curScreenY,
        z: 0,
        vx: -ar.vx * 0.12 + (Math.random() - 0.5) * 35,
        vy: -ar.vy * 0.12 + (Math.random() - 0.5) * 35,
        vz: 10,
        size: 5.5 * ar.scale,
        color: ar.palette.primary,
        coreColor: ar.palette.core,
        alpha: 1,
        life: 0,
        maxLife: 0.22,
        drag: 0.92,
        gravity: 0,
        bounce: 0,
        floorY: 9999,
        type: 'wind_wisp',
        rotation: ar.angle,
        vRot: 0,
        stretch: 2.2,
        seed: i,
      });
    }

    // Sky Rain Ground Landing Check
    if (ar.mode === 'sky_rain' && ar.z <= 0 && ar.life > 0.12) {
      ar.z = 0;
      engine.shockRings.push({
        x: ar.x,
        y: ar.y,
        radius: 6,
        maxRadius: 48 * ar.scale,
        thickness: 5 * ar.scale,
        life: 0,
        maxLife: 0.24,
        palette: ar.palette,
        perspectiveY: 0.55,
        rotation: 0,
      });
      engine.applyAreaEffect(ar.x, ar.y, 58 * ar.scale, 420, 'CHUVA DE FLECHAS!', ar.palette, {
        casterId: ar.casterId,
      });
      removeSwapPop(activeArrows, i);
      continue;
    }

    // Direct Hit Check against Enemy Slimes
    if (ar.mode !== 'sky_rain') {
      let consumed = false;
      for (let sIdx = 0; sIdx < engine.slimes.length; sIdx++) {
        const s = engine.slimes[sIdx];
        if (ar.casterId && s.id === ar.casterId) continue;
        if (ar.hitSlimeIds.has(s.id)) continue;

        const d = Math.hypot(s.x - ar.x, s.y - s.z - curScreenY);
        if (d <= s.radius + 22 * ar.scale) {
          ar.hitSlimeIds.add(s.id);

          if (ar.mode === 'bramble_snare') {
            // Root enemy in thorny vines so archer can kite freely!
            s.rootTimer = 2.5;
            engine.damageSlime(s, 1480, 'FLECHA DE ESPINHOS!', ar.palette, ar.casterId, {
              stunDuration: 0.55,
            });
            activeEdenCanopies.push({
              x: s.x,
              y: s.y,
              radius: 82 * ar.scale,
              life: 0,
              maxLife: 1.15,
              tickTimer: 0,
              palette: ar.palette,
              casterId: ar.casterId,
            });
            consumed = true;
            break;
          } else if (ar.mode === 'frost_ricochet') {
            s.frozenTimer = 1.65;
            engine.damageSlime(s, 1280, 'RICOCHETE GLACIAL!', ar.palette, ar.casterId, {
              freezeDuration: 1.65,
            });
            if (ar.ricochetsLeft > 0) {
              ar.ricochetsLeft--;
              const nextTarget = engine.slimes.find(
                (other) =>
                  other.id !== ar.casterId &&
                  !ar.hitSlimeIds.has(other.id) &&
                  other.team === s.team
              );
              if (nextTarget) {
                const rAngle = Math.atan2(nextTarget.y - ar.y, nextTarget.x - ar.x);
                const spd = Math.hypot(ar.vx, ar.vy);
                ar.vx = Math.cos(rAngle) * spd;
                ar.vy = Math.sin(rAngle) * spd;
                ar.life = 0;
              } else {
                consumed = true;
              }
            } else {
              consumed = true;
            }
            break;
          } else if (ar.mode === 'sniper_pierce') {
            engine.damageSlime(s, 2450, 'SNIPER MACH-5!', ar.palette, ar.casterId, {
              shockDuration: 1.1,
              knockbackX: Math.cos(ar.angle) * 440,
              knockbackY: Math.sin(ar.angle) * 440,
            });
            engine.shockRings.push({
              x: s.x,
              y: s.y,
              radius: 10,
              maxRadius: 95 * ar.scale,
              thickness: 10 * ar.scale,
              life: 0,
              maxLife: 0.28,
              palette: ar.palette,
              perspectiveY: 0.72,
              rotation: ar.angle,
            });
            // Sniper arrow pierces through all enemies!
          } else {
            // 'volley'
            engine.damageSlime(s, 680, 'FLECHA EÓLICA!', ar.palette, ar.casterId, {
              knockbackX: Math.cos(ar.angle) * 210,
              knockbackY: Math.sin(ar.angle) * 210,
            });
            consumed = true;
            break;
          }
        }
      }

      if (consumed) {
        removeSwapPop(activeArrows, i);
        continue;
      }
    }

    if (ar.life >= ar.maxLife) {
      removeSwapPop(activeArrows, i);
    }
  }

  // 5. Update Autonomous Chitinous Insect Swarms (#59, #60, #63)
  for (let i = activeInsects.length - 1; i >= 0; i--) {
    const bug = activeInsects[i];
    bug.life += dt;
    bug.biteTimer -= dt;

    // Seek nearest enemy Slime
    const enemies = engine.slimes.filter((s) => s.team !== bug.casterTeam);
    let target = enemies[0];
    let bestD = Infinity;
    for (let e = 0; e < enemies.length; e++) {
      const d = Math.hypot(enemies[e].x - bug.x, enemies[e].y - bug.y);
      if (d < bestD) {
        bestD = d;
        target = enemies[e];
      }
    }

    if (target) {
      const orbitA = bug.life * 7.5 + bug.orbitOffset;
      const desiredX = target.x + Math.cos(orbitA) * (bug.isScarab ? 12 : 34);
      const desiredY = target.y - target.z - 12 + Math.sin(orbitA) * (bug.isScarab ? 8 : 22);
      const dx = desiredX - bug.x;
      const dy = desiredY - bug.y;
      const dist = Math.hypot(dx, dy) || 1;
      const accel = bug.isScarab ? 920 : 780;

      bug.vx += (dx / dist) * accel * dt;
      bug.vy += (dy / dist) * accel * dt;

      // Bite / Detonation when close to enemy!
      const rawDist = Math.hypot(target.x - bug.x, target.y - target.z - bug.y);
      if (rawDist <= target.radius + 26) {
        if (bug.isScarab) {
          // Scarab detonates on impact in a golden solar chitin burst!
          engine.damageSlime(target, 640, 'ESCARAVELHO REAL!', bug.palette, bug.casterId, {
            stunDuration: 0.35,
          });
          engine.shockRings.push({
            x: bug.x,
            y: bug.y,
            radius: 6,
            maxRadius: 56,
            thickness: 6,
            life: 0,
            maxLife: 0.24,
            palette: bug.palette,
            perspectiveY: 0.6,
            rotation: 0,
          });
          removeSwapPop(activeInsects, i);
          continue;
        } else if (bug.biteTimer <= 0) {
          bug.biteTimer = 0.38 + Math.random() * 0.18;
          target.corrodeTimer = Math.max(target.corrodeTimer || 0, 1.2);
          target.poisonTimer = Math.max(target.poisonTimer, 1.5);
          engine.damageSlime(target, 210, 'ENXAME DEVORADOR!', bug.palette, bug.casterId);
        }
      }
    }

    const drag = Math.pow(0.14, dt);
    bug.vx *= drag;
    bug.vy *= drag;
    bug.x += bug.vx * dt;
    bug.y += bug.vy * dt;
    bug.angle = Math.atan2(bug.vy, bug.vx);

    if (bug.life >= bug.maxLife) {
      removeSwapPop(activeInsects, i);
    }
  }

  // 6. Update Hornet Hive Totems (#60)
  for (let i = activeHives.length - 1; i >= 0; i--) {
    const hive = activeHives[i];
    hive.life += dt;
    hive.spawnWaveTimer -= dt;

    if (hive.spawnWaveTimer <= 0) {
      hive.spawnWaveTimer = 0.52;
      soundEngine.playSlash(1.4);
      for (let b = 0; b < 4; b++) {
        const ang = (b * Math.PI) / 2 + hive.life * 3;
        activeInsects.push({
          x: hive.x + Math.cos(ang) * 18,
          y: hive.y - 16 + Math.sin(ang) * 12,
          z: 16,
          vx: Math.cos(ang) * 240,
          vy: Math.sin(ang) * 240,
          angle: ang,
          orbitOffset: b * 1.57,
          size: 28 * scale,
          life: 0,
          maxLife: 1.55,
          biteTimer: 0.1,
          palette: hive.palette,
          casterId: hive.casterId,
          casterTeam: hive.casterTeam,
          isScarab: false,
        });
      }
    }

    if (hive.life >= hive.maxLife) {
      removeSwapPop(activeHives, i);
    }
  }

  // 7. Update Pyroclastic Fireballs (#83 Bola de Fogo & #84 Big Fire Ball Colossal)
  for (let i = activePyroFireballs.length - 1; i >= 0; i--) {
    const fb = activePyroFireballs[i];
    fb.life += dt;
    fb.scorchTick += dt;
    fb.x += fb.vx * dt;
    fb.y += fb.vy * dt;

    const progress = Math.min(1, fb.life / Math.max(0.05, fb.maxLife));
    const isColossal = fb.mode === 'colossal_sun';
    fb.z = isColossal
      ? (44 * (1 - progress * 0.65) + Math.sin(progress * Math.PI) * 28) * fb.scale
      : 18 * fb.scale;

    // Continuous turbulent Voronoi flame wake + glowing embers
    const emitRate = isColossal ? 52 : 34;
    if (Math.random() < dt * emitRate) {
      const perp = fb.angle + Math.PI / 2;
      const offset = (Math.random() - 0.5) * fb.radius * 1.15;
      engine.spawnParticle({
        x: fb.x - Math.cos(fb.angle) * fb.radius * 0.4 + Math.cos(perp) * offset,
        y: fb.y - Math.sin(fb.angle) * fb.radius * 0.4 + Math.sin(perp) * offset,
        z: fb.z + (Math.random() - 0.5) * 14,
        vx: -fb.vx * 0.22 + (Math.random() - 0.5) * 95,
        vy: -fb.vy * 0.22 - 35 + (Math.random() - 0.5) * 95,
        vz: 45 + Math.random() * 65,
        size: (isColossal ? 26 + Math.random() * 24 : 14 + Math.random() * 14) * fb.scale,
        color: fb.palette.primary,
        coreColor: fb.palette.core,
        alpha: 1,
        life: 0,
        maxLife: isColossal ? 0.42 : 0.28,
        drag: 0.91,
        gravity: -55,
        bounce: 0,
        floorY: 9999,
        type: Math.random() < 0.68 ? 'fireball_lobe' : 'slash_ember',
        rotation: fb.angle + Math.PI + (Math.random() - 0.5) * 0.5,
        vRot: (Math.random() - 0.5) * 6,
        stretch: isColossal ? 1.55 : 1.35,
        seed: Math.floor(Math.random() * 100),
      });
    }

    // Colossal Big Fire Ball scorches the ground with magma fissures as it travels
    if (isColossal && fb.scorchTick >= 0.09) {
      fb.scorchTick = 0;
      engine.groundRunes.push({
        x: fb.x,
        y: fb.y,
        radius: 12,
        maxRadius: fb.radius * 1.15,
        rotation: fb.angle + (Math.random() - 0.5) * 0.6,
        vRot: 0,
        life: 0,
        maxLife: 0.55,
        style: 'infernal_target',
        palette: fb.palette,
        perspectiveY: 0.56,
      });
    }

    // Check enemy collision along flight corridor
    let hitEnemy = false;
    for (let sIdx = 0; sIdx < engine.slimes.length; sIdx++) {
      const s = engine.slimes[sIdx];
      if (fb.casterId && s.id === fb.casterId) continue;
      const dist = Math.hypot(s.x - fb.x, s.y - fb.y);
      if (dist <= fb.radius * 0.85 + s.radius) {
        if (!isColossal) {
          hitEnemy = true;
          break;
        } else if (!fb.hitSlimeIds.has(s.id)) {
          fb.hitSlimeIds.add(s.id);
          engine.damageSlime(s, 1180, 'CHAMUSCO SOLAR!', fb.palette, fb.casterId, {
            burnDuration: 2.2,
            knockbackX: Math.cos(fb.angle) * 210,
            knockbackY: Math.sin(fb.angle) * 210,
          });
        }
      }
    }

    if (hitEnemy || fb.life >= fb.maxLife) {
      detonatePyroclasticFireball(engine, fb, params);
      removeSwapPop(activePyroFireballs, i);
    }
  }

  // 8. Update Expanding Flame Waves (#85 Labareda de Fogo que se expande à frente)
  for (let i = activeExpandingFlames.length - 1; i >= 0; i--) {
    const wave = activeExpandingFlames[i];
    wave.life += dt;
    wave.crestTick += dt;
    wave.x += wave.vx * dt;
    wave.y += wave.vy * dt;

    const progress = Math.min(1, wave.life / Math.max(0.05, wave.maxLife));
    // Smooth nonlinear expansion as the flame wave travels forward!
    const expandCurve = 1 - Math.pow(1 - progress, 1.45);
    wave.currentWidth =
      wave.startWidth + (wave.maxWidth - wave.startWidth) * expandCurve;
    wave.currentSpread =
      wave.startSpread + (wave.maxSpread - wave.startSpread) * expandCurve;

    const perp = wave.angle + Math.PI / 2;

    // Periodic expanding vorpal fire wave arcs + ground lava fissures
    if (wave.crestTick >= 0.075) {
      wave.crestTick = 0;
      const arcRadius = Math.max(38 * wave.scale, wave.currentWidth * 0.62);
      engine.slashArcs.push({
        x: wave.x - Math.cos(wave.angle) * arcRadius * 0.42,
        y: wave.y - Math.sin(wave.angle) * arcRadius * 0.42,
        radius: arcRadius,
        thickness: (22 + 24 * expandCurve) * wave.scale,
        startAngle: wave.angle - wave.currentSpread * 0.85,
        sweepAngle: wave.currentSpread * 1.7,
        life: 0,
        maxLife: 0.24,
        delay: 0,
        palette: wave.palette,
        seed: Math.random() * 100,
        flip: false,
        style: 'serrated_vorpal',
        eccentricity: 0.72,
        tiltAngle: wave.angle,
      });

      engine.groundRunes.push({
        x: wave.x,
        y: wave.y,
        radius: 14,
        maxRadius: wave.currentWidth * 0.58,
        rotation: wave.angle,
        vRot: 0,
        life: 0,
        maxLife: 0.52,
        style: 'infernal_target',
        palette: wave.palette,
        perspectiveY: 0.56,
      });
    }

    // Spawn billowing Voronoi flame lobes across the entire expanding wave front
    const lobeCount = Math.max(2, Math.floor(4 * expandCurve));
    for (let l = 0; l < lobeCount; l++) {
      if (Math.random() < dt * 36) {
        const u = (Math.random() - 0.5) * wave.currentWidth;
        const curveBack = -Math.pow((u / Math.max(1, wave.currentWidth * 0.5)), 2) * 26 * wave.scale;
        const px = wave.x + Math.cos(perp) * u + Math.cos(wave.angle) * curveBack;
        const py = wave.y + Math.sin(perp) * u + Math.sin(wave.angle) * curveBack;

        engine.spawnParticle({
          x: px,
          y: py,
          z: 10 + Math.random() * 18,
          vx: Math.cos(wave.angle) * 140 + Math.cos(perp) * (u * 1.15),
          vy: Math.sin(wave.angle) * 140 + Math.sin(perp) * (u * 1.15) - 35,
          vz: 55 + Math.random() * 65,
          size: (18 + 20 * expandCurve + Math.random() * 12) * wave.scale,
          color: wave.palette.primary,
          coreColor: wave.palette.core,
          alpha: 1,
          life: 0,
          maxLife: 0.32 + Math.random() * 0.16,
          drag: 0.9,
          gravity: -40,
          bounce: 0,
          floorY: 9999,
          type: Math.random() < 0.72 ? 'fireball_lobe' : 'flame_tongue',
          rotation: wave.angle + (u / Math.max(1, wave.currentWidth)) * 0.65,
          vRot: (Math.random() - 0.5) * 6,
          stretch: 1.55,
          seed: Math.floor(Math.random() * 100),
        });
      }
    }

    // Sweep collision across the expanding frontal crest
    for (let sIdx = 0; sIdx < engine.slimes.length; sIdx++) {
      const s = engine.slimes[sIdx];
      if (wave.casterId && s.id === wave.casterId) continue;
      if (wave.hitSlimeIds.has(s.id)) continue;

      // Project enemy onto wave front line segment
      const dx = s.x - wave.x;
      const dy = s.y - wave.y;
      const forwardDist = Math.abs(dx * Math.cos(wave.angle) + dy * Math.sin(wave.angle));
      const lateralDist = Math.abs(dx * Math.cos(perp) + dy * Math.sin(perp));

      if (
        forwardDist <= 42 * wave.scale + s.radius &&
        lateralDist <= wave.currentWidth * 0.55 + s.radius
      ) {
        wave.hitSlimeIds.add(s.id);
        engine.damageSlime(s, 2240, 'LABAREDA EXPANSIVA!', wave.palette, wave.casterId, {
          burnDuration: 2.8,
          knockupVelocity: 260,
          knockbackX: Math.cos(wave.angle) * 380,
          knockbackY: Math.sin(wave.angle) * 380,
        });
      }
    }

    if (wave.life >= wave.maxLife) {
      removeSwapPop(activeExpandingFlames, i);
    }
  }
}

export function renderArcaneGrimoireGroundModule(ctx: CanvasRenderingContext2D) {
  if (activeEdenCanopies.length === 0) return;
  ctx.save();

  for (let i = 0; i < activeEdenCanopies.length; i++) {
    const ec = activeEdenCanopies[i];
    const t = ec.life / ec.maxLife;
    const grow = Math.min(1, ec.life / 0.18);
    const fade = t > 0.78 ? 1 - (t - 0.78) / 0.22 : 1;
    const r = ec.radius * grow;

    const canopySprite = getBioluminescentCanopySprite(
      ec.palette.primary,
      ec.palette.secondary,
      ec.palette.core,
      ec.palette.dark
    );
    const rippleSprite = getGroundDecalTextureSprite(
      'water_ripples',
      '#39FF14',
      ec.palette.secondary,
      '#FFFFFF',
      ec.palette.dark
    );

    ctx.save();
    ctx.translate(ec.x, ec.y);
    ctx.scale(1, 0.56);
    ctx.globalAlpha = fade;

    ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.rotate(ec.life * 0.25);
    ctx.drawImage(canopySprite, -r * 1.15, -r * 1.15, r * 2.3, r * 2.3);
    ctx.restore();

    ctx.globalCompositeOperation = 'lighter';
    ctx.save();
    ctx.rotate(-ec.life * 0.45);
    ctx.globalAlpha = fade * 0.75;
    ctx.drawImage(rippleSprite, -r * 1.05, -r * 1.05, r * 2.1, r * 2.1);
    ctx.restore();

    ctx.restore();
  }

  ctx.restore();
}

export function renderArcaneGrimoireFrontModule(ctx: CanvasRenderingContext2D) {
  if (
    activeTidalWaves.length === 0 &&
    activeSphericalOrbs.length === 0 &&
    activeArrows.length === 0 &&
    activeInsects.length === 0 &&
    activeHives.length === 0 &&
    activePyroFireballs.length === 0 &&
    activeExpandingFlames.length === 0
  )
    return;
  ctx.save();

  for (let i = 0; i < activeTidalWaves.length; i++) {
    const tw = activeTidalWaves[i];
    const t = tw.life / tw.maxLife;
    const grow = Math.min(1, tw.life / 0.12);
    const fade = t > 0.78 ? 1 - (t - 0.78) / 0.22 : 1;

    const waveSprite = getTidalWaveCrestSprite(
      tw.palette.primary,
      tw.palette.secondary,
      tw.palette.core,
      tw.palette.dark
    );
    const rippleSprite = getGroundDecalTextureSprite(
      'water_ripples',
      tw.palette.primary,
      tw.palette.secondary,
      tw.palette.core,
      tw.palette.dark
    );

    ctx.save();
    ctx.translate(tw.x, tw.y);
    ctx.globalAlpha = fade;

    // 1. Ground Hydro Wake & Foam Footprint
    ctx.save();
    ctx.rotate(tw.angle);
    ctx.scale(1, 0.58);
    ctx.globalCompositeOperation = 'lighter';
    const wakeDim = tw.width * 1.35 * grow;
    ctx.drawImage(rippleSprite, -wakeDim * 0.5, -wakeDim * 0.5, wakeDim, wakeDim);
    ctx.restore();

    // 2. 3 Overlapping 2.5D Curling Tidal Wave Wall Crests
    const flipX = Math.cos(tw.angle) < 0 ? -1 : 1;
    const w = tw.width * 1.35 * grow;
    const h = tw.height * 1.2 * grow;

    ctx.save();
    ctx.scale(flipX, 1);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(waveSprite, -w * 0.5, -h * 0.85, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.78;
    ctx.drawImage(waveSprite, -w * 0.42, -h * 0.88, w * 0.88, h * 0.95);
    ctx.restore();

    ctx.restore();
  }

  // Render Hornet Hive Totems (#60)
  for (let i = 0; i < activeHives.length; i++) {
    const hive = activeHives[i];
    const t = hive.life / hive.maxLife;
    const fade = t > 0.82 ? 1 - (t - 0.82) / 0.18 : 1;
    const pulse = 1 + Math.sin(hive.life * 11) * 0.08;
    const r = hive.radius * pulse;

    const hiveTex = getBioluminescentCanopySprite(
      '#FFD747',
      '#B45309',
      '#FEFCE8',
      '#271002'
    );

    ctx.save();
    ctx.translate(hive.x, hive.y);
    ctx.globalAlpha = fade;

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 8, r * 0.85, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tiered 2.5D Organic Hive Comb Stack
    for (let layer = 0; layer < 3; layer++) {
      const lr = r * (1 - layer * 0.22);
      const ly = -layer * 14 - 8;
      ctx.drawImage(hiveTex, -lr, ly - lr * 0.75, lr * 2, lr * 1.5);
    }
    ctx.restore();
  }

  // Render 2.5D Fletched Elemental Arrows (#57, #58, #61, #62, #64)
  for (let i = 0; i < activeArrows.length; i++) {
    const ar = activeArrows[i];
    if (ar.delay > 0) continue;

    const arrowTex = getElementalArrowTextureSprite(
      ar.palette.primary,
      ar.palette.secondary,
      ar.palette.core
    );

    const screenY = ar.y - ar.z;
    const w = 88 * ar.scale * (ar.mode === 'sniper_pierce' ? 1.45 : 1.0);
    const h = 34 * ar.scale * (ar.mode === 'sniper_pierce' ? 1.25 : 1.0);

    // Ground shadow for parabolic sky arrows
    if (ar.z > 4) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(ar.x, ar.y, 14 * ar.scale, 5 * ar.scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(ar.x, screenY);
    ctx.rotate(ar.angle);

    const ofcArrowImg =
      ar.mode === 'frost_ricochet' || ar.palette.id === 'freljord_ice'
        ? getExtraProjectileRuneAsset('flecha_gelo')
        : getAssetOfcForPalette('flechas', ar.palette);
    if (isImageReady(ofcArrowImg)) {
      const ofcSize = w * 1.12;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(ofcArrowImg, -ofcSize * 0.52, -ofcSize * 0.5, ofcSize, ofcSize);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.45;
      ctx.drawImage(ofcArrowImg, -ofcSize * 0.52, -ofcSize * 0.5, ofcSize, ofcSize);
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(arrowTex, -w * 0.55, -h * 0.5, w, h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.75;
      ctx.drawImage(arrowTex, -w * 0.55, -h * 0.5, w, h);
    }
    ctx.restore();
  }

  // Render Autonomous Chitinous Insect Swarms (#59, #60, #63)
  const wingPhase = Math.floor(performance.now() * 0.045) % 2;
  for (let i = 0; i < activeInsects.length; i++) {
    const bug = activeInsects[i];
    const t = bug.life / bug.maxLife;
    const fade = t > 0.82 ? 1 - (t - 0.82) / 0.18 : 1;

    const bugTex = getChitinScarabSwarmSprite(
      bug.palette.primary,
      bug.palette.secondary,
      bug.palette.core,
      bug.palette.dark,
      (wingPhase + (i % 2)) % 2
    );

    ctx.save();
    ctx.translate(bug.x, bug.y);
    ctx.rotate(bug.angle);
    ctx.globalAlpha = fade;
    const sz = bug.size;
    ctx.drawImage(bugTex, -sz * 0.5, -sz * 0.5, sz, sz);
    ctx.restore();
  }

  // Render 3D Ray-Casted Spherical Elemental Orbs & Domes (Almost transparent at center!)
  for (let i = 0; i < activeSphericalOrbs.length; i++) {
    const orb = activeSphericalOrbs[i];
    if (orb.delay > 0) continue;

    const t = orb.life / orb.maxLife;
    const fade = t > 0.78 ? 1 - (t - 0.78) / 0.22 : 1;
    const breathe = 1 + Math.sin(orb.life * 9.0) * 0.03;
    const dim = orb.radius * 2.0 * breathe;

    const sphereTex = getSphericalShieldTextureSprite(
      orb.style,
      orb.palette.primary,
      orb.palette.secondary,
      orb.palette.core,
      orb.palette.dark
    );

    ctx.save();
    ctx.translate(orb.x, orb.y);

    // Pass 1: 3D Spherical Rim & Refracting Shell (transparent center)
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * 0.68;
    ctx.drawImage(sphereTex, -dim * 0.5, -dim * 0.5, dim, dim);

    // Pass 2: Additive Fresnel Horizon & Specular Reflection Lobe
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.52;
    ctx.drawImage(sphereTex, -dim * 0.5, -dim * 0.5, dim, dim);

    ctx.restore();
  }

  // Render Pyroclastic Fireballs (#83 Bola de Fogo & #84 Big Fire Ball Colossal)
  for (let i = 0; i < activePyroFireballs.length; i++) {
    const fb = activePyroFireballs[i];
    const t = Math.min(1, fb.life / Math.max(0.05, fb.maxLife));
    const grow = Math.min(1, fb.life / 0.08);
    const pulse = 1 + Math.sin(fb.life * 24) * 0.07;
    const r = fb.radius * grow * pulse;
    const isColossal = fb.mode === 'colossal_sun';

    const flipbook = getVoronoiExplosionFlipbook(
      fb.palette.primary,
      fb.palette.secondary,
      fb.palette.core,
      fb.palette.dark
    );
    const frameIdx = Math.floor(fb.life * 22) % flipbook.length;
    const fireFrame = flipbook[frameIdx];

    const magmaSphere = getSphericalShieldTextureSprite(
      'magma_sphere',
      fb.palette.primary,
      fb.palette.secondary,
      fb.palette.core,
      fb.palette.dark
    );
    const solarCoronaSphere = getSphericalShieldTextureSprite(
      'aegis_hex_sphere',
      fb.palette.core,
      fb.palette.primary,
      '#FFFFFF',
      fb.palette.secondary
    );

    // 1. Ground Thermal Shadow & Scorched Glow
    ctx.save();
    ctx.translate(fb.x, fb.y);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, 4, r * 0.82, r * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'lighter';
    const groundGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.35);
    groundGlow.addColorStop(0, fb.palette.primary);
    groundGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = groundGlow;
    ctx.globalAlpha = isColossal ? 0.55 : 0.38;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.35, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Elevated 2.5D Fireball Body + Aerodynamic Voronoi Comet Tail
    const screenY = fb.y - fb.z;
    ctx.save();
    ctx.translate(fb.x, screenY);

    // Aerodynamic Cellular Fire Tail stretched backward along flight angle
    ctx.save();
    ctx.rotate(fb.angle);
    const tailLen = r * (isColossal ? 3.1 : 2.65);
    const tailHeight = r * (isColossal ? 2.15 : 1.75);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.92;
    ctx.drawImage(fireFrame, -tailLen * 0.82, -tailHeight * 0.5, tailLen, tailHeight);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.85;
    ctx.drawImage(
      fireFrame,
      -tailLen * 0.65,
      -tailHeight * 0.38,
      tailLen * 0.78,
      tailHeight * 0.76
    );
    ctx.restore();

    // 3D Ray-Casted Rotating Magma Sphere Core
    ctx.save();
    ctx.rotate(fb.life * (isColossal ? 3.2 : 5.4));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.95;
    ctx.drawImage(magmaSphere, -r * 1.05, -r * 1.05, r * 2.1, r * 2.1);

    ctx.globalCompositeOperation = 'lighter';
    ctx.rotate(-fb.life * 6.8);
    ctx.globalAlpha = isColossal ? 0.88 : 0.72;
    ctx.drawImage(solarCoronaSphere, -r * 0.92, -r * 0.92, r * 1.84, r * 1.84);
    ctx.restore();

    // Colossal Big Fire Ball: Orbiting Solar Prominence Rings & Inner White-Hot Sun Nucleus
    if (isColossal) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let ring = 0; ring < 2; ring++) {
        ctx.save();
        ctx.rotate(fb.life * (ring === 0 ? 4.2 : -3.6) + ring * 1.1);
        ctx.scale(1, 0.44);
        ctx.strokeStyle = ring === 0 ? fb.palette.core : fb.palette.primary;
        ctx.lineWidth = (5.5 - ring * 1.5) * fb.scale;
        ctx.globalAlpha = 0.82;
        ctx.beginPath();
        ctx.arc(0, 0, r * (1.28 + ring * 0.18), 0, Math.PI * 1.65);
        ctx.stroke();
        ctx.restore();
      }

      const sunCore = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 0.72);
      sunCore.addColorStop(0, '#FFFFFF');
      sunCore.addColorStop(0.45, fb.palette.core);
      sunCore.addColorStop(1, 'rgba(255, 120, 0, 0)');
      ctx.fillStyle = sunCore;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Standard Fireball bright incandescent core
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.85 * (1 - t * 0.2);
      ctx.beginPath();
      ctx.arc(r * 0.14 * Math.cos(fb.angle), r * 0.14 * Math.sin(fb.angle), r * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Render Expanding Flame Waves (#85 Labareda de Fogo que se expande à frente)
  for (let i = 0; i < activeExpandingFlames.length; i++) {
    const wave = activeExpandingFlames[i];
    const progress = Math.min(1, wave.life / Math.max(0.05, wave.maxLife));
    const fade = progress > 0.78 ? 1 - (progress - 0.78) / 0.22 : 1;

    const flipbook = getVoronoiExplosionFlipbook(
      wave.palette.primary,
      wave.palette.secondary,
      wave.palette.core,
      wave.palette.dark
    );
    const lavaDecal = getGroundDecalTextureSprite(
      'tectonic_crater',
      wave.palette.primary,
      wave.palette.secondary,
      wave.palette.core,
      wave.palette.dark
    );

    const perp = wave.angle + Math.PI / 2;

    ctx.save();
    ctx.globalAlpha = fade;

    // 1. Expanding Scorched Magma Ground Fan under the Advancing Flame Wave
    ctx.save();
    ctx.translate(wave.x, wave.y);
    ctx.rotate(wave.angle);
    ctx.scale(1, 0.58);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.75;
    const decalW = wave.currentWidth * 1.25;
    const decalL = Math.max(65 * wave.scale, wave.currentWidth * 0.85);
    ctx.drawImage(lavaDecal, -decalL * 0.65, -decalW * 0.5, decalL, decalW);
    ctx.restore();

    // 2. 5 Interlocking Billowing Voronoi Fire Crests Expanding in Width & Arc
    const crestNodes = 5;
    for (let c = 0; c < crestNodes; c++) {
      const norm = c / (crestNodes - 1) - 0.5; // -0.5 .. +0.5
      const latOffset = norm * wave.currentWidth;
      const arcLag = -Math.pow(norm * 2, 2) * (18 + 26 * progress) * wave.scale;
      const cx = wave.x + Math.cos(perp) * latOffset + Math.cos(wave.angle) * arcLag;
      const cy = wave.y + Math.sin(perp) * latOffset + Math.sin(wave.angle) * arcLag;

      const frameIdx = (Math.floor(wave.life * 20) + c * 2) % flipbook.length;
      const crestSprite = flipbook[frameIdx];
      const lobeScale = (1 - Math.abs(norm) * 0.28) * (0.65 + 0.55 * progress);
      const lobeW = 92 * wave.scale * lobeScale;
      const lobeH = 78 * wave.scale * lobeScale;

      ctx.save();
      ctx.translate(cx, cy - 10 * wave.scale);
      ctx.rotate(wave.angle + norm * wave.currentSpread * 0.75);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.92;
      ctx.drawImage(crestSprite, -lobeW * 0.5, -lobeH * 0.5, lobeW, lobeH);

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.82;
      ctx.drawImage(crestSprite, -lobeW * 0.42, -lobeH * 0.42, lobeW * 0.84, lobeH * 0.84);
      ctx.restore();
    }

    ctx.restore();
  }

  ctx.restore();
}

// ============================================================================
// #37. TSUNAMI ABISSAL (LEVIATÃ HIDROSTÁTICO)
// ============================================================================
export function spawnAbyssalTsunamiModule(
  engine: VfxEngine,
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
  soundEngine.playArcaneImpact(1.2);
  soundEngine.playBeamChannel();

  const speed = 580;
  const startX = casterX + Math.cos(aimAngle) * 38 * scale;
  const startY = casterY + Math.sin(aimAngle) * 38 * scale;

  activeTidalWaves.push({
    x: startX,
    y: startY,
    vx: Math.cos(aimAngle) * speed,
    vy: Math.sin(aimAngle) * speed,
    angle: aimAngle,
    width: 145 * scale,
    height: 135 * scale,
    life: 0,
    maxLife: 0.92,
    palette,
    casterId,
    hitSlimeIds: new Set(),
  });

  engine.shockRings.push({
    x: startX,
    y: startY,
    radius: 14,
    maxRadius: 155 * scale,
    thickness: 11 * scale,
    life: 0,
    maxLife: 0.36,
    palette,
    perspectiveY: 0.55,
    rotation: aimAngle,
  });

  engine.addTrauma(0.55, params.screenShakeIntensity);
}

// ============================================================================
// #38. TURBILHÃO HIDRO-VÓRTICE (MAELSTROM)
// ============================================================================
export function spawnHydroMaelstromModule(
  engine: VfxEngine,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams,
  casterId?: string
) {
  soundEngine.playBeamChannel();
  soundEngine.playArcaneImpact(1.1);

  engine.groundRunes.push({
    x: targetX,
    y: targetY,
    radius: 24,
    maxRadius: 195 * scale,
    rotation: 0,
    vRot: 4.5,
    life: 0,
    maxLife: 1.25,
    style: 'sanctuary_mandala',
    palette,
    perspectiveY: 0.55,
  });

  engine.tornadoes.push({
    x: targetX,
    y: targetY,
    vx: 0,
    vy: 0,
    radius: 76 * scale,
    height: 175 * scale,
    life: 0,
    maxLife: 1.15,
    palette,
    seed: Math.random() * 100,
    casterId,
    hitSlimeIds: new Set(),
  });

  for (let w = 0; w < 3; w++) {
    engine.slashArcs.push({
      x: targetX,
      y: targetY,
      radius: (135 - w * 26) * scale,
      thickness: 34 * scale,
      startAngle: w * 2.1,
      sweepAngle: Math.PI * 1.85,
      life: 0,
      maxLife: 0.48,
      delay: w * 0.08,
      palette,
      seed: w * 31,
      flip: false,
      style: 'wind_razor',
      eccentricity: 0.55,
      tiltAngle: 0,
    });
  }

  // Pull enemies into the whirlpool and soak them!
  engine.slimes.forEach((s) => {
    if (casterId && s.id === casterId) return;
    const dist = Math.hypot(s.x - targetX, s.y - targetY);
    if (dist <= 210 * scale + s.radius) {
      s.soakedTimer = 2.8;
    }
  });

  engine.applyAreaEffect(targetX, targetY, 195 * scale, 2180, 'MAELSTROM!', palette, {
    casterId,
    knockbackForce: -380,
    knockupVelocity: 290,
    originX: targetX,
    originY: targetY,
  });
  engine.addTrauma(0.58, params.screenShakeIntensity);
}

// ============================================================================
// #39. FLORESCER DO ÉDEN (ÁRVORE & PÉTALAS SOLARES)
// ============================================================================
export function spawnEdenOvergrowthModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams
) {
  soundEngine.playCrystalFreeze();

  activeEdenCanopies.push({
    x: casterX,
    y: casterY,
    radius: 190 * scale,
    life: 0,
    maxLife: 2.1,
    tickTimer: 0,
    palette,
    casterId: caster?.id,
  });

  // 4 Blooming Botanical Root Coils radiating outward
  for (let b = 0; b < 4; b++) {
    const baseAng = (b * Math.PI) / 2 + 0.4;
    const points: Array<{ x: number; y: number }> = [];
    for (let s = 0; s <= 12; s++) {
      const u = s / 12;
      const r = u * 165 * scale;
      const spiral = baseAng + Math.sin(u * Math.PI * 2) * 0.45;
      points.push({
        x: casterX + Math.cos(spiral) * r,
        y: casterY + Math.sin(spiral) * r * 0.58,
      });
    }
    engine.vineWhips.push({
      points,
      life: 0,
      maxLife: 1.15,
      palette,
      scale: scale * 0.9,
    });
  }

  // Heal allies and root nearby enemies
  engine.applySupportHealAndBuff(casterX, casterY, 210 * scale, palette, {
    casterId: caster?.id,
    healAmount: 3100,
    regenDuration: 3.0,
    label: '+FLORESCER DO ÉDEN!',
  });

  engine.slimes.forEach((s) => {
    if (caster && s.team === caster.team) {
      // Cleanse negative debuffs on allies!
      s.poisonTimer = 0;
      s.burnTimer = 0;
      s.corrodeTimer = 0;
      s.frozenTimer = 0;
    } else if (Math.hypot(s.x - casterX, s.y - casterY) <= 195 * scale + s.radius) {
      s.rootTimer = 1.8;
      engine.damageSlime(s, 1450, 'VINHAS DO ÉDEN!', palette, caster?.id, {
        stunDuration: 0.9,
      });
    }
  });
}

// ============================================================================
// #40. LANÇA-CHAMAS DRACÔNICO (SOPRO DE MAGMA EM CONE)
// ============================================================================
export function spawnDragonBreathConeModule(
  engine: VfxEngine,
  casterX: number,
  casterY: number,
  aimAngle: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams,
  casterId?: string
) {
  soundEngine.playBeamChannel();
  soundEngine.playArcaneImpact(1.15);

  const muzzleX = casterX + Math.cos(aimAngle) * 36 * scale;
  const muzzleY = casterY + Math.sin(aimAngle) * 36 * scale;

  // 3 Staggered Sweeping Fire Cone Arcs
  for (let w = 0; w < 3; w++) {
    const dist = (95 + w * 65) * scale;
    engine.slashArcs.push({
      x: muzzleX + Math.cos(aimAngle) * dist,
      y: muzzleY + Math.sin(aimAngle) * dist,
      radius: (110 + w * 42) * scale,
      thickness: (44 + w * 12) * scale,
      startAngle: aimAngle - 0.68,
      sweepAngle: 1.36,
      life: 0,
      maxLife: 0.34 + w * 0.06,
      delay: w * 0.05,
      palette,
      seed: w * 43,
      flip: w % 2 === 1,
      style: 'serrated_vorpal',
      eccentricity: 0.78,
      tiltAngle: aimAngle,
    });
  }

  // Dense Stream of Volumetric Voronoi-Eroded Fireball Lobes
  const count = Math.floor(44 * pMult);
  for (let i = 0; i < count; i++) {
    const spread = aimAngle + (Math.random() - 0.5) * 0.88;
    const spd = (240 + Math.random() * 480) * scale;
    engine.spawnParticle({
      x: muzzleX,
      y: muzzleY,
      z: 16,
      vx: Math.cos(spread) * spd,
      vy: Math.sin(spread) * spd,
      vz: 40 + Math.random() * 60,
      size: (18 + Math.random() * 24) * scale,
      color: i % 2 === 0 ? palette.primary : palette.secondary,
      coreColor: palette.core,
      alpha: 1,
      life: 0,
      maxLife: 0.42 + Math.random() * 0.28,
      drag: 0.93,
      gravity: -65,
      bounce: 0,
      floorY: 9999,
      type: i % 3 === 0 ? 'flame_tongue' : 'fireball_lobe',
      rotation: spread,
      vRot: (Math.random() - 0.5) * 5,
      stretch: 1.6,
      seed: i,
    });
  }

  engine.slimes.forEach((s) => {
    if (casterId && s.id === casterId) return;
    const dx = s.x - muzzleX;
    const dy = s.y - muzzleY;
    const dist = Math.hypot(dx, dy);
    const angDiff = Math.abs(
      Math.atan2(Math.sin(Math.atan2(dy, dx) - aimAngle), Math.cos(Math.atan2(dy, dx) - aimAngle))
    );
    if (dist <= 390 * scale && angDiff <= 0.68) {
      engine.damageSlime(s, 2380, 'SOPRO DRACÔNICO!', palette, casterId, {
        burnDuration: 2.8,
        knockbackX: Math.cos(aimAngle) * 320,
        knockbackY: Math.sin(aimAngle) * 320,
      });
    }
  });

  engine.addTrauma(0.62, params.screenShakeIntensity);
}

// ============================================================================
// #41. ERUPÇÃO VULCÂNICA (CALDEIRA & BOMBAS DE BASALTO)
// ============================================================================
export function spawnVolcanicCalderaModule(
  engine: VfxEngine,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams,
  casterId?: string
) {
  soundEngine.playArcaneImpact(1.4);

  // Central Volcanic Caldera Flame Zone + Tectonic Crater
  engine.flameZones.push({
    x: targetX,
    y: targetY,
    radius: 155 * scale,
    life: 0,
    maxLife: 2.0,
    tickTimer: 0,
    palette,
    seed: Math.random() * 100,
    casterId,
  });

  // 4 Rim Basalt Spikes around the caldera mouth
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + 0.35;
    const rx = targetX + Math.cos(a) * 85 * scale;
    const ry = targetY + Math.sin(a) * 48 * scale;
    engine.rockMonoliths.push({
      x: rx,
      y: ry,
      tiltAngle: Math.cos(a) * 0.38,
      height: 0,
      maxHeight: 78 * scale,
      width: 28 * scale,
      life: 0,
      maxLife: 1.65,
      palette,
      seed: k * 29,
      cracks: [{ x1: 0, y1: -8, x2: 5, y2: -52 * scale }],
    });
  }

  // Launch 5 Parabolic Molten Magma Bombs from the caldera center!
  for (let b = 0; b < 5; b++) {
    const ang = (b / 5) * Math.PI * 2 + 0.2;
    const dist = (85 + (b % 2) * 45) * scale;
    const bx = targetX + Math.cos(ang) * dist;
    const by = targetY + Math.sin(ang) * dist * 0.65;

    engine.projectiles.push({
      id: engine.nextProjectileId(),
      preset: 'thermobaric_cannon',
      casterId,
      x: targetX,
      y: targetY,
      startX: targetX,
      startY: targetY,
      controlX: (targetX + bx) * 0.5,
      controlY: Math.min(targetY, by) - 165 * scale,
      targetX: bx,
      targetY: by,
      vx: 0,
      vy: 0,
      speed: 520,
      angle: ang,
      progress: 0,
      useBezier: true,
      life: 0,
      maxLife: 0.38 + b * 0.05,
      scale: scale * 0.85,
      palette,
      history: [],
      isClusterSub: true,
    });
  }

  engine.applyAreaEffect(targetX, targetY, 175 * scale, 2540, 'ERUPÇÃO VULCÂNICA!', palette, {
    casterId,
    burnDuration: 2.6,
    flattenDuration: 1.15,
    knockupVelocity: 380,
  });
  engine.addTrauma(0.78, params.screenShakeIntensity);
}

// ============================================================================
// #42. ZERO ABSOLUTO (CÚPULA CRIOGÊNICA & PRISÃO DE GELO 2.5D)
// ============================================================================
export function spawnAbsoluteZeroDomeModule(
  engine: VfxEngine,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams,
  casterId?: string
) {
  soundEngine.playCrystalFreeze();
  soundEngine.playCrystalShatter();
  engine.screenDarkness = 0.48;

  // Permafrost Ground Rime Decal
  engine.groundRunes.push({
    x: targetX,
    y: targetY,
    radius: 25,
    maxRadius: 210 * scale,
    rotation: 0,
    vRot: 0.3,
    life: 0,
    maxLife: 1.55,
    style: 'freljord_star',
    palette,
    perspectiveY: 0.55,
  });

  // Expanding Hexagonal Cryosphere Dome Shockwaves
  for (let r = 0; r < 2; r++) {
    engine.shockRings.push({
      x: targetX,
      y: targetY,
      radius: 15,
      maxRadius: (205 - r * 35) * scale,
      thickness: 14 * scale,
      life: 0,
      maxLife: 0.46,
      delay: r * 0.08,
      palette,
      perspectiveY: 0.72,
      rotation: r * 0.5,
      isHexagonal: true,
    });
  }

  // Giant 3D Ray-Casted Frosted Ice Dome over the Absolute Zero zone!
  activeSphericalOrbs.push({
    x: targetX,
    y: targetY - 25 * scale,
    radius: 20,
    maxRadius: 175 * scale,
    life: 0,
    maxLife: 1.4,
    delay: 0,
    style: 'frost_sphere',
    palette,
  });

  // 10 Radial 2.5D Refractive Quartz/Ice Prisms around the perimeter
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const rx = targetX + Math.cos(a) * 115 * scale;
    const ry = targetY + Math.sin(a) * 65 * scale;
    engine.crystals.push({
      x: rx,
      y: ry,
      angle: -Math.PI / 2 + Math.cos(a) * 0.42,
      length: 0,
      maxLength: (95 + (k % 2) * 28) * scale,
      width: 30 * scale,
      life: 0,
      maxLife: 1.35,
      shatterAtEnd: true,
      palette,
      seed: k * 17,
      layer: Math.sin(a) > 0 ? 'front' : 'back',
    });
  }

  engine.applyAreaEffect(targetX, targetY, 205 * scale, 2390, 'ZERO ABSOLUTO!', palette, {
    casterId,
    freezeDuration: 2.1,
  });
  engine.addTrauma(0.65, params.screenShakeIntensity);
}

// ============================================================================
// #43. PRAGA NECRÓTICA (ENXAME QUIMTEC & DERRETIMENTO ÁCIDO)
// ============================================================================
export function spawnNecroticPlagueCloudModule(
  engine: VfxEngine,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams,
  casterId?: string
) {
  soundEngine.playCrystalShatter();
  soundEngine.playArcaneImpact(0.95);

  engine.acidPools.push({
    x: targetX,
    y: targetY,
    radius: 175 * scale,
    life: 0,
    maxLife: 1.95,
    palette,
    seed: Math.random() * 100,
    casterId,
  });

  // Billowing Toxic Voronoi Miasma Clouds
  const count = Math.floor(34 * pMult);
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count;
    const dist = Math.random() * 135 * scale;
    engine.spawnParticle({
      x: targetX + Math.cos(ang) * dist,
      y: targetY + Math.sin(ang) * dist * 0.58,
      z: 14,
      vx: Math.cos(ang + 1.2) * 65,
      vy: Math.sin(ang + 1.2) * 35 - 55,
      vz: 45,
      size: (18 + Math.random() * 20) * scale,
      color: i % 2 === 0 ? '#39FF14' : '#C84BFF',
      coreColor: '#F4FFE6',
      alpha: 1,
      life: 0,
      maxLife: 0.55 + Math.random() * 0.35,
      drag: 0.94,
      gravity: -40,
      bounce: 0,
      floorY: 9999,
      type: i % 3 === 0 ? 'acid_bubble' : 'fireball_lobe',
      rotation: ang,
      vRot: 3,
      stretch: 1.2,
      seed: i,
    });
  }

  // Apply Acid Corrosion (Melts enemy Slime & strips shields!)
  engine.slimes.forEach((s) => {
    if (casterId && s.id === casterId) return;
    if (Math.hypot(s.x - targetX, s.y - targetY) <= 180 * scale + s.radius) {
      s.corrodeTimer = 2.6;
      s.shieldHp = 0;
    }
  });

  engine.applyAreaEffect(targetX, targetY, 180 * scale, 2240, 'CORROSÃO NECRÓTICA!', palette, {
    casterId,
    poisonDuration: 3.0,
  });
  engine.addTrauma(0.52, params.screenShakeIntensity);
}

// ============================================================================
// #44. JULGAMENTO DE HÉLIO (PRISMA ORBITAL SOLAR)
// ============================================================================
export function spawnSolarOrbitalPrismModule(
  engine: VfxEngine,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams,
  casterId?: string
) {
  soundEngine.playBeamChannel();
  soundEngine.playArcaneImpact(1.35);
  engine.screenDarkness = 0.58;

  // 3 Converging Orbital Sky God-Rays striking the target
  const angles = [-Math.PI / 2 - 0.32, -Math.PI / 2, -Math.PI / 2 + 0.32];
  angles.forEach((ang, idx) => {
    const startX = targetX + Math.cos(ang) * 460 * scale;
    const startY = targetY + Math.sin(ang) * 460 * scale;
    engine.beams.push({
      startX,
      startY,
      endX: targetX,
      endY: targetY,
      angle: Math.atan2(targetY - startY, targetX - startX),
      width: (idx === 1 ? 68 : 42) * scale,
      life: 0,
      maxLife: 0.65,
      palette,
      seed: idx * 37,
    });
  });

  engine.impactFlashes.push({
    x: targetX,
    y: targetY,
    radius: 210 * scale,
    life: 0,
    maxLife: 0.12,
    palette,
  });

  engine.shockRings.push({
    x: targetX,
    y: targetY,
    radius: 14,
    maxRadius: 215 * scale,
    thickness: 14 * scale,
    life: 0,
    maxLife: 0.44,
    palette,
    perspectiveY: 0.58,
    rotation: 0,
    isHexagonal: true,
  });

  engine.applyAreaEffect(targetX, targetY, 200 * scale, 2890, 'PRISMA ORBITAL!', palette, {
    casterId,
    burnDuration: 2.2,
    stunDuration: 1.05,
    lunarMark: true,
  });
  engine.addTrauma(0.78, params.screenShakeIntensity);
}

// ============================================================================
// #45. FENDA DO ABISMO (TENTÁCULOS & ESPAGUETIFICAÇÃO GRAVITACIONAL)
// ============================================================================
export function spawnAbyssalTentacleRiftModule(
  engine: VfxEngine,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams,
  casterId?: string
) {
  soundEngine.playBeamChannel();
  soundEngine.playSlash(0.6);
  engine.screenDarkness = 0.62;

  engine.blackHoles.push({
    x: targetX,
    y: targetY,
    radius: 15,
    maxRadius: 165 * scale,
    rotation: 0,
    life: 0,
    maxLife: 1.35,
    palette,
    casterId,
  });

  // 6 Writhing Shadow Tentacles lashing outward from the event horizon
  for (let t = 0; t < 6; t++) {
    const baseAng = (t / 6) * Math.PI * 2;
    const points: Array<{ x: number; y: number }> = [];
    for (let s = 0; s <= 14; s++) {
      const u = s / 14;
      const r = u * 185 * scale;
      const whipAng = baseAng + Math.sin(u * Math.PI * 2.5 + t) * 0.52;
      points.push({
        x: targetX + Math.cos(whipAng) * r,
        y: targetY + Math.sin(whipAng) * r * 0.65,
      });
    }
    engine.vineWhips.push({
      points,
      life: 0,
      maxLife: 0.95,
      palette,
      scale: scale * 1.15,
    });
  }

  // Apply Relativistic Spaghettification Stretch to enemies pulled into the rift!
  engine.slimes.forEach((s) => {
    if (casterId && s.id === casterId) return;
    if (Math.hypot(s.x - targetX, s.y - targetY) <= 210 * scale + s.radius) {
      s.gravityStretchTimer = 1.65;
    }
  });

  engine.applyAreaEffect(targetX, targetY, 210 * scale, 2640, 'FENDA DO ABISMO!', palette, {
    casterId,
    knockbackForce: -440,
    originX: targetX,
    originY: targetY,
    stunDuration: 1.0,
  });
  engine.addTrauma(0.72, params.screenShakeIntensity);
}

// ============================================================================
// #46. BOBINA DE TESLA (CORRENTE DE ARCO VOLTAICO)
// ============================================================================
export function spawnTeslaChainOverloadModule(
  engine: VfxEngine,
  casterX: number,
  casterY: number,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams,
  casterId?: string
) {
  soundEngine.playBeamChannel();
  soundEngine.playArcaneImpact(1.1);

  // Chain lightning jumps from caster -> target -> all enemy Slimes!
  const nodes: Array<{ x: number; y: number }> = [
    { x: casterX, y: casterY - 18 },
    { x: targetX, y: targetY - 18 },
  ];

  engine.slimes.forEach((s) => {
    if (casterId && s.id === casterId) return;
    nodes.push({ x: s.x, y: s.y - 18 });
  });

  for (let i = 0; i < nodes.length - 1; i++) {
    const n1 = nodes[i];
    const n2 = nodes[i + 1];
    // Force vertical lightning branch renderer by spawning both a plasma whip and sky bolt
    engine.chainWhips.push({
      startX: n1.x,
      startY: n1.y,
      targetX: n2.x,
      targetY: n2.y,
      life: 0,
      maxLife: 0.45,
      palette,
      scale: scale * 0.95,
    });

    engine.dimensionCuts.push({
      x1: n2.x + (Math.random() - 0.5) * 40,
      y1: n2.y - 380 * scale,
      x2: n2.x,
      y2: n2.y + 18,
      width: 15 * scale,
      life: 0,
      maxLife: 0.28,
      delay: i * 0.06,
      palette,
      shatterOnEnd: false,
    });

    engine.shockRings.push({
      x: n2.x,
      y: n2.y + 18,
      radius: 10,
      maxRadius: 115 * scale,
      thickness: 9 * scale,
      life: 0,
      maxLife: 0.32,
      delay: i * 0.06,
      palette,
      perspectiveY: 0.58,
      rotation: 0,
      isHexagonal: true,
    });
  }

  engine.slimes.forEach((s) => {
    if (casterId && s.id === casterId) return;
    engine.damageSlime(s, 2190, 'ARCO VOLTAICO!', palette, casterId, {
      shockDuration: 1.55,
    });
  });

  engine.addTrauma(0.64, params.screenShakeIntensity);
}

// ============================================================================
// #47. TUMBA DE JAZER (SARCÓFAGO DE BASALTO ESMAGADOR)
// ============================================================================
export function spawnTectonicIronMaidenModule(
  engine: VfxEngine,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams,
  casterId?: string
) {
  soundEngine.playArcaneImpact(1.45);

  engine.groundRunes.push({
    x: targetX,
    y: targetY,
    radius: 20,
    maxRadius: 165 * scale,
    rotation: 0,
    vRot: 0,
    life: 0,
    maxLife: 1.4,
    style: 'infernal_target',
    palette,
    perspectiveY: 0.55,
  });

  // 6 Colossal Basalt Monoliths slamming inward like a stone jaws trap
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1;
    const row = (i % 3) - 1;
    const rx = targetX + side * 58 * scale;
    const ry = targetY + row * 34 * scale;

    engine.rockMonoliths.push({
      x: rx,
      y: ry,
      tiltAngle: -side * 0.46,
      height: 0,
      maxHeight: 112 * scale,
      width: 36 * scale,
      life: 0,
      maxLife: 1.85,
      palette,
      seed: i * 31 + 11,
      cracks: [
        { x1: 0, y1: -12, x2: side * 8, y2: -55 * scale },
        { x1: side * 8, y1: -55 * scale, x2: -side * 4, y2: -92 * scale },
      ],
    });
  }

  engine.applyAreaEffect(targetX, targetY, 165 * scale, 2840, 'SARCÓFAGO TECTÔNICO!', palette, {
    casterId,
    flattenDuration: 1.65,
    stunDuration: 1.35,
  });
  engine.addTrauma(0.84, params.screenShakeIntensity);
  engine.triggerHitstop(params.hitstopMs * 1.2);
}

// ============================================================================
// #48. ASCENSÃO SERÁFICA (4 ASAS DE LUZ, CURA & ESPADA DO JUÍZO)
// ============================================================================
export function spawnSeraphicAscensionModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams
) {
  soundEngine.playBeamChannel();
  soundEngine.playCrystalFreeze();

  // 4 Sweeping Seraphim Light Wings around the Caster
  const wingConfigs = [
    { start: -Math.PI * 0.88, sweep: -1.9, r: 165, yOff: -18 },
    { start: -Math.PI * 0.12, sweep: 1.9, r: 165, yOff: -18 },
    { start: -Math.PI * 0.78, sweep: -1.5, r: 125, yOff: 8 },
    { start: -Math.PI * 0.22, sweep: 1.5, r: 125, yOff: 8 },
  ];

  wingConfigs.forEach((wc, idx) => {
    engine.slashArcs.push({
      x: casterX,
      y: casterY + wc.yOff * scale,
      radius: wc.r * scale,
      thickness: 46 * scale,
      startAngle: wc.start,
      sweepAngle: wc.sweep,
      life: 0,
      maxLife: 0.48,
      delay: idx * 0.03,
      palette,
      seed: idx * 53,
      flip: idx % 2 === 1,
      style: 'wind_razor',
      eccentricity: 0.72,
      tiltAngle: 0,
    });
  });

  // Drop a Giant Celestial Sword of Judgment on the enemy target simultaneously!
  engine.giantSwords.push({
    x: targetX,
    y: targetY,
    currentHeight: 380 * scale,
    scale: scale * 0.95,
    life: 0,
    maxLife: 0.95,
    impacted: false,
    palette,
    casterId: caster?.id,
  });

  // Grant Team-Wide Heal, Shield & Berserk Ascension Buff!
  if (caster) {
    caster.shieldHp = caster.maxShieldHp;
    caster.shieldBuffTimer = 4.5;
    caster.berserkBuffTimer = 4.5;
  }

  engine.applySupportHealAndBuff(casterX, casterY, 260 * scale, palette, {
    casterId: caster?.id,
    healAmount: 3500,
    regenDuration: 3.0,
    label: '+ASCENSÃO SERÁFICA!',
  });
}

// ============================================================================
// #49. ESFERA CRIO-PERMAFROST 3D (CRYO SPHERE AEGIS)
// ============================================================================
export function spawnCryoSphereAegisModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams
) {
  soundEngine.playCrystalFreeze();

  engine.groundRunes.push({
    x: casterX,
    y: casterY,
    radius: 20,
    maxRadius: 155 * scale,
    rotation: 0,
    vRot: 0.35,
    life: 0,
    maxLife: 1.35,
    style: 'freljord_star',
    palette,
    perspectiveY: 0.55,
  });

  activeSphericalOrbs.push({
    x: casterX,
    y: casterY - 14 * scale,
    radius: 15,
    maxRadius: 96 * scale,
    life: 0,
    maxLife: 1.25,
    delay: 0,
    style: 'frost_sphere',
    palette,
    followSlimeId: caster?.id,
  });

  if (caster) {
    caster.shieldHp = 4200;
    caster.maxShieldHp = 4200;
    caster.shieldBuffTimer = 5.0;
    caster.mirrorCoatTimer = 5.0;
    caster.shieldStyle = 'frost_sphere';
    engine.spawnFloatingText(
      caster.x,
      caster.y - caster.radius - 20,
      '+4200 ESFERA DE GELO 3D!',
      'CRIO-PERMAFROST',
      '#38BDF8'
    );
  }

  // Chill & freeze nearby enemies that get too close to the expanding frost sphere
  engine.applyAreaEffect(casterX, casterY, 175 * scale, 1650, 'ESFERA DE GELO!', palette, {
    casterId: caster?.id,
    freezeDuration: 1.6,
    knockbackForce: 220,
    originX: casterX,
    originY: casterY,
  });
  engine.addTrauma(0.42, params.screenShakeIntensity);
}

// ============================================================================
// #50. ESFERA VULCÂNICA DE OBSIDIANA 3D (MAGMA CARAPACE SPHERE)
// ============================================================================
export function spawnMagmaCarapaceSphereModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams
) {
  soundEngine.playArcaneImpact(1.2);

  engine.groundRunes.push({
    x: casterX,
    y: casterY,
    radius: 18,
    maxRadius: 150 * scale,
    rotation: 0,
    vRot: 0,
    life: 0,
    maxLife: 1.25,
    style: 'infernal_target',
    palette,
    perspectiveY: 0.55,
  });

  activeSphericalOrbs.push({
    x: casterX,
    y: casterY - 14 * scale,
    radius: 15,
    maxRadius: 96 * scale,
    life: 0,
    maxLife: 1.25,
    delay: 0,
    style: 'magma_sphere',
    palette,
    followSlimeId: caster?.id,
  });

  if (caster) {
    caster.shieldHp = 4000;
    caster.maxShieldHp = 4000;
    caster.shieldBuffTimer = 5.0;
    caster.shieldStyle = 'magma_sphere';
    engine.spawnFloatingText(
      caster.x,
      caster.y - caster.radius - 20,
      '+4000 ESFERA DE MAGMA!',
      'CARAPAÇA DE OBSIDIANA',
      '#FF5500'
    );
  }

  engine.applyAreaEffect(casterX, casterY, 175 * scale, 1890, 'ESFERA VULCÂNICA!', palette, {
    casterId: caster?.id,
    burnDuration: 2.4,
    knockbackForce: 260,
    originX: casterX,
    originY: casterY,
  });
  engine.addTrauma(0.48, params.screenShakeIntensity);
}

// ============================================================================
// #51. ESFERA BOLHA ABISSAL REFRATIVA 3D (HYDRO BUBBLE SANCTUARY)
// ============================================================================
export function spawnHydroBubbleSanctuaryModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams
) {
  soundEngine.playBeamChannel();

  engine.groundRunes.push({
    x: casterX,
    y: casterY,
    radius: 20,
    maxRadius: 165 * scale,
    rotation: 0,
    vRot: 0.4,
    life: 0,
    maxLife: 1.3,
    style: 'sanctuary_mandala',
    palette,
    perspectiveY: 0.56,
  });

  activeSphericalOrbs.push({
    x: casterX,
    y: casterY - 14 * scale,
    radius: 15,
    maxRadius: 98 * scale,
    life: 0,
    maxLife: 1.3,
    delay: 0,
    style: 'hydro_bubble_sphere',
    palette,
    followSlimeId: caster?.id,
  });

  if (caster) {
    caster.shieldHp = 3600;
    caster.maxShieldHp = 3600;
    caster.shieldBuffTimer = 5.0;
    caster.shieldStyle = 'hydro_bubble_sphere';
  }

  engine.applySupportHealAndBuff(casterX, casterY, 220 * scale, palette, {
    casterId: caster?.id,
    healAmount: 2800,
    regenDuration: 2.5,
    label: '+BOLHA ABISSAL 3D!',
  });

  engine.applyAreaEffect(casterX, casterY, 170 * scale, 1420, 'IMPULSO HIDRO!', palette, {
    casterId: caster?.id,
    soakedDuration: 2.5,
    knockbackForce: 240,
    originX: casterX,
    originY: casterY,
  });
}

// ============================================================================
// #52. ESFERA DE ESPINHOS SILVESTRES 3D (BRIAR THORN DOME)
// ============================================================================
export function spawnBriarThornDomeModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams
) {
  soundEngine.playSlash(0.85);

  activeSphericalOrbs.push({
    x: casterX,
    y: casterY - 14 * scale,
    radius: 15,
    maxRadius: 96 * scale,
    life: 0,
    maxLife: 1.3,
    delay: 0,
    style: 'briar_nature_sphere',
    palette,
    followSlimeId: caster?.id,
  });

  if (caster) {
    caster.shieldHp = 3800;
    caster.maxShieldHp = 3800;
    caster.shieldBuffTimer = 5.0;
    caster.regenBuffTimer = 4.0;
    caster.shieldStyle = 'briar_nature_sphere';
    engine.spawnFloatingText(
      caster.x,
      caster.y - caster.radius - 20,
      '+3800 ESFERA SILVESTRE!',
      'CIPÓS & REGEN',
      '#39FF14'
    );
  }

  engine.applyAreaEffect(casterX, casterY, 180 * scale, 1680, 'ESPINHOS 3D!', palette, {
    casterId: caster?.id,
    rootDuration: 2.0,
  });
}

// ============================================================================
// #53. ESFERA HORIZONTE DE EVENTOS 3D (VOID EVENT BARRIER)
// ============================================================================
export function spawnVoidEventBarrierModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams
) {
  soundEngine.playBeamChannel();
  engine.screenDarkness = 0.45;

  activeSphericalOrbs.push({
    x: casterX,
    y: casterY - 14 * scale,
    radius: 15,
    maxRadius: 102 * scale,
    life: 0,
    maxLife: 1.35,
    delay: 0,
    style: 'void_gravity_sphere',
    palette,
    followSlimeId: caster?.id,
  });

  if (caster) {
    caster.shieldHp = 4000;
    caster.maxShieldHp = 4000;
    caster.shieldBuffTimer = 5.0;
    caster.shieldStyle = 'void_gravity_sphere';
    engine.spawnFloatingText(
      caster.x,
      caster.y - caster.radius - 20,
      '+4000 ESFERA DO VAZIO!',
      'MATÉRIA ESCURA 3D',
      '#C84BFF'
    );
  }

  engine.applyAreaEffect(casterX, casterY, 195 * scale, 1950, 'GRAVIDADE DO VAZIO!', palette, {
    casterId: caster?.id,
    gravityStretchDuration: 1.5,
    knockbackForce: -260,
    originX: casterX,
    originY: casterY,
  });
  engine.addTrauma(0.52, params.screenShakeIntensity);
}

// ============================================================================
// #54. ESFERA EÓLICA IONIZADA 3D (TEMPEST CYCLONE SHIELD)
// ============================================================================
export function spawnTempestCycloneShieldModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams
) {
  soundEngine.playSlash(1.3);

  activeSphericalOrbs.push({
    x: casterX,
    y: casterY - 14 * scale,
    radius: 15,
    maxRadius: 96 * scale,
    life: 0,
    maxLife: 1.25,
    delay: 0,
    style: 'aegis_hex_sphere',
    palette,
    followSlimeId: caster?.id,
  });

  if (caster) {
    caster.shieldHp = 3500;
    caster.maxShieldHp = 3500;
    caster.shieldBuffTimer = 4.8;
    caster.berserkBuffTimer = 4.2;
    caster.shieldStyle = 'aegis_hex_sphere';
    engine.spawnFloatingText(
      caster.x,
      caster.y - caster.radius - 20,
      '+3500 ESFERA EÓLICA!',
      'IONIZAÇÃO & TURBO',
      '#00D9FF'
    );
  }

  engine.applyAreaEffect(casterX, casterY, 180 * scale, 1740, 'VENTO IONIZADO!', palette, {
    casterId: caster?.id,
    shockDuration: 1.35,
    knockbackForce: 290,
    originX: casterX,
    originY: casterY,
  });
}

// ============================================================================
// #55. DILÚVIO DE BOLHAS QUIMTEC 3D (VENOM MIASMA MONSOON)
// ============================================================================
export function spawnVenomMiasmaMonsoonModule(
  engine: VfxEngine,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams,
  casterId?: string
) {
  soundEngine.playArcaneImpact(1.15);

  engine.acidPools.push({
    x: targetX,
    y: targetY,
    radius: 165 * scale,
    life: 0,
    maxLife: 1.85,
    palette,
    seed: Math.random() * 100,
    casterId,
  });

  // 3 Staggered 3D Caustic Acid Bubbles expanding and bursting at target!
  for (let b = 0; b < 3; b++) {
    const ox = (b - 1) * 42 * scale;
    const oy = ((b % 2) - 0.5) * 28 * scale;
    activeSphericalOrbs.push({
      x: targetX + ox,
      y: targetY + oy - 16 * scale,
      radius: 10,
      maxRadius: (86 - b * 12) * scale,
      life: 0,
      maxLife: 0.85,
      delay: b * 0.1,
      style: 'hydro_bubble_sphere',
      palette,
    });
  }

  engine.applyAreaEffect(targetX, targetY, 175 * scale, 2420, 'BOLHAS QUIMTEC 3D!', palette, {
    casterId,
    corrodeDuration: 2.6,
    soakedDuration: 2.2,
    poisonDuration: 2.8,
  });
  engine.addTrauma(0.58, params.screenShakeIntensity);
}

// ============================================================================
// #56. BASTIÃO ESFÉRICO DE HÉLIO 3D (ASTRAL SUPERNOVA BASTION)
// ============================================================================
export function spawnAstralSupernovaBastionModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams
) {
  soundEngine.playBeamChannel();
  soundEngine.playArcaneImpact(1.25);

  // Golden 3D Solar Bastion Sphere around Caster
  activeSphericalOrbs.push({
    x: casterX,
    y: casterY - 14 * scale,
    radius: 16,
    maxRadius: 102 * scale,
    life: 0,
    maxLife: 1.35,
    delay: 0,
    style: 'aegis_hex_sphere',
    palette,
    followSlimeId: caster?.id,
  });

  // Secondary Expanding Solar Sphere at Target
  activeSphericalOrbs.push({
    x: targetX,
    y: targetY - 18 * scale,
    radius: 16,
    maxRadius: 125 * scale,
    life: 0,
    maxLife: 0.78,
    delay: 0.06,
    style: 'magma_sphere',
    palette,
  });

  if (caster) {
    caster.shieldHp = 4000;
    caster.maxShieldHp = 4000;
    caster.shieldBuffTimer = 5.0;
    caster.shieldStyle = 'aegis_hex_sphere';
  }

  engine.applySupportHealAndBuff(casterX, casterY, 240 * scale, palette, {
    casterId: caster?.id,
    healAmount: 2600,
    regenDuration: 2.5,
    label: '+BASTIÃO SOLAR 3D!',
  });

  engine.applyAreaEffect(targetX, targetY, 180 * scale, 2380, 'SUPERNOVA DE HÉLIO!', palette, {
    casterId: caster?.id,
    burnDuration: 2.2,
    stunDuration: 1.0,
  });
  engine.addTrauma(0.65, params.screenShakeIntensity);
}

// ============================================================================
// #57. SARAIVADA DE FLECHAS EÓLICAS (RANGER ARROW VOLLEY - 7-ARROW CONE)
// ============================================================================
export function spawnRangerArrowVolleyModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  aimAngle: number,
  palette: ElementalPalette,
  scale: number,
  params: ShaderParams
) {
  soundEngine.playSlash(1.45);

  // Sonic bow-release arc at the archer
  engine.slashArcs.push({
    x: casterX,
    y: casterY,
    radius: 52 * scale,
    thickness: 16 * scale,
    startAngle: aimAngle - 0.85,
    sweepAngle: 1.7,
    life: 0,
    maxLife: 0.22,
    delay: 0,
    palette,
    seed: 57,
    flip: false,
    style: 'wind_razor',
    eccentricity: 0.78,
    tiltAngle: aimAngle,
  });

  const arrowCount = 7;
  const spreadCone = 0.56;
  const speed = 920;

  for (let i = 0; i < arrowCount; i++) {
    const u = (i / (arrowCount - 1)) - 0.5;
    const ang = aimAngle + u * spreadCone;
    activeArrows.push({
      x: casterX + Math.cos(ang) * 26 * scale,
      y: casterY + Math.sin(ang) * 26 * scale,
      z: 14,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      vz: 0,
      gravityZ: 0,
      angle: ang,
      scale,
      life: 0,
      maxLife: 0.95,
      delay: Math.abs(u) * 0.06,
      palette,
      casterId: caster?.id,
      mode: 'volley',
      ricochetsLeft: 0,
      hitSlimeIds: new Set(),
    });
  }

  engine.addTrauma(0.24, params.screenShakeIntensity);
}

// ============================================================================
// #58. CHUVA DE FLECHAS ZENITAL (SKY ARROW RAIN - 18 PARABOLIC ARROWS)
// ============================================================================
export function spawnSkyArrowRainModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  params: ShaderParams
) {
  soundEngine.playSlash(1.2);

  engine.groundRunes.push({
    x: targetX,
    y: targetY,
    radius: 20,
    maxRadius: 155 * scale,
    rotation: 0,
    vRot: 0.5,
    life: 0,
    maxLife: 1.25,
    style: 'infernal_target',
    palette,
    perspectiveY: 0.55,
  });

  const count = 18;
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(Math.random()) * 135 * scale;
    const th = Math.random() * Math.PI * 2;
    const landX = targetX + Math.cos(th) * r;
    const landY = targetY + Math.sin(th) * r * 0.62;
    const flightDuration = 0.52;
    const gravityZ = 1850;
    const startZ = 22;
    const vz = (0 - startZ + 0.5 * gravityZ * flightDuration * flightDuration) / flightDuration;

    activeArrows.push({
      x: casterX,
      y: casterY,
      z: startZ,
      vx: (landX - casterX) / flightDuration,
      vy: (landY - casterY) / flightDuration,
      vz,
      gravityZ,
      angle: -Math.PI / 2,
      scale: scale * 0.92,
      life: 0,
      maxLife: flightDuration + 0.25,
      delay: i * 0.032,
      palette,
      casterId: caster?.id,
      mode: 'sky_rain',
      ricochetsLeft: 0,
      hitSlimeIds: new Set(),
    });
  }

  engine.addTrauma(0.38, params.screenShakeIntensity);
}

// ============================================================================
// #59. ENXAME DEVORADOR DE GAFANHOTOS (LOCUST PLAGUE SWARM - 26 BOIDS INSECTS)
// ============================================================================
export function spawnLocustPlagueSwarmModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  params: ShaderParams
) {
  soundEngine.playArcaneImpact(1.1);
  const team = caster ? caster.team : 0;

  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    const dist = 16 + (i % 3) * 14;
    const toTarget = Math.atan2(targetY - casterY, targetX - casterX) + (Math.random() - 0.5) * 0.9;
    const spd = 280 + Math.random() * 160;

    activeInsects.push({
      x: casterX + Math.cos(ang) * dist,
      y: casterY - 16 + Math.sin(ang) * dist,
      z: 18,
      vx: Math.cos(toTarget) * spd,
      vy: Math.sin(toTarget) * spd,
      angle: toTarget,
      orbitOffset: (i / 24) * Math.PI * 2,
      size: (26 + (i % 3) * 5) * scale,
      life: 0,
      maxLife: 2.6 + Math.random() * 0.5,
      biteTimer: 0.12 + (i % 5) * 0.06,
      palette,
      casterId: caster?.id,
      casterTeam: team,
      isScarab: false,
    });
  }

  if (caster) {
    engine.spawnFloatingText(
      caster.x,
      caster.y - caster.radius - 22,
      'ENXAME DE GAFANHOTOS!',
      '24 INSETOS CONVOCADOS',
      '#39FF14'
    );
  }
  engine.addTrauma(0.32, params.screenShakeIntensity);
}

// ============================================================================
// #60. COLMEIA REAL DE VESPAS (HORNET HIVE SUMMON TOTEM)
// ============================================================================
export function spawnHornetHiveSummonModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  params: ShaderParams
) {
  soundEngine.playArcaneImpact(1.15);
  const team = caster ? caster.team : 0;
  const hiveX = casterX + (targetX - casterX) * 0.32;
  const hiveY = casterY + (targetY - casterY) * 0.32;

  activeHives.push({
    x: hiveX,
    y: hiveY,
    radius: 44 * scale,
    life: 0,
    maxLife: 3.2,
    spawnWaveTimer: 0.05,
    palette,
    casterId: caster?.id,
    casterTeam: team,
  });

  engine.shockRings.push({
    x: hiveX,
    y: hiveY,
    radius: 10,
    maxRadius: 110 * scale,
    thickness: 10 * scale,
    life: 0,
    maxLife: 0.35,
    palette,
    perspectiveY: 0.56,
    rotation: 0,
    isHexagonal: true,
  });

  if (caster) {
    engine.spawnFloatingText(
      hiveX,
      hiveY - 48,
      '+COLMEIA REAL!',
      'INVOCANDO VESPAS',
      '#FFD747'
    );
  }
  engine.addTrauma(0.35, params.screenShakeIntensity);
}

// ============================================================================
// #61. DISPARO FRANCO-ATIRADOR MACH-5 (PIERCING SNIPER SHOT)
// ============================================================================
export function spawnPiercingSniperShotModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  aimAngle: number,
  palette: ElementalPalette,
  scale: number,
  params: ShaderParams
) {
  soundEngine.playBeamChannel();
  soundEngine.playSlash(1.6);

  // Laser sight & sonic boom corridor
  const endX = casterX + Math.cos(aimAngle) * 950;
  const endY = casterY + Math.sin(aimAngle) * 950;
  engine.beams.push({
    startX: casterX,
    startY: casterY - 12,
    endX,
    endY: endY - 12,
    angle: aimAngle,
    width: 18 * scale,
    life: 0,
    maxLife: 0.26,
    palette,
    seed: 61,
  });

  for (let r = 0; r < 3; r++) {
    const dist = (60 + r * 125) * scale;
    engine.shockRings.push({
      x: casterX + Math.cos(aimAngle) * dist,
      y: casterY + Math.sin(aimAngle) * dist - 10,
      radius: 8,
      maxRadius: (75 - r * 12) * scale,
      thickness: 9 * scale,
      life: 0,
      maxLife: 0.28,
      delay: r * 0.04,
      palette,
      perspectiveY: 0.72,
      rotation: aimAngle,
    });
  }

  activeArrows.push({
    x: casterX + Math.cos(aimAngle) * 28 * scale,
    y: casterY + Math.sin(aimAngle) * 28 * scale,
    z: 14,
    vx: Math.cos(aimAngle) * 1480,
    vy: Math.sin(aimAngle) * 1480,
    vz: 0,
    gravityZ: 0,
    angle: aimAngle,
    scale: scale * 1.15,
    life: 0,
    maxLife: 0.85,
    delay: 0,
    palette,
    casterId: caster?.id,
    mode: 'sniper_pierce',
    ricochetsLeft: 0,
    hitSlimeIds: new Set(),
  });

  // Recoil kickback for the sniper archer (helps kite even further back!)
  if (caster) {
    caster.vx -= Math.cos(aimAngle) * 210;
    caster.vy -= Math.sin(aimAngle) * 210;
  }

  engine.addTrauma(0.55, params.screenShakeIntensity);
}

// ============================================================================
// #62. FLECHA CAÇADORA DE ESPINHOS (BRAMBLE SNARE ARROW - ROOT & KITE)
// ============================================================================
export function spawnBrambleSnareArrowModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  aimAngle: number,
  palette: ElementalPalette,
  scale: number,
  params: ShaderParams
) {
  soundEngine.playSlash(1.25);

  for (let i = -1; i <= 1; i++) {
    const ang = aimAngle + i * 0.14;
    activeArrows.push({
      x: casterX + Math.cos(ang) * 26 * scale,
      y: casterY + Math.sin(ang) * 26 * scale,
      z: 14,
      vx: Math.cos(ang) * 960,
      vy: Math.sin(ang) * 960,
      vz: 0,
      gravityZ: 0,
      angle: ang,
      scale,
      life: 0,
      maxLife: 0.95,
      delay: Math.abs(i) * 0.04,
      palette,
      casterId: caster?.id,
      mode: 'bramble_snare',
      ricochetsLeft: 0,
      hitSlimeIds: new Set(),
    });
  }

  engine.addTrauma(0.28, params.screenShakeIntensity);
}

// ============================================================================
// #63. FALANGE DE ESCARAVELHOS REAIS (SCARAB BEETLE BARRAGE + SHIELD)
// ============================================================================
export function spawnScarabBeetleBarrageModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  palette: ElementalPalette,
  scale: number,
  params: ShaderParams
) {
  soundEngine.playCrystalFreeze();
  const team = caster ? caster.team : 0;

  if (caster) {
    caster.shieldHp = 3200;
    caster.maxShieldHp = 3200;
    caster.shieldBuffTimer = 4.2;
    caster.shieldStyle = 'aegis_hex_sphere';
  }

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    activeInsects.push({
      x: casterX + Math.cos(ang) * 44 * scale,
      y: casterY - 14 + Math.sin(ang) * 32 * scale,
      z: 16,
      vx: Math.cos(ang) * 280,
      vy: Math.sin(ang) * 280,
      angle: ang,
      orbitOffset: ang,
      size: 34 * scale,
      life: 0,
      maxLife: 2.2,
      biteTimer: 0,
      palette,
      casterId: caster?.id,
      casterTeam: team,
      isScarab: true,
    });
  }

  engine.addTrauma(0.36, params.screenShakeIntensity);
}

// ============================================================================
// #64. FLECHA RICOCHETE GLACIAL (FROSTBITE RICOCHET ARROW)
// ============================================================================
export function spawnFrostbiteRicochetArrowModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  aimAngle: number,
  palette: ElementalPalette,
  scale: number,
  params: ShaderParams
) {
  soundEngine.playCrystalFreeze();

  activeArrows.push({
    x: casterX + Math.cos(aimAngle) * 28 * scale,
    y: casterY + Math.sin(aimAngle) * 28 * scale,
    z: 14,
    vx: Math.cos(aimAngle) * 980,
    vy: Math.sin(aimAngle) * 980,
    vz: 0,
    gravityZ: 0,
    angle: aimAngle,
    scale: scale * 1.1,
    life: 0,
    maxLife: 1.45,
    delay: 0,
    palette,
    casterId: caster?.id,
    mode: 'frost_ricochet',
    ricochetsLeft: 4,
    hitSlimeIds: new Set(),
  });

  engine.addTrauma(0.3, params.screenShakeIntensity);
}

// ============================================================================
// #83, #84 & #85: ARSENAL PIROCLÁSTICO ESPECIAL
// - #83 Bola de Fogo (Orbe Ígneo 3D & Rastro Celular Voronoi)
// - #84 Big Fire Ball (Sol Piroclástico Colossal 3D c/ Sub-munições & Cratera)
// - #85 Labareda de Fogo (Vagalhão Ígneo que se expande continuamente à frente)
// ============================================================================

function detonatePyroclasticFireball(
  engine: VfxEngine,
  fb: PyroclasticFireballEntity,
  params: ShaderParams
) {
  const isColossal = fb.mode === 'colossal_sun';
  soundEngine.playArcaneImpact(isColossal ? 1.55 : 1.18);
  if (isColossal) {
    soundEngine.playBeamChannel();
    engine.screenDarkness = 0.58;
  }

  const blastRadius = isColossal ? 215 * fb.scale : 125 * fb.scale;

  engine.impactFlashes.push({
    x: fb.x,
    y: fb.y,
    radius: blastRadius * 1.15,
    life: 0,
    maxLife: isColossal ? 0.15 : 0.1,
    palette: fb.palette,
  });

  // Ground scorch crater
  engine.groundRunes.push({
    x: fb.x,
    y: fb.y,
    radius: 18,
    maxRadius: blastRadius * 0.95,
    rotation: fb.angle,
    vRot: isColossal ? 0.45 : 0,
    life: 0,
    maxLife: isColossal ? 1.15 : 0.68,
    style: 'infernal_target',
    palette: fb.palette,
    perspectiveY: 0.56,
  });

  // Concentric thermal shock rings
  const ringCount = isColossal ? 3 : 2;
  for (let r = 0; r < ringCount; r++) {
    engine.shockRings.push({
      x: fb.x,
      y: fb.y,
      radius: 14,
      maxRadius: blastRadius * (0.85 + r * 0.25),
      thickness: (isColossal ? 16 - r * 3 : 10 - r * 2) * fb.scale,
      life: 0,
      maxLife: (isColossal ? 0.48 : 0.34) + r * 0.06,
      delay: r * 0.04,
      palette: fb.palette,
      perspectiveY: 0.58,
      rotation: r * 0.5,
      isHexagonal: r === 0,
    });
  }

  // Erupting Voronoi cellular fire cloud + bouncing magma embers
  const lobeCount = isColossal ? 34 : 18;
  for (let i = 0; i < lobeCount; i++) {
    const ang = (i / lobeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const spd = (isColossal ? 90 + Math.random() * 280 : 65 + Math.random() * 185) * fb.scale;
    engine.spawnParticle({
      x: fb.x + (Math.random() - 0.5) * 24 * fb.scale,
      y: fb.y + (Math.random() - 0.5) * 18 * fb.scale,
      z: 14 + Math.random() * 24,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd * 0.65 - 40,
      vz: 85 + Math.random() * 140,
      size: (isColossal ? 32 + Math.random() * 28 : 20 + Math.random() * 18) * fb.scale,
      color: i % 2 === 0 ? fb.palette.primary : fb.palette.secondary,
      coreColor: fb.palette.core,
      alpha: 1,
      life: 0,
      maxLife: (isColossal ? 0.48 : 0.36) + Math.random() * 0.2,
      drag: 0.9,
      gravity: -35,
      bounce: 0,
      floorY: 9999,
      type: i % 3 === 0 ? 'slash_ember' : 'fireball_lobe',
      rotation: ang,
      vRot: (Math.random() - 0.5) * 7,
      stretch: 1.45,
      seed: i,
    });
  }

  if (isColossal) {
    // Big Fire Ball spawns a temporary expanding 3D Magma Dome shell + volcanic caldera flame zone!
    activeSphericalOrbs.push({
      x: fb.x,
      y: fb.y - 16 * fb.scale,
      radius: 22 * fb.scale,
      maxRadius: 148 * fb.scale,
      life: 0,
      maxLife: 0.58,
      delay: 0,
      style: 'magma_sphere',
      palette: fb.palette,
    });

    engine.flameZones.push({
      x: fb.x,
      y: fb.y,
      radius: 145 * fb.scale,
      life: 0,
      maxLife: 1.45,
      tickTimer: 0,
      palette: fb.palette,
      seed: Math.random() * 100,
      casterId: fb.casterId,
    });

    engine.applyAreaEffect(fb.x, fb.y, blastRadius, 3280, 'BIG FIRE BALL!', fb.palette, {
      casterId: fb.casterId,
      burnDuration: 3.4,
      knockupVelocity: 430,
      knockbackForce: 390,
      originX: fb.x,
      originY: fb.y,
      stunDuration: 1.15,
      flattenDuration: 0.95,
    });
    engine.addTrauma(0.86, params.screenShakeIntensity);
  } else {
    engine.applyAreaEffect(fb.x, fb.y, blastRadius, 1890, 'BOLA DE FOGO!', fb.palette, {
      casterId: fb.casterId,
      burnDuration: 2.2,
      knockupVelocity: 240,
      knockbackForce: 250,
      originX: fb.x,
      originY: fb.y,
    });
    engine.addTrauma(0.48, params.screenShakeIntensity);
  }
}

export function spawnFireballOrbModule(
  engine: VfxEngine,
  casterX: number,
  casterY: number,
  targetX: number,
  targetY: number,
  aimAngle: number,
  palette: ElementalPalette,
  scale: number,
  params: ShaderParams,
  casterId?: string
) {
  soundEngine.playArcaneImpact(1.1);
  soundEngine.playSlash(1.18);

  const dist = Math.max(60, Math.hypot(targetX - casterX, targetY - casterY));
  const speed = 780;
  const startX = casterX + Math.cos(aimAngle) * 26 * scale;
  const startY = casterY + Math.sin(aimAngle) * 26 * scale;

  // Muzzle ignition ring at caster hands
  engine.shockRings.push({
    x: startX,
    y: startY - 12 * scale,
    radius: 6,
    maxRadius: 56 * scale,
    thickness: 8 * scale,
    life: 0,
    maxLife: 0.22,
    palette,
    perspectiveY: 0.75,
    rotation: aimAngle,
  });

  activePyroFireballs.push({
    x: startX,
    y: startY,
    z: 18 * scale,
    startX,
    startY,
    targetX,
    targetY,
    vx: Math.cos(aimAngle) * speed,
    vy: Math.sin(aimAngle) * speed,
    angle: aimAngle,
    radius: 34 * scale,
    scale,
    life: 0,
    maxLife: Math.min(1.15, dist / speed),
    scorchTick: 0,
    mode: 'standard_fireball',
    palette,
    casterId,
    hitSlimeIds: new Set(),
  });

  engine.addTrauma(0.26, params.screenShakeIntensity);
}

export function spawnBigFireBallColossusModule(
  engine: VfxEngine,
  casterX: number,
  casterY: number,
  targetX: number,
  targetY: number,
  aimAngle: number,
  palette: ElementalPalette,
  scale: number,
  params: ShaderParams,
  casterId?: string
) {
  soundEngine.playArcaneImpact(1.35);
  soundEngine.playBeamChannel();
  engine.screenDarkness = 0.42;

  const dist = Math.max(85, Math.hypot(targetX - casterX, targetY - casterY));
  const speed = 460;
  const startX = casterX + Math.cos(aimAngle) * 34 * scale;
  const startY = casterY + Math.sin(aimAngle) * 34 * scale;

  // Massive ignition shockwave under caster when launching the Colossal Sun
  engine.groundRunes.push({
    x: casterX,
    y: casterY,
    radius: 16,
    maxRadius: 115 * scale,
    rotation: aimAngle,
    vRot: 1.5,
    life: 0,
    maxLife: 0.55,
    style: 'infernal_target',
    palette,
    perspectiveY: 0.56,
  });

  activePyroFireballs.push({
    x: startX,
    y: startY,
    z: 44 * scale,
    startX,
    startY,
    targetX,
    targetY,
    vx: Math.cos(aimAngle) * speed,
    vy: Math.sin(aimAngle) * speed,
    angle: aimAngle,
    radius: 68 * scale,
    scale,
    life: 0,
    maxLife: Math.min(1.55, dist / speed),
    scorchTick: 0,
    mode: 'colossal_sun',
    palette,
    casterId,
    hitSlimeIds: new Set(),
  });

  engine.addTrauma(0.52, params.screenShakeIntensity);
}

export function spawnExpandingFlameWaveModule(
  engine: VfxEngine,
  casterX: number,
  casterY: number,
  aimAngle: number,
  palette: ElementalPalette,
  scale: number,
  params: ShaderParams,
  casterId?: string
) {
  soundEngine.playArcaneImpact(1.2);
  soundEngine.playSlash(0.85);

  const speed = 520;
  const startX = casterX + Math.cos(aimAngle) * 24 * scale;
  const startY = casterY + Math.sin(aimAngle) * 24 * scale;

  // Initial narrow ignition burst that rapidly opens into a wide advancing flame wall
  engine.impactFlashes.push({
    x: startX,
    y: startY,
    radius: 85 * scale,
    life: 0,
    maxLife: 0.09,
    palette,
  });

  activeExpandingFlames.push({
    originX: startX,
    originY: startY,
    x: startX,
    y: startY,
    vx: Math.cos(aimAngle) * speed,
    vy: Math.sin(aimAngle) * speed,
    angle: aimAngle,
    startWidth: 36 * scale,
    maxWidth: 255 * scale,
    currentWidth: 36 * scale,
    startSpread: 0.22,
    maxSpread: 1.28,
    currentSpread: 0.22,
    scale,
    life: 0,
    maxLife: 0.68,
    crestTick: 0.06,
    palette,
    casterId,
    hitSlimeIds: new Set(),
  });

  engine.addTrauma(0.54, params.screenShakeIntensity);
}



