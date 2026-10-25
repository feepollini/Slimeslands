import { SideActions } from '../components/SideActions';
import { SoundManager } from '../utils/SoundManager';

export class MenuScreen {
  private _onStart: () => void;
  private sideActions: SideActions;

  constructor(onStart: () => void, onSideAction?: (actionId: string) => boolean | void) {
    this._onStart = onStart;
    this.sideActions = new SideActions(undefined, onSideAction);
  }

  public render(): string {
    void this._onStart;
    return `
      <div class="menu-main-view active" id="view-battle" style="display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; position:relative; overflow:hidden;">
        <!-- VINHETA DO LOBBY -->
        <div id="lobby-vignette" style="position:absolute; inset:0; pointer-events:none; z-index:10; background: radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(2,12,27,0.42) 78%, rgba(2,10,24,0.82) 100%);"></div>
        
        <!-- BOTÃO DE TESTE DO TABULEIRO 3x1 (ROYAL SAPPHIRE & GOLD v1.2) -->
        <button id="btn-boss-test-circle" title="Testar Arena Boss 3x1" style="
          position: absolute;
          bottom: 94px;
          right: 12px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(180deg, #0b3778 0%, #041f4a 55%, #02122e 100%);
          border: 2px solid #fff3c2;
          outline: 1.5px solid #9b701e;
          box-shadow: 0 6px 16px rgba(0, 8, 22, 0.8), 0 0 14px rgba(212, 175, 83, 0.45);
          color: #fff3c2;
          font-size: 1.2rem;
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
