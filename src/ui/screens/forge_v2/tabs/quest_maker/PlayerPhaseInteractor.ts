import { VirtualJoystick } from './world_map/VirtualJoystick';

interface PhaseInfo {
  id: string;
  name: string;
  playerPos?: { x: number; y: number };
  spawnFrame?: { mode: string };
}

interface ScreenOverlay {
  type: 'battle' | 'dialog' | 'tutorial' | 'popup' | 'pause' | 'screen';
  data?: any;
}

export class PlayerPhaseInteractor {
  private joystick = new VirtualJoystick();
  private canvas: HTMLCanvasElement | null = null;
  private animId: number | null = null;
  private _wmInstance: any = null;
  private _currentPhase: PhaseInfo | null = null;
  private _availablePhases: PhaseInfo[] = [];
  private _activeOverlay: ScreenOverlay | null = null;
  private _playerPos = { x: 0, y: 0 };
  private _frameSize = { w: 360, h: 720 };
  private _gameState: 'idle' | 'running' = 'idle';

  public render(_state: any): string {
    return `
      <canvas id="pp-camera-view" style="width:100%; height:100%; object-fit:contain;"></canvas>
      <div id="pp-gif-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;"></div>
      
      <div id="joystick-area" style="
        position:absolute; bottom:12px; left:50%; transform:translateX(-50%); z-index:55;
        display:${_state.joystickVisible === false ? 'none' : 'flex'};
      ">
        ${this.joystick.render()}
      </div>
      
      <div id="pp-touch-layer" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:50; pointer-events:none;"></div>
      ${this.renderOverlay()}
    `;
  }

  private renderOverlay(): string {
    if (!this._activeOverlay) return '';
    
    if (this._activeOverlay.type === 'battle') {
      return `
        <div class="pp-overlay pp-battle" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(20,0,0,0.95); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:100;">
          <div style="font-size:1.5rem; color:#ff4444; font-weight:900; margin-bottom:10px;">⚔️ BATALHA</div>
          <button class="pp-overlay-close" style="margin-top:20px; padding:10px 30px; background:rgba(255,68,68,0.2); border:1px solid #ff4444; border-radius:8px; color:#ff4444; font-size:0.6rem; font-weight:900; cursor:pointer;">⚔️ COMBATER</button>
        </div>
      `;
    }
    
    if (this._activeOverlay.type === 'dialog') {
      return `
        <div class="pp-overlay pp-dialog" style="position:absolute; bottom:0; left:0; width:100%; height:60%; background:linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.8)); display:flex; flex-direction:column; justify-content:flex-end; z-index:100; padding:20px; box-sizing:border-box;">
          <div style="font-size:0.5rem; color:#a78bfa; font-weight:900; margin-bottom:6px;">${this._activeOverlay.data?.speaker || '???'}</div>
          <div style="font-size:0.7rem; color:#fff; line-height:1.4;">${this._activeOverlay.data?.text || '...'}</div>
          <button class="pp-overlay-close" style="margin-top:15px; padding:8px 20px; background:rgba(167,139,250,0.2); border:1px solid #a78bfa; border-radius:6px; color:#a78bfa; font-size:0.5rem; font-weight:900; cursor:pointer;">CONTINUAR ▼</button>
        </div>
      `;
    }
    
    if (this._activeOverlay.type === 'tutorial') {
      return `
        <div class="pp-overlay pp-tutorial" style="position:absolute; top:20px; right:10px; max-width:80%; background:rgba(0,80,20,0.95); border:2px solid #4cff88; border-radius:12px; padding:12px; z-index:100;">
          <div style="font-size:0.6rem; color:#4cff88; font-weight:900; margin-bottom:6px;">📖 ${this._activeOverlay.data?.title || 'Tutorial'}</div>
          <button class="pp-overlay-close" style="margin-top:8px; padding:4px 12px; background:rgba(76,255,136,0.2); border:none; border-radius:4px; color:#4cff88; font-size:0.45rem; font-weight:900; cursor:pointer;">OK</button>
        </div>
      `;
    }
    
    if (this._activeOverlay.type === 'popup') {
      return `
        <div class="pp-overlay pp-popup" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(30,30,40,0.98); border:1px solid rgba(255,140,66,0.5); border-radius:12px; padding:16px; max-width:80%; z-index:100;">
          <div style="font-size:0.6rem; color:#ff8c42; font-weight:900; margin-bottom:8px;">💭</div>
          <div style="font-size:0.55rem; color:#fff; line-height:1.4;">${this._activeOverlay.data?.text || ''}</div>
          <button class="pp-overlay-close" style="margin-top:12px; width:100%; padding:8px; background:rgba(255,140,66,0.2); border:none; border-radius:6px; color:#ff8c42; font-size:0.5rem; font-weight:900; cursor:pointer;">OK</button>
        </div>
      `;
    }

    if (this._activeOverlay.type === 'pause') {
      return `
        <div class="pp-overlay pp-pause" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:100;">
          <div style="font-size:1.2rem; color:#fff; font-weight:900; margin-bottom:20px;">⏸️ PAUSADO</div>
          <button class="pp-overlay-continue" style="margin:6px; padding:10px 30px; background:rgba(255,255,255,0.1); border:1px solid #fff; border-radius:8px; color:#fff; font-size:0.6rem; font-weight:900; cursor:pointer;">CONTINUAR</button>
          <button class="pp-overlay-exit" style="margin:6px; padding:10px 30px; background:rgba(255,68,68,0.1); border:1px solid #ff4444; border-radius:8px; color:#ff4444; font-size:0.6rem; font-weight:900; cursor:pointer;">SAIR</button>
        </div>
      `;
    }

    if (this._activeOverlay.type === 'screen') {
      const screenType = this._activeOverlay.data?.screenType || 'unknown';
      const screenNames: any = {
        board: '🃏 CARD BATTLE',
        map: '🗺️ MAPA DO MUNDO',
        arsenal: '⚔️ ARSENAL',
        academy: '📚 ACADEMIA',
        profile: '👤 PERFIL',
        settings: '⚙️ CONFIGURAÇÕES',
        soundcentral: '🎵 SOM CENTRAL'
      };
      return `
        <div class="pp-overlay pp-screen" style="position:absolute; top:0; left:0; width:100%; height:100%; background:#0a0a0f; display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:100;">
          <div style="font-size:1rem; color:#ffd700; font-weight:900; margin-bottom:8px;">${screenNames[screenType] || 'TELA'}</div>
          <button class="pp-return-btn" style="margin-top:20px; padding:10px 30px; background:rgba(76,255,136,0.2); border:1px solid #4cff88; border-radius:8px; color:#4cff88; font-size:0.6rem; font-weight:900; cursor:pointer;">↩️ RETORNAR À FASE</button>
        </div>
      `;
    }
    
    return '';
  }

  private getAvailablePhases(): PhaseInfo[] {
    try {
      const saved = localStorage.getItem('forge_phase_presets') || '[]';
      const phases = JSON.parse(saved);
      return phases.map((p: any, i: number) => ({
        id: p.id || `phase_${i}`,
        name: p.name || p.label || `Fase ${i + 1}`,
        playerPos: p.playerPos,
        spawnFrame: p.spawnFrame
      }));
    } catch {
      return [];
    }
  }

  public bind(container: HTMLElement, _state: any) {
    this.stopRenderLoop();
    this.gifOverlayImgs.clear();
    
    this._availablePhases = this.getAvailablePhases();
    
    if (this._availablePhases.length > 0 && !this._currentPhase) {
      this._currentPhase = this._availablePhases[0];
    }

    // Initialize player position from phase or WorldMap player
    if (this._currentPhase?.playerPos) {
      this._playerPos = { ...this._currentPhase.playerPos };
    } else if (this._wmInstance?.playerObjectId) {
      const player = this._wmInstance.objects?.find((o: any) => o.id === this._wmInstance.playerObjectId);
      if (player) {
        this._playerPos = { x: player.x + player.w/2, y: player.y + player.h/2 };
      }
    }

    this.joystick.bind(container);
    this.joystick.setCallback((input) => {
      // Dispatch event that WorldMap listens to
      document.dispatchEvent(new CustomEvent('joystick-move', { 
        detail: { x: input.x, y: input.y, active: input.active }
      }));
    });

    this.joystick.setInteractCallback(() => {
      document.dispatchEvent(new CustomEvent('joystick-interact'));
    });

    container.querySelectorAll('.pp-overlay-close, .pp-overlay-continue').forEach(btn => {
      btn.addEventListener('click', () => {
        this._activeOverlay = null;
        this.rerender(container, _state);
      });
    });

    container.querySelectorAll('.pp-overlay-exit').forEach(btn => {
      btn.addEventListener('click', () => {
        this._gameState = 'idle';
        this._activeOverlay = null;
        this.rerender(container, _state);
      });
    });

    this.startRenderLoop();
  }

  private updatePlayerPosition() {
    const container = document.querySelector('.pp-status');
    if (container) {
      container.innerHTML = `
        <span>📍 ${Math.round(this._playerPos.x)}, ${Math.round(this._playerPos.y)}</span>
        <span>${this._gameState === 'running' ? '🟢 JOGANDO' : '⚪ PRÉVIA'}</span>
      `;
    }
  }

  private _onLoadPhase: ((phaseId: string) => void) | null = null;

  public setOnLoadPhase(callback: (phaseId: string) => void) {
    this._onLoadPhase = callback;
  }

  public loadPhase(phaseId: string) {
    if (this._onLoadPhase) {
      this._onLoadPhase(phaseId);
    }
  }

  private _isActive = false;

  public setActive(active: boolean) {
    this._isActive = active;
    if (active) {
      this.startRenderLoop();
    } else {
      this.stopRenderLoop();
    }
  }
  
  public updateCameraView(_objects: any[], playerPos: any, frameSize: any) {
    if (playerPos) this._playerPos = { ...playerPos };
    if (frameSize) this._frameSize = { ...frameSize };
  }

  private stopRenderLoop(): void {
    this._isActive = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.canvas = null;
  }

  private startRenderLoop(): void {
    if (this.animId) cancelAnimationFrame(this.animId);
    this._isActive = true;

    const render = () => {
      if (!this._isActive) return;
      
      if (this.canvas && !this.canvas.isConnected) {
        this.canvas = null;
      }
      
      const canvas = this.canvas || document.getElementById('pp-camera-view') as HTMLCanvasElement | null;
      if (!canvas) { this.animId = requestAnimationFrame(render); return; }
      this.canvas = canvas;

      const container = canvas.parentElement;
      if (!container) { this.animId = requestAnimationFrame(render); return; }

      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (cw === 0 || ch === 0) { this.animId = requestAnimationFrame(render); return; }

      if (canvas.width !== cw * 2 || canvas.height !== ch * 2) {
        canvas.width = cw * 2;
        canvas.height = ch * 2;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) { this.animId = requestAnimationFrame(render); return; }

      // Get frame from _frameSize (synced from TabQuestMaker/WorldMapMain)
      // We assume _playerPos is the CENTER of the view in this context, 
      // or we use absolute coords if provided.
      const sf = {
         x: this._playerPos.x - this._frameSize.w / 2,
         y: this._playerPos.y - this._frameSize.h / 2,
         w: this._frameSize.w,
         h: this._frameSize.h
      };

      // Direct, fast render to the "phone" canvas using the shared render engine
      if (this._wmInstance && this._wmInstance.renderPipeline) {
        // Sync the camera directly to where the physical player is
        // We pause dynamic tracking during 'isRunningSequence' so the camera waits statically while the player walks onto screen.
        if (this._wmInstance.playerObjectId && !this._wmInstance.state?.isRunningSequence) {
          const player = this._wmInstance.objects.find((o: any) => o.id === this._wmInstance.playerObjectId);
          if (player) {
            this._playerPos.x = player.x + player.w/2;
            this._playerPos.y = player.y + player.h/2;
          }
        } else if (this._wmInstance.state?.isRunningSequence && this._wmInstance.state?.phaseSpawnFrame) {
            const pf = this._wmInstance.state.phaseSpawnFrame;
            this._playerPos.x = pf.x + pf.w/2;
            this._playerPos.y = pf.y + pf.h/2;
        }
        
        // Recompute screen frame (camera viewport) based on actual player center
        sf.x = this._playerPos.x - this._frameSize.w / 2;
        sf.y = this._playerPos.y - this._frameSize.h / 2;

        // Ensure pipeline has latest objects before rendering
        if (this._wmInstance.objects) {
           this._wmInstance.renderPipeline.setObjects(this._wmInstance.objects);
        }
        this._wmInstance.renderPipeline.renderToExternalContext(ctx, sf, { w: cw, h: ch }, { showTechnical: false, hideGifsForOverlay: true });
        
        // Use native DOM overlay for GIFs to ensure silky smooth 60fps animations in the emulator
        this.updateGifOverlay(sf, cw, ch);
      } else {
        // Fallback for when the world map isn't fully initialized
        ctx.resetTransform();
        const dpr = (ctx.canvas.width / cw) || 1;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, cw, ch);
        
        ctx.fillStyle = '#222';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Aguardando Mapa...', cw/2, ch/2);
      }
      
      this.animId = requestAnimationFrame(render);
    };

    this.animId = requestAnimationFrame(render);
  }

  private gifOverlayImgs: Map<string, HTMLImageElement> = new Map();

  private updateGifOverlay(sf: {x:number, y:number, w:number, h:number}, cw: number, ch: number) {
    const overlay = document.getElementById('pp-gif-overlay');
    if (!overlay || !this._wmInstance) return;

    const zoom = cw / sf.w;
    const panX = -sf.x * zoom;
    const panY = -sf.y * zoom;

    const objects = this._wmInstance.objects || [];
    const activeIds = new Set<string>();

    for (const o of objects) {
      if (o.type !== 'player' && o.type !== 'morph') continue;
      
      const inPt = o.inPoint ?? 0;
      const outPt = o.outPoint ?? (inPt + (o.duration || 999));
      const ct = this._wmInstance.state?.currentTime || 0;
      const isTimeVisible = ((ct >= inPt && ct <= outPt) || o.isPersistent) && o.isVisible !== false;
      if (!isTimeVisible) continue;

      const wt = (this._wmInstance.renderPipeline as any)?._transformCache?.get(o.id) || { 
        x: o.x, y: o.y, w: o.w || 64, h: o.h || 64, rotation: o.rotation || 0, 
        scaleX: o.scaleX || 1, scaleY: o.scaleY || 1, opacity: o.opacity ?? 1
      };

      // Cull offscreen
      const margin = 100;
      if (
        wt.x + wt.w + margin < sf.x ||
        wt.x - margin > sf.x + sf.w ||
        wt.y + wt.h + margin < sf.y ||
        wt.y - margin > sf.y + sf.h
      ) { continue; }

      const gifUrl = (this._wmInstance.renderPipeline as any)?.resolveSpriteUrl(o) || o.assetUrl || '';
      if (!gifUrl || !gifUrl.toLowerCase().endsWith('.gif')) continue;

      activeIds.add(o.id);
      let img = this.gifOverlayImgs.get(o.id);

      if (!img) {
        img = document.createElement('img');
        img.style.cssText = 'position:absolute;pointer-events:none;image-rendering:pixelated;';
        overlay.appendChild(img);
        this.gifOverlayImgs.set(o.id, img);
      }

      if (img.dataset.gifSrc !== gifUrl) {
        img.dataset.gifSrc = gifUrl;
        img.src = gifUrl;
      }

      const screenX = wt.x * zoom + panX;
      const screenY = wt.y * zoom + panY;
      const pivotX = (o.pivotX !== undefined && o.pivotX !== null) ? o.pivotX : 0.5;
      const pivotY = (o.pivotY !== undefined && o.pivotY !== null) ? o.pivotY : 0.5;
      
      const centerX = screenX + (wt.w * zoom * pivotX);
      const centerY = screenY + (wt.h * zoom * pivotY);

      img.style.width = `${wt.w * zoom}px`;
      img.style.height = `${wt.h * zoom}px`;
      
      img.style.transformOrigin = `0% 0%`;
      
      const flipX = wt.scaleX < 0 ? -1 : 1;
      const flipY = wt.scaleY < 0 ? -1 : 1;

      img.style.transform = `
         translate(${centerX}px, ${centerY}px)
         rotate(${wt.rotation}deg)
         scale(${flipX}, ${flipY})
         translate(${-wt.w * zoom * pivotX}px, ${-wt.h * zoom * pivotY}px)
      `;
      img.style.opacity = String(wt.opacity);
    }

    // Cleanup
    for (const [id, img] of this.gifOverlayImgs.entries()) {
      if (!activeIds.has(id)) {
        img.remove();
        this.gifOverlayImgs.delete(id);
      }
    }
  }

  private _lastTriggeredSensors = new Set<string>();

  public showOverlay(type: ScreenOverlay['type'], data?: any) {
    this._activeOverlay = { type, data };
    const container = document.querySelector('.player-preview-wrapper');
    if (container && this._wmInstance) {
      this.rerender(container as HTMLElement, this._wmInstance.state || {});
    }
  }

  public setWorldMapInstance(wm: any) {
    this._wmInstance = wm;
  }

  public isPlaying(): boolean {
    return this._gameState === 'running';
  }

  private rerender(container: HTMLElement, state: any) {
    container.innerHTML = this.render(state);
    this.bind(container, state);
  }
}
