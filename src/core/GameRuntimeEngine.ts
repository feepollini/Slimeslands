/**
 * GameRuntimeEngine.ts - Runtime engine for playing created phases/levels
 * Converts WorldMap editor data into playable game
 */

import { GameObject, PhaseData, SceneData, SensorEvent } from './types';

export type GameState = 'menu' | 'loading' | 'playing' | 'paused' | 'scene' | 'dialog' | 'battle' | 'gameover' | 'victory';

export interface RuntimePlayer {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    vx: number;
    vy: number;
    speed: number;
    direction: 'left' | 'right' | 'up' | 'down';
    isMoving: boolean;
    animationState: string;
    currentFrame: number;
}

export interface RuntimeCamera {
    x: number;
    y: number;
    w: number;
    h: number;
    followTarget: string | null;
    bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface RuntimeObject extends GameObject {
    _runtimeState?: {
        vx?: number;
        vy?: number;
        animationState?: string;
        currentFrame?: number;
        visible?: boolean;
    };
}

export class GameRuntimeEngine {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private state: GameState = 'menu';
    private phaseData: PhaseData | null = null;
    private objects: RuntimeObject[] = [];
    private player: RuntimePlayer | null = null;
    private camera: RuntimeCamera = { x: 0, y: 0, w: 800, h: 600, followTarget: null, bounds: { minX: 0, minY: 0, maxX: 4000, maxY: 2250 } };
    
    private inputState = { up: false, down: false, left: false, right: false };
    private joystickActive = false;
    private joystickX = 0;
    private joystickY = 0;
    
    private animationFrameId: number | null = null;
    private lastTime = 0;
    private _deltaTime = 0;
    
    private loadedAssets: Map<string, HTMLImageElement | HTMLVideoElement> = new Map();
    private _pendingAssets = 0;
    
    private triggeredSensors: Set<string> = new Set();
    private _activeScene: SceneData | null = null;
    private activeDialog: { speaker: string; text: string; choices?: string[] } | null = null;
    
    private onStateChange: ((state: GameState) => void) | null = null;
    private onDialog: ((dialog: { speaker: string; text: string; choices?: string[] }) => void) | null = null;
    private onSceneStart: ((scene: SceneData) => void) | null = null;
    private onSceneEnd: (() => void) | null = null;
    private _onPhaseComplete: ((phaseId: string) => void) | null = null;
    private _onGameOver: (() => void) | null = null;
    private _onVictory: (() => void) | null = null;
    private onBattleStart: ((data: { type: string; enemies: string[] }) => void) | null = null;
    private onCampaignDialogue: ((event: SensorEvent) => void) | null = null;
    private onTutorial: ((event: SensorEvent) => void) | null = null;

    private mapWidth = 4000;
    private mapHeight = 2250;

    constructor() {
        this.setupInputListeners();
    }

    public setCanvas(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    public setStateChangeCallback(callback: (state: GameState) => void) {
        this.onStateChange = callback;
    }

    public setDialogCallback(callback: (dialog: { speaker: string; text: string; choices?: string[] }) => void) {
        this.onDialog = callback;
    }

    public setSceneCallbacks(
        onStart: (scene: SceneData) => void,
        onEnd: () => void
    ) {
        this.onSceneStart = onStart;
        this.onSceneEnd = onEnd;
    }

    public setPhaseCompleteCallback(callback: (phaseId: string) => void) {
        this._onPhaseComplete = callback;
    }

    public setGameOverCallbacks(
        onGameOver: () => void,
        onVictory: () => void
    ) {
        this._onGameOver = onGameOver;
        this._onVictory = onVictory;
    }

    public setBattleStartCallback(callback: (data: { type: string; enemies: string[] }) => void) {
        this.onBattleStart = callback;
    }

    public setCampaignDialogueCallback(callback: (event: SensorEvent) => void) {
        this.onCampaignDialogue = callback;
    }

    public setTutorialCallback(callback: (event: SensorEvent) => void) {
        this.onTutorial = callback;
    }

    private setupInputListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        document.addEventListener('joystick-move', ((e: any) => {
            this.joystickX = e.detail.x;
            this.joystickY = e.detail.y;
            this.joystickActive = e.detail.active;
        }) as EventListener);

        document.addEventListener('joystick-end', (() => {
            this.joystickActive = false;
            this.joystickX = 0;
            this.joystickY = 0;
        }) as EventListener);
    }

    private handleKeyDown(e: KeyboardEvent) {
        if (this.state !== 'playing') return;
        switch(e.key.toLowerCase()) {
            case 'w': case 'arrowup': this.inputState.up = true; break;
            case 's': case 'arrowdown': this.inputState.down = true; break;
            case 'a': case 'arrowleft': this.inputState.left = true; break;
            case 'd': case 'arrowright': this.inputState.right = true; break;
            case 'escape': this.pause(); break;
            case 'e': case 'enter': this.interact(); break;
        }
    }

    private handleKeyUp(e: KeyboardEvent) {
        switch(e.key.toLowerCase()) {
            case 'w': case 'arrowup': this.inputState.up = false; break;
            case 's': case 'arrowdown': this.inputState.down = false; break;
            case 'a': case 'arrowleft': this.inputState.left = false; break;
            case 'd': case 'arrowright': this.inputState.right = false; break;
        }
    }

    public async loadPhase(phaseData: PhaseData): Promise<void> {
        this.setState('loading');
        this.phaseData = phaseData;
        this.objects = [];
        this.triggeredSensors.clear();
        
        this.mapWidth = phaseData.spawnFrame?.w || 4000;
        this.mapHeight = phaseData.spawnFrame?.h || 2250;

        await this.preloadAssets(phaseData.objects || []);

        this.objects = (phaseData.objects || []).map(obj => ({
            ...obj,
            _runtimeState: {}
        })) as RuntimeObject[];

        this.player = this.createPlayerFromPhase(phaseData);
        
        if (this.player) {
            this.camera.followTarget = this.player.id;
            this.centerCameraOnPlayer();
        }

        this.setState('playing');
    }

    private async preloadAssets(objects: RuntimeObject[]): Promise<void> {
        const assetUrls = new Set<string>();
        
        objects.forEach(obj => {
            if (obj.assetUrl) assetUrls.add(obj.assetUrl);
            if (obj.type === 'stamp_layer' && (obj as any)._stamps) {
                (obj as any)._stamps.forEach((stamp: any) => {
                    if (stamp.url) assetUrls.add(stamp.url);
                });
            }
        });

        this._pendingAssets = assetUrls.size;
        
        for (const url of assetUrls) {
            try {
                const isVideo = url.match(/\.(webm|mp4)$/i);
                if (isVideo) {
                    const video = document.createElement('video');
                    video.src = url;
                    video.muted = true;
                    video.loop = true;
                    await new Promise((resolve) => {
                        video.onloadeddata = resolve;
                        video.onerror = resolve;
                    });
                    this.loadedAssets.set(url, video);
                } else {
                    const img = new Image();
                    img.src = url;
                    await new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = resolve;
                    });
                    this.loadedAssets.set(url, img);
                }
            } catch (e) {
                console.warn(`Failed to preload asset: ${url}`);
            }
            this._pendingAssets--;
        }
    }

    private createPlayerFromPhase(phase: PhaseData): RuntimePlayer | null {
        if (!phase.playerPos) return null;
        
        return {
            id: 'player',
            x: phase.playerPos.x - 25,
            y: phase.playerPos.y - 25,
            w: 50,
            h: 50,
            vx: 0,
            vy: 0,
            speed: phase.playerData?.moveSpeed || 3,
            direction: 'down',
            isMoving: false,
            animationState: 'idle',
            currentFrame: 0
        };
    }

    public start() {
        if (this.state !== 'playing') return;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    public stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    public pause() {
        if (this.state === 'playing') {
            this.setState('paused');
            this.stop();
        } else if (this.state === 'paused') {
            this.setState('playing');
            this.start();
        }
    }

    public resume() {
        if (this.state === 'paused') {
            this.setState('playing');
            this.start();
        }
    }

    private gameLoop = (time: number = 0) => {
        this._deltaTime = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        if (this.state === 'playing') {
            this.update();
            this.render();
        }

        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    };

    private update() {
        this.updatePlayer();
        this.updateCamera();
        this.checkSensors();
    }

    private updatePlayer() {
        if (!this.player) return;

        let dx = 0;
        let dy = 0;

        if (this.joystickActive) {
            dx = this.joystickX * this.player.speed;
            dy = this.joystickY * this.player.speed;
        } else {
            if (this.inputState.up) dy = -this.player.speed;
            if (this.inputState.down) dy = this.player.speed;
            if (this.inputState.left) dx = -this.player.speed;
            if (this.inputState.right) dx = this.player.speed;
        }

        if (dx !== 0 || dy !== 0) {
            if (dx < 0) this.player.direction = 'left';
            else if (dx > 0) this.player.direction = 'right';
            else if (dy < 0) this.player.direction = 'up';
            else if (dy > 0) this.player.direction = 'down';

            const newX = this.player.x + dx;
            const newY = this.player.y + dy;

            const collision = this.checkCollision(newX, newY, this.player.w, this.player.h);
            
            if (!collision) {
                this.player.x = newX;
                this.player.y = newY;
                this.player.isMoving = true;
            } else {
                const slideX = this.checkCollision(newX, this.player.y, this.player.w, this.player.h);
                const slideY = this.checkCollision(this.player.x, newY, this.player.w, this.player.h);
                
                if (!slideX) this.player.x = newX;
                if (!slideY) this.player.y = newY;
                
                this.player.isMoving = slideX && slideY;
            }

            this.player.vx = dx;
            this.player.vy = dy;
        } else {
            this.player.isMoving = false;
            this.player.vx = 0;
            this.player.vy = 0;
        }

        this.player.x = Math.max(0, Math.min(this.mapWidth - this.player.w, this.player.x));
        this.player.y = Math.max(0, Math.min(this.mapHeight - this.player.h, this.player.y));

        const obj = this.objects.find(o => o.id === this.player?.id);
        if (obj) {
            obj.x = this.player.x;
            obj.y = this.player.y;
        }
    }

    private checkCollision(x: number, y: number, w: number, h: number): boolean {
        for (const obj of this.objects) {
            if (obj.type !== 'collision') continue;
            if (obj.isVisible === false) continue;

            if (this.rectIntersect(x, y, w, h, obj.x, obj.y, obj.w, obj.h)) {
                return true;
            }
        }
        return false;
    }

    private rectIntersect(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }

    private updateCamera() {
        if (!this.player) return;

        const targetX = this.player.x + this.player.w / 2 - this.camera.w / 2;
        const targetY = this.player.y + this.player.h / 2 - this.camera.h / 2;

        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;

        this.camera.x = Math.max(this.camera.bounds.minX, Math.min(this.camera.bounds.maxX, this.camera.x));
        this.camera.y = Math.max(this.camera.bounds.minY, Math.min(this.camera.bounds.maxY, this.camera.y));
    }

    private centerCameraOnPlayer() {
        if (!this.player) return;
        this.camera.x = this.player.x + this.player.w / 2 - this.camera.w / 2;
        this.camera.y = this.player.y + this.player.h / 2 - this.camera.h / 2;
    }

    private checkSensors() {
        if (!this.player) return;

        for (const obj of this.objects) {
            if (obj.type !== 'area_sensor') continue;
            if (obj.isVisible === false) continue;
            if (this.triggeredSensors.has(obj.id)) continue;

            if (this.rectIntersect(
                this.player.x, this.player.y, this.player.w, this.player.h,
                obj.x, obj.y, obj.w, obj.h
            )) {
                this.triggeredSensors.add(obj.id);
                this.handleSensorTrigger(obj);
            }
        }
    }

    private handleSensorTrigger(sensor: RuntimeObject) {
        const events = (sensor as any).area_sensorEvents as SensorEvent[] || [];
        
        for (const event of events) {
            if (!event.type || event.type === 'none') continue;

            switch (event.type) {
                case 'showDialog':
                    if (event.dialogText) {
                        this.showDialog(sensor.label || '???', event.dialogText);
                    }
                    break;

                case 'playSound':
                    if (event.soundUrl) {
                        this.playAudioWithFalloff(event.soundUrl, sensor, event.minVol || 0.1, event.maxVol || 1, event.curve || 'linear', event.invert || false);
                    }
                    break;

                case 'battleStart':
                    this.startBattle(event.battleType || 'normal', event.enemies || []);
                    break;

                case 'campaignDialogue':
                    this.startCampaignDialogue(event);
                    break;

                case 'tutorial':
                    this.showTutorial(event);
                    break;

                case 'loadPhase':
                    if (event.phaseId) {
                        this.handlePhaseChange(event.phaseId, event.playerX, event.playerY);
                    }
                    break;
                    
                case 'playScene':
                    this.playScene(event.sceneId || '');
                    break;
                    
                case 'phaseChange':
                    this.handlePhaseChange(event.phaseId || '');
                    break;
                    
                case 'playAudio':
                    this.playAudio(event.audio || '');
                    break;
                    
                case 'spawnEntity':
                    this.spawnEntity(event.spawnId || '');
                    break;
                    
                case 'dealDamage':
                    this.handleDamage(event.damage || 0);
                    break;
                    
                case 'deliverItem':
                    this.deliverItem(event.itemId || '');
                    break;
                    
                case 'portal':
                    if (this.player) {
                        this.player.x = (event as any).portalX || 0;
                        this.player.y = (event as any).portalY || 0;
                        this.centerCameraOnPlayer();
                    }
                    break;
                    
                case 'triggerEvent':
                    this.triggerCustomEvent(event.eventId || '');
                    break;
            }
        }

        document.dispatchEvent(new CustomEvent('sensor-trigger', {
            detail: { sensorId: sensor.id, sensorLabel: sensor.label, playerId: this.player?.id }
        }));
    }

    private audioContext: AudioContext | null = null;
    private activeAudioSources: Map<string, { source: AudioBufferSourceNode | HTMLAudioElement; gainNode: GainNode }> = new Map();

    private playAudioWithFalloff(soundUrl: string, sensor: RuntimeObject, minVol: number, maxVol: number, curve: string, invert: boolean) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        const existing = this.activeAudioSources.get(sensor.id);
        if (existing) {
            if (existing.source instanceof HTMLAudioElement) {
                existing.source.pause();
            } else {
                (existing.source as AudioBufferSourceNode).stop();
            }
            this.activeAudioSources.delete(sensor.id);
        }

        const audio = new Audio(soundUrl);
        audio.loop = true;
        audio.volume = maxVol;
        audio.play().catch(() => {});

        const updateVolume = () => {
            if (!this.player || !audio.paused) return;

            const playerCX = this.player.x + this.player.w / 2;
            const playerCY = this.player.y + this.player.h / 2;
            const sensorCX = sensor.x + (sensor.w || 100) / 2;
            const sensorCY = sensor.y + (sensor.h || 100) / 2;
            const radius = (sensor as any).sensorRadius || Math.max(sensor.w || 100, sensor.h || 100);
            const dist = Math.hypot(playerCX - sensorCX, playerCY - sensorCY);

            let normalizedDist = Math.min(dist / radius, 1);
            let volume: number;

            if (invert) {
                normalizedDist = 1 - normalizedDist;
            }

            switch (curve) {
                case 'logarithmic':
                    volume = minVol + (maxVol - minVol) * Math.log1p(normalizedDist * 9) / Math.log(10);
                    break;
                case 'inverse':
                    volume = minVol + (maxVol - minVol) * (1 - normalizedDist);
                    break;
                default:
                    volume = minVol + (maxVol - minVol) * normalizedDist;
            }

            audio.volume = Math.max(minVol, Math.min(maxVol, volume));
            requestAnimationFrame(updateVolume);
        };

        this.activeAudioSources.set(sensor.id, { source: audio, gainNode: null as any });
        audio.addEventListener('ended', () => this.activeAudioSources.delete(sensor.id));
    }

    private startBattle(battleType: string, enemies: string[]) {
        console.log(`Starting ${battleType} battle with enemies:`, enemies);
        this.setState('battle');
        this.onBattleStart?.({ type: battleType, enemies });
    }

    private startCampaignDialogue(event: SensorEvent) {
        console.log('Starting campaign dialogue:', event);
        this.setState('dialog');
        this.onCampaignDialogue?.(event);
    }

    private showTutorial(event: SensorEvent) {
        console.log('Showing tutorial:', event);
        if (event.freezePlayer && this.player) {
            this.player.vx = 0;
            this.player.vy = 0;
        }
        this.onTutorial?.(event);
    }

    private showDialog(speaker: string, text: string) {
        this.setState('dialog');
        this.activeDialog = { speaker, text };
        this.onDialog?.({ speaker, text });
    }

    public respondToDialog(choiceIndex: number = 0) {
        this.activeDialog = null;
        this.setState('playing');
        document.dispatchEvent(new CustomEvent('dialog-responded', { detail: { choiceIndex } }));
    }

    private async playScene(sceneId: string) {
        const scenes = this.phaseData?.scenes || [];
        const scene = scenes.find(s => s.id === sceneId || s.name === sceneId);
        
        if (!scene) {
            console.warn(`Scene not found: ${sceneId}`);
            return;
        }

        this.setState('scene');
        this._activeScene = scene;
        this.onSceneStart?.(scene);

        await this.executeScene(scene);
        
        this._activeScene = null;
        this.onSceneEnd?.();
        this.setState('playing');
    }

    private async executeScene(scene: SceneData): Promise<void> {
        const actions = scene.actions || [];
        
        for (const action of actions) {
            await this.executeSceneAction(action);
        }
    }

    private async executeSceneAction(action: any): Promise<void> {
        switch (action.type) {
            case 'wait':
                await new Promise(resolve => setTimeout(resolve, action.duration || 1000));
                break;
                
            case 'dialog':
                await new Promise(resolve => {
                    this.showDialog(action.speaker || '???', action.text || '');
                    const checkDialog = setInterval(() => {
                        if (!this.activeDialog) {
                            clearInterval(checkDialog);
                            resolve(null);
                        }
                    }, 100);
                });
                break;
                
            case 'move':
                if (this.player) {
                    const startX = this.player.x;
                    const startY = this.player.y;
                    const endX = action.x || startX;
                    const endY = action.y || startY;
                    const duration = action.duration || 1000;
                    const startTime = performance.now();
                    
                    await new Promise(resolve => {
                        const animate = (now: number) => {
                            const elapsed = now - startTime;
                            const progress = Math.min(elapsed / duration, 1);
                            const eased = 1 - Math.pow(1 - progress, 3);
                            
                            this.player!.x = startX + (endX - startX) * eased;
                            this.player!.y = startY + (endY - startY) * eased;
                            
                            if (progress < 1) {
                                requestAnimationFrame(animate);
                            } else {
                                resolve(null);
                            }
                        };
                        requestAnimationFrame(animate);
                    });
                }
                break;
                
            case 'camera':
                if (action.target === 'player') {
                    this.centerCameraOnPlayer();
                } else if (action.x !== undefined && action.y !== undefined) {
                    const startX = this.camera.x;
                    const startY = this.camera.y;
                    const endX = action.x;
                    const endY = action.y;
                    const duration = action.duration || 1000;
                    const startTime = performance.now();
                    
                    await new Promise(resolve => {
                        const animate = (now: number) => {
                            const elapsed = now - startTime;
                            const progress = Math.min(elapsed / duration, 1);
                            const eased = 1 - Math.pow(1 - progress, 3);
                            
                            this.camera.x = startX + (endX - startX) * eased;
                            this.camera.y = startY + (endY - startY) * eased;
                            
                            if (progress < 1) {
                                requestAnimationFrame(animate);
                            } else {
                                resolve(null);
                            }
                        };
                        requestAnimationFrame(animate);
                    });
                }
                break;
                
            case 'playAudio':
                this.playAudio(action.audio || '');
                break;
                
            case 'fade':
                await this.fadeScreen(action.color || '#000', action.duration || 500);
                break;
        }
    }

    private fadeScreen(color: string, duration: number): Promise<void> {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position:fixed; top:0; left:0; width:100%; height:100%;
                background:${color}; z-index:9999; opacity:0;
                transition:opacity ${duration}ms ease; pointer-events:none;
            `;
            document.body.appendChild(overlay);
            
            requestAnimationFrame(() => { overlay.style.opacity = '1'; });
            
            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.remove(); resolve(); }, duration);
            }, duration + 50);
        });
    }

    private playAudio(audioUrl: string) {
        if (!audioUrl) return;
        try {
            const audio = new Audio(audioUrl);
            audio.volume = 0.7;
            audio.play().catch(() => {});
        } catch (e) {
            console.warn(`Failed to play audio: ${audioUrl}`);
        }
    }

    private handlePhaseChange(phaseId: string, playerX?: number, playerY?: number) {
        const phases = this.phaseData?.linkedPhases || [];
        const phase = phases.find(p => p.id === phaseId);
        
        if (phase) {
            this.loadPhase(phase);
            if (playerX !== undefined && playerY !== undefined && this.player) {
                this.player.x = playerX;
                this.player.y = playerY;
            }
        }
    }

    private spawnEntity(spawnId: string) {
        const spawners = this.objects.filter(o => o.type === 'spawner' && o.spawnId === spawnId);
        
        for (const spawner of spawners) {
            const entity = {
                id: `entity_${Date.now()}_${Math.random()}`,
                type: 'enemy',
                x: spawner.x,
                y: spawner.y,
                w: 50,
                h: 50,
                label: spawner.label || 'Enemy',
                isVisible: true,
                opacity: 1
            };
            this.objects.push(entity as RuntimeObject);
        }
    }

    private handleDamage(damage: number) {
        console.log(`Player took ${damage} damage`);
    }

    private deliverItem(itemId: string) {
        console.log(`Item received: ${itemId}`);
        document.dispatchEvent(new CustomEvent('player-item-received', {
            detail: { itemId }
        }));
    }

    private triggerCustomEvent(eventId: string) {
        document.dispatchEvent(new CustomEvent('game-event', {
            detail: { eventId }
        }));
    }

    private render() {
        if (!this.ctx || !this.canvas) return;
        
        this.ctx.fillStyle = '#050508';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        for (const obj of this.objects) {
            if (obj.isVisible === false) continue;
            if (obj.type === 'collision' || obj.type === 'area_sensor') continue;
            
            this.renderObject(obj);
        }

        if (this.player) {
            this.renderPlayer();
        }

        this.ctx.restore();

        this.renderHUD();
    }

    private renderObject(obj: RuntimeObject) {
        if (!this.ctx) return;

        const asset = obj.assetUrl ? this.loadedAssets.get(obj.assetUrl) : null;
        
        if (asset) {
            if (asset instanceof HTMLVideoElement) {
                if (asset.paused) asset.play();
                this.ctx.drawImage(asset, obj.x, obj.y, obj.w, obj.h);
            } else if (asset instanceof HTMLImageElement) {
                this.ctx.drawImage(asset, obj.x, obj.y, obj.w, obj.h);
            }
        } else if (obj.type === 'morph' || obj.type === 'image') {
            this.ctx.fillStyle = obj.color || '#fff';
            this.ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
        } else if (obj.type === 'stamp_layer') {
            const stamps = (obj as any)._stamps || [];
            for (const stamp of stamps) {
                const stampAsset = stamp.url ? this.loadedAssets.get(stamp.url) : null;
                if (stampAsset instanceof HTMLImageElement) {
                    this.ctx.save();
                    this.ctx.translate(stamp.x, stamp.y);
                    this.ctx.scale(stamp.scaleX || 1, stamp.scaleY || 1);
                    this.ctx.rotate((stamp.rotation || 0) * Math.PI / 180);
                    this.ctx.globalAlpha = obj.opacity ?? 1;
                    this.ctx.drawImage(stampAsset, -stamp.size/2, -stamp.size/2, stamp.size, stamp.size);
                    this.ctx.restore();
                }
            }
        } else if (obj.type === 'group') {
            const children = this.objects.filter(o => o.parentId === obj.id);
            for (const child of children) {
                this.renderObject(child);
            }
        } else if (obj.type === 'camera') {
            this.ctx.strokeStyle = 'rgba(81,197,255,0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
        } else {
            this.ctx.fillStyle = obj.color || '#fff';
            this.ctx.globalAlpha = obj.opacity ?? 1;
            this.ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            this.ctx.globalAlpha = 1;
        }
    }

    private renderPlayer() {
        if (!this.ctx || !this.player) return;

        this.ctx.fillStyle = '#4cff88';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);

        this.ctx.fillStyle = '#000';
        const eyeOffset = this.player.direction === 'left' ? 5 : this.player.w - 15;
        this.ctx.fillRect(this.player.x + eyeOffset, this.player.y + 10, 10, 10);
    }

    private renderHUD() {
        if (!this.ctx || !this.canvas) return;

        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(10, 10, 200, 80);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px Inter';
        this.ctx.fillText('Legends of Winter', 20, 30);
        
        this.ctx.font = '12px Inter';
        this.ctx.fillText(`Phase: ${this.phaseData?.name || 'Unknown'}`, 20, 50);
        this.ctx.fillText(`X: ${Math.round(this.player?.x || 0)} Y: ${Math.round(this.player?.y || 0)}`, 20, 70);
    }

    private setState(newState: GameState) {
        this.state = newState;
        this.onStateChange?.(newState);
    }

    public getState(): GameState {
        return this.state;
    }

    public getPlayer(): RuntimePlayer | null {
        return this.player;
    }

    public getCamera(): RuntimeCamera {
        return this.camera;
    }

    public getObjects(): RuntimeObject[] {
        return this.objects;
    }

    public getPhaseData(): PhaseData | null {
        return this.phaseData;
    }

    public isLoaded(): boolean {
        return this._pendingAssets === 0;
    }

    public interact() {
        if (this.activeDialog) {
            this.respondToDialog();
            return;
        }

        if (!this.player) return;

        const interactionRange = 50;
        const px = this.player.x + this.player.w / 2;
        const py = this.player.y + this.player.h / 2;

        for (const obj of this.objects) {
            if (obj.type !== 'interactable' && obj.type !== 'npc') continue;
            if (obj.isVisible === false) continue;

            const dist = Math.hypot(px - (obj.x + obj.w/2), py - (obj.y + obj.h/2));
            if (dist < interactionRange + Math.max(obj.w, obj.h)/2) {
                const events = (obj as any).area_sensorEvents as SensorEvent[] || [];
                for (const event of events) {
                    if (event.type === 'showDialog' && event.dialogText) {
                        this.showDialog(obj.label || '???', event.dialogText);
                        return;
                    }
                }
            }
        }
    }

    public destroy() {
        this.stop();
        this.objects = [];
        this.loadedAssets.clear();
        this.triggeredSensors.clear();
    }
}

export const runtimeEngine = new GameRuntimeEngine();
