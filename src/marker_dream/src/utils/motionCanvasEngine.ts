// ============================================================================
// Motor de Movimento, Deformação de Malha e VFX Canvas 2D
// Implementado a partir da especificação técnica oficial MotionBrush Studio
// ============================================================================

export type EffectType =
  | 'none'
  | 'water'
  | 'vortex'
  | 'gelatin'
  | 'jelly'
  | 'wind'
  | 'rotation'
  | 'pulse'
  | 'fire'
  | 'pendulum'
  | 'glow'
  | 'glitter'
  | 'smoke'
  | 'fireflies'
  | 'sparks'
  | 'cloth'
  | 'flag';

export interface LayerStroke {
  id: string;
  points: { x: number; y: number }[];
  brushSize: number;
}

export interface MotionConfig {
  effectType: EffectType;
  speed?: number; // Multiplicador de velocidade (ex: 0.2 a 3.5, padrão 1.0)
  intensity?: number; // Multiplicador de amplitude/força (ex: 0.2 a 3.5, padrão 1.0)
  brushSize?: number;
  strokes?: LayerStroke[];
}

export interface MeshVertex {
  ox: number; // Posição original X
  oy: number; // Posição original Y
  x: number;  // Posição deformada X
  y: number;  // Posição deformada Y
  weight: number; // Peso gaussiano (0 a 1)
  r: number;  // Linha na grade
  c: number;  // Coluna na grade
}

export interface MeshGrid {
  cols: number;
  rows: number;
  vertices: MeshVertex[][];
  width: number;
  height: number;
}

// ----------------------------------------------------------------------------
// 1. Funções Matemáticas Fundamentais
// ----------------------------------------------------------------------------

/**
 * Distância euclidiana mínima de um ponto P a um segmento de reta AB
 */
export function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * Hash pseudo-aleatório determinístico 2D para partículas procedurais
 */
export function hash2D(x: number, y: number, seed: number): number {
  const v = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.123) * 43758.5453;
  return v - Math.floor(v);
}

// ----------------------------------------------------------------------------
// 2. Texturização por Triângulos Afins (Affine Texture Mapping)
// ----------------------------------------------------------------------------

/**
 * Mapeia e distorce um triângulo da imagem fonte para as coordenadas de destino
 * usando uma matriz afim 2D e recorte (clip).
 */
export function drawTriangleTextured(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  u0: number, v0: number,
  u1: number, v1: number,
  u2: number, v2: number,
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.clip();

  const det = (u0 - u2) * (v1 - v2) - (u1 - u2) * (v0 - v2);
  if (Math.abs(det) < 0.0001) {
    ctx.restore();
    return;
  }

  const a = ((x0 - x2) * (v1 - v2) - (x1 - x2) * (v0 - v2)) / det;
  const b = ((x1 - x2) * (u0 - u2) - (x0 - x2) * (u1 - u2)) / det;
  const c = x2 - (a * u2 + b * v2);

  const d = ((y0 - y2) * (v1 - v2) - (y1 - y2) * (v0 - v2)) / det;
  const e = ((y1 - y2) * (u0 - u2) - (y0 - y2) * (u1 - u2)) / det;
  const f = y2 - (d * u2 + e * v2);

  ctx.transform(a, d, b, e, c, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

// ----------------------------------------------------------------------------
// 3. Inicialização e Atualização da Malha de Deformação (MeshGrid)
// ----------------------------------------------------------------------------

export function createMeshGrid(
  width: number,
  height: number,
  cols = 32,
  rows = 32
): MeshGrid {
  const vertices: MeshVertex[][] = [];
  const dx = width / cols;
  const dy = height / rows;

  for (let r = 0; r <= rows; r++) {
    const rowVertices: MeshVertex[] = [];
    for (let c = 0; c <= cols; c++) {
      const ox = Math.min(width, c * dx);
      const oy = Math.min(height, r * dy);
      rowVertices.push({
        ox,
        oy,
        x: ox,
        y: oy,
        weight: 1.0, // Peso base: 1.0 se não houver traços específicos
        r,
        c,
      });
    }
    vertices.push(rowVertices);
  }

  return { cols, rows, vertices, width, height };
}

/**
 * Calcula o peso gaussiano para cada vértice com base nos traços pintados.
 * Se strokes estiver vazio, aplica peso uniforme ou com bordas suaves.
 */
export function computeMeshWeights(
  grid: MeshGrid,
  strokes?: LayerStroke[]
) {
  const hasStrokes = strokes && strokes.length > 0 && strokes.some((s) => s.points.length > 0);

  for (let r = 0; r <= grid.rows; r++) {
    for (let c = 0; c <= grid.cols; c++) {
      const v = grid.vertices[r][c];

      if (!hasStrokes) {
        // Sem traços específicos: o efeito é aplicado no asset todo,
        // com decaimento suave bem perto das bordas externas para não rasgar.
        const marginX = grid.width * 0.05;
        const marginY = grid.height * 0.05;
        const fx = Math.min(1, Math.min(v.ox, grid.width - v.ox) / marginX);
        const fy = Math.min(1, Math.min(v.oy, grid.height - v.oy) / marginY);
        v.weight = Math.max(0.2, Math.min(1, fx * fy));
        continue;
      }

      // Com traços pintados: decaimento gaussiano estrito
      let maxWeight = 0;
      for (const stroke of strokes!) {
        const pts = stroke.points;
        if (pts.length === 0) continue;
        const radius = Math.max(8, stroke.brushSize * 0.55);

        if (pts.length === 1) {
          const dist = Math.hypot(v.ox - pts[0].x, v.oy - pts[0].y);
          if (dist < stroke.brushSize * 1.5) {
            const w = Math.exp(-0.5 * Math.pow(dist / radius, 2));
            if (w > maxWeight) maxWeight = w;
          }
          continue;
        }

        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[i];
          const p1 = pts[i + 1];
          const dist = distToSegment(v.ox, v.oy, p0.x, p0.y, p1.x, p1.y);
          if (dist < stroke.brushSize * 1.5) {
            const w = Math.exp(-0.5 * Math.pow(dist / radius, 2));
            if (w > maxWeight) maxWeight = w;
          }
        }
      }

      v.weight = maxWeight;
    }
  }
}

// ----------------------------------------------------------------------------
// 4. Equações dos 8 Modos de Malha
// ----------------------------------------------------------------------------

export function updateMeshDeformation(
  grid: MeshGrid,
  effect: EffectType,
  timeSec: number,
  speed = 1.0,
  intensity = 1.0
) {
  const phase = timeSec * speed * 4.0;
  const sInt = intensity;
  const cx = grid.width / 2;
  const cy = grid.height / 2;

  const isMeshEffect = [
    'water',
    'vortex',
    'gelatin',
    'jelly',
    'rotation',
    'wind',
    'fire',
    'pendulum',
    'pulse',
    'cloth',
    'flag',
  ].includes(effect);

  if (!isMeshEffect) return;

  for (let r = 0; r <= grid.rows; r++) {
    for (let c = 0; c <= grid.cols; c++) {
      const v = grid.vertices[r][c];
      if (v.weight <= 0.001) {
        v.x = v.ox;
        v.y = v.oy;
        continue;
      }

      let targetX = v.ox;
      let targetY = v.oy;

      switch (effect) {
        case 'water': {
          // 1. Água Correndo: fluxo líquido contínuo com ondas bidirecionais
          targetX = v.ox + Math.sin(phase * 2 + v.oy * 0.02) * (6 * sInt);
          targetY = v.oy + Math.cos(phase * 3 + v.ox * 0.02) * (12 * sInt);
          break;
        }

        case 'vortex': {
          // 2. Vórtice / Redemoinho: torção radial centrada
          const dx = v.ox - cx;
          const dy = v.oy - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = phase + dist * 0.005;
          const currentAngle = Math.atan2(dy, dx) + angle * 0.12 * sInt;
          const radius = dist * (1 + Math.sin(phase * 1.5) * 0.03 * sInt);
          targetX = cx + Math.cos(currentAngle) * radius;
          targetY = cy + Math.sin(currentAngle) * radius;
          break;
        }

        case 'gelatin':
        case 'jelly': {
          // 3. Gelatina Elástica: oscilação elástica wobbly cruzada
          targetX = v.ox + Math.sin(phase + r * 0.3) * (8 * sInt);
          targetY = v.oy + Math.cos(phase * 1.2 + c * 0.3) * (8 * sInt);
          break;
        }

        case 'rotation': {
          // 4. Torção Angular: balanço angular periódico ao redor do centro
          const dx = v.ox - cx;
          const dy = v.oy - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const rotAngle = Math.sin(phase) * 0.09 * sInt;
          const curA = Math.atan2(dy, dx) + rotAngle;
          targetX = cx + Math.cos(curA) * dist;
          targetY = cy + Math.sin(curA) * dist;
          break;
        }

        case 'wind': {
          // 5. Vento / Balanço: balanço lateral orgânico
          targetX = v.ox + Math.sin(phase + v.oy * 0.01) * (14 * sInt);
          targetY = v.oy;
          break;
        }

        case 'fire': {
          // 6. Fogo / Convecção Térmica: tremulação térmica com subida vetorial (-Y)
          targetX = v.ox + Math.sin(phase * 3.5 + v.oy * 0.04) * (7 * sInt);
          targetY =
            v.oy -
            (Math.abs(Math.sin(phase * 2.5 + v.ox * 0.03)) * (10 * sInt) +
              Math.sin(phase * 1.5) * 2);
          break;
        }

        case 'pendulum': {
          // 7. Pêndulo Invertido: cinemática de arco oscilante com pivô na base
          const pivotX = cx;
          const pivotY = grid.height;
          const pdx = v.ox - pivotX;
          const pdy = v.oy - pivotY;
          const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
          const pAngle = Math.atan2(pdy, pdx) + Math.sin(phase * 1.2) * 0.07 * sInt;
          targetX = pivotX + Math.cos(pAngle) * pDist;
          targetY = pivotY + Math.sin(pAngle) * pDist;
          break;
        }

        case 'pulse': {
          // 8. Pulsar & Zoom: expansão e contração rítmica a partir do centro
          const dx = v.ox - cx;
          const dy = v.oy - cy;
          const scale = 1 + Math.sin(phase * 2.5) * 0.05 * sInt;
          targetX = cx + dx * scale;
          targetY = cy + dy * scale;
          break;
        }
        case 'cloth': {
          // 9. Tecido / Manto / Capa: ondulações verticais com gravidade e caimento livre
          const normY = v.oy / Math.max(1, grid.height);
          const normX = v.ox / Math.max(1, grid.width);
          const freedom = Math.pow(normY, 1.25);
          const waveX = Math.sin(phase * 1.5 + normY * 4.8) * (18 * sInt * freedom);
          const waveY = Math.cos(phase * 1.2 + normX * 3.5) * (8 * sInt * freedom);
          const drapeSag = Math.sin(normX * Math.PI) * (12 * sInt * freedom);
          targetX = v.ox + waveX;
          targetY = v.oy + waveY + drapeSag;
          break;
        }

        case 'flag': {
          // 10. Bandeira ao Vento: rajadas e ondulação progressiva com ponta trepidando
          const normX = v.ox / Math.max(1, grid.width);
          const factor = Math.pow(Math.max(0.01, normX), 1.35);
          const mainWave = Math.sin(phase * 3.4 - normX * 7.2) * (26 * sInt * factor);
          const fastFlutter = Math.sin(phase * 7.6 - normX * 13.0) * (9 * sInt * factor);
          const rippleX = Math.cos(phase * 3.4 - normX * 7.2) * (7 * sInt * factor);
          targetX = v.ox - rippleX;
          targetY = v.oy + mainWave + fastFlutter;
          break;
        }
      }

      // Interpolação suave pelo peso gaussiano
      v.x = v.ox + (targetX - v.ox) * v.weight;
      v.y = v.oy + (targetY - v.oy) * v.weight;
    }
  }
}

/**
 * Atualiza malha densa específica para camadas de peças (Tecido & Bandeira)
 */
export function updateClothFlagMesh(
  grid: MeshGrid,
  mode: 'cloth' | 'flag',
  timeSec: number,
  speed = 1.0,
  intensity = 1.0,
  pivotX = 0.5,
  pivotY = 0.1,
  options?: {
    clothSag?: number;
    flagWindAngle?: number;
    flagRippleFreq?: number;
  }
) {
  const sagFactor = options?.clothSag ?? 1.0;
  const windAngleDeg = options?.flagWindAngle ?? 0;
  const windAngleRad = (windAngleDeg * Math.PI) / 180;
  const rippleFreq = options?.flagRippleFreq ?? 1.0;

  const phase = timeSec * speed * 3.8;
  const sInt = intensity;

  const cosW = Math.cos(windAngleRad);
  const sinW = Math.sin(windAngleRad);

  for (let r = 0; r <= grid.rows; r++) {
    for (let c = 0; c <= grid.cols; c++) {
      const v = grid.vertices[r][c];
      const normX = v.ox / Math.max(1, grid.width);
      const normY = v.oy / Math.max(1, grid.height);

      if (mode === 'cloth') {
        const distFromPivotY = Math.max(0, (v.oy - grid.height * pivotY) / Math.max(1, grid.height));
        const freedom = Math.pow(Math.max(0.02, distFromPivotY), 1.2);
        const waveX = Math.sin(phase * 1.5 + normY * 4.8) * (20 * sInt * freedom);
        const waveY = Math.cos(phase * 1.2 + normX * 3.5) * (9 * sInt * freedom);
        const drapeSag = Math.sin(normX * Math.PI) * (14 * sInt * freedom * sagFactor);
        v.x = v.ox + waveX;
        v.y = v.oy + waveY + drapeSag;
      } else {
        const distFromMast = Math.max(0, (v.ox - grid.width * pivotX) / Math.max(1, grid.width));
        const factor = Math.pow(Math.max(0.02, distFromMast), 1.35);
        const mainWave = Math.sin((phase * 3.4 - normX * 7.2) * rippleFreq) * (28 * sInt * factor);
        const microFlutter = Math.sin((phase * 7.6 - normX * 13.0) * rippleFreq) * (10 * sInt * factor);
        const rippleX = Math.cos((phase * 3.4 - normX * 7.2) * rippleFreq) * (8 * sInt * factor);
        const totalWave = mainWave + microFlutter;

        // Se windAngleDeg for 0 (vento horizontal padrão), cosW=1 e sinW=0 mantêm o cálculo 100% idêntico
        const dx = -rippleX * cosW - totalWave * sinW;
        const dy = -rippleX * sinW + totalWave * cosW;

        v.x = v.ox + dx;
        v.y = v.oy + dy;
      }
    }
  }
}

/**
 * Renderiza todos os triângulos da malha deformada para o contexto
 */
export function renderDeformedMesh(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  grid: MeshGrid
) {
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const v00 = grid.vertices[r][c];
      const v10 = grid.vertices[r][c + 1];
      const v01 = grid.vertices[r + 1][c];
      const v11 = grid.vertices[r + 1][c + 1];

      // Triângulo 1 (superior esquerdo)
      drawTriangleTextured(
        ctx,
        img,
        v00.ox, v00.oy,
        v10.ox, v10.oy,
        v01.ox, v01.oy,
        v00.x, v00.y,
        v10.x, v10.y,
        v01.x, v01.y
      );

      // Triângulo 2 (inferior direito)
      drawTriangleTextured(
        ctx,
        img,
        v10.ox, v10.oy,
        v11.ox, v11.oy,
        v01.ox, v01.oy,
        v10.x, v10.y,
        v11.x, v11.y,
        v01.x, v01.y
      );
    }
  }
}

// ----------------------------------------------------------------------------
// 5. Motores dos 5 Efeitos VFX de Luz e Partículas
// ----------------------------------------------------------------------------

/**
 * 3.1 Make This Bright (glow): Luz 3D Volumétrica Phong com Relevo Sobel
 */
export function renderGlowVFX(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  speed = 1.0,
  intensity = 1.0,
  strokes?: LayerStroke[]
) {
  const phase = timeSec * speed * 3.0;
  const sInt = intensity;
  const bSize = (strokes?.[0]?.brushSize || 40);
  const cx = width / 2;
  const cy = height / 2;

  // Posição da luz deslizando ou centrada
  let effLx = cx + Math.sin(phase) * (width * 0.25);
  let effLy = cy + Math.cos(phase * 0.8) * (height * 0.25);

  if (strokes && strokes.length > 0 && strokes[0].points.length > 0) {
    const pts = strokes[0].points;
    const progress = (Math.sin(phase) * 0.5 + 0.5) * (pts.length - 1);
    const idx = Math.floor(progress);
    const frac = progress - idx;
    const pA = pts[idx];
    const pB = pts[Math.min(pts.length - 1, idx + 1)];
    effLx = pA.x + (pB.x - pA.x) * frac;
    effLy = pA.y + (pB.y - pA.y) * frac;
  }

  const lightRadius = Math.max(30, bSize * 2.2 * sInt);

  // Halo volumétrico com modo color-dodge / lighter
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 1. Halo difuso grande
  const grad1 = ctx.createRadialGradient(effLx, effLy, 0, effLx, effLy, lightRadius);
  grad1.addColorStop(0, `rgba(255, 230, 160, ${0.45 * sInt})`);
  grad1.addColorStop(0.35, `rgba(245, 158, 11, ${0.28 * sInt})`);
  grad1.addColorStop(0.7, `rgba(217, 119, 6, ${0.12 * sInt})`);
  grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad1;
  ctx.beginPath();
  ctx.arc(effLx, effLy, lightRadius, 0, Math.PI * 2);
  ctx.fill();

  // 2. Núcleo incandescente de alta energia
  const coreRadius = lightRadius * 0.3;
  const grad2 = ctx.createRadialGradient(effLx, effLy, 0, effLx, effLy, coreRadius);
  grad2.addColorStop(0, `rgba(255, 255, 255, ${0.9 * sInt})`);
  grad2.addColorStop(0.4, `rgba(254, 243, 199, ${0.65 * sInt})`);
  grad2.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = grad2;
  ctx.beginPath();
  ctx.arc(effLx, effLy, coreRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 3.2 Mini-Glitter Procedural: Micro-partículas cintilantes estocásticas
 */
export function renderGlitterVFX(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  speed = 1.0,
  intensity = 1.0,
  strokes?: LayerStroke[]
) {
  const phase = timeSec * speed * 3.5;
  const sInt = intensity;
  const count = 48;
  const bSize = Math.max(30, (strokes?.[0]?.brushSize || 45));

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Pontos base para emitir glitter
  let basePoints: { x: number; y: number }[] = [];
  if (strokes && strokes.length > 0) {
    for (const st of strokes) {
      basePoints.push(...st.points);
    }
  }
  if (basePoints.length === 0) {
    basePoints = [
      { x: width * 0.3, y: height * 0.3 },
      { x: width * 0.5, y: height * 0.5 },
      { x: width * 0.7, y: height * 0.7 },
      { x: width * 0.4, y: height * 0.6 },
    ];
  }

  for (let i = 0; i < count; i++) {
    const base = basePoints[i % basePoints.length];
    const h1 = hash2D(base.x, base.y, i * 7.13);
    const h2 = hash2D(base.y, base.x, i * 13.37);
    const angle = h1 * Math.PI * 2;
    const r = Math.sqrt(h2) * bSize * 0.95;
    const gx = base.x + Math.cos(angle) * r;
    const gy = base.y + Math.sin(angle) * r;

    const freq = 1.8 + h1 * 2.2;
    const tOffset = h2 * Math.PI * 2;
    const sinVal = Math.sin(phase * freq + tOffset);
    const specular = Math.pow(Math.max(0, sinVal), 9) * sInt;

    if (specular <= 0.05) continue;

    const pSize = (1.2 + h1 * 2.2) * (specular * 1.3);

    // Micro ponto diamante
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, specular * 1.2)})`;
    ctx.fillRect(gx - pSize / 2, gy - pSize / 2, pSize, pSize);

    // Se pico alto, desenha micro-flare óptico em cruz (+)
    if (specular > 0.45) {
      const flareLen = pSize * 3.8;
      ctx.strokeStyle = `rgba(186, 230, 253, ${specular * 0.75})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx - flareLen, gy);
      ctx.lineTo(gx + flareLen, gy);
      ctx.moveTo(gx, gy - flareLen);
      ctx.lineTo(gx, gy + flareLen);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * 3.3 Fumaça Densa Volumétrica com Curl Noise (Suporta micro-tamanhos finos a partir de 1px)
 */
export function renderSmokeVFX(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  speed = 1.0,
  intensity = 1.0,
  strokes?: LayerStroke[]
) {
  const phase = timeSec * speed * 2.0;
  const sInt = intensity;
  const bSize = Math.max(1, (strokes?.[0]?.brushSize || 20));
  const pts = strokes?.[0]?.points || [];
  const puffCount = Math.max(6, Math.min(24, Math.round(14 * Math.max(0.5, bSize / 15))));

  let basePoints = [{ x: width / 2, y: height * 0.8 }];
  if (pts.length > 0) {
    basePoints = pts;
  }

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  for (let i = 0; i < puffCount; i++) {
    const baseOrigin = basePoints[i % basePoints.length];
    const cycle = (phase * 0.4 + i / puffCount) % 1.0;
    const life = cycle; // 0 a 1
    const seed = i * 4.31;

    const upwardRise = life * (bSize * 3.2);
    const curlX =
      Math.sin(life * 4.5 + phase * 1.8 + seed) * (bSize * 0.62 * sInt) +
      Math.cos(life * 2.2 - phase * 0.9) * (bSize * 0.35);

    const px = baseOrigin.x + curlX;
    const py = baseOrigin.y - upwardRise;
    const radius = Math.max(0.8, bSize * (0.35 + life * 0.9));
    const density = Math.sin(life * Math.PI) * (0.45 * sInt);

    if (density <= 0.01) continue;

    const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
    grad.addColorStop(0, `rgba(180, 192, 208, ${density * 1.3})`);
    grad.addColorStop(0.5, `rgba(160, 175, 195, ${density * 0.9})`);
    grad.addColorStop(1, 'rgba(215, 225, 238, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * 3.4 Vagalumes Bioluminescentes com Deriva Orgânica Lissajous
 */
export function renderFirefliesVFX(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  speed = 1.0,
  intensity = 1.0,
  strokes?: LayerStroke[]
) {
  const phase = timeSec * speed * 1.6;
  const sInt = intensity;
  const count = 16;
  const bSize = Math.max(2, (strokes?.[0]?.brushSize || 30));

  let cx = width / 2;
  let cy = height / 2;
  if (strokes && strokes.length > 0 && strokes[0].points.length > 0) {
    cx = strokes[0].points[0].x;
    cy = strokes[0].points[0].y;
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (let m = 0; m < count; m++) {
    const driftPhase = phase * 0.85 + m * 2.4;
    const wanderX =
      Math.sin(driftPhase * 1.2 + m) * (bSize * 0.85) +
      Math.cos(driftPhase * 0.65) * (bSize * 0.4);
    const wanderY =
      Math.cos(driftPhase * 0.9 + m * 1.5) * (bSize * 0.85) -
      ((phase * 9 + m * 11) % (bSize * 2.4)) + (bSize * 0.6);

    const fx = cx + wanderX;
    const fy = cy + wanderY;

    // Respiração luminosa suave
    const glowPulse = Math.sin(driftPhase * 3.0 + m) * 0.4 + 0.6;
    const radius = Math.max(1, (1.8 + glowPulse * 2.5) * sInt * (bSize / 20));

    const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, radius * 3.0);
    grad.addColorStop(0, `rgba(255, 255, 230, ${0.95 * sInt})`);
    grad.addColorStop(0.3, `rgba(250, 204, 21, ${0.65 * glowPulse * sInt})`);
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(fx, fy, radius * 3.0, 0, Math.PI * 2);
    ctx.fill();

    // Ponto central brilhante
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(fx, fy, Math.max(0.6, radius * 0.3), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * 3.5 Arco Elétrico & Descarga de Plasma Fractal (Lichtenberg)
 */
export function renderSparksVFX(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  speed = 1.0,
  intensity = 1.0,
  strokes?: LayerStroke[]
) {
  const phase = timeSec * speed * 12.0;
  const sInt = intensity;
  const bSize = Math.max(2, (strokes?.[0]?.brushSize || 30));

  let start = { x: width * 0.2, y: height * 0.5 };
  let end = { x: width * 0.8, y: height * 0.5 };

  if (strokes && strokes.length > 0 && strokes[0].points.length >= 2) {
    const pts = strokes[0].points;
    start = pts[0];
    end = pts[pts.length - 1];
  } else if (strokes && strokes.length > 0 && strokes[0].points.length === 1) {
    start = { x: strokes[0].points[0].x - bSize, y: strokes[0].points[0].y };
    end = { x: strokes[0].points[0].x + bSize, y: strokes[0].points[0].y };
  }

  const steps = 14;
  const points: { x: number; y: number }[] = [];
  const boltSeed = Math.floor(phase);

  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const baseX = start.x + (end.x - start.x) * t;
    const baseY = start.y + (end.y - start.y) * t;
    const jNoise =
      Math.sin(phase + s * 7.7) * (bSize * 0.38 * sInt) +
      (hash2D(baseX, baseY, boltSeed) - 0.5) * (bSize * 0.42 * sInt);

    // Deslocamento perpendicular
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy) || 1;
    const perpX = -dy / len;
    const perpY = dx / len;

    points.push({
      x: baseX + perpX * jNoise,
      y: baseY + perpY * jNoise,
    });
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Bainha de ozônio ionizado violeta
  ctx.strokeStyle = `rgba(168, 85, 247, ${0.45 * sInt})`;
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 18;
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  // 2. Manto de plasma ciano
  ctx.strokeStyle = `rgba(56, 189, 248, ${0.85 * sInt})`;
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 9;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  // 3. Filamento central branco
  ctx.strokeStyle = '#ffffff';
  ctx.shadowBlur = 2;
  ctx.lineWidth = 0.95;
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  ctx.restore();
}

// ----------------------------------------------------------------------------
// 6. Lista Oficial de Efeitos com Metadados & Rótulos
// ----------------------------------------------------------------------------

export interface EffectMeta {
  id: EffectType;
  label: string;
  category: 'mesh' | 'vfx';
  icon: string;
  description: string;
}

export const OFFICIAL_EFFECTS: EffectMeta[] = [
  { id: 'none', label: 'Nenhum', category: 'mesh', icon: '⚪', description: 'Sem efeitos ativos' },
  // 1. Efeito Clássico Original
  { id: 'jelly', label: 'Gelatina Padrão (NPC / Original)', category: 'mesh', icon: '🍮', description: 'Squash & stretch clássico idêntico ao do herói e dos NPCs (padrão do jogo)' },
  // 7 Efeitos de Malha
  { id: 'water', label: 'Água Correndo', category: 'mesh', icon: '🌊', description: 'Fluxo líquido com ondas sinusoidais contínuas' },
  { id: 'vortex', label: 'Vórtice / Redemoinho', category: 'mesh', icon: '🌀', description: 'Torção angular radial centrada' },
  { id: 'rotation', label: 'Torção Angular', category: 'mesh', icon: '🔄', description: 'Balanço rotacional periódico ao redor do eixo' },
  { id: 'wind', label: 'Vento / Balanço', category: 'mesh', icon: '💨', description: 'Balanço orgânico lateral no eixo X' },
  { id: 'fire', label: 'Fogo / Convecção', category: 'mesh', icon: '🔥', description: 'Tremulação térmica com empuxo ascendente -Y' },
  { id: 'pendulum', label: 'Pêndulo Invertido', category: 'mesh', icon: '⏱️', description: 'Cinemática pendular física com pivô na base' },
  { id: 'pulse', label: 'Pulsar & Zoom', category: 'mesh', icon: '💓', description: 'Expansão e contração rítmica a partir do centro' },
];

export function isVfxOverlayEffect(effect?: string): boolean {
  return ['glow', 'glitter', 'smoke', 'fireflies', 'sparks'].includes(effect || '');
}

function parseHexToRgb(hex?: string): [number, number, number] {
  if (!hex) return [2, 132, 199];
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [2, 132, 199];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// ============================================================================
// TEXTURA DE ÁGUA REPETITIVA EM PNG (FLUXO CONTÍNUO DENTRO DA MÁSCARA PINCELADA)
// ============================================================================

const waterTextureImageCache = new Map<string, HTMLImageElement>();

export function getWaterTextureImage(url: string): HTMLImageElement | null {
  if (!url) return null;
  let img = waterTextureImageCache.get(url);
  if (!img) {
    img = new Image();
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.src = url;
    waterTextureImageCache.set(url, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

let cachedDefaultWaterCanvas: HTMLCanvasElement | null = null;

function getDefaultWaterPatternCanvas(): HTMLCanvasElement {
  if (cachedDefaultWaterCanvas) return cachedDefaultWaterCanvas;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = 'rgba(255, 255, 255, 0)';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  for (let y = 16; y <= 128; y += 32) {
    ctx.beginPath();
    for (let x = 0; x <= 128; x += 4) {
      const wave = Math.sin((x / 128) * Math.PI * 4) * 4;
      if (x === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }

  cachedDefaultWaterCanvas = canvas;
  return canvas;
}

const MAX_WATER_BUFFER_DIM = 2048;
let sharedWaterCanvas: HTMLCanvasElement | null = null;
let sharedWaterCtx: CanvasRenderingContext2D | null = null;

function getSharedWaterBuffer(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const safeW = Math.max(32, Math.min(MAX_WATER_BUFFER_DIM, Math.ceil(w)));
  const safeH = Math.max(32, Math.min(MAX_WATER_BUFFER_DIM, Math.ceil(h)));
  if (!sharedWaterCanvas) {
    sharedWaterCanvas = document.createElement('canvas');
    sharedWaterCanvas.width = safeW;
    sharedWaterCanvas.height = safeH;
    sharedWaterCtx = sharedWaterCanvas.getContext('2d');
  } else {
    if (sharedWaterCanvas.width < safeW || sharedWaterCanvas.height < safeH) {
      sharedWaterCanvas.width = Math.min(MAX_WATER_BUFFER_DIM, Math.max(sharedWaterCanvas.width, safeW));
      sharedWaterCanvas.height = Math.min(MAX_WATER_BUFFER_DIM, Math.max(sharedWaterCanvas.height, safeH));
      sharedWaterCtx = sharedWaterCanvas.getContext('2d');
    }
  }
  if (!sharedWaterCtx) return null;
  return { canvas: sharedWaterCanvas, ctx: sharedWaterCtx };
}

type WaterOverlayItem = {
  effect: string;
  brushSize: number;
  scale?: number;
  speed: number;
  intensity: number;
  points: { x: number; y: number }[];
  color?: string;
  waterTexturePng?: string;
  textureScale?: number;
  flowSpeed?: number;
  flowAngle?: number;
  textureOpacity?: number;
};

function renderSingleWaterCluster(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  clusterOverlays: WaterOverlayItem[]
) {
  if (!clusterOverlays || clusterOverlays.length === 0) return;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxEffectiveBrush = 40;

  for (const ov of clusterOverlays) {
    if (!ov.points || ov.points.length === 0) continue;
    const eff = Math.max(1, (ov.brushSize || 42) * (ov.scale ?? 1.0));
    if (eff > maxEffectiveBrush) maxEffectiveBrush = eff;
    for (const p of ov.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }

  if (!Number.isFinite(minX)) return;

  const pad = maxEffectiveBrush + 24;
  const bx = Math.max(0, Math.floor(minX - pad));
  const by = Math.max(0, Math.floor(minY - pad));
  const bw = Math.min(width - bx, Math.min(MAX_WATER_BUFFER_DIM, Math.ceil(maxX - minX + pad * 2)));
  const bh = Math.min(height - by, Math.min(MAX_WATER_BUFFER_DIM, Math.ceil(maxY - minY + pad * 2)));

  if (bw <= 2 || bh <= 2) return;

  const buffer = getSharedWaterBuffer(bw, bh);
  if (!buffer) return;
  const { canvas: wCanvas, ctx: wCtx } = buffer;

  // Limpa estritamente a região utilizada no buffer local
  wCtx.save();
  wCtx.setTransform(1, 0, 0, 1, 0, 0);
  wCtx.clearRect(0, 0, bw, bh);
  wCtx.translate(-bx, -by);

  const primaryWaterHex = clusterOverlays[0]?.color || '#0284c7';
  const [wr, wg, wb] = parseHexToRgb(primaryWaterHex);
  const primaryIntensity = clusterOverlays[0]?.intensity ?? 1.0;

  // PASSO 1: Borda Periférica de Espuma Suave (Shoreline Foam suave nas margens)
  wCtx.globalCompositeOperation = 'source-over';
  wCtx.strokeStyle = 'rgba(235, 248, 255, 0.88)';
  wCtx.fillStyle = 'rgba(235, 248, 255, 0.88)';
  wCtx.lineCap = 'round';
  wCtx.lineJoin = 'round';

  for (const ov of clusterOverlays) {
    const pts = ov.points;
    if (!pts || pts.length === 0) continue;
    const eff = Math.max(1, (ov.brushSize || 42) * (ov.scale ?? 1.0));
    wCtx.lineWidth = eff;
    if (pts.length === 1) {
      wCtx.beginPath();
      wCtx.arc(pts[0].x, pts[0].y, eff / 2, 0, Math.PI * 2);
      wCtx.fill();
    } else {
      wCtx.beginPath();
      pts.forEach((p, i) => (i === 0 ? wCtx.moveTo(p.x, p.y) : wCtx.lineTo(p.x, p.y)));
      wCtx.stroke();

      if (pts.length >= 3) {
        const pStart = pts[0];
        const pEnd = pts[pts.length - 1];
        if (Math.hypot(pStart.x - pEnd.x, pStart.y - pEnd.y) <= eff * 1.5) {
          wCtx.fill();
        }
      }
    }
  }

  // PASSO 2: Corpo Líquido da Água (cobre todas as sobreposições internas, criando uma só massa contínua)
  wCtx.strokeStyle = `rgba(${wr}, ${wg}, ${wb}, ${0.94 * primaryIntensity})`;
  wCtx.fillStyle = `rgba(${wr}, ${wg}, ${wb}, ${0.94 * primaryIntensity})`;

  for (const ov of clusterOverlays) {
    const pts = ov.points;
    if (!pts || pts.length === 0) continue;
    const eff = Math.max(1, (ov.brushSize || 42) * (ov.scale ?? 1.0));
    const innerW = Math.max(2, eff - 5);
    wCtx.lineWidth = innerW;
    if (pts.length === 1) {
      wCtx.beginPath();
      wCtx.arc(pts[0].x, pts[0].y, innerW / 2, 0, Math.PI * 2);
      wCtx.fill();
    } else {
      wCtx.beginPath();
      pts.forEach((p, i) => (i === 0 ? wCtx.moveTo(p.x, p.y) : wCtx.lineTo(p.x, p.y)));
      wCtx.stroke();

      if (pts.length >= 3) {
        const pStart = pts[0];
        const pEnd = pts[pts.length - 1];
        if (Math.hypot(pStart.x - pEnd.x, pStart.y - pEnd.y) <= eff * 1.5) {
          wCtx.fill();
        }
      }
    }
  }

  // PASSO 3: TEXTURA PNG DE REPETIÇÃO CORRENDO DENTRO DA ÁREA PINCELADA
  const primary = clusterOverlays.find((o) => o.waterTexturePng) || clusterOverlays[0];
  const userPng = primary?.waterTexturePng;
  const tileSource: CanvasImageSource =
    (userPng ? getWaterTextureImage(userPng) : null) || getDefaultWaterPatternCanvas();

  if (tileSource) {
    try {
      const pattern = wCtx.createPattern(tileSource, 'repeat');
      if (pattern) {
        const flowSpeed = primary?.flowSpeed ?? primary?.speed ?? 1.0;
        const flowAngle = primary?.flowAngle ?? 45;
        const textureScale = primary?.textureScale ?? primary?.scale ?? 1.0;
        const textureOpacity = primary?.textureOpacity ?? 0.85;

        const tileW = ((tileSource as any).naturalWidth || (tileSource as any).width || 128) * textureScale;
        const tileH = ((tileSource as any).naturalHeight || (tileSource as any).height || 128) * textureScale;
        const periodX = Math.max(2, tileW);
        const periodY = Math.max(2, tileH);

        const rad = (flowAngle * Math.PI) / 180;
        const flowDist = timeSec * flowSpeed * 35;

        const flowX = (((Math.cos(rad) * flowDist) % periodX) + periodX) % periodX;
        const flowY = (((Math.sin(rad) * flowDist) % periodY) + periodY) % periodY;

        if ('setTransform' in pattern) {
          const m = new DOMMatrix();
          m.translateSelf(flowX, flowY);
          m.scaleSelf(textureScale, textureScale);
          pattern.setTransform(m);
        }

        wCtx.globalCompositeOperation = 'source-atop';
        wCtx.globalAlpha = Math.max(0.05, Math.min(1.0, textureOpacity));
        wCtx.fillStyle = pattern;
        wCtx.fillRect(bx, by, bw, bh);
        wCtx.globalAlpha = 1.0;
      }
    } catch {
      // Ignora se ainda decodificando
    }
  }

  wCtx.restore();

  // PASSO 4: Blit direto na tela
  ctx.save();
  ctx.drawImage(wCanvas, 0, 0, bw, bh, bx, by, bw, bh);
  ctx.restore();
}

export function renderUnifiedWaterOverlays(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  waterOverlays: WaterOverlayItem[]
) {
  if (!waterOverlays || waterOverlays.length === 0) return;

  if (waterOverlays.length === 1) {
    renderSingleWaterCluster(ctx, width, height, timeSec, waterOverlays);
    return;
  }

  // Agrupa sobreposições de água conectadas/sobrepostas em clusters locais
  const items = waterOverlays
    .filter((ov) => ov.points && ov.points.length > 0)
    .map((ov) => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const eff = Math.max(1, (ov.brushSize || 42) * (ov.scale ?? 1.0));
      for (const p of ov.points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      const pad = eff + 24;
      return {
        ov,
        minX: minX - pad,
        minY: minY - pad,
        maxX: maxX + pad,
        maxY: maxY + pad,
      };
    })
    .filter((it) => Number.isFinite(it.minX));

  if (items.length === 0) return;
  if (items.length === 1) {
    renderSingleWaterCluster(ctx, width, height, timeSec, [items[0].ov]);
    return;
  }

  const visited = new Set<number>();
  for (let i = 0; i < items.length; i++) {
    if (visited.has(i)) continue;
    const cluster: WaterOverlayItem[] = [];
    const queue = [i];
    visited.add(i);

    while (queue.length > 0) {
      const idx = queue.pop()!;
      cluster.push(items[idx].ov);

      for (let j = 0; j < items.length; j++) {
        if (visited.has(j)) continue;
        const a = items[idx];
        const b = items[j];
        if (a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY) {
          visited.add(j);
          queue.push(j);
        }
      }
    }

    renderSingleWaterCluster(ctx, width, height, timeSec, cluster);
  }
}

/**
 * Renderiza um traçado contínuo de sobreposição SEM CORTE (puro efeito visual vivo)
 */
export function renderMotionOverlayStroke(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  overlay: {
    id?: string;
    effect: string;
    brushSize: number;
    scale?: number;
    speed: number;
    intensity: number;
    points: { x: number; y: number }[];
    color?: string;
  }
) {
  if (!overlay || !overlay.points || overlay.points.length === 0) return;

  const scale = overlay.scale !== undefined ? overlay.scale : 1.0;
  const effectiveBrushSize = Math.max(1, overlay.brushSize * scale);

  const strokes: LayerStroke[] = [
    {
      id: 'overlay-stroke',
      points: overlay.points,
      brushSize: effectiveBrushSize,
    },
  ];

  switch (overlay.effect) {
    case 'glow':
      renderGlowVFX(ctx, width, height, timeSec, overlay.speed, overlay.intensity, strokes);
      break;
    case 'glitter':
      renderGlitterVFX(ctx, width, height, timeSec, overlay.speed, overlay.intensity, strokes);
      break;
    case 'smoke':
      renderSmokeVFX(ctx, width, height, timeSec, overlay.speed, overlay.intensity, strokes);
      break;
    case 'fireflies':
      renderFirefliesVFX(ctx, width, height, timeSec, overlay.speed, overlay.intensity, strokes);
      break;
    case 'sparks':
      renderSparksVFX(ctx, width, height, timeSec, overlay.speed, overlay.intensity, strokes);
      break;
    case 'fire': {
      // Sobreposição de chamas térmicas ao longo do traçado
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const phase = timeSec * overlay.speed * 4.0;
      const pts = overlay.points;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const jY = Math.sin(phase + i * 0.8) * 6 * overlay.intensity;
        const radius = (effectiveBrushSize * 0.6 + Math.cos(phase * 1.5 + i) * 3) * overlay.intensity;
        const grad = ctx.createRadialGradient(p.x, p.y + jY, 0, p.x, p.y + jY, radius);
        grad.addColorStop(0, 'rgba(255, 240, 200, 0.85)');
        grad.addColorStop(0.35, 'rgba(249, 115, 22, 0.6)');
        grad.addColorStop(0.7, 'rgba(239, 68, 68, 0.3)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y + jY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'water': {
      // Aplica as cáusticas ao montante de água inteiro
      renderUnifiedWaterOverlays(ctx, width, height, timeSec, [overlay]);
      break;
    }
    case 'terrain':
    case 'noise':
    case 'ground': {
      // Área contínua pincelada de terreno (Areia, Terra, Lama, Musgo com micro-granulação orgânica)
      ctx.save();
      const pts = overlay.points;
      if (pts.length === 0) {
        ctx.restore();
        break;
      }

      const groundHex = overlay.color || '#16a34a';
      const [gr, gg, gb] = parseHexToRgb(groundHex);
      const intensity = overlay.intensity !== undefined ? overlay.intensity : 0.85;

      // 1. Traçado contínuo da textura do chão
      ctx.beginPath();
      pts.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = effectiveBrushSize;
      ctx.strokeStyle = `rgba(${gr}, ${gg}, ${gb}, ${intensity})`;
      ctx.stroke();

      // 2. Micro-granulação orgânica ao longo da área pincelada
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.strokeStyle = `rgba(${Math.max(0, gr - 25)}, ${Math.max(0, gg - 25)}, ${Math.max(0, gb - 25)}, 0.35)`;
      ctx.lineWidth = effectiveBrushSize * 0.8;
      ctx.setLineDash([4, 8]);
      ctx.lineDashOffset = 12;
      ctx.beginPath();
      pts.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'wind': {
      // Sobreposição de rajadas de vento translúcidas
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = `rgba(226, 232, 240, ${0.35 * overlay.intensity})`;
      ctx.lineWidth = effectiveBrushSize * 0.7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([12, 18]);
      ctx.lineDashOffset = -timeSec * overlay.speed * 60;
      ctx.beginPath();
      overlay.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'jelly':
    case 'gelatin': {
      // Sobreposição viva de Gelatina (Squash & Stretch pulsante ao longo do traço sem corte)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const phase = timeSec * overlay.speed * 3.5;
      const pts = overlay.points;
      const baseWidth = effectiveBrushSize;
      
      // 1. Corpo gelatinoso pulsante com squash & stretch
      const bounceScale = 1.0 + Math.sin(phase) * 0.25 * overlay.intensity;
      const squashWidth = baseWidth * bounceScale;
      ctx.strokeStyle = `rgba(244, 114, 182, ${0.38 * overlay.intensity})`;
      ctx.lineWidth = squashWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      pts.forEach((p, i) => {
        const wave = Math.sin(phase + i * 0.4) * 3 * overlay.intensity;
        if (i === 0) ctx.moveTo(p.x, p.y + wave);
        else ctx.lineTo(p.x, p.y + wave);
      });
      ctx.stroke();

      // 2. Núcleo elástico cintilante fúcsia/violeta
      ctx.strokeStyle = `rgba(217, 70, 239, ${0.75 * overlay.intensity})`;
      ctx.lineWidth = Math.max(2, squashWidth * 0.45);
      ctx.beginPath();
      pts.forEach((p, i) => {
        const wave = Math.sin(phase + i * 0.4) * 3 * overlay.intensity;
        if (i === 0) ctx.moveTo(p.x, p.y + wave);
        else ctx.lineTo(p.x, p.y + wave);
      });
      ctx.stroke();

      // 3. Gotículas elásticas translúcidas
      const step = Math.max(1, Math.floor(pts.length / 8));
      for (let i = 0; i < pts.length; i += step) {
        const p = pts[i];
        const bubR = (baseWidth * 0.35 + Math.sin(phase * 1.5 + i) * baseWidth * 0.15) * overlay.intensity;
        const bubY = p.y + Math.sin(phase + i * 0.4) * 3 * overlay.intensity;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(p.x, bubY, Math.max(1, bubR), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'vortex': {
      // Sobreposição de vórtice em espiral sobre o traçado
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const phase = timeSec * overlay.speed * 4.0;
      const pts = overlay.points;
      pts.forEach((p, i) => {
        if (i % 3 !== 0) return;
        const angle = phase + i * 0.5;
        const r = (effectiveBrushSize * 0.5) * overlay.intensity;
        const ox = Math.cos(angle) * r;
        const oy = Math.sin(angle) * r;
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.6 * overlay.intensity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x + ox, p.y + oy, 2.5, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();
      break;
    }
    case 'pulse': {
      // Pulso concêntrico vivo ao longo do traçado
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const phase = timeSec * overlay.speed * 3.0;
      const pts = overlay.points;
      ctx.strokeStyle = `rgba(236, 72, 153, ${0.5 * overlay.intensity})`;
      ctx.lineWidth = (effectiveBrushSize * 0.4 + Math.sin(phase) * 3) * overlay.intensity;
      ctx.lineCap = 'round';
      ctx.beginPath();
      pts.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.restore();
      break;
    }
    default: {
      // Fallback: Traçado vivo brilhante translúcido
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(232, 121, 249, ${0.65 * overlay.intensity})`;
      ctx.lineWidth = effectiveBrushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      overlay.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.restore();
      break;
    }
  }
}

/**
 * Renderiza um snapshot 2D estático combinando a imagem base e todas as peças/camadas
 * sobrepostas com suas transformações (posição, escala, rotação, espelhamento e pivô),
 * gerando um único PNG composto do asset motion completo para o acervo e miniaturas.
 */
export async function composeMotionAssetSnapshot(
  basePngUrl: string,
  layers: any[]
): Promise<string> {
  if (!basePngUrl) return '';
  if (!layers || layers.length <= 1) return basePngUrl;

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (!src.startsWith('data:') && !src.startsWith('blob:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = () => {
        if (img.crossOrigin) {
          const retryImg = new Image();
          retryImg.onload = () => resolve(retryImg);
          retryImg.onerror = () => reject(new Error('Failed to load image'));
          retryImg.src = src;
        } else {
          reject(new Error('Failed to load image'));
        }
      };
      img.src = src;
      if (img.complete && img.naturalWidth > 0) {
        resolve(img);
      }
    });
  };

  try {
    const baseImg = await loadImage(basePngUrl);
    const w = baseImg.naturalWidth || 512;
    const h = baseImg.naturalHeight || 512;

    // Pré-carrega todas as imagens de peças filhas válidas
    const loadedPieces: {
      layer: any;
      img: HTMLImageElement;
      pW: number;
      pH: number;
      pivPixX: number;
      pivPixY: number;
      anchorX: number;
      anchorY: number;
      rad: number;
      scaleX: number;
      scaleY: number;
    }[] = [];

    for (const layer of layers) {
      if (layer.isBaseAsset) continue;
      if (layer.visible === false) continue;
      if (!layer.pngUrl) continue;

      try {
        const pieceImg = await loadImage(layer.pngUrl);
        const pW = pieceImg.naturalWidth || w;
        const pH = pieceImg.naturalHeight || h;
        const pivPixX = pW * (layer.pivotX ?? 0.5);
        const pivPixY = pH * (layer.pivotY ?? 0.5);
        const anchorX = (layer.x ?? 0) + pivPixX;
        const anchorY = (layer.y ?? 0) + pivPixY;
        const rad = ((layer.rotation ?? 0) * Math.PI) / 180;
        const scale = layer.scale ?? 1.0;
        const scaleX = scale * (layer.flipX ? -1 : 1);
        const scaleY = scale * (layer.flipY ? -1 : 1);

        loadedPieces.push({
          layer,
          img: pieceImg,
          pW,
          pH,
          pivPixX,
          pivPixY,
          anchorX,
          anchorY,
          rad,
          scaleX,
          scaleY,
        });
      } catch (err) {
        console.warn('Erro ao carregar peça para snapshot:', layer.name, err);
      }
    }

    // Calcula o Bounding Box global englobando a imagem base (0,0 a w,h) e todos os 4 cantos de cada peça filha
    let minX = 0;
    let minY = 0;
    let maxX = w;
    let maxY = h;

    loadedPieces.forEach((p) => {
      const cos = Math.cos(p.rad);
      const sin = Math.sin(p.rad);
      const corners = [
        { x: 0, y: 0 },
        { x: p.pW, y: 0 },
        { x: p.pW, y: p.pH },
        { x: 0, y: p.pH },
      ];

      corners.forEach((c) => {
        const dx = (c.x - p.pivPixX) * p.scaleX;
        const dy = (c.y - p.pivPixY) * p.scaleY;
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        const worldX = rx + p.anchorX;
        const worldY = ry + p.anchorY;

        minX = Math.min(minX, worldX);
        minY = Math.min(minY, worldY);
        maxX = Math.max(maxX, worldX);
        maxY = Math.max(maxY, worldY);
      });
    });

    // Margem de segurança generosa para antialiasing, rotações, boinas e chapéus sem nenhum corte superior
    const padX = Math.max(32, Math.round(w * 0.08));
    const padY = Math.max(64, Math.round(h * 0.15));
    const finalMinX = Math.floor(minX - padX);
    const finalMinY = Math.floor(minY - padY);
    const finalMaxX = Math.ceil(maxX + padX);
    const finalMaxY = Math.ceil(maxY + padY);

    const canvasW = Math.max(1, finalMaxX - finalMinX);
    const canvasH = Math.max(1, finalMaxY - finalMinY);
    const offsetX = -finalMinX;
    const offsetY = -finalMinY;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return basePngUrl;

    // 1. Desenha o asset base reposicionado com segurança
    ctx.drawImage(baseImg, offsetX, offsetY, w, h);

    // 2. Sobrepõe todas as peças filhas sem corte
    for (const p of loadedPieces) {
      ctx.save();
      ctx.translate(offsetX + p.anchorX, offsetY + p.anchorY);
      ctx.rotate(p.rad);
      ctx.scale(p.scaleX, p.scaleY);
      ctx.translate(-p.pivPixX, -p.pivPixY);
      ctx.drawImage(p.img, 0, 0, p.pW, p.pH);
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('Falha ao gerar snapshot composto do Motion Canvas:', err);
    return basePngUrl;
  }
}
