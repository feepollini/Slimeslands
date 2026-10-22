/**
 * Native Procedural Terrain & Vegetation Texture Engine
 * Cloned directly from reference app: C:\Users\FELIP\Downloads\micro-malha-de-grama-viva-top-down (1)
 *
 * Includes:
 * 1. High-Performance Procedural Grass Sprites (Cluster, Fine, Clover, Autumn)
 * 2. Pizza-Slice Jelly Flowers (Daisy, Poppy, Sunflower, Sakura)
 * 3. Reactive Micro-Water with Anime Voronoi Caustics & White Foam Shoreline
 * 4. Procedural Terrain Noise & Colored Ground Stippling (fbmNoise2D, smoothNoise2D, hash2D)
 */

export type GrassBladeStyle = 'cluster' | 'fine' | 'clover' | 'autumn' | 'bamboo';
export type FlowerStyle = 'daisy' | 'poppy' | 'sunflower' | 'sakura';
export type SoilTone = 'esmeralda' | 'musgo' | 'areia' | 'terra' | 'lago' | 'pedra' | 'neve';

// ============================================================================
// MATEMÁTICA & RUÍDO PROCEDURAL EXATO DO APP DE REFERÊNCIA
// ============================================================================

export function hexToRGB(hex: string): [number, number, number] {
  let clean = (hex || '#ffffff').replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [255, 255, 255];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * 2D Hash function using Math.imul bit-twiddling from reference app
 */
export function hash2D(x: number, y: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Smooth 2D noise with cubic Hermite curve
 */
export function smoothNoise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = hash2D(ix, iy);
  const n10 = hash2D(ix + 1, iy);
  const n01 = hash2D(ix, iy + 1);
  const n11 = hash2D(ix + 1, iy + 1);

  const nx0 = n00 * (1 - sx) + n10 * sx;
  const nx1 = n01 * (1 - sx) + n11 * sx;
  return nx0 * (1 - sy) + nx1 * sy;
}

/**
 * Fractal Brownian Motion (FBM) with 3 octaves
 */
export function fbmNoise2D(x: number, y: number): number {
  return (
    smoothNoise2D(x, y) * 0.52 +
    smoothNoise2D(x * 2.3 + 3.1, y * 2.3 + 7.4) * 0.32 +
    smoothNoise2D(x * 5.1 + 11.2, y * 5.1 + 5.8) * 0.16
  );
}

// ============================================================================
// 1. PINTURA PROCEDURAL DE CHÃO & CARIMBOS DE TERRENO (DO APP DE REFERÊNCIA)
// ============================================================================

/**
 * Paints organic procedural noise texture derived directly from ANY base color hex.
 * Generates natural lighter/darker tonal variations so the floor is never flat/chapado!
 * Cloned directly from reference proceduralTextures.ts line 17.
 */
export function paintColoredTerrainNoise(
  canvas: HTMLCanvasElement,
  baseHexColor = '#ffffff',
  noiseIntensity = 0.28,
  noiseScale = 0.045,
  seed = 42
): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;

  const [baseR, baseG, baseB] = hexToRGB(baseHexColor);

  if (noiseIntensity <= 0.001) {
    ctx.fillStyle = baseHexColor;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;
  const sOffset = (seed % 1000) * 13.7;
  const effScale = Math.max(0.01, noiseScale);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x + sOffset) * effScale;
      const ny = (y + sOffset * 1.3) * effScale;

      // Octave 1: Organic turf/earth/sand patches
      const nMacro = fbmNoise2D(nx, ny);

      // Octave 2: Medium sharp detail
      const nMedium = smoothNoise2D(nx * 4.2 + 5.3, ny * 4.2 + 8.1);

      // Octave 3: High-frequency sharp micro-stippling (adds crisp granules, zero blur!)
      const nMicro = hash2D(Math.floor(x * 1.8 + sOffset), Math.floor(y * 1.8 + sOffset * 2.1));

      // Sharp contrast curves
      const macroDelta = (Math.pow(nMacro, 1.25) - 0.45) * 0.75;
      const mediumDelta = (nMedium - 0.5) * 0.45;
      const microDelta = (nMicro - 0.5) * 0.35;

      const totalDelta = (macroDelta + mediumDelta + microDelta) * noiseIntensity * 1.6;

      const r = Math.max(0, Math.min(255, Math.round(baseR * (1.0 + totalDelta))));
      const g = Math.max(0, Math.min(255, Math.round(baseG * (1.0 + totalDelta))));
      const b = Math.max(0, Math.min(255, Math.round(baseB * (1.0 + totalDelta))));

      const idx = (y * width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Paints a soft radial brush stamp with micro-noise texture in colorHex.
 * Allows painting textured sand, soil, moss, water, or stone directly onto terrain!
 * Cloned directly from reference proceduralTextures.ts line 81.
 */
let reusableBrushCanvas: HTMLCanvasElement | null = null;
let reusableBrushCtx: CanvasRenderingContext2D | null = null;

function getReusableBrushCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const safeSize = Math.max(8, Math.min(1024, Math.round(size)));
  if (!reusableBrushCanvas) {
    reusableBrushCanvas = document.createElement('canvas');
    reusableBrushCanvas.width = safeSize;
    reusableBrushCanvas.height = safeSize;
    reusableBrushCtx = reusableBrushCanvas.getContext('2d', { willReadFrequently: true });
  } else if (reusableBrushCanvas.width < safeSize || reusableBrushCanvas.height < safeSize) {
    reusableBrushCanvas.width = Math.max(reusableBrushCanvas.width, safeSize);
    reusableBrushCanvas.height = Math.max(reusableBrushCanvas.height, safeSize);
    reusableBrushCtx = reusableBrushCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!reusableBrushCtx) return null;
  return { canvas: reusableBrushCanvas, ctx: reusableBrushCtx };
}

export function paintTexturedBrushStroke(
  canvas: HTMLCanvasElement,
  cx: number,
  cy: number,
  pixelRadius: number,
  colorHex: string,
  opacity = 0.85,
  noiseIntensity = 0.35
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const [baseR, baseG, baseB] = hexToRGB(colorHex);
  const r = Math.max(3, Math.round(pixelRadius));
  const r2 = r * r;
  const diam = r * 2;

  const buf = getReusableBrushCanvas(diam);
  if (!buf) return;
  const { canvas: stampCanvas, ctx: sctx } = buf;

  // Clear only the used portion
  sctx.clearRect(0, 0, diam, diam);
  const imgData = sctx.createImageData(diam, diam);
  const data = imgData.data;

  const effectiveNoise = Math.max(0.05, Math.min(0.85, noiseIntensity));

  for (let y = 0; y < diam; y++) {
    for (let x = 0; x < diam; x++) {
      const dx = x - r;
      const dy = y - r;
      const dist2 = dx * dx + dy * dy;
      if (dist2 > r2) continue;

      const normDist = Math.sqrt(dist2) / r;
      const radialFalloff = Math.max(0, 1.0 - Math.pow(normDist, 1.8));

      // Absolute world-space canvas coordinate to keep noise pattern perfectly pinned
      const wx = cx + dx;
      const wy = cy + dy;

      // Octave 1: Organic turf/sand/stone patches
      const n1 = fbmNoise2D(wx * 0.065, wy * 0.065);
      // Octave 2: Micro grain stippling
      const n2 = hash2D(Math.floor(wx * 1.5), Math.floor(wy * 1.5));

      const delta = (n1 * 0.65 + n2 * 0.35 - 0.5) * effectiveNoise * 1.6;

      const pr = Math.max(0, Math.min(255, Math.round(baseR * (1.0 + delta))));
      const pg = Math.max(0, Math.min(255, Math.round(baseG * (1.0 + delta))));
      const pb = Math.max(0, Math.min(255, Math.round(baseB * (1.0 + delta))));

      const idx = (y * diam + x) * 4;
      data[idx] = pr;
      data[idx + 1] = pg;
      data[idx + 2] = pb;
      data[idx + 3] = Math.round(255 * radialFalloff * opacity);
    }
  }
  sctx.putImageData(imgData, 0, 0);

  ctx.drawImage(stampCanvas, 0, 0, diam, diam, Math.round(cx - r), Math.round(cy - r), diam, diam);
}

const noisePNGMap = new Map<string, string>();

/**
 * Generates a standalone terrain noise stamp PNG using the reference algorithm.
 */
export function generateTerrainNoisePNG(
  baseHex = '#16a34a',
  size = 128,
  noiseIntensity = 0.28,
  noiseScale = 0.045,
  seed = 42
): string {
  const key = `${baseHex}_${size}_${noiseIntensity}_${noiseScale}_${seed}`;
  const cached = noisePNGMap.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  paintColoredTerrainNoise(canvas, baseHex, noiseIntensity, noiseScale, seed);
  const data = canvas.toDataURL('image/png');
  noisePNGMap.set(key, data);
  return data;
}

// ============================================================================
// 2. MÓDULO DE ÁGUA REATIVA PROCEDURAL (DO APP DE REFERÊNCIA)
// ============================================================================

export type WaterStyle = 'cristalina' | 'oceano' | 'menta' | 'azul_ceu';

export const REFERENCE_WATER_PRESETS: { id: WaterStyle; name: string; hex: string; emoji: string }[] = [
  { id: 'cristalina', name: 'Cristalina', hex: '#0284c7', emoji: '💧' },
  { id: 'oceano', name: 'Oceano Escuro', hex: '#0f172a', emoji: '🌊' },
  { id: 'menta', name: 'Lagoa Menta', hex: '#0d9488', emoji: '🌿' },
  { id: 'azul_ceu', name: 'Azul Céu', hex: '#38bdf8', emoji: '💎' },
];

/**
 * Voronoi Caustic Cell Network matching waterModule.ts line 273
 */
function calculateCausticWeb(x: number, y: number, t: number): number {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  const fx = x - gx;
  const fy = y - gy;

  let f1 = 8.0;
  let f2 = 8.0;

  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const rx = (hash2D(gx + i, gy + j) - 0.5) * 0.7;
      const ry = (hash2D((gx + i) * 31, (gy + j) * 17) - 0.5) * 0.7;
      const ox = i + rx + 0.22 * Math.sin(t * 0.7 + 6.2831 * rx);
      const oy = j + ry + 0.22 * Math.cos(t * 0.6 + 6.2831 * ry);

      const dx = ox - fx;
      const dy = oy - fy;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) {
        f2 = d;
      }
    }
  }

  const wdt = 0.12;
  let edge = (f2 - f1) / wdt;
  edge = Math.max(0, Math.min(1, edge));
  edge = edge * edge * (3.0 - 2.0 * edge);
  return Math.max(0, 1.0 - edge);
}

/**
 * Generates an anime-style reactive water patch PNG with Voronoi caustics and white foam edge.
 * Direct 2D equivalent of waterModule.ts!
 */
export function generateWaterPatchPNG(
  radius = 64,
  waterColor = '#0284c7',
  scale = 1.5,
  opacity = 0.92
): string {
  const canvas = document.createElement('canvas');
  const size = radius * 2;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const cx = radius;
  const cy = radius;
  const r = radius - 4;

  const [baseR, baseG, baseB] = hexToRGB(waterColor);

  // 1. Base Water with smooth radial falloff
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, `rgba(${Math.min(255, Math.round(baseR * 1.25))}, ${Math.min(255, Math.round(baseG * 1.25))}, ${Math.min(255, Math.round(baseB * 1.25))}, ${opacity})`);
  grad.addColorStop(0.72, `rgba(${baseR}, ${baseG}, ${baseB}, ${opacity * 0.94})`);
  grad.addColorStop(0.92, `rgba(${Math.round(baseR * 0.65)}, ${Math.round(baseG * 0.65)}, ${Math.round(baseB * 0.65)}, ${opacity * 0.98})`);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // 2. Voronoi Animated Caustics Web (from waterModule.ts shader)
  const causticCanvas = document.createElement('canvas');
  causticCanvas.width = size;
  causticCanvas.height = size;
  const cctx = causticCanvas.getContext('2d');
  if (cctx) {
    const cImg = cctx.createImageData(size, size);
    const cData = cImg.data;
    const invScale = 1.0 / Math.max(0.1, scale * 12.0);

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const dx = px - cx;
        const dy = py - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= r - 2) continue;

        const u = px * invScale;
        const v = py * invScale;

        // Domain warping
        const warpX = u + Math.sin(v * 1.2) * 0.25;
        const warpY = v + Math.cos(u * 1.1) * 0.25;

        const web1 = calculateCausticWeb(warpX, warpY, 1.2);
        const web2 = calculateCausticWeb(warpX * 1.5 + 3.1, warpY * 1.5 + 4.7, 1.5);
        const web = Math.min(1.0, web1 * 0.8 + web2 * 0.4);

        if (web > 0.1) {
          const falloff = Math.max(0, 1.0 - (dist / r));
          const idx = (py * size + px) * 4;
          cData[idx] = 255;
          cData[idx + 1] = 255;
          cData[idx + 2] = 255;
          cData[idx + 3] = Math.round(web * 160 * falloff);
        }
      }
    }
    cctx.putImageData(cImg, 0, 0);
    ctx.drawImage(causticCanvas, 0, 0);
  }

  // 3. Prominent White Shoreline Foam Border (matching waterModule.ts line 111 & 339)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = Math.max(3, r * 0.12);
  ctx.beginPath();
  ctx.arc(cx, cy, r - ctx.lineWidth * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}

// ============================================================================
// 3. GERADOR DE FLORES PROCEDURAIS (JELLY PIZZA SLICE PETALS - USER APPROVED)
// ============================================================================

const flowerPNGMap = new Map<string, string>();

export function generateFlowerSpritePNG(style: FlowerStyle = 'daisy'): string {
  const cached = flowerPNGMap.get(style);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, 128, 128);

  const cx = 64;
  const cy = 64;
  const numPetals = 8; // Exactly 8 pizza slice jelly petals

  let outerColor = '#ffffff';
  let innerColor = '#fef08a';
  let coreColor = '#facc15';
  let gelShineColor = '#ffffff';

  if (style === 'poppy') {
    outerColor = '#f87171';
    innerColor = '#ef4444';
    coreColor = '#1e1b4b';
    gelShineColor = '#fca5a5';
  } else if (style === 'sunflower') {
    outerColor = '#fde047';
    innerColor = '#f59e0b';
    coreColor = '#78350f';
    gelShineColor = '#fef08a';
  } else if (style === 'sakura') {
    outerColor = '#f472b6';
    innerColor = '#ec4899';
    coreColor = '#fef08a';
    gelShineColor = '#fbcfe8';
  }

  // 1. Draw 8 Jelly Pizza Slice Petals
  const arcAngle = (Math.PI * 2) / numPetals;

  for (let i = 0; i < numPetals; i++) {
    const angle = i * arcAngle;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // Pizza Slice Jelly Petal Path (rounded outer arc & plump side curves)
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.quadraticCurveTo(-15, -28, -13, -52);
    ctx.quadraticCurveTo(0, -58, 13, -52);
    ctx.quadraticCurveTo(15, -28, 0, -6);
    ctx.closePath();

    // Jelly Radial Gradient fill
    const grad = ctx.createRadialGradient(0, -32, 2, 0, -32, 28);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.7, outerColor);
    grad.addColorStop(1, outerColor);

    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    ctx.fill();

    // Soft Jelly Outer Rim Stroke
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Glossy Specular Jelly Shine Highlight on top of each slice
    ctx.beginPath();
    ctx.ellipse(0, -38, 5, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = gelShineColor;
    ctx.globalAlpha = 0.55;
    ctx.fill();

    ctx.restore();
  }

  // 2. Center Circular Gel Core Disc
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 15, 0, Math.PI * 2);

  const coreGrad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, 15);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.35, coreColor);
  coreGrad.addColorStop(1, coreColor);

  ctx.fillStyle = coreGrad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 5;
  ctx.fill();

  // Core Specular Highlight
  ctx.beginPath();
  ctx.arc(cx - 4, cy - 4, 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fill();
  ctx.restore();

  const data = canvas.toDataURL('image/png');
  flowerPNGMap.set(style, data);
  return data;
}

// ============================================================================
// 4. GERADOR DE TUFOS DE GRAMA PROCEDURAL (DO APP DE REFERÊNCIA)
// ============================================================================

const grassPNGMap = new Map<string, string>();

export function generateGrassSpritePNG(style: GrassBladeStyle = 'cluster'): string {
  const cached = grassPNGMap.get(style);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, 128, 128);

  if (style === 'cluster') {
    const blades = [
      { startX: 64, startY: 124, cp1x: 48, cp1y: 80, cp2x: 32, cp2y: 40, endX: 24, endY: 18, width: 9 },
      { startX: 64, startY: 124, cp1x: 58, cp1y: 70, cp2x: 54, cp2y: 35, endX: 52, endY: 8, width: 11 },
      { startX: 64, startY: 124, cp1x: 70, cp1y: 72, cp2x: 78, cp2y: 38, endX: 82, endY: 12, width: 10 },
      { startX: 64, startY: 124, cp1x: 78, cp1y: 82, cp2x: 94, cp2y: 45, endX: 104, endY: 26, width: 8 },
      { startX: 64, startY: 124, cp1x: 42, cp1y: 90, cp2x: 20, cp2y: 65, endX: 12, endY: 48, width: 7 },
    ];

    blades.forEach((b) => {
      ctx.save();
      const grad = ctx.createLinearGradient(b.startX, b.startY, b.endX, b.endY);
      grad.addColorStop(0, '#1c3e10');   // raiz escura
      grad.addColorStop(0.3, '#3e761c'); // verde folha
      grad.addColorStop(0.8, '#70b22a'); // verde solar
      grad.addColorStop(1, '#9ae03b');   // ponta brilhante

      ctx.strokeStyle = grad;
      ctx.lineWidth = b.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.startX, b.startY);
      ctx.bezierCurveTo(b.cp1x, b.cp1y, b.cp2x, b.cp2y, b.endX, b.endY);
      ctx.stroke();

      ctx.fillStyle = '#b5ef54';
      ctx.beginPath();
      ctx.arc(b.endX, b.endY, b.width * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  } else if (style === 'fine') {
    const grad = ctx.createLinearGradient(64, 124, 64, 10);
    grad.addColorStop(0, '#1c3e10');
    grad.addColorStop(0.5, '#4f9122');
    grad.addColorStop(1, '#9ae03b');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(56, 124);
    ctx.quadraticCurveTo(58, 60, 64, 10);
    ctx.quadraticCurveTo(70, 60, 72, 124);
    ctx.closePath();
    ctx.fill();
  } else if (style === 'clover') {
    const stemGrad = ctx.createLinearGradient(64, 124, 64, 45);
    stemGrad.addColorStop(0, '#14532d');
    stemGrad.addColorStop(1, '#22c55e');

    ctx.lineWidth = 5;
    ctx.strokeStyle = stemGrad;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(64, 124);
    ctx.quadraticCurveTo(60, 85, 64, 45);
    ctx.stroke();

    const drawCloverLeaflet = (cx: number, cy: number, angle: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      const leafGrad = ctx.createRadialGradient(0, -18, 2, 0, -18, 22);
      leafGrad.addColorStop(0, '#bbf7d0');
      leafGrad.addColorStop(0.4, '#4ade80');
      leafGrad.addColorStop(1, '#15803d');

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-16, -10, -20, -28, -7, -32);
      ctx.bezierCurveTo(-2, -34, 0, -28, 0, -26);
      ctx.bezierCurveTo(0, -28, 2, -34, 7, -32);
      ctx.bezierCurveTo(20, -28, 16, -10, 0, 0);
      ctx.closePath();

      ctx.fillStyle = leafGrad;
      ctx.fill();

      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(0, -24);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    };

    drawCloverLeaflet(64, 45, -Math.PI / 3.2);
    drawCloverLeaflet(64, 45, 0);
    drawCloverLeaflet(64, 45, Math.PI / 3.2);
  } else if (style === 'autumn') {
    const blades = [
      { startX: 64, startY: 124, endX: 30, endY: 25, width: 8 },
      { startX: 64, startY: 124, endX: 62, endY: 14, width: 10 },
      { startX: 64, startY: 124, endX: 95, endY: 30, width: 8 },
    ];
    blades.forEach((b) => {
      const grad = ctx.createLinearGradient(b.startX, b.startY, b.endX, b.endY);
      grad.addColorStop(0, '#78350f');
      grad.addColorStop(0.5, '#d97706');
      grad.addColorStop(1, '#fde68a');
      ctx.strokeStyle = grad;
      ctx.lineWidth = b.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.startX, b.startY);
      ctx.quadraticCurveTo(64, 60, b.endX, b.endY);
      ctx.stroke();
    });
  } else if (style === 'bamboo') {
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(64, 124);
    ctx.lineTo(64, 12);
    ctx.stroke();
    for (const ny of [40, 75, 105]) {
      ctx.fillStyle = '#86efac';
      ctx.fillRect(56, ny, 16, 4);
    }
  }

  const data = canvas.toDataURL('image/png');
  grassPNGMap.set(style, data);
  return data;
}

// ============================================================================
// 5. LIMITE PROPORCIONAL DE RESOLUÇÃO DO MAPA (MÁX 5000PX) & CAMADA NATUREZA
// ============================================================================

export const MAX_MAP_DIMENSION = 5000;
export const NATURE_LAYER_ID = 'layer-nature-terrain';

export function clampMapDimensions(
  width: number,
  height: number,
  maxDim: number = MAX_MAP_DIMENSION
): { width: number; height: number } {
  let w = Math.max(32, Math.round(width || 400));
  let h = Math.max(32, Math.round(height || 400));
  if (w > maxDim || h > maxDim) {
    const ratio = Math.min(maxDim / w, maxDim / h);
    w = Math.max(32, Math.round(w * ratio));
    h = Math.max(32, Math.round(h * ratio));
  }
  return { width: w, height: h };
}

// ============================================================================
// 6. MOTOR DE CARIMBOS DE CHÃO EM PIXEL NATIVO (ZERO NÓS DOM / ZERO CSS MASKS)
// ============================================================================

const stampFeatherBitmapCache = new Map<string, HTMLCanvasElement>();
const stampRawImageCache = new Map<string, HTMLImageElement>();
const stampPendingListeners = new Set<string>();

function getFeatheredStampBitmap(
  pngUrl: string,
  featherRatio: number,
  onReady?: () => void
): HTMLCanvasElement | null {
  if (!pngUrl) return null;
  const quantFeather = Math.max(0, Math.min(0.48, Number(featherRatio.toFixed(2))));
  const cacheKey = `${pngUrl}__f:${quantFeather}`;
  const cached = stampFeatherBitmapCache.get(cacheKey);
  if (cached) return cached;

  let img = stampRawImageCache.get(pngUrl);
  if (!img) {
    img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = pngUrl;
    stampRawImageCache.set(pngUrl, img);
  }

  if (!img.complete || img.naturalWidth === 0) {
    if (onReady && !stampPendingListeners.has(pngUrl)) {
      stampPendingListeners.add(pngUrl);
      img.addEventListener(
        'load',
        () => {
          stampPendingListeners.delete(pngUrl);
          onReady();
        },
        { once: true }
      );
    }
    return null;
  }

  // Gera o carimbo circular já com o corte redondo e feather radial cravado nos pixels
  const BITMAP_SIZE = 128;
  const off = document.createElement('canvas');
  off.width = BITMAP_SIZE;
  off.height = BITMAP_SIZE;
  const octx = off.getContext('2d');
  if (!octx) return null;

  const r = BITMAP_SIZE / 2;
  octx.save();
  octx.beginPath();
  octx.arc(r, r, r, 0, Math.PI * 2);
  octx.clip();

  // Object-cover circular
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(BITMAP_SIZE / iw, BITMAP_SIZE / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  octx.drawImage(img, (BITMAP_SIZE - dw) / 2, (BITMAP_SIZE - dh) / 2, dw, dh);
  octx.restore();

  if (quantFeather > 0.01) {
    octx.save();
    octx.globalCompositeOperation = 'destination-in';
    const innerR = Math.max(0, r * (1 - quantFeather * 2));
    const grad = octx.createRadialGradient(r, r, innerR, r, r, r);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    octx.fillStyle = grad;
    octx.fillRect(0, 0, BITMAP_SIZE, BITMAP_SIZE);
    octx.restore();
  }

  if (stampFeatherBitmapCache.size > 160) {
    const oldest = stampFeatherBitmapCache.keys().next().value;
    if (oldest) stampFeatherBitmapCache.delete(oldest);
  }
  stampFeatherBitmapCache.set(cacheKey, off);
  return off;
}

export function renderGroundStampsPixelCanvas(
  canvas: HTMLCanvasElement,
  stamps: Array<{
    id: string;
    x: number;
    y: number;
    pngUrl: string;
    size: number;
    feather?: number;
    rotation?: number;
    flipX?: boolean;
    flipY?: boolean;
    opacity?: number;
    layerId?: string;
  }>,
  layers: Array<{ id: string; visible: boolean; opacity: number }>,
  worldWidth: number,
  worldHeight: number,
  scale: number,
  onAsyncImageLoad?: () => void
): void {
  if (!stamps || stamps.length === 0) {
    if (canvas.width !== 1 || canvas.height !== 1) {
      canvas.width = 1;
      canvas.height = 1;
    }
    return;
  }

  const MAX_CANVAS_DIM = 4096;
  const targetW = Math.max(1, Math.min(MAX_CANVAS_DIM, Math.round(worldWidth * scale)));
  const targetH = Math.max(1, Math.min(MAX_CANVAS_DIM, Math.round(worldHeight * scale)));

  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, targetW, targetH);

  const effScaleX = targetW / Math.max(1, worldWidth);
  const effScaleY = targetH / Math.max(1, worldHeight);
  const layerMap = new Map(layers.map((l) => [l.id, l]));

  ctx.save();
  ctx.scale(effScaleX, effScaleY);

  for (let i = 0; i < stamps.length; i++) {
    const st = stamps[i];
    const layer = layerMap.get(st.layerId || '');
    if (layer && layer.visible === false) continue;

    const size = st.size || 52;
    const featherRatio = (st.feather ?? 14) / Math.max(16, size);
    const bmp = getFeatheredStampBitmap(st.pngUrl, featherRatio, onAsyncImageLoad);
    if (!bmp) continue;

    const alpha = Math.max(0, Math.min(1, (st.opacity ?? 0.9) * (layer?.opacity ?? 1)));
    if (alpha <= 0.005) continue;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(st.x, st.y);
    if (st.rotation) {
      ctx.rotate((st.rotation * Math.PI) / 180);
    }
    if (st.flipX || st.flipY) {
      ctx.scale(st.flipX ? -1 : 1, st.flipY ? -1 : 1);
    }
    const half = size / 2;
    ctx.drawImage(bmp, -half, -half, size, size);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Desenha incrementalmente UM ÚNICO carimbo recém-aplicado direto no Canvas existente em O(1) (0.01ms),
 * sem limpar o canvas nem redesenhar os carimbos anteriores durante o arraste do mouse!
 */
export function drawSingleGroundStampPixel(
  canvas: HTMLCanvasElement,
  st: {
    id: string;
    x: number;
    y: number;
    pngUrl: string;
    size: number;
    feather?: number;
    rotation?: number;
    flipX?: boolean;
    flipY?: boolean;
    opacity?: number;
    layerId?: string;
  },
  layers: Array<{ id: string; visible: boolean; opacity: number }>,
  worldWidth: number,
  worldHeight: number,
  scale: number,
  onAsyncImageLoad?: () => void
): void {
  const MAX_CANVAS_DIM = 4096;
  const targetW = Math.max(1, Math.min(MAX_CANVAS_DIM, Math.round(worldWidth * scale)));
  const targetH = Math.max(1, Math.min(MAX_CANVAS_DIM, Math.round(worldHeight * scale)));

  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  const layer = layers.find((l) => l.id === (st.layerId || ''));
  if (layer && layer.visible === false) return;

  const size = st.size || 52;
  const featherRatio = (st.feather ?? 14) / Math.max(16, size);
  const bmp = getFeatheredStampBitmap(st.pngUrl, featherRatio, onAsyncImageLoad);
  if (!bmp) return;

  const alpha = Math.max(0, Math.min(1, (st.opacity ?? 0.9) * (layer?.opacity ?? 1)));
  if (alpha <= 0.005) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const effScaleX = targetW / Math.max(1, worldWidth);
  const effScaleY = targetH / Math.max(1, worldHeight);

  ctx.save();
  ctx.scale(effScaleX, effScaleY);
  ctx.globalAlpha = alpha;
  ctx.translate(st.x, st.y);
  if (st.rotation) {
    ctx.rotate((st.rotation * Math.PI) / 180);
  }
  if (st.flipX || st.flipY) {
    ctx.scale(st.flipX ? -1 : 1, st.flipY ? -1 : 1);
  }
  const half = size / 2;
  ctx.drawImage(bmp, -half, -half, size, size);
  ctx.restore();
}

// ============================================================================
// 7. INSTANCIAMENTO DE CLONES DO 1º TUFO MESTRE (GRASS & FLOWER CLONE ENGINE)
// ============================================================================
// Em vez de criar 3 nós DOM (<div><div><img></div></div>) por tufo de grama,
// decodifica o 1º tufo mestre UMA ÚNICA VEZ na memória e desenha todos os demais
// como clones instanciados via matriz de transformação GPU 2D, mantendo 100%
// do vento orgânico (@keyframes grassLivingWind) e do amassamento pelos pés do herói!

const masterVegetationSpriteCache = new Map<string, HTMLImageElement>();
const masterVegetationListeners = new Set<string>();

function getMasterVegetationCloneSprite(src: string, onReady?: () => void): HTMLImageElement | null {
  if (!src) return null;
  let img = masterVegetationSpriteCache.get(src);
  if (!img) {
    img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    masterVegetationSpriteCache.set(src, img);
  }
  if (!img.complete || img.naturalWidth === 0) {
    if (onReady && !masterVegetationListeners.has(src)) {
      masterVegetationListeners.add(src);
      img.addEventListener(
        'load',
        () => {
          masterVegetationListeners.delete(src);
          onReady();
        },
        { once: true }
      );
    }
    return null;
  }
  return img;
}

/**
 * Curva matemática exata do @keyframes grassLivingWind (src/index.css linhas 293-309)
 * 0%, 100%: rotate(0deg) skewX(0deg) scale(1, 1)
 * 20%:      rotate(-7.5deg * amp) skewX(-5deg * amp) scale(1 + 0.05*amp, 1 - 0.06*amp)
 * 48%:      rotate(9.5deg * amp)  skewX(6.5deg * amp) scale(1 - 0.04*amp, 1 + 0.07*amp)
 * 72%:      rotate(-3.5deg * amp) skewX(-2.5deg * amp) scale(1 + 0.03*amp, 1 - 0.03*amp)
 * 86%:      rotate(4.5deg * amp)  skewX(3deg * amp) scale(1 - 0.02*amp, 1 + 0.03*amp)
 */
function sampleGrassLivingWind(progress01: number, amp: number): {
  rotRad: number;
  skewRad: number;
  sx: number;
  sy: number;
} {
  const kf = [
    { p: 0.0, rot: 0, skew: 0, sx: 0, sy: 0 },
    { p: 0.2, rot: -7.5, skew: -5.0, sx: 0.05, sy: -0.06 },
    { p: 0.48, rot: 9.5, skew: 6.5, sx: -0.04, sy: 0.07 },
    { p: 0.72, rot: -3.5, skew: -2.5, sx: 0.03, sy: -0.03 },
    { p: 0.86, rot: 4.5, skew: 3.0, sx: -0.02, sy: 0.03 },
    { p: 1.0, rot: 0, skew: 0, sx: 0, sy: 0 },
  ];

  let seg = 0;
  for (let i = 0; i < kf.length - 1; i++) {
    if (progress01 >= kf[i].p && progress01 <= kf[i + 1].p) {
      seg = i;
      break;
    }
  }

  const a = kf[seg];
  const b = kf[seg + 1];
  const span = Math.max(0.0001, b.p - a.p);
  const rawT = (progress01 - a.p) / span;
  // Suavização ease-in-out idêntica ao cubic-bezier(0.42, 0, 0.58, 1)
  const t = rawT * rawT * (3 - 2 * rawT);

  const degToRad = Math.PI / 180;
  const rotDeg = (a.rot + (b.rot - a.rot) * t) * amp;
  const skewDeg = (a.skew + (b.skew - a.skew) * t) * amp;
  const sx = 1 + (a.sx + (b.sx - a.sx) * t) * amp;
  const sy = 1 + (a.sy + (b.sy - a.sy) * t) * amp;

  return {
    rotRad: rotDeg * degToRad,
    skewRad: skewDeg * degToRad,
    sx,
    sy,
  };
}

export interface VegetationCloneInstance {
  id: string;
  x: number;
  y: number;
  subBiomeId?: string;
  layerId?: string;
  customIconPng?: string;
  size?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  flipX?: boolean;
  flipY?: boolean;
  effect?: string;
  effectSpeed?: number;
  effectIntensity?: number;
}

export function renderInstancedVegetationCanvas(
  canvas: HTMLCanvasElement,
  instances: VegetationCloneInstance[],
  worldWidth: number,
  worldHeight: number,
  scale: number,
  timeSec: number,
  cullBounds: { minX: number; maxX: number; minY: number; maxY: number },
  getOriginX: (subBiomeId?: string) => number,
  isLayerVisible: (layerId?: string) => boolean,
  playerWorldPos?: { x: number; y: number } | null
): void {
  if (!instances || instances.length === 0) {
    if (canvas.width !== 1 || canvas.height !== 1) {
      canvas.width = 1;
      canvas.height = 1;
    }
    return;
  }

  const MAX_CANVAS_DIM = 4096;
  const targetW = Math.max(1, Math.min(MAX_CANVAS_DIM, Math.round(worldWidth * scale)));
  const targetH = Math.max(1, Math.min(MAX_CANVAS_DIM, Math.round(worldHeight * scale)));

  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, targetW, targetH);

  const effScaleX = targetW / Math.max(1, worldWidth);
  const effScaleY = targetH / Math.max(1, worldHeight);
  const degToRad = Math.PI / 180;
  const grassPushRadius = 54;

  ctx.save();
  ctx.scale(effScaleX, effScaleY);

  for (let i = 0; i < instances.length; i++) {
    const m = instances[i];
    if (!m.customIconPng) continue;
    if (!isLayerVisible(m.layerId)) continue;

    const ox = getOriginX(m.subBiomeId);
    const wx = ox + m.x;
    const wy = m.y;
    const size = m.size || 48;

    // Viewport Culling rápido: descarta clones fora da tela
    if (
      wx + size < cullBounds.minX ||
      wx - size > cullBounds.maxX ||
      wy + size < cullBounds.minY ||
      wy - size > cullBounds.maxY
    ) {
      continue;
    }

    // Obtém o 1º Sprite Mestre compartilhado (Clone Prototype)
    const masterImg = getMasterVegetationCloneSprite(m.customIconPng);
    if (!masterImg) continue;

    const isWind =
      m.effect !== 'none' &&
      (m.effect === 'wind' || m.id.startsWith('terrain-grass-') || m.id.startsWith('terrain-flower-'));
    const speed = m.effectSpeed ?? 1.0;
    const amp = m.effectIntensity ?? 1.0;

    // Fase individual determinística por coordenada (idêntica ao CSS --wind-delay)
    const dur = 2.0 / Math.max(0.1, speed);
    const phaseOffset = (m.x * 0.018 + m.y * 0.011) % 3.2;
    const progress = (((timeSec + phaseOffset) % dur) + dur) % dur / dur;

    let windRot = 0;
    let windSkew = 0;
    let windSx = 1;
    let windSy = 1;

    if (isWind) {
      const w = sampleGrassLivingWind(progress, amp);
      windRot = w.rotRad;
      windSkew = w.skewRad;
      windSx = w.sx;
      windSy = w.sy;
    }

    // Interação física de amassamento quando o jogador pisa/cruza o tufo no emulador
    if (playerWorldPos) {
      const dx = wx - playerWorldPos.x;
      const dy = wy - playerWorldPos.y;
      if (Math.abs(dx) < grassPushRadius && Math.abs(dy) < grassPushRadius) {
        const dist = Math.hypot(dx, dy);
        if (dist < grassPushRadius) {
          const pushNorm = 1.0 - dist / grassPushRadius;
          const pushAngle = Math.atan2(dy, dx);
          const tiltRad = Math.cos(pushAngle) * 36 * pushNorm * degToRad;
          const squashY = 1.0 - 0.42 * pushNorm;
          const squashX = 1.15 * (1.0 + 0.28 * pushNorm);
          windRot = tiltRad;
          windSkew = 0;
          windSx = squashX;
          windSy = squashY;
        }
      }
    }

    ctx.save();
    // Pivô na raiz do tufo (50% 100% -> wx, wy)
    ctx.translate(wx, wy);

    // 1. Deformação de Vento / Pisada no Pivô da Raiz
    if (windRot !== 0) ctx.rotate(windRot);
    if (windSkew !== 0) ctx.transform(1, 0, Math.tan(windSkew), 1, 0, 0);
    if (windSx !== 1 || windSy !== 1) ctx.scale(windSx, windSy);

    // 2. Rotação e Escala Estática da Instância Clonada
    if (m.rotation) ctx.rotate(m.rotation * degToRad);
    const sx = (m.flipX ? -1 : 1) * (m.scaleX ?? 1.0);
    const sy = (m.flipY ? -1 : 1) * (m.scaleY ?? 1.0);
    if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);

    // Desenha o clone apontando para a textura única do 1º Tufo Mestre
    ctx.drawImage(masterImg, -size / 2, -size, size, size);
    ctx.restore();
  }

  ctx.restore();
}

