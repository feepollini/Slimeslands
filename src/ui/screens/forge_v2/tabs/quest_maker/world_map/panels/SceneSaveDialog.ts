export class SceneSaveDialog {
  private isOpen = false;
  private sceneName = '';
  private saveMode: 'local' | 'motions' | 'selected' = 'local';
  private saveAction: 'new' | 'overwrite' = 'new';
  private editingSceneId: string | null = null;

  public render(selectedSceneObj: any, allObjects: any[], existingScene?: any): string {
    const selectedIds = (allObjects as any)._selectedIds || [];
    const selectedObjs = selectedIds.length > 0
      ? allObjects.filter((o: any) => selectedIds.includes(o.id))
      : allObjects.filter((o: any) => !o.parentId);

    const sceneId = selectedSceneObj?.artboardId || selectedSceneObj?.id;
    const sceneObjects = selectedSceneObj
      ? allObjects.filter((o: any) => {
          if (o.type === 'camera' && o.id === sceneId) return true;
          return o.artboardId === sceneId || o.parentId === sceneId || o.parentId === selectedSceneObj?.id;
        })
      : selectedObjs;

    const isOverwrite = this.saveAction === 'overwrite' && existingScene;

    return `
      <div class="scene-save-overlay" style="
        position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75);
        z-index:9999; display:${this.isOpen ? 'flex' : 'none'}; align-items:center; justify-content:center;
      ">
        <div style="
          background:#111; border:1px solid #333; border-radius:12px; padding:24px;
          max-width:500px; width:90%; max-height:80vh; overflow-y:auto;
        ">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <span style="font-size:0.75rem; color:#51c5ff; font-weight:900; letter-spacing:1px;">${isOverwrite ? '✏️ SOBESCREVER CENA' : '💾 SALVAR CENA'}</span>
            <button class="scene-save-close" style="background:none; border:none; color:#fff; font-size:1.2rem; cursor:pointer;">✕</button>
          </div>

          <div style="margin-bottom:16px;">
            <div style="font-size:0.55rem; color:rgba(255,255,255,0.5); font-weight:900; margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">NOME DA CENA</div>
            <input type="text" class="scene-save-name" value="${this.sceneName}" placeholder="MINHA CENA..." style="
              width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.15); border-radius:6px;
              color:#51c5ff; font-size:0.7rem; padding:10px 12px; outline:none; font-weight:800; letter-spacing:0.5px; text-transform:uppercase;
            ">
          </div>

          <div style="margin-bottom:16px;">
            <div style="font-size:0.55rem; color:rgba(255,255,255,0.5); font-weight:900; margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">CONTEÚDO DA CENA (${sceneObjects.length} OBJETOS)</div>
            <div style="max-height:150px; overflow-y:auto; border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:6px;">
              ${sceneObjects.map((o: any) => `
                <div style="display:flex; align-items:center; gap:6px; padding:5px 6px; border-bottom:1px solid rgba(255,255,255,0.03);">
                  <span style="font-size:0.75rem;">${this.typeIcon(o.type)}</span>
                  <span style="font-size:0.6rem; color:#ddd; font-weight:700; text-transform:uppercase; letter-spacing:0.3px;">${o.label || o.type}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div style="margin-bottom:16px;">
            <div style="font-size:0.55rem; color:rgba(255,255,255,0.5); font-weight:900; margin-bottom:8px; letter-spacing:0.5px; text-transform:uppercase;">MODO DE SALVAMENTO</div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <button class="scene-save-mode" data-mode="local" style="
                padding:12px; border-radius:6px; cursor:pointer; text-align:center;
                background:${this.saveMode === 'local' ? 'rgba(81,197,255,0.15)' : 'rgba(255,255,255,0.03)'};
                border:1px solid ${this.saveMode === 'local' ? '#51c5ff66' : 'rgba(255,255,255,0.08)'};
                color:${this.saveMode === 'local' ? '#51c5ff' : 'rgba(255,255,255,0.4)'};
              ">
                <div style="font-size:0.65rem; font-weight:900; letter-spacing:0.5px;">💾 SALVAR LOCAL</div>
                <div style="font-size:0.45rem; opacity:0.6; margin-top:3px; text-transform:uppercase;">EXIBE NA POSIÇÃO ORIGINAL DO MAPA</div>
              </button>
              <button class="scene-save-mode" data-mode="motions" style="
                padding:12px; border-radius:6px; cursor:pointer; text-align:center;
                background:${this.saveMode === 'motions' ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)'};
                border:1px solid ${this.saveMode === 'motions' ? '#a78bfa66' : 'rgba(255,255,255,0.08)'};
                color:${this.saveMode === 'motions' ? '#a78bfa' : 'rgba(255,255,255,0.4)'};
              ">
                <div style="font-size:0.65rem; font-weight:900; letter-spacing:0.5px;">🎬 APENAS MOTIONS</div>
                <div style="font-size:0.45rem; opacity:0.6; margin-top:3px; text-transform:uppercase;">KEYFRAMES, TEMPO E ANIMAÇÕES — SEM POSIÇÃO</div>
              </button>
              <button class="scene-save-mode" data-mode="selected" style="
                padding:12px; border-radius:6px; cursor:pointer; text-align:center;
                background:${this.saveMode === 'selected' ? 'rgba(76,255,136,0.15)' : 'rgba(255,255,255,0.03)'};
                border:1px solid ${this.saveMode === 'selected' ? '#4cff8866' : 'rgba(255,255,255,0.08)'};
                color:${this.saveMode === 'selected' ? '#4cff88' : 'rgba(255,255,255,0.4)'};
              ">
                <div style="font-size:0.65rem; font-weight:900; letter-spacing:0.5px;">✅ APENAS SELECIONADOS</div>
                <div style="font-size:0.45rem; opacity:0.6; margin-top:3px; text-transform:uppercase;">SALVA AS CAMADAS SELECIONADAS COM SUAS AÇÕES</div>
              </button>
            </div>
          </div>

          ${isOverwrite ? `
            <div style="margin-bottom:16px; padding:10px; background:rgba(255,215,0,0.08); border:1px solid rgba(255,215,0,0.2); border-radius:6px;">
              <div style="font-size:0.55rem; color:#ffd700; font-weight:900; margin-bottom:4px; text-transform:uppercase;">⚠️ SOBESCREVENDO: ${existingScene.name}</div>
              <div style="font-size:0.45rem; color:rgba(255,255,255,0.4); text-transform:uppercase;">A CENA EXISTENTE SERÁ SUBSTITUÍDA</div>
            </div>
          ` : ''}

          <div style="display:flex; gap:6px;">
            <button class="scene-save-action" data-action="new" style="
              flex:1; padding:12px; background:rgba(76,255,136,0.15); border:1px solid rgba(76,255,136,0.3);
              border-radius:6px; color:#4cff88; font-size:0.65rem; font-weight:900; cursor:pointer;
              letter-spacing:0.5px; text-transform:uppercase;
            ">✨ NOVA CENA</button>
            <button class="scene-save-confirm" style="
              flex:1; padding:12px; background:rgba(81,197,255,0.2); border:1px solid rgba(81,197,255,0.4);
              border-radius:6px; color:#51c5ff; font-size:0.65rem; font-weight:900; cursor:pointer;
              letter-spacing:0.5px; text-transform:uppercase;
            ">${isOverwrite ? '✏️ SOBESCREVER' : '💾 SALVAR'}</button>
          </div>
        </div>
      </div>
    `;
  }

  private typeIcon(type: string): string {
    const icons: any = { camera: '📷', morph: '🖼️', collision: '🧱', sensor: '📡', area_sensor: '◫', area: '⬜', vector: '🖊️', player: '👤', group: '📂' };
    return icons[type] || '⬡';
  }

  public open(sceneName: string = '', editingSceneId: string | null = null) {
    this.sceneName = sceneName;
    this.saveMode = 'local';
    this.saveAction = 'new';
    this.editingSceneId = editingSceneId;
    this.isOpen = true;
  }

  public close() {
    this.isOpen = false;
    this.editingSceneId = null;
  }

  public get openState() { return this.isOpen; }
  public get editingId() { return this.editingSceneId; }

  public bind(container: HTMLElement, state: any, callbacks: any) {
    // Lightweight toast helper
    const showToast = (msg: string, color: string = '#4cff88') => {
      const t = document.createElement('div');
      t.textContent = msg;
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
    };
    container.querySelector('.scene-save-close')?.addEventListener('click', () => {
      this.isOpen = false;
      this.editingSceneId = null;
      (container as HTMLElement).style.display = 'none';
    });

    const nameInput = container.querySelector('.scene-save-name') as HTMLInputElement;
    if (nameInput) {
      nameInput.addEventListener('input', () => { this.sceneName = nameInput.value; });
      nameInput.focus();
    }

    container.querySelectorAll('.scene-save-mode').forEach(btn => {
      btn.addEventListener('click', () => {
        this.saveMode = (btn as HTMLElement).dataset.mode as 'local' | 'motions' | 'selected';
        // Re-render dialog content
        const parent = container.parentElement;
        if (parent) {
          const html = this.render(null, state.worldMapObjects || []);
          const temp = document.createElement('div');
          temp.innerHTML = html;
          const newOverlay = temp.querySelector('.scene-save-overlay');
          if (newOverlay) {
            parent.replaceChild(newOverlay, container);
            this.bind(newOverlay as HTMLElement, state, callbacks);
          }
        }
      });
    });

    container.querySelector('.scene-save-action')?.addEventListener('click', () => {
      this.saveAction = 'new';
      this.editingSceneId = null;
      const parent = container.parentElement;
      if (parent) {
        const html = this.render(null, state.worldMapObjects || []);
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const newOverlay = temp.querySelector('.scene-save-overlay');
        if (newOverlay) {
          parent.replaceChild(newOverlay, container);
          this.bind(newOverlay as HTMLElement, state, callbacks);
        }
      }
    });

    container.querySelector('.scene-save-confirm')?.addEventListener('click', () => {
      if (!state.savedScenes) state.savedScenes = [];
      const objects = state.worldMapObjects || [];
      const selectedIds = state.selectedIds || [];
      let sceneObjects: any[];
      const selectedObjs = objects.filter((o: any) => selectedIds.includes(o.id));
      if (this.saveMode === 'selected' && selectedObjs.length > 0) {
        sceneObjects = selectedObjs;
      } else {
        const selectedId = state.selectedId || selectedIds[0];
        const selectedObj = objects.find((o: any) => o.id === selectedId);
        const sceneId = selectedObj?.artboardId || selectedObj?.id;
        sceneObjects = objects.filter((o: any) => {
          if (o.type === 'camera' && o.id === sceneId) return true;
          return o.artboardId === sceneId || o.parentId === sceneId || o.parentId === selectedObj?.id;
        });
        if (sceneObjects.length === 0) sceneObjects = selectedObjs.length > 0 ? selectedObjs : objects.filter((o: any) => !o.parentId);
      }
      const isMotions = this.saveMode === 'motions';
      const sceneDef = {
        id: this.editingSceneId || ('scene_' + Date.now()),
        name: this.sceneName || 'Cena ' + new Date().toLocaleString(),
        saveMode: this.saveMode, savedAt: Date.now(),
        objects: sceneObjects.map((o: any) => {
          const def: any = { id: o.id, type: o.type, label: o.label, assetUrl: o.assetUrl || null, linkMorphAsset: o.linkMorphAsset || null, keyframes: o.keyframes || null, isPersistent: o.isPersistent || false, startTime: o.startTime ?? 0, duration: o.duration ?? 5, opacity: o.opacity ?? 1, rotation: o.rotation || 0, collisionMode: o.collisionMode || null, navType: o.navType || null, sensorTrigger: o.sensorTrigger || null, sensorRadius: o.sensorRadius || null, shape: o.shape || null, points: o.points || null, parentId: o.parentId || null, groupId: o.groupId || null };
          if (!isMotions) { def.x = o.x; def.y = o.y; def.w = o.w; def.h = o.h; }
          return def;
        }),
      };
      if (this.editingSceneId) {
        const idx = state.savedScenes.findIndex((s: any) => s.id === this.editingSceneId);
        if (idx !== -1) state.savedScenes[idx] = sceneDef;
        else state.savedScenes.push(sceneDef);
      } else {
        state.savedScenes.push(sceneDef);
      }
      objects.forEach((o: any) => { if (o.keyframes) o.keyframes = {}; });
      // Persist scenes to localStorage for reliability across sessions
      try {
        const toStore = state.savedScenes || [];
        localStorage.setItem('forge_scenes', JSON.stringify(toStore));
      } catch (e) {
        // ignore storage errors
      }
      this.isOpen = false;
      this.editingSceneId = null;
      (container as HTMLElement).style.display = 'none';
      callbacks.reRender();
      showToast('Cena salva localmente', '#51c5ff');
    });

    container.querySelector('.scene-save-overlay')?.addEventListener('click', (e) => {
      if (e.target === container) {
        this.isOpen = false;
        this.editingSceneId = null;
        (container as HTMLElement).style.display = 'none';
      }
    });
  }
}
