import { gsap } from 'gsap';
import { SoundManager } from '../utils/SoundManager';
import { t } from '../../core/i18n';

export interface SideActionDef {
  id: string;
  icon: string;
  label: string;
  side: 'left' | 'right';
  badge?: string;
  hasNotification?: boolean;
}

// Modulo isolado: botoes laterais do lobby. Cresce aqui sem medo —
// passe defs proprias no construtor e trate os ids no onAction.
export class SideActions {
  private actions: SideActionDef[];
  private onAction?: (id: string) => void;

  constructor(actions?: SideActionDef[], onAction?: (id: string) => void) {
    this.actions = actions || [
      { id: 'missoes', icon: '/icons/lobby/missoes.png', label: t('side.missoes'), side: 'left' },
      { id: 'correio', icon: '/icons/lobby/correio.png', label: t('side.correio'), side: 'left', hasNotification: true },
      { id: 'ranking', icon: '/icons/lobby/ranking.png', label: t('side.ranking'), side: 'left' },
      { id: 'wallet',  icon: '/icons/lobby/wallet.png',  label: t('side.wallet'),  side: 'left' },
      { id: 'forja',   icon: '/assets/aistudio/Bigorna_dourada_com_martelo-2_-_Copia_3ced0e91.png', label: t('side.forja'), side: 'left' },
      { id: 'eventos', icon: '/icons/lobby/eventos.png', label: t('side.eventos'), side: 'right' },
      { id: 'amigos',  icon: '/icons/lobby/amigos.png',  label: t('side.amigos'),  side: 'right' },
      { id: 'ajuda',   icon: '/icons/lobby/ajuda.png',   label: t('side.ajuda'),   side: 'right' },
      { id: 'mapa',    icon: '/assets/aistudio/Mapa_dobrado_com_marcador_dourado-6_-_Copia_ddac5081.png', label: t('side.mapa'), side: 'right' },
      { id: 'mobile',  icon: '/assets/aistudio/Celular_dourado_de_fantasia-3_-_Copia_8a9ea189.png', label: t('side.mobile'), side: 'right' }
    ];
    this.onAction = onAction;
  }

  public render(): string {
    const col = (side: 'left' | 'right') => `
      <div data-side="${side}" style="position:absolute; ${side}:10px; top:clamp(68px, 10dvh, 82px); display:flex; flex-direction:column; gap:clamp(5px, 0.9dvh, 8px); z-index:500;">
        ${this.actions.filter(a => a.side === side).map(a => `
          <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
            <button class="lobby-side-btn" data-action="${a.id}" style="width:clamp(44px, 6.2dvh, 54px); height:clamp(44px, 6.2dvh, 54px); background:transparent; border:none; outline:none; display:flex; align-items:center; justify-content:center; cursor:pointer; position:relative; padding:0; transition:transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1);">
              ${a.icon.includes('/') 
                ? `<img src="${a.icon}" alt="${a.label}" style="width:clamp(44px, 6.2dvh, 54px); height:clamp(44px, 6.2dvh, 54px); object-fit:contain; filter:drop-shadow(0 5px 10px rgba(0,0,0,0.85)); pointer-events:none;" />`
                : `<span style="font-size:1.85rem; filter:drop-shadow(0 4px 8px rgba(0,0,0,0.8)); pointer-events:none;">${a.icon}</span>`}
              ${a.hasNotification ? `<span class="lobby-notif-dot" style="position:absolute; top:2px; right:2px; width:12px; height:12px; border-radius:50%; background:radial-gradient(circle at 35% 35%, #ff4d4d 0%, #d60000 70%, #8a0000 100%); border:2px solid #ffffff; box-shadow:0 0 10px rgba(255, 30, 30, 0.95), 0 2px 4px rgba(0,0,0,0.8); pointer-events:none; z-index:502; animation:notifPulseDot 1.8s ease-in-out infinite;"></span>` : ''}
              ${a.badge ? `<span style="position:absolute; top:-2px; right:-2px; min-width:18px; height:18px; border-radius:10px; background:linear-gradient(180deg, #ff6b6b, #b30000); border:2px solid #0e0903; color:#fff; font-size:0.58rem; font-weight:900; display:flex; align-items:center; justify-content:center; padding:0 3px; box-sizing:border-box; pointer-events:none; box-shadow:0 2px 5px rgba(0,0,0,0.7);">${a.badge}</span>` : ''}
            </button>
            <span style="font-size:0.52rem; font-weight:900; letter-spacing:0.8px; color:#ffe9a8; text-shadow:-1px -1px 0 #2a1a00, 1px -1px 0 #2a1a00, -1px 1px 0 #2a1a00, 1px 1px 0 #2a1a00, 0 2px 0 rgba(0,0,0,0.7); white-space:nowrap; pointer-events:none;">${a.label}</span>
          </div>
        `).join('')}
      </div>
    `;
    return `
      ${col('left')}
      ${col('right')}
      <div class="lobby-side-toast" style="position:absolute; left:50%; bottom:90px; transform:translateX(-50%); background:linear-gradient(180deg, #4a351e, #241809); border:2px solid #0e0903; border-radius:12px; color:#ffe9a8; font-size:0.7rem; font-weight:900; letter-spacing:2px; padding:10px 22px; opacity:0; pointer-events:none; z-index:501; white-space:nowrap; box-shadow:0 4px 0 rgba(0,0,0,0.5);"></div>
    `;
  }

  public bind(root: HTMLElement) {
    const toast = root.querySelector('.lobby-side-toast') as HTMLElement | null;

    const showToast = (msg: string) => {
      if (!toast) return;
      toast.textContent = msg;
      gsap.killTweensOf(toast);
      gsap.fromTo(toast, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
      gsap.to(toast, { opacity: 0, y: 6, duration: 0.3, delay: 1.4 });
    };

    root.querySelectorAll('.lobby-side-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.action!;
        try { SoundManager.playAction('clique_geral', 0.5); } catch (e) { console.warn('Som indisponivel', e); }
        gsap.fromTo(btn, { scale: 0.88 }, { scale: 1, duration: 0.45, ease: 'elastic.out(1, 0.5)' });
        const def = this.actions.find(a => a.id === id);
        if (this.onAction) this.onAction(id);
        else showToast(`${def ? def.label : id} ${t('side.soon')}`);
      });
    });
  }
}
