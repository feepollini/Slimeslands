import { Card } from '../../../../core/GameEngine';
import { ENCHANTMENT_REGISTRY } from '../../../../core/enchantments';
import { VFX_REGISTRY } from '../../../../core/vfxRegistry';
import { BoardScreen } from '../../BoardScreen';
import { animateParallaxLayers } from '../../../utils/ParallaxUtils';
import { spawnSparkParticles, spawnAtmosphericFog, spawnMagicSwirl } from '../../../utils/ParticleUtils';
import { gsap } from 'gsap';
import { playVFX } from '../../../utils/BattleAnimations';
import { TabQuickManager } from './TabQuickManager';
import { randomizeCard } from '../utils/CardGenerator';
import { 
   renderPremiumCard,
   renderHandCardPremium,
   renderFieldCardPremium 
} from '../utils/PremiumCardRenderer';
import { getGlobalCardBack, setGlobalCardBack, DEFAULT_CARD_BACK } from '../../../../core/constants';

export class TabCards {
  private templates: any[];
  private abilities: any[];
  private classes: any[];
  private selectedIndex: number;
  private selectedClassIds: Set<number>;
  private quickFilter: { class: string, rarity: string, search: string };
  private cardSubMode: 'quick' | 'avancado' | 'aparencia' | 'estetica' | 'efeitos' | 'verso';
  private previewMode: 'card' | 'board';
  private boardRenderer: BoardScreen;
  private selectedParallaxLayerIdx: number | null;
  private reRender: () => void;
  private showToast: (msg: string, color?: string) => void;
  private openMediaPicker: (onSelect: (url: string) => void) => void;
  private setCardSubMode: (mode: string) => void;
  private setSelectedIndex: (idx: number) => void;
  private setPreviewMode: (mode: string) => void;
  private saveTemplates: () => void;

  constructor(state: any, callbacks: any) {
    this.templates = state.templates;
    this.abilities = state.abilities || [];
    this.classes = state.classes || [];
    this.selectedClassIds = state.selectedClassIds;
    this.quickFilter = state.quickFilter;
    this.selectedIndex = state.selectedIndex;
    this.cardSubMode = state.cardSubMode || 'quick';
    this.previewMode = state.previewMode || 'card';
    this.selectedParallaxLayerIdx = state.selectedParallaxLayerIdx ?? null;

    this.boardRenderer = callbacks.boardRenderer;
    this.reRender = callbacks.reRender;
    this.showToast = callbacks.showToast;
    this.openMediaPicker = callbacks.openMediaPicker;
    this.saveTemplates = callbacks.saveTemplates;
    
    this.setCardSubMode = callbacks.setCardSubMode || ((m: string) => { this.cardSubMode = m as any; this.reRender(); });
    this.setSelectedIndex = callbacks.setSelectedIndex || ((i: number) => { this.selectedIndex = i; this.reRender(); });
    this.setPreviewMode = callbacks.setPreviewMode || ((m: string) => { this.previewMode = m as any; this.updatePreview(); });
  }

  public render(): string {
     const t = this.templates[this.selectedIndex];
     if (!t) return 'Selecione uma carta';

     return `
      <div class="editor-list-panel">
        <div class="editor-section-title">ACERVO (${this.templates.length})</div>
        <div class="editor-card-list" id="editor-card-list">
          ${this.templates.map((t, i) => `
            <div class="editor-list-item ${i === this.selectedIndex ? 'active' : ''}" data-idx="${i}">
              <div class="list-item-img" style="background-image:url('${t.image}')"></div>
              <div class="list-item-info">
                <div class="list-item-name">${t.name}</div>
                <div class="list-item-stats">
                   <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                      <span style="color:#ffcc00; font-weight:950; font-size:0.75rem;">⚔️${t.baseAtk}</span>
                      <span style="color:#2ecc71; font-weight:950; font-size:0.75rem;">❤️${t.basePv}</span>
                   </div>
                   <div style="display:flex; gap:3px; flex-wrap:wrap;">
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
            </div>
          `).join('')}
          <button id="btn-add-card" class="editor-btn-add">+ NOVA CARTA</button>
        </div>
      </div>

      <div class="editor-form-panel">
        <div class="editor-section-title">PROPRIEDADES DA CARTA</div>
        <div class="card-sub-tabs" style="display:flex; gap:8px; margin-bottom:20px; background:rgba(0,0,0,0.3); padding:6px; border-radius:12px; border:1px solid rgba(255,255,255,0.05); overflow-x:auto;">
          <button class="card-sub-tab ${this.cardSubMode === 'quick' ? 'active' : ''}" data-sub="quick">⚡ QUICK</button>
          <button class="card-sub-tab ${this.cardSubMode === 'avancado' ? 'active' : ''}" data-sub="avancado">📝 AVANÇADO</button>
          <button class="card-sub-tab ${this.cardSubMode === 'efeitos' ? 'active' : ''}" data-sub="efeitos">✨ EFEITOS & VISUAL</button>
          <button class="card-sub-tab ${this.cardSubMode === 'verso' ? 'active' : ''}" data-sub="verso">🔙 VERSO</button>
        </div>
        <div class="card-sub-tab-content" style="flex:1; overflow-y:auto; padding-right:10px;">
          ${this.renderSubTabContent()}
        </div>
        <div style="margin-top:20px; display:flex; gap:10px;">
           <button id="btn-delete-card" class="editor-btn-secondary" style="flex:0.5; color:#ff4444; border-color:#ff4444">DELETAR</button>
           <button id="btn-save-templates" class="editor-btn-primary" style="flex:1.5">💾 SALVAR NO CÓDIGO</button>
        </div>
      </div>

      <div class="editor-preview-panel">
         <div class="editor-section-title" style="display:flex; justify-content:space-between; align-items:center;">
            <span>ESTAÇÃO DE VISUALIZAÇÃO</span>
            <div class="preview-mode-toggle" style="display:flex; gap:5px; background:rgba(255,255,255,0.05); padding:4px; border-radius:8px;">
               <button class="mode-btn ${this.previewMode === 'card' ? 'active' : ''}" data-pm="card" title="Visualização Estática" style="font-size:0.6rem; padding:6px 12px; border-radius:6px; border:none; background:${this.previewMode === 'card' ? '#51c5ff' : 'transparent'}; color:${this.previewMode === 'card' ? '#000' : '#fff'}; cursor:pointer; font-weight:950; transition:0.2s;">🖼️ CARTÃO</button>
               <button class="mode-btn ${this.previewMode === 'board' ? 'active' : ''}" data-pm="board" title="Simulador Físico do Tabuleiro" style="font-size:0.6rem; padding:6px 12px; border-radius:6px; border:none; background:${this.previewMode === 'board' ? '#51c5ff' : 'transparent'}; color:${this.previewMode === 'board' ? '#000' : '#fff'}; cursor:pointer; font-weight:950; transition:0.2s;">⚔️ VISÃO TABULEIRO</button>
            </div>
         </div>
         <div id="preview-viewport" style="width:100%; min-height:500px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); border-radius:16px; border:1px solid rgba(255,255,255,0.06); padding:30px 20px 40px 20px; box-sizing:border-box; position:relative; overflow:hidden;">
             <div id="preview-wrapper" style="position:relative; transform-origin:center center; width:100%;"></div>
         </div>
         <div style="margin-top:16px; width:100%; display:flex; flex-direction:column; align-items:center; gap:12px;">
             <div id="secondary-previews" style="display:${this.previewMode === 'board' ? 'none' : 'flex'}; gap:60px; margin-top:30px; justify-content:center; align-items:flex-start; width:100%; border-top:1px solid rgba(255,255,255,0.05); padding-top:20px;">
                <div style="display:flex; flex-direction:column; align-items:center; gap:10px;">
                   <span style="font-size:0.65rem; color:#ffd700; font-weight:950; letter-spacing:2px; text-shadow:0 0 10px rgba(255,215,0,0.3);">MÃO</span>
                   <div id="preview-hand" style="width:100px; position:relative;"></div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center; gap:10px;">
                   <span style="font-size:0.65rem; color:#51c5ff; font-weight:950; letter-spacing:2px; text-shadow:0 0 10px rgba(81,197,255,0.3);">CAMPO</span>
                   <div id="preview-board" style="width:120px; position:relative;"></div>
                </div>
             </div>
             <button id="btn-test-special" class="editor-btn-secondary" style="border-color:#a335ee; color:#a335ee; font-weight:900; background:rgba(163,53,238,0.1); display:${t.specialAttack ? 'block' : 'none'}; padding:8px 30px;">▶️ TESTAR ATAQUE ESPECIAL</button>
         </div>
      </div>
      <style>
        .card-sub-tab {
          flex: 1;
          padding: 8px 6px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          color: rgba(255,255,255,0.4);
          font-size: 0.6rem;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
          transition: 0.2s;
          letter-spacing: 0.5px;
        }
        .card-sub-tab:hover {
          color: #fff;
          background: rgba(255,255,255,0.05);
        }
        .card-sub-tab.active {
          background: #51c5ff;
          color: #000;
          box-shadow: 0 4px 12px rgba(81, 197, 255, 0.3);
        }
      </style>
    `;
  }

  private renderSubTabContent(): string {
    if (this.cardSubMode === 'avancado') return this.renderTabAvancado();
    if (this.cardSubMode === 'efeitos') return this.renderTabEfeitos();
    if (this.cardSubMode === 'verso') return this.renderTabVerso();
    if (this.cardSubMode === 'quick') {
       const sub = new TabQuickManager({ 
          templates: this.templates, 
          abilities: this.abilities,
          classes: this.classes, 
          selectedIds: this.selectedClassIds,
          filter: this.quickFilter
        }, {
          boardRenderer: this.boardRenderer,
          saveTemplates: this.saveTemplates,
          saveClasses: (this as any).saveClasses || (() => {}),
          showToast: this.showToast,
          reRender: this.reRender
       });
       return sub.render();
    }
    return this.renderTabAvancado();
  }

  private renderTabVerso(): string {
    const t = this.templates[this.selectedIndex];
    if (!t) return '';
    const globalBack = getGlobalCardBack();
    const indBack = t.cardBack || '';
    const isCustomInd = !!t.cardBack;
    return `
      <!-- SEÇÃO 1: VERSO GERAL DO JOGO (GLOBAL PARA TABULEIRO, BOOSTERS E CAMPO) -->
      <div style="background:linear-gradient(180deg, rgba(255,215,0,0.08) 0%, rgba(0,0,0,0.4) 100%); border:1px solid rgba(255,215,0,0.3); border-radius:14px; padding:18px; margin-bottom:18px; box-shadow:0 8px 24px rgba(0,0,0,0.5);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <label style="color:#ffd700; font-size:0.8rem; font-weight:900; letter-spacing:1px; margin:0;">
            🌐 VERSO GERAL DO JOGO (PADRÃO GLOBAL)
          </label>
          <span style="font-size:0.65rem; font-weight:800; background:rgba(34,197,94,0.15); border:1px solid #22c55e; color:#4ade80; padding:2px 8px; border-radius:999px;">
            ATIVO NO JOGO
          </span>
        </div>
        <div style="font-size:0.65rem; opacity:0.75; line-height:1.4; margin-bottom:14px; color:#cbd5e1;">
          Este verso é aplicado automaticamente em <strong>todo o jogo</strong>: no <strong>Tabuleiro</strong> (monte de compra/deck e cartas viradas/ocultação), na abertura de <strong>Boosters</strong> (cartas 3D reveladas) e no verso de todas as cartas que não tenham arte própria.
        </div>
        
        <div style="display:flex; gap:16px; align-items:center;">
          <div id="global-verso-preview" style="width:110px; aspect-ratio:2/3; border-radius:10px; overflow:hidden; flex-shrink:0; background:url('${globalBack}') center/cover; border:2px solid #ffd700; box-shadow:0 8px 24px rgba(0,0,0,0.8), 0 0 16px rgba(255,215,0,0.25);"></div>
          
          <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
            <div style="font-size:0.65rem; font-family:monospace; color:#aaa; word-break:break-all; background:rgba(0,0,0,0.4); padding:6px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
              ${globalBack}
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <label class="editor-btn-primary" style="display:inline-flex; align-items:center; gap:6px; font-size:0.68rem; padding:8px 14px; cursor:pointer;">
                <span>📁 Carregar do PC</span>
                <input id="input-upload-global-back" type="file" accept="image/*" style="display:none;">
              </label>
              <button id="btn-pick-global-back" class="editor-btn-secondary" style="font-size:0.68rem; padding:8px 14px;">
                🖼️ Escolher da Galeria
              </button>
              <button id="btn-restore-default-global-back" class="editor-btn-secondary" style="font-size:0.68rem; padding:8px 12px; color:#94a3b8;">
                🔄 Restaurar Padrão Fantasia
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- SEÇÃO 2: VERSO INDIVIDUAL DESTA CARTA -->
      <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:16px; margin-bottom:15px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <label style="color:#38bdf8; font-size:0.75rem; font-weight:800; letter-spacing:1px; margin:0;">
            🃏 VERSO ESPECÍFICO DESTA CARTA (${this.templates[this.selectedIndex]?.name || 'Atual'})
          </label>
          <span style="font-size:0.65rem; font-weight:700; color:${isCustomInd ? '#38bdf8' : '#aaa'};">
            ${isCustomInd ? '🔷 Verso Exclusivo' : '⚪ Usando Verso Geral'}
          </span>
        </div>
        <div style="font-size:0.62rem; opacity:0.6; margin-bottom:12px;">
          Opcional. Permite que somente esta carta use uma arte de verso única quando for ocultada ou virada.
        </div>
        
        <div style="display:flex; gap:14px; align-items:flex-start;">
          <div id="verso-preview" style="width:90px; aspect-ratio:2/3; border-radius:10px; overflow:hidden; flex-shrink:0; background:url('${indBack || globalBack}') center/cover; border:2px solid ${isCustomInd ? '#38bdf8' : 'rgba(255,255,255,0.15)'}; box-shadow:0 6px 18px rgba(0,0,0,0.6);"></div>
          
          <div style="flex:1; display:flex; flex-direction:column; gap:10px;">
            <div class="form-group" style="margin:0;">
              <label style="font-size:0.65rem; color:#aaa;">URL personalizada (vazio = segue o Verso Geral)</label>
              <input type="text" id="inp-back-url" class="editor-input" value="${indBack}" placeholder="Vazio: herda o Verso Geral acima">
            </div>
            <div style="display:flex; gap:8px;">
              <button id="btn-pick-back" class="editor-btn-secondary" style="flex:1; font-size:0.68rem; padding:6px 10px;">
                🖼️ Importar / Galeria
              </button>
              ${isCustomInd ? `
                <button id="btn-clear-back" class="editor-btn-secondary" style="flex:1; font-size:0.68rem; color:#ef4444; border-color:#ef4444; padding:6px 10px;">
                  ✕ Usar Verso Geral
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderVfxSelector(currentId: string | undefined, _allowedCategories: string[], inputClass: string, dataIdx: string = ''): string {
      const filtered = VFX_REGISTRY; // User requested to show ALL effects anywhere
      const selId = currentId || filtered[0]?.id;
      const selVfx = filtered.find(v => v.id === selId) || filtered[0];
      
      const idxAttr = dataIdx !== '' ? `data-idx="${dataIdx}"` : '';

      return "<div class='form-group vfx-container' style='flex:1; position:relative; margin-top:10px;'>" +
             "<label style='font-size:0.55rem; opacity:0.6;'>ANIMAÇÃO (VFX)</label>" +
             "<div class='vfx-collapsible " + inputClass + "' " + idxAttr + " data-val='" + (selVfx?.id || '') + "' style='margin-top:5px; background:rgba(0,0,0,0.3); border-radius:10px; border:1px solid rgba(255,215,0,0.2); cursor:pointer; overflow:hidden;'>" +
             "<div class='vfx-selected-header' style='padding:10px; display:flex; align-items:center; gap:10px; background:rgba(255,215,0,0.05);'>" +
             "<span style='font-size:1.2rem;'>" + (selVfx?.icon || '✨') + "</span>" +
             "<div style='flex:1;'>" +
             "<div style='font-weight:950; font-size:0.75rem; color:#ffd700; letter-spacing:0.5px;'>" + (selVfx?.name || 'PADRÃO').toUpperCase() + "</div>" +
             "<div style='font-size:0.55rem; opacity:0.6;'>Clique para mudar...</div>" +
             "</div>" +
             "<button class='btn-test-vfx editor-btn-secondary' data-vfx='" + (selVfx?.id || '') + "' style='padding:4px 8px; font-size:0.6rem; border-color:#ffd700; color:#ffd700; border-radius:6px; z-index:2;'>👁️ TESTAR</button>" +
             "<span style='font-size:0.6rem; opacity:0.4; margin-left:5px;'>▼</span>" +
             "</div>" +
             "<div class='vfx-options-scroll' style='display:none; max-height:220px; overflow-y:auto; border-top:1px solid rgba(255,255,255,0.05); background:rgba(0,0,0,0.6);'>" +
               filtered.map(v => {
                   const isSel = v.id === selVfx?.id;
                   const bg = isSel ? 'rgba(255,215,0,0.1)' : 'transparent';
                   const color = isSel ? '#ffd700' : '#fff';
                   return "<div class='vfx-option " + (isSel ? "active" : "") + "' data-vfx-id='" + v.id + "' style='padding:10px; border-bottom:1px solid rgba(255,255,255,0.03); transition:0.2s; background:" + bg + ";'>" +
                            "<div style='display:flex; align-items:center; gap:10px;'>" +
                              "<span style='font-size:1.1rem;'>" + v.icon + "</span>" +
                              "<div style='flex:1;'>" +
                                "<div style='font-weight:950; font-size:0.7rem; color:" + color + "; letter-spacing:0.5px;'>" + v.name.toUpperCase() + "</div>" +
                                "<div style='font-size:0.6rem; opacity:0.7; line-height:1.4; margin-top:2px;'>" + v.description + "</div>" +
                              "</div></div></div>";
               }).join('') + 
             "</div></div></div>";
  }

  private renderTabAvancado(): string {
    const t = this.templates[this.selectedIndex];
    const attacks = t?.attacks || [];
    return `
      <div style="background:rgba(255,215,0,0.05); padding:12px; border-radius:12px; border:1px solid #ffd700; margin-bottom:15px; display:flex; flex-direction:column; gap:10px;">
        <span style="font-weight:900; color:#ffd700; font-size:0.7rem; letter-spacing:1px;">🎲 GERAR PROPRIEDADES RANDOM</span>
        <div style="display:flex; gap:8px;">
           <button id="btn-gen-common" class="editor-btn-secondary" style="flex:1; font-size:0.6rem; padding:8px;">⬜ COMUM</button>
           <button id="btn-gen-rare" class="editor-btn-secondary" style="flex:1; font-size:0.6rem; padding:8px; border-color:#51c5ff; color:#51c5ff;">🔷 RARA</button>
           <button id="btn-gen-epic" class="editor-btn-secondary" style="flex:1; font-size:0.6rem; padding:8px; border-color:#a335ee; color:#a335ee;">🔮 ÉPICA</button>
        </div>
      </div>
      <div class="form-group">
        <label>Nome da Carta</label>
        <input type="text" id="inp-name" class="editor-input" value="${t?.name || ''}">
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:1.5">
          <label style="color:#51c5ff;">Custo Invoc. (💎)</label>
          <input type="number" id="inp-mana" class="editor-input" value="${t?.manaCost || 1}">
        </div>
        <div class="form-group" style="flex:1.5">
          <label style="color:#ffaa00;">Estamina (⚡)</label>
          <input type="number" id="inp-stam" class="editor-input" value="${t?.staminaCost || 1}">
        </div>
        <div class="form-group" style="flex:2">
          <label>Ataque Base (ATK)</label>
          <input type="number" id="inp-atk" class="editor-input" value="${t?.baseAtk || 10}">
        </div>
        <div class="form-group" style="flex:2">
          <label>Vida Base (PV)</label>
          <input type="number" id="inp-pv" class="editor-input" value="${t?.basePv || 10}">
        </div>
      </div>

      <!-- PARRY & IMMERSIVE SECTION -->
      <div style="margin-top:15px; background:rgba(46,204,113,0.03); padding:12px; border-radius:12px; border:1px solid rgba(46,204,113,0.2); display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; flex-direction:column; gap:4px;">
                  <span style="font-weight:900; color:#2ecc71; font-size:0.7rem; letter-spacing:1px;">🛡️ DEFESA TÁTICA: PARRY</span>
                  <span style="font-size:0.55rem; color:rgba(255,255,255,0.4); font-weight:900;">HABILITA O QTE DE REFLEXO QUANDO ESTA CARTA DEFENDE</span>
              </div>
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.7rem; font-weight:950; color:#fff;">
                  <input type="checkbox" id="inp-parry-enabled" ${t.parry && t.parry > 0 ? 'checked' : ''} style="transform:scale(1.3);"> ATIVAR
              </label>
          </div>
          
          <div style="height:1px; background:rgba(255,255,255,0.05);"></div>

          <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; flex-direction:column; gap:4px;">
                  <span style="font-weight:900; color:#51c5ff; font-size:0.7rem; letter-spacing:1px;">🎥 MODO IMERSIVO (VIEWER)</span>
                  <span style="font-size:0.55rem; color:rgba(255,255,255,0.4); font-weight:900;">HUD INTERNO (ARTE FULL) VS HUD EXTERNO (PADRÃO)</span>
              </div>
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.7rem; font-weight:950; color:#fff;">
                  <input type="checkbox" id="inp-immersive-enabled" ${t.immersiveMode ? 'checked' : ''} style="transform:scale(1.3);"> ATIVAR
              </label>
          </div>
      </div>
      <div style="margin-top:15px; background:rgba(255,255,255,0.03); padding:15px; border-radius:12px; border:1px solid rgba(255,255,255,0.1);">
        <label style="color:#51c5ff; font-weight:900; font-size:0.75rem; margin-bottom:15px; display:block; letter-spacing:1px;">⚔️ GESTÃO DE ATAQUES (1-3)</label>
        <div id="attacks-list" style="display:flex; flex-direction:column; gap:12px;">
          ${[0, 1, 2].map(i => {
            const atk = attacks[i];
            const has = !!atk;
            const isEnc = has && atk.type === 'enchantment';

            return `
              <div class="attack-entry" data-idx="${i}" style="background:${has ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)'}; padding:12px; border-radius:10px; border:1px solid ${has ? 'rgba(81,197,255,0.3)' : '#333'};">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:0.6rem; color:${has ? '#51c5ff' : '#666'}; font-weight:900; letter-spacing:1.5px;">HABILIDADE #${i+1}</span>
                  ${has 
                    ? `<button class="btn-del-atk" data-idx="${i}" style="background:none; border:none; color:#ff4444; font-size:0.65rem; cursor:pointer; font-weight:900;">&times; REMOVER</button>`
                    : `<button class="btn-add-atk" data-idx="${i}" style="background:#51c5ff; border:none; border-radius:4px; color:#000; font-size:0.55rem; padding:4px 10px; font-weight:900; cursor:pointer;">+ ADICIONAR</button>`
                  }
                </div>
                ${has ? `
                  <!-- TIPO TOGGLE -->
                  <div style="display:flex; gap:5px; margin-top:10px; background:rgba(0,0,0,0.3); padding:4px; border-radius:8px;">
                    <button class="atk-type-btn ${!isEnc ? 'active' : ''}" data-idx="${i}" data-type="damage" style="flex:1; font-size:0.55rem; padding:4px; border:none; border-radius:4px; cursor:pointer; background:${!isEnc ? '#51c5ff' : 'transparent'}; color:${!isEnc ? '#000' : '#888'}; font-weight:900;">⚔️ DANO</button>
                    <button class="atk-type-btn ${isEnc ? 'active' : ''}" data-idx="${i}" data-type="enchantment" style="flex:1; font-size:0.55rem; padding:4px; border:none; border-radius:4px; cursor:pointer; background:${isEnc ? '#51c5ff' : 'transparent'}; color:${isEnc ? '#000' : '#888'}; font-weight:900;">🔮 ENCANTAMENTO</button>
                  </div>

                  <div class="form-row" style="margin-top:10px;">
                    <div class="form-group" style="flex:2">
                       <label style="font-size:0.55rem; opacity:0.6;">NOME</label>
                       <input type="text" class="editor-input inp-atk-name" data-idx="${i}" value="${atk.name}" placeholder="Ex: Golpe Sombrio">
                    </div>
                    ${!isEnc ? `
                    <div class="form-group" style="flex:1">
                       <label style="font-size:0.55rem; opacity:0.6;">DANO</label>
                       <input type="number" class="editor-input inp-atk-dmg" data-idx="${i}" value="${atk.damage}">
                    </div>
                    ${this.renderVfxSelector(atk.vfxId, ['impact'], 'inp-atk-vfx', i.toString())}
                    ` : `
                    <div class="form-group" style="flex:1.5; position:relative;">
                       <label style="font-size:0.55rem; opacity:0.6;">ENCANTAMENTO</label>
                       
                       <!-- COLLAPSIBLE CUSTOM SELECTOR -->
                       <div class="enc-collapsible" data-idx="${i}" style="margin-top:5px; background:rgba(0,0,0,0.3); border-radius:10px; border:1px solid rgba(81,197,255,0.2); cursor:pointer; overflow:hidden;">
                         
                         <!-- CURRENTLY SELECTED (Header) -->
                         <div class="enc-selected-header" style="padding:10px; display:flex; align-items:center; gap:10px; background:rgba(81,197,255,0.05);">
                           <span style="font-size:1rem;">${ENCHANTMENT_REGISTRY.find(e => e.id === atk.enchantment?.id)?.icon || '🔮'}</span>
                           <div style="flex:1;">
                             <div style="font-weight:950; font-size:0.75rem; color:#51c5ff; letter-spacing:0.5px;">${(ENCHANTMENT_REGISTRY.find(e => e.id === atk.enchantment?.id)?.name || 'SELECIONAR').toUpperCase()}</div>
                             <div style="font-size:0.55rem; opacity:0.6;">Clique para mudar os efeitos...</div>
                           </div>
                           <span style="font-size:0.6rem; opacity:0.4;">▼</span>
                         </div>

                         <!-- OPTIONS LIST (Hidden by default via CSS toggle in bind) -->
                         <div class="enc-options-scroll" style="display:none; max-height:250px; overflow-y:auto; border-top:1px solid rgba(255,255,255,0.05); background:rgba(0,0,0,0.4);">
                           ${ENCHANTMENT_REGISTRY.map(e => {
                               const isSel = atk.enchantment?.id === e.id;
                               return `
                                 <div class="enc-option ${isSel ? 'active' : ''}" data-idx="${i}" data-enc-id="${e.id}" 
                                      style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.03); transition:0.2s; background:${isSel ? 'rgba(81,197,255,0.1)' : 'transparent'};">
                                   <div style="display:flex; align-items:center; gap:10px;">
                                     <span style="font-size:0.9rem;">${e.icon}</span>
                                     <div style="flex:1;">
                                       <div style="font-weight:950; font-size:0.75rem; color:${isSel ? '#51c5ff' : '#fff'}; letter-spacing:0.5px;">${e.name.toUpperCase()}</div>
                                       <div style="font-size:0.65rem; opacity:0.7; line-height:1.4; margin-top:3px;">${e.description}</div>
                                     </div>
                                   </div>
                                 </div>
                               `;
                           }).join('')}
                         </div>
                       </div>
                    </div>
                    ${this.renderVfxSelector(atk.vfxId, ['elemental', 'status'], 'inp-atk-vfx', i.toString())}
                    `}
                  </div>
                  
                  <div class="form-row" style="margin-top:8px;">
                    <div class="form-group" style="flex:1.5">
                       <label style="font-size:0.55rem; opacity:0.6;">RECURSO</label>
                       <select class="editor-input inp-atk-res" data-idx="${i}">
                         <option value="stamina" ${atk.costType === 'stamina' ? 'selected' : ''}>⚡ ESTAMINA</option>
                         <option value="mana" ${atk.costType === 'mana' ? 'selected' : ''}>💎 MANA</option>
                       </select>
                    </div>
                    <div class="form-group" style="flex:1">
                       <label style="font-size:0.55rem; opacity:0.6;">CUSTO</label>
                       <input type="number" class="editor-input inp-atk-cost" data-idx="${i}" value="${atk.cost}">
                    </div>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <div class="form-group" style="margin-top:20px;">
        <label>Raridade Preferencial</label>
        <select id="inp-rarity" class="editor-input">
          <option value="common" ${t?.preferredRarity === 'common' ? 'selected' : ''}>⬜ Comum</option>
          <option value="rare" ${t?.preferredRarity === 'rare' ? 'selected' : ''}>🔷 Raro (+5%)</option>
          <option value="epic" ${t?.preferredRarity === 'epic' ? 'selected' : ''}>🔮 Épico (+12%)</option>
          <option value="legendary" ${t?.preferredRarity === 'legendary' ? 'selected' : ''}>⭐ Lendário (+20%)</option>
        </select>
      </div>

      <div class="form-group" style="margin-top:20px;">
        <label>Classe da Carta</label>
        <select id="inp-class" class="editor-input">
          <option value="" ${!t?.classId ? 'selected' : ''}>— Nenhuma —</option>
          ${this.classes.map(c => `
            <option value="${c.id}" ${t?.classId === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>
          `).join('')}
        </select>
      </div>

      <div class="form-group" style="margin-top:20px; background:rgba(81,197,255,0.05); padding:15px; border-radius:12px; border:1px solid rgba(81,197,255,0.2);">
        <label style="color:#51c5ff; font-weight:900; font-size:0.75rem; letter-spacing:1px;">✨ HABILIDADE PASSIVA</label>
        <select id="inp-ability" class="editor-input" style="margin-top:10px;">
          <option value="none" ${t?.abilityId === 'none' || !t?.abilityId ? 'selected' : ''}>🚫 Nenhuma</option>
          ${this.abilities.map(a => `
            <option value="${a.id}" ${t?.abilityId === a.id ? 'selected' : ''}>${a.icon} ${a.name}</option>
          `).join('')}
        </select>
        <p style="font-size:0.65rem; color:#aaa; margin-top:8px; font-style:italic; line-height:1.4;">
          ${t?.abilityId && t.abilityId !== 'none' ? this.abilities.find(a => a.id === t.abilityId)?.description || '' : 'Nenhum efeito passivo selecionado.'}
        </p>
        ${this.renderVfxSelector(t?.abilityVfxId, ['aura', 'cast'], 'inp-ability-vfx')}
      </div>
      <div style="margin-top:15px; background:linear-gradient(135deg, rgba(120,0,255,0.08), rgba(255,165,0,0.08)); padding:15px; border-radius:12px; border:1px solid rgba(163,53,238,0.4);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <label style="color:#a335ee; font-weight:900; font-size:0.75rem; letter-spacing:1px; margin:0;">✨ ATAQUE ESPECIAL</label>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:0.55rem; opacity:0.6;">DURAÇÃO DA CENA:</span>
            <input type="number" id="inp-special-duration" step="0.1" style="width:50px; background:rgba(0,0,0,0.3); border:1px solid #a335ee; color:#fff; font-size:0.65rem; padding:2px 4px; border-radius:4px; font-weight:900;" value="${t?.specialAttack?.duration || 4.5}" title="Tempo total da animação em segundos">
            <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
              <input type="checkbox" id="inp-special-enabled" style="accent-color:#a335ee;" ${t?.specialAttack ? 'checked' : ''}>
              <span style="font-size:0.6rem; color:#a335ee; font-weight:900;">ATIVO</span>
            </label>
          </div>
        </div>

        <div id="special-attack-fields" style="display:${t?.specialAttack ? 'flex' : 'none'}; flex-direction:column; gap:10px;">
          <div class="form-row">
            <div class="form-group" style="flex:2">
              <label style="font-size:0.55rem; opacity:0.6;">NOME DO ATAQUE</label>
              <input type="text" id="inp-special-name" class="editor-input" value="${t?.specialAttack?.name || 'ATAQUE DEFINITIVO'}" placeholder="Ex: Destruição Final">
            </div>
            <div class="form-group" style="flex:1">
              <label style="font-size:0.55rem; opacity:0.6;">DANO</label>
              <input type="number" id="inp-special-dmg" class="editor-input" value="${t?.specialAttack?.damage || 0}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group" style="flex:1.5">
              <label style="font-size:0.55rem; opacity:0.6;">RECURSO</label>
              <select id="inp-special-res" class="editor-input">
                <option value="stamina" ${(!t?.specialAttack || t?.specialAttack?.costType === 'stamina') ? 'selected' : ''}>⚡ ESTAMINA</option>
                <option value="mana" ${t?.specialAttack?.costType === 'mana' ? 'selected' : ''}>💎 MANA</option>
              </select>
            </div>
            <div class="form-group" style="flex:1">
              <label style="font-size:0.55rem; opacity:0.6;">CUSTO</label>
              <input type="number" id="inp-special-cost" class="editor-input" value="${t?.specialAttack?.cost || 9}">
            </div>
          </div>
          <div class="form-group">
            <label style="font-size:0.55rem; opacity:0.6;">DESCRIÇÃO (exibida na tela especial)</label>
            <input type="text" id="inp-special-desc" class="editor-input" value="${t?.specialAttack?.description || ''}" placeholder="Ex: Uma força devastadora que consome tudo...">
          </div>
          ${this.renderVfxSelector(t?.specialAttack?.vfxId, ['ultimate'], 'inp-special-vfx')}

          <!-- MODO DE CINEMÁTICA: VÍDEO OU PARALLAX -->
          <div style="background:rgba(0,0,0,0.3); border-radius:10px; padding:12px; border:1px solid rgba(255,0,85,0.2); margin-top:5px;">
             <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <label style="color:#ff0055; font-size:0.65rem; font-weight:950; letter-spacing:1px;">🎬 MODO DE CINEMÁTICA (EXCLUSIVO)</label>
                <div style="display:flex; gap:4px; background:rgba(0,0,0,0.5); padding:3px; border-radius:8px;">
                   <button class="mode-cine-btn ${t?.specialAttack?.mode === 'parallax' ? '' : 'active'}" data-mode="video" style="font-size:0.5rem; padding:4px 8px; border:none; border-radius:6px; cursor:pointer; font-weight:900; background:${t?.specialAttack?.mode === 'parallax' ? 'transparent' : '#ff0055'}; color:${t?.specialAttack?.mode === 'parallax' ? '#888' : '#000'}; transition:0.2s;">📹 VÍDEO</button>
                   <button class="mode-cine-btn ${t?.specialAttack?.mode === 'parallax' ? 'active' : ''}" data-mode="parallax" style="font-size:0.5rem; padding:4px 8px; border:none; border-radius:6px; cursor:pointer; font-weight:900; background:${t?.specialAttack?.mode === 'parallax' ? '#51c5ff' : 'transparent'}; color:${t?.specialAttack?.mode === 'parallax' ? '#000' : '#888'}; transition:0.2s;">🌌 PARALLAX</button>
                </div>
             </div>

             <div id="cine-video-fields" style="display:${t?.specialAttack?.mode === 'parallax' ? 'none' : 'block'};">
                <div style="display:flex; gap:8px;">
                   <input type="text" id="inp-special-video" class="editor-input" style="flex:1" value="${t?.specialAttack?.videoUrl || ''}" placeholder="/assets/videos/ult_attack.mp4">
                   <button id="btn-pick-special-video" class="editor-btn-secondary" style="padding:0 12px; border-color:#ff0055; color:#ff0055;">📁</button>
                </div>
                <div style="font-size:0.55rem; color:#aaa; margin-top:8px;">
                   ${t?.specialAttack?.videoUrl ? `🎞️ Duração detectada: <span style="color:#ff0055; font-weight:900;">${t?.specialAttack?.duration || 4.5}s</span> (Personalize acima)` : 'Sua composição será baseada em vídeo Full Screen.'}
                </div>
             </div>
             <div id="cine-parallax-msg" style="display:${t?.specialAttack?.mode === 'parallax' ? 'block' : 'none'}; font-size:0.55rem; color:#aaa;">
                🌌 A cinemática usará as <span style="color:#51c5ff; font-weight:950;">CAMADAS PARALLAX</span> configuradas abaixo para criar uma cena dinâmica de 4,5s.
             </div>
          </div>
        </div>
      </div>

      <!-- SEÇÃO 4: PARALLAX (MULTICAMADAS) -->
      <div style="margin-top:20px; background:rgba(255,215,0,0.03); border:1px solid rgba(255,215,0,0.15); border-radius:12px; padding:15px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
              <div style="color:#ffd700; font-weight:900; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px;">🌌 CAMADAS PARALLAX</div>
              <button id="btn-add-parallax" class="editor-btn-secondary" style="font-size:0.55rem; padding:4px 10px; border-color:#ffd700; color:#ffd700;">+ ADD CAMADA</button>
          </div>
          
          <div id="parallax-list" style="display:flex; flex-direction:column; gap:12px; margin-top:10px;">
            ${(t.parallaxLayers || []).map((ly: any, i: number) => `
              <div class="parallax-layer-card" data-idx="${i}" style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,215,0,0.15); border-radius:12px; padding:15px; position:relative; animation:slideInUp 0.3s ease;">
                 <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px;">
                    <div style="color:#ffd700; font-weight:950; font-size:0.65rem; text-transform:uppercase; letter-spacing:1px;">🛡️ CAMADA #${i+1}</div>
                    <button class="btn-del-parallax" data-idx="${i}" style="background:rgba(255,0,0,0.1); border:1px solid #ff4444; color:#ff4444; border-radius:6px; width:24px; height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:1.1rem;">&times;</button>
                 </div>

                 <div class="form-group">
                    <label>URL / Imagem</label>
                    <div style="display:flex; gap:8px;">
                       <input type="text" class="editor-input inp-parallax-url" data-idx="${i}" value="${ly.url || ''}">
                       <button class="btn-pick-parallax-img editor-btn-secondary" data-idx="${i}" style="padding:0 12px;">📁</button>
                    </div>
                 </div>

                 <div class="form-row" style="margin-top:12px;">
                    <div class="form-group" style="flex:1">
                       <label>Z-Index</label>
                       <input type="number" class="editor-input inp-parallax-z" data-idx="${i}" value="${ly.z}">
                    </div>
                    <div class="form-group" style="flex:1">
                       <label>Velocidade (Ratio)</label>
                       <input type="number" step="0.05" class="editor-input inp-parallax-speed" data-idx="${i}" value="${ly.speed || 1}">
                    </div>
                 </div>

                 <div class="form-row" style="margin-top:12px;">
                    <div class="form-group" style="flex:1">
                       <label>Escala (${ly.scale || 1}x)</label>
                       <input type="range" class="inp-parallax-scale" data-idx="${i}" min="0.1" max="5" step="0.1" value="${ly.scale || 1}">
                    </div>
                    <div class="form-group" style="flex:1">
                       <label>Opacidade (${Math.round((ly.opacity || 1) * 100)}%)</label>
                       <input type="range" class="inp-parallax-opacity" data-idx="${i}" min="0" max="1" step="0.05" value="${ly.opacity || 1}">
                    </div>
                 </div>

                 <div class="form-row" style="margin-top:12px;">
                    <div class="form-group" style="flex:1">
                       <label>Anim. Preset</label>
                       <select class="editor-input inp-parallax-animation" data-idx="${i}">
                          <option value="none" ${ly.animation === 'none' ? 'selected' : ''}>NENHUM</option>
                          <option value="sway" ${ly.animation === 'sway' || !ly.animation ? 'selected' : ''}>SWAY (BALANÇO)</option>
                          <option value="zoom" ${ly.animation === 'zoom' ? 'selected' : ''}>ZOOM (IN/OUT)</option>
                          <option value="pulse" ${ly.animation === 'pulse' ? 'selected' : ''}>PULSE (PULSAR)</option>
                          <option value="float" ${ly.animation === 'float' ? 'selected' : ''}>FLOAT (FLUTUAR)</option>
                          <option value="slide" ${ly.animation === 'slide' ? 'selected' : ''}>SLIDE (DESLIZAR)</option>
                       </select>
                    </div>
                    <div class="form-group" style="flex:1">
                       <label>Intensidade (${Math.round((ly.animationIntensity ?? 1) * 100)}%)</label>
                       <input type="range" class="inp-parallax-intensity" data-idx="${i}" min="0.1" max="2" step="0.1" value="${ly.animationIntensity ?? 1}">
                    </div>
                 </div>

                 <div class="form-row" style="margin-top:12px;">
                    <div class="form-group" style="flex:1">
                       <label>Offset Inicial X / Y</label>
                       <div style="display:flex; gap:4px;">
                          <input type="number" class="editor-input inp-parallax-x" data-idx="${i}" value="${ly.initialX || 0}" placeholder="X">
                          <input type="number" class="editor-input inp-parallax-y" data-idx="${i}" value="${ly.initialY || 0}" placeholder="Y">
                       </div>
                    </div>
                    <div class="form-group" style="flex:1">
                       <label>Blend Mode</label>
                       <select class="editor-input inp-parallax-blend" data-idx="${i}">
                          ${['normal', 'multiply', 'screen', 'overlay', 'color-dodge', 'lighten', 'hard-light'].map(m => `<option value="${m}" ${ly.blendMode === m ? 'selected' : ''}>${m.toUpperCase()}</option>`).join('')}
                       </select>
                    </div>
                 </div>

                 <div class="form-group" style="margin-top:12px;">
                    <label>Filtro Aplicado</label>
                    <select class="editor-input inp-parallax-filter" data-idx="${i}">
                       <option value="none" ${!ly.imageFilter ? 'selected' : ''}>Nenhum</option>
                       <option value="blur(4px)" ${ly.imageFilter === 'blur(4px)' ? 'selected' : ''}>Blur Suave</option>
                       <option value="brightness(1.5)" ${ly.imageFilter === 'brightness(1.5)' ? 'selected' : ''}>Brilho Intenso</option>
                       <option value="grayscale(1)" ${ly.imageFilter === 'grayscale(1)' ? 'selected' : ''}>P&B (Mono)</option>
                       <option value="hue-rotate(90deg)" ${ly.imageFilter === 'hue-rotate(90deg)' ? 'selected' : ''}>Hue Shift</option>
                    </select>
                 </div>
              </div>
            `).join('')}
          </div>
      </div>
      <div class="form-group" style="margin-top:20px;">
        <label>Lore / Flavor Text</label>
        <textarea id="inp-flavor" class="editor-input" rows="3" style="resize:vertical">${t?.flavorText || ''}</textarea>
      </div>
    `;
  }

  private renderTabEfeitos(): string {
    const t = this.templates[this.selectedIndex];
    const p = t.particles || { type: 'none', color: '#ffaa00', count: 20 };
    
    return `
      <!-- SEÇÃO 1: MÍDIA & BASE -->
      <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:15px; margin-bottom:15px;">
          <div style="color:#fff; font-weight:900; font-size:0.75rem; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px;">🖼️ MÍDIA DA CARTA</div>
          <div class="form-group">
            <label>URL Imagem ou Vídeo</label>
            <div style="display:flex; gap:8px;">
               <input type="text" class="editor-input" id="inp-media-url" style="flex:1" value="${t.image || t.animationUrl || ''}">
               <button id="btn-pick-card-media" class="editor-btn-secondary" style="padding:0 12px;">📁</button>
            </div>
          </div>

          <div class="form-row" style="margin-top:10px;">
            <div class="form-group" style="flex:1">
               <label>Cor da Borda</label>
               <input type="color" id="inp-border-color" class="editor-input" value="${t.borderColor || '#ffffff'}">
            </div>
            <div class="form-group" style="flex:1">
               <label>Borda (${t.borderWidth || 1}px)</label>
               <input type="range" id="inp-border-width" min="0" max="10" value="${t.borderWidth || 1}">
            </div>
          </div>

          <div class="form-row" style="margin-top:10px;">
            <div class="form-group" style="flex:1">
               <label>Cor do Glow</label>
               <input type="color" id="inp-glow-color" class="editor-input" value="${t.glowColor || '#51c5ff'}">
            </div>
            <div class="form-group" style="flex:1">
               <label>Glow (${t.glowIntensity || 10}px)</label>
               <input type="range" id="inp-glow-intensity" min="0" max="50" value="${t.glowIntensity || 10}">
            </div>
          </div>
      </div>
      <!-- SEÇÃO 1: UNIFICAÇÃO DE ANIMAÇÕES & EFEITOS -->
      <div style="background:rgba(81,197,255,0.05); border:1px solid rgba(81,197,255,0.2); border-radius:12px; padding:15px; margin-bottom:15px;">
          <div style="color:#51c5ff; font-weight:900; font-size:0.75rem; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px;">✨ SELETOR DE EFEITOS & ANIMAÇÕES</div>
          
          <div class="form-group">
            <label>Tipo de Efeito Animado</label>
            <select id="inp-card-filter-unified" class="editor-input">
               <optgroup label="--- FILTROS ANIMADOS ---">
                  <option value="none" ${(!t.imageFilter || t.imageFilter === 'none') && !t.reflectiveGlow && p.type === 'none' ? 'selected' : ''}>Nenhum</option>
                  <option value="vhs" ${t.imageFilter === 'vhs' ? 'selected' : ''}>📼 Filtro VHS (Glitch & Scanlines)</option>
                  <option value="chroma" ${t.imageFilter === 'chroma' ? 'selected' : ''}>🌈 Chroma Shift (Abelha Cromática)</option>
                  <option value="wave" ${t.imageFilter === 'wave' ? 'selected' : ''}>🌊 Wave Blur (Distorção Aquática)</option>
                  <option value="pulse_hue" ${t.imageFilter === 'pulse_hue' ? 'selected' : ''}>💓 Pulse Hue (Pulsação de Cor)</option>
               </optgroup>
               <optgroup label="--- PARTÍCULAS AMBIENTAIS ---">
                  <option value="sparks" ${p.type === 'sparks' ? 'selected' : ''}>🔥 Fagulhas de Alma (Soul Sparks)</option>
                  <option value="fog" ${p.type === 'fog' ? 'selected' : ''}>🌫️ Névoa Atmosférica (Fog)</option>
                  <option value="swirl" ${p.type === 'swirl' ? 'selected' : ''}>🌀 Redemoinho Mágico (Magic Swirl)</option>
               </optgroup>
               <optgroup label="--- EFEITOS DE SUPERFÍCIE ---">
                  <option value="gloss" ${t.reflectiveGlow ? 'selected' : ''}>✨ Brilho Reflexo (Premium Gloss)</option>
               </optgroup>
            </select>
          </div>

          <div class="form-row" id="effect-intensity-row" style="margin-top:10px; display:${t.imageFilter && t.imageFilter !== 'none' ? 'flex' : 'none'};">
            <div class="form-group" style="flex:1">
               <label>Intensidade do Filtro (${t.imageFilterIntensity || 50}%)</label>
               <input type="range" id="inp-card-filter-intensity" min="0" max="100" value="${t.imageFilterIntensity || 50}">
            </div>
          </div>

          <div class="form-row" id="particle-options-row" style="margin-top:10px; display:${p.type !== 'none' ? 'flex' : 'none'};">
            <div class="form-group" style="flex:1">
               <label>Cor das Partículas</label>
               <input type="color" id="inp-particles-color" class="editor-input" value="${p.color || '#ffaa00'}">
            </div>
            <div class="form-group" style="flex:1">
               <label>Densidade (${p.count || 20})</label>
               <input type="range" id="inp-particles-count" min="5" max="100" value="${p.count || 20}">
            </div>
          </div>
      </div>

      <!-- SEÇÃO 2: PADRÕES VISUAIS (SVG) -->
      <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:15px; margin-bottom:15px;">
          <div style="color:#fff; font-weight:900; font-size:0.75rem; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px;">🧬 PADRÕES ANIMADOS (SVG)</div>
          <div class="form-row">
            <div class="form-group" style="flex:1">
               <label>Tipo de Padrão</label>
               <select id="inp-card-pattern" class="editor-input">
                  <option value="" ${!t.patternType ? 'selected' : ''}>Nenhum</option>
                  <option value="pulse_grid" ${t.patternType === 'pulse_grid' ? 'selected' : ''}>Grade Pulsante</option>
                  <option value="neon_rings" ${t.patternType === 'neon_rings' ? 'selected' : ''}>Anéis Neon</option>
                  <option value="waves" ${t.patternType === 'waves' ? 'selected' : ''}>Ondas Marinhas</option>
                  <option value="stars" ${t.patternType === 'stars' ? 'selected' : ''}>Nebulosa Estelar</option>
                  <option value="lines" ${t.patternType === 'lines' ? 'selected' : ''}>Linhas Cinéticas</option>
                  <option value="hex" ${t.patternType === 'hex' ? 'selected' : ''}>Hexágonos Tech</option>
               </select>
            </div>
            <div class="form-group" style="flex:1">
               <label>Cor do Padrão</label>
               <input type="color" id="inp-card-pattern-color" class="editor-input" value="${t.patternColor || '#ffffff'}">
            </div>
          </div>
      </div>

      <!-- SEÇÃO 3: TIPOGRAFIA & FONTES -->
      <div style="background:rgba(255,215,0,0.05); border:1px solid rgba(255,215,0,0.2); border-radius:12px; padding:15px; margin-bottom:15px;">
          <div style="color:#ffd700; font-weight:900; font-size:0.75rem; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px;">🖋️ TIPOGRAFIA & TEXTO</div>
          <div class="form-group">
            <label>Família da Fonte</label>
            <div style="display:flex; flex-wrap:wrap; gap:8px; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px;">
               ${['Inter', 'Roboto', 'Outfit', 'Cinzel', 'MedievalSharp', 'Bebas Neue'].map(f => `
                 <button class="font-picker-btn ${t.fontFamily === f ? 'active' : ''}" data-font="${f}" style="font-family:'${f}'; padding:6px 12px; border-radius:6px; border:1px solid ${t.fontFamily === f ? '#ffd700' : 'rgba(255,255,255,0.1)'}; background:${t.fontFamily === f ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)'}; color:#fff; cursor:pointer; font-size:0.7rem;">${f}</button>
               `).join('')}
            </div>
          </div>
          <div class="form-row" style="margin-top:10px;">
             <div class="form-group" style="flex:1.5">
                <label>Cor Principal</label>
                <input type="color" id="inp-color-txt" class="editor-input" value="${t.fontColor || '#ffffff'}">
             </div>
             <div class="form-group" style="flex:1">
                <label>Tamanho (${t.fontSizeBase || 16})</label>
                <input type="number" id="inp-fsize" class="editor-input" value="${t.fontSizeBase || 16}">
             </div>
          </div>
      </div>
    `;
  }



  public bind(container: HTMLElement) {
    const t = this.templates[this.selectedIndex];
    if (!t) return;

    // Sub-Tabs Switching
    container.querySelectorAll('.card-sub-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setCardSubMode((btn as HTMLElement).dataset.sub!);
      });
    });

    // Preview Mode Toggle
    container.querySelectorAll('.mode-btn').forEach(btn => {
       btn.addEventListener('click', () => {
          this.setPreviewMode((btn as HTMLElement).dataset.pm!);
       });
    });

    // Switch Card in List
    container.querySelectorAll('.editor-list-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        this.setSelectedIndex(idx);
      });
    });

    // Add / Delete Card
    container.querySelector('#btn-add-card')?.addEventListener('click', () => {
      const newCard = JSON.parse(JSON.stringify(t));
      newCard.id = 'card_' + Date.now();
      newCard.name = 'Nova Carta';
      this.templates.push(newCard);
      this.setSelectedIndex(this.templates.length - 1);
    });

    container.querySelector('#btn-delete-card')?.addEventListener('click', () => {
      if (this.templates.length <= 1) {
        this.showToast('⚠️ Não é possível deletar a última carta!', '#ff4444');
        return;
      }
      this.templates.splice(this.selectedIndex, 1);
      this.setSelectedIndex(Math.max(0, this.selectedIndex - 1));
      this.showToast('🗑️ Carta deletada!');
    });

    container.querySelector('#btn-save-templates')?.addEventListener('click', () => this.saveTemplates());

    // Modo quick: delega os controles do formulario ao QuickManager.
    // (Lista, add, delete e save ja foram ligados acima e valem p/ todos os modos.)
    if (this.cardSubMode === 'quick') {
       const sub = new TabQuickManager({
          templates: this.templates,
          abilities: this.abilities,
          classes: this.classes,
          selectedIds: this.selectedClassIds,
          filter: this.quickFilter
       }, {
          boardRenderer: this.boardRenderer,
          saveTemplates: this.saveTemplates,
          saveClasses: (this as any).saveClasses || (() => {}),
          showToast: this.showToast,
          reRender: this.reRender
       });
       sub.bind(container);
       this.updatePreview();
       return;
    }

    // Verso da carta (Global e Individual)
    if (this.cardSubMode === 'verso') {
      const t = this.templates[this.selectedIndex];

      // ── GLOBAL CARD BACK HANDLERS ──
      const inputGlobalUpload = container.querySelector('#input-upload-global-back') as HTMLInputElement | null;
      inputGlobalUpload?.addEventListener('change', async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        this.showToast(`Enviando verso global: ${file.name}...`);
        try {
          const fd = new FormData();
          fd.append('media', file);
          const resp = await fetch('/api/upload-media', { method: 'POST', body: fd });
          let finalUrl = '';
          if (resp.ok) {
            const data = await resp.json();
            finalUrl = (data.urls && data.urls[0]) || data.url || `/cards/${file.name}`;
          } else {
            // Fallback FileReader
            finalUrl = await new Promise<string>((res) => {
              const r = new FileReader();
              r.onload = (ev) => res(ev.target?.result as string);
              r.readAsDataURL(file);
            });
          }
          setGlobalCardBack(finalUrl);
          this.showToast('🌟 Verso Geral do Jogo atualizado com sucesso!');
          this.reRender();
        } catch (err: any) {
          this.showToast('Erro ao carregar verso: ' + err.message, '#ef4444');
        }
      });

      container.querySelector('#btn-pick-global-back')?.addEventListener('click', () => {
        this.openMediaPicker((url) => {
          if (!url) return;
          setGlobalCardBack(url);
          this.showToast('🌟 Verso Geral do Jogo atualizado da galeria!');
          this.reRender();
        });
      });

      container.querySelector('#btn-restore-default-global-back')?.addEventListener('click', () => {
        setGlobalCardBack(DEFAULT_CARD_BACK);
        this.showToast('🔄 Verso Geral restaurado para o padrão fantasia!');
        this.reRender();
      });

      // ── INDIVIDUAL CARD BACK HANDLERS ──
      const urlInp = container.querySelector('#inp-back-url') as HTMLInputElement | null;
      const preview = container.querySelector('#verso-preview') as HTMLElement | null;
      urlInp?.addEventListener('input', () => {
        if (!t) return;
        const v = urlInp.value.trim();
        if (v) t.cardBack = v; else delete t.cardBack;
        if (preview) preview.style.backgroundImage = `url('${v || getGlobalCardBack()}')`;
      });

      container.querySelector('#btn-pick-back')?.addEventListener('click', () => {
        this.openMediaPicker(url => {
          if (!t) return;
          t.cardBack = url;
          this.showToast(`Arte de verso vinculada a ${t.name}!`);
          this.reRender();
        });
      });

      container.querySelector('#btn-clear-back')?.addEventListener('click', () => {
        if (!t) return;
        delete t.cardBack;
        this.showToast(`Carta ${t.name} agora utiliza o Verso Geral.`);
        this.reRender();
      });

      this.updatePreview();
      return;
    }

    const updateObj = () => {
      const t = this.templates[this.selectedIndex];
      if (!t) return;
      const nameInp = container.querySelector('#inp-name') as HTMLInputElement;
      if (nameInp) t.name = nameInp.value;
      const atkInp_ = container.querySelector('#inp-atk') as HTMLInputElement;
      if (atkInp_) t.baseAtk = parseInt(atkInp_.value) || 0;
      const pvInp_ = container.querySelector('#inp-pv') as HTMLInputElement;
      if (pvInp_) t.basePv = parseInt(pvInp_.value) || 0;
      const abiInp = container.querySelector('#inp-ability') as HTMLSelectElement;
      if (abiInp) t.abilityId = abiInp.value as any;
      const abiVfx = container.querySelector('.inp-ability-vfx') as HTMLElement;
      if (abiVfx) t.abilityVfxId = abiVfx.getAttribute('data-val') || undefined;
      const manaInp = container.querySelector('#inp-mana') as HTMLInputElement;
      if (manaInp) t.manaCost = parseInt(manaInp.value) || 1;
      const stamInp = container.querySelector('#inp-stam') as HTMLInputElement;
      if (stamInp) t.staminaCost = parseInt(stamInp.value) || 1;
      
      const parryEnabled = container.querySelector('#inp-parry-enabled') as HTMLInputElement;
      if (parryEnabled) t.parry = parryEnabled.checked ? 1 : 0;
      
      const immersiveEnabled = container.querySelector('#inp-immersive-enabled') as HTMLInputElement;
      if (immersiveEnabled) t.immersiveMode = immersiveEnabled.checked;
      
      const rarInp = container.querySelector('#inp-rarity') as HTMLSelectElement;
      if (rarInp) t.preferredRarity = rarInp.value as any;
      const classInp = container.querySelector('#inp-class') as HTMLSelectElement;
      if (classInp) t.classId = classInp.value;
      const flavorInp = container.querySelector('#inp-flavor') as HTMLTextAreaElement;
      if (flavorInp) t.flavorText = flavorInp.value;
      
      const urlInp = container.querySelector('#inp-media-url') as HTMLInputElement;
      if (urlInp) {
         const url = urlInp.value;
         const isVid = /\.(mp4|webm)$/i.test(url);
         if (isVid) { t.animationUrl = url; delete t.image; }
         else { t.image = url; delete t.animationUrl; }
      }

      const vStart = container.querySelector('#inp-vid-start') as HTMLInputElement;
      if (vStart) t.videoStart = parseFloat(vStart.value);
      const vEnd = container.querySelector('#inp-vid-end') as HTMLInputElement;
      if (vEnd) t.videoEnd = parseFloat(vEnd.value);

      // AESTHETICS (Border / Glow / Fonts)
      const fColor = container.querySelector('#inp-color-txt') as HTMLInputElement;
      if (fColor) t.fontColor = fColor.value;
      const fSize = container.querySelector('#inp-fsize') as HTMLInputElement;
      if (fSize) t.fontSizeBase = parseInt(fSize.value) || 16;
      const bColor = container.querySelector('#inp-border-color') as HTMLInputElement;
      if (bColor) t.borderColor = bColor.value;
      const gColor = container.querySelector('#inp-glow-color') as HTMLInputElement;
      if (gColor) t.glowColor = gColor.value;
      const bWidth = container.querySelector('#inp-border-width') as HTMLInputElement;
      if (bWidth) t.borderWidth = parseInt(bWidth.value) || 1;
      const gIntensity = container.querySelector('#inp-glow-intensity') as HTMLInputElement;
      if (gIntensity) t.glowIntensity = parseInt(gIntensity.value) || 10;
      
      const patType = container.querySelector('#inp-card-pattern') as HTMLSelectElement;
      if (patType) t.patternType = patType.value;
      const patColor = container.querySelector('#inp-card-pattern-color') as HTMLInputElement;
      if (patColor) t.patternColor = patColor.value;

      if (t.patternType) {
          const generateSvgPattern = (window as any).generateSvgPattern;
          if (generateSvgPattern) {
              t.patternOverlay = generateSvgPattern(t.patternType, t.patternColor || '#ffffff', 20);
          }
      } else {
          t.patternOverlay = '';
      }

      // Unified Effects (VHS, Chroma, Particles, Gloss)
      const filterUnified = container.querySelector('#inp-card-filter-unified') as HTMLSelectElement;
      if (filterUnified) {
         const val = filterUnified.value;
         t.imageFilter = 'none';
         t.reflectiveGlow = false;
         if (!t.particles) t.particles = { type: 'none', color: '#ffaa00', count: 20 };
         t.particles.type = 'none';

         if (['vhs', 'chroma', 'wave', 'pulse_hue'].includes(val)) t.imageFilter = val as any;
         else if (val === 'gloss') t.reflectiveGlow = true;
         else if (['sparks', 'fog', 'swirl'].includes(val)) t.particles.type = val as any;
      }

      // Parallax Persistence
      if (this.selectedParallaxLayerIdx !== null && t.parallaxLayers && t.parallaxLayers[this.selectedParallaxLayerIdx]) {
        const ly = t.parallaxLayers[this.selectedParallaxLayerIdx];
        const zInp = container.querySelector('#inp-parallax-z') as HTMLInputElement;
        if (zInp) ly.z = parseInt(zInp.value) || 1;
        const sInp = container.querySelector('#inp-parallax-speed') as HTMLInputElement;
        if (sInp) ly.speed = parseFloat(sInp.value) || 1;
        const scInp = container.querySelector('#inp-parallax-scale') as HTMLInputElement;
        if (scInp) ly.scale = parseFloat(scInp.value) || 1;
        const opInp = container.querySelector('#inp-parallax-opacity') as HTMLInputElement;
        if (opInp) ly.opacity = parseFloat(opInp.value) || 1;
        const xInp = container.querySelector('#inp-parallax-x') as HTMLInputElement;
        if (xInp) ly.initialX = parseInt(xInp.value) || 0;
        const yInp = container.querySelector('#inp-parallax-y') as HTMLInputElement;
        if (yInp) ly.initialY = parseInt(yInp.value) || 0;
        const blInp = container.querySelector('#inp-parallax-blend') as HTMLSelectElement;
        if (blInp) ly.blendMode = blInp.value;
        const fiInp = container.querySelector('#inp-parallax-filter') as HTMLSelectElement;
        if (fiInp) ly.imageFilter = fiInp.value;
      }

      this.updatePreview();
      this.updateListLabels();
    };


    container.querySelectorAll('.editor-input, input[type="checkbox"], input[type="range"]').forEach(inp => {
       inp.addEventListener('input', updateObj);
    });

    container.querySelector('#inp-ability')?.addEventListener('change', () => this.reRender());

    // Random Generation
    const genProps = (rarity: string) => {
        randomizeCard(t, rarity, this.abilities, this.classes);
        this.setCardSubMode('avancado'); // Ensure we stay in Avançado
        this.showToast(`🎲 PROPRIEDADES ${rarity.toUpperCase()} GERADAS!`, '#ffd700');
    };

    container.querySelector('#btn-gen-common')?.addEventListener('click', () => genProps('common'));
    container.querySelector('#btn-gen-rare')?.addEventListener('click', () => genProps('rare'));
    container.querySelector('#btn-gen-epic')?.addEventListener('click', () => genProps('epic'));

    container.querySelector('#btn-test-special')?.addEventListener('click', () => {
      this.playTestSpecial();
    });

    // Attacks Management
    container.querySelectorAll('.btn-add-atk, .btn-del-atk').forEach(btn => {
      btn.addEventListener('click', () => {
         const idx = parseInt((btn as HTMLElement).dataset.idx!);
         if (btn.classList.contains('btn-add-atk')) {
           if (!t.attacks) t.attacks = [];
           t.attacks[idx] = { type: 'damage', name: 'NOVO ATAQUE', damage: t.baseAtk, cost: 1, costType: 'stamina' };
         } else t.attacks.splice(idx, 1);
         this.reRender();
      });
    });

    // Toggle Attack Type
    container.querySelectorAll('.atk-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        const type = (btn as HTMLElement).dataset.type! as any;
        if (t.attacks[idx]) {
          t.attacks[idx].type = type;
          if (type === 'enchantment' && !t.attacks[idx].enchantment) {
            const def = ENCHANTMENT_REGISTRY[0];
            t.attacks[idx].enchantment = { id: def.id, value: def.defaultValue, turns: def.defaultTurns };
            t.attacks[idx].damage = 0;
            t.attacks[idx].cost = def.defaultCost;
            t.attacks[idx].costType = def.defaultResource;
            t.attacks[idx].name = def.name.toUpperCase();
          }
          this.reRender();
        }
      });
    });

    // Custom Enchantment Selector Toggle
    container.querySelectorAll('.enc-selected-header').forEach(header => {
       header.addEventListener('click', (e) => {
          e.stopPropagation();
          const parent = header.closest('.enc-collapsible') as HTMLElement;
          const list = parent.querySelector('.enc-options-scroll') as HTMLElement;
          const isVisible = list.style.display === 'block';
          
          // Close all others first
          container.querySelectorAll('.enc-options-scroll').forEach(el => (el as HTMLElement).style.display = 'none');
          
          list.style.display = isVisible ? 'none' : 'block';
       });
    });

    // Option Selection
    container.querySelectorAll('.enc-option').forEach(opt => {
       opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const atkIdx = parseInt((opt as HTMLElement).dataset.idx!);
          const encId = (opt as HTMLElement).dataset.encId!;
          if (t.attacks[atkIdx]) {
             const def = ENCHANTMENT_REGISTRY.find(e => e.id === encId);
             if (def) {
                t.attacks[atkIdx].enchantment = { id: encId, value: def.defaultValue, turns: def.defaultTurns };
                t.attacks[atkIdx].cost = def.defaultCost;
                t.attacks[atkIdx].costType = def.defaultResource;
                t.attacks[atkIdx].name = def.name.toUpperCase();
                this.reRender();
             }
          }
       });
    });

    // Custom VFX Selector Toggle
    container.querySelectorAll('.vfx-selected-header').forEach(header => {
       header.addEventListener('click', (e) => {
          // If the test button was clicked, don't toggle
          if ((e.target as HTMLElement).closest('.btn-test-vfx')) return;
          e.stopPropagation();
          const parent = header.closest('.vfx-collapsible') as HTMLElement;
          const list = parent.querySelector('.vfx-options-scroll') as HTMLElement;
          const isVisible = list.style.display === 'block';
          
          container.querySelectorAll('.vfx-options-scroll').forEach(el => (el as HTMLElement).style.display = 'none');
          list.style.display = isVisible ? 'none' : 'block';
       });
    });

    // VFX Option Selection
    container.querySelectorAll('.vfx-option').forEach(opt => {
       opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const vfxId = (opt as HTMLElement).dataset.vfxId!;
          const parent = opt.closest('.vfx-collapsible') as HTMLElement;
          parent.setAttribute('data-val', vfxId);
          
          if (parent.classList.contains('inp-atk-vfx')) updateAttacks();
          else if (parent.classList.contains('inp-special-vfx')) readSpecialAttack();
          else updateObj();

          this.reRender();
       });
    });

    // VFX Test Button
    container.querySelectorAll('.btn-test-vfx').forEach(btn => {
       btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const vfxId = (btn as HTMLElement).dataset.vfx!;
          const previewEl = document.getElementById('preview-wrapper');
          const viewport = document.getElementById('preview-viewport');
          if (previewEl && vfxId) {
             gsap.set(previewEl, { x: 0, y: 0, rotation: 0 });
             
             if (this.previewMode === 'board') {
                 const attacker = previewEl.querySelector('[data-idx="4"] .card-face') as HTMLElement;
                 const defender = previewEl.querySelector('[data-idx="1"] .card-face') as HTMLElement;
                 
                 if (attacker && defender) {
                     const atkR = attacker.getBoundingClientRect();
                     const defR = defender.getBoundingClientRect();
                     const dx = defR.left - atkR.left;
                     const dy = defR.top - atkR.top;
                     
                     // Play physical lunge
                     gsap.timeline()
                        .to(attacker, { y: -dy * 0.12, duration: 0.3, ease: 'back.in(2)' })
                        .to(attacker, { y: dy * 0.85, x: dx * 0.85, duration: 0.15, ease: 'power4.in', onComplete: () => {
                            playVFX(vfxId as any, defender, undefined, viewport || undefined);
                            // Board shake
                            gsap.to(previewEl, { x: 8, duration: 0.04, repeat: 7, yoyo: true, onComplete: () => { gsap.set(previewEl, { x: 0 }); } });
                        }})
                        .to(attacker, { y: 0, x: 0, duration: 0.4, delay: 0.4, ease: 'power2.out' });
                 } else {
                     playVFX(vfxId as any, previewEl, undefined, viewport || undefined);
                 }
             } else {
                 playVFX(vfxId as any, previewEl, undefined, viewport || undefined);
             }
          }
       });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
       container.querySelectorAll('.enc-options-scroll, .vfx-options-scroll').forEach(el => (el as HTMLElement).style.display = 'none');
    });

    const updateAttacks = () => {
       container.querySelectorAll('.attack-entry').forEach(entry => {
          const idx = parseInt((entry as HTMLElement).getAttribute('data-idx') || '-1');
          if (idx === -1 || !t.attacks[idx]) return;
          const a = t.attacks[idx];
          a.name = (entry.querySelector('.inp-atk-name') as HTMLInputElement).value;
          
          if (a.type === 'damage') {
            const dmgInp = entry.querySelector('.inp-atk-dmg') as HTMLInputElement;
            if (dmgInp) a.damage = parseInt(dmgInp.value) || 0;
          }
          
          const resSelect = entry.querySelector('.inp-atk-res') as HTMLSelectElement;
          if (resSelect) a.costType = resSelect.value as any;
          const costInp = entry.querySelector('.inp-atk-cost') as HTMLInputElement;
          if (costInp) a.cost = parseInt(costInp.value) || 1;
          const vfxDiv = container.querySelector(`.inp-atk-vfx[data-idx="${idx}"]`);
          if (vfxDiv) a.vfxId = vfxDiv.getAttribute('data-val') || undefined;
       });
       this.updatePreview();
       this.updateListLabels();
    };
    container.querySelectorAll('.inp-atk-name, .inp-atk-dmg, .inp-atk-res, .inp-atk-cost').forEach(inp => {
       inp.addEventListener('input', updateAttacks);
    });

    // Special Attack
    const specialToggle = container.querySelector('#inp-special-enabled') as HTMLInputElement;
    const specialFields = container.querySelector('#special-attack-fields') as HTMLElement;
    const readSpecialAttack = () => {
      if (!specialToggle || !specialToggle.checked) { t.specialAttack = undefined; return; }
      const name = (container.querySelector('#inp-special-name') as HTMLInputElement)?.value || 'ATAQUE DEFINITIVO';
      const dmg  = parseInt((container.querySelector('#inp-special-dmg') as HTMLInputElement)?.value) || 0;
      const res  = (container.querySelector('#inp-special-res') as HTMLSelectElement)?.value as 'stamina' | 'mana' || 'stamina';
      const cost = parseInt((container.querySelector('#inp-special-cost') as HTMLInputElement)?.value) || 9;
      const desc = (container.querySelector('#inp-special-desc') as HTMLInputElement)?.value || '';
      const vid  = (container.querySelector('#inp-special-video') as HTMLInputElement)?.value || '';
      const vfx  = container.querySelector('.inp-special-vfx')?.getAttribute('data-val') || undefined;
      const dur  = parseFloat((container.querySelector('#inp-special-duration') as HTMLInputElement)?.value) || 4.5;
      const mode = (container.querySelector('.mode-cine-btn.active') as HTMLElement)?.dataset.mode || 'video';
      
      t.specialAttack = { 
        name, damage: dmg, costType: res, cost, 
        description: desc, videoUrl: vid || undefined, 
        vfxId: vfx, duration: dur, mode: mode as any 
      };
      this.updatePreview();
    };
    // Cinematic Mode Toggles
    container.querySelectorAll('.mode-cine-btn').forEach(btn => {
       btn.addEventListener('click', () => {
          const mode = (btn as HTMLElement).dataset.mode!;
          container.querySelectorAll('.mode-cine-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          
          const vidFields = container.querySelector('#cine-video-fields') as HTMLElement;
          const parMsg = container.querySelector('#cine-parallax-msg') as HTMLElement;
          if (vidFields) vidFields.style.display = mode === 'video' ? 'block' : 'none';
          if (parMsg) parMsg.style.display = mode === 'video' ? 'none' : 'block';
          
          readSpecialAttack();
       });
    });

    specialToggle?.addEventListener('change', () => {
      if (specialFields) specialFields.style.display = specialToggle.checked ? 'flex' : 'none';
      readSpecialAttack();
      const btnTest = document.getElementById('btn-test-special');
      if (btnTest) btnTest.style.display = specialToggle.checked ? 'block' : 'none';
    });
    container.querySelectorAll('#inp-special-name, #inp-special-dmg, #inp-special-res, #inp-special-cost, #inp-special-desc, #inp-special-video, #inp-special-duration').forEach(inp => {
      inp.addEventListener('input', readSpecialAttack);
    });

    container.querySelector('#btn-pick-special-video')?.addEventListener('click', () => {
      this.openMediaPicker(url => {
        const vidInp = container.querySelector('#inp-special-video') as HTMLInputElement;
        const durInp = container.querySelector('#inp-special-duration') as HTMLInputElement;
        if (vidInp) {
          vidInp.value = url;
          
          // Probe Duration
          const probe = document.createElement('video');
          probe.src = url;
          probe.onloadedmetadata = () => {
             if (durInp && probe.duration > 0) {
                durInp.value = probe.duration.toFixed(1);
                this.showToast(`🎥 Duração do vídeo capturada: ${durInp.value}s`, '#51c5ff');
                readSpecialAttack();
             }
          };
          readSpecialAttack();
        }
      });
    });

    container.querySelector('#btn-pick-card-media')?.addEventListener('click', () => {
      this.openMediaPicker(url => {
        const urlInp = container.querySelector('#inp-media-url') as HTMLInputElement;
        if (urlInp) {
          urlInp.value = url;
          updateObj();
        }
      });
    });

    // Particles
    const readParticles = () => {
      const type = (container.querySelector('#inp-particles-type') as HTMLSelectElement)?.value || 'none';
      const color = (container.querySelector('#inp-particles-color') as HTMLInputElement)?.value || '#ffaa00';
      const count = parseInt((container.querySelector('#inp-particles-count') as HTMLInputElement)?.value) || 20;
      t.particles = { type: type as any, color, count };
      this.updatePreview();
    };
    container.querySelectorAll('#inp-particles-type, #inp-particles-color, #inp-particles-count').forEach(inp => {
      inp.addEventListener('input', readParticles);
    });

    // --- NEW INLINE PARALLAX EDITOR (NO SELECTION NEEDED) ---
    container.querySelector('#btn-add-parallax')?.addEventListener('click', () => {
      this.openMediaPicker(url => {
        if (!t.parallaxLayers) t.parallaxLayers = [];
        t.parallaxLayers.push({ 
          id: `lyr_${Date.now()}`, 
          url, 
          z: t.parallaxLayers!.length + 1, 
          speed: 1, 
          scale: 1, 
          initialX: 0, 
          initialY: 0, 
          opacity: 1, 
          blendMode: 'normal' 
        });
        this.reRender();
      });
    });

    const updateLyrData = (e: Event) => {
      const el = e.target as HTMLInputElement | HTMLSelectElement;
      const idx = parseInt(el.dataset.idx || '0');
      const lyr = t.parallaxLayers?.[idx];
      if (!lyr) return;

      if (el.classList.contains('inp-parallax-url')) lyr.url = el.value;
      if (el.classList.contains('inp-parallax-z')) lyr.z = parseInt(el.value);
      if (el.classList.contains('inp-parallax-speed')) lyr.speed = parseFloat(el.value);
      if (el.classList.contains('inp-parallax-scale')) lyr.scale = parseFloat(el.value);
      if (el.classList.contains('inp-parallax-opacity')) lyr.opacity = parseFloat(el.value);
      if (el.classList.contains('inp-parallax-x')) lyr.initialX = parseInt(el.value);
      if (el.classList.contains('inp-parallax-y')) lyr.initialY = parseInt(el.value);
      if (el.classList.contains('inp-parallax-blend')) lyr.blendMode = el.value;
      if (el.classList.contains('inp-parallax-filter')) lyr.imageFilter = el.value === 'none' ? undefined : el.value;
      if (el.classList.contains('inp-parallax-animation')) lyr.animation = el.value as any;
      if (el.classList.contains('inp-parallax-intensity')) lyr.animationIntensity = parseFloat(el.value);

      this.updatePreview();
    };

    container.querySelectorAll('.inp-parallax-url, .inp-parallax-z, .inp-parallax-speed, .inp-parallax-scale, .inp-parallax-opacity, .inp-parallax-x, .inp-parallax-y, .inp-parallax-blend, .inp-parallax-filter, .inp-parallax-animation, .inp-parallax-intensity')
      .forEach(inp => {
        inp.addEventListener('input', updateLyrData);
        inp.addEventListener('change', updateLyrData);
      });

    container.querySelectorAll('.btn-pick-parallax-img').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
        this.openMediaPicker(url => {
          if (t.parallaxLayers?.[idx]) {
            t.parallaxLayers[idx].url = url;
            this.reRender();
          }
        });
      });
    });

    container.querySelectorAll('.btn-del-parallax').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
        t.parallaxLayers!.splice(idx, 1);
        this.reRender();
      });
    });

    this.updatePreview();
  }

  private updateListLabels() {
    const t = this.templates[this.selectedIndex];
    const item = document.querySelector(`.editor-list-item[data-idx="${this.selectedIndex}"]`);
    if (item && t) {
      (item.querySelector('.list-item-name') as HTMLElement).textContent = t.name;
      (item.querySelector('.list-item-img') as HTMLElement).style.backgroundImage = `url('${t.image}')`;
      
      const statsEl = item.querySelector('.list-item-stats') as HTMLElement;
      if (statsEl) {
        statsEl.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <span style="color:#ffcc00; font-weight:950; font-size:0.75rem;">⚔️${t.baseAtk}</span>
            <span style="color:#2ecc71; font-weight:950; font-size:0.75rem;">❤️${t.basePv}</span>
          </div>
          <div style="display:flex; gap:3px; flex-wrap:wrap;">
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
        `;
      }
    }
  }

  private playTestSpecial() {
    const t = this.templates[this.selectedIndex];
    if (!t || !t.specialAttack) return;
    const sp = t.specialAttack;
    const wrapper = document.getElementById('preview-wrapper');
    if (!wrapper) return;

    const mode = sp.mode || (sp.videoUrl ? 'video' : 'parallax');
    const totalDuration = sp.duration || 4.5;
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:absolute;inset:0;background:#000;z-index:999999;display:flex;align-items:center;justify-content:center;border-radius:24px;overflow:hidden;opacity:0;`;
    
    const skip = document.createElement('button');
    skip.innerHTML = '⏭️ PULAR';
    skip.style.cssText = `position:absolute;bottom:15px;right:15px;background:rgba(255,255,255,0.2);color:#fff;border:none;padding:8px 16px;border-radius:30px;font-weight:900;z-index:999999;cursor:pointer;font-size:0.6rem;`;
    overlay.appendChild(skip);
    wrapper.appendChild(overlay);

    // 1. COMPACT SKILL POP-UP (Sequential & Minimalist)
    const popup = document.createElement('div');
    popup.style.cssText = `position:absolute; top:50%; left:50%; width:100%; height:42px; transform:translate(-50%, -50%); z-index:9999999; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(0,0,0,0.95); border-top:1px solid rgba(255,215,0,0.4); border-bottom:1px solid rgba(255,215,0,0.4); opacity:0; pointer-events:none;`;
    popup.innerHTML = `
      <div style="font-family:'Cinzel', serif; font-size:0.45rem; color:#ffd700; font-weight:400; letter-spacing:3px; margin-bottom:2px; text-transform:uppercase; opacity:0.8;">Habilidade Especial</div>
      <div style="font-family:'Cinzel', serif; font-size:0.85rem; color:#fff; font-weight:400; letter-spacing:4px; text-transform:uppercase; text-shadow:0 0 10px rgba(255,255,255,0.2); max-width:90%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${sp.name}</div>
    `;
    wrapper.appendChild(popup);

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(overlay, { 
           opacity: 0, 
           duration: 0.5, 
           onComplete: () => {
              overlay.remove();
              const vfxId = sp.vfxId;
              const previewEl = document.getElementById('preview-wrapper');
              const viewport = document.getElementById('preview-viewport');
              if (previewEl && vfxId) {
                 if (this.previewMode === 'board') {
                    const defender = previewEl.querySelector('[data-idx="1"] .card-face') as HTMLElement;
                    if (defender) {
                       playVFX(vfxId as any, defender, undefined, viewport || undefined);
                       gsap.to(previewEl, { x: 12, duration: 0.05, repeat: 10, yoyo: true, onComplete: () => { gsap.set(previewEl, { x: 0 }); } });
                    } else playVFX(vfxId as any, previewEl, undefined, viewport || undefined);
                 } else playVFX(vfxId as any, previewEl, undefined, viewport || undefined);
              }
              this.showToast('💥 IMPACTO FINAL!', '#ff0055');
           } 
        });
      }
    });

    skip.onclick = () => {
       tl.progress(1);
       popup.remove();
    };

    // Phase 1: Skill Pop-up (Strictly sequential)
    tl.to(popup, { opacity: 1, duration: 0.3 });
    tl.fromTo(popup, { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: 'power4.out' }, 0);
    tl.to(popup, { opacity: 0, duration: 0.2, delay: 0.6, onComplete: () => popup.remove() });

    // Phase 2: Start Cinematic (Strictly after popup)
    tl.to(overlay, { opacity: 1, duration: 0.4 });

    if (mode === 'video' && sp.videoUrl) {
      const video = document.createElement('video');
      video.src = sp.videoUrl;
      video.playsInline = true;
      video.style.cssText = `width:100%;height:100%;object-fit:cover;filter:contrast(1.1) brightness(1.1);position:absolute;inset:0;z-index:5;`;
      overlay.appendChild(video);

      (t.parallaxLayers || []).forEach((pl: any) => {
          const lyr = document.createElement('div');
          lyr.style.cssText = `position:absolute;inset:0;background-image:url('${pl.url}');background-size:cover;background-position:center;z-index:${10 + pl.z};opacity:${pl.opacity ?? 1};mix-blend-mode:${pl.blendMode || 'normal'};transform:scale(${pl.scale || 1});pointer-events:none;`;
          overlay.appendChild(lyr);
      });

      tl.add(() => { video.play().catch(() => { }); });
      tl.fromTo(video, { scale: 1.5, filter: 'brightness(3) blur(20px)' }, { scale: 1, filter: 'brightness(1.1) blur(0px)', duration: 1.0, ease: 'power4.out' });
      tl.to(video, { scale: 1.1, duration: totalDuration - 1.5, ease: 'sine.inOut' }); 
    } else {
      const artWrap = document.createElement('div');
      artWrap.style.cssText = `width:100%;height:100%;position:relative;`;
      overlay.appendChild(artWrap);
      (t.parallaxLayers || []).forEach((pl: any) => {
         const lyr = document.createElement('div');
         lyr.style.cssText = `position:absolute;inset:0;background-image:url('${pl.url}');background-size:cover;background-position:center;z-index:${10 + pl.z};opacity:${pl.opacity ?? 1};mix-blend-mode:${pl.blendMode || 'normal'};transform:scale(${pl.scale*1.2});pointer-events:none;`;
         artWrap.appendChild(lyr);
      });
      const title = document.createElement('div');
      title.style.cssText = `position:absolute;bottom:40px;width:100%;text-align:center;color:#fff;z-index:1000;opacity:0;`;
      title.innerHTML = `<div style="font-size:2rem; font-weight:950; letter-spacing:4px; text-shadow:0 0 30px #a335ee;">${sp.name.toUpperCase()}</div>`;
      overlay.appendChild(title);

      tl.fromTo(artWrap, { scale: 1.3, filter: 'brightness(3)' }, { scale: 1, filter: 'brightness(1)', duration: 1.5, ease: 'power2.out' });
      tl.to(title, { opacity: 1, y: -20, duration: 0.6 }, 0.8);
      tl.to(artWrap, { scale: 1.1, duration: totalDuration - 1.5, ease: 'sine.inOut' });
    }
    animateParallaxLayers(overlay, t.parallaxLayers || []);
  }



  private updatePreview() {
    const t = this.templates[this.selectedIndex];
    const wrapper = document.getElementById('preview-wrapper');
    const viewport = document.getElementById('preview-viewport');
    const pHand = document.getElementById('preview-hand');
    const pBoard = document.getElementById('preview-board');
    if (!t || !wrapper || !viewport) return;

    const mappedAttacks = (t.attacks || []).map((a: any, i: number) => ({
      ...a,
      name: a.name || (a.type === 'damage' ? `ATAQUE ${i+1}` : `EFEITO ${i+1}`)
    }));

    const mockCard: Card = { 
      ...t, 
      id: 'preview', 
      owner: 'p', 
      atk: t.baseAtk || 0,
      pv: t.basePv || 0,
      maxPv: t.basePv || 0,
      attacks: mappedAttacks,
      rarity: t.preferredRarity || 'common', 
      immersiveMode: !!t.immersiveMode 
    } as unknown as Card;

    if (this.previewMode === 'board') {
       const enemyMock: Card = { ...mockCard, id: 'preview-enemy', owner: 'e' } as unknown as Card;
       const slots: (Card | null)[] = [null, enemyMock, null, null, mockCard, null];

       const fullBoardHtml = this.boardRenderer.render(
          slots, { p: 1500, e: 1500 }, { p: 10, e: 10 }, { p: 10, e: 10 }, 'p', 60, [], 10
       );
       const parser = new DOMParser();
       const doc = parser.parseFromString(fullBoardHtml, 'text/html');
       const boardGrid = doc.querySelector('.board-area');

       wrapper.style.cssText = `width:fit-content; overflow:visible; display:block;`;
       wrapper.innerHTML = boardGrid ? boardGrid.outerHTML : fullBoardHtml;

       const injectedArea = wrapper.querySelector('.board-area') as HTMLElement | null;
       if (injectedArea) {
          injectedArea.style.transform = 'none';
          injectedArea.style.margin = '0 auto';
       }
       const mgmt = wrapper.querySelector('.management-hifi') as HTMLElement | null;
       if (mgmt) mgmt.style.transform = 'none';
    } else {
        wrapper.style.cssText = `width:340px; min-height:600px; overflow:visible; display:block; margin: 0 auto; position: relative;`;
        wrapper.innerHTML = renderPremiumCard(mockCard);
    }

    setTimeout(() => {
       const vRect = viewport.getBoundingClientRect();
       const wRect = wrapper.getBoundingClientRect();
       const availW = vRect.width - 40;
       const availH = vRect.height - 40;
       const contentW = wRect.width || (this.previewMode === 'board' ? 450 : 380);
       const contentH = wRect.height || (this.previewMode === 'board' ? 500 : 600);
       
       const scaleW = availW / contentW;
       const scaleH = availH / contentH;
       let scale = Math.min(scaleW, scaleH);
       
       if (scale < 1) {
          wrapper.style.transform = `scale(${Math.max(0.3, scale)})`;
       } else {
          wrapper.style.transform = 'none';
       }
    }, 0);

    animateParallaxLayers(wrapper, mockCard.parallaxLayers || []);
    const pLayer = wrapper.querySelector('.card-particle-layer') as HTMLElement;
    if (pLayer && mockCard.particles) {
       const count = mockCard.particles.count || 20;
       if (mockCard.particles.type === 'sparks') spawnSparkParticles(pLayer, mockCard.particles.color, count);
       else if (mockCard.particles.type === 'fog') spawnAtmosphericFog(pLayer, mockCard.particles.color, Math.ceil(count/3));
       else if (mockCard.particles.type === 'swirl') spawnMagicSwirl(pLayer, mockCard.particles.color || '#a335ee', count);
    }

    if (pHand) pHand.innerHTML = renderHandCardPremium(mockCard);
    if (pBoard) pBoard.innerHTML = renderFieldCardPremium(mockCard, false);
  }
}
