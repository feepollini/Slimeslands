export class ArtboardsPanel {
  public render(_state?: any, _options?: { reRender?: () => void }): string {
    return `
      <div class="artboards-panel-container" style="padding: 8px; font-family: 'Cinzel', serif; font-size: 11px; color: #f5d98b;">
        <div style="font-weight: bold; margin-bottom: 6px; letter-spacing: 1px;">❖ ARTBOARDS & CENAS ❖</div>
        <div style="font-size: 10px; color: #a0aec0;">Cena ativa da Linha do Tempo</div>
      </div>
    `;
  }

  public bind(_container: HTMLElement, _state?: any, _options?: { reRender?: () => void }): void {
    // Event bindings for Artboards Panel
  }
}
