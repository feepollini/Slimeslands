import * as THREE from 'three';
import {
  createBoosterFoilFrontTexture,
  createBoosterFoilBackTexture,
} from '../../../components/booster/pokemonTextures';
import { BoosterPackViewer } from '../../../components/booster/BoosterPackViewer';
import { resolveBoosterCards } from '../utils/boosterResolver';
import { StorePack, StoreData, normalizeStoreData } from './TabStore';
import { getGlobalCardBack } from '../../../../core/constants';
import { renderMatrixCardSVG } from '../utils/HestridiaMatrixRenderer';
import { loadGameMatrixSnapshot } from '../../../../card_studio/src/utils/matrixPersistence';
import { INITIAL_CARDS } from '../../../../card_studio/src/utils/defaultCards';
import { INITIAL_BASE_CHARACTERS } from '../../../../card_studio/src/utils/proceduralEngine';

export class TabPacks {
  private data: StoreData;
  private templates: any[];
  private callbacks: any;
  private reRender: () => void;
  private showToast: (msg: string, color?: string) => void;
  private saveJson: (endpoint: string, data: any) => Promise<boolean>;
  private openMediaPicker: (onSelect: (url: string) => void) => void;

  private activeSubTab: 'editor' | 'published' = 'editor';
  private selectedPackIdx: number = 0;
  private previewScene: THREE.Scene | null = null;
  private previewRenderer: THREE.WebGLRenderer | null = null;
  private previewAnimId: number | null = null;
  private previewPackGroup: THREE.Group | null = null;
  private previewFoilFrontMat: THREE.MeshStandardMaterial | null = null;
  private previewFoilBackMat: THREE.MeshStandardMaterial | null = null;

  // Cache de texturas Three.js em memória (NUNCA acoplado ao objeto pack serializado)
  private textureCache: Map<string, THREE.Texture> = new Map();

  // Filtro de cartas no seletor temático
  private cardCatalogSearch: string = '';
  private cardCatalogRarity: string = 'all';
  private cardCatalogCategory: string = 'all';
  private isMatrixSynced: boolean = false;
  private _lastSyncHash: string = '';

  // Drag Orbit 3D
  private isPointerDown: boolean = false;
  private prevPointerX: number = 0;
  private prevPointerY: number = 0;
  private targetRotX: number = 0.08;
  private targetRotY: number = 0;
  private currentRotX: number = 0.08;
  private currentRotY: number = 0;

  private cleanupWindowListeners: (() => void) | null = null;
  private mountedContainer: HTMLElement | null = null;

  constructor(state: any, callbacks: any, core: any) {
    this.data = normalizeStoreData(state.storeItems);
    this.templates = [];
    this.callbacks = callbacks;
    this.reRender = callbacks.reRender;
    this.showToast = callbacks.showToast;
    this.openMediaPicker = callbacks.openMediaPicker;
    this.saveJson = core.saveJson.bind(core);

    this.selectedPackIdx = Math.max(0, state.selectedIndex || 0);

    // Sincroniza imediatamente com as cartas reais da Matriz
    this.syncMatrixTemplates();

    window.addEventListener('matrix_library_cleared', () => {
      this.templates = [];
      this.textureCache.forEach((t) => t.dispose());
      this.textureCache.clear();
      (this.data.packs || []).forEach((p: any) => {
        p.fixedCards = [];
        p.cardGroups = { common: [], rare: [], legendary: [] };
      });
      this.saveJson('/api/save-store', this.data);
      this._lastSyncHash = 'EMPTY_CLEARED';
      if (this.mountedContainer && document.body.contains(this.mountedContainer)) {
        this.reRender();
      }
    });

    window.addEventListener('matrix_card_deleted', () => {
      this.syncMatrixTemplates();
    });

    window.addEventListener('hestridia:matrix-updated', () => {
      this.syncMatrixTemplates();
    });

    // Garante que haja pelo menos 1 pack configurado
    if (!this.data.packs || this.data.packs.length === 0) {
      this.data.packs = [
        {
          id: 'booster_starter',
          name: 'Booster Iniciante',
          desc: 'Pacote básico de cartas colecionáveis da jornada.',
          price: 0,
          currency: 'gold',
          cardsCount: 3,
          mode: 'random',
          published: true,
          rates: { common: 70, rare: 25, legendary: 5 },
          cardGroups: { common: [], rare: [], legendary: [] },
          theme: 'winter',
          customBack: 'silver',
          gridLayout: 'auto'
        }
      ];
    }
  }

  public updateContext(state: any, callbacks: any, core: any) {
    this.data = normalizeStoreData(state.storeItems);
    this.callbacks = callbacks;
    this.reRender = callbacks.reRender;
    this.showToast = callbacks.showToast;
    this.openMediaPicker = callbacks.openMediaPicker;
    this.saveJson = core.saveJson.bind(core);
    if (typeof state.selectedIndex === 'number') {
      this.selectedPackIdx = Math.max(0, state.selectedIndex);
    }
  }

  public unmount() {
    if (this.previewAnimId) {
      cancelAnimationFrame(this.previewAnimId);
      this.previewAnimId = null;
    }
    if (this.cleanupWindowListeners) {
      this.cleanupWindowListeners();
      this.cleanupWindowListeners = null;
    }
    if (this.previewRenderer) {
      this.previewRenderer.dispose();
      this.previewRenderer = null;
    }
    this.previewScene = null;
    this.previewPackGroup = null;
    this.previewFoilFrontMat = null;
    this.previewFoilBackMat = null;
    this.mountedContainer = null;
  }

  private async syncMatrixTemplates() {
    try {
      const snapshot = await loadGameMatrixSnapshot();
      if (snapshot?.isLibraryCleared) {
        this.templates = [];
        this.isMatrixSynced = true;
        this.textureCache.forEach((t) => t.dispose());
        this.textureCache.clear();
        let changed = false;
        (this.data.packs || []).forEach((p: any) => {
          if (Array.isArray(p.fixedCards) && p.fixedCards.length > 0) {
            p.fixedCards = [];
            changed = true;
          }
          if (p.cardGroups) {
            (['common', 'rare', 'legendary'] as const).forEach((grp) => {
              if (Array.isArray(p.cardGroups[grp]) && p.cardGroups[grp].length > 0) {
                p.cardGroups[grp] = [];
                changed = true;
              }
            });
          }
        });
        if (changed) {
          this.saveJson('/api/save-store', this.data);
        }
        if (this._lastSyncHash !== 'EMPTY_CLEARED') {
          this._lastSyncHash = 'EMPTY_CLEARED';
          this.reRender();
        }
        return;
      }

      const matrixCards: any[] = [];
      const seenNames = new Set<string>();

      const addMatrixCardEntry = (cd: any) => {
        if (!cd) return;
        const name = cd.title || cd.name;
        if (!name || seenNames.has(name.toLowerCase().trim())) return;
        seenNames.add(name.toLowerCase().trim());

        const basePv = cd.pvNumber || parseInt((cd.pvText || '').replace(/\D/g, '')) || 400;
        const atk = parseInt(cd.pills?.[0]?.mainText || '200') || 200;
        const rKey = cd.cardRank === 'S' ? 'legendary' : cd.cardRank === 'A' ? 'epic' : cd.cardRank === 'B' ? 'rare' : 'common';

        matrixCards.push({
          id: cd.id,
          name,
          title: name,
          image: cd.imageUrl || '',
          imageUrl: cd.imageUrl || '',
          baseAtk: atk,
          basePv,
          rarity: rKey,
          preferredRarity: rKey,
          family: (cd as any).family || (cd.elementText || 'Geral'),
          biome: (cd as any).biome || 'Geral',
          cardData: cd,
        });
      };

      // 1. Cartas do estúdio Matriz (ou INITIAL_CARDS caso ainda não haja snapshot persistido)
      const activeCards =
        snapshot?.cards && snapshot.cards.length > 0 ? snapshot.cards : INITIAL_CARDS;
      activeCards.forEach(addMatrixCardEntry);

      if (Array.isArray(snapshot?.playerInventory)) {
        snapshot!.playerInventory!.forEach(addMatrixCardEntry);
      }

      // 2. Personagens / Blueprints da Matriz (classificados)
      const activeBaseChars =
        snapshot?.baseCharacters && snapshot.baseCharacters.length > 0
          ? snapshot.baseCharacters
          : INITIAL_BASE_CHARACTERS;
      activeBaseChars.forEach((bc: any) => {
        if (bc.isClassified === false || bc.rarity === 'Não classificada') return;
        const name = bc.name;
        if (!name || seenNames.has(name.toLowerCase().trim())) return;
        seenNames.add(name.toLowerCase().trim());

        const rKey = bc.rarity === 'Mítica' || bc.rarity === 'Lendária' ? 'legendary' : bc.rarity === 'Épica' ? 'epic' : bc.rarity === 'Rara' ? 'rare' : 'common';

        matrixCards.push({
          id: bc.id,
          name,
          title: name,
          image: bc.imageUrl || '',
          imageUrl: bc.imageUrl || '',
          baseAtk: bc.stats?.baseDamage || 200,
          basePv: bc.stats?.baseHealth || 400,
          rarity: rKey,
          preferredRarity: rKey,
          family: bc.family || 'Geral',
          biome: bc.biome || 'Geral',
          baseCharacter: bc,
        });
      });

      this.templates = matrixCards;
      this.isMatrixSynced = true;

      // Purga absoluta em todos os boosters: remove qualquer carta fixa ou em grupos que não existe mais na Matriz
      const validNames = new Set(matrixCards.map((c) => c.name.toLowerCase().trim()));
      let changedPacks = false;
      (this.data.packs || []).forEach((p: any) => {
        if (Array.isArray(p.fixedCards) && p.fixedCards.length > 0) {
          const prevLen = p.fixedCards.length;
          p.fixedCards = p.fixedCards.filter((name: string) => validNames.has(name.toLowerCase().trim()));
          if (p.fixedCards.length !== prevLen) {
            changedPacks = true;
          }
        }
        if (p.cardGroups) {
          (['common', 'rare', 'legendary'] as const).forEach((grp) => {
            if (Array.isArray(p.cardGroups[grp]) && p.cardGroups[grp].length > 0) {
              const prev = p.cardGroups[grp].length;
              p.cardGroups[grp] = p.cardGroups[grp].filter((name: string) => validNames.has(name.toLowerCase().trim()));
              if (p.cardGroups[grp].length !== prev) changedPacks = true;
            }
          });
        }
      });

      if (changedPacks) {
        this.saveJson('/api/save-store', this.data);
      }

      const hash = matrixCards.map((c) => c.name).sort().join('|');
      const packsHash = (this.data.packs || []).map((p) => (p.fixedCards || []).join(',')).join(';');
      const fullHash = `${hash}:::${packsHash}`;
      if (this._lastSyncHash !== fullHash) {
        this._lastSyncHash = fullHash;
        if (this.mountedContainer && document.body.contains(this.mountedContainer)) {
          this.reRender();
        }
      }
    } catch (err) {
      console.warn('Falha ao sincronizar Matriz no TabPacks:', err);
    }
  }

  private esc(s: string): string {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  private getRarityKey(t: any): 'common' | 'rare' | 'epic' | 'legendary' {
    const r = (t?.rarity || t?.raridade || t?.preferredRarity || '').toString().toLowerCase();
    if (r.includes('leg') || r.includes('mit') || r.includes('mít')) return 'legendary';
    if (r.includes('epi') || r.includes('épi')) return 'epic';
    if (r.includes('rar')) return 'rare';
    return 'common';
  }

  public render(): string {
    const packs = this.data.packs || [];
    const activeIdx = Math.max(0, Math.min(packs.length - 1, this.selectedPackIdx));
    const pack = packs[activeIdx] || packs[0];

    // Garante propriedades do pack ativo
    if (!pack.rates) pack.rates = { common: 70, rare: 25, legendary: 5 };
    if (!pack.fixedCards) pack.fixedCards = [];
    if (pack.published === undefined) pack.published = true;

    const publishedCount = packs.filter((p: any) => p.published !== false && p.active !== false).length;
    const totalRate = (Number(pack.rates.common) || 0) + (Number(pack.rates.rare) || 0) + (Number(pack.rates.legendary) || 0);
    const isRateBalanced = totalRate === 100;

    return `
      <div style="flex:1; display:flex; flex-direction:column; overflow-y:auto; gap:16px; padding:20px; font-family:'Outfit', sans-serif;">
        <!-- CABEÇALHO COM SUB-ABAS E SALVAMENTO -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:14px; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="margin:0; font-size:1.15rem; font-weight:900; letter-spacing:2px; color:#ffd700; display:flex; align-items:center; gap:8px;">
              <span>📦</span> GESTÃO & CRIAÇÃO DE BOOSTERS
            </h2>
            <p style="margin:4px 0 0 0; font-size:0.75rem; color:#aaa;">
              Personalize capas, verso da embalagem, preços e conecte diretamente com a coleção real de cartas do jogo.
            </p>
          </div>

          <div style="display:flex; align-items:center; gap:12px;">
            <!-- SUB-ABAS -->
            <div style="display:flex; background:rgba(0,0,0,0.5); padding:4px; border-radius:10px; border:1px solid rgba(255,255,255,0.1);">
              <button id="subtab-btn-editor" style="padding:6px 16px; border-radius:8px; border:none; font-size:0.72rem; font-weight:900; cursor:pointer; transition:0.2s; ${this.activeSubTab === 'editor' ? 'background:#ffd700; color:#000;' : 'background:transparent; color:#bbb;'}">
                🛠️ CRIADOR / EDITOR
              </button>
              <button id="subtab-btn-published" style="padding:6px 16px; border-radius:8px; border:none; font-size:0.72rem; font-weight:900; cursor:pointer; transition:0.2s; ${this.activeSubTab === 'published' ? 'background:#38bdf8; color:#000;' : 'background:transparent; color:#bbb;'}">
                🏪 PUBLICADOS NA LOJA (${publishedCount})
              </button>
            </div>

            <button id="btn-save-packs" class="editor-btn-primary" style="font-size:0.75rem; font-weight:900; letter-spacing:1px; padding:9px 20px;">
              💾 SALVAR PACKS NO JOGO
            </button>
          </div>
        </div>

        ${this.activeSubTab === 'editor' ? this.renderEditorView(pack, packs, activeIdx, isRateBalanced, totalRate) : this.renderPublishedView(packs)}
      </div>
    `;
  }

  // SUB-ABA 1: EDITOR DO BOOSTER
  private renderEditorView(pack: StorePack, packs: StorePack[], activeIdx: number, isRateBalanced: boolean, totalRate: number): string {
    const isPackActive = pack.published !== false && (pack as any).active !== false;

    // Contagem de cartas reais da coleção por raridade
    const totalCom = this.templates.filter(t => this.getRarityKey(t) === 'common').length;
    const totalRare = this.templates.filter(t => this.getRarityKey(t) === 'rare').length;
    const totalLeg = this.templates.filter(t => this.getRarityKey(t) === 'legendary').length;

    return `
      <!-- BARRA DE GESTÃO DO BOOSTER (SELEÇÃO, DUPLICAÇÃO, STATUS) -->
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); padding:10px 14px; border-radius:12px;">
        <span style="font-size:0.72rem; font-weight:900; color:#ffd700; letter-spacing:1px;">BOOSTERS:</span>
        <div style="display:flex; gap:8px; flex:1; flex-wrap:wrap;">
          ${packs.map((p, i) => {
            const pub = p.published !== false && (p as any).active !== false;
            return `
              <button class="editor-btn-secondary tab-pack-select-btn" data-idx="${i}" style="font-size:0.72rem; padding:6px 14px; display:flex; align-items:center; gap:6px; ${i === activeIdx ? 'border-color:#ffd700; color:#ffd700; background:rgba(255,215,0,0.14); font-weight:900;' : ''}">
                <span>${pub ? '🟢' : '⏸️'}</span>
                <span>${this.esc(p.name)}</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- AÇÕES DO PACK ATIVO -->
        <div style="display:flex; gap:8px; align-items:center;">
          <button id="btn-toggle-publish" style="padding:6px 12px; font-size:0.7rem; font-weight:900; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:6px; ${isPackActive ? 'background:rgba(34,197,94,0.15); border:1px solid #22c55e; color:#4ade80;' : 'background:rgba(234,179,8,0.15); border:1px solid #eab308; color:#facc15;'}">
            <span>${isPackActive ? '🟢 PUBLICADO NA LOJA' : '⏸️ PAUSADO (OCULTO)'}</span>
          </button>
          <button id="btn-duplicate-pack" class="editor-btn-secondary" style="font-size:0.7rem; color:#38bdf8; border-color:#38bdf8;">
            📋 DUPLICAR
          </button>
          <button id="btn-add-new-pack" class="editor-btn-secondary" style="font-size:0.7rem; color:#4ade80; border-color:#4ade80;">
            + NOVO PACK
          </button>
          ${packs.length > 1 ? `
            <button id="btn-del-pack" style="background:none; border:1px solid #ef4444; color:#ef4444; border-radius:8px; padding:6px 10px; font-size:0.7rem; cursor:pointer;" title="Excluir este pacote">
              🗑️
            </button>
          ` : ''}
        </div>
      </div>

      <style>
        .tab-packs-3col-container {
          display: grid;
          grid-template-columns: 1fr 1fr 1.15fr;
          gap: 16px;
          align-items: stretch;
          width: 100%;
        }
        @media (max-width: 1200px) {
          .tab-packs-3col-container {
            grid-template-columns: 1fr 1fr;
          }
          .tab-packs-col-distribution {
            grid-column: span 2;
          }
        }
        @media (max-width: 768px) {
          .tab-packs-3col-container {
            grid-template-columns: 1fr;
          }
          .tab-packs-col-distribution {
            grid-column: span 1;
          }
        }
      </style>

      <!-- 3 MENUS UM DO LADO DO OUTRO (LAYOUT COESO) -->
      <div class="tab-packs-3col-container">
        
        <!-- MENU 1: PREVIEW 3D DO BOOSTER (STUDIO) -->
        <div style="background:#09090b; border:1px solid rgba(255,255,255,0.12); border-radius:14px; position:relative; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 8px 30px rgba(0,0,0,0.5); min-height:540px;">
          <div style="padding:12px 14px 6px 14px; font-size:0.8rem; font-weight:900; letter-spacing:1px; color:#ffd700; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; gap:6px;">
            <span>📦</span> PREVIEW 3D DA EMBALAGEM
          </div>

          <div id="pack-3d-canvas-container" style="flex:1; width:100%; min-height:430px; background:#111218; touch-action:none; cursor:grab; position:relative;"></div>
          
          <div style="position:absolute; top:42px; left:14px; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); border:1px solid rgba(255,255,255,0.2); border-radius:8px; padding:4px 10px; font-size:0.65rem; color:#ddd; pointer-events:none; z-index:10;">
            🖱️ Arraste para girar a embalagem em 3D
          </div>

          <div style="position:absolute; bottom:14px; left:50%; transform:translateX(-50%); display:flex; gap:8px; z-index:10; white-space:nowrap;">
            <button id="btn-open-interactive-modal" style="padding:9px 18px; background:linear-gradient(180deg, #38bdf8, #0284c7); border:2px solid #bae6fd; border-radius:999px; color:#fff; font-size:0.72rem; font-weight:900; letter-spacing:0.5px; cursor:pointer; box-shadow:0 4px 16px rgba(2,132,199,0.5);">
              ✨ TESTAR ABERTURA (3D)
            </button>
            <button id="btn-reset-3d-preview" style="padding:9px 14px; background:rgba(0,0,0,0.75); border:1px solid rgba(255,255,255,0.25); border-radius:999px; color:#fff; font-size:0.7rem; font-weight:600; cursor:pointer;">
              🔄 Resetar
            </button>
          </div>
        </div>

        <!-- MENU 2: PAINEL DE ARTES DA EMBALAGEM E DADOS DE VENDA -->
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:14px; min-height:540px;">
          
          <!-- ARTES DA EMBALAGEM -->
          <div style="font-size:0.8rem; font-weight:900; letter-spacing:1px; color:#ffd700; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:6px; display:flex; align-items:center; gap:6px;">
            <span>🎨</span> ARTES DA EMBALAGEM (FRENTE & VERSO)
          </div>

          <div style="display:flex; flex-direction:column; gap:10px;">
            <!-- FRENTE -->
            <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:10px; display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.7rem; font-weight:900; color:#fff;">FRENTE:</span>
                <span id="txt-front-status" style="font-size:0.62rem; color:${pack.customFront ? '#4ade80' : '#aaa'}; font-weight:700;">
                  ${pack.customFront ? '✅ Definida' : '⚪ Padrão'}
                </span>
              </div>
              <div style="display:flex; gap:10px; align-items:center;">
                <div id="front-thumb-preview" style="width:44px; height:66px; border-radius:8px; border:1px solid rgba(255,255,255,0.2); background:rgba(0,0,0,0.6); overflow:hidden; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  ${pack.customFront ? `<img src="${pack.customFront}" style="width:100%; height:100%; object-fit:cover;">` : '<span style="font-size:1.2rem;">📦</span>'}
                </div>
                <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
                  <label class="editor-btn-primary" style="display:flex; align-items:center; justify-content:center; gap:6px; font-size:0.65rem; padding:6px 8px; cursor:pointer;">
                    <span>📁 Upload do PC</span>
                    <input id="input-upload-front" type="file" accept="image/*" style="display:none;">
                  </label>
                  <div style="display:flex; gap:4px;">
                    <button id="btn-pick-front-gallery" class="editor-btn-secondary" style="font-size:0.62rem; padding:5px 6px; flex:1;">
                      🖼️ Galeria
                    </button>
                    ${pack.customFront ? `
                      <button id="btn-clear-front" class="editor-btn-secondary" style="font-size:0.62rem; padding:5px 6px; color:#ef4444;" title="Restaurar padrão">
                        ✕
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            </div>

            <!-- VERSO -->
            <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:10px; display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.7rem; font-weight:900; color:#fff;">VERSO:</span>
                <span id="txt-back-status" style="font-size:0.62rem; color:${pack.customBack && (pack.customBack.startsWith('data:') || pack.customBack.startsWith('/')) ? '#4ade80' : '#aaa'}; font-weight:700;">
                  ${pack.customBack && (pack.customBack.startsWith('data:') || pack.customBack.startsWith('/')) ? '✅ Definido' : `⚪ ${pack.customBack || 'Prata'}`}
                </span>
              </div>
              <div style="display:flex; gap:10px; align-items:center;">
                <div id="back-thumb-preview" style="width:44px; height:66px; border-radius:8px; border:1px solid rgba(255,255,255,0.2); background:rgba(0,0,0,0.6); overflow:hidden; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  ${pack.customBack && (pack.customBack.startsWith('data:') || pack.customBack.startsWith('/')) ? `<img src="${pack.customBack}" style="width:100%; height:100%; object-fit:cover;">` : '<span style="font-size:1.2rem;">🛡️</span>'}
                </div>
                <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
                  <label class="editor-btn-secondary" style="display:flex; align-items:center; justify-content:center; gap:6px; font-size:0.65rem; padding:6px 8px; cursor:pointer;">
                    <span>📁 Upload do PC</span>
                    <input id="input-upload-back" type="file" accept="image/*" style="display:none;">
                  </label>
                  <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:3px;">
                    <button class="editor-btn-secondary btn-back-preset" data-back="silver" style="font-size:0.58rem; padding:4px 2px; ${pack.customBack === 'silver' || !pack.customBack ? 'border-color:#ffd700; color:#ffd700;' : ''}">Prata</button>
                    <button class="editor-btn-secondary btn-back-preset" data-back="gold" style="font-size:0.58rem; padding:4px 2px; ${pack.customBack === 'gold' ? 'border-color:#ffd700; color:#ffd700;' : ''}">Ouro</button>
                    <button class="editor-btn-secondary btn-back-preset" data-back="black" style="font-size:0.58rem; padding:4px 2px; ${pack.customBack === 'black' ? 'border-color:#ffd700; color:#ffd700;' : ''}">Ônix</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- DADOS DE VENDA -->
          <div style="font-size:0.8rem; font-weight:900; letter-spacing:1px; color:#38bdf8; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:6px; margin-top:4px; display:flex; align-items:center; gap:6px;">
            <span>⚙️</span> DADOS DO BOOSTER NA LOJA
          </div>

          <div>
            <label style="font-size:0.65rem; color:#aaa; font-weight:700; display:block; margin-bottom:4px;">Nome:</label>
            <input type="text" id="pack-input-name" class="editor-input" value="${this.esc(pack.name)}" style="font-size:0.75rem; font-weight:900; color:#ffd700; width:100%; box-sizing:border-box;">
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
            <div>
              <label style="font-size:0.65rem; color:#aaa; font-weight:700; display:block; margin-bottom:4px;">Preço:</label>
              <input type="number" id="pack-input-price" class="editor-input" value="${pack.price ?? 0}" min="0" style="font-size:0.75rem; width:100%; box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:0.65rem; color:#aaa; font-weight:700; display:block; margin-bottom:4px;">Moeda:</label>
              <select id="pack-input-currency" class="editor-input" style="font-size:0.72rem; width:100%; box-sizing:border-box;">
                <option value="gold" ${pack.currency !== 'gems' && pack.currency !== 'enjin' ? 'selected' : ''}>🪙 Ouro</option>
                <option value="gems" ${pack.currency === 'gems' ? 'selected' : ''}>💎 Gemas</option>
                <option value="enjin" ${pack.currency === 'enjin' ? 'selected' : ''}>🟣 ENJ</option>
              </select>
            </div>
            <div>
              <label style="font-size:0.65rem; color:#aaa; font-weight:700; display:block; margin-bottom:4px;">Cartas:</label>
              <input type="number" id="pack-input-count" class="editor-input" value="${pack.cardsCount || 3}" min="1" max="15" style="font-size:0.75rem; width:100%; box-sizing:border-box;">
            </div>
          </div>

          <div>
            <label style="font-size:0.65rem; color:#aaa; font-weight:700; display:block; margin-bottom:4px;">Descrição / Lore do Pacote:</label>
            <textarea id="pack-input-desc" class="editor-input" rows="2" style="font-size:0.72rem; width:100%; box-sizing:border-box;">${this.esc(pack.desc || '')}</textarea>
          </div>

        </div>

        <!-- MENU 3: DISTRIBUIÇÃO DAS CARTAS DO JOGO (COLEÇÃO REAL) -->
        <div class="tab-packs-col-distribution" style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:14px; min-height:540px;">
          
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:8px;">
            <div>
              <div style="font-size:0.8rem; font-weight:900; color:#ffd700; letter-spacing:1px; display:flex; align-items:center; gap:6px;">
                <span>🃏</span> DISTRIBUIÇÃO DE CARTAS
              </div>
              <div style="font-size:0.65rem; color:#aaa; margin-top:2px;">
                Total: <strong>${this.templates.length} cartas</strong> (${totalCom} Comuns, ${totalRare} Raras, ${totalLeg} Lendárias)
              </div>
            </div>

            <!-- ALTERNÂNCIA DE MODO -->
            <div style="display:flex; gap:6px; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
              <label style="display:flex; align-items:center; gap:4px; font-size:0.68rem; cursor:pointer;">
                <input type="radio" name="pack-mode" value="random" ${pack.mode !== 'special' ? 'checked' : ''}>
                <span style="font-weight:700; color:#fff;">🎲 Probabilidade</span>
              </label>
              <label style="display:flex; align-items:center; gap:4px; font-size:0.68rem; cursor:pointer;">
                <input type="radio" name="pack-mode" value="special" ${pack.mode === 'special' ? 'checked' : ''}>
                <span style="font-weight:700; color:#38bdf8;">⭐ Temático</span>
              </label>
            </div>
          </div>

          ${pack.mode !== 'special' ? `
            <!-- MODO 1: PROBABILIDADES DAS RARIDADES -->
            <div style="display:flex; flex-direction:column; gap:10px; background:rgba(255,255,255,0.02); padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.06); flex:1;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.68rem; color:#cbd5e1;">Chances de sorteio por raridade:</span>
                <span id="rates-total-badge" style="font-size:0.68rem; font-weight:900; padding:3px 10px; border-radius:999px; ${isRateBalanced ? 'background:rgba(34,197,94,0.15); color:#4ade80; border:1px solid #22c55e;' : 'background:rgba(234,179,8,0.15); color:#facc15; border:1px solid #eab308;'}">
                  ${isRateBalanced ? '✅ Total: 100%' : `⚠️ Total: ${totalRate}%`}
                </span>
              </div>

              <!-- COMUM -->
              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.15); border-radius:10px; padding:10px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                <div>
                  <div style="font-size:0.75rem; font-weight:900; color:#fff;">⬜ CARTAS COMUNS</div>
                  <div style="font-size:0.62rem; color:#aaa;">${totalCom} disponíveis no acervo</div>
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                  <input type="number" id="pack-rate-common" class="editor-input" value="${pack.rates.common ?? 70}" min="0" max="100" style="font-size:0.85rem; font-weight:900; text-align:center; width:65px;">
                  <span style="font-size:0.75rem; color:#aaa; font-weight:700;">%</span>
                </div>
              </div>

              <!-- RARA -->
              <div style="background:rgba(56,189,248,0.06); border:1px solid rgba(56,189,248,0.3); border-radius:10px; padding:10px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                <div>
                  <div style="font-size:0.75rem; font-weight:900; color:#38bdf8;">🔷 CARTAS RARAS</div>
                  <div style="font-size:0.62rem; color:#38bdf8;">${totalRare} disponíveis no acervo</div>
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                  <input type="number" id="pack-rate-rare" class="editor-input" value="${pack.rates.rare ?? 25}" min="0" max="100" style="font-size:0.85rem; font-weight:900; text-align:center; width:65px;">
                  <span style="font-size:0.75rem; color:#aaa; font-weight:700;">%</span>
                </div>
              </div>

              <!-- LENDÁRIA -->
              <div style="background:rgba(234,179,8,0.06); border:1px solid rgba(234,179,8,0.3); border-radius:10px; padding:10px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                <div>
                  <div style="font-size:0.75rem; font-weight:900; color:#ffd700;">⭐ CARTAS LENDÁRIAS</div>
                  <div style="font-size:0.62rem; color:#ffd700;">${totalLeg} disponíveis no acervo</div>
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                  <input type="number" id="pack-rate-legendary" class="editor-input" value="${pack.rates.legendary ?? 5}" min="0" max="100" style="font-size:0.85rem; font-weight:900; text-align:center; width:65px;">
                  <span style="font-size:0.75rem; color:#aaa; font-weight:700;">%</span>
                </div>
              </div>
            </div>
          ` : `
            <!-- MODO 2: BOOSTER TEMÁTICO (CARTAS FIXAS DO JOGO) -->
            <div style="display:flex; flex-direction:column; gap:10px; background:rgba(255,255,255,0.02); padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.06); flex:1; min-height:0;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <span style="font-size:0.72rem; font-weight:900; color:#38bdf8;">CARTAS INCLUÍDAS (${pack.fixedCards.length}):</span>
                <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                  <input type="text" id="input-catalog-search" class="editor-input" placeholder="🔍 Filtrar..." value="${this.esc(this.cardCatalogSearch)}" style="font-size:0.65rem; padding:3px 8px; width:100px;">
                  <button id="btn-clean-ghost-fixed" class="editor-btn-secondary" style="font-size:0.62rem; color:#f59e0b; border-color:#f59e0b; padding:3px 6px;" title="Limpar cartas que não existem">
                    🧹 Órfãs
                  </button>
                  <button id="btn-clear-all-fixed" class="editor-btn-secondary" style="font-size:0.62rem; color:#ef4444; border-color:#ef4444; padding:3px 6px;">
                    ✕ Limpar
                  </button>
                </div>
              </div>

              <!-- FILTRO DE CATEGORIAS / FAMÍLIAS DA MATRIZ -->
              <div style="display:flex; gap:4px; flex-wrap:wrap; align-items:center; border-top:1px solid rgba(255,255,255,0.06); padding-top:6px;">
                ${this.renderCategoryFilterButtons()}
              </div>

              <!-- SELETOR VISUAL POR RARIDADE -->
              <div style="max-height:360px; overflow-y:auto; padding:6px; background:rgba(0,0,0,0.3); border-radius:10px; border:1px solid rgba(255,255,255,0.05); flex:1;">
                ${this.renderCardCatalogGrid(pack)}
              </div>
            </div>
          `}
        </div>

      </div>
    `;
  }

  private renderCategoryFilterButtons(): string {
    const categoriesSet = new Set<string>();
    this.templates.forEach((t) => {
      if (t.family && t.family !== 'Geral') categoriesSet.add(t.family);
      if (t.biome && t.biome !== 'Geral') categoriesSet.add(t.biome);
    });

    const categories = ['all', ...Array.from(categoriesSet)];
    return categories.map((cat) => {
      const isSel = this.cardCatalogCategory === cat;
      const label = cat === 'all' ? 'Todas as Categorias' : cat;
      return `
        <button class="btn-catalog-cat" data-cat="${this.esc(cat)}" style="font-size:0.62rem; font-weight:700; padding:3px 10px; border-radius:9999px; cursor:pointer; transition:0.15s; ${
          isSel
            ? 'background:#38bdf8; color:#000; border:1px solid #38bdf8;'
            : 'background:rgba(255,255,255,0.06); color:#cbd5e1; border:1px solid rgba(255,255,255,0.12);'
        }">
          ${label}
        </button>
      `;
    }).join('');
  }

  // SELETOR VISUAL POR RARIDADE: um grupo de cartas para cada raridade,
  // com contagem e botões TODAS/NENHUMA por grupo.
  private renderCardCatalogGrid(pack: StorePack): string {
    const fixedSet = new Set(pack.fixedCards || []);
    const search = this.cardCatalogSearch.toLowerCase().trim();
    const cat = this.cardCatalogCategory;
    const matches = (t: any) => {
      const matchSearch = !search || (t.name || t.title || '').toLowerCase().includes(search);
      const matchCat = cat === 'all' || t.family === cat || t.biome === cat;
      return matchSearch && matchCat;
    };

    const groups: { key: string; label: string; color: string }[] = [
      { key: 'common', label: 'COMUNS', color: '#e2e8f0' },
      { key: 'rare', label: 'RARAS', color: '#38bdf8' },
      { key: 'epic', label: 'ÉPICAS', color: '#c084fc' },
      { key: 'legendary', label: 'LENDÁRIAS', color: '#ffd700' },
    ];

    const sections = groups.map((g) => {
      const list = this.templates.filter((t) => this.getRarityKey(t) === g.key && matches(t));
      if (!list.length) return '';
      const sel = list.filter((t) => fixedSet.has(t.name)).length;
      return `
        <div style="margin-bottom:16px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
            <span style="width:10px; height:10px; border-radius:50%; background:${g.color}; box-shadow:0 0 8px ${g.color};"></span>
            <span style="font-size:0.7rem; font-weight:900; letter-spacing:1px; color:${g.color};">${g.label}</span>
            <span style="font-size:0.62rem; color:#aaa;">${sel}/${list.length}</span>
            <span style="flex:1;"></span>
            <button class="btn-rarity-all" data-rarity="${g.key}" style="font-size:0.6rem; font-weight:800; padding:3px 10px; border-radius:8px; cursor:pointer; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.2); color:#fff;">TODAS</button>
            <button class="btn-rarity-none" data-rarity="${g.key}" style="font-size:0.6rem; font-weight:800; padding:3px 10px; border-radius:8px; cursor:pointer; background:transparent; border:1px solid rgba(255,255,255,0.15); color:#aaa;">NENHUMA</button>
          </div>
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap:10px;">
            ${list.map((t) => this.renderCatalogTile(t, fixedSet.has(t.name))).join('')}
          </div>
        </div>`;
    }).join('');

    if (!sections.trim()) {
      return '<div style="text-align:center; padding:20px; color:#aaa; font-size:0.75rem;">Nenhuma carta encontrada com este nome.</div>';
    }
    return sections;
  }

  private renderCatalogTile(t: any, isSelected: boolean): string {
    const rarity = this.getRarityKey(t);
    const rColor = rarity === 'legendary' ? '#ffd700' : rarity === 'epic' ? '#c084fc' : (rarity === 'rare' ? '#38bdf8' : '#e2e8f0');
    const img = t.image || '/cards/fundo_de_carta.png';

    return `
        <div class="btn-toggle-fixed-card" data-name="${this.esc(t.name)}" style="display:flex; flex-direction:column; border-radius:8px; overflow:hidden; border:2px solid ${isSelected ? '#38bdf8' : 'rgba(255,255,255,0.1)'}; background:${isSelected ? 'rgba(56,189,248,0.15)' : 'rgba(0,0,0,0.4)'}; cursor:pointer; transition:0.15s; position:relative; box-shadow:${isSelected ? '0 0 12px rgba(56,189,248,0.4)' : 'none'};">
          ${isSelected ? `
            <div style="position:absolute; top:4px; right:4px; background:#38bdf8; color:#000; font-size:0.6rem; font-weight:900; border-radius:50%; width:18px; height:18px; display:flex; align-items:center; justify-content:center; z-index:2;">✓</div>
          ` : ''}
          <div style="width:100%; height:120px; position:relative; overflow:hidden;">
            ${renderMatrixCardSVG(t, { mode: 'thumb', animateChroma: false })}
          </div>
          <div style="padding:6px; display:flex; flex-direction:column; gap:2px;">
            <div style="font-size:0.65rem; font-weight:800; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${this.esc(t.name)}">
              ${this.esc(t.name)}
            </div>
            <div style="font-size:0.55rem; color:#aaa;">
              ⚔️ ${t.baseAtk ?? 3} · 💚 ${t.basePv ?? 5}
            </div>
          </div>
        </div>
      `;
  }

  // SUB-ABA 2: PUBLICADOS NA LOJA
  private renderPublishedView(packs: StorePack[]): string {
    return `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.75rem; color:#aaa;">Gerencie rapidamente a visibilidade de todos os boosters da loja:</span>
          <button id="btn-quick-new-pack" class="editor-btn-primary" style="font-size:0.72rem; padding:6px 14px;">
            + Criar Novo Booster
          </button>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
          ${packs.map((p, i) => {
            const isPub = p.published !== false && (p as any).active !== false;
            return `
              <div style="background:rgba(0,0,0,0.4); border:1px solid ${isPub ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)'}; border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; gap:12px; align-items:center;">
                  <div style="width:50px; height:75px; border-radius:8px; overflow:hidden; background:#111; border:1px solid rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    ${p.customFront ? `<img src="${p.customFront}" style="width:100%; height:100%; object-fit:cover;">` : '<span style="font-size:1.4rem;">📦</span>'}
                  </div>
                  <div style="flex:1;">
                    <div style="font-size:0.85rem; font-weight:900; color:#ffd700;">${this.esc(p.name)}</div>
                    <div style="font-size:0.7rem; color:#4ade80; font-weight:700; margin-top:2px;">
                      ${p.price ? `${p.price} ${p.currency === 'gems' ? '💎 Gemas' : '🪙 Ouro'}` : 'Grátis (Para Testes)'}
                    </div>
                    <div style="font-size:0.62rem; color:#aaa; margin-top:2px;">
                      ${p.cardsCount || 3} cartas por abertura · ${p.mode === 'special' ? '⭐ Temático' : '🎲 Randômico'}
                    </div>
                  </div>
                </div>

                <div style="display:flex; gap:8px; border-top:1px solid rgba(255,255,255,0.08); padding-top:10px;">
                  <button class="btn-shop-toggle-pub" data-idx="${i}" style="flex:1; padding:6px 10px; border-radius:8px; font-size:0.68rem; font-weight:800; cursor:pointer; ${isPub ? 'background:rgba(34,197,94,0.15); border:1px solid #22c55e; color:#4ade80;' : 'background:rgba(234,179,8,0.15); border:1px solid #eab308; color:#facc15;'}">
                    ${isPub ? '🟢 Publicado' : '⏸️ Pausado'}
                  </button>
                  <button class="btn-shop-edit" data-idx="${i}" class="editor-btn-secondary" style="padding:6px 10px; font-size:0.68rem;">
                    ✏️ Editar
                  </button>
                  <button class="btn-shop-dup" data-idx="${i}" class="editor-btn-secondary" style="padding:6px 10px; font-size:0.68rem; color:#38bdf8;">
                    📋
                  </button>
                  <button class="btn-shop-test" data-idx="${i}" class="editor-btn-secondary" style="padding:6px 10px; font-size:0.68rem; color:#ffd700;">
                    ▶️ Testar
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  public bind(container: HTMLElement) {
    this.mountedContainer = container;
    const packs = this.data.packs || [];
    const activeIdx = Math.max(0, Math.min(packs.length - 1, this.selectedPackIdx));
    const pack = packs[activeIdx] || packs[0];

    // Alternância de Sub-Abas
    container.querySelector('#subtab-btn-editor')?.addEventListener('click', () => {
      this.activeSubTab = 'editor';
      this.reRender();
    });
    container.querySelector('#subtab-btn-published')?.addEventListener('click', () => {
      this.activeSubTab = 'published';
      this.reRender();
    });
    container.querySelector('#btn-quick-new-pack')?.addEventListener('click', () => {
      this.addNewPack();
    });

    // Se estiver na aba Published
    if (this.activeSubTab === 'published') {
      container.querySelectorAll('.btn-shop-toggle-pub').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
          const p = packs[idx];
          if (p) {
            p.published = !(p.published !== false && (p as any).active !== false);
            (p as any).active = p.published;
            this.saveJson('/api/save-store', this.data);
            this.showToast(p.published ? `🟢 ${p.name} ativado na loja!` : `⏸️ ${p.name} pausado.`);
            this.reRender();
          }
        });
      });

      container.querySelectorAll('.btn-shop-edit').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
          this.selectedPackIdx = idx;
          if (this.callbacks.setPacksSelectedIndex) {
            this.callbacks.setPacksSelectedIndex(idx);
          }
          this.activeSubTab = 'editor';
          this.reRender();
        });
      });

      container.querySelectorAll('.btn-shop-dup').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
          this.duplicatePack(idx);
        });
      });

      container.querySelectorAll('.btn-shop-test').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
          const p = packs[idx];
          if (p) this.testOpenBooster(p);
        });
      });
      return;
    }

    // ==========================================
    // BIND DO EDITOR PRINCIPAL
    // ==========================================

    // Inicializa Cena 3D
    this.init3DPreview(container, pack);

    // Seleção de Booster
    container.querySelectorAll('.tab-pack-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
        this.selectedPackIdx = idx;
        if (this.callbacks.setPacksSelectedIndex) {
          this.callbacks.setPacksSelectedIndex(idx);
        } else {
          this.reRender();
        }
      });
    });

    // Publicar / Pausar
    container.querySelector('#btn-toggle-publish')?.addEventListener('click', () => {
      pack.published = !(pack.published !== false && (pack as any).active !== false);
      (pack as any).active = pack.published;
      this.saveJson('/api/save-store', this.data);
      this.showToast(pack.published ? '🟢 Pacote publicado na Loja!' : '⏸️ Pacote pausado na Loja.');
      this.reRender();
    });

    // Duplicar
    container.querySelector('#btn-duplicate-pack')?.addEventListener('click', () => {
      this.duplicatePack(activeIdx);
    });

    // Novo Pack
    container.querySelector('#btn-add-new-pack')?.addEventListener('click', () => {
      this.addNewPack();
    });

    // Excluir
    container.querySelector('#btn-del-pack')?.addEventListener('click', () => {
      if (packs.length > 1) {
        packs.splice(activeIdx, 1);
        const newIdx = Math.max(0, activeIdx - 1);
        this.selectedPackIdx = newIdx;
        if (this.callbacks.setPacksSelectedIndex) {
          this.callbacks.setPacksSelectedIndex(newIdx);
        } else {
          this.reRender();
        }
        this.saveJson('/api/save-store', this.data);
      }
    });

    // Upload Frente do PC
    const inputFront = container.querySelector('#input-upload-front') as HTMLInputElement | null;
    inputFront?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await this.handleFrontImageFile(file, pack, container);
      }
    });

    // Escolher Frente da Galeria
    container.querySelector('#btn-pick-front-gallery')?.addEventListener('click', () => {
      this.openMediaPicker((url) => {
        this.applyFrontImageUrl(url, pack, container);
      });
    });

    // Limpar Frente
    container.querySelector('#btn-clear-front')?.addEventListener('click', () => {
      pack.customFront = undefined;
      this.updatePreviewTextures(pack);
      this.showToast('Arte da frente restaurada para o padrão metálico.');
      this.saveJson('/api/save-store', this.data);
      this.reRender();
    });

    // Upload Verso do PC
    const inputBack = container.querySelector('#input-upload-back') as HTMLInputElement | null;
    inputBack?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await this.handleBackImageFile(file, pack, container);
      }
    });

    // Presets de Verso
    container.querySelectorAll('.btn-back-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        pack.customBack = (btn as HTMLElement).dataset.back as any;
        this.updatePreviewTextures(pack);
        this.saveJson('/api/save-store', this.data);
        this.reRender();
      });
    });

    // Resetar Ângulo 3D
    container.querySelector('#btn-reset-3d-preview')?.addEventListener('click', () => {
      this.targetRotX = 0.08;
      this.targetRotY = 0;
      this.showToast('Ângulo resetado.');
    });

    // Testar Abertura Completa
    container.querySelector('#btn-open-interactive-modal')?.addEventListener('click', () => {
      this.testOpenBooster(pack);
    });

    // Inputs Básicos
    container.querySelector('#pack-input-name')?.addEventListener('input', (e) => {
      pack.name = (e.target as HTMLInputElement).value;
    });

    container.querySelector('#pack-input-price')?.addEventListener('input', (e) => {
      pack.price = Number((e.target as HTMLInputElement).value) || 0;
    });

    container.querySelector('#pack-input-currency')?.addEventListener('change', (e) => {
      pack.currency = (e.target as HTMLSelectElement).value;
    });

    container.querySelector('#pack-input-count')?.addEventListener('input', (e) => {
      pack.cardsCount = Number((e.target as HTMLInputElement).value) || 3;
    });

    container.querySelector('#pack-input-desc')?.addEventListener('input', (e) => {
      pack.desc = (e.target as HTMLTextAreaElement).value;
    });

    // Alternar Modo
    container.querySelectorAll('input[name="pack-mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        pack.mode = (e.target as HTMLInputElement).value as any;
        this.reRender();
      });
    });

    // Taxas de %
    const bindRate = (id: string, key: 'common' | 'rare' | 'legendary') => {
      container.querySelector(id)?.addEventListener('input', (e) => {
        if (!pack.rates) pack.rates = { common: 70, rare: 25, legendary: 5 };
        pack.rates[key] = Number((e.target as HTMLInputElement).value) || 0;
        this.updateRatesBadge(container, pack);
      });
    };
    bindRate('#pack-rate-common', 'common');
    bindRate('#pack-rate-rare', 'rare');
    bindRate('#pack-rate-legendary', 'legendary');

    // Catálogo Temático: Busca de Cartas
    const searchInp = container.querySelector('#input-catalog-search') as HTMLInputElement | null;
    searchInp?.addEventListener('input', (e) => {
      this.cardCatalogSearch = (e.target as HTMLInputElement).value;
      const grid = container.querySelector('#card-catalog-grid');
      // Atualiza apenas a grade se possível ou reRender rápido
      this.reRender();
    });

    // Catálogo Temático: Clique para Adicionar / Remover Carta do Booster
    container.querySelectorAll('.btn-toggle-fixed-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = (btn as HTMLElement).dataset.name;
        if (!name) return;
        if (!pack.fixedCards) pack.fixedCards = [];
        const idx = pack.fixedCards.indexOf(name);
        if (idx >= 0) {
          pack.fixedCards.splice(idx, 1);
        } else {
          pack.fixedCards.push(name);
        }
        this.reRender();
      });
    });

    // Filtro por Categoria / Família
    container.querySelectorAll('.btn-catalog-cat').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.cardCatalogCategory = (btn as HTMLElement).dataset.cat || 'all';
        this.reRender();
      });
    });

    // Limpar Cartas Órfãs / Modos Antigos
    container.querySelector('#btn-clean-ghost-fixed')?.addEventListener('click', () => {
      const validNames = new Set(this.templates.map((t) => (t.name || t.title || '').toLowerCase().trim()));
      const initialCount = (pack.fixedCards || []).length;
      pack.fixedCards = (pack.fixedCards || []).filter((name) => validNames.has(name.toLowerCase().trim()));
      const removed = initialCount - pack.fixedCards.length;
      this.showToast(`🧹 ${removed} cartas órfãs/antigas removidas do booster!`);
      this.saveJson('/api/save-store', this.data);
      this.reRender();
    });

    // Limpar todas as cartas do modo temático
    container.querySelector('#btn-clear-all-fixed')?.addEventListener('click', () => {
      pack.fixedCards = [];
      this.saveJson('/api/save-store', this.data);
      this.reRender();
    });

    // Seletor por raridade: TODAS / NENHUMA do grupo (respeita a busca atual)
    const rarityBulk = (sel: string, add: boolean) => {
      container.querySelectorAll(sel).forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = (btn as HTMLElement).dataset.rarity || '';
          const search = this.cardCatalogSearch.toLowerCase().trim();
          if (!pack.fixedCards) pack.fixedCards = [];
          this.templates.forEach((t) => {
            if (this.getRarityKey(t) !== key) return;
            if (search && !t.name.toLowerCase().includes(search)) return;
            const idx = pack.fixedCards.indexOf(t.name);
            if (add && idx < 0) pack.fixedCards.push(t.name);
            if (!add && idx >= 0) pack.fixedCards.splice(idx, 1);
          });
          this.reRender();
        });
      });
    };
    rarityBulk('.btn-rarity-all', true);
    rarityBulk('.btn-rarity-none', false);

    // Salvar no Jogo
    const saveBtn = container.querySelector('#btn-save-packs') as HTMLButtonElement | null;
    saveBtn?.addEventListener('click', async () => {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'GRAVANDO NO JOGO...';
      }
      const ok = await this.saveJson('/api/save-store', this.data);
      if (ok) {
        if (saveBtn) saveBtn.textContent = '✅ SALVO COM SUCESSO!';
        this.showToast('Configurações de Boosters gravadas com sucesso!');
      } else {
        if (saveBtn) saveBtn.textContent = '❌ FALHA';
        this.showToast('Erro ao salvar boosters localmente', '#ef4444');
      }
      setTimeout(() => {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = '💾 SALVAR PACKS NO JOGO';
        }
      }, 2000);
    });
  }

  // TESTE DE ABERTURA COM AS CARTAS REAIS DO JOGO NO BOOSTER 3D
  private async testOpenBooster(pack: StorePack) {
    try {
      this.showToast(`Preparando Booster 3D: ${pack.name}...`);
      const resolvedCards = await resolveBoosterCards(pack, this.templates);

      new BoosterPackViewer({
        theme: pack.theme || 'charizard',
        customBack: (pack.customBack as any) || 'silver',
        customFrontUrl: pack.customFront || pack.frontImageUrl || undefined,
        customBackUrl: pack.customBackUrl || pack.backImageUrl || undefined,
        customTitle: `Teste 3D · ${pack.name}`,
        quantity: 1,
        cards: resolvedCards,
        onComplete: (cards) => {
          this.showToast(`🎉 Teste concluído com sucesso! ${cards.length} cartas reveladas e salvas na coleção.`);
        }
      });
    } catch (err) {
      this.showToast('Falha ao abrir teste do Booster 3D: ' + String((err as Error)?.message || err), '#ef4444');
    }
  }

  // UPLOAD PERSISTENTE E SEGURO DA IMAGEM DA FRENTE
  private async handleFrontImageFile(file: File, pack: StorePack, container: HTMLElement) {
    this.showToast(`Enviando arte da frente: ${file.name}...`);
    try {
      let finalUrl = '';

      // 1. Envia via /api/upload-media para virar arquivo estático real no disco
      try {
        const fd = new FormData();
        fd.append('media', file);
        const resp = await fetch('/api/upload-media', { method: 'POST', body: fd });
        if (resp.ok) {
          const resJson = await resp.json();
          finalUrl = (resJson.urls && resJson.urls[0]) || resJson.url || `/cards/${file.name}`;
        }
      } catch (err) {
        console.warn('Upload-media endpoint falhou, usando dataURL local', err);
      }

      if (!finalUrl) {
        // Fallback: Data URL
        finalUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      // 2. Salva caminho estático no pack
      pack.customFront = finalUrl;

      // 3. Atualiza a cena 3D usando TextureLoader
      const loader = new THREE.TextureLoader();
      loader.load(finalUrl, (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        loadedTex.needsUpdate = true;
        this.textureCache.set(finalUrl, loadedTex);
        if (this.previewFoilFrontMat) {
          this.previewFoilFrontMat.map = loadedTex;
          this.previewFoilFrontMat.needsUpdate = true;
        }
      });

      // 4. Salva no store.json (dados 100% limpos e serializáveis)
      await this.saveJson('/api/save-store', this.data);
      this.showToast(`✅ Capa da frente salva: ${file.name}`);

      // 5. Atualiza o status visual
      const statusEl = container.querySelector('#txt-front-status');
      if (statusEl) {
        statusEl.textContent = '✅ Definida';
        (statusEl as HTMLElement).style.color = '#4ade80';
      }
      const thumbEl = container.querySelector('#front-thumb-preview');
      if (thumbEl) {
        thumbEl.innerHTML = `<img src="${finalUrl}" style="width:100%; height:100%; object-fit:cover;">`;
      }
    } catch (err: any) {
      this.showToast('Erro ao aplicar imagem: ' + err.message, '#ef4444');
    }
  }

  // APLICA IMAGEM DA GALERIA NA FRENTE
  private applyFrontImageUrl(url: string, pack: StorePack, container: HTMLElement) {
    pack.customFront = url;

    const loader = new THREE.TextureLoader();
    loader.load(url, (loadedTex) => {
      loadedTex.colorSpace = THREE.SRGBColorSpace;
      loadedTex.needsUpdate = true;
      this.textureCache.set(url, loadedTex);
      if (this.previewFoilFrontMat) {
        this.previewFoilFrontMat.map = loadedTex;
        this.previewFoilFrontMat.needsUpdate = true;
      }
    });

    this.saveJson('/api/save-store', this.data);
    this.showToast('Arte da frente atualizada da galeria!');

    const statusEl = container.querySelector('#txt-front-status');
    if (statusEl) {
      statusEl.textContent = '✅ Definida';
      (statusEl as HTMLElement).style.color = '#4ade80';
    }
    const thumbEl = container.querySelector('#front-thumb-preview');
    if (thumbEl) {
      thumbEl.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`;
    }
  }

  // UPLOAD DO VERSO
  private async handleBackImageFile(file: File, pack: StorePack, container: HTMLElement) {
    this.showToast(`Enviando arte do verso: ${file.name}...`);
    try {
      let finalUrl = '';
      try {
        const fd = new FormData();
        fd.append('media', file);
        const resp = await fetch('/api/upload-media', { method: 'POST', body: fd });
        if (resp.ok) {
          const resJson = await resp.json();
          finalUrl = (resJson.urls && resJson.urls[0]) || resJson.url || `/cards/${file.name}`;
        }
      } catch (err) {
        console.warn('Upload-media endpoint falhou', err);
      }

      if (!finalUrl) {
        finalUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      pack.customBack = finalUrl;

      const loader = new THREE.TextureLoader();
      loader.load(finalUrl, (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        loadedTex.needsUpdate = true;
        this.textureCache.set(finalUrl, loadedTex);
        if (this.previewFoilBackMat) {
          this.previewFoilBackMat.map = loadedTex;
          this.previewFoilBackMat.needsUpdate = true;
        }
      });

      await this.saveJson('/api/save-store', this.data);
      this.showToast(`✅ Arte do verso salva: ${file.name}`);

      const statusEl = container.querySelector('#txt-back-status');
      if (statusEl) {
        statusEl.textContent = '✅ Definido';
        (statusEl as HTMLElement).style.color = '#4ade80';
      }
      const thumbEl = container.querySelector('#back-thumb-preview');
      if (thumbEl) {
        thumbEl.innerHTML = `<img src="${finalUrl}" style="width:100%; height:100%; object-fit:cover;">`;
      }
    } catch (err: any) {
      this.showToast('Erro ao carregar verso: ' + err.message, '#ef4444');
    }
  }

  private addNewPack() {
    const packs = this.data.packs || [];
    packs.push({
      id: 'booster_' + Date.now(),
      name: 'Novo Booster',
      desc: 'Pacote com novas criaturas da coleção.',
      price: 0,
      currency: 'gold',
      cardsCount: 3,
      mode: 'random',
      published: true,
      rates: { common: 70, rare: 25, legendary: 5 },
      cardGroups: { common: [], rare: [], legendary: [] },
      theme: 'winter',
      customBack: 'silver',
      gridLayout: 'auto'
    });
    const newIdx = packs.length - 1;
    this.selectedPackIdx = newIdx;
    if (this.callbacks.setPacksSelectedIndex) {
      this.callbacks.setPacksSelectedIndex(newIdx);
    }
    this.activeSubTab = 'editor';
    this.saveJson('/api/save-store', this.data);
    this.showToast('✨ Novo booster criado!');
    this.reRender();
  }

  private duplicatePack(idx: number) {
    const packs = this.data.packs || [];
    const source = packs[idx];
    if (!source) return;

    const dup = JSON.parse(JSON.stringify(source));
    dup.id = 'booster_' + Date.now();
    dup.name = 'Cópia de ' + source.name;
    dup.published = true;
    packs.push(dup);

    const newIdx = packs.length - 1;
    this.selectedPackIdx = newIdx;
    if (this.callbacks.setPacksSelectedIndex) {
      this.callbacks.setPacksSelectedIndex(newIdx);
    }
    this.activeSubTab = 'editor';
    this.saveJson('/api/save-store', this.data);
    this.showToast('📋 Pacote duplicado com sucesso!');
    this.reRender();
  }

  private updateRatesBadge(container: HTMLElement, pack: StorePack) {
    const total = (Number(pack.rates?.common) || 0) + (Number(pack.rates?.rare) || 0) + (Number(pack.rates?.legendary) || 0);
    const badge = container.querySelector('#rates-total-badge');
    if (badge) {
      if (total === 100) {
        badge.textContent = '✅ Total: 100% (Balanceado)';
        (badge as HTMLElement).style.background = 'rgba(34,197,94,0.15)';
        (badge as HTMLElement).style.color = '#4ade80';
        (badge as HTMLElement).style.borderColor = '#22c55e';
      } else {
        badge.textContent = `⚠️ Total: ${total}% (Ajuste para somar 100%)`;
        (badge as HTMLElement).style.background = 'rgba(234,179,8,0.15)';
        (badge as HTMLElement).style.color = '#facc15';
        (badge as HTMLElement).style.borderColor = '#eab308';
      }
    }
  }

  // CENA 3D PREVIEW DO ENVELOPE (CANVAS EMBUTIDO NO STUDIO)
  private init3DPreview(container: HTMLElement, pack: StorePack) {
    const canvasWrap = container.querySelector('#pack-3d-canvas-container') as HTMLElement | null;
    if (!canvasWrap) return;

    if (this.previewAnimId) {
      cancelAnimationFrame(this.previewAnimId);
      this.previewAnimId = null;
    }
    if (this.cleanupWindowListeners) {
      this.cleanupWindowListeners();
      this.cleanupWindowListeners = null;
    }
    if (this.previewRenderer) {
      this.previewRenderer.dispose();
      this.previewRenderer = null;
    }

    const W = canvasWrap.clientWidth || 500;
    const H = canvasWrap.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#111218');

    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
    camera.position.set(0, 0, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    canvasWrap.innerHTML = '';
    canvasWrap.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight('#ffffff', 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight('#fffcf8', 1.3);
    keyLight.position.set(4, 7, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#e2e8f0', 0.7);
    fillLight.position.set(-5, 2, 5);
    scene.add(fillLight);

    // Textura da frente: Se tiver customFront, usa textura metálica neutra de base e carrega imagem imediatamente
    let foilFrontTex: THREE.Texture;
    if (pack.customFront && this.textureCache.has(pack.customFront)) {
      foilFrontTex = this.textureCache.get(pack.customFront)!;
    } else {
      foilFrontTex = createBoosterFoilFrontTexture('charizard');
    }

    // Textura do verso
    let foilBackTex: THREE.Texture;
    if (pack.customBack && this.textureCache.has(pack.customBack)) {
      foilBackTex = this.textureCache.get(pack.customBack)!;
    } else {
      foilBackTex = createBoosterFoilBackTexture((pack.customBack as any) || 'silver');
    }

    const foilFrontMat = new THREE.MeshStandardMaterial({
      map: foilFrontTex,
      metalness: 0.88,
      roughness: 0.26,
      side: THREE.DoubleSide,
    });
    this.previewFoilFrontMat = foilFrontMat;

    const foilBackMat = new THREE.MeshStandardMaterial({
      map: foilBackTex,
      metalness: 0.92,
      roughness: 0.30,
      side: THREE.DoubleSide,
    });
    this.previewFoilBackMat = foilBackMat;

    // Se pack.customFront existir e ainda não estiver em cache, carrega com TextureLoader
    if (pack.customFront) {
      const loader = new THREE.TextureLoader();
      loader.load(pack.customFront, (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        loadedTex.needsUpdate = true;
        this.textureCache.set(pack.customFront!, loadedTex);
        foilFrontMat.map = loadedTex;
        foilFrontMat.needsUpdate = true;
      });
    }

    // Se pack.customBack for URL, carrega com TextureLoader
    if (pack.customBack && (pack.customBack.startsWith('data:') || pack.customBack.startsWith('/'))) {
      const loader = new THREE.TextureLoader();
      loader.load(pack.customBack, (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        loadedTex.needsUpdate = true;
        this.textureCache.set(pack.customBack!, loadedTex);
        foilBackMat.map = loadedTex;
        foilBackMat.needsUpdate = true;
      });
    }

    const PW = 3.6;
    const PH = 3.6 * (1672 / 941);

    const getPillowZ = (x: number, isFront: boolean) => {
      const normX = Math.min(1, Math.abs(x) / (PW / 2));
      const edgeFactorX = Math.max(0, 1 - Math.pow(normX, 2.6));
      const bulge = Math.pow(edgeFactorX, 1.25) * 0.088;
      return isFront ? bulge : -bulge;
    };

    const createPouchHalf = (isFront: boolean) => {
      const geo = new THREE.BufferGeometry();
      const pos: number[] = [];
      const uvs: number[] = [];
      const segX = 36;
      const segY = 16;

      for (let j = 0; j <= segY; j++) {
        const v = j / segY;
        const y = -PH / 2 + v * PH;
        for (let i = 0; i <= segX; i++) {
          const u = i / segX;
          const x = -PW / 2 + u * PW;
          const z = getPillowZ(x, isFront);
          pos.push(x, y, z);
          uvs.push(isFront ? u : 1 - u, v);
        }
      }

      const indices: number[] = [];
      for (let j = 0; j < segY; j++) {
        for (let i = 0; i < segX; i++) {
          const a = j * (segX + 1) + i;
          const b = j * (segX + 1) + (i + 1);
          const c = (j + 1) * (segX + 1) + i;
          const d = (j + 1) * (segX + 1) + (i + 1);
          if (isFront) {
            indices.push(a, b, c, b, d, c);
          } else {
            indices.push(a, c, b, b, c, d);
          }
        }
      }

      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    };

    const packGroup = new THREE.Group();
    const frontMesh = new THREE.Mesh(createPouchHalf(true), foilFrontMat);
    const backMesh = new THREE.Mesh(createPouchHalf(false), foilBackMat);
    packGroup.add(frontMesh);
    packGroup.add(backMesh);
    scene.add(packGroup);
    this.previewPackGroup = packGroup;

    // Mouse / Touch 3D Drag Orbit
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      this.isPointerDown = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      this.prevPointerX = clientX;
      this.prevPointerY = clientY;
      canvasWrap.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isPointerDown) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - this.prevPointerX;
      const dy = clientY - this.prevPointerY;
      this.targetRotY += dx * 0.012;
      this.targetRotX += dy * 0.012;
      this.prevPointerX = clientX;
      this.prevPointerY = clientY;
    };

    const onPointerUp = () => {
      this.isPointerDown = false;
      canvasWrap.style.cursor = 'grab';
    };

    canvasWrap.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    canvasWrap.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    this.cleanupWindowListeners = () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
    };

    let idleTimer = 0;
    const animate = () => {
      if (!document.body.contains(canvasWrap)) {
        if (this.previewAnimId) cancelAnimationFrame(this.previewAnimId);
        this.previewAnimId = null;
        return;
      }
      this.previewAnimId = requestAnimationFrame(animate);
      if (!this.isPointerDown) {
        idleTimer += 0.008;
        this.targetRotY += Math.sin(idleTimer) * 0.0015;
      }
      this.currentRotX += (this.targetRotX - this.currentRotX) * 0.12;
      this.currentRotY += (this.targetRotY - this.currentRotY) * 0.12;

      packGroup.rotation.x = this.currentRotX;
      packGroup.rotation.y = this.currentRotY;

      renderer.render(scene, camera);
    };
    animate();

    this.previewScene = scene;
    this.previewRenderer = renderer;
  }

  private updatePreviewTextures(pack: StorePack) {
    if (!this.previewFoilFrontMat || !this.previewFoilBackMat) return;

    if (pack.customFront) {
      const loader = new THREE.TextureLoader();
      loader.load(pack.customFront, (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        loadedTex.needsUpdate = true;
        this.textureCache.set(pack.customFront!, loadedTex);
        this.previewFoilFrontMat!.map = loadedTex;
        this.previewFoilFrontMat!.needsUpdate = true;
      });
    } else {
      this.previewFoilFrontMat.map = createBoosterFoilFrontTexture('charizard');
      this.previewFoilFrontMat.needsUpdate = true;
    }

    if (pack.customBack && (pack.customBack.startsWith('data:') || pack.customBack.startsWith('/'))) {
      const loader = new THREE.TextureLoader();
      loader.load(pack.customBack, (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        loadedTex.needsUpdate = true;
        this.textureCache.set(pack.customBack!, loadedTex);
        this.previewFoilBackMat!.map = loadedTex;
        this.previewFoilBackMat!.needsUpdate = true;
      });
    } else {
      this.previewFoilBackMat.map = createBoosterFoilBackTexture((pack.customBack as any) || 'silver');
      this.previewFoilBackMat.needsUpdate = true;
    }
  }
}
