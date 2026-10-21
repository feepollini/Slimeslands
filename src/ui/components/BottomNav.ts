import { gsap } from 'gsap';
import { SoundManager } from '../utils/SoundManager';
import { t } from '../../core/i18n';

export type TabId = 'battle' | 'arsenal' | 'store' | 'profile' | 'map' | 'academy' | 'settings';

export class BottomNav {
    private currentTab: TabId = 'battle';
    private onTabSwitch: (tab: TabId) => void;
    private onPrepConfirm: () => void;
    private isPrepMode: boolean = false;
    private academyHouse: 'blue' | 'yellow' | 'red' | 'black' = 'blue';

    constructor(onTabSwitch: (tab: TabId) => void, onPrepConfirm: () => void) {
        this.onTabSwitch = onTabSwitch;
        this.onPrepConfirm = onPrepConfirm;
    }

    public render(): string {
        return `
            <div class="menu-bottom-nav" style="position: absolute; bottom: 45px; left: 50%; transform: translateX(-50%); z-index: 1000; pointer-events: none; display: flex; align-items: center; justify-content: center;">
                <!-- BARRA RETRATO ORIGINAL -->
                <div class="nav-pill-container portrait-only-nav" id="nav-pill" style="display: flex; align-items: center; width: fit-content; height: 54px; padding: 6px; gap: 6px; border-radius: 26px; border: 3px solid #140d05; background: linear-gradient(180deg, #6b4e2e 0%, #4a351e 14%, #2c1f11 60%, #191007 100%); box-shadow: 0 6px 0 rgba(0,0,0,0.55), 0 14px 34px rgba(0,0,0,0.75), inset 0 2px 0 rgba(255,236,190,0.4), inset 0 -3px 0 rgba(0,0,0,0.55); pointer-events: auto; overflow: visible; white-space: nowrap;">
                    <div class="nav-pill-segment" data-tab="arsenal" style="display: flex; align-items: center; cursor: pointer; border-radius: 100px; height: 40px; width: 40px; min-width: 40px; overflow: hidden; transition: 0.3s; flex: 0 0 auto; position: relative;">
                        <div class="nav-fx-overlay" style="position: absolute; inset: 0; pointer-events: none; z-index: 10; border-radius: inherit; transition: 0.3s;"></div>
                        <div class="nav-icon-container" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span class="nav-icon" style="font-size: 1.15rem; opacity: 0.5;">🃏</span>
                        </div>
                        <span class="nav-label coc-side-label" style="font-size: 0.72rem; font-weight: 950; letter-spacing: 1.2px; color: #fff; padding-right: 16px; display: none; opacity: 0;">${t('nav.deck')}</span>
                    </div>
                    <div class="nav-pill-segment active" data-tab="battle" id="seg-battle" style="display: flex; align-items: center; cursor: pointer; border-radius: 100px; height: 40px; width: auto; min-width: 40px; overflow: visible; transition: 0.3s; flex: 0 0 auto; position: relative; align-self: center;">
                        <div class="nav-fx-overlay" style="position: absolute; inset: 0; pointer-events: none; z-index: 10; border-radius: inherit; transition: 0.3s;"></div>
                        
                        <!-- The Vertical Wheel Group -->
                        <div class="nav-wheel-group" style="position: absolute; left: 0; right: 0; top: 0; bottom: 0; pointer-events: none; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 20;">
                            <!-- Slot: Placeholder A -->
                            <div class="wheel-slot slot-extra-a" style="position: absolute; height: 40px; display: flex; align-items: center; justify-content: center; width: 100%; opacity: 0; transform: translateY(-50px) scale(0.85); transition: 0.3s; background: rgba(255,255,255,0.25); border-radius: 100px;">
                                 <span class="slot-icon" style="margin-right: 8px;">🗺️</span>
                                 <span class="slot-label" style="font-size: 0.72rem; font-weight: 950; letter-spacing: 1.2px; color: #000;">${t('nav.map')}</span>
                            </div>
                            <!-- Slot: Main Button (Center) -->
                            <div class="wheel-slot slot-main" style="position: absolute; height: 40px; display: flex; align-items: center; justify-content: center; width: 100%; opacity: 1; transform: translateY(0);">
                                <span class="slot-icon" style="margin-right: 8px; font-size: 1rem; filter: drop-shadow(0 2px 0 rgba(0,0,0,0.45));">⚔️</span>
                                <span class="slot-label" style="font-size: 0.72rem; font-weight: 950; letter-spacing: 1.2px; color: #0f1f00; text-shadow: 0 2px 0 rgba(255,255,255,0.25);">${t('nav.battle')}</span>
                            </div>
                            <!-- Slot: Placeholder B -->
                            <div class="wheel-slot slot-extra-b" style="position: absolute; height: 40px; display: flex; align-items: center; justify-content: center; width: 100%; opacity: 0; transform: translateY(50px) scale(0.85); transition: 0.3s; background: rgba(255,255,255,0.25); border-radius: 100px;">
                                <span class="slot-icon" style="margin-right: 8px;">🎓</span>
                                <span class="slot-label" style="font-size: 0.72rem; font-weight: 950; letter-spacing: 1.2px; color: #000;">${t('nav.academy')}</span>
                            </div>
                        </div>

                        <!-- Spacer to keep parent capsule width -->
                        <div class="nav-width-spacer" style="height: 40px; display: flex; align-items: center; padding: 0 16px 0 40px; opacity: 0; pointer-events: none;">
                            <span style="font-size: 0.72rem; font-weight: 950; letter-spacing: 1.2px;">${t('nav.start')}</span>
                        </div>
                    </div>
                    <div class="nav-pill-segment" data-tab="store" style="display: flex; align-items: center; cursor: pointer; border-radius: 100px; height: 40px; width: 40px; min-width: 40px; overflow: hidden; transition: 0.3s; flex: 0 0 auto; position: relative;">
                        <div class="nav-fx-overlay" style="position: absolute; inset: 0; pointer-events: none; z-index: 10; border-radius: inherit; transition: 0.3s;"></div>
                        <div class="nav-icon-container" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span class="nav-icon" style="font-size: 1.15rem; opacity: 0.5;">💎</span>
                        </div>
                        <span class="nav-label coc-side-label" style="font-size: 0.72rem; font-weight: 950; letter-spacing: 1.2px; color: #fff; padding-right: 16px; display: none; opacity: 0;">${t('nav.store')}</span>
                    </div>
                </div>

                <!-- BARRA PAISAGEM CENTRAL (ESTILO WILD RIFT / MOBILE LEGENDS — LADO A LADO COM TELA DESLIZANTE) -->
                <div class="landscape-only-nav" id="nav-pill-landscape" style="pointer-events: auto;">
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
                        <span class="ls-nav-icon">🎓</span>
                        <span class="ls-nav-text">${t('nav.academy')}</span>
                    </button>
                    <button class="ls-nav-item" data-ls-tab="store">
                        <span class="ls-nav-icon">💎</span>
                        <span class="ls-nav-text">${t('nav.store')}</span>
                    </button>
                </div>
            </div>
            <style>
                @keyframes aggressive-vhs {
                    0%, 70%, 82%, 92%, 100% { filter: none; opacity: 0; transform: translate(0) skew(0); }
                    71% { filter: contrast(3) saturate(2) hue-rotate(20deg) drop-shadow(5px 0 red); opacity: 0.7; transform: translate(4px, -2px) skewX(10deg); }
                    72% { filter: invert(0.2) sepia(1) hue-rotate(-90deg); opacity: 0.8; transform: translate(-6px, 2px) skewX(-15deg); }
                    73% { filter: none; opacity: 0; transform: translate(0); }
                    83% { filter: brightness(4) contrast(2) drop-shadow(-8px 0 cyan); opacity: 0.7; transform: scaleY(1.3) translateX(10px); }
                    85% { filter: none; opacity: 0; transform: translate(0); }
                    93% { filter: hue-rotate(180deg) saturate(5); opacity: 0.6; transform: skewX(25deg) translateX(-15px); }
                    95% { filter: none; opacity: 0; transform: translate(0); }
                }
                @keyframes glow-white-snappy {
                    0%, 20%, 50%, 80%, 100% { border-color: rgba(255,255,255,0.05); box-shadow: inset 0 0 0px rgba(255,255,255,0); opacity:0; }
                    25%, 55%, 85% { border-color: rgba(255,255,255,0.8); box-shadow: inset 0 0 20px rgba(255,255,255,0.5); opacity:0.8; }
                }
                .fx-glow-white {
                    animation: glow-white-snappy 4s infinite ease-in-out;
                    border: 2px solid rgba(255,255,255,0.5) !important;
                    mix-blend-mode: screen;
                }
                .fx-glow-red {
                    animation: glow-red-overlay 1.5s infinite ease-in-out;
                    border: 2px solid rgba(255,100,100,0.8) !important;
                    mix-blend-mode: screen;
                }
                .fx-vhs-overlay {
                    animation: aggressive-vhs 5s infinite;
                    mix-blend-mode: overlay;
                    z-index: 20;
                }
                /* --- Clash-style: pedra entalhada nos segmentos (sombra nao muda layout) --- */
                .nav-pill-segment {
                    box-shadow: inset 0 0 0 2px rgba(0,0,0,0.6), inset 0 3px 5px rgba(0,0,0,0.5), inset 0 -2px 0 rgba(255,240,200,0.12);
                }
                .nav-pill-segment.active {
                    box-shadow: inset 0 0 0 2px #f5b942, 0 0 14px rgba(245,185,66,0.55), inset 0 2px 0 rgba(255,255,255,0.3);
                }
                #seg-battle.active {
                    box-shadow: inset 0 0 0 3px #0e1f00, 0 5px 0 rgba(0,0,0,0.45), 0 0 18px rgba(150,255,70,0.5), inset 0 3px 0 rgba(255,255,255,0.5), inset 0 -5px 0 rgba(0,0,0,0.3);
                }
                .nav-icon, .slot-icon {
                    filter: drop-shadow(0 2px 0 rgba(0,0,0,0.55));
                }
                .coc-side-label {
                    color: #ffe9a8 !important;
                    text-shadow: -1px -1px 0 #4a2c00, 1px -1px 0 #4a2c00, -1px 1px 0 #4a2c00, 1px 1px 0 #4a2c00, 0 3px 0 rgba(0,0,0,0.6);
                }
                /* --- Gloss + shine varrendo o botao BATALHAR --- */
                .slot-main {
                    overflow: hidden;
                    border-radius: 100px;
                }
                .slot-main::before {
                    content: '';
                    position: absolute;
                    top: 2px;
                    left: 10px;
                    right: 10px;
                    height: 42%;
                    border-radius: 100px;
                    background: linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0));
                    pointer-events: none;
                }
                .slot-main::after {
                    content: '';
                    position: absolute;
                    top: -20%;
                    bottom: -20%;
                    left: 0;
                    width: 35%;
                    background: linear-gradient(100deg, transparent, rgba(255,255,255,0.65), transparent);
                    transform: translateX(-140%) skewX(-15deg);
                    animation: coc-shine 3.4s ease-in-out infinite;
                    pointer-events: none;
                }
                @keyframes coc-shine {
                    0%, 55% { transform: translateX(-140%) skewX(-15deg); }
                    90%, 100% { transform: translateX(340%) skewX(-15deg); }
                }
            </style>
        `;
    }

    public bind() {
        const pill = document.getElementById('nav-pill');
        if (!pill) return;
        
        const segments = pill.querySelectorAll('.nav-pill-segment');
        const segBattle = document.getElementById('seg-battle');

        let isDragging = false;
        let isSwapping = false;
        let startX = 0;
        let startY = 0;
        let longPressTimer: any;
        let wheelMapping: { top: TabId; bottom: TabId } = { top: 'map', bottom: 'academy' };

        const onStart = (x: number, y: number) => { 
            isDragging = true; 
            startX = x; 
            startY = y; 

            if (segBattle && segBattle.classList.contains('active')) {
                longPressTimer = setTimeout(() => {
                    if (isDragging && Math.abs(x - startX) < 15 && Math.abs(y - startY) < 15) {
                        isSwapping = true;
                        
                        // Calculate dynamic mapping based on current state
                        const centralTab: TabId = (this.currentTab === 'map' || this.currentTab === 'academy') ? this.currentTab : 'battle';
                        
                        if (centralTab === 'battle') {
                            wheelMapping = { top: 'map', bottom: 'academy' };
                        } else if (centralTab === 'map') {
                            wheelMapping = { top: 'academy', bottom: 'battle' };
                        } else if (centralTab === 'academy') {
                            wheelMapping = { top: 'battle', bottom: 'map' };
                        }

                        // Update slot content dynamically
                        const updateSlot = (selector: string, targetTab: TabId) => {
                            const slot = segBattle.querySelector(selector) as HTMLElement;
                            if (!slot) return;
                            const label = slot.querySelector('.slot-label') as HTMLElement;
                            const icon = slot.querySelector('.slot-icon') as HTMLElement;
                            if (targetTab === 'map') { label.textContent = t('nav.map'); icon.textContent = '🗺️'; }
                            else if (targetTab === 'academy') { label.textContent = t('nav.academy'); icon.textContent = '🎓'; }
                            else { label.textContent = t('nav.battle'); icon.textContent = '⚔️'; }
                        };

                        updateSlot('.slot-extra-a', wheelMapping.top);
                        updateSlot('.slot-extra-b', wheelMapping.bottom);

                        gsap.to('.wheel-slot', { opacity: 1, scale: 0.85, duration: 0.3 });
                        gsap.to('.slot-main', { opacity: 1, scale: 1.1, duration: 0.2 }); 
                        if (window.navigator.vibrate) window.navigator.vibrate(50);
                    }
                }, 500);
            }
        };

        const onMove = (x: number, y: number) => {
            if (!isDragging) return;
            const diffX = x - startX;
            const diffY = y - startY;

            if (isSwapping && segBattle) {
                const wheel = segBattle.querySelector('.nav-wheel-group') as HTMLElement;
                const overlay = segBattle.querySelector('.nav-fx-overlay') as HTMLElement;
                
                gsap.set(wheel, { y: diffY });
                gsap.set(overlay, { y: diffY });

                const slots = segBattle.querySelectorAll('.wheel-slot');
                slots.forEach((slot) => {
                    const hSlot = slot as HTMLElement;
                    const initialY = hSlot.classList.contains('slot-extra-a') ? -50 : (hSlot.classList.contains('slot-extra-b') ? 50 : 0);
                    const currentY = initialY + diffY;

                    if (Math.abs(currentY) < 25) {
                        gsap.to(hSlot, { opacity: 1, scale: 1.1, duration: 0.2 });
                    } else {
                        gsap.to(hSlot, { opacity: 0.6, scale: 0.85, duration: 0.2 });
                    }
                });
                return;
            }

            if (Math.abs(diffX) > 80 && Math.abs(diffX) > Math.abs(diffY)) {
                const tabs: TabId[] = ['arsenal', 'battle', 'store'];
                const cur = tabs.indexOf(this.currentTab === 'profile' ? 'battle' : this.currentTab);
                if (diffX > 0 && cur > 0) { this.onTabSwitch(tabs[cur - 1]); isDragging = false; }
                else if (diffX < 0 && cur < 2) { this.onTabSwitch(tabs[cur + 1]); isDragging = false; }
            }
            
            if (Math.abs(diffY) > 60 && Math.abs(diffY) > Math.abs(diffX) && !isSwapping) {
                if (this.currentTab === 'battle' || this.currentTab === 'profile') {
                    if (diffY > 0) {
                        if (this.isPrepMode) this.onTabSwitch('battle'); 
                        else if (this.currentTab === 'battle') this.onTabSwitch('profile');
                    } else {
                        if (this.currentTab === 'profile') this.onTabSwitch('battle');
                        else if (!this.isPrepMode) this.onTabSwitch('battle');
                    }
                    isDragging = false;
                }
            }
        };

        const onEnd = () => {
            clearTimeout(longPressTimer);
            if (isSwapping && segBattle) {
                const wheel = segBattle.querySelector('.nav-wheel-group') as HTMLElement;
                const overlay = segBattle.querySelector('.nav-fx-overlay') as HTMLElement;
                const yPos = gsap.getProperty(wheel, 'y') as number;
                
                if (yPos > 25) {
                    console.log('Top slot (Extra A) dragged into center ->', wheelMapping.top);
                    this.onTabSwitch(wheelMapping.top);
                } else if (yPos < -25) {
                    console.log('Bottom slot (Extra B) dragged into center ->', wheelMapping.bottom);
                    this.onTabSwitch(wheelMapping.bottom);
                }

                gsap.to([wheel, overlay], { y: 0, duration: 0.5, ease: 'elastic.out(1, 0.6)' });
                gsap.to('.wheel-slot:not(.active-slot)', { opacity: 0, duration: 0.3 });
            }
            isDragging = false;
            isSwapping = false;
            
            if (isSwapping) {
                SoundManager.playAction('clique_geral', 0.4);
            }
        };

        segments.forEach((seg) => {
            seg.addEventListener('click', (e) => {
                if (isSwapping) return;
                e.stopPropagation();
                const tab = (seg as HTMLElement).dataset.tab as TabId;
                if (tab === 'battle') {
                    if (this.currentTab !== 'battle') {
                        this.onTabSwitch('battle');
                    } else if (!this.isPrepMode) {
                        this.onTabSwitch('battle');
                    } else {
                        this.onPrepConfirm();
                    }
                } else if (tab === 'academy' && this.currentTab === 'academy') {
                    // Cycle Houses
                    const houses: ('blue' | 'yellow' | 'red' | 'black')[] = ['blue', 'yellow', 'red', 'black'];
                    const nextHouse = houses[(houses.indexOf(this.academyHouse) + 1) % houses.length];
                    this.academyHouse = nextHouse;
                    this.update(this.currentTab, this.isPrepMode);
                    if (window.navigator.vibrate) window.navigator.vibrate(20);
                } else {
                    SoundManager.playAction('clique_geral', 0.5);
                    this.onTabSwitch(tab);
                }
            });
        });

        pill.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
        pill.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
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

            // Horizontal drag/swipe on Landscape dock to slide side-by-side
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

        const displayTab = (tab === 'map' || tab === 'academy') ? 'battle' : tab;
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
        
        segments.forEach((seg) => {
            const hSeg = seg as HTMLElement;
            const isTabActive = hSeg.dataset.tab === displayTab;
            const isBattle = hSeg.dataset.tab === 'battle';
            
            if (isTabActive) {
                hSeg.classList.add('active');
                
                if (isBattle || tab === 'map' || tab === 'academy') {
                    const isMap = tab === 'map';
                    const isAcademy = tab === 'academy';
                    const slotMain = hSeg.querySelector('.slot-main') as HTMLElement;
                    const mainLabel = slotMain.querySelector('.slot-label') as HTMLElement;
                    const mainIcon = slotMain.querySelector('.slot-icon') as HTMLElement;

                    // Set label text and icon
                    if (isMap) {
                        mainLabel.textContent = t('nav.map');
                        mainIcon.textContent = '🗺️';
                    } else if (isAcademy) {
                        mainLabel.textContent = t('nav.academy');
                        mainIcon.textContent = '🎓';
                    } else {
                        mainLabel.textContent = isPrepMode ? t('nav.start') : t('nav.battle');
                        mainIcon.textContent = '⚔️';
                    }
                    
                    gsap.set('.wheel-slot', { opacity: 0, scale: 0.85 });
                    gsap.set(slotMain, { opacity: 1, scale: 1, y: 0 });
                    slotMain.classList.add('active-slot');

                    let battleColor = 'rgba(255, 255, 255, 0.12)';
                    let customBg = '';

                    if (tab === 'battle' && !isPrepMode) {
                        customBg = 'linear-gradient(180deg, #b8f54d 0%, #7ed321 38%, #4a9b1f 78%, #2c620d 100%)';
                    }
                    if (isPrepMode) battleColor = 'rgba(200, 30, 30, 0.9)';
                    
                    if (isMap) {
                        customBg = 'linear-gradient(90deg, #bfff00, #00ff88)';
                    }
                    
                    if (isAcademy) {
                        if (this.academyHouse === 'blue') battleColor = 'rgba(0, 100, 255, 0.6)';
                        else if (this.academyHouse === 'yellow') battleColor = 'rgba(255, 200, 0, 0.6)';
                        else if (this.academyHouse === 'red') battleColor = 'rgba(200, 30, 30, 0.6)';
                        else if (this.academyHouse === 'black') battleColor = 'rgba(0, 0, 0, 0.85)';
                    }

                    const tempLabel = document.createElement('span');
                    tempLabel.style.visibility = 'hidden';
                    tempLabel.style.fontSize = '0.72rem';
                    tempLabel.style.fontWeight = '950';
                    tempLabel.style.letterSpacing = '1.2px';
                    tempLabel.textContent = mainLabel.textContent;
                    document.body.appendChild(tempLabel);
                    const labelWidth = tempLabel.scrollWidth;
                    document.body.removeChild(tempLabel);

                    gsap.to(hSeg, { 
                        backgroundColor: customBg ? 'transparent' : battleColor, 
                        backgroundImage: customBg,
                        width: 60 + labelWidth, 
                        duration: 0.45, 
                        ease: 'expo.out' 
                    });
                } else {
                    const label = hSeg.querySelector('.nav-label') as HTMLElement;
                    const icon = hSeg.querySelector('.nav-icon') as HTMLElement;
                    if (label) gsap.to(label, { opacity: 1, duration: 0.3, display: 'block' });
                    if (icon) gsap.to(icon, { opacity: 1, duration: 0.3 });
                    gsap.to(hSeg, { backgroundColor: 'rgba(255, 190, 70, 0.28)', width: 100, duration: 0.45, ease: 'expo.out' });
                }
            } else {
                hSeg.classList.remove('active');
                gsap.to(hSeg, { backgroundColor: 'rgba(0, 0, 0, 0.42)', backgroundImage: 'none', width: 40, duration: 0.45, ease: 'expo.out' });
                if (isBattle) {
                    gsap.set('.wheel-slot', { opacity: 0 });
                    hSeg.querySelector('.slot-main')?.classList.remove('active-slot');
                } else {
                    const label = hSeg.querySelector('.nav-label') as HTMLElement;
                    const icon = hSeg.querySelector('.nav-icon') as HTMLElement;
                    if (label) gsap.to(label, { opacity: 0, duration: 0.2, onComplete: () => { label.style.display = 'none'; } });
                    if (icon) gsap.to(icon, { opacity: 0.4, duration: 0.3 });
                }
            }

            const fx = hSeg.querySelector('.nav-fx-overlay') as HTMLElement;
            if (isBattle && tab === 'battle') { // ONLY in real Lobby/Battle state
                if (!isPrepMode) {
                    if (fx) fx.classList.add('fx-vhs-overlay', 'fx-glow-white');
                } else {
                    if (fx) fx.classList.add('fx-glow-red');
                    if (fx) fx.classList.remove('fx-vhs-overlay');
                }
            } else {
                if (fx) fx.classList.remove('fx-vhs-overlay', 'fx-glow-white', 'fx-glow-red');
            }
        });
    }
}
