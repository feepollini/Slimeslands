import { t } from '../../core/i18n';

export interface DuelHeaderHp {
  p: number;
  e: number;
}

export class DuelHeader {
  public static render(hp: DuelHeaderHp): string {
    const playerPct = Math.max(0, (hp.p / 1500) * 100);
    const enemyPct = Math.max(0, (hp.e / 1500) * 100);

    return `
      <!-- HIGH FIDELITY 2-TIER DUEL HEADER -->
      <header class="game-header">
        <!-- JOGADOR (ESQUERDA) -->
        <div class="header-side player-side">
          <div class="player-icon player">
            <div class="player-icon-inner"></div>
          </div>
          <div class="header-bars">
            <div class="header-name-text player">
              <span class="name-label">${t('board.you')}</span>
            </div>
            <div class="pv-bar-container hifi-pv player">
              <div class="pv-bar-fill player" id="bar-p" style="width:${playerPct}%">
                <span class="pv-label-inner" id="hp-p">${hp.p} ${t('board.pv')}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- CENTRO (AÇÕES NO TOPO, ÍCONE DE DUELO EMBAIXO) -->
        <div class="header-center">
          <div id="action-hud" class="action-hud-pill">
            <span class="action-hud-title">${t('board.actions')}</span>
            <span id="actions-count" class="action-hud-count">1</span>
          </div>
          <button class="btn-surrender" id="btn-surrender" title="${t('board.surrender')}">
            <span class="icon-wrap">⚔️</span>
          </button>
        </div>

        <!-- OPONENTE (DIREITA) -->
        <div class="header-side enemy-side">
          <div class="header-bars">
            <div class="header-name-text enemy">
              <span class="name-label">${t('board.opponent')}</span>
            </div>
            <div class="pv-bar-container hifi-pv enemy">
              <div class="pv-bar-fill enemy" id="bar-e" style="width:${enemyPct}%">
                <span class="pv-label-inner" id="hp-e">${hp.e} ${t('board.pv')}</span>
              </div>
            </div>
          </div>
          <div class="player-icon enemy">
            <div class="player-icon-inner"></div>
          </div>
        </div>
      </header>
    `;
  }
}
