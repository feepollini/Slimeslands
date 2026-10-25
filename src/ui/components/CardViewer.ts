import { gsap } from 'gsap';
import { renderMatrixCardSVG } from '../screens/forge_v2/utils/HestridiaMatrixRenderer';
import type { Card } from '../../core/GameEngine';

// Fullscreen único de carta (loja e deck): a mesma carta premium da forja,
// grande, com botão de ação abaixo (COMPRAR na loja, EQUIPAR/REMOVER no deck).
export interface ViewerActionResult {
  close: boolean;
  label?: string;
  disabled?: boolean;
}

export interface OpenViewerOpts {
  card: any;
  list?: any[];
  index?: number;
  priceHtml?: string;
  actionLabel: string;
  getActionLabel?: (card: any) => string;
  actionDisabled?: boolean;
  onAction: (card: any) => ViewerActionResult | void;
}

interface ViewerSession {
  overlay: HTMLElement;
  list: any[];
  idx: number;
  paint: () => void;
}

let session: ViewerSession | null = null;

export function toPreviewCard(rawCard: any): Card {
  const t = rawCard || {};
  const atk = t.baseAtk ?? t.atk ?? 0;
  const pv = t.basePv ?? t.pv ?? 0;
  const mana = t.manaCost ?? t.mana ?? 1;
  const stamina = t.staminaCost ?? t.stamina ?? 1;
  const attacksSource = (t.attacks && t.attacks.length > 0) ? t.attacks : [
    { name: 'ATACAR', damage: atk, cost: stamina, costType: 'stamina' }
  ];
  const mappedAttacks = attacksSource.map((a: any, i: number) => ({
    ...a,
    name: a.name || (a.type === 'damage' ? `ATAQUE ${i + 1}` : `EFEITO ${i + 1}`)
  }));
  return {
    ...t,
    id: t.id || 'preview',
    name: t.name || t.title || 'Carta',
    image: t.image || t.imageUrl || '',
    owner: 'p',
    atk: atk,
    baseAtk: atk,
    pv: pv,
    basePv: pv,
    maxPv: pv,
    manaCost: mana,
    staminaCost: stamina,
    attacks: mappedAttacks,
    rarity: t.preferredRarity || t.rarity || 'common',
    preferredRarity: t.preferredRarity || t.rarity || 'common',
    immersiveMode: false
  } as unknown as Card;
}

export function isCardViewerOpen(): boolean {
  return !!session && !!document.getElementById('card-viewer-overlay');
}

export function closeCardViewer() {
  try {
    document.getElementById('card-viewer-overlay')?.remove();
    document.removeEventListener('keydown', onViewerKey);
  } catch {}
  session = null;
}

let lastNavDir = 1;

export function cardViewerNav(dir: number) {
  if (!session || session.list.length < 2) return;
  lastNavDir = dir;
  session.idx = (session.idx + dir + session.list.length) % session.list.length;
  session.paint();
}

function onViewerKey(e: KeyboardEvent) {
  if (!session) return;
  if (e.key === 'Escape') closeCardViewer();
  else if (e.key === 'ArrowLeft') cardViewerNav(-1);
  else if (e.key === 'ArrowRight') cardViewerNav(1);
}

export function openCardViewer(rawOpts: OpenViewerOpts | any) {
  closeCardViewer();
  if (!rawOpts) return;

  const isOptsObject =
    typeof rawOpts === 'object' &&
    ('card' in rawOpts || 'actionLabel' in rawOpts || 'onAction' in rawOpts);

  const opts: OpenViewerOpts = isOptsObject
    ? {
        card: rawOpts.card,
        list: rawOpts.list,
        index: rawOpts.index,
        priceHtml: rawOpts.priceHtml,
        actionLabel: rawOpts.actionLabel || 'FECHAR',
        getActionLabel: rawOpts.getActionLabel,
        actionDisabled: rawOpts.actionDisabled,
        onAction:
          typeof rawOpts.onAction === 'function'
            ? rawOpts.onAction
            : () => ({ close: true }),
      }
    : {
        card: rawOpts,
        list: [rawOpts],
        index: 0,
        actionLabel: 'FECHAR',
        onAction: () => ({ close: true }),
      };

  const list = opts.list && opts.list.length > 0 ? opts.list : [opts.card];
  let idx = opts.index ?? list.indexOf(opts.card);
  if (idx < 0 || idx >= list.length) idx = 0;

  const overlay = document.createElement('div');
  overlay.id = 'card-viewer-overlay';
  overlay.style.cssText = 'position:fixed; inset:0; z-index:99999999; background:radial-gradient(circle at 50% 42%, rgba(30,24,16,0.88), rgba(0,0,0,0.94)); backdrop-filter:blur(10px); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:clamp(6px, 1.4dvh, 12px); padding:clamp(8px, 2dvh, 22px) 16px; box-sizing:border-box; overflow:hidden;';
  document.body.appendChild(overlay);

  const paint = () => {
    const curIdx = session ? session.idx : idx;
    const card = list[curIdx] || opts.card;
    const mock = toPreviewCard(card);
    const resolvedActionLabel = opts.getActionLabel ? opts.getActionLabel(card) : opts.actionLabel;
    overlay.innerHTML = `
      <style>
        #cv-card .premium-card-art { filter: brightness(1) contrast(1.05); }
        #cv-card .premium-card-container:hover .premium-card-art { filter: brightness(1.06) contrast(1.05); }
        #cv-card .premium-card-overlay { background: radial-gradient(circle at center, transparent 55%, rgba(0,0,0,0.32) 100%); }
      </style>
      <button id="cv-close" style="position:absolute; top:clamp(8px, 2dvh, 14px); right:clamp(10px, 2vw, 14px); width:clamp(32px, 6dvh, 40px); height:clamp(32px, 6dvh, 40px); border-radius:50%; border:2px solid rgba(255,255,255,0.3); background:rgba(0,0,0,0.6); color:#fff; font-size:0.95rem; font-weight:900; cursor:pointer; z-index:5;">✕</button>
      ${list.length > 1 ? `
      <button id="cv-prev" style="position:absolute; left:clamp(8px, 2vw, 18px); top:50%; transform:translateY(-50%); width:clamp(38px, 6.5dvh, 44px); height:clamp(50px, 10dvh, 64px); border-radius:12px; border:3px solid #0e0903; background:linear-gradient(180deg, #5a4128, #2a1c0d); color:#ffd76a; font-size:1.1rem; font-weight:900; cursor:pointer; z-index:5;">‹</button>
      <button id="cv-next" style="position:absolute; right:clamp(8px, 2vw, 18px); top:50%; transform:translateY(-50%); width:clamp(38px, 6.5dvh, 44px); height:clamp(50px, 10dvh, 64px); border-radius:12px; border:3px solid #0e0903; background:linear-gradient(180deg, #5a4128, #2a1c0d); color:#ffd76a; font-size:1.1rem; font-weight:900; cursor:pointer; z-index:5;">›</button>` : ''}
      <div id="cv-counter" style="font-size:clamp(0.54rem, 1.4dvh, 0.65rem); font-weight:900; letter-spacing:3px; color:rgba(255,255,255,0.6);">${list.length > 1 ? `${curIdx + 1} / ${list.length}` : ''}</div>
      <div id="cv-card" style="width:min(350px, 84vw, calc(70dvh * 680 / 990)); max-width:380px; max-height:70dvh; aspect-ratio:680/990; filter:drop-shadow(0 18px 50px rgba(0,0,0,0.8)) drop-shadow(0 0 26px rgba(255,215,0,0.18));">${renderMatrixCardSVG(mock, { mode: 'full', animateChroma: true })}</div>
      ${opts.priceHtml ? `<div id="cv-price" style="font-size:clamp(0.75rem, 2dvh, 0.9rem);">${opts.priceHtml}</div>` : ''}
      <button id="cv-action" style="min-width:clamp(180px, 32dvh, 220px); padding:clamp(8px, 1.8dvh, 13px) clamp(22px, 4vw, 34px); border-radius:14px; border:3px solid #0e1f00; background:linear-gradient(180deg, #b8f54d 0%, #7ed321 38%, #4a9b1f 78%, #2c620d 100%); color:#0f1f00; font-weight:950; font-size:clamp(0.68rem, 1.8dvh, 0.8rem); letter-spacing:2px; cursor:pointer; box-shadow:0 5px 0 rgba(0,0,0,0.5), 0 0 20px rgba(150,255,70,0.4), inset 0 2px 0 rgba(255,255,255,0.5);">${resolvedActionLabel}</button>
    `;

    const actBtn = overlay.querySelector('#cv-action') as HTMLButtonElement | null;
    // O renderer escurece a arte por padrão (brightness 0.9): neutraliza só o padrão,
    // mantendo filtros que a forja aplicou de propósito (vhs, chroma...)
    const artEl = overlay.querySelector('#cv-card .premium-card-art') as HTMLElement | null;
    if (artEl) {
      const f = artEl.style.filter || '';
      if (f.includes('brightness(0.9)')) artEl.style.filter = f.replace(/brightness\(0\.9\)/, 'brightness(1)');
    }
    if (actBtn && opts.actionDisabled) {
      actBtn.disabled = true;
      actBtn.style.opacity = '0.55';
      actBtn.style.cursor = 'default';
    }

    overlay.querySelector('#cv-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeCardViewer();
    });
    overlay.querySelector('#cv-prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      cardViewerNav(-1);
    });
    overlay.querySelector('#cv-next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      cardViewerNav(1);
    });
    actBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (actBtn.disabled) return;
      let res: ViewerActionResult | void;
      try {
        res = opts.onAction(list[curIdx] || opts.card);
      } catch (err) {
        console.error(err);
        return;
      }
      if (!res) return;
      if (typeof res.label === 'string') actBtn.textContent = res.label;
      if (res.disabled) {
        actBtn.disabled = true;
        actBtn.style.opacity = '0.55';
        actBtn.style.cursor = 'default';
      }
      if (res.close) closeCardViewer();
    });

    try {
      gsap.fromTo(overlay.querySelector('#cv-card'),
        { x: lastNavDir * 50, scale: 0.94, opacity: 0 },
        { x: 0, scale: 1, opacity: 1, duration: 0.28, ease: 'power2.out' });
    } catch {}
  };

  session = { overlay, list, idx, paint };
  paint();

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCardViewer();
  });

  // Gesto de Swipe Touch no Mobile para passar cartas pro lado
  let touchStartX = 0;
  let touchStartY = 0;
  overlay.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });
  overlay.addEventListener('touchend', (e) => {
    if (e.changedTouches && e.changedTouches[0]) {
      const diffX = e.changedTouches[0].clientX - touchStartX;
      const diffY = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX < 0) {
          cardViewerNav(1); // Swipe para a esquerda -> próxima carta
        } else {
          cardViewerNav(-1); // Swipe para a direita -> carta anterior
        }
      }
    }
  }, { passive: true });

  document.addEventListener('keydown', onViewerKey);

  try {
    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25 });
  } catch {}
}
