import React from 'react';

export const OrnateSvgDefs: React.FC = () => (
  <svg width="0" height="0" className="absolute pointer-events-none">
    <defs>
      <linearGradient id="goldOuterBevel" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fff6cf" />
        <stop offset="14%" stopColor="#e6c36e" />
        <stop offset="35%" stopColor="#a37827" />
        <stop offset="55%" stopColor="#dfb965" />
        <stop offset="78%" stopColor="#fff2c2" />
        <stop offset="92%" stopColor="#b58a38" />
        <stop offset="100%" stopColor="#734f11" />
      </linearGradient>

      <linearGradient id="goldArchSheen" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#9e7629" />
        <stop offset="20%" stopColor="#edd085" />
        <stop offset="38%" stopColor="#b08636" />
        <stop offset="50%" stopColor="#fff9db" />
        <stop offset="62%" stopColor="#b08636" />
        <stop offset="80%" stopColor="#edd085" />
        <stop offset="100%" stopColor="#9e7629" />
      </linearGradient>

      <radialGradient id="pearlParchment" cx="50%" cy="28%" r="72%">
        <stop offset="0%" stopColor="#fdfbf7" />
        <stop offset="55%" stopColor="#f5efe2" />
        <stop offset="88%" stopColor="#ebe1ce" />
        <stop offset="100%" stopColor="#e2d5bc" />
      </radialGradient>

      <linearGradient id="goldFiligree" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#d4b26a" stopOpacity="0.25" />
        <stop offset="20%" stopColor="#c49a45" stopOpacity="0.85" />
        <stop offset="50%" stopColor="#9e721e" stopOpacity="1" />
        <stop offset="80%" stopColor="#c49a45" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#d4b26a" stopOpacity="0.25" />
      </linearGradient>

      <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fffbe0" stopOpacity="0.95" />
        <stop offset="42%" stopColor="#f5d06b" stopOpacity="0.52" />
        <stop offset="100%" stopColor="#d4a238" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

/**
 * 4-Pointed Golden Crown Crest at Top Center of Every Ornate Window
 */
export const CrownDiamondSvg: React.FC<{ className?: string }> = ({
  className = 'w-9 h-9',
}) => (
  <svg viewBox="0 0 60 60" className={className} fill="none">
    <circle cx="30" cy="30" r="27" fill="url(#goldGlow)" />
    <path
      d="M 30 3 C 34 19, 41 26, 57 30 C 41 34, 34 41, 30 57 C 26 41, 19 34, 3 30 C 19 26, 26 19, 30 3 Z"
      fill="url(#goldOuterBevel)"
      stroke="#5c3f0c"
      strokeWidth="1.3"
    />
    <path
      d="M 30 12 C 32.8 23, 37 27.2, 48 30 C 37 32.8, 32.8 37, 30 48 C 27.2 37, 23 32.8, 12 30 C 23 27.2, 27.2 23, 30 12 Z"
      fill="#081e3b"
      stroke="#ffeaa6"
      strokeWidth="1"
    />
    <polygon points="30,18 40,30 30,42 20,30" fill="#e6c165" />
    <polygon points="30,18 40,30 30,30" fill="#fff7d1" />
    <polygon points="20,30 30,18 30,30" fill="#f0d384" />
    <polygon points="30,30 40,30 30,42" fill="#9c7221" />
    <polygon points="20,30 30,30 30,42" fill="#b88c32" />
  </svg>
);

/**
 * Small 4-Pointed Gold Filigree Diamond Accent (❖)
 */
export const DiamondAccentSvg: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path
      d="M 12 2 C 13.8 8.5, 15.5 10.2, 22 12 C 15.5 13.8, 13.8 15.5, 12 22 C 10.2 15.5, 8.5 13.8, 2 12 C 8.5 10.2, 10.2 8.5, 12 2 Z"
      fill="#c99636"
      stroke="#7a5310"
      strokeWidth="1"
    />
    <polygon points="12,6.5 16.5,12 12,17.5 7.5,12" fill="#fff6cc" />
  </svg>
);

/**
 * Horizontal Gold Divider with Central 4-Pointed Diamond (───❖───)
 */
export const GoldDividerH: React.FC<{ className?: string }> = ({ className = 'my-2.5' }) => (
  <div className={`w-full flex items-center justify-center ${className}`}>
    <div className="h-[1.5px] flex-1 bg-gradient-to-r from-[#d4b26a]/30 via-[#c99b3b] to-[#b58424]" />
    <DiamondAccentSvg className="w-3.5 h-3.5 -mx-0.5 shrink-0" />
    <div className="h-[1.5px] flex-1 bg-gradient-to-l from-[#d4b26a]/30 via-[#c99b3b] to-[#b58424]" />
  </div>
);

/**
 * Vertical Gold Divider with Central 4-Pointed Diamond
 */
export const GoldDividerV: React.FC<{ className?: string }> = ({ className = 'mx-2' }) => (
  <div className={`h-full flex flex-col items-center justify-center ${className}`}>
    <div className="w-[1.5px] flex-1 bg-gradient-to-b from-[#d4b26a]/30 via-[#c99b3b] to-[#b58424]" />
    <DiamondAccentSvg className="w-3.5 h-3.5 -my-0.5 shrink-0" />
    <div className="w-[1.5px] flex-1 bg-gradient-to-t from-[#d4b26a]/30 via-[#c99b3b] to-[#b58424]" />
  </div>
);

/**
 * Universal Ornate Pearl & Gold Arched Window Container
 * Renders the rising ogee arch top border, top diamond crest, sweeping header filigree,
 * optional title & close button, and bottom diamond finial.
 */
export const OrnateWindow: React.FC<{
  title?: string;
  onClose?: () => void;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  compactHeader?: boolean;
  hideTopArch?: boolean;
}> = ({
  title,
  onClose,
  headerRight,
  children,
  className = '',
  bodyClassName = 'p-4 sm:p-5',
  compactHeader = false,
  hideTopArch = false,
}) => {
  return (
    <div className={`relative pt-4 pb-2 ${className}`}>
      {/* Top Ogee Arch SVG Cap */}
      {!hideTopArch && (
        <div className="pointer-events-none absolute -top-[2px] left-1/2 -translate-x-1/2 w-[56%] max-w-[340px] h-8 z-10 flex items-start justify-center">
          <svg viewBox="0 0 320 42" className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <path
              d="M 0 22 C 70 22, 115 3, 160 2 C 205 3, 250 22, 320 22 L 300 32 L 20 32 Z"
              fill="url(#goldOuterBevel)"
              stroke="#6b480e"
              strokeWidth="1.2"
            />
            <path
              d="M 8 25 C 74 25, 118 8, 160 7 C 202 8, 246 25, 312 25 L 312 38 L 8 38 Z"
              fill="url(#pearlParchment)"
              stroke="#b88d35"
              strokeWidth="1.5"
            />
          </svg>
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <CrownDiamondSvg className={compactHeader ? 'w-7 h-7' : 'w-9 h-9'} />
          </div>
        </div>
      )}

      {/* Main 3D Metallic Gold Outer Rim */}
      <div className="w-full h-full rounded-[26px] p-[3.5px] bg-gradient-to-b from-[#fff3c2] via-[#c79c44] to-[#946a1c] shadow-[0_14px_34px_rgba(0,6,18,0.75),0_0_18px_rgba(235,195,105,0.18)] relative">
        {/* Inner Pearl Parchment Container */}
        <div className="pearl-surface w-full h-full rounded-[22.5px] border-[1.5px] border-[#b58932] relative flex flex-col overflow-hidden">
          {/* Top Sweeping Golden Filigree Curves & Header */}
          {title && (
            <div className={`relative w-full ${compactHeader ? 'pt-3 pb-1.5 px-4' : 'pt-4 pb-2 px-6'}`}>
              {/* Sweeping gold filigree SVG behind header */}
              <svg
                viewBox="0 0 800 70"
                className="pointer-events-none absolute inset-0 w-full h-full"
                preserveAspectRatio="none"
              >
                <path
                  d="M 350 4 C 280 34, 190 42, 80 42 C 35 42, 12 48, 4 64"
                  fill="none"
                  stroke="#d9bc7a"
                  strokeWidth="1.3"
                />
                <path
                  d="M 450 4 C 520 34, 610 42, 720 42 C 765 42, 788 48, 796 64"
                  fill="none"
                  stroke="#d9bc7a"
                  strokeWidth="1.3"
                />
                <path
                  d="M 6 66 L 794 66"
                  fill="none"
                  stroke="url(#goldFiligree)"
                  strokeWidth="1.5"
                />
              </svg>

              {/* Center Diamond on bottom hairline of header */}
              <div className="pointer-events-none absolute -bottom-[7px] left-1/2 -translate-x-1/2 z-10">
                <DiamondAccentSvg className="w-3.5 h-3.5" />
              </div>

              <div className="relative z-10 flex items-center justify-between min-h-[30px]">
                <div className="flex-1" />
                <h2
                  className={`${
                    compactHeader ? 'text-[17px] sm:text-[19px]' : 'text-[20px] sm:text-[24px]'
                  } font-semibold tracking-[0.14em] text-[#091b2e] uppercase text-center whitespace-nowrap`}
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {title}
                </h2>
                <div className="flex-1 flex items-center justify-end gap-2">
                  {headerRight}
                  {onClose && <CloseCircleButton onClick={onClose} size={compactHeader ? 'sm' : 'md'} />}
                </div>
              </div>
            </div>
          )}

          {/* Main Window Body */}
          <div className={`relative z-10 flex-1 flex flex-col ${bodyClassName}`}>{children}</div>
        </div>

        {/* Bottom Center Finial Diamond */}
        <div className="pointer-events-none absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-20">
          <DiamondAccentSvg className="w-5 h-5 drop-shadow" />
        </div>
      </div>
    </div>
  );
};

/**
 * Circular Pearl & Gold "X" Close Button
 */
export const CloseCircleButton: React.FC<{ onClick?: () => void; size?: 'sm' | 'md' }> = ({
  onClick,
  size = 'md',
}) => {
  const dim = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Fechar"
      className={`close-btn-outer ${dim} flex items-center justify-center shrink-0 cursor-pointer`}
    >
      <div className="close-btn-inner w-full h-full flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          className="w-3.5 h-3.5 text-[#142230]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </div>
    </button>
  );
};

/**
 * Circular Pearl `<` or `>` Carousel Arrow Button
 */
export const CarouselArrowButton: React.FC<{
  dir: 'left' | 'right' | 'up' | 'down';
  onClick?: () => void;
  size?: 'sm' | 'md';
}> = ({ dir, onClick, size = 'md' }) => {
  const dim = size === 'sm' ? 'w-6 h-6' : 'w-7 h-7';
  const rot =
    dir === 'right'
      ? 'rotate-180'
      : dir === 'up'
      ? 'rotate-90'
      : dir === 'down'
      ? '-rotate-90'
      : '';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pearl-pill ${dim} rounded-full flex items-center justify-center shrink-0 cursor-pointer hover:brightness-105 active:scale-95 transition-transform`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`w-3.5 h-3.5 text-[#142230] ${rot}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
};

/**
 * Primary Royal-Blue & Gold Button
 */
export const RoyalButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  innerClassName?: string;
}> = ({ children, onClick, className = '', innerClassName = 'py-2 px-5 text-[12px]' }) => (
  <button type="button" onClick={onClick} className={`btn-royal-gold cursor-pointer ${className}`}>
    <div
      className={`btn-royal-inner w-full h-full flex items-center justify-center text-[#f7f3e8] tracking-[0.08em] font-medium whitespace-nowrap ${innerClassName}`}
    >
      {children}
    </div>
  </button>
);

/**
 * Secondary Pearl & Gold Button
 */
export const PearlButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  innerClassName?: string;
}> = ({ children, onClick, className = '', innerClassName = 'py-2 px-5 text-[12px]' }) => (
  <button type="button" onClick={onClick} className={`btn-pearl-gold cursor-pointer ${className}`}>
    <div
      className={`btn-pearl-inner w-full h-full flex items-center justify-center text-[#122030] tracking-[0.08em] whitespace-nowrap ${innerClassName}`}
    >
      {children}
    </div>
  </button>
);

/**
 * Empty Wireframe Placeholder Slot ("tudo vazio sem assets")
 * Renders the clean matte grey box with optional '+' icon and uppercase serif label
 */
export const WireSlot: React.FC<{
  label?: string;
  sublabel?: string;
  plus?: boolean;
  circle?: boolean;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}> = ({
  label,
  sublabel,
  plus = false,
  circle = false,
  className = '',
  onClick,
  children,
}) => (
  <div
    onClick={onClick}
    className={`wire-slot ${
      circle ? 'rounded-full' : 'rounded-[8px]'
    } flex flex-col items-center justify-center text-center select-none ${
      onClick ? 'cursor-pointer hover:brightness-[0.98] transition-all' : ''
    } ${className}`}
  >
    {plus && (
      <span className="text-[20px] leading-none text-[#646b73] font-light mb-0.5">+</span>
    )}
    {label && (
      <span
        className="text-[10px] sm:text-[11px] tracking-[0.08em] text-[#454c54] uppercase font-medium px-1"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {label}
      </span>
    )}
    {sublabel && (
      <span
        className="text-[9.5px] tracking-[0.08em] text-[#555d66] uppercase mt-0.5 px-1"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {sublabel}
      </span>
    )}
    {children}
  </div>
);

/**
 * Top Section Title Banner (e.g., "01 · LOJA CENTRAL — ESTRUTURA")
 */
export const SheetTitleHeader: React.FC<{ title: string }> = ({ title }) => (
  <div className="w-full mb-2">
    <h1
      className="text-[18px] sm:text-[24px] tracking-[0.14em] text-[#f0d796] uppercase font-normal"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {title}
    </h1>
    <div className="w-full max-w-[680px] flex items-center mt-0.5">
      <div className="h-[1px] w-28 bg-gradient-to-r from-[#d4af59] to-[#f7e29c]" />
      <DiamondAccentSvg className="w-3 h-3 -mx-0.5 shrink-0" />
      <div className="h-[1px] flex-1 bg-gradient-to-r from-[#f7e29c] via-[#d4af59]/50 to-transparent" />
    </div>
  </div>
);
