export class TabAssets {
  private availableCards: string[];
  private assetRegistry: any;
  private selectedCategory: string;
  private selectedAssets: Set<string>;
  private showToast: (msg: string, color?: string) => void;
  private setAssetsSelectedCategory: (cat: string) => void;
  private toggleAssetSelection: (url: string, multi: boolean) => void;
  private clearAssetSelection: () => void;
  private saveAssetRegistry: () => void;
  private loadAvailableImages: () => Promise<void>;
  private reRender: () => void;

  constructor(state: any, callbacks: any) {
    this.availableCards = state.availableCards;
    this.assetRegistry = state.assetRegistry;
    this.selectedCategory = state.selectedCategory || 'all';
    this.selectedAssets = state.selectedAssets || new Set();
    this.showToast = callbacks.showToast;
    this.setAssetsSelectedCategory = callbacks.setAssetsSelectedCategory;
    this.toggleAssetSelection = callbacks.toggleAssetSelection;
    this.clearAssetSelection = callbacks.clearAssetSelection;
    this.saveAssetRegistry = callbacks.saveAssetRegistry;
    this.loadAvailableImages = callbacks.loadAvailableImages;
    this.reRender = callbacks.reRender;
  }

  public render(): string {
    const categories = [
      { id: 'all', label: 'TUDO' },
      { id: 'card_art', label: 'ARTES (Cards)' },
      { id: 'card_bg', label: 'FUNDOS (Cards)' },
      { id: 'ability_icon', label: 'PASSIVAS' },
      { id: 'skill_icon', label: 'ATIVAS' },
      { id: 'scenario', label: 'CENÁRIOS' },
      { id: 'svg_pattern', label: 'SVGs' },
      { id: 'border', label: 'BORDAS' },
      { id: 'ui_element', label: 'UI' }
    ];

    const filtered = this.selectedCategory === 'all' 
       ? this.availableCards 
       : this.availableCards.filter(u => this.assetRegistry[u]?.category === this.selectedCategory);

    return `
      <div class="editor-form-panel" style="flex:1; display:flex; flex-direction:column; gap:20px; background:rgba(20,20,30,0.6); backdrop-filter:blur(20px); border-radius:15px; border:1px solid rgba(255,255,255,0.05);">
        
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:15px;">
           <div class="editor-section-title" style="margin:0;">GALERIA DE ATIVOS (${this.availableCards.length})</div>
           <div style="display:flex; gap:10px;">
              <button id="btn-upload-pc" class="editor-btn-secondary" style="background:rgba(81,197,255,0.1); color:#51c5ff; border-color:#51c5ff; padding:10px 20px;">+ ADICIONAR DO COMPUTADOR</button>
              <input type="file" id="inp-file-upload" multiple accept="image/*,video/*" style="display:none">
           </div>
        </div>

        <!-- CATEGORIES -->
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
           ${categories.map(c => `
              <button class="cat-pill ${this.selectedCategory === c.id ? 'active' : ''}" data-cat="${c.id}" style="background:${this.selectedCategory === c.id ? '#51c5ff' : 'rgba(255,255,255,0.05)'}; color:${this.selectedCategory === c.id ? '#000' : 'rgba(255,255,255,0.6)'}; border:none; padding:8px 15px; border-radius:20px; font-size:0.65rem; font-weight:950; cursor:pointer; letter-spacing:1px;">${c.label}</button>
           `).join('')}
        </div>

        ${this.selectedAssets.size > 0 ? `
           <div id="bulk-actions-bar" style="background:rgba(255,215,0,0.15); border:1px solid #ffd700; border-radius:12px; padding:15px; display:flex; gap:15px; align-items:center; animation: bounceIn 0.3s ease;">
              <span style="font-weight:900; font-size:0.75rem; color:#ffd700;">📂 ${this.selectedAssets.size} ITENS SELECIONADOS:</span>
              <div style="display:flex; gap:10px; flex:1;">
                 <select id="bulk-cat-select" class="editor-input" style="flex:1; border-color:#ffd700;">
                    <option value="">Trocar Categoria para...</option>
                    ${categories.filter(c => c.id !== 'all').map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
                 </select>
                 <button id="btn-bulk-delete" class="editor-btn-secondary" style="background:#ff4444; color:#fff; border:none; padding:10px;">DELETAR SELECIONADOS</button>
                 <button id="btn-clear-selection" class="editor-btn-secondary" style="background:none; border-color:#ffd700; color:#ffd700;">CANCELAR</button>
              </div>
           </div>
        ` : ''}

        <!-- GRID -->
        <div id="asset-grid" style="flex:1; display:grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap:15px; overflow-y:auto; padding-right:10px;">
           ${filtered.map(url => {
              const isSelected = this.selectedAssets.has(url);
              const isVid = /\.(mp4|webm)$/i.test(url);
              const category = this.assetRegistry[url]?.category || 'Sem Cat.';
              return `
                <div class="asset-card ${isSelected ? 'selected' : ''}" data-url="${url}" style="aspect-ratio:1/1; position:relative; cursor:pointer; border-radius:12px; overflow:hidden; border:2px solid ${isSelected ? '#ffd700' : 'rgba(255,255,255,0.05)'}; transition:0.2s;">
                   ${isVid ? `<video src="${url}" style="width:100%; height:100%; object-fit:cover" muted loop></video>` : `<div style="width:100%; height:100%; background:url('${url}') center/cover no-repeat"></div>`}
                   <div style="position:absolute; bottom:0; left:0; width:100%; background:rgba(0,0,0,0.7); backdrop-filter:blur(5px); padding:4px 8px; font-size:0.55rem; color:${isSelected ? '#ffd700' : '#888'}; font-weight:900;">
                      ${category.replace('card_', '').toUpperCase()}
                   </div>
                   ${isSelected ? `<div style="position:absolute; top:8px; right:8px; background:#ffd700; color:#000; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:0.7rem;">✓</div>` : ''}
                </div>
              `;
           }).join('')}
        </div>
      </div>
    `;
  }

  public bind(container: HTMLElement) {
    container.querySelectorAll('.cat-pill').forEach(btn => {
       btn.addEventListener('click', (e) => {
          this.setAssetsSelectedCategory((e.currentTarget as HTMLElement).dataset.cat!);
       });
    });

    container.querySelectorAll('.asset-card').forEach(card => {
       card.addEventListener('click', (e) => {
          const url = (e.currentTarget as HTMLElement).dataset.url!;
          const evt = e as MouseEvent;
          this.toggleAssetSelection(url, evt.ctrlKey || evt.shiftKey);
       });
    });

    container.querySelector('#btn-clear-selection')?.addEventListener('click', () => {
       this.clearAssetSelection();
    });

    container.querySelector('#btn-upload-pc')?.addEventListener('click', () => {
       (container.querySelector('#inp-file-upload') as HTMLInputElement).click();
    });

    container.querySelector('#inp-file-upload')?.addEventListener('change', async (e) => {
       const files = (e.target as HTMLInputElement).files;
       if (!files || files.length === 0) return;
       
       this.showToast(`Enviando ${files.length} arquivo(s)... `, '#51c5ff');
       
       for (const file of Array.from(files)) {
         const formData = new FormData();
         formData.append('media', file);
         try {
           const resp = await fetch('/api/upload-media', { method: 'POST', body: formData });
           if (resp.ok) this.showToast(`✅ ${file.name} enviado!`, '#4cff88');
         } catch (err) {
           this.showToast(`❌ Falha no envio de ${file.name}`, '#ff4444');
         }
       }
       await this.loadAvailableImages();
       this.reRender();
    });

    container.querySelector('#bulk-cat-select')?.addEventListener('change', (e) => {
       const cat = (e.target as HTMLSelectElement).value;
       if (!cat) return;
       
       this.selectedAssets.forEach(url => {
          if (!this.assetRegistry[url]) this.assetRegistry[url] = {};
          this.assetRegistry[url].category = cat;
       });
       
       this.saveAssetRegistry();
       this.showToast(`Categorias atualizadas para ${this.selectedAssets.size} itens!`);
       this.reRender();
    });

    container.querySelector('#btn-bulk-delete')?.addEventListener('click', async () => {
       if (!confirm(`Deseja deletar ${this.selectedAssets.size} arquivo(s) permanentemente?`)) return;
       
       const assets = Array.from(this.selectedAssets);
       let success = 0;
       for (const url of assets) {
          try {
             const resp = await fetch('/api/delete-media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
             });
             if (resp.ok) {
                success++;
                delete this.assetRegistry[url];
                (this.availableCards as any) = this.availableCards.filter(u => u !== url);
             }
          } catch(err) {}
       }
       
       this.selectedAssets.clear();
       this.saveAssetRegistry();
       this.showToast(`Deletados ${success} arquivos.`);
       this.reRender();
    });
  }
}
