import { gsap } from 'gsap';
import { CARD_TEMPLATES, SKILL_POOL } from '../../core/constants';
import { ProgressionManager } from '../../core/ProgressionManager';
import { SoundManager } from '../utils/SoundManager';
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

  constructor(customData?: any) {
    const d: any = customData || storeData || {};
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
      sectionOrder: d.sectionOrder || ['banners', 'daily', 'rare', 'decks', 'packs', 'coins', 'gems', 'artifacts'],
      sectionVisibility: d.sectionVisibility || {},
      deckLayoutMode: d.deckLayoutMode || 'carousel',
      boosterDisplayMode: d.boosterDisplayMode || 'carousel'
    };
  }

  private title(key: string, fallback: string): string {
    return this.data.titles[key] || fallback;
  }

  private resolveCard(name: string): any {
    return (CARD_TEMPLATES as any[]).find(c => c.name === name) || null;
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
            <div style="min-width:100%; aspect-ratio:1080/270; background:url('${u}') center/cover, #111;"></div>`).join('')}
        </div>
        ${d.banners.length > 1 ? `
        <div id="store-banner-dots" style="position:absolute; bottom:8px; left:0; right:0; display:flex; gap:6px; justify-content:center;">
          ${d.banners.map((_: string, i: number) => `
            <span class="store-dot" data-i="${i}" style="width:8px; height:8px; border-radius:50%; background:${i === 0 ? '#ffd700' : 'rgba(255,255,255,0.35)'}; cursor:pointer; box-shadow:0 1px 3px #000;"></span>`).join('')}
        </div>` : ''}` : `
        <div style="aspect-ratio:1080/270; display:flex; align-items:center; justify-content:center; gap:8px; border-top:2px dashed rgba(255,255,255,0.25); border-bottom:2px dashed rgba(255,255,255,0.25); color:rgba(255,255,255,0.4); font-size:0.6rem; letter-spacing:2px; font-weight:900;">+ BANNERS · ${t('store2.empty')}</div>`;
    return `
      <div class="store-sec" style="margin:12px 0 0 0; border-radius:0; overflow:hidden; border-top:3px solid #0e0903; border-bottom:3px solid #0e0903; box-shadow:0 5px 0 rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.25); position:relative;">
        ${inner}
      </div>`;
  }

  private bannerRepeatHtml(): string {
    const d = this.data;
    if (d.banners.length === 0) return '';
    return `
      <div class="store-sec" style="margin:14px 0 0 0; border-radius:0; overflow:hidden; border-top:3px solid #0e0903; border-bottom:3px solid #0e0903; position:relative;">
        <div data-banner-track="r" style="display:flex; transition:transform 0.6s cubic-bezier(0.4,0,0.2,1);">
          ${d.banners.map((u: string) => `
            <div style="min-width:100%; aspect-ratio:1080/220; background:url('${u}') center/cover, #111;"></div>`).join('')}
        </div>
      </div>`;
  }

  private dailyGridHtml(owned: { cards: string[]; decks: string[] }): string {
    if (this.data.dailyPool.length === 0) {
      return Array.from({ length: 6 }).map(() => this.ghostCell()).join('');
    }
    return this.dailyItems().map(o =>
      this.cardCell(o, 'gold', owned.cards.includes(o.card), 'daily:' + o.card)).join('');
  }

  private rareTilesHtml(owned: { cards: string[]; decks: string[] }): string[] {
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
    const defaultOrder = ['banners', 'daily', 'rare', 'decks', 'packs', 'coins', 'gems', 'artifacts'];
    if (Array.isArray(this.data.sectionOrder) && this.data.sectionOrder.length > 0) {
      const order = [...this.data.sectionOrder];
      defaultOrder.forEach(sec => {
        if (!order.includes(sec)) order.push(sec);
      });
      return order;
    }
    return defaultOrder;
  }

  private isSectionVisible(secKey: string): boolean {
    if (this.data.sectionVisibility && typeof this.data.sectionVisibility[secKey] === 'boolean') {
      return this.data.sectionVisibility[secKey];
    }
    return true;
  }

  private deckSectionsHtml(owned: { cards: string[]; decks: string[] }): string {
    if (!this.data.decks || this.data.decks.length === 0) return this.ghostRow();
    const mode = this.data.deckLayoutMode || 'carousel';

    if (mode === 'carousel') {
      return this.renderDeckCarouselHtml(owned);
    } else {
      return this.renderDeckStandaloneHtml(owned);
    }
  }

  // MODO 1: CARROSSEL UNIFICADO DE DECKS (NAVEGA ENTRE DECKS NA MESMA SEÇÃO)
  private renderDeckCarouselHtml(owned: { cards: string[]; decks: string[] }): string {
    const decks = this.data.decks || [];
    if (this.deckActiveIdx < 0 || this.deckActiveIdx >= decks.length) {
      this.deckActiveIdx = 0;
    }
    const deck = decks[this.deckActiveIdx] || decks[0];
    const isOwned = owned.decks.includes(deck.id);
    const arts = (deck.cards || []).slice(0, 7).map((n: string) => {
      const c = this.resolveCard(n);
      return c && c.image ? c.image : '';
    });

    return `
      <div class="store-sec" style="display:flex; flex-direction:column; gap:14px; background:linear-gradient(180deg, rgba(46,28,64,0.92), rgba(16,10,26,0.92)); border:3px solid #7c3aed; border-radius:18px; padding:18px; box-shadow:0 8px 24px rgba(0,0,0,0.6), 0 0 20px rgba(124,58,237,0.3); position:relative; overflow:hidden;">
        <!-- Seletor de Decks no Carrossel -->
        ${decks.length > 1 ? `
          <div style="display:flex; justify-content:center; align-items:center; gap:8px; flex-wrap:wrap; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:12px;">
            ${decks.map((d: any, idx: number) => `
              <button class="store-deck-tab-btn" data-idx="${idx}" style="padding:6px 14px; border-radius:999px; font-size:0.65rem; font-weight:950; cursor:pointer; transition:0.2s; ${idx === this.deckActiveIdx ? 'background:#ffd700; color:#000; border:2px solid #fff; box-shadow:0 0 10px rgba(255,215,0,0.6);' : 'background:rgba(0,0,0,0.5); color:#cbd5e1; border:1px solid rgba(255,255,255,0.2);'}">
                🃏 ${this.esc(d.name)}
              </button>
            `).join('')}
          </div>
        ` : ''}

        <!-- Conteúdo do Deck Ativo -->
        <div style="display:flex; gap:18px; align-items:center; flex-wrap:wrap; justify-content:center;">
          <!-- Leque / Pilha de Cartas -->
          <div class="store-view-deck" data-deck="${this.esc(deck.id)}" title="Clique para inspecionar todas as cartas" style="position:relative; width:160px; height:155px; flex-shrink:0; cursor:pointer;">
            ${arts.map((a: string, i: number) => `
              <div style="position:absolute; left:${i * 16}px; top:${i * 5}px; width:72px; height:102px; border-radius:10px; border:2px solid #ffd700; ${a ? `background:url('${a}') center/cover;` : 'background:rgba(255,255,255,0.06);'} box-shadow:0 6px 14px rgba(0,0,0,0.7); transform:rotate(${(i - 2) * 3}deg);"></div>
            `).join('')}
            ${(deck.cards || []).length > 7 ? `
              <div style="position:absolute; right:4px; bottom:6px; background:rgba(0,0,0,0.85); border:1px solid #ffd700; border-radius:8px; color:#ffd700; font-size:0.65rem; font-weight:950; padding:3px 8px; z-index:10;">
                +${(deck.cards || []).length - 7}
              </div>
            ` : ''}
          </div>

          <!-- Informações e Compra -->
          <div style="flex:1; min-width:240px; display:flex; flex-direction:column; gap:8px;">
            <div style="font-size:1.05rem; font-weight:950; color:#ffd76a; letter-spacing:1.5px; text-shadow:0 2px 4px #000;">
              ${this.esc(deck.name).toUpperCase()}
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <span style="background:rgba(124,58,237,0.25); border:1px solid rgba(124,58,237,0.5); border-radius:999px; padding:2px 8px; font-size:0.58rem; color:#d8b4fe; font-weight:900;">
                🃏 ${(deck.cards || []).length} CARTAS PRONTAS
              </span>
              <span style="font-size:0.6rem; color:#aaa;">Deck temático balanceado</span>
            </div>
            <div style="font-size:0.7rem; color:rgba(255,255,255,0.7); line-height:1.4; background:rgba(0,0,0,0.25); padding:8px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.05);">
              ${this.esc(deck.desc || 'Deck estratégico pronto para entrar em combate na arena.')}
            </div>
            <div style="margin-top:4px;">
              ${this.buyBtn('deck', deck.id, isOwned, `${deck.currency === 'gems' ? '💎' : '🪙'} ${deck.price}`)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // MODO 2: SECÇÕES INDEPENDENTES (CADA DECK EM SUA PRÓPRIA SECÇÃO DEDICADA)
  private renderDeckStandaloneHtml(owned: { cards: string[]; decks: string[] }): string {
    return this.data.decks.map((deck: any) => {
      const isOwned = owned.decks.includes(deck.id);
      const arts = (deck.cards || []).slice(0, 5).map((n: string) => {
        const c = this.resolveCard(n);
        return c && c.image ? c.image : '';
      });
      return `
        <div class="store-sec" style="display:flex; flex-direction:column; gap:10px; background:linear-gradient(180deg, rgba(58,42,21,0.92), rgba(20,13,6,0.92)); border:3px solid #0e0903; border-radius:14px; padding:14px; box-shadow:0 4px 0 rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,236,190,0.2);">
          <div style="font-size:0.75rem; font-weight:950; color:#ffd76a; letter-spacing:2px; text-shadow:0 2px 0 #000; text-align:center;">
            ${this.esc(deck.name).toUpperCase()}
          </div>
          <div style="display:flex; gap:14px; align-items:center;">
            <div class="store-view-deck" data-deck="${this.esc(deck.id)}" style="position:relative; width:132px; height:142px; flex-shrink:0; cursor:pointer;">
              ${arts.map((a: string, i: number) => `
                <div style="position:absolute; left:${i * 15}px; top:${i * 4}px; width:66px; height:94px; border-radius:8px; border:2px solid #d4af37; ${a ? `background:url('${a}') center/cover;` : 'background:rgba(255,255,255,0.06);'} box-shadow:0 4px 10px rgba(0,0,0,0.6);"></div>
              `).join('')}
              ${(deck.cards || []).length > 5 ? `
                <div style="position:absolute; right:0; bottom:0; background:rgba(0,0,0,0.75); border:1px solid #d4af37; border-radius:8px; color:#ffd76a; font-size:0.6rem; font-weight:950; padding:2px 7px;">
                  +${(deck.cards || []).length - 5}
                </div>
              ` : ''}
            </div>
            <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:7px;">
              <div style="font-size:0.62rem; color:rgba(255,255,255,0.65); line-height:1.35;">${this.esc(deck.desc || '')}</div>
              <div style="font-size:0.6rem; color:#7ee7ff; font-weight:900;">${t('store2.deck')} · ${(deck.cards || []).length} ${t('store2.cards')}</div>
              <div>${this.buyBtn('deck', deck.id, isOwned, `${deck.currency === 'gems' ? '💎' : '🪙'} ${deck.price}`)}</div>
            </div>
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
            <img src="${frontImg}" alt="${this.esc(pack.name)}" style="width:100%; height:100%; object-fit:cover; display:block; border-radius:0px;" />
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
                <img src="${p.customFront}" style="width:100%; height:100%; object-fit:cover;" />
              ` : `
                <span style="font-size:1.1rem; filter:drop-shadow(0 1px 3px rgba(0,0,0,0.8));">${styleInfo.icon}</span>
              `}
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  private renderBoosterRatesHtml(pack: any): string {
    if (pack.mode === 'special') {
      return `
        <span style="background:rgba(168,85,247,0.2); border:1px solid rgba(168,85,247,0.5); border-radius:4px; padding:3px 10px; font-size:0.62rem; color:#d8b4fe; font-weight:900; letter-spacing:0.5px;">
          ⭐ POOL ESPECIAL (${(pack.fixedCards || []).length} CARTAS)
        </span>
      `;
    }
    const rates = pack.rates || { common: 70, rare: 25, legendary: 5 };
    return `
      <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:center; align-items:center;">
        <span style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.2); border-radius:4px; padding:2px 8px; font-size:0.6rem; color:#f1f5f9; font-weight:800;">⬜ ${rates.common ?? 70}%</span>
        <span style="background:rgba(0,240,255,0.12); border:1px solid rgba(0,240,255,0.4); border-radius:4px; padding:2px 8px; font-size:0.6rem; color:#38bdf8; font-weight:800;">🔷 ${rates.rare ?? 25}%</span>
        <span style="background:rgba(255,170,0,0.15); border:1px solid rgba(255,170,0,0.4); border-radius:4px; padding:2px 8px; font-size:0.6rem; color:#fbbf24; font-weight:800;">⭐ ${rates.legendary ?? 5}%</span>
        <span style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.2); border-radius:4px; padding:2px 8px; font-size:0.6rem; color:#94a3b8; font-weight:900;">📦 ${pack.cardsCount || 3} CARTAS</span>
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
          <span>✨ ABRIR EM 3D</span>
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
              <span>✨ ABRIR EM 3D</span>
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
                  <img src="${p.customFront}" style="width:100%; height:100%; object-fit:cover;" />
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
      <div style="margin:22px 16px 8px 16px;">
        ${this.secTitle(this.title('packs_split', 'DESTAQUES ESPECIAIS (SPLIT)'))}
      </div>

      <div id="store-booster-split-body" style="display:flex; flex-direction:row; align-items:center; justify-content:center; gap:14px; width:100%; padding:4px 16px 16px 16px; box-sizing:border-box;">
        <!-- Lado Esquerdo: Booster Alongado com Quinas Rígidas -->
        <div id="booster-split-card-pouch" style="flex-shrink:0;">
          ${this.renderBoosterPouchHtml(activePack, true, '140px')}
        </div>

        <!-- Lado Direito: Círculos no topo, Texto no meio, Botões embaixo -->
        <div style="flex:1; display:flex; flex-direction:column; gap:8px; min-width:0;">
          <!-- 1. ACIMA: Seletores circulares de packs -->
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            ${packs.map((p: any, i: number) => {
              const isActive = i === this.boosterSplitIdx;
              const styleInfo = this.themeGradients[p.theme || 'charizard'] || this.themeGradients.charizard;
              return `
                <button class="store-split-pack-circle" data-idx="${i}" title="${this.esc(p.name)}" style="width:34px; height:34px; border-radius:50%; border:${isActive ? '2.5px solid #38bdf8' : '1.5px solid rgba(255,255,255,0.2)'}; background:${isActive ? 'rgba(56,189,248,0.25)' : 'rgba(0,0,0,0.6)'}; cursor:pointer; padding:0; display:flex; align-items:center; justify-content:center; overflow:hidden; transform:${isActive ? 'scale(1.12)' : 'scale(1)'}; box-shadow:${isActive ? '0 0 12px rgba(56,189,248,0.7)' : '0 2px 6px rgba(0,0,0,0.4)'}; transition:all 0.15s ease;">
                  ${p.customFront ? `
                    <img src="${p.customFront}" style="width:100%; height:100%; object-fit:cover;" />
                  ` : `
                    <span style="font-size:1rem; filter:drop-shadow(0 1px 3px rgba(0,0,0,0.8));">${styleInfo.icon}</span>
                  `}
                </button>
              `;
            }).join('')}
          </div>

          <!-- 2. MEIO: Título e Descrição (texto limpo, sem caixa de fundo) -->
          <div id="booster-split-info-area" style="display:flex; flex-direction:column; gap:4px;">
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
            <button id="btn-booster-split-qty" title="Alternar quantidade" style="width:40px; height:40px; border-radius:50%; border:2px solid #ffd700; background:linear-gradient(180deg, #30220d, #140d04); color:#ffd700; font-size:0.8rem; font-weight:950; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 0 10px rgba(255,215,0,0.3); flex-shrink:0;">
              x${this.boosterSplitQty}
            </button>

            <button id="btn-booster-split-buy" data-pack-id="${this.esc(activePack.id)}" style="flex:1; height:40px; border-radius:999px; border:2px solid #00f0ff; background:linear-gradient(180deg, #00b4d8 0%, #0077b6 100%); color:#ffffff; font-weight:950; font-size:0.7rem; letter-spacing:1px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 0 14px rgba(0,180,216,0.4); white-space:nowrap; padding:0 12px;">
              <span>✨ ABRIR EM 3D</span>
              <span style="opacity:0.6;">·</span>
              <span style="color:#ffe066; font-weight:950;">${priceText}</span>
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
            ${this.packBoosterModuleHtml()}
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
    order.forEach(key => {
      const html = this.renderSectionByKey(key, owned);
      if (html && html.trim()) {
        rendered.push(html);
      }
    });
    return rendered.join(this.bannerRepeatHtml());
  }

  private bindDeckTabs(container: HTMLElement) {
    container.querySelectorAll('.store-deck-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
        if (!isNaN(idx)) {
          this.deckActiveIdx = idx;
          const wrap = container.querySelector('#store-decks-wrapper');
          if (wrap) {
            wrap.innerHTML = this.deckSectionsHtml(this.getOwned());
            this.bindDeckTabs(container);
            this.bindBuyButtons(container);
            this.bindViewTaps(container);
          }
        }
      });
    });
  }

  public render(container: HTMLElement, opts?: { headerSpace?: boolean }) {
    const owned = this.getOwned();
    const bal = ProgressionManager.getPlayerData();

    container.innerHTML = `
    <div class="store-screen" style="flex:1; overflow-y:auto; background:transparent; padding-top:${opts && opts.headerSpace ? '100px' : '10px'}; padding-bottom:110px;">
      <!-- SALDO -->
      <div class="store-sec" style="display:flex; gap:10px; justify-content:center; padding:14px 16px 4px 16px;">
        <div style="display:flex; align-items:center; gap:8px; background:linear-gradient(180deg, #4a351e, #241809); border:2px solid #0e0903; border-radius:12px; padding:7px 16px; box-shadow:0 3px 0 rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,236,190,0.35);">
          <span style="font-size:1rem;">🪙</span>
          <span id="store-bal-gold" style="color:#ffe9a8; font-weight:950; font-size:0.85rem; text-shadow:0 2px 0 #000;">${bal.gold}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px; background:linear-gradient(180deg, #4a351e, #241809); border:2px solid #0e0903; border-radius:12px; padding:7px 16px; box-shadow:0 3px 0 rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,236,190,0.35);">
          <span style="font-size:1rem;">💎</span>
          <span id="store-bal-gems" style="color:#7ee7ff; font-weight:950; font-size:0.85rem; text-shadow:0 2px 0 #000;">${bal.diamonds}</span>
        </div>
      </div>

      <!-- SEÇÕES DINÂMICAS DA VITRINE (ORDEM CONFIGURÁVEL NA FORJA) -->
      ${this.renderDynamicSectionsHtml(owned)}

      <div id="store-toast" style="position:fixed; left:50%; bottom:120px; transform:translateX(-50%); background:linear-gradient(180deg, #4a351e, #241809); border:2px solid #d4af37; border-radius:12px; color:#ffe9a8; font-size:0.7rem; font-weight:900; letter-spacing:2px; padding:12px 24px; opacity:0; pointer-events:none; z-index:5000; white-space:nowrap; box-shadow:0 6px 24px rgba(0,0,0,0.6);"></div>
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

    // Entrada animada premium
    gsap.fromTo(container.querySelectorAll('.store-sec'),
      { y: 26, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power2.out', clearProps: 'transform' });

    // Banner sliders automáticos (topo + repetições entre seções)
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
      }