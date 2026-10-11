import { Card } from '../../../../core/GameEngine';
import { CARD_ABILITIES } from '../../../../core/constants';
import './PremiumCard.css';

export function renderPremiumCard(c: Card): string {
    const ab = c.abilityId && c.abilityId !== 'none' ? CARD_ABILITIES.find(a => a.id === c.abilityId) : null;
    
    // Attacks logic: 3 slots for standard, 4th for special
    const attacks = c.attacks || [];
    const attackSlots = [];
    for (let i = 0; i < 3; i++) {
        const atk = attacks[i];
        if (atk) {
            const dmg = atk.damage ?? 0;
            attackSlots.push(`
                <div class="premium-atk-capsule">
                    <span class="premium-atk-value">${dmg > 0 ? dmg : 'FX'}</span>
                    <span class="premium-atk-cost ${atk.costType || 'stamina'}">${atk.costType === 'mana' ? '💎' : '⚡'}${atk.cost}</span>
                </div>
            `);
        } else {
            attackSlots.push(`<div class="premium-atk-capsule empty"></div>`);
        }
    }
    if (c.specialAttack) {
        const sp = c.specialAttack;
        attackSlots.push(`
            <div class="premium-atk-capsule special">
                <span class="premium-atk-value">${sp.damage || 'ULTI'}</span>
                <span class="premium-atk-cost ${sp.costType || 'mana'}">${sp.costType === 'mana' ? '💎' : '⚡'}${sp.cost}</span>
            </div>
        `);
    } else {
        attackSlots.push(`<div class="premium-atk-capsule empty"></div>`);
    }

    const borderStyle = `border: ${c.borderWidth || 1}px solid ${c.borderColor || '#ffffff'}; box-shadow: 0 0 ${c.glowIntensity || 10}px ${c.glowColor || '#51c5ff'};`;
    
    // FILTER LOGIC (STATIC & ANIMATED)
    let filterStyle = '';
    let filterClass = '';
    
    if (c.imageFilter && c.imageFilter !== 'none') {
        const intVal = c.imageFilterIntensity || 50;
        // Animated filters use CSS classes defined in PremiumCard.css
        if (['vhs', 'chroma', 'wave', 'pulse_hue'].includes(c.imageFilter)) {
            filterClass = c.imageFilter.replace('_', '-') + '-fx';
        } else {
            // Static filters use inline styles
            if (c.imageFilter === 'hue-rotate') filterStyle = `filter: hue-rotate(${intVal * 3.6}deg)`;
            else if (c.imageFilter === 'grayscale') filterStyle = `filter: grayscale(${intVal}%)`;
            else if (c.imageFilter === 'sepia') filterStyle = `filter: sepia(${intVal}%)`;
            else if (c.imageFilter === 'invert') filterStyle = `filter: invert(${intVal}%)`;
            else if (c.imageFilter === 'brightness') filterStyle = `filter: brightness(${1 + intVal/100})`;
            else if (c.imageFilter === 'contrast') filterStyle = `filter: contrast(${1 + intVal/100})`;
        }
    }

    return `
        <div class="premium-card-container" style="${borderStyle}">
            <div class="premium-card-art ${filterClass}" style="background-image: url('${c.image}'); ${filterStyle}"></div>
            
            ${c.patternOverlay ? `
                <div class="premium-card-pattern" style="background-image: ${c.patternOverlay};"></div>
            ` : ''}

            ${(c.parallaxLayers || []).map(ly => `
                <div class="premium-parallax-layer" data-layer-id="${ly.id}" style="
                    background-image: url('${ly.url}');
                    z-index: ${ly.z || 5};
                    opacity: ${ly.opacity || 1};
                    mix-blend-mode: ${ly.blendMode || 'normal'};
                    transform: scale(${ly.scale || 1}) translate(${ly.initialX || 0}px, ${ly.initialY || 0}px);
                    ${ly.imageFilter ? `filter: ${ly.imageFilter};` : ''}
                " data-speed="${ly.speed || 1}"></div>
            `).join('')}

            ${c.reflectiveGlow ? `
                <div class="reflective-gloss-overlay"></div>
            ` : ''}

            <div class="card-particle-layer"></div>
            
            <div class="premium-card-overlay">
                <!-- TOP BAR -->
                <div class="premium-top-bar">
                    <div class="premium-cost-wrapper">
                        <div class="premium-cost-badge">${c.manaCost || 1}</div>
                        <div class="premium-cost-label">MANA</div>
                    </div>
                    <div class="premium-card-name-title" style="font-family:'${c.fontFamily || 'Outfit'}'; color:${c.fontColor || '#ffffff'}; font-size:${(c.fontSizeBase || 16) / 16}rem;">${c.name.toUpperCase()}</div>
                    <div class="premium-pv-wrapper">
                        <div class="premium-pv-badge">${c.pv || c.maxPv || 0}</div>
                        <div class="premium-pv-label">PV</div>
                    </div>
                </div>

                <!-- MIDDLE CONTENT -->
                <div class="premium-middle-content">
                    <div class="premium-desc-box">
                        <div class="premium-card-description" style="font-family:'${c.fontFamily || 'Outfit'}';">
                            ${c.flavorText || 'Uma relíquia das lendas de inverno.'}
                        </div>
                        ${ab ? `
                            <div class="premium-passive-badge">
                                <span>${ab.icon} ${ab.name.toUpperCase()}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- BOTTOM BAR -->
                <div class="premium-bottom-bar">
                    ${attackSlots.join('')}
                </div>
            </div>
        </div>
    `;
}

export function renderHandCardPremium(c: Card): string {
    return `
        <div class="premium-card-container hand-variant card-face" data-id="${c.id}" style="border: 1px solid ${c.borderColor || 'rgba(255,255,255,0.1)'};">
            <div class="premium-card-art" style="background-image: url('${c.image}')"></div>
            <div class="premium-badge-row">
                <div class="premium-cost-badge solid">${c.manaCost || 1}</div>
                <div class="premium-pv-badge solid">${c.pv || c.maxPv || 0}</div>
            </div>
        </div>
    `;
}

export function renderFieldCardPremium(c: Card, isEnemy: boolean): string {
    if (c.isFlipped) {
        return `
            <div class="premium-card-container field-variant ${isEnemy ? 'enemy' : ''} flipped card-face" data-id="${c.id}">
                <div class="premium-card-art card-back"${c.cardBack ? ` style="background-image:url('${c.cardBack}'); filter:none;"` : ''}></div>
            </div>
        `;
    }

    let filterClass = '';
    if (c.imageFilter && ['vhs', 'chroma', 'wave', 'pulse_hue'].includes(c.imageFilter)) {
        filterClass = c.imageFilter.replace('_', '-') + '-fx';
    }

    const attacks = c.attacks || [];
    const attackSlots = [];
    for (let i = 0; i < 3; i++) {
        const atk = attacks[i];
        if (atk) {
            attackSlots.push(`<div class="atk-pill"><span>${atk.damage || 'FX'}</span><small class="${atk.costType || 'stamina'}">${atk.cost}</small></div>`);
        } else {
            attackSlots.push(`<div class="atk-pill empty"></div>`);
        }
    }
    if (c.specialAttack) {
        const sp = c.specialAttack;
        attackSlots.push(`<div class="atk-pill special"><span>${sp.damage || 'ULTI'}</span><small class="${sp.costType || 'mana'}">${sp.cost}</small></div>`);
    } else {
        attackSlots.push(`<div class="atk-pill empty"></div>`);
    }

    return `
        <div class="field-card-main-container card-face" data-id="${c.id}">
            <div class="art-card-box ${isEnemy ? 'enemy' : ''}" style="border-color: ${c.borderColor || 'rgba(255,255,255,0.2)'};">
                <div class="premium-card-art ${filterClass}" style="background-image: url('${c.image}')"></div>
                ${c.patternOverlay ? `<div class="premium-card-pattern" style="background-image: ${c.patternOverlay}; opacity:0.1; transform:scale(0.5);"></div>` : ''}
                ${c.reflectiveGlow ? `<div class="reflective-gloss-overlay" style="opacity:0.4;"></div>` : ''}
                <div class="premium-badge-row ${isEnemy ? 'right' : ''}">
                    ${!isEnemy ? `<div class="premium-cost-badge solid">${c.manaCost || 1}</div>` : ''}
                    <div class="premium-pv-badge solid ${isEnemy ? 'enemy' : ''}">${c.pv || c.maxPv || 0}</div>
                </div>
            </div>
            ${!isEnemy ? `
            <div class="attacks-footer-grid">
                ${attackSlots.join('')}
            </div>
            ` : ''}
        </div>
    `;
}
