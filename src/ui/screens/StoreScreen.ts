import { gsap } from 'gsap';
import { CARD_TEMPLATES, SKILL_POOL } from '../../core/constants';
import { ProgressionManager } from '../../core/ProgressionManager';
import { SoundManager } from '../utils/SoundManager';
import { thumbFor } from '../utils/thumb';
import { openCardViewer } from '../components/CardViewer';
import { t } from '../../core/i18n';
import storeData from '../../core/store.json';
import { BoosterPackViewer } from '../components/booster/BoosterPackViewer';

// Vitrine da loja no GAME: banner slider, diárias rotativas, raras,
// decks completos e pacotes. Lê src/core/store.json (forja v2).
// Raras, decks e pacotes em CARROSSÉIS VERTICAIS (trilho ▲▼ + páginas).
export class StoreScreen {
  private static activeTimers: number[] = [];

  private data: any;
  private dailyPage = 0;
  private rarePage = 0;
  private artPage = 0;
  private readonly rarePageSize = 6;
  private readonly artPageSize = 4;

  private boosterActiveIdx = 0;
  private boosterQty = 1;
  private boosterSplitIdx = 0;
  private boosterSplitQty = 1;
  private boosterDisplayMode: 'carousel' | 'split' = 'carousel';
  private deckActiveIdx = 0;

  private customTemplates: any[] = [];

  constructor(customData?: any) {
    const d: any = customData || storeData || {};
    this.customTemplates = d.templates || [];
    this.boosterDisplayMode = (d.boosterDisplayMode === 'split') ? 'split' : 'carousel';

    this.data = {
      titles: d.titles || {},
      banners: (d.banners || []).filter((u: string) => !!u).slice(0, 3),
      dailyPool: (d.dailyPool || []).filter((o: any) => o && o.card),
      rare: (d.rare || []).filter((o: any) => o && o.card),
      decks: d.decks || [],
      packs: d.packs || [],
      coinPacks: d.coinPacks || [],
      gemPacks: d.gemPacks || [],
      artifacts: (d.artifacts || []).filter((o: any) => o && o.id),
      sectionOrder: d.sectionOrder || ['banners', 'daily', 'rare', 'decks', 'packs', 'packs_split', 'coins', 'gems', 'artifacts'],
      sectionVisibility: d.sectionVisibility || {},
      deckLayoutMode: d.deckLayoutMode || 'carousel',
      boosterDisplayMode: d.boosterDisplayMode || 'carousel'
    };
  }

  // Títulos das seções: nome customizado na forja prevalece; se for o
  // padrão em PT, traduz p/ o idioma atual.
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

  private title(key: string, fallback: string): string {
    const custom = this.data.titles[key];
    if (custom && custom !== (StoreScreen.PT_SECTION_DEFAULTS[key] ?? fallback)) return custom;
    const tr = t('st.' + key);
    if (tr !== 'st.' + key) return tr;
    return custom || fallback;
  }

  private resolveCard(name: string): any {
    if (!name) return null;
    if (this.customTemplates && this.customTemplates.length > 0) {
      const found = this.customTemplates.find(c => c && (c.name === name || c.id === name));
      if (found) return found;
      const clean = String(name).trim().toLowerCase();
      const foundClean = this.customTemplates.find(c => c && (
        String(c.name || '').trim().toLowerCase() === clean ||
        String(c.id || '').trim().toLowerCase() === clean
      ));
      if (foundClean) return foundClean;
    }
    const clean = String(name).trim().toLowerCase();
    return (CARD_TEMPLATES as any[]).find(c => c && (
      c.name === name ||
      c.id === name ||
      String(c.name || '').trim().toLowerCase() === clean ||
      String(c.id || '').trim().toLowerCase() === clean
    )) || null;
  }

  private getOwned(): { cards: string[]; decks: string[]; artifacts: string[] } {
    try {
      const raw = localStorage.getItem('store_owned');
      if (raw) {
        const o = JSON.parse(raw);
        return { cards: o.cards || [], decks: o.decks || [], artifacts: o.artifacts || [] };
      }
    } catch {}
    return { cards: [], decks: [], artifacts: [] };
  }

  private saveOwned(o: { cards: string[]; decks: string[]; artifacts: string[] }) {
    try { localStorage.setItem('store_owned', JSON.stringify(o)); } catch {}
  }

  private resolveArtifact(id: string): any {
    return (SKILL_POOL as any[]).find(s => s.id === id) || null;
  }

  private dayNumber(): number {
    return Math.floor(Date.now() / 86400000);
  }

  private dailyItems(): any[] {
    const pool = this.data.dailyPool;
    if (pool.length === 0) return [];
    const off = this.dayNumber() % pool.length;
    const rotated = pool.map((_: any, i: number) => pool[(i + off) % pool.length]);
    const out: any[] = [];
    for (let k = 0; k < 18; k++) out.push(rotated[k % rotated.length]);
    return out.slice(this.dailyPage * 6, this.dailyPage * 6 + 6);
  }

  private buyBtn(kind: string, id: string, owned: boolean, price: string = ''): string {
    if (owned) {
      return `<button class="store-buy" disabled style="opacity:0.55; cursor:default; padding:8px 10px; border-radius:12px; border:3px solid #0e3a1a; background:linear-gradient(180deg, #3f7a4d, #24522f); color:#d8ffe2; font-weight:950; font-size:0.6rem; letter-spacing:1px; width:100%;">${t('store2.owned')}</button>`;
    }
    return `<button class="store-buy" data-kind="${kind}" data-id="${this.esc(id)}" style="padding:8px 10px; border-radius:12px; border:3px solid #0e1f00; background:linear-gradient(180deg, #b8f54d 0%, #7ed321 38%, #4a9b1f 78%, #2c620d 100%); color:#0f1f00; font-weight:950; font-size:0.6rem; letter-spacing:1px; cursor:pointer; box-shadow:0 4px 0 rgba(0,0,0,0.5), 0 0 14px rgba(150,255,70,0.4), inset 0 2px 0 rgba(255,255,255,0.5); position:relative; overflow:hidden; width:100%;">${t('store2.buy')}${price ? ' · ' + price : ''}</button>`;
  }

  private esc(s: string): string {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  private ghostCell(): string {
    return `<div style="aspect-ratio:3/4; border:2px dashed rgba(255,255,255,0.25); border-radius:14px; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.35); font-size:1.4rem;">+</div>`;
  }

  private ghostRow(): string {
    return `<div style="display:flex; align-items:center; justify-content:center; border:2px dashed rgba(255,255,255,0.25); border-radius:12px; padding:16px; color:rgba(255,255,255,0.4); font-size:0.6rem; letter-spacing:2px; font-weight:900;">+ ${t('store2.empty')}</div>`;
  }

  private secTitle(text: string, extra: string = ''): string {
    return `
      <div style="display:flex; align-items:center; gap:10px; margin:22px 16px 10px 16px;">
        <div style="flex:1; height:2px; background:linear-gradient(90deg, transparent, rgba(212,175,55,0.6));"></div>
        <div style="font-weight:950; letter-spacing:3px; font-size:0.8rem; color:#ffd76a; text-shadow:-1px -1px 0 #2a1a00, 1px -1px 0 #2a1a00, -1px 1px 0 #2a1a00, 1px 1px 0 #2a1a00, 0 0 14px rgba(212,175,55,0.4); white-space:nowrap;">${this.esc(text)}${extra}</div>
        <div style="flex:1; height:2px; background:linear-gradient(90deg, rgba(212,175,55,0.6), transparent);"></div>
      </div>`;
  }

  private cardCell(offer: any, currency: string, owned: boolean, key: string): string {
    const c = this.resolveCard(offer.card);
    const art = c && c.image ? `background-image:url('${c.image}');` : 'background:rgba(255,255,255,0.05);';
    return `
      <div class="store-sec" style="background:linear-gradient(180deg, rgba(58,42,21,0.9), rgba(20,13,6,0.9)); border:3px solid #0e0903; border-radius:14px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 4px 0 rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,236,190,0.2);">
        <div class="store-view-card" data-view-name="${this.esc(offer.card)}" data-view-cur="${currency}" style="aspect-ratio:3/4; ${art} background-size:cover; background-position:center; position:relative; cursor:pointer; box-shadow:inset 0 0 0 2px rgba(212,175,55,0.55);">
          ${owned ? `<div style="position:absolute; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; font-size:2.4rem;">✓</div>` : ''}
        </div>
        <div style="padding:7px 6px 8px 6px; display:flex; flex-direction:column; gap:5px; align-items:stretch; text-align:center;">
          <div style="font-size:0.58rem; font-weight:950; letter-spacing:0.5px; color:#ffe9a8; text-shadow:0 2px 0 #000; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.esc(offer.card).toUpperCase()}</div>
          <div>${this.buyBtn('card:' + currency, key, owned, `${currency === 'gems' ? '💎' : '🪙'} ${offer.price}`)}</div>
        </div>
      </div>`;
  }

  private bannerHtml(): string {
    const d = this.data;
    const inner = d.banners.length > 0 ? `
        <div id="store-banner-track" data-banner-track="top" style="display:flex; transition:transform 0.6s cubic-bezier(0.4,0,0.2,1);">
          ${d.banners.map((u: string) => `
            <div style="min-width:100%; aspect-ratio:1080/380; background:url('${u}') center/cover, #111;"></div>`).join('')}
        </div>
        ${d.banners.length > 1 ? `
        <div id="store-banner-dots" style="position:absolute; bottom:8px; left:0; right:0; display:flex; gap:6px; justify-content:center;">
          ${d.banners.map((_: string, i: number) => `
            <span class="store-dot" data-i="${i}" style="width:8px; height:8px; border-radius:50%; background:${i === 0 ? '#ffd700' : 'rgba(255,255,255,0.35)'}; cursor:pointer; box-shadow:0 1px 3px #000;"></span>`).join('')}
        </div>` : ''}` : `
        <div style="aspect-ratio:1080/380; display:flex; align-items:center; justify-content:center; gap:8px; border-top:2px dashed rgba(255,255,255,0.25); border-bottom:2px dashed rgba(255,255,255,0.25); color:rgba(255,255,255,0.4); font-size:0.6rem; letter-spacing:2px; font-weight:900;">+ BANNERS · ${t('store2.empty')}</div>`;
    return `
      <div class="store-sec" style="margin:12px 0 0 0; border-radius:0; overflow:hidden; border-top:3px solid #0e0903; border-bottom:3px solid #0e0903; box-shadow:0 5px 0 rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.25); position:relative;">
        ${inner}
      </div>`;
  }



  private dailyGridHtml(owned: { cards: string[]; decks: string[] }): string {
    if (this.data.dailyPool.length === 0) {
      return Array.from({ length: 6 }).map(() => this.ghostCell()).join('');
    }
    return this.dailyItems().map(o =>
      this.cardCell(o, 'gold', owned.cards.includes(o.card), 'daily:' + o.card)).join('');
  }

  private rareTilesHtml(owned: { cards: string[]; decks: string[] }): string {
    if (this.data.rare.length === 0) {
      return Array.from({ length: this.rarePageSize }).map(() => this.ghostCell());
    }
    return this.data.rare.map((o: any) =>
      this.cardCell(o, 'gems', owned.cards.includes(o.card), 'rare:' + o.card));
  }

  private rarePages(): number {
    return Math.max(1, Math.ceil(this.data.rare.length / this.rarePageSize));
  }

  private rareSlice(owned: { cards: string[]; decks: string[] }): string {
    const tiles = this.rareTilesHtml(owned);
    return tiles.slice(this.rarePage * this.rarePageSize, this.rarePage * this.rarePageSize + this.rarePageSize).join('');
  }

  private getSectionOrder(): string[] {
    if (Array.isArray(this.data.sectionOrder)) {
      return [...this.data.sectionOrder];
    }
    return ['banners', 'daily', 'rare', 'decks', 'packs', 'packs_split', 'coins', 'gems', 'artifacts'];
  }

  private isSectionVisible(secKey: string): boolean {
    if (this.data.sectionVisibility && typeof this.data.sectionVisibility[secKey] === 'boolean') {
      return this.data.sectionVisibility[secKey];
    }
    return true;
  }

  private deckSectionsHtml(owned: { cards: string[]; decks: string[] }): string {
    if (!this.data.decks || this.data.decks.length === 0) return this.ghostRow();
    return this.renderDeckStandaloneHtml(owned);
  }

  // SECÇÕES INDEPENDENTES/SEPARADAS (CADA DECK EM SUA PRÓPRIA SECÇÃO DEDICADA)
  private renderDeckStandaloneHtml(owned: { cards: string[]; decks: string[] }): string {
    return this.data.decks.map((deck: any) => {
      const isOwned = owned.decks.includes(deck.id);
      const cards = deck.cards || [];
      return `
        <div class="store-sec" style="display:flex; flex-direction:column; gap:8px; background:linear-gradient(180deg, rgba(58,42,21,0.92), rgba(20,13,6,0.92)); border:3px solid #0e0903; border-radius:14px; padding:12px 14px; box-shadow:0 4px 0 rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,236,190,0.2);">
          <!-- Cabeçalho do Deck (clicável para abrir visor) -->
          <div class="store-view-deck" data-deck="${this.esc(deck.id)}" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" title="Toque para ver cartas do deck em tela cheia">
            <div style="font-size:0.8rem; font-weight:950; color:#ffd76a; letter-spacing:1px; text-shadow:0 2px 0 #000;">
              ${this.esc(deck.name).toUpperCase()}
            </div>
            <div style="font-size:0.6rem; color:#7ee7ff; font-weight:900;">
              ${cards.length} ${t('store2.cards')} 🔍
            </div>
          </div>

          <div style="font-size:0.62rem; color:rgba(255,255,255,0.7); line-height:1.35;">${this.esc(deck.desc || '')}</div>

          <!-- Trilho Deslizável com Todas as Cartas do Deck (Deslize para o lado / Toque para ver) -->
          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.56rem; font-weight:900; color:#ffd700; letter-spacing:0.5px;">${t('st.deckCards')}:</span>
              <span class="store-view-deck" data-deck="${this.esc(deck.id)}" style="font-size:0.56rem; color:#7ee7ff; cursor:pointer; font-weight:900;">🔍 ${t('st.viewAll')}</span>
            </div>
            <div style="position:relative; width:100%; display:flex; align-items:center;">
              <button class="store-strip-scroll-left" data-deck="${this.esc(deck.id)}" style="position:absolute; left:-4px; z-index:3; width:22px; height:36px; border-radius:6px; border:1px solid rgba(255,215,0,0.5); background:rgba(0,0,0,0.85); color:#ffd700; font-size:0.85rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px #000;">‹</button>
              <div class="store-deck-cards-strip" id="deck-strip-${this.esc(deck.id)}" style="flex:1; display:flex; gap:8px; overflow-x:auto; padding:6px 18px; scrollbar-width:none; -webkit-overflow-scrolling:touch; touch-action:pan-x; scroll-behavior:smooth;">
                ${cards.map((n: string, ci: number) => {
                  const c = this.resolveCard(n);
                  const art = c && c.image ? `background-image:url('${c.image}');` : 'background:rgba(255,255,255,0.06);';
                  return `
                    <div class="store-view-deck-card" data-deck="${this.esc(deck.id)}" data-card-idx="${ci}" style="width:62px; height:88px; border-radius:6px; border:2px solid #d4af37; ${art} background-size:cover; background-position:center; flex-shrink:0; cursor:pointer; position:relative; box-shadow:0 4px 10px rgba(0,0,0,0.6); transition:transform 0.12s ease;" title="${this.esc(n)}">
                      <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.85); font-size:0.48rem; font-weight:900; color:#ffe9a8; text-align:center; padding:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${this.esc(n)}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
              <button class="store-strip-scroll-right" data-deck="${this.esc(deck.id)}" style="position:absolute; right:-4px; z-index:3; width:22px; height:36px; border-radius:6px; border:1px solid rgba(255,215,0,0.5); background:rgba(0,0,0,0.85); color:#ffd700; font-size:0.85rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px #000;">›</button>
            </div>
          </div>

          <div style="margin-top:2px;">
            ${this.buyBtn('deck', deck.id, isOwned, `${deck.currency === 'gems' ? '💎' : '🪙'} ${deck.price}`)}
          </div>
        </div>
      `;
    }).join('');
  }

  private readonly themeGradients: Record<string, { bg: string; border: string; glow: string; tag: string; icon: string }> = {
    charizard: {
      bg: 'linear-gradient(135deg, rgba(60, 20, 10, 0.95), rgba(20, 8, 4, 0.95))',
      border: '#f97316',
      glow: 'rgba(249, 115, 22, 0.45)',
      tag: 'FOGO / OFENSIVO',
      icon: '🔥'
    },
    pikachu: {
      bg: 'linear-gradient(135deg, rgba(50, 40, 10, 0.95), rgba(20, 16, 4, 0.95))',
      border: '#eab308',
      glow: 'rgba(234, 179, 8, 0.45)',
      tag: 'RAIO / VELOZ',
      icon: '⚡'
    },
    rayquaza: {
      bg: 'linear-gradient(135deg, rgba(10, 45, 25, 0.95), rgba(4, 20, 12, 0.95))',
      border: '#22c55e',
      glow: 'rgba(34, 197, 94, 0.45)',
      tag: 'NATUREZA / ÉPICO',
      icon: '🌿'
    },
    mewtwo: {
      bg: 'linear-gradient(135deg, rgba(40, 15, 60, 0.95), rgba(15, 6, 25, 0.95))',
      border: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.45)',
      tag: 'ARCANO / MÍSTICO',
      icon: '🔮'
    },
    winter: {
      bg: 'linear-gradient(135deg, rgba(15, 35, 65, 0.95), rgba(6, 15, 30, 0.95))',
      border: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.45)',
      tag: 'LENDAS DO INVERNO',
      icon: '❄️'
    }
  };

  private renderBoosterPouchHtml(pack: any, isMain: boolean = true, customWidth?: string): string {
    const styleInfo = this.themeGradients[pack.theme || 'charizard'] || this.themeGradients.charizard;
    const frontImg = pack.customFront;
    const w = customWidth || (isMain ? '185px' : '140px');
    const borderColor = '#ff7a00';
    const borderGlow = 'rgba(255, 122, 0, 0.45)';

    return `
      <div class="store-booster-pouch" style="aspect-ratio:1/1.78; width:${w}; border-radius:2px; position:relative; overflow:hidden; background:#0c0d12; border:2px solid ${borderColor}; box-shadow:${isMain ? `0 14px 40px rgba(0,0,0,0.9), 0 0 24px ${borderGlow}` : '0 6px 18px rgba(0,0,0,0.7)'}; display:flex; flex-direction:column; user-select:none; flex-shrink:0;">
        ${frontImg ? `
          <div style="width:100%; height:100%; position:relative; overflow:hidden; border-radius:0px; background:#000;">
            <img src="${frontImg}" alt="${this.esc(pack.name)}" loading="lazy" decoding="async" style="width:100%; height:100%; object-fit:cover; display:block; border-radius:0px;" />
            <div style="position:absolute; inset:0; pointer-events:none; background:linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.02) 40%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.3) 100%);"></div>
          </div>
        ` : `
          <!-- Crimp Top -->
          <div style="height:16px; width:100%; background:repeating-linear-gradient(90deg, #151515 0px, #151515 2px, #3c3c3c 2px, #3c3c3c 4px); border-bottom:1.5px solid rgba(255,255,255,0.2); z-index:3; flex-shrink:0;"></div>

          <!-- Corpo do Pouch -->
          <div style="flex:1; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; background:${styleInfo.bg};">
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:10px; width:100%; height:100%;">
              <div style="font-size:${isMain ? '3rem' : '2rem'}; filter:drop-shadow(0 4px 10px rgba(0,0,0,0.8));">${styleInfo.icon}</div>
              <div style="font-size:0.65rem; font-weight:950; letter-spacing:2px; color:#ffd700; text-shadow:0 2px 4px #000; margin-top:6px;">BOOSTER</div>
              <div style="font-size:0.55rem; color:rgba(255,255,255,0.7); font-weight:700;">${styleInfo.tag}</div>
            </div>
            <div style="position:absolute; inset:0; pointer-events:none; background:linear-gradient(135deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.06) 38%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.35) 100%);"></div>
          </div>

          <!-- Crimp Bottom -->
          <div style="height:16px; width:100%; background:repeating-linear-gradient(90deg, #151515 0px, #151515 2px, #3c3c3c 2px, #3c3c3c 4px); border-top:1.5px solid rgba(255,255,255,0.2); z-index:3; flex-shrink:0;"></div>
        `}
      </div>
    `;
  }

  private renderCircularPackSelectors(packs: any[], activeIdx: number): string {
    return `
      <div style="display:flex; justify-content:center; align-items:center; gap:10px; flex-wrap:wrap;">
        ${packs.map((p, i) => {
          const isActive = i === activeIdx;
          const styleInfo = this.themeGradients[p.theme || 'charizard'] || this.themeGradients.charizard;
          return `
            <button class="store-booster-circle-btn" data-idx="${i}" title="${this.esc(p.name)}" style="width:38px; height:38px; border-radius:50%; border:${isActive ? '2.5px solid #ffd700' : '1.5px solid rgba(255,255,255,0.2)'}; background:${isActive ? 'rgba(255,215,0,0.25)' : 'rgba(0,0,0,0.6)'}; cursor:pointer; padding:0; display:flex; align-items:center; justify-content:center; overflow:hidden; transform:${isActive ? 'scale(1.15)' : 'scale(1)'}; box-shadow:${isActive ? '0 0 14px rgba(255,215,0,0.8)' : '0 2px 6px rgba(0,0,0,0.4)'}; transition:all 0.15s ease;">
              ${p.customFront ? `
                <img src="${thumbFor(p.customFront)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${p.customFront}'" style="width:100%; height:100%; object-fit:cover;" />
              ` : `
                <span style="font-size:1.1rem; filter:drop-shadow(0 1px 3px rgba(0,0,0,0.8));">${styleInfo.icon}</span>
              `}
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  private renderBoosterRatesHtml(pack: any, compact: boolean = false): string {
    if (pack.mode === 'special') {
      return `
        <span style="background:rgba(168,85,247,0.2); border:1px solid rgba(168,85,247,0.5); border-radius:4px; padding:${compact ? '2px 6px' : '3px 10px'}; font-size:${compact ? '0.55rem' : '0.62rem'}; color:#d8b4fe; font-weight:900; letter-spacing:0.5px;">
          ⭐ ${t('st.specialPool')} (${(pack.fixedCards || []).length} ${t('store2.cards')})
        </span>
      `;
    }
    const rates = pack.rates || { common: 70, rare: 25, legendary: 5 };
    if (compact) {
      return `
        <div style="display:flex; gap:3px; flex-wrap:wrap; justify-content:flex-start; align-items:center;">
          <span style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.2); border-radius:4px; padding:1.5px 5px; font-size:0.52rem; color:#f1f5f9; font-weight:800;">⬜ ${rates.common ?? 70}%</span>
          <span style="background:rgba(0,240,255,0.12); border:1px solid rgba(0,240,255,0.4); border-radius:4px; padding:1.5px 5px; font-size:0.52rem; color:#38bdf8; font-weight:800;">🔷 ${rates.rare ?? 25}%</span>
          <span style="background:rgba(255,170,0,0.15); border:1px solid rgba(255,170,0,0.4); border-radius:4px; padding:1.5px 5px; font-size:0.52rem; color:#fbbf24; font-weight:800;">⭐ ${rates.legendary ?? 5}%</span>
          <span style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.2); border-radius:4px; padding:1.5px 5px; font-size:0.52rem; color:#94a3b8; font-weight:900;">📦 ${pack.cardsCount || 3}</span>
        </div>
      `;
    }
    return `
      <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:center; align-items:center;">
        <span style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.2); border-radius:4px; padding:2px 8px; font-size:0.6rem; color:#f1f5f9; font-weight:800;">⬜ ${rates.common ?? 70}%</span>
        <span style="background:rgba(0,240,255,0.12); border:1px solid rgba(0,240,255,0.4); border-radius:4px; padding:2px 8px; font-size:0.6rem; color:#38bdf8; font-weight:800;">🔷 ${rates.rare ?? 25}%</span>
        <span style="background:rgba(255,170,0,0.15); border:1px solid rgba(255,170,0,0.4); border-radius:4px; padding:2px 8px; font-size:0.6rem; color:#fbbf24; font-weight:800;">⭐ ${rates.legendary ?? 5}%</span>
        <span style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.2); border-radius:4px; padding:2px 8px; font-size:0.6rem; color:#94a3b8; font-weight:900;">📦 ${pack.cardsCount || 3} ${t('st.cardsCount')}</span>
      </div>
    `;
  }

  private renderBoosterActionBarHtml(activePack: any): string {
    const curIcon = activePack.currency === 'gems' ? '💎' : '🪙';
    const unitPrice = Number(activePack.price) || 0;
    const totalPrice = unitPrice * this.boosterQty;
    const priceText = totalPrice === 0 ? 'GRÁTIS' : `${curIcon} ${totalPrice}`;

    return `
      <div style="display:flex; align-items:center; justify-content:center; gap:10px; width:100%; max-width:320px; margin:14px auto 0 auto; box-sizing:border-box;">
        <!-- Botão Quantidade Circular Gamer -->
        <button id="btn-booster-qty" title="Alternar quantidade" style="width:44px; height:44px; border-radius:50%; border:2px solid #ffd700; background:linear-gradient(180deg, #30220d, #140d04); color:#ffd700; font-size:0.85rem; font-weight:950; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 0 12px rgba(255,215,0,0.3); flex-shrink:0; transition:transform 0.1s;">
          x${this.boosterQty}
        </button>

        <!-- Cápsula Gamer de Compra / Abertura -->
        <button id="btn-booster-buy-capsule" data-pack-id="${this.esc(activePack.id)}" style="flex:1; height:44px; border-radius:999px; border:2px solid #00f0ff; background:linear-gradient(180deg, #00b4d8 0%, #0077b6 100%); color:#ffffff; font-weight:950; font-size:0.75rem; letter-spacing:1.5px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 0 16px rgba(0,180,216,0.4), inset 0 1px 0 rgba(255,255,255,0.3); white-space:nowrap; padding:0 16px;">
          <span>✨ ${t('st.open3d')}</span>
          <span style="opacity:0.6;">·</span>
          <span style="color:#ffe066; font-weight:950; text-shadow:0 1px 2px #000;">${priceText}</span>
        </button>
      </div>
    `;
  }

  // 1: MODO 1: CARROSSEL HORIZONTAL (CONFORME WIREFRAME DA IMAGEM 2)
  private renderBoosterCarouselModeHtml(packs: any[], activePack: any, activeIdx: number): string {
    const prevIdx = (activeIdx - 1 + packs.length) % packs.length;
    const nextIdx = (activeIdx + 1) % packs.length;
    const prevPack = packs[prevIdx];
    const nextPack = packs[nextIdx];

    return `
      <div style="display:flex; flex-direction:column; align-items:center; width:100%; padding:0 0 16px 0; box-sizing:border-box;">
        <!-- 1. ACIMA: 3 Círculos seletores dos packs (● ● ●) alinhados ao centro -->
        ${this.renderCircularPackSelectors(packs, activeIdx)}

        <!-- 2. CENTRO: Carrossel com 3 Retângulos Verticais Rígidos (Esquerdo, Centro, Direito) -->
        <div style="width:100%; position:relative; overflow:hidden; display:flex; justify-content:center; align-items:center; margin:14px 0; min-height:335px;">
          ${packs.length > 1 ? `
            <!-- Booster Anterior (Peeking Esquerdo) -->
            <div class="store-booster-circle-btn" data-idx="${prevIdx}" title="${this.esc(prevPack.name)}" style="position:absolute; left:-30px; top:50%; transform:translateY(-50%) scale(0.9); opacity:0.35; filter:brightness(0.4); cursor:pointer; z-index:1; transition:all 0.2s ease;">
              ${this.renderBoosterPouchHtml(prevPack, false, '140px')}
            </div>
          ` : ''}

          <!-- Booster Central Ativo (Alongado, Quinas Rígidas) -->
          <div style="z-index:3; transform:scale(1); transition:all 0.2s ease; box-shadow:0 0 30px rgba(0,0,0,0.85);">
            ${this.renderBoosterPouchHtml(activePack, true, '185px')}
          </div>

          ${packs.length > 1 ? `
            <!-- Booster Próximo (Peeking Direito) -->
            <div class="store-booster-circle-btn" data-idx="${nextIdx}" title="${this.esc(nextPack.name)}" style="position:absolute; right:-30px; top:50%; transform:translateY(-50%) scale(0.9); opacity:0.35; filter:brightness(0.4); cursor:pointer; z-index:1; transition:all 0.2s ease;">
              ${this.renderBoosterPouchHtml(nextPack, false, '140px')}
            </div>
          ` : ''}
        </div>

        <!-- 3. ABAIXO: Título, Taxas e Descrição em texto limpo (sem caixa de fundo) -->
        <div style="display:flex; flex-direction:column; align-items:center; gap:6px; text-align:center; max-width:320px; width:100%; padding:0 8px;">
          <div style="font-size:1.15rem; font-weight:950; letter-spacing:1.5px; color:#ffd76a; text-shadow:0 0 10px rgba(255,215,0,0.4);">
            ${this.esc(activePack.name).toUpperCase()}
          </div>
          ${this.renderBoosterRatesHtml(activePack)}
          <div style="font-size:0.72rem; color:rgba(255,255,255,0.7); line-height:1.45; margin-top:2px;">
            ${this.esc(activePack.desc || '')}
          </div>
        </div>

        <!-- 4. ABAIXO: Botão circular quantidade à esquerda + Cápsula de compra à direita -->
        ${this.renderBoosterActionBarHtml(activePack)}
      </div>
    `;
  }

  // 2: MODO 2: SPLIT LATERAL (CONFORME WIREFRAME DO SEGUNDO MODO)
  private renderBoosterSplitModeHtml(packs: any[], activePack: any, activeIdx: number): string {
    const curIcon = activePack.currency === 'gems' ? '💎' : '🪙';
    const unitPrice = Number(activePack.price) || 0;
    const totalPrice = unitPrice * this.boosterQty;
    const priceText = totalPrice === 0 ? 'GRÁTIS' : `${curIcon} ${totalPrice}`;

    return `
      <div style="display:flex; flex-direction:row; align-items:center; justify-content:center; gap:14px; width:100%; padding:4px 0 16px 0; box-sizing:border-box;">
        <!-- Lado Esquerdo: Booster Alongado com Quinas Rígidas -->
        <div style="flex-shrink:0;">
          ${this.renderBoosterPouchHtml(activePack, true, '140px')}
        </div>

        <!-- Lado Direito: Círculos no topo, Texto no meio, Botões embaixo -->
        <div style="flex:1; display:flex; flex-direction:column; gap:8px; min-width:0;">
          <!-- 1. ACIMA: 3 Seletores circulares de packs -->
          <div style="display:flex; align-items:center; gap:8px;">
            ${this.renderCircularPackSelectors(packs, activeIdx)}
          </div>

          <!-- 2. MEIO: Título e Descrição (texto limpo, sem caixa de fundo) -->
          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="font-size:1.05rem; font-weight:950; letter-spacing:1px; color:#ffd76a; text-shadow:0 0 10px rgba(255,215,0,0.4); line-height:1.2;">
              ${this.esc(activePack.name).toUpperCase()}
            </div>
            ${this.renderBoosterRatesHtml(activePack)}
            <div style="font-size:0.68rem; color:rgba(255,255,255,0.7); line-height:1.35; margin-top:2px;">
              ${this.esc(activePack.desc || '')}
            </div>
          </div>

          <!-- 3. EMBAIXO: Botão circular quantidade à esquerda + Cápsula à direita -->
          <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
            <button id="btn-booster-qty" title="Alternar quantidade" style="width:40px; height:40px; border-radius:50%; border:2px solid #ffd700; background:linear-gradient(180deg, #30220d, #140d04); color:#ffd700; font-size:0.8rem; font-weight:950; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 0 10px rgba(255,215,0,0.3); flex-shrink:0;">
              x${this.boosterQty}
            </button>

            <button id="btn-booster-buy-capsule" data-pack-id="${this.esc(activePack.id)}" style="flex:1; height:40px; border-radius:999px; border:2px solid #00f0ff; background:linear-gradient(180deg, #00b4d8 0%, #0077b6 100%); color:#ffffff; font-weight:950; font-size:0.7rem; letter-spacing:1px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 0 14px rgba(0,180,216,0.4); white-space:nowrap; padding:0 12px;">
              <span>✨ ${t('st.open3d')}</span>
              <span style="opacity:0.6;">·</span>
              <span style="color:#ffe066; font-weight:950;">${priceText}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // MÓDULO 1: CARROSSEL HORIZONTAL DE BOOSTERS (COM ANIMAÇÃO ELEGANTE DE DESLIZAR)
  // =========================================================================
  private packBoosterCarouselSectionHtml(): string {
    const allPacks = this.data.packs || [];
    const packs = allPacks.filter((p: any) => p.published !== false && p.active !== false);
    if (packs.length === 0) {
      return `
        <div style="opacity:0.6; font-size:0.75rem; text-align:center; padding:24px; color:#aaa; border:1px dashed rgba(255,255,255,0.15); border-radius:10px; margin:0 16px;">
          Nenhum booster publicado na vitrine no momento.
        </div>
      `;
    }

    if (this.boosterActiveIdx < 0 || this.boosterActiveIdx >= packs.length) {
      this.boosterActiveIdx = 0;
    }
    const activePack = packs[this.boosterActiveIdx] || packs[0];
    const prevIdx = (this.boosterActiveIdx - 1 + packs.length) % packs.length;
    const nextIdx = (this.boosterActiveIdx + 1) % packs.length;
    const prevPack = packs[prevIdx];
    const nextPack = packs[nextIdx];

    return `
      <!-- CABEÇALHO LIMPO DA SECÇÃO MÓDULO 1 -->
      <div style="margin:20px 16px 8px 16px;">
        ${this.secTitle(this.title('packs', 'PACOTES & BOOSTERS (CARROSSEL)'))}
      </div>

      <div id="store-booster-viewport" style="display:flex; flex-direction:column; align-items:center; width:100%; padding:0 0 16px 0; box-sizing:border-box;">
        <!-- 1. ACIMA: 3 Círculos seletores dos packs (● ● ●) alinhados ao centro -->
        <div style="display:flex; justify-content:center; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
          ${packs.map((p: any, i: number) => {
            const isActive = i === this.boosterActiveIdx;
            const styleInfo = this.themeGradients[p.theme || 'charizard'] || this.themeGradients.charizard;
            return `
              <button class="store-carousel-pack-circle" data-idx="${i}" title="${this.esc(p.name)}" style="width:38px; height:38px; border-radius:50%; border:${isActive ? '2.5px solid #ffd700' : '1.5px solid rgba(255,255,255,0.2)'}; background:${isActive ? 'rgba(255,215,0,0.25)' : 'rgba(0,0,0,0.6)'}; cursor:pointer; padding:0; display:flex; align-items:center; justify-content:center; overflow:hidden; transform:${isActive ? 'scale(1.15)' : 'scale(1)'}; box-shadow:${isActive ? '0 0 14px rgba(255,215,0,0.8)' : '0 2px 6px rgba(0,0,0,0.4)'}; transition:all 0.15s ease;">
                ${p.customFront ? `
                  <img src="${thumbFor(p.customFront)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${p.customFront}'" style="width:100%; height:100%; object-fit:cover;" />
                ` : `
                  <span style="font-size:1.1rem; filter:drop-shadow(0 1px 3px rgba(0,0,0,0.8));">${styleInfo.icon}</span>
                `}
              </button>
            `;
          }).join('')}
        </div>

        <!-- 2. CENTRO: Pista do Carrossel com deslize elegante (Esquerdo, Centro, Direito) -->
        <div id="booster-carousel-track" style="width:100%; position:relative; overflow:hidden; display:flex; justify-content:center; align-items:center; margin:8px 0; min-height:335px; touch-action:pan-y;">
          ${packs.length > 1 ? `
            <!-- Booster Anterior (Peeking Esquerdo) -->
            <div id="booster-peek-left" title="${this.esc(prevPack.name)}" style="position:absolute; left:-30px; top:50%; transform:translateY(-50%) scale(0.9); opacity:0.35; filter:brightness(0.4); cursor:pointer; z-index:1; transition:opacity 0.2s ease;">
              ${this.renderBoosterPouchHtml(prevPack, false, '140px')}
            </div>
          ` : ''}

          <!-- Booster Central Ativo (Alongado, Quinas Rígidas) -->
          <div id="booster-center-card" style="z-index:3; transform:scale(1); box-shadow:0 0 32px rgba(0,0,0,0.9);">
            ${this.renderBoosterPouchHtml(activePack, true, '185px')}
          </div>

          ${packs.length > 1 ? `
            <!-- Booster Próximo (Peeking Direito) -->
            <div id="booster-peek-right" title="${this.esc(nextPack.name)}" style="position:absolute; right:-30px; top:50%; transform:translateY(-50%) scale(0.9); opacity:0.35; filter:brightness(0.4); cursor:pointer; z-index:1; transition:opacity 0.2s ease;">
              ${this.renderBoosterPouchHtml(nextPack, false, '140px')}
            </div>
          ` : ''}
        </div>

        <!-- 3. ABAIXO: Título, Taxas e Descrição em texto limpo com fade -->
        <div id="booster-carousel-info" style="display:flex; flex-direction:column; align-items:center; gap:6px; text-align:center; max-width:320px; width:100%; padding:0 8px;">
          <div style="font-size:1.15rem; font-weight:950; letter-spacing:1.5px; color:#ffd76a; text-shadow:0 0 10px rgba(255,215,0,0.4);">
            ${this.esc(activePack.name).toUpperCase()}
          </div>
          ${this.renderBoosterRatesHtml(activePack)}
          <div style="font-size:0.72rem; color:rgba(255,255,255,0.7); line-height:1.45; margin-top:2px;">
            ${this.esc(activePack.desc || '')}
          </div>
        </div>

        <!-- 4. ABAIXO: Botão circular quantidade à esquerda + Cápsula de compra à direita -->
        ${this.renderBoosterActionBarHtml(activePack)}
      </div>
    `;
  }

  private switchBoosterCarousel(container: HTMLElement, targetIdx: number, direction: 'left' | 'right' | 'auto' = 'auto') {
    const packs = (this.data.packs || []).filter((p: any) => p.published !== false && p.active !== false);
    if (packs.length <= 1) return;
    if (targetIdx < 0) targetIdx = packs.length - 1;
    if (targetIdx >= packs.length) targetIdx = 0;
    if (targetIdx === this.boosterActiveIdx) return;

    const wrap = container.querySelector('#store-boosters-wrapper');
    if (!wrap) return;

    const track = wrap.querySelector('#booster-carousel-track') as HTMLElement | null;
    const info = wrap.querySelector('#booster-carousel-info') as HTMLElement | null;

    let dir = 1;
    if (direction === 'left') dir = -1;
    else if (direction === 'right') dir = 1;
    else dir = targetIdx > this.boosterActiveIdx ? 1 : -1;

    if (track) {
      // Elegante deslizar saindo para o lado com GSAP
      gsap.to(track, {
        x: -dir * 110,
        opacity: 0.15,
        scale: 0.94,
        duration: 0.22,
        ease: 'power2.in',
        onComplete: () => {
          this.boosterActiveIdx = targetIdx;
          this.updateBoosterCarousel(container);

          const newTrack = container.querySelector('#store-boosters-wrapper #booster-carousel-track') as HTMLElement | null;
          const newInfo = container.querySelector('#store-boosters-wrapper #booster-carousel-info') as HTMLElement | null;
          if (newTrack) {
            gsap.fromTo(newTrack,
              { x: dir * 110, opacity: 0.15, scale: 0.94 },
              { x: 0, opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' }
            );
          }
          if (newInfo) {
            gsap.fromTo(newInfo,
              { y: 12, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.28, ease: 'power2.out' }
            );
          }
        }
      });
    } else {
      this.boosterActiveIdx = targetIdx;
      this.updateBoosterCarousel(container);
    }
  }

  private updateBoosterCarousel(container: HTMLElement) {
    const wrap = container.querySelector('#store-boosters-wrapper');
    if (!wrap) return;
    wrap.innerHTML = this.packBoosterCarouselSectionHtml();
    this.bindBoosterCarousel(container);
  }

  private bindBoosterCarousel(container: HTMLElement) {
    const wrap = container.querySelector('#store-boosters-wrapper');
    if (!wrap) return;
    const packs = (this.data.packs || []).filter((p: any) => p.published !== false && p.active !== false);

    // Seletores circulares
    wrap.querySelectorAll('.store-carousel-pack-circle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
        if (!isNaN(idx)) {
          this.switchBoosterCarousel(container, idx, 'auto');
        }
      });
    });

    // Peeking Esquerdo (Desliza para trás)
    wrap.querySelector('#booster-peek-left')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const prevIdx = (this.boosterActiveIdx - 1 + packs.length) % packs.length;
      this.switchBoosterCarousel(container, prevIdx, 'left');
    });

    // Peeking Direito (Desliza para frente)
    wrap.querySelector('#booster-peek-right')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const nextIdx = (this.boosterActiveIdx + 1) % packs.length;
      this.switchBoosterCarousel(container, nextIdx, 'right');
    });

    // Gesto de Swipe Touch no Carrossel para Celular
    const track = wrap.querySelector('#booster-carousel-track') as HTMLElement | null;
    if (track) {
      let touchStartX = 0;
      let touchStartY = 0;
      track.addEventListener('touchstart', (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      track.addEventListener('touchend', (e: TouchEvent) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) {
            // Swipe esquerda -> próximo
            const nextIdx = (this.boosterActiveIdx + 1) % packs.length;
            this.switchBoosterCarousel(container, nextIdx, 'right');
          } else {
            // Swipe direita -> anterior
            const prevIdx = (this.boosterActiveIdx - 1 + packs.length) % packs.length;
            this.switchBoosterCarousel(container, prevIdx, 'left');
          }
        }
      }, { passive: true });
    }

    // Botão Quantidade Circular (cicla: 1 -> 3 -> 5 -> 10 -> 1)
    wrap.querySelector('#btn-booster-qty')?.addEventListener('click', () => {
      const opts = [1, 3, 5, 10];
      const curIdx = opts.indexOf(this.boosterQty);
      this.boosterQty = opts[(curIdx + 1) % opts.length];
      this.updateBoosterCarousel(container);
    });

    // Cápsula de Compra / Abertura em 3D
    wrap.querySelector('#btn-booster-buy-capsule')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const packId = (wrap.querySelector('#btn-booster-buy-capsule') as HTMLElement)?.dataset.packId;
      if (!packId) return;
      this.openBoosterModal(container, packId, this.boosterQty);
    });
  }

  // =========================================================================
  // MÓDULO 2: SPLIT LATERAL DE BOOSTERS (SEÇÃO DEDICADA INDEPENDENTE)
  // =========================================================================
  private packBoosterSplitSectionHtml(): string {
    const allPacks = this.data.packs || [];
    const packs = allPacks.filter((p: any) => p.published !== false && p.active !== false);
    if (packs.length === 0) return '';

    if (this.boosterSplitIdx < 0 || this.boosterSplitIdx >= packs.length) {
      this.boosterSplitIdx = 0;
    }
    const activePack = packs[this.boosterSplitIdx] || packs[0];
    const curIcon = activePack.currency === 'gems' ? '💎' : '🪙';
    const unitPrice = Number(activePack.price) || 0;
    const totalPrice = unitPrice * this.boosterSplitQty;
    const priceText = totalPrice === 0 ? 'GRÁTIS' : `${curIcon} ${totalPrice}`;

    return `
      <!-- CABEÇALHO DA SECÇÃO MÓDULO 2 (SPLIT) -->
      <div style="margin:20px 10px 6px 10px;">
        ${this.secTitle(this.title('packs_split', 'DESTAQUES ESPECIAIS (SPLIT)'))}
      </div>

      <div id="store-booster-split-body" style="display:flex; flex-direction:row; align-items:center; justify-content:space-between; gap:10px; width:100%; max-width:100%; padding:4px 10px 14px 10px; box-sizing:border-box; overflow-x:hidden;">
        <!-- Lado Esquerdo: Booster Alongado Proporcional ao Mobile -->
        <div id="booster-split-card-pouch" style="flex-shrink:0;">
          ${this.renderBoosterPouchHtml(activePack, true, '110px')}
        </div>

        <!-- Lado Direito: Círculos no topo, Texto no meio, Botões embaixo -->
        <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:6px; overflow:hidden;">
          <!-- 1. ACIMA: Seletores circulares de packs -->
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            ${packs.map((p: any, i: number) => {
              const isActive = i === this.boosterSplitIdx;
              const styleInfo = this.themeGradients[p.theme || 'charizard'] || this.themeGradients.charizard;
              return `
                <button class="store-split-pack-circle" data-idx="${i}" title="${this.esc(p.name)}" style="width:28px; height:28px; border-radius:50%; border:${isActive ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.2)'}; background:${isActive ? 'rgba(56,189,248,0.25)' : 'rgba(0,0,0,0.6)'}; cursor:pointer; padding:0; display:flex; align-items:center; justify-content:center; overflow:hidden; transform:${isActive ? 'scale(1.1)' : 'scale(1)'}; box-shadow:${isActive ? '0 0 10px rgba(56,189,248,0.7)' : '0 2px 4px rgba(0,0,0,0.4)'}; transition:all 0.15s ease; flex-shrink:0;">
                  ${p.customFront ? `
                    <img src="${thumbFor(p.customFront)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${p.customFront}'" style="width:100%; height:100%; object-fit:cover;" />
                  ` : `
                    <span style="font-size:0.85rem; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8));">${styleInfo.icon}</span>
                  `}
                </button>
              `;
            }).join('')}
          </div>

          <!-- 2. MEIO: Título e Descrição (texto limpo, sem estourar laterais) -->
          <div id="booster-split-info-area" style="display:flex; flex-direction:column; gap:3px; min-width:0; overflow:hidden;">
            <div style="font-size:0.85rem; font-weight:950; letter-spacing:0.5px; color:#ffd76a; text-shadow:0 0 8px rgba(255,215,0,0.4); line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${this.esc(activePack.name).toUpperCase()}
            </div>
            ${this.renderBoosterRatesHtml(activePack, true)}
            <div style="font-size:0.6rem; color:rgba(255,255,255,0.7); line-height:1.25; margin-top:2px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis;">
              ${this.esc(activePack.desc || '')}
            </div>
          </div>

          <!-- 3. EMBAIXO: Botão circular quantidade + Cápsula de compra sem estourar tela -->
          <div style="display:flex; align-items:center; gap:6px; margin-top:2px; width:100%; min-width:0;">
            <button id="btn-booster-split-qty" title="Alternar quantidade" style="width:32px; height:32px; border-radius:50%; border:1.5px solid #ffd700; background:linear-gradient(180deg, #30220d, #140d04); color:#ffd700; font-size:0.75rem; font-weight:950; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 0 8px rgba(255,215,0,0.3); flex-shrink:0;">
              x${this.boosterSplitQty}
            </button>

            <button id="btn-booster-split-buy" data-pack-id="${this.esc(activePack.id)}" style="flex:1; min-width:0; height:34px; border-radius:999px; border:1.5px solid #00f0ff; background:linear-gradient(180deg, #00b4d8 0%, #0077b6 100%); color:#ffffff; font-weight:950; font-size:0.65rem; letter-spacing:0.5px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 0 10px rgba(0,180,216,0.35); white-space:nowrap; padding:0 8px; overflow:hidden;">
              <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">✨ ${t('st.open')}</span>
              <span style="opacity:0.5;">·</span>
              <span style="color:#ffe066; font-weight:950; flex-shrink:0;">${priceText}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private bindBoosterSplit(container: HTMLElement) {
    const wrap = container.querySelector('#store-boosters-split-wrapper');
    if (!wrap) return;

    wrap.querySelectorAll('.store-split-pack-circle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
        if (!isNaN(idx) && idx !== this.boosterSplitIdx) {
          const pouch = wrap.querySelector('#booster-split-card-pouch') as HTMLElement | null;
          const info = wrap.querySelector('#booster-split-info-area') as HTMLElement | null;
          if (pouch) {
            gsap.to(pouch, { opacity: 0.2, scale: 0.95, duration: 0.15, onComplete: () => {
              this.boosterSplitIdx = idx;
              this.updateBoosterSplit(container);
              const newPouch = container.querySelector('#store-boosters-split-wrapper #booster-split-card-pouch');
              if (newPouch) gsap.fromTo(newPouch, { opacity: 0.2, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.25 });
            }});
          } else {
            this.boosterSplitIdx = idx;
            this.updateBoosterSplit(container);
          }
        }
      });
    });

    wrap.querySelector('#btn-booster-split-qty')?.addEventListener('click', () => {
      const opts = [1, 3, 5, 10];
      const curIdx = opts.indexOf(this.boosterSplitQty);
      this.boosterSplitQty = opts[(curIdx + 1) % opts.length];
      this.updateBoosterSplit(container);
    });

    wrap.querySelector('#btn-booster-split-buy')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const packId = (wrap.querySelector('#btn-booster-split-buy') as HTMLElement)?.dataset.packId;
      if (!packId) return;
      this.openBoosterModal(container, packId, this.boosterSplitQty);
    });
  }

  private updateBoosterSplit(container: HTMLElement) {
    const wrap = container.querySelector('#store-boosters-split-wrapper');
    if (!wrap) return;
    wrap.innerHTML = this.packBoosterSplitSectionHtml();
    this.bindBoosterSplit(container);
  }

  private coinTilesHtml(): string {
    const d = this.data;
    if (d.coinPacks.length === 0) return this.ghostRow();
    return d.coinPacks.map((p: any, i: number) => `
          <div class="store-sec" style="border:3px solid #0e0903; border-radius:14px; overflow:hidden; background:linear-gradient(180deg, rgba(58,42,21,0.9), rgba(20,13,6,0.9)); box-shadow:0 4px 0 rgba(0,0,0,0.5); display:flex; flex-direction:column;">
            <div style="aspect-ratio:1/1; ${p.image ? `background:url('${p.image}') center/contain no-repeat #0a0805;` : 'display:flex; align-items:center; justify-content:center; font-size:2rem;'}">${p.image ? '' : '🪙'}</div>
            <div style="padding:8px; display:flex; flex-direction:column; gap:5px; align-items:stretch; text-align:center; border-top:2px solid #0e0903;">
            <div style="font-size:0.85rem; font-weight:950; color:#ffe9a8; text-shadow:0 2px 0 #000;">${p.gold} 🪙</div>
            <button class="store-buy" data-kind="coins" data-id="coins:${i}" style="width:100%; padding:9px 12px; border-radius:12px; border:3px solid #0e1f00; background:linear-gradient(180deg, #b8f54d 0%, #7ed321 38%, #4a9b1f 78%, #2c620d 100%); color:#0f1f00; font-weight:950; font-size:0.65rem; letter-spacing:1px; cursor:pointer; box-shadow:0 4px 0 rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.5);">${t('store2.buy')} · 💎 ${p.price}</button>
            </div>
          </div>`).join('');
  }

  private gemTilesHtml(): string {
    const d = this.data;
    if (d.gemPacks.length === 0) return this.ghostRow();
    return d.gemPacks.map((p: any, i: number) => `
          <div class="store-sec" style="border:3px solid #0e0903; border-radius:14px; overflow:hidden; background:linear-gradient(180deg, rgba(30,40,60,0.9), rgba(10,14,24,0.9)); box-shadow:0 4px 0 rgba(0,0,0,0.5); display:flex; flex-direction:column;">
            <div style="aspect-ratio:1/1; ${p.image ? `background:url('${p.image}') center/contain no-repeat #05070d;` : 'display:flex; align-items:center; justify-content:center; font-size:2rem;'}">${p.image ? '' : '💎'}</div>
            <div style="padding:8px; display:flex; flex-direction:column; gap:5px; align-items:stretch; text-align:center; border-top:2px solid #0e0903;">
            <div style="font-size:0.85rem; font-weight:950; color:#7ee7ff; text-shadow:0 2px 0 #000;">${p.gems} 💎</div>
            <button class="store-buy" data-kind="gems" data-id="gems:${i}" style="width:100%; padding:9px 12px; border-radius:12px; border:3px solid #0e0903; background:linear-gradient(180deg, #5a4128, #2a1c0d); color:#ffe9a8; font-weight:950; font-size:0.65rem; letter-spacing:1px; cursor:pointer; box-shadow:0 4px 0 rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,236,190,0.35);">${t('store2.buy')} · ${this.esc(p.price)}</button>
            </div>
          </div>`).join('');
  }

  private artTilesHtml(owned: { cards: string[]; decks: string[]; artifacts: string[] }): string[] {
    if (this.data.artifacts.length === 0) {
      return Array.from({ length: this.artPageSize }).map(() => this.ghostCell());
    }
    return this.data.artifacts.map((o: any) => {
      const s = this.resolveArtifact(o.id);
      const isOwned = owned.artifacts.includes(o.id);
      const art = s && s.image ? `background-image:url('${s.image}');` : '';
      const icon = s && !s.image ? (s.icon || '✨') : '';
      return `
          <div class="store-sec" style="display:flex; flex-direction:column; align-items:center; gap:6px; background:linear-gradient(180deg, rgba(52,32,72,0.92), rgba(16,10,26,0.92)); border:2px solid #0e0903; border-radius:12px; padding:12px 8px; box-shadow:0 4px 0 rgba(0,0,0,0.5), inset 0 2px 0 rgba(216,180,254,0.25);">
            <div style="width:64px; height:64px; border-radius:50%; ${art} background-size:cover; background-position:center; background-color:rgba(255,255,255,0.06); border:2px solid #a335ee; display:flex; align-items:center; justify-content:center; font-size:1.8rem; box-shadow:0 0 14px rgba(163,53,238,0.4);">${icon}</div>
            <div style="font-size:0.6rem; font-weight:950; color:#e9d5ff; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${this.esc(s ? s.name : o.id).toUpperCase()}</div>
            <div style="width:100%;">${this.buyBtn('artifact', 'art:' + o.id, isOwned, `${o.currency === 'gems' ? '💎' : '🪙'} ${o.price}`)}</div>
          </div>`;
    });
  }

  private artPages(): number {
    const n = this.data.artifacts.length;
    return Math.max(1, Math.ceil(Math.max(n, 1) / this.artPageSize));
  }

  private artSlice(owned: { cards: string[]; decks: string[]; artifacts: string[] }): string {
    const tiles = this.artTilesHtml(owned);
    return tiles.slice(this.artPage * this.artPageSize, this.artPage * this.artPageSize + this.artPageSize).join('');
  }

  private markArtifactOwned(container: HTMLElement, artId: string) {
    container.querySelectorAll('.store-buy[data-kind="artifact"]').forEach(b => {
      const id = (b as HTMLElement).dataset.id || '';
      if (id.split(':').slice(1).join(':') === artId) {
        (b as HTMLButtonElement).disabled = true;
        (b as HTMLButtonElement).style.opacity = '0.55';
        b.textContent = t('store2.owned');
      }
    });
  }

  private renderSectionByKey(key: string, owned: any): string {
    if (!this.isSectionVisible(key)) return '';

    switch (key) {
      case 'banners':
        return this.bannerHtml();
      case 'daily':
        return `
          ${this.secTitle(this.title('daily', 'OFERTAS DO DIA'), ` <span id="store-countdown" style="font-size:0.6rem; color:#7ee7ff; letter-spacing:1px;"></span>`)}
          <div id="store-daily-grid" class="store-sec" style="padding:0 16px; display:grid; grid-template-columns:repeat(2, 1fr); gap:12px;">
            ${this.dailyGridHtml(owned)}
          </div>
          <div style="display:flex; align-items:center; justify-content:center; gap:12px; margin-top:10px;">
            <button id="store-daily-prev" style="width:44px; height:36px; border-radius:12px; border:3px solid #0e0903; background:linear-gradient(180deg, #5a4128, #2a1c0d); color:#ffd76a; font-size:1rem; font-weight:900; cursor:pointer; flex-shrink:0;">‹</button>
            <span id="store-daily-page" style="font-size:0.6rem; color:rgba(255,255,255,0.55); letter-spacing:2px; font-weight:900;">1 / 3</span>
            <button id="store-daily-next" style="width:44px; height:36px; border-radius:12px; border:3px solid #0e0903; background:linear-gradient(180deg, #5a4128, #2a1c0d); color:#ffd76a; font-size:1rem; font-weight:900; cursor:pointer; flex-shrink:0;">›</button>
          </div>
        `;
      case 'rare':
        return `
          ${this.secTitle(this.title('rare', 'CARTAS RARAS'))}
          <div id="store-rare-grid" class="store-sec" style="padding:0 16px; display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
            ${this.rareSlice(owned)}
          </div>
          <div style="display:flex; align-items:center; justify-content:center; gap:12px; margin-top:10px;">
            <button id="store-rare-prev" style="width:44px; height:36px; border-radius:12px; border:3px solid #0e0903; background:linear-gradient(180deg, #5a4128, #2a1c0d); color:#ffd76a; font-size:1rem; font-weight:900; cursor:pointer; flex-shrink:0;">‹</button>
            <span id="store-rare-page" style="font-size:0.6rem; color:rgba(255,255,255,0.55); letter-spacing:2px; font-weight:900;">1 / 1</span>
            <button id="store-rare-next" style="width:44px; height:36px; border-radius:12px; border:3px solid #0e0903; background:linear-gradient(180deg, #5a4128, #2a1c0d); color:#ffd76a; font-size:1rem; font-weight:900; cursor:pointer; flex-shrink:0;">›</button>
          </div>
        `;
      case 'decks':
        return `
          ${this.secTitle(this.title('decks', 'DECKS COMPLETOS'))}
          <div id="store-decks-wrapper" style="display:flex; flex-direction:column; gap:14px; padding:0 16px;">
            ${this.deckSectionsHtml(owned)}
          </div>
        `;
      case 'packs':
        return `
          <div id="store-boosters-wrapper">
            ${this.packBoosterCarouselSectionHtml()}
          </div>
        `;
      case 'packs_split':
        return `
          <div id="store-boosters-split-wrapper">
            ${this.packBoosterSplitSectionHtml()}
          </div>
        `;
      case 'coins':
        return `
          ${this.secTitle(this.title('coins', 'MOEDAS'))}
          <div class="store-sec" style="padding:0 16px; display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;">
            ${this.coinTilesHtml()}
          </div>
        `;
      case 'gems':
        return `
          ${this.secTitle(this.title('gems', 'DIAMANTES'))}
          <div class="store-sec" style="padding:0 16px; display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;">
            ${this.gemTilesHtml()}
          </div>
        `;
      case 'artifacts':
        return `
          ${this.secTitle(this.title('artifacts', 'ARTEFATOS'))}
          <div class="store-sec" style="display:flex; align-items:center; gap:8px; padding:0 16px;">
            <button id="store-art-prev" style="width:34px; height:60px; border-radius:10px; border:3px solid #0e0903; background:linear-gradient(180deg, #5a4128, #2a1c0d); color:#ffd76a; font-weight:900; cursor:pointer; flex-shrink:0;">‹</button>
            <div id="store-art-grid" style="flex:1; display:grid; grid-template-columns:repeat(2, 1fr); gap:10px;">
              ${this.artSlice(owned)}
            </div>
            <button id="store-art-next" style="width:34px; height:60px; border-radius:10px; border:3px solid #0e0903; background:linear-gradient(180deg, #5a4128, #2a1c0d); color:#ffd76a; font-weight:900; cursor:pointer; flex-shrink:0;">›</button>
          </div>
          <div style="text-align:center; font-size:0.6rem; color:rgba(255,255,255,0.45); letter-spacing:2px; margin-top:6px;"><span id="store-art-page">1 / 1</span></div>
        `;
      default:
        return '';
    }
  }

  private renderDynamicSectionsHtml(owned: any): string {
    const order = this.getSectionOrder();
    const rendered: string[] = [];
    order.forEach((key, idx) => {
      const html = this.renderSectionByKey(key, owned);
      if (html && html.trim()) {
        rendered.push(`<div id="sec-${key}-${idx}" class="sec-${key} store-dynamic-sec" data-module-key="${key}" data-order-idx="${idx}" style="width:100%; max-width:100%; overflow-x:hidden; box-sizing:border-box;">${html}</div>`);
      }
    });
    return rendered.join('');
  }

  private renderCategoryPillsHtml(): string {
    const order = this.getSectionOrder();
    const pillsMeta: Record<string, { label: string; color: string; border: string; bg: string }> = {
      packs: { label: '📦 Boosters Carrossel', color: '#ff9838', border: 'rgba(255,122,0,0.4)', bg: 'rgba(255,122,0,0.15)' },
      packs_split: { label: '🌓 Boosters Split', color: '#38bdf8', border: 'rgba(56,189,248,0.4)', bg: 'rgba(56,189,248,0.15)' },
      decks: { label: '🃏 Decks', color: '#d8b4fe', border: 'rgba(168,85,247,0.3)', bg: 'rgba(168,85,247,0.1)' },
      daily: { label: '☀️ Diárias', color: '#ffd700', border: 'rgba(255,215,0,0.3)', bg: 'rgba(255,215,0,0.1)' },
      rare: { label: '💎 Raras', color: '#38bdf8', border: 'rgba(56,189,248,0.3)', bg: 'rgba(56,189,248,0.1)' },
      coins: { label: '🪙 Moedas', color: '#4ade80', border: 'rgba(74,222,128,0.3)', bg: 'rgba(74,222,128,0.1)' },
      gems: { label: '💎 Gemas', color: '#7ee7ff', border: 'rgba(56,189,248,0.3)', bg: 'rgba(56,189,248,0.1)' },
      artifacts: { label: '✨ Artefatos', color: '#f472b6', border: 'rgba(244,114,182,0.3)', bg: 'rgba(244,114,182,0.1)' },
    };

    const seen = new Set<string>();
    const activeSections: string[] = [];
    order.forEach(k => {
      if (k !== 'banners' && this.isSectionVisible(k) && pillsMeta[k] && !seen.has(k)) {
        seen.add(k);
        activeSections.push(k);
      }
    });

    return activeSections.map(k => {
      const p = pillsMeta[k];
      return `<button class="store-cat-pill" data-target="${k}" style="padding:6px 14px; border-radius:999px; font-size:0.68rem; font-weight:900; letter-spacing:0.5px; border:1px solid ${p.border}; background:${p.bg}; color:${p.color}; cursor:pointer; white-space:nowrap; transition:0.2s;">${p.label}</button>`;
    }).join('');
  }

  public render(container: HTMLElement, opts?: { headerSpace?: boolean }) {
    const owned = this.getOwned();
    const bal = ProgressionManager.getPlayerData();

    container.innerHTML = `
    <div style="position:relative; width:100%; height:100%; flex:1; min-height:0; display:flex; flex-direction:column; overflow:hidden;">
      <!-- VINHETA EM DEGRADÊ NO TOPO DA LOJA (ATRÁS DO HEADER QUE RESTOU) -->
      ${opts && opts.headerSpace ? `
      <div id="store-top-vignette" style="position:absolute; top:0; left:0; right:0; height:110px; z-index:80; pointer-events:none; background:linear-gradient(180deg, rgba(8,10,16,0.95) 0%, rgba(8,10,16,0.85) 50%, rgba(8,10,16,0.3) 80%, transparent 100%); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);"></div>
      ` : ''}

      <div class="store-screen" style="flex:1; height:100%; min-height:0; overflow-y:auto; overflow-x:hidden; background:transparent; padding-top:${opts && opts.headerSpace ? '100px' : '0px'}; padding-bottom:110px;">
        <!-- SEÇÕES DINÂMICAS DA VITRINE (ORDEM CONFIGURÁVEL NA FORJA) -->
        ${this.renderDynamicSectionsHtml(owned)}

        <div id="store-toast" style="position:fixed; left:50%; bottom:120px; transform:translateX(-50%); background:linear-gradient(180deg, #4a351e, #241809); border:2px solid #d4af37; border-radius:12px; color:#ffe9a8; font-size:0.7rem; font-weight:900; letter-spacing:2px; padding:12px 24px; opacity:0; pointer-events:none; z-index:5000; white-space:nowrap; box-shadow:0 6px 24px rgba(0,0,0,0.6);"></div>
      </div>
    </div>
    <style>
      .store-buy { transition: transform 0.12s ease, filter 0.12s ease; }
      .store-buy:not(:disabled):hover { filter: brightness(1.12); }
      .store-buy:not(:disabled):active { transform: scale(0.93); }
      .store-dot { transition: background 0.3s ease, transform 0.3s ease; }
    </style>
    `;
    this.bind(container);
  }

  private toast(container: HTMLElement, msg: string, ok: boolean = true) {
    const el = container.querySelector('#store-toast') as HTMLElement | null;
    if (!el) return;
    el.textContent = msg;
    el.style.borderColor = ok ? '#d4af37' : '#ff4444';
    try {
      SoundManager.playAction(ok ? 'clique_geral' : 'clique_geral', 0.5);
    } catch {}
    gsap.killTweensOf(el);
    gsap.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
    gsap.to(el, { opacity: 0, y: 6, duration: 0.3, delay: 1.6 });
  }

  private refreshBalances(container: HTMLElement) {
    const bal = ProgressionManager.getPlayerData();
    const g = container.querySelector('#store-bal-gold');
    const d = container.querySelector('#store-bal-gems');
    if (g) g.textContent = String(bal.gold);
    if (d) d.textContent = String(bal.diamonds);
  }

  private spend(container: HTMLElement, currency: string, price: number): boolean {
    const data = ProgressionManager.getPlayerData();
    if (currency === 'gems' ? data.diamonds < price : data.gold < price) {
      this.toast(container, t('store2.noFunds'), false);
      return false;
    }
    if (currency === 'gems') data.diamonds -= price;
    else data.gold -= price;
    ProgressionManager.savePlayerData(data);
    this.refreshBalances(container);
    return true;
  }

  private bind(container: HTMLElement) {
    StoreScreen.activeTimers.forEach(id => window.clearInterval(id));
    StoreScreen.activeTimers = [];

    // Delegação reserva p/ abrir booster: sobrevive a re-renders. Os binds
    // diretos usam stopPropagation, então não há clique duplo.
    if (!container.dataset.boosterDelegated) {
      container.dataset.boosterDelegated = '1';
      container.addEventListener('click', (e) => {
        const cap = (e.target as HTMLElement).closest?.('#btn-booster-buy-capsule, #btn-booster-split-buy') as HTMLElement | null;
        if (!cap || !container.isConnected) return;
        const pid = cap.dataset.packId;
        if (!pid) return;
        const qty = cap.id === 'btn-booster-split-buy' ? this.boosterSplitQty : this.boosterQty;
        try { this.openBoosterModal(container, pid, qty); }
        catch (err) { this.toast(container, 'Falha ao abrir: ' + String((err as Error)?.message || err).slice(0, 90), false); }
      });
    }

    // Entrada animada premium
    gsap.fromTo(container.querySelectorAll('.store-sec'),
      { y: 26, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power2.out', clearProps: 'transform' });

    // Navegação rápida por categorias (Scroll suave para a seção)
    container.querySelectorAll('.store-cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = (btn as HTMLElement).dataset.target;
        const targetEl = container.querySelector('.sec-' + target) || container.querySelector('[data-module-key="' + target + '"]');
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Banner slider automático (apenas banner superior)
    container.querySelectorAll('[data-banner-track]').forEach(trackEl => {
      const track = trackEl as HTMLElement;
      const n = this.data.banners.length;
      if (n <= 1) return;
      let bi = 0;
      const dots = Array.from(track.parentElement?.querySelectorAll('.store-dot') || []) as HTMLElement[];
      const go = (i: number) => {
        bi = (i + n) % n;
        track.style.transform = `translateX(-${bi * 100}%)`;
        dots.forEach((dt, di) => { dt.style.background = di === bi ? '#ffd700' : 'rgba(255,255,255,0.35)'; });
      };
      dots.forEach(dt => dt.addEventListener('click', () => go(parseInt(dt.dataset.i || '0'))));
      StoreScreen.activeTimers.push(window.setInterval(() => go(bi + 1), 4000));
    });

    // Countdown da virada diária
    const cd = container.querySelector('#store-countdown') as HTMLElement | null;
    if (cd) {
      const tick = () => {
        const end = new Date();
        end.setHours(24, 0, 0, 0);
        let s = Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000));
        const h = String(Math.floor(s / 3600)).padStart(2, '0');
        const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        cd.textContent = `${t('store2.endsIn')} ${h}:${m}:${ss}`;
      };
      tick();
      StoreScreen.activeTimers.push(window.setInterval(tick, 1000));
    }

    // Pager diárias (horizontal)
    const paintDaily = () => {
      const grid = container.querySelector('#store-daily-grid');
      const pg = container.querySelector('#store-daily-page');
      if (grid) {
        const owned = this.getOwned();
        grid.innerHTML = this.dailyGridHtml(owned);
        this.bindBuyButtons(container);
        this.bindViewTaps(container);
      }
      if (pg) pg.textContent = `${this.dailyPage + 1} / 3`;
    };
    container.querySelector('#store-daily-prev')?.addEventListener('click', () => {
      this.dailyPage = (this.dailyPage + 2) % 3;
      paintDaily();
    });
    container.querySelector('#store-daily-next')?.addEventListener('click', () => {
      this.dailyPage = (this.dailyPage + 1) % 3;
      paintDaily();
    });

    // Carrosséis verticais: raras / decks / pacotes
    const paintRareH = () => {
      const grid = container.querySelector('#store-rare-grid');
      const pg = container.querySelector('#store-rare-page');
      if (grid) {
        const owned = this.getOwned();
        grid.innerHTML = this.rareSlice(owned);
        this.bindBuyButtons(container);
        this.bindViewTaps(container);
      }
      if (pg) pg.textContent = `${this.rarePage + 1} / ${this.rarePages()}`;
    };
    container.querySelector('#store-rare-prev')?.addEventListener('click', () => {
      this.rarePage = (this.rarePage + this.rarePages() - 1) % this.rarePages();
      paintRareH();
    });
    container.querySelector('#store-rare-next')?.addEventListener('click', () => {
      this.rarePage = (this.rarePage + 1) % this.rarePages();
      paintRareH();
    });

    // (decks: uma secção por deck, sem pager)

    // packs: linha única com rolagem horizontal nativa (sem pager)

    const paintArtH = () => {
      const grid = container.querySelector('#store-art-grid');
      const pg = container.querySelector('#store-art-page');
      if (grid) {
        grid.innerHTML = this.artSlice(this.getOwned());
        this.bindBuyButtons(container);
      }
      if (pg) pg.textContent = `${this.artPage + 1} / ${this.artPages()}`;
    };
    container.querySelector('#store-art-prev')?.addEventListener('click', () => {
      this.artPage = (this.artPage + this.artPages() - 1) % this.artPages();
      paintArtH();
    });
    container.querySelector('#store-art-next')?.addEventListener('click', () => {
      this.artPage = (this.artPage + 1) % this.artPages();
      paintArtH();
    });

    this.bindBuyButtons(container);
    this.bindViewTaps(container);

    this.bindBoosterCarousel(container);
    this.bindBoosterSplit(container);
  }

  private openBoosterModal(container: HTMLElement, packId: string, quantity: number = 1) {
    const pack = this.data.packs.find((p: any) => p.id === packId);
    if (!pack) {
      this.toast(container, 'Booster não encontrado na vitrine', false);
      return;
    }

    const cur = pack.currency === 'gems' ? 'gems' : 'gold';
    const unitPrice = Number(pack.price) || 0;
    const totalPrice = unitPrice * quantity;
    if (totalPrice > 0 && !this.spend(container, cur, totalPrice)) return;

    const cardsPerPack = Math.max(1, Math.min(15, pack.cardsCount || 3));
    const totalCount = cardsPerPack * quantity;
    const cards: any[] = [];

    const getRarityKey = (t: any): 'common' | 'rare' | 'legendary' => {
      const r = String(t?.preferredRarity || '').toLowerCase();
      if (r.includes('leg') || r.includes('mit')) return 'legendary';
      if (r.includes('rar') || r.includes('epi')) return 'rare';
      return 'common';
    };

    if (pack.mode === 'special' && pack.fixedCards && pack.fixedCards.length > 0) {
      for (let i = 0; i < totalCount; i++) {
        const cardName = pack.fixedCards[i % pack.fixedCards.length];
        const tmpl = this.resolveCard(cardName);
        cards.push({
          id: `card_${i}_${Date.now()}`,
          name: tmpl?.name || cardName,
          rarity: tmpl ? getRarityKey(tmpl) : 'rare',
          atk: tmpl?.baseAtk ?? 3,
          pv: tmpl?.basePv ?? 5,
          image: tmpl?.image || ''
        });
      }
    } else {
      const rates = pack.rates || { common: 70, rare: 25, legendary: 5 };
      const legRate = Number(rates.legendary) || 5;
      const rareRate = Number(rates.rare) || 25;

      const legPool = (pack.cardGroups?.legendary && pack.cardGroups.legendary.length > 0)
        ? (CARD_TEMPLATES as any[]).filter(t => pack.cardGroups!.legendary!.includes(t.name))
        : (CARD_TEMPLATES as any[]).filter(t => getRarityKey(t) === 'legendary');
      const rarePool = (pack.cardGroups?.rare && pack.cardGroups.rare.length > 0)
        ? (CARD_TEMPLATES as any[]).filter(t => pack.cardGroups!.rare!.includes(t.name))
        : (CARD_TEMPLATES as any[]).filter(t => getRarityKey(t) === 'rare');
      const comPool = (pack.cardGroups?.common && pack.cardGroups.common.length > 0)
        ? (CARD_TEMPLATES as any[]).filter(t => pack.cardGroups!.common!.includes(t.name))
        : (CARD_TEMPLATES as any[]).filter(t => getRarityKey(t) === 'common');

      for (let i = 0; i < totalCount; i++) {
        const roll = Math.random() * 100;
        let targetRarity: 'common' | 'rare' | 'legendary' = 'common';
        let pool = comPool;

        if (roll < legRate) {
          targetRarity = 'legendary';
          pool = legPool.length > 0 ? legPool : (rarePool.length > 0 ? rarePool : CARD_TEMPLATES as any[]);
        } else if (roll < (legRate + rareRate)) {
          targetRarity = 'rare';
          pool = rarePool.length > 0 ? rarePool : CARD_TEMPLATES as any[];
        } else {
          targetRarity = 'common';
          pool = comPool.length > 0 ? comPool : CARD_TEMPLATES as any[];
        }

        const fallback = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
        const picked = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : fallback;

        cards.push({
          id: `card_${i}_${Date.now()}`,
          name: picked?.name || `Criatura #${i + 1}`,
          rarity: targetRarity,
          atk: picked?.baseAtk ?? Math.floor(Math.random() * 6 + 1),
          pv: picked?.basePv ?? Math.floor(Math.random() * 8 + 2),
          image: picked?.image || ''
        });
      }
    }

    try {
    new BoosterPackViewer({
      theme: pack.theme || 'charizard',
      customTitle: quantity > 1 ? `${pack.name} (${quantity}x)` : pack.name,
      customBack: pack.customBack || 'silver',
      customFrontUrl: pack.customFront,
      cards: cards,
      onComplete: (revealedCards) => {
        const owned = this.getOwned();
        revealedCards.forEach(c => {
          if (!owned.cards.includes(c.name)) {
            owned.cards.push(c.name);
            this.markCardOwned(container, c.name);
          }
        });
        this.saveOwned(owned);
      this.toast(container, `🎉 ${quantity > 1 ? `${quantity}x ` : ''}${pack.name} aberto! +${revealedCards.length} cartas reveladas!`);
      });
    });
    } catch (err) {
      this.toast(container, 'Falha ao abrir: ' + String((err as Error)?.message || err).slice(0, 90), false);
    }
  }

  private purchaseCard(container: HTMLElement, cardName: string, currency: string): boolean {
    const offer = [...this.data.dailyPool, ...this.data.rare].find((o: any) => o.card === cardName);
    if (!offer) return false;
    const owned = this.getOwned();
    if (owned.cards.includes(cardName)) return false;
    if (!this.spend(container, currency, offer.price)) return false;
    owned.cards.push(cardName);
    this.saveOwned(owned);
    return true;
  }

  private markCardOwned(container: HTMLElement, cardName: string) {
    container.querySelectorAll('.store-buy[data-kind^="card:"]').forEach(b => {
      const id = (b as HTMLElement).dataset.id || '';
      if (id.split(':').slice(1).join(':') === cardName) {
        (b as HTMLButtonElement).disabled = true;
        (b as HTMLButtonElement).style.opacity = '0.55';
        b.textContent = t('store2.owned');
      }
    });
  }

  private markDeckOwned(container: HTMLElement, deckId: string) {
    container.querySelectorAll('.store-buy[data-kind="deck"]').forEach(b => {
      if ((b as HTMLElement).dataset.id === deckId) {
        (b as HTMLButtonElement).disabled = true;
        (b as HTMLButtonElement).style.opacity = '0.55';
        b.textContent = t('store2.owned');
      }
    });
  }

  private openCardViewerFor(container: HTMLElement, cardName: string, currency: string) {
    const pool = currency === 'gems' ? this.data.rare : this.data.dailyPool;
    const offer = pool.find((o: any) => o.card === cardName);
    if (!offer) return;
    const owned = this.getOwned().cards.includes(cardName);

    // Lista de todas as cartas da seção permitindo navegar/passar para o lado
    const cardsList = pool.map((o: any) => this.resolveCard(o.card) || { name: o.card, image: '' });
    const cardIdx = pool.findIndex((o: any) => o.card === cardName);

    openCardViewer({
      card: this.resolveCard(cardName) || { name: cardName, image: '' },
      list: cardsList.length > 0 ? cardsList : undefined,
      index: Math.max(0, cardIdx),
      priceHtml: `<span style="color:${currency === 'gems' ? '#7ee7ff' : '#ffd76a'}; font-weight:950; font-size:1.1rem; text-shadow:0 2px 0 #000;">${currency === 'gems' ? '💎' : '🪙'} ${offer.price}</span>`,
      actionLabel: owned ? t('store2.owned') : t('store2.buy'),
      actionDisabled: owned,
      onAction: () => {
        if (this.purchaseCard(container, cardName, currency)) {
          this.markCardOwned(container, cardName);
          this.toast(container, `${cardName} ✓`);
          return { close: false, label: t('store2.owned'), disabled: true };
        }
        return { close: false };
      }
    });
  }

  private openDeckViewerFor(container: HTMLElement, deckId: string, initialIdx: number = 0) {
    let deck = this.data.decks.find((x: any) => x && x.id === deckId);
    if (!deck && !isNaN(parseInt(deckId))) {
      deck = this.data.decks[parseInt(deckId)];
    }
    if (!deck && this.data.decks.length > 0) {
      deck = this.data.decks[0];
    }
    if (!deck) return;

    const cards = (deck.cards || []).map((n: string) => this.resolveCard(n) || { name: n, image: '' });
    const owned = this.getOwned().decks.includes(deck.id);
    const cur = deck.currency === 'gems' ? 'gems' : 'gold';
    const startIdx = Math.max(0, Math.min(Math.max(0, cards.length - 1), initialIdx));

    openCardViewer({
      card: cards[startIdx] || { name: deck.name, image: deck.image || '' },
      list: cards.length > 0 ? cards : [{ name: deck.name, image: deck.image || '' }],
      index: startIdx,
      priceHtml: `<div style="text-align:center;"><div style="font-size:0.7rem; font-weight:950; color:#ffd76a; letter-spacing:1px;">${this.esc(deck.name).toUpperCase()}</div><div style="color:${cur === 'gems' ? '#7ee7ff' : '#ffd76a'}; font-weight:950; font-size:1.1rem; text-shadow:0 2px 0 #000;">${cur === 'gems' ? '💎' : '🪙'} ${deck.price}</div></div>`,
      actionLabel: owned ? t('store2.owned') : t('store2.buy'),
      actionDisabled: owned,
      onAction: () => {
        const dd = this.data.decks.find((x: any) => x && x.id === deck.id) || deck;
        if (!dd) return { close: false };
        const ow = this.getOwned();
        if (ow.decks.includes(dd.id)) return { close: false };
        if (!this.spend(container, cur, dd.price)) return { close: false };
        ow.decks.push(dd.id);
        (dd.cards || []).forEach((n: string) => { if (!ow.cards.includes(n)) ow.cards.push(n); });
        this.saveOwned(ow);
        this.markDeckOwned(container, dd.id);
        (dd.cards || []).forEach((n: string) => this.markCardOwned(container, n));
        this.toast(container, `${dd.name} ✓`);
        return { close: false, label: t('store2.owned'), disabled: true };
      }
    });
  }

  private bindViewTaps(container: HTMLElement) {
    container.querySelectorAll('.store-view-card').forEach(el => {
      const h = el as HTMLElement;
      if (h.dataset.viewBound) return;
      h.dataset.viewBound = '1';
      h.addEventListener('click', () => {
        this.openCardViewerFor(container, h.dataset.viewName || '', h.dataset.viewCur || 'gold');
      });
    });

    container.querySelectorAll('.store-view-deck').forEach(el => {
      const h = el as HTMLElement;
      if (h.dataset.viewBound) return;
      h.dataset.viewBound = '1';
      h.addEventListener('click', () => {
        this.openDeckViewerFor(container, h.dataset.deck || '', 0);
      });
    });

    container.querySelectorAll('.store-view-deck-card').forEach(el => {
      const h = el as HTMLElement;
      if (h.dataset.viewBound) return;
      h.dataset.viewBound = '1';
      h.addEventListener('click', () => {
        const deckId = h.dataset.deckId || h.dataset.deck || '';
        const idx = parseInt(h.dataset.cardIdx || '0');
        this.openDeckViewerFor(container, deckId, idx);
      });
    });

    container.querySelectorAll('.store-strip-scroll-left').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const deckId = (btn as HTMLElement).dataset.deck;
        const strip = container.querySelector(`#deck-strip-${deckId}`);
        if (strip) strip.scrollBy({ left: -140, behavior: 'smooth' });
      });
    });

    container.querySelectorAll('.store-strip-scroll-right').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const deckId = (btn as HTMLElement).dataset.deck;
        const strip = container.querySelector(`#deck-strip-${deckId}`);
        if (strip) strip.scrollBy({ left: 140, behavior: 'smooth' });
      });
    });
  }

  private bindBuyButtons(container: HTMLElement) {
    container.querySelectorAll('.store-buy[data-kind]').forEach(btn => {
      btn.addEventListener('click', () => {
        const kind = (btn as HTMLElement).dataset.kind!;
        const id = (btn as HTMLElement).dataset.id!;
        if (kind === 'gems') {
          this.toast(container, t('store2.soon'));
          return;
        }
        if (kind === 'artifact') {
          const artId = id.split(':').slice(1).join(':');
          const offer = this.data.artifacts.find((o: any) => o.id === artId);
          if (!offer) return;
          const ow = this.getOwned();
          if (ow.artifacts.includes(artId)) return;
          if (!this.spend(container, offer.currency === 'gems' ? 'gems' : 'gold', offer.price)) return;
          ow.artifacts.push(artId);
          this.saveOwned(ow);
          this.markArtifactOwned(container, artId);
          this.toast(container, `${artId} ✓`);
          return;
        }
        if (kind === 'coins') {
          const pack = this.data.coinPacks[parseInt(id.split(':')[1])];
          if (!pack) return;
          if (!this.spend(container, 'gems', pack.price)) return;
          const bal = ProgressionManager.getPlayerData();
          bal.gold += pack.gold;
          ProgressionManager.savePlayerData(bal);
          this.refreshBalances(container);
          this.toast(container, `+${pack.gold} 🪙`);
          return;
        }
        if (kind === 'deck') {
          const deck = this.data.decks.find((x: any) => x.id === id);
          if (!deck) return;
          const owned = this.getOwned();
          if (owned.decks.includes(id)) return;
          if (!this.spend(container, deck.currency === 'gems' ? 'gems' : 'gold', deck.price)) return;
          owned.decks.push(id);
          (deck.cards || []).forEach((n: string) => { if (!owned.cards.includes(n)) owned.cards.push(n); });
          this.saveOwned(owned);
          this.markDeckOwned(container, id);
          (deck.cards || []).forEach((n: string) => this.markCardOwned(container, n));
          this.toast(container, `${deck.name} ✓`);
          return;
        }
        // card:gold | card:gems  (kind traz a moeda, id traz "sec:Nome")
        const cur = (kind.split(':')[1] === 'gems') ? 'gems' : 'gold';
        const cardName = id.split(':').slice(1).join(':');
        if (this.purchaseCard(container, cardName, cur)) {
          this.markCardOwned(container, cardName);
          this.toast(container, `${cardName} ✓`);
        }
      });
    });
  }
}
