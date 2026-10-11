import { t } from '../../core/i18n';

export interface DuelControlsProps {
  mana: { p: number; e: number };
  stamina: { p: number; e: number };
  timer: number;
  turn: string;
}

export class DuelControlsPanel {
  public static render(props: DuelControlsProps): string {
    const { mana, stamina, timer, turn } = props;

    return `
      <div class="center-controls center-glass-container" id="center-controls-root">
        <!-- BARRAS DE MANA E ESTAMINA LADO A LADO COM 9 SEGMENTOS CADA -->
        <div class="attr-bars-horizontal">
          <div class="attr-bar-box mana">
            <div class="attr-bar-segmented" id="segments-mana-p">
              ${Array.from({ length: 9 }).map((_, i) => `<div class="attr-segment mana ${i < mana.p ? 'active' : ''}"></div>`).join('')}
            </div>
            <div class="attr-fill mana" id="segments-mana-fill" style="display:none"></div>
          </div>
          <div class="attr-bar-box stamina">
            <div class="attr-bar-segmented" id="segments-stam-p">
              ${Array.from({ length: 9 }).map((_, i) => `<div class="attr-segment stamina ${i < stamina.p ? 'active' : ''}"></div>`).join('')}
            </div>
            <div class="attr-fill stamina" id="segments-stam-fill" style="display:none"></div>
          </div>
        </div>

        <!-- ARTEFATOS / HABILIDADES (3 CÍRCULOS) -->
        <div class="skills-row" id="skills-row">
          <div class="art-slot art-empty" data-skill-idx="0">?</div>
          <div class="art-slot art-empty" data-skill-idx="1">?</div>
          <div class="art-slot art-empty" data-skill-idx="2">?</div>
        </div>

        <!-- BOTÃO DE TURNO (CÁPSULA) -->
        <div class="turn-capsule-wrapper">
          <button class="turn-capsule-btn ${turn !== 'p' ? 'disabled' : ''}" id="btn-end" ${turn !== 'p' ? 'disabled' : ''}>
            <svg class="timer-progress-svg" viewBox="0 0 100 100" style="display:none">
              <circle class="timer-track" cx="50" cy="50" r="45"></circle>
              <circle class="timer-bar" id="timer-bar" cx="50" cy="50" r="45"></circle>
            </svg>
            <span class="turn-timer-text" id="timer-text">${timer}</span>
            <span class="turn-label-text" id="btn-end-label">${turn !== 'p' ? t('board.wait') : t('board.end')}</span>
          </button>

          <!-- MINI CONFIRM OVERLAY -->
          <div id="mini-end-confirm" class="mini-end-confirm">
            <button class="mini-circle-btn yes" id="btn-end-yes" title="Confirmar">✔</button>
            <button class="mini-circle-btn no" id="btn-end-no" title="Cancelar">✖</button>
          </div>
        </div>

        <button class="btn-end-turn-hidden" id="btn-end-fake" style="display:none"></button>
      </div>
    `;
  }
}
