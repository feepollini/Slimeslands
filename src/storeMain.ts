import './style.css';
import './ui/styles/Landscape.css';
import { StoreScreen } from './ui/screens/StoreScreen';
import { StoreScreenLandscape } from './ui/screens_landscape/StoreScreenLandscape';
import { OrientationManager } from './ui/OrientationManager';
import SCENARIOS from './core/scenarios.json';
import { applyScenarioBackground, getActiveScenario } from './ui/utils/BackgroundUtils';

window.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app')!;
  applyScenarioBackground(getActiveScenario('store', (SCENARIOS as any).store));

  const portraitStore = new StoreScreen();
  const landscapeStore = new StoreScreenLandscape();

  const renderStore = () => {
    const isLandscape = OrientationManager.isLandscape();
    app.innerHTML = `
      <div style="width:100%; height:100dvh; max-width:${isLandscape ? '100vw' : '450px'}; margin:0 auto; display:flex; flex-direction:column; position:relative; overflow:hidden;">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:rgba(0,0,0,0.65); border-bottom:1px solid rgba(255,215,0,0.2);">
          <a href="hub.html" style="padding:7px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.06); color:#fff; text-decoration:none; font-size:0.65rem; font-weight:900; letter-spacing:1px;">← HUB</a>
          <div style="font-size:0.75rem; font-weight:950; letter-spacing:3px; color:#ffd700;">LOJA ${isLandscape ? '• MODO PAISAGEM' : ''}</div>
          <span style="width:52px;"></span>
        </div>
        <div id="store-mount" style="flex:1; min-height:0; display:flex; flex-direction:column;"></div>
      </div>
    `;
    const mount = document.getElementById('store-mount')!;
    if (isLandscape) {
      landscapeStore.render(mount, { headerSpace: false });
    } else {
      portraitStore.render(mount, { headerSpace: false });
    }
  };

  renderStore();
  OrientationManager.subscribe(() => renderStore());
});
