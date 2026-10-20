import { applyScenarioBackground, generateSvgPattern, isVideoUrl } from '../../../utils/BackgroundUtils';
import { Mobby, MobbyManager } from '../../../../core/MobbyManager';

export const SCENARIO_SCREENS = [
  { id: 'lobby', label: 'TELA INICIAL / LOBBY' },
  { id: 'battle', label: 'CAMPO DE BATALHA' },
  { id: 'boss_battle', label: 'DUELO DE CHEFE (MOBBY 3x1)' },
  { id: 'map', label: 'MAPA / EXPLORAÇÃO' },
  { id: 'academy', label: 'ACADEMIA / TREINO' },
  { id: 'arsenal', label: 'ARSENAL / DECK BUILDER' },
  { id: 'preparation', label: 'PREPARAÇÃO DE BATALHA' },
  { id: 'store', label: 'LOJA DE ITENS' },
  { id: 'booster', label: 'ABERTURA DE BOOSTER / PACK' },
  { id: 'difficulty', label: 'DIFICULDADE DA BATALHA' },
  { id: 'coin_flip', label: 'CARA OU COROA / SORTE' }
];

export class TabScenarios {
  private scenarios: any;
  private selectedIndex: number;
  private scenarioClipboard: any;
  private availableCards: string[];
  private reRender: () => void;
  private showToast: (msg: string, color?: string) => void;
  private setScenariosSelectedIndex: (idx: number) => void;
  private setScenarioClipboard: (data: any) => void;
  private openMediaPicker: (onSelect: (url: string) => void) => void;
  private saveJson: (endpoint: string, data: any) => Promise<boolean>;

  private static activeMobbyId: string = '';
  private selectedMobbyId: string = '';

  constructor(state: any, callbacks: any, core: any) {
    this.scenarios = state.scenarios;
    this.selectedIndex = state.selectedIndex || 0;
    this.scenarioClipboard = state.scenarioClipboard || callbacks.scenarioClipboard;
    this.availableCards = state.availableCards || [];
    
    this.reRender = callbacks.reRender;
    this.showToast = callbacks.showToast;
    this.setScenariosSelectedIndex = callbacks.setScenariosSelectedIndex;
    this.setScenarioClipboard = callbacks.setScenarioClipboard;
    this.openMediaPicker = callbacks.openMediaPicker;
    this.saveJson = core.saveJson.bind(core);

    this.selectedMobbyId = TabScenarios.activeMobbyId || '';

    // Garantir dados atualizados do localStorage
    try {
      const saved = localStorage.getItem('forge_scenarios');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          this.scenarios = { ...parsed, ...this.scenarios, ...parsed };
          state.scenarios = this.scenarios;
        }
      }
    } catch (_) {}
  }

  private getEffectiveScreenId(screen: { id: string }): string {
    if (screen.id === 'boss_battle' && this.selectedMobbyId) {
      return `boss_mobby_${this.selectedMobbyId}`;
    }
    return screen.id;
  }

  public render(): string {
    const sIdx = Math.min(Math.max(0, this.selectedIndex), SCENARIO_SCREENS.length - 1);
    const s = SCENARIO_SCREENS[sIdx];
    
    // Lista de Mobbys disponíveis
    const mobbys = MobbyManager.getMobbys();
    if (this.selectedMobbyId && !mobbys.some(m => m.id === this.selectedMobbyId)) {
      this.selectedMobbyId = '';
      TabScenarios.activeMobbyId = '';
    }

    const effId = this.getEffectiveScreenId(s);
    const isMobbySub = s.id === 'boss_battle' && !!this.selectedMobbyId;
    const currentMobby = isMobbySub ? mobbys.find(m => m.id === this.selectedMobbyId) : null;

    // Inicializa o valor se ainda não existir
    if (!this.scenarios[effId]) {
      if (currentMobby && currentMobby.backgroundUrl) {
        this.scenarios[effId] = currentMobby.backgroundUrl;
      } else if (s.id === 'boss_battle') {
        this.scenarios[effId] = this.scenarios['boss_battle'] || '';
      }
    }

    // Inicializa metadados
    if (!(this.scenarios as any).__meta) (this.scenarios as any).__meta = {};
    if (!(this.scenarios as any).__meta[effId]) {
      const currentVal = this.scenarios[effId] || '';
      let parsedObj: any = null;
      if (typeof currentVal === 'string' && currentVal.startsWith('{') && currentVal.includes('"mode"')) {
        try { parsedObj = JSON.parse(currentVal); } catch (_) {}
      }

      if (parsedObj) {
        (this.scenarios as any).__meta[effId] = {
          mode: parsedObj.mode || 'image',
          url: parsedObj.url || '',
          mediaType: parsedObj.mediaType || (isVideoUrl(parsedObj.url || '') ? 'video' : 'image'),
          gradFn: parsedObj.gradFn || 'linear-gradient',
          gradDir: parsedObj.gradDir || 'to bottom',
          gradC1: parsedObj.gradC1 || '#000000',
          gradC2: parsedObj.gradC2 || '#222222',
          patType: parsedObj.patType || 'none',
          patC: parsedObj.patC || '#ffffff',
          patOpacity: parsedObj.patOpacity ?? 20,
          layers: parsedObj.layers || ['pat', 'grad', 'img'],
          imgFilter: parsedObj.filter || 'none',
          imgFilterVal: parsedObj.filterVal ?? 50,
          blur: parsedObj.blur ?? 0
        };
      } else {
        (this.scenarios as any).__meta[effId] = {
          mode: 'image',
          url: currentVal,
          mediaType: isVideoUrl(currentVal) ? 'video' : 'image',
          gradFn: 'linear-gradient',
          gradDir: 'to bottom',
          gradC1: '#000000',
          gradC2: '#222222',
          patType: 'none',
          patC: '#ffffff',
          patOpacity: 20,
          layers: ['pat', 'grad', 'img'],
          imgFilter: 'none',
          imgFilterVal: 50,
          blur: 0
        };
      }
    }
    const meta = (this.scenarios as any).__meta[effId];
    if (!meta.layers) meta.layers = ['pat', 'grad', 'img'];

    const displayTitle = currentMobby 
      ? `EDITANDO: DUELO DE CHEFE — <span style="color:#ffd700;">${currentMobby.name.toUpperCase()}</span>`
      : (s.id === 'boss_battle' ? `EDITANDO: DUELO DE CHEFE (PADRÃO GLOBAL)` : `EDITANDO: ${s.label.split(' / ')[0]}`);

    // Thumbnail de pré-visualização ativa
    const activeUrl = meta.url || (meta.mode === 'image' ? (this.scenarios as any)[effId] : '');
    const isVid = isVideoUrl(activeUrl);
    const currentPreviewHtml = activeUrl
      ? (isVid 
          ? `<video src="${activeUrl}" muted loop autoplay style="width:100%; height:100%; object-fit:cover;"></video>`
          : `<img src="${activeUrl}" style="width:100%; height:100%; object-fit:cover;" />`)
      : `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#666; font-size:0.65rem;"><span>🌌</span><span>Padrão do Jogo</span></div>`;

    // Lista de cenários sugeridos para seleção rápida
    const curatedScenarios = [
      '/cards/gemini_generated_video_91a98711.mp4',
      '/cards/gemini_generated_video_0381afa9.mp4',
      '/cards/Obscure_summoning_dnd_battle_map.jpg',
      '/cards/download_-_2026-03-15T161051.950.jpg',
      ...this.availableCards.slice(0, 15)
    ];
    // Remove duplicatas
    const uniqueQuickScenarios = Array.from(new Set(curatedScenarios)).filter(Boolean);

    return `
      <div class="editor-list-panel" style="flex:0.8; max-width:280px; border-right:1px solid rgba(255,255,255,0.05); padding-right:10px;">
         <div class="editor-section-title">TELAS DO JOGO</div>
         <div class="editor-card-list">
           ${SCENARIO_SCREENS.map((screen, i) => `
              <div class="editor-list-item ${i === sIdx ? 'active' : ''}" data-idx="${i}" data-type="scenario" style="padding:15px; border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
                 <div class="list-item-name" style="font-size:0.8rem;">${screen.label}</div>
                 <div style="display:flex; gap:5px;">
                    <button class="btn-copy-scn" data-idx="${i}" style="background:rgba(255,255,255,0.1); border:none; border-radius:4px; padding:4px; cursor:pointer; font-size:0.8rem;" title="Copiar Estilo">📄</button>
                    ${this.scenarioClipboard ? `
                       <button class="btn-paste-scn" data-idx="${i}" style="background:rgba(81,197,255,0.2); border:1px solid #51c5ff; border-radius:4px; padding:4px; cursor:pointer; font-size:0.8rem;" title="Colar Estilo">📋</button>
                    ` : ''}
                 </div>
              </div>
           `).join('')}
         </div>
      </div>

      <div class="editor-form-panel" style="flex:1.5; background:rgba(20,20,30,0.6); backdrop-filter:blur(20px); border-radius:15px; border:1px solid rgba(255,255,255,0.05); position:relative; flex-direction:row; gap:20px;">
        
        <!-- Left Side: Controls -->
        <div style="flex:1; display:flex; flex-direction:column; overflow-y:auto; padding-right:5px; max-height:85vh;">
            <div class="editor-section-title" style="color:#51c5ff; font-size:1.05rem; text-shadow:0 0 10px rgba(81,197,255,0.5);">${displayTitle}</div>
            
            <!-- MOBBY SUB-SELECTOR (Apenas no Duelo de Chefe) -->
            ${s.id === 'boss_battle' ? `
            <div class="mobby-subselector-container" style="display:flex; flex-direction:column; gap:8px; background:rgba(0,0,0,0.45); padding:12px 14px; border-radius:12px; margin-bottom:16px; border:1px solid rgba(255,215,0,0.3); box-shadow:0 4px 15px rgba(0,0,0,0.3);">
               <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:0.75rem; color:#ffd700; font-weight:900; letter-spacing:1px; display:flex; align-items:center; gap:6px;">
                     👾 SELECIONAR CHEFE / MOBBY:
                  </span>
                  <span style="font-size:0.65rem; color:#aaa;">${this.selectedMobbyId ? 'Personalizando fundo individual' : 'Configurando padrão de todos os chefes'}</span>
               </div>
               <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                  <button class="editor-btn-secondary btn-sub-mobby ${!this.selectedMobbyId ? 'active-mobby' : ''}" data-mobby-id="" style="padding:6px 14px; font-size:0.75rem; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:6px;">
                     <span>🌐</span> <span>Chefe Padrão (Global)</span>
                  </button>
                  ${mobbys.map(m => `
                     <button class="editor-btn-secondary btn-sub-mobby ${this.selectedMobbyId === m.id ? 'active-mobby' : ''}" data-mobby-id="${m.id}" style="padding:6px 14px; font-size:0.75rem; border-radius:8px; display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <img src="${m.image}" style="width:20px; height:20px; border-radius:50%; object-fit:cover; border:1px solid rgba(255,255,255,0.3);" onerror="this.style.display='none'">
                        <span style="font-weight:700;">${m.name}</span>
                        ${m.backgroundUrl ? '<span style="font-size:0.55rem; background:rgba(76,255,136,0.2); color:#4cff88; padding:2px 5px; border-radius:4px; border:1px solid rgba(76,255,136,0.4);">personalizado</span>' : ''}
                     </button>
                  `).join('')}
               </div>
            </div>
            ` : ''}

            <!-- 🌌 CARD DO FUNDO ATIVO COM AÇÕES DIRETAS (FUNÇÕES SIMPLES DE TROCA) -->
            <div style="background:rgba(0,0,0,0.5); border:1px solid rgba(81,197,255,0.3); border-radius:12px; padding:12px; margin-bottom:16px; display:flex; gap:14px; align-items:center;">
               <div id="scn-current-thumb-box" style="width:130px; height:80px; border-radius:8px; background:#050508; border:1px solid rgba(255,255,255,0.2); overflow:hidden; position:relative; flex-shrink:0; display:flex; align-items:center; justify-content:center;">
                  ${currentPreviewHtml}
               </div>
               <div style="flex:1; display:flex; flex-direction:column; gap:6px; min-width:0;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                     <span style="font-size:0.75rem; font-weight:800; color:#51c5ff; text-transform:uppercase; letter-spacing:0.5px;">
                        ${isVid ? '🎬 VÍDEO ANIMADO' : (activeUrl ? '🖼️ IMAGEM DE FUNDO' : '🎨 DEGRADÊ / PADRÃO')}
                     </span>
                     <span style="font-size:0.6rem; color:#4cff88; background:rgba(76,255,136,0.15); padding:2px 6px; border-radius:4px; border:1px solid rgba(76,255,136,0.3);">
                        ● Em exibição
                     </span>
                  </div>
                  <div id="scn-current-path-label" style="font-size:0.65rem; color:#ccc; word-break:break-all; font-family:monospace; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                     ${activeUrl || 'Nenhum arquivo (estilo gerado por gradiente)'}
                  </div>
                  <div style="display:flex; gap:8px; margin-top:4px; flex-wrap:wrap;">
                     <button class="editor-btn-primary btn-pick-scenario" style="padding:6px 14px; font-size:0.75rem; font-weight:800; letter-spacing:0.5px; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:6px;">
                        🖼️ Escolher da Galeria
                     </button>
                     <button id="btn-import-scn-media" class="editor-btn-secondary" style="padding:6px 12px; font-size:0.75rem; border-radius:6px; background:rgba(81,197,255,0.1); color:#51c5ff; border-color:#51c5ff; cursor:pointer; display:flex; align-items:center; gap:6px;">
                        📁 Do Computador
                     </button>
                     <input type="file" id="inp-scn-media" accept="image/*,video/*,.mp4,.webm,.mov,.m4v,.ogv" style="display:none">
                     <button id="btn-clear-scenario-bg" class="editor-btn-secondary" style="padding:6px 10px; font-size:0.75rem; border-radius:6px; background:rgba(255,80,80,0.1); color:#ff6b6b; border-color:rgba(255,80,80,0.3); cursor:pointer; display:flex; align-items:center; gap:4px;" title="Remover fundo personalizado e usar o padrão">
                        🗑️ Limpar
                     </button>
                  </div>
               </div>
            </div>

            <!-- ⚡ SELEÇÃO RÁPIDA DE CENÁRIOS (1-CLIQUE) -->
            <div style="background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px; margin-bottom:16px;">
               <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span style="font-size:0.72rem; font-weight:800; color:#ffd700; letter-spacing:0.5px; display:flex; align-items:center; gap:6px;">
                     ⚡ SELEÇÃO RÁPIDA (CLIQUE PARA APLICAR NA HORA):
                  </span>
                  <span style="font-size:0.6rem; color:#888;">Cenários e mídias da forja</span>
               </div>
               <div id="quick-scenario-grid" style="display:flex; gap:8px; overflow-x:auto; padding-bottom:6px; scrollbar-width:thin;">
                  ${uniqueQuickScenarios.map(scUrl => {
                     const isVideo = isVideoUrl(scUrl);
                     const isSelected = activeUrl === scUrl;
                     const filename = scUrl.split('/').pop() || 'Cenário';
                     return `
                        <div class="quick-sc-item ${isSelected ? 'selected-quick-sc' : ''}" data-url="${scUrl}" style="width:105px; flex-shrink:0; aspect-ratio:16/10; border-radius:8px; background:#000; border:2px solid ${isSelected ? '#51c5ff' : 'rgba(255,255,255,0.1)'}; overflow:hidden; position:relative; cursor:pointer; transition:0.2s; box-shadow:0 3px 8px rgba(0,0,0,0.4);" title="${filename}">
                           ${isVideo 
                              ? `<video src="${scUrl}" muted style="width:100%; height:100%; object-fit:cover; pointer-events:none;"></video><div style="position:absolute; top:3px; right:3px; background:rgba(0,0,0,0.7); color:#51c5ff; font-size:0.5rem; font-weight:900; padding:1px 4px; border-radius:3px;">VIDEO</div>` 
                              : `<img src="${scUrl}" style="width:100%; height:100%; object-fit:cover; pointer-events:none;" onerror="this.src='/cards/Obscure_summoning_dnd_battle_map.jpg'" />`}
                           <div style="position:absolute; bottom:0; left:0; right:0; background:linear-gradient(0deg, rgba(0,0,0,0.85), transparent); font-size:0.55rem; color:#fff; padding:2px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                              ${filename.replace(/\.[^/.]+$/, "")}
                           </div>
                        </div>
                     `;
                  }).join('')}
               </div>
            </div>

            <!-- CAMPO DIRETO DE URL / LINK -->
            <div style="display:flex; gap:8px; align-items:center; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); padding:8px 12px; border-radius:10px; margin-bottom:16px;">
               <span style="font-size:0.7rem; color:#aaa; font-weight:700;">🔗 URL:</span>
               <input type="text" id="scn-img-url" class="editor-input scn-realtime" placeholder="Cole uma URL ou caminho de arquivo..." value="${activeUrl}" style="flex:1; margin:0; padding:6px 10px; font-size:0.75rem;">
               <button id="btn-apply-url" class="editor-btn-secondary" style="padding:6px 12px; font-size:0.7rem; border-color:#51c5ff; color:#51c5ff;">Aplicar</button>
            </div>

            <!-- TABS DE CUSTOMIZAÇÃO AVANÇADA (MODOS, FILTROS, GRADIENTES, PARTÍCULAS) -->
            <div style="display:flex; flex-direction:column; gap:10px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:15px; margin-bottom:16px;">
               <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div style="display:flex; gap:5px; flex:1;">
                     <button class="editor-btn-secondary btn-scn-mode ${meta.mode === 'image' ? 'active-mode' : ''}" data-mode="image" style="flex:1; font-size: 0.7rem; padding: 6px;">🖼️ IMAGEM / VÍDEO</button>
                     <button class="editor-btn-secondary btn-scn-mode ${meta.mode === 'grad_pat' ? 'active-mode' : ''}" data-mode="grad_pat" style="flex:1; font-size: 0.7rem; padding: 6px;">🎨 BASE+PADRÃO</button>
                     <button class="editor-btn-secondary btn-scn-mode ${meta.mode === 'mix' ? 'active-mode' : ''}" data-mode="mix" style="flex:1; font-size: 0.7rem; padding: 6px; background:linear-gradient(45deg,#ff4c4c,#51c5ff); border:none; color:white;">✨ MODO MISTO</button>
                  </div>
               </div>

               <!-- LAYER REORDERING UI (Mix Mode Only) -->
               ${meta.mode === 'mix' ? `
               <div style="display:flex; align-items:center; gap:10px; background:rgba(0,0,0,0.3); padding:8px; border-radius:10px;">
                  <span style="font-size:0.6rem; color:#888; text-transform:uppercase; font-weight:900;">Ordem de Camadas (Topo p/ Base):</span>
                  <div id="scn-layer-sorter" style="display:flex; gap:5px;">
                     ${meta.layers.map((l: string, idx: number) => `
                        <div class="layer-pill" data-id="${l}" style="display:flex; align-items:center; gap:5px; background:rgba(255,255,255,0.1); padding:4px 10px; border-radius:20px; font-size:0.65rem; cursor:pointer;" title="Clique para mover">
                           <span>${l === 'pat' ? '🏁 PADRÃO' : l === 'grad' ? '🌈 GRADIENTE' : '🖼️ IMAGEM'}</span>
                           ${idx > 0 ? `<span class="btn-move-layer" data-dir="up" data-idx="${idx}" style="opacity:0.5; hover:opacity:1;">◀</span>` : ''}
                           ${idx < 2 ? `<span class="btn-move-layer" data-dir="down" data-idx="${idx}" style="opacity:0.5; hover:opacity:1;">▶</span>` : ''}
                        </div>
                     `).join('')}
                  </div>
               </div>
               ` : ''}
            </div>

            <!-- IMAGE MODE PANE (FILTROS & BLUR) -->
            <div id="pane-scn-image" style="display:${meta.mode === 'image' || meta.mode === 'mix' ? 'flex' : 'none'}; flex-direction:column; gap:15px; border-bottom:${meta.mode === 'mix' ? '1px dashed rgba(255,255,255,0.2)' : 'none'}; padding-bottom:${meta.mode === 'mix' ? '15px' : '0'}; margin-bottom:${meta.mode === 'mix' ? '15px' : '0'};">
                 <div style="background:rgba(255,100,100,0.05); padding:15px; border-radius:12px; border:1px solid rgba(255,100,100,0.2);">
                    <label style="color:#ff6464; font-size:0.75rem; font-weight:800; display:block; margin-bottom:10px;">🌟 EFEITOS ANIMADOS (CSS FILTERS)</label>
                    ${isVid ? `<div style="font-size:0.7rem; color:#51c5ff; background:rgba(81,197,255,0.1); padding:8px 10px; border-radius:8px; margin-bottom:10px;">VÍDEO detectado: filtros animados são ignorados para máxima fidelidade visual.</div>` : ''}
                   
                   <div class="form-row">
                      <div class="form-group" style="flex:1">
                         <label>Filtro Animado</label>
                         <select id="scn-img-filter" class="scn-realtime editor-input">
                            <option value="none" ${meta.imgFilter === 'none' || !meta.imgFilter ? 'selected' : ''}>Nenhum Original</option>
                            <option value="vhs" ${meta.imgFilter === 'vhs' ? 'selected' : ''}>VHS Glitch</option>
                            <option value="chroma" ${meta.imgFilter === 'chroma' ? 'selected' : ''}>Croma (RGB Split)</option>
                            <option value="wave" ${meta.imgFilter === 'wave' ? 'selected' : ''}>Ondas Distorcidas</option>
                            <option value="pulse_hue" ${meta.imgFilter === 'pulse_hue' ? 'selected' : ''}>Pulso Alien (Hue)</option>
                         </select>
                      </div>
                      <div class="form-group" style="flex:1">
                         <label>Intensidade do Efeito</label>
                         <input type="range" id="scn-img-filter-val" class="scn-realtime editor-input" min="0" max="100" value="${meta.imgFilterVal ?? 50}">
                      </div>
                   </div>

                   <div class="form-group" style="margin-top:12px; background:rgba(0,0,0,0.3); padding:10px 12px; border-radius:10px; border:1px solid rgba(81,197,255,0.2);">
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                         <label style="color:#51c5ff; font-weight:800; font-size:0.75rem; margin:0;">🌫️ Desfoque do Fundo (Blur)</label>
                         <span id="scn-blur-val-txt" style="font-size:0.75rem; color:#ffd700; font-weight:900;">${meta.blur ?? 0}px</span>
                      </div>
                      <input type="range" id="scn-img-blur" class="scn-realtime editor-input" min="0" max="30" value="${meta.blur ?? 0}" style="width:100%;">
                   </div>
                </div>
            </div>

            <!-- GRADIENT + PATTERN PANE -->
            <div id="pane-scn-grad_pat" style="display:${meta.mode === 'grad_pat' || meta.mode === 'mix' ? 'flex' : 'none'}; flex-direction:column; gap:20px;">
                
                <div style="background:rgba(0,0,0,0.4); padding:15px; border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
                   <label style="color:#ffd700; font-size:0.75rem; font-weight:800; display:block; margin-bottom:10px;">1. BASE: DEGRADÊ (Com Opacidade Livre)</label>
                   
                   <div class="form-row" style="margin-bottom:10px;">
                      <div class="form-group" style="flex:1">
                         <label>Cor 1</label>
                         <div style="display:flex; gap:5px;">
                            <input type="color" id="scn-c1" class="scn-realtime editor-input" value="${meta.gradC1 || '#000000'}" style="flex:0.8; height:40px; padding:0;">
                            <input type="range" id="scn-c1-op" class="scn-realtime editor-input" min="0" max="100" value="${meta.gradC1Op ?? 100}" style="flex:1;">
                         </div>
                      </div>
                      <div class="form-group" style="flex:1">
                         <label>Cor 2</label>
                         <div style="display:flex; gap:5px;">
                            <input type="color" id="scn-c2" class="scn-realtime editor-input" value="${meta.gradC2 || '#222222'}" style="flex:0.8; height:40px; padding:0;">
                            <input type="range" id="scn-c2-op" class="scn-realtime editor-input" min="0" max="100" value="${meta.gradC2Op ?? 100}" style="flex:1;">
                         </div>
                      </div>
                   </div>

                   <div style="display:flex; gap:10px; margin-bottom:10px;">
                      <div style="flex:2"><label>Tipo</label>
                        <select id="scn-gradFn" class="scn-realtime editor-input">
                           <option value="linear-gradient" ${meta.gradFn === 'linear-gradient' ? 'selected' : ''}>Linear</option>
                           <option value="radial-gradient" ${meta.gradFn === 'radial-gradient' ? 'selected' : ''}>Radial</option>
                        </select>
                      </div>
                      <div style="flex:2"><label>Direção</label>
                        <select id="scn-gradDir" class="scn-realtime editor-input">
                           <option value="to bottom" ${meta.gradDir === 'to bottom' ? 'selected' : ''}>Vertical ↓</option>
                           <option value="to right" ${meta.gradDir === 'to right' ? 'selected' : ''}>Horizontal →</option>
                           <option value="135deg" ${meta.gradDir === '135deg' ? 'selected' : ''}>Diagonal ↘</option>
                           <option value="circle" ${meta.gradDir === 'circle' ? 'selected' : ''}>Círculo (Radial)</option>
                        </select>
                      </div>
                   </div>
                   <div class="form-row" style="margin-top:10px;">
                      <div class="form-group" style="flex:1">
                        <label>Modo de Mesclagem (Blend Mode do Degradê)</label>
                        <select id="scn-gradBlend" class="scn-realtime editor-input">
                           <option value="normal" ${meta.gradBlend === 'normal' || (!meta.gradBlend && meta.blend === 'normal') || (!meta.gradBlend && !meta.blend) ? 'selected' : ''}>Normal</option>
                           <option value="multiply" ${meta.gradBlend === 'multiply' || (!meta.gradBlend && meta.blend === 'multiply') ? 'selected' : ''}>Multiplicar (Escurecer)</option>
                           <option value="screen" ${meta.gradBlend === 'screen' || (!meta.gradBlend && meta.blend === 'screen') ? 'selected' : ''}>Divisão (Clarear)</option>
                           <option value="overlay" ${meta.gradBlend === 'overlay' || (!meta.gradBlend && meta.blend === 'overlay') ? 'selected' : ''}>Sobrepor (Contraste)</option>
                           <option value="color-dodge" ${meta.gradBlend === 'color-dodge' ? 'selected' : ''}>Clarear Cor (Dodge)</option>
                           <option value="color-burn" ${meta.gradBlend === 'color-burn' ? 'selected' : ''}>Escurecer Cor (Burn)</option>
                           <option value="hard-light" ${meta.gradBlend === 'hard-light' ? 'selected' : ''}>Luz Direta</option>
                           <option value="soft-light" ${meta.gradBlend === 'soft-light' ? 'selected' : ''}>Luz Indireta</option>
                           <option value="difference" ${meta.gradBlend === 'difference' ? 'selected' : ''}>Diferença</option>
                        </select>
                      </div>
                   </div>
                </div>

                <div style="background:rgba(0,0,0,0.4); padding:15px; border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
                   <label style="color:#4cff88; font-size:0.75rem; font-weight:800; display:block; margin-bottom:10px;">2. SOBREPOSIÇÃO: PADRÃO ANIMADO</label>
                   <div style="display:flex; gap:10px; margin-bottom:10px;">
                      <div style="flex:2"><label>Padrão Geométrico</label>
                        <select id="scn-patType" class="scn-realtime editor-input">
                           <option value="none" ${meta.patType === 'none' ? 'selected' : ''}>Nenhum</option>
                           <option value="pulse_grid" ${meta.patType === 'pulse_grid' ? 'selected' : ''}>Grade Cyber Pulsante</option>
                           <option value="neon_rings" ${meta.patType === 'neon_rings' ? 'selected' : ''}>Anéis de Neon</option>
                           <option value="waves" ${meta.patType === 'waves' ? 'selected' : ''}>Ondas Energéticas</option>
                           <option value="stars" ${meta.patType === 'stars' ? 'selected' : ''}>Campo Estelar Parallax</option>
                           <option value="lines" ${meta.patType === 'lines' ? 'selected' : ''}>Linhas Cinéticas (Chuva)</option>
                           <option value="hex" ${meta.patType === 'hex' ? 'selected' : ''}>Malha Hexagonal</option>
                        </select>
                      </div>
                      <div style="flex:1"><label>Cor/Foco</label>
                        <input type="color" id="scn-patC" class="scn-realtime editor-input" value="${meta.patC || '#ffffff'}" style="height:40px; padding:0;">
                      </div>
                   </div>

                   <div class="form-row">
                      <div class="form-group" style="flex:1">
                        <label>Modo de Mesclagem (Blend Mode do Padrão)</label>
                        <select id="scn-patBlend" class="scn-realtime editor-input">
                           <option value="normal" ${meta.patBlend === 'normal' || !meta.patBlend ? 'selected' : ''}>Normal</option>
                           <option value="multiply" ${meta.patBlend === 'multiply' ? 'selected' : ''}>Multiplicar (Escurecer)</option>
                           <option value="screen" ${meta.patBlend === 'screen' ? 'selected' : ''}>Divisão (Clarear)</option>
                           <option value="overlay" ${meta.patBlend === 'overlay' ? 'selected' : ''}>Sobrepor (Contraste)</option>
                           <option value="color-dodge" ${meta.patBlend === 'color-dodge' ? 'selected' : ''}>Clarear Cor (Dodge)</option>
                           <option value="color-burn" ${meta.patBlend === 'color-burn' ? 'selected' : ''}>Escurecer Cor (Burn)</option>
                        </select>
                      </div>
                   </div>
                   
                   <div class="form-row" style="margin-top:10px;">
                      <div class="form-group" style="flex:1">
                        <label>Tamanho do Padrão (${meta.patSize ?? 100}px)</label>
                        <input type="range" id="scn-patSize" class="scn-realtime editor-input" min="20" max="400" value="${meta.patSize ?? 100}">
                      </div>
                      <div class="form-group" style="flex:1">
                        <label>Densidade (Qtde/Velocidade)</label>
                        <input type="range" id="scn-patDense" class="scn-realtime editor-input" min="1" max="10" value="${meta.patDense ?? 5}">
                      </div>
                      <div class="form-group" style="flex:1">
                        <label>Opacidade: <span id="lbl-patOp">${meta.patOpacity ?? 20}</span>%</label>
                        <input type="range" id="scn-patOp" class="scn-realtime editor-input" min="0" max="100" value="${meta.patOpacity ?? 20}">
                      </div>
                   </div>
                </div>

            </div>

             <div style="background:rgba(163,53,238,0.1); padding:15px; border-radius:12px; border:1px solid rgba(163,53,238,0.25); margin-bottom:15px;">
               <label style="color:#a335ee; font-size:0.75rem; font-weight:800; display:block; margin-bottom:12px; letter-spacing:1px;">✨ EFEITOS AMBIENTAIS (Partículas)</label>
               <div style="display:flex; gap:10px;">
                  <div style="flex:2"><label>Tipo</label>
                    <select id="scn-p-type" class="scn-realtime editor-input">
                       <option value="none" ${meta.particles?.type === 'none' || !meta.particles ? 'selected' : ''}>Nenhum</option>
                       <option value="sparks" ${meta.particles?.type === 'sparks' ? 'selected' : ''}>🔥 Fagulhas (Sparks)</option>
                       <option value="fog" ${meta.particles?.type === 'fog' ? 'selected' : ''}>🌫️ Névoa (Fog)</option>
                       <option value="swirl" ${meta.particles?.type === 'swirl' ? 'selected' : ''}>🌀 Vórtex (Swirl)</option>
                    </select>
                  </div>
                  <div style="flex:1"><label>Cor</label>
                    <input type="color" id="scn-p-color" class="scn-realtime editor-input" value="${meta.particles?.color || '#ffaa00'}" style="height:40px; padding:0;">
                  </div>
                  <div style="flex:1"><label>Qtde</label>
                    <input type="number" id="scn-p-count" class="scn-realtime editor-input" value="${meta.particles?.count ?? 20}" min="0" max="100">
                  </div>
               </div>
            </div>

            <!-- BOTÃO GRAVAR FIXO / PRINCIPAL -->
            <div style="margin-top:auto; padding-top:20px; border-top:1px solid rgba(255,255,255,0.1);">
               <button id="btn-save-scenarios" class="editor-btn-primary" style="width:100%; height:52px; font-size:1.15rem; border-radius:12px; font-weight:900; letter-spacing:1px; box-shadow:0 6px 20px rgba(0,0,0,0.4);">
                  💾 GRAVAR CENÁRIOS
               </button>
               <p style="text-align:center; font-size:0.65rem; margin-top:6px; color:#aaa;">O fundo do jogo (#body) e o celular reproduzem a alteração em tempo real.</p>
            </div>
        </div>

        <!-- Right Side: Phone Mockup -->
        <div style="flex:0.8; display:flex; flex-direction:column; align-items:center; justify-content:center; border-left:1px solid rgba(255,255,255,0.05); padding-left:20px;">
           <label style="color:#aaa; font-size:0.75rem; margin-bottom:10px;">PREVIEW (MOCKUP CELULAR)</label>
           <!-- PHONE FRAME -->
           <div style="width:100%; max-width:240px; aspect-ratio:9/19.5; border-radius:24px; border:8px solid #111; box-shadow: 0 10px 30px rgba(0,0,0,0.8), inset 0 0 10px rgba(0,0,0,0.5); position:relative; overflow:hidden; background:#000;">
              
              <div id="phone-preview" style="position:absolute; inset:0;"></div>

              <div style="position:absolute; inset:0; pointer-events:none; display:flex; flex-direction:column;">
                 <div style="height:50px; border-bottom:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.2); backdrop-filter:blur(5px); display:flex; align-items:center; padding:0 10px; gap:5px;">
                     <div style="width:25px; height:25px; border-radius:50%; background:rgba(255,255,255,0.3);"></div>
                     <div style="height:10px; width:60px; background:rgba(255,255,255,0.3); border-radius:5px;"></div>
                     <div style="margin-left:auto; width:20px; height:20px; border-radius:4px; background:rgba(255,255,255,0.3);"></div>
                 </div>
                 <div style="flex:1; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:10px;">
                     <div style="width:70%; height:40px; border-radius:10px; border:2px dashed rgba(255,255,255,0.3); background:rgba(0,0,0,0.1); backdrop-filter:blur(3px);"></div>
                     <div style="width:70%; height:40px; border-radius:10px; border:2px dashed rgba(255,255,255,0.3); background:rgba(0,0,0,0.1); backdrop-filter:blur(3px);"></div>
                 </div>
                 <div style="height:60px; background:rgba(0,0,0,0.5); display:flex; justify-content:space-around; align-items:center;">
                     <div style="width:30px; height:30px; border-radius:8px; background:rgba(255,255,255,0.2);"></div>
                     <div style="width:30px; height:30px; border-radius:8px; background:rgba(255,255,255,0.2);"></div>
                     <div style="width:30px; height:30px; border-radius:8px; background:rgba(255,255,255,0.2);"></div>
                 </div>
              </div>
           </div>
        </div>
        <style>
          .active-mode { background: #fff !important; color: #000 !important; font-weight:800 !important; }
          .active-mobby { 
             background: linear-gradient(135deg, #ffd700, #ff8800) !important; 
             color: #000 !important; 
             font-weight: 900 !important; 
             box-shadow: 0 0 12px rgba(255, 215, 0, 0.5) !important; 
             border-color: #ffd700 !important; 
          }
          .selected-quick-sc {
             border-color: #51c5ff !important;
             box-shadow: 0 0 12px rgba(81,197,255,0.6) !important;
             transform: scale(1.03);
          }
          .quick-sc-item:hover {
             transform: scale(1.05);
             border-color: #ffd700 !important;
          }
        </style>
      </div>
    `;
  }

  public bind(container: HTMLElement) {
    const sIdx = Math.min(Math.max(0, this.selectedIndex), SCENARIO_SCREENS.length - 1);
    const s = SCENARIO_SCREENS[sIdx];
    const effId = this.getEffectiveScreenId(s);
    const meta = (this.scenarios as any).__meta[effId] || { mode: 'image', layers: ['pat', 'grad', 'img'] };

    // Sub-seletor de mobby
    container.querySelectorAll('.btn-sub-mobby').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mobId = (e.currentTarget as HTMLElement).dataset.mobbyId || '';
        this.selectedMobbyId = mobId;
        TabScenarios.activeMobbyId = mobId;
        this.reRender();
      });
    });

    // Atualização visual do card ativo
    const updateActiveThumbBox = (url: string) => {
       const box = container.querySelector('#scn-current-thumb-box');
       const pathLbl = container.querySelector('#scn-current-path-label');
       if (pathLbl) pathLbl.textContent = url || 'Nenhum arquivo (estilo gerado por gradiente)';
       if (box) {
          if (url && isVideoUrl(url)) {
             box.innerHTML = `<video src="${url}" muted loop autoplay style="width:100%; height:100%; object-fit:cover;"></video>`;
          } else if (url) {
             box.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;" />`;
          } else {
             box.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#666; font-size:0.65rem;"><span>🌌</span><span>Padrão do Jogo</span></div>`;
          }
       }
    };

    setTimeout(() => {
        const bgVal = (this.scenarios as any)[effId] || '';
        if (meta.mode === 'image' && meta.url) applyScenarioBackground(meta.url);
        else applyScenarioBackground(bgVal);
    }, 50);

    // Seleção de tela
    container.querySelectorAll('[data-type="scenario"]').forEach(el => {
      el.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.btn-copy-scn') || (e.target as HTMLElement).closest('.btn-paste-scn')) return;
        this.setScenariosSelectedIndex(parseInt((e.currentTarget as HTMLElement).dataset.idx!));
      });
    });

    // Copiar e Colar
    container.querySelectorAll('.btn-copy-scn').forEach(el => {
       el.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt((e.currentTarget as HTMLElement).dataset.idx!);
          const screenItem = SCENARIO_SCREENS[idx];
          const targetEffId = this.getEffectiveScreenId(screenItem);
          const bgData = (this.scenarios as any)[targetEffId] || (this.scenarios as any)[screenItem.id];
          const bgMeta = (this.scenarios as any).__meta[targetEffId] || (this.scenarios as any).__meta[screenItem.id];
          if (bgData) {
              this.setScenarioClipboard({ data: bgData, meta: JSON.parse(JSON.stringify(bgMeta || {})) });
              this.showToast(`Estilo de ${screenItem.label} copiado!`, '#ffd700');
              this.reRender();
          }
       });
    });

    container.querySelectorAll('.btn-paste-scn').forEach(el => {
       el.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt((e.currentTarget as HTMLElement).dataset.idx!);
          const screenItem = SCENARIO_SCREENS[idx];
          const targetEffId = this.getEffectiveScreenId(screenItem);
          if (this.scenarioClipboard) {
              (this.scenarios as any)[targetEffId] = this.scenarioClipboard.data;
              (this.scenarios as any).__meta[targetEffId] = JSON.parse(JSON.stringify(this.scenarioClipboard.meta));
              if (targetEffId !== screenItem.id) {
                (this.scenarios as any)[screenItem.id] = this.scenarioClipboard.data;
              }
              this.showToast(`Estilo aplicado a ${screenItem.label}!`, '#4cff88');
              this.reRender();
              const bgVal = (this.scenarios as any)[targetEffId] || '';
              applyScenarioBackground(bgVal);
          }
       });
    });

    // Ordenação de camadas
    container.querySelectorAll('.btn-move-layer').forEach(el => {
       el.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt((e.currentTarget as HTMLElement).dataset.idx!);
          const dir = (e.currentTarget as HTMLElement).dataset.dir;
          const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
          
          const temp = meta.layers[idx];
          meta.layers[idx] = meta.layers[targetIdx];
          meta.layers[targetIdx] = temp;
          
          this.reRender();
          compileRealtime();
       });
    });

    // Modos de cenário
    container.querySelectorAll('.btn-scn-mode').forEach(btn => {
      btn.addEventListener('click', (e) => {
         meta.mode = (e.currentTarget as HTMLElement).dataset.mode;
         this.reRender();
      });
    });

    // Importar arquivo do PC
    const btnImport = container.querySelector('#btn-import-scn-media');
    const inpMedia = container.querySelector('#inp-scn-media') as HTMLInputElement;
    btnImport?.addEventListener('click', () => inpMedia?.click());
    inpMedia?.addEventListener('change', async () => {
      if (inpMedia.files && inpMedia.files.length > 0) {
        this.showToast(`Importando arquivo...`, '#51c5ff');
        const file = inpMedia.files[0];
        const formData = new FormData();
        formData.append('media', file);
        try {
          const resp = await fetch('/api/upload-media', { method: 'POST', body: formData });
          const json = await resp.json();
          if (json.success) {
            const url = (json.urls && json.urls[0]) || `/cards/${file.name}`;
            meta.url = url;
            meta.mediaType = isVideoUrl(url) ? 'video' : 'image';
            const urlInput = container.querySelector('#scn-img-url') as HTMLInputElement;
            if (urlInput) urlInput.value = url;
            updateActiveThumbBox(url);
            compileRealtime();
            this.showToast('Importado e aplicado com sucesso!', '#4cff88');
          }
        } catch (err) { console.error(err); }
      }
    });

    // Galeria de Mídias
    container.querySelectorAll('.btn-pick-scenario').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openMediaPicker(url => {
          meta.url = url;
          meta.mediaType = isVideoUrl(url) ? 'video' : 'image';
          const urlInput = container.querySelector('#scn-img-url') as HTMLInputElement;
          if (urlInput) urlInput.value = url;
          updateActiveThumbBox(url);
          compileRealtime();
          this.showToast('Cenário selecionado da galeria!', '#51c5ff');
        });
      });
    });

    // Seleção Rápida em 1-Clique na Grade
    container.querySelectorAll('.quick-sc-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = (item as HTMLElement).dataset.url || '';
        meta.url = url;
        meta.mediaType = isVideoUrl(url) ? 'video' : 'image';
        const urlInput = container.querySelector('#scn-img-url') as HTMLInputElement;
        if (urlInput) urlInput.value = url;
        
        container.querySelectorAll('.quick-sc-item').forEach(el => el.classList.remove('selected-quick-sc'));
        item.classList.add('selected-quick-sc');

        updateActiveThumbBox(url);
        compileRealtime();
        this.showToast('Cenário aplicado! Clique em GRAVAR para salvar.', '#ffd700');
      });
    });

    // Botão Limpar Fundo
    const btnClear = container.querySelector('#btn-clear-scenario-bg');
    btnClear?.addEventListener('click', () => {
       meta.url = '';
       const urlInput = container.querySelector('#scn-img-url') as HTMLInputElement;
       if (urlInput) urlInput.value = '';
       updateActiveThumbBox('');
       compileRealtime();
       this.showToast('Fundo redefinido para o padrão!', '#aaa');
    });

    // Botão Aplicar URL
    const btnApplyUrl = container.querySelector('#btn-apply-url');
    btnApplyUrl?.addEventListener('click', () => {
       const urlInput = container.querySelector('#scn-img-url') as HTMLInputElement;
       const u = urlInput?.value.trim() || '';
       meta.url = u;
       meta.mediaType = isVideoUrl(u) ? 'video' : 'image';
       updateActiveThumbBox(u);
       compileRealtime();
       this.showToast('URL aplicada com sucesso!', '#51c5ff');
    });

    const compileRealtime = () => {
       const u = (container.querySelector('#scn-img-url') as HTMLInputElement)?.value || '';
       const imgFilterFn = (container.querySelector('#scn-img-filter') as HTMLSelectElement)?.value || 'none';
       const imgFilterVal = parseInt((container.querySelector('#scn-img-filter-val') as HTMLInputElement)?.value || '50');

       meta.url = u;
       meta.mediaType = isVideoUrl(u) ? 'video' : 'image';
       meta.imgFilter = imgFilterFn;
       meta.imgFilterVal = imgFilterVal;
       const imgBlur = parseInt((container.querySelector('#scn-img-blur') as HTMLInputElement)?.value || '0');
       meta.blur = imgBlur;
       const blurTxt = container.querySelector('#scn-blur-val-txt');
       if (blurTxt) blurTxt.textContent = `${imgBlur}px`;

       const hexToRgb = (hex: string) => {
           let r = 0, g = 0, b = 0;
           if (hex.length == 4) { r = parseInt(hex[1]+hex[1], 16); g = parseInt(hex[2]+hex[2], 16); b = parseInt(hex[3]+hex[3], 16); }
           else if (hex.length == 7) { r = parseInt(hex.substring(1,3), 16); g = parseInt(hex.substring(3,5), 16); b = parseInt(hex.substring(5,7), 16); }
           return `${r}, ${g}, ${b}`;
       };

       meta.gradC1 = (container.querySelector('#scn-c1') as HTMLInputElement)?.value || '#000000';
       meta.gradC2 = (container.querySelector('#scn-c2') as HTMLInputElement)?.value || '#222222';
       meta.gradC1Op = parseInt((container.querySelector('#scn-c1-op') as HTMLInputElement)?.value || '100');
       meta.gradC2Op = parseInt((container.querySelector('#scn-c2-op') as HTMLInputElement)?.value || '100');
       
       const rgbaC1 = `rgba(${hexToRgb(meta.gradC1)}, ${meta.gradC1Op/100})`;
       const rgbaC2 = `rgba(${hexToRgb(meta.gradC2)}, ${meta.gradC2Op/100})`;

       meta.gradFn = (container.querySelector('#scn-gradFn') as HTMLSelectElement)?.value || 'linear-gradient';
       meta.gradDir = (container.querySelector('#scn-gradDir') as HTMLSelectElement)?.value || 'to bottom';
       meta.gradBlend = (container.querySelector('#scn-gradBlend') as HTMLSelectElement)?.value || 'normal';
       
       meta.patType = (container.querySelector('#scn-patType') as HTMLSelectElement)?.value || 'none';
       meta.patC = (container.querySelector('#scn-patC') as HTMLInputElement)?.value || '#ffffff';
       meta.patSize = parseInt((container.querySelector('#scn-patSize') as HTMLInputElement)?.value || '100');
       meta.patDense = parseInt((container.querySelector('#scn-patDense') as HTMLInputElement)?.value || '5');
       meta.patOpacity = (container.querySelector('#scn-patOp') as HTMLInputElement)?.value || '20';
       meta.patBlend = (container.querySelector('#scn-patBlend') as HTMLSelectElement)?.value || 'normal';

       meta.particles = {
           type: (container.querySelector('#scn-p-type') as HTMLSelectElement)?.value || 'none',
           color: (container.querySelector('#scn-p-color') as HTMLInputElement)?.value || '#ffaa00',
           count: parseInt((container.querySelector('#scn-p-count') as HTMLInputElement)?.value || '20')
       };

       const patOpLbl = container.querySelector('#lbl-patOp');
       if (patOpLbl) patOpLbl.textContent = meta.patOpacity;

       let combinedGrad = `${meta.gradFn}(${meta.gradDir}, ${rgbaC1}, ${rgbaC2})`;
       let patSvg = '';
       if (meta.patType !== 'none') {
           patSvg = generateSvgPattern(meta.patType, meta.patC, parseInt(meta.patOpacity), meta.patSize, meta.patDense);
       }
       
       const combinedObj = {
           mode: meta.mode,
           url: u,
           mediaType: meta.mediaType || 'image',
           filter: imgFilterFn,
           filterVal: imgFilterVal,
           blur: meta.blur || 0,
           gradient: combinedGrad,
           gradBlend: meta.gradBlend,
           pattern: patSvg,
           patSpeed: meta.patDense,
           patBlend: meta.patBlend,
           layers: meta.layers || ['pat', 'grad', 'img'],
           particles: meta.particles || { type: 'none' }
       };

       const bgPayload = JSON.stringify(combinedObj);
       (this.scenarios as any)[effId] = bgPayload;
       applyScenarioBackground(bgPayload);

       if (s.id === 'boss_battle' && this.selectedMobbyId) {
           const mobbys = MobbyManager.getMobbys();
           const mob = mobbys.find(m => m.id === this.selectedMobbyId);
           if (mob) {
               mob.backgroundUrl = bgPayload;
               MobbyManager.upsertMobby(mob);
           }
       } else if (s.id === 'boss_battle') {
           (this.scenarios as any)['boss_battle'] = bgPayload;
       }
    };

    container.querySelectorAll('.scn-realtime').forEach(el => {
       el.addEventListener('input', compileRealtime);
    });

    const btnSave = container.querySelector('#btn-save-scenarios') as HTMLButtonElement;
    btnSave?.addEventListener('click', async () => {
       btnSave.disabled = true;
       btnSave.textContent = 'GRAVANDO...';
       
       compileRealtime();

       // 1. Se estiver editando mobby individual, garante atualização no MobbyManager
       if (s.id === 'boss_battle' && this.selectedMobbyId) {
          const mobbys = MobbyManager.getMobbys();
          const mob = mobbys.find(m => m.id === this.selectedMobbyId);
          if (mob) {
             mob.backgroundUrl = (this.scenarios as any)[effId];
             MobbyManager.upsertMobby(mob);
             MobbyManager.saveMobbys(mobbys);
          }
       } else if (s.id === 'boss_battle') {
          (this.scenarios as any)['boss_battle'] = (this.scenarios as any)[effId];
       }

       // 2. Salva mobbys no MobbyManager
       MobbyManager.saveMobbys(MobbyManager.getMobbys());

       // 3. Salva no localStorage imediatamente
       try {
          localStorage.setItem('forge_scenarios', JSON.stringify(this.scenarios));
       } catch (e) {
          console.warn('Erro ao salvar no localStorage:', e);
       }

       // 4. Salva no servidor (/api/save-scenarios)
       const ok = await this.saveJson('/api/save-scenarios', this.scenarios);
       if (ok) {
           btnSave.textContent = '✅ GRAVADO!';
           const targetLabel = (s.id === 'boss_battle' && this.selectedMobbyId)
              ? (MobbyManager.getMobbyById(this.selectedMobbyId)?.name || 'Mobby')
              : s.label.split(' / ')[0];
           this.showToast(`Cenário de [${targetLabel}] gravado com sucesso!`, '#4cff88');
       } else {
           btnSave.textContent = '❌ FALHA';
           this.showToast('Falha ao gravar no servidor.', '#ff4444');
       }
       setTimeout(() => { btnSave.disabled = false; btnSave.textContent = '💾 GRAVAR CENÁRIOS'; }, 3000);
    });
  }
}
