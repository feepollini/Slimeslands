export class PhaseToolbar {
  private uiMenuOpen = false;

  public render(state: any): string {
    const showUI = state.showPreviewUI !== false;
    const isPlaying = state.phasePlaying === true;
    const hasPhase = state.phasePresets && state.phasePresets.length > 0;
    
    const uiOptions = [
      { key: 'showGrid', label: 'Grade', icon: '📐', color: '#51c5ff' },
      { key: 'showHandles', label: 'Handles', icon: '⬡', color: '#a78bfa' },
      { key: 'showCoords', label: 'Coordenadas', icon: '📍', color: '#ffd700' },
      { key: 'showCollision', label: 'Colisões', icon: '🧱', color: '#ff4444' },
      { key: 'showSensors', label: 'Sensores', icon: '◫', color: '#44ccff' },
      { key: 'showLabels', label: 'Labels', icon: '🏷️', color: '#4cff88' },
    ];

    const getUiToggle = (opt: typeof uiOptions[0]) => {
      const isOn = state[opt.key] !== false;
      return `
        <div class="ui-toggle-item" data-ui="${opt.key}" style="
          display:flex; align-items:center; justify-content:space-between;
          padding:8px 10px; border-radius:4px; margin-bottom:2px;
          cursor:pointer; transition:0.15s;
          background:${isOn ? 'rgba(255,255,255,0.05)' : 'transparent'};
        " onmouseover="this.style.background='rgba(255,255,255,0.08'" onmouseout="this.style.background='${isOn ? 'rgba(255,255,255,0.05)' : 'transparent'}'">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:0.7rem;">${opt.icon}</span>
            <span style="font-size:0.55rem; color:${isOn ? '#fff' : '#666'}; font-weight:900;">${opt.label}</span>
          </div>
          <div style="width:8px; height:8px; border-radius:50%; background:${isOn ? opt.color : '#333'}; box-shadow:${isOn ? `0 0 8px ${opt.color}` : 'none'};"></div>
        </div>
      `;
    };

    const uiMenu = this.uiMenuOpen ? `
      <div id="ui-menu-dropdown" style="
        position:absolute; top:100%; right:0; margin-top:4px;
        background:#0d0d12; border:1px solid #2a2a34; border-radius:8px;
        padding:8px; min-width:180px; z-index:1000;
        box-shadow:0 10px 30px rgba(0,0,0,0.5);
      ">
        <div style="font-size:0.5rem; color:#666; font-weight:900; letter-spacing:1px; margin-bottom:8px; padding:0 4px;">
          OPÇÕES DE VISUALIZAÇÃO
        </div>
        ${uiOptions.map(opt => getUiToggle(opt)).join('')}
        <div style="border-top:1px solid #222; margin-top:8px; padding-top:8px;">
          <div class="ui-toggle-item" data-ui="allOn" style="
            padding:6px 10px; border-radius:4px; cursor:pointer;
            background:rgba(76,255,136,0.1); color:#4cff88;
            font-size:0.5rem; font-weight:900; text-align:center;
          ">✓ TUDO ON</div>
          <div class="ui-toggle-item" data-ui="allOff" style="
            padding:6px 10px; border-radius:4px; cursor:pointer;
            background:rgba(255,51,102,0.1); color:#ff3366;
            font-size:0.5rem; font-weight:900; text-align:center; margin-top:4px;
          ">✕ TUDO OFF</div>
        </div>
      </div>
    ` : '';

    return `
      <div id="phase-toolbar" style="
        display:flex; align-items:center; gap:6px;
        padding:6px 10px;
        background:rgba(0,0,0,0.6);
        border-bottom:1px solid rgba(255,255,255,0.08);
        flex-shrink:0; position:relative;
      ">
        <button id="phase-play-btn" style="
          display:flex; align-items:center; gap:4px;
          padding:4px 10px; border-radius:4px; cursor:pointer;
          border:1px solid ${isPlaying ? '#4cff88' : 'rgba(76,255,136,0.3)'};
          background:${isPlaying ? 'rgba(76,255,136,0.15)' : 'rgba(76,255,136,0.08)'};
          color:${isPlaying ? '#4cff88' : '#4cff88'};
          font-size:0.55rem; font-weight:900; letter-spacing:0.5px;
          text-transform:uppercase; transition:0.12s;
        ">
          <span style="font-size:0.7rem;">${isPlaying ? '⏸' : '▶'}</span>
          ${isPlaying ? 'PAUSE' : 'PLAY'}
        </button>

        <button id="phase-run-btn" style="
          display:flex; align-items:center; gap:4px;
          padding:4px 10px; border-radius:4px; cursor:pointer;
          border:1px solid ${hasPhase ? '#51c5ff' : 'rgba(81,197,255,0.2)'};
          background:${hasPhase ? 'rgba(81,197,255,0.15)' : 'rgba(81,197,255,0.05)'};
          color:${hasPhase ? '#51c5ff' : 'rgba(81,197,255,0.3)'};
          font-size:0.55rem; font-weight:900; letter-spacing:0.5px;
          text-transform:uppercase; transition:0.12s;
        ">
          <span style="font-size:0.7rem;">🎮</span>
          JOGAR
        </button>

        <div style="flex:1;"></div>

        <div style="position:relative;">
          <button id="phase-show-ui-btn" style="
            display:flex; align-items:center; gap:4px;
            padding:4px 10px; border-radius:4px; cursor:pointer;
            border:1px solid ${showUI ? '#ffd700' : 'rgba(255,215,0,0.2)'};
            background:${showUI ? 'rgba(255,215,0,0.15)' : 'rgba(255,215,0,0.05)'};
            color:${showUI ? '#ffd700' : 'rgba(255,215,0,0.4)'};
            font-size:0.55rem; font-weight:900; letter-spacing:0.5px;
            text-transform:uppercase; transition:0.12s;
          ">
            👁️ ${showUI ? 'ON' : 'OFF'}
          </button>
          ${uiMenu}
        </div>
      </div>
    `;
  }

  public bind(container: HTMLElement, state: any, callbacks: any) {
    container.querySelector('#phase-play-btn')?.addEventListener('click', () => {
      state.phasePlaying = !state.phasePlaying;
      document.dispatchEvent(new CustomEvent('phase-play-toggled', { detail: state.phasePlaying }));
      this.render(state);
      this.bind(container, state, callbacks);
    });

    container.querySelector('#phase-run-btn')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('start-run-sequence'));
    });

    const uiBtn = container.querySelector('#phase-show-ui-btn') as HTMLElement;
    if (uiBtn) {
      uiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.uiMenuOpen = !this.uiMenuOpen;
        this.render(state);
        this.bind(container, state, callbacks);
      });
    }

    container.querySelectorAll('.ui-toggle-item').forEach(item => {
      item.addEventListener('click', () => {
        const key = (item as HTMLElement).dataset.ui;
        
        if (key === 'allOn') {
          state.showGrid = true;
          state.showHandles = true;
          state.showCoords = true;
          state.showCollision = true;
          state.showSensors = true;
          state.showLabels = true;
          state.showPreviewUI = true;
        } else if (key === 'allOff') {
          state.showGrid = false;
          state.showHandles = false;
          state.showCoords = false;
          state.showCollision = false;
          state.showSensors = false;
          state.showLabels = false;
          state.showPreviewUI = false;
        } else if (key) {
          state[key] = state[key] === false ? true : false;
        }
        
        document.dispatchEvent(new CustomEvent('ui-options-changed', { detail: state }));
        this.uiMenuOpen = false;
        this.render(state);
        this.bind(container, state, callbacks);
      });
    });

    document.addEventListener('click', () => {
      if (this.uiMenuOpen) {
        this.uiMenuOpen = false;
        this.render(state);
        this.bind(container, state, callbacks);
      }
    });
  }
}
