import { PhasePreset } from './panels/PhaseDialog';

const MAP_TEMPLATES = [
    { id: 'compact', name: 'Compacto', chunks: 2, chunkSize: 1000, description: 'Pequeno para mobiles', icon: '📱' },
    { id: 'medium', name: 'Médio', chunks: 4, chunkSize: 1000, description: 'Tamanho padrão', icon: '🎮' },
    { id: 'large', name: 'Grande', chunks: 8, chunkSize: 1000, description: 'Mundo expandido', icon: '🌍' },
    { id: 'massive', name: 'Massivo', chunks: 16, chunkSize: 1000, description: 'Open world', icon: '🌌' },
    { id: 'custom', name: 'Personalizado', chunks: 0, chunkSize: 0, description: 'Defina seu tamanho', icon: '⚙️' },
];

export class PhaseCreationWizard {
    private state: any;
    private _isActive = false;
    private _activeTab: 'create' | 'load' = 'create';
    private _phaseName = '';
    private _presets: PhasePreset[] = [];
    private _selectedTemplate: typeof MAP_TEMPLATES[0] | null = null;
    private _customChunks = 4;
    private _customChunkSize = 1000;

    constructor(state: any) {
        this.state = state;
        this.loadPresets();
    }

    private loadPresets() {
        try {
            const saved = localStorage.getItem('forge_phase_presets');
            if (saved) this._presets = JSON.parse(saved);
        } catch {}
    }

    private savePresets() {
        try {
            localStorage.setItem('forge_phase_presets', JSON.stringify(this._presets));
        } catch {}
    }

    public checkAndShow(): boolean {
        console.log('[PhaseCreationWizard] checkAndShow called!');
        // Always show wizard when entering via Hub
        this.showWelcome();
        return true;
    }

    public isActive(): boolean {
        return this._isActive;
    }

    private showWelcome() {
        this._isActive = true;
        this.renderWelcome();
    }

    private renderWelcome() {
        this.closeExisting();
        
        const overlay = document.createElement('div');
        overlay.id = 'phase-wizard-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:99999;display:flex;align-items:center;justify-content:center;';
        
        overlay.innerHTML = `
            <div class="pw-container">
                <div class="pw-header">
                    <div class="pw-logo">⚔️</div>
                    <h1 class="pw-title">WORLD BUILDER</h1>
                    <p class="pw-subtitle">Crie ou carregue sua fase</p>
                </div>
                
                <div class="pw-tabs">
                    <button class="pw-tab ${this._activeTab === 'create' ? 'active' : ''}" data-tab="create">✦ CRIAR NOVA</button>
                    <button class="pw-tab ${this._activeTab === 'load' ? 'active' : ''}" data-tab="load">📂 CARREGAR <span class="pw-badge">${this._presets.length}</span></button>
                </div>
                
                <div class="pw-content">
                    ${this._activeTab === 'create' ? this.renderCreateOptions() : this.renderLoadOptions()}
                </div>
            </div>
            
            <style>
                .pw-container { background: linear-gradient(145deg, #0d0d12, #151520); border: 1px solid rgba(255,215,0,0.15); border-radius: 16px; max-width: 680px; width: 95%; box-shadow: 0 0 80px rgba(255,215,0,0.08); overflow: hidden; }
                .pw-header { text-align: center; padding: 35px 30px 25px; background: linear-gradient(to bottom, rgba(255,215,0,0.03), transparent); border-bottom: 1px solid rgba(255,255,255,0.05); }
                .pw-logo { font-size: 2.5rem; margin-bottom: 8px; filter: drop-shadow(0 0 20px rgba(255,215,0,0.3)); }
                .pw-title { font-family: 'Cinzel', serif; font-size: 1.6rem; font-weight: 900; color: #e8e8e8; margin: 0; letter-spacing: 8px; text-shadow: 0 0 30px rgba(255,215,0,0.3); }
                .pw-subtitle { color: #666; font-size: 0.75rem; margin: 8px 0 0; letter-spacing: 2px; }
                .pw-tabs { display: flex; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.05); }
                .pw-tab { flex: 1; padding: 15px; background: transparent; border: none; color: #555; font-size: 0.7rem; font-weight: 700; letter-spacing: 2px; cursor: pointer; transition: all 0.3s; }
                .pw-tab:hover { color: #888; }
                .pw-tab.active { color: #ffd700; background: linear-gradient(to bottom, rgba(255,215,0,0.08), transparent); }
                .pw-badge { background: rgba(255,215,0,0.15); color: #ffd700; padding: 2px 8px; border-radius: 10px; font-size: 0.6rem; margin-left: 5px; }
                .pw-content { padding: 25px; max-height: 60vh; overflow-y: auto; }
                .pw-name-input { width: 100%; padding: 14px 16px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,215,0,0.2); border-radius: 8px; color: #fff; font-size: 1rem; font-weight: 700; margin-bottom: 20px; text-align: center; letter-spacing: 1px; }
                .pw-name-input:focus { outline: none; border-color: rgba(255,215,0,0.5); box-shadow: 0 0 20px rgba(255,215,0,0.1); }
                .pw-name-input::placeholder { color: #444; }
                .pw-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
                .pw-template { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 18px 15px; cursor: pointer; transition: all 0.3s; text-align: center; }
                .pw-template:hover { background: rgba(255,215,0,0.05); border-color: rgba(255,215,0,0.2); transform: translateY(-2px); }
                .pw-template.selected { background: rgba(255,215,0,0.1); border-color: #ffd700; box-shadow: 0 0 30px rgba(255,215,0,0.15); }
                .pw-template-icon { font-size: 1.8rem; margin-bottom: 10px; }
                .pw-template-name { color: #ddd; font-size: 0.8rem; font-weight: 700; margin-bottom: 4px; }
                .pw-template-desc { color: #555; font-size: 0.6rem; }
                .pw-custom { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; padding: 20px; margin-top: 15px; }
                .pw-custom-title { color: #888; font-size: 0.7rem; font-weight: 700; margin-bottom: 15px; letter-spacing: 1px; }
                .pw-custom-row { display: flex; gap: 15px; margin-bottom: 15px; }
                .pw-custom-field { flex: 1; }
                .pw-custom-label { display: block; color: #666; font-size: 0.6rem; margin-bottom: 6px; letter-spacing: 1px; }
                .pw-custom-input { width: 100%; padding: 10px 12px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-size: 0.9rem; font-family: 'Courier New', monospace; }
                .pw-custom-input:focus { outline: none; border-color: rgba(255,215,0,0.4); }
                .pw-actions { display: flex; gap: 12px; margin-top: 25px; }
                .pw-btn { flex: 1; padding: 14px 20px; border-radius: 8px; font-size: 0.75rem; font-weight: 900; letter-spacing: 2px; cursor: pointer; transition: all 0.3s; }
                .pw-btn-secondary { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #666; }
                .pw-btn-secondary:hover { border-color: rgba(255,255,255,0.3); color: #888; }
                .pw-btn-primary { background: linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05)); border: 1px solid rgba(255,215,0,0.4); color: #ffd700; }
                .pw-btn-primary:hover { background: linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,215,0,0.1)); box-shadow: 0 0 30px rgba(255,215,0,0.2); }
                .pw-btn-primary:disabled { opacity: 0.3; cursor: not-allowed; }
                .pw-load-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
                .pw-preset { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 15px; cursor: pointer; transition: all 0.3s; }
                .pw-preset:hover { background: rgba(255,215,0,0.05); border-color: rgba(255,215,0,0.2); }
                .pw-preset-name { color: #ddd; font-size: 0.8rem; font-weight: 700; margin-bottom: 6px; }
                .pw-preset-meta { color: #555; font-size: 0.6rem; }
                .pw-preset-del { float: right; color: #ff4444; cursor: pointer; font-size: 0.8rem; opacity: 0; }
                .pw-preset:hover .pw-preset-del { opacity: 1; }
            </style>
        `;

        document.body.appendChild(overlay);
        this.bindWelcome();
    }

    private renderCreateOptions(): string {
        const savedBgColor = localStorage.getItem('wm_bgColor') || '#08080c';
        const savedZoom = localStorage.getItem('wm_cameraZoom') || '2.5';
        return `
            <input type="text" class="pw-name-input" id="pw-phase-name" placeholder="NOME DA SUA FASE" maxlength="30">
            
            <div class="pw-grid">
                ${MAP_TEMPLATES.map(t => `
                    <div class="pw-template ${this._selectedTemplate?.id === t.id ? 'selected' : ''}" data-template="${t.id}">
                        <div class="pw-template-icon">${t.icon}</div>
                        <div class="pw-template-name">${t.name}</div>
                        <div class="pw-template-desc">${t.description}</div>
                    </div>
                `).join('')}
            </div>
            
            <div class="pw-custom" style="margin-top:15px;">
                <div class="pw-custom-title">✦ CONFIGURAÇÕES DA FASE</div>
                <div class="pw-custom-row">
                    <div class="pw-custom-field">
                        <label class="pw-custom-label">COR DO FUNDO</label>
                        <input type="color" class="pw-custom-input" id="pw-bg-color" value="${this.state.bgColor || savedBgColor}" style="height:40px;padding:4px;cursor:pointer;">
                    </div>
                    <div class="pw-custom-field">
                        <label class="pw-custom-label">ZOOM PADRÃO</label>
                        <input type="number" class="pw-custom-input" id="pw-default-zoom" value="${this.state.cameraZoom || savedZoom}" min="0.5" max="5" step="0.1">
                    </div>
                </div>
            </div>
            
            ${this._selectedTemplate?.id === 'custom' ? `
                <div class="pw-custom">
                    <div class="pw-custom-title">✦ MAPA PERSONALIZADO</div>
                    <div class="pw-custom-row">
                        <div class="pw-custom-field">
                            <label class="pw-custom-label">CHUNKS (LADO)</label>
                            <input type="number" class="pw-custom-input" id="pw-custom-chunks" value="${this._customChunks}" min="1" max="32">
                        </div>
                        <div class="pw-custom-field">
                            <label class="pw-custom-label">TAMANHO DO CHUNK</label>
                            <input type="number" class="pw-custom-input" id="pw-custom-size" value="${this._customChunkSize}" min="100" max="2000" step="100">
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <div class="pw-actions">
                <button class="pw-btn pw-btn-secondary" id="pw-cancel">CANCELAR</button>
                <button class="pw-btn pw-btn-primary" id="pw-continue" ${!this._selectedTemplate ? 'disabled' : ''}>CRIAR FASE →</button>
            </div>
        `;
    }

    private renderLoadOptions(): string {
        if (this._presets.length === 0) {
            return `
                <div style="text-align: center; padding: 40px 20px;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">📂</div>
                    <div style="color: #555; font-size: 0.8rem;">Nenhuma fase salva</div>
                </div>
                <div class="pw-actions">
                    <button class="pw-btn pw-btn-primary" id="pw-create-new">CRIAR NOVA FASE</button>
                </div>
            `;
        }
        
        return `
            <div class="pw-load-grid">
                ${this._presets.map((p, i) => `
                    <div class="pw-preset" data-index="${i}">
                        <span class="pw-preset-del" data-index="${i}">✕</span>
                        <div class="pw-preset-name">${p.name}</div>
                        <div class="pw-preset-meta">${p.spawnFrame ? `${Math.round(p.spawnFrame.w)}x${Math.round(p.spawnFrame.h)}` : 'Sem spawn'} • ${new Date(p.createdAt).toLocaleDateString('pt-BR')}</div>
                    </div>
                `).join('')}
            </div>
            <div class="pw-actions">
                <button class="pw-btn pw-btn-secondary" id="pw-cancel">VOLTAR</button>
            </div>
        `;
    }

    private bindWelcome() {
        document.querySelectorAll('.pw-tab').forEach((tab: any) => {
            tab.addEventListener('click', () => {
                this._activeTab = tab.dataset.tab;
                this.renderWelcome();
            });
        });

        document.querySelectorAll('.pw-template').forEach((card: any) => {
            card.addEventListener('click', () => {
                this._selectedTemplate = MAP_TEMPLATES.find(t => t.id === card.dataset.template) || null;
                this.renderWelcome();
            });
        });

        document.getElementById('pw-custom-chunks')?.addEventListener('input', (e: any) => {
            this._customChunks = Math.max(1, Math.min(32, parseInt(e.target.value) || 4));
        });

        document.getElementById('pw-custom-size')?.addEventListener('input', (e: any) => {
            this._customChunkSize = Math.max(100, Math.min(2000, parseInt(e.target.value) || 1000));
        });

        document.getElementById('pw-bg-color')?.addEventListener('input', (e: any) => {
            const color = e.target.value;
            this.state.bgColor = color;
            localStorage.setItem('wm_bgColor', color);
        });

        document.getElementById('pw-default-zoom')?.addEventListener('input', (e: any) => {
            const zoom = parseFloat(e.target.value) || 2.5;
            this.state.cameraZoom = zoom;
            localStorage.setItem('wm_cameraZoom', zoom.toString());
        });

        document.getElementById('pw-cancel')?.addEventListener('click', () => this.close());
        
        document.getElementById('pw-continue')?.addEventListener('click', () => {
            const nameInput = document.getElementById('pw-phase-name') as HTMLInputElement;
            this._phaseName = nameInput?.value?.trim() || '';
            if (this._phaseName && this._selectedTemplate) {
                this.setupMapAndRequestSpawn();
            }
        });

        document.getElementById('pw-create-new')?.addEventListener('click', () => {
            this._activeTab = 'create';
            this.renderWelcome();
        });

        document.querySelectorAll('.pw-preset').forEach((card: any) => {
            card.addEventListener('click', (e: MouseEvent) => {
                if ((e.target as HTMLElement).classList.contains('pw-preset-del')) return;
                this.loadPreset(parseInt(card.dataset.index));
            });
        });

        document.querySelectorAll('.pw-preset-del').forEach((btn: any) => {
            btn.addEventListener('click', (e: MouseEvent) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.index);
                if (confirm('Excluir esta fase?')) {
                    this._presets.splice(idx, 1);
                    this.savePresets();
                    this.renderWelcome();
                }
            });
        });

        setTimeout(() => document.getElementById('pw-phase-name')?.focus(), 100);
    }

    private setupMapAndRequestSpawn() {
        let chunks: number, chunkSize: number;
        
        if (this._selectedTemplate!.id === 'custom') {
            chunks = this._customChunks;
            chunkSize = this._customChunkSize;
        } else {
            chunks = this._selectedTemplate!.chunks;
            chunkSize = this._selectedTemplate!.chunkSize;
        }

        this.state.mapWidth = chunks * chunkSize;
        this.state.mapHeight = chunks * chunkSize;
        this.state.mapChunks = chunks;
        this.state.mapChunkSize = chunkSize;

        this.close();
        this._isActive = false;

        document.dispatchEvent(new CustomEvent('worldmap-map-resized', {
            detail: { width: this.state.mapWidth, height: this.state.mapHeight, chunks, chunkSize }
        }));

        setTimeout(() => {
            this.showSpawnInstructions();
        }, 500);
    }

    public showSpawnInstructions() {
        const existing = document.getElementById('spawn-select-popup');
        if (existing) existing.remove();

        const popup = document.createElement('div');
        popup.id = 'spawn-select-popup';
        popup.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(13,13,18,0.95);
            border: 1px solid rgba(255,215,0,0.4);
            border-radius: 12px;
            padding: 16px 24px;
            z-index: 10000;
            font-family: 'Outfit', sans-serif;
            box-shadow: 0 8px 40px rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            gap: 12px;
        `;
        
        popup.innerHTML = `
            <span style="font-size: 1.5rem;">🎯</span>
            <div>
                <div style="color: #ffd700; font-size: 13px; font-weight: 900; letter-spacing: 1px;">SELECIONE O CHUNK DE SPAWN</div>
                <div style="color: #666; font-size: 11px; margin-top: 2px;">Clique em um marcador do mapa (ex: A1, B2) para definir o spawn</div>
            </div>
            <button id="spawn-skip-btn" style="margin-left: 15px; padding: 8px 16px; background: transparent; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #666; font-size: 11px; cursor: pointer;">PULAR</button>
        `;
        
        document.body.appendChild(popup);
        
        document.getElementById('spawn-skip-btn')?.addEventListener('click', () => {
            popup.remove();
        });

        this.listenForChunkClick();
    }

    private _chunkClickHandler: any = null;

    public listenForChunkClick() {
        if (this._chunkClickHandler) document.removeEventListener('worldmap-chunk-clicked', this._chunkClickHandler);

        this._chunkClickHandler = (e: CustomEvent) => {
            const chunkLabel = e.detail?.chunkLabel;
            if (chunkLabel) {
                this.createPlayerAtChunk(chunkLabel);
                this.removeChunkListener();
                
                const popup = document.getElementById('spawn-select-popup');
                if (popup) popup.remove();
            }
        };
        
        document.addEventListener('worldmap-chunk-clicked', this._chunkClickHandler);
        
        setTimeout(() => {
            this.removeChunkListener();
            const popup = document.getElementById('spawn-select-popup');
            if (popup) popup.remove();
        }, 30000);
    }

    private removeChunkListener() {
        if (this._chunkClickHandler) {
            document.removeEventListener('worldmap-chunk-clicked', this._chunkClickHandler);
            this._chunkClickHandler = null;
        }
    }

    private createPlayerAtChunk(chunkLabel: string) {
        // const chunks = this.state.mapChunks || 4;
        const chunkSize = this.state.mapChunkSize || 500;
        
        const col = chunkLabel.charCodeAt(0) - 65;
        const row = parseInt(chunkLabel.slice(1)) - 1;
        
        const centerX = (col * chunkSize) + (chunkSize / 2);
        const centerY = (row * chunkSize) + (chunkSize / 2);
        
        const objects = (this.state.worldMapObjects || []).filter((o: any) => o.type !== 'player' && o.type !== 'spawn_group' && !o.id.startsWith('spawn_group_'));
        
        const phaseId = 'phase_' + Date.now();
        const cameraW = 200;
        const cameraH = 333;
        
        const groupId = 'spawn_group_' + Date.now();
        objects.push({
            id: groupId,
            type: 'group',
            label: 'Spawn',
            _isGroup: true,
            x: (col * chunkSize),
            y: (row * chunkSize),
            w: chunkSize,
            h: chunkSize,
            isVisible: true,
            opacity: 1,
            isPersistent: true,
            artboardId: 'default',
            inPoint: 0,
            outPoint: 300,
        });
        
        // Camera é inserida manualmente via ferramenta "Ins. Câmera"
        // Não é mais criada automaticamente aqui
        
        const playerId = 'player_' + Date.now();
        objects.push({
            id: playerId,
            type: 'player',
            label: 'Player 1',
            x: centerX - 32,
            y: centerY - 32,
            w: 64,
            h: 64,
            charData: { moveSpeed: 3 },
            isVisible: true,
            opacity: 1,
            isLocked: true,
            isPersistent: true,
            artboardId: 'default',
            inPoint: 0,
            outPoint: 300
        });
        
        // Store phase info in state (not as canvas object)
        this.state.currentPhase = {
            id: phaseId,
            name: this._phaseName,
            spawnFrame: { x: centerX - cameraW / 2, y: centerY - cameraH / 2, w: cameraW, h: cameraH, mode: 'portrait' },
            playerPos: { x: centerX, y: centerY }
        };

        this.state.worldMapObjects = objects;
        this.state.selectedIds = [playerId];
        this.state.selectedId = playerId;
        this.state.expandedLayerIds = [groupId];
        this.state.phaseSpawnFrame = { x: centerX - cameraW / 2, y: centerY - cameraH / 2, w: cameraW, h: cameraH, mode: 'portrait' };
        this.state.phasePlayerPos = { x: centerX, y: centerY };
        
        const preset: PhasePreset = {
            name: this._phaseName,
            phaseId,
            spawnFrame: { x: centerX - cameraW / 2, y: centerY - cameraH / 2, w: cameraW, h: cameraH, mode: 'portrait' },
            playerPos: { x: centerX, y: centerY },
            objects: [],
            collisions: [],
            sensors: [],
            events: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        this._presets.push(preset);
        this.savePresets();
        
        localStorage.setItem('forge_spawn_active', 'true');
        localStorage.setItem('forge_spawn_frame', JSON.stringify(preset.spawnFrame));
        localStorage.setItem('forge_spawn_playerPos', JSON.stringify(preset.playerPos));
        
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        document.dispatchEvent(new CustomEvent('phase-created', { detail: preset }));
        
        console.log('[PhaseWizard] Spawn created at chunk:', chunkLabel, 'position:', centerX, centerY);
    }

    private loadPreset(index: number) {
        const preset = this._presets[index];
        if (!preset) return;

        this.state.phaseSpawnFrame = preset.spawnFrame;
        this.state.phasePlayerPos = preset.playerPos;

        this.close();
        this._isActive = false;

        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        document.dispatchEvent(new CustomEvent('phase-created', { detail: preset }));
    }

    private closeExisting() {
        const existing = document.getElementById('phase-wizard-overlay');
        if (existing) existing.remove();
        
        const popup = document.getElementById('spawn-select-popup');
        if (popup) popup.remove();
    }

    public close() {
        this._isActive = false;
        this.closeExisting();
    }
}
