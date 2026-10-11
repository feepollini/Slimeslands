import './style.css';
import { gsap } from 'gsap';
import SCENARIOS from './core/scenarios.json';
import { applyScenarioBackground } from './ui/utils/BackgroundUtils';
import { StoreScreen } from './ui/screens/StoreScreen';

class StoreApp {
  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('store-root')!;
    this.render();
    gsap.fromTo(document.body, { opacity: 0 }, { opacity: 1, duration: 0.5 });
  }

  private render() {
    applyScenarioBackground((SCENARIOS as any).store);

    this.container.innerHTML = `
      <div class="menu-screen" style="height: 100%; display: flex; flex-direction: column; overflow: hidden;">
        <div class="menu-top-bar" style="display:flex; justify-content:space-between; align-items:center; padding:0 15px; width:100%; height:70px; box-sizing:border-box; flex-shrink:0; z-index:100;">
           <button id="btn-home" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:8px 15px; border-radius:10px; font-weight:900; font-size:0.6rem; cursor:pointer;">⟨ HUB</button>
           <div></div>
        </div>
        <div id="store-content" style="flex:1; overflow:hidden; display:flex; flex-direction:column;"></div>
      </div>
    `;

    const content = document.getElementById('store-content')!;
    new StoreScreen().render(content);

    const backAction = () => {
       gsap.to(document.body, { opacity: 0, duration: 0.2, onComplete: () => { window.location.href = 'hub.html'; } });
    };

    document.getElementById('btn-home')?.addEventListener('click', backAction);
  }
}

new StoreApp();
