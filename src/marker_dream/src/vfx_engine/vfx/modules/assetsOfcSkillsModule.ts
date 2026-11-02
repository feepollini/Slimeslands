// ============================================================================
// MODULE: OFFICIAL ASSETS PACK SKILLS (#65 - #82)
// Pure 1-to-1 Skill Implementations for every folder in /assetsofc:
// - ZERO mixing of different asset folders inside the same skill.
// - ZERO mixing of different variants (01..04) within the same cast.
// - Ground-based barriers, bone tusks, spikes, monoliths, pillars, crystals,
//   embedded swords, plants, and vines emerge vertically from the ground.
// ============================================================================

import { ElementalPalette, ShaderParams, SlimeActor } from '../types';
import { getGlowSprite, removeSwapPop } from '../core/mathLut';
import {
  AssetOfcCategory,
  ExtraProjectileRuneKey,
  getAssetOfcForPalette,
  getAssetOfcVariant,
  getExtraProjectileRuneAsset,
  getVariantIndexForPalette,
  isImageReady,
  preloadAllAssetsOfc,
} from '../core/assetsOfcRegistry';
import { soundEngine } from '../soundEngine';
import type { VfxEngine } from '../vfxEngine';

export interface SpinningShurikenEntity {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  angle: number;
  spinAngle: number;
  spinSpeed: number;
  scale: number;
  life: number;
  maxLife: number;
  delay: number;
  palette: ElementalPalette;
  casterId?: string;
  mode: 'boomerang_fan' | 'cryo_ricochet';
  returning: boolean;
  ricochetsLeft: number;
  hitSlimeIds: Set<string>;
  useIceExtraSprite?: boolean;
  variantIdx: 1 | 2 | 3 | 4;
}

export interface AssetMissileEntity {
  x: number;
  y: number;
  startX: number;
  startY: number;
  controlX: number;
  controlY: number;
  targetX: number;
  targetY: number;
  angle: number;
  scale: number;
  life: number;
  maxLife: number;
  delay: number;
  palette: ElementalPalette;
  casterId?: string;
  useIceMissileExtra?: boolean;
  variantIdx: 1 | 2 | 3 | 4;
}

export interface StaticAssetPropEntity {
  x: number;
  y: number;
  z: number;
  vz: number;
  category: AssetOfcCategory;
  extraKey?: ExtraProjectileRuneKey;
  variantIdx: 1 | 2 | 3 | 4;
  palette: ElementalPalette;
  width: number;
  height: number;
  rotation: number;
  vRot: number;
  perspectiveY: number;
  life: number;
  maxLife: number;
  delay: number;
  layer: 'ground' | 'front';
  casterId?: string;
  casterTeam: 0 | 1;
  behavior?:
    | 'static_prop'
    | 'blood_decal'
    | 'poison_pool'
    | 'magic_pool'
    | 'carnivorous_plant'
    | 'spike_trap'
    | 'vertical_portal'
    | 'rising_wall'
    | 'embedded_sword'
    | 'healing_lotus';
  tickTimer: number;
  impacted?: boolean;
}

const activeShurikens: SpinningShurikenEntity[] = [];
const activeAssetMissiles: AssetMissileEntity[] = [];
const activeAssetProps: StaticAssetPropEntity[] = [];

export function clearAssetsOfcEntities(): void {
  activeShurikens.length = 0;
  activeAssetMissiles.length = 0;
  activeAssetProps.length = 0;
}

export function getAssetsOfcEntityCount(): number {
  return (
    activeShurikens.length +
    activeAssetMissiles.length +
    activeAssetProps.length
  );
}

/**
 * Spawns a single pure 2.5D skill asset from /assetsofc using the exact
 * deterministic variant for the active ElementalPalette.
 */
export function spawnAssetOfcProp(
  opts: Partial<StaticAssetPropEntity> & {
    x: number;
    y: number;
    category: AssetOfcCategory;
    palette: ElementalPalette;
  }
): void {
  if (activeAssetProps.length > 110) return;
  const resolvedVariant =
    opts.variantIdx ?? getVariantIndexForPalette(opts.category, opts.palette);
  activeAssetProps.push({
    x: opts.x,
    y: opts.y,
    z: opts.z ?? 0,
    vz: opts.vz ?? 0,
    category: opts.category,
    extraKey: opts.extraKey,
    variantIdx: resolvedVariant,
    palette: opts.palette,
    width: opts.width ?? 145,
    height: opts.height ?? 145,
    rotation: opts.rotation ?? 0,
    vRot: opts.vRot ?? 0,
    perspectiveY: opts.perspectiveY ?? 1.0,
    life: 0,
    maxLife: opts.maxLife ?? 1.85,
    delay: opts.delay ?? 0,
    layer: opts.layer ?? 'front',
    casterId: opts.casterId,
    casterTeam: opts.casterTeam ?? 0,
    behavior: opts.behavior ?? 'static_prop',
    tickTimer: 0,
    impacted: opts.impacted ?? true,
  });
}

export function updateAssetsOfcModule(
  engine: VfxEngine,
  dt: number,
  params: ShaderParams
): void {
  preloadAllAssetsOfc();
  const scale = params.effectScale * 0.7;

  // 1. Update Spinning Shurikens (#65 Boomerang Fan & #66 Cryo Ricochet)
  for (let i = activeShurikens.length - 1; i >= 0; i--) {
    const sh = activeShurikens[i];
    if (sh.delay > 0) {
      sh.delay -= dt;
      continue;
    }
    sh.life += dt;
    sh.spinAngle += sh.spinSpeed * dt;

    if (sh.mode === 'boomerang_fan') {
      const halfLife = sh.maxLife * 0.46;
      if (!sh.returning && sh.life >= halfLife) {
        sh.returning = true;
        sh.hitSlimeIds.clear();
        soundEngine.playSlash(1.35);
      }

      if (sh.returning) {
        const caster = engine.slimes.find((s) => s.id === sh.casterId);
        const destX = caster ? caster.x : sh.x - sh.vx * 0.5;
        const destY = caster ? caster.y - 14 : sh.y - sh.vy * 0.5;
        const dx = destX - sh.x;
        const dy = destY - sh.y;
        const dist = Math.hypot(dx, dy) || 1;
        const returnSpd = 980;
        sh.vx += ((dx / dist) * returnSpd - sh.vx) * 9 * dt;
        sh.vy += ((dy / dist) * returnSpd - sh.vy) * 9 * dt;

        if (caster && dist < 34 && sh.life > halfLife + 0.12) {
          removeSwapPop(activeShurikens, i);
          continue;
        }
      } else {
        sh.vx *= Math.pow(0.28, dt);
        sh.vy *= Math.pow(0.28, dt);
      }
    }

    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;

    if (Math.random() < dt * 24) {
      engine.spawnParticle({
        x: sh.x + (Math.random() - 0.5) * 18,
        y: sh.y - sh.z + (Math.random() - 0.5) * 18,
        z: 0,
        vx: -sh.vx * 0.15 + (Math.random() - 0.5) * 70,
        vy: -sh.vy * 0.15 + (Math.random() - 0.5) * 70,
        vz: 20,
        size: 4.5 * sh.scale,
        color: sh.palette.primary,
        coreColor: sh.palette.core,
        alpha: 1,
        life: 0,
        maxLife: 0.22,
        drag: 0.92,
        gravity: 0,
        bounce: 0,
        floorY: 9999,
        type: sh.useIceExtraSprite ? 'snowflake' : 'slash_ember',
        rotation: sh.spinAngle,
        vRot: 12,
        stretch: 1.8,
        seed: i,
      });
    }

    // Check collision against enemy characters (pure shuriken impact — ZERO mixed props!)
    let consumed = false;
    for (let sIdx = 0; sIdx < engine.slimes.length; sIdx++) {
      const s = engine.slimes[sIdx];
      if (sh.casterId && s.id === sh.casterId) continue;
      if (sh.hitSlimeIds.has(s.id)) continue;

      const d = Math.hypot(s.x - sh.x, s.y - s.z - (sh.y - sh.z));
      if (d <= s.radius + 32 * sh.scale) {
        sh.hitSlimeIds.add(s.id);
        soundEngine.playSlash(1.5);

        if (sh.mode === 'cryo_ricochet') {
          engine.damageSlime(s, 1490, 'SHURIKEN GLACIAL!', sh.palette, sh.casterId, {
            freezeDuration: 1.65,
          });

          if (sh.ricochetsLeft > 0) {
            sh.ricochetsLeft--;
            const nextTarget = engine.slimes.find(
              (other) =>
                other.id !== sh.casterId &&
                !sh.hitSlimeIds.has(other.id) &&
                other.team === s.team
            );
            if (nextTarget) {
              const rAng = Math.atan2(nextTarget.y - sh.y, nextTarget.x - sh.x);
              const spd = Math.max(820, Math.hypot(sh.vx, sh.vy));
              sh.vx = Math.cos(rAng) * spd;
              sh.vy = Math.sin(rAng) * spd;
              sh.life = 0;
            } else {
              consumed = true;
            }
          } else {
            consumed = true;
          }
          break;
        } else {
          engine.damageSlime(
            s,
            sh.returning ? 920 : 1180,
            sh.returning ? 'RETORNO SHURIKEN!' : 'CORTE SHURIKEN!',
            sh.palette,
            sh.casterId,
            {
              knockbackX: Math.cos(sh.angle) * 190,
              knockbackY: Math.sin(sh.angle) * 190,
            }
          );
        }
      }
    }

    if (consumed || sh.life >= sh.maxLife) {
      removeSwapPop(activeShurikens, i);
    }
  }

  // 2. Update Portal-Launched Asset Missiles (#69 Vertical Portal Barrage)
  for (let i = activeAssetMissiles.length - 1; i >= 0; i--) {
    const m = activeAssetMissiles[i];
    if (m.delay > 0) {
      m.delay -= dt;
      continue;
    }
    m.life += dt;
    const t = Math.min(1, m.life / m.maxLife);
    const inv = 1 - t;
    const nx = inv * inv * m.startX + 2 * inv * t * m.controlX + t * t * m.targetX;
    const ny = inv * inv * m.startY + 2 * inv * t * m.controlY + t * t * m.targetY;
    m.angle = Math.atan2(ny - m.y, nx - m.x);
    m.x = nx;
    m.y = ny;

    if (m.life >= m.maxLife) {
      soundEngine.playArcaneImpact(0.8);
      engine.shockRings.push({
        x: m.targetX,
        y: m.targetY,
        radius: 8,
        maxRadius: 82 * m.scale,
        thickness: 7 * m.scale,
        life: 0,
        maxLife: 0.28,
        palette: m.palette,
        perspectiveY: 0.58,
        rotation: 0,
        isHexagonal: true,
      });
      engine.applyAreaEffect(
        m.targetX,
        m.targetY,
        92 * m.scale,
        680,
        m.useIceMissileExtra ? 'MÍSSIL DE GELO!' : 'MÍSSIL DO PORTAL!',
        m.palette,
        {
          casterId: m.casterId,
          freezeDuration: m.useIceMissileExtra ? 1.1 : undefined,
        }
      );
      removeSwapPop(activeAssetMissiles, i);
    }
  }

  // 3. Update Ground-Emerging & Interactive Skill Assets
  for (let i = activeAssetProps.length - 1; i >= 0; i--) {
    const prop = activeAssetProps[i];
    if (prop.delay > 0) {
      prop.delay -= dt;
      continue;
    }
    prop.life += dt;
    prop.rotation += prop.vRot * dt;
    prop.tickTimer += dt;

    // Ground Emergence Impact Trigger
    if (prop.behavior === 'rising_wall' && !prop.impacted) {
      prop.impacted = true;
      prop.z = 0;
      soundEngine.playArcaneImpact(1.2);
      engine.shockRings.push({
        x: prop.x,
        y: prop.y,
        radius: 10,
        maxRadius: 135 * scale,
        thickness: 9 * scale,
        life: 0,
        maxLife: 0.34,
        palette: prop.palette,
        perspectiveY: 0.56,
        rotation: 0,
      });
      engine.applyAreaEffect(
        prop.x,
        prop.y,
        130 * scale,
        1420,
        'ERUPÇÃO DO SOLO!',
        prop.palette,
        {
          casterId: prop.casterId,
          stunDuration: 0.85,
          knockupVelocity: 310,
        }
      );
    }

    // Carnivorous Plant snapping & biting nearby enemies (#67) — ZERO mixed decals
    if (prop.behavior === 'carnivorous_plant' && prop.tickTimer >= 0.55) {
      prop.tickTimer = 0;
      engine.slimes.forEach((s) => {
        if (prop.casterId && s.id === prop.casterId) return;
        const dist = Math.hypot(s.x - prop.x, s.y - prop.y);
        if (dist <= prop.width * 0.72 + s.radius) {
          soundEngine.playSlash(0.95);
          s.rootTimer = Math.max(s.rootTimer || 0, 1.4);
          s.poisonTimer = Math.max(s.poisonTimer, 1.8);
          engine.damageSlime(
            s,
            680,
            'MORDIDA CARNÍVORA!',
            prop.palette,
            prop.casterId,
            {
              knockbackY: -160,
            }
          );
        }
      });
    }

    // Spike Trap impaling periodic check (#68) — ZERO mixed decals
    if (prop.behavior === 'spike_trap' && prop.tickTimer >= 0.5) {
      prop.tickTimer = 0;
      engine.slimes.forEach((s) => {
        if (prop.casterId && s.id === prop.casterId) return;
        const dist = Math.hypot(s.x - prop.x, s.y - prop.y);
        if (dist <= prop.width * 0.58 + s.radius) {
          soundEngine.playSlash(1.1);
          engine.damageSlime(
            s,
            640,
            prop.variantIdx === 2
              ? 'ESPINHOS DE OSSO!'
              : prop.variantIdx === 1
              ? 'ESTACAS DE MADEIRA!'
              : prop.variantIdx === 3
              ? 'LANÇAS DE FERRO!'
              : 'ESPINHOS DE ROCHA!',
            prop.palette,
            prop.casterId,
            {
              knockupVelocity: 240,
              stunDuration: 0.45,
            }
          );
        }
      });
    }

    // Mystic Healing Crystal Lotus pulse (#72)
    if (prop.behavior === 'healing_lotus' && prop.tickTimer >= 0.5) {
      prop.tickTimer = 0;
      engine.applySupportHealAndBuff(prop.x, prop.y, prop.width * 0.95, prop.palette, {
        casterId: prop.casterId,
        healAmount: 1150,
        regenDuration: 1.6,
        label: '+LÓTUS MÁGICA!',
      });
    }

    if (prop.life >= prop.maxLife) {
      removeSwapPop(activeAssetProps, i);
    }
  }
}

export function renderAssetsOfcGroundModule(ctx: CanvasRenderingContext2D): void {
  if (activeAssetProps.length === 0) return;
  ctx.save();

  for (let i = 0; i < activeAssetProps.length; i++) {
    const prop = activeAssetProps[i];
    if (prop.layer !== 'ground' || prop.delay > 0) continue;

    const img = prop.extraKey
      ? getExtraProjectileRuneAsset(prop.extraKey)
      : getAssetOfcVariant(prop.category, prop.variantIdx);

    if (!isImageReady(img)) continue;

    const t = prop.life / prop.maxLife;
    const grow = Math.min(1, prop.life / 0.14);
    const fade = t > 0.76 ? 1 - (t - 0.76) / 0.24 : 1;

    ctx.save();
    ctx.translate(prop.x, prop.y);
    ctx.scale(1, prop.perspectiveY);
    ctx.rotate(prop.rotation);
    ctx.globalAlpha = Math.max(0, fade);

    const w = prop.width * grow;
    const h = prop.height * grow;

    if (
      prop.category === 'runas_01' ||
      prop.category === 'runas_02' ||
      prop.category === 'runas_03' ||
      prop.extraKey === 'runa_simples'
    ) {
      ctx.globalCompositeOperation = 'lighter';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.drawImage(img, -w * 0.5, -h * 0.5, w, h);
    ctx.restore();
  }

  ctx.restore();
}

export function renderAssetsOfcFrontModule(ctx: CanvasRenderingContext2D): void {
  if (
    activeShurikens.length === 0 &&
    activeAssetMissiles.length === 0 &&
    activeAssetProps.length === 0
  ) {
    return;
  }

  ctx.save();

  // 1. Render 2.5D Standing & Ground-Emerging Skill Assets
  for (let i = 0; i < activeAssetProps.length; i++) {
    const prop = activeAssetProps[i];
    if (prop.layer !== 'front' || prop.delay > 0) continue;

    const img = prop.extraKey
      ? getExtraProjectileRuneAsset(prop.extraKey)
      : getAssetOfcVariant(prop.category, prop.variantIdx);

    if (!isImageReady(img)) continue;

    const t = prop.life / prop.maxLife;
    const isGroundEmergent =
      prop.behavior === 'rising_wall' ||
      prop.behavior === 'spike_trap' ||
      prop.behavior === 'embedded_sword' ||
      prop.category === 'barreiras_pedra' ||
      prop.category === 'barreiras_elementais' ||
      prop.category === 'rochas_01' ||
      prop.category === 'rochas_02' ||
      prop.category === 'meteoros' ||
      prop.category === 'pilares_01' ||
      prop.category === 'pilares_02' ||
      prop.category === 'armadilhas_espinhos' ||
      prop.category === 'espadas_cravadas' ||
      prop.category === 'cristais_gelo' ||
      prop.category === 'cristais_variados' ||
      prop.category === 'cipos';

    const growT = Math.min(1, prop.life / 0.18);
    const sinkT = t > 0.8 ? Math.max(0, 1 - (t - 0.8) / 0.2) : 1;
    const easeOutBack =
      1 + 1.6 * Math.pow(growT - 1, 3) + 0.6 * Math.pow(growT - 1, 2);
    const scaleAnim = isGroundEmergent ? 1.0 : Math.max(0.1, easeOutBack);
    const fade = t > 0.82 ? 1 - (t - 0.82) / 0.18 : 1;

    const pulse =
      prop.behavior === 'carnivorous_plant'
        ? 1 + Math.sin(prop.life * 14 + i) * 0.08
        : prop.behavior === 'vertical_portal'
        ? 1 + Math.sin(prop.life * 9 + i) * 0.05
        : 1;

    const w = prop.width * scaleAnim * pulse;
    const h = prop.height * scaleAnim * pulse;

    // Ground contact shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
    ctx.beginPath();
    ctx.ellipse(prop.x, prop.y + 8, w * 0.38, w * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(prop.x, prop.y);
    ctx.globalAlpha = Math.max(0, fade);

    if (isGroundEmergent) {
      // Subterranean Clip Plane: Stone Walls, Bone Tusks, Spikes, Pillars & Crystals sprout UP vertically from the ground!
      ctx.beginPath();
      ctx.rect(-w * 0.75, -h * 1.15, w * 1.5, h * 1.15 + 18);
      ctx.clip();

      const emergeRatio = Math.sin(growT * Math.PI * 0.5) * sinkT;
      const slideY = (1 - emergeRatio) * h * 0.86;
      ctx.translate(0, slideY);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(img, -w * 0.5, -h * 0.78, w, h);
    } else {
      ctx.rotate(prop.rotation);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(img, -w * 0.5, -h * 0.78, w, h);
    }

    ctx.restore();
  }

  // 2. Render Portal-Launched Elemental Missiles (/assetsofc/misseis & missil_gelo.png)
  for (let i = 0; i < activeAssetMissiles.length; i++) {
    const m = activeAssetMissiles[i];
    if (m.delay > 0) continue;

    const img = m.useIceMissileExtra
      ? getExtraProjectileRuneAsset('missil_gelo')
      : getAssetOfcVariant('misseis', m.variantIdx);

    if (!isImageReady(img)) continue;

    const w = 115 * m.scale;
    const h = 115 * m.scale;

    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.angle);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(img, -w * 0.55, -h * 0.5, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(img, -w * 0.55, -h * 0.5, w, h);
    ctx.restore();
  }

  // 3. Render High-Speed Spinning Shurikens (/assetsofc/shurikens & shuriken_gelo.png)
  for (let i = 0; i < activeShurikens.length; i++) {
    const sh = activeShurikens[i];
    if (sh.delay > 0) continue;

    const img = sh.useIceExtraSprite
      ? getExtraProjectileRuneAsset('shuriken_gelo')
      : getAssetOfcVariant('shurikens', sh.variantIdx);

    if (!isImageReady(img)) continue;

    const sz = 108 * sh.scale;
    const screenY = sh.y - sh.z;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.beginPath();
    ctx.ellipse(sh.x, sh.y + 8, sz * 0.28, sz * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(sh.x, screenY);

    const glow = getGlowSprite(sh.palette.primary, sh.palette.core);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(glow, -sz * 0.65, -sz * 0.65, sz * 1.3, sz * 1.3);

    ctx.rotate(sh.spinAngle);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(img, -sz * 0.5, -sz * 0.5, sz, sz);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.4;
    ctx.drawImage(img, -sz * 0.5, -sz * 0.5, sz, sz);

    ctx.restore();
  }

  ctx.restore();
}

// ============================================================================
// #65. TEMPESTADE DE SHURIKENS (SOMENTE assetsofc/shurikens_01..04.png)
// All 5 shurikens in the boomerang fan use the exact same elemental variant!
// ============================================================================
export function spawnNinjaShurikenStormModule(
  _engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  aimAngle: number,
  palette: ElementalPalette,
  scale: number,
  _params: ShaderParams
): void {
  soundEngine.playSlash(1.55);

  const variantIdx = getVariantIndexForPalette('shurikens', palette);
  const count = 5;
  const cone = 0.72;
  const speed = 880;

  for (let i = 0; i < count; i++) {
    const u = i / (count - 1) - 0.5;
    const ang = aimAngle + u * cone;
    activeShurikens.push({
      x: casterX + Math.cos(ang) * 28 * scale,
      y: casterY + Math.sin(ang) * 28 * scale,
      z: 16,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      angle: ang,
      spinAngle: i * 0.8,
      spinSpeed: 22,
      scale: scale * 1.05,
      life: 0,
      maxLife: 1.25,
      delay: Math.abs(u) * 0.05,
      palette,
      casterId: caster?.id,
      mode: 'boomerang_fan',
      returning: false,
      ricochetsLeft: 0,
      hitSlimeIds: new Set(),
      useIceExtraSprite: false,
      variantIdx,
    });
  }
}

// ============================================================================
// #66. SHURIKEN GLACIAL RICOCHETE (SOMENTE extras_projeteis_runa/shuriken_gelo.png)
// ============================================================================
export function spawnCryoShurikenPrismModule(
  _engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  aimAngle: number,
  palette: ElementalPalette,
  scale: number,
  _params: ShaderParams
): void {
  soundEngine.playCrystalFreeze();

  for (let k = 0; k < 2; k++) {
    const ang = aimAngle + (k === 0 ? -0.06 : 0.06);
    activeShurikens.push({
      x: casterX + Math.cos(ang) * 28 * scale,
      y: casterY + Math.sin(ang) * 28 * scale,
      z: 16,
      vx: Math.cos(ang) * 960,
      vy: Math.sin(ang) * 960,
      angle: ang,
      spinAngle: k * 1.57,
      spinSpeed: 26,
      scale: scale * 1.15,
      life: 0,
      maxLife: 1.45,
      delay: k * 0.1,
      palette,
      casterId: caster?.id,
      mode: 'cryo_ricochet',
      returning: false,
      ricochetsLeft: 4,
      hitSlimeIds: new Set(),
      useIceExtraSprite: true,
      variantIdx: 1,
    });
  }
}

// ============================================================================
// #67. PLANTA CARNÍVORA VORAZ (SOMENTE assetsofc/plantas_carnivoras_01..04.png)
// 01=Dionaea Verde, 02=Espinheira Carmesim, 03=Jarros Roxos, 04=Flor-Mandíbula de Osso
// ============================================================================
export function spawnCarnivorousPlantGardenModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  _casterX: number,
  _casterY: number,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  _params: ShaderParams
): void {
  soundEngine.playArcaneImpact(1.15);
  const team = caster ? caster.team : 0;
  const variantIdx = getVariantIndexForPalette('plantas_carnivoras', palette);

  spawnAssetOfcProp({
    x: targetX,
    y: targetY,
    category: 'plantas_carnivoras',
    variantIdx,
    palette,
    width: 210 * scale,
    height: 210 * scale,
    maxLife: 2.5,
    layer: 'front',
    casterId: caster?.id,
    casterTeam: team,
    behavior: 'carnivorous_plant',
  });

  engine.applyAreaEffect(
    targetX,
    targetY,
    165 * scale,
    1840,
    variantIdx === 4 ? 'MANDÍBULA DE OSSO!' : 'PLANTA CARNÍVORA!',
    palette,
    {
      casterId: caster?.id,
      rootDuration: 2.2,
      poisonDuration: 2.8,
    }
  );
}

// ============================================================================
// #68. EMPALAMENTO DE ESPINHOS (SOMENTE assetsofc/armadilhas_espinhos_01..04.png)
// 01=Estacas de Madeira, 02=Espinhos de Ossos/Crânios, 03=Lanças de Ferro, 04=Espinhos de Pedra
// ============================================================================
export function spawnSpikeTrapAmbushModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  _casterX: number,
  _casterY: number,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  _params: ShaderParams
): void {
  soundEngine.playSlash(1.2);
  soundEngine.playArcaneImpact(1.1);
  const team = caster ? caster.team : 0;
  const variantIdx = getVariantIndexForPalette('armadilhas_espinhos', palette);

  spawnAssetOfcProp({
    x: targetX,
    y: targetY,
    category: 'armadilhas_espinhos',
    variantIdx,
    palette,
    width: 215 * scale,
    height: 215 * scale,
    maxLife: 2.3,
    layer: 'front',
    casterId: caster?.id,
    casterTeam: team,
    behavior: 'spike_trap',
    impacted: false,
  });

  engine.applyAreaEffect(
    targetX,
    targetY,
    165 * scale,
    2180,
    variantIdx === 2
      ? 'ESPINHOS DE OSSO!'
      : variantIdx === 1
      ? 'ESTACAS DE MADEIRA!'
      : variantIdx === 3
      ? 'LANÇAS DE FERRO!'
      : 'ESPINHOS DE ROCHA!',
    palette,
    {
      casterId: caster?.id,
      knockupVelocity: 350,
      stunDuration: 0.95,
    }
  );
}

// ============================================================================
// #69. PORTAIS DIMENSIONAIS & MÍSSEIS (assetsofc/portais_verticais + misseis)
// Pure dimensional portal barrage without mixing swords or runes!
// ============================================================================
export function spawnVerticalPortalBarrageModule(
  _engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  targetX: number,
  targetY: number,
  aimAngle: number,
  palette: ElementalPalette,
  scale: number,
  _params: ShaderParams
): void {
  soundEngine.playBeamChannel();
  soundEngine.playSkillshotLaunch();
  const team = caster ? caster.team : 0;
  const perp = aimAngle + Math.PI / 2;
  const portalVariant = getVariantIndexForPalette('portais_verticais', palette);
  const missileVariant = getVariantIndexForPalette('misseis', palette);
  const isIce = palette.id === 'freljord_ice';

  for (let p = -1; p <= 1; p++) {
    const px =
      casterX - Math.cos(aimAngle) * 35 * scale + Math.cos(perp) * p * 78 * scale;
    const py =
      casterY - Math.sin(aimAngle) * 35 * scale + Math.sin(perp) * p * 58 * scale;

    spawnAssetOfcProp({
      x: px,
      y: py,
      category: 'portais_verticais',
      variantIdx: portalVariant,
      palette,
      width: 155 * scale,
      height: 175 * scale,
      maxLife: 1.45,
      delay: Math.abs(p) * 0.04,
      layer: 'front',
      casterId: caster?.id,
      casterTeam: team,
      behavior: 'vertical_portal',
    });

    for (let m = 0; m < 3; m++) {
      const spreadX = (Math.random() - 0.5) * 80 * scale;
      const spreadY = (Math.random() - 0.5) * 50 * scale;

      activeAssetMissiles.push({
        x: px,
        y: py - 45 * scale,
        startX: px,
        startY: py - 45 * scale,
        controlX: (px + targetX) * 0.5 + Math.cos(perp) * p * 95 * scale,
        controlY: Math.min(py, targetY) - (95 + m * 35) * scale,
        targetX: targetX + spreadX,
        targetY: targetY + spreadY,
        angle: aimAngle,
        scale: scale * 0.95,
        life: 0,
        maxLife: 0.36 + m * 0.06,
        delay: 0.08 + Math.abs(p) * 0.05 + m * 0.07,
        palette,
        casterId: caster?.id,
        useIceMissileExtra: isIce,
        variantIdx: missileVariant,
      });
    }
  }
}

// ============================================================================
// #70. MURALHA DE PRESAS DE OSSO & ROCHAS (SOMENTE assetsofc/rochas_01_01..04.png)
// 01=Basalto Musgoso, 02=Presas de Osso Gigantes, 03=Rochas Afiadas, 04=Colunas de Basalto
// ============================================================================
export function spawnMeteorExtinctionRainModule(
  _engine: VfxEngine,
  caster: SlimeActor | undefined,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  _params: ShaderParams
): void {
  soundEngine.playArcaneImpact(1.35);
  const team = caster ? caster.team : 0;
  const variantIdx = getVariantIndexForPalette('rochas_01', palette);

  spawnAssetOfcProp({
    x: targetX,
    y: targetY,
    z: 0,
    category: 'rochas_01',
    variantIdx,
    palette,
    width: 235 * scale,
    height: 235 * scale,
    maxLife: 2.25,
    layer: 'front',
    casterId: caster?.id,
    casterTeam: team,
    behavior: 'rising_wall',
    impacted: false,
  });
}

// ============================================================================
// #71. SANTUÁRIO DE PILARES ELEMENTAIS (SOMENTE assetsofc/pilares_01_01..04.png)
// 01=Pilar de Gelo, 02=Pilar de Magma, 03=Pilar Rúnico do Vazio, 04=Pilar da Natureza
// ============================================================================
export function spawnRunicSwordsSanctuaryModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  _casterX: number,
  _casterY: number,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  _params: ShaderParams
): void {
  soundEngine.playCrystalFreeze();
  soundEngine.playArcaneImpact(1.25);
  const team = caster ? caster.team : 0;
  const variantIdx = getVariantIndexForPalette('pilares_01', palette);

  spawnAssetOfcProp({
    x: targetX,
    y: targetY,
    category: 'pilares_01',
    variantIdx,
    palette,
    width: 235 * scale,
    height: 245 * scale,
    maxLife: 2.2,
    layer: 'front',
    casterId: caster?.id,
    casterTeam: team,
    behavior: 'rising_wall',
    impacted: false,
  });

  engine.applyAreaEffect(
    targetX,
    targetY,
    180 * scale,
    2280,
    'SANTUÁRIO DE PILARES!',
    palette,
    {
      casterId: caster?.id,
      stunDuration: 1.1,
      grantCasterShield: 2800,
      healAlliesAmount: 1800,
    }
  );
}

// ============================================================================
// #72. DESABROCHAR DA LÓTUS MÁGICA (SOMENTE assetsofc/flores_magicas_01..04.png)
// 01=Lótus de Gelo, 02=Lótus do Vazio, 03=Lótus Solar Dourada, 04=Lótus Carmesim
// ============================================================================
export function spawnMysticLotusPoolModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  casterX: number,
  casterY: number,
  palette: ElementalPalette,
  scale: number,
  _params: ShaderParams
): void {
  soundEngine.playCrystalFreeze();
  const team = caster ? caster.team : 0;
  const variantIdx = getVariantIndexForPalette('flores_magicas', palette);

  spawnAssetOfcProp({
    x: casterX,
    y: casterY,
    category: 'flores_magicas',
    variantIdx,
    palette,
    width: 215 * scale,
    height: 215 * scale,
    maxLife: 2.5,
    layer: 'front',
    casterId: caster?.id,
    casterTeam: team,
    behavior: 'healing_lotus',
  });

  engine.applySupportHealAndBuff(casterX, casterY, 220 * scale, palette, {
    casterId: caster?.id,
    healAmount: 3200,
    regenDuration: 3.2,
    label: '+LÓTUS MÁGICA!',
  });

  engine.applyAreaEffect(
    casterX,
    casterY,
    185 * scale,
    1650,
    'DESABROCHAR DA LÓTUS!',
    palette,
    {
      casterId: caster?.id,
      knockbackForce: 240,
      originX: casterX,
      originY: casterY,
      grantCasterShield: 2600,
    }
  );
}

// ============================================================================
// #73. BARREIRA DE PEDRA & CRISTAL (SOMENTE assetsofc/barreiras_pedra_01..04.png)
// 01=Cristal Glacial, 02=Magma Vulcânico, 03=Pedra com Cipós, 04=Cristal do Vazio
// ============================================================================
export function spawnStoneBarrierBulwarkModule(
  _engine: VfxEngine,
  caster: SlimeActor | undefined,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number
): void {
  soundEngine.playArcaneImpact(1.3);
  const team = caster ? caster.team : 0;
  const variantIdx = getVariantIndexForPalette('barreiras_pedra', palette);

  spawnAssetOfcProp({
    x: targetX,
    y: targetY,
    category: 'barreiras_pedra',
    variantIdx,
    palette,
    width: 235 * scale,
    height: 235 * scale,
    maxLife: 2.3,
    layer: 'front',
    casterId: caster?.id,
    casterTeam: team,
    behavior: 'rising_wall',
    impacted: false,
  });
}

// ============================================================================
// #74. MURALHA ELEMENTAL EMERGENTE (SOMENTE assetsofc/barreiras_elementais_01..04.png)
// 01=Magma/Fogo, 02=Rocha Musgosa, 03=Rocha Bruta, 04=Obsidiana do Vazio
// ============================================================================
export function spawnElementalCragWallModule(
  _engine: VfxEngine,
  caster: SlimeActor | undefined,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number
): void {
  soundEngine.playArcaneImpact(1.3);
  const team = caster ? caster.team : 0;
  const variantIdx = getVariantIndexForPalette('barreiras_elementais', palette);

  spawnAssetOfcProp({
    x: targetX,
    y: targetY,
    category: 'barreiras_elementais',
    variantIdx,
    palette,
    width: 235 * scale,
    height: 235 * scale,
    maxLife: 2.3,
    layer: 'front',
    casterId: caster?.id,
    casterTeam: team,
    behavior: 'rising_wall',
    impacted: false,
  });
}

// ============================================================================
// #75. BARRICADA DE OSSOS & ROCHA (SOMENTE assetsofc/rochas_02_01..04.png)
// 01=Rocha Musgosa, 02=Magma, 03=Cristal Glacial, 04=Barricada de Ossos/Marfim
// ============================================================================
export function spawnFangRidgeBarricadeModule(
  _engine: VfxEngine,
  caster: SlimeActor | undefined,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number
): void {
  soundEngine.playArcaneImpact(1.3);
  const team = caster ? caster.team : 0;
  const variantIdx = getVariantIndexForPalette('rochas_02', palette);

  spawnAssetOfcProp({
    x: targetX,
    y: targetY,
    category: 'rochas_02',
    variantIdx,
    palette,
    width: 235 * scale,
    height: 235 * scale,
    maxLife: 2.3,
    layer: 'front',
    casterId: caster?.id,
    casterTeam: team,
    behavior: 'rising_wall',
    impacted: false,
  });
}

// ============================================================================
// #76. MONÓLITO CRAVADO ELEMENTAL (SOMENTE assetsofc/meteoros_01..04.png)
// 01=Monólito de Magma, 02=Monólito de Gelo, 03=Monólito do Vazio, 04=Monólito de Rocha
// ============================================================================
export function spawnTectonicMonolithSurgeModule(
  _engine: VfxEngine,
  caster: SlimeActor | undefined,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number
): void {
  soundEngine.playArcaneImpact(1.35);
  const team = caster ? caster.team : 0;
  const variantIdx = getVariantIndexForPalette('meteoros', palette);

  spawnAssetOfcProp({
    x: targetX,
    y: targetY,
    category: 'meteoros',
    variantIdx,
    palette,
    width: 240 * scale,
    height: 240 * scale,
    maxLife: 2.3,
    layer: 'front',
    casterId: caster?.id,
    casterTeam: team,
    behavior: 'rising_wall',
    impacted: false,
  });
}

// ============================================================================
// #77. ESPADA CRAVADA ELEMENTAL (SOMENTE assetsofc/espadas_cravadas_01..04.png)
// 01=Espada de Gelo, 02=Espada de Magma, 03=Espada do Vazio, 04=Espada da Natureza
// ============================================================================
export function spawnEmbeddedGreatswordAltarModule(
  _engine: VfxEngine,
  caster: SlimeActor | undefined,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number
): void {
  soundEngine.playSlash(1.4);
  soundEngine.playArcaneImpact(1.3);
  const team = caster ? caster.team : 0;
  const variantIdx = getVariantIndexForPalette('espadas_cravadas', palette);

  spawnAssetOfcProp({
    x: targetX,
    y: targetY,
    category: 'espadas_cravadas',
    variantIdx,
    palette,
    width: 235 * scale,
    height: 235 * scale,
    maxLife: 2.25,
    layer: 'front',
    casterId: caster?.id,
    casterTeam: team,
    behavior: 'rising_wall',
    impacted: false,
  });
}

// ============================================================================
// #78. COLUNAS DE RUÍNAS ANTIGAS (SOMENTE assetsofc/pilares_02_01..04.png)
// ============================================================================
export function spawnAncientRuinPillarsModule(
  _engine: VfxEngine,
  caster: SlimeActor | undefined,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number
): void {
  soundEngine.playArcaneImpact(1.25);
  const team = caster ? caster.team : 0;
  const variantIdx = getVariantIndexForPalette('pilares_02', palette);

  spawnAssetOfcProp({
    x: targetX,
    y: targetY,
    category: 'pilares_02',
    variantIdx,
    palette,
    width: 230 * scale,
    height: 230 * scale,
    maxLife: 2.25,
    layer: 'front',
    casterId: caster?.id,
    casterTeam: team,
    behavior: 'rising_wall',
    impacted: false,
  });
}

// ============================================================================
// #79. ERUPÇÃO DE CRISTAIS DE GELO (SOMENTE assetsofc/cristais_gelo ou cristais_variados)
// ============================================================================
export function spawnGlacialCrystalClusterModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number
): void {
  soundEngine.playCrystalFreeze();
  const team = caster ? caster.team : 0;
  const cat: AssetOfcCategory =
    palette.id === 'freljord_ice' ? 'cristais_gelo' : 'cristais_variados';
  const variantIdx = getVariantIndexForPalette(cat, palette);

  spawnAssetOfcProp({
    x: targetX,
    y: targetY,
    category: cat,
    variantIdx,
    palette,
    width: 230 * scale,
    height: 230 * scale,
    maxLife: 2.2,
    layer: 'front',
    casterId: caster?.id,
    casterTeam: team,
    behavior: 'rising_wall',
    impacted: false,
  });

  engine.applyAreaEffect(targetX, targetY, 155 * scale, 1780, 'CRISTAIS GLACIAIS!', palette, {
    casterId: caster?.id,
    freezeDuration: 1.5,
  });
}

// ============================================================================
// #80. EMARANHADO DE CIPÓS ELEMENTAIS (SOMENTE assetsofc/cipos_01..04.png)
// 01=Natureza Verde, 02=Vazio Roxo, 03=Fogo/Brasas, 04=Gelo Azul
// ============================================================================
export function spawnThornyVineThicketModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number
): void {
  soundEngine.playSlash(1.1);
  const team = caster ? caster.team : 0;
  const variantIdx = getVariantIndexForPalette('cipos', palette);

  spawnAssetOfcProp({
    x: targetX,
    y: targetY,
    category: 'cipos',
    variantIdx,
    palette,
    width: 225 * scale,
    height: 225 * scale,
    maxLife: 2.3,
    layer: 'front',
    casterId: caster?.id,
    casterTeam: team,
    behavior: 'rising_wall',
    impacted: false,
  });

  engine.applyAreaEffect(targetX, targetY, 155 * scale, 1690, 'PRISÃO DE CIPÓS!', palette, {
    casterId: caster?.id,
    rootDuration: 2.1,
  });
}

// ============================================================================
// #81. POÇA MÁGICA & VENENO BORBULHANTE (SOMENTE assetsofc/pocas_magicas ou veneno)
// Rendered upright in 2.5D so vertical splash droplets & rising fumes stay upright!
// ============================================================================
export function spawnArcaneSplashGeyserModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number
): void {
  soundEngine.playCrystalShatter();
  const team = caster ? caster.team : 0;
  const isVenom = palette.id === 'toxic_venom';
  const cat: AssetOfcCategory = isVenom ? 'veneno' : 'pocas_magicas';
  const variantIdx = getVariantIndexForPalette(cat, palette);

  spawnAssetOfcProp({
    x: targetX,
    y: targetY,
    category: cat,
    variantIdx,
    palette,
    width: 245 * scale,
    height: 245 * scale,
    perspectiveY: 1.0,
    rotation: 0,
    vRot: 0,
    maxLife: 2.4,
    layer: 'ground',
    casterId: caster?.id,
    casterTeam: team,
    behavior: isVenom ? 'poison_pool' : 'magic_pool',
  });

  engine.applyAreaEffect(
    targetX,
    targetY,
    165 * scale,
    1720,
    isVenom ? 'VAPOR DE VENENO!' : 'GEISER DE POÇA MÁGICA!',
    palette,
    {
      casterId: caster?.id,
      poisonDuration: isVenom ? 2.6 : undefined,
      soakedDuration: !isVenom ? 2.2 : undefined,
    }
  );
}

// ============================================================================
// #82. SELO DE RUNAS ANTIGAS & HEMORRAGIA (SOMENTE assetsofc/runas_01..03 ou sangue)
// ============================================================================
export function spawnRunicSigilInvocationModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number
): void {
  soundEngine.playArcaneImpact(1.2);
  const team = caster ? caster.team : 0;
  const isBlood = palette.id === 'crimson_blood';
  const cat: AssetOfcCategory = isBlood
    ? 'sangue'
    : palette.id === 'freljord_ice'
    ? 'runas_01'
    : palette.id === 'void_abyss'
    ? 'runas_02'
    : 'runas_03';
  const variantIdx = getVariantIndexForPalette(cat, palette);

  spawnAssetOfcProp({
    x: targetX,
    y: targetY,
    category: cat,
    variantIdx,
    palette,
    width: 245 * scale,
    height: 245 * scale,
    perspectiveY: isBlood ? 0.72 : 0.62,
    rotation: 0,
    vRot: isBlood ? 0 : 1.5,
    maxLife: 2.2,
    layer: 'ground',
    casterId: caster?.id,
    casterTeam: team,
    behavior: isBlood ? 'blood_decal' : 'static_prop',
  });

  engine.applyAreaEffect(
    targetX,
    targetY,
    170 * scale,
    1940,
    isBlood ? 'HEMORRAGIA CARMESIM!' : 'SELO RÚNICO ANCESTRAL!',
    palette,
    {
      casterId: caster?.id,
      stunDuration: 0.9,
    }
  );
}
