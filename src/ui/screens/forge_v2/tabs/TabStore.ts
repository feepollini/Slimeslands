import { StoreScreen } from '../../StoreScreen';

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
  legendary: number;
}

export interface StorePackCardGroups {
  common?: string[];
  rare?: string[];
  legendary?: string[];
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
  titles: { daily: string; rare: string; decks: string; packs: string; coins: string; gems: string; artifacts: string };
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

export const SECTION_METADATA: Record<string, { label: string; icon: string }> = {
  banners: { label: 'Banners Promocionais', icon: '🎞️' },
  daily: { label: 'Ofertas do Dia', icon: '☀️' },
  rare: { label: 'Cartas Raras', icon: '💎' },
  decks: { label: 'Decks Completos', icon: '🃏' },
  packs: { label: 'Boosters - Módulo 1 (Carrossel)', icon: '📦' },
  packs_split: { label: 'Boosters - Módulo 2 (Split Lateral)', icon: '🌓' },
  coins: { label: 'Moedas (Gold)', icon: '🪙' },
  gems: { label: 'Diamantes (Gems)', icon: '💎' },
  artifacts: { label: 'Artefatos de Habilidade', icon: '✨' },
};

// Normaliza uma vez e preenche campos faltantes
export function normalizeStoreData(input: any): StoreData {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    input.titles = { ...DEFAULT_TITLES, ...(input.titles || {}) };
    if (!Array.isArray(input.banners)) input.banners = [];
    if (!Array.isArray(input.dailyPool)) input.dailyPool = [];
    if (!Array.isArray(input.rare)) input.rare = [];
    if (!Array.isArray(input.decks)) input.decks = [];
    if (!Array.isArray(input.packs)) input.packs = [];
    if (!Array.isArray(input.coinPacks)) input.coinPacks = [];
    if (!Array.isArray(input.gemPacks)) input.gemPacks = [];
    if (!Array.isArray(input.artifacts)) input.artifacts = [];
    if (!Array.isArray(input.sectionOrder) || input.sectionOrder.length === 0) {
      input.sectionOrder = [...DEFAULT_SECTION_ORDER];
    } else if (!input.sectionOrder.includes('packs_split') && input.sectionVisibility?.packs_split !== false) {
      const pIdx = input.sectionOrder.indexOf('packs');
      if (pIdx !== -1) {
        input.sectionOrder.splice(pIdx + 1, 0, 'packs_split');
      } else {
        input.sectionOrder.push('packs_split');
      }
    }
    if (!input.sectionVisibility) input.sectionVisibility = {};
    if (input.sectionVisibility.packs_split === undefined) input.sectionVisibility.packs_split = true;
    if (!input.deckLayoutMode) input.deckLayoutMode = 'carousel';
    if (!input.boosterDisplayMode) input.boosterDisplayMode = 'carousel';
    return input as StoreData;
  }
  return {
    titles: { ...DEFAULT_TITLES },
    banners: [],
    dailyPool: [],
    rare: [],
    decks: [],
    packs: [],
    coinPacks: [{ gold: 1000, price: 10 }],
    gemPacks: [{ gems: 100, price: 'R$ 4,90' }],
    artifacts: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    sectionVisibility: {},
    deckLayoutMode: 'carousel',
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

  private static openAccordions: Set<string> = new Set(['order', 'layouts', 'packs', 'decks']);

  constructor(state: any, callbacks: any, core: any) {
    this.data = normalizeStoreData(state.storeItems);
    this.templates = state.templates || [];
    this.skills = state.skills || [];
    this.reRender = callbacks.reRender;
    this.showToast = callbacks.showToast;
    this.openMediaPicker = callbacks.openMediaPicker;
    this.saveJson = core.saveJson.bind(core);
  }

  private isOpen(acc: string): boolean {
    return TabStore.openAccordions.has(acc);
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

  public render(): string {
    const d = this.data;
    const currentOrder = d.sectionOrder || [...DEFAULT_SECTION_ORDER];
    const allAvailableKeys = Object.keys(SECTION_METADATA);
    const inactiveKeys = allAvailableKeys.filter(k => !currentOrder.includes(k));

    return `
      <div style="flex:1; display:flex; height:100%; overflow:hidden; font-family:'Outfit', sans-serif; background:#0b0d14;">
        
        <!-- ======================================================== -->
        <!-- PAINEL LATERAL ESQUERDO: CONTROLES & GESTÃO DA LOJA       -->
        <!-- ======================================================== -->
        <div style="width:420px; min-width:390px; max-width:440px; border-right:1px solid rgba(255,255,255,0.1); background:#0f111a; display:flex; flex-direction:column; overflow:hidden; z-index:10;">
          
          <!-- Top Bar Fixo da Barra Lateral -->
          <div style="padding:16px 18px; border-bottom:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.3); display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h2 style="margin:0; font-size:1.05rem; font-weight:900; letter-spacing:1.5px; color:#ffd700; display:flex; align-items:center; gap:8px;">
                <span>🏪</span> GESTÃO DA LOJA
              </h2>
              <p style="margin:2px 0 0 0; font-size:0.68rem; color:#888;">Configure ordem, layouts e produtos com preview ao vivo.</p>
            </div>
            <button id="btn-save-store" class="editor-btn-primary" style="font-size:0.75rem; font-weight:900; padding:8px 16px; white-space:nowrap;">
              💾 SALVAR
            </button>
          </div>

          <!-- Barra de Atalhos Rápidos para Seções da Forja -->
          <div style="display:flex; gap:6px; overflow-x:auto; padding:8px 14px; background:rgba(0,0,0,0.4); border-bottom:1px solid rgba(255,255,255,0.06); scrollbar-width:none; flex-shrink:0;">
            <button class="forge-store-jump-btn" data-target="packs" style="padding:4px 8px; border-radius:6px; font-size:0.62rem; font-weight:800; background:rgba(255,122,0,0.15); border:1px solid rgba(255,122,0,0.35); color:#ff9838; cursor:pointer; white-space:nowrap;">📦 Módulo 1 (Carrossel)</button>
            <button class="forge-store-jump-btn" data-target="packs_split" style="padding:4px 8px; border-radius:6px; font-size:0.62rem; font-weight:800; background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; cursor:pointer; white-space:nowrap;">🌓 Módulo 2 (Split)</button>
            <button class="forge-store-jump-btn" data-target="decks" style="padding:4px 8px; border-radius:6px; font-size:0.62rem; font-weight:800; background:rgba(168,85,247,0.15); border:1px solid rgba(168,85,247,0.35); color:#d8b4fe; cursor:pointer; white-space:nowrap;">🃏 Decks</button>
            <button class="forge-store-jump-btn" data-target="banners" style="padding:4px 8px; border-radius:6px; font-size:0.62rem; font-weight:800; background:rgba(255,215,0,0.15); border:1px solid rgba(255,215,0,0.35); color:#ffd700; cursor:pointer; white-space:nowrap;">🎞️ Banners</button>
            <button class="forge-store-jump-btn" data-target="daily" style="padding:4px 8px; border-radius:6px; font-size:0.62rem; font-weight:800; background:rgba(255,215,0,0.15); border:1px solid rgba(255,215,0,0.35); color:#ffd700; cursor:pointer; white-space:nowrap;">☀️ Diárias</button>
            <button class="forge-store-jump-btn" data-target="rare" style="padding:4px 8px; border-radius:6px; font-size:0.62rem; font-weight:800; background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; cursor:pointer; white-space:nowrap;">💎 Raras</button>
            <button class="forge-store-jump-btn" data-target="currencies" style="padding:4px 8px; border-radius:6px; font-size:0.62rem; font-weight:800; background:rgba(74,222,128,0.15); border:1px solid rgba(74,222,128,0.35); color:#4ade80; cursor:pointer; white-space:nowrap;">🪙 Moedas</button>
            <button class="forge-store-jump-btn" data-target="artifacts" style="padding:4px 8px; border-radius:6px; font-size:0.62rem; font-weight:800; background:rgba(216,180,254,0.15); border:1px solid rgba(216,180,254,0.35); color:#d8b4fe; cursor:pointer; white-space:nowrap;">✨ Artefatos</button>
            <button class="forge-store-jump-btn" data-target="order" style="padding:4px 8px; border-radius:6px; font-size:0.62rem; font-weight:800; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#ccc; cursor:pointer; white-space:nowrap;">🔀 Módulos</button>
          </div>

          <!-- Conteúdo Rolável dos Controles -->
          <div style="flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:14px;">

            <!-- 1. BLOCO: MÓDULOS DA VITRINE (ORDEM & GESTÃO) -->
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:14px; overflow:hidden;">
              <button class="store-accordion-toggle" data-acc="order" style="width:100%; padding:12px 14px; background:rgba(255,215,0,0.08); border:none; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; cursor:pointer; color:#ffd700; font-size:0.75rem; font-weight:900; letter-spacing:1px;">
                <span style="display:flex; align-items:center; gap:8px;">🔀 MÓDULOS DA VITRINE (ORDEM & GESTÃO)</span>
                <span class="acc-arrow">${this.isOpen('order') ? '▲' : '▼'}</span>
              </button>
              
              <div class="acc-body" style="padding:12px; display:${this.isOpen('order') ? 'flex' : 'none'}; flex-direction:column; gap:8px;">
                <div style="font-size:0.65rem; color:#aaa; margin-bottom:4px;">
                  Suba ▲ ou desça ▼ a posição do módulo, oculte 👁️, ou remova 🗑️ para tirar da vitrine.
                </div>
                ${currentOrder.map((key, idx) => {
                  const meta = SECTION_METADATA[key] || { label: key, icon: '📌' };
                  const isVisible = d.sectionVisibility?.[key] !== false;
                  return `
                    <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); padding:7px 10px; border-radius:10px; ${isVisible ? '' : 'opacity:0.5;'}">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:0.9rem;">${meta.icon}</span>
                        <span style="font-size:0.72rem; font-weight:700; color:#fff;">${meta.label}</span>
                      </div>
                      <div style="display:flex; align-items:center; gap:4px;">
                        <button class="btn-sec-move-up editor-btn-secondary" data-idx="${idx}" style="font-size:0.65rem; padding:4px 8px; ${idx === 0 ? 'opacity:0.3; pointer-events:none;' : ''}" title="Subir posição">▲</button>
                        <button class="btn-sec-move-down editor-btn-secondary" data-idx="${idx}" style="font-size:0.65rem; padding:4px 8px; ${idx === currentOrder.length - 1 ? 'opacity:0.3; pointer-events:none;' : ''}" title="Descer posição">▼</button>
                        <button class="btn-sec-toggle-vis editor-btn-secondary" data-key="${key}" style="font-size:0.65rem; padding:4px 8px; ${isVisible ? 'color:#4ade80;' : 'color:#ef4444;'}" title="${isVisible ? 'Ocultar na vitrine' : 'Exibir na vitrine'}">
                          ${isVisible ? '👁️' : '🚫'}
                        </button>
                        <button class="btn-sec-remove editor-btn-secondary" data-key="${key}" style="font-size:0.65rem; padding:4px 8px; color:#ef4444;" title="Remover módulo da vitrine">
                          🗑️
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}

                <!-- BLOCO ADICIONAR NOVO MÓDULO À VITRINE -->
                <div style="margin-top:8px; padding:10px; background:rgba(0,0,0,0.35); border:1px dashed rgba(255,255,255,0.15); border-radius:10px; display:flex; flex-direction:column; gap:8px;">
                  <div style="font-size:0.68rem; font-weight:800; color:#4ade80; display:flex; align-items:center; gap:6px;">
                    <span>➕</span> ADICIONAR NOVO MÓDULO À VITRINE:
                  </div>
                  ${inactiveKeys.length > 0 ? `
                    <div style="display:flex; gap:6px; align-items:center;">
                      <select id="select-add-module" class="editor-input" style="flex:1; font-size:0.68rem;">
                        ${inactiveKeys.map(k => `<option value="${k}">${SECTION_METADATA[k]?.icon || '📌'} ${SECTION_METADATA[k]?.label || k}</option>`).join('')}
                      </select>
                      <button id="btn-add-module" class="editor-btn-secondary" style="font-size:0.68rem; font-weight:900; color:#4ade80; border-color:rgba(74,222,128,0.4); padding:6px 12px; white-space:nowrap;">
                        + ADICIONAR
                      </button>
                    </div>
                  ` : `
                    <div style="font-size:0.62rem; color:#888;">Todos os módulos disponíveis já estão ativos na vitrine.</div>
                  `}
                  <button id="btn-restore-default-modules" class="editor-btn-secondary" style="font-size:0.62rem; color:#aaa; margin-top:2px;">
                    🔄 Restaurar Todos os Módulos Padrão
                  </button>
                </div>
              </div>
            </div>

            <!-- 2. BLOCO: LAYOUTS DOS DECKS & BOOSTERS -->
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:14px; overflow:hidden;">
              <button class="store-accordion-toggle" data-acc="layouts" style="width:100%; padding:12px 14px; background:rgba(56,189,248,0.08); border:none; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; cursor:pointer; color:#38bdf8; font-size:0.75rem; font-weight:900; letter-spacing:1px;">
                <span style="display:flex; align-items:center; gap:8px;">🎨 LAYOUTS DE DECKS & BOOSTERS</span>
                <span class="acc-arrow">${this.isOpen('layouts') ? '▲' : '▼'}</span>
              </button>

              <div class="acc-body" style="padding:14px; display:${this.isOpen('layouts') ? 'flex' : 'none'}; flex-direction:column; gap:14px;">
                <!-- LAYOUT DE DECKS -->
                <div style="display:flex; flex-direction:column; gap:6px;">
                  <span style="font-size:0.7rem; font-weight:900; color:#ffd700;">🃏 MODO DE EXIBIÇÃO DOS DECKS:</span>
                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                    <button id="btn-set-deck-mode-carousel" style="padding:8px; border-radius:8px; font-size:0.65rem; font-weight:900; cursor:pointer; transition:0.2s; border:1px solid ${d.deckLayoutMode === 'carousel' ? '#ffd700' : 'rgba(255,255,255,0.15)'}; ${d.deckLayoutMode === 'carousel' ? 'background:rgba(255,215,0,0.15); color:#ffd700;' : 'background:rgba(0,0,0,0.4); color:#aaa;'}">
                      🎠 Carrossel Unificado<br><span style="font-size:0.55rem; font-weight:normal; opacity:0.7;">(Navega na mesma seção)</span>
                    </button>
                    <button id="btn-set-deck-mode-standalone" style="padding:8px; border-radius:8px; font-size:0.65rem; font-weight:900; cursor:pointer; transition:0.2s; border:1px solid ${d.deckLayoutMode === 'standalone' ? '#a855f7' : 'rgba(255,255,255,0.15)'}; ${d.deckLayoutMode === 'standalone' ? 'background:rgba(168,85,247,0.15); color:#d8b4fe;' : 'background:rgba(0,0,0,0.4); color:#aaa;'}">
                      ⭐ Secções Independentes<br><span style="font-size:0.55rem; font-weight:normal; opacity:0.7;">(Cada deck em destaque próprio)</span>
                    </button>
                  </div>
                </div>

                <!-- MÓDULOS DE BOOSTERS (SEPARADOS NA VITRINE) -->
                <div style="display:flex; flex-direction:column; gap:6px; background:rgba(0,0,0,0.3); padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
                  <span style="font-size:0.7rem; font-weight:900; color:#38bdf8;">📦 MÓDULOS DE BOOSTERS (SEPARADOS NA VITRINE):</span>
                  <div style="font-size:0.62rem; color:#aaa; line-height:1.4;">
                    Ambos os modos funcionam como <b>módulos independentes</b> na loja. Você pode exibir ambos ao mesmo tempo ou ativar apenas um no bloco <b>Módulos da Vitrine</b> acima.
                  </div>
                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:4px;">
                    <div style="padding:8px; border-radius:8px; background:rgba(255,122,0,0.1); border:1px solid rgba(255,122,0,0.3); display:flex; flex-direction:column; gap:3px;">
                      <span style="font-size:0.68rem; font-weight:900; color:#ff9838;">📦 Módulo 1 (Carrossel)</span>
                      <span style="font-size:0.58rem; color:#ccc;">Carrossel 3D horizontal com 3 cartas e animação elegante.</span>
                      <span style="font-size:0.6rem; font-weight:700; color:${d.sectionOrder.includes('packs') && d.sectionVisibility?.packs !== false ? '#4ade80' : '#ef4444'};">
                        ${d.sectionOrder.includes('packs') && d.sectionVisibility?.packs !== false ? '● Ativo na Loja' : '○ Fora da Loja'}
                      </span>
                    </div>
                    <div style="padding:8px; border-radius:8px; background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.3); display:flex; flex-direction:column; gap:3px;">
                      <span style="font-size:0.68rem; font-weight:900; color:#38bdf8;">🌓 Módulo 2 (Split)</span>
                      <span style="font-size:0.58rem; color:#ccc;">Booster rígido à esquerda e seletores/detalhes à direita.</span>
                      <span style="font-size:0.6rem; font-weight:700; color:${d.sectionOrder.includes('packs_split') && d.sectionVisibility?.packs_split !== false ? '#4ade80' : '#ef4444'};">
                        ${d.sectionOrder.includes('packs_split') && d.sectionVisibility?.packs_split !== false ? '● Ativo na Loja' : '○ Fora da Loja'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 3. ACCORDION: MÓDULO 1 - BOOSTERS CARROSSEL -->
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:14px; overflow:hidden;">
              <button class="store-accordion-toggle" data-acc="packs" style="width:100%; padding:12px 14px; background:rgba(255,122,0,0.1); border:none; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; cursor:pointer; color:#ff7a00; font-size:0.75rem; font-weight:900; letter-spacing:1px;">
                <span style="display:flex; align-items:center; gap:8px;">📦 MÓDULO 1: BOOSTERS CARROSSEL (${d.packs.length})</span>
                <span class="acc-arrow">${this.isOpen('packs') ? '▲' : '▼'}</span>
              </button>
              <div class="acc-body" style="padding:12px; display:${this.isOpen('packs') ? 'flex' : 'none'}; flex-direction:column; gap:12px;">
                <div style="display:flex; flex-direction:column; gap:4px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06);">
                  <span style="font-size:0.68rem; font-weight:800; color:#ffd700;">Título da Seção na Vitrine:</span>
                  <input type="text" id="store-title-packs" class="editor-input" value="${this.esc((d.titles as any)?.packs || 'PACOTES & BOOSTERS (CARROSSEL)')}" style="font-size:0.72rem; font-weight:700;">
                </div>
                ${d.packs.map((pack, i) => `
                  <div style="background:rgba(0,0,0,0.45); border:1px solid rgba(255,122,0,0.25); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <input type="text" class="editor-input store-pack-name" data-idx="${i}" value="${this.esc(pack.name)}" placeholder="Nome do Booster" style="flex:1; font-size:0.75rem; font-weight:900; color:#ffd700;">
                      <button class="editor-btn-secondary store-pack-del" data-idx="${i}" style="font-size:0.65rem; padding:4px 8px; color:#ef4444; margin-left:6px;" title="Remover Booster">✕</button>
                    </div>

                    <div style="display:flex; gap:6px; align-items:center;">
                      <div style="flex:1; display:flex; align-items:center; gap:4px;">
                        <input type="number" class="editor-input store-pack-price" data-idx="${i}" value="${pack.price}" min="0" style="flex:1; font-size:0.68rem;" title="Preço">
                        <select class="editor-input store-pack-cur" data-idx="${i}" style="width:75px; font-size:0.65rem;">
                          <option value="gold" ${pack.currency !== 'gems' ? 'selected' : ''}>🪙 Ouro</option>
                          <option value="gems" ${pack.currency === 'gems' ? 'selected' : ''}>💎 Gemas</option>
                        </select>
                      </div>
                      <div style="flex:1; display:flex; align-items:center; gap:4px;">
                        <span style="font-size:0.62rem; color:#aaa;">Cartas:</span>
                        <input type="number" class="editor-input store-pack-count" data-idx="${i}" value="${pack.cardsCount || 3}" min="1" max="10" style="width:50px; font-size:0.68rem;" title="Qtd de cartas">
                      </div>
                    </div>

                    <textarea class="editor-input store-pack-desc" data-idx="${i}" rows="2" style="font-size:0.65rem;" placeholder="Descrição do booster...">${this.esc(pack.desc || '')}</textarea>

                    <!-- Capa / Imagem Frontal & Tema -->
                    <div style="display:flex; gap:8px; align-items:center;">
                      <div style="width:42px; height:56px; border-radius:4px; overflow:hidden; background:#000; border:1px solid rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        ${pack.customFront ? `<img src="${pack.customFront}" style="width:100%; height:100%; object-fit:cover;" />` : `<span style="font-size:0.6rem; color:#666;">Sem capa</span>`}
                      </div>
                      <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                        <div style="display:flex; gap:4px;">
                          <button class="editor-btn-secondary store-pack-front-pick" data-idx="${i}" style="flex:1; font-size:0.62rem; padding:4px 6px;">🖼️ Escolher Imagem</button>
                          ${pack.customFront ? `<button class="editor-btn-secondary store-pack-front-clear" data-idx="${i}" style="font-size:0.62rem; padding:4px 6px; color:#ef4444;">✕</button>` : ''}
                        </div>
                        <select class="editor-input store-pack-theme" data-idx="${i}" style="font-size:0.65rem;">
                          <option value="charizard" ${(pack.theme || 'charizard') === 'charizard' ? 'selected' : ''}>🔥 Fogo / Dragão (Charizard)</option>
                          <option value="winter" ${pack.theme === 'winter' ? 'selected' : ''}>❄️ Gelo / Inverno (Winter)</option>
                          <option value="mewtwo" ${pack.theme === 'mewtwo' ? 'selected' : ''}>🔮 Arcano / Psíquico (Mewtwo)</option>
                        </select>
                      </div>
                    </div>

                    <!-- Taxas de Drop % -->
                    <div style="display:flex; gap:6px; align-items:center; background:rgba(0,0,0,0.3); padding:6px; border-radius:6px;">
                      <span style="font-size:0.6rem; color:#aaa; font-weight:700;">RATES:</span>
                      <div style="flex:1; display:flex; align-items:center; gap:2px;">
                        <span style="font-size:0.58rem; color:#cbd5e1;">Comum %:</span>
                        <input type="number" class="editor-input store-pack-rate-common" data-idx="${i}" value="${pack.rates?.common ?? 70}" min="0" max="100" style="width:40px; font-size:0.62rem; padding:2px;">
                      </div>
                      <div style="flex:1; display:flex; align-items:center; gap:2px;">
                        <span style="font-size:0.58rem; color:#38bdf8;">Rara %:</span>
                        <input type="number" class="editor-input store-pack-rate-rare" data-idx="${i}" value="${pack.rates?.rare ?? 25}" min="0" max="100" style="width:40px; font-size:0.62rem; padding:2px;">
                      </div>
                      <div style="flex:1; display:flex; align-items:center; gap:2px;">
                        <span style="font-size:0.58rem; color:#fbbf24;">Lend %:</span>
                        <input type="number" class="editor-input store-pack-rate-leg" data-idx="${i}" value="${pack.rates?.legendary ?? 5}" min="0" max="100" style="width:40px; font-size:0.62rem; padding:2px;">
                      </div>
                    </div>

                    <!-- Visibilidade / Publicado -->
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.65rem; color:#aaa; cursor:pointer;">
                      <input type="checkbox" class="store-pack-pub" data-idx="${i}" ${pack.published !== false ? 'checked' : ''}>
                      <span>Exibir na Vitrine da Loja</span>
                    </label>
                  </div>
                `).join('')}
                <button id="store-pack-add" class="editor-btn-secondary" style="font-size:0.68rem; color:#ff7a00; border-color:rgba(255,122,0,0.4);">+ NOVO BOOSTER</button>
              </div>
            </div>

            <!-- 3.1 ACCORDION: MÓDULO 2 - BOOSTERS SPLIT LATERAL -->
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:14px; overflow:hidden;">
              <button class="store-accordion-toggle" data-acc="packs_split" style="width:100%; padding:12px 14px; background:rgba(56,189,248,0.1); border:none; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; cursor:pointer; color:#38bdf8; font-size:0.75rem; font-weight:900; letter-spacing:1px;">
                <span style="display:flex; align-items:center; gap:8px;">🌓 MÓDULO 2: BOOSTERS SPLIT LATERAL</span>
                <span class="acc-arrow">${this.isOpen('packs_split') ? '▲' : '▼'}</span>
              </button>
              <div class="acc-body" style="padding:12px; display:${this.isOpen('packs_split') ? 'flex' : 'none'}; flex-direction:column; gap:10px;">
                <div style="font-size:0.65rem; color:#aaa; line-height:1.4;">
                  O Módulo 2 destaca o booster com visual rígido à esquerda e os controles e compra à direita.
                </div>

                <div style="display:flex; flex-direction:column; gap:4px;">
                  <span style="font-size:0.68rem; font-weight:800; color:#ffd700;">Título da Seção na Vitrine:</span>
                  <input type="text" id="store-title-packs-split" class="editor-input" value="${this.esc((d.titles as any)?.packs_split || 'DESTAQUES ESPECIAIS (SPLIT)')}" style="font-size:0.72rem; font-weight:700;">
                </div>

                <div style="padding:10px; background:rgba(0,0,0,0.4); border-radius:8px; border:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-size:0.7rem; font-weight:900; color:#fff;">Status na Vitrine:</div>
                    <div style="font-size:0.62rem; font-weight:700; color:${d.sectionOrder.includes('packs_split') && d.sectionVisibility?.packs_split !== false ? '#4ade80' : '#ef4444'};">
                      ${d.sectionOrder.includes('packs_split') && d.sectionVisibility?.packs_split !== false ? '✅ Ativo e visível na loja' : '🚫 Fora da vitrine ou oculto'}
                    </div>
                  </div>
                  <button id="btn-toggle-packs-split-module" class="editor-btn-secondary" style="font-size:0.68rem; font-weight:800;">
                    ${d.sectionOrder.includes('packs_split') && d.sectionVisibility?.packs_split !== false ? '🗑️ Remover da Loja' : '➕ Ativar na Loja'}
                  </button>
                </div>
              </div>
            </div>

            <!-- 4. ACCORDION: BANNERS -->
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:14px; overflow:hidden;">
              <button class="store-accordion-toggle" data-acc="banners" style="width:100%; padding:12px 14px; background:rgba(255,255,255,0.05); border:none; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; cursor:pointer; color:#ffd700; font-size:0.75rem; font-weight:900;">
                <span style="display:flex; align-items:center; gap:8px;">🎞️ BANNERS PROMOCIONAIS (${d.banners.length}/3)</span>
                <span class="acc-arrow">${this.isOpen('banners') ? '▲' : '▼'}</span>
              </button>
              <div class="acc-body" style="padding:12px; display:${this.isOpen('banners') ? 'flex' : 'none'}; flex-direction:column; gap:10px;">
                ${[0, 1, 2].map(i => `
                  <div style="display:flex; gap:10px; align-items:center;">
                    <div style="flex:1; aspect-ratio:1080/380; border-radius:8px; overflow:hidden; background:rgba(0,0,0,0.5); border:1px dashed rgba(255,255,255,0.2); ${d.banners[i] ? `background-image:url('${d.banners[i]}'); background-size:cover; background-position:center; border-style:solid;` : ''} display:flex; align-items:center; justify-content:center; color:#777; font-size:0.65rem;">
                      ${d.banners[i] ? '' : `BANNER ${i + 1}`}
                    </div>
                    <div style="display:flex; gap:4px;">
                      <button class="editor-btn-secondary store-banner-pick" data-idx="${i}" style="font-size:0.62rem; padding:6px 10px;">🖼️</button>
                      ${d.banners[i] ? `<button class="editor-btn-secondary store-banner-del" data-idx="${i}" style="font-size:0.62rem; padding:6px 10px; color:#ef4444;">✕</button>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- 5. ACCORDION: OFERTAS DO DIA -->
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:14px; overflow:hidden;">
              <button class="store-accordion-toggle" data-acc="daily" style="width:100%; padding:12px 14px; background:rgba(255,255,255,0.05); border:none; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; cursor:pointer; color:#ffd700; font-size:0.75rem; font-weight:900;">
                <span style="display:flex; align-items:center; gap:8px;">☀️ OFERTAS DO DIA (${d.dailyPool.length})</span>
                <span class="acc-arrow">${this.isOpen('daily') ? '▲' : '▼'}</span>
              </button>
              <div class="acc-body" style="padding:12px; display:${this.isOpen('daily') ? 'flex' : 'none'}; flex-direction:column; gap:8px;">
                ${d.dailyPool.map((o, i) => `
                  <div style="display:flex; gap:6px; align-items:center;">
                    <select class="editor-input store-daily-card" data-idx="${i}" style="flex:2; font-size:0.68rem;">${this.cardOptions(o.card)}</select>
                    <input type="number" class="editor-input store-daily-price" data-idx="${i}" value="${o.price}" min="0" style="flex:1; font-size:0.68rem;" title="Moedas">
                    <span style="font-size:0.75rem;">🪙</span>
                    <button class="editor-btn-secondary store-daily-del" data-idx="${i}" style="font-size:0.65rem; padding:5px 8px; color:#ef4444;">✕</button>
                  </div>
                `).join('')}
                <button id="store-daily-add" class="editor-btn-secondary" style="font-size:0.68rem; margin-top:4px;">+ ADICIONAR CARTA DIÁRIA</button>
              </div>
            </div>

            <!-- 6. ACCORDION: CARTAS RARAS -->
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:14px; overflow:hidden;">
              <button class="store-accordion-toggle" data-acc="rare" style="width:100%; padding:12px 14px; background:rgba(255,255,255,0.05); border:none; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; cursor:pointer; color:#38bdf8; font-size:0.75rem; font-weight:900;">
                <span style="display:flex; align-items:center; gap:8px;">💎 CARTAS RARAS (${d.rare.length})</span>
                <span class="acc-arrow">${this.isOpen('rare') ? '▲' : '▼'}</span>
              </button>
              <div class="acc-body" style="padding:12px; display:${this.isOpen('rare') ? 'flex' : 'none'}; flex-direction:column; gap:8px;">
                ${d.rare.map((o, i) => `
                  <div style="display:flex; gap:6px; align-items:center;">
                    <select class="editor-input store-rare-card" data-idx="${i}" style="flex:2; font-size:0.68rem;">${this.cardOptions(o.card)}</select>
                    <input type="number" class="editor-input store-rare-price" data-idx="${i}" value="${o.price}" min="0" style="flex:1; font-size:0.68rem;" title="Diamantes">
                    <span style="font-size:0.75rem;">💎</span>
                    <button class="editor-btn-secondary store-rare-del" data-idx="${i}" style="font-size:0.65rem; padding:5px 8px; color:#ef4444;">✕</button>
                  </div>
                `).join('')}
                <button id="store-rare-add" class="editor-btn-secondary" style="font-size:0.68rem; margin-top:4px;">+ ADICIONAR CARTA RARA</button>
              </div>
            </div>

            <!-- 7. ACCORDION: DECKS COMPLETOS -->
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:14px; overflow:hidden;">
              <button class="store-accordion-toggle" data-acc="decks" style="width:100%; padding:12px 14px; background:rgba(168,85,247,0.08); border:none; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; cursor:pointer; color:#d8b4fe; font-size:0.75rem; font-weight:900;">
                <span style="display:flex; align-items:center; gap:8px;">🃏 DECKS COMPLETOS (${d.decks.length})</span>
                <span class="acc-arrow">${this.isOpen('decks') ? '▲' : '▼'}</span>
              </button>
              <div class="acc-body" style="padding:12px; display:${this.isOpen('decks') ? 'flex' : 'none'}; flex-direction:column; gap:12px;">
                ${d.decks.map((deck, i) => `
                  <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:6px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <input type="text" class="editor-input store-deck-name" data-idx="${i}" value="${this.esc(deck.name)}" style="flex:1; font-size:0.72rem; font-weight:900; color:#ffd700;">
                      <button class="editor-btn-secondary store-deck-del" data-idx="${i}" style="font-size:0.65rem; padding:4px 8px; color:#ef4444; margin-left:6px;">✕</button>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                      <input type="number" class="editor-input store-deck-price" data-idx="${i}" value="${deck.price}" min="0" style="flex:1; font-size:0.68rem;" title="Preço">
                      <select class="editor-input store-deck-cur" data-idx="${i}" style="width:75px; font-size:0.65rem;">
                        <option value="gold" ${deck.currency !== 'gems' ? 'selected' : ''}>🪙 Ouro</option>
                        <option value="gems" ${deck.currency === 'gems' ? 'selected' : ''}>💎 Gemas</option>
                      </select>
                    </div>
                    <textarea class="editor-input store-deck-desc" data-idx="${i}" rows="1" style="font-size:0.65rem;" placeholder="Descrição do deck...">${this.esc(deck.desc || '')}</textarea>
                    
                    <!-- Cartas do Deck -->
                    <div style="font-size:0.62rem; color:#aaa; font-weight:700; margin-top:2px;">
                      Cartas no deck: ${(deck.cards || []).length}
                    </div>
                    <div style="display:flex; gap:4px; flex-wrap:wrap; max-height:80px; overflow-y:auto;">
                      ${(deck.cards || []).map((c, ci) => `
                        <span style="font-size:0.58rem; background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:6px; display:flex; align-items:center; gap:4px;">
                          ${this.esc(c)}
                          <b class="store-deck-rmcard" data-idx="${i}" data-ci="${ci}" style="cursor:pointer; color:#ef4444;">✕</b>
                        </span>
                      `).join('')}
                    </div>
                    <select class="editor-input store-deck-addcard" data-idx="${i}" style="font-size:0.65rem; margin-top:2px;">
                      <option value="">+ Adicionar carta ao deck...</option>
                      ${this.cardOptions('')}
                    </select>
                  </div>
                `).join('')}
                <button id="store-deck-add" class="editor-btn-secondary" style="font-size:0.68rem;">+ NOVO DECK</button>
              </div>
            </div>

            <!-- 8. ACCORDION: MOEDAS & DIAMANTES -->
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:14px; overflow:hidden;">
              <button class="store-accordion-toggle" data-acc="currencies" style="width:100%; padding:12px 14px; background:rgba(74,222,128,0.08); border:none; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; cursor:pointer; color:#4ade80; font-size:0.75rem; font-weight:900;">
                <span style="display:flex; align-items:center; gap:8px;">🪙 MOEDAS & DIAMANTES</span>
                <span class="acc-arrow">${this.isOpen('currencies') ? '▲' : '▼'}</span>
              </button>
              <div class="acc-body" style="padding:12px; display:${this.isOpen('currencies') ? 'flex' : 'none'}; flex-direction:column; gap:12px;">
                <!-- Moedas -->
                <div>
                  <span style="font-size:0.68rem; font-weight:900; color:#ffd700;">PACOTES DE MOEDAS:</span>
                  ${d.coinPacks.map((p, i) => `
                    <div style="display:flex; gap:6px; align-items:center; margin-top:4px;">
                      <input type="number" class="editor-input store-coin-gold" data-idx="${i}" value="${p.gold}" style="flex:2; font-size:0.65rem;" title="Ouro">
                      <span style="font-size:0.7rem;">🪙 por</span>
                      <input type="number" class="editor-input store-coin-price" data-idx="${i}" value="${p.price}" style="flex:1; font-size:0.65rem;" title="Preço em Gemas">
                      <span style="font-size:0.7rem;">💎</span>
                      <button class="editor-btn-secondary store-coin-del" data-idx="${i}" style="font-size:0.6rem; padding:4px 6px; color:#ef4444;">✕</button>
                    </div>
                  `).join('')}
                </div>
                <!-- Diamantes -->
                <div>
                  <span style="font-size:0.68rem; font-weight:900; color:#7ee7ff;">PACOTES DE DIAMANTES:</span>
                  ${d.gemPacks.map((p, i) => `
                    <div style="display:flex; gap:6px; align-items:center; margin-top:4px;">
                      <input type="number" class="editor-input store-gem-amount" data-idx="${i}" value="${p.gems}" style="flex:2; font-size:0.65rem;" title="Gemas">
                      <span style="font-size:0.7rem;">💎 por</span>
                      <input type="text" class="editor-input store-gem-price" data-idx="${i}" value="${this.esc(p.price)}" style="flex:2; font-size:0.65rem;" title="Preço R$">
                      <button class="editor-btn-secondary store-gem-del" data-idx="${i}" style="font-size:0.6rem; padding:4px 6px; color:#ef4444;">✕</button>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- 9. ACCORDION: ARTEFATOS -->
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:14px; overflow:hidden;">
              <button class="store-accordion-toggle" data-acc="artifacts" style="width:100%; padding:12px 14px; background:rgba(216,180,254,0.08); border:none; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; cursor:pointer; color:#d8b4fe; font-size:0.75rem; font-weight:900;">
                <span style="display:flex; align-items:center; gap:8px;">✨ ARTEFATOS (${d.artifacts.length})</span>
                <span class="acc-arrow">${this.isOpen('artifacts') ? '▲' : '▼'}</span>
              </button>
              <div class="acc-body" style="padding:12px; display:${this.isOpen('artifacts') ? 'flex' : 'none'}; flex-direction:column; gap:8px;">
                ${d.artifacts.map((o, i) => `
                  <div style="display:flex; gap:6px; align-items:center;">
                    <select class="editor-input store-art-id" data-idx="${i}" style="flex:2; font-size:0.68rem;">${this.skillOptions(o.id)}</select>
                    <input type="number" class="editor-input store-art-price" data-idx="${i}" value="${o.price}" min="0" style="flex:1; font-size:0.68rem;">
                    <select class="editor-input store-art-cur" data-idx="${i}" style="width:75px; font-size:0.65rem;">
                      <option value="gold" ${o.currency !== 'gems' ? 'selected' : ''}>🪙 Ouro</option>
                      <option value="gems" ${o.currency === 'gems' ? 'selected' : ''}>💎 Gemas</option>
                    </select>
                    <button class="editor-btn-secondary store-art-del" data-idx="${i}" style="font-size:0.65rem; padding:4px 6px; color:#ef4444;">✕</button>
                  </div>
                `).join('')}
                <button id="store-art-add" class="editor-btn-secondary" style="font-size:0.68rem; margin-top:4px;">+ ADICIONAR ARTEFATO</button>
              </div>
            </div>

          </div>
        </div>

        <!-- ======================================================== -->
        <!-- PAINEL PRINCIPAL DIREITO: PREVIEW REAL DA LOJA (AO VIVO)  -->
        <!-- ======================================================== -->
        <div style="flex:1; display:flex; flex-direction:column; background:#07080c; overflow:hidden; position:relative;">
          <!-- Barra Superior do Preview -->
          <div style="padding:10px 18px; background:rgba(0,0,0,0.5); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; z-index:10;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:0.9rem;">📱</span>
              <span style="font-size:0.75rem; font-weight:900; color:#e2e8f0; letter-spacing:1px;">
                PRÉ-VISUALIZAÇÃO REAL DA VITRINE (AO VIVO)
              </span>
              <span style="font-size:0.62rem; color:#4ade80; background:rgba(74,222,128,0.15); border:1px solid rgba(74,222,128,0.3); padding:2px 8px; border-radius:999px;">
                Sincronizado
              </span>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              <button id="btn-refresh-store-preview" class="editor-btn-secondary" style="font-size:0.68rem; padding:6px 12px;">
                🔄 Atualizar
              </button>
              <a href="store.html" target="_blank" class="editor-btn-secondary" style="font-size:0.68rem; padding:6px 12px; text-decoration:none; display:inline-flex; align-items:center; gap:4px; color:#38bdf8; border-color:#38bdf8;">
                <span>🔗 Abrir Tela Inteira</span>
              </a>
            </div>
          </div>

          <!-- Container da StoreScreen Emulada (PROPORCIONAL À TELA DE UM CELULAR) -->
          <div id="store-live-emulator-wrapper" style="flex:1; overflow-y:auto; display:flex; justify-content:center; align-items:flex-start; padding:24px 16px; background:radial-gradient(circle at center, #111420 0%, #06070a 100%);">
            <div id="store-live-emulator-device" style="width:395px; max-width:100%; height:820px; max-height:calc(100vh - 120px); border:12px solid #161922; border-radius:48px; background:#0b0d14; overflow:hidden; box-shadow:0 25px 60px rgba(0,0,0,0.95), 0 0 0 2px rgba(255,255,255,0.08), inset 0 0 0 2px rgba(0,0,0,0.8); display:flex; flex-direction:column; position:relative; flex-shrink:0;">
              
              <!-- Dynamic Island / Top Notch do Celular -->
              <div style="width:100%; height:28px; background:#000; display:flex; align-items:center; justify-content:center; flex-shrink:0; z-index:40; position:relative;">
                <div style="width:110px; height:18px; background:#111216; border-radius:20px; display:flex; align-items:center; justify-content:flex-end; padding:0 8px; border:1px solid rgba(255,255,255,0.08);">
                  <div style="width:7px; height:7px; border-radius:50%; background:#1c2538; border:1px solid #2b3a55;"></div>
                </div>
              </div>

              <!-- Container onde a StoreScreen roda diretamente (Scroll da Loja no Celular) -->
              <div id="store-live-preview-content" style="flex:1; display:flex; flex-direction:column; overflow-y:auto; overflow-x:hidden; background:#0b0d14;"></div>

              <!-- Home Indicator do Celular -->
              <div style="width:100%; height:18px; background:#000; display:flex; align-items:center; justify-content:center; flex-shrink:0; z-index:40;">
                <div style="width:120px; height:4px; background:rgba(255,255,255,0.3); border-radius:10px;"></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  public bind(container: HTMLElement) {
    const d = this.data;
    const num = (v: string, fb: number) => {
      const n = parseInt(v);
      return isNaN(n) ? fb : Math.max(0, n);
    };

    // Inicializa o Preview Real da Loja
    this.updateLivePreview(container);

    // Accordions (Alterna no DOM direto sem recriar componente ou fechar os outros)
    container.querySelectorAll('.store-accordion-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const acc = (btn as HTMLElement).dataset.acc || '';
        if (!acc) return;
        const body = btn.nextElementSibling as HTMLElement | null;
        const arrow = btn.querySelector('.acc-arrow');
        if (TabStore.openAccordions.has(acc)) {
          TabStore.openAccordions.delete(acc);
          if (body) body.style.display = 'none';
          if (arrow) arrow.textContent = '▼';
        } else {
          TabStore.openAccordions.add(acc);
          if (body) body.style.display = 'flex';
          if (arrow) arrow.textContent = '▲';
        }
      });
    });

    // Reordenar Secções: Subir ▲
    container.querySelectorAll('.btn-sec-move-up').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
        if (idx > 0 && d.sectionOrder) {
          const item = d.sectionOrder.splice(idx, 1)[0];
          d.sectionOrder.splice(idx - 1, 0, item);
          this.reRender();
        }
      });
    });

    // Reordenar Secções: Descer ▼
    container.querySelectorAll('.btn-sec-move-down').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
        if (d.sectionOrder && idx < d.sectionOrder.length - 1) {
          const item = d.sectionOrder.splice(idx, 1)[0];
          d.sectionOrder.splice(idx + 1, 0, item);
          this.reRender();
        }
      });
    });

    // Alternar Visibilidade da Secção 👁️
    container.querySelectorAll('.btn-sec-toggle-vis').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.key || '';
        if (key) {
          if (!d.sectionVisibility) d.sectionVisibility = {};
          d.sectionVisibility[key] = !(d.sectionVisibility[key] !== false);
          this.reRender();
        }
      });
    });

    // Remover Módulo da Vitrine 🗑️
    container.querySelectorAll('.btn-sec-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.key || '';
        if (key && d.sectionOrder) {
          const idx = d.sectionOrder.indexOf(key);
          if (idx !== -1) {
            d.sectionOrder.splice(idx, 1);
            if (d.sectionVisibility) d.sectionVisibility[key] = false;
            this.reRender();
            this.showToast(`Módulo "${SECTION_METADATA[key]?.label || key}" removido da vitrine!`);
          }
        }
      });
    });

    // Adicionar Módulo à Vitrine ➕
    container.querySelector('#btn-add-module')?.addEventListener('click', () => {
      const select = container.querySelector('#select-add-module') as HTMLSelectElement | null;
      const key = select?.value;
      if (key) {
        if (!d.sectionOrder) d.sectionOrder = [];
        if (!d.sectionOrder.includes(key)) {
          d.sectionOrder.push(key);
        }
        if (!d.sectionVisibility) d.sectionVisibility = {};
        d.sectionVisibility[key] = true;
        this.reRender();
        this.showToast(`Módulo "${SECTION_METADATA[key]?.label || key}" adicionado à vitrine!`);
      }
    });

    // Restaurar Módulos Padrão 🔄
    container.querySelector('#btn-restore-default-modules')?.addEventListener('click', () => {
      d.sectionOrder = [...DEFAULT_SECTION_ORDER];
      if (!d.sectionVisibility) d.sectionVisibility = {};
      DEFAULT_SECTION_ORDER.forEach(k => {
        d.sectionVisibility![k] = true;
      });
      this.reRender();
      this.showToast('Módulos restaurados para o padrão!');
    });

    // Layout dos Decks: Carrossel vs Standalone
    container.querySelector('#btn-set-deck-mode-carousel')?.addEventListener('click', () => {
      d.deckLayoutMode = 'carousel';
      this.reRender();
    });
    container.querySelector('#btn-set-deck-mode-standalone')?.addEventListener('click', () => {
      d.deckLayoutMode = 'standalone';
      this.reRender();
    });

    // Título do Módulo 1 (Carrossel) na Vitrine
    container.querySelector('#store-title-packs')?.addEventListener('input', (e) => {
      if (!d.titles) d.titles = {} as any;
      (d.titles as any).packs = (e.target as HTMLInputElement).value;
      this.updateLivePreview(container);
    });

    // Título do Módulo 2 (Split Lateral) na Vitrine
    container.querySelector('#store-title-packs-split')?.addEventListener('input', (e) => {
      if (!d.titles) d.titles = {} as any;
      (d.titles as any).packs_split = (e.target as HTMLInputElement).value;
      this.updateLivePreview(container);
    });

    // Ativar ou Remover Módulo 2 (Split) da Vitrine
    container.querySelector('#btn-toggle-packs-split-module')?.addEventListener('click', () => {
      if (!d.sectionOrder) d.sectionOrder = [];
      const has = d.sectionOrder.includes('packs_split');
      if (has) {
        const idx = d.sectionOrder.indexOf('packs_split');
        d.sectionOrder.splice(idx, 1);
        if (!d.sectionVisibility) d.sectionVisibility = {};
        d.sectionVisibility['packs_split'] = false;
        this.showToast('Módulo 2 (Split) removido da vitrine!');
      } else {
        d.sectionOrder.push('packs_split');
        if (!d.sectionVisibility) d.sectionVisibility = {};
        d.sectionVisibility['packs_split'] = true;
        this.showToast('Módulo 2 (Split) adicionado à vitrine!');
      }
      this.reRender();
    });

    // Atalhos Rápidos da Barra Superior
    container.querySelectorAll('.forge-store-jump-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = (btn as HTMLElement).dataset.target || '';
        if (!target) return;
        TabStore.openAccordions.add(target);
        const toggleBtn = container.querySelector(`.store-accordion-toggle[data-acc="${target}"]`) as HTMLElement | null;
        if (toggleBtn) {
          const body = toggleBtn.nextElementSibling as HTMLElement | null;
          const arrow = toggleBtn.querySelector('.acc-arrow');
          if (body) body.style.display = 'flex';
          if (arrow) arrow.textContent = '▲';
          toggleBtn.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Atualizar Preview Manualmente
    container.querySelector('#btn-refresh-store-preview')?.addEventListener('click', () => {
      this.updateLivePreview(container);
      this.showToast('Preview da loja atualizado!');
    });

    // =========================================================================
    // BOOSTERS / PACOTES
    // =========================================================================
    container.querySelector('#store-pack-add')?.addEventListener('click', () => {
      d.packs.push({
        id: 'booster_' + Date.now(),
        name: 'Novo Booster',
        desc: 'Pacote especial com 3 cartas.',
        price: 100,
        currency: 'gold',
        cardsCount: 3,
        mode: 'random',
        rates: { common: 70, rare: 25, legendary: 5 },
        theme: 'charizard',
        published: true
      });
      this.reRender();
    });

    container.querySelectorAll('.store-pack-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        d.packs.splice(idx, 1);
        this.reRender();
      });
    });

    container.querySelectorAll('.store-pack-name').forEach(el => {
      el.addEventListener('input', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        d.packs[idx].name = (el as HTMLInputElement).value;
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-pack-price').forEach(el => {
      el.addEventListener('input', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        d.packs[idx].price = num((el as HTMLInputElement).value, 0);
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-pack-cur').forEach(el => {
      el.addEventListener('change', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        d.packs[idx].currency = (el as HTMLSelectElement).value;
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-pack-count').forEach(el => {
      el.addEventListener('input', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        d.packs[idx].cardsCount = num((el as HTMLInputElement).value, 3);
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-pack-desc').forEach(el => {
      el.addEventListener('input', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        d.packs[idx].desc = (el as HTMLTextAreaElement).value;
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-pack-theme').forEach(el => {
      el.addEventListener('change', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        d.packs[idx].theme = (el as HTMLSelectElement).value;
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-pack-front-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        this.openMediaPicker(url => {
          d.packs[idx].customFront = url;
          this.reRender();
        });
      });
    });

    container.querySelectorAll('.store-pack-front-clear').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        d.packs[idx].customFront = undefined;
        this.reRender();
      });
    });

    container.querySelectorAll('.store-pack-rate-common').forEach(el => {
      el.addEventListener('input', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        if (!d.packs[idx].rates) d.packs[idx].rates = { common: 70, rare: 25, legendary: 5 };
        d.packs[idx].rates!.common = num((el as HTMLInputElement).value, 70);
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-pack-rate-rare').forEach(el => {
      el.addEventListener('input', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        if (!d.packs[idx].rates) d.packs[idx].rates = { common: 70, rare: 25, legendary: 5 };
        d.packs[idx].rates!.rare = num((el as HTMLInputElement).value, 25);
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-pack-rate-leg').forEach(el => {
      el.addEventListener('input', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        if (!d.packs[idx].rates) d.packs[idx].rates = { common: 70, rare: 25, legendary: 5 };
        d.packs[idx].rates!.legendary = num((el as HTMLInputElement).value, 5);
        this.updateLivePreview(container);
      });
    });

    container.querySelectorAll('.store-pack-pub').forEach(el => {
      el.addEventListener('change', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        d.packs[idx].published = (el as HTMLInputElement).checked;
        this.updateLivePreview(container);
      });
    });

    // Banners
    container.querySelectorAll('.store-banner-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt((btn as HTMLElement).dataset.idx!);
        this.openMediaPicker(url => {
          d.banners[i] = url;
          this.reRender();
        });
      });
    });
    container.querySelectorAll('.store-banner-del').forEach(btn => {
      btn.addEventListener('click', () => {
        d.banners.splice(parseInt((btn as HTMLElement).dataset.idx!), 1);
        this.reRender();
      });
    });

    // Diária
    container.querySelector('#store-daily-add')?.addEventListener('click', () => {
      d.dailyPool.push({ card: this.templates[0]?.name || '', price: 100 });
      this.reRender();
    });
    container.querySelectorAll('.store-daily-card').forEach(el => {
      el.addEventListener('change', () => {
        d.dailyPool[parseInt((el as HTMLElement).dataset.idx!)].card = (el as HTMLSelectElement).value;
        this.updateLivePreview(container);
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

    // Raras
    container.querySelector('#store-rare-add')?.addEventListener('click', () => {
      d.rare.push({ card: this.templates[0]?.name || '', price: 5 });
      this.reRender();
    });
    container.querySelectorAll('.store-rare-card').forEach(el => {
      el.addEventListener('change', () => {
        d.rare[parseInt((el as HTMLElement).dataset.idx!)].card = (el as HTMLSelectElement).value;
        this.updateLivePreview(container);
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

    // Decks
    container.querySelector('#store-deck-add')?.addEventListener('click', () => {
      d.decks.push({ id: 'deck_' + Date.now(), name: 'Novo Deck', price: 500, currency: 'gold', desc: '', image: '', cards: [] });
      this.reRender();
    });
    container.querySelectorAll('.store-deck-del').forEach(btn => {
      btn.addEventListener('click', () => {
        d.decks.splice(parseInt((btn as HTMLElement).dataset.idx!), 1);
        this.reRender();
      });
    });
    container.querySelectorAll('.store-deck-name').forEach(el => {
      el.addEventListener('input', () => {
        d.decks[parseInt((el as HTMLElement).dataset.idx!)].name = (el as HTMLInputElement).value;
        this.updateLivePreview(container);
      });
    });
    container.querySelectorAll('.store-deck-price').forEach(el => {
      el.addEventListener('input', () => {
        d.decks[parseInt((el as HTMLElement).dataset.idx!)].price = num((el as HTMLInputElement).value, 0);
        this.updateLivePreview(container);
      });
    });
    container.querySelectorAll('.store-deck-cur').forEach(el => {
      el.addEventListener('change', () => {
        d.decks[parseInt((el as HTMLElement).dataset.idx!)].currency = (el as HTMLSelectElement).value;
        this.updateLivePreview(container);
      });
    });
    container.querySelectorAll('.store-deck-desc').forEach(el => {
      el.addEventListener('input', () => {
        d.decks[parseInt((el as HTMLElement).dataset.idx!)].desc = (el as HTMLTextAreaElement).value;
        this.updateLivePreview(container);
      });
    });
    container.querySelectorAll('.store-deck-addcard').forEach(el => {
      el.addEventListener('change', () => {
        const i = parseInt((el as HTMLElement).dataset.idx!);
        const v = (el as HTMLSelectElement).value;
        if (v) {
          if (!d.decks[i].cards) d.decks[i].cards = [];
          if (!d.decks[i].cards.includes(v)) d.decks[i].cards.push(v);
          this.reRender();
        }
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
    container.querySelectorAll('.store-coin-del').forEach(btn => {
      btn.addEventListener('click', () => {
        d.coinPacks.splice(parseInt((btn as HTMLElement).dataset.idx!), 1);
        this.reRender();
      });
    });

    container.querySelectorAll('.store-gem-amount').forEach(el => {
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
    container.querySelectorAll('.store-gem-del').forEach(btn => {
      btn.addEventListener('click', () => {
        d.gemPacks.splice(parseInt((btn as HTMLElement).dataset.idx!), 1);
        this.reRender();
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

    // Botão Salvar Loja
    const saveBtn = container.querySelector('#btn-save-store') as HTMLButtonElement;
    saveBtn?.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'GRAVANDO...';
      const ok = await this.saveJson('/api/save-store', this.data);
      if (ok) {
        saveBtn.textContent = '✅ GRAVADO!';
        this.showToast('Configuração da Loja gravada com sucesso!');
      } else {
        saveBtn.textContent = '❌ FALHA';
        this.showToast('Falha ao gravar loja localmente', '#ef4444');
      }
      setTimeout(() => { saveBtn.disabled = false; saveBtn.textContent = '💾 SALVAR'; }, 2000);
    });
  }

  // ATUALIZA A PRÉ-VISUALIZAÇÃO AO VIVO DA LOJA
  private updateLivePreview(container: HTMLElement) {
    const previewWrap = container.querySelector('#store-live-preview-content') as HTMLElement | null;
    if (!previewWrap) return;

    previewWrap.innerHTML = '';
    try {
      const liveStore = new StoreScreen(this.data);
      liveStore.render(previewWrap, { headerSpace: false });
    } catch (err) {
      console.warn('Erro ao atualizar preview ao vivo da loja:', err);
    }
  }
}
