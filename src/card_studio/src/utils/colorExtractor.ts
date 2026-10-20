import { CardColorPalette } from '../types/card';

interface HSL {
  h: number;
  s: number;
  l: number;
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Generates a high-impact Hestridia-style adaptive frame & contour palette from a highlight Hue & Saturation.
 * Ensures the contour stroke is always a true vivid highlight color and the frame top has rich chromatic depth.
 */
export function buildPaletteFromHue(
  h: number,
  s: number,
  name: string,
  id: string,
  customStrokeLightness?: number
): CardColorPalette {
  const effectiveSat = Math.max(78, Math.min(100, s * 1.15));
  const strokeSat = Math.max(94, Math.min(100, s + 25));
  const strokeL = customStrokeLightness
    ? Math.max(48, Math.min(60, customStrokeLightness))
    : 52;

  const frameTopColor = hslToHex(h, effectiveSat, 20);
  const frameMidColor = hslToHex(h, effectiveSat, 12.5);
  const frameBottomColor = hslToHex(h, effectiveSat, 5.5);
  const strokeColor = hslToHex(h, strokeSat, strokeL);
  const elementTextColor = hslToHex(h, Math.max(80, effectiveSat), 32);
  const rankCircleColor = hslToHex((h + 275) % 360, 95, 52);

  return {
    id,
    name,
    frameTopColor,
    frameMidColor,
    frameBottomColor,
    strokeColor,
    elementTextColor,
    rankCircleColor,
  };
}

/**
 * High-precision Saliency & Highlight Color Extractor:
 * Prioritizes the true focal highlight color ("cor de destaque") of the card artwork
 * (glowing spells, eyes, aura, weapon energy, vibrant focal points) over dark/muddy background areas.
 */
export async function extractAdaptivePalettesFromImage(
  imageUrl: string
): Promise<CardColorPalette[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const sampleSize = 96; // Higher resolution 96x96 grid (9,216 pixels) to catch fine glowing highlights
        canvas.width = sampleSize;
        canvas.height = sampleSize;

        if (!ctx) {
          resolve(DEFAULT_PRESET_PALETTES);
          return;
        }

        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

        // 24 fine hue buckets (15 degrees each) for surgical color separation
        const numBuckets = 24;
        const buckets = Array.from({ length: numBuckets }, () => ({
          count: 0,
          highlightScore: 0,
          dominanceScore: 0,
          totalH: 0,
          totalS: 0,
          totalL: 0,
          peakS: 0,
          peakL: 52,
        }));

        for (let y = 0; y < sampleSize; y++) {
          for (let x = 0; x < sampleSize; x++) {
            const idx = (y * sampleSize + x) * 4;
            const r = imageData[idx];
            const g = imageData[idx + 1];
            const b = imageData[idx + 2];
            const a = imageData[idx + 3];

            if (a < 128) continue;

            const hsl = rgbToHsl(r, g, b);
            const maxC = Math.max(r, g, b) / 255;
            const minC = Math.min(r, g, b) / 255;
            const chroma = maxC - minC; // Direct RGB colorfulness (0..1)

            // Reject near-black shadows, washed-out whites, and muddy grays
            if (hsl.l < 12 || hsl.l > 93 || hsl.s < 20 || chroma < 0.15) {
              continue;
            }

            // Center-upper focal bias (where card character/spell focal point sits: X=0.5, Y=0.42)
            const normX = (x / sampleSize - 0.5) * 2;
            const normY = (y / sampleSize - 0.42) * 2;
            const distSq = normX * normX + normY * normY;
            const focalWeight = 1 + 0.75 * Math.exp(-distSq * 1.4);

            // Lightness bell curve peaking at L=54% (electric/glowing highlight sweet spot)
            const lDiff = Math.abs(hsl.l - 54);
            const luminousPop = Math.max(0.08, 1 - Math.pow(lDiff / 44, 1.6));

            // Exponential saturation & chroma boost so vivid highlight accents beat large dull backgrounds
            const satNorm = hsl.s / 100;
            const highlightWeight =
              Math.pow(satNorm, 2.8) *
              Math.pow(chroma, 2.2) *
              luminousPop *
              focalWeight;

            const dominanceWeight = satNorm * chroma * focalWeight;

            const bucketIdx = Math.floor(hsl.h / (360 / numBuckets)) % numBuckets;
            const bucket = buckets[bucketIdx];

            bucket.count += 1;
            bucket.highlightScore += highlightWeight;
            bucket.dominanceScore += dominanceWeight;
            bucket.totalH += hsl.h * highlightWeight;
            bucket.totalS += hsl.s * highlightWeight;
            bucket.totalL += hsl.l * highlightWeight;

            if (hsl.s > bucket.peakS && hsl.l >= 35 && hsl.l <= 72) {
              bucket.peakS = hsl.s;
              bucket.peakL = hsl.l;
            }
          }
        }

        // Rank buckets primarily by their Highlight Score (plus a boost for peak vibrance)
        const rankedByHighlight = buckets
          .map((b, idx) => {
            const avgH = b.highlightScore > 0 ? b.totalH / b.highlightScore : idx * 15;
            const avgS = b.highlightScore > 0 ? b.totalS / b.highlightScore : 85;
            const avgL = b.highlightScore > 0 ? b.totalL / b.highlightScore : 52;
            // Combine accumulated highlight energy with peak pixel intensity so small neon/magic glows win
            const combinedHighlightRank =
              b.highlightScore * (0.65 + 0.35 * (b.peakS / 100));
            return {
              ...b,
              idx,
              avgH,
              avgS: Math.max(avgS, b.peakS * 0.9),
              avgL,
              combinedHighlightRank,
            };
          })
          .filter((b) => b.count >= 6 && b.highlightScore > 0.05)
          .sort((a, b) => b.combinedHighlightRank - a.combinedHighlightRank);

        if (rankedByHighlight.length === 0) {
          resolve(DEFAULT_PRESET_PALETTES);
          return;
        }

        // Deduplicate hues that are too close (< 28 degrees apart) so every swatch is distinct
        const distinctPicks: typeof rankedByHighlight = [];
        for (const candidate of rankedByHighlight) {
          const isTooClose = distinctPicks.some((picked) => {
            const diff = Math.abs(candidate.avgH - picked.avgH);
            const circularDiff = Math.min(diff, 360 - diff);
            return circularDiff < 28;
          });
          if (!isTooClose) {
            distinctPicks.push(candidate);
          }
          if (distinctPicks.length >= 3) break;
        }

        // If the image is monochromatic, fill remaining slots with shifted variations
        const primary = distinctPicks[0];
        const palettes: CardColorPalette[] = [];

        // #1: True Highlight Color ("Cor de Destaque Principal") - Automatically applied!
        palettes.push(
          buildPaletteFromHue(
            primary.avgH,
            Math.max(88, primary.avgS),
            'Destaque Principal (Auto)',
            'extracted-highlight-1',
            primary.peakL
          )
        );

        // #2: Secondary Highlight or Dominant Aura
        if (distinctPicks[1]) {
          palettes.push(
            buildPaletteFromHue(
              distinctPicks[1].avgH,
              Math.max(84, distinctPicks[1].avgS),
              'Destaque Secundário',
              'extracted-highlight-2',
              distinctPicks[1].peakL
            )
          );
        } else {
          palettes.push(
            buildPaletteFromHue(
              (primary.avgH + 35) % 360,
              90,
              'Variação Luminosa',
              'extracted-highlight-2'
            )
          );
        }

        // #3: Third Accent or Analogous Energy
        if (distinctPicks[2]) {
          palettes.push(
            buildPaletteFromHue(
              distinctPicks[2].avgH,
              Math.max(84, distinctPicks[2].avgS),
              'Acento da Arte',
              'extracted-highlight-3',
              distinctPicks[2].peakL
            )
          );
        } else {
          palettes.push(
            buildPaletteFromHue(
              (primary.avgH - 35 + 360) % 360,
              90,
              'Acento Análogo',
              'extracted-highlight-3'
            )
          );
        }

        // #4: High-Contrast Complementary Highlight
        palettes.push(
          buildPaletteFromHue(
            (primary.avgH + 180) % 360,
            92,
            'Contraste Oposto',
            'extracted-comp'
          )
        );

        resolve(palettes);
      } catch {
        resolve(DEFAULT_PRESET_PALETTES);
      }
    };

    img.onerror = () => {
      resolve(DEFAULT_PRESET_PALETTES);
    };

    img.src = imageUrl;
  });
}

export const DEFAULT_PRESET_PALETTES: CardColorPalette[] = [
  {
    id: 'hestridia-original',
    name: 'Hestridia Original (Carmesim)',
    frameTopColor: '#4D0000',
    frameMidColor: '#240000',
    frameBottomColor: '#000000',
    strokeColor: '#FF0000',
    elementTextColor: '#007A1C',
    rankCircleColor: '#6B00FF',
  },
  {
    id: 'emerald-forest',
    name: 'Floresta Ancestral (Esmeralda)',
    frameTopColor: '#033F18',
    frameMidColor: '#011F0B',
    frameBottomColor: '#000000',
    strokeColor: '#00FF55',
    elementTextColor: '#007A1C',
    rankCircleColor: '#6B00FF',
  },
  {
    id: 'abyssal-sapphire',
    name: 'Abismo Oceânico (Safira)',
    frameTopColor: '#00224D',
    frameMidColor: '#001026',
    frameBottomColor: '#000000',
    strokeColor: '#0088FF',
    elementTextColor: '#0055CC',
    rankCircleColor: '#00C8FF',
  },
  {
    id: 'solar-gold',
    name: 'Santuário Solar (Ouro)',
    frameTopColor: '#4D3300',
    frameMidColor: '#261800',
    frameBottomColor: '#000000',
    strokeColor: '#FFB800',
    elementTextColor: '#B87700',
    rankCircleColor: '#FF5500',
  },
  {
    id: 'arcane-amethyst',
    name: 'Vórtice Arcano (Ametista)',
    frameTopColor: '#2E004D',
    frameMidColor: '#160026',
    frameBottomColor: '#000000',
    strokeColor: '#B829FF',
    elementTextColor: '#6B00FF',
    rankCircleColor: '#FF007A',
  },
  {
    id: 'cyber-cyan',
    name: 'Tempestade Glacial (Ciano)',
    frameTopColor: '#003D42',
    frameMidColor: '#001D21',
    frameBottomColor: '#000000',
    strokeColor: '#00F0FF',
    elementTextColor: '#008B94',
    rankCircleColor: '#6B00FF',
  },
];
