
export class TabAbilities {
  private abilities: any[];
  private selectedIndex: number;
  private reRender: () => void;
  private showToast: (msg: string, color?: string) => void;
  private renderAvailabilityForm: (av: any) => string;
  private bindAvailabilityHandlers: (av: any, container: HTMLElement, onUpdate: () => void, reRender: () => void) => void;
  private setHabilidadesSelectedIndex: (idx: number) => void;
  private syncItemWithStore: (type: string, id: string) => void;
  private openMediaPicker: (onSelect: (url: string) => void) => void;

  constructor(state: any, callbacks: any, core: any) {
    this.abilities = state.abilities;
    this.selectedIndex = state.selectedIndex;
    this.reRender = callbacks.reRender;
    this.showToast = callbacks.showToast;
    this.setHabilidadesSelectedIndex = callbacks.setHabilidadesSelectedIndex;
    this.syncItemWithStore = callbacks.syncItemWithStore;
    this.openMediaPicker = callbacks.openMediaPicker;
    
    this.renderAvailabilityForm = core.renderAvailabilityForm;
    this.bindAvailabilityHandlers = core.bindAvailabilityHandlers;
  }

  public render(): string {
    const ab = this.abilities[this.selectedIndex];
    if (!ab) return '<div style="padding:24px; color:#94a3b8;">Nenhuma habilidade selecionada.</div>';

    return `
      <div class="editor-list-panel" style="width:280px; flex-shrink:0; height:100%; display:flex; flex-direction:column; overflow:hidden; background:#11131c; border-right:1px solid rgba(255,255,255,0.08);">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.08); flex-shrink:0;">
          <span style="font-size:0.68rem; font-weight:900; color:#f59e0b; letter-spacing:0.8px;">✨ PASSIVAS (${this.abilities.length})</span>
          <button type="button" id="btn-add-ability" style="background:linear-gradient(135deg, #f59e0b, #d97706); color:#000; border:none; border-radius:6px; padding:4px 10px; font-size:0.64rem; font-weight:900; cursor:pointer;">+ NOVA</button>
        </div>

        <div class="ars-artifact-grid" style="flex:1; display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:10px; overflow-y:auto; align-content:start; margin:0;">
          ${this.abilities.map((a, i) => `
            <div class="editor-list-item ${i === this.selectedIndex ? 'active' : ''}" data-idx="${i}" style="border-radius:10px; min-height:88px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px; text-align:center; padding:8px; background:${i === this.selectedIndex ? 'rgba(245,158,11,0.14)' : '#181b26'}; border:1.5px solid ${i === this.selectedIndex ? '#f59e0b' : 'rgba(255,255,255,0.07)'};">
              <div class="ab-icon-circle" style="width:34px; height:34px; background:rgba(255,255,255,0.05); border:1px solid ${i === this.selectedIndex ? a.color || '#f59e0b' : 'rgba(255,255,255,0.12)'}; border-radius:50%; display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;">
                ${a.image ? `<img src="${a.image}" style="width:24px; height:24px; object-fit:contain">` : `<span style="font-size:0.95rem; color:${a.color || '#fff'}">${a.icon || '✨'}</span>`}
              </div>
              <div class="ab-item-title" style="font-size:0.66rem; font-weight:800; color:${a.color || '#fff'}; line-height:1.15; word-break:break-word;">${a.name}</div>
              <div style="font-size:0.52rem; color:#94a3b8; text-transform:uppercase;">${a.triggerText || 'Passiva'}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="editor-form-panel" style="flex:1; height:100%; overflow-y:auto; padding:14px 20px; display:flex; flex-direction:column; gap:12px; box-sizing:border-box;">
        <!-- TOP HEADER BAR -->
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.08); flex-shrink:0; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px; height:36px; border-radius:8px; background:rgba(245,158,11,0.14); border:1px solid rgba(245,158,11,0.4); display:flex; align-items:center; justify-content:center;">
              ${ab.image ? `<img src="${ab.image}" style="width:24px; height:24px; object-fit:contain;">` : `<span style="font-size:1.1rem;">${ab.icon || '✨'}</span>`}
            </div>
            <div>
              <div style="font-size:0.92rem; font-weight:900; color:#fff; letter-spacing:0.5px;">${ab.name.toUpperCase()}</div>
              <div style="font-size:0.62rem; color:#94a3b8;">ID: ${ab.id}</div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" id="btn-sync-ab-store" style="background:rgba(245,158,11,0.16); border:1px solid #f59e0b; color:#fbbf24; border-radius:7px; padding:6px 12px; font-size:0.68rem; font-weight:900; cursor:pointer;">
              💎 Sincronizar c/ Loja
            </button>
            ${this.abilities.length > 1 ? `<button type="button" id="btn-delete-ability" style="background:rgba(239,68,68,0.15); border:1px solid #ef4444; color:#f87171; border-radius:7px; padding:6px 12px; font-size:0.68rem; font-weight:900; cursor:pointer;">🗑️ Excluir</button>` : ''}
            <button type="button" id="btn-save-abilities" class="editor-btn-primary" style="padding:7px 16px; font-size:0.72rem; border-radius:7px;">💾 SALVAR PASSIVAS</button>
          </div>
        </div>

        <!-- 2-COLUMN ORGANIZED GRID -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(310px, 1fr)); gap:14px; align-items:start;">
          
          <!-- COLUNA 1: IDENTIDADE, ÍCONE & TEXTOS -->
          <div style="background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:12px;">
            <div style="font-size:0.68rem; font-weight:900; color:#38bdf8; letter-spacing:0.8px; text-transform:uppercase;">🎨 Identidade & Aparência</div>

            <div style="display:grid; grid-template-columns:1fr 90px; gap:10px; align-items:end;">
              <div class="form-group" style="gap:4px;">
                <label style="font-size:0.64rem;">Nome da Habilidade</label>
                <input type="text" id="ab-name" class="editor-input" style="padding:8px 10px; font-size:0.82rem;" value="${ab.name}">
              </div>
              <div class="form-group" style="gap:4px;">
                <label style="font-size:0.64rem;">Cor</label>
                <input type="color" id="ab-color" class="editor-input" style="height:36px; padding:2px; width:100%;" value="${ab.color || '#51c5ff'}">
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; align-items:end;">
              <div class="form-group" style="gap:4px;">
                <label style="font-size:0.64rem;">Ícone / Mídia</label>
                <div style="display:flex; gap:8px; align-items:center;">
                  <div style="width:36px; height:36px; border-radius:7px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;">
                    ${ab.image ? `<img src="${ab.image}" style="width:26px; height:26px; object-fit:contain;">` : `<span style="font-size:1rem;">${ab.icon || '✨'}</span>`}
                  </div>
                  <button type="button" id="btn-pick-ab-icon" class="editor-btn-secondary" style="flex:1; padding:8px 10px; font-size:0.68rem; color:#e2e8f0; border-color:rgba(255,255,255,0.2);">🖼️ Galeria</button>
                </div>
              </div>

              <div class="form-group" style="gap:4px;">
                <label style="font-size:0.64rem;">Texto de Popup (Gatilho)</label>
                <input type="text" id="ab-trigger-text" class="editor-input" style="padding:8px 10px; font-size:0.8rem;" value="${ab.triggerText || ''}" placeholder="Ex: REFLEXO!">
              </div>
            </div>

            <div class="form-group" style="gap:4px;">
              <label style="font-size:0.64rem;">Descrição (In-Game)</label>
              <textarea id="ab-desc" class="editor-input" rows="3" style="resize:vertical; padding:8px 10px; font-size:0.8rem;">${ab.description}</textarea>
            </div>
          </div>

          <!-- COLUNA 2: LÓGICA DE COMBATE & DISPONIBILIDADE -->
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:10px;">
              <div style="font-size:0.68rem; font-weight:900; color:#f59e0b; letter-spacing:0.8px; text-transform:uppercase;">⚡ Mecânica & Gatilho</div>

              <div class="form-group" style="gap:4px;">
                <label style="font-size:0.64rem;">Gatilho (Trigger)</label>
                <select id="ab-trigger" class="editor-input" style="padding:8px 10px; font-size:0.78rem;">
                  <option value="on_play" ${ab.trigger === 'on_play' ? 'selected' : ''}>AO ENTRAR EM CAMPO (On Play)</option>
                  <option value="on_attack" ${ab.trigger === 'on_attack' ? 'selected' : ''}>AO ATACAR (On Attack)</option>
                  <option value="on_defend" ${ab.trigger === 'on_defend' ? 'selected' : ''}>AO DEFENDER (On Defend)</option>
                  <option value="on_death" ${ab.trigger === 'on_death' ? 'selected' : ''}>AO MORRER (On Death)</option>
                  <option value="on_turn_start" ${ab.trigger === 'on_turn_start' ? 'selected' : ''}>INÍCIO DO TURNO</option>
                  <option value="on_turn_end" ${ab.trigger === 'on_turn_end' ? 'selected' : ''}>FIM DO TURNO</option>
                </select>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div class="form-group" style="gap:4px;">
                  <label style="font-size:0.64rem;">Lógica</label>
                  <select id="ab-type" class="editor-input" style="padding:8px 10px; font-size:0.78rem;">
                    <option value="buff" ${ab.type === 'buff' ? 'selected' : ''}>📈 BUFF (Bônus)</option>
                    <option value="nerf" ${ab.type === 'nerf' ? 'selected' : ''}>📉 NERF (Penalidade)</option>
                    <option value="special" ${ab.type === 'special' ? 'selected' : ''}>✨ ESPECIAL</option>
                  </select>
                </div>

                <div class="form-group" style="gap:4px;">
                  <label style="font-size:0.64rem;">Alvo</label>
                  <select id="ab-target" class="editor-input" style="padding:8px 10px; font-size:0.78rem;">
                    <option value="self" ${ab.target === 'self' ? 'selected' : ''}>👤 Própria Carta</option>
                    <option value="attacker" ${ab.target === 'attacker' ? 'selected' : ''}>⚔️ Atacante</option>
                    <option value="defender" ${ab.target === 'defender' ? 'selected' : ''}>🛡️ Defensor</option>
                    <option value="opponent_board" ${ab.target === 'opponent_board' ? 'selected' : ''}>🔥 Tabuleiro Inimigo</option>
                    <option value="own_board" ${ab.target === 'own_board' ? 'selected' : ''}>💎 Meu Tabuleiro</option>
                    <option value="user" ${ab.target === 'user' ? 'selected' : ''}>👑 Jogador</option>
                    <option value="opponent" ${ab.target === 'opponent' ? 'selected' : ''}>💀 Oponente</option>
                  </select>
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 110px; gap:10px;">
                <div class="form-group" style="gap:4px;">
                  <label style="font-size:0.64rem;">Atributo / Efeito</label>
                  <select id="ab-stat" class="editor-input" style="padding:8px 10px; font-size:0.78rem;">
                    <option value="pv" ${ab.stat === 'pv' ? 'selected' : ''}>❤️ Vida (PV)</option>
                    <option value="atk" ${ab.stat === 'atk' ? 'selected' : ''}>⚔️ Ataque (ATK)</option>
                    <option value="stun" ${ab.stat === 'stun' ? 'selected' : ''}>🌀 Atordoar (Stun)</option>
                    <option value="flip" ${ab.stat === 'flip' ? 'selected' : ''}>♻️ Virar Card (Flip)</option>
                  </select>
                </div>
                <div class="form-group" style="gap:4px;">
                  <label style="font-size:0.64rem;">Valor</label>
                  <input type="number" id="ab-value" class="editor-input" style="padding:8px 10px; font-size:0.8rem;" value="${ab.value || 0}">
                </div>
              </div>
            </div>

            <div style="background:rgba(255,215,0,0.04); border:1px solid rgba(255,215,0,0.18); border-radius:12px; padding:12px;">
              <div style="font-size:0.66rem; font-weight:900; color:#ffd700; letter-spacing:0.8px; text-transform:uppercase; margin-bottom:6px;">🛒 Disponibilidade & Loja</div>
              ${this.renderAvailabilityForm(ab.availability || { type: 'always' })}
            </div>
          </div>

        </div>
      </div>
    `;
  }

  public bind(container: HTMLElement) {
    const ab = this.abilities[this.selectedIndex];
    if (!ab) return;

    container.querySelectorAll('.ars-artifact-grid .editor-list-item[data-idx]').forEach(el => {
      el.addEventListener('click', (e) => {
        const idx = (e.currentTarget as HTMLElement).dataset.idx;
        if (idx !== undefined) {
           this.setHabilidadesSelectedIndex(parseInt(idx));
        }
      });
    });

    container.querySelector('#btn-add-ability')?.addEventListener('click', async () => {
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
       await fetch('/api/save-abilities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.abilities)
       });
       this.setHabilidadesSelectedIndex(this.abilities.length - 1);
    });

    container.querySelector('#btn-delete-ability')?.addEventListener('click', async () => {
       if (this.abilities.length <= 1) return;
       this.abilities.splice(this.selectedIndex, 1);
       await fetch('/api/save-abilities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.abilities)
       });
       this.showToast('Passiva removida!', '#ef4444');
       this.setHabilidadesSelectedIndex(Math.max(0, this.selectedIndex - 1));
    });

    container.querySelector('#btn-pick-ab-icon')?.addEventListener('click', () => {
       if (this.openMediaPicker) {
          this.openMediaPicker((url) => {
             ab.image = url;
             this.reRender();
          });
       }
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
           const nameEl = el.querySelector('.ab-item-title');
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
