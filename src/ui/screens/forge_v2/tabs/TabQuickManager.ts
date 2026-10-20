import { randomizeCard } from '../utils/CardGenerator';

export class TabQuickManager {
  private templates: any[];
  private abilities: any[];
  private classes: any[];
  private selectedIds: Set<number>;
  private filter: { class: string, rarity: string, search: string };
  private saveTemplates: () => void;
  private saveClasses: () => void;
  private showToast: (msg: string, color?: string) => void;
  private reRender: () => void;

  constructor(state: any, callbacks: any) {
    this.templates = state.templates;
    this.abilities = state.abilities || [];
    this.classes = state.classes || [];
    this.selectedIds = state.selectedIds;
    this.filter = state.filter;
    this.saveTemplates = callbacks.saveTemplates;
    this.saveClasses = callbacks.saveClasses;
    this.showToast = callbacks.showToast;
    this.reRender = callbacks.reRender;
  }

  public render(): string {
    // Apply filtering
    let filtered = this.templates.map((t, i) => ({ t, i }));

    if (this.filter.search) {
      const q = this.filter.search.toLowerCase();
      filtered = filtered.filter(item => item.t.name.toLowerCase().includes(q));
    }
    if (this.filter.class) {
      filtered = filtered.filter(item => item.t.classId === this.filter.class);
    }
    if (this.filter.rarity) {
      filtered = filtered.filter(item => item.t.preferredRarity === this.filter.rarity);
    }

    return `
      <div class="class-manager-container" style="display:flex; flex-direction:column; gap:15px; height:100%;">
        
        <!-- BULK RANDOM BAR -->
        <div class="bulk-random-bar" style="background:linear-gradient(90deg, rgba(255,215,0,0.1), rgba(81,197,255,0.1)); padding:12px; border-radius:12px; border:1px solid rgba(255,215,0,0.2); display:flex; gap:10px; align-items:center;">
          <div style="flex:1;">
            <span style="font-weight:900; color:#ffd700; font-size:0.75rem; letter-spacing:1px;">🎲 GERAR RANDOM EM MASSA</span>
            <div style="font-size:0.55rem; opacity:0.6; margin-top:2px;">Aplica atributos, classe e passivas aleatórias aos selecionados</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn-bulk-gen" data-rar="common" style="background:rgba(255,255,255,0.1); border:1px solid #fff; color:#fff; font-size:0.6rem; padding:6px 10px; border-radius:6px; cursor:pointer; font-weight:900;">COMUM</button>
            <button class="btn-bulk-gen" data-rar="rare" style="background:rgba(81,197,255,0.1); border:1px solid #51c5ff; color:#51c5ff; font-size:0.6rem; padding:6px 10px; border-radius:6px; cursor:pointer; font-weight:900;">RARA</button>
            <button class="btn-bulk-gen" data-rar="epic" style="background:rgba(163,53,238,0.1); border:1px solid #a335ee; color:#a335ee; font-size:0.6rem; padding:6px 10px; border-radius:6px; cursor:pointer; font-weight:900;">ÉPICA</button>
            <button class="btn-bulk-gen" data-rar="legendary" style="background:rgba(255,165,0,0.1); border:1px solid #ffa500; color:#ffa500; font-size:0.6rem; padding:6px 10px; border-radius:6px; cursor:pointer; font-weight:900;">LENDÁRIA</button>
          </div>
        </div>

        <!-- IMPORT & BULK CREATE BAR -->
        <div style="background:linear-gradient(90deg, rgba(81,197,255,0.1), rgba(76,255,136,0.1)); padding:12px; border-radius:12px; border:1px solid rgba(81,197,255,0.25); display:flex; gap:10px; align-items:center;">
          <div style="flex:1;">
            <span style="font-weight:900; color:#51c5ff; font-size:0.75rem; letter-spacing:1px;">🎴 CRIAR CARTAS INSTANTÂNEAS</span>
            <div style="font-size:0.55rem; opacity:0.6; margin-top:2px;">Importe imagens do PC para virarem cartas prontas na hora!</div>
          </div>
          <button id="btn-quick-import" class="editor-btn-secondary" style="font-size:0.65rem; padding:8px 14px; border-color:#51c5ff; color:#51c5ff; font-weight:900;">🎴 CRIAR CARTA COM IMAGEM</button>
          <input type="file" id="inp-quick-import" multiple accept="image/*,video/*,.mp4,.webm,.mov,.m4v,.ogv" style="display:none">
          <button id="btn-bulk-create" class="editor-btn-secondary" style="font-size:0.65rem; padding:8px 14px; border-color:#4cff88; color:#4cff88; font-weight:900;">＋ DA GALERIA EM MASSA</button>
        </div>

        <!-- FILTERS BAR -->
        <div class="filters-bar" style="background:rgba(255,255,255,0.03); padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.05); display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <div style="flex:1; min-width:150px; position:relative;">
            <input type="text" id="quick-search" class="editor-input" placeholder="🔍 Buscar carta..." value="${this.filter.search}" style="padding-left:30px; font-size:0.7rem;">
          </div>
          <select id="filter-class" class="editor-input" style="width:120px; font-size:0.7rem;">
            <option value="">Todas Classes</option>
            ${this.classes.map(c => `<option value="${c.id}" ${this.filter.class === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
          </select>
          <select id="filter-rarity" class="editor-input" style="width:120px; font-size:0.7rem;">
            <option value="">Todas Raridades</option>
            <option value="common" ${this.filter.rarity === 'common' ? 'selected' : ''}>⬜ Comum</option>
            <option value="rare" ${this.filter.rarity === 'rare' ? 'selected' : ''}>🔷 Rara</option>
            <option value="epic" ${this.filter.rarity === 'epic' ? 'selected' : ''}>🔮 Épica</option>
            <option value="legendary" ${this.filter.rarity === 'legendary' ? 'selected' : ''}>⭐ Lendária</option>
          </select>
          <button id="btn-clear-filters" class="editor-btn-secondary" style="padding:4px 8px; font-size:0.6rem; opacity:0.6;">LIMPAR</button>
        </div>

        <!-- ACTIONS BAR -->
        <div class="class-actions-bar" style="background:rgba(81,197,255,0.05); padding:12px; border-radius:12px; border:1px solid rgba(81,197,255,0.1); display:flex; flex-wrap:wrap; gap:10px; align-items:center;">
          <div style="flex:1; min-width:150px;">
            <span style="font-weight:900; color:#51c5ff; font-size:0.75rem;">AÇÕES EM MASSA</span>
            <div style="font-size:0.6rem; opacity:0.6;">${this.selectedIds.size} selecionadas de ${filtered.length} filtradas</div>
          </div>

          <div style="display:flex; gap:6px;">
            <select id="bulk-class-select" class="editor-input" style="width:130px; font-size:0.65rem;">
              <option value="">Classe...</option>
              ${this.classes.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
            </select>
            <button id="btn-bulk-move" class="editor-btn-secondary" style="font-size:0.6rem; padding:6px 10px;">APLICAR</button>
          </div>

          <div style="display:flex; gap:6px;">
            <select id="bulk-rarity-select" class="editor-input" style="width:130px; font-size:0.65rem;">
              <option value="">Raridade...</option>
              <option value="common">⬜ Comum</option>
              <option value="rare">🔷 Rara</option>
              <option value="epic">🔮 Épica</option>
              <option value="legendary">⭐ Lendária</option>
              <option value="random">🎲 ALEATÓRIO</option>
            </select>
            <button id="btn-bulk-rarity" class="editor-btn-secondary" style="font-size:0.6rem; padding:6px 10px; border-color:#ffd700; color:#ffd700;">APLICAR</button>
          </div>

          <button id="btn-select-all" class="editor-btn-secondary" style="font-size:0.6rem; padding:6px 10px;">${this.selectedIds.size === filtered.length && filtered.length > 0 ? 'DESELEC.' : 'SELEC. TUDO'}</button>
        </div>

        <!-- GRID -->
        <div class="class-card-grid" style="flex:1; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:15px; padding-right:5px;">
          ${filtered.map(({ t, i }) => {
            const isSel = this.selectedIds.has(i);
            const cls = this.classes.find(c => c.id === t.classId);
            return `
              <div class="class-grid-item ${isSel ? 'selected' : ''}" data-idx="${i}" style="position:relative; background:rgba(0,0,0,0.6); border-radius:12px; border:2px solid ${isSel ? '#51c5ff' : 'rgba(255,255,255,0.05)'}; padding:6px; cursor:pointer; transition:0.2s; display:flex; flex-direction:column; align-items:center;">
                <input type="checkbox" style="position:absolute; top:6px; left:6px; z-index:10; transform:scale(1.1); pointer-events:none;" ${isSel ? 'checked' : ''}>
                <div style="width:100%; aspect-ratio:3.5/5; border-radius:8px; margin-bottom:6px; overflow:hidden; background:#0b0b10; display:flex; align-items:center; justify-content:center;">
                  ${t.animationUrl ? `
                    <video src="${t.animationUrl}" muted autoplay loop playsinline style="width:100%; height:100%; object-fit:cover; pointer-events:none;"></video>
                  ` : `
                    <img src="${t.image || '/cards/01.jpg'}" style="width:100%; height:100%; object-fit:cover; pointer-events:none;" onerror="this.onerror=null; this.src='/cards/01.jpg';" />
                  `}
                </div>
                <div style="font-size:0.8rem; font-weight:950; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; color:#fff; line-height:1.2; letter-spacing:0.5px;">${t.name.toUpperCase()}</div>
                <div style="font-size:0.65rem; color:${cls?.color || '#888'}; font-weight:900; margin-top:2px; display:flex; align-items:center; gap:4px;">${cls ? cls.icon + ' ' + cls.name : 'SEM CLASSE'}</div>
                
                <div style="display:flex; justify-content:center; gap:8px; margin-top:10px; width:100%;">
                   <div style="background:rgba(255,255,255,0.1); padding:4px 8px; border-radius:8px; font-size:0.7rem; font-weight:950; display:flex; align-items:center; gap:4px; border:1px solid rgba(255,255,255,0.05);">
                      <span style="color:#ff4444; filter:drop-shadow(0 0 2px rgba(255,68,68,0.5));">⚔️</span><span>${t.baseAtk || 0}</span>
                   </div>
                   <div style="background:rgba(255,255,255,0.1); padding:4px 8px; border-radius:8px; font-size:0.7rem; font-weight:950; display:flex; align-items:center; gap:4px; border:1px solid rgba(255,255,255,0.05);">
                      <span style="color:#2ecc71; filter:drop-shadow(0 0 2px rgba(46,204,113,0.5));">❤️</span><span>${t.basePv || 0}</span>
                   </div>
                </div>
                
                <div style="display:flex; justify-content:center; gap:5px; margin-top:8px; width:100%; border-top:1px solid rgba(255,255,255,0.1); padding-top:8px; margin-bottom:6px; flex-wrap: wrap;">
                   <div style="font-size:0.65rem; font-weight:950; display:flex; align-items:center; gap:2px;">
                      <span style="color:#51c5ff; text-shadow:0 0 4px rgba(81,197,255,0.5);">💎</span><span>${t.manaCost || 0}</span>
                   </div>
                   <div style="font-size:0.65rem; font-weight:950; display:flex; align-items:center; gap:2px;">
                      <span style="color:#ffa500; text-shadow:0 0 4px rgba(255,165,0,0.5);">⚡</span><span>${t.staminaCost || 0}</span>
                   </div>
                   ${t.parry && t.parry > 0 ? `
                   <div style="font-size:0.65rem; font-weight:950; display:flex; align-items:center; gap:1px;">
                      <span style="color:#2ecc71; text-shadow:0 0 4px rgba(46,204,113,0.5);">🛡️</span>
                   </div>
                   ` : ''}
                   <div style="font-size:0.75rem; margin-left:2px; filter:drop-shadow(0 0 3px rgba(255,255,255,0.3));">
                      ${t.preferredRarity === 'legendary' ? '⭐' : (t.preferredRarity === 'epic' ? '🔮' : (t.preferredRarity === 'rare' ? '🔷' : '⬜'))}
                   </div>
                   
                    <!-- Attack Summary -->
                    <div style="display:flex; gap:3px; margin-top:4px; width:100%; justify-content:center; flex-wrap:wrap;">
                       ${(t.attacks || []).slice(0, 3).map((atk: any) => `
                         <div style="background:rgba(255,255,255,0.05); border:1px solid ${atk.costType === 'mana' ? '#51c5ff' : '#ffd700'}; border-radius:3px; padding:1px 3px; font-size:0.55rem; font-weight:950; display:flex; align-items:center; gap:2px; color:#fff;">
                            <span>${atk.damage || 'FX'}</span><span style="font-size:0.45rem; opacity:0.8;">${atk.costType === 'mana' ? '💎' : '⚡'}</span>
                         </div>
                       `).join('')}
                       ${t.specialAttack ? `
                         <div style="background:rgba(163,53,238,0.2); border:1px solid #a335ee; border-radius:3px; padding:1px 3px; font-size:0.55rem; font-weight:950; display:flex; align-items:center; gap:2px; color:#fff; box-shadow:0 0 4px rgba(163,53,238,0.4);">
                            <span>${t.specialAttack.damage || 'ULTI'}</span><span style="font-size:0.45rem; opacity:0.8;">${t.specialAttack.costType === 'mana' ? '💎' : '⚡'}</span>
                         </div>
                       ` : ''}
                    </div>
                </div>
              </div>
            `;
          }).join('')}
          ${filtered.length === 0 ? '<div style="grid-column:1/-1; padding:40px; text-align:center; opacity:0.4;">Nenhuma carta encontrada com esses filtros.</div>' : ''}
        </div>

        <!-- FOOTER: CLASS EDITOR -->
        <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; flex-wrap:wrap; gap:5px;">
              ${this.classes.map((c, i) => `
                <div style="background:rgba(255,255,255,0.03); padding:4px 8px; border-radius:20px; border:1px solid ${c.color}22; font-size:0.55rem; display:flex; align-items:center; gap:4px;">
                  <span style="color:${c.color}">${c.icon} ${c.name}</span>
                  <button class="btn-del-class" data-idx="${i}" style="background:none; border:none; color:#ff4444; cursor:pointer;">&times;</button>
                </div>
              `).join('')}
            </div>
            <button id="btn-add-custom-class" class="editor-btn-secondary" style="font-size:0.55rem; padding:4px 8px; border-color:#51c5ff; color:#51c5ff;">+ NOVA CLASSE</button>
        </div>

      </div>
      <style>
        .class-grid-item:hover { transform: translateY(-4px); border-color: rgba(81, 197, 255, 0.8); background: rgba(255,255,255,0.03) !important; }
        .class-grid-item.selected { border-color:#51c5ff !important; background: rgba(81, 197, 255, 0.15) !important; box-shadow: 0 0 15px rgba(81,197,255,0.2); }
      </style>
    `;
  }

  public bind(container: HTMLElement) {
    // Filter Listeners
    container.querySelector('#quick-search')?.addEventListener('input', (e) => {
      this.filter.search = (e.target as HTMLInputElement).value;
      this.reRender();
    });
    container.querySelector('#filter-class')?.addEventListener('change', (e) => {
      this.filter.class = (e.target as HTMLSelectElement).value;
      this.reRender();
    });
    container.querySelector('#filter-rarity')?.addEventListener('change', (e) => {
      this.filter.rarity = (e.target as HTMLSelectElement).value;
      this.reRender();
    });
    container.querySelector('#btn-clear-filters')?.addEventListener('click', () => {
      this.filter.search = '';
      this.filter.class = '';
      this.filter.rarity = '';
      this.reRender();
    });

    // Grid selection
    container.querySelectorAll('.class-grid-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt((item as HTMLElement).dataset.idx!);
        if (this.selectedIds.has(idx)) this.selectedIds.delete(idx);
        else this.selectedIds.add(idx);
        this.reRender();
      });
    });

    container.querySelector('#btn-select-all')?.addEventListener('click', () => {
      // Apply select all to FILTERED items only
      let filteredIds = this.templates.map((t, i) => ({ t, i }));
      if (this.filter.search) filteredIds = filteredIds.filter(item => item.t.name.toLowerCase().includes(this.filter.search.toLowerCase()));
      if (this.filter.class) filteredIds = filteredIds.filter(item => item.t.classId === this.filter.class);
      if (this.filter.rarity) filteredIds = filteredIds.filter(item => item.t.preferredRarity === this.filter.rarity);

      if (this.selectedIds.size >= filteredIds.length && filteredIds.length > 0) {
        filteredIds.forEach(item => this.selectedIds.delete(item.i));
      } else {
        filteredIds.forEach(item => this.selectedIds.add(item.i));
      }
      this.reRender();
    });

    container.querySelectorAll('.btn-bulk-gen').forEach(btn => {
      btn.addEventListener('click', () => {
        const rarity = (btn as HTMLElement).dataset.rar!;
        if (this.selectedIds.size === 0) return this.showToast('Nenhuma carta selecionada!', '#ff4444');
        
        if (confirm(`Gerar propriedades aleatórias para ${this.selectedIds.size} cartas como "${rarity.toUpperCase()}"?`)) {
          this.selectedIds.forEach(idx => {
            randomizeCard(this.templates[idx], rarity, this.abilities, this.classes);
          });
          this.showToast(`✨ ${this.selectedIds.size} cartas randomizadas!`);
          this.reRender();
        }
      });
    });

    // Bulk Actions
    container.querySelector('#btn-bulk-move')?.addEventListener('click', () => {
      const select = container.querySelector('#bulk-class-select') as HTMLSelectElement;
      const classId = select.value;
      if (!classId && classId !== '') return;
      if (this.selectedIds.size === 0) return this.showToast('Nenhuma carta selecionada!', '#ff4444');

      this.selectedIds.forEach(idx => {
        this.templates[idx].classId = classId;
      });
      this.showToast(`✅ ${this.selectedIds.size} cartas atualizadas!`);
      this.saveTemplates();
      this.reRender();
    });

    container.querySelector('#btn-bulk-rarity')?.addEventListener('click', () => {
      const select = container.querySelector('#bulk-rarity-select') as HTMLSelectElement;
      const rarity = select.value;
      if (!rarity) return;
      if (this.selectedIds.size === 0) return this.showToast('Nenhuma carta selecionada!', '#ff4444');

      this.selectedIds.forEach(idx => {
        if (rarity === 'random') {
          const rars = ['common', 'rare', 'epic', 'legendary'];
          this.templates[idx].preferredRarity = rars[Math.floor(Math.random() * rars.length)];
        } else {
          this.templates[idx].preferredRarity = rarity;
        }
      });
      this.showToast(`🎲 Raridades randomizadas!`);
      this.saveTemplates();
      this.reRender();
    });

    // Class Registry
    container.querySelector('#btn-add-custom-class')?.addEventListener('click', () => {
      const name = prompt('Nome da Nova Classe:');
      if (!name) return;
      this.classes.push({ id: name.toLowerCase().replace(/\s+/g, '_'), name, icon: '🏷️', color: '#ffffff' });
      this.saveClasses();
      this.reRender();
    });

    container.querySelectorAll('.btn-del-class').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        if (confirm(`Remover classe "${this.classes[idx].name}"?`)) {
          this.classes.splice(idx, 1);
          this.saveClasses();
          this.reRender();
        }
      });
    });

    // ─── IMPORTAR IMAGEM E CRIAR CARTA INSTANTANEAMENTE ───
    const inpImport = container.querySelector('#inp-quick-import') as HTMLInputElement;
    container.querySelector('#btn-quick-import')?.addEventListener('click', () => inpImport?.click());
    inpImport?.addEventListener('change', async () => {
      const files = Array.from(inpImport.files || []);
      if (files.length === 0) return;
      this.showToast(`Processando e criando ${files.length} carta(s)...`, '#51c5ff');
      
      let createdCount = 0;
      const rars = ['common', 'rare', 'epic', 'legendary'];

      for (const file of files) {
        let finalUrl = '';
        const fd = new FormData();
        fd.append('media', file);

        try {
          const resp = await fetch('/api/upload-media', { method: 'POST', body: fd });
          const json = await resp.json();
          if (json.success && (json.url || (json.urls && json.urls[0]))) {
            finalUrl = json.url || json.urls[0];
          }
        } catch (err) {
          console.warn('Upload API falhou, usando fallback seguro de arquivo:', err);
        }

        // Fallback resiliente: caso o upload retorne vazio ou falhe, cria Data URL para não travar!
        if (!finalUrl) {
          finalUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string || `/cards/${file.name}`);
            reader.onerror = () => resolve(`/cards/${file.name}`);
            reader.readAsDataURL(file);
          });
        }

        if (finalUrl) {
          const fileClean = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().substring(0, 26) || 'Nova Carta';
          const cardName = fileClean.charAt(0).toUpperCase() + fileClean.slice(1);
          const isVid = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(finalUrl);

          const newCard: any = {
            id: 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name: cardName,
            image: finalUrl,
            ...(isVid ? { animationUrl: finalUrl } : {})
          };

          // Aplica atributos balanceados automaticamente
          randomizeCard(newCard, rars[Math.floor(Math.random() * rars.length)], this.abilities, this.classes);

          // Insere a nova carta no topo da lista
          this.templates.unshift(newCard);
          createdCount++;
        }
      }

      inpImport.value = '';

      if (createdCount > 0) {
        // Limpar filtros para que a nova carta apareça imediatamente no grid
        this.filter.search = '';
        this.filter.class = '';
        this.filter.rarity = '';
        this.selectedIds.clear();
        for (let k = 0; k < createdCount; k++) {
          this.selectedIds.add(k);
        }

        this.saveTemplates();
        this.showToast(`✨ ${createdCount} nova(s) carta(s) criada(s) com sucesso!`, '#4cff88');
        this.reRender();
      } else {
        this.showToast('❌ Nenhuma carta pôde ser gerada.', '#ff4444');
      }
    });

    // Bulk create random cards from gallery
    container.querySelector('#btn-bulk-create')?.addEventListener('click', () => this.openBulkCreateModal());
  }

  private async openBulkCreateModal() {
    const isVid = (u: string) => /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(u || '');
    this.showToast('Carregando galeria...', '#51c5ff');

    let imgs: string[] = [];
    try {
      const res = await fetch('/api/images');
      if (res.ok) {
        const data = await res.json();
        imgs = data.cards || [];
      }
    } catch (err) { console.error(err); }

    if (imgs.length === 0) {
      this.showToast('Galeria vazia! Importe imagens primeiro.', '#ff4444');
      return;
    }

    const selected = new Set<string>();
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px; box-sizing:border-box;';
    overlay.innerHTML = `
      <div style="width:100%; max-width:860px; max-height:88vh; background:#14141c; border:1px solid rgba(81,197,255,0.25); border-radius:16px; display:flex; flex-direction:column; overflow:hidden;">
        <div style="padding:15px 20px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:900; color:#51c5ff; letter-spacing:1px;">🎴 CRIAR CARTAS EM MASSA</div>
            <div id="bulk-sel-count" style="font-size:0.65rem; opacity:0.6; margin-top:2px;">0 selecionadas — 1 carta aleatória por imagem</div>
          </div>
          <button id="bulk-sel-close" class="editor-btn-secondary" style="padding:4px 12px; font-size:0.7rem;">✕</button>
        </div>
        <div id="bulk-sel-grid" style="flex:1; overflow-y:auto; padding:15px; display:grid; grid-template-columns:repeat(auto-fill, minmax(110px, 1fr)); gap:10px;">
          ${imgs.map(url => {
            const file = (url.split('/').pop() || url).substring(0, 22);
            return `
            <div class="bulk-sel-item" data-url="${url}" style="aspect-ratio:3/4; background:rgba(0,0,0,0.4); border-radius:10px; overflow:hidden; cursor:pointer; border:2px solid transparent; transition:0.15s; position:relative;">
              ${isVid(url)
                ? `<video src="${url}" muted playsinline preload="metadata" style="width:100%; height:100%; object-fit:cover;"></video><div style="position:absolute; top:4px; left:4px; background:rgba(0,0,0,0.7); color:#51c5ff; font-size:0.55rem; font-weight:900; padding:2px 6px; border-radius:4px;">VIDEO</div>`
                : `<div style="width:100%; height:100%; background:url('${url}') center/cover;"></div>`}
              <div class="bulk-sel-check" style="position:absolute; top:4px; right:4px; width:22px; height:22px; border-radius:50%; background:#4cff88; color:#000; font-weight:900; font-size:0.75rem; display:none; align-items:center; justify-content:center;">✓</div>
              <div style="position:absolute; bottom:0; left:0; right:0; font-size:0.55rem; color:#ccc; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; background:rgba(0,0,0,0.65); padding:2px 5px;">${file}</div>
            </div>`;
          }).join('')}
        </div>
        <div style="padding:15px 20px; border-top:1px solid rgba(255,255,255,0.08); display:flex; gap:10px; justify-content:flex-end;">
          <button id="bulk-sel-cancel" class="editor-btn-secondary" style="padding:10px 20px; font-size:0.75rem;">CANCELAR</button>
          <button id="bulk-sel-ok" class="editor-btn-primary" style="padding:10px 24px; font-size:0.75rem; font-weight:900;" disabled>CRIAR (0)</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const countEl = overlay.querySelector('#bulk-sel-count') as HTMLElement;
    const okBtn = overlay.querySelector('#bulk-sel-ok') as HTMLButtonElement;
    const refreshOk = () => {
      countEl.textContent = `${selected.size} selecionadas — 1 carta aleatória por imagem`;
      okBtn.textContent = `CRIAR (${selected.size})`;
      (okBtn as HTMLButtonElement).disabled = selected.size === 0;
      okBtn.style.opacity = selected.size === 0 ? '0.4' : '1';
    };

    overlay.querySelectorAll('.bulk-sel-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = (item as HTMLElement).dataset.url!;
        const check = item.querySelector('.bulk-sel-check') as HTMLElement;
        if (selected.has(url)) {
          selected.delete(url);
          (item as HTMLElement).style.borderColor = 'transparent';
          check.style.display = 'none';
        } else {
          selected.add(url);
          (item as HTMLElement).style.borderColor = '#4cff88';
          check.style.display = 'flex';
        }
        refreshOk();
      });
    });

    const close = () => overlay.remove();
    overlay.querySelector('#bulk-sel-close')?.addEventListener('click', close);
    overlay.querySelector('#bulk-sel-cancel')?.addEventListener('click', close);

    okBtn.addEventListener('click', () => {
      if (selected.size === 0) return;
      const rars = ['common', 'rare', 'epic', 'legendary'];
      let n = 0;
      selected.forEach(url => {
        const file = url.split('/').pop() || 'carta';
        const base = file.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().substring(0, 28) || 'Nova Carta';
        const card: any = {
          id: 'card_' + Date.now() + '_' + n,
          name: base.charAt(0).toUpperCase() + base.slice(1)
        };
        if (isVid(url)) card.animationUrl = url;
        else card.image = url;
        randomizeCard(card, rars[Math.floor(Math.random() * rars.length)], this.abilities, this.classes);
        this.templates.push(card);
        this.selectedIds.add(this.templates.length - 1);
        n++;
      });
      this.saveTemplates();
      this.showToast(`🎴 ${n} carta(s) aleatória(s) criada(s)!`);
      close();
      this.reRender();
    });
  }
}
