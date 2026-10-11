/**
 * SidebarGallery.ts
 * Versão compacta do TabAssets adaptada para o menu lateral do World Map.
 * Lê os mesmos dados do estado global (availableCards, assetRegistry).
 */
export class SidebarGallery {
  private selectedCategory: string = 'all';

  public render(state: any): string {
    const availableCards: string[] = state.availableCards || [];
    const assetRegistry: any = state.assetRegistry || {};

    const categories = [
      { id: 'all',          label: 'TUDO' },
      { id: 'card_art',     label: 'ARTES' },
      { id: 'card_bg',      label: 'FUNDOS' },
      { id: 'ability_icon', label: 'PASSIVAS' },
      { id: 'skill_icon',   label: 'ATIVAS' },
      { id: 'scenario',     label: 'CENÁRIOS' },
      { id: 'svg_pattern',  label: 'SVGs' },
      { id: 'border',       label: 'BORDAS' },
      { id: 'ui_element',   label: 'UI' }
    ];

    const filtered = this.selectedCategory === 'all'
      ? availableCards
      : availableCards.filter(u => assetRegistry[u]?.category === this.selectedCategory);

    return `
      <div style="display:flex; flex-direction:column; height:100%; overflow:hidden;">

        <!-- FILTROS DE CATEGORIA (scroll horizontal) -->
        <div style="display:flex; gap:4px; padding:8px; overflow-x:auto; scrollbar-width:none; background:#0d0d15; border-bottom:1px solid #1a1a2e; flex-shrink:0;">
          ${categories.map(c => `
            <button class="sg-cat-btn" data-cat="${c.id}" style="
              flex-shrink:0; padding:4px 10px; border:1px solid ${this.selectedCategory === c.id ? '#51c5ff' : 'rgba(255,255,255,0.1)'};
              background:${this.selectedCategory === c.id ? 'rgba(81,197,255,0.15)' : 'transparent'};
              color:${this.selectedCategory === c.id ? '#51c5ff' : '#666'};
              border-radius:20px; font-size:0.45rem; font-weight:900; cursor:pointer; white-space:nowrap; letter-spacing:0.5px;
            ">${c.label}</button>
          `).join('')}
        </div>

        <!-- CONTAGEM + UPLOAD -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 10px; font-size:0.5rem; color:#444; flex-shrink:0;">
          <span>${filtered.length} ativos</span>
          <button id="sg-btn-upload" style="background:rgba(81,197,255,0.1); border:1px solid #51c5ff33; color:#51c5ff; border-radius:4px; padding:3px 8px; font-size:0.45rem; cursor:pointer;">+ PC</button>
          <input type="file" id="sg-file-input" multiple accept="image/*,video/*" style="display:none;">
        </div>

        <!-- GRADE DE ASSETS -->
        <div id="sg-asset-grid" style="flex:1; display:grid; grid-template-columns: repeat(3, 1fr); gap:4px; padding:8px; overflow-y:auto;">
          ${filtered.length > 0 ? filtered.map(url => {
            const isVid = /\.(mp4|webm)$/i.test(url);
            const cat = (assetRegistry[url]?.category || '').replace('card_', '').toUpperCase();
            return `
              <div class="sg-asset-item" data-url="${url}" style="
                aspect-ratio:1/1; border-radius:6px; border:1px solid rgba(255,255,255,0.05);
                background:${isVid ? '#000' : `url('${url}') center/cover no-repeat`};
                cursor:pointer; position:relative; transition:0.15s; overflow:hidden;
              " title="${url}">
                ${isVid ? `<video src="${url}" style="width:100%;height:100%;object-fit:cover;" muted></video>` : ''}
                <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.5); font-size:0.35rem; color:#888; padding:2px 4px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${cat || '–'}</div>
              </div>
            `;
          }).join('') : `
            <div style="grid-column:1/-1; padding:30px; text-align:center; opacity:0.2; font-size:0.6rem;">
              📦<br>Nenhum ativo
            </div>
          `}
        </div>
      </div>
    `;
  }

  public bind(container: HTMLElement, onSelect: (url: string) => void, onCategoryChange: () => void, onUpload: (files: FileList) => void) {
    // Filtros
    container.querySelectorAll('.sg-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedCategory = (btn as HTMLElement).dataset.cat!;
        onCategoryChange();
      });
    });

    // Upload
    container.querySelector('#sg-btn-upload')?.addEventListener('click', () => {
      (container.querySelector('#sg-file-input') as HTMLInputElement).click();
    });
    container.querySelector('#sg-file-input')?.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) onUpload(files);
    });

    // Seleção de asset (inserir no canvas)
    container.querySelectorAll('.sg-asset-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = (item as HTMLElement).dataset.url!;
        onSelect(url);
      });

      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', (e: any) => {
        e.dataTransfer.setData('text/plain', (item as HTMLElement).dataset.url!);
      });
    });
  }
}
