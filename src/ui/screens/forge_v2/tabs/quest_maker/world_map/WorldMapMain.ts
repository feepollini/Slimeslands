import { ForgeCore } from '../../../core/ForgeCore';
import { WorldMapToolbar } from './WorldMapToolbar';
import { CollisionEngine } from './systems/CollisionEngine';
import { SensorEngine } from './systems/SensorEngine';
import { EventExecutor } from './systems/EventExecutor';
import { ShapeRenderer } from './systems/ShapeRenderer';
import { RenderPipeline } from './systems/RenderPipeline';
import { SceneSaveDialog } from './panels/SceneSaveDialog';
import { SceneLoadDialog } from './panels/SceneLoadDialog';
import { StampBrushState } from './systems/StampBrushState';
import { PhaseDialog } from './panels/PhaseDialog';
import { PhaseRegionTool } from './tools/PhaseRegionTool';
import { PhaseSpawnTool } from './tools/PhaseSpawnTool';
import { PhaseToolbar } from './PhaseToolbar';
import { KeyframeManager } from '../../../../../shared/KeyframeManager';
import { aeTimeline } from '../../../../../shared/AETimeline';
import { CameraOverlay } from './CameraOverlay';
import { LightSystem } from './systems/LightSystem';

export class WorldMapMain {
  private toolbar = new WorldMapToolbar();
  private collisionEngine!: CollisionEngine;
  private sensorEngine!: SensorEngine;
  private eventExecutor!: EventExecutor;
  private shapeRenderer!: ShapeRenderer;
  private renderPipeline!: RenderPipeline;
  private sceneSaveDialog = new SceneSaveDialog();
  private sceneLoadDialog = new SceneLoadDialog();
  private phaseDialog: PhaseDialog;
  private phaseRegionTool: PhaseRegionTool;
  private phaseSpawnTool: PhaseSpawnTool;
  private phaseToolbar = new PhaseToolbar();
  private cameraOverlay: CameraOverlay;
  private lightSystem: LightSystem;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private state: any;
  private callbacks: any;

  private zoom: number = 1;
  private panX: number = 0;
  private panY: number = 0;
  private get mapWidth(): number { return this.state.mapWidth || 4000; }
  private get mapHeight(): number { return this.state.mapHeight || 2250; }
  private get mapChunks(): number { return this.state.mapChunks || 8; }
  private get mapChunkSize(): number { return this.state.mapChunkSize || 500; }

  private isPanning = false;
  private isDragging = false;
  private isResizing = false;
  private resizeHandle: string | null = null;
  private selectedId: string | null = null;

  private dragStartX = 0;
  private dragStartY = 0;

  private isCreatingShape = false;
  private currentShapeObject: any = null;

  private handleSize = 8;
  private stampBrush = new StampBrushState();
  private _editingNode: number | null = null;
  private undoStack: any[][] = [];
  private redoStack: any[][] = [];
  private isSelectArea = false;
  private selectAreaStart = { x: 0, y: 0 };
  private selectAreaEnd = { x: 0, y: 0 };
  private stampMouseDownPos = { x: 0, y: 0 };
  private stampIsDragging = false;
  private stampMouseHeld = false;

  private playerObjectId: string | null = null;
  private isRunningSequence = false;
  private sequenceAlpha = 0;
  private sequencePlayerY = 0;
  private joystickVisible = false;
  private joystickActive = false;
  private joystickX = 0;
  private joystickY = 0;
  private playerSpeed = 3;
  private animFrameId: number | null = null;
  private _parentChangePending = false;
  private _boundEvents: { [key: string]: EventListener } = {};
  private core!: ForgeCore;

  constructor(_state: any, _core: ForgeCore, _callbacks: any) {
    // If there is any previous instance, destroy it first to clean up global listeners
    if ((window as any).__wmInstance && (window as any).__wmInstance !== this) {
       try { (window as any).__wmInstance.destroy(); } catch(e) {}
    }
    
    this.state = _state;
    this.core = _core;
    this.callbacks = _callbacks;
    this.state._lightSystem = null;
    (window as any).__wmInstance = this;
    this.collisionEngine = new CollisionEngine(this.objects);
    this.eventExecutor = new EventExecutor(() => this.centerCameraOnPlayer(), this.state);
    this.sensorEngine = new SensorEngine(this.objects, (events, source, player) => this.eventExecutor.execute(events, source, player));
    this.shapeRenderer = new ShapeRenderer(this.zoom);
    this.renderPipeline = new RenderPipeline(this.shapeRenderer);
    this.phaseDialog = new PhaseDialog(this.state, this.callbacks, this.renderPipeline);
    this.phaseRegionTool = new PhaseRegionTool(this.state);
    this.phaseSpawnTool = new PhaseSpawnTool(this.state);
    this.cameraOverlay = new CameraOverlay(this.state);
    this.lightSystem = new LightSystem(this.objects);
    this.state._lightSystem = this.lightSystem;
    // Load saved scenes from server at startup
    this.loadSavedScenes();

    document.addEventListener('wm-command', (e: any) => {
      const { cmd } = e.detail;
      if (cmd === 'undo') this.callbacks.undo();
      if (cmd === 'redo') this.callbacks.redo();
      if (cmd === 'run') aeTimeline.togglePlayPause();
    });

    document.addEventListener('start-run-sequence', () => {
      this.startRunSequence();
    });

    document.addEventListener('worldmap-time-changed', (e: any) => {
      this.state.currentTime = e.detail.time;
      this.draw();
    });

    // Sincronizar estado de Play entre Barra e Timeline
    document.addEventListener('ae-play-toggle', ((e: CustomEvent) => {
      this.state.isPlaying = e.detail.isPlaying;
      if (this.state.isPlaying) {
        aeTimeline.play();
      } else {
        aeTimeline.pause();
      }
      this.draw();
    }) as EventListener);

    // Sincronizar metadados do GIF (duração/tamanho) após o Worker terminar

    // Sincronizar metadados do GIF (duração/tamanho) após o Worker terminar
    document.addEventListener('worldmap-asset-ready', ((e: CustomEvent) => {
      const { url, totalDuration, width, height } = e.detail;
      console.log('[WorldMapMain] GIF Ready:', url, 'duration:', totalDuration);
      
      let changed = false;
      this.objects.forEach((obj: any) => {
        if (obj.assetUrl === url || obj.url === url) {
          // Os GIFs/Sprites vêm com looping por padrão
          if (obj.isLooping === undefined) obj.isLooping = true;

          const duration = totalDuration / 1000;
          obj.inPoint = obj.inPoint ?? 0;
          obj.outPoint = obj.inPoint + duration;
          obj.duration = duration;
          
          if (!obj.w || obj.w === 100) obj.w = width;
          if (!obj.h || obj.h === 100) obj.h = height;
          
          changed = true;
        }
      });

      if (changed) {
        this.saveUndoState();
        this.draw();
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        if (this.callbacks.reRender) this.callbacks.reRender();
      }
    }) as EventListener);
  }

  public updateRefs(state: any, callbacks: any) {
    this.state = state;
    this.callbacks = callbacks;
    this.collisionEngine = new CollisionEngine(this.objects);
    this.eventExecutor = new EventExecutor(() => this.centerCameraOnPlayer(), this.state);
    this.sensorEngine = new SensorEngine(this.objects, (events, source, player) => this.eventExecutor.execute(events, source, player));
    this.shapeRenderer = new ShapeRenderer(this.zoom);
    this.renderPipeline = new RenderPipeline(this.shapeRenderer);
    this.phaseDialog = new PhaseDialog(this.state, this.callbacks, this.renderPipeline);
    this.phaseRegionTool = new PhaseRegionTool(this.state);
    this.phaseSpawnTool = new PhaseSpawnTool(this.state);
    this.lightSystem = new LightSystem(this.objects);
    this.state._lightSystem = this.lightSystem;
    
    document.addEventListener('show-canvas-ui-changed', ((e: CustomEvent) => {
      this.state.showCanvasUI = e.detail;
      this.renderPipeline.setState(this.state);
      this.draw();
    }) as EventListener);
  }

  public get objects(): any[] { 
    this.state.worldMapObjects = this.state.worldMapObjects || [];
    return this.state.worldMapObjects;
  }
  private set objects(val: any[]) {
     this.state.worldMapObjects = val;
  }

  public render(): string {
    const activeScene = this.state.activeSceneName || '';
    this.state.stampBrush = this.state.stampBrush || {
      stampUrl: '', opacity: 1, size: 50, spacing: 20,
      randomMirror: false, randomMirrorX: false, randomMirrorY: false,
      randomSize: 0, randomRotation: 0, stamps: []
    };
    this.stampBrush = this.state.stampBrush;
    return `
      <div style="display:flex; flex-direction:column; height:100%; background:#0a0a0f; font-family:'Inter',sans-serif; color:#fff;">
        ${this.toolbar.render()}
        <div class="quest-maker-content" style="flex:1; position:relative; overflow:hidden; cursor:default;">
          <canvas id="wm-canvas" style="display:block; width:100%; height:100%;"></canvas>
          <div id="wm-coords" style="position:absolute; bottom:10px; left:12px; font-size:0.38rem; opacity:0.35; pointer-events:none; letter-spacing:1px;">X:0 Y:0</div>
          ${activeScene ? `
          <div id="wm-active-scene" style="
            position:absolute; bottom:10px; right:12px; display:flex; align-items:center; gap:8px;
            background:rgba(81,197,255,0.15); border:1px solid rgba(81,197,255,0.3); border-radius:6px;
            padding:6px 12px; z-index:10;
          ">
            <span style="font-size:0.6rem; color:#51c5ff; font-weight:900; text-transform:uppercase; letter-spacing:0.5px;">🎬 ${activeScene}</span>
            <button id="wm-exit-scene" style="
              background:rgba(255,51,102,0.2); border:1px solid rgba(255,51,102,0.4); border-radius:4px;
              color:#ff3366; font-size:0.5rem; font-weight:900; cursor:pointer; padding:3px 8px;
              text-transform:uppercase;
            ">✕ SAIR DA CENA</button>
          </div>
          ` : ''}
          <div id="wm-gif-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;"></div>
        </div>
        ${this.sceneSaveDialog.render(null, this.state.worldMapObjects || [])}
        ${this.sceneLoadDialog.render(this.state)}
      </div>
    `;
  }

  public bind(container: HTMLElement) {
    if (this.animFrameId) { cancelAnimationFrame(this.animFrameId); this.animFrameId = null; }

    const viewport = container.querySelector('.quest-maker-content') as HTMLElement;
    this.canvas = container.querySelector('#wm-canvas') as HTMLCanvasElement;
    if (!this.canvas) return;
    // Clear GIF overlay map on re-bind so stale DOM refs are discarded
    this.gifOverlayImgs.clear();

    if (viewport) {
       this.canvas.width = viewport.clientWidth;
       this.canvas.height = viewport.clientHeight;
       this.state._mapCanvasDims = { w: this.canvas.width, h: this.canvas.height };
    }

    this.ctx = this.canvas.getContext('2d');

    // --- Local Element Events ---
    this.canvas.onpointerdown = (e) => this.onMouseDown(e);
    this.canvas.onpointermove = (e) => this.onMouseMove(e);
    this.canvas.onpointerup = () => this.onMouseUp();
    this.canvas.onpointerleave = () => { if (this.stampMouseHeld) this.onMouseUp(); };
    this.canvas.onwheel = (e) => this.onWheel(e);
    this.canvas.oncontextmenu = (e) => e.preventDefault();

    // Drag & Drop
    const canvasEl = this.canvas;
    canvasEl.addEventListener('dragover', (e: DragEvent) => {
       e.preventDefault();
       e.dataTransfer!.dropEffect = 'copy';
    });
    canvasEl.addEventListener('drop', (e: DragEvent) => {
       e.preventDefault();
       const data = e.dataTransfer!.getData('text/plain');
       if (!data || !this.canvas) return;
       
       const rect = this.canvas.getBoundingClientRect();
       const wx = this.toWorldX(e.clientX - rect.left);
       const wy = this.toWorldY(e.clientY - rect.top);

       // Check if it's a JSON payload (Sprite Pack)
       try {
         const json = JSON.parse(data);
         if (json.type === 'sprite_pack') {
           const pack = (this.state.customSpritePacks || []).find((p: any) => p.id === json.id);
           if (pack) {
             this.createSpriteFromPack(pack, wx, wy);
             return;
           }
         }
       } catch (err) {
         // Not JSON, treat as URL
         this.createAssetWithCollision(data, wx, wy);
       }
    });

    // Toolbar binding
    this.toolbar.bind(container, this.state, (toolId, subtool) => {
      (window as any).__worldMapToolbar = this.toolbar;
      if (toolId === 'player_camera') {
        this.state.isCameraActive = !this.state.isCameraActive;
        this.draw();
      }
      if (toolId === 'camera') {
        this.state.isCameraActive = true;
        this.state.cameraMode = subtool === 'cam_portrait' ? 'portrait' : 'landscape';
      }
      if (toolId === 'light') {
        // placeholder
      }
      if (toolId === 'fases') {
        this.state._mapZoom = this.zoom;
      }
    }, (mode, zoom, bgColor, loadPhaseId, savePhase, phaseName) => {
      if (mode) this.state.cameraMode = mode;
      if (zoom !== undefined) {
        this.state.cameraZoom = zoom;
        localStorage.setItem('wm_cameraZoom', zoom.toString());
      }
      if (bgColor) {
        this.state.bgColor = bgColor;
        localStorage.setItem('wm_bgColor', bgColor);
      }
      if (loadPhaseId) {
        this.loadPhaseById(loadPhaseId);
      }
      if (savePhase) {
        const wx = this.playerObjectId ? (this.objects.find((o: any) => o.id === this.playerObjectId)?.x || 0) : 0;
        const wy = this.playerObjectId ? (this.objects.find((o: any) => o.id === this.playerObjectId)?.y || 0) : 0;
        
        // If phaseName is provided, save directly; otherwise show dialog
        if (phaseName) {
          this.state.currentPhaseName = phaseName;
          this.savePhaseDirect(phaseName, wx, wy);
        } else {
          this.showSavePhaseDialog(wx, wy, this.state.cameraMode);
        }
      }
      this.fitCameraFrame();
      this.draw();
    });

    this.updateCursor(viewport);
    this.draw();
    this.startAnimationLoop();

    // ---- GLOBAL EVENT BINDING WITH CLEANUP ----
    this.setupGlobalListeners();
  }

  private setupGlobalListeners() {
    this.cleanupGlobalListeners();

    this._boundEvents['worldmap-objects-changed'] = () => {
      if (this._renderDebounce) return;
      this._renderDebounce = true;
      requestAnimationFrame(() => {
        this._renderDebounce = false;
        this.draw();
        this.updatePreviewCamera();
      });
    };

    this._boundEvents['stamp-brush-changed'] = () => {
      this.stampBrush = this.state.stampBrush;
      this.draw();
    };

    this._boundEvents['phase-created'] = () => {
      this.playerObjectId = this.objects.find((o: any) => o.type === 'player')?.id || null;
      if (this.playerObjectId) {
        this.state.cameraMode = 'fixed';
        this.state.cameraZoom = 1;
        this.fitCameraFrame();
      }
      this.draw();
    };

    this._boundEvents['worldmap-selection-changed'] = () => this.draw();

    this._boundEvents['worldmap-time-changed'] = (e: any) => {
      const time = e.detail?.time || 0;
      this.state.currentTime = time;
      this.draw();
    };

    this._boundEvents['worldmap-request-property-update'] = ((e: CustomEvent) => {
      const { id, prop, value } = e.detail;
      this.updatePropertyHierarchical(id, prop, value);
    }) as EventListener;

    this._boundEvents['worldmap-request-parent-change'] = ((e: CustomEvent) => {
      if (this._parentChangePending) return;
      this._parentChangePending = true;
      const { childId, parentId } = e.detail;
      this.setParent(childId, parentId);
      requestAnimationFrame(() => {
        this._parentChangePending = false;
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      });
    }) as EventListener;

    this._boundEvents['add-primal-to-asset'] = (e: any) => {
      const { primal } = e.detail;
      this.objects.push(primal);
      this.draw();
      this.callbacks.reRender();
    };

    this._boundEvents['scene-pan-to'] = (e: any) => {
      const { x, y } = e.detail;
      if (!this.canvas) return;
      const targetPanX = this.canvas.width / 2 - x * this.zoom;
      const targetPanY = this.canvas.height / 2 - y * this.zoom;
      const startPanX = this.panX;
      const startPanY = this.panY;
      const duration = 800;
      const startTime = performance.now();
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        this.panX = startPanX + (targetPanX - startPanX) * eased;
        this.panY = startPanY + (targetPanY - startPanY) * eased;
        this.draw();
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    };

    this._boundEvents['open-scene-save-dialog'] = ((e: any) => {
      const detail = e?.detail || {};
      this.sceneSaveDialog.open(detail.sceneName || '', detail.editingSceneId || null);
      const ov = document.querySelector('.scene-save-overlay') as HTMLElement;
      if (ov) ov.style.display = 'flex';
    }) as EventListener;

    this._boundEvents['open-scene-load-dialog'] = (() => {
      this.sceneLoadDialog.open();
      const ov = document.querySelector('.scene-load-overlay') as HTMLElement;
      if (ov) ov.style.display = 'flex';
    }) as EventListener;

    this._boundEvents['joystick-move'] = ((e: any) => {
      this.joystickX = e.detail.x;
      this.joystickY = e.detail.y;
      this.joystickActive = e.detail.active;
      
      const player = this.objects.find(o => o.id === this.playerObjectId);
      if (player) {
         if (!player.charData) player.charData = {};
         player.charData._isMoving = e.detail.active;
         if (e.detail.active) {
            const ax = Math.abs(this.joystickX);
            const ay = Math.abs(this.joystickY);
            if (ay > ax) player.charData._currentDir = this.joystickY > 0 ? 'down' : 'up';
            else player.charData._currentDir = this.joystickX > 0 ? 'right' : 'left';
         }
      }
    }) as EventListener;

    this._boundEvents['joystick-interact'] = (() => this.handleInteract()) as EventListener;

    this._boundEvents['wm-command'] = ((e: any) => {
      const cmd = e.detail.cmd;
      if (cmd === 'undo' && this.undoStack.length > 0) {
        this.redoStack.push(JSON.parse(JSON.stringify(this.objects)));
        this.state.worldMapObjects = this.undoStack.pop();
        this.draw(); this.callbacks.reRender();
      } else if (cmd === 'redo' && this.redoStack.length > 0) {
        this.undoStack.push(JSON.parse(JSON.stringify(this.objects)));
        this.state.worldMapObjects = this.redoStack.pop();
        this.draw(); this.callbacks.reRender();
      } else if (cmd === 'duplicate') {
        this.saveUndoState();
        const newIds: string[] = [];
        (this.state.selectedIds || []).forEach((id: string) => {
          const obj = this.objects.find((o: any) => o.id === id);
          if (obj) {
            const clone = JSON.parse(JSON.stringify(obj));
            clone.id = obj.type + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
            clone.x += 20; clone.y += 20;
            this.objects.push(clone);
            newIds.push(clone.id);
          }
        });
        this.state.selectedIds = newIds;
        this.draw(); this.callbacks.reRender();
      } else if (cmd === 'delete-sel') {
        this.saveUndoState();
        this.deleteSelected();
      }
    }) as EventListener;

    this._boundEvents['keydown'] = ((e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Delete' || e.key === 'Backspace') document.dispatchEvent(new CustomEvent('wm-command', { detail: { cmd: 'delete-sel' } }));
      else if (e.ctrlKey && e.key === 'z') { e.preventDefault(); document.dispatchEvent(new CustomEvent('wm-command', { detail: { cmd: 'undo' } })); }
      else if (e.ctrlKey && e.key === 'y') { e.preventDefault(); document.dispatchEvent(new CustomEvent('wm-command', { detail: { cmd: 'redo' } })); }
      else if (e.ctrlKey && e.key === 'd') { e.preventDefault(); document.dispatchEvent(new CustomEvent('wm-command', { detail: { cmd: 'duplicate' } })); }
    }) as EventListener;

    // Register all
    Object.keys(this._boundEvents).forEach(name => {
      document.addEventListener(name, this._boundEvents[name]);
    });
  }

  private cleanupGlobalListeners() {
    Object.keys(this._boundEvents).forEach(name => {
      document.removeEventListener(name, this._boundEvents[name]);
    });
    this._boundEvents = {};
  }

  public destroy() {
    console.log('[WorldMapMain] Destroying instance and cleaning up listeners...');
    this.cleanupGlobalListeners();
    
    // Cleanup sub-components
    if (this.toolbar) this.toolbar.destroy();
    if (this.wizard) this.wizard.close();
    if (this.phaseDialog) this.phaseDialog.close();

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.gifOverlayImgs.forEach(img => img.remove());
    this.gifOverlayImgs.clear();
    
    if (this.canvas) {
      this.canvas.onpointerdown = null;
      this.canvas.onpointermove = null;
      this.canvas.onpointerup = null;
      this.canvas.onwheel = null;
      this.canvas.oncontextmenu = null;
    }
    
    if ((window as any).__wmInstance === this) {
       (window as any).__wmInstance = null;
    }
  }

  private startAnimationLoop() {
    const loop = () => {
      if (!this.canvas) {
        this.animFrameId = null;
        return;
      }

      if (this.lightSystem) this.lightSystem.tick();
      this.updatePlayerPhysics();
      // Share overlay img refs so RenderPipeline can draw GIF frames into the canvas
      // (canvas pixels are then visible when the preview copies the canvas)
      this.renderPipeline.setGifOverlayRefs(this.gifOverlayImgs);
      this.draw();
      this.updateGifOverlay();

      // Render the Phase Emulator previews if open
      if (this.phaseDialog && this.phaseDialog.isOpen) {
        this.phaseDialog.updatePreview();
      }

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  // GIF Overlay: positions native <img> elements on top of canvas.
  // The browser animates GIFs natively inside <img> tags.
  // We keep a map of objectId → HTMLImageElement and update position/size each frame.
  private gifOverlayImgs: Map<string, HTMLImageElement> = new Map();

  private updateGifOverlay() {
    if (!this.canvas) return;
    const overlay = this.canvas.parentElement?.querySelector('#wm-gif-overlay') as HTMLElement;
    if (!overlay) return;

    const canvasRect = this.canvas.getBoundingClientRect();
    const activeIds = new Set<string>();

    for (const o of this.objects) {
      if (o.isVisible === false) continue;

      // Determine if this object has a GIF asset
      let gifUrl = '';
      if (o.type === 'player' || o.type === 'morph') {
        const charData = o.charData || {};
        const dir = charData._currentDir || 'down';
        const isMoving = charData._isMoving || false;
        const preferredAction = charData._forceAction || (isMoving ? 'move' : 'idle');
        const allDirs = [dir, 'down', 'right', 'left', 'up'];
        const allActions = [preferredAction, preferredAction === 'move' ? 'idle' : 'move', 'idle', 'move', 'extra1', 'extra2'];
        for (const a of allActions) {
          for (const d of allDirs) {
            const r = charData[a]?.[d];
            if (r && (r.isGif === true || r.animType === 'gif') && (r.gifUrl || r.asset)) {
              gifUrl = r.gifUrl || r.asset;
              break;
            }
          }
          if (gifUrl) break;
        }
        // fallback: assetUrl is a gif
        if (!gifUrl && o.assetUrl?.toLowerCase().endsWith('.gif')) gifUrl = o.assetUrl;
      } else {
        // plain asset object
        const url = o.assetUrl || o.url || '';
        if (url.toLowerCase().endsWith('.gif')) gifUrl = url;
      }

      if (!gifUrl) continue;

      activeIds.add(o.id);

      // Get or create img element, checking it's still in the overlay
      const overlay = this.canvas.parentElement?.querySelector('#wm-gif-overlay') as HTMLElement;
      if (!overlay) continue;

      let img = this.gifOverlayImgs.get(o.id);
      if (!img || !img.isConnected || !overlay.contains(img)) {
        // Detached or missing — create fresh
        if (img) img.remove();
        img = document.createElement('img');
        img.style.cssText = 'position:absolute;pointer-events:none;image-rendering:pixelated;';
        img.dataset.objId = o.id;  // used by preview to match/lookup
        img.src = gifUrl;
        overlay.appendChild(img);
        this.gifOverlayImgs.set(o.id, img);
      }

      // Update src only if the logical URL actually changed
      if (img.dataset.gifSrc !== gifUrl) {
        img.dataset.gifSrc = gifUrl;
        img.src = gifUrl;
      }

      // PERFORMANCE: Use transform instead of left/top to avoid layout thrashing
      const wt = (this.renderPipeline as any)._transformCache?.get(o.id) || { 
        x: o.x, y: o.y, w: o.w || 100, h: o.h || 100, rotation: o.rotation || 0, 
        scaleX: o.scaleX || 1, scaleY: o.scaleY || 1, opacity: o.opacity ?? 1
      };

      const screenX = wt.x * this.zoom + this.panX;
      const screenY = wt.y * this.zoom + this.panY;
      const screenW = wt.w * this.zoom * Math.abs(wt.scaleX);
      const screenH = wt.h * this.zoom * Math.abs(wt.scaleY);

      // Center pivot adjustment for the overlay img to match canvas rotation
      const pivotX = (o.pivotX !== undefined && o.pivotX !== null) ? o.pivotX : 0.5;
      const pivotY = (o.pivotY !== undefined && o.pivotY !== null) ? o.pivotY : 0.5;

      const centerX = screenX + (wt.w * this.zoom * pivotX);
      const centerY = screenY + (wt.h * this.zoom * pivotY);

      img.style.width = `${wt.w * this.zoom}px`;
      img.style.height = `${wt.h * this.zoom}px`;
      
      // CSS flips using scale(-1, 1). We apply standard math top-left.
      img.style.transformOrigin = `0% 0%`;
      
      const flipX = wt.scaleX < 0 ? -1 : 1;
      const flipY = wt.scaleY < 0 ? -1 : 1;
      
      img.style.transform = `
         translate(${centerX}px, ${centerY}px)
         rotate(${wt.rotation}deg)
         scale(${flipX}, ${flipY})
         translate(${-wt.w * this.zoom * pivotX}px, ${-wt.h * this.zoom * pivotY}px)
      `;
      img.style.opacity = String(wt.opacity);

      // Visibility: hide if out of timeline
      const inPt = o.inPoint ?? 0;
      const outPt = o.outPoint ?? (inPt + (o.duration || 999));
      const ct = this.state.currentTime || 0;
      const visible = ((ct >= inPt && ct <= outPt) || o.isPersistent) && o.isVisible !== false;
      img.style.display = visible ? 'block' : 'none';
    }

    // Remove imgs for objects that no longer exist or have no GIF
    for (const [id, img] of this.gifOverlayImgs.entries()) {
      if (!activeIds.has(id)) {
        img.remove();
        this.gifOverlayImgs.delete(id);
      }
    }
  }

  private updatePlayerPhysics() {
    const player = this.playerObjectId ? this.objects.find(o => o.id === this.playerObjectId) : null;
    if (player && this.joystickActive) {
      const dx = this.joystickX * (player.charData?.moveSpeed || 3);
      const dy = this.joystickY * (player.charData?.moveSpeed || 3);
      const newX = player.x + dx;
      const newY = player.y + dy;
      const collisionResult = this.collisionEngine.resolveCollision(player, newX, newY);
      const finalX = collisionResult.x;
      const finalY = collisionResult.y;
      if (player.restrictToWalkable) {
        const walkableCheck = this.collisionEngine.checkWalkableZone(finalX, finalY, player.w, player.h);
        if (walkableCheck.allowed) {
          player.x = finalX;
          player.y = finalY;
        }
      } else {
        player.x = finalX;
        player.y = finalY;
      }

      // Move camera based on trackingMode when running (not in edit mode)
      const camera = this.objects.find((o: any) => o.type === 'camera' && o.trackingMode === 'follow_player');
      if (camera) {
        camera.x = player.x + player.w / 2 - camera.w / 2;
        camera.y = player.y + player.h / 2 - camera.h / 2;
        this.panX = this.canvas.width / 2 - (camera.x + camera.w / 2) * this.zoom;
        this.panY = this.canvas.height / 2 - (camera.y + camera.h / 2) * this.zoom;
        this.renderPipeline.setPan(this.panX, this.panY);
      }
      this.sensorEngine.checkTriggers(player);
    }
  }

  private saveUndoState() {
    this.undoStack.push(JSON.parse(JSON.stringify(this.objects)));
    if (this.undoStack.length > 50) this.undoStack.shift();
    this.redoStack = [];
  }

  public duplicateObject(id: string) {
    const obj = this.objects.find(o => o.id === id);
    if (!obj) return;
    this.saveUndoState();
    const clone = JSON.parse(JSON.stringify(obj));
    clone.id = obj.type + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
    clone.x += 20; clone.y += 20;
    this.objects.push(clone);
    this.selectedId = clone.id;
    this.state.selectedId = clone.id;
    this.state.selectedIds = [clone.id];
    this.draw();
    this.callbacks.reRender();
  }

  public updatePanForPlayer(playerX: number, playerY: number) {
    if (!this.canvas) return;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const playerCenterX = playerX;
    const playerCenterY = playerY;
    this.panX = cw / 2 - playerCenterX * this.zoom;
    this.panY = ch / 2 - playerCenterY * this.zoom;
    this.state._mapPanX = this.panX;
    this.state._mapPanY = this.panY;
    this.renderPipeline.setPan(this.panX, this.panY);
    this.draw();
  }

  private centerCameraOnPlayer() {
    if (!this.canvas || !this.playerObjectId) return;
    const player = this.objects.find((o: any) => o.id === this.playerObjectId);
    if (!player) return;
    
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const playerCenterX = player.x + player.w / 2;
    const playerCenterY = player.y + player.h / 2;
    
    // pan centers player on screen at current zoom
    this.panX = cw / 2 - playerCenterX * this.zoom;
    this.panY = ch / 2 - playerCenterY * this.zoom;
  }

  private applyCameraZoom() {
    // Apply camera zoom - changes view distance (how much world is visible)
    // Does NOT change the camera frame overlay size
    if (!this.canvas) return;
    const cameraZoom = this.state.cameraZoom || 1;
    
    // Camera2DOverlay stays at 360x720 fixed size
    // But we adjust world zoom to see more/less area
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const frameW = 360;
    const frameH = 720;
    
    // Higher cameraZoom = see more area (smaller objects on screen)
    // Lower cameraZoom = see less area (larger objects on screen)
    const baseZoomX = cw / frameW;
    const baseZoomY = ch / frameH;
    const baseZoom = Math.min(baseZoomX, baseZoomY) * 0.85;
    
    // cameraZoom multiplies the base zoom
    this.zoom = baseZoom * cameraZoom;
    
    this.centerCameraOnPlayer();
    this.draw();
  }

  private fitCameraFrame() {
    if (!this.canvas) return;
    const camera = this.objects.find((o: any) => o.type === 'camera' && o._followsPlayer);
    if (!camera) return;
    
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const cameraZoom = this.state.cameraZoom || 1;
    const frameW = camera.w * cameraZoom;
    const frameH = camera.h * cameraZoom;
    
    const zoomX = cw / frameW;
    const zoomY = ch / frameH;
    const targetZoom = Math.min(zoomX, zoomY) * 0.85;
    
    this.zoom = Math.max(0.1, Math.min(5, targetZoom));
    this.centerCameraOnPlayer();
    this.draw();
  }

  private showSpawnConfirmPopup(wx: number, wy: number): void {
    const existing = document.getElementById('spawn-confirm-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'spawn-confirm-popup';
    popup.style.cssText = `
      position:fixed; bottom:30px; left:50%; transform:translateX(-50%);
      background:rgba(13,13,18,0.98); border:1px solid rgba(76,255,136,0.4);
      border-radius:16px; padding:20px 24px; z-index:10000;
      font-family:'Outfit',sans-serif; min-width:380px;
      box-shadow:0 8px 40px rgba(0,0,0,0.8); backdrop-filter:blur(10px);
    `;
    
    const phasePresets = this.state.phasePresets || [];
    const existingPhases = phasePresets.length > 0;

    popup.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
        <div style="width:40px; height:40px; background:rgba(76,255,136,0.15); border-radius:10px; display:flex; align-items:center; justify-content:center;">
          <span style="font-size:1.2rem;">🎮</span>
        </div>
        <div>
          <div style="font-size:14px; font-weight:900; color:#4cff88; letter-spacing:1px;">CONFIGURAR PLAYER</div>
          <div style="font-size:10px; color:#666; margin-top:2px;">Ponto de spawn: (${Math.round(wx)}, ${Math.round(wy)})</div>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <div style="font-size:10px; color:#888; margin-bottom:8px; font-weight:900; letter-spacing:1px;">VELOCIDADE DE MOVIMENTO</div>
        <input type="range" id="player-move-speed" min="1" max="20" value="3" style="width:100%; accent-color:#4cff88;">
        <div style="display:flex; justify-content:space-between; font-size:9px; color:#444; margin-top:4px;">
          <span>Lento</span>
          <span id="speed-value" style="color:#4cff88; font-weight:900;">3</span>
          <span>Rápido</span>
        </div>
      </div>

      <div style="display:flex; gap:8px; margin-bottom:12px;">
        <label style="flex:1; display:flex; align-items:center; gap:8px; padding:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; cursor:pointer;">
          <input type="checkbox" id="player-can-jump" style="accent-color:#4cff88;">
          <span style="font-size:10px; color:#aaa;">Pode Pular</span>
        </label>
        <label style="flex:1; display:flex; align-items:center; gap:8px; padding:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; cursor:pointer;">
          <input type="checkbox" id="player-invincible" style="accent-color:#ffd700;">
          <span style="font-size:10px; color:#aaa;">Invencível</span>
        </label>
      </div>

      <div style="font-size:10px; color:#888; margin-bottom:8px; font-weight:900; letter-spacing:1px;">MODO DE CÂMERA</div>
      <div style="display:flex; gap:6px; margin-bottom:16px;">
        <button class="cam-mode-btn selected" data-mode="portrait" style="
          flex:1; padding:8px; border-radius:6px; border:1px solid #51c5ff; background:rgba(81,197,255,0.15); color:#51c5ff;
          font-size:9px; font-weight:900; cursor:pointer;
        ">📱 RETRATO</button>
        <button class="cam-mode-btn" data-mode="landscape" style="
          flex:1; padding:8px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#666;
          font-size:9px; font-weight:900; cursor:pointer;
        ">🖥️ PAISAGEM</button>
      </div>

      <div style="display:flex; gap:8px; border-top:1px solid rgba(255,255,255,0.08); padding-top:16px;">
        <button id="spawn-dismiss" style="
          flex:1; padding:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
          border-radius:8px; color:#888; font-size:10px; font-weight:900; cursor:pointer;
        ">CANCELAR</button>
        ${existingPhases ? `
          <button id="spawn-update-phase" style="
            flex:1; padding:12px; background:rgba(255,215,0,0.15); border:1px solid rgba(255,215,0,0.3);
            border-radius:8px; color:#ffd700; font-size:10px; font-weight:900; cursor:pointer;
          ">🔄 ATUALIZAR</button>
        ` : ''}
        <button id="spawn-save-phase" style="
          flex:1; padding:12px; background:rgba(76,255,136,0.15); border:1px solid rgba(76,255,136,0.3);
          border-radius:8px; color:#4cff88; font-size:10px; font-weight:900; cursor:pointer;
        ">💾 CRIAR FASE</button>
      </div>
    `;
    document.body.appendChild(popup);

    const speedInput = popup.querySelector('#player-move-speed') as HTMLInputElement;
    const speedValue = popup.querySelector('#speed-value') as HTMLElement;
    speedInput?.addEventListener('input', () => {
      speedValue.textContent = speedInput.value;
    });

    let selectedCamMode = 'portrait';
    popup.querySelectorAll('.cam-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        popup.querySelectorAll('.cam-mode-btn').forEach((b: any) => {
          b.style.borderColor = 'rgba(255,255,255,0.1)';
          b.style.background = 'transparent';
          b.style.color = '#666';
        });
        (btn as HTMLElement).style.borderColor = '#51c5ff';
        (btn as HTMLElement).style.background = 'rgba(81,197,255,0.15)';
        (btn as HTMLElement).style.color = '#51c5ff';
        selectedCamMode = (btn as HTMLElement).dataset.mode || 'portrait';
      });
    });

    popup.querySelector('#spawn-dismiss')?.addEventListener('click', () => popup.remove());

    popup.querySelector('#spawn-save-phase')?.addEventListener('click', () => {
      const moveSpeed = parseInt(speedInput.value);
      const canJump = (popup.querySelector('#player-can-jump') as HTMLInputElement).checked;
      const invincible = (popup.querySelector('#player-invincible') as HTMLInputElement).checked;
      
      this.updatePlayerSettings(moveSpeed, canJump, invincible);
      this.showSavePhaseDialog(wx, wy, selectedCamMode);
      popup.remove();
    });

    popup.querySelector('#spawn-update-phase')?.addEventListener('click', () => {
      const moveSpeed = parseInt(speedInput.value);
      const canJump = (popup.querySelector('#player-can-jump') as HTMLInputElement).checked;
      const invincible = (popup.querySelector('#player-invincible') as HTMLInputElement).checked;
      
      this.updatePlayerSettings(moveSpeed, canJump, invincible);
      this.state.cameraMode = selectedCamMode;
      this.centerCameraOnPlayer();
      this.draw();
      this.callbacks.reRender();
      popup.remove();
      
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;top:20px;right:20px;background:rgba(255,215,0,0.15);border:1px solid rgba(255,215,0,0.3);border-radius:8px;padding:12px 16px;z-index:100000;color:#ffd700;font-family:Outfit,sans-serif;font-size:11px;font-weight:900;';
      toast.textContent = '⚙️ Configurações do Player atualizadas!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    });
  }

  private updatePlayerSettings(moveSpeed: number, canJump: boolean, invincible: boolean): void {
    const player = this.objects.find(o => o.type === 'player');
    if (player) {
      if (!player.charData) player.charData = {};
      player.charData.moveSpeed = moveSpeed;
      player.charData.canJump = canJump;
      player.charData.invincible = invincible;
    }
  }

  private showSavePhaseDialog(wx: number, wy: number, camMode: string = 'portrait'): void {
    this.state.cameraMode = camMode;
    const existing = document.getElementById('save-phase-dialog');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.id = 'save-phase-dialog';
    dialog.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a22;border:1px solid #333;border-radius:10px;padding:20px;z-index:100000;color:#ccc;font-family:Inter,sans-serif;min-width:350px;box-shadow:0 8px 32px rgba(0,0,0,0.6);';
    dialog.innerHTML = `
      <div style="font-size:14px;font-weight:700;margin-bottom:12px;color:#51c5ff;">💾 Salvar Fase</div>
      <div style="margin-bottom:12px;">
        <label style="font-size:10px;color:#888;display:block;margin-bottom:4px;">Nome da Fase</label>
        <input id="save-phase-name" type="text" placeholder="Ex: Floresta Inicial" style="width:100%;background:#0d0d15;border:1px solid #2a2a34;border-radius:4px;color:#fff;font-size:11px;padding:8px;outline:none;box-sizing:border-box;">
      </div>
      <div style="font-size:9px;color:#666;margin-bottom:12px;">
        Player Spawn: (${Math.round(wx)}, ${Math.round(wy)})<br>
        Objetos no mapa: ${this.objects.length}<br>
        Colisões: ${this.objects.filter((o: any) => o.type === 'collision').length} | Sensores: ${this.objects.filter((o: any) => o.type === 'area_sensor').length}
      </div>
      <div style="display:flex;gap:6px;">
        <button id="save-phase-cancel" style="flex:1;padding:6px 8px;background:#222;border:1px solid #333;border-radius:4px;color:#888;cursor:pointer;font-size:9px;font-weight:700;">Cancelar</button>
        <button id="save-phase-confirm" style="flex:1;padding:6px 8px;background:rgba(76,255,136,0.15);border:1px solid rgba(76,255,136,0.3);border-radius:4px;color:#4cff88;cursor:pointer;font-size:9px;font-weight:700;">Salvar Fase</button>
      </div>
    `;
    document.body.appendChild(dialog);

    const nameInput = dialog.querySelector('#save-phase-name') as HTMLInputElement;
    nameInput?.focus();

    dialog.querySelector('#save-phase-cancel')?.addEventListener('click', () => dialog.remove());

    dialog.querySelector('#save-phase-confirm')?.addEventListener('click', () => {
      const name = nameInput?.value?.trim() || `Fase ${(this.state.phasePresets || []).length + 1}`;
      this.savePhase(name, wx, wy);
      dialog.remove();
    });

    nameInput?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const name = nameInput.value.trim() || `Fase ${(this.state.phasePresets || []).length + 1}`;
        this.savePhase(name, wx, wy);
        dialog.remove();
      }
    });
  }

  private savePhase(name: string, wx: number, wy: number): void {
    const objects = this.state.worldMapObjects || [];
    const frameW = 200;
    const frameH = 333;
    const currentCameraZoom = this.state.cameraZoom || parseFloat(localStorage.getItem('wm_cameraZoom') || '2.5');

    // Remove any existing players and cameras to avoid duplicates
    const existingPlayers = objects.filter((o: any) => o.type === 'player');
    const existingCameras = objects.filter((o: any) => o.type === 'camera');
    for (const p of existingPlayers) {
      objects.splice(objects.indexOf(p), 1);
    }
    for (const c of existingCameras) {
      objects.splice(objects.indexOf(c), 1);
    }

    // Store phase info in state (not as canvas object)
    const phaseId = 'phase_' + Date.now();
    const phaseData = {
      id: phaseId,
      name,
      spawnFrame: { x: wx - frameW / 2, y: wy - frameH / 2, w: frameW, h: frameH, mode: 'portrait' },
      playerPos: { x: wx, y: wy },
      cameraZoom: currentCameraZoom
    };
    this.state.currentPhase = phaseData;

    // Create spawn group (persistent layer group)
    const groupId = 'spawn_group_' + Date.now();
    objects.push({
      id: groupId,
      type: 'group',
      label: 'Spawn - ' + name,
      _isGroup: true,
      x: wx - frameW / 2, y: wy - frameH / 2, w: frameW, h: frameH,
      isVisible: true, opacity: 1,
      isPersistent: true, artboardId: 'default',
      inPoint: 0, outPoint: 5,
      parentId: phaseId
    });

    // Create camera viewport frame (visible on canvas, linked to player)
    const cameraId = 'camera_' + Date.now();
    objects.push({
      id: cameraId,
      type: 'camera',
      label: 'Camera Viewport',
      x: wx - frameW / 2, y: wy - frameH / 2, w: frameW, h: frameH,
      isVisible: true, opacity: 0.15,
      isPersistent: true, artboardId: 'default',
      inPoint: 0, outPoint: 5,
      parentId: groupId,
      cameraMode: 'portrait',
      _followsPlayer: true
    });

    // Create player at spawn position - THIS is the ONLY player the joystick controls
    let player = objects.find((o: any) => o.type === 'player');
    if (player) {
      player.x = wx - 10;
      player.y = wy - 10;
      player.parentId = groupId;
      this.playerObjectId = player.id;
    } else {
      const playerId = 'player_' + Date.now();
      this.playerObjectId = playerId;
      objects.push({
        id: playerId,
        type: 'player',
        label: 'Player',
        x: wx - 10, y: wy - 10, w: 20, h: 20,
        isVisible: true, opacity: 1, isLocked: false,
        isPersistent: true, artboardId: 'default',
        inPoint: 0, outPoint: 5,
        parentId: groupId,
        charData: { moveSpeed: 3 }
      });
    }

    // Phase preset for saving
    const phasePreset = {
      id: phaseId,
      name,
      spawnFrame: { x: wx - frameW / 2, y: wy - frameH / 2, w: frameW, h: frameH, mode: 'portrait' },
      playerPos: { x: wx, y: wy },
      cameraZoom: currentCameraZoom,
      objects: JSON.parse(JSON.stringify(objects)),
      collisions: objects.filter((o: any) => o.type === 'collision'),
      sensors: objects.filter((o: any) => o.type === 'area_sensor'),
      events: objects.filter((o: any) => o.area_sensorEvents).map((o: any) => ({ sourceId: o.id, events: o.area_sensorEvents })),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (!this.state.phasePresets) this.state.phasePresets = [];
    this.state.phasePresets.push({
      id: phasePreset.id,
      name: phasePreset.name,
      spawnFrame: phasePreset.spawnFrame,
      playerPos: phasePreset.playerPos,
      cameraZoom: phasePreset.cameraZoom,
      objects: phasePreset.objects.length,
      createdAt: phasePreset.createdAt
    });

    try {
      const saved = localStorage.getItem('forge_phase_presets') || '[]';
      const presets = JSON.parse(saved);
      presets.push(phasePreset);
      localStorage.setItem('forge_phase_presets', JSON.stringify(presets));
    } catch {}

    // Update state
    this.state.worldMapObjects = objects;
    this.objects = objects; // Sync local array to prevent static clones
    this.state.selectedIds = [playerId];
    this.state.selectedId = playerId;
    this.state.expandedLayerIds = [phaseId, groupId];
    this.state.isCameraActive = true;
    this.state.cameraMode = 'portrait';
    this.state.cameraZoom = phasePreset.cameraZoom || this.state.cameraZoom;

    // Center camera on player and fit frame
    this.fitCameraFrame();

    // Activate player preview
    this.state._playerPreviewActive = true;

    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20px;right:20px;background:rgba(76,255,136,0.15);border:1px solid rgba(76,255,136,0.3);border-radius:8px;padding:12px 16px;z-index:100000;color:#4cff88;font-family:Inter,sans-serif;font-size:11px;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
    toast.textContent = `✓ Fase "${name}" salva! Camera + Player vinculados.`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);

    document.dispatchEvent(new CustomEvent('phase-spawn-saved', { detail: phasePreset }));
    this.draw();
    this.callbacks.reRender();
  }

  private savePhaseDirect(name: string, wx: number, wy: number): void {
    // Direct save (overwrite existing phase)
    const objects = this.state.worldMapObjects || [];
    const currentPhaseId = this.state.currentPhaseId;
    
    // Get camera zoom
    const frameW = 200;
    const frameH = 333;
    const currentCameraZoom = this.state.cameraZoom || parseFloat(localStorage.getItem('wm_cameraZoom') || '2.5');
    
    // Get bg color from state or localStorage
    const bgColor = this.state.bgColor || localStorage.getItem('wm_bgColor') || '#08080c';
    
    // Build phase preset
    const phaseId = currentPhaseId || 'phase_' + Date.now();
    const phasePreset = {
      id: phaseId,
      name: name,
      spawnFrame: { x: wx - frameW / 2, y: wy - frameH / 2, w: frameW, h: frameH, mode: this.state.cameraMode || 'portrait' },
      playerPos: { x: wx, y: wy },
      cameraZoom: currentCameraZoom,
      bgColor: bgColor,
      objects: JSON.parse(JSON.stringify(objects)),
      collisions: objects.filter((o: any) => o.type === 'collision'),
      sensors: objects.filter((o: any) => o.type === 'area_sensor'),
      events: objects.filter((o: any) => o.area_sensorEvents).map((o: any) => ({ sourceId: o.id, events: o.area_sensorEvents })),
      createdAt: currentPhaseId ? (this.state.currentPhaseCreatedAt || Date.now()) : Date.now(),
      updatedAt: Date.now()
    };
    
    // Update or add phase preset
    try {
      const saved = localStorage.getItem('forge_phase_presets') || '[]';
      let presets = JSON.parse(saved);
      
      if (currentPhaseId) {
        // Update existing phase
        const idx = presets.findIndex((p: any) => p.id === currentPhaseId);
        if (idx >= 0) {
          presets[idx] = phasePreset;
        } else {
          presets.push(phasePreset);
        }
      } else {
        // Add new phase
        presets.push(phasePreset);
      }
      
      localStorage.setItem('forge_phase_presets', JSON.stringify(presets));
    } catch {}
    
    // Update state
    this.state.currentPhaseName = name;
    this.state.currentPhaseId = phaseId;
    this.state.currentPhaseCreatedAt = phasePreset.createdAt;
    
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20px;right:20px;background:rgba(255,215,0,0.15);border:1px solid rgba(255,215,0,0.3);border-radius:8px;padding:12px 16px;z-index:100000;color:#ffd700;font-family:Inter,sans-serif;font-size:11px;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
    toast.textContent = `✓ Fase "${name}" salva com sucesso!`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
    
    this.draw();
    this.callbacks.reRender();
  }

  // startPlayerAnimation was merged into startAnimationLoop -> updatePlayerPhysics

  private handleInteract() {
    const player = this.objects.find(o => o.id === this.playerObjectId);
    if (!player) return;

    // 1. Play "Interaction" Animation (extra1)
    if (!player.charData) player.charData = {};
    const oldAction = player.charData._forceAction;
    player.charData._forceAction = 'extra1';
    
    // Auto-reset after a short duration
    setTimeout(() => {
        player.charData._forceAction = oldAction || null;
        this.draw();
    }, 600);

    // 2. Trigger sensors
    this.sensorEngine.checkInteractTriggers(player);
    
    this.draw();
  }

  public loadPhaseById(phaseId: string): void {
    try {
      const saved = localStorage.getItem('forge_phase_presets') || '[]';
      const presets = JSON.parse(saved);
      const phase = presets.find((p: any) => p.id === phaseId);
      if (!phase) return;
      
      if (phase.objects) {
        this.objects = JSON.parse(JSON.stringify(phase.objects));
        this.state.worldMapObjects = this.objects;
      }
      if (phase.cameraZoom) {
        this.state.cameraZoom = phase.cameraZoom;
      }
      if (phase.bgColor) {
        this.state.bgColor = phase.bgColor;
      }
      
      // Track current phase name for saving
      this.state.currentPhaseName = phase.name;
      this.state.currentPhaseId = phase.id;
      
      // Update map dimensions if phase has them
      if (phase.spawnFrame) {
        // Could optionally update mapWidth/mapHeight here if needed
      }
      
      // Update toolbar inputs to reflect loaded phase
      setTimeout(() => {
        const wmToolbar = document.querySelector('.wm-fases-menu');
        if (wmToolbar) {
          const widthInput = wmToolbar.querySelector('.wm-map-width') as HTMLInputElement;
          const heightInput = wmToolbar.querySelector('.wm-map-height') as HTMLInputElement;
          const bgColorInput = wmToolbar.querySelector('.wm-bg-color') as HTMLInputElement;
          const bgColorHex = wmToolbar.querySelector('.wm-bg-color-hex') as HTMLInputElement;
          
          if (widthInput) widthInput.value = String(this.state.mapWidth || 4000);
          if (heightInput) heightInput.value = String(this.state.mapHeight || 2250);
          if (bgColorInput && this.state.bgColor) {
            bgColorInput.value = this.state.bgColor;
            if (bgColorHex) bgColorHex.value = this.state.bgColor;
          }
        }
      }, 100);
      
      this.fitCameraFrame();
      this.draw();
      this.callbacks.reRender();
    } catch (e) {
      console.error('Failed to load phase:', e);
    }
  }

  private stampStampAt(wx: number, wy: number) {
    const sb = this.stampBrush;
    if (!sb.stampUrl) return;
    const sizeVariation = sb.randomSize > 0 ? (Math.random() - 0.5) * 2 * (sb.randomSize / 100) * sb.size : 0;
    const size = sb.size + sizeVariation;
    const rotation = sb.randomRotation > 0 ? (Math.random() - 0.5) * 2 * sb.randomRotation : 0;
    const scaleX = sb.randomMirrorX && Math.random() > 0.5 ? -1 : 1;
    const scaleY = sb.randomMirrorY && Math.random() > 0.5 ? -1 : 1;
    let stampLayer = this.objects.find((o: any) => o.type === 'stamp_layer');
    if (!stampLayer) {
      stampLayer = {
        id: 'stamp_layer_' + Date.now(), type: 'stamp_layer', label: 'Camada de Carimbos',
        x: 0, y: 0, w: 1, h: 1, isVisible: true, opacity: 1,
        artboardId: 'default', isPersistent: true, _stamps: []
      };
      const playerIdx = this.objects.findIndex((o: any) => o.type === 'player');
      if (playerIdx >= 0) this.objects.splice(playerIdx, 0, stampLayer);
      else this.objects.push(stampLayer);
    }
    if (!stampLayer._stamps) stampLayer._stamps = [];
    stampLayer._stamps.push({ x: wx, y: wy, size, rotation, scaleX, scaleY, url: sb.stampUrl });
  }

  private toWorldX(sx: number) { return (sx - this.panX) / this.zoom; }
  private toWorldY(sy: number) { return (sy - this.panY) / this.zoom; }

  private objectAt(wx: number, wy: number) {
    // First try to find a regular object
    const hit = this.objects.filter((o: any) => {
      if (o.isVisible === false) return false;
      if (o.type === 'group' || o._isGroup) return false;
      return true;
    }).slice().reverse().find((o: any) => {
      const left = Math.min(o.x, o.x + o.w); const right = Math.max(o.x, o.x + o.w);
      const top = Math.min(o.y, o.y + o.h); const bottom = Math.max(o.y, o.y + o.h);
      return wx >= left && wx <= right && wy >= top && wy <= bottom;
    });
    
    if (hit) return hit;
    
    // If no object hit, check if we clicked on a group container
    return this.objects.filter((o: any) => {
      if (o.isVisible === false) return false;
      if (o.type !== 'group' && !o._isGroup) return false;
      return true;
    }).slice().reverse().find((o: any) => {
      const left = Math.min(o.x, o.x + o.w); const right = Math.max(o.x, o.x + o.w);
      const top = Math.min(o.y, o.y + o.h); const bottom = Math.max(o.y, o.y + o.h);
      return wx >= left && wx <= right && wy >= top && wy <= bottom;
    }) || null;
  }

  private getHandleAt(wx: number, wy: number, o: any) {
    const hs = (this.handleSize + 4) / this.zoom;
    if (Math.abs(wx - o.x) < hs && Math.abs(wy - o.y) < hs) return 'nw';
    if (Math.abs(wx - (o.x+o.w)) < hs && Math.abs(wy - o.y) < hs) return 'ne';
    if (Math.abs(wx - o.x) < hs && Math.abs(wy - (o.y+o.h)) < hs) return 'sw';
    if (Math.abs(wx - (o.x+o.w)) < hs && Math.abs(wy - (o.y+o.h)) < hs) return 'se';
    return null;
  }

  private resizeObject(obj: any, wx: number, wy: number) {
    if (!this.resizeHandle) return;
    const h = this.resizeHandle;
    
    // Store old bounds for hierarchy adjustment
    const oldX = obj.x;
    const oldY = obj.y;
    const oldW = obj.w;
    const oldH = obj.h;
    
    // Apply resize
    if (h.includes('e')) obj.w = wx - obj.x;
    if (h.includes('s')) obj.h = wy - obj.y;
    if (h.includes('w')) { const d = wx - obj.x; obj.x = wx; obj.w -= d; }
    if (h.includes('n')) { const d = wy - obj.y; obj.y = wy; obj.h -= d; }
    
    // Ensure minimum size
    obj.w = Math.max(1, obj.w || 1);
    obj.h = Math.max(1, obj.h || 1);
    
    // Calculate scale factors
    const scaleX = oldW > 0 ? obj.w / oldW : 1;
    const scaleY = oldH > 0 ? obj.h / oldH : 1;
    
    // Apply scale to all descendants (parentId hierarchy) - para linked objects
    const descendants = this.getDescendants(obj.id);
    for (const descId of descendants) {
      const desc = this.objects.find((o: any) => o.id === descId);
      if (desc) {
        // Usar a mesma lógica de applyTransformToHierarchy
        desc.x = oldX + (desc.x - oldX) * scaleX;
        desc.y = oldY + (desc.y - oldY) * scaleY;
        if (desc.w) desc.w = Math.max(1, desc.w * scaleX);
        if (desc.h) desc.h = Math.max(1, desc.h * scaleY);
      }
    }
  }

  private syncVectorBounds(o: any) {
    const pts = o.points;
    if (!pts || pts.length === 0) return;
    const minX = Math.min(...pts.map((p:any) => p.x));
    const minY = Math.min(...pts.map((p:any) => p.y));
    const maxX = Math.max(...pts.map((p:any) => p.x));
    const maxY = Math.max(...pts.map((p:any) => p.y));
    o.x = minX; o.y = minY;
    o.w = Math.max(2, maxX - minX); o.h = Math.max(2, maxY - minY);
  }

  private _pointToSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1; const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  private updateCursor(viewport: HTMLElement) {
    const cursors: any = { select: 'default', move: 'grab', pan: 'grab', brush: 'crosshair', delete: 'not-allowed', camera: 'default', vector_pen: 'crosshair' };
    viewport.style.cursor = cursors[this.toolbar.activeTool] || 'default';
  }

  private onMouseDown(e: MouseEvent) {
    if (!this.canvas) return;
    
    // IGNORAR CLIQUES QUE NÃO SÃO NO CANVAS
    if (e.target !== this.canvas) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const wx = this.toWorldX(e.clientX - rect.left);
    const wy = this.toWorldY(e.clientY - rect.top);
    
    // Handle camera overlay click
    const camera = this.objects.find((o: any) => o.type === 'camera');
    if (camera && this.cameraOverlay) {
      const clickResult = this.cameraOverlay.handleClick(e.clientX - rect.left, e.clientY - rect.top, camera, this.zoom, this.panX, this.panY);
      if (clickResult) {
        if (clickResult.startsWith('trackingMode:')) {
          const mode = clickResult.split(':')[1];
          camera.trackingMode = mode;
          this.draw();
          return;
        }
        if (clickResult.startsWith('cameraMode:')) {
          const mode = clickResult.split(':')[1];
          camera.cameraMode = mode;
          this.draw();
          return;
        }
        if (clickResult.startsWith('zoom:')) {
          const action = clickResult.split(':')[1];
          const currentZoom = camera.cameraZoom || 1;
          if (action === 'increase') {
            camera.cameraZoom = Math.min(currentZoom + 0.5, 5);
          } else if (action === 'decrease') {
            camera.cameraZoom = Math.max(currentZoom - 0.5, 0.5);
          }
          this.draw();
          return;
        }
      }
    }
    
    const chunkSize = this.state.mapChunkSize || 500;
    const chunkCol = Math.floor(wx / chunkSize);
    const chunkRow = Math.floor(wy / chunkSize);
    const chunkLabel = String.fromCharCode(65 + chunkCol) + (chunkRow + 1);
    
    document.dispatchEvent(new CustomEvent('worldmap-chunk-clicked', { detail: { chunkLabel, x: wx, y: wy } }));
    
    if (e.button === 1 || e.button === 2) { this.isPanning = true; return; }
    // Alt+Click duplication (hardware clonable dragging)
    if (e.altKey && hit && !this.isDragging) {
      this.duplicateObject(hit.id);
      this.isDragging = true;
      this.dragStartX = wx;
      this.dragStartY = wy;
      this.selectedId = this.objects[this.objects.length - 1].id;
      this.state.selectedId = this.selectedId;
      this.state.selectedIds = [this.selectedId];
      return;
    }

    if (this.selectedId) {
      const obj = this.objects.find(o => o.id === this.selectedId);
      if (obj && obj.isLocked !== true) {
        const handle = this.getHandleAt(wx, wy, obj);
        if (handle) { this.isResizing = true; this.resizeHandle = handle; return; }
      }
    }
    const hit = this.objectAt(wx, wy);
    const toolId = this.toolbar.activeTool as string;

    if (toolId === 'eraser' && hit) {
      this.deleteObject(hit.id);
      this.draw(); this.callbacks.reRender(); return;
    }
    if (toolId === 'vector_pen' || (toolId === 'light' && this.toolbar.activeSubTool === 'vector')) {
      const sub = this.toolbar.activeSubTool || 'collision';
      const isCollision = sub === 'collision';
      const objType = isCollision ? 'collision' : 'area_sensor';
      const color = isCollision ? '#ff4444' : '#44ccff';
      if (this.currentShapeObject && this.currentShapeObject._vectorType === sub) {
        const pts = this.currentShapeObject.points;
        if (pts && pts.length >= 2) {
          const firstPt = pts[0];
          const distFirst = Math.hypot(wx - firstPt.x, wy - firstPt.y);
          if (distFirst < 30 / this.zoom && pts.length >= 3 && !this.currentShapeObject.isClosed) {
            this.currentShapeObject.isClosed = true;
            if (this.currentShapeObject.type !== 'light') {
              this.currentShapeObject.type = objType;
              this.currentShapeObject.color = color;
              this.currentShapeObject.collisionMode = isCollision ? 'total' : undefined;
              this.currentShapeObject.navType = !isCollision ? 'walkable' : undefined;
              this.currentShapeObject.sensorTrigger = !isCollision ? 'onEnter' : undefined;
              this.currentShapeObject.sensorRadius = !isCollision ? 100 : undefined;
            }
            this.currentShapeObject.isPersistent = true;
            this.currentShapeObject = null;
            this._editingNode = null;
            this.draw(); this.callbacks.reRender(); return;
          }
          for (let i = 0; i < pts.length; i++) {
            const dist = Math.hypot(wx - pts[i].x, wy - pts[i].y);
            if (dist < 12 / this.zoom) { this._editingNode = i; this.draw(); return; }
          }
          for (let i = 0; i < pts.length - 1; i++) {
            const dist = this._pointToSegmentDist(wx, wy, pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y);
            if (dist < 8 / this.zoom) {
              pts.splice(i + 1, 0, { x: Math.round(wx), y: Math.round(wy) });
              this.syncVectorBounds(this.currentShapeObject);
              this.draw(); this.callbacks.reRender(); return;
            }
          }
          const lastPt = pts[pts.length - 1];
          const distLast = Math.hypot(wx - lastPt.x, wy - lastPt.y);
          if (distLast < 5 / this.zoom) { this.draw(); return; }
        }
      }
      if (!this.currentShapeObject || (toolId === 'vector_pen' && this.currentShapeObject._vectorType !== sub) || (toolId === 'light' && this.currentShapeObject.type !== 'light')) {
        if (toolId === 'light') {
           this.currentShapeObject = this.lightSystem.createLight(wx, wy);
           this.currentShapeObject.shape = 'vector';
           this.currentShapeObject.points = [{x: Math.round(wx), y: Math.round(wy)}];
        } else {
          this.currentShapeObject = {
            id: 'vector_' + Date.now(), type: 'vector', _vectorType: sub,
            _targetType: objType, _targetColor: color,
            points: [{x: Math.round(wx), y: Math.round(wy)}],
            x: wx, y: wy, w: 1, h: 1, color: color,
            label: (isCollision ? 'Colisão ' : 'Sensor ') + Date.now().toString().slice(-4),
            isVisible: true, opacity: 0.4, artboardId: 'default', isPersistent: true,
            collisionMode: isCollision ? 'total' : undefined,
            navType: !isCollision ? 'walkable' : undefined,
            sensorTrigger: !isCollision ? 'onEnter' : undefined,
            sensorRadius: !isCollision ? 100 : undefined,
          };
        }
        this.objects.push(this.currentShapeObject);
        this.selectedId = this.currentShapeObject.id;
        this.state.selectedId = this.currentShapeObject.id;
        this._editingNode = null;
      } else {
        this.currentShapeObject.points.push({x: Math.round(wx), y: Math.round(wy)});
        this.syncVectorBounds(this.currentShapeObject);
      }
      this.draw(); this.callbacks.reRender(); return;
    }
    if (['area_sensor', 'collision', 'light'].includes(toolId)) {
      this.isCreatingShape = true;
      const sub = this.toolbar.activeSubTool || 'rect';
      
      if (toolId === 'light') {
         if (sub === 'vector') {
            // Handled by vector_pen block above
            return;
         }
         const newLight = this.lightSystem.createLight(wx, wy);
         this.saveUndoState();
         this.objects.push(newLight);
         this.selectedId = newLight.id;
         this.state.selectedId = newLight.id;
         this.state.selectedIds = [newLight.id];
         this.currentShapeObject = newLight;
      } else {
        const isCollision = toolId === 'collision';
        const colorMap: any = { collision: '#ff4444', area_sensor: '#44ccff' };
        const labelMap: any = { collision: 'Colisão', area_sensor: 'Sensor de Área' };
        this.currentShapeObject = {
          id: toolId + '_' + Date.now(), x: wx, y: wy, w: 100, h: 100,
          label: labelMap[toolId] || toolId.toUpperCase(), color: colorMap[toolId] || '#ffffff',
          type: toolId, shape: sub, isVisible: true, opacity: 0.4, artboardId: 'default', isPersistent: true,
          collisionMode: isCollision ? 'total' : undefined,
          navType: !isCollision ? 'walkable' : undefined,
          sensorTrigger: !isCollision ? 'onEnter' : undefined,
          sensorRadius: !isCollision ? 100 : undefined,
        };
        this.objects.push(this.currentShapeObject);
        this.selectedId = this.currentShapeObject.id;
        this.state.selectedId = this.currentShapeObject.id;
        if (!this.state.selectedIds.includes(this.currentShapeObject.id)) {
          this.state.selectedIds = [...(this.state.selectedIds || []), this.currentShapeObject.id];
        }
      }
      this.draw(); this.callbacks.reRender(); return;
    }
    if (toolId === 'player') {
      if (this.phaseSpawnTool.isActiveState) {
         this.phaseSpawnTool.handleClick(wx, wy);
         this.draw();
         return;
      }
      
      // Cleanup any duplicate players first
      const players = this.objects.filter(o => o.type === 'player');
      if (players.length > 0) {
        // Just move the first one
        const p = players[0];
        p.x = wx - 32;
        p.y = wy - 32;
        p.w = 64;
        p.h = 64;
        this.selectedId = p.id;
        this.state.selectedId = p.id;
        this.state.selectedIds = [p.id];
        // Remove other copies
        this.objects = this.objects.filter(o => o.type !== 'player' || o.id === p.id);
      } else {
        // Create first player
        const playerId = 'player_' + Date.now();
        this.playerObjectId = playerId;
        this.objects.push({
          id: playerId, x: wx - 32, y: wy - 32, w: 64, h: 64,
          label: 'Player', color: '#4cff88', type: 'player',
          isVisible: true, opacity: 1.0, isLocked: true,
          isPersistent: true, artboardId: 'default', inPoint: 0, outPoint: 5,
          charData: { moveSpeed: 3 }
        });
        this.selectedId = playerId;
        this.state.selectedId = playerId;
        this.state.selectedIds = [playerId];
        this.showSpawnConfirmPopup(wx, wy);
      }
      
      this.centerCameraOnPlayer();
      this.draw(); 
      this.callbacks.reRender();
      return;
    }
    if (toolId === 'insert_player') {
      const existingPlayer = this.objects.find(o => o.type === 'player');
      if (existingPlayer) {
        this.playerObjectId = existingPlayer.id;
        this.selectedId = existingPlayer.id;
        this.state.selectedId = existingPlayer.id;
        this.state.selectedIds = [existingPlayer.id];
        this.draw();
        return;
      }
      document.dispatchEvent(new CustomEvent('questmaker-show-spawn-wizard'));
      return;
    }
    if (toolId === 'insert_camera') {
      if (!this.canvas) return;
      const wx = -this.panX / this.zoom + this.canvas.width / (2 * this.zoom);
      const wy = -this.panY / this.zoom + this.canvas.height / (2 * this.zoom);
      
      const existingCamera = this.objects.find(o => o.type === 'camera');
      if (existingCamera) {
        this.selectedId = existingCamera.id;
        this.state.selectedId = existingCamera.id;
        this.state.selectedIds = [existingCamera.id];
        // Allow moving camera directly with this tool
        const hit = this.objectAt(wx, wy);
        if (hit && hit.id === existingCamera.id) {
          this.isDragging = true;
          this.dragStartX = wx;
          this.dragStartY = wy;
        }
        this.draw();
        return;
      }
      
      const cameraId = 'camera_' + Date.now();
      // Default: larger camera with portrait aspect ratio (9:16)
      const defaultW = 360;
      const defaultH = 720;
      const cameraObj = {
        id: cameraId,
        type: 'camera',
        label: 'Câmera Principal',
        x: wx - defaultW / 2,
        y: wy - defaultH / 2,
        w: defaultW,
        h: defaultH,
        cameraMode: 'portrait', // 9:16 portrait
        trackingMode: 'follow_player',
        cameraZoom: 1,
        isVisible: true,
        opacity: 1,
        isPersistent: true,
        artboardId: 'default',
        inPoint: 0,
        outPoint: 300,
      };
      this.saveUndoState();
      this.objects.push(cameraObj);
      this.selectedId = cameraId;
      this.state.selectedId = cameraId;
      this.state.selectedIds = [cameraId];
      this.draw();
      this.callbacks.reRender();
      return;
    }
    if (toolId === 'move' && hit) {
      const isCtrl = e.ctrlKey || e.metaKey;
      const ids = this.state.selectedIds || [];
      const targetId = hit.id;
      
      if (!isCtrl && !ids.includes(targetId)) { 
        this.state.selectedIds = [targetId]; 
      }
      else if (isCtrl) {
        if (ids.includes(targetId)) this.state.selectedIds = ids.filter((id: string) => id !== targetId);
        else this.state.selectedIds = [...ids, targetId];
      }
      this.isDragging = true;
      this.dragStartX = wx; this.dragStartY = wy;
      this.draw(); return;
    }
    if (toolId === 'select' && hit) {
      const isCtrl = e.ctrlKey || e.metaKey;
      const ids = this.state.selectedIds || [];
      if (isCtrl) {
        if (ids.includes(hit.id)) this.state.selectedIds = ids.filter((id: string) => id !== hit.id);
        else this.state.selectedIds = [...ids, hit.id];
      } else { this.state.selectedIds = [hit.id]; }
      this.draw(); this.callbacks.reRender(); return;
    }
    if (toolId === 'select' && !hit) {
      this.isSelectArea = true;
      this.selectAreaStart = { x: wx, y: wy };
      this.selectAreaEnd = { x: wx, y: wy };
      if (!e.ctrlKey && !e.metaKey) { this.state.selectedIds = []; }
      this.draw(); return;
    }
    if (toolId === 'pan') {
      this.isPanning = true;
      this.dragStartX = wx; this.dragStartY = wy;
      this.draw(); return;
    }
    if (toolId === 'stamp' && this.stampBrush.stampUrl) {
      this.stampMouseDownPos = { x: wx, y: wy };
      this.stampIsDragging = false;
      this.stampMouseHeld = true;
      return;
    }
    if (toolId === 'stamp' && this.stampBrush.stampType === 'scene' && this.stampBrush.stampSceneIdx !== undefined) {
      this.handleSceneStamp(this.stampBrush.stampSceneIdx);
      this.draw(); this.callbacks.reRender();
      return;
    }
    this.state.selectedIds = [];
    this.draw(); this.callbacks.reRender();
  }

  private onMouseMove(e: any) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const wx = this.toWorldX(e.clientX - rect.left);
    const wy = this.toWorldY(e.clientY - rect.top);
    const coords = document.getElementById('wm-coords');
    if (coords) coords.innerText = `X:${Math.round(wx)} Y:${Math.round(wy)}`;
    if (this.isPanning) { this.panX += e.movementX; this.panY += e.movementY; this.clampPan(); }
    else if (this.isResizing && this.state.selectedIds?.length > 0) {
      const obj = this.objects.find(o => o.id === this.state.selectedIds[0]);
      if (obj) { this.resizeObject(obj, wx, wy); }
    } else if (this.isDragging && this.state.selectedIds?.length > 0) {
      const dx = wx - this.dragStartX;
      const dy = wy - this.dragStartY;
      const selectedIds = this.state.selectedIds;

      // Identify top-level selected items (those whose parents are not also selected)
      const topLevelSelection = selectedIds.filter((id: string) => {
        const obj = this.objects.find(o => o.id === id);
        if (!obj || !obj.parentId) return true;
        return !selectedIds.includes(obj.parentId);
      });

      // Move top-level selected items and their hierarchies
      for (const selId of topLevelSelection) {
        this.applyTransformToHierarchy(selId, dx, dy, 0, 0, 0);
      }

      this.dragStartX = wx; this.dragStartY = wy;
      this.draw();
      document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
    } else if (this.isCreatingShape && this.currentShapeObject) {
      if (this.currentShapeObject.type === 'light') {
        const dx = wx - this.currentShapeObject.x;
        const dy = wy - this.currentShapeObject.y;
        this.currentShapeObject.radius = Math.max(10, Math.hypot(dx, dy));
      } else {
        this.currentShapeObject.w = wx - this.currentShapeObject.x;
        this.currentShapeObject.h = wy - this.currentShapeObject.y;
      }
    } else if ((this.toolbar.activeTool === 'vector_pen' || (this.toolbar.activeTool === 'light' && this.toolbar.activeSubTool === 'vector')) && this._editingNode !== null && this.currentShapeObject) {
      const pts = this.currentShapeObject.points;
      if (pts && this._editingNode >= 0 && pts[this._editingNode]) {
        pts[this._editingNode].x = Math.round(wx);
        pts[this._editingNode].y = Math.round(wy);
        this.syncVectorBounds(this.currentShapeObject);
      }
    } else if (this.isSelectArea && this.toolbar.activeTool === 'select') {
      this.selectAreaEnd = { x: wx, y: wy };
    } else if (this.toolbar.activeTool === 'stamp' && this.stampBrush.stampUrl && this.stampBrush.stampType !== 'scene' && this.stampMouseHeld) {
      const dist = Math.hypot(wx - this.stampMouseDownPos.x, wy - this.stampMouseDownPos.y);
      if (dist > 5 / this.zoom) { this.stampIsDragging = true; }
      if (this.stampIsDragging) {
        const stampLayer = this.objects.find((o: any) => o.type === 'stamp_layer');
        const stamps = stampLayer?._stamps || [];
        const lastStamp = stamps[stamps.length - 1];
        const lastX = lastStamp?.x || wx;
        const lastY = lastStamp?.y || wy;
        const stampDist = Math.hypot(wx - lastX, wy - lastY);
        if (stampDist >= this.stampBrush.spacing) { this.stampStampAt(wx, wy); }
      }
    }
    this.draw();
  }

  private onMouseUp() {
    this.isPanning = false; this.isDragging = false; this.isResizing = false;
    if (this._editingNode !== null) { this._editingNode = null; }
    if (this.isCreatingShape) { this.isCreatingShape = false; this.currentShapeObject = null; this.callbacks.reRender(); }
    if (this.toolbar.activeTool === 'stamp' && this.stampBrush.stampUrl && this.stampBrush.stampType !== 'scene' && !this.stampIsDragging) {
      this.stampStampAt(this.stampMouseDownPos.x, this.stampMouseDownPos.y);
      this.draw(); this.callbacks.reRender();
    }
    this.stampIsDragging = false;
    this.stampMouseHeld = false;
    if (this.isSelectArea) {
      this.isSelectArea = false;
      const x1 = Math.min(this.selectAreaStart.x, this.selectAreaEnd.x);
      const y1 = Math.min(this.selectAreaStart.y, this.selectAreaEnd.y);
      const x2 = Math.max(this.selectAreaStart.x, this.selectAreaEnd.x);
      const y2 = Math.max(this.selectAreaStart.y, this.selectAreaEnd.y);
      if (Math.abs(x2 - x1) > 5 && Math.abs(y2 - y1) > 5) {
        const selected = this.objects.filter((o: any) => {
          if (o.isLocked === true) return false;
          const cx = o.x + (o.w || 0) / 2;
          const cy = o.y + (o.h || 0) / 2;
          return cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2;
        });
        if (selected.length > 0) {
          this.state.selectedIds = selected.map((o: any) => o.id);
          this.state.selectedId = selected[0].id;
        }
      }
    }
    this.draw();
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    if (!this.canvas) return;
    const factor = e.deltaY < 0 ? 1.05 : 0.95;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
    const oldZoom = this.zoom;
    const minZoomX = this.canvas.width / this.mapWidth;
    const minZoomY = this.canvas.height / this.mapHeight;
    const minZoom = Math.min(minZoomX, minZoomY);
    this.zoom = Math.max(minZoom, Math.min(10, this.zoom * factor));
    this.panX -= (mx - this.panX) * (this.zoom / oldZoom - 1);
    this.panY -= (my - this.panY) * (this.zoom / oldZoom - 1);
    this.clampPan();
    this.draw();
  }

  private clampPan(): void {
    if (!this.canvas) return;
    const mapScreenW = this.mapWidth * this.zoom;
    const mapScreenH = this.mapHeight * this.zoom;
    if (mapScreenW <= this.canvas.width) {
      this.panX = (this.canvas.width - mapScreenW) / 2;
    } else {
      this.panX = Math.min(0, Math.max(this.canvas.width - mapScreenW, this.panX));
    }
    if (mapScreenH <= this.canvas.height) {
      this.panY = (this.canvas.height - mapScreenH) / 2;
    } else {
      this.panY = Math.min(0, Math.max(this.canvas.height - mapScreenH, this.panY));
    }
  }

  private draw() {
    if (!this.renderPipeline || !this.ctx || !this.canvas) return;
    this.renderPipeline.setContext(this.ctx);
    this.renderPipeline.setCanvas(this.canvas);
    this.renderPipeline.setZoom(this.zoom);
    this.renderPipeline.setPan(this.panX, this.panY);
    this.renderPipeline.setState(this.state);
    this.renderPipeline.setObjects(this.objects);
    this.renderPipeline.setStampBrush(this.state.stampBrush || this.stampBrush);
    this.renderPipeline.setSelectArea(this.isSelectArea, this.selectAreaStart, this.selectAreaEnd);
    this.renderPipeline.setCurrentTime(this.state.currentTime || 0);
    this.renderPipeline.draw();

    // Render camera overlay (frame fixo sobre o canvas)
    if (this.ctx && this.canvas && this.cameraOverlay) {
      const camera = this.objects.find((o: any) => o.type === 'camera');
      if (camera) {
        this.cameraOverlay.setCamera(camera.id);
        this.cameraOverlay.render(this.ctx, this.canvas.width, this.canvas.height, this.objects, this.zoom, this.panX, this.panY);
      }
    }

    if (this.phaseRegionTool && this.phaseRegionTool.isActiveState) {
      this.phaseRegionTool.render(this.ctx, this.zoom, this.panX, this.panY);
    }
  }

  private updatePreviewCamera() {
    if (this.phaseDialog && (this.phaseDialog as any).isOpen) {
      this.phaseDialog.updatePreview();
    }
    if (this.renderPipeline) this.renderPipeline.updatePreviewCamera();
  }

  public startRunSequence() {
    if (this.isRunningSequence) return;
    console.log('[WorldMapMain] Starting Run Sequence...');
    this.isRunningSequence = true;
    this.state.isRunningSequence = true;
    this.sequenceAlpha = 1.0; 
    this.state.sequenceAlpha = 1.0;
    this.joystickVisible = false;
    this.state.joystickVisible = false;
    
    // Find player and spawn info
    const player = this.objects.find(o => o.type === 'player');
    const sf = this.state.phaseSpawnFrame;
    if (!player || !sf) {
      console.warn('[WorldMapMain] Cannot start sequence: Player or Spawn Frame missing.');
      this.isRunningSequence = false;
      this.state.isRunningSequence = false;
      this.joystickVisible = true;
      this.state.joystickVisible = true;
      this.sequenceAlpha = 0;
      this.state.sequenceAlpha = 0;
      return;
    }

    // The spawn target is ALWAYS the center of the spawn frame — never the player's current (moved) position.
    // This guarantees repeated runs always walk in to the same configured spawn point.
    const pw = player.w || 20;
    const ph = player.h || 40;
    const targetX = sf.x + sf.w / 2 - pw / 2;  // center of spawn frame
    const targetY = sf.y + sf.h / 2 - ph / 2;  // center of spawn frame

    // Reset player to OFF-SCREEN start (bottom of camera frame) before each run
    player.x = sf.x + sf.w / 2 - pw / 2; // center horizontally
    player.y = sf.y + sf.h + 60; // well below the frame
    
    // Animation loop for sequence
    let startTime = Date.now();
    const duration = 3000; // 3 seconds total
    
    const tick = () => {
      if (!this.isRunningSequence) return;
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 1. Fade out black overlay (first half of duration)
      if (progress < 0.4) {
        this.sequenceAlpha = 1;
      } else {
        this.sequenceAlpha = Math.max(0, 1 - (progress - 0.4) / 0.6);
      }
      this.state.sequenceAlpha = this.sequenceAlpha;
      
      // 2. Move player in (slow walk)
      // Linear lerp from bottom to target
      const startY = sf.y + sf.h + 60;
      const walkProgress = Math.min(progress * 1.4, 1); // slightly faster walk-in
      player.y = startY + (targetY - startY) * walkProgress;
      player.x = targetX; // keep x locked to spawn center
      
      // Set moving animation
      if (player.charData) {
        player.charData._isMoving = progress < 0.9;
        player.charData._currentDir = 'up';
      }

      this.draw();
      
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        this.isRunningSequence = false;
        this.joystickVisible = true;
        this.draw();
        console.log('[WorldMapMain] Sequence finished.');
      }
    };
    
    requestAnimationFrame(tick);
  }

  private createAssetWithCollision(url: string, wx: number, wy: number) {
    const imageId = 'asset_' + Date.now();
    
    const isGif = /\.gif$/i.test(url);
    const isPng = /\.(png|jpg|jpeg|webp)$/i.test(url);
    
    const imageObj: any = {
      id: imageId, x: wx - 50, y: wy - 50, w: 100, h: 100,
      label: 'Asset ' + Date.now().toString().slice(-4), color: '#fff', type: 'image', assetUrl: url,
      isVisible: true, opacity: 1.0, artboardId: 'default', isPersistent: true,
      inPoint: this.state.currentTime || 0, outPoint: (this.state.currentTime || 0) + 5000, duration: 5000,
      isLooping: true
    };
    
    if (isGif) {
      imageObj.charData = {
        _currentDir: 'down',
        idle: {
          down: { 
            asset: url, 
            gifUrl: url, 
            animType: 'gif',
            frames: [url],
            frameRate: 100
          }
        }
      };
    } else if (isPng) {
      imageObj.charData = {
        _currentDir: 'down',
        idle: {
          down: { asset: url, frames: [url], frameRate: 100, animType: 'png' }
        }
      };
    }
    
    this.objects.push(imageObj);
    
    // Auto-detect dimensions to prevent squashing
    const tempImg = new Image();
    tempImg.onload = () => {
      const targetObj = this.objects.find(o => o.id === imageId);
      if (targetObj) {
         const nw = tempImg.naturalWidth || 100;
         const nh = tempImg.naturalHeight || 100;
         
         // SMART SCALING: Target ~15% of the current viewport width in world units
         const viewportWidth = (this.canvas ? this.canvas.width : 1000) / this.renderPipeline.zoom;
         const targetW = viewportWidth * 0.15;
         const scale = targetW / nw;
         
         targetObj.w = targetW;
         targetObj.h = nh * scale;
         
         // Re-center based on new size
         targetObj.x = wx - (targetObj.w / 2);
         targetObj.y = wy - (targetObj.h / 2);
         
         this.draw();
         document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      }
    };
    tempImg.src = url;

    this.selectedId = imageId;
    this.state.selectedId = imageId;
    this.state.selectedIds = [imageId];
    this.draw();
    document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
    this.core.showToast(`ASSET ADICIONADO: ${imageId.slice(-4)}`, '#51c5ff');
  }


  public async saveScene(name: string) {
    // Deep clone all objects with ALL properties
    const sceneObjects = this.objects.map(o => {
      const clone: any = {};
      // Copy all properties explicitly
      for (const key in o) {
        if (o.hasOwnProperty(key)) {
          if (typeof o[key] === 'object' && o[key] !== null) {
            clone[key] = JSON.parse(JSON.stringify(o[key]));
          } else {
            clone[key] = o[key];
          }
        }
      }
      return clone;
    });

    const sceneData = {
      id: 'scene_' + Date.now(),
      name: name || 'Cena ' + new Date().toLocaleString(),
      savedAt: Date.now(),
      objects: sceneObjects
    };

    // Load existing scenes from the server
    let savedScenes: any[] = [];
    try {
      const res = await fetch('/api/load-scenes');
      if (res.ok) {
        savedScenes = await res.json();
      }
    } catch (e) {
      // Fallback to localStorage
      savedScenes = JSON.parse(localStorage.getItem('forge_scenes') || '[]');
    }

    // Add new scene
    savedScenes.push(sceneData);

    // Save to server (persistent in project code)
    try {
      await fetch('/api/save-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedScenes)
      });
    } catch (e) {
      // Fallback to localStorage
      localStorage.setItem('forge_scenes', JSON.stringify(savedScenes));
    }

    // Also keep in state for current session
    if (!this.state.savedScenes) this.state.savedScenes = [];
    this.state.savedScenes.push(sceneData);

    this.callbacks.reRender();
  }

  public async loadScene(sceneIdx: number) {
    let scenes = this.state.savedScenes || [];
    
    // If scene not found in state, try loading from server
    if (!scenes[sceneIdx]) {
      try {
        const res = await fetch('/api/load-scenes');
        if (res.ok) {
          scenes = await res.json();
          this.state.savedScenes = scenes;
        }
      } catch (e) {
        // Fallback to localStorage
        try {
          scenes = JSON.parse(localStorage.getItem('forge_scenes') || '[]');
          this.state.savedScenes = scenes;
        } catch (e2) {
          console.error('Failed to load scenes:', e2);
          return;
        }
      }
    }
    
    const scene = scenes[sceneIdx];
    if (!scene || !scene.objects) return;

    // For each object in the scene:
    // - If it already exists in canvas (same ID), UPDATE it with scene data
    // - If it doesn't exist, ADD it to canvas
    scene.objects.forEach((sceneObj: any) => {
      const existingObj = this.objects.find((o: any) => o.id === sceneObj.id);
      
      if (existingObj) {
        // Object exists - update all properties (keyframes, events, dimensions, etc.)
        // Preserve runtime-only properties that shouldn't be overwritten
        const preserveProps = ['_playerInSensor', '_sensorCooldown'];
        
        for (const key of Object.keys(sceneObj)) {
          if (!preserveProps.includes(key)) {
            existingObj[key] = this.deepCloneObject(sceneObj[key]);
          }
        }
      } else {
        // Object doesn't exist - add it to canvas
        const clone = this.deepCloneObject(sceneObj);
        this.objects.push(clone);
      }
    });

    // Reset selection
    this.selectedId = null;
    this.state.selectedId = null;
    this.state.selectedIds = [];
    
    // Redraw everything
    this.draw();
    this.callbacks.reRender();
  }

  // Get all descendants of a layer (recursive) - APENAS via parentId (hierarquia de transformação)
  private getDescendants(layerId: string, visited = new Set<string>()): string[] {
    const descendants: string[] = [];
    
    // Protection against circular references
    if (visited.has(layerId)) return [];
    visited.add(layerId);

    // Recursion depth limit for safety
    if (visited.size > 200) return [];

    const byParent = this.objects.filter((o: any) => o.parentId === layerId);
    for (const child of byParent) {
      if (!descendants.includes(child.id)) {
        descendants.push(child.id);
        const childDescendants = this.getDescendants(child.id, visited);
        childDescendants.forEach((d: string) => { 
          if (!descendants.includes(d)) descendants.push(d); 
        });
      }
    }
    
    return descendants;
  }

  // Get all members of a group (flat list, não recursivo)
  private getGroupMembers(groupId: string): string[] {
    const group = this.objects.find((o: any) => o.id === groupId);
    return group?._childIds || [];
  }

  // Apply transform to a layer and all its descendants (hierarchical transforms)
  private applyTransformToHierarchy(layerId: string, dx: number, dy: number, dw: number, dh: number, dRotation: number) {
    const layer = this.objects.find((o: any) => o.id === layerId);
    if (!layer) return;

    // With the additive renderer, we only update the target object.
    // Descendants will follow naturally because their x/y are relative offsets.
    layer.x = (layer.x || 0) + dx;
    layer.y = (layer.y || 0) + dy;
    layer.w = Math.max(1, (layer.w || 0) + dw);
    layer.h = Math.max(1, (layer.h || 0) + dh);
    layer.rotation = (layer.rotation || 0) + dRotation;
  }

  public setParent(childId: string, parentId: string | null) {
     const child = this.objects.find(o => o.id === childId);
     if (child) {
       child.parentId = parentId || undefined;
     }
  }

  // Robust recursive world-transform getter for coordinate conversion
  public async loadSavedScenes() {
    // Load scenes from server at startup
    try {
      const res = await fetch('/api/load-scenes');
      if (res.ok) {
        const scenes = await res.json();
        if (Array.isArray(scenes)) {
          this.state.savedScenes = scenes;
        }
      }
    } catch (e) {
      // Fallback to localStorage
      try {
        this.state.savedScenes = JSON.parse(localStorage.getItem('forge_scenes') || '[]');
      } catch (e2) {
        this.state.savedScenes = [];
      }
    }
  }

  public exitScene() {
    // Restore visibility of objects that were hidden during scene
    this.objects.forEach((o: any) => {
      if (o._wasVisibleBeforeScene !== undefined) {
        o.isVisible = o._wasVisibleBeforeScene;
        delete o._wasVisibleBeforeScene;
      }
      // Remove scene-only objects that aren't persistent
      if (o._isSceneObject && !o.isPersistent) {
        const idx = this.objects.indexOf(o);
        if (idx !== -1) this.objects.splice(idx, 1);
      }
    });

    // Reset selection
    this.selectedId = null;
    this.state.selectedId = null;
    this.state.selectedIds = [];
    
    // Redraw everything
    this.draw();
    this.callbacks.reRender();
  }

  private deleteObject(id: string) {
    try {
      const descendants = this.getDescendants(id);
      const idsToDelete = new Set([id, ...descendants]);
      
      this.objects = this.objects.filter(o => !idsToDelete.has(o.id));
      
      if (this.state.selectedIds) {
        this.state.selectedIds = this.state.selectedIds.filter((sid: string) => !idsToDelete.has(sid));
      }
      if (this.selectedId && idsToDelete.has(this.selectedId)) {
          this.selectedId = null;
          this.state.selectedId = null;
      }
      
      document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
    } catch (e) {
      console.error('Delete error:', e);
    }
  }

  public deleteSelected() {
    const selectedIds = [...(this.state.selectedIds || [])];
    if (selectedIds.length === 0) return;
    
    // Sort so we don't try to delete children if parent is already going to be deleted
    // (though deleteObject handles it anyway)
    for (const id of selectedIds) {
      // Check if it still exists (might have been deleted as a descendant of a previous id in this loop)
      if (this.objects.some(o => o.id === id)) {
        this.deleteObject(id);
      }
    }
    
    this.draw();
    this.callbacks.reRender();
  }

  public updatePropertyHierarchical(id: string, prop: string, newVal: number) {
    const obj = this.objects.find(o => o.id === id);
    if (!obj) return;
    const t = this.state.currentTime || 0;

    if (['x', 'y', 'w', 'h', 'rotation'].includes(prop)) {
      const oldVal = obj[prop] ?? 0;
      const delta = newVal - oldVal;
      if (delta !== 0) {
        const dx = prop === 'x' ? delta : 0;
        const dy = prop === 'y' ? delta : 0;
        const dw = prop === 'w' ? delta : 0;
        const dh = prop === 'h' ? delta : 0;
        const dr = prop === 'rotation' ? delta : 0;
        
        // Propagate the manual change to all descendants (absolute coordinates)
        this.applyTransformToHierarchy(id, dx, dy, dw, dh, dr);
        
        // Record keyframes for parent and children (absolute positions)
        KeyframeManager.setValue(obj, prop, obj[prop], t);
        const descendants = this.getDescendants(id);
        descendants.forEach(dId => {
          const desc = this.objects.find(o => o.id === dId);
          if (desc) {
             ['x', 'y', 'w', 'h', 'rotation'].forEach(p => KeyframeManager.setValue(desc, p, desc[p], t));
          }
        });
      }
    } else {
      KeyframeManager.setValue(obj, prop, newVal, t);
      obj[prop] = newVal;
    }

    this.draw();
    document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
  }

  private deepCloneObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.deepCloneObject(item));
    
    const clone: any = {};
    for (const key of Object.keys(obj)) {
      clone[key] = this.deepCloneObject(obj[key]);
    }
    return clone;
  }

  private handleSceneStamp(sceneIdx: number) {
    let scenes = this.state.savedScenes || [];
    
    // If scene not found in state, try loading from localStorage
    if (!scenes[sceneIdx]) {
      try {
        const saved = JSON.parse(localStorage.getItem('forge_scenes') || '[]');
        if (saved[sceneIdx] && saved[sceneIdx].data) {
          scenes = [saved[sceneIdx].data];
        }
      } catch (e) {
        console.error('Failed to load scene from localStorage:', e);
        return;
      }
    }
    
    const scene = scenes[sceneIdx];
    if (!scene || !scene.objects) return;
    
    const groupId = 'stamp_scene_' + Date.now();
    this.objects.push({
      id: groupId, type: 'group', label: 'Cena: ' + (scene.name || 'Carimbo'),
      _isGroup: true, x: 0, y: 0, w: 1, h: 1,
      isVisible: true, opacity: 1, artboardId: 'default', isPersistent: true,
    });
    
    // Deep clone each object
    scene.objects.forEach((o: any) => {
      const clone = this.deepCloneObject(o);
      clone.id = o.id + '_stamp_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
      clone.groupId = groupId;
      clone.isPersistent = true;
      this.objects.push(clone);
    });
  }

  private createSpriteFromPack(pack: any, wx: number, wy: number) {
    const id = 'morph_' + Date.now();
    const morphObj: any = {
      id: id,
      type: 'morph',
      label: pack.name || 'Novo Sprite',
      x: wx - 50, y: wy - 50, w: 100, h: 100,
      color: '#fff',
      isVisible: true,
      opacity: 1.0,
      artboardId: 'default',
      isPersistent: true,
      isAnimated: true,
      charData: this.deepCloneObject(pack),
      inPoint: this.state.currentTime || 0,
      outPoint: (this.state.currentTime || 0) + 5000,
      duration: 5000
    };

    this.objects.push(morphObj);

    // Auto-detect dimensions from first frame
    const previewUrl = pack.actions?.[0]?.directions?.down?.frames?.[0] || pack.actions?.[0]?.directions?.down?.gifUrl;
    if (previewUrl) {
      const tempImg = new Image();
      tempImg.onload = () => {
         const target = this.objects.find(o => o.id === id);
         if (target) {
            const nw = tempImg.naturalWidth || 100;
            const nh = tempImg.naturalHeight || 100;
            
            // SMART SCALING (Sprite): Target ~15% of the current viewport width
            const viewportWidth = (this.canvas ? this.canvas.width : 1000) / this.renderPipeline.zoom;
            const targetW = viewportWidth * 0.15;
            const scale = targetW / nw;

            target.w = targetW;
            target.h = nh * scale;

            // Re-center
            target.x = wx - (target.w / 2);
            target.y = wy - (target.h / 2);

            this.draw();
         }
      };
      tempImg.src = previewUrl;
    }

    this.selectedId = id;
    this.state.selectedId = id;
    this.state.selectedIds = [id];
    this.draw();
    document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
    this.core.showToast(`SPRITE ADICIONADO: ${pack.name}`, '#4cff88');
  }
}
