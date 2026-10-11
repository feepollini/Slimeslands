export interface PhasePreset {
  name: string;
  phaseId: string;
  spawnFrame: { x: number; y: number; w: number; h: number; mode: 'portrait' | 'landscape' };
  playerPos: { x: number; y: number };
  objects: any[];
  collisions: any[];
  sensors: any[];
  events: any[];
  createdAt: number;
  updatedAt: number;
}

export class PhaseDialog {
  private state: any;
  public isOpen = false;
  private previewCanvas: HTMLCanvasElement | null = null;
  private liveCanvas: HTMLCanvasElement | null = null;
  private dragState: { startX: number; startY: number; origMapOffX: number; origMapOffY: number } | null = null;
  private mapOffsetX = 0;
  private mapOffsetY = 0;
  private autoSaveTimer: number | null = null;
  private lastActivity = Date.now();
  private autoSaveInterval = 300000;
  private presets: PhasePreset[] = [];
  private _boundMouseMove: any = null;
  private _boundMouseUp: any = null;

  private renderPipeline: any = null;

  constructor(state: any, _callbacks: any, renderPipeline: any = null) {
    this.state = state;
    this.loadPresets();
    this.renderPipeline = renderPipeline;
  }

  private loadPresets(): void {
    try {
      const saved = localStorage.getItem('forge_phase_presets');
      if (saved) this.presets = JSON.parse(saved);
    } catch {}
  }

  private savePresets(): void {
    try {
      localStorage.setItem('forge_phase_presets', JSON.stringify(this.presets));
    } catch {}
  }

  private getFullMapBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    const canvasW = this.state._mapCanvasDims?.w || 1600;
    const canvasH = this.state._mapCanvasDims?.h || 1200;
    const zoom = this.state._mapZoom || 1;
    const panX = this.state._mapPanX || 0;
    const panY = this.state._mapPanY || 0;
    const worldW = canvasW / zoom;
    const worldH = canvasH / zoom;
    const viewMinX = -panX / zoom;
    const viewMinY = -panY / zoom;
    const viewMaxX = viewMinX + worldW;
    const viewMaxY = viewMinY + worldH;
    const padW = worldW * 2;
    const padH = worldH * 2;
    return {
      minX: viewMinX - padW,
      minY: viewMinY - padH,
      maxX: viewMaxX + padW,
      maxY: viewMaxY + padH
    };
  }

  open(): void {
    this.isOpen = true;
    this.lastActivity = Date.now();

    if (!this.state.phaseSpawnFrame) {
      const bounds = this.getFullMapBounds();
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const frameW = 200;
      const frameH = 333;
      this.state.phaseSpawnFrame = {
        x: centerX - frameW / 2,
        y: centerY - frameH / 2,
        w: frameW,
        h: frameH,
        mode: 'portrait'
      };
      this.state.phasePlayerPos = { x: centerX, y: centerY };
    }

    this.mapOffsetX = 0;
    this.mapOffsetY = 0;

    this.startAutoSaveTimer();
    this.render();
    this.bind();
  }

  close(): void {
    this.isOpen = false;
    this.stopAutoSaveTimer();
    const el = document.getElementById('phase-dialog-overlay');
    if (el) el.remove();

    if (this._boundMouseMove) {
      document.removeEventListener('mousemove', this._boundMouseMove);
      this._boundMouseMove = null;
    }
    if (this._boundMouseUp) {
      document.removeEventListener('mouseup', this._boundMouseUp);
      this._boundMouseUp = null;
    }
  }

  recordActivity(): void {
    this.lastActivity = Date.now();
  }

  private startAutoSaveTimer(): void {
    this.stopAutoSaveTimer();
    this.autoSaveTimer = window.setInterval(() => {
      if (this.isOpen) {
        const inactive = Date.now() - this.lastActivity;
        if (inactive > this.autoSaveInterval) {
          this.promptSave();
        }
      }
    }, 60000);
  }

  private stopAutoSaveTimer(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  private promptSave(): void {
    const overlay = document.getElementById('phase-dialog-overlay');
    if (!overlay) return;
    const existing = document.getElementById('phase-save-prompt');
    if (existing) return;

    const prompt = document.createElement('div');
    prompt.id = 'phase-save-prompt';
    prompt.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a22;border:1px solid #333;border-radius:8px;padding:20px;z-index:100000;color:#ccc;font-family:Inter,sans-serif;min-width:300px;box-shadow:0 8px 32px rgba(0,0,0,0.6);';
    prompt.innerHTML = `
      <div style="font-size:14px;font-weight:700;margin-bottom:12px;color:#51c5ff;">💾 Salvar rascunho da fase?</div>
      <p style="font-size:11px;color:#888;margin-bottom:16px;">Você está inativo há alguns minutos. Deseja salvar o progresso atual?</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="phase-save-dismiss" style="padding:6px 16px;background:#222;border:1px solid #333;border-radius:4px;color:#888;cursor:pointer;font-size:11px;">Agora não</button>
        <button id="phase-save-confirm" style="padding:6px 16px;background:rgba(74,158,255,0.2);border:1px solid rgba(74,158,255,0.3);border-radius:4px;color:#4a9eff;cursor:pointer;font-size:11px;font-weight:700;">Salvar</button>
      </div>
    `;
    overlay.appendChild(prompt);

    prompt.querySelector('#phase-save-dismiss')?.addEventListener('click', () => {
      this.lastActivity = Date.now();
      prompt.remove();
    });
    prompt.querySelector('#phase-save-confirm')?.addEventListener('click', () => {
      this.saveDraft();
      prompt.remove();
    });
  }

  public saveDraft(): void {
    const sf = this.state.phaseSpawnFrame;
    const pp = this.state.phasePlayerPos;
    if (!sf || !pp) return;
    const objects = this.state.worldMapObjects || [];

    const preset: PhasePreset = {
      name: `Fase ${this.presets.length + 1}`,
      phaseId: 'phase_' + Date.now(),
      spawnFrame: { ...sf },
      playerPos: { ...pp },
      objects: JSON.parse(JSON.stringify(objects)),
      collisions: objects.filter((o: any) => o.type === 'collision'),
      sensors: objects.filter((o: any) => o.type === 'area_sensor'),
      events: objects.filter((o: any) => o.area_sensorEvents).map((o: any) => ({ sourceId: o.id, events: o.area_sensorEvents })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.presets.push(preset);
    this.savePresets();

    if (!this.state.phasePresets) this.state.phasePresets = [];
    this.state.phasePresets.push({
      name: preset.name,
      spawnFrame: preset.spawnFrame,
      playerPos: preset.playerPos,
      objects: preset.objects.length,
    });

    this.recordActivity();
  }

  private getFramePixelSize(containerW: number, containerH: number): { w: number; h: number } {
    const frameW = Math.min(containerW * 0.35, containerH * 0.7 * (9 / 16));
    const frameH = frameW * (16 / 9);
    return { w: frameW, h: frameH };
  }


  render(): void {
    const existing = document.getElementById('phase-dialog-overlay');
    if (existing) existing.remove();

    const sf = this.state.phaseSpawnFrame || { x: 0, y: 0, w: 1600, h: 1200, mode: 'portrait' };
    const pp = this.state.phasePlayerPos || { x: sf.x + sf.w / 2, y: sf.y + sf.h / 2 };
    const presets = this.presets;
    const bounds = this.getFullMapBounds();
    const mapFullW = Math.round(bounds.maxX - bounds.minX);
    const mapFullH = Math.round(bounds.maxY - bounds.minY);

    const scenesOptions = (this.state.savedScenes || []).map((s: any) =>
      `<option value="${s.id || s.name}">${s.name || 'Cena'}</option>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.id = 'phase-dialog-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;';

    overlay.innerHTML = `
      <div id="phase-dialog" style="background:#111118;border:1px solid #2a2a34;border-radius:12px;width:95vw;max-width:1300px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 64px rgba(0,0,0,0.8);">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #1e1e26;background:#131318;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:16px;">∞</span>
            <span style="font-size:13px;font-weight:700;color:#4cff88;">Ferramenta Fases</span>
            <span style="font-size:9px;color:#555;">| Mapa: ${mapFullW}×${mapFullH}</span>
          </div>
          <div style="display:flex;gap:6px;">
            <button id="phase-autosave-config" style="padding:5px 10px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.2);border-radius:4px;color:#ffd700;cursor:pointer;font-size:10px;font-weight:700;">⏱ Auto-Save</button>
            <button id="phase-save-draft" style="padding:5px 12px;background:rgba(76,255,136,0.1);border:1px solid rgba(76,255,136,0.2);border-radius:4px;color:#4cff88;cursor:pointer;font-size:10px;font-weight:700;">💾 Salvar</button>
            <button id="phase-spawn-confirm" style="padding:5px 12px;background:rgba(74,158,255,0.15);border:1px solid rgba(74,158,255,0.3);border-radius:4px;color:#4a9eff;cursor:pointer;font-size:10px;font-weight:700;">✓ Spawn</button>
            <button id="phase-close" style="width:26px;height:26px;background:#1a1a22;border:1px solid #2a2a34;border-radius:4px;color:#888;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;">✕</button>
          </div>
        </div>

        <div style="flex:1;display:flex;overflow:hidden;">
          <div style="flex:1;display:flex;flex-direction:column;position:relative;background:#0a0a0e;">
            <div style="padding:5px 10px;border-bottom:1px solid #1a1a20;background:#0e0e12;display:flex;align-items:center;gap:6px;flex-shrink:0;flex-wrap:wrap;">
              <span style="font-size:9px;color:#666;">Arraste o mapa para posicionar o spawn sob o frame:</span>
              <span style="font-size:8px;color:#444;">Player: (${Math.round(pp.x)}, ${Math.round(pp.y)})</span>
              <select id="phase-frame-mode" style="background:#1a1a22;border:1px solid #2a2a34;border-radius:3px;color:#aaa;font-size:8px;padding:2px 4px;margin-left:4px;">
                <option value="portrait" ${sf.mode === 'portrait' ? 'selected' : ''}>Retrato 9:16</option>
                <option value="landscape" ${sf.mode === 'landscape' ? 'selected' : ''}>Paisagem 16:9</option>
              </select>
            </div>
            <div id="phase-map-preview" style="flex:1;position:relative;overflow:hidden;cursor:grab;">
              <canvas id="phase-preview-canvas" style="position:absolute;top:0;left:0;"></canvas>
              <div id="phase-frame-overlay" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);border:2px dashed rgba(255,215,0,0.7);background:rgba(0,0,0,0.1);pointer-events:none;z-index:10;overflow:hidden;box-shadow:0 0 0 9999px rgba(0,0,0,0.3);">
                <canvas id="phase-frame-canvas" style="width:100%;height:100%;"></canvas>
              </div>
            </div>
          </div>

          <div style="width:260px;border-left:1px solid #1a1a20;display:flex;flex-direction:column;background:#111115;flex-shrink:0;">
            <div style="padding:8px;border-bottom:1px solid #1a1a20;flex-shrink:0;">
              <div style="font-size:9px;font-weight:700;color:#666;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;">Camera View</div>
              <div id="phase-live-preview" style="width:90%;aspect-ratio:${sf.mode === 'portrait' ? '9/16' : '16/9'};margin:0 auto;border:3px dashed rgba(255,255,255,0.06);border-radius:8px;overflow:hidden;position:relative;background:#000;">
                <canvas id="phase-live-canvas" style="width:100%;height:100%;"></canvas>
              </div>
              <div style="font-size:8px;color:#444;margin-top:3px;text-align:center;" id="phase-frame-info">Frame: ${Math.round(sf.w)}×${Math.round(sf.h)} | Player: (${Math.round(pp.x)}, ${Math.round(pp.y)})</div>
            </div>

            <div style="padding:8px;border-bottom:1px solid #1a1a20;flex-shrink:0;">
              <div style="font-size:9px;font-weight:700;color:#666;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;">Cena de Spawn</div>
              <select id="phase-spawn-scene" style="width:100%;background:#1a1a22;border:1px solid #2a2a34;border-radius:3px;color:#aaa;font-size:9px;padding:3px 6px;">
                <option value="">— Nenhuma —</option>
                <option value="default">Cena Padrão</option>
                ${scenesOptions}
              </select>
              <button id="phase-add-scene" style="width:100%;margin-top:3px;padding:3px;background:rgba(74,158,255,0.08);border:1px solid rgba(74,158,255,0.15);border-radius:3px;color:#4a9eff;cursor:pointer;font-size:8px;">+ Adicionar Cena/Motion</button>
            </div>

            <div style="flex:1;overflow-y:auto;padding:8px;">
              <div style="font-size:9px;font-weight:700;color:#666;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;">Presets (${presets.length})</div>
              ${presets.length === 0 ? '<div style="font-size:8px;color:#333;text-align:center;padding:10px;">Nenhum preset</div>' : ''}
              ${presets.map((p: PhasePreset, i: number) => `
                <div class="phase-preset-item" data-idx="${i}" style="padding:5px 6px;background:#1a1a22;border:1px solid #2a2a34;border-radius:3px;margin-bottom:3px;cursor:pointer;">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:9px;font-weight:600;color:#aaa;">${p.name}</span>
                    <button class="phase-preset-delete" data-idx="${i}" style="background:none;border:none;color:#ff4444;cursor:pointer;font-size:9px;">✕</button>
                  </div>
                  <div style="font-size:7px;color:#444;margin-top:1px;">${p.spawnFrame.mode} | ${p.objects.length} objs</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.previewCanvas = document.getElementById('phase-preview-canvas') as HTMLCanvasElement;
    this.liveCanvas = document.getElementById('phase-live-canvas') as HTMLCanvasElement;
    this.updatePreview();
    this.updateLivePreview();
  }

  private updateMapPreview(): void {
    const canvas = this.previewCanvas;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw === 0 || ch === 0) return;

    canvas.width = cw;
    canvas.height = ch;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0a0e';
    ctx.fillRect(0, 0, cw, ch);

    const objects = this.state.worldMapObjects || [];
    const sf = this.state.phaseSpawnFrame;
    const pp = this.state.phasePlayerPos;
    if (!sf || !pp) return;

    const framePx = this.getFramePixelSize(cw, ch);
    const framePxW = framePx.w;
    const framePxH = framePx.h;

    const scale = framePxW / sf.w;

    const centerX = cw / 2;
    const centerY = ch / 2;

    const worldToScreen = (wx: number, wy: number) => ({
      x: centerX + (wx - pp.x) * scale + this.mapOffsetX,
      y: centerY + (wy - pp.y) * scale + this.mapOffsetY
    });

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gs = 50;
    const startWX = pp.x - (centerX + this.mapOffsetX) / scale;
    const startWY = pp.y - (centerY + this.mapOffsetY) / scale;
    const endWX = pp.x + (cw - centerX + this.mapOffsetX) / scale;
    const endWY = pp.y + (ch - centerY + this.mapOffsetY) / scale;
    for (let x = Math.ceil(startWX / gs) * gs; x <= endWX; x += gs) {
      const s = worldToScreen(x, 0);
      ctx.beginPath(); ctx.moveTo(s.x, 0); ctx.lineTo(s.x, ch); ctx.stroke();
    }
    for (let y = Math.ceil(startWY / gs) * gs; y <= endWY; y += gs) {
      const s = worldToScreen(0, y);
      ctx.beginPath(); ctx.moveTo(0, s.y); ctx.lineTo(cw, s.y); ctx.stroke();
    }
    ctx.restore();

    const colors: any = { player:'#4cff88', morph:'#4a9eff', collision:'#ff4444', area_sensor:'#44ccff', group:'#a78bfa', stamp_layer:'#ffd700', vector:'#ff9500', camera:'#ff3366', phase:'#4cff88' };
    for (const o of objects) {
      const s = worldToScreen(o.x || 0, o.y || 0);
      const w = (o.w || 50) * scale;
      const h = (o.h || 50) * scale;
      if (s.x + w < -50 || s.x > cw + 50 || s.y + h < -50 || s.y > ch + 50) continue;
      const c = colors[o.type] || '#555';
      ctx.fillStyle = c + '30';
      ctx.strokeStyle = c + '70';
      ctx.lineWidth = 1;
      ctx.fillRect(s.x, s.y, w, h);
      ctx.strokeRect(s.x, s.y, w, h);
    }

    const playerScreen = worldToScreen(pp.x, pp.y);
    ctx.save();
    ctx.fillStyle = '#4cff88';
    ctx.shadowColor = '#4cff88';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(playerScreen.x, playerScreen.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', playerScreen.x, playerScreen.y);
    ctx.restore();

    this.updateFrameOverlay(framePxW, framePxH);
  }

  public updatePreview(): void {
    if (!this.isOpen) return;
    this.updateMapPreview();
    const cw = this.previewCanvas?.parentElement?.clientWidth || 0;
    const ch = this.previewCanvas?.parentElement?.clientHeight || 0;
    const framePx = this.getFramePixelSize(cw, ch);
    this.updateFrameOverlay(framePx.w, framePx.h);
    this.updateLivePreview();
  }

  private updateFrameOverlay(framePxW: number, framePxH: number): void {
    const frameEl = document.getElementById('phase-frame-overlay');
    const frameCanvas = document.getElementById('phase-frame-canvas') as HTMLCanvasElement;
    if (!frameEl || !frameCanvas) return;

    const sf = this.state.phaseSpawnFrame;
    const pp = this.state.phasePlayerPos;
    if (!sf || !pp) return;

    frameEl.style.width = framePxW + 'px';
    frameEl.style.height = framePxH + 'px';
    frameEl.style.display = 'block';

    frameCanvas.width = framePxW * 2;
    frameCanvas.height = framePxH * 2;

    const ctx = frameCanvas.getContext('2d');
    if (!ctx) return;
    
    // Use the RenderPipeline for a "Clean View" of the camera area
    if (this.renderPipeline) {
       this.renderPipeline.renderToExternalContext(ctx, sf, { w: framePxW, h: framePxH }, { showTechnical: false });
    } else {
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.clearRect(0, 0, framePxW, framePxH);
      ctx.fillStyle = '#080810';
      ctx.fillRect(0, 0, framePxW, framePxH);

      const mainCanvas = document.getElementById('wm-canvas') as HTMLCanvasElement;
      if (mainCanvas) {
        const zoom = (window as any).__wmInstance?.zoom || 1;
        const panX = (window as any).__wmInstance?.panX || 0;
        const panY = (window as any).__wmInstance?.panY || 0;

        const sx = sf.x * zoom + panX;
        const sy = sf.y * zoom + panY;
        const sw = sf.w * zoom;
        const sh = sf.h * zoom;

        if (sw > 0 && sh > 0) {
          ctx.drawImage(mainCanvas, sx, sy, sw, sh, 0, 0, framePxW, framePxH);
        }
      }
    }

    // Fade overlay if running sequence
    if (this.state.isRunningSequence && this.state.sequenceAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0, ${this.state.sequenceAlpha})`;
      ctx.fillRect(0, 0, framePxW, framePxH);
    }
  }

  private updateLivePreview(): void {
    const canvas = this.liveCanvas;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw === 0 || ch === 0) return;

    // Use 2x resolution for crisp rendering
    canvas.width = cw * 2;
    canvas.height = ch * 2;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // High-fidelity direct render
    if (this.renderPipeline) {
       this.renderPipeline.renderToExternalContext(ctx, sf, { w: cw, h: ch }, { showTechnical: false });
    } else {
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.fillStyle = '#080810';
      ctx.fillRect(0, 0, cw, ch);

      const mainCanvas = document.getElementById('wm-canvas') as HTMLCanvasElement;
      if (mainCanvas) {
        const zoom = (window as any).__wmInstance?.zoom || 1;
        const panX = (window as any).__wmInstance?.panX || 0;
        const panY = (window as any).__wmInstance?.panY || 0;

        const sx = sf.x * zoom + panX;
        const sy = sf.y * zoom + panY;
        const sw = sf.w * zoom;
        const sh = sf.h * zoom;

        if (sw > 0 && sh > 0) {
          try {
            ctx.drawImage(mainCanvas, sx, sy, sw, sh, 0, 0, cw, ch);
          } catch (_) { /* cross-origin guard */ }
        }
      }
    }

    // Fade overlay during run sequence
    if (this.state.isRunningSequence && this.state.sequenceAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.state.sequenceAlpha})`;
      ctx.fillRect(0, 0, cw, ch);
    }
  }

  private bind(): void {
    document.getElementById('phase-close')?.addEventListener('click', () => this.close());

    document.getElementById('phase-save-draft')?.addEventListener('click', () => {
      this.saveDraft();
      this.recordActivity();
    });

    document.getElementById('phase-spawn-confirm')?.addEventListener('click', () => {
      this.executeSpawn();
      this.close();
    });

    document.getElementById('phase-autosave-config')?.addEventListener('click', () => {
      const mins = prompt('Intervalo de auto-save (minutos):', String(this.autoSaveInterval / 60000));
      if (mins) {
        const val = parseInt(mins);
        if (val > 0) {
          this.autoSaveInterval = val * 60000;
          this.startAutoSaveTimer();
        }
      }
      this.recordActivity();
    });

    document.getElementById('phase-frame-mode')?.addEventListener('change', (e: any) => {
      const mode = e.target.value;
      const sf = this.state.phaseSpawnFrame;
      if (sf) {
        const cx = sf.x + sf.w / 2;
        const cy = sf.y + sf.h / 2;
        const shortSide = Math.min(sf.w, sf.h);
        if (mode === 'portrait') {
          sf.w = shortSide;
          sf.h = shortSide * (16 / 9);
        } else {
          sf.w = shortSide * (16 / 9);
          sf.h = shortSide;
        }
        sf.x = cx - sf.w / 2;
        sf.y = cy - sf.h / 2;
        sf.mode = mode;
        this.updatePreview();
        this.updateLivePreview();
      }
      this.recordActivity();
    });

    const canvas = this.previewCanvas;
    if (canvas) {
      canvas.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        this.dragState = {
          startX: e.clientX,
          startY: e.clientY,
          origMapOffX: this.mapOffsetX,
          origMapOffY: this.mapOffsetY
        };
        canvas.style.cursor = 'grabbing';
      });
    }

    document.getElementById('phase-add-scene')?.addEventListener('click', () => {
      const sceneName = prompt('Nome da cena/motion de spawn:');
      if (sceneName) {
        const sel = document.getElementById('phase-spawn-scene') as HTMLSelectElement;
        if (sel) {
          const opt = document.createElement('option');
          opt.value = sceneName; opt.textContent = sceneName;
          sel.appendChild(opt);
          sel.value = sceneName;
        }
      }
      this.recordActivity();
    });

    document.querySelectorAll('.phase-preset-item').forEach(item => {
      item.addEventListener('click', (e: Event) => {
        if ((e.target as HTMLElement).closest('.phase-preset-delete')) return;
        const idx = parseInt((item as HTMLElement).dataset.idx!);
        const preset = this.presets[idx];
        if (preset) {
          this.state.phaseSpawnFrame = { ...preset.spawnFrame };
          this.state.phasePlayerPos = { ...preset.playerPos };
          this.mapOffsetX = 0;
          this.mapOffsetY = 0;
          this.updatePreview();
          this.updateLivePreview();
        }
        this.recordActivity();
      });
    });

    document.querySelectorAll('.phase-preset-delete').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        this.presets.splice(idx, 1);
        this.savePresets();
        this.render();
        this.bind();
        this.recordActivity();
      });
    });

    const onMouseMove = (e: MouseEvent) => {
      if (this.dragState) {
        const dx = e.clientX - this.dragState.startX;
        const dy = e.clientY - this.dragState.startY;
        this.mapOffsetX = this.dragState.origMapOffX + dx;
        this.mapOffsetY = this.dragState.origMapOffY + dy;

        const sf = this.state.phaseSpawnFrame;
        const pp = this.state.phasePlayerPos;
        const container = canvas?.parentElement;
        if (container && sf && pp) {
          const cw = container.clientWidth;
          const ch = container.clientHeight;
          const framePx = this.getFramePixelSize(cw, ch);
          const scale = framePx.w / sf.w;

          const newPlayerX = pp.x - this.mapOffsetX / scale;
          const newPlayerY = pp.y - this.mapOffsetY / scale;

          this.state.phasePlayerPos = { x: newPlayerX, y: newPlayerY };
          sf.x = newPlayerX - sf.w / 2;
          sf.y = newPlayerY - sf.h / 2;
        }

        this.updatePreview();
        this.updateLivePreview();
      }
    };

    const onMouseUp = () => {
      this.dragState = null;
      if (canvas) canvas.style.cursor = 'grab';
    };

    if (this._boundMouseMove) document.removeEventListener('mousemove', this._boundMouseMove);
    if (this._boundMouseUp) document.removeEventListener('mouseup', this._boundMouseUp);

    this._boundMouseMove = onMouseMove;
    this._boundMouseUp = onMouseUp;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    const ro = new ResizeObserver(() => this.updatePreview());
    const container = document.getElementById('phase-map-preview');
    if (container) ro.observe(container);
  }

  private executeSpawn(): void {
    const sf = this.state.phaseSpawnFrame;
    const pp = this.state.phasePlayerPos;
    if (!sf || !pp) return;

    const objects = this.state.worldMapObjects || [];

    const groupId = 'spawn_' + Date.now();

    // Singleton Player Logic (Case-insensitive)
    let player = objects.find((o: any) => o.type?.toLowerCase() === 'player');
    if (player) {
      player.x = pp.x - (player.w || 20) / 2;
      player.y = pp.y - (player.h || 20) / 2;
    } else {
      const playerId = 'player_' + Date.now();
      player = {
        id: playerId,
        type: 'player',
        label: 'Player',
        x: pp.x - 10, y: pp.y - 10, w: 20, h: 20,
        isVisible: true, opacity: 1, isLocked: false,
        isPersistent: true, artboardId: 'default',
        inPoint: 0, outPoint: 9999,
        charData: { moveSpeed: 3 }
      };
      objects.push(player);
    }

    // Singleton Camera Logic
    let camera = objects.find((o: any) => o.type === 'camera' && o._followsPlayer);
    if (camera) {
      camera.x = sf.x;
      camera.y = sf.y;
      camera.w = sf.w;
      camera.h = sf.h;
      camera.cameraMode = sf.mode;
    } else {
      camera = {
        id: 'camera_' + Date.now(),
        type: 'camera',
        label: 'Câmera',
        x: sf.x, y: sf.y, w: sf.w, h: sf.h,
        isVisible: true, opacity: 1,
        isPersistent: true, artboardId: 'default',
        inPoint: 0, outPoint: 9999,
        _followsPlayer: true,
        cameraMode: sf.mode
      };
      objects.push(camera);
    }

    // Singleton Spawn Group Logic
    let group = objects.find((o: any) => o.type === 'group' && o.label?.startsWith('Spawn'));
    if (group) {
        group.x = sf.x;
        group.y = sf.y;
        group.w = sf.w;
        group.h = sf.h;
        group.label = 'Spawn – ' + new Date().toLocaleTimeString();
    } else {
        group = {
            id: 'spawn_' + Date.now(),
            type: 'group',
            label: 'Spawn – ' + new Date().toLocaleTimeString(),
            _isGroup: true,
            x: sf.x, y: sf.y, w: sf.w, h: sf.h,
            isVisible: true, opacity: 1,
            isPersistent: true, artboardId: 'default',
            inPoint: 0, outPoint: 9999,
        };
        objects.push(group);
    }

    if (player) player.parentId = undefined; 
    if (camera) camera.parentId = undefined;

    this.state.worldMapObjects = objects;
    this.state.selectedIds = [];
    this.state.selectedId = null;
    this.state.phaseSpawnFrame = sf;
    this.state.phasePlayerPos = pp;

    document.dispatchEvent(new CustomEvent('phase-created'));
    document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));

    try {
      localStorage.setItem('forge_spawn_active', 'true');
      localStorage.setItem('forge_spawn_frame', JSON.stringify(sf));
      localStorage.setItem('forge_spawn_playerPos', JSON.stringify(pp));
    } catch {}
  }
}
