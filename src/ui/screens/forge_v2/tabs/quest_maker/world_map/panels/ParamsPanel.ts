import { KeyframeManager } from '../../../../../../shared/KeyframeManager';

export class ParamsPanel {
  private selectedObj: any = null;
  private currentTime: number = 0;
  private state: any = null;
  private showAssetPicker: string | null = null;

  public render(selectedObj: any, currentTime: number = 0, state: any = {}): string {
    this.selectedObj = selectedObj;
    this.currentTime = currentTime;
    this.state = state;

    if (!selectedObj) {
      return `<div style="padding:20px; text-align:center; opacity:0.3;">
        <div style="font-size:2rem; margin-bottom:10px;">⚙️</div>
        <div style="font-size:0.6rem;">Selecione um objeto</div>
      </div>`;
    }

    const row = (label: string, value: number, prop: string, min = -9999, max = 9999, step = 1, color = '#51c5ff') => `
      <div class="param-row" style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <span style="font-size:0.5rem; color:${color}; width:70px;">${label}</span>
        <input type="range" class="param-slider" data-prop="${prop}" min="${min}" max="${max}" step="${step}" value="${value}" style="flex:1;">
        <input type="number" class="param-num-input" data-prop="${prop}" value="${Math.round(value * 100) / 100}" style="width:50px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:#fff; font-size:0.55rem; padding:4px;">
      </div>
    `;

    const checkboxRow = (label: string, checked: boolean, prop: string, color = '#51c5ff') => `
      <div class="param-row" style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <span style="font-size:0.5rem; color:${color}; width:70px;">${label}</span>
        <input type="checkbox" class="param-checkbox" data-prop="${prop}" ${checked ? 'checked' : ''} style="width:16px; height:16px;">
      </div>
    `;

    const selectRow = (label: string, value: string, prop: string, options: {value:string, label:string}[]) => `
      <div class="param-row" style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <span style="font-size:0.5rem; color:#51c5ff; width:70px;">${label}</span>
        <select class="param-select" data-prop="${prop}" style="flex:1; background:rgba(0,0,0,0.4); border:1px solid rgba(81,197,255,0.2); border-radius:4px; color:#fff; font-size:0.55rem; padding:4px;">
          ${options.map(o => `<option value="${o.value}" ${o.value === value ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </div>
    `;

    const assetPickerPopup = (prop: string) => {
      const activeTab = this.state._assetPickerTab || 'library';
      const assets = this.state.availableCards || [];
      const packs = this.state.customSpritePacks || [];
      const gallery = this.state.customGallerySprites || [];

      return `
        <div class="asset-picker-overlay" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:10000; display:flex; align-items:center; justify-content:center; animation: fadeIn 0.3s ease;">
          <div style="background:linear-gradient(180deg, #111118 0%, #08080c 100%); border:1px solid rgba(255,215,0,0.25); border-radius:16px; padding:0; width:90%; max-width:1000px; height:85vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 30px 90px rgba(0,0,0,0.8);">
            
            <!-- HEADER & TABS -->
            <div style="padding:20px 24px; border-bottom:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.02); display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; align-items:center; gap:16px;">
                <span style="font-size:0.7rem; color:#ffd700; font-weight:900; letter-spacing:2px;">🎨 STUDIO ASSETS</span>
                <div style="height:20px; width:1px; background:rgba(255,255,255,0.1);"></div>
                <div style="display:flex; gap:6px; background:rgba(0,0,0,0.4); padding:4px; border-radius:8px;">
                  <button class="picker-tab-btn ${activeTab === 'library' ? 'active' : ''}" data-tab="library" style="padding:6px 12px; border-radius:6px; border:none; background:${activeTab === 'library' ? '#51c5ff' : 'transparent'}; color:${activeTab === 'library' ? '#000' : '#888'}; font-size:0.55rem; font-weight:900; cursor:pointer;">BIBLIOTECA</button>
                  <button class="picker-tab-btn ${activeTab === 'packs' ? 'active' : ''}" data-tab="packs" style="padding:6px 12px; border-radius:6px; border:none; background:${activeTab === 'packs' ? '#ffd700' : 'transparent'}; color:${activeTab === 'packs' ? '#000' : '#888'}; font-size:0.55rem; font-weight:900; cursor:pointer;">SPRITE PACKS</button>
                  <button class="picker-tab-btn ${activeTab === 'gallery' ? 'active' : ''}" data-tab="gallery" style="padding:6px 12px; border-radius:6px; border:none; background:${activeTab === 'gallery' ? '#ff8c42' : 'transparent'}; color:${activeTab === 'gallery' ? '#000' : '#888'}; font-size:0.55rem; font-weight:900; cursor:pointer;">GALLERY</button>
                </div>
              </div>
              <button class="close-picker-btn" style="background:rgba(255,255,255,0.05); border:none; border-radius:50%; width:32px; height:32px; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
            </div>

            <!-- SEARCH / FILTERS (Optional simplified) -->
            <div style="padding:10px 24px; background:rgba(0,0,0,0.2); border-bottom:1px solid rgba(255,255,255,0.05); display:flex; gap:10px;">
                <input type="text" placeholder="Filtrar assets..." style="flex:1; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:#fff; font-size:0.55rem; padding:6px 10px;">
            </div>

            <!-- CONTENT -->
            <div style="flex:1; overflow-y:auto; padding:24px;" class="custom-scroll">
              
              ${activeTab === 'library' ? `
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:12px;">
                  ${assets.length === 0 ? '<div style="grid-column:1/-1; text-align:center; opacity:0.3; padding:60px;">Vazio</div>' : ''}
                  ${assets.map((url: string) => `
                    <div class="picker-asset-item" data-url="${url}" data-prop="${prop}" style="aspect-ratio:1; background:#000; border-radius:10px; overflow:hidden; cursor:pointer; border:2px solid transparent; transition:0.2s; position:relative;">
                      <img src="${url}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23333%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Crect x=%273%27 y=%273%27 width=%2718%27 height=%2718%27 rx=%272%27 ry=%272%27%3E%3C/rect%3E%3Ccircle cx=%278.5%27 cy=%278.5%27 r=%271.5%27%3E%3C/circle%3E%3Cpolyline points=%2721 15 16 10 5 21%27%3E%3C/polyline%3E%3C/svg%3E';">
                      <div style="position:absolute; bottom:0; left:0; width:100%; background:rgba(0,0,0,0.6); padding:4px; font-size:0.4rem; color:#fff; text-align:center;">${url.split('/').pop()?.slice(0, 15)}...</div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              ${activeTab === 'packs' ? `
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:16px;">
                  ${packs.length === 0 ? '<div style="grid-column:1/-1; text-align:center; opacity:0.3; padding:60px;">Nenhum pack de sprites salvo.</div>' : ''}
                  ${packs.map((p: any) => {
                    let preview = '';
                    if (p.actions && p.actions.length > 0) {
                      const firstAction = p.actions[0];
                      const firstSlot = firstAction.directions?.down || firstAction.directions?.up || firstAction.directions?.left || firstAction.directions?.right;
                      if (firstSlot) preview = firstSlot.gifUrl || (firstSlot.frames && firstSlot.frames.length > 0 ? firstSlot.frames[0] : '');
                    }
                    return `
                      <div class="picker-pack-item" data-id="${p.id}" data-prop="${prop}" style="background:rgba(255,215,0,0.03); border:1px solid rgba(255,215,0,0.15); border-radius:12px; padding:15px; cursor:pointer;">
                        <div style="height:100px; background:rgba(0,0,0,0.4); border-radius:8px; margin-bottom:12px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                          ${preview ? `<img src="${preview}" style="max-width:80%; max-height:80%; image-rendering:pixelated; transform:scale(1.5);" onerror="this.parentElement.innerHTML='<span style=%22font-size:2rem; opacity:0.1;%22>🎬</span>'">` : `<span style="font-size:2rem; opacity:0.1;">🎬</span>`}
                        </div>
                        <div style="font-size:0.45rem; color:#ffd700; font-weight:900; margin-bottom:4px;">${p.isPreset ? 'NPC PRESET' : 'SPRITE PACK'}</div>
                        <div style="font-size:0.75rem; color:#fff; font-weight:900;">${p.name}</div>
                        <div style="font-size:0.55rem; color:#555; margin-top:4px;">${p.actions?.length || 0} Ações / Sequências</div>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : ''}

              ${activeTab === 'gallery' ? `
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:16px;">
                  ${gallery.length === 0 ? '<div style="grid-column:1/-1; text-align:center; opacity:0.3; padding:60px;">Galeria de pixels vazia.</div>' : ''}
                  ${gallery.map((g: any) => `
                    <div class="picker-asset-item" data-url="${g.previewUrl}" data-prop="${prop}" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:12px; overflow:hidden; cursor:pointer;">
                      <div style="height:140px; background:#000; display:flex; align-items:center; justify-content:center;">
                        <img src="${g.previewUrl}" style="max-width:80%; max-height:80%; image-rendering:pixelated; transform:scale(2.5);" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23333%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M12 19l7-7 3 3-7 7-3-3z%27%3E%3C/path%3E%3Cpath d=%27M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z%27%3E%3C/path%3E%3Cpath d=%27M2 2l7.586 7.586%27%3E%3C/path%3E%3Ccircle cx=%2711%27 cy=%2711%27 r=%272%27%3E%3C/circle%3E%3C/svg%3E';">
                      </div>
                      <div style="padding:10px; text-align:center;">
                        <div style="font-size:0.65rem; color:#fff; font-weight:900;">${g.name}</div>
                        <div style="font-size:0.5rem; color:#555;">${g.type?.toUpperCase()} ASSET</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

            </div>
          </div>
        </div>
      `;
    };

    const assetSection = (title: string, prop: string, currentUrl: string) => {
      return `
        <div style="margin-bottom:16px;">
          <div style="font-size:0.5rem; color:#ffd700; font-weight:900; letter-spacing:1px; margin-bottom:6px;">${title}</div>
          <button class="param-asset-btn" data-prop="${prop}" style="
            width:100%; padding:12px; background:rgba(0,0,0,0.3); border:1px dashed rgba(255,215,0,0.3);
            border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:8px;
          ">
            <span style="font-size:0.5rem; color:#ffd700;">📁</span>
            <span style="font-size:0.5rem; color:#888;">${currentUrl ? 'ALTERAR ASSET' : 'SELECIONAR ASSET'}</span>
          </button>
          ${currentUrl ? `
            <div style="width:100%; height:80px; border-radius:6px; background:url('${currentUrl}') center/cover; border:1px solid rgba(255,215,0,0.3); margin-top:8px;"></div>
            <button class="param-remove-asset" data-prop="${prop}" style="margin-top:4px; padding:4px; background:none; border:none; color:#ff4444; font-size:0.45rem; cursor:pointer;">✕ Remover</button>
          ` : ''}
          ${this.showAssetPicker === prop ? assetPickerPopup(prop) : ''}
        </div>
      `;
    };

    const eventEditorSection = () => {
      if (selectedObj.type !== 'area_sensor') return '';
      
      return `
        <div class="param-section" style="margin-bottom:16px; border:1px solid rgba(68,204,255,0.2); border-radius:8px; padding:10px; background:rgba(0,0,0,0.2);">
          <div style="font-size:0.5rem; color:#44ccff; font-weight:900; letter-spacing:1px; margin-bottom:8px;">⚡ EVENTOS DO SENSOR</div>
          <div style="font-size:0.45rem; color:#888; margin-bottom:8px; padding:8px; background:rgba(0,0,0,0.3); border-radius:4px;">
            Configure os eventos na aba <span style="color:#a78bfa; font-weight:900;">MULTI-ESTADOS (A4)</span>
          </div>
          
          <div style="margin-bottom:10px;">
            <div style="font-size:0.5rem; color:#888; margin-bottom:4px;">FORMA</div>
            <select class="sensor-shape-select" data-prop="shape" style="width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(68,204,255,0.2); border-radius:4px; color:#fff; font-size:0.6rem; padding:6px;">
              <option value="rect" ${selectedObj.shape === 'rect' ? 'selected' : ''}>Retângulo</option>
              <option value="circle" ${selectedObj.shape === 'circle' ? 'selected' : ''}>Círculo</option>
              <option value="capsule" ${selectedObj.shape === 'capsule' ? 'selected' : ''}>Cápsula</option>
              <option value="triangle" ${selectedObj.shape === 'triangle' ? 'selected' : ''}>Triângulo</option>
            </select>
          </div>

          <div style="margin-bottom:10px;">
            <div style="font-size:0.5rem; color:#888; margin-bottom:4px;">TIPO DE TRIGGER</div>
            <select class="sensor-trigger-select" data-prop="sensorTrigger" style="width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(68,204,255,0.2); border-radius:4px; color:#fff; font-size:0.6rem; padding:6px;">
              <option value="onEnter" ${selectedObj.sensorTrigger === 'onEnter' ? 'selected' : ''}>On Enter - Ao Entrar</option>
              <option value="onExit" ${selectedObj.sensorTrigger === 'onExit' ? 'selected' : ''}>On Exit - Ao Sair</option>
              <option value="onStay" ${selectedObj.sensorTrigger === 'onStay' ? 'selected' : ''}>On Stay - Enquanto Estiver</option>
            </select>
          </div>

          <div style="margin-bottom:10px;">
            <div style="font-size:0.5rem; color:#888; margin-bottom:4px;">RAIO DO SENSOR</div>
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="range" class="param-slider" data-prop="sensorRadius" min="20" max="1000" value="${selectedObj.sensorRadius || 120}" style="flex:1;">
              <input type="number" class="param-num-input" data-prop="sensorRadius" value="${selectedObj.sensorRadius || 120}" style="width:50px; background:rgba(0,0,0,0.4); border:1px solid rgba(68,204,255,0.2); border-radius:4px; color:#fff; font-size:0.55rem; padding:4px;">
            </div>
          </div>
        </div>
      `;
    };

    const gameplaySection = () => {
      if (selectedObj.type === 'player') {
        return `
          <div class="param-section" style="margin-bottom:16px; border:1px solid rgba(76,255,136,0.2); border-radius:8px; padding:10px; background:rgba(0,0,0,0.2);">
            <div style="font-size:0.5rem; color:#4cff88; font-weight:900; letter-spacing:1px; margin-bottom:10px;">🎮 PROPRIEDADES DO JOGADOR</div>
            ${row('Velocidade', selectedObj.charData?.moveSpeed || 3, 'moveSpeed', 1, 20, 0.5, '#4cff88')}
            ${checkboxRow('Pode Pular', selectedObj.charData?.canJump !== false, 'canJump', '#4cff88')}
            ${checkboxRow('Invisível', selectedObj.isVisible === false, 'isVisible', '#4cff88')}
          </div>
        `;
      }

      if (selectedObj.type === 'morph' || selectedObj.type === 'image') {
        return `
          <div class="param-section" style="margin-bottom:16px; border:1px solid rgba(167,139,250,0.2); border-radius:8px; padding:10px; background:rgba(0,0,0,0.2);">
            <div style="font-size:0.5rem; color:#a78bfa; font-weight:900; letter-spacing:1px; margin-bottom:10px;">🎬 ANIMAÇÃO DO SPRITE</div>
            ${selectRow('Tipo de Animação', selectedObj.animationType || 'static', 'animationType', [
              {value: 'static', label: 'Estático'},
              {value: 'loop', label: 'Loop Contínuo'},
              {value: 'once', label: 'Uma Vez'},
            ])}
            ${row('FPS', selectedObj.fps || 12, 'fps', 1, 60, 1, '#a78bfa')}
            ${row('Frames', selectedObj.frameCount || 1, 'frameCount', 1, 60, 1, '#a78bfa')}
          </div>
        `;
      }

      if (selectedObj.type === 'collision') {
        return `
          <div class="param-section" style="margin-bottom:16px; border:1px solid rgba(255,68,68,0.2); border-radius:8px; padding:10px; background:rgba(0,0,0,0.2);">
            <div style="font-size:0.5rem; color:#ff4444; font-weight:900; letter-spacing:1px; margin-bottom:10px;">🧱 PROPRIEDADES DE COLISÃO</div>
            ${selectRow('Forma', selectedObj.shape || 'rect', 'shape', [
              {value: 'rect', label: 'Retângulo'},
              {value: 'circle', label: 'Círculo'},
              {value: 'capsule', label: 'Cápsula'},
              {value: 'triangle', label: 'Triângulo'},
            ])}
            ${selectRow('Resposta de Colisão', selectedObj.collisionResponse || 'stop', 'collisionResponse', [
              {value: 'stop', label: 'Parar (Stop)'},
              {value: 'slide', label: 'Deslizar (Slide)'},
              {value: 'bounce', label: 'Quicar (Bounce)'},
            ])}
            ${checkboxRow('É Caminhável', selectedObj.navType === 'walkable', 'isWalkable', '#ff4444')}
            ${checkboxRow('É Plataforma', selectedObj.isPlatform === true, 'isPlatform', '#ff4444')}
          </div>
        `;
      }

      if (selectedObj.type === 'area_sensor') {
        return eventEditorSection();
      }

      return '';
    };

    return `
      <div style="padding:12px; height:100%; overflow-y:auto; background: #0a0a0f;">
        <div style="font-size:0.6rem; color:#51c5ff; font-weight:900; margin-bottom:16px; letter-spacing:2px; opacity:0.9; text-transform:uppercase; border-left:3px solid #51c5ff; padding-left:8px;">
          ${selectedObj.label || selectedObj.type?.toUpperCase() || 'PROPERTIES'}
        </div>

        ${selectedObj.type === 'morph' || selectedObj.type === 'player' || selectedObj.type === 'image' ? assetSection('ASSET VISUAL', 'assetUrl', selectedObj.assetUrl || '') : ''}

        ${gameplaySection()}

        <div style="font-size:0.55rem; color:#666; font-weight:900; margin: 16px 0 8px 0; letter-spacing:1px; text-transform:uppercase; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:4px;">
          TRANSFORMAÇÃO
        </div>
        ${row('Posição X', selectedObj.x, 'x', -2000, 4000)}
        ${row('Posição Y', selectedObj.y, 'y', -2000, 4000)}
        ${row('Largura', selectedObj.w, 'w', 0, 4000)}
        ${row('Altura', selectedObj.h, 'h', 0, 4000)}
        ${row('Rotação', selectedObj.rotation || 0, 'rotation', -360, 360, 1)}
        ${row('Opacidade', selectedObj.opacity ?? 1, 'opacity', 0, 100)}

        ${selectedObj.type === 'morph' || selectedObj.type === 'player' ? `
          <div style="margin-top:16px; padding:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px;">
            <div style="font-size:0.5rem; color:rgba(255,255,255,0.4); font-weight:800; margin-bottom:6px;">ADICIONAR PRIMAL</div>
            <div style="display:flex; gap:4px;">
              <button class="add-primal-btn" data-type="collision" style="
                flex:1; padding:6px; background:rgba(255,68,68,0.1); border:1px solid rgba(255,68,68,0.3);
                border-radius:4px; color:#ff4444; font-size:0.5rem; font-weight:900; cursor:pointer;
              ">🧱 Colisão</button>
              <button class="add-primal-btn" data-type="area_sensor" style="
                flex:1; padding:6px; background:rgba(68,204,255,0.1); border:1px solid rgba(68,204,255,0.3);
                border-radius:4px; color:#44ccff; font-size:0.5rem; font-weight:900; cursor:pointer;
              ">◫ Sensor</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  public bind(container: HTMLElement, onUpdate: (props: any) => void, onToggleKeyframe: (prop: string) => void) {
    const obj = this.selectedObj;
    if (!obj) return;

    container.querySelectorAll('.param-num-input').forEach(input => {
       input.addEventListener('change', (e: any) => {
          const prop = input.getAttribute('data-prop')!;
          let val = parseFloat(e.target.value);
          if (prop === 'opacity') val /= 100;
          
          if (['x', 'y', 'w', 'h', 'rotation'].includes(prop)) {
            document.dispatchEvent(new CustomEvent('worldmap-request-property-update', { detail: { id: obj.id, prop, value: val } }));
          } else {
            KeyframeManager.setValue(obj, prop, val, this.currentTime);
            onUpdate({ [prop]: val });
          }
       });
    });

    container.querySelectorAll('.param-slider').forEach(slider => {
       slider.addEventListener('input', (e: any) => {
          const prop = slider.getAttribute('data-prop')!;
          let val = parseFloat(e.target.value);
          const rowEl = slider.closest('.param-row');
          const numInput = rowEl?.querySelector('.param-num-input') as HTMLInputElement;
          if (numInput) numInput.value = Math.round(val).toString();
          if (prop === 'opacity') val /= 100;
          
          if (['x', 'y', 'w', 'h', 'rotation'].includes(prop)) {
            document.dispatchEvent(new CustomEvent('worldmap-request-property-update', { detail: { id: obj.id, prop, value: val } }));
          } else {
            KeyframeManager.setValue(obj, prop, val, this.currentTime);
            onUpdate({ [prop]: val });
          }
       });
    });

    container.querySelectorAll('.param-select').forEach(select => {
       select.addEventListener('change', (e: any) => {
          const prop = select.getAttribute('data-prop')!;
          const val = e.target.value;
          if (prop === 'moveSpeed' || prop === 'canJump') {
            if (!obj.charData) obj.charData = {};
            obj.charData[prop] = prop === 'moveSpeed' ? parseFloat(val) : val === 'true';
            onUpdate({ charData: obj.charData });
          } else {
            onUpdate({ [prop]: val });
          }
       });
    });

    container.querySelectorAll('.param-checkbox').forEach(checkbox => {
       checkbox.addEventListener('change', (e: any) => {
          const prop = checkbox.getAttribute('data-prop')!;
          const val = (e.target as HTMLInputElement).checked;
          if (prop === 'moveSpeed' || prop === 'canJump') {
            if (!obj.charData) obj.charData = {};
            obj.charData[prop] = val;
            onUpdate({ charData: obj.charData });
          } else {
            onUpdate({ [prop]: val });
          }
       });
    });

    container.querySelectorAll('.param-keyframe-toggle').forEach(btn => {
       btn.addEventListener('click', () => {
          const prop = btn.getAttribute('data-prop')!;
          const currentValue = obj[prop] ?? 0;
          KeyframeManager.toggleProperty(obj, prop, currentValue);
          onToggleKeyframe(prop);
       });
    });

    container.querySelectorAll('.add-primal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const primalType = (btn as HTMLElement).dataset.type!;
        const type = primalType === 'collision' ? 'collision' : 'area_sensor';
        const color = primalType === 'collision' ? '#ff4444' : '#44ccff';
        const label = primalType === 'collision' ? 'Colisão' : 'Sensor de Área';
        const obj = this.selectedObj;
        if (!obj) return;

        const primalId = `${primalType}_${Date.now()}`;
        const groupId = obj.groupId || obj.id;

        const primal = {
          id: primalId,
          x: obj.x, y: obj.y, w: obj.w, h: obj.h,
          label: label + ' ' + Date.now().toString().slice(-4),
          color: color, type: type,
          isVisible: true, opacity: 0.3, artboardId: obj.artboardId || 'default',
          groupId: groupId, parentId: obj.id, isPersistent: true,
          collisionMode: primalType === 'collision' ? 'total' : undefined,
          navType: primalType !== 'collision' ? 'walkable' : undefined,
          sensorTrigger: primalType !== 'collision' ? 'onEnter' : undefined,
          sensorRadius: primalType !== 'collision' ? 100 : undefined,
        };

        document.dispatchEvent(new CustomEvent('add-primal-to-asset', { detail: { primal, groupId } }));
      });
    });

    container.querySelectorAll('.param-asset-btn').forEach(btn => {
       btn.addEventListener('click', () => {
          this.showAssetPicker = (btn as HTMLElement).dataset.prop!;
          this.rerender(container, onUpdate, onToggleKeyframe);
       });
    });

    container.querySelectorAll('.param-remove-asset').forEach(btn => {
       btn.addEventListener('click', () => {
          const prop = (btn as HTMLElement).dataset.prop!;
          onUpdate({ [prop]: '' });
       });
    });

    container.querySelectorAll('.picker-asset-item').forEach(item => {
       item.addEventListener('click', () => {
          const url = (item as HTMLElement).dataset.url!;
          const prop = (item as HTMLElement).dataset.prop!;
          onUpdate({ [prop]: url, spriteData: null }); // Clear spriteData if direct asset selected
          this.showAssetPicker = null;
          this.rerender(container, onUpdate, onToggleKeyframe);
       });
    });

    container.querySelectorAll('.picker-pack-item').forEach(item => {
      item.addEventListener('click', () => {
         const id = (item as HTMLElement).dataset.id!;
         const prop = (item as HTMLElement).dataset.prop!;
         const pack = (this.state.customSpritePacks || []).find((p:any) => p.id === id);
         if (pack) {
            let preview = '';
            const firstAction = pack.actions[0];
            const firstSlot = firstAction?.directions?.down || firstAction?.directions?.up;
            if (firstSlot) preview = firstSlot.gifUrl || (firstSlot.frames && firstSlot.frames.length > 0 ? firstSlot.frames[0] : '');

            onUpdate({ [prop]: preview, spriteData: pack });
         }
         this.showAssetPicker = null;
         this.rerender(container, onUpdate, onToggleKeyframe);
      });
   });

    container.querySelectorAll('.picker-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state._assetPickerTab = (btn as HTMLElement).dataset.tab;
        this.rerender(container, onUpdate, onToggleKeyframe);
      });
    });

    container.querySelectorAll('.close-picker-btn').forEach(btn => {
       btn.addEventListener('click', () => {
          this.showAssetPicker = null;
          this.rerender(container, onUpdate, onToggleKeyframe);
       });
    });

    container.querySelectorAll('.sensor-trigger-select, .sensor-shape-select').forEach(select => {
      select.addEventListener('change', (e: any) => {
        const prop = select.getAttribute('data-prop')!;
        onUpdate({ [prop]: e.target.value });
        this.rerender(container, onUpdate, onToggleKeyframe);
      });
    });

    container.querySelectorAll('.add-event-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const selector = container.querySelector('#event-type-selector') as HTMLElement;
        if (selector) selector.style.display = selector.style.display === 'none' ? 'block' : 'none';
      });
    });

    container.querySelectorAll('.event-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const eventType = (btn as HTMLElement).dataset.type!;
        const configPanel = container.querySelector('#event-config-panel') as HTMLElement;
        if (!configPanel) return;

        let configHtml = '';
        
        if (eventType === 'playSound') {
          configHtml = `
            <div style="padding:10px; background:rgba(255,200,0,0.1); border-radius:6px;">
              <div style="font-size:0.5rem; color:#ffc800; font-weight:900; margin-bottom:8px;">🔊 CONFIGURAR SOM</div>
              <div style="font-size:0.45rem; color:#888; margin-bottom:4px;">ÁUDIO</div>
              <input type="text" id="event-sound-url" placeholder="/assets/sounds/..." style="width:100%; padding:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,200,0,0.2); border-radius:4px; color:#fff; font-size:0.5rem; margin-bottom:8px;">
              
              <div style="font-size:0.45rem; color:#888; margin-bottom:4px;">ATENUAÇÃO POR DISTÂNCIA</div>
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                <span style="font-size:0.4rem; color:#666;">Mín</span>
                <input type="range" id="event-sound-minvol" min="0" max="100" value="10" style="flex:1;">
                <span style="font-size:0.4rem; color:#666;">Máx</span>
                <input type="range" id="event-sound-maxvol" min="0" max="100" value="100" style="flex:1;">
              </div>
              
              <div style="font-size:0.45rem; color:#888; margin-bottom:4px;">CURVA DE ATENUAÇÃO</div>
              <select id="event-sound-curve" style="width:100%; padding:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,200,0,0.2); border-radius:4px; color:#fff; font-size:0.5rem; margin-bottom:8px;">
                <option value="linear">Linear</option>
                <option value="logarithmic">Logarítmica</option>
                <option value="inverse">Inversa</option>
              </select>
              
              <label style="display:flex; align-items:center; gap:6px; margin-bottom:8px; cursor:pointer;">
                <input type="checkbox" id="event-sound-invert">
                <span style="font-size:0.45rem; color:#888;">Inverter (100% na borda, 0% no centro)</span>
              </label>
              
              <button id="save-event-sound" style="width:100%; padding:8px; background:rgba(255,200,0,0.2); border:none; border-radius:4px; color:#ffc800; font-size:0.5rem; font-weight:900; cursor:pointer;">💾 SALVAR EVENTO</button>
            </div>
          `;
        } else if (eventType === 'battleStart') {
          configHtml = `
            <div style="padding:10px; background:rgba(255,68,68,0.1); border-radius:6px;">
              <div style="font-size:0.5rem; color:#ff4444; font-weight:900; margin-bottom:8px;">⚔️ CONFIGURAR BATALHA</div>
              <div style="font-size:0.45rem; color:#888; margin-bottom:4px;">TIPO DE BATALHA</div>
              <select id="event-battle-type" style="width:100%; padding:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,68,68,0.2); border-radius:4px; color:#fff; font-size:0.5rem; margin-bottom:8px;">
                <option value="normal">Normal</option>
                <option value="elite">Elite</option>
                <option value="boss">Chefe</option>
              </select>
              
              <div style="font-size:0.45rem; color:#888; margin-bottom:4px;">INIMIGOS (separados por vírgula)</div>
              <input type="text" id="event-battle-enemies" placeholder="goblin, skeleton, boss_slime" style="width:100%; padding:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,68,68,0.2); border-radius:4px; color:#fff; font-size:0.5rem; margin-bottom:8px;">
              
              <div style="font-size:0.45rem; color:#888; margin-bottom:4px;">AO VENCER</div>
              <select id="event-battle-onwin" style="width:100%; padding:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,68,68,0.2); border-radius:4px; color:#fff; font-size:0.5rem; margin-bottom:8px;">
                <option value="continue">Continuar Mapa</option>
                <option value="loadPhase">Carregar Fase</option>
                <option value="showDialog">Mostrar Diálogo</option>
              </select>
              
              <button id="save-event-battle" style="width:100%; padding:8px; background:rgba(255,68,68,0.2); border:none; border-radius:4px; color:#ff4444; font-size:0.5rem; font-weight:900; cursor:pointer;">💾 SALVAR EVENTO</button>
            </div>
          `;
        } else if (eventType === 'campaignDialogue') {
          configHtml = `
            <div style="padding:10px; background:rgba(167,139,250,0.1); border-radius:6px;">
              <div style="font-size:0.5rem; color:#a78bfa; font-weight:900; margin-bottom:8px;">💬 CONFIGURAR DIÁLOGO</div>
              
              <div style="font-size:0.45rem; color:#888; margin-bottom:4px;">IMAGEM DE FUNDO</div>
              <input type="text" id="event-dialog-bg" placeholder="/assets/bg/battle_bg.png" style="width:100%; padding:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(167,139,250,0.2); border-radius:4px; color:#fff; font-size:0.5rem; margin-bottom:8px;">
              
              <div style="font-size:0.45rem; color:#888; margin-bottom:4px;">DIÁLOGOS (JSON)</div>
              <textarea id="event-dialog-lines" placeholder='[{"turn":0,"side":"player","text":"Vamos lá!"},{"turn":1,"side":"npc","text":"Cuidado!"}]' style="width:100%; height:80px; padding:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(167,139,250,0.2); border-radius:4px; color:#fff; font-size:0.45rem; font-family:monospace; margin-bottom:8px;"></textarea>
              
              <div style="font-size:0.45rem; color:#888; margin-bottom:4px;">VELOCIDADE (segundos por caractere)</div>
              <input type="number" id="event-dialog-speed" value="0.05" step="0.01" min="0.01" max="0.5" style="width:100%; padding:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(167,139,250,0.2); border-radius:4px; color:#fff; font-size:0.5rem; margin-bottom:8px;">
              
              <div style="font-size:0.45rem; color:#888; margin-bottom:4px;">RECOMPENSAS</div>
              <input type="text" id="event-dialog-rewards" placeholder="xp:100, gold:50, item:health_potion" style="width:100%; padding:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(167,139,250,0.2); border-radius:4px; color:#fff; font-size:0.5rem; margin-bottom:8px;">
              
              <button id="save-event-dialog" style="width:100%; padding:8px; background:rgba(167,139,250,0.2); border:none; border-radius:4px; color:#a78bfa; font-size:0.5rem; font-weight:900; cursor:pointer;">💾 SALVAR EVENTO</button>
            </div>
          `;
        } else if (eventType === 'tutorial') {
          configHtml = `
            <div style="padding:10px; background:rgba(76,255,136,0.1); border-radius:6px;">
              <div style="font-size:0.5rem; color:#4cff88; font-weight:900; margin-bottom:8px;">📖 CONFIGURAR TUTORIAL</div>
              
              <div style="font-size:0.45rem; color:#888; margin-bottom:4px;">TÍTULO</div>
              <input type="text" id="event-tutorial-title" placeholder="Como se mover" style="width:100%; padding:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(76,255,136,0.2); border-radius:4px; color:#fff; font-size:0.5rem; margin-bottom:8px;">
              
              <div style="font-size:0.45rem; color:#888; margin-bottom:4px;">TEXTO DO TUTORIAL</div>
              <textarea id="event-tutorial-text" placeholder="Use as teclas WASD ou setas para se mover." style="width:100%; height:60px; padding:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(76,255,136,0.2); border-radius:4px; color:#fff; font-size:0.5rem; margin-bottom:8px;"></textarea>
              
              <label style="display:flex; align-items:center; gap:6px; margin-bottom:6px; cursor:pointer;">
                <input type="checkbox" id="event-tutorial-freeze">
                <span style="font-size:0.45rem; color:#888;">Bloquear Player</span>
              </label>
              
              <label style="display:flex; align-items:center; gap:6px; margin-bottom:6px; cursor:pointer;">
                <input type="checkbox" id="event-tutorial-highlight">
                <span style="font-size:0.45rem; color:#888;">Destacar UI</span>
              </label>
              
              <label style="display:flex; align-items:center; gap:6px; margin-bottom:8px; cursor:pointer;">
                <input type="checkbox" id="event-tutorial-autodestroy" checked>
                <span style="font-size:0.45rem; color:#888;">Auto-destruir após uso</span>
              </label>
              
              <button id="save-event-tutorial" style="width:100%; padding:8px; background:rgba(76,255,136,0.2); border:none; border-radius:4px; color:#4cff88; font-size:0.5rem; font-weight:900; cursor:pointer;">💾 SALVAR EVENTO</button>
            </div>
          `;
        } else if (eventType === 'loadPhase') {
          configHtml = `
            <div style="padding:10px; background:rgba(81,197,255,0.1); border-radius:6px;">
              <div style="font-size:0.5rem; color:#51c5ff; font-weight:900; margin-bottom:8px;">🗺️ CARREGAR FASE</div>
              <div style="font-size:0.45rem; color:#888; margin-bottom:4px;">ID DA FASE</div>
              <input type="text" id="event-phase-id" placeholder="phase_001" style="width:100%; padding:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(81,197,255,0.2); border-radius:4px; color:#fff; font-size:0.5rem; margin-bottom:8px;">
              
              <div style="font-size:0.45rem; color:#888; margin-bottom:4px;">POSIÇÃO DO PLAYER (X, Y)</div>
              <div style="display:flex; gap:8px;">
                <input type="number" id="event-phase-x" placeholder="X" style="flex:1; padding:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(81,197,255,0.2); border-radius:4px; color:#fff; font-size:0.5rem;">
                <input type="number" id="event-phase-y" placeholder="Y" style="flex:1; padding:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(81,197,255,0.2); border-radius:4px; color:#fff; font-size:0.5rem;">
              </div>
              
              <button id="save-event-phase" style="width:100%; margin-top:8px; padding:8px; background:rgba(81,197,255,0.2); border:none; border-radius:4px; color:#51c5ff; font-size:0.5rem; font-weight:900; cursor:pointer;">💾 SALVAR EVENTO</button>
            </div>
          `;
        } else if (eventType === 'showDialog') {
          configHtml = `
            <div style="padding:10px; background:rgba(255,140,66,0.1); border-radius:6px;">
              <div style="font-size:0.5rem; color:#ff8c42; font-weight:900; margin-bottom:8px;">💭 POPUP DE MENSAGEM</div>
              <div style="font-size:0.45rem; color:#888; margin-bottom:4px;">TEXTO</div>
              <textarea id="event-popup-text" placeholder="Sua mensagem aqui..." style="width:100%; height:60px; padding:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,140,66,0.2); border-radius:4px; color:#fff; font-size:0.5rem; margin-bottom:8px;"></textarea>
              
              <button id="save-event-popup" style="width:100%; padding:8px; background:rgba(255,140,66,0.2); border:none; border-radius:4px; color:#ff8c42; font-size:0.5rem; font-weight:900; cursor:pointer;">💾 SALVAR EVENTO</button>
            </div>
          `;
        }
        
        configPanel.innerHTML = configHtml;
        configPanel.style.display = 'block';
        
        this.bindEventSaveHandlers(container, onUpdate);
      });
    });

    container.querySelectorAll('.remove-event-btn').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        const obj = this.selectedObj;
        if (!obj || !obj.area_sensorEvents) return;
        obj.area_sensorEvents.splice(idx, 1);
        onUpdate({ area_sensorEvents: obj.area_sensorEvents });
        this.rerender(container, onUpdate, onToggleKeyframe);
      });
    });

    const overlay = container.querySelector('.asset-picker-overlay') as HTMLElement;
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.showAssetPicker = null;
          this.rerender(container, onUpdate, onToggleKeyframe);
        }
      });
    }
  }

  private bindEventSaveHandlers(container: HTMLElement, onUpdate: (props: any) => void) {
    const saveSound = container.querySelector('#save-event-sound') as HTMLButtonElement;
    if (saveSound) {
      saveSound.addEventListener('click', () => {
        const soundUrl = (container.querySelector('#event-sound-url') as HTMLInputElement)?.value;
        const minVol = parseInt((container.querySelector('#event-sound-minvol') as HTMLInputElement)?.value || '10');
        const maxVol = parseInt((container.querySelector('#event-sound-maxvol') as HTMLInputElement)?.value || '100');
        const curve = (container.querySelector('#event-sound-curve') as HTMLSelectElement)?.value || 'linear';
        const invert = (container.querySelector('#event-sound-invert') as HTMLInputElement)?.checked || false;

        this.addSensorEvent('playSound', {
          soundUrl, minVol: minVol / 100, maxVol: maxVol / 100, curve, invert
        }, onUpdate);
      });
    }

    const saveBattle = container.querySelector('#save-event-battle') as HTMLButtonElement;
    if (saveBattle) {
      saveBattle.addEventListener('click', () => {
        const battleType = (container.querySelector('#event-battle-type') as HTMLSelectElement)?.value || 'normal';
        const enemies = (container.querySelector('#event-battle-enemies') as HTMLInputElement)?.value || '';
        const onWin = (container.querySelector('#event-battle-onwin') as HTMLSelectElement)?.value || 'continue';

        this.addSensorEvent('battleStart', { battleType, enemies: enemies.split(',').map((e: string) => e.trim()), onWin }, onUpdate);
      });
    }

    const saveDialog = container.querySelector('#save-event-dialog') as HTMLButtonElement;
    if (saveDialog) {
      saveDialog.addEventListener('click', () => {
        const bg = (container.querySelector('#event-dialog-bg') as HTMLInputElement)?.value || '';
        const linesJson = (container.querySelector('#event-dialog-lines') as HTMLTextAreaElement)?.value || '[]';
        const speed = parseFloat((container.querySelector('#event-dialog-speed') as HTMLInputElement)?.value || '0.05');
        const rewards = (container.querySelector('#event-dialog-rewards') as HTMLInputElement)?.value || '';

        let lines: any[] = [];
        try { lines = JSON.parse(linesJson); } catch {}

        this.addSensorEvent('campaignDialogue', { bg, lines, speed, rewards }, onUpdate);
      });
    }

    const saveTutorial = container.querySelector('#save-event-tutorial') as HTMLButtonElement;
    if (saveTutorial) {
      saveTutorial.addEventListener('click', () => {
        const title = (container.querySelector('#event-tutorial-title') as HTMLInputElement)?.value || '';
        const text = (container.querySelector('#event-tutorial-text') as HTMLTextAreaElement)?.value || '';
        const freeze = (container.querySelector('#event-tutorial-freeze') as HTMLInputElement)?.checked || false;
        const highlight = (container.querySelector('#event-tutorial-highlight') as HTMLInputElement)?.checked || false;
        const autodestroy = (container.querySelector('#event-tutorial-autodestroy') as HTMLInputElement)?.checked || true;

        this.addSensorEvent('tutorial', { title, text, freezePlayer: freeze, highlightUI: highlight, autoDestroy: autodestroy }, onUpdate);
      });
    }

    const savePhase = container.querySelector('#save-event-phase') as HTMLButtonElement;
    if (savePhase) {
      savePhase.addEventListener('click', () => {
        const phaseId = (container.querySelector('#event-phase-id') as HTMLInputElement)?.value || '';
        const x = parseFloat((container.querySelector('#event-phase-x') as HTMLInputElement)?.value || '0');
        const y = parseFloat((container.querySelector('#event-phase-y') as HTMLInputElement)?.value || '0');

        this.addSensorEvent('loadPhase', { phaseId, playerX: x, playerY: y }, onUpdate);
      });
    }

    const savePopup = container.querySelector('#save-event-popup') as HTMLButtonElement;
    if (savePopup) {
      savePopup.addEventListener('click', () => {
        const text = (container.querySelector('#event-popup-text') as HTMLTextAreaElement)?.value || '';

        this.addSensorEvent('showDialog', { text }, onUpdate);
      });
    }
  }

  private addSensorEvent(type: string, data: any, onUpdate: (props: any) => void) {
    const obj = this.selectedObj;
    if (!obj || obj.type !== 'area_sensor') return;

    if (!obj.area_sensorEvents) obj.area_sensorEvents = [];
    obj.area_sensorEvents.push({ type, ...data });

    onUpdate({ area_sensorEvents: obj.area_sensorEvents });
    document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
  }

  private rerender(container: HTMLElement, onUpdate: (props: any) => void, onToggleKeyframe: (prop: string) => void) {
    container.innerHTML = this.render(this.selectedObj, this.currentTime, this.state);
    this.bind(container, onUpdate, onToggleKeyframe);
  }
}
