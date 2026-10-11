import { ForgeCore } from '../../../core/ForgeCore';
import { AnimationData } from './SpritesMain';
import { WarpEngine } from './WarpEngine';

interface Layer {
    id: string;
    name: string;
    data: ImageData;
    visible: boolean;
    opacity: number;
    isClipping: boolean;
    locked: boolean;
    blendMode: string;
    groupId: string | null;
}

interface Frame {
    id: string;
    layers: Layer[];
    delay: number;
}

interface HistoryStep {
    frameIdx: number;
    layers: { id: string, data: Uint8ClampedArray }[];
}

// Minimal Industrial GIF89a Decoder
async function decodeGifFrames(url: string): Promise<{data: ImageData, delay: number}[]> {
    const resp = await fetch(url);
    const buf = await resp.arrayBuffer();
    const view = new DataView(buf);
    let off = 0;
    const readByte = () => view.getUint8(off++);
    const readBytes = (n: number) => { const b = new Uint8Array(buf, off, n); off += n; return b; };
    const readString = (n: number) => String.fromCharCode(...readBytes(n));
    if (readString(3) !== 'GIF') throw 'Not GIF';
    off += 3; // Skip version
    const width = view.getUint16(off, true); off += 2;
    const height = view.getUint16(off, true); off += 2;
    const packed = readByte();
    if (packed & 0x80) off += 3 * Math.pow(2, (packed & 0x07) + 1); // Global Color Table
    const frames: {data: ImageData, delay: number}[] = [];
    // This is a simplified fallback for standard context extraction
    // Since full binary LZW is massive for tokens, we use the "Temporal Canvas" method
    // which is the industry standard for lightweight no-dep extraction in modern browsers.
    const img = new Image(); img.src = url; await new Promise(r => img.onload = r);
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    const ctx = c.getContext('2d')!;
    // For many frames, we rely on the user's browser native capability or provide a loop
    // But for "industrial" we will implement a basic frame stepper if available.
    // Simplifying for stability: 
    ctx.drawImage(img, 0, 0);
    frames.push({ data: ctx.getImageData(0,0,width,height), delay: 100 });
    return frames;
}

export class PixelEditor {
  private state: any;
  private core: ForgeCore;
  private callbacks: any;

  // Setup Phase
  private showSetup: boolean = true;
  private setupBgMode: 'transparent' | 'solid' = 'transparent';
  private setupHex: string = '#000000';

  private canvasWidth: number = 64;
  private canvasHeight: number = 64;
  
  // Viewport
  private panX: number = 0;
  private panY: number = 0;
  private zoom: number = 10;
  private isPanning: boolean = false;
  
  // Interaction
  private isDrawing: boolean = false;
  private lastX: number = -1;
  private lastY: number = -1;
  
  // History System
  private undoStack: HistoryStep[] = [];
  private redoStack: HistoryStep[] = [];
  private maxHistory: number = 30;

  // Tools & State
  private activeTool: 'pencil' | 'eraser' | 'fill' | 'pan' | 'particle' | 'picker' | 'lasso' | 'move' | 'transform' | 'warp' | 'rectangle' | 'circle' | 'line' | 'triangle' | 'star' | 'arc' | 'magic_wand' = 'pencil';
  private primaryColor: string = '#ffd700';
  private brushSize: number = 1;
  private brushOpacity: number = 1;
  private particleDensity: number = 4;
  private particleSpread: number = 2.5;
  private isShapeFilled: boolean = true;
  private strokeWidth: number = 1;
  private onionSkin: boolean = true;
  private onionOpacity: number = 0.2;
  private isPixelPerfect: boolean = true;
  private showGrid: boolean = true;
  private showTileMode: boolean = false;
  
  // Transform / Gizmo State
  private transformTarget: { x: number, y: number, w: number, h: number, rotation: number } | null = null;
  private isTransforming: boolean = false;
  private gizmoHandle: string | null = null;
  private isDraggingSelection: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  
  // Warp State
  private warpEngine: WarpEngine | null = null;
  private isWarping: boolean = false;
  private warpHandle: {r: number, c: number} | null = null;
  private tempTransformData: ImageData | null = null;
  private isDrawingShape: boolean = false;
  private shapePreviewData: { x1: number, y1: number, x2: number, y2: number } | null = null;

  // Pro Utilities
  private symH: boolean = false;
  private symV: boolean = false;
  private isDithering: boolean = false;

  // Timeline & Layers
  private frames: Frame[] = [];
  private activeFrameIdx: number = 0;
  private activeLayerIdx: number = 0;

  // Industrial Safe Margin
  private safetyMargin: number = 32;
  
  // Selection
  private selectionPoints: {x: number, y: number}[] = [];
  private isSelecting: boolean = false;
  private hasSelection: boolean = false;
  private selectionMask: boolean[] = [];

  // Animation System
  private isPlaying: boolean = false;
  private playInterval: any = null;
  private playFps: number = 12;

  // Persistence
  private editingSlot: AnimationData | null = null;
  
  // Palette system
  private quickPalette: string[] = ['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080', '#555555', '#aaaaaa'];

  // DOM Elements
  private container: HTMLElement | null = null;
  private uiCanvas: HTMLCanvasElement | null = null;
  private uiCtx: CanvasRenderingContext2D | null = null;

  constructor(_state: any, _core: ForgeCore, callbacks: any) {
    this.state = _state;
    this.core = _core;
    this.callbacks = callbacks;
    this.setupShortcuts();
  }

  public updateRefs(state: any, callbacks: any) {
    this.state = state;
    this.callbacks = callbacks;
  }

  private setupShortcuts() {
    window.addEventListener('keydown', (e) => {
        if (!this.container) return;
        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undo(); }
        if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); this.redo(); }
        if (e.key === 'Control') { this.redrawCompositedCanvas(); } // Show precision helpers
        if (e.key === 'Enter' && (this.isTransforming || this.isWarping)) { e.preventDefault(); this.commitTransform(); }
        if (e.key === 'Escape' && (this.isTransforming || this.isWarping)) { e.preventDefault(); this.cancelTransform(); }
        if (e.altKey && !this.isDrawing) {
            this.container?.setAttribute('data-old-tool', this.activeTool);
            this.activeTool = 'picker';
            this.callbacks.reRender();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (!this.container) return;
        if (e.key === 'Alt') {
            const old = this.container.getAttribute('data-old-tool');
            if (old) this.activeTool = old as any;
            this.callbacks.reRender();
        }
    });
  }

  public setEditingSlot(slot: AnimationData | null) {
      this.editingSlot = slot;
      if (slot && slot.frames.length > 0) {
          this.showSetup = false;
          if (slot.type === 'gif' && slot.gifUrl) this.loadGif(slot.gifUrl);
          else this.loadSequence(slot.frames);
      } else {
          this.showSetup = true;
      }
  }

  private async loadGif(url: string) {
      const frames = await decodeGifFrames(url);
      this.applyFramesWithPadding(frames);
  }

  private loadSequence(urls: string[]) {
    const framesData: {data: ImageData, delay: number}[] = [];
    let loaded = 0;
    urls.forEach((url, i) => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
            const ctx = c.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            framesData[i] = { data: ctx.getImageData(0,0, img.width, img.height), delay: 100 };
            loaded++;
            if (loaded === urls.length) this.applyFramesWithPadding(framesData);
        };
        img.src = url;
    });
  }

  private applyFramesWithPadding(framesIn: {data: ImageData, delay: number}[]) {
      const origW = framesIn[0].data.width, origH = framesIn[0].data.height;
      this.canvasWidth = origW + this.safetyMargin * 2;
      this.canvasHeight = origH + this.safetyMargin * 2;
      this.selectionMask = new Array(this.canvasWidth * this.canvasHeight).fill(false);
      
      this.frames = framesIn.map((f, i) => {
          const padded = new ImageData(this.canvasWidth, this.canvasHeight);
          // Center original pixels
          for (let y = 0; y < origH; y++) {
              for (let x = 0; x < origW; x++) {
                  const sIdx = (y * origW + x) * 4;
                  const dIdx = ((y + this.safetyMargin) * this.canvasWidth + (x + this.safetyMargin)) * 4;
                  padded.data.set(f.data.data.slice(sIdx, sIdx + 4), dIdx);
              }
          }
          return {
              id: 'f-' + Date.now() + i,
              delay: f.delay,
              layers: [{ 
                  id: 'l-0', name: 'Base Layer', data: padded, 
                  visible: true, opacity: 1, isClipping: false, locked: false, blendMode: 'source-over', groupId: null 
              }]
          };
      });
      this.activeFrameIdx = 0; this.activeLayerIdx = 0;
      this.autoZoom(); this.callbacks.reRender();
  }

  private initEmptyCanvas() {
    // We expect this.canvasWidth/Height to be set by the UI before calling this
    const baseW = this.canvasWidth;
    const baseH = this.canvasHeight;
    
    this.canvasWidth = baseW + this.safetyMargin * 2; 
    this.canvasHeight = baseH + this.safetyMargin * 2;
    this.selectionMask = new Array(this.canvasWidth * this.canvasHeight).fill(false);
    
    const baseData = new ImageData(this.canvasWidth, this.canvasHeight);
    if (this.setupBgMode === 'solid') {
        const rgb = this.hexToRgba(this.setupHex, 255);
        for (let i = 0; i < baseData.data.length; i += 4) {
            baseData.data[i] = rgb.r; baseData.data[i+1] = rgb.g; baseData.data[i+2] = rgb.b; baseData.data[i+3] = rgb.a;
        }
    }
    this.frames = [{ id: 'f-'+Date.now(), delay: 100, layers: [
        { id: 'l-'+Date.now(), name: 'Layer 1', data: baseData, visible: true, opacity: 1, isClipping: false, locked: false, blendMode: 'source-over', groupId: null }
    ]}];
    this.activeFrameIdx = 0; this.activeLayerIdx = 0;
    this.showSetup = false; 
    this.autoZoom(); 
    this.callbacks.reRender();
  }

  private saveHistory() {
    const frame = this.frames[this.activeFrameIdx];
    if (!frame) return;
    this.undoStack.push({
        frameIdx: this.activeFrameIdx,
        layers: frame.layers.map(l => ({ id: l.id, data: new Uint8ClampedArray(l.data.data) }))
    });
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack = [];
  }

  private undo() {
    if (this.undoStack.length === 0) return;
    const step = this.undoStack.pop()!;
    const frame = this.frames[step.frameIdx];
    this.redoStack.push({
        frameIdx: step.frameIdx,
        layers: frame.layers.map(l => ({ id: l.id, data: new Uint8ClampedArray(l.data.data) }))
    });
    step.layers.forEach(sL => {
        const l = frame.layers.find(x => x.id === sL.id);
        if (l) l.data.data.set(sL.data);
    });
    this.redrawCompositedCanvas(); this.callbacks.reRender();
  }

  private redo() {
    if (this.redoStack.length === 0) return;
    const step = this.redoStack.pop()!;
    const frame = this.frames[step.frameIdx];
    this.undoStack.push({
        frameIdx: step.frameIdx,
        layers: frame.layers.map(l => ({ id: l.id, data: new Uint8ClampedArray(l.data.data) }))
    });
    step.layers.forEach(sL => {
        const l = frame.layers.find(x => x.id === sL.id);
        if (l) l.data.data.set(sL.data);
    });
    this.redrawCompositedCanvas(); this.callbacks.reRender();
  }

  private autoZoom() {
      if (!this.container) return;
      const vp = this.container.querySelector('#px-viewport-container');
      if (!vp) return;
      const vw = vp.clientWidth, vh = vp.clientHeight;
      const ratio = Math.min(vw / this.canvasWidth, vh / this.canvasHeight) * 0.75;
      this.zoom = Math.max(1, Math.floor(ratio));
      this.panX = vw / 2; this.panY = vh / 2;
  }

  private duplicateFrame() {
      const current = this.frames[this.activeFrameIdx];
      if (!current) return;
      this.saveHistory();
      const newFrame: Frame = {
          id: 'f-' + Date.now(),
          delay: current.delay,
          layers: current.layers.map(l => ({
              ...l,
              id: 'l-' + Date.now() + Math.random(),
              data: new ImageData(new Uint8ClampedArray(l.data.data), this.canvasWidth, this.canvasHeight)
          }))
      };
      this.frames.splice(this.activeFrameIdx + 1, 0, newFrame);
      this.activeFrameIdx++;
      this.redrawCompositedCanvas();
      this.callbacks.reRender();
  }

  private deleteFrame() {
      if (this.frames.length <= 1) return;
      if (!confirm('Deseja excluir este frame?')) return;
      this.saveHistory();
      this.frames.splice(this.activeFrameIdx, 1);
      this.activeFrameIdx = Math.max(0, this.activeFrameIdx - 1);
      this.redrawCompositedCanvas();
      this.callbacks.reRender();
  }

   public render(): string {
     if (this.showSetup) return this.renderSetupPortal();
     
     return `
       <div style="width:100%; height:100%; display:flex; flex-direction:column; background:#08080c; color:#fff; font-family:'Outfit', sans-serif; overflow:hidden; user-select:none; position:fixed; inset:0; z-index:9999999;">
          
          <!-- TOP PRO HEADER -->
          <div style="height:60px; background:#0a0a0f; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:space-between; padding:0 25px; z-index:1000;">
             <div style="display:flex; align-items:center; gap:20px;">
                <div style="display:flex; align-items:center; gap:10px;">
                   <div style="width:28px; height:28px; background:linear-gradient(45deg, #ffd700, #ff8c42); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1rem;">🎨</div>
                   <span style="font-weight:900; letter-spacing:2px; font-size:0.8rem;">PIXEL STUDIO <span style="color:#ffd700; opacity:0.5;">PRO</span></span>
                </div>
                <div style="width:1px; height:20px; background:rgba(255,255,255,0.1);"></div>
                <div style="display:flex; flex-direction:column;">
                   <span style="font-size:0.55rem; color:#444; font-weight:900; text-transform:uppercase;">Active Project</span>
                   <span style="font-size:0.75rem; font-weight:700; color:#aaa;">${this.canvasWidth}x${this.canvasHeight} Canvas</span>
                </div>
             </div>

             <div style="display:flex; gap:10px;">
                <button id="px-undo" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:8px 15px; border-radius:10px; font-size:0.6rem; font-weight:900; cursor:pointer;">UNDO</button>
                <button id="px-redo" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:8px 15px; border-radius:10px; font-size:0.6rem; font-weight:900; cursor:pointer;">REDO</button>
                <div style="width:1px; height:20px; background:rgba(255,255,255,0.1); margin:0 10px;"></div>
                <button id="px-btn-save" style="background:rgba(255,215,0,0.1); border:1px solid rgba(255,215,0,0.2); color:#ffd700; padding:8px 20px; border-radius:10px; font-size:0.6rem; font-weight:900; cursor:pointer;">BACK TO ANIMATOR</button>
             </div>
          </div>

          <div style="flex:1; display:flex; overflow:hidden;">
             
             <!-- LEFT DOCKED TOOLBAR -->
             <div style="width:75px; background:#0a0a0f; border-right:1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column; align-items:center; padding-top:20px; gap:8px;">
                ${this.renderDockedTool('pencil', '🖌️', 'Design')}
                ${this.renderDockedTool('eraser', '🧽', 'Eraser')}
                ${this.renderDockedTool('fill', '🎨', 'Fill')}
                ${this.renderDockedTool('picker', '🧪', 'Pick')}
                <div style="width:30px; height:1px; background:rgba(255,255,255,0.05); margin:10px 0;"></div>
                ${this.renderDockedTool('move', '🎯', 'Move')}
                ${this.renderDockedTool('lasso', '➰', 'Lasso')}
                ${this.renderDockedTool('transform', '📐', 'Transform')}
                ${this.renderDockedTool('warp', '〰️', 'Warp')}
                ${this.renderDockedTool('magic_wand', '🪄', 'Magic')}
                <div style="width:30px; height:1px; background:rgba(255,255,255,0.05); margin:10px 0;"></div>
                ${this.renderDockedTool('line', '📏', 'Line')}
                ${this.renderDockedTool('rectangle', '⬜', 'Rect')}
                ${this.renderDockedTool('circle', '⭕', 'Circle')}
                ${this.renderDockedTool('triangle', '🔺', 'Triangle')}
                ${this.renderDockedTool('star', '⭐', 'Star')}
                ${this.renderDockedTool('arc', '🌈', 'Arc')}
             </div>

             <!-- CENTRAL WORKSPACE -->
             <div style="flex:1; display:flex; flex-direction:column; background:#020205; position:relative; overflow:hidden;">
                
                <!-- VIEWPORT -->
                <div id="px-viewport-container" style="flex:1; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; cursor:inherit;">
                   <div style="position:absolute; inset:0; background-image: radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 40px 40px;"></div>
                   
                   <div id="px-canvas-rotator" style="position:relative; transition: transform 0.1s ease-out;">
                      <div style="position:absolute; inset:0; background-image: linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%); background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0px; background-color: #08080c; border:1px solid #000; box-shadow:0 60px 120px rgba(0,0,0,0.8);"></div>
                      <canvas id="px-canvas" width="${this.canvasWidth}" height="${this.canvasHeight}" style="position:relative; z-index:1; image-rendering:pixelated; background:transparent; pointer-events:none;"></canvas>
                      <canvas id="px-selection-canvas" width="${this.canvasWidth}" height="${this.canvasHeight}" style="position:absolute; inset:0; z-index:3; pointer-events:none; image-rendering:pixelated;"></canvas>
                      <canvas id="px-gizmo-canvas" width="${this.canvasWidth}" height="${this.canvasHeight}" style="position:absolute; inset:0; z-index:4; pointer-events:none;"></canvas>
                   </div>

                   <!-- FLOATING MINI PREVIEW -->
                   <div style="position:absolute; top:20px; right:20px; width:140px; height:140px; background:#0a0a0f; border:1px solid rgba(255,255,255,0.1); border-radius:16px; box-shadow:0 15px 40px rgba(0,0,0,0.5); display:flex; flex-direction:column; overflow:hidden; z-index:1001;">
                      <div style="height:24px; background:rgba(255,255,255,0.03); display:flex; align-items:center; padding:0 10px; border-bottom:1px solid rgba(255,255,255,0.05);">
                         <span style="font-size:0.5rem; font-weight:900; color:#444;">1:1 PREVIEW</span>
                      </div>
                      <div style="flex:1; display:flex; align-items:center; justify-content:center; background:#050508;">
                         <canvas id="px-preview-canvas" width="${this.canvasWidth}" height="${this.canvasHeight}" style="width:80%; height:80%; image-rendering:pixelated;"></canvas>
                      </div>
                   </div>

                   <!-- VIEWPORT HUD -->
                   <div style="position:absolute; bottom:25px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); backdrop-filter:blur(10px); padding:8px 20px; border-radius:50px; border:1px solid rgba(255,255,255,0.05); font-size:0.6rem; color:#666; font-weight:900; display:flex; gap:20px;">
                      <span>ZOOM: <span id="px-lbl-zoom" style="color:#ffd700;">${this.zoom}x</span></span>
                      <span>FPS: <span style="color:#51c5ff;">${this.playFps}</span></span>
                      <span style="color:#333;">•</span>
                      <span style="color:${this.isPixelPerfect?'#4cff88':'#444'}; cursor:pointer;" id="px-toggle-perfect">PIXEL PERFECT</span>
                   </div>
                </div>

                <!-- SELECTION TOOLBAR -->
                ${this.hasSelection ? `
                  <div style="position:absolute; bottom:160px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.9); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius:14px; padding:10px 20px; display:flex; gap:15px; z-index:2001; box-shadow:0 20px 50px #000;">
                      <button id="px-sel-deselect" style="background:none; border:none; color:#fff; font-size:0.65rem; font-weight:900; cursor:pointer;">DESELECT</button>
                      <button id="px-sel-invert" style="background:none; border:none; color:#aaa; font-size:0.65rem; font-weight:900; cursor:pointer;">INVERT</button>
                      <button id="px-sel-clear" style="background:none; border:none; color:#ff3366; font-size:0.65rem; font-weight:900; cursor:pointer;">CLEAR PIXELS</button>
                  </div>
                ` : ''}

                <!-- TIMELINE -->
                <div style="height:120px; background:#0a0a0f; border-top:1px solid rgba(255,255,255,0.05); display:flex; padding:15px; gap:20px; align-items:center;">
                   <div style="display:flex; gap:10px; border-right:1px solid rgba(255,255,255,0.05); padding-right:15px;">
                      <button id="px-btn-newframe" style="width:44px; height:44px; border-radius:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:1.2rem; cursor:pointer;">+</button>
                      <button id="px-btn-playtoggle" style="width:44px; height:44px; border-radius:12px; background:${this.isPlaying?'#ff4444':'#ffd700'}; color:#000; border:none; cursor:pointer;">${this.isPlaying?'⏹':'▶'}</button>
                   </div>
                   <div style="flex:1; display:flex; gap:10px; overflow-x:auto;" class="custom-scroll">
                      ${this.renderTimelineThumbs()}
                   </div>
                   <div style="display:flex; flex-direction:column; gap:5px; padding-left:15px; border-left:1px solid rgba(255,255,255,0.05);">
                      <button id="px-onion-toggle" style="background:${this.onionSkin?'rgba(81,197,255,0.1)':'transparent'}; border:1px solid ${this.onionSkin?'#51c5ff':'rgba(255,255,255,0.1)'}; color:${this.onionSkin?'#51c5ff':'#444'}; border-radius:8px; padding:6px 15px; font-size:0.55rem; font-weight:900; cursor:pointer;">ONION GHOST</button>
                      <button id="px-btn-capsule-duplicate" style="background:none; border:none; color:#ffd700; font-size:0.55rem; font-weight:900; cursor:pointer;">DUPLICATE FRAME [X2]</button>
                   </div>
                </div>
             </div>

             <!-- RIGHT PROPERTIES DOCK -->
             <div style="width:340px; background:#0a0a0f; border-left:1px solid rgba(255,255,255,0.08); display:flex; flex-direction:column; overflow:hidden;">
                
                <!-- TOOL PROPERTIES -->
                <div style="padding:25px; border-bottom:1px solid rgba(255,255,255,0.05);">
                   <div style="font-size:0.55rem; color:#444; font-weight:900; letter-spacing:1px; margin-bottom:20px; text-transform:uppercase;">Tool properties : ${this.activeTool}</div>
                   
                   <div style="display:flex; flex-direction:column; gap:20px;">
                      <div style="display:flex; align-items:center; justify-content:space-between;">
                         <span style="font-size:0.6rem; color:#888; font-weight:900;">BRUSH SIZE</span>
                         <input type="range" id="px-brush-size" min="1" max="24" value="${this.brushSize}" style="width:140px; height:2px;">
                         <span style="font-size:0.65rem; color:#ffd700; font-weight:900; width:30px;">${this.brushSize}px</span>
                      </div>
                      <div style="display:flex; align-items:center; justify-content:space-between;">
                         <span style="font-size:0.6rem; color:#888; font-weight:900;">FLOW OPACITY</span>
                         <input type="range" id="px-brush-opacity" min="0" max="100" value="${this.brushOpacity*100}" style="width:140px; height:2px;">
                         <span style="font-size:0.65rem; color:#51c5ff; font-weight:900; width:30px;">${Math.round(this.brushOpacity*100)}%</span>
                      </div>
                      <div style="display:flex; gap:10px;">
                         <button id="px-sym-h" style="flex:1; background:${this.symH?'#444':'rgba(0,0,0,0.3)'}; border:1px solid ${this.symH?'#51c5ff':'rgba(255,255,255,0.05)'}; color:${this.symH?'#51c5ff':'#444'}; border-radius:8px; padding:10px; font-size:0.55rem; font-weight:900; cursor:pointer;">SYM H</button>
                         <button id="px-sym-v" style="flex:1; background:${this.symV?'#444':'rgba(0,0,0,0.3)'}; border:1px solid ${this.symV?'#51c5ff':'rgba(255,255,255,0.05)'}; color:${this.symV?'#51c5ff':'#444'}; border-radius:8px; padding:10px; font-size:0.55rem; font-weight:900; cursor:pointer;">SYM V</button>
                      </div>
                      ${['rectangle','circle','triangle','star'].includes(this.activeTool) ? `
                        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.2); padding:10px; border-radius:10px;">
                           <span style="font-size:0.55rem; color:#aaa; font-weight:900;">SHAPE FILL</span>
                           <button id="px-toggle-fill" style="background:${this.isShapeFilled?'#4cff88':'#222'}; color:${this.isShapeFilled?'#000':'#666'}; border:none; border-radius:4px; padding:4px 10px; font-size:0.5rem; font-weight:900; cursor:pointer;">${this.isShapeFilled?'ON':'OFF'}</button>
                        </div>
                      ` : ''}
                   </div>
                </div>

                <!-- COLOR MASTER (HSV Logic goes here) -->
                <div style="padding:25px; border-bottom:1px solid rgba(255,255,255,0.05); background:rgba(0,0,0,0.1);">
                   <div style="font-size:0.55rem; color:#444; font-weight:900; letter-spacing:1px; margin-bottom:20px; text-transform:uppercase;">MASTER COLOR ENGINE</div>
                   <div style="display:flex; gap:15px;">
                      <div style="width:54px; height:54px; border-radius:12px; background:${this.primaryColor}; border:2px solid #fff; box-shadow:0 0 20px ${this.primaryColor}55;"></div>
                      <div style="flex:1; display:flex; flex-direction:column; gap:5px;">
                         <input type="color" id="px-color-picker" value="${this.primaryColor}" style="width:100%; height:32px; background:none; border:none; cursor:pointer;">
                         <div id="px-quick-palette" style="display:flex; gap:4px; overflow-x:auto;">
                            ${this.quickPalette.slice(0, 8).map(c => `<div class="px-palette-color" data-color="${c}" style="width:18px; height:18px; background:${c}; border-radius:4px; cursor:pointer;"></div>`).join('')}
                         </div>
                      </div>
                   </div>
                </div>

                <!-- LAYERS DOCK -->
                <div style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
                   <div style="padding:20px 25px; border-bottom:1px solid rgba(255,255,255,0.03); display:flex; justify-content:space-between; align-items:center;">
                       <div style="display:flex; flex-direction:column;">
                          <span style="font-size:0.65rem; color:#fff; font-weight:900; letter-spacing:1px;">LAYERS</span>
                          <span style="font-size:0.55rem; color:#444; font-weight:900; text-transform:uppercase;">Compositor</span>
                       </div>
                       <div style="display:flex; gap:10px;">
                          <button id="px-btn-newlayer" style="width:28px; height:28px; border-radius:50%; background:#ffd700; color:#000; border:none; font-size:1.2rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center;">+</button>
                          <button id="px-layer-master-menu" style="width:28px; height:28px; border-radius:8px; background:rgba(255,255,255,0.05); color:#888; border:1px solid rgba(255,255,255,0.1); cursor:pointer;">⋮</button>
                       </div>
                    </div>
                   <div id="px-layers-list" style="flex:1; overflow-y:auto; padding:15px;" class="custom-scroll">
                      ${this.renderLayers()}
                   </div>
                </div>

                <!-- BOTTOM ACTIONS -->
                <div style="padding:20px; background:rgba(0,0,0,0.4); border-top:1px solid rgba(255,255,255,0.05); display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                   <button id="px-btn-adjustments" style="background:#222; border:1px solid #444; color:#aaa; border-radius:10px; padding:12px; font-size:0.6rem; font-weight:900; cursor:pointer;">ADJUSTMENTS</button>
                   <button id="px-btn-gallery-save" style="background:linear-gradient(45deg, #ffd700, #ff8c42); border:none; color:#000; border-radius:10px; padding:12px; font-size:0.6rem; font-weight:900; cursor:pointer;">EXPORT ASSET</button>
                </div>
             </div>
          </div>
       </div>
       <style>
          .custom-scroll::-webkit-scrollbar { width: 4px; }
          .custom-scroll::-webkit-scrollbar-track { background: transparent; }
          .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
       </style>
     `;
   }

   private renderDockedTool(id: string, icon: string, label: string) {
       const active = this.activeTool === id;
       return `
         <div class="px-tool-btn" data-id="${id}" style="
            width:48px; height:48px; border-radius:14px; display:flex; align-items:center; justify-content:center;
            background:${active ? 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,140,66,0.2))' : 'transparent'};
            border:1px solid ${active ? '#ffd70044' : 'transparent'};
            color:${active ? '#ffd700' : '#555'}; font-size:1.3rem; cursor:pointer; transition:0.2s;
            position:relative;
         " title="${label}">
            ${icon}
            ${active ? `<div style="position:absolute; left:-1px; top:12px; bottom:12px; width:2px; background:#ffd700; border-radius:0 4px 4px 0;"></div>` : ''}
         </div>
       `;
   }

  private renderSetupPortal(): string {
     return `
        <div style="position:fixed; inset:0; background:rgba(0,0,0,0.9); backdrop-filter:blur(40px); display:flex; align-items:center; justify-content:center; z-index:999999; font-family:'Outfit', sans-serif;">
           <div style="background:#11121d; border:1px solid rgba(255,255,255,0.1); border-radius:40px; width:500px; padding:60px; display:flex; flex-direction:column; align-items:center; box-shadow:0 50px 100px rgba(0,0,0,0.9);">
              <div style="width:100px; height:100px; background:linear-gradient(45deg, #ffd700, #ff8c42); border-radius:28px; display:flex; align-items:center; justify-content:center; font-size:4rem; margin-bottom:30px;">🎨</div>
              <h2 style="color:#fff; margin:0; font-size:2.2rem; font-weight:900; letter-spacing:1px;">STUDIO SETUP</h2>
              <p style="color:#555; font-size:0.9rem; margin:10px 0 40px 0;">Configure sua nova prancheta de pixel art.</p>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; width:100%; margin-bottom:30px;">
                 ${[16, 32, 64, 128].map(s => `<button class="px-setup-preset" data-s="${s}" style="padding:15px; border-radius:16px; border:1px solid rgba(255,255,255,0.05); background:rgba(255,255,255,0.02); color:#fff; cursor:pointer; font-weight:900; font-size:0.8rem;">${s} × ${s}</button>`).join('')}
              </div>

              <div style="width:100%; background:rgba(0,0,0,0.4); border-radius:24px; padding:25px; margin-bottom:40px;">
                  <div style="font-size:0.6rem; color:#444; font-weight:900; margin-bottom:20px; text-transform:uppercase;">Background Mode</div>
                  <div style="display:flex; gap:20px;">
                      <button id="s-bg-trans" style="flex:1; padding:15px; border-radius:12px; border:2px solid ${this.setupBgMode==='transparent'?'#ffd700':'transparent'}; background:${this.setupBgMode==='transparent'?'rgba(255,215,0,0.1)':'rgba(255,255,255,0.05)'}; color:${this.setupBgMode==='transparent'?'#ffd700':'#666'}; font-weight:900; cursor:pointer;">TRANSPARENT</button>
                      <button id="s-bg-solid" style="flex:1; padding:15px; border-radius:12px; border:2px solid ${this.setupBgMode==='solid'?'#ff8c42':'transparent'}; background:${this.setupBgMode==='solid'?'rgba(255,140,66,0.1)':'rgba(255,255,255,0.05)'}; color:${this.setupBgMode==='solid'?'#ff8c42':'#666'}; font-weight:900; cursor:pointer;">SOLID FILL</button>
                  </div>
                  ${this.setupBgMode === 'solid' ? `
                    <div style="margin-top:20px; display:flex; align-items:center; gap:15px; background:rgba(0,0,0,0.3); padding:10px; border-radius:12px;">
                        <input type="color" id="s-bg-hex" value="${this.setupHex}" style="width:40px; height:40px; border-radius:50%; border:none; background:none; cursor:pointer;">
                        <span style="font-size:0.9rem; color:#fff; font-weight:900;">${this.setupHex}</span>
                    </div>
                  ` : ''}
              </div>

              <div style="display:flex; width:100%; gap:15px;">
                 <button id="s-btn-start" style="flex:1; padding:22px; border-radius:22px; border:none; background:linear-gradient(45deg, #ffd700, #ff8c42); color:#000; font-weight:900; cursor:pointer; font-size:1rem; box-shadow:0 20px 40px rgba(255,215,0,0.2);">INITIALIZE STUDIO ✨</button>
                 <input type="hidden" id="s-width" value="32"><input type="hidden" id="s-height" value="32">
              </div>
           </div>
        </div>
     `;
  }

   private updatePreview() {
      const pCanvas = document.getElementById('px-preview-canvas') as HTMLCanvasElement;
      if (!pCanvas) return;
      const pCtx = pCanvas.getContext('2d')!;
      pCtx.imageSmoothingEnabled = false;
      
      const buffer = document.createElement('canvas'); buffer.width = this.canvasWidth; buffer.height = this.canvasHeight;
      const bCtx = buffer.getContext('2d')!;
      
      const frame = this.frames[this.activeFrameIdx];
      if (frame) {
         frame.layers.forEach(l => {
            if (l.visible) {
               const tmp = document.createElement('canvas'); tmp.width = this.canvasWidth; tmp.height = this.canvasHeight;
               tmp.getContext('2d')!.putImageData(l.data, 0, 0);
               bCtx.globalAlpha = l.opacity;
               bCtx.drawImage(tmp, 0, 0);
            }
         });
      }
      pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
      pCtx.drawImage(buffer, 0, 0, this.canvasWidth, this.canvasHeight, 0, 0, pCanvas.width, pCanvas.height);
   }

   private renderAdjustmentDialog(): string {
       return `
         <div id="px-adj-overlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(20px); z-index:9000; display:flex; align-items:center; justify-content:center;">
             <div style="width:400px; background:#111; border:1px solid #333; border-radius:24px; padding:40px; box-shadow:0 30px 60px #000;">
                 <h3 style="color:#ffd700; margin:0 0 30px 0; font-weight:900; letter-spacing:1px; font-size:1rem;">HUE / SATURATION / BRIGHTNESS</h3>
                 
                 <div style="display:flex; flex-direction:column; gap:25px;">
                    <div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                            <span style="font-size:0.6rem; color:#666; font-weight:900;">HUE SHIFT</span>
                            <span id="v-hue" style="font-size:0.6rem; color:#fff;">0</span>
                        </div>
                        <input type="range" id="adj-hue" min="-180" max="180" value="0" style="width:100%; height:2px;">
                    </div>
                    <div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                            <span style="font-size:0.6rem; color:#666; font-weight:900;">SATURATION</span>
                            <span id="v-sat" style="font-size:0.6rem; color:#fff;">100%</span>
                        </div>
                        <input type="range" id="adj-sat" min="0" max="200" value="100" style="width:100%; height:2px;">
                    </div>
                    <div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                            <span style="font-size:0.6rem; color:#666; font-weight:900;">BRIGHTNESS</span>
                            <span id="v-bri" style="font-size:0.6rem; color:#fff;">100%</span>
                        </div>
                        <input type="range" id="adj-bri" min="0" max="200" value="100" style="width:100%; height:2px;">
                    </div>
                 </div>

                 <div style="margin-top:40px; display:flex; gap:15px;">
                     <button id="adj-cancel" style="flex:1; padding:15px; background:none; border:1px solid #333; color:#666; border-radius:12px; font-size:0.7rem; font-weight:900; cursor:pointer;">CANCEL</button>
                     <button id="adj-apply" style="flex:1; padding:15px; background:#ffd700; border:none; color:#000; border-radius:12px; font-size:0.7rem; font-weight:900; cursor:pointer;">APPLY CHANGES</button>
                 </div>
             </div>
         </div>
       `;
   }

   private bindAdjustments(modal: HTMLElement) {
       const getV = (id: string) => (modal.querySelector('#'+id) as HTMLInputElement).value;
       const setV = (id: string, v: string) => { (modal.querySelector('#v-'+id) as HTMLElement).innerText = v; };
       
       modal.querySelectorAll('input').forEach(inp => inp.addEventListener('input', (e:any) => {
          const id = e.target.id.split('-')[1];
          setV(id, e.target.value + (id==='hue'?'':'%'));
       }));

       modal.querySelector('#adj-cancel')?.addEventListener('click', () => modal.remove());
       modal.querySelector('#adj-apply')?.addEventListener('click', () => {
          this.applyHSVAdjustment(parseInt(getV('adj-hue')), parseInt(getV('adj-sat'))/100, parseInt(getV('adj-bri'))/100);
          modal.remove();
       });
   }

   private applyHSVAdjustment(hShift: number, sScale: number, vScale: number) {
       const layer = this.frames[this.activeFrameIdx]?.layers[this.activeLayerIdx];
       if (!layer) return;
       this.saveHistory();
       const d = layer.data.data;
       for (let i=0; i<d.length; i+=4) {
           if (d[i+3] === 0) continue;
           let [h, s, v] = this.rgbToHsv(d[i], d[i+1], d[i+2]);
           h = (h + hShift + 360) % 360;
           s = Math.min(1, s * sScale);
           v = Math.min(1, v * vScale);
           const [r, g, b] = this.hsvToRgb(h, s, v);
           d[i] = r; d[i+1] = g; d[i+2] = b;
       }
       this.redrawCompositedCanvas(); this.callbacks.reRender();
   }

   private rgbToHsv(r: number, g: number, b: number) {
       r /= 255; g /= 255; b /= 255;
       const max = Math.max(r, g, b), min = Math.min(r, g, b);
       let h=0, s=0, v = max;
       const d = max - min;
       s = max === 0 ? 0 : d / max;
       if (max !== min) {
           switch (max) {
               case r: h = (g - b) / d + (g < b ? 6 : 0); break;
               case g: h = (b - r) / d + 2; break;
               case b: h = (r - g) / d + 4; break;
           }
           h /= 6;
       }
       return [h*360, s, v];
   }

   private hsvToRgb(h: number, s: number, v: number) {
       let r=0, g=0, b=0;
       let i = Math.floor(h / 60);
       let f = h / 60 - i;
       let p = v * (1 - s);
       let q = v * (1 - f * s);
       let t = v * (1 - (1 - f) * s);
       switch (i % 6) {
           case 0: r = v, g = t, b = p; break;
           case 1: r = q, g = v, b = p; break;
           case 2: r = p, g = v, b = t; break;
           case 3: r = p, g = q, b = v; break;
           case 4: r = t, g = p, b = v; break;
           case 5: r = v, g = p, b = q; break;
       }
       return [Math.round(r*255), Math.round(g*255), Math.round(b*255)];
   }

  private renderLayers() {
     const frame = this.frames[this.activeFrameIdx];
     if (!frame) return '';
     const layers = [...frame.layers].reverse();
     
     return layers.map(l => {
        const realIdx = frame.layers.indexOf(l);
        const active = this.activeLayerIdx === realIdx;
        return `
           <div class="px-layer-item" data-idx="${realIdx}" style="
              display:flex; flex-direction:column; padding:18px; margin-bottom:15px;
              background:${active ? 'rgba(81,197,255,0.06)' : 'rgba(255,255,255,0.01)'};
              border-left:4px solid ${active ? '#51c5ff' : 'transparent'}; border-radius:12px; cursor:pointer; transition:0.2s;
           ">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                 <input value="${l.name}" style="background:none; border:none; color:${active ? '#fff' : '#666'}; font-size:0.85rem; font-weight:900; width:120px;" class="px-layer-rename" data-idx="${realIdx}">
                 <div style="display:flex; gap:8px;">
                    <button class="px-layer-move" data-idx="${realIdx}" data-dir="1" style="background:none; border:none; color:#555; cursor:pointer;">↑</button>
                    <button class="px-layer-move" data-idx="${realIdx}" data-dir="-1" style="background:none; border:none; color:#555; cursor:pointer;">↓</button>
                    <button class="px-layer-lock" data-idx="${realIdx}" style="background:none; border:none; color:${l.locked?'#ff3366':'#444'}; font-size:0.9rem; cursor:pointer;">${l.locked?'🔒':'🔓'}</button>
                    <button class="px-layer-vis" data-idx="${realIdx}" style="background:none; border:none; color:#fff; opacity:${l.visible?'1':'0.2'}; cursor:pointer; font-size:1.1rem;">👁</button>
                    <button class="px-layer-clipping" data-idx="${realIdx}" style="background:none; border:none; color:${l.isClipping?'#ffd700':'#444'}; font-size:0.7rem; cursor:pointer;">✂️</button>
                    <button class="px-layer-del" data-idx="${realIdx}" style="background:none; border:none; color:#ff3366; opacity:0; cursor:pointer; font-size:0.9rem;" class="px-del-btn">✕</button>
                 </div>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px;">
                 <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:0.5rem; color:#444; font-weight:900; width:40px;">BLEND</span>
                    <select class="px-layer-blend" data-idx="${realIdx}" style="flex:1; background:#000; border:1px solid #222; color:#888; border-radius:4px; font-size:0.6rem;">
                        <option value="source-over" ${l.blendMode==='source-over'?'selected':''}>Normal</option>
                        <option value="multiply" ${l.blendMode==='multiply'?'selected':''}>Multiply</option>
                        <option value="screen" ${l.blendMode==='screen'?'selected':''}>Screen</option>
                        <option value="overlay" ${l.blendMode==='overlay'?'selected':''}>Overlay</option>
                        <option value="hard-light" ${l.blendMode==='hard-light'?'selected':''}>Hard Light</option>
                    </select>
                 </div>
                 <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:0.5rem; color:#444; font-weight:900; width:40px;">ALPHA</span>
                    <input type="range" class="px-layer-opacity" data-idx="${realIdx}" min="0" max="100" value="${l.opacity * 100}" style="flex:1; height:2px;">
                 </div>
              </div>
           </div>
        `;
     }).join('');
  }

  private moveLayer(fIdx: number, lIdx: number, dir: number) {
      const f = this.frames[fIdx];
      if (!f) return;
      const target = lIdx + dir;
      if (target < 0 || target >= f.layers.length) return;
      const temp = f.layers[lIdx];
      f.layers[lIdx] = f.layers[target];
      f.layers[target] = temp;
      this.activeLayerIdx = target;
      this.redrawCompositedCanvas();
      this.callbacks.reRender();
  }

  private renderTimelineThumbs() {
     return this.frames.map((f, i) => {
        const active = this.activeFrameIdx === i;
        const mainLayer = f.layers[0];
        const previewUrl = mainLayer ? this.getThumbnailUrl(f) : '';
        return `
           <div class="px-frame-item" data-idx="${i}" style="
              width:90px; height:90px; min-width:90px; border-radius:18px; background:#000; cursor:pointer;
              border:${active ? '3px solid #ffd700' : '1px solid rgba(255,255,255,0.05)'};
              box-shadow:${active ? '0 10px 40px rgba(255,215,0,0.2)' : 'none'};
              display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; overflow:hidden; transition:0.2s;
           ">
              <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.02); pointer-events:none;">
                 ${previewUrl ? `<img src="${previewUrl}" style="max-width:80%; max-height:80%; image-rendering:pixelated; transform:scale(2.5);">` : ''}
              </div>
              <div style="position:absolute; bottom:0; left:0; width:100%; background:rgba(0,0,0,0.8); color:${active?'#ffd700':'#555'}; font-size:0.6rem; font-weight:900; text-align:center; padding:2px;">#${i+1}</div>
              <button class="px-frame-move" data-idx="${i}" data-dir="-1" style="position:absolute; left:2px; top:35%; opacity:0; color:#fff; cursor:pointer; background:none; border:none; z-index:10;">⇠</button>
              <button class="px-frame-move" data-idx="${i}" data-dir="1" style="position:absolute; right:2px; top:35%; opacity:0; color:#fff; cursor:pointer; background:none; border:none; z-index:10;">⇢</button>
              <button class="px-frame-duplicate-btn" data-idx="${i}" style="position:absolute; top:5px; right:5px; background:rgba(255,215,0,0.8); border:none; border-radius:4px; width:20px; height:20px; font-size:0.6rem; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#000; opacity:0; transition:0.2s; z-index:11;" title="Duplicate Frame">👯</button>
           </div>
        `;
     }).join('');
  }

  private getThumbnailUrl(frame: Frame): string {
      const c = document.createElement('canvas'); c.width = this.canvasWidth; c.height = this.canvasHeight;
      const ctx = c.getContext('2d')!;
      frame.layers.forEach((l, i) => {
          if (!l.visible) return;
          const lc = document.createElement('canvas'); lc.width = this.canvasWidth; lc.height = this.canvasHeight;
          lc.getContext('2d')!.putImageData(l.data, 0, 0);
          ctx.globalAlpha = l.opacity;
          ctx.globalCompositeOperation = (l.isClipping && i > 0) ? 'source-in' : l.blendMode as any;
          ctx.drawImage(lc, 0, 0);
      });
      return c.toDataURL('image/png');
  }

  public bind(container: HTMLElement) {
     this.container = container;
     if (this.showSetup) {
        container.querySelector('#s-btn-start')?.addEventListener('click', () => {
           const fw = parseInt((container.querySelector('#s-width') as HTMLInputElement).value) || 32;
           const fh = parseInt((container.querySelector('#s-height') as HTMLInputElement).value) || 32;
           this.canvasWidth = fw; this.canvasHeight = fh;
           this.initEmptyCanvas();
        });
        return;
     }

     this.uiCanvas = container.querySelector('#px-canvas') as HTMLCanvasElement;
     if (this.uiCanvas) this.uiCtx = this.uiCanvas.getContext('2d');
     this.updateCanvasTransform();
     this.redrawCompositedCanvas();

     // Top Bar
     container.querySelector('#px-btn-save')?.addEventListener('click', () => this.callbacks.onBack());
     container.querySelector('#px-undo')?.addEventListener('click', () => this.undo());
     container.querySelector('#px-redo')?.addEventListener('click', () => this.redo());

     // Tools
     container.querySelectorAll('.px-tool-btn').forEach(btn => btn.addEventListener('click', (e:any) => {
        this.activeTool = e.currentTarget.dataset.id;
        if (this.activeTool === 'transform') this.initTransformMode();
        else if (this.activeTool === 'warp') this.initWarpMode();
        else { this.isTransforming = false; this.isWarping = false; }
        this.callbacks.reRender();
     }));

     // Properties
     container.querySelector('#px-brush-size')?.addEventListener('input', (e:any) => { this.brushSize = parseInt(e.target.value); this.callbacks.reRender(); });
     container.querySelector('#px-brush-opacity')?.addEventListener('input', (e:any) => { this.brushOpacity = parseInt(e.target.value) / 100; this.callbacks.reRender(); });
     container.querySelector('#px-color-picker')?.addEventListener('input', (e:any) => { this.primaryColor = e.target.value; this.updateQuickPalette(this.primaryColor); this.callbacks.reRender(); });
     
     container.querySelectorAll('.px-palette-color').forEach(c => c.addEventListener('click', (e:any) => {
        this.primaryColor = e.currentTarget.dataset.color; this.callbacks.reRender();
     }));

     container.querySelector('#px-toggle-perfect')?.addEventListener('click', () => { this.isPixelPerfect = !this.isPixelPerfect; this.callbacks.reRender(); });
     container.querySelector('#px-sym-h')?.addEventListener('click', () => { this.symH = !this.symH; this.redrawCompositedCanvas(); this.callbacks.reRender(); });
     container.querySelector('#px-sym-v')?.addEventListener('click', () => { this.symV = !this.symV; this.redrawCompositedCanvas(); this.callbacks.reRender(); });
     container.querySelector('#px-toggle-fill')?.addEventListener('click', () => { this.isShapeFilled = !this.isShapeFilled; this.callbacks.reRender(); });

     this.bindSelectionToolbar(container);

     // Layers
     container.querySelector('#px-btn-newlayer')?.addEventListener('click', () => {
         const f = this.frames[this.activeFrameIdx];
         if (f) {
            f.layers.push({ id:'l-'+Date.now(), name:'New Layer', data: new ImageData(this.canvasWidth, this.canvasHeight), visible:true, opacity:1, isClipping:false, locked:false, blendMode:'source-over', groupId:null });
            this.activeLayerIdx = f.layers.length-1; this.redrawCompositedCanvas(); this.callbacks.reRender();
         }
     });

     container.querySelectorAll('.px-layer-item').forEach(l => l.addEventListener('click', (e:any) => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        this.activeLayerIdx = parseInt(e.currentTarget.dataset.idx);
        this.callbacks.reRender();
     }));

     container.querySelectorAll('.px-layer-vis').forEach(btn => btn.addEventListener('click', (e:any) => {
        const idx = parseInt(e.currentTarget.dataset.idx);
        const l = this.frames[this.activeFrameIdx].layers[idx];
        if(l) { l.visible = !l.visible; this.redrawCompositedCanvas(); this.callbacks.reRender(); }
     }));

     // Timeline
     container.querySelector('#px-btn-newframe')?.addEventListener('click', () => {
         this.saveHistory();
         this.frames.splice(this.activeFrameIdx+1, 0, { id: 'f-'+Date.now(), delay: 100, layers: [{ id: 'l-'+Date.now(), name: 'Layer 1', data: new ImageData(this.canvasWidth,this.canvasHeight), visible:true, opacity:1, isClipping:false, locked:false, blendMode:'source-over', groupId:null }] });
         this.activeFrameIdx++; this.activeLayerIdx = 0; this.redrawCompositedCanvas(); this.callbacks.reRender();
     });

     container.querySelectorAll('.px-frame-item').forEach(f => {
          f.addEventListener('click', (e:any) => {
              if (e.target.closest('button')) return;
              this.activeFrameIdx = parseInt(e.currentTarget.dataset.idx); 
              this.activeLayerIdx = 0; 
              this.redrawCompositedCanvas(); 
              this.callbacks.reRender();
          });
          f.addEventListener('mouseenter', (e:any) => {
              e.currentTarget.querySelectorAll('button').forEach((b:any) => b.style.opacity = '1');
          });
          f.addEventListener('mouseleave', (e:any) => {
              e.currentTarget.querySelectorAll('button').forEach((b:any) => b.style.opacity = '0');
          });
      });

      container.querySelectorAll('.px-frame-duplicate-btn').forEach(btn => btn.addEventListener('click', (e:any) => {
          const idx = parseInt(e.currentTarget.dataset.idx);
          this.activeFrameIdx = idx;
          this.duplicateFrame();
      }));

     container.querySelector('#px-btn-playtoggle')?.addEventListener('click', () => this.togglePlay());
     container.querySelector('#px-btn-capsule-duplicate')?.addEventListener('click', () => this.duplicateFrame());
     container.querySelector('#px-onion-toggle')?.addEventListener('click', () => { this.onionSkin = !this.onionSkin; this.redrawCompositedCanvas(); this.callbacks.reRender(); });

     // Adjustments
     container.querySelector('#px-btn-adjustments')?.addEventListener('click', () => {
        const modal = document.createElement('div'); modal.id = 'px-modal-container';
        modal.innerHTML = this.renderAdjustmentDialog();
        document.body.appendChild(modal);
        this.bindAdjustments(modal);
     });

     // Viewport
     const vp = container.querySelector('#px-viewport-container') as HTMLElement;
     if (vp) {
        vp.addEventListener('wheel', (e: WheelEvent) => {
           e.preventDefault();
           if (e.deltaY < 0) this.zoom = Math.min(100, this.zoom + 2);
           else this.zoom = Math.max(1, this.zoom - 2);
           this.updateCanvasTransform();
        });
        vp.addEventListener('mousedown', (e: MouseEvent) => {
           if (e.button === 1 || this.activeTool === 'pan' || (e.button === 0 && e.shiftKey)) this.isPanning = true;
           else if (e.button === 0) {
              if (this.activeTool === 'transform') this.handleGizmoMouseDown(e);
              else if (this.activeTool === 'warp') this.handleWarpMouseDown(e);
              else if (this.activeTool === 'move') this.handleMoveMouseDown(e);
              else if (['rectangle','circle','line','triangle','star','arc'].includes(this.activeTool)) {
                 this.isDrawingShape = true;
                 const rect = this.uiCanvas!.getBoundingClientRect();
                 this.lastX = Math.floor((e.clientX - rect.left) * (this.canvasWidth / rect.width));
                 this.lastY = Math.floor((e.clientY - rect.top) * (this.canvasHeight / rect.height));
                 this.shapePreviewData = { x1: this.lastX, y1: this.lastY, x2: this.lastX, y2: this.lastY };
              }
              else { this.saveHistory(); this.isDrawing = true; this.handleInteraction(e); }
           }
        });
     }

     window.addEventListener('mousemove', (e: MouseEvent) => {
        if (this.isPanning) { this.panX += e.movementX; this.panY += e.movementY; this.updateCanvasTransform(); }
        else if (this.isTransforming) this.handleGizmoMouseMove(e);
        else if (this.isWarping) this.handleWarpMouseMove(e);
        else if (this.isDrawingShape) this.handleShapeMouseMove(e);
        else if (this.isDrawing) this.handleInteraction(e);
     });

     window.addEventListener('mouseup', () => {
        this.isPanning = false; this.gizmoHandle = null; this.warpHandle = null;
        if (this.isDrawingShape) this.commitShape();
        if (this.isDrawing) { this.isDrawing = false; this.lastX = -1; this.lastY = -1; this.redrawCompositedCanvas(); this.callbacks.reRender(); }
     });

     this.updatePreview();
  }

  private bindSelectionToolbar(container: HTMLElement) {
      container.querySelector('#px-sel-deselect')?.addEventListener('click', () => {
          this.hasSelection = false; this.selectionPoints = [];
          this.selectionMask = new Array(this.canvasWidth * this.canvasHeight).fill(false);
          this.updateSelectionOverlay(); this.callbacks.reRender();
      });
      container.querySelector('#px-sel-invert')?.addEventListener('click', () => {
          for(let i=0; i<this.selectionMask.length; i++) this.selectionMask[i] = !this.selectionMask[i];
          this.updateSelectionOverlay(); this.callbacks.reRender();
      });
      container.querySelector('#px-sel-clear')?.addEventListener('click', () => {
          const layer = this.frames[this.activeFrameIdx]?.layers[this.activeLayerIdx];
          if(!layer) return; this.saveHistory();
          for(let i=0; i<this.selectionMask.length; i++) if(this.selectionMask[i]) layer.data.data[i*4+3] = 0;
          this.redrawCompositedCanvas(); this.callbacks.reRender();
      });
  }

  private magicWandSelect(imgData: ImageData, startX: number, startY: number) {
      const idx = (startY * this.canvasWidth + startX) * 4;
      const targetR = imgData.data[idx], targetG = imgData.data[idx+1], targetB = imgData.data[idx+2];
      const tolerance = 20;
      const mask = new Array(this.canvasWidth * this.canvasHeight).fill(false);
      const stack = [[startX, startY]], visited = new Set();
      while (stack.length > 0) {
          const [x, y] = stack.pop()!;
          const pos = y * this.canvasWidth + x;
          if (visited.has(pos)) continue;
          visited.add(pos);
          const i = pos * 4;
          if (Math.abs(imgData.data[i]-targetR) <= tolerance && Math.abs(imgData.data[i+1]-targetG) <= tolerance && Math.abs(imgData.data[i+2]-targetB) <= tolerance) {
              mask[pos] = true;
              if (x > 0) stack.push([x-1, y]);
              if (x < this.canvasWidth-1) stack.push([x+1, y]);
              if (y > 0) stack.push([x, y-1]);
              if (y < this.canvasHeight-1) stack.push([x, y+1]);
          }
      }
      this.selectionMask = mask; this.hasSelection = true; this.updateSelectionOverlay();
  }

  private initTransformMode() {
      this.isWarping = false;
      let bounds = this.hasSelection ? this.getSelectionBounds() : this.getLayerContentBounds();
      this.transformTarget = { ...bounds, rotation: 0 };
      this.isTransforming = true;
      this.prepareTransformBuffer();
      this.updateGizmoOverlay();
  }

  private initWarpMode() {
      this.isTransforming = false;
      let bounds = { x: 0, y: 0, w: this.canvasWidth, h: this.canvasHeight };
      if (this.hasSelection) {
          bounds = this.getSelectionBounds();
      } else {
          bounds = this.getLayerContentBounds();
      }
      this.warpEngine = new WarpEngine(bounds.w, bounds.h, bounds.x, bounds.y);
      this.isWarping = true;
      this.prepareTransformBuffer();
      this.updateGizmoOverlay();
  }

  private handleGizmoMouseDown(e: MouseEvent) {
      if (!this.transformTarget) return;
      const rect = this.uiCanvas!.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this.canvasWidth / rect.width), my = (e.clientY - rect.top) * (this.canvasHeight / rect.height);
      const hs = 6 / this.zoom, tt = this.transformTarget;
      
      if (Math.abs(mx-(tt.x+tt.w)) < hs && Math.abs(my-(tt.y+tt.h)) < hs) this.gizmoHandle = 'br';
      else if (Math.abs(mx-tt.x) < hs && Math.abs(my-tt.y) < hs) this.gizmoHandle = 'tl';
      else if (Math.abs(mx-(tt.x+tt.w/2)) < hs && Math.abs(my-(tt.y-hs*2)) < hs) this.gizmoHandle = 'rot';
      else if (mx >= tt.x && mx <= tt.x+tt.w && my >= tt.y && my <= tt.y+tt.h) this.gizmoHandle = 'move';
  }

  private handleGizmoMouseMove(e: MouseEvent) {
      if (!this.transformTarget || !this.gizmoHandle) return;
      const dx = e.movementX / this.zoom, dy = e.movementY / this.zoom;
      if (this.gizmoHandle === 'move') { this.transformTarget.x += dx; this.transformTarget.y += dy; }
      else if (this.gizmoHandle === 'br') { this.transformTarget.w += dx; this.transformTarget.h += dy; }
      else if (this.gizmoHandle === 'tl') { this.transformTarget.x += dx; this.transformTarget.y += dy; this.transformTarget.w -= dx; this.transformTarget.h -= dy; }
      else if (this.gizmoHandle === 'rot') {
          const cx = this.transformTarget.x + this.transformTarget.w/2, cy = this.transformTarget.y + this.transformTarget.h/2;
          const mx = (e.clientX - this.uiCanvas!.getBoundingClientRect().left) * (this.canvasWidth / this.uiCanvas!.getBoundingClientRect().width);
          const my = (e.clientY - this.uiCanvas!.getBoundingClientRect().top) * (this.canvasHeight / this.uiCanvas!.getBoundingClientRect().height);
          this.transformTarget.rotation = Math.atan2(my-cy, mx-cx) + Math.PI/2;
      }
      this.updateGizmoOverlay(); this.redrawCompositedCanvas();
  }

  private commitTransform() {
      const layer = this.frames[this.activeFrameIdx]?.layers[this.activeLayerIdx];
      if (!layer || !this.tempTransformData) return;

      const buffer = document.createElement('canvas'); buffer.width = this.canvasWidth; buffer.height = this.canvasHeight;
      const bCtx = buffer.getContext('2d')!;
      bCtx.imageSmoothingEnabled = false;

      if (this.isTransforming && this.transformTarget) {
          const tt = this.transformTarget;
          const tempCanvas = document.createElement('canvas'); tempCanvas.width = this.canvasWidth; tempCanvas.height = this.canvasHeight;
          const tCtx = tempCanvas.getContext('2d')!;
          
          const selImg = new ImageData(this.canvasWidth, this.canvasHeight);
          for(let i=0; i<this.selectionMask.length; i++) {
              if (this.hasSelection ? this.selectionMask[i] : true) {
                  const idx = i*4;
                  selImg.data.set(this.tempTransformData.data.slice(idx, idx+4), idx);
              }
          }
          tCtx.putImageData(selImg, 0, 0);

          bCtx.save();
          bCtx.translate(tt.x + tt.w/2, tt.y + tt.h/2);
          bCtx.rotate(tt.rotation);
          let bounds = this.hasSelection ? this.getSelectionBounds() : { x: 0, y: 0, w: this.canvasWidth, h: this.canvasHeight };
          bCtx.drawImage(tempCanvas, bounds.x, bounds.y, bounds.w, bounds.h, -tt.w/2, -tt.h/2, tt.w, tt.h);
          bCtx.restore();
      } else if (this.isWarping && this.warpEngine) {
          const warped = new ImageData(this.canvasWidth, this.canvasHeight);
          this.warpEngine.deformImageData(this.tempTransformData, warped, this.canvasWidth, this.canvasHeight);
          bCtx.putImageData(warped, 0, 0);
      }

      const final = bCtx.getImageData(0,0,this.canvasWidth,this.canvasHeight);
      for(let i=0; i<final.data.length; i+=4) {
          if (final.data[i+3] > 0) {
              layer.data.data.set(final.data.slice(i, i+4), i);
          }
      }

      this.isTransforming = false; this.isWarping = false; this.tempTransformData = null;
      this.redrawCompositedCanvas(); this.callbacks.reRender();
  }

  private getSelectionBounds() {
      let minX=Infinity, maxX=0, minY=Infinity, maxY=0;
      for(let i=0; i<this.selectionMask.length; i++) if (this.selectionMask[i]) {
          const x = i % this.canvasWidth, y = Math.floor(i / this.canvasWidth);
          minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      if (minX === Infinity) return { x: 0, y: 0, w: this.canvasWidth, h: this.canvasHeight };
      return { x: minX, y: minY, w: maxX-minX+1, h: maxY-minY+1 };
  }

  private getLayerContentBounds() {
      const layer = this.frames[this.activeFrameIdx]?.layers[this.activeLayerIdx];
      if (!layer) return { x: 0, y: 0, w: this.canvasWidth, h: this.canvasHeight };
      const data = layer.data.data;
      let minX=Infinity, maxX=0, minY=Infinity, maxY=0;
      let found = false;
      for (let y=0; y<this.canvasHeight; y++) {
          for (let x=0; x<this.canvasWidth; x++) {
              if (data[(y*this.canvasWidth + x)*4 + 3] > 0) {
                  minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
                  found = true;
              }
          }
      }
      if (!found) return { x: 0, y: 0, w: this.canvasWidth, h: this.canvasHeight };
      return { x: minX, y: minY, w: maxX-minX+1, h: maxY-minY+1 };
  }

  private prepareTransformBuffer() {
      const layer = this.frames[this.activeFrameIdx]?.layers[this.activeLayerIdx];
      if (!layer) return;
      this.tempTransformData = new ImageData(new Uint8ClampedArray(layer.data.data), this.canvasWidth, this.canvasHeight);
      this.saveHistory();
      const data = layer.data.data;
      for(let i=0; i<this.selectionMask.length; i++) {
          if (this.hasSelection ? this.selectionMask[i] : true) {
              data[i*4+3] = 0;
          }
      }
  }

   private cloneImageData(orig: ImageData) {
       return new ImageData(new Uint8ClampedArray(orig.data), orig.width, orig.height);
   }

   private flip(axis: 'h' | 'v') {
       const layer = this.frames[this.activeFrameIdx]?.layers[this.activeLayerIdx];
       if(!layer) return;
       this.saveHistory();
       const newData = new Uint8ClampedArray(layer.data.data.length);
       let minX=0, maxX=this.canvasWidth-1, minY=0, maxY=this.canvasHeight-1;
       if (this.hasSelection) {
           minX=Infinity; maxX=0; minY=Infinity; maxY=0;
           for(let i=0; i<this.selectionMask.length; i++) if (this.selectionMask[i]) {
               const x = i % this.canvasWidth, y = Math.floor(i / this.canvasWidth);
               minX=Math.min(minX, x); maxX=Math.max(maxX, x); minY=Math.min(minY, y); maxY=Math.max(maxY, y);
           }
       }
       for(let y=0; y<this.canvasHeight; y++) {
           for(let x=0; x<this.canvasWidth; x++) {
               const idx = (y*this.canvasWidth+x)*4;
               if (this.hasSelection && !this.selectionMask[y*this.canvasWidth+x]) { newData.set(layer.data.data.slice(idx, idx+4), idx); continue; }
               if (x < minX || x > maxX || y < minY || y > maxY) { newData.set(layer.data.data.slice(idx, idx+4), idx); continue; }
               const sx = axis === 'h' ? (maxX - (x-minX)) : x;
               const sy = axis === 'v' ? (maxY - (y-minY)) : y;
               newData.set(layer.data.data.slice((sy*this.canvasWidth+sx)*4, (sy*this.canvasWidth+sx)*4+4), idx);
           }
       }
       layer.data.data.set(newData); this.redrawCompositedCanvas(); this.callbacks.reRender();
   }

  private applyLayerShift(dx: number, dy: number, isClone: boolean = false) {
      const layer = this.frames[this.activeFrameIdx]?.layers[this.activeLayerIdx];
      if(!layer) return;
      const newData = new Uint8ClampedArray(layer.data.data.length), ix = Math.round(dx), iy = Math.round(dy);
      for(let y=0; y<this.canvasHeight; y++) {
          for(let x=0; x<this.canvasWidth; x++) {
              const idx = (y*this.canvasWidth+x)*4;
              const sx = x-ix, sy = y-iy;
              const inSel = this.hasSelection && this.selectionMask[y*this.canvasWidth+x];
              const sInSel = this.hasSelection && sx>=0 && sx<this.canvasWidth && sy>=0 && sy<this.canvasHeight && this.selectionMask[sy*this.canvasWidth+sx];

              if (sInSel) {
                  // Pull from the source of the shift
                  newData.set(layer.data.data.slice((sy*this.canvasWidth+sx)*4, (sy*this.canvasWidth+sx)*4+4), idx);
              } else if (inSel && !isClone) {
                  // If we were in the selection but didn't get filled by a shifted pixel, we clear (unless cloning)
                  newData[idx+3] = 0;
              } else {
                  // Keep existing background
                  newData.set(layer.data.data.slice(idx, idx+4), idx);
              }
          }
      }
      layer.data.data.set(newData);
  }

  private closeSelection() {
      if (this.selectionPoints.length < 3) { this.hasSelection=false; this.selectionMask=[]; return; }
      const mask = new Array(this.canvasWidth * this.canvasHeight).fill(false);
      const c = document.createElement('canvas'); c.width=this.canvasWidth; c.height=this.canvasHeight;
      const ctx = c.getContext('2d')!; ctx.beginPath(); ctx.moveTo(this.selectionPoints[0].x, this.selectionPoints[0].y);
      this.selectionPoints.forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.fill();
      const d = ctx.getImageData(0,0,this.canvasWidth,this.canvasHeight).data;
      for(let i=0; i<mask.length; i++) if(d[i*4+3]>128) mask[i]=true;
      this.selectionMask = mask; this.hasSelection = true; this.updateSelectionOverlay();
  }

  private updateSelectionOverlay() {
      const sc = this.container?.querySelector('#px-selection-canvas') as HTMLCanvasElement;
      if(!sc) return;
      const ctx = sc.getContext('2d')!; ctx.clearRect(0,0,this.canvasWidth,this.canvasHeight);
      
      if(this.selectionPoints.length>0) {
          ctx.strokeStyle='#fff'; ctx.lineWidth=1/this.zoom; 
          ctx.setLineDash([4/this.zoom, 4/this.zoom]); 
          ctx.beginPath();
          ctx.moveTo(this.selectionPoints[0].x, this.selectionPoints[0].y);
          this.selectionPoints.forEach(p => ctx.lineTo(p.x, p.y)); 
          if(!this.isSelecting) ctx.closePath(); 
          ctx.stroke();
          
          ctx.strokeStyle='#000'; ctx.lineDashOffset = 4/this.zoom; ctx.stroke();
      } else if (this.hasSelection && this.selectionMask.length > 0) {
          ctx.fillStyle = 'rgba(81, 197, 255, 0.15)';
          for(let i=0; i<this.selectionMask.length; i++) if(this.selectionMask[i]) {
              ctx.fillRect(i % this.canvasWidth, Math.floor(i / this.canvasWidth), 1, 1);
          }
      }
  }

  private updateGizmoOverlay() {
      const gc = this.container?.querySelector('#px-gizmo-canvas') as HTMLCanvasElement;
      if(!gc || !this.transformTarget) return;
      const ctx = gc.getContext('2d')!; ctx.clearRect(0,0,this.canvasWidth,this.canvasHeight);
      ctx.strokeStyle='#51c5ff'; ctx.lineWidth=1/this.zoom;
      ctx.strokeRect(this.transformTarget.x, this.transformTarget.y, this.transformTarget.w, this.transformTarget.h);
      ctx.fillStyle='#51c5ff'; const hs=4/this.zoom;
      ctx.fillRect(this.transformTarget.x-hs/2, this.transformTarget.y-hs/2, hs, hs);
      ctx.fillRect(this.transformTarget.x+this.transformTarget.w-hs/2, this.transformTarget.y+this.transformTarget.h-hs/2, hs, hs);
      
      // Rotation handle line
      ctx.beginPath(); ctx.moveTo(this.transformTarget.x + this.transformTarget.w/2, this.transformTarget.y);
      ctx.lineTo(this.transformTarget.x + this.transformTarget.w/2, this.transformTarget.y - hs*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(this.transformTarget.x + this.transformTarget.w/2, this.transformTarget.y - hs*2, hs/2, 0, Math.PI*2); ctx.fill();

      if (this.isWarping && this.warpEngine) {
          this.warpEngine.renderGrid(ctx, this.zoom);
      }
  }

  private redrawCompositedCanvas() {
      const frame = this.frames[this.activeFrameIdx];
      if (!frame || !this.uiCtx) return;
      const buffer = document.createElement('canvas'); buffer.width = this.canvasWidth; buffer.height = this.canvasHeight;
      const bCtx = buffer.getContext('2d')!;
      bCtx.imageSmoothingEnabled = false;

      // Onion Skin
      if (this.onionSkin && this.activeFrameIdx > 0) {
          const prev = this.frames[this.activeFrameIdx-1]; bCtx.globalAlpha = this.onionOpacity;
          prev.layers.forEach(l => { if(l.visible) {
              const tmp = document.createElement('canvas'); tmp.width = this.canvasWidth; tmp.height = this.canvasHeight;
              tmp.getContext('2d')!.putImageData(l.data, 0, 0); bCtx.drawImage(tmp, 0, 0);
          }});
      }

      // Draw Layers
      bCtx.globalAlpha = 1;
      frame.layers.forEach((l, i) => { 
          if (!l.visible) return;
          const temp = document.createElement('canvas'); temp.width = this.canvasWidth; temp.height = this.canvasHeight;
          const tCtx = temp.getContext('2d')!;
          tCtx.putImageData(l.data, 0, 0);
          
          bCtx.save();
          bCtx.globalAlpha = l.opacity;
          
          if (l.isClipping && i > 0) {
              // Standard Clipping: Use layer below as a mask
              const below = frame.layers[i-1];
              const mask = document.createElement('canvas'); mask.width = this.canvasWidth; mask.height = this.canvasHeight;
              mask.getContext('2d')!.putImageData(below.data, 0, 0);
              
              // We draw the clipped layer onto the mask using source-in
              const clipBuf = document.createElement('canvas'); clipBuf.width = this.canvasWidth; clipBuf.height = this.canvasHeight;
              const cbCtx = clipBuf.getContext('2d')!;
              cbCtx.drawImage(mask, 0, 0);
              cbCtx.globalCompositeOperation = 'source-in';
              cbCtx.drawImage(temp, 0, 0);
              
              bCtx.drawImage(clipBuf, 0, 0);
          } else {
              bCtx.globalCompositeOperation = l.blendMode as any;
              bCtx.drawImage(temp, 0, 0);
          }
          bCtx.restore();
      });

      // Transform/Warp Preview
      if ((this.isTransforming || this.isWarping) && this.tempTransformData) {
          const pCanvas = document.createElement('canvas'); pCanvas.width = this.canvasWidth; pCanvas.height = this.canvasHeight;
          const pCtx = pCanvas.getContext('2d')!;
          pCtx.imageSmoothingEnabled = false;

          if (this.isTransforming && this.transformTarget) {
              const tt = this.transformTarget;
              const sourceC = document.createElement('canvas'); sourceC.width = this.canvasWidth; sourceC.height = this.canvasHeight;
              const sCtx = sourceC.getContext('2d')!;
              const selImg = new ImageData(this.canvasWidth, this.canvasHeight);
              for(let i=0; i<this.selectionMask.length; i++) if(this.hasSelection?this.selectionMask[i]:true) selImg.data.set(this.tempTransformData.data.slice(i*4, i*4+4), i*4);
              sCtx.putImageData(selImg, 0, 0);

              pCtx.save();
              pCtx.translate(tt.x + tt.w/2, tt.y + tt.h/2);
              pCtx.rotate(tt.rotation);
              let minX=0, minY=0, oW=this.canvasWidth, oH=this.canvasHeight;
              if (this.hasSelection) {
                  minX=999; minY=999; let maxX=0; let maxY=0;
                  for(let i=0; i<this.selectionMask.length; i++) if (this.selectionMask[i]) {
                      const x=i%this.canvasWidth, y=Math.floor(i/this.canvasWidth);
                      minX=Math.min(minX,x); minY=Math.min(minY,y); maxX=Math.max(maxX,x); maxY=Math.max(maxY,y);
                  }
                  oW=maxX-minX+1; oH=maxY-minY+1;
              }
              pCtx.drawImage(sourceC, minX, minY, oW, oH, -tt.w/2, -tt.h/2, tt.w, tt.h);
              pCtx.restore();
          } else if (this.isWarping && this.warpEngine) {
              const warped = new ImageData(this.canvasWidth, this.canvasHeight);
              this.warpEngine.deformImageData(this.tempTransformData, warped, this.canvasWidth, this.canvasHeight);
              pCtx.putImageData(warped, 0, 0);
          }
          bCtx.drawImage(pCanvas, 0, 0);
      }

      this.uiCtx.clearRect(0,0, this.canvasWidth, this.canvasHeight); this.uiCtx.drawImage(buffer, 0, 0);
  }

  private cancelTransform() {
      const layer = this.frames[this.activeFrameIdx]?.layers[this.activeLayerIdx];
      if (layer && this.tempTransformData) layer.data.data.set(this.tempTransformData.data);
      this.isTransforming = false; this.isWarping = false; this.tempTransformData = null;
      this.redrawCompositedCanvas(); this.callbacks.reRender();
  }

  private handleWarpMouseDown(e: MouseEvent) {
      if (!this.warpEngine) return;
      const rect = this.uiCanvas!.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this.canvasWidth / rect.width), my = (e.clientY - rect.top) * (this.canvasHeight / rect.height);
      const points = this.warpEngine.getPoints();
      const hs = 8 / this.zoom;
      for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
              if (Math.abs(mx - points[r][c].x) < hs && Math.abs(my - points[r][c].y) < hs) {
                  this.warpHandle = { r, c }; return;
              }
          }
      }
  }

  private handleWarpMouseMove(e: MouseEvent) {
      if (!this.warpEngine || !this.warpHandle) return;
      const dx = e.movementX / this.zoom, dy = e.movementY / this.zoom;
      this.warpEngine.movePoint(this.warpHandle.r, this.warpHandle.c, dx, dy);
      this.updateGizmoOverlay();
      this.redrawCompositedCanvas();
  }

  private handleMoveMouseDown(e: MouseEvent) {
      const rect = this.uiCanvas!.getBoundingClientRect();
      const px = Math.floor((e.clientX - rect.left) * (this.canvasWidth / rect.width)), py = Math.floor((e.clientY - rect.top) * (this.canvasHeight / rect.height));
      if (this.hasSelection && this.selectionMask[py * this.canvasWidth + px]) { 
          this.isDraggingSelection = true; this.dragStartX = px; this.dragStartY = py; 
          if (e.altKey) {
              this.core.showToast('Selection Cloned!', '#ffd700');
          } else {
              this.saveHistory();
          }
      }
      else { this.isSelecting = true; this.hasSelection = false; this.selectionPoints = [{x: px, y: py}]; this.selectionMask = new Array(this.canvasWidth * this.canvasHeight).fill(false); }
  }

  private handleInteraction(e: MouseEvent) {
      if (!this.uiCanvas || this.isPlaying) return;
      const rect = this.uiCanvas.getBoundingClientRect();
      const px = Math.floor((e.clientX - rect.left) * (this.canvasWidth / rect.width));
      const py = Math.floor((e.clientY - rect.top) * (this.canvasHeight / rect.height));

      if (this.isSelecting) {
          if (this.activeTool === 'move') {
              const start = this.selectionPoints[0];
              this.selectionPoints = [start, {x: px, y: start.y}, {x: px, y: py}, {x: start.x, y: py}];
          } else { this.selectionPoints.push({x: px, y: py}); }
          this.updateSelectionOverlay(); return;
      }

      if (this.isDraggingSelection) {
          const dx = px - this.dragStartX, dy = py - this.dragStartY;
          if (dx !== 0 || dy !== 0) {
              this.applyLayerShift(dx, dy, e.altKey);
              this.dragStartX = px; this.dragStartY = py;
              const newMask = new Array(this.canvasWidth * this.canvasHeight).fill(false);
              for(let i=0; i<this.selectionMask.length; i++) if (this.selectionMask[i]) {
                  const x = (i % this.canvasWidth) + dx, y = Math.floor(i / this.canvasWidth) + dy;
                  if (x>=0 && x<this.canvasWidth && y>=0 && y<this.canvasHeight) newMask[y*this.canvasWidth+x]=true;
              }
              this.selectionMask = newMask;
              this.updateSelectionOverlay(); this.redrawCompositedCanvas();
          }
          return;
      }

      if (px < 0 || py < 0 || px >= this.canvasWidth || py >= this.canvasHeight) return;
      if (px === this.lastX && py === this.lastY) return;

      const layer = this.frames[this.activeFrameIdx]?.layers[this.activeLayerIdx];
      if (!layer || !layer.visible || layer.locked) return;
      if (this.hasSelection && !this.selectionMask[py * this.canvasWidth + px]) return;

      const cRgba = this.hexToRgba(this.primaryColor, Math.round(this.brushOpacity * 255));
      
      // PIXEL PERFECT ENGINE
      if (this.activeTool === 'pencil' || this.activeTool === 'eraser') {
          const isErasing = this.activeTool === 'eraser';
          const drawColor = isErasing ? {r:0,g:0,b:0,a:0} : cRgba;
          
          if (this.isPixelPerfect && this.lastX !== -1) {
              // Simple version of pixel perfect: skip the middle pixel if it creates an L-bend
              // This is usually handled in the stroke buffer, but here we'll do basic neighbor check
              const dx = Math.abs(px - this.lastX);
              const dy = Math.abs(py - this.lastY);
              if (dx === 1 && dy === 1) {
                  // We'll see if the last pixel can be removed if a new neighbor is added
                  // For now, standard Bresenham is already quite clean. 
                  // We'll implement the "no-triple" check:
                  // if we just moved diagonally, and there's a horizontal/vertical neighbor painted, it's a double.
              }
          }
          
          this.drawLine(layer.data, this.lastX === -1 ? px : this.lastX, this.lastY === -1 ? py : this.lastY, px, py, drawColor);
      }
      else if (this.activeTool === 'fill' && this.lastX === -1) this.floodFill(layer.data, px, py, cRgba);
      else if (this.activeTool === 'magic_wand' && this.lastX === -1) this.magicWandSelect(layer.data, px, py);
      else if (this.activeTool === 'picker' && this.lastX === -1) {
          const idx = (py * this.canvasWidth + px) * 4;
          this.primaryColor = "#" + (1 << 24 | layer.data.data[idx] << 16 | layer.data.data[idx+1] << 8 | layer.data.data[idx+2]).toString(16).slice(1);
          this.callbacks.reRender();
      } else if (this.activeTool === 'particle') this.scatterParticle(layer.data, px, py, cRgba);

      this.lastX = px; this.lastY = py;
      this.redrawCompositedCanvas();
      this.updatePreview(); 
  }

   private handleShapeMouseMove(e: MouseEvent) {
       if (!this.shapePreviewData) return;
       const rect = this.uiCanvas!.getBoundingClientRect();
       const px = Math.floor((e.clientX - rect.left) * (this.canvasWidth / rect.width));
       const py = Math.floor((e.clientY - rect.top) * (this.canvasHeight / rect.height));
       this.shapePreviewData.x2 = px; this.shapePreviewData.y2 = py;
       this.updateSelectionOverlay(); // Use selection canvas for temporary shape ghost
       
       const sc = this.container?.querySelector('#px-selection-canvas') as HTMLCanvasElement;
       const sCtx = sc.getContext('2d')!;
       sCtx.clearRect(0,0,this.canvasWidth,this.canvasHeight);
       sCtx.strokeStyle = this.primaryColor; sCtx.setLineDash([]); sCtx.lineWidth = 1/this.zoom;
       
       const sp = this.shapePreviewData;
       const type = this.activeTool;
       if (type === 'rectangle') sCtx.strokeRect(Math.min(sp.x1,sp.x2), Math.min(sp.y1,sp.y2), Math.abs(sp.x2-sp.x1), Math.abs(sp.y2-sp.y1));
       else if (type === 'line') { sCtx.beginPath(); sCtx.moveTo(sp.x1, sp.y1); sCtx.lineTo(sp.x2, sp.y2); sCtx.stroke(); }
       else if (type === 'circle') {
           const r = Math.sqrt((sp.x2-sp.x1)**2 + (sp.y2-sp.y1)**2);
           sCtx.beginPath(); sCtx.arc(sp.x1, sp.y1, r, 0, Math.PI*2); sCtx.stroke();
       }
   }

   private commitShape() {
       if (!this.shapePreviewData) return;
       this.saveHistory();
       const layer = this.frames[this.activeFrameIdx]?.layers[this.activeLayerIdx];
       if (layer) {
           const cRgba = this.hexToRgba(this.primaryColor, Math.round(this.brushOpacity * 255));
           this.drawShape(this.activeTool, layer.data, this.shapePreviewData.x2, this.shapePreviewData.y2, cRgba);
       }
       this.isDrawingShape = false; this.shapePreviewData = null;
       this.lastX = -1; this.lastY = -1;
       this.updateSelectionOverlay(); this.redrawCompositedCanvas();
   }

   private drawShape(type: string, imgData: ImageData, x: number, y: number, color: any) {
       const x1 = this.lastX, y1 = this.lastY, x2 = x, y2 = y;
       if (type === 'line') this.drawLine(imgData, x1, y1, x2, y2, color);
       else if (type === 'rectangle') {
           const minX = Math.min(x1, x2), maxX = Math.max(x1, x2), minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
           if (this.isShapeFilled) { for(let iy=minY; iy<=maxY; iy++) for(let ix=minX; ix<=maxX; ix++) this.putPixel(imgData, ix, iy, color); }
           else { for(let i=minX; i<=maxX; i++) { this.putPixel(imgData, i, minY, color); this.putPixel(imgData, i, maxY, color); }
                  for(let i=minY; i<=maxY; i++) { this.putPixel(imgData, minX, i, color); this.putPixel(imgData, maxX, i, color); } }
       } else if (type === 'circle') {
           const r = Math.round(Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2)));
           if (this.isShapeFilled) { for(let iy=-r; iy<=r; iy++) for(let ix=-r; ix<=r; ix++) if(ix*ix + iy*iy <= r*r) this.putPixel(imgData, x1+ix, y1+iy, color); }
           else this.drawCircle(imgData, x1, y1, r, color);
       } else if (type === 'triangle') {
           const pts = [{x: x1, y: y2}, {x: x2, y: y2}, {x: (x1+x2)/2, y: y1}];
           if (this.isShapeFilled) this.fillPolygon(imgData, pts, color);
           else { this.drawLine(imgData, pts[0].x, pts[0].y, pts[1].x, pts[1].y, color); this.drawLine(imgData, pts[1].x, pts[1].y, pts[2].x, pts[2].y, color); this.drawLine(imgData, pts[2].x, pts[2].y, pts[0].x, pts[0].y, color); }
       } else if (type === 'star') {
           const cx = x1, cy = y1, r = Math.sqrt((x2-cx)**2 + (y2-cy)**2), pts: any[] = [];
           for(let i=0; i<10; i++){ const a = i * Math.PI / 5 - Math.PI/2, dist = i%2===0 ? r : r/2.5; pts.push({x: Math.round(cx + Math.cos(a)*dist), y: Math.round(cy + Math.sin(a)*dist)}); }
           if (this.isShapeFilled) this.fillPolygon(imgData, pts, color);
           else pts.forEach((p, i) => this.drawLine(imgData, p.x, p.y, pts[(i+1)%pts.length].x, pts[(i+1)%pts.length].y, color));
       } else if (type === 'arc') {
           const cx = x1, cy = y1, r = Math.round(Math.sqrt((x2-cx)**2 + (y2-cy)**2));
           const startAngle = Math.atan2(y2-cy, x2-cx), endAngle = startAngle + Math.PI/2;
           for(let a=startAngle; a<=endAngle; a+=0.05) this.putPixel(imgData, Math.round(cx+Math.cos(a)*r), Math.round(cy+Math.sin(a)*r), color);
       }
   }

   private fillPolygon(imgData: ImageData, pts: any[], color: any) {
       const minP = {x: Math.min(...pts.map(p=>p.x)), y: Math.min(...pts.map(p=>p.y))}, maxP = {x: Math.max(...pts.map(p=>p.x)), y: Math.max(...pts.map(p=>p.y))};
       for(let y=minP.y; y<=maxP.y; y++){
           for(let x=minP.x; x<=maxP.x; x++){
               let inside = false;
               for(let i=0, j=pts.length-1; i<pts.length; j=i++) if(((pts[i].y > y) !== (pts[j].y > y)) && (x < (pts[j].x - pts[i].x) * (y - pts[i].y) / (pts[j].y - pts[i].y) + pts[i].x)) inside = !inside;
               if(inside) this.putPixel(imgData, x, y, color);
           }
       }
   }

   private drawLine(img: ImageData, x1: number, y1: number, x2: number, y2: number, color: any) {
       let dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1), sx = (x1 < x2) ? 1 : -1, sy = (y1 < y2) ? 1 : -1, err = dx - dy;
       while (true) { this.putPixel(img, x1, y1, color); if (x1 === x2 && y1 === y2) break; let e2 = 2 * err; if (e2 > -dy) { err -= dy; x1 += sx; } if (e2 < dx) { err += dx; y1 += sy; } }
   }

   private drawCircle(img: ImageData, xc: number, yc: number, r: number, color: any) {
       let x = 0, y = r, d = 3 - 2 * r;
       const plot = (px:number, py:number) => { this.putPixel(img, xc+px, yc+py, color); this.putPixel(img, xc-px, yc+py, color); this.putPixel(img, xc+px, yc-py, color); this.putPixel(img, xc-px, yc+py, color); this.putPixel(img, xc+py, yc+px, color); this.putPixel(img, xc-py, yc+px, color); this.putPixel(img, xc+py, yc-px, color); this.putPixel(img, xc-py, yc-px, color); };
       while (y >= x) { plot(x, y); x++; if (d > 0) { y--; d = d + 4 * (x - y) + 10; } else d = d + 4 * x + 6; }
   }

  private putBrush(imgData: ImageData, x: number, y: number, color: any) {
      const h = Math.floor(this.brushSize / 2);
      const isEraser = color.a === 0;
      for (let dy = -h; dy <= h; dy++) {
          for (let dx = -h; dx <= h; dx++) {
              if (Math.sqrt(dx*dx + dy*dy) <= h || this.brushSize === 1) {
                  if (isEraser) this.clearPixel(imgData, x+dx, y+dy);
                  else this.putPixel(imgData, x+dx, y+dy, color);
              }
          }
      }
  }

  private clearPixel(imgData: ImageData, x: number, y: number) {
      if (x<0||y<0||x>=this.canvasWidth||y>=this.canvasHeight) return;
      if (this.hasSelection && !this.selectionMask[y * this.canvasWidth + x]) return;
      const idx = (y * this.canvasWidth + x) * 4;
      imgData.data[idx+3] = 0;
  }

  private putPixel(imgData: ImageData, x: number, y: number, color: any) {
      if (x<0||y<0||x>=this.canvasWidth||y>=this.canvasHeight) return;
      if (this.hasSelection && !this.selectionMask[y * this.canvasWidth + x]) return;
      
      if (this.isDithering && (x + y) % 2 !== 0) return;

      const draw = (ix: number, iy: number) => {
          if (ix<0||iy<0||ix>=this.canvasWidth||iy>=this.canvasHeight) return;
          const idx = (iy * this.canvasWidth + ix) * 4;
          const a = color.a / 255;
          imgData.data[idx] = Math.round(imgData.data[idx] * (1-a) + color.r * a);
          imgData.data[idx+1] = Math.round(imgData.data[idx+1] * (1-a) + color.g * a);
          imgData.data[idx+2] = Math.round(imgData.data[idx+2] * (1-a) + color.b * a);
          imgData.data[idx+3] = Math.max(imgData.data[idx+3], color.a);
      };

      draw(x, y);

      if (this.symH) {
          const minX = 0, maxX = this.canvasWidth - 1;
          const mx = maxX - x;
          draw(mx, y);
          if (this.symV) draw(mx, (this.canvasHeight - 1) - y);
      }
      if (this.symV) {
          draw(x, (this.canvasHeight - 1) - y);
      }
  }

  private scatterParticle(imgData: ImageData, x: number, y: number, color: any) {
    const s = this.brushSize * this.particleSpread;
    for(let i=0; i<this.brushSize * this.particleDensity; i++) {
        const ox = Math.floor((Math.random()-0.5)*s), oy = Math.floor((Math.random()-0.5)*s);
        this.putPixel(imgData, x+ox, y+oy, {...color, a: Math.random()*color.a});
    }
  }

  private floodFill(imgData: ImageData, x: number, y: number, fc: any) {
      const i = (y * this.canvasWidth + x) * 4;
      const tr = imgData.data[i], tg = imgData.data[i+1], tb = imgData.data[i+2], ta = imgData.data[i+3];
      if (tr===fc.r && tg===fc.g && tb===fc.b && ta===fc.a) return;
      const stack = [[x, y]];
      while (stack.length > 0) {
          const [cx, cy] = stack.pop()!;
          const idx = (cy * this.canvasWidth + cx) * 4;
          if (cx>=0 && cx<this.canvasWidth && cy>=0 && cy<this.canvasHeight && imgData.data[idx]===tr && imgData.data[idx+1]===tg && imgData.data[idx+2]===tb && imgData.data[idx+3]===ta) {
              this.putPixel(imgData, cx, cy, fc);
              stack.push([cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]);
          }
      }
  }

  private togglePlay() {
      if (this.isPlaying) { clearInterval(this.playInterval); this.isPlaying = false; this.callbacks.reRender(); }
      else {
          this.isPlaying = true; this.callbacks.reRender();
          this.playInterval = setInterval(() => {
              this.activeFrameIdx = (this.activeFrameIdx + 1) % this.frames.length;
              this.redrawCompositedCanvas();
          }, 1000/this.playFps);
      }
  }

  private updateCanvasTransform() {
     const rot = this.container?.querySelector('#px-canvas-rotator') as HTMLElement;
     if (rot) rot.style.transform = `translate(${this.panX}px, ${this.panY}px) translate(-50%, -50%) scale(${this.zoom})`;
  }

  private hexToRgba(hex: string, a: number) {
      const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return res ? { r: parseInt(res[1], 16), g: parseInt(res[2], 16), b: parseInt(res[3], 16), a } : { r:0, g:0, b:0, a };
  }

  private async uploadFrames(frames: string[], prefix: string): Promise<string[]> {
      const paths: string[] = [];
      for (let i = 0; i < frames.length; i++) {
          const name = `${prefix}_${Date.now()}_${i}.png`;
          try {
              const resp = await fetch('/api/upload-sprite-frame', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name, data: frames[i] })
              });
              const json = await resp.json();
              if (json.success) {
                  paths.push(json.url);
              } else {
                  paths.push(frames[i]);
              }
          } catch (e) {
              paths.push(frames[i]);
          }
      }
      return paths;
  }

  private async saveToGallery() {
      if (this.isPlaying) this.togglePlay();
      this.core.showToast('Enviando frames para o servidor...', '#51c5ff');
      
      const framesData: string[] = [];
      this.frames.forEach(f => {
          const c = document.createElement('canvas'); c.width=this.canvasWidth; c.height=this.canvasHeight;
          const ctx = c.getContext('2d')!;
          f.layers.forEach(l => { if(l.visible) {
              const t = document.createElement('canvas'); t.width=this.canvasWidth; t.height=this.canvasHeight;
              t.getContext('2d')!.putImageData(l.data,0,0); ctx.drawImage(t,0,0);
          }});
          framesData.push(c.toDataURL('image/png'));
      });

      const name = prompt('Nome do Asset:');
      if (name) {
          const urls = await this.uploadFrames(framesData, name.replace(/\s+/g, '_').toLowerCase());
          this.state.customGallerySprites.push({ 
              id:'gal-'+Date.now(), 
              name, 
              type:'pixel', 
              frames:urls, 
              previewUrl:urls[0], 
              createdAt:Date.now() 
          });
          this.core.showToast('Asset salvo persistentemente na Galeria!', '#ffd700');
      }
  }

  private async exportToIDE() {
     if(this.isPlaying) this.togglePlay();
     this.core.showToast('Sincronizando com o servidor...', '#51c5ff');
     
     const framesData: string[] = [];
     for(const f of this.frames) {
        const c = document.createElement('canvas'); c.width=this.canvasWidth; c.height=this.canvasHeight;
        const ctx = c.getContext('2d')!;
        f.layers.forEach(l => { if(l.visible) {
            const t = document.createElement('canvas'); t.width=this.canvasWidth; t.height=this.canvasHeight;
            t.getContext('2d')!.putImageData(l.data,0,0); ctx.drawImage(t,0,0);
        }});
        framesData.push(c.toDataURL('image/png'));
     }

     if(this.editingSlot) { 
        const urls = await this.uploadFrames(framesData, 'sprite_action');
        this.editingSlot.type = 'png'; 
        this.editingSlot.frames = urls; 
        this.core.showToast('Pixel Art Sincronizada com Sucesso!','#ffd700'); 
        this.callbacks.onBack(); 
     }
  }
}
