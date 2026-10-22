import { BiomeSegmentSpan } from './mapMath';

/**
 * Desenha os biomas e tiles no canvas de forma sólida e contínua,
 * eliminando qualquer espaço vazio, fenda ou desvanecimento transparente abaixo dos tiles.
 */
export function drawBiomeSpansWithFeather(
  targetCtx: CanvasRenderingContext2D,
  spans: BiomeSegmentSpan[],
  tileImages: Map<string, HTMLImageElement> | Record<string, HTMLImageElement>,
  totalMapWidth: number
): void {
  if (!Array.isArray(spans) || spans.length === 0 || totalMapWidth <= 0) return;

  spans.forEach((span) => {
    const biome = span.biome;
    if (!biome) return;
    const img = tileImages instanceof Map ? tileImages.get(biome.id) : tileImages[biome.id];
    const tileW = Math.max(8, biome.tileWidth > 0 ? biome.tileWidth : 64);
    const tileH = Math.max(8, biome.tileHeight > 0 ? biome.tileHeight : 64);
    const repeatCount = Math.max(1, Math.min(200, biome.tileRepeatCount || 1));

    targetCtx.save();
    // Desativa suavização bilinear para manter pixels nítidos sem borramento nas bordas
    targetCtx.imageSmoothingEnabled = false;

    // Fundo sólido como base de segurança para evitar qualquer transparência
    targetCtx.fillStyle = biome.baseColor || '#1e293b';
    targetCtx.fillRect(0, span.startY, totalMapWidth, span.height);

    if (img && img.complete && img.naturalWidth > 0) {
      // Desenha cada linha e coluna de tiles repetidos sem qualquer espaço vazio abaixo
      for (let row = 0; row < repeatCount; row++) {
        const rowY = span.startY + row * tileH;
        // Se for a última linha do bioma, estica exatamente até span.endY para selar com o próximo tile
        const isLastRow = row === repeatCount - 1;
        const h = isLastRow ? Math.max(tileH, span.endY - rowY) : tileH + 1;

        for (let x = 0; x < totalMapWidth; x += tileW) {
          const isLastCol = x + tileW >= totalMapWidth;
          const w = isLastCol ? Math.max(tileW, totalMapWidth - x) : tileW + 1;
          targetCtx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, x, rowY, w, h);
        }
      }
    }

    targetCtx.restore();
  });
}
