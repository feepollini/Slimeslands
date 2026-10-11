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
import { ForgeCore } from './core/ForgeCore';

export class ForgeApp {
  private container: HTMLElement;
  private currentMode: 'cards' | 'habilidades' | 'artefatos' | 'assets' | 'scenarios' | 'store' | 'packs' | 'config' | 'sounds' | 'questmaker' = 'cards';
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
        if (data.currentMode) this.currentMode = data.currentMode;
        if (data.cardSubMode) this.cardSubMode = data.cardSubMode;
        if (data.questSubMode) this.questSubMode = data.questSubMode;
        if (data.selectedIndex !== undefined) this.selectedIndex = data.selectedIndex;
        if (data.questsSelectedIndex !== undefined) this.questsSelectedIndex = data.questsSelectedIndex;
        if (data.packsSelectedIndex !== undefined) this.packsSelectedIndex = data.packsSelectedIndex;
      } catch(e) { console.warn('Failed to restore forge persistence', e); }
    }
  }

  private savePersistence() {
     const data = {
        currentMode: this.currentMode,
        cardSubMode: this.cardSubMode,
        questSubMode: this.questSubMode,
        selectedIndex: this.selectedIndex,
        questsSelectedIndex: this.questsSelectedIndex,
        packsSelectedIndex: this.packsSelectedIndex
     };
     localStorage.setItem('forge_v2_persistence', JSON.stringify(data));
  }

  public render() {
    // Top-level render of the layout matching legacy CardEditorScreen structure exactly
    this.container.innerHTML = `
      <div class="editor-screen">
        <header class="editor-header">
          <button id="btn-back-editor" class="editor-btn-secondary">◀ VOLTAR</button>
          <div class="editor-tabs">
            <button class="editor-tab ${this.currentMode === 'cards' ? 'active' : ''}" data-mode="cards">CARTAS</button>
            <button class="editor-tab ${this.currentMode === 'habilidades' ? 'active' : ''}" data-mode="habilidades">PASSIVAS</button>
            <button class="editor-tab ${this.currentMode === 'artefatos' ? 'active' : ''}" data-mode="artefatos">ATIVAS(Artf)</button>
            <button class="editor-tab ${this.currentMode === 'assets' ? 'active' : ''}" data-mode="assets">GALERIA</button>
            <button class="editor-tab ${this.currentMode === 'scenarios' ? 'active' : ''}" data-mode="scenarios">CENÁRIOS</button>
            <button class="editor-tab ${this.currentMode === 'store' ? 'active' : ''}" data-mode="store">LOJA/OFERTAS</button>
            <button class="editor-tab ${this.currentMode === 'packs' ? 'active' : ''}" data-mode="packs">📦 BOOSTERS</button>
            <button class="editor-tab ${this.currentMode === 'config' ? 'active' : ''}" data-mode="config">ECONOMIA</button>
            <button class="editor-tab ${this.currentMode === 'sounds' ? 'active' : ''}" data-mode="sounds">🔊 SONS</button>
            <button class="editor-tab ${this.currentMode === 'questmaker' ? 'active' : ''}" data-mode="questmaker">📜 QUEST MAKER</button>
          </div>
          <h2>FORJA DO CRIADOR <span style="font-size:0.5rem; color:#ffd700; vertical-align:super;">V2</span></h2>
        </header>

        <div class="editor-layout" id="forge-main-content">
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
        setMode: (mode: any) => { this.currentMode = mode; this.savePersistence(); this.renderTab(); },
        reRender: () => this.renderTab(),
        showToast: (m: string, c?: string) => this.showToast(m, c),
        openMediaPicker: (cb: (url: string) => void) => this.openMediaPicker(cb),
        syncItemWithStore: (t: string, id: string) => this.syncItemWithStore(t, id),
        syncAssetWithStore: (url: string) => this.syncAssetWithStore(url),
        saveAssetRegistry: () => this.saveAssetRegistry(),
        loadAvailableImages: async () => this.loadAvailableImages(),
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

     if (this.currentMode === 'cards') {
        state.selectedIndex = this.selectedIndex;
        const tab = new TabCards(state, callbacks);
        main.innerHTML = tab.render();
        tab.bind(main);
     } else if (this.currentMode === 'habilidades') {
        state.selectedIndex = this.habilidadesSelectedIndex;
        const tab = new TabAbilities(state, callbacks, this.core);
        main.innerHTML = tab.render();
        tab.bind(main);
     } else if (this.currentMode === 'assets') {
        (state as any).selectedCategory = this.assetsSelectedCategory;
        (state as any).selectedAssets = this.assetsSelectedAssets;
        const tab = new TabAssets(state, callbacks);
        main.innerHTML = tab.render();
        tab.bind(main);
     } else if (this.currentMode === 'scenarios') {
        state.selectedIndex = this.scenariosSelectedIndex;
        const tab = new TabScenarios(state, callbacks, this.core);
        main.innerHTML = tab.render();
        tab.bind(main);
     } else if (this.currentMode === 'config') {
        const tab = new TabConfig(state, callbacks, this.core);
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
     } else if (this.currentMode === 'artefatos') {
        state.selectedIndex = this.artefatosSelectedIndex;
        const tab = new TabArtefatos(state, callbacks, this.core);
        main.innerHTML = tab.render();
        tab.bind(main);
     } else if (this.currentMode === 'store') {
        state.selectedIndex = this.storeSelectedIndex;
        const tab = new TabStore(state, callbacks, this.core);
        main.innerHTML = tab.render();
        tab.bind(main);
      } else if (this.currentMode === 'packs') {
        state.selectedIndex = this.packsSelectedIndex;
        const tab = new TabPacks(state, callbacks, this.core);
        main.innerHTML = tab.render();
        tab.bind(main);
      } else if (this.currentMode === 'questmaker') {
         // Clear skip flag to force one-time re-appearance for the user after this fix
         localStorage.removeItem('qm_hub_skipped');
         state.selectedIndex = this.questsSelectedIndex;
         const tab = new TabQuestMaker(state, this.core, callbacks);
         main.innerHTML = tab.render();
         tab.bind(main);
      }
  }

  private bindGlobal() {
     document.getElementById('btn-back-editor')?.addEventListener('click', () => this.onExit());
     document.querySelectorAll('.editor-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
           this.currentMode = (e.currentTarget as HTMLElement).dataset.mode as any;
           this.selectedIndex = 0;
           this.savePersistence();
           this.render();
        });
     });
  }

  private showToast(msg: string, color = '#4cff88') {
    this.core.showToast(msg, color);
  }

  private openMediaPicker(onSelect: (url: string) => void) {
     const isVid = (u: string) => /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(u || '');
     const p = document.createElement('div');
     p.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;`;
     p.innerHTML = `
       <div style="width:80%; max-width:800px; height:80%; background:#111; border:1px solid rgba(255,255,255,0.1); border-radius:15px; display:flex; flex-direction:column; overflow:hidden;">
          <div style="padding:15px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;">
             <span style="font-weight:900; color:#51c5ff;">MÍDIA RÁPIDA</span>
             <div style="display:flex; gap:10px;">
                <button id="btn-picker-upload" class="editor-btn-secondary" style="padding:4px 10px; font-size:0.7rem; background:rgba(81,197,255,0.1); color:#51c5ff; border-color:#51c5ff;">+ IMPORTAR DO PC</button>
                <button id="btn-close-picker" class="editor-btn-secondary" style="padding:4px 10px; font-size:0.7rem;">FECHAR</button>
             </div>
          </div>
          <input type="file" id="picker-inp-file" style="display:none" accept="image/*,video/*,.mp4,.webm,.mov,.m4v,.ogv">
          <div id="quick-gallery" style="flex:1; overflow-y:auto; padding:15px; display:grid; grid-template-columns:repeat(auto-fill, minmax(100px, 1fr)); gap:10px;">
             ${this.availableCards.map(img => `
                <div class="picker-item" data-url="${img}" title="${img.split('/').pop()}" style="aspect-ratio:1/1; background:rgba(0,0,0,0.4); border-radius:8px; overflow:hidden; cursor:pointer; border:1px solid transparent; transition:0.2s; position:relative;">
                   ${isVid(img)
                      ? `<video src="${img}" style="width:100%; height:100%; object-fit:cover;" muted loop playsinline preload="metadata" onmouseover="this.play()" onmouseout="this.pause();this.currentTime=0;"></video><div style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.7); color:#51c5ff; font-size:0.55rem; font-weight:900; padding:2px 6px; border-radius:4px;">VIDEO</div>`
                      : `<div style="width:100%; height:100%; background:url('${img}') center/cover;"></div>`}
                   <div style="position:absolute; bottom:0; left:0; right:0; font-size:0.55rem; color:#ccc; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; background:rgba(0,0,0,0.6); padding:2px 4px;">${img.split('/').pop()}</div>
                </div>
             `).join('')}
             ${this.availableCards.length === 0 ? '<div style="opacity:0.5; font-size:0.8rem;">Vazio... importe do PC para comecar.</div>' : ''}
          </div>
       </div>
     `;

     document.body.appendChild(p);

     p.querySelectorAll('.picker-item').forEach(item => {
        item.addEventListener('click', () => {
           onSelect((item as HTMLElement).dataset.url!);
           p.remove();
        });
     });
     p.querySelector('#btn-close-picker')?.addEventListener('click', () => p.remove());

     const fileInp = p.querySelector('#picker-inp-file') as HTMLInputElement;
     p.querySelector('#btn-picker-upload')?.addEventListener('click', () => fileInp.click());
     fileInp.addEventListener('change', async () => {
        const file = fileInp.files?.[0];
        if (!file) return;
        this.showToast('Importando arquivo...', '#51c5ff');
        const formData = new FormData();
        formData.append('media', file);
        try {
           const resp = await fetch('/api/upload-media', { method: 'POST', body: formData });
           const json = await resp.json();
           if (json.success) {
              const url = (json.urls && json.urls[0]) || `/cards/${file.name}`;
              if (!this.availableCards.includes(url)) this.availableCards.push(url);
              this.showToast('Importado com sucesso do PC!', '#4cff88');
              onSelect(url);
              p.remove();
           } else {
              this.showToast('Falha ao importar: ' + (json.error || 'erro'), '#ff4444');
           }
        } catch (err) {
           console.error(err);
           this.showToast('Falha ao importar do PC.', '#ff4444');
        }
     });
  }

  private syncItemWithStore(_type: string, _itemId: string) {
     this.showToast('Sincronizando com a Loja...');
  }

  private syncAssetWithStore(_url: string) {
     this.showToast('Asset sincronizado com a loja!');
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
