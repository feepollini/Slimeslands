import { StoreScreen } from '../../StoreScreen';
import { ProgressionManager } from '../../../../core/ProgressionManager';
import { CARD_TEMPLATES } from '../../../../core/constants';
import storeData from '../../../../core/store.json';
import {
  renderMatrixCardSVG,
  getMergedGameTemplatesSync,
  getMergedGameTemplates,
  resolveMatrixOrGameCard,
} from '../utils/HestridiaMatrixRenderer';

export interface StoreDeck {
  id: string;
  name: string;
  price: number;
  currency: string;
  desc: string;
  image: string;
  cards: string[];
  standalone?: boolean;
}

export interface StorePackRates {
  common: number;
  rare: number;
  epic?: number;
  legendary: number;
  mythic?: number;
  limited?: number;
}

export interface StorePackCardGroups {
  common?: string[];
  rare?: string[];
  epic?: string[];
  legendary?: string[];
  mythic?: string[];
  limited?: string[];
}

export interface StorePack {
  id: string;
  name: string;
  desc: string;
  price: number;
  currency: string;
  cardsCount: number;
  mode: 'special' | 'random';
  fixedCards?: string[];
  rates?: StorePackRates;
  cardGroups?: StorePackCardGroups;
  theme?: string;
  customFront?: string;
  customBack?: string;
  gridLayout?: 'auto' | '3x3' | 'panoramic';
  published?: boolean;
}

export interface StoreData {
  titles: { daily: string; rare: string; decks: string; packs: string; coins: string; gems: string; artifacts: string; packs_split?: string };
  banners: string[];
  dailyPool: { card: string; price: number }[];
  rare: { card: string; price: number }[];
  decks: StoreDeck[];
  packs: StorePack[];
  coinPacks: { gold: number; price: number; image?: string }[];
  gemPacks: { gems: number; price: string; image?: string }[];
  artifacts: { id: string; price: number; currency: string }[];
  sectionOrder?: string[];
  sectionVisibility?: Record<string, boolean>;
  boosterDisplayMode?: 'carousel' | 'split';
  deckLayoutMode?: 'carousel' | 'standalone';
}

const DEFAULT_TITLES = {
  daily: 'OFERTAS DO DIA',
  rare: 'CARTAS RARAS',
  decks: 'DECKS COMPLETOS',
  packs: 'PACOTES & BOOSTERS (CARROSSEL)',
  packs_split: 'DESTAQUES ESPECIAIS (SPLIT)',
  coins: 'MOEDAS',
  gems: 'DIAMANTES',
  artifacts: 'ARTEFATOS'
};

const DEFAULT_SECTION_ORDER = [
  'banners',
  'daily',
  'rare',
  'decks',
  'packs',
  'packs_split',
  'coins',
  'gems',
  'artifacts'
];

export const SECTION_METADATA: Record<string, { label: string; icon: string; desc: string }> = {
  banners: { label: 'Banners Promocionais', icon: '🎞️', desc: 'Até 3 banners rotativos em destaque no topo da loja.' },
  daily: { label: 'Ofertas do Dia', icon: '☀️', desc: 'Pool rotativo diário de cartas adquiríveis por ouro.' },
  rare: { label: 'Cartas Raras', icon: '💎', desc: 'Seleção especial de cartas adquiríveis por diamantes.' },
  decks: { label: 'Decks Completos', icon: '🃏', desc: 'Decks temáticos montados prontos para compra.' },
  packs: { label: 'Boosters - Módulo 1 (Carrossel)', icon: '📦', desc: 'Carrossel 3D horizontal com 3 boosters e deslize elegante.' },
  packs_split: { label: 'Boosters - Módulo 2 (Split Lateral)', icon: '🌓', desc: 'Booster em destaque vertical à esquerda e opções à direita.' },
  coins: { label: 'Moedas (Gold)', icon: '🪙', desc: 'Pacotes de moedas compráveis com gemas.' },
  gems: { label: 'Diamantes (Gems)', icon: '💎', desc: 'Pacotes de diamantes com valor monetário real.' },
  artifacts: { label: 'Artefatos de Habilidade', icon: '✨', desc: 'Habilidades passivas e ativas compráveis na loja.' },
};

// Normaliza uma vez e preenche campos faltantes
export function normalizeStoreData(input: any): StoreData {
  const defaultPacks = Array.isArray((storeData as any)?.packs)
    ? JSON.parse(JSON.stringify((storeData as any).packs))
    : [];
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    input.titles = { ...DEFAULT_TITLES, ...(input.titles || {}) };
    if (!Array.isArray(input.banners)) input.banners = [];
    if (!Array.isArray(input.dailyPool)) input.dailyPool = [];
    if (!Array.isArray(input.rare)) input.rare = [];
    if (!Array.isArray(input.decks)) input.decks = [];
    if (!Array.isArray(input.packs) || input.packs.length === 0) {
      input.packs = defaultPacks;
    }
    if (!Array.isArray(input.coinPacks)) input.coinPacks = [];
    if (!Array.isArray(input.gemPacks)) input.gemPacks = [];
    if (!Array.isArray(input.artifacts)) input.artifacts = [];
    if (!Array.isArray(input.sectionOrder) || input.sectionOrder.length === 0) {
      input.sectionOrder = [...DEFAULT_SECTION_ORDER];
    } else {
      if (!input.sectionOrder.includes('packs') && input.sectionVisibility?.packs !== false) {
        const dIdx = input.sectionOrder.indexOf('decks');
        if (dIdx !== -1) input.sectionOrder.splice(dIdx + 1, 0, 'packs');
        else input.sectionOrder.push('packs');
      }
      if (!input.sectionOrder.includes('packs_split') && input.sectionVisibility?.packs_split !== false) {
        const pIdx = input.sectionOrder.indexOf('packs');
        if (pIdx !== -1) {
          input.sectionOrder.splice(pIdx + 1, 0, 'packs_split');
        } else {
          input.sectionOrder.push('packs_split');
        }
      }
    }
    if (!input.sectionVisibility) input.sectionVisibility = {};
    if (input.sectionVisibility.packs === undefined) input.sectionVisibility.packs = true;
    if (input.sectionVisibility.packs_split === undefined) input.sectionVisibility.packs_split = true;
    input.deckLayoutMode = 'standalone'; // Decks tem apenas um modo: o separado
    if (!input.boosterDisplayMode) input.boosterDisplayMode = 'carousel';
    return input as StoreData;
  }
  return {
    titles: { ...DEFAULT_TITLES },
    banners: [],
    dailyPool: [],
    rare: [],
    decks: [],
    packs: defaultPacks,
    coinPacks: [{ gold: 1000, price: 10 }],
    gemPacks: [{ gems: 100, price: 'R$ 4,90' }],
    artifacts: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    sectionVisibility: {},
    deckLayoutMode: 'standalone',
    boosterDisplayMode: 'carousel'
  };
}

export class TabStore {
  private data: StoreData;
  private templates: any[];
  private skills: any[];
  private reRender: () => void;
  private showToast: (msg: string, color?: string) => void;
  private saveJson: (endpoint: string, data: any) => Promise<boolean>;
  private openMediaPicker: (onSelect: (url: string) => void) => void;

  // Módulo ativo e índice na ordem da vitrine para centralização e edição simultânea
  private static activeModuleKey: string = 'packs';
  private static activeOrderIdx: number = 0;

  constructor(state: any, callbacks: any, core: any) {
    this.data = normalizeStoreData(state.storeItems);
    this.templates = getMergedGameTemplatesSync(state.templates || []);
    this.skills = state.skills || [];
    this.reRender = callbacks.reRender;
    this.showToast = callbacks.showToast;
    this.openMediaPicker = callbacks.openMediaPicker;
    this.saveJson = core.saveJson.bind(core);

    getMergedGameTemplates(state.templates || []).then((merged) => {
      if (merged && merged.length > 0) {
        this.templates = merged;
      }
    });

    window.addEventListener('hestridia:matrix-updated', () => {
      this.templates = getMergedGameTemplatesSync(state.templates || []);
    });

    // Garante que o módulo ativo e o índice da vitrine estejam sempre em sincronia
    const currentOrder = this.data.sectionOrder || DEFAULT_SECTION_ORDER;
    if (!currentOrder.includes(TabStore.activeModuleKey)) {
      TabStore.activeModuleKey = currentOrder[0] || 'banners';
      TabStore.activeOrderIdx = 0;
    } else if (currentOrder[TabStore.activeOrderIdx] !== TabStore.activeModuleKey) {
      const foundIdx = currentOrder.indexOf(TabStore.activeModuleKey);
      if (foundIdx !== -1) TabStore.activeOrderIdx = foundIdx;
    }
  }

  private esc(s: string): string {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  private cardOptions(selected: string): string {
    return this.templates.map((t: any) =>
      `<option value="${this.esc(t.name)}" ${t.name === selected ? 'selected' : ''}>${this.esc(t.name)}</option>`
    ).join('');
  }

  private skillOptions(selected: string): string {
    return this.skills.map((s: any) =>
      `<option value="${this.esc(s.id)}" ${s.id === selected ? 'selected' : ''}>${this.esc((s.icon || '✨') + ' ' + s.name)}</option>`
    ).join('');
  }

  private resolveCardObj(name: string): any {
    if (!name) return null;
    return (
      resolveMatrixOrGameCard(name, [
        ...(this.templates || []),
        ...(CARD_TEMPLATES as any[]),
      ]) || null
    );
  }

  private getRarityColor(rarity: string): string {
    const r = String(rarity || '').toLowerCase();
    if (r.includes('leg') || r.includes('mit')) return '#ffd700';
    if (r.includes('epi')) return '#a855f7';
    if (r.includes('rar')) return '#38bdf8';
    return '#94a3b8';
  }

  private getRarityLabel(rarity: string): string {
    const r = String(rarity || '').toLowerCase();
    if (r.includes('leg') || r.includes('mit')) return '👑 Lendária';
    if (r.includes('epi')) return '⭐ Épica';
    if (r.includes('rar')) return '🔷 Rara';
    return '⚪ Comum';
  }

  private getAllAvailableCards(): any[] {
    const cardMap = new Map<string, any>();
    const merged = getMergedGameTemplatesSync([
      ...(this.templates || []),
      ...(CARD_TEMPLATES as any[]),
    ]);
    merged.forEach((c) => {
      if (c && c.name) cardMap.set(c.name, c);
    });
    return Array.from(cardMap.values());
  }

  private openCardGalleryModal(onSelect: (cardName: string) => void) {
    const allCards = this.getAllAvailableCards();
    let currentFilterRarity = 'all';
    let searchQuery = '';

    const modal = document.createElement('div');
    modal.id = 'store-card-gallery-modal';
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: rgba(4, 6, 12, 0.88);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      box-sizing: border-box;
      font-family: 'Outfit', sans-serif;
    `;

    const renderCardsGrid = (filter: string, query: string) => {
      const q = query.trim().toLowerCase();
      const filtered = allCards.filter(c => {
        const matchesQuery = !q || (c.name && c.name.toLowerCase().includes(q));
        if (!matchesQuery) return false;
        if (filter === 'all') return true;
        const r = String(c.preferredRarity || c.rarity || 'common').toLowerCase();
        if (filter === 'legendary') return r.includes('leg') || r.includes('mit');
        if (filter === 'epic') return r.includes('epi');
        if (filter === 'rare') return r.includes('rar');
        if (filter === 'common') return !r.includes('leg') && !r.includes('mit') && !r.includes('epi') && !r.includes('rar');
        return true;
      });

      if (filtered.length === 0) {
        return `
          <div style="grid-column:1/-1; padding:40px 20px; text-align:center; color:#888; font-size:0.85rem;">
            🔍 Nenhuma carta encontrada com esses filtros.
          </div>
        `;
      }

      return filtered.map(c => {
        const rColor = this.getRarityColor(c.preferredRarity || c.rarity);
        const rLabel = this.getRarityLabel(c.preferredRarity || c.rarity);
        const img = c.image || c.frontImage || '';
        const atk = c.baseAtk || c.atk || 0;
        const pv = c.basePv || c.pv || 0;
        const cost = c.cost || c.mana || 0;

        return `
          <div class="gallery-card-item" data-name="${this.esc(c.name)}" style="
            background: linear-gradient(180deg, rgba(26,30,46,0.95), rgba(12,14,22,0.95));
            border: 1.5px solid ${rColor};
            border-radius: 12px;
            padding: 8px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            cursor: pointer;
            position: relative;
            box-shadow: 0 4px 14px rgba(0,0,0,0.6);
            transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
            user-select: none;
          ">
            <!-- Thumbnail da Arte Fiel da Matriz -->
            <div style="
              width: 100%;
              aspect-ratio: 680/990;
              border-radius: 8px;
              position: relative;
              overflow: hidden;
            ">
              ${renderMatrixCardSVG(c, { mode: 'thumb', animateChroma: false })}
            </div>

              <!-- Badge Raridade -->
              <div style="
                position: absolute;
                top: 4px;
                right: 4px;
                background: rgba(0,0,0,0.75);
                border: 1px solid ${rColor};
                border-radius: 4px;
                padding: 1px 4px;
                font-size: 0.52rem;
                font-weight: 800;
                color: ${rColor};
              ">${rLabel.split(' ')[0]}</div>

              <!-- Stats no rodapé da arte -->
              <div style="
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(180deg, transparent, rgba(0,0,0,0.85) 60%);
                padding: 4px 6px 3px 6px;
                display: flex;
                justify-content: space-between;
                font-size: 0.62rem;
                font-weight: 900;
              ">
                <span style="color:#ef4444;">⚔️ ${atk}</span>
                <span style="color:#4ade80;">❤️ ${pv}</span>
              </div>
            </div>

            <!-- Nome da Carta -->
            <div style="
              font-size: 0.72rem;
              font-weight: 900;
              color: #ffd700;
              text-align: center;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            " title="${this.esc(c.name)}">${this.esc(c.name)}</div>
          </div>
        `;
      }).join('');
    };

    modal.innerHTML = `
      <div style="
        width: min(860px, 95vw);
        height: min(720px, 90vh);
        background: linear-gradient(180deg, #131625 0%, #0c0e18 100%);
        border: 2px solid rgba(255,215,0,0.4);
        border-radius: 18px;
        box-shadow: 0 24px 60px rgba(0,0,0,0.9), 0 0 35px rgba(255,215,0,0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      ">
        <!-- Topo da Modal -->
        <div style="
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.3);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
        ">
          <div>
            <div style="font-size: 1.05rem; font-weight: 950; color: #ffd700; letter-spacing: 1px;">
              🃏 GALERIA VISUAL DE CARTAS
            </div>
            <div style="font-size: 0.65rem; color: #888;">
              Toque em qualquer carta para selecioná-la · Total: ${allCards.length} cartas
            </div>
          </div>
          <button id="modal-close-btn" class="editor-btn-secondary" style="
            width: 34px;
            height: 34px;
            border-radius: 50%;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
            color: #ef4444;
            border-color: rgba(239,68,68,0.4);
          ">✕</button>
        </div>

        <!-- Barra de Ferramentas / Filtros -->
        <div style="
          padding: 10px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(0,0,0,0.2);
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        ">
          <input type="text" id="gallery-search-input" class="editor-input" placeholder="🔍 Buscar carta por nome..." style="
            width: 240px;
            font-size: 0.75rem;
            padding: 6px 10px;
          ">

          <!-- Botões de Raridade -->
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="gallery-rarity-btn editor-btn-secondary active" data-rarity="all" style="font-size:0.65rem; padding:4px 10px; border-color:#ffd700; color:#ffd700;">Todas</button>
            <button class="gallery-rarity-btn editor-btn-secondary" data-rarity="common" style="font-size:0.65rem; padding:4px 10px;">⚪ Comum</button>
            <button class="gallery-rarity-btn editor-btn-secondary" data-rarity="rare" style="font-size:0.65rem; padding:4px 10px;">🔷 Rara</button>
            <button class="gallery-rarity-btn editor-btn-secondary" data-rarity="epic" style="font-size:0.65rem; padding:4px 10px;">⭐ Épica</button>
            <button class="gallery-rarity-btn editor-btn-secondary" data-rarity="legendary" style="font-size:0.65rem; padding:4px 10px;">👑 Lendária</button>
          </div>
        </div>

        <!-- Grade de Cartas com Rolagem -->
        <div id="gallery-cards-grid" style="
          flex: 1;
          overflow-y: auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 12px;
          padding: 16px 20px;
          align-content: start;
        ">
          ${renderCardsGrid(currentFilterRarity, searchQuery)}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const updateGrid = () => {
      const grid = modal.querySelector('#gallery-cards-grid');
      if (grid) {
        grid.innerHTML = renderCardsGrid(currentFilterRarity, searchQuery);
        bindCards();
      }
    };

    const bindCards = () => {
      modal.querySelectorAll('.gallery-card-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
          (item as HTMLElement).style.transform = 'translateY(-4px) scale(1.03)';
          (item as HTMLElement).style.boxShadow = '0 10px 24px rgba(0,0,0,0.8), 0 0 16px rgba(255,215,0,0.4)';
        });
        item.addEventListener('mouseleave', () => {
          (item as HTMLElement).style.transform = 'none';
          (item as HTMLElement).style.boxShadow = '0 4px 14px rgba(0,0,0,0.6)';
        });
        item.addEventListener('click', () => {
          const cardName = (item as HTMLElement).dataset.name;
          if (cardName) {
            modal.remove();
            onSelect(cardName);
          }
        });
      });
    };

    bindCards();

    modal.querySelector('#modal-close-btn')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    const searchInput = modal.querySelector('#gallery-search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      searchQuery = searchInput.value;
      updateGrid();
    });

    modal.querySelectorAll('.gallery-rarity-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.gallery-rarity-btn').forEach(b => {
          (b as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
          (b as HTMLElement).style.color = '#ccc';
        });
        (btn as HTMLElement).style.borderColor = '#ffd700';
        (btn as HTMLElement).style.color = '#ffd700';
        currentFilterRarity = (btn as HTMLElement).dataset.rarity || 'all';
        updateGrid();
      });
    });
  }

  // =========================================================================
  // RENDERIZAÇÃO PRINCIPAL: 3 COLUNAS LADO A LADO SIMULTANEAMENTE
  // =========================================================================
  public render(): string {
    return `
      <div style="flex:1; display:flex; flex-direction:column; height:100%; overflow:hidden; font-family:'Outfit', sans-serif; background:#0b0d14; color:#fff;">
        
        <!-- TOPO FIXO: TÍTULO E BOTÃO SALVAR LOJA -->
        <div style="padding:10px 18px; border-bottom:1px solid rgba(255,255,255,0.1); background:#0f111a; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; z-index:30;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:34px; height:34px; border-radius:10px; background:linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,122,0,0.2)); border:1px solid rgba(255,215,0,0.4); display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
              🏪
            </div>
            <div>
              <div style="font-size:0.95rem; font-weight:950; letter-spacing:1px; color:#ffd700;">LOJA & OFERTAS</div>
              <div style="font-size:0.62rem; color:#888;">Gestão modular em 3 painéis lado a lado · Suporte a repetição de módulos · Centralização ao vivo</div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:10px;">
            <button id="btn-save-store" class="editor-btn-primary" style="font-size:0.75rem; font-weight:900; padding:8px 20px; white-space:nowrap; box-shadow:0 0 14px rgba(255,215,0,0.3);">
              💾 SALVAR LOJA
            </button>
          </div>
        </div>

        <!-- WORKBENCH COM AS 3 COLUNAS LADO A LADO -->
        <div style="flex:1; display:flex; flex-direction:row; overflow:hidden;">
          
          <!-- ============================================================== -->
          <!-- COLUNA 1 (ESQUERDA): MÓDULOS DA VITRINE (FORA DE CONTAINER)    -->
          <!-- ============================================================== -->
          <div style="width:320px; min-width:300px; max-width:350px; border-right:1px solid rgba(255,255,255,0.1); background:#0d0f17; display:flex; flex-direction:column; overflow:hidden; flex-shrink:0;">
            ${this.renderColumn1ModulesHtml()}
          </div>

          <!-- ============================================================== -->
          <!-- COLUNA 2 (CENTRO): MENU DO MÓDULO CLICADO (FORA DE CONTAINER)  -->
          <!-- ============================================================== -->
          <div id="col2-editor-panel" style="flex:1; min-width:380px; border-right:1px solid rgba(255,255,255,0.1); background:#0e1019; display:flex; flex-direction:column; overflow:hidden;">
            ${this.renderColumn2EditorHtml()}
          </div>

          <!-- ============================================================== -->
          <!-- COLUNA 3 (DIREITA): PREVIEW DA LOJA AO VIVO (CELULAR)          -->
          <!-- ============================================================== -->
          <div style="width:410px; min-width:390px; max-width:440px; background:#07090f; display:flex; flex-direction:column; overflow:hidden; flex-shrink:0;">
            ${this.renderColumn3PreviewHtml()}
          </div>

        </div>
      </div>
    `;
  }

  // =========================================================================
  // COLUNA 1: MÓDULOS DA VITRINE (TOTALMENTE ABERTO, SUPORTA REPETIÇÃO)
  // =========================================================================
  private renderColumn1ModulesHtml(): string {
    const d = this.data;
    const currentOrder = d.sectionOrder || [...DEFAULT_SECTION_ORDER];

    return `
      <!-- Cabeçalho Fixo da Coluna 1 -->
      <div style="padding:12px 14px; border-bottom:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.3); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-size:0.8rem; font-weight:950; color:#ffd700;">🔀 MÓDULOS DA VITRINE</span>
          <span style="background:rgba(255,215,0,0.15); border:1px solid rgba(255,215,0,0.35); border-radius:999px; padding:1px 6px; font-size:0.58rem; color:#ffd700;">${currentOrder.length}</span>
        </div>
        <button id="btn-restore-default-modules" class="editor-btn-secondary" style="font-size:0.58rem; padding:4px 8px; color:#aaa;" title="Restaurar módulos padrão">
          🔄 Padrão
        </button>
      </div>

      <div style="padding:8px 12px; background:rgba(255,215,0,0.03); border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.6rem; color:#888; line-height:1.3;">
        Clique no módulo para editar ao lado e centralizar no preview. Você pode repetir qualquer módulo na vitrine.
      </div>

      <!-- Lista Rolável dos Módulos (com suporte a instâncias repetidas) -->
      <div style="flex:1; overflow-y:auto; padding:10px; display:flex; flex-direction:column; gap:6px;">
        ${currentOrder.map((key, idx) => {
          const meta = SECTION_METADATA[key] || { label: key, icon: '📌', desc: '' };
          const isVisible = d.sectionVisibility?.[key] !== false;
          const isSelected = TabStore.activeOrderIdx === idx;

          return `
            <div class="store-module-item" data-key="${key}" data-idx="${idx}" style="background:${isSelected ? 'linear-gradient(90deg, rgba(255,215,0,0.18), rgba(255,122,0,0.12))' : 'rgba(0,0,0,0.35)'}; border:1.5px solid ${isSelected ? '#ffd700' : (isVisible ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.3)')}; border-radius:10px; padding:8px 10px; display:flex; align-items:center; justify-content:space-between; gap:8px; cursor:pointer; transition:0.15s; box-shadow:${isSelected ? '0 0 12px rgba(255,215,0,0.25)' : 'none'}; ${isVisible ? '' : 'opacity:0.5;'}">
              
              <!-- Info Esquerda -->
              <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
                <span style="font-size:0.65rem; font-weight:950; color:${isSelected ? '#ffd700' : '#888'}; background:rgba(0,0,0,0.4); border:1px solid ${isSelected ? '#ffd700' : 'rgba(255,255,255,0.1)'}; width:22px; height:22px; border-radius:6px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  ${idx + 1}
                </span>

                <span style="font-size:1.1rem; flex-shrink:0;">${meta.icon}</span>

                <div style="display:flex; flex-direction:column; min-width:0; overflow:hidden;">
                  <span style="font-size:0.72rem; font-weight:900; color:${isSelected ? '#ffd700' : '#fff'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${meta.label}
                  </span>
                  <span style="font-size:0.55rem; color:${isVisible ? '#4ade80' : '#ef4444'}; font-weight:800;">
                    ${isVisible ? '● Visível na Loja' : '○ Oculto'}
                  </span>
                </div>
              </div>

              <!-- Ações Direita -->
              <div style="display:flex; align-items:center; gap:3px; flex-shrink:0;">
                <button class="btn-sec-move-up editor-btn-secondary" data-idx="${idx}" style="font-size:0.6rem; padding:3px 6px; ${idx === 0 ? 'opacity:0.2; pointer-events:none;' : ''}" title="Subir">▲</button>
                <button class="btn-sec-move-down editor-btn-secondary" data-idx="${idx}" style="font-size:0.6rem; padding:3px 6px; ${idx === currentOrder.length - 1 ? 'opacity:0.2; pointer-events:none;' : ''}" title="Descer">▼</button>
                <button class="btn-sec-toggle-vis editor-btn-secondary" data-key="${key}" data-idx="${idx}" style="font-size:0.6rem; padding:3px 6px; ${isVisible ? 'color:#4ade80;' : 'color:#ef4444;'}" title="Alternar visibilidade">${isVisible ? '👁️' : '🚫'}</button>
                <button class="btn-sec-remove editor-btn-secondary" data-idx="${idx}" style="font-size:0.6rem; padding:3px 6px; color:#ef4444;" title="Tirar esta instância da vitrine">🗑️</button>
              </div>
            </div>
          `;
        }).join('')}

        <!-- Bloco Adicionar Módulo à Vitrine (permite repetir qualquer módulo) -->
        <div style="margin-top:8px; padding:10px; background:rgba(0,0,0,0.3); border:1px dashed rgba(255,255,255,0.15); border-radius:10px; display:flex; flex-direction:column; gap:6px;">
          <div style="font-size:0.62rem; font-weight:900; color:#4ade80; display:flex; align-items:center; gap:4px;">
            <span>➕</span> ADICIONAR MÓDULO À VITRINE (PERMITE REPETIR)
          </div>
          <div style="display:flex; gap:4px;">
            <select id="select-add-module" class="editor-input" style="flex:1; font-size:0.65rem; padding:4px 6px;">
              ${Object.keys(SECTION_METADATA).map(k => `<option value="${k}">${SECTION_METADATA[k]?.icon || '📌'} ${SECTION_METADATA[k]?.label || k}</option>`).join('')}
            </select>
            <button id="btn-add-module" class="editor-btn-secondary" style="font-size:0.62rem; font-weight:900; color:#4ade80; border-color:rgba(74,222,128,0.4); padding:4px 8px; white-space:nowrap;">
              + ADICIONAR
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // COLUNA 2: MENU DO MÓDULO CLICADO (TOTALMENTE ABERTO, FORA DE CONTAINER)
  // =========================================================================
  private renderColumn2EditorHtml(): string {
    const key = TabStore.activeModuleKey;
    const meta = SECTION_METADATA[key] || { label: key, icon: '📌', desc: '' };
    const currentOrder = this.data.sectionOrder || [];
    const isInVitrine = currentOrder.includes(key);

    return `
      <!-- Cabeçalho Fixo da Coluna 2 -->
      <div style="padding:12px 18px; border-bottom:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.3); display:flex; justify-content:space-between; align-items:center; flex-shrink:0; gap:12px;">
        <div style="display:flex; align-items:center; gap:10px; min-width:0;">
          <span style="font-size:1.4rem; flex-shrink:0;">${meta.icon}</span>
          <div style="display:flex; flex-direction:column; min-width:0;">
            <div style="font-size:0.88rem; font-weight:950; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${meta.label}
            </div>
            <div style="font-size:0.6rem; color:#888;">
              ${isInVitrine ? `● Na vitrine (Instância #${TabStore.activeOrderIdx + 1})` : `○ Fora da vitrine`}
            </div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:6px;">
          <!-- Botão para centralizar no preview -->
          <button id="btn-center-preview" class="editor-btn-secondary" style="font-size:0.65rem; font-weight:900; padding:6px 10px; color:#ffd700; border-color:rgba(255,215,0,0.4);">
            🎯 Centralizar no Preview
          </button>
          <button class="btn-toggle-active-module-vitrine editor-btn-secondary" data-key="${key}" style="font-size:0.65rem; font-weight:900; padding:6px 10px; white-space:nowrap;">
            ${isInVitrine ? '🗑️ Tirar' : '➕ Ativar'}
          </button>
        </div>
      </div>

      <!-- Conteúdo Aberto e Rolável do Formulário do Módulo Selecionado -->
      <div style="flex:1; overflow-y:auto; padding:16px 18px; display:flex; flex-direction:column; gap:14px;">
        ${this.renderModuleFormHtml(key)}
      </div>
    `;
  }

  // =========================================================================
  // FORMULÁRIO DO MÓDULO CLICADO (ABERTO, SEM ACCORDION RETRÁTIL)
  // =========================================================================
  private renderModuleFormHtml(key: string): string {
    const d = this.data;

    switch (key) {
      // ---------------------------------------------------------------------
      // ---------------------------------------------------------------------
      // MÓDULO 1: BOOSTERS CARROSSEL (APENAS ORGANIZAÇÃO DA VITRINE)
      // ---------------------------------------------------------------------
      case 'packs':
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <div style="font-size:0.95rem; font-weight:950; color:#ff7a00;">📦 BOOSTERS - MÓDULO 1 (CARROSSEL 3D)</div>
              <div style="font-size:0.65rem; color:#aaa;">Carrossel 3D horizontal com 3 boosters peeking e física elegante de deslize.</div>
            </div>
            <button class="btn-go-packs-tab editor-btn-secondary" style="font-size:0.68rem; font-weight:900; padding:6px 14px; color:#ff7a00; border-color:#ff7a00;">
              📦 ABRIR ABA BOOSTERS
            </button>
          </div>

          <div style="display:flex; flex-direction:column; gap:4px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="font-size:0.68rem; font-weight:800; color:#ffd700;">Título da Seção na Vitrine:</span>
            <input type="text" id="store-title-packs" class="editor-input" value="${this.esc((d.titles as any)?.packs || 'PACOTES & BOOSTERS (CARROSSEL)')}" style="font-size:0.72rem; font-weight:700;">
          </div>

          <!-- Informação e Navegação para o Editor Oficial de Boosters -->
          <div style="background:rgba(255,122,0,0.08); border:1px solid rgba(255,122,0,0.25); border-radius:10px; padding:12px 14px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
            <div style="font-size:0.68rem; color:#fbd38d; line-height:1.4;">
              💡 <b>Os boosters são criados e configurados na Aba Boosters</b> (modelos 3D, taxas de cartas, capas e temas). Aqui na Loja você apenas organiza a vitrine e define quais aparecem.
            </div>
            <button class="btn-go-packs-tab editor-btn-primary" style="font-size:0.65rem; font-weight:900; padding:7px 14px; background:#ff7a00; border-color:#ff7a00; white-space:nowrap;">
              ⚙️ EDITAR BOOSTERS 3D
            </button>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="font-size:0.72rem; font-weight:900; color:#fff;">Boosters Cadastrados na Vitrine (${d.packs.length}):</div>
            ${d.packs.map((pack, i) => `
              <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:8px 12px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
                  <div style="width:26px; height:38px; border-radius:2px; border:1px solid #ffd700; ${pack.customFront ? `background:url('${pack.customFront}') center/cover;` : 'background:#222;'} flex-shrink:0;"></div>
                  <div style="display:flex; flex-direction:column; min-width:0;">
                    <span style="font-size:0.75rem; font-weight:900; color:#ffd700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.esc(pack.name)}</span>
                    <span style="font-size:0.6rem; color:#aaa;">Preço: ${pack.currency === 'gems' ? '💎' : '🪙'} ${pack.price} · ${pack.cardsCount || 9} cartas</span>
                  </div>
                </div>

                <label style="display:flex; align-items:center; gap:6px; font-size:0.65rem; color:#aaa; cursor:pointer; flex-shrink:0;">
                  <input type="checkbox" class="store-pack-pub" data-idx="${i}" ${pack.published !== false ? 'checked' : ''}>
                  <span style="color:${pack.published !== false ? '#4ade80' : '#ef4444'}; font-weight:800;">
                    ${pack.published !== false ? '● Ativo na Loja' : '○ Oculto'}
                  </span>
                </label>
              </div>
            `).join('')}
          </div>
        `;

      // ---------------------------------------------------------------------
      // MÓDULO 2: BOOSTERS SPLIT LATERAL (APENAS ORGANIZAÇÃO DA VITRINE)
      // ---------------------------------------------------------------------
      case 'packs_split':
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <div style="font-size:0.95rem; font-weight:950; color:#38bdf8;">🌓 BOOSTERS - MÓDULO 2 (SPLIT LATERAL)</div>
              <div style="font-size:0.65rem; color:#aaa;">Exibe o booster em destaque à esquerda e detalhes de abertura à direita.</div>
            </div>
            <button class="btn-go-packs-tab editor-btn-secondary" style="font-size:0.68rem; font-weight:900; padding:6px 14px; color:#38bdf8; border-color:#38bdf8;">
              📦 ABRIR ABA BOOSTERS
            </button>
          </div>

          <div style="display:flex; flex-direction:column; gap:4px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="font-size:0.68rem; font-weight:800; color:#ffd700;">Título da Seção na Vitrine:</span>
            <input type="text" id="store-title-packs-split" class="editor-input" value="${this.esc((d.titles as any)?.packs_split || 'DESTAQUES ESPECIAIS (SPLIT)')}" style="font-size:0.72rem; font-weight:700;">
          </div>

          <div style="background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.25); border-radius:10px; padding:12px 14px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
            <div style="font-size:0.68rem; color:#bae6fd; line-height:1.4;">
              ℹ️ <b>Organização da Vitrine Split:</b> Este módulo projeta os mesmos boosters ativos cadastrados na <b>Aba Boosters</b>, utilizando uma apresentação com foco no modelo do pacote e ações imediatas.
            </div>
            <button class="btn-go-packs-tab editor-btn-primary" style="font-size:0.65rem; font-weight:900; padding:7px 14px; background:#0284c7; border-color:#0284c7; white-space:nowrap;">
              ⚙️ EDITAR BOOSTERS 3D
            </button>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="font-size:0.72rem; font-weight:900; color:#fff;">Boosters na Vitrine Split (${d.packs.length}):</div>
            ${d.packs.map((pack, i) => `
              <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:8px 12px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
                  <div style="width:26px; height:38px; border-radius:2px; border:1px solid #38bdf8; ${pack.customFront ? `background:url('${pack.customFront}') center/cover;` : 'background:#222;'} flex-shrink:0;"></div>
                  <div style="display:flex; flex-direction:column; min-width:0;">
                    <span style="font-size:0.75rem; font-weight:900; color:#38bdf8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.esc(pack.name)}</span>
                    <span style="font-size:0.6rem; color:#aaa;">${pack.currency === 'gems' ? '💎' : '🪙'} ${pack.price} · ${pack.cardsCount || 9} cartas</span>
                  </div>
                </div>

                <label style="display:flex; align-items:center; gap:6px; font-size:0.65rem; color:#aaa; cursor:pointer; flex-shrink:0;">
                  <input type="checkbox" class="store-pack-pub" data-idx="${i}" ${pack.published !== false ? 'checked' : ''}>
                  <span style="color:${pack.published !== false ? '#4ade80' : '#ef4444'}; font-weight:800;">
                    ${pack.published !== false ? '● Ativo' : '○ Oculto'}
                  </span>
                </label>
              </div>
            `).join('')}
          </div>
        `;

      // ---------------------------------------------------------------------
      // DECKS COMPLETOS (APENAS MODO SEPARADO)
      // ---------------------------------------------------------------------
      case 'decks':
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <div style="font-size:0.95rem; font-weight:950; color:#d8b4fe;">🃏 DECKS COMPLETOS (${d.decks.length})</div>
              <div style="font-size:0.65rem; color:#aaa;">Cada deck é apresentado em sua própria seção dedicada e separada na loja.</div>
            </div>
            <button id="store-deck-add" class="editor-btn-primary" style="font-size:0.7rem; padding:6px 14px; background:#a855f7; border-color:#a855f7;">+ NOVO DECK</button>
          </div>

          <div style="display:flex; flex-direction:column; gap:4px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="font-size:0.68rem; font-weight:800; color:#ffd700;">Título da Seção na Vitrine:</span>
            <input type="text" id="store-title-decks" class="editor-input" value="${this.esc((d.titles as any)?.decks || 'DECKS COMPLETOS')}" style="font-size:0.72rem; font-weight:700;">
          </div>

          <div style="display:flex; flex-direction:column; gap:12px;">
            ${d.decks.map((deck, i) => `
              <div style="background:rgba(0,0,0,0.45); border:1px solid rgba(168,85,247,0.25); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <input type="text" class="editor-input store-deck-name" data-idx="${i}" value="${this.esc(deck.name)}" style="flex:1; font-size:0.75rem; font-weight:900; color:#ffd700;">
                  <button class="editor-btn-secondary store-deck-del" data-idx="${i}" style="font-size:0.65rem; padding:4px 8px; color:#ef4444; margin-left:6px;">✕</button>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                  <input type="number" class="editor-input store-deck-price" data-idx="${i}" value="${deck.price}" min="0" style="flex:1; font-size:0.68rem;" title="Preço">
                  <select class="editor-input store-deck-cur" data-idx="${i}" style="width:85px; font-size:0.65rem;">
                    <option value="gold" ${deck.currency !== 'gems' ? 'selected' : ''}>🪙 Ouro</option>
                    <option value="gems" ${deck.currency === 'gems' ? 'selected' : ''}>💎 Gemas</option>
                  </select>
                </div>
                <textarea class="editor-input store-deck-desc" data-idx="${i}" rows="2" style="font-size:0.65rem;" placeholder="Descrição do deck...">${this.esc(deck.desc || '')}</textarea>
                
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:0.65rem; color:#ffd700; font-weight:800;">Cartas no deck (${(deck.cards || []).length}):</span>
                  <button type="button" class="editor-btn-primary store-deck-open-gallery" data-idx="${i}" style="font-size:0.62rem; font-weight:900; padding:4px 10px; background:#9333ea; border-color:#a855f7;">
                    🃏 + ADICIONAR PELA GALERIA
                  </button>
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap; max-height:120px; overflow-y:auto; padding:6px; background:rgba(0,0,0,0.3); border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                  ${(deck.cards && deck.cards.length > 0) ? deck.cards.map((c, ci) => {
                    const cardObj = this.resolveCardObj(c);
                    const cImg = cardObj?.image || cardObj?.frontImage || '';
                    const cRarity = cardObj?.preferredRarity || cardObj?.rarity || 'common';
                    const cBorder = this.getRarityColor(cRarity);
                    return `
                      <span style="font-size:0.6rem; background:rgba(255,255,255,0.06); border:1px solid ${cBorder}; padding:3px 8px; border-radius:8px; display:flex; align-items:center; gap:6px; box-shadow:0 2px 5px rgba(0,0,0,0.4);">
                        <span style="width:18px; height:24px; border-radius:3px; ${cImg ? `background:url('${cImg}') center/cover;` : 'background:#222;'} border:1px solid rgba(255,255,255,0.2); display:inline-block; flex-shrink:0;"></span>
                        <span style="font-weight:700; color:#fff; max-width:100px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.esc(c)}</span>
                        <b class="store-deck-rmcard" data-idx="${i}" data-ci="${ci}" style="cursor:pointer; color:#ef4444; font-size:0.75rem; padding-left:2px;" title="Remover carta do deck">✕</b>
                      </span>
                    `;
                  }).join('') : `
                    <div style="font-size:0.62rem; color:#888; padding:8px; text-align:center; width:100%;">
                      Nenhuma carta no deck ainda. Clique em "+ ADICIONAR PELA GALERIA" acima!
                    </div>
                  `}
                </div>
              </div>
            `).join('')}
          </div>
        `;

      // ---------------------------------------------------------------------
      // BANNERS PROMOCIONAIS
      // ---------------------------------------------------------------------
      case 'banners':
        return `
          <div>
            <div style="font-size:0.95rem; font-weight:950; color:#ffd700;">🎞️ BANNERS PROMOCIONAIS (${d.banners.length}/3)</div>
            <div style="font-size:0.65rem; color:#aaa;">Imagens rotativas em proporção cinematográfica vertical (1080x380).</div>
          </div>

          <div style="display:flex; flex-direction:column; gap:12px;">
            ${[0, 1, 2].map(i => `
              <div style="background:rgba(0,0,0,0.45); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
                <div style="font-size:0.68rem; font-weight:900; color:#ffd700;">BANNER #${i + 1}</div>
                <div style="width:100%; aspect-ratio:1080/380; border-radius:8px; overflow:hidden; background:rgba(0,0,0,0.6); border:1px dashed rgba(255,255,255,0.2); ${d.banners[i] ? `background-image:url('${d.banners[i]}'); background-size:cover; background-position:center; border-style:solid;` : ''} display:flex; align-items:center; justify-content:center; color:#777; font-size:0.68rem;">
                  ${d.banners[i] ? '' : 'Sem Banner Cadastrado'}
                </div>
                <div style="display:flex; gap:6px; justify-content:flex-end;">
                  <button class="editor-btn-secondary store-banner-pick" data-idx="${i}" style="font-size:0.65rem; padding:6px 12px;">🖼️ Escolher Imagem</button>
                  ${d.banners[i] ? `<button class="editor-btn-secondary store-banner-del" data-idx="${i}" style="font-size:0.65rem; padding:6px 10px; color:#ef4444;">✕ Excluir</button>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `;

      // ---------------------------------------------------------------------
      // OFERTAS DO DIA
      // ---------------------------------------------------------------------
      case 'daily':
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <div style="font-size:0.95rem; font-weight:950; color:#ffd700;">☀️ OFERTAS DO DIA (${d.dailyPool.length})</div>
              <div style="font-size:0.65rem; color:#aaa;">Cartas que rotacionam diariamente a cada 24 horas.</div>
            </div>
            <button id="store-daily-add" class="editor-btn-primary" style="font-size:0.7rem; padding:6px 14px;">+ ADICIONAR CARTA</button>
          </div>

          <div style="display:flex; flex-direction:column; gap:4px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="font-size:0.68rem; font-weight:800; color:#ffd700;">Título da Seção na Vitrine:</span>
            <input type="text" id="store-title-daily" class="editor-input" value="${this.esc((d.titles as any)?.daily || 'OFERTAS DO DIA')}" style="font-size:0.72rem; font-weight:700;">
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            ${d.dailyPool.map((o, i) => {
              const cardObj = this.resolveCardObj(o.card);
              const cImg = cardObj?.image || cardObj?.frontImage || '';
              const cRarity = cardObj?.preferredRarity || cardObj?.rarity || 'common';
              const cBorder = this.getRarityColor(cRarity);
              const cLabel = this.getRarityLabel(cRarity);
              const atk = cardObj?.baseAtk || cardObj?.atk || 0;
              const pv = cardObj?.basePv || cardObj?.pv || 0;
              return `
                <div style="background:rgba(0,0,0,0.45); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:8px 12px; display:flex; gap:10px; align-items:center;">
                  <!-- Seletor Visual de Carta -->
                  <div class="store-pick-card btn-pick-daily-card" data-idx="${i}" style="flex:2; display:flex; align-items:center; gap:8px; background:rgba(0,0,0,0.5); border:1.5px solid ${cBorder}; border-radius:8px; padding:6px 10px; cursor:pointer; transition:all 0.15s ease;" title="Toque para escolher carta na galeria visual">
                    <div style="width:32px; height:44px; border-radius:5px; ${cImg ? `background:url('${cImg}') center/cover;` : 'background:#222;'} border:1px solid ${cBorder}; flex-shrink:0; box-shadow:0 2px 6px rgba(0,0,0,0.6);"></div>
                    <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
                      <span style="font-size:0.75rem; font-weight:900; color:#ffd700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.esc(o.card || 'Selecionar carta')}</span>
                      <span style="font-size:0.58rem; color:#888;">${cLabel} · ⚔️ ${atk} ❤️ ${pv}</span>
                    </div>
                    <span style="font-size:0.6rem; color:#ffd700; background:rgba(255,215,0,0.15); border:1px solid rgba(255,215,0,0.4); padding:3px 6px; border-radius:6px; font-weight:800; white-space:nowrap;">🔍 Alterar</span>
                  </div>

                  <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
                    <input type="number" class="editor-input store-daily-price" data-idx="${i}" value="${o.price}" min="0" style="width:70px; font-size:0.68rem;" title="Moedas">
                    <span style="font-size:0.85rem;">🪙</span>
                  </div>

                  <button class="editor-btn-secondary store-daily-del" data-idx="${i}" style="font-size:0.68rem; padding:6px 10px; color:#ef4444; flex-shrink:0;" title="Excluir">✕</button>
                </div>
              `;
            }).join('')}
          </div>
        `;

      // ---------------------------------------------------------------------
      // CARTAS RARAS
      // ---------------------------------------------------------------------
      case 'rare':
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <div style="font-size:0.95rem; font-weight:950; color:#38bdf8;">💎 CARTAS RARAS (${d.rare.length})</div>
              <div style="font-size:0.65rem; color:#aaa;">Cartas avulsas vendidas por diamantes.</div>
            </div>
            <button id="store-rare-add" class="editor-btn-primary" style="font-size:0.7rem; padding:6px 14px; background:#0284c7; border-color:#0284c7;">+ ADICIONAR CARTA</button>
          </div>

          <div style="display:flex; flex-direction:column; gap:4px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="font-size:0.68rem; font-weight:800; color:#ffd700;">Título da Seção na Vitrine:</span>
            <input type="text" id="store-title-rare" class="editor-input" value="${this.esc((d.titles as any)?.rare || 'CARTAS RARAS')}" style="font-size:0.72rem; font-weight:700;">
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            ${d.rare.map((o, i) => {
              const cardObj = this.resolveCardObj(o.card);
              const cImg = cardObj?.image || cardObj?.frontImage || '';
              const cRarity = cardObj?.preferredRarity || cardObj?.rarity || 'rare';
              const cBorder = this.getRarityColor(cRarity);
              const cLabel = this.getRarityLabel(cRarity);
              const atk = cardObj?.baseAtk || cardObj?.atk || 0;
              const pv = cardObj?.basePv || cardObj?.pv || 0;
              return `
                <div style="background:rgba(0,0,0,0.45); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:8px 12px; display:flex; gap:10px; align-items:center;">
                  <!-- Seletor Visual de Carta -->
                  <div class="store-pick-card btn-pick-rare-card" data-idx="${i}" style="flex:2; display:flex; align-items:center; gap:8px; background:rgba(0,0,0,0.5); border:1.5px solid ${cBorder}; border-radius:8px; padding:6px 10px; cursor:pointer; transition:all 0.15s ease;" title="Toque para escolher carta na galeria visual">
                    <div style="width:32px; height:44px; border-radius:5px; ${cImg ? `background:url('${cImg}') center/cover;` : 'background:#222;'} border:1px solid ${cBorder}; flex-shrink:0; box-shadow:0 2px 6px rgba(0,0,0,0.6);"></div>
                    <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
                      <span style="font-size:0.75rem; font-weight:900; color:#38bdf8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.esc(o.card || 'Selecionar carta')}</span>
                      <span style="font-size:0.58rem; color:#888;">${cLabel} · ⚔️ ${atk} ❤️ ${pv}</span>
                    </div>
                    <span style="font-size:0.6rem; color:#38bdf8; background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.4); padding:3px 6px; border-radius:6px; font-weight:800; white-space:nowrap;">🔍 Alterar</span>
                  </div>

                  <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
                    <input type="number" class="editor-input store-rare-price" data-idx="${i}" value="${o.price}" min="0" style="width:70px; font-size:0.68rem;" title="Diamantes">
                    <span style="font-size:0.85rem;">💎</span>
                  </div>

                  <button class="editor-btn-secondary store-rare-del" data-idx="${i}" style="font-size:0.68rem; padding:6px 10px; color:#ef4444; flex-shrink:0;" title="Excluir">✕</button>
                </div>
              `;
            }).join('')}
          </div>
        `;

      // ---------------------------------------------------------------------
      // MOEDAS & DIAMANTES
      // ---------------------------------------------------------------------
      case 'coins':
      case 'gems':
        return `
          <div style="display:flex; flex-direction:column; gap:14px;">
            <!-- MOEDAS -->
            <div style="background:rgba(234,179,8,0.03); border:1px solid rgba(234,179,8,0.25); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
              <div style="font-size:0.85rem; font-weight:950; color:#fbbf24;">🪙 PACOTES DE MOEDAS (GOLD)</div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.65rem; font-weight:800; color:#ffd700;">Título da Seção na Vitrine:</span>
                <input type="text" id="store-title-coins" class="editor-input" value="${this.esc((d.titles as any)?.coins || 'MOEDAS')}" style="font-size:0.7rem; font-weight:700;">
              </div>
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${d.coinPacks.map((p, i) => `
                  <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:6px 8px; display:flex; gap:6px; align-items:center;">
                    <span style="font-size:0.65rem; color:#ffd700; font-weight:800; width:45px;">#${i + 1}</span>
                    <input type="number" class="editor-input store-coin-gold" data-idx="${i}" value="${p.gold}" min="0" style="flex:1; font-size:0.65rem;" title="Ouro">
                    <span style="font-size:0.7rem;">🪙</span>
                    <span style="font-size:0.6rem; color:#aaa;">por</span>
                    <input type="number" class="editor-input store-coin-price" data-idx="${i}" value="${p.price}" min="0" style="width:60px; font-size:0.65rem;" title="Gemas">
                    <span style="font-size:0.7rem;">💎</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- DIAMANTES -->
            <div style="background:rgba(56,189,248,0.03); border:1px solid rgba(56,189,248,0.25); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
              <div style="font-size:0.85rem; font-weight:950; color:#38bdf8;">💎 PACOTES DE DIAMANTES (GEMS)</div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.65rem; font-weight:800; color:#ffd700;">Título da Seção na Vitrine:</span>
                <input type="text" id="store-title-gems" class="editor-input" value="${this.esc((d.titles as any)?.gems || 'DIAMANTES')}" style="font-size:0.7rem; font-weight:700;">
              </div>
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${d.gemPacks.map((p, i) => `
                  <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:6px 8px; display:flex; gap:6px; align-items:center;">
                    <span style="font-size:0.65rem; color:#38bdf8; font-weight:800; width:45px;">#${i + 1}</span>
                    <input type="number" class="editor-input store-gem-gems" data-idx="${i}" value="${p.gems}" min="0" style="flex:1; font-size:0.65rem;" title="Diamantes">
                    <span style="font-size:0.7rem;">💎</span>
                    <span style="font-size:0.6rem; color:#aaa;">por</span>
                    <input type="text" class="editor-input store-gem-price" data-idx="${i}" value="${this.esc(p.price)}" style="width:75px; font-size:0.65rem;" placeholder="R$ 4,90">
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;

      // ---------------------------------------------------------------------
      // ARTEFATOS DE HABILIDADE
      // ---------------------------------------------------------------------
      case 'artifacts':
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <div style="font-size:0.95rem; font-weight:950; color:#d8b4fe;">✨ ARTEFATOS DE HABILIDADE (${d.artifacts.length})</div>
              <div style="font-size:0.65rem; color:#aaa;">Habilidades passivas e ativas vendidas na loja.</div>
            </div>
            <button id="store-art-add" class="editor-btn-primary" style="font-size:0.7rem; padding:6px 14px; background:#9333ea; border-color:#9333ea;">+ ADICIONAR ARTEFATO</button>
          </div>

          <div style="display:flex; flex-direction:column; gap:4px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="font-size:0.68rem; font-weight:800; color:#ffd700;">Título da Seção na Vitrine:</span>
            <input type="text" id="store-title-artifacts" class="editor-input" value="${this.esc((d.titles as any)?.artifacts || 'ARTEFATOS')}" style="font-size:0.72rem; font-weight:700;">
          </div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            ${d.artifacts.map((a, i) => `
              <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:8px 10px; display:flex; gap:6px; align-items:center;">
                <select class="editor-input store-art-id" data-idx="${i}" style="flex:2; font-size:0.68rem;">${this.skillOptions(a.id)}</select>
                <input type="number" class="editor-input store-art-price" data-idx="${i}" value="${a.price}" min="0" style="width:60px; font-size:0.68rem;" title="Preço">
                <select class="editor-input store-art-cur" data-idx="${i}" style="width:75px; font-size:0.65rem;">
                  <option value="gems" ${a.currency === 'gems' ? 'selected' : ''}>💎 Gemas</option>
                  <option value="gold" ${a.currency !== 'gems' ? 'selected' : ''}>🪙 Ouro</option>
                </select>
                <button class="editor-btn-secondary store-art-del" data-idx="${i}" style="font-size:0.65rem; padding:4px 8px; color:#ef4444;">✕</button>
              </div>
            `).join('')}
          </div>
        `;

      default:
        return `<div style="font-size:0.75rem; color:#888;">Selecione um módulo na coluna da esquerda para editar.</div>`;
    }
  }

  // =========================================================================
  // COLUNA 3: PREVIEW DA LOJA AO VIVO (SIMULADOR DE SMARTPHONE)
  // =========================================================================
  private renderColumn3PreviewHtml(): string {
    return `
      <!-- Cabeçalho Fixo da Coluna 3 -->
      <div style="padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.3); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
        <span style="font-size:0.75rem; font-weight:950; color:#4ade80;">📱 PREVIEW AO VIVO</span>
        <div style="display:flex; gap:4px;">
          <button id="btn-preview-add-gold" class="editor-btn-secondary" style="font-size:0.58rem; padding:3px 6px;" title="Adicionar 1.000 moedas para testar">+1k 🪙</button>
          <button id="btn-preview-add-gems" class="editor-btn-secondary" style="font-size:0.58rem; padding:3px 6px;" title="Adicionar 100 diamantes para testar">+100 💎</button>
          <button id="btn-refresh-store-preview" class="editor-btn-secondary" style="font-size:0.58rem; padding:3px 6px;" title="Atualizar Preview">🔄</button>
        </div>
      </div>

      <!-- Container Centralizado do Celular -->
      <div style="flex:1; overflow-y:auto; display:flex; align-items:center; justify-content:center; padding:12px;">
        
        <!-- Moldura Realista do Smartphone -->
        <div style="width:375px; height:740px; max-height:calc(100vh - 110px); border-radius:36px; border:8px solid #1c1f2e; background:#0b0d14; box-shadow:0 18px 45px rgba(0,0,0,0.85), 0 0 0 1.5px rgba(255,255,255,0.08); display:flex; flex-direction:column; overflow:hidden; position:relative; flex-shrink:0;">
          
          <!-- Notch Superior -->
          <div style="width:100%; height:24px; background:#000; display:flex; align-items:center; justify-content:center; flex-shrink:0; z-index:40; position:relative;">
            <div style="width:100px; height:16px; background:#111216; border-radius:18px; display:flex; align-items:center; justify-content:flex-end; padding:0 6px; border:1px solid rgba(255,255,255,0.08);">
              <div style="width:6px; height:6px; border-radius:50%; background:#1c2538; border:1px solid #2b3a55;"></div>
            </div>
          </div>

          <!-- Container onde a StoreScreen roda diretamente -->
          <div id="store-live-preview-content" style="flex:1; min-height:0; height:100%; display:flex; flex-direction:column; overflow:hidden; background:#0b0d14; position:relative;"></div>

          <!-- Home Indicator Inferior -->
          <div style="width:100%; height:14px; background:#000; display:flex; align-items:center; justify-content:center; flex-shrink:0; z-index:40;">
            <div style="width:110px; height:4px; background:rgba(255,255,255,0.3); border-radius:10px;"></div>
          </div>
        </div>

      </div>
    `;
  }

  // =========================================================================
  // ATUALIZA E CENTRALIZA O PREVIEW AO VIVO DA LOJA
  // =========================================================================
  private updateLivePreview(container: HTMLElement, highlightCenter: boolean = true) {
    const previewWrap = container.querySelector('#store-live-preview-content') as HTMLElement | null;
    if (!previewWrap) return;

    previewWrap.innerHTML = '';
    try {
      const liveStore = new StoreScreen({ ...this.data, templates: this.templates });
      liveStore.render(previewWrap, { headerSpace: false });

      // Permite clicar em qualquer seção da vitrine do celular para selecioná-la no editor
      previewWrap.querySelectorAll('.store-dynamic-sec').forEach(sec => {
        (sec as HTMLElement).style.cursor = 'pointer';
        sec.addEventListener('click', (e) => {
          if ((e.target as HTMLElement).closest('button, .store-dot, .store-view-card, .store-view-deck, input, select')) return;
          const k = (sec as HTMLElement).dataset.moduleKey;
          const idx = parseInt((sec as HTMLElement).dataset.orderIdx || '0');
          if (k) {
            TabStore.activeModuleKey = k;
            TabStore.activeOrderIdx = idx;
            this.reRender();
          }
        });
      });

      this.centerActiveModuleInPreview(container, highlightCenter);
    } catch (err) {
      console.warn('Erro ao atualizar preview ao vivo da loja:', err);
    }
  }

  // Centraliza no simulador de celular o módulo que está em edição com destaque visual
  private centerActiveModuleInPreview(container: HTMLElement, highlight: boolean = true) {
    const previewWrap = container.querySelector('#store-live-preview-content') as HTMLElement | null;
    if (!previewWrap) return;

    const executeScroll = () => {
      // 1. Busca a instância exata que está em edição usando o índice da vitrine e a chave
      let targetEl = previewWrap.querySelector(`[data-order-idx="${TabStore.activeOrderIdx}"][data-module-key="${TabStore.activeModuleKey}"]`) as HTMLElement | null;
      if (!targetEl) {
        targetEl = previewWrap.querySelector(`[data-order-idx="${TabStore.activeOrderIdx}"]`) as HTMLElement | null;
      }
      if (!targetEl) {
        targetEl = previewWrap.querySelector(`[data-module-key="${TabStore.activeModuleKey}"]`) as HTMLElement | null;
      }
      if (!targetEl) {
        targetEl = previewWrap.querySelector(`.sec-${TabStore.activeModuleKey}`) as HTMLElement | null;
      }

      if (!targetEl) return;

      // 2. Identifica o elemento com overflow/scroll dentro do preview do smartphone
      const storeScreen = previewWrap.querySelector('.store-screen') as HTMLElement | null;
      const scroller = (storeScreen && (storeScreen.scrollHeight > storeScreen.clientHeight + 5))
        ? storeScreen
        : (previewWrap.scrollHeight > previewWrap.clientHeight + 5 ? previewWrap : (storeScreen || previewWrap));

      if (scroller) {
        const scrollerRect = scroller.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        // Posição vertical relativa ao viewport interno do celular
        const relativeTop = targetRect.top - scrollerRect.top;
        // Centraliza verticalmente na moldura do smartphone com precisão
        let targetScrollTop = scroller.scrollTop + relativeTop - ((scrollerRect.height - targetRect.height) / 2);

        // Se a seção for muito alta (como listas verticais de boosters ou decks), posiciona o topo visível com folga agradável
        if (targetRect.height > scrollerRect.height * 0.75) {
          targetScrollTop = scroller.scrollTop + relativeTop - 20;
        }

        scroller.scrollTo({
          top: Math.max(0, Math.round(targetScrollTop)),
          behavior: 'smooth'
        });
      }

      // 3. Efeito luminoso dourado pulsante marcando o módulo ativo em edição
      if (highlight) {
        targetEl.style.transition = 'outline 0.25s ease, box-shadow 0.25s ease';
        targetEl.style.outline = '3px solid #ffd700';
        targetEl.style.outlineOffset = '4px';
        targetEl.style.borderRadius = '14px';
        targetEl.style.boxShadow = '0 0 24px rgba(255,215,0,0.65)';

        setTimeout(() => {
          if (targetEl) {
            targetEl.style.outline = 'none';
            targetEl.style.boxShadow = 'none';
          }
        }, 1600);
      }
    };

    // Executa em dois tempos para acomodar layout assíncrono e carregamento de fontes/imagens
    setTimeout(executeScroll, 60);
    setTimeout(executeScroll, 220);
  }

  // =========================================================================
  // EVENT LISTENERS E CONTROLES (BIND)
  // =========================================================================
  public bind(container: HTMLElement) {
    const d = this.data;
    const num = (v: string, fb: number) => {
      const n = parseInt(v);
      return isNaN(n) ? fb : Math.max(0, n);
    };

    // Inicializa o Preview ao vivo na Coluna 3 imediatamente
    this.updateLivePreview(container);

    // -----------------------------------------------------------------------
    // COLUNA 1: SELEÇÃO E GESTÃO DOS MÓDULOS DA VITRINE (SUPORTA REPETIÇÃO)
    // -----------------------------------------------------------------------
    // Clicar em qualquer item da Coluna 1 ativa aquele módulo na Coluna 2 e centraliza no preview
    container.querySelectorAll('.store-module-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
        const key = (item as HTMLElement).dataset.key || '';
        const idx = parseInt((item as HTMLElement).dataset.idx || '0');
        TabStore.activeModuleKey = key;
        TabStore.activeOrderIdx = idx;
        this.reRender();
      });
    });

    // Reordenar: Subir ▲
    container.querySelectorAll('.btn-sec-move-up').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
        if (idx > 0 && d.sectionOrder) {
          const item = d.sectionOrder.splice(idx, 1)[0];
          d.sectionOrder.splice(idx - 1, 0, item);
          TabStore.activeOrderIdx = idx - 1;
          TabStore.activeModuleKey = item;
          this.reRender();
        }
      });
    });

    // Reordenar: Descer ▼
    container.querySelectorAll('.btn-sec-move-down').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
        if (d.sectionOrder && idx < d.sectionOrder.length - 1) {
          const item = d.sectionOrder.splice(idx, 1)[0];
          d.sectionOrder.splice(idx + 1, 0, item);
          TabStore.activeOrderIdx = idx + 1;
          TabStore.activeModuleKey = item;
          this.reRender();
        }
      });
    });

    // Alternar Visibilidade 👁️
    container.querySelectorAll('.btn-sec-toggle-vis').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = (btn as HTMLElement).dataset.key || '';
        if (key) {
          if (!d.sectionVisibility) d.sectionVisibility = {};
          d.sectionVisibility[key] = !(d.sectionVisibility[key] !== false);
          this.reRender();
        }
      });
    });

    // Remover esta instância da vitrine 🗑️ (usa o índice exato da instância)
    container.querySelectorAll('.btn-sec-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
        if (d.sectionOrder && idx >= 0 && idx < d.sectionOrder.length) {
          const removedKey = d.sectionOrder.splice(idx, 1)[0];
          if (TabStore.activeOrderIdx >= d.sectionOrder.length) {
            TabStore.activeOrderIdx = Math.max(0, d.sectionOrder.length - 1);
          }
          TabStore.activeModuleKey = d.sectionOrder[TabStore.activeOrderIdx] || 'packs';
          this.reRender();
          this.showToast(`Módulo "${SECTION_METADATA[removedKey]?.label || removedKey}" removido da vitrine!`);
        }
      });
    });

    // Adicionar Módulo à Vitrine ➕ (permite repetir qualquer módulo)
    container.querySelector('#btn-add-module')?.addEventListener('click', () => {
      const select = container.querySelector('#select-add-module') as HTMLSelectElement | null;
      const key = select?.value;
      if (key) {
        if (!d.sectionOrder) d.sectionOrder = [];
        d.sectionOrder.push(key);
        TabStore.activeOrderIdx = d.sectionOrder.length - 1;
        TabStore.activeModuleKey = key;
        if (!d.sectionVisibility) d.sectionVisibility = {};
        d.sectionVisibility[key] = true;
        this.reRender();
        this.showToast(`Módulo "${SECTION_METADATA[key]?.label || key}" adicionado à vitrine!`);
      }
    });

    // Restaurar Todos os Módulos Padrão 🔄
    container.querySelector('#btn-restore-default-modules')?.addEventListener('click', () => {
      d.sectionOrder = [...DEFAULT_SECTION_ORDER];
      TabStore.activeOrderIdx = 0;
      TabStore.activeModuleKey = DEFAULT_SECTION_ORDER[0];
      if (!d.sectionVisibility) d.sectionVisibility = {};
      DEFAULT_SECTION_ORDER.forEach(k => {
        d.sectionVisibility![k] = true;
      });
      this.reRender();
      this.showToast('Módulos restaurados para o padrão!');
    });

    // -----------------------------------------------------------------------
    // COLUNA 2: AÇÕES DO EDITOR DO MÓDULO CLICADO
    // -----------------------------------------------------------------------
    // Botão Centralizar no Preview
    container.querySelector('#btn-center-preview')?.addEventListener('click', () => {
      this.centerActiveModuleInPreview(container, true);
      this.showToast('Módulo centralizado no preview!');
    });

    // Ao focar em qualquer campo de edição na Coluna 2, garante que o preview centraliza a seção
    container.querySelector('#col2-editor-panel')?.addEventListener('focusin', () => {
      this.centerActiveModuleInPreview(container, false);
    });

    // Botão de alternar o módulo atual na vitrine
    container.querySelectorAll('.btn-toggle-active-module-vitrine').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.key || TabStore.activeModuleKey;
        if (!d.sectionOrder) d.sectionOrder = [];
        const has = d.sectionOrder.includes(key);
        if (has) {
          const idx = d.sectionOrder.indexOf(key);
          d.sectionOrder.splice(idx, 1);
          if (TabStore.activeOrderIdx >= d.sectionOrder.length) {
            TabStore.activeOrderIdx = Math.max(0, d.sectionOrder.length - 1);
          }
          TabStore.activeModuleKey = d.sectionOrder[TabStore.activeOrderIdx] || 'packs';
          this.showToast(`Módulo removido da vitrine!`);
        } else {
          d.sectionOrder.push(key);
          TabStore.activeOrderIdx = d.sectionOrder.length - 1;
          TabStore.activeModuleKey = key;
          if (!d.sectionVisibility) d.sectionVisibility = {};
          d.sectionVisibility[key] = true;
          this.showToast(`Módulo ativado na vitrine!`);
        }
        this.reRender();
      });
    });

    // Títulos das Seções (com live preview)
    const bindTitleInput = (selector: string, fieldKey: string) => {
      container.querySelector(selector)?.addEventListener('input', (e) => {
        if (!d.titles) d.titles = {} as any;
        (d.titles as any)[fieldKey] = (e.target as HTMLInputElement).value;
        this.updateLivePreview(container);
      });
    };
    bindTitleInput('#store-title-packs', 'packs');
    bindTitleInput('#store-title-packs-split', 'packs_split');
    bindTitleInput('#store-title-decks', 'decks');
    bindTitleInput('#store-title-daily', 'daily');
    bindTitleInput('#store-title-rare', 'rare');
    bindTitleInput('#store-title-coins', 'coins');
    bindTitleInput('#store-title-gems', 'gems');
    bindTitleInput('#store-title-artifacts', 'artifacts');

    // Boosters / Pacotes: Navegação para a Aba Boosters e Ativação na Vitrine
    container.querySelectorAll('.btn-go-packs-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const packTabBtn = document.querySelector('.editor-tab[data-mode="packs"]') as HTMLElement | null;
        if (packTabBtn) {
          packTabBtn.click();
        } else {
          this.showToast('Acesse a aba Boosters no topo da Forja.');
        }
      });
    });

    container.querySelectorAll('.store-pack-pub').forEach(el => {
      el.addEventListener('change', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        d.packs[idx].published = (el as HTMLInputElement).checked;
        this.updateLivePreview(container, false);
      });
    });

    // Banners
    container.querySelectorAll('.store-banner-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        this.openMediaPicker(url => {
          d.banners[idx] = url;
          this.reRender();
        });
      });
    });

    container.querySelectorAll('.store-banner-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        d.banners.splice(idx, 1);
        this.reRender();
      });
    });

    // Ofertas Diárias
    container.querySelector('#store-daily-add')?.addEventListener('click', () => {
      this.openCardGalleryModal((cardName) => {
        d.dailyPool.push({ card: cardName, price: 100 });
        this.reRender();
      });
    });

    container.querySelectorAll('.btn-pick-daily-card').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        this.openCardGalleryModal((cardName) => {
          d.dailyPool[idx].card = cardName;
          this.reRender();
        });
      });
    });

    container.querySelectorAll('.store-daily-price').forEach(el => {
      el.addEventListener('input', () => {
        d.dailyPool[parseInt((el as HTMLElement).dataset.idx!)].price = num((el as HTMLInputElement).value, 0);
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-daily-del').forEach(btn => {
      btn.addEventListener('click', () => {
        d.dailyPool.splice(parseInt((btn as HTMLElement).dataset.idx!), 1);
        this.reRender();
      });
    });

    // Cartas Raras
    container.querySelector('#store-rare-add')?.addEventListener('click', () => {
      this.openCardGalleryModal((cardName) => {
        d.rare.push({ card: cardName, price: 50 });
        this.reRender();
      });
    });

    container.querySelectorAll('.btn-pick-rare-card').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        this.openCardGalleryModal((cardName) => {
          d.rare[idx].card = cardName;
          this.reRender();
        });
      });
    });

    container.querySelectorAll('.store-rare-price').forEach(el => {
      el.addEventListener('input', () => {
        d.rare[parseInt((el as HTMLElement).dataset.idx!)].price = num((el as HTMLInputElement).value, 0);
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-rare-del').forEach(btn => {
      btn.addEventListener('click', () => {
        d.rare.splice(parseInt((btn as HTMLElement).dataset.idx!), 1);
        this.reRender();
      });
    });

    // Decks (Apenas modo separado)
    container.querySelector('#store-deck-add')?.addEventListener('click', () => {
      d.decks.push({ id: 'deck_' + Date.now(), name: 'Novo Deck', price: 500, currency: 'gold', desc: '', image: '', cards: [] });
      this.reRender();
    });

    container.querySelectorAll('.store-deck-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        d.decks.splice(idx, 1);
        this.reRender();
      });
    });

    container.querySelectorAll('.store-deck-name').forEach(el => {
      el.addEventListener('input', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        d.decks[idx].name = (el as HTMLInputElement).value;
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-deck-price').forEach(el => {
      el.addEventListener('input', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        d.decks[idx].price = num((el as HTMLInputElement).value, 0);
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-deck-cur').forEach(el => {
      el.addEventListener('change', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        d.decks[idx].currency = (el as HTMLSelectElement).value;
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-deck-desc').forEach(el => {
      el.addEventListener('input', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        d.decks[idx].desc = (el as HTMLTextAreaElement).value;
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-deck-open-gallery').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        this.openCardGalleryModal((cardName) => {
          if (!d.decks[idx].cards) d.decks[idx].cards = [];
          if (!d.decks[idx].cards.includes(cardName)) {
            d.decks[idx].cards.push(cardName);
            this.reRender();
          } else {
            this.showToast('Esta carta já está neste deck!');
          }
        });
      });
    });

    container.querySelectorAll('.store-deck-rmcard').forEach(btn => {
      btn.addEventListener('click', () => {
        const deck = d.decks[parseInt((btn as HTMLElement).dataset.idx!)];
        deck.cards.splice(parseInt((btn as HTMLElement).dataset.ci!), 1);
        this.reRender();
      });
    });

    // Moedas & Diamantes
    container.querySelectorAll('.store-coin-gold').forEach(el => {
      el.addEventListener('input', () => {
        d.coinPacks[parseInt((el as HTMLElement).dataset.idx!)].gold = num((el as HTMLInputElement).value, 0);
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-coin-price').forEach(el => {
      el.addEventListener('input', () => {
        d.coinPacks[parseInt((el as HTMLElement).dataset.idx!)].price = num((el as HTMLInputElement).value, 0);
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-gem-gems').forEach(el => {
      el.addEventListener('input', () => {
        d.gemPacks[parseInt((el as HTMLElement).dataset.idx!)].gems = num((el as HTMLInputElement).value, 0);
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-gem-price').forEach(el => {
      el.addEventListener('input', () => {
        d.gemPacks[parseInt((el as HTMLElement).dataset.idx!)].price = (el as HTMLInputElement).value;
        this.updateLivePreview(container);
      });
    });

    // Artefatos
    container.querySelector('#store-art-add')?.addEventListener('click', () => {
      d.artifacts.push({ id: this.skills[0]?.id || '', price: 5, currency: 'gems' });
      this.reRender();
    });

    container.querySelectorAll('.store-art-id').forEach(el => {
      el.addEventListener('change', () => {
        d.artifacts[parseInt((el as HTMLElement).dataset.idx!)].id = (el as HTMLSelectElement).value;
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-art-price').forEach(el => {
      el.addEventListener('input', () => {
        d.artifacts[parseInt((el as HTMLElement).dataset.idx!)].price = num((el as HTMLInputElement).value, 0);
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-art-cur').forEach(el => {
      el.addEventListener('change', () => {
        d.artifacts[parseInt((el as HTMLElement).dataset.idx!)].currency = (el as HTMLSelectElement).value;
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-art-del').forEach(btn => {
      btn.addEventListener('click', () => {
        d.artifacts.splice(parseInt((btn as HTMLElement).dataset.idx!), 1);
        this.reRender();
      });
    });

    // -----------------------------------------------------------------------
    // COLUNA 3: AÇÕES DO PREVIEW DA LOJA
    // -----------------------------------------------------------------------
    container.querySelector('#btn-refresh-store-preview')?.addEventListener('click', () => {
      this.updateLivePreview(container);
      this.showToast('Preview da loja atualizado!');
    });

    container.querySelector('#btn-preview-add-gold')?.addEventListener('click', () => {
      try {
        const bal = ProgressionManager.getPlayerData();
        bal.gold += 1000;
        ProgressionManager.savePlayerData(bal);
        this.updateLivePreview(container);
        this.showToast('+1.000 Ouro adicionado para testes!');
      } catch (_) {}
    });

    container.querySelector('#btn-preview-add-gems')?.addEventListener('click', () => {
      try {
        const bal = ProgressionManager.getPlayerData();
        bal.diamonds += 100;
        ProgressionManager.savePlayerData(bal);
        this.updateLivePreview(container);
        this.showToast('+100 Diamantes adicionados para testes!');
      } catch (_) {}
    });

    // -----------------------------------------------------------------------
    // BOTÃO SALVAR LOJA
    // -----------------------------------------------------------------------
    const saveBtn = container.querySelector('#btn-save-store') as HTMLButtonElement;
    saveBtn?.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'GRAVANDO...';
      try {
        localStorage.setItem('store_config_override', JSON.stringify(this.data));
      } catch (_) {}
      const ok = await this.saveJson('/api/save-store', this.data);
      if (ok) {
        saveBtn.textContent = '✅ GRAVADO!';
        this.showToast('Configuração da Loja gravada com sucesso!');
      } else {
        saveBtn.textContent = '✅ SALVO LOCAL!';
        this.showToast('Configuração da Loja gravada localmente!');
      }
      setTimeout(() => { saveBtn.disabled = false; saveBtn.textContent = '💾 SALVAR LOJA'; }, 2000);
    });
  }
}
