// ============================================================================
// MODULE: CORE MATH LUT, OFFSCREEN GLOW CACHE & O(1) SWAP-AND-POP
// Drop-in zero-allocation utilities for 2D/2.5D game engines
// ============================================================================

const NOISE_SIZE = 512;
export const NOISE_LUT = new Float32Array(NOISE_SIZE);
for (let i = 0; i < NOISE_SIZE; i++) {
  const t = (i / NOISE_SIZE) * Math.PI * 2;
  NOISE_LUT[i] =
    Math.sin(t * 3) * 0.45 +
    Math.cos(t * 7 + 1.3) * 0.35 +
    Math.sin(t * 13 + 2.7) * 0.2;
}

export function fastNoise(x: number): number {
  const idx = ((Math.floor(x * 64) % NOISE_SIZE) + NOISE_SIZE) % NOISE_SIZE;
  return NOISE_LUT[idx];
}

const glowSpriteCache = new Map<string, HTMLCanvasElement>();

export function getGlowSprite(color: string, coreColor?: string): HTMLCanvasElement {
  const key = coreColor ? `${color}_${coreColor}` : color;
  let canvas = glowSpriteCache.get(key);
  if (canvas) return canvas;

  canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
    if (coreColor) {
      grad.addColorStop(0, coreColor);
      grad.addColorStop(0.26, color);
      grad.addColorStop(0.68, color + '55');
      grad.addColorStop(1, 'transparent');
    } else {
      grad.addColorStop(0, color);
      grad.addColorStop(0.45, color + '66');
      grad.addColorStop(1, 'transparent');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();
  }
  glowSpriteCache.set(key, canvas);
  return canvas;
}

export function removeSwapPop<T>(arr: T[], index: number): void {
  const last = arr.length - 1;
  if (index !== last) {
    arr[index] = arr[last];
  }
  arr.pop();
}
