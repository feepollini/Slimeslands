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
      <div class="editor-list-panel" style="flex:0.8; max-width:320px;">
        <div class="editor-section-title">ARTEFATOS / MAGIAS (${this.skills.length})</div>
        <div class="editor-card-list">
          <div class="ars-artifact-grid" style="padding:10px; overflow-y:auto; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            ${this.skills.map((skill, i) => `
              <div class="editor-list-item ars-artifact-item ${i === this.selectedIndex ? 'active' : ''}" data-type="skill" data-idx="${i}" style="border-radius:12px; height:120px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; text-align:center; padding:10px;">
                 <div class="ars-artifact-image" style="width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.05); border:1px solid ${i === this.selectedIndex ? '#51c5ff' : 'rgba(255,255,255,0.1)'}; ${skill.image ? `background-image:url('${skill.image}'); background-size:contain; background-repeat:no-repeat; background-position:center;` : ''}">${skill.image ? '' : skill.icon}</div>
                 <div class="ars-artifact-content" style="display:flex; flex-direction:column; align-items:center;">
                   <div class="ars-artifact-name" style="font-size:0.75rem; font-weight:900;">${skill.name}</div>
                   ${skill.availability?.type === 'store' ? '<span class="shop-badge" style="font-size:0.5rem; background:rgba(255,215,0,0.2); color:#ffd700; padding:2px 4px; border-radius:4px; margin-top:4px;">🛒 LOJA</span>' : ''}
                 </div>
              </div>
            `).join('')}
             <div id="btn-add-skill" class="editor-list-item" style="border:2px dashed rgba(255,255,255,0.1); background:none; height:120px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer;">
                <span style="font-size:1.5rem; opacity:0.3;">+</span>
                <span style="font-size:0.6rem; opacity:0.3; font-weight:900;">NOVO ARTEFATO</span>
             </div>
          </div>
        </div>
      </div>

      <div class="editor-form-panel" style="flex:1.2; position:relative;">
         <div class="editor-section-title">DETALHES DO ARTEFATO: ${s?.name || 'NADA'}</div>
         
         <div style="background:rgba(255,215,0,0.05); padding:15px; border-radius:12px; border:1px solid rgba(255,215,0,0.2); margin-bottom:15px;">
            <button id="btn-skill-make-shop" class="editor-btn-secondary" style="width:100%; margin-bottom:10px; background:#ffa500; color:#000; font-weight:900; border:none; padding:12px; border-radius:8px;">💎 TORNAR ARTEFATO ITEM DE LOJA</button>
            <div id="availability-skill-placeholder">
               ${s ? this.renderAvailabilityForm(s.availability || { type: 'always' }) : ''}
            </div>
         </div>

         ${s ? `
         <div id="logic-editor-content">
            <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:12px; border:1px solid rgba(255,255,255,0.1)">
              <div class="form-group">
                <label>Nome da Arte / Magia</label>
                <input type="text" id="sk-name" class="editor-input" value="${s.name}">
              </div>
              <div class="form-row">
                <div class="form-group" style="flex:1">
                  <label>Ícone / Mídia (Importar)</label>
                  <div style="display:flex; gap:10px; align-items:center;">
                     <div id="sk-media-preview" style="width:60px; height:60px; background:rgba(255,255,255,0.05); border-radius:10px; border:1px solid #444; display:flex; align-items:center; justify-content:center; overflow:hidden; font-size:1.5rem;">
                        ${s.image ? `<div style="width:100%; height:100%; background:url('${s.image}') center/cover no-repeat"></div>` : s.icon}
                     </div>
                     <button id="btn-pick-skill-media" class="editor-btn-secondary" style="height:60px; flex:1">MUDAR ÍCONE</button>
                  </div>
                </div>
              </div>
              <div class="form-group" style="margin-top:10px;">
                  <label>ID (Sistema)</label>
                  <input type="text" id="sk-id" class="editor-input" value="${s.id}" readonly>
              </div>

              <div style="margin:20px 0; padding:15px; background:rgba(0,0,0,0.2); border-radius:10px; border-left:4px solid #51c5ff;">
                 <label style="color:#51c5ff; font-weight:bold; margin-bottom:10px; display:block;">⚙️ COMPORTAMENTO (BUFF/NERF)</label>
                 
                 <div class="form-row">
                    <div class="form-group" style="flex:1">
                      <label>Tipo de Lógica</label>
                      <select id="sk-logic" class="editor-input">
                         <option value="buff" ${s.logicType === 'buff' ? 'selected' : ''}>📈 BUFF (Aumento/Positivo)</option>
                         <option value="nerf" ${s.logicType === 'nerf' ? 'selected' : ''}>📉 NERF (Redução/Negativo)</option>
                      </select>
                    </div>
                    <div class="form-group" style="flex:1">
                      <label>Alvo</label>
                      <select id="sk-target" class="editor-input">
                         <option value="user" ${s.target === 'user' ? 'selected' : ''}>👤 VOCÊ (Aliado)</option>
                         <option value="opponent" ${s.target === 'opponent' ? 'selected' : ''}>👹 OPONENTE (Inimigo)</option>
                      </select>
                    </div>
                 </div>

                 <div class="form-row" style="margin-top:10px;">
                    <div class="form-group" style="flex:1">
                      <label>Atributo Afetado</label>
                      <select id="sk-stat" class="editor-input">
                         <option value="pv" ${s.statType === 'pv' ? 'selected' : ''}>❤️ Vida (PV)</option>
                         <option value="atk" ${s.statType === 'atk' ? 'selected' : ''}>⚔️ Ataque (ATK)</option>
                         <option value="turns" ${s.statType === 'turns' ? 'selected' : ''}>⏳ Turnos / Ações</option>
                         <option value="hand" ${s.statType === 'hand' ? 'selected' : ''}>🎴 Mão / Compra</option>
                      </select>
                    </div>
                    <div class="form-group" style="flex:1">
                      <label>Valor / Poder</label>
                      <input type="number" id="sk-power" class="editor-input" value="${s.power || 0}">
                    </div>
                 </div>
              </div>

              <div class="form-group">
                <label>Descrição (In-Game)</label>
                <textarea id="sk-desc" class="editor-input" rows="2" style="font-size:0.8rem">${s.description}</textarea>
              </div>
              <div class="form-group">
                <label>Lore / Flavor Text</label>
                <textarea id="sk-flavor" class="editor-input" rows="2" style="font-size:0.8rem; color:#888;">${s.flavorText}</textarea>
              </div>
            </div>
         </div>
         ` : ''}

         <div style="margin-top:auto; padding-top:20px;">
            <button id="btn-save-skills" class="editor-btn-primary" style="width:100%">💾 SALVAR ARTEFATOS</button>
         </div>
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

    container.querySelector('#btn-add-skill')?.addEventListener('click', () => {
      this.skills.push({ id: `skill_${Date.now()}`, name: 'Nova Magia', icon: '🪄', effect: 'burn', category: 'arcane', group: 'offensive', description: '', flavorText: '', power: 100 });
      this.setArtefatosSelectedIndex(this.skills.length - 1);
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
