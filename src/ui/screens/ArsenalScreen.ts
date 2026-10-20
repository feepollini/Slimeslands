
import '../styles/Arsenal.css';
import { Skill } from '../../core/GameEngine';
import { gsap } from 'gsap';
import { bindLongPress } from '../utils/InputUtils';
import { SoundManager } from '../utils/SoundManager';
import { thumbFor } from '../utils/thumb';
import { openCardViewer, cardViewerNav, isCardViewerOpen } from '../components/CardViewer';
import {
    renderMatrixCardSVG,
    renderMatrixCardBackSVG,
    getMergedGameTemplatesSync,
    getMergedGameTemplates,
    resolveMatrixOrGameCard,
} from './forge_v2/utils/HestridiaMatrixRenderer';
import { t as i18nT, tx as i18nTx } from '../../core/i18n';

export class ArsenalScreen {
    private templates: any[];
    private artifacts: Skill[];
    private boards: string[];

    private activeTab: 'cards' | 'artifacts' | 'boards' = 'cards';
    private gridSize: 2 | 3 | 4 = 3;
    private searchQuery: string = '';
    private rarityFilter: 'all' | 'common' | 'rare' | 'epic' | 'legendary' = 'all';
    private favorites: string[] = [];
    private isStacked: boolean = false;

    // Pre-Deck State
    private preDeckCards: (any | null)[] = [null, null, null, null, null, null, null, null, null, null, null, null];
    private preDeckArtifacts: (Skill | null)[] = [null, null, null];
    private selectedBoard: string = '';

    // Viewer state
    private viewerList: any[] = [];

    // Loadouts & UI State
    private currentSlot: number = 1;
    private suppressThumbClickUntil: number = 0;
    private isPreDeckCollapsed: boolean = false;
    private collapsedSections: Set<string> = new Set();
    private showConfirmSwitch: boolean = false;
    private targetSlot: number = 1;

    private onConfirm?: (cards: any[], artifacts: Skill[], board: string) => void;

    constructor(
        templates: any[], 
        artifacts: Skill[], 
        boards: string[], 
        onConfirm?: (cards: any[], artifacts: Skill[], board: string) => void,
        isPrepMode: boolean = false
    ) {
        this.templates = getMergedGameTemplatesSync(templates);
        this.artifacts = artifacts;
        this.boards = boards;
        this.onConfirm = onConfirm;
        this.isPreDeckCollapsed = !isPrepMode;

        // Load Persistence
        const favs = localStorage.getItem('arsenal_favorites');
        if (favs) this.favorites = JSON.parse(favs);

        const savedStacked = localStorage.getItem('arsenal_stack_copies');
        if (savedStacked !== null) {
            try { this.isStacked = JSON.parse(savedStacked); } catch {}
        }

        try {
            const collapsed = JSON.parse(localStorage.getItem('arsenal_collapsed_sections') || '[]');
            this.collapsedSections = new Set(collapsed);
        } catch {}

        const lastSlot = localStorage.getItem('arsenal_current_slot');
        if (lastSlot) this.currentSlot = parseInt(lastSlot);

        this.loadSlotData(this.currentSlot);

        window.addEventListener('keydown', this.handleGlobalKeys.bind(this));
        window.addEventListener('hestridia:matrix-updated', () => {
            this.templates = getMergedGameTemplatesSync(templates);
            this.loadSlotData(this.currentSlot);
        });
    }

    private renderPreDeck(): string {
        return `
            <div class="ars-predeck-panel ${this.isPreDeckCollapsed ? 'collapsed' : ''}">
                <div class="ars-predeck-header">
                    <div class="ars-collapse-toggle" id="ars-collapse-btn">
                        <span class="ars-collapse-icon">${this.isPreDeckCollapsed ? '▶' : '▼'}</span>
                        <span class="ars-collapse-text">${this.isPreDeckCollapsed ? i18nT('ars.showPrep') : i18nT('ars.collapse')}</span>
                    </div>
                    
                    <div class="ars-slot-selector">
                        <button class="ars-slot-btn ${this.currentSlot === 1 ? 'active' : ''}" data-slot="1">${i18nT('ars.slot')} 1</button>
                        <button class="ars-slot-btn ${this.currentSlot === 2 ? 'active' : ''}" data-slot="2">${i18nT('ars.slot')} 2</button>
                        <button class="ars-slot-btn ${this.currentSlot === 3 ? 'active' : ''}" data-slot="3">${i18nT('ars.slot')} 3</button>
                    </div>
                </div>

                <div class="ars-predeck-content-wrapper">
                    <div class="ars-predeck-cards">
                        ${this.preDeckCards.map((c, i) => `
                            <div class="ars-slot ars-card-slot ${c ? 'filled' : ''}" data-type="card" data-idx="${i}" draggable="true">
                                ${c ? `<div class="ars-slot-img" style="border-radius:6px; overflow:hidden;">${renderMatrixCardSVG(c, { mode: 'thumb', animateChroma: false })}</div>` : '<div class="ars-slot-plus">+</div>'}
                            </div>
                        `).join('')}
                    </div>

                    <div class="ars-predeck-bottom">
                        <!-- ARTIFACTS -->
                        <div class="ars-skill-slots">
                            ${this.preDeckArtifacts.map((a, i) => `
                                <div class="ars-slot ars-skill-circle ${a ? 'filled' : ''}" data-type="artifact" data-idx="${i}" draggable="true">
                                    ${a ? `<div class="ars-slot-img" style="background-image:url('${a.image || ''}'); display:flex; align-items:center; justify-content:center; font-size:1.5rem;">${a.image ? '' : a.icon}</div>` : '<div class="ars-slot-plus">+</div>'}
                                </div>
                            `).join('')}
                        </div>

                        <!-- BOARD SELECTION -->
                        <div class="ars-slot ars-board-mini-slot filled" data-type="board" style="background-image:url('${this.selectedBoard}')">
                            <div style="font-size: 0.5rem; background: rgba(0,0,0,0.5); width: 100%; text-align: center; position: absolute; bottom: 0; padding: 2px 0;">${i18nT('ars.back')}</div>
                        </div>
                    </div>

                    <!-- SAVE BUTTON SECTION -->
                    <div class="ars-save-section">
                        <button class="ars-save-btn" id="ars-save-deck">
                            <span class="ars-save-icon">💾</span>
                            <span class="ars-save-text">${i18nT('ars.save')}</span>
                        </button>
                        <button class="ars-auto-btn" id="ars-auto-fill">
                            <span class="ars-auto-icon">🎲</span>
                            <span class="ars-auto-text">${i18nT('ars.autofill')}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    public render(container: HTMLElement) {
        container.innerHTML = `
            <div class="arsenal-screen" style="height: 100%; display: flex; flex-direction: column;">
                ${this.renderPreDeck()}

                <div class="ars-scroller">
                    <!-- STICKY HEADER -->
                    <div class="ars-sticky-header">
                        <div class="ars-control-row">
                            <div class="ars-grid-switcher">
                                <button class="ars-grid-btn ${this.gridSize === 2 ? 'active' : ''}" data-size="2">2x</button>
                                <button class="ars-grid-btn ${this.gridSize === 3 ? 'active' : ''}" data-size="3">3x</button>
                                <button class="ars-grid-btn ${this.gridSize === 4 ? 'active' : ''}" data-size="4">4x</button>
                            </div>

                            <div class="ars-search-box">
                                <span class="ars-search-icon">🔍</span>
                                <input type="text" class="ars-search-input" id="ars-search" placeholder="${i18nT('ars.search')}" value="${this.searchQuery}">
                            </div>

                            <select class="ars-select compact" id="ars-rarity-filter">
                                <option value="all" ${this.rarityFilter === 'all' ? 'selected' : ''}>${i18nT('ars.all')}</option>
                                <option value="common" ${this.rarityFilter === 'common' ? 'selected' : ''}>${i18nT('ars.common')}</option>
                                <option value="rare" ${this.rarityFilter === 'rare' ? 'selected' : ''}>${i18nT('ars.rare')}</option>
                                <option value="epic" ${this.rarityFilter === 'epic' ? 'selected' : ''}>${i18nT('ars.epic')}</option>
                                <option value="legendary" ${this.rarityFilter === 'legendary' ? 'selected' : ''}>${i18nT('ars.legendary')}</option>
                            </select>

                            <!-- BOTÃO DISCRETO E CIRCULAR PARA PILHAR CÓPIAS -->
                            <button id="ars-stack-btn" class="ars-stack-btn ${this.isStacked ? 'active' : ''}" title="${this.isStacked ? 'Desempilhar cópias (modo sequencial)' : 'Pilhar cópias'}" aria-label="Pilhar cópias">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="2" y="7" width="13" height="14" rx="2" ry="2"></rect>
                                    <path d="M6 3h13a2 2 0 0 1 2 2v13"></path>
                                </svg>
                            </button>
                        </div>

                        <!-- TABS -->
                        <div class="ars-tabs">
                            <button class="ars-tab ${this.activeTab === 'cards' ? 'active' : ''}" data-tab="cards">${i18nT('ars.cards')}</button>
                            <button class="ars-tab ${this.activeTab === 'artifacts' ? 'active' : ''}" data-tab="artifacts">${i18nT('ars.artifacts')}</button>
                            <button class="ars-tab ${this.activeTab === 'boards' ? 'active' : ''}" data-tab="boards">${i18nT('ars.boards')}</button>
                        </div>
                    </div>

                    <!-- CONTENT PANEL -->
                    <div class="ars-content" id="ars-panel">
                        ${this.renderActiveContent()}
                    </div>
                </div>

                <!-- ARTIFACT MODAL -->
                <div class="ars-viewer-overlay" id="ars-artifact-modal" style="background: rgba(0,0,0,0.95);">
                    <div class="ars-viewer-body" style="align-items:center; justify-content:center;">
                        <div id="ars-artifact-content" style="position: relative; max-width: 400px; width: 90%; padding: 30px 26px; background: linear-gradient(180deg, #3a2a15, #1c1207); border: 3px solid #0e0903; border-radius: 18px; text-align: center; box-shadow: 0 8px 0 rgba(0,0,0,0.55), 0 0 30px rgba(212,175,55,0.25), inset 0 2px 0 rgba(255,236,190,0.25); color: #ffe9a8;"></div>
                    </div>
                </div>

                <!-- HIDDEN CONFIRM FOR PROGRAMMATIC TRIGGER -->
                <button id="ars-confirm" style="display:none;"></button>

                <!-- SWITCH MODAL -->
                <div class="ars-viewer-overlay ${this.showConfirmSwitch ? 'active' : ''}" id="ars-switch-modal" style="background: rgba(0,0,0,0.9);">
                    <div class="ars-viewer-body" style="align-items:center; justify-content:center;">
                        <div style="background: #222; border: 1px solid #444; border-radius: 15px; padding: 25px; max-width: 350px; width: 90%; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,1);">
                            <div style="font-size: 1.2rem; font-weight: 950; margin-bottom: 10px; color: #ffd700;">${i18nT('ars.switchTitle')}</div>
                            <div style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 25px;">${i18nTx('ars.switchMsg', { slot: this.targetSlot })}</div>
                            <div style="display: flex; gap: 10px;">
                                <button id="switch-cancel" class="ars-btn-action secondary" style="flex:1;">${i18nT('ars.cancel')}</button>
                                <button id="switch-confirm" class="ars-btn-action" style="flex:1;">${i18nT('ars.load')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bind(container);
        this.observeLazyBg(container);

        if (!container.dataset.matrixArsenalSynced) {
            container.dataset.matrixArsenalSynced = '1';
            getMergedGameTemplates(this.templates).then((merged) => {
                if (merged && merged.length !== this.templates.length) {
                    this.templates = merged;
                    this.loadSlotData(this.currentSlot);
                    if (container.isConnected) {
                        this.render(container);
                    }
                }
            });
        }
    }

    private getCardsList(): any[] {
        const list: any[] = [...this.templates];
        try {
            const raw = localStorage.getItem('store_owned');
            if (raw) {
                const owned = JSON.parse(raw);
                if (Array.isArray(owned.cards)) {
                    const storeCounts: Record<string, number> = {};
                    owned.cards.forEach((name: string) => {
                        storeCounts[name] = (storeCounts[name] || 0) + 1;
                    });
                    for (const [name, count] of Object.entries(storeCounts)) {
                        const existingCount = list.filter(t => t.name === name).length;
                        const needed = count - existingCount;
                        if (needed > 0) {
                            const tmpl = this.templates.find(t => t.name === name);
                            if (tmpl) {
                                for (let i = 0; i < needed; i++) {
                                    list.push({ ...tmpl });
                                }
                            }
                        }
                    }
                }
            }
        } catch {}
        return list;
    }

    private renderActiveContent(): string {
        const q = this.searchQuery.toLowerCase();

        if (this.activeTab === 'cards') {
            const allCards = this.getCardsList();
            let filtered = allCards.filter(t => t.name.toLowerCase().includes(q));
            if (this.rarityFilter !== 'all') {
                filtered = filtered.filter(t => (t.preferredRarity || 'common') === this.rarityFilter);
            }

            // Agrupamento de cópias quando o modo empilhado está ativado
            let displayCards: any[] = [];
            if (this.isStacked) {
                const cardMap = new Map<string, { card: any, count: number, instances: any[] }>();
                filtered.forEach(c => {
                    const existing = cardMap.get(c.name);
                    if (existing) {
                        existing.count++;
                        existing.instances.push(c);
                    } else {
                        cardMap.set(c.name, { card: { ...c }, count: 1, instances: [c] });
                    }
                });
                displayCards = Array.from(cardMap.values()).map(entry => {
                    entry.card._count = entry.count;
                    entry.card._instances = entry.instances;
                    return entry.card;
                });
            } else {
                displayCards = filtered;
            }

            const grouped = {
                'favorites': displayCards.filter(t => this.favorites.includes(t.name)),
                'legendary': displayCards.filter(t => t.preferredRarity === 'legendary' && !this.favorites.includes(t.name)),
                'epic': displayCards.filter(t => t.preferredRarity === 'epic' && !this.favorites.includes(t.name)),
                'rare': displayCards.filter(t => t.preferredRarity === 'rare' && !this.favorites.includes(t.name)),
                'common': displayCards.filter(t => (t.preferredRarity === 'common' || !t.preferredRarity) && !this.favorites.includes(t.name)),
            };

            this.viewerList = [...grouped.favorites, ...grouped.legendary, ...grouped.epic, ...grouped.rare, ...grouped.common];

            let html = '';
            
            const rarityTargets: Record<string, number> = {
                'legendary': 6,
                'epic': 10,
                'rare': 16,
                'common': 28
            };

            if (grouped.favorites.length > 0) {
                const favsCollapsed = this.collapsedSections.has('favs');
                html += `<div class="ars-section-header" data-collapse="favs" style="cursor:pointer; user-select:none;">${favsCollapsed ? '▶' : '▼'} ${i18nT('ars.favs')} (${grouped.favorites.length})</div>
                         <div class="ars-grid ars-columns-${this.gridSize}" style="${favsCollapsed ? 'display:none;' : ''}">${grouped.favorites.map(t => this.renderCardThumb(t, true)).join('')}</div>`;
            }

            ['common', 'rare', 'epic', 'legendary'].forEach(r => {
                const sect = (grouped as any)[r];
                const ownedCount = sect ? sect.length : 0;
                const target = rarityTargets[r] || 10;
                const lockedCount = Math.max(2, target - ownedCount);

                html += `<div class="ars-rarity-divider rarity-${r}" data-collapse="rar:${r}" style="cursor:pointer; user-select:none;">${this.collapsedSections.has('rar:' + r) ? '▶' : '▼'} ${i18nT('ars.' + r)} (${ownedCount})</div>`;
                html += `<div class="ars-grid ars-columns-${this.gridSize}" style="${this.collapsedSections.has('rar:' + r) ? 'display:none;' : ''}">`;
                
                if (sect) html += sect.map((t: any) => this.renderCardThumb(t, false)).join('');
                
                for (let i = 0; i < lockedCount; i++) {
                    html += `
                        <div class="ars-card-thumb locked" style="cursor:not-allowed;">
                            <div class="ars-thumb-art" style="overflow:hidden; border-radius:8px; opacity:0.35; filter:grayscale(1) blur(1px); aspect-ratio:680/990;">${renderMatrixCardBackSVG()}</div>
                            <div class="ars-locked-icon">🔒</div>
                            <div class="ars-thumb-info"><div class="ars-thumb-name" style="color:#666; font-size: 0.45rem;">${i18nT('ars.locked')}</div></div>
                        </div>
                    `;
                }
                html += `</div>`;
            });

            return html;
        }

        if (this.activeTab === 'artifacts') {
            const items = this.artifacts.filter(s => s.name.toLowerCase().includes(q));
            
            // Organize items by category
            const grouped = items.reduce((acc, skill) => {
                if (!acc[skill.category]) acc[skill.category] = [];
                acc[skill.category].push(skill);
                return acc;
            }, {} as Record<string, Skill[]>);

            let html = '';
            for (const [category, skills] of Object.entries(grouped)) {
                html += `
                    <div class="ars-rarity-divider rarity-common" data-collapse="art:${category}" style="border-left: 2px solid #ffd700; cursor:pointer; user-select:none;">${this.collapsedSections.has('art:' + category) ? '▶' : '▼'} ${category.toUpperCase()}</div>
                    <div class="ars-artifact-grid" style="${this.collapsedSections.has('art:' + category) ? 'display:none;' : ''}">
                        ${skills.map(s => {
                            const isEquipped = this.isArtifactInDeck(s.id);
                            return `
                                <div class="ars-artifact-item ${isEquipped ? 'equipped' : ''}" data-id="${s.id}">
                                    <div class="ars-artifact-image" style="${s.image ? `background-image:url('${s.image}')` : ''}">${s.image ? '' : s.icon}</div>
                                    <div class="ars-artifact-content">
                                        <div class="ars-artifact-name">${s.name}</div>
                                    </div>
                                    <button class="ars-artifact-equip-btn equip-artifact">${isEquipped ? `✓ ${i18nT('ars.inDeck')}` : i18nT('ars.equip')}</button>
                                </div>
                            `;
                        }).join('')}
                        ${Array.from({ length: 4 }).map(() => `
                            <div class="ars-artifact-item locked" style="cursor:not-allowed;">
                                <div class="ars-artifact-image" style="background-image: url('/cards/cardback.png'); filter: grayscale(1) blur(2px); border-color: rgba(255,255,255,0.05); opacity: 0.3;"></div>
                                <div class="ars-locked-icon" style="font-size: 1rem;">🔒</div>
                                <div class="ars-artifact-content">
                                    <div class="ars-artifact-name" style="background: rgba(0,0,0,0.5); color:#888; font-size: 0.5rem;">${i18nT('ars.locked')}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            return html || `<div style="text-align:center; opacity:0.3; padding:40px;">${i18nT('ars.noArtifacts')}</div>`;
        }

        if (this.activeTab === 'boards') {
            const grid = `<div class="ars-grid ars-columns-2">${this.boards.map(bg => `
                <div class="board-select ${this.selectedBoard === bg ? 'active' : ''}" data-url="${bg}">
                    <div class="ars-board-item" style="aspect-ratio:16/9; border-radius:4px; overflow:hidden; background-image:url('${bg}'); background-size:cover; background-position:center;"></div>
                    ${this.selectedBoard === bg ? `<div class="ars-board-check">✓</div>` : ''}
                </div>`).join('')}</div>`;
            return grid;
        }
        return '';
    }

    private renderCardThumb(t: any, isFav: boolean): string {
        const inDeckCount = this.preDeckCards.filter(c => c && c.name === t.name).length;
        const totalCount = t._count || 1;
        const allInDeck = inDeckCount >= totalCount;
        const inDeck = inDeckCount > 0;
        const isStackedCard = this.isStacked && totalCount > 1;

        return `
            <div class="ars-card-thumb ${inDeck ? 'in-deck' : ''} ${isStackedCard ? 'stacked' : ''}" data-name="${t.name}">
                <div class="ars-thumb-art matrix-thumb-art" style="overflow:hidden; border-radius:8px; position:relative; aspect-ratio:680/990;">
                    ${renderMatrixCardSVG(t, { mode: 'thumb', animateChroma: false })}
                    <div class="ars-fav-indicator ${isFav ? 'active' : ''}">⭐</div>
                    
                    ${isStackedCard ? `<div class="ars-stack-badge" title="${totalCount} cópias disponíveis">🎴 x${totalCount}</div>` : ''}

                    ${inDeck ? `<div class="ars-deck-badge ${isStackedCard && !allInDeck ? 'partial' : ''}">${isStackedCard && totalCount > 1 ? `${inDeckCount}/${totalCount} ${i18nT('ars.inDeck')}` : i18nT('ars.inDeck')}</div>` : ''}
                    
                    <div class="ars-thumb-overlay">
                        <button class="ars-btn-action inline-equip">${allInDeck ? i18nT('ars.remove') : (isStackedCard && inDeckCount > 0 ? `+ EQUIPAR (${inDeckCount}/${totalCount})` : (inDeck ? i18nT('ars.remove') : i18nT('ars.equip')))}</button>
                        <button class="ars-btn-action secondary inline-view">${i18nT('ars.details')}</button>
                    </div>
                </div>
                <div class="ars-thumb-info"><div class="ars-thumb-name">${t.name}</div></div>
            </div>`;
    }

    private bind(container: HTMLElement) {
        container.querySelector('#ars-confirm')?.addEventListener('click', () => {
            if (this.onConfirm) {
                // Return only valid (non-null) slots
                const cards = this.preDeckCards.filter(c => c !== null);
                const arts = this.preDeckArtifacts.filter(a => a !== null) as Skill[];
                this.onConfirm(cards, arts, this.selectedBoard);
            }
        });

        // Alternar modo de empilhamento de cópias (ícone discreto e circular)
        container.querySelector('#ars-stack-btn')?.addEventListener('click', () => {
            SoundManager.playAction('clique_geral', 0.5);
            this.isStacked = !this.isStacked;
            try {
                localStorage.setItem('arsenal_stack_copies', JSON.stringify(this.isStacked));
            } catch {}
            this.render(container);
        });

        container.querySelector('#ars-search')?.addEventListener('input', (e) => {
            const input = e.target as HTMLInputElement;
            this.searchQuery = input.value;
            this.updatePanel(container);
        });

        container.querySelector('#ars-rarity-filter')?.addEventListener('change', (e) => {
            this.rarityFilter = (e.target as HTMLSelectElement).value as any;
            SoundManager.playAction('clique_geral', 0.4);
            this.updatePanel(container);
        });

        container.querySelectorAll('.ars-grid-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                SoundManager.playAction('clique_geral', 0.4);
                this.gridSize = parseInt((btn as HTMLElement).dataset.size!) as any;
                this.render(container);
            });
        });

        container.querySelectorAll('.ars-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                SoundManager.playAction('clique_geral', 0.5);
                this.activeTab = (tab as HTMLElement).dataset.tab as any;
                this.render(container);
            });
        });

        // Slots interaction (Focus + Clear)
        container.querySelectorAll('.ars-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                const type = (slot as HTMLElement).dataset.type;
                const idx = parseInt((slot as HTMLElement).dataset.idx || '0');
                
                if (type === 'card' && this.activeTab !== 'cards') { this.activeTab = 'cards'; this.render(container); return; }
                if (type === 'artifact' && this.activeTab !== 'artifacts') { this.activeTab = 'artifacts'; this.render(container); return; }
                if (type === 'board' && this.activeTab !== 'boards') { this.activeTab = 'boards'; this.render(container); return; }

                if (type === 'card' && this.preDeckCards[idx]) {
                    SoundManager.playAction('clique_geral', 0.3);
                    this.preDeckCards[idx] = null;
                    this.savePreDeck();
                } else if (type === 'artifact' && this.preDeckArtifacts[idx]) {
                    SoundManager.playAction('clique_geral', 0.3);
                    this.preDeckArtifacts[idx] = null;
                    this.savePreDeck();
                } else {
                    SoundManager.playAction('clique_geral', 0.4);
                }
                this.render(container);
            });

            // LONG PRESS TO VIEW DETAILS
            const type = (slot as HTMLElement).dataset.type;
            const idx = parseInt((slot as HTMLElement).dataset.idx || '0');
            const item = type === 'card' ? this.preDeckCards[idx] : this.preDeckArtifacts[idx];
            if (item) {
                bindLongPress(slot as HTMLElement, () => {
                    if (type === 'card') {
                        // Find this card in the viewer list to allow navigation
                        const vIdx = this.viewerList.findIndex(t => t.name === item.name);
                        if (vIdx !== -1) this.showViewer(vIdx);
                        else {
                            // Temporary viewer for single card
                            this.viewerList = [item];
                            this.showViewer(0);
                        }
                    } else {
                        this.showArtifactViewer(item);
                    }
                });
            }
        });

        // UI Header Controls
        container.querySelector('#ars-collapse-btn')?.addEventListener('click', () => {
            this.isPreDeckCollapsed = !this.isPreDeckCollapsed;
            this.render(container);
        });

        // Collapsible collection sections (rarities, favorites, artifact categories)
        container.querySelectorAll('[data-collapse]').forEach(el => {
            el.addEventListener('click', () => {
                SoundManager.playAction('clique_geral', 0.3);
                this.toggleSection((el as HTMLElement).dataset.collapse!, container);
            });
        });

        container.querySelectorAll('.ars-slot-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = parseInt((btn as HTMLElement).dataset.slot!);
                if (target === this.currentSlot) return;
                SoundManager.playAction('clique_geral', 0.5);
                this.targetSlot = target;
                this.showConfirmSwitch = true;
                this.render(container);
            });
        });

        container.querySelector('#switch-confirm')?.addEventListener('click', () => {
            SoundManager.playAction('clique_geral', 0.6);
            this.currentSlot = this.targetSlot;
            this.showConfirmSwitch = false;
            localStorage.setItem('arsenal_current_slot', this.currentSlot.toString());
            this.loadSlotData(this.currentSlot);
            this.render(container);
        });

        container.querySelector('#switch-cancel')?.addEventListener('click', () => {
            SoundManager.playAction('clique_geral', 0.4);
            this.showConfirmSwitch = false;
            this.render(container);
        });

        // SAVE BUTTON
        container.querySelector('#ars-save-deck')?.addEventListener('click', (e) => {
            SoundManager.playAction('clique_geral', 0.7);
            const btn = e.currentTarget as HTMLElement;
            this.savePreDeck();
            
            // Visual feedback
            const originalText = btn.querySelector('.ars-save-text')!.textContent;
            const originalIcon = btn.querySelector('.ars-save-icon')!.textContent;
            
            btn.classList.add('saved');
            btn.querySelector('.ars-save-text')!.textContent = i18nT('ars.saved');
            btn.querySelector('.ars-save-icon')!.textContent = '✅';
            
            setTimeout(() => {
                btn.classList.remove('saved');
                btn.querySelector('.ars-save-text')!.textContent = originalText;
                btn.querySelector('.ars-save-icon')!.textContent = originalIcon;
            }, 1500);
            
            gsap.fromTo(btn, { scale: 0.95 }, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
        });

        // AUTO-FILL BUTTON
        container.querySelector('#ars-auto-fill')?.addEventListener('click', () => {
            SoundManager.playAction('clique_geral', 0.5);
            this.autoFillDeck();
            this.render(container);
            
            // Visual stagger animation for the slots
            gsap.fromTo('.ars-slot.filled', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, stagger: 0.02, ease: 'back.out(2)' });
        });

        // DRAG AND DROP FOR SWAPPING
        let draggedType: string | null = null;
        let draggedIdx: number | null = null;

        const allPreSlots = container.querySelectorAll('.ars-slot[draggable="true"]');
        allPreSlots.forEach(slot => {
            slot.addEventListener('dragstart', (e: any) => {
                const el = e.currentTarget as HTMLElement;
                draggedType = el.dataset.type || null;
                draggedIdx = parseInt(el.dataset.idx || '-1');
                el.style.opacity = '0.5';
                if (e.dataTransfer) {
                   e.dataTransfer.effectAllowed = 'move';
                }
            });
            slot.addEventListener('dragend', (e: any) => {
                (e.currentTarget as HTMLElement).style.opacity = '1';
                draggedType = null;
                draggedIdx = null;
            });
            slot.addEventListener('dragover', (e: any) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            slot.addEventListener('drop', (e: any) => {
                e.preventDefault();
                const el = e.currentTarget as HTMLElement;
                const targetType = el.dataset.type;
                const targetIdx = parseInt(el.dataset.idx || '-1');

                if (draggedType === targetType && draggedIdx !== null && targetIdx !== -1 && draggedIdx !== targetIdx) {
                    if (targetType === 'card') {
                        const temp = this.preDeckCards[draggedIdx];
                        this.preDeckCards[draggedIdx] = this.preDeckCards[targetIdx];
                        this.preDeckCards[targetIdx] = temp;
                    } else if (targetType === 'artifact') {
                        const temp = this.preDeckArtifacts[draggedIdx];
                        this.preDeckArtifacts[draggedIdx] = this.preDeckArtifacts[targetIdx];
                        this.preDeckArtifacts[targetIdx] = temp;
                    }
                    this.savePreDeck();
                    this.render(container);
                }
            });
        });

        // delegation
        const panel = container.querySelector('#ars-panel');
        panel?.addEventListener('click', (e) => {
            const trg = e.target as HTMLElement;
            const thumb = trg.closest('.ars-card-thumb') as HTMLElement;
            if (thumb) {
                if (Date.now() < this.suppressThumbClickUntil) return;
                const name = thumb.dataset.name;
                const c = this.viewerList.find(t => t.name === name) || this.templates.find(t => t.name === name);
                if (trg.classList.contains('inline-equip')) { this.equipToDeck('card', c, thumb); return; }
                if (trg.classList.contains('inline-view')) { 
                    const vIdx = this.viewerList.findIndex(t => t.name === name);
                    if (vIdx !== -1) this.showViewer(vIdx); 
                    return; 
                }
                if (trg.classList.contains('ars-fav-indicator')) {
                    SoundManager.playAction('clique_geral', 0.4);
                    this.toggleFavorite(name!);
                    this.updatePanel(container);
                    return;
                }
                // default view details
                const vIdx = this.viewerList.findIndex(t => t.name === name);
                if (vIdx !== -1) this.showViewer(vIdx);
            }

            const artRow = trg.closest('.ars-artifact-item') as HTMLElement;
            if (artRow && trg.classList.contains('equip-artifact')) {
                const art = this.artifacts.find(a => a.id === artRow.dataset.id);
                if (art) this.equipToDeck('artifact', art, artRow);
                return;
            } else if (artRow && !artRow.classList.contains('locked')) {
                const art = this.artifacts.find(a => a.id === artRow.dataset.id);
                if (art) this.showArtifactViewer(art);
                return;
            }

            const boardItem = trg.closest('.board-select') as HTMLElement;
            if (boardItem) {
                SoundManager.playAction('clique_geral', 0.5);
                this.selectedBoard = boardItem.dataset.url!;
                this.savePreDeck();
                this.render(container);
            }
        });

        document.getElementById('ars-artifact-modal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('ars-artifact-modal')) {
                document.getElementById('ars-artifact-modal')?.classList.remove('active');
            }
        });

        // Long-press drag da colecao para os slots (mouse + touch)
        this.bindCollectionDrag(container);

        if (panel && panel.children.length > 0) {
            gsap.fromTo(panel.children, 
                { y: 40, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'back.out(1.2)' }
            );
        }

        // Handle the hidden confirm button click
        const confirmBtn = document.getElementById('ars-confirm');        confirmBtn?.addEventListener('click', () => {
            if (this.onConfirm) {
                this.onConfirm(
                    this.preDeckCards.filter(c => c !== null),
                    this.preDeckArtifacts.filter(a => a !== null) as Skill[],
                    this.selectedBoard
                );
            }
        });
    }

    private bindCollectionDrag(container: HTMLElement) {
        container.querySelectorAll('.ars-card-thumb').forEach(thumb => {
            const el = thumb as HTMLElement;
            let pressTimer: any = null;
            let dragging = false;
            let ghost: HTMLElement | null = null;
            let startX = 0, startY = 0;

            const preventScroll = (e: TouchEvent) => { if (dragging) e.preventDefault(); };

            const cancelPress = () => {
                if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
            };

            el.addEventListener('pointerdown', (e: PointerEvent) => {
                if ((e.target as HTMLElement).closest('.ars-btn-action, .ars-fav-indicator')) return;
                if (e.button !== undefined && e.button !== 0) return;
                startX = e.clientX; startY = e.clientY;
                cancelPress();
                pressTimer = setTimeout(() => {
                    const card = this.templates.find(t => t.name === el.dataset.name);
                    if (!card) return;
                    dragging = true;
                    this.suppressThumbClickUntil = Date.now() + 500;
                    ghost = document.createElement('div');
                    const r = el.getBoundingClientRect();
                    ghost.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:99999;pointer-events:none;border-radius:8px;border:3px solid #ffd700;background:url('${card.image || ''}') center/cover, #111;box-shadow:0 12px 40px rgba(0,0,0,0.8), 0 0 24px rgba(255,215,0,0.5);opacity:0.95;`;
                    document.body.appendChild(ghost);
                    document.addEventListener('touchmove', preventScroll, { passive: false });
                    try { SoundManager.playAction('clique_geral', 0.4); } catch {}
                }, 450);
            });

            el.addEventListener('pointermove', (e: PointerEvent) => {
                if (!dragging || !ghost) {
                    if (pressTimer && Math.hypot(e.clientX - startX, e.clientY - startY) > 12) cancelPress();
                    return;
                }
                ghost.style.left = (e.clientX - ghost.offsetWidth / 2) + 'px';
                ghost.style.top = (e.clientY - ghost.offsetHeight / 2) + 'px';
                container.querySelectorAll('.ars-card-slot.drag-over').forEach(s => s.classList.remove('drag-over'));
                const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
                const slot = under && under.closest ? (under.closest('.ars-card-slot') as HTMLElement | null) : null;
                if (slot && container.contains(slot)) slot.classList.add('drag-over');
            });

            const endDrag = (e: PointerEvent) => {
                cancelPress();
                if (!dragging) return;
                dragging = false;
                document.removeEventListener('touchmove', preventScroll);
                let placed = false;
                const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
                const slot = under && under.closest ? (under.closest('.ars-card-slot') as HTMLElement | null) : null;
                if (slot && container.contains(slot)) {
                    const idx = parseInt(slot.dataset.idx || '-1');
                    const card = this.templates.find(t => t.name === el.dataset.name);
                    if (card && idx >= 0) {
                        this.preDeckCards[idx] = card;
                        this.savePreDeck();
                        try { SoundManager.playAction('carta_sacada', 0.5); } catch {}
                        placed = true;
                    }
                }
                ghost?.remove(); ghost = null;
                container.querySelectorAll('.ars-card-slot.drag-over').forEach(s => s.classList.remove('drag-over'));
                if (placed) {
                    this.suppressThumbClickUntil = Date.now() + 400;
                    this.render(container);
                }
            };
            el.addEventListener('pointerup', endDrag);
            el.addEventListener('pointercancel', endDrag);
        });
    }

    private updatePanel(container: HTMLElement) {
        const panel = container.querySelector('#ars-panel') as HTMLElement;
        if (!panel) return;
        gsap.to(panel.children, { y: 20, opacity: 0, duration: 0.2, stagger: 0.02, onComplete: () => {
            panel.innerHTML = this.renderActiveContent();
            this.observeLazyBg(panel);
            gsap.fromTo(panel.children, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.04, ease: 'power2.out' });
        }});
    }

    private toggleSection(key: string, container: HTMLElement) {
        if (this.collapsedSections.has(key)) this.collapsedSections.delete(key);
        else this.collapsedSections.add(key);
        try { localStorage.setItem('arsenal_collapsed_sections', JSON.stringify([...this.collapsedSections])); } catch {}
        this.render(container);
    }

    // Lazy-load das artes das cartas: só baixa a imagem quando o thumb entra
    // (ou está perto de entrar) na área visível. Sem isso o navegador dispara
    // dezenas de downloads de ~700KB de uma vez ao abrir o deck.
    private observeLazyBg(scope: HTMLElement) {
        const els = scope.querySelectorAll('[data-lazybg]');
        if (!els.length) return;
        const paint = (node: HTMLElement) => {
            const full = node.getAttribute('data-lazybg') || '';
            const thumb = node.getAttribute('data-lazythumb') || full;
            node.removeAttribute('data-lazybg');
            node.removeAttribute('data-lazythumb');
            // Tenta o thumb leve; se faltar, cai p/ a imagem full (nunca quebra).
            const probe = new Image();
            probe.onload = () => { node.style.backgroundImage = `url('${thumb}')`; };
            probe.onerror = () => { if (full) node.style.backgroundImage = `url('${full}')`; };
            probe.src = thumb || full;
        };
        if (!('IntersectionObserver' in window)) {
            els.forEach((el) => paint(el as HTMLElement));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (!en.isIntersecting) return;
                const node = en.target as HTMLElement;
                paint(node);
                io.unobserve(node);
            });
        }, { root: scope.querySelector('.ars-scroller') || null, rootMargin: '400px' });
        els.forEach((el) => io.observe(el));
    }

    private equipToDeck(type: 'card' | 'artifact', item: any, sourceEl: HTMLElement | null) {
        let targetIdx = -1;
        let isRemoving = false;

        if (type === 'card') {
            const inDeckCount = this.preDeckCards.filter(c => c && c.name === item.name).length;
            const totalCount = item._count || 1;

            if (inDeckCount >= totalCount) {
                // Se todas as cópias já estão no deck, remove a última cópia equipada
                let lastIdx = -1;
                for (let i = this.preDeckCards.length - 1; i >= 0; i--) {
                    if (this.preDeckCards[i] && this.preDeckCards[i].name === item.name) {
                        lastIdx = i;
                        break;
                    }
                }
                if (lastIdx !== -1) {
                    this.preDeckCards[lastIdx] = null;
                    isRemoving = true;
                }
            } else {
                targetIdx = this.preDeckCards.indexOf(null);
                if (targetIdx === -1) targetIdx = 0;
                this.preDeckCards[targetIdx] = item;
            }
        } else {
            const existing = this.preDeckArtifacts.indexOf(item);
            if (existing !== -1) { this.preDeckArtifacts[existing] = null; isRemoving = true; }
            else { targetIdx = this.preDeckArtifacts.indexOf(null); if (targetIdx === -1) targetIdx = 0; this.preDeckArtifacts[targetIdx] = item; }
        }

        if (!isRemoving && sourceEl && targetIdx !== -1) {
            SoundManager.playAction('carta_sacada', 0.5);
            this.animateToSlot(sourceEl, type, targetIdx, item.image || (item.icon ? '' : item.image));
            setTimeout(() => this.render(document.querySelector('.arsenal-screen')!.parentElement!), 600);
        } else {
            if (isRemoving) SoundManager.playAction('clique_geral', 0.3);
            this.render(document.querySelector('.arsenal-screen')!.parentElement!);
        }
        this.savePreDeck();
    }

    private animateToSlot(source: HTMLElement, type: string, idx: number, img: string) {
        const slots = document.querySelectorAll(type === 'card' ? '.ars-card-slot' : '.ars-skill-circle');
        const target = slots[idx];
        if (!target) return;
        const sRect = source.getBoundingClientRect();
        const tRect = target.getBoundingClientRect();
        const flyer = document.createElement('div');
        flyer.className = 'ars-flyer';
        flyer.style.cssText = `width:${sRect.width}px;height:${sRect.height}px;top:${sRect.top}px;left:${sRect.left}px;`;
        if (img) flyer.style.backgroundImage = `url('${img}')`;
        else flyer.innerHTML = `<div style="font-size: 2rem; display: flex; align-items: center; justify-content: center; height: 100%; color: white;">✨</div>`;
        document.body.appendChild(flyer);

        const tl = gsap.timeline({ onComplete: () => flyer.remove() });
        tl.to(flyer, { x: tRect.left - sRect.left, y: tRect.top - sRect.top, width: tRect.width, height: tRect.height, rotation: 720, duration: 0.7, ease: 'power3.inOut' });
        tl.to(target, { scale: 1.2, duration: 0.15, yoyo: true, repeat: 1 }, 0.5);
    }

    private loadSlotData(slot: number) {
        const key = `arsenal_predeck_s${slot}`;
        const savedPre = localStorage.getItem(key) || localStorage.getItem('arsenal_predeck');
        if (savedPre) {
            const data = JSON.parse(savedPre);
            this.preDeckCards = data.cards.map((name: string) =>
                name ? (this.templates.find(t => t.name === name || t.id === name) || resolveMatrixOrGameCard(name, this.templates) || null) : null
            );
            this.preDeckArtifacts = data.artifacts.map((id: string) => this.artifacts.find(a => a.id === id) || null);
            this.selectedBoard = data.board || (this.boards[0] || '');
        } else {
            this.preDeckCards = Array(12).fill(null);
            this.preDeckArtifacts = Array(3).fill(null);
            this.selectedBoard = this.boards[0] || '';
        }
    }

    private savePreDeck() {
        const data = {
            cards: this.preDeckCards.map(c => c?.name || ''),
            artifacts: this.preDeckArtifacts.map(a => a?.id || ''),
            board: this.selectedBoard
        };
        const key = `arsenal_predeck_s${this.currentSlot}`;
        localStorage.setItem(key, JSON.stringify(data));
        // Also keep 'arsenal_predeck' as the legacy/global active one for compatibility
        localStorage.setItem('arsenal_predeck', JSON.stringify(data));
    }

    private autoFillDeck() {
        // Sorteio SEM reposicao: nao repete carta (so repete se o acervo < 12)
        const pool = [...this.templates];
        this.preDeckCards = [];
        for (let i = 0; i < 12; i++) {
            if (pool.length === 0) {
                if (this.templates.length === 0) break;
                pool.push(...this.templates);
            }
            const rIdx = Math.floor(Math.random() * pool.length);
            this.preDeckCards.push(pool.splice(rIdx, 1)[0]);
        }
        while (this.preDeckCards.length < 12) this.preDeckCards.push(null);

        // Randomize 3 artifacts (ja era sem repeticao + guarda contra acervo vazio)
        const availableArtifacts = [...this.artifacts];
        this.preDeckArtifacts = [];
        for (let i = 0; i < 3; i++) {
            if (availableArtifacts.length === 0) { this.preDeckArtifacts.push(null); continue; }
            const rIdx = Math.floor(Math.random() * availableArtifacts.length);
            this.preDeckArtifacts.push(availableArtifacts[rIdx]);
            availableArtifacts.splice(rIdx, 1); // Artifacts are usually unique
        }

        // Randomize board
        if (this.boards.length > 0) {
            this.selectedBoard = this.boards[Math.floor(Math.random() * this.boards.length)];
        }

        this.savePreDeck();
    }

    private toggleFavorite(name: string) {
        const idx = this.favorites.indexOf(name);
        if (idx === -1) this.favorites.push(name);
        else this.favorites.splice(idx, 1);
        localStorage.setItem('arsenal_favorites', JSON.stringify(this.favorites));
    }

    private handleGlobalKeys(e: KeyboardEvent) {
        if (!isCardViewerOpen()) return;
        if (e.key === 'ArrowLeft') this.navigateViewer(-1);
        if (e.key === 'ArrowRight') this.navigateViewer(1);
    }

    private navigateViewer(dir: number) {
        cardViewerNav(dir);
    }

    private showViewer(idx: number, _fromDir: number = 0) {
        const templ = this.viewerList[idx];
        if (!templ) return;
        const inDeck = this.preDeckCards.some(c => c && c.name === templ.name);
        openCardViewer({
          card: templ,
          list: this.viewerList,
          index: idx,
          actionLabel: inDeck ? i18nT('ars.remove') : i18nT('ars.equip'),
          onAction: (card) => {
            this.equipToDeck('card', card, null);
            const placed = this.preDeckCards.findIndex(c => c && c.name === card.name);
            if (placed >= 0) setTimeout(() => this.flashDeckSlot(placed), 80);
            return { close: true };
          }
        });
    }

    private flashDeckSlot(idx: number) {
        const slot = document.querySelector(`.ars-card-slot[data-idx="${idx}"]`) as HTMLElement | null;
        if (!slot) return;
        try {
          slot.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          gsap.fromTo(slot,
            { boxShadow: '0 0 0 rgba(255,215,0,0)' },
            { boxShadow: '0 0 26px rgba(255,215,0,0.95)', duration: 0.3, yoyo: true, repeat: 3 });
        } catch {}
    }

    private showArtifactViewer(skill: Skill) {
        const modal = document.getElementById('ars-artifact-modal')!;
        const content = document.getElementById('ars-artifact-content')!;

        content.innerHTML = `
            <!-- Close Button (X) -->
            <button style="position: absolute; top: 12px; right: 12px; width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(180deg, #5a4128, #2a1c0d); border: 3px solid #0e0903; color: #ffe9a8; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 3px 0 rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,236,190,0.35); text-shadow: 0 2px 0 #000;" onclick="document.getElementById('ars-artifact-modal').classList.remove('active')">X</button>
            
            <!-- Centered Circular Image -->
            <div style="width: 180px; height: 180px; border-radius: 50%; background-color: #111; background-size: cover; background-position: center; display:flex; align-items:center; justify-content:center; font-size: 5rem; margin: 0 auto 20px; border: 4px solid #d4af37; box-shadow: 0 6px 0 rgba(0,0,0,0.55), 0 0 28px rgba(212,175,55,0.45), inset 0 3px 8px rgba(255,236,190,0.25); ${skill.image ? `background-image:url('${skill.image}')` : ''}">${skill.image ? '' : skill.icon}</div>
            
            <!-- Type (Habilidade) -->
            <div style="font-size: 0.7rem; font-weight: 950; letter-spacing: 3px; color: #d4af37; margin-bottom: 8px; text-shadow: 0 2px 0 #000;">${i18nT('ars.ability')}</div>
            
            <div style="font-size: 1.25rem; font-weight: 950; margin-bottom: 10px; color: #ffe9a8; letter-spacing: 1px; text-shadow: -1px -1px 0 #2a1a00, 1px -1px 0 #2a1a00, -1px 1px 0 #2a1a00, 1px 1px 0 #2a1a00, 0 3px 0 rgba(0,0,0,0.6);">${skill.name}</div>
            
            <!-- Desc -->
            <div style="font-size: 0.95rem; line-height: 1.5; color: #fff; margin-bottom: 16px; text-shadow: 0 1px 0 #000;">
                ${skill.description}
            </div>
            
            <!-- Flavor -->
            ${skill.flavorText ? `
            <div style="font-size: 0.85rem; line-height: 1.4; margin-bottom: 24px; font-style: italic; color: #ffd76a; text-shadow: 0 1px 0 #000;">
                "${skill.flavorText}"
            </div>
            ` : '<div style="margin-bottom: 24px;"></div>'}
            
            <!-- Action Button -->
            <button class="equip-artifact" data-id="${skill.id}" style="width: 80%; padding: 13px; background: linear-gradient(180deg, #b8f54d 0%, #7ed321 38%, #4a9b1f 78%, #2c620d 100%); border: 3px solid #0e1f00; border-radius: 14px; font-size: 0.85rem; color: #0f1f00; font-weight: 950; letter-spacing: 2px; cursor: pointer; display: block; margin: 0 auto; box-shadow: 0 5px 0 rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.5); text-shadow: 0 1px 0 rgba(255,255,255,0.35);">${i18nT('ars.equipVerb')}</button>
        `;
        
        // Add listener to the specific equip button inside modal
        setTimeout(() => {
            const btn = content.querySelector('.equip-artifact') as HTMLElement;
            if (btn) {
                btn.addEventListener('click', () => {
                    const row = document.querySelector(`.ars-artifact-item[data-id="${skill.id}"]`) as HTMLElement;
                    if (row) {
                        this.equipToDeck('artifact', skill, row);
                        modal.classList.remove('active');
                    }
                });
            }
        }, 10);
        
        modal.classList.add('active');
        gsap.fromTo(content, { scale: 0.8, opacity: 0, y: 30 }, { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' });
    }
}
