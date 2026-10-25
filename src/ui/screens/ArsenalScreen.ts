import '../styles/Arsenal.css';
import { Skill } from '../../core/GameEngine';
import { SoundManager } from '../utils/SoundManager';
import { bindLongPress } from '../utils/InputUtils';
import { thumbFor } from '../utils/thumb';
import { openCardViewer } from '../components/CardViewer';
import {
  renderMatrixCardSVG,
  renderMatrixCardBackSVG,
  getMergedGameTemplatesSync,
  getMergedGameTemplates,
  resolveMatrixOrGameCard,
} from './forge_v2/utils/HestridiaMatrixRenderer';
import {
  renderOrnateWindowHtml,
  renderGoldDividerHHtml,
  renderGoldDividerVHtml,
} from '../components/OrnateFrameHtml';

export function getCardRank(card: any): string {
  if (!card) return 'C';
  const raw =
    card.rank ||
    card.cardRank ||
    card.cardData?.cardRank ||
    card.matrixCard?.cardRank ||
    card.meta?.rank;
  if (raw && typeof raw === 'string') {
    const u = raw.toUpperCase().trim();
    if (['S', 'A', 'B', 'C', 'D'].includes(u)) return u;
  }
  const rarity = (card.preferredRarity || card.rarity || '').toLowerCase();
  if (rarity === 'legendary' || rarity === 'mitica' || rarity === 'mítica') return 'S';
  if (rarity === 'epic' || rarity === 'épica' || rarity === 'epica') return 'A';
  if (rarity === 'rare' || rarity === 'rara') return 'B';
  return 'C';
}

export function getCardRankWeight(card: any): number {
  const rank = getCardRank(card);
  const weights: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
  return weights[rank] || 1;
}

export function sortStackInstances(instances: any[]): any[] {
  return [...instances].sort((a, b) => {
    const wA = getCardRankWeight(a);
    const wB = getCardRankWeight(b);
    if (wB !== wA) return wB - wA;
    const pvA = Number(a.pv || a.basePv || a.pvNumber || 0);
    const pvB = Number(b.pv || b.basePv || b.pvNumber || 0);
    if (pvB !== pvA) return pvB - pvA;
    const atkA = Number(a.atk || a.baseAtk || a.maxDamage || 0);
    const atkB = Number(b.atk || b.baseAtk || a.maxDamage || 0);
    return atkB - atkA;
  });
}

export class ArsenalScreen {
  protected templates: any[];
  protected artifacts: Skill[];
  protected boards: string[];

  protected activeTab: 'cards' | 'artifacts' | 'boards' = 'cards';
  protected gridSize: 2 | 3 | 4 = 3;
  protected searchQuery = '';
  protected rarityFilter: 'all' | 'common' | 'rare' | 'epic' | 'legendary' = 'all';
  protected favorites: string[] = [];
  protected isStacked = false;

  protected preDeckCards: (any | null)[] = Array(12).fill(null);
  protected preDeckArtifacts: (Skill | null)[] = [null, null, null];
  protected selectedBoard = '';

  protected currentSlot = 1;
  protected isPreDeckCollapsed = false;
  protected showConfirmSwitch = false;
  protected targetSlot = 1;
  protected inspectedArtifact: Skill | null = null;
  protected isPrepMode = false;
  protected isLandscapeMode = false;
  protected lastScrollTop = 0;

  protected onConfirm?: (cards: any[], artifacts: Skill[], board: string) => void;

  constructor(
    templates: any[],
    artifacts: Skill[],
    boards: string[],
    onConfirm?: (cards: any[], artifacts: Skill[], board: string) => void,
    isPrepMode = false
  ) {
    this.templates = getMergedGameTemplatesSync(templates);
    this.artifacts = artifacts;
    this.boards = boards?.length
      ? boards
      : [
          '/cards/Arena_Bioluminescente_dos_Cogumelos.png',
          '/cards/Batalha_dos_slimes_fant_sticos.png',
          '/cards/05_gelo.png',
        ];
    this.onConfirm = onConfirm;
    this.isPrepMode = isPrepMode;
    this.isPreDeckCollapsed = false;

    const favs = localStorage.getItem('arsenal_favorites');
    if (favs) {
      try {
        this.favorites = JSON.parse(favs);
      } catch (_) {}
    }

    const savedStacked = localStorage.getItem('arsenal_stack_copies');
    if (savedStacked !== null) {
      this.isStacked = savedStacked === 'true';
    }

    const activeSlot = localStorage.getItem('arsenal_active_slot');
    this.currentSlot = activeSlot ? parseInt(activeSlot, 10) : 1;

    this.selectedBoard = this.boards[0] || '';
    this.loadDeckFromSlot(this.currentSlot);
  }

  protected resolveCardEntry(nameOrObj: any): any | null {
    if (!nameOrObj) return null;
    if (typeof nameOrObj === 'object' && (nameOrObj.name || nameOrObj.title || nameOrObj.id)) {
      return (
        resolveMatrixOrGameCard(nameOrObj.name || nameOrObj.title || nameOrObj.id, this.templates) ||
        nameOrObj
      );
    }
    const key = String(nameOrObj);
    return (
      resolveMatrixOrGameCard(key, this.templates) ||
      this.templates.find(
        (t) =>
          t &&
          (t.name === key ||
            t.id === key ||
            String(t.name || '').toLowerCase() === key.toLowerCase())
      ) ||
      null
    );
  }

  protected loadDeckFromSlot(slot: number) {
    try {
      const slotRaw =
        localStorage.getItem(`arsenal_predeck_s${slot}`) ||
        localStorage.getItem(`arsenal_loadout_${slot}`) ||
        (slot === 1 ? localStorage.getItem('arsenal_predeck') : null);
      if (slotRaw) {
        const parsed = JSON.parse(slotRaw);
        if (Array.isArray(parsed.cards) && parsed.cards.some(Boolean)) {
          this.preDeckCards = Array(12)
            .fill(null)
            .map((_, i) => this.resolveCardEntry(parsed.cards[i]));
        } else {
          this.preDeckCards = Array(12)
            .fill(null)
            .map((_, i) => this.templates[i] || null);
        }
        if (Array.isArray(parsed.artifacts)) {
          this.preDeckArtifacts = [0, 1, 2].map((i) => {
            const artId = parsed.artifacts[i];
            if (!artId) return this.artifacts[i] || null;
            if (typeof artId === 'object') return artId;
            const cleanId = String(artId).replace(/^art_/, '');
            return (
              this.artifacts.find(
                (a) => a.id === artId || a.id === cleanId || a.name === artId
              ) ||
              this.artifacts[i] ||
              null
            );
          });
        } else {
          this.preDeckArtifacts = [
            this.artifacts[0] || null,
            this.artifacts[1] || null,
            this.artifacts[2] || null,
          ];
        }
        if (parsed.board) this.selectedBoard = parsed.board;
        return;
      }
    } catch (_) {}

    this.preDeckCards = Array(12)
      .fill(null)
      .map((_, i) => this.templates[i] || null);
    this.preDeckArtifacts = [
      this.artifacts[0] || null,
      this.artifacts[1] || null,
      this.artifacts[2] || null,
    ];
  }

  protected saveCurrentSlot() {
    const payload = {
      cards: this.preDeckCards.map((c) => (c ? c.name || c.title || c.id : null)),
      artifacts: this.preDeckArtifacts.map((a) => (a ? a.id || a.name : null)),
      board: this.selectedBoard,
    };
    const json = JSON.stringify(payload);
    localStorage.setItem(`arsenal_predeck_s${this.currentSlot}`, json);
    localStorage.setItem(`arsenal_loadout_${this.currentSlot}`, json);
    localStorage.setItem('arsenal_predeck', json);
    localStorage.setItem('arsenal_active_slot', String(this.currentSlot));
  }

  protected renderCardThumbHtml(card: any): string {
    if (!card) return `<span style="font-size:9px;">CARTA</span>`;
    return `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; position:relative;">${renderMatrixCardSVG(
      card,
      { mode: 'thumb', animateChroma: false }
    )}</div>`;
  }

  public render(container: HTMLElement) {
    getMergedGameTemplates(this.templates).then((merged) => {
      if (merged.length !== this.templates.length) {
        this.templates = merged;
        this.loadDeckFromSlot(this.currentSlot);
        if (document.body.contains(container)) this.paint(container);
      }
    });
    this.paint(container);
  }

  protected getFilteredCards(): { card: any; count: number }[] {
    let list = [...this.templates];
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          (c.name || c.title || '').toLowerCase().includes(q) ||
          (c.race || '').toLowerCase().includes(q) ||
          (c.class || '').toLowerCase().includes(q)
      );
    }
    if (this.rarityFilter !== 'all') {
      list = list.filter((c) => {
        const r = String(c.preferredRarity || c.rarity || 'common').toLowerCase();
        if (this.rarityFilter === 'legendary') return r.includes('leg') || r.includes('mit');
        if (this.rarityFilter === 'epic') return r.includes('epi');
        if (this.rarityFilter === 'rare') return r.includes('rar');
        if (this.rarityFilter === 'common')
          return !r.includes('leg') && !r.includes('mit') && !r.includes('epi') && !r.includes('rar');
        return true;
      });
    }

    list.sort((a, b) => {
      const favA = this.favorites.includes(a.name || a.id) ? 1 : 0;
      const favB = this.favorites.includes(b.name || b.id) ? 1 : 0;
      if (favB !== favA) return favB - favA;
      return getCardRankWeight(b) - getCardRankWeight(a);
    });

    if (this.isStacked) {
      const groups = new Map<string, any[]>();
      list.forEach((c) => {
        const key = String(c.name || c.title || c.id).toLowerCase().trim();
        const arr = groups.get(key) || [];
        arr.push(c);
        groups.set(key, arr);
      });
      const stackedResult: { card: any; count: number }[] = [];
      groups.forEach((instances) => {
        const sorted = sortStackInstances(instances);
        stackedResult.push({ card: sorted[0], count: sorted.length });
      });
      return stackedResult;
    }

    return list.map((card) => ({ card, count: 1 }));
  }

  protected paint(container: HTMLElement) {
    const prevScroller = container.querySelector('.arsenal-scroll-root') as HTMLElement | null;
    if (prevScroller) {
      this.lastScrollTop = prevScroller.scrollTop;
    }

    const isLandscape = this.isLandscapeMode || window.innerWidth > window.innerHeight;
    const filledCount = this.preDeckCards.filter(Boolean).length;
    const filteredEntries = this.getFilteredCards();

    const deckSelectorButtonsHtml = [1, 2, 3]
      .map((slot) =>
        this.currentSlot === slot
          ? `<button type="button" data-deck-slot="${slot}" class="btn-royal-gold" style="cursor:pointer;"><div class="btn-royal-inner" style="padding:5px 14px; font-family:var(--font-display); font-weight:800; font-size:10px; text-transform:uppercase;">Deck ${slot}</div></button>`
          : `<button type="button" data-deck-slot="${slot}" class="pearl-pill" style="padding:5px 14px; border-radius:9999px; font-family:var(--font-display); font-weight:700; font-size:10px; color:#5c4b3b; text-transform:uppercase; cursor:pointer;">Deck ${slot}</button>`
      )
      .join('');

    const deck12GridHtml = this.preDeckCards
      .map(
        (card, i) => `
        <div data-predeck-idx="${i}" style="width:100%; aspect-ratio:680/990; position:relative; overflow:hidden; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; background:${
          card ? '#0b1830' : 'rgba(8, 20, 42, 0.55)'
        }; border:${
          card ? '1.5px solid #f5d98b' : '1.5px dashed rgba(212, 168, 75, 0.55)'
        }; box-shadow:${card ? '0 8px 18px rgba(0,0,0,0.6)' : 'none'};" title="${
          card ? `${card.name || card.title} (Toque para abrir em Tela Cheia)` : `Slot ${i + 1}`
        }">
          ${
            card
              ? `
                ${this.renderCardThumbHtml(card)}
                <button type="button" data-quick-remove-predeck="${i}" style="position:absolute; top:4px; right:4px; width:20px; height:20px; border-radius:9999px; background:rgba(153,27,27,0.92); border:1px solid #fecaca; color:#fff; font-size:10px; font-weight:900; display:flex; align-items:center; justify-content:center; z-index:12; cursor:pointer; padding:0;" title="Remover do Deck">✕</button>
              `
              : `<span style="font-family:var(--font-display); font-size:11px; font-weight:800; color:rgba(245,217,139,0.6);">${i + 1}</span>`
          }
        </div>
      `
      )
      .join('');

    const artifacts3SlotsHtml = [0, 1, 2]
      .map((i) => {
        const art = this.preDeckArtifacts[i];
        return `
          <div data-preart-idx="${i}" style="width:48px; height:48px; min-width:48px; border-radius:9999px; cursor:pointer; display:flex; align-items:center; justify-content:center; overflow:hidden; border:2px solid #f5d98b; background:rgba(8,22,48,0.82); box-shadow:0 4px 12px rgba(0,0,0,0.55); flex-shrink:0;" title="${
          art?.name || `Artefato ${i + 1}`
        }">
            ${
              art
                ? (art as any).image
                  ? `<img src="${thumbFor((art as any).image)}" alt="${art.name}" style="width:100%; height:100%; object-fit:cover; display:block;" />`
                  : `<span style="font-size:18px;">${(art as any).icon || '🔮'}</span>`
                : `<span style="font-family:var(--font-display); font-size:10px; font-weight:800; color:#f5d98b;">A${i + 1}</span>`
            }
          </div>
        `;
      })
      .join('');

    const colColsCount =
      this.gridSize === 2
        ? isLandscape
          ? 3
          : 2
        : this.gridSize === 3
        ? isLandscape
          ? 4
          : 3
        : isLandscape
        ? 5
        : 4;

    const collectionItemsHtml =
      this.activeTab === 'cards'
        ? filteredEntries
            .map(({ card, count }, idx) => {
              const cardKey = card.name || card.title || card.id;
              const inDeckCount = this.preDeckCards.filter(
                (c) => c && (c.name === cardKey || c.title === cardKey || c.id === card.id)
              ).length;
              const isFav = this.favorites.includes(cardKey);
              return `
                <div data-col-card="${idx}" style="width:100%; aspect-ratio:680/990; position:relative; overflow:hidden; border-radius:11px; cursor:pointer; background:#0b1830; border:${
                inDeckCount > 0 ? '2px solid #f5d98b' : '1.5px solid rgba(212,168,75,0.42)'
              }; box-shadow:${
                inDeckCount > 0
                  ? '0 10px 22px rgba(0,0,0,0.68), 0 0 14px rgba(245,217,139,0.45)'
                  : '0 8px 18px rgba(0,0,0,0.55)'
              };">
                  ${this.renderCardThumbHtml(card)}
                  ${
                    inDeckCount > 0
                      ? `<div style="position:absolute; top:5px; left:5px; padding:2px 6px; border-radius:5px; background:rgba(6,35,86,0.94); border:1px solid #f5d98b; font-family:var(--font-display); font-weight:900; font-size:8px; color:#fff3c2; z-index:10; box-shadow:0 2px 6px rgba(0,0,0,0.6);">NO DECK x${inDeckCount}</div>`
                      : ''
                  }
                  ${
                    this.isStacked && count > 1
                      ? `<div style="position:absolute; top:5px; right:5px; padding:2px 6px; border-radius:5px; background:rgba(43,31,20,0.92); border:1px solid #d4a84b; font-family:var(--font-display); font-weight:800; font-size:8.5px; color:#fff3c2; z-index:10;">x${count}</div>`
                      : ''
                  }
                  <button type="button" data-fav-card="${idx}" style="position:absolute; bottom:5px; left:5px; width:24px; height:24px; border-radius:9999px; background:rgba(15,23,42,0.88); border:1px solid rgba(245,217,139,0.65); color:#f5d98b; font-size:11px; display:flex; align-items:center; justify-content:center; z-index:10; cursor:pointer; padding:0;" title="Favoritar">${
                isFav ? '★' : '☆'
              }</button>
                  <button type="button" data-quick-equip="${idx}" style="position:absolute; bottom:5px; right:5px; width:24px; height:24px; border-radius:9999px; background:linear-gradient(180deg, #16a34a, #14532d); border:1px solid #bbf7d0; color:#fff; font-family:var(--font-display); font-weight:900; font-size:13px; display:flex; align-items:center; justify-content:center; z-index:10; cursor:pointer; padding:0; box-shadow:0 2px 6px rgba(0,0,0,0.6);" title="Equipar Rápido no Deck">+</button>
                </div>
              `;
            })
            .join('')
        : this.activeTab === 'artifacts'
        ? this.artifacts
            .map((art, idx) => {
              const isEquipped = this.preDeckArtifacts.some((a) => a && a.id === art.id);
              return `
                <div data-col-artifact="${idx}" style="padding:12px; border-radius:14px; background:rgba(7, 18, 38, 0.68); display:flex; flex-direction:column; align-items:center; text-align:center; gap:7px; cursor:pointer; border:${
                isEquipped ? '2px solid #f5d98b' : '1.5px solid rgba(212,168,75,0.4)'
              }; box-shadow:0 6px 16px rgba(0,0,0,0.5);">
                  <div style="width:58px; height:58px; border-radius:9999px; display:flex; align-items:center; justify-content:center; font-size:22px; overflow:hidden; border:1.5px solid #d4a84b; background:#091834;">
                    ${
                      (art as any).image
                        ? `<img src="${thumbFor((art as any).image)}" alt="${art.name}" style="width:100%; height:100%; object-fit:cover; display:block;" />`
                        : `<span>${(art as any).icon || '🔮'}</span>`
                    }
                  </div>
                  <span style="font-family:var(--font-display); font-weight:800; font-size:10.5px; color:#fff3c2; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${
                    art.name
                  }</span>
                  <span style="font-family:var(--font-display); font-size:8.5px; color:#cbd5e1; line-height:1.35;">${
                    (art as any).description || 'Habilidade tática de combate.'
                  }</span>
                </div>
              `;
            })
            .join('')
        : this.boards
            .map(
              (b, idx) => `
              <div data-col-board="${idx}" style="padding:10px; border-radius:14px; background:rgba(7, 18, 38, 0.68); display:flex; flex-direction:column; align-items:center; gap:8px; cursor:pointer; border:${
                this.selectedBoard === b ? '2px solid #f5d98b' : '1.5px solid rgba(212,168,75,0.4)'
              }; box-shadow:0 6px 16px rgba(0,0,0,0.5);">
                <div style="width:100%; height:96px; border-radius:10px; overflow:hidden; border:1px solid rgba(212,168,75,0.45);">
                  <img src="${thumbFor(b)}" alt="Tabuleiro ${idx + 1}" style="width:100%; height:100%; object-fit:cover; display:block;" />
                </div>
                <span style="font-family:var(--font-display); font-weight:800; font-size:10px; color:#fff3c2; text-transform:uppercase;">TABULEIRO ${
                  idx + 1
                }</span>
              </div>
            `
            )
            .join('');

    const segmentedTabsHtml = `
      <div class="pearl-pill" style="padding:3px; border-radius:9999px; display:grid; grid-template-columns:repeat(3, 1fr); gap:4px; align-items:center;">
        ${(['cards', 'artifacts', 'boards'] as const)
          .map((tabKey) => {
            const label =
              tabKey === 'cards' ? 'CARTAS' : tabKey === 'artifacts' ? 'ARTEFATOS' : 'TABULEIROS';
            const active = this.activeTab === tabKey;
            return active
              ? `<button type="button" data-arsenal-tab="${tabKey}" class="btn-royal-gold" style="width:100%; cursor:pointer;"><div class="btn-royal-inner" style="padding:6px 10px; font-family:var(--font-display); font-weight:800; font-size:10px; text-transform:uppercase;">${label}</div></button>`
              : `<button type="button" data-arsenal-tab="${tabKey}" style="background:transparent; border:none; padding:6px 10px; font-family:var(--font-display); font-weight:800; font-size:10px; color:#5c4b3b; text-transform:uppercase; text-align:center; cursor:pointer;">${label}</button>`;
          })
          .join('')}
      </div>
    `;

    const modalsHtml = `
      ${
        this.inspectedArtifact
          ? `
        <div id="arsenal-art-modal-backdrop" style="position:fixed; inset:0; z-index:1500; background:rgba(4,8,20,0.84); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;">
          <div style="width:100%; max-width:350px;">
            ${renderOrnateWindowHtml({
              title: 'ARTEFATO',
              compactHeader: true,
              showClose: true,
              closeBtnAttrs: 'id="arsenal-art-modal-close"',
              bodyStyle: 'padding: 12px 16px 16px; gap: 10px;',
              childrenHtml: `
                <div style="display:flex; flex-direction:column; align-items:center; text-align:center; gap:6px;">
                  <div class="wire-slot" style="width:60px; height:60px; border-radius:9999px; display:flex; align-items:center; justify-content:center; font-size:20px; overflow:hidden;">
                    ${
                      (this.inspectedArtifact as any).image
                        ? `<img src="${thumbFor((this.inspectedArtifact as any).image)}" alt="${
                            this.inspectedArtifact.name
                          }" style="width:100%; height:100%; object-fit:cover; display:block;" />`
                        : `<span>${(this.inspectedArtifact as any).icon || '🔮'}</span>`
                    }
                  </div>
                  <span style="font-family:var(--font-display); font-weight:800; font-size:12px; color:#2b1f14; text-transform:uppercase;">${
                    this.inspectedArtifact.name
                  }</span>
                  <div class="pearl-pill" style="padding:2px 10px; border-radius:9999px; font-family:var(--font-display); font-weight:700; font-size:8px; color:#8c6518;">ARTEFATO DE COMBATE</div>
                </div>
                <div class="wire-slot" style="min-height:56px; padding:8px; border-radius:10px; display:flex; align-items:center; justify-content:center; text-align:center;">
                  <span style="font-size:9.5px; line-height:1.4;">${
                    (this.inspectedArtifact as any).description ||
                    'Concede bônus estratégico às cartas aliadas durante o combate.'
                  }</span>
                </div>
                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; padding-top:4px;">
                  ${[0, 1, 2]
                    .map(
                      (slotIdx) => `
                    <button type="button" data-equip-art-slot="${slotIdx}" class="btn-royal-gold" style="cursor:pointer;">
                      <div class="btn-royal-inner" style="padding:6px 4px; font-family:var(--font-display); font-weight:800; font-size:9px; text-transform:uppercase;">SLOT ${
                        slotIdx + 1
                      }</div>
                    </button>
                  `
                    )
                    .join('')}
                </div>
              `,
            })}
          </div>
        </div>
      `
          : ''
      }
      ${
        this.showConfirmSwitch
          ? `
        <div style="position:fixed; inset:0; z-index:1500; background:rgba(4,8,20,0.84); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;">
          <div style="width:100%; max-width:350px;">
            ${renderOrnateWindowHtml({
              title: 'TROCAR DECK?',
              compactHeader: true,
              showClose: true,
              closeBtnAttrs: 'id="arsenal-switch-cancel"',
              bodyStyle: 'padding: 12px 16px 16px; gap: 10px;',
              childrenHtml: `
                <div class="wire-slot" style="height:52px; padding:0 12px; border-radius:10px; text-align:center; display:flex; align-items:center; justify-content:center;">
                  <span style="font-family:var(--font-display); font-weight:700; font-size:11px;">CARREGAR DECK ${this.targetSlot}?</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px;">
                  <button type="button" id="arsenal-switch-save" class="btn-royal-gold" style="width:100%; cursor:pointer;">
                    <div class="btn-royal-inner" style="padding:7px 12px; font-family:var(--font-display); font-weight:800; font-size:10px; text-transform:uppercase;">SALVAR E TROCAR</div>
                  </button>
                  <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:6px;">
                    <button type="button" id="arsenal-switch-discard" class="btn-pearl-gold" style="width:100%; cursor:pointer;">
                      <div class="btn-pearl-inner" style="padding:6px 8px; font-family:var(--font-display); font-weight:800; font-size:9px; text-transform:uppercase;">TROCAR SEM SALVAR</div>
                    </button>
                    <button type="button" id="arsenal-switch-abort" class="btn-pearl-gold" style="width:100%; cursor:pointer;">
                      <div class="btn-pearl-inner" style="padding:6px 8px; font-family:var(--font-display); font-weight:800; font-size:9px; text-transform:uppercase;">CANCELAR</div>
                    </button>
                  </div>
                </div>
              `,
            })}
          </div>
        </div>
      `
          : ''
      }
    `;

    const cardBackSvgHtml = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:hidden;">${renderMatrixCardBackSVG()}</div>`;

    if (isLandscape) {
      const topPanelHtml = `
        <div style="padding:12px 14px; border-radius:18px; background:rgba(7, 18, 38, 0.54); border:1.5px solid rgba(212, 168, 75, 0.45); backdrop-filter:blur(6px); display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-family:var(--font-display); font-weight:900; font-size:13px; color:#fff3c2; text-shadow:0 2px 5px rgba(0,0,0,0.85); letter-spacing:0.06em; text-transform:uppercase;">PREPARAÇÃO DO DECK</span>
              <div style="display:flex; gap:6px;">
                ${deckSelectorButtonsHtml}
              </div>
            </div>
            <div class="pearl-pill" style="padding:3px 10px; border-radius:9999px; font-family:var(--font-display); font-weight:800; font-size:10px; color:#8c6518;">${filledCount}/12 CARTAS</div>
          </div>

          <div style="display:grid; grid-template-columns:68% 14px 1fr; gap:12px; align-items:center;">
            <div style="display:grid; grid-template-columns:repeat(6, minmax(0, 1fr)); gap:8px;">
              ${deck12GridHtml}
            </div>
            <div style="height:100%; display:flex; justify-content:center;">
              ${renderGoldDividerVHtml('margin:0;')}
            </div>
            <div style="display:flex; flex-direction:column; justify-content:space-between; gap:10px;">
              <div>
                <span style="font-family:var(--font-display); font-weight:800; font-size:10px; color:#f5d98b; letter-spacing:0.06em; text-transform:uppercase; display:block; margin-bottom:6px; text-align:center;">ARTEFATOS</span>
                <div style="display:flex; justify-content:center; gap:10px;">
                  ${artifacts3SlotsHtml}
                </div>
              </div>
              ${renderGoldDividerHHtml('margin: 2px 0;')}
              <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px;">
                <div data-arsenal-tab="boards" style="height:64px; border-radius:10px; overflow:hidden; cursor:pointer; position:relative; border:1.5px solid #d4a84b;" title="Tabuleiro Selecionado">
                  ${
                    this.selectedBoard
                      ? `<img src="${thumbFor(this.selectedBoard)}" alt="Tabuleiro" style="width:100%; height:100%; object-fit:cover; display:block;" />`
                      : `<span style="font-size:9px; color:#fff3c2;">TABULEIRO</span>`
                  }
                </div>
                <div style="height:64px; border-radius:10px; overflow:hidden; position:relative; border:1.5px solid #d4a84b;" title="Verso Oficial da Carta">
                  ${cardBackSvgHtml}
                </div>
              </div>
            </div>
          </div>

          <div style="display:flex; justify-content:center; gap:12px; padding-top:4px;">
            <button type="button" id="ars-confirm" class="btn-royal-gold" style="min-width:190px; cursor:pointer;">
              <div class="btn-royal-inner" style="padding:8px 18px; font-family:var(--font-display); font-weight:900; font-size:11px; letter-spacing:0.08em; text-transform:uppercase;">
                ${this.isPrepMode ? '⚔️ INICIAR BATALHA' : '💾 SALVAR DECK'}
              </div>
            </button>
            <button type="button" id="arsenal-autofill-deck" class="btn-pearl-gold" style="min-width:160px; cursor:pointer;">
              <div class="btn-pearl-inner" style="padding:8px 18px; font-family:var(--font-display); font-weight:900; font-size:11px; letter-spacing:0.06em; text-transform:uppercase;">AUTO-PREENCHER</div>
            </button>
          </div>
        </div>
      `;

      const bottomPanelHtml = `
        <div style="display:flex; flex-direction:column; gap:12px; width:100%;">
          <div style="padding:10px 14px; border-radius:16px; background:rgba(7, 18, 38, 0.56); border:1.5px solid rgba(212, 168, 75, 0.45); backdrop-filter:blur(6px); display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px;">
            <div style="min-width:250px;">${segmentedTabsHtml}</div>
            <div class="pearl-pill" style="padding:5px 12px; border-radius:9999px; display:flex; align-items:center; gap:6px; flex:1; min-width:160px;">
              <span style="color:#8c7a64; font-size:11px;">🔍</span>
              <input id="arsenal-search-input" type="text" value="${this.searchQuery}" placeholder="Buscar carta na coleção (${filteredEntries.length})..." style="background:transparent; border:none; outline:none; font-family:var(--font-display); font-size:10.5px; color:#2b1f14; width:100%;" />
            </div>
            <select id="arsenal-rarity-select" class="pearl-pill" style="padding:5px 10px; border-radius:9999px; font-family:var(--font-display); font-weight:700; font-size:9.5px; color:#3a2b1c; outline:none; cursor:pointer;">
              <option value="all" ${this.rarityFilter === 'all' ? 'selected' : ''}>Todas Raridades (${
        filteredEntries.length
      }) ⌄</option>
              <option value="common" ${this.rarityFilter === 'common' ? 'selected' : ''}>Comum</option>
              <option value="rare" ${this.rarityFilter === 'rare' ? 'selected' : ''}>Rara</option>
              <option value="epic" ${this.rarityFilter === 'epic' ? 'selected' : ''}>Épica</option>
              <option value="legendary" ${this.rarityFilter === 'legendary' ? 'selected' : ''}>Lendária & Mítica</option>
            </select>
            <div class="pearl-pill" style="padding:2px; border-radius:9999px; display:flex; align-items:center; gap:2px;">
              ${([2, 3, 4] as const)
                .map(
                  (g) => `
                <button type="button" data-grid-size="${g}" style="padding:4px 9px; border-radius:9999px; border:none; font-family:var(--font-display); font-weight:800; font-size:9px; cursor:pointer; background:${
                    this.gridSize === g ? '#062356' : 'transparent'
                  }; color:${this.gridSize === g ? '#f5d98b' : '#5c4b3b'};">${g}x</button>
              `
                )
                .join('')}
            </div>
            <button type="button" id="arsenal-stack-toggle" class="pearl-pill" style="padding:4px 10px; border-radius:9999px; display:flex; align-items:center; gap:6px; cursor:pointer;">
              <span style="font-family:var(--font-display); font-weight:800; font-size:9px; color:#5c4b3b; text-transform:uppercase;">Agrupar</span>
              <div style="width:24px; height:14px; border-radius:9999px; background:${
                this.isStacked ? '#082b66' : '#9ea4ab'
              }; border:1px solid #d4a84b; padding:1px; display:flex; align-items:center; justify-content:${
                this.isStacked ? 'flex-end' : 'flex-start'
              };">
                <div style="width:9px; height:9px; border-radius:9999px; background:#f5d98b;"></div>
              </div>
            </button>
          </div>

          <div style="display:grid; grid-template-columns:repeat(${colColsCount}, minmax(0, 1fr)); gap:12px; width:100%;">
            ${collectionItemsHtml}
          </div>
        </div>
      `;

      container.innerHTML = `
        <div class="arsenal-scroll-root nova-scroll" style="width:100%; height:100%; overflow-y:auto; overflow-x:hidden; padding:56px 16px 100px 16px; box-sizing:border-box; display:flex; justify-content:center; align-items:flex-start; background:transparent;">
          <div style="width:100%; max-width:940px; margin:0 auto; display:flex; flex-direction:column; gap:14px;">
            ${topPanelHtml}
            ${renderGoldDividerHHtml('margin: 2px 0;')}
            ${bottomPanelHtml}
          </div>
        </div>
        ${modalsHtml}
      `;
    } else {
      const portraitContentHtml = `
        <div style="padding:10px 12px; border-radius:16px; background:rgba(7, 18, 38, 0.56); border:1.5px solid rgba(212, 168, 75, 0.45); backdrop-filter:blur(6px); display:flex; flex-direction:column; gap:9px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <span style="font-family:var(--font-display); font-weight:900; font-size:12px; color:#fff3c2; text-shadow:0 2px 4px rgba(0,0,0,0.88); text-transform:uppercase;">PREPARAÇÃO DO DECK</span>
            <button type="button" id="arsenal-collapse-toggle" class="pearl-pill" style="padding:3px 10px; border-radius:9999px; font-family:var(--font-display); font-weight:800; font-size:9px; color:#8c6518; cursor:pointer;">
              ${this.isPreDeckCollapsed ? `Expandir (${filledCount}/12) ⌄` : `Recolher (${filledCount}/12) ⌃`}
            </button>
          </div>
          <div style="display:flex; gap:6px;">
            ${deckSelectorButtonsHtml}
          </div>
          ${
            !this.isPreDeckCollapsed
              ? `
            <div style="display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:7px; padding-top:2px;">
              ${deck12GridHtml}
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding-top:4px;">
              <div style="display:flex; align-items:center; gap:7px;">
                ${artifacts3SlotsHtml}
              </div>
              <div style="display:flex; flex-direction:column; gap:6px;">
                <button type="button" id="ars-confirm" class="btn-royal-gold" style="cursor:pointer;">
                  <div class="btn-royal-inner" style="padding:6px 14px; font-family:var(--font-display); font-weight:900; font-size:9.5px; text-transform:uppercase;">
                    ${this.isPrepMode ? '⚔️ BATALHAR' : '💾 SALVAR DECK'}
                  </div>
                </button>
                <button type="button" id="arsenal-autofill-deck" class="btn-pearl-gold" style="cursor:pointer;">
                  <div class="btn-pearl-inner" style="padding:5px 14px; font-family:var(--font-display); font-weight:800; font-size:9px; text-transform:uppercase;">AUTO-PREENCHER</div>
                </button>
              </div>
            </div>
          `
              : ''
          }
        </div>

        ${renderGoldDividerHHtml('margin: 2px 0;')}

        <div style="display:flex; flex-direction:column; gap:10px; width:100%;">
          <div style="padding:10px; border-radius:16px; background:rgba(7, 18, 38, 0.56); border:1.5px solid rgba(212, 168, 75, 0.45); backdrop-filter:blur(6px); display:flex; flex-direction:column; gap:8px;">
            ${segmentedTabsHtml}

            <div style="display:flex; flex-direction:column; gap:6px;">
              <div class="pearl-pill" style="padding:6px 12px; border-radius:9999px; display:flex; align-items:center; gap:8px;">
                <span style="color:#8c7a64; font-size:10.5px;">🔍</span>
                <input id="arsenal-search-input" type="text" value="${this.searchQuery}" placeholder="Buscar carta (${
        filteredEntries.length
      })..." style="background:transparent; border:none; outline:none; font-family:var(--font-display); font-size:10.5px; color:#2b1f14; width:100%;" />
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                <select id="arsenal-rarity-select" class="pearl-pill" style="padding:4px 9px; border-radius:9999px; font-family:var(--font-display); font-weight:700; font-size:9px; color:#3a2b1c; outline:none; cursor:pointer;">
                  <option value="all" ${this.rarityFilter === 'all' ? 'selected' : ''}>Todas (${
        filteredEntries.length
      }) ⌄</option>
                  <option value="common" ${this.rarityFilter === 'common' ? 'selected' : ''}>Comum</option>
                  <option value="rare" ${this.rarityFilter === 'rare' ? 'selected' : ''}>Rara</option>
                  <option value="epic" ${this.rarityFilter === 'epic' ? 'selected' : ''}>Épica</option>
                  <option value="legendary" ${this.rarityFilter === 'legendary' ? 'selected' : ''}>Lendária</option>
                </select>
                <div class="pearl-pill" style="padding:2px; border-radius:9999px; display:flex; align-items:center; gap:2px;">
                  ${([2, 3, 4] as const)
                    .map(
                      (g) => `
                    <button type="button" data-grid-size="${g}" style="padding:3px 8px; border-radius:9999px; border:none; font-family:var(--font-display); font-weight:800; font-size:8.5px; cursor:pointer; background:${
                        this.gridSize === g ? '#062356' : 'transparent'
                      }; color:${this.gridSize === g ? '#f5d98b' : '#5c4b3b'};">${g}x</button>
                  `
                    )
                    .join('')}
                </div>
                <button type="button" id="arsenal-stack-toggle" class="pearl-pill" style="padding:3px 9px; border-radius:9999px; display:flex; align-items:center; gap:5px; cursor:pointer;">
                  <span style="font-family:var(--font-display); font-weight:800; font-size:8.5px; color:#5c4b3b;">Agrupar</span>
                  <div style="width:22px; height:12px; border-radius:9999px; background:${
                    this.isStacked ? '#082b66' : '#9ea4ab'
                  }; border:1px solid #d4a84b; padding:1px; display:flex; align-items:center; justify-content:${
                    this.isStacked ? 'flex-end' : 'flex-start'
                  };">
                    <div style="width:8px; height:8px; border-radius:9999px; background:#f5d98b;"></div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(${colColsCount}, minmax(0, 1fr)); gap:9px; width:100%;">
            ${collectionItemsHtml}
          </div>
        </div>
      `;

      container.innerHTML = `
        <div class="arsenal-scroll-root nova-scroll" style="width:100%; height:100%; overflow-y:auto; overflow-x:hidden; padding:64px 10px 108px 10px; box-sizing:border-box; display:flex; justify-content:center; align-items:flex-start; background:transparent;">
          <div style="width:100%; max-width:460px; margin:0 auto; display:flex; flex-direction:column; gap:10px;">
            ${portraitContentHtml}
          </div>
        </div>
        ${modalsHtml}
      `;
    }

    const newScroller = container.querySelector('.arsenal-scroll-root') as HTMLElement | null;
    if (newScroller && this.lastScrollTop > 0) {
      newScroller.scrollTop = this.lastScrollTop;
    }

    this.bindEvents(container, filteredEntries);
  }

  protected bindEvents(container: HTMLElement, filteredEntries: { card: any; count: number }[]) {
    const scroller = container.querySelector('.arsenal-scroll-root') as HTMLElement | null;
    if (scroller) {
      let prevY = scroller.scrollTop;
      scroller.addEventListener(
        'scroll',
        () => {
          const curY = scroller.scrollTop;
          const dy = curY - prevY;
          this.lastScrollTop = curY;
          if (curY > 36 && dy > 4) {
            document.body.classList.add('hub-scroll-hide-bars');
          } else if (dy < -4 || curY <= 24) {
            document.body.classList.remove('hub-scroll-hide-bars');
          }
          prevY = curY;
        },
        { passive: true }
      );
    }

    container.querySelector('#arsenal-collapse-toggle')?.addEventListener('click', () => {
      SoundManager.play('ui_click');
      this.isPreDeckCollapsed = !this.isPreDeckCollapsed;
      this.paint(container);
    });

    container.querySelectorAll<HTMLElement>('[data-deck-slot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slot = Number(btn.dataset.deckSlot || 1);
        if (slot === this.currentSlot) return;
        SoundManager.play('ui_click');
        this.targetSlot = slot;
        this.showConfirmSwitch = true;
        this.paint(container);
      });
    });

    container.querySelector('#arsenal-switch-save')?.addEventListener('click', () => {
      SoundManager.play('ui_confirm');
      this.saveCurrentSlot();
      this.currentSlot = this.targetSlot;
      this.loadDeckFromSlot(this.currentSlot);
      this.showConfirmSwitch = false;
      this.paint(container);
    });

    container.querySelector('#arsenal-switch-discard')?.addEventListener('click', () => {
      SoundManager.play('ui_click');
      this.currentSlot = this.targetSlot;
      this.loadDeckFromSlot(this.currentSlot);
      this.showConfirmSwitch = false;
      this.paint(container);
    });

    const closeSwitch = () => {
      SoundManager.play('ui_cancel');
      this.showConfirmSwitch = false;
      this.paint(container);
    };
    container.querySelector('#arsenal-switch-cancel')?.addEventListener('click', closeSwitch);
    container.querySelector('#arsenal-switch-abort')?.addEventListener('click', closeSwitch);

    container.querySelector('#ars-confirm')?.addEventListener('click', () => {
      SoundManager.play('ui_confirm');
      this.saveCurrentSlot();
      if (this.onConfirm) {
        const validCards = this.preDeckCards.filter(Boolean);
        const validArts = this.preDeckArtifacts.filter((a): a is Skill => !!a);
        this.onConfirm(validCards, validArts, this.selectedBoard);
      }
    });

    container.querySelector('#arsenal-autofill-deck')?.addEventListener('click', () => {
      SoundManager.play('ui_confirm');
      const sorted = sortStackInstances(this.templates);
      this.preDeckCards = Array(12)
        .fill(null)
        .map((_, idx) => sorted[idx % sorted.length] || null);
      this.saveCurrentSlot();
      this.paint(container);
    });

    container.querySelectorAll<HTMLElement>('[data-quick-remove-predeck]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const idx = Number(btn.dataset.quickRemovePredeck || 0);
        if (this.preDeckCards[idx]) {
          SoundManager.play('ui_cancel');
          this.preDeckCards[idx] = null;
          this.saveCurrentSlot();
          this.paint(container);
        }
      });
    });

    container.querySelectorAll<HTMLElement>('[data-predeck-idx]').forEach((slotEl) => {
      const idx = Number(slotEl.dataset.predeckIdx || 0);
      const cardInSlot = this.preDeckCards[idx];
      if (!cardInSlot) return;

      const openPreDeckFullscreen = () => {
        const filledSlots = this.preDeckCards
          .map((c, slotIndex) => ({ c, slotIndex }))
          .filter((item): item is { c: any; slotIndex: number } => Boolean(item.c));
        const list = filledSlots.map((item) => item.c);
        const viewerIdx = Math.max(
          0,
          filledSlots.findIndex((item) => item.slotIndex === idx)
        );
        SoundManager.play('ui_click');
        openCardViewer({
          card: cardInSlot,
          list,
          index: viewerIdx,
          actionLabel: 'REMOVER DO DECK',
          onAction: (selectedCard) => {
            const targetKey = selectedCard?.name || selectedCard?.title || selectedCard?.id;
            const slotToRemove =
              this.preDeckCards[idx] &&
              (this.preDeckCards[idx].name === targetKey ||
                this.preDeckCards[idx].title === targetKey ||
                this.preDeckCards[idx].id === selectedCard?.id)
                ? idx
                : this.preDeckCards.findIndex(
                    (c) => c && (c.name === targetKey || c.title === targetKey || c.id === selectedCard?.id)
                  );
            if (slotToRemove !== -1) {
              SoundManager.play('ui_cancel');
              this.preDeckCards[slotToRemove] = null;
              this.saveCurrentSlot();
              this.paint(container);
            }
            return { close: true };
          },
        });
      };

      bindLongPress(slotEl, openPreDeckFullscreen);
      slotEl.addEventListener('click', (ev) => {
        if ((ev.target as HTMLElement).closest('[data-quick-remove-predeck]')) return;
        openPreDeckFullscreen();
      });
    });

    container.querySelectorAll<HTMLElement>('[data-preart-idx]').forEach((slotEl) => {
      slotEl.addEventListener('click', () => {
        const idx = Number(slotEl.dataset.preartIdx || 0);
        const art = this.preDeckArtifacts[idx];
        if (art) {
          this.inspectedArtifact = art;
          this.paint(container);
        } else {
          this.activeTab = 'artifacts';
          this.paint(container);
        }
      });
    });

    container.querySelectorAll<HTMLElement>('[data-arsenal-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.arsenalTab as 'cards' | 'artifacts' | 'boards';
        if (tab) {
          SoundManager.play('ui_click');
          this.activeTab = tab;
          this.paint(container);
        }
      });
    });

    const searchInput = container.querySelector<HTMLInputElement>('#arsenal-search-input');
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value;
      this.paint(container);
      const refocused = container.querySelector<HTMLInputElement>('#arsenal-search-input');
      if (refocused) {
        refocused.focus();
        refocused.setSelectionRange(refocused.value.length, refocused.value.length);
      }
    });

    const raritySelect = container.querySelector<HTMLSelectElement>('#arsenal-rarity-select');
    raritySelect?.addEventListener('change', () => {
      this.rarityFilter = raritySelect.value as any;
      this.paint(container);
    });

    container.querySelectorAll<HTMLElement>('[data-grid-size]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const g = Number(btn.dataset.gridSize || 3) as 2 | 3 | 4;
        SoundManager.play('ui_click');
        this.gridSize = g;
        this.paint(container);
      });
    });

    container.querySelector('#arsenal-stack-toggle')?.addEventListener('click', () => {
      SoundManager.play('ui_click');
      this.isStacked = !this.isStacked;
      localStorage.setItem('arsenal_stack_copies', String(this.isStacked));
      this.paint(container);
    });

    const openCollectionCardFullscreen = (idx: number) => {
      const entry = filteredEntries[idx];
      if (!entry?.card) return;
      const collectionList = filteredEntries.map((e) => e.card);
      SoundManager.play('ui_click');
      openCardViewer({
        card: entry.card,
        list: collectionList,
        index: idx,
        actionLabel: 'EQUIPAR NO DECK',
        getActionLabel: (c) => {
          const emptySlot = this.preDeckCards.findIndex((s) => !s);
          const key = c?.name || c?.title || c?.id;
          const inDeck = this.preDeckCards.some(
            (s) => s && (s.name === key || s.title === key || s.id === c?.id)
          );
          if (emptySlot === -1 && inDeck) return 'REMOVER DO DECK';
          return emptySlot !== -1 ? 'EQUIPAR NO DECK' : 'SUBSTITUIR SLOT 12';
        },
        onAction: (selectedCard) => {
          const emptySlot = this.preDeckCards.findIndex((s) => !s);
          const key = selectedCard?.name || selectedCard?.title || selectedCard?.id;
          const existingIdx = this.preDeckCards.findIndex(
            (s) => s && (s.name === key || s.title === key || s.id === selectedCard?.id)
          );
          if (emptySlot !== -1) {
            SoundManager.play('ui_confirm');
            this.preDeckCards[emptySlot] = selectedCard;
            this.saveCurrentSlot();
            this.paint(container);
          } else if (existingIdx !== -1) {
            SoundManager.play('ui_cancel');
            this.preDeckCards[existingIdx] = null;
            this.saveCurrentSlot();
            this.paint(container);
          } else {
            SoundManager.play('ui_confirm');
            this.preDeckCards[11] = selectedCard;
            this.saveCurrentSlot();
            this.paint(container);
          }
          return { close: true };
        },
      });
    };

    container.querySelectorAll<HTMLElement>('[data-quick-equip]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const idx = Number(btn.dataset.quickEquip || 0);
        const entry = filteredEntries[idx];
        if (!entry?.card) return;
        const emptySlot = this.preDeckCards.findIndex((c) => !c);
        if (emptySlot !== -1) {
          SoundManager.play('ui_confirm');
          this.preDeckCards[emptySlot] = entry.card;
          this.saveCurrentSlot();
          this.paint(container);
        } else {
          openCollectionCardFullscreen(idx);
        }
      });
    });

    container.querySelectorAll<HTMLElement>('[data-col-card]').forEach((el) => {
      const idx = Number(el.dataset.colCard || 0);
      bindLongPress(el, () => {
        openCollectionCardFullscreen(idx);
      });
      el.addEventListener('click', (ev) => {
        if (
          (ev.target as HTMLElement).closest('[data-quick-equip]') ||
          (ev.target as HTMLElement).closest('[data-fav-card]')
        )
          return;
        openCollectionCardFullscreen(idx);
      });
    });

    container.querySelectorAll<HTMLElement>('[data-fav-card]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const idx = Number(btn.dataset.favCard || 0);
        const card = filteredEntries[idx]?.card;
        if (!card) return;
        const key = card.name || card.title || card.id;
        SoundManager.play('ui_click');
        if (this.favorites.includes(key)) {
          this.favorites = this.favorites.filter((f) => f !== key);
        } else {
          this.favorites.push(key);
        }
        localStorage.setItem('arsenal_favorites', JSON.stringify(this.favorites));
        this.paint(container);
      });
    });

    container.querySelectorAll<HTMLElement>('[data-col-artifact]').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = Number(el.dataset.colArtifact || 0);
        const art = this.artifacts[idx];
        if (art) {
          SoundManager.play('ui_click');
          this.inspectedArtifact = art;
          this.paint(container);
        }
      });
    });

    container.querySelector('#arsenal-art-modal-close')?.addEventListener('click', () => {
      this.inspectedArtifact = null;
      this.paint(container);
    });

    container.querySelectorAll<HTMLElement>('[data-equip-art-slot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slotIdx = Number(btn.dataset.equipArtSlot || 0);
        if (this.inspectedArtifact) {
          SoundManager.play('ui_confirm');
          this.preDeckArtifacts[slotIdx] = this.inspectedArtifact;
          this.inspectedArtifact = null;
          this.saveCurrentSlot();
          this.paint(container);
        }
      });
    });

    container.querySelectorAll<HTMLElement>('[data-col-board]').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = Number(el.dataset.colBoard || 0);
        const b = this.boards[idx];
        if (b) {
          SoundManager.play('ui_confirm');
          this.selectedBoard = b;
          this.saveCurrentSlot();
          this.paint(container);
        }
      });
    });
  }
}
