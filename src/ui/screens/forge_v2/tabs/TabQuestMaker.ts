import { WorldMapMain } from './quest_maker/world_map/WorldMapMain';
import { PlayerPreview } from './quest_maker/PlayerPreview';
import { MenuMap } from './quest_maker/world_map/MenuMap';
import { SpritesMain } from './quest_maker/sprites_animate/SpritesMain';
import { AssetsQuestsMain } from './quest_maker/assets_quests/AssetsQuestsMain';
import { ScenesGallery } from './quest_maker/world_map/panels/ScenesGallery';
import { QuestsCreatorMain } from './quest_maker/quests_creator/QuestsCreatorMain';
import { PhaseCreationWizard } from './quest_maker/world_map/PhaseCreationWizard';
import { ForgeCore } from '../core/ForgeCore';
import { layerSystem, aeTimeline } from '../../../shared';
import { PhaseToolbar } from './quest_maker/world_map/PhaseToolbar';
import { QuickActionsToolbar } from './quest_maker/world_map/QuickActionsToolbar';
import { MinimapOverlay } from './quest_maker/world_map/MinimapOverlay';
import { QuestMakerHub } from './quest_maker/QuestMakerHub';

// Sub-tab config
const SUB_TABS = [
  { id: 'worldmap',       label: 'WORLD MAP',  icon: '🗺️',  color: '#51c5ff' },
  { id: 'quests',         label: 'INTERAÇÕES',  icon: '💬',  color: '#a78bfa' },
  { id: 'sprites',        label: 'SPRITE CREATOR', icon: '🎞️',  color: '#ffd700' },
  { id: 'assets',         label: 'ASSETS',     icon: '📦',  color: '#4cff88' },
  { id: 'scenes',         label: 'SCENES',     icon: '🎬',  color: '#ff8c42' },
];

export class TabQuestMaker {
  private container: HTMLElement | null = null;
  private state: any;
  private core: ForgeCore;
  private callbacks: any;
  private subInstances: Map<string, any> = new Map();
  private phaseToolbar = new PhaseToolbar();
  private quickActions = new QuickActionsToolbar();
  private minimap = new MinimapOverlay();
  private phaseWizard: PhaseCreationWizard;
  private history: string[] = [];
  private redoHistory: string[] = [];
  private _isDestroyed = false;
  private _renderRAF: number | null = null;
  private _boundEvents: Record<string, EventListener> = {};

  constructor(_state: any, _core: ForgeCore, _callbacks: any) {
    this.state = _state;
    this.core = _core;
    this.state.selectedIds = this.state.selectedIds || [];
    this.phaseWizard = new PhaseCreationWizard(this.state);

    this.callbacks = {
      ..._callbacks,
      saveSnapshot: () => {
        const snap = JSON.stringify(this.state.worldMapObjects);
        if (this.history[this.history.length - 1] !== snap) {
          this.history.push(snap);
          if (this.history.length > 50) this.history.shift();
          this.redoHistory = [];
        }
      },
      undo: () => {
        if (this.history.length > 0) {
          const current = JSON.stringify(this.state.worldMapObjects);
          this.redoHistory.push(current);
          const last = this.history.pop()!;
          this.state.worldMapObjects = JSON.parse(last);
          this.state.selectedIds = [];
          this.callbacks.reRender();
          document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        }
      },
      redo: () => {
        if (this.redoHistory.length > 0) {
          const current = JSON.stringify(this.state.worldMapObjects);
          this.history.push(current);
          const next = this.redoHistory.pop()!;
          this.state.worldMapObjects = JSON.parse(next);
          this.state.selectedIds = [];
          this.callbacks.reRender();
          document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        }
      },
      reRender: () => {
        if ((this as any).__reRenderBlocked) return;
        (this as any).__reRenderBlocked = true;
        setTimeout(() => { (this as any).__reRenderBlocked = false; }, 50);
        try {
          const mode = this.state.questSubMode || 'worldmap';
          const isWorldMap = mode === 'worldmap';

          if (isWorldMap && this.container) {
            const menuWrapper = this.container.querySelector('#quest-maker-menus-wrapper') as HTMLElement;
            if (menuWrapper) {
              const active = document.activeElement;
              if (active && (active.classList.contains('param-slider') || active.classList.contains('param-num-input') || active.id === 'layer-search')) return;
              
              const menuInst = this.getSubInstance('menu');
              menuWrapper.innerHTML = menuInst.render(this.state);
              menuInst.bind(menuWrapper, this.state, this.callbacks);

              const timelineWrapper = this.container.querySelector('#ae-timeline-wrapper') as HTMLElement;
              if (timelineWrapper) {
                const timelineInst = this.getSubInstance('aeTimeline');
                timelineWrapper.innerHTML = timelineInst.render();
                timelineInst.bind(timelineWrapper, this.state, this.callbacks);
              }
            }
          }
          if (this.container) {
            this.bind(this.container);
          }
        } catch (err) {
          console.error('[TabQuestMaker] reRender error:', err);
        }
      }
    };
  }

  public updateRefs(state: any, callbacks: any) {
    this.state = state;
    this.callbacks = { ...this.callbacks, ...callbacks };
    // Update any active sub-instances (e.g., WorldMapMain)
    this.subInstances.forEach(inst => {
      if (inst && typeof inst.updateRefs === 'function') {
        inst.updateRefs(state, this.callbacks);
      } else if (inst) {
        // Fallback for sub-tabs that manually hold state
        if (inst.state) inst.state = state;
        if (inst.__state) inst.__state = state;
      }
    });
  }

  public destroy() {
    this._isDestroyed = true;
    if (this._renderRAF) cancelAnimationFrame(this._renderRAF);
    
    // Destroy all sub-instances (WorldMapMain, etc.)
    this.subInstances.forEach(inst => {
      if (inst && typeof inst.destroy === 'function') {
        inst.destroy();
      }
    });
    this.subInstances.clear();

    // Remove managed listeners
    Object.keys(this._boundEvents).forEach(name => {
      document.removeEventListener(name, this._boundEvents[name]);
    });
    this._boundEvents = {};
  }

  private syncWorldMapToAE(worldMapObjects: any[]) {
    if (!worldMapObjects || worldMapObjects.length === 0) return;
    
    const existingLayers = layerSystem.getLayers();
    const existingIds = new Set(existingLayers.map(l => l.id));
    
    worldMapObjects.forEach(obj => {
      if (!existingIds.has(obj.id)) {
        layerSystem.addLayer({
          id: obj.id,
          name: obj.label || obj.type,
          type: obj.type === 'morph' ? 'image' : (obj.type === 'player' ? 'null' : 'image'),
          position: { x: obj.x || 0, y: obj.y || 0 },
          scale: { x: 100, y: 100 },
          rotation: obj.rotation || 0,
          opacity: obj.opacity ?? 1,
          visible: obj.isVisible !== false,
          locked: obj.isLocked || false,
          properties: obj.keyframes || {},
          assetUrl: obj.assetUrl,
          color: obj.color
        });
      } else {
        const layer = layerSystem.getLayer(obj.id);
        if (layer) {
          layer.position = { x: obj.x || 0, y: obj.y || 0 };
          layer.rotation = obj.rotation || 0;
          layer.opacity = obj.opacity ?? 1;
          layer.visible = obj.isVisible !== false;
          layer.locked = obj.isLocked || false;
          layer.properties = obj.keyframes || layer.properties;
        }
      }
    });
  }

    private getSubInstance(key: string) {
    if (this.subInstances.has(key)) return this.subInstances.get(key);
    let inst: any;
    if (key === 'worldmap') {
      // Check for global zombie instance
      if ((window as any).__wmInstance && typeof (window as any).__wmInstance.destroy === 'function') {
        (window as any).__wmInstance.destroy();
      }
      inst = new WorldMapMain(this.state, this.core, this.callbacks);
    }
    if (key === 'quests')    inst = new QuestsCreatorMain(this.state, this.core, this.callbacks);
    if (key === 'sprites')   inst = new SpritesMain(this.state, this.core, this.callbacks);
    if (key === 'assets')    inst = new AssetsQuestsMain(this.state, this.core, this.callbacks);
    if (key === 'scenes') {
      inst = new ScenesGallery();
      (inst as any).__state = this.state;
      (inst as any).__callbacks = this.callbacks;
    }
    if (key === 'preview')   inst = new PlayerPreview();
    if (key === 'menu') {
      inst = new MenuMap();
      inst._callbacks = this.callbacks;
    }
    if (key === 'aeTimeline') inst = aeTimeline;
    this.subInstances.set(key, inst);
    return inst;
  }

  private renderPhaseToolbar(): string {
    return this.phaseToolbar.render(this.state);
  }

  private renderNav(): string {
    const mode = this.state.questSubMode || 'worldmap';
    return SUB_TABS.map(tab => {
      const isActive = mode === tab.id;
      return `
        <button class="quest-sub-tab-btn" data-tab="${tab.id}" style="
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px;
          border-radius: 8px;
          border: 1px solid ${isActive ? tab.color : 'rgba(255,255,255,0.08)'};
          background: ${isActive ? `${tab.color}18` : 'transparent'};
          color: ${isActive ? tab.color : 'rgba(255,255,255,0.35)'};
          cursor: pointer;
          font-weight: 900;
          font-size: 0.6rem;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          transition: all 0.2s ease;
          white-space: nowrap;
        ">
          <span style="font-size:0.75rem;">${tab.icon}</span>
          ${tab.label}
          ${isActive ? `<span style="width:5px;height:5px;border-radius:50%;background:${tab.color};display:inline-block;margin-left:2px;box-shadow:0 0 6px ${tab.color};"></span>` : ''}
        </button>
      `;
    }).join('');
  }

    public render(): string {
    const mode = this.state.questSubMode || 'worldmap';
    const isWorldMap = mode === 'worldmap';
    console.log('[TabQuestMaker] render mode:', mode, 'isWorldMap:', isWorldMap, 'wizardActive:', this.phaseWizard?.isActive());

    // Check if loading a phase from hub
    const loadPhaseId = (window as any).__loadPhaseId;
    const skipPhaseWizard = (window as any).__skipPhaseWizard;

    // Clear the load phase flags after using them
    if (loadPhaseId || skipPhaseWizard) {
      setTimeout(() => {
        delete (window as any).__loadPhaseId;
        delete (window as any).__skipPhaseWizard;
      }, 1000);
    }

    const instance = this.getSubInstance(mode);
    const preview = this.getSubInstance('preview');
    const menuMap = this.getSubInstance('menu');
    const aeTimelineInst = this.getSubInstance('aeTimeline');

    // Expor state globalmente para timeline poder acessar
    (window as any).__questMakerState = this.state;

    // Sincronizar objetos do worldMap com o LayerSystem do AE
    if (isWorldMap && this.state.worldMapObjects) {
      this.syncWorldMapToAE(this.state.worldMapObjects);
      
      // Passar dados para a timeline AE
      aeTimelineInst.setWorldMapData(
        this.state.worldMapObjects,
        this.state.selectedIds || [],
        this.state.currentTime || 0
      );
    }

    if (this.state.selectedId && !this.state.selectedIds.includes(this.state.selectedId)) {
      this.state.selectedIds = [this.state.selectedId];
    }

    return `
      <div class="quest-maker-container" style="display:flex; height:100%; width:100%; overflow:hidden; animation: fadeIn 0.4s ease; position:relative; background:#050508; flex-direction:column;">

        <!-- NAV BAR SUPERIOR (todas as sub-abas) -->
        <div class="quest-maker-nav" style="display:flex; gap:6px; padding:10px 15px; background:rgba(0,0,0,0.45); border-bottom:1px solid rgba(255,255,255,0.06); flex-shrink:0; overflow-x:auto;">
          ${this.renderNav()}
        </div>

        <!-- CORPO PRINCIPAL -->
        <div style="flex:1; display:flex; overflow:hidden;">

          <!-- ÁREA DE CONTEÚDO -->
          <div class="quest-maker-main" style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
            
            <div id="quest-maker-content-area" class="quest-maker-content" style="flex:1; overflow:hidden; position:relative;">
              ${instance.render()}
            </div>

            <!-- TIMELINE AE (só no world map) -->
            ${isWorldMap ? `
            <div id="ae-timeline-wrapper" style="height:380px; flex-shrink:0; border-top:1px solid rgba(255,255,255,0.1); z-index:50; background:#0a0a0c; display:flex; flex-direction:column;">
              ${aeTimelineInst.render()}
            </div>
            ` : ''}
          </div>

          <!-- SIDEBAR DE CONTROLE (só no world map) -->
          ${isWorldMap ? `
          <div id="quest-maker-menus-wrapper" style="width:380px; flex-shrink:0; border-left:1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column; background:#0a0a0f;">
            ${menuMap.render(this.state)}
          </div>
          ` : ''}

          <!-- SIDEBAR DE PREVIEW (só no world map) -->
          ${isWorldMap ? `
          <div id="player-preview-wrapper" style="width:450px; flex-shrink:0; background:rgba(0,0,0,0.4); border-left:1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column;">
            ${this.renderPhaseToolbar()}
            ${preview.render(this.state)}
          </div>
          ` : ''}

        </div>

        ${isWorldMap ? this.quickActions.render(this.state) : ''}
        ${isWorldMap ? this.minimap.render(this.state) : ''}
      </div>
    `;
  }

  public bind(container: HTMLElement) {
    this.container = container;
    const mode = this.state.questSubMode || 'worldmap';

    // Bind da sub-aba ativa
    const instance = this.getSubInstance(mode);
    const contentEl = container.querySelector('#quest-maker-content-area') as HTMLElement;
    if (contentEl) instance.bind(contentEl);

    // — Quick Actions (só no world map) —
    if (mode === 'worldmap') {
      this.quickActions.bind(container, this.state, this.callbacks);
      this.minimap.bind(container, this.state);

      // --- HUB & WIZARD ONE-TIME ACTIVATION ---
      const enteredViaHub = localStorage.getItem('qm_entered_via_hub') === 'true';
      const hubSkipped = localStorage.getItem('qm_hub_skipped') === 'true';

      console.log('[TabQuestMaker] Triggering Hub logic - enteredViaHub:', enteredViaHub, 'hubSkipped:', hubSkipped);

      if (enteredViaHub) {
        localStorage.removeItem('qm_entered_via_hub');
        setTimeout(() => this.phaseWizard.checkAndShow(), 300);
      } else if (!(window as any).__hubShownInThisSession) {
        (window as any).__hubShownInThisSession = true;
        setTimeout(() => {
          console.log('[TabQuestMaker] Attempting to show QuestMakerHub');
          QuestMakerHub.show((tabId: string) => {
            this.state.questSubMode = tabId;
            this.callbacks.reRender();
          });
        }, 500);
      }
    }

    // — World map extras —
    if (mode === 'worldmap') {
      const menuInst = this.getSubInstance('menu');
      const menuWrap = container.querySelector('#quest-maker-menus-wrapper') as HTMLElement;
      if (menuWrap) menuInst.bind(menuWrap, this.state, this.callbacks);

      // AE Timeline - agora usa ArtboardsPanel diretamente via MenuMap
      const aeTimelineWrap = container.querySelector('#ae-timeline-wrapper') as HTMLElement;
      if (aeTimelineWrap) {
        const aeTimelineInst = this.getSubInstance('aeTimeline');
        aeTimelineInst.bind(aeTimelineWrap, this.state, this.callbacks);
      }

      const previewInst = this.getSubInstance('preview');
      const previewWrap = container.querySelector('#player-preview-wrapper') as HTMLElement;
      if (previewWrap) {
        previewInst.bind(previewWrap, this.state);
        // Bind phase toolbar
        const phaseToolbarEl = previewWrap.querySelector('#phase-toolbar');
        if (phaseToolbarEl) {
          this.phaseToolbar.bind(phaseToolbarEl as HTMLElement, this.state, this.callbacks);
        }
      }

      // Link PlayerPreview to WorldMapMain for direct object access
      const wmInstance = this.getSubInstance('worldmap') as any;
      if (wmInstance && previewInst.setWorldMapInstance) {
        previewInst.setWorldMapInstance(wmInstance);
      }

      // Update camera view when player moves - uses LIVE objects from WorldMapMain
      const updateCameraPreview = () => {
        const wmInstance = this.getSubInstance('worldmap') as any;
        if (!wmInstance) return;

        const liveObjects = wmInstance.objects || [];
        const player = liveObjects.find((o: any) => o.type === 'player');
        
        // Find the target camera: selected one first, or the first one available
        const selectedId = this.state.selectedId || (this.state.selectedIds && this.state.selectedIds[0]);
        const selectedObj = liveObjects.find((o: any) => o.id === selectedId);
        
        let targetCamera = (selectedObj?.type === 'camera') ? selectedObj : liveObjects.find((o: any) => o.type === 'camera');

        if (targetCamera) {
          // View according to the specific camera frame
          const camCenter = { x: targetCamera.x + targetCamera.w / 2, y: targetCamera.y + targetCamera.h / 2 };
          const frameSize = { w: targetCamera.w, h: targetCamera.h };
          previewInst.updateCameraView(liveObjects, camCenter, frameSize);
        } else if (player) {
          // Default follow player if no camera exists
          const playerPos = { x: player.x + player.w / 2, y: player.y + player.h / 2 };
          previewInst.updateCameraView(liveObjects, playerPos, { w: 320, h: 640 });
        }

        this.state._playerPreviewActive = true;
        this.state.worldMapObjects = liveObjects;

        // Ensure canvas is visible
        const canvas = document.getElementById('pp-camera-view') as HTMLCanvasElement;
        if (canvas) canvas.style.display = 'block';
        const placeholder = document.getElementById('pp-placeholder');
        if (placeholder) placeholder.style.display = 'none';
      };

      // Managed Event Listeners (Removed on destroy)
      const setupListener = (name: string, handler: EventListener) => {
        if (this._boundEvents[name]) document.removeEventListener(name, this._boundEvents[name]);
        this._boundEvents[name] = handler;
        document.addEventListener(name, handler);
      };

      setupListener('joystick-move', () => {
        requestAnimationFrame(updateCameraPreview);
      });

      setupListener('worldmap-objects-changed', () => {
        setTimeout(updateCameraPreview, 100);
      });
      
      setupListener('questmaker-show-spawn-wizard', () => {
        this.phaseWizard.showSpawnInstructions();
      });

      setupListener('wm-command', (e: any) => {
        if (e.detail?.cmd === 'open-hub') {
          // Force show hub even if skipped before
          QuestMakerHub.show((tabId: string) => {
            this.state.questSubMode = tabId;
            this.callbacks.reRender();
          });
        }
      });

      // Continuous update loop for smooth camera (Managed & Cancellable)
      let lastUpdate = 0;
      const continuousUpdate = () => {
        if (this._isDestroyed) return;

        const wmInstance = this.getSubInstance('worldmap') as any;
        const liveObjects = wmInstance?.objects || this.state.worldMapObjects || [];
        const player = liveObjects.find((o: any) => o.type === 'player');
        const camera = liveObjects.find((o: any) => o.type === 'camera');
        
        if (player || camera) {
          const now = Date.now();
          if (now - lastUpdate > 50) {
            updateCameraPreview();
            lastUpdate = now;
          }
        }
        this._renderRAF = requestAnimationFrame(continuousUpdate);
      };
      
      if (this._renderRAF) cancelAnimationFrame(this._renderRAF);
      this._renderRAF = requestAnimationFrame(continuousUpdate);
    }

    // Hover effect nos botões do nav
    container.querySelectorAll('.quest-sub-tab-btn').forEach(btn => {
      const b = btn as HTMLElement;
      const tab = SUB_TABS.find(t => t.id === b.dataset.tab);
      b.addEventListener('mouseenter', () => {
        if (b.dataset.tab !== (this.state.questSubMode || 'worldmap')) {
          b.style.borderColor = tab ? `${tab.color}55` : 'rgba(255,255,255,0.2)';
          b.style.color = tab ? `${tab.color}99` : 'rgba(255,255,255,0.6)';
        }
      });
      b.addEventListener('mouseleave', () => {
        if (b.dataset.tab !== (this.state.questSubMode || 'worldmap')) {
          b.style.borderColor = 'rgba(255,255,255,0.08)';
          b.style.color = 'rgba(255,255,255,0.35)';
        }
      });
    });

    // Navegação clicando nas abas
    container.querySelectorAll('.quest-sub-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = (btn as HTMLElement).dataset.tab;
        if (!tabId || tabId === this.state.questSubMode) return;

        this.state.questSubMode = tabId;

        // Limpar instâncias cached se necessário (exceto world map / menu / preview)
        const freshOnSwitch = ['sprites', 'assets', 'scenes', 'quests'];
        if (freshOnSwitch.includes(tabId)) {
          this.subInstances.delete(tabId);
        }

        // Re-renderizar o painel inteiro
        const tabWrapper = this.container as HTMLElement;
        tabWrapper.innerHTML = this.render();
        this.bind(tabWrapper);
      });
    });

    // KEYBOARD SHORTCUTS GLOBAL
    if (!(window as any).__undoInitted) {
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey) {
          const key = e.key.toLowerCase();
          if (key === 'z') { e.preventDefault(); this.callbacks.undo(); }
          if (key === 'x') { e.preventDefault(); this.callbacks.redo(); }
        }
        
        // AE Timeline shortcuts (quando no world map)
        if (mode === 'worldmap') {
          const aeTimelineInst = this.getSubInstance('aeTimeline');
          if (e.key === ' ') {
            e.preventDefault();
            aeTimelineInst.togglePlayPause();
          } else if (e.key === 'Home') {
            aeTimelineInst.goToStart();
          } else if (e.key === 'End') {
            aeTimelineInst.goToEnd();
          } else if (e.key === 'ArrowLeft' && !e.shiftKey) {
            aeTimelineInst.stepBackward();
          } else if (e.key === 'ArrowRight' && !e.shiftKey) {
            aeTimelineInst.stepForward();
          }
        }
      });
      (window as any).__undoInitted = true;
    }
  }
}
