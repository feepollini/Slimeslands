import { uploadDataUrlToDisk, uploadFileToDisk, type DiskAssetCategory } from '../../../core/DiskAssetEngine';

export interface UploadedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  dominantColor?: string;
}

/**
 * Extracts average color from image canvas
 */
export function extractDominantColor(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): string {
  try {
    const sampleW = Math.min(width, 32);
    const sampleH = Math.min(height, 32);
    const imgData = ctx.getImageData(0, 0, sampleW, sampleH).data;
    let r = 0,
      g = 0,
      b = 0,
      count = 0;
    for (let i = 0; i < imgData.length; i += 4) {
      const a = imgData[i + 3];
      if (a > 50) {
        r += imgData[i];
        g += imgData[i + 1];
        b += imgData[i + 2];
        count++;
      }
    }
    if (count === 0) return '#2d4a22';
    return `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
  } catch {
    return '#2d4a22';
  }
}

/**
 * Loads a user-uploaded image file, measures its exact natural pixel dimensions,
 * and persists the physical asset directly to the project's local disk storage unit
 * (`/public/assets/engine/<category>/<filename>`) so RAM and localStorage never bloat with Base64!
 */
export function readUploadedImage(
  file: File,
  category: DiskAssetCategory = 'engine'
): Promise<UploadedImageResult> {
  return new Promise((resolve, reject) => {
    const isImageMime = Boolean(file.type && file.type.startsWith('image/'));
    const isImageExt = /\.(png|jpe?g|webp|gif|svg|bmp|ico|avif)$/i.test(file.name || '');
    if (!isImageMime && !isImageExt) {
      reject(new Error('O arquivo selecionado não é uma imagem válida.'));
      return;
    }

    const tempObjectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      const w = img.naturalWidth || 64;
      const h = img.naturalHeight || 64;
      let dominant = '#2d4a22';
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(w, 32);
        canvas.height = Math.min(h, 32);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          dominant = extractDominantColor(ctx, canvas.width, canvas.height);
        }
      } catch {
        // ignore
      } finally {
        URL.revokeObjectURL(tempObjectUrl);
      }

      const diskUrl = await uploadFileToDisk(file, category);
      resolve({
        dataUrl: diskUrl,
        width: w,
        height: h,
        dominantColor: dominant,
      });
    };

    img.onerror = async () => {
      URL.revokeObjectURL(tempObjectUrl);
      try {
        const diskUrl = await uploadFileToDisk(file, category);
        resolve({ dataUrl: diskUrl, width: 64, height: 64, dominantColor: '#2d4a22' });
      } catch (err) {
        reject(err);
      }
    };

    img.src = tempObjectUrl;
  });
}

/**
 * Loads and optimizes a HUD icon / button PNG and persists it to the project's local disk unit.
 */
export async function readUploadedHudIcon(
  file: File,
  maxDimension: number = 256
): Promise<UploadedImageResult> {
  const res = await readUploadedImage(file);
  if (!res.dataUrl || res.dataUrl.endsWith('.svg')) {
    return res;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const origW = img.naturalWidth || res.width || 64;
        const origH = img.naturalHeight || res.height || 64;
        if (origW <= maxDimension && origH <= maxDimension) {
          resolve(res);
          return;
        }
        const scale = Math.min(1, maxDimension / Math.max(origW, origH));
        const targetW = Math.max(1, Math.round(origW * scale));
        const targetH = Math.max(1, Math.round(origH * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(res);
          return;
        }
        ctx.clearRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const optimizedDataUrl = canvas.toDataURL('image/png');
        const diskUrl = await uploadDataUrlToDisk(
          optimizedDataUrl,
          `hud_${file.name || 'icon'}`,
          'ui'
        );
        resolve({
          ...res,
          dataUrl: diskUrl,
          width: targetW,
          height: targetH,
        });
      } catch {
        resolve(res);
      }
    };
    img.onerror = () => resolve(res);
    img.src = res.dataUrl;
  });
}

/**
 * Trims N pixels from all 4 borders of an image and persists the trimmed PNG to disk.
 */
export function trimImageBorder(
  dataUrl: string,
  trimPx: number = 1
): Promise<UploadedImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const origW = img.naturalWidth;
      const origH = img.naturalHeight;
      if (origW <= trimPx * 2 || origH <= trimPx * 2) {
        resolve({ dataUrl, width: origW, height: origH });
        return;
      }
      const newW = origW - trimPx * 2;
      const newH = origH - trimPx * 2;
      const canvas = document.createElement('canvas');
      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl, width: origW, height: origH });
        return;
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, trimPx, trimPx, newW, newH, 0, 0, newW, newH);
      const newUrl = canvas.toDataURL('image/png');
      const dominant = extractDominantColor(ctx, newW, newH);
      const diskUrl = await uploadDataUrlToDisk(newUrl, 'trimmed_tile', 'biomes');
      resolve({
        dataUrl: diskUrl,
        width: newW,
        height: newH,
        dominantColor: dominant,
      });
    };
    img.onerror = () => reject(new Error('Falha ao processar recorte de borda da imagem.'));
    img.src = dataUrl;
  });
}

export interface CustomCanvasOptions {
  width: number;
  height: number;
  backgroundColor: string;
  patternStyle?: 'blank' | 'grid' | 'dots' | 'blueprint' | 'checkerboard';
  patternColor?: string;
  gridSize?: number;
}

/**
 * Gera programaticamente uma imagem PNG com resolução exata personalizada e estilo de base
 */
export function generateCustomCanvasPNG(options: CustomCanvasOptions): UploadedImageResult {
  const w = Math.max(32, Math.min(8192, Math.round(options.width || 768)));
  const h = Math.max(32, Math.min(8192, Math.round(options.height || 1024)));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      dataUrl: '',
      width: w,
      height: h,
      dominantColor: options.backgroundColor || '#ffffff',
    };
  }

  ctx.fillStyle = options.backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const style = options.patternStyle || 'blank';
  const gridSz = options.gridSize || 32;

  if (style === 'grid') {
    ctx.strokeStyle = options.patternColor || 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += gridSz) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += gridSz) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else if (style === 'blueprint') {
    ctx.strokeStyle = options.patternColor || 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += gridSz) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += gridSz) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else if (style === 'dots') {
    ctx.fillStyle = options.patternColor || 'rgba(100, 116, 139, 0.35)';
    for (let x = gridSz; x < w; x += gridSz) {
      for (let y = gridSz; y < h; y += gridSz) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (style === 'checkerboard') {
    ctx.fillStyle = options.patternColor || 'rgba(0, 0, 0, 0.05)';
    for (let x = 0; x < w; x += gridSz) {
      for (let y = 0; y < h; y += gridSz) {
        if ((Math.floor(x / gridSz) + Math.floor(y / gridSz)) % 2 === 0) {
          ctx.fillRect(x, y, gridSz, gridSz);
        }
      }
    }
  }

  const dataUrl = canvas.toDataURL('image/png');
  const dominant = extractDominantColor(ctx, w, h);
  return {
    dataUrl,
    width: w,
    height: h,
    dominantColor: dominant,
  };
}
