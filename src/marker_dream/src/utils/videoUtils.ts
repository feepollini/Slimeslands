import { uploadDataUrlToDisk, uploadFileToDisk } from '../../../core/DiskAssetEngine';

// Utilitários para processamento, amostragem e geração de thumbnails de vídeos para assets
export const isVideoFile = (file: File): boolean => {
  return (
    file.type.startsWith('video/') ||
    /\.(mp4|webm|ogg|mov|mkv)$/i.test(file.name)
  );
};

export interface ProcessedVideoResult {
  dataUrl: string; // URL no disco da thumbnail PNG do vídeo
  videoUrl: string; // URL no disco do arquivo de vídeo (/assets/engine/video/...)
  width: number;
  height: number;
  duration: number;
}

/**
 * Lê um arquivo de vídeo do usuário, grava o vídeo e sua thumbnail diretamente
 * na unidade física de disco do projeto (`/public/assets/engine/video/`) e retorna
 * as URLs leves sem sobrecarregar a RAM com megabytes de Base64.
 */
export const readUploadedVideo = (file: File): Promise<ProcessedVideoResult> => {
  return new Promise((resolve, reject) => {
    const tempObjectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = tempObjectUrl;

    let hasResolved = false;

    const captureFrame = async () => {
      if (hasResolved) return;
      hasResolved = true;

      const width = video.videoWidth || 320;
      const height = video.videoHeight || 320;
      const duration = video.duration || 0;
      let thumbRawDataUrl = '';

      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          thumbRawDataUrl = canvas.toDataURL('image/png', 0.85);
        }
      } catch (e) {
        console.warn('Erro ao capturar frame de thumbnail do vídeo:', e);
      }

      cleanup();

      try {
        const diskVideoUrl = await uploadFileToDisk(file, 'video');
        const diskThumbUrl = thumbRawDataUrl
          ? await uploadDataUrlToDisk(thumbRawDataUrl, `thumb_${file.name}`, 'video')
          : diskVideoUrl;

        resolve({
          dataUrl: diskThumbUrl,
          videoUrl: diskVideoUrl,
          width,
          height,
          duration,
        });
      } catch (err) {
        reject(err);
      }
    };

    const cleanup = () => {
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      video.src = '';
      URL.revokeObjectURL(tempObjectUrl);
    };

    const onLoaded = () => {
      try {
        video.currentTime = Math.min(0.05, (video.duration || 1) / 2);
      } catch {
        captureFrame();
      }
    };

    const onSeeked = () => {
      captureFrame();
    };

    const onError = () => {
      cleanup();
      reject(new Error('Falha ao decodificar stream de vídeo'));
    };

    video.addEventListener('loadeddata', onLoaded);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    setTimeout(() => {
      if (!hasResolved) {
        captureFrame();
      }
    }, 3000);

    video.load();
  });
};

/**
 * Extrai a duração em segundos de qualquer URL de vídeo
 */
export const getVideoDuration = (url: string): Promise<number> => {
  return new Promise((resolve) => {
    if (!url) {
      resolve(0);
      return;
    }
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let resolved = false;
    const done = (dur: number) => {
      if (!resolved) {
        resolved = true;
        video.src = '';
        resolve(dur);
      }
    };

    video.onloadedmetadata = () => {
      done(video.duration || 1.0);
    };

    video.onerror = () => {
      done(1.0);
    };

    setTimeout(() => {
      done(1.0);
    }, 2500);

    video.src = url;
  });
};

// Cache global de elementos HTMLVideoElement pré-carregados e aquecidos em memória
const preloadedVideoCache = new Map<string, HTMLVideoElement>();

export const preloadVideoUrl = (url: string): HTMLVideoElement | null => {
  if (!url) return null;
  const existing = preloadedVideoCache.get(url);
  if (existing) return existing;

  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  video.load();
  preloadedVideoCache.set(url, video);
  return video;
};

export const getPreloadedVideo = (url: string): HTMLVideoElement | null => {
  if (!url) return null;
  const vid = preloadedVideoCache.get(url);
  if (vid && vid.readyState >= 2) {
    return vid;
  }
  return null;
};
