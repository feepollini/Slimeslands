export class TabConfig {
  private rarities: any;
  private showToast: (msg: string, color?: string) => void;
  private saveJson: (endpoint: string, data: any) => Promise<boolean>;

  constructor(state: any, callbacks: any, core: any) {
    this.rarities = state.rarities;
    this.showToast = callbacks.showToast;
    this.saveJson = core.saveJson.bind(core);
  }

  public render(): string {
    const defaultRarities = {
      common: { name: 'Comum', dropRate: 60, price: 100, color: '#ffffff' },
      rare: { name: 'Raro', dropRate: 25, price: 500, color: '#51c5ff' },
      epic: { name: 'Épico', dropRate: 10, price: 2000, color: '#a335ee' },
      legendary: { name: 'Lendário', dropRate: 5, price: 10000, color: '#ffd700' }
    };
    
    const rData = Object.keys(this.rarities || {}).length > 0 ? this.rarities : defaultRarities;

    return `
      <div class="editor-form-panel" style="flex:1; max-width:800px; margin:0 auto; background:rgba(20,20,30,0.6); backdrop-filter:blur(20px); border-radius:15px; border:1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column; gap:20px;">
         <div class="editor-section-title" style="border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:15px;">⚙️ CONFIGURAÇÕES GERAIS DA ECONOMIA</div>
         
         <div style="background:rgba(255,215,0,0.05); padding:20px; border-radius:12px; border:1px solid rgba(255,215,0,0.2);">
            <div style="color:#ffd700; font-weight:900; margin-bottom:15px; font-size:0.85rem; letter-spacing:1px;">💎 CHANCES DE DROP E PREÇOS (RARIDADES)</div>
            
            <div style="display:flex; flex-direction:column; gap:15px;">
               ${Object.entries(rData).map(([key, val]: [string, any]) => `
                 <div class="rarity-entry" data-key="${key}" style="display:flex; gap:15px; align-items:center; background:rgba(0,0,0,0.3); padding:10px 15px; border-radius:10px; border-left:4px solid ${val.color};">
                    <div style="width:100px; font-weight:900; color:${val.color}; text-transform:uppercase;">${val.name}</div>
                    
                    <div style="flex:1; display:flex; flex-direction:column; gap:5px;">
                       <label style="font-size:0.6rem; opacity:0.6;">DROP RATE (%)</label>
                       <input type="number" class="editor-input r-drop" value="${val.dropRate}" max="100" min="0">
                    </div>
                    
                    <div style="flex:1; display:flex; flex-direction:column; gap:5px;">
                       <label style="font-size:0.6rem; opacity:0.6;">CUSTO PADRÃO</label>
                       <input type="number" class="editor-input r-price" value="${val.price}">
                    </div>

                    <div style="width:60px; display:flex; flex-direction:column; gap:5px;">
                       <label style="font-size:0.6rem; opacity:0.6;">COR</label>
                       <input type="color" class="editor-input r-color" value="${val.color}" style="height:35px; padding:0;">
                    </div>
                 </div>
               `).join('')}
            </div>
            
            <div id="drop-total-warning" style="margin-top:15px; font-size:0.75rem; font-weight:900; text-align:right;"></div>
         </div>

         <div style="margin-top:auto; padding-top:20px;">
            <button id="btn-save-config" class="editor-btn-primary" style="width:100%; height:50px; font-size:1.1rem; border-radius:12px;">💾 GRAVAR REGRAS NO CÓDIGO</button>
         </div>
      </div>
    `;
  }

  public bind(container: HTMLElement) {
    const rData = this.rarities;

    const updateTotal = () => {
       let total = 0;
       container.querySelectorAll('.rarity-entry').forEach(entry => {
          const drop = parseFloat((entry.querySelector('.r-drop') as HTMLInputElement).value) || 0;
          total += drop;
       });
       const w = container.querySelector('#drop-total-warning');
       if (w) {
          w.textContent = `TOTAL DE DROP: ${total}%`;
          w.setAttribute('style', `margin-top:15px; font-size:0.75rem; font-weight:900; text-align:right; color:${total === 100 ? '#4cff88' : '#ff4444'}`);
       }
    };

    container.querySelectorAll('.rarity-entry').forEach(entry => {
      ['.r-drop', '.r-price', '.r-color'].forEach(sel => {
         entry.querySelector(sel)?.addEventListener('input', () => {
             const key = entry.getAttribute('data-key');
             if (key && rData[key]) {
                  rData[key].dropRate = parseFloat((entry.querySelector('.r-drop') as HTMLInputElement).value) || 0;
                  rData[key].price = parseInt((entry.querySelector('.r-price') as HTMLInputElement).value) || 0;
                  rData[key].color = (entry.querySelector('.r-color') as HTMLInputElement).value;
             }
             if (sel === '.r-drop') updateTotal();
         });
      });
    });

    updateTotal();

    const saveBtn = container.querySelector('#btn-save-config') as HTMLButtonElement;
    saveBtn?.addEventListener('click', async () => {
       saveBtn.disabled = true;
       saveBtn.textContent = 'GRAVANDO...';
       const ok = await this.saveJson('/api/save-config', rData);
       if (ok) {
           saveBtn.textContent = '✅ GRAVADO!';
           this.showToast('Configurações Globais alteradas com sucesso.');
       } else {
           saveBtn.textContent = '❌ FALHA';
           this.showToast('Erro ao salvar localmente.', '#ff4444');
       }
       setTimeout(() => { saveBtn.disabled = false; saveBtn.textContent = '💾 GRAVAR REGRAS NO CÓDIGO'; }, 2000);
    });
  }
}
