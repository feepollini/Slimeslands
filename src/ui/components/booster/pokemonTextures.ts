import * as THREE from 'three';

/**
 * Procedural texture generator for authentic TCG Booster Pack foil packaging
 * and trading cards with holographic foil detailing.
 */

export function createBoosterFoilFrontTexture(theme: 'charizard' | 'pikachu' | 'rayquaza' | 'mewtwo' = 'charizard'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 941;
  canvas.height = 1672;
  const ctx = canvas.getContext('2d')!;

  // 1. Cosmic foil background by theme
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  if (theme === 'pikachu') {
    bgGrad.addColorStop(0, '#03071e');
    bgGrad.addColorStop(0.3, '#0077b6');
    bgGrad.addColorStop(0.6, '#00b4d8');
    bgGrad.addColorStop(0.85, '#ffd166');
    bgGrad.addColorStop(1, '#ffee32');
  } else if (theme === 'rayquaza') {
    bgGrad.addColorStop(0, '#081c15');
    bgGrad.addColorStop(0.3, '#1b4332');
    bgGrad.addColorStop(0.6, '#2d6a4f');
    bgGrad.addColorStop(0.85, '#52b788');
    bgGrad.addColorStop(1, '#74c69d');
  } else if (theme === 'mewtwo') {
    bgGrad.addColorStop(0, '#1a052b');
    bgGrad.addColorStop(0.3, '#3c096c');
    bgGrad.addColorStop(0.6, '#5a189a');
    bgGrad.addColorStop(0.85, '#9d4edd');
    bgGrad.addColorStop(1, '#e0aaff');
  } else {
    // Charizard
    bgGrad.addColorStop(0, '#100318');
    bgGrad.addColorStop(0.3, '#3d0c24');
    bgGrad.addColorStop(0.6, '#801318');
    bgGrad.addColorStop(0.85, '#e03b0c');
    bgGrad.addColorStop(1, '#ff8008');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Diagonal holographic foil rays
  ctx.save();
  for (let i = -10; i < 25; i++) {
    const ray = ctx.createLinearGradient(i * 120, 0, (i + 5) * 120, canvas.height);
    ray.addColorStop(0, 'rgba(255, 230, 100, 0)');
    ray.addColorStop(0.5, 'rgba(255, 255, 255, 0.14)');
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

  // Top crimped foil seal (ribbed metallic texture)
  drawCrimpedFoil(ctx, 0, 0, canvas.width, 130);

  // Subtle perforated tear line guide (serrated laser cut)
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

  // Bottom crimped foil seal
  drawCrimpedFoil(ctx, 0, canvas.height - 130, canvas.width, 130);

  // Header text removed as requested
  // --- Central Artwork: Majestic Fire Dragon (Charizard Style) ---
  ctx.save();
  const cx = canvas.width / 2;
  const cy = canvas.height * 0.52;

  // Swirling fire vortex background
  const fireGrad = ctx.createRadialGradient(cx, cy, 50, cx, cy, 380);
  fireGrad.addColorStop(0, 'rgba(255, 240, 160, 0.95)');
  fireGrad.addColorStop(0.35, 'rgba(255, 120, 20, 0.8)');
  fireGrad.addColorStop(0.7, 'rgba(180, 20, 10, 0.5)');
  fireGrad.addColorStop(1, 'rgba(40, 5, 20, 0)');
  ctx.fillStyle = fireGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 380, 0, Math.PI * 2);
  ctx.fill();

  // Fiery Dragon Silhouette & Artwork
  // Spread wings
  ctx.fillStyle = '#ff6b1a';
  ctx.strokeStyle = '#6d1306';
  ctx.lineWidth = 6;

  // Left Wing
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy - 60);
  ctx.bezierCurveTo(cx - 180, cy - 260, cx - 360, cy - 220, cx - 410, cy - 90);
  ctx.bezierCurveTo(cx - 330, cy - 20, cx - 240, cy + 80, cx - 60, cy + 40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Left wing inner membrane (teal-cyan flame)
  const wingGradL = ctx.createLinearGradient(cx - 350, cy - 150, cx - 100, cy);
  wingGradL.addColorStop(0, '#00e1d9');
  wingGradL.addColorStop(1, '#005b66');
  ctx.fillStyle = wingGradL;
  ctx.beginPath();
  ctx.moveTo(cx - 60, cy - 40);
  ctx.bezierCurveTo(cx - 170, cy - 180, cx - 320, cy - 160, cx - 380, cy - 70);
  ctx.bezierCurveTo(cx - 300, cy - 10, cx - 210, cy + 50, cx - 80, cy + 20);
  ctx.closePath();
  ctx.fill();

  // Right Wing
  ctx.fillStyle = '#ff6b1a';
  ctx.beginPath();
  ctx.moveTo(cx + 30, cy - 60);
  ctx.bezierCurveTo(cx + 180, cy - 260, cx + 360, cy - 220, cx + 410, cy - 90);
  ctx.bezierCurveTo(cx + 330, cy - 20, cx + 240, cy + 80, cx + 60, cy + 40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right wing inner membrane
  const wingGradR = ctx.createLinearGradient(cx + 350, cy - 150, cx + 100, cy);
  wingGradR.addColorStop(0, '#00e1d9');
  wingGradR.addColorStop(1, '#005b66');
  ctx.fillStyle = wingGradR;
  ctx.beginPath();
  ctx.moveTo(cx + 60, cy - 40);
  ctx.bezierCurveTo(cx + 170, cy - 180, cx + 320, cy - 160, cx + 380, cy - 70);
  ctx.bezierCurveTo(cx + 300, cy - 10, cx + 210, cy + 50, cx + 80, cy + 20);
  ctx.closePath();
  ctx.fill();

  // Dragon Torso & Neck
  ctx.fillStyle = '#ff7518';
  ctx.beginPath();
  ctx.moveTo(cx - 55, cy + 180);
  ctx.bezierCurveTo(cx - 70, cy + 60, cx - 50, cy - 50, cx - 30, cy - 120);
  ctx.lineTo(cx + 30, cy - 120);
  ctx.bezierCurveTo(cx + 50, cy - 50, cx + 70, cy + 60, cx + 55, cy + 180);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cream belly
  ctx.fillStyle = '#fff0b8';
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy + 170);
  ctx.bezierCurveTo(cx - 35, cy + 80, cx - 25, cy + 10, cx, cy - 20);
  ctx.bezierCurveTo(cx + 25, cy + 10, cx + 35, cy + 80, cx + 30, cy + 170);
  ctx.closePath();
  ctx.fill();

  // Dragon Head & Horns
  ctx.fillStyle = '#ff6b1a';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 90);
  ctx.lineTo(cx - 45, cy - 160);
  // Horn left
  ctx.bezierCurveTo(cx - 95, cy - 220, cx - 110, cy - 240, cx - 140, cy - 230);
  ctx.bezierCurveTo(cx - 100, cy - 200, cx - 70, cy - 170, cx - 40, cy - 150);
  // Snout
  ctx.lineTo(cx - 50, cy - 180);
  ctx.lineTo(cx, cy - 210);
  ctx.lineTo(cx + 50, cy - 180);
  // Horn right
  ctx.bezierCurveTo(cx + 70, cy - 170, cx + 100, cy - 200, cx + 140, cy - 230);
  ctx.bezierCurveTo(cx + 110, cy - 240, cx + 95, cy - 220, cx + 45, cy - 160);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing eyes
  ctx.fillStyle = '#00ffff';
  ctx.beginPath();
  ctx.arc(cx - 18, cy - 170, 7, 0, Math.PI * 2);
  ctx.arc(cx + 18, cy - 170, 7, 0, Math.PI * 2);
  ctx.fill();

  // Dynamic Fire Breath blast!
  const blast = ctx.createRadialGradient(cx, cy - 195, 10, cx, cy - 195, 240);
  blast.addColorStop(0, '#ffffff');
  blast.addColorStop(0.2, '#fff152');
  blast.addColorStop(0.55, '#ff5900');
  blast.addColorStop(0.9, '#c70039');
  blast.addColorStop(1, 'rgba(199, 0, 57, 0)');
  ctx.fillStyle = blast;
  ctx.beginPath();
  ctx.arc(cx, cy - 195, 230, -Math.PI * 0.85, -Math.PI * 0.15);
  ctx.lineTo(cx, cy - 195);
  ctx.closePath();
  ctx.fill();

  // Sparkling golden embers
  ctx.fillStyle = '#fff9d2';
  for (let e = 0; e < 60; e++) {
    const ex = cx + (Math.random() - 0.5) * 600;
    const ey = cy + (Math.random() - 0.5) * 600;
    const er = 1.5 + Math.random() * 4.5;
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // --- Bottom Badge & Set Edition Details ---
  ctx.save();
  // Metallic foil badge pill
  const badgeY = canvas.height - 290;
  const badgeGrad = ctx.createLinearGradient(cx - 240, badgeY, cx + 240, badgeY + 80);
  badgeGrad.addColorStop(0, '#ffd700');
  badgeGrad.addColorStop(0.5, '#fffbe6');
  badgeGrad.addColorStop(1, '#b8860b');

  ctx.fillStyle = badgeGrad;
  ctx.beginPath();
  ctx.roundRect(cx - 240, badgeY, 480, 74, 18);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  const themeTitles: Record<string, string> = {
    charizard: 'IGNIS DRAGON VMAX',
    pikachu: 'VOLT BEAST V',
    rayquaza: 'ASTRAL WYRM VMAX',
    mewtwo: 'PSIONIC ALPHA VSTAR',
  };
  ctx.fillText(themeTitles[theme] || 'IGNIS DRAGON VMAX', cx, badgeY + 46);

  // Cards count callout
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '3px';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6;
  ctx.fillText('10 ADDITIONAL GAME CARDS', cx, badgeY + 120);
  ctx.shadowBlur = 0;
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createBoosterFoilBackTexture(theme: 'silver' | 'gold' | 'black' = 'silver'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 941;
  canvas.height = 1672;
  const ctx = canvas.getContext('2d')!;

  // Metallic foil backing gradient by theme
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  if (theme === 'gold') {
    bgGrad.addColorStop(0, '#8a6d1c');
    bgGrad.addColorStop(0.25, '#d4af37');
    bgGrad.addColorStop(0.5, '#fff6a9');
    bgGrad.addColorStop(0.75, '#c5a028');
    bgGrad.addColorStop(1, '#7a5e12');
  } else if (theme === 'black') {
    bgGrad.addColorStop(0, '#121316');
    bgGrad.addColorStop(0.25, '#2a2c33');
    bgGrad.addColorStop(0.5, '#454852');
    bgGrad.addColorStop(0.75, '#222329');
    bgGrad.addColorStop(1, '#0e0f12');
  } else {
    // Silver
    bgGrad.addColorStop(0, '#8f949c');
    bgGrad.addColorStop(0.25, '#c8ccd2');
    bgGrad.addColorStop(0.5, '#e4e7eb');
    bgGrad.addColorStop(0.75, '#b0b5be');
    bgGrad.addColorStop(1, '#858a93');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Crimped top & bottom
  drawCrimpedFoil(ctx, 0, 0, canvas.width, 130);

  // Subtle perforated tear line guide (serrated laser cut)
  ctx.save();
  ctx.setLineDash([12, 10]);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.moveTo(30, 266);
  ctx.lineTo(canvas.width - 30, 266);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  drawCrimpedFoil(ctx, 0, canvas.height - 130, canvas.width, 130);

  // Central vertical fin seal (the folded flap on back of booster packs)
  const finWidth = 140;
  const finX = (canvas.width - finWidth) / 2;
  const finGrad = ctx.createLinearGradient(finX, 0, finX + finWidth, 0);
  finGrad.addColorStop(0, '#5a5d63');
  finGrad.addColorStop(0.2, '#d6d9de');
  finGrad.addColorStop(0.8, '#a6aab2');
  finGrad.addColorStop(1, '#484b50');
  ctx.fillStyle = finGrad;
  ctx.fillRect(finX, 130, finWidth, canvas.height - 260);

  // Left shadow of the flap
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(finX - 18, 130, 18, canvas.height - 260);

  // Energy types symbol icons row
  const energyColors = ['#e63946', '#1d3557', '#457b9d', '#2a9d8f', '#e9c46a', '#9d4edd', '#495057'];
  energyColors.forEach((color, i) => {
    ctx.beginPath();
    ctx.arc(220 + i * 85, 360, 24, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  // Authentic barcode block
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(canvas.width - 340, canvas.height - 350, 260, 140);

  // Barcode stripes
  ctx.fillStyle = '#000000';
  let bx = canvas.width - 325;
  while (bx < canvas.width - 95) {
    const sw = Math.random() < 0.4 ? 4 : 2;
    ctx.fillRect(bx, canvas.height - 335, sw, 90);
    bx += sw + (Math.random() < 0.3 ? 5 : 2.5);
  }

  // Legal copy & copyright simulation
  ctx.fillStyle = '#3a3d42';
  ctx.font = '16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('© 2026 Champions TCG / Collectors Edition', 140, canvas.height - 330);
  ctx.fillText('COLLECTORS EDITION · EXPANSION PACK VMAX', 140, canvas.height - 305);
  ctx.fillText('COLLECT ALL 208 ULTRA-RARE CARDS', 140, canvas.height - 280);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function drawCrimpedFoil(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Metallic base
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#5a5d62');
  grad.addColorStop(0.5, '#c5c9d0');
  grad.addColorStop(1, '#4e5156');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Horizontal crimp ridges
  const ridgeCount = 14;
  for (let i = 0; i < ridgeCount; i++) {
    const ry = y + (i / ridgeCount) * h;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(x, ry, w, 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(x, ry + 3, w, 4);
  }
}

export function createPokemonCardBackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d')!;

  // 1. Classic deep navy border covering the full canvas
  ctx.fillStyle = '#0e2454';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Inner card frame with smoothed corners
  const frameMargin = 38;
  const vortexGrad = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 40,
    canvas.width / 2, canvas.height / 2, 500
  );
  vortexGrad.addColorStop(0, '#5388dc');
  vortexGrad.addColorStop(0.4, '#1b4da6');
  vortexGrad.addColorStop(0.85, '#0d2d6c');
  vortexGrad.addColorStop(1, '#081738');

  ctx.fillStyle = vortexGrad;
  ctx.beginPath();
  ctx.roundRect(frameMargin, frameMargin, canvas.width - frameMargin * 2, canvas.height - frameMargin * 2, 28);
  ctx.fill();

  // Cosmic starlight swirls
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  for (let a = 0; a < 6; a++) {
    ctx.rotate(Math.PI / 3);
    const swirl = ctx.createRadialGradient(80, 80, 10, 80, 80, 180);
    swirl.addColorStop(0, 'rgba(120, 200, 255, 0.4)');
    swirl.addColorStop(1, 'rgba(10, 40, 110, 0)');
    ctx.fillStyle = swirl;
    ctx.beginPath();
    ctx.arc(80, 80, 160, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 3. Iconic Center TCG Celestial Medallion & Crest
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = 135;

  // Outer golden filigree ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  const crestGold = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  crestGold.addColorStop(0, '#e5b323');
  crestGold.addColorStop(0.3, '#fff29c');
  crestGold.addColorStop(0.7, '#d49b14');
  crestGold.addColorStop(1, '#8f6202');
  ctx.fillStyle = '#0a1d42';
  ctx.fill();
  ctx.strokeStyle = crestGold;
  ctx.lineWidth = 10;
  ctx.stroke();

  // Concentric inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 20, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 242, 156, 0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Radiant 8-pointed celestial star
  ctx.save();
  ctx.translate(cx, cy);
  for (let s = 0; s < 2; s++) {
    ctx.rotate((Math.PI / 4) * s);
    const starRadiusOuter = radius - 30;
    const starRadiusInner = 32;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const x1 = Math.cos(angle) * starRadiusOuter;
      const y1 = Math.sin(angle) * starRadiusOuter;
      const x2 = Math.cos(angle + Math.PI / 4) * starRadiusInner;
      const y2 = Math.sin(angle + Math.PI / 4) * starRadiusInner;
      if (i === 0) ctx.moveTo(x1, y1);
      else ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();
    ctx.fillStyle = s === 0 ? crestGold : '#ffd166';
    ctx.fill();
    ctx.strokeStyle = '#0e2454';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // Glowing center core orb
  const coreGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 36);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.5, '#4cc9f0');
  coreGrad.addColorStop(1, '#1d3557');
  ctx.beginPath();
  ctx.arc(0, 0, 36, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad;
  ctx.fill();
  ctx.strokeStyle = '#fff29c';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Golden arched "CHAMPIONS" title at top and bottom
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '900 52px "Plus Jakarta Sans", sans-serif';

  // Yellow-gold text
  const gold = ctx.createLinearGradient(150, 120, canvas.width - 150, 120);
  gold.addColorStop(0, '#e5b323');
  gold.addColorStop(0.5, '#fff29c');
  gold.addColorStop(1, '#b38209');

  ctx.lineWidth = 9;
  ctx.strokeStyle = '#0e2454';
  ctx.strokeText('CHAMPIONS', cx, 140);
  ctx.fillStyle = gold;
  ctx.fillText('CHAMPIONS', cx, 140);

  // Symmetrical bottom title
  ctx.translate(cx, canvas.height - 140);
  ctx.rotate(Math.PI);
  ctx.strokeText('CHAMPIONS', 0, 0);
  ctx.fillText('CHAMPIONS', 0, 0);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createPokemonCardFrontTexture(cardType: 'charizard' | 'pikachu' | 'rayquaza'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d')!;

  if (cardType === 'charizard') {
    renderCharizardVMAX(ctx, canvas.width, canvas.height);
  } else if (cardType === 'pikachu') {
    renderPikachuV(ctx, canvas.width, canvas.height);
  } else {
    renderRayquazaVMAX(ctx, canvas.width, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function renderCharizardVMAX(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Ultra-Rare Rainbow / Gold Textured Border covering the full card canvas
  const borderGrad = ctx.createLinearGradient(0, 0, w, h);
  borderGrad.addColorStop(0, '#ffd700');
  borderGrad.addColorStop(0.3, '#ff6b35');
  borderGrad.addColorStop(0.7, '#f72585');
  borderGrad.addColorStop(1, '#7209b7');
  ctx.fillStyle = borderGrad;
  ctx.fillRect(0, 0, w, h);

  // Inner card background (Full Art Fire Nebula)
  const margin = 26;
  const innerW = w - margin * 2;
  const innerH = h - margin * 2;

  const bg = ctx.createRadialGradient(w / 2, 400, 50, w / 2, 400, 550);
  bg.addColorStop(0, '#ffe066');
  bg.addColorStop(0.3, '#f25c05');
  bg.addColorStop(0.7, '#8f0d1e');
  bg.addColorStop(1, '#250308');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(margin, margin, innerW, innerH, 24);
  ctx.fill();

  // Holographic sparkles & stars in background
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 70; i++) {
    const sx = margin + Math.random() * innerW;
    const sy = margin + Math.random() * innerH;
    const sr = 1 + Math.random() * 4;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Header Bar: CHARIZARD VMAX · 330 HP 🔥
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.roundRect(margin + 16, margin + 16, innerW - 32, 68, 12);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('IGNIS DRAGON', margin + 34, margin + 62);

  ctx.fillStyle = '#ff3366';
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('VMAX', margin + 288, margin + 62);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('HP', w - margin - 90, margin + 62);

  ctx.font = '900 40px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('330', w - margin - 45, margin + 62);

  // Fire Energy Icon 🔥
  ctx.beginPath();
  ctx.arc(w - margin - 22, margin + 50, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#f94144';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Central Hero Illustration: Roaring Dragon with fiery wings
  const cx = w / 2;
  const cy = 420;

  // Wings
  ctx.fillStyle = '#ff7b00';
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy);
  ctx.bezierCurveTo(cx - 150, cy - 200, cx - 290, cy - 140, cx - 320, cy - 20);
  ctx.bezierCurveTo(cx - 240, cy + 60, cx - 130, cy + 90, cx - 30, cy + 50);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 30, cy);
  ctx.bezierCurveTo(cx + 150, cy - 200, cx + 290, cy - 140, cx + 320, cy - 20);
  ctx.bezierCurveTo(cx + 240, cy + 60, cx + 130, cy + 90, cx + 30, cy + 50);
  ctx.closePath();
  ctx.fill();

  // Torso & head
  ctx.fillStyle = '#ff8800';
  ctx.beginPath();
  ctx.arc(cx, cy - 60, 55, 0, Math.PI * 2);
  ctx.fill();

  // Fiery breath spiral
  const fireSpiral = ctx.createRadialGradient(cx, cy - 70, 10, cx, cy - 70, 220);
  fireSpiral.addColorStop(0, '#ffffff');
  fireSpiral.addColorStop(0.3, '#ffea00');
  fireSpiral.addColorStop(0.7, '#ff3700');
  fireSpiral.addColorStop(1, 'rgba(255, 55, 0, 0)');
  ctx.fillStyle = fireSpiral;
  ctx.beginPath();
  ctx.arc(cx, cy - 70, 220, 0, Math.PI * 2);
  ctx.fill();

  // Attacks Card Plaque
  const attackY = 660;
  ctx.fillStyle = 'rgba(15, 10, 20, 0.78)';
  ctx.beginPath();
  ctx.roundRect(margin + 16, attackY, innerW - 32, 260, 16);
  ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Attack 1: Claw Slash
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Claw Slash', margin + 70, attackY + 60);
  ctx.textAlign = 'right';
  ctx.font = '900 36px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('100', w - margin - 45, attackY + 60);

  // Attack 2: G-Max Wildfire
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ff9e00';
  ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('G-Max Wildfire', margin + 70, attackY + 140);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('300', w - margin - 45, attackY + 140);

  // Attack flavor text
  ctx.textAlign = 'left';
  ctx.fillStyle = '#cccccc';
  ctx.font = '500 17px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Discard 2 Energy from this card.', margin + 70, attackY + 180);

  // Footer: Rarity & number
  ctx.fillStyle = '#ffd700';
  ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('★★★ SECRET RARE · 208/203', margin + 35, h - margin - 20);
}

function renderPikachuV(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Vibrant Electric Yellow & Cyan Holographic Border covering full canvas
  const borderGrad = ctx.createLinearGradient(0, 0, w, h);
  borderGrad.addColorStop(0, '#ffe600');
  borderGrad.addColorStop(0.5, '#00f5d4');
  borderGrad.addColorStop(1, '#ffbe0b');
  ctx.fillStyle = borderGrad;
  ctx.fillRect(0, 0, w, h);

  const margin = 26;
  const innerW = w - margin * 2;
  const innerH = h - margin * 2;

  // Background
  const bg = ctx.createRadialGradient(w / 2, 400, 50, w / 2, 400, 550);
  bg.addColorStop(0, '#ffffcc');
  bg.addColorStop(0.4, '#ffd000');
  bg.addColorStop(0.85, '#0077b6');
  bg.addColorStop(1, '#03045e');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(margin, margin, innerW, innerH, 24);
  ctx.fill();

  // Electric lightning bolts
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  for (let b = 0; b < 6; b++) {
    ctx.beginPath();
    let lx = w / 2;
    let ly = 400;
    ctx.moveTo(lx, ly);
    for (let s = 0; s < 5; s++) {
      lx += (Math.random() - 0.5) * 140;
      ly += (Math.random() - 0.5) * 140;
      ctx.lineTo(lx, ly);
    }
    ctx.stroke();
  }

  // Header Bar
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.roundRect(margin + 16, margin + 16, innerW - 32, 68, 12);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('VOLT BEAST', margin + 34, margin + 62);

  ctx.fillStyle = '#00f5d4';
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('V', margin + 258, margin + 62);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('HP', w - margin - 90, margin + 62);
  ctx.font = '900 40px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('190', w - margin - 45, margin + 62);

  // Lightning Energy Icon ⚡
  ctx.beginPath();
  ctx.arc(w - margin - 22, margin + 50, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#ffbe0b';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Attacks Plaque
  const attackY = 660;
  ctx.fillStyle = 'rgba(10, 15, 30, 0.78)';
  ctx.beginPath();
  ctx.roundRect(margin + 16, attackY, innerW - 32, 260, 16);
  ctx.fill();
  ctx.strokeStyle = '#00f5d4';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Charge', margin + 70, attackY + 60);

  ctx.fillStyle = '#ffe600';
  ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Thunderbolt', margin + 70, attackY + 140);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('200', w - margin - 45, attackY + 140);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd700';
  ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('★★ ULTRA RARE · 185/203', margin + 35, h - margin - 20);
}

function renderRayquazaVMAX(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Emerald Jade Rainbow Rare Border covering full canvas
  const borderGrad = ctx.createLinearGradient(0, 0, w, h);
  borderGrad.addColorStop(0, '#06d6a0');
  borderGrad.addColorStop(0.5, '#118ab2');
  borderGrad.addColorStop(1, '#ffd166');
  ctx.fillStyle = borderGrad;
  ctx.fillRect(0, 0, w, h);

  const margin = 26;
  const innerW = w - margin * 2;
  const innerH = h - margin * 2;

  // Background Cosmic Sky
  const bg = ctx.createRadialGradient(w / 2, 400, 50, w / 2, 400, 550);
  bg.addColorStop(0, '#d8f3dc');
  bg.addColorStop(0.35, '#52b788');
  bg.addColorStop(0.7, '#1b4332');
  bg.addColorStop(1, '#081c15');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(margin, margin, innerW, innerH, 24);
  ctx.fill();

  // Header Bar
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.roundRect(margin + 16, margin + 16, innerW - 32, 68, 12);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ASTRAL WYRM', margin + 34, margin + 62);

  ctx.fillStyle = '#52b788';
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('VMAX', margin + 288, margin + 62);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('HP', w - margin - 90, margin + 62);
  ctx.font = '900 40px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('320', w - margin - 45, margin + 62);

  // Attacks Plaque
  const attackY = 660;
  ctx.fillStyle = 'rgba(8, 28, 21, 0.8)';
  ctx.beginPath();
  ctx.roundRect(margin + 16, attackY, innerW - 32, 260, 16);
  ctx.fill();
  ctx.strokeStyle = '#52b788';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#52b788';
  ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Max Burst', margin + 70, attackY + 110);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('340', w - margin - 45, attackY + 110);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd700';
  ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('★★★ SECRET RARE · 218/203', margin + 35, h - margin - 20);
}

export interface PackCardData {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  rarityLabel: string;
  hp: number;
  type: string;
  isVideo?: boolean;
  texture: THREE.Texture;
  update?: (time: number) => void;
}

export function loadTextureFromFile(file: File): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name);

    if (isVideo) {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.src = url;
      video.crossOrigin = 'anonymous';
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.autoplay = true;

      video.onloadeddata = () => {
        video.play().catch(() => {});
        const texture = new THREE.VideoTexture(video);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;
        (texture as any).isVideo = true;
        (texture as any).videoElement = video;
        resolve(texture);
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Falha ao carregar arquivo de vídeo'));
      };
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 941;
        canvas.height = img.naturalHeight || 1672;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        resolve(texture);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderElementalCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opt: {
    name: string;
    element: string;
    hp: number;
    attack: string;
    damage: number;
    rarity: string;
    c1: string;
    c2: string;
    bg1: string;
    bg2: string;
    badgeColor: string;
    symbol: 'water' | 'ice' | 'earth' | 'wind' | 'shadow' | 'sun';
  }
) {
  // Full bleed border gradient
  const borderGrad = ctx.createLinearGradient(0, 0, w, h);
  borderGrad.addColorStop(0, opt.c1);
  borderGrad.addColorStop(1, opt.c2);
  ctx.fillStyle = borderGrad;
  ctx.fillRect(0, 0, w, h);

  const margin = 26;
  const innerW = w - margin * 2;
  const innerH = h - margin * 2;

  // Inner background
  const bg = ctx.createRadialGradient(w / 2, 400, 40, w / 2, 400, 560);
  bg.addColorStop(0, opt.bg1);
  bg.addColorStop(1, opt.bg2);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(margin, margin, innerW, innerH, 24);
  ctx.fill();

  // Subtle elemental patterns in background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let i = 0; i < 40; i++) {
    const rx = margin + Math.random() * innerW;
    const ry = margin + Math.random() * (innerH * 0.55);
    const rad = 2 + Math.random() * 8;
    ctx.beginPath();
    ctx.arc(rx, ry, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Header Bar
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.roundRect(margin + 16, margin + 16, innerW - 32, 68, 12);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(opt.name, margin + 34, margin + 62);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('HP', w - margin - 90, margin + 62);
  ctx.font = '900 40px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(String(opt.hp), w - margin - 45, margin + 62);

  // Element orb
  ctx.beginPath();
  ctx.arc(w - margin - 22, margin + 50, 18, 0, Math.PI * 2);
  ctx.fillStyle = opt.badgeColor;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Elemental emblem in illustration box
  const cx = w / 2;
  const cy = 400;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.arc(cx, cy, 140, 0, Math.PI * 2);
  ctx.fill();

  // Stylized central creature / glyph silhouette
  ctx.fillStyle = opt.c1;
  ctx.beginPath();
  if (opt.symbol === 'water') {
    // Water droplet / wave
    ctx.moveTo(cx, cy - 100);
    ctx.bezierCurveTo(cx + 90, cy, cx + 70, cy + 90, cx, cy + 95);
    ctx.bezierCurveTo(cx - 70, cy + 90, cx - 90, cy, cx, cy - 100);
  } else if (opt.symbol === 'ice') {
    // Ice crystal diamond
    ctx.moveTo(cx, cy - 110);
    ctx.lineTo(cx + 80, cy);
    ctx.lineTo(cx, cy + 110);
    ctx.lineTo(cx - 80, cy);
  } else if (opt.symbol === 'earth') {
    // Mountain crest / rune
    ctx.moveTo(cx, cy - 90);
    ctx.lineTo(cx + 95, cy + 85);
    ctx.lineTo(cx - 95, cy + 85);
  } else if (opt.symbol === 'wind') {
    // Spiral vortex wings
    ctx.arc(cx, cy, 75, 0, Math.PI * 1.5);
    ctx.lineWidth = 24;
    ctx.strokeStyle = opt.c1;
    ctx.stroke();
  } else if (opt.symbol === 'shadow') {
    // Crescent moon shadow
    ctx.arc(cx, cy, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx + 40, cy - 20, 75, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  } else {
    // Sun star
    for (let s = 0; s < 8; s++) {
      const ang = (s * Math.PI) / 4;
      ctx.lineTo(cx + Math.cos(ang) * 90, cy + Math.sin(ang) * 90);
      ctx.lineTo(cx + Math.cos(ang + 0.39) * 45, cy + Math.sin(ang + 0.39) * 45);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Attacks Plaque
  const attackY = 660;
  ctx.fillStyle = 'rgba(10, 15, 25, 0.78)';
  ctx.beginPath();
  ctx.roundRect(margin + 16, attackY, innerW - 32, 260, 16);
  ctx.fill();
  ctx.strokeStyle = opt.c1;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(opt.attack, margin + 70, attackY + 70);

  ctx.textAlign = 'right';
  ctx.fillStyle = opt.c1;
  ctx.font = '900 42px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(String(opt.damage), w - margin - 45, attackY + 70);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Elemento ${opt.element} · Fase 1`, margin + 70, attackY + 140);

  // Footer rarity
  ctx.fillStyle = opt.c1;
  ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(opt.rarity, margin + 35, h - margin - 20);
}

export function createDynamicVideoCardTexture(): { texture: THREE.CanvasTexture; update: (time: number) => void } {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d')!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  (texture as any).isVideo = true;

  const update = (timeSec: number) => {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Dynamic rainbow holographic shifting border
    const hue = (timeSec * 50) % 360;
    const borderGrad = ctx.createLinearGradient(0, 0, w, h);
    borderGrad.addColorStop(0, `hsl(${hue}, 95%, 60%)`);
    borderGrad.addColorStop(0.5, `hsl(${(hue + 120) % 360}, 95%, 60%)`);
    borderGrad.addColorStop(1, `hsl(${(hue + 240) % 360}, 95%, 60%)`);
    ctx.fillStyle = borderGrad;
    ctx.fillRect(0, 0, w, h);

    const margin = 26;
    const innerW = w - margin * 2;
    const innerH = h - margin * 2;

    // Cosmic Fluid Plasma Background (Animated)
    const bgGrad = ctx.createRadialGradient(
      w / 2 + Math.sin(timeSec * 2.5) * 60,
      400 + Math.cos(timeSec * 2.0) * 50,
      30,
      w / 2,
      400,
      560
    );
    bgGrad.addColorStop(0, `hsl(${(hue + 60) % 360}, 90%, 75%)`);
    bgGrad.addColorStop(0.35, '#06d6a0');
    bgGrad.addColorStop(0.7, '#073b4c');
    bgGrad.addColorStop(1, '#020b14');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(margin, margin, innerW, innerH, 24);
    ctx.fill();

    // Animated Cosmic Swirling Nebula & Stars
    ctx.save();
    const cx = w / 2;
    const cy = 410;
    ctx.translate(cx, cy);

    for (let r = 0; r < 4; r++) {
      const ang = timeSec * (1.2 + r * 0.4) + (r * Math.PI) / 2;
      ctx.rotate(ang * 0.05);
      const spiral = ctx.createLinearGradient(-150, -150, 150, 150);
      spiral.addColorStop(0, 'rgba(6, 214, 160, 0.5)');
      spiral.addColorStop(0.5, 'rgba(255, 209, 102, 0.4)');
      spiral.addColorStop(1, 'rgba(239, 71, 111, 0)');
      ctx.fillStyle = spiral;
      ctx.beginPath();
      ctx.arc(Math.sin(ang) * 45, Math.cos(ang) * 45, 120 + r * 15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Twinkling animated stars
    for (let i = 0; i < 28; i++) {
      const starPhase = timeSec * 3 + i * 1.3;
      const alpha = 0.3 + 0.7 * Math.abs(Math.sin(starPhase));
      const dist = 40 + ((i * 37) % 130);
      const angle = (i * 2.4) + timeSec * 0.4;
      const sx = Math.cos(angle) * dist;
      const sy = Math.sin(angle) * dist;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5 + Math.sin(starPhase) * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Header Bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.roundRect(margin + 16, margin + 16, innerW - 32, 68, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 32px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ASTRAL WYRM', margin + 34, margin + 62);

    ctx.fillStyle = '#06d6a0';
    ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('VMAX', margin + 288, margin + 62);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('HP', w - margin - 90, margin + 62);
    ctx.font = '900 40px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('320', w - margin - 45, margin + 62);

    // Glowing Video Badge Indicator (Pulsing)
    const badgeAlpha = 0.75 + 0.25 * Math.sin(timeSec * 4);
    ctx.fillStyle = `rgba(239, 71, 111, ${badgeAlpha})`;
    ctx.beginPath();
    ctx.roundRect(cx - 85, 595, 170, 36, 18);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▶ CARTA DE VÍDEO', cx, 619);

    // Attacks Plaque
    const attackY = 660;
    ctx.fillStyle = 'rgba(5, 25, 20, 0.85)';
    ctx.beginPath();
    ctx.roundRect(margin + 16, attackY, innerW - 32, 260, 16);
    ctx.fill();
    ctx.strokeStyle = '#06d6a0';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#06d6a0';
    ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Cosmic Plasma Storm', margin + 70, attackY + 70);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd166';
    ctx.font = '900 42px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('320', w - margin - 45, attackY + 70);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#a7f3d0';
    ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Aura dinâmica fluida gravada em movimento.', margin + 70, attackY + 140);

    // Footer
    ctx.fillStyle = '#ffd166';
    ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('★★ RARA DE VÍDEO · ULTRA MOTION', margin + 35, h - margin - 20);

    texture.needsUpdate = true;
  };

  update(0);

  return { texture, update };
}

export function createBoosterNineCards(): PackCardData[] {
  const cards: PackCardData[] = [];

  // Card 1: Comum - Aqua Leviathan (Water)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d')!;
    renderElementalCard(ctx, 720, 1200, {
      name: 'Aqua Leviathan',
      element: 'Água',
      hp: 110,
      attack: 'Tidal Wave',
      damage: 80,
      rarity: '● COMUM · 012/180',
      c1: '#38bdf8',
      c2: '#0284c7',
      bg1: '#bae6fd',
      bg2: '#0369a1',
      badgeColor: '#0ea5e9',
      symbol: 'water',
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    cards.push({
      id: 'c1',
      name: 'Aqua Leviathan',
      rarity: 'common',
      rarityLabel: 'Comum',
      hp: 110,
      type: 'Água',
      texture: tex,
    });
  }

  // Card 2: Comum - Frost Wolf (Ice)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d')!;
    renderElementalCard(ctx, 720, 1200, {
      name: 'Frost Wolf',
      element: 'Gelo',
      hp: 120,
      attack: 'Blizzard Fang',
      damage: 90,
      rarity: '● COMUM · 025/180',
      c1: '#a5f3fc',
      c2: '#06b6d4',
      bg1: '#cffafe',
      bg2: '#0e7490',
      badgeColor: '#06b6d4',
      symbol: 'ice',
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    cards.push({
      id: 'c2',
      name: 'Frost Wolf',
      rarity: 'common',
      rarityLabel: 'Comum',
      hp: 120,
      type: 'Gelo',
      texture: tex,
    });
  }

  // Card 3: Comum - Terra Titan (Earth)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d')!;
    renderElementalCard(ctx, 720, 1200, {
      name: 'Terra Titan',
      element: 'Terra',
      hp: 130,
      attack: 'Seismic Quake',
      damage: 100,
      rarity: '● COMUM · 048/180',
      c1: '#fcd34d',
      c2: '#d97706',
      bg1: '#fef3c7',
      bg2: '#92400e',
      badgeColor: '#d97706',
      symbol: 'earth',
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    cards.push({
      id: 'c3',
      name: 'Terra Titan',
      rarity: 'common',
      rarityLabel: 'Comum',
      hp: 130,
      type: 'Terra',
      texture: tex,
    });
  }

  // Card 4: Incomum - Gale Falcon (Wind)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d')!;
    renderElementalCard(ctx, 720, 1200, {
      name: 'Gale Falcon',
      element: 'Vento',
      hp: 140,
      attack: 'Aero Cyclone',
      damage: 110,
      rarity: '◆ INCOMUM · 072/180',
      c1: '#6ee7b7',
      c2: '#059669',
      bg1: '#d1fae5',
      bg2: '#065f46',
      badgeColor: '#10b981',
      symbol: 'wind',
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    cards.push({
      id: 'c4',
      name: 'Gale Falcon',
      rarity: 'uncommon',
      rarityLabel: 'Incomum',
      hp: 140,
      type: 'Vento',
      texture: tex,
    });
  }

  // Card 5: Incomum - Umbra Phantom (Shadow)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d')!;
    renderElementalCard(ctx, 720, 1200, {
      name: 'Umbra Phantom',
      element: 'Sombra',
      hp: 150,
      attack: 'Void Strike',
      damage: 120,
      rarity: '◆ INCOMUM · 094/180',
      c1: '#c084fc',
      c2: '#7e22ce',
      bg1: '#f3e8ff',
      bg2: '#581c87',
      badgeColor: '#9333ea',
      symbol: 'shadow',
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    cards.push({
      id: 'c5',
      name: 'Umbra Phantom',
      rarity: 'uncommon',
      rarityLabel: 'Incomum',
      hp: 150,
      type: 'Sombra',
      texture: tex,
    });
  }

  // Card 6: Incomum - Solar Phoenix (Solar)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d')!;
    renderElementalCard(ctx, 720, 1200, {
      name: 'Solar Phoenix',
      element: 'Solar',
      hp: 160,
      attack: 'Solar Flare',
      damage: 130,
      rarity: '◆ INCOMUM · 112/180',
      c1: '#fdba74',
      c2: '#ea580c',
      bg1: '#ffedd5',
      bg2: '#9a3412',
      badgeColor: '#f97316',
      symbol: 'sun',
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    cards.push({
      id: 'c6',
      name: 'Solar Phoenix',
      rarity: 'uncommon',
      rarityLabel: 'Incomum',
      hp: 160,
      type: 'Solar',
      texture: tex,
    });
  }

  // Card 7: RARA ★ - Volt Beast V (Ultra Rare)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d')!;
    renderPikachuV(ctx, 720, 1200);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    cards.push({
      id: 'c7',
      name: 'Volt Beast V',
      rarity: 'rare',
      rarityLabel: 'Rara Holográfica ★',
      hp: 190,
      type: 'Elétrico',
      texture: tex,
    });
  }

  // Card 8: RARA VÍDEO ★★ - Astral Wyrm VMAX (Carta de Vídeo Dinâmica)
  {
    const videoData = createDynamicVideoCardTexture();
    cards.push({
      id: 'c8',
      name: 'Astral Wyrm VMAX',
      rarity: 'rare',
      rarityLabel: 'Rara de Vídeo ★★',
      hp: 320,
      type: 'Dragão Astral',
      isVideo: true,
      texture: videoData.texture,
      update: videoData.update,
    });
  }

  // Card 9: LENDÁRIA ★★★ - Ignis Dragon Sovereign VMAX (Secret Rare / Dourada Lendária)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d')!;
    renderCharizardVMAX(ctx, 720, 1200);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    cards.push({
      id: 'c9',
      name: 'Ignis Dragon Sovereign VMAX',
      rarity: 'legendary',
      rarityLabel: 'Lendária Secreta ★★★',
      hp: 340,
      type: 'Fogo Celestial',
      texture: tex,
    });
  }

  return cards;
}

export function createSparkleSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const cx = 128;
  const cy = 128;

  ctx.clearRect(0, 0, 256, 256);

  // Soft iridescent outer bloom glow
  const bloomGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
  bloomGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
  bloomGlow.addColorStop(0.2, 'rgba(255, 240, 160, 0.9)');
  bloomGlow.addColorStop(0.45, 'rgba(0, 240, 255, 0.5)');
  bloomGlow.addColorStop(0.7, 'rgba(255, 60, 190, 0.25)');
  bloomGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = bloomGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, Math.PI * 2);
  ctx.fill();

  // 8-point radiant diffraction star (Long primary rays)
  const drawStarRay = (angle: number, length: number, width: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -length);
    ctx.bezierCurveTo(width, -length * 0.2, width, -width, width * 2, 0);
    ctx.bezierCurveTo(width, width, width, length * 0.2, 0, length);
    ctx.bezierCurveTo(-width, length * 0.2, -width, width, -width * 2, 0);
    ctx.bezierCurveTo(-width, -width, -width, -length * 0.2, 0, -length);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Primary 4 cardinal rays
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  drawStarRay(0, 118, 5);
  drawStarRay(Math.PI / 2, 118, 5);

  // Diagonal 4 secondary rays
  ctx.fillStyle = 'rgba(255, 248, 200, 0.85)';
  drawStarRay(Math.PI / 4, 75, 3.5);
  drawStarRay(-Math.PI / 4, 75, 3.5);

  // Central intense diamond core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates high-resolution holographic light beam (feixe de luz) texture:
 * a sharp laser core bordered by prismatic rainbow chromatic fringes
 * with vertical feathered falloff.
 */
export function createHoloLightBeamTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 512);

  // Holographic beam with bright central laser core and chromatic prismatic edges
  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.15, 'rgba(0, 240, 255, 0.25)'); // cyan fringe
  grad.addColorStop(0.30, 'rgba(120, 255, 200, 0.55)'); // electric mint/teal
  grad.addColorStop(0.42, 'rgba(255, 245, 160, 0.9)'); // golden sheen
  grad.addColorStop(0.50, 'rgba(255, 255, 255, 1.0)'); // blinding razor-sharp white laser core
  grad.addColorStop(0.58, 'rgba(255, 100, 210, 0.9)'); // electric magenta
  grad.addColorStop(0.70, 'rgba(160, 60, 255, 0.55)'); // violet fringe
  grad.addColorStop(0.85, 'rgba(0, 200, 255, 0.25)'); // electric blue
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Apply soft vertical falloff (feathering top and bottom so the beam fades out gracefully)
  ctx.globalCompositeOperation = 'destination-in';
  const vGrad = ctx.createLinearGradient(0, 0, 0, 512);
  vGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
  vGrad.addColorStop(0.18, 'rgba(0, 0, 0, 1)');
  vGrad.addColorStop(0.82, 'rgba(0, 0, 0, 1)');
  vGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, 512, 512);
  ctx.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}


