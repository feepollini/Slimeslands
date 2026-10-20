import { CARD_TEMPLATES, CARD_ABILITIES, RARITIES, SKILL_POOL } from '../../core/constants';
import { BoardScreen } from './BoardScreen';
import { Card } from '../../core/GameEngine';
import { RarityDef, CardAbility, Skill } from '../../core/types';
import { gsap } from 'gsap';
import '../styles/Editor.css';

import scenariosData from '../../core/scenarios.json';
import storeData from '../../core/store.json';
import assetsData from '../../core/assets.json';

import { SoundCentralScreen } from './SoundCentralScreen';
import soundsData from '../../core/sounds.json';
import { applyScenarioBackground, generateSvgPattern } from '../utils/BackgroundUtils';
import { animateParallaxLayers } from '../utils/ParallaxUtils';
import { spawnSparkParticles, spawnAtmosphericFog, spawnMagicSwirl } from '../utils/ParticleUtils';


type EditorMode = 'cards' | 'assets' | 'scenarios' | 'habilidades' | 'artefatos' | 'config' | 'store' | 'sounds';

export class CardEditorScreen {
  private templates: any[] = [];
  private rarities: Record<string, RarityDef> = {};
  private abilities: CardAbility[] = [];
  private skills: Skill[] = [];

  private scenarios: any = { lobby: '', battle: '', arsenal: '', store: '', map: '', academy: '' };
  private storeItems: any[] = [];
  private availableCards: string[] = [];
  private assetRegistry: Record<string, { category?: string; shop?: any }> = {};

  private selectedIndex: number = 0;
  private currentMode: EditorMode = 'habilidades';
  private cardSubMode: 'basico' | 'aparencia' | 'estetica' | 'efeitos' = 'basico';
  private onExit: () => void;
  private boardRenderer = new BoardScreen();

  // Selection state for different modes
  private selectedRarityKey: string = 'common';
  private selectedAbilityIdx: number = 0;
  private selectedSkillIdx: number = 0;
  private selectedAssetCategory: string = 'all';
  private selectedAssetUrl: string = '';
  private selectedAssetSet: Set<string> = new Set();
  private selectionMode: boolean = false;
  private scenarioClipboard: any = null;
  private selectedParallaxLayerIdx: number | null = null;


  private soundCentral: SoundCentralScreen | null = null;
  private availableSounds: string[] = [];
  private previewMode: 'static' | 'video' = 'video';

  constructor(onExit: () => void) {
    this.onExit = onExit;
    // Clone all data to work locally before saving
    this.templates = JSON.parse(JSON.stringify(CARD_TEMPLATES));
    this.rarities = JSON.parse(JSON.stringify(RARITIES));
    this.abilities = JSON.parse(JSON.stringify(CARD_ABILITIES));
    this.skills = JSON.parse(JSON.stringify(SKILL_POOL));
    this.scenarios = JSON.parse(JSON.stringify(scenariosData));
    this.storeItems = JSON.parse(JSON.stringify(storeData));
    this.assetRegistry = JSON.parse(JSON.stringify(assetsData || {}));
  }

  public async init(container: HTMLElement) {
    container.innerHTML = `<div style="height:100%; display:flex; align-items:center; justify-content:center; color:white;">Carregando Imagens Locais...</div>`;

    try {
      // Fetch available images from our custom Vite API
      const res = await fetch('/api/images');
      if (res.ok) {
        const data = await res.json();
        this.availableCards = data.cards || [];
      } else {
        console.warn('Could not load images API. Using fallbacks.');
        this.availableCards = ['/cards/1.jpg', '/cards/2.jpg', '/cards/3.jpg', '/cards/4.jpg', '/cards/5.jpg', '/cards/6.jpg'];
      }
    } catch (e) {
      console.error(e);
      this.availableCards = ['/cards/1.jpg', '/cards/2.jpg'];
    }

    this.availableSounds = this.availableCards.filter(u => /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(u));
    // Also fetch from /sounds/ directory
    try { const sr = await fetch('/api/sounds'); if (sr.ok) { const sd = await sr.json(); this.availableSounds = sd.sounds || []; } } catch {}
    this.soundCentral = new SoundCentralScreen(soundsData as any, this.availableSounds);
    this.render(container);
    this.bind();
    this.updatePreview();
  }

  private render(container: HTMLElement) {
    container.innerHTML = `
      <div class="editor-screen">
        <header class="editor-header">
          <button id="btn-back-editor" class="editor-btn-secondary">◀ VOLTAR</button>
          <div class="editor-tabs">
            <button class="editor-tab disabled" data-mode="cards" disabled style="opacity: 0.35; cursor: not-allowed; text-decoration: line-through;" title="Aba Cartas desativada">CARTAS (DESATIVADO)</button>
            <button class="editor-tab ${this.currentMode === 'habilidades' ? 'active' : ''}" data-mode="habilidades">HABILIDADES</button>
            <button class="editor-tab ${this.currentMode === 'artefatos' ? 'active' : ''}" data-mode="artefatos">ARTEFATOS</button>
            <button class="editor-tab ${this.currentMode === 'assets' ? 'active' : ''}" data-mode="assets">GALERIA</button>
            <button class="editor-tab ${this.currentMode === 'scenarios' ? 'active' : ''}" data-mode="scenarios">CENÁRIOS</button>
            <button class="editor-tab ${this.currentMode === 'store' ? 'active' : ''}" data-mode="store">LOJA</button>
            <button class="editor-tab ${this.currentMode === 'config' ? 'active' : ''}" data-mode="config">GERAL</button>
            <button class="editor-tab ${this.currentMode === 'sounds' ? 'active' : ''}" data-mode="sounds">🔊 SONS</button>
          </div>
          <h2>FORJA DO CRIADOR</h2>
        </header>

        <div class="editor-layout">
          ${this.currentMode === 'cards' ? this.renderCardsMode() :
        this.currentMode === 'scenarios' ? this.renderScenariosMode() :
          this.currentMode === 'assets' ? this.renderAssetsMode() :
            this.currentMode === 'habilidades' ? this.renderHabilidadesMode() :
              this.currentMode === 'artefatos' ? this.renderArtefatosMode() :
                this.currentMode === 'store' ? this.renderStoreMode() :
                this.currentMode === 'sounds' ? this.renderSoundMode() :
                  this.renderConfigMode()}
        </div>

        <div id="editor-toast" class="editor-toast">Gravado com sucesso!</div>
      </div>
    `;

    // Set rarity initial select if in cards mode
    if (this.currentMode === 'cards' && this.templates[this.selectedIndex]) {
      const sel = document.getElementById('inp-rarity') as HTMLSelectElement;
      if (sel) sel.value = this.templates[this.selectedIndex].preferredRarity || '';
    }
  }

  private renderCardsMode(): string {
    return `
      <!-- LEFT: List/Carousel -->
      <div class="editor-list-panel">
        <div class="editor-section-title">ACERVO (${this.templates.length})</div>
        <div class="editor-card-list" id="editor-card-list">
          ${this.templates.map((t, i) => `
            <div class="editor-list-item ${i === this.selectedIndex ? 'active' : ''}" data-idx="${i}">
              <div class="list-item-img" style="background-image:url('${t.image}')"></div>
              <div class="list-item-info">
                <div class="list-item-name">${t.name}</div>
                <div class="list-item-stats">⚔️${t.baseAtk} ❤️${t.basePv} · 💎${t.manaCost || 1} ⚡${t.staminaCost || 1}</div>
              </div>
            </div>
          `).join('')}
          <button id="btn-add-card" class="editor-btn-add">+ NOVA CARTA</button>
        </div>
      </div>

      <!-- MIDDLE: Edit Form with Sub-Tabs -->
      <div class="editor-form-panel">
        <div class="editor-section-title">PROPRIEDADES DA CARTA</div>
        
        <div class="card-sub-tabs" style="display:flex; gap:5px; margin-bottom:15px; background:rgba(255,255,255,0.05); padding:4px; border-radius:10px;">
          <button class="card-sub-tab ${this.cardSubMode === 'basico' ? 'active' : ''}" data-sub="basico">BÁSICO</button>
          <button class="card-sub-tab ${this.cardSubMode === 'aparencia' ? 'active' : ''}" data-sub="aparencia">VISUAL</button>
          <button class="card-sub-tab ${this.cardSubMode === 'estetica' ? 'active' : ''}" data-sub="estetica">ESTILO</button>
          <button class="card-sub-tab ${this.cardSubMode === 'efeitos' ? 'active' : ''}" data-sub="efeitos">EFEITOS</button>
        </div>

        <div class="card-sub-tab-content" style="flex:1; overflow-y:auto; padding-right:10px;">
          ${this.renderCardSubTabContent()}
        </div>

        <div style="margin-top:20px; display:flex; gap:10px;">
           <button id="btn-delete-card" class="editor-btn-secondary" style="flex:0.5; color:#ff4444; border-color:#ff4444">DELETAR</button>
           <button id="btn-save-templates" class="editor-btn-primary" style="flex:1.5">💾 SALVAR NO CÓDIGO</button>
        </div>
      </div>

      <!-- RIGHT: Live Preview -->
      <div class="editor-preview-panel">
         <div class="editor-section-title" style="display:flex; justify-content:space-between; align-items:center;">
            <span>ESTAÇÃO DE VISUALIZAÇÃO</span>
            <div class="preview-mode-toggle" style="display:flex; gap:5px; background:rgba(255,255,255,0.05); padding:4px; border-radius:8px;">
               <button class="mode-btn ${this.previewMode === 'static' ? 'active' : ''}" data-pm="static" title="Capa Estática (Mão/Deck/Tabuleiro)" style="font-size:0.6rem; padding:6px 12px; border-radius:6px; border:none; background:${this.previewMode === 'static' ? '#51c5ff' : 'transparent'}; color:${this.previewMode === 'static' ? '#000' : '#fff'}; cursor:pointer; font-weight:950; transition:0.2s;">🖼️ DECK/BOARD</button>
               <button class="mode-btn ${this.previewMode === 'video' ? 'active' : ''}" data-pm="video" title="High-Fidelity (Theater/Intro)" style="font-size:0.6rem; padding:6px 12px; border-radius:6px; border:none; background:${this.previewMode === 'video' ? '#51c5ff' : 'transparent'}; color:${this.previewMode === 'video' ? '#000' : '#fff'}; cursor:pointer; font-weight:950; transition:0.2s;">🎬 TEATRO/VÍDEO</button>
            </div>
         </div>
         
         <div id="preview-container" style="display:flex; flex-direction:column; gap:20px; align-items:center;">
            <!-- Main Preview Box -->
            <div class="preview-scale-wrapper" id="preview-wrapper" style="position:relative;">
              <!-- Rendered via BoardScreen -->
            </div>
            
            <button id="btn-test-special" class="editor-btn-secondary" style="border-color:#a335ee; color:#a335ee; font-weight:900; background:rgba(163,53,238,0.1); display:none; padding:8px 16px;">▶️ TESTAR ATAQUE ESPECIAL</button>

            <!-- Context Swatches -->
            <div style="display:flex; gap:15px; width:100%; justify-content:center; padding:15px; background:rgba(255,255,255,0.02); border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
               <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                  <span style="font-size:0.6rem; color:#888; font-weight:900;">MÃO / DECK</span>
                  <div id="preview-hand" style="width:70px; height:100px; background:rgba(0,0,0,0.5); border-radius:6px; overflow:hidden;"></div>
               </div>
               <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                  <span style="font-size:0.6rem; color:#888; font-weight:900;">NO CAMPO</span>
                  <div id="preview-board" style="width:100px; height:140px; background:rgba(0,0,0,0.5); border-radius:8px; overflow:hidden;"></div>
               </div>
            </div>
         </div>

         <div style="margin-top:15px; font-size:0.7rem; color:#888; text-align:center; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px;">
            ⚠️ <strong>MODO ${this.previewMode.toUpperCase()} ATIVO:</strong> ${this.previewMode === 'static' ? 'Mostrando a Capa Estática usada para otimização em jogo.' : 'Mostrando o loop de vídeo usado em eventos especiais e visão imersiva.'}
         </div>
      </div>
    `;
  }

  private renderAssetsMode(): string {
    const categories: { id: string, label: string }[] = [
      { id: 'all', label: '📂 TODOS' },
      { id: 'card_art', label: '🎨 ARTES' },
      { id: 'card_bg', label: '🖼️ FUNDOS' },
      { id: 'artifact', label: '🏺 ARTEFATOS' },
      { id: 'ability', label: '✨ PASSIVAS' },
      { id: 'board_bg', label: '🏔️ CENÁRIOS' },
      { id: 'svg_pop', label: '📦 SVGs/UI' },
      { id: 'avatar_border', label: '👤 BORDAS' }
    ];

    return `
      <div class="editor-form-panel" style="flex: 1; align-items:flex-start;">
        <div class="editor-section-title" style="display:flex; justify-content:space-between; width:100%; align-items:center;">
          <div style="display:flex; align-items:center; gap:15px;">
            <span>BIBLIOTECA DE ATIVOS</span>
            <button id="btn-toggle-selection" class="editor-btn-secondary" style="font-size:0.6rem; border-color:${this.selectionMode ? '#ffd700' : '#888'}; color:${this.selectionMode ? '#ffd700' : '#888'};">
              ${this.selectionMode ? '🚫 CANCELAR SELEÇÃO' : '📑 SELEÇÃO EM MASSA'}
            </button>
          </div>
          <div style="display:flex; gap:10px;">
            <button id="btn-import-media" class="editor-btn-secondary" style="font-size:0.7rem;">+ IMPORTAR DO PC</button>
            <input type="file" id="inp-media-bulk" multiple accept="image/*,video/*,image/svg+xml" style="display:none">
          </div>
        </div>

        <!-- BULK ACTIONS BAR -->
        ${this.selectionMode ? `
          <div class="bulk-actions-bar glass-panel" style="width:100%; padding:15px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; border-color:#ffd700;">
            <div style="font-weight:900; color:#ffd700; font-size:0.8rem;">
              ${this.selectedAssetSet.size} ITENS SELECIONADOS
            </div>
            <div style="display:flex; gap:10px;">
              <select id="bulk-category-select" class="editor-input" style="font-size:0.7rem; padding:5px 10px;">
                <option value="">MOVER PARA...</option>
                ${categories.filter(c => c.id !== 'all').map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
              </select>
              <button id="btn-bulk-delete" class="editor-btn-secondary" style="color:#ff4444; border-color:#ff4444; font-size:0.7rem;">🗑️ DELETAR SELEÇÃO</button>
              <button id="btn-bulk-shop" class="editor-btn-primary btn-premium-shop" style="font-size:0.7rem;">💎 TORNAR ITENS DE LOJA</button>
            </div>
          </div>
        ` : ''}

        <!-- CATEGORY FILTERS -->
        <div class="assets-filter-bar" style="display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap;">
           ${categories.map(cat => `
             <button class="filter-tab ${this.selectedAssetCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
               ${cat.label}
             </button>
           `).join('')}
        </div>

        <div class="assets-grid-editor" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap:15px; width:100%; overflow-y:auto; padding-right:10px; max-height: 60vh;">
          ${this.availableCards.filter(url => {
            if (!this.selectedAssetCategory || this.selectedAssetCategory === 'all') return true;
            return this.assetRegistry[url]?.category === this.selectedAssetCategory;
          }).map(url => {
            const isVid = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url);
            const reg = this.assetRegistry[url] || {};
            const catLabel = categories.find(c => c.id === reg.category)?.label?.split(' ')[1] || '???';
            const isSelected = this.selectionMode ? this.selectedAssetSet.has(url) : (this.selectedAssetUrl === url);
            const itemClasses = `asset-item ${isSelected ? (this.selectionMode ? 'selected-in-mass' : 'active') : ''}`;
            
            return `
              <div class="${itemClasses}" data-url="${url}" style="position:relative; background:rgba(255,255,255,0.05); border-radius:10px; overflow:hidden; border:1px solid ${isSelected ? (this.selectionMode ? '#ffd700' : '#51c5ff') : '#333'}; cursor:pointer; transition:0.2s; box-shadow:${isSelected ? (this.selectionMode ? '0 0 15px rgba(255,215,0,0.3)' : '0 0 15px rgba(81,197,255,0.3)') : 'none'};">
                <div class="asset-thumb" style="height:140px; width:100%; background:url('${isVid ? '' : url}') center/cover no-repeat">
                   ${isVid ? `<video src="${url}" style="width:100%; height:100%; object-fit:cover" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>` : ''}
                   <div class="asset-category-badge" style="position:absolute; top:5px; left:5px; background:rgba(0,0,0,0.7); color:#51c5ff; font-size:0.5rem; padding:2px 6px; border-radius:4px; font-weight:900;">${catLabel}</div>
                </div>
                <div class="asset-meta" style="padding:8px; font-size:0.65rem; color:#888; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                   ${url.split('/').pop()}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- RIGHT: Art Preview / Meta -->
      <div class="editor-preview-panel glass-panel" style="flex:0.6; min-width:300px; display:flex; flex-direction:column; gap:15px; border-radius:0; border-top:none; border-bottom:none;">
         <div class="editor-section-title">GESTOR DE ATIVO</div>
         <div id="art-preview-large" style="width:100%; aspect-ratio:1/1; background:#000; border-radius:15px; overflow:hidden; border:1px solid #444; position:relative; display:flex; align-items:center; justify-content:center; box-shadow: inset 0 0 20px rgba(0,0,0,0.5);">
            <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#444">Selecione uma arte</div>
         </div>
         
         <div id="asset-management-form" style="display:none;">
            <div class="form-group">
               <label>Classe do Ativo</label>
               <select id="asset-type-select" class="editor-input">
                  ${categories.filter(c => c.id !== 'all').map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
               </select>
            </div>
            
            <div style="margin-top:10px; display:flex; flex-direction:column; gap:10px;">
               <button id="btn-make-shop-item" class="editor-btn-primary btn-premium-shop" style="width:100%">💎 TORNAR ITEM DE LOJA</button>
               <div id="asset-availability-placeholder"></div>
            </div>

            <div style="margin-top:20px; display:flex; flex-direction:column; gap:10px;">
               <button id="btn-create-from-asset" class="editor-btn-primary" style="width:100%">⚡ CRIAR CARTA COM ESTA ARTE</button>
               <button id="btn-delete-asset" class="editor-btn-secondary" style="width:100%; color:#ff4444; border-color:#ff4444; background:rgba(255,68,68,0.05); font-weight:900;">🗑️ DELETAR PERMANENTEMENTE</button>
            </div>
         </div>
      </div>
    `;
  }

  private bindAssetsMode(container: HTMLElement) {
    // Selection Mode Toggle
    container.querySelector('#btn-toggle-selection')?.addEventListener('click', () => {
      this.selectionMode = !this.selectionMode;
      if (!this.selectionMode) this.selectedAssetSet.clear();
      this.reRender();
    });

    // Bulk Category Move
    const bulkCatSelect = container.querySelector('#bulk-category-select') as HTMLSelectElement;
    bulkCatSelect?.addEventListener('change', () => {
      const newCat = bulkCatSelect.value;
      if (!newCat) return;

      this.selectedAssetSet.forEach(url => {
        if (!this.assetRegistry[url]) this.assetRegistry[url] = {};
        this.assetRegistry[url].category = newCat;
      });

      this.saveAssetRegistry();
      this.reRender();
      this.showToast(`🚀 ${this.selectedAssetSet.size} itens movidos para ${newCat}!`);
    });

    // Bulk Delete
    container.querySelector('#btn-bulk-delete')?.addEventListener('click', async () => {
      if (this.selectedAssetSet.size === 0) return;
      if (confirm(`⚠️ ATENÇÃO: Deseja deletar PERMANENTEMENTE ${this.selectedAssetSet.size} arquivos?`)) {
        for (const url of Array.from(this.selectedAssetSet)) {
          await fetch('/api/delete-media', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          delete this.assetRegistry[url];
        }
        this.selectedAssetSet.clear();
        this.saveAssetRegistry();
        await this.loadAvailableImages();
        this.reRender();
        this.showToast('🗑️ Delecion em massa concluída!');
      }
    });

    // Bulk Shop
    container.querySelector('#btn-bulk-shop')?.addEventListener('click', () => {
       this.selectedAssetSet.forEach(url => {
         if (!this.assetRegistry[url]) this.assetRegistry[url] = {};
         this.assetRegistry[url].shop = { type: 'store', price: 100, currency: 'gold' };
         this.syncAssetWithStore(url);
       });
       this.saveAssetRegistry();
       this.selectionMode = false;
       this.selectedAssetSet.clear();
       this.reRender();
       this.showToast(`💎 ${this.selectedAssetSet.size} itens agora estão na LOJA!`);
    });

    // Category Filters
    container.querySelectorAll('.filter-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedAssetCategory = (btn as HTMLElement).dataset.cat || 'all';
        this.reRender();
      });
    });

    // Asset Selection
    container.querySelectorAll('.asset-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = (item as HTMLElement).dataset.url!;
        
        if (this.selectionMode) {
          if (this.selectedAssetSet.has(url)) this.selectedAssetSet.delete(url);
          else this.selectedAssetSet.add(url);
          this.reRender();
        } else {
          this.selectedAssetUrl = url;
          this.updateAssetManagementUI(container, url);
        }
      });
    });

    const btnImport = container.querySelector('#btn-import-media');
    const inpMedia = container.querySelector('#inp-media-bulk') as HTMLInputElement;

    btnImport?.addEventListener('click', () => inpMedia.click());
    inpMedia?.addEventListener('change', async () => {
      if (inpMedia.files && inpMedia.files.length > 0) {
        this.showToast(`Importando ${inpMedia.files.length} arquivos...`, '#51c5ff');
        for (const file of Array.from(inpMedia.files)) {
          const formData = new FormData();
          formData.append('media', file);
          try {
            const resp = await fetch('/api/upload-media', { method: 'POST', body: formData });
            const json = await resp.json();
            if (json.success) {
              const filename = `/cards/${file.name}`;
              if (!this.availableCards.includes(filename)) this.availableCards.push(filename);
            }
          } catch (err) { console.error(err); }
        }
        this.reRender();
        this.showToast('Importação concluída!', '#4cff88');
      }
    });

    // Creation from asset (Logic move in updateAssetManagementUI)
  }

  private renderHabilidadesMode(): string {
    return `
      <div class="editor-list-panel" style="flex:0.8">
        <div class="editor-section-title">HABILIDADES PASSIVAS (${this.abilities.length})</div>
        <div class="editor-card-list">
          <div class="ars-artifact-grid" style="padding:10px; overflow-y:auto;">
            ${this.abilities.map((a, i) => `
              <div class="ars-artifact-item ${i === this.selectedAbilityIdx ? 'active' : ''}" data-type="ability" data-idx="${i}">
                 <div class="ars-artifact-image" style="${a.image ? `background-image:url('${a.image}')` : ''}; background-color:${a.color}22; border:1px solid ${a.color}88;">
                   ${a.image ? '' : a.icon}
                 </div>
                 <div class="ars-artifact-content">
                   <div class="ars-artifact-name" style="color:${a.color}">${a.name}</div>
                   <div style="font-size:0.6rem; opacity:0.6;">${a.triggerText}</div>
                   ${a.availability?.type === 'store' ? '<span class="shop-badge">🛒 LOJA</span>' : ''}
                 </div>
              </div>
            `).join('')}
          </div>
          <button class="editor-btn-add" id="btn-add-ability" style="margin:10px;">+ NOVA HABILIDADE</button>
        </div>
      </div>

      <div class="editor-form-panel" style="flex:1.2">
         <div class="editor-section-title">DETALHES DA HABILIDADE: ${this.abilities[this.selectedAbilityIdx]?.name || 'NADA'}</div>
         
         <div style="background:rgba(255,215,0,0.05); padding:15px; border-radius:12px; border:1px solid rgba(255,215,0,0.2); margin-bottom:15px;">
            <button id="btn-ability-make-shop" class="editor-btn-primary btn-premium-shop" style="width:100%; margin-bottom:10px;">💎 TORNAR HABILIDADE ITEM DE LOJA</button>
            <div id="availability-ability-placeholder"></div>
         </div>

         <div id="ability-editor-content"></div>
         <div style="margin-top:auto">
            <button id="btn-save-abilities" class="editor-btn-primary" style="width:100%">💾 SALVAR HABILIDADES</button>
         </div>
      </div>
    `;
  }

  private renderArtefatosMode(): string {
    return `
      <div class="editor-list-panel" style="flex:0.8">
        <div class="editor-section-title">ARTEFATOS / MAGIAS (${this.skills.length})</div>
        <div class="editor-card-list">
          <div class="ars-artifact-grid" style="padding:10px; overflow-y:auto;">
            ${this.skills.map((s, i) => `
              <div class="ars-artifact-item ${i === this.selectedSkillIdx ? 'active' : ''}" data-type="skill" data-idx="${i}">
                 <div class="ars-artifact-image" style="${s.image ? `background-image:url('${s.image}')` : ''}">${s.image ? '' : s.icon}</div>
                 <div class="ars-artifact-content">
                   <div class="ars-artifact-name">${s.name}</div>
                   ${s.availability?.type === 'store' ? '<span class="shop-badge">🛒 LOJA</span>' : ''}
                 </div>
              </div>
            `).join('')}
          </div>
          <button class="editor-btn-add" id="btn-add-skill" style="margin:10px;">+ NOVO ARTEFATO</button>
        </div>
      </div>

      <div class="editor-form-panel" style="flex:1.2">
         <div class="editor-section-title">DETALHES DO ARTEFATO: ${this.skills[this.selectedSkillIdx]?.name || 'NADA'}</div>
         
         <div style="background:rgba(255,215,0,0.05); padding:15px; border-radius:12px; border:1px solid rgba(255,215,0,0.2); margin-bottom:15px;">
            <button id="btn-skill-make-shop" class="editor-btn-primary btn-premium-shop" style="width:100%; margin-bottom:10px;">💎 TORNAR ARTEFATO ITEM DE LOJA</button>
            <div id="availability-skill-placeholder"></div>
         </div>

         <div id="logic-editor-content"></div>
         <div style="margin-top:auto">
            <button id="btn-save-skills" class="editor-btn-primary" style="width:100%">💾 SALVAR ARTEFATOS</button>
         </div>
      </div>
    `;
  }


  private bindHabilidadesMode() {
    this.updateHabilidadeForm();
    const ab = this.abilities[this.selectedAbilityIdx];
    
    const placeholder = document.getElementById('availability-ability-placeholder');
    if (placeholder && ab) {
      if (!ab.availability) ab.availability = { type: 'always' };
      placeholder.innerHTML = this.renderAvailabilityForm(ab.availability);
      this.bindAvailabilityHandlers(ab.availability, placeholder, () => {
        this.syncItemWithStore('ability', ab.id);
      });
    }

    document.querySelectorAll('[data-type="ability"]').forEach(el => {
      el.addEventListener('click', () => {
        this.selectedAbilityIdx = parseInt((el as HTMLElement).dataset.idx!);
        this.reRender();
      });
    });

    document.getElementById('btn-add-ability')?.addEventListener('click', () => {
      this.abilities.push({ id: `custom_${Date.now()}` as any, name: 'Nova Habilidade', icon: '✨', description: '', triggerText: 'ATIVOU!', color: '#ffffff' });
      this.selectedAbilityIdx = this.abilities.length - 1;
      this.reRender();
    });

    this.bindSaveBtn('btn-save-abilities', '/api/save-abilities', this.abilities);
  }

  private updateHabilidadeForm() {
    const container = document.getElementById('ability-editor-content');
    if (!container) return;

    const a = this.abilities[this.selectedAbilityIdx];
    if (!a) return;

    container.innerHTML = `
      <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:12px; border:1px solid rgba(255,255,255,0.1)">
        <div class="form-group">
          <label>Nome da Habilidade</label>
          <input type="text" id="ab-name" class="editor-input" value="${a.name}">
        </div>
        
        <div class="form-row">
          <div class="form-group" style="flex:1">
            <label>Ícone / Mídia (Importar)</label>
            <div style="display:flex; gap:10px; align-items:center;">
               <div id="ab-media-preview" style="width:60px; height:60px; background:rgba(255,255,255,0.05); border-radius:10px; border:1px solid #444; display:flex; align-items:center; justify-content:center; overflow:hidden; font-size:1.5rem;">
                  ${a.image ? `<div style="width:100%; height:100%; background:url('${a.image}') center/cover no-repeat"></div>` : a.icon}
               </div>
               <button id="btn-pick-ability-media" class="editor-btn-secondary" style="height:60px; flex:1">MUDAR ÍCONE</button>
            </div>
          </div>
          <div class="form-group" style="flex:1">
            <label>Cor Temática (Preview)</label>
            <input type="color" id="ab-color" class="editor-input" value="${a.color || '#ffffff'}" style="height:60px; padding:5px;">
          </div>
        </div>

        <div style="margin-top:20px;">
          <div class="blueprint-node">
            <div class="blueprint-header">⚡ GATILHO (TRIGGER)</div>
            <select id="ab-trigger" class="editor-input">
              <option value="on_play" ${a.trigger === 'on_play' ? 'selected' : ''}>AO ENTRAR EM CAMPO (On Play)</option>
              <option value="on_attack" ${a.trigger === 'on_attack' ? 'selected' : ''}>AO ATACAR (On Attack)</option>
              <option value="on_defend" ${a.trigger === 'on_defend' ? 'selected' : ''}>AO DEFENDER (On Defend)</option>
              <option value="on_death" ${a.trigger === 'on_death' ? 'selected' : ''}>AO MORRER (On Death)</option>
              <option value="on_turn_start" ${a.trigger === 'on_turn_start' ? 'selected' : ''}>INÍCIO DO TURNO (Turn Start)</option>
              <option value="on_turn_end" ${a.trigger === 'on_turn_end' ? 'selected' : ''}>FIM DO TURNO (Turn End)</option>
            </select>
          </div>

          <div class="blueprint-connector"></div>

          <div class="blueprint-node">
            <div class="blueprint-header">🕹️ LÓGICA E ALVO</div>
            <div class="form-row">
              <select id="ab-type" class="editor-input" style="flex:1">
                <option value="buff" ${a.logicType === 'buff' ? 'selected' : ''}>📈 BUFF (Bônus)</option>
                <option value="nerf" ${a.logicType === 'nerf' ? 'selected' : ''}>📉 NERF (Penalidade)</option>
                <option value="special" ${a.logicType === 'special' ? 'selected' : ''}>✨ ESPECIAL (Mecânica)</option>
              </select>
              <select id="ab-target" class="editor-input" style="flex:1">
                <option value="self" ${a.target === 'self' ? 'selected' : ''}>👤 PRÓPRIA CARTA</option>
                <option value="attacker" ${a.target === 'attacker' ? 'selected' : ''}>⚔️ ATACANTE</option>
                <option value="defender" ${a.target === 'defender' ? 'selected' : ''}>🛡️ DEFENSOR</option>
                <option value="opponent_board" ${a.target === 'opponent_board' ? 'selected' : ''}>👹 MESA INIMIGA</option>
                <option value="own_board" ${a.target === 'own_board' ? 'selected' : ''}>🛡️ TODA SUA MESA</option>
              </select>
            </div>
          </div>

          <div class="blueprint-connector"></div>

          <div class="blueprint-node">
            <div class="blueprint-header">📊 EFEITO E VALOR</div>
            <div class="form-row">
              <select id="ab-stat" class="editor-input" style="flex:1">
                <option value="pv" ${a.statType === 'pv' ? 'selected' : ''}>❤️ Vida (PV)</option>
                <option value="atk" ${a.statType === 'atk' ? 'selected' : ''}>⚔️ Ataque (ATK)</option>
                <option value="stun" ${a.statType === 'stun' ? 'selected' : ''}>⏳ Atordoar (Stun)</option>
                <option value="flip" ${a.statType === 'flip' ? 'selected' : ''}>🎴 Ocultar (Flip)</option>
              </select>
              <input type="number" id="ab-value" class="editor-input" style="flex:0.5" value="${a.value || 0}" step="0.1">
            </div>
          </div>
        </div>

        <div class="form-group" style="margin-top:10px;">
            <label>Texto de Gatilho (Popup)</label>
            <input type="text" id="ab-trigger-text" class="editor-input" value="${a.triggerText || ''}" placeholder="EX: DOBROU O ATAQUE!">
        </div>

        <div class="form-group">
          <label>Descrição (In-Game)</label>
          <textarea id="ab-desc" class="editor-input" rows="3" style="font-size:0.8rem">${a.description}</textarea>
        </div>
      </div>
    `;

    const update = () => {
      a.name = (document.getElementById('ab-name') as HTMLInputElement).value;
      a.color = (document.getElementById('ab-color') as HTMLInputElement).value;
      a.triggerText = (document.getElementById('ab-trigger-text') as HTMLInputElement).value;
      a.description = (document.getElementById('ab-desc') as HTMLTextAreaElement).value;
      
      a.trigger = (document.getElementById('ab-trigger') as HTMLSelectElement).value as any;
      a.logicType = (document.getElementById('ab-type') as HTMLSelectElement).value as any;
      a.target = (document.getElementById('ab-target') as HTMLSelectElement).value as any;
      a.statType = (document.getElementById('ab-stat') as HTMLSelectElement).value as any;
      a.value = parseFloat((document.getElementById('ab-value') as HTMLInputElement).value);

      this.updateListLabels();
    };

    ['ab-name', 'ab-color', 'ab-trigger-text', 'ab-desc', 'ab-trigger', 'ab-type', 'ab-target', 'ab-stat', 'ab-value'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', update);
    });

    document.getElementById('btn-pick-ability-media')?.addEventListener('click', () => {
      this.openMediaPicker(url => {
        a.image = url;
        this.reRender();
      });
    });

    document.getElementById('btn-ability-make-shop')?.addEventListener('click', () => {
       if (!a.availability) a.availability = { type: 'store', price: 100, currency: 'gold' };
       else a.availability.type = 'store';
       this.syncItemWithStore('ability', a.id);
       this.reRender();
    });
  }

  private bindArtefatosMode() {
    this.updateLogicForm();
    const s = this.skills[this.selectedSkillIdx];
    
    const placeholder = document.getElementById('availability-skill-placeholder');
    if (placeholder && s) {
      if (!s.availability) s.availability = { type: 'always' };
      placeholder.innerHTML = this.renderAvailabilityForm(s.availability);
      this.bindAvailabilityHandlers(s.availability, placeholder, () => {
        this.syncItemWithStore('artifact', s.id);
      });
    }

    document.querySelectorAll('[data-type="skill"]').forEach(el => {
      el.addEventListener('click', () => {
        this.selectedSkillIdx = parseInt((el as HTMLElement).dataset.idx!);
        this.reRender();
      });
    });

    document.getElementById('btn-add-skill')?.addEventListener('click', () => {
      this.skills.push({ id: `skill_${Date.now()}`, name: 'Nova Magia', icon: '🪄', effect: 'burn', category: 'arcane', group: 'offensive', description: '', flavorText: '', power: 100 });
      this.selectedSkillIdx = this.skills.length - 1;
      this.reRender();
    });

    this.bindSaveBtn('btn-save-skills', '/api/save-skills', this.skills);
  }




  private updateLogicForm() {
    const container = document.getElementById('logic-editor-content');
    if (!container) return;

    // We can be editing either a passive ability (Abilities) or an active skill (Skills)
    // For now, let's prioritize Skills as requested for the "Art Creator" behavior
    const s = this.skills[this.selectedSkillIdx];

    container.innerHTML = `
      <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:12px; border:1px solid rgba(255,255,255,0.1)">
        <div class="form-group">
          <label>Nome da Arte / Magia</label>
          <input type="text" id="sk-name" class="editor-input" value="${s.name}">
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:1">
            <label>Ícone / Mídia (Importar)</label>
            <div style="display:flex; gap:10px; align-items:center;">
               <div id="sk-media-preview" style="width:60px; height:60px; background:rgba(255,255,255,0.05); border-radius:10px; border:1px solid #444; display:flex; align-items:center; justify-content:center; overflow:hidden; font-size:1.5rem;">
                  ${s.image ? `<div style="width:100%; height:100%; background:url('${s.image}') center/cover no-repeat"></div>` : s.icon}
               </div>
               <button id="btn-pick-skill-media" class="editor-btn-secondary" style="height:60px; flex:1">MUDAR ÍCONE</button>
            </div>
          </div>
        </div>
        <div class="form-group" style="margin-top:10px;">
            <label>ID (Sistema)</label>
            <input type="text" id="sk-id" class="editor-input" value="${s.id}" readonly>
        </div>

        <div style="margin:20px 0; padding:15px; background:rgba(0,0,0,0.2); border-radius:10px; border-left:4px solid #51c5ff;">
           <label style="color:#51c5ff; font-weight:bold; margin-bottom:10px; display:block;">⚙️ COMPORTAMENTO (BUFF/NERF)</label>
           
           <div class="form-row">
              <div class="form-group" style="flex:1">
                <label>Tipo de Lógica</label>
                <select id="sk-logic" class="editor-input">
                   <option value="buff" ${s.logicType === 'buff' ? 'selected' : ''}>📈 BUFF (Aumento/Positivo)</option>
                   <option value="nerf" ${s.logicType === 'nerf' ? 'selected' : ''}>📉 NERF (Redução/Negativo)</option>
                </select>
              </div>
              <div class="form-group" style="flex:1">
                <label>Alvo</label>
                <select id="sk-target" class="editor-input">
                   <option value="user" ${s.target === 'user' ? 'selected' : ''}>👤 VOCÊ (Aliado)</option>
                   <option value="opponent" ${s.target === 'opponent' ? 'selected' : ''}>👹 OPONENTE (Inimigo)</option>
                </select>
              </div>
           </div>

           <div class="form-row" style="margin-top:10px;">
              <div class="form-group" style="flex:1">
                <label>Atributo Afetado</label>
                <select id="sk-stat" class="editor-input">
                   <option value="pv" ${s.statType === 'pv' ? 'selected' : ''}>❤️ Vida (PV)</option>
                   <option value="atk" ${s.statType === 'atk' ? 'selected' : ''}>⚔️ Ataque (ATK)</option>
                   <option value="turns" ${s.statType === 'turns' ? 'selected' : ''}>⏳ Turnos / Ações</option>
                   <option value="hand" ${s.statType === 'hand' ? 'selected' : ''}>🎴 Mão / Compra</option>
                </select>
              </div>
              <div class="form-group" style="flex:1">
                <label>Valor / Poder</label>
                <input type="number" id="sk-power" class="editor-input" value="${s.power || 0}">
              </div>
           </div>
        </div>

        <div class="form-group">
          <label>Descrição (In-Game)</label>
          <textarea id="sk-desc" class="editor-input" rows="2" style="font-size:0.8rem">${s.description}</textarea>
        </div>
        <div class="form-group">
          <label>Lore / Flavor Text</label>
          <textarea id="sk-flavor" class="editor-input" rows="2" style="font-size:0.8rem; color:#888;">${s.flavorText}</textarea>
        </div>
      </div>
    `;

    const update = () => {
      s.name = (document.getElementById('sk-name') as HTMLInputElement).value;
      s.logicType = (document.getElementById('sk-logic') as HTMLSelectElement).value as any;
      s.target = (document.getElementById('sk-target') as HTMLSelectElement).value as any;
      s.statType = (document.getElementById('sk-stat') as HTMLSelectElement).value as any;
      s.power = parseInt((document.getElementById('sk-power') as HTMLInputElement).value);
      s.description = (document.getElementById('sk-desc') as HTMLTextAreaElement).value;
      s.flavorText = (document.getElementById('sk-flavor') as HTMLTextAreaElement).value;

      // Sync effect for legacy engine if needed
      if (s.logicType === 'nerf' && s.statType === 'pv') s.effect = 'burn';
      else if (s.logicType === 'buff' && s.statType === 'pv') s.effect = 'drain';
      else if (s.statType === 'turns') s.effect = 'stun';
      else if (s.statType === 'hand') s.effect = 'draw';
      
      this.showToast('Lógica atualizada localmente', '#51c5ff');
    };

    ['sk-name', 'sk-logic', 'sk-target', 'sk-stat', 'sk-power', 'sk-desc', 'sk-flavor'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', update);
    });

    document.getElementById('btn-pick-skill-media')?.addEventListener('click', () => {
      this.openMediaPicker(url => {
        s.image = url;
        this.reRender();
      });
    });
  }

  private openMediaPicker(onSelect: (url: string) => void) {
    const modal = document.createElement('div');
    modal.className = 'media-picker-modal';
    modal.style.cssText = `position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,0.9); backdrop-filter:blur(20px); display:flex; align-items:center; justify-content:center; padding:40px;`;
    
    modal.innerHTML = `
      <div class="media-picker-content" style="background:#181922; border:1px solid #333; border-radius:20px; width:100%; max-width:1000px; height:80vh; display:flex; flex-direction:column; overflow:hidden;">
        <header style="padding:20px; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center;">
          <h3 style="margin:0; font-weight:900; letter-spacing:1px; color:#51c5ff;">GALERIA DE ATIVOS</h3>
          <div style="display:flex; gap:10px;">
            <button id="picker-btn-upload" class="editor-btn-secondary" style="font-size:0.7rem;">+ IMPORTAR NOVO</button>
            <button id="picker-btn-close" class="editor-btn-secondary" style="border-radius:50%; width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center;">&times;</button>
          </div>
          <input type="file" id="picker-inp-file" style="display:none" accept="image/*,video/*,image/svg+xml">
        </header>

        <div class="picker-grid" style="flex:1; padding:20px; overflow-y:auto; display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:15px;">
          ${this.availableCards.map(url => {
            const isVid = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url);
            return `
              <div class="picker-item" data-url="${url}" style="aspect-ratio:1; background:rgba(0,0,0,0.3); border-radius:10px; overflow:hidden; border:2px solid transparent; cursor:pointer; position:relative;">
                ${isVid ? `<video src="${url}" style="width:100%; height:100%; object-fit:cover" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>` : `<div style="width:100%; height:100%; background:url('${url}') center/cover no-repeat"></div>`}
                <div style="position:absolute; bottom:5px; left:5px; right:5px; font-size:0.55rem; color:#aaa; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; background:rgba(0,0,0,0.5); padding:2px 4px; border-radius:4px;">${url.split('/').pop()}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('#picker-btn-close')?.addEventListener('click', close);

    modal.querySelectorAll('.picker-item').forEach(el => {
      el.addEventListener('click', () => {
        const url = (el as HTMLElement).dataset.url!;
        onSelect(url);
        if (this.currentMode !== 'scenarios') {
            this.autoSaveCurrentMode();
        }
        close();
      });
    });

    const fileInp = modal.querySelector('#picker-inp-file') as HTMLInputElement;
    modal.querySelector('#picker-btn-upload')?.addEventListener('click', () => fileInp.click());

    fileInp.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Simulando upload
        const fakeUrl = `/cards/${file.name}`;
        if (!this.availableCards.includes(fakeUrl)) this.availableCards.push(fakeUrl);
        
        // Abrir diálogo de classificação
        this.showClassificationDialog(fakeUrl, (category) => {
            this.showToast(`Importado como ${category.toUpperCase()}`, '#51c5ff');
            onSelect(fakeUrl);
            if (this.currentMode !== 'scenarios') {
                this.autoSaveCurrentMode();
            }
            close();
        });
      }
    });
  }

  private showClassificationDialog(url: string, onDone: (category: string) => void) {
    const dialog = document.createElement('div');
    dialog.className = 'classification-backdrop';
    const isVid = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url);

    dialog.innerHTML = `
      <div class="classification-content">
        <h2 style="margin:0 0 10px 0; color:#51c5ff; font-weight:900;">CLASSIFICAR ATIVO</h2>
        <p style="color:#888; font-size:0.8rem;">O que este ativo representa no jogo?</p>
        
        <div style="display:flex; gap:20px; align-items:center; margin:20px 0; background:rgba(0,0,0,0.2); padding:15px; border-radius:15px;">
           <div style="width:120px; height:120px; border-radius:12px; overflow:hidden; border:2px solid #333;">
              ${isVid ? `<video src="${url}" style="width:100%; height:100%; object-fit:cover" muted autoplay loop></video>` : `<div style="width:100%; height:100%; background:url('${url}') center/cover no-repeat"></div>`}
           </div>
           <div style="flex:1; overflow:hidden;">
              <div style="color:#fff; font-weight:bold; word-break:break-all;">${url.split('/').pop()}</div>
              <div style="font-size:0.7rem; color:#51c5ff;">PREVIEW EM TEMPO REAL</div>
           </div>
        </div>

        <div class="category-grid">
           <button class="category-btn" data-cat="card_bg">🖼️ FUNDO DE CARTA <span>Para texturas de fundo</span></button>
           <button class="category-btn" data-cat="card_art">🎨 ARTE DE CARTA <span>Personagens e monstros</span></button>
           <button class="category-btn" data-cat="artifact">🏺 ARTEFATO <span>Magias e Ativos</span></button>
           <button class="category-btn" data-cat="ability">✨ HABILIDADE <span>Ícones de Passivas</span></button>
           <button class="category-btn" data-cat="board_bg">🏔️ FUNDO MESA <span>Cenários de Batalha</span></button>
           <button class="category-btn" data-cat="svg_pop">📦 SVG POPUP <span>Componentes de UI</span></button>
        </div>

        <button id="btn-confirm-classification" class="editor-btn-primary" style="width:100%; margin-top:30px;" disabled>CONFIRMAR E IMPORTAR</button>
      </div>
    `;

    document.body.appendChild(dialog);

    let selectedCat = '';
    const confirmBtn = dialog.querySelector('#btn-confirm-classification') as HTMLButtonElement;

    dialog.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        dialog.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedCat = (btn as HTMLElement).dataset.cat!;
        confirmBtn.disabled = false;
      });
    });

    confirmBtn.addEventListener('click', () => {
      dialog.remove();
      onDone(selectedCat);
    });
  }

  private renderStoreMode(): string {
    return `
      <div class="editor-list-panel" style="flex:0.8">
        <div class="editor-section-title">ITENS DA LOJA (${this.storeItems.length})</div>
        <div class="editor-card-list">
          ${this.storeItems.map((item, i) => `
            <div class="editor-list-item ${i === this.selectedIndex ? 'active' : ''}" data-type="store" data-idx="${i}">
              <div class="list-item-img" style="background-image:url('${item.image || item.icon}')"></div>
              <div class="list-item-info">
                <div class="list-item-name">${item.name}</div>
                <div class="list-item-stats">${item.price} ${item.currency === 'gold' ? '🟡' : '💎'}</div>
              </div>
            </div>
          `).join('')}
          <button id="btn-add-store-item" class="editor-btn-add">+ NOVO ITEM</button>
        </div>
      </div>

      <div class="editor-form-panel" style="flex:1.2">
        <div class="editor-section-title">DETALHES DO ITEM: ${this.storeItems[this.selectedIndex]?.name || 'NOVO'}</div>
        ${this.storeItems[this.selectedIndex] ? `
          <div class="form-group">
            <label>Nome na Vitrine</label>
            <input type="text" id="st-name" class="editor-input" value="${this.storeItems[this.selectedIndex].name}">
          </div>
          <div class="form-row">
            <div class="form-group" style="flex:1">
              <label>Preço</label>
              <input type="number" id="st-price" class="editor-input" value="${this.storeItems[this.selectedIndex].price}">
            </div>
            <div class="form-group" style="flex:1">
              <label>Moeda</label>
              <select id="st-currency" class="editor-input">
                <option value="gold" ${this.storeItems[this.selectedIndex].currency === 'gold' ? 'selected' : ''}>🟡 GOLD</option>
                <option value="gems" ${this.storeItems[this.selectedIndex].currency === 'gems' ? 'selected' : ''}>💎 GEMAS</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Conteúdo (ID de Referência)</label>
            <input type="text" id="st-itemid" class="editor-input" value="${this.storeItems[this.selectedIndex].itemId}" placeholder="ex: card_ogre_01">
          </div>
          <div class="form-group">
            <label>Foto de Vitrine (Importar)</label>
            <div style="display:flex; gap:10px; align-items:center;">
              <div id="st-image-preview" style="width:100px; height:100px; background:rgba(255,255,255,0.05); border-radius:10px; background-image:url('${this.storeItems[this.selectedIndex].image || ''}'); background-size:cover; background-position:center;"></div>
              <button id="btn-pick-store-image" class="editor-btn-secondary">IMPORTAR / GALERIA</button>
            </div>
          </div>
          <div class="form-group">
            <label>Descrição Curta</label>
            <textarea id="st-desc" class="editor-input" rows="3">${this.storeItems[this.selectedIndex].description}</textarea>
          </div>
          <div style="margin-top:auto">
            <button id="btn-save-store" class="editor-btn-primary" style="width:100%">💾 SALVAR CATÁLOGO DE LOJA</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  private bindStoreMode() {
    document.querySelectorAll('[data-type="store"]').forEach(el => {
      el.addEventListener('click', () => {
        this.selectedIndex = parseInt((el as HTMLElement).dataset.idx!);
        this.reRender();
      });
    });

    document.getElementById('btn-pick-store-image')?.addEventListener('click', () => {
      this.openMediaPicker(url => {
        this.storeItems[this.selectedIndex].image = url;
        this.reRender();
      });
    });

    const update = () => {
      const item = this.storeItems[this.selectedIndex];
      if (!item) return;
      item.name = (document.getElementById('st-name') as HTMLInputElement).value;
      item.price = parseInt((document.getElementById('st-price') as HTMLInputElement).value);
      item.currency = (document.getElementById('st-currency') as HTMLSelectElement).value;
      item.itemId = (document.getElementById('st-itemid') as HTMLInputElement).value;
      item.description = (document.getElementById('st-desc') as HTMLTextAreaElement).value;
    };

    ['st-name', 'st-price', 'st-currency', 'st-itemid', 'st-desc'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', update);
    });

    this.bindSaveBtn('btn-save-store', '/api/save-store', this.storeItems);
  }




  private renderScenariosMode(): string {

    const screens = [
      { id: 'lobby', label: 'TELA INICIAL / LOBBY' },
      { id: 'battle', label: 'TABULEIRO DE BATALHA (Duelo)' },
      { id: 'map', label: 'MAPA / EXPLORAÇÃO' },
      { id: 'academy', label: 'ACADEMIA / TREINO' },
      { id: 'arsenal', label: 'ARSENAL / DECK BUILDER' },
      { id: 'preparation', label: 'PREPARAÇÃO DE BATALHA' },
      { id: 'store', label: 'LOJA DE ITENS' },
      { id: 'difficulty', label: 'DIFICULDADE DA BATALHA' },
      { id: 'coin_flip', label: 'CARA OU COROA / SORTE' }
    ];

    const sIdx = Math.min(this.selectedIndex, screens.length - 1);
    const s = screens[sIdx];
    
    // Recovery of metadata for UI (we store it in memory on the scenarios obj, but it might not be strictly saved if it's missing)
        if (!(this.scenarios as any).__meta) (this.scenarios as any).__meta = {};
        if (!(this.scenarios as any).__meta[s.id]) {
            (this.scenarios as any).__meta[s.id] = {
               mode: 'image', url: '',
               gradFn: 'linear-gradient', gradDir: 'to bottom', gradC1: '#000000', gradC2: '#222222',
               patType: 'none', patC: '#ffffff', patOpacity: 20,
               layers: ['pat', 'grad', 'img'] // Default order
            };
        }
        const meta = (this.scenarios as any).__meta[s.id];
        if (!meta.layers) meta.layers = ['pat', 'grad', 'img'];

    return `
      <div class="editor-list-panel" style="flex:0.8; max-width:280px; border-right:1px solid rgba(255,255,255,0.05); padding-right:10px;">
         <div class="editor-section-title">TELAS DO JOGO</div>
         <div class="editor-card-list">
           ${screens.map((screen, i) => `
              <div class="editor-list-item ${i === sIdx ? 'active' : ''}" data-idx="${i}" data-type="scenario" style="padding:15px; border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
                 <div class="list-item-name" style="font-size:0.8rem;">${screen.label}</div>
                 <div style="display:flex; gap:5px;">
                    <button class="btn-copy-scn" data-idx="${i}" style="background:rgba(255,255,255,0.1); border:none; border-radius:4px; padding:4px; cursor:pointer; font-size:0.8rem;" title="Copiar Estilo">📄</button>
                    ${this.scenarioClipboard ? `
                       <button class="btn-paste-scn" data-idx="${i}" style="background:rgba(81,197,255,0.2); border:1px solid #51c5ff; border-radius:4px; padding:4px; cursor:pointer; font-size:0.8rem;" title="Colar Estilo">📋</button>
                    ` : ''}
                 </div>
              </div>
           `).join('')}
         </div>
      </div>

      <div class="editor-form-panel" style="flex:1.5; background:rgba(20,20,30,0.6); backdrop-filter:blur(20px); border-radius:15px; border:1px solid rgba(255,255,255,0.05); position:relative; flex-direction:row; gap:20px;">
        
        <!-- Left Side: Controls -->
        <div style="flex:1; display:flex; flex-direction:column;">
            <div class="editor-section-title" style="color:#51c5ff; font-size:1.1rem; text-shadow:0 0 10px rgba(81,197,255,0.5);">EDITANDO: ${s.label.split(' / ')[0]}</div>
            
            <!-- TABS & LAYER SORTING -->
            <div style="display:flex; flex-direction:column; gap:10px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:15px; margin-bottom:20px;">
               <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div style="display:flex; gap:5px; flex:1;">
                     <button class="editor-btn-secondary btn-scn-mode ${meta.mode === 'image' ? 'active-mode' : ''}" data-mode="image" style="flex:1; font-size: 0.7rem; padding: 5px;">🖼️ IMAGEM</button>
                     <button class="editor-btn-secondary btn-scn-mode ${meta.mode === 'grad_pat' ? 'active-mode' : ''}" data-mode="grad_pat" style="flex:1; font-size: 0.7rem; padding: 5px;">🎨 BASE+PADRÃO</button>
                     <button class="editor-btn-secondary btn-scn-mode ${meta.mode === 'mix' ? 'active-mode' : ''}" data-mode="mix" style="flex:1; font-size: 0.7rem; padding: 5px; background:linear-gradient(45deg,#ff4c4c,#51c5ff); border:none; color:white;">✨ MODO MISTO</button>
                  </div>
                  <div style="margin-left:10px;">
                     <button id="btn-import-scn-media" class="editor-btn-secondary" style="font-size:0.7rem; padding:10px; background:rgba(81,197,255,0.1); color:#51c5ff; border-color:#51c5ff;">+ IMPORTAR PC</button>
                     <input type="file" id="inp-scn-media" accept="image/*,video/*,.mp4,.webm,.mov,.m4v,.ogv" style="display:none">
                  </div>
               </div>

               <!-- LAYER REORDERING UI (Mix Mode Only) -->
               ${meta.mode === 'mix' ? `
               <div style="display:flex; align-items:center; gap:10px; background:rgba(0,0,0,0.3); padding:8px; border-radius:10px;">
                  <span style="font-size:0.6rem; color:#888; text-transform:uppercase; font-weight:900;">Ordem de Camadas (Topo p/ Base):</span>
                  <div id="scn-layer-sorter" style="display:flex; gap:5px;">
                     ${meta.layers.map((l: string, idx: number) => `
                        <div class="layer-pill" data-id="${l}" style="display:flex; align-items:center; gap:5px; background:rgba(255,255,255,0.1); padding:4px 10px; border-radius:20px; font-size:0.65rem; cursor:pointer;" title="Clique para mover">
                           <span>${l === 'pat' ? '🏁 PADRÃO' : l === 'grad' ? '🌈 GRADIENTE' : '🖼️ IMAGEM'}</span>
                           ${idx > 0 ? `<span class="btn-move-layer" data-dir="up" data-idx="${idx}" style="opacity:0.5; hover:opacity:1;">◀</span>` : ''}
                           ${idx < 2 ? `<span class="btn-move-layer" data-dir="down" data-idx="${idx}" style="opacity:0.5; hover:opacity:1;">▶</span>` : ''}
                        </div>
                     `).join('')}
                  </div>
               </div>
               ` : ''}
            </div>

            <!-- IMAGE MODE PANE (Visible in Image Mode OR Mix Mode) -->
            <div id="pane-scn-image" style="display:${meta.mode === 'image' || meta.mode === 'mix' ? 'flex' : 'none'}; flex-direction:column; gap:15px; border-bottom:${meta.mode === 'mix' ? '1px dashed rgba(255,255,255,0.2)' : 'none'}; padding-bottom:${meta.mode === 'mix' ? '15px' : '0'}; margin-bottom:${meta.mode === 'mix' ? '15px' : '0'};">
                <button class="editor-btn-primary btn-pick-scenario" data-id="${s.id}" style="padding:15px; font-size:0.9rem; letter-spacing:1px;">IMPORTAR DA GALERIA</button>
                <div style="font-size:0.75rem; color:#aaa;">(Ou cole uma URL)</div>
                <input type="text" id="scn-img-url" class="editor-input scn-realtime" value="${meta.url || (meta.mode === 'image' ? (this.scenarios as any)[s.id] : '')}">
                
                <div style="background:rgba(255,100,100,0.05); padding:15px; border-radius:12px; border:1px solid rgba(255,100,100,0.2); margin-top:10px;">
                   <label style="color:#ff6464; font-size:0.75rem; font-weight:800; display:block; margin-bottom:10px;">🌟 EFEITOS ANIMADOS (CSS FILTERS)</label>
                   
                   <div class="form-row">
                      <div class="form-group" style="flex:1">
                         <label>Filtro Animado</label>
                         <select id="scn-img-filter" class="scn-realtime editor-input">
                            <option value="none" ${meta.imgFilter === 'none' || !meta.imgFilter ? 'selected' : ''}>Nenhum Original</option>
                            <option value="vhs" ${meta.imgFilter === 'vhs' ? 'selected' : ''}>VHS Glitch</option>
                            <option value="chroma" ${meta.imgFilter === 'chroma' ? 'selected' : ''}>Croma (RGB Split)</option>
                            <option value="wave" ${meta.imgFilter === 'wave' ? 'selected' : ''}>Ondas Distorcidas</option>
                            <option value="pulse_hue" ${meta.imgFilter === 'pulse_hue' ? 'selected' : ''}>Pulso Alien (Hue)</option>
                         </select>
                      </div>
                      <div class="form-group" style="flex:1">
                         <label>Intensidade do Efeito</label>
                         <input type="range" id="scn-img-filter-val" class="scn-realtime editor-input" min="0" max="100" value="${meta.imgFilterVal ?? 50}">
                      </div>
                   </div>
                </div>
            </div>

            <!-- GRADIENT + PATTERN PANE (Visible in Grad_Pat Mode OR Mix Mode) -->
            <div id="pane-scn-grad_pat" style="display:${meta.mode === 'grad_pat' || meta.mode === 'mix' ? 'flex' : 'none'}; flex-direction:column; gap:20px;">
                
                <div style="background:rgba(0,0,0,0.4); padding:15px; border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
                   <label style="color:#ffd700; font-size:0.75rem; font-weight:800; display:block; margin-bottom:10px;">1. BASE: DEGRADÊ (Com Opacidade Livre)</label>
                   
                   <div class="form-row" style="margin-bottom:10px;">
                      <div class="form-group" style="flex:1">
                         <label>Cor 1</label>
                         <div style="display:flex; gap:5px;">
                            <input type="color" id="scn-c1" class="scn-realtime editor-input" value="${meta.gradC1 || '#000000'}" style="flex:0.8; height:40px; padding:0;">
                            <input type="range" id="scn-c1-op" class="scn-realtime editor-input" min="0" max="100" value="${meta.gradC1Op ?? 100}" style="flex:1;">
                         </div>
                      </div>
                      <div class="form-group" style="flex:1">
                         <label>Cor 2</label>
                         <div style="display:flex; gap:5px;">
                            <input type="color" id="scn-c2" class="scn-realtime editor-input" value="${meta.gradC2 || '#222222'}" style="flex:0.8; height:40px; padding:0;">
                            <input type="range" id="scn-c2-op" class="scn-realtime editor-input" min="0" max="100" value="${meta.gradC2Op ?? 100}" style="flex:1;">
                         </div>
                      </div>
                   </div>

                   <div style="display:flex; gap:10px; margin-bottom:10px;">
                      <div style="flex:2"><label>Tipo</label>
                        <select id="scn-gradFn" class="scn-realtime editor-input">
                           <option value="linear-gradient" ${meta.gradFn === 'linear-gradient' ? 'selected' : ''}>Linear</option>
                           <option value="radial-gradient" ${meta.gradFn === 'radial-gradient' ? 'selected' : ''}>Radial</option>
                        </select>
                      </div>
                      <div style="flex:2"><label>Direção</label>
                        <select id="scn-gradDir" class="scn-realtime editor-input">
                           <option value="to bottom" ${meta.gradDir === 'to bottom' ? 'selected' : ''}>Vertical ↓</option>
                           <option value="to right" ${meta.gradDir === 'to right' ? 'selected' : ''}>Horizontal →</option>
                           <option value="135deg" ${meta.gradDir === '135deg' ? 'selected' : ''}>Diagonal ↘</option>
                           <option value="circle" ${meta.gradDir === 'circle' ? 'selected' : ''}>Círculo (Radial)</option>
                        </select>
                      </div>
                   </div>
                       <div class="form-row" style="margin-top:10px;">
                          <div class="form-group" style="flex:1">
                            <label>Modo de Mesclagem (Blend Mode do Degradê)</label>
                            <select id="scn-gradBlend" class="scn-realtime editor-input">
                               <option value="normal" ${meta.gradBlend === 'normal' || (!meta.gradBlend && meta.blend === 'normal') || (!meta.gradBlend && !meta.blend) ? 'selected' : ''}>Normal</option>
                               <option value="multiply" ${meta.gradBlend === 'multiply' || (!meta.gradBlend && meta.blend === 'multiply') ? 'selected' : ''}>Multiplicar (Escurecer)</option>
                               <option value="screen" ${meta.gradBlend === 'screen' || (!meta.gradBlend && meta.blend === 'screen') ? 'selected' : ''}>Divisão (Clarear)</option>
                               <option value="overlay" ${meta.gradBlend === 'overlay' || (!meta.gradBlend && meta.blend === 'overlay') ? 'selected' : ''}>Sobrepor (Contraste)</option>
                               <option value="color-dodge" ${meta.gradBlend === 'color-dodge' ? 'selected' : ''}>Clarear Cor (Dodge)</option>
                               <option value="color-burn" ${meta.gradBlend === 'color-burn' ? 'selected' : ''}>Escurecer Cor (Burn)</option>
                               <option value="hard-light" ${meta.gradBlend === 'hard-light' ? 'selected' : ''}>Luz Direta</option>
                               <option value="soft-light" ${meta.gradBlend === 'soft-light' ? 'selected' : ''}>Luz Indireta</option>
                               <option value="difference" ${meta.gradBlend === 'difference' ? 'selected' : ''}>Diferença</option>
                            </select>
                          </div>
                       </div>
                    </div>

                    <div style="background:rgba(0,0,0,0.4); padding:15px; border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
                       <label style="color:#4cff88; font-size:0.75rem; font-weight:800; display:block; margin-bottom:10px;">2. SOBREPOSIÇÃO: PADRÃO ANIMADO</label>
                       <div style="display:flex; gap:10px; margin-bottom:10px;">
                          <div style="flex:2"><label>Padrão Geométrico</label>
                            <select id="scn-patType" class="scn-realtime editor-input">
                               <option value="none" ${meta.patType === 'none' ? 'selected' : ''}>Nenhum</option>
                               <option value="pulse_grid" ${meta.patType === 'pulse_grid' ? 'selected' : ''}>Grade Cyber Pulsante</option>
                               <option value="neon_rings" ${meta.patType === 'neon_rings' ? 'selected' : ''}>Anéis de Neon</option>
                               <option value="waves" ${meta.patType === 'waves' ? 'selected' : ''}>Ondas Energéticas</option>
                               <option value="stars" ${meta.patType === 'stars' ? 'selected' : ''}>Campo Estelar Parallax</option>
                               <option value="lines" ${meta.patType === 'lines' ? 'selected' : ''}>Linhas Cinéticas (Chuva)</option>
                               <option value="hex" ${meta.patType === 'hex' ? 'selected' : ''}>Malha Hexagonal</option>
                            </select>
                          </div>
                          <div style="flex:1"><label>Cor/Foco</label>
                            <input type="color" id="scn-patC" class="scn-realtime editor-input" value="${meta.patC}" style="height:40px; padding:0;">
                          </div>
                       </div>

                       <div class="form-row">
                          <div class="form-group" style="flex:1">
                            <label>Modo de Mesclagem (Blend Mode do Padrão)</label>
                            <select id="scn-patBlend" class="scn-realtime editor-input">
                               <option value="normal" ${meta.patBlend === 'normal' || !meta.patBlend ? 'selected' : ''}>Normal</option>
                               <option value="multiply" ${meta.patBlend === 'multiply' ? 'selected' : ''}>Multiplicar (Escurecer)</option>
                               <option value="screen" ${meta.patBlend === 'screen' ? 'selected' : ''}>Divisão (Clarear)</option>
                               <option value="overlay" ${meta.patBlend === 'overlay' ? 'selected' : ''}>Sobrepor (Contraste)</option>
                               <option value="color-dodge" ${meta.patBlend === 'color-dodge' ? 'selected' : ''}>Clarear Cor (Dodge)</option>
                               <option value="color-burn" ${meta.patBlend === 'color-burn' ? 'selected' : ''}>Escurecer Cor (Burn)</option>
                            </select>
                          </div>
                       </div>
                       
                       <!-- ELABORATE PATTERN CONTROLS -->
                       <div class="form-row" style="margin-top:10px;">
                          <div class="form-group" style="flex:1">
                            <label>Tamanho do Padrão (${meta.patSize ?? 100}px)</label>
                        <input type="range" id="scn-patSize" class="scn-realtime editor-input" min="20" max="400" value="${meta.patSize ?? 100}">
                      </div>
                      <div class="form-group" style="flex:1">
                        <label>Densidade (Qtde/Velocidade)</label>
                        <input type="range" id="scn-patDense" class="scn-realtime editor-input" min="1" max="10" value="${meta.patDense ?? 5}">
                      </div>
                      <div class="form-group" style="flex:1">
                        <label>Opacidade: <span id="lbl-patOp">${meta.patOpacity}</span>%</label>
                        <input type="range" id="scn-patOp" class="scn-realtime editor-input" min="0" max="100" value="${meta.patOpacity}">
                      </div>
                   </div>
                </div>

            </div>

            <div style="background:rgba(163,53,238,0.1); padding:15px; border-radius:12px; border:1px solid rgba(163,53,238,0.25); margin-bottom:15px;">
               <label style="color:#a335ee; font-size:0.75rem; font-weight:800; display:block; margin-bottom:12px; letter-spacing:1px;">✨ EFEITOS AMBIENTAIS (Partículas)</label>
               <div style="display:flex; gap:10px;">
                  <div style="flex:2"><label>Tipo</label>
                    <select id="scn-p-type" class="scn-realtime editor-input">
                       <option value="none">Nenhum</option>
                       <option value="sparks">🔥 Fagulhas (Sparks)</option>
                       <option value="fog">🌫️ Névoa (Fog)</option>
                       <option value="swirl">🌀 Vórtex (Swirl)</option>
                    </select>
                  </div>
                  <div style="flex:1"><label>Cor</label>
                    <input type="color" id="scn-p-color" class="scn-realtime editor-input" value="#ffaa00" style="height:40px; padding:0;">
                  </div>
                  <div style="flex:1"><label>Qtde</label>
                    <input type="number" id="scn-p-count" class="scn-realtime editor-input" value="20" min="0" max="100">
                  </div>
               </div>
            </div>
            <div style="margin-top:auto; padding-top:20px; border-top:1px solid rgba(255,255,255,0.1);">
               <button id="btn-save-scenarios" class="editor-btn-primary" style="width:100%; height:50px; font-size:1.1rem; border-radius:12px;">💾 GRAVAR CENÁRIOS</button>
               <p style="text-align:center; font-size:0.6rem; margin-top:5px; color:#aaa;">O fundo do jogo (#body) reproduz a mudança em tempo real.</p>
            </div>
        </div>

        <!-- Right Side: Phone Mockup -->
        <div style="flex:0.8; display:flex; flex-direction:column; align-items:center; justify-content:center; border-left:1px solid rgba(255,255,255,0.05); padding-left:20px;">
           <label style="color:#aaa; font-size:0.75rem; margin-bottom:10px;">PREVIEW (MOCKUP CELULAR)</label>
           <!-- PHONE FRAME -->
           <div style="width:100%; max-width:240px; aspect-ratio:9/19.5; border-radius:24px; border:8px solid #111; box-shadow: 0 10px 30px rgba(0,0,0,0.8), inset 0 0 10px rgba(0,0,0,0.5); position:relative; overflow:hidden; background:#000;">
              
              <!-- DYNAMIC CONTENT (Background applied here directly) -->
              <div id="phone-preview" style="position:absolute; inset:0;"></div>

              <!-- FAKE UI OVERLAY -->
              <div style="position:absolute; inset:0; pointer-events:none; display:flex; flex-direction:column;">
                 <div style="height:50px; border-bottom:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.2); backdrop-filter:blur(5px); display:flex; align-items:center; padding:0 10px; gap:5px;">
                     <div style="width:25px; height:25px; border-radius:50%; background:rgba(255,255,255,0.3);"></div>
                     <div style="height:10px; width:60px; background:rgba(255,255,255,0.3); border-radius:5px;"></div>
                     <div style="margin-left:auto; width:20px; height:20px; border-radius:4px; background:rgba(255,255,255,0.3);"></div>
                 </div>
                 <div style="flex:1; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:10px;">
                     <div style="width:70%; height:40px; border-radius:10px; border:2px dashed rgba(255,255,255,0.3); background:rgba(0,0,0,0.1); backdrop-filter:blur(3px);"></div>
                     <div style="width:70%; height:40px; border-radius:10px; border:2px dashed rgba(255,255,255,0.3); background:rgba(0,0,0,0.1); backdrop-filter:blur(3px);"></div>
                 </div>
                 <div style="height:60px; background:rgba(0,0,0,0.5); display:flex; justify-content:space-around; align-items:center;">
                     <div style="width:30px; height:30px; border-radius:8px; background:rgba(255,255,255,0.2);"></div>
                     <div style="width:30px; height:30px; border-radius:8px; background:rgba(255,255,255,0.2);"></div>
                     <div style="width:30px; height:30px; border-radius:8px; background:rgba(255,255,255,0.2);"></div>
                 </div>
              </div>
           </div>
        </div>

        <style>
          .active-mode { background: #fff !important; color: #000 !important; }
        </style>
      </div>
    `;
  }

  private bind() {
    document.getElementById('btn-back-editor')?.addEventListener('click', () => this.onExit());

    // Tabs
    document.querySelectorAll('.editor-tab:not(.disabled)').forEach(el => {
      el.addEventListener('click', (e) => {
        this.currentMode = (e.currentTarget as HTMLElement).dataset.mode as any;
        this.reRender();
      });
    });

    if (this.currentMode === 'cards') this.bindCardsMode();
    else if (this.currentMode === 'scenarios') this.bindScenariosMode();
    else if (this.currentMode === 'assets') this.bindAssetsMode(document.querySelector('.editor-screen') as HTMLElement);
    else if (this.currentMode === 'habilidades') this.bindHabilidadesMode();
    else if (this.currentMode === 'artefatos') this.bindArtefatosMode();
    else if (this.currentMode === 'store') this.bindStoreMode();
    else if (this.currentMode === 'config') this.bindConfigMode();
    else if (this.currentMode === 'sounds') this.bindSoundMode();
  }

  private bindCardsMode() {
    const t = this.templates[this.selectedIndex];
    if (!t) return;

    const container = document.querySelector('.editor-screen') as HTMLElement;

    // Sub-Tabs Switching
    container.querySelectorAll('.card-sub-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.cardSubMode = (btn as HTMLElement).dataset.sub as any;
        this.reRender();
      });
    });

    // Switch Card in List
    container.querySelectorAll('.editor-list-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const idx = parseInt((e.currentTarget as HTMLElement).dataset.idx!);
        this.selectedIndex = idx;
        this.reRender();
      });
    });

    // Add / Delete Card
    container.querySelector('#btn-add-card')?.addEventListener('click', () => {
      this.templates.push({
        name: 'Nova Carta', baseAtk: 100, basePv: 100, image: this.availableCards[0] || ''
      });
      this.selectedIndex = this.templates.length - 1;
      this.reRender();
    });

    container.querySelector('#btn-delete-card')?.addEventListener('click', () => {
      if (this.templates.length <= 1) return;
      if (confirm('Deseja excluir esta carta PERMANENTEMENTE?')) {
        this.templates.splice(this.selectedIndex, 1);
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.reRender();
      }
    });

    const updateObj = () => {
      // Basic Tab
      const nameInp = container.querySelector('#inp-name') as HTMLInputElement;
      if (nameInp) t.name = nameInp.value;
      const atkInp_ = container.querySelector('#inp-atk') as HTMLInputElement;
      if (atkInp_) t.baseAtk = parseInt(atkInp_.value) || 0;
      const pvInp_ = container.querySelector('#inp-pv') as HTMLInputElement;
      if (pvInp_) t.basePv = parseInt(pvInp_.value) || 0;
      const manaInp = container.querySelector('#inp-mana') as HTMLInputElement;
      if (manaInp) t.manaCost = parseInt(manaInp.value) || 1;
      const stamInp = container.querySelector('#inp-stam') as HTMLInputElement;
      if (stamInp) t.staminaCost = parseInt(stamInp.value) || 1;
      const rarInp = container.querySelector('#inp-rarity') as HTMLSelectElement;
      if (rarInp) t.preferredRarity = rarInp.value as any;
      const flavorInp = container.querySelector('#inp-flavor') as HTMLTextAreaElement;
      if (flavorInp) t.flavorText = flavorInp.value;

      // Appearance Tab
      const vStart = container.querySelector('#inp-vid-start') as HTMLInputElement;
      if (vStart) t.videoStart = parseFloat(vStart.value);
      const vEnd = container.querySelector('#inp-vid-end') as HTMLInputElement;
      if (vEnd) t.videoEnd = parseFloat(vEnd.value);
      const vAtk = container.querySelector('#inp-video-atk') as HTMLInputElement;
      if (vAtk) t.hasVideoAttack = vAtk.checked;

      // Aesthetics Tab
      const fColor = container.querySelector('#inp-color-txt') as HTMLInputElement;
      if (fColor) t.fontColor = fColor.value;
      const fSize = container.querySelector('#inp-fsize') as HTMLInputElement;
      if (fSize) t.fontSizeBase = parseInt(fSize.value);
      const bColor = container.querySelector('#inp-border-color') as HTMLInputElement;
      if (bColor) t.borderColor = bColor.value;
      const gColor = container.querySelector('#inp-glow-color') as HTMLInputElement;
      if (gColor) t.glowColor = gColor.value;
      const bWidth = container.querySelector('#inp-border-width') as HTMLInputElement;
      if (bWidth) t.borderWidth = parseInt(bWidth.value);
      const gIntensity = container.querySelector('#inp-glow-intensity') as HTMLInputElement;
      if (gIntensity) t.glowIntensity = parseInt(gIntensity.value);

      // Effects Tab
      const patType = container.querySelector('#inp-card-pattern') as HTMLSelectElement;
      if (patType) t.patternType = patType.value;
      const patColor = container.querySelector('#inp-card-pattern-color') as HTMLInputElement;
      if (patColor) t.patternColor = patColor.value;
      const filterType = container.querySelector('#inp-card-filter') as HTMLSelectElement;
      if (filterType) t.imageFilter = filterType.value;
      const filterInt = container.querySelector('#inp-card-filter-intensity') as HTMLInputElement;
      if (filterInt) t.imageFilterIntensity = parseInt(filterInt.value);

      // Compute Pattern Overlay
      if (t.patternType) {
        t.patternOverlay = generateSvgPattern(t.patternType, t.patternColor || '#ffffff', 20);
      } else {
        t.patternOverlay = '';
      }


      // Parallax Tab Detail
      if (this.selectedParallaxLayerIdx !== null && t.parallaxLayers) {
        const ly = t.parallaxLayers[this.selectedParallaxLayerIdx];
        const zInp = container.querySelector('#parallax-z') as HTMLInputElement;
        if (zInp) ly.z = parseInt(zInp.value);
        const sInp = container.querySelector('#parallax-speed') as HTMLInputElement;
        if (sInp) ly.speed = parseFloat(sInp.value);
        const scInp = container.querySelector('#parallax-scale') as HTMLInputElement;
        if (scInp) ly.scale = parseFloat(scInp.value);
        const opInp = container.querySelector('#parallax-opacity') as HTMLInputElement;
        if (opInp) ly.opacity = parseFloat(opInp.value);
        const bInp = container.querySelector('#parallax-blend') as HTMLSelectElement;
        if (bInp) ly.blendMode = bInp.value;
        const xInp = container.querySelector('#parallax-x') as HTMLInputElement;
        if (xInp) ly.initialX = parseInt(xInp.value);
        const yInp = container.querySelector('#parallax-y') as HTMLInputElement;
        if (yInp) ly.initialY = parseInt(yInp.value);
        const fInp = container.querySelector('#parallax-filter') as HTMLSelectElement;
        if (fInp) ly.imageFilter = fInp.value;
        const fiInp = container.querySelector('#parallax-filter-intensity') as HTMLInputElement;
        if (fiInp) ly.imageFilterIntensity = parseInt(fiInp.value);
      }


      this.updatePreview();
      this.updateListLabels();
    };


    // Random Generation
    const genProps = (rarity: string) => {
        let pv = 0, atk = 0, playCost = 0, atkCount = 1, atkCost = 0;
        const step = 10;

        if (rarity === 'common') {
            pv = Math.floor(Math.random() * (500 / step)) * step + step;
            atk = Math.floor(Math.random() * (500 / step)) * step + step;
            playCost = Math.floor(Math.random() * 3) + 1; // 1-3
            atkCount = 1;
            atkCost = Math.floor(Math.random() * 3) + 1; // 1-3
        } else if (rarity === 'rare') {
            pv = Math.floor(Math.random() * (500 / step)) * step + 510; // 510-1000
            atk = Math.floor(Math.random() * (500 / step)) * step + 510;
            playCost = Math.floor(Math.random() * 4) + 3; // 3-6
            atkCount = 2;
            atkCost = Math.floor(Math.random() * 4) + 3; // 3-6
        } else { // epic
            pv = Math.floor(Math.random() * (500 / step)) * step + 1010; // 1010-1500
            atk = Math.floor(Math.random() * (500 / step)) * step + 1010;
            playCost = Math.floor(Math.random() * 4) + 6; // 6-9
            atkCount = 4;
            atkCost = Math.floor(Math.random() * 4) + 6; // 6-9
        }

        t.baseAtk = atk;
        t.basePv = pv;
        t.manaCost = playCost;
        t.staminaCost = playCost;
        t.preferredRarity = rarity as any;
        
        // Gen Attacks
        t.attacks = [];
        for (let i = 0; i < atkCount; i++) {
           t.attacks.push({
              name: i === 0 ? 'ATAQUE BÁSICO' : (i === 1 ? 'ESPECIAL' : (i === 2 ? 'SUPREMO' : 'LENDÁRIO')),
              damage: atk + (i * 100),
              cost: atkCost,
              costType: (i % 2 === 1) ? 'mana' : 'stamina'
           });
        }
        this.reRender();
        this.showToast(`🎲 PROPRIEDADES ${rarity.toUpperCase()} GERADAS!`, '#ffd700');
    };

    container.querySelector('#btn-gen-common')?.addEventListener('click', () => genProps('common'));
    container.querySelector('#btn-gen-rare')?.addEventListener('click', () => genProps('rare'));
    container.querySelector('#btn-gen-epic')?.addEventListener('click', () => genProps('epic'));

    // Attacks Management
    container.querySelectorAll('.btn-add-atk').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        if (!t.attacks) t.attacks = [];
        t.attacks[idx] = { name: 'NOVO ATAQUE', damage: t.baseAtk, cost: 1, costType: 'stamina' };
        this.reRender();
      });
    });

    container.querySelectorAll('.btn-del-atk').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        t.attacks.splice(idx, 1);
        this.reRender();
      });
    });

    const updateAttacks = () => {
       container.querySelectorAll('.attack-entry').forEach(entry => {
          const idx = parseInt((entry as HTMLElement).querySelector('.inp-atk-name')?.getAttribute('data-idx') || '-1');
          if (idx === -1 || !t.attacks[idx]) return;
          
          t.attacks[idx].name = (entry.querySelector('.inp-atk-name') as HTMLInputElement).value;
          t.attacks[idx].damage = parseInt((entry.querySelector('.inp-atk-dmg') as HTMLInputElement).value) || 0;
          t.attacks[idx].costType = (entry.querySelector('.inp-atk-res') as HTMLSelectElement).value as any;
          t.attacks[idx].cost = parseInt((entry.querySelector('.inp-atk-cost') as HTMLInputElement).value) || 1;
       });
       this.updatePreview();
       this.updateListLabels();
    };

    container.querySelectorAll('.inp-atk-name, .inp-atk-dmg, .inp-atk-res, .inp-atk-cost').forEach(inp => {
       inp.addEventListener('input', updateAttacks);
       inp.addEventListener('change', updateAttacks);
    });

    // ── Special Attack Bindings ───────────────────────────────────────────
    const specialToggle = container.querySelector('#inp-special-enabled') as HTMLInputElement;
    const specialFields = container.querySelector('#special-attack-fields') as HTMLElement;
    
    const readSpecialAttack = () => {
      const name = (container.querySelector('#inp-special-name') as HTMLInputElement)?.value || 'ATAQUE DEFINITIVO';
      const dmg  = parseInt((container.querySelector('#inp-special-dmg') as HTMLInputElement)?.value) || 0;
      const res  = (container.querySelector('#inp-special-res') as HTMLSelectElement)?.value as 'stamina' | 'mana' || 'stamina';
      const cost = parseInt((container.querySelector('#inp-special-cost') as HTMLInputElement)?.value) || 9;
      const desc = (container.querySelector('#inp-special-desc') as HTMLInputElement)?.value || '';
      const vid  = (container.querySelector('#inp-special-video') as HTMLInputElement)?.value || '';
      t.specialAttack = { name, damage: dmg, costType: res, cost, description: desc, videoUrl: vid || undefined };
      this.updatePreview();
    };

    specialToggle?.addEventListener('change', () => {
      if (specialToggle.checked) {
        if (specialFields) specialFields.style.display = 'flex';
        readSpecialAttack();
      } else {
        if (specialFields) specialFields.style.display = 'none';
        t.specialAttack = undefined;
        this.updatePreview();
      }
    });

    container.querySelectorAll('#inp-special-name, #inp-special-dmg, #inp-special-res, #inp-special-cost, #inp-special-desc, #inp-special-video').forEach(inp => {
      inp.addEventListener('input', readSpecialAttack);
      inp.addEventListener('change', readSpecialAttack);
    });

    const readParticles = () => {
      const type = (container.querySelector('#inp-particles-type') as HTMLSelectElement)?.value || 'none';
      const color = (container.querySelector('#inp-particles-color') as HTMLInputElement)?.value || '#ffaa00';
      const count = parseInt((container.querySelector('#inp-particles-count') as HTMLInputElement)?.value) || 20;
      t.particles = { type: type as any, color, count };
      this.updatePreview();
    };

    container.querySelectorAll('#inp-particles-type, #inp-particles-color, #inp-particles-count').forEach(inp => {
      inp.addEventListener('input', readParticles);
      inp.addEventListener('change', readParticles);
    });


    // Listen to all inputs
    container.querySelectorAll('.editor-input, .editor-input[type="range"], input[type="checkbox"], #parallax-editor-detail input, #parallax-editor-detail select').forEach(inp => {
      inp.addEventListener('input', updateObj);
      inp.addEventListener('change', updateObj);
    });


    // Font Picker
    container.querySelectorAll('.font-picker-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        t.fontFamily = (btn as HTMLElement).dataset.font;
        this.reRender();
      });
    });

    // Specific Buttons
    container.querySelector('#btn-pick-special-video')?.addEventListener('click', () => {
      this.openMediaPicker(url => {
        const isVid = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url);
        if (isVid && t.specialAttack) {
          t.specialAttack.videoUrl = url;
          this.reRender();
          this.showToast('✅ VÍDEO DO GOLPE CARREGADO!', '#ffd700');
        } else {
          this.showToast('⚠️ Escolha um arquivo de vídeo (.mp4, .webm)', '#ff4444');
        }
      });
    });

    container.querySelector('#btn-pick-card-media')?.addEventListener('click', () => {
      this.openMediaPicker(url => {
        const isVid = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url);
        if (isVid) {
          t.animationUrl = url;
          t.videoStart = 0;
          t.videoEnd = 5;
          delete t.image;
        } else {
          t.image = url;
          delete t.animationUrl;
        }
        this.reRender();
      });
    });

    container.querySelector('#btn-pick-card-bg')?.addEventListener('click', () => {
      this.openMediaPicker(url => {
        t.cardBackground = url;
        this.reRender();
      });
    });

    container.querySelector('#btn-gen-thumbnail')?.addEventListener('click', () => {
      const vid = container.querySelector('#card-media-preview video') as HTMLVideoElement;
      if (!vid) return;

      const canvas = document.createElement('canvas');
      canvas.width = vid.videoWidth;
      canvas.height = vid.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        
        // Save thumbnail to server
        const filename = `thumb_${t.name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.jpg`;
        fetch('/api/upload-base64', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl, filename })
        }).then(res => res.json()).then(json => {
           if (json.success) {
              t.image = json.url;
              this.reRender();
              this.showToast('✅ MINIATURA GERADA!', '#4cff88');
           }
        });
      }
    });


    container.querySelector('#btn-add-parallax')?.addEventListener('click', () => {
      if (!t.parallaxLayers) t.parallaxLayers = [];
      if (t.parallaxLayers.length >= 5) { this.showToast('⚠️ MÁXIMO 5 CAMADAS', '#ff4444'); return; }
      this.openMediaPicker(url => {
        t.parallaxLayers!.push({
          id: `lyr_${Date.now()}`,
          url,
          z: t.parallaxLayers!.length + 1,
          speed: 1,
          scale: 1,
          initialX: 0,
          initialY: 0,
          opacity: 1,
          blendMode: 'normal'
        });
        this.selectedParallaxLayerIdx = t.parallaxLayers!.length - 1;
        this.reRender();
      });
    });

    container.querySelectorAll('.parallax-list-item').forEach(item => {
      item.addEventListener('click', (e) => {
          // If clicked on delete button, don't select
          if ((e.target as HTMLElement).classList.contains('btn-del-parallax')) return;
          this.selectedParallaxLayerIdx = parseInt((item as HTMLElement).dataset.idx!);
          this.reRender();
      });
    });

    container.querySelectorAll('.btn-del-parallax').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        t.parallaxLayers!.splice(idx, 1);
        if (this.selectedParallaxLayerIdx === idx) this.selectedParallaxLayerIdx = null;
        else if (this.selectedParallaxLayerIdx !== null && this.selectedParallaxLayerIdx > idx) this.selectedParallaxLayerIdx--;
        this.reRender();
      });
    });

    container.querySelector('#btn-pick-parallax-img')?.addEventListener('click', () => {
       if (this.selectedParallaxLayerIdx !== null && t.parallaxLayers) {
           this.openMediaPicker(url => {
               t.parallaxLayers![this.selectedParallaxLayerIdx!].url = url;
               this.reRender();
           });
       }
    });

    container.querySelectorAll('.card-sub-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.cardSubMode = (tab as HTMLElement).dataset.sub as any;
        this.reRender();
      });
    });


    container.querySelector('#btn-save-templates')?.addEventListener('click', () => {
      this.saveTemplatesToCode();
      this.showToast('✅ DADOS SALVOS NO CÓDIGO!', '#a335ee');
    });

    container.querySelector('#btn-test-special')?.addEventListener('click', () => {
      this.playTestSpecial();
    });

    container.querySelector('#btn-delete-card')?.addEventListener('click', () => {
      if (confirm('Tem certeza?')) {
        this.templates.splice(this.selectedIndex, 1);
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.reRender();
      }
    });

    container.querySelector('#btn-add-card')?.addEventListener('click', () => {
      const newCard = JSON.parse(JSON.stringify(t));
      newCard.id = 'card_' + Date.now();
      newCard.name = 'Nova Carta';
      this.templates.push(newCard);
      this.selectedIndex = this.templates.length - 1;
      this.reRender();
    });
  }


  private saveTemplatesToCode() {
    this.bindSaveBtn('btn-save-templates', '/api/save-cards', this.templates);
    // Explicitly click it once to trigger the fetch immediately if this was called from the button listener
    const btn = document.getElementById('btn-save-templates') as HTMLButtonElement;
    if (btn) btn.click();
  }




  private applyRealTimeBackground(bgStr: string) {
    applyScenarioBackground(bgStr);
  }

  private bindScenariosMode() {
    const screens = [
      { id: 'lobby', label: 'TELA INICIAL / LOBBY' },
      { id: 'battle', label: 'CAMPO DE BATALHA' },
      { id: 'map', label: 'MAPA / EXPLORAÇÃO' },
      { id: 'academy', label: 'ACADEMIA / TREINO' },
      { id: 'arsenal', label: 'ARSENAL / DECK BUILDER' },
      { id: 'preparation', label: 'PREPARAÇÃO DE BATALHA' },
      { id: 'store', label: 'LOJA DE ITENS' },
      { id: 'difficulty', label: 'DIFICULDADE DA BATALHA' },
      { id: 'coin_flip', label: 'CARA OU COROA / SORTE' }
    ];
    const sId = screens[Math.min(this.selectedIndex, screens.length - 1)].id;
    
    if (!(this.scenarios as any).__meta) (this.scenarios as any).__meta = {};
    if (!(this.scenarios as any).__meta[sId]) {
        (this.scenarios as any).__meta[sId] = {
           mode: 'image', url: '',
           gradFn: 'linear-gradient', gradDir: 'to bottom', gradC1: '#000000', gradC2: '#222222',
           patType: 'none', patC: '#ffffff', patOpacity: 20
        };
    }
    const meta = (this.scenarios as any).__meta[sId];

    // Trigger initial preview apply!
    setTimeout(() => {
        const bgVal = (this.scenarios as any)[sId] || '';
        if (meta.mode === 'image' && meta.url) this.applyRealTimeBackground(meta.url);
        else this.applyRealTimeBackground(bgVal);
    }, 50);

    // Select Scenario Tab
    document.querySelectorAll('[data-type="scenario"]').forEach(el => {
      el.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.btn-copy-scn') || (e.target as HTMLElement).closest('.btn-paste-scn')) return;
        this.selectedIndex = parseInt((e.currentTarget as HTMLElement).dataset.idx!);
        this.reRender();
        // apply background automatically on click to preview!
        const bgVal = (this.scenarios as any)[screens[this.selectedIndex].id] || '';
        this.applyRealTimeBackground(bgVal);
      });
    });

    // Copy/Paste Scenario Styles
    document.querySelectorAll('.btn-copy-scn').forEach(el => {
       el.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt((e.currentTarget as HTMLElement).dataset.idx!);
          const scnId = screens[idx].id;
          const bgData = (this.scenarios as any)[scnId];
          const bgMeta = (this.scenarios as any).__meta[scnId];
          if (bgData) {
              this.scenarioClipboard = {
                 data: bgData,
                 meta: JSON.parse(JSON.stringify(bgMeta))
              };
              this.showToast(`Estilo de ${screens[idx].label} copiado!`, '#ffd700');
              this.reRender();
          }
       });
    });

    document.querySelectorAll('.btn-paste-scn').forEach(el => {
       el.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt((e.currentTarget as HTMLElement).dataset.idx!);
          const scnId = screens[idx].id;
          if (this.scenarioClipboard) {
              (this.scenarios as any)[scnId] = this.scenarioClipboard.data;
              (this.scenarios as any).__meta[scnId] = JSON.parse(JSON.stringify(this.scenarioClipboard.meta));
              this.showToast(`Estilo aplicado a ${screens[idx].label}!`, '#4cff88');
              
              if (idx === this.selectedIndex) {
                  this.reRender();
              } else {
                  this.reRender(); // Rerender to show active state if needed, or just update UI
              }
              
              // Apply immediately to preview if it's the current one
              const bgVal = (this.scenarios as any)[screens[this.selectedIndex].id] || '';
              this.applyRealTimeBackground(bgVal);
          }
       });
    });

    // Layer Reorder Logic
    document.querySelectorAll('.btn-move-layer').forEach(el => {
       el.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt((e.currentTarget as HTMLElement).dataset.idx!);
          const dir = (e.currentTarget as HTMLElement).dataset.dir;
          const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
          
          const temp = meta.layers[idx];
          meta.layers[idx] = meta.layers[targetIdx];
          meta.layers[targetIdx] = temp;
          
          this.reRender();
          compileRealtime();
       });
    });

    // Toggle Modes (Already Bound in bind, but ensuring meta update)
    document.querySelectorAll('.btn-scn-mode').forEach(btn => {
      btn.addEventListener('click', (e) => {
         meta.mode = (e.currentTarget as HTMLElement).dataset.mode;
         this.reRender();
      });
    });

    // Import PC
    const btnImport = document.getElementById('btn-import-scn-media');
    const inpMedia = document.getElementById('inp-scn-media') as HTMLInputElement;
    btnImport?.addEventListener('click', () => inpMedia?.click());
    inpMedia?.addEventListener('change', async () => {
      if (inpMedia.files && inpMedia.files.length > 0) {
        this.showToast(`Importando arquivo...`, '#51c5ff');
        const file = inpMedia.files[0];
        const formData = new FormData();
        formData.append('media', file);
        try {
          const resp = await fetch('/api/upload-media', { method: 'POST', body: formData });
          const json = await resp.json();
          if (json.success) {
            const url = (json.urls && json.urls[0]) || `/cards/${file.name}`;
            meta.url = url;
            const urlInput = document.getElementById('scn-img-url') as HTMLInputElement;
            if (urlInput) {
                urlInput.value = url;
                // Dispatch input event to trigger compilation
                urlInput.dispatchEvent(new Event('input'));
            } else {
                (this.scenarios as any)[sId] = url;
                this.applyRealTimeBackground(url);
            }
            this.showToast('Importado com sucesso do PC!', '#4cff88');
          }
        } catch (err) { console.error(err); }
      }
    });

    // Image Picker (Gallery)
    document.querySelectorAll('.btn-pick-scenario').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openMediaPicker(url => {
          meta.url = url;
          const urlInput = document.getElementById('scn-img-url') as HTMLInputElement;
          if (urlInput) {
              urlInput.value = url;
              // Dispatch input event to trigger compilation
              urlInput.dispatchEvent(new Event('input'));
          } else {
              (this.scenarios as any)[sId] = url;
              this.applyRealTimeBackground(url);
          }
        });
      });
    });

    // Realtime Compiler for Gradient + Pattern + Effects
    const compileRealtime = () => {
       const u = (document.getElementById('scn-img-url') as HTMLInputElement)?.value || '';
       const imgFilterFn = (document.getElementById('scn-img-filter') as HTMLSelectElement)?.value || 'none';
       const imgFilterVal = parseInt((document.getElementById('scn-img-filter-val') as HTMLInputElement)?.value || '50');

       meta.url = u;
       meta.imgFilter = imgFilterFn;
       meta.imgFilterVal = imgFilterVal;

       // Convert hex to Rgb 
       const hexToRgb = (hex: string) => {
           let r = 0, g = 0, b = 0;
           if (hex.length == 4) { r = parseInt(hex[1]+hex[1], 16); g = parseInt(hex[2]+hex[2], 16); b = parseInt(hex[3]+hex[3], 16); }
           else if (hex.length == 7) { r = parseInt(hex.substring(1,3), 16); g = parseInt(hex.substring(3,5), 16); b = parseInt(hex.substring(5,7), 16); }
           return `${r}, ${g}, ${b}`;
       };

       meta.gradC1 = (document.getElementById('scn-c1') as HTMLInputElement).value;
       meta.gradC2 = (document.getElementById('scn-c2') as HTMLInputElement).value;
       meta.gradC1Op = parseInt((document.getElementById('scn-c1-op') as HTMLInputElement).value);
       meta.gradC2Op = parseInt((document.getElementById('scn-c2-op') as HTMLInputElement).value);
       
       const rgbaC1 = `rgba(${hexToRgb(meta.gradC1)}, ${meta.gradC1Op/100})`;
       const rgbaC2 = `rgba(${hexToRgb(meta.gradC2)}, ${meta.gradC2Op/100})`;

       meta.gradFn = (document.getElementById('scn-gradFn') as HTMLSelectElement).value;
       meta.gradDir = (document.getElementById('scn-gradDir') as HTMLSelectElement).value;
       meta.gradBlend = (document.getElementById('scn-gradBlend') as HTMLSelectElement).value;
       
       meta.patType = (document.getElementById('scn-patType') as HTMLSelectElement).value;
       meta.patC = (document.getElementById('scn-patC') as HTMLInputElement).value;
       meta.patSize = parseInt((document.getElementById('scn-patSize') as HTMLInputElement).value);
       meta.patDense = parseInt((document.getElementById('scn-patDense') as HTMLInputElement).value); // used as speed
       meta.patOpacity = (document.getElementById('scn-patOp') as HTMLInputElement).value;
       meta.patBlend = (document.getElementById('scn-patBlend') as HTMLSelectElement).value;

       meta.particles = {
           type: (document.getElementById('scn-p-type') as HTMLSelectElement)?.value || 'none',
           color: (document.getElementById('scn-p-color') as HTMLInputElement)?.value || '#ffaa00',
           count: parseInt((document.getElementById('scn-p-count') as HTMLInputElement)?.value || '20')
       };

       document.getElementById('lbl-patOp')!.textContent = meta.patOpacity;

       let combinedGrad = `${meta.gradFn}(${meta.gradDir}, ${rgbaC1}, ${rgbaC2})`;
       let patSvg = '';
       if (meta.patType !== 'none') {
           patSvg = generateSvgPattern(meta.patType, meta.patC, parseInt(meta.patOpacity), meta.patSize, meta.patDense);
       }
       
       const combinedObj = {
           mode: meta.mode,
           url: u,
           filter: imgFilterFn,
           filterVal: imgFilterVal,
           gradient: combinedGrad,
           gradBlend: meta.gradBlend,
           pattern: patSvg,
           patSpeed: meta.patDense,
           patBlend: meta.patBlend,
           layers: meta.layers || ['pat', 'grad', 'img'],
           particles: meta.particles || { type: 'none' }
       };

       (this.scenarios as any)[sId] = JSON.stringify(combinedObj); 
       this.applyRealTimeBackground((this.scenarios as any)[sId]);
    };

    // Apply Realtime function securely processing JSON layers and compiling CSS keyframes
    // Unified application for realtime preview in editor
    this.applyRealTimeBackground = (bgValue: string) => {
        applyScenarioBackground(bgValue);
    };

    document.querySelectorAll('.scn-realtime').forEach(el => {
       el.addEventListener('input', compileRealtime);
    });

    // SAVE TO CODE (Scenarios)
    this.bindSaveBtn('btn-save-scenarios', '/api/save-scenarios', this.scenarios);
  }

  private bindSaveBtn(btnId: string, endpoint: string, dataObj: any) {
    document.getElementById(btnId)?.addEventListener('click', async () => {
      const btn = document.getElementById(btnId) as HTMLButtonElement;
      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = 'GRAVANDO...';

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataObj)
        });

        if (res.ok) {
          btn.textContent = '✅ GRAVADO!';
          this.showToast('Alteração gravada no código! Vite recarregará em breve se ativo.');
        } else {
          throw new Error('Erro na gravação.');
        }
      } catch (err) {
        console.error(err);
        btn.textContent = '❌ FALHA';
        this.showToast('Falha ao gravar localmente.', '#ff4444');
      } finally {
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = originalText;
        }, 3000);
      }
    });
  }

  private renderSoundMode(): string {
    if (!this.soundCentral) {
      this.soundCentral = new SoundCentralScreen(soundsData as any, this.availableSounds);
    }
    return `<div style="width:100%; height:100%; display:flex; flex-direction:column; overflow:hidden;">${this.soundCentral.render()}</div>`;
  }

  private bindSoundMode(): void {
    if (!this.soundCentral) return;
    const container = document.querySelector('.editor-screen') as HTMLElement;
    this.soundCentral.bind(
      container,
      () => this.reRender(),
      (msg, color) => this.showToast(msg, color)
    );
  }

  private renderConfigMode(): string {
    const keys = Object.keys(this.rarities);
    const r = this.rarities[this.selectedRarityKey];

    return `
      <div class="editor-list-panel" style="flex:0.8">
        <div class="editor-section-title">CONFIGURAÇÃO DE RARIDADES</div>
        <div class="editor-card-list">
          ${keys.map(k => `
            <div class="editor-list-item ${k === this.selectedRarityKey ? 'active' : ''}" data-rarity="${k}">
               <div class="list-item-info">
                 <div class="list-item-name">${this.rarities[k].icon} ${this.rarities[k].label}</div>
                 <div class="list-item-stats">${k.toUpperCase()}</div>
               </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="editor-form-panel" style="flex:1.2">
        <div class="editor-section-title">EDITOR DE RARIDADE: ${this.selectedRarityKey.toUpperCase()}</div>
        
        <div class="form-group">
          <label>Rótulo (Label)</label>
          <input type="text" id="rarity-label" class="editor-input" value="${r.label}">
        </div>

        <div class="form-row">
          <div class="form-group" style="flex:1">
            <label>Ícone / Imagem (Local ou Emoji)</label>
            <input type="text" id="rarity-icon" class="editor-input" value="${r.icon}">
          </div>
          <div class="form-group" style="flex:1">
            <label>Cor Identificadora</label>
            <input type="color" id="rarity-color" class="editor-input" style="height:40px; padding:2px" value="${r.color}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group" style="flex:1">
            <label>Bônus de Atendimento (ATK %)</label>
            <input type="number" step="0.01" id="rarity-atk" class="editor-input" value="${r.atkBonus}">
          </div>
          <div class="form-group" style="flex:1">
            <label>Bônus de Resistência (PV %)</label>
            <input type="number" step="0.01" id="rarity-pv" class="editor-input" value="${r.pvBonus}">
          </div>
        </div>

        <div style="margin-top:auto">
          <button id="btn-save-rarities" class="editor-btn-primary" style="width:100%">💾 SALVAR CONFIGURAÇÕES GERAIS</button>
        </div>
      </div>
    `;
  }

  private bindConfigMode() {
    document.querySelectorAll('[data-rarity]').forEach(el => {
      el.addEventListener('click', () => {
        this.selectedRarityKey = (el as HTMLElement).dataset.rarity!;
        this.reRender();
      });
    });

    const update = () => {
      const r = this.rarities[this.selectedRarityKey];
      r.label = (document.getElementById('rarity-label') as HTMLInputElement).value;
      r.icon = (document.getElementById('rarity-icon') as HTMLInputElement).value;
      r.color = (document.getElementById('rarity-color') as HTMLInputElement).value;
      r.atkBonus = parseFloat((document.getElementById('rarity-atk') as HTMLInputElement).value);
      r.pvBonus = parseFloat((document.getElementById('rarity-pv') as HTMLInputElement).value);
    };

    ['rarity-label', 'rarity-icon', 'rarity-color', 'rarity-atk', 'rarity-pv'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', update);
    });

    this.bindSaveBtn('btn-save-rarities', '/api/save-rarities', this.rarities);
  }

  private renderAvailabilityForm(availability: any): string {
    const types = [
      { id: 'always', label: 'Disponível Sempre' },
      { id: 'level', label: 'Bloqueado por Nível' },
      { id: 'stage', label: 'Bloqueado por Fase' },
      { id: 'store', label: 'VENDIDO NA LOJA 🛒' },
      { id: 'ads', label: 'DESBLOQUEIO POR ADS (GRÁTIS) 📺' },
      { id: 'hidden', label: 'Escondido' }
    ];

    return `
      <div class="availability-form glass-panel" style="margin-top:10px; padding:15px; border-color:#ffd700;">
        <div class="form-group" style="margin-bottom:10px;">
          <label style="font-size:0.6rem; opacity:0.7; text-transform:uppercase; color:#ffd700;">Método de Aquisição</label>
          <select class="editor-input av-type-select" style="border-color:rgba(255,215,0,0.3)">
            ${types.map(t => `<option value="${t.id}" ${availability.type === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </div>

        ${availability.type === 'level' ? `
          <div class="form-group">
            <label>Nível Mínimo</label>
            <input type="number" class="editor-input av-min-level" value="${availability.minLevel || 1}">
          </div>
        ` : ''}

        ${availability.type === 'stage' ? `
          <div class="form-group">
            <label>ID da Fase</label>
            <input type="text" class="editor-input av-stage-id" value="${availability.stageId || ''}" placeholder="ex: stage_10">
          </div>
        ` : ''}

        ${availability.type === 'store' ? `
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div class="form-group">
              <label>Preço</label>
              <input type="number" class="editor-input av-price" value="${availability.price || 100}">
            </div>
            <div class="form-group">
              <label>Moeda</label>
              <select class="editor-input av-currency">
                <option value="gold" ${availability.currency === 'gold' ? 'selected' : ''}>🟡 Ouro (Gold)</option>
                <option value="gems" ${availability.currency === 'gems' ? 'selected' : ''}>💎 Gemas (Premium)</option>
              </select>
            </div>
          </div>
        ` : ''}

        ${availability.type === 'ads' ? `
           <div style="background:rgba(81,197,255,0.1); padding:10px; border-radius:8px; border:1px solid rgba(81,197,255,0.3); font-size:0.65rem; color:#51c5ff; font-weight:700;">
             💡 Item será liberado após o usuário assistir a um anúncio premiado no jogo.
           </div>
        ` : ''}
      </div>
    `;
  }

  private bindAvailabilityHandlers(availability: any, container: HTMLElement, onUpdate?: () => void) {
    const select = container.querySelector('.av-type-select') as HTMLSelectElement;
    select?.addEventListener('change', () => {
      availability.type = select.value;
      this.reRender();
      if (onUpdate) onUpdate();
    });

    container.querySelector('.av-min-level')?.addEventListener('input', (e) => {
      availability.minLevel = parseInt((e.target as HTMLInputElement).value);
      if (onUpdate) onUpdate();
    });

    container.querySelector('.av-stage-id')?.addEventListener('input', (e) => {
      availability.stageId = (e.target as HTMLInputElement).value;
      if (onUpdate) onUpdate();
    });

    container.querySelector('.av-price')?.addEventListener('input', (e) => {
      availability.price = parseInt((e.target as HTMLInputElement).value);
      if (onUpdate) onUpdate();
    });

    container.querySelector('.av-currency')?.addEventListener('change', (e) => {
      availability.currency = (e.target as HTMLSelectElement).value;
      if (onUpdate) onUpdate();
    });
  }

  private syncItemWithStore(type: string, itemId: string) {
    let sourceItem: any;
    if (type === 'card') sourceItem = this.templates.find(t => t.id === itemId);
    else if (type === 'scenario') {
      const av = this.scenarios.availability?.[itemId];
      if (av) sourceItem = { name: `Cenário: ${itemId.toUpperCase()}`, shopAvailability: av };
    } else if (type === 'ability') {
      sourceItem = this.abilities.find(a => a.id === itemId);
    } else if (type === 'artifact') {
      sourceItem = this.skills.find(s => s.id === itemId);
    }

    if (!sourceItem) return;
    const av = sourceItem.shopAvailability || sourceItem.availability || sourceItem; 

    this.storeItems = this.storeItems.filter(si => !(si.type === type && si.itemId === itemId));

    if (av.type === 'store' || av.type === 'ads') {
      this.storeItems.push({
        id: 'st_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name: sourceItem.name,
        description: sourceItem.flavorText || sourceItem.description || 'Novo item adicionado via editor.',
        price: av.type === 'ads' ? 0 : (av.price || 100),
        currency: av.type === 'ads' ? 'ads' : (av.currency || 'gold'),
        icon: sourceItem.image || sourceItem.icon || '',
        type: type as any,
        itemId: itemId,
        image: sourceItem.image || ''
      });
    }
    
    this.saveStore();
  }

  private syncAssetWithStore(url: string) {
    const reg = this.assetRegistry[url];
    if (!reg || !reg.shop) return;
    const id = 'asset_' + btoa(url).substr(0, 10);
    this.storeItems = this.storeItems.filter(si => si.itemId !== id);
    if (reg.shop.type === 'store' || reg.shop.type === 'ads') {
      this.storeItems.push({
        id: 'st_' + Date.now(),
        name: url.split('/').pop() || 'Asset',
        description: `Item cosmético da galeria.`,
        price: reg.shop.type === 'ads' ? 0 : (reg.shop.price || 50),
        currency: reg.shop.type === 'ads' ? 'ads' : (reg.shop.currency || 'gold'),
        icon: url,
        type: 'cosmetic' as any,
        itemId: id,
        image: url
      });
    }
    this.saveStore();
  }

  private saveAssetRegistry() {
    fetch('/api/save-assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.assetRegistry)
    });
  }

  private saveStore() {
    fetch('/api/save-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.storeItems)
    });
  }

  private async loadAvailableImages() {
     const res = await fetch('/api/images');
     if (res.ok) {
       const data = await res.json();
       this.availableCards = data.cards || [];
     }
  }

  private updateAssetManagementUI(container: HTMLElement, url: string) {
    const isVid = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url);
    const preview = container.querySelector('#art-preview-large');
    if (preview) {
      preview.innerHTML = isVid
        ? `<video src="${url}" style="width:100%; height:100%; object-fit:cover" autoplay loop muted></video>`
        : `<div style="width:100%; height:100%; background:url('${url}') center/cover no-repeat"></div>`;
    }

    const form = container.querySelector('#asset-management-form') as HTMLElement;
    if (form) form.style.display = 'flex';

    const typeSelect = container.querySelector('#asset-type-select') as HTMLSelectElement;
    if (typeSelect && this.assetRegistry[url]) {
       typeSelect.value = this.assetRegistry[url].category || 'card_art';
    }

    typeSelect?.addEventListener('change', () => {
      this.assetRegistry[url] = this.assetRegistry[url] || {};
      this.assetRegistry[url].category = typeSelect.value;
      this.saveAssetRegistry();
      this.reRender();
    });

    const shopPlaceholder = container.querySelector('#asset-availability-placeholder') as HTMLElement;
    if (shopPlaceholder) {
       if (!this.assetRegistry[url]) this.assetRegistry[url] = {};
       const reg = this.assetRegistry[url];
       if (!reg.shop) reg.shop = { type: 'always' };
       shopPlaceholder.innerHTML = this.renderAvailabilityForm(reg.shop);
       this.bindAvailabilityHandlers(reg.shop, shopPlaceholder, () => {
          this.syncAssetWithStore(url);
          this.saveAssetRegistry();
       });
    }

    container.querySelector('#btn-delete-asset')?.addEventListener('click', async () => {
       if (confirm('🚫 CUIDADO: Deletar permanentemente este arquivo?')) {
          await fetch('/api/delete-media', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          delete this.assetRegistry[url];
          this.saveAssetRegistry();
          await this.loadAvailableImages();
          this.reRender();
       }
    });

    container.querySelector('#btn-make-shop-item')?.addEventListener('click', () => {
       if (!this.assetRegistry[url]) this.assetRegistry[url] = {};
       this.assetRegistry[url].shop = { type: 'store', price: 100, currency: 'gold' };
       this.syncAssetWithStore(url);
       this.saveAssetRegistry();
       this.reRender();
    });
  }

  private reRender() {
    this.render(document.querySelector('.editor-screen')!.parentElement!);
    this.bind();
    this.updatePreview();
  }

  private updateListLabels() {
    const t = this.templates[this.selectedIndex];
    const item = document.querySelector(`.editor-list-item[data-idx="${this.selectedIndex}"]`);
    if (item && t) {
      (item.querySelector('.list-item-name') as HTMLElement).textContent = t.name;
      (item.querySelector('.list-item-stats') as HTMLElement).textContent = `💎${t.manaCost || 0} ⚡${t.staminaCost || 0} · ⚔️${t.baseAtk || 0} ❤️${t.basePv || 0}`;
      (item.querySelector('.list-item-img') as HTMLElement).style.backgroundImage = `url('${t.image}')`;
    }
  }

  private updatePreview() {
    const t = this.templates[this.selectedIndex];
    const wrapper = document.getElementById('preview-wrapper');
    const pHand = document.getElementById('preview-hand');
    const pBoard = document.getElementById('preview-board');
    if (!t || !wrapper) return;

    // Construct a mock Card 
    const mockCard: Card = {
      id: 'preview',
      name: t.name || 'Nova Carta',
      atk: t.baseAtk || 10,
      pv: t.basePv || 10,
      maxPv: t.basePv || 10,
      manaCost: t.manaCost || 1,
      staminaCost: t.staminaCost || 1,
      image: t.image,
      animationUrl: this.previewMode === 'video' ? t.animationUrl : undefined,
      videoStart: t.videoStart || 0,
      videoEnd: t.videoEnd || 5,
      rarity: t.preferredRarity || 'common',
      abilityId: t.abilityId || 'none',
      flavorText: t.flavorText || '',
      immersiveMode: t.immersiveMode,
      owner: 'p',
      nameStyle: t.nameStyle,
      descStyle: t.descStyle,
      abilityStyle: t.abilityStyle,
      statsStyle: t.statsStyle,
      borderColor: t.borderColor,
      borderWidth: t.borderWidth,
      glowColor: t.glowColor,
      glowIntensity: t.glowIntensity,
      glowAnimated: t.glowAnimated,
      borderRadius: t.borderRadius,
      fontFamily: t.fontFamily,
      fontColor: t.fontColor,
      fontSizeBase: t.fontSizeBase,
      imageFilter: t.imageFilter,
      imageFilterIntensity: t.imageFilterIntensity,
      patternOverlay: t.patternOverlay,
      patternType: t.patternType,
      patternColor: t.patternColor,
      parallaxLayers: t.parallaxLayers || [],
      particles: t.particles,
      hasVideoAttack: t.hasVideoAttack,
      attacks: t.attacks,
      specialAttack: t.specialAttack
    };

    // Toggle Play Special button
    const testBtn = document.getElementById('btn-test-special');
    if (testBtn) {
      testBtn.style.display = t.specialAttack ? 'block' : 'none';
    }

    // 1. MASTER VIEW (Fullscreen/Teatro)
    wrapper.innerHTML = this.boardRenderer.renderFullscreenCard(mockCard);
    animateParallaxLayers(wrapper, mockCard.parallaxLayers || []);

    // ── SPAWN PARTICLES (Ambient) ────────────────
    const pLayer = wrapper.querySelector('.card-particle-layer') as HTMLElement;
    if (pLayer && mockCard.particles && mockCard.particles.type !== 'none') {
        const pType = mockCard.particles.type;
        const pColor = mockCard.particles.color || '#ffaa00';
        const pCount = mockCard.particles.count || 20;

        if (pType === 'sparks') spawnSparkParticles(pLayer, pColor, pCount);
        else if (pType === 'fog') spawnAtmosphericFog(pLayer, pColor, Math.ceil(pCount/3));
        else if (pType === 'swirl') spawnMagicSwirl(pLayer, pColor, pCount);
    }


    // 2. HAND VIEW (Static Swatch)
    if (pHand) {
      pHand.innerHTML = this.boardRenderer.renderHandCard(mockCard);
      pHand.style.transform = 'scale(0.8)';
      pHand.style.transformOrigin = 'top center';
    }

    // 3. BOARD VIEW (Static Swatch)
    if (pBoard) {
      pBoard.innerHTML = this.boardRenderer.renderCard(mockCard);
      pBoard.style.transform = 'scale(0.5)';
      pBoard.style.transformOrigin = 'top center';
    }
  }

  private playTestSpecial() {
    const t = this.templates[this.selectedIndex];
    if (!t || !t.specialAttack) return;
    const sp = t.specialAttack;

    if (sp.videoUrl) {
      const wrapper = document.getElementById('preview-wrapper');
      if (!wrapper) return;
      
      const overlay = document.createElement('div');
      overlay.style.cssText = `position:absolute;inset:0;background:#000;z-index:999999;display:flex;align-items:center;justify-content:center;border-radius:24px;overflow:hidden;`;
      const vid = document.createElement('video');
      vid.src = sp.videoUrl;
      vid.autoplay = true; vid.playsInline = true;
      vid.style.cssText = `width:100%;height:100%;object-fit:cover;`;
      
      const skip = document.createElement('button');
      skip.innerHTML = '⏭️ PULAR';
      skip.style.cssText = `position:absolute;bottom:15px;right:15px;background:rgba(255,255,255,0.2);color:#fff;border:none;padding:8px 16px;border-radius:30px;font-weight:900;z-index:999999;cursor:pointer;font-size:0.6rem;`;
      
      const clean = () => overlay.remove();
      vid.onended = clean;
      skip.onclick = clean;

      overlay.appendChild(vid);
      overlay.appendChild(skip);
      wrapper.appendChild(overlay);
    } else {
      // PLAY STATIC CINEMATIC TEST (Constrained to preview-wrapper)
      const wrapper = document.getElementById('preview-wrapper');
      if (!wrapper) return;

      const fsOverlay = document.createElement('div');
      fsOverlay.style.cssText = `position:absolute;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(4px);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;border-radius:24px;overflow:hidden;`;
      
      const cloneWrap = document.createElement('div');
      cloneWrap.style.cssText = `width:260px;height:390px;position:relative;border-radius:18px;overflow:hidden;box-shadow:0 0 40px rgba(163,53,238,0.5); transform:scale(0.8);`;
      
      const mockCard: Card = { ...t, id: 'test', owner: 'p', abilityId: t.abilityId || 'none', rarity: t.preferredRarity || 'common' } as unknown as Card;
      mockCard.immersiveMode = false; // Prevent double full-screen render rules
      
      cloneWrap.innerHTML = this.boardRenderer.renderCard(mockCard);
      // Ensure the inner card spans the entire block
      const face = cloneWrap.querySelector('.card-face') as HTMLElement;
      if (face) {
        face.style.width = '100%';
        face.style.height = '100%';
        face.style.position = 'absolute';
      }

      // Shine effect (brilho que passa pela arte)
      const shine = document.createElement('div');
      shine.style.cssText = `position:absolute;top:0;left:-150%;width:50%;height:100%;background:linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);transform:skewX(-25deg);z-index:999;`;
      cloneWrap.appendChild(shine);

      const label = document.createElement('div');
      label.style.cssText = `position:absolute;bottom:-60px;text-align:center;color:#fff;width:100%;opacity:0;`;
      label.innerHTML = `
        <div style="font-size:1.6rem;font-weight:950;letter-spacing:2px;color:#a335ee;text-shadow:0 0 20px rgba(163,53,238,0.8);">${sp.name.toUpperCase()}</div>
      `;

      fsOverlay.appendChild(cloneWrap);
      fsOverlay.appendChild(label);
      wrapper.appendChild(fsOverlay);

      gsap.timeline()
        .to(fsOverlay, { opacity: 1, duration: 0.3 })
        // Leve zoom
        .to(cloneWrap, { scale: 1.15, duration: 1.6, ease: 'power1.out' }, 0)
        // Brilho passando
        .to(shine, { left: '200%', duration: 0.8, ease: 'power2.inOut' }, 0.2)
        // Nome subindo
        .to(label, { bottom: '30px', opacity: 1, duration: 0.4, ease: 'back.out(2)' }, 0.3)
        // Lunge em direção à parte superior (oponente fictício no preview)
        .to(cloneWrap, { y: -300, scale: 0.8, rotationX: 20, opacity: 0, duration: 0.3, ease: 'power2.in' }, 2.0)
        .to(fsOverlay, {
          opacity: 0, duration: 0.3, delay: 0.1,
          onComplete: () => {
            fsOverlay.remove();
            this.showToast('✅ Teste Finalizado!', '#a335ee');
          }
        });
    }
  }


  private showToast(msg: string, color = '#4cff88') {
    const t = document.getElementById('editor-toast');
    if (!t) return;
    t.textContent = msg;
    t.style.borderColor = color;
    gsap.fromTo(t, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 });
    setTimeout(() => {
      gsap.to(t, { opacity: 0, y: -10, duration: 0.3 });
    }, 4000);
  }

  private autoSaveCurrentMode() {
    let endpoint = '';
    let data = null;

    if (this.currentMode === 'cards') { endpoint = '/api/save-cards'; data = this.templates; }
    else if (this.currentMode === 'scenarios') { endpoint = '/api/save-scenarios'; data = this.scenarios; }
    else if (this.currentMode === 'habilidades') { 
        endpoint = '/api/save-abilities'; 
        data = this.abilities; 
    }
    else if (this.currentMode === 'artefatos') { 
        endpoint = '/api/save-skills'; 
        data = this.skills; 
        // Also ensure store items are saved to reflect the sync
        fetch('/api/save-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.storeItems)
        });
    }
    else if (this.currentMode === 'store') { endpoint = '/api/save-store'; data = this.storeItems; }

    if (endpoint && data) {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(res => {
          if (res.ok) this.showToast('✨ Mídia salva e persistida imediatamente!', '#4cff88');
      });
    }
  }

  private renderCardSubTabContent(): string {
    switch (this.cardSubMode) {
      case 'basico': return this.renderTabBasico();
      case 'aparencia': return this.renderTabAparencia();
      case 'estetica': return this.renderTabEstetica();
      case 'efeitos': return this.renderTabEfeitos();
      default: return this.renderTabBasico();

    }
  }

  private renderTabBasico(): string {
    const t = this.templates[this.selectedIndex];
    const attacks = t?.attacks || [];

    return `
      <div style="background:rgba(255,215,0,0.05); padding:12px; border-radius:12px; border:1px solid #ffd700; margin-bottom:15px; display:flex; flex-direction:column; gap:10px;">
        <span style="font-weight:900; color:#ffd700; font-size:0.7rem; letter-spacing:1px;">🎲 GERAR PROPRIEDADES RANDOM</span>
        <div style="display:flex; gap:8px;">
           <button id="btn-gen-common" class="editor-btn-secondary" style="flex:1; font-size:0.6rem; padding:8px;">⬜ COMUM</button>
           <button id="btn-gen-rare" class="editor-btn-secondary" style="flex:1; font-size:0.6rem; padding:8px; border-color:#51c5ff; color:#51c5ff;">🔷 RARA</button>
           <button id="btn-gen-epic" class="editor-btn-secondary" style="flex:1; font-size:0.6rem; padding:8px; border-color:#a335ee; color:#a335ee;">🔮 ÉPICA</button>
        </div>
      </div>

      <div class="form-group">
        <label>Nome da Carta</label>
        <input type="text" id="inp-name" class="editor-input" value="${t?.name || ''}">
      </div>

      <div class="form-row">
        <div class="form-group" style="flex:1.5">
          <label style="color:#51c5ff;">Custo Invoc. (💎)</label>
          <input type="number" id="inp-mana" class="editor-input" value="${t?.manaCost || 1}">
        </div>
        <div class="form-group" style="flex:2">
          <label>Ataque Base (ATK)</label>
          <input type="number" id="inp-atk" class="editor-input" value="${t?.baseAtk || 10}">
        </div>
        <div class="form-group" style="flex:2">
          <label>Vida Base (PV)</label>
          <input type="number" id="inp-pv" class="editor-input" value="${t?.basePv || 10}">
        </div>
      </div>

      <div style="margin-top:15px; background:rgba(255,255,255,0.03); padding:15px; border-radius:12px; border:1px solid rgba(255,255,255,0.1);">
        <label style="color:#51c5ff; font-weight:900; font-size:0.75rem; margin-bottom:15px; display:block; letter-spacing:1px;">⚔️ GESTÃO DE ATAQUES (1-3)</label>
        
        <div id="attacks-list" style="display:flex; flex-direction:column; gap:12px;">
          ${[0, 1, 2].map(i => {
            const atk = attacks[i];
            const has = !!atk;
            return `
              <div class="attack-entry" style="background:${has ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)'}; padding:12px; border-radius:10px; border:1px solid ${has ? 'rgba(81,197,255,0.3)' : '#333'};">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:0.6rem; color:${has ? '#51c5ff' : '#666'}; font-weight:900; letter-spacing:1.5px;">HABILIDADE #${i+1}</span>
                  ${has 
                    ? `<button class="btn-del-atk" data-idx="${i}" style="background:none; border:none; color:#ff4444; font-size:0.65rem; cursor:pointer; font-weight:900;">&times; REMOVER</button>`
                    : `<button class="btn-add-atk" data-idx="${i}" style="background:#51c5ff; border:none; border-radius:4px; color:#000; font-size:0.55rem; padding:4px 10px; font-weight:900; cursor:pointer;">+ ADICIONAR</button>`
                  }
                </div>
                ${has ? `
                  <div class="form-row" style="margin-top:10px;">
                    <div class="form-group" style="flex:2">
                       <label style="font-size:0.55rem; opacity:0.6;">NOME</label>
                       <input type="text" class="editor-input inp-atk-name" data-idx="${i}" value="${atk.name}" placeholder="Ex: Golpe Sombrio">
                    </div>
                    <div class="form-group" style="flex:1">
                       <label style="font-size:0.55rem; opacity:0.6;">DANO</label>
                       <input type="number" class="editor-input inp-atk-dmg" data-idx="${i}" value="${atk.damage}">
                    </div>
                  </div>
                  <div class="form-row" style="margin-top:8px;">
                    <div class="form-group" style="flex:1.5">
                       <label style="font-size:0.55rem; opacity:0.6;">RECURSO</label>
                       <select class="editor-input inp-atk-res" data-idx="${i}">
                         <option value="stamina" ${atk.costType === 'stamina' ? 'selected' : ''}>⚡ ESTAMINA</option>
                         <option value="mana" ${atk.costType === 'mana' ? 'selected' : ''}>💎 MANA</option>
                       </select>
                    </div>
                    <div class="form-group" style="flex:1">
                       <label style="font-size:0.55rem; opacity:0.6;">CUSTO</label>
                       <input type="number" class="editor-input inp-atk-cost" data-idx="${i}" value="${atk.cost}">
                    </div>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="form-group" style="margin-top:20px;">
        <label>Raridade Preferencial</label>
        <select id="inp-rarity" class="editor-input">
          <option value="common" ${t?.preferredRarity === 'common' ? 'selected' : ''}>⬜ Comum</option>
          <option value="rare" ${t?.preferredRarity === 'rare' ? 'selected' : ''}>🔷 Raro (+5%)</option>
          <option value="epic" ${t?.preferredRarity === 'epic' ? 'selected' : ''}>🔮 Épico (+12%)</option>
          <option value="legendary" ${t?.preferredRarity === 'legendary' ? 'selected' : ''}>⭐ Lendário (+20%)</option>
        </select>
      </div>

      <!-- SPECIAL ATTACK SECTION -->
      <div style="margin-top:15px; background:linear-gradient(135deg, rgba(120,0,255,0.08), rgba(255,165,0,0.08)); padding:15px; border-radius:12px; border:1px solid rgba(163,53,238,0.4);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <label style="color:#a335ee; font-weight:900; font-size:0.75rem; letter-spacing:1px; margin:0;">✨ ATAQUE ESPECIAL</label>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:0.55rem; opacity:0.6;">QUALQUER RARIDADE</span>
            <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
              <input type="checkbox" id="inp-special-enabled" style="accent-color:#a335ee;" ${t?.specialAttack ? 'checked' : ''}>
              <span style="font-size:0.6rem; color:#a335ee; font-weight:900;">ATIVO</span>
            </label>
          </div>
        </div>

        <div id="special-attack-fields" style="display:${t?.specialAttack ? 'flex' : 'none'}; flex-direction:column; gap:10px;">
          <div class="form-row">
            <div class="form-group" style="flex:2">
              <label style="font-size:0.55rem; opacity:0.6;">NOME DO ATAQUE</label>
              <input type="text" id="inp-special-name" class="editor-input" value="${t?.specialAttack?.name || 'ATAQUE DEFINITIVO'}" placeholder="Ex: Destruição Final">
            </div>
            <div class="form-group" style="flex:1">
              <label style="font-size:0.55rem; opacity:0.6;">DANO</label>
              <input type="number" id="inp-special-dmg" class="editor-input" value="${t?.specialAttack?.damage || 0}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group" style="flex:1.5">
              <label style="font-size:0.55rem; opacity:0.6;">RECURSO</label>
              <select id="inp-special-res" class="editor-input">
                <option value="stamina" ${(!t?.specialAttack || t?.specialAttack?.costType === 'stamina') ? 'selected' : ''}>⚡ ESTAMINA</option>
                <option value="mana" ${t?.specialAttack?.costType === 'mana' ? 'selected' : ''}>💎 MANA</option>
              </select>
            </div>
            <div class="form-group" style="flex:1">
              <label style="font-size:0.55rem; opacity:0.6;">CUSTO</label>
              <input type="number" id="inp-special-cost" class="editor-input" value="${t?.specialAttack?.cost || 9}">
            </div>
          </div>
          <div class="form-group">
            <label style="font-size:0.55rem; opacity:0.6;">DESCRIÇÃO (exibida na tela especial)</label>
            <input type="text" id="inp-special-desc" class="editor-input" value="${t?.specialAttack?.description || ''}" placeholder="Ex: Uma força devastadora que consome tudo...">
          </div>

          <!-- Video Mode -->
          <div style="background:rgba(0,0,0,0.3); border-radius:8px; padding:12px; border:1px solid rgba(255,165,0,0.2);">
            <label style="color:#ffd700; font-size:0.6rem; font-weight:900; letter-spacing:1px; display:block; margin-bottom:8px;">🎬 MODO VÍDEO (opcional)</label>
            <div style="font-size:0.55rem; opacity:0.6; margin-bottom:8px;">Se preenchido, exibe este vídeo em fullscreen antes do ataque físico.</div>
            <div style="display:flex; gap:8px;">
              <input type="text" id="inp-special-video" class="editor-input" style="flex:1;" value="${t?.specialAttack?.videoUrl || ''}" placeholder="/videos/attack_special.mp4">
              <button id="btn-pick-special-video" class="editor-btn-secondary" style="padding:0 15px; background:rgba(255,165,0,0.1); border-color:#ffd700; color:#ffd700; font-size:1rem; cursor:pointer;" title="Abrir Acervo de Mídias">📁</button>
            </div>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>Lore / Flavor Text</label>
        <textarea id="inp-flavor" class="editor-input" rows="3" style="resize:vertical">${t?.flavorText || ''}</textarea>
      </div>
    `;
  }

  private renderTabAparencia(): string {
    const t = this.templates[this.selectedIndex];
    return `
      <div class="form-group">
        <label>Arte Selecionada / Vídeo</label>
        <div style="display:flex; gap:12px; align-items:center;">
           <div id="card-media-preview" style="width:140px; height:80px; background:rgba(255,255,255,0.05); border-radius:12px; border:1px solid #444; display:flex; align-items:center; justify-content:center; overflow:hidden;">
              ${t?.animationUrl ? `<video src="${t.animationUrl}" style="width:100%; height:100%; object-fit:cover" muted loop autoplay></video>` : `<div style="width:100%; height:100%; background:url('${t?.image || ''}') center/cover no-repeat"></div>`}
           </div>
           <button id="btn-pick-card-media" class="editor-btn-secondary" style="flex:1; height:80px; font-weight:900;">GALERIA / IMPORTAR</button>
        </div>
      </div>

      <div class="form-group">
        <label>Fundo da Face</label>
        <div style="display:flex; gap:12px; align-items:center;">
           <div id="card-bg-preview" style="width:80px; height:80px; background:rgba(255,255,255,0.05); border-radius:12px; border:1px solid #444; background-image:url('${t?.cardBackground || ''}'); background-size:cover; background-position:center;"></div>
           <button id="btn-pick-card-bg" class="editor-btn-secondary" style="flex:1; height:80px; font-weight:900;">MUDAR FUNDO</button>
        </div>
      </div>

      ${t?.animationUrl ? `
      <div class="production-studio-box" style="padding:15px; border:1px solid #51c5ff; border-radius:12px; background:rgba(0,0,0,0.4); margin-bottom:20px;">
         <div style="color:#51c5ff; font-weight:900; font-size:0.75rem; margin-bottom:12px;">🎬 ESTÚDIO DE VÍDEO</div>
         <div class="form-row">
            <div class="form-group" style="flex:1">
               <label>Início (s)</label>
               <input type="number" step="0.1" id="inp-vid-start" class="editor-input" value="${t.videoStart || 0}">
            </div>
            <div class="form-group" style="flex:1">
               <label>Fim (s)</label>
               <input type="number" step="0.1" id="inp-vid-end" class="editor-input" value="${t.videoEnd || 5}">
            </div>
         </div>
         <button id="btn-gen-thumbnail" class="editor-btn-secondary" style="width:100%; margin-top:10px; font-size:0.65rem;">GERAR MINIATURA DO VÍDEO</button>
      </div>
      ` : ''}

      <!-- MAPPED FROM EFEITOS -->
      <div style="background:rgba(81,197,255,0.05); border:1px solid rgba(81,197,255,0.2); border-radius:12px; padding:15px; margin-bottom:15px;">
          <div style="color:#51c5ff; font-weight:900; font-size:0.75rem; margin-bottom:15px; text-transform:uppercase;">✨ Filtros Globais & Padrões</div>
          
          <div class="form-group">
            <label>Padrão Animado</label>
            <div class="form-row">
               <select id="inp-card-pattern" class="editor-input" style="flex:2">
                  <option value="" ${!t?.patternType ? 'selected' : ''}>Nenhum</option>
                  <option value="pulse_grid" ${t?.patternType === 'pulse_grid' ? 'selected' : ''}>Grade Cyber</option>
                  <option value="neon_rings" ${t?.patternType === 'neon_rings' ? 'selected' : ''}>Anéis Neon</option>
                  <option value="waves" ${t?.patternType === 'waves' ? 'selected' : ''}>Ondas</option>
                  <option value="stars" ${t?.patternType === 'stars' ? 'selected' : ''}>Estrelas (Parallax)</option>
                  <option value="lines" ${t?.patternType === 'lines' ? 'selected' : ''}>Linhas (Chuva)</option>
                  <option value="hex" ${t?.patternType === 'hex' ? 'selected' : ''}>Hexagonal</option>
               </select>
               <input type="color" id="inp-card-pattern-color" class="editor-input" value="${t?.patternColor || '#ffffff'}" style="flex:0.5; height:38px;">
            </div>
          </div>

          <div class="form-group">
            <label>Filtro Global (FX)</label>
            <select id="inp-card-filter" class="editor-input">
               <option value="none" ${t?.imageFilter === 'none' ? 'selected' : ''}>Normal</option>
               <option value="vhs" ${t?.imageFilter === 'vhs' ? 'selected' : ''}>VHS Glitch</option>
               <option value="chroma" ${t?.imageFilter === 'chroma' ? 'selected' : ''}>Croma Split</option>
               <option value="pulse_hue" ${t?.imageFilter === 'pulse_hue' ? 'selected' : ''}>Pulso Alien</option>
               <option value="wave" ${t?.imageFilter === 'wave' ? 'selected' : ''}>Ondas</option>
            </select>
          </div>

          <div class="form-group">
            <label>Intensidade do Filtro (${t?.imageFilterIntensity || 100}%)</label>
            <input type="range" id="inp-card-filter-intensity" min="0" max="200" value="${t?.imageFilterIntensity || 100}" class="editor-input">
          </div>
      </div>

      <!-- MAPPED FROM PARALLAX -->
      ${this.renderTabParallax()}
    `;
  }

  private renderTabEstetica(): string {
    const t = this.templates[this.selectedIndex];
    return `
      <div class="form-group">
        <label>Tipografia</label>
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">
          ${['Outfit', 'Cinzel', 'Orbitron', 'Bebas Neue', 'Playfair Display', 'Rajdhani', 'Exo 2', 'UnifrakturMaguntia'].map(fam => `
            <button class="font-picker-btn ${t?.fontFamily === fam ? 'active' : ''}" data-font="${fam}" style="font-family:'${fam}',sans-serif; font-size:0.7rem; padding:4px 8px;">${fam}</button>
          `).join('')}
        </div>
      </div>

      <div class="form-row">
        <div class="form-group" style="flex:1">
          <label>Cor do Texto</label>
          <input type="color" id="inp-color-txt" class="editor-input" value="${t?.fontColor || '#ffffff'}">
        </div>
        <div class="form-group" style="flex:1">
          <label>Tamanho (${t?.fontSizeBase || 100}%)</label>
          <input type="range" id="inp-fsize" min="70" max="150" value="${t?.fontSizeBase || 100}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group" style="flex:1">
          <label>Cor Borda</label>
          <input type="color" id="inp-border-color" class="editor-input" value="${t?.borderColor || '#ffffff'}">
        </div>
        <div class="form-group" style="flex:1">
          <label>Glow</label>
          <input type="color" id="inp-glow-color" class="editor-input" value="${t?.glowColor || '#ffffff'}">
        </div>
      </div>

      <div class="form-row">
         <div class="form-group" style="flex:1">
            <label>Borda (${t?.borderWidth || 0}px)</label>
            <input type="range" id="inp-border-width" min="0" max="10" value="${t?.borderWidth || 0}">
         </div>
         <div class="form-group" style="flex:1">
            <label>Brilho (${t?.glowIntensity || 0}px)</label>
            <input type="range" id="inp-glow-intensity" min="0" max="40" value="${t?.glowIntensity || 0}">
         </div>
      </div>
    `;
  }



  private renderTabParallax(): string {
    const t = this.templates[this.selectedIndex];
    const layers = t.parallaxLayers || [];
    const selIdx = this.selectedParallaxLayerIdx;
    const selLayer = selIdx !== null ? layers[selIdx] : null;

    return `
      <div class="parallax-manager" style="background:rgba(255,215,0,0.05); border:1px solid rgba(255,215,0,0.2); border-radius:12px; padding:15px; margin-bottom:15px;">
         <div style="color:#ffd700; font-weight:900; font-size:0.85rem; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
            <span>🏞️ CAMADAS DINÂMICAS (PARALLAX)</span>
            <button id="btn-add-parallax" class="editor-btn-secondary" style="border-color:#ffd700; color:#ffd700; font-size:0.65rem; padding:4px 12px;">+ NOVA CAMADA</button>
         </div>
         
         <div id="parallax-layers-list" style="display:flex; flex-direction:column; gap:10px;">
            ${layers.map((l: any, i: number) => `
               <div class="parallax-list-item ${selIdx === i ? 'active' : ''}" style="display:flex; gap:12px; align-items:center; background:${selIdx === i ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)'}; padding:10px; border-radius:10px; border:1px solid ${selIdx === i ? '#ffd700' : 'rgba(255,255,255,0.1)'}; cursor:pointer;" data-idx="${i}">
                  <div style="width:45px; height:45px; background:url('${l.url}') center/cover; border-radius:6px; border:1px solid rgba(255,255,255,0.2);"></div>
                  <div style="flex:1; display:flex; flex-direction:column; gap:2px;">
                     <div style="font-weight:900; font-size:0.75rem;">CAMADA ${i + 1}</div>
                     <div style="font-size:0.6rem; opacity:0.6;">Z: ${l.z} · S: ${l.speed} · BLEND: ${l.blendMode || 'normal'}</div>
                  </div>
                  <div style="display:flex; gap:8px;">
                     <button class="btn-del-parallax" data-idx="${i}" style="background:none; border:none; color:#ff4444; font-size:1rem; cursor:pointer;" title="Remover">🗑️</button>
                  </div>
               </div>
            `).join('')}
            ${layers.length === 0 ? '<div style="padding:20px; text-align:center; opacity:0.4; font-size:0.75rem;">Nenhuma camada configurada.<br>Adicione até 5 camadas de profundidade.</div>' : ''}
         </div>
      </div>

      ${selLayer ? `
      <div id="parallax-editor-detail" style="background:rgba(0,0,0,0.3); padding:20px; border-radius:15px; border:1px solid rgba(255,255,255,0.1); border-left:4px solid #ffd700;">
          <div style="color:#ffd700; font-weight:900; font-size:0.8rem; margin-bottom:15px; border-bottom:1px solid rgba(255,215,0,0.2); padding-bottom:10px; display:flex; justify-content:space-between;">
             <span>⚙️ CONFIGURAR CAMADA ${selIdx! + 1}</span>
             <button id="btn-pick-parallax-img" class="editor-btn-secondary" style="font-size:0.6rem; padding:4px 10px;">MUDAR IMAGEM</button>
          </div>

          <div class="form-row">
             <div class="form-group" style="flex:1">
                <label>Profundidade (Z-Order)</label>
                <input type="number" id="parallax-z" class="editor-input" value="${selLayer.z || 0}">
             </div>
             <div class="form-group" style="flex:1">
                <label>Intensidade/Veloc. (${selLayer.speed})</label>
                <input type="range" id="parallax-speed" min="-5" max="5" step="0.1" value="${selLayer.speed || 1}">
             </div>
          </div>

          <div class="form-row">
             <div class="form-group" style="flex:1">
                <label>Escala (${selLayer.scale || 1})</label>
                <input type="range" id="parallax-scale" min="0.5" max="3" step="0.1" value="${selLayer.scale || 1}">
             </div>
             <div class="form-group" style="flex:1">
                <label>Opacidade (${Math.round((selLayer.opacity ?? 1) * 100)}%)</label>
                <input type="range" id="parallax-opacity" min="0" max="1" step="0.1" value="${selLayer.opacity ?? 1}">
             </div>
          </div>

          <div class="form-group">
             <label>Modo de Mesclagem (Blend)</label>
             <select id="parallax-blend" class="editor-input">
                <option value="normal" ${selLayer.blendMode === 'normal' ? 'selected' : ''}>Normal</option>
                <option value="screen" ${selLayer.blendMode === 'screen' ? 'selected' : ''}>Tela (Screen)</option>
                <option value="multiply" ${selLayer.blendMode === 'multiply' ? 'selected' : ''}>Multiplicar</option>
                <option value="overlay" ${selLayer.blendMode === 'overlay' ? 'selected' : ''}>Sobrepor</option>
                <option value="color-dodge" ${selLayer.blendMode === 'color-dodge' ? 'selected' : ''}>Esquiva de Cor</option>
                <option value="plus-lighter" ${selLayer.blendMode === 'plus-lighter' ? 'selected' : ''}>Adicionar</option>
             </select>
          </div>

          <div class="form-row">
             <div class="form-group" style="flex:1">
                <label>Offset X (${selLayer.initialX || 0}px)</label>
                <input type="range" id="parallax-x" min="-200" max="200" value="${selLayer.initialX || 0}">
             </div>
             <div class="form-group" style="flex:1">
                <label>Offset Y (${selLayer.initialY || 0}px)</label>
                <input type="range" id="parallax-y" min="-200" max="200" value="${selLayer.initialY || 0}">
             </div>
          </div>

          <div style="margin-top:20px; padding:15px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:12px;">
             <div style="font-size:0.7rem; font-weight:900; opacity:0.6; margin-bottom:12px; letter-spacing:1px;">✨ FILTRO DA CAMADA</div>
             <div class="form-row">
                 <select id="parallax-filter" class="editor-input" style="flex:1.5">
                    <option value="none" ${selLayer.imageFilter === 'none' ? 'selected' : ''}>Nenhum</option>
                    <option value="vhs" ${selLayer.imageFilter === 'vhs' ? 'selected' : ''}>VHS</option>
                    <option value="chroma" ${selLayer.imageFilter === 'chroma' ? 'selected' : ''}>Croma</option>
                    <option value="pulse_hue" ${selLayer.imageFilter === 'pulse_hue' ? 'selected' : ''}>Alien</option>
                    <option value="wave" ${selLayer.imageFilter === 'wave' ? 'selected' : ''}>Ondas</option>
                 </select>
                 <input type="range" id="parallax-filter-intensity" min="0" max="200" value="${selLayer.imageFilterIntensity || 100}" class="editor-input" style="flex:1">
             </div>
          </div>
      </div>
      ` : ''}
    `;
  }

  private renderTabEfeitos(): string {
    const t = this.templates[this.selectedIndex];
    const p = t.particles || { type: 'none', color: '#ffaa00', count: 20 };

    return `
      <div style="background:rgba(163,53,238,0.05); border:1px solid rgba(163,53,238,0.2); border-radius:12px; padding:15px; margin-bottom:15px;">
          <div style="color:#a335ee; font-weight:900; font-size:0.75rem; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px;">✨ PARTÍCULAS AMBIENTAIS (PREMIUM)</div>
          
          <div class="form-group">
            <label>Tipo de Emissor</label>
            <select id="inp-particles-type" class="editor-input">
               <option value="none" ${p.type === 'none' ? 'selected' : ''}>Nenhum</option>
               <option value="sparks" ${p.type === 'sparks' ? 'selected' : ''}>🔥 Fagulhas de Alma (Soul Sparks)</option>
               <option value="fog" ${p.type === 'fog' ? 'selected' : ''}>🌫️ Névoa Atmosférica (Fog)</option>
               <option value="swirl" ${p.type === 'swirl' ? 'selected' : ''}>🌀 Redemoinho Mágico (Magic Swirl)</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group" style="flex:1">
               <label>Cor do Brilho</label>
               <input type="color" id="inp-particles-color" class="editor-input" value="${p.color || '#ffaa00'}">
            </div>
            <div class="form-group" style="flex:1">
               <label>Densidade (${p.count || 20})</label>
               <input type="range" id="inp-particles-count" min="5" max="100" value="${p.count || 20}">
            </div>
          </div>

          <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; font-size:0.55rem; color:#888; border:1px solid rgba(163,53,238,0.1); margin-top:10px;">
             💡 Estes efeitos dão o tom "Souls-like" nas artes. Névoa para cenários sombrios, Fagulhas para momentos heróicos.
          </div>
      </div>
    `;
  }

}
