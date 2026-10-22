export class TabArtefatos {
  private skills: any[];
  private selectedIndex: number;
  private reRender: () => void;
  private showToast: (msg: string, color?: string) => void;
  private renderAvailabilityForm: (av: any) => string;
  private bindAvailabilityHandlers: (av: any, container: HTMLElement, onUpdate: () => void, reRender: () => void) => void;
  private setArtefatosSelectedIndex: (idx: number) => void;
  private syncItemWithStore: (type: string, id: string) => void;
  private openMediaPicker: (onSelect: (url: string) => void) => void;

  constructor(state: any, callbacks: any, core: any) {
    this.skills = state.skills;
    this.selectedIndex = state.selectedIndex;
    this.reRender = callbacks.reRender;
    this.showToast = callbacks.showToast;
    this.setArtefatosSelectedIndex = callbacks.setArtefatosSelectedIndex;
    this.syncItemWithStore = callbacks.syncItemWithStore;
    this.openMediaPicker = callbacks.openMediaPicker;
    
    this.renderAvailabilityForm = core.renderAvailabilityForm;
    this.bindAvailabilityHandlers = core.bindAvailabilityHandlers;
  }

  public render(): string {
    const s = this.skills[this.selectedIndex];

    return `
      <div class="editor-list-panel" style="width:280px; flex-shrink:0; height:100%; display:flex; flex-direction:column; overflow:hidden; background:#11131c; border-right:1px solid rgba(255,255,255,0.08);">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.08); flex-shrink:0;">
          <span style="font-size:0.68rem; font-weight:900; color:#a855f7; letter-spacing:0.8px;">🔮 ATIVAS / ARTEFATOS (${this.skills.length})</span>
          <button type="button" id="btn-add-skill" style="background:linear-gradient(135deg, #8b5cf6, #6d28d9); color:#fff; border:none; border-radius:6px; padding:4px 10px; font-size:0.64rem; font-weight:900; cursor:pointer;">+ NOVO</button>
        </div>

        <div class="ars-artifact-grid" style="flex:1; padding:10px; overflow-y:auto; display:grid; grid-template-columns:1fr 1fr; gap:8px; align-content:start; margin:0;">
          ${this.skills.map((skill, i) => `
            <div class="editor-list-item ars-artifact-item ${i === this.selectedIndex ? 'active' : ''}" data-type="skill" data-idx="${i}" style="border-radius:10px; min-height:88px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px; text-align:center; padding:8px; background:${i === this.selectedIndex ? 'rgba(139,92,246,0.16)' : '#181b26'}; border:1.5px solid ${i === this.selectedIndex ? '#8b5cf6' : 'rgba(255,255,255,0.07)'};">
              <div class="ars-artifact-image" style="width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.05); border:1px solid ${i === this.selectedIndex ? '#a855f7' : 'rgba(255,255,255,0.12)'}; font-size:1rem; flex-shrink:0; ${skill.image ? `background-image:url('${skill.image}'); background-size:contain; background-repeat:no-repeat; background-position:center;` : ''}">${skill.image ? '' : skill.icon}</div>
              <div class="ars-artifact-content" style="display:flex; flex-direction:column; align-items:center;">
                <div class="ars-artifact-name" style="font-size:0.66rem; font-weight:800; line-height:1.15; word-break:break-word;">${skill.name}</div>
                ${skill.availability?.type === 'store' ? '<span class="shop-badge" style="font-size:0.48rem; background:rgba(255,215,0,0.2); color:#ffd700; padding:1px 4px; border-radius:4px; margin-top:2px;">🛒 LOJA</span>' : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="editor-form-panel" style="flex:1; height:100%; overflow-y:auto; padding:14px 20px; display:flex; flex-direction:column; gap:12px; box-sizing:border-box;">
        <!-- TOP HEADER BAR -->
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.08); flex-shrink:0; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px; height:36px; border-radius:8px; background:rgba(139,92,246,0.16); border:1px solid rgba(139,92,246,0.4); display:flex; align-items:center; justify-content:center; overflow:hidden;">
              ${s?.image ? `<div style="width:100%; height:100%; background:url('${s.image}') center/contain no-repeat;"></div>` : `<span style="font-size:1.1rem;">${s?.icon || '🔮'}</span>`}
            </div>
            <div>
              <div style="font-size:0.92rem; font-weight:900; color:#fff; letter-spacing:0.5px;">${(s?.name || 'NENHUM ARTEFATO').toUpperCase()}</div>
              <div style="font-size:0.62rem; color:#94a3b8;">ID: ${s?.id || '-'}</div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" id="btn-skill-make-shop" style="background:rgba(245,158,11,0.16); border:1px solid #f59e0b; color:#fbbf24; border-radius:7px; padding:6px 12px; font-size:0.68rem; font-weight:900; cursor:pointer;">
              💎 Sincronizar c/ Loja
            </button>
            ${this.skills.length > 1 && s ? `<button type="button" id="btn-delete-skill" style="background:rgba(239,68,68,0.15); border:1px solid #ef4444; color:#f87171; border-radius:7px; padding:6px 12px; font-size:0.68rem; font-weight:900; cursor:pointer;">🗑️ Excluir</button>` : ''}
            <button type="button" id="btn-save-skills" class="editor-btn-primary" style="padding:7px 16px; font-size:0.72rem; border-radius:7px;">💾 SALVAR ARTEFATOS</button>
          </div>
        </div>

        ${s ? `
        <div id="logic-editor-content" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(310px, 1fr)); gap:14px; align-items:start;">
          
          <!-- COLUNA 1: IDENTIDADE, MÍDIA & DESCRIÇÕES -->
          <div style="background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:12px;">
            <div style="font-size:0.68rem; font-weight:900; color:#a855f7; letter-spacing:0.8px; text-transform:uppercase;">🎨 Identidade & Mídia</div>

            <div style="display:grid; grid-template-columns:1fr 125px; gap:10px; align-items:end;">
              <div class="form-group" style="gap:4px;">
                <label style="font-size:0.64rem;">Nome do Artefato / Ativa</label>
                <input type="text" id="sk-name" class="editor-input" style="padding:8px 10px; font-size:0.82rem;" value="${s.name}">
              </div>
              <div class="form-group" style="gap:4px;">
                <label style="font-size:0.64rem;">ID (Sistema)</label>
                <input type="text" id="sk-id" class="editor-input" style="padding:8px 10px; font-size:0.74rem; color:#94a3b8;" value="${s.id}" readonly>
              </div>
            </div>

            <div class="form-group" style="gap:4px;">
              <label style="font-size:0.64rem;">Ícone / Arte na Galeria</label>
              <div style="display:flex; gap:10px; align-items:center;">
                <div id="sk-media-preview" style="width:44px; height:44px; background:rgba(255,255,255,0.05); border-radius:8px; border:1px solid rgba(255,255,255,0.14); display:flex; align-items:center; justify-content:center; overflow:hidden; font-size:1.3rem; flex-shrink:0;">
                  ${s.image ? `<div style="width:100%; height:100%; background:url('${s.image}') center/cover no-repeat"></div>` : s.icon}
                </div>
                <button type="button" id="btn-pick-skill-media" class="editor-btn-secondary" style="height:40px; flex:1; font-size:0.7rem; color:#e2e8f0; border-color:rgba(255,255,255,0.2);">🖼️ Escolher Arte na Galeria</button>
              </div>
            </div>

            <div class="form-group" style="gap:4px;">
              <label style="font-size:0.64rem;">Descrição (In-Game)</label>
              <textarea id="sk-desc" class="editor-input" rows="2" style="font-size:0.78rem; padding:8px 10px;">${s.description}</textarea>
            </div>

            <div class="form-group" style="gap:4px;">
              <label style="font-size:0.64rem;">Lore / Flavor Text</label>
              <textarea id="sk-flavor" class="editor-input" rows="2" style="font-size:0.76rem; color:#94a3b8; padding:8px 10px;">${s.flavorText}</textarea>
            </div>
          </div>

          <!-- COLUNA 2: COMPORTAMENTO DE COMBATE & LOJA -->
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:10px;">
              <div style="font-size:0.68rem; font-weight:900; color:#51c5ff; letter-spacing:0.8px; text-transform:uppercase;">⚙️ Comportamento (Buff / Nerf)</div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div class="form-group" style="gap:4px;">
                  <label style="font-size:0.64rem;">Tipo de Lógica</label>
                  <select id="sk-logic" class="editor-input" style="padding:8px 10px; font-size:0.78rem;">
                    <option value="buff" ${s.logicType === 'buff' ? 'selected' : ''}>📈 BUFF (Positivo)</option>
                    <option value="nerf" ${s.logicType === 'nerf' ? 'selected' : ''}>📉 NERF (Negativo)</option>
                  </select>
                </div>
                <div class="form-group" style="gap:4px;">
                  <label style="font-size:0.64rem;">Alvo</label>
                  <select id="sk-target" class="editor-input" style="padding:8px 10px; font-size:0.78rem;">
                    <option value="user" ${s.target === 'user' ? 'selected' : ''}>👤 Você (Aliado)</option>
                    <option value="opponent" ${s.target === 'opponent' ? 'selected' : ''}>👹 Oponente (Inimigo)</option>
                  </select>
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 120px; gap:10px;">
                <div class="form-group" style="gap:4px;">
                  <label style="font-size:0.64rem;">Atributo Afetado</label>
                  <select id="sk-stat" class="editor-input" style="padding:8px 10px; font-size:0.78rem;">
                    <option value="pv" ${s.statType === 'pv' ? 'selected' : ''}>❤️ Vida (PV)</option>
                    <option value="atk" ${s.statType === 'atk' ? 'selected' : ''}>⚔️ Ataque (ATK)</option>
                    <option value="turns" ${s.statType === 'turns' ? 'selected' : ''}>⏳ Turnos / Ações</option>
                    <option value="hand" ${s.statType === 'hand' ? 'selected' : ''}>🎴 Mão / Compra</option>
                  </select>
                </div>
                <div class="form-group" style="gap:4px;">
                  <label style="font-size:0.64rem;">Valor / Poder</label>
                  <input type="number" id="sk-power" class="editor-input" style="padding:8px 10px; font-size:0.8rem;" value="${s.power || 0}">
                </div>
              </div>
            </div>

            <div style="background:rgba(255,215,0,0.04); padding:12px; border-radius:12px; border:1px solid rgba(255,215,0,0.18);">
              <div style="font-size:0.66rem; font-weight:900; color:#ffd700; letter-spacing:0.8px; text-transform:uppercase; margin-bottom:6px;">🛒 Disponibilidade & Loja</div>
              <div id="availability-skill-placeholder">
                ${this.renderAvailabilityForm(s.availability || { type: 'always' })}
              </div>
            </div>
          </div>

        </div>
        ` : ''}
      </div>
    `;
  }

  public bind(container: HTMLElement) {
    const s = this.skills[this.selectedIndex];
    
    if (s && !s.availability) s.availability = { type: 'always' };

    const placeholder = container.querySelector('#availability-skill-placeholder') as HTMLElement;
    if (placeholder && s) {
      this.bindAvailabilityHandlers(s.availability, placeholder, () => {}, () => this.reRender());
    }

    container.querySelector('#btn-skill-make-shop')?.addEventListener('click', () => {
       if (s) this.syncItemWithStore('artifact', s.id);
    });

    container.querySelectorAll('[data-type="skill"]').forEach(el => {
      el.addEventListener('click', (e) => {
        this.setArtefatosSelectedIndex(parseInt((e.currentTarget as HTMLElement).dataset.idx!));
      });
    });

    container.querySelector('#btn-add-skill')?.addEventListener('click', async () => {
      this.skills.push({ id: `skill_${Date.now()}`, name: 'Nova Magia', icon: '🪄', effect: 'burn', category: 'arcane', group: 'offensive', description: '', flavorText: '', power: 100 });
      await fetch('/api/save-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.skills)
      });
      this.setArtefatosSelectedIndex(this.skills.length - 1);
    });

    container.querySelector('#btn-delete-skill')?.addEventListener('click', async () => {
      if (this.skills.length <= 1) return;
      this.skills.splice(this.selectedIndex, 1);
      await fetch('/api/save-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.skills)
      });
      this.showToast('Artefato removido!', '#ef4444');
      this.setArtefatosSelectedIndex(Math.max(0, this.selectedIndex - 1));
    });

    if (s) {
       const update = () => {
         s.name = (container.querySelector('#sk-name') as HTMLInputElement).value;
         s.logicType = (container.querySelector('#sk-logic') as HTMLSelectElement).value as any;
         s.target = (container.querySelector('#sk-target') as HTMLSelectElement).value as any;
         s.statType = (container.querySelector('#sk-stat') as HTMLSelectElement).value as any;
         s.power = parseInt((container.querySelector('#sk-power') as HTMLInputElement).value);
         s.description = (container.querySelector('#sk-desc') as HTMLTextAreaElement).value;
         s.flavorText = (container.querySelector('#sk-flavor') as HTMLTextAreaElement).value;

         if (s.logicType === 'nerf' && s.statType === 'pv') s.effect = 'burn';
         else if (s.logicType === 'buff' && s.statType === 'pv') s.effect = 'drain';
         else if (s.statType === 'turns') s.effect = 'stun';
         else if (s.statType === 'hand') s.effect = 'draw';

         this.updateListLabels(container);
       };

       ['sk-name', 'sk-logic', 'sk-target', 'sk-stat', 'sk-power', 'sk-desc', 'sk-flavor'].forEach(id => {
         container.querySelector('#' + id)?.addEventListener('input', update);
       });

       container.querySelector('#btn-pick-skill-media')?.addEventListener('click', () => {
         this.openMediaPicker(url => {
           s.image = url;
           this.reRender();
         });
       });
    }

    const saveBtn = container.querySelector('#btn-save-skills') as HTMLButtonElement;
    saveBtn?.addEventListener('click', async () => {
       saveBtn.disabled = true;
       saveBtn.textContent = 'GRAVANDO...';
       
       const res = await fetch('/api/save-skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.skills)
       });

       if (res.ok) {
          saveBtn.textContent = '✅ GRAVADO!';
          this.showToast('Artefatos persistidos no código!');
       } else {
          saveBtn.textContent = '❌ FALHA';
          this.showToast('Falha ao salvar artefatos', '#ff4444');
       }
       setTimeout(() => { saveBtn.disabled = false; saveBtn.textContent = '💾 SALVAR ARTEFATOS'; }, 2000);
    });
  }

  private updateListLabels(container: HTMLElement) {
    const listItems = container.querySelectorAll('.ars-artifact-grid .editor-list-item');
    listItems.forEach(el => {
      const idx = parseInt((el as HTMLElement).dataset.idx || '-1');
      if (idx >= 0 && this.skills[idx]) {
        const s = this.skills[idx];
        const nameEl = el.querySelector('.ars-artifact-name');
        if (nameEl) nameEl.textContent = s.name;
        
        const imgEl = el.querySelector('.ars-artifact-image') as HTMLElement;
        if (imgEl) {
           if (s.image) {
              imgEl.style.backgroundImage = `url('${s.image}')`;
              imgEl.textContent = '';
           } else {
              imgEl.style.backgroundImage = '';
              imgEl.textContent = s.icon;
           }
        }
      }
    });
  }
}
