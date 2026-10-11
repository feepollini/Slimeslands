import { StoreScreen } from '../../StoreScreen';
import { ProgressionManager } from '../../../../core/ProgressionManager';

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

  // Módulo ativo atualmente selecionado na Coluna 1 para edição na Coluna 2
  private static activeModuleKey: string = 'packs';

  constructor(state: any, callbacks: any, core: any) {
    this.data = normalizeStoreData(state.storeItems);
    this.templates = state.templates || [];
    this.skills = state.skills || [];
    this.reRender = callbacks.reRender;
    this.showToast = callbacks.showToast;
    this.openMediaPicker = callbacks.openMediaPicker;
    this.saveJson = core.saveJson.bind(core);
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
              <div style="font-size:0.62rem; color:#888;">Vitrine modular em 3 painéis: Ordem dos Módulos · Configuração do Módulo Clicado · Preview ao Vivo</div>
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
          <div style="flex:1; min-width:380px; border-right:1px solid rgba(255,255,255,0.1); background:#0e1019; display:flex; flex-direction:column; overflow:hidden;">
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
  // COLUNA 1: MÓDULOS DA VITRINE (TOTALMENTE ABERTO, FORA DE CONTAINER RETRÁTIL)
  // =========================================================================
  private renderColumn1ModulesHtml(): string {
    const d = this.data;
    const currentOrder = d.sectionOrder || [...DEFAULT_SECTION_ORDER];
    const allAvailableKeys = Object.keys(SECTION_METADATA);
    const inactiveKeys = allAvailableKeys.filter(k => !currentOrder.includes(k));

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
        Clique no módulo para editar ao lado. Use ▲/▼ para ordenar na vitrine.
      </div>

      <!-- Lista Rolável dos Módulos -->
      <div style="flex:1; overflow-y:auto; padding:10px; display:flex; flex-direction:column; gap:6px;">
        ${currentOrder.map((key, idx) => {
          const meta = SECTION_METADATA[key] || { label: key, icon: '📌', desc: '' };
          const isVisible = d.sectionVisibility?.[key] !== false;
          const isSelected = TabStore.activeModuleKey === key;

          return `
            <div class="store-module-item" data-key="${key}" style="background:${isSelected ? 'linear-gradient(90deg, rgba(255,215,0,0.18), rgba(255,122,0,0.12))' : 'rgba(0,0,0,0.35)'}; border:1.5px solid ${isSelected ? '#ffd700' : (isVisible ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.3)')}; border-radius:10px; padding:8px 10px; display:flex; align-items:center; justify-content:space-between; gap:8px; cursor:pointer; transition:0.15s; box-shadow:${isSelected ? '0 0 12px rgba(255,215,0,0.25)' : 'none'}; ${isVisible ? '' : 'opacity:0.5;'}">
              
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
                <button class="btn-sec-toggle-vis editor-btn-secondary" data-key="${key}" style="font-size:0.6rem; padding:3px 6px; ${isVisible ? 'color:#4ade80;' : 'color:#ef4444;'}" title="Alternar visibilidade">${isVisible ? '👁️' : '🚫'}</button>
                <button class="btn-sec-remove editor-btn-secondary" data-key="${key}" style="font-size:0.6rem; padding:3px 6px; color:#ef4444;" title="Tirar da vitrine">🗑️</button>
              </div>
            </div>
          `;
        }).join('')}

        <!-- Bloco Adicionar Novo Módulo -->
        <div style="margin-top:8px; padding:10px; background:rgba(0,0,0,0.3); border:1px dashed rgba(255,255,255,0.15); border-radius:10px; display:flex; flex-direction:column; gap:6px;">
          <div style="font-size:0.62rem; font-weight:900; color:#4ade80; display:flex; align-items:center; gap:4px;">
            <span>➕</span> ADICIONAR MÓDULO À VITRINE
          </div>
          ${inactiveKeys.length > 0 ? `
            <div style="display:flex; gap:4px;">
              <select id="select-add-module" class="editor-input" style="flex:1; font-size:0.65rem; padding:4px 6px;">
                ${inactiveKeys.map(k => `<option value="${k}">${SECTION_METADATA[k]?.icon || '📌'} ${SECTION_METADATA[k]?.label || k}</option>`).join('')}
              </select>
              <button id="btn-add-module" class="editor-btn-secondary" style="font-size:0.62rem; font-weight:900; color:#4ade80; border-color:rgba(74,222,128,0.4); padding:4px 8px; white-space:nowrap;">
                + ADICIONAR
              </button>
            </div>
          ` : `
            <div style="font-size:0.58rem; color:#888;">Todos os módulos disponíveis já estão na vitrine.</div>
          `}
        </div>

        <!-- Opção Rápida de Decks -->
        <div style="margin-top:4px; padding:8px 10px; background:rgba(168,85,247,0.08); border:1px solid rgba(168,85,247,0.2); border-radius:10px; display:flex; flex-direction:column; gap:4px;">
          <span style="font-size:0.6rem; font-weight:900; color:#d8b4fe;">🃏 Layout dos Decks na Loja:</span>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
            <button id="btn-set-deck-mode-carousel" class="editor-btn-secondary" style="font-size:0.58rem; padding:4px 2px; ${d.deckLayoutMode === 'carousel' ? 'background:rgba(255,215,0,0.2); color:#ffd700; border-color:#ffd700;' : 'color:#888;'}">
              🎠 Carrossel
            </button>
            <button id="btn-set-deck-mode-standalone" class="editor-btn-secondary" style="font-size:0.58rem; padding:4px 2px; ${d.deckLayoutMode === 'standalone' ? 'background:rgba(168,85,247,0.2); color:#d8b4fe; border-color:#a855f7;' : 'color:#888;'}">
              ⭐ Separados
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
    const vitrinePos = isInVitrine ? currentOrder.indexOf(key) + 1 : null;

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
              ${isInVitrine ? `● Ativo na vitrine (Posição #${vitrinePos})` : `○ Fora da vitrine`}
            </div>
          </div>
        </div>

        <button class="btn-toggle-active-module-vitrine editor-btn-secondary" data-key="${key}" style="font-size:0.65rem; font-weight:900; padding:6px 12px; white-space:nowrap;">
          ${isInVitrine ? '🗑️ Tirar da Vitrine' : '➕ Ativar na Vitrine'}
        </button>
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
      // MÓDULO 1: BOOSTERS CARROSSEL
      // ---------------------------------------------------------------------
      case 'packs':
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <div style="font-size:0.95rem; font-weight:950; color:#ff7a00;">📦 BOOSTERS - MÓDULO 1 (CARROSSEL 3D)</div>
              <div style="font-size:0.65rem; color:#aaa;">Carrossel 3D horizontal com 3 boosters peeking e física elegante de deslize.</div>
            </div>
            <button id="store-pack-add" class="editor-btn-primary" style="font-size:0.7rem; padding:6px 14px; background:#ff7a00; border-color:#ff7a00;">+ NOVO BOOSTER</button>
          </div>

          <div style="display:flex; flex-direction:column; gap:4px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="font-size:0.68rem; font-weight:800; color:#ffd700;">Título da Seção na Vitrine:</span>
            <input type="text" id="store-title-packs" class="editor-input" value="${this.esc((d.titles as any)?.packs || 'PACOTES & BOOSTERS (CARROSSEL)')}" style="font-size:0.72rem; font-weight:700;">
          </div>

          <div style="display:flex; flex-direction:column; gap:12px;">
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

                <div style="display:flex; gap:6px; align-items:center;">
                  <span style="font-size:0.62rem; color:#aaa;">Tema:</span>
                  <select class="editor-input store-pack-theme" data-idx="${i}" style="flex:1; font-size:0.65rem;">
                    <option value="charizard" ${pack.theme === 'charizard' ? 'selected' : ''}>🔥 Fogo / Vermelho</option>
                    <option value="pikachu" ${pack.theme === 'pikachu' ? 'selected' : ''}>⚡ Raio / Dourado</option>
                    <option value="rayquaza" ${pack.theme === 'rayquaza' ? 'selected' : ''}>🌿 Natureza / Verde</option>
                    <option value="mewtwo" ${pack.theme === 'mewtwo' ? 'selected' : ''}>🔮 Arcano / Roxo</option>
                    <option value="winter" ${pack.theme === 'winter' ? 'selected' : ''}>❄️ Inverno / Azul</option>
                  </select>
                </div>

                <!-- Capa Personalizada Rígida -->
                <div style="display:flex; gap:6px; align-items:center; background:rgba(0,0,0,0.3); padding:6px; border-radius:6px;">
                  <div style="width:28px; height:42px; border-radius:2px; border:1px solid #ffd700; ${pack.customFront ? `background:url('${pack.customFront}') center/cover;` : 'background:#222;'} flex-shrink:0;"></div>
                  <div style="flex:1; display:flex; flex-direction:column; gap:2px;">
                    <span style="font-size:0.6rem; color:#ffd700; font-weight:800;">Capa Personalizada (Retângulo Rígido):</span>
                    <div style="display:flex; gap:4px;">
                      <button class="editor-btn-secondary store-pack-front-pick" data-idx="${i}" style="font-size:0.58rem; padding:2px 6px;">🖼️ Mídia</button>
                      ${pack.customFront ? `<button class="editor-btn-secondary store-pack-front-clear" data-idx="${i}" style="font-size:0.58rem; padding:2px 6px; color:#ef4444;">✕ Limpar</button>` : ''}
                    </div>
                  </div>
                </div>

                <!-- Taxas de Raridade -->
                <div style="display:flex; gap:4px; align-items:center; background:rgba(0,0,0,0.3); padding:4px 6px; border-radius:6px;">
                  <div style="flex:1; display:flex; align-items:center; gap:2px;">
                    <span style="font-size:0.58rem; color:#aaa;">Comum %:</span>
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

                <label style="display:flex; align-items:center; gap:6px; font-size:0.65rem; color:#aaa; cursor:pointer;">
                  <input type="checkbox" class="store-pack-pub" data-idx="${i}" ${pack.published !== false ? 'checked' : ''}>
                  <span>Exibir na Vitrine da Loja</span>
                </label>
              </div>
            `).join('')}
          </div>
        `;

      // ---------------------------------------------------------------------
      // MÓDULO 2: BOOSTERS SPLIT LATERAL
      // ---------------------------------------------------------------------
      case 'packs_split':
        return `
          <div>
            <div style="font-size:0.95rem; font-weight:950; color:#38bdf8;">🌓 BOOSTERS - MÓDULO 2 (SPLIT LATERAL)</div>
            <div style="font-size:0.65rem; color:#aaa; margin-top:2px;">
              Exibe o booster vertical rígido no lado esquerdo e seletores, detalhes e compra no lado direito.
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:4px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="font-size:0.68rem; font-weight:800; color:#ffd700;">Título da Seção na Vitrine:</span>
            <input type="text" id="store-title-packs-split" class="editor-input" value="${this.esc((d.titles as any)?.packs_split || 'DESTAQUES ESPECIAIS (SPLIT)')}" style="font-size:0.72rem; font-weight:700;">
          </div>

          <div style="background:rgba(0,0,0,0.4); border-radius:10px; border:1px solid rgba(255,255,255,0.08); padding:16px; display:flex; flex-direction:column; gap:10px;">
            <div style="font-size:0.75rem; font-weight:900; color:#fff;">ℹ️ Booster Compartilhado:</div>
            <div style="font-size:0.68rem; color:#aaa; line-height:1.4;">
              O Módulo 2 projeta os mesmos boosters cadastrados no jogo com visual split horizontal. Para gerenciar capas, taxas, temas e novos boosters, clique em <b>Módulo 1</b> na coluna da esquerda.
            </div>
          </div>
        `;

      // ---------------------------------------------------------------------
      // DECKS COMPLETOS
      // ---------------------------------------------------------------------
      case 'decks':
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <div style="font-size:0.95rem; font-weight:950; color:#d8b4fe;">🃏 DECKS COMPLETOS (${d.decks.length})</div>
              <div style="font-size:0.65rem; color:#aaa;">Decks pré-montados com lista de cartas inclusas.</div>
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
                
                <div style="font-size:0.62rem; color:#aaa; font-weight:700;">Cartas no deck: ${(deck.cards || []).length}</div>
                <div style="display:flex; gap:4px; flex-wrap:wrap; max-height:80px; overflow-y:auto; padding:2px;">
                  ${(deck.cards || []).map((c, ci) => `
                    <span style="font-size:0.58rem; background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:6px; display:flex; align-items:center; gap:4px;">
                      ${this.esc(c)}
                      <b class="store-deck-rmcard" data-idx="${i}" data-ci="${ci}" style="cursor:pointer; color:#ef4444;">✕</b>
                    </span>
                  `).join('')}
                </div>
                <select class="editor-input store-deck-addcard" data-idx="${i}" style="font-size:0.65rem;">
                  <option value="">+ Adicionar Carta ao Deck...</option>
                  ${this.cardOptions('')}
                </select>
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

          <div style="display:flex; flex-direction:column; gap:6px;">
            ${d.dailyPool.map((o, i) => `
              <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:8px 10px; display:flex; gap:8px; align-items:center;">
                <select class="editor-input store-daily-card" data-idx="${i}" style="flex:2; font-size:0.68rem;">${this.cardOptions(o.card)}</select>
                <input type="number" class="editor-input store-daily-price" data-idx="${i}" value="${o.price}" min="0" style="flex:1; font-size:0.68rem;" title="Moedas">
                <span style="font-size:0.75rem;">🪙</span>
                <button class="editor-btn-secondary store-daily-del" data-idx="${i}" style="font-size:0.65rem; padding:4px 8px; color:#ef4444;">✕</button>
              </div>
            `).join('')}
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

          <div style="display:flex; flex-direction:column; gap:6px;">
            ${d.rare.map((o, i) => `
              <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:8px 10px; display:flex; gap:8px; align-items:center;">
                <select class="editor-input store-rare-card" data-idx="${i}" style="flex:2; font-size:0.68rem;">${this.cardOptions(o.card)}</select>
                <input type="number" class="editor-input store-rare-price" data-idx="${i}" value="${o.price}" min="0" style="flex:1; font-size:0.68rem;" title="Diamantes">
                <span style="font-size:0.75rem;">💎</span>
                <button class="editor-btn-secondary store-rare-del" data-idx="${i}" style="font-size:0.65rem; padding:4px 8px; color:#ef4444;">✕</button>
              </div>
            `).join('')}
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
          <button id="btn-refresh-store-preview" class="editor-btn-secondary" style="font-size:0.58rem; padding:3px 6px;">🔄</button>
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
          <div id="store-live-preview-content" style="flex:1; display:flex; flex-direction:column; overflow-y:auto; overflow-x:hidden; background:#0b0d14;"></div>

          <!-- Home Indicator Inferior -->
          <div style="width:100%; height:14px; background:#000; display:flex; align-items:center; justify-content:center; flex-shrink:0; z-index:40;">
            <div style="width:110px; height:4px; background:rgba(255,255,255,0.3); border-radius:10px;"></div>
          </div>
        </div>

      </div>
    `;
  }

  // =========================================================================
  // ATUALIZA O PREVIEW AO VIVO DA LOJA
  // =========================================================================
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
    // COLUNA 1: SELEÇÃO E GESTÃO DOS MÓDULOS DA VITRINE
    // -----------------------------------------------------------------------
    // Clicar em qualquer item da Coluna 1 ativa aquele módulo na Coluna 2
    container.querySelectorAll('.store-module-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
        const key = (item as HTMLElement).dataset.key || '';
        if (key && key !== TabStore.activeModuleKey) {
          TabStore.activeModuleKey = key;
          this.reRender();
        }
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

    // Remover da Vitrine 🗑️
    container.querySelectorAll('.btn-sec-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
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
        TabStore.activeModuleKey = key;
        this.reRender();
        this.showToast(`Módulo "${SECTION_METADATA[key]?.label || key}" adicionado à vitrine!`);
      }
    });

    // Restaurar Todos os Módulos Padrão 🔄
    container.querySelector('#btn-restore-default-modules')?.addEventListener('click', () => {
      d.sectionOrder = [...DEFAULT_SECTION_ORDER];
      if (!d.sectionVisibility) d.sectionVisibility = {};
      DEFAULT_SECTION_ORDER.forEach(k => {
        d.sectionVisibility![k] = true;
      });
      this.reRender();
      this.showToast('Módulos restaurados para o padrão!');
    });

    // Layout dos Decks
    container.querySelector('#btn-set-deck-mode-carousel')?.addEventListener('click', () => {
      d.deckLayoutMode = 'carousel';
      this.reRender();
    });
    container.querySelector('#btn-set-deck-mode-standalone')?.addEventListener('click', () => {
      d.deckLayoutMode = 'standalone';
      this.reRender();
    });

    // -----------------------------------------------------------------------
    // COLUNA 2: AÇÕES DO EDITOR DO MÓDULO CLICADO
    // -----------------------------------------------------------------------
    // Botão de alternar o módulo atual na vitrine
    container.querySelectorAll('.btn-toggle-active-module-vitrine').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.key || TabStore.activeModuleKey;
        if (!d.sectionOrder) d.sectionOrder = [];
        const has = d.sectionOrder.includes(key);
        if (has) {
          const idx = d.sectionOrder.indexOf(key);
          d.sectionOrder.splice(idx, 1);
          if (!d.sectionVisibility) d.sectionVisibility = {};
          d.sectionVisibility[key] = false;
          this.showToast(`Módulo removido da vitrine!`);
        } else {
          d.sectionOrder.push(key);
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

    // Boosters / Pacotes
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
      const first = this.templates[0]?.name || '';
      d.dailyPool.push({ card: first, price: 100 });
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

    // Cartas Raras
    container.querySelector('#store-rare-add')?.addEventListener('click', () => {
      const first = this.templates[0]?.name || '';
      d.rare.push({ card: first, price: 50 });
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
      const ok = await this.saveJson('/api/save-store', this.data);
      if (ok) {
        saveBtn.textContent = '✅ GRAVADO!';
        this.showToast('Configuração da Loja gravada com sucesso!');
      } else {
        saveBtn.textContent = '❌ FALHA';
        this.showToast('Falha ao gravar loja localmente', '#ef4444');
      }
      setTimeout(() => { saveBtn.disabled = false; saveBtn.textContent = '💾 SALVAR LOJA'; }, 2000);
    });
  }
}
