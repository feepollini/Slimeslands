import { Card } from '../../core/GameEngine';
import { getGlobalCardBack } from '../../core/constants';
import { BossBoardScreen } from '../screens/BossBoardScreen';
import { Mobby } from '../../core/MobbyManager';
import { renderMatrixCardBackSVG } from '../screens/forge_v2/utils/HestridiaMatrixRenderer';
import { t } from '../../core/i18n';

/**
 * BossBoardScreenLandscape — Cópia adaptada do Tabuleiro de Boss (3x1) para Modo Paisagem.
 * Segue o mesmo layout tático: Mão/Status no topo, Foco total na Arena Central (Boss 3x1 + 3 slots do jogador),
 * e Doca Inferior com Cemitério, Estamina/Mana, Mão no Centro, Artefatos e Deck de Mesa.
 */
export type BossLandscapeDeviceState = 'mobile-landscape' | 'tablet-landscape' | 'desktop-landscape';

export class BossBoardScreenLandscape extends BossBoardScreen {
  private enemyHandCount = 3;
  private deviceState: BossLandscapeDeviceState = 'desktop-landscape';

  public setEnemyHandCount(count: number) {
    this.enemyHandCount = Math.max(0, count);
  }

  public setDeviceState(state: BossLandscapeDeviceState) {
    this.deviceState = state;
  }

  public getDeviceState(): BossLandscapeDeviceState {
    return this.deviceState;
  }

  private renderEnemyHandTop(count: number): string {
    const visibleCards = Math.min(count, 7);
    const isCompact = this.deviceState === 'mobile-landscape' || (typeof window !== 'undefined' && (window.innerHeight <= 540 || window.innerWidth <= 920));
    const stepX = isCompact ? 15 : this.deviceState === 'tablet-landscape' ? 20 : 24;
    const stepY = isCompact ? 2.5 : 3.5;
    const cardsHtml = Array.from({ length: visibleCards })
      .map((_, i) => {
        const center = (visibleCards - 1) / 2;
        const offset = i - center;
        const rot = offset * -5.5;
        const tx = offset * stepX;
        const ty = Math.abs(offset) * stepY;
        return `
          <div class="ls-enemy-hand-card" style="transform: translateX(${tx}px) translateY(${ty}px) rotate(${rot}deg); z-index:${10 + i};">
            ${renderMatrixCardBackSVG()}
          </div>
        `;
      })
      .join('');

    return `
      <div class="ls-enemy-hand-widget ${count === 0 ? 'is-empty' : ''}" id="enemy-hand-ls" title="Cartas do Chefe: ${count}">
        ${count > 0 ? `<div class="ls-enemy-hand-fan">${cardsHtml}</div>` : ''}
        <div class="ls-enemy-hand-badge">
          <span>🎴</span>
          <span id="enemy-hand-count-val">${count}</span>
        </div>
      </div>
    `;
  }

  public override render(
    board: (Card | null)[],
    hp: { p: number; e: number },
    mana: { p: number; e: number },
    stamina: { p: number; e: number },
    turn: string,
    timer: number,
    grave: Card[],
    deckCount: number,
    mobby?: Mobby
  ): string {
    const m = mobby || { name: 'Mobby', maxHp: 280, image: '/mobby.png' };
    const topGraveCard = grave.length > 0 ? grave[grave.length - 1] : null;
    const pPercent = Math.max(0, Math.min(100, (hp.p / 1500) * 100));
    const bossPct = Math.max(0, Math.min(100, (hp.e / (m.maxHp || 280)) * 100));

    // Multiplicador de escala do Boss em Modo Paisagem de acordo com a variável de estado do dispositivo
    const deviceScaleMult =
      this.deviceState === 'mobile-landscape'
        ? 0.95
        : this.deviceState === 'tablet-landscape'
        ? 1.1
        : 1.22;
    const effectiveScale = ((m.scale || 100) / 100) * deviceScaleMult;
    const effectiveOffsetY = Math.round((m.offsetY || 0) * deviceScaleMult);
    const effectiveOffsetX = Math.round((m.offsetX || 0) * deviceScaleMult);

    return `
      <div class="battle-screen boss-battle-screen battle-landscape-screen" data-boss-device-state="${this.deviceState}">

        <!-- BARRA SUPERIOR PANORÂMICA: HUD JOGADOR + AÇÕES (ESQ) | VAZIO NO CENTRO | HUD DO CHEFE + RENDER-SE (DIR) -->
        <header class="battle-ls-top-bar">
          <div class="battle-ls-hp-side player-side">
            <div class="battle-ls-hud-pod player-pod">
              <div class="player-icon player">
                <div class="player-icon-inner"></div>
              </div>
              <div class="header-bars">
                <div class="header-name-text player">
                  <span class="name-label">${t('board.you')}</span>
                </div>
                <div class="pv-bar-container hifi-pv">
                  <div class="pv-bar-fill player" id="hp-bar-p" style="width:${pPercent}%"></div>
                  <div class="pv-label-inner" id="hp-val-p">${hp.p} ${t('board.pv')}</div>
                </div>
              </div>
            </div>

            <div class="action-hud-pill ls-action-pill" id="action-hud">
              <span class="action-hud-title">${t('board.actions')}</span>
              <span class="action-hud-count" id="actions-count">1</span>
            </div>
          </div>

          <div class="battle-ls-top-center"></div>

          <div class="battle-ls-hp-side enemy-side">
            <div class="battle-ls-hud-pod enemy-pod">
              <div class="header-bars">
                <div class="header-name-text enemy">
                  <span class="name-label">👑 ${m.name}</span>
                </div>
                <div class="pv-bar-container hifi-pv">
                  <div class="pv-bar-fill enemy" id="hp-bar-e" style="width:${bossPct}%"></div>
                  <div class="pv-label-inner" id="hp-val-e">${hp.e} / ${m.maxHp} ${t('board.pv')}</div>
                </div>
              </div>
              <div class="player-icon enemy boss-avatar-medallion" style="background-image: url('${m.image}'); background-size: cover;">
                <div class="player-icon-inner"></div>
              </div>
            </div>

            <button class="btn-surrender ls-surrender-btn" id="btn-surrender" title="${t('board.surrender')}">
              <span class="icon-wrap">🏳️</span>
            </button>
          </div>
        </header>

        <!-- PALCO CENTRAL: BOSS GRANDE LIVRE ACIMA DOS 3 SLOTS DO JOGADOR (SEM CONTAINER GRANDE AO REDOR) -->
        <main class="battle-ls-board-stage">
          <section class="board-area boss-board-area">
            <div class="capsules-container enemy-capsules">
              ${this.renderSideCapsules('e', board)}
            </div>

            <div class="boss-board-grid" id="board">
              <div class="boss-single-slot-wrap" id="boss-sprite-slot" title="Clique para atacar o Chefe!">
                <div class="boss-aura-fx"></div>
                <div id="boss-sprite-transform-wrap" data-base-scale="${m.scale || 100}" data-device-mult="${deviceScaleMult}" style="
                  transform: translate(${effectiveOffsetX}px, ${effectiveOffsetY}px) rotate(${m.rotation || 0}deg) scale(${effectiveScale});
                  display: inline-flex; align-items: center; justify-content: center; transform-origin: bottom center;
                  pointer-events: auto;
                ">
                  <img id="mobby-sprite" class="boss-jelly-asset" src="${m.image}" alt="${m.name}" />
                </div>
              </div>

              <div class="boss-player-row">
                ${[3, 4, 5]
                  .map(
                    (i) => `
                  <div class="slot slot-p" data-idx="${i}">
                    ${board[i] ? this.renderCard(board[i]!) : ''}
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>

            <div class="capsules-container player-capsules">
              ${this.renderSideCapsules('p', board)}
            </div>
          </section>
        </main>

        <!-- BARRA FLUTUANTE DE AÇÕES RÁPIDAS (DESLIZA A DOCA INFERIOR PARA BAIXO QUANDO ATIVA) -->
        <div class="battle-ls-quick-actions-host" id="management-hifi">
          <div class="management-slide default-slide" id="management-default-slide" style="display:none;"></div>
          <div class="management-slide actions-slide" id="management-actions-slide">
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

            <div id="inline-skill-bar" class="inline-action-bar">
              <div class="actions-panel-content skill-content">
                <button class="inline-btn-capsule atk" id="skill-confirm">✨ ${t('board.useNow')}</button>
                <button class="inline-btn-capsule can" id="skill-cancel">✕</button>
              </div>
            </div>
          </div>
        </div>

        <!-- DOCA TÁTICA INFERIOR E BORDAS LATERAIS EMPILHADAS -->
        <footer class="battle-ls-bottom-dock">
          <div class="battle-ls-side-stack left-stack">
            <div class="battle-ls-dock-corner left-grave">
              ${this.renderStackSlot('grave', grave.length, topGraveCard?.image)}
              <span class="battle-ls-pile-label">CEMITÉRIO</span>
            </div>

            <div class="battle-ls-dock-wing left-resources">
              <div class="battle-ls-res-row">
                <div class="battle-ls-res-header">
                  <span class="res-title mana-txt">💧 MANA</span>
                  <span class="res-val mana-txt">${mana.p}/9</span>
                </div>
                <div class="attr-bar-box mana">
                  <div class="attr-bar-segmented" id="segments-mana-p">
                    ${Array.from({ length: 9 })
                      .map((_, i) => `<div class="attr-segment mana ${i < mana.p ? 'active' : ''}"></div>`)
                      .join('')}
                  </div>
                </div>
              </div>

              <div class="battle-ls-res-row">
                <div class="battle-ls-res-header">
                  <span class="res-title stam-txt">⚡ ESTAMINA</span>
                  <span class="res-val stam-txt">${stamina.p}/9</span>
                </div>
                <div class="attr-bar-box stamina">
                  <div class="attr-bar-segmented" id="segments-stam-p">
                    ${Array.from({ length: 9 })
                      .map((_, i) => `<div class="attr-segment stamina ${i < stamina.p ? 'active' : ''}"></div>`)
                      .join('')}
                  </div>
                </div>
              </div>

              <button class="attack-prompt-handle ls-inline-atk ${turn !== 'p' ? 'hidden' : ''}" id="btn-attack-prompt" title="${t('board.attack')}">
                <span class="handle-icon">⚔️</span>
                <span class="handle-text">${t('board.attack')}</span>
              </button>
            </div>
          </div>

          <div class="battle-ls-hand-center">
            <div class="hand-area-hifi">
              <div id="hand" class="hand-cards-row"></div>
            </div>
          </div>

          <div class="battle-ls-side-stack right-stack">
            <div class="battle-ls-dock-corner right-deck">
              ${this.renderStackSlot('deck', deckCount, getGlobalCardBack(), true)}
              <span class="battle-ls-pile-label">DECK</span>
            </div>

            <div class="battle-ls-dock-wing right-artifacts" id="center-controls-root">
              <div class="battle-ls-art-label">✨ ARTEFATOS</div>
              <div class="skills-row" id="skills-row">
                <div class="art-slot art-empty" data-skill-idx="0">?</div>
                <div class="art-slot art-empty" data-skill-idx="1">?</div>
                <div class="art-slot art-empty" data-skill-idx="2">?</div>
              </div>

              <div class="turn-capsule-wrapper">
                <button class="turn-capsule-btn ${turn !== 'p' ? 'disabled' : ''}" id="btn-end" ${turn !== 'p' ? 'disabled' : ''}>
                  <span class="turn-timer-text" id="timer-text">${timer}</span>
                  <span class="turn-label-text" id="btn-end-label">${turn !== 'p' ? t('board.wait') : t('board.end')}</span>
                </button>

                <div id="mini-end-confirm" class="mini-end-confirm">
                  <button class="mini-circle-btn yes" id="btn-end-yes" title="Confirmar">✔</button>
                  <button class="mini-circle-btn no" id="btn-end-no" title="Cancelar">✖</button>
                </div>
              </div>
            </div>
          </div>
        </footer>

        <div id="banner" class="banner-message"></div>
        <div id="particle-container"></div>
        <div id="float-container" style="position:fixed;inset:0;pointer-events:none;z-index:9000"></div>

        <div id="battle-overlays">
          <div class="overlay" id="overlay-fullscreen" style="background:rgba(0,0,0,0.96)">
            <div class="fullscreen-card-wrap" id="fullscreen-card-inner"></div>
          </div>
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

      </div>
    `;
  }

  public override updateAttributeBars(engine: { hp: any; mana: any; stamina: any; maxMana?: number; maxStamina?: number }): void {
    super.updateAttributeBars(engine);
    const hp = engine.hp;
    const barP = document.getElementById('hp-bar-p') as HTMLElement | null;
    const barE = document.getElementById('hp-bar-e') as HTMLElement | null;
    const hpP = document.getElementById('hp-val-p');
    const hpE = document.getElementById('hp-val-e');
    if (barP) barP.style.width = `${Math.max(0, Math.min(100, (hp.p / 1500) * 100))}%`;
    if (barE) barE.style.width = `${Math.max(0, Math.min(100, (hp.e / 1500) * 100))}%`;
    if (hpP) hpP.textContent = `${hp.p} ${t('board.pv')}`;
    if (hpE) hpE.textContent = `${hp.e} ${t('board.pv')}`;
  }
}
