import { Card } from '../../../../core/GameEngine';
import './PremiumCard.css';
import { renderMatrixCardSVG, renderMatrixCardBackSVG } from './HestridiaMatrixRenderer';

export function renderPremiumCard(c: Card): string {
    return `
        <div class="premium-card-container matrix-frame-mode card-face" data-id="${c.id}" style="width:min(380px, 86vw, calc(86dvh * 680 / 990)); max-width:100%; max-height:86dvh; height:auto; aspect-ratio:680/990; margin:0 auto; background:transparent; box-shadow:0 25px 60px rgba(0,0,0,0.85); border-radius:14px; overflow:hidden;">
            ${renderMatrixCardSVG(c, { mode: 'full', animateChroma: true })}
        </div>
    `;
}

export function renderHandCardPremium(c: Card): string {
    return `
        <div class="premium-card-container hand-variant matrix-frame-mode card-face" data-id="${c.id}" style="width:100%; height:100%; aspect-ratio:680/990; background:transparent; border-radius:12px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.6);">
            ${renderMatrixCardSVG(c, { mode: 'hand', animateChroma: true })}
        </div>
    `;
}

export function renderFieldCardPremium(c: Card, isEnemy: boolean): string {
    if (c.isFlipped) {
        return `
            <div class="field-card-main-container matrix-frame-mode card-face ${isEnemy ? 'enemy' : ''} flipped" data-id="${c.id}" style="width:100%; height:100%; aspect-ratio:680/990; border-radius:12px; overflow:hidden;">
                ${renderMatrixCardBackSVG(c)}
            </div>
        `;
    }

    return `
        <div class="field-card-main-container matrix-frame-mode card-face ${isEnemy ? 'enemy' : ''}" data-id="${c.id}" style="width:100%; height:100%; aspect-ratio:680/990; border-radius:12px; overflow:hidden; box-shadow:0 12px 30px rgba(0,0,0,0.7);">
            ${renderMatrixCardSVG(c, { mode: 'field', isEnemy, animateChroma: true })}
        </div>
    `;
}
