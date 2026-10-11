export class CameraPanel {
  private state: any;
  private callbacks: any;
  
  constructor() {}
  
  public render(state: any, callbacks?: any): string {
    this.state = state;
    if (callbacks) this.callbacks = callbacks;
    
    const objects = state.worldMapObjects || [];
    const camera = objects.find((o: any) => o.type === 'camera');
    const selectedId = state.selectedId;
    
    if (!camera) {
      return this.renderNoCamera();
    }
    
    return this.renderCameraPanel(camera);
  }
  
  private renderNoCamera(): string {
    return `
      <div style="padding: 20px; text-align: center;">
        <div style="font-size: 2rem; margin-bottom: 10px;">📹</div>
        <div style="color: #888; font-size: 0.7rem; font-weight: 900; letter-spacing: 1px; margin-bottom: 15px;">
          NENHUMA CÂMERA
        </div>
        <div style="color: #555; font-size: 0.55rem;">
          Use a ferramenta "Ins. Câmera" para criar
        </div>
      </div>
    `;
  }
  
  private renderCameraPanel(camera: any): string {
    const trackingMode = camera.trackingMode || 'follow_player';
    const cameraMode = camera.cameraMode || 'portrait';
    const cameraZoom = camera.cameraZoom || 1;
    
    return `
      <div style="padding: 12px; display: flex; flex-direction: column; gap: 12px;">
        <!-- Nome da Câmera -->
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1rem;">📹</span>
          <input type="text" id="camera-name" value="${camera.label || 'Câmera'}" 
            style="flex:1; background:#0a0a10; border:1px solid #333; border-radius:4px; 
            padding:6px 8px; color:#fff; font-size:0.6rem; font-weight:900;"
          />
        </div>
        
        <!-- Tracking Mode -->
        <div>
          <div style="color:#666; font-size:0.5rem; font-weight:900; letter-spacing:1px; margin-bottom:6px;">
            MODO DE RASTREAMENTO
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="tracking-btn" data-mode="follow_player" style="
              flex:1; padding:8px; border-radius:4px; cursor:pointer; font-size:0.5rem; font-weight:900;
              background:${trackingMode === 'follow_player' ? 'rgba(76,255,136,0.15)' : 'transparent'};
              color:${trackingMode === 'follow_player' ? '#4cff88' : '#555'};
              border:1px solid ${trackingMode === 'follow_player' ? '#4cff8844' : '#333'};
            ">👤 SEGUIR</button>
            <button class="tracking-btn" data-mode="fixed" style="
              flex:1; padding:8px; border-radius:4px; cursor:pointer; font-size:0.5rem; font-weight:900;
              background:${trackingMode === 'fixed' ? 'rgba(255,51,102,0.15)' : 'transparent'};
              color:${trackingMode === 'fixed' ? '#ff3366' : '#555'};
              border:1px solid ${trackingMode === 'fixed' ? '#ff336644' : '#333'};
            ">🔒 FIXO</button>
            <button class="tracking-btn" data-mode="free" style="
              flex:1; padding:8px; border-radius:4px; cursor:pointer; font-size:0.5rem; font-weight:900;
              background:${trackingMode === 'free' ? 'rgba(81,197,255,0.15)' : 'transparent'};
              color:${trackingMode === 'free' ? '#51c5ff' : '#555'};
              border:1px solid ${trackingMode === 'free' ? '#51c5ff44' : '#333'};
            ">✋ LIVRE</button>
          </div>
        </div>
        
        <!-- Aspect Ratio -->
        <div>
          <div style="color:#666; font-size:0.5rem; font-weight:900; letter-spacing:1px; margin-bottom:6px;">
            PROPORÇÃO (ASPECT RATIO)
          </div>
          <div style="display:flex; gap:6px;">
            <button class="aspect-btn" data-mode="portrait" style="
              flex:1; padding:8px; border-radius:4px; cursor:pointer; font-size:0.5rem; font-weight:900;
              background:${cameraMode === 'portrait' ? 'rgba(255,215,0,0.15)' : 'transparent'};
              color:${cameraMode === 'portrait' ? '#ffd700' : '#555'};
              border:1px solid ${cameraMode === 'portrait' ? '#ffd70044' : '#333'};
            ">📱 9:16</button>
            <button class="aspect-btn" data-mode="landscape" style="
              flex:1; padding:8px; border-radius:4px; cursor:pointer; font-size:0.5rem; font-weight:900;
              background:${cameraMode === 'landscape' ? 'rgba(255,215,0,0.15)' : 'transparent'};
              color:${cameraMode === 'landscape' ? '#ffd700' : '#555'};
              border:1px solid ${cameraMode === 'landscape' ? '#ffd70044' : '#333'};
            ">🖥️ 16:9</button>
          </div>
        </div>
        
        <!-- Camera Zoom -->
        <div>
          <div style="color:#666; font-size:0.5rem; font-weight:900; letter-spacing:1px; margin-bottom:6px;">
            ZOOM (TAMANHO NO MAPA)
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="zoom-btn" data-action="decrease" style="
              width:30px; height:30px; border-radius:4px; cursor:pointer; font-size:1rem;
              background:#1a1a24; border:1px solid #333; color:#fff;
            ">-</button>
            <div style="flex:1; text-align:center; color:#51c5ff; font-size:0.8rem; font-weight:900;">
              ${cameraZoom.toFixed(1)}x
            </div>
            <button class="zoom-btn" data-action="increase" style="
              width:30px; height:30px; border-radius:4px; cursor:pointer; font-size:1rem;
              background:#1a1a24; border:1px solid #333; color:#fff;
            ">+</button>
          </div>
          <input type="range" id="camera-zoom-slider" min="0.5" max="3" step="0.1" value="${cameraZoom}"
            style="width:100%; margin-top:8px; accent-color:#51c5ff;"
          />
        </div>
        
        <!-- Posição -->
        <div>
          <div style="color:#666; font-size:0.5rem; font-weight:900; letter-spacing:1px; margin-bottom:6px;">
            POSIÇÃO NO MAPA
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <div>
              <div style="color:#555; font-size:0.45rem;">X</div>
              <input type="number" id="camera-x" value="${Math.round(camera.x)}"
                style="width:100%; background:#0a0a10; border:1px solid #333; border-radius:4px;
                padding:6px; color:#fff; font-size:0.55rem;"
              />
            </div>
            <div>
              <div style="color:#555; font-size:0.45rem;">Y</div>
              <input type="number" id="camera-y" value="${Math.round(camera.y)}"
                style="width:100%; background:#0a0a10; border:1px solid #333; border-radius:4px;
                padding:6px; color:#fff; font-size:0.55rem;"
              />
            </div>
          </div>
        </div>
        
        <!-- Dimensões -->
        <div>
          <div style="color:#666; font-size:0.5rem; font-weight:900; letter-spacing:1px; margin-bottom:6px;">
            DIMENSÕES (LARGURA x ALTURA)
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <div>
              <div style="color:#555; font-size:0.45rem;">W</div>
              <input type="number" id="camera-w" value="${Math.round(camera.w)}"
                style="width:100%; background:#0a0a10; border:1px solid #333; border-radius:4px;
                padding:6px; color:#fff; font-size:0.55rem;"
              />
            </div>
            <div>
              <div style="color:#555; font-size:0.45rem;">H</div>
              <input type="number" id="camera-h" value="${Math.round(camera.h)}"
                style="width:100%; background:#0a0a10; border:1px solid #333; border-radius:4px;
                padding:6px; color:#fff; font-size:0.55rem;"
              />
            </div>
          </div>
        </div>
        
        <!-- Info -->
        <div style="margin-top:8px; padding:8px; background:#0a0a10; border-radius:4px;">
          <div style="color:#555; font-size:0.45rem; margin-bottom:4px;">
            Use a ferramenta "Ins. Câmera" para mover
          </div>
        </div>
      </div>
    `;
  }
  
  public bind(container: HTMLElement, state: any, callbacks: any) {
    this.state = state;
    this.callbacks = callbacks;
    
    // Tracking mode buttons
    container.querySelectorAll('.tracking-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = (e.target as HTMLElement).dataset.mode;
        this.updateCameraProperty('trackingMode', mode);
      });
    });
    
    // Aspect ratio buttons
    container.querySelectorAll('.aspect-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = (e.target as HTMLElement).dataset.mode;
        this.updateCameraProperty('cameraMode', mode);
      });
    });
    
    // Zoom buttons
    container.querySelectorAll('.zoom-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = (e.target as HTMLElement).dataset.action;
        const camera = this.getCamera();
        if (!camera) return;
        const currentZoom = camera.cameraZoom || 1;
        let newZoom = currentZoom;
        if (action === 'increase') newZoom = Math.min(currentZoom + 0.5, 5);
        if (action === 'decrease') newZoom = Math.max(currentZoom - 0.5, 0.5);
        this.updateCameraProperty('cameraZoom', newZoom);
      });
    });
    
    // Zoom slider
    const slider = container.querySelector('#camera-zoom-slider') as HTMLInputElement;
    if (slider) {
      slider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.updateCameraProperty('cameraZoom', value);
      });
    }
    
    // Position inputs
    const inputX = container.querySelector('#camera-x') as HTMLInputElement;
    const inputY = container.querySelector('#camera-y') as HTMLInputElement;
    if (inputX && inputY) {
      inputX.addEventListener('change', () => this.updateCameraPosition());
      inputY.addEventListener('change', () => this.updateCameraPosition());
    }
    
    // Size inputs
    const inputW = container.querySelector('#camera-w') as HTMLInputElement;
    const inputH = container.querySelector('#camera-h') as HTMLInputElement;
    if (inputW && inputH) {
      inputW.addEventListener('change', () => this.updateCameraSize());
      inputH.addEventListener('change', () => this.updateCameraSize());
    }
    
    // Name input
    const nameInput = container.querySelector('#camera-name') as HTMLInputElement;
    if (nameInput) {
      nameInput.addEventListener('change', () => {
        this.updateCameraProperty('label', nameInput.value);
      });
    }
  }
  
  private getCamera(): any {
    const objects = this.state?.worldMapObjects || [];
    return objects.find((o: any) => o.type === 'camera');
  }
  
  private updateCameraProperty(prop: string, value: any) {
    const camera = this.getCamera();
    if (!camera) return;
    
    camera[prop] = value;
    this.callbacks?.reRender?.();
    
    // Trigger redraw
    document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
  }
  
  private updateCameraPosition() {
    const camera = this.getCamera();
    if (!camera) return;
    
    const inputX = document.querySelector('#camera-x') as HTMLInputElement;
    const inputY = document.querySelector('#camera-y') as HTMLInputElement;
    
    if (inputX && inputY) {
      camera.x = parseFloat(inputX.value) || 0;
      camera.y = parseFloat(inputY.value) || 0;
      document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
    }
  }
  
  private updateCameraSize() {
    const camera = this.getCamera();
    if (!camera) return;
    
    const inputW = document.querySelector('#camera-w') as HTMLInputElement;
    const inputH = document.querySelector('#camera-h') as HTMLInputElement;
    
    if (inputW && inputH) {
      camera.w = parseFloat(inputW.value) || 360;
      camera.h = parseFloat(inputH.value) || 720;
      document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
    }
  }
}
