// Sprites vetoriais limpos e codificados com segurança para atmosfera, insetos e vento

export const FIREFLY_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
  <defs>
    <radialGradient id="ffglow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.95"/>
      <stop offset="40%" stop-color="#eab308" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#ca8a04" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="wingGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#bfdbfe" stop-opacity="0.4"/>
    </radialGradient>
  </defs>
  <!-- Halo luminoso do abdômen -->
  <circle cx="20" cy="27" r="10" fill="url(#ffglow)"/>
  <!-- Asas transparentes -->
  <ellipse cx="14" cy="17" rx="9" ry="4" fill="url(#wingGlow)" transform="rotate(-30 14 17)"/>
  <ellipse cx="26" cy="17" rx="9" ry="4" fill="url(#wingGlow)" transform="rotate(30 26 17)"/>
  <!-- Cabeça e corpo do vagalume -->
  <ellipse cx="20" cy="19" rx="3.5" ry="4.5" fill="#1c1917"/>
  <circle cx="20" cy="13" r="2.8" fill="#0f172a"/>
  <!-- Olhos minúsculos -->
  <circle cx="18.5" cy="12.2" r="0.8" fill="#facc15"/>
  <circle cx="21.5" cy="12.2" r="0.8" fill="#facc15"/>
  <!-- Abdômen incandescente central -->
  <ellipse cx="20" cy="26" rx="3.2" ry="4" fill="#fef08a"/>
</svg>
`)}`;

export const FLY_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <linearGradient id="flyWing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#94a3b8" stop-opacity="0.35"/>
    </linearGradient>
  </defs>
  <!-- Asas translúcidas de mosca -->
  <ellipse cx="10" cy="13" rx="7.5" ry="3.2" fill="url(#flyWing)" stroke="#cbd5e1" stroke-width="0.5" transform="rotate(-35 10 13)"/>
  <ellipse cx="22" cy="13" rx="7.5" ry="3.2" fill="url(#flyWing)" stroke="#cbd5e1" stroke-width="0.5" transform="rotate(35 22 13)"/>
  <!-- Patinhas finas -->
  <path d="M 12 16 L 8 20 M 12 19 L 7 24 M 20 16 L 24 20 M 20 19 L 25 24" stroke="#475569" stroke-width="0.8" stroke-linecap="round"/>
  <!-- Corpo e Tórax -->
  <ellipse cx="16" cy="18" rx="3" ry="5.5" fill="#1e293b"/>
  <ellipse cx="16" cy="23" rx="3.8" ry="4.8" fill="#090d16"/>
  <!-- Olhos vermelhos iridescentes -->
  <circle cx="14.5" cy="13" r="1.8" fill="#dc2626"/>
  <circle cx="17.5" cy="13" r="1.8" fill="#dc2626"/>
</svg>
`)}`;

export const BUTTERFLY_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="44" height="44">
  <defs>
    <linearGradient id="bfWingLeft" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="60%" stop-color="#ea580c"/>
      <stop offset="100%" stop-color="#facc15"/>
    </linearGradient>
    <linearGradient id="bfWingRight" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="60%" stop-color="#ea580c"/>
      <stop offset="100%" stop-color="#facc15"/>
    </linearGradient>
  </defs>
  <!-- Asa Superior Esquerda -->
  <path d="M 21 21 C 14 10, 4 12, 5 21 C 6 27, 15 28, 21 24 Z" fill="url(#bfWingLeft)" stroke="#0f172a" stroke-width="0.8"/>
  <!-- Asa Inferior Esquerda -->
  <path d="M 21 24 C 15 27, 8 32, 11 37 C 14 40, 19 35, 21 27 Z" fill="url(#bfWingLeft)" stroke="#0f172a" stroke-width="0.8"/>
  <!-- Asa Superior Direita -->
  <path d="M 23 21 C 30 10, 40 12, 39 21 C 38 27, 29 28, 23 24 Z" fill="url(#bfWingRight)" stroke="#0f172a" stroke-width="0.8"/>
  <!-- Asa Inferior Direita -->
  <path d="M 23 24 C 29 27, 36 32, 33 37 C 30 40, 25 35, 23 27 Z" fill="url(#bfWingRight)" stroke="#0f172a" stroke-width="0.8"/>
  <!-- Corpo & Antenas -->
  <ellipse cx="22" cy="24" rx="1.8" ry="7" fill="#0f172a"/>
  <circle cx="22" cy="16" r="1.6" fill="#0f172a"/>
  <path d="M 21.5 15 Q 18 10, 15 11 M 22.5 15 Q 26 10, 29 11" stroke="#0f172a" stroke-width="0.8" fill="none" stroke-linecap="round"/>
</svg>
`)}`;

export const ANT_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <!-- Patas da formiga (6 pernas articuladas) -->
  <path d="M 12 10 L 6 7 M 12 12 L 5 12 M 12 14 L 6 17 M 12 10 L 18 7 M 12 12 L 19 12 M 12 14 L 18 17" stroke="#1c1917" stroke-width="1.2" stroke-linecap="round"/>
  <!-- Antenas -->
  <path d="M 12 6 Q 10 3, 8 4 M 12 6 Q 14 3, 16 4" stroke="#292524" stroke-width="0.9" fill="none" stroke-linecap="round"/>
  <!-- Abdômen -->
  <ellipse cx="12" cy="17.5" rx="3.4" ry="4.5" fill="#1c1917"/>
  <!-- Tórax -->
  <ellipse cx="12" cy="12" rx="2.2" ry="2.8" fill="#292524"/>
  <!-- Cabeça com mandíbulas -->
  <circle cx="12" cy="7.5" r="2.4" fill="#1c1917"/>
</svg>
`)}`;

export const WIND_GUST_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="240" height="60">
  <defs>
    <linearGradient id="windGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="25%" stop-color="#ffffff" stop-opacity="0.65"/>
      <stop offset="65%" stop-color="#e0f2fe" stop-opacity="0.85"/>
      <stop offset="90%" stop-color="#ffffff" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="windPuff" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#e0f2fe" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- Voluta e espiral de rajada estilizada -->
  <path d="M 10 32 Q 70 12, 130 34 T 205 28 C 220 24, 230 30, 222 38 C 214 45, 204 38, 210 30" 
        fill="none" stroke="url(#windGrad)" stroke-width="3" stroke-linecap="round"/>
  <!-- Linhas secundárias e poeira de brisa -->
  <path d="M 35 38 Q 95 24, 155 40 T 215 35" 
        fill="none" stroke="url(#windGrad)" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="40 20"/>
  <circle cx="90" cy="22" r="6" fill="url(#windPuff)"/>
  <circle cx="160" cy="38" r="8" fill="url(#windPuff)"/>
</svg>
`)}`;

export const DEFAULT_FOG_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 180" width="600" height="180">
  <defs>
    <radialGradient id="f1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/>
      <stop offset="40%" stop-color="#f8fafc" stop-opacity="0.16"/>
      <stop offset="75%" stop-color="#f1f5f9" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="f2" cx="35%" cy="50%" r="45%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.2"/>
      <stop offset="60%" stop-color="#f8fafc" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="f3" cx="65%" cy="50%" r="45%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.2"/>
      <stop offset="60%" stop-color="#f8fafc" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="300" cy="90" rx="270" ry="60" fill="url(#f1)"/>
  <ellipse cx="190" cy="95" rx="170" ry="45" fill="url(#f2)"/>
  <ellipse cx="410" cy="85" rx="170" ry="45" fill="url(#f3)"/>
</svg>
`.trim())}`;

export const DEFAULT_CLOUD_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 140" width="280" height="140">
  <defs>
    <linearGradient id="cw" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="75%" stop-color="#f8fafc" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#e2e8f0" stop-opacity="0.45"/>
    </linearGradient>
    <filter id="cblur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4"/>
    </filter>
  </defs>
  <g filter="url(#cblur)">
    <path d="M50,105 Q20,105 20,82 Q20,58 50,56 Q60,28 95,24 Q135,18 155,40 Q175,24 210,30 Q245,36 250,68 Q270,76 265,96 Q260,105 235,105 Z" fill="url(#cw)"/>
  </g>
</svg>
`.trim())}`;

export const AUTUMN_LEAF_SVGS = [
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C13 5 17 6 18 9C19 12 17 15 15 17C14 18 13 21 12 22C11 21 10 18 9 17C7 15 5 12 6 9C7 6 11 5 12 2Z" fill="#f59e0b"/><path d="M12 4V20M12 9L15 7M12 13L16 11M12 10L9 8M12 14L8 12" stroke="#78350f" stroke-width="0.8" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C16 5 20 10 18 16C16 20 13 21 12 22C11 21 8 20 6 16C4 10 8 5 12 2Z" fill="#ea580c"/><path d="M12 4V21M12 8L16 6M12 12L17 10M12 9L8 7M12 13L7 11" stroke="#7c2d12" stroke-width="0.8" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C15 6 19 8 18 14C17 19 13 21 12 22C11 21 7 19 6 14C5 8 9 6 12 2Z" fill="#dc2626"/><path d="M12 3V21M12 7L16 6M12 11L17 10M12 8L8 7M12 12L7 11" stroke="#450a0a" stroke-width="0.8" stroke-linecap="round"/></svg>')}`,
];

export const SPRING_LEAF_SVGS = [
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3C15 5 19 8 18 13C17 17 14 19 12 21C10 19 7 17 6 13C5 8 9 5 12 3Z" fill="#f472b6"/><path d="M12 6V18" stroke="#db2777" stroke-width="0.7" stroke-linecap="round"/><circle cx="12" cy="7" r="1.5" fill="#fdf2f8"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C16 5 20 9 18 15C16 19 13 21 12 22C11 21 8 19 6 15C4 9 8 5 12 2Z" fill="#fb7185"/><path d="M12 5V19M12 9L15 7M12 13L16 11" stroke="#be123c" stroke-width="0.8" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C14 5 18 7 17 12C16 17 13 20 12 22C11 20 8 17 7 12C6 7 10 5 12 2Z" fill="#86efac"/><path d="M12 4V20M12 8L15 6M12 12L15 10" stroke="#16a34a" stroke-width="0.8" stroke-linecap="round"/></svg>')}`,
];

export const DRY_LEAF_SVGS = [
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C14 6 18 8 17 14C16 19 13 21 12 22C11 21 8 19 7 14C6 8 10 6 12 2Z" fill="#78350f"/><path d="M12 4V20M12 8L15 6M12 12L16 10M12 9L9 7M12 13L8 11" stroke="#451a03" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C15 5 19 9 18 15C16 20 13 21 12 22C11 21 8 20 6 15C5 9 9 5 12 2Z" fill="#92400e"/><path d="M12 4V21M12 8L16 6M12 12L16 10M12 9L8 7" stroke="#451a03" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C14 5 17 7 17 13C16 18 13 21 12 22C11 21 8 18 7 13C7 7 10 5 12 2Z" fill="#b45309"/><path d="M12 4V20M12 8L15 6M12 12L15 10" stroke="#78350f" stroke-width="0.8" stroke-linecap="round"/></svg>')}`,
];

export const JUNGLE_LEAF_SVGS = [
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C15 5 19 8 18 14C17 19 13 21 12 22C11 21 7 19 6 14C5 8 9 5 12 2Z" fill="#10b981"/><path d="M12 4V20M12 8L16 6M12 12L16 10M12 9L8 7M12 13L8 11" stroke="#064e3b" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C16 5 20 9 18 15C16 19 13 21 12 22C11 21 8 19 6 15C4 9 8 5 12 2Z" fill="#84cc16"/><path d="M12 4V21M12 8L16 6M12 12L16 10M12 9L8 7" stroke="#365314" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C14 5 18 7 17 13C16 18 13 21 12 22C11 21 8 18 7 13C6 7 10 5 12 2Z" fill="#059669"/><path d="M12 4V20M12 8L15 6M12 12L15 10" stroke="#022c22" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
];

export const MYSTIC_LEAF_SVGS = [
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C15 5 19 8 18 14C17 19 13 21 12 22C11 21 7 19 6 14C5 8 9 5 12 2Z" fill="#a855f7"/><path d="M12 4V20M12 8L16 6M12 12L16 10M12 9L8 7M12 13L8 11" stroke="#3b0764" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C16 5 20 9 18 15C16 19 13 21 12 22C11 21 8 19 6 15C4 9 8 5 12 2Z" fill="#c084fc"/><path d="M12 4V21M12 8L16 6M12 12L16 10M12 9L8 7" stroke="#581c87" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C14 5 18 7 17 13C16 18 13 21 12 22C11 21 8 18 7 13C6 7 10 5 12 2Z" fill="#e879f9"/><path d="M12 4V20M12 8L15 6M12 12L15 10" stroke="#701a75" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
];

export const FROST_LEAF_SVGS = [
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C15 5 19 8 18 14C17 19 13 21 12 22C11 21 7 19 6 14C5 8 9 5 12 2Z" fill="#38bdf8"/><path d="M12 4V20M12 8L16 6M12 12L16 10M12 9L8 7M12 13L8 11" stroke="#082f49" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C16 5 20 9 18 15C16 19 13 21 12 22C11 21 8 19 6 15C4 9 8 5 12 2Z" fill="#7dd3fc"/><path d="M12 4V21M12 8L16 6M12 12L16 10M12 9L8 7" stroke="#0c4a6e" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C14 5 18 7 17 13C16 18 13 21 12 22C11 21 8 18 7 13C6 7 10 5 12 2Z" fill="#bae6fd"/><path d="M12 4V20M12 8L15 6M12 12L15 10" stroke="#0369a1" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
];

export const NEON_LEAF_SVGS = [
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C15 5 19 8 18 14C17 19 13 21 12 22C11 21 7 19 6 14C5 8 9 5 12 2Z" fill="#06b6d4"/><path d="M12 4V20M12 8L16 6M12 12L16 10M12 9L8 7M12 13L8 11" stroke="#164e63" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C16 5 20 9 18 15C16 19 13 21 12 22C11 21 8 19 6 15C4 9 8 5 12 2Z" fill="#f43f5e"/><path d="M12 4V21M12 8L16 6M12 12L16 10M12 9L8 7" stroke="#881337" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C14 5 18 7 17 13C16 18 13 21 12 22C11 21 8 18 7 13C6 7 10 5 12 2Z" fill="#a855f7"/><path d="M12 4V20M12 8L15 6M12 12L15 10" stroke="#3b0764" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
];

export function applyCustomTintToSvg(svgUrl: string, tintHex?: string): string {
  if (!tintHex) return svgUrl;
  try {
    const rawSvg = decodeURIComponent(svgUrl.replace('data:image/svg+xml;utf8,', ''));
    const tintedSvg = rawSvg.replace(/fill="([^"]+)"/g, `fill="${tintHex}"`);
    return `data:image/svg+xml;utf8,${encodeURIComponent(tintedSvg)}`;
  } catch (e) {
    return svgUrl;
  }
}

export function getLeafGroupSvgs(preset?: string, customTint?: string): string[] {
  let list = AUTUMN_LEAF_SVGS;
  switch (preset) {
    case 'spring': list = SPRING_LEAF_SVGS; break;
    case 'dry': list = DRY_LEAF_SVGS; break;
    case 'jungle': list = JUNGLE_LEAF_SVGS; break;
    case 'mystic': list = MYSTIC_LEAF_SVGS; break;
    case 'frost': list = FROST_LEAF_SVGS; break;
    case 'neon': list = NEON_LEAF_SVGS; break;
    case 'autumn':
    default:
      list = AUTUMN_LEAF_SVGS; break;
  }
  if (customTint) {
    return list.map((url) => applyCustomTintToSvg(url, customTint));
  }
  return list;
}
