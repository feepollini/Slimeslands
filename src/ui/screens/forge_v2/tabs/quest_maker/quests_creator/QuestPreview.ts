import { PlayerPhaseInteractor } from '../PlayerPhaseInteractor';

export interface QuestDialogueOption {
  id: string;
  text: string;
  nextDialogueId?: string;
  nextEventId?: string;
  eventData?: Record<string, any>;
}

export interface QuestDialogueStyle {
  bgColor?: string;
  charColor?: string;
  textColor?: string;
  speakerColor?: string;
  glowColor?: string;
  glowTopColor?: string;
  glowIntensity?: number;
  glowStartPercent?: number;
  glowEndPercent?: number;
}

export interface QuestDialogueScreen {
  id: string;
  speaker: string;
  speakerAsset?: string;
  speakerPosition: 'left' | 'center' | 'right';
  text: string;
  textAnimation: 'typewriter' | 'fade' | 'none';
  textSpeed: number;
  duration: number;
  voiceAsset?: string;
  assetWidth?: number;
  assetHeight?: number;
  assetVAlign?: 'flex-start' | 'center' | 'flex-end';
  assetVOffset?: number;
}

export interface QuestDialogue {
  id: string;
  name: string;
  screens: QuestDialogueScreen[];
  options?: QuestDialogueOption[];
  style?: QuestDialogueStyle;
}

export interface QuestCharacter {
  id: string;
  name: string;
  assetUrl: string;
  position: 'left' | 'center' | 'right';
  scale: number;
  opacity: number;
  gradientColor: string;
}

export interface QuestBlock {
  id: string;
  name: string;
  type: 'dialogue' | 'battle' | 'choice' | 'event';
  dialogueIds: string[];
  duration: number;
  choices?: { id: string; text: string; nextBlockId: string }[];
  nextBlockId?: string;
}

export interface QuestEvent {
  id: string;
  name: string;
  type: 'area_trigger' | 'battle_win' | 'battle_lose' | 'turn_after' | 'custom';
  sensorId?: string;
  battleConfig?: { cards?: string[]; turns?: number; dialogueBefore?: string; dialogueAfter?: string };
  dialoguesOnTrigger: string[];
  dialoguesOnWin?: string[];
  dialoguesOnLose?: string[];
  turnDelay?: number;
}

export class QuestPreview {
  private _selectedScreenIndex = 0;
  private _mode: 'portrait' | 'game' = 'portrait';
  private _editorMode: 'list' | 'nodes' = 'list';
  private _container: HTMLElement | null = null;
  private _state: any = null;
  private _dialogues: QuestDialogue[] = [];
  private _characters: QuestCharacter[] = [];
  private _blocks: QuestBlock[] = [];
  private _events: QuestEvent[] = [];
  private _selectedItem: { type: string; index: number } | null = null;
  private _currentDialogueIndex = 0;
  private _currentScreenIndex = 0;
  private _textComplete = false;
  private _typewriterInterval: number | null = null;
  private _phaseInteractor = new PlayerPhaseInteractor();
  private _wmInstance: any = null;
  
  // Layout widths - saved in code
  private _panelWidths = { editor: 32, nodes: 24 };
  
  // Node editor
  private _nodeCanvas: HTMLCanvasElement | null = null;
  private _nodeCtx: CanvasRenderingContext2D | null = null;
  private _draggingNode: string | null = null;
  private _dragOffset = { x: 0, y: 0 };
  private _nodePositions: Map<string, { x: number; y: number }> = new Map();
  private _connectingFrom: string | null = null;
  private _animId: number | null = null;
  
  // History for undo/redo
  private _history: any[] = [];
  private _historyIndex = -1;
  private _maxHistory = 50;

  private _saveToHistory(action: string = 'change') {
    const snapshot = {
      action,
      dialogues: JSON.parse(JSON.stringify(this._dialogues)),
      characters: JSON.parse(JSON.stringify(this._characters)),
      blocks: JSON.parse(JSON.stringify(this._blocks)),
      events: JSON.parse(JSON.stringify(this._events)),
      timestamp: Date.now()
    };
    
    // Remove any future history if we're not at the end
    if (this._historyIndex < this._history.length - 1) {
      this._history = this._history.slice(0, this._historyIndex + 1);
    }
    
    this._history.push(snapshot);
    this._historyIndex = this._history.length - 1;
    
    // Limit history size
    if (this._history.length > this._maxHistory) {
      this._history.shift();
      this._historyIndex--;
    }
    
    console.log('[History] Saved:', action, 'index:', this._historyIndex);
  }

  private _undo() {
    if (this._historyIndex > 0) {
      this._historyIndex--;
      const snapshot = this._history[this._historyIndex];
      this._dialogues = JSON.parse(JSON.stringify(snapshot.dialogues));
      this._characters = JSON.parse(JSON.stringify(snapshot.characters));
      this._blocks = JSON.parse(JSON.stringify(snapshot.blocks));
      this._events = JSON.parse(JSON.stringify(snapshot.events));
      console.log('[History] Undo to index:', this._historyIndex);
    }
  }

  private _redo() {
    if (this._historyIndex < this._history.length - 1) {
      this._historyIndex++;
      const snapshot = this._history[this._historyIndex];
      this._dialogues = JSON.parse(JSON.stringify(snapshot.dialogues));
      this._characters = JSON.parse(JSON.stringify(snapshot.characters));
      this._blocks = JSON.parse(JSON.stringify(snapshot.blocks));
      this._events = JSON.parse(JSON.stringify(snapshot.events));
      console.log('[History] Redo to index:', this._historyIndex);
    }
  }

  private _loadFromLocalStorage() {
    try {
      const dialogues = localStorage.getItem('questDialogues');
      const characters = localStorage.getItem('questCharacters');
      const blocks = localStorage.getItem('questBlocks');
      const events = localStorage.getItem('questEvents');
      
      if (dialogues) this._dialogues = JSON.parse(dialogues);
      if (characters) this._characters = JSON.parse(characters);
      if (blocks) this._blocks = JSON.parse(blocks);
      if (events) this._events = JSON.parse(events);
      
      // Save initial state to history
      if (this._dialogues.length > 0 || this._characters.length > 0 || this._blocks.length > 0 || this._events.length > 0) {
        this._saveToHistory('load');
      }
      
      console.log('[History] Loaded from localStorage');
    } catch (e) {
      console.warn('[History] Failed to load from localStorage:', e);
    }
  }

  constructor() {}

  public setWorldMapInstance(wm: any) {
    this._wmInstance = wm;
    this._phaseInteractor.setWorldMapInstance(wm);
  }

  private _getOfficialEvents(): { id: string; label: string }[] {
    const events = [
      { id: 'playScene', label: '🎬 Reproduzir Cena' },
      { id: 'deliverItem', label: '📦 Entregar Item' },
      { id: 'showDialog', label: '💬 Exibir Diálogo' },
      { id: 'animatedInteraction', label: '🎭 Interação Animada' },
      { id: 'phaseChange', label: '🔄 Troca de Fase' },
      { id: 'portal', label: '🌀 Portal / Teleporte' },
      { id: 'playAudio', label: '🔊 Reproduzir Áudio' },
      { id: 'spawnEntity', label: '✨ Spawn Entidade' },
      { id: 'dealDamage', label: '⚔️ Causar Dano' },
      { id: 'playSound', label: '🔉 Som c/ Falloff' },
      { id: 'battleStart', label: '⚔️ Iniciar Batalha' },
      { id: 'campaignDialogue', label: '💬 Diálogo Campanha' },
      { id: 'tutorial', label: '📖 Tutorial' },
      { id: 'loadPhase', label: '🗺️ Carregar Fase' },
      { id: 'openBoard', label: '🃏 Card Battle' },
      { id: 'openMap', label: '🗺️ Mapa Mundo' },
      { id: 'openArsenal', label: '⚔️ Arsenal' },
      { id: 'openAcademy', label: '📚 Academia' },
      { id: 'openProfile', label: '👤 Perfil' },
      { id: 'openSettings', label: '⚙️ Configurações' },
      { id: 'openSoundCentral', label: '🎵 Som Central' },
      { id: 'chainEvent', label: '🔗 Encadear Eventos' },
    ];
    
    return events;
  }

  private _renderEventFields(opt: any, optIdx: number): string {
    const val = (field: string, def: any = '') => opt.eventData?.[field] !== undefined ? opt.eventData[field] : def;
    const eventType = opt.nextEventId || '';
    const prefix = `qp-opt-${optIdx}`;
    
    let fieldsHtml = '';
    
    if (eventType === 'showDialog') {
      fieldsHtml = `
        <div style="margin-top:8px; padding:8px; background:rgba(167,139,250,0.1); border-radius:6px; border:1px solid rgba(167,139,250,0.2);">
          <div style="font-size:0.5rem; color:#a78bfa; margin-bottom:4px;">TEXTO DO DIÁLOGO</div>
          <textarea class="${prefix}-ev-field" data-field="eventData.dialogText" rows="3" placeholder="Digite o diálogo..." style="
            width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(167,139,250,0.3); border-radius:4px;
            color:#fff; font-size:0.6rem; padding:8px; outline:none; resize:vertical; font-family:inherit;
          ">${val('dialogText', '')}</textarea>
        </div>`;
    } else if (eventType === 'playScene') {
      fieldsHtml = `
        <div style="margin-top:8px; padding:8px; background:rgba(255,140,66,0.1); border-radius:6px; border:1px solid rgba(255,140,66,0.2);">
          <div style="font-size:0.5rem; color:#ff8c42; margin-bottom:4px;">CENA</div>
          <select class="${prefix}-ev-field" data-field="eventData.sceneId" style="
            width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(255,140,66,0.3); border-radius:4px;
            color:#ff8c42; font-size:0.6rem; padding:8px; outline:none;
          ">
            <option value="">— Selecionar cena —</option>
            <option value="scene_1" ${val('sceneId') === 'scene_1' ? 'selected' : ''}>Cena 1</option>
            <option value="scene_2" ${val('sceneId') === 'scene_2' ? 'selected' : ''}>Cena 2</option>
          </select>
        </div>`;
    } else if (eventType === 'phaseChange') {
      fieldsHtml = `
        <div style="margin-top:8px; padding:8px; background:rgba(68,204,255,0.1); border-radius:6px; border:1px solid rgba(68,204,255,0.2);">
          <div style="font-size:0.5rem; color:#44ccff; margin-bottom:4px;">ID DA FASE</div>
          <input type="text" class="${prefix}-ev-field" data-field="eventData.phaseId" value="${val('phaseId', '')}" placeholder="phase_01" style="
            width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(68,204,255,0.3); border-radius:4px;
            color:#44ccff; font-size:0.6rem; padding:8px; outline:none;
          ">
        </div>`;
    } else if (eventType === 'portal') {
      fieldsHtml = `
        <div style="margin-top:8px; padding:8px; background:rgba(155,89,182,0.1); border-radius:6px; border:1px solid rgba(155,89,182,0.2);">
          <div style="display:flex; gap:8px;">
            <div style="flex:1;">
              <div style="font-size:0.5rem; color:#9b59b6; margin-bottom:4px;">X</div>
              <input type="number" class="${prefix}-ev-field" data-field="eventData.portalX" value="${val('portalX', 0)}" style="
                width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(155,89,182,0.3); border-radius:4px;
                color:#9b59b6; font-size:0.6rem; padding:8px;
              ">
            </div>
            <div style="flex:1;">
              <div style="font-size:0.5rem; color:#9b59b6; margin-bottom:4px;">Y</div>
              <input type="number" class="${prefix}-ev-field" data-field="eventData.portalY" value="${val('portalY', 0)}" style="
                width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(155,89,182,0.3); border-radius:4px;
                color:#9b59b6; font-size:0.6rem; padding:8px;
              ">
            </div>
          </div>
        </div>`;
    } else if (eventType === 'playAudio') {
      fieldsHtml = `
        <div style="margin-top:8px; padding:8px; background:rgba(231,76,60,0.1); border-radius:6px; border:1px solid rgba(231,76,60,0.2);">
          <div style="font-size:0.5rem; color:#e74c3c; margin-bottom:4px;">ÁUDIO</div>
          <input type="text" class="${prefix}-ev-field" data-field="eventData.audio" value="${val('audio', '')}" placeholder="/assets/sounds/music.mp3" style="
            width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(231,76,60,0.3); border-radius:4px;
            color:#e74c3c; font-size:0.6rem; padding:8px;
          ">
        </div>`;
    } else if (eventType === 'dealDamage') {
      fieldsHtml = `
        <div style="margin-top:8px; padding:8px; background:rgba(255,68,68,0.1); border-radius:6px; border:1px solid rgba(255,68,68,0.2);">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:0.5rem; color:#ff4444;">DANO:</span>
            <input type="range" class="${prefix}-ev-field" data-field="eventData.damage" min="1" max="100" value="${val('damage', 10)}" style="flex:1;">
            <span style="font-size:0.7rem; color:#ff4444; font-weight:900; width:30px;">${val('damage', 10)}</span>
          </div>
        </div>`;
    } else if (eventType === 'deliverItem') {
      fieldsHtml = `
        <div style="margin-top:8px; padding:8px; background:rgba(255,215,0,0.1); border-radius:6px; border:1px solid rgba(255,215,0,0.2);">
          <div style="font-size:0.5rem; color:#ffd700; margin-bottom:4px;">ITEM</div>
          <input type="text" class="${prefix}-ev-field" data-field="eventData.itemId" value="${val('itemId', '')}" placeholder="potion_001" style="
            width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(255,215,0,0.3); border-radius:4px;
            color:#ffd700; font-size:0.6rem; padding:8px;
          ">
        </div>`;
    } else if (eventType === 'playSound') {
      fieldsHtml = `
        <div style="margin-top:8px; padding:8px; background:rgba(255,200,0,0.1); border-radius:6px; border:1px solid rgba(255,200,0,0.2);">
          <div style="font-size:0.5rem; color:#ffc800; margin-bottom:4px;">SOM</div>
          <input type="text" class="${prefix}-ev-field" data-field="eventData.soundUrl" value="${val('soundUrl', '')}" placeholder="/assets/sounds/sfx.mp3" style="
            width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(255,200,0,0.3); border-radius:4px;
            color:#ffc800; font-size:0.6rem; padding:8px; margin-bottom:8px;
          ">
          <div style="display:flex; gap:8px;">
            <div style="flex:1;">
              <div style="font-size:0.45rem; color:rgba(255,255,255,0.4);">VOL MÍN</div>
              <input type="range" class="${prefix}-ev-field" data-field="eventData.minVol" min="0" max="100" value="${val('minVol', 10)}" style="width:100%;">
            </div>
            <div style="flex:1;">
              <div style="font-size:0.45rem; color:rgba(255,255,255,0.4);">VOL MÁX</div>
              <input type="range" class="${prefix}-ev-field" data-field="eventData.maxVol" min="0" max="100" value="${val('maxVol', 100)}" style="width:100%;">
            </div>
          </div>
        </div>`;
    } else if (eventType === 'battleStart') {
      fieldsHtml = `
        <div style="margin-top:8px; padding:8px; background:rgba(255,68,68,0.1); border-radius:6px; border:1px solid rgba(255,68,68,0.2);">
          <div style="font-size:0.5rem; color:#ff4444; margin-bottom:4px;">TIPO DE BATALHA</div>
          <select class="${prefix}-ev-field" data-field="eventData.battleType" style="
            width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(255,68,68,0.3); border-radius:4px;
            color:#ff4444; font-size:0.6rem; padding:8px;
          ">
            <option value="normal" ${val('battleType') === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="boss" ${val('battleType') === 'boss' ? 'selected' : ''}>Chefão</option>
          </select>
          <div style="font-size:0.5rem; color:#ff4444; margin:8px 0 4px;">INIMIGOS (separados por vírgula)</div>
          <input type="text" class="${prefix}-ev-field" data-field="eventData.enemies" value="${val('enemies', '')}" placeholder="enemy_1, enemy_2" style="
            width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(255,68,68,0.3); border-radius:4px;
            color:#ff4444; font-size:0.6rem; padding:8px;
          ">
        </div>`;
    } else if (eventType === 'loadPhase') {
      fieldsHtml = `
        <div style="margin-top:8px; padding:8px; background:rgba(81,197,255,0.1); border-radius:6px; border:1px solid rgba(81,197,255,0.2);">
          <div style="font-size:0.5rem; color:#51c5ff; margin-bottom:4px;">FASE</div>
          <input type="text" class="${prefix}-ev-field" data-field="eventData.phaseName" value="${val('phaseName', '')}" placeholder="phase_01" style="
            width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(81,197,255,0.3); border-radius:4px;
            color:#51c5ff; font-size:0.6rem; padding:8px;
          ">
        </div>`;
    } else if (eventType === 'tutorial') {
      fieldsHtml = `
        <div style="margin-top:8px; padding:8px; background:rgba(76,255,136,0.1); border-radius:6px; border:1px solid rgba(76,255,136,0.2);">
          <div style="font-size:0.5rem; color:#4cff88; margin-bottom:4px;">TUTORIAL</div>
          <textarea class="${prefix}-ev-field" data-field="eventData.tutorialText" rows="2" placeholder="Texto do tutorial..." style="
            width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(76,255,136,0.3); border-radius:4px;
            color:#4cff88; font-size:0.6rem; padding:8px;
          ">${val('tutorialText', '')}</textarea>
        </div>`;
    } else if (eventType === 'chainEvent') {
      fieldsHtml = `
        <div style="margin-top:8px; padding:8px; background:rgba(6,182,212,0.1); border-radius:6px; border:1px solid rgba(6,182,212,0.2);">
          <div style="font-size:0.5rem; color:#06b6d4; margin-bottom:4px;">CADEIA DE EVENTOS (JSON)</div>
          <textarea class="${prefix}-ev-field" data-field="eventData.chainEvents" rows="3" placeholder='[{"type":"showDialog","text":"Oi!"},{"type":"playAudio","audio":"song.mp3"}]' style="
            width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(6,182,212,0.3); border-radius:4px;
            color:#06b6d4; font-size:0.5rem; padding:8px; font-family:monospace;
          ">${val('chainEvents', '')}</textarea>
        </div>`;
    }
    
    return fieldsHtml;
  }

  public render(state: any): string {
    this._dialogues = (state.questDialogues || []).map((d: any) => {
      if (!d.screens || d.screens.length === 0) {
        return {
          ...d,
          name: d.name || d.speaker || 'Diálogo',
          screens: [{
            id: 'screen_1',
            speaker: d.speaker || '',
            speakerPosition: d.speakerPosition || 'center',
            text: d.text || '',
            textAnimation: d.textAnimation || 'typewriter',
            textSpeed: d.textSpeed || 50,
            duration: d.duration || 2000,
            speakerAsset: d.speakerAsset || '',
            voiceAsset: d.voiceAsset || ''
          }]
        };
      }
      return d;
    });
    this._characters = state.questCharacters || [];
    this._blocks = state.questBlocks || [];
    this._events = state.questEvents || [];

    return `
      <div style="width:100%; height:100%; display:flex; gap:0; position:relative;">
        <!-- Editor Panel -->
        <div class="qp-editor-panel" style="width:${this._panelWidths.editor}%; min-width:200px; background:#0a0a0f; border-right:1px solid rgba(167,139,250,0.2); display:flex; flex-direction:column;">
          <div style="height:100px; overflow-y:auto; background:rgba(255,255,255,0.02); border-radius:6px; padding:6px; border:1px solid rgba(167,139,250,0.15); margin:6px;">
            ${this._renderLists()}
          </div>
          <div style="flex:1; overflow-y:auto; background:rgba(255,255,255,0.03); border-radius:6px; padding:8px; margin:6px; border:1px solid rgba(167,139,250,0.2);">
            ${this._renderEditorPanel()}
          </div>
        </div>
        
        <!-- Resizer 1: Editor <-> Nodes -->
        <div class="qp-resizer" data-resizer="1" style="width:8px; background:#0d0d12; cursor:col-resize; display:flex; align-items:center; justify-content:center; border-right:1px solid rgba(76,255,136,0.2);">
          <div class="qp-resize-handle" style="width:4px; height:40px; background:rgba(76,255,136,0.3); border-radius:2px; cursor:col-resize;"></div>
        </div>
        
        <!-- Nodes Panel -->
        <div class="qp-nodes-panel" style="width:${this._panelWidths.nodes}%; min-width:150px; background:#0d0d12; border-right:1px solid rgba(76,255,136,0.2); position:relative;">
          <canvas id="qp-node-canvas" style="width:100%; height:100%;"></canvas>
          <div style="position:absolute; top:4px; left:4px;">
            <span style="color:#4cff88; font-size:0.5rem; padding:2px 6px; background:rgba(76,255,136,0.15); border-radius:3px;">🔗 Nós</span>
          </div>
        </div>
        
        <!-- Resizer 2: Nodes <-> Preview -->
        <div class="qp-resizer" data-resizer="2" style="width:8px; background:#000; cursor:col-resize; display:flex; align-items:center; justify-content:center;">
          <div class="qp-resize-handle" style="width:4px; height:40px; background:rgba(255,215,0,0.3); border-radius:2px; cursor:col-resize;"></div>
        </div>
        
        <!-- Preview Panel -->
        <div class="qp-preview-panel" style="flex:1; min-width:200px; background:#000; position:relative;">
          <div style="position:absolute; top:4px; left:50%; transform:translateX(-50%); z-index:10; display:flex; gap:3px;">
            <button class="qp-mode-btn" data-mode="portrait" style="padding:2px 6px; border-radius:3px; background:${this._mode === 'portrait' ? 'rgba(255,215,0,0.3)' : 'rgba(0,0,0,0.6)'}; border:1px solid ${this._mode === 'portrait' ? '#ffd700' : 'rgba(255,255,255,0.2)'}; color:${this._mode === 'portrait' ? '#ffd700' : '#666'}; font-size:0.5rem; cursor:pointer;">📱</button>
            <button class="qp-mode-btn" data-mode="game" style="padding:2px 6px; border-radius:3px; background:${this._mode === 'game' ? 'rgba(81,197,255,0.3)' : 'rgba(0,0,0,0.6)'}; border:1px solid ${this._mode === 'game' ? '#51c5ff' : 'rgba(255,255,255,0.2)'}; color:${this._mode === 'game' ? '#51c5ff' : '#666'}; font-size:0.5rem; cursor:pointer;">🌐</button>
          </div>
          ${this._mode === 'portrait' ? this._phaseInteractor.render(state) : this._renderGameFullPreview()}
        </div>
      </div>
    `;
  }

  private _renderGameFullPreview(): string {
    return `
      <iframe id="pp-game-iframe" style="width:100%; height:100%; border:none; position:absolute; top:0; left:0;"></iframe>
    `;
  }

  private _renderEditorPanel(): string {
    // Undo/Redo buttons at top of editor
    const historyControls = `
      <div style="display:flex; gap:6px; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid rgba(167,139,250,0.2);">
        <button class="qp-undo-btn" id="qp-undo" style="flex:1; padding:8px; border-radius:6px; background:rgba(167,139,250,0.15); border:1px solid rgba(167,139,250,0.3); color:#a78bfa; font-size:0.65rem; cursor:pointer;">↩️ Desfazer</button>
        <button class="qp-redo-btn" id="qp-redo" style="flex:1; padding:8px; border-radius:6px; background:rgba(167,139,250,0.15); border:1px solid rgba(167,139,250,0.3); color:#a78bfa; font-size:0.65rem; cursor:pointer;">↪️ Refazer</button>
      </div>
    `;
    
    if (!this._selectedItem) {
      return historyControls + `<div style="color:#555; font-size:0.6rem; text-align:center; padding:40px 0;">Selecione um item<br/>para editar</div>`;
    }

    const item = this._getSelectedItem();
    if (!item) return historyControls + `<div style="color:#555; font-size:0.6rem;">Item não encontrado</div>`;

    switch (this._selectedItem.type) {
      case 'dialogue':
        return historyControls + this._renderDialogueEditor(item as QuestDialogue);
      case 'character':
        return historyControls + this._renderCharacterEditor(item as QuestCharacter);
      case 'block':
        return historyControls + this._renderBlockEditor(item as QuestBlock);
      case 'event':
        return historyControls + this._renderEventEditor(item as QuestEvent);
      default:
        return '';
    }
  }

  private _renderDialogueEditor(d: QuestDialogue): string {
    const screens = d.screens || [];
    const options = d.options || [];
    
    // Asset picker buttons - one for images, one for sounds
    const imageAssetBtn = `
      <button class="qp-open-asset-btn" data-asset-type="image" style="padding:6px 12px; background:rgba(76,255,136,0.2); border:1px solid rgba(76,255,136,0.4); border-radius:6px; color:#4cff88; font-size:0.7rem; cursor:pointer;">🖼️ IMAGEM</button>
    `;
    const soundAssetBtn = `
      <button class="qp-open-asset-btn" data-asset-type="sound" style="padding:6px 12px; background:rgba(81,197,255,0.2); border:1px solid rgba(81,197,255,0.4); border-radius:6px; color:#51c5ff; font-size:0.7rem; cursor:pointer;">🔊 SOM</button>
    `;
    
    // Use selected screen index
    const screenIdx = this._selectedScreenIndex || 0;
    const currentScreen = screens[screenIdx] || screens[0] || { speaker: '', speakerPosition: 'center' as const, text: '', textAnimation: 'typewriter' as const, textSpeed: 50, duration: 2, speakerAsset: '', voiceAsset: '' };
    
    // Show current asset IDs
    const currentImage = currentScreen?.speakerAsset ? `<span style="color:#4cff88; font-size:0.7rem; margin-left:6px;">${currentScreen.speakerAsset}</span>` : '';
    const currentSound = currentScreen?.voiceAsset ? `<span style="color:#51c5ff; font-size:0.7rem; margin-left:6px;">${currentScreen.voiceAsset}</span>` : '';

    // Screen tabs for multi-screen editing
    const screenTabsHtml = screens.map((s, idx) => `
      <div class="qp-screen-tab" data-screen-idx="${idx}" style="padding:8px 16px; background:${idx === screenIdx ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)'}; border:1px solid ${idx === screenIdx ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.1)'}; border-radius:6px; color:${idx === screenIdx ? '#a78bfa' : '#666'}; font-size:0.75rem; cursor:pointer; margin-right:6px;">
        TELA ${idx + 1}
      </div>
    `).join('');

    const firstScreen = currentScreen;

    return `
      <div style="color:#a78bfa; font-size:1rem; font-weight:900; margin-bottom:16px;">💬 EDITAR DIÁLOGO</div>
      
      <!-- SCREEN TABS - Multiple screens -->
      <div style="margin-bottom:16px; padding:12px; background:rgba(255,255,255,0.03); border-radius:10px;">
        <label style="color:#fff; font-size:0.8rem; font-weight:900; display:block; margin-bottom:8px;">📱 TELAS DO DIÁLOGO (cada tela = 1 mensagem)</label>
        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">
          ${screenTabsHtml}
          <button class="qp-add-screen-btn" style="padding:8px 16px; background:rgba(76,255,136,0.15); border:1px solid rgba(76,255,136,0.4); border-radius:6px; color:#4cff88; font-size:0.75rem; cursor:pointer;">＋ NOVA TELA</button>
        </div>
        <div style="color:#555; font-size:0.7rem;">Total: ${screens.length} tela(s) - clique em cada uma para editar</div>
      </div>
      
      <!-- SEÇÃO: SPEAKER & ASSETS (per screen) -->
      <div style="margin-bottom:16px; padding:14px; background:rgba(167,139,250,0.08); border-radius:10px;">
        <label style="color:#a78bfa; font-size:0.8rem; font-weight:900; display:block; margin-bottom:8px;">👤 PERSONAGEM (TELA 1)</label>
        <div style="display:flex; gap:8px; margin-bottom:8px;">
          <input type="text" class="qp-edit-input" data-screen-field="speaker" data-screen-idx="0" value="${firstScreen.speaker || ''}" placeholder="Nome do speaker" style="flex:1; padding:10px; background:rgba(0,0,0,0.4); border:1px solid rgba(167,139,250,0.3); border-radius:6px; color:#fff; font-size:0.8rem;">
          <select class="qp-edit-select" data-screen-field="speakerPosition" data-screen-idx="0" style="width:100px; padding:10px; background:rgba(0,0,0,0.4); border:1px solid rgba(167,139,250,0.3); border-radius:6px; color:#fff; font-size:0.75rem;">
            <option value="left" ${firstScreen.speakerPosition === 'left' ? 'selected' : ''}>Esq</option>
            <option value="center" ${firstScreen.speakerPosition === 'center' ? 'selected' : ''}>Centro</option>
            <option value="right" ${firstScreen.speakerPosition === 'right' ? 'selected' : ''}>Dir</option>
          </select>
        </div>
        
        <!-- Asset Image Controls - Simple sliders -->
        <div style="margin-top:10px; padding:10px; background:rgba(76,255,136,0.08); border-radius:8px; border:1px solid rgba(76,255,136,0.2);">
          <label style="color:#4cff88; font-size:0.7rem; font-weight:900; display:block; margin-bottom:8px;">🖼️ IMAGEM</label>
          
          <div style="margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <label style="color:#666; font-size:0.55rem;">LARGURA</label>
              <span style="color:#4cff88; font-size:0.55rem;">${firstScreen.assetWidth || 100}%</span>
            </div>
            <input type="range" class="qp-live-input" data-screen-field="assetWidth" data-screen-idx="${screenIdx}" min="10" max="200" value="${firstScreen.assetWidth || 100}" style="width:100%;">
          </div>
          
          <div style="margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <label style="color:#666; font-size:0.55rem;">ALTURA</label>
              <span style="color:#4cff88; font-size:0.55rem;">${firstScreen.assetHeight || 100}%</span>
            </div>
            <input type="range" class="qp-live-input" data-screen-field="assetHeight" data-screen-idx="${screenIdx}" min="10" max="200" value="${firstScreen.assetHeight || 100}" style="width:100%;">
          </div>
          
          <div>
            <label style="color:#666; font-size:0.55rem; display:block; margin-bottom:4px;">ALINHAMENTO</label>
            <select class="qp-live-select" data-screen-field="assetVAlign" data-screen-idx="${screenIdx}" style="width:100%; padding:8px; background:rgba(0,0,0,0.4); border:1px solid rgba(76,255,136,0.3); border-radius:6px; color:#fff; font-size:0.7rem;">
              <option value="flex-start" ${firstScreen.assetVAlign === 'flex-start' ? 'selected' : ''}>⬆️ Topo</option>
              <option value="center" ${(!firstScreen.assetVAlign || firstScreen.assetVAlign === 'center') ? 'selected' : ''}>⬜ Centro</option>
              <option value="flex-end" ${firstScreen.assetVAlign === 'flex-end' ? 'selected' : ''}>⬇️ Base</option>
            </select>
          </div>
          
          <div style="margin-top:8px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <label style="color:#666; font-size:0.55rem;">DESLOCAMENTO Y</label>
              <span style="color:#4cff88; font-size:0.55rem;">${firstScreen.assetVOffset || 0}px</span>
            </div>
            <input type="range" class="qp-live-input" data-screen-field="assetVOffset" data-screen-idx="${screenIdx}" min="-200" max="200" value="${firstScreen.assetVOffset || 0}" style="width:100%;">
          </div>
        </div>
        
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <div style="flex:1; min-width:180px;">
            <input type="text" class="qp-edit-input" data-screen-field="speakerAsset" data-screen-idx="${screenIdx}" value="${firstScreen.speakerAsset || ''}" placeholder="asset_id" style="width:100%; padding:10px; background:rgba(0,0,0,0.4); border:1px solid rgba(76,255,136,0.3); border-radius:6px; color:#fff; font-size:0.75rem;">
          </div>
          ${imageAssetBtn}
          ${currentImage}
        </div>
        <div style="display:flex; gap:8px; align-items:center; margin-top:8px; flex-wrap:wrap;">
          <div style="flex:1; min-width:180px;">
            <input type="text" class="qp-edit-input" data-screen-field="voiceAsset" data-screen-idx="${screenIdx}" value="${firstScreen.voiceAsset || ''}" placeholder="sound_id" style="width:100%; padding:10px; background:rgba(0,0,0,0.4); border:1px solid rgba(81,197,255,0.3); border-radius:6px; color:#fff; font-size:0.75rem;">
          </div>
          ${soundAssetBtn}
          ${currentSound}
        </div>
      </div>
      
      <!-- SEÇÃO: TEXTO (per screen) -->
      <div style="margin-bottom:16px; padding:14px; background:rgba(255,255,255,0.03); border-radius:10px;">
        <label style="color:#fff; font-size:0.8rem; font-weight:900; display:block; margin-bottom:8px;">📝 TEXTO (TELA 1)</label>
        <div style="margin-bottom:10px;">
          <textarea class="qp-edit-textarea" data-screen-field="text" data-screen-idx="0" style="width:100%; height:80px; padding:10px; background:rgba(0,0,0,0.4); border:1px solid rgba(167,139,250,0.3); border-radius:6px; color:#fff; font-size:0.85rem; resize:none;">${firstScreen.text || ''}</textarea>
        </div>
      </div>
      
      <!-- SEÇÃO: ANIMAÇÃO (per screen) -->
      <div style="margin-bottom:16px; padding:14px; background:rgba(255,140,66,0.08); border-radius:10px;">
        <label style="color:#ff8c42; font-size:0.8rem; font-weight:900; display:block; margin-bottom:8px;">⚡ ANIMAÇÃO (TELA 1)</label>
        <div style="display:flex; gap:8px; margin-bottom:8px;">
          <div style="flex:1;">
            <label style="color:#666; font-size:0.7rem; display:block; margin-bottom:4px;">TIPO</label>
            <select class="qp-edit-select" data-screen-field="textAnimation" data-screen-idx="0" style="width:100%; padding:10px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,140,66,0.3); border-radius:6px; color:#fff; font-size:0.75rem;">
              <option value="typewriter" ${firstScreen.textAnimation === 'typewriter' ? 'selected' : ''}>Typewriter</option>
              <option value="fade" ${firstScreen.textAnimation === 'fade' ? 'selected' : ''}>Fade In</option>
              <option value="none" ${firstScreen.textAnimation === 'none' ? 'selected' : ''}>Instant</option>
            </select>
          </div>
          <div style="flex:1;">
            <label style="color:#666; font-size:0.7rem; display:block; margin-bottom:4px;">VELOCIDADE (segundos)</label>
            <input type="number" step="0.1" min="0.1" max="5" class="qp-edit-input" data-screen-field="textSpeed" data-screen-idx="0" value="${(firstScreen.textSpeed || 50) / 1000}" style="width:100%; padding:10px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,140,66,0.3); border-radius:6px; color:#fff; font-size:0.75rem;">
          </div>
        </div>
        <div>
          <label style="color:#666; font-size:0.7rem; display:block; margin-bottom:4px;">ESPERA APÓS TEXTO (segundos)</label>
          <input type="number" step="0.5" min="0" max="10" class="qp-edit-input" data-screen-field="duration" data-screen-idx="0" value="${(firstScreen.duration || 2000) / 1000}" style="width:100%; padding:10px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,140,66,0.3); border-radius:6px; color:#fff; font-size:0.75rem;">
        </div>
      </div>
      
      <!-- SEÇÃO: AÇÕES -->
      <div style="margin-bottom:16px; padding:14px; background:rgba(76,255,136,0.08); border-radius:10px;">
        <label style="color:#4cff88; font-size:0.8rem; font-weight:900; display:block; margin-bottom:8px;">🔀 SEÇÃO DE AÇÕES (até 3)</label>
        ${options.length > 0 ? options.map((opt, idx) => `
          <div style="margin-bottom:10px; position:relative; padding:10px; background:rgba(0,0,0,0.3); border-radius:8px;">
            <label style="color:#4cff88; font-size:0.7rem; font-weight:900;">AÇÃO ${idx + 1}</label>
            <input type="text" class="qp-opt-text" data-opt-idx="${idx}" value="${opt.text || ''}" placeholder="Texto da ação..." style="width:100%; padding:8px; margin-top:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(76,255,136,0.3); border-radius:6px; color:#fff; font-size:0.75rem;">
            <div style="display:flex; gap:6px; margin-top:6px;">
              <select class="qp-opt-event" data-opt-idx="${idx}" style="flex:1; padding:8px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,140,66,0.3); border-radius:6px; color:#ff8c42; font-size:0.7rem;">
                <option value="">Selecione uma ação...</option>
                ${this._getOfficialEvents().map((ev: any) => `<option value="${ev.id}" ${opt.nextEventId === ev.id ? 'selected' : ''}>${ev.label}</option>`).join('')}
              </select>
            </div>
            ${this._renderEventFields(opt, idx)}
            <button class="qp-opt-delete" data-opt-idx="${idx}" style="position:absolute; top:6px; right:6px; padding:4px 8px; background:rgba(255,51,102,0.2); border:none; border-radius:4px; color:#ff3366; font-size:0.7rem;">✕</button>
          </div>
        `).join('') : '<div style="color:#666; font-size:0.75rem; margin-bottom:10px;">Nenhuma ação - o diálogo segue para próxima tela automaticamente</div>'}
        ${options.length < 3 ? `<button class="qp-add-option-btn" style="width:100%; padding:12px; background:rgba(76,255,136,0.1); border:1px solid rgba(76,255,136,0.3); border-radius:6px; color:#4cff88; font-size:0.75rem; cursor:pointer;">＋ ADICIONAR AÇÃO</button>` : ''}
      </div>
      
      <!-- SEÇÃO: CORES -->
      <div style="margin-bottom:16px; padding:14px; background:rgba(255,255,255,0.05); border-radius:10px;">
        <label style="color:#a78bfa; font-size:0.8rem; font-weight:900; display:block; margin-bottom:8px;">🎨 CORES</label>
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin-bottom:12px;">
          <div><label style="color:#666; font-size:0.6rem;">FUNDO</label><input type="color" class="qp-style-color" data-style="bgColor" value="${d.style?.bgColor || '#1a1a2e'}" style="width:100%; height:30px;"></div>
          <div><label style="color:#666; font-size:0.6rem;">CHAR</label><input type="color" class="qp-style-color" data-style="charColor" value="${d.style?.charColor || '#4cff88'}" style="width:100%; height:30px;"></div>
          <div><label style="color:#666; font-size:0.6rem;">TEXTO</label><input type="color" class="qp-style-color" data-style="textColor" value="${d.style?.textColor || '#ffffff'}" style="width:100%; height:30px;"></div>
          <div><label style="color:#666; font-size:0.6rem;">SPEAKER</label><input type="color" class="qp-style-color" data-style="speakerColor" value="${d.style?.speakerColor || '#a78bfa'}" style="width:100%; height:30px;"></div>
        </div>
        
        <!-- Gradient Editor -->
        <div style="padding:12px; background:rgba(0,0,0,0.3); border-radius:8px; margin-top:8px;">
          <label style="color:#4cff88; font-size:0.7rem; font-weight:900; display:block; margin-bottom:10px;">📊 DEGRADÊ DO FUNDO</label>
          
          <!-- Cores do degradê -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:12px;">
            <div style="text-align:center;">
              <label style="color:#666; font-size:0.45rem; display:block; margin-bottom:4px;">🔴 COR (BASE)</label>
              <input type="color" class="qp-style-color" data-style="glowColor" value="${d.style?.glowColor || '#ffffff'}" style="width:100%; height:36px; border-radius:6px; cursor:pointer; border:2px solid rgba(76,255,136,0.3);">
            </div>
            <div style="text-align:center;">
              <label style="color:#666; font-size:0.45rem; display:block; margin-bottom:4px;">⚪ TOPO (TRANSPARENTE)</label>
              <input type="color" class="qp-style-color" data-style="glowTopColor" value="${d.style?.glowTopColor || '#000000'}" style="width:100%; height:36px; border-radius:6px; cursor:pointer; border:2px solid rgba(255,255,255,0.2);">
            </div>
          </div>
          
          <!-- Posição e intensidade -->
          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <label style="color:#666; font-size:0.45rem;">INÍCIO</label>
                <span style="color:#4cff88; font-size:0.45rem;">${d.style?.glowStartPercent || 15}%</span>
              </div>
              <input type="range" class="qp-style-range" data-style="glowStartPercent" min="0" max="50" value="${d.style?.glowStartPercent || 15}" style="width:100%;">
            </div>
            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <label style="color:#666; font-size:0.45rem;">FIM</label>
                <span style="color:#4cff88; font-size:0.45rem;">${d.style?.glowEndPercent || 70}%</span>
              </div>
              <input type="range" class="qp-style-range" data-style="glowEndPercent" min="30" max="100" value="${d.style?.glowEndPercent || 70}" style="width:100%;">
            </div>
            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <label style="color:#666; font-size:0.45rem;">INTENS</label>
                <span style="color:#4cff88; font-size:0.45rem;">${d.style?.glowIntensity || 90}%</span>
              </div>
              <input type="range" class="qp-style-range" data-style="glowIntensity" min="50" max="100" value="${d.style?.glowIntensity || 90}" style="width:100%;">
            </div>
          </div>
          
          <!-- Preview mini do degradê -->
          <div style="margin-top:10px; padding:6px; background:linear-gradient(to top, ${d.style?.glowColor || '#1a1a2e'}, transparent); border-radius:6px; height:36px; border:1px solid rgba(76,255,136,0.4); position:relative;">
            <div style="position:absolute; bottom:6px; left:50%; transform:translateX(-50%); color:#fff; font-size:0.5rem; text-shadow:0 1px 2px #000;">PREVIEW</div>
          </div>
        </div>
      </div>
      
      <!-- BOTÃO PLAY -->
      <button class="qp-play-dialogue-btn" style="width:100%; padding:16px; background:rgba(76,255,136,0.2); border:2px solid #4cff88; border-radius:10px; color:#4cff88; font-size:0.9rem; font-weight:900; cursor:pointer; margin-bottom:10px;">▶️ PLAY DIÁLOGO</button>
      
      <!-- AÇÕES -->
      <div style="display:flex; gap:8px;">
        <button class="qp-save-preset-btn" style="flex:1; padding:12px; background:rgba(167,139,250,0.15); border:1px solid rgba(167,139,250,0.3); border-radius:8px; color:#a78bfa; font-size:0.8rem; cursor:pointer;">💾 PRESET</button>
        <button class="qp-save-block-btn" style="flex:1; padding:12px; background:rgba(255,140,66,0.15); border:1px solid rgba(255,140,66,0.3); border-radius:8px; color:#ff8c42; font-size:0.8rem; cursor:pointer;">📦 BLOCO</button>
      </div>
    `;
  }

  private _renderCharacterEditor(c: QuestCharacter): string {
    return `
      <div style="color:#4cff88; font-size:1rem; font-weight:900; margin-bottom:16px;">👤 EDITAR PERSONAGEM</div>
      
      <div style="margin-bottom:14px;">
        <label style="color:#666; font-size:0.8rem; display:block; margin-bottom:6px;">NOME</label>
        <input type="text" class="qp-edit-input" data-field="name" value="${c.name || ''}" style="width:100%; padding:12px; background:rgba(0,0,0,0.4); border:1px solid rgba(76,255,136,0.3); border-radius:6px; color:#fff; font-size:0.85rem;">
      </div>
      
      <div style="margin-bottom:14px;">
        <label style="color:#666; font-size:0.8rem; display:block; margin-bottom:6px;">IMAGEM (PNG)</label>
        <div style="display:flex; gap:8px;">
          <input type="text" class="qp-edit-input" data-field="assetUrl" value="${c.assetUrl || ''}" placeholder="asset_id" style="flex:1; padding:12px; background:rgba(0,0,0,0.4); border:1px solid rgba(76,255,136,0.3); border-radius:6px; color:#fff; font-size:0.85rem;">
          <button style="padding:12px; background:rgba(76,255,136,0.2); border:1px solid rgba(76,255,136,0.4); border-radius:6px; color:#4cff88; font-size:0.85rem;">📁</button>
        </div>
        <div style="width:100%; height:80px; background:rgba(0,0,0,0.3); border:1px dashed rgba(76,255,136,0.3); border-radius:6px; margin-top:8px; display:flex; align-items:center; justify-content:center; color:#555; font-size:0.8rem;">${c.assetUrl ? '🖼️ Carregado' : 'Arraste imagem aqui'}</div>
      </div>
      
      <div style="margin-bottom:14px;">
        <label style="color:#666; font-size:0.8rem; display:block; margin-bottom:6px;">POSIÇÃO</label>
        <select class="qp-edit-select" data-field="position" style="width:100%; padding:12px; background:rgba(0,0,0,0.4); border:1px solid rgba(76,255,136,0.3); border-radius:6px; color:#fff; font-size:0.85rem;">
          <option value="left" ${c.position === 'left' ? 'selected' : ''}>Esquerda</option>
          <option value="center" ${c.position === 'center' ? 'selected' : ''}>Centro</option>
          <option value="right" ${c.position === 'right' ? 'selected' : ''}>Direita</option>
        </select>
      </div>
      
      <div style="margin-bottom:14px;">
        <label style="color:#666; font-size:0.8rem; display:block; margin-bottom:6px;">OPACIDADE</label>
        <input type="range" class="qp-edit-range" data-field="opacity" min="0" max="1" step="0.1" value="${c.opacity || 1}" style="width:100%; accent-color:#4cff88;">
      </div>
      
      <div style="margin-bottom:14px;">
        <label style="color:#666; font-size:0.8rem; display:block; margin-bottom:6px;">COR GRADIENTE</label>
        <input type="color" class="qp-edit-color" data-field="gradientColor" value="${c.gradientColor || '#4cff88'}" style="width:100%; height:40px; border:none; border-radius:6px; cursor:pointer;">
      </div>
    `;
  }

  private _renderBlockEditor(b: QuestBlock): string {
    const choicesHtml = (b.choices || []).map((ch, idx) => `
      <div style="padding:6px; background:rgba(255,140,66,0.1); border:1px solid rgba(255,140,66,0.3); border-radius:4px; margin:4px 0; display:flex; align-items:center; gap:6px;">
        <span style="color:#ff8c42; font-size:0.5rem;">${ch.text?.substring(0, 15)}</span>
        <span style="color:#666; font-size:0.4rem;">→</span>
        <span style="color:#4cff88; font-size:0.4rem;">${ch.nextBlockId || 'none'}</span>
      </div>
    `).join('');

    return `
      <div style="color:#ff8c42; font-size:0.55rem; font-weight:900; margin-bottom:12px;">📦 EDITAR BLOCO</div>
      
      <div style="margin-bottom:10px;">
        <label style="color:#666; font-size:0.45rem; display:block; margin-bottom:4px;">NOME DO BLOCO</label>
        <input type="text" class="qp-edit-input" data-field="name" value="${b.name || ''}" style="width:100%; padding:8px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,140,66,0.3); border-radius:4px; color:#fff; font-size:0.55rem;">
      </div>
      
      <div style="margin-bottom:10px;">
        <label style="color:#666; font-size:0.45rem; display:block; margin-bottom:4px;">TIPO</label>
        <select class="qp-edit-select" data-field="type" style="width:100%; padding:8px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,140,66,0.3); border-radius:4px; color:#fff; font-size:0.5rem;">
          <option value="dialogue" ${b.type === 'dialogue' ? 'selected' : ''}>Diálogo</option>
          <option value="battle" ${b.type === 'battle' ? 'selected' : ''}>Batalha</option>
          <option value="choice" ${b.type === 'choice' ? 'selected' : ''}>Escolha</option>
        </select>
      </div>
      
      <div style="margin-bottom:10px;">
        <label style="color:#666; font-size:0.45rem; display:block; margin-bottom:4px;">DURAÇÃO (ms)</label>
        <input type="number" class="qp-edit-input" data-field="duration" value="${b.duration || 3000}" style="width:100%; padding:8px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,140,66,0.3); border-radius:4px; color:#fff; font-size:0.55rem;">
      </div>
      
      <div style="margin-bottom:10px;">
        <label style="color:#666; font-size:0.45rem; display:block; margin-bottom:4px;">DIÁLOGOS NO BLOCO</label>
        <div style="padding:8px; background:rgba(0,0,0,0.3); border-radius:4px; min-height:40px; color:#666; font-size:0.45rem;">${(b.dialogueIds || []).length} diálogos vinculados</div>
      </div>
      
      <div style="margin-bottom:10px;">
        <label style="color:#666; font-size:0.45rem; display:block; margin-bottom:4px;">ESCOLHAS (RAMIFICAÇÃO)</label>
        ${choicesHtml || '<div style="color:#444; font-size:0.45rem;">Nenhuma escolha</div>'}
        <button style="margin-top:6px; padding:6px 10px; background:rgba(255,140,66,0.15); border:1px solid rgba(255,140,66,0.3); border-radius:4px; color:#ff8c42; font-size:0.45rem; cursor:pointer;">＋ ADICIONAR ESCOLHA</button>
      </div>
    `;
  }

  private _renderEventEditor(e: QuestEvent): string {
    return `
      <div style="color:#ff3366; font-size:0.55rem; font-weight:900; margin-bottom:12px;">⚡ EDITAR EVENTO</div>
      
      <div style="margin-bottom:10px;">
        <label style="color:#666; font-size:0.45rem; display:block; margin-bottom:4px;">TIPO DE EVENTO</label>
        <select class="qp-edit-select" data-field="type" style="width:100%; padding:8px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,51,102,0.3); border-radius:4px; color:#fff; font-size:0.5rem;">
          <option value="area_trigger" ${e.type === 'area_trigger' ? 'selected' : ''}>Ao entrar na área</option>
          <option value="battle_win" ${e.type === 'battle_win' ? 'selected' : ''}>Batalha vencida</option>
          <option value="battle_lose" ${e.type === 'battle_lose' ? 'selected' : ''}>Batalha perdida</option>
          <option value="turn_after" ${e.type === 'turn_after' ? 'selected' : ''}>X turnos depois</option>
        </select>
      </div>
      
      <div style="margin-bottom:10px;">
        <label style="color:#666; font-size:0.45rem; display:block; margin-bottom:4px;">ID DO SENSOR (do mapa)</label>
        <input type="text" class="qp-edit-input" data-field="sensorId" value="${e.sensorId || ''}" placeholder="sensor_123" style="width:100%; padding:8px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,51,102,0.3); border-radius:4px; color:#fff; font-size:0.5rem;">
      </div>
      
      <div style="margin-bottom:10px;">
        <label style="color:#666; font-size:0.45rem; display:block; margin-bottom:4px;">TURNO DE ATIVAÇÃO</label>
        <input type="number" class="qp-edit-input" data-field="turnDelay" value="${e.turnDelay || 1}" style="width:100%; padding:8px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,51,102,0.3); border-radius:4px; color:#fff; font-size:0.55rem;">
      </div>
      
      <div style="margin-bottom:10px; padding:10px; background:rgba(255,51,102,0.1); border-radius:6px;">
        <label style="color:#ff3366; font-size:0.45rem; font-weight:900; display:block; margin-bottom:8px;">CONFIGURAÇÃO DE BATALHA</label>
        <input type="text" placeholder="Cartas (csv)" style="width:100%; padding:6px; margin-bottom:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,51,102,0.3); border-radius:4px; color:#fff; font-size:0.45rem;">
        <div style="display:flex; gap:6px;">
          <input type="number" placeholder="Turnos" value="3" style="flex:1; padding:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,51,102,0.3); border-radius:4px; color:#fff; font-size:0.45rem;">
          <button style="flex:1; padding:6px; background:rgba(255,51,102,0.2); border:1px solid rgba(255,51,102,0.4); border-radius:4px; color:#ff3366; font-size:0.45rem; cursor:pointer;">⚔️ DEFINIR</button>
        </div>
      </div>
      
      <div style="margin-bottom:10px;">
        <label style="color:#666; font-size:0.45rem; display:block; margin-bottom:4px;">DIÁLOGOS AO ATIVAR</label>
        <div style="padding:8px; background:rgba(0,0,0,0.3); border-radius:4px; min-height:30px; color:#666; font-size:0.45rem;">${(e.dialoguesOnTrigger || []).length} diálogos</div>
      </div>
    `;
  }

  private _getSelectedItem(): any {
    if (!this._selectedItem) return null;
    const { type, index } = this._selectedItem;
    if (type === 'dialogue') return this._dialogues[index];
    if (type === 'character') return this._characters[index];
    if (type === 'block') return this._blocks[index];
    if (type === 'event') return this._events[index];
    return null;
  }

  public bind(container: HTMLElement, state: any) {
    this._container = container;
    this._state = state;
    
    // Load from localStorage first, then merge with state
    this._loadFromLocalStorage();
    
    // Merge localStorage data with state (state takes precedence if has data)
    if (state.questDialogues && state.questDialogues.length > 0) {
      this._dialogues = (state.questDialogues || []).map((d: any) => {
        if (!d.screens || d.screens.length === 0) {
          return {
            ...d,
            name: d.name || d.speaker || 'Diálogo',
            screens: [{
              id: 'screen_1',
              speaker: d.speaker || '',
              speakerPosition: d.speakerPosition || 'center',
              text: d.text || '',
              textAnimation: d.textAnimation || 'typewriter',
              textSpeed: d.textSpeed || 50,
              duration: d.duration || 2000,
              speakerAsset: d.speakerAsset || '',
              voiceAsset: d.voiceAsset || ''
            }]
          };
        }
        return d;
      });
    }
    
    if (state.questCharacters && state.questCharacters.length > 0) {
      this._characters = state.questCharacters || [];
    }
    if (state.questBlocks && state.questBlocks.length > 0) {
      this._blocks = state.questBlocks || [];
    }
    if (state.questEvents && state.questEvents.length > 0) {
      this._events = state.questEvents || [];
    }
    
    // Save initial history after loading
    if (this._history.length === 0) {
      this._saveToHistory('init');
    }

    container.querySelectorAll('.qp-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.mode;
        if (mode) {
          this._mode = mode as 'portrait' | 'game';
          this.rerender(state);
        }
      });
    });

    // Resizer drag functionality - precise and proportional
    const startResize = (e: MouseEvent, resizerNum: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      const containerRect = container.getBoundingClientRect();
      const startX = e.clientX;
      const editor = container.querySelector('.qp-editor-panel') as HTMLElement;
      const nodes = container.querySelector('.qp-nodes-panel') as HTMLElement;
      const preview = container.querySelector('.qp-preview-panel') as HTMLElement;
      const resizers = container.querySelectorAll('.qp-resizer');
      
      // Get initial widths
      const getWidth = (el: HTMLElement | null) => {
        if (!el) return 0;
        const style = el.style.width;
        if (style.includes('%')) return parseFloat(style);
        return (parseFloat(style) / containerRect.width) * 100;
      };
      
      const initEditorW = getWidth(editor);
      const initNodesW = getWidth(nodes);
      const resizerWidth = 8; // px percentage
      
      // Add visual indicator
      resizers.forEach(r => (r as HTMLElement).style.background = 'rgba(255,255,255,0.1)');
      document.body.style.cursor = 'col-resize';
      
      const onMouseMove = (moveEvent: MouseEvent) => {
        const diff = moveEvent.clientX - startX;
        const diffPercent = (diff / containerRect.width) * 100;
        
        if (resizerNum === '1') {
          // Resizer 1: Editor <-> Nodes+Preview
          let newEditorW = initEditorW + diffPercent;
          newEditorW = Math.max(20, Math.min(45, newEditorW));
          
          const remaining = 100 - newEditorW - resizerWidth;
          const nodesRatio = initNodesW / (initNodesW + (100 - initEditorW - resizerWidth));
          const newNodesW = remaining * nodesRatio;
          
          if (editor) editor.style.width = newEditorW + '%';
          if (nodes) nodes.style.width = newNodesW + '%';
          if (preview) preview.style.flex = '0 0 ' + (remaining - newNodesW) + '%';
          
        } else if (resizerNum === '2') {
          // Resizer 2: Nodes <-> Preview
          let newNodesW = initNodesW + diffPercent;
          newNodesW = Math.max(15, Math.min(50, newNodesW));
          
          if (nodes) nodes.style.width = newNodesW + '%';
          if (preview) preview.style.flex = '1';
        }
      };
      
      const onMouseUp = () => {
        resizers.forEach(r => (r as HTMLElement).style.background = '');
        document.body.style.cursor = '';
        
        // Save new widths to class property
        const newEditorW = getWidth(editor);
        const newNodesW = getWidth(nodes);
        this._panelWidths = { editor: newEditorW, nodes: newNodesW };
        
        console.log('[Layout] Saved - Editor:', newEditorW.toFixed(1) + '%, Nodes:', newNodesW.toFixed(1) + '%');
        
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };
    
    container.querySelectorAll('.qp-resizer').forEach(resizer => {
      resizer.addEventListener('mousedown', (e: Event) => {
        const resizerNum = (resizer as HTMLElement).dataset.resizer || '1';
        startResize(e as MouseEvent, resizerNum);
      });
    });

    // Click on resizer handle saves current layout
    container.querySelectorAll('.qp-resize-handle').forEach(handle => {
      handle.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const editor = container.querySelector('.qp-editor-panel') as HTMLElement;
        const nodes = container.querySelector('.qp-nodes-panel') as HTMLElement;
        const editorWidth = editor?.style.width || '32%';
        const nodesWidth = nodes?.style.width || '24%';
        console.log('[Layout] Saved - Editor:', editorWidth, 'Nodes:', nodesWidth);
        alert('Layout salvo!\nEditor: ' + editorWidth + '\nNós: ' + nodesWidth);
      });
    });

    container.querySelectorAll('.qp-editor-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.mode;
        if (mode) {
          this._editorMode = mode as 'list' | 'nodes';
          this.rerender(state);
          if (mode === 'nodes') {
            setTimeout(() => this._initNodeEditor(), 100);
          }
        }
      });
    });

    container.querySelectorAll('.qp-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = (btn as HTMLElement).dataset.type;
        if (type) {
          this._addNewItem(type);
          this._saveState(state);
          this.rerender(state);
        }
      });
    });

    container.querySelectorAll('.qp-list-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('qp-delete-btn')) return;
        const type = (item as HTMLElement).dataset.type;
        const idx = parseInt((item as HTMLElement).dataset.index || '0');
        if (type) this._selectedItem = { type, index: idx };
        this.rerender(state);
      });
    });

    container.querySelectorAll('.qp-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = (btn as HTMLElement).dataset.type;
        const idx = parseInt((btn as HTMLElement).dataset.index || '0');
        if (type) {
          this._saveToHistory('delete_' + type);
          this._deleteItem(type, idx);
          this._selectedItem = null;
          this._saveState(state);
          this.rerender(state);
        }
      });
    });

    container.querySelectorAll('.qp-edit-input, .qp-edit-textarea, .qp-edit-select').forEach(input => {
      input.addEventListener('input', () => {
        this._updateSelectedItem(input as HTMLInputElement);
        this._saveState(state);
        this._updateLivePreview(state);
      });
      input.addEventListener('blur', () => {
        // Save to history on blur (when user leaves the field)
        this._saveToHistory('edit_field');
      });
      input.addEventListener('change', () => {
        const field = (input as HTMLElement).dataset.field;
        const screenField = (input as HTMLElement).dataset.screenField;
        
        if (field === 'speakerPosition') {
          this.rerender(state);
        }
        // Handle screen field changes
        if (screenField) {
          this.rerender(state);
        }
      });
    });

    // Live update for sliders - update preview without full rerender
    container.querySelectorAll('.qp-live-input').forEach(input => {
      input.addEventListener('input', () => {
        if (!this._selectedItem || this._selectedItem.type !== 'dialogue') return;
        const d = this._dialogues[this._selectedItem.index];
        if (!d) return;
        
        const field = (input as HTMLElement).dataset.screenField;
        const screenIdx = parseInt((input as HTMLElement).dataset.screenIdx || '0');
        const value = (input as HTMLInputElement).value;
        
        if (d.screens && d.screens[screenIdx]) {
          (d.screens[screenIdx] as any)[field] = value;
          // Update the live preview without rerendering
          this._updateLivePreviewNoRerender(d, screenIdx);
        }
      });
    });

    // Live update for selects
    container.querySelectorAll('.qp-live-select').forEach(select => {
      select.addEventListener('change', () => {
        if (!this._selectedItem || this._selectedItem.type !== 'dialogue') return;
        const d = this._dialogues[this._selectedItem.index];
        if (!d) return;
        
        const field = (select as HTMLElement).dataset.screenField;
        const screenIdx = parseInt((select as HTMLElement).dataset.screenIdx || '0');
        const value = (select as HTMLSelectElement).value;
        
        if (d.screens && d.screens[screenIdx]) {
          (d.screens[screenIdx] as any)[field] = value;
          this._updateLivePreviewNoRerender(d, screenIdx);
        }
      });
    });

    container.querySelector('.qp-char-placeholder')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._showAssetPopup('image');
    });

    // Asset buttons - handle both image and sound buttons
    container.querySelectorAll('.qp-open-asset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Asset button clicked');
        const type = (e.target as HTMLElement).dataset.assetType as 'image' | 'sound';
        this._showAssetPopup(type);
      });
    });

    container.querySelector('.qp-save-preset-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Save preset clicked');
      if (!this._selectedItem || this._selectedItem.type !== 'dialogue') return;
      const d = this._dialogues[this._selectedItem.index];
      if (!d) return;
      console.log('Showing overlay for dialogue:', d.id);
      
      const presets = JSON.parse(localStorage.getItem('quest_dialogue_presets') || '[]');
      presets.push({
        id: 'preset_' + Date.now(),
        name: d.speaker || 'Preset',
        dialogue: { ...d }
      });
      localStorage.setItem('quest_dialogue_presets', JSON.stringify(presets));
      alert(`💾 Preset "${d.speaker}" salvo com sucesso!`);
      
      // Show overlay immediately after saving preset
      this._showDialogueOverlayOnPreview(d, 0);
    });

    // Play dialogue button
    container.querySelector('.qp-play-dialogue-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this._selectedItem || this._selectedItem.type !== 'dialogue') return;
      const d = this._dialogues[this._selectedItem.index];
      if (!d) return;
      this._showDialogueOverlayOnPreview(d, 0);
    });

    // Undo/Redo buttons
    document.getElementById('qp-undo')?.addEventListener('click', () => {
      console.log('[History] Undo clicked');
      this._undo();
      this._saveState(this._state || {});
      this.rerender(this._state || {});
    });
    
    document.getElementById('qp-redo')?.addEventListener('click', () => {
      console.log('[History] Redo clicked');
      this._redo();
      this._saveState(this._state || {});
      this.rerender(this._state || {});
    });

    container.querySelector('.qp-save-block-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this._selectedItem || this._selectedItem.type !== 'dialogue') return;
      const d = this._dialogues[this._selectedItem.index];
      if (!d) return;
      
      if (this._blocks.length === 0) {
        this._blocks.push({ id: 'b_' + Date.now(), name: 'Novo Bloco', type: 'dialogue', dialogueIds: [], duration: 3000 });
      }
      
      const targetBlock = this._blocks[0];
      if (!targetBlock.dialogueIds) targetBlock.dialogueIds = [];
      if (!targetBlock.dialogueIds.includes(d.id)) {
        targetBlock.dialogueIds.push(d.id);
      }
      
      this._saveToHistory('add_to_block');
      this._saveState({} as any);
      alert(`📦 Diálogo adicionado ao bloco "${targetBlock.name}"`);
    });

    // Play dialogue button
    container.querySelector('.qp-play-dialogue-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this._selectedItem || this._selectedItem.type !== 'dialogue') return;
      const d = this._dialogues[this._selectedItem.index];
      if (!d) return;
      this._showDialogueOverlayOnPreview(d, 0);
    });

    // Color picker handlers
    container.querySelectorAll('.qp-style-color').forEach(input => {
      input.addEventListener('input', () => {
        if (!this._selectedItem || this._selectedItem.type !== 'dialogue') return;
        const d = this._dialogues[this._selectedItem.index];
        if (!d) return;
        
        const field = (input as HTMLElement).dataset.style;
        if (!field || !d.style) d.style = {};
        
        d.style[field as keyof QuestDialogueStyle] = (input as HTMLInputElement).value;
        this._saveState({} as any);
        this._updateLivePreview({});
      });
    });

    // Style range handlers
    container.querySelectorAll('.qp-style-range').forEach(input => {
      input.addEventListener('input', () => {
        if (!this._selectedItem || this._selectedItem.type !== 'dialogue') return;
        const d = this._dialogues[this._selectedItem.index];
        if (!d) return;
        
        const field = (input as HTMLElement).dataset.style;
        if (!field || !d.style) d.style = {};
        
        d.style[field as keyof QuestDialogueStyle] = (input as HTMLInputElement).value;
        
        // Update the display value
        const valSpan = container.querySelector(`.qp-${field}-val`);
        if (valSpan) valSpan.textContent = (input as HTMLInputElement).value + '%';
        
        this._saveState({} as any);
      });
    });

    // Add screen button - for multi-screen dialogues
    const addScreenBtn = container.querySelector('.qp-add-screen-btn');
    if (addScreenBtn) {
      addScreenBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Add screen button clicked');
        if (!this._selectedItem || this._selectedItem.type !== 'dialogue') return;
        const d = this._dialogues[this._selectedItem.index];
        if (!d) return;
        console.log('Adding screen to dialogue:', d.id);
        
        this._saveToHistory('add_screen');
        if (!d.screens) d.screens = [];
        d.screens.push({
          id: 'screen_' + Date.now(),
          speaker: '',
          speakerPosition: 'center',
          text: '',
          textAnimation: 'typewriter',
          textSpeed: 50,
          duration: 2
        });
        this._saveState({} as any);
        this.rerender(this._state || {});
      });
    }

    // Screen tab click handlers - switch between screens
    container.querySelectorAll('.qp-screen-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt((tab as HTMLElement).dataset.screenIdx || '0');
        this._selectedScreenIndex = idx;
        this.rerender(this._state || {});
      });
    });

    // Add option button (max 3)
    container.querySelector('.qp-add-option-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Add option clicked');
      if (!this._selectedItem || this._selectedItem.type !== 'dialogue') return;
      const d = this._dialogues[this._selectedItem.index];
      if (!d) return;
      console.log('Adding option to dialogue:', d.id);
      
      if (!d.options) d.options = [];
      if (d.options.length >= 3) return;
      
      d.options.push({ id: 'opt_' + Date.now(), text: `Opção ${d.options.length + 1}` });
      this._saveState({} as any);
      this.rerender(this._state || {});
    });

    // Option event selector - update on change
    container.querySelectorAll('.qp-opt-event').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const optIdx = parseInt(target.dataset.optIdx || '0');
        const eventId = target.value;
        
        if (this._selectedItem && this._selectedItem.type === 'dialogue') {
          const d = this._dialogues[this._selectedItem.index];
          if (d && d.options && d.options[optIdx]) {
            d.options[optIdx].nextEventId = eventId;
            this._saveState({} as any);
            this.rerender(this._state || {});
          }
        }
      });
    });
    
    // Event field inputs - save on change
    container.querySelectorAll('.qp-opt-0-ev-field, .qp-opt-1-ev-field, .qp-opt-2-ev-field').forEach(field => {
      field.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        const fieldPath = target.dataset.field || '';
        const optIdx = parseInt(target.closest('[class*="qp-opt-"]')?.className.match(/qp-opt-(\d)/)?.[1] || '0');
        
        if (fieldPath && this._selectedItem && this._selectedItem.type === 'dialogue') {
          const d = this._dialogues[this._selectedItem.index];
          if (d && d.options && d.options[optIdx]) {
            if (!d.options[optIdx].eventData) d.options[optIdx].eventData = {};
            
            if (fieldPath.startsWith('eventData.')) {
              const key = fieldPath.replace('eventData.', '');
              (d.options[optIdx].eventData as any)[key] = target.value;
            }
            
            this._saveState({} as any);
          }
        }
      });
    });

    // Bind phase interactor if in portrait mode
    if (this._mode === 'portrait') {
      const phoneArea = container.querySelector('.qp-preview');
      if (phoneArea) {
        this._phaseInteractor.setActive(true);
      }
    } else {
      this._loadGameFull();
    }
  }

  private _loadGameFull() {
    const iframe = document.getElementById('pp-game-iframe') as HTMLIFrameElement | null;
    if (!iframe) return;
    const port = window.location.port || '3000';
    iframe.src = `http://localhost:${port}/`;
  }

  private _addNewItem(type: string) {
    switch (type) {
      case 'dialogue':
        this._dialogues.push({ 
          id: 'd_' + Date.now(), 
          name: 'Novo Diálogo',
          screens: [{
            id: 'screen_1',
            speaker: 'Novo',
            speakerPosition: 'center',
            text: 'Olá!',
            textAnimation: 'typewriter',
            textSpeed: 50,
            duration: 2000
          }],
          options: []
        });
        break;
      case 'character':
        this._characters.push({ id: 'c_' + Date.now(), name: 'Novo', assetUrl: '', position: 'center', scale: 1, opacity: 1, gradientColor: '#4cff88' });
        break;
      case 'block':
        this._blocks.push({ id: 'b_' + Date.now(), name: 'Novo Bloco', type: 'dialogue', dialogueIds: [], duration: 3000 });
        break;
      case 'event':
        this._events.push({ id: 'e_' + Date.now(), name: 'Novo Evento', type: 'area_trigger', dialoguesOnTrigger: [] });
        break;
    }
  }

  private _deleteItem(type: string, index: number) {
    if (type === 'dialogue') this._dialogues.splice(index, 1);
    else if (type === 'character') this._characters.splice(index, 1);
    else if (type === 'block') this._blocks.splice(index, 1);
    else if (type === 'event') this._events.splice(index, 1);
  }

  private _updateSelectedItem(input: HTMLInputElement) {
    const field = input.dataset.field;
    const screenField = input.dataset.screenField;
    const screenIdx = parseInt(input.dataset.screenIdx || '0');
    
    if (!this._selectedItem) return;
    const item = this._getSelectedItem();
    
    if (item && field) {
      // Old flat fields (for backwards compat)
      (item as any)[field] = input.value;
    }
    
    // Handle screen-specific fields
    if (item && screenField && this._selectedItem.type === 'dialogue') {
      const d = item as QuestDialogue;
      if (!d.screens) d.screens = [];
      if (d.screens[screenIdx]) {
        // Convert seconds to ms for storage if needed
        if (screenField === 'textSpeed' || screenField === 'duration') {
          (d.screens[screenIdx] as any)[screenField] = parseFloat(input.value) * 1000;
        } else {
          (d.screens[screenIdx] as any)[screenField] = input.value;
        }
      }
    }
  }

  private _saveState(state: any) {
    state.questDialogues = this._dialogues;
    state.questCharacters = this._characters;
    state.questBlocks = this._blocks;
    state.questEvents = this._events;
    
    // Persist to localStorage
    try {
      localStorage.setItem('questDialogues', JSON.stringify(this._dialogues));
      localStorage.setItem('questCharacters', JSON.stringify(this._characters));
      localStorage.setItem('questBlocks', JSON.stringify(this._blocks));
      localStorage.setItem('questEvents', JSON.stringify(this._events));
    } catch (e) {
      console.warn('[QuestPreview] Failed to save to localStorage:', e);
    }
  }

  private _showCurrentDialogue() {
    const d = this._dialogues[this._currentDialogueIndex];
    if (!d) return;

    const speakerEl = document.querySelector('.qp-speaker-name') as HTMLElement;
    const textEl = document.querySelector('.qp-text-preview') as HTMLElement;

    if (speakerEl) speakerEl.textContent = d.speaker;
    if (textEl) {
      this._textComplete = false;
      textEl.textContent = '';

      if (d.textAnimation === 'typewriter') {
        let i = 0;
        const speed = 1000 / (d.textSpeed || 50);
        this._typewriterInterval = window.setInterval(() => {
          textEl.textContent += d.text.charAt(i);
          i++;
          if (i >= d.text.length) {
            this._textComplete = true;
            clearInterval(this._typewriterInterval!);
          }
        }, speed);
      } else {
        textEl.textContent = d.text;
        this._textComplete = true;
      }
    }
  }

  private _updateLivePreview(_state: any) {
    if (!this._selectedItem || this._selectedItem.type !== 'dialogue') return;
    const d = this._dialogues[this._selectedItem.index];
    if (!d) return;

    // Update mini preview in editor panel
    const speakerEl = document.querySelector('.qp-speaker-name') as HTMLElement;
    const textEl = document.querySelector('.qp-text-preview') as HTMLElement;

    if (speakerEl) speakerEl.textContent = d.speaker;
    if (textEl) textEl.textContent = d.text || 'Digite o texto...';

    const charPlaceholder = document.querySelector('.qp-char-placeholder') as HTMLElement;
    if (charPlaceholder) {
      const posClass = { left: 'left:12%', center: 'left:50%;transform:translateX(-50%)', right: 'right:12%' }[d.speakerPosition] || 'left:50%;transform:translateX(-50%)';
      charPlaceholder.style.cssText = `position:absolute; bottom:50px; ${posClass}; width:60px; height:80px; background:rgba(0,0,0,0.5); border:2px dashed rgba(76,255,136,0.6); border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10;`;
    }

    // Show dialogue overlay on BIG PREVIEW (emulator layer) - both portrait and game modes
    this._showDialogueOverlayOnPreview(d);
  }

  private _updateLivePreviewNoRerender(d: QuestDialogue, screenIdx: number) {
    const preview = document.querySelector('.qp-preview-panel');
    if (!preview) return;

    const overlay = preview.querySelector('.qp-live-dialog-overlay');
    if (!overlay) return;

    const screen = d.screens?.[screenIdx];
    if (!screen) return;

    const charLayer = overlay.querySelector('.qp-char-layer') as HTMLElement;
    if (charLayer) {
      const img = charLayer.querySelector('img');
      const wrapper = charLayer.querySelector('.qp-char-wrapper');
      if (img) {
        img.style.width = (screen.assetWidth || 100) + '%';
        img.style.height = (screen.assetHeight || 100) + '%';
      }
      if (wrapper) {
        wrapper.style.alignItems = screen.assetVAlign || 'center';
        const offsetY = screen.assetVOffset || 0;
        wrapper.style.marginTop = offsetY + 'px';
        wrapper.style.marginBottom = (-offsetY) + 'px';
      }
    }

    console.log('[LivePreviewNoRerender] Updated - width:', screen.assetWidth, 'height:', screen.assetHeight, 'align:', screen.assetVAlign, 'offset:', screen.assetVOffset);
  }

  private _showDialogueOverlayOnPreview(d: QuestDialogue, screenIdx: number = 0) {
    const preview = document.querySelector('.qp-preview-panel') as HTMLElement;
    if (!preview) {
      console.log('[Play] Preview panel not found');
      return;
    }

    // Remove existing overlay if any
    const existingOverlay = preview.querySelector('.qp-live-dialog-overlay');
    if (existingOverlay) existingOverlay.remove();

    // Reset screen index
    this._currentScreenIndex = screenIdx;
    this._textComplete = false;

    // Get screen data
    const screens = d.screens || [];
    const currentScreen = screens[screenIdx] || {};
    const speaker = currentScreen.speaker || '';
    const fullText = currentScreen.text || '';
    const speakerPosition = currentScreen.speakerPosition || 'center';
    const textAnimation = currentScreen.textAnimation || 'typewriter';
    const textSpeed = currentScreen.textSpeed || 50;
    const duration = currentScreen.duration || 2000;
    const speakerAsset = currentScreen.speakerAsset || '';
    const voiceAsset = currentScreen.voiceAsset || '';

    // Use custom style colors or defaults
    const style = d.style || {};
    const bgColor = style.bgColor || '#1a1a2e';
    const charColor = style.charColor || '#4cff88';
    const textColor = style.textColor || '#ffffff';
    const speakerColor = style.speakerColor || '#a78bfa';
    const glowBase = style.glowColor || '#ffffff';
    const glowIntensity = parseInt(style.glowIntensity || '90');
    const glowStartPercent = parseInt(style.glowStartPercent || '15') / 100;
    const glowEndPercent = parseInt(style.glowEndPercent || '70') / 100;
    
    // Options (up to 3)
    const options = d.options || [];
    const hasOptions = options.length > 0 && screenIdx >= screens.length - 1;
    
    const optionsHtml = hasOptions ? `
      <div style="display:flex; justify-content:space-between; gap:10px; margin-top:16px;">
        ${options.map((opt, i) => `
          <div class="qp-option-btn" data-opt-idx="${i}" style="flex:1; padding:12px 8px; background:rgba(255,255,255,0.95); border:3px solid #000; border-radius:8px; text-align:center; cursor:pointer; transition:all 0.15s;">
              <span style="color:#000; font-size:0.5rem; font-weight:700; text-transform:uppercase;">${opt.text || `Option ${i + 1}`}</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    // Determine if we can continue - show continue button on last screen too (to go to next dialogue)
    const continueButtonHtml = `
      <div class="qp-continue-btn" style="text-align:center; margin-top:20px; pointer-events:auto; cursor:pointer; opacity:0; transition:opacity 0.3s;">
        <span style="color:${textColor}; font-size:0.6rem; font-weight:700; text-transform:uppercase; text-decoration:underline;">CONTINUAR..</span>
      </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'qp-live-dialog-overlay';
    overlay.style.cssText = `
      position:absolute; inset:0; z-index:100;
    `;
    
    overlay.innerHTML = `
      <!-- Character Layer - full screen background with custom positioning -->
      <div class="qp-char-layer" style="position:absolute; inset:0; display:flex; align-items:${currentScreen.assetVAlign || 'center'}; justify-content:center; transform:translateX(-100%); animation:qpSlideIn 0.3s ease-out forwards;">
        <div class="qp-char-wrapper" style="width:100%; height:100%; display:flex; align-items:${currentScreen.assetVAlign || 'center'}; justify-content:center; overflow:hidden; margin-top:${currentScreen.assetVOffset || 0}px; margin-bottom:${-(currentScreen.assetVOffset || 0)}px;">
          ${speakerAsset 
            ? `<img src="${speakerAsset}" style="width:${currentScreen.assetWidth || 100}%; height:${currentScreen.assetHeight || 100}%; object-fit:contain; object-position:center;">`
            : `<div style="width:70%; height:90%; background:linear-gradient(180deg, ${charColor}88 0%, ${charColor}55 100%); border-radius:50% 50% 0 0; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 40px ${charColor}66;">
                <span style="color:#fff; font-size:1.5rem; font-weight:900; text-transform:uppercase;">${speaker?.substring(0,2).toUpperCase() || '??'}</span>
               </div>`
          }
        </div>
      </div>
      
      <!-- Gradient Overlay - forte embaixo, transparente em cima -->
      <div style="position:absolute; bottom:0; left:0; width:100%; height:100%; pointer-events:none;">
        <div style="position:absolute; bottom:0; left:0; width:100%; height:${Math.round(glowEndPercent * 100)}%; background:linear-gradient(to top, 
          ${glowBase}${Math.round(glowIntensity).toString(16).padStart(2,'0')} 0%,
          ${glowBase}${Math.round(glowIntensity * 0.9).toString(16).padStart(2,'0')} 20%,
          ${glowBase}${Math.round(glowIntensity * 0.7).toString(16).padStart(2,'0')} 40%,
          ${glowBase}${Math.round(glowIntensity * 0.4).toString(16).padStart(2,'0')} 60%,
          ${glowBase}${Math.round(glowIntensity * 0.15).toString(16).padStart(2,'0')} 80%,
          transparent 100%
        );"></div>
      </div>
      
      <!-- Dialogue Content Area - higher position -->
      <div style="position:absolute; bottom:15%; left:0; width:100%; display:flex; flex-direction:column; align-items:center; padding:0 5%; box-sizing:border-box;">
        
        <!-- Speaker Name - centered -->
        <div style="margin-bottom:8px; width:90%; text-align:center;">
          <span style="color:${speakerColor}; font-size:0.7rem; font-weight:700; font-style:italic; text-transform:uppercase; text-decoration:underline;">${speaker || 'SPEAKER'}</span>
        </div>
        
        <!-- Dialogue Box -->
        <div style="width:90%; text-align:center;">
          <div class="qp-dialog-text" style="color:${textColor}; font-size:0.8rem; font-style:italic; text-transform:uppercase; line-height:1.3; letter-spacing:0.5px; min-height:1.3em;"></div>
          
          <!-- Options (up to 3) -->
          ${optionsHtml}
          
          <!-- Continue Button -->
          ${continueButtonHtml}
        </div>
      </div>
        
        <!-- Screen indicator -->
        <div style="position:absolute; top:8px; right:8px; padding:4px 8px; background:rgba(167,139,250,0.3); border-radius:4px;">
          <span style="color:#a78bfa; font-size:0.35rem;">TELA ${screenIdx + 1}/${screens.length}</span>
        </div>
      </div>
    `;
    
    // Add animation keyframes
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      @keyframes qpSlideIn {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .qp-option-btn:hover { transform: scale(1.05); background: #fff !important; }
      .qp-option-btn:active { transform: scale(0.95); }
      .qp-continue-btn:hover { opacity: 0.8; }
    `;
    overlay.appendChild(styleEl);
    
    // Play voice asset if exists
    let soundDuration = 0;
    let currentAudio: HTMLAudioElement | null = null;
    if (voiceAsset) {
      try {
        currentAudio = new Audio(voiceAsset);
        currentAudio.volume = 0.5;
        currentAudio.play().catch(e => console.log('[Sound] Play error:', e));
        soundDuration = Math.max(currentAudio.duration || 0, 2) * 1000;
        console.log('[Sound] Playing:', voiceAsset, 'duration:', soundDuration, 'ms');
      } catch(e) {
        console.log('[Sound] Error creating audio:', e);
      }
    }
    
    // Handle text animation - starts AFTER image slides in (0.3s delay)
    const textEl = overlay.querySelector('.qp-dialog-text') as HTMLElement;
    
    const showContinue = () => {
      const continueBtn = overlay.querySelector('.qp-continue-btn') as HTMLElement;
      if (continueBtn) continueBtn.style.opacity = '1';
      this._textComplete = true;
    };
    
    if (textAnimation === 'typewriter') {
      // Typewriter effect - starts after 0.4s (image takes 0.3s to slide in)
      // If there's a sound, text should complete around the same time as sound
      const startDelay = 400;
      const targetDuration = soundDuration > 0 ? Math.max(soundDuration - 600, 500) : 0;
      const charDelay = targetDuration > 0 && fullText.length > 0 
        ? Math.min(50, targetDuration / fullText.length) 
        : 50;
      let charIndex = 0;
      
      // Start with empty text
      textEl.textContent = '';
      
      // Wait for image to slide in, then start typing
      setTimeout(() => {
        if (!fullText) {
          showContinue();
          return;
        }
        
        const typeInterval = setInterval(() => {
          if (charIndex < fullText.length) {
            textEl.textContent = fullText.substring(0, charIndex + 1);
            charIndex++;
          } else {
            clearInterval(typeInterval);
            showContinue();
          }
        }, charDelay);
        
        // Allow skip on click anywhere in overlay - also stops sound
        const skipHandler = () => {
          clearInterval(typeInterval);
          textEl.textContent = fullText;
          if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
          }
          showContinue();
          overlay.removeEventListener('click', skipHandler);
        };
        overlay.addEventListener('click', skipHandler);
      }, startDelay);
    } else if (textAnimation === 'fade') {
      textEl.style.opacity = '0';
      textEl.style.transition = `opacity ${textSpeed}s ease-in`;
      textEl.textContent = fullText;
      
      setTimeout(() => {
        textEl.style.opacity = '1';
        setTimeout(showContinue, 300);
      }, 50);
    } else {
      // none - show immediately
      textEl.textContent = fullText;
      showContinue();
    }
    
    // Add click handlers for Continue and Options
    setTimeout(() => {
      overlay.querySelector('.qp-continue-btn')?.addEventListener('click', () => {
        this._goToNextScreen(d);
      });
      
      overlay.querySelectorAll('.qp-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const optIdx = parseInt((btn as HTMLElement).dataset.optIdx || '0');
          this._handleOptionClick(optIdx);
        });
      });
    }, 0);
    
    preview.appendChild(overlay);
  }
  
  private _goToNextDialogue() {
    if (this._selectedItem && this._selectedItem.type === 'dialogue') {
      const currentIdx = this._selectedItem.index;
      if (currentIdx < this._dialogues.length - 1) {
        this._selectedItem = { type: 'dialogue', index: currentIdx + 1 };
        const d = this._dialogues[this._selectedItem.index];
        this._showDialogueOverlayOnPreview(d, 0);
      } else {
        this._hideDialogueOverlayOnPreview();
      }
    }
  }
  
  private _goToNextScreen(d: QuestDialogue) {
    const screens = d.screens || [];
    const nextIdx = this._currentScreenIndex + 1;
    
    if (nextIdx < screens.length) {
      // Has more screens in this dialogue - show next screen
      this._showDialogueOverlayOnPreview(d, nextIdx);
    } else {
      // Last screen of this dialogue - just close (don't auto-continue to next dialogue)
      this._hideDialogueOverlayOnPreview();
    }
  }
  
  private _handleOptionClick(optIdx: number) {
    if (!this._selectedItem || this._selectedItem.type !== 'dialogue') return;
    const d = this._dialogues[this._selectedItem.index];
    if (!d.options || !d.options[optIdx]) return;
    
    const opt = d.options[optIdx];
    
    if (opt.nextDialogueId) {
      const nextIdx = this._dialogues.findIndex(x => x.id === opt.nextDialogueId);
      if (nextIdx >= 0) {
        this._selectedItem = { type: 'dialogue', index: nextIdx };
        const nextD = this._dialogues[nextIdx];
        this._showDialogueOverlayOnPreview(nextD, 0);
      }
    } else if (opt.nextEventId) {
      console.log('Trigger event:', opt.nextEventId);
    }
  }

  private _hideDialogueOverlayOnPreview() {
    // Stop any playing audio
    document.querySelectorAll('audio').forEach(a => a.pause());
    const overlay = document.querySelector('.qp-live-dialog-overlay');
    if (overlay) overlay.remove();
  }

  private _skipAnimation() {
    const d = this._dialogues[this._currentDialogueIndex];
    if (!d) return;
    if (this._typewriterInterval) { clearInterval(this._typewriterInterval); this._typewriterInterval = null; }
    const textEl = document.querySelector('.qp-text-preview') as HTMLElement;
    if (textEl) textEl.textContent = d.text;
    this._textComplete = true;
  }

  private _nextDialogue() {
    if (this._currentDialogueIndex < this._dialogues.length - 1) {
      this._currentDialogueIndex++;
      this._showCurrentDialogue();
    }
  }

  public rerender(state: any) {
    if (this._container) {
      this._container.innerHTML = this.render(state);
      this.bind(this._container, state);
    }
  }

  private _renderLists(): string {
    const renderList = (items: any[], type: string) => items.map((item: any, i: number) => {
      const dialogueName = item.name || item.screens?.[0]?.speaker || 'Dialogue';
      const dialogueText = item.screens?.[0]?.text || '...';
      const screenCount = item.screens?.length || 1;
      
      return `
      <div class="qp-list-item" data-type="${type}" data-index="${i}" style="
        padding:10px 12px; margin:4px 0; background:rgba(255,255,255,0.03); 
        border:1px solid ${this._selectedItem?.type === type && this._selectedItem?.index === i ? '#a78bfa' : 'rgba(255,255,255,0.08)'}; 
        border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:10px; transition:all 0.2s;
      ">
        <span style="font-size:0.9rem;">💬</span>
        <div style="flex:1;">
          <div style="color:#fff; font-size:0.55rem; font-weight:700;">${dialogueName}</div>
          <div style="color:#555; font-size:0.4rem;">${dialogueText?.substring(0, 30) || '...'} ${screenCount > 1 ? `📱 ${screenCount}` : ''} ${item.options?.length ? `🔀 ${item.options.length}` : ''}</div>
        </div>
        <button class="qp-delete-btn" data-type="${type}" data-index="${i}" style="padding:4px 8px; background:rgba(255,51,102,0.1); border:1px solid rgba(255,51,102,0.3); border-radius:4px; color:#ff3366; font-size:0.5rem; cursor:pointer;">✕</button>
      </div>
    `}).join('') || `<div style="color:#444; font-size:0.5rem; padding:10px;">Nenhum diálogo</div>`;

    return `
      <div class="qp-list-section" style="flex:1; background:rgba(255,255,255,0.02); border-radius:8px; padding:8px; overflow-y:auto; border:1px solid rgba(167,139,250,0.15);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="color:#a78bfa; font-size:0.5rem; font-weight:900;">💬 DIÁLOGOS</span>
          <button class="qp-add-btn" data-type="dialogue" style="padding:4px 8px; background:rgba(167,139,250,0.15); border:1px solid rgba(167,139,250,0.3); border-radius:4px; color:#a78bfa; font-size:0.45rem; cursor:pointer;">＋</button>
        </div>
        ${renderList(this._dialogues, 'dialogue')}
      </div>
    `;
  }

  private _renderNodeCanvas(): string {
    return `
      <div style="flex:1; background:#0d0d12; border-radius:8px; border:1px solid rgba(76,255,136,0.3); overflow:hidden; position:relative;">
        <canvas id="qp-node-canvas" style="width:100%; height:100%;"></canvas>
        <div style="position:absolute; top:8px; left:8px; display:flex; gap:6px;">
          <span style="color:#4cff88; font-size:0.4rem; padding:4px 8px; background:rgba(76,255,136,0.15); border-radius:4px;">🔗 Arraste nós para conectar</span>
          <span style="color:#a78bfa; font-size:0.4rem; padding:4px 8px; background:rgba(167,139,250,0.15); border-radius:4px;">💬 Diálogos: ${this._dialogues.length}</span>
        </div>
      </div>
    `;
  }

  private _initNodeEditor() {
    const canvas = document.getElementById('qp-node-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    this._nodeCanvas = canvas;
    this._nodeCtx = canvas.getContext('2d');

    this._nodePositions.clear();
    this._dialogues.forEach((d, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      this._nodePositions.set(d.id, { x: 80 + col * 120, y: 80 + row * 100 });
    });

    this._startNodeRenderLoop();
  }

  private _startNodeRenderLoop() {
    const render = () => {
      if (!this._nodeCanvas || !this._nodeCtx) return;
      const ctx = this._nodeCtx;
      const canvas = this._nodeCanvas;
      const cw = canvas.parentElement?.clientWidth || 400;
      const ch = canvas.parentElement?.clientHeight || 300;
      
      if (canvas.width !== cw * 2 || canvas.height !== ch * 2) {
        canvas.width = cw * 2; canvas.height = ch * 2;
      }

      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.fillStyle = '#0d0d12';
      ctx.fillRect(0, 0, cw, ch);

      // Draw connections first
      ctx.strokeStyle = 'rgba(167,139,250,0.5)';
      ctx.lineWidth = 2;
      this._dialogues.forEach(d => {
        if (d.options) {
          d.options.forEach(opt => {
            if (opt.nextDialogueId) {
              const from = this._nodePositions.get(d.id);
              const to = this._nodePositions.get(opt.nextDialogueId);
              if (from && to) {
                ctx.beginPath();
                ctx.moveTo(from.x + 40, from.y + 30);
                ctx.lineTo(to.x + 40, to.y + 30);
                ctx.stroke();
              }
            }
          });
        }
      });

      // Draw nodes
      this._dialogues.forEach((d, idx) => {
        const pos = this._nodePositions.get(d.id);
        if (!pos) return;

        const isSelected = this._selectedItem?.type === 'dialogue' && this._selectedItem?.index === idx;
        const nodeW = 80, nodeH = 60;

        // Node body
        ctx.fillStyle = isSelected ? 'rgba(167,139,250,0.4)' : 'rgba(167,139,250,0.2)';
        ctx.strokeStyle = isSelected ? '#a78bfa' : 'rgba(167,139,250,0.5)';
        ctx.lineWidth = 2;
        
        this._roundRect(ctx, pos.x, pos.y, nodeW, nodeH, 8);
        ctx.fill();
        ctx.stroke();

        // Speaker name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.speaker?.substring(0, 8) || '??', pos.x + nodeW/2, pos.y + 20);

        // Text preview
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '6px sans-serif';
        ctx.fillText(d.text?.substring(0, 12) + '...', pos.x + nodeW/2, pos.y + 40);

        // Option connectors
        const options = d.options || [];
        if (options.length > 0) {
          options.forEach((opt, optIdx) => {
            const connectorY = pos.y + nodeH + 10 + optIdx * 15;
            ctx.fillStyle = '#4cff88';
            ctx.beginPath();
            ctx.arc(pos.x + nodeW/2, connectorY, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '5px sans-serif';
            ctx.fillText(opt.text?.substring(0, 8) || '?', pos.x + nodeW/2 + 10, connectorY + 2);
          });
        } else {
          // Default connector
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.beginPath();
          ctx.arc(pos.x + nodeW/2, pos.y + nodeH + 5, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      this._animId = requestAnimationFrame(render);
    };

    this._animId = requestAnimationFrame(render);
  }

  private _roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private _showAssetPopup(type: 'image' | 'sound') {
    const questAssets = this._state?.questAssets || [];
    const availableCards = this._state?.availableCards || [];
    const availableSounds = this._state?.availableSounds || [];
    const questSounds = this._state?.questSounds || [];
    
    const title = type === 'image' ? '🖼️ SELECIONAR IMAGEM' : '🔊 SELECIONAR SOM';
    const field = type === 'image' ? 'speakerAsset' : 'voiceAsset';
    
    // Categorias iguais ao AssetLibraryPanel
    const categories = type === 'image' ? [
      { id: 'all', label: '🌌', name: 'Todos' },
      { id: 'ambiente', label: '🌲', name: 'Ambiente' },
      { id: 'edificio', label: '🏠', name: 'Edifícios' },
      { id: 'personagem', label: '👤', name: 'Personagens' },
      { id: 'inimigo', label: '👹', name: 'Inimigos' },
      { id: 'objeto', label: '📦', name: 'Objetos' },
      { id: 'interativo', label: '🔘', name: 'Interativos' },
      { id: 'decoracao', label: '✨', name: 'Decoração' },
    ] : [
      { id: 'all', label: '🎵', name: 'Todos' },
      { id: 'musica', label: '🎶', name: 'Música' },
      { id: 'sfx', label: '💥', name: 'SFX' },
      { id: 'voz', label: '🎤', name: 'Voz' },
      { id: 'ambiente', label: '🌲', name: 'Ambiente' },
    ];
    
    // Remove any existing popup first
    document.querySelector('.qp-asset-overlay')?.remove();
    
    const assets = type === 'image' 
      ? [...questAssets, ...availableCards]
      : [...questSounds, ...availableSounds];
    
    const popupHtml = `
      <div class="qp-asset-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.9);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.2s ease-out;
      ">
        <div class="qp-asset-popup" style="
          background: linear-gradient(180deg, #0d0d15 0%, #151520 100%);
          border: 1px solid rgba(255,215,0,0.2);
          border-radius: 16px;
          width: 92%;
          max-width: 900px;
          max-height: 85vh;
          display:flex;
          flex-direction:column;
          box-shadow: 0 20px 80px rgba(0,0,0,0.8), 0 0 40px rgba(255,215,0,0.1);
        ">
          <!-- HEADER com modo -->
          <div style="padding:15px 20px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:15px;">
               <h2 style="color:#ffd700; margin:0; font-size:0.85rem; letter-spacing:1px; font-weight:900;">${title}</h2>
               <div style="display:flex; background:rgba(0,0,0,0.4); border-radius:8px; padding:3px;">
                 <button class="qp-mode-tab active" data-mode="quest" style="
                   padding:5px 12px; font-size:0.55rem; font-weight:800; border-radius:5px; border:none; cursor:pointer;
                   background:rgba(81,197,255,0.2); color:#51c5ff;
                 ">QUEST</button>
                 <button class="qp-mode-tab" data-mode="geral" style="
                   padding:5px 12px; font-size:0.55rem; font-weight:800; border-radius:5px; border:none; cursor:pointer;
                   background:transparent; color:#666;
                 ">GERAL</button>
               </div>
            </div>
            <button class="qp-close-asset" style="
              background: rgba(255,255,255,0.05);
              border: 1px solid rgba(255,255,255,0.1);
              color: #666;
              cursor: pointer;
              font-size: 1rem;
              padding: 6px 10px;
              border-radius: 6px;
            ">✕</button>
          </div>
          
          <!-- TOOLBAR: Busca + Import -->
          <div style="padding:12px 20px; display:flex; gap:12px; border-bottom:1px solid rgba(255,255,255,0.05); flex-shrink:0;">
            <div style="flex:1; position:relative;">
              <input type="text" class="qp-search-input" placeholder="🔍 Buscar ${type === 'image' ? 'imagens' : 'sounds'}..." style="
                width:100%; padding:10px 12px 10px 35px;
                background:rgba(0,0,0,0.5);
                border:1px solid rgba(255,255,255,0.1);
                border-radius:8px;
                color:#fff; font-size:0.7rem; outline:none;
              ">
              <span style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#444; font-size:0.8rem;">🔍</span>
            </div>
            <button class="qp-import-btn" style="
              padding:10px 18px;
              background: linear-gradient(135deg, rgba(81,197,255,0.2) 0%, rgba(81,197,255,0.05) 100%);
              border: 1px solid rgba(81,197,255,0.4);
              border-radius: 8px;
              color: #51c5ff;
              font-size:0.65rem;
              font-weight:800;
              cursor:pointer;
              white-space:nowrap;
            ">📁 IMPORTAR</button>
            <input type="file" class="qp-file-input" accept="${type === 'image' ? 'image/*' : 'audio/*'}" multiple style="display:none;">
          </div>
          
          <!-- CATEGORIAS HORIZONTAIS -->
          <div style="display:flex; gap:6px; padding:10px 20px; overflow-x:auto; scrollbar-width:none; border-bottom:1px solid rgba(255,255,255,0.05); flex-shrink:0;">
            ${categories.map(c => `
              <button class="qp-cat-btn" data-cat="${c.id}" style="
                flex-shrink:0; min-width:45px; padding:6px 10px;
                border:1px solid rgba(255,255,255,0.1);
                background:transparent;
                color:#555;
                border-radius:6px; font-size:0.5rem; font-weight:800; cursor:pointer;
                display:flex; flex-direction:column; align-items:center; gap:2px;
              ">
                <span style="font-size:0.9rem;">${c.label}</span>
              </button>
            `).join('')}
          </div>
          
          <!-- Info bar -->
          <div style="padding:8px 20px; background:rgba(0,0,0,0.3); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
            <span class="qp-category-name" style="font-size:0.55rem; color:#888; font-weight:900; letter-spacing:1px;">TODOS</span>
            <span class="qp-asset-count" style="font-size:0.5rem; color:#444;">${assets.length} items</span>
          </div>
          
          <!-- GRID de assets -->
          <div class="qp-assets-grid" style="
            flex:1;
            display:grid;
            grid-template-columns: repeat(${type === 'image' ? 6 : 5}, 1fr);
            gap:8px;
            padding:15px 20px;
            overflow-y:auto;
          ">
            ${assets.length === 0 ? `
              <div style="grid-column:1/-1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:50px; opacity:0.3;">
                 <div style="font-size:2rem; margin-bottom:15px;">📦</div>
                 <div style="font-size:0.75rem; color:#666;">Nenhum ${type === 'image' ? 'asset' : 'som'} disponível</div>
                 <div style="font-size:0.65rem; color:#444; margin-top:8px;">Importe do PC para começar</div>
              </div>
            ` : assets.map((url: string, i: number) => `
              <div class="qp-asset-select" data-asset="${url}" data-field="${field}" data-idx="${i}" style="
                aspect-ratio: 1;
                border-radius: 10px;
                overflow: hidden;
                cursor: pointer;
                border: 2px solid transparent;
                transition: all 0.15s;
                background: #0a0a12;
                position:relative;
              " onmouseover="this.style.borderColor='#ffd700'; this.style.transform='scale(1.03)'" onmouseout="this.style.borderColor='transparent'; this.style.transform='scale(1)'">
                ${type === 'image' 
                  ? `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`
                  : `
                    <div class="qp-sound-item" data-sound="${url}" style="
                      width:100%; height:100%; 
                      display:flex; 
                      align-items:center; 
                      justify-content:center; 
                      flex-direction:column; 
                      background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%);
                      color:#51c5ff;
                      position:relative;
                    ">
                      <div style="
                        width:36px; height:36px;
                        border-radius:50%;
                        background: linear-gradient(135deg, #51c5ff33, #51c5ff11);
                        border: 2px solid rgba(81,197,255,0.3);
                        display:flex; align-items:center; justify-content:center;
                        margin-bottom:6px;
                      ">
                        <span style="font-size:0.9rem;">🎵</span>
                      </div>
                      <span style="font-size:0.4rem; color:#666; max-width:85%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${url.split('/').pop()?.substring(0,15) || 'som'}
                      </span>
                      <button class="qp-preview-sound" style="
                        position:absolute;
                        top:50%; left:50%;
                        transform:translate(-50%,-50%);
                        width:32px; height:32px;
                        border-radius:50%;
                        background: linear-gradient(135deg, #51c5ff, #3a9bc5);
                        border:none;
                        color:#fff;
                        font-size:0.6rem;
                        cursor:pointer;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        box-shadow: 0 4px 12px rgba(81,197,255,0.4);
                      ">▶</button>
                    </div>
                  `
                }
              </div>
            `).join('')}
          </div>
          
          <!-- Footer -->
          <div style="padding:10px 20px; border-top:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.5rem; color:#444;">Selecione um item</span>
            <span style="font-size:0.5rem; color:#444;">Arraste ou importe para adicionar</span>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', popupHtml);
    
    // Bind events
    document.querySelector('.qp-close-asset')?.addEventListener('click', () => {
      document.querySelector('.qp-asset-overlay')?.remove();
    });
    
    document.querySelector('.qp-asset-overlay')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('qp-asset-overlay')) {
        document.querySelector('.qp-asset-overlay')?.remove();
      }
    });
    
    // Mode tabs (Quest/Geral)
    document.querySelectorAll('.qp-mode-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.qp-mode-tab').forEach(b => {
          (b as HTMLElement).style.background = 'transparent';
          (b as HTMLElement).style.color = '#666';
        });
        (btn as HTMLElement).style.background = 'rgba(81,197,255,0.2)';
        (btn as HTMLElement).style.color = '#51c5ff';
        // TODO: filtrar por modo
      });
    });
    
    // Category buttons
    document.querySelectorAll('.qp-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.qp-cat-btn').forEach(b => {
          (b as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
          (b as HTMLElement).style.color = '#555';
          (b as HTMLElement).style.background = 'transparent';
        });
        (btn as HTMLElement).style.borderColor = '#ffd700';
        (btn as HTMLElement).style.color = '#ffd700';
        (btn as HTMLElement).style.background = 'rgba(255,215,0,0.1)';
        
        const catName = (btn as HTMLElement).querySelector('span')?.textContent || 'TODOS';
        document.querySelector('.qp-category-name')!.textContent = catName;
        // TODO: filtrar por categoria
      });
    });
    
    // Search input
    document.querySelector('.qp-search-input')?.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase();
      let visibleCount = 0;
      document.querySelectorAll('.qp-asset-select').forEach(item => {
        const url = (item as HTMLElement).dataset.asset || '';
        const matches = url.toLowerCase().includes(query);
        (item as HTMLElement).style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
      });
      document.querySelector('.qp-asset-count')!.textContent = `${visibleCount} items`;
    });
    
    // Preview sound
    document.querySelectorAll('.qp-preview-sound').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const soundUrl = (btn as HTMLElement).parentElement?.querySelector('.qp-sound-item')?.getAttribute('data-sound') 
          || (btn as HTMLElement).closest('.qp-asset-select')?.getAttribute('data-asset');
        if (soundUrl) {
          const audio = new Audio(soundUrl);
          audio.volume = 0.5;
          audio.play().catch(console.log);
        }
      });
    });
    
    // Import
    const importBtn = document.querySelector('.qp-import-btn');
    const fileInput = document.querySelector('.qp-file-input') as HTMLInputElement;
    importBtn?.addEventListener('click', () => fileInput?.click());
    
    fileInput?.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      
      for (const file of Array.from(files)) {
        const url = URL.createObjectURL(file);
        
        if (type === 'image') {
          if (!this._state.questAssets) this._state.questAssets = [];
          if (!this._state.questAssets.includes(url)) {
            this._state.questAssets.push(url);
            const grid = document.querySelector('.qp-assets-grid');
            if (grid) {
              const newCard = document.createElement('div');
              newCard.className = 'qp-asset-select';
              newCard.setAttribute('data-asset', url);
              newCard.setAttribute('data-field', field);
              newCard.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`;
              newCard.style.cssText = 'aspect-ratio:1; border-radius:10px; overflow:hidden; cursor:pointer; border:2px solid transparent; transition:all 0.15s;';
              newCard.onmouseover = function() { (this as HTMLElement).style.borderColor = '#ffd700'; (this as HTMLElement).style.transform = 'scale(1.03)'; };
              newCard.onmouseout = function() { (this as HTMLElement).style.borderColor = 'transparent'; (this as HTMLElement).style.transform = 'scale(1)'; };
              grid.appendChild(newCard);
            }
          }
        } else {
          if (!this._state.questSounds) this._state.questSounds = [];
          if (!this._state.questSounds.includes(url)) this._state.questSounds.push(url);
        }
      }
      
      const newCount = type === 'image' ? this._state.questAssets.length : this._state.questSounds.length;
      document.querySelector('.qp-asset-count')!.textContent = `${newCount} items`;
    });
    
    // Select asset
    setTimeout(() => {
      document.querySelectorAll('.qp-asset-select').forEach(item => {
        item.addEventListener('click', () => {
          const assetUrl = (item as HTMLElement).dataset.asset;
          const screenIdx = this._selectedScreenIndex || 0;
          
          console.log('[AssetPopup] Selected:', assetUrl, 'field:', field, 'screenIdx:', screenIdx);
          
          // Update input directly in DOM
          const inputs = document.querySelectorAll('.qp-edit-input');
          let inputUpdated = false;
          inputs.forEach(inp => {
            const el = inp as HTMLInputElement;
            if (el.dataset.screenField === field && el.dataset.screenIdx === String(screenIdx)) {
              el.value = assetUrl || '';
              inputUpdated = true;
              console.log('[AssetPopup] Input updated:', el.value);
            }
          });
          
          // Update data in memory
          if (this._selectedItem && this._selectedItem.type === 'dialogue') {
            const d = this._dialogues[this._selectedItem.index];
            if (d && d.screens && d.screens[screenIdx]) {
              (d.screens[screenIdx] as any)[field] = assetUrl;
              console.log('[AssetPopup] Data updated');
            }
          }
          
          // Close popup
          document.querySelector('.qp-asset-overlay')?.remove();
          
          // Trigger live preview update
          this._saveState(this._state || {});
          this._updateLivePreview(this._state || {});
        });
      });
    }, 100);
  }
}
