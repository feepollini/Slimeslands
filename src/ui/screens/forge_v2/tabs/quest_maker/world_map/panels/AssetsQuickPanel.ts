export class AssetsQuickPanel {
  constructor() {}

  public render(assets: any[]): string {
    const renderItem = (asset: any) => `
      <div class="quick-asset-item" data-url="${asset.url || asset}" style="
        width:calc(33.33% - 6px); aspect-ratio:1/1; border-radius:6px;
        background:url('${asset.url || asset}') center/cover;
        cursor:pointer; border:1px solid rgba(255,255,255,0.05); transition:0.1s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `;

    return `
      <div style="padding:12px; overflow:visible; border-top:1px solid rgba(255,255,255,0.05); background:rgba(0,0,0,0.15);">
        <div style="font-size:0.5rem; color:#ffd700; font-weight:800; margin-bottom:12px; letter-spacing:1px; display:flex; justify-content:space-between;">
           BIBLIOTECA RÁPIDA
           <span style="opacity:0.3; font-size:0.4rem;">PÁGINA 1</span>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          ${assets.slice(0, 15).map(a => renderItem(a)).join('')}
          ${assets.length === 0 ? '<div style="font-size:0.5rem; opacity:0.3; margin-top:20px; text-align:center; width:100%;">Nenhum asset disponível</div>' : ''}
        </div>
      </div>
    `;
  }

  public bind(container: HTMLElement, onSelect: (url: string) => void) {
    container.querySelectorAll('.quick-asset-item').forEach(item => {
      item.addEventListener('click', () => onSelect((item as HTMLElement).dataset.url!));
      
      // Implementação básica de Drag (opcional, mas solicitado)
      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', (e: any) => {
         e.dataTransfer.setData('text/plain', (item as HTMLElement).dataset.url!);
      });
    });
  }
}
