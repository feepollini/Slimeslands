import './style.css';
import { gsap } from 'gsap';
import { ArsenalScreen } from './ui/screens/ArsenalScreen';
import { CARD_TEMPLATES, SKILL_POOL } from './core/constants';
import { getMergedGameTemplates } from './ui/screens/forge_v2/utils/HestridiaMatrixRenderer';
import SCENARIOS from './core/scenarios.json';
import { applyScenarioBackground } from './ui/utils/BackgroundUtils';
import { t } from './core/i18n';

class ArsenalApp {
  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('arsenal-root')!;
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const isPrep = mode === 'prep';

    this.init(isPrep);
    gsap.fromTo(document.body, { opacity: 0 }, { opacity: 1, duration: 0.5 });
  }

  private async init(isPrep: boolean) {
    applyScenarioBackground((SCENARIOS as any).arsenal);
    
    // Get BGs for scenarios tab (if needed)
    let bgs: string[] = [];
    try {
      const resp = await fetch('/api/images');
      if (resp.ok) {
        const data = await resp.json();
        bgs = data.bgs || [];
      }
    } catch (e) { }

    const onConfirm = isPrep ? (cards: any[], skills: any[], board: string) => {
        // Save preparation to localStorage to be picked up by battle.html
        const prepData = { cards, skills, board };
        localStorage.setItem('battle_prep', JSON.stringify(prepData));
        
        gsap.to(document.body, {
          opacity: 0,
          duration: 0.3,
          onComplete: () => {
            window.location.href = 'battle.html';
          }
        });
    } : undefined;

    const allTemplates = await getMergedGameTemplates(CARD_TEMPLATES);

    const arsenal = new ArsenalScreen(
      allTemplates,
      SKILL_POOL,
      bgs,
      onConfirm
    );

    // Create a shell wrapper for arsenal (Top bar and content area)
    this.container.innerHTML = `
      <div class="menu-screen" style="height: 100%; display: flex; flex-direction: column; overflow: hidden;">
        <div class="menu-top-bar" style="display:flex; justify-content:space-between; align-items:center; padding:0 15px; width:100%; height:70px; box-sizing:border-box; flex-shrink:0; z-index:100;">
          <div style="display:flex; align-items:center; gap:12px;">
             <button id="btn-home" style="background:linear-gradient(180deg, #5a4128, #2a1c0d); border:3px solid #0e0903; color:#ffe9a8; padding:8px 15px; border-radius:10px; font-weight:900; font-size:0.6rem; cursor:pointer; text-shadow:0 2px 0 rgba(0,0,0,0.6); box-shadow:0 3px 0 rgba(0,0,0,0.55), inset 0 2px 0 rgba(255,236,190,0.35);">⟨ HUB</button>
              <div style="color:#fff; font-weight:900; font-size:0.9rem; letter-spacing:1px; margin-left:5px;">ARSENAL${isPrep ? t('arsMain.prep') : ''}</div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
              ${isPrep ? `<button id="btn-start-battle" style="background:linear-gradient(180deg, #b8f54d 0%, #7ed321 38%, #4a9b1f 78%, #2c620d 100%); color:#0f1f00; border:3px solid #0e1f00; padding:8px 22px; border-radius:20px; font-weight:950; font-size:0.75rem; cursor:pointer; box-shadow:0 4px 0 rgba(0,0,0,0.5), 0 0 18px rgba(150,255,70,0.45), inset 0 2px 0 rgba(255,255,255,0.5);">${t('arsMain.play')}</button>` : ''}
          </div>
        </div>
        <div id="arsenal-content" style="flex:1; overflow:hidden;"></div>
      </div>
    `;

    const contentArea = document.getElementById('arsenal-content')!;
    arsenal.render(contentArea);

    document.getElementById('btn-home')?.addEventListener('click', () => {
       gsap.to(document.body, { opacity: 0, duration: 0.2, onComplete: () => { window.location.href = 'hub.html'; } });
    });

    document.getElementById('btn-start-battle')?.addEventListener('click', () => {
       // Find and click the hidden "JOGAR" button inside ArsenalScreen UI
       const realBtn = document.getElementById('ars-confirm');
       if (realBtn) realBtn.click();
    });
  }
}

new ArsenalApp();
