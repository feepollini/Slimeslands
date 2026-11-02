import './style.css';
import './ui/styles/Battle.css';
import './ui/styles/Landscape.css';
import { gsap } from 'gsap';
import { GameEngine, Card } from './core/GameEngine';
import { GameAI, AIDifficulty } from './core/GameAI';
import { ProgressionManager } from './core/ProgressionManager';
import SCENARIOS from './core/scenarios.json';
import { applyScenarioBackground, getActiveScenario } from './ui/utils/BackgroundUtils';
import { t } from './core/i18n';
import { animateParallaxLayers } from './ui/utils/ParallaxUtils';
import { SoundManager } from './ui/utils/SoundManager';
import { autoFullscreen } from './ui/utils/fullscreen';
import * as FX from './ui/utils/BattleAnimations';
import { ENCHANTMENT_REGISTRY } from './core/enchantments';
import { CARD_ABILITIES, CARD_TEMPLATES, getGlobalCardBack } from './core/constants';
import { renderPremiumCard } from './ui/screens/forge_v2/utils/PremiumCardRenderer';
import {
  renderMatrixCardBackSVG,
  getMergedGameTemplates,
  resolveMatrixOrGameCard,
} from './ui/screens/forge_v2/utils/HestridiaMatrixRenderer';
import { BoardScreen } from './ui/screens/BoardScreen';
import { BoardScreenLandscape } from './ui/screens_landscape/BoardScreenLandscape';
import { OrientationManager } from './ui/OrientationManager';
import {
  getActiveNpcBattleContext,
  resolveNpcDeckCards,
  recordNpcBattleOutcome,
  getBestVariationForCard,
  getAvailableActiveArtifacts,
  RARITY_META,
} from './core/NpcCardBattleBridge';

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

// ─── BATTLE APP CLASS ─────────────────────────────────────────────────────────

class BattleApp {
  private engine: GameEngine;
  private portraitBoard: BoardScreen;
  private landscapeBoard: BoardScreenLandscape;
  private get board(): BoardScreen {
    return OrientationManager.isLandscape() ? this.landscapeBoard : this.portraitBoard;
  }
  private container: HTMLElement;
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
    this.portraitBoard = new BoardScreen();
    this.landscapeBoard = new BoardScreenLandscape();

    OrientationManager.subscribe(() => {
      if (this.container && this.container.querySelector('.battle-screen')) {
        this.render();
      }
    });
    getMergedGameTemplates(CARD_TEMPLATES).catch(() => {});
    this.initPreBattle();
    gsap.fromTo(document.body, { opacity: 0 }, { opacity: 1, duration: 0.5 });
  }

  private initPreBattle() {
    const params = new URLSearchParams(window.location.search);
    const npcCtx = getActiveNpcBattleContext();
    if (params.get('npcBattle') === '1' || (npcCtx && npcCtx.battleMode === 'duel')) {
      this.difficulty = 'medium';
      this.showCoinFlip();
      return;
    }

    applyScenarioBackground(getActiveScenario('difficulty', (SCENARIOS as any).difficulty || (SCENARIOS as any).lobby));
    this.container.innerHTML = this.board.renderDifficultyScreen();
    this.setupDifficultySelect();

    const p = document.getElementById('er-particles-diff');
    if (p) this.spawnSparkParticles(p);

    SoundManager.playAmbient('difficulty');

    // GSAP Entrance
    gsap.to('#diff-title-wrap', { opacity: 1, y: 0, duration: 1.5, ease: 'power2.out', delay: 0.2 });
    gsap.to('#difficulty-options', { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out', delay: 0.8 });
  }

  private setupDifficultySelect() {
    const btns = document.querySelectorAll('.diff-btn');
    const confirmBtn = document.getElementById('btn-confirm-diff') as HTMLElement | null;
    btns.forEach(btn => {
      (btn as HTMLElement).onclick = () => {
        btns.forEach(b => (b as HTMLElement).classList.remove('selected'));
        (btn as HTMLElement).classList.add('selected');
        this.difficulty = (btn as HTMLElement).dataset.diff as AIDifficulty;
        SoundManager.playAction('clique_geral', 0.6);
        if (confirmBtn) {
          confirmBtn.style.pointerEvents = 'auto';
          gsap.to(confirmBtn, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
        }
      };
    });
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        SoundManager.playAction('clique_geral', 0.7);
        this.showCoinFlip();
      };
    }
    document.getElementById('btn-diff-back')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.5);
      window.location.href = 'hub.html';
    });
  }

  private async showCoinFlip() {
    applyScenarioBackground(getActiveScenario('coin_flip', (SCENARIOS as any).coin_flip || (SCENARIOS as any).lobby));
    this.container.innerHTML = this.board.renderCoinFlipScreen();
    
    const p = document.getElementById('er-particles-coin');
    if (p) this.spawnSparkParticles(p);

    SoundManager.playAmbient('coin_flip');

    // Entrance Anim
    gsap.to('#coin-title', { opacity: 1, y: 0, duration: 1.5, ease: 'power2.out' });
    gsap.to('#coin-result-text', { opacity: 1, duration: 1.2, delay: 0.5 });

    const coin = document.getElementById('coin');
    const resultText = document.getElementById('coin-result-text');
    if (!coin || !resultText) return;

    // Result: 0 = Player (Cara), 1 = AI (Coroa)
    const result = Math.random() > 0.5 ? 1 : 0;
    const finalRotation = 1800 + (result * 180);

    // Wait a bit before flipping
    setTimeout(() => {
      SoundManager.playAction('coin_start', 0.5);
      SoundManager.playAction('coin_spin', 0.6);

      gsap.to(coin, {
        rotateY: finalRotation,
        duration: 2.8,
        ease: "power2.inOut",
        onComplete: () => {
          SoundManager.playAction(result === 0 ? 'coin_win' : 'coin_lose', 0.7);
          resultText.textContent = result === 0 ? t('bt.destinyWin') : t('bt.destinyLose');
          resultText.style.color = result === 0 ? '#ffd76a' : '#ff5b74';
          resultText.style.letterSpacing = '6px';
          resultText.style.fontWeight = '900';
          
          gsap.fromTo(resultText, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2 });

          setTimeout(() => {
            this.init(result === 0 ? 'p' : 'e');
          }, 2500);
        }
      });
    }, 1500);
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
            const bestVar = getBestVariationForCard(c?.id || c?.name || resolved?.id || resolved?.name || '');
            const atk = bestVar?.rolledAtk || resolved.baseAtk || resolved.atk || c.baseAtk || c.atk || 100;
            const pv = bestVar?.rolledPv || resolved.basePv || resolved.pv || c.basePv || c.pv || 500;
            return {
              ...resolved,
              ...c,
              id: `p-${Math.random().toString(36).substr(2, 9)}`,
              owner: 'p' as const,
              atk,
              pv,
              maxPv: pv,
              rarity: bestVar?.rarity || resolved.preferredRarity || resolved.rarity || c.preferredRarity || c.rarity || 'common',
              abilityId: (bestVar?.passiveAbilityId || resolved.abilityId || c.abilityId || 'none') as any,
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
        SoundManager.playAmbient('batalha');
        applyScenarioBackground(getActiveScenario('battle', (SCENARIOS as any).battle));
      } else {
        this.engine.initBattle();
        applyScenarioBackground(getActiveScenario('battle', (SCENARIOS as any).battle));
      }
    } catch (e) {
      console.error("Battle Init Error:", e);
      this.engine.initBattle(); // Fallback to fresh battle
      applyScenarioBackground(getActiveScenario('battle', (SCENARIOS as any).battle));
    }

    // Se houver contexto de Duelo contra NPC da Fase, equipa Deck, Passiva, Artefato, Cenário e Trilha do NPC
    const npcCtx = getActiveNpcBattleContext();
    if (npcCtx) {
      if (npcCtx.battleScenarioKey) {
        applyScenarioBackground(
          getActiveScenario(npcCtx.battleScenarioKey, npcCtx.battleScenarioKey)
        );
      }
      if (npcCtx.battleBgmUrl) {
        SoundManager.playTrackUrl(npcCtx.battleBgmUrl);
      }
      const npcDeckTemplates = resolveNpcDeckCards({
        id: npcCtx.npcId,
        name: npcCtx.npcName,
        matrixCardId: npcCtx.matrixCardId,
        npcDeckCardIds: npcCtx.deckCardIds,
      } as any);
      if (npcDeckTemplates && npcDeckTemplates.length > 0) {
        const customAiDeck: Card[] = npcDeckTemplates.map((tmpl: any, idx: number) => {
          const atk = tmpl.baseAtk || tmpl.atk || 110;
          const pv = tmpl.basePv || tmpl.pv || 480;
          return {
            ...tmpl,
            id: `e-npc-${idx}-${Math.random().toString(36).substring(2, 7)}`,
            name: tmpl.name || `Carta de ${npcCtx.npcName}`,
            owner: 'e' as const,
            atk,
            pv,
            maxPv: pv,
            image: tmpl.image || npcCtx.npcImage,
            manaCost: tmpl.manaCost ?? 1,
            staminaCost: tmpl.staminaCost ?? 1,
            rarity: tmpl.preferredRarity || tmpl.rarity || 'rare',
            abilityId: (
              (idx === 0 && npcCtx.passiveAbilityId) ||
              tmpl.abilityId ||
              'none'
            ) as any,
            attacks: tmpl.attacks || [{ name: 'ATAQUE', damage: atk, cost: 1, costType: 'stamina' }],
            specialAttack: tmpl.specialAttack,
            matrixCard: tmpl.matrixCard || tmpl.cardData,
          };
        });
        this.engine.aiDeck = customAiDeck.slice(3);
        this.engine.aiHand = customAiDeck.slice(0, 3);
      }
      if (npcCtx.activeArtifactId) {
        const foundArt = getAvailableActiveArtifacts().find(
          (a) => a.id === npcCtx.activeArtifactId || a.name === npcCtx.activeArtifactId
        );
        if (foundArt) {
          this.engine.aiSkills[0] = { ...(foundArt as any) };
        }
      }
      if (npcCtx.npcHp && npcCtx.npcHp > 0) {
        this.engine.hp.e = Math.max(400, npcCtx.npcHp);
      }
    }

    if (starterTurn) this.engine.turn = starterTurn;

    this.render();
    this.startTimer();
    setTimeout(() => {
      this.showBanner(
        npcCtx
          ? `⚔️ DUELO: ${npcCtx.npcName.toUpperCase()}`
          : this.engine.turn === 'p'
          ? t('bt.yourTurn')
          : t('bt.aiTurn')
      );
      this.animateHandCards();
      if (this.engine.turn === 'e') setTimeout(() => this.runAI(), 1200);
    }, 120);
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  private render() {
    FX.resetBattleTransforms();
    if (this.engine.hp.p <= 0 || this.engine.hp.e <= 0) {
      if (this.isGameOver()) return;
    }
    this.landscapeBoard.setEnemyHandCount(this.engine.aiHand.length);
    this.container.innerHTML = this.board.render(
      this.engine.board, this.engine.hp, this.engine.mana, this.engine.stamina, this.engine.turn, this.timer, this.engine.grave, this.engine.deck.length
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
    const isLandscape = OrientationManager.isLandscape();
    const isMobileLs = OrientationManager.isMobileLandscape();
    const isTabletLs = OrientationManager.isTabletLandscape();

    const spreadX = isLandscape
      ? isMobileLs
        ? Math.min(58, Math.max(32, 240 / Math.max(1, n)))
        : isTabletLs
        ? Math.min(68, Math.max(40, 340 / Math.max(1, n)))
        : Math.min(86, Math.max(52, 460 / Math.max(1, n)))
      : Math.min(38, Math.max(22, 190 / Math.max(1, n - 1)));
    const rotStep = isLandscape ? (isMobileLs ? 3.5 : 4.5) : Math.min(7, 28 / Math.max(1, n - 1));
    const tyStep = isLandscape ? (isMobileLs ? 2.5 : 4.5) : Math.min(5, 18 / Math.max(1, n - 1));
    const hoverLiftY = isLandscape ? (isMobileLs ? -24 : isTabletLs ? -38 : -48) : -50;
    const hoverScale = isLandscape ? (isMobileLs ? 1.2 : 1.22) : 1.25;

    this.engine.hand.forEach((c: Card, i: number) => {
      const el = document.createElement('div');
      el.className = 'hand-card-hifi';
      el.setAttribute('data-id', c.id);
      el.setAttribute('style', 'touch-action:manipulation');

      // Dynamic Alignment Calculation
      const center = (n - 1) / 2;
      const offset = i - center;
      const rot = offset * rotStep;
      const tx = offset * spreadX;
      const ty = Math.abs(offset) * tyStep;
      const baseTransform = `rotate(${rot}deg) translateX(${tx}px) translateY(${ty}px)`;

      el.dataset.baseTransform = baseTransform;
      el.dataset.tx = String(tx);
      el.style.transform = baseTransform;
      el.style.zIndex = `${100 - Math.abs(Math.round(offset * 2))}`;

      el.innerHTML = this.board.renderHandCard(c);
      handCont.appendChild(el);

      el.onmouseenter = () => {
        if (!el.classList.contains('selected')) {
          el.style.transform = `translateX(${tx}px) translateY(${hoverLiftY}px) scale(${hoverScale}) rotate(0deg)`;
          el.style.zIndex = '300';
        }
      };

      el.onmouseleave = () => {
        if (!el.classList.contains('selected')) {
          el.style.transform = baseTransform;
          el.style.zIndex = `${100 - Math.abs(Math.round(offset * 2))}`;
        }
      };

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

    const graveEl = document.querySelector('.sepulture-slot');
    if (graveEl) {
      graveEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.engine.grave.length > 0) {
          SoundManager.playAction('clique_geral', 0.4);
          this.showFullscreen(this.engine.grave[this.engine.grave.length - 1]);
        }
      });
    }

    document.querySelectorAll('.slot-e').forEach(slot => {
      const el = slot as HTMLElement;
      const eIdx = parseInt(el.dataset.idx!);

      const isBoardEmpty = this.engine.board.slice(0, 3).every(c => c === null);

      if (this.isTargeting) {
        // If targeting, allow clicking empty slots ONLY if the board is empty
        if (this.engine.board[eIdx] || isBoardEmpty) {
          el.classList.add('targetable');
        }
      } else if (this.isTargetingSkill !== null) {
        el.classList.add('targetable');
      }

      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (this.isTargeting) {
          // Only resolve attack if it's a valid target (card exists, or board is empty)
          if (this.engine.board[eIdx] || isBoardEmpty) {
            this.resolveAttack(eIdx);
          }
        }
        else if (this.isTargetingSkill !== null) this.resolveSkillOnTarget(eIdx);
      });
      const card = this.engine.board[eIdx];
      if (card) bindLongPress(el, () => this.showFullscreen(card));
    });
  }

  // ─── TURN LOGIC ───────────────────────────────────────────────────────────

  private handleEndTurn() {
    this.stopTimer();
    if (this.isGameOver()) return;
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
    if (this.engine.hp.e <= 0) { this.triggerEndScreen(true); return true; }
    
    // Check if player has no options left
    const playerHasBoard = this.engine.board.slice(3,6).some(c => c !== null);
    const pDeckEmpty = this.engine.deck.length === 0;
    const pHandEmpty = this.engine.hand.length === 0;
    
    if (!playerHasBoard && pDeckEmpty && pHandEmpty) {
       this.triggerEndScreen(false); 
       return true;
    }

    const enemyHasBoard = this.engine.board.slice(0,3).some(c => c !== null);
    const eDeckEmpty = this.engine.aiDeck.length === 0;
    const eHandEmpty = this.engine.aiHand.length === 0;

    if (!enemyHasBoard && eDeckEmpty && eHandEmpty) {
       this.triggerEndScreen(true); 
       return true;
    }

    return false;
  }

  private triggerEndScreen(isWin: boolean, isSurrender: boolean = false) {
    this.stopTimer();
    FX.resetBattleTransforms();
    if (document.getElementById('end-battle-overlay')) return;
     
    let title = isWin ? t('bt.winTitle') : t('bt.loseTitle');
    let subtitle = isWin ? t('bt.winSub') : t('bt.loseSub');
    
    if (isSurrender) {
      title = t('bt.cowardTitle');
      subtitle = t('bt.cowardSub');
    }

    const pvRemain = Math.max(0, this.engine.hp.p);

    const prevData = ProgressionManager.getPlayerData();
    const previousXp = prevData.xp;
    const xpForNextLevel = ProgressionManager.getNextLevelXpRequirement(prevData.level);
    const oldPct = Math.min(100, (previousXp / xpForNextLevel) * 100);

    const matchStats = {
      cardsUsed: this.engine.stats.cardsPlayed,
      perfectParrys: 0,
      cardsDefeated: this.engine.grave.filter(c => c.owner === 'e').length
    };

    let newData = prevData;
    let rewards = {
      xpGained: isWin ? 60 : 25,
      goldGained: isWin ? 60 : 20,
      diamondGained: isWin ? 1 : 0,
      enjinGained: isWin ? 1 : 0
    };
    let npcOutcome: any = null;

    try {
      const matchRewardsRes = ProgressionManager.applyMatchRewards(isWin && !isSurrender, matchStats);
      newData = matchRewardsRes.data;
      rewards = matchRewardsRes.rewards;
    } catch (err) {
      console.error('Error applying match rewards:', err);
    }

    try {
      npcOutcome = recordNpcBattleOutcome(isWin && !isSurrender);
    } catch (err) {
      console.error('Error recording NPC battle outcome:', err);
    }

    const droppedVar = npcOutcome?.droppedVariation || null;

    const xpGained = rewards.xpGained + (npcOutcome?.xpEarned || 0);
    const coinsGained = rewards.goldGained + (npcOutcome?.goldEarned || 0);
    const diamondsGained = rewards.diamondGained + (npcOutcome?.gemsEarned || 0);
    const enjinGained = rewards.enjinGained ?? (isWin ? 1 : 0);
    const cardsUsed = matchStats.cardsUsed;
    const defeatedEnemies = matchStats.cardsDefeated;
    
    const userLevel = prevData.level; 
    const newXpForNextLevel = ProgressionManager.getNextLevelXpRequirement(newData.level);
    const newPct = Math.min(100, (newData.xp / newXpForNextLevel) * 100);

    const themeClass = isWin ? 'win-theme' : 'lose-theme';
    const bannerClass = isWin ? 'win-ribbon' : (isSurrender ? 'coward-ribbon' : 'lose-ribbon');
    const btnClass = isWin ? '' : 'lose-btn';

    const overlay = document.createElement('div');
    overlay.id = 'end-battle-overlay';
    overlay.className = themeClass;

    const droppedRarityMeta = droppedVar ? RARITY_META[droppedVar.rarity] : null;
    const droppedCardName = (droppedVar as any)?.name || (droppedVar as any)?.variationName || (droppedVar as any)?.baseCardName || 'Carta Especial';
    const droppedCardHtml = droppedVar && droppedRarityMeta ? `
      <div style="margin: 10px 0 6px; padding: 10px 12px; border-radius: 14px; background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,27,75,0.92)); border: 2px solid ${droppedRarityMeta.color}; box-shadow: 0 0 22px ${droppedRarityMeta.glow}; display: flex; align-items: center; gap: 12px; text-align: left;">
        <img src="${droppedVar.image}" alt="${droppedCardName}" style="width: 48px; height: 64px; object-fit: cover; border-radius: 8px; border: 1.5px solid ${droppedRarityMeta.color}; flex-shrink: 0;" />
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span style="font-size: 9px; font-weight: 900; padding: 2px 7px; border-radius: 99px; background: ${droppedRarityMeta.color}; color: #090d16; text-transform: uppercase; letter-spacing: 0.08em;">✨ ${droppedRarityMeta.label}</span>
            <span style="font-size: 9px; font-family: monospace; color: #cbd5e1; font-weight: 700;">${droppedVar.serialNumber || '#0001'}</span>
          </div>
          <div style="font-size: 13px; font-weight: 900; color: #ffffff; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">🃏 ${droppedCardName}</div>
          <div style="font-size: 10px; font-weight: 800; color: #fde68a; margin-top: 2px;">${droppedVar.variantTrait || ''} • ⚔️ ATK ${droppedVar.rolledAtk ?? 0} • ❤️ PV ${droppedVar.rolledPv ?? 0}</div>
        </div>
      </div>
    ` : '';
    
    overlay.innerHTML = `
      <div id="er-particles" style="position:absolute;inset:0;pointer-events:none;overflow:hidden;"></div>
      
      <div class="end-screen-content">
        <!-- CABEÇALHO ESTILO BRAWL STARS / SUPERCELL: 3 ESTRELAS EM DESTAQUE SEM ÍCONE CIRCULAR -->
        <div class="end-top-header">
          <div class="end-stars-wrapper ${isWin ? 'win' : 'lose'}" id="end-stars">
            <span class="end-star-item">⭐</span>
            <span class="end-star-item center-star">⭐</span>
            <span class="end-star-item">⭐</span>
          </div>
        </div>

        <!-- FAIXA 3D DE VITÓRIA / DERROTA -->
        <div class="end-ribbon-banner ${bannerClass}" id="end-banner">
          <h1 class="end-ribbon-title">${title}</h1>
        </div>

        <!-- CARD DE RECOMPENSAS E ESTATÍSTICAS -->
        <div class="end-modal-card" id="end-modal-card">
          <div class="end-modal-top-bar">
            <div class="end-level-pill">${t('bt.level')} ${userLevel}</div>
            <div class="end-section-header">${t('bt.end.rewards')}</div>
          </div>

          ${droppedCardHtml}

          <!-- 3 CÁPSULAS DE RECOMPENSAS LADO A LADO -->
          <div class="end-capsules-row" id="end-capsules">
            <!-- 1. MOEDAS -->
            <div class="end-capsule-card gold-capsule">
              <div class="end-capsule-icon-wrap">🪙</div>
              <div class="end-capsule-label">${t('bt.end.coins')}</div>
              <div class="end-capsule-value" id="final-coins">+${coinsGained}</div>
            </div>

            <!-- 2. DIAMANTES -->
            <div class="end-capsule-card gems-capsule">
              <div class="end-capsule-icon-wrap">💎</div>
              <div class="end-capsule-label">${t('bt.end.gems')}</div>
              <div class="end-capsule-value">+${diamondsGained}</div>
            </div>

            <!-- 3. ENJIN COIN -->
            <div class="end-capsule-card enjin-capsule">
              <div class="end-capsule-icon-wrap">🟣</div>
              <div class="end-capsule-label">ENJ COIN</div>
              <div class="end-capsule-value">+${enjinGained}</div>
            </div>
          </div>

          <!-- DIVISÓRIA COM REBAIXO -->
          <div class="end-card-divider"></div>

          <!-- MÉTRICAS ABAIXO -->
          <div class="end-section-header end-metrics-header">${t('bt.end.metrics')}</div>
          <div class="end-metrics-panel" id="end-metrics">
            <div class="end-metrics-badges-row">
              <div class="end-metric-badge">
                <span class="end-metric-badge-icon">💀</span>
                <div class="end-metric-badge-info">
                  <span class="end-metric-badge-title">${t('bt.end.enemies')}</span>
                  <span class="end-metric-badge-val">${defeatedEnemies}x</span>
                </div>
              </div>

              <div class="end-metric-badge">
                <span class="end-metric-badge-icon">💖</span>
                <div class="end-metric-badge-info">
                  <span class="end-metric-badge-title">${t('bt.hpLeft')}</span>
                  <span class="end-metric-badge-val">${pvRemain}</span>
                </div>
              </div>

              <div class="end-metric-badge">
                <span class="end-metric-badge-icon">🃏</span>
                <div class="end-metric-badge-info">
                  <span class="end-metric-badge-title">${t('bt.end.cards')}</span>
                  <span class="end-metric-badge-val">${cardsUsed}</span>
                </div>
              </div>
            </div>

            <!-- BARRA DE XP COMPACTA -->
            <div class="end-xp-compact-wrap">
              <div class="end-xp-compact-bar">
                <div id="er-xp-bar" class="end-xp-compact-fill" style="width:${oldPct}%;"></div>
                <span id="er-xp-txt" class="end-xp-compact-txt">
                  +${xpGained} XP • ${previousXp}/${xpForNextLevel} XP
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- BOTÃO GRANDE CONTINUAR -->
        <button id="btn-return-lobby" class="btn-end-continue-game ${btnClass}">${
          window.location.search.includes('embedded=1')
            ? 'COLETAR & VOLTAR À FASE'
            : t('bt.end.continue')
        }</button>
      </div>

      <div id="coin-fling-container" style="position:fixed;inset:0;pointer-events:none;z-index:9999998;overflow:hidden;"></div>
    `;
     
    document.body.appendChild(overlay);

    const partCont = document.getElementById('er-particles');
    if (partCont) this.spawnSparkParticles(partCont);

    // Audio & Entrada rápida e impactante
    setTimeout(() => { 
      overlay.style.opacity = '1'; 
      try {
        SoundManager.playAction(isWin ? 'vitoria_fanfare' : 'derrota_sting', 0.85);
      } catch (err) {
        console.warn('Sound playAction error:', err);
      }
      setTimeout(() => {
        try {
          SoundManager.playAmbient(isWin ? 'vitoria' : 'derrota');
        } catch (err) {
          console.warn('Sound playAmbient error:', err);
        }
      }, 400);
    }, 50);

    const starsEl = document.getElementById('end-stars');
    const bannerEl = document.getElementById('end-banner');
    const modalEl = document.getElementById('end-modal-card');
    const capsulesEl = document.getElementById('end-capsules');
    const metricsEl = document.getElementById('end-metrics');
    const btn = document.getElementById('btn-return-lobby') as HTMLElement;
    const xpBar = document.getElementById('er-xp-bar');
    const coinRef = document.getElementById('final-coins');

    // Entrada com GSAP fluida e em cascata
    if (starsEl) {
      gsap.fromTo(starsEl, 
        { scale: 0.2, opacity: 0, y: -25 },
        { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: 'back.out(2)' }
      );
    }

    if (bannerEl) {
      gsap.fromTo(bannerEl,
        { scale: 1.25, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.45, delay: 0.12, ease: 'back.out(1.5)' }
      );
    }

    if (modalEl) {
      gsap.fromTo(modalEl,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, delay: 0.35, ease: 'power2.out' }
      );
    }

    if (capsulesEl) {
      gsap.fromTo(capsulesEl.children,
        { opacity: 0, y: 15, scale: 0.8 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, delay: 0.45, stagger: 0.08, ease: 'back.out(1.5)' }
      );
    }

    if (metricsEl) {
      gsap.fromTo(metricsEl,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, delay: 0.55, ease: 'power2.out' }
      );
    }

    if (btn) {
      gsap.fromTo(btn,
        { opacity: 0, scale: 0.85, y: 15 },
        { opacity: 1, scale: 1, y: 0, duration: 0.35, delay: 0.65, ease: 'back.out(1.5)' }
      );
    }

    // Moedas e preenchimento de XP
    setTimeout(() => {
      if (coinsGained > 0) this.flingCoins(coinsGained, coinRef);
      if (xpBar) gsap.to(xpBar, { width: `${newPct}%`, duration: 1.2, ease: 'power1.out' });
    }, 600);

    if (btn) {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (window.location.search.includes('embedded=1') && window.parent && window.parent !== window) {
          window.parent.postMessage(
            { type: 'SLIMELANDS_NPC_BATTLE_COMPLETED', outcome: npcOutcome },
            '*'
          );
          return;
        }
        window.location.href = 'hub.html';
      };
    }

    // Clique em qualquer área para acelerar animações
    overlay.onclick = () => {
      if (xpBar) gsap.to(xpBar, { width: `${newPct}%`, duration: 0.2 });
      if (btn) gsap.to(btn, { opacity: 1, scale: 1, duration: 0.2 });
    };
  }

  private flingCoins(amount: number, targetLabel: HTMLElement | null) {
      if (amount <= 0) return;
      const count = Math.min(Math.ceil(amount / 10), 20); // visual coins
      const container = document.getElementById('coin-fling-container');
      const targetHeader = document.getElementById('player-coins');
      if (!container) return;

      let currentCoins = 0;

      for (let i = 0; i < count; i++) {
          setTimeout(() => {
              const c = document.createElement('div');
              c.textContent = '🪙';
              c.style.cssText = `position:absolute; left:50%; top:50%; font-size:1.5rem; filter:drop-shadow(0 0 10px gold); pointer-events:none;`;
              container.appendChild(c);
              
              SoundManager.playAction('moeda_coletar', 0.4);

              const destX = window.innerWidth / 2;
              const destY = 50;

              gsap.fromTo(c, 
                { x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200, opacity: 0, scale: 0 },
                { opacity: 1, scale: 1.5, duration: 0.4, ease: 'back.out' }
              );

              gsap.to(c, {
                  left: destX,
                  top: destY,
                  x: 0, y: 0,
                  delay: 0.5,
                  duration: 0.8,
                  ease: 'power2.in',
                  onComplete: () => {
                      c.remove();
                      currentCoins += amount / count;
                      if (targetLabel) targetLabel.textContent = `${Math.floor(currentCoins)} 🪙`;
                      // Pulse header
                      if (targetHeader) {
                          gsap.fromTo(targetHeader, { scale: 1.3, color: '#ffd700' }, { scale: 1, color: '#fff', duration: 0.3 });
                      }
                  }
              });
          }, i * 100);
      }
  }



  private spawnSparkParticles(container: HTMLElement) {
    const count = 30;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('div');
      const size = Math.random() * 3 + 1;
      spark.style.cssText = `
        position:absolute;
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        width:${size}px;
        height:${size}px;
        background:#ffaa00;
        border-radius:50%;
        filter:blur(1px) drop-shadow(0 0 5px #ff6600);
        opacity:0;
        pointer-events:none;
        z-index:5;
      `;
      container.appendChild(spark);

      gsap.to(spark, {
        opacity: Math.random() * 0.8 + 0.2,
        y: -100 - Math.random() * 200,
        x: (Math.random() - 0.5) * 100,
        duration: 3 + Math.random() * 4,
        repeat: -1,
        delay: Math.random() * 5,
        ease: 'power1.out',
        onRepeat: () => {
          gsap.set(spark, { left: `${Math.random() * 100}%`, top: '100%', y: 0 });
        }
      });
    }
  }

  private checkAutoEnd() {
    if (this.isGameOver()) return;
    if (this.engine.turn !== 'p') return;

    // Check if player can still perform ANY action
    const hasActions = this.engine.actionsLeft > 0;
    if (!hasActions) {
      if (this.engine.turn === 'p') {
        // Prevent instant transitions so passive messages / interactions can be read!
        setTimeout(() => {
          if (this.engine.turn === 'p') this.handleEndTurn();
        }, 1500);
      }
      return;
    }

    // Precise Action Check to see if player CAN actually use their remaining action
    const hasSlots = this.engine.board.slice(3, 6).some(s => s === null);
    const canPlay = this.engine.hand.some(c => this.engine.mana.p >= (c.manaCost || 1)) && hasSlots;
    const myCards = this.engine.board.slice(3, 6);
    const canAtk = myCards.some(c => c && this.engine.stamina.p >= (c.staminaCost || 1));
    const canDraw = this.engine.deck.length > 0 && this.engine.hand.length < 7;
    const canSac = myCards.some(c => c !== null);
    const canSkill = this.engine.activeSkills.some(s => s && s !== null && this.engine.mana.p >= (s.manaCost || 0) && this.engine.stamina.p >= (s.staminaCost || 0));

    if (!canPlay && !canAtk && !canDraw && !canSac && !canSkill) {
      setTimeout(() => {
        if (this.engine.turn === 'p' && !this.isTargeting && !this.isTargetingSkill) {
          const mini = document.getElementById('mini-end-confirm');
          if (mini && !mini.classList.contains('active')) {
            mini.classList.add('active'); // auto-prompt end turn
          }
        }
      }, 1500);
    }
  }

  private confirmAction(title: string, msg: string, onConfirm: () => void) {
    const overlay = document.getElementById('overlay-confirm');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-msg');
    const btnYes = document.getElementById('confirm-yes');
    const btnNo = document.getElementById('confirm-no');

    if (!overlay || !titleEl || !msgEl || !btnYes || !btnNo) return;

    // Reset previous listeners
    const newYes = btnYes.cloneNode(true);
    const newNo = btnNo.cloneNode(true);
    btnYes.parentNode?.replaceChild(newYes, btnYes);
    btnNo.parentNode?.replaceChild(newNo, btnNo);

    titleEl.textContent = title;
    msgEl.textContent = msg;

    newYes.addEventListener('click', () => {
      overlay.classList.remove('active');
      onConfirm();
    });

    newNo.addEventListener('click', () => {
      overlay.classList.remove('active');
    });

    overlay.classList.add('active');
  }

  // ─── AI ───────────────────────────────────────────────────────────────────

  private triggerParryQTE(defIdx?: number): Promise<boolean> {
    const overlay = document.getElementById('parry-overlay');
    const outer = document.getElementById('parry-outer');
    const feedback = document.getElementById('parry-feedback');
    if (!overlay || !outer || !feedback) return Promise.resolve(false);

    return new Promise(resolve => {
      overlay.classList.add('active');
      feedback.style.opacity = '0';
      gsap.set(feedback, { y: 0 });

      let clicked = false;
      let success = false;

      const onAttempt = (e: Event) => {
        e.stopPropagation();
        if (clicked) return;
        clicked = true;

        const currentScale = gsap.getProperty(outer, "scale") as number;

        if (currentScale >= 0.25 && currentScale <= 0.45) {
          success = true;
          feedback.textContent = t('bt.parryPerfect');
          feedback.style.color = '#ffd700';

          // Visual feedback to the card
          if (defIdx !== undefined) {
            const defEl = document.querySelector(`[data-idx="${defIdx}"] .card-face`) as HTMLElement;
            if (defEl) {
              defEl.classList.add('fx-parry-success');
              setTimeout(() => defEl.classList.remove('fx-parry-success'), 600);
              const r = defEl.getBoundingClientRect();
              spawnParticles(r.left + r.width / 2, r.top + r.height / 2, '#ffffff', 25);
              spawnParticles(r.left + r.width / 2, r.top + r.height / 2, '#ffd700', 15);
            }
          }
        } else if (currentScale > 0.45) {
          success = false;
          feedback.textContent = t('bt.tooEarly');
          feedback.style.color = '#ff4444';
        } else {
          success = false;
          feedback.textContent = t('bt.tooLate');
          feedback.style.color = '#ff4444';
        }

        gsap.killTweensOf(outer);
        gsap.to(feedback, { opacity: 1, y: -20, duration: 0.3 });

        setTimeout(() => {
          overlay.classList.remove('active');
          resolve(success);
        }, 800);
      };

      overlay.onclick = onAttempt;
      overlay.ontouchend = (e) => { e.preventDefault(); onAttempt(e); };

      gsap.fromTo(outer,
        { scale: 1, opacity: 0.8 },
        {
          scale: 0,
          opacity: 1,
          duration: 1.5,
          ease: "none",
          onComplete: () => {
            if (!clicked) {
              clicked = true;
              feedback.textContent = 'ERROU!';
              feedback.style.color = '#ff4444';
              gsap.to(feedback, { opacity: 1, y: -20, duration: 0.3 });
              setTimeout(() => {
                overlay.classList.remove('active');
                resolve(false);
              }, 800);
            }
          }
        }
      );
    });
  }

  private async triggerArtifactVFX(): Promise<void> {
    const screen = document.querySelector('.battle-screen');
    if (!screen) return;
    gsap.to(screen, { filter: 'brightness(0.3) contrast(1.4) saturate(1.5)', duration: 0.4 });
    for (let i = 0; i < 4; i++) {
      await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
      const flash = document.createElement('div');
      flash.style.cssText = `position:fixed;inset:0;background:rgba(255,255,255,0.8);z-index:9005;pointer-events:none;opacity:0;`;
      document.body.appendChild(flash);
      gsap.to(flash, { opacity: 1, duration: 0.05, repeat: 1, yoyo: true, onComplete: () => flash.remove() });
    }
    await new Promise(r => setTimeout(r, 300));
    gsap.to(screen, { filter: 'brightness(1) contrast(1) saturate(1)', duration: 0.8 });
  }

  private runAI() {
    if (this.isGameOver() || this.engine.turn !== 'e' || this.isAIProcessing) return;
    this.isAIProcessing = true;

    const action = this.aiLogic.computeMove(this.engine, this.difficulty);

    if (action.action === 'attack' && action.atkIdx !== undefined && action.defIdx !== undefined) {
      this.showBanner('⚔️ ' + t('bt.aiAttacks'));
      setTimeout(async () => {
        const isAttackingPlayerSlot = action.defIdx! >= 3;
        const atk = this.engine.board[action.atkIdx!];
        const atkDef = action.attackIdx === 99
          ? atk?.specialAttack
          : atk?.attacks?.[action.attackIdx || 0];
        const isPureEnchantment = (atkDef as any)?.type === 'enchantment';

        let parried = false;
        if (isAttackingPlayerSlot && !isPureEnchantment) {
          const defCard = this.engine.board[action.defIdx!];
          // Only cards with 'parry' property > 0 can trigger the QTE
          if (defCard && (defCard.parry ?? 0) > 0) {
            const atkCost = action.attackIdx === 99 
              ? (atk?.specialAttack?.cost || 1) 
              : (atk?.attacks?.[action.attackIdx || 0]?.cost || 1);
              
            if (this.engine.stamina.p >= atkCost) {
              parried = await this.triggerParryQTE(action.defIdx);
              if (parried) {
                this.engine.stamina.p -= atkCost;
                FX.animateStaminaChange('p', this.engine.stamina.p + atkCost, this.engine.stamina.p);
              }
            } else {
               this.showBanner(t('bt.parryCost'));
            }
          }
        }
        this.doAttack(action.atkIdx!, action.defIdx!, () => {
          if (parried) this.showBanner('⚡ ' + t('bt.parryReflected'));
          this.isAIProcessing = false;
          if (this.isGameOver()) return;
          setTimeout(() => this.runAI(), 600);
        }, parried, action.attackIdx || 0);
      }, 500);
    } else if (action.action === 'play' && action.defIdx !== undefined) {
      const preMana = this.engine.mana.e;
      const ok = this.engine.playCard(action.defIdx, action.cardToPlay?.id || '', true);
      const postMana = this.engine.mana.e;
      if (ok) {
        if (preMana !== postMana) FX.animateManaChange('e', preMana, postMana);
        this.render();
        const s = document.querySelector(`[data-idx="${action.defIdx}"]`) as HTMLElement | null;
        if (s) this.animateCardToBoard(s);
        setTimeout(() => {
          this.isAIProcessing = false;
          this.runAI();
        }, 800);
      } else {
        this.isAIProcessing = false;
        this.endAITurn();
      }
    } else if (action.action === 'skill' && action.skillIdx !== undefined) {
      const skill = this.engine.aiSkills?.[action.skillIdx] || this.engine.activeSkills[action.skillIdx];
      if (skill) {
        this.showBanner(`💎 IA USA ${skill.name.toUpperCase()}`);
        setTimeout(async () => {
          await this.triggerArtifactVFX();
          const preMana = this.engine.mana.e;
          const preStam = this.engine.stamina.e;
          const res = this.engine.useSkill(action.skillIdx!, action.defIdx, true);
          if (res.success) {
            FX.animateManaChange('e', preMana, this.engine.mana.e);
            FX.animateStaminaChange('e', preStam, this.engine.stamina.e);
            this.render();
            if (this.isGameOver()) return;
            setTimeout(() => {
              this.isAIProcessing = false;
              this.runAI();
            }, 800);
          } else {
            this.isAIProcessing = false;
            this.endAITurn();
          }
        }, 500);
      } else {
        this.isAIProcessing = false;
        this.endAITurn();
      }
    } else if (action.action === 'sacrifice' && action.atkIdx !== undefined) {
      this.showBanner('🔥 ' + t('bt.sacrifice'));
      const cardEl = document.querySelector(`[data-idx="${action.atkIdx}"] .card-face`);
      const finishSac = () => {
        this.engine.sacrifice(action.atkIdx!, true);
        this.render();
        if (this.isGameOver()) return;
        setTimeout(() => {
          this.isAIProcessing = false;
          this.runAI();
        }, 650);
      };
      if (cardEl) {
        deathExplosion(cardEl, finishSac);
      } else {
        setTimeout(finishSac, 400);
      }
    } else if (action.action === 'draw') {
      this.showBanner('🎴 ' + t('bt.oppDrew'));
      setTimeout(() => {
        this.engine.drawAIAndConsumeAction();
        this.render();
        if (this.isGameOver()) return;
        setTimeout(() => {
          this.isAIProcessing = false;
          this.runAI();
        }, 600);
      }, 500);
    } else {
      this.isAIProcessing = false;
      this.endAITurn();
    }
  }

  private endAITurn() {
    if (this.isGameOver()) return;
    SoundManager.playAction('carta_sacada', 0.5); // Turn switch sound
    this.engine.endTurn();
    this.render();
    this.startTimer();
    this.showBanner(t('bt.yourTurn'));
  }

  // ─── PLAYER ACTIONS ───────────────────────────────────────────────────────

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

    // Create a ghost card for the movement animation
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
    const playedCardAbility = this.selectedHandCard.abilityId;
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
          
          let bannerText = t('bt.summoned');
          if (playedCardAbility && playedCardAbility !== 'none') {
            const ab = CARD_ABILITIES.find(a => a.id === playedCardAbility);
            if (ab) bannerText = `${ab.icon} ${ab.name.toUpperCase()} ATIVADA!`;
          }
          this.showBanner(bannerText);
          
          this.checkAutoEnd();
        } else {
          if (this.engine.actionsLeft <= 0) this.showBanner('⛔ ' + t('bt.noActions'));
          else this.showBanner('💎 ' + t('bt.noMana'));
          this.render();
        }
      }
    });
  }

  private openAction(idx: number) {
    SoundManager.playAction('clique_geral', 0.4);
    this.clearHandSelection();
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
          const isEnc = atk.type === 'enchantment';
          const costVal = atk.cost;
          const costIcon = atk.costType === 'mana' ? '💎' : '⚡';
          const hasRes = (this.engine as any)[atk.costType].p >= costVal;
          btn.disabled = noActions || !hasRes || (!!card.isStunned && !isEnc); 
          
          let label = atk.name.toUpperCase();
          if (isEnc && atk.enchantment) {
            const encId = atk.enchantment.id;
            const encDef = ENCHANTMENT_REGISTRY.find((e: any) => e.id === encId);
            if (encDef) label = `${encDef.icon} ${label}`;
          }
          
          btn.innerHTML = `<div class="name-tag">${label}</div><div class="cost-tag">${costIcon}${costVal}</div>`;
          btn.onclick = (e) => { e.stopPropagation(); this.startTargeting(i); };
          atkRoot.appendChild(btn);
        });
      }

      // ── Special Attack Button (available to any card) ───────────────────
      if (card.specialAttack) {
        const sp = card.specialAttack;
        const costIcon = sp.costType === 'mana' ? '💎' : '⚡';
        const hasRes = (this.engine as any)[sp.costType].p >= sp.cost;
        const spBtn = document.createElement('button');
        spBtn.className = 'inline-btn-capsule special';
        spBtn.disabled = noActions || !hasRes;
        spBtn.innerHTML = `<div class="name-tag">✨${sp.name.toUpperCase()}</div><div class="cost-tag">${costIcon}${sp.cost}</div>`;
        spBtn.onclick = (e) => { e.stopPropagation(); this.startTargeting(99); };
        atkRoot.appendChild(spBtn);
      }
    }

    const sacBtn = document.getElementById('act-sac') as HTMLButtonElement | null;
    if (sacBtn) sacBtn.disabled = noActions;

    document.getElementById('inline-skill-bar')?.classList.remove('active');
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

    const atkIdx = this.selectedSlotIdx!;
    const card = this.engine.board[atkIdx];
    if (card && card.attacks && attackIdx < card.attacks.length) {
      const atkDef = card.attacks[attackIdx];
      if (atkDef.type === 'enchantment' && atkDef.enchantment) {
        const encDef = ENCHANTMENT_REGISTRY.find(e => e.id === atkDef.enchantment!.id);
        if (encDef) {
          if (encDef.targetType === 'self') {
            this.resolveAttack(atkIdx);
            return;
          }
          if (encDef.targetType === 'user' || encDef.targetType === 'opponent' || encDef.targetType === 'enemy_player') {
            this.resolveAttack(-1); // Special marker for resolveAttack
            return;
          }
        }
      }
    }

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

  // ─── ATTACK ───────────────────────────────────────────────────────────────

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
    const defEl = document.querySelector(`[data-idx="${defIdx}"] .card-face`) as HTMLElement | null;
    const preAtkPv = this.engine.board[atkIdx]?.pv ?? 0;
    const preDefPv = this.engine.board[defIdx]?.pv ?? 0;

    const afterLunge = () => {
      const owner = this.engine.board[atkIdx]?.owner;
      const preStam = owner ? this.engine.stamina[owner] : 0;
      const preMana = owner ? this.engine.mana[owner] : 0;

      const result = this.engine.resolveAttack(atkIdx, defIdx, parried, attackIdx);

      const postStam = owner ? this.engine.stamina[owner] : 0;
      const postMana = owner ? this.engine.mana[owner] : 0;
      const postDefPv = result.defDied ? 0 : result.defPvAfter;
      const postAtkPv = result.atkDied ? 0 : result.atkPvAfter;

      const parts: string[] = [];
      if (result.revealed) parts.push('👁️ Revelada!');
      if (result.typeBonus) parts.push('⚔️ Rivalidade!');
      if (result.damage > 0) {
        if (preDefPv === 0) parts.push('💥 ' + t('bt.direct'));
        else parts.push(`⚔️ ${result.damage} dano`);
      }
      if (result.reflected) parts.push(`🔄 ${result.reflectDamage} reflexo`);
      
      result.abilityTriggers.forEach(t => {
          const enc = ENCHANTMENT_REGISTRY.find(e => e.id === t.abilityId);
          if (enc) {
            parts.push(`${enc.icon} ${enc.name.toUpperCase()}`);
            const targetIdx = t.cardIdx === -2 ? atkIdx : (t.cardIdx === -1 ? -1 : t.cardIdx);
            spawnFloatingText(targetIdx, `${enc.icon} ${enc.name.toUpperCase()}`, '#51c5ff');
          }
      });
      
      this.showBanner(parts.join('  ') || 'Sem efeito');

      const boardEl = document.getElementById('board');
      if (boardEl) {
        const shake = preDefPv === 0 ? 15 : 7;
        gsap.to(boardEl, { x: shake, duration: 0.04, repeat: 7, yoyo: true, onComplete: () => { gsap.set(boardEl, { x: 0 }); } });
      }

      // --- NEW ENGINE FEATURE: Custom VFX Playback ---
      const atkCardDef = this.engine.board[atkIdx];
      const vfxIdToPlay = attackIdx === 99 
          ? atkCardDef?.specialAttack?.vfxId 
          : atkCardDef?.attacks?.[attackIdx]?.vfxId;

      if (vfxIdToPlay && defEl) {
          FX.playVFX(vfxIdToPlay as any, defEl);
      }

      if (result.damage > 0) {
        spawnFloatingText(defIdx, `-${result.damage}`, '#ff4444');
        if (defEl) {
          defEl.classList.add('fx-hit-impact');
          setTimeout(() => defEl.classList.remove('fx-hit-impact'), 500);
          const r = defEl.getBoundingClientRect();
          spawnParticles(r.left + r.width / 2, r.top + r.height / 2, '#ff4444', 20);
        }
      }

      if (parried && result.reflected && atkEl) {
        atkEl.classList.add('fx-reflect-hit');
        setTimeout(() => atkEl.classList.remove('fx-reflect-hit'), 600);
        const r = atkEl.getBoundingClientRect();
        spawnParticles(r.left + r.width / 2, r.top + r.height / 2, '#51c5ff', 30);
        spawnParticles(r.left + r.width / 2, r.top + r.height / 2, '#ffffff', 10);
        spawnFloatingText(atkIdx, `🔄 REFLEXO! -${result.reflectDamage}`, '#51c5ff', '1.2rem');
      } else if (result.reflected && result.reflectDamage > 0) {
        spawnFloatingText(atkIdx, `🔁-${result.reflectDamage}`, '#ff8800');
        if (atkEl) {
          atkEl.classList.add('fx-hit-impact');
          setTimeout(() => atkEl.classList.remove('fx-hit-impact'), 500);
        }
      }

      const icons: Record<string, string> = { 
        reflect: '🔄', resilience: '🛡️', rivalry: '⚔️', vampire: '🧛', deathblow: '💥', phantom: '👻',
        stun: '⚡', burn: '🔥', restore: '💚', shield_up: '🛡️', absorb_50: '🧛'
      };
      const texts: Record<string, string> = { 
        reflect: 'Reflexo', resilience: 'Resiliência', rivalry: 'Rivalidade', vampire: 'Vampirismo', deathblow: 'Deathblow', phantom: 'Fantasma',
        stun: t('bt.cbtStun'), burn: t('bt.cbtBurn'), restore: t('bt.cbtHeal'), shield_up: t('bt.cbtShield'), absorb_50: t('bt.cbtDrain')
      };
      result.abilityTriggers.forEach(t => triggerAbilityAnim({
        ...t, color: t.abilityId === 'restore' ? '#2ecc71' : (t.abilityId === 'burn' ? '#e67e22' : '#fff'),
        icon: icons[t.abilityId] || '✨',
        triggerText: texts[t.abilityId] || 'ENCANTAMENTO'
      }));

      const animations: Promise<void>[] = [];
      if (preDefPv !== postDefPv) animations.push(animateCapsulePv(defIdx, preDefPv, postDefPv));
      if (result.reflected && preAtkPv !== postAtkPv) animations.push(animateCapsulePv(atkIdx, preAtkPv, postAtkPv));
      if (result.hpDmgE > 0 || result.hpDmgP > 0) {
        animations.push(new Promise<void>(resolve => { this.board.updateAttributeBars(this.engine); resolve(); }));
      }
      if (owner && preStam !== postStam) {
        animations.push(FX.animateStaminaChange(owner, preStam, postStam));
      }
      if (owner && preMana !== postMana) {
        animations.push(FX.animateManaChange(owner, preMana, postMana));
      }

      Promise.all(animations).catch(() => { }); // ignore animation errors

      // Force game state to continue regardless of animation completion speeds
      const deadIdxs: number[] = [];
      if (result.defDied) deadIdxs.push(defIdx);
      if (result.atkDied) deadIdxs.push(atkIdx);

      if (deadIdxs.length > 0) {
        let doneCount = 0;
        deadIdxs.forEach(di => {
          const deadEl = document.querySelector(`[data-idx="${di}"] .card-face`);
          if (deadEl) {
            deathExplosion(deadEl, () => {
              SoundManager.playAction('carta_morta', 0.5);
              doneCount++;
              if (doneCount >= deadIdxs.length) { this.render(); onDone(); }
            });
          } else {
            doneCount++;
            if (doneCount >= deadIdxs.length) { this.render(); onDone(); }
          }
        });
      } else {
        setTimeout(() => { this.render(); onDone(); }, 150);
      }
    };

    const atk = this.engine.board[atkIdx];

    // ── SPECIAL ATTACK (idx 99): cinematic before physical lunge ─────────────
    if (attackIdx === 99 && atk?.specialAttack) {
      const sp = atk.specialAttack;

      // Resolve uses specialAttack.damage via attackIdx 99 → fallback to base atk
      // (We temporarily set attackIdx  = 0 for resolveAttack but pass specialAttack data)
      // The resolveAttack already handles atkDef when attackIdx matches attacks array.
      // For specials, we do the cinematic then call afterLunge directly.

      if (sp.videoUrl) {
        // VIDEO MODE: play video fullscreen → physical lunge
        const fakeCard = { ...atk, animationUrl: sp.videoUrl, videoStart: 0, hasVideoAttack: true };
        this.playVideoAttack(fakeCard as any, () => this.executePhysicalAttack(atkEl, defIdx, afterLunge));
      } else {
        // STATIC MODE: show full-screen card preview with motion → hyper lunge
        const fsOverlay = document.createElement('div');
        fsOverlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;`;

        // Clone the card element into fullscreen
        const cloneWrap = document.createElement('div');
        cloneWrap.style.cssText = `width:260px;height:390px;position:relative;border-radius:18px;overflow:hidden;box-shadow:0 0 40px rgba(163,53,238,0.5); transform:scale(0.8);`;
        if (atkEl) {
          const cloneEl = atkEl.cloneNode(true) as HTMLElement;
          cloneEl.style.cssText = `width:100%;height:100%;position:absolute;inset:0;`;
          cloneWrap.appendChild(cloneEl);
        }

        // Shine element
        const shine = document.createElement('div');
        shine.style.cssText = `position:absolute;top:0;left:-150%;width:50%;height:100%;background:linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);transform:skewX(-25deg);z-index:999;`;
        cloneWrap.appendChild(shine);

        // Name label coming up
        const label = document.createElement('div');
        label.style.cssText = `position:absolute;bottom:-60px;text-align:center;color:#fff;width:100%;opacity:0;`;
        label.innerHTML = `<div style="font-size:1.6rem;font-weight:950;letter-spacing:2px;color:#a335ee;text-shadow:0 0 20px rgba(163,53,238,0.8);">${sp.name.toUpperCase()}</div>`;

        fsOverlay.appendChild(cloneWrap);
        fsOverlay.appendChild(label);
        document.body.appendChild(fsOverlay);

        gsap.timeline()
          .to(fsOverlay, { opacity: 1, duration: 0.3 })
          // Leve zoom
          .to(cloneWrap, { scale: 1.15, duration: 1.6, ease: 'power1.out' }, 0)
          // Brilho passa sobre a arte
          .to(shine, { left: '200%', duration: 0.8, ease: 'power2.inOut' }, 0.2)
          // Mostra nome
          .to(label, { bottom: '30px', opacity: 1, duration: 0.4, ease: 'back.out(2)' }, 0.3)
          .to(fsOverlay, {
            opacity: 0, duration: 0.3, delay: 0.4,
            onComplete: () => {
              fsOverlay.remove();
              this.executePhysicalAttack(atkEl, defIdx, afterLunge);
            }
          });
      }
      return;
    }

    // ── STANDARD / HYPER ATTACKS (idx 0-3) ───────────────────────────────────
    // Hyper Cinematic for 3rd/4th slot
    const isHyper = attackIdx >= 2;

    if (isHyper && atkEl) {
      // Hyper Zoom Logic
      const overlay = document.createElement('div');
      overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;opacity:0;`;
      document.body.appendChild(overlay);

      const clone = atkEl.cloneNode(true) as HTMLElement;
      clone.style.width = '200px';
      clone.style.height = '300px';
      clone.style.position = 'relative';
      overlay.appendChild(clone);

      gsap.timeline()
        .to(overlay, { opacity: 1, duration: 0.3 })
        .fromTo(clone, { scale: 0.5, rotation: -10 }, { scale: 1.3, rotation: 0, duration: 0.5, ease: 'back.out(2)' })
        .to(clone, { filter: 'brightness(5)', duration: 0.1, repeat: 3, yoyo: true })
        .to(overlay, {
          opacity: 0, duration: 0.2, delay: 0.3, onComplete: () => {
            overlay.remove();
            if (atk && atk.animationUrl && atk.hasVideoAttack) {
              this.playVideoAttack(atk, () => this.executePhysicalAttack(atkEl, defIdx, afterLunge));
            } else {
              this.executePhysicalAttack(atkEl, defIdx, afterLunge);
            }
          }
        });
    } else {
      if (atk && atk.animationUrl && atk.hasVideoAttack) {
        this.playVideoAttack(atk, () => this.executePhysicalAttack(atkEl, defIdx, afterLunge));
      } else {
        this.executePhysicalAttack(atkEl, defIdx, afterLunge);
      }
    }
  }

  private executePhysicalAttack(atkEl: HTMLElement | null, defIdx: number, onComplete: () => void) {
    if (!atkEl) { onComplete(); return; }

    const defSlot = (defIdx >= 0) 
      ? document.querySelector(`[data-idx="${defIdx}"]`) as HTMLElement | null
      : document.querySelector(this.engine.turn === 'p' ? '.hud-top .hud-stat' : '.player-stats') as HTMLElement | null; // Approximate targets
    
    if (!defSlot) { onComplete(); return; }

    const atkR = atkEl.getBoundingClientRect();
    const defR = defSlot.getBoundingClientRect();

    // Check if it's a direct attack (no card in slot)
    const defCard = defSlot.querySelector('.card-face');
    const isDirect = !defCard;

    const dx = defR.left - atkR.left;
    const dy = defR.top - atkR.top;

    const timeline = gsap.timeline();

    // 1. Anticipation: Pull back
    SoundManager.playAction('atk_basico_1', 0.4);
    timeline.to(atkEl, {
      x: -dx * 0.12,
      y: -dy * 0.12,
      rotationX: dy > 0 ? -20 : 20,
      rotationY: dx > 0 ? -20 : 20,
      duration: 0.35,
      ease: "back.in(2.5)"
    });

    // 2. Smash: Strike
    // If direct, go BEYOND (over-extend)
    const factor = isDirect ? 1.15 : 0.85;

    timeline.to(atkEl, {
      x: dx * factor,
      y: dy * factor,
      rotationX: 0,
      rotationY: 0,
      scale: isDirect ? 1.4 : 1.2,
      filter: isDirect ? 'brightness(5) blur(3px)' : 'brightness(3) blur(2px)',
      duration: 0.12,
      ease: "power4.in",
      onStart: () => {
        // Ghost Trails
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
        this.createImpactVFX(cx, cy, isDirect);
        
        // --- SOUND TRIGGER ---
        SoundManager.playAction(isDirect ? 'atk_especial' : 'atk_basico_2', 0.6);

        // If direct, trigger a fullscreen flash
        if (isDirect) this.triggerArtifactVFX();
        onComplete();
      }
    });

    // 3. Return
    timeline.to(atkEl, {
      x: 0, y: 0, scale: 1,
      filter: 'brightness(1) blur(0px)',
      duration: 0.7,
      ease: "elastic.out(1, 0.5)"
    }, isDirect ? "+=0.25" : "+=0.1"); // Longer pause for direct hits
  }

  private createImpactVFX(x: number, y: number, isDirect: boolean = false) {
    const flash = document.createElement('div');
    const color = isDirect ? 'rgba(255,255,255,0.8)' : 'rgba(255,100,100,0.4)';
    flash.style.cssText = `position:fixed; left:${x}px; top:${y}px; width:150px; height:150px; background:radial-gradient(circle, #fff 10%, ${color} 40%, transparent 70%); border-radius:50%; transform:translate(-50%,-50%); z-index:9999; pointer-events:none; filter:blur(5px);`;
    document.body.appendChild(flash);
    gsap.fromTo(flash, { scale: 0.2, opacity: 1 }, { scale: isDirect ? 4.5 : 2.5, opacity: 0, duration: 0.5, ease: 'power2.out', onComplete: () => flash.remove() });

    // Shockwave ring
    const ring = document.createElement('div');
    ring.style.cssText = `position:fixed; left:${x}px; top:${y}px; width:40px; height:40px; border:4px solid white; border-radius:50%; transform:translate(-50%,-50%); z-index:9998; pointer-events:none;`;
    document.body.appendChild(ring);
    gsap.to(ring, { scale: isDirect ? 15 : 8, opacity: 0, duration: 0.6, ease: 'expo.out', onComplete: () => ring.remove() });
  }

  private playVideoAttack(card: Card, onDone: () => void) {
    const gameUI = document.querySelector('.battle-screen') as HTMLElement;
    const hud = document.querySelector('.hud-top') as HTMLElement;
    const elementsToHide = [gameUI, hud].filter(Boolean);
    gsap.to(elementsToHide, { opacity: 0, duration: 0.3 });

    const overlay = document.createElement('div');
    overlay.className = 'video-attack-overlay-master';
    overlay.style.cssText = `position:fixed; inset:0; z-index:999999; background:#000; display:flex; align-items:center; justify-content:center; opacity:0; cursor:pointer; pointer-events:auto;`;

    const video = document.createElement('video');
    video.src = `${card.animationUrl}#t=${card.videoStart || 0}`;
    video.style.cssText = `width:100%; height:100%; object-fit:cover; filter: contrast(1.1) brightness(1.1); position:absolute; inset:0; z-index:5;`;
    video.muted = false;
    video.playsInline = true;
    overlay.appendChild(video);

    // Add Parallax Layers
    (card.parallaxLayers || []).forEach(pl => {
      const lyr = document.createElement('div');
      let layerFilterClass = '';
      let layerFilterStyle = '';
      if (pl.imageFilter && pl.imageFilter !== 'none') {
        if (['vhs', 'chroma', 'wave', 'pulse_hue'].includes(pl.imageFilter)) {
          layerFilterClass = `fx-${pl.imageFilter}`;
          layerFilterStyle = `--flt-v: ${pl.imageFilterIntensity || 50}px;`;
        } else {
          layerFilterStyle = `filter: ${pl.imageFilter}(${pl.imageFilterIntensity || 100}%);`;
        }
      }
      lyr.className = `parallax-layer-item ${layerFilterClass}`;
      lyr.dataset.layerId = pl.id;
      lyr.style.cssText = `position:absolute; inset:0; background-image:url('${pl.url}'); background-size:cover; background-position:center; z-index:${10 + pl.z}; opacity:${pl.opacity ?? 1}; mix-blend-mode:${pl.blendMode || 'normal'}; transform: scale(${pl.scale || 1}); pointer-events:none; ${layerFilterStyle}`;
      overlay.appendChild(lyr);
    });

    document.body.appendChild(overlay);
    animateParallaxLayers(overlay, card.parallaxLayers || []);


    let skipped = false;
    const skip = () => {
      if (skipped) return;
      skipped = true;
      gsap.killTweensOf(tl);
      gsap.to(overlay, { opacity: 0, duration: 0.3, onComplete: () => { overlay.remove(); gsap.to(elementsToHide, { opacity: 1, duration: 0.2 }); onDone(); } });
    };

    overlay.addEventListener('click', skip);
    overlay.addEventListener('touchstart', (e) => { e.preventDefault(); skip(); }, { passive: false });

    const tl = gsap.timeline({
      onComplete: () => {
        if (!skipped) {
          gsap.to(overlay, { opacity: 0, duration: 0.5, onComplete: () => { overlay.remove(); gsap.to(elementsToHide, { opacity: 1, duration: 0.3 }); onDone(); } });
        }
      }
    });

    tl.to(overlay, { opacity: 1, duration: 0.4 });
    tl.add(() => { video.play().catch(() => { }); });
    tl.fromTo(video, { scale: 1.5, filter: 'brightness(3) blur(20px)' }, { scale: 1, filter: 'brightness(1.1) blur(0px)', duration: 0.8, ease: 'power4.out' }, '-=0.2');
    tl.to(video, { x: 7, y: -7, rotation: 0.7, duration: 0.05, repeat: 75, yoyo: true, ease: 'none' }, '0.8');
    tl.to({}, { duration: 3.3 });
  }

  // ─── SKILLS ───────────────────────────────────────────────────────────────

  private async openSkillDialog(skillIdx: number) {
    this.clearHandSelection();
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

    const needsTarget = ['flip', 'stun', 'burn', 'poison', 'drain', 'nuke'].includes(skill.effect);
    const cancelBtn = document.getElementById('skill-cancel');
    if (confirmBtn) confirmBtn.onclick = async () => {
      bar.classList.remove('active');
      if (this.engine.mana.p < (skill.manaCost || 0) || this.engine.stamina.p < (skill.staminaCost || 0)) {
        this.showBanner('❌ ' + t('bt.insufficientResources'));
        return;
      }

      if (needsTarget) {
        this.showBanner(t('bt.chooseTarget')); this.isTargetingSkill = skillIdx; this.render();
      } else {
        await this.triggerArtifactVFX();
        const preHpP = this.engine.hp.p;
        const preHpE = this.engine.hp.e;
        const res = this.engine.useSkill(skillIdx);
        this.showBanner(res.message);
        const anims: Promise<void>[] = [];
        if (this.engine.hp.p !== preHpP) anims.push(new Promise<void>(resolve => { this.board.updateAttributeBars(this.engine); resolve(); }));
        if (this.engine.hp.e !== preHpE) anims.push(new Promise<void>(resolve => { this.board.updateAttributeBars(this.engine); resolve(); }));
        Promise.all(anims).then(() => { this.render(); this.checkAutoEnd(); });
      }
    };
    if (cancelBtn) cancelBtn.onclick = () => bar.classList.remove('active');
  }

  private async resolveSkillOnTarget(eIdx: number) {
    if (this.isTargetingSkill === null) return;
    const sIdx = this.isTargetingSkill;
    const preHpP = this.engine.hp.p;
    const preHpE = this.engine.hp.e;
    const targetPrePv = this.engine.board[eIdx]?.pv ?? 0;

    const res = await (async () => {
      await this.triggerArtifactVFX();
      return this.engine.useSkill(sIdx, eIdx);
    })();
    this.showBanner(res.message);
    if (res.comboMessage) setTimeout(() => this.showBanner(res.comboMessage!), 1200);

    const targetPostPv = this.engine.board[eIdx]?.pv ?? 0;
    const anims: Promise<void>[] = [];
    if (this.engine.hp.p !== preHpP) anims.push(new Promise<void>(resolve => { this.board.updateAttributeBars(this.engine); resolve(); }));
    if (this.engine.hp.e !== preHpE) anims.push(new Promise<void>(resolve => { this.board.updateAttributeBars(this.engine); resolve(); }));
    if (targetPrePv !== targetPostPv) anims.push(animateCapsulePv(eIdx, targetPrePv, targetPostPv));

    Promise.all(anims).then(() => {
      if (targetPrePv > 0 && targetPostPv === 0) {
        const deadEl = document.querySelector(`[data-idx="${eIdx}"] .card-face`);
        if (deadEl) { deathExplosion(deadEl, () => { this.isTargetingSkill = null; this.render(); this.checkAutoEnd(); }); return; }
      }
      this.isTargetingSkill = null;
      this.render();
      this.checkAutoEnd();
    });
  }

  // ─── HAND / CAROUSEL ──────────────────────────────────────────────────────

  private selectHandCard(c: Card, el: HTMLElement) {
    if (this.selectedHandCard?.id === c.id) return;

    document.querySelectorAll('.hand-card-hifi').forEach(e => {
      const cardEl = e as HTMLElement;
      cardEl.classList.remove('selected');
      const bt = cardEl.dataset.baseTransform;
      if (bt) cardEl.style.transform = bt;
    });

    this.selectedHandCard = c;
    el.classList.add('selected');

    const tx = parseFloat(el.dataset.tx || '0');
    const isMobileLs = OrientationManager.isMobileLandscape();
    const selLiftY = isMobileLs ? -20 : -34;
    const selScale = isMobileLs ? 1.18 : 1.26;
    el.style.transform = `translateX(${tx}px) translateY(${selLiftY}px) scale(${selScale}) rotate(0deg)`;
    el.style.zIndex = '350';

    this.showBanner(t('bt.chooseSlot'));

    document.querySelectorAll('.slot-p').forEach(slot => {
      const idx = parseInt((slot as HTMLElement).dataset.idx!);
      if (!this.engine.board[idx]) (slot as HTMLElement).classList.add('highlight');
    });
  }

  private clearHandSelection() {
    document.querySelectorAll('.hand-card-hifi').forEach(e => {
      const el = e as HTMLElement;
      el.classList.remove('selected');
      const baseTransform = el.dataset.baseTransform;
      if (baseTransform) el.style.transform = baseTransform;
    });
    this.selectedHandCard = null;
    document.querySelectorAll('.slot-p').forEach(slot => slot.classList.remove('highlight'));
  }

  // ─── DECK / DRAW INTERFACE ────────────────────────────────────────────────

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

  private openDeckFan() {
    const isLandscape = OrientationManager.isLandscape();
    const isMobileLs = OrientationManager.isMobileLandscape();
    const fanOverlay = document.createElement('div');
    fanOverlay.style.cssText = `position:fixed;inset:0;background:rgba(4,4,8,0.88);backdrop-filter:blur(16px);z-index:9000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;`;

    const container = document.createElement('div');
    container.style.cssText = isLandscape
      ? `position:relative; width: min(1080px, 92vw); height: clamp(160px, 56dvh, 420px); display:flex; justify-content:center; align-items:flex-end; perspective:1400px;`
      : `position:relative; width: min(400px, 92vw); height: clamp(200px, 32dvh, 260px); display:flex; justify-content:center; align-items:flex-end; perspective:1000px;`;

    const count = this.engine.deck.length;
    const maxArc = isLandscape ? Math.min(68, Math.max(22, count * 6)) : Math.min(90, Math.max(30, count * 6));
    const angleStep = count > 1 ? maxArc / (count - 1) : 0;
    const startAngle = count > 1 ? -maxArc / 2 : 0;
    const maxFanSpan = isLandscape ? Math.min(720, window.innerWidth * 0.68) : 175;
    const xSpread = isLandscape
      ? Math.min(isMobileLs ? 38 : 58, maxFanSpan / Math.max(1, count - 1))
      : Math.min(18, 175 / Math.max(1, count - 1));

    for (let i = 0; i < count; i++) {
      const cardBack = document.createElement('div');
      cardBack.className = 'card-face matrix-frame-mode';
      cardBack.style.cssText = isLandscape
        ? `position:absolute; left:50%; bottom:8px; width: clamp(78px, 24dvh, 210px); height: auto; aspect-ratio: 680/990; overflow:hidden; border-radius:12px; border: 2px solid rgba(255,215,0,0.45); box-shadow: -10px 12px 30px rgba(0,0,0,0.92), 0 0 16px rgba(212,175,55,0.2); cursor:pointer; transform-origin:bottom center; background:#0b0814;`
        : `position:absolute; left:50%; bottom:10px; width: clamp(82px, 12dvh, 102px); height: auto; aspect-ratio: 680/990; overflow:hidden; border-radius:12px; border: 1.5px solid rgba(255,215,0,0.3); box-shadow: -8px 8px 25px rgba(0,0,0,0.9); cursor:pointer; transform-origin:bottom center; background:#0b0814;`;
      cardBack.innerHTML = renderMatrixCardBackSVG();

      const centerOffset = i - (count - 1) / 2;
      const angle = startAngle + (i * angleStep);
      const xOffset = count > 1 ? centerOffset * xSpread : 0;
      const distFromCenter = Math.abs(centerOffset);
      const yOffset = distFromCenter * (isLandscape ? (isMobileLs ? 3 : 5) : (count > 12 ? 3.5 : 6));

      gsap.set(cardBack, { xPercent: -50, x: xOffset, rotation: angle, y: yOffset + (isLandscape ? 240 : 300), zIndex: i, opacity: 0 });

      if (isLandscape) {
        const hoverLift = isMobileLs ? 24 : 44;
        cardBack.onmouseenter = () => {
          if (!fanOverlay.dataset.picking) {
            gsap.to(cardBack, {
              xPercent: -50,
              x: xOffset,
              y: yOffset - hoverLift,
              rotation: angle * 0.35,
              scale: 1.14,
              zIndex: 500,
              boxShadow: '0 20px 45px rgba(0,0,0,0.95), 0 0 28px rgba(255,215,0,0.65)',
              duration: 0.22,
              ease: 'power2.out'
            });
          }
        };
        cardBack.onmouseleave = () => {
          if (!fanOverlay.dataset.picking) {
            gsap.to(cardBack, {
              xPercent: -50,
              x: xOffset,
              y: yOffset,
              rotation: angle,
              scale: 1,
              zIndex: i,
              boxShadow: '-10px 12px 30px rgba(0,0,0,0.92), 0 0 16px rgba(212,175,55,0.2)',
              duration: 0.22,
              ease: 'power2.out'
            });
          }
        };
      }

      cardBack.onclick = () => {
        if (fanOverlay.dataset.picking) return;
        fanOverlay.dataset.picking = "true";

        gsap.to(cardBack, { xPercent: -50, y: yOffset - (isMobileLs ? 45 : 90), scale: 1.22, duration: 0.25, ease: 'back.out(1.7)' });

        setTimeout(() => {
          fanOverlay.remove();
          this.executePlayerDraw();
          SoundManager.playAction('carta_sacada', 0.4);
        }, 280);
      };
      container.appendChild(cardBack);
    }

    const msg = document.createElement('div');
    msg.style.cssText = isLandscape
      ? `margin-bottom: clamp(10px, 3.5dvh, 32px); padding: 0 6%; width: 100%; text-align:center; color: #ffe9a8; font-family:'Cinzel', serif; font-size:clamp(0.95rem, 3.4dvh, 1.85rem); font-weight:950; letter-spacing:2.5px; line-height:1.2; box-sizing:border-box; text-shadow: 0 4px 18px rgba(0,0,0,1), 0 0 20px rgba(212,175,55,0.45);`
      : `margin-bottom: 45px; padding: 0 10%; width: 100%; text-align:center; color: #ffe9a8; font-family:'Cinzel', serif; font-size:1.3rem; font-weight:950; letter-spacing:3px; line-height:1.2; box-sizing:border-box; text-shadow: 0 4px 15px rgba(0,0,0,0.9), 0 0 20px rgba(212,175,55,0.4);`;
    msg.textContent = `${t('bt.choose')} (${count} ${t('bt.remaining')})`;

    fanOverlay.appendChild(msg);
    fanOverlay.appendChild(container);
    document.body.appendChild(fanOverlay);

    fanOverlay.onclick = (e) => {
      if (e.target === fanOverlay || e.target === container) fanOverlay.remove();
    };

    // Entrance animation
    gsap.to(container.children, {
      y: (i) => Math.abs(i - (count - 1) / 2) * (isLandscape ? (isMobileLs ? 3 : 5) : (count > 15 ? 4 : 8)),
      opacity: 1,
      duration: 0.65,
      stagger: count > 20 ? 0.012 : 0.03,
      ease: 'back.out(1.25)'
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

  // ─── FULLSCREEN CARD ──────────────────────────────────────────────────────
  
  private showFullscreen(c: Card) {
    const overlay = document.getElementById('overlay-fullscreen');
    const inner = document.getElementById('fullscreen-card-inner');
    if (!overlay || !inner) return;
    inner.innerHTML = renderPremiumCard(c);
    overlay.classList.add('active');
    animateParallaxLayers(inner, c.parallaxLayers || []);
    gsap.fromTo(inner, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.5)' });


    const close = () => gsap.to(inner, { scale: 0.8, opacity: 0, duration: 0.2, onComplete: () => overlay.classList.remove('active') });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); }, { once: true });
    inner.addEventListener('click', close, { once: true });
  }

  // ─── BANNER / TIMER / ANIMATIONS ──────────────────────────────────────────

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

    const bar = document.getElementById('timer-bar');
    if (bar) {
      const maxTime = 60;
      const circumference = 283; // 2 * PI * 45
      const offset = circumference - (this.timer / maxTime) * circumference;
      bar.style.strokeDashoffset = String(offset);

      // Color states
      bar.classList.remove('warn', 'danger');
      if (this.timer <= 10) bar.classList.add('danger');
      else if (this.timer <= 20) bar.classList.add('warn');
    }
  }

  private animateHandCards() {
    gsap.from('#hand > *', { y: 20, opacity: 0, stagger: 0.05 });
  }

  private animateDrawCard(cb?: () => void) {
    const deckEl = document.querySelector('.deck-back-slot');
    const handCont = document.getElementById('hand');
    if (!deckEl || !handCont) { cb?.(); return; }

    const rect = deckEl.getBoundingClientRect();
    const temp = document.createElement('div');
    temp.className = 'card-face matrix-frame-mode card-draw-anim';
    temp.style.cssText = `position:fixed; left:${rect.left}px; top:${rect.top}px; width:70px; height:102px; aspect-ratio:680/990; border-radius:10px; overflow:hidden; z-index:10000; background:#0b0814;`;
    temp.innerHTML = renderMatrixCardBackSVG();
    document.body.appendChild(temp);

    const handRect = handCont.getBoundingClientRect();
    gsap.to(temp, {
      left: handRect.left + handRect.width / 2,
      top: handRect.top,
      rotation: 720,
      scale: 0.5,
      opacity: 1,
      duration: 0.6,
      ease: 'power2.inOut',
      onComplete: () => {
        temp.remove();
        cb?.();
        this.rebuildHand();
        const lastCard = handCont.querySelector('.hand-card-hifi:last-child') as HTMLElement | null;
        if (lastCard) {
          gsap.fromTo(lastCard, { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.5)' });
        }
      }
    });
  }

  private animateCardToBoard(el: HTMLElement) {
    gsap.fromTo(el,
      { scale: 2, opacity: 0, filter: 'brightness(5)' },
      { scale: 1, opacity: 1, filter: 'brightness(1)', duration: 0.5, ease: 'back.out(1.2)' }
    );
    // Subtle screen shake
    gsap.to(document.getElementById('board'), { x: 4, duration: 0.05, repeat: 3, yoyo: true });
  }
}

autoFullscreen();
new BattleApp();
