export class InputHandler {
  // State
  private isPanning = false;
  private isDragging = false;
  private isResizing = false;
  private resizeHandle: string | null = null;
  private isCreatingShape = false;
  private currentShapeObject: any = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private _editingNode: number | null = null;
  private isSelectArea = false;
  private selectAreaStart = { x: 0, y: 0 };
  private selectAreaEnd = { x: 0, y: 0 };
  private stampMouseDownPos = { x: 0, y: 0 };
  private stampIsDragging = false;
  private stampMouseHeld = false;

  // Dependencies
  private canvas: HTMLCanvasElement | null = null;
  private state: any = {};
  private objects: any[] = [];
  private toolbar: any = {};
  private stampBrush: any = {};
  private zoom: number = 1;
  private panX: number = 0;
  private panY: number = 0;
  private selectedId: string | null = null;
  private playerObjectId: string | null = null;
  private handleSize = 8;

  // Callbacks
  private onDraw: () => void = () => {};
  private onReRender: () => void = () => {};
  private onCenterCamera: () => void = () => {};
  private onStampAt: (wx: number, wy: number) => void = () => {};
  private onPlayerCreated: (id: string) => void = () => {};
  private onSceneStamped: (sceneIdx: number) => void = () => {};

  // Setters
  setCanvas(c: HTMLCanvasElement | null) { this.canvas = c; }
  setState(s: any) { this.state = s; }
  setObjects(o: any[]) { this.objects = o; }
  setToolbar(t: any) { this.toolbar = t; }
  setStampBrush(sb: any) { this.stampBrush = sb; }
  setZoom(z: number) { this.zoom = z; }
  setPan(x: number, y: number) { this.panX = x; this.panY = y; }
  setSelectedId(id: string | null) { this.selectedId = id; }
  setPlayerObjectId(id: string | null) { this.playerObjectId = id; }
  getPlayerObjectId() { return this.playerObjectId; }
  setOnDraw(fn: () => void) { this.onDraw = fn; }
  setOnReRender(fn: () => void) { this.onReRender = fn; }
  setOnCenterCamera(fn: () => void) { this.onCenterCamera = fn; }
  setOnStampAt(fn: (wx: number, wy: number) => void) { this.onStampAt = fn; }
  setOnPlayerCreated(fn: (id: string) => void) { this.onPlayerCreated = fn; }
  setOnAssetCreated(_fn: (url: string, wx: number, wy: number) => void) { void _fn; }
  setOnSceneStamped(fn: (sceneIdx: number) => void) { this.onSceneStamped = fn; }
  setOnPanChange(_fn: (x: number, y: number) => void) { void _fn; }
  setOnZoomChange(_fn: (z: number) => void) { void _fn; }

  // Getters for state sync
  get isPanningState() { return this.isPanning; }
  get isDraggingState() { return this.isDragging; }
  get isResizingState() { return this.isResizing; }
  get resizeHandleState() { return this.resizeHandle; }
  get isCreatingShapeState() { return this.isCreatingShape; }
  get currentShapeObjectState() { return this.currentShapeObject; }
  get editingNodeState() { return this._editingNode; }
  get isSelectAreaState() { return this.isSelectArea; }
  get selectAreaStartState() { return this.selectAreaStart; }
  get selectAreaEndState() { return this.selectAreaEnd; }
  get stampMouseHeldState() { return this.stampMouseHeld; }
  set isPanningState(v: boolean) { this.isPanning = v; }
  set isDraggingState(v: boolean) { this.isDragging = v; }
  set isResizingState(v: boolean) { this.isResizing = v; }
  set resizeHandleState(v: string | null) { this.resizeHandle = v; }
  set isCreatingShapeState(v: boolean) { this.isCreatingShape = v; }
  set currentShapeObjectState(v: any) { this.currentShapeObject = v; }
  set editingNodeState(v: number | null) { this._editingNode = v; }
  set isSelectAreaState(v: boolean) { this.isSelectArea = v; }
  set selectAreaStartState(v: any) { this.selectAreaStart = v; }
  set selectAreaEndState(v: any) { this.selectAreaEnd = v; }
  set stampMouseHeldState(v: boolean) { this.stampMouseHeld = v; }

  // Helpers
  private toWorldX(sx: number) { return (sx - this.panX) / this.zoom; }
  private toWorldY(sy: number) { return (sy - this.panY) / this.zoom; }

  private objectAt(wx: number, wy: number) {
    const filters = this.state || {};
    const isFiltered = (o: any) => {
      if (o.isVisible === false) return true;
      if (o.type === 'collision' && filters.showCollision === false) return true;
      if (o.type === 'area_sensor' && filters.showSensors === false) return true;
      if (o.type === 'sensor' && filters.showSensors === false) return true;
      if (o.type === 'area' && filters.showAreas === false) return true;
      if ((o.type === 'morph' || o.type === 'image' || o.type === 'player') && filters.showMorphs === false) return true;
      if (o.type === 'vector' && filters.showVectors === false) return true;
      if (o.type === 'camera' && filters.showCams === false) return true;
      return false;
    };
    return this.objects.filter((o: any) => !isFiltered(o)).slice().reverse().find((o: any) => {
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

  private _pointToSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1; const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
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

  private resizeObject(obj: any, wx: number, wy: number) {
    if (!this.resizeHandle) return;
    const h = this.resizeHandle;
    if (h.includes('e')) obj.w = wx - obj.x; if (h.includes('s')) obj.h = wy - obj.y;
    if (h.includes('w')) { const d = wx - obj.x; obj.x = wx; obj.w -= d; }
    if (h.includes('n')) { const d = wy - obj.y; obj.y = wy; obj.h -= d; }
  }

  // Event handlers
  onMouseDown(e: MouseEvent) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const wx = this.toWorldX(e.clientX - rect.left);
    const wy = this.toWorldY(e.clientY - rect.top);
    if (e.button === 1 || e.button === 2 || e.altKey) { this.isPanning = true; return; }
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
      this.objects.splice(this.objects.indexOf(hit), 1);
      this.onDraw(); this.onReRender(); return;
    }
    if (toolId === 'vector_pen') {
      this.handleVectorPen(wx, wy); return;
    }
    if (['area_sensor', 'collision'].includes(toolId)) {
      this.isCreatingShape = true;
      const sub = this.toolbar.activeSubTool || 'rect';
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
        isEnabled: true,
        actionActive: true, // Enable events by default
      };
      this.objects.push(this.currentShapeObject);
      this.selectedId = this.currentShapeObject.id;
      this.state.selectedId = this.currentShapeObject.id;
      if (!this.state.selectedIds.includes(this.currentShapeObject.id)) {
        this.state.selectedIds = [...(this.state.selectedIds || []), this.currentShapeObject.id];
      }
      this.onDraw(); this.onReRender(); return;
    }
    if (toolId === 'player') {
      let player = this.objects.find((o: any) => o.type === 'player');
      if (player) {
        player.x = wx - 10;
        player.y = wy - 10;
        this.playerObjectId = player.id;
        this.state.selectedId = player.id;
        this.state.selectedIds = [player.id];
      } else {
        const playerId = 'player_' + Date.now();
        this.playerObjectId = playerId;
        this.objects.push({
          id: playerId, x: wx - 10, y: wy - 10, w: 20, h: 20,
          label: 'Player', color: '#4cff88', type: 'player',
          isVisible: true, opacity: 1.0, isLocked: true,
          isPersistent: true, artboardId: 'default', charData: { moveSpeed: 3 }
        });
        this.selectedId = playerId;
        this.onPlayerCreated(playerId);
      }
      this.onCenterCamera();
      this.onDraw(); this.onReRender(); return;
    }
    if (toolId === 'move' && hit) {
      const isCtrl = e.ctrlKey || e.metaKey;
      const ids = this.state.selectedIds || [];
      if (!isCtrl && !ids.includes(hit.id)) { this.state.selectedIds = [hit.id]; }
      else if (isCtrl) {
        if (ids.includes(hit.id)) this.state.selectedIds = ids.filter((id: string) => id !== hit.id);
        else this.state.selectedIds = [...ids, hit.id];
      }
      this.isDragging = true;
      this.dragStartX = wx; this.dragStartY = wy;
      this.onDraw(); return;
    }
    if (toolId === 'select' && hit) {
      const isCtrl = e.ctrlKey || e.metaKey;
      const ids = this.state.selectedIds || [];
      if (isCtrl) {
        if (ids.includes(hit.id)) this.state.selectedIds = ids.filter((id: string) => id !== hit.id);
        else this.state.selectedIds = [...ids, hit.id];
      } else { this.state.selectedIds = [hit.id]; }
      this.onDraw(); this.onReRender(); return;
    }
    if (toolId === 'select' && !hit) {
      this.isSelectArea = true;
      this.selectAreaStart = { x: wx, y: wy };
      this.selectAreaEnd = { x: wx, y: wy };
      if (!e.ctrlKey && !e.metaKey) { this.state.selectedIds = []; }
      this.onDraw(); return;
    }
    if (toolId === 'pan') {
      this.isPanning = true;
      this.dragStartX = wx; this.dragStartY = wy;
      this.onDraw(); return;
    }
    if (toolId === 'stamp' && this.stampBrush.stampUrl) {
      this.stampMouseDownPos = { x: wx, y: wy };
      this.stampIsDragging = false;
      this.stampMouseHeld = false;
      this.stampMouseHeld = true;
      return;
    }
    if (toolId === 'stamp' && this.stampBrush.stampType === 'scene' && this.stampBrush.stampSceneIdx !== undefined) {
      this.onSceneStamped(this.stampBrush.stampSceneIdx);
      this.onDraw(); this.onReRender();
      return;
    }
    this.state.selectedIds = [];
    this.onDraw(); this.onReRender();
  }

  private handleVectorPen(wx: number, wy: number) {
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
          this.currentShapeObject.type = objType;
          this.currentShapeObject.color = color;
          this.currentShapeObject.collisionMode = isCollision ? 'total' : undefined;
          this.currentShapeObject.navType = !isCollision ? 'walkable' : undefined;
          this.currentShapeObject.sensorTrigger = !isCollision ? 'onEnter' : undefined;
          this.currentShapeObject.sensorRadius = !isCollision ? 100 : undefined;
          this.currentShapeObject.isPersistent = true;
          this.currentShapeObject = null;
          this._editingNode = null;
          this.onDraw(); this.onReRender(); return;
        }
        for (let i = 0; i < pts.length; i++) {
          const dist = Math.hypot(wx - pts[i].x, wy - pts[i].y);
          if (dist < 12 / this.zoom) { this._editingNode = i; this.onDraw(); return; }
        }
        for (let i = 0; i < pts.length - 1; i++) {
          const dist = this._pointToSegmentDist(wx, wy, pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y);
          if (dist < 8 / this.zoom) {
            pts.splice(i + 1, 0, { x: Math.round(wx), y: Math.round(wy) });
            this.syncVectorBounds(this.currentShapeObject);
            this.onDraw(); this.onReRender(); return;
          }
        }
        const lastPt = pts[pts.length - 1];
        const distLast = Math.hypot(wx - lastPt.x, wy - lastPt.y);
        if (distLast < 5 / this.zoom) { this.onDraw(); return; }
      }
    }
    if (!this.currentShapeObject || this.currentShapeObject._vectorType !== sub) {
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
      this.objects.push(this.currentShapeObject);
      this.selectedId = this.currentShapeObject.id;
      this.state.selectedId = this.currentShapeObject.id;
      this._editingNode = null;
    } else {
      this.currentShapeObject.points.push({x: Math.round(wx), y: Math.round(wy)});
      this.syncVectorBounds(this.currentShapeObject);
    }
    this.onDraw(); this.onReRender();
  }

  onMouseMove(e: any) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const wx = this.toWorldX(e.clientX - rect.left);
    const wy = this.toWorldY(e.clientY - rect.top);
    const coords = document.getElementById('wm-coords');
    if (coords) coords.innerText = `X:${Math.round(wx)} Y:${Math.round(wy)}`;
    if (this.isPanning) { this.panX += e.movementX; this.panY += e.movementY; }
    else if (this.isResizing && this.state.selectedIds?.length > 0) {
      const obj = this.objects.find(o => o.id === this.state.selectedIds[0]);
      if (obj) { this.resizeObject(obj, wx, wy); }
    } else if (this.isDragging && this.state.selectedIds?.length > 0) {
      const dx = wx - this.dragStartX;
      const dy = wy - this.dragStartY;
      this.objects.forEach(o => {
        if (!this.state.selectedIds.includes(o.id)) return;
        o.x += dx; o.y += dy;
      });
      this.dragStartX = wx; this.dragStartY = wy;
      this.onDraw();
      document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
    } else if (this.isCreatingShape && this.currentShapeObject) {
      this.currentShapeObject.w = wx - this.currentShapeObject.x;
      this.currentShapeObject.h = wy - this.currentShapeObject.y;
    } else if (this.toolbar.activeTool === 'vector_pen' && this._editingNode !== null && this.currentShapeObject) {
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
        if (stampDist >= this.stampBrush.spacing) { this.onStampAt(wx, wy); }
      }
    }
    this.onDraw();
  }

  onMouseUp() {
    this.isPanning = false; this.isDragging = false; this.isResizing = false;
    if (this._editingNode !== null) { this._editingNode = null; }
    if (this.isCreatingShape) { this.isCreatingShape = false; this.currentShapeObject = null; this.onReRender(); }
    if (this.toolbar.activeTool === 'stamp' && this.stampBrush.stampUrl && this.stampBrush.stampType !== 'scene' && !this.stampIsDragging) {
      this.onStampAt(this.stampMouseDownPos.x, this.stampMouseDownPos.y);
      this.onDraw(); this.onReRender();
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
    this.onDraw();
  }

  onWheel(e: WheelEvent) {
    e.preventDefault();
    if (!this.canvas) return;
    const factor = e.deltaY < 0 ? 1.05 : 0.95;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
    const oldZoom = this.zoom;
    this.zoom = Math.max(0.1, Math.min(10, this.zoom * factor));
    this.panX -= (mx - this.panX) * (this.zoom / oldZoom - 1);
    this.panY -= (my - this.panY) * (this.zoom / oldZoom - 1);
    this.onDraw();
  }
}
