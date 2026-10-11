import './style.css';
import { gsap } from 'gsap';
import { MenuScreen } from './ui/screens/MenuScreen';
import { ArsenalScreen } from './ui/screens/ArsenalScreen';
import { ProfileScreen } from './ui/screens/ProfileScreen';
import { MapScreen } from './ui/screens/MapScreen';
import { AcademyScreen } from './ui/screens/AcademyScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { BottomNav, TabId } from './ui/components/BottomNav';
import { StoreScreen } from './ui/screens/StoreScreen';
import { TopHeader } from './ui/components/TopHeader';
import { ProgressionManager } from './core/ProgressionManager';

import { CARD_TEMPLATES, SKILL_POOL } from './core/constants';
import SCENARIOS from './core/scenarios.json';
import { applyScenarioBackground } from './ui/utils/BackgroundUtils';
import { SoundManager } from './ui/utils/SoundManager';

class HubApp {
  private container: HTMLElement;
  private menu: MenuScreen;
  private currentTab: TabId = 'battle';
  private lastBattleTab: TabId = 'battle';
  private isPrepMode = false;
  private currentArsenal: ArsenalScreen | null = null;
  private settings: SettingsScreen;
  private bottomNav: BottomNav;
  private topHeader: TopHeader;


  constructor() {
    this.container = document.getElementById('app')!;
    this.menu = new MenuScreen(() => {
      this.togglePrepMode(true);
    });
    this.settings = new SettingsScreen(() => {
      this.navigate('editor.html');
    }, () => {
      this.navigate('forge.html');
    }, () => {
      this.switchTab('profile');
    });
    this.bottomNav = new BottomNav(
      (tab) => {
        // If the wheel specifically selected a tab, we update memory and switch.
        // If horizontal nav (tab === 'battle') clicked the segment, we use memory.
        if (tab === 'battle') {
           // If we are already in the central group (Map, Academy, Battle), clicking the button means "Return to Lobby"
           // If we are coming from outside (Arsenal, Store, Profile), clicking means "Restore memory"
           const isCentral = ['battle', 'map', 'academy'].includes(this.currentTab);
           if (isCentral) {
             this.switchTab('battle');
           } else {
             this.switchTab(this.lastBattleTab);
           }
        } else if (tab === 'map' || tab === 'academy') {
           this.lastBattleTab = tab;
           this.switchTab(tab);
        } else {
           this.switchTab(tab);
        }
      },
      () => {
        const confirmBtn = document.getElementById('ars-confirm');
        if (confirmBtn) confirmBtn.click();
      }
    );

    const playerData = ProgressionManager.getPlayerData();
    const nextLevelReq = ProgressionManager.getNextLevelXpRequirement(playerData.level);

    // Inicializa o Header isolado com os dados do usuário (incluindo Enjin Coin)
    this.topHeader = new TopHeader({
        userLevel: playerData.level,
        userXp: playerData.xp,
        xpNextLevel: nextLevelReq,
        gold: playerData.gold,
        diamonds: playerData.diamonds,
        enjinCoin: playerData.enjinCoin ?? 0
    });

    applyScenarioBackground((SCENARIOS as any).lobby);
    SoundManager.playAmbient('lobby');
    this.renderShell();
    this.switchTab('battle', true);

    const profBtn = document.getElementById('btn-profile');
    if (profBtn) profBtn.onclick = () => this.switchTab('profile');

    // Initial entry animation
    gsap.fromTo(this.container, { opacity: 0 }, { opacity: 1, duration: 0.5 });
  }

  private navigate(url: string) {
    gsap.to(document.body, {
      opacity: 0,
      scale: 1.02,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        window.location.href = url;
      }
    });
  }

  private renderShell() {
    this.container.innerHTML = `
      <div class="menu-screen" style="height: 100%; display: flex; flex-direction: column; overflow: hidden;">
        
        <!-- HEADER ISOLADO EM COMPONENTE -->
        ${this.topHeader.render()}

        <div class="menu-content" id="main-content" style="flex: 1; position: relative; overflow: hidden; display: flex; flex-direction: column;"></div>

        ${this.bottomNav.render()}
      </div>
    `;
    this.bindShellEvents();
  }

  private bindShellEvents() {
    const settingsBtn = document.getElementById('btn-game-settings');
    settingsBtn?.addEventListener('click', () => {
      SoundManager.playAction('clique_configuracoes');
      const isExternal = this.isPrepMode || !['battle'].includes(this.currentTab);
      
      if (isExternal) {
        this.togglePrepMode(false);
        return;
      }
      
      // If in Lobby, Gear opens Settings
      this.switchTab('settings');
    });

    const profileBtn = document.getElementById('btn-profile');
    profileBtn?.addEventListener('click', () => {
      SoundManager.playAction('clique_perfil');
      this.switchTab('profile');
    });

    this.bottomNav.bind();
  }

  private togglePrepMode(active: boolean) {
    this.isPrepMode = active;

    const content = document.getElementById('main-content');
    if (!content) return;

    this.updateUIComponents();

    if (active) {
      applyScenarioBackground((SCENARIOS as any).preparation);
      const onConfirm = (cards: any[], skills: any[], board: string) => {
        localStorage.setItem('battle_prep', JSON.stringify({ cards, skills, board }));
        this.navigate('battle.html');
      };
      this.currentArsenal = new ArsenalScreen(
        CARD_TEMPLATES, SKILL_POOL, [],
        onConfirm,
        true // isPrepMode = expanded
      );

      gsap.to(content, {
        opacity: 0, duration: 0.15, onComplete: () => {
          this.currentArsenal?.render(content);
          gsap.to(content, { opacity: 1, duration: 0.3 });
        }
      });
    } else {

      this.switchTab('battle', true);
    }
  }

  private getSoundKey(tab: TabId): string {
    const map: Record<string, string> = {
      'battle': 'lobby',
      'store': 'loja',
      'profile': 'perfil',
      'settings': 'configuracoes',
      'map': 'map',
      'academy': 'academy',
      'arsenal': 'arsenal'
    };
    return map[tab] || tab;
  }

  private switchTab(tab: TabId, force = false) {
    const oldTab = this.currentTab;

    if (this.currentTab === tab && !force) {
      if (tab === 'battle') {
        this.togglePrepMode(!this.isPrepMode);
      }
      return;
    }

    if (!force) {
      SoundManager.playTransition(this.getSoundKey(oldTab), this.getSoundKey(tab));
    }

    this.currentTab = tab;
    if (['battle', 'map', 'academy'].includes(tab)) {
      this.lastBattleTab = tab;
    }
    this.isPrepMode = false;

    const content = document.getElementById('main-content');
    if (!content) return;

    this.updateUIComponents();

    const verticalTabs: TabId[] = ['map', 'battle', 'academy'];
    const isVerticalTransition = verticalTabs.includes(oldTab) && verticalTabs.includes(tab);

    if (!force) {
      if (isVerticalTransition) {
        const oldVIdx = verticalTabs.indexOf(oldTab);
        const newVIdx = verticalTabs.indexOf(tab);
        const direction = newVIdx > oldVIdx ? 1 : -1;

        gsap.to(content, {
          opacity: 0,
          y: direction * -50,
          duration: 0.2,
          onComplete: () => {
            this.renderTabContent(tab, content);
            gsap.fromTo(content, 
              { opacity: 0, y: direction * 50, x: 0 }, 
              { opacity: 1, y: 0, x: 0, duration: 0.4, ease: 'power2.out' }
            );
          }
        });
      } else {
        const horizontalTabs: TabId[] = ['arsenal', 'battle', 'store', 'profile'];
        const oldHIdx = horizontalTabs.includes(oldTab) ? horizontalTabs.indexOf(oldTab) : 1;
        const newHIdx = horizontalTabs.includes(tab) ? horizontalTabs.indexOf(tab) : 1;
        
        gsap.to(content, {
          opacity: 0,
          x: newHIdx > oldHIdx ? -40 : 40,
          y: 0,
          duration: 0.2,
          onComplete: () => {
            this.renderTabContent(tab, content);
            gsap.fromTo(content, 
              { opacity: 0, x: newHIdx > oldHIdx ? 40 : -40, y: 0 }, 
              { opacity: 1, x: 0, y: 0, duration: 0.3, ease: 'power2.out' }
            );
          }
        });
      }
    } else {
      gsap.set(content, { x: 0, y: 0, opacity: 1 });
      this.renderTabContent(tab, content);
    }
  }

  private updateUIComponents() {
    this.bottomNav.update(this.currentTab, this.isPrepMode);
    
    // Labels & Icons
    const settingsBtn = document.getElementById('btn-game-settings');

    if (settingsBtn) {
      settingsBtn.textContent = (this.isPrepMode || this.currentTab !== 'battle') ? '✕' : '⚙️';
      settingsBtn.style.color = '#fff';
      settingsBtn.style.borderColor = (this.isPrepMode || this.currentTab !== 'battle') ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)';
    }

    const topHeader = document.getElementById('top-header-component');
    if (topHeader) {
      if (this.currentTab === 'profile' || this.currentTab === 'settings') {
        topHeader.style.display = 'none';
      } else {
        topHeader.style.display = 'flex';
      }
    }
  }

  private renderTabContent(tab: TabId, container: HTMLElement) {
    const soundKey = this.getSoundKey(tab);
    SoundManager.playAmbient(soundKey);

    if (tab === 'battle') {
      applyScenarioBackground((SCENARIOS as any).lobby);
      container.innerHTML = this.menu.render();
      this.menu.bind();
    } else if (tab === 'arsenal') {
      applyScenarioBackground((SCENARIOS as any).arsenal);
      this.currentArsenal = new ArsenalScreen(CARD_TEMPLATES, SKILL_POOL, [], undefined, false);
      this.currentArsenal.render(container);
    } else if (tab === 'store') {
      applyScenarioBackground((SCENARIOS as any).store);
      const store = new StoreScreen();
      store.render(container, { headerSpace: true });
    } else if (tab === 'profile') {
      applyScenarioBackground((SCENARIOS as any).lobby);
      const profile = new ProfileScreen(() => this.switchTab('settings'));
      profile.render(container);
    } else if (tab === 'map') {
      applyScenarioBackground((SCENARIOS as any).map);
      const screen = new MapScreen();
      screen.render(container);
    } else if (tab === 'academy') {
      applyScenarioBackground((SCENARIOS as any).academy);
      const screen = new AcademyScreen();
      screen.render(container);
    } else if (tab === 'settings') {
      applyScenarioBackground((SCENARIOS as any).lobby);
      this.settings.render(container);
    }
  }
}

const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
const isBrowserReload = (navEntry && navEntry.type === 'reload') ||
  (typeof (performance as any).navigation !== 'undefined' && (performance as any).navigation.type === 1);

// Reload volta para a intro, exceto com "pular intro" ativado nos Ajustes
let skipIntro = false;
try { skipIntro = localStorage.getItem('low_skip_intro') === '1'; } catch {}
if (isBrowserReload && !skipIntro) {
  window.location.replace('index.html');
} else {
  new HubApp();
}
