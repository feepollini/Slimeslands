import '../styles/Arsenal.css';
import { Skill } from '../../core/GameEngine';
import { gsap } from 'gsap';
import { bindLongPress } from '../utils/InputUtils';
import { SoundManager } from '../utils/SoundManager';
import { openCardViewer, cardViewerNav, isCardViewerOpen } from '../components/CardViewer';
import {
  renderMatrixCardSVG,
  renderMatrixCardBackSVG,
  getMergedGameTemplatesSync,
  resolveMatrixOrGameCard,
} from '../screens/forge_v2/utils/HestridiaMatrixRenderer';
import { t as i18nT } from '../../core/i18n';

/**
 * ArsenalScreenLandscape — Cópia adaptada do Deck / Arsenal para Modo Paisagem (Landscape / Web Widescreen).
 * Mantém exatamente a mesma assinatura de construtor e persistência do ArsenalScreen original,
 * mas apresenta o construtor de deck em Split-View (Deck Ativo fixo à esquerda + Coleção em 4/5/6 colunas à direita).
 */
export class ArsenalScreenLandscape {
  private templates: any[];
  private artifacts: Skill[];
  private boards: string[];

  private activeTab: 'cards' | 'artifacts' | 'boards' = 'cards';
  private gridSize: 3 | 4 | 5 | 6 =
    typeof window !== 'undefined' && (window.innerHeight <= 540 || window.innerWidth <= 920) ? 3 : 4;
  private searchQuery = '';
  private rarityFilter: 'all' | 'common' | 'rare' | 'epic' | 'legendary' = 'all';
  private favorites: string[] = [];
  private isStacked = true;
  private isPrepMode = false;

  private preDeckCards: (any | null)[] = Array(12).fill(null);
  private preDeckArtifacts: (Skill | null)[] = Array(3).fill(null);
  private selectedBoard = '';

  private viewerList: any[] = [];
  private currentSlot = 1;
  private suppressThumbClickUntil = 0;
  private collapsedSections: Set<string> = new Set();
  private showConfirmSwitch = false;
  private targetSlot = 1;

  private onConfirm?: (cards: any[], artifacts: Skill[], board: string) => void;

  constructor(
    templates: any[],
    artifacts: Skill[],
    boards: string[],
    onConfirm?: (cards: any[], artifacts: Skill[], board: string) => void,
    _isPrepMode: boolean = false
  ) {
    this.templates = getMergedGameTemplatesSync(templates);
    this.artifacts = artifacts;
    this.boards = boards;
    this.onConfirm = onConfirm;
    this.isPrepMode = _isPrepMode;

    const favs = localStorage.getItem('arsenal_favorites');
    if (favs) {
      try {
        this.favorites = JSON.parse(favs);
      } catch {}
    }

    const savedStacked = localStorage.getItem('arsenal_stack_copies');
    if (savedStacked !== null) {
      try {
        this.isStacked = JSON.parse(savedStacked);
      } catch {}
    }

    try {
      const collapsed = JSON.parse(localStorage.getItem('arsenal_collapsed_sections') || '[]');
      this.collapsedSections = new Set(collapsed);
    } catch {}

    const lastSlot = localStorage.getItem('arsenal_current_slot');
    if (lastSlot) this.currentSlot = parseInt(lastSlot);

    this.loadSlotData(this.currentSlot);

    window.addEventListener('keydown', this.handleGlobalKeys.bind(this));
    window.addEventListener('hestridia:matrix-updated', () => {
      this.templates = getMergedGameTemplatesSync(templates);
      this.loadSlotData(this.currentSlot);
    });
  }

  public render(container: HTMLElement) {
    const filledCount = this.preDeckCards.filter(Boolean).length;

    container.innerHTML = `
      <div class="arsenal-screen arsenal-landscape-screen ${this.isPrepMode ? 'is-prep-mode' : ''}">
        <div class="ars-ls-frame-shell">
          <!-- PAINEL ESQUERDO EMOLDURADO: MEU DECK ATIVO (12 CARTAS + 3 ARTEFATOS + ARENA) -->
          <aside class="ars-ls-deck-pane">
            <div class="ars-ls-pane-header">
              <div class="ars-ls-title-group">
                <span class="ars-ls-title-icon">${this.isPrepMode ? '⚔️' : '🃏'}</span>
                <div>
                  <div class="ars-ls-title-main">${this.isPrepMode ? 'PREPARAÇÃO' : 'MEU DECK'}</div>
                  <div class="ars-ls-title-sub">${filledCount}/12 CARTAS EQUIPADAS</div>
                </div>
              </div>
              <div class="ars-slot-selector">
                ${[1, 2, 3]
                  .map(
                    (s) => `
                  <button class="ars-slot-btn ${this.currentSlot === s ? 'active' : ''}" data-slot="${s}">
                    ${i18nT('ars.slot')} ${s}
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>

            <!-- BANDEJA ENTALHADA DAS 12 CARTAS DO DECK (4x3) -->
            <div class="ars-ls-deck-tray">
              <div class="ars-ls-deck-grid">
                ${this.preDeckCards
                  .map(
                    (c, i) => `
                  <div class="ars-slot ars-card-slot ${c ? 'filled' : ''}" data-type="card" data-idx="${i}" draggable="true">
                    ${
                      c
                        ? `<div class="ars-slot-img" style="border-radius:6px; overflow:hidden; width:100%; height:100%;">${renderMatrixCardSVG(c, { mode: 'thumb', animateChroma: false })}</div>`
                        : '<div class="ars-slot-plus">+</div>'
                    }
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>

            <!-- RODAPÉ ORGANIZADO: 3 ARTEFATOS + VERSO/ARENA + SALVAR/AUTO -->
            <div class="ars-ls-deck-footer">
              <div class="ars-ls-artifacts-bar">
                <div class="ars-ls-sub-label">✨ ARTEFATOS & VERSO</div>
                <div class="ars-ls-artifacts-row">
                  <div class="ars-skill-slots" style="gap:10px;">
                    ${this.preDeckArtifacts
                      .map(
                        (a, i) => `
                      <div class="ars-slot ars-skill-circle ${a ? 'filled' : ''}" data-type="artifact" data-idx="${i}" draggable="true" style="width:46px; height:46px;">
                        ${
                          a
                            ? `<div class="ars-slot-img" style="background-image:url('${a.image || ''}'); display:flex; align-items:center; justify-content:center; font-size:1.25rem;">${a.image ? '' : a.icon}</div>`
                            : '<div class="ars-slot-plus" style="font-size:1.1rem;">+</div>'
                        }
                      </div>
                    `
                      )
                      .join('')}
                  </div>

                  <div class="ars-slot ars-board-mini-slot filled" data-type="board" style="width:62px; height:46px; background-image:url('${this.selectedBoard}'); position:relative;">
                    <div style="font-size:0.46rem; font-weight:900; background:rgba(0,0,0,0.72); color:#ffe9a8; width:100%; text-align:center; position:absolute; bottom:0; padding:2px 0;">${i18nT('ars.back')}</div>
                  </div>
                </div>
              </div>

              <div class="ars-ls-action-row">
                <button class="ars-save-btn" id="ars-save-deck" style="flex:1; justify-content:center; padding:8px 10px; font-size:0.64rem;">
                  <span class="ars-save-icon">💾</span>
                  <span class="ars-save-text">${i18nT('ars.save')}</span>
                </button>
                <button class="ars-auto-btn" id="ars-auto-fill" style="flex:1; justify-content:center; padding:8px 10px; font-size:0.64rem;">
                  <span class="ars-auto-icon">🎲</span>
                  <span class="ars-auto-text">${i18nT('ars.autofill')}</span>
                </button>
              </div>
            </div>
          </aside>

          <!-- PAINEL DIREITO EMOLDURADO: ACERVO COMPLETO COM BARRA DE FERRAMENTAS -->
          <section class="ars-ls-collection-pane">
            <div class="ars-ls-toolbar">
              <div class="ars-ls-tabs-pill">
                <button class="ars-tab ${this.activeTab === 'cards' ? 'active' : ''}" data-tab="cards">🃏 ${i18nT('ars.cards')}</button>
                <button class="ars-tab ${this.activeTab === 'artifacts' ? 'active' : ''}" data-tab="artifacts">✨ ${i18nT('ars.artifacts')}</button>
                <button class="ars-tab ${this.activeTab === 'boards' ? 'active' : ''}" data-tab="boards">🗺️ ${i18nT('ars.boards')}</button>
              </div>

              <div class="ars-ls-filters-group">
                ${
                  this.activeTab === 'cards'
                    ? `
                  <div class="ars-grid-switcher">
                    <button class="ars-grid-btn ${this.gridSize === 3 ? 'active' : ''}" data-size="3">3x</button>
                    <button class="ars-grid-btn ${this.gridSize === 4 ? 'active' : ''}" data-size="4">4x</button>
                    <button class="ars-grid-btn ${this.gridSize === 5 ? 'active' : ''}" data-size="5">5x</button>
                  </div>
                  <select id="ars-rarity-filter" class="ars-select compact">
                    <option value="all" ${this.rarityFilter === 'all' ? 'selected' : ''}>${i18nT('ars.all')}</option>
                    <option value="common" ${this.rarityFilter === 'common' ? 'selected' : ''}>${i18nT('ars.common')}</option>
                    <option value="rare" ${this.rarityFilter === 'rare' ? 'selected' : ''}>${i18nT('ars.rare')}</option>
                    <option value="epic" ${this.rarityFilter === 'epic' ? 'selected' : ''}>${i18nT('ars.epic')}</option>
                    <option value="legendary" ${this.rarityFilter === 'legendary' ? 'selected' : ''}>${i18nT('ars.legendary')}</option>
                  </select>
                  <button id="ars-stack-btn" class="ars-stack-btn ${this.isStacked ? 'active' : ''}" title="${this.isStacked ? 'Cópias Empilhadas (x2, x3...)' : 'Empilhar Cópias Repetidas'}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="8" y="2" width="12" height="16" rx="2" />
                      <path d="M4 6v14a2 2 0 0 0 2 2h10" />
                    </svg>
                  </button>
                `
                    : ''
                }

                <div class="ars-search-box" style="min-width:170px; max-width:250px;">
                  <span class="ars-search-icon">🔍</span>
                  <input type="text" id="ars-search" class="ars-search-input" placeholder="${i18nT('ars.search')}" value="${this.searchQuery}">
                </div>
              </div>
            </div>

            <div class="ars-ls-collection-scroll ars-scroller">
              <main class="ars-content" id="ars-panel" style="padding:0;">
                ${this.renderActiveContent()}
              </main>
            </div>
          </section>
        </div>

        <!-- ARTIFACT DETAIL MODAL -->
        <div class="ars-viewer-overlay" id="ars-artifact-modal">
          <div class="ars-viewer-body" id="ars-artifact-content" style="background:linear-gradient(180deg, #3a2a15 0%, #241809 55%, #181005 100%); border:4px solid #0e0903; padding:28px; border-radius:22px; width:360px; text-align:center;"></div>
        </div>

        <!-- DECK SWITCH CONFIRMATION MODAL -->
        <div class="ars-viewer-overlay ${this.showConfirmSwitch ? 'active' : ''}" id="ars-switch-modal">
          <div class="ars-viewer-body" style="background:linear-gradient(180deg, #3a2a15 0%, #241809 55%, #181005 100%); border:4px solid #0e0903; padding:26px; border-radius:20px; width:330px; text-align:center;">
            <div style="font-size:1.1rem; font-weight:950; color:#ffd76a; margin-bottom:10px;">${i18nT('ars.switchTitle')}</div>
            <div style="font-size:0.8rem; color:#ffe9a8; margin-bottom:20px;">${i18nT('ars.switchMsg')} ${this.targetSlot}?</div>
            <div style="display:flex; gap:10px; width:100%;">
              <button id="switch-confirm" style="flex:1; padding:12px; background:linear-gradient(180deg, #b8f54d 0%, #4a9b1f 100%); color:#0f1f00; border:3px solid #0e1f00; border-radius:12px; font-weight:950; font-size:0.75rem; cursor:pointer;">${i18nT('ars.yes')}</button>
              <button id="switch-cancel" style="flex:1; padding:12px; background:linear-gradient(180deg, #5a4128, #2a1c0d); color:#ffe9a8; border:3px solid #0e0903; border-radius:12px; font-weight:950; font-size:0.75rem; cursor:pointer;">${i18nT('ars.no')}</button>
            </div>
          </div>
        </div>

        <button id="ars-confirm" style="display:none;"></button>
      </div>
    `;

    this.bind(container);
    this.observeLazyBg(container);
  }

  private isArtifactInDeck(id: string): boolean {
    return this.preDeckArtifacts.some((a) => a && a.id === id);
  }

  private getCardsList(): any[] {
    const list: any[] = [...this.templates];
    try {
      const ownedRaw = localStorage.getItem('store_owned_v1');
      if (ownedRaw) {
        const owned = JSON.parse(ownedRaw);
        if (owned && Array.isArray(owned.cards)) {
          const counts: Record<string, number> = {};
          owned.cards.forEach((cardName: string) => {
            counts[cardName] = (counts[cardName] || 0) + 1;
          });
          for (const [name, count] of Object.entries(counts)) {
            const existingCount = list.filter((t) => t.name === name).length;
            const needed = count - existingCount;
            if (needed > 0) {
              const tmpl = this.templates.find((t) => t.name === name);
              if (tmpl) {
                for (let i = 0; i < needed; i++) list.push({ ...tmpl });
              }
            }
          }
        }
      }
    } catch {}
    return list;
  }

  private renderActiveContent(): string {
    const q = this.searchQuery.toLowerCase();

    if (this.activeTab === 'cards') {
      const allCards = this.getCardsList();
      if (allCards.length === 0) {
        return `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 48px 20px; text-align:center; color:#94a3b8; gap:16px;">
            <div style="font-size:3rem;">🎴</div>
            <div style="font-size:1.15rem; font-weight:900; color:#f1f5f9;">Nenhuma Carta Criada na Matriz</div>
            <div style="font-size:0.82rem; max-width:440px; color:#cbd5e1; line-height:1.5;">
              Os presets antigos foram desativados para manter coesão com a Forja e a Galeria de Decks. Acesse a <strong>Forja Matriz</strong> para criar seus slimes e magias ou monte seus decks na <strong>Galeria de Decks</strong>!
            </div>
            <button onclick="window.location.href='forge.html'" style="margin-top:8px; padding:10px 24px; background:linear-gradient(135deg, #7928ca, #ff0080); color:#fff; border:none; border-radius:9999px; font-weight:900; font-size:0.85rem; cursor:pointer; box-shadow:0 4px 15px rgba(255,0,128,0.35);">
              ✨ ABRIR FORJA MATRIZ
            </button>
          </div>
        `;
      }
      let filtered = allCards.filter((t) => t.name.toLowerCase().includes(q));
      if (this.rarityFilter !== 'all') {
        filtered = filtered.filter((t) => (t.preferredRarity || 'common') === this.rarityFilter);
      }

      let displayCards: any[] = [];
      if (this.isStacked) {
        const cardMap = new Map<string, { card: any; count: number; instances: any[] }>();
        filtered.forEach((c) => {
          const existing = cardMap.get(c.name);
          if (existing) {
            existing.count++;
            existing.instances.push(c);
          } else {
            cardMap.set(c.name, { card: { ...c }, count: 1, instances: [c] });
          }
        });
        displayCards = Array.from(cardMap.values()).map((entry) => {
          entry.card._count = entry.count;
          entry.card._instances = entry.instances;
          return entry.card;
        });
      } else {
        displayCards = filtered;
      }

      const grouped = {
        favorites: displayCards.filter((t) => this.favorites.includes(t.name)),
        legendary: displayCards.filter((t) => t.preferredRarity === 'legendary' && !this.favorites.includes(t.name)),
        epic: displayCards.filter((t) => t.preferredRarity === 'epic' && !this.favorites.includes(t.name)),
        rare: displayCards.filter((t) => t.preferredRarity === 'rare' && !this.favorites.includes(t.name)),
        common: displayCards.filter((t) => (t.preferredRarity === 'common' || !t.preferredRarity) && !this.favorites.includes(t.name)),
      };

      this.viewerList = [...grouped.favorites, ...grouped.legendary, ...grouped.epic, ...grouped.rare, ...grouped.common];

      let html = '';
      const rarityTargets: Record<string, number> = { legendary: 6, epic: 10, rare: 16, common: 28 };

      if (grouped.favorites.length > 0) {
        const favsCollapsed = this.collapsedSections.has('favs');
        html += `<div class="ars-section-header" data-collapse="favs" style="cursor:pointer; user-select:none;">${favsCollapsed ? '▶' : '▼'} ${i18nT('ars.favs')} (${grouped.favorites.length})</div>
                 <div class="ars-grid ars-columns-${this.gridSize}" style="${favsCollapsed ? 'display:none;' : ''}">${grouped.favorites.map((t) => this.renderCardThumb(t, true)).join('')}</div>`;
      }

      ['common', 'rare', 'epic', 'legendary'].forEach((r) => {
        const sect = (grouped as any)[r];
        const ownedCount = sect ? sect.length : 0;
        const target = rarityTargets[r] || 10;
        const lockedCount = Math.max(2, target - ownedCount);

        html += `<div class="ars-rarity-divider rarity-${r}" data-collapse="rar:${r}" style="cursor:pointer; user-select:none;">${this.collapsedSections.has('rar:' + r) ? '▶' : '▼'} ${i18nT('ars.' + r)} (${ownedCount})</div>`;
        html += `<div class="ars-grid ars-columns-${this.gridSize}" style="${this.collapsedSections.has('rar:' + r) ? 'display:none;' : ''}">`;
        if (sect) html += sect.map((t: any) => this.renderCardThumb(t, false)).join('');
        for (let i = 0; i < lockedCount; i++) {
          html += `
            <div class="ars-card-thumb locked" style="cursor:not-allowed;">
              <div class="ars-thumb-art" style="overflow:hidden; border-radius:8px; opacity:0.35; filter:grayscale(1) blur(1px); aspect-ratio:680/990;">${renderMatrixCardBackSVG()}</div>
              <div class="ars-locked-icon">🔒</div>
              <div class="ars-thumb-info"><div class="ars-thumb-name" style="color:#666; font-size:0.45rem;">${i18nT('ars.locked')}</div></div>
            </div>
          `;
        }
        html += `</div>`;
      });

      return html;
    }

    if (this.activeTab === 'artifacts') {
      const items = this.artifacts.filter((s) => s.name.toLowerCase().includes(q));
      const grouped = items.reduce((acc, skill) => {
        if (!acc[skill.category]) acc[skill.category] = [];
        acc[skill.category].push(skill);
        return acc;
      }, {} as Record<string, Skill[]>);

      let html = '';
      for (const [category, skills] of Object.entries(grouped)) {
        html += `
          <div class="ars-rarity-divider rarity-common" data-collapse="art:${category}" style="border-left:2px solid #ffd700; cursor:pointer; user-select:none;">${this.collapsedSections.has('art:' + category) ? '▶' : '▼'} ${category.toUpperCase()}</div>
          <div class="ars-artifact-grid" style="grid-template-columns:repeat(5, 1fr); ${this.collapsedSections.has('art:' + category) ? 'display:none;' : ''}">
            ${skills
              .map((s) => {
                const isEquipped = this.isArtifactInDeck(s.id);
                return `
                  <div class="ars-artifact-item ${isEquipped ? 'equipped' : ''}" data-id="${s.id}">
                    <div class="ars-artifact-image" style="${s.image ? `background-image:url('${s.image}')` : ''}">${s.image ? '' : s.icon}</div>
                    <div class="ars-artifact-content"><div class="ars-artifact-name">${s.name}</div></div>
                    <button class="ars-artifact-equip-btn equip-artifact">${isEquipped ? `✓ ${i18nT('ars.inDeck')}` : i18nT('ars.equip')}</button>
                  </div>
                `;
              })
              .join('')}
          </div>
        `;
      }
      return html || `<div style="text-align:center; opacity:0.3; padding:40px;">${i18nT('ars.noArtifacts')}</div>`;
    }

    if (this.activeTab === 'boards') {
      return `<div class="ars-grid ars-columns-3">${this.boards
        .map(
          (bg) => `
          <div class="board-select ${this.selectedBoard === bg ? 'active' : ''}" data-url="${bg}">
            <div class="ars-board-item" style="aspect-ratio:16/9; border-radius:6px; overflow:hidden; background-image:url('${bg}'); background-size:cover; background-position:center;"></div>
            ${this.selectedBoard === bg ? `<div class="ars-board-check">✓</div>` : ''}
          </div>`
        )
        .join('')}</div>`;
    }
    return '';
  }

  private renderCardThumb(t: any, isFav: boolean): string {
    const inDeckCount = this.preDeckCards.filter((c) => c && c.name === t.name).length;
    const totalCount = t._count || 1;
    const allInDeck = inDeckCount >= totalCount;
    const inDeck = inDeckCount > 0;
    const isStackedCard = this.isStacked && totalCount > 1;

    return `
      <div class="ars-card-thumb ${inDeck ? 'in-deck' : ''} ${isStackedCard ? 'stacked' : ''}" data-name="${t.name}">
        <div class="ars-thumb-art matrix-thumb-art" style="overflow:hidden; border-radius:8px; position:relative; aspect-ratio:680/990;">
          ${renderMatrixCardSVG(t, { mode: 'thumb', animateChroma: false })}
          <div class="ars-fav-indicator ${isFav ? 'active' : ''}">⭐</div>
          ${isStackedCard ? `<div class="ars-stack-badge" title="${totalCount} cópias disponíveis">🎴 x${totalCount}</div>` : ''}
          ${inDeck ? `<div class="ars-deck-badge ${isStackedCard && !allInDeck ? 'partial' : ''}">${isStackedCard && totalCount > 1 ? `${inDeckCount}/${totalCount} ${i18nT('ars.inDeck')}` : i18nT('ars.inDeck')}</div>` : ''}
          <div class="ars-thumb-overlay">
            <button class="ars-btn-action inline-equip">${allInDeck ? i18nT('ars.remove') : isStackedCard && inDeckCount > 0 ? `+ EQUIPAR (${inDeckCount}/${totalCount})` : inDeck ? i18nT('ars.remove') : i18nT('ars.equip')}</button>
            <button class="ars-btn-action secondary inline-view">${i18nT('ars.details')}</button>
          </div>
        </div>
        <div class="ars-thumb-info"><div class="ars-thumb-name">${t.name}</div></div>
      </div>`;
  }

  private bind(container: HTMLElement) {
    container.querySelector('#ars-confirm')?.addEventListener('click', () => {
      if (this.onConfirm) {
        const cards = this.preDeckCards.filter((c) => c !== null);
        const arts = this.preDeckArtifacts.filter((a) => a !== null) as Skill[];
        this.onConfirm(cards, arts, this.selectedBoard);
      }
    });

    container.querySelector('#ars-stack-btn')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.5);
      this.isStacked = !this.isStacked;
      try {
        localStorage.setItem('arsenal_stack_copies', JSON.stringify(this.isStacked));
      } catch {}
      this.render(container);
    });

    container.querySelector('#ars-search')?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.updatePanel(container);
    });

    container.querySelector('#ars-rarity-filter')?.addEventListener('change', (e) => {
      this.rarityFilter = (e.target as HTMLSelectElement).value as any;
      SoundManager.playAction('clique_geral', 0.4);
      this.updatePanel(container);
    });

    container.querySelectorAll('.ars-grid-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        SoundManager.playAction('clique_geral', 0.4);
        this.gridSize = parseInt((btn as HTMLElement).dataset.size!) as any;
        this.render(container);
      });
    });

    container.querySelectorAll('.ars-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        SoundManager.playAction('clique_geral', 0.5);
        this.activeTab = (tab as HTMLElement).dataset.tab as any;
        this.render(container);
      });
    });

    container.querySelectorAll('.ars-slot').forEach((slot) => {
      slot.addEventListener('click', () => {
        const type = (slot as HTMLElement).dataset.type;
        const idx = parseInt((slot as HTMLElement).dataset.idx || '0');
        if (type === 'card' && this.activeTab !== 'cards') {
          this.activeTab = 'cards';
          this.render(container);
          return;
        }
        if (type === 'artifact' && this.activeTab !== 'artifacts') {
          this.activeTab = 'artifacts';
          this.render(container);
          return;
        }
        if (type === 'board' && this.activeTab !== 'boards') {
          this.activeTab = 'boards';
          this.render(container);
          return;
        }

        if (type === 'card' && this.preDeckCards[idx]) {
          SoundManager.playAction('clique_geral', 0.3);
          this.preDeckCards[idx] = null;
          this.savePreDeck();
        } else if (type === 'artifact' && this.preDeckArtifacts[idx]) {
          SoundManager.playAction('clique_geral', 0.3);
          this.preDeckArtifacts[idx] = null;
          this.savePreDeck();
        }
        this.render(container);
      });

      const type = (slot as HTMLElement).dataset.type;
      const idx = parseInt((slot as HTMLElement).dataset.idx || '0');
      const item = type === 'card' ? this.preDeckCards[idx] : this.preDeckArtifacts[idx];
      if (item) {
        bindLongPress(slot as HTMLElement, () => {
          if (type === 'card') {
            const vIdx = this.viewerList.findIndex((t) => t.name === item.name);
            if (vIdx !== -1) this.showViewer(vIdx);
            else {
              this.viewerList = [item];
              this.showViewer(0);
            }
          } else {
            this.showArtifactViewer(item);
          }
        });
      }
    });

    container.querySelectorAll('[data-collapse]').forEach((el) => {
      el.addEventListener('click', () => {
        SoundManager.playAction('clique_geral', 0.3);
        this.toggleSection((el as HTMLElement).dataset.collapse!, container);
      });
    });

    container.querySelectorAll('.ars-slot-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = parseInt((btn as HTMLElement).dataset.slot!);
        if (target === this.currentSlot) return;
        SoundManager.playAction('clique_geral', 0.5);
        this.targetSlot = target;
        this.showConfirmSwitch = true;
        this.render(container);
      });
    });

    container.querySelector('#switch-confirm')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.6);
      this.currentSlot = this.targetSlot;
      this.showConfirmSwitch = false;
      localStorage.setItem('arsenal_current_slot', this.currentSlot.toString());
      this.loadSlotData(this.currentSlot);
      this.render(container);
    });

    container.querySelector('#switch-cancel')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.4);
      this.showConfirmSwitch = false;
      this.render(container);
    });

    container.querySelector('#ars-save-deck')?.addEventListener('click', (e) => {
      SoundManager.playAction('clique_geral', 0.7);
      const btn = e.currentTarget as HTMLElement;
      this.savePreDeck();
      const originalText = btn.querySelector('.ars-save-text')!.textContent;
      const originalIcon = btn.querySelector('.ars-save-icon')!.textContent;
      btn.classList.add('saved');
      btn.querySelector('.ars-save-text')!.textContent = i18nT('ars.saved');
      btn.querySelector('.ars-save-icon')!.textContent = '✅';
      setTimeout(() => {
        btn.classList.remove('saved');
        btn.querySelector('.ars-save-text')!.textContent = originalText;
        btn.querySelector('.ars-save-icon')!.textContent = originalIcon;
      }, 1500);
    });

    container.querySelector('#ars-auto-fill')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.5);
      this.autoFillDeck();
      this.render(container);
    });

    let draggedType: string | null = null;
    let draggedIdx: number | null = null;
    container.querySelectorAll('.ars-slot[draggable="true"]').forEach((slot) => {
      slot.addEventListener('dragstart', (e: any) => {
        const el = e.currentTarget as HTMLElement;
        draggedType = el.dataset.type || null;
        draggedIdx = parseInt(el.dataset.idx || '-1');
        el.style.opacity = '0.5';
      });
      slot.addEventListener('dragend', (e: any) => {
        (e.currentTarget as HTMLElement).style.opacity = '1';
        draggedType = null;
        draggedIdx = null;
      });
      slot.addEventListener('dragover', (e: any) => e.preventDefault());
      slot.addEventListener('drop', (e: any) => {
        e.preventDefault();
        const el = e.currentTarget as HTMLElement;
        const targetType = el.dataset.type;
        const targetIdx = parseInt(el.dataset.idx || '-1');
        if (draggedType === targetType && draggedIdx !== null && targetIdx !== -1 && draggedIdx !== targetIdx) {
          if (targetType === 'card') {
            const temp = this.preDeckCards[draggedIdx];
            this.preDeckCards[draggedIdx] = this.preDeckCards[targetIdx];
            this.preDeckCards[targetIdx] = temp;
          } else if (targetType === 'artifact') {
            const temp = this.preDeckArtifacts[draggedIdx];
            this.preDeckArtifacts[draggedIdx] = this.preDeckArtifacts[targetIdx];
            this.preDeckArtifacts[targetIdx] = temp;
          }
          this.savePreDeck();
          this.render(container);
        }
      });
    });

    const panel = container.querySelector('#ars-panel');
    panel?.addEventListener('click', (e) => {
      const trg = e.target as HTMLElement;
      const thumb = trg.closest('.ars-card-thumb') as HTMLElement;
      if (thumb) {
        if (Date.now() < this.suppressThumbClickUntil) return;
        const name = thumb.dataset.name;
        const c = this.viewerList.find((t) => t.name === name) || this.templates.find((t) => t.name === name);
        if (trg.classList.contains('inline-equip')) {
          this.equipToDeck('card', c, thumb);
          return;
        }
        if (trg.classList.contains('inline-view')) {
          const vIdx = this.viewerList.findIndex((t) => t.name === name);
          if (vIdx !== -1) this.showViewer(vIdx);
          return;
        }
        if (trg.classList.contains('ars-fav-indicator')) {
          SoundManager.playAction('clique_geral', 0.4);
          this.toggleFavorite(name!);
          this.updatePanel(container);
          return;
        }
        const vIdx = this.viewerList.findIndex((t) => t.name === name);
        if (vIdx !== -1) this.showViewer(vIdx);
      }

      const artRow = trg.closest('.ars-artifact-item') as HTMLElement;
      if (artRow && trg.classList.contains('equip-artifact')) {
        const art = this.artifacts.find((a) => a.id === artRow.dataset.id);
        if (art) this.equipToDeck('artifact', art, artRow);
        return;
      } else if (artRow && !artRow.classList.contains('locked')) {
        const art = this.artifacts.find((a) => a.id === artRow.dataset.id);
        if (art) this.showArtifactViewer(art);
        return;
      }

      const boardItem = trg.closest('.board-select') as HTMLElement;
      if (boardItem) {
        SoundManager.playAction('clique_geral', 0.5);
        this.selectedBoard = boardItem.dataset.url!;
        this.savePreDeck();
        this.render(container);
      }
    });

    document.getElementById('ars-artifact-modal')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('ars-artifact-modal')) {
        document.getElementById('ars-artifact-modal')?.classList.remove('active');
      }
    });

    this.bindCollectionDrag(container);
  }

  private bindCollectionDrag(container: HTMLElement) {
    container.querySelectorAll('.ars-card-thumb').forEach((thumb) => {
      const el = thumb as HTMLElement;
      let pressTimer: any = null;
      let dragging = false;
      let ghost: HTMLElement | null = null;
      let startX = 0,
        startY = 0;

      const cancelPress = () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      };

      el.addEventListener('pointerdown', (e: PointerEvent) => {
        if ((e.target as HTMLElement).closest('.ars-btn-action, .ars-fav-indicator')) return;
        if (e.button !== undefined && e.button !== 0) return;
        startX = e.clientX;
        startY = e.clientY;
        cancelPress();
        pressTimer = setTimeout(() => {
          const card = this.templates.find((t) => t.name === el.dataset.name);
          if (!card) return;
          dragging = true;
          this.suppressThumbClickUntil = Date.now() + 500;
          ghost = document.createElement('div');
          const r = el.getBoundingClientRect();
          ghost.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:99999;pointer-events:none;border-radius:8px;border:3px solid #ffd700;background:url('${card.image || ''}') center/cover, #111;box-shadow:0 12px 40px rgba(0,0,0,0.8);opacity:0.95;`;
          document.body.appendChild(ghost);
        }, 400);
      });

      el.addEventListener('pointermove', (e: PointerEvent) => {
        if (!dragging || !ghost) {
          if (pressTimer && Math.hypot(e.clientX - startX, e.clientY - startY) > 12) cancelPress();
          return;
        }
        ghost.style.left = e.clientX - ghost.offsetWidth / 2 + 'px';
        ghost.style.top = e.clientY - ghost.offsetHeight / 2 + 'px';
        container.querySelectorAll('.ars-card-slot.drag-over').forEach((s) => s.classList.remove('drag-over'));
        const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const slot = under?.closest?.('.ars-card-slot') as HTMLElement | null;
        if (slot && container.contains(slot)) slot.classList.add('drag-over');
      });

      const endDrag = (e: PointerEvent) => {
        cancelPress();
        if (!dragging) return;
        dragging = false;
        let placed = false;
        const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const slot = under?.closest?.('.ars-card-slot') as HTMLElement | null;
        if (slot && container.contains(slot)) {
          const idx = parseInt(slot.dataset.idx || '-1');
          const card = this.templates.find((t) => t.name === el.dataset.name);
          if (card && idx >= 0) {
            this.preDeckCards[idx] = card;
            this.savePreDeck();
            placed = true;
          }
        }
        ghost?.remove();
        ghost = null;
        container.querySelectorAll('.ars-card-slot.drag-over').forEach((s) => s.classList.remove('drag-over'));
        if (placed) {
          this.suppressThumbClickUntil = Date.now() + 400;
          this.render(container);
        }
      };
      el.addEventListener('pointerup', endDrag);
      el.addEventListener('pointercancel', endDrag);
    });
  }

  private updatePanel(container: HTMLElement) {
    const panel = container.querySelector('#ars-panel') as HTMLElement;
    if (!panel) return;
    panel.innerHTML = this.renderActiveContent();
    this.observeLazyBg(panel);
  }

  private toggleSection(key: string, container: HTMLElement) {
    if (this.collapsedSections.has(key)) this.collapsedSections.delete(key);
    else this.collapsedSections.add(key);
    try {
      localStorage.setItem('arsenal_collapsed_sections', JSON.stringify([...this.collapsedSections]));
    } catch {}
    this.render(container);
  }

  private observeLazyBg(scope: HTMLElement) {
    const els = scope.querySelectorAll('[data-lazybg]');
    els.forEach((el) => {
      const node = el as HTMLElement;
      const full = node.getAttribute('data-lazybg') || '';
      const thumb = node.getAttribute('data-lazythumb') || full;
      node.style.backgroundImage = `url('${thumb || full}')`;
    });
  }

  private equipToDeck(type: 'card' | 'artifact', item: any, _sourceEl: HTMLElement | null) {
    if (type === 'card') {
      const inDeckCount = this.preDeckCards.filter((c) => c && c.name === item.name).length;
      const totalCount = item._count || 1;
      if (inDeckCount >= totalCount) {
        for (let i = this.preDeckCards.length - 1; i >= 0; i--) {
          if (this.preDeckCards[i] && this.preDeckCards[i].name === item.name) {
            this.preDeckCards[i] = null;
            break;
          }
        }
      } else {
        let targetIdx = this.preDeckCards.indexOf(null);
        if (targetIdx === -1) targetIdx = 0;
        this.preDeckCards[targetIdx] = item;
      }
    } else {
      const existing = this.preDeckArtifacts.indexOf(item);
      if (existing !== -1) this.preDeckArtifacts[existing] = null;
      else {
        let targetIdx = this.preDeckArtifacts.indexOf(null);
        if (targetIdx === -1) targetIdx = 0;
        this.preDeckArtifacts[targetIdx] = item;
      }
    }
    this.savePreDeck();
    const host = document.querySelector('.arsenal-screen')?.parentElement;
    if (host) this.render(host as HTMLElement);
  }

  private loadSlotData(slot: number) {
    const key = `arsenal_predeck_s${slot}`;
    const savedPre = localStorage.getItem(key) || localStorage.getItem('arsenal_predeck');
    if (savedPre) {
      const data = JSON.parse(savedPre);
      this.preDeckCards = data.cards.map((name: string) =>
        name ? this.templates.find((t) => t.name === name || t.id === name) || resolveMatrixOrGameCard(name, this.templates) || null : null
      );
      this.preDeckArtifacts = data.artifacts.map((id: string) => this.artifacts.find((a) => a.id === id) || null);
      this.selectedBoard = data.board || this.boards[0] || '';
    } else {
      this.preDeckCards = Array(12).fill(null);
      this.preDeckArtifacts = Array(3).fill(null);
      this.selectedBoard = this.boards[0] || '';
    }
  }

  private savePreDeck() {
    const data = {
      cards: this.preDeckCards.map((c) => c?.name || ''),
      artifacts: this.preDeckArtifacts.map((a) => a?.id || ''),
      board: this.selectedBoard,
    };
    localStorage.setItem(`arsenal_predeck_s${this.currentSlot}`, JSON.stringify(data));
    localStorage.setItem('arsenal_predeck', JSON.stringify(data));
  }

  private autoFillDeck() {
    const pool = [...this.templates];
    this.preDeckCards = [];
    for (let i = 0; i < 12; i++) {
      if (pool.length === 0) {
        if (this.templates.length === 0) break;
        pool.push(...this.templates);
      }
      const rIdx = Math.floor(Math.random() * pool.length);
      this.preDeckCards.push(pool.splice(rIdx, 1)[0]);
    }
    while (this.preDeckCards.length < 12) this.preDeckCards.push(null);

    const availableArtifacts = [...this.artifacts];
    this.preDeckArtifacts = [];
    for (let i = 0; i < 3; i++) {
      if (availableArtifacts.length === 0) {
        this.preDeckArtifacts.push(null);
        continue;
      }
      const rIdx = Math.floor(Math.random() * availableArtifacts.length);
      this.preDeckArtifacts.push(availableArtifacts[rIdx]);
      availableArtifacts.splice(rIdx, 1);
    }

    if (this.boards.length > 0) {
      this.selectedBoard = this.boards[Math.floor(Math.random() * this.boards.length)];
    }
    this.savePreDeck();
  }

  private toggleFavorite(name: string) {
    const idx = this.favorites.indexOf(name);
    if (idx === -1) this.favorites.push(name);
    else this.favorites.splice(idx, 1);
    localStorage.setItem('arsenal_favorites', JSON.stringify(this.favorites));
  }

  private handleGlobalKeys(e: KeyboardEvent) {
    if (!isCardViewerOpen()) return;
    if (e.key === 'ArrowLeft') cardViewerNav(-1);
    if (e.key === 'ArrowRight') cardViewerNav(1);
  }

  private showViewer(idx: number) {
    const templ = this.viewerList[idx];
    if (!templ) return;
    const inDeck = this.preDeckCards.some((c) => c && c.name === templ.name);
    openCardViewer({
      card: templ,
      list: this.viewerList,
      index: idx,
      actionLabel: inDeck ? i18nT('ars.remove') : i18nT('ars.equip'),
      onAction: (card) => {
        this.equipToDeck('card', card, null);
        return { close: true };
      },
    });
  }

  private showArtifactViewer(skill: Skill) {
    const modal = document.getElementById('ars-artifact-modal');
    const content = document.getElementById('ars-artifact-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <button style="position:absolute; top:12px; right:12px; width:36px; height:36px; border-radius:50%; background:linear-gradient(180deg, #5a4128, #2a1c0d); border:3px solid #0e0903; color:#ffe9a8; font-weight:900; cursor:pointer;" onclick="document.getElementById('ars-artifact-modal').classList.remove('active')">X</button>
      <div style="width:140px; height:140px; border-radius:50%; background-color:#111; background-size:cover; background-position:center; display:flex; align-items:center; justify-content:center; font-size:4rem; margin:0 auto 14px; border:4px solid #d4af37; ${skill.image ? `background-image:url('${skill.image}')` : ''}">${skill.image ? '' : skill.icon}</div>
      <div style="font-size:1.15rem; font-weight:950; margin-bottom:8px; color:#ffe9a8;">${skill.name}</div>
      <div style="font-size:0.88rem; line-height:1.45; color:#fff; margin-bottom:16px;">${skill.description}</div>
      <button class="equip-artifact" data-id="${skill.id}" style="width:80%; padding:12px; background:linear-gradient(180deg, #b8f54d 0%, #4a9b1f 100%); border:3px solid #0e1f00; border-radius:14px; font-size:0.82rem; color:#0f1f00; font-weight:950; cursor:pointer;">${i18nT('ars.equipVerb')}</button>
    `;

    setTimeout(() => {
      const btn = content.querySelector('.equip-artifact') as HTMLElement;
      btn?.addEventListener('click', () => {
        this.equipToDeck('artifact', skill, null);
        modal.classList.remove('active');
      });
    }, 10);

    modal.classList.add('active');
    gsap.fromTo(content, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.5)' });
  }
}
