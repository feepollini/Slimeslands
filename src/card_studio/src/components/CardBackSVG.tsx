import React, { useMemo } from 'react';
import { CardData } from '../types/card';

interface CardBackSVGProps {
  card: CardData;
  interactive?: boolean;
  onBackImageDrag?: (dx: number, dy: number) => void;
  parallaxOffset?: { x: number; y: number };
  idScope?: string;
}

/**
 * Frameless Full-Bleed TCG Card Back (Verso da Carta) in 680x990 coordinate space.
 * - NO outer frame/bezel: 100% full-bleed artwork or sacred crest from edge to edge.
 * - Features a thin luminous rim contour & edge backlight bleed along the perimeter,
 *   as if radiant energy from the front face is shining from behind the card edges!
 */
export const CardBackSVG: React.FC<CardBackSVGProps> = React.memo(({
  card,
  interactive = true,
  onBackImageDrag,
  parallaxOffset = { x: 0, y: 0 },
  idScope,
}) => {
  const scope = idScope || `back-${card.id}`;
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<SVGGElement>) => {
    if (!interactive || !card.backImageUrl || !onBackImageDrag) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!isDragging || !dragStart || !onBackImageDrag) return;
    e.stopPropagation();
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });
    onBackImageDrag(dx, dy);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    setDragStart(null);
  };

  const backScale = card.backImageScale ?? 1;
  const backOffsetX = card.backImageOffsetX ?? 0;
  const backOffsetY = card.backImageOffsetY ?? 0;

  const parallaxFactor = card.isPremium ? (card.parallaxDepth ?? 65) / 100 : 0;
  // Exact 1:1 fit by default: no automatic zoom or pan that would crop the back image borders
  const effectiveScale = backScale;
  const effectiveX = backOffsetX;
  const effectiveY = backOffsetY;

  const contourCycleDuration = Math.max(1.8, (card.contourLightSpeed || 4) * 1.15);
  const prismaticAlpha = ((card.prismaticIntensity ?? 75) / 100) * 0.48;
  const glitterAlpha = Math.min(1, ((card.microGlitterIntensity ?? 80) / 100) * 1.3);

  // Subtle Premium sparkles & edge micro-glitter hugging the thin outer rim
  const { rimGlitterSpecks, rimKeyLights } = useMemo(() => {
    const colors = ['#FFFFFF', '#FFF1F2', '#A5F3FC', '#FEF08A', '#F5D0FE', '#67E8F9'];
    const specks: {
      x: number;
      y: number;
      r: number;
      delay: number;
      dur: number;
      color: string;
    }[] = [];

    // Concentrate micro-glitter near the very outer perimeter edge where the backlight bleeds in
    for (let i = 0; i < 220; i++) {
      const edge = i % 4;
      let x = 0;
      let y = 0;
      if (edge === 0) {
        x = 1.5 + ((i * 13.7) % 14);
        y = 2 + ((i * 79.3) % 986);
      } else if (edge === 1) {
        x = 664.5 + ((i * 13.7) % 14);
        y = 2 + ((i * 83.1) % 986);
      } else if (edge === 2) {
        x = 2 + ((i * 67.3) % 676);
        y = 1.5 + ((i * 11.3) % 14);
      } else {
        x = 2 + ((i * 59.9) % 676);
        y = 974.5 + ((i * 11.3) % 14);
      }
      const r = 0.42 + (i % 4) * 0.16;
      const delay = (i % 17) * 0.15;
      const dur = 0.8 + (i % 6) * 0.24;
      const color = colors[i % colors.length];
      specks.push({ x, y, r, delay, dur, color });
    }

    // Perimeter key-light points right on the thin rectangular rim contour
    const stars = [
      { x: 340, y: 2, delay: 0.1, dur: 2.5, scale: 1.1 },
      { x: 340, y: 988, delay: 1.3, dur: 2.7, scale: 1.1 },
      { x: 2, y: 260, delay: 0.5, dur: 2.6, scale: 1.0 },
      { x: 678, y: 260, delay: 1.6, dur: 2.8, scale: 1.0 },
      { x: 2, y: 730, delay: 0.9, dur: 2.4, scale: 1.0 },
      { x: 678, y: 730, delay: 2.0, dur: 2.9, scale: 1.0 },
      { x: 6, y: 6, delay: 0.3, dur: 2.3, scale: 1.15 },
      { x: 674, y: 6, delay: 1.4, dur: 2.6, scale: 1.15 },
      { x: 6, y: 984, delay: 0.7, dur: 2.8, scale: 1.15 },
      { x: 674, y: 984, delay: 1.8, dur: 2.5, scale: 1.15 },
    ];

    return { rimGlitterSpecks: specks, rimKeyLights: stars };
  }, []);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 680 990"
      className="w-full h-full select-none block overflow-hidden"
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        overflow: 'hidden',
        userSelect: 'none',
        fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
      }}
    >
      <defs>
        <radialGradient
          id={`back-core-glow-${scope}`}
          cx="50%"
          cy="50%"
          r="70%"
        >
          <stop offset="0%" stopColor={card.frameTopColor} />
          <stop offset="58%" stopColor={card.frameMidColor} />
          <stop offset="100%" stopColor="#05060A" />
        </radialGradient>

        {/* Prismatic Rim Backlight Gradient (when Premium is ON) */}
        <linearGradient
          id={`back-rim-chromatic-${scope}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#00F0FF">
            {card.isPremium && (
              <animate
                attributeName="stop-color"
                values="#00F0FF;#FF007A;#FFE600;#9D4EDD;#00FF88;#00F0FF"
                dur={`${contourCycleDuration}s`}
                repeatCount="indefinite"
              />
            )}
          </stop>
          <stop offset="50%" stopColor="#FF007A">
            {card.isPremium && (
              <animate
                attributeName="stop-color"
                values="#FF007A;#FFE600;#9D4EDD;#00FF88;#00F0FF;#FF007A"
                dur={`${contourCycleDuration}s`}
                repeatCount="indefinite"
              />
            )}
          </stop>
          <stop offset="100%" stopColor="#FFE600">
            {card.isPremium && (
              <animate
                attributeName="stop-color"
                values="#FFE600;#9D4EDD;#00FF88;#00F0FF;#FF007A;#FFE600"
                dur={`${contourCycleDuration}s`}
                repeatCount="indefinite"
              />
            )}
          </stop>
        </linearGradient>

        <linearGradient
          id={`back-prismatic-foil-${scope}`}
          x1="-30%"
          y1="-30%"
          x2="130%"
          y2="130%"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="35%" stopColor="#FF007A" stopOpacity="0" />
          <stop offset="45%" stopColor="#FF00A0" stopOpacity={prismaticAlpha * 0.75} />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity={prismaticAlpha * 1.15} />
          <stop offset="55%" stopColor="#00F0FF" stopOpacity={prismaticAlpha * 0.9} />
          <stop offset="65%" stopColor="#FFE600" stopOpacity="0" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          {card.isPremium && (
            <>
              <animate
                attributeName="x1"
                values="-90%;110%;-90%"
                dur="4.4s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="y1"
                values="-60%;90%;-60%"
                dur="4.4s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="x2"
                values="10%;210%;10%"
                dur="4.4s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="y2"
                values="30%;180%;30%"
                dur="4.4s"
                repeatCount="indefinite"
              />
            </>
          )}
        </linearGradient>

        {/* Heavy Backlight Bleed Filter (Simulates light wrapping from the front face around the outer edges) */}
        <filter
          id={`backlight-rim-bleed-${scope}`}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="wideBleed" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="tightRim" />
          <feMerge>
            <feMergeNode in="wideBleed" />
            <feMergeNode in="tightRim" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Crisp Key-Light Bloom */}
        <filter
          id={`back-keylight-bloom-${scope}`}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="5.5" result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 1. FULL-BLEED 680x990 CARD BACK SURFACE (No Frame / No Bezel!) */}
      <g
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={
          interactive && card.backImageUrl
            ? isDragging
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : ''
        }
      >
        <rect
          x="0"
          y="0"
          width="680"
          height="990"
          fill={`url(#back-core-glow-${card.id})`}
        />

        {card.backImageUrl ? (
          /* User Uploaded Full-Bleed Background Image */
          <g
            transform={`translate(${340 + effectiveX}, ${
              495 + effectiveY
            }) scale(${effectiveScale}) translate(-340, -495)`}
            style={{
              transition: isDragging
                ? 'none'
                : 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <image
              href={card.backImageUrl}
              x="0"
              y="0"
              width="680"
              height="990"
              preserveAspectRatio="none"
            />
          </g>
        ) : (
          /* Default Full-Bleed Sacred Geometry Emblem (Frameless) */
          <g
            transform={`translate(${340 + parallaxOffset.x * 12 * parallaxFactor}, ${
              495 + parallaxOffset.y * 12 * parallaxFactor
            })`}
            style={{
              transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Concentric Sacred Circles */}
            <circle
              cx="0"
              cy="0"
              r="235"
              fill="none"
              stroke={card.strokeColor}
              strokeWidth="1.5"
              strokeOpacity="0.28"
            />
            <circle
              cx="0"
              cy="0"
              r="185"
              fill="none"
              stroke={card.strokeColor}
              strokeWidth="1.5"
              strokeDasharray="6 10"
              strokeOpacity="0.45"
            />
            <circle
              cx="0"
              cy="0"
              r="132"
              fill={card.frameMidColor}
              fillOpacity="0.65"
              stroke={card.strokeColor}
              strokeWidth="2.5"
              strokeOpacity="0.75"
            />

            {/* 8-Point Celestial Star */}
            <polygon
              points="0,-210 44,-44 210,0 44,44 0,210 -44,44 -210,0 -44,-44"
              fill="none"
              stroke={card.strokeColor}
              strokeWidth="2.2"
              strokeOpacity="0.65"
            />
            <polygon
              points="0,-210 44,-44 210,0 44,44 0,210 -44,44 -210,0 -44,-44"
              transform="rotate(45)"
              fill="none"
              stroke={card.strokeColor}
              strokeWidth="1.4"
              strokeOpacity="0.4"
            />

            {/* Central Diamond Core */}
            <polygon
              points="0,-82 60,0 0,82 -60,0"
              fill={card.frameTopColor}
              stroke={
                card.isPremium
                  ? `url(#back-rim-chromatic-${card.id})`
                  : card.strokeColor
              }
              strokeWidth="3.5"
            />
            <circle
              cx="0"
              cy="0"
              r="18"
              fill={
                card.isPremium
                  ? `url(#back-rim-chromatic-${card.id})`
                  : card.strokeColor
              }
            />
          </g>
        )}

        {/* Prismatic Foil Sweep over the Full-Bleed Back */}
        {card.isPremium && prismaticAlpha > 0 && (
          <rect
            x="0"
            y="0"
            width="680"
            height="990"
            fill={`url(#back-prismatic-foil-${scope})`}
            style={{ mixBlendMode: 'color-dodge', pointerEvents: 'none' }}
          />
        )}
      </g>

      {/* 2. THIN RIM BACKLIGHT CONTOUR (Light bleeding from the Front/Behind around the exact outer rectangular perimeter!) */}
      <g pointerEvents="none">
        {/* Soft Backlight Halo wrapping inward from the very edge of the card */}
        <rect
          x="1"
          y="1"
          width="678"
          height="988"
          rx="14"
          ry="14"
          fill="none"
          stroke={
            card.isPremium
              ? `url(#back-rim-chromatic-${scope})`
              : card.strokeColor
          }
          strokeWidth="6"
          filter={`url(#backlight-rim-bleed-${scope})`}
          opacity="0.92"
        >
          <animate
            attributeName="opacity"
            values="0.68;1;0.75;0.98;0.68"
            dur={`${(contourCycleDuration * 0.9).toFixed(2)}s`}
            repeatCount="indefinite"
          />
        </rect>

        {/* Razor-Thin Luminous Rim Filament right on the outer edge (simulating front light creeping around the edge) */}
        <rect
          x="1"
          y="1"
          width="678"
          height="988"
          rx="14"
          ry="14"
          fill="none"
          stroke={
            card.isPremium
              ? `url(#back-rim-chromatic-${scope})`
              : card.strokeColor
          }
          strokeWidth="2.2"
          opacity="0.98"
        />

        {/* Ultra-fine 1px white-hot inner edge specular line */}
        <rect
          x="2"
          y="2"
          width="676"
          height="986"
          rx="13"
          ry="13"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="0.9"
          opacity="0.78"
        />

        {/* 3. PREMIUM RIM MICRO-GLITTER & KEY-LIGHT SPARKLES */}
        {card.isPremium && (
          <>
            {glitterAlpha > 0 && (
              <g opacity={glitterAlpha} filter={`url(#back-keylight-bloom-${scope})`}>
                {rimGlitterSpecks.map((s, idx) => (
                  <circle
                    key={`b-rim-glit-${idx}`}
                    cx={s.x}
                    cy={s.y}
                    r={s.r}
                    fill={s.color}
                  >
                    <animate
                      attributeName="opacity"
                      values="0.06;1;0.12;0.95;0.06"
                      dur={`${s.dur}s`}
                      begin={`${s.delay}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                ))}
              </g>
            )}

            {rimKeyLights.map((kl, idx) => (
              <g
                key={`b-rim-kl-${idx}`}
                transform={`translate(${kl.x}, ${kl.y}) scale(${kl.scale})`}
                filter={`url(#back-keylight-bloom-${scope})`}
              >
                <circle
                  cx="0"
                  cy="0"
                  r="5.5"
                  fill={`url(#back-rim-chromatic-${scope})`}
                  opacity="0.75"
                >
                  <animate
                    attributeName="r"
                    values="3;7.5;4;6.5;3"
                    dur={`${kl.dur}s`}
                    begin={`${kl.delay}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.2;0.92;0.3;0.85;0.2"
                    dur={`${kl.dur}s`}
                    begin={`${kl.delay}s`}
                    repeatCount="indefinite"
                  />
                </circle>
                <path
                  d="M 0 -8.5 Q 0 0 8.5 0 Q 0 0 0 8.5 Q 0 0 -8.5 0 Q 0 0 0 -8.5 Z"
                  fill="#FFFFFF"
                >
                  <animate
                    attributeName="opacity"
                    values="0.15;1;0.25;0.95;0.15"
                    dur={`${kl.dur}s`}
                    begin={`${kl.delay}s`}
                    repeatCount="indefinite"
                  />
                  <animateTransform
                    attributeName="transform"
                    type="scale"
                    values="0.5;1.2;0.65;1.05;0.5"
                    dur={`${kl.dur}s`}
                    begin={`${kl.delay}s`}
                    repeatCount="indefinite"
                  />
                </path>
              </g>
            ))}
          </>
        )}
      </g>
    </svg>
  );
});
