import React, { useId } from 'react';
import { Lock } from 'lucide-react';

export type MarkerRevealStage = 'hidden' | 'spark_born' | 'star_only' | 'star_flare' | 'full';

export interface OrnateMapMarkerPinProps {
  name: string;
  iconPng?: string;
  iconEmoji?: string;
  status?: 'locked' | 'unlocked' | 'completed';
  customLockIconPng?: string;
  badgeText?: string;
  isSelected?: boolean;
  isFocused?: boolean;
  scale?: number;
  sizeVariant?: 'sm' | 'md' | 'lg';
  revealStage?: MarkerRevealStage;
  hideTopAsset?: boolean;
}

// ============================================================================
// SINTETIZADOR CELESTIAL WEB AUDIO PARA A MELODIA DAS ESTRELAS DO MAPA
// ============================================================================
let sharedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctx) sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

// Escala Celestial Pentatônica / Lídia (C5, D5, E5, G5, A5, B5, D6, E6, G6)
const CONSTELLATION_NOTES_HZ = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.0,  // A5
  987.77, // B5
  1174.66, // D6
  1318.51, // E6
  1567.98, // G6
];

export function playConstellationStarNote(starIndex: number, isLastStar: boolean): void {
  const ctx = getAudioCtx();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const baseFreq = CONSTELLATION_NOTES_HZ[starIndex % CONSTELLATION_NOTES_HZ.length];

    // Nota suave e etérea com ataque lento (Harpa / Celesta suave)
    const playSoftBellTone = (freq: number, startTime: number, duration: number, peakGain: number) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, startTime);

      const overtoneGain = ctx.createGain();
      overtoneGain.gain.setValueAtTime(0.12, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      // Ataque lento (85ms) para sensação suave e calma
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.085);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc1.connect(gain);
      osc2.connect(overtoneGain);
      overtoneGain.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration + 0.08);
      osc2.stop(startTime + duration + 0.08);
    };

    // Toca a nota suave da estrela atual
    playSoftBellTone(baseFreq, now, isLastStar ? 3.2 : 2.1, isLastStar ? 0.095 : 0.075);
    // Harmônico de quinta bem sutil
    playSoftBellTone(baseFreq * 1.5, now + 0.06, isLastStar ? 2.6 : 1.6, 0.025);

    // Se for a última estrela, toca um acorde suave e lento enquanto a escuridão se dissolve
    if (isLastStar) {
      const chordFreqs = [523.25, 659.25, 783.99, 987.77, 1318.51];
      chordFreqs.forEach((cf, idx) => {
        playSoftBellTone(cf, now + 0.28 + idx * 0.14, 3.6, 0.042);
      });
    }
  } catch {
    // Ignora caso o navegador bloqueie áudio antes de interação
  }
}

export function playMarkersUnfurlChime(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    [659.25, 783.99, 987.77, 1318.51].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      gain.gain.setValueAtTime(0.0001, now + i * 0.09);
      gain.gain.linearRampToValueAtTime(0.038, now + i * 0.09 + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 1.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 1.45);
    });
  } catch {}
}

/**
 * OrnateMapMarkerPin — Visual fiel às imagens de referência do usuário:
 * - Imagem 1: Anel circular dourado à esquerda com estrela de 4 pontas (✦) metálica
 *   ultrapassando o aro + cápsula horizontal branca com borda dourada curvada acompanhando o arco do círculo.
 * - Imagem 2: O asset PNG do local posicionado diretamente acima da barra horizontal dourada/branca,
 *   à direita da estrela de 4 pontas e do círculo.
 * - Suporta os estágios da revelação cinematográfica (`revealStage`):
 *   - 'hidden': invisível na escuridão (opacidade 0 para permitir fade-in lento e suave)
 *   - 'star_flare' / 'star_only': apenas a estrela de 4 pontas surge com brilho suave na tela preta
 *   - 'full': o anel circular, a barra horizontal e o PNG surgem suavemente ao redor da estrela
 */
export const OrnateMapMarkerPin: React.FC<OrnateMapMarkerPinProps> = ({
  name,
  iconPng,
  iconEmoji = '🏰',
  status = 'unlocked',
  customLockIconPng,
  badgeText,
  isSelected = false,
  isFocused = false,
  scale = 1.0,
  sizeVariant = 'md',
  revealStage = 'full',
  hideTopAsset = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const isLocked = status === 'locked';

  // Clean display name: if it has "Star • Title", show concise full name or expand banner dynamically
  const displayLabel = name.includes('•')
    ? name.split('•')[0].trim() + ' • ' + name.split('•').slice(1).join('•').trim()
    : name;

  // Dynamic SVG viewBox width so longer names never get cut off with "..."
  const charCount = displayLabel.length;
  const extraChars = Math.max(0, charCount - 11);
  const svgViewWidth = 380 + extraChars * 14;
  const bannerEndX = svgViewWidth - 32;

  const baseStarWidth = sizeVariant === 'sm' ? 112 : sizeVariant === 'lg' ? 156 : 132;
  const baseWidth = Math.round((baseStarWidth * svgViewWidth) / 380);
  const baseHeight = Math.round((baseStarWidth * 160) / 380);
  const bannerTopFromBottomPx = Math.round(baseHeight * (80 / 160));
  const pngLeftPx = Math.round(baseStarWidth * (118 / 380));
  const pngWidthPx = Math.round(baseStarWidth * (252 / 380));
  const pngHeightPx = Math.round(baseStarWidth * 0.54);

  // Posição exata do centro da estrela (cx = 76 de 380, cy = 80 de 160)
  const starCenterXPx = Math.round(baseStarWidth * (76 / 380));
  const starCenterFromBottomPx = Math.round(baseHeight * (80 / 160));

  const effectiveScale = scale * (isFocused ? 1.12 : isSelected ? 1.06 : 1.0);

  const isHidden = revealStage === 'hidden';
  const isSparkBorn = revealStage === 'spark_born';
  const isFullMarkerVisible = revealStage === 'full';
  const isStarFlaring = revealStage === 'star_flare';
  const isStarOnlyMode =
    revealStage === 'spark_born' || revealStage === 'star_only' || revealStage === 'star_flare';

  return (
    <div
      className={`relative select-none flex flex-col items-center group ${
        isHidden ? 'pointer-events-none' : ''
      }`}
      style={{
        width: `${baseWidth}px`,
        transform: `scale(${effectiveScale})`,
        transformOrigin: `${Math.round((76 / svgViewWidth) * 100)}% 84%`,
        transition: 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <style>{`
        @keyframes starHaloPulse {
          0%, 100% {
            transform: scale(0.76);
            opacity: 0.62;
          }
          50% {
            transform: scale(1.16);
            opacity: 1;
          }
        }
        @keyframes starCoreSparkPulse {
          0%, 100% {
            transform: scale(0.85);
            opacity: 0.78;
          }
          50% {
            transform: scale(1.38);
            opacity: 1;
          }
        }
      `}</style>

      {/* Container de composição: Brilho Traseiro (Z-5) + PNG (Z-10) + Emblema/Estrela SVG na Frente (Z-20) */}
      <div
        className="relative w-full"
        style={{
          height: hideTopAsset
            ? `${baseHeight}px`
            : `${baseHeight + pngHeightPx - Math.round(baseHeight * 0.46)}px`,
        }}
      >
        {/* ===================================================================
            CAMADA 0 (Z-5 — ESTRITAMENTE ATRÁS DA ESTRELA):
            CENTELHA QUE NASCE DO VAZIO E SE EXPANDE EM BRILHO PULSANTE ATRÁS DA ESTRELA
           =================================================================== */}
        <div
          className="absolute pointer-events-none z-[5]"
          style={{
            left: `${starCenterXPx}px`,
            bottom: `${starCenterFromBottomPx}px`,
            transform: 'translate(-50%, 50%)',
            opacity: isHidden
              ? 0
              : isSparkBorn
              ? 0.48
              : isStarFlaring
              ? 0.88
              : isStarOnlyMode
              ? 0.85
              : 0,
            transition: isSparkBorn
              ? 'opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1)'
              : 'opacity 1.25s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {/* Halo difuso suave atrás da estrela (cresce lentamente e pulsa quando em modo estrela) */}
          <div
            className="rounded-full pointer-events-none flex items-center justify-center"
            style={{
              width: '92px',
              height: '92px',
              background:
                'radial-gradient(circle, rgba(255,252,225,0.82) 0%, rgba(252,211,77,0.45) 36%, rgba(245,178,12,0.14) 66%, rgba(0,0,0,0) 100%)',
              transform: isHidden
                ? 'scale(0.04)'
                : isSparkBorn
                ? 'scale(0.26)'
                : isStarFlaring
                ? 'scale(1.08)'
                : 'scale(0.92)',
              animation:
                revealStage === 'star_only'
                  ? 'starHaloPulse 2.6s ease-in-out infinite'
                  : 'none',
              transition: isSparkBorn
                ? 'transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)'
                : 'transform 1.3s cubic-bezier(0.22, 1, 0.36, 1)',
              filter: 'blur(5px)',
            }}
          >
            {/* Núcleo de centelha nascente no centro exato atrás da estrela */}
            <div
              className="rounded-full pointer-events-none"
              style={{
                width: '22px',
                height: '22px',
                background:
                  'radial-gradient(circle, rgba(255,255,248,0.98) 0%, rgba(255,235,160,0.78) 50%, rgba(255,200,60,0) 100%)',
                transform: isHidden
                  ? 'scale(0.1)'
                  : isSparkBorn
                  ? 'scale(0.75)'
                  : isStarFlaring
                  ? 'scale(1.25)'
                  : 'scale(1)',
                animation:
                  revealStage === 'star_only'
                    ? 'starCoreSparkPulse 2.6s ease-in-out infinite'
                    : 'none',
                transition: 'transform 0.95s cubic-bezier(0.22, 1, 0.36, 1)',
                filter: 'blur(1px)',
              }}
            />
          </div>
        </div>

        {/* ===================================================================
            CAMADA 1 (Z-10): ASSET PNG DO LOCAL (Posicionado exatamente como na Imagem 2,
            assentado sobre o topo da barra horizontal, à direita da estrela/círculo)
           =================================================================== */}
        {!hideTopAsset && (
        <div
          className="absolute pointer-events-none flex items-end justify-center z-10"
          style={{
            left: `${pngLeftPx}px`,
            width: `${pngWidthPx}px`,
            height: `${pngHeightPx}px`,
            bottom: `${bannerTopFromBottomPx - 2}px`,
            transformOrigin: 'bottom center',
            opacity: isFullMarkerVisible ? 1 : 0,
            transform: isFullMarkerVisible
              ? 'translateY(0) scale(1)'
              : 'translateY(10px) scale(0.82)',
            transition:
              'opacity 0.95s cubic-bezier(0.22, 1, 0.36, 1) 0.18s, transform 1.05s cubic-bezier(0.22, 1, 0.36, 1) 0.18s',
          }}
        >
          {iconPng ? (
            <img
              src={iconPng}
              alt={name}
              draggable={false}
              className={`w-full h-full object-contain object-bottom select-none pointer-events-none transition-all ${
                isLocked
                  ? 'grayscale contrast-110 brightness-75 drop-shadow-[0_5px_10px_rgba(0,0,0,0.92)]'
                  : 'drop-shadow-[0_6px_12px_rgba(0,0,0,0.88)] group-hover:brightness-110'
              }`}
            />
          ) : (
            <div
              className={`flex items-end justify-center pb-0.5 select-none transition-all ${
                isLocked
                  ? 'grayscale brightness-75 drop-shadow-[0_5px_10px_rgba(0,0,0,0.92)]'
                  : 'drop-shadow-[0_6px_12px_rgba(0,0,0,0.88)]'
              }`}
              style={{
                fontSize: `${Math.round(pngHeightPx * 0.6)}px`,
                lineHeight: 1,
              }}
            >
              {iconEmoji || '🏰'}
            </div>
          )}

          {/* Cadeado sobreposto ao PNG se o local estiver bloqueado */}
          {isLocked && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              {customLockIconPng ? (
                <img
                  src={customLockIconPng}
                  alt="Bloqueado"
                  className="w-6 h-6 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.95)] animate-pulse"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-black/90 border border-amber-400/80 text-amber-300 flex items-center justify-center shadow-xl">
                  <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* ===================================================================
            CAMADA 2 (Z-20 — NA FRENTE DO BRILHO): EMBLEMA SVG FIEL À IMAGEM 1
            (Anel Circular Dourado + Estrela de 4 Pontas Metálica + Barra Branca/Dourada)
           =================================================================== */}
        <div
          className="absolute left-0 right-0 bottom-0 z-20 pointer-events-none"
          style={{
            height: `${baseHeight}px`,
            opacity: isHidden ? 0 : isSparkBorn ? 0.22 : 1,
            filter: isStarFlaring
              ? 'drop-shadow(0 0 8px rgba(255, 244, 195, 0.62)) drop-shadow(0 0 15px rgba(245, 190, 55, 0.32))'
              : isStarOnlyMode
              ? 'drop-shadow(0 0 5px rgba(255, 236, 165, 0.42))'
              : isSelected || isFocused
              ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.65)) drop-shadow(0 5px 12px rgba(0, 0, 0, 0.88))'
              : 'drop-shadow(0 5px 10px rgba(0, 0, 0, 0.85))',
            transition: isSparkBorn
              ? 'opacity 0.65s ease-out, filter 0.85s ease-in-out'
              : 'opacity 1.1s cubic-bezier(0.22, 1, 0.36, 1), filter 0.95s ease-in-out',
          }}
        >
          <svg
            viewBox={`0 0 ${svgViewWidth} 160`}
            className="w-full h-full overflow-visible block"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Gradiente da Borda Dourada da Cápsula Horizontal */}
              <linearGradient id={`bannerGoldGrad-${uid}`} x1="76" y1="106" x2={String(svgViewWidth - 4)} y2="106" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f9ebbe" />
                <stop offset="22%" stopColor="#f6dc7a" />
                <stop offset="65%" stopColor="#f6c430" />
                <stop offset="100%" stopColor="#f5b400" />
              </linearGradient>

              {/* Gradiente Suave de Transição Interna Esquerda da Cápsula */}
              <linearGradient id={`bannerInnerBevel-${uid}`} x1="110" y1="80" x2="155" y2="132" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#fcf2d2" />
                <stop offset="100%" stopColor="#f7e29c" />
              </linearGradient>

              {/* Gradiente do Anel Circular Dourado */}
              <linearGradient id={`ringGoldGrad-${uid}`} x1="24" y1="80" x2="128" y2="80" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#fff8d9" />
                <stop offset="45%" stopColor="#f7d768" />
                <stop offset="100%" stopColor="#f5b100" />
              </linearGradient>

              {/* Gradiente Metálico 3D da Estrela de 4 Pontas (luz à esquerda, bronze dourado à direita) */}
              <linearGradient id={`starMetallicGrad-${uid}`} x1="22" y1="42" x2="132" y2="112" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#fffef8" />
                <stop offset="28%" stopColor="#fff3c4" />
                <stop offset="46%" stopColor="#f6ce4e" />
                <stop offset="66%" stopColor="#b88c28" />
                <stop offset="88%" stopColor="#745614" />
                <stop offset="100%" stopColor="#4e380a" />
              </linearGradient>
            </defs>

            {/* Grupo da Cápsula Horizontal + Anel Circular (Surge suavemente após as estrelas dissolverem a escuridão) */}
            <g
              style={{
                opacity: isFullMarkerVisible ? 1 : 0,
                transform: isFullMarkerVisible ? 'scaleX(1)' : 'scaleX(0.25)',
                transformOrigin: '76px 80px',
                transition:
                  'opacity 0.95s cubic-bezier(0.22, 1, 0.36, 1), transform 1.05s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {/* 1. Corpo Externo Dourado da Barra Horizontal (com encaixe curvo no arco inferior direito do círculo) */}
              <path
                d={`M 126 80 L ${bannerEndX} 80 A 26 26 0 0 1 ${bannerEndX} 132 L 76 132 A 52 52 0 0 0 126 80 Z`}
                fill={`url(#bannerGoldGrad-${uid})`}
              />

              {/* 2. Faixa Intermediária Creme-Dourada na Curva Esquerda da Barra (idêntica à Imagem 1) */}
              <path
                d={`M 131.5 85 L ${bannerEndX - 2} 85 A 21 21 0 0 1 ${bannerEndX - 2} 127 L 106 127 A 56 56 0 0 0 131.5 85 Z`}
                fill={`url(#bannerInnerBevel-${uid})`}
              />

              {/* 3. Interior Branco Puro da Cápsula Horizontal (curvado à esquerda seguindo o círculo) */}
              <path
                d={`M 137.5 88 L ${bannerEndX - 2} 88 A 18 18 0 0 1 ${bannerEndX - 2} 124 L 119.5 124 A 62 62 0 0 0 137.5 88 Z`}
                fill="#ffffff"
              />

              {/* 4. Fundo Escuro Interno do Anel Circular + Aro Circular Dourado */}
              <circle
                cx="76"
                cy="80"
                r="50"
                fill="rgba(4, 7, 14, 0.92)"
                stroke={`url(#ringGoldGrad-${uid})`}
                strokeWidth="4.4"
              />
            </g>

            {/* 5. Estrela Dourada de 4 Pontas (✦) com Pontas Agulha Ultrapassando o Círculo */}
            <g
              style={{
                transformOrigin: '76px 80px',
                transform: isHidden
                  ? 'scale(0.08)'
                  : isSparkBorn
                  ? 'scale(0.28)'
                  : isStarFlaring
                  ? 'scale(1.06)'
                  : 'scale(1)',
                transition: isSparkBorn
                  ? 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)'
                  : 'transform 1.15s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <path
                d="M 76 4 C 78 55, 97 78, 148 80 C 97 82, 78 105, 76 156 C 74 105, 55 82, 4 80 C 55 78, 74 55, 76 4 Z"
                fill={`url(#starMetallicGrad-${uid})`}
              />
            </g>
          </svg>

          {/* Texto do Nome do Local centralizado dentro da área branca da cápsula */}
          <div
            className="absolute flex items-center justify-center overflow-hidden px-1.5"
            style={{
              left: `${Math.round(baseStarWidth * (138 / 380))}px`,
              right: `${Math.round(baseStarWidth * (18 / 380))}px`,
              top: `${Math.round(baseHeight * (88 / 160))}px`,
              height: `${Math.round(baseHeight * (36 / 160))}px`,
              opacity: isFullMarkerVisible ? 1 : 0,
              transition: 'opacity 0.85s ease 0.25s',
            }}
          >
            <span
              className="font-cinzel font-black uppercase tracking-wider text-[#1e1608] whitespace-nowrap w-full text-center leading-none"
              style={{
                fontSize:
                  sizeVariant === 'sm'
                    ? '7.5px'
                    : displayLabel.length > 22
                    ? '7.5px'
                    : displayLabel.length > 15
                    ? '8.2px'
                    : '8.8px',
                textShadow: '0 1px 0 rgba(255, 255, 255, 0.8)',
              }}
            >
              {displayLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
