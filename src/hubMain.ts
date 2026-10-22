import './style.css';
import './ui/styles/Landscape.css';
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
import { MenuScreenLandscape } from './ui/screens_landscape/MenuScreenLandscape';
import { ArsenalScreenLandscape } from './ui/screens_landscape/ArsenalScreenLandscape';
import { StoreScreenLandscape } from './ui/screens_landscape/StoreScreenLandscape';
import { ProfileScreenLandscape } from './ui/screens_landscape/ProfileScreenLandscape';
import { MapScreenLandscape } from './ui/screens_landscape/MapScreenLandscape';
import { AcademyScreenLandscape } from './ui/screens_landscape/AcademyScreenLandscape';
import { OrientationManager } from './ui/OrientationManager';
import { ProgressionManager } from './core/ProgressionManager';
import { CARD_TEMPLATES, SKILL_POOL } from './core/constants';
import {
  getMergedGameTemplates,
  getMergedGameTemplatesSync,
} from './ui/screens/forge_v2/utils/HestridiaMatrixRenderer';

import SCENARIOS from './core/scenarios.json';
import { applyScenarioBackground, getActiveScenario } from './ui/utils/BackgroundUtils';
import { SoundManager } from './ui/utils/SoundManager';
import { autoFullscreen, setFullscreenPref } from './ui/utils/fullscreen';

function toggleLobbyFullscreen() {
  try {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  } catch {}
}

class HubApp {
  private container: HTMLElement;
  private menu: MenuScreen;
  private menuLandscape: MenuScreenLandscape;
  private currentTab: TabId = 'battle';
  private lastBattleTab: TabId = 'battle';
  private isPrepMode = false;
  private currentArsenal: ArsenalScreen | ArsenalScreenLandscape | null = null;
  private settings: SettingsScreen;
  private bottomNav: BottomNav;
  private topHeader: TopHeader;

  constructor() {
    this.container = document.getElementById('app')!;
    autoFullscreen();
    this.menu = new MenuScreen(() => {
      this.togglePrepMode(true);
    });
    this.menuLandscape = new MenuScreenLandscape(
      () => this.togglePrepMode(true),
      (tab: TabId) => this.switchTab(tab)
    );
    this.settings = new SettingsScreen(
      () => {
        this.navigate('forge.html');
      },
      () => {
        this.switchTab('profile');
      }
    );
    this.bottomNav = new BottomNav(
      (tab) => {
        if (tab === 'battle') {
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

    this.topHeader = new TopHeader({
      userLevel: playerData.level,
      userXp: playerData.xp,
      xpNextLevel: nextLevelReq,
      gold: playerData.gold,
      diamonds: playerData.diamonds,
      enjinCoin: playerData.enjinCoin ?? 0,
    });

    applyScenarioBackground(getActiveScenario('lobby', (SCENARIOS as any).lobby));
    SoundManager.playAmbient('lobby');
    this.renderShell();
    this.switchTab('battle', true);

    const profBtn = document.getElementById('btn-profile');
    if (profBtn) profBtn.onclick = () => this.switchTab('profile');

    getMergedGameTemplates(CARD_TEMPLATES).catch(() => {});

    // Escuta rotação do celular ou redimensionamento web em modo paisagem
    OrientationManager.subscribe(() => {
      this.updateOrientationBadge();
      if (this.isPrepMode) {
        this.togglePrepMode(true);
      } else {
        this.switchTab(this.currentTab, true);
      }
    });

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
      },
    });
  }

  private renderShell() {
    this.container.innerHTML = `
      <div class="menu-screen" style="height: 100%; display: flex; flex-direction: column; overflow: hidden; position: relative;">
        <!-- HEADER ISOLADO EM COMPONENTE -->
        ${this.topHeader.render()}

        <div class="menu-content" id="main-content" style="flex: 1; position: relative; overflow: hidden; display: flex; flex-direction: column;"></div>

        ${this.bottomNav.render()}
      </div>
    `;
    this.bindShellEvents();
  }

  private updateOrientationBadge() {
    // Orientação e dispositivo são detectados automaticamente pelo OrientationManager
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

      this.switchTab('settings');
    });

    const profileBtn = document.getElementById('btn-profile');
    profileBtn?.addEventListener('click', () => {
      SoundManager.playAction('clique_perfil');
      this.switchTab('profile');
    });

    const fsBtn = document.getElementById('btn-fullscreen') as HTMLElement | null;
    if (fsBtn && !document.fullscreenEnabled) fsBtn.style.display = 'none';
    fsBtn?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.5);
      const exiting = !!document.fullscreenElement;
      toggleLobbyFullscreen();
      setFullscreenPref(!exiting);
    });
    document.addEventListener('fullscreenchange', () => {
      const b = document.getElementById('btn-fullscreen') as HTMLElement | null;
      if (b) {
        const on = !!document.fullscreenElement;
        b.style.borderColor = on ? '#ffd700' : 'rgba(212,175,55,0.4)';
        b.style.boxShadow = on ? '0 0 10px rgba(255,215,0,0.6)' : 'none';
        b.title = on ? 'Sair da tela cheia' : 'Tela cheia';
      }
    });

    this.bottomNav.bind();
  }

  private togglePrepMode(active: boolean) {
    this.isPrepMode = active;

    const content = document.getElementById('main-content');
    if (!content) return;

    this.updateUIComponents();

    if (active) {
      applyScenarioBackground(getActiveScenario('preparation', (SCENARIOS as any).preparation));
      const onConfirm = (cards: any[], skills: any[], board: string) => {
        localStorage.setItem('battle_prep', JSON.stringify({ cards, skills, board }));
        this.navigate('battle.html');
      };

      const isLandscape = OrientationManager.isLandscape();
      this.currentArsenal = isLandscape
        ? new ArsenalScreenLandscape(getMergedGameTemplatesSync(CARD_TEMPLATES), SKILL_POOL, [], onConfirm, true)
        : new ArsenalScreen(getMergedGameTemplatesSync(CARD_TEMPLATES), SKILL_POOL, [], onConfirm, true);

      gsap.to(content, {
        opacity: 0,
        duration: 0.15,
        onComplete: () => {
          this.currentArsenal?.render(content);
          gsap.to(content, { opacity: 1, duration: 0.3 });
        },
      });
    } else {
      this.switchTab('battle', true);
    }
  }

  private getSoundKey(tab: TabId): string {
    const map: Record<string, string> = {
      battle: 'lobby',
      store: 'loja',
      profile: 'perfil',
      settings: 'configuracoes',
      map: 'map',
      academy: 'academy',
      arsenal: 'arsenal',
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

    const isLandscape = OrientationManager.isLandscape();
    const verticalTabs: TabId[] = ['map', 'battle', 'academy'];
    const isVerticalTransition = !isLandscape && verticalTabs.includes(oldTab) && verticalTabs.includes(tab);

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
            gsap.fromTo(
              content,
              { opacity: 0, y: direction * 50, x: 0 },
              { opacity: 1, y: 0, x: 0, duration: 0.4, ease: 'power2.out' }
            );
          },
        });
      } else {
        const horizontalTabs: TabId[] = isLandscape
          ? ['arsenal', 'map', 'battle', 'academy', 'store', 'profile']
          : ['arsenal', 'battle', 'store', 'profile'];
        const oldHIdx = horizontalTabs.includes(oldTab) ? horizontalTabs.indexOf(oldTab) : 2;
        const newHIdx = horizontalTabs.includes(tab) ? horizontalTabs.indexOf(tab) : 2;
        const slideOffset = isLandscape ? 90 : 40;

        gsap.to(content, {
          opacity: 0,
          x: newHIdx > oldHIdx ? -slideOffset : slideOffset,
          y: 0,
          duration: 0.2,
          ease: 'power2.in',
          onComplete: () => {
            this.renderTabContent(tab, content);
            gsap.fromTo(
              content,
              { opacity: 0, x: newHIdx > oldHIdx ? slideOffset : -slideOffset, y: 0 },
              { opacity: 1, x: 0, y: 0, duration: 0.34, ease: 'power3.out' }
            );
          },
        });
      }
    } else {
      gsap.set(content, { x: 0, y: 0, opacity: 1 });
      this.renderTabContent(tab, content);
    }
  }

  private updateUIComponents() {
    this.bottomNav.update(this.currentTab, this.isPrepMode);

    const settingsBtn = document.getElementById('btn-game-settings');

    if (settingsBtn) {
      settingsBtn.textContent = this.isPrepMode || this.currentTab !== 'battle' ? '✕' : '⚙️';
      settingsBtn.style.color = '#fff';
      settingsBtn.style.borderColor =
        this.isPrepMode || this.currentTab !== 'battle' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)';
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
    const isLandscape = OrientationManager.isLandscape();

    if (tab === 'battle') {
      applyScenarioBackground(getActiveScenario('lobby', (SCENARIOS as any).lobby));
      if (isLandscape) {
        container.innerHTML = this.menuLandscape.render();
        this.menuLandscape.bind();
      } else {
        container.innerHTML = this.menu.render();
        this.menu.bind();
      }
    } else if (tab === 'arsenal') {
      applyScenarioBackground(getActiveScenario('arsenal', (SCENARIOS as any).arsenal));
      this.currentArsenal = isLandscape
        ? new ArsenalScreenLandscape(getMergedGameTemplatesSync(CARD_TEMPLATES), SKILL_POOL, [], undefined, false)
        : new ArsenalScreen(getMergedGameTemplatesSync(CARD_TEMPLATES), SKILL_POOL, [], undefined, false);
      this.currentArsenal.render(container);
    } else if (tab === 'store') {
      applyScenarioBackground(getActiveScenario('store', (SCENARIOS as any).store));
      if (isLandscape) {
        const storeLs = new StoreScreenLandscape();
        storeLs.render(container, { headerSpace: false });
      } else {
        const store = new StoreScreen();
        store.render(container, { headerSpace: true });
      }
    } else if (tab === 'profile') {
      applyScenarioBackground(getActiveScenario('lobby', (SCENARIOS as any).lobby));
      const profile = isLandscape
        ? new ProfileScreenLandscape(() => this.switchTab('settings'), () => this.switchTab('battle'))
        : new ProfileScreen(() => this.switchTab('settings'));
      profile.render(container);
    } else if (tab === 'map') {
      applyScenarioBackground(getActiveScenario('map', (SCENARIOS as any).map));
      const screen = isLandscape ? new MapScreenLandscape() : new MapScreen();
      screen.render(container);
    } else if (tab === 'academy') {
      applyScenarioBackground(getActiveScenario('academy', (SCENARIOS as any).academy));
      const screen = isLandscape ? new AcademyScreenLandscape() : new AcademyScreen();
      screen.render(container);
    } else if (tab === 'settings') {
      applyScenarioBackground(getActiveScenario('lobby', (SCENARIOS as any).lobby));
      this.settings.render(container);
    }
  }
}

new HubApp();
