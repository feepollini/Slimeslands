export type Tool = 'select' | 'move' | 'pan' | 'delete' | 'vector_pen' | 'eraser' | 'area_sensor' | 'collision' | 'camera' | 'player' | 'fases' | 'stamp' | 'player_camera' | 'insert_player' | 'insert_camera' | 'light';

export class WorldMapToolbar {
  public activeTool: Tool = 'select';
  public activeSubTool: string | null = null;
  private _eventsBound = false;
  private _bindCloseExt: ((e: MouseEvent) => void) | null = null;

  private submenus: Partial<Record<Tool, { id: string, label: string, isHeader?: boolean }[]>> = {
    area_sensor: [
      { id: 'rect', label: 'Retângulo' },
      { id: 'square', label: 'Quadrado' },
      { id: 'circle', label: 'Círculo' },
      { id: 'triangle', label: 'Triângulo' },
      { id: 'shape_l', label: 'Forma em "L"' },
      { id: 'shape_t', label: 'Forma em "T"' },
      { id: 'shape_u', label: 'Forma em "U"' },
      { id: 'cross', label: 'Cruz' },
      { id: 'capsule', label: 'Cápsula' },
      { id: 'line', label: 'Linha / Segmento' },
      { id: 'poly', label: 'Polígono Livre' }
    ],
    vector_pen: [
      { id: 'collision', label: 'Vetor de Colisão' },
      { id: 'area_sensor', label: 'Vetor de Sensor de Área' }
    ],
    collision: [
      { id: 'rect', label: 'Retângulo' },
      { id: 'square', label: 'Quadrado' },
      { id: 'circle', label: 'Círculo' },
      { id: 'triangle', label: 'Triângulo' },
      { id: 'shape_l', label: 'Forma em "L"' },
      { id: 'shape_t', label: 'Forma em "T"' },
      { id: 'shape_u', label: 'Forma em "U"' },
      { id: 'cross', label: 'Cruz' },
      { id: 'capsule', label: 'Cápsula' },
      { id: 'line', label: 'Linha / Segmento' },
      { id: 'poly', label: 'Polígono Livre' }
    ],
    camera: [
      { id: 'cam_frame_header', label: '-- FRAME --', isHeader: true },
      { id: 'cam_portrait', label: 'Retrato' },
      { id: 'cam_landscape', label: 'Paisagem' }
    ],
    light: [
      { id: 'radial', label: 'Luz Radial (Ponto)' },
      { id: 'vector', label: 'Luz Vetorial (Forma)' }
    ],
    stamp: []
  };

  public render(state?: any): string {
    const showCanvasUI = state?.showCanvasUI !== false;
    return `
      <!-- TOOLBAR -->
      <div id="wm-toolbar" style="
        display:flex; align-items:center; gap:4px;
        padding:6px 8px;
        background:rgba(0,0,0,0.5);
        border-bottom:1px solid rgba(255,255,255,0.06);
        flex-shrink:0;
        position: relative;
        z-index: 10;
        overflow: visible;
        flex-wrap: wrap;
      ">
        <div class="wm-camera-dropdown" style="position:relative;">
          <button class="wm-tool-btn" data-tool="player_camera" style="
            padding:6px 10px; background:rgba(255,215,0,0.1); border:1px solid rgba(255,215,0,0.3);
            border-radius:6px; color:#ffd700; font-size:0.65rem; font-weight:900; cursor:pointer;
            display:flex; align-items:center; gap:4px;
          ">👤+📹</button>
          <div class="wm-camera-menu" style="
            display:none; position:absolute; top:100%; left:0; margin-top:4px;
            background:#151520; border:1px solid rgba(255,215,0,0.3); border-radius:8px;
            padding:8px 0; min-width:200px; z-index:100;
          ">
            <div style="padding:6px 12px; font-size:0.5rem; color:#888; font-weight:900; border-bottom:1px solid rgba(255,255,255,0.1);">MODO CÂMERA</div>
            <button class="wm-camera-mode" data-mode="fixed" style="
              width:100%; padding:8px 12px; background:transparent; border:none;
              color:#4cff88; font-size:0.55rem; font-weight:900; cursor:pointer; text-align:left;
            ">🔒 Fixa ao Player (Mapa move)</button>
            <button class="wm-camera-mode" data-mode="free" style="
              width:100%; padding:8px 12px; background:transparent; border:none;
              color:#888; font-size:0.55rem; font-weight:900; cursor:pointer; text-align:left;
            ">🔓 Câmera Livre</button>
            <div style="padding:6px 12px; font-size:0.5rem; color:#888; font-weight:900; border-top:1px solid rgba(255,255,255,0.1); margin-top:4px;">ZOOM DA CÂMERA</div>
            <div style="padding:4px 12px; display:flex; align-items:center; gap:8px;">
              <span style="font-size:0.5rem; color:#666;">−</span>
              <input type="range" class="wm-camera-zoom" min="0.2" max="3" step="0.1" value="1" style="flex:1; accent-color:#ffd700;">
              <span style="font-size:0.5rem; color:#666;">+</span>
            </div>
            <div class="wm-zoom-value" style="padding:4px 12px; font-size:0.5rem; color:#ffd700; text-align:center;">1.0x</div>
            <button class="wm-camera-apply" style="
              width:calc(100% - 24px); margin:8px 12px; padding:8px;
              background:rgba(255,215,0,0.15); border:1px solid rgba(255,215,0,0.4);
              border-radius:6px; color:#ffd700; font-size:0.55rem; font-weight:900; cursor:pointer;
            ">✓ APLICAR ZOOM</button>
          </div>
        </div>
        
        <div class="wm-fases-dropdown" style="position:relative;">
          <button class="wm-tool-btn" data-tool="fases" style="
            padding:6px 10px; background:rgba(76,255,136,0.1); border:1px solid rgba(76,255,136,0.3);
            border-radius:6px; color:#4cff88; font-size:0.65rem; font-weight:900; cursor:pointer;
          ">∞ FASE</button>
          <div class="wm-fases-menu" style="
            display:none; position:absolute; top:100%; left:0; margin-top:4px;
            background:#151520; border:1px solid rgba(76,255,136,0.3); border-radius:8px;
            padding:12px; min-width:280px; z-index:100;
          ">
            <div style="padding:6px 0; font-size:0.5rem; color:#4cff88; font-weight:900; border-bottom:1px solid rgba(255,255,255,0.1); margin-bottom:8px;">CHECKPOINT / FASE</div>
            
            <div style="margin-bottom:12px;">
              <label style="font-size:0.45rem; color:#888; display:block; margin-bottom:4px;">TAMANHO DO MAPA <span style="color:#ff8c42;">⚠️</span></label>
              <div style="display:flex; gap:8px;">
                <div style="flex:1;">
                  <input type="number" class="wm-map-width" min="500" max="10000" step="100" value="4000" style="
                    width:100%; padding:6px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1);
                    border-radius:4px; color:#fff; font-size:0.5rem;
                  ">
                  <span style="font-size:0.35rem; color:#666;">Largura</span>
                </div>
                <div style="flex:1;">
                  <input type="number" class="wm-map-height" min="500" max="10000" step="100" value="2250" style="
                    width:100%; padding:6px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1);
                    border-radius:4px; color:#fff; font-size:0.5rem;
                  ">
                  <span style="font-size:0.35rem; color:#666;">Altura</span>
                </div>
              </div>
              <div style="font-size:0.4rem; color:#ff8c42; margin-top:4px;">⚠️ Alterar tamanho pode deformar o mapa</div>
            </div>
            
            <div style="margin-bottom:12px;">
              <label style="font-size:0.45rem; color:#888; display:block; margin-bottom:4px;">COR DO FUNDO</label>
              <div style="display:flex; gap:8px; align-items:center;">
                <input type="color" class="wm-bg-color" value="#08080c" style="
                  width:40px; height:30px; border:none; border-radius:4px; cursor:pointer;
                ">
                <input type="text" class="wm-bg-color-hex" value="#08080c" style="
                  flex:1; padding:6px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1);
                  border-radius:4px; color:#fff; font-size:0.5rem; font-family:monospace;
                ">
              </div>
            </div>
            
            <div style="margin-bottom:12px;">
              <label style="font-size:0.45rem; color:#888; display:block; margin-bottom:4px;">CARREGAR PROGRESSO</label>
              <select class="wm-phase-select" style="
                width:100%; padding:8px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1);
                border-radius:4px; color:#fff; font-size:0.5rem;
              ">
                <option value="">Selecione um checkpoint...</option>
              </select>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="wm-phase-load" style="
                flex:1; padding:8px; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.4);
                border-radius:6px; color:#fff; font-size:0.5rem; font-weight:900; cursor:pointer;
              ">📂 CARREGAR</button>
              <button class="wm-phase-save" style="
                flex:1; padding:8px; background:rgba(76,255,136,0.15); border:1px solid rgba(76,255,136,0.4);
                border-radius:6px; color:#4cff88; font-size:0.5rem; font-weight:900; cursor:pointer;
              ">💾 SALVAR</button>
            </div>
          </div>
        </div>
        ${this.toolBtn('light', '💫', 'Iluminação', true)}
        
        <div style="width: 2px; height: 24px; background: rgba(255,255,255,0.08); margin: 0 3px;"></div>

        ${this.toolBtn('select', '🎯', 'Interact (V)')}
        ${this.toolBtn('move',   '✥', 'Mover (M)')}
        ${this.toolBtn('pan',    '✋', 'Pan (H)')}
        ${this.toolBtn('delete', '✕', 'Apagar')}
        
        <div style="width: 2px; height: 24px; background: rgba(255,255,255,0.08); margin: 0 3px;"></div>

        ${this.toolBtn('vector_pen', '✒', 'Vetor', true)}
        ${this.toolBtn('eraser', '🧹', 'Borracha')}
        ${this.toolBtn('area_sensor', '◫', 'Sensor', true)}
        ${this.toolBtn('collision', '🧱', 'Colisão', true)}
        
        <div style="width: 2px; height: 24px; background: rgba(255,255,255,0.08); margin: 0 3px;"></div>

        ${this.toolBtn('stamp', '🔖', 'Carimbo')}
        ${this.toolBtn('insert_player', '👤', 'Ins. Player')}
        ${this.toolBtn('insert_camera', '📹', 'Ins. Câmera')}
        
        <div style="flex:1"></div>

        <!-- COMMANDS -->
        <div style="display:flex; gap:3px; align-items:center;">
          <button class="wm-cmd-btn" data-cmd="undo" title="Desfazer (Ctrl+Z)" style="
            padding:5px 7px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
            border-radius:4px; color:#fff; font-size:0.7rem; cursor:pointer;
          ">↩</button>
          <button class="wm-cmd-btn" data-cmd="redo" title="Refazer (Ctrl+Y)" style="
            padding:5px 7px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
            border-radius:4px; color:#fff; font-size:0.7rem; cursor:pointer;
          ">↪</button>
          <div style="width:2px; height:18px; background:rgba(255,255,255,0.08); margin:0 2px;"></div>
          <button class="wm-cmd-btn" data-cmd="duplicate" title="Duplicar (Ctrl+D)" style="
            padding:5px 7px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
            border-radius:4px; color:#fff; font-size:0.7rem; cursor:pointer;
          ">⧉</button>
          <button class="wm-cmd-btn" data-cmd="delete-sel" title="Apagar Selecionado (Del)" style="
            padding:5px 7px; background:rgba(255,51,102,0.1); border:1px solid rgba(255,51,102,0.2);
            border-radius:4px; color:#ff3366; font-size:0.7rem; cursor:pointer;
          ">✕</button>
          
          <div style="width:2px; height:24px; background:rgba(255,255,255,0.08); margin:0 4px;"></div>
          
          <button id="wm-btn-runs" class="wm-cmd-btn" title="Run/Play Animations" style="
            padding:6px 12px; 
            background:${state?.isPlaying ? 'rgba(76,255,136,0.2)' : 'rgba(255,255,255,0.05)'}; 
            border:1px solid ${state?.isPlaying ? 'rgba(76,255,136,0.4)' : 'rgba(255,255,255,0.1)'};
            border-radius:6px; 
            color:${state?.isPlaying ? '#4cff88' : '#fff'}; 
            font-size:0.55rem; font-weight:900; cursor:pointer;
            display:flex; align-items:center; gap:6px;
            transition: all 0.2s;
          ">
            <span>${state?.isPlaying ? '⏸' : '▶'}</span>
            <span>RUNS</span>
          </button>
          
          <div style="width:2px; height:18px; background:rgba(255,255,255,0.08); margin:0 2px;"></div>
          
          <div style="position:relative;" class="wm-filter-dropdown">
            <button id="wm-canvas-show-ui-btn" class="wm-cmd-btn" title="Filtros de Visualização" style="
              padding:5px 7px; border-radius:4px; font-size:0.55rem; font-weight:900; cursor:pointer;
              border:1px solid ${showCanvasUI ? '#ffd700' : 'rgba(255,215,0,0.2)'};
              background:${showCanvasUI ? 'rgba(255,215,0,0.15)' : 'rgba(255,215,0,0.05)'};
              color:${showCanvasUI ? '#ffd700' : 'rgba(255,215,0,0.4)'};
              letter-spacing:0.5px; transition:0.12s;
            ">👁️ ${showCanvasUI ? 'ON' : 'OFF'}</button>
            <div class="wm-filter-menu" style="
              display:none; position:absolute; top:100%; left:0; margin-top:4px;
              background:#151520; border:1px solid rgba(255,215,0,0.3); border-radius:8px;
              padding:8px 0; min-width:200px; z-index:100;
            ">
              <div style="padding:6px 12px; font-size:0.5rem; color:#ffd700; font-weight:900; border-bottom:1px solid rgba(255,255,255,0.1);">FILTROS DE VISUALIZAÇÃO</div>
              
              <div style="padding:4px 8px;">
                <label style="display:flex; align-items:center; gap:8px; padding:6px; cursor:pointer; border-radius:4px; background:rgba(255,255,255,0.03);">
                  <input type="checkbox" class="filter-checkbox" data-filter="showGrid" ${state?.showGrid !== false ? 'checked' : ''}>
                  <span style="font-size:0.55rem; color:#888;">Grade</span>
                </label>
                <label style="display:flex; align-items:center; gap:8px; padding:6px; cursor:pointer; border-radius:4px; background:rgba(255,255,255,0.03);">
                  <input type="checkbox" class="filter-checkbox" data-filter="showCollision" ${state?.showCollision !== false ? 'checked' : ''}>
                  <span style="font-size:0.55rem; color:#ff4444;">Colisões</span>
                </label>
                <label style="display:flex; align-items:center; gap:8px; padding:6px; cursor:pointer; border-radius:4px; background:rgba(255,255,255,0.03);">
                  <input type="checkbox" class="filter-checkbox" data-filter="showSensors" ${state?.showSensors !== false ? 'checked' : ''}>
                  <span style="font-size:0.55rem; color:#44ccff;">Sensores</span>
                </label>
                <label style="display:flex; align-items:center; gap:8px; padding:6px; cursor:pointer; border-radius:4px; background:rgba(255,255,255,0.03);">
                  <input type="checkbox" class="filter-checkbox" data-filter="showAreas" ${state?.showAreas !== false ? 'checked' : ''}>
                  <span style="font-size:0.55rem; color:#44ff44;">Áreas</span>
                </label>
                <label style="display:flex; align-items:center; gap:8px; padding:6px; cursor:pointer; border-radius:4px; background:rgba(255,255,255,0.03);">
                  <input type="checkbox" class="filter-checkbox" data-filter="showMorphs" ${state?.showMorphs !== false ? 'checked' : ''}>
                  <span style="font-size:0.55rem; color:#a78bfa;">Sprites/Assets</span>
                </label>
                <label style="display:flex; align-items:center; gap:8px; padding:6px; cursor:pointer; border-radius:4px; background:rgba(255,255,255,0.03);">
                  <input type="checkbox" class="filter-checkbox" data-filter="showVectors" ${state?.showVectors !== false ? 'checked' : ''}>
                  <span style="font-size:0.55rem; color:#ffa500;">Vetores</span>
                </label>
                <label style="display:flex; align-items:center; gap:8px; padding:6px; cursor:pointer; border-radius:4px; background:rgba(255,255,255,0.03);">
                  <input type="checkbox" class="filter-checkbox" data-filter="showCams" ${state?.showCams !== false ? 'checked' : ''}>
                  <span style="font-size:0.55rem; color:#ffd700;">Câmeras</span>
                </label>
              </div>
              
              <div style="border-top:1px solid rgba(255,255,255,0.1); padding:8px;">
                <button class="wm-filter-all-on" style="
                  width:100%; padding:6px; background:rgba(76,255,136,0.1); border:1px solid rgba(76,255,136,0.3);
                  border-radius:4px; color:#4cff88; font-size:0.5rem; cursor:pointer;
                ">✓ Tudo Visível</button>
                <button class="wm-filter-all-off" style="
                  width:100%; padding:6px; margin-top:4px; background:rgba(255,68,68,0.1); border:1px solid rgba(255,68,68,0.3);
                  border-radius:4px; color:#ff4444; font-size:0.5rem; cursor:pointer;
                ">✕ Tudo Oculto</button>
              </div>
            </div>
          </div>
        </div>
        
        <div style="width: 6px;"></div>
        <span id="wm-hint" style="font-size:0.4rem; opacity:0.3; letter-spacing:1px; text-align:right;">
          SCROLL=ZOOM | MIDDLE=PAN
        </span>
      </div>
    `;
  }

  private toolBtn(id: Tool, icon: string, label: string, hasSubmenu = false): string {
    const active = this.activeTool === id;
    
    let submenuHtml = '';
    if (hasSubmenu && this.submenus[id] && id !== 'stamp') {
      const items = this.submenus[id]!.map(s => {
        if (s.isHeader) {
          return `<div style="padding: 8px 10px 3px 10px; font-size: 0.45rem; color: rgba(255,255,255,0.3); text-transform: uppercase; font-weight: 800; background: #0a0a0f; letter-spacing: 1px;">${s.label}</div>`;
        }
        return `<div class="wm-subtool" data-tool="${id}" data-subtool="${s.id}" style="padding: 6px 10px 6px 16px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.55rem; transition: background 0.1s;">${s.label}</div>`;
      }).join('');

      submenuHtml = `
        <div class="wm-submenu-popup" id="submenu-${id}" style="
          display: none; position: absolute; top: calc(100% + 4px); left: 50%; transform: translateX(-50%);
          background: #111; border: 1px solid #333; border-radius: 6px; flex-direction: column; min-width: 110px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5); overflow: hidden; z-index: 100; color: #fff;
        ">
          ${items}
        </div>
      `;
    }

    return `
      <div style="position: relative;" class="wm-tool-container" id="tool-container-${id}">
        <button class="wm-tool" data-tool="${id}" title="${label}" style="
          display:flex; flex-direction:column; align-items:center; gap:3px;
          padding:5px 8px; border-radius:6px; cursor:pointer;
          border:1px solid ${active ? '#fff' : 'rgba(255,255,255,0.08)'};
          background:${active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)'};
          color:${active ? '#fff' : 'rgba(255,255,255,0.5)'};
          font-size:1rem; line-height:1; transition:0.12s;
        ">
          <div style="position: relative;">
            ${icon}
            ${hasSubmenu ? '<span style="font-size: 0.35rem; position: absolute; bottom: -2px; right: -6px; opacity: 0.6;">▼</span>' : ''}
          </div>
          <span style="font-size:0.4rem; font-weight:900; letter-spacing:0.3px;">${label.toUpperCase()}</span>
        </button>
        ${submenuHtml}
      </div>
    `;
  }

  public bind(container: HTMLElement, state: any, onToolChange: (tool: Tool, subtool?: string) => void, onCameraModeChange?: (mode: 'fixed' | 'free', zoom?: number, bgColor?: string, loadPhaseId?: string, savePhase?: boolean, phaseName?: string) => void, onConfigChange?: () => void) {
    if (!state.stampBrush) {
      state.stampBrush = {
        stampUrl: '', opacity: 1, size: 50, spacing: 20,
        randomMirror: false, randomMirrorX: false, randomMirrorY: false,
        randomSize: 0, randomRotation: 0, stamps: []
      };
    }
    if (!state.stampPresets) state.stampPresets = [];
    if (!state.cameraMode) state.cameraMode = 'fixed';

    // Camera dropdown toggle
    const cameraBtn = container.querySelector('.wm-camera-dropdown .wm-tool-btn') as HTMLElement;
    const cameraMenu = container.querySelector('.wm-camera-dropdown .wm-camera-menu') as HTMLElement;
    if (cameraBtn && cameraMenu) {
      cameraBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cameraMenu.style.display = cameraMenu.style.display === 'block' ? 'none' : 'block';
      });
    }

    // Camera mode buttons
    container.querySelectorAll<HTMLElement>('.wm-camera-mode').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode as 'fixed' | 'free';
        state.cameraMode = mode;
        
        container.querySelectorAll<HTMLElement>('.wm-camera-mode').forEach(b => {
          b.style.color = b.dataset.mode === mode ? '#4cff88' : '#888';
        });
        
        if (cameraMenu) cameraMenu.style.display = 'none';
        if (onCameraModeChange) onCameraModeChange(mode, state.cameraZoom || 1);
      });
    });

    // Camera zoom slider
    const zoomSlider = container.querySelector('.wm-camera-zoom') as HTMLInputElement;
    const zoomValue = container.querySelector('.wm-zoom-value') as HTMLElement;
    if (zoomSlider && zoomValue) {
      // Load from localStorage, fallback to 2.5
      const savedZoom = parseFloat(localStorage.getItem('wm_cameraZoom') || '2.5');
      state.cameraZoom = savedZoom;
      zoomSlider.value = savedZoom.toString();
      zoomValue.textContent = savedZoom.toFixed(1) + 'x';
      
      zoomSlider.addEventListener('input', () => {
        const zoom = parseFloat(zoomSlider.value);
        zoomValue.textContent = zoom.toFixed(1) + 'x';
        state.cameraZoom = zoom;
        if (onCameraModeChange) onCameraModeChange(state.cameraMode, zoom);
      });
    }

    // Camera apply zoom button
    const applyBtn = container.querySelector('.wm-camera-apply') as HTMLElement;
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const zoom = parseFloat((container.querySelector('.wm-camera-zoom') as HTMLInputElement)?.value || '2.5');
        state.cameraZoom = zoom;
        localStorage.setItem('wm_cameraZoom', zoom.toString());
        if (cameraMenu) cameraMenu.style.display = 'none';
        if (onCameraModeChange) onCameraModeChange(state.cameraMode, zoom);
      });
    }

    // Set initial camera mode button colors
    container.querySelectorAll<HTMLElement>('.wm-camera-mode').forEach(btn => {
      btn.style.color = btn.dataset.mode === state.cameraMode ? '#4cff88' : '#888';
    });

    // Fases dropdown toggle
    const fasesBtn = container.querySelector('.wm-fases-dropdown .wm-tool-btn') as HTMLElement;
    const fasesMenu = container.querySelector('.wm-fases-dropdown .wm-fases-menu') as HTMLElement;
    if (fasesBtn && fasesMenu) {
      fasesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fasesMenu.style.display = fasesMenu.style.display === 'block' ? 'none' : 'block';
      });
    }

    // Background color picker
    const bgColorInput = container.querySelector('.wm-bg-color') as HTMLInputElement;
    const bgColorHex = container.querySelector('.wm-bg-color-hex') as HTMLInputElement;
    if (bgColorInput && bgColorHex) {
      const savedBg = state.bgColor || localStorage.getItem('wm_bgColor') || '#08080c';
      bgColorInput.value = savedBg;
      bgColorHex.value = savedBg;
      
      bgColorInput.addEventListener('input', () => {
        bgColorHex.value = bgColorInput.value;
        state.bgColor = bgColorInput.value;
        if (onCameraModeChange) onCameraModeChange(state.cameraMode, state.cameraZoom, bgColorInput.value);
      });
      bgColorHex.addEventListener('input', () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(bgColorHex.value)) {
          bgColorInput.value = bgColorHex.value;
          state.bgColor = bgColorHex.value;
          if (onCameraModeChange) onCameraModeChange(state.cameraMode, state.cameraZoom, bgColorHex.value);
        }
      });
    }

    // Phase load dropdown
    const phaseSelect = container.querySelector('.wm-phase-select') as HTMLSelectElement;
    if (phaseSelect) {
      try {
        const saved = localStorage.getItem('forge_phase_presets') || '[]';
        const presets = JSON.parse(saved);
        phaseSelect.innerHTML = '<option value="">Selecione uma fase...</option>';
        presets.forEach((p: any) => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name || p.id;
          phaseSelect.appendChild(opt);
        });
      } catch {}
    }

    // Phase load button - direct load without saving first
    const phaseLoadBtn = container.querySelector('.wm-phase-load') as HTMLButtonElement;
    if (phaseLoadBtn) {
      phaseLoadBtn.addEventListener('click', () => {
        const phaseId = (container.querySelector('.wm-phase-select') as HTMLSelectElement)?.value;
        if (!phaseId) return;
        
        // Direct load - no popup asking to save first
        if (onCameraModeChange) onCameraModeChange(state.cameraMode, state.cameraZoom, undefined, phaseId);
        if (fasesMenu) fasesMenu.style.display = 'none';
      });
    }

    // Phase save button - direct save (overwrites current phase)
    const phaseSaveBtn = container.querySelector('.wm-phase-save') as HTMLButtonElement;
    if (phaseSaveBtn) {
      phaseSaveBtn.addEventListener('click', () => {
        const w = parseInt((container.querySelector('.wm-map-width') as HTMLInputElement)?.value || '4000');
        const h = parseInt((container.querySelector('.wm-map-height') as HTMLInputElement)?.value || '2250');
        const currentW = state.mapWidth || 4000;
        const currentH = state.mapHeight || 2250;
        const sizeChanged = w !== currentW || h !== currentH;
        
        if (sizeChanged) {
          // Size changed - show dialog to create new phase
          const existing = document.getElementById('phase-new-dialog');
          if (existing) existing.remove();
          
          const dialog = document.createElement('div');
          dialog.id = 'phase-new-dialog';
          dialog.style.cssText = `
            position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
            background:#151520; border:1px solid rgba(255,140,66,0.4); border-radius:12px;
            padding:20px; z-index:10000; min-width:320px;
            box-shadow:0 10px 40px rgba(0,0,0,0.8);
          `;
          
          dialog.innerHTML = `
            <div style="font-size:0.65rem; color:#ff8c42; font-weight:900; margin-bottom:12px; letter-spacing:1px;">⚠️ TAMANHO ALTERADO</div>
            <div style="color:#888; font-size:0.5rem; margin-bottom:16px; line-height:1.4;">
              O tamanho do mapa foi alterado. É recomendado criar uma <strong style="color:#ffd700;">nova fase</strong> para evitar deformações no mapa atual.
            </div>
            <input id="phase-new-name" type="text" placeholder="Nome da nova fase..." style="
              width:100%; padding:10px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1);
              border-radius:6px; color:#fff; font-size:0.55rem; margin-bottom:12px; box-sizing:border-box;
            ">
            <div style="display:flex; gap:8px;">
              <button id="phase-new-cancel" style="
                flex:1; padding:10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
                border-radius:6px; color:#888; font-size:0.55rem; font-weight:900; cursor:pointer;
              ">CANCELAR</button>
              <button id="phase-new-confirm" style="
                flex:1; padding:10px; background:rgba(255,215,0,0.15); border:1px solid rgba(255,215,0,0.4);
                border-radius:6px; color:#ffd700; font-size:0.55rem; font-weight:900; cursor:pointer;
              ">CRIAR NOVA</button>
            </div>
          `;
          document.body.appendChild(dialog);
          
          dialog.querySelector('#phase-new-cancel')?.addEventListener('click', () => dialog.remove());
          dialog.querySelector('#phase-new-confirm')?.addEventListener('click', () => {
            const name = (dialog.querySelector('#phase-new-name') as HTMLInputElement)?.value;
            if (name && onCameraModeChange) {
              state.mapWidth = w;
              state.mapHeight = h;
              onCameraModeChange(state.cameraMode, state.cameraZoom, state.bgColor, undefined, true, name);
            }
            dialog.remove();
            if (fasesMenu) fasesMenu.style.display = 'none';
          });
        } else {
          // Size not changed - just save directly without dialog
          const phaseName = state.currentPhaseName || 'phase_' + Date.now();
          if (onCameraModeChange) onCameraModeChange(state.cameraMode, state.cameraZoom, state.bgColor, undefined, true, phaseName);
          if (fasesMenu) fasesMenu.style.display = 'none';
        }
      });
    }

    // Insert Player dropdown toggle
    const insertPlayerBtn = container.querySelector('.wm-insert-player-dropdown .wm-tool-btn') as HTMLElement;
    const insertPlayerMenu = container.querySelector('.wm-insert-player-dropdown .wm-insert-player-menu') as HTMLElement;
    if (insertPlayerBtn && insertPlayerMenu) {
      insertPlayerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        insertPlayerMenu.style.display = insertPlayerMenu.style.display === 'block' ? 'none' : 'block';
      });
    }

    // Insert Player - Background color picker
    const ipBgColorInput = container.querySelector('.ip-bg-color') as HTMLInputElement;
    const ipBgColorHex = container.querySelector('.ip-bg-color-hex') as HTMLInputElement;
    if (ipBgColorInput && ipBgColorHex) {
      const savedIpBg = state.bgColor || localStorage.getItem('wm_bgColor') || '#08080c';
      ipBgColorInput.value = savedIpBg;
      ipBgColorHex.value = savedIpBg;
      
      ipBgColorInput.addEventListener('input', () => {
        ipBgColorHex.value = ipBgColorInput.value;
        state.bgColor = ipBgColorInput.value;
      });
      ipBgColorHex.addEventListener('input', () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(ipBgColorHex.value)) {
          ipBgColorInput.value = ipBgColorHex.value;
          state.bgColor = ipBgColorHex.value;
        }
      });
    }

    // Insert Player - Phase select
    const ipPhaseSelect = container.querySelector('.ip-phase-select') as HTMLSelectElement;
    if (ipPhaseSelect) {
      try {
        const saved = localStorage.getItem('forge_phase_presets') || '[]';
        const presets = JSON.parse(saved);
        ipPhaseSelect.innerHTML = '<option value="">Selecione uma fase...</option>';
        presets.forEach((p: any) => {
          const opt = document.createElement('option');
          opt.value = p.name;
          opt.textContent = p.name;
          ipPhaseSelect.appendChild(opt);
        });
      } catch (e) {}
    }

    // Insert Player - Load button
    const ipPhaseLoadBtn = container.querySelector('.ip-phase-load') as HTMLButtonElement;
    if (ipPhaseLoadBtn) {
      ipPhaseLoadBtn.addEventListener('click', () => {
        const phaseId = (container.querySelector('.ip-phase-select') as HTMLSelectElement)?.value;
        if (phaseId) {
          if (onCameraModeChange) onCameraModeChange(state.cameraMode, state.cameraZoom, undefined, phaseId);
        }
        if (insertPlayerMenu) insertPlayerMenu.style.display = 'none';
      });
    }

    // Insert Player - Save button
    const ipPhaseSaveBtn = container.querySelector('.ip-phase-save') as HTMLButtonElement;
    if (ipPhaseSaveBtn) {
      ipPhaseSaveBtn.addEventListener('click', () => {
        if (onCameraModeChange) onCameraModeChange(state.cameraMode, state.cameraZoom, undefined, undefined, true);
        if (insertPlayerMenu) insertPlayerMenu.style.display = 'none';
      });
    }

    // Insert Player - Start button (enters insert mode)
    const ipStartBtn = container.querySelector('.ip-start') as HTMLButtonElement;
    if (ipStartBtn) {
      ipStartBtn.addEventListener('click', () => {
        if (insertPlayerMenu) insertPlayerMenu.style.display = 'none';
        onToolChange('insert_player');
      });
    }

    if (!this._eventsBound) {
      this._eventsBound = true;
      this._bindCloseExt = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          if (!target.closest('.wm-camera-dropdown')) {
              if (cameraMenu) cameraMenu.style.display = 'none';
          }
          if (!target.closest('.wm-fases-dropdown')) {
              if (fasesMenu) fasesMenu.style.display = 'none';
          }
          if (!target.closest('.wm-filter-dropdown')) {
              const filterMenu = container.querySelector('.wm-filter-menu') as HTMLElement;
              if (filterMenu) filterMenu.style.display = 'none';
          }
      };
      document.addEventListener('click', this._bindCloseExt);

      // Map size change warning (moved out of handleHover)
      const mapWidthInput = container.querySelector('.wm-map-width') as HTMLInputElement;
      const mapHeightInput = container.querySelector('.wm-map-height') as HTMLInputElement;

      const checkSizeWarning = () => {
        const w = parseInt(mapWidthInput?.value || '4000');
        const h = parseInt(mapHeightInput?.value || '2250');
        const currentW = state.mapWidth || 4000;
        const currentH = state.mapHeight || 2250;
        
        if (w !== currentW || h !== currentH) {
          const existing = document.getElementById('size-warning-popup');
          if (existing) existing.remove();
          
          const warning = document.createElement('div');
          warning.id = 'size-warning-popup';
          warning.style.cssText = `
            position:fixed; bottom:30px; left:50%; transform:translateX(-50%);
            background:rgba(255,140,66,0.15); border:1px solid rgba(255,140,66,0.4); border-radius:8px;
            padding:12px 20px; z-index:10000; display:flex; align-items:center; gap:10px;
            box-shadow:0 4px 20px rgba(0,0,0,0.5);
          `;
          warning.innerHTML = `
            <span style="font-size:1rem;">⚠️</span>
            <div>
              <div style="color:#ff8c42; font-size:0.55rem; font-weight:900;">TAMANHO ALTERADO</div>
              <div style="color:#888; font-size:0.45rem;">Recomendado: criar nova fase para evitar deformações</div>
            </div>
            <button id="size-warning-close" style="
              padding:4px 8px; background:transparent; border:none; color:#666; cursor:pointer; font-size:0.8rem;
            ">✕</button>
          `;
          document.body.appendChild(warning);
          warning.querySelector('#size-warning-close')?.addEventListener('click', () => warning.remove());
          state.mapWidth = w;
          state.mapHeight = h;
        }
      };
      mapWidthInput?.addEventListener('change', checkSizeWarning);
      mapHeightInput?.addEventListener('change', checkSizeWarning);
    }

    container.querySelectorAll<HTMLElement>('.wm-tool').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.tool as Tool;
        this.activeTool = id;
        
        // Update visual state of all tool buttons
        container.querySelectorAll<HTMLElement>('.wm-tool').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = '#fff';
          b.style.border = '1px solid transparent';
        });
        // Highlight selected tool
        btn.style.background = 'rgba(255,255,255,0.1)';
        btn.style.color = '#fff';
        btn.style.border = '1px solid rgba(255,255,255,0.2)';
        
        // Show submenu if exists
        const submenuId = `submenu-${id}`;
        const submenu = container.querySelector(`#${submenuId}`) as HTMLElement;
        if (submenu) {
          // Hide all other submenus first
          container.querySelectorAll<HTMLElement>('.wm-submenu-popup').forEach(p => p.style.display = 'none');
          // Show this submenu
          submenu.style.display = 'flex';
          // Position below the button
          const btnRect = btn.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          submenu.style.top = `${btnRect.bottom - containerRect.top + 4}px`;
          submenu.style.left = `${btnRect.left - containerRect.left}px`;
          submenu.style.transform = 'none';
        }
        
        onToolChange(id);
        document.dispatchEvent(new CustomEvent('worldmap-switch-tool', { detail: { tool: id } }));
      });
    });

    // Canvas SHOW UI toggle + Filters menu
    container.querySelector<HTMLElement>('#wm-canvas-show-ui-btn')?.addEventListener('click', () => {
      const filterMenu = container.querySelector('.wm-filter-menu') as HTMLElement;
      if (filterMenu) {
        filterMenu.style.display = filterMenu.style.display === 'none' ? 'block' : 'none';
      }
    });

    // Filter checkboxes
    container.querySelectorAll<HTMLInputElement>('.filter-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const filter = cb.dataset.filter!;
        state[filter] = cb.checked;
        this.render(state);
        this.bind(container, state, onToolChange, onCameraModeChange, onConfigChange);
        document.dispatchEvent(new CustomEvent('show-canvas-ui-changed', { detail: state.showCanvasUI }));
      });
    });

    // Filter all on
    container.querySelector<HTMLElement>('.wm-filter-all-on')?.addEventListener('click', () => {
      state.showGrid = true;
      state.showCollision = true;
      state.showSensors = true;
      state.showAreas = true;
      state.showMorphs = true;
      state.showVectors = true;
      state.showCams = true;
      this.render(state);
      this.bind(container, state, onToolChange, onCameraModeChange, onConfigChange);
      document.dispatchEvent(new CustomEvent('show-canvas-ui-changed', { detail: state.showCanvasUI }));
    });

    // Filter all off
    container.querySelector<HTMLElement>('.wm-filter-all-off')?.addEventListener('click', () => {
      state.showGrid = false;
      state.showCollision = false;
      state.showSensors = false;
      state.showAreas = false;
      state.showMorphs = false;
      state.showVectors = false;
      state.showCams = false;
      this.render(state);
      this.bind(container, state, onToolChange, onCameraModeChange, onConfigChange);
      document.dispatchEvent(new CustomEvent('show-canvas-ui-changed', { detail: state.showCanvasUI }));
    });

    container.querySelectorAll<HTMLElement>('.wm-subtool').forEach(sbtn => {
      handleHover(sbtn as HTMLDivElement);
      sbtn.addEventListener('click', (e) => {
         e.stopPropagation();
         const tool = sbtn.dataset.tool as Tool;
         const subtool = sbtn.dataset.subtool as string;
         this.activeTool = tool;
         this.activeSubTool = subtool;
         container.querySelectorAll<HTMLElement>('.wm-submenu-popup').forEach(p => p.style.display = 'none');
         sbtn.parentElement!.querySelectorAll<HTMLElement>('.wm-subtool').forEach(b => {
             b.style.background = 'transparent';
             b.style.color = '#fff';
         });
sbtn.style.background = 'rgba(255,255,255,0.1)';
         sbtn.style.color = '#fff';
         onToolChange(this.activeTool, this.activeSubTool ?? undefined);
         document.dispatchEvent(new CustomEvent('worldmap-switch-tool', { detail: { tool: this.activeTool } }));
       });
    });

    // Stamp panel bindings
    const stampPanel = container.querySelector('#submenu-stamp') as HTMLElement;
    if (stampPanel) {
      // Tabs
      stampPanel.querySelectorAll('.stamp-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.stampTab = (btn as HTMLElement).dataset.tab;
          onToolChange(this.activeTool);
        });
      });

      // Import PNG
      stampPanel.querySelector('.stamp-import-btn')?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp';
        input.onchange = (e: any) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev: any) => { state.stampBrush.stampUrl = ev.target.result; onToolChange(this.activeTool); };
          reader.readAsDataURL(file);
        };
        input.click();
      });

      // Asset items
      stampPanel.querySelectorAll('.stamp-asset-item').forEach(item => {
        item.addEventListener('click', () => {
          state.stampBrush.stampUrl = (item as HTMLElement).dataset.url!;
          onToolChange(this.activeTool);
        });
      });

      // Params
      stampPanel.querySelectorAll('.stamp-param').forEach(slider => {
        slider.addEventListener('input', (e: any) => {
          const param = (e.currentTarget as HTMLElement).dataset.param!;
          state.stampBrush[param] = parseFloat((e.currentTarget as HTMLInputElement).value);
          onToolChange(this.activeTool);
        });
      });

      // Toggles
      stampPanel.querySelectorAll('.stamp-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
          const toggle = (btn as HTMLElement).dataset.toggle!;
          state.stampBrush[toggle] = !state.stampBrush[toggle];
          onToolChange(this.activeTool);
        });
      });

      // Save preset
      stampPanel.querySelector('.stamp-save-preset')?.addEventListener('click', () => {
        const nameInput = stampPanel.querySelector('.stamp-preset-name') as HTMLInputElement;
        const preset = {
          name: nameInput?.value || ('Preset ' + (state.stampPresets.length + 1)),
          stampUrl: state.stampBrush.stampUrl,
          opacity: state.stampBrush.opacity,
          size: state.stampBrush.size,
          spacing: state.stampBrush.spacing,
          randomSize: state.stampBrush.randomSize,
          randomRotation: state.stampBrush.randomRotation,
          randomMirrorX: state.stampBrush.randomMirrorX,
          randomMirrorY: state.stampBrush.randomMirrorY,
        };
        state.stampPresets.push(preset);
        if (nameInput) nameInput.value = '';
        onToolChange(this.activeTool);
      });

      // Preset items
      stampPanel.querySelectorAll('.stamp-preset-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if ((e.target as HTMLElement).closest('.stamp-preset-delete')) return;
          const idx = parseInt((item as HTMLElement).dataset.idx!);
          const preset = state.stampPresets[idx];
          if (preset) {
            Object.assign(state.stampBrush, preset);
            onToolChange(this.activeTool);
          }
        });
      });

      // Preset delete
      stampPanel.querySelectorAll('.stamp-preset-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt((btn as HTMLElement).dataset.idx!);
          state.stampPresets.splice(idx, 1);
          onToolChange(this.activeTool);
        });
      });

      // Clear stamps
      stampPanel.querySelector('.stamp-clear-btn')?.addEventListener('click', () => {
        state.stampBrush.stamps = [];
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        onToolChange(this.activeTool);
      });
    }

    // Command buttons
    container.querySelectorAll('.wm-cmd-btn').forEach(btn => {
      if ((btn as HTMLElement).id === 'wm-btn-runs') return; // Skip RUNS, it has custom logic
      btn.addEventListener('click', () => {
        const cmd = (btn as HTMLElement).dataset.cmd;
        document.dispatchEvent(new CustomEvent('wm-command', { detail: { cmd } }));
      });
      handleHover(btn as HTMLDivElement);
    });

    const runsBtn = container.querySelector('#wm-btn-runs');
    if (runsBtn) {
      runsBtn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('start-run-sequence'));
      });
      handleHover(runsBtn as HTMLDivElement);
    }

    function handleHover(el: HTMLDivElement) {
      el.addEventListener('mouseenter', () => {
        if (!el.style.background.includes('81,197,255') && !el.style.background.includes('255,51,102') && !el.style.background.includes('76,255,136')) {
          el.style.background = 'rgba(255,255,255,0.08)';
        }
      });
      el.addEventListener('mouseleave', () => {
        if (el.style.background === 'rgba(255,255,255,0.08)') {
          el.style.background = 'transparent';
        }
      });
    }
  }

  public destroy() {
    if (this._bindCloseExt) {
      document.removeEventListener('click', this._bindCloseExt);
      this._bindCloseExt = null;
    }
    this._eventsBound = false;
  }
}
