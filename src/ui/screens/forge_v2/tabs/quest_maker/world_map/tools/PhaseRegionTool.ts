/**
 * PhaseRegionTool - Region-based spawn and phase preset system
 * 
 * Workflow:
 * 1. User draws a region rectangle on the map
 * 2. All objects within the region are automatically captured
 * 3. User sets a spawn point within the region (click to place)
 * 4. Camera mode (portrait/landscape) is configured
 * 5. The region + captured objects + spawn + camera = a PhasePreset
 * 6. Presets can be saved, loaded, and used for continuous work
 * 
 * This is a BETA tool - isolated from existing spawn/phase systems.
 */

export interface PhaseRegion {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  spawnPoint: { x: number; y: number };
  cameraMode: 'portrait' | 'landscape';
  capturedObjects: any[];
  capturedCollisions: any[];
  capturedSensors: any[];
  capturedEvents: any[];
  createdAt: number;
  updatedAt: number;
  isDraft: boolean;
  draftState?: any; // Full state snapshot for continuous work
}

export class PhaseRegionTool {
  private state: any;
  private canvas: HTMLCanvasElement | null = null;
  private isActive = false;
  public get isActiveState(): boolean { return this.isActive; }
  private mode: 'idle' | 'drawing' | 'placing_spawn' | 'selecting' = 'idle';
  private drawStart: { x: number; y: number } | null = null;
  private drawCurrent: { x: number; y: number } | null = null;
  private regions: PhaseRegion[] = [];
  private selectedRegionId: string | null = null;
  private autoSaveTimer: number | null = null;
  private lastActivity = Date.now();
  private autoSaveInterval = 300000;

  constructor(state: any) {
    this.state = state;
    this.loadRegions();
  }

  // ── Persistence ──────────────────────────────────────────────────────

  private loadRegions(): void {
    try {
      const saved = localStorage.getItem('forge_phase_regions');
      if (saved) this.regions = JSON.parse(saved);
    } catch {}
  }

  private saveRegions(): void {
    try {
      localStorage.setItem('forge_phase_regions', JSON.stringify(this.regions));
    } catch {}
  }

  private recordActivity(): void {
    this.lastActivity = Date.now();
  }

  // ── Activation ───────────────────────────────────────────────────────

  activate(canvas: HTMLCanvasElement): void {
    this.isActive = true;
    this.canvas = canvas;
    this.mode = 'idle';
    this.drawStart = null;
    this.drawCurrent = null;

    this.bindEvents();
    this.startAutoSave();

    // Redraw canvas to show region overlays
    this.drawOverlays();
  }

  deactivate(): void {
    this.isActive = false;
    this.mode = 'idle';
    this.unbindEvents();
    this.stopAutoSave();
    this.drawOverlays();
  }

  // ── Auto-Save ────────────────────────────────────────────────────────

  private startAutoSave(): void {
    this.stopAutoSave();
    this.autoSaveTimer = window.setInterval(() => {
      if (!this.isActive) return;
      const inactive = Date.now() - this.lastActivity;
      if (inactive > this.autoSaveInterval) {
        this.promptSaveDraft();
      }
    }, 60000);
  }

  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  private promptSaveDraft(): void {
    if (this.regions.length === 0) return;

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a22;border:1px solid #333;border-radius:8px;padding:20px;z-index:100000;color:#ccc;font-family:Inter,sans-serif;min-width:300px;box-shadow:0 8px 32px rgba(0,0,0,0.6);';
    overlay.innerHTML = `
      <div style="font-size:14px;font-weight:700;margin-bottom:12px;color:#51c5ff;">💾 Salvar rascunho de regiões?</div>
      <p style="font-size:11px;color:#888;margin-bottom:16px;">Você tem ${this.regions.length} região(ões) não salvas. Deseja salvar o progresso?</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="phase-region-dismiss" style="padding:6px 16px;background:#222;border:1px solid #333;border-radius:4px;color:#888;cursor:pointer;font-size:11px;">Agora não</button>
        <button id="phase-region-save-all" style="padding:6px 16px;background:rgba(74,158,255,0.2);border:1px solid rgba(74,158,255,0.3);border-radius:4px;color:#4a9eff;cursor:pointer;font-size:11px;font-weight:700;">Salvar Tudo</button>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#phase-region-dismiss')?.addEventListener('click', () => {
      this.lastActivity = Date.now();
      overlay.remove();
    });
    overlay.querySelector('#phase-region-save-all')?.addEventListener('click', () => {
      this.saveAllDrafts();
      overlay.remove();
    });
  }

  private saveAllDrafts(): void {
    this.regions.forEach(r => {
      r.isDraft = false;
      r.draftState = this.captureFullState();
    });
    this.saveRegions();
    this.recordActivity();
  }

  // ── Event Binding ────────────────────────────────────────────────────

  private bindEvents(): void {
    if (!this.canvas) return;

    this.canvas.onpointerdown = (e) => this.onPointerDown(e);
    this.canvas.onpointermove = (e) => this.onPointerMove(e);
    this.canvas.onpointerup = () => this.onPointerUp();
    this.canvas.oncontextmenu = (e) => e.preventDefault();
  }

  private unbindEvents(): void {
    if (!this.canvas) return;
    this.canvas.onpointerdown = null;
    this.canvas.onpointermove = null;
    this.canvas.onpointerup = null;
    this.canvas.oncontextmenu = null;
  }

  // ── Coordinate Conversion ────────────────────────────────────────────

  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    // Uses the same zoom/pan as WorldMapMain
    const zoom = this.state._mapZoom || 1;
    const panX = this.state._mapPanX || 0;
    const panY = this.state._mapPanY || 0;
    return {
      x: (sx - panX) / zoom,
      y: (sy - panY) / zoom
    };
  }

  // ── Pointer Handlers ─────────────────────────────────────────────────

  private onPointerDown(e: PointerEvent): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = this.screenToWorld(sx, sy);

    if (this.mode === 'idle') {
      // Check if clicking on an existing region
      const clickedRegion = this.findRegionAt(world.x, world.y);
      if (clickedRegion) {
        this.selectedRegionId = clickedRegion.id;
        this.mode = 'selecting';
      } else {
        // Start drawing a new region
        this.mode = 'drawing';
        this.drawStart = { x: world.x, y: world.y };
        this.drawCurrent = { x: world.x, y: world.y };
        this.selectedRegionId = null;
      }
    } else if (this.mode === 'selecting') {
      // Check if clicking on spawn point area
      const region = this.regions.find(r => r.id === this.selectedRegionId);
      if (region) {
        // Place spawn point
        region.spawnPoint = { x: world.x, y: world.y };
        region.updatedAt = Date.now();
        this.recordActivity();
        this.saveRegions();
      }
    }

    this.drawOverlays();
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.canvas || this.mode !== 'drawing') return;
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = this.screenToWorld(sx, sy);

    this.drawCurrent = { x: world.x, y: world.y };
    this.drawOverlays();
  }

  private onPointerUp(): void {
    if (this.mode === 'drawing' && this.drawStart && this.drawCurrent) {
      const x = Math.min(this.drawStart.x, this.drawCurrent.x);
      const y = Math.min(this.drawStart.y, this.drawCurrent.y);
      const w = Math.abs(this.drawCurrent.x - this.drawStart.x);
      const h = Math.abs(this.drawCurrent.y - this.drawStart.y);

      if (w > 20 && h > 20) {
        this.createRegion(x, y, w, h);
      }

      this.mode = 'idle';
      this.drawStart = null;
      this.drawCurrent = null;
      this.drawOverlays();
    }
  }

  // ── Region Creation ──────────────────────────────────────────────────

  private createRegion(x: number, y: number, w: number, h: number): void {
    const id = 'phase_region_' + Date.now();
    const objects = this.state.worldMapObjects || [];

    // Capture all objects within the region
    const capturedObjects = objects.filter((o: any) => {
      if (o.type === 'player' || o.type === 'camera') return false;
      const ox = o.x || 0;
      const oy = o.y || 0;
      const ow = o.w || 50;
      const oh = o.h || 50;
      return ox + ow > x && ox < x + w && oy + oh > y && oy < y + h;
    });

    const capturedCollisions = capturedObjects.filter((o: any) => o.type === 'collision' || o.type === 'vector');
    const capturedSensors = capturedObjects.filter((o: any) => o.type === 'area_sensor');
    const capturedEvents = capturedObjects.filter((o: any) => o.area_sensorEvents).map((o: any) => ({
      sourceId: o.id,
      events: o.area_sensorEvents
    }));

    const region: PhaseRegion = {
      id,
      name: `Região ${this.regions.length + 1}`,
      x, y, w, h,
      spawnPoint: { x: x + w / 2, y: y + h / 2 },
      cameraMode: 'portrait',
      capturedObjects: JSON.parse(JSON.stringify(capturedObjects)),
      capturedCollisions: JSON.parse(JSON.stringify(capturedCollisions)),
      capturedSensors: JSON.parse(JSON.stringify(capturedSensors)),
      capturedEvents: JSON.parse(JSON.stringify(capturedEvents)),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDraft: true,
      draftState: this.captureFullState()
    };

    this.regions.push(region);
    this.selectedRegionId = id;
    this.saveRegions();
    this.recordActivity();

    // Show region info
    this.showRegionInfo(region);
  }

  private captureFullState(): any {
    return {
      worldMapObjects: JSON.parse(JSON.stringify(this.state.worldMapObjects || [])),
      zoom: this.state._mapZoom || 1,
      panX: this.state._mapPanX || 0,
      panY: this.state._mapPanY || 0,
      currentTime: this.state.currentTime || 0
    };
  }

  // ── Region Queries ───────────────────────────────────────────────────

  private findRegionAt(wx: number, wy: number): PhaseRegion | null {
    for (let i = this.regions.length - 1; i >= 0; i--) {
      const r = this.regions[i];
      if (wx >= r.x && wx <= r.x + r.w && wy >= r.y && wy <= r.y + r.h) {
        return r;
      }
    }
    return null;
  }

  // ── Rendering Overlays ───────────────────────────────────────────────

  private drawOverlays(): void {
    // This is called after WorldMapMain.draw() to overlay regions
    // We use a custom event to trigger redraw with overlays
    document.dispatchEvent(new CustomEvent('phase-region-redraw', {
      detail: {
        regions: this.regions,
        selectedId: this.selectedRegionId,
        mode: this.mode,
        drawStart: this.drawStart,
        drawCurrent: this.drawCurrent
      }
    }));
  }

  // ── UI ───────────────────────────────────────────────────────────────

  private showRegionInfo(region: PhaseRegion): void {
    const existing = document.getElementById('phase-region-info');
    if (existing) existing.remove();

    const info = document.createElement('div');
    info.id = 'phase-region-info';
    info.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1a1a22;border:1px solid #333;border-radius:8px;padding:12px 16px;z-index:10000;color:#ccc;font-family:Inter,sans-serif;min-width:280px;box-shadow:0 8px 32px rgba(0,0,0,0.6);';
    info.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:16px;">🗺️</span>
        <span style="font-size:13px;font-weight:700;color:#4cff88;">${region.name}</span>
        <span style="font-size:9px;color:#666;">${region.isDraft ? '(Rascunho)' : '(Salvo)'}</span>
      </div>
      <div style="font-size:10px;color:#888;margin-bottom:8px;">
        Posição: (${Math.round(region.x)}, ${Math.round(region.y)}) | Tamanho: ${Math.round(region.w)}×${Math.round(region.h)}<br>
        Spawn: (${Math.round(region.spawnPoint.x)}, ${Math.round(region.spawnPoint.y)}) | Camera: ${region.cameraMode}<br>
        Objetos capturados: ${region.capturedObjects.length} | Colisões: ${region.capturedCollisions.length} | Sensores: ${region.capturedSensors.length}
      </div>
      <div style="display:flex;gap:6px;">
        <button id="phase-region-rename" style="flex:1;padding:5px 8px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.2);border-radius:4px;color:#ffd700;cursor:pointer;font-size:9px;font-weight:700;">✏️ Renomear</button>
        <button id="phase-region-camera" style="flex:1;padding:5px 8px;background:rgba(74,158,255,0.1);border:1px solid rgba(74,158,255,0.2);border-radius:4px;color:#4a9eff;cursor:pointer;font-size:9px;font-weight:700;">📹 ${region.cameraMode}</button>
        <button id="phase-region-save" style="flex:1;padding:5px 8px;background:rgba(76,255,136,0.1);border:1px solid rgba(76,255,136,0.2);border-radius:4px;color:#4cff88;cursor:pointer;font-size:9px;font-weight:700;">💾 Salvar</button>
        <button id="phase-region-delete" style="padding:5px 8px;background:rgba(255,68,68,0.1);border:1px solid rgba(255,68,68,0.2);border-radius:4px;color:#ff4444;cursor:pointer;font-size:9px;font-weight:700;">✕</button>
      </div>
    `;
    document.body.appendChild(info);

    info.querySelector('#phase-region-rename')?.addEventListener('click', () => {
      const name = prompt('Nome da região:', region.name);
      if (name) {
        region.name = name;
        region.updatedAt = Date.now();
        this.saveRegions();
        this.recordActivity();
        this.showRegionInfo(region);
      }
    });

    info.querySelector('#phase-region-camera')?.addEventListener('click', () => {
      region.cameraMode = region.cameraMode === 'portrait' ? 'landscape' : 'portrait';
      region.updatedAt = Date.now();
      this.saveRegions();
      this.recordActivity();
      this.showRegionInfo(region);
    });

    info.querySelector('#phase-region-save')?.addEventListener('click', () => {
      region.isDraft = false;
      region.draftState = this.captureFullState();
      region.updatedAt = Date.now();
      this.saveRegions();
      this.recordActivity();
      this.showRegionInfo(region);
    });

    info.querySelector('#phase-region-delete')?.addEventListener('click', () => {
      if (confirm(`Deletar "${region.name}"?`)) {
        this.regions = this.regions.filter(r => r.id !== region.id);
        this.selectedRegionId = null;
        this.saveRegions();
        this.recordActivity();
        info.remove();
        this.drawOverlays();
      }
    });
  }

  // ── Render (called by WorldMapMain) ──────────────────────────────────

  render(ctx: CanvasRenderingContext2D, zoom: number, panX: number, panY: number): void {
    if (!this.isActive) return;

    const colors: any = {
      default: 'rgba(76,255,136,0.08)',
      defaultBorder: 'rgba(76,255,136,0.4)',
      selected: 'rgba(255,215,0,0.1)',
      selectedBorder: 'rgba(255,215,0,0.7)',
      drawing: 'rgba(74,158,255,0.1)',
      drawingBorder: 'rgba(74,158,255,0.6)',
      spawn: '#4cff88',
      spawnBorder: '#fff'
    };

    for (const region of this.regions) {
      const isSelected = region.id === this.selectedRegionId;
      const bgColor = isSelected ? colors.selected : colors.default;
      const borderColor = isSelected ? colors.selectedBorder : colors.defaultBorder;

      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(zoom, zoom);

      // Region fill
      ctx.fillStyle = bgColor;
      ctx.fillRect(region.x, region.y, region.w, region.h);

      // Region border
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([8 / zoom, 4 / zoom]);
      ctx.strokeRect(region.x, region.y, region.w, region.h);
      ctx.setLineDash([]);

      // Spawn point
      ctx.fillStyle = colors.spawn;
      ctx.shadowColor = colors.spawn;
      ctx.shadowBlur = 10 / zoom;
      ctx.beginPath();
      ctx.arc(region.spawnPoint.x, region.spawnPoint.y, 8 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = colors.spawnBorder;
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();

      // Spawn label
      ctx.fillStyle = '#000';
      ctx.font = `bold ${10 / zoom}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', region.spawnPoint.x, region.spawnPoint.y);

      // Region name
      ctx.fillStyle = isSelected ? '#ffd700' : '#4cff88';
      ctx.font = `bold ${12 / zoom}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(region.name, region.x + 4 / zoom, region.y + 4 / zoom);

      // Object count
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = `${9 / zoom}px sans-serif`;
      ctx.fillText(`${region.capturedObjects.length} objs`, region.x + 4 / zoom, region.y + 18 / zoom);

      ctx.restore();
    }

    // Drawing preview
    if (this.mode === 'drawing' && this.drawStart && this.drawCurrent) {
      const x = Math.min(this.drawStart.x, this.drawCurrent.x);
      const y = Math.min(this.drawStart.y, this.drawCurrent.y);
      const w = Math.abs(this.drawCurrent.x - this.drawStart.x);
      const h = Math.abs(this.drawCurrent.y - this.drawStart.y);

      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(zoom, zoom);

      ctx.fillStyle = colors.drawing;
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = colors.drawingBorder;
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([6 / zoom, 4 / zoom]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      ctx.fillStyle = '#4a9eff';
      ctx.font = `bold ${11 / zoom}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(w)}×${Math.round(h)}`, x + w / 2, y + h / 2);

      ctx.restore();
    }
  }

  // ── Public API ───────────────────────────────────────────────────────

  getRegions(): PhaseRegion[] {
    return this.regions;
  }

  getSelectedRegion(): PhaseRegion | null {
    return this.regions.find(r => r.id === this.selectedRegionId) || null;
  }

  selectRegion(id: string): void {
    this.selectedRegionId = id;
    const region = this.regions.find(r => r.id === id);
    if (region) {
      this.showRegionInfo(region);
    }
    this.drawOverlays();
  }

  deleteRegion(id: string): void {
    this.regions = this.regions.filter(r => r.id !== id);
    if (this.selectedRegionId === id) this.selectedRegionId = null;
    this.saveRegions();
    this.recordActivity();
    this.drawOverlays();
  }

  // ── Phase Creation from Region ───────────────────────────────────────

  createPhaseFromRegion(regionId: string): void {
    const region = this.regions.find(r => r.id === regionId);
    if (!region) return;

    const objects = this.state.worldMapObjects || [];

    // Store phase info in state (not as canvas object)
    const phaseId = 'phase_' + Date.now();
    this.state.currentPhase = {
      id: phaseId,
      name: region.name,
      spawnFrame: { x: region.x, y: region.y, w: region.w, h: region.h, mode: region.cameraMode },
      playerPos: { ...region.spawnPoint }
    };

    // Create player at spawn point
    const playerId = 'player_' + Date.now();
    objects.push({
      id: playerId,
      type: 'player',
      label: 'Player',
      x: region.spawnPoint.x - 10, y: region.spawnPoint.y - 10, w: 20, h: 20,
      isVisible: true, opacity: 1, isLocked: true,
      isPersistent: true, artboardId: 'default',
      inPoint: 0, outPoint: 5,
      parentId: phaseId,
      charData: { moveSpeed: 3 }
    });

    // Create camera at spawn frame
    const cameraId = 'camera_' + Date.now();
    objects.push({
      id: cameraId,
      type: 'camera',
      label: 'Câmera',
      x: region.x, y: region.y, w: region.w, h: region.h,
      isVisible: true, opacity: 1,
      isPersistent: true, artboardId: 'default',
      inPoint: 0, outPoint: 5,
      parentId: phaseId,
      cameraMode: region.cameraMode
    });

    // Create spawn group
    const groupId = 'spawn_' + Date.now();
    objects.push({
      id: groupId,
      type: 'group',
      label: 'Spawn',
      _isGroup: true,
      x: region.x, y: region.y, w: region.w, h: region.h,
      isVisible: true, opacity: 1,
      isPersistent: true, artboardId: 'default',
      inPoint: 0, outPoint: 5,
      parentId: phaseId
    });

    // Link player and camera to spawn group
    const player = objects.find((o: any) => o.id === playerId);
    const camera = objects.find((o: any) => o.id === cameraId);
    if (player) player.parentId = groupId;
    if (camera) camera.parentId = groupId;

    this.state.worldMapObjects = objects;
    this.state.selectedIds = [phaseId];
    this.state.selectedId = phaseId;
    this.state.expandedLayerIds = [phaseId, groupId];

    document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
  }

  // ── Cleanup ──────────────────────────────────────────────────────────

  destroy(): void {
    this.deactivate();
    const info = document.getElementById('phase-region-info');
    if (info) info.remove();
  }
}
