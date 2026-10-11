export class QuestMakerHub {
  private activeTab: 'questmaker' | 'fases' = 'questmaker';
  private onSelect: ((tab: string) => void) | null = null;
  private selectedPhases: Set<number> = new Set();

  public setOnSelect(callback: (tab: string) => void) {
    this.onSelect = callback;
  }

  private getPhases(): any[] {
    try {
      const saved = localStorage.getItem('forge_phase_presets') || '[]';
      return JSON.parse(saved);
    } catch { return []; }
  }

  private savePhases(phases: any[]) {
    localStorage.setItem('forge_phase_presets', JSON.stringify(phases));
  }

  public render(): string {
    return `
      <div id="qm-hub-overlay" style="
        position:fixed; top:0; left:0; right:0; bottom:0;
        background:rgba(0,0,0,0.85); z-index:99999;
        display:flex; align-items:center; justify-content:center;
        animation: fadeIn 0.3s ease;
      ">
        <div style="
          background:linear-gradient(145deg, #12121a 0%, #0a0a0f 100%);
          border:1px solid rgba(255,255,255,0.1);
          border-radius:24px;
          width:900px; max-width:95vw;
          box-shadow:0 20px 60px rgba(0,0,0,0.8);
          overflow:hidden;
        ">
          <!-- Header com explicação -->
          <div style="
            padding:28px 32px; border-bottom:1px solid rgba(255,255,255,0.08);
            background:linear-gradient(180deg, rgba(81,197,255,0.05) 0%, transparent 100%);
          ">
            <div style="display:flex; align-items:flex-start; gap:16px;">
              <div style="
                width:56px; height:56px; border-radius:16px;
                background:linear-gradient(135deg, #51c5ff 0%, #a78bfa 100%);
                display:flex; align-items:center; justify-content:center;
                font-size:1.8rem; flex-shrink:0;
              ">🎮</div>
              <div style="flex:1;">
                <div style="font-size:1.3rem; font-weight:900; color:#fff; letter-spacing:1px; margin-bottom:8px;">
                  BEM-VINDO AO QUEST MAKER
                </div>
                <div style="font-size:0.72rem; color:#888; line-height:1.7;">
                  O centro de criação do seu jogo. Aqui você pode:
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;">
                  <span style="padding:4px 10px; border-radius:6px; background:rgba(81,197,255,0.1); border:1px solid rgba(81,197,255,0.2); font-size:0.6rem; color:#51c5ff;">🗺️ Criar mapas e fases</span>
                  <span style="padding:4px 10px; border-radius:6px; background:rgba(255,215,0,0.1); border:1px solid rgba(255,215,0,0.2); font-size:0.6rem; color:#ffd700;">🎞️ Criar sprites animados</span>
                  <span style="padding:4px 10px; border-radius:6px; background:rgba(76,255,136,0.1); border:1px solid rgba(76,255,136,0.2); font-size:0.6rem; color:#4cff88;">📦 Gerenciar assets</span>
                  <span style="padding:4px 10px; border-radius:6px; background:rgba(167,139,250,0.1); border:1px solid rgba(167,139,250,0.2); font-size:0.6rem; color:#a78bfa;">💬 Criar diálogos</span>
                  <span style="padding:4px 10px; border-radius:6px; background:rgba(255,140,66,0.1); border:1px solid rgba(255,140,66,0.2); font-size:0.6rem; color:#ff8c42;">🎬 Organizar cenas</span>
                </div>
              </div>
              <button id="qm-hub-close" style="
                width:36px; height:36px; border-radius:10px;
                background:rgba(255,255,255,0.05); border:none;
                color:#666; font-size:1.1rem; cursor:pointer;
              ">✕</button>
            </div>
          </div>

          <!-- Tabs -->
          <div style="
            display:flex; gap:8px; padding:20px 32px; border-bottom:1px solid rgba(255,255,255,0.05);
          ">
            <button class="qm-hub-tab" data-tab="questmaker" style="
              flex:1; padding:14px 20px; border-radius:12px; border:none;
              background:${this.activeTab === 'questmaker' ? 'rgba(81,197,255,0.15)' : 'rgba(255,255,255,0.03)'};
              color:${this.activeTab === 'questmaker' ? '#51c5ff' : '#666'};
              font-size:0.8rem; font-weight:900; cursor:pointer;
              transition:all 0.2s;
            ">
              🏗️ FERRAMENTAS DE CRIAÇÃO
            </button>
            <button class="qm-hub-tab" data-tab="fases" style="
              flex:1; padding:14px 20px; border-radius:12px; border:none;
              background:${this.activeTab === 'fases' ? 'rgba(76,255,136,0.15)' : 'rgba(255,255,255,0.03)'};
              color:${this.activeTab === 'fases' ? '#4cff88' : '#666'};
              font-size:0.8rem; font-weight:900; cursor:pointer;
              transition:all 0.2s;
            ">
              📁 MINHAS FASES
            </button>
          </div>

          <!-- Content -->
          <div style="padding:28px 32px; min-height:300px; max-height:450px; overflow-y:auto;">
            ${this.renderContent()}
          </div>

          <!-- Footer -->
          <div style="
            padding:20px 32px; border-top:1px solid rgba(255,255,255,0.05);
            display:flex; justify-content:space-between; align-items:center;
          ">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" id="qm-hub-dont-show" style="accent-color:#51c5ff;">
              <span style="font-size:0.65rem; color:#666;">Não mostrar novamente</span>
            </label>
            <div style="display:flex; gap:12px;">
              <button id="qm-hub-skip" style="
                padding:12px 24px; border-radius:8px;
                background:transparent; border:1px solid rgba(255,255,255,0.1);
                color:#888; font-size:0.75rem; font-weight:900; cursor:pointer;
              ">PULAR</button>
              <button id="qm-hub-enter" style="
                padding:14px 32px; border-radius:8px;
                background:linear-gradient(135deg, #51c5ff 0%, #a78bfa 100%);
                border:none; color:#fff; font-size:0.8rem; font-weight:900; cursor:pointer;
                box-shadow:0 4px 15px rgba(81,197,255,0.3);
              ">COMEÇAR</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderContent(): string {
    if (this.activeTab === 'questmaker') {
      return `
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:16px;">
          <div class="qm-hub-card" data-select="worldmap" style="
            padding:20px; border-radius:16px; background:rgba(81,197,255,0.08);
            border:1px solid rgba(81,197,255,0.2); cursor:pointer; transition:all 0.2s;
          ">
            <div style="font-size:2rem; margin-bottom:12px;">🗺️</div>
            <div style="font-size:0.85rem; font-weight:900; color:#51c5ff; margin-bottom:8px;">
              WORLD MAP
            </div>
            <div style="font-size:0.7rem; color:#888; line-height:1.5;">
              Construa o mundo do seu jogo. Crie fases detalhadas com objetos, colisões, sensores e eventos.
            </div>
          </div>
          <div class="qm-hub-card" data-select="sprites" style="
            padding:20px; border-radius:16px; background:rgba(255,215,0,0.08);
            border:1px solid rgba(255,215,0,0.2); cursor:pointer; transition:all 0.2s;
          ">
            <div style="font-size:2rem; margin-bottom:12px;">🎞</div>
            <div style="font-size:0.85rem; font-weight:900; color:#ffd700; margin-bottom:8px;">
              SPRITE CREATOR
            </div>
            <div style="font-size:0.7rem; color:#888; line-height:1.5;">
              Crie pastas de Sprites Animados. Configure ações, direções e gerencie animações GIF ou PNG.
            </div>
          </div>
          <div class="qm-hub-card" data-select="assets" style="
            padding:20px; border-radius:16px; background:rgba(76,255,136,0.08);
            border:1px solid rgba(76,255,136,0.2); cursor:pointer; transition:all 0.2s;
          ">
            <div style="font-size:2rem; margin-bottom:12px;">📦</div>
            <div style="font-size:0.85rem; font-weight:900; color:#4cff88; margin-bottom:8px;">
              ASSETS
            </div>
            <div style="font-size:0.7rem; color:#888; line-height:1.5;">
              Gerencie todos os recursos do seu projeto. Imagens, sons e elementos visuais.
            </div>
          </div>
          <div class="qm-hub-card" data-select="scenes" style="
            padding:20px; border-radius:16px; background:rgba(255,140,66,0.08);
            border:1px solid rgba(255,140,66,0.2); cursor:pointer; transition:all 0.2s;
          ">
            <div style="font-size:2rem; margin-bottom:12px;">🎬</div>
            <div style="font-size:0.85rem; font-weight:900; color:#ff8c42; margin-bottom:8px;">
              SCENES
            </div>
            <div style="font-size:0.7rem; color:#888; line-height:1.5;">
              Organize e gerencie as cenas do seu jogo. Configure transições e fluxos.
            </div>
          </div>
          <div class="qm-hub-card" data-select="quests" style="
            padding:20px; border-radius:16px; background:rgba(167,139,250,0.08);
            border:1px solid rgba(167,139,250,0.2); cursor:pointer; transition:all 0.2s;
          ">
            <div style="font-size:2rem; margin-bottom:12px;">💬</div>
            <div style="font-size:0.85rem; font-weight:900; color:#a78bfa; margin-bottom:8px;">
              INTERAÇÕES
            </div>
            <div style="font-size:0.7rem; color:#888; line-height:1.5;">
              Crie diálogos, pop ups interativos e eventos dentro do seu jogo.
            </div>
          </div>
        </div>
      `;
    } else {
      // Fases tab - list saved phases
      return this.renderFasesList();
    }
  }

  private renderFasesList(): string {
    const phases = this.getPhases();
    const selectedCount = this.selectedPhases.size;

    if (phases.length === 0) {
      return `
        <div style="text-align:center; padding:40px; color:#666;">
          <div style="font-size:3rem; margin-bottom:16px;">📭</div>
          <div style="font-size:0.85rem; font-weight:900; color:#888; margin-bottom:8px;">
            Nenhuma fase salva
          </div>
          <div style="font-size:0.7rem; color:#555;">
            Crie uma fase no World Map para começar
          </div>
        </div>
      `;
    }

    const allSelected = selectedCount === phases.length && phases.length > 0;
    const someSelected = selectedCount > 0;

    return `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <!-- Toolbar de ações -->
        <div style="
          display:flex; justify-content:space-between; align-items:center;
          padding:12px 16px; background:rgba(0,0,0,0.3); border-radius:12px;
          border:1px solid rgba(255,255,255,0.06);
        ">
          <div style="display:flex; align-items:center; gap:12px;">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" class="qm-phase-select-all" 
                ${allSelected ? 'checked' : ''} 
                style="width:18px; height:18px; accent-color:#51c5ff; cursor:pointer;">
              <span style="font-size:0.7rem; color:#888;">
                ${allSelected ? 'Deselecionar tudo' : 'Selecionar todos'}
              </span>
            </label>
            ${someSelected ? `
              <span style="font-size:0.65rem; color:#51c5ff; background:rgba(81,197,255,0.1); padding:4px 8px; border-radius:4px;">
                ${selectedCount} selecionado${selectedCount > 1 ? 's' : ''}
              </span>
            ` : ''}
          </div>
          <div style="display:flex; gap:8px;">
            <button class="qm-phase-action" data-action="edit" ${!someSelected ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} style="
              padding:8px 14px; border-radius:8px; background:rgba(255,215,0,0.1);
              border:1px solid rgba(255,215,0,0.2); color:#ffd700;
              font-size:0.65rem; font-weight:900; cursor:pointer;
            ">✏️ Editar</button>
            <button class="qm-phase-action" data-action="duplicate" ${!someSelected ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} style="
              padding:8px 14px; border-radius:8px; background:rgba(81,197,255,0.1);
              border:1px solid rgba(81,197,255,0.2); color:#51c5ff;
              font-size:0.65rem; font-weight:900; cursor:pointer;
            ">📋 Duplicar</button>
            <button class="qm-phase-action" data-action="export" ${!someSelected ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} style="
              padding:8px 14px; border-radius:8px; background:rgba(76,255,136,0.1);
              border:1px solid rgba(76,255,136,0.2); color:#4cff88;
              font-size:0.65rem; font-weight:900; cursor:pointer;
            ">📤 Exportar</button>
            <button class="qm-phase-action" data-action="delete" ${!someSelected ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} style="
              padding:8px 14px; border-radius:8px; background:rgba(255,51,102,0.1);
              border:1px solid rgba(255,51,102,0.2); color:#ff3366;
              font-size:0.65rem; font-weight:900; cursor:pointer;
            ">🗑️ Apagar</button>
          </div>
        </div>

        <!-- Lista de fases -->
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${phases.map((phase, idx) => {
            const isSelected = this.selectedPhases.has(idx);
            return `
              <div class="qm-phase-item ${isSelected ? 'selected' : ''}" data-idx="${idx}" style="
                display:flex; align-items:center; gap:14px; padding:16px 18px;
                border-radius:14px; 
                background: ${isSelected ? 'rgba(81,197,255,0.1)' : 'rgba(255,255,255,0.03)'};
                border:1px solid ${isSelected ? 'rgba(81,197,255,0.4)' : 'rgba(255,255,255,0.06)'};
                cursor:pointer; transition:all 0.2s;
              ">
                <input type="checkbox" class="qm-phase-checkbox" data-idx="${idx}"
                  ${isSelected ? 'checked' : ''}
                  style="width:20px; height:20px; accent-color:#51c5ff; cursor:pointer;">
                <div style="
                  width:48px; height:48px; border-radius:12px;
                  background: ${isSelected ? 'rgba(81,197,255,0.2)' : 'rgba(76,255,136,0.1)'};
                  display:flex; align-items:center; justify-content:center;
                  font-size:1.4rem;
                ">${isSelected ? '✅' : '🎮'}</div>
                <div style="flex:1;">
                  <div style="font-size:0.85rem; font-weight:900; color:#fff; margin-bottom:4px;">
                    ${phase.name || 'Fase sem nome'}
                  </div>
                  <div style="font-size:0.62rem; color:#666; display:flex; gap:12px;">
                    <span>📦 ${phase.objects?.length || 0} objetos</span>
                    <span>📡 ${phase.sensors?.length || 0} sensores</span>
                    <span>📅 ${new Date(phase.createdAt || Date.now()).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                ${phase.cameraZoom ? `
                  <div style="
                    padding:4px 10px; border-radius:6px; background:rgba(255,215,0,0.1);
                    font-size:0.55rem; color:#ffd700;
                  ">🔍 ${phase.cameraZoom}x</div>
                ` : ''}
                <button class="qm-phase-single-edit" data-idx="${idx}" style="
                  padding:8px 14px; border-radius:8px; background:rgba(255,215,0,0.1);
                  border:1px solid rgba(255,215,0,0.2); color:#ffd700;
                  font-size:0.6rem; font-weight:900; cursor:pointer;
                ">✏️</button>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Info de fases -->
        <div style="text-align:center; padding:12px; font-size:0.65rem; color:#555;">
          Total: ${phases.length} fase${phases.length > 1 ? 's' : ''} • 
          ${selectedCount > 0 ? `${selectedCount} selecionada${selectedCount > 1 ? 's' : ''}` : 'Nenhuma selecionada'}
        </div>
      </div>
    `;
  }

  public bind(container: HTMLElement) {
    // Tab switching
    container.querySelectorAll('.qm-hub-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = (tab as HTMLElement).dataset.tab as any;
        const overlay = container.querySelector('#qm-hub-overlay');
        if (overlay) {
          overlay.innerHTML = this.render();
          this.bind(overlay as HTMLElement);
        }
      });
    });

    // Card hover effects
    container.querySelectorAll('.qm-hub-card').forEach(card => {
      const c = card as HTMLElement;
      c.addEventListener('mouseenter', () => {
        c.style.transform = 'translateY(-4px)';
        c.style.boxShadow = '0 8px 25px rgba(0,0,0,0.4)';
      });
      c.addEventListener('mouseleave', () => {
        c.style.transform = 'translateY(0)';
        c.style.boxShadow = 'none';
      });
    });

    // Phase item hover
    container.querySelectorAll('.qm-phase-item').forEach(item => {
      const i = item as HTMLElement;
      i.addEventListener('mouseenter', () => {
        i.style.background = 'rgba(255,255,255,0.06)';
        i.style.borderColor = 'rgba(76,255,136,0.3)';
      });
      i.addEventListener('mouseleave', () => {
        i.style.background = 'rgba(255,255,255,0.03)';
        i.style.borderColor = 'rgba(255,255,255,0.06)';
      });
    });

    // Phase edit button
    container.querySelectorAll('.qm-phase-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
        this.editPhase(idx);
      });
    });

    // Phase delete button
    container.querySelectorAll('.qm-phase-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
        this.deletePhase(idx);
      });
    });

    // New phase button
    container.querySelector('#qm-hub-new-phase')?.addEventListener('click', () => {
      if (this.onSelect) {
        this.onSelect('worldmap');
      }
      this.close();
    });

    // Select all checkbox
    container.querySelector('.qm-phase-select-all')?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      const phases = this.getPhases();
      this.selectedPhases.clear();
      if (checked) {
        phases.forEach((_, idx) => this.selectedPhases.add(idx));
      }
      this.reRender(container);
    });

    // Individual phase checkboxes
    container.querySelectorAll('.qm-phase-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const idx = parseInt((e.target as HTMLElement).dataset.idx || '0');
        if ((e.target as HTMLInputElement).checked) {
          this.selectedPhases.add(idx);
        } else {
          this.selectedPhases.delete(idx);
        }
        this.reRender(container);
      });
    });

    // Phase item click (toggle selection)
    container.querySelectorAll('.qm-phase-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).tagName === 'INPUT' || 
            (e.target as HTMLElement).tagName === 'BUTTON') return;
        const idx = parseInt((item as HTMLElement).dataset.idx || '0');
        if (this.selectedPhases.has(idx)) {
          this.selectedPhases.delete(idx);
        } else {
          this.selectedPhases.add(idx);
        }
        this.reRender(container);
      });
    });

    // Phase action buttons (edit, duplicate, export, delete)
    container.querySelectorAll('.qm-phase-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.action;
        const selected = Array.from(this.selectedPhases);
        
        if (action === 'edit' && selected.length > 0) {
          // Edit first selected
          this.editPhase(selected[0]);
        } else if (action === 'duplicate' && selected.length > 0) {
          this.duplicatePhases(selected);
        } else if (action === 'export' && selected.length > 0) {
          this.exportPhases(selected);
        } else if (action === 'delete' && selected.length > 0) {
          this.deletePhases(selected);
        }
      });
    });

    // Single edit button
    container.querySelectorAll('.qm-phase-single-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
        this.editPhase(idx);
      });
    });

    // Close button
    container.querySelector('#qm-hub-close')?.addEventListener('click', () => {
      this.close();
      if ((this as any).__onSkip) {
        (this as any).__onSkip();
      }
    });

    // Skip button
    container.querySelector('#qm-hub-skip')?.addEventListener('click', () => {
      // Check if "don't show again" is checked
      const dontShow = (container.querySelector('#qm-hub-dont-show') as HTMLInputElement)?.checked;
      if (dontShow) {
        localStorage.setItem('qm_hub_skipped', 'true');
      }
      this.close();
      if ((this as any).__onSkip) {
        (this as any).__onSkip();
      }
    });

    // Enter button
    container.querySelector('#qm-hub-enter')?.addEventListener('click', () => {
      // Check if "don't show again" is checked
      const dontShow = (container.querySelector('#qm-hub-dont-show') as HTMLInputElement)?.checked;
      if (dontShow) {
        localStorage.setItem('qm_hub_skipped', 'true');
      }
      this.enter();
    });

    // Card click
    container.querySelectorAll('.qm-hub-card').forEach(card => {
      card.addEventListener('click', () => {
        const select = (card as HTMLElement).dataset.select;
        if (!select || !this.onSelect) return;
        
        if (select === 'worldmap') {
          this.closeWithWorldMap();
        } else {
          this.onSelect(select);
          this.close();
        }
      });
    });
  }

  private editPhase(idx: number) {
    try {
      const saved = localStorage.getItem('forge_phase_presets') || '[]';
      const phases = JSON.parse(saved);
      const phase = phases[idx];
      if (!phase) return;

      // Set to state for loading
      (window as any).__loadPhaseId = phase.id;
      (window as any).__skipPhaseWizard = true;
      
      if (this.onSelect) {
        this.onSelect('worldmap');
      }
      this.close();
    } catch {}
  }

  private closeWithWorldMap() {
    // User selected World Map - set flag to show wizard
    localStorage.setItem('qm_entered_via_hub', 'true');
    if (this.onSelect) {
      this.onSelect('worldmap');
    }
    this.close();
  }

  private deletePhase(idx: number) {
    const confirmDelete = confirm('Tem certeza que deseja excluir esta fase?');
    if (!confirmDelete) return;

    try {
      const saved = localStorage.getItem('forge_phase_presets') || '[]';
      let phases = JSON.parse(saved);
      phases.splice(idx, 1);
      localStorage.setItem('forge_phase_presets', JSON.stringify(phases));

      // Re-render
      const overlay = document.getElementById('qm-hub-overlay');
      if (overlay) {
        overlay.innerHTML = this.render();
        this.bind(overlay);
      }
    } catch {}
  }

  private close() {
    const overlay = document.getElementById('qm-hub-overlay');
    if (overlay) overlay.remove();
  }

  private enter() {
    // Default: enter world map
    if (this.onSelect) {
      this.onSelect('worldmap');
    }
    this.close();
  }

  private reRender(container: HTMLElement) {
    const overlay = container.querySelector('#qm-hub-overlay');
    if (overlay) {
      overlay.innerHTML = this.render();
      this.bind(overlay as HTMLElement);
    }
  }

  private duplicatePhases(indexes: number[]) {
    const phases = this.getPhases();
    const newPhases = [...phases];
    
    indexes.forEach(idx => {
      const original = phases[idx];
      if (original) {
        const duplicate = JSON.parse(JSON.stringify(original));
        duplicate.id = 'phase_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
        duplicate.name = (original.name || 'Fase') + ' (cópia)';
        duplicate.createdAt = Date.now();
        duplicate.updatedAt = Date.now();
        newPhases.push(duplicate);
      }
    });
    
    this.savePhases(newPhases);
    this.selectedPhases.clear();
    
    const overlay = document.getElementById('qm-hub-overlay');
    if (overlay) {
      overlay.innerHTML = this.render();
      this.bind(overlay);
    }
    
    this.showToast(`📋 ${indexes.length} fase${indexes.length > 1 ? 's' : ''} duplicada${indexes.length > 1 ? 's' : ''}`);
  }

  private exportPhases(indexes: number[]) {
    const phases = this.getPhases();
    const toExport = indexes.map(idx => phases[idx]).filter(p => p);
    
    const dataStr = JSON.stringify(toExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `fases_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showToast(`📤 ${indexes.length} fase${indexes.length > 1 ? 's' : ''} exportada${indexes.length > 1 ? 's' : ''}`);
  }

  private deletePhases(indexes: number[]) {
    const count = indexes.length;
    const confirmMsg = count === 1 
      ? 'Tem certeza que deseja excluir esta fase?' 
      : `Tem certeza que deseja excluir as ${count} fases selecionadas?`;
    
    if (!confirm(confirmMsg)) return;
    
    const phases = this.getPhases();
    const indexesSet = new Set(indexes);
    const newPhases = phases.filter((_, idx) => !indexesSet.has(idx));
    
    this.savePhases(newPhases);
    this.selectedPhases.clear();
    
    const overlay = document.getElementById('qm-hub-overlay');
    if (overlay) {
      overlay.innerHTML = this.render();
      this.bind(overlay);
    }
    
    this.showToast(`🗑️ ${count} fase${count > 1 ? 's' : ''} excluída${count > 1 ? 's' : ''}`);
  }

  private showToast(message: string) {
    const existing = document.getElementById('qm-hub-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.id = 'qm-hub-toast';
    toast.style.cssText = `
      position:fixed; bottom:30px; left:50%; transform:translateX(-50%);
      background:rgba(0,0,0,0.9); border:1px solid rgba(81,197,255,0.4);
      border-radius:12px; padding:14px 24px; z-index:100000;
      color:#fff; font-size:0.75rem; font-weight:900;
      box-shadow:0 8px 30px rgba(0,0,0,0.5);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  public static show(onSelect: (tab: string) => void, onSkip?: () => void) {
    const existing = document.getElementById('qm-hub-overlay');
    if (existing) existing.remove();

    const hub = new QuestMakerHub();
    hub.setOnSelect(onSelect);
    if (onSkip) {
      (hub as any).__onSkip = onSkip;
    }

    const div = document.createElement('div');
    div.innerHTML = hub.render();
    document.body.appendChild(div);
    hub.bind(div);
  }
}