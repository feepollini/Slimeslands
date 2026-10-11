import { ParamsPanel } from './panels/ParamsPanel';
import { MultiStatePanel } from './panels/MultiStatePanel';

export class WorldMapBottomMenu {
  private params = new ParamsPanel();
  private multiState = new MultiStatePanel();

  constructor() {}

  public render(state: any): string {
    const selectedObj = (state.worldMapObjects || []).find((o: any) => o.id === state.selectedId);

    return `
      <div id="wm-bottom-menu" style="
        height: 140px; background: #07070a; border-top: 1px solid rgba(255,255,255,0.06);
        display: flex; color: #fff; font-family: 'Inter', sans-serif; overflow: hidden;
      ">
        <div style="width: 180px; padding: 12px; border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 8px;">
           <div style="font-size:0.5rem; color:#51c5ff; font-weight:800; letter-spacing:1px;">CONFIG. PINCEL</div>
           <div style="display:flex; align-items:center; gap:10px;">
              <input type="range" id="wm-brush-size" min="1" max="100" value="20" style="flex:1; cursor:pointer; accent-color:#51c5ff;">
              <span id="wm-brush-size-val" style="font-size:0.65rem; color:#51c5ff; width:30px;">20px</span>
           </div>
           <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:0.5rem; color:rgba(255,255,255,0.4);">COR:</span>
              <input type="color" id="wm-mark-color" value="#ffffff" style="width:20px; height:20px; border:none; background:none; cursor:pointer;">
           </div>
        </div>

        <div id="wm-params-container" style="flex: 1; min-width: 250px;">
          ${this.params.render(selectedObj, state.currentTime || 0, state)}
        </div>

        <div id="wm-multistate-container" style="width: 200px;">
          ${this.multiState.render(selectedObj, state, {reRender:()=>{}})}
        </div>

      </div>
    `;
  }

  public bind(container: HTMLElement, state: any, callbacks: any) {
    const selectedObj = (state.worldMapObjects || []).find((o: any) => o.id === state.selectedId);

    const slider = container.querySelector('#wm-brush-size') as HTMLInputElement;
    const valLabel = container.querySelector('#wm-brush-size-val') as HTMLElement;
    const colorInput = container.querySelector('#wm-mark-color') as HTMLInputElement;

    if (slider && valLabel) {
       slider.addEventListener('input', () => {
          valLabel.innerText = slider.value + 'px';
          (window as any).__brushSize = parseInt(slider.value);
       });
    }
    if (colorInput) {
       colorInput.addEventListener('change', () => (window as any).__markColor = colorInput.value);
    }

    const paramsWrap = container.querySelector('#wm-params-container') as HTMLElement;
    if (paramsWrap && selectedObj) {
       this.params.bind(paramsWrap, (props: any) => {
          Object.assign(selectedObj, props);
          callbacks.reRender();
       }, (prop: string) => {
          if (!selectedObj.keyframes) selectedObj.keyframes = {};
          const t = state.currentTime || 0;
          if (!selectedObj.keyframes[prop]) {
            selectedObj.keyframes[prop] = [{ t, v: selectedObj[prop] ?? (prop === 'opacity' ? 1 : 0) }];
          } else {
            const track = selectedObj.keyframes[prop];
            const idx = track.findIndex((p: any) => Math.abs(p.t - t) < 0.05);
            if (idx !== -1) { track.splice(idx, 1); if (!track.length) delete selectedObj.keyframes[prop]; }
            else { track.push({ t, v: selectedObj[prop] ?? (prop === 'opacity' ? 1 : 0) }); track.sort((a:any,b:any)=>a.t-b.t); }
          }
          callbacks.reRender();
          document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
       });
    }

    const multiWrap = container.querySelector('#wm-multistate-container') as HTMLElement;
    if (multiWrap && selectedObj) {
       this.multiState.bind(multiWrap, selectedObj, state, callbacks);
    }
  }
}
