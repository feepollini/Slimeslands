import { Card } from '../../core/GameEngine';
import { getGlobalCardBack } from '../../core/constants';
import { BoardScreen } from '../screens/BoardScreen';
import { renderMatrixCardBackSVG } from '../screens/forge_v2/utils/HestridiaMatrixRenderer';
import { t } from '../../core/i18n';

/**
 * BoardScreenLandscape — Cópia adaptada do Tabuleiro de Batalha para Modo Paisagem (Landscape / Web Widescreen).
 * Layout conforme solicitado:
 * - Topo: Barras de PV + Deck de Mão do Oponente exibido acima mostrando o verso e a quantidade de cartas.
 * - Centro: Foco amplo e desimpedido no Tabuleiro 3x2.
 * - Base (De Lado a Lado):
 *   [ Cemitério ] — [ Estamina & Mana ] — [ Deck de Mão do Jogador no Centro ] — [ 3 Artefatos & Turno ] — [ Deck de Mesa ]
 */
export class BoardScreenLandscape extends BoardScreen {
  private enemyHandCount = 3;

  public setEnemyHandCount(count: number) {
    this.enemyHandCount = Math.max(0, count);
  }

  private renderEnemyHandTop(count: number): string {
    const visibleCards = Math.min(count, 7);
    const isCompact = typeof window !== 'undefined' && (window.innerHeight <= 540 || window.innerWidth <= 920);
    const stepX = isCompact ? 15 : 24;
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
      <div class="ls-enemy-hand-widget ${count === 0 ? 'is-empty' : ''}" id="enemy-hand-ls" title="Cartas na mão do oponente: ${count}">
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
    deckCount: number
  ): string {
    const topGraveCard = grave.length > 0 ? grave[grave.length - 1] : null;
    const pPercent = Math.max(0, Math.min(100, (hp.p / 1500) * 100));
    const ePercent = Math.max(0, Math.min(100, (hp.e / 1500) * 100));

    return `
      <div class="battle-screen battle-landscape-screen">

        <!-- BARRA SUPERIOR PANORÂMICA: HUD JOGADOR + AÇÕES (ESQ) | MÃO DO OPONENTE (CENTRO) | HUD OPONENTE + RENDER-SE (DIR) -->
        <header class="battle-ls-top-bar">
          <!-- LADO ESQUERDO: JOGADOR + PÍLULA DE AÇÕES -->
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

          <!-- CENTRO SUPERIOR: LEQUE DE MÃO DO OPONENTE -->
          <div class="battle-ls-top-center">
            ${this.renderEnemyHandTop(this.enemyHandCount)}
          </div>

          <!-- LADO DIREITO: ARTEFATOS INIMIGOS + OPONENTE + RENDER-SE -->
          <div class="battle-ls-hp-side enemy-side">
            <div class="enemy-arts-row ls-enemy-arts" id="enemy-arts">
              <div class="enemy-art">❔</div>
              <div class="enemy-art">❔</div>
              <div class="enemy-art">❔</div>
            </div>

            <div class="battle-ls-hud-pod enemy-pod">
              <div class="header-bars">
                <div class="header-name-text enemy">
                  <span class="name-label">${t('board.opponent')}</span>
                </div>
                <div class="pv-bar-container hifi-pv">
                  <div class="pv-bar-fill enemy" id="hp-bar-e" style="width:${ePercent}%"></div>
                  <div class="pv-label-inner" id="hp-val-e">${hp.e} ${t('board.pv')}</div>
                </div>
              </div>
              <div class="player-icon enemy">
                <div class="player-icon-inner"></div>
              </div>
            </div>

            <button class="btn-surrender ls-surrender-btn" id="btn-surrender" title="${t('board.surrender')}">
              <span class="icon-wrap">🏳️</span>
            </button>
          </div>
        </header>

        <!-- PALCO CENTRAL: FOCO TOTAL NO TABULEIRO 3x2 -->
        <main class="battle-ls-board-stage">
          <section class="board-area">
            <div class="capsules-container enemy-capsules">
              ${this.renderSideCapsules('e', board)}
            </div>

            <div class="board-grid-hifi" id="board">
              ${board
                .map(
                  (card, i) => `
                <div class="slot ${i < 3 ? 'slot-e' : 'slot-p'}" data-idx="${i}">
                  ${card ? this.renderCard(card) : ''}
                </div>
              `
                )
                .join('')}
            </div>

            <div class="capsules-container player-capsules">
              ${this.renderSideCapsules('p', board)}
            </div>
          </section>
        </main>

        <!-- MODAL DE ATAQUES E AÇÕES RÁPIDAS (QUANDO ATIVO, A DOCA INFERIOR DESLIZA PARA BAIXO DANDO ESPAÇO) -->
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

        <!-- DOCA TÁTICA INFERIOR E BORDAS LATERAIS EMPILHADAS:
             [ ESQUERDA: CEMITÉRIO ACIMA DE MANA/ESTAMINA ] — [ CENTRO: MÃO ] — [ DIREITA: DECK ACIMA DE ARTEFATOS ] -->
        <footer class="battle-ls-bottom-dock">
          <!-- COLUNA LATERAL ESQUERDA (CANTO ESQUERDO): CEMITÉRIO ACIMA DE MANA & ESTAMINA -->
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
                  <div class="attr-fill mana" id="segments-mana-fill" style="display:none"></div>
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
                  <div class="attr-fill stamina" id="segments-stam-fill" style="display:none"></div>
                </div>
              </div>

              <button class="attack-prompt-handle ls-inline-atk ${turn !== 'p' ? 'hidden' : ''}" id="btn-attack-prompt" title="${t('board.attack')}">
                <span class="handle-icon">⚔️</span>
                <span class="handle-text">${t('board.attack')}</span>
              </button>
            </div>
          </div>

          <!-- CENTRO INFERIOR: CARTAS DA MÃO DO JOGADOR -->
          <div class="battle-ls-hand-center">
            <div class="hand-area-hifi">
              <div id="hand" class="hand-cards-row"></div>
            </div>
          </div>

          <!-- COLUNA LATERAL DIREITA (CANTO DIREITO): DECK ACIMA DE ARTEFATOS & TURNO -->
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
                  <svg class="timer-progress-svg" viewBox="0 0 100 100" style="display:none">
                    <circle class="timer-track" cx="50" cy="50" r="45"></circle>
                    <circle class="timer-bar" id="timer-bar" cx="50" cy="50" r="45"></circle>
                  </svg>
                  <span class="turn-timer-text" id="timer-text">${timer}</span>
                  <span class="turn-label-text" id="btn-end-label">${turn !== 'p' ? t('board.wait') : t('board.end')}</span>
                </button>

                <div id="mini-end-confirm" class="mini-end-confirm">
                  <button class="mini-circle-btn yes" id="btn-end-yes" title="Confirmar">✔</button>
                  <button class="mini-circle-btn no" id="btn-end-no" title="Cancelar">✖</button>
                </div>
              </div>

              <button class="btn-end-turn-hidden" id="btn-end-fake" style="display:none"></button>
            </div>
          </div>
        </footer>

        <div id="banner" class="banner-message"></div>
        <div id="particle-container"></div>
        <div id="float-container" style="position:fixed;inset:0;pointer-events:none;z-index:9000"></div>

        <!-- BATTLE OVERLAYS -->
        <div id="battle-overlays">
          <div class="overlay" id="overlay-carousel">
            <div class="carousel-container" id="carousel-list"></div>
          </div>
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

  public override updateAttributeBars(engine: { hp: any; mana: any; stamina: any; maxMana?: number; maxStamina?: number }): void {
    super.updateAttributeBars(engine as any);
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
