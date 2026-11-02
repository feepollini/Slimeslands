// ============================================================================
// MODULE: ENVIRONMENT, ROCK BARRIERS, BOULDERS & AREA FLAME CATACLYSMS
// Plug-and-play AAA procedural rock monoliths & volumetric fire zones
// ============================================================================

import {
  ElementalPalette,
  FlamePillarZone,
  RockMonolith,
  ShaderParams,
} from '../types';
import { fastNoise, getGlowSprite } from '../core/mathLut';
import {
  getProceduralRockMonolithSprite,
  getVoronoiExplosionFlipbook,
} from '../core/proceduralTextures';
import { soundEngine } from '../soundEngine';
import type { VfxEngine } from '../vfxEngine';

/**
 * 33. BARREIRA DE PEDRA (EARTHEN BULWARK - 7 INTERLOCKING 2.5D BASALT MONOLITHS)
 */
export function spawnEarthenBulwarkModule(
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
  soundEngine.playArcaneImpact(1.25);

  // Place the curved 7-monolith defensive rock wall between caster and target
  const wallCenterDist = 115 * scale;
  const wallCenterX = casterX + Math.cos(aimAngle) * wallCenterDist;
  const wallCenterY = casterY + Math.sin(aimAngle) * wallCenterDist;
  const perpAngle = aimAngle + Math.PI / 2;

  const monolithCount = 7;
  for (let i = 0; i < monolithCount; i++) {
    const norm = (i - (monolithCount - 1) / 2) / ((monolithCount - 1) / 2); // -1 to 1
    const spread = norm * 105 * scale;
    const curveOffset = (1 - norm * norm) * 28 * scale;

    const rx =
      wallCenterX +
      Math.cos(perpAngle) * spread +
      Math.cos(aimAngle) * curveOffset;
    const ry =
      wallCenterY +
      Math.sin(perpAngle) * spread +
      Math.sin(aimAngle) * curveOffset;

    const maxH = (98 - Math.abs(norm) * 34 + (i % 2) * 14) * scale;
    const w = (34 - Math.abs(norm) * 6) * scale;

    // Generate glowing magma/amber fault cracks inside each rock monolith
    const cracks: RockMonolith['cracks'] = [];
    let cx = 0;
    let cy = -maxH * 0.15;
    for (let c = 0; c < 4; c++) {
      const nx = cx + (Math.random() - 0.5) * w * 0.55;
      const ny = cy - maxH * 0.2;
      cracks.push({ x1: cx, y1: cy, x2: nx, y2: ny });
      cx = nx;
      cy = ny;
    }

    engine.rockMonoliths.push({
      x: rx,
      y: ry,
      tiltAngle: norm * 0.22,
      height: 0,
      maxHeight: maxH,
      width: w,
      life: 0,
      maxLife: 2.35,
      palette,
      seed: i * 19 + 7,
      cracks,
    });
  }

  engine.shockRings.push({
    x: wallCenterX,
    y: wallCenterY,
    radius: 14,
    maxRadius: 155 * scale,
    thickness: 11 * scale,
    life: 0,
    maxLife: 0.38,
    palette,
    perspectiveY: 0.55,
    rotation: aimAngle,
  });

  // Flying jagged rock chunks & dust puffs
  const chunkCount = Math.floor(32 * pMult);
  for (let i = 0; i < chunkCount; i++) {
    const ang = aimAngle + (Math.random() - 0.5) * 2.2;
    const spd = (110 + Math.random() * 290) * scale;
    engine.spawnParticle({
      x: wallCenterX + (Math.random() - 0.5) * 130 * scale,
      y: wallCenterY + (Math.random() - 0.5) * 60 * scale,
      z: 10,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd * 0.65 - 65,
      vz: 140 + Math.random() * 180,
      size: (6 + Math.random() * 9) * scale,
      color: i % 2 === 0 ? '#78716C' : palette.primary,
      coreColor: palette.core,
      alpha: 1,
      life: 0,
      maxLife: 0.48 + Math.random() * 0.35,
      drag: 0.93,
      gravity: 560,
      bounce: 0.55,
      floorY: wallCenterY + 32,
      type: i % 3 === 0 ? 'smoke_puff' : 'rock_chunk',
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 14,
      stretch: 1.2,
      seed: i,
      trail: [],
    });
  }

  engine.applyAreaEffect(wallCenterX, wallCenterY, 150 * scale, 1840, 'MURALHA TECTÔNICA!', palette, {
    casterId,
    knockbackForce: 380,
    originX: casterX,
    originY: casterY,
    stunDuration: 0.75,
    grantCasterShield: 1800,
  });
  engine.addTrauma(0.68, params.screenShakeIntensity);
}

/**
 * 34. CHAMAS EM ÁREA (HELLFIRE CATACLYSM ZONE - VOLUMETRIC FIRE PILLARS & LAVA FISSURES)
 */
export function spawnHellfireCataclysmZoneModule(
  engine: VfxEngine,
  targetX: number,
  targetY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams,
  casterId?: string
) {
  soundEngine.playArcaneImpact(1.3);
  soundEngine.playBeamChannel();

  engine.flameZones.push({
    x: targetX,
    y: targetY,
    radius: 165 * scale,
    life: 0,
    maxLife: 2.15,
    tickTimer: 0,
    palette,
    seed: Math.random() * 100,
    casterId,
  });

  engine.shockRings.push({
    x: targetX,
    y: targetY,
    radius: 15,
    maxRadius: 195 * scale,
    thickness: 12 * scale,
    life: 0,
    maxLife: 0.42,
    palette,
    perspectiveY: 0.55,
    rotation: 0,
  });

  // Initial eruption of swirling flame tongues & embers
  const count = Math.floor(42 * pMult);
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.random() * 145 * scale;
    const fx = targetX + Math.cos(ang) * dist;
    const fy = targetY + Math.sin(ang) * dist * 0.55;

    engine.spawnParticle({
      x: fx,
      y: fy,
      z: 10,
      vx: (Math.random() - 0.5) * 65,
      vy: -120 - Math.random() * 220 * scale,
      vz: 90,
      size: (14 + Math.random() * 20) * scale,
      color: i % 2 === 0 ? palette.primary : palette.secondary,
      coreColor: palette.core,
      alpha: 1,
      life: 0,
      maxLife: 0.45 + Math.random() * 0.45,
      drag: 0.94,
      gravity: -110,
      bounce: 0,
      floorY: 9999,
      type: i % 3 === 0 ? 'fireball_lobe' : 'flame_tongue',
      rotation: (Math.random() - 0.5) * 0.5,
      vRot: (Math.random() - 0.5) * 4,
      stretch: 2.1,
      seed: i,
      trail: [],
    });
  }

  engine.applyAreaEffect(targetX, targetY, 175 * scale, 2150, 'CATACLISMO ÍGNEO!', palette, {
    casterId,
    burnDuration: 2.2,
  });
  engine.addTrauma(0.62, params.screenShakeIntensity);
}

/**
 * 35. ROCHA COLOSSAL (BOULDER AVALANCHE - HURLS 3D-SHADED BOULDER THAT FLATTENS TARGET)
 */
export function spawnBoulderAvalancheModule(
  engine: VfxEngine,
  casterX: number,
  casterY: number,
  targetX: number,
  targetY: number,
  aimAngle: number,
  palette: ElementalPalette,
  scale: number,
  casterId?: string
) {
  soundEngine.playSkillshotLaunch(0.65);

  engine.projectiles.push({
    id: engine.nextProjectileId(),
    preset: 'boulder_avalanche',
    casterId,
    x: casterX,
    y: casterY,
    startX: casterX,
    startY: casterY,
    controlX: (casterX + targetX) * 0.5,
    controlY: Math.min(casterY, targetY) - 175 * scale,
    targetX,
    targetY,
    vx: 0,
    vy: 0,
    speed: 680,
    angle: aimAngle,
    progress: 0,
    useBezier: true,
    life: 0,
    maxLife: 0.44,
    scale: scale * 1.35,
    palette,
    history: [],
  });
}

export function detonateBoulderAvalancheModule(
  engine: VfxEngine,
  x: number,
  y: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams,
  casterId?: string
) {
  soundEngine.playArcaneImpact(1.4);

  engine.shockRings.push({
    x,
    y,
    radius: 16,
    maxRadius: 190 * scale,
    thickness: 14 * scale,
    life: 0,
    maxLife: 0.4,
    palette,
    perspectiveY: 0.55,
    rotation: 0,
  });

  // 3 Mini jagged rock spikes at the crater rim
  for (let k = -1; k <= 1; k++) {
    engine.rockMonoliths.push({
      x: x + k * 42 * scale,
      y: y + Math.abs(k) * 14 * scale,
      tiltAngle: k * 0.38,
      height: 0,
      maxHeight: (64 - Math.abs(k) * 14) * scale,
      width: 26 * scale,
      life: 0,
      maxLife: 1.15,
      palette,
      seed: k * 31 + 99,
      cracks: [{ x1: 0, y1: -10, x2: k * 6, y2: -42 * scale }],
    });
  }

  // 26 Shattered granite rock chunks bouncing across the floor
  const count = Math.floor(26 * pMult);
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.25;
    const spd = (140 + Math.random() * 380) * scale;
    engine.spawnParticle({
      x,
      y,
      z: 16,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd * 0.65 - 75,
      vz: 180 + Math.random() * 190,
      size: (8 + Math.random() * 12) * scale,
      color: i % 2 === 0 ? '#78716C' : palette.primary,
      coreColor: palette.core,
      alpha: 1,
      life: 0,
      maxLife: 0.52 + Math.random() * 0.35,
      drag: 0.93,
      gravity: 640,
      bounce: 0.62,
      floorY: y + 28 + (Math.random() - 0.5) * 40,
      type: 'rock_chunk',
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 16,
      stretch: 1.2,
      seed: i,
      trail: [],
    });
  }

  // Heavy Pancake Flatten + Stun on hit!
  engine.applyAreaEffect(x, y, 175 * scale, 2680, 'ESMAGADO PELA ROCHA!', palette, {
    casterId,
    flattenDuration: 1.35,
    stunDuration: 1.1,
    knockbackForce: 280,
    originX: x,
    originY: y,
  });
  engine.addTrauma(0.86, params.screenShakeIntensity);
  engine.triggerHitstop(params.hitstopMs * 1.15);
}

/**
 * 36. SUPERNOVA FÊNIX (TWIN FIERY SOLAR WINGS + AOE HEAL & BURN NOVA)
 */
export function spawnPhoenixRebirthNovaModule(
  engine: VfxEngine,
  casterX: number,
  casterY: number,
  palette: ElementalPalette,
  scale: number,
  pMult: number,
  params: ShaderParams,
  casterId?: string
) {
  soundEngine.playBeamChannel();
  soundEngine.playArcaneImpact(1.1);

  // Twin sweeping solar wing arcs on left and right of caster
  const wingAngles = [-Math.PI * 0.85, -Math.PI * 0.15];
  wingAngles.forEach((ang, idx) => {
    engine.slashArcs.push({
      x: casterX,
      y: casterY - 12 * scale,
      radius: 155 * scale,
      thickness: 52 * scale,
      startAngle: ang,
      sweepAngle: idx === 0 ? -2.1 : 2.1,
      life: 0,
      maxLife: 0.45,
      delay: 0,
      palette,
      seed: idx * 47,
      flip: idx === 1,
      style: 'serrated_vorpal',
      eccentricity: 0.72,
      tiltAngle: 0,
    });
  });

  engine.groundRunes.push({
    x: casterX,
    y: casterY,
    radius: 25,
    maxRadius: 195 * scale,
    rotation: 0,
    vRot: 1.8,
    life: 0,
    maxLife: 1.05,
    style: 'sanctuary_mandala',
    palette,
    perspectiveY: 0.55,
  });

  const count = Math.floor(38 * pMult);
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count;
    const spd = (140 + Math.random() * 280) * scale;
    engine.spawnParticle({
      x: casterX,
      y: casterY,
      z: 18,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd * 0.65 - 45,
      vz: 95,
      size: (7 + Math.random() * 8) * scale,
      color: i % 2 === 0 ? palette.primary : '#FFD747',
      coreColor: '#FFFFFF',
      alpha: 1,
      life: 0,
      maxLife: 0.5 + Math.random() * 0.35,
      drag: 0.93,
      gravity: -65,
      bounce: 0,
      floorY: 9999,
      type: i % 3 === 0 ? 'heal_cross' : 'flame_tongue',
      rotation: ang,
      vRot: 6,
      stretch: 1.8,
      seed: i,
      trail: [],
    });
  }

  // Heals caster & allies while burning enemies in range
  engine.applyAreaEffect(casterX, casterY, 210 * scale, 2190, 'RENASCIMENTO FÊNIX!', palette, {
    casterId,
    healAlliesAmount: 2450,
    burnDuration: 1.8,
  });
  engine.addTrauma(0.58, params.screenShakeIntensity);
}

/**
 * RENDERER: 2.5D NORMAL-MAPPED VORONOI BASALT & GRANITE ROCK MONOLITHS
 * Uses pixel-level Lambertian + Blinn-Phong Voronoi facet shaders & glowing magma fault lines
 */
export function renderRockMonolithsModule(
  ctx: CanvasRenderingContext2D,
  monoliths: RockMonolith[]
) {
  if (monoliths.length === 0) return;

  for (let i = 0; i < monoliths.length; i++) {
    const m = monoliths[i];
    if (m.height <= 2) continue;

    const t = m.life / m.maxLife;
    const riseProgress = Math.min(1, m.height / Math.max(1, m.maxHeight));
    const sinkFactor = t > 0.82 ? Math.max(0, 1 - (t - 0.82) / 0.18) : 1;
    const emergeFactor = riseProgress * sinkFactor;
    const fullH = m.maxHeight * 1.38;
    const W = m.width * 0.72;

    ctx.save();
    ctx.translate(m.x, m.y);

    // 1. Ground Tectonic Fissure Shadow & Rubble Rim (where the wall sprouts from the floor)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.beginPath();
    ctx.ellipse(0, 6, W * 1.65, W * 0.56, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Subterranean Clip Plane so the Stone/Elemental Wall literally rises UP out of the ground!
    ctx.save();
    ctx.beginPath();
    ctx.rect(-W * 2.4, -fullH * 1.4, W * 4.8, fullH * 1.4 + 14);
    ctx.clip();

    const slideY = (1 - emergeFactor) * fullH * 0.92;
    ctx.translate(0, slideY);

    // 2a. Procedural Normal-Mapped Under-Core
    ctx.save();
    ctx.rotate(m.tiltAngle * 0.35);
    const rockSprite = getProceduralRockMonolithSprite(
      m.palette.primary,
      m.palette.core,
      m.seed % 3
    );
    ctx.drawImage(rockSprite, -W * 1.25, -fullH * 0.95, W * 2.5, fullH * 1.05);
    ctx.restore();

    // 3. Pulsing Subsurface Elemental Fault Cracks & Specular Rim
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = m.palette.primary;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let c = 0; c < m.cracks.length; c++) {
      const cr = m.cracks[c];
      ctx.moveTo(cr.x1, cr.y1);
      ctx.lineTo(cr.x2, cr.y2);
    }
    ctx.stroke();

    ctx.strokeStyle = m.palette.core;
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.restore(); // End ground emergence clip
    ctx.restore();
  }
}

/**
 * RENDERER: 2.5D VOLUMETRIC AREA FLAME PILLAR ZONES
 * Uses Domain-Warped Voronoi + FBM Cellular Alpha-Erosion Flipbooks
 */
export function renderFlamePillarZonesModule(
  ctx: CanvasRenderingContext2D,
  zones: FlamePillarZone[]
) {
  if (zones.length === 0) return;

  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    const t = z.life / z.maxLife;
    const grow = Math.min(1, z.life / 0.16);
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    const r = z.radius * grow;

    const flipbook = getVoronoiExplosionFlipbook(
      z.palette.primary,
      z.palette.secondary,
      z.palette.core,
      z.palette.dark
    );

    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha = fade;

    // 1. Scorched Cracked Magma Ground Decal with Voronoi Cellular Base
    ctx.save();
    ctx.scale(1, 0.55);
    ctx.fillStyle = z.palette.dark + 'E6';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Stamp rotating cellular magma vortex on the arena floor
    ctx.globalCompositeOperation = 'lighter';
    const baseStage = Math.floor((z.life * 10) % 5) + 1;
    ctx.save();
    ctx.rotate(z.life * 1.4);
    ctx.drawImage(flipbook[baseStage], -r * 1.15, -r * 1.15, r * 2.3, r * 2.3);
    ctx.restore();

    ctx.strokeStyle = z.palette.primary;
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + z.life * 0.8;
      const wobble = fastNoise(z.seed + k + z.life * 4) * 16;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (r * 0.92 + wobble), Math.sin(a) * (r * 0.92 + wobble));
    }
    ctx.stroke();

    ctx.strokeStyle = z.palette.core;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 2. 5 Swirling Vertical 2.5D Flame Pillars Rising with Stepped Voronoi Alpha Erosion
    ctx.globalCompositeOperation = 'lighter';
    const pillarOffsets = [
      { ox: 0, oy: 0, h: 122, w: 38 },
      { ox: -r * 0.52, oy: -r * 0.18, h: 91, w: 27 },
      { ox: r * 0.52, oy: -r * 0.18, h: 95, w: 27 },
      { ox: -r * 0.35, oy: r * 0.26, h: 85, w: 25 },
      { ox: r * 0.35, oy: r * 0.26, h: 85, w: 25 },
    ];

    for (let p = 0; p < pillarOffsets.length; p++) {
      const po = pillarOffsets[p];
      const pillarH = po.h * grow * fade;
      const pillarW = po.w * grow;

      const glow = getGlowSprite(z.palette.primary, z.palette.core);
      ctx.drawImage(
        glow,
        po.ox - pillarW * 1.3,
        po.oy - pillarW * 0.8,
        pillarW * 2.6,
        pillarW * 1.6
      );

      // Stamp 3 vertically rising Voronoi-eroded fire lobes along each pillar column
      for (let layer = 0; layer < 3; layer++) {
        const cycle = (z.life * 3.8 + layer * 0.33 + p * 0.21) % 1;
        const stageIdx = Math.min(7, Math.floor(cycle * 7.99));
        const lobeY = po.oy - cycle * pillarH;
        const lobeX = po.ox + Math.sin(z.life * 14 + p + layer * 2) * 10 * cycle;
        const lobeW = pillarW * (1.35 - cycle * 0.45);
        const lobeH = pillarW * (1.85 - cycle * 0.3);

        ctx.drawImage(
          flipbook[stageIdx],
          lobeX - lobeW * 0.5,
          lobeY - lobeH * 0.7,
          lobeW,
          lobeH
        );
      }
    }

    ctx.restore();
  }
}
