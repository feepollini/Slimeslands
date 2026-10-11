import { ShapeRenderer } from './ShapeRenderer';
// import { GIFExtractor } from './GIFAnimator'; // Removido para usar Worker

export class RenderPipeline {
  private ctx: CanvasRenderingContext2D | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private shapeRenderer: ShapeRenderer;
  private zoom: number = 1;
  private panX: number = 0;
  private panY: number = 0;
  private state: any = {};
  private objects: any[] = [];
  private stampBrush: any = {};
  private isSelectArea = false;
  private selectAreaStart = { x: 0, y: 0 };
  private selectAreaEnd = { x: 0, y: 0 };
  private handleSize = 8;
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private currentTime: number = 0;
  private _startedAt: number = Date.now();
  // Shared refs from WorldMapMain's overlay: DOM-animated imgs used for canvas GIF drawing
  private _gifOverlayRefs: Map<string, HTMLImageElement> = new Map();
  setGifOverlayRefs(refs: Map<string, HTMLImageElement>) { this._gifOverlayRefs = refs; }

  // Performance Optimization: Cache transforms per frame
  public _transformCache: Map<string, any> = new Map();
  private _lastFrameTime: number = 0;

  constructor(shapeRenderer: ShapeRenderer) {
    this.shapeRenderer = shapeRenderer;
  }

  // State setters
  setContext(ctx: CanvasRenderingContext2D | null) { this.ctx = ctx; }
  setCanvas(canvas: HTMLCanvasElement | null) { this.canvas = canvas; }
  setZoom(zoom: number) { this.zoom = zoom; }
  setPan(x: number, y: number) { this.panX = x; this.panY = y; }
  setState(state: any) { this.state = state; }
  setObjects(objects: any[]) { this.objects = objects; }
  setStampBrush(sb: any) { this.stampBrush = sb; }
  setCurrentTime(time: number) { this.currentTime = time; }
  setSelectArea(isActive: boolean, start: any, end: any) {
    this.isSelectArea = isActive;
    this.selectAreaStart = start;
    this.selectAreaEnd = end;
  }

  // Keyframe interpolation - supports both old format (array) and new format (PropertyTrack)
  private getVal(o: any, prop: string): number {
    const time = this.state.currentTime ?? 0;
    
    const hasAnimatedCharData = o.charData && (o.charData.idle || o.charData.move || o.charData.run || o.charData.extra1);
    const isRealtimeMode = hasAnimatedCharData && (time === 0 || !this.state.currentTime);
    
    if (!o.keyframes || !o.keyframes[prop]) {
      if (prop === 'opacity') return o[prop] ?? 1;
      if (prop === 'rotation') return o[prop] ?? 0;
      return o[prop] ?? 0;
    }

    // Skip position keyframes for animated sprites in realtime mode
    if (isRealtimeMode && (prop === 'x' || prop === 'y')) {
      return o[prop] ?? 0;
    }

    const raw = o.keyframes[prop];
    // New format: PropertyTrack { keyframes, active, defaultValue }
    const kfs = Array.isArray(raw) ? raw : (raw.keyframes || []);
    if (kfs.length === 0) {
      if (prop === 'opacity') return o[prop] ?? 1;
      if (prop === 'rotation') return o[prop] ?? 0;
      return o[prop] ?? 0;
    }

    if (kfs.length === 1) return kfs[0].v;

    let prev = kfs[0];
    let next = kfs[kfs.length - 1];
    if (time <= prev.t) return prev.v;
    if (time >= next.t) return next.v;
    for (let i = 0; i < kfs.length - 1; i++) {
      if (time >= kfs[i].t && time <= kfs[i+1].t) {
        prev = kfs[i]; next = kfs[i+1]; break;
      }
    }

    // Hold interpolation
    if (prev.interp === 'hold') return prev.v;

    // Ease in-out
    if (prev.interp === 'ease-in-out' || next.interp === 'ease-in-out') {
      const t = (time - prev.t) / (next.t - prev.t);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      return prev.v + (next.v - prev.v) * eased;
    }

    // Ease in
    if (prev.interp === 'ease-in') {
      const t = (time - prev.t) / (next.t - prev.t);
      return prev.v + (next.v - prev.v) * t * t;
    }

    // Ease out
    if (next.interp === 'ease-out') {
      const t = (time - prev.t) / (next.t - prev.t);
      return prev.v + (next.v - prev.v) * (1 - Math.pow(1 - t, 2));
    }

    // Default: linear
    const t = (time - prev.t) / (next.t - prev.t);
    return prev.v + (next.v - prev.v) * t;
  }

  // === World Transform Calculation (Interpolated) ===
  // Recursively calculates position/size/rotation/opacity by combining parent transforms
  private getWorldTransform(obj: any, visited: Set<string> = new Set()): { x: number, y: number, w: number, h: number, rotation: number, scaleX: number, scaleY: number, opacity: number } {
    // Return cached value if already computed this frame
    if (this._transformCache.has(obj.id)) return this._transformCache.get(obj.id);

    if (visited.has(obj.id)) {
      return { x: obj.x || 0, y: obj.y || 0, w: obj.w || 1, h: obj.h || 1, rotation: obj.rotation || 0, scaleX: obj.scaleX || 1, scaleY: obj.scaleY || 1, opacity: obj.opacity || 1 };
    }
    visited.add(obj.id);
    
    // ... rest of logic ...
    let x = this.getVal(obj, 'x') || 0;
    let y = this.getVal(obj, 'y') || 0;
    let w = this.getVal(obj, 'w') || 1;
    let h = this.getVal(obj, 'h') || 1;
    let rotation = this.getVal(obj, 'rotation') || 0;
    let scaleX = this.getVal(obj, 'scaleX') || 1;
    let scaleY = this.getVal(obj, 'scaleY') || (obj.scaleUniform !== false ? scaleX : 1);
    let opacity = (obj.opacity !== undefined) ? this.getVal(obj, 'opacity') : 1;
    
    // Recursive Hierarchical Displacement (Absolute System)
    // We add the parent's 'motion delta' (current - base) to the child
    // Players are strictly physics-bound to absolute coordinates and should never inherit visual displacement.
    if (obj.parentId && obj.type !== 'player') {
      const parent = this.objects.find((o: any) => o.id === obj.parentId);
      if (parent) {
        const pd = this.getHierarchyDisplacement(parent, visited);
        x += pd.x;
        y += pd.y;
        rotation += pd.rotation;
        opacity *= pd.opacity;
        
        // Scale/Size adjustments for displacement
        const dsX = pd.scaleX;
        const dsY = pd.scaleY;
        w *= dsX;
        h *= dsY;
        scaleX *= dsX;
        scaleY *= dsY;
      }
    }
    
    const result = { x, y, w, h, rotation, scaleX, scaleY, opacity };
    this._transformCache.set(obj.id, result);
    return result;
  }

  // Pure recursive delta getter (no absolute positions added)
  private getHierarchyDisplacement(obj: any, visited: Set<string> = new Set()): { x: number, y: number, rotation: number, scaleX: number, scaleY: number, opacity: number } {
    if (visited.has(obj.id)) {
      return { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 };
    }
    visited.add(obj.id);
    
    const visualX = this.getVal(obj, 'x');
    const visualY = this.getVal(obj, 'y');
    const visualRot = this.getVal(obj, 'rotation');
    const visualSX = this.getVal(obj, 'scaleX') || 1;
    const visualSY = this.getVal(obj, 'scaleY') || (obj.scaleUniform !== false ? visualSX : 1);
    const visualOp = this.getVal(obj, 'opacity');

    let dx = visualX - (obj.x || 0);
    let dy = visualY - (obj.y || 0);
    let dr = visualRot - (obj.rotation || 0);
    let sX = visualSX / (obj.scaleX || 1);
    let sY = visualSY / (obj.scaleY || 1);
    let op = visualOp;

    if (obj.parentId) {
      const parent = this.objects.find((o: any) => o.id === obj.parentId);
      if (parent) {
        const pd = this.getHierarchyDisplacement(parent, visited);
        dx += pd.x;
        dy += pd.y;
        dr += pd.rotation;
        sX *= pd.scaleX;
        sY *= pd.scaleY;
        op *= pd.opacity;
      }
    }
    return { x: dx, y: dy, rotation: dr, scaleX: sX, scaleY: sY, opacity: op };
  }

  // Renders the scene to an external context (used by PhaseDialog/Emulator)
  public renderToExternalContext(ctx: CanvasRenderingContext2D, camera: any, viewport: { w: number, h: number }, options: { showTechnical?: boolean, hideGifsForOverlay?: boolean } = {}) {
    if (!ctx) return;
    
    // Save current parameters
    const oldCtx = this.ctx;
    const oldCanvas = this.canvas;
    const oldZoom = this.zoom;
    const oldPanX = this.panX;
    const oldPanY = this.panY;
    const oldState = { ...this.state };

    // Configure for external render - Hard clear to avoid ghosts
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    this.ctx = ctx;
    this.canvas = ctx.canvas;

    // Pixel Perfect rendering - prevents ghosting and blurriness
    ctx.imageSmoothingEnabled = false;

    // Handle high-density (Retina/HDPI) contexts automatically
    const dpr = (ctx.canvas.width / viewport.w) || 1;
    ctx.scale(dpr, dpr);

    // Calculate zoom to fit camera into viewport with safety fallback
    this.zoom = (camera.w && camera.w > 0) ? viewport.w / camera.w : 1;
    this.panX = -(camera.x || 0) * this.zoom;
    this.panY = -(camera.y || 0) * this.zoom;
    
    // Visibility overrides for "Clean View"
    if (options.showTechnical === false) {
      this.state = {
        ...this.state,
        showGrid: false,
        showCollision: false,
        showSensors: false,
        showAreas: false,
        showVectors: false,
        showCams: false,
        showCanvasUI: false
      };
    }
    
    // Inject flag for overlay skip
    if (options.hideGifsForOverlay) {
       (this.state as any)._hideGifsForOverlay = true;
    }

    // Render the scene
    this.draw();

    // Restore original parameters
    this.ctx = oldCtx;
    this.canvas = oldCanvas;
    this.zoom = oldZoom;
    this.panX = oldPanX;
    this.panY = oldPanY;
    this.state = oldState;
  }

  // Main draw method (exact copy from WorldMapMain)
  draw() {
    if (!this.ctx || !this.canvas) return;
    
    // PERFORMANCE: Clear frame cache
    this._transformCache.clear();

    const ctx = this.ctx;
    const canvas = this.canvas;
    const bgColor = this.state.bgColor || '#08080c';
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);
    
    const mapW = this.state.mapWidth || 4000;
    const mapH = this.state.mapHeight || 2250;
    
    ctx.beginPath();
    ctx.rect(0, 0, mapW, mapH);
    ctx.clip();
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, mapW, mapH);

    // Map border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 3 / this.zoom;
    ctx.strokeRect(0, 0, mapW, mapH);

    // Corner accents
    const cornerLen = 30 / this.zoom;
    ctx.strokeStyle = 'rgba(76,255,136,0.4)';
    ctx.lineWidth = 4 / this.zoom;
    // Top-left
    ctx.beginPath(); ctx.moveTo(0, cornerLen); ctx.lineTo(0, 0); ctx.lineTo(cornerLen, 0); ctx.stroke();
    // Top-right
    ctx.beginPath(); ctx.moveTo(mapW - cornerLen, 0); ctx.lineTo(mapW, 0); ctx.lineTo(mapW, cornerLen); ctx.stroke();
    // Bottom-left
    ctx.beginPath(); ctx.moveTo(0, mapH - cornerLen); ctx.lineTo(0, mapH); ctx.lineTo(cornerLen, mapH); ctx.stroke();
    // Bottom-right
    ctx.beginPath(); ctx.moveTo(mapW - cornerLen, mapH); ctx.lineTo(mapW, mapH); ctx.lineTo(mapW, mapH - cornerLen); ctx.stroke();

    // GRID - Chunked system with letter-number labels (A1, A2, B1, etc.)
    const showUI = this.state?.showCanvasUI !== false;
    const showGrid = this.state?.showGrid !== false;
    const showCollision = this.state?.showCollision !== false;
    const showSensors = this.state?.showSensors !== false;
    const showAreas = this.state?.showAreas !== false;
    const showMorphs = this.state?.showMorphs !== false;
    const showVectors = this.state?.showVectors !== false;
    const showCams = this.state?.showCams !== false;
    
    const shouldShow = (type: string) => {
      // Visual assets should always be visible in the "Real View" (Emulator), 
      // regardless of whether technical UI (Grids/Sensors) is hidden.
      if (type === 'morph' || type === 'image' || type === 'player' || type === 'stamp_layer') return showMorphs;
      
      if (type === 'grid' || type === 'minor_grid' || type === 'chunk_grid') return showGrid && showUI;
      if (type === 'collision') return showCollision && showUI;
      if (type === 'area_sensor' || type === 'sensor') return showSensors && showUI;
      if (type === 'area') return showAreas && showUI;
      if (type === 'vector') return showVectors && showUI;
      if (type === 'camera') return showCams && showUI;
      return showUI;
    };

    
    const minorGridSize = 50;
    const chunkSize = 500;

    // Calculate grid boundaries once for both grid and origin axes
    const minorStartX = Math.floor(-this.panX / this.zoom / minorGridSize) * minorGridSize;
    const minorStartY = Math.floor(-this.panY / this.zoom / minorGridSize) * minorGridSize;
    const minorEndX = -this.panX / this.zoom + canvas.width / this.zoom + minorGridSize;
    const minorEndY = -this.panY / this.zoom + canvas.height / this.zoom + minorGridSize;

    if (shouldShow('grid')) {

    // Helper: convert grid index to letter (0=A, 1=B, ... 25=Z, 26=AA...)
    const toLetter = (idx: number): string => {
      let result = '';
      let n = idx;
      while (n >= 0) {
        result = String.fromCharCode(65 + (n % 26)) + result;
        n = Math.floor(n / 26) - 1;
      }
      return result;
    };

    // Helper: convert grid index to section label (e.g., A1, B3, Z10)
    const toSectionLabel = (gridX: number, gridY: number): string => {
      const col = Math.floor(gridX / minorGridSize);
      const row = Math.floor(gridY / minorGridSize);
      const letter = toLetter(Math.max(0, col));
      const number = Math.abs(row);
      return `${letter}${number}`;
    };

    // Minor grid (fine cells)
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 0.5 / this.zoom;
    for (let x = minorStartX; x <= minorEndX; x += minorGridSize) {
      ctx.beginPath(); ctx.moveTo(x, minorStartY); ctx.lineTo(x, minorEndY); ctx.stroke();
    }
    for (let y = minorStartY; y <= minorEndY; y += minorGridSize) {
      ctx.beginPath(); ctx.moveTo(minorStartX, y); ctx.lineTo(minorEndX, y); ctx.stroke();
    }

    // Section labels INSIDE each cell (A1, A2, B1, etc.)
    if (this.zoom > 1.0) {
      const cellLabelSize = Math.max(6, 9 / this.zoom);
      ctx.font = `bold ${cellLabelSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let x = minorStartX; x <= minorEndX; x += minorGridSize) {
        for (let y = minorStartY; y <= minorEndY; y += minorGridSize) {
          const label = toSectionLabel(x, y);
          const cx = x + minorGridSize / 2;
          const cy = y + minorGridSize / 2;

          // Semi-transparent background
          const metrics = ctx.measureText(label);
          const pillW = metrics.width + 6 / this.zoom;
          const pillH = cellLabelSize + 4 / this.zoom;

          ctx.fillStyle = 'rgba(220,220,220,0.15)';
          ctx.beginPath();
          ctx.roundRect(cx - pillW / 2, cy - pillH / 2, pillW, pillH, 2 / this.zoom);
          ctx.fill();

          ctx.fillStyle = '#444444';
          ctx.fillText(label, cx, cy);
        }
      }
    }

    // Chunk grid (major blocks with colored borders and labels)
    const chunkStartX = Math.floor(-this.panX / this.zoom / chunkSize) * chunkSize;
    const chunkStartY = Math.floor(-this.panY / this.zoom / chunkSize) * chunkSize;
    const chunkEndX = -this.panX / this.zoom + canvas.width / this.zoom + chunkSize;
    const chunkEndY = -this.panY / this.zoom + canvas.height / this.zoom + chunkSize;

    // Chunk colors - alternating pattern
    const chunkColors = [
      'rgba(76,255,136,0.06)', 'rgba(74,158,255,0.06)', 'rgba(255,140,66,0.06)', 'rgba(167,139,250,0.06)',
      'rgba(255,51,102,0.06)', 'rgba(255,215,0,0.06)', 'rgba(68,204,255,0.06)', 'rgba(255,68,68,0.06)'
    ];
    const chunkBorderColors = [
      'rgba(76,255,136,0.2)', 'rgba(74,158,255,0.2)', 'rgba(255,140,66,0.2)', 'rgba(167,139,250,0.2)',
      'rgba(255,51,102,0.2)', 'rgba(255,215,0,0.2)', 'rgba(68,204,255,0.2)', 'rgba(255,68,68,0.2)'
    ];

    for (let cx = chunkStartX; cx <= chunkEndX; cx += chunkSize) {
      for (let cy = chunkStartY; cy <= chunkEndY; cy += chunkSize) {
        // Chunk fill
        const chunkCol = Math.floor(cx / chunkSize);
        const chunkRow = Math.floor(cy / chunkSize);
        const _simpleChunkLabel = String.fromCharCode(65 + chunkCol) + (chunkRow + 1);
        const colorIdx = Math.abs(chunkCol + chunkRow) % chunkColors.length;
        ctx.fillStyle = chunkColors[colorIdx];
        ctx.fillRect(cx, cy, chunkSize, chunkSize);

        // Chunk border (thicker)
        ctx.strokeStyle = chunkBorderColors[colorIdx];
        ctx.lineWidth = 2 / this.zoom;
        ctx.strokeRect(cx, cy, chunkSize, chunkSize);

        // Chunk label (top-left corner) - shows section range
        const startLabel = toSectionLabel(cx, cy);
        const endLabel = toSectionLabel(cx + chunkSize - minorGridSize, cy + chunkSize - minorGridSize);
        const chunkLabel = `${startLabel}→${endLabel}`;

        const fontSize = Math.max(8, 13 / this.zoom);
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const metrics = ctx.measureText(chunkLabel);
        const labelW = metrics.width + 8 / this.zoom;
        const labelH = fontSize + 5 / this.zoom;

        ctx.fillStyle = 'rgba(200,200,200,0.15)';
        ctx.beginPath();
        ctx.roundRect(cx + 3 / this.zoom, cy + 3 / this.zoom, labelW, labelH, 3 / this.zoom);
        ctx.fill();

        ctx.strokeStyle = 'rgba(100,100,100,0.3)';
        ctx.lineWidth = 1 / this.zoom;
        ctx.beginPath();
        ctx.roundRect(cx + 3 / this.zoom, cy + 3 / this.zoom, labelW, labelH, 3 / this.zoom);
        ctx.stroke();

        ctx.fillStyle = '#333333';
        ctx.fillText(chunkLabel, cx + 7 / this.zoom, cy + 5 / this.zoom);

        // Corner markers
        if (this.zoom > 0.3) {
          const markerSize = 4 / this.zoom;
          ctx.fillStyle = chunkBorderColors[colorIdx];
          ctx.fillRect(cx - markerSize / 2, cy - markerSize / 2, markerSize, markerSize);
          ctx.fillRect(cx + chunkSize - markerSize / 2, cy - markerSize / 2, markerSize, markerSize);
          ctx.fillRect(cx - markerSize / 2, cy + chunkSize - markerSize / 2, markerSize, markerSize);
          ctx.fillRect(cx + chunkSize - markerSize / 2, cy + chunkSize - markerSize / 2, markerSize, markerSize);
        }
      }
    }
    }

    // Origin axes (X=0 and Y=0) - brighter
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2 / this.zoom;
    ctx.beginPath(); 
    // Horizontal (X axis)
    ctx.moveTo(minorStartX, 0); ctx.lineTo(minorEndX, 0); 
    // Vertical (Y axis)
    ctx.moveTo(0, minorStartY); ctx.lineTo(0, minorEndY);
    ctx.stroke();

    // OBJECTS - LAYERED RENDERING
    
    // 1. VISUAL ASSETS (affected by light)
    // Performance: Filter visual candidates once for the whole frame
    const visualCandidates = this.objects.filter(o => 
      ['image', 'morph', 'player', 'stamp_layer'].includes(o.type) && o.isVisible !== false
    );
    const time = (this.currentTime || 0) * 2;

    this.objects.forEach(o => {
      // Visibility trimming
      const inPt = o.inPoint ?? 0;
      const outPt = o.outPoint ?? (inPt + (o.duration || 5));
      const currentTime = this.currentTime || 0;
      const isVisibleByTime = (currentTime >= inPt && currentTime <= outPt) || o.isPersistent === true;
      if (!isVisibleByTime || o.isVisible === false) return;

      if (o.type === 'light') {
        this.renderSingleLight(ctx, o, visualCandidates, time);
      } else {
        this.renderObject(ctx, o, 'visual', shouldShow);
      }
    });

    // 3. TECHNICAL & UI (NOT affected by light)
    this.objects.forEach(o => this.renderObject(ctx, o, 'technical', shouldShow));

    // 4. SELECTION AREA (Final overlay)
    if (this.isSelectArea) {
      const sx = Math.min(this.selectAreaStart.x, this.selectAreaEnd.x) * this.zoom + this.panX;
      const sy = Math.min(this.selectAreaStart.y, this.selectAreaEnd.y) * this.zoom + this.panY;
      const sw = Math.abs(this.selectAreaEnd.x - this.selectAreaStart.x) * this.zoom;
      const sh = Math.abs(this.selectAreaEnd.y - this.selectAreaStart.y) * this.zoom;
      ctx.save();
      ctx.resetTransform(); // Selection box is screen-space relative to canvas top-left
      ctx.fillStyle = 'rgba(81,197,255,0.1)';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = '#51c5ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.setLineDash([]);
      ctx.restore();
    }
    
    ctx.restore();
  }

  private renderObject(ctx: CanvasRenderingContext2D, o: any, pass: 'visual' | 'technical', shouldShow: (t: string) => boolean) {
    const isVisual = ['morph', 'player', 'image', 'stamp_layer'].includes(o.type);
    const isTechnical = ['collision', 'area_sensor', 'sensor', 'area', 'camera', 'insert_player', 'insert_camera'].includes(o.type);
    
    if (pass === 'visual' && !isVisual) return;
    if (pass === 'technical' && !isTechnical) return;

    // PERFORMANCE: Viewport Culling
    const wt = this.getWorldTransform(o);
    const screenX = wt.x * this.zoom + this.panX;
    const screenY = wt.y * this.zoom + this.panY;
    const screenW = wt.w * this.zoom;
    const screenH = wt.h * this.zoom;
    
    if (this.canvas) {
      const margin = 100; // Buffer for rotation/shadows
      if (
        screenX + screenW + margin < 0 || 
        screenX - margin > this.canvas.width || 
        screenY + screenH + margin < 0 || 
        screenY - margin > this.canvas.height
      ) return;
    }

    // LOGICA DE VISIBILIDADE (TRIMMING)
    const inPt = o.inPoint ?? 0;
    const outPt = o.outPoint ?? (inPt + (o.duration || 5));
    const currentTime = this.currentTime || 0;
    const isVisibleByTime = (currentTime >= inPt && currentTime <= outPt);
    const isPersistent = o.isPersistent === true;
    
    if (!isVisibleByTime && !isPersistent) return;
    if (o.isVisible === false) return;

    // === FASE 5: Usar world transform para objetos com parentId ===
    let baseX = o.x || 0;
    let baseY = o.y || 0;
    let baseW = o.w || 1;
    let baseH = o.h || 1;
    
    // Se tem parentId, usar o transform mundial já calculado
    if (o.parentId) {
      baseX = wt.x;
      baseY = wt.y;
      baseW = wt.w;
      baseH = wt.h;
    }

    // Render group containers
    if (o.type === 'group' || o._isGroup) {
      const sel = this.state.selectedIds.includes(o.id);
      if (sel && pass === 'technical') {
        ctx.save();
        ctx.fillStyle = 'rgba(81,197,255,0.03)';
        ctx.fillRect(baseX, baseY, baseW, baseH);
        ctx.strokeStyle = '#51c5ff';
        ctx.lineWidth = 2 / this.zoom;
        ctx.strokeRect(baseX, baseY, baseW, baseH);
        ctx.restore();
      }
      return;
    }

    if (o.type === 'stamp_layer' && o._stamps && o._stamps.length > 0) {
      o._stamps.forEach((s: any) => {
        const url = s.url || (this.stampBrush && this.stampBrush.stampUrl);
        if (!url) return;
        const img = this.imageCache.get(url) || (() => {
          const i = new Image(); i.src = url; this.imageCache.set(url, i); return i;
        })();
        if (img.complete && img.naturalWidth > 0) {
          const sw = s.size;
          const sh = s.size * (img.naturalHeight / img.naturalWidth);
          ctx.save();
          ctx.globalAlpha = (this.stampBrush && this.stampBrush.opacity !== undefined) ? this.stampBrush.opacity : 1;
          ctx.translate(s.x, s.y); 
          ctx.rotate((s.rotation || 0) * Math.PI / 180);
          ctx.scale(s.scaleX || 1, s.scaleY || 1);
          ctx.drawImage(img, -sw/2, -sh/2, sw, sh); 
          ctx.restore();
        }
      });
      return;
    }

    const pivotX = (o.pivotX !== undefined && o.pivotX !== null) ? o.pivotX : 0.5;
    const pivotY = (o.pivotY !== undefined && o.pivotY !== null) ? o.pivotY : 0.5;
    const sel = this.state.selectedIds.includes(o.id);

    ctx.save();
    ctx.globalAlpha = wt.opacity;
    ctx.translate(wt.x + wt.w * pivotX, wt.y + wt.h * pivotY);
    ctx.rotate(wt.rotation * Math.PI / 180);
    ctx.scale(wt.scaleX, wt.scaleY);
    ctx.translate(-wt.w * pivotX, -wt.h * pivotY);

    if (isVisual) {
       if (o.type === 'player' || o.type === 'morph' || o.type === 'image') {
          if (!shouldShow('morph')) { ctx.restore(); return; }
          const url = (o.type === 'player' || o.type === 'morph') ? this.resolveSpriteUrl(o) : (o.assetUrl || '');
          if (url) {
            if (url.toLowerCase().endsWith('.gif')) {
              // Defer GIF drawing to DOM overlay natively if flagged
              if ((this.state as any)._hideGifsForOverlay) {
                ctx.restore(); return;
              }
              this.drawGif(ctx, url, wt.w, wt.h);
            }
            else this.drawStaticImage(ctx, url, wt.w, wt.h);
          }
       }
    } else if (isTechnical) {
       if (o.type === 'vector' || o.points) {
          if (shouldShow('vector')) this.shapeRenderer.drawVectorShape(ctx, o, wt.opacity);
       } else if (['collision', 'area_sensor', 'sensor'].includes(o.type)) {
          const filter = o.type === 'collision' ? 'collision' : 'area_sensor';
          if (shouldShow(filter)) {
            const color = o.type === 'collision' ? '#ff4444' : '#44ccff';
            this.shapeRenderer.drawPrimitiveShape(ctx, o, wt.w, wt.h, o.type !== 'collision', wt.opacity);
          }
       }
    }

    if (sel && pass === 'technical' && o.isLocked !== true) {
        ctx.strokeStyle = '#51c5ff'; ctx.lineWidth = 2/this.zoom; ctx.strokeRect(-2,-2,wt.w+4,wt.h+4);
        ctx.fillStyle = '#fff'; const hs = this.handleSize/this.zoom;
        [[0,0],[wt.w,0],[0,wt.h],[wt.w,wt.h]].forEach(p => ctx.fillRect(p[0]-hs/2, p[1]-hs/2, hs, hs));
    }
    ctx.restore();
  }

  private renderSingleLight(ctx: CanvasRenderingContext2D, light: any, visualCandidates: any[], time: number) {
      const wt = this.getWorldTransform(light);
      
      // --- LIGHT ANIMATIONS ---
      let intensityMod = 1.0;
      let radiusMod = 1.0;
      let offsetX = 0;
      let offsetY = 0;

      const speed = light.animationSpeed || 1;
      const range = light.animationRange || 1;

      if (light.animationType === 'flicker') {
        intensityMod = 1.0 + (Math.random() - 0.5) * 0.4 * range;
      } else if (light.animationType === 'breath') {
        intensityMod = 1.0 + Math.sin(time * speed) * 0.2 * range;
        radiusMod = 1.0 + Math.sin(time * speed) * 0.1 * range;
      } else if (light.animationType === 'shake') {
        offsetX = (Math.random() - 0.5) * 10 * range;
        offsetY = (Math.random() - 0.5) * 10 * range;
      }

      const intensity = (light.intensity || 1) * intensityMod;
      const opacity = (light.opacity ?? 1) * wt.opacity * intensity;
      const cx = wt.x + wt.w / 2 + offsetX;
      const cy = wt.y + wt.h / 2 + offsetY;
      const radius = (light.radius || 150) * Math.max(wt.scaleX, wt.scaleY) * radiusMod;

      // --- RENDER SHADOWS FOR THIS LIGHT ---
      // We render shadows at the same layer as the light.
      // Objects ABOVE this light in the array will be drawn later and will cover the shadows.
      if (light.castShadows !== false) {
        this.renderShadowsForLight(ctx, light, cx, cy, radius, visualCandidates);
      }
      
      // --- RENDER LIGHT GRADIENT ---
      ctx.save();
      ctx.globalCompositeOperation = light.blendMode || 'lighter';
      ctx.globalAlpha = opacity;

      if (light.points && light.points.length > 0) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(wt.rotation * Math.PI / 180);
        ctx.translate(-wt.w/2, -wt.h/2);
        this.shapeRenderer.drawVectorShape(ctx, light, 1);
        ctx.restore();
      } else {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, light.color1 || '#ffffff');
        grad.addColorStop(1, light.color2 || '#00000000');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
  }

  private renderShadowsForLight(ctx: CanvasRenderingContext2D, light: any, lx: number, ly: number, radius: number, candidates: any[]) {
    candidates.forEach(obj => {
      if (obj.id === light.id) return;
      const owt = this.getWorldTransform(obj);
      const ocx = owt.x + owt.w / 2;
      const ocy = owt.y + owt.h / 2;
      
      const dx = ocx - lx;
      const dy = ocy - ly;
      const dist = Math.hypot(dx, dy);

      // Only shadow nearby objects, and skip if light is too close to center to avoid jumpy angles
      if (dist > radius || dist < 2) return;

      const angle = Math.atan2(dy, dx);
      // Shadow project factor — how long is the shadow
      const shadowLength = (1 - dist / radius) * 50; 
      
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = (1 - dist / radius) * 0.4; // Fade shadow with distance

      // Project shadow away from light
      ctx.translate(ocx + Math.cos(angle) * shadowLength, ocy + Math.sin(angle) * shadowLength);
      ctx.rotate(owt.rotation * Math.PI / 180);
      // Skew shadow away from light source (subtle perspective)
      ctx.scale(owt.scaleX, owt.scaleY * 0.9); 
      
      // Draw a dark silhouette of the object
      const url = obj.assetUrl || this.resolveSpriteUrl(obj);
      if (url) {
        // Zoom-aware blur to prevent pixelation/bugs
        ctx.filter = `brightness(0) blur(${Math.max(1, 4 / this.zoom)}px)`;
        
        if (url.toLowerCase().endsWith('.gif')) {
          // Draw current GIF frame silhouette
          const img = this._gifOverlayRefs.get(obj.id);
          if (img) {
            ctx.drawImage(img, -owt.w / 2, -owt.h / 2, owt.w, owt.h);
          } else {
            // Fallback to static if GIF not ready
            const cached = this.imageCache.get(url);
            if (cached && cached.complete) ctx.drawImage(cached, -owt.w / 2, -owt.h / 2, owt.w, owt.h);
          }
        } else {
          const img = this.imageCache.get(url) || (() => {
            const i = new Image(); i.src = url; this.imageCache.set(url, i); return i;
          })();
          if (img.complete) {
            ctx.drawImage(img, -owt.w / 2, -owt.h / 2, owt.w, owt.h);
          }
        }
      }
      ctx.restore();
    });
  }

  private resolveSpriteUrl(o: any): string {
    const time = this.currentTime || 0;
    const charData = o.charData || {};
    const dir = charData._currentDir || 'down';
    const isMoving = charData._isMoving || false;
    const preferredAction = charData._forceAction || (isMoving ? 'move' : 'idle');
    
    let resolved: any = null;
    const allDirs = [dir, 'down', 'right', 'left', 'up'];
    const allActions = [preferredAction, 'idle', 'move', 'extra1'];
    
    for (const a of allActions) {
      for (const d of allDirs) {
        if (charData[a]?.[d]) { resolved = charData[a][d]; break; }
      }
      if (resolved) break;
    }
    return resolved ? (resolved.gifUrl || resolved.asset || (resolved.frames?.[0] || '')) : (o.assetUrl || '');
  }

  // Helper to draw static images with caching
  private drawStaticImage(ctx: CanvasRenderingContext2D, url: string, w: number, h: number) {
    if (!this.imageCache.has(url)) {
      const img = new Image();
      img.src = url;
      this.imageCache.set(url, img);
    }
    const img = this.imageCache.get(url)!;
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, w, h);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  // ── GIF ANIMATION ENGINE ──────────────────────────────────────────────────
  // Primary: use DOM-animated overlay imgs (shared from WorldMapMain via setGifOverlayRefs).
  // These imgs are in the HTML DOM and Chrome animates them natively.
  // drawImage(img) captures the current GIF frame into the canvas pixels,
  // enabling the preview (which copies the canvas) to see animated GIFs.
  //
  // Fallback: gifAnimators with tickCanvas trick.
  private gifAnimators: Map<string, {
    img: HTMLImageElement;
    tickCanvas: HTMLCanvasElement;
    frameCanvas: HTMLCanvasElement;
    frameCtx: CanvasRenderingContext2D;
    intervalId: number;
    ready: boolean;
  }> = new Map();

  private drawGif(ctx: CanvasRenderingContext2D, url: string, w: number, h: number) {
    // Try primary: draw from DOM-animated overlay img (already in DOM, frame advances naturally)
    const overlayImg = this._findOverlayImgByUrl(url);
    if (overlayImg && overlayImg.complete && overlayImg.naturalWidth > 0) {
      ctx.drawImage(overlayImg, 0, 0, w, h);
      return;
    }

    // Fallback: gifAnimators approach
    if (!this.gifAnimators.has(url)) {
      const img = new Image();
      const tickCanvas = document.createElement('canvas');
      tickCanvas.width = 1;
      tickCanvas.height = 1;
      tickCanvas.style.cssText = `position:fixed;top:-2px;left:-2px;width:1px;height:1px;z-index:-9999;pointer-events:none;`;
      document.body.appendChild(tickCanvas);
      const tickCtx = tickCanvas.getContext('2d')!;
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = 256;
      frameCanvas.height = 256;
      const frameCtx = frameCanvas.getContext('2d')!;
      const entry = { img, tickCanvas, frameCanvas, frameCtx, intervalId: 0, ready: false };
      this.gifAnimators.set(url, entry);
      img.onload = () => {
        frameCanvas.width = img.naturalWidth || 256;
        frameCanvas.height = img.naturalHeight || 256;
        entry.ready = true;
        entry.intervalId = window.setInterval(() => {
          try {
            tickCtx.clearRect(0, 0, 1, 1);
            tickCtx.drawImage(img, 0, 0, 1, 1);
            frameCtx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
            frameCtx.drawImage(img, 0, 0, frameCanvas.width, frameCanvas.height);
          } catch (_) {}
        }, 16);
      };
      img.src = url;
    }
    const entry = this.gifAnimators.get(url)!;
    if (entry.ready) {
      ctx.drawImage(entry.frameCanvas, 0, 0, w, h);
    } else {
      ctx.fillStyle = 'rgba(255,200,50,0.08)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,200,50,0.5)';
      ctx.font = `bold ${Math.max(10, w * 0.1)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⏳', w / 2, h / 2);
    }
  }

  private _findOverlayImgByUrl(url: string): HTMLImageElement | null {
    // Check refs shared by WorldMapMain (objectId → img). Find any img whose src matches url.
    for (const img of this._gifOverlayRefs.values()) {
      if (img.dataset.gifSrc === url) return img;
    }
    return null;
  }

  // Cleanup all GIF animators (call when WorldMapMain is destroyed)
  destroyGifAnimators() {
    for (const entry of this.gifAnimators.values()) {
      clearInterval(entry.intervalId);
      entry.tickCanvas.remove();
    }
    this.gifAnimators.clear();
  }

  // Update preview camera
  updatePreviewCamera(): void { void 0; }
}
