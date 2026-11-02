// ============================================================================
// MODULE: MOBILITY (DASHES, STUN LEAPS) & SUPPORT (HEALS, SHIELDS, BUFFS)
// Plug-and-play module for effects 25-32
// ============================================================================

import {
  ElementalPalette,
  HealTether,
  ShaderParams,
  SlimeActor,
  SlimeAfterimage,
} from '../types';
import { getGlowSprite } from '../core/mathLut';
import { soundEngine } from '../soundEngine';
import type { VfxEngine } from '../vfxEngine';

/**
 * 25. DASH COM RASTRO VENENOSO (VENOM TRAIL HIGH-SPEED DASH)
 */
export function spawnVenomDashModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  aimAngle: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number
) {
  soundEngine.playSlash(1.3);

  const maxDashDist = 265 * scale;
  const rawDist = Math.hypot(targetX - startX, targetY - startY);
  const actualDist = Math.min(maxDashDist, Math.max(130 * scale, rawDist));
  const destX = Math.max(70, Math.min(engine.getWidth() - 70, startX + Math.cos(aimAngle) * actualDist));
  const destY = Math.max(90, Math.min(engine.getHeight() - 120, startY + Math.sin(aimAngle) * actualDist));

  // Spawn 5 toxic acid pools & afterimages along the dash path
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = startX + (destX - startX) * t;
    const py = startY + (destY - startY) * t;

    engine.afterimages.push({
      x: px,
      y: py,
      z: 0,
      radius: caster ? caster.radius : 30 * scale,
      squashX: 1.45,
      squashY: 0.68,
      tiltAngle: Math.cos(aimAngle) * 0.42,
      color: palette.primary,
      coreColor: palette.core,
      life: 0,
      maxLife: 0.25 + i * 0.05,
    });

    if (i % 2 === 0) {
      engine.acidPools.push({
        x: px,
        y: py,
        radius: 62 * scale,
        life: 0,
        maxLife: 1.45,
        palette,
        seed: i * 29 + Math.random() * 50,
        casterId: caster?.id,
      });
    }
  }

  // Bubbles & toxic velocity sparks along the dash corridor
  const count = Math.floor(32 * pMult);
  for (let i = 0; i < count; i++) {
    const t = Math.random();
    const px = startX + (destX - startX) * t;
    const py = startY + (destY - startY) * t;
    engine.spawnParticle({
      x: px + (Math.random() - 0.5) * 35,
      y: py + (Math.random() - 0.5) * 25,
      z: 10,
      vx: -Math.cos(aimAngle) * (80 + Math.random() * 190),
      vy: -Math.sin(aimAngle) * (80 + Math.random() * 190) - 35,
      vz: 60,
      size: (6 + Math.random() * 9) * scale,
      color: i % 2 === 0 ? palette.primary : palette.accent,
      coreColor: palette.core,
      alpha: 1,
      life: 0,
      maxLife: 0.42 + Math.random() * 0.35,
      drag: 0.93,
      gravity: -35,
      bounce: 0,
      floorY: 9999,
      type: i % 2 === 0 ? 'acid_bubble' : 'slime_droplet',
      rotation: aimAngle,
      vRot: 0,
      stretch: 1.5,
      seed: i,
    });
  }

  if (caster) {
    caster.x = destX;
    caster.y = destY;
    caster.squashX = 1.38;
    caster.squashY = 0.72;
  }

  engine.applyAreaEffect(destX, destY, 130 * scale, 1620, 'DASH VENENOSO!', palette, {
    casterId: caster?.id,
    poisonDuration: 2.2,
  });
}

/**
 * 26. PULO ESMAGADOR COM DANO DE ATORDOAMENTO EM ÁREA (METEOR CRUSH STUN LEAP)
 */
export function spawnMeteorCrushLeapModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams
) {
  soundEngine.playSkillshotLaunch(0.75);

  const destX = Math.max(80, Math.min(engine.getWidth() - 80, targetX));
  const destY = Math.max(95, Math.min(engine.getHeight() - 125, targetY));

  // Takeoff Shock Ring
  engine.shockRings.push({
    x: startX,
    y: startY,
    radius: 10,
    maxRadius: 110 * scale,
    thickness: 8 * scale,
    life: 0,
    maxLife: 0.28,
    palette,
    perspectiveY: 0.55,
    rotation: 0,
  });

  // Target Ground Danger Indicator Ring before landing
  engine.groundRunes.push({
    x: destX,
    y: destY,
    radius: 20,
    maxRadius: 165 * scale,
    rotation: 0,
    vRot: 3.5,
    life: 0,
    maxLife: 0.55,
    style: 'infernal_target',
    palette,
    perspectiveY: 0.55,
  });

  if (caster) {
    caster.isLeaping = true;
    caster.leapStartX = startX;
    caster.leapStartY = startY;
    caster.leapTargetX = destX;
    caster.leapTargetY = destY;
    caster.leapTimer = 0;
    caster.leapDuration = 0.42;
    caster.leapPalette = palette;
    caster.squashX = 0.68;
    caster.squashY = 1.48;
  } else {
    detonateMeteorCrushLeapLanding(engine, destX, destY, palette, scale, pMult, params);
  }
}

export function detonateMeteorCrushLeapLanding(
  engine: VfxEngine,
  x: number,
  y: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams,
  casterId?: string
) {
  soundEngine.playArcaneImpact(1.45);

  engine.impactFlashes.push({
    x,
    y,
    radius: 185 * scale,
    life: 0,
    maxLife: 0.1,
    palette,
  });

  // Twin Seismic Stun Shockwaves
  engine.shockRings.push({
    x,
    y,
    radius: 14,
    maxRadius: 195 * scale,
    thickness: 15 * scale,
    life: 0,
    maxLife: 0.42,
    palette,
    perspectiveY: 0.55,
    rotation: 0,
  });
  engine.shockRings.push({
    x,
    y,
    radius: 10,
    maxRadius: 135 * scale,
    thickness: 9 * scale,
    life: 0,
    maxLife: 0.35,
    delay: 0.06,
    palette,
    perspectiveY: 0.55,
    rotation: 0,
    isHexagonal: true,
  });

  const count = Math.floor(34 * pMult);
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count;
    const spd = (150 + Math.random() * 340) * scale;
    engine.spawnParticle({
      x,
      y,
      z: 14,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd * 0.65 - 55,
      vz: 160 + Math.random() * 160,
      size: (6 + Math.random() * 9) * scale,
      color: i % 2 === 0 ? palette.primary : palette.accent,
      coreColor: palette.core,
      alpha: 1,
      life: 0,
      maxLife: 0.42 + Math.random() * 0.32,
      drag: 0.93,
      gravity: 560,
      bounce: 0.6,
      floorY: y + 28,
      type: i % 3 === 0 ? 'rock_chunk' : 'needle_spark',
      rotation: ang,
      vRot: 12,
      stretch: 2.6,
      seed: i,
    });
  }

  // Heavy Pancake Flatten + Area Stun on enemies!
  engine.applyAreaEffect(x, y, 185 * scale, 2480, 'ATORDOADO & ESMAGADO!', palette, {
    casterId,
    flattenDuration: 1.4,
    stunDuration: 1.35,
    knockbackForce: 320,
    originX: x,
    originY: y,
  });
  engine.addTrauma(0.82, params.screenShakeIntensity);
  engine.triggerHitstop(params.hitstopMs * 1.15);
}

/**
 * 27. DASH RELÂMPAGO CORTANTE (PHANTOM BLADE BLINK DASH)
 */
export function spawnPhantomBladeDashModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  aimAngle: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams
) {
  soundEngine.playSlash(1.5);

  const dist = Math.min(310 * scale, Math.max(150 * scale, Math.hypot(targetX - startX, targetY - startY)));
  const destX = Math.max(70, Math.min(engine.getWidth() - 70, startX + Math.cos(aimAngle) * dist));
  const destY = Math.max(90, Math.min(engine.getHeight() - 120, startY + Math.sin(aimAngle) * dist));

  // Twin parallel dimensional katana cuts along the blink vector
  const perp = aimAngle + Math.PI / 2;
  [-14 * scale, 14 * scale].forEach((offset, idx) => {
    const ox = Math.cos(perp) * offset;
    const oy = Math.sin(perp) * offset;
    engine.dimensionCuts.push({
      x1: startX + ox,
      y1: startY + oy,
      x2: destX + ox,
      y2: destY + oy,
      width: 11 * scale,
      life: 0,
      maxLife: 0.32,
      delay: idx * 0.03,
      palette,
      shatterOnEnd: false,
    });
  });

  // 6 Holographic Mirage Afterimages
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    engine.afterimages.push({
      x: startX + (destX - startX) * t,
      y: startY + (destY - startY) * t,
      z: 0,
      radius: caster ? caster.radius : 30 * scale,
      squashX: 1.5,
      squashY: 0.62,
      tiltAngle: Math.cos(aimAngle) * 0.48,
      color: palette.primary,
      coreColor: palette.core,
      life: 0,
      maxLife: 0.22 + i * 0.04,
    });
  }

  if (caster) {
    caster.x = destX;
    caster.y = destY;
    caster.squashX = 1.4;
    caster.squashY = 0.7;
  }

  engine.applyAreaEffect(
    (startX + destX) * 0.5,
    (startY + destY) * 0.5,
    155 * scale,
    2150,
    'FLASH CORTE!',
    palette,
    {
      casterId: caster?.id,
      lunarMark: true,
    }
  );
  engine.addTrauma(0.45, params.screenShakeIntensity);
}

/**
 * 28. CURA EM ÁREA (SANCTUARY AURA HEAL - MANDALA + RISING LUMINOUS CROSSES)
 */
export function spawnSanctuaryAuraHealModule(
  engine: VfxEngine,
  casterX: number,
  casterY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  casterId?: string
) {
  soundEngine.playCrystalFreeze();

  engine.groundRunes.push({
    x: casterX,
    y: casterY,
    radius: 25,
    maxRadius: 195 * scale,
    rotation: 0,
    vRot: 1.4,
    life: 0,
    maxLife: 1.35,
    style: 'sanctuary_mandala',
    palette,
    perspectiveY: 0.55,
  });

  // 3 Ascending Harmonic Healing Rings
  for (let r = 0; r < 3; r++) {
    engine.shockRings.push({
      x: casterX,
      y: casterY - r * 28 * scale,
      radius: 20,
      maxRadius: (175 - r * 20) * scale,
      thickness: 8 * scale,
      life: 0,
      maxLife: 0.55,
      delay: r * 0.1,
      palette,
      perspectiveY: 0.55,
      rotation: 0,
    });
  }

  // Rising Luminous Healing Crosses (+)
  const count = Math.floor(32 * pMult);
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.random() * 155 * scale;
    engine.spawnParticle({
      x: casterX + Math.cos(ang) * dist,
      y: casterY + Math.sin(ang) * dist * 0.55,
      z: 10,
      vx: (Math.random() - 0.5) * 25,
      vy: -65 - Math.random() * 95 * scale,
      vz: 50,
      size: (7 + Math.random() * 6) * scale,
      color: i % 2 === 0 ? '#39FF14' : palette.primary,
      coreColor: '#FFFFFF',
      alpha: 1,
      life: 0,
      maxLife: 0.65 + Math.random() * 0.45,
      drag: 0.96,
      gravity: -40,
      bounce: 0,
      floorY: 9999,
      type: 'heal_cross',
      rotation: 0,
      vRot: 0,
      stretch: 1,
      seed: i,
    });
  }

  engine.applySupportHealAndBuff(casterX, casterY, 220 * scale, palette, {
    casterId,
    healAmount: 3200,
    regenDuration: 2.5,
    label: '+CURA EM ÁREA!',
  });
}

/**
 * 29. CURA À DISTÂNCIA (CELESTIAL MEND BEAM - HARMONIC LIFE TETHER TO ALLY)
 */
export function spawnCelestialMendBeamModule(
  engine: VfxEngine,
  casterX: number,
  casterY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  casterId?: string
) {
  soundEngine.playCrystalFreeze();

  // Find most injured ally (or self)
  const targetSlime = engine.findMostInjuredAlly(casterId);
  const tx = targetSlime ? targetSlime.x : casterX;
  const ty = targetSlime ? targetSlime.y : casterY;

  engine.healTethers.push({
    startX: casterX,
    startY: casterY,
    targetId: targetSlime ? targetSlime.id : '',
    targetX: tx,
    targetY: ty,
    life: 0,
    maxLife: 0.85,
    palette,
  });

  const count = Math.floor(24 * pMult);
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count;
    const spd = (60 + Math.random() * 120) * scale;
    engine.spawnParticle({
      x: tx + (Math.random() - 0.5) * 30,
      y: ty + (Math.random() - 0.5) * 30,
      z: 15,
      vx: Math.cos(ang) * spd * 0.5,
      vy: -75 - Math.random() * 85,
      vz: 40,
      size: (7 + Math.random() * 5) * scale,
      color: '#39FF14',
      coreColor: '#FFFFFF',
      alpha: 1,
      life: 0,
      maxLife: 0.55 + Math.random() * 0.35,
      drag: 0.95,
      gravity: -35,
      bounce: 0,
      floorY: 9999,
      type: 'heal_cross',
      rotation: 0,
      vRot: 0,
      stretch: 1,
      seed: i,
    });
  }

  if (targetSlime) {
    engine.healSingleSlime(targetSlime, 3600, '+FEIXE VITAL!', palette);
  }
}

/**
 * 30. ESCUDO DOMO HEXAGONAL (AEGIS GEODESIC BARRIER)
 */
export function spawnAegisDomeShieldModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  x: number,
  y: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number
) {
  soundEngine.playCrystalFreeze();

  engine.shockRings.push({
    x,
    y,
    radius: 14,
    maxRadius: 115 * scale,
    thickness: 10 * scale,
    life: 0,
    maxLife: 0.38,
    palette,
    perspectiveY: 0.85,
    rotation: 0,
    isHexagonal: true,
  });

  const count = Math.floor(22 * pMult);
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count;
    const spd = (90 + Math.random() * 140) * scale;
    engine.spawnParticle({
      x: x + Math.cos(ang) * 35,
      y: y + Math.sin(ang) * 35,
      z: 18,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      vz: 40,
      size: 8 * scale,
      color: palette.primary,
      coreColor: palette.core,
      alpha: 1,
      life: 0,
      maxLife: 0.45,
      drag: 0.92,
      gravity: 0,
      bounce: 0,
      floorY: 9999,
      type: 'hex_glyph',
      rotation: ang,
      vRot: 4,
      stretch: 1,
      seed: i,
    });
  }

  if (caster) {
    caster.shieldHp = caster.maxShieldHp;
    caster.shieldBuffTimer = 4.5;
    caster.shieldStyle = 'aegis_hex_sphere';
    engine.spawnFloatingText(
      caster.x,
      caster.y - caster.radius - 18,
      '+3500 ESFERA AEGIS 3D!',
      'DOMO GEODÉSICO',
      '#38BDF8'
    );
  }
}

/**
 * 31. BUFF FÚRIA & VELOCIDADE (BERSERK OVERDRIVE KI AURA)
 */
export function spawnBerserkOverdriveBuffModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  x: number,
  y: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number
) {
  soundEngine.playBeamChannel();

  engine.shockRings.push({
    x,
    y,
    radius: 12,
    maxRadius: 135 * scale,
    thickness: 11 * scale,
    life: 0,
    maxLife: 0.34,
    palette,
    perspectiveY: 0.55,
    rotation: 0,
  });

  const count = Math.floor(28 * pMult);
  for (let i = 0; i < count; i++) {
    const ox = (Math.random() - 0.5) * 65 * scale;
    engine.spawnParticle({
      x: x + ox,
      y: y + 15,
      z: 10,
      vx: ox * 0.5,
      vy: -160 - Math.random() * 210 * scale,
      vz: 80,
      size: (8 + Math.random() * 10) * scale,
      color: i % 2 === 0 ? palette.primary : '#FFD747',
      coreColor: '#FFFFFF',
      alpha: 1,
      life: 0,
      maxLife: 0.4 + Math.random() * 0.3,
      drag: 0.94,
      gravity: -90,
      bounce: 0,
      floorY: 9999,
      type: 'flame_tongue',
      rotation: 0,
      vRot: 0,
      stretch: 2.2,
      seed: i,
    });
  }

  if (caster) {
    caster.berserkBuffTimer = 4.5;
    // Instantly reduce all skill cooldowns by 50%
    caster.skills.forEach((s) => {
      s.cooldown *= 0.45;
    });
    engine.spawnFloatingText(
      caster.x,
      caster.y - caster.radius - 18,
      'OVERDRIVE!',
      '+VELOCIDADE & DANO',
      '#FF2A4B'
    );
  }
}

/**
 * 32. ARMADURA ESFÉRICA DE GELO REFLETOR (3D FROST SPHERE MIRROR COAT)
 */
export function spawnGlacialMirrorCoatModule(
  engine: VfxEngine,
  caster: SlimeActor | undefined,
  x: number,
  y: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number
) {
  soundEngine.playCrystalFreeze();

  const count = Math.floor(24 * pMult);
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count;
    const spd = (110 + Math.random() * 160) * scale;
    engine.spawnParticle({
      x,
      y,
      z: 16,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd * 0.65,
      vz: 40,
      size: 9 * scale,
      color: palette.primary,
      coreColor: palette.core,
      alpha: 1,
      life: 0,
      maxLife: 0.48,
      drag: 0.92,
      gravity: 0,
      bounce: 0,
      floorY: 9999,
      type: 'mirror_prism',
      rotation: ang,
      vRot: 14,
      stretch: 1,
      seed: i,
    });
  }

  if (caster) {
    caster.mirrorCoatTimer = 4.8;
    caster.shieldBuffTimer = 4.8;
    caster.shieldStyle = 'frost_sphere';
    caster.shieldHp = Math.min(caster.maxShieldHp, caster.shieldHp + 2800);
    engine.spawnFloatingText(
      caster.x,
      caster.y - caster.radius - 18,
      'ESFERA GLACIAL 3D!',
      '+ESCUDO DE GELO',
      '#36E2FF'
    );
  }
}

/**
 * RENDERER: SLIME DASH AFTERIMAGES
 */
export function renderSlimeAfterimagesModule(
  ctx: CanvasRenderingContext2D,
  afterimages: SlimeAfterimage[]
) {
  if (afterimages.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < afterimages.length; i++) {
    const a = afterimages[i];
    const t = a.life / a.maxLife;
    const alpha = (1 - t) * 0.55;

    ctx.save();
    ctx.translate(a.x, a.y - a.z);
    ctx.scale(a.squashX, a.squashY);
    ctx.globalAlpha = alpha;

    const r = a.radius;
    const tipX = Math.sin(a.tiltAngle) * r * 0.45;
    const tipY = -r * 1.25;

    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.bezierCurveTo(r * 0.95, -r * 0.75, r * 1.15, -r * 0.1, r, r * 0.25);
    ctx.quadraticCurveTo(0, r * 0.52, -r, r * 0.25);
    ctx.bezierCurveTo(-r * 1.15, -r * 0.1, -r * 0.95, -r * 0.75, tipX, tipY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = a.coreColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
  ctx.restore();
}

/**
 * RENDERER: RANGED HARMONIC HEALING TETHERS
 */
export function renderHealTethersModule(
  ctx: CanvasRenderingContext2D,
  tethers: HealTether[],
  slimes: SlimeActor[]
) {
  if (tethers.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < tethers.length; i++) {
    const ht = tethers[i];
    const target = slimes.find((s) => s.id === ht.targetId);
    const tx = target ? target.x : ht.targetX;
    const ty = target ? target.y : ht.targetY;

    const t = ht.life / ht.maxLife;
    const alpha = 1 - Math.pow(t, 1.6);
    ctx.globalAlpha = alpha;

    // Double Sinusoidal Healing DNA Stream
    for (let strand = 0; strand < 2; strand++) {
      ctx.strokeStyle = strand === 0 ? '#39FF14' : ht.palette.core;
      ctx.lineWidth = strand === 0 ? 3.5 : 1.6;
      ctx.beginPath();
      const steps = 24;
      const dx = tx - ht.startX;
      const dy = ty - ht.startY;
      const ang = Math.atan2(dy, dx);
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        const wave =
          Math.sin(u * Math.PI * 3 - ht.life * 20 + strand * Math.PI) *
          15 *
          Math.sin(u * Math.PI);
        const px = ht.startX + dx * u - Math.sin(ang) * wave;
        const py = ht.startY + dy * u + Math.cos(ang) * wave - Math.sin(u * Math.PI) * 24;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Travelling Life Orb along the tether
    const orbU = Math.min(1, ht.life / (ht.maxLife * 0.65));
    const ox = ht.startX + (tx - ht.startX) * orbU;
    const oy = ht.startY + (ty - ht.startY) * orbU - Math.sin(orbU * Math.PI) * 24;
    const glow = getGlowSprite('#39FF14', '#FFFFFF');
    ctx.drawImage(glow, ox - 22, oy - 22, 44, 44);
  }
  ctx.restore();
}
