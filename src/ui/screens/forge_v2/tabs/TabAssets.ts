import { MobbyManager } from '../../../../core/MobbyManager';
import { getMergedGameTemplatesSync } from '../utils/HestridiaMatrixRenderer';

export type AssetSectorGroup =
  | 'all'
  | 'cards'
  | 'artifacts'
  | 'mobbys'
  | 'boosters'
  | 'store_banners'
  | 'passives_ui'
  | 'uncategorized';

export interface AssetCategoryDef {
  id: string;
  label: string;
  icon: string;
  group: Exclude<AssetSectorGroup, 'all' | 'uncategorized'>;
  color: string;
  description: string;
}

export const ASSET_CATEGORIES: AssetCategoryDef[] = [
  // SETOR 1: ARTES DE CARTAS
  { id: 'card_art', label: 'Artes de Criaturas', icon: '🐉', group: 'cards', color: '#10b981', description: 'Ilustrações principais de Slimes e Criaturas' },
  { id: 'spell_art', label: 'Artes de Magias', icon: '🔮', group: 'cards', color: '#a855f7', description: 'Ilustrações de Cartas de Magia e Feitiços' },
  { id: 'card_bg', label: 'Fundos & Versos de Carta', icon: '🎴', group: 'cards', color: '#38bdf8', description: 'Fundos internos e versos de cartas' },
  { id: 'border', label: 'Molduras & Bordas', icon: '🖼️', group: 'cards', color: '#f59e0b', description: 'Bordas e ornamentos de raridade' },

  // SETOR 2: GALERIA PRÓPRIA DE ARTEFATOS
  { id: 'artifact_combat', label: 'Artefatos de Combate (Ativas)', icon: '⚔️', group: 'artifacts', color: '#ec4899', description: 'Artefatos e habilidades ativas de batalha' },
  { id: 'artifact_boss', label: 'Artefatos de Mobbys (Chefes)', icon: '💀', group: 'artifacts', color: '#f43f5e', description: 'Artefatos exclusivos usados pelos Mobbys nos duelos 3x1' },
  { id: 'artifact_relic', label: 'Relíquias & Equipamentos', icon: '🛡️', group: 'artifacts', color: '#fb7185', description: 'Itens especiais, relíquias e equipamentos da loja' },

  // SETOR 3: MOBBYS PNG (MOBBYS DUELOS)
  { id: 'mobby_png', label: 'Mobbys PNG (Chefes 3x1)', icon: '👾', group: 'mobbys', color: '#ffd700', description: 'PNGs transparentes e artes dos Mobbys de Mobbys Duelos' },
  { id: 'mobby_bg', label: 'Cenários & Vídeos de Duelo Mobby', icon: '🌌', group: 'mobbys', color: '#f97316', description: 'Fundos animados ou estáticos das arenas de Mobbys Duelos' },

  // SETOR 4: ARTES DE BOOSTER (COM SUBCATEGORIAS DOS BOOSTERS)
  { id: 'booster_front', label: 'Frente do Booster (Capa)', icon: '📦', group: 'boosters', color: '#38bdf8', description: 'Artes frontais dos pacotes Booster (Custom Front)' },
  { id: 'booster_back', label: 'Verso do Booster', icon: '🔙', group: 'boosters', color: '#818cf8', description: 'Artes traseiras dos pacotes Booster (Custom Back)' },
  { id: 'booster_foil', label: 'Texturas Foil & Embalagem 3D', icon: '✨', group: 'boosters', color: '#c084fc', description: 'Texturas metalizadas, hologramas e malhas 3D de pacotes' },
  { id: 'booster_badge', label: 'Selos, Logos & Temas de Booster', icon: '🏷️', group: 'boosters', color: '#2dd4bf', description: 'Logos de coleção, selos de raridade e temas de pacotes' },

  // SETOR 5: BANNERS DE LOJA & COMERCIAL
  { id: 'store_banner', label: 'Banners Promocionais da Loja', icon: '🎞️', group: 'store_banners', color: '#f59e0b', description: 'Banners rotativos de destaque no topo da Loja Comercial' },
  { id: 'store_offer', label: 'Destaques & Ofertas Diárias', icon: '🏷️', group: 'store_banners', color: '#fbbf24', description: 'Artes promocionais de ofertas, decks e vitrines da loja' },
  { id: 'store_currency', label: 'Moedas, Gemas & Baús', icon: '🪙', group: 'store_banners', color: '#eab308', description: 'Artes de pacotes de Ouro, Diamantes e Baús da Loja' },

  // SETOR 6: PASSIVAS, UI & CENÁRIOS DE TABULEIRO
  { id: 'ability_icon', label: 'Passivas & Buffs', icon: '🧬', group: 'passives_ui', color: '#eab308', description: 'Ícones de habilidades passivas e efeitos de status' },
  { id: 'ui_element', label: 'Botões, HUD & Interface', icon: '🎛️', group: 'passives_ui', color: '#06b6d4', description: 'Botões, ícones de interface, cursores e molduras de HUD' },
  { id: 'svg_pattern', label: 'Padrões, SVGs & Texturas', icon: '💠', group: 'passives_ui', color: '#6366f1', description: 'SVGs vetoriais, partículas e texturas visuais' },
  { id: 'scenario', label: 'Cenários & Arenas de Tabuleiro', icon: '🏞️', group: 'passives_ui', color: '#22c55e', description: 'Tabuleiros de batalha e mapas do mundo' },
];

// Compatibilidade com categorias antigas salvas no assets.json
const LEGACY_CATEGORY_MAP: Record<string, string> = {
  skill_icon: 'artifact_combat',
  sprite_asset: 'mobby_png',
};

export class TabAssets {
  private state: any;
  private availableCards: string[] = [];
  private assetRegistry: Record<string, any> = {};
  private selectedGroup: AssetSectorGroup = 'all';
  private selectedCategory: string = 'all';
  private selectedAssets: Set<string> = new Set();
  private searchQuery: string = '';
  private uploadTargetCategory: string = 'card_art';
  private confirmBulkDelete: boolean = false;
  private pendingSingleDeleteUrl: string | null = null;
  private previewAssetUrl: string | null = null;
  private pageLimit: number = 60;
  private mountedContainer: HTMLElement | null = null;

  private showToast: (msg: string, color?: string) => void;
  private setAssetsSelectedCategory: (cat: string) => void;
  private saveAssetRegistry: () => void;
  private loadAvailableImages: () => Promise<void>;
  private removeAssetsFromMemory: (urls: string[]) => void;
  private reRender: () => void;

  constructor(state: any, callbacks: any) {
    this.state = state;
    this.availableCards = state.availableCards || [];
    this.assetRegistry = state.assetRegistry || {};
    this.selectedCategory = state.selectedCategory || 'all';
    this.selectedAssets = state.selectedAssets || new Set();
    this.showToast = callbacks.showToast;
    this.setAssetsSelectedCategory = callbacks.setAssetsSelectedCategory;
    this.saveAssetRegistry = callbacks.saveAssetRegistry;
    this.loadAvailableImages = callbacks.loadAvailableImages;
    this.removeAssetsFromMemory = callbacks.removeAssetsFromMemory || (() => {});
    this.reRender = callbacks.reRender;
    this.syncLiveEngineAssetsIntoGallery();
  }

  public updateContext(state: any, callbacks: any) {
    this.state = state;
    this.availableCards = state.availableCards || [];
    this.assetRegistry = state.assetRegistry || {};
    this.selectedAssets = state.selectedAssets || this.selectedAssets;
    this.showToast = callbacks.showToast;
    this.setAssetsSelectedCategory = callbacks.setAssetsSelectedCategory;
    this.saveAssetRegistry = callbacks.saveAssetRegistry;
    this.loadAvailableImages = callbacks.loadAvailableImages;
    this.removeAssetsFromMemory = callbacks.removeAssetsFromMemory || (() => {});
    this.reRender = callbacks.reRender;
    this.syncLiveEngineAssetsIntoGallery();
  }

  /**
   * Garante que todas as PNGs de Mobbys Duelos, Banners de Loja, Capas/Versos de Boosters e Artefatos
   * apareçam em suas respectivas divisões da Galeria e tenham vínculos sincronizados.
   */
  private syncLiveEngineAssetsIntoGallery() {
    const knownSet = new Set(this.availableCards);
    const ensureUrl = (url?: string, defaultCat?: string, meta?: Record<string, any>) => {
      if (!url || typeof url !== 'string' || !url.startsWith('/')) return;
      if (!knownSet.has(url)) {
        knownSet.add(url);
        this.availableCards.push(url);
      }
      if (!this.assetRegistry[url]) this.assetRegistry[url] = {};
      if (this.assetRegistry[url].category && LEGACY_CATEGORY_MAP[this.assetRegistry[url].category]) {
        this.assetRegistry[url].category = LEGACY_CATEGORY_MAP[this.assetRegistry[url].category];
      }
      if (defaultCat && !this.assetRegistry[url].category) {
        this.assetRegistry[url].category = defaultCat;
      }
      if (meta) {
        Object.assign(this.assetRegistry[url], meta);
      }
    };

    // 1. Mobbys PNGs e Cenários de Mobbys Duelos
    const mobbys = MobbyManager.getMobbys();
    mobbys.forEach((m) => {
      if (m.image) {
        ensureUrl(m.image, 'mobby_png', {
          linkedMobbyId: m.id,
          linkedMobbyName: m.name,
          linkedCardId: m.linkedCardId || m.rewardCardId || '',
        });
        // Se já existia mas estava como card_art genérico, promove para mobby_png se é a imagem oficial de um Mobby
        if (
          this.assetRegistry[m.image]?.category === 'card_art' ||
          this.assetRegistry[m.image]?.category === 'uncategorized'
        ) {
          this.assetRegistry[m.image].category = 'mobby_png';
        }
      }
      if (m.backgroundUrl) {
        ensureUrl(m.backgroundUrl, 'mobby_bg', {
          linkedMobbyId: m.id,
          linkedMobbyName: m.name,
        });
      }
    });

    // 2. Banners da Loja e Moedas/Gemas
    const store = this.state?.storeItems || {};
    if (Array.isArray(store.banners)) {
      store.banners.forEach((bUrl: string) => ensureUrl(bUrl, 'store_banner'));
    }
    if (Array.isArray(store.coinPacks)) {
      store.coinPacks.forEach((cp: any) => ensureUrl(cp?.image, 'store_currency'));
    }
    if (Array.isArray(store.gemPacks)) {
      store.gemPacks.forEach((gp: any) => ensureUrl(gp?.image, 'store_currency'));
    }

    // 3. Boosters (Frente e Verso personalizados)
    if (Array.isArray(store.packs)) {
      store.packs.forEach((pack: any) => {
        if (pack?.customFront && pack.customFront.startsWith('/')) {
          ensureUrl(pack.customFront, 'booster_front', { boosterPackId: pack.id, boosterPackName: pack.name });
        }
        if (pack?.customBack && pack.customBack.startsWith('/')) {
          ensureUrl(pack.customBack, 'booster_back', { boosterPackId: pack.id, boosterPackName: pack.name });
        }
      });
    }

    // 4. Artefatos / Ativas
    const skills = this.state?.skills || [];
    skills.forEach((sk: any) => {
      if (sk?.icon && sk.icon.startsWith('/')) {
        ensureUrl(sk.icon, 'artifact_combat', { skillId: sk.id, name: sk.name });
      }
    });
  }

  private reRenderSelf() {
    if (this.mountedContainer && document.body.contains(this.mountedContainer)) {
      this.mountedContainer.innerHTML = this.render();
      this.bind(this.mountedContainer);
    } else {
      this.reRender();
    }
  }

  private resolveEffectiveCategory(url: string): string {
    let explicit = this.assetRegistry[url]?.category;
    if (explicit && LEGACY_CATEGORY_MAP[explicit]) {
      explicit = LEGACY_CATEGORY_MAP[explicit];
    }
    if (explicit && ASSET_CATEGORIES.some((c) => c.id === explicit)) {
      return explicit;
    }

    // Verifica se pertence a um Mobby de Mobbys Duelos
    const mobbys = MobbyManager.getMobbys();
    if (mobbys.some((m) => m.image === url)) return 'mobby_png';
    if (mobbys.some((m) => m.backgroundUrl === url)) return 'mobby_bg';

    // Verifica se pertence a Banners ou Boosters da Loja
    const store = this.state?.storeItems || {};
    if (Array.isArray(store.banners) && store.banners.includes(url)) return 'store_banner';
    if (Array.isArray(store.packs)) {
      if (store.packs.some((p: any) => p.customFront === url)) return 'booster_front';
      if (store.packs.some((p: any) => p.customBack === url)) return 'booster_back';
    }

    const lower = url.toLowerCase();
    if (lower.includes('banner') || lower.includes('promo') || lower.includes('vitrine')) {
      return 'store_banner';
    }
    if (lower.includes('booster_back') || lower.includes('pack_back')) {
      return 'booster_back';
    }
    if (lower.includes('booster_foil') || lower.includes('foil')) {
      return 'booster_foil';
    }
    if (lower.includes('booster') || lower.includes('pack_front') || lower.includes('pack_')) {
      return 'booster_front';
    }
    if (lower.includes('mobby') || lower.includes('boss') || lower.includes('colosso')) {
      return isVidUrl(lower) ? 'mobby_bg' : 'mobby_png';
    }
    if (lower.includes('artefato') || lower.includes('artifact') || lower.includes('skill') || lower.includes('ativa')) {
      return 'artifact_combat';
    }
    if (lower.includes('passiva') || lower.includes('ability') || lower.includes('buff')) {
      return 'ability_icon';
    }
    if (lower.includes('coin') || lower.includes('gem') || lower.includes('chest') || lower.includes('moeda') || lower.includes('bau')) {
      return 'store_currency';
    }
    if (lower.includes('btn') || lower.includes('ui_') || lower.includes('hud')) {
      return 'ui_element';
    }
    if (lower.includes('arena') || lower.includes('cenario') || lower.includes('scenario') || lower.includes('board') || lower.includes('bg_map')) {
      return 'scenario';
    }
    if (lower.includes('verso') || lower.includes('card_bg') || lower.includes('back')) {
      return 'card_bg';
    }
    if (lower.includes('border') || lower.includes('frame') || lower.includes('moldura')) {
      return 'border';
    }
    if (lower.includes('magia') || lower.includes('spell') || lower.includes('feitic')) {
      return 'spell_art';
    }
    return explicit || 'uncategorized';
  }

  private autoClassifyAllAssets() {
    let count = 0;
    const templates = getMergedGameTemplatesSync(this.state?.templates || []);
    const skills = this.state?.skills || [];
    const abilities = this.state?.abilities || [];
    const scenarios = this.state?.scenarios || {};
    const mobbys = MobbyManager.getMobbys();
    const store = this.state?.storeItems || {};

    const mobbyPngSet = new Set<string>();
    const mobbyBgSet = new Set<string>();
    mobbys.forEach((m) => {
      if (m.image) mobbyPngSet.add(m.image);
      if (m.backgroundUrl) mobbyBgSet.add(m.backgroundUrl);
    });

    const bannerSet = new Set<string>(Array.isArray(store.banners) ? store.banners : []);
    const boosterFrontSet = new Set<string>();
    const boosterBackSet = new Set<string>();
    if (Array.isArray(store.packs)) {
      store.packs.forEach((p: any) => {
        if (p?.customFront) boosterFrontSet.add(p.customFront);
        if (p?.customBack) boosterBackSet.add(p.customBack);
      });
    }

    const cardArtSet = new Set<string>();
    const spellArtSet = new Set<string>();
    const cardBgSet = new Set<string>();
    templates.forEach((t: any) => {
      const img = t.image || t.artUrl || t.customArtDataUrl;
      if (img) {
        if (t.entityType === 'Magia' || t.type === 'Magia' || t.isSpell) spellArtSet.add(img);
        else cardArtSet.add(img);
      }
      if (t.bgImage) cardBgSet.add(t.bgImage);
      if (t.backImage) cardBgSet.add(t.backImage);
    });

    const artifactSet = new Set<string>();
    skills.forEach((s: any) => {
      if (s.icon && s.icon.startsWith('/')) artifactSet.add(s.icon);
      if (s.image && s.image.startsWith('/')) artifactSet.add(s.image);
    });

    const abilitySet = new Set<string>();
    abilities.forEach((a: any) => {
      if (a.icon && a.icon.startsWith('/')) abilitySet.add(a.icon);
      if (a.image && a.image.startsWith('/')) abilitySet.add(a.image);
    });

    const scenarioSet = new Set<string>();
    Object.values(scenarios).forEach((sc: any) => {
      if (sc?.bgImage) scenarioSet.add(sc.bgImage);
      if (sc?.image) scenarioSet.add(sc.image);
    });

    this.availableCards.forEach((url) => {
      if (!this.assetRegistry[url]) this.assetRegistry[url] = {};

      let targetCat = '';
      if (mobbyPngSet.has(url)) targetCat = 'mobby_png';
      else if (mobbyBgSet.has(url)) targetCat = 'mobby_bg';
      else if (bannerSet.has(url)) targetCat = 'store_banner';
      else if (boosterFrontSet.has(url)) targetCat = 'booster_front';
      else if (boosterBackSet.has(url)) targetCat = 'booster_back';
      else if (artifactSet.has(url)) targetCat = 'artifact_combat';
      else if (abilitySet.has(url)) targetCat = 'ability_icon';
      else if (spellArtSet.has(url)) targetCat = 'spell_art';
      else if (cardArtSet.has(url)) targetCat = 'card_art';
      else if (cardBgSet.has(url)) targetCat = 'card_bg';
      else if (scenarioSet.has(url)) targetCat = 'scenario';
      else {
        const inferred = this.resolveEffectiveCategory(url);
        targetCat = inferred === 'uncategorized' ? 'card_art' : inferred;
      }

      this.assetRegistry[url].category = targetCat;
      count++;
    });

    this.saveAssetRegistry();
    this.showToast(`✨ ${count} ativos classificados (Cartas, Artefatos, Mobbys, Boosters e Banners)!`, '#10b981');
    this.reRenderSelf();
  }

  public render(): string {
    const mobbys = MobbyManager.getMobbys();
    const templates = getMergedGameTemplatesSync(this.state?.templates || []);

    // Compute counts
    const countsByCat: Record<string, number> = { all: this.availableCards.length, uncategorized: 0 };
    const countsByGroup: Record<AssetSectorGroup, number> = {
      all: this.availableCards.length,
      cards: 0,
      artifacts: 0,
      mobbys: 0,
      boosters: 0,
      store_banners: 0,
      passives_ui: 0,
      uncategorized: 0,
    };

    ASSET_CATEGORIES.forEach((c) => (countsByCat[c.id] = 0));

    this.availableCards.forEach((url) => {
      const catId = this.resolveEffectiveCategory(url);
      const def = ASSET_CATEGORIES.find((c) => c.id === catId);
      if (def) {
        countsByCat[def.id] = (countsByCat[def.id] || 0) + 1;
        countsByGroup[def.group] = (countsByGroup[def.group] || 0) + 1;
      } else {
        countsByCat.uncategorized++;
        countsByGroup.uncategorized++;
      }
    });

    const q = this.searchQuery.trim().toLowerCase();

    const filteredAll = this.availableCards.filter((url) => {
      const catId = this.resolveEffectiveCategory(url);
      const def = ASSET_CATEGORIES.find((c) => c.id === catId);

      if (this.selectedGroup !== 'all') {
        if (this.selectedGroup === 'uncategorized') {
          if (def) return false;
        } else if (!def || def.group !== this.selectedGroup) {
          return false;
        }
      }

      if (this.selectedCategory !== 'all') {
        if (this.selectedCategory === 'uncategorized') {
          if (def) return false;
        } else if (catId !== this.selectedCategory) {
          return false;
        }
      }

      if (q) {
        const fileName = (url.split('/').pop() || '').toLowerCase();
        const customName = (this.assetRegistry[url]?.name || '').toLowerCase();
        const catLabel = (def?.label || 'sem categoria').toLowerCase();
        const linkedMobby = (this.assetRegistry[url]?.linkedMobbyName || '').toLowerCase();
        const linkedCard = (this.assetRegistry[url]?.linkedCardId || '').toLowerCase();
        return (
          fileName.includes(q) ||
          customName.includes(q) ||
          catLabel.includes(q) ||
          linkedMobby.includes(q) ||
          linkedCard.includes(q)
        );
      }

      return true;
    });

    const visibleItems = filteredAll.slice(0, this.pageLimit);
    const hasMore = filteredAll.length > visibleItems.length;

    const groupTabs: { id: AssetSectorGroup; label: string; count: number; color: string }[] = [
      { id: 'all', label: '🌐 Todos', count: countsByGroup.all, color: '#38bdf8' },
      { id: 'cards', label: '🎴 Cartas', count: countsByGroup.cards, color: '#10b981' },
      { id: 'artifacts', label: '⚔️ Artefatos', count: countsByGroup.artifacts, color: '#ec4899' },
      { id: 'mobbys', label: '👾 Mobbys', count: countsByGroup.mobbys, color: '#ffd700' },
      { id: 'boosters', label: '📦 Boosters', count: countsByGroup.boosters, color: '#38bdf8' },
      { id: 'store_banners', label: '🎞️ Banners', count: countsByGroup.store_banners, color: '#f59e0b' },
      { id: 'passives_ui', label: '🎛️ UI & Passivas', count: countsByGroup.passives_ui, color: '#06b6d4' },
      { id: 'uncategorized', label: '📂 Sem Cat.', count: countsByGroup.uncategorized, color: '#94a3b8' },
    ];

    const subCategoriesForGroup =
      this.selectedGroup === 'all'
        ? ASSET_CATEGORIES
        : this.selectedGroup === 'uncategorized'
        ? []
        : ASSET_CATEGORIES.filter((c) => c.group === this.selectedGroup);

    return `
      <div class="editor-form-panel" style="flex:1; width:100%; height:100%; display:flex; flex-direction:column; gap:8px; background:radial-gradient(circle at 50% 0%, #141829 0%, #090b10 100%); padding:10px 16px; box-sizing:border-box; overflow:hidden; color:#fff;">
        
        <!-- BARRA DE TOPO ENXUTA: TÍTULO + UPLOAD DIRETO -->
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; border-bottom:1px solid rgba(255,255,255,0.07); padding-bottom:8px; flex-shrink:0; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.1rem;">🗂️</span>
            <h2 style="margin:0; font-size:0.92rem; font-weight:900; letter-spacing:0.5px; color:#fff;">
              CENTRAL DE GALERIAS
            </h2>
            <span style="background:rgba(56,189,248,0.14); border:1px solid rgba(56,189,248,0.3); color:#38bdf8; font-size:0.6rem; font-weight:800; padding:2px 8px; border-radius:999px;">
              ${this.availableCards.length} ativos
            </span>
          </div>

          <!-- CONTROLES DE UPLOAD INLINE COMPACTOS -->
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <span style="font-size:0.6rem; color:#94a3b8; font-weight:800;">Destino:</span>
            <select id="sel-upload-target-cat" style="background:#0c0e16; border:1px solid rgba(81,197,255,0.3); border-radius:6px; padding:4px 8px; color:#fff; font-size:0.66rem; font-weight:800; max-width:190px;">
              ${ASSET_CATEGORIES.map(
                (c) => `<option value="${c.id}" ${this.uploadTargetCategory === c.id ? 'selected' : ''}>${c.icon} ${c.label}</option>`
              ).join('')}
            </select>

            <button type="button" id="btn-upload-pc" style="background:linear-gradient(135deg, #0ea5e9, #2563eb); color:#fff; border:none; border-radius:6px; padding:5px 11px; font-size:0.66rem; font-weight:900; cursor:pointer;">
              + IMPORTAR
            </button>
            <input type="file" id="inp-file-upload" multiple accept="image/*,video/*" style="display:none">

            <button type="button" id="btn-auto-classify" style="background:rgba(16,185,129,0.14); border:1px solid rgba(16,185,129,0.4); color:#34d399; border-radius:6px; padding:5px 10px; font-size:0.65rem; font-weight:800; cursor:pointer;" title="Classifica automaticamente Cartas, Artefatos, Mobbys PNG, Boosters, Banners de Loja e UI">
              ⚡ Auto-Organizar
            </button>
          </div>
        </div>

        <!-- BARRA ÚNICA COMPACTA DE FILTROS: DIVISÕES + SUBCATEGORIA (SELECT) + BUSCA -->
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.07); border-radius:8px; padding:5px 8px; flex-shrink:0;">
          <div style="display:flex; gap:4px; flex-wrap:wrap; align-items:center;">
            ${groupTabs
              .map((g) => {
                const active = this.selectedGroup === g.id;
                return `
                  <button type="button" class="asset-group-tab" data-group="${g.id}" style="display:inline-flex; align-items:center; gap:4px; background:${active ? g.color : 'rgba(255,255,255,0.04)'}; color:${active ? '#05070b' : '#cbd5e1'}; border:1px solid ${active ? g.color : 'rgba(255,255,255,0.08)'}; border-radius:6px; padding:4px 8px; font-size:0.64rem; font-weight:800; cursor:pointer; white-space:nowrap; transition:0.12s;">
                    <span>${g.label}</span>
                    <span style="opacity:${active ? '0.9' : '0.6'}; font-size:0.58rem;">(${g.count})</span>
                  </button>
                `;
              })
              .join('')}
          </div>

          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            ${
              subCategoriesForGroup.length > 0
                ? `<select id="sel-subcat-filter" style="background:#0d1018; border:1px solid rgba(255,255,255,0.16); border-radius:6px; padding:4px 8px; color:#e2e8f0; font-size:0.65rem; font-weight:800; cursor:pointer; max-width:210px;">
                    <option value="all" ${this.selectedCategory === 'all' ? 'selected' : ''}>📂 Todas Subcategorias (${filteredAll.length})</option>
                    ${subCategoriesForGroup
                      .map(
                        (c) =>
                          `<option value="${c.id}" ${this.selectedCategory === c.id ? 'selected' : ''}>${c.icon} ${c.label} (${countsByCat[c.id] || 0})</option>`
                      )
                      .join('')}
                  </select>`
                : ''
            }
            <input type="text" id="inp-asset-search" placeholder="🔍 Buscar ativo, Mobby, carta..." value="${this.searchQuery.replace(/"/g, '&quot;')}" style="background:#090b11; border:1px solid rgba(255,255,255,0.14); border-radius:6px; padding:4px 9px; color:#fff; font-size:0.66rem; width:165px;" />
            <button type="button" id="btn-select-all-filtered" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.14); color:#cbd5e1; border-radius:6px; padding:4px 8px; font-size:0.63rem; font-weight:800; cursor:pointer; white-space:nowrap;">
              ☑️ Selecionar (${visibleItems.length})
            </button>
          </div>
        </div>

        <!-- BARRA DE AÇÕES EM LOTE (QUANDO HÁ ITENS SELECIONADOS) -->
        ${
          this.selectedAssets.size > 0
            ? `<div id="bulk-actions-bar" style="background:rgba(245,158,11,0.12); border:1px solid #f59e0b; border-radius:8px; padding:5px 10px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between; flex-shrink:0;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-weight:900; font-size:0.68rem; color:#fbbf24;">☑️ ${this.selectedAssets.size} selecionado(s)</span>
                  <button type="button" id="btn-clear-selection" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#e2e8f0; border-radius:5px; padding:3px 8px; font-size:0.62rem; cursor:pointer;">Limpar</button>
                </div>

                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <select id="bulk-cat-select" style="background:#0c0e16; border:1px solid #f59e0b; border-radius:6px; padding:3px 8px; color:#fff; font-size:0.66rem; font-weight:800;">
                    <option value="">📂 Mover selecionados para...</option>
                    ${ASSET_CATEGORIES.map((c) => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('')}
                  </select>

                  ${
                    this.confirmBulkDelete
                      ? `<div style="display:flex; align-items:center; gap:5px; background:rgba(239,68,68,0.2); border:1px solid #ef4444; padding:2px 8px; border-radius:6px;">
                          <span style="font-size:0.65rem; color:#fca5a5; font-weight:900;">Apagar ${this.selectedAssets.size} arquivo(s)?</span>
                          <button type="button" id="btn-confirm-bulk-delete" style="background:#ef4444; color:#fff; border:none; border-radius:5px; padding:3px 8px; font-size:0.64rem; font-weight:900; cursor:pointer;">SIM</button>
                          <button type="button" id="btn-cancel-bulk-delete" style="background:rgba(255,255,255,0.12); color:#fff; border:none; border-radius:5px; padding:3px 7px; font-size:0.64rem; cursor:pointer;">Não</button>
                        </div>`
                      : `<button type="button" id="btn-bulk-delete" style="background:#ef4444; color:#fff; border:none; border-radius:6px; padding:4px 10px; font-size:0.66rem; font-weight:900; cursor:pointer;">
                          🗑️ Excluir (${this.selectedAssets.size})
                        </button>`
                  }
                </div>
              </div>`
            : ''
        }

        <!-- GRID DE ATIVOS (COM VÍNCULO MOBBY ⇄ CARTA E PAGINAÇÃO LEVE) -->
        <div id="asset-grid" style="flex:1; display:grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap:10px; overflow-y:auto; padding-right:4px; align-content:start;">
          ${
            visibleItems.length === 0
              ? `<div style="grid-column: 1 / -1; text-align:center; padding:40px 20px; color:#64748b; background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.08); border-radius:12px;">
                  <div style="font-size:2rem; margin-bottom:6px;">📭</div>
                  <div style="font-size:0.88rem; font-weight:800; color:#cbd5e1;">Nenhum ativo nesta divisão ou subcategoria</div>
                  <div style="font-size:0.7rem; margin-top:4px;">Use "+ IMPORTAR" acima ou clique em "⚡ Auto-Organizar".</div>
                </div>`
              : visibleItems
                  .map((url) => {
                    const isSelected = this.selectedAssets.has(url);
                    const isVid = isVidUrl(url);
                    const effCat = this.resolveEffectiveCategory(url);
                    const catDef = ASSET_CATEGORIES.find((c) => c.id === effCat);
                    const fileName = decodeURIComponent(url.split('/').pop() || url);
                    const isConfirmingSingle = this.pendingSingleDeleteUrl === url;

                    // Resolve vínculos Mobby / Carta para este ativo
                    const matchedMobby =
                      mobbys.find((m) => m.image === url || m.backgroundUrl === url) ||
                      (this.assetRegistry[url]?.linkedMobbyId
                        ? mobbys.find((m) => m.id === this.assetRegistry[url].linkedMobbyId)
                        : undefined);
                    const matchedCard =
                      templates.find(
                        (t: any) =>
                          t.image === url ||
                          t.artUrl === url ||
                          (matchedMobby &&
                            (t.name === matchedMobby.rewardCardId || t.name === matchedMobby.linkedCardId)) ||
                          (this.assetRegistry[url]?.linkedCardId &&
                            (t.name === this.assetRegistry[url].linkedCardId ||
                              t.id === this.assetRegistry[url].linkedCardId))
                      ) || null;

                    const showLinkControls =
                      effCat === 'mobby_png' ||
                      effCat === 'mobby_bg' ||
                      effCat === 'card_art' ||
                      effCat === 'spell_art' ||
                      Boolean(matchedMobby) ||
                      Boolean(matchedCard);

                    return `
                      <div class="asset-card ${isSelected ? 'selected' : ''}" data-url="${url}" style="background:#111420; border-radius:10px; overflow:hidden; border:1.5px solid ${isSelected ? '#f59e0b' : matchedMobby ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.08)'}; display:flex; flex-direction:column; position:relative;">
                        
                        <!-- THUMBNAIL AREA -->
                        <div class="asset-thumb-click" data-url="${url}" style="aspect-ratio:1/1; width:100%; position:relative; cursor:pointer; background:radial-gradient(circle, #1e2436 0%, #0b0d14 100%); overflow:hidden; display:flex; align-items:center; justify-content:center;">
                          ${
                            isVid
                              ? `<video src="${url}" style="width:100%; height:100%; object-fit:contain;" muted loop preload="metadata" onmouseover="this.play()" onmouseout="this.pause();this.currentTime=0;"></video>`
                              : `<img src="${url}" loading="lazy" decoding="async" alt="${fileName}" style="width:100%; height:100%; object-fit:contain; padding:4px; box-sizing:border-box;" />`
                          }

                          <!-- CHECKBOX DE SELEÇÃO -->
                          <div style="position:absolute; top:6px; left:6px; width:20px; height:20px; border-radius:5px; background:${isSelected ? '#f59e0b' : 'rgba(0,0,0,0.65)'}; border:1.5px solid ${isSelected ? '#f59e0b' : 'rgba(255,255,255,0.35)'}; color:${isSelected ? '#000' : '#fff'}; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:900;">
                            ${isSelected ? '✓' : ''}
                          </div>

                          <!-- BADGE DE MOBBY OU BOOSTER SE VINCULADO -->
                          ${
                            matchedMobby
                              ? `<div style="position:absolute; bottom:5px; left:5px; right:5px; background:rgba(15,12,24,0.9); border:1px solid #ffd700; color:#ffd700; border-radius:4px; padding:1px 5px; font-size:0.54rem; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:none;">
                                  👾 ${matchedMobby.name} ${matchedCard ? `⇄ 🎴 ${matchedCard.name}` : ''}
                                </div>`
                              : ''
                          }

                          <!-- BOTÕES RÁPIDOS NO TOPO DIREITO (ZOOM & EXCLUIR) -->
                          <div style="position:absolute; top:6px; right:6px; display:flex; gap:3px;">
                            <button type="button" class="btn-preview-asset" data-url="${url}" style="width:22px; height:22px; border-radius:5px; background:rgba(0,0,0,0.75); border:1px solid rgba(255,255,255,0.2); color:#38bdf8; font-size:0.65rem; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Inspecionar">🔍</button>
                            <button type="button" class="btn-single-delete-asset" data-url="${url}" style="width:22px; height:22px; border-radius:5px; background:rgba(239,68,68,0.85); border:1px solid rgba(255,255,255,0.25); color:#fff; font-size:0.65rem; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Apagar item">🗑️</button>
                          </div>

                          <!-- OVERLAY DE CONFIRMAÇÃO DE EXCLUSÃO INDIVIDUAL -->
                          ${
                            isConfirmingSingle
                              ? `<div style="position:absolute; inset:0; background:rgba(15,10,20,0.94); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; padding:8px; z-index:20; text-align:center;">
                                  <div style="font-size:0.68rem; font-weight:900; color:#fca5a5;">Apagar permanentemente?</div>
                                  <div style="display:flex; gap:5px;">
                                    <button type="button" class="btn-confirm-single-delete" data-url="${url}" style="background:#ef4444; color:#fff; border:none; border-radius:5px; padding:4px 9px; font-size:0.64rem; font-weight:900; cursor:pointer;">Sim</button>
                                    <button type="button" class="btn-cancel-single-delete" data-url="${url}" style="background:rgba(255,255,255,0.15); color:#fff; border:none; border-radius:5px; padding:4px 9px; font-size:0.64rem; cursor:pointer;">Não</button>
                                  </div>
                                </div>`
                              : ''
                          }
                        </div>

                        <!-- FOOTER DO CARD COMPACTO -->
                        <div style="padding:6px; display:flex; flex-direction:column; gap:4px; background:#0c0f18; border-top:1px solid rgba(255,255,255,0.06);">
                          <div style="font-size:0.62rem; font-weight:800; color:#e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${fileName}">
                            ${fileName}
                          </div>

                          <select class="sel-item-category" data-url="${url}" style="width:100%; background:#151928; border:1px solid ${catDef ? catDef.color + '55' : 'rgba(255,255,255,0.1)'}; color:${catDef ? catDef.color : '#94a3b8'}; border-radius:5px; padding:2px 5px; font-size:0.58rem; font-weight:800; cursor:pointer;">
                            <option value="uncategorized" ${!catDef ? 'selected' : ''}>📦 Sem Categoria</option>
                            ${ASSET_CATEGORIES.map(
                              (c) => `<option value="${c.id}" ${effCat === c.id ? 'selected' : ''}>${c.icon} ${c.label}</option>`
                            ).join('')}
                          </select>

                          ${
                            showLinkControls
                              ? `<div style="display:grid; grid-template-columns:1fr 1fr; gap:3px;">
                                  <select class="sel-asset-link-mobby" data-url="${url}" title="Vincular Mobby" style="width:100%; min-width:0; background:#11131e; border:1px solid rgba(255,215,0,0.28); color:#ffd700; border-radius:4px; padding:2px 3px; font-size:0.54rem; font-weight:700; cursor:pointer;">
                                    <option value="">👾 Mobby...</option>
                                    ${mobbys
                                      .map(
                                        (m) =>
                                          `<option value="${m.id}" ${matchedMobby?.id === m.id ? 'selected' : ''}>👾 ${m.name}</option>`
                                      )
                                      .join('')}
                                  </select>
                                  <select class="sel-asset-link-card" data-url="${url}" data-mobby-id="${matchedMobby?.id || ''}" title="Vincular Carta (Mobby ⇄ Carta)" style="width:100%; min-width:0; background:#11131e; border:1px solid rgba(16,185,129,0.28); color:#34d399; border-radius:4px; padding:2px 3px; font-size:0.54rem; font-weight:700; cursor:pointer;">
                                    <option value="">🎴 Carta...</option>
                                    ${templates
                                      .map(
                                        (t: any) =>
                                          `<option value="${t.name}" ${matchedCard?.name === t.name ? 'selected' : ''}>🎴 ${t.name}</option>`
                                      )
                                      .join('')}
                                  </select>
                                </div>`
                              : ''
                          }
                        </div>

                      </div>
                    `;
                  })
                  .join('')
          }
          ${
            hasMore
              ? `<div style="grid-column: 1 / -1; display:flex; justify-content:center; padding:14px;">
                  <button type="button" id="btn-load-more-assets" style="background:rgba(56,189,248,0.15); border:1px solid #38bdf8; color:#38bdf8; border-radius:999px; padding:8px 24px; font-size:0.75rem; font-weight:900; cursor:pointer;">
                    Carregar Mais Ativos (${filteredAll.length - visibleItems.length} restantes)
                  </button>
                </div>`
              : ''
          }
        </div>

        <!-- MODAL DE INSPEÇÃO / PREVIEW DE ATIVO -->
        ${
          this.previewAssetUrl
            ? `<div id="asset-preview-modal" style="position:fixed; inset:0; background:rgba(0,0,0,0.86); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:24px;">
                <div style="background:#121521; border:1px solid rgba(255,255,255,0.15); border-radius:16px; max-width:620px; width:100%; padding:20px; display:flex; flex-direction:column; gap:14px; box-shadow:0 20px 60px rgba(0,0,0,0.9);">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:0.85rem; font-weight:900; color:#38bdf8; word-break:break-all;">${decodeURIComponent(this.previewAssetUrl.split('/').pop() || '')}</div>
                    <button type="button" id="btn-close-asset-preview" style="background:none; border:none; color:#94a3b8; font-size:1.2rem; cursor:pointer;">✕</button>
                  </div>
                  <div style="height:340px; background:#080a10; border-radius:12px; display:flex; align-items:center; justify-content:center; overflow:hidden; border:1px solid rgba(255,255,255,0.06);">
                    ${
                      isVidUrl(this.previewAssetUrl)
                        ? `<video src="${this.previewAssetUrl}" controls autoplay loop style="max-width:100%; max-height:100%;"></video>`
                        : `<img src="${this.previewAssetUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />`
                    }
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                    <code style="font-size:0.68rem; color:#94a3b8; background:rgba(0,0,0,0.4); padding:6px 10px; border-radius:6px; flex:1; overflow:hidden; text-overflow:ellipsis;">${this.previewAssetUrl}</code>
                    <button type="button" class="btn-confirm-single-delete" data-url="${this.previewAssetUrl}" style="background:#ef4444; color:#fff; border:none; border-radius:8px; padding:8px 14px; font-size:0.74rem; font-weight:900; cursor:pointer;">🗑️ Excluir do Disco</button>
                  </div>
                </div>
              </div>`
            : ''
        }

      </div>
    `;
  }

  private async executeDeleteUrls(urls: string[]) {
    if (urls.length === 0) return;
    try {
      const resp = await fetch('/api/delete-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      if (resp.ok) {
        const removeSet = new Set(urls);
        this.availableCards = this.availableCards.filter((u) => !removeSet.has(u));
        urls.forEach((u) => {
          delete this.assetRegistry[u];
          this.selectedAssets.delete(u);
        });
        this.removeAssetsFromMemory(urls);
        this.pendingSingleDeleteUrl = null;
        this.previewAssetUrl = null;
        this.confirmBulkDelete = false;
        this.showToast(`🗑️ ${urls.length} arquivo(s) removido(s) permanentemente!`, '#10b981');
        this.reRenderSelf();
      } else {
        this.showToast('❌ Erro ao remover arquivo(s) no servidor.', '#ef4444');
      }
    } catch (err) {
      this.showToast('❌ Falha de comunicação ao excluir ativo.', '#ef4444');
    }
  }

  public bind(container: HTMLElement) {
    this.mountedContainer = container;

    // NAVEGAÇÃO POR GRUPO (SETORES)
    container.querySelectorAll('.asset-group-tab').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const grp = (e.currentTarget as HTMLElement).dataset.group as AssetSectorGroup;
        this.selectedGroup = grp;
        this.selectedCategory = 'all';
        this.pageLimit = 60;
        if (grp === 'cards') this.uploadTargetCategory = 'card_art';
        else if (grp === 'artifacts') this.uploadTargetCategory = 'artifact_combat';
        else if (grp === 'mobbys') this.uploadTargetCategory = 'mobby_png';
        else if (grp === 'boosters') this.uploadTargetCategory = 'booster_front';
        else if (grp === 'store_banners') this.uploadTargetCategory = 'store_banner';
        else if (grp === 'passives_ui') this.uploadTargetCategory = 'ability_icon';
        this.reRenderSelf();
      });
    });

    // SUB-CATEGORIAS (SELETOR COMPACTO)
    container.querySelector('#sel-subcat-filter')?.addEventListener('change', (e) => {
      const cat = (e.currentTarget as HTMLSelectElement).value;
      this.selectedCategory = cat;
      this.pageLimit = 60;
      if (cat !== 'all' && cat !== 'uncategorized') {
        this.uploadTargetCategory = cat;
      }
      this.setAssetsSelectedCategory(cat);
    });

    // BUSCA
    container.querySelector('#inp-asset-search')?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.pageLimit = 60;
      this.reRenderSelf();
      const inp = this.mountedContainer?.querySelector('#inp-asset-search') as HTMLInputElement;
      if (inp) {
        inp.focus();
        inp.setSelectionRange(inp.value.length, inp.value.length);
      }
    });

    // AUTO-ORGANIZAR PELA ENGINE
    container.querySelector('#btn-auto-classify')?.addEventListener('click', () => {
      this.autoClassifyAllAssets();
    });

    // DESTINO DO UPLOAD
    container.querySelector('#sel-upload-target-cat')?.addEventListener('change', (e) => {
      this.uploadTargetCategory = (e.target as HTMLSelectElement).value;
    });

    // UPLOAD DO COMPUTADOR
    container.querySelector('#btn-upload-pc')?.addEventListener('click', () => {
      (container.querySelector('#inp-file-upload') as HTMLInputElement)?.click();
    });

    container.querySelector('#inp-file-upload')?.addEventListener('change', async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      const targetCat = this.uploadTargetCategory || 'card_art';
      this.showToast(`Enviando ${files.length} arquivo(s)...`, '#38bdf8');

      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('media', file);
        try {
          const resp = await fetch('/api/upload-media', { method: 'POST', body: formData });
          if (resp.ok) {
            const data = await resp.json();
            const newUrls: string[] = data.urls || (data.url ? [data.url] : []);
            newUrls.forEach((u) => {
              uploadedUrls.push(u);
              if (!this.assetRegistry[u]) this.assetRegistry[u] = {};
              this.assetRegistry[u].category = targetCat;
            });
          }
        } catch (err) {
          this.showToast(`❌ Falha no envio de ${file.name}`, '#ef4444');
        }
      }

      if (uploadedUrls.length > 0) {
        this.saveAssetRegistry();
        await this.loadAvailableImages();
        this.showToast(`✅ ${uploadedUrls.length} ativo(s) adicionados em ${targetCat}!`, '#10b981');
        this.reRender();
      }
    });

    // SELECIONAR / DESELECIONAR CARD
    container.querySelectorAll('.asset-thumb-click').forEach((thumb) => {
      thumb.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;
        const url = (thumb as HTMLElement).dataset.url!;
        if (this.selectedAssets.has(url)) this.selectedAssets.delete(url);
        else this.selectedAssets.add(url);
        this.reRenderSelf();
      });
    });

    // SELECIONAR TODOS OS VISÍVEIS
    container.querySelector('#btn-select-all-filtered')?.addEventListener('click', () => {
      const cards = container.querySelectorAll('.asset-card');
      cards.forEach((c) => {
        const u = (c as HTMLElement).dataset.url;
        if (u) this.selectedAssets.add(u);
      });
      this.reRenderSelf();
    });

    // LIMPAR SELEÇÃO
    container.querySelector('#btn-clear-selection')?.addEventListener('click', () => {
      this.selectedAssets.clear();
      this.confirmBulkDelete = false;
      this.reRenderSelf();
    });

    // ALTERAR CATEGORIA INDIVIDUAL
    container.querySelectorAll('.sel-item-category').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        e.stopPropagation();
        const el = e.currentTarget as HTMLSelectElement;
        const url = el.dataset.url!;
        const newCat = el.value;
        if (!this.assetRegistry[url]) this.assetRegistry[url] = {};
        if (newCat === 'uncategorized') {
          delete this.assetRegistry[url].category;
        } else {
          this.assetRegistry[url].category = newCat;
        }
        this.saveAssetRegistry();
        this.showToast('Subcategoria do ativo atualizada!', '#10b981');
        this.reRenderSelf();
      });
    });

    // VINCULAR ATIVO DIRETAMENTE A UM MOBBY (E SINCRONIZAR PNG DO MOBBY)
    container.querySelectorAll('.sel-asset-link-mobby').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        e.stopPropagation();
        const el = e.currentTarget as HTMLSelectElement;
        const url = el.dataset.url!;
        const mobbyId = el.value;
        if (!this.assetRegistry[url]) this.assetRegistry[url] = {};

        if (mobbyId) {
          const mob = MobbyManager.getMobbyById(mobbyId);
          if (mob) {
            if (isVidUrl(url)) {
              mob.backgroundUrl = url;
              this.assetRegistry[url].category = 'mobby_bg';
            } else {
              mob.image = url;
              this.assetRegistry[url].category = 'mobby_png';
            }
            MobbyManager.upsertMobby(mob);
            this.assetRegistry[url].linkedMobbyId = mob.id;
            this.assetRegistry[url].linkedMobbyName = mob.name;
            if (mob.rewardCardId) {
              MobbyManager.setBidirectionalLink(mob.id, mob.linkedCardId || mob.rewardCardId, mob.rewardCardId);
            }
            this.saveAssetRegistry();
            this.showToast(`👾 PNG vinculado ao Mobby "${mob.name}"!`, '#ffd700');
          }
        } else {
          delete this.assetRegistry[url].linkedMobbyId;
          delete this.assetRegistry[url].linkedMobbyName;
          this.saveAssetRegistry();
        }
        this.reRenderSelf();
      });
    });

    // VINCULAR ATIVO / MOBBY A UMA CARTA (PARÂMETRO BIDIRECIONAL MOBBY ⇄ CARTA)
    container.querySelectorAll('.sel-asset-link-card').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        e.stopPropagation();
        const el = e.currentTarget as HTMLSelectElement;
        const url = el.dataset.url!;
        const mobbyId = el.dataset.mobbyId || this.assetRegistry[url]?.linkedMobbyId || '';
        const cardName = el.value;
        if (!this.assetRegistry[url]) this.assetRegistry[url] = {};
        this.assetRegistry[url].linkedCardId = cardName;
        this.saveAssetRegistry();

        if (mobbyId && cardName) {
          MobbyManager.setBidirectionalLink(mobbyId, cardName, cardName);
          this.showToast(`🔗 Vínculo bidirecional salvo: Mobby ⇄ Carta "${cardName}"!`, '#10b981');
        } else if (cardName) {
          this.showToast(`🎴 Ativo vinculado à carta "${cardName}"!`, '#10b981');
        }
        this.reRenderSelf();
      });
    });

    // ALTERAR CATEGORIA EM LOTE
    container.querySelector('#bulk-cat-select')?.addEventListener('change', (e) => {
      const cat = (e.target as HTMLSelectElement).value;
      if (!cat) return;

      this.selectedAssets.forEach((url) => {
        if (!this.assetRegistry[url]) this.assetRegistry[url] = {};
        this.assetRegistry[url].category = cat;
      });

      const count = this.selectedAssets.size;
      this.selectedAssets.clear();
      this.saveAssetRegistry();
      this.showToast(`📂 ${count} ativos movidos com sucesso!`, '#10b981');
      this.reRenderSelf();
    });

    // PREVIEW / ZOOM DE ATIVO
    container.querySelectorAll('.btn-preview-asset').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.previewAssetUrl = (e.currentTarget as HTMLElement).dataset.url || null;
        this.reRenderSelf();
      });
    });

    container.querySelector('#btn-close-asset-preview')?.addEventListener('click', () => {
      this.previewAssetUrl = null;
      this.reRenderSelf();
    });

    // EXCLUIR ÚNICO ITEM
    container.querySelectorAll('.btn-single-delete-asset').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.pendingSingleDeleteUrl = (e.currentTarget as HTMLElement).dataset.url || null;
        this.reRenderSelf();
      });
    });

    container.querySelectorAll('.btn-cancel-single-delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.pendingSingleDeleteUrl = null;
        this.reRenderSelf();
      });
    });

    container.querySelectorAll('.btn-confirm-single-delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const url = (e.currentTarget as HTMLElement).dataset.url;
        if (url) {
          await this.executeDeleteUrls([url]);
        }
      });
    });

    // EXCLUIR EM LOTE
    container.querySelector('#btn-bulk-delete')?.addEventListener('click', () => {
      this.confirmBulkDelete = true;
      this.reRenderSelf();
    });

    container.querySelector('#btn-cancel-bulk-delete')?.addEventListener('click', () => {
      this.confirmBulkDelete = false;
      this.reRenderSelf();
    });

    container.querySelector('#btn-confirm-bulk-delete')?.addEventListener('click', async () => {
      const urls = Array.from(this.selectedAssets);
      await this.executeDeleteUrls(urls);
    });

    // CARREGAR MAIS
    container.querySelector('#btn-load-more-assets')?.addEventListener('click', () => {
      this.pageLimit += 60;
      this.reRenderSelf();
    });
  }
}

function isVidUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url || '');
}
