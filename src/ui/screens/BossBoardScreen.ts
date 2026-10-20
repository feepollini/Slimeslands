import { Card } from '../../core/GameEngine';
import { RARITIES, CARD_ABILITIES, getGlobalCardBack } from '../../core/constants';
import type { Rarity } from '../../core/types';
import { renderHandCardPremium, renderFieldCardPremium } from './forge_v2/utils/PremiumCardRenderer';
import { renderMatrixCardBackSVG } from './forge_v2/utils/HestridiaMatrixRenderer';
import { t } from '../../core/i18n';
import { DuelControlsPanel } from '../components/DuelControlsPanel';
import { Mobby } from '../../core/MobbyManager';

export class BossBoardScreen {

  public render(
    board: (Card | null)[],
    hp: { p: number; e: number },
    mana: { p: number; e: number },
    stamina: { p: number; e: number },
    turn: string,
    timer: number,
    grave: Card[],
    deckCount: number,
    mobby: Mobby
  ): string {
    const topGraveCard = grave.length > 0 ? grave[grave.length - 1] : null;
    const playerPct = Math.max(0, Math.min(100, (hp.p / 1500) * 100));
    const enemyPct = Math.max(0, Math.min(100, (hp.e / (mobby.maxHp || 280)) * 100));

    return `
      <div class="battle-screen">

        <!-- HEADER OFICIAL DO JOGO COM A BARRA DE VIDA DO INIMIGO / CHEFE -->
        <header class="game-header">
          <!-- JOGADOR (ESQUERDA) -->
          <div class="header-side player-side">
            <div class="player-icon player">
              <div class="player-icon-inner"></div>
            </div>
            <div class="header-bars">
              <div class="header-name-text player">
                <span class="name-label">${t('board.you')}</span>
              </div>
              <div class="pv-bar-container hifi-pv player">
                <div class="pv-bar-fill player" id="bar-p" style="width:${playerPct}%">
                  <span class="pv-label-inner" id="hp-p">${hp.p} ${t('board.pv')}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- CENTRO (AÇÕES NO TOPO, ÍCONE DE DUELO EMBAIXO) -->
          <div class="header-center">
            <div id="action-hud" class="action-hud-pill">
              <span class="action-hud-title">${t('board.actions')}</span>
              <span id="actions-count" class="action-hud-count">1</span>
            </div>
            <button class="btn-surrender" id="btn-surrender" title="${t('board.surrender')}">
              <span class="icon-wrap">⚔️</span>
            </button>
          </div>

          <!-- OPONENTE / CHEFE COM SUA BARRA DE VIDA (DIREITA) -->
          <div class="header-side enemy-side">
            <div class="header-bars">
              <div class="header-name-text enemy">
                <span class="name-label" id="boss-name-label">${mobby.name}</span>
              </div>
              <div class="pv-bar-container hifi-pv enemy">
                <div class="pv-bar-fill enemy" id="bar-e" style="width:${enemyPct}%">
                  <span class="pv-label-inner" id="hp-e">${hp.e} / ${mobby.maxHp}</span>
                </div>
              </div>
            </div>
            <div class="player-icon enemy" style="background-image:url('${mobby.image}'); background-size:cover; background-position:center;">
              <div class="player-icon-inner"></div>
            </div>
          </div>
        </header>

        <!-- BOARD (OFICIAL, TROCANDO AS 3 CARTAS DO TOPO POR 1 ASSET PNG DE GELATINA) -->
        <section class="board-area">
          <div class="capsules-container enemy-capsules">
            ${this.renderSideCapsules('e', board)}
          </div>
          
          <div class="board-grid-hifi boss-grid-3x1" id="board">
            <!-- TOPO: AS 3 CARTAS DO OPONENTE TROCADAS POR UMA: ASSET PNG COM ANIMAÇÃO DE GELATINA -->
            <div class="boss-single-slot-wrap" id="boss-sprite-slot" title="Clique para atacar o Chefe!">
              <div class="boss-aura-fx"></div>
              <div id="boss-sprite-transform-wrap" style="
                transform: translate(${mobby.offsetX || 0}px, ${mobby.offsetY || 0}px) rotate(${mobby.rotation || 0}deg) scale(${(mobby.scale || 100) / 100});
                display: inline-flex; align-items: center; justify-content: center; transform-origin: bottom center;
                pointer-events: auto;
              ">
                <img id="mobby-sprite" class="boss-jelly-asset" src="${mobby.image}" alt="${mobby.name}" />
              </div>
            </div>

            <!-- BASE: AS 3 CARTAS DO JOGADOR NO TABULEIRO (SLOTS 3, 4, 5) -->
            ${[3, 4, 5].map(i => `
              <div class="slot slot-p" data-idx="${i}">
                ${board[i] ? this.renderCard(board[i]!) : ''}
              </div>
            `).join('')}
          </div>

          <div class="capsules-container player-capsules">
            ${this.renderSideCapsules('p', board)}
          </div>
        </section>

        <!-- ALÇA DE INCENTIVO AO ATAQUE (FORA DA SEÇÃO E CENTRALIZADA) -->
        <div class="attack-prompt-wrapper">
          <button class="attack-prompt-handle ${turn !== 'p' ? 'hidden' : ''}" id="btn-attack-prompt" title="${t('board.attack')}">
            <span class="handle-icon">⚔️</span>
            <span class="handle-text">${t('board.attack')}</span>
          </button>
        </div>

        <!-- MANAGEMENT: CONTAINER PAI DE VIDRO DE LADO A LADO -->
        <section class="management-hifi" id="management-hifi">
          <!-- SLIDE 1: CEMITÉRIO + CONTROLES + DECK (DESLIZAM JUNTOS) -->
          <div class="management-slide default-slide" id="management-default-slide">
            <div class="management-column side-left">
              ${this.renderStackSlot('grave', grave.length, topGraveCard?.image)}
            </div>

            <!-- CONTROLS PANEL COMPONENT (VIDRO COM BARRAS, ARTEFATOS E BOTÃO DE TURNO) -->
            ${DuelControlsPanel.render({ mana, stamina, timer, turn })}

            <div class="management-column side-right">
              ${this.renderStackSlot('deck', deckCount, getGlobalCardBack(), true)}
            </div>
          </div>

          <!-- SLIDE 2: QUICK ACTIONS (OCUPA O CONTAINER DE VIDRO COM BOTÕES OTIMIZADOS) -->
          <div class="management-slide actions-slide" id="management-actions-slide">
            <!-- INLINE ACTION BAR (ATAQUES, SACRIFÍCIO E FECHAR) -->
            <div id="inline-action-bar" class="inline-action-bar">
              <div class="actions-panel-content">
                <div class="atk-options-group" id="atk-options-root">
                  <button class="inline-btn-capsule atk" id="act-atk-0">ATK 1</button>
                  <button class="inline-btn-capsule atk" id="act-atk-1">ATK 2</button>
                  <button class="inline-btn-capsule atk" id="act-atk-2">ATK 3</button>
                </div>
                <div class="action-sub-row">
                  <button class="inline-btn-capsule sac" id="act-sac">💀 ${t('board.sac')}</button>
                  <button class="inline-btn-capsule can" id="act-can">✕</button>
                </div>
              </div>
            </div>

            <!-- INLINE SKILL BAR -->
            <div id="inline-skill-bar" class="inline-action-bar">
              <div class="actions-panel-content skill-content">
                <button class="inline-btn-capsule atk" id="skill-confirm">✨ ${t('board.useNow')}</button>
                <button class="inline-btn-capsule can" id="skill-cancel">✕</button>
              </div>
            </div>
          </div>
        </section>

        <!-- HAND -->
        <footer class="hand-area-hifi">
          <div id="hand" class="hand-cards-row"></div>
        </footer>

        <div id="banner" class="banner-message"></div>
        <div id="particle-container"></div>
        <div id="float-container" style="position:fixed;inset:0;pointer-events:none;z-index:9000"></div>

        <!-- BATTLE OVERLAYS -->
        <div id="battle-overlays">
          <!-- Overlay: Carousel -->
          <div class="overlay" id="overlay-carousel">
            <div class="carousel-container" id="carousel-list"></div>
          </div>

          <!-- Overlay: Full screen card -->
          <div class="overlay" id="overlay-fullscreen" style="background:rgba(0,0,0,0.96)">
            <div class="fullscreen-card-wrap" id="fullscreen-card-inner"></div>
          </div>

          <!-- Overlay: Generic Confirm -->
          <div class="overlay" id="overlay-confirm">
            <div class="dialog-box" style="text-align:center; padding-bottom: 20px;">
              <div class="action-card-name" id="confirm-title" style="margin-bottom:10px;">${t('board.confirm')}</div>
              <div id="confirm-msg" style="font-size:0.9rem; font-weight:700; color:#fff; margin-bottom:20px; line-height:1.4;">${t('board.confirmDef')}</div>
              <div style="display:flex; gap:10px; justify-content:center;">
                <button class="action-btn btn-atk" id="confirm-yes" style="flex:1;">${t('board.yes')}</button>
                <button class="action-btn btn-can" id="confirm-no" style="flex:1;">${t('board.no')}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Parry System Overlay -->
        <div class="parry-overlay" id="parry-overlay">
          <div class="parry-visual-container">
            <div class="parry-glow-wave"></div>
            <div class="parry-circle-target"></div>
            <div id="parry-outer" class="parry-circle-outer"></div>
          </div>
          <div id="parry-feedback" class="parry-feedback">${t('board.perfect')}</div>
        </div>

      </div>
    `;
  }

  public renderCard(c: Card): string {
    const isEnemy = c.owner === 'e';
    return renderFieldCardPremium(c, isEnemy);
  }

  public renderHandCard(c: Card): string {
    return renderHandCardPremium(c);
  }

  public renderStackSlot(id: string, count: number, imageUrl?: string, isDeck: boolean = false): string {
    if (isDeck) {
      return `
        <div class="deck-back-slot" id="${id}-slot">
          <div class="stack-fill" style="width:100%; height:100%; position:absolute; top:0; left:0; border-radius:10px; overflow:hidden;">
            ${renderMatrixCardBackSVG()}
          </div>
          <div class="stack-count" id="count-${id}">${count}</div>
        </div>
      `;
    }
    const fillStyle = imageUrl 
      ? `background-image:url('${imageUrl}'); background-size:cover; background-position:center;` 
      : `background:rgba(30,30,30,0.4);`;
    const filter = imageUrl ? 'filter: saturate(0.8) brightness(0.8);' : '';
    
    return `
      <div class="sepulture-slot" id="${id}-slot">
        <div class="stack-fill" style="width:100%; height:100%; position:absolute; top:0; left:0; ${fillStyle} ${filter}"></div>
        <div class="stack-count" id="count-${id}">${count}</div>
      </div>
    `;
  }

  public renderSideCapsules(owner: 'p' | 'e', board: (Card | null)[]): string {
    const statuses: { label: string; icon: string; timer?: number; isBuff: boolean }[] = [];
    
    board.forEach(card => {
      if (!card || card.owner !== owner) return;
      const n = card.name.split(' ')[0].substring(0, 8);
      if (card.isStunned && card.stunTurns) statuses.push({ label: `${n} ${t('board.st.stun')}`, icon: '⚡', timer: card.stunTurns, isBuff: false });
      if (card.poisonTurns && card.poisonTurns > 0) statuses.push({ label: `${n} ${t('board.st.poison')}`, icon: '☠️', timer: card.poisonTurns, isBuff: false });
      if (card.shieldActive) statuses.push({ label: `${n} ${t('board.st.shield')}`, icon: '🛡️', isBuff: true });
      if (card.burnTurns && card.burnTurns > 0) statuses.push({ label: `${n} ${t('board.st.burn')}`, icon: '🔥', timer: card.burnTurns, isBuff: false });
      if (card.regenTurns && card.regenTurns > 0) statuses.push({ label: `${n} ${t('board.st.regen')}`, icon: '💚', timer: card.regenTurns, isBuff: true });
    });

    if (statuses.length === 0) return '';

    return statuses.map(s => `
      <div class="side-capsule ${s.isBuff ? 'buff' : 'debuff'}">
        <div class="side-capsule-icon">${s.icon}</div>
        <div class="side-capsule-label">${s.label.toUpperCase()}</div>
        ${s.timer !== undefined ? `<div class="side-capsule-timer">${s.timer}</div>` : ''}
      </div>
    `).join('');
  }

  public renderSkillSlots(skills: any[]): void {
    skills.forEach((s, i) => {
      const slot = document.querySelector(`[data-skill-idx="${i}"]`) as HTMLElement;
      if (!slot) return;
      if (s) {
        if (s.image) {
          slot.innerHTML = '';
          slot.style.backgroundImage = `url('${s.image}')`;
          slot.style.backgroundSize = 'cover';
          slot.style.backgroundPosition = 'center';
        } else {
          slot.innerHTML = `<span class="art-icon">${s.icon}</span>`;
          slot.style.backgroundImage = 'none';
        }
        slot.classList.remove('art-empty');
        slot.title = `${s.name} (${s.group})`;
      } else {
        slot.innerHTML = '?'; slot.classList.add('art-empty'); slot.title = t('board.empty');
        slot.style.backgroundImage = 'none';
      }
    });
  }

  public updateAttributeBars(engine: { hp: any, mana: any, stamina: any, maxMana?: number, maxStamina?: number }): void {
    const hp = engine.hp;
    const barP = document.getElementById('bar-p') as HTMLElement;
    const barE = document.getElementById('bar-e') as HTMLElement;
    const hpP = document.getElementById('hp-p');
    const hpE = document.getElementById('hp-e');
    if (barP) barP.style.width = `${Math.max(0, (hp.p / 1500) * 100)}%`;
    if (barE) barE.style.width = `${Math.max(0, (hp.e / 1500) * 100)}%`;
    if (hpP) hpP.textContent = `${hp.p} ${t('board.pv')}`;
    if (hpE) hpE.textContent = `${hp.e} ${t('board.pv')}`;

    const manaFill = document.getElementById('segments-mana-fill') as HTMLElement | null;
    if (manaFill) manaFill.style.width = `${Math.max(0, Math.min(1, engine.mana.p / (engine.maxMana || 9))) * 100}%`;
    const stamFill = document.getElementById('segments-stam-fill') as HTMLElement | null;
    if (stamFill) stamFill.style.width = `${Math.max(0, Math.min(1, engine.stamina.p / (engine.maxStamina || 9))) * 100}%`;
  }
}

