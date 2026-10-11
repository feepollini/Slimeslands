/**
 * AssetLibraryPanel.ts
 * Versão otimizada e premium da biblioteca de assets.
 * Focada em performance e fluidez visual.
 */

export class AssetLibraryPanel {
  private selectedCategory: string = 'all';
  private searchQuery: string = '';
  private state: any = null;
  private itemsPerPage: number = 32;
  private visibleCount: number = 32;

  // Cache para evitar re-processamento pesado
  private _cachedUnifiedAssets: any[] = [];
  private _lastStateLength: number = 0;

  private categories = [
    { id: 'all', label: '🌌', name: 'Todos', color: '#fff' },
    { id: 'ambiente', label: '🌲', name: 'Ambiente', color: '#4cff88' },
    { id: 'edificio', label: '🏠', name: 'Edifícios', color: '#ffd700' },
    { id: 'personagem', label: '👤', name: 'Personagens', color: '#ff8c42' },
    { id: 'inimigo', label: '👹', name: 'Inimigos', color: '#ff4444' },
    { id: 'objeto', label: '📦', name: 'Objetos', color: '#a78bfa' },
    { id: 'interativo', label: '🔘', name: 'Interativos', color: '#51c5ff' },
    { id: 'decoracao', label: '✨', name: 'Decoração', color: '#ff69b4' },
    { id: 'veiculo', label: '🚗', name: 'Veículos', color: '#00bcd4' },
    { id: 'agua', label: '💧', name: 'Água', color: '#2196f3' }
  ];

  public render(state: any): string {
    this.state = state;
    const galleryAssets = state.availableCards || [];
    const questAssets = state.questAssets || [];
    const currentTotalLength = galleryAssets.length + questAssets.length;

    // Atualiza cache apenas se o tamanho mudou (novo upload ou carregamento)
    if (this._cachedUnifiedAssets.length === 0 || currentTotalLength !== this._lastStateLength) {
      const unifiedMap = new Map();
      [...galleryAssets, ...questAssets].forEach(a => {
        const url = typeof a === 'string' ? a : a.url;
        if (!unifiedMap.has(url)) unifiedMap.set(url, a);
      });
      this._cachedUnifiedAssets = Array.from(unifiedMap.values());
      this._lastStateLength = currentTotalLength;
    }

    const filtered = this.filterAssets(this._cachedUnifiedAssets, state.assetRegistry || {});
    
    // Page slicing
    const paged = filtered.slice(0, this.visibleCount);
    const hasMore = filtered.length > this.visibleCount;

    return `
      <div style="display:flex; flex-direction:column; height:100%; overflow:hidden; background:#08080c; font-family:'Outfit', sans-serif;">
        
        <!-- SEARCH -->
        <div style="padding:12px; background:#0d0d15; border-bottom:1px solid rgba(255,255,255,0.05); flex-shrink:0;">
          <div style="position:relative; background:rgba(255,255,255,0.02); border-radius:12px; border:1px solid rgba(255,255,255,0.08); overflow:hidden;">
            <input type="text" id="asset-search-input" value="${this.searchQuery}" placeholder="Pesquisar assets..." style="
              width:100%; padding:10px 15px 10px 35px; background:transparent;
              border:none; color:#fff; font-size:0.65rem; outline:none; font-weight:500;
            ">
            <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); opacity:0.3; font-size:0.7rem;">🔍</span>
          </div>
        </div>

        <!-- CATEGORIES -->
        <div style="display:flex; gap:6px; padding:10px; overflow-x:auto; scrollbar-width:none; background:#0d0d15; border-bottom:1px solid rgba(255,255,255,0.05); flex-shrink:0;" class="custom-scroll-h">
           ${this.categories.map(c => `
             <button class="asset-cat-btn" data-cat="${c.id}" style="
               flex-shrink:0; padding:6px 12px; border-radius:10px; cursor:pointer; font-size:0.55rem; font-weight:900;
               border:1px solid ${this.selectedCategory === c.id ? c.color : 'rgba(255,255,255,0.05)'};
               background:${this.selectedCategory === c.id ? c.color + '15' : 'rgba(255,255,255,0.02)'};
               color:${this.selectedCategory === c.id ? c.color : '#555'};
               display:flex; align-items:center; gap:6px; transition:0.2s;
             ">
               <span>${c.label}</span>
               <span>${c.name.toUpperCase()}</span>
             </button>
           `).join('')}
        </div>

        <!-- ASSET GRID (FIXED CSS FLEX LAYOUT) -->
        <div id="asset-library-grid" style="
          flex:1; display:flex; flex-wrap:wrap; align-content:start;
          gap:8px; padding:12px; overflow-y:auto; 
        " class="custom-scroll">
          ${paged.map((asset: any, idx: number) => this.renderAssetItem(asset, idx)).join('')}
          
          ${hasMore ? `
            <div style="width:100%; padding:20px 0; display:flex; justify-content:center;">
              <button id="btn-load-more-assets" style="
                width:100%; padding:14px; background:rgba(81,197,255,0.05); border:1px solid rgba(81,197,255,0.2);
                border-radius:12px; color:#51c5ff; font-size:0.6rem; font-weight:900; cursor:pointer;
                transition:0.2s; text-transform:uppercase; letter-spacing:1px;
              ">
                + CARREGAR MAIS (${filtered.length - paged.length})
              </button>
            </div>
          ` : ''}

          ${filtered.length === 0 ? `
            <div style="width:100%; padding:60px 20px; text-align:center; opacity:0.1;">
              <div style="font-size:3rem; margin-bottom:15px;">📦</div>
              <div style="font-size:0.7rem; font-weight:900;">NENHUM ASSET ENCONTRADO</div>
            </div>
          ` : ''}
        </div>

        <!-- FOOTER INFO -->
        <div style="padding:10px 15px; background:#0d0d15; border-top:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
           <span style="font-size:0.45rem; color:#444; font-weight:900; letter-spacing:1px;">TOTAL: ${filtered.length} ITENS</span>
           <button id="asset-library-refresh" style="background:none; border:none; color:#555; cursor:pointer; font-size:0.6rem;">🔄</button>
        </div>

        <style>
          #asset-library-grid::-webkit-scrollbar { width: 4px; }
          #asset-library-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius:10px; }
          .custom-scroll-h::-webkit-scrollbar { height: 0px; }
          .al-item img, .al-item video { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
          .al-item:hover { transform: translateY(-4px); }
          .al-item:active { transform: scale(0.95); }
        </style>
      </div>
    `;
  }

  private renderAssetItem(asset: any, idx: number): string {
    let url = typeof asset === 'string' ? asset : asset.url;
    
    // Normalização de URL para evitar conflitos de porta (5173 vs 5174)
    if (url.startsWith('blob:')) {
      const currentOrigin = window.location.origin;
      if (!url.includes(currentOrigin)) {
        console.warn('[AssetLibraryPanel] Cleaning stale blob URL:', url);
        url = ''; // Descartar blob de porta antiga
      }
    }

    if (!url) return '';

    const isVid = /\.(mp4|webm)$/i.test(url) || url.includes('.gif'); 
    const isGif = url.toLowerCase().endsWith('.gif');

    return `
      <div class="al-item" draggable="true" data-url="${url}" style="
        box-sizing: border-box;
        width: calc(33.33% - 6px);
        min-width: calc(33.33% - 6px);
        max-width: calc(33.33% - 6px);
        aspect-ratio: 1/1;
        border-radius: 12px;
        background: rgba(0,0,0,0.6);
        border: 1px solid rgba(255,255,255,0.05);
        cursor: pointer;
        position: relative;
        overflow: hidden;
        transition: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <img src="${url}" loading="lazy" style="width:100%; height:100%; object-fit:contain; display:${isVid && !isGif ? 'none' : 'block'}; pointer-events:none;">
        ${isVid && !isGif ? `<video src="${url}" muted loop preload="none" style="width:100%; height:100%; object-fit:contain; pointer-events:none;"></video>` : ''}
        ${isGif ? `<div style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.8); padding:2px 4px; border-radius:4px; font-size:0.35rem; color:#ffd700; font-weight:900; border:1px solid #ffd70044; z-index:2; pointer-events:none;">GIF</div>` : ''}
      </div>
    `;
  }

  private filterAssets(assets: any[], registry: any): any[] {
    let filtered = assets;

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(a => {
        const url = typeof a === 'string' ? a : a.url;
        return url.toLowerCase().includes(q);
      });
    }

    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(a => {
        const url = typeof a === 'string' ? a : a.url;
        const assetCat = registry[url]?.category || '';
        return assetCat.toLowerCase().includes(this.selectedCategory) || this.selectedCategory.includes(assetCat.toLowerCase());
      });
    }

    return filtered;
  }

  public bind(container: HTMLElement, state: any, callbacks: any) {
    this.state = state;

    // Search com debounce manual opcional se necessário, mas input é ok aqui
    const searchInput = container.querySelector('#asset-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e: any) => {
        this.searchQuery = e.target.value;
        this.visibleCount = this.itemsPerPage;
        this.rerender(container, callbacks);
      });
    }

    // Categories
    container.querySelectorAll('.asset-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedCategory = (btn as HTMLElement).dataset.cat!;
        this.visibleCount = this.itemsPerPage;
        this.rerender(container, callbacks);
      });
    });

    // Pagination
    container.querySelector('#btn-load-more-assets')?.addEventListener('click', () => {
      this.visibleCount += this.itemsPerPage;
      this.rerender(container, callbacks);
    });

    // Items
    container.querySelectorAll('.al-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = (item as HTMLElement).dataset.url!;
        callbacks.onSelect?.(url);
      });

      // Video Preview
      item.addEventListener('mouseenter', () => {
        const video = item.querySelector('video');
        if (video) video.play().catch(() => {});
      });
      item.addEventListener('mouseleave', () => {
        const video = item.querySelector('video');
        if (video) { video.pause(); video.currentTime = 0; }
      });

      // Drag & Drop
      item.addEventListener('dragstart', (e: any) => {
        const url = (item as HTMLElement).dataset.url!;
        e.dataTransfer.setData('text/plain', url);
        e.dataTransfer.effectAllowed = 'copy';
        
        // Optional: Ghost image polish
        const img = item.querySelector('img');
        if (img) e.dataTransfer.setDragImage(img, 32, 32);
      });
    });

    // Refresh
    container.querySelector('#asset-library-refresh')?.addEventListener('click', () => {
      this._cachedUnifiedAssets = []; // Força atualização do cache
      this.rerender(container, callbacks);
    });
  }

  private rerender(container: HTMLElement, callbacks: any) {
    container.innerHTML = this.render(this.state);
    this.bind(container, this.state, callbacks);
  }
}
