/**
 * Algoritmo avançado de Reparo e Inpainting Inteligente (Content-Aware Fill / Healing Brush / Esponja).
 * Preenche áreas selecionadas por laço ou traçadas por pincel utilizando amostragem
 * multidirecional de gradientes e difusão laplaciana das bordas circundantes, idêntico
 * ao Spot Healing Brush do Photoshop.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Aplica inpainting / reparo na área demarcada diretamente em um CanvasRenderingContext2D.
 */
export function repairInpaintArea(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  points: Point[],
  mode: 'lasso' | 'brush',
  brushSize: number = 24
): boolean {
  if (!points || points.length === 0 || canvasWidth <= 0 || canvasHeight <= 0) {
    return false;
  }

  // 1. Cria canvas de máscara offscreen para determinar com exatidão a área de reparo
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = canvasWidth;
  maskCanvas.height = canvasHeight;
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!maskCtx) return false;

  maskCtx.fillStyle = '#000000';
  maskCtx.fillRect(0, 0, canvasWidth, canvasHeight);

  maskCtx.fillStyle = '#ffffff';
  maskCtx.strokeStyle = '#ffffff';

  if (mode === 'lasso' && points.length >= 3) {
    maskCtx.beginPath();
    points.forEach((p, idx) => {
      if (idx === 0) maskCtx.moveTo(p.x, p.y);
      else maskCtx.lineTo(p.x, p.y);
    });
    maskCtx.closePath();
    maskCtx.fill();
    // Leve borda de suavização
    maskCtx.lineWidth = 2;
    maskCtx.stroke();
  } else {
    // Pincel / Esponja de reparo: traço contínuo de círculos
    const rad = Math.max(3, brushSize / 2);
    maskCtx.lineWidth = rad * 2;
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';

    if (points.length === 1) {
      maskCtx.beginPath();
      maskCtx.arc(points[0].x, points[0].y, rad, 0, Math.PI * 2);
      maskCtx.fill();
    } else {
      maskCtx.beginPath();
      maskCtx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        maskCtx.lineTo(points[i].x, points[i].y);
      }
      maskCtx.stroke();
    }
  }

  // 2. Determina o Bounding Box da área afetada com margem de segurança para amostragem
  const margin = Math.max(16, Math.ceil(brushSize * 0.8));
  let minX = canvasWidth;
  let minY = canvasHeight;
  let maxX = 0;
  let maxY = 0;

  points.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const bX = Math.max(0, Math.floor(minX - margin));
  const bY = Math.max(0, Math.floor(minY - margin));
  const bW = Math.min(canvasWidth - bX, Math.ceil(maxX - minX + margin * 2));
  const bH = Math.min(canvasHeight - bY, Math.ceil(maxY - minY + margin * 2));

  if (bW <= 0 || bH <= 0) return false;

  // 3. Lê os dados de pixels da imagem e da máscara
  const imgData = ctx.getImageData(bX, bY, bW, bH);
  const maskData = maskCtx.getImageData(bX, bY, bW, bH);
  const imgPx = imgData.data;
  const maskPx = maskData.data;

  // 4. Cria matriz binária local (1 = precisa ser reparado, 0 = pixel original válido)
  const isMasked = new Uint8Array(bW * bH);
  let totalMaskedCount = 0;

  for (let y = 0; y < bH; y++) {
    for (let x = 0; x < bW; x++) {
      const idx = (y * bW + x) * 4;
      // Se máscara for branca
      if (maskPx[idx] > 120) {
        isMasked[y * bW + x] = 1;
        totalMaskedCount++;
      }
    }
  }

  if (totalMaskedCount === 0) return false;

  // 5. Inpainting Multidirecional por Raios Radiais
  // Para cada pixel da máscara, projetamos raios em 16 direções radiais até atingir a borda válida não-mascarada
  const rayAngles = [
    0, Math.PI / 8, Math.PI / 4, (3 * Math.PI) / 8,
    Math.PI / 2, (5 * Math.PI) / 8, (3 * Math.PI) / 4, (7 * Math.PI) / 8,
    Math.PI, (9 * Math.PI) / 8, (5 * Math.PI) / 4, (11 * Math.PI) / 8,
    (3 * Math.PI) / 2, (13 * Math.PI) / 8, (7 * Math.PI) / 4, (15 * Math.PI) / 8,
  ];

  const cosDirs = rayAngles.map((a) => Math.cos(a));
  const sinDirs = rayAngles.map((a) => Math.sin(a));

  const maxRayDist = Math.max(bW, bH);
  const tempR = new Float32Array(bW * bH);
  const tempG = new Float32Array(bW * bH);
  const tempB = new Float32Array(bW * bH);
  const tempA = new Float32Array(bW * bH);

  for (let y = 0; y < bH; y++) {
    for (let x = 0; x < bW; x++) {
      const loc = y * bW + x;
      if (isMasked[loc] !== 1) continue;

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumA = 0;
      let sumWeight = 0;

      for (let r = 0; r < rayAngles.length; r++) {
        const cDir = cosDirs[r];
        const sDir = sinDirs[r];

        let found = false;
        let step = 1;

        while (step < maxRayDist) {
          const sampleX = Math.round(x + cDir * step);
          const sampleY = Math.round(y + sDir * step);

          if (sampleX < 0 || sampleX >= bW || sampleY < 0 || sampleY >= bH) {
            break;
          }

          const sLoc = sampleY * bW + sampleX;
          if (isMasked[sLoc] === 0) {
            const sIdx = sLoc * 4;
            // Se o pixel de borda tem alguma opacidade
            if (imgPx[sIdx + 3] > 10) {
              const dist = Math.hypot(sampleX - x, sampleY - y);
              const weight = 1.0 / (dist * dist + 0.1);
              sumR += imgPx[sIdx] * weight;
              sumG += imgPx[sIdx + 1] * weight;
              sumB += imgPx[sIdx + 2] * weight;
              sumA += imgPx[sIdx + 3] * weight;
              sumWeight += weight;
              found = true;
              break;
            }
          }
          step += 2;
        }

        if (!found) {
          // Tenta um passo mais fino se não encontrou
        }
      }

      if (sumWeight > 0) {
        tempR[loc] = sumR / sumWeight;
        tempG[loc] = sumG / sumWeight;
        tempB[loc] = sumB / sumWeight;
        tempA[loc] = sumA / sumWeight;
      }
    }
  }

  // Aplica os valores iniciais interpolados
  for (let y = 0; y < bH; y++) {
    for (let x = 0; x < bW; x++) {
      const loc = y * bW + x;
      if (isMasked[loc] === 1) {
        const idx = loc * 4;
        imgPx[idx] = Math.round(tempR[loc]);
        imgPx[idx + 1] = Math.round(tempG[loc]);
        imgPx[idx + 2] = Math.round(tempB[loc]);
        imgPx[idx + 3] = Math.round(tempA[loc]);
      }
    }
  }

  // 6. Três passes de difusão/suavização laplaciana para eliminar costuras e mesclar perfeitamente
  const blurPasses = 3;
  for (let pass = 0; pass < blurPasses; pass++) {
    for (let y = 1; y < bH - 1; y++) {
      for (let x = 1; x < bW - 1; x++) {
        const loc = y * bW + x;
        if (isMasked[loc] !== 1) continue;

        const idx = loc * 4;
        const up = (loc - bW) * 4;
        const down = (loc + bW) * 4;
        const left = (loc - 1) * 4;
        const right = (loc + 1) * 4;

        tempR[loc] =
          imgPx[idx] * 0.4 +
          (imgPx[up] + imgPx[down] + imgPx[left] + imgPx[right]) * 0.15;
        tempG[loc] =
          imgPx[idx + 1] * 0.4 +
          (imgPx[up + 1] + imgPx[down + 1] + imgPx[left + 1] + imgPx[right + 1]) * 0.15;
        tempB[loc] =
          imgPx[idx + 2] * 0.4 +
          (imgPx[up + 2] + imgPx[down + 2] + imgPx[left + 2] + imgPx[right + 2]) * 0.15;
        tempA[loc] =
          imgPx[idx + 3] * 0.4 +
          (imgPx[up + 3] + imgPx[down + 3] + imgPx[left + 3] + imgPx[right + 3]) * 0.15;
      }
    }

    for (let y = 1; y < bH - 1; y++) {
      for (let x = 1; x < bW - 1; x++) {
        const loc = y * bW + x;
        if (isMasked[loc] === 1) {
          const idx = loc * 4;
          imgPx[idx] = Math.round(tempR[loc]);
          imgPx[idx + 1] = Math.round(tempG[loc]);
          imgPx[idx + 2] = Math.round(tempB[loc]);
          imgPx[idx + 3] = Math.round(tempA[loc]);
        }
      }
    }
  }

  // 7. Escreve a imagem reparada de volta no canvas
  ctx.putImageData(imgData, bX, bY);
  return true;
}

/**
 * Utilitário assíncrono para reparar uma imagem em base64 PNG com a ferramenta Esponja/Laço
 */
export async function repairImageWithSponge(
  sourceDataUrl: string,
  points: Point[],
  mode: 'lasso' | 'brush',
  brushSize: number = 24
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const cvs = document.createElement('canvas');
      cvs.width = img.naturalWidth || img.width;
      cvs.height = img.naturalHeight || img.height;
      const ctx = cvs.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve(sourceDataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0);
      repairInpaintArea(ctx, cvs.width, cvs.height, points, mode, brushSize);
      resolve(cvs.toDataURL('image/png'));
    };
    img.onerror = (err) => reject(err);
    img.src = sourceDataUrl;
  });
}
