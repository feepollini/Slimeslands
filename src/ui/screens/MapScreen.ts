import { VirtualJoystick } from './forge_v2/tabs/quest_maker/world_map/VirtualJoystick';
import { t } from '../../core/i18n';

interface PhaseData {
    id?: string;
    name?: string;
    label?: string;
    playerPos?: { x: number; y: number };
    spawnFrame?: { x: number; y: number; w: number; h: number; mode: string };
    worldMapObjects?: any[];
}

interface ScreenOverlay {
    type: 'battle' | 'dialog' | 'tutorial' | 'popup' | 'pause' | 'screen';
    data?: any;
}

export class MapScreen {
    private joystick = new VirtualJoystick();
    private canvas: HTMLCanvasElement | null = null;
    private animId: number | null = null;
    private _currentPhase: PhaseData | null = null;
    private _activeOverlay: ScreenOverlay | null = null;
    private _playerPos = { x: 0, y: 0 };
    private _gameState: 'idle' | 'running' = 'idle';
    private _worldMapObjects: any[] = [];
    private _spawnFrameActive = false;

    constructor() {
        window.addEventListener('message', (e) => {
            if (e.data?.type === 'PLAYERPREVIEW_LOAD_PHASE') {
                this.loadPhaseFromMessage(e.data.phase);
            } else if (e.data?.type === 'SPAWN_ACTIVATED') {
                this.activateSpawnPreview(e.data.frame, e.data.playerPos, e.data.objects);
            } else if (e.data?.type === 'SPAWN_DEACTIVATED') {
                this.deactivateSpawnPreview();
            }
        });
        
        this.checkSpawnFrameState();
    }
    
    private checkSpawnFrameState() {
        try {
            const spawnActive = localStorage.getItem('forge_spawn_active');
            if (spawnActive === 'true') {
                const frame = localStorage.getItem('forge_spawn_frame');
                const playerPos = localStorage.getItem('forge_spawn_playerPos');
                const objects = localStorage.getItem('forge_spawn_objects');
                
                if (frame && playerPos) {
                    this.activateSpawnPreview(
                        JSON.parse(frame),
                        JSON.parse(playerPos),
                        objects ? JSON.parse(objects) : []
                    );
                }
            }
        } catch {}
    }

    public setWorldMapInstance(_wm: any) {}

    private activateSpawnPreview(frame: any, playerPos: any, objects: any[]) {
        this._spawnFrameActive = true;
        this._currentPhase = {
            spawnFrame: frame,
            playerPos: playerPos,
            worldMapObjects: objects
        };
        this._playerPos = playerPos ? { ...playerPos } : { x: 0, y: 0 };
        this._worldMapObjects = objects || [];
        
        const container = document.getElementById('map-screen-container');
        if (container) {
            this.render(container);
        }
    }
    
    private deactivateSpawnPreview() {
        this._spawnFrameActive = false;
        this._currentPhase = null;
        this._gameState = 'idle';
        this.stopGameLoop();
        
        const container = document.getElementById('map-screen-container');
        if (container) {
            this.render(container);
        }
    }

    private loadPhaseFromMessage(phase: PhaseData) {
        this._currentPhase = phase;
        this._playerPos = phase.playerPos ? { ...phase.playerPos } : { x: 0, y: 0 };
        this._worldMapObjects = phase.worldMapObjects || [];
        this._gameState = 'idle';
        
        const container = document.getElementById('map-screen-container');
        if (container) {
            this.render(container);
        }
    }

    public render(container: HTMLElement) {
        container.innerHTML = `
            <div id="map-screen-inner" style="height: 100%; width: 100%; position: relative; overflow: hidden;">
                ${this._spawnFrameActive || this._currentPhase ? this.renderPreviewMode() : this.renderMapMode()}
            </div>
        `;
        
        this.bindEvents(container);
        
        if (this._currentPhase && this._gameState === 'running') {
            this.startGameLoop();
        } else if (this._spawnFrameActive) {
            this.startPreviewLoop();
        }
    }
    
    private renderMapMode(): string {
        const phases = this.getSavedPhases();
        
        return `
            <div class="map-view-content" style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0a0a12 0%, #1a1a2e 100%);">
                <div style="font-size: 2rem; color: rgba(255,255,255,0.15); font-weight: 950; letter-spacing: 10px;">
                    🗺️ ${t('map.map')}
                </div>
                
                <div id="map-phases-panel" style="position: absolute; top: 0; right: 0; width: 240px; height: 100%; background: rgba(0,0,0,0.92); border-left: 2px solid rgba(102,187,106,0.4); display: flex; flex-direction: column; z-index: 100;">
                    <div style="padding: 15px; border-bottom: 1px solid rgba(102,187,106,0.3);">
                        <h3 style="color: #66bb6a; margin: 0; font-size: 0.85rem;">🗺️ ${t('map.phases')}</h3>
                    </div>
                    <div style="flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px;">
                        ${phases.length === 0 ? `<div style="color: #666; font-size: 0.75rem; padding: 10px;">${t('map.noPhases')}</div>` : ''}
                        ${phases.map((p, i) => `
                            <button class="map-phase-btn" data-phase-index="${i}" style="
                                padding: 12px; 
                                background: rgba(102,187,106,0.15); 
                                border: 1px solid rgba(102,187,106,0.4); 
                                border-radius: 8px; 
                                color: #66bb6a; 
                                cursor: pointer;
                                font-size: 0.75rem;
                                text-align: left;
                                transition: all 0.2s;
                            ">
                                🎮 ${p.name || p.label || (t('map.phaseFallback') + ' ' + (i + 1))}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    private renderPreviewMode(): string {
        const isSpawnPreview = this._spawnFrameActive;
        
        return `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #000;">
                ${isSpawnPreview ? `
                    <div style="display: flex; gap: 4px; padding: 8px; background: rgba(255,215,0,0.15); border-bottom: 1px solid rgba(255,215,0,0.3);">
                        <span style="flex: 1; padding: 8px; color: #ffd700; font-size: 0.65rem; font-weight: 900; text-align: center;">
                            🎯 ${t('map.preview')}
                        </span>
                        <button id="pp-close-preview" style="padding: 8px 12px; background: rgba(255,68,68,0.2); border: 1px solid rgba(255,68,68,0.4); border-radius: 4px; color: #ff4444; font-size: 0.6rem; font-weight: 900; cursor: pointer;">
                            ✕
                        </button>
                    </div>
                ` : ''}
                
                <div id="pp-phone-area" style="flex: 1; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #000;">
                    <canvas id="pp-camera-view" style="width: 100%; height: 100%; object-fit: contain;"></canvas>
                    
                    ${isSpawnPreview && this._currentPhase?.spawnFrame ? `
                        <div class="camera-frame-fixed" style="
                            position: absolute;
                            width: ${(this._currentPhase.spawnFrame.w / (this._currentPhase.spawnFrame.h / 180))}px;
                            height: 180px;
                            border: 2px dashed rgba(255,215,0,0.6);
                            background: rgba(255,215,0,0.05);
                            pointer-events: none;
                            display: flex;
                            align-items: flex-start;
                            justify-content: flex-start;
                            z-index: 5;
                        ">
                            <span style="
                                background: rgba(255,215,0,0.9);
                                color: #000;
                                font-size: 9px;
                                font-weight: 900;
                                padding: 2px 6px;
                                border-radius: 0 0 4px 0;
                             ">📹 ${t('map.camera')}</span>
                        </div>
                    ` : ''}
                    
                    ${this._gameState === 'running' ? `
                        <div id="joystick-area" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 10;">
                            ${this.joystick.render()}
                        </div>
                    ` : ''}
                    
                    <div id="pp-touch-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 50;"></div>
                    ${this.renderOverlay()}
                </div>
                
                <div class="pp-status" style="display: flex; justify-content: space-between; padding: 6px 8px; background: rgba(0,0,0,0.8); border-top: 1px solid rgba(255,215,0,0.2); font-size: 0.4rem; color: rgba(255,255,255,0.4);">
                    <span>📍 ${Math.round(this._playerPos.x)}, ${Math.round(this._playerPos.y)}</span>
                    <span>${this._gameState === 'running' ? `🟢 ${t('map.playing')}` : `⚪ ${t('map.previewTag')}`}</span>
                </div>
            </div>
        `;
    }
    
    private renderOverlay(): string {
        if (!this._activeOverlay) return '';
        
        if (this._activeOverlay.type === 'battle') {
            return `
                <div class="pp-overlay pp-battle" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(20,0,0,0.95); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 100;">
                    <div style="font-size: 1.5rem; color: #ff4444; font-weight: 900; margin-bottom: 10px;">⚔️ ${t('map.battle')}</div>
                    <button class="pp-overlay-close" style="margin-top: 20px; padding: 10px 30px; background: rgba(255,68,68,0.2); border: 1px solid #ff4444; border-radius: 8px; color: #ff4444; font-size: 0.6rem; font-weight: 900; cursor: pointer;">⚔️ ${t('map.fight')}</button>
                </div>
            `;
        }
        
        if (this._activeOverlay.type === 'dialog') {
            return `
                <div class="pp-overlay pp-dialog" style="position: absolute; bottom: 0; left: 0; width: 100%; height: 60%; background: linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.8)); display: flex; flex-direction: column; justify-content: flex-end; z-index: 100; padding: 20px; box-sizing: border-box;">
                    <div style="font-size: 0.5rem; color: #a78bfa; font-weight: 900; margin-bottom: 6px;">${this._activeOverlay.data?.speaker || '???'}</div>
                    <div style="font-size: 0.7rem; color: #fff; line-height: 1.4;">${this._activeOverlay.data?.text || '...'}</div>
                    <button class="pp-overlay-close" style="margin-top: 15px; padding: 8px 20px; background: rgba(167,139,250,0.2); border: 1px solid #a78bfa; border-radius: 6px; color: #a78bfa; font-size: 0.5rem; font-weight: 900; cursor: pointer;">${t('map.continue')}</button>
                </div>
            `;
        }
        
        if (this._activeOverlay.type === 'screen') {
            return `
                <div class="pp-overlay pp-screen" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #0a0a0f; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 100;">
                    <button class="pp-return-btn" style="margin-top: 20px; padding: 10px 30px; background: rgba(76,255,136,0.2); border: 1px solid #4cff88; border-radius: 8px; color: #4cff88; font-size: 0.6rem; font-weight: 900; cursor: pointer;">↩️ ${t('map.back')}</button>
                </div>
            `;
        }
        
        return '';
    }

    private bindEvents(container: HTMLElement) {
        container.querySelectorAll('.map-phase-btn').forEach((btn: any) => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.phaseIndex);
                const phases = this.getSavedPhases();
                this.loadPhase(phases[idx]);
            });
        });
        
        const closeBtn = document.getElementById('pp-close-preview');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.deactivateSpawnPreview());
        }
        
        container.querySelectorAll('.pp-overlay-close, .pp-return-btn').forEach((btn: any) => {
            btn.addEventListener('click', () => {
                this._activeOverlay = null;
                this.rerender();
            });
        });
        
        this.canvas = document.getElementById('pp-camera-view') as HTMLCanvasElement;
        
        if (this.canvas) {
            this.bindJoystick();
            this.bindTouchLayer();
        }
    }
    
    private bindJoystick() {
        const joystickArea = document.getElementById('joystick-area');
        if (joystickArea) {
            this.joystick.bind(joystickArea);
            this.joystick.setCallback((input) => {
                if (this._gameState === 'running' && input.active) {
                    const speed = 3;
                    this._playerPos.x += input.x * speed;
                    this._playerPos.y += input.y * speed;
                }
            });
        }
    }
    
    private bindTouchLayer() {
        const touchLayer = document.getElementById('pp-touch-layer');
        if (touchLayer) {
            touchLayer.addEventListener('click', () => {
                if (this._gameState === 'running') {
                    this.checkSensorTriggers();
                }
            });
        }
    }
    
    private checkSensorTriggers() {
        const objects = this._currentPhase?.worldMapObjects || this._worldMapObjects;
        
        for (const obj of objects) {
            if (obj.type === 'area_sensor' && obj.area_sensorEvents) {
                const playerX = this._playerPos.x;
                const playerY = this._playerPos.y;
                
                if (obj.x && obj.w && playerX >= obj.x && playerX <= obj.x + obj.w &&
                    obj.y && obj.h && playerY >= obj.y && playerY <= obj.y + obj.h) {
                    
                    for (const event of obj.area_sensorEvents) {
                        this.triggerEvent(event);
                    }
                }
            }
        }
    }
    
    private triggerEvent(event: any) {
        if (!event || !event.type) return;
        
        if (event.type === 'showDialog' || event.type === 'showdialog') {
            this._activeOverlay = { type: 'dialog', data: { speaker: event.speaker, text: event.text } };
            this.rerender();
        } else if (event.type === 'battleStart' || event.type === 'battlestart') {
            this._activeOverlay = { type: 'battle', data: {} };
            this.rerender();
        } else if (event.type === 'screen') {
            window.postMessage({ type: 'HUB_NAVIGATE', screen: event.screenType || 'map' }, '*');
        }
    }
    
    private togglePlay() {
        if (this._gameState === 'running') {
            this._gameState = 'idle';
            this.stopGameLoop();
        } else {
            this._gameState = 'running';
            if (this._currentPhase?.playerPos) {
                this._playerPos = { ...this._currentPhase.playerPos };
            }
            this.startGameLoop();
        }
        this.rerender();
    }
    
    private exitPhase() {
        this._currentPhase = null;
        this._gameState = 'idle';
        this.stopGameLoop();
        this.rerender();
    }
    
    private rerender() {
        const container = document.getElementById('map-screen-container');
        if (container) {
            this.render(container);
        }
    }
    
    private startPreviewLoop() {
        if (this.animId) return;
        
        const loop = () => {
            this.drawPreview();
            this.animId = requestAnimationFrame(loop);
        };
        
        loop();
    }
    
    private startGameLoop() {
        if (this.animId) return;
        
        const loop = () => {
            this.update();
            this.draw();
            this.animId = requestAnimationFrame(loop);
        };
        
        loop();
    }
    
    private stopGameLoop() {
        if (this.animId) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
    }
    
    private update() {
        if (this._gameState !== 'running') return;
        this.checkSensorTriggers();
    }
    
    private drawPreview() {
        this.drawCameraView();
    }
    
    private draw() {
        this.drawCameraView();
    }
    
    private drawCameraView() {
        if (!this.canvas) return;
        
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;
        
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, w, h);
        
        // Use camera frame dimensions from Camera2DOverlay (440x733 ratio)
        const cameraW = 360;
        const cameraH = 720;
        
        // Camera follows player, centered
        const camWorldX = this._playerPos.x - cameraW / 2;
        const camWorldY = this._playerPos.y - cameraH / 2;
        
        ctx.save();
        
        const objects = this._currentPhase?.worldMapObjects || this._worldMapObjects;
        
        for (const obj of objects) {
            const screenX = (obj.x || 0) - camWorldX;
            const screenY = (obj.y || 0) - camWorldY;
            
            // Skip objects outside camera view
            if (obj.w && obj.h) {
                if (screenX + obj.w < 0 || screenX > w || screenY + obj.h < 0 || screenY > h) continue;
            }
            
            if (obj.type === 'terrain' || obj.type === 'region') {
                if (obj.w && obj.h) {
                    ctx.fillStyle = obj.fill || 'rgba(100,100,150,0.3)';
                    ctx.fillRect(screenX, screenY, obj.w, obj.h);
                    
                    if (obj.stroke) {
                        ctx.strokeStyle = obj.stroke;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(screenX, screenY, obj.w, obj.h);
                    }
                }
            }
            
            if (obj.type === 'collision') {
                if (obj.w && obj.h) {
                    ctx.fillStyle = 'rgba(255,68,68,0.25)';
                    ctx.fillRect(screenX, screenY, obj.w, obj.h);
                }
            }
            
            if (obj.type === 'area_sensor') {
                if (obj.w && obj.h) {
                    ctx.fillStyle = 'rgba(255,215,0,0.15)';
                    ctx.fillRect(screenX, screenY, obj.w, obj.h);
                    
                    ctx.strokeStyle = 'rgba(255,215,0,0.5)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([5, 5]);
                    ctx.strokeRect(screenX, screenY, obj.w, obj.h);
                    ctx.setLineDash([]);
                }
            }
            
            if (obj.type === 'morph' && obj.assetUrl) {
                if (obj.w && obj.h) {
                    const img = new Image();
                    img.src = obj.assetUrl;
                    if (img.complete) {
                        ctx.drawImage(img, screenX, screenY, obj.w, obj.h);
                    }
                }
            }
        }
        
        // Draw player at center (where camera is)
        const playerScreenX = w / 2;
        const playerScreenY = h / 2;
        
        ctx.fillStyle = '#4cff88';
        ctx.shadowColor = '#4cff88';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(playerScreenX, playerScreenY, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('P', playerScreenX, playerScreenY + 1);
        
        // Camera frame border
        ctx.strokeStyle = 'rgba(255,215,0,0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(0, 0, w, h);
        ctx.setLineDash([]);
        
        ctx.restore();
    }
    
    private loadPhase(phase: PhaseData) {
        this._currentPhase = phase;
        this._playerPos = phase.playerPos ? { ...phase.playerPos } : { x: 0, y: 0 };
        this._worldMapObjects = phase.worldMapObjects || [];
        this._gameState = 'idle';
        this._activeOverlay = null;
        
        this.rerender();
    }
    
    private getSavedPhases(): PhaseData[] {
        try {
            const saved = localStorage.getItem('forge_phase_presets') || '[]';
            return JSON.parse(saved);
        } catch {
            return [];
        }
    }
}
