import { SideActions } from '../components/SideActions';
import { SoundManager } from '../utils/SoundManager';

/**
 * MenuScreenLandscape — Cópia adaptada do Lobby para Modo Paisagem (Landscape / Web Widescreen).
 * Inspirado em Wild Rift / Mobile Legends: palco central 100% livre para a arte do cenário,
 * ícones de eventos/missões organizados em docas verticais nos cantos esquerdo e direito,
 * e botão de teste da Arena Boss 3x1 integrado perfeitamente à doca lateral.
 */
export class MenuScreenLandscape {
  private _onStart: () => void;
  private _onSwitchTab?: (tab: any) => void;
  private sideActions: SideActions;

  constructor(onStart: () => void, onSwitchTab?: (tab: any) => void) {
    this._onStart = onStart;
    this._onSwitchTab = onSwitchTab;
    this.sideActions = new SideActions();
  }

  public render(): string {
    void this._onStart;
    void this._onSwitchTab;

    return `
      <div class="menu-main-view active hub-landscape-view" id="view-battle">
        <!-- VINHETA CINEMATOGRÁFICA SUAVE NAS BORDAS (DEIXA O CENTRO 100% NÍTIDO) -->
        <div id="lobby-vignette" class="hub-ls-vignette"></div>

        <!-- BOTÕES LATERAIS ORGANIZADOS NOS CANTOS (ESQUERDA & DIREITA) -->
        <div class="hub-ls-corners-layer">
          ${this.sideActions.render()}

          <!-- BOTÃO DE ARENA BOSS 3x1 INTEGRADO NO CANTO INFERIOR DIREITO DO PALCO -->
          <button id="btn-boss-test-circle" class="hub-ls-boss-corner-btn" title="Desafiar Arena Boss 3x1">
            <span class="hub-ls-boss-icon">👾</span>
            <span class="hub-ls-boss-label">BOSS 3x1</span>
          </button>
        </div>
      </div>
    `;
  }

  public bind() {
    const root = document.getElementById('view-battle');
    if (root) {
      this.sideActions.bind(root);

      const testBtn = root.querySelector('#btn-boss-test-circle');
      testBtn?.addEventListener('click', () => {
        try {
          SoundManager.playAction('clique_geral', 0.5);
        } catch (_) {}
        window.location.href = 'boss_battle.html?mobby=slime_colosso';
      });
    }
  }
}
