import { Card, Skill } from '../../core/GameEngine';
import { RARITIES, CARD_ABILITIES, getGlobalCardBack } from '../../core/constants';
import type { Rarity } from '../../core/types';
import { renderHandCardPremium, renderFieldCardPremium } from './forge_v2/utils/PremiumCardRenderer';
import { t } from '../../core/i18n';
import { DuelHeader } from '../components/DuelHeader';
import { DuelControlsPanel } from '../components/DuelControlsPanel';

// ─── HELPER ───────────────────────────────────────────────────────────────────

/** @deprecated Rarity is now replaced by Mana in standard views. Kept for theater mode only. */
export function rarityBadge(rarity?: Rarity): string {
  if (!rarity) return '';
  const r = RARITIES[rarity];
  return `<span class="rarity-badge rarity-${rarity}" title="${r.label}">${r.icon}</span>`;
}
// Note: rarityBadge is retained for fullscreen/theater mode renders


// ─── BOARD SCREEN ─────────────────────────────────────────────────────────────

export class BoardScreen {

  public render(
    board: (Card | null)[],
    hp: { p: number; e: number },
    mana: { p: number; e: number },
    stamina: { p: number; e: number },
    turn: string,
    timer: number,
    grave: Card[],
    deckCount: number
  ): string {
    const topGraveCard = grave.length > 0 ? grave[grave.length - 1] : null;
    return `
      <div class="battle-screen">

        <!-- HEADER COMPONENT -->
        ${DuelHeader.render(hp)}


        <!-- BOARD -->
        <section class="board-area">
          <div class="capsules-container enemy-capsules">
            ${this.renderSideCapsules('e', board)}
          </div>
          
          <div class="board-grid-hifi" id="board">
            ${board.map((card, i) => `
              <div class="slot ${i < 3 ? 'slot-e' : 'slot-p'}" data-idx="${i}">
                ${card ? this.renderCard(card) : ''}
              </div>
            `).join('')}
          </div>

          <div class="capsules-container player-capsules">
            ${this.renderSideCapsules('p', board)}
          </div>
        </section>



        <!-- ALÇA DE INCENTIVO AO ATAQUE (FORA DA SEÇÃO E CENTRALIZADA) -->
        <div class="attack-prompt-wrapper">
          <button class="attack-prompt-handle ${turn !== 'p' ? 'hidden' : ''}" id="btn-attack-prompt" title="${t('board.attack')}">
            <span class="handle-icon">⚔️</span>
            <span class="handle-text">${t('board.attack')}</span>
          </button>
        </div>

        <!-- MANAGEMENT: CONTAINER PAI DE VIDRO DE LADO A LADO -->
        <section class="management-hifi" id="management-hifi">
          <!-- SLIDE 1: CEMITÉRIO + CONTROLES + DECK (DESLIZAM JUNTOS) -->
          <div class="management-slide default-slide" id="management-default-slide">
            <div class="management-column side-left">
              ${this.renderStackSlot('grave', grave.length, topGraveCard?.image)}
            </div>

            <!-- CONTROLS PANEL COMPONENT (VIDRO COM BARRAS, ARTEFATOS E BOTÃO DE TURNO) -->
            ${DuelControlsPanel.render({ mana, stamina, timer, turn })}

            <div class="management-column side-right">
              ${this.renderStackSlot('deck', deckCount, getGlobalCardBack(), true)}
            </div>
          </div>

          <!-- SLIDE 2: QUICK ACTIONS (OCUPA O CONTAINER DE VIDRO COM BOTÕES OTIMIZADOS) -->
          <div class="management-slide actions-slide" id="management-actions-slide">
            <!-- INLINE ACTION BAR (ATAQUES, SACRIFÍCIO E FECHAR) -->
            <div id="inline-action-bar" class="inline-action-bar">
              <div class="actions-panel-content">
                <div class="atk-options-group" id="atk-options-root">
                  <button class="inline-btn-capsule atk" id="act-atk-0">ATK 1</button>
                  <button class="inline-btn-capsule atk" id="act-atk-1">ATK 2</button>
                  <button class="inline-btn-capsule atk" id="act-atk-2">ATK 3</button>
                </div>
                <div class="action-sub-row">
                  <button class="inline-btn-capsule sac" id="act-sac">💀 ${t('board.sac')}</button>
                  <button class="inline-btn-capsule can" id="act-can">✕</button>
                </div>
              </div>
            </div>

            <!-- INLINE SKILL BAR -->
            <div id="inline-skill-bar" class="inline-action-bar">
              <div class="actions-panel-content skill-content">
                <button class="inline-btn-capsule atk" id="skill-confirm">✨ ${t('board.useNow')}</button>
                <button class="inline-btn-capsule can" id="skill-cancel">✕</button>
              </div>
            </div>
          </div>
        </section>

        <!-- HAND -->
        <footer class="hand-area-hifi">
          <div id="hand" class="hand-cards-row"></div>
        </footer>

        <div id="banner" class="banner-message"></div>
        <div id="particle-container"></div>
        <div id="float-container" style="position:fixed;inset:0;pointer-events:none;z-index:9000"></div>

        <!-- BATTLE OVERLAYS -->
        <div id="battle-overlays">
          <!-- Overlay: Carousel -->
          <div class="overlay" id="overlay-carousel">
            <div class="carousel-container" id="carousel-list"></div>
          </div>

          <!-- Overlay: Full screen card -->
          <div class="overlay" id="overlay-fullscreen" style="background:rgba(0,0,0,0.96)">
            <div class="fullscreen-card-wrap" id="fullscreen-card-inner"></div>
          </div>

          <!-- Overlay: Generic Confirm -->
          <div class="overlay" id="overlay-confirm">
            <div class="dialog-box" style="text-align:center; padding-bottom: 20px;">
              <div class="action-card-name" id="confirm-title" style="margin-bottom:10px;">${t('board.confirm')}</div>
              <div id="confirm-msg" style="font-size:0.9rem; font-weight:700; color:#fff; margin-bottom:20px; line-height:1.4;">${t('board.confirmDef')}</div>
              <div style="display:flex; gap:10px; justify-content:center;">
                <button class="action-btn btn-atk" id="confirm-yes" style="flex:1;">${t('board.yes')}</button>
                <button class="action-btn btn-can" id="confirm-no" style="flex:1;">${t('board.no')}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Parry System Overlay -->
        <div class="parry-overlay" id="parry-overlay">
          <div class="parry-visual-container">
            <div class="parry-glow-wave"></div>
            <div class="parry-circle-target"></div>
            <div id="parry-outer" class="parry-circle-outer"></div>
          </div>
          <div id="parry-feedback" class="parry-feedback">${t('board.perfect')}</div>
        </div>

      </div>
    `;
  }

  public renderDifficultyScreen(): string {
    return `
      <div class="startup-screen difficulty-phase" style="background:#050505; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:35px; padding:48px 0 0 0; position:relative;">
        <button id="btn-diff-back" style="position:absolute; top:14px; left:14px; z-index:50; background:linear-gradient(180deg, #5a4128, #2a1c0d); border:3px solid #0e0903; color:#ffe9a8; padding:8px 15px; border-radius:10px; font-weight:900; font-size:0.6rem; letter-spacing:1px; cursor:pointer; box-shadow:0 3px 0 rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,236,190,0.35); text-shadow:0 2px 0 #000;">⟨ ${t('board.back')}</button>
        <!-- Atmosphere Glow -->
        <div style="position:absolute; inset:0; background:radial-gradient(circle at center, rgba(212,175,55,0.05) 0%, transparent 70%);"></div>
        <div id="er-particles-diff" style="position:absolute; inset:0; pointer-events:none; overflow:hidden;"></div>

        <div id="diff-title-wrap" style="text-align:center; position:relative; z-index:10; opacity:0; transform:translateY(20px); width:100%; max-width:100%; padding:0 24px; box-sizing:border-box;">
           <h1 style="font-family:'Cinzel', serif; font-size: clamp(1.4rem, 4vw, 2.2rem); font-weight:900; letter-spacing:6px; color:#ffd76a; margin:0; text-transform:uppercase; text-shadow:-1px -1px 0 #2a1a00, 1px -1px 0 #2a1a00, -1px 1px 0 #2a1a00, 1px 1px 0 #2a1a00, 0 3px 0 rgba(0,0,0,0.6), 0 0 22px rgba(212,175,55,0.4); line-height:1.2;">${t('board.destiny')}</h1>
           <div style="width:100%; height:1px; background:radial-gradient(circle, #d4af37 0%, transparent 100%); opacity:0.3; margin-top:15px;"></div>
        </div>

        <div style="display:flex; flex-direction:column; gap:0; width:100%; max-width:640px; position:relative; z-index:10; opacity:0; transform:translateY(30px);" id="difficulty-options">
          <div style="position:relative;">
            <button class="diff-btn facile" data-diff="easy" style="border:none; cursor:pointer; padding:34px 20px 34px 20px; display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center; font-family:'Cinzel',serif; color:#fff; background:linear-gradient(rgba(12,18,14,0.74), rgba(8,12,9,0.8)), url('/cards/Slime_explorador_deslizando_na_neve-18.png') center/cover; box-shadow:inset 0 3px 0 rgba(255,236,190,0.2), inset 0 -4px 0 rgba(0,0,0,0.55); clip-path:polygon(0 7%, 100% 0, 100% 93%, 0 100%);">
              <span style="color:#ffe9a8; font-size:1rem; letter-spacing:4px; font-weight:900; text-shadow:-1px -1px 0 #2a1a00, 1px -1px 0 #2a1a00, -1px 1px 0 #2a1a00, 1px 1px 0 #2a1a00, 0 3px 0 rgba(0,0,0,0.6);">${t('board.easy')}</span>
              <span style="color:rgba(255,255,255,0.6); font-size:0.66rem; letter-spacing:1px; font-style:italic;">${t('board.easyDesc')}</span>
              <div style="margin-top:6px; background:linear-gradient(180deg, #5a4128, #2a1c0d); border:2px solid #d4af37; border-radius:10px; padding:4px 20px; font-size:0.6rem; font-weight:950; letter-spacing:3px; text-indent:3px; color:#ffe9a8; text-shadow:0 1px 0 #000; box-shadow:0 3px 0 rgba(0,0,0,0.5);">${t('board.tierEasy')}</div>
            </button>
          </div>

          <div style="position:relative; margin-top:-20px;">
            <button class="diff-btn normal" data-diff="medium" style="border:none; cursor:pointer; padding:34px 20px 34px 20px; display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center; font-family:'Cinzel',serif; color:#fff; background:linear-gradient(rgba(16,14,8,0.74), rgba(10,8,5,0.8)), url('/cards/Slime_Zen_no_Santu_rio_Florestal.png') center/cover; box-shadow:inset 0 3px 0 rgba(255,236,190,0.2), inset 0 -4px 0 rgba(0,0,0,0.55); clip-path:polygon(0 7%, 100% 0, 100% 93%, 0 100%);">
              <span style="color:#ffe9a8; font-size:1rem; letter-spacing:4px; font-weight:900; text-shadow:-1px -1px 0 #2a1a00, 1px -1px 0 #2a1a00, -1px 1px 0 #2a1a00, 1px 1px 0 #2a1a00, 0 3px 0 rgba(0,0,0,0.6);">${t('board.mid')}</span>
              <span style="color:rgba(255,255,255,0.6); font-size:0.66rem; letter-spacing:1px; font-style:italic;">${t('board.midDesc')}</span>
              <div style="margin-top:6px; background:linear-gradient(180deg, #5a4128, #2a1c0d); border:2px solid #d4af37; border-radius:10px; padding:4px 20px; font-size:0.6rem; font-weight:950; letter-spacing:3px; text-indent:3px; color:#ffe9a8; text-shadow:0 1px 0 #000; box-shadow:0 3px 0 rgba(0,0,0,0.5);">${t('board.tierMid')}</div>
            </button>
          </div>

          <div style="position:relative; margin-top:-20px;">
            <button class="diff-btn hard" data-diff="hard" style="border:none; cursor:pointer; padding:34px 20px 34px 20px; display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center; font-family:'Cinzel',serif; color:#fff; background:linear-gradient(rgba(22,10,12,0.74), rgba(12,6,7,0.8)), url('/cards/Slime_de_Fogo_em_Investida_Explosiva.png') center/cover; box-shadow:inset 0 3px 0 rgba(255,236,190,0.2), inset 0 -4px 0 rgba(0,0,0,0.55); clip-path:polygon(0 7%, 100% 0, 100% 93%, 0 100%);">
              <span style="color:#ffe9a8; font-size:1rem; letter-spacing:4px; font-weight:900; text-shadow:-1px -1px 0 #2a1a00, 1px -1px 0 #2a1a00, -1px 1px 0 #2a1a00, 1px 1px 0 #2a1a00, 0 3px 0 rgba(0,0,0,0.6);">${t('board.hard')}</span>
              <span style="color:rgba(255,255,255,0.6); font-size:0.66rem; letter-spacing:1px; font-style:italic;">${t('board.hardDesc')}</span>
              <div style="margin-top:6px; background:linear-gradient(180deg, #5a4128, #2a1c0d); border:2px solid #d4af37; border-radius:10px; padding:4px 20px; font-size:0.6rem; font-weight:950; letter-spacing:3px; text-indent:3px; color:#ffe9a8; text-shadow:0 1px 0 #000; box-shadow:0 3px 0 rgba(0,0,0,0.5);">${t('board.tierHard')}</div>
            </button>
          </div>
        </div>

        <button id="btn-confirm-diff" style="opacity:0; pointer-events:none; transform:translateY(10px); margin-top:26px; position:relative; z-index:10; font-family:'Cinzel',serif; font-weight:950; font-size:0.85rem; letter-spacing:3px; color:#0f1f00; padding:14px 54px; border-radius:16px; border:3px solid #0e1f00; cursor:pointer; background:linear-gradient(180deg, #b8f54d 0%, #7ed321 38%, #4a9b1f 78%, #2c620d 100%); box-shadow:0 5px 0 rgba(0,0,0,0.5), 0 0 20px rgba(150,255,70,0.4), inset 0 2px 0 rgba(255,255,255,0.5);">✓ ${t('board.confirmGo')}</button>

        <style>
          .diff-btn { transition: transform 0.25s ease, filter 0.25s ease; }
          .diff-btn:hover { filter: brightness(1.14); transform: scale(1.02); }
          .diff-btn:active { transform: scale(0.97); }
          .diff-btn.selected { filter: brightness(1.12) drop-shadow(0 0 14px rgba(255,215,0,0.55)); transform: scale(1.02); }
        </style>
      </div>
    `;
  }

  public renderCoinFlipScreen(): string {
    return `
      <div class="startup-screen coinflip-phase" style="background:#050505; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:0 20px;">
        <div style="position:absolute; inset:0; background:radial-gradient(circle at center, rgba(212,175,55,0.03) 0%, transparent 60%);"></div>
        <div id="er-particles-coin" style="position:absolute; inset:0; pointer-events:none; overflow:hidden;"></div>
        
        <div id="coin-title" style="text-align:center; margin-bottom:44px; font-family:'Cinzel', serif; opacity:0; transform:translateY(-10px); width:100%; padding:0 24px; box-sizing:border-box;">
           <div style="font-size:0.65rem; letter-spacing:5px; text-indent:5px; color:#d4af37; margin-bottom:10px; text-transform:uppercase; font-weight:700;">${t('board.omen')}</div>
           <h2 style="font-size:clamp(1.2rem, 3.5vw, 1.7rem); color:#ffe9a8; font-weight:900; letter-spacing:4px; margin:0; line-height:1.25; text-shadow:-1px -1px 0 #2a1a00, 1px -1px 0 #2a1a00, -1px 1px 0 #2a1a00, 1px 1px 0 #2a1a00, 0 3px 0 rgba(0,0,0,0.6), 0 0 20px rgba(212,175,55,0.35);">${t('board.luck')}</h2>
           <div style="width:120px; height:2px; background:linear-gradient(90deg, transparent, #d4af37, transparent); margin:14px auto 0 auto; opacity:0.7;"></div>
        </div>

        <div class="coin-flip-container" style="position:relative; z-index:10; transform:scale(1.15);">
          <div id="coin" class="coin" style="width:196px; height:196px;">
            <div class="coin-face head" style="background-image:url('/cards/coin_slime.png'); background-size:cover; background-position:center; background-color:#3a2a10; border:6px solid #8a6a00; box-shadow:0 0 0 3px #0e0903, 0 0 0 6px #ffd700, 0 0 0 9px #0e0903, 0 20px 46px rgba(0,0,0,0.85), 0 0 38px rgba(255,215,0,0.4), inset 0 0 0 3px rgba(255,255,255,0.22), inset 0 -12px 24px rgba(0,0,0,0.45), inset 0 10px 20px rgba(255,255,255,0.16);"></div>
            <div class="coin-face tail" style="background-image:url('/cards/coin_slime_verso.png'); background-size:cover; background-position:center; background-color:#2a1c08; border:6px solid #6e4e06; box-shadow:0 0 0 3px #0e0903, 0 0 0 6px #b8860b, 0 0 0 9px #0e0903, 0 20px 46px rgba(0,0,0,0.85), inset 0 0 0 3px rgba(0,0,0,0.35), inset 0 -12px 24px rgba(0,0,0,0.55);"></div>
          </div>
        </div>

        <div id="coin-result-text" style="margin-top:70px; font-family:'Cinzel', serif; font-weight:900; font-size:1.2rem; letter-spacing:4px; color:rgba(255,233,168,0.4); text-transform:uppercase; transition:2s ease; opacity:0;">${t('board.drawing')}</div>
      </div>
    `;
  }

  // ─── CARD RENDERS ──────────────────────────────────────────────────────────

  /** Card on board: premium field version */
  public renderCard(c: Card): string {
    const isEnemy = c.owner === 'e';
    return renderFieldCardPremium(c, isEnemy);
  }

  /** Card in hand: premium hand version */
  public renderHandCard(c: Card): string {
    return renderHandCardPremium(c);
  }

  /** Card in carousel — premium version */
  public renderCarouselCard(c: Card): string {
    return renderFieldCardPremium(c, false);
  }

  public renderGraveCard(c: Card, count: number): string {
    return this.renderStackSlot('grave', count, c.image);
  }

  public renderStackSlot(id: string, count: number, imageUrl?: string, isDeck: boolean = false): string {
    const fillStyle = imageUrl 
      ? `background-image:url('${imageUrl}'); background-size:cover; background-position:center;` 
      : `background:rgba(30,30,30,0.4);`;
    const filter = !isDeck && imageUrl ? 'filter: saturate(0.8) brightness(0.8);' : '';
    
    return `
      <div class="${isDeck ? 'deck-back-slot' : 'sepulture-slot'}" id="${id}-slot">
        <div class="stack-fill" style="width:100%; height:100%; position:absolute; top:0; left:0; ${fillStyle} ${filter}"></div>
        <div class="stack-count" id="count-${id}">${count}</div>
      </div>
    `;
  }

  /** Full-screen preview HTML (used in main.ts) */
  public renderFullscreenCard(c: Card): string {
    const r = c.rarity ? RARITIES[c.rarity] : RARITIES.common;
    const ab = c.abilityId && c.abilityId !== 'none' ? CARD_ABILITIES.find(a => a.id === c.abilityId) : null;
    const statuses: string[] = [];
    if (c.isStunned) statuses.push(`<span style="color:#ffe066">⚡ ${t('board.fs.stun')}</span>`);
    if ((c.poisonTurns ?? 0) > 0) statuses.push(`<span style="color:#9b59b6">☠️ ${t('board.fs.poison')}</span>`);
    if (c.shieldActive) statuses.push(`<span style="color:#51c5ff">🛡️ ${t('board.fs.shield')}</span>`);

    // --- Style helpers ---
    const hexToRgba = (hex: string, alpha: number) => {
      let h = (hex || '#1a1a2e').replace('#', '');
      if (h.length === 3) h = h.split('').map(x => x + x).join('');
      const rr = parseInt(h.slice(0, 2), 16) || 0;
      const gg = parseInt(h.slice(2, 4), 16) || 0;
      const bb = parseInt(h.slice(4, 6), 16) || 0;
      return `rgba(${rr},${gg},${bb},${alpha})`;
    };

    const zoneBg = (zone?: { bg: string; bg2?: string; opacity: number; isGradient?: boolean; gradientAngle?: number }) => {
      if (!zone) return null;
      const alpha = zone.opacity ?? 0.85;
      if (zone.isGradient && zone.bg2) {
        const angle = zone.gradientAngle ?? 135;
        return `linear-gradient(${angle}deg, ${hexToRgba(zone.bg, alpha)}, ${hexToRgba(zone.bg2, alpha)})`;
      }
      return hexToRgba(zone.bg, alpha);
    };

    const nameBg   = zoneBg(c.nameStyle)    || 'rgba(0,0,0,0.6)';
    const descBg   = zoneBg(c.descStyle)    || 'rgba(0,0,0,0.6)';
    const abilityBg= zoneBg(c.abilityStyle) || 'rgba(0,0,0,0.85)';
    const statsBg  = zoneBg(c.statsStyle)   || 'transparent';

    const fontFamily = c.fontFamily ? `font-family:'${c.fontFamily}',Outfit,sans-serif;` : "font-family:'Outfit',sans-serif;";
    const fontColor  = c.fontColor || '#ffffff';
    const fSize      = c.fontSizeBase || 100;

    const bw    = c.borderWidth ?? 0;
    const bcol  = c.borderColor || 'transparent';
    const glow  = c.glowIntensity ?? 0;
    const gcol  = c.glowColor || bcol;
    const brad  = c.borderRadius ?? 24;
    const borderStyle = bw > 0 ? `border:${bw}px solid ${bcol};` : '';
    const glowStyle   = glow > 0 ? `box-shadow:0 0 ${glow}px ${gcol}, 0 0 ${glow * 2}px ${gcol}44;` : '';
    const glowClass   = (c.glowAnimated && glow > 0) ? 'card-glow-animated' : '';
    
    // Stats Row Helper (R | ATK | PVP)
    const renderStatsRow = () => `
      <div style="display:flex; align-items:center; gap:8px; width:100%; box-sizing:border-box; background:${statsBg};">
        <div style="width:32px; height:32px; background:rgba(0,0,0,0.6); border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid ${r.color}; flex-shrink:0;">
          <span style="font-size:1rem;">${r.icon}</span>
        </div>
        <div style="flex:1; background:#c0392b; border-radius:30px; height:34px; display:flex; align-items:center; justify-content:center; font-weight:900; gap:6px; box-shadow:0 4px 10px rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1);">
          <span style="font-size:0.8rem; opacity:0.8;">⚔️</span>
          <span style="font-size:1rem; letter-spacing:1px; color:#fff;">${c.atk}</span>
        </div>
        <div style="flex:1; background:#27ae60; border-radius:30px; height:34px; display:flex; align-items:center; justify-content:center; font-weight:900; gap:6px; box-shadow:0 4px 10px rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1);">
          <span style="font-size:0.8rem; opacity:0.8;">❤️</span>
          <span style="font-size:1rem; letter-spacing:1px; color:#fff;">${c.pv}</span>
        </div>
      </div>
    `;

    // ── IMAGE FILTERS & BLENDS ────────────────
    let filterClass = '';
    let filterStyle = '';
    if (c.imageFilter && c.imageFilter !== 'none') {
        if (['vhs', 'chroma', 'wave', 'pulse_hue'].includes(c.imageFilter)) {
            filterClass = `fx-${c.imageFilter}`;
            // pass custom param
            filterStyle = `--flt-v: ${c.imageFilterIntensity || 50}px;`; 
        } else {
            filterStyle = `filter: ${c.imageFilter}(${c.imageFilterIntensity || 100}%);`;
        }
    }

    // ── Attack Cost Icons Builder (Top Right Stack) ──────────────────────────
    const renderAttackCosts = (isImmersive: boolean) => {
      const w = isImmersive ? 45 : 34;
      const fs = isImmersive ? '1.4rem' : '1.2rem';
      const gap = isImmersive ? 8 : 6;
      let html = `<div style="position:absolute; top:12px; right:12px; z-index:20; display:flex; flex-direction:column; gap:${gap}px; align-items:center;">`;
      
      if (c.attacks && c.attacks.length > 0) {
        c.attacks.forEach(atk => {
          const bg = atk.costType === 'mana' ? '#51c5ff' : '#ffd700';
          const shadow = atk.costType === 'mana' ? 'rgba(81,197,255,0.4)' : 'rgba(255,215,0,0.4)';
          html += `<div style="background:${bg}; color:#000; font-size:${fs}; width:${w}px; height:${w}px; border-radius:50%; font-weight:950; border:2.5px solid rgba(255,255,255,0.4); box-shadow:0 0 20px ${shadow}; display:flex; align-items:center; justify-content:center;">${atk.cost}</div>`;
        });
      } else {
        html += `<div style="background:#ffd700; color:#000; font-size:${fs}; width:${w}px; height:${w}px; border-radius:50%; font-weight:950; border:2.5px solid rgba(255,255,255,0.4); box-shadow:0 0 20px rgba(255,215,0,0.4); display:flex; align-items:center; justify-content:center;">${c.staminaCost || 1}</div>`;
      }
      return html + `</div>`;
    };

    // ── IMMERSIVE mode (Cinematic Theater View) ────────────────
    if (c.immersiveMode) {
      return `
      <style>
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 ${glow}px ${gcol};} 50%{box-shadow:0 0 ${glow * 2}px ${gcol};} }
        .card-glow-animated { animation: glowPulse 2s infinite; }
        .immersive-card-wrap {
            width: 380px;
            height: 600px;
            position: relative;
            background: #000;
            border-radius: ${brad}px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 30px 60px rgba(0,0,0,0.8);
            border: ${bw}px solid ${bcol};
        }
      </style>
      <div class="immersive-card-wrap ${glowClass}" style="${glowStyle} color:${fontColor}; font-size:${fSize}%; ${fontFamily}">
        
        <!-- background ART -->
        <div class="${filterClass}" style="position:absolute; inset:0; background-image:url('${c.image}'); background-size:cover; background-position:center; z-index:0; ${filterStyle || 'filter: contrast(1.1) brightness(0.9);'}"></div>
        
        <!-- PARTICLE LAYER -->
        <div class="card-particle-layer" id="card-particles-theater" style="position:absolute; inset:0; pointer-events:none; z-index:9; overflow:hidden;"></div>
        
        <!-- PARALLAX LAYERS -->
        ${(c.parallaxLayers || []).sort((a, b) => a.z - b.z).map(pl => {
          let layerFilterClass = '';
          let layerFilterStyle = '';
          if (pl.imageFilter && pl.imageFilter !== 'none') {
            if (['vhs', 'chroma', 'wave', 'pulse_hue'].includes(pl.imageFilter)) {
              layerFilterClass = `fx-${pl.imageFilter}`;
              layerFilterStyle = `--flt-v: ${pl.imageFilterIntensity || 50}px;`;
            } else {
              layerFilterStyle = `filter: ${pl.imageFilter}(${pl.imageFilterIntensity || 100}%);`;
            }
          }
          return `
            <div class="parallax-layer-item ${layerFilterClass}" data-layer-id="${pl.id}" style="position:absolute; inset:0; background-image:url('${pl.url}'); background-size:cover; background-position:center; z-index:${pl.z}; opacity:${pl.opacity ?? 1}; mix-blend-mode:${pl.blendMode || 'normal'}; transform: scale(${pl.scale || 1}) translate(${pl.initialX || 0}px, ${pl.initialY || 0}px); pointer-events:none; ${layerFilterStyle}"></div>
          `;
        }).join('')}

        ${c.patternOverlay ? `<div style="position:absolute;inset:0;background-image:${c.patternOverlay};pointer-events:none;z-index:10;"></div>` : ''}
        ${c.animationUrl ? `<video src="${c.animationUrl}#t=${c.videoStart || 0}" autoplay loop playsinline class="${filterClass}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:8; ${filterStyle}"></video>` : ''}


        <!-- Corner Resources (Immersive) -->
        <div style="position:absolute; top:12px; left:12px; z-index:20; background:#51c5ff; color:#000; font-size:1.4rem; width:45px; height:45px; border-radius:50%; font-weight:950; border:2.5px solid rgba(255,255,255,0.4); box-shadow:0 0 20px rgba(81,197,255,0.4); display:flex; align-items:center; justify-content:center;" title="${t('board.summonCost')}">${c.manaCost || 1}</div>
        ${renderAttackCosts(true)}

        <!-- 1. NAME BOX (Glassmorphism Pill) -->
        <div style="position:absolute; top:20px; left:20px; right:20px; z-index:10; display:flex; justify-content:center; pointer-events:none;">
          <div style="background:rgba(0,0,0,0.4); backdrop-filter:blur(20px); width:60%; border-radius:50px; padding:12px; font-weight:950; letter-spacing:3px; font-size:1.1rem; border:1px solid rgba(255,255,255,0.1); text-align:center; box-shadow:0 10px 40px rgba(0,0,0,0.6);">
            ${c.name.toUpperCase()}
          </div>
        </div>

        <!-- 2. METADATA GROUP (Bottom) -->
        <div style="position:absolute; bottom:20px; left:20px; right:20px; z-index:10; display:flex; flex-direction:column; gap:12px;">
          
          <!-- Wrapper for Desc & Ability -->
          <div style="background:rgba(0,0,0,0.5); backdrop-filter:blur(20px); border-radius:12px; padding:20px; border:1px solid rgba(255,255,255,0.08); display:flex; flex-direction:column; gap:15px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
            <div style="font-size:0.95rem; line-height:1.5; text-align:center; font-weight:700; opacity:0.9;">
              ${c.flavorText || (ab ? ab.description : '')}
            </div>
            
            ${ab ? `<div style="background:#fff; border-radius:50px; padding:10px 20px; font-size:0.8rem; font-weight:950; color:#000; align-self:center; display:flex; align-items:center; gap:8px;">
              <span>${ab.icon}</span> <span>${ab.name.toUpperCase()}</span>
            </div>` : ''}
          </div>

          <!-- 3. STATS ROW -->
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:42px; height:42px; background:rgba(0,0,0,0.8); border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid ${r.color}; flex-shrink:0; box-shadow:0 10px 20px rgba(0,0,0,0.5);">
              <span style="font-size:1.2rem;">${r.icon}</span>
            </div>
            <div style="flex:1; background:rgba(255,255,255,1); border-radius:8px; height:42px; display:flex; align-items:center; justify-content:center; font-weight:950; gap:8px; border:1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
              <span style="font-size:0.9rem; color:#000; opacity:0.3;">⚔️</span>
              <span style="font-size:1.2rem; color:#000;">${c.atk}</span>
            </div>
            <div style="flex:1; background:rgba(255,255,255,1); border-radius:8px; height:42px; display:flex; align-items:center; justify-content:center; font-weight:950; gap:8px; border:1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
              <span style="font-size:0.9rem; color:#000; opacity:0.3;">❤️</span>
              <span style="font-size:1.2rem; color:#000;">${c.pv}</span>
            </div>
          </div>
        </div>

        ${statuses.length ? `<div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.8); font-size:0.6rem; padding:4px; display:flex; justify-content:center; gap:10px; font-weight:950; letter-spacing:1px;">${statuses.join(' • ')}</div>` : ''}
      </div>`;
    }

    // ── OFFSET mode (Image 3 - Left diagram) ────────────────────────
    return `
      <div class="fullscreen-card flat ${glowClass}" style="color:${fontColor}; font-size:${fSize}%; ${fontFamily} display:flex; flex-direction:column; width:100%; align-items:stretch;">
        
        <!-- Bloco 1: Imagem (Standalone) -->
        <div style="width:100%; aspect-ratio:2/3; position:relative; border-radius:${brad}px; overflow:hidden; ${borderStyle} ${glowStyle} box-shadow:0 12px 40px rgba(0,0,0,0.8);">
          <div class="${filterClass}" style="position:absolute;inset:0;background-image:url('${c.image}');background-size:cover;background-position:center; ${filterStyle}"></div>
          
          <!-- PARALLAX LAYERS (Flat) -->
          ${(c.parallaxLayers || []).sort((a,b) => a.z - b.z).map(pl => `
            <div class="parallax-layer-item ${filterClass}" data-layer-id="${pl.id}" style="position:absolute; inset:0; background-image:url('${pl.url}'); background-size:cover; background-position:center; z-index:${pl.z}; opacity:${pl.opacity ?? 1}; mix-blend-mode:${pl.blendMode || 'normal'}; transform: scale(${pl.scale || 1}) translate(${pl.initialX || 0}px, ${pl.initialY || 0}px); pointer-events:none; ${filterStyle}"></div>
          `).join('')}

          ${c.patternOverlay ? `<div style="position:absolute;inset:0;background-image:${c.patternOverlay};pointer-events:none;z-index:10;"></div>` : ''}
          ${c.animationUrl ? `<video src="${c.animationUrl}#t=${c.videoStart || 0}" autoplay loop class="${filterClass}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:8; ${filterStyle}"></video>` : ''}
          
          <!-- PARTICLE LAYER (Offset) -->
          <div class="card-particle-layer" id="card-particles-offset" style="position:absolute; inset:0; pointer-events:none; z-index:11; overflow:hidden;"></div>
          
          <!-- Corner Resources (Offset) -->
          <div style="position:absolute; top:10px; left:10px; z-index:10; background:#51c5ff; color:#000; font-size:1.2rem; width:34px; height:34px; border-radius:50%; font-weight:950; border:1.5px solid rgba(255,255,255,0.3); box-shadow:0 4px 15px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center;" title="${t('board.summonCost')}">${c.manaCost || 1}</div>
          ${renderAttackCosts(false)}
        </div>

        <div style="display:flex; justify-content:center; align-items:center; margin-top:14px; position:relative; z-index:3; width:100%;">
          <div style="background:${nameBg}; border-radius:30px; padding:7px 30px; font-weight:900; letter-spacing:1px; border:1px solid rgba(255,255,255,0.1); box-shadow:0 4px 15px rgba(0,0,0,0.3);">${c.name.toUpperCase()}</div>
        </div>

        <!-- Bloco 3: Caixa de Descrição -->
        <div style="background:${descBg}; border-radius:15px; margin-top:10px; padding:16px; display:flex; flex-direction:column; gap:10px; border:1px solid rgba(255,255,255,0.05);">
          <div style="font-size:0.9rem; font-weight:700; line-height:1.5; text-align:center;">
            ${c.flavorText || (ab ? ab.description : '—')}
          </div>
          <!-- Habilidade (Dentro da caixa de descrição) -->
          ${ab ? `<div style="background:${abilityBg}; border-radius:8px; padding:8px 14px; font-size:0.8rem; font-weight:900; color:${ab.color}; border:1px solid rgba(255,255,255,0.08); align-self:center;">
            ${ab.icon} ${ab.name}
          </div>` : ''}
        </div>

        <!-- Bloco 4: Linha de Stats (Base final) -->
        <div style="margin-top:12px;">
          ${renderStatsRow()}
        </div>

        ${statuses.length ? `<div style="text-align:center; font-size:0.7rem; opacity:0.5; margin-top:8px;">${statuses.join(' · ')}</div>` : ''}
      </div>`;
  }

  // ─── SKILL SLOTS ───────────────────────────────────────────────────────────

  public renderSkillSlots(skills: (Skill | null)[]): void {
    skills.forEach((s, i) => {
      const slot = document.querySelector(`[data-skill-idx="${i}"]`) as HTMLElement;
      if (!slot) return;
      if (s) {
        if (s.image) {
          slot.innerHTML = '';
          slot.style.backgroundImage = `url('${s.image}')`;
          slot.style.backgroundSize = 'cover';
          slot.style.backgroundPosition = 'center';
        } else {
          slot.innerHTML = `<span class="art-icon">${s.icon}</span>`;
          slot.style.backgroundImage = 'none';
        }
        slot.classList.remove('art-empty');
        slot.title = `${s.name} (${s.group})`;
      } else {
        slot.innerHTML = '?'; slot.classList.add('art-empty'); slot.title = t('board.empty');
        slot.style.backgroundImage = 'none';
      }
    });
  }

  public renderSideCapsules(owner: 'p' | 'e', board: (Card | null)[]): string {
    const statuses: { label: string; icon: string; timer?: number; isBuff: boolean }[] = [];
    
    board.forEach(card => {
      if (!card || card.owner !== owner) return;
      
      const n = card.name.split(' ')[0].substring(0, 8); // Short name
      
      if (card.isStunned && card.stunTurns) statuses.push({ label: `${n} ${t('board.st.stun')}`, icon: '⚡', timer: card.stunTurns, isBuff: false });
      if (card.poisonTurns && card.poisonTurns > 0) statuses.push({ label: `${n} ${t('board.st.poison')}`, icon: '☠️', timer: card.poisonTurns, isBuff: false });
      if (card.shieldActive) statuses.push({ label: `${n} ${t('board.st.shield')}`, icon: '🛡️', isBuff: true });
      if (card.burnTurns && card.burnTurns > 0) statuses.push({ label: `${n} ${t('board.st.burn')}`, icon: '🔥', timer: card.burnTurns, isBuff: false });
      if (card.regenTurns && card.regenTurns > 0) statuses.push({ label: `${n} ${t('board.st.regen')}`, icon: '💚', timer: card.regenTurns, isBuff: true });
      if (card.isCamouflaged) statuses.push({ label: `${n} ${t('board.st.camo')}`, icon: '👻', timer: card.camoTurns, isBuff: true });
      if (card.doubleAttack) statuses.push({ label: `${n} ${t('board.st.double')}`, icon: '⚔️', timer: card.doubleAttackTurns, isBuff: true });
      if (card.isExposed) statuses.push({ label: `${n} ${t('board.st.exposed')}`, icon: '👁️', timer: card.exposeTurns, isBuff: false });
      if (card.vampirismActive) statuses.push({ label: `${n} ${t('board.st.vamp')}`, icon: '🧛', isBuff: true });
    });

    if (statuses.length === 0) return '';

    return statuses.map(s => `
      <div class="side-capsule ${s.isBuff ? 'buff' : 'debuff'}">
        <div class="side-capsule-icon">${s.icon}</div>
        <div class="side-capsule-label">${s.label.toUpperCase()}</div>
        ${s.timer !== undefined ? `<div class="side-capsule-timer">${s.timer}</div>` : ''}
      </div>
    `).join('');
  }

  public updateAttributeBars(engine: { hp: any, mana: any, stamina: any, maxMana: number, maxStamina: number }): void {
    const hp = engine.hp;
    const barP = document.getElementById('bar-p') as HTMLElement;
    const barE = document.getElementById('bar-e') as HTMLElement;
    const hpP = document.getElementById('hp-p');
    const hpE = document.getElementById('hp-e');
    if (barP) barP.style.width = `${Math.max(0, (hp.p / 1500) * 100)}%`;
    if (barE) barE.style.width = `${Math.max(0, (hp.e / 1500) * 100)}%`;
    if (hpP) hpP.textContent = `${hp.p} ${t('board.pv')}`;
    if (hpE) hpE.textContent = `${hp.e} ${t('board.pv')}`;

    const manaFill = document.getElementById('segments-mana-fill') as HTMLElement | null;
    if (manaFill) manaFill.style.width = `${Math.max(0, Math.min(1, engine.mana.p / (engine.maxMana || 9))) * 100}%`;
    const stamFill = document.getElementById('segments-stam-fill') as HTMLElement | null;
    if (stamFill) stamFill.style.width = `${Math.max(0, Math.min(1, engine.stamina.p / (engine.maxStamina || 9))) * 100}%`;
  }



}
