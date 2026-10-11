import { KeyframeManager } from '../../../../../../shared/KeyframeManager';

export class LightPanel {
  private selectedObj: any = null;
  private state: any = null;

  public render(selectedObj: any, state: any = {}, callbacks?: any): string {
    this.selectedObj = selectedObj;
    this.state = state;

    if (!selectedObj || selectedObj.type !== 'light') {
      return `
        <div style="padding:40px 20px; text-align:center; opacity:0.3;">
          <div style="font-size:2.5rem; margin-bottom:15px;">💡</div>
          <div style="font-size:0.6rem; font-weight:900; letter-spacing:1px;">SELECIONE UMA LUZ</div>
          <div style="font-size:0.45rem; margin-top:10px; line-height:1.4;">Use a ferramenta de Luz (💫) para criar pontos de iluminação no mapa.</div>
        </div>
      `;
    }

    const row = (label: string, value: number, prop: string, min = 0, max = 1000, step = 1, color = '#ffd700') => `
      <div class="param-row" style="margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
           <span style="font-size:0.45rem; color:${color}; font-weight:900; letter-spacing:0.5px;">${label.toUpperCase()}</span>
           <span style="font-size:0.45rem; color:#fff; opacity:0.6;">${Math.round(value * 100) / 100}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <input type="range" class="light-slider" data-prop="${prop}" min="${min}" max="${max}" step="${step}" value="${value}" style="flex:1; accent-color:${color};">
          <input type="number" class="light-num-input" data-prop="${prop}" value="${Math.round(value * 100) / 100}" style="width:45px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:#fff; font-size:0.45rem; padding:4px; text-align:center;">
          <button class="light-kf-toggle ${KeyframeManager.isPropertyActive(selectedObj, prop) ? 'active' : ''}" data-prop="${prop}" style="
            width:20px; height:20px; border-radius:4px; border:1px solid ${KeyframeManager.isPropertyActive(selectedObj, prop) ? '#ffd700' : 'rgba(255,255,255,0.1)'};
            background:${KeyframeManager.isPropertyActive(selectedObj, prop) ? 'rgba(255,215,0,0.2)' : 'transparent'};
            color:${KeyframeManager.isPropertyActive(selectedObj, prop) ? '#ffd700' : 'rgba(255,255,255,0.2)'};
            cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:0.5rem;
          ">◆</button>
        </div>
      </div>
    `;

    const colorRow = (label: string, value: string, prop: string) => `
      <div class="param-row" style="margin-bottom:12px;">
        <span style="font-size:0.45rem; color:#888; font-weight:900; display:block; margin-bottom:6px;">${label.toUpperCase()}</span>
        <div style="display:flex; gap:8px; align-items:center;">
          <div style="position:relative; width:32px; height:32px; border-radius:6px; background:${value}; border:1px solid rgba(255,255,255,0.1); overflow:hidden;">
            <input type="color" class="light-color-input" data-prop="${prop}" value="${value.startsWith('#') ? value.slice(0, 7) : '#ffffff'}" style="position:absolute; top:-5px; left:-5px; width:50px; height:50px; cursor:pointer; opacity:0;">
          </div>
          <input type="text" class="light-hex-input" data-prop="${prop}" value="${value}" style="flex:1; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:#fff; font-size:0.5rem; padding:8px; font-family:monospace;">
        </div>
      </div>
    `;

    const selectRow = (label: string, value: string, prop: string, options: {value:string, label:string}[]) => `
      <div class="param-row" style="margin-bottom:12px;">
        <span style="font-size:0.45rem; color:#888; font-weight:900; display:block; margin-bottom:6px;">${label.toUpperCase()}</span>
        <select class="light-select" data-prop="${prop}" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:#fff; font-size:0.55rem; padding:8px; cursor:pointer;">
          ${options.map(o => `<option value="${o.value}" ${o.value === value ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </div>
    `;

    return `
      <div style="padding:16px; height:100%; background:#0a0a0f; display:flex; flex-direction:column; gap:20px;">
        
        <!-- HEADER -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:10px;">
          <div>
            <div style="font-size:0.65rem; color:#ffd700; font-weight:900; letter-spacing:1px;">LUZ DINÂMICA</div>
            <div style="font-size:0.4rem; color:#555;">ID: ${selectedObj.id.slice(-6)}</div>
          </div>
          <div style="background:rgba(255,215,0,0.1); border:1px solid rgba(255,215,0,0.2); padding:4px 8px; border-radius:4px; color:#ffd700; font-size:0.5rem; font-weight:900;">2D LIGHT</div>
        </div>

        <div style="flex:1; overflow-y:auto; padding-right:4px;" class="custom-scroll">
          
          <!-- CONFIGURAÇÃO BÁSICA -->
          <div class="light-section" style="margin-bottom:24px;">
            <div style="font-size:0.5rem; color:#44ccff; font-weight:900; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
              <span style="width:4px; height:12px; background:#44ccff; border-radius:2px;"></span> CONFIGURAÇÃO
            </div>
            
            ${selectRow('Modo de Mesclagem', selectedObj.blendMode || 'lighter', 'blendMode', [
              {value: 'lighter', label: 'Luz (Aditivo)'},
              {value: 'multiply', label: 'Sombra (Multiplicar)'},
              {value: 'overlay', label: 'Cinemático (Overlay)'},
              {value: 'screen', label: 'Brilho (Screen)'},
              {value: 'darken', label: 'Escurecer (Darken)'}
            ])}

            ${row('Raio da Luz', selectedObj.radius || 150, 'radius', 10, 1000)}
            ${row('Intensidade', selectedObj.intensity || 1, 'intensity', 0, 5, 0.1)}
            ${row('Opacidade', (selectedObj.opacity ?? 1) * 100, 'opacity', 0, 100, 1)}

            <div class="param-row" style="margin-top:12px; display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); padding:8px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
              <span style="font-size:0.45rem; color:#888; font-weight:900; letter-spacing:0.5px;">PROJETAR SOMBRAS</span>
              <label class="toggle-switch shadow-toggle-container" style="position:relative; display:inline-block; width:34px; height:18px; cursor:pointer;">
                <input type="checkbox" class="light-shadow-toggle" ${selectedObj.castShadows !== false ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                <span class="slider" style="position:absolute; top:0; left:0; right:0; bottom:0; background-color:${selectedObj.castShadows !== false ? '#4cff8833' : '#333'}; transition:.4s; border-radius:18px; border:1px solid ${selectedObj.castShadows !== false ? '#4cff88' : '#444'};">
                  <span style="position:absolute; content:''; height:10px; width:10px; left:4px; bottom:3px; background-color:${selectedObj.castShadows !== false ? '#4cff88' : '#888'}; transition:.4s; border-radius:50%; transform:${selectedObj.castShadows !== false ? 'translateX(14px)' : 'translateX(0)'};"></span>
                </span>
              </label>
            </div>
          </div>

          <!-- CORES E GRADIENTE -->
          <div class="light-section" style="margin-bottom:24px;">
             <div style="font-size:0.5rem; color:#ff8c42; font-weight:900; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
              <span style="width:4px; height:12px; background:#ff8c42; border-radius:2px;"></span> CORES ATIVAS
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              ${colorRow('Cor Centro', selectedObj.color1 || '#ffffff', 'color1')}
              ${colorRow('Cor Borda', selectedObj.color2 || '#00000000', 'color2')}
            </div>
          </div>

          <!-- ANIMAÇÕES -->
          <div class="light-section" style="margin-bottom:24px;">
            <div style="font-size:0.5rem; color:#a78bfa; font-weight:900; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
              <span style="width:4px; height:12px; background:#a78bfa; border-radius:2px;"></span> ANIMAÇÕES E EFEITOS
            </div>
            
            ${selectRow('Efeito Animado', selectedObj.animationType || 'none', 'animationType', [
              {value: 'none', label: 'Nenhum'},
              {value: 'flicker', label: 'Cintilação (Flicker)'},
              {value: 'breath', label: 'Pulsação (Breath)'},
              {value: 'shake', label: 'Tremor (Shake)'},
              {value: 'color_cycle', label: 'Ciclo de Cores'}
            ])}

            ${row('Velocidade', selectedObj.animationSpeed || 1, 'animationSpeed', 0.1, 10, 0.1, '#a78bfa')}
            ${row('Alcance / Força', selectedObj.animationRange || 1, 'animationRange', 0, 5, 0.1, '#a78bfa')}
          </div>

          <!-- PRESETS -->
          <div class="light-section">
            <div style="font-size:0.5rem; color:#4cff88; font-weight:900; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
              <span style="width:4px; height:12px; background:#4cff88; border-radius:2px;"></span> PRESETS RÁPIDOS
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
              <button class="light-preset-btn" data-preset="torch" style="padding:8px; background:rgba(255,140,66,0.1); border:1px solid rgba(255,140,66,0.2); border-radius:6px; color:#ff8c42; font-size:0.45rem; font-weight:900; cursor:pointer;">🔥 TOCHA</button>
              <button class="light-preset-btn" data-preset="moon" style="padding:8px; background:rgba(81,197,255,0.1); border:1px solid rgba(81,197,255,0.2); border-radius:6px; color:#51c5ff; font-size:0.45rem; font-weight:900; cursor:pointer;">🌙 LUAR</button>
              <button class="light-preset-btn" data-preset="neon" style="padding:8px; background:rgba(167,139,250,0.1); border:1px solid rgba(167,139,250,0.2); border-radius:6px; color:#a78bfa; font-size:0.45rem; font-weight:900; cursor:pointer;">👾 NEON</button>
              <button class="light-preset-btn" data-preset="shadow" style="padding:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#888; font-size:0.45rem; font-weight:900; cursor:pointer;">🌑 SOMBRA</button>
            </div>
          </div>

        </div>

        <!-- FOOTER COMMANDS -->
        <div style="padding-top:10px; border-top:1px solid rgba(255,255,255,0.06); display:flex; gap:8px;">
          <button class="light-cmd-btn" data-cmd="duplicate" style="flex:1; padding:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff; font-size:0.5rem; font-weight:900; cursor:pointer;">DUPLICAR</button>
          <button class="light-cmd-btn" data-cmd="delete" style="flex:1; padding:8px; background:rgba(255,51,102,0.1); border:1px solid rgba(255,51,102,0.2); border-radius:6px; color:#ff3366; font-size:0.5rem; font-weight:900; cursor:pointer;">EXCLUIR</button>
        </div>

      </div>
    `;
  }

  public bind(container: HTMLElement, state: any, callbacks: any) {
    if (!this.selectedObj) return;

    const update = (props: any) => {
      Object.assign(this.selectedObj, props);
      callbacks.reRender();
    };

    container.querySelectorAll('.light-slider').forEach(slider => {
      slider.addEventListener('input', (e: any) => {
        const prop = slider.getAttribute('data-prop')!;
        let val = parseFloat(e.target.value);
        if (prop === 'opacity') val /= 100;
        
        const numInput = slider.parentElement?.querySelector('.light-num-input') as HTMLInputElement;
        if (numInput) numInput.value = (prop === 'opacity' ? val * 100 : val).toString();

        update({ [prop]: val });
      });
    });

    container.querySelectorAll('.light-num-input').forEach(input => {
      input.addEventListener('change', (e: any) => {
        const prop = input.getAttribute('data-prop')!;
        let val = parseFloat(e.target.value);
        if (prop === 'opacity') val /= 100;
        update({ [prop]: val });
      });
    });

    container.querySelectorAll('.light-color-input, .light-hex-input').forEach(input => {
      input.addEventListener('input', (e: any) => {
        const prop = input.getAttribute('data-prop')!;
        const val = e.target.value;
        update({ [prop]: val });
        
        // Sync sibling input
        const sibling = input.classList.contains('light-color-input') 
          ? input.parentElement?.nextElementSibling as HTMLInputElement
          : input.previousElementSibling?.querySelector('input') as HTMLInputElement;
        if (sibling) sibling.value = val;
      });
    });

    container.querySelectorAll('.light-select').forEach(select => {
      select.addEventListener('change', (e: any) => {
        const prop = select.getAttribute('data-prop')!;
        update({ [prop]: e.target.value });
      });
    });

    container.querySelector('.light-shadow-toggle')?.addEventListener('change', (e: any) => {
      update({ castShadows: e.target.checked });
    });

    container.querySelectorAll('.light-kf-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const prop = btn.getAttribute('data-prop')!;
        const val = this.selectedObj[prop];
        KeyframeManager.toggleProperty(this.selectedObj, prop, val);
        callbacks.reRender();
      });
    });

    container.querySelectorAll('.light-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = (btn as HTMLElement).dataset.preset;
        const radius = this.selectedObj.radius || 150;
        
        if (preset === 'torch') {
          update({
            color1: '#ffca54',
            color2: '#ff440022',
            intensity: 1.5,
            blendMode: 'lighter',
            animationType: 'flicker',
            animationSpeed: 1.2,
            animationRange: 0.8
          });
        } else if (preset === 'moon') {
          update({
            color1: '#8ab4ff55',
            color2: '#00000000',
            intensity: 0.8,
            blendMode: 'screen',
            animationType: 'breath',
            animationSpeed: 0.3,
            animationRange: 0.2
          });
        } else if (preset === 'neon') {
          update({
            color1: '#f854ff',
            color2: '#5422ff00',
            intensity: 2,
            blendMode: 'lighter',
            animationType: 'breath',
            animationSpeed: 2,
            animationRange: 0.5
          });
        } else if (preset === 'shadow') {
          update({
            color1: '#000000cc',
            color2: '#00000000',
            intensity: 1,
            blendMode: 'multiply',
            animationType: 'none'
          });
        }
      });
    });

    container.querySelectorAll('.light-cmd-btn').forEach(btn => {
       btn.addEventListener('click', () => {
         const cmd = (btn as HTMLElement).dataset.cmd;
         if (cmd === 'delete') {
           document.dispatchEvent(new CustomEvent('worldmap-request-delete', { detail: { id: this.selectedObj.id } }));
         } else if (cmd === 'duplicate') {
           document.dispatchEvent(new CustomEvent('worldmap-request-duplicate', { detail: { id: this.selectedObj.id } }));
         }
       });
    });
  }
}
