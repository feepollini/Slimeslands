/**
 * PhaseSpawnTool - Simple click-to-place spawn system
 * 
 * Workflow:
 * 1. User clicks on the map → places player + camera at that position
 * 2. A popup appears: "Salvar como spawn de fase?"
 * 3. If yes → opens save dialog to name the phase
 * 4. Saves everything within the camera frame as a phase preset
 * 5. Phases appear in the Scenes tab under "Fases" sub-tab
 */

export interface PhaseSpawn {
  id: string;
  name: string;
  playerPos: { x: number; y: number };
  cameraFrame: { x: number; y: number; w: number; h: number; mode: 'portrait' | 'landscape' };
  capturedObjects: any[];
  capturedCollisions: any[];
  capturedSensors: any[];
  capturedEvents: any[];
  createdAt: number;
  isDraft: boolean;
  fullMapState?: any;
}

export class PhaseSpawnTool {
  private state: any;
  private isActive = false;
  public get isActiveState(): boolean { return this.isActive; }
  private pendingSpawn: { x: number; y: number } | null = null;
  private spawns: PhaseSpawn[] = [];
  private cameraMode: 'portrait' | 'landscape' = 'portrait';
  private cameraW = 200;
  private cameraH = 333;

  constructor(state: any) {
    this.state = state;
    this.loadSpawns();
  }

  private updateCameraSize(): void {
    // Standardized to 200x333 to match PhaseDialog and WorldMapMain
    if (this.cameraMode === 'portrait') {
       this.cameraW = 200;
       this.cameraH = 333;
    } else {
       this.cameraW = 333;
       this.cameraH = 200;
    }
  }

  private loadSpawns(): void {
    try {
      const saved = localStorage.getItem('forge_phase_spawns');
      if (saved) this.spawns = JSON.parse(saved);
    } catch {}
  }

  private saveSpawns(): void {
    try {
      localStorage.setItem('forge_phase_spawns', JSON.stringify(this.spawns));
    } catch {}
  }

  activate(): void {
    this.isActive = true;
    this.updateCameraSize();
  }

  deactivate(): void {
    this.isActive = false;
    this.pendingSpawn = null;
    const popup = document.getElementById('phase-spawn-popup');
    if (popup) popup.remove();
  }

  handleClick(worldX: number, worldY: number): void {
    if (!this.isActive) return;

    this.pendingSpawn = { x: worldX, y: worldY };

    const pp = this.pendingSpawn;
    this.showPopup(pp.x, pp.y);
  }

  private showPopup(wx: number, wy: number): void {
    const existing = document.getElementById('phase-spawn-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'phase-spawn-popup';
    popup.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#1a1a22;border:1px solid #333;border-radius:10px;padding:16px 20px;z-index:10000;color:#ccc;font-family:Inter,sans-serif;min-width:320px;box-shadow:0 8px 32px rgba(0,0,0,0.6);';
    popup.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="font-size:18px;">🎮</span>
        <span style="font-size:13px;font-weight:700;color:#4cff88;">Spawn Position</span>
      </div>
      <div style="font-size:10px;color:#888;margin-bottom:12px;">
        Player: (${Math.round(wx)}, ${Math.round(wy)})<br>
        Camera: ${Math.round(this.cameraW)}×${Math.round(this.cameraH)} (${this.cameraMode})
      </div>
      <div style="display:flex;gap:6px;margin-bottom:8px;">
        <button id="phase-spawn-mode" style="flex:1;padding:6px 8px;background:rgba(74,158,255,0.1);border:1px solid rgba(74,158,255,0.2);border-radius:4px;color:#4a9eff;cursor:pointer;font-size:9px;font-weight:700;">📹 ${this.cameraMode}</button>
        <button id="phase-spawn-cancel" style="flex:1;padding:6px 8px;background:#222;border:1px solid #333;border-radius:4px;color:#888;cursor:pointer;font-size:9px;font-weight:700;">Cancelar</button>
      </div>
      <button id="phase-spawn-save" style="width:100%;padding:8px;background:rgba(76,255,136,0.15);border:1px solid rgba(76,255,136,0.3);border-radius:6px;color:#4cff88;cursor:pointer;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">✓ Salvar como Fase</button>
    `;
    document.body.appendChild(popup);

    popup.querySelector('#phase-spawn-mode')?.addEventListener('click', () => {
      this.cameraMode = this.cameraMode === 'portrait' ? 'landscape' : 'portrait';
      if (this.cameraMode === 'portrait') {
        this.cameraH = this.cameraW * (16 / 9);
      } else {
        this.cameraW = this.cameraH * (16 / 9);
      }
      this.updateCameraSize();
      this.showPopup(wx, wy);
    });

    popup.querySelector('#phase-spawn-cancel')?.addEventListener('click', () => {
      this.pendingSpawn = null;
      popup.remove();
    });

    popup.querySelector('#phase-spawn-save')?.addEventListener('click', () => {
      this.showSaveDialog();
      popup.remove();
    });
  }

  private showSaveDialog(): void {
    if (!this.pendingSpawn) return;

    const existing = document.getElementById('phase-spawn-save-dialog');
    if (existing) existing.remove();

    const pp = this.pendingSpawn;

    const dialog = document.createElement('div');
    dialog.id = 'phase-spawn-save-dialog';
    dialog.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a22;border:1px solid #333;border-radius:10px;padding:20px;z-index:100000;color:#ccc;font-family:Inter,sans-serif;min-width:350px;box-shadow:0 8px 32px rgba(0,0,0,0.6);';
    dialog.innerHTML = `
      <div style="font-size:14px;font-weight:700;margin-bottom:12px;color:#51c5ff;">💾 Salvar Fase</div>
      <div style="margin-bottom:12px;">
        <label style="font-size:10px;color:#888;display:block;margin-bottom:4px;">Nome da Fase</label>
        <input id="phase-spawn-name" type="text" placeholder="Ex: Floresta Inicial" style="width:100%;background:#0d0d15;border:1px solid #2a2a34;border-radius:4px;color:#fff;font-size:11px;padding:8px;outline:none;box-sizing:border-box;">
      </div>
      <div style="font-size:9px;color:#666;margin-bottom:12px;">
        Player: (${Math.round(pp.x)}, ${Math.round(pp.y)})<br>
        Camera: ${Math.round(this.cameraW)}×${Math.round(this.cameraH)} | ${this.cameraMode}<br>
        Área: (${Math.round(pp.x - this.cameraW / 2)}, ${Math.round(pp.y - this.cameraH / 2)}) → (${Math.round(pp.x + this.cameraW / 2)}, ${Math.round(pp.y + this.cameraH / 2)})
      </div>
      <div style="display:flex;gap:6px;">
        <button id="phase-spawn-back" style="flex:1;padding:6px 8px;background:#222;border:1px solid #333;border-radius:4px;color:#888;cursor:pointer;font-size:9px;font-weight:700;">Voltar</button>
        <button id="phase-spawn-confirm" style="flex:1;padding:6px 8px;background:rgba(76,255,136,0.15);border:1px solid rgba(76,255,136,0.3);border-radius:4px;color:#4cff88;cursor:pointer;font-size:9px;font-weight:700;">Salvar Fase</button>
      </div>
    `;
    document.body.appendChild(dialog);

    const nameInput = dialog.querySelector('#phase-spawn-name') as HTMLInputElement;
    nameInput?.focus();

    dialog.querySelector('#phase-spawn-back')?.addEventListener('click', () => {
      dialog.remove();
      this.showPopup(pp.x, pp.y);
    });

    dialog.querySelector('#phase-spawn-confirm')?.addEventListener('click', () => {
      const name = nameInput?.value?.trim() || `Fase ${this.spawns.length + 1}`;
      this.savePhase(name);
      dialog.remove();
    });

    nameInput?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const name = nameInput.value.trim() || `Fase ${this.spawns.length + 1}`;
        this.savePhase(name);
        dialog.remove();
      }
    });
  }

  private savePhase(name: string): void {
    if (!this.pendingSpawn) return;

    const pp = this.pendingSpawn;
    const halfW = this.cameraW / 2;
    const halfH = this.cameraH / 2;
    const frameX = pp.x - halfW;
    const frameY = pp.y - halfH;

    // Capture ALL objects from the map - everything
    const objects = this.state.worldMapObjects || [];

    const spawn: PhaseSpawn = {
      id: 'phase_' + Date.now(),
      name,
      playerPos: { x: pp.x, y: pp.y },
      cameraFrame: {
        x: frameX,
        y: frameY,
        w: this.cameraW,
        h: this.cameraH,
        mode: this.cameraMode
      },
      capturedObjects: JSON.parse(JSON.stringify(objects)),
      capturedCollisions: JSON.parse(JSON.stringify(objects.filter((o: any) => o.type === 'collision' || o.type === 'vector'))),
      capturedSensors: JSON.parse(JSON.stringify(objects.filter((o: any) => o.type === 'area_sensor'))),
      capturedEvents: JSON.parse(JSON.stringify(objects.filter((o: any) => o.area_sensorEvents).map((o: any) => ({ sourceId: o.id, events: o.area_sensorEvents })))),
      createdAt: Date.now(),
      isDraft: false,
      fullMapState: {
        zoom: this.state._mapZoom || 1,
        panX: this.state._mapPanX || 0,
        panY: this.state._mapPanY || 0,
        currentTime: this.state.currentTime || 0
      }
    };

    this.spawns.push(spawn);
    this.saveSpawns();

    // Also save to state for the Fases tab
    if (!this.state.phasePresets) this.state.phasePresets = [];
    this.state.phasePresets.push({
      id: spawn.id,
      name: spawn.name,
      spawnFrame: spawn.cameraFrame,
      playerPos: spawn.playerPos,
      objects: spawn.capturedObjects.length,
      createdAt: spawn.createdAt
    });

    this.pendingSpawn = null;

    // Dispatch event to update UI
    document.dispatchEvent(new CustomEvent('phase-spawn-saved', { detail: spawn }));

    // Show confirmation
    this.showConfirmation(name);
  }

  private showConfirmation(name: string): void {
    const existing = document.getElementById('phase-spawn-confirm');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'phase-spawn-confirm';
    toast.style.cssText = 'position:fixed;top:20px;right:20px;background:rgba(76,255,136,0.15);border:1px solid rgba(76,255,136,0.3);border-radius:8px;padding:12px 16px;z-index:100000;color:#4cff88;font-family:Inter,sans-serif;font-size:11px;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
    toast.innerHTML = `✓ Fase "${name}" salva com sucesso!`;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  // ── Rendering ────────────────────────────────────────────────────────

  render(ctx: CanvasRenderingContext2D, zoom: number, panX: number, panY: number): void {
    if (!this.isActive) return;

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Draw saved spawns as semi-transparent overlays
    for (const spawn of this.spawns) {
      const { x, y, w, h } = spawn.cameraFrame;

      ctx.fillStyle = 'rgba(76,255,136,0.05)';
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = 'rgba(76,255,136,0.3)';
      ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([6 / zoom, 4 / zoom]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      // Spawn point
      ctx.fillStyle = '#4cff88';
      ctx.shadowColor = '#4cff88';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      // Radius 10 matches 20x20 player size in world units
      ctx.arc(spawn.playerPos.x, spawn.playerPos.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(76,255,136,0.7)';
      ctx.font = `bold 10px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(spawn.name, x + 3, y + 3);
    }

    // Draw pending spawn preview
    if (this.pendingSpawn) {
      const pp = this.pendingSpawn;
      const halfW = this.cameraW / 2;
      const halfH = this.cameraH / 2;
      const fx = pp.x - halfW;
      const fy = pp.y - halfH;

      ctx.fillStyle = 'rgba(255,215,0,0.08)';
      ctx.fillRect(fx, fy, this.cameraW, this.cameraH);

      ctx.strokeStyle = 'rgba(255,215,0,0.6)';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([8 / zoom, 4 / zoom]);
      ctx.strokeRect(fx, fy, this.cameraW, this.cameraH);
      ctx.setLineDash([]);

      // Player marker
      ctx.fillStyle = '#4cff88';
      ctx.shadowColor = '#4cff88';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.font = `bold 8px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P', pp.x, pp.y);
    }

    ctx.restore();
  }

  // ── Public API ───────────────────────────────────────────────────────

  getSpawns(): PhaseSpawn[] {
    return this.spawns;
  }

  loadPhase(spawnId: string): void {
    const spawn = this.spawns.find(s => s.id === spawnId);
    if (!spawn) return;

    // Place player and camera at the spawn position
    const objects = this.state.worldMapObjects || [];

    const playerId = 'player_' + Date.now();
    objects.push({
      id: playerId,
      type: 'player',
      label: 'Player',
      x: spawn.playerPos.x - 10, y: spawn.playerPos.y - 10, w: 20, h: 20,
      isVisible: true, opacity: 1, isLocked: true,
      isPersistent: true, artboardId: 'default',
      inPoint: 0, outPoint: 5,
      charData: { moveSpeed: 3 }
    });

    const cameraId = 'camera_' + Date.now();
    objects.push({
      id: cameraId,
      type: 'camera',
      label: 'Câmera',
      x: spawn.cameraFrame.x, y: spawn.cameraFrame.y,
      w: spawn.cameraFrame.w, h: spawn.cameraFrame.h,
      isVisible: true, opacity: 1,
      isPersistent: true, artboardId: 'default',
      inPoint: 0, outPoint: 5,
      cameraMode: spawn.cameraFrame.mode
    });

    this.state.worldMapObjects = objects;
    document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
  }

  deleteSpawn(spawnId: string): void {
    this.spawns = this.spawns.filter(s => s.id !== spawnId);
    this.saveSpawns();
    document.dispatchEvent(new CustomEvent('phase-spawn-deleted', { detail: spawnId }));
  }

  destroy(): void {
    this.deactivate();
  }
}
