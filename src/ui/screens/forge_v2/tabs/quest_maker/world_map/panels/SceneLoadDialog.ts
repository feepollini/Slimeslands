export class SceneLoadDialog {
    private isOpen = false;
    private showToast(message: string, color: string = '#4cff88') {
      const t = document.createElement('div');
      t.textContent = message;
      t.style.position = 'fixed';
      t.style.bottom = '20px';
      t.style.left = '50%';
      t.style.transform = 'translateX(-50%)';
      t.style.padding = '8px 12px';
      t.style.borderRadius = '6px';
      t.style.background = color;
      t.style.color = '#000';
      t.style.fontWeight = '900';
      t.style.zIndex = '9999';
      t.style.fontFamily = 'monospace';
      t.style.fontSize = '12px';
      t.style.opacity = '0';
      t.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      document.body.appendChild(t);
      requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateX(-50%)'; });
      setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(-6px)'; setTimeout(() => t.remove(), 350); }, 1500);
    }

  public render(state: any): string {
    const savedScenes = state.savedScenes || [];

    return `
      <div class="scene-load-overlay" style="
        position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75);
        z-index:9999; display:${this.isOpen ? 'flex' : 'none'}; align-items:center; justify-content:center;
      ">
        <div style="
          background:#111; border:1px solid #333; border-radius:12px; padding:24px;
          max-width:500px; width:90%; max-height:80vh; overflow-y:auto;
        ">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <span style="font-size:0.75rem; color:#a78bfa; font-weight:900; letter-spacing:1px;">📂 CARREGAR CENA</span>
            <button class="scene-load-close" style="background:none; border:none; color:#fff; font-size:1.2rem; cursor:pointer;">✕</button>
          </div>

          ${savedScenes.length > 0 ? `
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${savedScenes.map((scene: any, idx: number) => {
                const modeColors: any = { local: '#51c5ff', motions: '#a78bfa', selected: '#4cff88' };
                const modeLabels: any = { local: 'LOCAL', motions: 'MOTIONS', selected: 'SELECIONADOS' };
                const modeColor = modeColors[scene.saveMode] || '#51c5ff';
                const modeLabel = modeLabels[scene.saveMode] || 'LOCAL';
                return `
                  <div style="
                    display:flex; flex-direction:column; gap:4px; padding:10px;
                    background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06);
                    border-radius:6px;
                  ">
                    <div style="display:flex; align-items:center; gap:6px;">
                      <span style="font-size:0.8rem;">🎬</span>
                      <span style="font-size:0.6rem; font-weight:900; color:#a78bfa; flex:1; text-transform:uppercase; letter-spacing:0.5px;">${scene.name || 'SEM NOME'}</span>
                      <span style="font-size:0.4rem; font-weight:900; color:${modeColor}; background:${modeColor}15; padding:2px 5px; border-radius:3px; text-transform:uppercase;">${modeLabel}</span>
                      <span style="font-size:0.45rem; color:rgba(255,255,255,0.3); font-weight:800;">${scene.objects?.length || 0} OBJS</span>
                    </div>
                    <div style="display:flex; gap:4px;">
                      <button class="scene-edit-btn" data-idx="${idx}" style="
                        flex:1; padding:6px; background:rgba(255,215,0,0.1); border:1px solid rgba(255,215,0,0.2);
                        border-radius:3px; color:#ffd700; font-size:0.45rem; font-weight:900; cursor:pointer;
                        text-transform:uppercase; letter-spacing:0.5px;
                      ">✏️ EDITAR</button>
                      <button class="scene-apply-btn" data-idx="${idx}" style="
                        flex:1; padding:6px; background:rgba(76,255,136,0.1); border:1px solid rgba(76,255,136,0.2);
                        border-radius:3px; color:#4cff88; font-size:0.45rem; font-weight:900; cursor:pointer;
                        text-transform:uppercase; letter-spacing:0.5px;
                      ">▶ APLICAR EM CENA</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div style="text-align:center; padding:30px;">
              <div style="font-size:0.6rem; opacity:0.2; text-transform:uppercase; font-weight:800; letter-spacing:1px;">NENHUMA CENA SALVA</div>
            </div>
          `}
        </div>
      </div>
    `;
  }

  public open() { this.isOpen = true; }
  public close() { this.isOpen = false; }
  public get openState() { return this.isOpen; }

  public bind(container: HTMLElement, state: any, _callbacks: any) {
    container.querySelector('.scene-load-close')?.addEventListener('click', () => {
      this.isOpen = false;
      (container as HTMLElement).style.display = 'none';
    });

    container.querySelectorAll('.scene-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        const scene = state.savedScenes[idx];
        if (scene) {
          state.worldMapObjects = scene.objects.map((o: any) => ({ ...o }));
          state.selectedId = null;
          state.selectedIds = [];
          document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
          this.isOpen = false;
          (container as HTMLElement).style.display = 'none';
          document.dispatchEvent(new CustomEvent('open-scene-save-dialog', { detail: { editingSceneId: scene.id, sceneName: scene.name } }));
        }
      });
    });

    container.querySelectorAll('.scene-apply-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        const scene = state.savedScenes[idx];
        if (scene) {
          document.dispatchEvent(new CustomEvent('apply-scene', { detail: { scene } }));
          this.isOpen = false;
          (container as HTMLElement).style.display = 'none';
        }
      });
    });

    container.querySelector('.scene-load-overlay')?.addEventListener('click', (e) => {
      if (e.target === container) {
        this.isOpen = false;
        (container as HTMLElement).style.display = 'none';
      }
    });

    // Listen for external requests to load a saved scene by index
    const self = this;
    window.addEventListener('load-scene', (ev: any) => {
      const idx = ev?.detail?.idx;
      const scene = state.savedScenes?.[idx];
      if (scene) {
        state.worldMapObjects = (scene.objects || []).map((o: any) => ({ ...o }));
        state.selectedId = null;
        state.selectedIds = [];
        state.currentTime = 0;
        if (_callbacks?.reRender) _callbacks.reRender();
        self.showToast('Cena carregada', '#4cff88');
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      }
    });
  }
}
