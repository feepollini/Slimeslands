/**
 * RuntimeScreen.ts - Main game screen for playing created phases
 */

import { GameRuntimeEngine, GameState } from '../../core/GameRuntimeEngine';
import { PhaseData } from '../../core/types';
import { VirtualJoystick } from './forge_v2/tabs/quest_maker/world_map/VirtualJoystick';
import { t } from '../../core/i18n';

export class RuntimeScreen {
    private container: HTMLElement | null = null;
    private engine: GameRuntimeEngine;
    private joystick: VirtualJoystick | null = null;
    private state: any;
    private callbacks: any;

    constructor(state: any, callbacks: any) {
        this.state = state;
        this.callbacks = callbacks;
        this.engine = new GameRuntimeEngine();
        this.setupEngineCallbacks();
    }

    private setupEngineCallbacks() {
        this.engine.setStateChangeCallback((state: GameState) => {
            this.onStateChange(state);
        });

        this.engine.setDialogCallback((dialog) => {
            this.showDialog(dialog);
        });

        this.engine.setSceneCallbacks(
            (scene) => this.onSceneStart(scene),
            () => this.onSceneEnd()
        );
    }

    private onStateChange(state: GameState) {
        console.log('[RuntimeScreen] State changed:', state);
        
        if (state === 'paused') {
            this.showPauseMenu();
        } else if (state === 'gameover') {
            this.showGameOver();
        } else if (state === 'victory') {
            this.showVictory();
        }
    }

    public async loadAndPlay(phaseId?: string): Promise<void> {
        let phaseData: PhaseData | null = null;

        if (phaseId) {
            phaseData = this.loadPhaseFromStorage(phaseId);
        } else {
            const saved = localStorage.getItem('forge_phase_presets') || '[]';
            const phases = JSON.parse(saved);
            if (phases.length > 0) {
                phaseData = phases[phases.length - 1];
            }
        }

        if (!phaseData) {
            console.error('No phase data found');
            this.callbacks?.navigate?.('forge');
            return;
        }

        this.state.currentPhase = phaseData;
        await this.engine.loadPhase(phaseData);
        this.engine.start();
    }

    private loadPhaseFromStorage(phaseId: string): PhaseData | null {
        const saved = localStorage.getItem('forge_phase_presets') || '[]';
        const phases = JSON.parse(saved);
        return phases.find((p: PhaseData) => p.id === phaseId) || null;
    }

    public render(): string {
        return `
            <div class="runtime-screen" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: #050508;
                display: flex;
                flex-direction: column;
            ">
                <!-- Canvas Area -->
                <div class="runtime-canvas-container" style="flex:1; position:relative; overflow:hidden;">
                    <canvas id="runtime-canvas" style="display:block; width:100%; height:100%;"></canvas>
                    
                    <!-- Loading Overlay -->
                    <div id="runtime-loading" style="
                        position:absolute; top:0; left:0; width:100%; height:100%;
                        background:#050508; display:flex; flex-direction:column;
                        align-items:center; justify-content:center; z-index:100;
                    ">
                        <div style="font-size:2rem; margin-bottom:20px;">🎮</div>
                        <div style="color:#51c5ff; font-size:1rem; font-weight:900; letter-spacing:2px;">${t('runtime.loading')}</div>
                        <div style="color:rgba(255,255,255,0.5); font-size:0.7rem; margin-top:10px;" id="runtime-loading-text">${t('runtime.preparing')}</div>
                    </div>

                    <!-- Dialog Overlay -->
                    <div id="runtime-dialog" style="
                        position:absolute; bottom:80px; left:50%; transform:translateX(-50%);
                        background:rgba(10,10,20,0.95); border:2px solid rgba(81,197,255,0.4);
                        border-radius:15px; padding:20px 30px; max-width:80%; display:none;
                        box-shadow:0 10px 40px rgba(0,0,0,0.8);
                    ">
                        <div id="runtime-dialog-speaker" style="
                            color:#51c5ff; font-weight:900; font-size:0.8rem; letter-spacing:2px;
                            margin-bottom:8px;
                        "></div>
                        <div id="runtime-dialog-text" style="
                            color:#fff; font-size:1rem; line-height:1.6;
                        "></div>
                        <div style="margin-top:15px; text-align:right;">
                            <span style="color:rgba(255,255,255,0.3); font-size:0.6rem;">${t('runtime.pressEnter')}</span>
                        </div>
                    </div>

                    <!-- Pause Menu -->
                    <div id="runtime-pause-menu" style="
                        position:absolute; top:0; left:0; width:100%; height:100%;
                        background:rgba(0,0,0,0.85); display:none; flex-direction:column;
                        align-items:center; justify-content:center; z-index:200;
                    ">
                        <div style="color:#fff; font-size:1.5rem; font-weight:900; letter-spacing:3px; margin-bottom:40px;">${t('runtime.paused')}</div>
                        <button id="runtime-resume" class="runtime-menu-btn" style="
                            width:200px; padding:15px; background:rgba(76,255,136,0.15);
                            border:2px solid rgba(76,255,136,0.4); border-radius:10px;
                            color:#4cff88; font-size:0.9rem; font-weight:900; letter-spacing:2px;
                            margin-bottom:15px; cursor:pointer;
                        ">${
t('runtime.continue')}</button>
                        <button id="runtime-restart" class="runtime-menu-btn" style="
                            width:200px; padding:15px; background:rgba(81,197,255,0.15);
                            border:2px solid rgba(81,197,255,0.4); border-radius:10px;
                            color:#51c5ff; font-size:0.9rem; font-weight:900; letter-spacing:2px;
                            margin-bottom:15px; cursor:pointer;
                        ">${t('runtime.restart')}</button>
                        <button id="runtime-exit" class="runtime-menu-btn" style="
                            width:200px; padding:15px; background:rgba(255,51,102,0.15);
                            border:2px solid rgba(255,51,102,0.4); border-radius:10px;
                            color:#ff3366; font-size:0.9rem; font-weight:900; letter-spacing:2px;
                            cursor:pointer;
                        ">${t('runtime.exit')}</button>
                    </div>

                    <!-- Game Over Overlay -->
                    <div id="runtime-gameover" style="
                        position:absolute; top:0; left:0; width:100%; height:100%;
                        background:rgba(20,0,0,0.9); display:none; flex-direction:column;
                        align-items:center; justify-content:center; z-index:200;
                    ">
                        <div style="color:#ff3366; font-size:2rem; font-weight:900; letter-spacing:5px; margin-bottom:20px;">${t('runtime.defeat')}</div>
                        <button id="runtime-retry" class="runtime-menu-btn" style="
                            width:200px; padding:15px; background:rgba(255,51,102,0.15);
                            border:2px solid rgba(255,51,102,0.4); border-radius:10px;
                            color:#ff3366; font-size:0.9rem; font-weight:900; letter-spacing:2px;
                            cursor:pointer;
                        ">${t('runtime.retry')}</button>
                    </div>

                    <!-- Victory Overlay -->
                    <div id="runtime-victory" style="
                        position:absolute; top:0; left:0; width:100%; height:100%;
                        background:rgba(0,20,10,0.9); display:none; flex-direction:column;
                        align-items:center; justify-content:center; z-index:200;
                    ">
                        <div style="color:#4cff88; font-size:2rem; font-weight:900; letter-spacing:5px; margin-bottom:20px;">${t('runtime.victory')}</div>
                        <div style="color:rgba(255,255,255,0.7); font-size:0.9rem; margin-bottom:30px;">${t('runtime.phaseDone')}</div>
                        <button id="runtime-next-phase" class="runtime-menu-btn" style="
                            width:200px; padding:15px; background:rgba(76,255,136,0.15);
                            border:2px solid rgba(76,255,136,0.4); border-radius:10px;
                            color:#4cff88; font-size:0.9rem; font-weight:900; letter-spacing:2px;
                            cursor:pointer;
                        ">${t('runtime.next')}</button>
                    </div>
                </div>

                <!-- HUD Bottom -->
                <div class="runtime-hud" style="
                    height:120px; background:rgba(0,0,0,0.8); border-top:1px solid rgba(255,255,255,0.1);
                    display:flex; align-items:center; justify-content:space-between; padding:0 20px;
                ">
                    <!-- Health Bar -->
                    <div style="display:flex; flex-direction:column; gap:5px;">
                        <div style="color:rgba(255,255,255,0.5); font-size:0.6rem; letter-spacing:1px;">${t('runtime.hp')}</div>
                        <div style="width:150px; height:20px; background:rgba(255,0,0,0.2); border-radius:10px; overflow:hidden; border:1px solid rgba(255,0,0,0.3);">
                            <div id="runtime-hp-bar" style="width:100%; height:100%; background:linear-gradient(90deg,#ff3366,#ff6699); transition:width 0.3s;"></div>
                        </div>
                    </div>

                    <!-- Phase Info -->
                    <div style="text-align:center;">
                        <div id="runtime-phase-name" style="color:#51c5ff; font-size:0.8rem; font-weight:900; letter-spacing:2px;">${t('runtime.phase')}</div>
                        <div style="color:rgba(255,255,255,0.3); font-size:0.6rem;">${t('runtime.explore')}</div>
                    </div>

                    <!-- Minimap placeholder -->
                    <div style="width:80px; height:80px; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); border-radius:5px; display:flex; align-items:center; justify-content:center;">
                        <span style="opacity:0.2; font-size:0.6rem;">${t('runtime.map')}</span>
                    </div>
                </div>

                <!-- Virtual Joystick -->
                <div id="runtime-joystick-container" style="
                    position:absolute; bottom:140px; left:20px;
                "></div>
            </div>
        `;
    }

    public bind(container: HTMLElement) {
        this.container = container;
        
        const canvas = container.querySelector('#runtime-canvas') as HTMLCanvasElement;
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight - 120;
            this.engine.setCanvas(canvas);
        }

        this.setupJoystick(container);
        this.setupMenuButtons(container);
        this.setupKeyboardShortcuts();
        this.setupResizeHandler(canvas);

        this.hideLoading();
    }

    private setupJoystick(container: HTMLElement) {
        const joystickContainer = container.querySelector('#runtime-joystick-container') as HTMLElement;
        if (joystickContainer) {
            this.joystick = new VirtualJoystick();
            joystickContainer.innerHTML = this.joystick.render();
            this.joystick.bind(joystickContainer);
        }
    }

    private setupMenuButtons(container: HTMLElement) {
        container.querySelector('#runtime-resume')?.addEventListener('click', () => {
            this.engine.resume();
            this.hidePauseMenu();
        });

        container.querySelector('#runtime-restart')?.addEventListener('click', () => {
            this.hidePauseMenu();
            const phase = this.state.currentPhase;
            if (phase) {
                this.engine.destroy();
                this.engine = new GameRuntimeEngine();
                this.setupEngineCallbacks();
                this.engine.loadPhase(phase).then(() => {
                    this.engine.start();
                });
            }
        });

        container.querySelector('#runtime-exit')?.addEventListener('click', () => {
            this.engine.stop();
            this.callbacks?.navigate?.('hub');
        });

        container.querySelector('#runtime-retry')?.addEventListener('click', () => {
            const phase = this.state.currentPhase;
            if (phase) {
                this.engine.destroy();
                this.engine = new GameRuntimeEngine();
                this.setupEngineCallbacks();
                this.engine.loadPhase(phase).then(() => {
                    this.engine.start();
                });
            }
        });

        container.querySelector('#runtime-next-phase')?.addEventListener('click', () => {
            this.callbacks?.navigate?.('hub');
        });
    }

    private setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const state = this.engine.getState();
                if (state === 'playing') {
                    this.engine.pause();
                } else if (state === 'paused') {
                    this.engine.resume();
                    this.hidePauseMenu();
                }
            }
        });
    }

    private setupResizeHandler(canvas: HTMLCanvasElement | null) {
        window.addEventListener('resize', () => {
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight - 120;
            }
        });
    }

    private onSceneStart(_scene: any) {
        const dialog = this.container?.querySelector('#runtime-dialog') as HTMLElement;
        if (dialog) dialog.style.display = 'none';
    }

    private onSceneEnd() {
        // Scene ended
    }

    private showDialog(dialog: { speaker: string; text: string }) {
        const dialogEl = this.container?.querySelector('#runtime-dialog') as HTMLElement;
        const speakerEl = this.container?.querySelector('#runtime-dialog-speaker') as HTMLElement;
        const textEl = this.container?.querySelector('#runtime-dialog-text') as HTMLElement;
        
        if (dialogEl && speakerEl && textEl) {
            speakerEl.textContent = dialog.speaker.toUpperCase();
            textEl.textContent = dialog.text;
            dialogEl.style.display = 'block';
            
            dialogEl.onclick = () => {
                dialogEl.style.display = 'none';
                this.engine.respondToDialog();
            };
        }
    }

    private showPauseMenu() {
        const menu = this.container?.querySelector('#runtime-pause-menu') as HTMLElement;
        if (menu) menu.style.display = 'flex';
    }

    private hidePauseMenu() {
        const menu = this.container?.querySelector('#runtime-pause-menu') as HTMLElement;
        if (menu) menu.style.display = 'none';
    }

    private showGameOver() {
        const overlay = this.container?.querySelector('#runtime-gameover') as HTMLElement;
        if (overlay) overlay.style.display = 'flex';
    }

    private showVictory() {
        const overlay = this.container?.querySelector('#runtime-victory') as HTMLElement;
        if (overlay) overlay.style.display = 'flex';
    }

    private hideLoading() {
        const loading = this.container?.querySelector('#runtime-loading') as HTMLElement;
        if (loading) loading.style.display = 'none';
    }

    public destroy() {
        this.engine.destroy();
        if (this.joystick) {
            const el = document.getElementById('joystick-container');
            if (el) el.remove();
        }
    }
}
