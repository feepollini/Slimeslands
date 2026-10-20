import { CardColorPalette } from '../types/card';
import {
  DEFAULT_PRESET_PALETTES,
  extractAdaptivePalettesFromImage,
} from './colorExtractor';

/**
 * Extracts adaptive frame and contour palettes from the first available frame of a video URL/Blob.
 */
export async function extractAdaptivePalettesFromVideo(
  videoUrl: string
): Promise<CardColorPalette[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'Anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      resolve(DEFAULT_PRESET_PALETTES);
    }, 3500);

    video.onloadeddata = () => {
      // Seek slightly into the video to avoid black fade-in frames
      video.currentTime = Math.min(0.5, (video.duration || 1) * 0.1);
    };

    video.onseeked = async () => {
      window.clearTimeout(timeoutId);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          resolve(DEFAULT_PRESET_PALETTES);
          return;
        }
        ctx.drawImage(video, 0, 0, 128, 128);
        const frameDataUrl = canvas.toDataURL('image/png');
        cleanup();
        const palettes = await extractAdaptivePalettesFromImage(frameDataUrl);
        resolve(palettes);
      } catch {
        cleanup();
        resolve(DEFAULT_PRESET_PALETTES);
      }
    };

    video.onerror = () => {
      window.clearTimeout(timeoutId);
      cleanup();
      resolve(DEFAULT_PRESET_PALETTES);
    };

    video.src = videoUrl;
  });
}

/**
 * Generates an animated procedural Canvas video stream (WebM/MP4 Blob URL) so the user can test
 * video cards with 1 click even before uploading their own MP4/WebM file.
 */
export async function createSampleAnimatedVideoBlobUrl(
  theme: 'crimson' | 'sapphire'
): Promise<string | null> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 340;
    canvas.height = 495;
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof canvas.captureStream !== 'function') return null;

    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : '';

    if (!mimeType) return null;

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        resolve(URL.createObjectURL(blob));
      };

      recorder.start();

      let frame = 0;
      const totalFrames = 75; // 2.5 seconds loopable animation
      const particles = Array.from({ length: 38 }, (_, i) => ({
        x: (i * 47) % 340,
        y: (i * 83) % 495,
        r: 1.5 + (i % 4),
        speedY: 1.8 + (i % 3) * 0.9,
        phase: i * 0.4,
      }));

      const drawFrame = () => {
        const t = frame / totalFrames;
        const angle = t * Math.PI * 2;

        // Animated deep magical vortex background
        const grad = ctx.createRadialGradient(
          170 + Math.sin(angle) * 28,
          200 + Math.cos(angle) * 20,
          15,
          170,
          245,
          320
        );

        if (theme === 'crimson') {
          grad.addColorStop(0, '#FF1E38');
          grad.addColorStop(0.38, '#7A0414');
          grad.addColorStop(0.75, '#290106');
          grad.addColorStop(1, '#080002');
        } else {
          grad.addColorStop(0, '#00F0FF');
          grad.addColorStop(0.38, '#0044AA');
          grad.addColorStop(0.75, '#001233');
          grad.addColorStop(1, '#00040D');
        }

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 340, 495);

        // Pulsing energy rings
        for (let r = 0; r < 3; r++) {
          const radius = 55 + r * 38 + Math.sin(angle + r) * 8;
          ctx.beginPath();
          ctx.arc(170, 200, radius, 0, Math.PI * 2);
          ctx.strokeStyle =
            theme === 'crimson'
              ? `rgba(255, 77, 94, ${0.45 - r * 0.12})`
              : `rgba(0, 240, 255, ${0.45 - r * 0.12})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Central mystic guardian silhouette
        ctx.save();
        ctx.translate(170, 215 + Math.sin(angle) * 7);
        ctx.fillStyle = theme === 'crimson' ? '#1C0105' : '#010D1F';
        ctx.strokeStyle = theme === 'crimson' ? '#FF3347' : '#00D9FF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -35, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-28, -8);
        ctx.quadraticCurveTo(-55, 80, -85, 200);
        ctx.lineTo(85, 200);
        ctx.quadraticCurveTo(55, 80, 28, -8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Rising bioluminescent embers / orbs
        particles.forEach((p, idx) => {
          const py = (p.y - frame * p.speedY + 495 * 4) % 495;
          const px = p.x + Math.sin(angle + p.phase) * 12;
          ctx.beginPath();
          ctx.arc(px, py, p.r, 0, Math.PI * 2);
          if (theme === 'crimson') {
            ctx.fillStyle = idx % 3 === 0 ? '#4ADE80' : '#FF4D5E';
          } else {
            ctx.fillStyle = idx % 3 === 0 ? '#A855F7' : '#38BDF8';
          }
          ctx.fill();
        });

        frame++;
        if (frame <= totalFrames) {
          requestAnimationFrame(drawFrame);
        } else {
          recorder.stop();
        }
      };

      drawFrame();
    });
  } catch {
    return null;
  }
}
