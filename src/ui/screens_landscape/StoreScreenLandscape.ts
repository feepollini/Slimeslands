import { StoreScreen } from '../screens/StoreScreen';
import { SoundManager } from '../utils/SoundManager';

/**
 * StoreScreenLandscape — Cópia adaptada da Loja para Modo Paisagem (Landscape / Web Widescreen).
 * Respeita todas as bordas (TopHeader, BottomNav e margens laterais) e organiza a loja
 * em dois painéis emoldurados (Menu Lateral do Mercado Real + Vitrine Emoldurada com foco visual).
 */
export class StoreScreenLandscape extends StoreScreen {
  public override render(container: HTMLElement, _opts?: { headerSpace?: boolean }) {
    super.render(container, { headerSpace: false });

    const rootWrap = container.firstElementChild as HTMLElement | null;
    const innerStoreScreen = container.querySelector('.store-screen') as HTMLElement | null;
    if (!rootWrap || !innerStoreScreen) return;

    rootWrap.classList.add('store-landscape-outer');

    // Ajusta grades internas para proporção Widescreen organizada conforme o tamanho da tela
    const isMobileLs = window.innerHeight <= 540 || window.innerWidth <= 900;
    const cols = isMobileLs ? 'repeat(3, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))';
    const gap = isMobileLs ? '8px' : '14px';

    const dailyGrid = innerStoreScreen.querySelector('#store-daily-grid') as HTMLElement | null;
    if (dailyGrid) {
      dailyGrid.style.gridTemplateColumns = cols;
      dailyGrid.style.gap = gap;
    }

    const rareGrid = innerStoreScreen.querySelector('#store-rare-grid') as HTMLElement | null;
    if (rareGrid) {
      rareGrid.style.gridTemplateColumns = cols;
      rareGrid.style.gap = gap;
    }

    const decksWrapper = innerStoreScreen.querySelector('#store-decks-wrapper') as HTMLElement | null;
    if (decksWrapper) {
      decksWrapper.style.display = 'grid';
      decksWrapper.style.gridTemplateColumns = isMobileLs ? '1fr' : 'repeat(2, minmax(0, 1fr))';
      decksWrapper.style.gap = isMobileLs ? '10px' : '16px';
    }

    const artGrid = innerStoreScreen.querySelector('#store-art-grid') as HTMLElement | null;
    if (artGrid) {
      artGrid.style.gridTemplateColumns = cols;
      artGrid.style.gap = gap;
    }

    // Cria o container emoldurado de duas colunas (Menu Lateral + Vitrine Principal)
    const frameShell = document.createElement('div');
    frameShell.className = 'store-landscape-frame';

    const sidebar = document.createElement('aside');
    sidebar.className = 'store-ls-sidebar';
    sidebar.innerHTML = `
      <div class="store-ls-sidebar-header">
        <span class="store-ls-sidebar-icon">🛒</span>
        <div>
          <div class="store-ls-sidebar-title">MERCADO REAL</div>
          <div class="store-ls-sidebar-sub">CATEGORIAS DA LOJA</div>
        </div>
      </div>

      <div class="store-ls-nav-list">
        <button class="store-ls-cat-btn active" data-ls-target="all">
          <span class="cat-ico">🌟</span>
          <span class="cat-txt">Vitrine Completa</span>
        </button>
        <button class="store-ls-cat-btn" data-ls-target="packs">
          <span class="cat-ico">📦</span>
          <span class="cat-txt">Boosters</span>
        </button>
        <button class="store-ls-cat-btn" data-ls-target="packs_split">
          <span class="cat-ico">🌓</span>
          <span class="cat-txt">Destaques</span>
        </button>
        <button class="store-ls-cat-btn" data-ls-target="daily">
          <span class="cat-ico">☀️</span>
          <span class="cat-txt">Ofertas do Dia</span>
        </button>
        <button class="store-ls-cat-btn" data-ls-target="rare">
          <span class="cat-ico">💎</span>
          <span class="cat-txt">Cartas Raras</span>
        </button>
        <button class="store-ls-cat-btn" data-ls-target="decks">
          <span class="cat-ico">🃏</span>
          <span class="cat-txt">Decks Completos</span>
        </button>
        <button class="store-ls-cat-btn" data-ls-target="artifacts">
          <span class="cat-ico">✨</span>
          <span class="cat-txt">Artefatos</span>
        </button>
        <button class="store-ls-cat-btn" data-ls-target="coins">
          <span class="cat-ico">🪙</span>
          <span class="cat-txt">Moedas & Gemas</span>
        </button>
      </div>
    `;

    innerStoreScreen.classList.add('store-ls-main');
    rootWrap.insertBefore(frameShell, innerStoreScreen);
    frameShell.appendChild(sidebar);
    frameShell.appendChild(innerStoreScreen);

    // Filtro e navegação suave por seção
    sidebar.querySelectorAll('.store-ls-cat-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        try {
          SoundManager.playAction('clique_geral', 0.45);
        } catch (_) {}
        sidebar.querySelectorAll('.store-ls-cat-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const key = (btn as HTMLElement).dataset.lsTarget || 'all';
        const allSecs = Array.from(innerStoreScreen.querySelectorAll('.store-dynamic-sec')) as HTMLElement[];

        if (key === 'all') {
          allSecs.forEach((sec) => {
            sec.style.display = '';
          });
          innerStoreScreen.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          // Mostra todas mas rola diretamente até a seção escolhida, ou filtra moedas+gemas
          allSecs.forEach((sec) => {
            const modKey = sec.dataset.moduleKey || '';
            if (key === 'coins') {
              sec.style.display = modKey === 'coins' || modKey === 'gems' ? '' : 'none';
            } else {
              sec.style.display = modKey === key ? '' : 'none';
            }
          });
          // Se nenhuma seção bater (caso oculta na forja), mostra todas e faz scroll
          const anyVisible = allSecs.some((sec) => sec.style.display !== 'none');
          if (!anyVisible) {
            allSecs.forEach((sec) => {
              sec.style.display = '';
            });
            const targetEl =
              innerStoreScreen.querySelector(`.sec-${key}`) ||
              innerStoreScreen.querySelector(`[data-module-key="${key}"]`);
            targetEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            innerStoreScreen.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      });
    });
  }
}
