import './style.css';
import './ui/styles/Battle.css';
import { gsap } from 'gsap';
import { GameEngine, Card, Skill } from './core/GameEngine';
import { CARD_ABILITIES } from './core/constants';
import type { AbilityTriggered, CardAbilityId } from './core/types';
import { MenuScreen } from './ui/screens/MenuScreen';
import { BoardScreen } from './ui/screens/BoardScreen';
import { CardEditorScreen } from './ui/screens/CardEditorScreen';
import { ArsenalScreen } from './ui/screens/ArsenalScreen';
import { CARD_TEMPLATES, SKILL_POOL } from './core/constants';
import SCENARIOS from './core/scenarios.json';
import { applyScenarioBackground } from './ui/utils/BackgroundUtils';



// ─── PARTICLES ────────────────────────────────────────────────────────────────
function spawnParticles(x: number, y: number, color = '#ff4400', count = 18) {
  const c = document.getElementById('particle-container');
  if (!c) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `background:${color};left:${x}px;top:${y}px;
      position:absolute;width:6px;height:6px;border-radius:50%;pointer-events:none;`;
    c.appendChild(p);
    const angle = (Math.PI * 2 * i) / count;
    const dist = 50 + Math.random() * 80;
    gsap.to(p, {
      x: Math.cos(angle) * dist, y: Math.sin(angle) * dist,
      opacity: 0, scale: 0.1, duration: 0.6 + Math.random() * 0.3, ease: 'power2.out',
      onComplete: () => p.remove(),
    });
  }
}

function deathExplosion(el: Element, onDone?: () => void) {
  const rect = el.getBoundingClientRect();
  spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, '#ff2200', 22);
  spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, '#ffcc00', 12);
  gsap.to(el, {
    scale: 1.8, opacity: 0, filter: 'brightness(10) blur(15px)', duration: 0.5, ease: 'power2.in',
    onComplete: onDone,
  });
}

// ─── FLOATING TEXT ────────────────────────────────────────────────────────────
function spawnFloatingText(slotIdx: number, text: string, color = '#ff4444', fontSize = '1.1rem') {
  const slot = document.querySelector(`[data-idx="${slotIdx}"]`);
  const container = document.getElementById('float-container');
  if (!slot || !container) return;
  const rect = slot.getBoundingClientRect();
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `
    position:fixed;
    left:${rect.left + rect.width / 2}px;
    top:${rect.top + rect.height / 2}px;
    transform:translate(-50%,-50%);
    color:${color};
    font-size:${fontSize};
    font-weight:900;
    font-family:'Orbitron',monospace;
    text-shadow:0 0 8px ${color},0 0 20px ${color};
    pointer-events:none;
    white-space:nowrap;
    z-index:9001;
  `;
  container.appendChild(el);
  gsap.fromTo(el,
    { opacity: 1, y: 0, scale: 0.6 },
    { opacity: 0, y: -60, scale: 1.3, duration: 0.9, ease: 'power2.out', onComplete: () => el.remove() }
  );
}

// ─── ABILITY ANIMATIONS ───────────────────────────────────────────────────────
function triggerAbilityAnim(trigger: AbilityTriggered) {
  const ab = CARD_ABILITIES.find(a => a.id === trigger.abilityId);
  if (!ab) return;
  const val = trigger.value !== undefined ? ` ${trigger.value}` : '';
  spawnFloatingText(trigger.cardIdx, `${ab.icon} ${ab.triggerText}${val}`, ab.color, '0.9rem');

  const slotEl = document.querySelector(`[data-idx="${trigger.cardIdx}"] .card-face`) as HTMLElement | null;
  if (!slotEl) return;

  const glowColor = ab.color;
  switch (trigger.abilityId as CardAbilityId) {
    case 'reflect':
      gsap.timeline()
        .to(slotEl, { boxShadow: `0 0 30px 10px ${glowColor}`, duration: 0.1 })
        .to(slotEl, { boxShadow: '0 0 0px 0px transparent', duration: 0.4 });
      break;
    case 'resilience':
      gsap.timeline()
        .to(slotEl, { scale: 1.15, filter: `brightness(3) drop-shadow(0 0 20px ${glowColor})`, duration: 0.15 })
        .to(slotEl, { scale: 1, filter: 'none', duration: 0.4, ease: 'elastic.out(1,0.3)' });
      break;
    case 'rivalry':
      gsap.timeline()
        .to(slotEl, { rotateZ: -3, duration: 0.05 })
        .to(slotEl, { rotateZ: 3, duration: 0.05 })
        .to(slotEl, { rotateZ: 0, duration: 0.1 });
      spawnParticles(
        (document.querySelector(`[data-idx="${trigger.cardIdx}"]`)?.getBoundingClientRect().left ?? 0) + 30,
        (document.querySelector(`[data-idx="${trigger.cardIdx}"]`)?.getBoundingClientRect().top ?? 0) + 30,
        glowColor, 10
      );
      break;
    case 'vampire':
      gsap.timeline()
        .to(slotEl, { filter: `brightness(1.5) hue-rotate(290deg)`, duration: 0.1 })
        .to(slotEl, { filter: 'none', duration: 0.5 });
      break;
    case 'deathblow': {
      const rect = slotEl.getBoundingClientRect();
      spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, glowColor, 28);
      break;
    }
    case 'phantom':
      gsap.to(slotEl, { opacity: 0.3, filter: 'blur(3px)', duration: 0.3, yoyo: true, repeat: 1 });
      break;
  }
}

// ─── LONG PRESS ───────────────────────────────────────────────────────────────
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

// ─── CAPSULE PV COUNTER ───────────────────────────────────────────────────────
function animateCapsulePv(slotIdx: number, oldPv: number, newPv: number): Promise<void> {
  return new Promise(resolve => {
    const pvCap = document.querySelector(`[data-idx="${slotIdx}"] .capsule.pv`) as HTMLElement | null;
    if (!pvCap) { resolve(); return; }
    gsap.timeline()
      .to(pvCap, { scale: 1.6, background: '#ff4400', duration: 0.08 })
      .to(pvCap, { scale: 1.0, background: newPv <= 0 ? '#ff0000' : '#39FF14', duration: 0.25, ease: 'back.out' });
    const counter = { val: oldPv };
    gsap.to(counter, {
      val: Math.max(0, newPv), duration: 0.35, ease: 'power2.out',
      onUpdate: () => { pvCap.textContent = `❤️${Math.round(counter.val)}`; },
      onComplete: resolve,
    });
  });
}

// ─── HP BAR ───────────────────────────────────────────────────────────────────
function animateHpBar(side: 'p' | 'e', newHp: number, maxHp = 1500): Promise<void> {
  return new Promise(resolve => {
    const barEl = document.getElementById(`bar-${side}`) as HTMLElement | null;
    const txtEl = document.getElementById(`hp-${side}`);
    if (!barEl || !txtEl) { resolve(); return; }
    const newWidth = Math.max(0, (newHp / maxHp) * 100);
    const counter = { val: parseFloat(txtEl.textContent ?? '0') || newHp };
    gsap.to(barEl, { width: `${newWidth}%`, duration: 0.5, ease: 'power2.out' });
    gsap.to(counter, {
      val: newHp, duration: 0.5, ease: 'power2.out',
      onUpdate: () => { txtEl.textContent = `${Math.round(counter.val)} PV`; },
      onComplete: resolve
    });
  });
}

// ─── APP ──────────────────────────────────────────────────────────────────────
class App {
  private engine: GameEngine;
  private menu: MenuScreen;
  private board: BoardScreen;
  private container: HTMLElement;

  private timer = 60;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private selectedSlotIdx: number | null = null;
  private selectedHandCard: Card | null = null;
  private isTargeting = false;
  private isTargetingSkill: number | null = null;
  private currentTab: 'battle' | 'arsenal' | 'store' = 'battle';
  private isPrepMode = false;
  private currentArsenal: ArsenalScreen | null = null;

  constructor() {
    this.container = document.getElementById('app')!;
    this.engine = new GameEngine();
    this.engine.deck = this.engine.generateDeck();
    this.menu = new MenuScreen(
      () => this.openArsenal(true)
    );
    this.board = new BoardScreen();
    applyScenarioBackground((SCENARIOS as any).lobby);
    this.render();
  }

  // ─── ROUTING ─────────────────────────────────────────────────────────────────

  private openEditor() {
    this.container.innerHTML = '';
    const editor = new CardEditorScreen(() => {
      this.engine.state = 'menu';
      this.render();
    });
    editor.init(this.container);
  }

  private async openArsenal(isBattlePrep = false) {
    const content = document.getElementById('main-content');
    if (!content) return;
    content.innerHTML = '<div style="color:white; text-align:center; margin-top:100px;">Carregando Arsenal...</div>';

    // Get BGs for scenarios tab
    let bgs: string[] = [];
    try {
      const resp = await fetch('/api/images');
      if (resp.ok) {
        const data = await resp.json();
        bgs = data.bgs || [];
      }
    } catch (e) { }

    const onConfirmCallback = isBattlePrep ? (cards: any[], arts: Skill[], board: string) => {
      // Prepare cards for engine (add owner and IDs)
      const finalCards = cards.map(c => ({
        ...c,
        id: `p-${Math.random().toString(36).substr(2, 9)}`,
        owner: 'p' as const,
        atk: c.baseAtk || 0,
        pv: c.basePv || 0,
        maxPv: c.basePv || 0,
        rarity: c.preferredRarity || 'common'
      }));
      this.startBattle(finalCards, arts);
      // Apply board background
      applyScenarioBackground(board || (SCENARIOS as any).battle);
    } : undefined;

    this.isPrepMode = isBattlePrep;
    this.isPrepMode = isBattlePrep;
    
    // Update Settings Icon immediately if in prep mode
    const settingsBtn = document.getElementById('btn-game-settings');
    if (settingsBtn && isBattlePrep) {
        settingsBtn.textContent = '✕';
        settingsBtn.title = 'Cancelar Preparação';
        settingsBtn.style.borderColor = 'rgba(255,255,255,0.4)';
        settingsBtn.style.color = '#fff';
    }

    const arsenal = new ArsenalScreen(
      CARD_TEMPLATES,
      SKILL_POOL,
      bgs,
      () => {
          this.isPrepMode = false;
          this.currentArsenal = null;
          this.switchTab('battle');
      },
      onConfirmCallback
    );
    this.currentArsenal = arsenal;
    arsenal.render(content);
    
    // Refresh shell to update button labels if needed
    const battleSeg = document.getElementById('seg-battle');
    if (battleSeg) {
        battleSeg.textContent = this.isPrepMode ? 'INICIAR! ▶' : 'BATALHAR';
        if (this.isPrepMode) {
            battleSeg.style.background = 'linear-gradient(135deg, #ff4444, #8b0000)';
            battleSeg.style.color = '#fff';
            battleSeg.style.borderRadius = '50px';
            battleSeg.style.boxShadow = '0 0 20px rgba(255, 68, 68, 0.5)';
            battleSeg.style.fontWeight = '900';
            battleSeg.style.letterSpacing = '1px';
        } else {
            battleSeg.style.background = '';
            battleSeg.style.color = '';
            battleSeg.style.borderRadius = '';
            battleSeg.style.boxShadow = '';
            battleSeg.style.fontWeight = '';
            battleSeg.style.letterSpacing = '';
        }
    }
  }

  private startBattle(hand: Card[], skills: Skill[]) {
    this.engine.selectedSkills = skills;
    this.engine.initBattle();
    this.engine.hand = hand.map(c => ({ ...c, owner: 'p' as const }));
    this.selectedHandCard = null;
    this.isTargeting = false;
    this.isTargetingSkill = null;
    this.selectedSlotIdx = null;
    this.render();
    this.startTimer();
    setTimeout(() => { this.showBanner('DUELO!'); this.animateHandCards(); }, 120);
  }

  // ─── RENDER / HUB SHELL ──────────────────────────────────────────────────────

  private render() {
    if (this.engine.state === 'menu') {
      // Ensure Shell is present
      if (!document.getElementById('nav-pill')) {
        this.renderShell();
      }
      this.switchTab(this.currentTab, true);
    } else if (this.engine.state === 'battle') {
      this.container.innerHTML = this.board.render(
        this.engine.board, this.engine.hp, this.engine.turn, this.timer, this.engine.activeSkills
      );
      this.bindBattleEvents();
      this.updateBattleUI();
    }
  }

  private renderShell() {
    // Current user level placeholder
    const userLevel = 1;
    const userXp = 50; 
    const xpMax = 100 * userLevel;
    const xpPercent = (userXp / xpMax) * 100;

    // Based on level, the bar is divided. Visually we can use repeating linear gradients or just a simple bar for now.

    
    // Create a segmented visual effect for the bar


    this.container.innerHTML = `
      <div class="menu-screen" style="height: 100%; display: flex; flex-direction: column; overflow: hidden;">
        <div class="menu-top-bar" style="display:flex; justify-content:space-between; align-items:center; padding:0 15px; width:100%; height:70px; box-sizing:border-box; flex-shrink:0; z-index:100;">
          
          <!-- LEFT SIDE: Profile Section -->
          <div style="display:flex; align-items:center; gap:12px; pointer-events:auto;">
              <div class="profile-container" id="btn-profile" style="display:flex; align-items:center; cursor:pointer; position:relative;" title="Meu Perfil">
                 <div class="profile-avatar" style="width:44px; height:44px; border-radius:50%; background:url('/cards/1.jpg') center/cover; border:2px solid #fff; box-shadow:0 0 10px rgba(0,0,0,0.5); z-index:2; flex-shrink:0;"></div>
                 <div style="display:flex; flex-direction:column; justify-content:center; background:rgba(0,0,0,0.4); padding:4px 15px 4px 20px; margin-left:-18px; border-radius:0 20px 20px 0; border:1px solid rgba(255,255,255,0.1); border-left:none; height:34px; backdrop-filter:blur(10px); z-index:1;">
                    <div class="profile-name" style="font-size:0.65rem; font-weight:950; color:#fff; letter-spacing:1px; line-height:1; margin-bottom:2px;">CRIADOR DE LENDAS</div>
                    <div class="profile-level-wrapper" style="position:relative; width:80px; height:3px; background:rgba(0,0,0,0.5); border-radius:2px; overflow:hidden;">
                       <div class="profile-level-fill" style="width:${xpPercent}%; height:100%; background:linear-gradient(90deg, #51c5ff, #00ff88); transition:0.4s;"></div>
                    </div>
                 </div>
              </div>
              
              ${this.currentTab === 'arsenal' ? 
                `<button id="ars-back" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:8px 15px; border-radius:10px; font-weight:900; font-size:0.6rem; cursor:pointer;">⟨ VOLTAR</button>` : ''
              }
          </div>

          <!-- RIGHT SIDE: Actions Section -->
          <div style="display:flex; align-items:center; gap:12px; pointer-events:auto;">
              ${this.currentTab === 'arsenal' ?
                `<button id="ars-confirm" style="background:#fff; color:#000; border:none; padding:8px 22px; border-radius:20px; font-weight:950; font-size:0.75rem; cursor:pointer; box-shadow:0 0 20px rgba(0,0,0,0.5);">JOGAR ⚔️</button>` : ''
              }
              <div class="menu-settings-btn" id="btn-game-settings" style="width:42px; height:42px; border-radius:12px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); color:#fff; display:flex; align-items:center; justify-content:center; font-size:1.2rem; cursor:pointer; backdrop-filter:blur(10px); transition:0.2s;">
                ${this.currentTab === 'battle' ? '⚙️' : '✕'}
              </div>
          </div>

        </div>
        <div class="menu-content" id="main-content" style="flex: 1; box-sizing: border-box; position: relative; overflow: hidden; display: flex; flex-direction: column;"></div>
        <div class="menu-bottom-nav">
          <div class="nav-pill-container" id="nav-pill">
            <div class="nav-pill-segment active" id="seg-battle" data-tab="battle">BATALHAR</div>
            <div class="nav-pill-segment" data-tab="arsenal">ARSENAL</div>
            <div class="nav-pill-segment" data-tab="store">LOJA</div>
            <div class="nav-pill-indicator" id="nav-indicator"></div>
          </div>
        </div>
      </div>
    `;
    this.bindShellEvents();
  }

  private bindShellEvents() {
    document.getElementById('btn-game-settings')?.addEventListener('click', () => {
        if (this.isPrepMode || this.currentTab !== 'battle') {
            // Act as HOME button
            this.switchTab('battle', true);
            return;
        }

        // Standard settings modal logic
        const overlay = document.createElement('div');
        overlay.id = 'settings-overlay';
        overlay.style.cssText = `position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:10000; display:flex; align-items:center; justify-content:center; opacity:0; transition:0.3s;`;
        overlay.innerHTML = `
            <div style="background:#1a1a1a; width:90%; max-width:400px; padding:30px; border-radius:30px; border:1px solid rgba(255,255,255,0.1); box-shadow:0 20px 50px rgba(0,0,0,0.5); text-align:center;">
                <h2 style="color:#fff; font-size:1.2rem; margin-bottom:25px; letter-spacing:2px;">CONFIGURAÇÕES</h2>
                
                <div style="display:flex; flex-direction:column; gap:15px;">
                    <button class="menu-btn" id="modal-btn-editor" style="background:linear-gradient(45deg, #51c5ff, #00ff88); border:none; color:#000; font-weight:900; padding:15px; border-radius:15px; cursor:pointer;">⚒️ FORJA DE LENDAS (EDITOR)</button>
                    <button class="menu-btn secondary" style="padding:15px; border-radius:15px; background:rgba(255,255,255,0.05); color:#fff; border:1px solid rgba(255,255,255,0.1); cursor:pointer;">AJUDA & SUPORTE</button>
                    <button class="menu-btn secondary" style="padding:15px; border-radius:15px; background:rgba(255,100,100,0.1); color:#ff5555; border:1px solid rgba(255,100,100,0.2); cursor:pointer; margin-top:10px;" id="close-settings">FECHAR</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.style.opacity = '1', 10);

        document.getElementById('modal-btn-editor')?.addEventListener('click', () => {
            overlay.remove();
            this.openEditor();
        });
        
        document.getElementById('close-settings')?.addEventListener('click', () => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
            }
        });
    });
    const segments = document.querySelectorAll('.nav-pill-segment');
    segments.forEach((seg) => {
      seg.addEventListener('click', () => {
        const tab = (seg as HTMLElement).dataset.tab as any;
        if (tab === 'battle' && this.currentTab === 'battle') {
            if (this.isPrepMode && this.currentArsenal) {
                // Trigger the hidden confirm inside arsenal
                const confirmBtn = document.getElementById('ars-confirm');
                if (confirmBtn) confirmBtn.click();
                else {
                    // Fallback if UI not yet updated
                    this.isPrepMode = false;
                    this.switchTab('battle');
                }
            } else {
                this.openArsenal(true);
            }
        } else {
            this.isPrepMode = false;
            this.currentArsenal = null;
            this.switchTab(tab);
        }
      });
    });

    // Simple Dragging/Sliding Simulation
    let isDragging = false;
    let startX = 0;
    const pill = document.getElementById('nav-pill');
    const onStart = (clientX: number) => { isDragging = true; startX = clientX; };
    const onMove = (clientX: number) => {
        if (!isDragging) return;
        const diff = clientX - startX;
        if (Math.abs(diff) > 50) {
            const tabs: any[] = ['battle', 'arsenal', 'store'];
            const currentIdx = tabs.indexOf(this.currentTab);
            if (diff > 0 && currentIdx < 2) { this.switchTab(tabs[currentIdx + 1]); isDragging = false; }
            else if (diff < 0 && currentIdx > 0) { this.switchTab(tabs[currentIdx - 1]); isDragging = false; }
        }
    };
    pill?.addEventListener('mousedown', (e) => onStart(e.clientX));
    pill?.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX), { passive: true });
    window.addEventListener('mousemove', (e) => onMove(e.clientX));
    window.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true });
    window.addEventListener('mouseup', () => isDragging = false);
    window.addEventListener('touchend', () => isDragging = false);
  }

  private switchTab(tab: 'battle' | 'arsenal' | 'store', force = false) {
    if (this.currentTab === tab && !force) return;
    const oldIdx = ['battle', 'arsenal', 'store'].indexOf(this.currentTab);
    this.currentTab = tab;
    this.isPrepMode = false;
    this.currentArsenal = null;
    const newIdx = ['battle', 'arsenal', 'store'].indexOf(tab);

    const battleSeg = document.getElementById('seg-battle');
    const settingsBtn = document.getElementById('btn-game-settings');
    const content = document.getElementById('main-content');

    if (!content) return;

    // Update Settings Icon to Home if needed
    if (settingsBtn) {
        if (this.isPrepMode || tab !== 'battle') {
            settingsBtn.textContent = '✕';
            settingsBtn.title = tab !== 'battle' ? 'Voltar para Início' : 'Cancelar Preparação';
            settingsBtn.style.borderColor = 'rgba(255,255,255,0.4)';
            settingsBtn.style.color = '#fff';
        } else {
            settingsBtn.textContent = '⚙️';
            settingsBtn.title = 'Configurações do Jogo';
            settingsBtn.style.borderColor = '#51c5ff';
            settingsBtn.style.color = '#51c5ff';
        }
    }

    if (battleSeg) {
        if (this.isPrepMode) {
            battleSeg.textContent = 'INICIAR! ▶';
            battleSeg.style.background = 'linear-gradient(135deg, #ff4444, #8b0000)';
            battleSeg.style.color = '#fff';
            battleSeg.style.borderRadius = '50px';
            battleSeg.style.boxShadow = '0 0 20px rgba(255, 68, 68, 0.5)';
            battleSeg.style.fontWeight = '900';
            battleSeg.style.letterSpacing = '1px';
        } else {
            battleSeg.textContent = (tab === 'battle') ? 'BATALHAR' : 'LOBBY';
            battleSeg.style.background = '';
            battleSeg.style.color = '';
            battleSeg.style.borderRadius = '';
            battleSeg.style.boxShadow = '';
            battleSeg.style.fontWeight = '';
            battleSeg.style.letterSpacing = '';
        }
    }

    // Render Content
    if (tab === 'battle') {
        applyScenarioBackground((SCENARIOS as any).lobby);
        content.innerHTML = this.menu.render();
        this.menu.bind();
    } else if (tab === 'arsenal') {
        applyScenarioBackground((SCENARIOS as any).arsenal);
        this.openArsenal(false);
    } else if (tab === 'store') {
        applyScenarioBackground((SCENARIOS as any).store);
        content.innerHTML = `
          <div class="menu-main-view">
             <h2 style="font-size: 2rem; margin-bottom: 20px;">LOJA MERCADO</h2>
             <p style="opacity:0.6">Adquira novas cartas e expansões.</p>
             <button class="menu-btn secondary" style="margin-top: 20px;">EM BREVE</button>
          </div>
        `;
    }

    // Simple animation
    if (!force) gsap.fromTo(content, { opacity: 0, x: newIdx > oldIdx ? 40 : -40 }, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' });
  }

  private softUpdate() {
    this.board.renderSkillSlots(this.engine.activeSkills);
    this.updateActionHUD();
    const dc = document.getElementById('count-deck');
    const gc = document.getElementById('count-grave');
    if (dc) dc.textContent = String(this.engine.deck.length);
    if (gc) gc.textContent = String(this.engine.grave.length);
  }

  // ─── ACTION ECONOMY ──────────────────────────────────────────────────────────

  private checkAutoEnd(delay = 600) {
    if (this.engine.turn !== 'p') return;
    if (this.engine.actionsLeft <= 0) {
      this.showBanner('✅ Ação concluída — encerrando turno...');
      setTimeout(() => this.handleEndTurn(), delay);
    } else {
      this.showBanner(`✨ Poder Divino! ${this.engine.actionsLeft} ação restante`);
    }
  }

  private updateActionHUD() {
    const hud = document.getElementById('action-hud');
    if (!hud) return;
    hud.textContent = `⚡ ${this.engine.actionsLeft}`;
    hud.style.color = this.engine.actionsLeft > 1 ? '#ffd700' : '#4cff88';
  }

  // ─── ANIMATIONS ──────────────────────────────────────────────────────────────

  private animateHandCards() {
    const hand = document.getElementById('hand');
    if (!hand) return;
    gsap.fromTo(hand.children,
      { y: 80, opacity: 0, scale: 0.8 },
      { y: 0, opacity: 1, scale: 1, stagger: 0.07, duration: 0.45, ease: 'back.out(1.7)' }
    );
  }

  private animateDrawCard(onDone?: () => void) {
    const deckEl = document.querySelector('.deck-back-slot') as HTMLElement | null;
    const handEl = document.getElementById('hand') as HTMLElement | null;
    if (!deckEl || !handEl) { onDone?.(); return; }
    const deckR = deckEl.getBoundingClientRect();
    const handR = handEl.getBoundingClientRect();
    const proxy = document.createElement('div');
    proxy.style.cssText = `position:fixed;left:${deckR.left}px;top:${deckR.top}px;
      width:${deckR.width}px;height:${deckR.height}px;
      background:linear-gradient(135deg,#0a0028,#1a0044);
      border:2px solid rgba(255,255,255,0.3);border-radius:8px;
      z-index:9998;pointer-events:none;`;
    document.body.appendChild(proxy);
    gsap.fromTo(deckEl, { scale: 1.0 }, { scale: 1.1, yoyo: true, repeat: 1, duration: 0.15 });
    gsap.to(proxy, {
      left: handR.right - deckR.width - 8,
      top: handR.top + (handR.height - deckR.height) / 2,
      scale: 0.7, duration: 0.45, ease: 'power2.inOut',
      onComplete: () => {
        proxy.remove();
        const lastCard = document.querySelector('#hand .hand-card-hifi:last-child') as HTMLElement | null;
        if (lastCard) gsap.fromTo(lastCard, { scale: 0.3, opacity: 0, y: -20 }, { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.7)' });
        onDone?.();
      },
    });
  }

  private animateCardToBoard(slotEl: HTMLElement) {
    const inner = slotEl.querySelector('.card-container, .card-face') as HTMLElement | null;
    if (inner) gsap.fromTo(inner, { scale: 0.3, opacity: 0, rotateY: 90 }, { scale: 1, opacity: 1, rotateY: 0, duration: 0.55, ease: 'elastic.out(1,0.5)' });
  }

  // ─── TIMER ────────────────────────────────────────────────────────────────────

  private startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timer = 60;
    this.updateTimerUI();
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

  // ─── FULLSCREEN ───────────────────────────────────────────────────────────────

  private showFullscreen(c: Card) {
    const overlay = document.getElementById('overlay-fullscreen')!;
    const inner = document.getElementById('fullscreen-card-inner')!;
    inner.innerHTML = this.board.renderFullscreenCard(c);
    overlay.classList.add('active');
    gsap.fromTo(inner, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.5)' });
    const close = () => gsap.to(inner, { scale: 0.8, opacity: 0, duration: 0.2, onComplete: () => overlay.classList.remove('active') });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); }, { once: true });
    inner.addEventListener('click', close, { once: true });
  }

  // ─── SKILL DIALOG ────────────────────────────────────────────────────────────

  private openSkillDialog(skillIdx: number) {
    const skill = this.engine.activeSkills[skillIdx];
    if (!skill) return;
    const overlay = document.getElementById('overlay-skill')!;
    document.getElementById('skill-icon')!.textContent = skill.icon;
    document.getElementById('skill-name')!.textContent = skill.name;
    document.getElementById('skill-category')!.textContent = `${skill.category.toUpperCase()} · ${skill.group.toUpperCase()}`;
    document.getElementById('skill-desc')!.textContent = skill.description;
    document.getElementById('skill-flavor')!.textContent = skill.flavorText;
    overlay.classList.add('active');
    gsap.fromTo('#skill-dialog', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.5)' });

    const needsTarget = ['flip', 'stun', 'burn', 'poison', 'drain', 'nuke'].includes(skill.effect);
    document.getElementById('skill-confirm')!.onclick = () => {
      overlay.classList.remove('active');
      if (needsTarget) {
        this.showBanner('ESCOLHA O ALVO'); this.isTargetingSkill = skillIdx; this.render();
      } else {
        const preHpP = this.engine.hp.p;
        const preHpE = this.engine.hp.e;
        const res = this.engine.useSkill(skillIdx);
        this.showBanner(res.message);
        
        const animations: Promise<void>[] = [];
        if (this.engine.hp.p !== preHpP) animations.push(animateHpBar('p', this.engine.hp.p));
        if (this.engine.hp.e !== preHpE) animations.push(animateHpBar('e', this.engine.hp.e));

        Promise.all(animations).then(() => {
          this.softUpdate(); this.rebuildHand();
          this.checkAutoEnd();
        });
      }
    };
    document.getElementById('skill-cancel')!.onclick = () => overlay.classList.remove('active');
  }

  // ─── BATTLE EVENTS ───────────────────────────────────────────────────────────

  private bindBattleEvents() {
    document.getElementById('btn-end')?.addEventListener('click', () => this.handleEndTurn());
    document.getElementById('btn-surrender')?.addEventListener('click', () => {
      this.stopTimer(); this.engine.state = 'menu'; this.render();
    });
    document.getElementById('act-atk')?.addEventListener('click', () => this.startTargeting());
    document.getElementById('act-sac')?.addEventListener('click', () => this.handleSacrifice());
    document.getElementById('act-can')?.addEventListener('click', () => this.closeAction());
    document.getElementById('btn-browse-hand')?.addEventListener('click', () => this.openHandSheet());
    document.getElementById('btn-browse-hand')?.addEventListener('touchend', (e) => { e.preventDefault(); this.openHandSheet(); });

    document.querySelectorAll('.art-slot[data-skill-idx]').forEach(slot => {
      const activate = () => {
        if (this.engine.turn !== 'p') return;
        const idx = parseInt((slot as HTMLElement).dataset.skillIdx!);
        if (this.engine.activeSkills[idx]) this.openSkillDialog(idx);
      };
      slot.addEventListener('click', activate);
    });

    document.querySelectorAll('.slot-p').forEach(slot => {
      const el = slot as HTMLElement;
      const idx = parseInt(el.dataset.idx!);
      const cardFace = el.querySelector('.card-face') as HTMLElement | null;
      if (cardFace) {
        const openAct = (e: Event) => {
          e.stopPropagation();
          if (this.engine.turn !== 'p' || this.isTargeting || this.isTargetingSkill !== null) return;
          this.openAction(idx);
        };
        cardFace.addEventListener('click', openAct);
        cardFace.addEventListener('touchend', (e) => { e.preventDefault(); openAct(e); }, { passive: false });
        const card = this.engine.board[idx];
        if (card) bindLongPress(cardFace, () => this.showFullscreen(card));
      }
      el.addEventListener('click', () => {
        if (this.selectedHandCard && !this.engine.board[idx] && this.engine.turn === 'p') this.placeHandCard(idx);
      });
    });

    document.querySelectorAll('.slot-e').forEach(slot => {
      const el = slot as HTMLElement;
      const eIdx = parseInt(el.dataset.idx!);
      if (this.isTargeting || this.isTargetingSkill !== null) el.classList.add('targetable');
      const onTarget = (ev?: Event) => {
        ev?.stopPropagation();
        if (this.isTargeting) {
          this.resolveAttack(eIdx);
        } else if (this.isTargetingSkill !== null) {
          const sIdx = this.isTargetingSkill;
          const preHpP = this.engine.hp.p;
          const preHpE = this.engine.hp.e;
          const targetPrePv = this.engine.board[eIdx]?.pv ?? 0;
          
          const res = this.engine.useSkill(sIdx, eIdx);
          this.showBanner(res.message);
          if ((res as { comboMessage?: string }).comboMessage) setTimeout(() => this.showBanner((res as { comboMessage?: string }).comboMessage!), 1200);

          const targetPostPv = this.engine.board[eIdx]?.pv ?? 0;
          const animations: Promise<void>[] = [];
          
          if (this.engine.hp.p !== preHpP) animations.push(animateHpBar('p', this.engine.hp.p));
          if (this.engine.hp.e !== preHpE) animations.push(animateHpBar('e', this.engine.hp.e));
          if (targetPrePv !== targetPostPv) animations.push(animateCapsulePv(eIdx, targetPrePv, targetPostPv));
          
          Promise.all(animations).then(() => {
            if (targetPrePv > 0 && targetPostPv === 0) {
              const deadEl = document.querySelector(`[data-idx="${eIdx}"] .card-face`);
              if (deadEl) {
                deathExplosion(deadEl, () => {
                  this.isTargetingSkill = null;
                  this.render();
                  this.checkAutoEnd();
                });
                return;
              }
            }
            this.isTargetingSkill = null;
            this.render();
            this.checkAutoEnd();
          });
        }
      };
      el.addEventListener('click', onTarget);
      el.addEventListener('touchend', (e) => { e.preventDefault(); onTarget(); }, { passive: false });
      const card = this.engine.board[eIdx];
      if (card) bindLongPress(el, () => this.showFullscreen(card));
    });
  }

  // ─── HAND ─────────────────────────────────────────────────────────────────────

  private selectHandCard(card: Card, el: HTMLElement) {
    if (this.selectedHandCard?.id === card.id) { this.clearHandSelection(); return; }
    this.clearHandSelection();
    this.selectedHandCard = card;
    el.classList.add('hand-card-selected');
    gsap.fromTo(el, { y: 0 }, { y: -10, duration: 0.2, ease: 'back.out' });
    document.querySelectorAll('.slot-p').forEach(s => {
      const i = parseInt((s as HTMLElement).dataset.idx!);
      if (!this.engine.board[i]) { s.classList.add('highlight'); gsap.fromTo(s, { scale: 1 }, { scale: 1.05, duration: 0.4, yoyo: true, repeat: -1 }); }
    });
    this.showBanner('TOQUE NO SLOT');
  }

  private clearHandSelection() {
    this.selectedHandCard = null;
    document.querySelectorAll('.hand-card-selected').forEach(el => { el.classList.remove('hand-card-selected'); gsap.to(el, { y: 0, duration: 0.2 }); });
    document.querySelectorAll('.slot-p').forEach(s => { s.classList.remove('highlight'); gsap.killTweensOf(s); gsap.set(s, { scale: 1 }); });
  }

  private placeHandCard(idx: number) {
    if (!this.selectedHandCard) return;
    const ok = this.engine.playCard(idx, this.selectedHandCard.id);
    if (!ok) { if (this.engine.actionsLeft <= 0) this.showBanner('⛔ SEM AÇÕES RESTANTES'); return; }
    this.clearHandSelection();
    this.render();
    const placed = document.querySelector(`[data-idx="${idx}"]`) as HTMLElement | null;
    if (placed) this.animateCardToBoard(placed);
    this.showBanner('CARTA INVOCADA!');
    this.checkAutoEnd();
  }

  private openHandSheet() {
    const overlay = document.getElementById('overlay-carousel')!;
    const list = document.getElementById('carousel-list')!;
    list.innerHTML = `
      <div class="hand-sheet-header">Toque para invocar · Segure para detalhes</div>
      <div class="hand-sheet-grid">
        ${this.engine.hand.map((c: Card) => `<div class="sheet-card" data-id="${c.id}">${this.board.renderCarouselCard(c)}</div>`).join('')}
      </div>`;
    overlay.classList.add('active');
    gsap.fromTo(list.querySelectorAll('.sheet-card'), { y: 60, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.06, duration: 0.35, ease: 'back.out(1.7)' });
    list.querySelectorAll('.sheet-card').forEach(card => {
      const el = card as HTMLElement;
      const cData = this.engine.hand.find((h: Card) => h.id === el.dataset.id);
      if (!cData) return;
      const pick = () => {
        overlay.classList.remove('active');
        this.selectedHandCard = cData;
        this.showBanner('TOQUE NO SLOT');
        document.querySelectorAll('.slot-p').forEach(slot => {
          const i = parseInt((slot as HTMLElement).dataset.idx!);
          if (!this.engine.board[i]) {
            (slot as HTMLElement).classList.add('highlight');
            const place = () => this.placeHandCard(i);
            slot.addEventListener('click', place, { once: true });
            slot.addEventListener('touchend', (e) => { e.preventDefault(); place(); }, { once: true, passive: false });
          }
        });
      };
      el.addEventListener('click', pick);
      el.addEventListener('touchend', (e) => { e.preventDefault(); pick(); }, { passive: false });
      bindLongPress(el, () => { overlay.classList.remove('active'); this.showFullscreen(cData); });
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); }, { once: true });
  }

  // ─── END TURN ────────────────────────────────────────────────────────────────

  private handleEndTurn() {
    this.stopTimer();
    this.clearHandSelection();
    this.engine.endTurn();
    this.isTargeting = false;
    this.isTargetingSkill = null;
    this.selectedSlotIdx = null;

    if (this.engine.turn === 'e') {
      this.showBanner('TURNO DO OPONENTE');
      this.render();
      setTimeout(() => this.runAI(), 900);
    } else {
      const drew = this.engine.draw();
      this.render();
      this.startTimer();
      if (drew) this.animateDrawCard(() => this.showBanner('SEU TURNO!'));
      else this.showBanner('SEU TURNO!');
    }
  }

  // ─── AI ──────────────────────────────────────────────────────────────────────

  private runAI() {
    const action = this.engine.aiTurn();
    if (action.action === 'attack' && action.atkIdx !== undefined && action.defIdx !== undefined) {
      this.showBanner('🤖 IA ATACA!');
      setTimeout(() => this.doAttack(action.atkIdx!, action.defIdx!, () => {
        if (this.isGameOver()) return;
        setTimeout(() => this.endAITurn(), 500);
      }), 400);
    } else if (action.action === 'play' && action.defIdx !== undefined) {
      const aiCard = action.cardToPlay ?? { ...this.engine.generateDeck('e')[0], owner: 'e' as const };
      this.engine.board[action.defIdx] = aiCard;
      this.engine.tryTriggerPlayAbilities(action.defIdx); // Evaluate mass flip
      this.render();
      const s = document.querySelector(`[data-idx="${action.defIdx}"]`) as HTMLElement | null;
      if (s) this.animateCardToBoard(s);
      setTimeout(() => this.endAITurn(), 600);
    } else {
      this.endAITurn();
    }
  }

  private endAITurn() {
    this.engine.endTurn();
    const drew = this.engine.draw();
    this.render();
    this.startTimer();
    if (drew) this.animateDrawCard(() => this.showBanner('SEU TURNO!'));
    else this.showBanner('SEU TURNO!');
  }

  private isGameOver(): boolean {
    if (this.engine.hp.p <= 0) { this.showBanner('💀 DERROTA!'); this.stopTimer(); return true; }
    if (this.engine.hp.e <= 0) { this.showBanner('🏆 VITÓRIA!'); this.stopTimer(); return true; }
    return false;
  }

  // ─── ACTION MENU ─────────────────────────────────────────────────────────────

  private openAction(idx: number) {
    this.selectedSlotIdx = idx;
    const card = this.engine.board[idx];
    if (!card) return;
    const noActions = this.engine.actionsLeft <= 0;
    const statusParts: string[] = [];
    if (card.isStunned) statusParts.push(`⚡ Paralisada (${card.stunTurns ?? 1}t)`);
    if (card.isFlipped) statusParts.push(`👁️ Oculta`);
    if ((card.poisonTurns ?? 0) > 0) statusParts.push(`☠️ Veneno (${card.poisonTurns}t)`);
    if (card.shieldActive) statusParts.push(`🛡️ Escudada`);

    const actionNameEl = document.getElementById('action-name');
    const actionStatsEl = document.getElementById('action-stats');
    if (actionNameEl) actionNameEl.textContent = card.name;
    if (actionStatsEl) actionStatsEl.textContent = `⚔️${card.atk}  ·  ❤️${card.pv}/${card.maxPv}`;

    const existing = document.getElementById('action-badge');
    if (existing) existing.remove();
    const badge = document.createElement('div');
    badge.id = 'action-badge';
    badge.style.cssText = `font-size:0.6rem;color:${noActions ? '#ff4444' : '#4cff88'};margin-top:4px;font-weight:900;letter-spacing:1px;text-align:center;`;
    badge.innerHTML = (noActions ? '⛔ SEM AÇÕES' : `▶ AÇÕES: ${this.engine.actionsLeft}`)
      + (statusParts.length ? `<br><span style="color:#aaa;font-weight:400">${statusParts.join(' · ')}</span>` : '');
    
    if (actionStatsEl && actionStatsEl.parentElement) {
      actionStatsEl.parentElement.insertBefore(badge, actionStatsEl.nextSibling);
    }

    const atkBtn = document.getElementById('act-atk') as HTMLButtonElement | null;
    const sacBtn = document.getElementById('act-sac') as HTMLButtonElement | null;
    if (atkBtn) atkBtn.disabled = noActions;
    if (sacBtn) sacBtn.disabled = noActions;
    document.getElementById('overlay-action')?.classList.add('active');
  }

  private closeAction() { document.getElementById('overlay-action')?.classList.remove('active'); }

  private startTargeting() {
    this.closeAction();
    if (this.engine.actionsLeft <= 0) { this.showBanner('⛔ SEM AÇÕES RESTANTES'); return; }
    this.isTargeting = true;
    this.showBanner('ESCOLHA O ALVO');
    this.render();
  }

  // ─── ATTACK ──────────────────────────────────────────────────────────────────

  private resolveAttack(eIdx: number) {
    this.isTargeting = false;
    this.engine.actionsLeft = Math.max(0, this.engine.actionsLeft - 1);
    this.doAttack(this.selectedSlotIdx!, eIdx, () => {
      if (!this.isGameOver()) setTimeout(() => this.handleEndTurn(), 400);
    });
  }

  private doAttack(atkIdx: number, defIdx: number, onDone: () => void) {
    const atkEl = document.querySelector(`[data-idx="${atkIdx}"] .card-face`) as HTMLElement | null;
    const defEl = document.querySelector(`[data-idx="${defIdx}"] .card-face`) as HTMLElement | null;
    const preAtkPv = this.engine.board[atkIdx]?.pv ?? 0;
    const preDefPv = this.engine.board[defIdx]?.pv ?? 0;

    const afterLunge = () => {
      const result = this.engine.resolveAttack(atkIdx, defIdx);
      const postDefPv = result.defDied ? 0 : result.defPvAfter;
      const postAtkPv = result.atkDied ? 0 : result.atkPvAfter;

      // Banner
      const parts: string[] = [];
      if (result.revealed) parts.push('👁️ Revelada!');
      if (result.typeBonus) parts.push('⚔️ Rivalidade!');
      if (result.damage > 0) parts.push(`⚔️ ${result.damage} dano`);
      if (result.reflected) parts.push(`🔄 ${result.reflectDamage} reflexo`);
      this.showBanner(parts.join('  ') || 'Sem efeito');

      // Screen shake
      const boardEl = document.getElementById('board');
      if (boardEl) { gsap.to(boardEl, { x: 7, duration: 0.04, repeat: 5, yoyo: true, onComplete: () => { gsap.set(boardEl, { x: 0 }); } }); }

      // Floating texts & effects
      if (result.damage > 0) spawnFloatingText(defIdx, `-${result.damage}`, '#ff4444');
      if (result.reflected && result.reflectDamage > 0) spawnFloatingText(atkIdx, `🔁-${result.reflectDamage}`, '#ff8800');
      result.abilityTriggers.forEach(t => triggerAbilityAnim(t));

      // HP Animations
      const animations: Promise<void>[] = [];
      if (preDefPv !== postDefPv) animations.push(animateCapsulePv(defIdx, preDefPv, postDefPv));
      if (result.reflected && preAtkPv !== postAtkPv) animations.push(animateCapsulePv(atkIdx, preAtkPv, postAtkPv));
      if (result.hpDmgE > 0) animations.push(animateHpBar('e', this.engine.hp.e));
      if (result.hpDmgP > 0) animations.push(animateHpBar('p', this.engine.hp.p));

      Promise.all(animations).then(() => {
        const deadIdxs: number[] = [];
        if (result.defDied) deadIdxs.push(defIdx);
        if (result.atkDied) deadIdxs.push(atkIdx);
        
        if (deadIdxs.length > 0) {
          let doneCount = 0;
          deadIdxs.forEach(di => {
            const deadEl = document.querySelector(`[data-idx="${di}"] .card-face`);
            if (deadEl) deathExplosion(deadEl, () => {
              doneCount++;
              if (doneCount >= deadIdxs.length) { this.render(); onDone(); }
            });
            else { doneCount++; if (doneCount >= deadIdxs.length) { this.render(); onDone(); } }
          });
        } else {
          setTimeout(() => { this.render(); onDone(); }, 100);
        }
      });
    };

    const atk = this.engine.board[atkIdx];
    if (atk && atk.animationUrl && atk.hasVideoAttack) {
      this.playVideoAttack(atk, () => {
        this.executePhysicalAttack(atkEl, defEl, afterLunge);
      });
    } else {
      this.executePhysicalAttack(atkEl, defEl, afterLunge);
    }
  }

  private executePhysicalAttack(atkEl: HTMLElement | null, defEl: HTMLElement | null, onComplete: () => void) {
    if (atkEl && defEl) {
      const atkR = atkEl.getBoundingClientRect();
      const defR = defEl.getBoundingClientRect();
      gsap.timeline()
        .to(atkEl, { x: (defR.left - atkR.left) * 0.7, y: (defR.top - atkR.top) * 0.7, duration: 0.18, ease: 'power2.in' })
        .to(atkEl, { x: 0, y: 0, duration: 0.3, ease: 'back.out(2)', onComplete: onComplete });
    } else {
      onComplete();
    }
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
    video.style.cssText = `width:100%; height:100%; object-fit:cover; filter: contrast(1.1) brightness(1.1);`;
    video.muted = true;
    video.playsInline = true;
    overlay.appendChild(video);
    document.body.appendChild(overlay);

    let skipped = false;
    const skip = () => {
      if (skipped) return;
      skipped = true;
      gsap.killTweensOf(tl);
      gsap.to(overlay, { opacity: 0, duration: 0.3, onComplete: () => {
        overlay.remove();
        gsap.to(elementsToHide, { opacity: 1, duration: 0.2 });
        onDone();
      }});
    };

    overlay.addEventListener('click', skip);
    overlay.addEventListener('touchstart', (e) => { e.preventDefault(); skip(); }, { passive: false });

    const tl = gsap.timeline({ 
      onComplete: () => { 
        if (!skipped) {
          gsap.to(overlay, { opacity: 0, duration: 0.5, onComplete: () => {
            overlay.remove(); 
            gsap.to(elementsToHide, { opacity: 1, duration: 0.3 });
            onDone(); 
          }});
        }
      } 
    });

    tl.to(overlay, { opacity: 1, duration: 0.4 });
    tl.add(() => { video.play(); });
    tl.fromTo(video, { scale: 1.5, filter: 'brightness(3) blur(20px)' }, { scale: 1, filter: 'brightness(1.1) blur(0px)', duration: 0.8, ease: 'power4.out' }, '-=0.2');
    tl.to(video, { x: 7, y: -7, rotation: 0.7, duration: 0.05, repeat: 75, yoyo: true, ease: 'none' }, '0.8');
    tl.to({}, { duration: 3.3 }); // Total ~4.5s
  }

  // ─── SACRIFICE ───────────────────────────────────────────────────────────────

  private handleSacrifice() {
    this.closeAction();
    if (this.engine.actionsLeft <= 0) { this.showBanner('⛔ SEM AÇÕES RESTANTES'); return; }
    const cardEl = document.querySelector(`[data-idx="${this.selectedSlotIdx}"] .card-face`);
    if (cardEl) deathExplosion(cardEl, () => {
      const ok = this.engine.sacrifice(this.selectedSlotIdx!);
      if (ok) { this.showBanner('SACRIFÍCIO! +1 carta'); this.render(); this.checkAutoEnd(400); }
      else this.render();
    });
  }

  // ─── BANNER ──────────────────────────────────────────────────────────────────

  private showBanner(txt: string) {
    const b = document.getElementById('banner');
    if (!b) return;
    b.textContent = txt;
    gsap.killTweensOf(b);
    gsap.timeline()
      .fromTo(b, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.28, ease: 'power2.out' })
      .to(b, { opacity: 0, scale: 1.05, delay: 2.2, duration: 0.3, ease: 'power2.in' });
  }

  // ─── UI ──────────────────────────────────────────────────────────────────────

  private updateBattleUI() { this.softUpdate(); this.rebuildHand(); }

  private rebuildHand() {
    const handCont = document.getElementById('hand');
    if (!handCont) return;
    handCont.innerHTML = '';
    this.engine.hand.forEach((c: Card) => {
      const el = document.createElement('div');
      el.className = 'hand-card-hifi';
      el.setAttribute('data-id', c.id);
      el.setAttribute('style', 'touch-action:manipulation');
      el.innerHTML = this.board.renderHandCard(c);
      handCont.appendChild(el);
      const select = (e: Event) => { e.stopPropagation(); if (this.engine.turn !== 'p') return; this.selectHandCard(c, el); };
      el.addEventListener('click', select);
      el.addEventListener('touchend', (e) => { e.preventDefault(); select(e); }, { passive: false });
      bindLongPress(el, () => this.showFullscreen(c));
    });
  }
}

new App();

