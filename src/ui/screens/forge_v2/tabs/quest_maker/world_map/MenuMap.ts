import { ArtboardsPanel } from './panels/ArtboardsPanel';
import { ParamsPanel } from './panels/ParamsPanel';
import { MultiStatePanel } from './panels/MultiStatePanel';
import { CharacterPanel } from './panels/CharacterPanel';
import { SpriteLibraryPanel } from './panels/SpriteLibraryPanel';
import { ScenesGallery } from './panels/ScenesGallery';
import { StampPanel } from './panels/StampPanel';
import { PhaseDialog } from './panels/PhaseDialog';
import { AssetLibraryPanel } from './panels/AssetLibraryPanel';
import { CompositeShapePanel } from './panels/CompositeShapePanel';
import { CameraPanel } from './panels/CameraPanel';
import { LightPanel } from './panels/LightPanel';

export class MenuMap {
  private artboardsPanel = new ArtboardsPanel();
  private compositeShapePanel = new CompositeShapePanel();
  private params = new ParamsPanel();
  private multiState = new MultiStatePanel();
  private character = new CharacterPanel();
  private spriteLibrary = new SpriteLibraryPanel();
  private scenesGallery = new ScenesGallery();
  private stampPanel = new StampPanel();
  private phaseDialog: PhaseDialog | null = null;
  private assetLibrary = new AssetLibraryPanel();
  private cameraPanel = new CameraPanel();
  private lightPanel = new LightPanel();
  private _callbacks: any = {};
  private _eventsBound = false;

  // Navegação principal
  private activeTab: string = 'layers';
  // Sub-aba de Assets
  private activeAssetSubTab: string = 'library';
  // Sub-aba de Scenes (fases first)
  private activeSceneSubTab: string = 'fases';

  constructor() {}

  public render(state: any, callbacks?: any): string {
    if (callbacks) this._callbacks = callbacks;
    const objects = state.worldMapObjects || [];
    const selectedId = state.selectedId || (state.selectedIds?.[0] || null);
    const currentTime = state.currentTime || 0;

    const tabs = [
      { id: 'layers', label: 'CAMADAS' },
      { id: 'assets', label: 'ASSETS' },
      { id: 'scenes', label: 'CENAS' },
      { id: 'a3',     label: 'PLAYER' },
      { id: 'a4',     label: 'EVENT' },
      { id: 'a7',     label: 'CAM' },
      { id: 'a8',     label: 'STAMP' },
      { id: 'a9',     label: 'LIGHT' }
    ];

    let content = '';

    if (this.activeTab === 'layers') {
      const layerContent = this.artboardsPanel.render(state, callbacks);
      content = `
        <div style="display:flex; flex-direction:column; height:100%;">
          <div id="section-layers" style="flex:1; overflow:hidden;">${layerContent}</div>
        </div>
      `;
    }

    else if (this.activeTab === 'assets') {
      const assetSubBar = `
        <div class="asset-sub-tabs" style="
          display:flex; background:#0d0d15; flex-shrink:0;
          border-bottom:1px solid #222; padding:4px; gap:4px;
        ">
          <button class="asset-sub-btn" data-sub="library" style="
            flex:1; padding:5px 4px; border:none; border-radius:4px; cursor:pointer; font-size:0.45rem; font-weight:900;
            background:${this.activeAssetSubTab === 'library' ? 'rgba(255,255,255,0.15)' : 'transparent'};
            color:${this.activeAssetSubTab === 'library' ? '#fff' : '#555'};
            border:1px solid ${this.activeAssetSubTab === 'library' ? '#ffffff44' : 'transparent'};
          ">🎨 GERAL</button>
          <button class="asset-sub-btn" data-sub="sprites" style="
            flex:1; padding:5px 4px; border:none; border-radius:4px; cursor:pointer; font-size:0.45rem; font-weight:900;
            background:${this.activeAssetSubTab === 'sprites' ? 'rgba(76,255,136,0.15)' : 'transparent'};
            color:${this.activeAssetSubTab === 'sprites' ? '#4cff88' : '#555'};
            border:1px solid ${this.activeAssetSubTab === 'sprites' ? '#4cff8844' : 'transparent'};
          ">🎬 SPRITES</button>
        </div>
      `;

      let assetContent = '';
      if (this.activeAssetSubTab === 'library') {
        assetContent = `<div id="section-asset-library" style="flex:1; overflow:hidden;">${this.assetLibrary.render(state)}</div>`;
      } else {
        assetContent = `<div id="section-sprites" style="flex:1; overflow:hidden;">${this.spriteLibrary.render(state)}</div>`;
      }

      content = `
        <div style="display:flex; flex-direction:column; height:100%;">
          ${assetSubBar}
          ${assetContent}
        </div>
      `;
    }

    else if (this.activeTab === 'scenes') {
      const sceneSubTabs = `
        <div class="scene-sub-tabs" style="
          display:flex; background:#0d0d15; flex-shrink:0;
          border-bottom:1px solid #222; padding:4px; gap:4px;
        ">
          <button class="scene-sub-btn" data-scene-sub="fases" style="
            flex:1; padding:5px 4px; border:none; border-radius:4px; cursor:pointer; font-size:0.45rem; font-weight:900;
            background:${this.activeSceneSubTab === 'fases' ? 'rgba(76,255,136,0.15)' : 'transparent'};
            color:${this.activeSceneSubTab === 'fases' ? '#4cff88' : '#555'};
            border:1px solid ${this.activeSceneSubTab === 'fases' ? '#4cff8844' : 'transparent'};
          ">∞ FASES</button>
          <button class="scene-sub-btn" data-scene-sub="scenes" style="
            flex:1; padding:5px 4px; border:none; border-radius:4px; cursor:pointer; font-size:0.45rem; font-weight:900;
            background:${this.activeSceneSubTab === 'scenes' ? 'rgba(255,255,255,0.15)' : 'transparent'};
            color:${this.activeSceneSubTab === 'scenes' ? '#fff' : '#555'};
            border:1px solid ${this.activeSceneSubTab === 'scenes' ? '#ffffff44' : 'transparent'};
          ">🎬 CENAS</button>
        </div>
      `;

      if (!this.phaseDialog) {
        this.phaseDialog = new PhaseDialog(state, callbacks);
      }

      const sceneContent = this.activeSceneSubTab === 'fases'
        ? this.renderFasesPanel(state, callbacks)
        : `<div id="section-scenes" style="flex:1; overflow:hidden;">${this.scenesGallery.render(state, {reRender:()=>{}})}</div>`;

      content = `
        <div style="display:flex; flex-direction:column; height:100%;">
          ${sceneSubTabs}
          <div style="flex:1; overflow:hidden;">${sceneContent}</div>
        </div>
      `;
    }

    else if (this.activeTab === 'a3') {
      const selObj = objects.find((o:any) => o.id === selectedId) || null;
      content = `<div id="section-params">${this.params.render(selObj, currentTime, state)}</div>`;
    }

    else if (this.activeTab === 'a4') {
      const safeCallbacks = this._callbacks?.reRender ? this._callbacks : { reRender: () => document.dispatchEvent(new CustomEvent('worldmap-objects-changed')) };
      content = `<div id="section-multistate">${this.multiState.render(objects.find((o:any) => o.id === selectedId), state, safeCallbacks)}</div>`;
    }

    else if (this.activeTab === 'a7') {
      content = `<div id="section-camera" style="height:100%; overflow:auto;">${this.cameraPanel.render(state, callbacks)}</div>`;
    }

    else if (this.activeTab === 'a8') {
      const safeCallbacks = this._callbacks?.reRender ? this._callbacks : { reRender: () => document.dispatchEvent(new CustomEvent('worldmap-objects-changed')) };
      content = `<div id="section-stamp" style="height:100%; overflow:auto;">${this.stampPanel.render(state, safeCallbacks)}</div>`;
    }

    else if (this.activeTab === 'a9') {
      const safeCallbacks = this._callbacks?.reRender ? this._callbacks : { reRender: () => document.dispatchEvent(new CustomEvent('worldmap-objects-changed')) };
      content = `<div id="section-light" style="height:100%; overflow:auto;">${this.lightPanel.render(objects.find((o:any) => o.id === selectedId), state, safeCallbacks)}</div>`;
    }

    else {
      content = `<div style="padding:40px; text-align:center; opacity:0.2; font-size:0.8rem;">Selecione uma aba</div>`;
    }

    return `
      <div style="height:100%; display:flex; flex-direction:column; background:#0a0a0f;">
        <div style="padding:8px 6px; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; gap:3px; background:rgba(0,0,0,0.4); flex-wrap:nowrap; overflow-x:auto;">
          ${tabs.map(tab => `
            <button class="menu-tab-btn" data-tab="${tab.id}" style="
              flex:1; min-width:70px; padding:8px 6px; border:none; border-radius:6px; cursor:pointer; font-size:0.5rem; font-weight:900;
              background:${this.activeTab === tab.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)'};
              color:${this.activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.35)'};
              border:1px solid ${this.activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'};
              transition:all 0.2s;
              white-space:nowrap;
              text-overflow:ellipsis;
            ">${tab.label}</button>
          `).join('')}
        </div>
        <div style="flex:1; overflow:hidden; position:relative;">
          ${content}
        </div>
      </div>
    `;
  }

  private renderFasesPanel(state: any, _callbacks: any): string {
    const presets = state.phasePresets || [];
    const currentPhase = state.currentPhase;

    return `
      <div style="padding:12px; height:100%; display:flex; flex-direction:column; background:#0a0a0f;">
        <div style="font-size:0.65rem; color:#4cff88; font-weight:900; margin-bottom:10px; letter-spacing:1px; text-transform:uppercase;">∞ FASES SALVAS</div>
        <div style="display:flex; gap:4px; margin-bottom:10px;">
          <button id="fases-open-dialog" style="flex:1; padding:8px; background:rgba(76,255,136,0.1); border:1px solid rgba(76,255,136,0.2); border-radius:6px; color:#4cff88; font-size:0.55rem; font-weight:900; cursor:pointer;">🎮 Abrir Ferramenta Fases</button>
          <button id="fases-save-preset" style="flex:1; padding:8px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); border-radius:6px; color:#fff; font-size:0.55rem; font-weight:900; cursor:pointer;">💾 Salvar Preset</button>
        </div>
        ${presets.length > 0 ? presets.map((p:any, i:number) => `<div class="phase-preset-item" data-idx="${i}" style="padding:8px; background:rgba(74,158,255,0.05); border:1px solid rgba(74,158,255,0.1); border-radius:4px; margin-bottom:4px; cursor:pointer;">${p.name}</div>`).join('') : ''}
      </div>
    `;
  }

  public bind(container: HTMLElement, state: any, callbacks: any) {
    this._callbacks = callbacks;

    container.querySelectorAll('.menu-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = (btn as HTMLElement).dataset.tab!;
        callbacks.reRender();
      });
    });

    container.querySelectorAll('.asset-sub-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeAssetSubTab = (btn as HTMLElement).dataset.sub!;
        callbacks.reRender();
      });
    });

    container.querySelectorAll('.scene-sub-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeSceneSubTab = (btn as HTMLElement).dataset.sceneSub!;
        callbacks.reRender();
      });
    });

    if (this.activeTab === 'layers') {
      const wrap = container.querySelector('#section-layers') as HTMLElement;
      if (wrap) this.artboardsPanel.bind(wrap, state, callbacks);
    }

    if (this.activeTab === 'assets') {
      if (this.activeAssetSubTab === 'library') {
        const wrap = container.querySelector('#section-asset-library') as HTMLElement;
        if (wrap) this.assetLibrary.bind(wrap, state, {
           onSelect: (url: string) => document.dispatchEvent(new CustomEvent('quick-insert-asset', { detail: { url } })),
           onUpload: () => callbacks.onUpload?.()
        });
      } else {
        const wrap = container.querySelector('#section-sprites') as HTMLElement;
        if (wrap) this.spriteLibrary.bind(wrap, state, (pack) => {
           document.dispatchEvent(new CustomEvent('quick-insert-sprite', { detail: { pack } }));
        });
      }
    }

    if (this.activeTab === 'scenes') {
      if (this.activeSceneSubTab === 'scenes') {
        const wrap = container.querySelector('#section-scenes') as HTMLElement;
        if (wrap) this.scenesGallery.bind(wrap, { reRender: () => callbacks.reRender(), savedScenes: [] }, callbacks);
      }
      container.querySelector('#fases-open-dialog')?.addEventListener('click', () => {
        this.phaseDialog?.open();
      });
    }

    if (this.activeTab === 'a3') {
       const wrap = container.querySelector('#section-params') as HTMLElement;
       if (wrap) this.params.bind(wrap, (props) => {
          const sel = state.worldMapObjects?.find((o: any) => o.id === (state.selectedId || state.selectedIds?.[0]));
          if (!sel) return;
          for (const key in props) {
            const v = props[key];
            if (key === 'spriteData' && v) sel.charData = this.convertPackToCharData(v);
            sel[key] = v;
          }
          callbacks.reRender();
       }, callbacks);
    }

    if (this.activeTab === 'a4') {
       const wrap = container.querySelector('#section-multistate') as HTMLElement;
       if (wrap) {
         const selectedObj = state.worldMapObjects?.find((o: any) => o.id === (state.selectedId || state.selectedIds?.[0]));
         this.multiState.bind(wrap, selectedObj, state, callbacks);
       }
    }

    if (!(window as any).__menuMapEventsBound) {
      (window as any).__menuMapEventsBound = true;
      this._eventsBound = true;
      document.addEventListener('open-menu-tab', ((e: any) => {
        if (this.activeTab === e.detail.tab) return;
        this.activeTab = e.detail.tab;
        this._callbacks.reRender?.();
      }) as EventListener);

      document.addEventListener('worldmap-switch-tool', ((e: any) => {
        const tool = e.detail?.tool;
        if (tool === 'stamp' && this.activeTab !== 'a8') {
          this.activeTab = 'a8';
          this._callbacks.reRender?.();
        }
        if (tool === 'light' && this.activeTab !== 'a9') {
          this.activeTab = 'a9';
          this._callbacks.reRender?.();
        }
      }) as EventListener);
    } else {
      this._eventsBound = true;
    }

    const lastSelectedId = state._lastSelectedId || null;
    const currentSelectedId = state.selectedId || (state.selectedIds?.[0] || null);
    if (currentSelectedId && currentSelectedId !== lastSelectedId) {
      const obj = state.worldMapObjects?.find((o: any) => o.id === currentSelectedId);
      const objType = obj?.type;
      let targetTab: string | null = null;
      
      if (objType === 'camera') targetTab = 'a7';
      else if (objType === 'character') targetTab = 'a3';
      else if (objType === 'collision' || objType === 'sensor') targetTab = 'a4';
      
      if (targetTab && targetTab !== this.activeTab) {
        this.activeTab = targetTab;
        state._lastSelectedId = currentSelectedId;
        callbacks.reRender();
        return;
      }
    }

    const hasCamera = (state.worldMapObjects || []).some((o: any) => o.type === 'camera');
    if (!hasCamera && this.activeTab === 'a7') {
      this.activeTab = 'layers';
    }

    if (this.activeTab === 'a7') {
      const wrap = container.querySelector('#section-camera') as HTMLElement;
      if (wrap) this.cameraPanel.bind(wrap, state, callbacks);
    }

    if (this.activeTab === 'a8') {
      const wrap = container.querySelector('#section-stamp') as HTMLElement;
      if (wrap) this.stampPanel.bind(wrap, state, callbacks);
    }

    if (this.activeTab === 'a9') {
      const wrap = container.querySelector('#section-light') as HTMLElement;
      if (wrap) this.lightPanel.bind(wrap, state, callbacks);
    }
  }

  private convertPackToCharData(pack: any): any {
    const charData: any = { _currentDir: 'down' };
    const mapAction = (search: string, targetSection: string) => {
      const act = pack.actions?.find((a: any) => a.name.toLowerCase().includes(search.toLowerCase()));
      if (act && act.directions) {
        charData[targetSection] = {};
        ['up', 'down', 'left', 'right'].forEach(dir => {
          const dData = act.directions[dir];
          if (dData) {
            const isGifType = dData.type === 'gif';
            charData[targetSection][dir] = {
              asset: dData.type === 'png' ? (dData.frames?.[0] || '') : (dData.gifUrl || dData.videoUrl || ''),
              frames: dData.frames && dData.frames.length > 0 ? dData.frames : (isGifType ? [dData.gifUrl || '', dData.gifUrl || '', dData.gifUrl || '', dData.gifUrl || '', dData.gifUrl || '', dData.gifUrl || '', dData.gifUrl || '', dData.gifUrl || ''] : []),
              frameRate: dData.frameRate || 100,
              animType: dData.type,
              isGif: isGifType
            };
          }
        });
      }
    };
    mapAction('idle', 'idle');
    mapAction('walk', 'move');
    mapAction('andar', 'move');
    return charData;
  }
}
