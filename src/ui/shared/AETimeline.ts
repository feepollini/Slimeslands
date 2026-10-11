import { ArtboardsPanel } from '../screens/forge_v2/tabs/quest_maker/world_map/panels/ArtboardsPanel';

export class AETimeline {
  private _artboardsPanel: ArtboardsPanel | null = null;
  private state: {
    currentTime: number;
    duration: number;
    frameRate: number;
    zoom: number;
    playbackState: 'stopped' | 'playing' | 'paused';
    playLoop: boolean;
    snapToFrames: boolean;
    workAreaStart: number;
    workAreaEnd: number;
    showGraphEditor: boolean;
    soloMode: boolean;
  };
  private container: HTMLElement | null = null;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private isDraggingPlayhead = false;
  private isDraggingKeyframe: { layerId: string; prop: string; kfIdx: number; startX: number; origT: number } | null = null;
  private isDraggingInOut: { layerId: string; handle: 'in' | 'out'; startX: number; origVal: number } | null = null;
  private isDraggingSlider: { layerId: string; prop: string; min: number; max: number; step: number; startX: number; origVal: number } | null = null;
  private isDraggingWorkArea: { handle: 'start' | 'end' | 'bar'; startX: number; origStart: number; origEnd: number } | null = null;
  private isDraggingComp: { layerId: string; startX: number; origIn: number; origOut: number } | null = null;
  private _state: any = {};
  private _objects: any[] = [];
  private _keydownBound = false;
  private _externalEventsBound = false;
  private _clickHandler: ((e: any) => void) | null = null;
  private _inputHandler: ((e: any) => void) | null = null;
  private _dblclickHandler: ((e: any) => void) | null = null;
  private _mousedownHandler: ((e: any) => void) | null = null;
  private _mousemoveHandler: ((e: any) => void) | null = null;
  private _mouseupHandler: (() => void) | null = null;
  private _contextHandler: ((e: any) => void) | null = null;
  private _wheelHandler: ((e: any) => void) | null = null;
  private _playheadMousemove: any = null;
  private _playheadMouseup: any = null;
  private _rulerMousedown: any = null;
  private _mouseEventsBound = false;
  private _playheadEventsBound = false;

  private readonly LAYER_PANEL_WIDTH = 320;
  private readonly LAYER_ROW_H = 36;
  private readonly PARAMS_ROW_H = 28;
  private readonly RULER_H = 32;
  private readonly WORK_AREA_H = 12;

  private readonly PROP_DEFS = [
    { key:'x', label:'Position X', color:'#ff4466', min:-2000, max:4000, step:1, mul:1, unit:'px' },
    { key:'y', label:'Position Y', color:'#44ccff', min:-2000, max:4000, step:1, mul:1, unit:'px' },
    { key:'w', label:'Width', color:'#51c5ff', min:0, max:4000, step:1, mul:1, unit:'px' },
    { key:'h', label:'Height', color:'#51c5ff', min:0, max:4000, step:1, mul:1, unit:'px' },
    { key:'scaleX', label:'Scale X', color:'#ff9500', min:0.01, max:5, step:0.01, mul:100, unit:'%' },
    { key:'scaleY', label:'Scale Y', color:'#ff9500', min:0.01, max:5, step:0.01, mul:100, unit:'%' },
    { key:'rotation', label:'Rotation', color:'#a78bfa', min:-360, max:360, step:0.1, mul:1, unit:'°' },
    { key:'opacity', label:'Opacity', color:'#4cff88', min:0, max:100, step:1, mul:100, unit:'%' },
    { key:'pivotX', label:'Anchor X', color:'#ffd700', min:0, max:1, step:0.01, mul:1, unit:'' },
    { key:'pivotY', label:'Anchor Y', color:'#ffd700', min:0, max:1, step:0.01, mul:1, unit:'' },
  ];

  constructor() {
    this.state = {
      currentTime: 0, duration: 60, frameRate: 30, zoom: 40,
      playbackState: 'stopped', playLoop: true, snapToFrames: true,
      workAreaStart: 0, workAreaEnd: 60, showGraphEditor: false, soloMode: false
    };
  }

  private get gs(): any { return (window as any).__questMakerState; }
  private get objs(): any[] { return this.gs?.worldMapObjects || []; }
  private get sels(): string[] { return this.gs?.selectedIds || []; }
  private get exp(): string[] { return this.gs?.expandedLayerIds || []; }

  getCurrentTime(): number { return this.state.currentTime; }
  
  // ===================== INTERPOLATION ENGINE =====================

  getValueAtTime(obj: any, prop: string, time: number): number {
    const track = obj.keyframes?.[prop];
    if (!track || !track.keyframes || track.keyframes.length === 0) return obj[prop] ?? 0;
    const kfs = [...track.keyframes].sort((a: any, b: any) => a.t - b.t);
    if (time <= kfs[0].t) return kfs[0].v;
    if (time >= kfs[kfs.length - 1].t) return kfs[kfs.length - 1].v;
    for (let i = 0; i < kfs.length - 1; i++) {
      if (time >= kfs[i].t && time <= kfs[i + 1].t) return this._interp(kfs[i], kfs[i + 1], time);
    }
    return kfs[0].v;
  }

  applyInterpolatedValues(time: number): void {
    let childMoved = false;
    
    // First pass: apply keyframe values to all objects and sync children
    for (const obj of this.objs) {
      if (!obj.keyframes) continue;
      
      // Get previous values before updating
      const prevX = obj.x;
      const prevY = obj.y;
      const prevRotation = obj.rotation;
      const prevScaleX = obj.scaleX;
      const prevScaleY = obj.scaleY;
      
      for (const def of this.PROP_DEFS) {
        const track = obj.keyframes[def.key];
        if (!track || !track.active || !track.keyframes || track.keyframes.length === 0) continue;
        obj[def.key] = this.getValueAtTime(obj, def.key, time);
      }
      
      // Sync children when parent moves
      const children = this.objs.filter((o: any) => o.parentId === obj.id);
      if (children.length > 0 && prevX !== undefined) {
        const dx = (obj.x || 0) - prevX;
        const dy = (obj.y || 0) - prevY;
        const dRot = (obj.rotation || 0) - (prevRotation || 0);
        const dScaleX = (obj.scaleX || 1) - (prevScaleX || 1);
        const dScaleY = (obj.scaleY || 1) - (prevScaleY || 1);
        
        if (dx !== 0 || dy !== 0 || dRot !== 0 || dScaleX !== 0 || dScaleY !== 0) {
          for (const child of children) {
            child.x = (child.x || 0) + dx;
            child.y = (child.y || 0) + dy;
            if (dRot !== 0) child.rotation = (child.rotation || 0) + dRot;
            if (dScaleX !== 0) child.scaleX = (child.scaleX || 1) + dScaleX;
            if (dScaleY !== 0) child.scaleY = (child.scaleY || 1) + dScaleY;
          }
          childMoved = true;
        }
      }
    }
    
    // Force render update if children were moved
    if (childMoved) {
      document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
    }
  }

  private _interp(a: any, b: any, time: number): number {
    const dur = b.t - a.t;
    if (dur === 0) return a.v;
    const t = (time - a.t) / dur;
    let ease: number;
    switch (a.interp || 'linear') {
      case 'hold': return a.v;
      case 'ease-in': ease = t * t; break;
      case 'ease-out': ease = 1 - (1 - t) * (1 - t); break;
      case 'ease-in-out': ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; break;
      default: ease = t;
    }
    return a.v + (b.v - a.v) * ease;
  }

  // ===================== PLAYBACK =====================

  setCurrentTime(time: number): void {
    this.state.currentTime = Math.max(0, Math.min(time, this.state.duration));
    if (this.gs) this.gs.currentTime = this.state.currentTime;
    this.applyInterpolatedValues(this.state.currentTime);
    this.updatePlayheadDOM();
    document.dispatchEvent(new CustomEvent('worldmap-time-changed', { detail: { time: this.state.currentTime } }));
  }

  setWorldMapData(_o: any[], _s: string[], ct: number): void {
    this.state.currentTime = ct;
    if (this.gs) this.gs.currentTime = ct;
    this._objects = _o;
    this._state = this.gs || {};
    if (this.container) { this.container.innerHTML = this.render(); this.bindEvents(); }
  }

  play(): void {
    if (this.state.playbackState === 'playing') return;
    this.state.playbackState = 'playing';
    this.lastFrameTime = performance.now();
    this._playLoop();
  }
  pause(): void {
    this.state.playbackState = 'paused';
    if (this.animationFrameId) { cancelAnimationFrame(this.animationFrameId); this.animationFrameId = null; }
  }
  stop(): void {
    this.state.playbackState = 'stopped'; this.state.currentTime = 0;
    if (this.gs) this.gs.currentTime = 0;
    if (this.animationFrameId) { cancelAnimationFrame(this.animationFrameId); this.animationFrameId = null; }
    this.updatePlayheadDOM();
  }
  togglePlayPause(): void { this.state.playbackState === 'playing' ? this.pause() : this.play(); }
  goToStart(): void { this.setCurrentTime(0); }
  goToEnd(): void { this.setCurrentTime(this.state.duration); }
  stepForward(): void { this.setCurrentTime(this.state.currentTime + 1 / this.state.frameRate); }
  stepBackward(): void { this.setCurrentTime(this.state.currentTime - 1 / this.state.frameRate); }
  setZoom(z: number): void { this.state.zoom = Math.max(10, Math.min(200, z)); this.reRender(); }

  private _playLoop(): void {
    const loop = (now: number) => {
      if (this.state.playbackState !== 'playing') return;
      const dt = (now - this.lastFrameTime) / 1000;
      this.state.currentTime += dt;
      this.lastFrameTime = now;
      if (this.state.currentTime >= this.state.duration) {
        if (this.state.playLoop) this.state.currentTime = 0;
        else { this.state.currentTime = this.state.duration; this.pause(); return; }
      }
      if (this.gs) this.gs.currentTime = this.state.currentTime;
      this.applyInterpolatedValues(this.state.currentTime);
      this.updatePlayheadDOM();
      document.dispatchEvent(new CustomEvent('worldmap-time-changed', { detail: { time: this.state.currentTime } }));
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  // ===================== HELPERS =====================

  private _typeColor(type: string): string {
    const c: any = { player:'#4cff88', morph:'#4a9eff', collision:'#ff4444', area_sensor:'#44ccff', group:'#a78bfa', stamp_layer:'#ffd700', vector:'#ff9500', camera:'#ff3366' };
    return c[type] || '#555';
  }
  private _typeIcon(type: string): string {
    const m: any = { player:'👤', morph:'🖼️', collision:'🧱', area_sensor:'📡', group:'📂', stamp_layer:'🔖', vector:'🖊️', camera:'📷' };
    return m[type] || '⬡';
  }
  private _timecode(time: number): string {
    const tf = Math.floor(time * this.state.frameRate);
    const fr = tf % Math.floor(this.state.frameRate);
    const s = Math.floor(tf / this.state.frameRate) % 60;
    const m = Math.floor(tf / this.state.frameRate / 60);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}:${String(fr).padStart(2,'0')}`;
  }
  private _hasAnim(obj: any, prop: string): boolean { return obj.keyframes?.[prop]?.keyframes?.length > 0; }
  private _isPropActive(obj: any, prop: string): boolean { return obj.keyframes?.[prop]?.active === true; }
  private _kfCount(obj: any, prop: string): number { return obj.keyframes?.[prop]?.keyframes?.length || 0; }

  // ===================== RENDER =====================

  render(): string {
    const objects = this.objs;
    const sels = this.sels;
    const expanded = this.exp;
    const totalW = this.state.duration * this.state.zoom;
    const totalH = this._calcH(objects, expanded);
    const playing = this.state.playbackState === 'playing';
    const tc = this._timecode(this.state.currentTime);
    const waStart = this.state.workAreaStart * this.state.zoom;
    const waEnd = this.state.workAreaEnd * this.state.zoom;
    const waWidth = waEnd - waStart;

    return `
      <div class="ae-timeline" style="display:flex;flex-direction:column;height:100%;background:#0a0a0e;color:#ccc;font-family:'Inter',system-ui,sans-serif;font-size:12px;user-select:none;overflow:hidden;">
        <!-- TOOLBAR -->
        <div style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:#131318;border-bottom:1px solid #1e1e26;flex-shrink:0;">
          <div style="display:flex;gap:2px;">
            <button class="ae-btn" data-action="goToStart" style="width:30px;height:26px;background:#1a1a22;border:1px solid #2a2a34;border-radius:3px;color:#888;cursor:pointer;font-size:11px;">⏮</button>
            <button class="ae-btn" data-action="stepBackward" style="width:28px;height:26px;background:#1a1a22;border:1px solid #2a2a34;border-radius:3px;color:#888;cursor:pointer;font-size:10px;">◀</button>
            <button class="ae-btn" data-action="togglePlay" style="width:36px;height:26px;background:${playing?'#4a9eff':'#1a1a22'};border:1px solid ${playing?'#4a9eff':'#2a2a34'};border-radius:3px;color:#fff;cursor:pointer;font-size:12px;">${playing?'⏸':'▶'}</button>
            <button class="ae-btn" data-action="stepForward" style="width:28px;height:26px;background:#1a1a22;border:1px solid #2a2a34;border-radius:3px;color:#888;cursor:pointer;font-size:10px;">▶</button>
            <button class="ae-btn" data-action="goToEnd" style="width:30px;height:26px;background:#1a1a22;border:1px solid #2a2a34;border-radius:3px;color:#888;cursor:pointer;font-size:11px;">⏭</button>
          </div>
          <div style="background:#08080c;padding:4px 12px;border-radius:4px;border:1px solid #1e1e26;font-family:'SF Mono','Fira Code',monospace;font-size:13px;color:#4a9eff;letter-spacing:1px;min-width:75px;text-align:center;">${tc}</div>
          <div style="flex:1;"></div>
          <button class="ae-btn" data-action="add-keyframe" style="padding:4px 12px;background:rgba(74,158,255,0.12);border:1px solid rgba(74,158,255,0.25);border-radius:4px;color:#4a9eff;cursor:pointer;font-size:10px;font-weight:700;">◆ KEY</button>
          <button class="ae-btn" data-action="delete-keyframe" style="padding:4px 12px;background:rgba(255,68,68,0.08);border:1px solid rgba(255,68,68,0.15);border-radius:4px;color:#ff4444;cursor:pointer;font-size:10px;font-weight:700;">✕ DEL</button>
          <button class="ae-btn" data-action="cut-comp" style="padding:4px 12px;background:rgba(255,149,0,0.1);border:1px solid rgba(255,149,0,0.2);border-radius:4px;color:#ff9500;cursor:pointer;font-size:10px;font-weight:700;">✂ Cut</button>
          <div style="width:1px;height:18px;background:#1e1e26;margin:0 4px;"></div>
          <button class="ae-btn" data-action="zoomOut" style="width:26px;height:26px;background:#1a1a22;border:1px solid #2a2a34;border-radius:3px;color:#888;cursor:pointer;font-size:13px;">−</button>
          <span style="color:#666;font-size:11px;min-width:35px;text-align:center;">${Math.round(this.state.zoom)}%</span>
          <button class="ae-btn" data-action="zoomIn" style="width:26px;height:26px;background:#1a1a22;border:1px solid #2a2a34;border-radius:3px;color:#888;cursor:pointer;font-size:13px;">+</button>
          <div style="width:1px;height:18px;background:#1e1e26;margin:0 4px;"></div>
          <button class="ae-btn" data-action="toggleSnap" style="padding:4px 8px;background:${this.state.snapToFrames?'rgba(76,255,136,0.1)':'#1a1a22'};border:1px solid ${this.state.snapToFrames?'rgba(76,255,136,0.3)':'#2a2a34'};border-radius:3px;color:${this.state.snapToFrames?'#4cff88':'#666'};cursor:pointer;font-size:10px;font-weight:700;">SNAP</button>
          <button class="ae-btn" data-action="toggleLoop" style="padding:4px 8px;background:${this.state.playLoop?'rgba(76,255,136,0.1)':'#1a1a22'};border:1px solid ${this.state.playLoop?'rgba(76,255,136,0.3)':'#2a2a34'};border-radius:3px;color:${this.state.playLoop?'#4cff88':'#666'};cursor:pointer;font-size:10px;font-weight:700;">LOOP</button>
          <div style="width:1px;height:18px;background:#1e1e26;margin:0 4px;"></div>
          <button class="ae-btn" data-action="save-scene" style="padding:4px 8px;background:rgba(81,197,255,0.1);border:1px solid rgba(81,197,255,0.2);border-radius:3px;color:#51c5ff;cursor:pointer;font-size:9px;font-weight:700;">💾 SAVE</button>
          <button class="ae-btn" data-action="load-scene" style="padding:4px 8px;background:rgba(167,139,250,0.1);border:1px solid rgba(167,139,250,0.2);border-radius:3px;color:#a78bfa;cursor:pointer;font-size:9px;font-weight:700;">📂 LOAD</button>
        </div>

        <!-- BODY -->
        <div style="flex:1;display:flex;overflow:hidden;">
          <!-- LEFT PANEL - Delegado para ArtboardsPanel -->
          <div id="ae-layers-panel-wrapper" style="width:${this.LAYER_PANEL_WIDTH}px;flex-shrink:0;display:flex;flex-direction:column;background:#111115;border-right:1px solid #1a1a20;">
          </div>

          <!-- RIGHT: TRACKS -->
          <div class="ae-tracks-scroll" style="flex:1;overflow:auto;position:relative;">
            <!-- Time Ruler (sticky top, scrolls horizontally with tracks) -->
            <div class="ae-ruler" style="height:${this.RULER_H}px;min-width:${totalW}px;background:#0c0c10;border-bottom:1px solid #1a1a20;position:sticky;top:0;z-index:10;">
              ${this._rulerContent(totalW)}
              <div class="ae-ruler-playhead" style="position:absolute;left:${this.state.currentTime*this.state.zoom}px;top:0;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #ff3366;z-index:10;"></div>
            </div>
            <div class="ae-tracks-canvas" style="position:relative;min-width:${totalW}px;min-height:${totalH}px;">
              <!-- Composition Tracks -->
              ${this._compTracks(objects, expanded)}
              <!-- Work Area Bar -->
              <div style="position:absolute;top:0;left:0;width:${totalW}px;height:${this.WORK_AREA_H}px;background:#08080c;border-bottom:1px solid #1a1a20;z-index:5;">
                <div style="position:absolute;left:${waStart}px;top:0;width:${waWidth}px;height:100%;background:rgba(74,158,255,0.08);border-left:2px solid rgba(74,158,255,0.3);border-right:2px solid rgba(74,158,255,0.3);"></div>
                <div class="ae-wa-handle" data-handle="start" style="position:absolute;left:${waStart-4}px;top:0;width:8px;height:100%;background:#4a9eff;cursor:ew-resize;border-radius:2px;"></div>
                <div class="ae-wa-handle" data-handle="end" style="position:absolute;left:${waEnd-4}px;top:0;width:8px;height:100%;background:#4a9eff;cursor:ew-resize;border-radius:2px;"></div>
              </div>
              <!-- Playhead -->
              <div class="ae-playhead" style="position:absolute;left:${this.state.currentTime*this.state.zoom}px;top:0;width:2px;height:${totalH}px;background:#ff3366;z-index:200;pointer-events:none;">
                <div style="position:absolute;top:-2px;left:-7px;width:16px;height:12px;background:#ff3366;clip-path:polygon(0 0,100% 0,50% 100%);"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private _calcH(objects: any[], expanded: string[]): number {
    let h = this.WORK_AREA_H + this.RULER_H + 10;
    for (const obj of objects) {
      h += this.LAYER_ROW_H + 2;
      if (expanded.includes(obj.id)) {
        h += this.PROP_DEFS.length * (this.PARAMS_ROW_H + 1);
      }
    }
    return h;
  }

  // ===================== LAYER ROW + INLINE PARAMS =====================

  private _layerRowWithParams(obj: any, _i: number, sels: string[], expanded: string[]): string {
    const sel = sels.includes(obj.id);
    const vis = obj.isVisible !== false;
    const lock = obj.isLocked === true;
    const loop = obj.isLooping !== false; // Default true if undefined
    const tc = this._typeColor(obj.type);
    const isExp = expanded.includes(obj.id);
    const inPt = obj.inPoint ?? 0;
    const outPt = obj.outPoint ?? this.state.duration;
    const hasParent = !!obj.parentId;

    let html = `
      <div class="ae-layer-row ${sel?'sel':''}" data-id="${obj.id}" style="height:${this.LAYER_ROW_H}px;display:flex;align-items:center;padding:0 6px;border-bottom:1px solid #151520;background:${sel?'rgba(74,158,255,0.08)':'transparent'};cursor:pointer;gap:3px;">
        <button class="ae-vis" data-id="${obj.id}" style="width:18px;height:18px;background:none;border:none;color:${vis?'#777':'#333'};cursor:pointer;font-size:11px;flex-shrink:0;">${vis?'👁':'–'}</button>
        <button class="ae-lock" data-id="${obj.id}" style="width:18px;height:18px;background:none;border:none;color:${lock?'#f55':'#333'};cursor:pointer;font-size:10px;flex-shrink:0;">${lock?'🔒':'·'}</button>
        <button class="ae-loop-toggle" data-id="${obj.id}" title="Looping" style="width:18px;height:18px;background:none;border:none;color:${loop?'#4cff88':'#444'};cursor:pointer;font-size:10px;flex-shrink:0;">🔄</button>
        <div style="width:4px;height:18px;background:${tc};border-radius:2px;flex-shrink:0;"></div>
        <span style="font-size:11px;flex-shrink:0;">${this._typeIcon(obj.type)}</span>
        ${hasParent ? '<span style="font-size:9px;flex-shrink:0;color:#4cff88;" title="Vinculado">🔗</span>' : ''}
        <span style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:11px;color:${vis?'#ccc':'#555'};font-weight:600;">${obj.label||obj.type}</span>
        <span style="font-size:8px;color:#444;font-family:'SF Mono',monospace;">${inPt.toFixed(1)}–${outPt.toFixed(1)}</span>
        <button class="ae-exp" data-id="${obj.id}" style="width:18px;height:18px;background:none;border:none;color:#666;cursor:pointer;font-size:10px;flex-shrink:0;transform:${isExp?'rotate(90deg)':'rotate(0)'};transition:0.15s;">▶</button>
      </div>
    `;

    // Inline params panel when layer is expanded
    if (isExp) {
      html += this._inlineParams(obj);
    }

    return html;
  }

  private _inlineParams(obj: any): string {
    const rows: string[] = [];
    rows.push(`<div style="padding:4px 10px;font-size:8px;font-weight:800;color:#555;letter-spacing:1px;text-transform:uppercase;background:#0c0c10;border-bottom:1px solid #151520;">Transform</div>`);

    for (const d of this.PROP_DEFS) {
      const raw = this.getValueAtTime(obj, d.key, this.state.currentTime);
      const dv = Math.round((raw * d.mul) * 100) / 100;
      const pct = Math.max(0, Math.min(100, ((raw - d.min) / (d.max - d.min)) * 100));
      const hasKf = this._hasAnim(obj, d.key);
      const active = this._isPropActive(obj, d.key);
      const kfCount = this._kfCount(obj, d.key);
      const kfDot = hasKf ? (active ? '#4a9eff' : '#ffd700') : '#333';

      rows.push(`
        <div style="display:flex;align-items:center;gap:4px;padding:4px 10px;border-bottom:1px solid #121218;background:#0e0e12;">
          <span class="tl-kf-toggle" data-prop="${d.key}" data-layer="${obj.id}" style="cursor:pointer;font-size:11px;color:${kfDot};width:16px;text-align:center;flex-shrink:0;">${hasKf?'◆':'◇'}</span>
          <span style="font-size:9px;color:#888;width:64px;flex-shrink:0;">${d.label}</span>
          <div class="tl-slider-track" data-prop="${d.key}" data-layer="${obj.id}" data-min="${d.min}" data-max="${d.max}" style="flex:1;height:8px;background:#1a1a22;border-radius:4px;position:relative;cursor:pointer;">
            <div style="position:absolute;top:0;left:0;height:100%;width:${pct}%;background:${d.color}40;border-radius:4px;"></div>
            <div class="tl-slider-thumb" data-prop="${d.key}" data-layer="${obj.id}" data-min="${d.min}" data-max="${d.max}" style="position:absolute;top:50%;left:${pct}%;width:14px;height:14px;background:${d.color};border:2px solid #111;border-radius:50%;transform:translate(-50%,-50%);cursor:grab;"></div>
          </div>
          <input type="number" class="tl-num" data-prop="${d.key}" data-layer="${obj.id}" value="${dv}" step="${d.step}" style="width:50px;background:#08080c;border:1px solid #1a1a22;color:${d.color};font-size:9px;padding:3px 4px;text-align:right;font-family:'SF Mono',monospace;border-radius:3px;">
          <span style="font-size:8px;color:#444;width:16px;flex-shrink:0;">${d.unit}</span>
          ${hasKf?`<span style="font-size:8px;color:#555;">${kfCount}kf</span>`:''}
        </div>
      `);
    }
    return rows.join('');
  }

  // ===================== TIME RULER =====================

  private _rulerContent(_totalW: number): string {
    const marks: string[] = [];
    const step = this.state.zoom > 80 ? 0.5 : this.state.zoom > 40 ? 1 : this.state.zoom > 20 ? 2 : 5;
    for (let t = 0; t <= this.state.duration; t += step) {
      const x = t * this.state.zoom;
      marks.push(`<div style="position:absolute;left:${x}px;top:0;width:1px;height:100%;background:#161620;"></div>`);
      if (t % (step * (this.state.zoom > 60 ? 2 : this.state.zoom > 30 ? 3 : 5)) < 0.01) {
        marks.push(`<div style="position:absolute;left:${x+2}px;top:4px;color:#4a4a55;font-size:9px;font-family:'SF Mono',monospace;">${t.toFixed(step<1?1:0)}s</div>`);
      }
    }
    return marks.join('');
  }

  private _compTracks(objects: any[], expanded: string[]): string {
    let y = this.WORK_AREA_H + this.RULER_H;
    const parts: string[] = [];

    const visibleObjects = objects.filter(o => o.type === 'morph' || o.type === 'player' || o.type === 'image' || o.type === 'collision' || o.type === 'area_sensor' || o.type === 'sensor' || o.type === 'vector' || o.type === 'camera' || o.type === 'group' || o.type === 'phase' || o.type === 'stamp_layer');
    for (const obj of visibleObjects) {
      const sel = this.sels.includes(obj.id);
      const tc = this._typeColor(obj.type);
      const isExp = expanded.includes(obj.id);
      const rowH = this.LAYER_ROW_H + 2;
      const inPt = obj.inPoint ?? 0;
      const outPt = obj.outPoint ?? (obj.inPoint !== undefined ? obj.inPoint + 5 : this.state.duration);
      const barStart = inPt * this.state.zoom;
      const barWidth = (outPt - inPt) * this.state.zoom;

      // Track background
      parts.push(`<div class="ae-comp-track" data-id="${obj.id}" style="position:absolute;top:${y}px;left:0;height:${rowH}px;width:100%;background:${sel?'rgba(74,158,255,0.04)':'#0c0c10'};border-bottom:1px solid #141420;"></div>`);

      // Duration bar (draggable to reposition comp)
      parts.push(`<div class="ae-comp-bar" data-id="${obj.id}" style="position:absolute;top:${y+6}px;left:${barStart}px;width:${Math.max(barWidth,6)}px;height:${rowH-12}px;background:${tc}20;border:1px solid ${tc}50;border-radius:3px;cursor:grab;"></div>`);

      // In-point handle
      parts.push(`<div class="ae-io-handle" data-id="${obj.id}" data-handle="in" style="position:absolute;top:${y+3}px;left:${barStart-4}px;width:8px;height:${rowH-6}px;background:${tc};cursor:ew-resize;border-radius:2px 0 0 2px;opacity:0.8;"></div>`);

      // Out-point handle
      parts.push(`<div class="ae-io-handle" data-id="${obj.id}" data-handle="out" style="position:absolute;top:${y+3}px;left:${barStart+barWidth-4}px;width:8px;height:${rowH-6}px;background:${tc};cursor:ew-resize;border-radius:0 2px 2px 0;opacity:0.8;"></div>`);

      // Layer markers
      const markers = obj.markers || [];
      for (const mk of markers) {
        const mx = mk.time * this.state.zoom;
        parts.push(`<div class="ae-marker" data-id="${obj.id}" data-time="${mk.time}" style="position:absolute;top:${y}px;left:${mx}px;width:2px;height:${rowH}px;background:#ffd700;opacity:0.6;"></div>`);
        parts.push(`<div style="position:absolute;top:${y-2}px;left:${mx+4}px;font-size:8px;color:#ffd700;z-index:5;pointer-events:none;">${mk.label||''}</div>`);
      }

      // Keyframes on main track
      const allKfs: any[] = [];
      if (obj.keyframes) {
        for (const p of Object.keys(obj.keyframes)) {
          if (obj.keyframes[p].keyframes) allKfs.push(...obj.keyframes[p].keyframes.map((k:any)=>({...k, prop:p})));
        }
      }
      allKfs.sort((a: any, b: any) => a.t - b.t);

      for (const kf of allKfs) {
        const x = kf.t * this.state.zoom;
        const col = kf.interp === 'hold' ? '#ffd700' : '#4a9eff';
        const shape = kf.interp === 'hold' ? '0' : '2px';
        parts.push(`<div class="ae-kf" data-id="${obj.id}" data-prop="${kf.prop}" data-time="${kf.t}" style="position:absolute;left:${x}px;top:${y+rowH/2}px;transform:translate(-50%,-50%);width:9px;height:9px;background:${col};border:1.5px solid rgba(255,255,255,0.5);border-radius:${shape};cursor:grab;z-index:10;"></div>`);
      }

      y += rowH;

      // Expanded: sub-tracks with keyframes
      if (isExp) {
        for (const def of this.PROP_DEFS) {
          const track = obj.keyframes?.[def.key];
          const kfs = track?.keyframes || [];
          const active = track?.active === true;
          const subH = this.PARAMS_ROW_H + 1;

          parts.push(`<div class="ae-sub-track" data-id="${obj.id}" data-prop="${def.key}" style="position:absolute;top:${y}px;left:0;height:${subH}px;width:100%;background:#0a0a0e;border-bottom:1px solid #111118;${active?'border-left:3px solid '+def.color:''}"></div>`);

          // Connection lines
          if (kfs.length > 1) {
            const sorted = [...kfs].sort((a: any, b: any) => a.t - b.t);
            for (let i = 0; i < sorted.length - 1; i++) {
              const x1 = sorted[i].t * this.state.zoom;
              const x2 = sorted[i+1].t * this.state.zoom;
              parts.push(`<div style="position:absolute;left:${x1}px;top:${y+subH/2}px;width:${x2-x1}px;height:1px;background:${def.color}40;transform:translateY(-50%);"></div>`);
            }
          }

          // Keyframe diamonds
          for (let ki = 0; ki < kfs.length; ki++) {
            const kf = kfs[ki];
            const x = kf.t * this.state.zoom;
            const kfSel = kf.selected;
            const col = kf.interp === 'hold' ? '#ffd700' : def.color;
            let shape: string;
            switch(kf.interp) {
              case 'hold': shape = '0'; break;
              case 'ease-in': case 'ease-out': case 'ease-in-out': shape = '50%'; break;
              default: shape = '2px';
            }
            parts.push(`<div class="ae-kf" data-id="${obj.id}" data-prop="${def.key}" data-idx="${ki}" style="position:absolute;left:${x}px;top:${y+subH/2}px;transform:translate(-50%,-50%);width:10px;height:10px;background:${col};border:2px solid ${kfSel?'#fff':'rgba(255,255,255,0.6)'};border-radius:${shape};cursor:grab;z-index:10;${kfSel?'box-shadow:0 0 6px '+col:''};"></div>`);
          }

          y += subH;
        }
      }
    }
    return parts.join('');
  }

  private updatePlayheadDOM(): void {
    if (!this.container) return;
    const ph = this.container.querySelector('.ae-playhead') as HTMLElement;
    if (ph) ph.style.left = (this.state.currentTime * this.state.zoom) + 'px';
    const rp = this.container.querySelector('.ae-ruler-playhead') as HTMLElement;
    if (rp) rp.style.left = (this.state.currentTime * this.state.zoom) + 'px';
  }

  // ===================== BIND =====================

  bind(container: HTMLElement, state?: any, _cb?: any): void {
    this.container = container;
    this._state = state || this.gs || {};
    this._objects = this.objs;
    void _cb;
    this.bindEvents();
    
    // Create ArtboardsPanel instance for timeline layers panel
    const layersPanelWrap = container.querySelector('#ae-layers-panel-wrapper') as HTMLElement;
    if (layersPanelWrap) {
      if (!this._artboardsPanel) {
        this._artboardsPanel = new ArtboardsPanel();
      }
      layersPanelWrap.innerHTML = this._artboardsPanel.render(this._state, { reRender: () => this.reRender() });
      this._artboardsPanel.bind(layersPanelWrap, this._state, { reRender: () => this.reRender() });
    }
  }

  private reRender(): void {
    if (!this.container) return;
    this._objects = this.objs;
    this._state = this.gs || {};
    
    // Preserve ArtboardsPanel content before re-rendering
    const layersPanelWrap = this.container.querySelector('#ae-layers-panel-wrapper');
    const savedArtboardsContent = layersPanelWrap ? layersPanelWrap.innerHTML : '';
    
    this.container.innerHTML = this.render();
    
    // Restore ArtboardsPanel content after re-render
    const newLayersPanelWrap = this.container.querySelector('#ae-layers-panel-wrapper');
    if (newLayersPanelWrap && savedArtboardsContent) {
      newLayersPanelWrap.innerHTML = savedArtboardsContent;
      // Rebind events
      if (this._artboardsPanel) {
        this._artboardsPanel.bind(newLayersPanelWrap, this._state, { reRender: () => this.reRender() });
      }
    }
    
    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.container) return;
    if (this._clickHandler) this.container.removeEventListener('click', this._clickHandler);
    if (this._dblclickHandler) this.container.removeEventListener('dblclick', this._dblclickHandler);
    if (this._inputHandler) this.container.removeEventListener('input', this._inputHandler);
    if (this._contextHandler) this.container.removeEventListener('contextmenu', this._contextHandler);
    if (this._wheelHandler) this.container.removeEventListener('wheel', this._wheelHandler);
    if (this._mousedownHandler) { document.removeEventListener('mousedown', this._mousedownHandler); document.removeEventListener('mousemove', this._mousemoveHandler!); document.removeEventListener('mouseup', this._mouseupHandler!); }

    // Click
    this._clickHandler = (e: any) => {
      const t = e.target as HTMLElement;
      const btn = t.closest('.ae-btn') as HTMLElement;
      if (btn?.dataset.action) { e.stopPropagation(); this._doAction(btn.dataset.action); return; }
      const lh = t.closest('.ae-lh-btn') as HTMLElement;
      if (lh?.dataset.action) { e.stopPropagation(); this._doLayerAction(lh.dataset.action); return; }

      const vis = t.closest('.ae-vis') as HTMLElement;
      if (vis) { e.stopPropagation(); const o = this._objects.find((x:any)=>x.id===vis.dataset.id); if(o){o.isVisible=!o.isVisible;this._dispatch();} return; }
      const lk = t.closest('.ae-lock') as HTMLElement;
      if (lk) { e.stopPropagation(); const o = this._objects.find((x:any)=>x.id===lk.dataset.id); if(o){o.isLocked=!o.isLocked;this._dispatch();} return; }
      
      const lp = t.closest('.ae-loop-toggle') as HTMLElement;
      if (lp) { 
        e.stopPropagation(); 
        const o = this._objects.find((x:any)=>x.id===lp.dataset.id); 
        if(o){
          o.isLooping = (o.isLooping === undefined) ? false : !o.isLooping;
          this.reRender(); 
          this._dispatch();
        } 
        return; 
      }

      const sl = t.closest('.ae-solo') as HTMLElement;
      if (sl) { e.stopPropagation(); const o = this._objects.find((x:any)=>x.id===sl.dataset.id); if(o){o.solo=!o.solo;this._dispatch();} return; }
      const mu = t.closest('.ae-mute') as HTMLElement;
      if (mu) { e.stopPropagation(); const o = this._objects.find((x:any)=>x.id===mu.dataset.id); if(o){o.mute=!o.mute;this._dispatch();} return; }
      const ex = t.closest('.ae-exp') as HTMLElement;
      if (ex) { e.stopPropagation(); this._toggleExpand(ex.dataset.id!); return; }
      const lr = t.closest('.ae-layer-row') as HTMLElement;
      if (lr && !t.closest('.ae-vis') && !t.closest('.ae-lock') && !t.closest('.ae-solo') && !t.closest('.ae-mute') && !t.closest('.ae-exp')) { e.stopPropagation(); this._selectLayer(lr.dataset.id!); return; }
      const ct = t.closest('.ae-comp-track') as HTMLElement;
      if (ct && !t.closest('.ae-kf') && !t.closest('.ae-io-handle') && !t.closest('.ae-comp-bar')) { e.stopPropagation(); this._selectLayer(ct.dataset.id!); return; }

    // LayersHeader buttons
      const lhBtn = t.closest('.lh-btn') as HTMLElement;
      if (lhBtn) { e.stopPropagation(); this._doLhAction(lhBtn.dataset.action); return; }

      // LayersHeader opacity slider
      if (t.id === 'lh-opacity') return; // handled by input handler

      // Keyframe toggle (stopwatch)
      const kfT = t.closest('.tl-kf-toggle') as HTMLElement;
      if (kfT) {
        e.stopPropagation();
        const o = this._objects.find((x:any)=>x.id===kfT.dataset.layer); if (!o) return;
        const p = kfT.dataset.prop!;
        if (!o.keyframes) o.keyframes = {};
        if (!o.keyframes[p]) { o.keyframes[p] = { keyframes:[], active:true, defaultValue:o[p]??0 }; o.keyframes[p].keyframes.push({ t:this.state.currentTime, v:o[p]??0, interp:'linear' }); }
        else { o.keyframes[p].active = !o.keyframes[p].active; }
        this._dispatch(); return;
      }

      // Keyframe selection
      const kf = t.closest('.ae-kf') as HTMLElement;
      if (kf) {
        e.stopPropagation();
        const wasSel = kf.style.boxShadow !== '';
        if (!e.shiftKey) this._objects.forEach((o:any)=>{if(o.keyframes)Object.values(o.keyframes).forEach((t:any)=>{(t.keyframes||[]).forEach((k:any)=>{k.selected=false;});});});
        if (!wasSel || e.shiftKey) {
          const o = this._objects.find((x:any)=>x.id===kf.dataset.id);
          const prop = kf.dataset.prop;
          if (!prop || prop === 'all') {
            const time = parseFloat(kf.dataset.time!);
            if (o?.keyframes) { for (const pk of Object.keys(o.keyframes)) { const kfs = o.keyframes[pk].keyframes||[]; for (const k of kfs) { if (Math.abs(k.t-time)<0.01) k.selected=true; } } }
          } else {
            const idx = parseInt(kf.dataset.idx!);
            if (o && o.keyframes?.[prop]?.keyframes && o.keyframes[prop].keyframes[idx]) o.keyframes[prop].keyframes[idx].selected = true;
          }
        }
        this.reRender(); return;
      }
    };
    this.container.addEventListener('click', this._clickHandler);

    // Double click
    this._dblclickHandler = (e: any) => {
      const ct = (e.target as HTMLElement).closest('.ae-comp-track') as HTMLElement;
      if (ct) {
        e.stopPropagation();
        const lid = ct.dataset.id!;
        const o = this._objects.find((x:any)=>x.id===lid); if (!o) return;
        const rect = ct.getBoundingClientRect();
        const frac = ((e as MouseEvent).clientX - rect.left) / rect.width;
        const t = frac * this.state.duration;
        const st = this.state.snapToFrames ? Math.round(t * this.state.frameRate) / this.state.frameRate : t;
        if (!o.keyframes) o.keyframes = {};
        for (const p of ['x','y','w','h','scaleX','scaleY','rotation','opacity']) {
          if (!o.keyframes[p]) o.keyframes[p] = { keyframes:[], active:true, defaultValue:o[p]??0 };
          const ex = o.keyframes[p].keyframes.find((k:any)=>Math.abs(k.t-st)<0.05);
          if (!ex) o.keyframes[p].keyframes.push({ t:st, v:o[p]??0, interp:'linear' });
        }
        this._dispatch(); return;
      }

      const st = (e.target as HTMLElement).closest('.ae-sub-track') as HTMLElement;
      if (st) {
        e.stopPropagation();
        const lid = st.dataset.id!; const prop = st.dataset.prop!;
        const o = this._objects.find((x:any)=>x.id===lid); if (!o) return;
        const rect = st.getBoundingClientRect();
        const frac = ((e as MouseEvent).clientX - rect.left) / rect.width;
        const t = frac * this.state.duration;
        const snapped = this.state.snapToFrames ? Math.round(t * this.state.frameRate) / this.state.frameRate : t;
        if (!o.keyframes) o.keyframes = {};
        if (!o.keyframes[prop]) o.keyframes[prop] = { keyframes:[], active:true, defaultValue:o[prop]??0 };
        o.keyframes[prop].keyframes.push({ t:snapped, v:o[prop]??0, interp:'linear' });
        o.keyframes[prop].keyframes.sort((a:any,b:any)=>a.t-b.t);
        this._dispatch(); return;
      }
    };
    this.container.addEventListener('dblclick', this._dblclickHandler);

    // Input (sliders + numbers)
    this._inputHandler = (e: any) => {
      const el = e.target as HTMLInputElement;
      if (!el.classList.contains('tl-num')) return;
      const lid = el.dataset.layer!; const prop = el.dataset.prop!;
      let val = Number(el.value);
      const o = this._objects.find((x:any)=>x.id===lid); if (!o) return;
      o[prop] = val;
      if (o.keyframes?.[prop]?.active) {
        const t = this.state.currentTime;
        if (!o.keyframes[prop].keyframes) o.keyframes[prop].keyframes = [];
        const ex = o.keyframes[prop].keyframes.find((k:any)=>Math.abs(k.t-t)<0.05);
        if (ex) ex.v = val; else o.keyframes[prop].keyframes.push({ t, v:val, interp:'linear' });
      }
      this._dispatch();
    };
    this.container.addEventListener('input', this._inputHandler);

    // Context menu
    this._contextHandler = (e: any) => {
      const kf = (e.target as HTMLElement).closest('.ae-kf') as HTMLElement;
      if (kf) {
        e.preventDefault(); e.stopPropagation();
        const lid = kf.dataset.id!; const prop = kf.dataset.prop!;
        const o = this._objects.find((x:any)=>x.id===lid); if (!o) return;
        if (!prop || prop === 'all') {
          const time = parseFloat(kf.dataset.time!);
          if (o.keyframes) { for (const pk of Object.keys(o.keyframes)) { const kfs = o.keyframes[pk].keyframes||[]; for (const k of kfs) { if (Math.abs(k.t-time)<0.01) { const types=['linear','ease-in','ease-out','ease-in-out','hold']; k.interp=types[(types.indexOf(k.interp||'linear')+1)%types.length]; } } } }
        } else {
          const idx = parseInt(kf.dataset.idx!);
          const kfs = o.keyframes?.[prop]?.keyframes;
          if (kfs && kfs[idx]) { const types=['linear','ease-in','ease-out','ease-in-out','hold']; kfs[idx].interp=types[(types.indexOf(kfs[idx].interp||'linear')+1)%types.length]; }
        }
        this._dispatch(); return;
      }

      const ct = (e.target as HTMLElement).closest('.ae-comp-track') as HTMLElement;
      if (ct) {
        e.preventDefault(); e.stopPropagation();
        const lid = ct.dataset.id!;
        // Check if right-click was on comp bar
        const compBar = (e.target as HTMLElement).closest('.ae-comp-bar') as HTMLElement;
        if (compBar) {
          this._splitCompAtPlayhead(compBar.dataset.id!);
          return;
        }
        const o = this._objects.find((x:any)=>x.id===lid); if (!o) return;
        if (!o.markers) o.markers = [];
        const rect = ct.getBoundingClientRect();
        const frac = ((e as MouseEvent).clientX - rect.left) / rect.width;
        const t = frac * this.state.duration;
        const snapped = this.state.snapToFrames ? Math.round(t * this.state.frameRate) / this.state.frameRate : t;
        const label = prompt('Marker label:', `Marker ${o.markers.length+1}`) || '';
        o.markers.push({ time: snapped, label });
        o.markers.sort((a:any,b:any)=>a.time-b.time);
        this._dispatch(); return;
      }
    };
    this.container.addEventListener('contextmenu', this._contextHandler);

    // Mouse wheel
    this._wheelHandler = (e: any) => {
      e.preventDefault();
      if (e.altKey) {
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.setZoom(this.state.zoom * delta);
      } else {
        const scrollContainer = this.container?.querySelector('.ae-tracks-scroll') as HTMLElement;
        if (scrollContainer) {
          if (e.shiftKey) scrollContainer.scrollLeft += e.deltaY * 2;
          else scrollContainer.scrollTop += e.deltaY;
        }
      }
    };
    this.container.addEventListener('wheel', this._wheelHandler, { passive: false });

    // Mouse down
    this._mousedownHandler = (e: any) => {
      const kf = (e.target as HTMLElement).closest('.ae-kf') as HTMLElement;
      if (kf) {
        e.preventDefault();
        const lid = kf.dataset.id!; const prop = kf.dataset.prop!;
        if (!prop || prop === 'all') return;
        const idx = parseInt(kf.dataset.idx!);
        const o = this._objects.find((x:any)=>x.id===lid); if (!o) return;
        const kfs = o.keyframes?.[prop]?.keyframes; if (!kfs) return;
        this.isDraggingKeyframe = { layerId:lid, prop, kfIdx:idx, startX:e.clientX, origT:kfs[idx].t };
        return;
      }

      const ioH = (e.target as HTMLElement).closest('.ae-io-handle') as HTMLElement;
      if (ioH) {
        e.preventDefault();
        const lid = ioH.dataset.id!; const handle = ioH.dataset.handle as 'in'|'out';
        const o = this._objects.find((x:any)=>x.id===lid); if (!o) return;
        const origVal = handle === 'in' ? (o.inPoint ?? 0) : (o.outPoint ?? this.state.duration);
        this.isDraggingInOut = { layerId:lid, handle, startX:e.clientX, origVal };
        return;
      }

      const waH = (e.target as HTMLElement).closest('.ae-wa-handle') as HTMLElement;
      if (waH) {
        e.preventDefault();
        const handle = waH.dataset.handle as 'start'|'end';
        this.isDraggingWorkArea = { handle, startX:e.clientX, origStart:this.state.workAreaStart, origEnd:this.state.workAreaEnd };
        return;
      }

      // Slider thumb drag
      const thumb = (e.target as HTMLElement).closest('.tl-slider-thumb') as HTMLElement;
      if (thumb) {
        e.preventDefault();
        const lid = thumb.dataset.layer!; const prop = thumb.dataset.prop!;
        const min = parseFloat(thumb.dataset.min!); const max = parseFloat(thumb.dataset.max!);
        const def = this.PROP_DEFS.find(p => p.key === prop);
        const step = def ? def.step : 1;
        const o = this._objects.find((x:any)=>x.id===lid); if (!o) return;
        this.isDraggingSlider = { layerId:lid, prop, min, max, step, startX:e.clientX, origVal:o[prop] ?? 0 };
        return;
      }

      // Comp bar drag (reposition entire comp)
      const compBar = (e.target as HTMLElement).closest('.ae-comp-bar') as HTMLElement;
      if (compBar && !e.target.closest('.ae-io-handle')) {
        e.preventDefault();
        const lid = compBar.dataset.id!;
        const o = this._objects.find((x:any)=>x.id===lid); if (!o) return;
        const inPt = o.inPoint ?? 0;
        const outPt = o.outPoint ?? this.state.duration;
        this.isDraggingComp = { layerId:lid, startX:e.clientX, origIn:inPt, origOut:outPt };
        return;
      }
    };
    
    if (!this._mouseEventsBound) {
      this._mouseEventsBound = true;
      document.addEventListener('mousedown', this._mousedownHandler);
    }

    // Mouse move
    this._mousemoveHandler = (e: any) => {
      const drag = this.isDraggingKeyframe;
      if (drag) {
        const dx = e.clientX - drag.startX;
        const dt = dx / this.state.zoom;
        let newT = drag.origT + dt;
        if (this.state.snapToFrames) newT = Math.round(newT * this.state.frameRate) / this.state.frameRate;
        newT = Math.max(0, Math.min(newT, this.state.duration));
        const o = this._objects.find((x:any)=>x.id===drag.layerId);
        if (o?.keyframes?.[drag.prop]?.keyframes) {
          o.keyframes[drag.prop].keyframes[drag.kfIdx].t = newT;
          o.keyframes[drag.prop].keyframes.sort((a:any,b:any)=>a.t-b.t);
          this.reRender();
        }
        return;
      }

      const ioDrag = this.isDraggingInOut;
      if (ioDrag) {
        const dx = e.clientX - ioDrag.startX;
        const dt = dx / this.state.zoom;
        let newVal = ioDrag.origVal + dt;
        if (this.state.snapToFrames) newVal = Math.round(newVal * this.state.frameRate) / this.state.frameRate;
        newVal = Math.max(0, Math.min(newVal, this.state.duration));
        const o = this._objects.find((x:any)=>x.id===ioDrag.layerId);
        if (o) {
          if (ioDrag.handle === 'in') o.inPoint = Math.min(newVal, o.outPoint ?? this.state.duration);
          else o.outPoint = Math.max(newVal, o.inPoint ?? 0);
          this.reRender();
        }
        return;
      }

      const slDrag = this.isDraggingSlider;
      if (slDrag) {
        const dx = e.clientX - slDrag.startX;
        const range = slDrag.max - slDrag.min;
        const delta = (dx / 120) * range;
        let newVal = slDrag.origVal + delta;
        newVal = Math.max(slDrag.min, Math.min(slDrag.max, newVal));
        newVal = Math.round(newVal / slDrag.step) * slDrag.step;
        const o = this._objects.find((x:any)=>x.id===slDrag.layerId);
        if (o) {
          const oldVal = o[slDrag.prop];
          o[slDrag.prop] = newVal;
          if (o.keyframes?.[slDrag.prop]?.active) {
            const t = this.state.currentTime;
            if (!o.keyframes[slDrag.prop].keyframes) o.keyframes[slDrag.prop].keyframes = [];
            const ex = o.keyframes[slDrag.prop].keyframes.find((k:any)=>Math.abs(k.t-t)<0.05);
            if (ex) ex.v = newVal; else o.keyframes[slDrag.prop].keyframes.push({ t, v:newVal, interp:'linear' });
          }
          
          // Sync children when parent moves via slider
          if ((slDrag.prop === 'x' || slDrag.prop === 'y') && oldVal !== undefined) {
            const moveDelta = newVal - oldVal;
            const children = this._objects.filter((x:any) => x.parentId === o.id);
            for (const child of children) {
              child[slDrag.prop] = (child[slDrag.prop] || 0) + moveDelta;
            }
          }
           
          this.reRender();
          this._dispatch();
        }
        return;
      }

      const waDrag = this.isDraggingWorkArea;
      if (waDrag) {
        const dx = e.clientX - waDrag.startX;
        const dt = dx / this.state.zoom;
        if (waDrag.handle === 'start') {
          this.state.workAreaStart = Math.max(0, Math.min(waDrag.origStart + dt, this.state.workAreaEnd - 1));
        } else if (waDrag.handle === 'end') {
          this.state.workAreaEnd = Math.max(this.state.workAreaStart + 1, Math.min(waDrag.origEnd + dt, this.state.duration));
        }
        this.updatePlayheadDOM();
        this.reRender();
        return;
      }

      const compDrag = this.isDraggingComp;
      if (compDrag) {
        const dx = e.clientX - compDrag.startX;
        const dt = dx / this.state.zoom;
        let newIn = compDrag.origIn + dt;
        let newOut = compDrag.origOut + dt;
        if (this.state.snapToFrames) {
          newIn = Math.round(newIn * this.state.frameRate) / this.state.frameRate;
          newOut = Math.round(newOut * this.state.frameRate) / this.state.frameRate;
        }
        if (newIn < 0) { newOut -= newIn; newIn = 0; }
        if (newOut > this.state.duration) { newIn -= (newOut - this.state.duration); newOut = this.state.duration; }
        const o = this._objects.find((x:any)=>x.id===compDrag.layerId);
        if (o) { o.inPoint = Math.max(0, newIn); o.outPoint = Math.min(newOut, this.state.duration); this.reRender(); }
        return;
      }

      if (this.isDraggingPlayhead) {
        this._playheadMove(e);
      }
    };

    if (!this._mouseEventsBound) {
       // Note: mousedown is bound above, mousemove/mouseup here
       // In a real refactor, they should all be together, but keeping it minimal for now
       document.addEventListener('mousemove', this._mousemoveHandler);
       document.addEventListener('mouseup', this._mouseupHandler);
    }

    this._playheadDrag();

    if (!this._keydownBound) {
      this._keydownBound = true;
      document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement) return;
        if (e.key===' ') { e.preventDefault(); this.togglePlayPause(); this.reRender(); }
        else if (e.key==='Home') this.goToStart();
        else if (e.key==='End') this.goToEnd();
        else if (e.key==='ArrowLeft') this.stepBackward();
        else if (e.key==='ArrowRight') this.stepForward();
        else if (e.key==='Delete') this._deleteSelectedKfs();
        else if (e.key.toLowerCase()==='u') this._showAnimatedProps();
        else if (e.key.toLowerCase()==='p') this._togglePropVisibility('x','y');
        else if (e.key.toLowerCase()==='s') this._togglePropVisibility('scaleX','scaleY');
        else if (e.key.toLowerCase()==='r') this._togglePropVisibility('rotation');
        else if (e.key.toLowerCase()==='t') this._togglePropVisibility('opacity');
        else if (e.key.toLowerCase()==='a') this._togglePropVisibility('pivotX','pivotY');
      });
    }

    if (!this._externalEventsBound) {
      this._externalEventsBound = true;
      document.addEventListener('worldmap-objects-changed', () => { if (!this.container) return; this._objects=this.objs; this._state=this.gs||{}; this.container.innerHTML=this.render(); this.bindEvents(); });
    }
  }

  private _playheadDrag(): void {
    if (!this.container) return;
    const tr = this.container.querySelector('.ae-ruler') as HTMLElement;
    const start = (e: MouseEvent) => { this.isDraggingPlayhead=true; this._playheadMove(e); };
    const move = (e: MouseEvent) => { if (this.isDraggingPlayhead) this._playheadMove(e); };
    const end = () => { this.isDraggingPlayhead=false; };
    if (tr) { tr.removeEventListener('mousedown', this._rulerMousedown); tr.addEventListener('mousedown', this._rulerMousedown=start as any); }
    
    if (!this._playheadEventsBound) {
      this._playheadEventsBound = true;
      document.addEventListener('mousemove', (e) => { if (this.isDraggingPlayhead) this._playheadMove(e); });
      document.addEventListener('mouseup', () => { this.isDraggingPlayhead=false; });
    }
  }

  private _playheadMove(e: MouseEvent): void {
    if (!this.container) return;
    const tr = this.container.querySelector('.ae-ruler') as HTMLElement;
    if (!tr) return;
    const r = tr.getBoundingClientRect();
    const x = e.clientX - r.left;
    this.setCurrentTime(Math.max(0, Math.min(x / this.state.zoom, this.state.duration)));
  }

  private _selectLayer(id: string): void {
    if (!this._state.selectedIds) this._state.selectedIds = [];
    this._state.selectedIds = [id];
    this._state.selectedId = id;
    document.dispatchEvent(new CustomEvent('worldmap-selection-changed', { detail:{ selectedIds:[id] } }));
    this.reRender();
  }

  private _toggleExpand(id: string): void {
    if (!this._state.expandedLayerIds) this._state.expandedLayerIds = [];
    const idx = this._state.expandedLayerIds.indexOf(id);
    if (idx>=0) this._state.expandedLayerIds.splice(idx,1); else this._state.expandedLayerIds.push(id);
    this.reRender();
  }

  private _doAction(action: string): void {
    switch(action) {
      case 'goToStart': this.goToStart(); break;
      case 'stepBackward': this.stepBackward(); break;
      case 'togglePlay': this.togglePlayPause(); this.reRender(); break;
      case 'stepForward': this.stepForward(); break;
      case 'goToEnd': this.goToEnd(); break;
      case 'zoomIn': this.setZoom(this.state.zoom*1.25); break;
      case 'zoomOut': this.setZoom(this.state.zoom/1.25); break;
      case 'toggleLoop': this.state.playLoop=!this.state.playLoop; this.reRender(); break;
      case 'toggleSnap': this.state.snapToFrames=!this.state.snapToFrames; this.reRender(); break;
      case 'toggleGraph': this.state.showGraphEditor=!this.state.showGraphEditor; this.reRender(); break;
      case 'add-keyframe': this._addKfAtTime(); break;
      case 'delete-keyframe': this._deleteKfAtTime(); break;
      case 'cut-comp': this._cutSelectedComp(); break;
      case 'save-scene': document.dispatchEvent(new CustomEvent('open-scene-save-dialog')); break;
      case 'load-scene': document.dispatchEvent(new CustomEvent('open-scene-load-dialog')); break;
    }
  }

  private _doLayerAction(action: string): void {
    const o = this._objects; const s = this.sels; const g = this._state; if (!g) return;
    if (action==='new-layer') { o.push({ id:'layer_'+Date.now(), type:'morph', label:'Layer '+Date.now().toString().slice(-4), x:100, y:100, w:100, h:100, isVisible:true, opacity:1, artboardId:'default', isPersistent:true, keyframes:{}, inPoint:0, outPoint:5 }); }
    else if (action==='new-group') { const n = prompt('Nome do grupo:','Novo Grupo'); if (n) { o.push({ id:'group_'+Date.now(), type:'group', label:n, _isGroup:true, x:0, y:0, w:1, h:1, isVisible:true, opacity:1, artboardId:'default', isPersistent:true, inPoint:0, outPoint:5 }); } }
    else if (action==='delete' && s.length>0) { g.worldMapObjects=o.filter((x:any)=>!s.includes(x.id)); g.selectedIds=[]; g.selectedId=null; this._dispatch(); return; }
    else if (action==='lock-all') { s.forEach(id => { const x = o.find((y:any)=>y.id===id); if (x) x.isLocked = !x.isLocked; }); this._dispatch(); return; }
    else if (action==='hide-all') { s.forEach(id => { const x = o.find((y:any)=>y.id===id); if (x) x.isVisible = x.isVisible === false ? true : false; }); this._dispatch(); return; }
    else return;
    this._dispatch();
  }

  private _doLhAction(action: string | undefined): void {
    if (!action) return;
    const o = this._objects; const s = this.sels; const g = this._state; if (!g) return;
    if (action === 'new-scene') {
      const sceneId = 'scene_' + Date.now();
      o.push({ id:sceneId, type:'camera', label:'Cena '+Date.now().toString().slice(-4), x:0, y:0, w:1920, h:1080, isVisible:true, opacity:1, artboardId:sceneId, isPersistent:true, inPoint:0, outPoint:5 });
    } else if (action === 'new-layer') {
      o.push({ id:'layer_'+Date.now(), type:'morph', label:'Camada '+Date.now().toString().slice(-4), x:0, y:0, w:100, h:100, isVisible:true, opacity:1, artboardId:'default', isPersistent:true, inPoint:0, outPoint:5 });
    } else if (action === 'new-group') {
      const name = prompt('Nome do grupo:','Novo Grupo');
      if (name) o.push({ id:'group_'+Date.now(), type:'group', label:name, _isGroup:true, x:0, y:0, w:1, h:1, isVisible:true, opacity:1, artboardId:'default', isPersistent:true });
    } else if (action === 'group' && s.length > 1) {
      const groupId = 'group_' + Date.now();
      o.push({ id:groupId, type:'group', label:'Grupo '+Date.now().toString().slice(-4), _isGroup:true, x:0, y:0, w:1, h:1, isVisible:true, opacity:1, artboardId:'default', isPersistent:true, inPoint:0, outPoint:5 });
      s.forEach((id:string) => { const obj = o.find((x:any)=>x.id===id); if (obj) obj.parentId = groupId; });
    } else if (action === 'link' && s.length >= 2) {
      const parentId = s[0];
      for (let i = 1; i < s.length; i++) { const obj = o.find((x:any)=>x.id===s[i]); if (obj) obj.parentId = parentId; }
    } else if (action === 'ungroup' && s.length > 0) {
      s.forEach((id:string) => { const obj = o.find((x:any)=>x.id===id); if (obj && obj.parentId) obj.parentId = null; });
    } else if (action === 'delete' && g.selectedId) {
      g.worldMapObjects = o.filter((x:any)=>x.id !== g.selectedId);
      g.selectedId = null; g.selectedIds = [];
    } else if (action === 'lock') {
      s.forEach((id:string) => { const obj = o.find((x:any)=>x.id===id); if (obj) obj.isLocked = !obj.isLocked; });
    } else if (action === 'hide') {
      s.forEach((id:string) => { const obj = o.find((x:any)=>x.id===id); if (obj) obj.isVisible = obj.isVisible === false ? true : false; });
    } else if (action === 'save-scene') {
      document.dispatchEvent(new CustomEvent('open-scene-save-dialog')); return;
    } else if (action === 'load-scene') {
      document.dispatchEvent(new CustomEvent('open-scene-load-dialog')); return;
    } else return;
    this._dispatch();
  }

  private _addKfAtTime(): void {
    const s = this.sels; if (!s.length) return;
    const t = this.state.currentTime;
    for (const id of s) {
      const o = this._objects.find((x:any)=>x.id===id); if (!o) continue;
      if (!o.keyframes) o.keyframes = {};
      
      // Store child offsets before adding keyframe
      const children = this._objects.filter((x:any) => x.parentId === o.id);
      if (children.length > 0) {
        o._childrenIds = children.map((c:any) => c.id);
        for (const child of children) {
          child._childOffsets = child._childOffsets || {};
          child._childOffsets.x = (child.x || 0) - (o.x || 0);
          child._childOffsets.y = (child.y || 0) - (o.y || 0);
        }
      }
      
      for (const p of ['x','y','w','h','scaleX','scaleY','rotation','opacity']) {
        if (!o.keyframes[p]) o.keyframes[p] = { keyframes:[], active:true, defaultValue:o[p]??0 };
        const ex = o.keyframes[p].keyframes.find((k:any)=>Math.abs(k.t-t)<0.05);
        if (ex) ex.v = o[p]??0; else o.keyframes[p].keyframes.push({ t, v:o[p]??0, interp:'linear' });
      }
    }
    this._dispatch();
  }

  private _deleteKfAtTime(): void {
    const s = this.sels; if (!s.length) return;
    const t = this.state.currentTime;
    for (const id of s) {
      const o = this._objects.find((x:any)=>x.id===id); if (!o?.keyframes) continue;
      for (const p of Object.keys(o.keyframes)) { if (o.keyframes[p].keyframes) o.keyframes[p].keyframes = o.keyframes[p].keyframes.filter((k:any)=>Math.abs(k.t-t)>0.05); }
    }
    this._dispatch();
  }

  private _deleteSelectedKfs(): void {
    for (const o of this._objects) {
      if (!o.keyframes) continue;
      for (const p of Object.keys(o.keyframes)) {
        if (o.keyframes[p].keyframes) o.keyframes[p].keyframes = o.keyframes[p].keyframes.filter((k:any)=>!k.selected);
      }
    }
    this._dispatch();
  }

  private _showAnimatedProps(): void {
    for (const o of this._objects) {
      const hasAnim = o.keyframes && Object.keys(o.keyframes).some((p:string) => o.keyframes[p]?.keyframes?.length > 0);
      if (hasAnim && !this._state.expandedLayerIds?.includes(o.id)) {
        if (!this._state.expandedLayerIds) this._state.expandedLayerIds = [];
        this._state.expandedLayerIds.push(o.id);
      }
    }
    this.reRender();
  }

  private _togglePropVisibility(...keys: string[]): void {
    if (!this._state.expandedPropIds) this._state.expandedPropIds = [];
    for (const k of keys) {
      const idx = this._state.expandedPropIds.indexOf(k);
      if (idx >= 0) this._state.expandedPropIds.splice(idx, 1);
      else this._state.expandedPropIds.push(k);
    }
    this.reRender();
  }

  private _splitCompAtPlayhead(layerId: string): void {
    const o = this._objects.find((x:any)=>x.id===layerId);
    if (!o) return;
    const inPt = o.inPoint ?? 0;
    const outPt = o.outPoint ?? this.state.duration;
    const splitTime = this.state.currentTime;
    if (splitTime <= inPt || splitTime >= outPt) return;

    // Create new layer for the second half
    const newId = layerId + '_split_' + Date.now();
    const newLayer = {
      ...o,
      id: newId,
      label: (o.label || o.type) + ' (corte)',
      inPoint: splitTime,
      outPoint: outPt,
      keyframes: {},
    };

    // Copy keyframes that are after split time
    if (o.keyframes) {
      for (const prop of Object.keys(o.keyframes)) {
        const origKfs = o.keyframes[prop].keyframes || [];
        const afterSplit = origKfs.filter((k:any) => k.t >= splitTime);
        if (afterSplit.length > 0) {
          newLayer.keyframes[prop] = {
            keyframes: afterSplit.map((k:any) => ({ ...k, t: k.t - splitTime + inPt })),
            active: o.keyframes[prop].active,
            defaultValue: o.keyframes[prop].defaultValue,
          };
        }
      }
    }

    // Adjust original layer's out point
    o.outPoint = splitTime;

    // Add new layer right after original
    const origIdx = this._objects.indexOf(o);
    this._objects.splice(origIdx + 1, 0, newLayer);
    this._dispatch();
  }

  private _cutSelectedComp(): void {
    const selId = this.sels[0];
    if (!selId) return;
    this._splitCompAtPlayhead(selId);
  }

  private _dispatch(): void { document.dispatchEvent(new CustomEvent('worldmap-objects-changed')); }
}

export const aeTimeline = new AETimeline();
