import { gsap } from 'gsap';

export class ForgeCore {
  constructor(_container: HTMLElement, _showToastFn: (msg: string, color?: string) => void) {
    // Args kept for signature compat; toast targets DOM #editor-toast directly
  }

  public renderAvailabilityForm(availability: any): string {
    const types = [
      { id: 'always', label: 'Disponível Sempre' },
      { id: 'level', label: 'Bloqueado por Nível' },
      { id: 'stage', label: 'Bloqueado por Fase' },
      { id: 'store', label: 'VENDIDO NA LOJA 🛒' },
      { id: 'ads', label: 'DESBLOQUEIO POR ADS (GRÁTIS) 📺' },
      { id: 'hidden', label: 'Escondido' }
    ];

    return `
      <div class="availability-form glass-panel" style="margin-top:10px; padding:15px; border-color:#ffd700;">
        <div class="form-group" style="margin-bottom:10px;">
          <label style="font-size:0.6rem; opacity:0.7; text-transform:uppercase; color:#ffd700;">Método de Aquisição</label>
          <select class="editor-input av-type-select" style="border-color:rgba(255,215,0,0.3)">
            ${types.map(t => `<option value="${t.id}" ${availability.type === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </div>

        ${availability.type === 'level' ? `
          <div class="form-group">
            <label>Nível Mínimo</label>
            <input type="number" class="editor-input av-min-level" value="${availability.minLevel || 1}">
          </div>
        ` : ''}

        ${availability.type === 'stage' ? `
          <div class="form-group">
            <label>ID da Fase</label>
            <input type="text" class="editor-input av-stage-id" value="${availability.stageId || ''}" placeholder="ex: stage_10">
          </div>
        ` : ''}

        ${availability.type === 'store' ? `
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div class="form-group">
              <label>Preço</label>
              <input type="number" class="editor-input av-price" value="${availability.price || 100}">
            </div>
            <div class="form-group">
              <label>Moeda</label>
              <select class="editor-input av-currency">
                <option value="gold" ${availability.currency === 'gold' ? 'selected' : ''}>🟡 Ouro (Gold)</option>
                <option value="gems" ${availability.currency === 'gems' ? 'selected' : ''}>💎 Gemas (Premium)</option>
              </select>
            </div>
          </div>
        ` : ''}

        ${availability.type === 'ads' ? `
           <div style="background:rgba(81,197,255,0.1); padding:10px; border-radius:8px; border:1px solid rgba(81,197,255,0.3); font-size:0.65rem; color:#51c5ff; font-weight:700;">
             💡 Item será liberado após o usuário assistir a um anúncio premiado no jogo.
           </div>
        ` : ''}
      </div>
    `;
  }

  public bindAvailabilityHandlers(availability: any, container: HTMLElement, onUpdate?: () => void, reRender?: () => void) {
    const select = container.querySelector('.av-type-select') as HTMLSelectElement;
    select?.addEventListener('change', () => {
      availability.type = select.value;
      if (reRender) reRender();
      if (onUpdate) onUpdate();
    });

    container.querySelector('.av-min-level')?.addEventListener('input', (e) => {
      availability.minLevel = parseInt((e.target as HTMLInputElement).value);
      if (onUpdate) onUpdate();
    });

    container.querySelector('.av-stage-id')?.addEventListener('input', (e) => {
      availability.stageId = (e.target as HTMLInputElement).value;
      if (onUpdate) onUpdate();
    });

    container.querySelector('.av-price')?.addEventListener('input', (e) => {
      availability.price = parseInt((e.target as HTMLInputElement).value);
      if (onUpdate) onUpdate();
    });

    container.querySelector('.av-currency')?.addEventListener('change', (e) => {
      availability.currency = (e.target as HTMLSelectElement).value;
      if (onUpdate) onUpdate();
    });
  }

  public showToast(msg: string, color = '#4cff88') {
    const t = document.getElementById('editor-toast');
    if (!t) return;
    t.textContent = msg;
    t.style.borderColor = color;
    gsap.fromTo(t, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 });
    setTimeout(() => {
      gsap.to(t, { opacity: 0, y: -10, duration: 0.3 });
    }, 4000);
  }

  public async saveJson(endpoint: string, data: any): Promise<boolean> {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}
