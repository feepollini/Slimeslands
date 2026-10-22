import { repairInpaintArea } from './motionInpaintRepair';

export interface CutoutResult {
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pivotX: number;
  pivotY: number;
  modifiedSourceDataUrl?: string;
}

/**
 * Suaviza uma lista de pontos aplicando algoritmo de média ponderada (Chaikin / smoothing)
 */
export function smoothPoints(
  pts: { x: number; y: number }[],
  iterations: number = 2
): { x: number; y: number }[] {
  if (pts.length < 3 || iterations <= 0) return pts;

  let current = pts;
  for (let iter = 0; iter < iterations; iter++) {
    const smoothed: { x: number; y: number }[] = [current[0]];
    for (let i = 0; i < current.length - 1; i++) {
      const p0 = current[i];
      const p1 = current[i + 1];
      // 75% p0 + 25% p1
      smoothed.push({
        x: p0.x * 0.75 + p1.x * 0.25,
        y: p0.y * 0.75 + p1.y * 0.25,
      });
      // 25% p0 + 75% p1
      smoothed.push({
        x: p0.x * 0.25 + p1.x * 0.75,
        y: p0.y * 0.25 + p1.y * 0.75,
      });
    }
    smoothed.push(current[current.length - 1]);
    current = smoothed;
  }
  return current;
}

/**
 * Extrai um recorte da imagem do asset usando traçado livre ou laço de seleção.
 * Se action === 'cut', apaga com transparência a área selecionada na imagem de origem (arrancar pedaço).
 * Se action === 'copy', preserva a imagem de origem intacta (duplicar/clonar pedaço).
 * Se action === 'cut_repair', arranca o pedaço para nova camada e preenche o buraco na imagem pai com inpainting inteligente (Photoshop Healing).
 */
export function extractCutoutPiece(
  sourceImage: HTMLImageElement,
  points: { x: number; y: number }[],
  mode: 'brush' | 'lasso',
  brushSize: number,
  smoothLevel: number,
  padX: number,
  padY: number,
  artWidth: number,
  artHeight: number,
  action: 'copy' | 'cut' | 'cut_repair' = 'copy'
): CutoutResult | null {
  if (!points || points.length < 2) return null;

  // 1. Converte pontos de tela/canvas para coordenadas da arte do asset
  const artPoints = points.map((p) => ({
    x: p.x - padX,
    y: p.y - padY,
  }));

  // 2. Aplica suavização
  const smoothed = smoothPoints(artPoints, Math.min(4, Math.max(0, smoothLevel)));

  // 3. Calcula o Bounding Box do recorte
  const radius = mode === 'brush' ? Math.ceil(brushSize / 2) + 4 : 4;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  smoothed.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  // Limita bounding box dentro da arte
  minX = Math.max(0, Math.floor(minX - radius));
  minY = Math.max(0, Math.floor(minY - radius));
  maxX = Math.min(artWidth, Math.ceil(maxX + radius));
  maxY = Math.min(artHeight, Math.ceil(maxY + radius));

  const cropW = Math.max(8, maxX - minX);
  const cropH = Math.max(8, maxY - minY);

  // 4. Cria canvas offscreen de alta resolução para extração com máscara
  const offCanvas = document.createElement('canvas');
  offCanvas.width = cropW;
  offCanvas.height = cropH;
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx) return null;

  offCtx.clearRect(0, 0, cropW, cropH);

  if (mode === 'lasso') {
    // Laço de Seleção (Lasso): cria polígono fechado e usa ctx.clip()
    offCtx.save();
    offCtx.beginPath();
    smoothed.forEach((p, idx) => {
      const localX = p.x - minX;
      const localY = p.y - minY;
      if (idx === 0) offCtx.moveTo(localX, localY);
      else offCtx.lineTo(localX, localY);
    });
    offCtx.closePath();
    offCtx.clip();

    // Desenha a imagem original deslocada dentro do recorte mascarado
    offCtx.drawImage(sourceImage, -minX, -minY, artWidth, artHeight);
    offCtx.restore();
  } else {
    // Pincel / Lápis Livre: traço com espessura
    offCtx.save();
    offCtx.strokeStyle = '#ffffff';
    offCtx.lineWidth = brushSize;
    offCtx.lineCap = 'round';
    offCtx.lineJoin = 'round';
    offCtx.beginPath();
    smoothed.forEach((p, idx) => {
      const localX = p.x - minX;
      const localY = p.y - minY;
      if (idx === 0) offCtx.moveTo(localX, localY);
      else offCtx.lineTo(localX, localY);
    });
    offCtx.stroke();

    // Aplica os pixels da imagem apenas onde o traço foi pintado
    offCtx.globalCompositeOperation = 'source-in';
    offCtx.drawImage(sourceImage, -minX, -minY, artWidth, artHeight);
    offCtx.restore();
  }

  const dataUrl = offCanvas.toDataURL('image/png');

  // 5. Se action === 'cut' ou 'cut_repair', modifica a imagem de origem
  let modifiedSourceDataUrl: string | undefined;
  if (action === 'cut' || action === 'cut_repair') {
    const cutCanvas = document.createElement('canvas');
    cutCanvas.width = sourceImage.naturalWidth || artWidth;
    cutCanvas.height = sourceImage.naturalHeight || artHeight;
    const cutCtx = cutCanvas.getContext('2d');
    if (cutCtx) {
      cutCtx.drawImage(sourceImage, 0, 0, cutCanvas.width, cutCanvas.height);
      const scaleX = cutCanvas.width / artWidth;
      const scaleY = cutCanvas.height / artHeight;

      if (action === 'cut_repair') {
        // Preenchimento e reparo inteligente (Content-Aware / Photoshop Healing)
        const scaledPoints = smoothed.map((p) => ({
          x: p.x * scaleX,
          y: p.y * scaleY,
        }));
        repairInpaintArea(
          cutCtx,
          cutCanvas.width,
          cutCanvas.height,
          scaledPoints,
          mode,
          brushSize * Math.max(scaleX, scaleY)
        );
      } else {
        // Recorte destrutivo com transparência direta (destination-out)
        cutCtx.globalCompositeOperation = 'destination-out';
        if (mode === 'lasso') {
          cutCtx.beginPath();
          smoothed.forEach((p, idx) => {
            const x = p.x * scaleX;
            const y = p.y * scaleY;
            if (idx === 0) cutCtx.moveTo(x, y);
            else cutCtx.lineTo(x, y);
          });
          cutCtx.closePath();
          cutCtx.fill();
        } else {
          cutCtx.lineWidth = brushSize * Math.max(scaleX, scaleY);
          cutCtx.lineCap = 'round';
          cutCtx.lineJoin = 'round';
          cutCtx.beginPath();
          smoothed.forEach((p, idx) => {
            const x = p.x * scaleX;
            const y = p.y * scaleY;
            if (idx === 0) cutCtx.moveTo(x, y);
            else cutCtx.lineTo(x, y);
          });
          cutCtx.stroke();
        }
      }
      modifiedSourceDataUrl = cutCanvas.toDataURL('image/png');
    }
  }

  return {
    dataUrl,
    x: minX,
    y: minY,
    width: cropW,
    height: cropH,
    pivotX: 0.5,
    pivotY: 0.1, // Topo da peça como pivô padrão (ideal para balanço pendurado)
    modifiedSourceDataUrl,
  };
}
