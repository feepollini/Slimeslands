// Utilitários para processamento, amostragem e geração de thumbnails de vídeos para assets
export const isVideoFile = (file: File): boolean => {
  return (
    file.type.startsWith('video/') ||
    /\.(mp4|webm|ogg|mov|mkv)$/i.test(file.name)
  );
};

export interface ProcessedVideoResult {
  dataUrl: string; // Thumbnail base64 para preview imediato em qualquer lugar
  videoUrl: string; // DataURL ou Blob URL com o conteúdo do vídeo
  width: number;
  height: number;
  duration: number;
}

/**
 * Lê um arquivo de vídeo do usuário, converte para DataURL persistente,
 * extrai metadados de resolução/duração e captura um frame como thumbnail.
 */
export const readUploadedVideo = (file: File): Promise<ProcessedVideoResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Erro ao ler arquivo de vídeo'));

    reader.onload = () => {
      const videoDataUrl = reader.result as string;
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.src = videoDataUrl;

      let hasResolved = false;

      const captureFrame = () => {
        if (hasResolved) return;
        try {
          const width = video.videoWidth || 320;
          const height = video.videoHeight || 320;
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const thumbDataUrl = canvas.toDataURL('image/png', 0.85);
            hasResolved = true;
            resolve({
              dataUrl: thumbDataUrl,
              videoUrl: videoDataUrl,
              width,
              height,
              duration: video.duration || 0,
            });
            cleanup();
            return;
          }
        } catch (e) {
          console.warn('Erro ao capturar frame de thumbnail do vídeo:', e);
        }

        // Fallback se não conseguir capturar frame do canvas
        hasResolved = true;
        resolve({
          dataUrl: videoDataUrl,
          videoUrl: videoDataUrl,
          width: video.videoWidth || 320,
          height: video.videoHeight || 320,
          duration: video.duration || 0,
        });
        cleanup();
      };

      const cleanup = () => {
        video.removeEventListener('loadeddata', onLoaded);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        video.src = '';
      };

      const onLoaded = () => {
        // Tenta buscar no 0.05s para garantir que o primeiro frame renderizou
        try {
          video.currentTime = Math.min(0.05, (video.duration || 1) / 2);
        } catch {
          captureFrame();
        }
      };

      const onSeeked = () => {
        captureFrame();
      };

      const onError = (e: any) => {
        cleanup();
        reject(new Error('Falha ao decodificar stream de vídeo'));
      };

      video.addEventListener('loadeddata', onLoaded);
      video.addEventListener('seeked', onSeeked);
      video.addEventListener('error', onError);

      // Timeout de segurança para vídeos que demorem a disparar seeked
      setTimeout(() => {
        if (!hasResolved) {
          captureFrame();
        }
      }, 3000);

      video.load();
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Extrai a duração em segundos de qualquer URL de vídeo (dataUrl, blob ou http)
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

// Cache global de elementos HTMLVideoElement pré-carregados e aquecidos em memória (0ms de latência)
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
