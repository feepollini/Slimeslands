import { BoardScreen } from '../BoardScreen';
import { TabCards } from './tabs/TabCards';
import { TabAbilities } from './tabs/TabAbilities';
import { TabAssets } from './tabs/TabAssets';
import { TabScenarios } from './tabs/TabScenarios';
import { TabConfig } from './tabs/TabConfig';
import { TabArtefatos } from './tabs/TabArtefatos';
import { TabStore, normalizeStoreData } from './tabs/TabStore';
import { TabPacks } from './tabs/TabPacks';
import { TabQuestMaker } from './tabs/TabQuestMaker';
import { QuestMakerHub } from './tabs/quest_maker/QuestMakerHub';
import { SoundCentralScreen } from './tabs/SoundCentralScreen';
import { TabMobbys } from './tabs/TabMobbys';
import { TabMatrix } from './tabs/TabMatrix';
import { TabDecks } from './tabs/TabDecks';
import { ForgeCore } from './core/ForgeCore';

export class ForgeApp {
  private container: HTMLElement;
  private currentMode: 'cardengine' | 'arsenal' | 'comercial' | 'decks' | 'matrix' | 'cards' | 'habilidades' | 'artefatos' | 'assets' | 'scenarios' | 'store' | 'packs' | 'config' | 'sounds' | 'questmaker' | 'mobbys' | 'markerdream' = 'cardengine';
  private cardEngineSubMode: 'decks' | 'matrix' = 'decks';
  private arsenalSubMode: 'passivas' | 'ativas' = 'passivas';
  private comercialSubMode: 'store' | 'config' = 'store';
  private tabMatrix: TabMatrix | null = null;
  private tabDecks: TabDecks | null = null;
  private tabAssets: TabAssets | null = null;
  private tabPacks: TabPacks | null = null;
  private selectedIndex: number = 0;
  private habilidadesSelectedIndex: number = 0;
  private artefatosSelectedIndex: number = 0;
  private storeSelectedIndex: number = 0;
  private scenariosSelectedIndex: number = 0;
  private assetsSelectedCategory: string = 'all';
  private assetsSelectedAssets: Set<string> = new Set();
  private soundSubMode: 'library' | 'actions' | 'screens' = 'library';
  private questsSelectedIndex: number = 0;
  private packsSelectedIndex: number = 0;

  private cardSubMode: 'quick' | 'avancado' | 'aparencia' | 'estetica' | 'efeitos' | 'verso' = 'quick';
  private previewMode: 'static' | 'video' = 'static';
  private questSubMode: 'worldmap' | 'creator' | 'assets' | 'scenes' = 'worldmap';
  private questAssets: string[] = [];
  private worldMapCurrentTabIdx: number = 0;
  private questAssetsMode: 'quest' | 'general' = 'quest';
  private isAssetsPopupOpen: boolean = false;

  private templates: any[] = [];
  private abilities: any[] = [];
  private skills: any[] = [];
  private scenarios: any = {};
  private storeItems: any = {};
  private assetRegistry: any = {};
  private rarities: any = {};
  private availableCards: string[] = [];
  private availableSounds: string[] = [];
  private soundsData: any = null;
  private classes: any[] = [];
  private customSpritePacks: any[] = [];
  private customGallerySprites: any[] = [];
  private selectedClassIds: Set<number> = new Set();
  private quickFilter: { class: string, rarity: string, search: string } = { class: '', rarity: '', search: '' };

  private core: ForgeCore;
  private boardRenderer: BoardScreen;
  private onExit: () => void;
  private soundCentral: SoundCentralScreen | null = null;
  private tabQuestMaker: TabQuestMaker | null = null;
  private scenarioClipboard: any = null;

  constructor(container: HTMLElement, initialState: any, callbacks: any) {
    this.container = container;
    this.onExit = callbacks.onExit;
    // Note: We instantiate BoardScreen but provide it an empty or mock game state since editor just renders isolated cards.
    this.boardRenderer = new BoardScreen(); 

    // Initialize State
    this.templates = initialState.templates || [];
    this.abilities = initialState.abilities || [];
    this.skills = initialState.skills || [];
    this.scenarios = initialState.scenarios || {};
    this.storeItems = normalizeStoreData(initialState.storeItems);
    this.assetRegistry = initialState.assetRegistry || {};
    this.rarities = initialState.rarities || {};
    this.availableCards = initialState.availableCards || [];
    this.availableSounds = initialState.availableSounds || [];
    this.soundsData = initialState.soundsData || null;
    this.classes = initialState.classes && initialState.classes.length > 0 ? initialState.classes : [
      { "id": "tank", "name": "Tank", "icon": "🛡️", "color": "#95a5a6" },
      { "id": "suporte", "name": "Suporte", "icon": "💚", "color": "#2ecc71" },
      { "id": "atirador", "name": "Atirador", "icon": "🏹", "color": "#f1c40f" },
      { "id": "assassino", "name": "Assassino", "icon": "🔪", "color": "#e74c3c" },
      { "id": "mago", "name": "Mago", "icon": "✨", "color": "#9b59b6" },
      { "id": "elementar", "name": "Elementar", "icon": "🔥", "color": "#e67e22" },
      { "id": "ilusionista", "name": "Ilusionista", "icon": "🔮", "color": "#3498db" },
      { "id": "guerreiro", "name": "Guerreiro", "icon": "⚔️", "color": "#d35400" },
      { "id": "criatura", "name": "Criatura", "icon": "🐾", "color": "#27ae60" },
      { "id": "monstro", "name": "Monstro", "icon": "👹", "color": "#c0392b" }
    ];
    this.customSpritePacks = initialState.customSpritePacks || [];
    this.customGallerySprites = initialState.customGallerySprites || [];

    this.core = new ForgeCore(container, (msg, col) => this.showToast(msg, col));
    
    // Restore Persistence
    const saved = localStorage.getItem('forge_v2_persistence');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.cardEngineSubMode) this.cardEngineSubMode = data.cardEngineSubMode;
        if (data.arsenalSubMode) this.arsenalSubMode = data.arsenalSubMode;
        if (data.comercialSubMode) this.comercialSubMode = data.comercialSubMode;
        if (data.currentMode) {
          if (data.currentMode === 'decks' || data.currentMode === 'matrix' || data.currentMode === 'cards') {
            this.currentMode = 'cardengine';
            if (data.currentMode === 'matrix' || data.currentMode === 'cards') this.cardEngineSubMode = 'matrix';
            else this.cardEngineSubMode = 'decks';
          } else if (data.currentMode === 'habilidades' || data.currentMode === 'artefatos') {
            this.currentMode = 'arsenal';
            this.arsenalSubMode = data.currentMode === 'artefatos' ? 'ativas' : 'passivas';
          } else if (data.currentMode === 'store' || data.currentMode === 'config') {
            this.currentMode = 'comercial';
            this.comercialSubMode = data.currentMode === 'config' ? 'config' : 'store';
          } else if (data.currentMode === 'questmaker') {
            this.currentMode = 'cardengine';
            this.cardEngineSubMode = 'matrix';
          } else {
            this.currentMode = data.currentMode;
          }
        }
        if (data.cardSubMode) this.cardSubMode = data.cardSubMode;
        if (data.questSubMode) this.questSubMode = data.questSubMode;
        if (data.selectedIndex !== undefined) this.selectedIndex = data.selectedIndex;
        if (data.questsSelectedIndex !== undefined) this.questsSelectedIndex = data.questsSelectedIndex;
        if (data.packsSelectedIndex !== undefined) this.packsSelectedIndex = data.packsSelectedIndex;
      } catch(e) { console.warn('Failed to restore forge persistence', e); }
    }

    window.addEventListener('forge:switch-tab', ((ev: CustomEvent) => {
      if (ev?.detail) {
        if (ev.detail === 'decks' || ev.detail === 'matrix') {
          this.currentMode = 'cardengine';
          this.cardEngineSubMode = ev.detail;
        } else if (ev.detail === 'habilidades' || ev.detail === 'artefatos') {
          this.currentMode = 'arsenal';
          this.arsenalSubMode = ev.detail === 'artefatos' ? 'ativas' : 'passivas';
        } else if (ev.detail === 'store' || ev.detail === 'config') {
          this.currentMode = 'comercial';
          this.comercialSubMode = ev.detail === 'config' ? 'config' : 'store';
        } else {
          this.currentMode = ev.detail;
        }
        this.savePersistence();
        this.render();
      }
    }) as EventListener);
  }

  private savePersistence() {
     const data = {
        currentMode: this.currentMode,
        cardEngineSubMode: this.cardEngineSubMode,
        arsenalSubMode: this.arsenalSubMode,
        comercialSubMode: this.comercialSubMode,
        cardSubMode: this.cardSubMode,
        questSubMode: this.questSubMode,
        selectedIndex: this.selectedIndex,
        questsSelectedIndex: this.questsSelectedIndex,
        packsSelectedIndex: this.packsSelectedIndex
     };
     localStorage.setItem('forge_v2_persistence', JSON.stringify(data));
  }

  private isMatrixActive(): boolean {
    return this.currentMode === 'matrix' || (this.currentMode === 'cardengine' && this.cardEngineSubMode === 'matrix');
  }

  public render() {
    // Top-level render of the layout matching legacy CardEditorScreen structure exactly
    this.container.innerHTML = `
      <div class="editor-screen">
        <header class="editor-header" style="height: 52px; padding: 0 16px; background: #0c0d12; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <button id="btn-back-editor" class="editor-btn-secondary" style="font-size: 0.72rem; padding: 6px 12px; white-space: nowrap; flex-shrink: 0;">◀ VOLTAR</button>
          
          <div class="editor-tabs" style="display: flex; gap: 6px; overflow-x: auto; flex-wrap: nowrap; padding: 4px 6px; border-radius: 9999px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.06); max-width: calc(100vw - 300px); scrollbar-width: none;">
            <button class="editor-tab ${this.currentMode === 'cardengine' || this.currentMode === 'decks' || this.currentMode === 'matrix' ? 'active' : ''}" data-mode="cardengine" style="background: ${this.currentMode === 'cardengine' || this.currentMode === 'decks' || this.currentMode === 'matrix' ? 'linear-gradient(135deg, #0ea5e9, #7c3aed)' : 'transparent'}; color: #fff; font-weight: 900; border-radius: 9999px; padding: 5px 13px; font-size: 0.72rem; white-space: nowrap;" title="Card Engine: Galeria de Decks e Forja Matriz">🎴 CARD ENGINE</button>
            <button class="editor-tab ${this.currentMode === 'arsenal' || this.currentMode === 'habilidades' || this.currentMode === 'artefatos' ? 'active' : ''}" data-mode="arsenal" style="background: ${this.currentMode === 'arsenal' || this.currentMode === 'habilidades' || this.currentMode === 'artefatos' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent'}; color: #fff; font-weight: 900; border-radius: 9999px; padding: 5px 13px; font-size: 0.72rem; white-space: nowrap;" title="Arsenal: Passivas e Ativas (Artefatos)">⚔️ ARSENAL</button>
            <button class="editor-tab ${this.currentMode === 'comercial' || this.currentMode === 'store' || this.currentMode === 'config' ? 'active' : ''}" data-mode="comercial" style="background: ${this.currentMode === 'comercial' || this.currentMode === 'store' || this.currentMode === 'config' ? 'linear-gradient(135deg, #10b981, #0d9488)' : 'transparent'}; color: #fff; font-weight: 900; border-radius: 9999px; padding: 5px 13px; font-size: 0.72rem; white-space: nowrap;" title="Comercial: Loja/Ofertas e Economia">💎 COMERCIAL</button>
            <button class="editor-tab ${this.currentMode === 'markerdream' ? 'active' : ''}" data-mode="markerdream" style="background: ${this.currentMode === 'markerdream' ? 'linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6)' : 'linear-gradient(135deg, rgba(236,72,153,0.22), rgba(139,92,246,0.22))'}; color: #fff; font-weight: 950; border-radius: 9999px; padding: 5px 14px; font-size: 0.72rem; white-space: nowrap; border: 1.5px solid #ec4899; box-shadow: 0 0 14px rgba(236,72,153,0.55); text-shadow: 0 0 8px rgba(255,255,255,0.7); letter-spacing: 0.5px;" title="Marker Dream">🌌 MARKER DREAM</button>
            <button class="editor-tab ${this.currentMode === 'assets' ? 'active' : ''}" data-mode="assets" style="border-radius: 9999px; padding: 5px 11px; font-size: 0.7rem; white-space: nowrap;">GALERIA</button>
            <button class="editor-tab ${this.currentMode === 'scenarios' ? 'active' : ''}" data-mode="scenarios" style="border-radius: 9999px; padding: 5px 11px; font-size: 0.7rem; white-space: nowrap;">CENÁRIOS</button>
            <button class="editor-tab ${this.currentMode === 'packs' ? 'active' : ''}" data-mode="packs" style="border-radius: 9999px; padding: 5px 11px; font-size: 0.7rem; white-space: nowrap;">📦 BOOSTERS</button>
            <button class="editor-tab ${this.currentMode === 'sounds' ? 'active' : ''}" data-mode="sounds" style="border-radius: 9999px; padding: 5px 11px; font-size: 0.7rem; white-space: nowrap;">🔊 SONS</button>
            <button class="editor-tab ${this.currentMode === 'mobbys' ? 'active' : ''}" data-mode="mobbys" style="border-radius: 9999px; padding: 5px 11px; font-size: 0.7rem; white-space: nowrap;">👾 MOBBY DUELOS</button>
          </div>

          <div style="font-size: 0.75rem; font-weight: 900; color: #ffd76a; letter-spacing: 1px; white-space: nowrap; flex-shrink: 0;">
            FORJA <span style="font-size:0.55rem; color:#ffd700; background:rgba(255,215,0,0.15); padding:2px 6px; border-radius:6px; border:1px solid rgba(255,215,0,0.3); vertical-align:middle;">V2</span>
          </div>
        </header>

        <div class="editor-layout ${this.isMatrixActive() ? 'matrix-mode' : ''}" id="forge-main-content" style="${this.isMatrixActive() ? 'padding:0; overflow:hidden; height:calc(100vh - 65px); width:100%;' : ''}">
          <!-- Dynamic Tab Content Rendering here -->
        </div>

        <div id="editor-toast" class="editor-toast"></div>
      </div>
    `;

    this.renderTab();
    this.bindGlobal();
  }

  private renderTab() {
     const main = document.getElementById('forge-main-content');
     if (!main) return;

     const state = {
        templates: this.templates,
        abilities: this.abilities,
        skills: this.skills,
        scenarios: this.scenarios,
        storeItems: this.storeItems,
        assetRegistry: this.assetRegistry,
        rarities: this.rarities,
        availableCards: this.availableCards,
        availableSounds: this.availableSounds,
        selectedIndex: 0, // Fallback, override below
        cardSubMode: this.cardSubMode,
        previewMode: this.previewMode,
        classes: this.classes,
        selectedClassIds: this.selectedClassIds,
        quickFilter: this.quickFilter,
        questSubMode: this.questSubMode,
        questAssets: this.questAssets,
        worldMapCurrentTabIdx: this.worldMapCurrentTabIdx,
        questAssetsMode: this.questAssetsMode,
        isAssetsPopupOpen: this.isAssetsPopupOpen,
        customSpritePacks: this.customSpritePacks,
        customGallerySprites: this.customGallerySprites
     };

     const callbacks = {
        setMode: (mode: any) => {
           if (mode === 'decks' || mode === 'matrix') {
              this.currentMode = 'cardengine';
              this.cardEngineSubMode = mode;
              this.savePersistence();
              this.render();
              return;
           }
           if (mode === 'habilidades' || mode === 'artefatos') {
              this.currentMode = 'arsenal';
              this.arsenalSubMode = mode === 'artefatos' ? 'ativas' : 'passivas';
              this.savePersistence();
              this.render();
              return;
           }
           if (mode === 'store' || mode === 'config') {
              this.currentMode = 'comercial';
              this.comercialSubMode = mode === 'config' ? 'config' : 'store';
              this.savePersistence();
              this.render();
              return;
           }
           this.currentMode = mode;
           this.savePersistence();
           this.render();
        },
        reRender: () => this.renderTab(),
        showToast: (m: string, c?: string) => this.showToast(m, c),
        openMediaPicker: (cb: (url: string) => void) => this.openMediaPicker(cb),
        syncItemWithStore: (t: string, id: string) => this.syncItemWithStore(t, id),
        syncAssetWithStore: (url: string) => this.syncAssetWithStore(url),
        saveAssetRegistry: () => this.saveAssetRegistry(),
        loadAvailableImages: async () => this.loadAvailableImages(),
        removeAssetsFromMemory: (urlsToRemove: string[]) => {
           const removeSet = new Set(urlsToRemove);
           this.availableCards = this.availableCards.filter(u => !removeSet.has(u));
           urlsToRemove.forEach(u => {
              delete this.assetRegistry[u];
              this.assetsSelectedAssets.delete(u);
           });
           this.saveAssetRegistry();
        },
        boardRenderer: this.boardRenderer,
        saveTemplates: () => this.saveTemplates(),
        scenarioClipboard: this.scenarioClipboard,
        setCardSubMode: (mode: string) => { this.cardSubMode = mode as any; this.savePersistence(); this.renderTab(); },
        setSelectedIndex: (idx: number) => { this.selectedIndex = idx; this.savePersistence(); this.renderTab(); },
        setPreviewMode: (mode: string) => { this.previewMode = mode as any; this.savePersistence(); this.renderTab(); },
        setScenarioClipboard: (data: any) => { this.scenarioClipboard = data; },
        setHabilidadesSelectedIndex: (idx: number) => { this.habilidadesSelectedIndex = idx; this.savePersistence(); this.renderTab(); },
        setArtefatosSelectedIndex: (idx: number) => { this.artefatosSelectedIndex = idx; this.savePersistence(); this.renderTab(); },
        setStoreSelectedIndex: (idx: number) => { this.storeSelectedIndex = idx; this.savePersistence(); this.renderTab(); },
        setPacksSelectedIndex: (idx: number) => { this.packsSelectedIndex = idx; this.savePersistence(); this.renderTab(); },
        setScenariosSelectedIndex: (idx: number) => { this.scenariosSelectedIndex = idx; this.savePersistence(); this.renderTab(); },
        setAssetsSelectedCategory: (cat: string) => { this.assetsSelectedCategory = cat; this.savePersistence(); this.renderTab(); },
        toggleAssetSelection: (url: string, multi: boolean) => {
           if (!multi) this.assetsSelectedAssets.clear();
           if (this.assetsSelectedAssets.has(url)) this.assetsSelectedAssets.delete(url);
           else this.assetsSelectedAssets.add(url);
           this.savePersistence();
           this.renderTab();
        },
        clearAssetSelection: () => { this.assetsSelectedAssets.clear(); this.savePersistence(); this.renderTab(); },
        setSoundSubMode: (mode: string) => { this.soundSubMode = mode as any; this.savePersistence(); this.renderTab(); },
        setQuestSubMode: (mode: string) => { this.questSubMode = mode as any; this.savePersistence(); this.renderTab(); },
        setWorldMapTabIdx: (idx: number) => { this.worldMapCurrentTabIdx = idx; this.savePersistence(); this.renderTab(); },
        setQuestAssetsMode: (mode: 'quest' | 'general') => { this.questAssetsMode = mode; this.renderTab(); },
        setAssetsPopupOpen: (open: boolean) => { this.isAssetsPopupOpen = open; this.renderTab(); },
        saveClasses: () => this.saveClasses()
     };

     if (!this.isMatrixActive() && this.tabMatrix) {
        this.tabMatrix.unmount();
     }
     if (this.currentMode !== 'packs' && this.tabPacks) {
        this.tabPacks.unmount();
     }

     if (this.currentMode === 'cardengine' || this.currentMode === 'decks' || this.currentMode === 'matrix' || this.currentMode === 'cards') {
        if (this.currentMode === 'decks') this.cardEngineSubMode = 'decks';
        if (this.currentMode === 'matrix' || this.currentMode === 'cards') this.cardEngineSubMode = 'matrix';

        main.innerHTML = `
          <div style="display:flex; flex-direction:column; width:100%; height:100%; overflow:hidden;">
            <div class="cardengine-subnav-bar" style="display:flex; align-items:center; justify-content:space-between; padding:6px 16px; background:#0e1017; border-bottom:1px solid rgba(255,255,255,0.08); flex-shrink:0; z-index:30;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:0.75rem; font-weight:900; color:#51c5ff; letter-spacing:1px; margin-right:4px;">🎴 CARD ENGINE:</span>
                <button class="cardengine-subtab-btn ${this.cardEngineSubMode === 'decks' ? 'active' : ''}" data-sub="decks" style="background:${this.cardEngineSubMode === 'decks' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.06)'}; color:#fff; border:1px solid ${this.cardEngineSubMode === 'decks' ? '#10b981' : 'rgba(255,255,255,0.12)'}; border-radius:9999px; padding:4px 14px; font-size:0.72rem; font-weight:900; cursor:pointer; transition:0.15s;">
                  🎴 GALERIA DE DECKS
                </button>
                <button class="cardengine-subtab-btn ${this.cardEngineSubMode === 'matrix' ? 'active' : ''}" data-sub="matrix" style="background:${this.cardEngineSubMode === 'matrix' ? 'linear-gradient(135deg, #7928ca, #ff0080)' : 'rgba(255,255,255,0.06)'}; color:#fff; border:1px solid ${this.cardEngineSubMode === 'matrix' ? '#ff0080' : 'rgba(255,255,255,0.12)'}; border-radius:9999px; padding:4px 14px; font-size:0.72rem; font-weight:900; cursor:pointer; transition:0.15s;">
                  ✨ FORJA MATRIZ
                </button>
              </div>
              <div style="font-size:0.68rem; color:rgba(255,255,255,0.4);">
                Arquitetura de Cartas & Decks
              </div>
            </div>
            <div id="cardengine-subview" style="flex:1; width:100%; height:calc(100% - 41px); overflow:hidden; position:relative;"></div>
          </div>
        `;

        const subView = document.getElementById('cardengine-subview')!;
        main.querySelectorAll('.cardengine-subtab-btn').forEach(btn => {
           btn.addEventListener('click', (e) => {
              const targetSub = (e.currentTarget as HTMLElement).dataset.sub as 'decks' | 'matrix';
              if (targetSub) {
                 this.cardEngineSubMode = targetSub;
                 this.savePersistence();
                 this.render();
              }
           });
        });

        if (this.cardEngineSubMode === 'decks') {
           if (!this.tabDecks) this.tabDecks = new TabDecks(state, callbacks);
           else this.tabDecks.updateContext(state, callbacks);
           subView.innerHTML = this.tabDecks.render();
           this.tabDecks.bind(subView);
        } else {
           if (!this.tabMatrix) this.tabMatrix = new TabMatrix();
           subView.innerHTML = this.tabMatrix.render();
           this.tabMatrix.bind(subView);
        }
     } else if (this.currentMode === 'arsenal' || this.currentMode === 'habilidades' || this.currentMode === 'artefatos') {
        if (this.currentMode === 'habilidades') this.arsenalSubMode = 'passivas';
        if (this.currentMode === 'artefatos') this.arsenalSubMode = 'ativas';

        main.innerHTML = `
          <div style="display:flex; flex-direction:column; width:100%; height:100%; overflow:hidden;">
            <div class="arsenal-subnav-bar" style="display:flex; align-items:center; justify-content:space-between; padding:6px 16px; background:#0e1017; border-bottom:1px solid rgba(255,255,255,0.08); flex-shrink:0; z-index:30;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:0.75rem; font-weight:900; color:#f59e0b; letter-spacing:1px; margin-right:4px;">⚔️ ARSENAL:</span>
                <button class="arsenal-subtab-btn ${this.arsenalSubMode === 'passivas' ? 'active' : ''}" data-sub="passivas" style="background:${this.arsenalSubMode === 'passivas' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.06)'}; color:#fff; border:1px solid ${this.arsenalSubMode === 'passivas' ? '#f59e0b' : 'rgba(255,255,255,0.12)'}; border-radius:9999px; padding:4px 14px; font-size:0.72rem; font-weight:900; cursor:pointer; transition:0.15s;">
                  ✨ PASSIVAS (${this.abilities.length})
                </button>
                <button class="arsenal-subtab-btn ${this.arsenalSubMode === 'ativas' ? 'active' : ''}" data-sub="ativas" style="background:${this.arsenalSubMode === 'ativas' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(255,255,255,0.06)'}; color:#fff; border:1px solid ${this.arsenalSubMode === 'ativas' ? '#8b5cf6' : 'rgba(255,255,255,0.12)'}; border-radius:9999px; padding:4px 14px; font-size:0.72rem; font-weight:900; cursor:pointer; transition:0.15s;">
                  🔮 ATIVAS / ARTEFATOS (${this.skills.length})
                </button>
              </div>
              <div style="font-size:0.68rem; color:rgba(255,255,255,0.4);">
                Habilidades Passivas & Habilidades Ativas
              </div>
            </div>
            <div id="arsenal-subview" style="flex:1; display:flex; flex-direction:row; width:100%; height:calc(100% - 41px); overflow:hidden; position:relative;"></div>
          </div>
        `;

        const subView = document.getElementById('arsenal-subview')!;
        main.querySelectorAll('.arsenal-subtab-btn').forEach(btn => {
           btn.addEventListener('click', (e) => {
              const targetSub = (e.currentTarget as HTMLElement).dataset.sub as 'passivas' | 'ativas';
              if (targetSub) {
                 this.arsenalSubMode = targetSub;
                 this.savePersistence();
                 this.renderTab();
              }
           });
        });

        if (this.arsenalSubMode === 'passivas') {
           state.selectedIndex = this.habilidadesSelectedIndex;
           const tab = new TabAbilities(state, callbacks, this.core);
           subView.innerHTML = tab.render();
           tab.bind(subView);
        } else {
           state.selectedIndex = this.artefatosSelectedIndex;
           const tab = new TabArtefatos(state, callbacks, this.core);
           subView.innerHTML = tab.render();
           tab.bind(subView);
        }
     } else if (this.currentMode === 'comercial' || this.currentMode === 'store' || this.currentMode === 'config') {
        if (this.currentMode === 'config') this.comercialSubMode = 'config';
        if (this.currentMode === 'store') this.comercialSubMode = 'store';

        main.innerHTML = `
          <div style="display:flex; flex-direction:column; width:100%; height:100%; overflow:hidden;">
            <div class="comercial-subnav-bar" style="display:flex; align-items:center; justify-content:space-between; padding:6px 16px; background:#0e1017; border-bottom:1px solid rgba(255,255,255,0.08); flex-shrink:0; z-index:30;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:0.75rem; font-weight:900; color:#10b981; letter-spacing:1px; margin-right:4px;">💎 COMERCIAL:</span>
                <button class="comercial-subtab-btn ${this.comercialSubMode === 'store' ? 'active' : ''}" data-sub="store" style="background:${this.comercialSubMode === 'store' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.06)'}; color:#fff; border:1px solid ${this.comercialSubMode === 'store' ? '#10b981' : 'rgba(255,255,255,0.12)'}; border-radius:9999px; padding:4px 14px; font-size:0.72rem; font-weight:900; cursor:pointer; transition:0.15s;">
                  🛍️ LOJA & OFERTAS
                </button>
                <button class="comercial-subtab-btn ${this.comercialSubMode === 'config' ? 'active' : ''}" data-sub="config" style="background:${this.comercialSubMode === 'config' ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'rgba(255,255,255,0.06)'}; color:#fff; border:1px solid ${this.comercialSubMode === 'config' ? '#0d9488' : 'rgba(255,255,255,0.12)'}; border-radius:9999px; padding:4px 14px; font-size:0.72rem; font-weight:900; cursor:pointer; transition:0.15s;">
                  💰 ECONOMIA & CONFIGS
                </button>
              </div>
              <div style="font-size:0.68rem; color:rgba(255,255,255,0.4);">
                Gestão Comercial e Parâmetros Econômicos
              </div>
            </div>
            <div id="comercial-subview" style="flex:1; display:flex; flex-direction:row; width:100%; height:calc(100% - 41px); overflow:hidden; position:relative;"></div>
          </div>
        `;

        const subView = document.getElementById('comercial-subview')!;
        main.querySelectorAll('.comercial-subtab-btn').forEach(btn => {
           btn.addEventListener('click', (e) => {
              const targetSub = (e.currentTarget as HTMLElement).dataset.sub as 'store' | 'config';
              if (targetSub) {
                 this.comercialSubMode = targetSub;
                 this.savePersistence();
                 this.renderTab();
              }
           });
        });

        if (this.comercialSubMode === 'store') {
           state.selectedIndex = this.storeSelectedIndex;
           const tab = new TabStore(state, callbacks, this.core);
           subView.innerHTML = tab.render();
           tab.bind(subView);
        } else {
           const tab = new TabConfig(state, callbacks, this.core);
           subView.innerHTML = tab.render();
           tab.bind(subView);
        }
     } else if (this.currentMode === 'assets') {
        (state as any).selectedCategory = this.assetsSelectedCategory;
        (state as any).selectedAssets = this.assetsSelectedAssets;
        if (!this.tabAssets) this.tabAssets = new TabAssets(state, callbacks);
        else this.tabAssets.updateContext(state, callbacks);
        main.innerHTML = this.tabAssets.render();
        this.tabAssets.bind(main);
     } else if (this.currentMode === 'scenarios') {
        state.selectedIndex = this.scenariosSelectedIndex;
        const tab = new TabScenarios(state, callbacks, this.core);
        main.innerHTML = tab.render();
        tab.bind(main);
     } else if (this.currentMode === 'sounds') {
        if (!this.soundCentral) {
          const sData = this.soundsData || { library: [], actions: {}, screens: {}, transitions: {} };
          this.soundCentral = new SoundCentralScreen(sData as any, this.availableSounds);
        }
        (this.soundCentral as any).subMode = this.soundSubMode;
        main.innerHTML = `<div style="width:100%; height:100%; display:flex; flex-direction:column; overflow:hidden;">${this.soundCentral.render()}</div>`;
        this.soundCentral.bind(main, () => callbacks.setSoundSubMode((this.soundCentral as any).subMode), (m, c) => this.showToast(m, c));
     } else if (this.currentMode === 'packs') {
        state.selectedIndex = this.packsSelectedIndex;
        if (!this.tabPacks) this.tabPacks = new TabPacks(state, callbacks, this.core);
        else this.tabPacks.updateContext(state, callbacks, this.core);
        main.innerHTML = this.tabPacks.render();
        this.tabPacks.bind(main);
      } else if (this.currentMode === 'questmaker') {
         // Clear skip flag to force one-time re-appearance for the user after this fix
         localStorage.removeItem('qm_hub_skipped');
         state.selectedIndex = this.questsSelectedIndex;
         const tab = new TabQuestMaker(state, this.core, callbacks);
         main.innerHTML = tab.render();
         tab.bind(main);
      } else if (this.currentMode === 'mobbys') {
         const tab = new TabMobbys(state, callbacks);
         main.innerHTML = tab.render();
         tab.bind(main);
      } else if (this.currentMode === 'markerdream') {
         main.innerHTML = `
           <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: radial-gradient(circle at center, rgba(35, 14, 52, 0.7) 0%, rgba(10, 11, 16, 0.95) 100%); color: #fff; text-align: center; padding: 40px; box-sizing: border-box;">
             <div style="width: 76px; height: 76px; border-radius: 22px; background: linear-gradient(135deg, #ec4899, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 2.3rem; box-shadow: 0 0 35px rgba(236, 72, 153, 0.6); margin-bottom: 22px; border: 1.5px solid rgba(255,255,255,0.25);">
               🌌
             </div>
             <h2 style="font-size: 1.7rem; font-weight: 900; letter-spacing: 3px; margin: 0 0 10px 0; background: linear-gradient(90deg, #ec4899, #a855f7, #38bdf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">MARKER DREAM</h2>
             <p style="color: rgba(255,255,255,0.55); font-size: 0.85rem; max-width: 440px; margin: 0; line-height: 1.6;">Aba reservada e configurada com acesso prioritário. Espaço pronto para receber o novo projeto.</p>
           </div>
         `;
      }
  }

  private bindGlobal() {
     document.getElementById('btn-back-editor')?.addEventListener('click', () => this.onExit());
     document.querySelectorAll('.editor-tab:not(.disabled)').forEach(btn => {
        btn.addEventListener('click', (e) => {
           const mode = (e.currentTarget as HTMLElement).dataset.mode as any;
           if (mode === 'cards' || mode === 'questmaker') return;
           this.currentMode = mode;
           this.selectedIndex = 0;
           this.savePersistence();
           this.render();
        });
     });

     // Ouvinte para purga absoluta da biblioteca da Matriz atingindo a aba Booster em tempo real
     window.addEventListener('matrix_library_cleared', () => {
       this.templates = [];
       if (this.storeItems && Array.isArray(this.storeItems.packs)) {
         this.storeItems.packs.forEach((p: any) => {
           p.fixedCards = [];
           p.cardGroups = { common: [], rare: [], legendary: [] };
         });
       }
       if (this.currentMode === 'packs') {
         this.renderTab();
       }
     });

     window.addEventListener('matrix_card_deleted', (e: any) => {
       const delTitle = (e.detail?.title || '').toLowerCase().trim();
       const delId = e.detail?.id;
       if (delTitle || delId) {
         this.templates = this.templates.filter((t: any) => {
           const matchTitle = delTitle && (t.name || t.title || '').toLowerCase().trim() === delTitle;
           const matchId = delId && t.id === delId;
           return !matchTitle && !matchId;
         });
         if (this.storeItems && Array.isArray(this.storeItems.packs)) {
           this.storeItems.packs.forEach((p: any) => {
             if (Array.isArray(p.fixedCards)) {
               p.fixedCards = p.fixedCards.filter((name: string) => name.toLowerCase().trim() !== delTitle);
             }
           });
         }
         if (this.currentMode === 'packs') {
           this.renderTab();
         }
       }
     });
  }

  private showToast(msg: string, color = '#4cff88') {
    this.core.showToast(msg, color);
  }

  private openMediaPicker(onSelect: (url: string) => void) {
     const isVid = (u: string) => /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(u || '');
     let activeFilter = 'all';
     let searchQuery = '';

     const p = document.createElement('div');
     p.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(8px);`;

     const renderPickerContent = () => {
        const filtered = this.availableCards.filter(img => {
           let cat = this.assetRegistry[img]?.category || 'uncategorized';
           if (cat === 'skill_icon') cat = 'artifact_combat';
           if (cat === 'sprite_asset') cat = 'mobby_png';
           if (activeFilter !== 'all' && cat !== activeFilter) return false;
           if (searchQuery) {
              const name = (img.split('/').pop() || '').toLowerCase();
              if (!name.includes(searchQuery.toLowerCase())) return false;
           }
           return true;
        });

        p.innerHTML = `
          <div style="width:86%; max-width:920px; height:82%; background:#0f111a; border:1px solid rgba(255,255,255,0.12); border-radius:16px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.85);">
             <div style="padding:14px 18px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:10px;">
                   <span style="font-weight:900; color:#51c5ff; font-size:0.9rem; letter-spacing:1px;">🖼️ SELETOR DE MÍDIA DA ENGINE</span>
                   <span style="font-size:0.7rem; color:#888; background:rgba(255,255,255,0.05); padding:3px 8px; border-radius:99px;">${filtered.length} itens</span>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                   <input type="text" id="picker-search-input" value="${searchQuery.replace(/"/g, '&quot;')}" placeholder="🔍 Filtrar por nome..." style="background:#08090e; border:1px solid rgba(255,255,255,0.12); color:#fff; border-radius:8px; padding:6px 10px; font-size:0.75rem; width:190px;">
                   <button id="btn-picker-upload" class="editor-btn-secondary" style="padding:6px 12px; font-size:0.72rem; background:rgba(81,197,255,0.14); color:#51c5ff; border:1px solid #51c5ff; font-weight:900; cursor:pointer;">+ IMPORTAR DO PC</button>
                   <button id="btn-close-picker" class="editor-btn-secondary" style="padding:6px 12px; font-size:0.72rem; cursor:pointer;">FECHAR</button>
                </div>
             </div>
             <div style="display:flex; gap:6px; padding:8px 18px; background:#090b10; border-bottom:1px solid rgba(255,255,255,0.06); overflow-x:auto; flex-shrink:0;">
                ${[
                   { id: 'all', label: '🌐 Todos' },
                   { id: 'card_art', label: '🐉 Cartas (Criaturas)' },
                   { id: 'spell_art', label: '🔮 Magias' },
                   { id: 'artifact_combat', label: '⚔️ Artefatos' },
                   { id: 'mobby_png', label: '👾 Mobbys PNG' },
                   { id: 'booster_front', label: '📦 Booster Frente' },
                   { id: 'booster_back', label: '🔙 Booster Verso' },
                   { id: 'store_banner', label: '🎞️ Banners Loja' },
                   { id: 'ability_icon', label: '🧬 Passivas' },
                   { id: 'ui_element', label: '🎛️ UI & HUD' },
                   { id: 'scenario', label: '🏞️ Cenários' },
                   { id: 'uncategorized', label: '📦 Sem Categoria' }
                ].map(tab => `
                   <button class="picker-cat-btn" data-cat="${tab.id}" style="background:${activeFilter === tab.id ? '#51c5ff' : 'rgba(255,255,255,0.05)'}; color:${activeFilter === tab.id ? '#000' : '#ccc'}; border:none; border-radius:6px; padding:4px 10px; font-size:0.68rem; font-weight:800; cursor:pointer; white-space:nowrap;">
                      ${tab.label}
                   </button>
                `).join('')}
             </div>
             <input type="file" id="picker-inp-file" style="display:none" accept="image/*,video/*,.mp4,.webm,.mov,.m4v,.ogv">
             <div id="quick-gallery" style="flex:1; overflow-y:auto; padding:15px; display:grid; grid-template-columns:repeat(auto-fill, minmax(105px, 1fr)); gap:10px; align-content:start;">
                ${filtered.map(img => `
                   <div class="picker-item" data-url="${img}" title="${img.split('/').pop()}" style="aspect-ratio:1/1; background:#07080c; border-radius:8px; overflow:hidden; cursor:pointer; border:1px solid rgba(255,255,255,0.08); transition:0.15s; position:relative; display:flex; align-items:center; justify-content:center;">
                      ${isVid(img)
                         ? `<video src="${img}" style="width:100%; height:100%; object-fit:cover;" muted loop playsinline preload="metadata" onmouseover="this.play()" onmouseout="this.pause();this.currentTime=0;"></video><div style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.7); color:#51c5ff; font-size:0.55rem; font-weight:900; padding:2px 6px; border-radius:4px;">VIDEO</div>`
                         : `<img src="${img}" loading="lazy" decoding="async" style="max-width:100%; max-height:100%; object-fit:contain;" />`}
                      <div style="position:absolute; bottom:0; left:0; right:0; font-size:0.55rem; color:#ccc; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; background:rgba(0,0,0,0.75); padding:2px 5px;">${img.split('/').pop()}</div>
                   </div>
                `).join('')}
                ${filtered.length === 0 ? '<div style="grid-column:1/-1; opacity:0.5; font-size:0.8rem; text-align:center; padding:40px;">Nenhum asset encontrado neste filtro.</div>' : ''}
             </div>
          </div>
        `;

        p.querySelectorAll('.picker-item').forEach(item => {
           item.addEventListener('click', () => {
              onSelect((item as HTMLElement).dataset.url!);
              p.remove();
           });
        });

        p.querySelectorAll('.picker-cat-btn').forEach(btn => {
           btn.addEventListener('click', (e) => {
              activeFilter = (e.currentTarget as HTMLElement).dataset.cat || 'all';
              renderPickerContent();
           });
        });

        const searchInp = p.querySelector('#picker-search-input') as HTMLInputElement | null;
        searchInp?.addEventListener('input', () => {
           searchQuery = searchInp.value;
           renderPickerContent();
           const nextInp = p.querySelector('#picker-search-input') as HTMLInputElement | null;
           if (nextInp) {
              nextInp.focus();
              nextInp.setSelectionRange(nextInp.value.length, nextInp.value.length);
           }
        });

        p.querySelector('#btn-close-picker')?.addEventListener('click', () => p.remove());

        const fileInp = p.querySelector('#picker-inp-file') as HTMLInputElement;
        p.querySelector('#btn-picker-upload')?.addEventListener('click', () => fileInp.click());
        fileInp?.addEventListener('change', async () => {
           const file = fileInp.files?.[0];
           if (!file) return;
           this.showToast('Importando arquivo...', '#51c5ff');
           const formData = new FormData();
           formData.append('media', file);
           let url = '';
           try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 6000);
              const resp = await fetch('/api/upload-media', { method: 'POST', body: formData, signal: controller.signal });
              clearTimeout(timeoutId);
              const json = await resp.json();
              if (json.success) {
                 url = json.url || (json.urls && json.urls[0]) || `/cards/${file.name}`;
              }
           } catch (err) {
              console.warn('Upload-media falhou ou expirou, aplicando fallback local:', err);
           }

           if (!url) {
              url = await new Promise<string>((resolve) => {
                 const reader = new FileReader();
                 reader.onload = () => resolve(reader.result as string || `/cards/${file.name}`);
                 reader.onerror = () => resolve(`/cards/${file.name}`);
                 reader.readAsDataURL(file);
              });
           }

           if (url) {
              if (!this.availableCards.includes(url)) this.availableCards.push(url);
              this.showToast('Importado com sucesso!', '#4cff88');
              onSelect(url);
              p.remove();
           } else {
              this.showToast('Falha ao processar o arquivo.', '#ff4444');
           }
        });
     };

     renderPickerContent();
     document.body.appendChild(p);
  }

  private async syncItemWithStore(type: string, itemId: string) {
     if (!this.storeItems.artifacts) this.storeItems.artifacts = [];
     const sourceList = type === 'ability' ? this.abilities : this.skills;
     const sourceItem = sourceList.find((item: any) => item.id === itemId);
     if (!sourceItem) return;

     let storeEntry = this.storeItems.artifacts.find((a: any) => a.linkedId === itemId || a.id === `store_${itemId}`);
     if (sourceItem.isStoreItem) {
        if (!storeEntry) {
           storeEntry = {
              id: `store_${itemId}`,
              linkedId: itemId,
              itemType: type,
              name: sourceItem.name || 'Item de Arsenal',
              description: sourceItem.description || '',
              price: 250,
              currency: 'gold',
              image: sourceItem.icon || '/cards/slime_tricks.png',
              rarity: 'Rara'
           };
           this.storeItems.artifacts.push(storeEntry);
        } else {
           storeEntry.name = sourceItem.name || storeEntry.name;
           storeEntry.description = sourceItem.description || storeEntry.description;
           storeEntry.image = sourceItem.icon || storeEntry.image;
        }
        await this.core.saveJson('/api/save-store', this.storeItems);
        this.showToast(`"${sourceItem.name}" adicionado à Loja Comercial!`, '#4cff88');
     } else {
        this.storeItems.artifacts = this.storeItems.artifacts.filter((a: any) => a.linkedId !== itemId && a.id !== `store_${itemId}`);
        await this.core.saveJson('/api/save-store', this.storeItems);
        this.showToast(`"${sourceItem.name}" removido da Loja Comercial.`, '#ffb347');
     }
  }

  private async syncAssetWithStore(url: string) {
     if (!this.storeItems.artifacts) this.storeItems.artifacts = [];
     const fileName = (url.split('/').pop() || 'Asset').replace(/\.[^/.]+$/, '');
     const exists = this.storeItems.artifacts.some((a: any) => a.image === url);
     if (!exists) {
        this.storeItems.artifacts.push({
           id: `store_asset_${Date.now()}`,
           name: fileName,
           description: 'Asset importado diretamente da Galeria.',
           price: 200,
           currency: 'gold',
           image: url,
           rarity: 'Comum'
        });
        await this.core.saveJson('/api/save-store', this.storeItems);
        this.showToast(`Asset "${fileName}" publicado na Loja Comercial!`, '#4cff88');
     } else {
        this.showToast('Este asset já está disponível na Loja!', '#51c5ff');
     }
  }

  private saveAssetRegistry() {
     this.core.saveJson('/api/save-assets', this.assetRegistry);
  }

  private async loadAvailableImages() {
     const res = await fetch('/api/images');
     if (res.ok) {
       const data = await res.json();
       this.availableCards = data.cards || [];
     }
  }

  private async saveTemplates() {
     const ok = await this.core.saveJson('/api/save-cards', this.templates);
     if (ok) this.showToast('Cartas salvas com sucesso!');
     else this.showToast('Erro ao salvar cartas', '#ff4444');
  }

  private async saveClasses() {
     const ok = await this.core.saveJson('/api/save-classes', this.classes);
     if (ok) this.showToast('Classes salvas!');
     else this.showToast('Erro ao salvar classes', '#ff4444');
  }
}
