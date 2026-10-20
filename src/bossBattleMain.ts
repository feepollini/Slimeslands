import './style.css';
import './ui/styles/Battle.css';
import './ui/styles/BossBattle.css';
import './ui/screens/forge_v2/utils/PremiumCard.css';
import { gsap } from 'gsap';
import { GameEngine, Card } from './core/GameEngine';
import { GameAI, AIDifficulty } from './core/GameAI';
import { ProgressionManager } from './core/ProgressionManager';
import { BossBoardScreen } from './ui/screens/BossBoardScreen';
import { Mobby, MobbyManager } from './core/MobbyManager';
import SCENARIOS from './core/scenarios.json';
import { applyScenarioBackground, isVideoUrl } from './ui/utils/BackgroundUtils';
import { t } from './core/i18n';
import { animateParallaxLayers } from './ui/utils/ParallaxUtils';
import { SoundManager } from './ui/utils/SoundManager';
import { autoFullscreen } from './ui/utils/fullscreen';
import * as FX from './ui/utils/BattleAnimations';
import { ENCHANTMENT_REGISTRY } from './core/enchantments';
import { CARD_ABILITIES, getGlobalCardBack, CARD_TEMPLATES } from './core/constants';
import { renderPremiumCard } from './ui/screens/forge_v2/utils/PremiumCardRenderer';
import {
  renderMatrixCardBackSVG,
  getMergedGameTemplates,
  resolveMatrixOrGameCard,
} from './ui/screens/forge_v2/utils/HestridiaMatrixRenderer';

// Helper to cast FX functions
const { spawnParticles, deathExplosion, spawnFloatingText, triggerAbilityAnim, animateCapsulePv } = FX;

function bindLongPress(el: HTMLElement, callback: () => void, ms = 650) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let moved = false;
  const start = () => { moved = false; timer = setTimeout(() => { if (!moved) callback(); }, ms); };
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  const onMove = () => { moved = true; cancel(); };
  el.addEventListener('mousedown', start);
  el.addEventListener('touchstart', start, { passive: true });
  el.addEventListener('mouseup', cancel);
  el.addEventListener('mouseleave', cancel);
  el.addEventListener('touchmove', onMove, { passive: true });
  el.addEventListener('touchend', cancel);
}

// ─── BOSS BATTLE APP (DUPLICAÇÃO COMPLETA DO MOTOR OFICIAL) ───────────────────

class BossBattleApp {
  private engine: GameEngine;
  private board: BossBoardScreen;
  private container: HTMLElement;
  private mobby: Mobby;
  private timer = 60;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private selectedSlotIdx: number | null = null;
  private selectedAttackIdx: number = 0;
  private selectedHandCard: Card | null = null;
  private isTargeting = false;
  private isTargetingSkill: number | null = null;
  private difficulty: AIDifficulty = 'easy';
  private aiLogic = new GameAI();
  private isAIProcessing = false;

  constructor() {
    this.container = document.getElementById('battle-root')!;
    this.engine = new GameEngine();
    this.board = new BossBoardScreen();

    // Carregar Mobby selecionado
    const params = new URLSearchParams(window.location.search);
    const mobbyId = params.get('mobby') || '';
    this.mobby = MobbyManager.getMobbyById(mobbyId) || MobbyManager.getMobbys()[0];

    this.initPreBattle();
    gsap.fromTo(document.body, { opacity: 0 }, { opacity: 1, duration: 0.5 });
  }

  private initPreBattle() {
    this.init('p');
  }

  private resolveBossScenarioBackground(): string {
    if (this.mobby.backgroundUrl) return this.mobby.backgroundUrl;
    try {
      const raw = localStorage.getItem('forge_scenarios');
      if (raw) {
        const data = JSON.parse(raw);
        if (data && this.mobby && data[`boss_mobby_${this.mobby.id}`]) {
          return data[`boss_mobby_${this.mobby.id}`];
        }
        if (data && data.boss_battle) return data.boss_battle;
      }
    } catch (_) {}
    return (SCENARIOS as any).boss_battle || (SCENARIOS as any).battle || (SCENARIOS as any).lobby;
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────

  private async init(starterTurn?: 'p' | 'e') {
    await getMergedGameTemplates(CARD_TEMPLATES).catch(() => {});
    try {
      const raw = localStorage.getItem('battle_prep');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.skills) {
          this.engine.selectedSkills = data.skills.map((s: any) => ({
            ...s,
            id: s.id || `skill-${Math.random()}`,
            name: s.name || t('bt.skill'),
            icon: s.icon || '✨',
            description: s.description || '',
            category: s.category || 'combat',
            group: s.group || 'general',
            flavorText: s.flavorText || '',
            effect: s.effect || 'none',
            value: s.value || 0
          }));
        }
        if (data.cards && data.cards.length > 0) {
          const pDeck = data.cards.map((c: any) => {
            const resolved = resolveMatrixOrGameCard(c?.name || c?.id || '', CARD_TEMPLATES) || c;
            const atk = resolved.baseAtk || resolved.atk || c.baseAtk || c.atk || 100;
            const pv = resolved.basePv || resolved.pv || c.basePv || c.pv || 500;
            return {
              ...resolved,
              ...c,
              id: `p-${Math.random().toString(36).substr(2, 9)}`,
              owner: 'p' as const,
              atk,
              pv,
              maxPv: pv,
              rarity: resolved.preferredRarity || resolved.rarity || c.preferredRarity || c.rarity || 'common',
              manaCost: resolved.manaCost ?? c.manaCost ?? 1,
              staminaCost: resolved.staminaCost ?? c.staminaCost ?? 1,
              attacks: resolved.attacks || c.attacks || [{ name: 'ATAQUE', damage: atk, cost: 1, costType: 'stamina' }],
              specialAttack: resolved.specialAttack || c.specialAttack,
              matrixCard: resolved.matrixCard || resolved.cardData || c.matrixCard || c.cardData,
            };
          });
          this.engine.initBattle(pDeck);
        } else {
          this.engine.initBattle();
        }
        if (this.mobby.bgmUrl) {
          SoundManager.playTrackUrl(this.mobby.bgmUrl);
        } else {
          SoundManager.playAmbient('batalha');
        }
        applyScenarioBackground(this.resolveBossScenarioBackground());
      } else {
        this.engine.initBattle();
        applyScenarioBackground(this.resolveBossScenarioBackground());
      }
    } catch (e) {
      console.error("Battle Init Error:", e);
      this.engine.initBattle();
      applyScenarioBackground(this.resolveBossScenarioBackground());
    }

    // Configurar os PV do inimigo com os dados do Chefe
    this.engine.hp.e = this.mobby.hp;

    // Inicia normalmente com as 3 cartas na mão sorteadas pelo initBattle()
    if (this.engine.hand.length === 0) {
      for (let i = 0; i < 3; i++) this.engine.draw();
    }

    if (starterTurn) this.engine.turn = starterTurn;

    this.render();
    this.startTimer();
    setTimeout(() => {
      this.showBanner(this.engine.turn === 'p' ? t('bt.yourTurn') : t('bt.aiTurn'));
      if (this.engine.turn === 'e') {
        setTimeout(() => this.runAI(), 1200);
      }
    }, 120);
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  private render() {
    this.container.innerHTML = this.board.render(
      this.engine.board, this.engine.hp, this.engine.mana, this.engine.stamina, this.engine.turn, this.timer, this.engine.grave, this.engine.deck.length, this.mobby
    );
    this.bindBattleEvents();
    this.board.renderSkillSlots(this.engine.activeSkills);
    const hud = document.getElementById('action-hud');
    const actionCount = document.getElementById('actions-count');
    if (actionCount) {
      actionCount.textContent = `${this.engine.actionsLeft}`;
      if (hud) hud.style.color = this.engine.actionsLeft > 0 ? '#4cff88' : '#ff4444';
    }
    const promptBtn = document.getElementById('btn-attack-prompt');
    if (promptBtn) {
      const hasPlayerCards = [3, 4, 5].some(idx => !!this.engine.board[idx]);
      if (this.engine.turn === 'p' && hasPlayerCards) {
        promptBtn.classList.remove('hidden');
      } else {
        promptBtn.classList.add('hidden');
      }
    }
    this.rebuildHand();
  }

  private rebuildHand() {
    const handCont = document.getElementById('hand');
    if (!handCont) return;
    handCont.innerHTML = '';
    const n = this.engine.hand.length;
    this.engine.hand.forEach((c: Card, i: number) => {
      const el = document.createElement('div');
      el.className = 'hand-card-hifi';
      el.setAttribute('data-id', c.id);
      el.setAttribute('style', 'touch-action:manipulation');

      // Dynamic Alignment Calculation
      const center = (n - 1) / 2;
      const offset = i - center;
      const rot = offset * 12; // 12 deg step
      const tx = offset * 45;  // 45px X step
      const ty = Math.abs(offset) * 8; // 8px Y arc

      el.style.transform = `rotate(${rot}deg) translateX(${tx}px) translateY(${ty}px)`;
      el.style.zIndex = `${100 - Math.abs(Math.round(offset * 2))}`;

      el.innerHTML = this.board.renderHandCard(c);
      handCont.appendChild(el);
      const select = (e: Event) => {
        e.stopPropagation();
        if (this.engine.turn !== 'p') return;
        this.selectHandCard(c, el);
      };
      el.addEventListener('click', (e) => {
        SoundManager.playAction('clique_geral', 0.3);
        select(e);
      });
      el.addEventListener('touchend', (e) => { 
        e.preventDefault(); 
        SoundManager.playAction('clique_geral', 0.3);
        select(e); 
      }, { passive: false });
      bindLongPress(el, () => this.showFullscreen(c));
    });
  }

  // ─── EVENTS ───────────────────────────────────────────────────────────────

  private bindBattleEvents() {
    document.getElementById('btn-end')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.4);
      if (this.engine.turn === 'p') {
        const mini = document.getElementById('mini-end-confirm');
        if (mini) mini.classList.toggle('active');
      }
    });
    document.getElementById('btn-end-yes')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.4);
      document.getElementById('mini-end-confirm')?.classList.remove('active');
      this.handleEndTurn();
    });
    document.getElementById('btn-end-no')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.4);
      document.getElementById('mini-end-confirm')?.classList.remove('active');
    });

    document.getElementById('btn-attack-prompt')?.addEventListener('click', (e) => {
      e.stopPropagation();
      SoundManager.playAction('clique_geral', 0.4);
      if (this.engine.turn !== 'p' || this.isTargeting) return;
      const lastCardIdx = [5, 4, 3].find(idx => !!this.engine.board[idx]);
      if (lastCardIdx !== undefined) {
        this.openAction(lastCardIdx);
      } else {
        this.showBanner('⚠️ ' + t('bt.noCardsField'));
      }
    });

    document.getElementById('btn-surrender')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.4);
      this.confirmAction(t('bt.giveUp'), t('bt.giveUpMsg'), () => {
        SoundManager.playAction('rendicao_confirm', 0.6);
        this.triggerEndScreen(false, true);
      });
    });
    document.getElementById('act-atk')?.addEventListener('click', () => {
      SoundManager.playAction('atk_basico_1', 0.4);
      this.startTargeting();
    });
    document.getElementById('act-sac')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.4);
      this.handleSacrifice();
    });
    document.getElementById('act-can')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.4);
      this.closeAction();
    });

    document.querySelectorAll('.art-slot[data-skill-idx]').forEach(slot => {
      slot.addEventListener('click', () => {
        if (this.engine.turn !== 'p') return;
        const idx = parseInt((slot as HTMLElement).dataset.skillIdx!);
        if (this.engine.activeSkills[idx]) {
          SoundManager.playAction('clique_geral', 0.4);
          this.openSkillDialog(idx);
        }
      });
    });

    document.querySelectorAll('.slot-p').forEach(slot => {
      const el = slot as HTMLElement;
      const idx = parseInt(el.dataset.idx!);
      const cardFace = el.querySelector('.card-face') as HTMLElement | null;
      if (cardFace) {
        cardFace.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.engine.turn !== 'p' || this.isTargeting || this.isTargetingSkill !== null) return;
          SoundManager.playAction('clique_geral', 0.4);
          this.openAction(idx);
        });
        const card = this.engine.board[idx];
        if (card) bindLongPress(cardFace, () => this.showFullscreen(card));
      }
      el.addEventListener('click', () => {
        if (this.isTargeting) {
           this.resolveAttack(idx);
        } else if (this.selectedHandCard && !this.engine.board[idx] && this.engine.turn === 'p') {
           SoundManager.playAction('carta_sacada', 0.5);
           this.placeHandCard(idx);
        }
      });
    });

    const deckEl = document.querySelector('.deck-back-slot');
    if (deckEl) {
      deckEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handlePlayerDrawClick();
      });
    }

    // SLOTE DO CHEFE (SUBSTITUI OS 3 SLOTS DO INIMIGO)
    const bossSlot = document.getElementById('boss-sprite-slot');
    if (bossSlot) {
      if (this.isTargeting || this.isTargetingSkill !== null) {
        bossSlot.classList.add('targetable');
      }

      bossSlot.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (this.isTargeting) {
          this.resolveAttack(0); // Ataca o Chefe no topo
        } else if (this.isTargetingSkill !== null) {
          this.resolveSkillOnTarget(0);
        }
      });
    }
  }

  private resolveSkillOnTarget(_eIdx: number) {
    if (this.isTargetingSkill === null) return;
    const sIdx = this.isTargetingSkill;
    try {
      const res = this.engine.useSkill(sIdx, 0);
      this.showBanner(res.message);
      this.board.updateAttributeBars(this.engine);
    } catch (_) {}
    this.isTargetingSkill = null;
    this.render();
    this.checkAutoEnd();
  }

  // ─── TURN LOGIC ───────────────────────────────────────────────────────────

  private handleEndTurn() {
    this.stopTimer();
    this.clearHandSelection();

    const side = this.engine.turn;
    const nextSide = side === 'p' ? 'e' : 'p';
    const preMana = this.engine.mana[nextSide];

    this.engine.endTurn();

    const postMana = this.engine.mana[nextSide];
    if (preMana !== postMana) {
      FX.animateManaChange(nextSide, preMana, postMana);
    }
    this.isTargeting = false;
    this.isTargetingSkill = null;
    this.selectedSlotIdx = null;

    if (this.engine.turn === 'e') {
      this.showBanner(t('bt.oppTurn'));
      this.render();
      setTimeout(() => this.runAI(), 900);
    } else {
      this.render();
      this.startTimer();
      this.showBanner(t('bt.yourTurn'));
    }
  }

  private isGameOver(): boolean {
    if (this.engine.hp.p <= 0) { this.triggerEndScreen(false); return true; }
    if (this.engine.hp.e <= 0) { this.triggerBossDefeatTransformation(); return true; }
    
    const playerHasBoard = this.engine.board.slice(3,6).some(c => c !== null);
    const pDeckEmpty = this.engine.deck.length === 0;
    const pHandEmpty = this.engine.hand.length === 0;
    
    if (!playerHasBoard && pDeckEmpty && pHandEmpty) {
       this.triggerEndScreen(false); 
       return true;
    }
    return false;
  }

  // ─── ANIMAÇÃO CINEMATOGRÁFICA DE DERROTA DO CHEFE & TRANSFORMAÇÃO NA CARTA ───
  public triggerBossDefeatTransformation() {
    this.stopTimer();
    if (document.getElementById('boss-reward-showcase-overlay')) return;

    // Carta recompensa definida na Forja (resolvida pela Matriz)
    const tmpl =
      resolveMatrixOrGameCard(this.mobby.rewardCardId, CARD_TEMPLATES) ||
      (CARD_TEMPLATES as any[]).find(c => c && c.name === this.mobby.rewardCardId) ||
      CARD_TEMPLATES[0];
    const rewardCard: Card = {
      ...tmpl,
      id: `reward-${Date.now()}`,
      name: tmpl?.name || 'Carta Ancestral',
      atk: tmpl?.baseAtk || 500,
      pv: tmpl?.basePv || 500,
      maxPv: tmpl?.basePv || 500,
      image: tmpl?.image || this.mobby.image,
      manaCost: tmpl?.manaCost || 3,
      staminaCost: tmpl?.staminaCost || 10,
      owner: 'p',
      abilityId: tmpl?.abilityId,
      rarity: tmpl?.preferredRarity || 'epic',
      attacks: tmpl?.attacks,
      flavorText: tmpl?.flavorText,
      borderColor: tmpl?.borderColor,
      glowColor: tmpl?.glowColor,
      glowIntensity: tmpl?.glowIntensity
    } as Card;

    const bossEl = document.getElementById('mobby-sprite');
    const bossWrap = document.getElementById('boss-sprite-transform-wrap') || document.getElementById('boss-sprite-slot');

    // Dimensões da carta final na proporção exata 680:990 da Forja Matriz
    const maxH = Math.min(460, window.innerHeight * 0.72);
    const maxW = Math.min(316, window.innerWidth * 0.88);
    const targetWidth = Math.min(maxW, Math.round(maxH * (680 / 990)));
    const targetHeight = Math.round(targetWidth * (990 / 680));
    const targetLeft = (window.innerWidth - targetWidth) / 2;
    const targetTop = (window.innerHeight - targetHeight) / 2 - 35;
    const centerX = targetLeft + targetWidth / 2;
    const centerY = targetTop + targetHeight / 2;

    // Posição inicial onde o mobby está no tabuleiro
    const rect = bossEl ? bossEl.getBoundingClientRect() : {
      left: window.innerWidth / 2 - 80,
      top: window.innerHeight * 0.22,
      width: 160,
      height: 160
    };

    // Cria overlay escurecido de fundo
    const overlay = document.createElement('div');
    overlay.id = 'boss-reward-showcase-overlay';
    overlay.className = 'boss-reward-showcase-overlay';
    document.body.appendChild(overlay);
    void overlay.offsetWidth;
    overlay.classList.add('active');

    // Considera rotação e escala configuradas da PNG do Mobby
    const initRotation = this.mobby.rotation || 0;

    // O ator do Mobby: container posicionado e dimensionado
    const mobbyActor = document.createElement('div');
    mobbyActor.id = 'boss-morph-actor';
    mobbyActor.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      transform-origin: center center;
      transform: rotate(${initRotation}deg);
      z-index: 1000000;
      pointer-events: none;
      filter: brightness(1) drop-shadow(0 0 10px rgba(0,0,0,0.8));
    `;
    overlay.appendChild(mobbyActor);

    // 1. Imagem original do Mobby (visível no início; é 100% dissolvida quando a luz branca toma conta)
    const originalImg = document.createElement('div');
    originalImg.id = 'boss-actor-original-img';
    originalImg.style.cssText = `
      position: absolute;
      inset: 0;
      background-image: url('${this.mobby.image}');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      pointer-events: none;
      z-index: 1;
    `;
    mobbyActor.appendChild(originalImg);

    // 2. Silhueta de pura luz branca incandescente (máscara do PNG preenchida com #ffffff, sem filtro negativo)
    const whiteSilhouette = document.createElement('div');
    whiteSilhouette.id = 'boss-actor-white-silhouette';
    whiteSilhouette.style.cssText = `
      position: absolute;
      inset: 0;
      background-color: #ffffff;
      -webkit-mask-image: url('${this.mobby.image}');
      mask-image: url('${this.mobby.image}');
      -webkit-mask-size: contain;
      mask-size: contain;
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      -webkit-mask-position: center;
      mask-position: center;
      opacity: 0;
      pointer-events: none;
      z-index: 2;
    `;
    mobbyActor.appendChild(whiteSilhouette);

    // 3. Forma retangular branca da carta (puro #ffffff para o morph da carta mantendo 100% de brilho)
    const cardWhiteMorph = document.createElement('div');
    cardWhiteMorph.id = 'boss-actor-card-morph';
    cardWhiteMorph.style.cssText = `
      position: absolute;
      inset: 0;
      background-color: #ffffff;
      border-radius: 14px;
      opacity: 0;
      pointer-events: none;
      z-index: 3;
    `;
    mobbyActor.appendChild(cardWhiteMorph);

    // Esconde o mobby original do tabuleiro para a ilusão ser contínua
    if (bossEl) bossEl.style.opacity = '0';
    if (bossWrap) bossWrap.style.opacity = '0';

    try { SoundManager.playAction('magia_impacto', 0.8); } catch (_) {}

    // Função para gerar partículas de luz que convergem e são consumidas pelo Mobby durante o processo
    const emitAbsorbedParticle = () => {
      const p = document.createElement('div');
      const angle = Math.random() * Math.PI * 2;
      const dist = 160 + Math.random() * 160;
      const startX = centerX + Math.cos(angle) * dist;
      const startY = centerY + Math.sin(angle) * dist;
      const size = 5 + Math.random() * 7;
      p.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top: ${startY}px;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: radial-gradient(circle, #ffffff 40%, #ffd700 85%, transparent 100%);
        box-shadow: 0 0 12px #ffffff, 0 0 20px #ffd700;
        pointer-events: none;
        z-index: 1000003;
        transform: translate(-50%, -50%) scale(0);
      `;
      overlay.appendChild(p);

      gsap.timeline()
        .to(p, { scale: 1.3, duration: 0.18, ease: "power2.out" })
        .to(p, {
          left: centerX,
          top: centerY,
          scale: 0.1,
          opacity: 0.8,
          duration: 0.55 + Math.random() * 0.35,
          ease: "power3.in",
          onComplete: () => p.remove()
        });
    };

    let particleInterval: any = null;

    const tl = gsap.timeline();

    const destLeft = targetLeft + (targetWidth - rect.width) / 2;
    const destTop = targetTop + (targetHeight - rect.height) / 2;

    // 1. ELE JÁ VEM VIAJANDO PARA A FRENTE DA TELA TREMENDO COMO GELATINA (não treme no lugar!)
    tl.to(mobbyActor, {
      left: destLeft,
      top: destTop,
      width: rect.width,
      height: rect.height,
      duration: 1.4,
      ease: "power2.out",
      onStart: () => {
        try { SoundManager.playAction('vitoria_fanfare', 0.7); } catch (_) {}
      }
    })
    // Efeito gelatina durante o trajeto: squash & stretch elástico oscilando e assentando
    .to(mobbyActor, { scaleX: 1.20, scaleY: 0.82, rotation: initRotation + 6, duration: 0.12, ease: "sine.inOut" }, "<")
    .to(mobbyActor, { scaleX: 0.82, scaleY: 1.20, rotation: initRotation - 6, duration: 0.13, ease: "sine.inOut" })
    .to(mobbyActor, { scaleX: 1.16, scaleY: 0.86, rotation: initRotation + 4, duration: 0.13, ease: "sine.inOut" })
    .to(mobbyActor, { scaleX: 0.86, scaleY: 1.16, rotation: initRotation - 4, duration: 0.14, ease: "sine.inOut" })
    .to(mobbyActor, { scaleX: 1.10, scaleY: 0.92, rotation: initRotation + 3, duration: 0.14, ease: "sine.inOut" })
    .to(mobbyActor, { scaleX: 0.92, scaleY: 1.10, rotation: initRotation - 3, duration: 0.15, ease: "sine.inOut" })
    .to(mobbyActor, { scaleX: 1.05, scaleY: 0.96, rotation: initRotation + 1.5, duration: 0.16, ease: "sine.inOut" })
    .to(mobbyActor, { scaleX: 0.97, scaleY: 1.04, rotation: initRotation - 1, duration: 0.16, ease: "sine.inOut" })
    .to(mobbyActor, { scaleX: 1.0, scaleY: 1.0, rotation: 0, duration: 0.27, ease: "elastic.out(1.2, 0.4)" })

    // 3. NA FRENTE DA TELA: O BRILHO DO PNG AUMENTA GRADUALMENTE ATÉ FICAR 100% COMPLETO (O TAMANHO NÃO CRESCE AQUI)
    .add(() => {
      // Começa a sugar e absorver partículas de luz cósmica
      particleInterval = setInterval(emitAbsorbedParticle, 60);
    })
    // O brilho começa a emanar de forma natural com halo dourado (sem filtro negativo)
    .to(mobbyActor, {
      filter: "brightness(1.5) drop-shadow(0 0 25px rgba(255, 215, 0, 0.9))",
      duration: 0.8,
      ease: "power1.in"
    })
    // A silhueta de luz branca pura surge cobrindo o PNG perfeitamente até ficar 100% branco incandescente, enquanto o PNG original é totalmente dissolvido
    .to(whiteSilhouette, {
      opacity: 1,
      duration: 1.2,
      ease: "power2.inOut"
    })
    .to(originalImg, {
      opacity: 0,
      duration: 1.2,
      ease: "power2.inOut"
    }, "<")
    .to(mobbyActor, {
      filter: "drop-shadow(0 0 50px #ffffff) drop-shadow(0 0 100px rgba(255, 215, 0, 0.95))",
      duration: 1.2,
      ease: "power2.inOut"
    }, "<")
    // Pausa dramática no ápice: o PNG já está 100% branco e brilhante, sustentando a energia pura antes de se transformar
    .to(mobbyActor, {
      duration: 0.4
    })

    // 4. SÓ AGORA QUE O BRILHO FICOU 100% COMPLETO: EXPANSÃO E MORPH DA FORMA DO MOBBY PARA A CARTA (MANTENDO O MESMO BRILHO BRANCO!)
    .to(mobbyActor, {
      left: targetLeft,
      top: targetTop,
      width: targetWidth,
      height: targetHeight,
      borderRadius: "14px",
      boxShadow: "0 0 75px #ffffff, 0 0 130px #ffd700",
      filter: "drop-shadow(0 0 55px #ffffff) drop-shadow(0 0 110px #ffd700)",
      duration: 1.7,
      ease: "power2.inOut"
    })
    // A forma retangular branca da carta surge sobrepondo suavemente a silhueta branca - ambas são 100% brancas, preservando o brilho puro!
    .to(cardWhiteMorph, {
      opacity: 1,
      duration: 1.7,
      ease: "power2.inOut"
    }, "<")

    // 4. RETRATO COMPLETO: AS PARTÍCULAS E O BRILHO EXPLODEM NA CARTA!
    .add(() => {
      if (particleInterval) clearInterval(particleInterval);
      try { SoundManager.playAction('magia_impacto', 1.0); } catch (_) {}

      // Flash branco de alto impacto
      const flash = document.createElement('div');
      flash.style.cssText = `position: fixed; inset: 0; background: #ffffff; z-index: 1000005; pointer-events: none; opacity: 1;`;
      overlay.appendChild(flash);
      gsap.to(flash, { opacity: 0, duration: 0.5, ease: "power2.out", onComplete: () => flash.remove() });

      // Onda de choque radial
      const shock = document.createElement('div');
      shock.style.cssText = `
        position: fixed;
        left: ${centerX}px;
        top: ${centerY}px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        background: radial-gradient(circle, #ffffff 40%, rgba(255, 215, 0, 0.95) 70%, transparent 100%);
        box-shadow: 0 0 70px #ffffff, 0 0 130px #ffd700;
        pointer-events: none;
        z-index: 1000004;
      `;
      overlay.appendChild(shock);
      gsap.to(shock, { scale: 30, opacity: 0, duration: 0.6, ease: "power2.out", onComplete: () => shock.remove() });

      // Explosão de 40 feixes radiais
      for (let i = 0; i < 40; i++) {
        const ray = document.createElement('div');
        const angle = (i / 40) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
        const blastDist = 200 + Math.random() * 220;
        const rSize = 6 + Math.random() * 8;
        ray.style.cssText = `
          position: fixed;
          left: ${centerX}px;
          top: ${centerY}px;
          width: ${rSize}px;
          height: ${rSize}px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 15px #ffd700, 0 0 25px #ffffff;
          pointer-events: none;
          z-index: 1000004;
          transform: translate(-50%, -50%);
        `;
        overlay.appendChild(ray);
        gsap.to(ray, {
          left: centerX + Math.cos(angle) * blastDist,
          top: centerY + Math.sin(angle) * blastDist,
          scale: 0,
          opacity: 0,
          duration: 0.7 + Math.random() * 0.4,
          ease: "power3.out",
          onComplete: () => ray.remove()
        });
      }

      // 5. A CARTA VIRA E REVELA SUA FACE EM 3D
      const cardWrap = document.createElement('div');
      cardWrap.id = 'boss-capture-card';
      cardWrap.className = 'boss-capture-card-wrap';
      cardWrap.style.cssText = `
        position: fixed;
        left: ${targetLeft}px;
        top: ${targetTop}px;
        width: ${targetWidth}px;
        height: ${targetHeight}px;
        z-index: 1000001;
        transform: rotateY(180deg) scale(0.95);
        opacity: 0;
        transform-style: preserve-3d;
        perspective: 1200px;
      `;
      cardWrap.innerHTML = renderPremiumCard(rewardCard);
      overlay.appendChild(cardWrap);

      // Desaparece o ator branco morfado no flash
      gsap.to(mobbyActor, {
        opacity: 0,
        duration: 0.15,
        onComplete: () => mobbyActor.remove()
      });

      // Giro 3D majestoso revelando a face
      gsap.to(cardWrap, {
        rotateY: 0,
        scale: 1,
        opacity: 1,
        duration: 0.95,
        ease: "power2.out",
        onComplete: () => {
          // Levitação suave e aura pulsante contínua na carta revelada
          gsap.to(cardWrap, {
            y: "-=8",
            filter: "drop-shadow(0 0 50px rgba(255,215,0,0.95)) drop-shadow(0 25px 45px rgba(0,0,0,0.9))",
            duration: 1.4,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
          });

          // 6. BOTÃO COLETAR CENTRALIZADO ABAIXO COM A ID VISUAL DO JOGO
          const collectBtn = document.createElement('button');
          collectBtn.id = 'btn-collect-reward';
          collectBtn.className = 'btn-collect-reward-pulse';
          collectBtn.innerHTML = '<span>🎴</span><span>COLETAR RECOMPENSA</span>';
          collectBtn.style.cssText = `
            position: fixed;
            left: 50%;
            top: ${targetTop + targetHeight + 24}px;
            z-index: 1000002;
            opacity: 0;
          `;
          overlay.appendChild(collectBtn);

          gsap.fromTo(collectBtn,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.55, ease: "back.out(1.7)" }
          );

          // Ação de coletar a carta
          collectBtn.addEventListener('click', () => {
                try { SoundManager.playAction('carta_sacada', 1.0); } catch (_) {}

                try {
                  const unlocked = JSON.parse(localStorage.getItem('unlocked_cards') || '[]');
                  if (!unlocked.includes(rewardCard.name)) {
                    unlocked.push(rewardCard.name);
                    localStorage.setItem('unlocked_cards', JSON.stringify(unlocked));
                  }
                  const prepRaw = localStorage.getItem('battle_prep');
                  if (prepRaw) {
                    const prep = JSON.parse(prepRaw);
                    if (Array.isArray(prep.cards) && !prep.cards.some((c: any) => c.name === rewardCard.name)) {
                      prep.cards.push(rewardCard);
                      localStorage.setItem('battle_prep', JSON.stringify(prep));
                    }
                  }
                } catch (e) {
                  console.error(e);
                }

                // Absorção e fechamento
                gsap.to(cardWrap, {
                  scale: 0,
                  y: 350,
                  opacity: 0,
                  duration: 0.5,
                  ease: "power3.in"
                });
                gsap.to(collectBtn, { opacity: 0, duration: 0.2 });

                gsap.to(overlay, {
                  opacity: 0,
                  duration: 0.4,
                  delay: 0.35,
                  onComplete: () => {
                    overlay.remove();
                    this.triggerEndScreen(true);
                  }
                });
              });
            }
          });
        });
  }

  private triggerEndScreen(isWin: boolean, isSurrender: boolean = false) {
    this.stopTimer();
    if (document.getElementById('end-battle-overlay')) return;
     
    let title = isWin ? t('bt.winTitle') : t('bt.loseTitle');
    if (isSurrender) title = t('bt.cowardTitle');

    const pvRemain = this.engine.hp.p;
    const prevData = ProgressionManager.getPlayerData();
    const previousXp = prevData.xp;
    const xpForNextLevel = ProgressionManager.getNextLevelXpRequirement(prevData.level);

    const matchStats = {
      cardsUsed: this.engine.stats.cardsPlayed,
      perfectParrys: 0,
      cardsDefeated: 1
    };

    const { data: newData, rewards } = ProgressionManager.applyMatchRewards(isWin && !isSurrender, matchStats);
    const coinsGained = rewards.goldGained;
    const diamondsGained = rewards.diamondGained;
    const newPct = Math.min(100, (newData.xp / xpForNextLevel) * 100);

    const themeClass = isWin ? 'win-theme' : 'lose-theme';
    const bannerClass = isWin ? 'win-ribbon' : (isSurrender ? 'coward-ribbon' : 'lose-ribbon');
    const mascotImg = isWin ? '/victory_slime.jpg' : '/defeat_slime.png';

    const overlay = document.createElement('div');
    overlay.id = 'end-battle-overlay';
    overlay.className = themeClass;
    
    overlay.innerHTML = `
      <div id="er-particles" style="position:absolute;inset:0;pointer-events:none;overflow:hidden;"></div>
      <div class="end-screen-content">
        <div class="end-top-header">
          <div class="end-stars-wrapper ${isWin ? 'win' : 'lose'}" id="end-stars">
            <span class="end-star-item">⭐</span>
            <span class="end-star-item center-star">⭐</span>
            <span class="end-star-item">⭐</span>
          </div>
          <div class="end-mini-mascot ${isWin ? 'win' : 'lose'}" id="end-mascot">
            <img src="${mascotImg}" alt="${isWin ? 'Vitória' : 'Derrota'}" />
          </div>
        </div>
        <div class="end-ribbon-banner ${bannerClass}" id="end-banner">
          <h1 class="end-ribbon-title">${title}</h1>
        </div>
        <div class="end-modal-card" id="end-modal-card">
          <div class="end-level-pill">${t('bt.level')} ${prevData.level}</div>
          <div class="end-section-header">${t('bt.end.rewards')}</div>
          <div class="end-capsules-row" id="end-capsules">
            <div class="end-capsule-card gold-capsule">
              <div class="end-capsule-icon-wrap">🪙</div>
              <div class="end-capsule-label">${t('bt.end.coins')}</div>
              <div class="end-capsule-value" id="final-coins">+${coinsGained}</div>
            </div>
            <div class="end-capsule-card gems-capsule">
              <div class="end-capsule-icon-wrap">💎</div>
              <div class="end-capsule-label">${t('bt.end.gems')}</div>
              <div class="end-capsule-value">+${diamondsGained}</div>
            </div>
          </div>
          <div class="end-card-divider"></div>
          <div class="end-xp-compact-wrap">
            <div class="end-xp-compact-bar">
              <div id="er-xp-bar" class="end-xp-compact-fill" style="width:${newPct}%;"></div>
              <span id="er-xp-txt" class="end-xp-compact-txt">+${rewards.xpGained} XP</span>
            </div>
          </div>
        </div>
        <button id="btn-return-lobby" class="btn-end-continue-game">${t('bt.end.continue')}</button>
      </div>
      <div id="coin-fling-container" style="position:fixed;inset:0;pointer-events:none;z-index:9999998;overflow:hidden;"></div>
    `;
     
    document.body.appendChild(overlay);

    setTimeout(() => { 
      overlay.style.opacity = '1'; 
      SoundManager.playAction(isWin ? 'vitoria_fanfare' : 'derrota_sting', 0.85);
    }, 50);

    const btn = document.getElementById('btn-return-lobby');
    if (btn) {
      btn.onclick = () => { window.location.href = 'hub.html'; };
    }
  }

  // ─── AI (CHEFE ATACA USANDO AS ANIMAÇÕES OFICIAIS) ─────────────────────────

  private runAI() {
    if (this.isGameOver() || this.engine.turn !== 'e' || this.isAIProcessing) return;
    this.isAIProcessing = true;

    // Chefe escolhe uma carta do jogador para atacar
    const occupiedSlots = [3, 4, 5].filter(idx => !!this.engine.board[idx]);
    const defIdx = occupiedSlots.length > 0 
      ? occupiedSlots[Math.floor(Math.random() * occupiedSlots.length)]
      : 3; // Slot alvo (ataque direto se vazio)

    this.showBanner(`⚔️ ${this.mobby.name.toUpperCase()} ATACA!`);

    setTimeout(() => {
      const bossEl = document.getElementById('mobby-sprite');
      if (bossEl) {
        bossEl.classList.add('boss-jelly-attack');
        setTimeout(() => bossEl.classList.remove('boss-jelly-attack'), 550);
      }

      this.executePhysicalAttack(bossEl, defIdx, () => {
        // Aplica o dano oficial
        const targetCard = this.engine.board[defIdx];
        if (targetCard) {
          targetCard.pv -= this.mobby.atk;
          spawnFloatingText(defIdx, `-${this.mobby.atk}`, '#ff4444');
          if (targetCard.pv <= 0) {
            const deadEl = document.querySelector(`[data-idx="${defIdx}"] .card-face`);
            if (deadEl) {
              deathExplosion(deadEl, () => {
                this.engine.grave.push(targetCard);
                this.engine.board[defIdx] = null;
                this.render();
              });
            } else {
              this.engine.board[defIdx] = null;
              this.render();
            }
          } else {
            this.render();
          }
        } else {
          // Ataque direto no jogador
          this.engine.hp.p = Math.max(0, this.engine.hp.p - this.mobby.atk);
          this.board.updateAttributeBars(this.engine);
          spawnFloatingText(-1, `-${this.mobby.atk}`, '#ff4444');
          this.render();
        }

        this.isAIProcessing = false;
        if (!this.isGameOver()) {
          this.handleEndTurn();
        }
      });
    }, 700);
  }

  // ─── PLAYER ACTIONS (OFICIAL DO BATTLEMAIN) ────────────────────────────────

  private placeHandCard(idx: number) {
    if (!this.selectedHandCard) return;

    if (this.engine.actionsLeft <= 0) {
      this.showBanner('⛔ ' + t('bt.noActions'));
      this.clearHandSelection();
      return;
    }

    const cost = this.selectedHandCard.manaCost || 1;
    if (this.engine.mana.p < cost) {
      this.showBanner('💎 ' + t('bt.noMana'));
      this.clearHandSelection();
      return;
    }

    const handEl = document.querySelector(`.hand-card-hifi[data-id="${this.selectedHandCard.id}"]`) as HTMLElement;
    const slotEl = document.querySelector(`[data-idx="${idx}"]`) as HTMLElement;

    if (!handEl || !slotEl) return;

    const handRect = handEl.getBoundingClientRect();
    const slotRect = slotEl.getBoundingClientRect();

    const ghost = handEl.cloneNode(true) as HTMLElement;
    ghost.style.position = 'fixed';
    ghost.style.left = `${handRect.left}px`;
    ghost.style.top = `${handRect.top}px`;
    ghost.style.width = `${handRect.width}px`;
    ghost.style.height = `${handRect.height}px`;
    ghost.style.margin = '0';
    ghost.style.zIndex = '1000';
    document.body.appendChild(ghost);

    const cardId = this.selectedHandCard.id;
    this.clearHandSelection();

    gsap.to(ghost, {
      left: slotRect.left,
      top: slotRect.top,
      width: slotRect.width,
      height: slotRect.height,
      duration: 0.45,
      ease: 'power2.inOut',
      onComplete: () => {
        ghost.remove();
        const preMana = this.engine.mana.p;
        const ok = this.engine.playCard(idx, cardId);
        const postMana = this.engine.mana.p;

        if (ok) {
          this.render();
          SoundManager.playAction('carta_invocada', 0.5);
          const placed = document.querySelector(`[data-idx="${idx}"]`) as HTMLElement | null;
          if (placed) this.animateCardToBoard(placed);
          if (preMana !== postMana) FX.animateManaChange('p', preMana, postMana);
          this.showBanner(t('bt.summoned'));
          this.checkAutoEnd();
        } else {
          this.render();
        }
      }
    });
  }

  private openAction(idx: number) {
    SoundManager.playAction('clique_geral', 0.4);
    this.selectedSlotIdx = idx;
    const card = this.engine.board[idx];
    if (!card) return;

    const noActions = this.engine.actionsLeft <= 0;
    const attacks = card.attacks || [];

    const atkRoot = document.getElementById('atk-options-root');
    if (atkRoot) {
      atkRoot.innerHTML = '';
      if (attacks.length === 0) {
        const cost = card.staminaCost || 1;
        const btn = document.createElement('button');
        btn.className = 'inline-btn-capsule atk';
        btn.innerHTML = `<div class="name-tag">${t('bt.end.attack')}</div><div class="cost-tag">⚡${cost}</div>`;
        btn.disabled = noActions || this.engine.stamina.p < cost;
        btn.onclick = (e) => { e.stopPropagation(); this.startTargeting(0); };
        atkRoot.appendChild(btn);
      } else {
        attacks.slice(0, 3).forEach((atk, i) => {
          const btn = document.createElement('button');
          btn.className = 'inline-btn-capsule atk';
          const costVal = atk.cost;
          const costIcon = atk.costType === 'mana' ? '💎' : '⚡';
          const hasRes = (this.engine as any)[atk.costType].p >= costVal;
          btn.disabled = noActions || !hasRes;
          btn.innerHTML = `<div class="name-tag">${atk.name.toUpperCase()}</div><div class="cost-tag">${costIcon}${costVal}</div>`;
          btn.onclick = (e) => { e.stopPropagation(); this.startTargeting(i); };
          atkRoot.appendChild(btn);
        });
      }
    }

    document.getElementById('inline-action-bar')?.classList.add('active');
  }

  private closeAction() {
    document.getElementById('inline-action-bar')?.classList.remove('active');
    document.getElementById('inline-skill-bar')?.classList.remove('active');
  }

  private startTargeting(attackIdx: number = 0) {
    SoundManager.playAction('clique_geral', 0.5);
    this.selectedAttackIdx = attackIdx;
    this.closeAction();
    if (this.engine.actionsLeft <= 0) { this.showBanner('⛔ ' + t('bt.noActions')); return; }

    this.isTargeting = true;
    this.showBanner(t('bt.chooseTarget'));
    this.render();
  }

  private handleSacrifice() {
    this.closeAction();
    if (this.engine.actionsLeft <= 0) { this.showBanner('⛔ ' + t('bt.noActions')); return; }
    const cardEl = document.querySelector(`[data-idx="${this.selectedSlotIdx}"] .card-face`);
    if (cardEl) deathExplosion(cardEl, () => {
      const ok = this.engine.sacrifice(this.selectedSlotIdx!);
      if (ok) { this.showBanner('🔥 ' + t('bt.sacrifice')); this.render(); this.checkAutoEnd(); }
      else this.render();
    });
  }

  // ─── ATTACK RESOLUTION ────────────────────────────────────────────────────

  private resolveAttack(eIdx: number) {
    const atkIdx = this.selectedSlotIdx!;
    const defIdx = eIdx;
    const attackIdx = this.selectedAttackIdx;

    this.isTargeting = false;
    this.doAttack(atkIdx, defIdx, () => {
      this.render();
      if (!this.isGameOver()) {
        if (this.engine.actionsLeft <= 0) {
          setTimeout(() => this.handleEndTurn(), 600);
        } else {
          this.checkAutoEnd();
        }
      }
    }, false, attackIdx);
  }

  private doAttack(atkIdx: number, defIdx: number, onDone: () => void, parried: boolean = false, attackIdx: number = 0) {
    const atkEl = document.querySelector(`[data-idx="${atkIdx}"] .card-face`) as HTMLElement | null;
    const bossEl = document.getElementById('mobby-sprite') as HTMLElement | null;
    const targetEl = bossEl;

    const afterLunge = () => {
      const atkCard = this.engine.board[atkIdx];
      const dmg = atkCard ? atkCard.atk : 12;

      // Aplica o dano no Chefe
      this.engine.hp.e = Math.max(0, this.engine.hp.e - dmg);
      this.engine.actionsLeft = Math.max(0, this.engine.actionsLeft - 1);
      
      // ANIMAÇÃO DE GELATINA DE REAÇÃO NO CHEFE + FILTRO VERMELHO ESTRITAMENTE SOBRE A PNG
      if (bossEl) {
        bossEl.classList.remove('boss-hit-red-silhouette');
        void bossEl.offsetWidth; // Force reflow
        bossEl.classList.add('boss-hit-red-silhouette');
        setTimeout(() => bossEl?.classList.remove('boss-hit-red-silhouette'), 460);

        gsap.killTweensOf(bossEl);
        gsap.timeline()
          .to(bossEl, { scaleX: 1.35, scaleY: 0.65, duration: 0.08, ease: 'power2.out' })
          .to(bossEl, { scaleX: 0.75, scaleY: 1.25, duration: 0.1, ease: 'power1.inOut' })
          .to(bossEl, { scaleX: 1, scaleY: 1, duration: 0.15, ease: 'elastic.out(1.2, 0.4)' });
      }

      this.render();
      onDone();
    };

    this.executePhysicalAttack(atkEl, defIdx, afterLunge);
  }

  private executePhysicalAttack(atkEl: HTMLElement | null, defIdx: number, onComplete: () => void) {
    if (!atkEl) { onComplete(); return; }

    const defSlot = (defIdx === 0) 
      ? document.getElementById('boss-sprite-slot') 
      : document.querySelector(`[data-idx="${defIdx}"]`);
    
    if (!defSlot) { onComplete(); return; }

    const atkR = atkEl.getBoundingClientRect();
    const defR = defSlot.getBoundingClientRect();
    const dx = defR.left - atkR.left;
    const dy = defR.top - atkR.top;

    const timeline = gsap.timeline();
    SoundManager.playAction('atk_basico_1', 0.4);

    timeline.to(atkEl, {
      x: -dx * 0.12,
      y: -dy * 0.12,
      duration: 0.35,
      ease: "back.in(2.5)"
    });

    timeline.to(atkEl, {
      x: dx * 0.85,
      y: dy * 0.85,
      scale: 1.2,
      filter: 'brightness(3) blur(2px)',
      duration: 0.12,
      ease: "power4.in",
      onStart: () => {
        [0.3, 0.6, 0.9].forEach(offset => {
          const clone = atkEl.cloneNode(true) as HTMLElement;
          clone.style.pointerEvents = 'none';
          clone.style.zIndex = '50';
          clone.style.position = 'fixed';
          clone.style.left = atkR.left + 'px';
          clone.style.top = atkR.top + 'px';
          document.body.appendChild(clone);
          gsap.fromTo(clone, { opacity: 0.5 }, {
            opacity: 0,
            x: dx * offset,
            y: dy * offset,
            duration: 0.3,
            onComplete: () => clone.remove()
          });
        });
      },
      onComplete: () => {
        const cx = defR.left + defR.width / 2;
        const cy = defR.top + defR.height / 2;
        this.createImpactVFX(cx, cy, false);
        SoundManager.playAction('atk_basico_2', 0.6);
        onComplete();
      }
    });

    timeline.to(atkEl, {
      x: 0, y: 0, scale: 1,
      filter: 'brightness(1) blur(0px)',
      duration: 0.7,
      ease: "elastic.out(1, 0.5)"
    }, "+=0.1");
  }

  private createImpactVFX(x: number, y: number, isDirect: boolean = false) {
    const flash = document.createElement('div');
    const color = isDirect ? 'rgba(255,255,255,0.8)' : 'rgba(255,100,100,0.4)';
    flash.style.cssText = `position:fixed; left:${x}px; top:${y}px; width:150px; height:150px; background:radial-gradient(circle, #fff 10%, ${color} 40%, transparent 70%); border-radius:50%; transform:translate(-50%,-50%); z-index:9999; pointer-events:none; filter:blur(5px);`;
    document.body.appendChild(flash);
    gsap.fromTo(flash, { scale: 0.2, opacity: 1 }, { scale: isDirect ? 4.5 : 2.5, opacity: 0, duration: 0.5, ease: 'power2.out', onComplete: () => flash.remove() });

    const ring = document.createElement('div');
    ring.style.cssText = `position:fixed; left:${x}px; top:${y}px; width:40px; height:40px; border:4px solid white; border-radius:50%; transform:translate(-50%,-50%); z-index:9998; pointer-events:none;`;
    document.body.appendChild(ring);
    gsap.to(ring, { scale: isDirect ? 15 : 8, opacity: 0, duration: 0.6, ease: 'expo.out', onComplete: () => ring.remove() });
  }

  // ─── SKILLS / ARTEFATOS CONTRA O MOBBY ───────────────────────────────────

  private async openSkillDialog(skillIdx: number) {
    const skill = this.engine.activeSkills[skillIdx];
    if (!skill) return;
    const bar = document.getElementById('inline-skill-bar');
    if (!bar) return;

    const confirmBtn = document.getElementById('skill-confirm');
    if (confirmBtn) {
      confirmBtn.innerHTML = `✨ USAR <span style="opacity:0.8; margin-left:4px;">${skill.name.toUpperCase()}</span>`;
    }

    document.getElementById('inline-action-bar')?.classList.remove('active');
    bar.classList.add('active');

    const cancelBtn = document.getElementById('skill-cancel');
    if (confirmBtn) confirmBtn.onclick = async () => {
      bar.classList.remove('active');
      if (this.engine.mana.p < (skill.manaCost || 0) || this.engine.stamina.p < (skill.staminaCost || 0)) {
        this.showBanner('❌ ' + t('bt.insufficientResources'));
        return;
      }

      await this.resolveSkillOnBoss(skillIdx);
    };
    if (cancelBtn) cancelBtn.onclick = () => bar.classList.remove('active');
  }

  private async resolveSkillOnBoss(skillIdx: number) {
    const skill = this.engine.activeSkills[skillIdx];
    if (!skill) return;

    // Deduzir recursos e ação
    this.engine.mana.p -= (skill.manaCost || 0);
    this.engine.stamina.p -= (skill.staminaCost || 0);
    this.engine.actionsLeft = Math.max(0, this.engine.actionsLeft - 1);

    const artDmg = skill.power || 45;
    this.engine.hp.e = Math.max(0, this.engine.hp.e - artDmg);

    SoundManager.playAction('magia_impacto', 0.8);
    SoundManager.playAction('dano_sofrido_pv', 0.7);

    const mobbyEl = document.getElementById('mobby-sprite');
    if (mobbyEl) {
      mobbyEl.classList.remove('boss-hit-red-silhouette');
      void mobbyEl.offsetWidth; // Força reflow
      mobbyEl.classList.add('boss-hit-red-silhouette');
      setTimeout(() => mobbyEl?.classList.remove('boss-hit-red-silhouette'), 460);

      gsap.killTweensOf(mobbyEl);
      gsap.timeline()
        .to(mobbyEl, { scaleX: 1.4, scaleY: 0.6, duration: 0.08, ease: 'power2.out' })
        .to(mobbyEl, { scaleX: 0.75, scaleY: 1.35, duration: 0.12, ease: 'power1.inOut' })
        .to(mobbyEl, { scaleX: 1.1, scaleY: 0.92, duration: 0.1, ease: 'power1.inOut' })
        .to(mobbyEl, { scaleX: 1, scaleY: 1, duration: 0.2, ease: 'elastic.out(1.2, 0.4)' });

      const rect = mobbyEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      this.createImpactVFX(cx, cy, false);
      spawnFloatingText(cx, cy - 20, `-${artDmg} ✨ ${skill.name}`, '#ff4444');
    }

    if (skill.effect === 'drain') {
      this.engine.hp.p = Math.min(1500, this.engine.hp.p + Math.floor(artDmg * 0.8));
    }

    this.showBanner(`✨ ${skill.name}: -${artDmg} no Chefe!`);
    this.engine.activeSkills[skillIdx] = null;
    this.board.renderSkillSlots(this.engine.activeSkills);
    this.board.updateAttributeBars(this.engine);

    if (this.engine.hp.e <= 0) {
      setTimeout(() => this.triggerEndScreen(true), 600);
    } else {
      this.checkAutoEnd();
    }
  }

  // ─── UTILITIES & HELPERS ──────────────────────────────────────────────────

  private checkAutoEnd() {
    if (this.engine.actionsLeft <= 0 && this.engine.turn === 'p') {
      setTimeout(() => this.handleEndTurn(), 800);
    }
  }

  private showBanner(txt: string) {
    const b = document.getElementById('banner');
    if (!b) return;
    b.textContent = txt;
    gsap.killTweensOf(b);
    gsap.timeline()
      .fromTo(b, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.28, ease: 'power2.out' })
      .to(b, { opacity: 0, scale: 1.05, delay: 2.2, duration: 0.3, ease: 'power2.in' });
  }

  private startTimer() {
    this.timer = 60;
    this.timerInterval = setInterval(() => {
      this.timer--;
      this.updateTimerUI();
      if (this.timer <= 0) this.handleEndTurn();
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
  }

  private updateTimerUI() {
    const t = document.getElementById('timer-text');
    if (t) t.textContent = String(this.timer);
  }

  private animateHandCards() {
    gsap.from('#hand > *', { y: 20, opacity: 0, stagger: 0.05 });
  }

  private animateCardToBoard(el: HTMLElement) {
    gsap.fromTo(el,
      { scale: 2, opacity: 0, filter: 'brightness(5)' },
      { scale: 1, opacity: 1, filter: 'brightness(1)', duration: 0.5, ease: 'back.out(1.2)' }
    );
    gsap.to(document.getElementById('board'), { x: 4, duration: 0.05, repeat: 3, yoyo: true });
  }

  private selectHandCard(c: Card, el: HTMLElement) {
    if (this.selectedHandCard?.id === c.id) return;
    gsap.to('.hand-card-hifi', { scale: 1, y: 0, duration: 0.2 });

    this.selectedHandCard = c;
    document.querySelectorAll('.hand-card-hifi').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');

    gsap.to(el, { scale: 1.25, y: -20, zIndex: 100, duration: 0.3, ease: 'back.out(1.7)' });
    this.showBanner(t('bt.chooseSlot'));

    document.querySelectorAll('.slot-p').forEach(slot => {
      const idx = parseInt((slot as HTMLElement).dataset.idx!);
      if (!this.engine.board[idx]) (slot as HTMLElement).classList.add('highlight');
    });
  }

  private clearHandSelection() {
    gsap.to('.hand-card-hifi', { scale: 1, y: 0, duration: 0.2 });
    this.selectedHandCard = null;
    document.querySelectorAll('.hand-card-hifi').forEach(e => e.classList.remove('selected'));
    document.querySelectorAll('.slot-p').forEach(slot => slot.classList.remove('highlight'));
  }

  private handlePlayerDrawClick() {
    if (this.engine.turn !== 'p' || this.isTargeting || this.isTargetingSkill) return;
    if (this.engine.actionsLeft <= 0) {
      this.showBanner('⛔ ' + t('bt.noActions'));
      return;
    }
    if (this.engine.hand.length >= 7) {
      this.showBanner(t('bt.handFull'));
      return;
    }
    if (this.engine.deck.length <= 0) {
      this.showBanner(t('bt.deckEmpty'));
      return;
    }

    SoundManager.playAction('clique_geral', 0.5);
    this.openDeckFan();
  }

  private openDeckFan(onCardPicked?: () => void) {
    const fanOverlay = document.createElement('div');
    fanOverlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(12px);z-index:9000;display:flex;flex-direction:column;align-items:center;justify-content:center;`;

    const container = document.createElement('div');
    container.style.cssText = `position:relative; width: min(450px, 95vw); height: 300px; display:flex; justify-content:center; align-items:flex-end; perspective:1200px;`;

    const count = this.engine.deck.length;
    const maxArc = count > 10 ? 160 : 100;
    const angleStep = count > 1 ? maxArc / (count - 1) : 0;
    const startAngle = count > 1 ? -maxArc / 2 : 0;

    for (let i = 0; i < count; i++) {
      const cardBack = document.createElement('div');
      cardBack.className = 'card-face';
      cardBack.style.cssText = `position:absolute; bottom:0; width: 130px; height: 189px; overflow:hidden; border-radius:12px; box-shadow: -10px 10px 30px rgba(0,0,0,0.8); cursor:pointer; transform-origin:bottom center;`;
      cardBack.innerHTML = renderMatrixCardBackSVG();

      const angle = startAngle + (i * angleStep);
      const distFromCenter = Math.abs(i - (count - 1) / 2);
      const yOffset = distFromCenter * (count > 15 ? 4 : 8);

      gsap.set(cardBack, { rotation: angle, y: yOffset + 300, zIndex: i, opacity: 0 });

      cardBack.onmouseenter = () => { if (!fanOverlay.dataset.picking) gsap.to(cardBack, { y: yOffset - 30, scale: 1.08, zIndex: 500, duration: 0.2 }); };
      cardBack.onmouseleave = () => { if (!fanOverlay.dataset.picking) gsap.to(cardBack, { y: yOffset, scale: 1, zIndex: i, duration: 0.2 }); };

      cardBack.onclick = () => {
        if (fanOverlay.dataset.picking) return;
        fanOverlay.dataset.picking = "true";

        setTimeout(() => {
          fanOverlay.remove();
          this.executePlayerDraw();
          SoundManager.playAction('carta_sacada', 0.4);
          onCardPicked?.();
        }, 300);
      };
      container.appendChild(cardBack);
    }

    const msg = document.createElement('div');
    msg.style.cssText = `margin-bottom: 50px; padding: 0 10%; width: 100%; text-align:center; color: #fff; font-size:1.5rem; font-weight:950; letter-spacing:2px; line-height:1.2; box-sizing:border-box; text-shadow: 0 4px 15px rgba(0,0,0,1);`;
    msg.textContent = `${t('bt.choose')} (${count} ${t('bt.remaining')})`;

    fanOverlay.appendChild(msg);
    fanOverlay.appendChild(container);
    document.body.appendChild(fanOverlay);

    fanOverlay.onclick = (e) => {
      if (e.target === fanOverlay || e.target === container) fanOverlay.remove();
    };

    gsap.to(container.children, {
      y: (i) => Math.abs(i - (count - 1) / 2) * (count > 15 ? 4 : 8),
      opacity: 1,
      duration: 0.7,
      stagger: count > 20 ? 0.01 : 0.04,
      ease: 'back.out(1.2)'
    });
  }

  private executePlayerDraw() {
    if (this.engine.drawAndConsumeAction()) {
      this.animateDrawCard(() => {
        this.render();
        this.checkAutoEnd();
      });
    }
  }

  private animateDrawCard(cb?: () => void) {
    const deckEl = document.querySelector('.deck-back-slot');
    const handCont = document.getElementById('hand');
    if (!deckEl || !handCont) { cb?.(); return; }

    const rect = deckEl.getBoundingClientRect();
    const temp = document.createElement('div');
    temp.className = 'card-face matrix-frame-mode card-draw-anim';
    temp.style.cssText = `position:fixed; left:${rect.left}px; top:${rect.top}px; width:70px; height:102px; aspect-ratio:680/990; border-radius:10px; overflow:hidden; z-index:10000;`;
    temp.innerHTML = renderMatrixCardBackSVG();
    document.body.appendChild(temp);

    const handRect = handCont.getBoundingClientRect();
    gsap.to(temp, {
      left: handRect.left + handRect.width / 2,
      top: handRect.top,
      rotation: 720,
      scale: 0.5,
      opacity: 0,
      duration: 0.6,
      ease: 'power2.inOut',
      onComplete: () => {
        temp.remove();
        cb?.();
        this.rebuildHand();
        gsap.from('#hand > *:last-child', { scale: 0, opacity: 0, duration: 0.4, ease: 'back.out' });
      }
    });
  }

  private showFullscreen(c: Card) {
    const overlay = document.getElementById('overlay-fullscreen');
    const inner = document.getElementById('fullscreen-card-inner');
    if (!overlay || !inner) return;
    inner.innerHTML = renderPremiumCard(c);
    overlay.classList.add('active');
    gsap.fromTo(inner, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.5)' });
    const close = () => gsap.to(inner, { scale: 0.8, opacity: 0, duration: 0.2, onComplete: () => overlay.classList.remove('active') });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); }, { once: true });
    inner.addEventListener('click', close, { once: true });
  }

  private confirmAction(title: string, msg: string, onYes: () => void) {
    const overlay = document.getElementById('overlay-confirm');
    const tEl = document.getElementById('confirm-title');
    const mEl = document.getElementById('confirm-msg');
    const bYes = document.getElementById('confirm-yes');
    const bNo = document.getElementById('confirm-no');
    if (!overlay || !tEl || !mEl || !bYes || !bNo) return;
    tEl.textContent = title;
    mEl.textContent = msg;
    overlay.classList.add('active');
    bYes.onclick = () => { overlay.classList.remove('active'); onYes(); };
    bNo.onclick = () => { overlay.classList.remove('active'); };
  }
}

const isPreviewMode = new URLSearchParams(window.location.search).get('preview') === '1' || window.self !== window.top;
if (!isPreviewMode) {
  autoFullscreen();
}
const battleApp = new BossBattleApp();

// Escuta comandos ao vivo enviados pelo editor da Forja quando embutido em iframe
window.addEventListener('message', (ev) => {
  if (!ev.data || typeof ev.data !== 'object') return;
  const { type, payload } = ev.data;
  if (type === 'UPDATE_BOSS_TRANSFORM') {
    const wrap = document.getElementById('boss-sprite-transform-wrap');
    if (wrap && payload) {
      const { offsetX = 0, offsetY = 0, rotation = 0, scale = 100 } = payload;
      wrap.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg) scale(${scale / 100})`;
    }
  } else if (type === 'UPDATE_SCENARIO' && payload) {
    applyScenarioBackground(payload.backgroundUrl || (SCENARIOS as any).boss_battle || (SCENARIOS as any).battle || (SCENARIOS as any).lobby);
  } else if (type === 'UPDATE_BOSS_IMG' && payload?.image) {
    const img = document.getElementById('mobby-sprite') as HTMLImageElement;
    if (img) img.src = payload.image;
  } else if (type === 'TEST_VICTORY_REWARD') {
    battleApp.triggerBossDefeatTransformation();
  } else if (type === 'UPDATE_REWARD_CARD' && payload?.rewardCardId) {
    (battleApp as any).mobby.rewardCardId = payload.rewardCardId;
  }
});
