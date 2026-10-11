export class ScenesGallery {
  private state: any;
  private callbacks: any;
  private activeCategory: 'all' | 'local' | 'motions' | 'selected' = 'all';

  constructor() {}

  public render(state?: any, callbacks?: any): string {
    this.state = state || (this as any).__state || { savedScenes: [], worldMapObjects: [], selectedIds: [], selectedId: null };
    this.callbacks = callbacks || (this as any).__callbacks || { reRender: () => {} };
    if (!this.state.savedScenes) this.state.savedScenes = [];
    if (!this.state.worldMapObjects) this.state.worldMapObjects = [];
    const savedScenes = this.state.savedScenes;

    const categories = [
      { id: 'all' as const, label: 'TODAS', icon: '📁', color: '#51c5ff' },
      { id: 'local' as const, label: 'LOCAL', icon: '💾', color: '#51c5ff' },
      { id: 'motions' as const, label: 'MOTIONS', icon: '🎬', color: '#a78bfa' },
      { id: 'selected' as const, label: 'SELECIONADOS', icon: '✅', color: '#4cff88' },
    ];

    const filteredScenes = savedScenes.filter((s: any) => {
      if (this.activeCategory === 'all') return true;
      return s.saveMode === this.activeCategory;
    });

    return `
      <div style="padding:12px; height:100%; display:flex; flex-direction:column; background:#0a0a0f;">
        <div style="font-size:0.65rem; color:#51c5ff; font-weight:900; margin-bottom:10px; letter-spacing:1px; text-transform:uppercase;">📁 CENAS SALVAS</div>

        <!-- Category tabs -->
        <div style="display:flex; gap:3px; margin-bottom:10px;">
          ${categories.map(cat => `
            <button class="scene-cat-btn" data-cat="${cat.id}" style="
              flex:1; padding:5px 3px; border-radius:4px; cursor:pointer; font-size:0.45rem; font-weight:900;
              background:${this.activeCategory === cat.id ? cat.color + '18' : 'transparent'};
              color:${this.activeCategory === cat.id ? cat.color : 'rgba(255,255,255,0.3)'};
              border:1px solid ${this.activeCategory === cat.id ? cat.color + '44' : 'transparent'};
              text-transform:uppercase; letter-spacing:0.5px;
            ">${cat.icon} ${cat.label}</button>
          `).join('')}
        </div>

        ${filteredScenes.length > 0 ? `
          <div style="flex:1; overflow-y:auto;">
            ${filteredScenes.map((scene: any) => {
              const realIdx = savedScenes.indexOf(scene);
              const modeColors: any = { local: '#51c5ff', motions: '#a78bfa', selected: '#4cff88' };
              const modeLabels: any = { local: 'LOCAL', motions: 'MOTIONS', selected: 'SELECIONADOS' };
              const modeColor = modeColors[scene.saveMode] || '#51c5ff';
              const modeLabel = modeLabels[scene.saveMode] || 'LOCAL';
              return `
                <div class="saved-scene-item" data-idx="${realIdx}" style="
                  display:flex; flex-direction:column; gap:4px; padding:10px; margin-bottom:6px;
                  background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06);
                  border-radius:6px;
                ">
                  <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-size:0.8rem;">🎬</span>
                    <span style="font-size:0.6rem; font-weight:900; color:#51c5ff; flex:1; text-transform:uppercase; letter-spacing:0.5px;">${scene.name || 'SEM NOME'}</span>
                    <span style="font-size:0.4rem; font-weight:900; color:${modeColor}; background:${modeColor}15; padding:2px 5px; border-radius:3px; text-transform:uppercase;">${modeLabel}</span>
                    <span style="font-size:0.45rem; color:rgba(255,255,255,0.3); font-weight:800;">${scene.objects?.length || 0}</span>
                  </div>
                  <div style="display:flex; gap:4px;">
                    <button class="scene-load-btn" data-idx="${realIdx}" data-mode="load" style="
                      flex:1; padding:6px; background:rgba(81,197,255,0.1); border:1px solid rgba(81,197,255,0.2);
                      border-radius:3px; color:#51c5ff; font-size:0.45rem; font-weight:900; cursor:pointer;
                      text-transform:uppercase; letter-spacing:0.5px;
                    ">▶ CARREGAR</button>
                    <button class="scene-delete-btn" data-idx="${realIdx}" style="
                      padding:6px 8px; background:rgba(255,51,102,0.1); border:1px solid rgba(255,51,102,0.2);
                      border-radius:3px; color:#ff3366; font-size:0.45rem; font-weight:900; cursor:pointer;
                    ">✕</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div style="flex:1; display:flex; align-items:center; justify-content:center;">
            <div style="font-size:0.6rem; opacity:0.2; text-align:center; text-transform:uppercase; font-weight:800; letter-spacing:1px;">NENHUMA CENA SALVA</div>
          </div>
        `}
      </div>
    `;
  }

  public bind(container: HTMLElement, state: any, callbacks: any) {
    this.state = state;
    this.callbacks = callbacks;

    // Load scenes from localStorage if not in state
    if (!this.state.savedScenes || this.state.savedScenes.length === 0) {
      try {
        const saved = JSON.parse(localStorage.getItem('forge_scenes') || '[]');
        this.state.savedScenes = saved.map((s: any) => s.data || s);
      } catch (e) {
        this.state.savedScenes = [];
      }
    }

    container.querySelectorAll('.scene-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeCategory = (btn as HTMLElement).dataset.cat as 'all' | 'local' | 'motions' | 'selected';
        callbacks.reRender();
      });
    });

    container.querySelectorAll('.scene-load-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        document.dispatchEvent(new CustomEvent('load-scene', { detail: { idx } }));
      });
    });

    container.querySelectorAll('.scene-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        this.deleteScene(idx);
      });
    });
  }

  private deleteScene(idx: number) {
    if (!this.state.savedScenes) this.state.savedScenes = [];
    this.state.savedScenes.splice(idx, 1);
    
    // Also update localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('forge_scenes') || '[]');
      saved.splice(idx, 1);
      localStorage.setItem('forge_scenes', JSON.stringify(saved));
    } catch (e) {}
    
    this.callbacks.reRender();
  }
}
