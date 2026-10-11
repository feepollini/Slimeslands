import { SoundManager } from '../utils/SoundManager';
import { t } from '../../core/i18n';

export class ProfileScreen {
    private onOpenSettings?: () => void;

    constructor(onOpenSettings?: () => void) {
        this.onOpenSettings = onOpenSettings;
    }

    public render(container: HTMLElement) {
        container.innerHTML = `
            <div class="profile-screen" style="height: 100%; width: 100%; display: flex; flex-direction: column; align-items: center; color: #ffe9a8; padding: 45px 20px 40px; box-sizing: border-box; overflow-y: auto; position: relative; background: radial-gradient(circle at 50% 18%, rgba(212,175,55,0.10) 0%, transparent 55%), radial-gradient(circle at center, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.72) 100%); backdrop-filter: blur(14px) saturate(1.15); -webkit-backdrop-filter: blur(14px) saturate(1.15);">
                
                <!-- BOTÃO CONFIGURAÇÃO (CANTO SUPERIOR DIREITO) -->
                <div style="position: absolute; top: 22px; right: 22px; z-index: 100;">
                    <button id="btn-prof-settings" class="prof-settings-icon-btn" style="width: 42px; height: 42px; border: 3px solid #0e0903; background: linear-gradient(180deg, #5a4128, #2a1c0d); color: #ffd76a; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; cursor: pointer; box-shadow: 0 4px 0 rgba(0,0,0,0.55), inset 0 2px 0 rgba(255,236,190,0.35); text-shadow: 0 2px 0 rgba(0,0,0,0.6);" title="${t('set.title')}">
                        ⚙️
                    </button>
                </div>

                <!-- AVATAR & BASIC INFO -->
                <div class="prof-header" style="display: flex; flex-direction: column; align-items: center; margin-bottom: 34px; width: 100%;">
                    <div class="prof-avatar-large" style="width: 120px; height: 120px; border-radius: 50%; background: url('/cards/1.jpg') center/cover; border: 4px solid #3a2a12; outline: 2px solid #d4af37; box-shadow: 0 5px 0 rgba(0,0,0,0.6), 0 0 32px rgba(212,175,55,0.45), inset 0 3px 8px rgba(255,236,190,0.3); margin-bottom: 20px;"></div>
                    <h2 style="font-size: 1.5rem; font-weight: 950; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 8px 0; color: #ffd76a; text-shadow: -1px -1px 0 #2a1a00, 1px -1px 0 #2a1a00, -1px 1px 0 #2a1a00, 1px 1px 0 #2a1a00, 0 3px 0 rgba(0,0,0,0.6);">${t('header.name')}</h2>
                    <div style="font-size: 0.7rem; color: #ffe9a8; font-weight: 900; letter-spacing: 2px; background: linear-gradient(180deg, #5a4128, #2a1c0d); border: 2px solid #0e0903; border-radius: 9px; padding: 3px 12px; box-shadow: inset 0 1px 0 rgba(255,236,190,0.4), 0 2px 0 rgba(0,0,0,0.5); text-shadow: 0 1px 0 #000;">${t('profile.level')} 1</div>
                </div>

                <!-- XP BAR -->
                <div class="prof-xp-section" style="width: 100%; max-width: 320px; background: linear-gradient(180deg, rgba(58,42,21,0.92), rgba(20,13,6,0.92)); padding: 18px; border-radius: 16px; border: 3px solid #0e0903; margin-bottom: 26px; box-sizing: border-box; box-shadow: 0 5px 0 rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,236,190,0.2);">
                    <div style="display: flex; justify-content: space-between; font-size: 0.7rem; font-weight: 900; margin-bottom: 10px; letter-spacing: 1px; color: #ffd76a; text-shadow: 0 1px 0 #000;">
                        <span>${t('profile.exp')}</span>
                        <span>50 / 100 XP</span>
                    </div>
                    <div style="width: 100%; height: 14px; background: rgba(0,0,0,0.6); border-radius: 10px; overflow: hidden; border: 2px solid #0e0903; box-shadow: inset 0 2px 5px rgba(0,0,0,0.8); position: relative;">
                        <div style="width: 50%; height: 100%; background: linear-gradient(180deg, #8fffb0 0%, #00ff88 45%, #00b35c 100%); box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);"></div>
                        <div style="position: absolute; top: 1px; left: 3px; right: 3px; height: 38%; border-radius: 6px; background: linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0)); pointer-events: none;"></div>
                    </div>
                </div>

                <!-- STATS GRID -->
                <div class="prof-stats-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; width: 100%; max-width: 320px; margin-bottom: 26px;">
                    <div style="background: linear-gradient(180deg, rgba(58,42,21,0.9), rgba(20,13,6,0.9)); padding: 15px 10px; border-radius: 14px; border: 3px solid #0e0903; text-align: center; box-shadow: 0 4px 0 rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,236,190,0.2);">
                        <div style="font-size: 1.3rem; font-weight: 950; color: #ffe9a8; text-shadow: 0 2px 0 #000;">12</div>
                        <div style="font-size: 0.55rem; color: #d4af37; font-weight: 900; letter-spacing: 1px; margin-top: 4px;">${t('profile.wins')}</div>
                    </div>
                    <div style="background: linear-gradient(180deg, rgba(58,42,21,0.9), rgba(20,13,6,0.9)); padding: 15px 10px; border-radius: 14px; border: 3px solid #0e0903; text-align: center; box-shadow: 0 4px 0 rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,236,190,0.2);">
                        <div style="font-size: 1.3rem; font-weight: 950; color: #ffe9a8; text-shadow: 0 2px 0 #000;">4</div>
                        <div style="font-size: 0.55rem; color: #d4af37; font-weight: 900; letter-spacing: 1px; margin-top: 4px;">${t('profile.losses')}</div>
                    </div>
                    <div style="background: linear-gradient(180deg, rgba(58,42,21,0.9), rgba(20,13,6,0.9)); padding: 15px 10px; border-radius: 14px; border: 3px solid #0e0903; text-align: center; box-shadow: 0 4px 0 rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,236,190,0.2);">
                        <div style="font-size: 1.3rem; font-weight: 950; color: #ffe9a8; text-shadow: 0 2px 0 #000;">884</div>
                        <div style="font-size: 0.55rem; color: #d4af37; font-weight: 900; letter-spacing: 1px; margin-top: 4px;">${t('profile.cards')}</div>
                    </div>
                    <div style="background: linear-gradient(180deg, rgba(58,42,21,0.9), rgba(20,13,6,0.9)); padding: 15px 10px; border-radius: 14px; border: 3px solid #0e0903; text-align: center; box-shadow: 0 4px 0 rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,236,190,0.2);">
                        <div style="font-size: 1.3rem; font-weight: 950; color: #ffe9a8; text-shadow: 0 2px 0 #000;">24</div>
                        <div style="font-size: 0.55rem; color: #d4af37; font-weight: 900; letter-spacing: 1px; margin-top: 4px;">SKILLS</div>
                    </div>
                </div>

                <!-- ACTIONS BUTTONS (CONQUISTAS E CONFIGURAÇÕES) -->
                <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 320px; margin-bottom: 20px;">
                    <button id="btn-achievements" class="prof-ach-btn" style="width: 100%; padding: 14px; border-radius: 14px; background: linear-gradient(180deg, #ffe27a, #d4af37 60%, #9a7414); border: 3px solid #0e0903; color: #3a2200; font-weight: 950; font-size: 0.8rem; cursor: pointer; letter-spacing: 2px; text-shadow: 0 1px 0 rgba(255,255,255,0.35); box-shadow: 0 5px 0 rgba(0,0,0,0.5), 0 0 18px rgba(212,175,55,0.35), inset 0 2px 0 rgba(255,255,255,0.5);">
                        🏆 ${t('profile.trophies')}
                    </button>
                    
                    <button id="btn-prof-settings-row" class="prof-settings-row-btn" style="width: 100%; padding: 14px; border-radius: 14px; background: linear-gradient(180deg, #4a3622, #26190a); border: 3px solid #0e0903; color: #ffd76a; font-weight: 950; font-size: 0.8rem; cursor: pointer; letter-spacing: 2px; text-shadow: 0 1px 0 rgba(0,0,0,0.8); box-shadow: 0 5px 0 rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,236,190,0.25); display: flex; align-items: center; justify-content: center; gap: 8px;">
                        ⚙️ ${t('set.title')}
                    </button>
                </div>

            </div>
            <style>
                .prof-ach-btn, .prof-settings-row-btn, .prof-settings-icon-btn { transition: transform 0.12s ease, filter 0.12s ease; }
                .prof-ach-btn:hover, .prof-settings-row-btn:hover, .prof-settings-icon-btn:hover { filter: brightness(1.12); }
                .prof-ach-btn:active, .prof-settings-row-btn:active, .prof-settings-icon-btn:active { transform: translateY(3px); }
            </style>
        `;
        this.bind();
    }

    private bind() {
        document.getElementById('btn-achievements')?.addEventListener('click', () => {
            SoundManager.playAction('clique_geral', 0.5);
        });

        const handleSettings = () => {
            SoundManager.playAction('clique_configuracoes');
            this.onOpenSettings?.();
        };

        document.getElementById('btn-prof-settings')?.addEventListener('click', handleSettings);
        document.getElementById('btn-prof-settings-row')?.addEventListener('click', handleSettings);
    }
}
