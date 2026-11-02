// ============================================================================
// MODULE: PROCEDURAL PIXEL-SHADER TEXTURES & PHYSICAL ELEMENTAL MATERIALS
// Built on Riot Games / Supergiant Games VFX Style Guide Principles:
// - Strict Value & Saturation Hierarchy (Dark smoke/shadow contrast + crisp cores)
// - ZERO generic pentagrams/stars on ground decals
// - Stepped Voronoi + FBM Alpha Erosion for Fire, Smoke, Acid & Explosions
// - Normal-Mapped 2.5D Basalt & Crystalline Refraction
// ============================================================================

const flipbookCache = new Map<string, HTMLCanvasElement[]>();
const singleTextureCache = new Map<string, HTMLCanvasElement>();

function hash2D(ix: number, iy: number, seed = 1337): number {
  let n = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0;
  n = ((n ^ (n >> 13)) * 1274126177) | 0;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function valueNoise2D(x: number, y: number, seed = 1337): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);

  const a = hash2D(ix, iy, seed);
  const b = hash2D(ix + 1, iy, seed);
  const c = hash2D(ix, iy + 1, seed);
  const d = hash2D(ix + 1, iy + 1, seed);

  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm2D(x: number, y: number, octaves = 4, seed = 1337): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1.0;
  let maxAmp = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * valueNoise2D(x * frequency, y * frequency, seed + i * 101);
    maxAmp += amplitude;
    frequency *= 2.04;
    amplitude *= 0.5;
  }
  return value / maxAmp;
}

export function ridgedNoise2D(x: number, y: number, octaves = 4, seed = 2027): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1.0;
  let weight = 1.0;
  let maxAmp = 0;

  for (let i = 0; i < octaves; i++) {
    let signal = valueNoise2D(x * frequency, y * frequency, seed + i * 173);
    signal = 1.0 - Math.abs(signal * 2.0 - 1.0);
    signal = signal * signal * weight;
    weight = Math.max(0, Math.min(1, signal * 2.0));
    value += signal * amplitude;
    maxAmp += amplitude;
    frequency *= 2.12;
    amplitude *= 0.5;
  }
  return value / maxAmp;
}

export function voronoiF1F2(x: number, y: number, seed = 42): [number, number] {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let f1 = 8.0;
  let f2 = 8.0;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx;
      const cy = iy + dy;
      const px = cx + hash2D(cx, cy, seed);
      const py = cy + hash2D(cx, cy, seed + 999);
      const distSq = (px - x) * (px - x) + (py - y) * (py - y);
      if (distSq < f1) {
        f2 = f1;
        f1 = distSq;
      } else if (distSq < f2) {
        f2 = distSq;
      }
    }
  }
  return [Math.min(1.0, Math.sqrt(f1)), Math.min(1.0, Math.sqrt(f2))];
}

export function voronoi2D(x: number, y: number, seed = 42): number {
  return voronoiF1F2(x, y, seed)[0];
}

export function hexToRgb(hex?: string | null): [number, number, number] {
  if (!hex || typeof hex !== 'string') return [255, 255, 255];
  const clean = hex.replace('#', '').trim();
  if (!clean) return [255, 255, 255];
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.slice(0, 6);
  const num = parseInt(full, 16);
  if (isNaN(num)) return [255, 255, 255];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// ============================================================================
// 1. VOLUMETRIC EXPLOSION & FIRE FLIPBOOK (8 FRAMES)
// Includes Dark Rolling Smoke Rim + Stepped Voronoi Erosion + Hot Core
// ============================================================================
export function getVoronoiExplosionFlipbook(
  primaryHex: string,
  secondaryHex: string,
  coreHex: string,
  darkHex: string
): HTMLCanvasElement[] {
  const key = `voronoi_exp_v4_${primaryHex}_${secondaryHex}_${coreHex}_${darkHex}`;
  const cached = flipbookCache.get(key);
  if (cached) return cached;

  const frames: HTMLCanvasElement[] = [];
  const size = 128;
  const half = size / 2;

  const [cr, cg, cb] = hexToRgb(coreHex);
  const [pr, pg, pb] = hexToRgb(primaryHex);
  const [sr, sg, sb] = hexToRgb(secondaryHex);
  const [dr, dg, db] = hexToRgb(darkHex);

  const totalStages = 8;
  for (let stage = 0; stage < totalStages; stage++) {
    const lifeT = stage / (totalStages - 1);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    // Stepped erosion threshold increases with life so cellular holes punch through the cloud
    const erosionThreshold = lifeT * 0.74;
    const freq = 3.2 + lifeT * 1.6;
    const seed = 500 + stage * 13;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = (x - half) / half;
        const ny = (y - half) / half;
        const dist = Math.sqrt(nx * nx + ny * ny);
        if (dist >= 0.98) continue;

        const warpX = fbm2D(nx * 2.6 + stage * 0.4, ny * 2.6, 3, seed) - 0.5;
        const warpY = fbm2D(nx * 2.6, ny * 2.6 - stage * 0.4, 3, seed + 77) - 0.5;
        const wx = nx + warpX * 0.36;
        const wy = ny + warpY * 0.36;

        const [f1, f2] = voronoiF1F2(wx * freq, wy * freq, 88);
        const cellBillow = 1.0 - f1;
        const cellCrevice = smoothstep(0.0, 0.16, f2 - f1);
        const fbmDetail = fbm2D(wx * freq * 1.8, wy * freq * 1.8, 3, seed + 31);

        const radialFalloff = Math.pow(1.0 - dist * dist, 1.1);
        const noiseField =
          (cellBillow * 0.58 + fbmDetail * 0.42) *
          radialFalloff *
          (0.62 + 0.38 * cellCrevice);

        // Crisp stepped edge (not blurry linear fade!)
        const alpha = smoothstep(erosionThreshold, erosionThreshold + 0.08, noiseField);
        if (alpha <= 0.01) continue;

        const temp = Math.min(
          1.0,
          Math.max(0.0, (noiseField - erosionThreshold) / Math.max(0.08, 0.8 - erosionThreshold))
        );

        let r = 0,
          g = 0,
          b = 0;
        // Outer rim is dark soot/smoke for high visual contrast; inner lobes are hot
        if (temp > 0.72) {
          const u = (temp - 0.72) / 0.28;
          r = pr + (cr - pr) * u;
          g = pg + (cg - pg) * u;
          b = pb + (cb - pb) * u;
        } else if (temp > 0.42) {
          const u = (temp - 0.42) / 0.3;
          r = sr + (pr - sr) * u;
          g = sg + (pg - sg) * u;
          b = sb + (pb - sb) * u;
        } else if (temp > 0.18) {
          const u = (temp - 0.18) / 0.24;
          r = dr + (sr - dr) * u;
          g = dg + (sg - dg) * u;
          b = db + (sb - db) * u;
        } else {
          // Dark charred smoke border
          r = dr * 0.55;
          g = dg * 0.55;
          b = db * 0.55;
        }

        const idx = (y * size + x) * 4;
        data[idx] = Math.min(255, r | 0);
        data[idx + 1] = Math.min(255, g | 0);
        data[idx + 2] = Math.min(255, b | 0);
        data[idx + 3] = Math.min(255, (alpha * 255) | 0);
      }
    }

    ctx.putImageData(imgData, 0, 0);
    frames.push(canvas);
  }

  flipbookCache.set(key, frames);
  return frames;
}

// ============================================================================
// 2. POLAR-UV ANISOTROPIC SLASH FLIPBOOK (7 FRAMES)
// ============================================================================
export function getErodedSlashFlipbook(
  primaryHex: string,
  secondaryHex: string,
  coreHex: string,
  darkHex: string
): HTMLCanvasElement[] {
  const key = `slash_flip_v4_${primaryHex}_${secondaryHex}_${coreHex}_${darkHex}`;
  const cached = flipbookCache.get(key);
  if (cached) return cached;

  const frames: HTMLCanvasElement[] = [];
  const size = 192;
  const half = size / 2;

  const [cr, cg, cb] = hexToRgb(coreHex);
  const [pr, pg, pb] = hexToRgb(primaryHex);
  const [sr, sg, sb] = hexToRgb(secondaryHex);
  const [dr, dg, db] = hexToRgb(darkHex);

  const totalStages = 7;
  for (let stage = 0; stage < totalStages; stage++) {
    const lifeT = stage / (totalStages - 1);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    const headAngle = Math.min(1.0, Math.pow((lifeT + 0.25) / 0.55, 0.5));
    const tailErosion = Math.max(0, (lifeT - 0.08) / 0.92);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - half) / half;
        const dy = (y - half) / half;
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r < 0.3 || r > 0.96) continue;

        const rawAng = Math.atan2(dy, dx);
        const normAng = (rawAng + Math.PI * 0.75) / (Math.PI * 1.5);
        if (normAng < 0 || normAng > headAngle) continue;

        const uAlong = normAng / Math.max(0.05, headAngle);
        const arcThickness = Math.sin(uAlong * Math.PI) * (0.24 + uAlong * 0.14);
        const centerR = 0.68;
        const distFromSpine = Math.abs(r - centerR);
        if (distFromSpine > arcThickness) continue;

        const streakNoise = fbm2D(normAng * 4.5 - stage * 1.1, r * 26.0, 3, 303);
        const plasmaFilament = ridgedNoise2D(normAng * 6.0 - stage * 0.9, r * 20.0, 3, 707);

        const radialProfile = Math.pow(1.0 - distFromSpine / arcThickness, 0.8);
        const energy =
          radialProfile *
          (0.45 + uAlong * 0.65) *
          (streakNoise * 0.55 + plasmaFilament * 0.55);

        const threshold = tailErosion * (1.15 - uAlong * 0.72) * 0.75;
        const alpha = smoothstep(threshold, threshold + 0.08, energy);
        if (alpha <= 0.01) continue;

        const heat = Math.min(
          1.0,
          (energy - threshold) / Math.max(0.08, 0.72 - threshold) +
            (r > centerR + arcThickness * 0.35 ? 0.35 : 0)
        );

        let red = 0,
          green = 0,
          blue = 0;
        if (heat > 0.76) {
          const u = Math.min(1, (heat - 0.76) / 0.24);
          red = pr + (cr - pr) * u;
          green = pg + (cg - pg) * u;
          blue = pb + (cb - pb) * u;
        } else if (heat > 0.38) {
          const u = (heat - 0.38) / 0.38;
          red = sr + (pr - sr) * u;
          green = sg + (pg - sg) * u;
          blue = sb + (pb - sb) * u;
        } else {
          const u = Math.max(0, heat / 0.38);
          red = dr + (sr - dr) * u;
          green = dg + (sg - dg) * u;
          blue = db + (sb - db) * u;
        }

        const idx = (y * size + x) * 4;
        data[idx] = Math.min(255, red | 0);
        data[idx + 1] = Math.min(255, green | 0);
        data[idx + 2] = Math.min(255, blue | 0);
        data[idx + 3] = Math.min(255, (alpha * 255) | 0);
      }
    }

    ctx.putImageData(imgData, 0, 0);
    frames.push(canvas);
  }

  flipbookCache.set(key, frames);
  return frames;
}

// ============================================================================
// 3. NORMAL-MAPPED 2.5D BASALT ROCK MONOLITH SPRITE
// ============================================================================
export function getProceduralRockMonolithSprite(
  veinHex: string,
  coreHex: string,
  variant = 0
): HTMLCanvasElement {
  const key = `rock_monolith_v3_${veinHex}_${coreHex}_${variant}`;
  const cached = singleTextureCache.get(key);
  if (cached) return cached;

  const w = 112;
  const h = 160;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  const [vr, vg, vb] = hexToRgb(veinHex);
  const [cr, cg, cb] = hexToRgb(coreHex);
  const seed = 700 + variant * 137;

  const lx = -0.58;
  const ly = -0.52;
  const lz = 0.62;

  const sampleRockHeight = (u: number, v: number): number => {
    const [f1, f2] = voronoiF1F2(u * 3.8 + variant, v * 4.5, seed);
    const facet = smoothstep(0.0, 0.25, f2 - f1);
    const crags = ridgedNoise2D(u * 7.5, v * 7.5, 4, seed + 55);
    const micro = fbm2D(u * 18.0, v * 18.0, 3, seed + 120);
    const spine = 1.0 - Math.abs(u) * 1.15;
    return spine * 0.5 + facet * 0.28 + crags * 0.15 + micro * 0.07;
  };

  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = (x - w * 0.5) / (w * 0.5);

      const taper = v < 0.24 ? v / 0.24 : 1.0 - (v - 0.24) * 0.14;
      const edgeNoise =
        (fbm2D(u * 5.0, v * 7.0, 3, seed) - 0.5) * 0.34 +
        (ridgedNoise2D(u * 4.0, v * 5.0, 2, seed + 19) - 0.5) * 0.18;
      const maxU = taper * 0.84 + edgeNoise;

      if (Math.abs(u) > maxU || v < 0.03 || v > 0.97) continue;

      const eps = 0.015;
      const hC = sampleRockHeight(u, v);
      const hR = sampleRockHeight(u + eps, v);
      const hD = sampleRockHeight(u, v + eps);

      let nx = -(hR - hC) * 12.0;
      let ny = -(hD - hC) * 12.0;
      let nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      const ndotl = Math.max(0.14, nx * lx + ny * ly + nz * lz);
      const spec = Math.pow(Math.max(0, nz * 0.72 + nx * -0.45 + ny * -0.45), 18) * 0.65;

      const [vf1, vf2] = voronoiF1F2(u * 4.2, v * 5.2, seed + 33);
      const faultDist = vf2 - vf1;
      const isMagmaCrack = faultDist < 0.055 && v > 0.16 && v < 0.9;

      let r = 0,
        g = 0,
        b = 0;
      if (isMagmaCrack) {
        const glowT = 1.0 - faultDist / 0.055;
        r = vr + (cr - vr) * glowT;
        g = vg + (cg - vg) * glowT;
        b = vb + (cb - vb) * glowT;
      } else {
        const grain = fbm2D(u * 22.0, v * 22.0, 3, seed + 88);
        const baseR = 88 + grain * 32;
        const baseG = 82 + grain * 30;
        const baseB = 78 + grain * 28;
        r = baseR * ndotl + spec * 230;
        g = baseG * ndotl + spec * 220;
        b = baseB * ndotl + spec * 210;

        if (faultDist < 0.14) {
          const proximity = 1.0 - (faultDist - 0.055) / 0.085;
          r += vr * proximity * 0.45;
          g += vg * proximity * 0.45;
          b += vb * proximity * 0.45;
        }
      }

      const rimFade = smoothstep(maxU, maxU - 0.06, Math.abs(u));
      const idx = (y * w + x) * 4;
      data[idx] = Math.min(255, r | 0);
      data[idx + 1] = Math.min(255, g | 0);
      data[idx + 2] = Math.min(255, b | 0);
      data[idx + 3] = Math.min(255, (rimFade * 255) | 0);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  singleTextureCache.set(key, canvas);
  return canvas;
}

// ============================================================================
// 4. REFRACTIVE 2.5D QUARTZ / ICE CRYSTAL PRISM SPRITE
// ============================================================================
export function getProceduralCrystalSprite(
  primaryHex: string,
  secondaryHex: string,
  coreHex: string,
  variant = 0
): HTMLCanvasElement {
  const key = `crystal_prism_v2_${primaryHex}_${secondaryHex}_${coreHex}_${variant}`;
  const cached = singleTextureCache.get(key);
  if (cached) return cached;

  const w = 96;
  const h = 160;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  const [pr, pg, pb] = hexToRgb(primaryHex);
  const [sr, sg, sb] = hexToRgb(secondaryHex);
  const [cr, cg, cb] = hexToRgb(coreHex);
  const seed = 911 + variant * 73;

  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = (x - w * 0.5) / (w * 0.5);

      const maxU = v < 0.32 ? (v / 0.32) * 0.85 : 0.85 - (v - 0.32) * 0.28;
      if (Math.abs(u) > maxU || v < 0.02 || v > 0.98) continue;

      const [f1, f2] = voronoiF1F2(u * 4.5 + variant * 0.7, v * 6.0, seed);
      const caustic = smoothstep(0.0, 0.14, f2 - f1);
      const internalFbm = fbm2D(u * 10.0, v * 14.0, 3, seed + 17);
      const ridge = ridgedNoise2D(u * 6.0, v * 8.0, 3, seed + 43);

      const normU = u / Math.max(0.05, maxU);
      let faceLight = 0.55;
      if (normU < -0.22) {
        faceLight = 0.92;
      } else if (normU < 0.22) {
        faceLight = 1.15;
      } else {
        faceLight = 0.42;
      }

      const isFacetSeam =
        Math.abs(normU + 0.22) < 0.045 ||
        Math.abs(normU - 0.22) < 0.045 ||
        Math.abs(v - 0.32) < 0.022;

      const energy = Math.min(
        1.0,
        faceLight * (0.55 + internalFbm * 0.35 + ridge * 0.35) +
          (1.0 - caustic) * 0.45 +
          (isFacetSeam ? 0.65 : 0) +
          (1.0 - v) * 0.25
      );

      let r = 0,
        g = 0,
        b = 0;
      if (energy > 0.8) {
        const t = Math.min(1, (energy - 0.8) / 0.2);
        r = pr + (cr - pr) * t;
        g = pg + (cg - pg) * t;
        b = pb + (cb - pb) * t;
      } else if (energy > 0.45) {
        const t = (energy - 0.45) / 0.35;
        r = sr + (pr - sr) * t;
        g = sg + (pg - sg) * t;
        blue: b = sb + (pb - sb) * t;
      } else {
        const t = energy / 0.45;
        r = sr * 0.28 + sr * 0.72 * t;
        g = sg * 0.28 + sg * 0.72 * t;
        b = sb * 0.28 + sb * 0.72 * t;
      }

      const edgeAlpha = smoothstep(maxU, maxU - 0.04, Math.abs(u));
      const idx = (y * w + x) * 4;
      data[idx] = Math.min(255, r | 0);
      data[idx + 1] = Math.min(255, g | 0);
      data[idx + 2] = Math.min(255, b | 0);
      data[idx + 3] = Math.min(255, (edgeAlpha * 248) | 0);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  singleTextureCache.set(key, canvas);
  return canvas;
}

// ============================================================================
// 5. RADIAL SHOCKWAVE & REFRACTIVE MACH-CONE RING TEXTURE
// ============================================================================
export function getShockwaveTextureSprite(
  primaryHex?: string,
  secondaryHex?: string,
  coreHex?: string,
  isHexagonal = false
): HTMLCanvasElement {
  const p = primaryHex || '#00F0FF';
  const s = secondaryHex || '#1A52B8';
  const c = coreHex || '#FFFFFF';
  const key = `shockwave_tex_v2_${p}_${s}_${c}_${isHexagonal}`;
  const cached = singleTextureCache.get(key);
  if (cached) return cached;

  const size = 192;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const [pr, pg, pb] = hexToRgb(p);
  const [sr, sg, sb] = hexToRgb(s);
  const [cr, cg, cb] = hexToRgb(c);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - half) / half;
      const dy = (y - half) / half;
      const rawR = Math.sqrt(dx * dx + dy * dy);
      if (rawR > 0.99 || rawR < 0.35) continue;

      const ang = Math.atan2(dy, dx);
      let r = rawR;
      if (isHexagonal) {
        const hexSector = Math.PI / 3;
        const localA = ((ang % hexSector) + hexSector) % hexSector - hexSector * 0.5;
        r = rawR * Math.cos(localA) * 1.08;
      }

      const radialFilaments = ridgedNoise2D(ang * 9.5, r * 6.0, 3, 515);
      const turbulentWave = fbm2D(dx * 5.5, dy * 5.5, 3, 616);
      const warpedR = r + (radialFilaments - 0.5) * 0.065 + (turbulentWave - 0.5) * 0.04;

      // Sharp outer compression wave + subtle inner wake (no muddy center!)
      const mainRing = Math.exp(-Math.pow((warpedR - 0.84) / 0.065, 2));
      const innerWake = Math.exp(-Math.pow((warpedR - 0.68) / 0.08, 2)) * 0.42;
      const energy = (mainRing + innerWake) * (0.58 + radialFilaments * 0.62);

      const alpha = smoothstep(0.1, 0.28, energy);
      if (alpha <= 0.01) continue;

      let red = 0,
        green = 0,
        blue = 0;
      if (energy > 0.78) {
        const t = Math.min(1, (energy - 0.78) / 0.22);
        red = pr + (cr - pr) * t;
        green = pg + (cg - pg) * t;
        blue = pb + (cb - pb) * t;
      } else if (energy > 0.4) {
        const t = (energy - 0.4) / 0.38;
        red = sr + (pr - sr) * t;
        green = sg + (pg - sg) * t;
        blue = sb + (pb - sb) * t;
      } else {
        red = sr;
        green = sg;
        blue = sb;
      }

      const idx = (y * size + x) * 4;
      data[idx] = Math.min(255, red | 0);
      data[idx + 1] = Math.min(255, green | 0);
      data[idx + 2] = Math.min(255, blue | 0);
      data[idx + 3] = Math.min(255, (alpha * 255) | 0);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  singleTextureCache.set(key, canvas);
  return canvas;
}

// ============================================================================
// 6. PHYSICAL TERRAIN GROUND DECALS (NO PENTAGRAMS / NO MAGIC STARS!)
// Each terrain interaction has a distinct physical material:
// - 'permafrost_ice': Shattered frozen ground rime with Voronoi ice plates
// - 'tectonic_crater': Scorched earth impact crater with radial fault cracks
// - 'water_ripples': Soothing concentric harmonic fluid waves (for heals)
// - 'acid_caustic': Bubbling organic venom pool with cellular foam
// - 'black_hole': Relativistic gravitational lensing accretion disk
// ============================================================================
export type TerrainDecalMaterial =
  | 'permafrost_ice'
  | 'tectonic_crater'
  | 'water_ripples'
  | 'acid_caustic'
  | 'black_hole';

export function getGroundDecalTextureSprite(
  style: TerrainDecalMaterial,
  primaryHex: string,
  secondaryHex: string,
  coreHex: string,
  darkHex: string
): HTMLCanvasElement {
  const key = `terrain_decal_v3_${style}_${primaryHex}_${secondaryHex}_${coreHex}_${darkHex}`;
  const cached = singleTextureCache.get(key);
  if (cached) return cached;

  const size = 192;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const [pr, pg, pb] = hexToRgb(primaryHex);
  const [sr, sg, sb] = hexToRgb(secondaryHex);
  const [cr, cg, cb] = hexToRgb(coreHex);
  const [dr, dg, db] = hexToRgb(darkHex);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - half) / half;
      const dy = (y - half) / half;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r >= 0.99) continue;

      const ang = Math.atan2(dy, dx);
      const idx = (y * size + x) * 4;

      if (style === 'acid_caustic') {
        const wx = dx + (fbm2D(dx * 4.0, dy * 4.0, 3, 111) - 0.5) * 0.28;
        const wy = dy + (fbm2D(dx * 4.0, dy * 4.0, 3, 222) - 0.5) * 0.28;
        const warpr = Math.sqrt(wx * wx + wy * wy);
        if (warpr > 0.92) continue;

        const [f1, f2] = voronoiF1F2(wx * 5.5, wy * 5.5, 333);
        const bubbleRim = smoothstep(0.08, 0.0, Math.abs(f1 - 0.28));
        const causticWeb = smoothstep(0.12, 0.0, f2 - f1);
        const slimeTurb = fbm2D(wx * 8.0, wy * 8.0, 4, 444);

        const alpha = smoothstep(0.92, 0.72, warpr);
        const intensity = Math.min(
          1.0,
          slimeTurb * 0.45 + causticWeb * 0.55 + bubbleRim * 0.75
        );

        let red = dr + (sr - dr) * intensity;
        let green = dg + (sg - dg) * intensity;
        let blue = db + (sb - db) * intensity;

        if (intensity > 0.68) {
          const u = (intensity - 0.68) / 0.32;
          red = pr + (cr - pr) * u;
          green = pg + (cg - pg) * u;
          blue = pb + (cb - pb) * u;
        }

        data[idx] = Math.min(255, red | 0);
        data[idx + 1] = Math.min(255, green | 0);
        data[idx + 2] = Math.min(255, blue | 0);
        data[idx + 3] = Math.min(255, (alpha * 235) | 0);
      } else if (style === 'black_hole') {
        const spiralAng = ang + 3.8 * Math.log(Math.max(0.08, r));
        const swirlNoise = ridgedNoise2D(
          Math.cos(spiralAng) * 3.5 + r * 4.0,
          Math.sin(spiralAng) * 3.5 + r * 4.0,
          4,
          777
        );
        const nebulaFbm = fbm2D(dx * 5.0, dy * 5.0, 4, 888);

        const isHorizon = r < 0.28;
        const photonRing = Math.exp(-Math.pow((r - 0.29) / 0.035, 2)) * 1.35;
        const accretionDisk =
          r >= 0.26
            ? Math.pow(1.0 - r, 1.2) * (swirlNoise * 0.75 + nebulaFbm * 0.45)
            : 0;

        if (isHorizon) {
          data[idx] = Math.min(255, (dr * 0.2 + cr * photonRing) | 0);
          data[idx + 1] = Math.min(255, (dg * 0.2 + cg * photonRing) | 0);
          data[idx + 2] = Math.min(255, (db * 0.2 + cb * photonRing) | 0);
          data[idx + 3] = 250;
        } else {
          const energy = Math.min(1.0, accretionDisk + photonRing);
          const alpha = smoothstep(0.06, 0.22, energy) * smoothstep(0.98, 0.75, r);
          if (alpha <= 0.01) continue;

          let red = sr + (pr - sr) * energy;
          let green = sg + (pg - sg) * energy;
          let blue = sb + (pb - sb) * energy;
          if (energy > 0.75) {
            const u = (energy - 0.75) / 0.25;
            red = pr + (cr - pr) * u;
            green = pg + (cg - pg) * u;
            blue = pb + (cb - pb) * u;
          }

          data[idx] = Math.min(255, red | 0);
          data[idx + 1] = Math.min(255, green | 0);
          data[idx + 2] = Math.min(255, blue | 0);
          data[idx + 3] = Math.min(255, (alpha * 255) | 0);
        }
      } else if (style === 'permafrost_ice') {
        // Shattered frozen ground rime: irregular jagged perimeter + Voronoi ice plates (NO STARS!)
        const edgeJag = (fbm2D(ang * 4.5, r * 4.0, 3, 601) - 0.5) * 0.16;
        const iceR = r + edgeJag;
        if (iceR > 0.9) continue;

        const [f1, f2] = voronoiF1F2(dx * 5.2, dy * 5.2, 602);
        const iceCrack = smoothstep(0.07, 0.0, f2 - f1);
        const frostRime = fbm2D(dx * 12.0, dy * 12.0, 3, 603);
        const outerRim = Math.exp(-Math.pow((iceR - 0.84) / 0.045, 2));

        // Low-value interior so it never blinds the combat read, crisp frost rim & cracks
        const intensity = Math.min(
          1.0,
          frostRime * 0.28 + iceCrack * 0.72 + outerRim * 0.88
        );
        const alpha = smoothstep(0.9, 0.82, iceR) * (0.28 + intensity * 0.65);

        const red = dr + (pr - dr) * intensity + (cr - pr) * iceCrack * 0.5;
        const green = dg + (pg - dg) * intensity + (cg - pg) * iceCrack * 0.5;
        const blue = db + (pb - db) * intensity + (cb - pb) * iceCrack * 0.5;

        data[idx] = Math.min(255, red | 0);
        data[idx + 1] = Math.min(255, green | 0);
        data[idx + 2] = Math.min(255, blue | 0);
        data[idx + 3] = Math.min(255, (alpha * 220) | 0);
      } else if (style === 'tectonic_crater') {
        // Scorched earth impact crater with radial fault cracks & rocky rim (NO STARS!)
        const craterNoise = (ridgedNoise2D(dx * 5.0, dy * 5.0, 3, 701) - 0.5) * 0.14;
        const crR = r + craterNoise;
        if (crR > 0.92) continue;

        const [f1, f2] = voronoiF1F2(dx * 4.2, dy * 4.2, 702);
        const faultLine = smoothstep(0.06, 0.0, f2 - f1) * (1.0 - crR * 0.8);
        const rimRidge = Math.exp(-Math.pow((crR - 0.82) / 0.06, 2));
        const scorchDarkness = smoothstep(0.88, 0.2, crR);

        const alpha = smoothstep(0.92, 0.8, crR) * (0.45 + faultLine * 0.5 + rimRidge * 0.4);
        const glow = Math.min(1.0, faultLine * 0.95 + rimRidge * 0.65);

        const red = dr * scorchDarkness * 0.5 + pr * glow + (cr - pr) * faultLine * 0.6;
        const green = dg * scorchDarkness * 0.5 + pg * glow + (cg - pg) * faultLine * 0.6;
        const blue = db * scorchDarkness * 0.5 + pb * glow + (cb - pb) * faultLine * 0.6;

        data[idx] = Math.min(255, red | 0);
        data[idx + 1] = Math.min(255, green | 0);
        data[idx + 2] = Math.min(255, blue | 0);
        data[idx + 3] = Math.min(255, (alpha * 230) | 0);
      } else {
        // 'water_ripples': Soothing concentric fluid rings (NO STARS!)
        const wave1 = Math.exp(-Math.pow((r - 0.86) / 0.035, 2));
        const wave2 = Math.exp(-Math.pow((r - 0.62) / 0.04, 2)) * 0.72;
        const wave3 = Math.exp(-Math.pow((r - 0.36) / 0.045, 2)) * 0.48;
        const causticShimmer = fbm2D(dx * 6.0, dy * 6.0, 3, 801) * 0.22 * (1.0 - r);

        const energy = Math.min(1.0, wave1 + wave2 + wave3 + causticShimmer);
        const alpha = smoothstep(0.05, 0.22, energy) * smoothstep(0.96, 0.86, r);
        if (alpha <= 0.01) continue;

        const red = sr + (pr - sr) * energy + (cr - pr) * wave1 * 0.5;
        const green = sg + (pg - sg) * energy + (cg - pg) * wave1 * 0.5;
        const blue = sb + (pb - sb) * energy + (cb - pb) * wave1 * 0.5;

        data[idx] = Math.min(255, red | 0);
        data[idx + 1] = Math.min(255, green | 0);
        data[idx + 2] = Math.min(255, blue | 0);
        data[idx + 3] = Math.min(255, (alpha * 215) | 0);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  singleTextureCache.set(key, canvas);
  return canvas;
}

// ============================================================================
// 7. TURBULENT PLASMA BEAM & LIGHTNING FILAMENT TEXTURE
// ============================================================================
export function getBeamPlasmaTextureSprite(
  primaryHex: string,
  secondaryHex: string,
  coreHex: string
): HTMLCanvasElement {
  const key = `beam_plasma_v2_${primaryHex}_${secondaryHex}_${coreHex}`;
  const cached = singleTextureCache.get(key);
  if (cached) return cached;

  const w = 256;
  const h = 96;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  const [pr, pg, pb] = hexToRgb(primaryHex);
  const [sr, sg, sb] = hexToRgb(secondaryHex);
  const [cr, cg, cb] = hexToRgb(coreHex);

  for (let y = 0; y < h; y++) {
    const v = (y - h * 0.5) / (h * 0.5);
    for (let x = 0; x < w; x++) {
      const u = x / w;

      const warpV = v + (fbm2D(u * 10.0, v * 3.0, 3, 123) - 0.5) * 0.32;
      const coreSpine = Math.exp(-Math.pow(warpV / 0.2, 2));

      const helix1 = Math.exp(
        -Math.pow((v - Math.sin(u * Math.PI * 6) * 0.52) / 0.16, 2)
      );
      const helix2 = Math.exp(
        -Math.pow((v + Math.sin(u * Math.PI * 6) * 0.52) / 0.16, 2)
      );

      const filament = ridgedNoise2D(u * 14.0, v * 5.0, 3, 456);
      const envelope = 1.0 - Math.pow(Math.abs(v), 1.4);

      const energy = Math.min(
        1.0,
        (coreSpine * 0.98 + (helix1 + helix2) * 0.42 + filament * 0.42) * envelope
      );
      const alpha = smoothstep(0.08, 0.25, energy);
      if (alpha <= 0.01) continue;

      let red = sr,
        green = sg,
        blue = sb;
      if (energy > 0.72) {
        const t = (energy - 0.72) / 0.28;
        red = pr + (cr - pr) * t;
        green = pg + (cg - pg) * t;
        blue = pb + (cb - pb) * t;
      } else if (energy > 0.35) {
        const t = (energy - 0.35) / 0.37;
        red = sr + (pr - sr) * t;
        green = sg + (pg - sg) * t;
        blue = sb + (pb - sb) * t;
      }

      const idx = (y * w + x) * 4;
      data[idx] = Math.min(255, red | 0);
      data[idx + 1] = Math.min(255, green | 0);
      data[idx + 2] = Math.min(255, blue | 0);
      data[idx + 3] = Math.min(255, (alpha * 255) | 0);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  singleTextureCache.set(key, canvas);
  return canvas;
}

// ============================================================================
// 8. VOLUMETRIC TORNADO VORTEX FUNNEL TEXTURE
// ============================================================================
export function getTornadoVortexTextureSprite(
  primaryHex: string,
  secondaryHex: string,
  coreHex: string,
  phase = 0
): HTMLCanvasElement {
  const key = `tornado_vortex_v2_${primaryHex}_${secondaryHex}_${coreHex}_${phase}`;
  const cached = singleTextureCache.get(key);
  if (cached) return cached;

  const w = 144;
  const h = 192;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  const [pr, pg, pb] = hexToRgb(primaryHex);
  const [sr, sg, sb] = hexToRgb(secondaryHex);
  const [cr, cg, cb] = hexToRgb(coreHex);

  for (let y = 0; y < h; y++) {
    const v = 1.0 - y / h;
    const funnelWidth = 0.22 + Math.pow(v, 0.85) * 0.72;
    const sway = Math.sin(v * Math.PI * 2.5 + phase * 2.1) * 0.12 * v;

    for (let x = 0; x < w; x++) {
      const u = (x - w * 0.5) / (w * 0.5) - sway;
      const normX = u / funnelWidth;
      if (Math.abs(normX) >= 1.0) continue;

      const cylAngle = Math.asin(Math.max(-1, Math.min(1, normX)));
      const helicalU = cylAngle / Math.PI + v * 4.5 - phase * 0.85;

      const windBands = ridgedNoise2D(helicalU * 3.5, v * 8.0, 3, 808);
      const turbulence = fbm2D(helicalU * 6.0, v * 10.0, 3, 909);
      const edgeRim = Math.pow(1.0 - normX * normX, 0.45);
      const verticalFade = smoothstep(0.0, 0.12, v) * smoothstep(1.0, 0.84, v);

      const density =
        (windBands * 0.65 + turbulence * 0.45) * edgeRim * verticalFade;
      const alpha = smoothstep(0.18, 0.42, density);
      if (alpha <= 0.01) continue;

      let red = sr + (pr - sr) * density;
      let green = sg + (pg - sg) * density;
      let blue = sb + (pb - sb) * density;
      if (density > 0.72) {
        const t = (density - 0.72) / 0.28;
        red = pr + (cr - pr) * t;
        green = pg + (cg - pg) * t;
        blue = pb + (cb - pb) * t;
      }

      const idx = (y * w + x) * 4;
      data[idx] = Math.min(255, red | 0);
      data[idx + 1] = Math.min(255, green | 0);
      data[idx + 2] = Math.min(255, blue | 0);
      data[idx + 3] = Math.min(255, (alpha * 255) | 0);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  singleTextureCache.set(key, canvas);
  return canvas;
}

// ============================================================================
// 9. CELESTIAL GREAT-SWORD & ENERGY PROJECTILE WARHEAD SPRITE
// ============================================================================
export function getCelestialSwordTextureSprite(
  primaryHex: string,
  secondaryHex: string,
  coreHex: string
): HTMLCanvasElement {
  const key = `celestial_sword_v2_${primaryHex}_${secondaryHex}_${coreHex}`;
  const cached = singleTextureCache.get(key);
  if (cached) return cached;

  const w = 128;
  const h = 224;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  const [pr, pg, pb] = hexToRgb(primaryHex);
  const [sr, sg, sb] = hexToRgb(secondaryHex);
  const [cr, cg, cb] = hexToRgb(coreHex);

  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = (x - w * 0.5) / (w * 0.5);

      let inShape = false;
      let intensity = 0;

      if (v >= 0.16 && v <= 0.98) {
        const bladeHalfW =
          v > 0.78
            ? ((0.98 - v) / 0.2) * 0.19
            : 0.19 * (1.0 - Math.sin((v - 0.16) * 2.5) * 0.08);
        if (Math.abs(u) <= bladeHalfW + 0.08) {
          inShape = true;
          const bevel = 1.0 - Math.abs(u) / Math.max(0.02, bladeHalfW);
          const fullerRune =
            Math.abs(u) < 0.045 && v < 0.75
              ? ridgedNoise2D(u * 20.0, v * 32.0, 2, 717)
              : 0;
          const plasmaAura =
            ridgedNoise2D(u * 12.0, v * 16.0, 3, 818) *
            Math.exp(-Math.pow(Math.max(0, Math.abs(u) - bladeHalfW) / 0.06, 2));
          intensity = Math.max(
            0,
            bevel * 0.85 + fullerRune * 0.65 + plasmaAura * 0.75
          );
          if (u < 0 && Math.abs(u) < bladeHalfW) intensity += 0.22;
        }
      }

      const wingCenterV = 0.22 - Math.abs(u) * 0.14;
      const wingThick = 0.085 * (1.0 - Math.abs(u) * 0.65);
      if (Math.abs(u) <= 0.88 && Math.abs(v - wingCenterV) <= wingThick) {
        inShape = true;
        const feather = ridgedNoise2D(u * 14.0, v * 18.0, 3, 919);
        const wingEnv =
          1.0 - Math.abs(v - wingCenterV) / Math.max(0.01, wingThick);
        intensity = Math.max(intensity, wingEnv * (0.65 + feather * 0.55));
      }

      if (!inShape || intensity <= 0.05) continue;

      const alpha = smoothstep(0.05, 0.22, intensity);
      let red = sr,
        green = sg,
        blue = sb;
      if (intensity > 0.75) {
        const t = Math.min(1, (intensity - 0.75) / 0.25);
        red = pr + (cr - pr) * t;
        green = pg + (cg - pg) * t;
        blue = pb + (cb - pb) * t;
      } else if (intensity > 0.38) {
        const t = (intensity - 0.38) / 0.37;
        red = sr + (pr - sr) * t;
        green = sg + (pg - sg) * t;
        blue = sb + (pb - sb) * t;
      }

      const idx = (y * w + x) * 4;
      data[idx] = Math.min(255, red | 0);
      data[idx + 1] = Math.min(255, green | 0);
      data[idx + 2] = Math.min(255, blue | 0);
      data[idx + 3] = Math.min(255, (alpha * 255) | 0);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  singleTextureCache.set(key, canvas);
  return canvas;
}

// ============================================================================
// 10. 2.5D CRASHING TIDAL WAVE CREST & SEA-FOAM SHADER SPRITE
// Synthesizes subsurface ocean scattering, ridged wave barrel, and Voronoi sea-foam
// ============================================================================
export function getTidalWaveCrestSprite(
  primaryHex: string,
  secondaryHex: string,
  coreHex: string,
  darkHex: string
): HTMLCanvasElement {
  const key = `tidal_wave_v1_${primaryHex}_${secondaryHex}_${coreHex}_${darkHex}`;
  const cached = singleTextureCache.get(key);
  if (cached) return cached;

  const w = 192;
  const h = 160;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  const [pr, pg, pb] = hexToRgb(primaryHex);
  const [sr, sg, sb] = hexToRgb(secondaryHex);
  const [cr, cg, cb] = hexToRgb(coreHex);
  const [dr, dg, db] = hexToRgb(darkHex);

  for (let y = 0; y < h; y++) {
    const v = 1.0 - y / h; // 0 = base, 1 = crest
    // Curling Hokusai wave profile: leans forward at the top
    const curlX = Math.pow(v, 1.8) * 0.38 - Math.sin(v * Math.PI) * 0.14;
    const waveHalfW = (1.0 - Math.pow(v, 2.2) * 0.62) * 0.56;

    for (let x = 0; x < w; x++) {
      const rawU = (x - w * 0.5) / (w * 0.5);
      const u = rawU - curlX;
      if (Math.abs(u) > waveHalfW || v < 0.04 || v > 0.96) continue;

      const normU = u / Math.max(0.05, waveHalfW);
      const [f1, f2] = voronoiF1F2(rawU * 6.5, v * 7.5, 404);
      const foamWeb = smoothstep(0.14, 0.0, f2 - f1);
      const fluidRidge = ridgedNoise2D(rawU * 5.0 - v * 3.2, v * 8.0, 3, 505);
      const turb = fbm2D(rawU * 9.0, v * 9.0, 3, 606);

      // Leading crest & top lip get dense white-hot Voronoi sea-foam
      const isCrestFoam =
        normU > 0.35 || v > 0.72 || (foamWeb > 0.45 && v > 0.38);
      const foamIntensity = Math.min(
        1.0,
        Math.max(0, normU - 0.15) * 0.95 +
          Math.pow(v, 2.2) * 0.85 +
          foamWeb * 0.75 +
          fluidRidge * 0.35
      );

      const alpha =
        smoothstep(1.0, 0.78, Math.abs(normU)) *
        smoothstep(0.04, 0.16, v) *
        smoothstep(0.96, 0.86, v);
      if (alpha <= 0.01) continue;

      let red = dr,
        green = dg,
        blue = db;
      if (isCrestFoam && foamIntensity > 0.78) {
        const t = Math.min(1, (foamIntensity - 0.78) / 0.22);
        red = pr + (cr - pr) * t;
        green = pg + (cg - pg) * t;
        blue = pb + (cb - pb) * t;
      } else if (foamIntensity > 0.38) {
        const t = (foamIntensity - 0.38) / 0.4;
        red = sr + (pr - sr) * t;
        green = sg + (pg - sg) * t;
        blue = sb + (pb - sb) * t;
      } else {
        const t = Math.max(0, (foamIntensity + turb * 0.25) / 0.45);
        red = dr + (sr - dr) * t;
        green = dg + (sg - dg) * t;
        blue = db + (sb - db) * t;
      }

      const idx = (y * w + x) * 4;
      data[idx] = Math.min(255, red | 0);
      data[idx + 1] = Math.min(255, green | 0);
      data[idx + 2] = Math.min(255, blue | 0);
      data[idx + 3] = Math.min(255, (alpha * 245) | 0);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  singleTextureCache.set(key, canvas);
  return canvas;
}

// ============================================================================
// 11. BIOLUMINESCENT BOTANICAL CANOPY & ROOT BLOOM TEXTURE
// Organic Voronoi foliage clusters + golden/emerald subsurface veins
// ============================================================================
export function getBioluminescentCanopySprite(
  primaryHex: string,
  secondaryHex: string,
  coreHex: string,
  darkHex: string
): HTMLCanvasElement {
  const key = `bio_canopy_v1_${primaryHex}_${secondaryHex}_${coreHex}_${darkHex}`;
  const cached = singleTextureCache.get(key);
  if (cached) return cached;

  const size = 192;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const [pr, pg, pb] = hexToRgb(primaryHex);
  const [sr, sg, sb] = hexToRgb(secondaryHex);
  const [cr, cg, cb] = hexToRgb(coreHex);
  const [dr, dg, db] = hexToRgb(darkHex);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - half) / half;
      const dy = (y - half) / half;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r >= 0.96) continue;

      const ang = Math.atan2(dy, dx);
      // Organic 8-lobe botanical flower/canopy silhouette (not a geometric star!)
      const petalLobe = Math.cos(ang * 5) * 0.08 + (fbm2D(dx * 4.5, dy * 4.5, 3, 912) - 0.5) * 0.16;
      const effR = r + petalLobe;
      if (effR > 0.9) continue;

      const [f1, f2] = voronoiF1F2(dx * 5.2, dy * 5.2, 913);
      const leafVein = smoothstep(0.09, 0.0, f2 - f1);
      const radialRoot = ridgedNoise2D(ang * 6.0, r * 5.0, 3, 914);
      const mossFbm = fbm2D(dx * 10.0, dy * 10.0, 3, 915);

      const energy = Math.min(
        1.0,
        (1.0 - effR * 0.7) * (mossFbm * 0.4 + radialRoot * 0.42 + leafVein * 0.72)
      );
      const alpha = smoothstep(0.9, 0.72, effR) * smoothstep(0.06, 0.22, energy);
      if (alpha <= 0.01) continue;

      let red = dr + (sr - dr) * energy;
      let green = dg + (sg - dg) * energy;
      let blue = db + (sb - db) * energy;
      if (energy > 0.65) {
        const u = (energy - 0.65) / 0.35;
        red = pr + (cr - pr) * u;
        green = pg + (cg - pg) * u;
        blue = pb + (cb - pb) * u;
      }

      const idx = (y * size + x) * 4;
      data[idx] = Math.min(255, red | 0);
      data[idx + 1] = Math.min(255, green | 0);
      data[idx + 2] = Math.min(255, blue | 0);
      data[idx + 3] = Math.min(255, (alpha * 235) | 0);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  singleTextureCache.set(key, canvas);
  return canvas;
}

// ============================================================================
// 12. 3D RAY-CASTED SPHERICAL ELEMENTAL SHIELD DOMES (ICE, HEX, MAGMA, HYDRO, BRIAR, VOID)
// Computes true 3D sphere normal (nx, ny, nz = sqrt(1 - r^2)), spherical UV projection,
// Fresnel rim lighting, dual specular reflection lobes, and domain-warped cellular shaders.
// ============================================================================
export type SphericalShieldStyle =
  | 'frost_sphere'
  | 'aegis_hex_sphere'
  | 'magma_sphere'
  | 'hydro_bubble_sphere'
  | 'briar_nature_sphere'
  | 'void_gravity_sphere';

export function getSphericalShieldTextureSprite(
  style: SphericalShieldStyle,
  primaryHex: string,
  secondaryHex: string,
  coreHex: string,
  darkHex = '#050814'
): HTMLCanvasElement {
  const key = `sphere_shield_v3_${style}_${primaryHex}_${secondaryHex}_${coreHex}_${darkHex}`;
  const cached = singleTextureCache.get(key);
  if (cached) return cached;

  const size = 192;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const [pr, pg, pb] = hexToRgb(primaryHex);
  const [sr, sg, sb] = hexToRgb(secondaryHex);
  const [cr, cg, cb] = hexToRgb(coreHex);
  const [dr, dg, db] = hexToRgb(darkHex);

  // Grazing 3D light vectors positioned toward the upper-left and lower-right rim
  // so specular highlights sit on the curved 3D shell and never block the center character
  const L1x = -0.62,
    L1y = -0.60,
    L1z = 0.506;
  const L2x = 0.60,
    L2y = 0.58,
    L2z = 0.551;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Sphere radius occupies 0..0.91 so outer 0.91..1.08 holds atmospheric corona
      const nx = (x - half) / (half * 0.91);
      const ny = (y - half) / (half * 0.91);
      const r2 = nx * nx + ny * ny;
      const r = Math.sqrt(r2);

      if (r >= 1.08) continue;

      const idx = (y * size + x) * 4;

      // Soft outer atmospheric bloom halo just outside the sphere horizon (1.0 < r < 1.08)
      if (r > 1.0) {
        const halo = Math.pow(1.0 - (r - 1.0) / 0.08, 2.2) * 0.48;
        data[idx] = pr;
        data[idx + 1] = pg;
        data[idx + 2] = pb;
        data[idx + 3] = Math.min(255, (halo * 210) | 0);
        continue;
      }

      // True 3D Sphere Z-Normal & Stereographic Spherical UV Projection
      const nz = Math.sqrt(Math.max(0.0001, 1.0 - r2));
      const proj = 1.0 / (1.0 + nz * 0.58);
      const su = nx * proj;
      const sv = ny * proj;

      // Radial shell mask: almost completely transparent at the center (r < 0.55)
      // and progressively denser toward the 3D curved wall (0.58 < r < 1.0)
      const centerClearMask = smoothstep(0.22, 0.86, r);
      const rimShellMask = Math.pow(centerClearMask, 1.45);

      // Fresnel rim lighting (0 at center, strong along the 3D spherical limb)
      const fresnel = Math.pow(1.0 - nz, 2.45);
      const horizonCrisp = Math.exp(-Math.pow((r - 0.965) / 0.03, 2));

      // 3D Phong / Blinn Specular Reflections on the upper-left & lower-right curvature
      const dot1 = Math.max(0, nx * L1x + ny * L1y + nz * L1z);
      const dot2 = Math.max(0, nx * L2x + ny * L2y + nz * L2z);
      const specPrimary = Math.pow(dot1, 32) * smoothstep(0.35, 0.72, r);
      const specSecondary = Math.pow(dot2, 18) * 0.38 * smoothstep(0.4, 0.78, r);

      let patternEnergy = 0;
      let seamCore = 0;
      let darkPlate = 0;

      if (style === 'frost_sphere') {
        // 3D Faceted Glacial Permafrost Ice Sphere: Voronoi ice plates + frost dendrites
        const [f1, f2] = voronoiF1F2(su * 5.6 + 1.2, sv * 5.6 - 0.8, 301);
        const iceCrack = smoothstep(0.1, 0.0, f2 - f1);
        const frostDendrite = ridgedNoise2D(su * 9.5, sv * 9.5, 3, 302);
        const facetTilt = fbm2D(su * 4.5, sv * 4.5, 2, 303);
        const rawPattern =
          iceCrack * 0.88 + frostDendrite * 0.42 + facetTilt * 0.18;
        patternEnergy = rawPattern * (0.08 + 0.92 * rimShellMask) + fresnel * 0.85;
        seamCore =
          iceCrack * (0.12 + 0.88 * rimShellMask) +
          specPrimary * 1.15 +
          horizonCrisp * 0.78;
      } else if (style === 'aegis_hex_sphere') {
        // 3D Geodesic Forcefield Sphere: sharp cellular lattice + scanning latitude rings
        const [f1, f2] = voronoiF1F2(su * 7.2, sv * 7.2, 401);
        const hexSeam = smoothstep(0.08, 0.0, f2 - f1);
        const latScan = Math.pow(0.5 + 0.5 * Math.sin(ny * 18.0), 4.0) * 0.38;
        patternEnergy =
          (hexSeam * 0.9 + latScan) * (0.07 + 0.93 * rimShellMask) +
          fresnel * 0.88;
        seamCore =
          hexSeam * (0.1 + 0.9 * rimShellMask) +
          specPrimary * 1.05 +
          horizonCrisp * 0.82;
      } else if (style === 'magma_sphere') {
        // 3D Volcanic Obsidian & Molten Lava Carapace Sphere (clear center, molten shell rim)
        const warpX = su + (fbm2D(su * 5.0, sv * 5.0, 2, 501) - 0.5) * 0.22;
        const warpY = sv + (fbm2D(su * 5.0, sv * 5.0, 2, 502) - 0.5) * 0.22;
        const [f1, f2] = voronoiF1F2(warpX * 5.2, warpY * 5.2, 503);
        const lavaVein = smoothstep(0.12, 0.0, f2 - f1);
        const thermalRidge = ridgedNoise2D(su * 7.0, sv * 7.0, 3, 504);
        darkPlate =
          (1.0 - lavaVein) *
          smoothstep(0.08, 0.28, f1) *
          0.48 *
          smoothstep(0.55, 0.94, r);
        patternEnergy =
          (lavaVein * 0.95 + thermalRidge * 0.35) * (0.08 + 0.92 * rimShellMask) +
          fresnel * 0.82;
        seamCore =
          lavaVein * (0.14 + 0.86 * rimShellMask) +
          horizonCrisp * 0.8 +
          specPrimary * 0.65;
      } else if (style === 'hydro_bubble_sphere') {
        // 3D Refractive Water Bubble Sphere with Caustic Ripples & Glossy Meniscus
        const caustic1 = ridgedNoise2D(su * 6.2 + 0.7, sv * 6.2, 3, 601);
        const caustic2 = ridgedNoise2D(su * 8.5 - 1.1, sv * 8.5, 2, 602);
        const causticWeb = Math.pow((caustic1 + caustic2) * 0.5, 1.6);
        const crescent =
          Math.exp(-Math.pow((r - 0.78) / 0.05, 2)) *
          smoothstep(-0.1, -0.7, nx + ny);
        patternEnergy =
          causticWeb * 0.62 * (0.05 + 0.95 * rimShellMask) +
          fresnel * 0.92 +
          crescent * 0.95;
        seamCore =
          crescent * 1.1 +
          specPrimary * 1.25 +
          specSecondary * 0.8 +
          horizonCrisp * 0.88;
      } else if (style === 'briar_nature_sphere') {
        // 3D Interwoven Bioluminescent Briar Vines & Living Bark Sphere
        const ang = Math.atan2(sv, su);
        const spiral1 = Math.sin(ang * 6.0 + r * 10.0);
        const spiral2 = Math.cos(ang * 6.0 - r * 10.0);
        const vineWeave = smoothstep(
          0.55,
          0.95,
          Math.max(spiral1, spiral2) +
            (fbm2D(su * 8.0, sv * 8.0, 2, 701) - 0.5) * 0.45
        );
        const [f1, f2] = voronoiF1F2(su * 5.0, sv * 5.0, 702);
        const leafCell = smoothstep(0.095, 0.0, f2 - f1);
        patternEnergy =
          (vineWeave * 0.78 + leafCell * 0.62) * (0.07 + 0.93 * rimShellMask) +
          fresnel * 0.82;
        seamCore =
          leafCell * (0.1 + 0.9 * rimShellMask) +
          specPrimary * 0.85 +
          horizonCrisp * 0.74;
      } else {
        // 'void_gravity_sphere': 3D Relativistic Dark-Matter Event Horizon Sphere
        const swirlAng = Math.atan2(sv, su) + (1.0 - nz) * 3.2;
        const gravFilament = ridgedNoise2D(
          Math.cos(swirlAng) * 4.5,
          Math.sin(swirlAng) * 4.5 + r * 4.0,
          3,
          801
        );
        darkPlate = Math.pow(1.0 - nz, 1.6) * 0.45;
        patternEnergy =
          gravFilament * 0.78 * (0.06 + 0.94 * rimShellMask) + fresnel * 0.94;
        seamCore =
          horizonCrisp * 0.95 +
          gravFilament * fresnel * 0.85 +
          specPrimary * 0.75;
      }

      const totalEnergy = Math.min(
        1.0,
        patternEnergy * 0.68 +
          fresnel * 0.62 +
          horizonCrisp * 0.72 +
          specPrimary * 0.95 +
          specSecondary * 0.45
      );

      // ALMOST TRANSPARENT AT CENTER (alpha ~0.02 at r=0), ramping smoothly to crisp 3D Fresnel rim!
      const baseGlassAlpha = 0.015 + fresnel * 0.56;
      const rawAlpha = Math.max(
        baseGlassAlpha,
        totalEnergy * (0.06 + 0.88 * rimShellMask) +
          seamCore * 0.55 +
          darkPlate * 0.5 +
          horizonCrisp * 0.75
      );
      const alpha = Math.min(0.95, rawAlpha);

      let red = sr + (pr - sr) * totalEnergy;
      let green = sg + (pg - sg) * totalEnergy;
      let blue = sb + (pb - sb) * totalEnergy;

      if (darkPlate > 0.1) {
        const dt = Math.min(1, darkPlate);
        red = red * (1 - dt) + dr * dt;
        green = green * (1 - dt) + dg * dt;
        blue = blue * (1 - dt) + db * dt;
      }

      if (seamCore > 0.35) {
        const ct = Math.min(1, (seamCore - 0.35) / 0.65);
        red = red + (cr - red) * ct;
        green = green + (cg - green) * ct;
        blue = blue + (cb - blue) * ct;
      }

      data[idx] = Math.min(255, Math.max(0, red | 0));
      data[idx + 1] = Math.min(255, Math.max(0, green | 0));
      data[idx + 2] = Math.min(255, Math.max(0, blue | 0));
      data[idx + 3] = Math.min(255, Math.max(0, (alpha * 255) | 0));
    }
  }

  ctx.putImageData(imgData, 0, 0);
  singleTextureCache.set(key, canvas);
  return canvas;
}

// ============================================================================
// 13. 2.5D FLETCHED ELEMENTAL ARROW & SONIC SLIPSTREAM WARHEAD SPRITE
// Synthesizes a faceted broadhead tip, glowing arrow shaft, feathered vanes, and Mach wake
// ============================================================================
export function getElementalArrowTextureSprite(
  primaryHex: string,
  secondaryHex: string,
  coreHex: string
): HTMLCanvasElement {
  const key = `elem_arrow_v1_${primaryHex}_${secondaryHex}_${coreHex}`;
  const cached = singleTextureCache.get(key);
  if (cached) return cached;

  // Oriented pointing RIGHT (+X): width = 160, height = 64
  const w = 160;
  const h = 64;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  const [pr, pg, pb] = hexToRgb(primaryHex);
  const [sr, sg, sb] = hexToRgb(secondaryHex);
  const [cr, cg, cb] = hexToRgb(coreHex);

  for (let y = 0; y < h; y++) {
    const v = (y - h * 0.5) / (h * 0.5); // -1..1
    const absV = Math.abs(v);
    for (let x = 0; x < w; x++) {
      const u = x / w; // 0 = tail fletching, 1 = broadhead tip

      let intensity = 0;
      let coreMask = 0;

      // 1. Central Arrow Shaft (0.08 <= u <= 0.82)
      if (u >= 0.08 && u <= 0.82 && absV <= 0.14) {
        const shaftCyl = 1.0 - absV / 0.14;
        intensity = Math.max(intensity, 0.65 + shaftCyl * 0.35);
        coreMask = Math.max(coreMask, Math.pow(shaftCyl, 2.0) * 0.85);
      }

      // 2. Barbed Diamond Broadhead Arrowhead (0.62 <= u <= 0.96)
      if (u >= 0.62 && u <= 0.96) {
        const headProgress = (0.96 - u) / 0.34;
        const maxHeadV = headProgress * 0.52;
        const barbCut = u < 0.70 ? ((0.70 - u) / 0.08) * 0.22 : 0;
        if (absV <= maxHeadV && absV >= barbCut * 0.6) {
          const bevel = 1.0 - Math.abs(absV - maxHeadV * 0.35) / Math.max(0.05, maxHeadV);
          const facetLight = v < 0 ? 1.18 : 0.82;
          intensity = Math.max(intensity, Math.min(1.0, (0.55 + bevel * 0.45) * facetLight));
          if (absV < 0.12 || Math.abs(absV - maxHeadV) < 0.06) {
            coreMask = Math.max(coreMask, 0.85);
          }
        }
      }

      // 3. Swept Feather Fletching Vanes at Tail (0.06 <= u <= 0.34)
      if (u >= 0.06 && u <= 0.34) {
        const vaneU = (u - 0.06) / 0.28;
        const vaneOuter = 0.12 + (1.0 - vaneU) * 0.36;
        const vaneInner = 0.06 + (1.0 - vaneU) * 0.08;
        if (absV >= vaneInner && absV <= vaneOuter) {
          const featherRibs = 0.65 + 0.35 * Math.sin(u * 80 + absV * 30);
          intensity = Math.max(intensity, 0.72 * featherRibs);
          coreMask = Math.max(coreMask, 0.35 * featherRibs);
        }
      }

      // 4. Sonic Slipstream Wake & Energy Aura
      const wakeEnv =
        Math.exp(-Math.pow(absV / (0.18 + (1.0 - u) * 0.32), 2)) *
        smoothstep(0.0, 0.2, u) *
        smoothstep(1.0, 0.85, u);
      const wakeNoise = ridgedNoise2D(u * 10.0, v * 6.0, 2, 951);
      intensity = Math.min(1.0, intensity + wakeEnv * wakeNoise * 0.45);

      const alpha = smoothstep(0.06, 0.22, intensity);
      if (alpha <= 0.01) continue;

      let red = sr + (pr - sr) * intensity;
      let green = sg + (pg - sg) * intensity;
      let blue = sb + (pb - sb) * intensity;

      if (coreMask > 0.25 || intensity > 0.76) {
        const ct = Math.min(1, Math.max(coreMask, (intensity - 0.76) / 0.24));
        red = red + (cr - red) * ct;
        green = green + (cg - green) * ct;
        blue = blue + (cb - blue) * ct;
      }

      const idx = (y * w + x) * 4;
      data[idx] = Math.min(255, red | 0);
      data[idx + 1] = Math.min(255, green | 0);
      data[idx + 2] = Math.min(255, blue | 0);
      data[idx + 3] = Math.min(255, (alpha * 255) | 0);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  singleTextureCache.set(key, canvas);
  return canvas;
}

// ============================================================================
// 14. 2.5D CHITINOUS INSECT / LOCUST / HORNET / SCARAB SWARM SHADER SPRITE
// Synthesizes a 3D normal-mapped insect carapace, glowing abdomen, mandibles & buzzing wings
// ============================================================================
export function getChitinScarabSwarmSprite(
  primaryHex: string,
  secondaryHex: string,
  coreHex: string,
  darkHex: string,
  wingPhase = 0
): HTMLCanvasElement {
  const key = `chitin_insect_v1_${primaryHex}_${secondaryHex}_${coreHex}_${darkHex}_${wingPhase}`;
  const cached = singleTextureCache.get(key);
  if (cached) return cached;

  const size = 64;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const [pr, pg, pb] = hexToRgb(primaryHex);
  const [sr, sg, sb] = hexToRgb(secondaryHex);
  const [cr, cg, cb] = hexToRgb(coreHex);
  const [dr, dg, db] = hexToRgb(darkHex);

  const wingAngle = wingPhase === 0 ? 0.58 : 1.05;
  const cosW = Math.cos(wingAngle);
  const sinW = Math.sin(wingAngle);

  for (let y = 0; y < size; y++) {
    const ny = (y - half) / half;
    const absY = Math.abs(ny);
    for (let x = 0; x < size; x++) {
      const nx = (x - half) / half;
      const idx = (y * size + x) * 4;

      let alpha = 0;
      let red = 0,
        green = 0,
        blue = 0;

      // 1. Segmented Abdomen + Thorax + Head (+X facing)
      const bodyRx = 0.44;
      const bodyRy = 0.24 * (1.0 - Math.max(0, nx) * 0.25);
      const bodyDist2 = (nx * nx) / (bodyRx * bodyRx) + (ny * ny) / (bodyRy * bodyRy);

      if (bodyDist2 <= 1.0) {
        const nz = Math.sqrt(Math.max(0.01, 1.0 - bodyDist2));
        const segWave = 0.5 + 0.5 * Math.cos(nx * 26.0);
        const spec = Math.pow(Math.max(0, -nx * 0.3 - ny * 0.45 + nz * 0.84), 14);
        const biolum = smoothstep(-0.45, 0.15, -nx) * segWave;

        red = dr + (sr - dr) * nz + (pr - sr) * biolum * 0.85 + cr * spec * 0.9;
        green = dg + (sg - dg) * nz + (pg - sg) * biolum * 0.85 + cg * spec * 0.9;
        blue = db + (sb - db) * nz + (pb - sb) * biolum * 0.85 + cb * spec * 0.9;
        alpha = smoothstep(1.0, 0.82, bodyDist2);
      }

      // 2. Sharp Mandibles / Pincers at Front (+X: 0.35..0.68)
      if (nx > 0.35 && nx < 0.68) {
        const pincerY = 0.14 - (nx - 0.35) * 0.32;
        if (Math.abs(absY - pincerY) < 0.045) {
          red = cr;
          green = cg;
          blue = cb;
          alpha = Math.max(alpha, 0.95);
        }
      }

      // 3. Translucent Iridescent Buzzing Wings
      const wx = nx - 0.05;
      const wy = absY - 0.08;
      const rotU = wx * cosW + wy * sinW;
      const rotV = -wx * sinW + wy * cosW;
      const wingDist2 = Math.pow((rotU + 0.18) / 0.46, 2) + Math.pow(rotV / 0.17, 2);
      if (wingDist2 <= 1.0 && absY > 0.05) {
        const [f1, f2] = voronoiF1F2(rotU * 10.0, rotV * 10.0, 888);
        const vein = smoothstep(0.14, 0.0, f2 - f1);
        const wingAlpha = (0.32 + vein * 0.55) * smoothstep(1.0, 0.7, wingDist2);
        const wRed = pr + (cr - pr) * (0.45 + vein * 0.55);
        const wGreen = pg + (cg - pg) * (0.45 + vein * 0.55);
        const wBlue = pb + (cb - pb) * (0.45 + vein * 0.55);

        red = red * alpha + wRed * (1 - alpha * 0.5);
        green = green * alpha + wGreen * (1 - alpha * 0.5);
        blue = blue * alpha + wBlue * (1 - alpha * 0.5);
        alpha = Math.min(1.0, Math.max(alpha, wingAlpha));
      }

      if (alpha <= 0.01) continue;
      data[idx] = Math.min(255, Math.max(0, red | 0));
      data[idx + 1] = Math.min(255, Math.max(0, green | 0));
      data[idx + 2] = Math.min(255, Math.max(0, blue | 0));
      data[idx + 3] = Math.min(255, Math.max(0, (alpha * 255) | 0));
    }
  }

  ctx.putImageData(imgData, 0, 0);
  singleTextureCache.set(key, canvas);
  return canvas;
}




