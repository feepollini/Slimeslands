import { CARD_TEMPLATES, SKILL_POOL } from '../../core/constants';
import { ProgressionManager } from '../../core/ProgressionManager';
import { SoundManager } from '../utils/SoundManager';
import { thumbFor } from '../utils/thumb';
import { openCardViewer } from '../components/CardViewer';
import {
  renderMatrixCardSVG,
  getMergedGameTemplatesSync,
  getMergedGameTemplates,
  resolveMatrixOrGameCard,
  getAvailableCustomDecks,
  syncActiveDeckWithArsenal,
} from './forge_v2/utils/HestridiaMatrixRenderer';
import { t } from '../../core/i18n';
import storeData from '../../core/store.json';
import { BoosterPackViewer } from '../components/booster/BoosterPackViewer';
import { resolveBoosterCards } from './forge_v2/utils/boosterResolver';
import {
  renderOrnateWindowHtml,
  renderGoldDividerHHtml,
  renderGoldDividerVHtml,
  renderCarouselArrowButtonHtml,
} from '../components/OrnateFrameHtml';

const VALID_BOOSTER_FALLBACK_BY_ID: Record<string, string> = {
  booster_starter: '/cards/Batalha_dos_slimes_fant_sticos.png',
  booster_divinos: '/cards/Cavaleiro_slime_branco_de__ries.png',
  booster_elementais: '/cards/10_lava.png',
  booster_sombras: '/cards/20_eclipse.png',
  booster_guerreiros: '/cards/Cavaleiro_slime_prateado_bloqueia_o_golpe-16.png',
  booster_gourmet: '/cards/Desfile_de_seis_slimes_deliciosos.png',
  booster_grimorio: '/cards/Slime_alquimista_desviando_da_explos_o-10.png',
};

const BROKEN_IMAGE_REMAP: Record<string, string> = {
  '/cards/01_sol.png': '/cards/Cavaleiro_slime_branco_de__ries.png',
  '/cards/10 lava.png': '/cards/10_lava.png',
  '/cards/halloween_original_4_ceifador.png': '/cards/20_eclipse.png',
  '/cards/5241c360-0176-4455-87ca-d6263cb64e8e.png':
    '/cards/Cavaleiro_slime_prateado_bloqueia_o_golpe-16.png',
  '/cards/Slime coelhinho leva ovo brilhante ao ninho-1.png':
    '/cards/Desfile_de_seis_slimes_deliciosos.png',
  '/cards/item 01.png': '/cards/Slime_alquimista_desviando_da_explos_o-10.png',
};

export class StoreScreen {
  private static activeTimers: number[] = [];

  protected data: any;
  protected bannerIdx = 0;
  protected dailyPage = 0;
  protected rarePage = 0;
  protected artPage = 0;
  protected readonly rarePageSize = 6;
  protected readonly artPageSize = 4;

  protected boosterActiveIdx = 0;
  protected boosterQty = 1;
  protected boosterSplitIdx = 0;
  protected boosterSplitQty = 1;
  protected boosterDisplayMode: 'carousel' | 'split' = 'carousel';
  protected deckActiveIdx = 0;
  protected activeSectionFilter = 'all';
  protected inspectingDeck: any | null = null;
  protected isLandscapeMode = false;
  protected lastRenderOpts: { headerSpace?: boolean } = { headerSpace: true };
  protected lastScrollTop = 0;

  protected customTemplates: any[] = [];

  constructor(customData?: any) {
    let localOverride: any = null;
    if (!customData) {
      try {
        const raw = localStorage.getItem('store_config_override');
        if (raw) localOverride = JSON.parse(raw);
      } catch (_) {}
    }
    const d: any = customData || localOverride || storeData || {};
    this.customTemplates = getMergedGameTemplatesSync(d.templates || []);
    this.boosterDisplayMode = d.boosterDisplayMode === 'split' ? 'split' : 'carousel';

    const existingDeckIds = new Set((d.decks || []).map((dk: any) => dk.id));
    const extraCustomDecks = getAvailableCustomDecks()
      .filter((cd) => Array.isArray(cd.cards) && cd.cards.length > 0 && !existingDeckIds.has(cd.id))
      .map((cd) => ({
        id: cd.id,
        name: cd.name,
        price: 400,
        currency: 'gold',
        cards: cd.cards,
        theme: cd.archetype || 'custom',
        desc: `Deck completo com ${cd.cards.length} cartas prontas para batalha.`,
        published: true,
      }));

    this.data = {
      titles: d.titles || {},
      banners: (d.banners || []).filter((u: string) => !!u).slice(0, 3),
      dailyPool: (d.dailyPool || []).filter((o: any) => o && o.card),
      rare: (d.rare || []).filter((o: any) => o && o.card),
      decks: [...(d.decks || []), ...extraCustomDecks],
      packs: (d.packs || []).length ? d.packs : (storeData as any).packs || [],
      coinPacks: (d.coinPacks || []).length ? d.coinPacks : (storeData as any).coinPacks || [],
      gemPacks: (d.gemPacks || []).length ? d.gemPacks : (storeData as any).gemPacks || [],
      artifacts: ((d.artifacts || []).length ? d.artifacts : (storeData as any).artifacts || []).filter(
        (o: any) => o && o.id
      ),
      sectionOrder: d.sectionOrder || [
        'banners',
        'packs',
        'packs_split',
        'daily',
        'rare',
        'decks',
        'coins',
        'gems',
        'artifacts',
      ],
      sectionVisibility: d.sectionVisibility || {},
      deckLayoutMode: d.deckLayoutMode || 'carousel',
      boosterDisplayMode: d.boosterDisplayMode || 'carousel',
    };
  }

  private static readonly PT_SECTION_DEFAULTS: Record<string, string> = {
    packs: 'PACOTES & BOOSTERS (CARROSSEL)',
    packs_split: 'DESTAQUES ESPECIAIS (SPLIT)',
    daily: 'OFERTAS DO DIA',
    rare: 'CARTAS RARAS',
    decks: 'DECKS COMPLETOS',
    coins: 'MOEDAS',
    gems: 'DIAMANTES',
    artifacts: 'ARTEFATOS',
  };

  protected title(key: string, fallback: string): string {
    const custom = this.data.titles?.[key];
    if (custom && custom !== (StoreScreen.PT_SECTION_DEFAULTS[key] ?? fallback)) return custom;
    const tr = t('st.' + key);
    if (tr !== 'st.' + key) return tr;
    return custom || fallback;
  }

  protected resolveBoosterArtUrl(pack: any): string {
    const raw = pack?.customFront || pack?.pouchUrl || pack?.image || '';
    if (raw && BROKEN_IMAGE_REMAP[raw]) {
      return BROKEN_IMAGE_REMAP[raw];
    }
    if (pack?.id && VALID_BOOSTER_FALLBACK_BY_ID[pack.id]) {
      if (!raw || BROKEN_IMAGE_REMAP[raw]) {
        return VALID_BOOSTER_FALLBACK_BY_ID[pack.id];
      }
    }
    return raw || '/cards/Batalha_dos_slimes_fant_sticos.png';
  }

  protected renderFoilBoosterPouch(
    pack: any,
    wPx: number,
    hPx: number,
    extraStyle = '',
    extraAttrs = ''
  ): string {
    const imgUrl = this.resolveBoosterArtUrl(pack);
    const fallbackUrl =
      (pack?.id && VALID_BOOSTER_FALLBACK_BY_ID[pack.id]) ||
      '/cards/Batalha_dos_slimes_fant_sticos.png';
    const crimpH = Math.max(9, Math.round(hPx * 0.055));

    return `
      <div ${extraAttrs} style="width:${wPx}px; height:${hPx}px; min-width:${wPx}px; border-radius:10px; overflow:hidden; display:flex; flex-direction:column; position:relative; background:linear-gradient(180deg, #2a1c0e 0%, #120c06 100%); box-shadow:0 12px 26px rgba(0,0,0,0.68), 0 0 0 1.5px #d4a84b; flex-shrink:0; user-select:none; ${extraStyle}">
        <!-- Selo Metálico Frisado Superior do Booster -->
        <div style="width:100%; height:${crimpH}px; background:repeating-linear-gradient(90deg, #b88928 0px, #fff3c2 2.5px, #7d5b19 5px); border-bottom:1.5px solid #523707; flex-shrink:0; position:relative; z-index:3; box-shadow:0 2px 4px rgba(0,0,0,0.45);"></div>

        <!-- Corpo Alongado do Pacote -->
        <div style="flex:1; width:100%; position:relative; overflow:hidden; background:#140d07;">
          <img
            src="${thumbFor(imgUrl)}"
            alt="${pack?.name || 'Booster'}"
            onerror="this.onerror=null;this.src='${fallbackUrl}';"
            style="width:100%; height:100%; object-fit:cover; display:block;"
          />
          <!-- Reflexo Foil Holográfico Diagonal -->
          <div style="position:absolute; inset:0; background:linear-gradient(125deg, rgba(255,255,255,0) 20%, rgba(255,243,194,0.22) 46%, rgba(255,255,255,0) 70%); pointer-events:none;"></div>
          <!-- Topo Badge Quantidade de Cartas -->
          <div style="position:absolute; top:6px; right:6px; padding:2px 6px; border-radius:9999px; background:rgba(6,35,86,0.9); border:1px solid #f5d98b; font-family:var(--font-display); font-weight:900; font-size:8px; color:#fff3c2; letter-spacing:0.04em; box-shadow:0 2px 6px rgba(0,0,0,0.6);">
            ${pack?.cardsCount || 9} CARTAS
          </div>
          <!-- Rodapé Interno com Título do Booster -->
          <div style="position:absolute; left:0; right:0; bottom:0; background:linear-gradient(0deg, rgba(4,8,18,0.96) 0%, rgba(4,8,18,0.78) 58%, transparent 100%); padding:14px 6px 6px; text-align:center;">
            <span style="font-family:var(--font-display); font-weight:800; font-size:${
              wPx >= 130 ? '9.5px' : '8px'
            }; line-height:1.2; color:#fff3c2; text-shadow:0 1px 3px #000; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
              ${pack?.name || 'BOOSTER OFICIAL'}
            </span>
          </div>
        </div>

        <!-- Selo Metálico Frisado Inferior do Booster -->
        <div style="width:100%; height:${crimpH}px; background:repeating-linear-gradient(90deg, #b88928 0px, #fff3c2 2.5px, #7d5b19 5px); border-top:1.5px solid #523707; flex-shrink:0; position:relative; z-index:3;"></div>
      </div>
    `;
  }

  protected resolveCard(nameOrId: string): any {
    const pool = [...this.customTemplates, ...(CARD_TEMPLATES as any[])];
    const resolved = resolveMatrixOrGameCard(nameOrId, pool);
    if (resolved) return resolved;
    const clean = String(nameOrId || '').toLowerCase().trim();
    const match = pool.find(
      (c: any) =>
        c &&
        (String(c.name || '').toLowerCase().trim() === clean ||
          String(c.id || '').toLowerCase().trim() === clean ||
          String(c.name || '').toLowerCase().includes(clean))
    );
    return match || pool[0];
  }

  protected renderCardSvgThumb(cardObj: any): string {
    if (!cardObj) {
      return `<div class="wire-slot" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:9px;"><span>CARTA</span></div>`;
    }
    return `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; position:relative;">${renderMatrixCardSVG(
      cardObj,
      { mode: 'thumb', animateChroma: false }
    )}</div>`;
  }

  public render(container: HTMLElement, opts?: { headerSpace?: boolean }) {
    if (opts) this.lastRenderOpts = opts;
    StoreScreen.activeTimers.forEach((id) => clearInterval(id));
    StoreScreen.activeTimers = [];

    const rawOverride = localStorage.getItem('store_config_override');
    const parsedOverride = rawOverride ? JSON.parse(rawOverride) : null;
    const baseData = parsedOverride || storeData || {};
    getMergedGameTemplates(baseData.templates || []).then((merged) => {
      if (merged.length !== this.customTemplates.length) {
        this.customTemplates = merged;
        if (document.body.contains(container)) {
          this.paint(container);
        }
      }
    });

    this.paint(container);
  }

  protected paint(container: HTMLElement) {
    const prevScroller = container.querySelector('.store-screen') as HTMLElement | null;
    if (prevScroller) {
      this.lastScrollTop = prevScroller.scrollTop;
    }

    const isLandscape = this.isLandscapeMode || window.innerWidth > window.innerHeight;
    const headerSpace = this.lastRenderOpts.headerSpace !== false;

    const navTabs = [
      { id: 'all', label: 'Vitrine Completa' },
      { id: 'packs', label: 'Boosters' },
      { id: 'packs_split', label: 'Split' },
      { id: 'decks', label: 'Decks' },
      { id: 'daily', label: 'Diárias' },
      { id: 'rare', label: 'Raras' },
      { id: 'coins', label: 'Moedas' },
      { id: 'gems', label: 'Gemas' },
      { id: 'artifacts', label: 'Artefatos' },
    ];

    const tabsRowHtml = `
      <div class="no-scrollbar" style="display:flex; align-items:center; gap:6px; overflow-x:auto; padding-bottom:4px; width:100%;">
        ${navTabs
          .map((tab) => {
            const active = this.activeSectionFilter === tab.id;
            return active
              ? `<button type="button" data-sec-filter="${tab.id}" class="btn-royal-gold" style="flex-shrink:0; cursor:pointer;"><div class="btn-royal-inner" style="padding:6px 14px; font-family:var(--font-display); font-weight:700; font-size:10.5px; letter-spacing:0.06em; text-transform:uppercase; white-space:nowrap;">${tab.label}</div></button>`
              : `<button type="button" data-sec-filter="${tab.id}" class="pearl-pill" style="flex-shrink:0; padding:6px 14px; border-radius:9999px; font-family:var(--font-display); font-weight:700; font-size:10.5px; color:#5c4b3b; letter-spacing:0.06em; text-transform:uppercase; white-space:nowrap; cursor:pointer;">${tab.label}</button>`;
          })
          .join('')}
      </div>
    `;

    const order: string[] = Array.isArray(this.data.sectionOrder)
      ? this.data.sectionOrder
      : ['banners', 'packs', 'packs_split', 'daily', 'rare', 'decks', 'coins', 'gems', 'artifacts'];

    const sectionsHtmlList: string[] = [];

    order.forEach((secKey, orderIdx) => {
      if (this.data.sectionVisibility?.[secKey] === false) return;
      if (this.activeSectionFilter !== 'all' && this.activeSectionFilter !== secKey) return;

      const secHtml = this.renderSectionByKey(secKey, orderIdx, isLandscape);
      if (secHtml) {
        sectionsHtmlList.push(`
          <div class="store-dynamic-sec sec-${secKey}" data-module-key="${secKey}" data-order-idx="${orderIdx}" style="width:100%;">
            ${secHtml}
          </div>
        `);
      }
    });

    const bodyContentHtml = `
      <div style="display:flex; flex-direction:column; gap:14px; width:100%;">
        ${tabsRowHtml}
        ${sectionsHtmlList.join(renderGoldDividerHHtml('margin: 6px 0;'))}
      </div>
    `;

    const deckModalHtml = this.inspectingDeck
      ? `
      <div id="store-deck-modal-backdrop" style="position:fixed; inset:0; z-index:1500; background:rgba(4,8,20,0.88); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;">
        <div style="width:100%; max-width:680px;">
          ${renderOrnateWindowHtml({
            title: this.inspectingDeck.name || 'CARTAS DO DECK',
            compactHeader: true,
            showClose: true,
            closeBtnAttrs: 'id="store-deck-modal-close"',
            bodyStyle: 'padding: 12px 16px 16px; gap: 10px;',
            childrenHtml: `
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <span style="font-family:var(--font-display); font-weight:700; font-size:10px; color:#5c4b3b; text-transform:uppercase;">${
                  this.inspectingDeck.theme || 'Deck Oficial'
                } · ${(this.inspectingDeck.cards || []).length} Cartas</span>
                <span class="pearl-pill" style="padding:3px 10px; border-radius:9999px; font-family:var(--font-display); font-weight:700; font-size:10px; color:#8c6518;">${
                  this.inspectingDeck.price || 400
                } ${this.inspectingDeck.currency === 'gems' ? '💎' : '🪙'}</span>
              </div>
              <div class="nova-scroll" style="display:grid; grid-template-columns:repeat(${
                isLandscape ? 4 : 3
              }, minmax(0, 1fr)); gap:10px; max-height:380px; overflow-y:auto; padding-right:4px;">
                ${(this.inspectingDeck.cards || [])
                  .map((cardName: string) => {
                    const cObj = this.resolveCard(cardName);
                    return `
                      <div class="store-view-card" data-card-name="${
                        cObj?.name || cardName
                      }" style="width:100%; aspect-ratio:680/990; overflow:hidden; border-radius:10px; cursor:pointer; position:relative; box-shadow:0 6px 14px rgba(0,0,0,0.45);">
                        ${this.renderCardSvgThumb(cObj)}
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            `,
          })}
        </div>
      </div>
    `
      : '';

    const outerPad = headerSpace
      ? isLandscape
        ? '56px 16px 96px 16px'
        : '64px 10px 105px 10px'
      : '14px 12px 96px 12px';

    container.innerHTML = `
      <div class="store-screen nova-scroll" style="width:100%; height:100%; overflow-y:auto; overflow-x:hidden; padding:${outerPad}; box-sizing:border-box; display:flex; justify-content:center; align-items:flex-start; background:transparent;">
        <div style="width:100%; max-width:${isLandscape ? '920px' : '460px'}; margin:0 auto; display:flex; flex-direction:column; gap:14px;">
          ${bodyContentHtml}
        </div>
      </div>
      ${deckModalHtml}
    `;

    const newScroller = container.querySelector('.store-screen') as HTMLElement | null;
    if (newScroller && this.lastScrollTop > 0) {
      newScroller.scrollTop = this.lastScrollTop;
    }

    this.bindEvents(container);
    this.startDailyCountdown(container);
  }

  protected renderSectionByKey(secKey: string, _orderIdx: number, isLandscape: boolean): string {
    if (secKey === 'banners') {
      const banners: string[] =
        this.data.banners?.length > 0
          ? this.data.banners
          : ['/cards/03_toxico.png', '/cards/04_obsidiana.png', '/cards/05_gelo.png'];
      if (this.bannerIdx >= banners.length) this.bannerIdx = 0;
      const curBanner = banners[this.bannerIdx] || banners[0];
      const bannerH = isLandscape ? 176 : 144;

      return `
        <div style="position:relative; display:flex; align-items:center; width:100%; border-radius:16px; overflow:hidden; box-shadow:0 10px 26px rgba(0,0,0,0.55); border:2px solid #d4a84b;">
          <div style="width:100%; height:${bannerH}px; position:relative; overflow:hidden; background:#091426;">
            ${
              curBanner
                ? `<img src="${thumbFor(curBanner)}" alt="Banner" style="width:100%; height:100%; object-fit:cover; display:block;" />`
                : `<span style="font-size:11px; color:#fff3c2;">BANNER CARROSSEL</span>`
            }
            <div style="position:absolute; left:10px; top:50%; transform:translateY(-50%); z-index:10;">
              ${renderCarouselArrowButtonHtml('left', 'data-banner-nav="prev"', 'sm')}
            </div>
            <div style="position:absolute; right:10px; top:50%; transform:translateY(-50%); z-index:10;">
              ${renderCarouselArrowButtonHtml('right', 'data-banner-nav="next"', 'sm')}
            </div>
            <div style="position:absolute; left:0; right:0; bottom:0; height:32px; background:linear-gradient(0deg, rgba(0,0,0,0.75), transparent); display:flex; align-items:center; justify-content:center; gap:8px;">
              ${banners
                .map(
                  (_, idx) =>
                    `<button type="button" data-banner-dot="${idx}" class="store-dot" style="width:9px; height:9px; padding:0; border-radius:9999px; cursor:pointer; border:${
                      idx === this.bannerIdx ? '1.5px solid #5c3f0c' : 'none'
                    }; background:${
                      idx === this.bannerIdx ? '#f5d98b' : 'rgba(255,255,255,0.55)'
                    }; transform:${idx === this.bannerIdx ? 'scale(1.2)' : 'scale(1)'};"></button>`
                )
                .join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (secKey === 'packs') {
      const packs = (this.data.packs || []).filter((p: any) => p.published !== false);
      if (packs.length === 0) return '';
      if (this.boosterActiveIdx >= packs.length) this.boosterActiveIdx = 0;

      const currentPack = packs[this.boosterActiveIdx] || packs[0];
      const leftIdx = (this.boosterActiveIdx - 1 + packs.length) % packs.length;
      const rightIdx = (this.boosterActiveIdx + 1) % packs.length;
      const leftPack = packs[leftIdx] || currentPack;
      const rightPack = packs[rightIdx] || currentPack;

      const rates = currentPack.rates || { common: 60, rare: 20, epic: 10, legendary: 7, mythic: 3 };
      const unitPrice = Number(currentPack.price) || 0;
      const totalPrice = unitPrice * this.boosterQty;
      const isGems = currentPack.currency === 'gems';
      const priceLabel = totalPrice <= 0 ? 'GRÁTIS' : `${totalPrice} ${isGems ? '💎' : '🪙'}`;

      const rarityBoxesHtml = [
        { label: 'Comum', pct: `${rates.common ?? 60}%`, bg: 'rgba(240,237,230,0.92)', border: '#c9c3b8', text: '#3d372e' },
        { label: 'Rara', pct: `${rates.rare ?? 20}%`, bg: 'rgba(230,240,250,0.92)', border: '#8ebce6', text: '#1d4b78' },
        { label: 'Épica', pct: `${rates.epic ?? 10}%`, bg: 'rgba(239,230,247,0.92)', border: '#bd96e0', text: '#51237a' },
        { label: 'Lendária', pct: `${rates.legendary ?? 7}%`, bg: 'rgba(250,242,222,0.95)', border: '#e0bc68', text: '#78530d' },
        { label: 'Mítica', pct: `${rates.mythic ?? 3}%`, bg: 'rgba(250,230,236,0.95)', border: '#e698ad', text: '#7d1533' },
      ]
        .map(
          (r) => `
          <div style="background:${r.bg}; border:1.5px solid ${r.border}; border-radius:8px; padding:5px 4px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px;">
            <span style="font-family:var(--font-display); font-weight:800; font-size:8px; color:${r.text}; text-transform:uppercase;">${r.label}</span>
            <span style="font-family:var(--font-display); font-weight:900; font-size:10.5px; color:${r.text};">${r.pct}</span>
          </div>
        `
        )
        .join('');

      const centerW = isLandscape ? 148 : 136;
      const centerH = isLandscape ? 236 : 216;
      const sideW = isLandscape ? 112 : 102;
      const sideH = isLandscape ? 178 : 162;
      const stageH = isLandscape ? 252 : 232;

      const boosterFanStageHtml = `
        <div style="position:relative; width:100%; height:${stageH}px; display:flex; align-items:center; justify-content:center; overflow:visible;">
          <div style="position:absolute; left:2px; top:50%; transform:translateY(-50%); z-index:25;">
            ${renderCarouselArrowButtonHtml('left', 'data-pack-nav="prev"')}
          </div>

          <!-- Booster Esquerdo em Proporção Alongada Real -->
          ${this.renderFoilBoosterPouch(
            leftPack,
            sideW,
            sideH,
            'position:absolute; left:50%; transform:translateX(-118%) rotate(-9deg); opacity:0.86; z-index:4; cursor:pointer; transition:transform 0.25s ease;',
            'data-pack-nav="prev"'
          )}

          <!-- Booster Central Principal em Proporção Alongada Real (5:8) -->
          ${this.renderFoilBoosterPouch(
            currentPack,
            centerW,
            centerH,
            'position:relative; z-index:12; cursor:pointer; box-shadow:0 16px 34px rgba(0,0,0,0.8), 0 0 18px rgba(245,217,139,0.45), 0 0 0 2.5px #fff3c2;',
            `data-open-booster="${this.boosterActiveIdx}" data-open-qty="${this.boosterQty}"`
          )}

          <!-- Booster Direito em Proporção Alongada Real -->
          ${this.renderFoilBoosterPouch(
            rightPack,
            sideW,
            sideH,
            'position:absolute; left:50%; transform:translateX(18%) rotate(9deg); opacity:0.86; z-index:4; cursor:pointer; transition:transform 0.25s ease;',
            'data-pack-nav="next"'
          )}

          <div style="position:absolute; right:2px; top:50%; transform:translateY(-50%); z-index:25;">
            ${renderCarouselArrowButtonHtml('right', 'data-pack-nav="next"')}
          </div>
        </div>
      `;

      return `
        <div style="width:100%;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; gap:8px;">
            <span style="font-family:var(--font-display); font-weight:900; font-size:12.5px; color:#fff3c2; text-shadow:0 2px 6px rgba(0,0,0,0.92); letter-spacing:0.08em; text-transform:uppercase;">${this.title(
              'packs',
              'PACOTES & BOOSTERS'
            )}</span>
            <span class="pearl-pill" style="padding:3px 10px; border-radius:9999px; font-family:var(--font-display); font-weight:800; font-size:9.5px; color:#8c6518;">${
              this.boosterActiveIdx + 1
            } / ${packs.length} · ${currentPack.cardsCount || 9} CARTAS</span>
          </div>
          ${
            isLandscape
              ? `
            <div style="padding:14px 16px; border-radius:18px; background:rgba(7, 18, 38, 0.56); border:1.5px solid rgba(212, 168, 75, 0.48); backdrop-filter:blur(6px); display:grid; grid-template-columns:48% 14px 1fr; gap:14px; align-items:center;">
              ${boosterFanStageHtml}
              <div style="height:100%; display:flex; justify-content:center;">
                ${renderGoldDividerVHtml('margin:0;')}
              </div>
              <div style="display:flex; flex-direction:column; justify-content:space-between; gap:12px; min-width:0;">
                <div>
                  <span style="font-family:var(--font-display); font-weight:900; font-size:15px; color:#fff3c2; text-shadow:0 2px 4px rgba(0,0,0,0.85); letter-spacing:0.05em; text-transform:uppercase; display:block;">${
                    currentPack.name
                  }</span>
                  <p style="font-size:11px; line-height:1.45; color:#e5dec9; margin:6px 0 0 0;">${
                    currentPack.desc || 'Pacote oficial de 9 cartas da Forja.'
                  }</p>
                </div>
                <div style="display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:6px;">
                  ${rarityBoxesHtml}
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                  <div class="pearl-pill" style="padding:6px 12px; border-radius:9999px; display:flex; align-items:center; gap:10px;">
                    <button type="button" data-pack-qty="-1" style="background:none; border:none; font-family:var(--font-display); font-weight:900; font-size:14px; color:#5c4b3b; padding:0 4px; cursor:pointer;">-</button>
                    <span style="font-family:var(--font-display); font-weight:900; font-size:12px; color:#2b1f14;">x${this.boosterQty}</span>
                    <button type="button" data-pack-qty="1" style="background:none; border:none; font-family:var(--font-display); font-weight:900; font-size:14px; color:#5c4b3b; padding:0 4px; cursor:pointer;">+</button>
                  </div>
                  <button type="button" data-open-booster="${this.boosterActiveIdx}" data-open-qty="${
                  this.boosterQty
                }" class="btn-royal-gold" style="flex:1; cursor:pointer;">
                    <div class="btn-royal-inner" style="padding:9px 14px; font-family:var(--font-display); font-weight:900; font-size:12px; letter-spacing:0.08em; text-transform:uppercase;">
                      ABRIR PACOTE · ${priceLabel}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          `
              : `
            <div style="padding:12px; border-radius:18px; background:rgba(7, 18, 38, 0.56); border:1.5px solid rgba(212, 168, 75, 0.48); backdrop-filter:blur(6px); display:flex; flex-direction:column; gap:10px;">
              ${boosterFanStageHtml}
              <div style="text-align:center; padding:0 4px;">
                <span style="font-family:var(--font-display); font-weight:900; font-size:13.5px; color:#fff3c2; text-shadow:0 2px 4px rgba(0,0,0,0.9); letter-spacing:0.05em; text-transform:uppercase; display:block;">${
                  currentPack.name
                }</span>
                <p style="font-size:10px; line-height:1.4; color:#e5dec9; margin:4px 0 0 0;">${
                  currentPack.desc || 'Pacote oficial de 9 cartas da Forja.'
                }</p>
              </div>
              <div style="display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:5px;">
                ${rarityBoxesHtml}
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <div class="pearl-pill" style="padding:6px 10px; border-radius:9999px; display:flex; align-items:center; gap:8px;">
                  <button type="button" data-pack-qty="-1" style="background:none; border:none; font-family:var(--font-display); font-weight:900; font-size:14px; color:#5c4b3b; padding:0 4px; cursor:pointer;">-</button>
                  <span style="font-family:var(--font-display); font-weight:900; font-size:11.5px; color:#2b1f14;">x${this.boosterQty}</span>
                  <button type="button" data-pack-qty="1" style="background:none; border:none; font-family:var(--font-display); font-weight:900; font-size:14px; color:#5c4b3b; padding:0 4px; cursor:pointer;">+</button>
                </div>
                <button type="button" data-open-booster="${this.boosterActiveIdx}" data-open-qty="${
                  this.boosterQty
                }" class="btn-royal-gold" style="flex:1; cursor:pointer;">
                  <div class="btn-royal-inner" style="padding:9px 14px; font-family:var(--font-display); font-weight:900; font-size:11.5px; letter-spacing:0.08em; text-transform:uppercase;">
                    ABRIR PACOTE · ${priceLabel}
                  </div>
                </button>
              </div>
            </div>
          `
          }
        </div>
      `;
    }

    if (secKey === 'packs_split') {
      const packs = (this.data.packs || []).filter((p: any) => p.published !== false);
      if (packs.length === 0) return '';
      if (this.boosterSplitIdx >= packs.length) this.boosterSplitIdx = 0;
      const selPack = packs[this.boosterSplitIdx] || packs[0];
      const unitPrice = Number(selPack.price) || 0;
      const totalPrice = unitPrice * this.boosterSplitQty;
      const isGems = selPack.currency === 'gems';
      const priceLabel = totalPrice <= 0 ? 'GRÁTIS' : `${totalPrice} ${isGems ? '💎' : '🪙'}`;

      const splitPackW = isLandscape ? 136 : 118;
      const splitPackH = isLandscape ? 216 : 188;

      return `
        <div style="width:100%;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; gap:8px;">
            <span style="font-family:var(--font-display); font-weight:900; font-size:12.5px; color:#fff3c2; text-shadow:0 2px 6px rgba(0,0,0,0.92); letter-spacing:0.08em; text-transform:uppercase;">${this.title(
              'packs_split',
              'COLEÇÕES DE BOOSTERS'
            )}</span>
            <span class="pearl-pill" style="padding:3px 10px; border-radius:9999px; font-family:var(--font-display); font-weight:800; font-size:9.5px; color:#5c4b3b;">${
              packs.length
            } COLEÇÕES</span>
          </div>
          <div style="padding:12px; border-radius:18px; background:rgba(7, 18, 38, 0.56); border:1.5px solid rgba(212, 168, 75, 0.48); backdrop-filter:blur(6px); display:grid; grid-template-columns:${
            isLandscape ? '200px 1fr' : '136px 1fr'
          }; gap:12px; align-items:center;">
            <div style="display:flex; flex-direction:column; align-items:center; gap:10px;">
              ${this.renderFoilBoosterPouch(
                selPack,
                splitPackW,
                splitPackH,
                'cursor:pointer;',
                `data-open-booster="${this.boosterSplitIdx}" data-open-qty="${this.boosterSplitQty}"`
              )}
              <div style="display:flex; align-items:center; gap:6px; width:100%;">
                <button type="button" data-split-qty-cycle="1" class="pearl-pill" style="padding:6px 10px; border-radius:9999px; font-family:var(--font-display); font-weight:900; font-size:10px; color:#3a2b1c; cursor:pointer;">x${
                  this.boosterSplitQty
                }</button>
                <button type="button" data-open-booster="${this.boosterSplitIdx}" data-open-qty="${
        this.boosterSplitQty
      }" class="btn-royal-gold" style="flex:1; cursor:pointer;">
                  <div class="btn-royal-inner" style="padding:6px 8px; font-family:var(--font-display); font-weight:900; font-size:10px; text-transform:uppercase;">${priceLabel}</div>
                </button>
              </div>
            </div>
            <div class="nova-scroll" style="display:flex; flex-direction:column; gap:7px; max-height:${
              isLandscape ? '250px' : '225px'
            }; overflow-y:auto; padding-right:4px;">
              ${packs
                .map((p: any, idx: number) => {
                  const isSel = idx === this.boosterSplitIdx;
                  const pImg = this.resolveBoosterArtUrl(p);
                  const fallbackUrl =
                    (p?.id && VALID_BOOSTER_FALLBACK_BY_ID[p.id]) ||
                    '/cards/Batalha_dos_slimes_fant_sticos.png';
                  return `
                    <div data-select-split="${idx}" style="padding:7px 9px; border-radius:12px; display:flex; align-items:center; gap:10px; cursor:pointer; border:${
                    isSel ? '2px solid #f5d98b' : '1px solid rgba(212,168,75,0.35)'
                  }; background:${
                    isSel ? 'rgba(11, 55, 120, 0.78)' : 'rgba(15, 28, 52, 0.65)'
                  }; box-shadow:${isSel ? '0 4px 12px rgba(0,0,0,0.4)' : 'none'};">
                      <img src="${thumbFor(pImg)}" alt="${
                    p.name
                  }" onerror="this.onerror=null;this.src='${fallbackUrl}';" style="width:36px; height:56px; border-radius:6px; object-fit:cover; flex-shrink:0; display:block; border:1px solid #d4a84b;" />
                      <div style="min-width:0; flex:1; text-align:left;">
                        <span style="font-family:var(--font-display); font-weight:800; font-size:10.5px; color:#fff3c2; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${
                          p.name
                        }</span>
                        <span style="font-family:var(--font-display); font-weight:700; font-size:9px; color:#f5d98b; display:block; margin-top:2px;">${
                          Number(p.price) <= 0 ? 'GRÁTIS' : `${p.price} ${p.currency === 'gems' ? '💎' : '🪙'}`
                        } · ${p.cardsCount || 9} Cartas</span>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (secKey === 'daily') {
      const pool = this.data.dailyPool || [];
      if (pool.length === 0) return '';
      const pageSize = isLandscape ? 6 : 4;
      const totalPages = Math.max(1, Math.ceil(pool.length / pageSize));
      if (this.dailyPage >= totalPages) this.dailyPage = 0;
      const pageItems = pool.slice(this.dailyPage * pageSize, (this.dailyPage + 1) * pageSize);

      return `
        <div style="width:100%;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; gap:8px;">
            <span style="font-family:var(--font-display); font-weight:900; font-size:12.5px; color:#fff3c2; text-shadow:0 2px 6px rgba(0,0,0,0.92); letter-spacing:0.08em; text-transform:uppercase;">${this.title(
              'daily',
              'OFERTAS DO DIA'
            )}</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <div class="pearl-pill" id="store-daily-timer" style="padding:3px 9px; border-radius:9999px; font-family:var(--font-display); font-weight:800; font-size:9px; color:#5c4b3b;">
                RENOVAÇÃO 04:12:59
              </div>
              ${
                totalPages > 1
                  ? `
                <button type="button" data-daily-page="-1" class="pearl-pill" style="padding:3px 8px; border-radius:9999px; font-size:9.5px; cursor:pointer;">◀</button>
                <span style="font-family:var(--font-display); font-weight:800; font-size:10px; color:#fff3c2;">${this.dailyPage + 1}/${totalPages}</span>
                <button type="button" data-daily-page="1" class="pearl-pill" style="padding:3px 8px; border-radius:9999px; font-size:9.5px; cursor:pointer;">▶</button>
              `
                  : ''
              }
            </div>
          </div>
          <div style="display:grid; grid-template-columns:repeat(${isLandscape ? 3 : 2}, minmax(0, 1fr)); gap:12px; width:100%;">
            ${pageItems
              .map((offer: any, idx: number) => {
                const realIdx = this.dailyPage * pageSize + idx;
                const cardObj = this.resolveCard(offer.card);
                const price = Number(offer.price) || 100;
                return `
                  <div style="display:flex; flex-direction:column; gap:7px; min-width:0;">
                    <div class="store-view-card" data-card-name="${
                      cardObj?.name || offer.card
                    }" style="width:100%; aspect-ratio:680/990; overflow:hidden; border-radius:12px; cursor:pointer; position:relative; box-shadow:0 10px 22px rgba(0,0,0,0.65); border:1.5px solid rgba(212,168,75,0.65);">
                      ${this.renderCardSvgThumb(cardObj)}
                    </div>
                    <div style="padding:6px 8px; border-radius:12px; background:rgba(7, 18, 38, 0.72); border:1px solid rgba(212,168,75,0.45); display:flex; flex-direction:column; gap:5px;">
                      <div style="display:flex; align-items:center; justify-content:space-between; gap:4px;">
                        <span style="font-family:var(--font-display); font-weight:800; font-size:10.5px; color:#fff3c2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${
                          cardObj?.name || offer.card
                        }</span>
                        <span style="font-family:var(--font-display); font-weight:700; font-size:8px; color:#f5d98b; text-transform:uppercase; flex-shrink:0;">${
                          cardObj?.preferredRarity || cardObj?.rarity || 'Diária'
                        }</span>
                      </div>
                      <button type="button" data-buy-daily="${realIdx}" class="btn-royal-gold" style="width:100%; cursor:pointer;">
                        <div class="btn-royal-inner" style="padding:6px 10px; font-family:var(--font-display); font-weight:900; font-size:10.5px; text-transform:uppercase;">
                          COMPRAR · ${price} 🪙
                        </div>
                      </button>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    }

    if (secKey === 'rare') {
      const rares = this.data.rare || [];
      if (rares.length === 0) return '';
      const pageSize = isLandscape ? 6 : 4;
      const totalPages = Math.max(1, Math.ceil(rares.length / pageSize));
      if (this.rarePage >= totalPages) this.rarePage = 0;
      const pageItems = rares.slice(this.rarePage * pageSize, (this.rarePage + 1) * pageSize);

      return `
        <div style="width:100%;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; gap:8px;">
            <span style="font-family:var(--font-display); font-weight:900; font-size:12.5px; color:#fff3c2; text-shadow:0 2px 6px rgba(0,0,0,0.92); letter-spacing:0.08em; text-transform:uppercase;">${this.title(
              'rare',
              'CARTAS RARAS'
            )}</span>
            ${
              totalPages > 1
                ? `
              <div style="display:flex; align-items:center; gap:6px;">
                <button type="button" data-rare-page="-1" class="pearl-pill" style="padding:3px 8px; border-radius:9999px; font-size:9.5px; cursor:pointer;">◀</button>
                <span style="font-family:var(--font-display); font-weight:800; font-size:10px; color:#fff3c2;">${this.rarePage + 1}/${totalPages}</span>
                <button type="button" data-rare-page="1" class="pearl-pill" style="padding:3px 8px; border-radius:9999px; font-size:9.5px; cursor:pointer;">▶</button>
              </div>
            `
                : ''
            }
          </div>
          <div style="display:grid; grid-template-columns:repeat(${isLandscape ? 3 : 2}, minmax(0, 1fr)); gap:12px; width:100%;">
            ${pageItems
              .map((offer: any, idx: number) => {
                const realIdx = this.rarePage * pageSize + idx;
                const cardObj = this.resolveCard(offer.card);
                const price = Number(offer.price) || 5;
                return `
                  <div style="display:flex; flex-direction:column; gap:7px; min-width:0;">
                    <div class="store-view-card" data-card-name="${
                      cardObj?.name || offer.card
                    }" style="width:100%; aspect-ratio:680/990; overflow:hidden; border-radius:12px; cursor:pointer; position:relative; box-shadow:0 10px 22px rgba(0,0,0,0.65); border:1.5px solid #f5d98b;">
                      ${this.renderCardSvgThumb(cardObj)}
                    </div>
                    <div style="padding:6px 8px; border-radius:12px; background:rgba(7, 18, 38, 0.72); border:1px solid rgba(212,168,75,0.45); display:flex; flex-direction:column; gap:5px;">
                      <div style="display:flex; align-items:center; justify-content:space-between; gap:4px;">
                        <span style="font-family:var(--font-display); font-weight:800; font-size:10.5px; color:#fff3c2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${
                          cardObj?.name || offer.card
                        }</span>
                        <span style="font-family:var(--font-display); font-weight:700; font-size:8px; color:#7dd3fc; text-transform:uppercase; flex-shrink:0;">Rara Especial</span>
                      </div>
                      <button type="button" data-buy-rare="${realIdx}" class="btn-royal-gold" style="width:100%; cursor:pointer;">
                        <div class="btn-royal-inner" style="padding:6px 10px; font-family:var(--font-display); font-weight:900; font-size:10.5px; text-transform:uppercase;">
                          COMPRAR · ${price} 💎
                        </div>
                      </button>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    }

    if (secKey === 'decks') {
      const decks = this.data.decks || [];
      if (decks.length === 0) return '';
      if (this.deckActiveIdx >= decks.length) this.deckActiveIdx = 0;
      const curDeck = decks[this.deckActiveIdx] || decks[0];
      const previewCards = (curDeck.cards || []).slice(0, 4);

      return `
        <div style="width:100%;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; gap:8px;">
            <span style="font-family:var(--font-display); font-weight:900; font-size:12.5px; color:#fff3c2; text-shadow:0 2px 6px rgba(0,0,0,0.92); letter-spacing:0.08em; text-transform:uppercase;">${this.title(
              'decks',
              'DECKS COMPLETOS'
            )}</span>
            <div style="display:flex; align-items:center; gap:6px;">
              ${renderCarouselArrowButtonHtml('left', 'data-deck-nav="-1"', 'sm')}
              <span class="pearl-pill" style="padding:3px 10px; border-radius:9999px; font-family:var(--font-display); font-weight:800; font-size:9.5px; color:#8c6518;">${
                this.deckActiveIdx + 1
              } / ${decks.length}</span>
              ${renderCarouselArrowButtonHtml('right', 'data-deck-nav="1"', 'sm')}
            </div>
          </div>
          <div style="padding:12px; border-radius:18px; background:rgba(7, 18, 38, 0.56); border:1.5px solid rgba(212, 168, 75, 0.48); backdrop-filter:blur(6px); display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px;">
              <div>
                <span style="font-family:var(--font-display); font-weight:900; font-size:13.5px; color:#fff3c2; text-transform:uppercase; display:block;">${
                  curDeck.name
                }</span>
                <span style="font-family:var(--font-display); font-size:10px; color:#e5dec9; display:block; margin-top:2px;">${
                  curDeck.desc || `${(curDeck.cards || []).length} cartas prontas para combate.`
                }</span>
              </div>
              <span class="pearl-pill" style="padding:3px 10px; border-radius:9999px; font-family:var(--font-display); font-weight:800; font-size:8.5px; color:#082b66; flex-shrink:0; text-transform:uppercase;">${
                curDeck.theme || 'Deck Completo'
              }</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(${isLandscape ? 4 : 2}, minmax(0, 1fr)); gap:10px; width:100%;">
              ${previewCards
                .map((cName: string) => {
                  const cObj = this.resolveCard(cName);
                  return `
                    <div class="store-view-card" data-card-name="${
                      cObj?.name || cName
                    }" style="width:100%; aspect-ratio:680/990; overflow:hidden; border-radius:10px; cursor:pointer; position:relative; box-shadow:0 8px 18px rgba(0,0,0,0.6); border:1.5px solid rgba(212,168,75,0.6);">
                      ${this.renderCardSvgThumb(cObj)}
                    </div>
                  `;
                })
                .join('')}
            </div>
            <div style="display:flex; align-items:center; gap:10px; padding-top:4px;">
              <button type="button" data-inspect-deck="${
                this.deckActiveIdx
              }" class="btn-pearl-gold store-view-deck" style="flex:1; cursor:pointer;">
                <div class="btn-pearl-inner" style="padding:8px 12px; font-family:var(--font-display); font-weight:900; font-size:10px; text-transform:uppercase;">
                  🃏 VER TODAS (${(curDeck.cards || []).length} CARTAS)
                </div>
              </button>
              <button type="button" data-buy-deck="${
                this.deckActiveIdx
              }" class="btn-royal-gold" style="flex:1; cursor:pointer;">
                <div class="btn-royal-inner" style="padding:8px 12px; font-family:var(--font-display); font-weight:900; font-size:10px; text-transform:uppercase;">
                  COMPRAR · ${curDeck.price || 800} ${curDeck.currency === 'gems' ? '💎' : '🪙'}
                </div>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    if (secKey === 'coins') {
      const coinPacks = this.data.coinPacks || [];
      if (coinPacks.length === 0) return '';
      return `
        <div style="width:100%;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span style="font-family:var(--font-display); font-weight:900; font-size:12.5px; color:#fff3c2; text-shadow:0 2px 6px rgba(0,0,0,0.92); letter-spacing:0.08em; text-transform:uppercase;">${this.title(
              'coins',
              'MOEDAS'
            )}</span>
          </div>
          <div style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:10px; width:100%;">
            ${coinPacks
              .map(
                (cp: any, idx: number) => `
              <div style="padding:10px; border-radius:14px; background:rgba(7, 18, 38, 0.65); border:1.5px solid rgba(212,168,75,0.45); display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px;">
                <div style="width:68px; height:68px; border-radius:12px; overflow:hidden; display:flex; align-items:center; justify-content:center;">
                  ${
                    cp.image
                      ? `<img src="${thumbFor(cp.image)}" alt="${cp.gold} Ouro" style="width:100%; height:100%; object-fit:contain; display:block; filter:drop-shadow(0 4px 8px rgba(0,0,0,0.6));" />`
                      : `<span style="font-size:28px;">🪙</span>`
                  }
                </div>
                <span style="font-family:var(--font-display); font-weight:900; font-size:11.5px; color:#f5d98b;">+${Number(
                  cp.gold || 1000
                ).toLocaleString()} 🪙</span>
                <button type="button" data-buy-coins="${idx}" class="btn-royal-gold" style="width:100%; cursor:pointer;">
                  <div class="btn-royal-inner" style="padding:5px 8px; font-family:var(--font-display); font-weight:800; font-size:10px; text-transform:uppercase;">${
                    cp.price || 10
                  } 💎</div>
                </button>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    }

    if (secKey === 'gems') {
      const gemPacks = this.data.gemPacks || [];
      if (gemPacks.length === 0) return '';
      return `
        <div style="width:100%;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span style="font-family:var(--font-display); font-weight:900; font-size:12.5px; color:#fff3c2; text-shadow:0 2px 6px rgba(0,0,0,0.92); letter-spacing:0.08em; text-transform:uppercase;">${this.title(
              'gems',
              'DIAMANTES'
            )}</span>
          </div>
          <div style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:10px; width:100%;">
            ${gemPacks
              .map(
                (gp: any, idx: number) => `
              <div style="padding:10px; border-radius:14px; background:rgba(7, 18, 38, 0.65); border:1.5px solid rgba(212,168,75,0.45); display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px;">
                <div style="width:68px; height:68px; border-radius:12px; overflow:hidden; display:flex; align-items:center; justify-content:center;">
                  ${
                    gp.image
                      ? `<img src="${thumbFor(gp.image)}" alt="${gp.gems} Gemas" style="width:100%; height:100%; object-fit:contain; display:block; filter:drop-shadow(0 4px 8px rgba(0,0,0,0.6));" />`
                      : `<span style="font-size:28px;">💎</span>`
                  }
                </div>
                <span style="font-family:var(--font-display); font-weight:900; font-size:11.5px; color:#7dd3fc;">+${Number(
                  gp.gems || 100
                ).toLocaleString()} 💎</span>
                <button type="button" data-buy-gems="${idx}" class="btn-royal-gold" style="width:100%; cursor:pointer;">
                  <div class="btn-royal-inner" style="padding:5px 8px; font-family:var(--font-display); font-weight:800; font-size:10px; text-transform:uppercase;">${
                    gp.price || 'R$ 4,90'
                  }</div>
                </button>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    }

    if (secKey === 'artifacts') {
      const arts = this.data.artifacts || [];
      if (arts.length === 0) return '';
      const pageSize = isLandscape ? 6 : 4;
      const totalPages = Math.max(1, Math.ceil(arts.length / pageSize));
      if (this.artPage >= totalPages) this.artPage = 0;
      const pageItems = arts.slice(this.artPage * pageSize, (this.artPage + 1) * pageSize);

      return `
        <div style="width:100%;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; gap:8px;">
            <span style="font-family:var(--font-display); font-weight:900; font-size:12.5px; color:#fff3c2; text-shadow:0 2px 6px rgba(0,0,0,0.92); letter-spacing:0.08em; text-transform:uppercase;">${this.title(
              'artifacts',
              'ARTEFATOS'
            )}</span>
            ${
              totalPages > 1
                ? `
              <div style="display:flex; align-items:center; gap:6px;">
                <button type="button" data-art-page="-1" class="pearl-pill" style="padding:3px 8px; border-radius:9999px; font-size:9.5px; cursor:pointer;">◀</button>
                <span style="font-family:var(--font-display); font-weight:800; font-size:10px; color:#fff3c2;">${this.artPage + 1}/${totalPages}</span>
                <button type="button" data-art-page="1" class="pearl-pill" style="padding:3px 8px; border-radius:9999px; font-size:9.5px; cursor:pointer;">▶</button>
              </div>
            `
                : ''
            }
          </div>
          <div style="display:grid; grid-template-columns:repeat(${isLandscape ? 3 : 2}, minmax(0, 1fr)); gap:10px; width:100%;">
            ${pageItems
              .map((artEntry: any, idx: number) => {
                const realIdx = this.artPage * pageSize + idx;
                const skillDef =
                  SKILL_POOL.find((s: any) => s.id === artEntry.id || s.name === artEntry.id) ||
                  SKILL_POOL[idx % SKILL_POOL.length];
                return `
                  <div style="padding:10px; border-radius:14px; background:rgba(7, 18, 38, 0.65); border:1.5px solid rgba(212,168,75,0.45); display:flex; align-items:center; gap:10px; min-width:0;">
                    <div style="width:54px; height:54px; min-width:54px; border-radius:9999px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:20px; overflow:hidden; border:1.5px solid #d4a84b; background:#091834;">
                      ${
                        (skillDef as any)?.image
                          ? `<img src="${thumbFor((skillDef as any).image)}" alt="${
                              skillDef?.name || artEntry.id
                            }" style="width:100%; height:100%; object-fit:cover; display:block;" />`
                          : `<span>${(skillDef as any)?.icon || '✨'}</span>`
                      }
                    </div>
                    <div style="flex:1; min-width:0;">
                      <span style="font-family:var(--font-display); font-weight:800; font-size:10.5px; color:#fff3c2; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${
                        skillDef?.name || artEntry.id
                      }</span>
                      <span style="font-family:var(--font-display); font-size:8.5px; color:#cbd5e1; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">${
                        (skillDef as any)?.description || 'Artefato estratégico'
                      }</span>
                      <button type="button" data-buy-artifact="${realIdx}" class="btn-royal-gold" style="width:100%; margin-top:6px; cursor:pointer;">
                        <div class="btn-royal-inner" style="padding:5px 8px; font-family:var(--font-display); font-weight:800; font-size:9.5px; text-transform:uppercase;">
                          ${artEntry.price || 10} ${artEntry.currency === 'gold' ? '🪙' : '💎'}
                        </div>
                      </button>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    }

    return '';
  }

  protected startDailyCountdown(container: HTMLElement) {
    const updateTimer = () => {
      const el = container.querySelector('#store-daily-timer');
      if (!el) return;
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diffSec = Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
      const h = String(Math.floor(diffSec / 3600)).padStart(2, '0');
      const m = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
      const s = String(diffSec % 60).padStart(2, '0');
      el.textContent = `RENOVAÇÃO ${h}:${m}:${s}`;
    };
    updateTimer();
    const timerId = window.setInterval(updateTimer, 1000);
    StoreScreen.activeTimers.push(timerId);
  }

  protected bindEvents(container: HTMLElement) {
    const scroller = container.querySelector('.store-screen') as HTMLElement | null;
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

    const packs = (this.data.packs || []).filter((p: any) => p.published !== false);
    const banners =
      this.data.banners?.length > 0
        ? this.data.banners
        : ['/cards/03_toxico.png', '/cards/04_obsidiana.png', '/cards/05_gelo.png'];

    container.querySelectorAll<HTMLElement>('[data-sec-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const filterId = btn.dataset.secFilter || 'all';
        SoundManager.play('ui_click');
        this.activeSectionFilter = filterId;
        this.lastScrollTop = 0;
        document.body.classList.remove('hub-scroll-hide-bars');
        this.paint(container);
      });
    });

    container.querySelectorAll<HTMLElement>('[data-banner-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        SoundManager.play('ui_click');
        const dir = btn.dataset.bannerNav === 'prev' ? -1 : 1;
        this.bannerIdx = (this.bannerIdx + dir + banners.length) % banners.length;
        this.paint(container);
      });
    });

    container.querySelectorAll<HTMLElement>('[data-banner-dot]').forEach((dot) => {
      dot.addEventListener('click', () => {
        SoundManager.play('ui_click');
        this.bannerIdx = Number(dot.dataset.bannerDot || 0);
        this.paint(container);
      });
    });

    container.querySelectorAll<HTMLElement>('[data-pack-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!packs.length) return;
        SoundManager.play('ui_click');
        const dir = btn.dataset.packNav === 'prev' ? -1 : 1;
        this.boosterActiveIdx = (this.boosterActiveIdx + dir + packs.length) % packs.length;
        this.paint(container);
      });
    });

    container.querySelectorAll<HTMLElement>('[data-pack-qty]').forEach((btn) => {
      btn.addEventListener('click', () => {
        SoundManager.play('ui_click');
        const delta = Number(btn.dataset.packQty || 0);
        this.boosterQty = Math.max(1, Math.min(10, this.boosterQty + delta));
        this.paint(container);
      });
    });

    container.querySelectorAll<HTMLElement>('[data-select-split]').forEach((el) => {
      el.addEventListener('click', () => {
        SoundManager.play('ui_click');
        this.boosterSplitIdx = Number(el.dataset.selectSplit || 0);
        this.paint(container);
      });
    });

    container.querySelectorAll<HTMLElement>('[data-split-qty-cycle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        SoundManager.play('ui_click');
        const cycle = [1, 3, 5, 10];
        this.boosterSplitQty = cycle[(cycle.indexOf(this.boosterSplitQty) + 1) % cycle.length];
        this.paint(container);
      });
    });

    container.querySelectorAll<HTMLElement>('[data-open-booster]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.openBooster || 0);
        const qty = Number(btn.dataset.openQty || 1);
        const pack = packs[idx] || packs[0];
        if (!pack) return;
        const totalCost = (Number(pack.price) || 0) * qty;
        if (totalCost > 0) {
          const ok =
            pack.currency === 'gems'
              ? ProgressionManager.spendDiamonds(totalCost)
              : ProgressionManager.spendGold(totalCost);
          if (!ok) {
            SoundManager.play('ui_cancel');
            return;
          }
        }
        SoundManager.play('ui_confirm');
        this.openBoosterModal(pack, qty, container);
      });
    });

    container.querySelectorAll<HTMLElement>('[data-daily-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        SoundManager.play('ui_click');
        const delta = Number(btn.dataset.dailyPage || 1);
        const isLandscape = this.isLandscapeMode || window.innerWidth > window.innerHeight;
        const pageSize = isLandscape ? 6 : 4;
        const totalPages = Math.max(1, Math.ceil((this.data.dailyPool || []).length / pageSize));
        this.dailyPage = (this.dailyPage + delta + totalPages) % totalPages;
        this.paint(container);
      });
    });

    container.querySelectorAll<HTMLElement>('[data-rare-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        SoundManager.play('ui_click');
        const delta = Number(btn.dataset.rarePage || 1);
        const isLandscape = this.isLandscapeMode || window.innerWidth > window.innerHeight;
        const pageSize = isLandscape ? 6 : 4;
        const totalPages = Math.max(1, Math.ceil((this.data.rare || []).length / pageSize));
        this.rarePage = (this.rarePage + delta + totalPages) % totalPages;
        this.paint(container);
      });
    });

    container.querySelectorAll<HTMLElement>('[data-art-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        SoundManager.play('ui_click');
        const delta = Number(btn.dataset.artPage || 1);
        const isLandscape = this.isLandscapeMode || window.innerWidth > window.innerHeight;
        const pageSize = isLandscape ? 6 : 4;
        const totalPages = Math.max(1, Math.ceil((this.data.artifacts || []).length / pageSize));
        this.artPage = (this.artPage + delta + totalPages) % totalPages;
        this.paint(container);
      });
    });

    container.querySelectorAll<HTMLElement>('[data-deck-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const decks = this.data.decks || [];
        if (!decks.length) return;
        SoundManager.play('ui_click');
        const delta = Number(btn.dataset.deckNav || 1);
        this.deckActiveIdx = (this.deckActiveIdx + delta + decks.length) % decks.length;
        this.paint(container);
      });
    });

    container.querySelectorAll<HTMLElement>('[data-inspect-deck]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.inspectDeck || 0);
        const deck = (this.data.decks || [])[idx];
        if (!deck) return;
        SoundManager.play('ui_click');
        this.inspectingDeck = deck;
        this.paint(container);
      });
    });

    container.querySelector('#store-deck-modal-close')?.addEventListener('click', () => {
      this.inspectingDeck = null;
      this.paint(container);
    });

    container.querySelectorAll<HTMLElement>('.store-view-card').forEach((el) => {
      el.addEventListener('click', () => {
        const cardName = el.dataset.cardName;
        if (!cardName) return;
        const cardObj = this.resolveCard(cardName);
        if (!cardObj) return;
        const sectionEl = el.closest('.store-dynamic-sec') || container;
        const sectionCardNames = Array.from(
          sectionEl.querySelectorAll<HTMLElement>('.store-view-card')
        )
          .map((node) => node.dataset.cardName)
          .filter((n): n is string => !!n);
        const list = sectionCardNames.length
          ? sectionCardNames.map((n) => this.resolveCard(n)).filter(Boolean)
          : [cardObj];
        const idx = Math.max(
          0,
          list.findIndex((c) => (c?.name || c?.id) === (cardObj?.name || cardObj?.id))
        );
        openCardViewer({
          card: cardObj,
          list,
          index: idx,
          actionLabel: 'FECHAR VISUALIZAÇÃO',
          onAction: () => ({ close: true }),
        });
      });
    });

    container.querySelectorAll<HTMLElement>('[data-buy-daily]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.buyDaily || 0);
        const offer = (this.data.dailyPool || [])[idx];
        if (!offer) return;
        const price = Number(offer.price) || 100;
        if (ProgressionManager.spendGold(price)) {
          SoundManager.play('ui_confirm');
          ProgressionManager.unlockCard(offer.card);
          this.paint(container);
        } else {
          SoundManager.play('ui_cancel');
        }
      });
    });

    container.querySelectorAll<HTMLElement>('[data-buy-rare]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.buyRare || 0);
        const offer = (this.data.rare || [])[idx];
        if (!offer) return;
        const price = Number(offer.price) || 5;
        if (ProgressionManager.spendDiamonds(price)) {
          SoundManager.play('ui_confirm');
          ProgressionManager.unlockCard(offer.card);
          this.paint(container);
        } else {
          SoundManager.play('ui_cancel');
        }
      });
    });

    container.querySelectorAll<HTMLElement>('[data-buy-deck]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.buyDeck || 0);
        const deck = (this.data.decks || [])[idx];
        if (!deck) return;
        const price = Number(deck.price) || 400;
        const ok =
          deck.currency === 'gems'
            ? ProgressionManager.spendDiamonds(price)
            : ProgressionManager.spendGold(price);
        if (ok) {
          SoundManager.play('ui_confirm');
          (deck.cards || []).forEach((c: string) => ProgressionManager.unlockCard(c));
          syncActiveDeckWithArsenal({
            id: deck.id || 'deck-store',
            name: deck.name || 'Deck',
            archetype: deck.theme || 'Oficial',
            accentColor: '#d4a84b',
            cards: (deck.cards || []).slice(0, 12),
            artifacts: ['ocultacao', 'escudo', 'golpe'],
            board: '',
            isActive: true,
            isAvailable: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          this.paint(container);
        } else {
          SoundManager.play('ui_cancel');
        }
      });
    });

    container.querySelectorAll<HTMLElement>('[data-buy-coins]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.buyCoins || 0);
        const cp = (this.data.coinPacks || [])[idx];
        if (!cp) return;
        const gemCost = Number(cp.price) || 10;
        if (ProgressionManager.spendDiamonds(gemCost)) {
          SoundManager.play('ui_confirm');
          ProgressionManager.addGold(Number(cp.gold) || 1000);
          this.paint(container);
        } else {
          SoundManager.play('ui_cancel');
        }
      });
    });

    container.querySelectorAll<HTMLElement>('[data-buy-gems]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.buyGems || 0);
        const gp = (this.data.gemPacks || [])[idx];
        if (!gp) return;
        SoundManager.play('ui_confirm');
        ProgressionManager.addDiamonds(Number(gp.gems) || 100);
        this.paint(container);
      });
    });

    container.querySelectorAll<HTMLElement>('[data-buy-artifact]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.buyArtifact || 0);
        const art = (this.data.artifacts || [])[idx];
        if (!art) return;
        const price = Number(art.price) || 10;
        const ok =
          art.currency === 'gold'
            ? ProgressionManager.spendGold(price)
            : ProgressionManager.spendDiamonds(price);
        if (ok) {
          SoundManager.play('ui_confirm');
          this.paint(container);
        } else {
          SoundManager.play('ui_cancel');
        }
      });
    });
  }

  private async openBoosterModal(pack: any, qty: number, container: HTMLElement) {
    const allTemplates = [...this.customTemplates, ...CARD_TEMPLATES];
    const resolvedCards = await resolveBoosterCards(pack, allTemplates, 12);
    new BoosterPackViewer({
      theme: pack.theme || 'charizard',
      customFrontUrl: this.resolveBoosterArtUrl(pack),
      customBackUrl: pack.customBack || pack.backUrl || undefined,
      customTitle: `${pack.name || 'PACOTE IMPERIAL'}${qty > 1 ? ` (${qty}x)` : ''}`,
      quantity: qty || 1,
      cards: resolvedCards,
      onComplete: (cards) => {
        (cards || resolvedCards || []).forEach((c: any) => {
          if (c?.name) ProgressionManager.unlockCard(c.name);
        });
        this.paint(container);
      },
      onClose: () => {
        this.paint(container);
      },
    });
  }
}
