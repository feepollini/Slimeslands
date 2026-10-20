import React, { useMemo } from 'react';
import { CardData } from '../types/card';
import { ShowcaseVfxCanvas } from './ShowcaseVfxCanvas';

interface CardFrameSVGProps {
  card: CardData;
  svgRef?: React.RefObject<SVGSVGElement | null>;
  onSelectSection?: (section: 'title' | 'image' | 'sides' | 'lore' | 'bottom') => void;
  interactive?: boolean;
  onImageDrag?: (dx: number, dy: number) => void;
  parallaxOffset?: { x: number; y: number };
  /**
   * When true (after 2s in Premium mode, lasting 3-8s), the frame, contour, title,
   * side tabs, lore box, and bottom capsules smoothly fade/expand away so ONLY
   * the full-bleed card artwork/video fills the entire card/phone screen.
   */
  artOnlyShowcase?: boolean;
  /**
   * Controls whether SMIL chroma, foil, and badge animations are actively rotating.
   * Enabled on the featured preview card on stage; disabled on gallery thumbnails.
   */
  animateChroma?: boolean;
  /**
   * Optional unique DOM ID scope prefix to prevent SVG <defs> gradient collision
   * between the gallery thumbnails and the featured stage preview card.
   */
  idScope?: string;
}

/**
 * Generates the exact 1:1 geometric path of the inner art window (680 x 990 coordinate space),
 * dynamically adjusting the bottom recessed dock if dockAutoFit is enabled for 1, 2, 3, or 4 capsules.
 */
export function getOuterRoundedRectPath(r = 14): string {
  return `
    M ${r} 0
    H ${680 - r}
    Q 680 0 680 ${r}
    V ${990 - r}
    Q 680 990 ${680 - r} 990
    H ${r}
    Q 0 990 0 ${990 - r}
    V ${r}
    Q 0 0 ${r} 0
    Z
  `;
}

export function getInnerWindowPath(pillCount: 1 | 2 | 3 | 4 = 4, dockAutoFit = true): string {
  const pillWidth = 103;
  const gap = 8.5;
  const sidePadding = 11.5;

  const effectiveCount = dockAutoFit ? pillCount : 4;
  const totalPillsWidth = effectiveCount * pillWidth + (effectiveCount - 1) * gap;
  const dockHalfWidth = totalPillsWidth / 2 + sidePadding;

  const dockCenter = 335;
  const dockLeft = Math.round((dockCenter - dockHalfWidth) * 10) / 10;
  const dockRight = Math.round((dockCenter + dockHalfWidth) * 10) / 10;
  const dockRadius = 20;

  return `
    M 96 20
    L 155 20
    Q 165 20 165 30
    L 165 44
    A 24 24 0 0 0 189 68
    L 491 68
    A 24 24 0 0 0 515 44
    L 515 30
    Q 515 20 525 20
    L 584 20
    A 76 76 0 0 1 660 96
    L 660 450
    Q 660 458 652 458
    L 638 458
    A 18 18 0 0 0 620 476
    L 620 637
    A 18 18 0 0 0 638 655
    L 652 655
    Q 660 655 660 663
    L 660 898
    A 76 76 0 0 1 584 974
    L ${dockRight + 10} 974
    Q ${dockRight} 974 ${dockRight} 964
    L ${dockRight} 936
    A ${dockRadius} ${dockRadius} 0 0 0 ${dockRight - dockRadius} 916
    L ${dockLeft + dockRadius} 916
    A ${dockRadius} ${dockRadius} 0 0 0 ${dockLeft} 936
    L ${dockLeft} 964
    Q ${dockLeft} 974 ${dockLeft - 10} 974
    L 86 974
    A 66 76 0 0 1 20 898
    L 20 663
    Q 20 655 28 655
    L 42 655
    A 18 18 0 0 0 60 637
    L 60 476
    A 18 18 0 0 0 42 458
    L 28 458
    Q 20 458 20 450
    L 20 96
    A 76 76 0 0 1 96 20
    Z
  `;
}

export function getOuterFrameCompoundPath(pillCount: 1 | 2 | 3 | 4 = 4, dockAutoFit = true): string {
  return `
    ${getOuterRoundedRectPath(14)}
    ${getInnerWindowPath(pillCount, dockAutoFit)}
  `;
}

export const CardFrameSVG: React.FC<CardFrameSVGProps> = React.memo(({
  card,
  svgRef,
  onSelectSection,
  interactive = true,
  onImageDrag,
  parallaxOffset = { x: 0, y: 0 },
  artOnlyShowcase = false,
  animateChroma = true,
  idScope,
}) => {
  const scope = idScope || (animateChroma ? `stage-${card.id}` : `thumb-${card.id}`);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null);
  const titleTextRef = React.useRef<SVGTextElement | null>(null);
  const [measuredTitleScale, setMeasuredTitleScale] = React.useState(1);

  const pvChars = (card.pvText || '').split('');
  const elementChars = (card.elementText || '').split('');

  // Dynamic font size for Top Title inside the 165..515 top notch (safe flat inner width = 292px between 194..486)
  const titleStr = (card.title || '').trim();
  const titleVisualUnits = useMemo(() => {
    return Array.from(titleStr).reduce((acc, ch) => {
      if (ch === ' ') return acc + 0.36;
      if ('MW@#%&QGO0'.includes(ch)) return acc + 1.18;
      if ('Il1!|.,:;\''.includes(ch)) return acc + 0.48;
      if (ch >= 'A' && ch <= 'Z') return acc + 0.98;
      return acc + 0.82;
    }, 0);
  }, [titleStr]);

  const maxTitleSafeWidth = 292;
  const baseTitleFontSize = useMemo(() => {
    if (titleVisualUnits <= 10.5) return 38;
    return Math.max(
      12,
      Math.min(38, Math.floor(maxTitleSafeWidth / (titleVisualUnits * 0.65)))
    );
  }, [titleVisualUnits]);

  React.useLayoutEffect(() => {
    setMeasuredTitleScale(1);
  }, [titleStr, baseTitleFontSize]);

  React.useLayoutEffect(() => {
    if (!titleTextRef.current) return;
    try {
      const renderedLen = titleTextRef.current.getComputedTextLength();
      if (renderedLen > maxTitleSafeWidth && measuredTitleScale === 1) {
        setMeasuredTitleScale((maxTitleSafeWidth - 4) / renderedLen);
      }
    } catch {
      // Ignore if SVG is not attached yet
    }
  }, [titleStr, baseTitleFontSize, measuredTitleScale]);

  const finalTitleFontSize = Math.max(
    11,
    Math.floor(baseTitleFontSize * measuredTitleScale)
  );

  const hasMedia =
    (card.mediaType === 'video' && Boolean(card.videoUrl)) ||
    (card.mediaType === 'image' && Boolean(card.imageUrl)) ||
    Boolean(card.imageUrl);

  const handlePointerDown = (e: React.PointerEvent<SVGGElement>) => {
    if (!interactive || !hasMedia || !onImageDrag) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!isDragging || !dragStart || !onImageDrag) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });
    onImageDrag(dx, dy);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    setDragStart(null);
  };

  const pillCount = card.pillCount || 4;
  const dockAutoFit = card.dockAutoFit ?? true;

  // Dynamic paths based on 1, 2, 3, or 4 capsules
  const innerWindowPath = getInnerWindowPath(pillCount, dockAutoFit);
  const outerFrameCompoundPath = getOuterFrameCompoundPath(pillCount, dockAutoFit);
  const fullBleedPath = getOuterRoundedRectPath(14);

  // Pill X positions inside the bottom dock (centered around X = 335)
  const pillWidth = 103;
  const pillHeight = 46;
  const pillGap = 8.5;
  const pillY = 928;
  const dockCenter = 335;

  const activePills = card.pills.slice(0, pillCount);
  const totalActiveWidth = pillCount * pillWidth + (pillCount - 1) * pillGap;
  const startX = dockCenter - totalActiveWidth / 2;

  // Dynamic vertical spacing & font size for PV chars (y from 500 to 628)
  const pvFontSize =
    pvChars.length <= 5
      ? 29
      : pvChars.length === 6
      ? 24
      : Math.max(15, Math.floor(136 / pvChars.length));
  const pvStartY = pvChars.length <= 5 ? 502 : 495;
  const pvEndY = pvChars.length <= 5 ? 626 : 631;
  const pvStep = pvChars.length > 1 ? (pvEndY - pvStartY) / (pvChars.length - 1) : 0;

  // Dynamic vertical spacing & font size for Element chars inside the 136px capsule (y from 469 to 605)
  const elFontSize =
    elementChars.length <= 5
      ? 22.5
      : elementChars.length === 6
      ? 19
      : elementChars.length === 7
      ? 16.5
      : elementChars.length === 8
      ? 14.5
      : Math.max(11, Math.floor(114 / elementChars.length));
  const elStartY = elementChars.length <= 5 ? 495 : 487;
  const elEndY = elementChars.length <= 5 ? 595 : 599;
  const elStep =
    elementChars.length > 1 ? (elEndY - elStartY) / (elementChars.length - 1) : 0;

  // Dynamic font sizes for Lore & Magic Box so long headers/descriptions never overflow
  const loreHeaderLen = (card.loreHeader || '').trim().length;
  const loreTotalLen =
    loreHeaderLen +
    (card.loreBody || '').trim().length +
    (card.magicPrefix || '').trim().length +
    (card.magicDescription || '').trim().length;

  const loreHeaderFontSize =
    loreHeaderLen > 36
      ? Math.max(11.5, Math.floor(405 / (loreHeaderLen * 0.56)))
      : loreTotalLen > 210
      ? 13
      : loreTotalLen > 165
      ? 14
      : 15.2;

  const loreBodyFontSize =
    loreTotalLen > 230
      ? 11.2
      : loreTotalLen > 180
      ? 12.2
      : loreTotalLen > 145
      ? 13.2
      : 14.2;

  // Calculate background fill inside the art cutout
  const windowFill =
    card.backgroundFill === 'white'
      ? '#FFFFFF'
      : card.backgroundFill === 'dark'
      ? '#0B0C10'
      : 'none';

  /**
   * High-density Ultra-Fine Micro-Glitter for the Frame & Border:
   * - 240 surface micro-specks across the outer frame body
   * - 160 concentrated border-edge micro-glitter specks hugging the contour rim
   * Strictly micro sizes (0.38px to 1.15px) with high-intensity diamond sparkle!
   */
  const { frameGlitterSpecks, borderRimGlitterSpecks } = useMemo(() => {
    const colors = [
      '#FFFFFF',
      '#FFFFFF',
      '#FFF1F2',
      '#A5F3FC',
      '#FEF08A',
      '#F5D0FE',
      '#67E8F9',
    ];

    const surface: {
      x: number;
      y: number;
      r: number;
      delay: number;
      dur: number;
      color: string;
    }[] = [];

    // 1. Crisp micro-glitter distributed along the frame borders (left/right columns, top/bottom headers)
    for (let i = 0; i < 72; i++) {
      let x = 0;
      let y = 0;
      const zone = i % 4;
      if (zone === 0) {
        // Left frame border (x: 1..58)
        x = 1.5 + ((i * 19.3) % 56);
        y = 4 + ((i * 73.7) % 982);
      } else if (zone === 1) {
        // Right frame border (x: 622..678.5)
        x = 622 + ((i * 19.3) % 56.5);
        y = 4 + ((i * 89.1) % 982);
      } else if (zone === 2) {
        // Top header & corners (y: 1..85)
        x = 4 + ((i * 67.3) % 672);
        y = 1.5 + ((i * 13.7) % 82);
      } else {
        // Bottom dock & corners (y: 905..988.5)
        x = 4 + ((i * 53.9) % 672);
        y = 905 + ((i * 17.1) % 83.5);
      }

      const r = 0.48 + (i % 5) * 0.16;
      const delay = (i % 13) * 0.18;
      const dur = 1.1 + (i % 6) * 0.28;
      const color = colors[i % colors.length];
      surface.push({ x, y, r, delay, dur, color });
    }

    // 2. Concentrated Rim Micro-Glitter hugging the inner contour edge
    const rim: typeof surface = [];
    for (let j = 0; j < 36; j++) {
      const t = j / 36;
      const angle = t * Math.PI * 2;
      const cx = 340 + Math.cos(angle) * 316 + ((j % 5) - 2) * 2.2;
      const cy = 495 + Math.sin(angle) * 468 + ((j % 3) - 1) * 2.2;
      const x = Math.max(3, Math.min(677, cx));
      const y = Math.max(3, Math.min(987, cy));
      const r = 0.52 + (j % 4) * 0.18;
      const delay = (j % 11) * 0.2;
      const dur = 0.95 + (j % 5) * 0.25;
      const color = colors[(j + 2) % colors.length];
      rim.push({ x, y, r, delay, dur, color });
    }

    return { frameGlitterSpecks: surface, borderRimGlitterSpecks: rim };
  }, []);

  /**
   * Key Lights positioned at the architectural vertices/curves of the contour frame.
   * Instead of a running line, the entire contour shimmers prismatically (at its own tempo)
   * while these Key Lights pulse with chromatic lens flares at different staggered timings.
   */
  const contourKeyLights = useMemo(() => {
    const pillWidth = 103;
    const gap = 8.5;
    const sidePadding = 11.5;
    const effectiveCount = dockAutoFit ? pillCount : 4;
    const totalPillsWidth = effectiveCount * pillWidth + (effectiveCount - 1) * gap;
    const dockHalfWidth = totalPillsWidth / 2 + sidePadding;
    const dockLeft = Math.round((335 - dockHalfWidth) * 10) / 10;
    const dockRight = Math.round((335 + dockHalfWidth) * 10) / 10;

    return [
      { x: 165, y: 24, delay: 0.0, dur: 2.6, scale: 1.15 },   // Top-left title notch key light
      { x: 515, y: 24, delay: 0.9, dur: 3.1, scale: 1.15 },   // Top-right title notch key light
      { x: 38, y: 68, delay: 1.7, dur: 2.8, scale: 0.95 },    // Top-left outer curve key light
      { x: 642, y: 68, delay: 0.4, dur: 3.3, scale: 0.95 },   // Top-right outer curve key light
      { x: 56, y: 468, delay: 1.2, dur: 2.4, scale: 1.05 },   // Left PV tab upper corner key light
      { x: 624, y: 468, delay: 2.1, dur: 2.9, scale: 1.05 },  // Right Element tab upper corner key light
      { x: 56, y: 645, delay: 0.6, dur: 3.2, scale: 1.0 },    // Left PV tab lower corner key light
      { x: 624, y: 645, delay: 1.5, dur: 2.5, scale: 1.0 },   // Right Element tab lower corner key light
      { x: dockLeft + 14, y: 922, delay: 0.3, dur: 2.7, scale: 1.1 },  // Bottom dock left corner key light
      { x: dockRight - 14, y: 922, delay: 1.4, dur: 3.0, scale: 1.1 }, // Bottom dock right corner key light
    ];
  }, [pillCount, dockAutoFit]);

  // Exact 1:1 artwork fit by default so no edges of the artwork are ever cropped unless user manually adjusts Zoom/Pos
  const parallaxFactor = card.isPremium ? (card.parallaxDepth ?? 65) / 100 : 0;
  const effectiveScale = card.imageScale;
  const effectiveOffsetX = card.imageOffsetX;
  const effectiveOffsetY = card.imageOffsetY;

  // Contour chromatic cycle duration (independent tempo from the badges & card foil!)
  const contourCycleDuration = Math.max(1.8, (card.contourLightSpeed || 4) * 1.15);
  const prismaticAlpha = ((card.prismaticIntensity ?? 75) / 100) * 0.52;
  const glitterAlpha = Math.min(1, ((card.microGlitterIntensity ?? 80) / 100) * 1.25);

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 680 990"
      className="w-full h-full select-none block overflow-hidden"
      style={{
        fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
      }}
    >
      <defs>
        {/* Clip path for the inner card artwork: switches to full-bleed 680x990 when artOnlyShowcase is active */}
        <clipPath id={`inner-art-clip-${scope}`}>
          <path d={artOnlyShowcase ? fullBleedPath : innerWindowPath} />
        </clipPath>

        {/* Clip path strictly for the OUTER FRAME BODY */}
        <clipPath id={`outer-frame-clip-${scope}`}>
          <path d={outerFrameCompoundPath} clipRule="evenodd" />
        </clipPath>

        {/* Adaptive vertical gradient for the outer frame */}
        <linearGradient
          id={`frame-body-grad-${scope}`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor={card.frameTopColor} />
          <stop offset="36%" stopColor={card.frameMidColor} />
          <stop offset="68%" stopColor={card.frameBottomColor} />
          <stop offset="100%" stopColor={card.frameBottomColor} />
        </linearGradient>

        {/* FULL-CONTOUR PRISMATIC GRADIENT (Animated on featured card; static in gallery) */}
        <linearGradient
          id={`chromatic-contour-grad-${scope}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#00F0FF">
            {animateChroma && (
              <animate
                attributeName="stop-color"
                values="#00F0FF;#FF007A;#FFE600;#9D4EDD;#00FF88;#00F0FF"
                dur={`${contourCycleDuration}s`}
                repeatCount="indefinite"
              />
            )}
          </stop>
          <stop offset="35%" stopColor="#FF007A">
            {animateChroma && (
              <animate
                attributeName="stop-color"
                values="#FF007A;#FFE600;#9D4EDD;#00FF88;#00F0FF;#FF007A"
                dur={`${contourCycleDuration}s`}
                repeatCount="indefinite"
              />
            )}
          </stop>
          <stop offset="68%" stopColor="#FFE600">
            {animateChroma && (
              <animate
                attributeName="stop-color"
                values="#FFE600;#9D4EDD;#00FF88;#00F0FF;#FF007A;#FFE600"
                dur={`${contourCycleDuration}s`}
                repeatCount="indefinite"
              />
            )}
          </stop>
          <stop offset="100%" stopColor="#9D4EDD">
            {animateChroma && (
              <animate
                attributeName="stop-color"
                values="#9D4EDD;#00FF88;#00F0FF;#FF007A;#FFE600;#9D4EDD"
                dur={`${contourCycleDuration}s`}
                repeatCount="indefinite"
              />
            )}
          </stop>
          {animateChroma && (
            <>
              <animate
                attributeName="x1"
                values="0%;100%;0%"
                dur={`${(contourCycleDuration * 1.35).toFixed(2)}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="y1"
                values="100%;0%;100%"
                dur={`${(contourCycleDuration * 1.35).toFixed(2)}s`}
                repeatCount="indefinite"
              />
            </>
          )}
        </linearGradient>

        {/* Prismatic Holographic Foil Gradient across the Card (Animated on featured card) */}
        <linearGradient
          id={`prismatic-foil-grad-${scope}`}
          x1="-30%"
          y1="-30%"
          x2="130%"
          y2="130%"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="28%" stopColor="#FF007A" stopOpacity="0" />
          <stop offset="42%" stopColor="#FF00A0" stopOpacity={prismaticAlpha * 0.75} />
          <stop offset="47%" stopColor="#FFE600" stopOpacity={prismaticAlpha * 0.9} />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity={prismaticAlpha * 1.25} />
          <stop offset="53%" stopColor="#00F0FF" stopOpacity={prismaticAlpha * 0.95} />
          <stop offset="58%" stopColor="#7B2CBF" stopOpacity={prismaticAlpha * 0.75} />
          <stop offset="72%" stopColor="#00F0FF" stopOpacity="0" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          {animateChroma && (
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

        {/* Soft glow filter for the inner contour line */}
        <filter
          id={`contour-glow-${scope}`}
          x="-15%"
          y="-15%"
          width="130%"
          height="130%"
        >
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation={
              card.strokeGlow > 16
                ? (card.strokeGlow / 100) * 7.5
                : card.isPremium
                ? Math.max(4.5, card.strokeGlow)
                : card.strokeGlow
            }
            floodColor={card.strokeColor}
            floodOpacity={card.isPremium || card.strokeGlow > 0 ? 0.95 : 0}
          />
        </filter>

        {/* Key Light Bloom & Micro-Glitter Brilliance Filter */}
        <filter
          id={`keylight-bloom-${scope}`}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="glow1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="5.5" result="glow2" />
          <feMerge>
            <feMergeNode in="glow2" />
            <feMergeNode in="glow1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Feathered airbrushed border effect for the dark lore box */}
        <filter
          id={`lore-feather-${scope}`}
          x="-8%"
          y="-8%"
          width="116%"
          height="116%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blurred" />
        </filter>

        {/* Borderless Deep Palette Gradient for the Lore & Magic Box */}
        <linearGradient
          id={`lore-box-grad-${scope}`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor={card.frameTopColor} stopOpacity="0.95" />
          <stop offset="52%" stopColor={card.frameMidColor} stopOpacity="0.97" />
          <stop offset="100%" stopColor={card.frameTopColor} stopOpacity="0.96" />
        </linearGradient>

        <linearGradient
          id={`lore-box-inner-grad-${scope}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor={card.frameTopColor} stopOpacity="0.94" />
          <stop offset="50%" stopColor={card.frameMidColor} stopOpacity="0.96" />
          <stop
            offset="100%"
            stopColor={
              card.extractedSwatches?.[1]?.frameTopColor || card.frameTopColor
            }
            stopOpacity="0.95"
          />
        </linearGradient>

        {/* Chromatic Rainbow Gradient for Special Zero-Cost Attack Capsules (∞), Rank Circle & PV */}
        <linearGradient
          id={`chromatic-badge-grad-${scope}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#FF0066">
            {animateChroma && (
              <animate
                attributeName="stop-color"
                values="#FF0066;#FFCC00;#00FF88;#00EAFF;#9D4EDD;#FF0066"
                dur="2.2s"
                repeatCount="indefinite"
              />
            )}
          </stop>
          <stop offset="50%" stopColor="#00EAFF">
            {animateChroma && (
              <animate
                attributeName="stop-color"
                values="#00EAFF;#9D4EDD;#FF0066;#FFCC00;#00FF88;#00EAFF"
                dur="2.2s"
                repeatCount="indefinite"
              />
            )}
          </stop>
          <stop offset="100%" stopColor="#FFB800">
            {animateChroma && (
              <animate
                attributeName="stop-color"
                values="#FFB800;#00FF88;#00EAFF;#9D4EDD;#FF0066;#FFB800"
                dur="2.2s"
                repeatCount="indefinite"
              />
            )}
          </stop>
          {animateChroma && (
            <>
              <animate
                attributeName="x1"
                values="0%;100%;0%"
                dur="3.0s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="y1"
                values="100%;0%;100%"
                dur="3.0s"
                repeatCount="indefinite"
              />
            </>
          )}
        </linearGradient>

        {/* Procedural Liquid Melt Displacement Filter for 'acid-melt' VFX */}
        {(artOnlyShowcase || card.vfxPlayOnNormalView) && (
          <filter
            id={`vfx-melt-warp-${scope}`}
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.035"
              numOctaves="2"
              seed="7"
              result="meltNoise"
            >
              <animate
                attributeName="baseFrequency"
                values="0.012 0.025;0.016 0.055;0.012 0.025"
                dur="3.6s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="meltNoise"
              scale={Math.round(((card.showcaseVfxIntensity ?? 85) / 100) * 44)}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        )}

        {/* Upper-Diagonal Screen Slice ClipPath for 'dimensional-slash' VFX */}
        <clipPath id={`vfx-slash-slice-${scope}`}>
          <polygon points="0,0 680,0 680,685 0,255" />
        </clipPath>
      </defs>

      {/* 1. INNER ARTWORK / VIDEO WINDOW (Expands to full 680x990 screen when artOnlyShowcase is true) */}
      <g
        clipPath={`url(#inner-art-clip-${scope})`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={
          interactive && hasMedia
            ? isDragging
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : interactive
            ? 'cursor-pointer'
            : ''
        }
        onClick={() => {
          if (!isDragging && onSelectSection) {
            onSelectSection('image');
          }
        }}
      >
        {/* Base fill inside the cutout */}
        {windowFill !== 'none' && (
          <rect x="0" y="0" width="680" height="990" fill={windowFill} />
        )}

        {/* Media Layer with subtle Parallax Zoom & Shift (+ Liquid Melt Warp when 'acid-melt' VFX is active) */}
        <g
          filter={
            interactive &&
            card.vfxPlayOnNormalView &&
            !artOnlyShowcase &&
            card.showcaseVfx === 'acid-melt'
              ? `url(#vfx-melt-warp-${scope})`
              : undefined
          }
          transform={`translate(${340 + effectiveOffsetX}, ${
            495 + effectiveOffsetY
          }) scale(${effectiveScale}) translate(-340, -495)`}
          style={{
            transition: isDragging
              ? 'none'
              : 'transform 550ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {card.mediaType === 'video' && card.videoUrl ? (
            <foreignObject x="0" y="0" width="680" height="990">
              <video
                src={card.videoUrl}
                autoPlay
                loop
                muted
                playsInline
                style={{
                  width: '680px',
                  height: '990px',
                  objectFit: 'cover',
                  display: 'block',
                  pointerEvents: 'none',
                }}
              />
            </foreignObject>
          ) : card.imageUrl ? (
            <image
              href={card.imageUrl}
              x="0"
              y="0"
              width="680"
              height="990"
              preserveAspectRatio="none"
            />
          ) : null}

          {/* REAL SCREEN-SLICE DISPLACEMENT LAYER when 'dimensional-slash' VFX is active on normal view */}
          {interactive &&
            card.vfxPlayOnNormalView &&
            !artOnlyShowcase &&
            card.showcaseVfx === 'dimensional-slash' &&
            card.imageUrl &&
            card.mediaType !== 'video' && (
              <g clipPath={`url(#vfx-slash-slice-${scope})`}>
                <g>
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="0,0; 22,14; -16,-10; 12,-8; 0,0; 0,0"
                    keyTimes="0; 0.12; 0.28; 0.45; 0.62; 1"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                  <image
                    href={card.imageUrl}
                    x="0"
                    y="0"
                    width="680"
                    height="990"
                    preserveAspectRatio="none"
                  />
                </g>
              </g>
            )}
        </g>

        {/* PREMIUM PRISMATIC HOLOGRAPHIC REFLECTION OVER THE ARTWORK (Retracts in Full Mode so only pure image/video remains) */}
        {card.isPremium && prismaticAlpha > 0 && !artOnlyShowcase && (
          <rect
            x="0"
            y="0"
            width="680"
            height="990"
            fill={`url(#prismatic-foil-grad-${scope})`}
            style={{
              mixBlendMode: interactive ? 'color-dodge' : 'screen',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* PROCEDURAL VFX LAYER (Retracts in Full Mode unless vfxPlayOnNormalView is used on normal card) */}
        {interactive && card.vfxPlayOnNormalView && !artOnlyShowcase && (
          <ShowcaseVfxCanvas
            vfxType={card.showcaseVfx || 'dimensional-slash'}
            intensity={card.showcaseVfxIntensity ?? 85}
            active={Boolean(card.vfxPlayOnNormalView)}
            strokeColor={card.strokeColor}
          />
        )}

        {/* 2. FLOATING LORE & MAGIC ABILITY BOX (Retracts completely in Full Mode) */}
        {card.showLoreBox && (
          <g
            transform={`translate(${
              -parallaxOffset.x * 6 * parallaxFactor
            }, ${
              card.loreBoxY -
              724 -
              parallaxOffset.y * 6 * parallaxFactor +
              (artOnlyShowcase ? 85 : 0)
            })`}
            style={{
              opacity: artOnlyShowcase ? 0 : card.loreBoxOpacity / 100,
              transition:
                'opacity 450ms cubic-bezier(0.16, 1, 0.3, 1), transform 550ms cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: artOnlyShowcase ? 'none' : 'auto',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSection?.('lore');
            }}
            className={interactive ? 'cursor-pointer' : ''}
          >
            {/* Outer soft halo in the card's dark palette color (NO gray/black border) */}
            <rect
              x="108"
              y="726"
              width="456"
              height="160"
              rx="26"
              ry="26"
              fill={`url(#lore-box-grad-${scope})`}
              filter={interactive ? `url(#lore-feather-${scope})` : undefined}
            />
            {/* Inner rich dark palette body (deep brown, wine, forest, navy, etc.) */}
            <rect
              x="112"
              y="730"
              width="448"
              height="152"
              rx="24"
              ry="24"
              fill={`url(#lore-box-inner-grad-${scope})`}
            />

            <foreignObject x="120" y="734" width="432" height="144">
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  color: '#FFFFFF',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  padding: '2px 8px',
                  boxSizing: 'border-box',
                  lineHeight: 1.2,
                  userSelect: 'none',
                  overflow: 'hidden',
                }}
              >
                {card.loreHeader && (
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: `${loreHeaderFontSize}px`,
                      letterSpacing: '-0.01em',
                      marginBottom: '3px',
                      color: '#FFFFFF',
                      maxWidth: '416px',
                      lineHeight: 1.15,
                    }}
                  >
                    {card.loreHeader}
                  </div>
                )}

                {card.loreBody && (
                  <div
                    style={{
                      fontWeight: 400,
                      fontSize: `${loreBodyFontSize}px`,
                      color: '#F8FAFC',
                      marginBottom: '6px',
                      maxWidth: '414px',
                      lineHeight: 1.18,
                    }}
                  >
                    {card.loreBody}
                  </div>
                )}

                {(card.magicPrefix || card.magicDescription) && (
                  <div
                    style={{
                      fontSize: `${loreBodyFontSize}px`,
                      color: '#FFFFFF',
                      maxWidth: '414px',
                      lineHeight: 1.18,
                    }}
                  >
                    {card.magicPrefix && (
                      <span style={{ fontWeight: 800 }}>{card.magicPrefix}</span>
                    )}
                    {card.magicPrefix && card.magicDescription && (
                      <span style={{ fontWeight: 400 }}> — </span>
                    )}
                    {card.magicDescription && (
                      <span style={{ fontWeight: 400 }}>
                        {card.magicDescription}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </foreignObject>
          </g>
        )}
      </g>

      {/* ALL FRAME, CONTOUR, AND CARD UI HUD GROUP */}
      <g
        style={{
          transformOrigin: '340px 495px',
          transform: artOnlyShowcase ? 'scale(1.18)' : 'scale(1)',
          opacity: artOnlyShowcase ? 0 : 1,
          transition:
            'transform 650ms cubic-bezier(0.16, 1, 0.3, 1), opacity 500ms cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: artOnlyShowcase ? 'none' : 'auto',
        }}
      >
        {/* 3. OUTER FRAME BODY */}
        <path
          d={outerFrameCompoundPath}
          fillRule="evenodd"
          fill={`url(#frame-body-grad-${scope})`}
          onClick={() => onSelectSection?.('title')}
          className={interactive ? 'cursor-pointer' : ''}
        />

        {/* 3B. INTENSIFIED ULTRA-FINE MICRO-GLITTER ON THE FRAME & BORDER */}
        {card.isPremium && (
          <g
            clipPath={`url(#outer-frame-clip-${scope})`}
            pointerEvents="none"
          >
            {prismaticAlpha > 0 && (
              <rect
                x="0"
                y="0"
                width="680"
                height="990"
                fill={`url(#prismatic-foil-grad-${scope})`}
                opacity="0.52"
                style={{ mixBlendMode: 'screen' }}
              />
            )}

            {animateChroma && glitterAlpha > 0 && (
              <g opacity={glitterAlpha}>
                {/* Layer 1: Frame Border Micro-Glitter Specks */}
                {frameGlitterSpecks.map((s, idx) => (
                  <circle
                    key={`surf-${idx}`}
                    cx={s.x}
                    cy={s.y}
                    r={s.r}
                    fill={s.color}
                  >
                    <animate
                      attributeName="opacity"
                      values="0.08;1;0.12;0.9;0.08"
                      dur={`${s.dur}s`}
                      begin={`${s.delay}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                ))}

                {/* Layer 2: Intense Rim Micro-Glitter Specks with Brilliance Filter */}
                <g filter={`url(#keylight-bloom-${scope})`}>
                  {borderRimGlitterSpecks.map((s, idx) => (
                    <circle
                      key={`rim-${idx}`}
                      cx={s.x}
                      cy={s.y}
                      r={s.r}
                      fill={s.color}
                    >
                      <animate
                        attributeName="opacity"
                        values="0.05;1;0.15;0.95;0.05"
                        dur={`${s.dur}s`}
                        begin={`${s.delay}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  ))}
                </g>
              </g>
            )}
          </g>
        )}

        {/* 4. CONTINUOUS INNER CONTOUR LINE (Base Adaptive Color) */}
        <path
          d={innerWindowPath}
          fill="none"
          stroke={card.strokeColor}
          strokeWidth={card.strokeWidth}
          strokeLinejoin="round"
          filter={
            (card.isPremium || card.strokeGlow > 0)
              ? `url(#contour-glow-${scope})`
              : undefined
          }
          pointerEvents="none"
        />

        {/* 4B. PREMIUM PRISMATIC CONTOUR SHIMMER + STAGGERED KEY LIGHTS */}
        {card.isPremium && (
          <g pointerEvents="none">
            <path
              d={innerWindowPath}
              fill="none"
              stroke={`url(#chromatic-contour-grad-${scope})`}
              strokeWidth={card.strokeWidth + 0.8}
              strokeLinejoin="round"
              filter={`url(#keylight-bloom-${scope})`}
              opacity="0.92"
            >
              {animateChroma && (
                <animate
                  attributeName="opacity"
                  values="0.65;1;0.72;1;0.65"
                  dur={`${(contourCycleDuration * 0.85).toFixed(2)}s`}
                  repeatCount="indefinite"
                />
              )}
            </path>

            {/* Staggered Chromatic Key Lights pulsing along the contour corners & notches */}
            {animateChroma &&
              contourKeyLights.map((kl, idx) => (
                <g
                  key={`kl-${idx}`}
                  transform={`translate(${kl.x}, ${kl.y}) scale(${kl.scale})`}
                  filter={`url(#keylight-bloom-${scope})`}
                >
                  <circle
                    cx="0"
                    cy="0"
                    r="6.5"
                    fill={`url(#chromatic-contour-grad-${scope})`}
                    opacity="0.75"
                  >
                    <animate
                      attributeName="r"
                      values="3.5;8.5;4.5;7.5;3.5"
                      dur={`${kl.dur}s`}
                      begin={`${kl.delay}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.2;0.92;0.35;0.85;0.2"
                      dur={`${kl.dur}s`}
                      begin={`${kl.delay}s`}
                      repeatCount="indefinite"
                    />
                  </circle>

                  <path
                    d="M 0 -9.5 Q 0 0 9.5 0 Q 0 0 0 9.5 Q 0 0 -9.5 0 Q 0 0 0 -9.5 Z"
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
                      values="0.55;1.25;0.7;1.1;0.55"
                      dur={`${kl.dur}s`}
                      begin={`${kl.delay}s`}
                      repeatCount="indefinite"
                    />
                  </path>

                  <circle cx="0" cy="0" r="1.8" fill="#FFFFFF" />
                </g>
              ))}
          </g>
        )}

        {/* 5. TOP TITLE (Dynamically scales font size to fit strictly inside the 165..515 top notch) */}
        <g
          onClick={() => onSelectSection?.('title')}
          className={interactive ? 'cursor-pointer' : ''}
        >
          <text
            ref={titleTextRef}
            x="340"
            y={Math.round(35 + finalTitleFontSize * 0.34)}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize={finalTitleFontSize}
            fontWeight="800"
            letterSpacing="-0.4"
            style={{
              fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            }}
          >
            {card.title}
          </text>
        </g>

        {/* 6. LEFT SIDE VERTICAL TAB ("PV500") */}
        <g
          onClick={() => onSelectSection?.('sides')}
          className={interactive ? 'cursor-pointer' : ''}
        >
          {pvChars.map((char, idx) => {
            const yPos =
              pvChars.length === 1 ? 564 : pvStartY + idx * pvStep;
            return (
              <text
                key={idx}
                x="33"
                y={yPos}
                textAnchor="middle"
                fill={
                  card.isPvChromatic
                    ? `url(#chromatic-badge-grad-${scope})`
                    : '#FFFFFF'
                }
                fontSize={pvFontSize}
                fontWeight="800"
                style={{
                  fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
                }}
              >
                {char}
              </text>
            );
          })}
        </g>

        {/* 7. RIGHT SIDE ELEMENT CAPSULE ("TERRA") & RANK BADGE ("S") */}
        <g
          onClick={() => onSelectSection?.('sides')}
          className={interactive ? 'cursor-pointer' : ''}
        >
          {/* Element Capsule: either standard White background OR Inverted (Element Color background) */}
          <rect
            x="627"
            y="469"
            width="30"
            height="136"
            rx="15"
            ry="15"
            fill={card.invertElementCapsule ? card.elementTextColor : '#FFFFFF'}
          />

          {elementChars.map((char, idx) => {
            const yPos =
              elementChars.length === 1 ? 545 : elStartY + idx * elStep;
            return (
              <text
                key={idx}
                x="642"
                y={yPos}
                textAnchor="middle"
                fill={card.invertElementCapsule ? '#FFFFFF' : card.elementTextColor}
                fontSize={elFontSize}
                fontWeight="900"
                style={{
                  fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
                }}
              >
                {char}
              </text>
            );
          })}

          {/* Rank Circle: either solid rankCircleColor OR Chromatic Rainbow */}
          <circle
            cx="642"
            cy="629"
            r="16.5"
            fill={
              card.isRankChromatic
                ? `url(#chromatic-badge-grad-${scope})`
                : card.rankCircleColor
            }
          />
          <text
            x="642"
            y="637.5"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize={(card.rankBadgeText || '').length > 1 ? '17' : '24'}
            fontWeight="900"
            style={{
              fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            }}
          >
            {card.rankBadgeText}
          </text>
        </g>

        {/* 8. BOTTOM STAT CAPSULES (Variable 1, 2, 3, or 4 capsules with dynamic font sizing) */}
        <g
          onClick={() => onSelectSection?.('bottom')}
          className={interactive ? 'cursor-pointer' : ''}
        >
          {activePills.map((pill, index) => {
            const px = startX + index * (pillWidth + pillGap);
            const mainLen = (pill.mainText || '').trim().length;
            const badgeLen = (pill.badgeValue || '').trim().length;
            const statMainFontSize =
              mainLen <= 3
                ? 20.5
                : mainLen === 4
                ? 17
                : mainLen === 5
                ? 14
                : Math.max(10.5, Math.floor(52 / (mainLen * 0.6)));
            const textModeFontSize =
              mainLen <= 5
                ? 19
                : mainLen <= 7
                ? 15.5
                : Math.max(10.5, Math.floor(86 / (mainLen * 0.6)));
            const badgeFontSize = badgeLen <= 1 ? 19 : badgeLen === 2 ? 15.5 : 12.5;

            return (
              <g key={pill.id} transform={`translate(${px}, ${pillY})`}>
                {/* White Stadium Capsule */}
                <rect
                  x="0"
                  y="0"
                  width={pillWidth}
                  height={pillHeight}
                  rx="23"
                  ry="23"
                  fill="#FFFFFF"
                />

                {pill.mode === 'stat' ? (
                  <>
                    <circle
                      cx="22"
                      cy="23"
                      r="16.5"
                      fill={
                        pill.isChromaticSpecial
                          ? `url(#chromatic-badge-grad-${scope})`
                          : pill.badgeColor
                      }
                    />

                    {pill.isChromaticSpecial ? (
                      <g transform="translate(22, 23)">
                        <path
                          d="M -2.2 -2.2 C -4.8 -4.8, -9.8 -4.5, -9.8 0 C -9.8 4.5, -4.8 4.8, -2.2 2.2 L 2.2 -2.2 C 4.8 -4.8, 9.8 -4.5, 9.8 0 C 9.8 4.5, 4.8 4.8, 2.2 2.2 Z"
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth="2.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                    ) : (
                      <text
                        x="22"
                        y={23 + badgeFontSize * 0.35}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize={badgeFontSize}
                        fontWeight="900"
                        fontStyle="italic"
                        style={{
                          fontFamily: "'Russo One', 'Chakra Petch', sans-serif",
                        }}
                      >
                        {pill.badgeValue}
                      </text>
                    )}

                    <text
                      x="67"
                      y={23 + statMainFontSize * 0.36}
                      textAnchor="middle"
                      fill="#09090B"
                      fontSize={statMainFontSize}
                      fontWeight="900"
                      fontStyle="italic"
                      letterSpacing="-0.5"
                      style={{
                        fontFamily: "'Russo One', 'Chakra Petch', sans-serif",
                      }}
                    >
                      {pill.mainText}
                    </text>
                  </>
                ) : (
                  <text
                    x={pillWidth / 2}
                    y={23 + textModeFontSize * 0.35}
                    textAnchor="middle"
                    fill="#09090B"
                    fontSize={textModeFontSize}
                    fontWeight="900"
                    fontStyle="italic"
                    letterSpacing="-0.3"
                    style={{
                      fontFamily: "'Russo One', 'Chakra Petch', sans-serif",
                    }}
                  >
                    {pill.mainText}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
});
