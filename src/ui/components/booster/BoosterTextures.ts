import * as THREE from 'three';

export interface BoosterCardItem {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  rarityLabel?: string;
  atk?: number;
  pv?: number;
  image?: string;
  texture?: THREE.Texture;
  isVideo?: boolean;
}

/**
 * Draw crimped metallic seal ribs (at top or bottom)
 */
function drawCrimpedFoil(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  const stripeH = 8;
  const numStripes = Math.floor(h / stripeH);

  for (let s = 0; s < numStripes; s++) {
    const sy = y + s * stripeH;
    const ribGrad = ctx.createLinearGradient(0, sy, 0, sy + stripeH);
    ribGrad.addColorStop(0, '#555555');
    ribGrad.addColorStop(0.2, '#f0f0f0');
    ribGrad.addColorStop(0.5, '#ffffff');
    ribGrad.addColorStop(0.8, '#888888');
    ribGrad.addColorStop(1, '#333333');

    ctx.fillStyle = ribGrad;
    ctx.fillRect(x, sy, w, stripeH - 1);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(x, sy + stripeH - 1, w, 1);
  }
  ctx.restore();
}

/**
 * Procedural texture generator for authentic booster pack packaging
 */
export function createBoosterFoilFrontTexture(
  theme: string = 'mewtwo',
  customTitle: string = 'LEGENDS OF WINTER'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 941;
  canvas.height = 1672;
  const ctx = canvas.getContext('2d')!;

  // 1. Cosmic foil gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  if (theme === 'charizard' || theme === 'fire') {
    bgGrad.addColorStop(0, '#100318');
    bgGrad.addColorStop(0.3, '#3d0c24');
    bgGrad.addColorStop(0.6, '#801318');
    bgGrad.addColorStop(0.85, '#e03b0c');
    bgGrad.addColorStop(1, '#ff8008');
  } else if (theme === 'pikachu' || theme === 'thunder' || theme === 'gold') {
    bgGrad.addColorStop(0, '#03071e');
    bgGrad.addColorStop(0.3, '#0077b6');
    bgGrad.addColorStop(0.6, '#00b4d8');
    bgGrad.addColorStop(0.85, '#ffd166');
    bgGrad.addColorStop(1, '#ffee32');
  } else if (theme === 'rayquaza' || theme === 'nature') {
    bgGrad.addColorStop(0, '#081c15');
    bgGrad.addColorStop(0.3, '#1b4332');
    bgGrad.addColorStop(0.6, '#2d6a4f');
    bgGrad.addColorStop(0.85, '#52b788');
    bgGrad.addColorStop(1, '#74c69d');
  } else if (theme === 'winter' || theme === 'ice') {
    bgGrad.addColorStop(0, '#020d1a');
    bgGrad.addColorStop(0.3, '#0c2d48');
    bgGrad.addColorStop(0.6, '#145da0');
    bgGrad.addColorStop(0.85, '#2e8bc0');
    bgGrad.addColorStop(1, '#b1d4e0');
  } else {
    // Mewtwo / Arcane / Default
    bgGrad.addColorStop(0, '#1a052b');
    bgGrad.addColorStop(0.3, '#3c096c');
    bgGrad.addColorStop(0.6, '#5a189a');
    bgGrad.addColorStop(0.85, '#9d4edd');
    bgGrad.addColorStop(1, '#e0aaff');
  }

  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Diagonal holographic foil rays
  ctx.save();
  for (let i = -10; i < 25; i++) {
    const ray = ctx.createLinearGradient(i * 120, 0, (i + 5) * 120, canvas.height);
    ray.addColorStop(0, 'rgba(255, 230, 100, 0)');
    ray.addColorStop(0.5, 'rgba(255, 255, 255, 0.16)');
    ray.addColorStop(1, 'rgba(0, 220, 255, 0)');
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.moveTo(i * 120, 0);
    ctx.lineTo((i + 3) * 120, 0);
    ctx.lineTo((i + 7) * 120, canvas.height);
    ctx.lineTo((i + 4) * 120, canvas.height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 3. Top crimped foil seal
  drawCrimpedFoil(ctx, 0, 0, canvas.width, 130);

  // 4. Perforated tear line guide at 266px
  ctx.save();
  ctx.setLineDash([12, 10]);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.moveTo(30, 266);
  ctx.lineTo(canvas.width - 30, 266);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 5. Bottom crimped foil seal
  drawCrimpedFoil(ctx, 0, canvas.height - 130, canvas.width, 130);

  // 6. Header: Game Banner
  ctx.save();
  const bannerGrad = ctx.createLinearGradient(100, 160, canvas.width - 100, 260);
  bannerGrad.addColorStop(0, '#d4af37');
  bannerGrad.addColorStop(0.5, '#fff6a9');
  bannerGrad.addColorStop(1, '#aa820a');

  ctx.textAlign = 'center';
  ctx.font = '900 68px "Cinzel", "Outfit", sans-serif';

  // 3D Drop shadow
  ctx.fillStyle = '#0a0a14';
  ctx.fillText(customTitle.toUpperCase(), canvas.width / 2 + 4, 232);
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#2a1a00';
  ctx.strokeText(customTitle.toUpperCase(), canvas.width / 2, 230);
  ctx.fillStyle = bannerGrad;
  ctx.fillText(customTitle.toUpperCase(), canvas.width / 2, 230);

  // Subtitle banner: TRADING CARD GAME
  ctx.font = '800 24px "Outfit", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 8;
  ctx.fillText('★ EDIÇÃO BOOSTER ESPECIAL ★', canvas.width / 2, 280);
  ctx.shadowBlur = 0;
  ctx.restore();

  // 7. Central Emblem / Slime Artwork
  ctx.save();
  const cx = canvas.width / 2;
  const cy = canvas.height * 0.52;

  const aura = ctx.createRadialGradient(cx, cy, 50, cx, cy, 360);
  aura.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  aura.addColorStop(0.4, 'rgba(250, 204, 21, 0.55)');
  aura.addColorStop(0.8, 'rgba(168, 85, 247, 0.25)');
  aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(cx, cy, 360, 0, Math.PI * 2);
  ctx.fill();

  // Slime King Icon Shape
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(cx, cy, 140, Math.PI * 0.15, Math.PI * 0.85, true);
  ctx.bezierCurveTo(cx - 180, cy + 120, cx + 180, cy + 120, cx + 130, cy + 50);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#78350f';
  ctx.stroke();

  // Slime cute eyes
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(cx - 45, cy - 20, 16, 0, Math.PI * 2);
  ctx.arc(cx + 45, cy - 20, 16, 0, Math.PI * 2);
  ctx.fill();

  // Eye highlights
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx - 49, cy - 24, 6, 0, Math.PI * 2);
  ctx.arc(cx + 41, cy - 24, 6, 0, Math.PI * 2);
  ctx.fill();

  // Cute blush
  ctx.fillStyle = 'rgba(244, 63, 94, 0.55)';
  ctx.beginPath();
  ctx.arc(cx - 70, cy + 15, 14, 0, Math.PI * 2);
  ctx.arc(cx + 70, cy + 15, 14, 0, Math.PI * 2);
  ctx.fill();

  // Crown
  ctx.fillStyle = '#ffd700';
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx - 70, cy - 130);
  ctx.lineTo(cx - 85, cy - 200);
  ctx.lineTo(cx - 35, cy - 170);
  ctx.lineTo(cx, cy - 225);
  ctx.lineTo(cx + 35, cy - 170);
  ctx.lineTo(cx + 85, cy - 200);
  ctx.lineTo(cx + 70, cy - 130);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  // 8. Bottom Footer: Cards Info
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '900 32px "Outfit", sans-serif';
  ctx.fillStyle = '#ffeaa7';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 6;
  ctx.fillText('CONTÉM CARTAS COLECIONÁVEIS', canvas.width / 2, canvas.height - 200);
  ctx.font = '700 22px "Outfit", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('COM CHANCES DE CARTAS RARAS E LENDÁRIAS', canvas.width / 2, canvas.height - 160);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Procedural texture for booster foil back
 */
export function createBoosterFoilBackTexture(preset: 'silver' | 'gold' | 'black' = 'silver'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 941;
  canvas.height = 1672;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  if (preset === 'gold') {
    grad.addColorStop(0, '#594411');
    grad.addColorStop(0.2, '#aa820a');
    grad.addColorStop(0.5, '#ffd700');
    grad.addColorStop(0.8, '#aa820a');
    grad.addColorStop(1, '#594411');
  } else if (preset === 'black') {
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.25, '#1e293b');
    grad.addColorStop(0.5, '#334155');
    grad.addColorStop(0.75, '#1e293b');
    grad.addColorStop(1, '#0f172a');
  } else {
    // Silver
    grad.addColorStop(0, '#475569');
    grad.addColorStop(0.25, '#94a3b8');
    grad.addColorStop(0.5, '#cbd5e1');
    grad.addColorStop(0.75, '#94a3b8');
    grad.addColorStop(1, '#475569');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Seals
  drawCrimpedFoil(ctx, 0, 0, canvas.width, 130);
  drawCrimpedFoil(ctx, 0, canvas.height - 130, canvas.width, 130);

  // Barcode & Game Info
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(canvas.width / 2 - 140, canvas.height - 340, 280, 110);
  ctx.fillStyle = '#000000';
  for (let b = 0; b < 45; b++) {
    const bx = canvas.width / 2 - 125 + b * 5.6;
    const bw = (b % 3 === 0) ? 3.5 : 1.8;
    ctx.fillRect(bx, canvas.height - 330, bw, 70);
  }
  ctx.textAlign = 'center';
  ctx.font = '900 18px monospace';
  ctx.fillText('9 780201 379624', canvas.width / 2, canvas.height - 242);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '600 20px "Outfit", sans-serif';
  ctx.fillText('LEGENDS OF WINTER TCG • TODOS OS DIREITOS RESERVADOS', canvas.width / 2, canvas.height - 390);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Card Back Texture
 */
export function createCardBackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 960;
  const ctx = canvas.getContext('2d')!;

  // Background
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.5, '#1e1b4b');
  grad.addColorStop(1, '#020617');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Ornate Golden Border
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#d4af37';
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fff59d';
  ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

  // Center Seal
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const radial = ctx.createRadialGradient(cx, cy, 20, cx, cy, 180);
  radial.addColorStop(0, '#ffd700');
  radial.addColorStop(0.6, '#b45309');
  radial.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = radial;
  ctx.beginPath();
  ctx.arc(cx, cy, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 52px "Cinzel", serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 12;
  ctx.fillText('LEGENDS', cx, cy - 10);
  ctx.font = '700 26px "Outfit", sans-serif';
  ctx.fillText('OF WINTER', cx, cy + 35);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Procedural Card Front Texture Generator for game cards
 */
export function createCardFrontCanvasTexture(card: BoosterCardItem): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 960;
  const ctx = canvas.getContext('2d')!;

  const isLegendary = card.rarity === 'legendary' || card.rarity === 'epic';
  const isRare = card.rarity === 'rare';

  // Base background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Holographic rainbow gradient for rare/legendary
  if (isLegendary || isRare) {
    const holoGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    holoGrad.addColorStop(0, '#ef4444');
    holoGrad.addColorStop(0.2, '#f59e0b');
    holoGrad.addColorStop(0.4, '#10b981');
    holoGrad.addColorStop(0.6, '#06b6d4');
    holoGrad.addColorStop(0.8, '#8b5cf6');
    holoGrad.addColorStop(1, '#ec4899');
    ctx.fillStyle = holoGrad;
    ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
  } else {
    ctx.fillStyle = '#334155';
    ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
  }

  // Inner card frame
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(24, 24, canvas.width - 48, canvas.height - 48);

  // Card Artwork Window (top area)
  ctx.fillStyle = '#0b0f19';
  ctx.fillRect(40, 90, canvas.width - 80, 480);

  // Header Title
  ctx.fillStyle = isLegendary ? '#ffd700' : (isRare ? '#38bdf8' : '#ffffff');
  ctx.font = '900 32px "Cinzel", "Outfit", sans-serif';
  ctx.fillText(card.name, 45, 65);

  // Rarity Label / Stars
  ctx.textAlign = 'right';
  ctx.font = '800 24px "Outfit", sans-serif';
  ctx.fillStyle = isLegendary ? '#fbbf24' : (isRare ? '#38bdf8' : '#94a3b8');
  const stars = isLegendary ? '★★★ LENDÁRIA' : (isRare ? '★ RARA' : 'COMUM');
  ctx.fillText(stars, canvas.width - 45, 65);
  ctx.textAlign = 'left';

  // Stats / Bottom Panel
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(40, 590, canvas.width - 80, 310);
  ctx.strokeStyle = isLegendary ? '#fbbf24' : '#475569';
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 590, canvas.width - 80, 310);

  // ATK / PV Badges
  const atk = card.atk ?? 10;
  const pv = card.pv ?? 15;

  ctx.font = '900 36px "Outfit", sans-serif';
  ctx.fillStyle = '#ef4444';
  ctx.fillText(`⚔️ ${atk} ATK`, 65, 660);

  ctx.fillStyle = '#10b981';
  ctx.fillText(`💖 ${pv} PV`, 340, 660);

  // Decorative border
  ctx.lineWidth = 8;
  ctx.strokeStyle = isLegendary ? '#ffd700' : (isRare ? '#0284c7' : '#64748b');
  ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  // If card has an image, load and draw onto the canvas
  if (card.image) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 40, 90, canvas.width - 80, 480);
      texture.needsUpdate = true;
    };
    img.src = card.image;
  }

  return texture;
}

/**
 * 4-Point Sparkle Sprite Texture for particles
 */
export function createSparkleSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const cx = 64;
  const cy = 64;

  const rad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 60);
  rad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  rad.addColorStop(0.3, 'rgba(255, 235, 120, 0.8)');
  rad.addColorStop(0.7, 'rgba(255, 120, 200, 0.3)');
  rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, 128, 128);

  // 4-point star ray
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx, 4);
  ctx.quadraticCurveTo(cx, cy, 124, cy);
  ctx.quadraticCurveTo(cx, cy, cx, 124);
  ctx.quadraticCurveTo(cx, cy, 4, cy);
  ctx.quadraticCurveTo(cx, cy, cx, 4);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Holographic Light Beam Texture
 */
export function createHoloLightBeamTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 512, 0, 0);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  grad.addColorStop(0.3, 'rgba(254, 240, 138, 0.6)');
  grad.addColorStop(0.7, 'rgba(192, 132, 252, 0.3)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
