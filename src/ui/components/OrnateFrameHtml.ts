/**
 * OrnateFrameHtml.ts
 * Exact HTML/SVG builders matching /src/ui/nova_ui_v1.2/src/components/OrnateWindowFrame.tsx
 * for vanilla TypeScript Hub screens (Store, Arsenal, Profile, Settings, Inventory/Backpack, Menu).
 */

export function renderOrnateSvgDefsHtml(): string {
  return `
    <svg width="0" height="0" style="position:absolute; pointer-events:none; width:0; height:0; overflow:hidden;">
      <defs>
        <linearGradient id="goldOuterBevel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fff6cf" />
          <stop offset="14%" stop-color="#e6c36e" />
          <stop offset="35%" stop-color="#a37827" />
          <stop offset="55%" stop-color="#dfb965" />
          <stop offset="78%" stop-color="#fff2c2" />
          <stop offset="92%" stop-color="#b58a38" />
          <stop offset="100%" stop-color="#734f11" />
        </linearGradient>
        <linearGradient id="goldArchSheen" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#9e7629" />
          <stop offset="20%" stop-color="#edd085" />
          <stop offset="38%" stop-color="#b08636" />
          <stop offset="50%" stop-color="#fff9db" />
          <stop offset="62%" stop-color="#b08636" />
          <stop offset="80%" stop-color="#edd085" />
          <stop offset="100%" stop-color="#9e7629" />
        </linearGradient>
        <radialGradient id="pearlParchment" cx="50%" cy="28%" r="72%">
          <stop offset="0%" stop-color="#fdfbf7" />
          <stop offset="55%" stop-color="#f5efe2" />
          <stop offset="88%" stop-color="#ebe1ce" />
          <stop offset="100%" stop-color="#e2d5bc" />
        </radialGradient>
        <linearGradient id="goldFiligree" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#d4b26a" stop-opacity="0.25" />
          <stop offset="20%" stop-color="#c49a45" stop-opacity="0.85" />
          <stop offset="50%" stop-color="#9e721e" stop-opacity="1" />
          <stop offset="80%" stop-color="#c49a45" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#d4b26a" stop-opacity="0.25" />
        </linearGradient>
        <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fffbe0" stop-opacity="0.95" />
          <stop offset="42%" stop-color="#f5d06b" stop-opacity="0.52" />
          <stop offset="100%" stop-color="#d4a238" stop-opacity="0" />
        </radialGradient>
      </defs>
    </svg>
  `;
}

export function renderCrownDiamondSvgHtml(sizePx = 36): string {
  return `
    <svg viewBox="0 0 60 60" style="width:${sizePx}px; height:${sizePx}px; display:block;" fill="none">
      <circle cx="30" cy="30" r="27" fill="url(#goldGlow)" />
      <path
        d="M 30 3 C 34 19, 41 26, 57 30 C 41 34, 34 41, 30 57 C 26 41, 19 34, 3 30 C 19 26, 26 19, 30 3 Z"
        fill="url(#goldOuterBevel)"
        stroke="#5c3f0c"
        stroke-width="1.3"
      />
      <path
        d="M 30 12 C 32.8 23, 37 27.2, 48 30 C 37 32.8, 32.8 37, 30 48 C 27.2 37, 23 32.8, 12 30 C 23 27.2, 27.2 23, 30 12 Z"
        fill="#081e3b"
        stroke="#ffeaa6"
        stroke-width="1"
      />
      <polygon points="30,18 40,30 30,42 20,30" fill="#e6c165" />
      <polygon points="30,18 40,30 30,30" fill="#fff7d1" />
      <polygon points="20,30 30,18 30,30" fill="#f0d384" />
      <polygon points="30,30 40,30 30,42" fill="#9c7221" />
      <polygon points="20,30 30,30 30,42" fill="#b88c32" />
    </svg>
  `;
}

export function renderDiamondAccentSvgHtml(sizePx = 14): string {
  return `
    <svg viewBox="0 0 24 24" style="width:${sizePx}px; height:${sizePx}px; display:block; flex-shrink:0;" fill="none">
      <path
        d="M 12 2 C 13.8 8.5, 15.5 10.2, 22 12 C 15.5 13.8, 13.8 15.5, 12 22 C 10.2 15.5, 8.5 13.8, 2 12 C 8.5 10.2, 10.2 8.5, 12 2 Z"
        fill="#c99636"
        stroke="#7a5310"
        stroke-width="1"
      />
      <polygon points="12,6.5 16.5,12 12,17.5 7.5,12" fill="#fff6cc" />
    </svg>
  `;
}

export function renderGoldDividerHHtml(marginStyle = 'margin: 8px 0;'): string {
  return `
    <div style="width:100%; display:flex; align-items:center; justify-content:center; ${marginStyle}">
      <div style="height:1.5px; flex:1; background:linear-gradient(90deg, rgba(212,178,106,0.25), #c99b3b, #b58424);"></div>
      <div style="margin:0 -2px; flex-shrink:0;">${renderDiamondAccentSvgHtml(14)}</div>
      <div style="height:1.5px; flex:1; background:linear-gradient(270deg, rgba(212,178,106,0.25), #c99b3b, #b58424);"></div>
    </div>
  `;
}

export function renderGoldDividerVHtml(marginStyle = 'margin: 0 6px;'): string {
  return `
    <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; ${marginStyle}">
      <div style="width:1.5px; flex:1; background:linear-gradient(180deg, rgba(212,178,106,0.25), #c99b3b, #b58424);"></div>
      <div style="margin:-2px 0; flex-shrink:0;">${renderDiamondAccentSvgHtml(14)}</div>
      <div style="width:1.5px; flex:1; background:linear-gradient(0deg, rgba(212,178,106,0.25), #c99b3b, #b58424);"></div>
    </div>
  `;
}

export function renderCloseCircleButtonHtml(
  idOrAttrs: string,
  size: 'sm' | 'md' = 'md',
  isRawAttrs = false
): string {
  const dim = size === 'sm' ? 28 : 32;
  const attrStr = isRawAttrs ? idOrAttrs : `id="${idOrAttrs}"`;
  return `
    <button
      type="button"
      ${attrStr}
      aria-label="Fechar"
      class="close-btn-outer"
      style="width:${dim}px; height:${dim}px; display:flex; align-items:center; justify-content:center; flex-shrink:0; cursor:pointer;"
    >
      <div class="close-btn-inner" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
        <svg viewBox="0 0 24 24" style="width:14px; height:14px; color:#142230;" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </div>
    </button>
  `;
}

export function renderCarouselArrowButtonHtml(
  dir: 'left' | 'right' | 'up' | 'down',
  attrs = '',
  size: 'sm' | 'md' = 'md'
): string {
  const dim = size === 'sm' ? 24 : 28;
  const rot =
    dir === 'right'
      ? 'transform:rotate(180deg);'
      : dir === 'up'
      ? 'transform:rotate(90deg);'
      : dir === 'down'
      ? 'transform:rotate(-90deg);'
      : '';
  return `
    <button
      type="button"
      ${attrs}
      class="pearl-pill"
      style="width:${dim}px; height:${dim}px; min-width:${dim}px; padding:0; border-radius:9999px; display:flex; align-items:center; justify-content:center; flex-shrink:0; cursor:pointer;"
    >
      <svg viewBox="0 0 24 24" style="width:14px; height:14px; color:#142230; ${rot}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  `;
}

export interface OrnateWindowHtmlOptions {
  title?: string;
  closeBtnId?: string;
  showClose?: boolean;
  closeBtnAttrs?: string;
  headerLeftHtml?: string;
  headerRightHtml?: string;
  bodyHtml?: string;
  childrenHtml?: string;
  bodyClass?: string;
  compactHeader?: boolean;
  hideTopArch?: boolean;
  containerStyle?: string;
  bodyStyle?: string;
  bodyId?: string;
}

export function renderOrnateWindowHtml(opts: OrnateWindowHtmlOptions): string {
  const {
    title,
    closeBtnId,
    showClose = false,
    closeBtnAttrs = '',
    headerLeftHtml = '',
    headerRightHtml = '',
    bodyHtml,
    childrenHtml,
    bodyClass = '',
    compactHeader = false,
    hideTopArch = false,
    containerStyle = '',
    bodyStyle = 'padding: 12px 16px 16px; gap: 10px;',
    bodyId = '',
  } = opts;

  const contentHtml = bodyHtml ?? childrenHtml ?? '';
  const crownSize = compactHeader ? 28 : 34;
  const topPad = hideTopArch ? '0px' : compactHeader ? '14px' : '16px';

  const closeButtonMarkup = closeBtnId
    ? renderCloseCircleButtonHtml(closeBtnId, compactHeader ? 'sm' : 'md', false)
    : showClose || closeBtnAttrs
    ? renderCloseCircleButtonHtml(closeBtnAttrs, compactHeader ? 'sm' : 'md', true)
    : '';

  return `
    <div style="position:relative; width:100%; padding-top:${topPad}; padding-bottom:10px; display:flex; flex-direction:column; box-sizing:border-box; ${containerStyle}">
      ${renderOrnateSvgDefsHtml()}

      ${
        !hideTopArch
          ? `
        <div style="pointer-events:none; position:absolute; top:0px; left:50%; transform:translateX(-50%); width:58%; max-width:340px; height:30px; z-index:10; display:flex; align-items:flex-start; justify-content:center;">
          <svg viewBox="0 0 320 42" style="width:100%; height:100%; overflow:visible;" preserveAspectRatio="none">
            <path
              d="M 0 22 C 70 22, 115 3, 160 2 C 205 3, 250 22, 320 22 L 300 32 L 20 32 Z"
              fill="url(#goldOuterBevel)"
              stroke="#6b480e"
              stroke-width="1.2"
            />
            <path
              d="M 8 25 C 74 25, 118 8, 160 7 C 202 8, 246 25, 312 25 L 312 38 L 8 38 Z"
              fill="url(#pearlParchment)"
              stroke="#b88d35"
              stroke-width="1.5"
            />
          </svg>
          <div style="position:absolute; top:-12px; left:50%; transform:translateX(-50%);">
            ${renderCrownDiamondSvgHtml(crownSize)}
          </div>
        </div>
      `
          : ''
      }

      <div style="width:100%; flex:1; min-height:0; border-radius:24px; padding:3.5px; background:linear-gradient(180deg, #fff3c2 0%, #c79c44 50%, #946a1c 100%); box-shadow:0 14px 34px rgba(0,6,18,0.75), 0 0 18px rgba(235,195,105,0.18); position:relative; display:flex; flex-direction:column; box-sizing:border-box;">
        <div class="pearl-surface" style="width:100%; flex:1; min-height:0; border-radius:20.5px; border:1.5px solid #b58932; position:relative; display:flex; flex-direction:column; overflow:hidden; box-sizing:border-box;">
          ${
            title
              ? `
            <div style="position:relative; width:100%; flex-shrink:0; box-sizing:border-box; ${
              compactHeader ? 'padding:12px 14px 8px;' : 'padding:14px 18px 9px;'
            }">
              <svg viewBox="0 0 800 70" style="pointer-events:none; position:absolute; inset:0; width:100%; height:100%;" preserveAspectRatio="none">
                <path d="M 350 4 C 280 34, 190 42, 80 42 C 35 42, 12 48, 4 64" fill="none" stroke="#d9bc7a" stroke-width="1.3" />
                <path d="M 450 4 C 520 34, 610 42, 720 42 C 765 42, 788 48, 796 64" fill="none" stroke="#d9bc7a" stroke-width="1.3" />
                <path d="M 6 66 L 794 66" fill="none" stroke="url(#goldFiligree)" stroke-width="1.5" />
              </svg>
              <div style="pointer-events:none; position:absolute; bottom:-7px; left:50%; transform:translateX(-50%); z-index:10;">
                ${renderDiamondAccentSvgHtml(14)}
              </div>
              <div style="position:relative; z-index:10; display:flex; align-items:center; justify-content:space-between; min-height:26px; gap:8px;">
                <div style="flex:1; display:flex; align-items:center; gap:6px; min-width:0;">${headerLeftHtml}</div>
                <h2 style="margin:0; font-family:var(--font-display); font-size:${
                  compactHeader ? '15px' : '18px'
                }; font-weight:800; letter-spacing:0.14em; color:#091b2e; text-transform:uppercase; text-align:center; white-space:nowrap;">
                  ${title}
                </h2>
                <div style="flex:1; display:flex; align-items:center; justify-content:flex-end; gap:6px; min-width:0;">
                  ${headerRightHtml}
                  ${closeButtonMarkup}
                </div>
              </div>
            </div>
          `
              : ''
          }

          <div ${bodyId ? `id="${bodyId}"` : ''} class="nova-scroll ${bodyClass}" style="position:relative; z-index:10; flex:1; min-height:0; display:flex; flex-direction:column; box-sizing:border-box; ${bodyStyle}">
            ${contentHtml}
          </div>
        </div>

        <div style="pointer-events:none; position:absolute; bottom:-9px; left:50%; transform:translateX(-50%); z-index:20;">
          ${renderDiamondAccentSvgHtml(20)}
        </div>
      </div>
    </div>
  `;
}
