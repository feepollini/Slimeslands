
export class TabAbilities {
  private abilities: any[];
  private selectedIndex: number;
  private reRender: () => void;
  private showToast: (msg: string, color?: string) => void;
  private renderAvailabilityForm: (av: any) => string;
  private bindAvailabilityHandlers: (av: any, container: HTMLElement, onUpdate: () => void, reRender: () => void) => void;
  private setHabilidadesSelectedIndex: (idx: number) => void;
  private syncItemWithStore: (type: string, id: string) => void;

  constructor(state: any, callbacks: any, core: any) {
    this.abilities = state.abilities;
    this.selectedIndex = state.selectedIndex;
    this.reRender = callbacks.reRender;
    this.showToast = callbacks.showToast;
    this.setHabilidadesSelectedIndex = callbacks.setHabilidadesSelectedIndex;
    this.syncItemWithStore = callbacks.syncItemWithStore;
    
    this.renderAvailabilityForm = core.renderAvailabilityForm;
    this.bindAvailabilityHandlers = core.bindAvailabilityHandlers;
  }

  public render(): string {
    const ab = this.abilities[this.selectedIndex];
    if (!ab) return 'Nenhuma habilidade selecionada.';

    return `
      <div class="editor-list-panel" style="flex:0.8; max-width:320px;">
        <div class="editor-section-title">HABILIDADES PASSIVAS (${this.abilities.length})</div>
        <div class="ars-artifact-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; padding:10px; overflow-y:auto;">
           ${this.abilities.map((a, i) => `
              <div class="editor-list-item ${i === this.selectedIndex ? 'active' : ''}" data-idx="${i}" style="border-radius:12px; height:120px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; text-align:center; padding:10px;">
                 <div class="ab-icon-circle" style="width:40px; height:40px; background:rgba(255,255,255,0.05); border:1px solid ${i === this.selectedIndex ? a.color || '#51c5ff' : 'rgba(255,255,255,0.1)'}; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                    ${a.image ? `<img src="${a.image}" style="width:24px; height:24px; object-fit:contain">` : `<span style="font-size:1rem; color:${a.color || '#fff'}">${a.icon || '✨'}</span>`}
                 </div>
                 <div style="font-size:0.75rem; font-weight:900; color:${a.color || '#fff'}">${a.name}</div>
                 <div style="font-size:0.55rem; opacity:0.6; text-transform:uppercase; letter-spacing:1px;">${a.triggerText || 'Sem Trigger'}</div>
              </div>
           `).join('')}
           <div id="btn-add-ability" class="editor-list-item" style="border:2px dashed rgba(255,255,255,0.1); background:none; height:120px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer;">
              <span style="font-size:1.5rem; opacity:0.3;">+</span>
              <span style="font-size:0.6rem; opacity:0.3; font-weight:900;">NOVA HABILIDADE</span>
           </div>
        </div>
      </div>

      <div class="editor-form-panel" style="flex:1.2; position:relative;">
        <div class="editor-section-title">DETALHES DA HABILIDADE: ${ab.name.toUpperCase()}</div>
        
        <div style="background:rgba(255,165,0,0.1); border:1px solid #ffa500; border-radius:12px; padding:15px; margin-bottom:20px;">
           <button id="btn-sync-ab-store" class="editor-btn-secondary" style="width:100%; padding:12px; background:#ffa500; color:#000; font-weight:900; border:none; border-radius:8px; cursor:pointer;">💎 TORNAR HABILIDADE ITEM DE LOJA</button>
           ${this.renderAvailabilityForm(ab.availability || { type: 'always' })}
        </div>

        <div class="form-group">
          <label>NOME DA HABILIDADE</label>
          <input type="text" id="ab-name" class="editor-input" value="${ab.name}">
        </div>

        <div class="form-row">
           <div class="form-group" style="flex:2">
              <label>ÍCONE / MÍDIA (IMPORTAR)</label>
              <div style="display:flex; gap:10px; align-items:center;">
                 <div style="width:45px; height:45px; border-radius:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center;">
                    ${ab.image ? `<img src="${ab.image}" style="width:28px; height:28px;">` : `<span style="font-size:1.2rem;">${ab.icon || '✨'}</span>`}
                 </div>
                 <button id="btn-pick-ab-icon" class="editor-btn-secondary" style="flex:1; padding:12px;">MUDAR ÍCONE</button>
              </div>
           </div>
           <div class="form-group" style="flex:1">
              <label>COR TEMÁTICA (PREVIEW)</label>
              <input type="color" id="ab-color" class="editor-input" style="height:45px; padding:2px;" value="${ab.color || '#51c5ff'}">
           </div>
        </div>

        <div style="background:rgba(0,0,0,0.3); border-radius:12px; padding:20px; border:1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column; gap:20px;">
           
           <div class="form-group">
              <label style="color:#ffa500; font-weight:900; font-size:0.65rem; letter-spacing:1px; margin-bottom:10px; display:block;">⚡ GATILHO (TRIGGER)</label>
              <select id="ab-trigger" class="editor-input">
                 <option value="on_play" ${ab.trigger === 'on_play' ? 'selected' : ''}>AO ENTRAR EM CAMPO (On Play)</option>
                 <option value="on_attack" ${ab.trigger === 'on_attack' ? 'selected' : ''}>AO ATACAR (On Attack)</option>
                 <option value="on_defend" ${ab.trigger === 'on_defend' ? 'selected' : ''}>AO DEFENDER (On Defend)</option>
                 <option value="on_death" ${ab.trigger === 'on_death' ? 'selected' : ''}>AO MORRER (On Death)</option>
                 <option value="on_turn_start" ${ab.trigger === 'on_turn_start' ? 'selected' : ''}>INÍCIO DO TURNO</option>
                 <option value="on_turn_end" ${ab.trigger === 'on_turn_end' ? 'selected' : ''}>FIM DO TURNO</option>
              </select>
           </div>

           <div class="form-row">
              <div class="form-group" style="flex:1">
                 <label style="color:#a335ee; font-weight:900; font-size:0.65rem; letter-spacing:1px; margin-bottom:10px; display:block;">🕹️ LÓGICA E ALVO</label>
                 <select id="ab-type" class="editor-input">
                    <option value="buff" ${ab.type === 'buff' ? 'selected' : ''}>📈 BUFF (Bônus)</option>
                    <option value="nerf" ${ab.type === 'nerf' ? 'selected' : ''}>📉 NERF (Penalidade)</option>
                    <option value="special" ${ab.type === 'special' ? 'selected' : ''}>✨ ESPECIAL (Lógica Custom)</option>
                 </select>
              </div>
              <div class="form-group" style="flex:1">
                 <label style="opacity:0; margin-bottom:10px; display:block;">.</label>
                 <select id="ab-target" class="editor-input">
                    <option value="self" ${ab.target === 'self' ? 'selected' : ''}>👤 PRÓPRIA CARTA</option>
                    <option value="attacker" ${ab.target === 'attacker' ? 'selected' : ''}>⚔️ ATACANTE</option>
                    <option value="defender" ${ab.target === 'defender' ? 'selected' : ''}>🛡️ DEFENSOR</option>
                    <option value="opponent_board" ${ab.target === 'opponent_board' ? 'selected' : ''}>🔥 TABULEIRO INIMIGO</option>
                    <option value="own_board" ${ab.target === 'own_board' ? 'selected' : ''}>💎 MEU TABULEIRO</option>
                    <option value="user" ${ab.target === 'user' ? 'selected' : ''}>👑 JOGADOR (USER)</option>
                    <option value="opponent" ${ab.target === 'opponent' ? 'selected' : ''}>💀 OPONENTE</option>
                 </select>
              </div>
           </div>

           <div class="form-row">
              <div class="form-group" style="flex:1.5">
                 <label style="color:#4cff88; font-weight:900; font-size:0.65rem; letter-spacing:1px; margin-bottom:10px; display:block;">💖 EFEITO E VALOR</label>
                 <select id="ab-stat" class="editor-input">
                    <option value="pv" ${ab.stat === 'pv' ? 'selected' : ''}>❤️ Vida (PV)</option>
                    <option value="atk" ${ab.stat === 'atk' ? 'selected' : ''}>⚔️ Ataque (ATK)</option>
                    <option value="stun" ${ab.stat === 'stun' ? 'selected' : ''}>🌀 Atordoar (Stun)</option>
                    <option value="flip" ${ab.stat === 'flip' ? 'selected' : ''}>♻️ Virar Card (Flip)</option>
                 </select>
              </div>
              <div class="form-group" style="flex:0.5">
                 <label style="opacity:0; margin-bottom:10px; display:block;">.</label>
                 <input type="number" id="ab-value" class="editor-input" value="${ab.value || 0}">
              </div>
           </div>

        </div>

        <div class="form-group" style="margin-top:20px;">
           <label>TEXTO DE GATILHO (POPUP)</label>
           <input type="text" id="ab-trigger-text" class="editor-input" value="${ab.triggerText || ''}" placeholder="Ex: REFLEXO!">
        </div>

        <div class="form-group">
           <label>DESCRIÇÃO (IN-GAME)</label>
           <textarea id="ab-desc" class="editor-input" rows="3" style="resize:vertical">${ab.description}</textarea>
        </div>

        <div style="margin-top:auto; padding-top:20px;">
           <button id="btn-save-abilities" class="editor-btn-primary" style="width:100%">💾 SALVAR HABILIDADES</button>
        </div>
      </div>
    `;
  }

  public bind(container: HTMLElement) {
    const ab = this.abilities[this.selectedIndex];
    if (!ab) return;

    container.querySelectorAll('.ars-artifact-grid .editor-list-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const idx = (e.currentTarget as HTMLElement).dataset.idx;
        if (idx !== undefined) {
           this.setHabilidadesSelectedIndex(parseInt(idx));
        }
      });
    });

    container.querySelector('#btn-add-ability')?.addEventListener('click', () => {
       this.abilities.push({
          id: 'ab_' + Date.now(),
          name: 'Nova Habilidade',
          description: 'Descreva o efeito aqui...',
          trigger: 'on_play',
          type: 'buff',
          target: 'self',
          stat: 'pv',
          value: 10,
          triggerText: 'ATIVOU!',
          color: '#51c5ff',
          availability: { type: 'always' }
       });
       this.setHabilidadesSelectedIndex(this.abilities.length - 1);
    });

    const update = () => {
       ab.name = (container.querySelector('#ab-name') as HTMLInputElement).value;
       ab.description = (container.querySelector('#ab-desc') as HTMLTextAreaElement).value;
       ab.trigger = (container.querySelector('#ab-trigger') as HTMLSelectElement).value;
       ab.type = (container.querySelector('#ab-type') as HTMLSelectElement).value;
       ab.target = (container.querySelector('#ab-target') as HTMLSelectElement).value;
       ab.stat = (container.querySelector('#ab-stat') as HTMLSelectElement).value;
       ab.value = parseInt((container.querySelector('#ab-value') as HTMLInputElement).value);
       ab.triggerText = (container.querySelector('#ab-trigger-text') as HTMLInputElement).value;
       ab.color = (container.querySelector('#ab-color') as HTMLInputElement).value;

       this.updateListLabels(container);
    };

    ['ab-name', 'ab-desc', 'ab-trigger', 'ab-type', 'ab-target', 'ab-stat', 'ab-value', 'ab-trigger-text', 'ab-color'].forEach(id => {
       container.querySelector('#' + id)?.addEventListener('input', update);
    });

    container.querySelector('#btn-sync-ab-store')?.addEventListener('click', () => {
       this.syncItemWithStore('ability', ab.id);
    });

    const avContainer = container.querySelector('.availability-form') as HTMLElement;
    if (avContainer && ab.availability) {
       this.bindAvailabilityHandlers(ab.availability, avContainer, () => {}, () => this.reRender());
    }

    container.querySelector('#btn-save-abilities')?.addEventListener('click', async () => {
       const btn = container.querySelector('#btn-save-abilities') as HTMLButtonElement;
       btn.disabled = true;
       btn.textContent = 'GRAVANDO...';
       
       const res = await fetch('/api/save-abilities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.abilities)
       });

       if (res.ok) {
          btn.textContent = '✅ GRAVADO!';
          this.showToast('Habilidades persistidas no código!');
       }
       setTimeout(() => { btn.disabled = false; btn.textContent = '💾 SALVAR HABILIDADES'; }, 2000);
    });
  }

  private updateListLabels(container: HTMLElement) {
     const listItems = container.querySelectorAll('.ars-artifact-grid .editor-list-item');
     listItems.forEach(el => {
        const idx = parseInt((el as HTMLElement).dataset.idx || '-1');
        if (idx >= 0 && this.abilities[idx]) {
           const ab = this.abilities[idx];
           const nameEl = el.querySelector('div:last-child');
           if (nameEl) nameEl.textContent = ab.name;
           
           const iconCircle = el.querySelector('.ab-icon-circle') as HTMLElement;
           if (iconCircle) {
              iconCircle.style.borderColor = idx === this.selectedIndex ? ab.color || '#51c5ff' : 'rgba(255,255,255,0.1)';
              const iconSpan = iconCircle.querySelector('span');
              if (iconSpan) iconSpan.style.color = ab.color || '#fff';
           }
        }
     });
  }
}
