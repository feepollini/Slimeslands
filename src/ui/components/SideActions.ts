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

// Módulo isolado: botões de acesso rápido laterais do Hub (Vertical e Paisagem) — Nova UI v1.2 (Pearl & Gold + Royal Sapphire)
export class SideActions {
  private actions: SideActionDef[];
  private onAction?: (id: string) => boolean | void;

  constructor(actions?: SideActionDef[], onAction?: (id: string) => boolean | void) {
    this.actions = actions || [
      { id: 'inventario', icon: '/assets/hud/mochila.png', label: t('side.inventario'), side: 'left', hasNotification: true },
      { id: 'mapa',       icon: '/assets/aistudio/Mapa_dobrado_com_marcador_dourado-6_-_Copia_ddac5081.png', label: t('side.mapa'), side: 'left' },
      { id: 'missoes',    icon: '/icons/lobby/missoes.png', label: t('side.missoes'), side: 'left' },
      { id: 'correio',    icon: '/icons/lobby/correio.png', label: t('side.correio'), side: 'left' },
      { id: 'forja',      icon: '/assets/aistudio/Bigorna_dourada_com_martelo-2_-_Copia_3ced0e91.png', label: t('side.forja'), side: 'left' },
      { id: 'tarefas',    icon: '/icons/lobby/eventos.png', label: t('side.tarefas'), side: 'right', hasNotification: true },
      { id: 'ranking',    icon: '/icons/lobby/ranking.png', label: t('side.ranking'), side: 'right' },
      { id: 'amigos',     icon: '/icons/lobby/amigos.png',  label: t('side.amigos'),  side: 'right' },
      { id: 'wallet',     icon: '/icons/lobby/wallet.png',  label: t('side.wallet'),  side: 'right' },
      { id: 'ajuda',      icon: '/icons/lobby/ajuda.png',   label: t('side.ajuda'),   side: 'right' }
    ];
    this.onAction = onAction;
  }

  public render(): string {
    const col = (side: 'left' | 'right') => `
      <div data-side="${side}" class="nova-hub-side-dock" style="position:absolute; ${side}:8px; top:clamp(68px, 10.5dvh, 84px); display:flex; flex-direction:column; gap:clamp(5px, 0.9dvh, 8px); z-index:500; padding:6px 5px; border-radius:16px; background:linear-gradient(180deg, rgba(11, 47, 98, 0.62) 0%, rgba(4, 18, 42, 0.78) 100%); border:1.5px solid rgba(212, 175, 83, 0.52); box-shadow:0 8px 22px rgba(0, 8, 22, 0.65), inset 0 1px 1px rgba(255, 243, 194, 0.3); backdrop-filter:blur(8px);">
        ${this.actions.filter(a => a.side === side).map(a => `
          <div class="nova-side-action-item" style="display:flex; flex-direction:column; align-items:center; gap:2px;">
            <button class="lobby-side-btn nova-side-medallion" data-action="${a.id}" style="width:clamp(40px, 5.8dvh, 48px); height:clamp(40px, 5.8dvh, 48px); background:radial-gradient(circle at 50% 25%, rgba(252,250,245,0.94) 0%, rgba(235,225,206,0.92) 70%, rgba(216,200,171,0.95) 100%); border:1.5px solid #c59638; outline:1px solid #523707; border-radius:13px; display:flex; align-items:center; justify-content:center; cursor:pointer; position:relative; padding:0; box-shadow:0 4px 10px rgba(0,8,22,0.55), inset 0 1px 2px rgba(255,255,255,0.95); transition:transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease;">
              ${a.icon.includes('/') 
                ? `<img src="${a.icon}" alt="${a.label}" style="width:clamp(32px, 4.8dvh, 40px); height:clamp(32px, 4.8dvh, 40px); object-fit:contain; filter:drop-shadow(0 3px 5px rgba(0,0,0,0.45)); pointer-events:none;" />`
                : `<span style="font-size:1.5rem; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45)); pointer-events:none;">${a.icon}</span>`}
              ${a.hasNotification ? `<span class="lobby-notif-dot" style="position:absolute; top:-3px; right:-3px; width:11px; height:11px; border-radius:50%; background:radial-gradient(circle at 35% 35%, #ff4d4d 0%, #d60000 70%, #8a0000 100%); border:1.5px solid #fff3c2; box-shadow:0 0 8px rgba(255, 30, 30, 0.95), 0 2px 4px rgba(0,0,0,0.8); pointer-events:none; z-index:502;"></span>` : ''}
              ${a.badge ? `<span style="position:absolute; top:-4px; right:-4px; min-width:17px; height:17px; border-radius:999px; background:linear-gradient(180deg, #0b3778, #041f4a); border:1.5px solid #e5c168; color:#fff3c2; font-family:'Cinzel',serif; font-size:0.52rem; font-weight:900; display:flex; align-items:center; justify-content:center; padding:0 4px; box-sizing:border-box; pointer-events:none; box-shadow:0 2px 5px rgba(0,0,0,0.7);">${a.badge}</span>` : ''}
            </button>
            <span style="font-family:'Cinzel',serif; font-size:0.46rem; font-weight:900; letter-spacing:0.6px; color:#fff3c2; text-shadow:0 1px 3px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.8); white-space:nowrap; pointer-events:none;">${a.label}</span>
          </div>
        `).join('')}
      </div>
    `;
    return `
      ${col('left')}
      ${col('right')}
      <div class="lobby-side-toast" style="position:absolute; left:50%; bottom:94px; transform:translateX(-50%); background:linear-gradient(180deg, #0b3778 0%, #041f4a 100%); border:2px solid #e5c168; border-radius:999px; color:#fff3c2; font-family:'Cinzel',serif; font-size:0.68rem; font-weight:900; letter-spacing:1.8px; padding:8px 20px; opacity:0; pointer-events:none; z-index:501; white-space:nowrap; box-shadow:0 8px 24px rgba(0,8,22,0.85);"></div>
      <style>
        .nova-side-medallion:hover {
          transform: translateY(-2px) scale(1.05);
          border-color: #0b3778 !important;
          box-shadow: 0 6px 14px rgba(0,8,22,0.75), 0 0 12px rgba(229,193,104,0.55) !important;
        }
      </style>
    `;
  }

  public bind(root: HTMLElement) {
    const toast = root.querySelector('.lobby-side-toast') as HTMLElement | null;

    const showToast = (msg: string) => {
      if (!toast) return;
      toast.textContent = `❖ ${msg} ❖`;
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
        if (this.onAction) {
          const handled = this.onAction(id);
          if (handled === false) {
            showToast(`${def ? def.label : id} ${t('side.soon')}`);
          }
        } else {
          showToast(`${def ? def.label : id} ${t('side.soon')}`);
        }
      });
    });
  }
}
