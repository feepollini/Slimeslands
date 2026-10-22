/**
 * Sistema de Extração de Paleta Multi-Cor e Tematização Dinâmica de Diálogo
 * Analisa a PNG do NPC / Asset e extrai múltiplas cores-chave:
 * 1. Cor Vibrante / Destaque (ex: Laranja/Fogo, Ouro, Safira, Esmeralda) -> Botões de Ação e detalhes
 * 2. Cor Profunda / Estrutural (ex: Bronze, Couro, Armadura, Sombra do Asset) -> Pílula de Nome e Degradê de Fundo
 * 3. Superfície Pastel Quente -> Caixa de Diálogo suave e legível
 */

export interface DialogueTheme {
  primary: string;          // Cor principal de destaque
  darkColor: string;        // Borda e contorno contrastante
  nameBg: string;           // Fundo da pílula do nome do orador
  surfaceBg: string;        // Fundo cápsula de diálogo suave pastel
  surfaceBorder: string;    // Borda da cápsula de diálogo
  surfaceText: string;      // Cor do texto de alta legibilidade (tom escuro saturado)
  cursorColor: string;      // Cor do cursor piscante da digitação
  buttonBg: string;         // Cor de fundo do botão principal
  buttonHoverBg: string;    // Hover do botão principal
  buttonSecondaryBg: string;// Cor de fundo do botão secundário
  gradientVia: string;      // Cor intermediária do degradê
  gradientTo: string;       // Cor final sólida inferior do degradê
}

export const DEFAULT_GREEN_THEME: DialogueTheme = {
  primary: '#547f29',
  darkColor: '#1e3b14',
  nameBg: '#365c19',
  surfaceBg: '#e8f5e5',
  surfaceBorder: '#b5dbaf',
  surfaceText: '#1b3711',
  cursorColor: '#4f8524',
  buttonBg: '#5da02c',
  buttonHoverBg: '#6cb533',
  buttonSecondaryBg: '#2c4b14',
  gradientVia: 'rgba(38, 68, 22, 0.85)',
  gradientTo: '#1b330e',
};

// Cache em memória para evitar re-processar imagens repetidas
const themeCache = new Map<string, DialogueTheme>();

/**
 * Converte RGB (0-255) para HSL (H: 0-360, S: 0-1, L: 0-1)
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const d = max - min;

  let h = 0;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : l > 0.5 ? d / (2 - max - min) : d / (max + min);

  if (d !== 0) {
    switch (max) {
      case rf:
        h = ((gf - bf) / d + (gf < bf ? 6 : 0)) * 60;
        break;
      case gf:
        h = ((bf - rf) / d + 2) * 60;
        break;
      case bf:
        h = ((rf - gf) / d + 4) * 60;
        break;
    }
  }

  return [Math.round(h), s, l];
}

/**
 * Converte Hex (#rrggbb ou #rgb) para HSL
 */
function hexToHsl(hex: string): [number, number, number] {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return [105, 0.6, 0.35];
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return rgbToHsl(r, g, b);
}

/**
 * Constrói tema multi-cor a partir de uma cor vibrante (destaque) e uma cor profunda (base)
 */
export function buildDualTheme(
  vibrantH: number,
  vibrantS: number,
  deepH: number,
  deepS: number
): DialogueTheme {
  const vH = Math.round((vibrantH % 360 + 360) % 360);
  const dH = Math.round((deepH % 360 + 360) % 360);

  const vSat = Math.max(0.70, Math.min(0.96, vibrantS));
  const dSat = Math.max(0.40, Math.min(0.85, deepS));

  const vPct = Math.round(vSat * 100);
  const dPct = Math.round(dSat * 100);

  return {
    primary: `hsl(${vH}, ${vPct}%, 46%)`,
    // Pílula de Nome: tom rico de base com borda escura nítida
    darkColor: `hsl(${dH}, ${dPct}%, 14%)`,
    nameBg: `hsl(${dH}, ${Math.round(dPct * 0.75)}%, 23%)`,
    // Caixa de Diálogo: pastel claro iluminado pela cor vibrante (ex: creme-dourado / pêssego)
    surfaceBg: `hsl(${vH}, 50%, 94%)`,
    surfaceBorder: `hsl(${vH}, 60%, 78%)`,
    surfaceText: `hsl(${dH}, 65%, 15%)`,
    cursorColor: `hsl(${vH}, ${vPct}%, 40%)`,
    // Botões: Destaque vibrante com a cor mais chamativa da PNG (ex: Laranja/Fogo vivo)
    buttonBg: `hsl(${vH}, ${vPct}%, 44%)`,
    buttonHoverBg: `hsl(${vH}, ${vPct}%, 50%)`,
    buttonSecondaryBg: `hsl(${dH}, ${Math.round(dPct * 0.75)}%, 25%)`,
    // Degradê de fundo com a cor vibrante temática do NPC/Asset
    gradientVia: `hsla(${vH}, ${Math.round(vPct * 0.85)}%, 36%, 0.85)`,
    gradientTo: `hsl(${vH}, ${Math.round(vPct * 0.85)}%, 24%)`,
  };
}

/**
 * Constrói tema a partir de uma única matiz
 */
export function buildThemeFromHue(hue: number, saturation = 0.65): DialogueTheme {
  return buildDualTheme(hue, saturation, hue, saturation);
}

/**
 * Gera tema a partir de uma cor hexadecimal de fallback
 */
export function buildThemeFromHex(hex: string): DialogueTheme {
  const [h, s] = hexToHsl(hex);
  return buildDualTheme(h, Math.max(0.55, s), h, Math.max(0.45, s));
}

/**
 * Extrai a paleta multi-cor dominante da PNG do NPC/Asset via Canvas offscreen
 */
export function extractThemeFromImage(
  imageSrc: string | null | undefined,
  fallbackColor?: string
): Promise<DialogueTheme> {
  const fallback = fallbackColor ? buildThemeFromHex(fallbackColor) : DEFAULT_GREEN_THEME;

  if (!imageSrc || typeof imageSrc !== 'string' || !imageSrc.trim()) {
    return Promise.resolve(fallback);
  }

  // Se já está em cache, retorna instantaneamente
  if (themeCache.has(imageSrc)) {
    return Promise.resolve(themeCache.get(imageSrc)!);
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const sampleSize = 48; // Amostragem de resolução adequada
          canvas.width = sampleSize;
          canvas.height = sampleSize;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            themeCache.set(imageSrc, fallback);
            resolve(fallback);
            return;
          }

          ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
          const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize);
          const data = imgData.data;

          // 36 Baldes de matiz (10 graus cada balde: 0-359)
          const NUM_BUCKETS = 36;
          const vibrancyScores = new Float32Array(NUM_BUCKETS);
          const frequencyScores = new Float32Array(NUM_BUCKETS);
          const bucketHues: number[][] = Array.from({ length: NUM_BUCKETS }, () => []);
          const bucketSats: number[][] = Array.from({ length: NUM_BUCKETS }, () => []);
          const bucketLights: number[][] = Array.from({ length: NUM_BUCKETS }, () => []);

          let validCount = 0;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Ignora pixels transparentes
            if (a < 50) continue;

            const [h, s, l] = rgbToHsl(r, g, b);

            // Ignora sombras absolutas ou brancos estourados
            if (l < 0.12 || l > 0.95) continue;

            // Ignora cinzas mortos/desaturados
            if (s < 0.18) continue;

            const bucketIdx = Math.floor(h / 10) % NUM_BUCKETS;

            // Pontuação de VIBRÂNCIA: prioriza exponencialmente cores vivas/saturadas (ex: Fogo/Laranja/Cores puras)
            const vibrantWeight = Math.pow(s, 2.4) * (l >= 0.32 && l <= 0.82 ? 2.2 : 0.7);
            vibrancyScores[bucketIdx] += vibrantWeight;

            // Pontuação de FREQUÊNCIA: volume de pixels para tons de base/armadura/fundo
            frequencyScores[bucketIdx] += 1;

            bucketHues[bucketIdx].push(h);
            bucketSats[bucketIdx].push(s);
            bucketLights[bucketIdx].push(l);
            validCount++;
          }

          if (validCount === 0) {
            themeCache.set(imageSrc, fallback);
            resolve(fallback);
            return;
          }

          // 1. Encontra a cor MAIS VIBRANTE da PNG (ex: Laranja flamejante, Azul brilhante, etc.)
          let bestVibrantIdx = 0;
          let maxVibrancy = -1;
          for (let i = 0; i < NUM_BUCKETS; i++) {
            if (vibrancyScores[i] > maxVibrancy) {
              maxVibrancy = vibrancyScores[i];
              bestVibrantIdx = i;
            }
          }

          const vibrantHues = bucketHues[bestVibrantIdx];
          const vibrantSats = bucketSats[bestVibrantIdx];
          const vibrantH = vibrantHues.reduce((a, b) => a + b, 0) / vibrantHues.length;
          const vibrantS = vibrantSats.reduce((a, b) => a + b, 0) / vibrantSats.length;

          // 2. Encontra a cor DEEP / ESTRUTURAL (secundária ou de base como armadura/bronze/sombra)
          let bestDeepIdx = bestVibrantIdx;
          let maxDeepWeight = -1;
          for (let i = 0; i < NUM_BUCKETS; i++) {
            if (frequencyScores[i] === 0) continue;
            const avgL = bucketLights[i].reduce((a, b) => a + b, 0) / bucketLights[i].length;
            const avgH = bucketHues[i].reduce((a, b) => a + b, 0) / bucketHues[i].length;
            const diffH = Math.min(Math.abs(avgH - vibrantH), 360 - Math.abs(avgH - vibrantH));

            // Favorece tons mais profundos (L < 0.45) ou matizes complementares
            let deepScore = frequencyScores[i];
            if (avgL < 0.45) deepScore *= 2.0;
            if (diffH > 15) deepScore *= 1.4;

            if (deepScore > maxDeepWeight) {
              maxDeepWeight = deepScore;
              bestDeepIdx = i;
            }
          }

          const deepHues = bucketHues[bestDeepIdx];
          const deepSats = bucketSats[bestDeepIdx];
          const deepH = deepHues.reduce((a, b) => a + b, 0) / deepHues.length;
          const deepS = deepSats.reduce((a, b) => a + b, 0) / deepSats.length;

          const theme = buildDualTheme(vibrantH, vibrantS, deepH, deepS);
          themeCache.set(imageSrc, theme);
          resolve(theme);
        } catch {
          themeCache.set(imageSrc, fallback);
          resolve(fallback);
        }
      };

      img.onerror = () => {
        themeCache.set(imageSrc, fallback);
        resolve(fallback);
      };

      img.src = imageSrc;
    } catch {
      resolve(fallback);
    }
  });
}
