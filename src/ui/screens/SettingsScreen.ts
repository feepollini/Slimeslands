import { SoundManager } from '../utils/SoundManager';
import { t, getLang, setLang, getSkipIntro, setSkipIntro, LANGS, Lang } from '../../core/i18n';

// Forja/editor são ferramentas de desenvolvimento: visíveis só rodando local
// (localhost). No deploy (Vercel) os botões nem são renderizados.
function isLocalHost(): boolean {
    const h = window.location.hostname;
    return h === '' || h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

export class SettingsScreen {
    private onOpenForja: () => void;
    private onOpenForjaV2: () => void;
    private onBack?: () => void;

    constructor(onOpenForja: () => void, onOpenForjaV2: () => void, onBack?: () => void) {
        this.onOpenForja = onOpenForja;
        this.onOpenForjaV2 = onOpenForjaV2;
        this.onBack = onBack;
    }

    public render(container: HTMLElement) {
        const volSfx = SoundManager.sfxVolume * 100;
        const volAmbient = SoundManager.ambientVolume * 100;
        const showForgeAccess = isLocalHost();

        container.innerHTML = `
            <div class="settings-screen" style="height: 100%; width: 100%; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; box-sizing: border-box; background: rgba(0,0,0,0.3); backdrop-filter: blur(10px); animation: fadeIn 0.5s ease;">
                <div style="width: 100%; max-width: 400px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; position: relative;">
                    <button id="btn-settings-back" style="background: linear-gradient(180deg, #4a351e, #241809); border: 2px solid #0e0903; border-radius: 10px; color: #ffd76a; font-family: 'Cinzel', serif; font-size: 0.72rem; font-weight: 900; letter-spacing: 1.5px; padding: 7px 14px; cursor: pointer; display: flex; align-items: center; gap: 5px; box-shadow: 0 3px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,236,190,0.3); text-shadow: 0 1px 0 #000;">
                        ◀ ${t('bt.back')}
                    </button>
                    <h2 style="color: #fff; font-size: 1.3rem; font-weight: 950; letter-spacing: 3px; margin: 0; text-shadow: 0 0 20px rgba(255,255,255,0.3);">${t('set.title')}</h2>
                    <div style="width: 75px;"></div>
                </div>
                
                <div class="settings-list" style="width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 12px;">
                    
                    <!-- VOLUME SECTION -->
                    <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 25px; display: flex; flex-direction: column; gap: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                            <span style="font-size:1.2rem;">🔊</span>
                            <span style="color:#fff; font-weight:950; font-size:0.8rem; letter-spacing:2px; text-transform:uppercase;">${t('set.audio')}</span>
                        </div>

                        <!-- SFX -->
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="color:rgba(255,255,255,0.6); font-size:0.7rem; font-weight:700;">${t('set.sfx')}</span>
                                <span style="color:#fff; font-weight:950; font-size:0.75rem;" id="val-sfx">${Math.round(volSfx)}%</span>
                            </div>
                            <input type="range" id="slider-sfx" min="0" max="100" value="${volSfx}" class="premium-slider">
                        </div>

                        <!-- AMBIENT -->
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="color:rgba(255,255,255,0.6); font-size:0.7rem; font-weight:700;">${t('set.ambient')}</span>
                                <span style="color:#fff; font-weight:950; font-size:0.75rem;" id="val-ambient">${Math.round(volAmbient)}%</span>
                            </div>
                            <input type="range" id="slider-ambient" min="0" max="100" value="${volAmbient}" class="premium-slider">
                        </div>
                    </div>

                    <div style="height:10px;"></div>

                    <!-- FORJA ACCESS (só no servidor local) -->
                    ${showForgeAccess ? `
                    <div id="btn-open-forja" class="settings-item" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 15px; padding: 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: 0.3s; transform: scale(1);">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <span style="font-size: 1.5rem;">⚒️</span>
                            <div style="display: flex; flex-direction: column;">
                                <span style="color: #fff; font-weight: 950; font-size: 0.9rem; letter-spacing: 1px;">FORJA</span>
                                <span style="color: rgba(255,255,255,0.5); font-size: 0.7rem;">${t('set.forgeDesc')}</span>
                            </div>
                        </div>
                        <span style="color: rgba(255,255,255,0.3);">▶</span>
                    </div>

                    <!-- FORJA V2 ACCESS -->
                    <div id="btn-open-forja-v2" class="settings-item" style="background: rgba(81,197,255,0.05); border: 1px solid rgba(81,197,255,0.2); border-radius: 15px; padding: 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: 0.3s; transform: scale(1);">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <span style="font-size: 1.5rem;">🚀</span>
                            <div style="display: flex; flex-direction: column;">
                                <span style="color: #51c5ff; font-weight: 950; font-size: 0.9rem; letter-spacing: 1px;">FORJA V2 [BETA]</span>
                                <span style="color: rgba(255,255,255,0.5); font-size: 0.7rem;">${t('set.forgeV2Desc')}</span>
                            </div>
                        </div>
                        <span style="color: rgba(255,255,255,0.3);">▶</span>
                    </div>
                    ` : ''}

                    <!-- SKIP INTRO -->
                    <div id="btn-skip-intro" class="settings-item" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 15px; padding: 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <span style="font-size: 1.5rem;">⏩</span>
                            <div style="display: flex; flex-direction: column;">
                                <span style="color: #fff; font-weight: 950; font-size: 0.9rem; letter-spacing: 1px;">${t('set.skip')}</span>
                                <span id="skip-intro-state" style="color: rgba(255,255,255,0.5); font-size: 0.7rem;">${getSkipIntro() ? t('set.skipOn') : t('set.skipOff')}</span>
                            </div>
                        </div>
                        <div id="skip-intro-pill" style="width:54px; height:30px; border-radius:15px; flex-shrink:0; display:flex; align-items:center; padding:3px; box-sizing:border-box; transition:0.2s; ${getSkipIntro() ? 'background:rgba(76,255,136,0.35); border:2px solid #4cff88; justify-content:flex-end;' : 'background:rgba(255,255,255,0.08); border:2px solid rgba(255,255,255,0.2); justify-content:flex-start;'}">
                            <div style="width:20px; height:20px; border-radius:50%; background:#fff; box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>
                        </div>
                    </div>

                    <!-- LANGUAGE -->
                    <div class="settings-item" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 15px; padding: 20px;">
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom:12px;">
                            <span style="font-size: 1.5rem;">🌐</span>
                            <span style="color: #fff; font-weight: 950; font-size: 0.9rem; letter-spacing: 1px;">${t('set.lang')}</span>
                        </div>
                        <div style="display:flex; gap:8px;">
                            ${LANGS.map(l => {
                              const active = getLang() === l.id;
                              const flag = l.id === 'pt' ? '🇧🇷' : (l.id === 'en' ? '🇺🇸' : '🇪🇸');
                              return `
                              <button class="lang-opt" data-lang="${l.id}" style="flex:1; padding:10px 6px; border-radius:12px; cursor:pointer; font-weight:900; font-size:0.65rem; letter-spacing:1px; display:flex; flex-direction:column; align-items:center; gap:5px; font-family:inherit;
                                background:${active ? 'linear-gradient(180deg, rgba(212,175,55,0.28), rgba(212,175,55,0.08))' : 'rgba(255,255,255,0.04)'};
                                border:2px solid ${active ? '#d4af37' : 'rgba(255,255,255,0.12)'};
                                color:${active ? '#ffd76a' : 'rgba(255,255,255,0.6)'};
                                box-shadow:${active ? '0 0 16px rgba(212,175,55,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none'};">
                                <span style="font-size:1.5rem; line-height:1; filter:drop-shadow(0 2px 2px rgba(0,0,0,0.6));">${flag}</span>
                                <span>${t(l.labelKey)}</span>
                              </button>`;
                            }).join('')}
                        </div>
                    </div>

                </div>

                <div style="margin-top: auto; color: rgba(255,255,255,0.2); font-size: 0.6rem; letter-spacing: 2px; font-weight: 900;">LEGENDS OF WINTER v0.1.0</div>
            </div>

            <style>
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                .settings-item:hover:not(.disabled) {
                    background: rgba(255,255,255,0.1) !important;
                    border-color: rgba(255,255,255,0.3) !important;
                    transform: translateY(-2px) !important;
                }
                .settings-item:active:not(.disabled) {
                    transform: scale(0.98) !important;
                }

                .premium-slider {
                    -webkit-appearance: none;
                    width: 100%;
                    height: 6px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 5px;
                    outline: none;
                }
                .premium-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 18px;
                    height: 18px;
                    background: #fff;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(255,255,255,0.5);
                    transition: 0.2s;
                }
                .premium-slider::-webkit-slider-thumb:hover {
                    box-shadow: 0 0 20px rgba(255,255,255,0.8);
                    transform: scale(1.1);
                }
            </style>
        `;
        this.bind();
    }

    private bind() {
        const sliderSfx = document.getElementById('slider-sfx') as HTMLInputElement;
        const sliderAmbient = document.getElementById('slider-ambient') as HTMLInputElement;
        const valSfx = document.getElementById('val-sfx');
        const valAmbient = document.getElementById('val-ambient');

        const updateVolumes = () => {
            const sfx = parseInt(sliderSfx.value) / 100;
            const ambient = parseInt(sliderAmbient.value) / 100;
            SoundManager.setVolume(sfx, ambient);
            if (valSfx) valSfx.textContent = `${sliderSfx.value}%`;
            if (valAmbient) valAmbient.textContent = `${sliderAmbient.value}%`;
        };

        sliderSfx?.addEventListener('input', updateVolumes);
        sliderAmbient?.addEventListener('input', updateVolumes);
        
        document.getElementById('btn-settings-back')?.addEventListener('click', () => {
            SoundManager.playAction('clique_geral', 0.5);
            this.onBack?.();
        });

        // Play small sound when released to confirm feedback
        sliderSfx?.addEventListener('change', () => SoundManager.playAction('clique_geral', 0.5));

        document.getElementById('btn-open-forja')?.addEventListener('click', () => {
            SoundManager.playAction('clique_geral', 0.6);
            this.onOpenForja();
        });

        document.getElementById('btn-open-forja-v2')?.addEventListener('click', () => {
            SoundManager.playAction('clique_geral', 0.6);
            this.onOpenForjaV2();
        });

        document.querySelectorAll('.lang-opt').forEach((btn: Element) => {
            btn.addEventListener('click', () => {
                SoundManager.playAction('clique_geral', 0.5);
                setLang((btn as HTMLElement).dataset.lang as Lang);
                window.location.href = 'hub.html';
            });
        });

        const paintSkip = () => {
            const on = getSkipIntro();
            const st = document.getElementById('skip-intro-state');
            const pill = document.getElementById('skip-intro-pill') as HTMLElement | null;
            if (st) st.textContent = on ? t('set.skipOn') : t('set.skipOff');
            if (pill) {
                pill.style.background = on ? 'rgba(76,255,136,0.35)' : 'rgba(255,255,255,0.08)';
                pill.style.borderColor = on ? '#4cff88' : 'rgba(255,255,255,0.2)';
                pill.style.justifyContent = on ? 'flex-end' : 'flex-start';
            }
        };
        document.getElementById('btn-skip-intro')?.addEventListener('click', () => {
            SoundManager.playAction('clique_geral', 0.5);
            setSkipIntro(!getSkipIntro());
            paintSkip();
        });
    }
}
