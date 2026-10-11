import { SideActions } from '../components/SideActions';

export class MenuScreen {
  private _onStart: () => void;
  private sideActions: SideActions;

  constructor(onStart: () => void) {
    this._onStart = onStart;
    this.sideActions = new SideActions();
  }

  public render(): string {
    void this._onStart;
    return `<div class="menu-main-view active" id="view-battle" style="display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; position:relative; overflow:hidden;">
      <!-- VINHETA DO LOBBY (atrás dos botões e acima do fundo) -->
      <div id="lobby-vignette" style="position:absolute; inset:0; pointer-events:none; z-index:10; background: radial-gradient(ellipse at center, rgba(0,0,0,0) 30%, rgba(0,0,0,0.45) 75%, rgba(0,0,0,0.85) 100%), linear-gradient(90deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 20%, transparent 35%, transparent 65%, rgba(0,0,0,0.2) 80%, rgba(0,0,0,0.65) 100%);"></div>
      ${this.sideActions.render()}
    </div>`;
  }

  public bind() {
    const root = document.getElementById('view-battle');
    if (root) this.sideActions.bind(root);
  }
}
