export class StampPanel {
  constructor() {}

  public render(state: any, _callbacks: any): string {
    const sb = state.stampBrush || {};
    const assets = state.availableCards || [];
    const scenes = state.savedScenes || [];
    const activeTab = state.stampTab || 'config';

    return `
      <div style="padding:12px; height:100%; display:flex; flex-direction:column; background:#0a0a0f;">
        <div style="font-size:0.65rem; color:#51c5ff; font-weight:900; margin-bottom:10px; letter-spacing:1px; text-transform:uppercase;">🔖 PINCEL DE CARIMBO</div>

        <!-- Tabs -->
        <div style="display:flex; gap:3px; margin-bottom:10px;">
          <button class="stamp-tab-btn" data-tab="config" style="
            flex:1; padding:5px 4px; border-radius:4px; cursor:pointer; font-size:0.5rem; font-weight:900;
            background:${activeTab === 'config' ? 'rgba(81,197,255,0.15)' : 'transparent'};
            color:${activeTab === 'config' ? '#51c5ff' : 'rgba(255,255,255,0.35)'};
            border:1px solid ${activeTab === 'config' ? '#51c5ff44' : 'transparent'};
          ">⚙️ CONFIGURAR</button>
          <button class="stamp-tab-btn" data-tab="scenes" style="
            flex:1; padding:5px 4px; border-radius:4px; cursor:pointer; font-size:0.5rem; font-weight:900;
            background:${activeTab === 'scenes' ? 'rgba(81,197,255,0.15)' : 'transparent'};
            color:${activeTab === 'scenes' ? '#51c5ff' : 'rgba(255,255,255,0.35)'};
            border:1px solid ${activeTab === 'scenes' ? '#51c5ff44' : 'transparent'};
          ">🎬 CENAS</button>
          <button class="stamp-tab-btn" data-tab="presets" style="
            flex:1; padding:5px 4px; border-radius:4px; cursor:pointer; font-size:0.5rem; font-weight:900;
            background:${activeTab === 'presets' ? 'rgba(81,197,255,0.15)' : 'transparent'};
            color:${activeTab === 'presets' ? '#51c5ff' : 'rgba(255,255,255,0.35)'};
            border:1px solid ${activeTab === 'presets' ? '#51c5ff44' : 'transparent'};
          ">💾 PRESETS</button>
        </div>

        ${activeTab === 'config' ? `
        <div style="flex:1; overflow-y:auto;">
          <!-- Preview -->
          <div style="margin-bottom:10px;">
            <div style="font-size:0.5rem; color:rgba(255,255,255,0.5); font-weight:900; margin-bottom:4px; text-transform:uppercase;">CARIMBO ATUAL</div>
            ${sb.stampUrl ? `
              <div style="width:100%; height:60px; border-radius:6px; background:url('${sb.stampUrl}') center/contain no-repeat; border:1px solid rgba(255,255,255,0.1); background-color:rgba(255,255,255,0.02);"></div>
            ` : `
              <div style="width:100%; height:60px; border-radius:6px; border:1px dashed rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center;">
                <span style="font-size:0.5rem; color:rgba(255,255,255,0.2); text-transform:uppercase;">Nenhum carimbo</span>
              </div>
            `}
          </div>

          <!-- Import PNG -->
          <div style="margin-bottom:10px;">
            <button class="stamp-import-btn" style="
              width:100%; padding:8px; background:rgba(81,197,255,0.1); border:1px solid rgba(81,197,255,0.3);
              border-radius:6px; color:#51c5ff; font-size:0.55rem; font-weight:900; cursor:pointer;
              text-transform:uppercase; letter-spacing:0.5px;
            ">📂 IMPORTAR PNG LOCAL</button>
          </div>

          <!-- Asset Grid -->
          <div style="margin-bottom:10px;">
            <div style="font-size:0.5rem; color:rgba(255,255,255,0.5); font-weight:900; margin-bottom:4px; text-transform:uppercase;">ASSETS DISPONÍVEIS</div>
            <div style="display:flex; flex-wrap:wrap; gap:4px; max-height:100px; overflow-y:auto;">
              ${assets.map((a:any) => `
                <div class="stamp-asset-item" data-url="${a}" style="
                  width:calc(25% - 3px); aspect-ratio:1/1; border-radius:4px; cursor:pointer;
                  background:url('${a}') center/cover; border:2px solid ${sb.stampUrl === a ? '#51c5ff' : 'rgba(255,255,255,0.08)'};
                "></div>
              `).join('')}
              ${assets.length === 0 ? '<div style="font-size:0.45rem; opacity:0.3; text-align:center; width:100%; padding:10px;">Nenhum asset</div>' : ''}
            </div>
          </div>

          <!-- Parameters -->
          <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:10px;">
            <div style="font-size:0.5rem; color:rgba(255,255,255,0.5); font-weight:900; margin-bottom:8px; text-transform:uppercase;">PARÂMETROS</div>

            <div style="margin-bottom:6px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                <span style="font-size:0.45rem; color:rgba(255,255,255,0.4);">Opacidade</span>
                <span style="font-size:0.45rem; color:#51c5ff; font-weight:800;">${Math.round((sb.opacity ?? 1) * 100)}%</span>
              </div>
              <input type="range" class="stamp-param" data-param="opacity" min="0" max="100" value="${Math.round((sb.opacity ?? 1) * 100)}" style="width:100%; accent-color:#51c5ff; height:3px;">
            </div>
            <div style="margin-bottom:6px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                <span style="font-size:0.45rem; color:rgba(255,255,255,0.4);">Tamanho</span>
                <span style="font-size:0.45rem; color:#51c5ff; font-weight:800;">${sb.size ?? 50}px</span>
              </div>
              <input type="range" class="stamp-param" data-param="size" min="10" max="500" value="${sb.size ?? 50}" style="width:100%; accent-color:#51c5ff; height:3px;">
            </div>
            <div style="margin-bottom:6px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                <span style="font-size:0.45rem; color:rgba(255,255,255,0.4);">Espaçamento</span>
                <span style="font-size:0.45rem; color:#51c5ff; font-weight:800;">${sb.spacing ?? 20}px</span>
              </div>
              <input type="range" class="stamp-param" data-param="spacing" min="5" max="200" value="${sb.spacing ?? 20}" style="width:100%; accent-color:#51c5ff; height:3px;">
            </div>
            <div style="margin-bottom:6px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                <span style="font-size:0.45rem; color:rgba(255,255,255,0.4);">Random Tamanho</span>
                <span style="font-size:0.45rem; color:#51c5ff; font-weight:800;">${sb.randomSize ?? 0}%</span>
              </div>
              <input type="range" class="stamp-param" data-param="randomSize" min="0" max="100" value="${sb.randomSize ?? 0}" style="width:100%; accent-color:#51c5ff; height:3px;">
            </div>
            <div style="margin-bottom:6px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                <span style="font-size:0.45rem; color:rgba(255,255,255,0.4);">Random Rotação</span>
                <span style="font-size:0.45rem; color:#51c5ff; font-weight:800;">${sb.randomRotation ?? 0}°</span>
              </div>
              <input type="range" class="stamp-param" data-param="randomRotation" min="0" max="360" value="${sb.randomRotation ?? 0}" style="width:100%; accent-color:#51c5ff; height:3px;">
            </div>

            <div style="display:flex; flex-direction:column; gap:3px;">
              <button class="stamp-toggle" data-toggle="randomMirrorX" style="
                padding:6px 8px; border-radius:4px; cursor:pointer; text-align:left;
                background:${sb.randomMirrorX ? 'rgba(81,197,255,0.15)' : 'rgba(255,255,255,0.03)'};
                border:1px solid ${sb.randomMirrorX ? '#51c5ff44' : 'rgba(255,255,255,0.06)'};
                color:${sb.randomMirrorX ? '#51c5ff' : 'rgba(255,255,255,0.35)'};
                font-size:0.5rem; font-weight:900;
              ">↔️ Espelhar X Aleatório ${sb.randomMirrorX ? '☑' : '☐'}</button>
              <button class="stamp-toggle" data-toggle="randomMirrorY" style="
                padding:6px 8px; border-radius:4px; cursor:pointer; text-align:left;
                background:${sb.randomMirrorY ? 'rgba(81,197,255,0.15)' : 'rgba(255,255,255,0.03)'};
                border:1px solid ${sb.randomMirrorY ? '#51c5ff44' : 'rgba(255,255,255,0.06)'};
                color:${sb.randomMirrorY ? '#51c5ff' : 'rgba(255,255,255,0.35)'};
                font-size:0.5rem; font-weight:900;
              ">↕️ Espelhar Y Aleatório ${sb.randomMirrorY ? '☑' : '☐'}</button>
            </div>
          </div>

          <!-- Save preset -->
          <div style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.06);">
            <input type="text" class="stamp-preset-name" placeholder="Nome do preset..." style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:#fff; font-size:0.5rem; padding:6px 8px; outline:none; margin-bottom:4px;">
            <button class="stamp-save-preset" style="width:100%; padding:6px; background:rgba(76,255,136,0.1); border:1px solid rgba(76,255,136,0.3); border-radius:4px; color:#4cff88; font-size:0.5rem; font-weight:900; cursor:pointer; text-transform:uppercase;">💾 SALVAR PRESET</button>
          </div>

          <!-- Clear -->
          <div style="margin-top:8px;">
            <button class="stamp-clear-btn" style="
              width:100%; padding:6px; background:rgba(255,51,102,0.1); border:1px solid rgba(255,51,102,0.2);
              border-radius:4px; color:#ff3366; font-size:0.5rem; font-weight:900; cursor:pointer;
              text-transform:uppercase;
            ">🗑️ LIMPAR CARIMBOS DO MAPA</button>
          </div>
        </div>
        ` : activeTab === 'scenes' ? `
        <div style="flex:1; overflow-y:auto;">
          <div style="font-size:0.5rem; color:rgba(255,255,255,0.5); font-weight:900; margin-bottom:6px; text-transform:uppercase;">CENAS SALVAS</div>
          ${scenes.length > 0 ? scenes.map((s: any, i: number) => `
            <div class="stamp-scene-item" data-idx="${i}" style="
              display:flex; align-items:center; gap:6px; padding:8px; margin-bottom:4px;
              background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06);
              border-radius:6px; cursor:pointer;
            ">
              <span style="font-size:0.8rem;">🎬</span>
              <div style="flex:1; min-width:0;">
                <div style="font-size:0.55rem; font-weight:900; color:#51c5ff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${s.name || 'Cena ' + (i+1)}</div>
                <div style="font-size:0.4rem; color:rgba(255,255,255,0.3);">${s.objects?.length || 0} objetos | ${s.saveMode || 'local'}</div>
              </div>
            </div>
          `).join('') : '<div style="font-size:0.5rem; opacity:0.3; text-align:center; padding:20px; text-transform:uppercase;">Nenhuma cena salva</div>'}
        </div>
        ` : `
        <div style="flex:1; overflow-y:auto;">
          <div style="font-size:0.5rem; color:rgba(255,255,255,0.5); font-weight:900; margin-bottom:6px; text-transform:uppercase;">PRESETS SALVOS</div>
          ${(state.stampPresets || []).length > 0 ? (state.stampPresets as any[]).map((p: any, i: number) => `
            <div class="stamp-preset-item" data-idx="${i}" style="
              display:flex; align-items:center; gap:6px; padding:8px; margin-bottom:4px;
              background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06);
              border-radius:6px; cursor:pointer;
            ">
              ${p.stampUrl ? `<div style="width:30px; height:30px; border-radius:4px; background:url('${p.stampUrl}') center/contain no-repeat; background-color:rgba(255,255,255,0.02); flex-shrink:0;"></div>` : '<div style="width:30px; height:30px; border-radius:4px; background:rgba(255,255,255,0.05); flex-shrink:0;"></div>'}
              <div style="flex:1; min-width:0;">
                <div style="font-size:0.55rem; font-weight:900; color:#51c5ff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.name || 'Preset ' + (i+1)}</div>
                <div style="font-size:0.4rem; color:rgba(255,255,255,0.3);">${p.size}px | ${Math.round((p.opacity||1)*100)}% opac</div>
              </div>
              <button class="stamp-preset-delete" data-idx="${i}" style="background:none; border:none; color:#ff3366; font-size:0.6rem; cursor:pointer; padding:0 4px;">✕</button>
            </div>
          `).join('') : '<div style="font-size:0.5rem; opacity:0.3; text-align:center; padding:20px; text-transform:uppercase;">Nenhum preset salvo</div>'}
        </div>
        `}
      </div>
    `;
  }

  public bind(container: HTMLElement, state: any, callbacks: any) {
    if (!state.stampBrush) {
      state.stampBrush = {
        stampUrl: '', opacity: 1, size: 50, spacing: 20,
        randomMirror: false, randomMirrorX: false, randomMirrorY: false,
        randomSize: 0, randomRotation: 0, stamps: []
      };
    }
    if (!state.stampPresets) state.stampPresets = [];
    const sb = state.stampBrush;

    // Tabs
    container.querySelectorAll('.stamp-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.stampTab = (btn as HTMLElement).dataset.tab;
        callbacks.reRender();
      });
    });

    // Import PNG
    container.querySelector('.stamp-import-btn')?.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev: any) => { sb.stampUrl = ev.target.result; document.dispatchEvent(new CustomEvent('stamp-brush-changed')); callbacks.reRender(); };
        reader.readAsDataURL(file);
      };
      input.click();
    });

    // Asset items
    container.querySelectorAll('.stamp-asset-item').forEach(item => {
      item.addEventListener('click', () => {
        sb.stampUrl = (item as HTMLElement).dataset.url!;
        sb.stampType = 'image';
        document.dispatchEvent(new CustomEvent('stamp-brush-changed'));
        callbacks.reRender();
      });
    });

    // Scene items
    container.querySelectorAll('.stamp-scene-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt((item as HTMLElement).dataset.idx!);
        const scene = state.savedScenes[idx];
        if (scene) {
          sb.stampType = 'scene';
          sb.stampSceneIdx = idx;
          sb.stampSceneName = scene.name;
          document.dispatchEvent(new CustomEvent('stamp-brush-changed'));
          callbacks.reRender();
        }
      });
    });

    // Params
    container.querySelectorAll('.stamp-param').forEach(slider => {
      slider.addEventListener('input', (e: any) => {
        const param = (e.currentTarget as HTMLElement).dataset.param!;
        sb[param] = parseFloat((e.currentTarget as HTMLInputElement).value);
        document.dispatchEvent(new CustomEvent('stamp-brush-changed'));
        callbacks.reRender();
      });
    });

    // Toggles
    container.querySelectorAll('.stamp-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const toggle = (btn as HTMLElement).dataset.toggle!;
        sb[toggle] = !sb[toggle];
        document.dispatchEvent(new CustomEvent('stamp-brush-changed'));
        callbacks.reRender();
      });
    });

    // Save preset
    container.querySelector('.stamp-save-preset')?.addEventListener('click', () => {
      const nameInput = container.querySelector('.stamp-preset-name') as HTMLInputElement;
      const preset = {
        name: nameInput?.value || ('Preset ' + (state.stampPresets.length + 1)),
        stampUrl: sb.stampUrl, opacity: sb.opacity, size: sb.size,
        spacing: sb.spacing, randomSize: sb.randomSize, randomRotation: sb.randomRotation,
        randomMirrorX: sb.randomMirrorX, randomMirrorY: sb.randomMirrorY,
      };
      state.stampPresets.push(preset);
      if (nameInput) nameInput.value = '';
      document.dispatchEvent(new CustomEvent('stamp-brush-changed'));
      callbacks.reRender();
    });

    // Preset items
    container.querySelectorAll('.stamp-preset-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.stamp-preset-delete')) return;
        const idx = parseInt((item as HTMLElement).dataset.idx!);
        const preset = state.stampPresets[idx];
        if (preset) {
          sb.stampUrl = preset.stampUrl;
          sb.opacity = preset.opacity;
          sb.size = preset.size;
          sb.spacing = preset.spacing;
          document.dispatchEvent(new CustomEvent('stamp-brush-changed'));
          callbacks.reRender();
        }
      });
    });

    // Preset delete
    container.querySelectorAll('.stamp-preset-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        state.stampPresets.splice(idx, 1);
        callbacks.reRender();
      });
    });

    // Clear stamps
    container.querySelector('.stamp-clear-btn')?.addEventListener('click', () => {
      sb.stamps = [];
      document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      callbacks.reRender();
    });
  }
}
