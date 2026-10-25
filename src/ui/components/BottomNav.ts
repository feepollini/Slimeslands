import { gsap } from 'gsap';
import { SoundManager } from '../utils/SoundManager';
import { t } from '../../core/i18n';

export type TabId = 'battle' | 'arsenal' | 'store' | 'profile' | 'map' | 'academy' | 'settings';

export class BottomNav {
    private currentTab: TabId = 'battle';
    private onTabSwitch: (tab: TabId) => void;
    private onPrepConfirm: () => void;
    private isPrepMode: boolean = false;

    constructor(onTabSwitch: (tab: TabId) => void, onPrepConfirm: () => void) {
        this.onTabSwitch = onTabSwitch;
        this.onPrepConfirm = onPrepConfirm;
    }

    public render(): string {
        return `
            <div class="menu-bottom-nav nova-bottom-nav-host" style="position: absolute; bottom: 26px; left: 50%; transform: translateX(-50%); z-index: 1000; pointer-events: none; display: flex; align-items: center; justify-content: center; width: 100%; max-width: 430px; padding: 0 8px; box-sizing: border-box;">
                
                <!-- CÁPSULA DE NAVEGAÇÃO VERTICAL / MOBILE RETRATO (3 BOTÕES: DECK • CENTRO COM RODA VERTICAL [COMBATE/MAPA/MOCHILA] • LOJA) -->
                <div class="nav-pill-container portrait-only-nav nova-nav-capsule-portrait" id="nav-pill" style="display: flex; align-items: center; justify-content: center; width: fit-content; max-width: 100%; height: 58px; padding: 5px 8px; gap: 7px; border-radius: 999px; border: 2px solid #b58932; outline: 2.5px solid #e5c168; background: radial-gradient(circle at 50% 20%, #fcfaf5 0%, #f3ead8 60%, #e5d6b8 100%); box-shadow: 0 14px 34px rgba(0, 8, 22, 0.85), 0 0 0 4px #523707, 0 0 24px rgba(212, 168, 79, 0.35), inset 0 2px 3px rgba(255, 255, 255, 0.95); pointer-events: auto; overflow: visible; white-space: nowrap; position: relative;">
                    
                    <!-- Ornamento Superior Central (Crista de Diamante Dourado v1.2) -->
                    <div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%) rotate(45deg); width: 12px; height: 12px; background: linear-gradient(135deg, #fff3c2 0%, #c59638 65%, #7d5b19 100%); border: 1.5px solid #523707; box-shadow: 0 2px 5px rgba(0,0,0,0.55); pointer-events: none; z-index: 30;"></div>

                    <!-- 1. ACESSO ESQUERDO: DECK / ARSENAL -->
                    <div class="nav-pill-segment" data-tab="arsenal" style="display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 999px; height: 44px; width: 44px; min-width: 42px; overflow: hidden; transition: 0.3s; flex: 0 0 auto; position: relative;">
                        <div class="nav-fx-overlay" style="position: absolute; inset: 0; pointer-events: none; z-index: 10; border-radius: inherit; transition: 0.3s;"></div>
                        <div class="nav-icon-container" style="width: 38px; height: 44px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span class="nav-icon" style="font-size: 1.1rem;">🃏</span>
                        </div>
                        <span class="nav-label coc-side-label" style="font-family: 'Cinzel', serif; font-size: 0.64rem; font-weight: 900; letter-spacing: 0.9px; padding-right: 12px; display: none; opacity: 0;">${t('nav.deck')}</span>
                    </div>

                    <!-- 2. ACESSO CENTRAL: COMBATE / MAPA / MOCHILA (PRESSIONAR E ARRASTAR PARA CIMA/BAIXO) -->
                    <div class="nav-pill-segment active" data-tab="battle" id="seg-battle" style="display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 999px; height: 46px; width: auto; min-width: 46px; overflow: visible; transition: 0.3s; flex: 0 0 auto; position: relative; align-self: center; touch-action: none;">
                        <div class="nav-fx-overlay" style="position: absolute; inset: 0; pointer-events: none; z-index: 10; border-radius: inherit; transition: 0.3s;"></div>
                        
                        <!-- The Vertical Wheel Group (Pressionar e arrastar para cima/baixo revela Mapa & Mochila) -->
                        <div class="nav-wheel-group" style="position: absolute; left: 0; right: 0; top: 0; bottom: 0; pointer-events: none; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 20;">
                            <div class="wheel-slot slot-extra-a" style="position: absolute; height: 40px; display: flex; align-items: center; justify-content: center; width: 100%; min-width: 112px; padding: 0 12px; opacity: 0; transform: translateY(-52px) scale(0.85); background: linear-gradient(180deg, #fcfaf5 0%, #e5d8c0 100%); border: 2px solid #c59638; border-radius: 999px; box-shadow: 0 8px 18px rgba(0,0,0,0.75);">
                                 <span class="slot-icon" style="margin-right: 6px;">🗺️</span>
                                 <span class="slot-label" style="font-family: 'Cinzel', serif; font-size: 0.66rem; font-weight: 900; letter-spacing: 1px; color: #122030;">${t('nav.map')}</span>
                            </div>
                            <!-- Slot Principal Central -->
                            <div class="wheel-slot slot-main" style="position: absolute; height: 46px; display: flex; align-items: center; justify-content: center; width: 100%; opacity: 1; transform: translateY(0); padding: 0 12px; box-sizing: border-box;">
                                <span class="slot-icon" style="margin-right: 6px; font-size: 0.98rem; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.65));">⚔️</span>
                                <span class="slot-label" style="font-family: 'Cinzel', serif; font-size: 0.68rem; font-weight: 900; letter-spacing: 1.2px; color: #fff8e6; text-shadow: 0 2px 4px rgba(0,0,0,0.85);">${t('nav.battle')}</span>
                            </div>
                            <div class="wheel-slot slot-extra-b" style="position: absolute; height: 40px; display: flex; align-items: center; justify-content: center; width: 100%; min-width: 112px; padding: 0 12px; opacity: 0; transform: translateY(52px) scale(0.85); background: linear-gradient(180deg, #fcfaf5 0%, #e5d8c0 100%); border: 2px solid #c59638; border-radius: 999px; box-shadow: 0 8px 18px rgba(0,0,0,0.75);">
                                <span class="slot-icon" style="margin-right: 6px;">🎒</span>
                                <span class="slot-label" style="font-family: 'Cinzel', serif; font-size: 0.66rem; font-weight: 900; letter-spacing: 1px; color: #122030;">${t('nav.academy')}</span>
                            </div>
                        </div>

                        <div class="nav-width-spacer" style="height: 46px; display: flex; align-items: center; padding: 0 14px 0 36px; opacity: 0; pointer-events: none;">
                            <span style="font-family: 'Cinzel', serif; font-size: 0.68rem; font-weight: 900; letter-spacing: 1.2px;">${t('nav.start')}</span>
                        </div>
                    </div>

                    <!-- 3. ACESSO DIREITO: LOJA -->
                    <div class="nav-pill-segment" data-tab="store" style="display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 999px; height: 44px; width: 44px; min-width: 42px; overflow: hidden; transition: 0.3s; flex: 0 0 auto; position: relative;">
                        <div class="nav-fx-overlay" style="position: absolute; inset: 0; pointer-events: none; z-index: 10; border-radius: inherit; transition: 0.3s;"></div>
                        <div class="nav-icon-container" style="width: 38px; height: 44px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span class="nav-icon" style="font-size: 1.08rem;">💎</span>
                        </div>
                        <span class="nav-label coc-side-label" style="font-family: 'Cinzel', serif; font-size: 0.64rem; font-weight: 900; letter-spacing: 0.9px; padding-right: 12px; display: none; opacity: 0;">${t('nav.store')}</span>
                    </div>
                </div>

                <!-- CÁPSULA DE NAVEGAÇÃO PAISAGEM (NOVA UI v1.2 — PEARL & GOLD + ROYAL SAPPHIRE) -->
                <div class="landscape-only-nav nova-nav-capsule-landscape" id="nav-pill-landscape" style="pointer-events: auto;">
                    <button class="ls-nav-item" data-ls-tab="arsenal">
                        <span class="ls-nav-icon">🃏</span>
                        <span class="ls-nav-text">${t('nav.deck')}</span>
                    </button>
                    <button class="ls-nav-item" data-ls-tab="map">
                        <span class="ls-nav-icon">🗺️</span>
                        <span class="ls-nav-text">${t('nav.map')}</span>
                    </button>
                    <button class="ls-nav-item ls-nav-battle-center active" data-ls-tab="battle" id="ls-seg-battle">
                        <span class="ls-nav-icon">⚔️</span>
                        <span class="ls-nav-text" id="ls-battle-label">${t('nav.battle')}</span>
                    </button>
                    <button class="ls-nav-item" data-ls-tab="academy">
                        <span class="ls-nav-icon">🎒</span>
                        <span class="ls-nav-text">${t('nav.academy')}</span>
                    </button>
                    <button class="ls-nav-item" data-ls-tab="store">
                        <span class="ls-nav-icon">💎</span>
                        <span class="ls-nav-text">${t('nav.store')}</span>
                    </button>
                </div>
            </div>
            <style>
                @keyframes glow-white-snappy {
                    0%, 20%, 50%, 80%, 100% { border-color: rgba(255,243,194,0.1); box-shadow: inset 0 0 0px rgba(255,243,194,0); opacity:0; }
                    25%, 55%, 85% { border-color: rgba(255,243,194,0.8); box-shadow: inset 0 0 18px rgba(229,193,104,0.45); opacity:0.85; }
                }
                .fx-glow-white {
                    animation: glow-white-snappy 4s infinite ease-in-out;
                    border: 1.5px solid rgba(255,243,194,0.55) !important;
                    mix-blend-mode: screen;
                }
                .fx-glow-red {
                    border: 2px solid rgba(255,140,140,0.85) !important;
                    box-shadow: inset 0 0 16px rgba(239,68,68,0.55);
                }
                .nav-pill-segment {
                    border: 1.5px solid #cdb482;
                    background: linear-gradient(180deg, #faf5eb 0%, #eadec8 100%);
                    box-shadow: inset 0 1px 2px rgba(255,255,255,0.9), 0 2px 5px rgba(15,28,46,0.15);
                }
                .nav-pill-segment:hover {
                    border-color: #b58932;
                }
                .nav-pill-segment.active {
                    border: 2px solid #e5c168 !important;
                    box-shadow: 0 4px 12px rgba(0, 8, 22, 0.45), 0 0 14px rgba(212, 175, 83, 0.45), inset 0 1.5px 2px rgba(255, 255, 255, 0.35) !important;
                }
                #seg-battle.active {
                    border: 2px solid #fff3c2 !important;
                    box-shadow: 0 5px 14px rgba(0, 8, 22, 0.65), 0 0 18px rgba(212, 175, 83, 0.55), inset 0 2px 3px rgba(255, 255, 255, 0.45) !important;
                }
                .nav-icon, .slot-icon {
                    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));
                }
                .coc-side-label {
                    color: #fff8e6 !important;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.85);
                }
                .slot-main {
                    overflow: hidden;
                    border-radius: 999px;
                }
                .slot-main::before {
                    content: '';
                    position: absolute;
                    top: 2px;
                    left: 10px;
                    right: 10px;
                    height: 40%;
                    border-radius: 999px;
                    background: linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0));
                    pointer-events: none;
                }
                .slot-main::after {
                    content: '';
                    position: absolute;
                    top: -20%;
                    bottom: -20%;
                    left: 0;
                    width: 35%;
                    background: linear-gradient(100deg, transparent, rgba(255,243,194,0.42), transparent);
                    transform: translateX(-140%) skewX(-15deg);
                    animation: coc-shine 3.6s ease-in-out infinite;
                    pointer-events: none;
                }
                @keyframes coc-shine {
                    0%, 55% { transform: translateX(-140%) skewX(-15deg); }
                    90%, 100% { transform: translateX(340%) skewX(-15deg); }
                }
            </style>
        `;
    }

    private getWheelMappingForCurrentTab(): { top: TabId; bottom: TabId } {
        if (this.currentTab === 'map') {
            return { top: 'academy', bottom: 'battle' };
        }
        if (this.currentTab === 'academy') {
            return { top: 'battle', bottom: 'map' };
        }
        return { top: 'map', bottom: 'academy' };
    }

    private getLabelAndIconForTab(targetTab: TabId): { label: string; icon: string } {
        if (targetTab === 'map') return { label: t('nav.map'), icon: '🗺️' };
        if (targetTab === 'academy') return { label: t('nav.academy'), icon: '🎒' };
        return { label: this.isPrepMode ? t('nav.start') : t('nav.battle'), icon: '⚔️' };
    }

    public bind() {
        const pill = document.getElementById('nav-pill');
        if (!pill) return;
        
        const segments = pill.querySelectorAll('.nav-pill-segment');
        const segBattle = document.getElementById('seg-battle');

        let isDragging = false;
        let isSwapping = false;
        let startedOnBattle = false;
        let startX = 0;
        let startY = 0;
        let lastX = 0;
        let lastY = 0;
        let longPressTimer: any;
        let wheelMapping: { top: TabId; bottom: TabId } = { top: 'map', bottom: 'academy' };

        const activateWheelSwap = () => {
            if (isSwapping || !segBattle) return;
            isSwapping = true;
            wheelMapping = this.getWheelMappingForCurrentTab();

            const updateSlot = (selector: string, targetTab: TabId) => {
                const slot = segBattle.querySelector(selector) as HTMLElement;
                if (!slot) return;
                const label = slot.querySelector('.slot-label') as HTMLElement;
                const icon = slot.querySelector('.slot-icon') as HTMLElement;
                const info = this.getLabelAndIconForTab(targetTab);
                if (label) label.textContent = info.label;
                if (icon) icon.textContent = info.icon;
            };

            updateSlot('.slot-extra-a', wheelMapping.top);
            updateSlot('.slot-extra-b', wheelMapping.bottom);

            gsap.set('.slot-extra-a', { y: -52 });
            gsap.set('.slot-extra-b', { y: 52 });
            gsap.to('.wheel-slot', { opacity: 1, scale: 0.9, duration: 0.22 });
            gsap.to('.slot-main', { opacity: 1, scale: 1.05, duration: 0.2 });
            if (window.navigator.vibrate) window.navigator.vibrate(40);
        };

        const onStart = (x: number, y: number, targetEl?: EventTarget | null) => { 
            isDragging = true; 
            startX = x; 
            startY = y;
            lastX = x;
            lastY = y;
            startedOnBattle = Boolean(
                segBattle &&
                segBattle.classList.contains('active') &&
                (!targetEl || segBattle.contains(targetEl as Node))
            );

            clearTimeout(longPressTimer);
            if (startedOnBattle) {
                longPressTimer = setTimeout(() => {
                    if (isDragging && Math.abs(lastX - startX) < 18 && Math.abs(lastY - startY) < 18) {
                        activateWheelSwap();
                    }
                }, 240);
            }
        };

        const onMove = (x: number, y: number) => {
            if (!isDragging) return;
            lastX = x;
            lastY = y;
            const diffX = x - startX;
            const diffY = y - startY;

            // Se pressionou no botão central e arrastou verticalmente (ex: para cima), abre imediatamente a roda vertical!
            if (!isSwapping && startedOnBattle && Math.abs(diffY) > 12 && Math.abs(diffY) > Math.abs(diffX)) {
                clearTimeout(longPressTimer);
                activateWheelSwap();
            }

            if (isSwapping && segBattle) {
                const wheel = segBattle.querySelector('.nav-wheel-group') as HTMLElement;
                const overlay = segBattle.querySelector('.nav-fx-overlay') as HTMLElement;
                const slotA = segBattle.querySelector('.slot-extra-a') as HTMLElement | null;
                const slotB = segBattle.querySelector('.slot-extra-b') as HTMLElement | null;
                const slotMain = segBattle.querySelector('.slot-main') as HTMLElement | null;

                // Se o usuário arrastar mais para cima (diffY < -62), o slot-extra-a (Mapa) reposiciona para +104px
                // permitindo alcançar tanto Mochila (1 passo para cima) quanto Mapa (2 passos para cima) apenas arrastando para cima!
                const slotABaseY = diffY < -62 ? 104 : -52;
                if (slotA) gsap.set(slotA, { y: slotABaseY });
                if (slotB) gsap.set(slotB, { y: 52 });
                if (slotMain) gsap.set(slotMain, { y: 0 });

                const clampedY = Math.max(-116, Math.min(68, diffY));
                gsap.set(wheel, { y: clampedY });
                gsap.set(overlay, { y: Math.max(-40, Math.min(40, clampedY * 0.5)) });

                const slots: Array<{ el: HTMLElement | null; baseY: number }> = [
                    { el: slotA, baseY: slotABaseY },
                    { el: slotMain, baseY: 0 },
                    { el: slotB, baseY: 52 },
                ];
                slots.forEach(({ el, baseY }) => {
                    if (!el) return;
                    const currentY = baseY + clampedY;
                    if (Math.abs(currentY) < 25) {
                        gsap.to(el, { opacity: 1, scale: 1.06, duration: 0.16 });
                    } else {
                        gsap.to(el, { opacity: 0.72, scale: 0.86, duration: 0.16 });
                    }
                });
                return;
            }

            if (Math.abs(diffX) > 70 && Math.abs(diffX) > Math.abs(diffY)) {
                const centralActive: TabId = ['battle', 'map', 'academy'].includes(this.currentTab)
                    ? this.currentTab
                    : 'battle';
                const tabs: TabId[] = ['arsenal', centralActive, 'store'];
                const cur = tabs.indexOf(this.currentTab === 'profile' ? centralActive : this.currentTab);
                if (cur !== -1) {
                    if (diffX > 0 && cur > 0) { this.onTabSwitch(tabs[cur - 1]); isDragging = false; }
                    else if (diffX < 0 && cur < tabs.length - 1) { this.onTabSwitch(tabs[cur + 1]); isDragging = false; }
                }
            }
        };

        const onEnd = () => {
            clearTimeout(longPressTimer);
            if (isSwapping && segBattle) {
                const wheel = segBattle.querySelector('.nav-wheel-group') as HTMLElement;
                const overlay = segBattle.querySelector('.nav-fx-overlay') as HTMLElement;
                const yPos = Number(gsap.getProperty(wheel, 'y')) || 0;
                
                if (yPos > 22) {
                    SoundManager.playAction('clique_geral', 0.55);
                    this.onTabSwitch(wheelMapping.top);
                } else if (yPos < -62) {
                    SoundManager.playAction('clique_geral', 0.55);
                    this.onTabSwitch(wheelMapping.top);
                } else if (yPos < -22) {
                    SoundManager.playAction('clique_geral', 0.55);
                    this.onTabSwitch(wheelMapping.bottom);
                }

                gsap.to([wheel, overlay], { y: 0, duration: 0.45, ease: 'elastic.out(1, 0.6)' });
                gsap.set('.slot-extra-a', { y: -52 });
                gsap.set('.slot-extra-b', { y: 52 });
                gsap.to('.wheel-slot:not(.active-slot)', { opacity: 0, duration: 0.25 });
            }
            isDragging = false;
            isSwapping = false;
            startedOnBattle = false;
        };

        segments.forEach((seg) => {
            seg.addEventListener('click', (e) => {
                if (isSwapping) return;
                e.stopPropagation();
                const tab = (seg as HTMLElement).dataset.tab as TabId;
                if (tab === 'battle') {
                    if (this.currentTab !== 'battle') {
                        SoundManager.playAction('clique_geral', 0.5);
                        this.onTabSwitch('battle');
                    } else if (!this.isPrepMode) {
                        SoundManager.playAction('clique_geral', 0.55);
                        this.onTabSwitch('battle');
                    } else {
                        SoundManager.playAction('clique_geral', 0.6);
                        this.onPrepConfirm();
                    }
                } else {
                    SoundManager.playAction('clique_geral', 0.5);
                    this.onTabSwitch(tab);
                }
            });
        });

        pill.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY, e.target));
        pill.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX, e.touches[0].clientY, e.target), { passive: true });
        window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
        window.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchend', onEnd);

        // Bind Landscape 5-button side-by-side dock
        const lsPill = document.getElementById('nav-pill-landscape');
        if (lsPill) {
            const lsItems = lsPill.querySelectorAll('.ls-nav-item');
            lsItems.forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const tab = (btn as HTMLElement).dataset.lsTab as TabId;
                    if (tab === 'battle') {
                        if (this.currentTab !== 'battle') {
                            SoundManager.playAction('clique_geral', 0.5);
                            this.onTabSwitch('battle');
                        } else if (!this.isPrepMode) {
                            SoundManager.playAction('clique_geral', 0.6);
                            this.onTabSwitch('battle');
                        } else {
                            SoundManager.playAction('clique_geral', 0.6);
                            this.onPrepConfirm();
                        }
                    } else {
                        SoundManager.playAction('clique_geral', 0.5);
                        this.onTabSwitch(tab);
                    }
                });
            });

            let lsStartX = 0;
            let lsDragging = false;
            const lsTabsOrder: TabId[] = ['arsenal', 'map', 'battle', 'academy', 'store'];
            lsPill.addEventListener('mousedown', (e) => { lsStartX = e.clientX; lsDragging = true; });
            lsPill.addEventListener('touchstart', (e) => { lsStartX = e.touches[0].clientX; lsDragging = true; }, { passive: true });
            window.addEventListener('mousemove', (e) => {
                if (!lsDragging) return;
                const dx = e.clientX - lsStartX;
                if (Math.abs(dx) > 65) {
                    const idx = lsTabsOrder.indexOf(this.currentTab);
                    if (idx !== -1) {
                        if (dx < 0 && idx < lsTabsOrder.length - 1) {
                            this.onTabSwitch(lsTabsOrder[idx + 1]);
                            lsDragging = false;
                        } else if (dx > 0 && idx > 0) {
                            this.onTabSwitch(lsTabsOrder[idx - 1]);
                            lsDragging = false;
                        }
                    }
                }
            });
            window.addEventListener('mouseup', () => { lsDragging = false; });
            window.addEventListener('touchend', () => { lsDragging = false; });
        }
    }

    public update(tab: TabId, isPrepMode: boolean) {
        this.currentTab = tab;
        this.isPrepMode = isPrepMode;

        const segments = document.querySelectorAll('.nav-pill-segment');
        const pillContainer = document.getElementById('nav-pill');
        if (pillContainer) {
            pillContainer.style.display = tab === 'settings' ? 'none' : '';
        }

        // Atualiza barra horizontal 5 botões do Modo Paisagem
        const lsPill = document.getElementById('nav-pill-landscape');
        if (lsPill) {
            lsPill.style.display = tab === 'settings' ? 'none' : '';
            const lsBattleLabel = document.getElementById('ls-battle-label');
            if (lsBattleLabel) {
                lsBattleLabel.textContent = isPrepMode ? t('nav.start') : t('nav.battle');
            }
            lsPill.querySelectorAll('.ls-nav-item').forEach((el) => {
                const btn = el as HTMLElement;
                const isAct = btn.dataset.lsTab === tab || (isPrepMode && btn.dataset.lsTab === 'battle');
                btn.classList.toggle('active', isAct);
                if (btn.dataset.lsTab === 'battle') {
                    btn.classList.toggle('prep-mode', isPrepMode);
                }
            });
        }
        
        // Atualiza os 3 acessos no Modo Mobile / Retrato (Deck • Roda Central [Combate/Mapa/Mochila] • Loja)
        const isCentralTab = ['battle', 'map', 'academy', 'profile'].includes(tab);
        segments.forEach((seg) => {
            const hSeg = seg as HTMLElement;
            const segTab = hSeg.dataset.tab as TabId;
            const isBattle = segTab === 'battle';
            const isTabActive = segTab === tab || (isBattle && (isCentralTab || isPrepMode));
            
            if (isTabActive) {
                hSeg.classList.add('active');
                
                if (isBattle) {
                    const slotMain = hSeg.querySelector('.slot-main') as HTMLElement;
                    const mainLabel = slotMain.querySelector('.slot-label') as HTMLElement;
                    const mainIcon = slotMain.querySelector('.slot-icon') as HTMLElement;

                    const activeCenterInfo = isPrepMode
                        ? { label: t('nav.start'), icon: '⚔️' }
                        : tab === 'map'
                        ? { label: t('nav.map'), icon: '🗺️' }
                        : tab === 'academy'
                        ? { label: t('nav.academy'), icon: '🎒' }
                        : { label: t('nav.battle'), icon: '⚔️' };

                    mainLabel.textContent = activeCenterInfo.label;
                    mainIcon.textContent = activeCenterInfo.icon;
                    mainLabel.style.color = '#fff8e6';
                    
                    gsap.set('.wheel-slot', { opacity: 0, scale: 0.85 });
                    gsap.set(slotMain, { opacity: 1, scale: 1, y: 0 });
                    slotMain.classList.add('active-slot');

                    const customBg = isPrepMode
                        ? 'linear-gradient(180deg, #b91c1c 0%, #7f1d1d 55%, #450a0a 100%)'
                        : 'linear-gradient(180deg, #0b3778 0%, #041f4a 52%, #02122e 90%, #051b42 100%)';

                    const tempLabel = document.createElement('span');
                    tempLabel.style.visibility = 'hidden';
                    tempLabel.style.fontFamily = "'Cinzel', serif";
                    tempLabel.style.fontSize = '0.68rem';
                    tempLabel.style.fontWeight = '900';
                    tempLabel.style.letterSpacing = '1.2px';
                    tempLabel.textContent = mainLabel.textContent;
                    document.body.appendChild(tempLabel);
                    const labelWidth = tempLabel.scrollWidth;
                    document.body.removeChild(tempLabel);

                    gsap.to(hSeg, { 
                        backgroundColor: 'transparent', 
                        backgroundImage: customBg,
                        width: 54 + labelWidth, 
                        duration: 0.42, 
                        ease: 'expo.out' 
                    });
                } else {
                    const label = hSeg.querySelector('.nav-label') as HTMLElement;
                    const icon = hSeg.querySelector('.nav-icon') as HTMLElement;
                    if (label) gsap.to(label, { opacity: 1, duration: 0.25, display: 'block' });
                    if (icon) gsap.to(icon, { opacity: 1, duration: 0.25 });

                    const tempLabel = document.createElement('span');
                    tempLabel.style.visibility = 'hidden';
                    tempLabel.style.fontFamily = "'Cinzel', serif";
                    tempLabel.style.fontSize = '0.64rem';
                    tempLabel.style.fontWeight = '900';
                    tempLabel.style.letterSpacing = '0.9px';
                    tempLabel.textContent = label?.textContent || '';
                    document.body.appendChild(tempLabel);
                    const labelWidth = tempLabel.scrollWidth;
                    document.body.removeChild(tempLabel);

                    gsap.to(hSeg, {
                        backgroundColor: 'transparent',
                        backgroundImage: 'linear-gradient(180deg, #0b3778 0%, #041f4a 52%, #02122e 90%, #051b42 100%)',
                        width: 50 + labelWidth,
                        duration: 0.42,
                        ease: 'expo.out'
                    });
                }
            } else {
                hSeg.classList.remove('active');
                gsap.to(hSeg, {
                    backgroundColor: 'transparent',
                    backgroundImage: 'linear-gradient(180deg, #fbf7ef 0%, #f1e8d7 54%, #e3d5bc 92%, #ece0ca 100%)',
                    width: 44,
                    duration: 0.42,
                    ease: 'expo.out'
                });
                if (isBattle) {
                    const slotMain = hSeg.querySelector('.slot-main') as HTMLElement | null;
                    const mainLabel = slotMain?.querySelector('.slot-label') as HTMLElement | null;
                    const mainIcon = slotMain?.querySelector('.slot-icon') as HTMLElement | null;
                    if (mainLabel) mainLabel.textContent = '';
                    if (mainIcon) {
                        mainIcon.textContent = '⚔️';
                        mainIcon.style.marginRight = '0';
                    }
                    gsap.set('.wheel-slot', { opacity: 0 });
                    if (slotMain) gsap.set(slotMain, { opacity: 1, scale: 1, y: 0 });
                } else {
                    const label = hSeg.querySelector('.nav-label') as HTMLElement;
                    const icon = hSeg.querySelector('.nav-icon') as HTMLElement;
                    if (label) gsap.to(label, { opacity: 0, duration: 0.18, onComplete: () => { label.style.display = 'none'; } });
                    if (icon) gsap.to(icon, { opacity: 0.9, duration: 0.25 });
                }
            }

            if (isBattle) {
                const slotMain = hSeg.querySelector('.slot-main') as HTMLElement | null;
                const mainIcon = slotMain?.querySelector('.slot-icon') as HTMLElement | null;
                if (mainIcon && isTabActive) {
                    mainIcon.style.marginRight = '6px';
                }
            }

            const fx = hSeg.querySelector('.nav-fx-overlay') as HTMLElement;
            if (isBattle && isTabActive) {
                if (!isPrepMode) {
                    if (fx) fx.classList.add('fx-glow-white');
                } else {
                    if (fx) fx.classList.add('fx-glow-red');
                    if (fx) fx.classList.remove('fx-glow-white');
                }
            } else {
                if (fx) fx.classList.remove('fx-glow-white', 'fx-glow-red');
            }
        });
    }
}
