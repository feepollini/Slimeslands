import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { VirtualJoystick } from './forge_v2/tabs/quest_maker/world_map/VirtualJoystick';
import { t } from '../../core/i18n';
import { HubWorldMapGameView } from './HubWorldMapGameView';

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
    private _reactRoot: Root | null = null;

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
        if (this._reactRoot) {
            try {
                this._reactRoot.unmount();
            } catch {}
            this._reactRoot = null;
        }

        if (this._spawnFrameActive || this._currentPhase) {
            container.innerHTML = `
                <div id="map-screen-inner" style="height: 100%; width: 100%; position: relative; overflow: hidden;">
                    ${this.renderPreviewMode()}
                </div>
            `;
            this.bindEvents(container);
            if (this._currentPhase && this._gameState === 'running') {
                this.startGameLoop();
            } else if (this._spawnFrameActive) {
                this.startPreviewLoop();
            }
            return;
        }

        // Modo Jogo Normal no Hub: Renderiza a saída real do Mapa criado no Editor de Mapas com seletor discreto ao lado
        container.innerHTML = `
            <div id="map-screen-inner" style="height: 100%; width: 100%; position: relative; overflow: hidden;"></div>
        `;
        const mountEl = container.querySelector('#map-screen-inner') as HTMLElement | null;
        if (mountEl) {
            this._reactRoot = createRoot(mountEl);
            this._reactRoot.render(React.createElement(HubWorldMapGameView));
        }
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

    private startPreviewLoop() {
        this.stopGameLoop();
        const loop = () => {
            this.renderPreviewCanvas();
            this.animId = requestAnimationFrame(loop);
        };
        loop();
    }

    private startGameLoop() {
        this.stopGameLoop();
        const loop = () => {
            this.update();
            this.renderGameCanvas();
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
        if (!this._currentPhase) return;
        this.checkSensorTriggers();
    }
    
    private checkSensorTriggers() {
        const threshold = 40;
        this._worldMapObjects.forEach((obj: any) => {
            if (!obj.sensor) return;
            const dist = Math.hypot((obj.x || 0) - this._playerPos.x, (obj.y || 0) - this._playerPos.y);
            if (dist < threshold) {
                this.triggerAction(obj.sensor.action);
            }
        });
    }
    
    private triggerAction(action: string) {
        if (action === 'battle') {
            this._activeOverlay = { type: 'battle' };
            this.rerender();
        } else if (action === 'dialog') {
            this._activeOverlay = { type: 'dialog', data: { speaker: 'NPC', text: 'Olá viajante!' } };
            this.rerender();
        }
    }
    
    private rerender() {
        const container = document.getElementById('map-screen-container');
        if (container) {
            this.render(container);
        }
    }

    private renderPreviewCanvas() {
        if (!this.canvas || !this._currentPhase?.spawnFrame) return;
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;
        const container = this.canvas.parentElement;
        if (!container) return;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        const frame = this._currentPhase.spawnFrame;
        ctx.fillStyle = '#0d1520';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        const scaleX = this.canvas.width / frame.w;
        const scaleY = this.canvas.height / frame.h;
        const scale = Math.min(scaleX, scaleY);
        const offsetX = (this.canvas.width - frame.w * scale) / 2;
        const offsetY = (this.canvas.height - frame.h * scale) / 2;
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);
        ctx.translate(-frame.x, -frame.y);
        ctx.strokeStyle = 'rgba(255,215,0,0.08)';
        ctx.lineWidth = 1 / scale;
        const gridSize = 50;
        for (let x = frame.x; x < frame.x + frame.w; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, frame.y);
            ctx.lineTo(x, frame.y + frame.h);
            ctx.stroke();
        }
        for (let y = frame.y; y < frame.y + frame.h; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(frame.x, y);
            ctx.lineTo(frame.x + frame.w, y);
            ctx.stroke();
        }
        this._worldMapObjects.forEach((obj: any) => {
            ctx.fillStyle = obj.color || '#66bb6a';
            ctx.beginPath();
            ctx.arc(obj.x || 0, obj.y || 0, (obj.size || 20) / 2, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.arc(this._playerPos.x, this._playerPos.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    private renderGameCanvas() {
        if (!this.canvas || !this._currentPhase) return;
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;
        const container = this.canvas.parentElement;
        if (!container) return;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        const frame = this._currentPhase.spawnFrame || { x: 0, y: 0, w: 400, h: 300, mode: 'fixed' };
        let camX = frame.x;
        let camY = frame.y;
        if (frame.mode === 'follow') {
            camX = this._playerPos.x - frame.w / 2;
            camY = this._playerPos.y - frame.h / 2;
        }
        ctx.fillStyle = '#0d1520';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        const scaleX = this.canvas.width / frame.w;
        const scaleY = this.canvas.height / frame.h;
        const scale = Math.min(scaleX, scaleY);
        const offsetX = (this.canvas.width - frame.w * scale) / 2;
        const offsetY = (this.canvas.height - frame.h * scale) / 2;
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);
        ctx.translate(-camX, -camY);
        this._worldMapObjects.forEach((obj: any) => {
            ctx.fillStyle = obj.color || '#66bb6a';
            ctx.beginPath();
            ctx.arc(obj.x || 0, obj.y || 0, (obj.size || 20) / 2, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.fillStyle = '#4cff88';
        ctx.beginPath();
        ctx.arc(this._playerPos.x, this._playerPos.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    public destroy() {
        this.stopGameLoop();
        if (this._reactRoot) {
            try {
                this._reactRoot.unmount();
            } catch {}
            this._reactRoot = null;
        }
    }
}
