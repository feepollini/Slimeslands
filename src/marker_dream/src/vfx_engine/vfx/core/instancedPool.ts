// ============================================================================
// MODULE: INSTANCED PARTICLE POOL & PIXEL-SHADER STAMP ATLAS
// Zero Garbage Collection (0 GC) + Per-Pixel Normal-Mapped & Noise-Textured Stamps
// ============================================================================

import { Particle } from '../types';
import {
  fbm2D,
  hexToRgb,
  ridgedNoise2D,
  voronoiF1F2,
} from './proceduralTextures';

const MAX_POOLED_PARTICLES = 4096;

export class InstancedParticlePool {
  private pool: Particle[] = [];
  private poolTop = 0;
  public active: Particle[] = [];

  constructor(capacity = MAX_POOLED_PARTICLES) {
    for (let i = 0; i < capacity; i++) {
      this.pool.push(this.createBlankParticle());
    }
    this.poolTop = capacity;
  }

  private createBlankParticle(): Particle {
    return {
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      size: 4,
      color: '#FFFFFF',
      coreColor: '#FFFFFF',
      alpha: 1,
      life: 0,
      maxLife: 0.5,
      drag: 0.94,
      gravity: 0,
      bounce: 0,
      floorY: 9999,
      type: 'needle_spark',
      rotation: 0,
      vRot: 0,
      stretch: 1,
      seed: 0,
      trail: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
    };
  }

  public acquire(
    spec: Omit<Particle, 'trail'> & { trail?: Array<{ x: number; y: number }> }
  ): Particle {
    let p: Particle;
    if (this.poolTop > 0) {
      this.poolTop--;
      p = this.pool[this.poolTop];
    } else if (this.active.length >= MAX_POOLED_PARTICLES) {
      p = this.active[0];
    } else {
      p = this.createBlankParticle();
    }

    p.x = spec.x;
    p.y = spec.y;
    p.z = spec.z;
    p.vx = spec.vx;
    p.vy = spec.vy;
    p.vz = spec.vz;
    p.size = spec.size;
    p.color = spec.color;
    p.coreColor = spec.coreColor;
    p.alpha = spec.alpha;
    p.life = spec.life;
    p.maxLife = spec.maxLife;
    p.drag = spec.drag;
    p.gravity = spec.gravity;
    p.bounce = spec.bounce;
    p.floorY = spec.floorY;
    p.type = spec.type;
    p.rotation = spec.rotation;
    p.vRot = spec.vRot;
    p.stretch = spec.stretch;
    p.seed = spec.seed;

    for (let i = 0; i < p.trail.length; i++) {
      p.trail[i].x = spec.x;
      p.trail[i].y = spec.y;
    }

    this.active.push(p);
    return p;
  }

  public releaseAt(index: number): void {
    const p = this.active[index];
    const lastIdx = this.active.length - 1;
    if (index !== lastIdx) {
      this.active[index] = this.active[lastIdx];
    }
    this.active.pop();

    if (this.poolTop < this.pool.length) {
      this.pool[this.poolTop] = p;
      this.poolTop++;
    }
  }

  public clearAll(): void {
    while (this.active.length > 0) {
      this.releaseAt(this.active.length - 1);
    }
  }
}

// ============================================================================
// PIXEL-SHADER INSTANCED ELEMENT SPRITE CACHE (64x64 ImageData Synthesis)
// Replaces flat vector polygons with normal-mapped & noise-eroded textures
// ============================================================================
const instancedStampCache = new Map<string, HTMLCanvasElement>();

export function getInstancedElementStamp(
  type: Particle['type'],
  color: string,
  coreColor: string
): HTMLCanvasElement | null {
  const key = `pixel_stamp_v2_${type}_${color}_${coreColor}`;
  const cached = instancedStampCache.get(key);
  if (cached) return cached;

  const size = 64;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  const [pr, pg, pb] = hexToRgb(color);
  const [cr, cg, cb] = hexToRgb(coreColor);

  switch (type) {
    case 'rock_chunk': {
      // 3D Normal-Mapped Craggy Basalt Boulder with Subsurface Magma Fissures
      const lx = -0.55,
        ly = -0.55,
        lz = 0.62;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const u = (x - half) / half;
          const v = (y - half) / half;
          const r = Math.sqrt(u * u + v * v);
          const cragSil =
            0.78 +
            (fbm2D(u * 3.5, v * 3.5, 3, 101) - 0.5) * 0.32 +
            (ridgedNoise2D(u * 4.5, v * 4.5, 2, 202) - 0.5) * 0.18;
          if (r > cragSil) continue;

          const sphereZ = Math.sqrt(Math.max(0.05, cragSil * cragSil - r * r));
          const [f1, f2] = voronoiF1F2(u * 3.8, v * 3.8, 303);
          const facetBump = (f2 - f1) * 0.35 + fbm2D(u * 14, v * 14, 3, 404) * 0.25;

          const nx = u + (facetBump - 0.3) * 0.45;
          const ny = v + (facetBump - 0.3) * 0.45;
          const nz = sphereZ;
          const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          const ndotl = Math.max(0.18, (nx * lx + ny * ly + nz * lz) / nLen);
          const spec = Math.pow(Math.max(0, nz / nLen), 14) * 0.45;

          const isMagmaVein = f2 - f1 < 0.065;
          const idx = (y * size + x) * 4;
          if (isMagmaVein) {
            const t = 1.0 - (f2 - f1) / 0.065;
            data[idx] = Math.min(255, (pr + (cr - pr) * t) | 0);
            data[idx + 1] = Math.min(255, (pg + (cg - pg) * t) | 0);
            data[idx + 2] = Math.min(255, (pb + (cb - pb) * t) | 0);
            data[idx + 3] = 255;
          } else {
            const grain = 75 + fbm2D(u * 18, v * 18, 2, 505) * 42;
            data[idx] = Math.min(255, (grain * ndotl + spec * 210 + pr * 0.14) | 0);
            data[idx + 1] = Math.min(255, (grain * 0.94 * ndotl + spec * 200 + pg * 0.14) | 0);
            data[idx + 2] = Math.min(255, (grain * 0.88 * ndotl + spec * 190 + pb * 0.14) | 0);
            data[idx + 3] = 255;
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
      break;
    }

    case 'crystal_shard':
    case 'mirror_prism':
    case 'reality_shard': {
      // Refractive Crystalline Shard with Internal Voronoi Caustics & Specular Ridge
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const u = (x - half) / half;
          const v = (y - half) / half;
          // Elongated diamond/shard distance metric warped by Voronoi facets
          const shardDist = Math.abs(u) * 1.65 + Math.abs(v) * 0.92;
          if (shardDist > 0.92) continue;

          const [f1, f2] = voronoiF1F2(u * 5.0, v * 5.0, 606);
          const caustic = Math.max(0, 1.0 - (f2 - f1) * 5.5);
          const bevelLight = u < 0 ? 1.15 : 0.65;
          const centerRidge = Math.exp(-Math.pow(u / 0.12, 2)) * 0.75;
          const energy = Math.min(
            1.0,
            (1.0 - shardDist * 0.75) * bevelLight * 0.65 + caustic * 0.55 + centerRidge
          );

          const idx = (y * size + x) * 4;
          data[idx] = Math.min(255, (pr + (cr - pr) * energy) | 0);
          data[idx + 1] = Math.min(255, (pg + (cg - pg) * energy) | 0);
          data[idx + 2] = Math.min(255, (pb + (cb - pb) * energy) | 0);
          data[idx + 3] = Math.min(255, ((1.0 - Math.pow(shardDist / 0.92, 3)) * 245) | 0);
        }
      }
      ctx.putImageData(imgData, 0, 0);
      break;
    }

    case 'slime_droplet':
    case 'sweat_drop':
    case 'acid_bubble': {
      // 3D Raycast Translucent Gel Droplet / Bubble with Subsurface Scattering & Specular Glint
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const u = (x - half) / half;
          const v = (y - half) / half;
          // Teardrop / bubble shape
          const r =
            type === 'acid_bubble'
              ? Math.sqrt(u * u + v * v)
              : Math.sqrt(u * u * 1.2 + Math.pow(v - (u > 0 ? u * 0.25 : 0), 2));
          if (r > 0.85) continue;

          const normR = r / 0.85;
          const fresnelRim = Math.pow(normR, 2.2);
          const specGlint = Math.exp(
            -((u + 0.28) * (u + 0.28) + (v + 0.28) * (v + 0.28)) / 0.045
          );
          const cellNoise = fbm2D(u * 8.0, v * 8.0, 2, 707);

          const energy = Math.min(1.0, fresnelRim * 0.65 + specGlint * 0.95 + cellNoise * 0.35);
          const alpha =
            type === 'acid_bubble'
              ? Math.min(1.0, fresnelRim * 0.85 + specGlint + 0.2)
              : 1.0 - Math.pow(normR, 4);

          const idx = (y * size + x) * 4;
          data[idx] = Math.min(255, (pr + (cr - pr) * energy) | 0);
          data[idx + 1] = Math.min(255, (pg + (cg - pg) * energy) | 0);
          data[idx + 2] = Math.min(255, (pb + (cb - pb) * energy) | 0);
          data[idx + 3] = Math.min(255, (alpha * 250) | 0);
        }
      }
      ctx.putImageData(imgData, 0, 0);
      break;
    }

    case 'glass_splinter': {
      // Sharp translucent refractive glass shard with specular white glint
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const u = (x - half) / half;
          const v = (y - half) / half;
          // Elongated triangular shard polygon
          const w = Math.max(0, 0.35 * (1.0 - v));
          if (Math.abs(u) > w || v < -0.85 || v > 0.85) continue;

          const edgeDist = Math.abs(u) / Math.max(0.01, w);
          const isEdge = edgeDist > 0.65;
          const glint = Math.pow(Math.max(0, 1.0 - Math.hypot(u + 0.1, v + 0.2)), 6);

          const idx = (y * size + x) * 4;
          const rVal = isEdge ? 255 : Math.min(255, (pr * 0.4 + cr * 0.6 + glint * 180) | 0);
          const gVal = isEdge ? 255 : Math.min(255, (pg * 0.4 + cg * 0.6 + glint * 180) | 0);
          const bVal = isEdge ? 255 : Math.min(255, (pb * 0.4 + cb * 0.6 + glint * 180) | 0);

          data[idx] = rVal;
          data[idx + 1] = gVal;
          data[idx + 2] = bVal;
          data[idx + 3] = isEdge ? 240 : Math.min(255, (140 + glint * 115) | 0);
        }
      }
      ctx.putImageData(imgData, 0, 0);
      break;
    }

    case 'potion_bubble': {
      // Spherical translucent bubble with thin membrane ring and specular glint
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const u = (x - half) / half;
          const v = (y - half) / half;
          const r = Math.sqrt(u * u + v * v);
          if (r > 0.88) continue;

          const ring = Math.exp(-Math.pow((r - 0.72) / 0.1, 2));
          const glint = Math.exp(-Math.pow((u + 0.3) / 0.16, 2) - Math.pow((v + 0.3) / 0.16, 2));
          const centerGlow = Math.exp(-r * r * 3) * 0.25;
          const alpha = Math.min(1.0, ring * 0.95 + glint * 1.0 + centerGlow);
          if (alpha < 0.05) continue;

          const idx = (y * size + x) * 4;
          data[idx] = Math.min(255, (pr + (cr - pr) * glint) | 0);
          data[idx + 1] = Math.min(255, (pg + (cg - pg) * glint) | 0);
          data[idx + 2] = Math.min(255, (pb + (cb - pb) * glint) | 0);
          data[idx + 3] = Math.min(255, (alpha * 240) | 0);
        }
      }
      ctx.putImageData(imgData, 0, 0);
      break;
    }

    case 'heart_bubble': {
      // 3D Glossy Floating Heart Bubble with Specular Highlight & Soft Rim
      ctx.save();
      ctx.translate(half, half);
      const r = half * 0.68;

      // Subtle outer bubble halo
      const haloGrad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, half * 0.92);
      haloGrad.addColorStop(0, `rgba(${pr}, ${pg}, ${pb}, 0.35)`);
      haloGrad.addColorStop(0.75, `rgba(${pr}, ${pg}, ${pb}, 0.16)`);
      haloGrad.addColorStop(1, `rgba(${pr}, ${pg}, ${pb}, 0)`);
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(0, 0, half * 0.92, 0, Math.PI * 2);
      ctx.fill();

      // Plump 3D Heart Silhouette
      const heartGrad = ctx.createLinearGradient(0, -r, 0, r);
      heartGrad.addColorStop(0, `rgb(${cr}, ${cg}, ${cb})`);
      heartGrad.addColorStop(0.45, `rgb(${pr}, ${pg}, ${pb})`);
      heartGrad.addColorStop(1, `rgb(${(pr * 0.6) | 0}, ${(pg * 0.4) | 0}, ${(pb * 0.5) | 0})`);
      ctx.fillStyle = heartGrad;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.82);
      ctx.bezierCurveTo(-r * 1.32, r * 0.12, -r * 1.18, -r * 0.92, 0, -r * 0.28);
      ctx.bezierCurveTo(r * 1.18, -r * 0.92, r * 1.32, r * 0.12, 0, r * 0.82);
      ctx.closePath();
      ctx.fill();

      // Crisp specular highlight on upper-left lobe
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.38, -r * 0.32, r * 0.22, r * 0.12, -0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }

    case 'heal_cross':
    case 'hex_glyph':
    case 'snowflake':
    case 'kunai_dagger':
    case 'petal_thorn': {
      // Softly Eroded Luminous Energy Sigil / Kunai Plasma Blade
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const u = (x - half) / half;
          const v = (y - half) / half;
          const r = Math.sqrt(u * u + v * v);
          if (r > 0.95) continue;

          let field = 0;
          if (type === 'heal_cross') {
            const armX = Math.exp(-Math.pow(u / 0.22, 2)) * Math.exp(-Math.pow(v / 0.72, 4));
            const armY = Math.exp(-Math.pow(v / 0.22, 2)) * Math.exp(-Math.pow(u / 0.72, 4));
            field = Math.max(armX, armY);
          } else if (type === 'kunai_dagger' || type === 'petal_thorn') {
            // Sleek plasma dagger / thorn with glowing fuller
            const taperW = Math.max(0.02, (1.0 - Math.abs(u)) * 0.28);
            field = Math.exp(-Math.pow(v / taperW, 2)) * (1.0 - Math.pow(r, 1.5));
          } else {
            // 6-pointed crystalline star / hex energy mote
            const ang = Math.atan2(v, u);
            const starWave = 0.55 + 0.32 * Math.cos(ang * 6);
            field = Math.exp(-Math.pow((r - starWave * 0.65) / 0.16, 2)) + Math.exp(-r * r * 9) * 0.8;
          }

          const plasmaNoise = 0.65 + 0.45 * ridgedNoise2D(u * 6.0, v * 6.0, 2, 808);
          const energy = Math.min(1.0, field * plasmaNoise);
          if (energy < 0.08) continue;

          const idx = (y * size + x) * 4;
          data[idx] = Math.min(255, (pr + (cr - pr) * Math.pow(energy, 1.3)) | 0);
          data[idx + 1] = Math.min(255, (pg + (cg - pg) * Math.pow(energy, 1.3)) | 0);
          data[idx + 2] = Math.min(255, (pb + (cb - pb) * Math.pow(energy, 1.3)) | 0);
          data[idx + 3] = Math.min(255, (energy * 255) | 0);
        }
      }
      ctx.putImageData(imgData, 0, 0);
      break;
    }

    default:
      return null;
  }

  instancedStampCache.set(key, canvas);
  return canvas;
}
