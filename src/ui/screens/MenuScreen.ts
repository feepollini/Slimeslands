import { SideActions } from '../components/SideActions';
import { SoundManager } from '../utils/SoundManager';

export class MenuScreen {
  private _onStart: () => void;
  private sideActions: SideActions;

  constructor(onStart: () => void) {
    this._onStart = onStart;
    this.sideActions = new SideActions();
  }

  public render(): string {
    void this._onStart;
    return `
      <div class="menu-main-view active" id="view-battle" style="display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; position:relative; overflow:hidden;">
        <!-- VINHETA DO LOBBY -->
        <div id="lobby-vignette" style="position:absolute; inset:0; pointer-events:none; z-index:10; background: radial-gradient(ellipse at center, rgba(0,0,0,0) 30%, rgba(0,0,0,0.45) 75%, rgba(0,0,0,0.85) 100%), linear-gradient(90deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 20%, transparent 35%, transparent 65%, rgba(0,0,0,0.2) 80%, rgba(0,0,0,0.65) 100%);"></div>
        
        <!-- BOTÃO CIRCULAR DE TESTE DO TABULEIRO 3x1 NO CANTO INFERIOR DIREITO -->
        <button id="btn-boss-test-circle" title="Testar Arena 3x1" style="
          position: absolute;
          bottom: 104px;
          right: 12px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: radial-gradient(circle, #ffd700 0%, #b8860b 80%, #5a4128 100%);
          border: 2px solid #ffffff;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.75), 0 0 12px rgba(255, 215, 0, 0.5);
          color: #000;
          font-size: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 510;
          transition: transform 0.2s, box-shadow 0.2s;
        ">
          👾
        </button>

        ${this.sideActions.render()}
      </div>
    `;
  }

  public bind() {
    const root = document.getElementById('view-battle');
    if (root) {
      this.sideActions.bind(root);
      
      const testBtn = root.querySelector('#btn-boss-test-circle');
      testBtn?.addEventListener('click', () => {
        try { SoundManager.playAction('clique_geral', 0.5); } catch (_) {}
        window.location.href = 'boss_battle.html?mobby=slime_colosso';
      });
    }
  }
}
