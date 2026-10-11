export class PlayerGameFull {
  private _currentScreen: string = 'battle';

  constructor() {}

  public render(): string {
    return `
      <div class="player-gamefull" style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:linear-gradient(180deg, #1a1a2e 0%, #16213e 100%); position:absolute; top:0; left:0;">
        <div style="font-size:1.2rem; color:#51c5ff; font-weight:900; margin-bottom:15px;">🌐 GAME FULL</div>
        <div style="font-size:0.55rem; color:#aaa; text-align:center; line-height:1.5; max-width:80%;">
          O jogo completo será executado<br/>através do hub principal
        </div>
        <div style="margin-top:20px; font-size:0.5rem; color:#666;">
          Execute: npm run dev (hub)
        </div>
      </div>
    `;
  }

  public bind(_container: HTMLElement) {}

  public getCurrentScreen(): string {
    return this._currentScreen;
  }
}
