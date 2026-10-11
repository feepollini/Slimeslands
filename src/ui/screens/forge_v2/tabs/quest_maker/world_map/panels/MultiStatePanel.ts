import { SoundPickerPopup } from './SoundPickerPopup';

export class MultiStatePanel {
  private activeTab: string = 'collision';
  private state: any;
  private soundPicker = new SoundPickerPopup();

  constructor() {}

  public render(selectedObj: any, state: any, _callbacks: any): string {
    this.state = state;
    if (!selectedObj) {
      return `<div style="padding:40px; text-align:center; opacity:0.2; font-size:0.8rem; font-weight:900; letter-spacing:1px;">Nenhum objeto selecionado</div>`;
    }

    const obj = selectedObj;
    const type = obj.type || '';
    const isMorphOrAsset = ['morph', 'image', 'player'].includes(type);
    const isPrimary = ['collision', 'sensor', 'area', 'area_sensor'].includes(type);

    // Se não é primal nem morph/asset, mostrar mensagem
    if (!isPrimary && !isMorphOrAsset) {
      return `<div style="padding:40px; text-align:center; opacity:0.2; font-size:0.7rem; font-weight:900; letter-spacing:1px;">Selecione um objeto (Colisão, Sensor, Área ou Asset)</div>`;
    }

    // Find all grouped objects (clones sharing same groupId)
    const groupId = obj.groupId || obj.id;
    const allObjects = state?.worldMapObjects || [];
    
    // Se for morph/asset, buscar seus filhos collision/sensor
    // Se for primal, usar o próprio objeto (não procurar grupo)
    let groupObjects: any[] = [];
    if (isMorphOrAsset) {
      groupObjects = allObjects.filter((o: any) => o.parentId === obj.id && ['collision', 'sensor', 'area', 'area_sensor'].includes(o.type));
      // Se não tem filhos ainda, mostrar opções para criar
      if (groupObjects.length === 0) {
        groupObjects = [obj]; // Usar o próprio como placeholder
      }
    } else {
      // Para primitivos (collision/sensor), usar o próprio objeto
      groupObjects = [obj];
    }

    // Which states exist - for primitives, just check if this object exists
    const existingTypes = groupObjects.map((o: any) => o.type);

    // Tab toggle logic: if tab type exists in group, it's "active"
    const tabs = [
      { id: 'collision', label: 'COLISÃO', icon: '🧱', color: '#ff4444', active: existingTypes.includes('collision') },
      { id: 'area_sensor', label: 'SENSOR DE ÁREA', icon: '◫', color: '#44ccff', active: existingTypes.includes('area_sensor') || existingTypes.includes('area') || existingTypes.includes('sensor') },
    ];

    // Ensure activeTab is one that exists
    if (!existingTypes.includes(this.activeTab) && this.activeTab !== 'area_sensor') {
      this.activeTab = type;
    }
    if (this.activeTab === 'area' || this.activeTab === 'sensor') {
      this.activeTab = 'area_sensor';
    }

    const tabBar = `
      <div style="display:flex; gap:4px; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.06); background:rgba(0,0,0,0.2);">
        ${tabs.map(t => `
          <div style="flex:1; display:flex; flex-direction:column; gap:3px;">
            <button class="a4-tab" data-tab="${t.id}" style="
              padding:8px 4px; border:none; border-radius:6px; cursor:pointer; font-size:0.5rem; font-weight:900; letter-spacing:0.5px;
              background:${this.activeTab === t.id ? `${t.color}20` : 'transparent'};
              color:${this.activeTab === t.id ? t.color : 'rgba(255,255,255,0.35)'};
              border:1px solid ${this.activeTab === t.id ? `${t.color}44` : 'transparent'};
              transition:0.2s;
            ">${t.icon} ${t.label}</button>
            <button class="a4-state-toggle" data-state="${t.id}" data-active="${t.active}" style="
              padding:3px; border-radius:3px; cursor:pointer; font-size:0.4rem; font-weight:900;
              background:${t.active ? `${t.color}15` : 'rgba(255,255,255,0.03)'};
              color:${t.active ? t.color : 'rgba(255,255,255,0.25)'};
              border:1px solid ${t.active ? `${t.color}33` : 'rgba(255,255,255,0.05)'};
              transition:0.2s;
            ">${t.active ? '☑ ATIVO' : '☐ ADICIONAR'}</button>
          </div>
        `).join('')}
      </div>
    `;

    // Get the object for the active tab
    const activeObj = groupObjects.find((o: any) => o.type === this.activeTab) || obj;

    let content = '';
    if (this.activeTab === 'collision') content = this.renderCollisionTab(activeObj, state, groupId, groupObjects);
    else if (this.activeTab === 'area_sensor') content = this.renderAreaSensorTab(activeObj, state, groupId, groupObjects);

    return `
      <div style="height:100%; display:flex; flex-direction:column; background:#0a0a0f;">
        ${tabBar}
        <div style="flex:1; overflow-y:auto;">${content}</div>
      </div>
    `;
  }

  private kfIndicator(obj: any, prop: string, label: string, value: number, min: number, max: number, step: number = 1, color: string = '#51c5ff'): string {
    const hasKf = obj.keyframes && obj.keyframes[prop] && obj.keyframes[prop].length > 0;
    const t = this.state?.currentTime || 0;
    const activeKf = hasKf && obj.keyframes[prop].find((pt: any) => Math.abs(pt.t - t) < 0.05);
    const unit = prop === 'opacity' ? '%' : (prop === 'rotation' ? '°' : 'px');
    const displayVal = prop === 'opacity' ? Math.round(value * 100) : Math.round(value);

    return `
      <div style="margin-bottom:10px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:0.45rem; color:rgba(255,255,255,0.4);">${label}</span>
            <span class="kf-indicator" data-prop="${prop}" style="
              cursor:pointer; font-size:0.7rem; color:${activeKf ? '#ff3366' : (hasKf ? '#51c5ff' : '#444')};
              filter: drop-shadow(0 0 3px ${activeKf ? '#ff336666' : 'transparent'}); transition:0.2s;
            ">${activeKf || hasKf ? '♦' : '♢'}</span>
          </div>
          <span style="font-size:0.55rem; color:${color}; font-weight:900;">${displayVal}${unit}</span>
        </div>
        <input type="range" class="param-slider" data-prop="${prop}" min="${min}" max="${max}" step="${step}" value="${prop === 'opacity' ? value * 100 : value}" style="width:100%; accent-color:${color};">
      </div>
    `;
  }

  private actionSection(obj: any, type: string, state: any): string {
    console.log('[actionSection] called with obj:', obj?.id, 'type:', type, 'actionActive:', obj?.actionActive);
    const prefix = type === 'sensor' ? 'sensor' : (type === 'collision' ? 'col' : (type === 'area_sensor' ? 'area_sensor' : 'area'));
    const eventsKey = `${prefix}Events`;
    const events: any[] = obj[eventsKey] || [];
    const actionActive = obj.actionActive !== false;
    console.log('[actionSection] actionActive:', actionActive, 'events:', events.length);

    const actionTypes = [
      { id: 'playScene', label: 'Reproduzir Cena', icon: '🎬', color: '#ff8c42' },
      { id: 'deliverItem', label: 'Entregar Item', icon: '📦', color: '#ffd700' },
      { id: 'showDialog', label: 'Exibir Diálogo', icon: '💬', color: '#a78bfa' },
      { id: 'animatedInteraction', label: 'Interação Animada', icon: '🎭', color: '#ff69b4' },
      { id: 'phaseChange', label: 'Troca de Fase', icon: '🔄', color: '#44ccff' },
      { id: 'portal', label: 'Portal / Teleporte', icon: '🌀', color: '#9b59b6' },
      { id: 'playAudio', label: 'Reproduzir Áudio', icon: '🔊', color: '#e74c3c' },
      { id: 'spawnEntity', label: 'Spawn Entidade', icon: '✨', color: '#2ecc71' },
      { id: 'dealDamage', label: 'Causar Dano', icon: '⚔️', color: '#ff4444' },
      // Novos tipos - Áudio
      { id: 'playSound', label: 'Som c/ Falloff', icon: '🔉', color: '#ffc800' },
      // Novos tipos - Gameplay
      { id: 'battleStart', label: 'Iniciar Batalha', icon: '⚔️', color: '#ff4444' },
      { id: 'campaignDialogue', label: 'Diálogo Campanha', icon: '💬', color: '#a78bfa' },
      { id: 'tutorial', label: 'Tutorial', icon: '📖', color: '#4cff88' },
      { id: 'loadPhase', label: 'Carregar Fase', icon: '🗺️', color: '#51c5ff' },
      // Novos tipos - ABRIR TELAS
      { id: 'openBoard', label: 'Card Battle', icon: '🃏', color: '#8b5cf6' },
      { id: 'openMap', label: 'Mapa Mundo', icon: '🗺️', color: '#22c55e' },
      { id: 'openArsenal', label: 'Arsenal', icon: '⚔️', color: '#ef4444' },
      { id: 'openAcademy', label: 'Academia', icon: '📚', color: '#3b82f6' },
      { id: 'openProfile', label: 'Perfil', icon: '👤', color: '#ec4899' },
      { id: 'openSettings', label: 'Configurações', icon: '⚙️', color: '#6b7280' },
      { id: 'openSoundCentral', label: 'Som Central', icon: '🎵', color: '#f59e0b' },
      // Chain de eventos
      { id: 'chainEvent', label: 'Encadear Eventos', icon: '🔗', color: '#06b6d4' },
    ];

    const pickerPopup = (ev: any, idx: number, pickerType: string, label: string) => {
      const pickerId = `${prefix}-ev-picker-${idx}-${pickerType}`;
      const isOpen = obj._openPicker === pickerId;
      const currentVal = ev[pickerType] || '';

      if (pickerType === 'audio') {
        return `
          <div style="margin-bottom:6px;">
            <button class="${prefix}-ev-picker-btn" data-picker="${pickerId}" data-type="sound" data-ev="${idx}" style="
              width:100%; padding:10px 12px; border-radius:8px; cursor:pointer; text-align:left;
              background:${currentVal ? 'rgba(167,139,250,0.1)' : 'rgba(0,0,0,0.2)'};
              border:1px solid ${currentVal ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.06)'};
              color:${currentVal ? '#a78bfa' : 'rgba(255,255,255,0.3)'};
              font-size:0.6rem; font-weight:700;
            ">${currentVal ? `🔊 ${currentVal.split('/').pop() || currentVal}` : `🔊 ${label} — clique para selecionar`}</button>
          </div>
        `;
      }

      const items = state?.questAssets || [];
      return `
        <div style="margin-bottom:6px;">
          <button class="${prefix}-ev-picker-btn" data-picker="${pickerId}" data-ev="${idx}" style="
            width:100%; padding:10px 12px; border-radius:8px; cursor:pointer; text-align:left;
            background:${currentVal ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)'};
            border:1px solid ${currentVal ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'};
            color:${currentVal ? '#fff' : 'rgba(255,255,255,0.3)'};
            font-size:0.6rem; font-weight:700;
          ">${currentVal ? `📦 ${currentVal.split('/').pop() || currentVal}` : `📦 ${label} — clique para selecionar`}</button>
          ${isOpen ? `
            <div class="${prefix}-ev-picker-overlay" data-picker="${pickerId}" style="
              position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75);
              z-index:9999; display:flex; align-items:center; justify-content:center;
            ">
              <div style="background:#111; border:1px solid #333; border-radius:10px; padding:16px; max-width:450px; width:90%; max-height:70vh; overflow-y:auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                  <span style="font-size:0.65rem; color:#ffd700; font-weight:900;">${label}</span>
                  <button class="${prefix}-ev-picker-close" data-picker="${pickerId}" style="background:none; border:none; color:#fff; font-size:1.1rem; cursor:pointer;">✕</button>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:6px;">
                  ${items.map((a:any) => {
                    const url = typeof a === 'string' ? a : (a.url || a);
                    return `
                      <div class="${prefix}-ev-picker-item" data-picker="${pickerId}" data-ev="${idx}" data-field="${pickerType}" data-value="${url}" style="
                        width:calc(25% - 5px); aspect-ratio:1/1; border-radius:4px; cursor:pointer;
                        background:url('${url}') center/cover; border:2px solid rgba(255,255,255,0.08);
                      " onmouseover="this.style.borderColor='#ffd700'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'"></div>
                    `;
                  }).join('')}
                  ${items.length === 0 ? `<div style="font-size:0.5rem; opacity:0.3; text-align:center; width:100%; padding:20px;">Nenhum item disponível</div>` : ''}
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    };

    const eventFields = (ev: any, idx: number) => {
      const val = (field: string, def: any = '') => ev[field] !== undefined ? ev[field] : def;

      let fieldsHtml = '';
      if (val('type') === 'showDialog') {
        fieldsHtml = `<textarea class="${prefix}-ev-field" data-ev="${idx}" data-field="dialogText" rows="3" placeholder="Digite o diálogo..." style="
          width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:6px;
          color:#fff; font-size:0.6rem; padding:8px 10px; outline:none; resize:vertical; font-family:inherit; margin-top:6px;
        ">${val('dialogText', '')}</textarea>`;
      } else if (val('type') === 'playScene') {
        fieldsHtml = pickerPopup(ev, idx, 'sceneId', 'Selecionar Cena');
      } else if (val('type') === 'playScene') {
        const savedScenes = state?.savedScenes || [];
        const currentScene = val('sceneId', '');
        const currentTransition = val('sceneTransition', 'fade');
        fieldsHtml = `
          <div style="margin-top:6px;">
            <div style="font-size:0.5rem; color:rgba(255,255,255,0.4); margin-bottom:4px;">SELECIONAR CENA</div>
            <select class="${prefix}-ev-field" data-ev="${idx}" data-field="sceneId" style="
              width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:4px;
              color:#ff8c42; font-size:0.55rem; padding:6px 8px; outline:none; margin-bottom:6px;
            ">
              <option value="">— Selecionar cena —</option>
              ${savedScenes.map((s: any) => `<option value="${s.name}" ${currentScene === s.name ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
            <div style="font-size:0.5rem; color:rgba(255,255,255,0.4); margin-bottom:4px;">TRANSIÇÃO</div>
            <div style="display:flex; gap:4px;">
              <button class="${prefix}-ev-trans-btn" data-ev="${idx}" data-trans="fade" style="
                flex:1; padding:5px; border-radius:4px; cursor:pointer; font-size:0.45rem; font-weight:900;
                background:${currentTransition === 'fade' ? 'rgba(255,140,66,0.2)' : 'rgba(255,255,255,0.03)'};
                color:${currentTransition === 'fade' ? '#ff8c42' : 'rgba(255,255,255,0.4)'};
                border:1px solid ${currentTransition === 'fade' ? '#ff8c4266' : 'rgba(255,255,255,0.08)'};
              ">🌑 Fade</button>
              <button class="${prefix}-ev-trans-btn" data-ev="${idx}" data-trans="camera_pan" style="
                flex:1; padding:5px; border-radius:4px; cursor:pointer; font-size:0.45rem; font-weight:900;
                background:${currentTransition === 'camera_pan' ? 'rgba(255,140,66,0.2)' : 'rgba(255,255,255,0.03)'};
                color:${currentTransition === 'camera_pan' ? '#ff8c42' : 'rgba(255,255,255,0.4)'};
                border:1px solid ${currentTransition === 'camera_pan' ? '#ff8c4266' : 'rgba(255,255,255,0.08)'};
              ">📷 Pan Camera</button>
            </div>
          </div>`;
      } else if (val('type') === 'phaseChange') {
        fieldsHtml = `<input type="text" class="${prefix}-ev-field" data-ev="${idx}" data-field="phaseId" value="${val('phaseId', '')}" placeholder="ID da fase" style="
          width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:6px;
          color:#44ccff; font-size:0.6rem; padding:8px 10px; outline:none; margin-top:6px;
        ">`;
      } else if (val('type') === 'portal') {
        fieldsHtml = `
          <div style="display:flex; gap:6px; margin-top:6px;">
            <div style="flex:1;">
              <div style="font-size:0.5rem; color:rgba(255,255,255,0.3); margin-bottom:3px;">X</div>
              <input type="number" class="${prefix}-ev-field" data-ev="${idx}" data-field="portalX" value="${val('portalX', 0)}" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:#9b59b6; font-size:0.6rem; padding:6px; outline:none;">
            </div>
            <div style="flex:1;">
              <div style="font-size:0.5rem; color:rgba(255,255,255,0.3); margin-bottom:3px;">Y</div>
              <input type="number" class="${prefix}-ev-field" data-ev="${idx}" data-field="portalY" value="${val('portalY', 0)}" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:#9b59b6; font-size:0.6rem; padding:6px; outline:none;">
            </div>
          </div>
          <button class="${prefix}-ev-set-portal" data-ev="${idx}" style="
            width:100%; padding:6px; margin-top:6px; background:rgba(155,89,182,0.1); border:1px solid rgba(155,89,182,0.3);
            border-radius:4px; color:#9b59b6; font-size:0.5rem; font-weight:900; cursor:pointer;
          ">📍 Capturar posição do player</button>`;
      } else if (val('type') === 'playAudio') {
        fieldsHtml = pickerPopup(ev, idx, 'audio', 'Selecionar Áudio');
      } else if (val('type') === 'spawnEntity') {
        fieldsHtml = pickerPopup(ev, idx, 'spawnId', 'Selecionar Entidade');
      } else if (val('type') === 'dealDamage') {
        fieldsHtml = `
          <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
            <span style="font-size:0.5rem; color:rgba(255,255,255,0.4); min-width:50px;">Dano:</span>
            <input type="range" class="${prefix}-ev-field" data-ev="${idx}" data-field="damage" min="1" max="100" value="${val('damage', 0)}" style="flex:1; accent-color:#ff4444;">
            <span style="font-size:0.6rem; color:#ff4444; font-weight:900; width:30px;">${val('damage', 0)}</span>
          </div>`;
      } else if (val('type') === 'deliverItem') {
        fieldsHtml = pickerPopup(ev, idx, 'itemId', 'Selecionar Item');
      } else if (val('type') === 'animatedInteraction') {
        fieldsHtml = pickerPopup(ev, idx, 'interactionId', 'Selecionar Interação');
      } else if (val('type') === 'playSound') {
        fieldsHtml = `
          <div style="margin-top:6px;">
            <input type="text" class="${prefix}-ev-field" data-ev="${idx}" data-field="soundUrl" value="${val('soundUrl', '')}" placeholder="/assets/sounds/music.mp3" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,200,0,0.2); border-radius:4px; color:#ffc800; font-size:0.55rem; padding:6px; margin-bottom:6px;">
            <div style="display:flex; gap:6px; margin-bottom:6px;">
              <div style="flex:1;">
                <div style="font-size:0.45rem; color:rgba(255,255,255,0.4); margin-bottom:3px;">Vol Mín</div>
                <input type="range" class="${prefix}-ev-field" data-ev="${idx}" data-field="minVol" min="0" max="100" value="${val('minVol', 10)}" style="width:100%;">
              </div>
              <div style="flex:1;">
                <div style="font-size:0.45rem; color:rgba(255,255,255,0.4); margin-bottom:3px;">Vol Máx</div>
                <input type="range" class="${prefix}-ev-field" data-ev="${idx}" data-field="maxVol" min="0" max="100" value="${val('maxVol', 100)}" style="width:100%;">
              </div>
            </div>
            <select class="${prefix}-ev-field" data-ev="${idx}" data-field="curve" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,200,0,0.2); border-radius:4px; color:#ffc800; font-size:0.5rem; padding:6px; margin-bottom:6px;">
              <option value="linear" ${val('curve', 'linear') === 'linear' ? 'selected' : ''}>Curva: Linear</option>
              <option value="logarithmic" ${val('curve', 'linear') === 'logarithmic' ? 'selected' : ''}>Curva: Logarítmica</option>
              <option value="inverse" ${val('curve', 'linear') === 'inverse' ? 'selected' : ''}>Curva: Inversa</option>
            </select>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="checkbox" class="${prefix}-ev-field" data-ev="${idx}" data-field="invert" ${val('invert', false) ? 'checked' : ''}>
              <span style="font-size:0.45rem; color:rgba(255,255,255,0.4);">Inverter (100% na borda)</span>
            </label>
          </div>`;
      } else if (val('type') === 'battleStart') {
        fieldsHtml = `
          <div style="margin-top:6px;">
            <div style="font-size:0.5rem; color:rgba(255,255,255,0.4); margin-bottom:4px;">TIPO DE BATALHA</div>
            <select class="${prefix}-ev-field" data-ev="${idx}" data-field="battleType" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,68,68,0.2); border-radius:4px; color:#ff4444; font-size:0.55rem; padding:6px; margin-bottom:6px;">
              <option value="normal" ${val('battleType', 'normal') === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="elite" ${val('battleType', 'normal') === 'elite' ? 'selected' : ''}>Elite</option>
              <option value="boss" ${val('battleType', 'normal') === 'boss' ? 'selected' : ''}>Chefe</option>
            </select>
            <div style="font-size:0.5rem; color:rgba(255,255,255,0.4); margin-bottom:4px;">INIMIGOS (separados por vírgula)</div>
            <input type="text" class="${prefix}-ev-field" data-ev="${idx}" data-field="enemies" value="${val('enemies', '')}" placeholder="goblin, skeleton, boss" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,68,68,0.2); border-radius:4px; color:#ff4444; font-size:0.55rem; padding:6px;">
          </div>`;
      } else if (val('type') === 'campaignDialogue') {
        fieldsHtml = `
          <div style="margin-top:6px;">
            <input type="text" class="${prefix}-ev-field" data-ev="${idx}" data-field="bg" value="${val('bg', '')}" placeholder="Fundo (URL)" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(167,139,250,0.2); border-radius:4px; color:#a78bfa; font-size:0.55rem; padding:6px; margin-bottom:6px;">
            <textarea class="${prefix}-ev-field" data-ev="${idx}" data-field="lines" rows="3" placeholder='[{"turn":0,"side":"player","text":"Olá!"}]' style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(167,139,250,0.2); border-radius:4px; color:#a78bfa; font-size:0.5rem; padding:6px; font-family:monospace; margin-bottom:6px;">${val('lines', '')}</textarea>
            <div style="display:flex; gap:6px;">
              <div style="flex:1;">
                <div style="font-size:0.45rem; color:rgba(255,255,255,0.4); margin-bottom:3px;">Velocidade</div>
                <input type="number" class="${prefix}-ev-field" data-ev="${idx}" data-field="speed" value="${val('speed', 0.05)}" step="0.01" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(167,139,250,0.2); border-radius:4px; color:#a78bfa; font-size:0.55rem; padding:6px;">
              </div>
            </div>
            <input type="text" class="${prefix}-ev-field" data-ev="${idx}" data-field="rewards" value="${val('rewards', '')}" placeholder="Recompensas (ex: xp:100)" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(167,139,250,0.2); border-radius:4px; color:#a78bfa; font-size:0.55rem; padding:6px; margin-top:6px;">
          </div>`;
      } else if (val('type') === 'tutorial') {
        fieldsHtml = `
          <div style="margin-top:6px;">
            <input type="text" class="${prefix}-ev-field" data-ev="${idx}" data-field="title" value="${val('title', '')}" placeholder="Título do Tutorial" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(76,255,136,0.2); border-radius:4px; color:#4cff88; font-size:0.55rem; padding:6px; margin-bottom:6px;">
            <textarea class="${prefix}-ev-field" data-ev="${idx}" data-field="text" rows="2" placeholder="Texto do tutorial..." style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(76,255,136,0.2); border-radius:4px; color:#4cff88; font-size:0.55rem; padding:6px; margin-bottom:6px;">${val('text', '')}</textarea>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="checkbox" class="${prefix}-ev-field" data-ev="${idx}" data-field="freezePlayer" ${val('freezePlayer', false) ? 'checked' : ''}>
              <span style="font-size:0.45rem; color:rgba(255,255,255,0.4);">Bloquear Player</span>
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="checkbox" class="${prefix}-ev-field" data-ev="${idx}" data-field="highlightUI" ${val('highlightUI', false) ? 'checked' : ''}>
              <span style="font-size:0.45rem; color:rgba(255,255,255,0.4);">Destacar UI</span>
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="checkbox" class="${prefix}-ev-field" data-ev="${idx}" data-field="autoDestroy" ${val('autoDestroy', true) ? 'checked' : ''}>
              <span style="font-size:0.45rem; color:rgba(255,255,255,0.4);">Auto-destruir</span>
            </label>
          </div>`;
      } else if (val('type') === 'loadPhase') {
        fieldsHtml = `
          <div style="margin-top:6px;">
            <input type="text" class="${prefix}-ev-field" data-ev="${idx}" data-field="phaseId" value="${val('phaseId', '')}" placeholder="ID da Fase" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(81,197,255,0.2); border-radius:4px; color:#51c5ff; font-size:0.55rem; padding:6px; margin-bottom:6px;">
            <div style="display:flex; gap:6px;">
              <div style="flex:1;">
                <div style="font-size:0.45rem; color:rgba(255,255,255,0.4); margin-bottom:3px;">Player X</div>
                <input type="number" class="${prefix}-ev-field" data-ev="${idx}" data-field="playerX" value="${val('playerX', 0)}" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(81,197,255,0.2); border-radius:4px; color:#51c5ff; font-size:0.55rem; padding:6px;">
              </div>
              <div style="flex:1;">
                <div style="font-size:0.45rem; color:rgba(255,255,255,0.4); margin-bottom:3px;">Player Y</div>
                <input type="number" class="${prefix}-ev-field" data-ev="${idx}" data-field="playerY" value="${val('playerY', 0)}" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(81,197,255,0.2); border-radius:4px; color:#51c5ff; font-size:0.55rem; padding:6px;">
              </div>
            </div>
          </div>`;
      } else if (val('type') === 'openBoard') {
        fieldsHtml = `
          <div style="margin-top:6px;">
            <div style="font-size:0.45rem; color:rgba(255,255,255,0.4); margin-bottom:4px;">TIPO DE BATALHA</div>
            <select class="${prefix}-ev-field" data-ev="${idx}" data-field="boardType" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(139,92,246,0.2); border-radius:4px; color:#8b5cf6; font-size:0.55rem; padding:6px; margin-bottom:6px;">
              <option value="pvp" ${val('boardType', 'pvp') === 'pvp' ? 'selected' : ''}>PvP</option>
              <option value="pve" ${val('boardType', 'pve') === 'pve' ? 'selected' : ''}>PvE</option>
              <option value="tournament" ${val('boardType', 'pve') === 'tournament' ? 'selected' : ''}>Torneio</option>
            </select>
            <input type="text" class="${prefix}-ev-field" data-ev="${idx}" data-field="opponentDeck" value="${val('opponentDeck', '')}" placeholder="Deck do oponente (ID)" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(139,92,246,0.2); border-radius:4px; color:#8b5cf6; font-size:0.55rem; padding:6px;">
            <label style="display:flex; align-items:center; gap:6px; margin-top:6px; cursor:pointer;">
              <input type="checkbox" class="${prefix}-ev-field" data-ev="${idx}" data-field="returnOnComplete" ${val('returnOnComplete', true) ? 'checked' : ''}>
              <span style="font-size:0.45rem; color:rgba(255,255,255,0.4);">Retornar à fase ao completar</span>
            </label>
          </div>`;
      } else if (val('type') === 'openMap') {
        fieldsHtml = `
          <div style="margin-top:6px;">
            <input type="text" class="${prefix}-ev-field" data-ev="${idx}" data-field="mapId" value="${val('mapId', '')}" placeholder="ID do Mapa" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(34,197,94,0.2); border-radius:4px; color:#22c55e; font-size:0.55rem; padding:6px; margin-bottom:6px;">
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="checkbox" class="${prefix}-ev-field" data-ev="${idx}" data-field="returnOnComplete" ${val('returnOnComplete', true) ? 'checked' : ''}>
              <span style="font-size:0.45rem; color:rgba(255,255,255,0.4);">Retornar à fase ao sair</span>
            </label>
          </div>`;
      } else if (val('type') === 'openArsenal' || val('type') === 'openAcademy' || val('type') === 'openProfile' || val('type') === 'openSettings' || val('type') === 'openSoundCentral') {
        const colorMap: any = { openArsenal: '#ef4444', openAcademy: '#3b82f6', openProfile: '#ec4899', openSettings: '#6b7280', openSoundCentral: '#f59e0b' };
        fieldsHtml = `
          <div style="margin-top:6px;">
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="checkbox" class="${prefix}-ev-field" data-ev="${idx}" data-field="returnOnComplete" ${val('returnOnComplete', true) ? 'checked' : ''}>
              <span style="font-size:0.45rem; color:rgba(255,255,255,0.4);">Retornar à fase ao sair</span>
            </label>
            <input type="text" class="${prefix}-ev-field" data-ev="${idx}" data-field="screenParams" value="${val('screenParams', '')}" placeholder="Parâmetros extras (JSON)" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid ${colorMap[val('type')] || '#555'}40; border-radius:4px; color:#fff; font-size:0.5rem; padding:6px; margin-top:6px; font-family:monospace;">
          </div>`;
      } else if (val('type') === 'chainEvent') {
        fieldsHtml = `
          <div style="margin-top:6px;">
            <div style="font-size:0.45rem; color:rgba(255,255,255,0.4); margin-bottom:4px;">EVENTOS ENCADEADOS (JSON)</div>
            <textarea class="${prefix}-ev-field" data-ev="${idx}" data-field="chainEvents" rows="4" placeholder='[{"type":"giveItem","itemId":"potion"},{"type":"showDialog","text":"Você obteve uma poção!"}]' style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(6,182,212,0.2); border-radius:4px; color:#06b6d4; font-size:0.5rem; padding:6px; font-family:monospace;">${val('chainEvents', '')}</textarea>
            <div style="font-size:0.4rem; color:#666; margin-top:4px;">Execute múltiplos eventos em sequência</div>
          </div>`;
      }

      return `
        <div style="margin-bottom:8px; padding:10px; background:rgba(0,0,0,0.2); border-radius:6px; border-left:3px solid ${val('type') ? (actionTypes.find(a => a.id === val('type'))?.color || '#555') : '#555'};">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
            <span style="font-size:0.55rem; color:rgba(255,255,255,0.4); font-weight:900;">Evento #${idx + 1}</span>
            <button class="${prefix}-ev-remove" data-ev="${idx}" style="background:none; border:none; color:#ff4444; font-size:0.8rem; cursor:pointer; padding:0 6px;">✕</button>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:6px;">
            ${actionTypes.map(a => `
              <button class="${prefix}-ev-type-btn" data-ev="${idx}" data-action="${a.id}" style="
                padding:6px 10px; border-radius:4px; cursor:pointer; font-size:0.55rem; font-weight:900;
                background:${val('type') === a.id ? `${a.color}20` : 'rgba(255,255,255,0.03)'};
                border:1px solid ${val('type') === a.id ? `${a.color}55` : 'rgba(255,255,255,0.06)'};
                color:${val('type') === a.id ? a.color : 'rgba(255,255,255,0.35)'};
              ">${a.icon} ${a.label}</button>
            `).join('')}
          </div>
          ${fieldsHtml}
        </div>
      `;
    };

    return `
      <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:12px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
          <div style="font-size:0.6rem; color:#ffd700; font-weight:800; letter-spacing:0.5px;">📡 EVENTOS AO INTERAGIR</div>
          <button class="${prefix}-action-toggle" style="
            padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.5rem; font-weight:900;
            background:${actionActive ? 'rgba(76,255,136,0.2)' : 'rgba(255,255,255,0.03)'};
            color:${actionActive ? '#4cff88' : 'rgba(255,255,255,0.35)'};
            border:1px solid ${actionActive ? '#4cff8866' : 'rgba(255,255,255,0.08)'};
          ">${actionActive ? '☑ ATIVO' : '☐ INATIVO'}</button>
        </div>

        ${actionActive ? `
          <div style="margin-bottom:8px;">
            ${events.map((ev, idx) => eventFields(ev, idx)).join('')}
          </div>
          <button class="${prefix}-ev-add" style="
            width:100%; padding:8px; background:rgba(255,215,0,0.08); border:1px dashed rgba(255,215,0,0.3);
            border-radius:6px; color:#ffd700; font-size:0.55rem; font-weight:900; cursor:pointer;
          ">+ ADICIONAR EVENTO</button>
        ` : ''}
      </div>
    `;
  }

  private renderCollisionTab(obj: any, state: any, _groupId: string, groupObjects: any[]): string {
    // Se for morph/asset sem collision, mostrar botão para adicionar
    if (!obj || obj.type === 'morph' || obj.type === 'image' || obj.type === 'player') {
      return `
        <div style="padding:40px; text-align:center;">
          <div style="font-size:0.5rem; color:#ff4444; font-weight:800; margin-bottom:16px;">COLISÃO</div>
          <button class="add-child-primal" data-type="collision" style="
            padding:12px 20px; border-radius:8px; cursor:pointer; font-size:0.6rem; font-weight:900;
            background:rgba(255,68,68,0.15); color:#ff4444; border:1px solid #ff444466;
          ">➕ ADICIONAR COLISÃO</button>
        </div>
      `;
    }

    const colMode = obj.collisionMode || 'total';
    const linkAsset = obj.linkMorphAsset || '';
    const allObjects = state?.worldMapObjects || [];
    const excludedIds = obj.collisionExcluded || [];
    const isEnabled = obj.isEnabled !== false; // Default true
    const isTriggered = obj._playerInSensor || false;

    return `
      <div style="padding:12px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <div style="font-size:0.5rem; color:#ff4444; font-weight:800; letter-spacing:1px;">COLISÃO</div>
          <button class="toggle-primal" data-prop="isEnabled" data-value="${isEnabled ? 'false' : 'true'}" style="
            display:flex; align-items:center; gap:4px; padding:6px 10px; border-radius:4px; cursor:pointer; border:none;
            background:${isEnabled ? 'rgba(76,255,136,0.15)' : 'rgba(255,68,68,0.15)'};
            border:1px solid ${isEnabled ? '#4cff8866' : '#ff444466'};
            transition:0.3s;
          ">
            <span style="font-size:0.65rem; color:${isEnabled ? '#4cff88' : '#ff4444'};">${isEnabled ? '✅' : '⬜'}</span>
            <span style="font-size:0.4rem; color:${isEnabled ? '#4cff88' : '#ff4444'}; font-weight:900;">${isEnabled ? 'ATIVO' : 'INATIVO'}</span>
          </button>
        </div>
        <div style="display:flex; gap:6px; margin-bottom:16px;">
          <button class="col-mode-btn" data-mode="total" style="
            flex:1; padding:10px; border-radius:8px; cursor:pointer; font-size:0.55rem; font-weight:900;
            background:${colMode === 'total' ? 'rgba(255,68,68,0.2)' : 'rgba(255,255,255,0.03)'};
            color:${colMode === 'total' ? '#ff4444' : 'rgba(255,255,255,0.4)'};
            border:1px solid ${colMode === 'total' ? '#ff444466' : 'rgba(255,255,255,0.08)'};
          ">🚫 TOTAL<br><span style="font-size:0.4rem; opacity:0.6;">Nada passa</span></button>
          <button class="col-mode-btn" data-mode="partial" style="
            flex:1; padding:10px; border-radius:8px; cursor:pointer; font-size:0.55rem; font-weight:900;
            background:${colMode === 'partial' ? 'rgba(255,165,0,0.2)' : 'rgba(255,255,255,0.03)'};
            color:${colMode === 'partial' ? '#ffa500' : 'rgba(255,255,255,0.4)'};
            border:1px solid ${colMode === 'partial' ? '#ffa50066' : 'rgba(255,255,255,0.08)'};
          ">⚠️ PARCIAL<br><span style="font-size:0.4rem; opacity:0.6;">Selecionar</span></button>
        </div>

        ${colMode === 'partial' ? `
          <div style="margin-bottom:16px;">
            <div style="font-size:0.5rem; color:rgba(255,255,255,0.4); font-weight:800; margin-bottom:6px;">OBJETOS QUE PODEM PASSAR</div>
            <div style="max-height:120px; overflow-y:auto; border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:4px;">
              ${allObjects.filter((o:any) => o.id !== obj.id && o.type !== 'camera').map((o:any) => {
                const excluded = excludedIds.includes(o.id);
                return `<div class="col-exclude-item" data-id="${o.id}" style="
                  display:flex; align-items:center; gap:6px; padding:5px 6px; border-radius:4px; cursor:pointer;
                  background:${excluded ? 'rgba(76,255,136,0.08)' : 'transparent'}; border-bottom:1px solid rgba(255,255,255,0.03);
                "><span style="font-size:0.65rem; color:${excluded ? '#4cff88' : '#555'};">${excluded ? '☑' : '☐'}</span>
                <span style="font-size:0.55rem; color:${excluded ? '#4cff88' : '#aaa'};">${o.label || o.type}</span></div>`;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <div style="margin-bottom:16px;">
          <div style="font-size:0.5rem; color:rgba(255,255,255,0.4); font-weight:800; margin-bottom:6px;">LINK TO MORPH</div>
          <input type="text" class="col-link-input" value="${linkAsset}" placeholder="/cards/asset.png ou vazio = invisível" style="
            width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:6px;
            color:#51c5ff; font-size:0.55rem; padding:6px 8px; outline:none;
          ">
          ${linkAsset ? `<div style="margin-top:4px; width:50px; height:50px; border-radius:4px; background:url('${linkAsset}') center/cover; border:1px solid rgba(255,255,255,0.1);"></div>` : ''}
        </div>

        <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:12px; margin-bottom:16px;">
          <div style="font-size:0.5rem; color:#51c5ff; font-weight:800; margin-bottom:10px; letter-spacing:0.5px;">PARÂMETROS</div>
          ${this.kfIndicator(obj, 'x', 'Posição X', obj.x || 0, -2000, 4000, 1, '#51c5ff')}
          ${this.kfIndicator(obj, 'y', 'Posição Y', obj.y || 0, -2000, 4000, 1, '#51c5ff')}
          ${this.kfIndicator(obj, 'w', 'Largura', obj.w || 100, 10, 2000, 1, '#51c5ff')}
          ${this.kfIndicator(obj, 'h', 'Altura', obj.h || 100, 10, 2000, 1, '#51c5ff')}
          ${this.kfIndicator(obj, 'opacity', 'Opacidade', obj.opacity ?? 1, 0, 100, 1, '#ff4444')}
          <div style="margin-bottom:10px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:0.45rem; color:rgba(255,255,255,0.4);">Escala</span>
                <span class="kf-indicator" data-prop="collisionScale" style="
                  cursor:pointer; font-size:0.7rem; color:${obj.keyframes?.collisionScale?.length ? '#51c5ff' : '#444'};
                ">${obj.keyframes?.collisionScale?.length ? '♦' : '♢'}</span>
              </div>
              <span style="font-size:0.55rem; color:#ff4444; font-weight:900;">${obj.collisionScale || 100}%</span>
            </div>
            <input type="range" class="param-slider" data-prop="collisionScale" min="10" max="300" value="${obj.collisionScale || 100}" style="width:100%; accent-color:#ff4444;">
          </div>
        </div>

        ${this.actionSection(obj, 'collision', state)}

        ${groupObjects.length > 1 ? `
          <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:10px; margin-top:8px;">
            <div style="font-size:0.45rem; color:rgba(255,255,255,0.3); font-weight:800; margin-bottom:6px;">ESTADOS VINCULADOS</div>
            ${groupObjects.filter(o => o.type !== 'collision').map(o => `
              <div style="display:flex; align-items:center; gap:6px; padding:4px 6px; background:rgba(255,255,255,0.02); border-radius:4px; margin-bottom:3px;">
                <span style="font-size:0.6rem;">${o.type === 'sensor' ? '📡' : '🧭'}</span>
                <span style="font-size:0.45rem; color:rgba(255,255,255,0.4);">${o.label || o.type}</span>
                <span style="font-size:0.4rem; color:rgba(255,255,255,0.2); margin-left:auto;">${Math.round(o.w)}×${Math.round(o.h)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderAreaSensorTab(obj: any, state: any, _groupId: string, groupObjects: any[]): string {
    // Se for morph/asset sem sensor, mostrar botão para adicionar
    if (!obj || obj.type === 'morph' || obj.type === 'image' || obj.type === 'player') {
      return `
        <div style="padding:40px; text-align:center;">
          <div style="font-size:0.5rem; color:#44ccff; font-weight:800; margin-bottom:16px;">SENSOR DE ÁREA</div>
          <button class="add-child-primal" data-type="area_sensor" style="
            padding:12px 20px; border-radius:8px; cursor:pointer; font-size:0.6rem; font-weight:900;
            background:rgba(68,204,255,0.15); color:#44ccff; border:1px solid #44ccff66;
          ">➕ ADICIONAR SENSOR</button>
        </div>
      `;
    }

    const navType = obj.navType || 'walkable';
    const navColor = obj.color || '#44ccff';
    const isEnabled = obj.isEnabled !== false;
    const isTriggered = obj._playerInSensor || false;

    return `
      <div style="padding:12px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <div style="font-size:0.5rem; color:#44ccff; font-weight:800; letter-spacing:1px;">SENSOR DE ÁREA</div>
          <button class="toggle-primal" data-prop="isEnabled" data-value="${isEnabled ? 'false' : 'true'}" style="
            display:flex; align-items:center; gap:4px; padding:6px 10px; border-radius:4px; cursor:pointer; border:none;
            background:${isEnabled ? 'rgba(76,255,136,0.15)' : 'rgba(68,204,255,0.15)'};
            border:1px solid ${isEnabled ? '#4cff8866' : '#44ccff66'};
            transition:0.3s;
          ">
            <span style="font-size:0.65rem; color:${isEnabled ? '#4cff88' : '#44ccff'};">${isEnabled ? '✅' : '⬜'}</span>
            <span style="font-size:0.4rem; color:${isEnabled ? '#4cff88' : '#44ccff'}; font-weight:900;">${isEnabled ? 'ATIVO' : 'INATIVO'}</span>
          </button>
        </div>
          <span class="state-signal" data-type="area_sensor" style="
            display:flex; align-items:center; gap:4px; padding:3px 8px; border-radius:4px;
            background:${isTriggered ? 'rgba(76,255,136,0.15)' : 'rgba(255,255,255,0.03)'};
            border:1px solid ${isTriggered ? '#4cff8866' : 'rgba(255,255,255,0.06)'};
            transition:0.3s;
          ">
            <span style="font-size:0.65rem; color:${isTriggered ? '#4cff88' : '#555'};">${isTriggered ? '✅' : '⬜'}</span>
            <span style="font-size:0.4rem; color:${isTriggered ? '#4cff88' : 'rgba(255,255,255,0.25)'}; font-weight:900;">${isTriggered ? 'ATIVO' : 'INATIVO'}</span>
          </span>
        </div>

        <div style="font-size:0.5rem; color:rgba(255,255,255,0.4); font-weight:800; margin-bottom:8px;">TIPO DE ZONA</div>
        <div style="display:flex; flex-direction:column; gap:4px; margin-bottom:14px;">
          ${[
            { id: 'walkable', label: '🚶 CAMINHÁVEL', sub: 'Onde o player anda' },
            { id: 'route', label: '🛤️ ROTA', sub: 'Demarcar caminhos' },
            { id: 'restricted', label: '🚫 RESTRITA', sub: 'Zona proibida' },
          ].map(t => `
            <button class="nav-type-btn" data-type="${t.id}" style="
              display:flex; align-items:center; gap:6px; padding:8px; border-radius:6px; cursor:pointer;
              background:${navType === t.id ? 'rgba(68,255,68,0.15)' : 'rgba(255,255,255,0.03)'};
              border:1px solid ${navType === t.id ? '#44ff4466' : 'rgba(255,255,255,0.08)'};
              color:${navType === t.id ? '#44ff44' : 'rgba(255,255,255,0.4)'};
              font-size:0.5rem; font-weight:900; transition:0.2s;
            "><span>${t.label}</span><span style="font-size:0.4rem; opacity:0.5;">${t.sub}</span></button>
          `).join('')}
        </div>

        <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:12px; margin-bottom:16px;">
          <div style="font-size:0.5rem; color:#51c5ff; font-weight:800; margin-bottom:10px; letter-spacing:0.5px;">PARÂMETROS</div>
          ${this.kfIndicator(obj, 'x', 'Posição X', obj.x || 0, -2000, 4000, 1, '#51c5ff')}
          ${this.kfIndicator(obj, 'y', 'Posição Y', obj.y || 0, -2000, 4000, 1, '#51c5ff')}
          ${this.kfIndicator(obj, 'w', 'Largura', obj.w || 100, 10, 2000, 1, '#51c5ff')}
          ${this.kfIndicator(obj, 'h', 'Altura', obj.h || 100, 10, 2000, 1, '#51c5ff')}
          ${this.kfIndicator(obj, 'opacity', 'Opacidade', obj.opacity ?? 0.4, 0, 100, 1, '#44ccff')}
          <div style="margin-bottom:10px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:0.45rem; color:rgba(255,255,255,0.4);">Raio de Detecção</span>
                <span class="kf-indicator" data-prop="sensorRadius" style="
                  cursor:pointer; font-size:0.7rem; color:${obj.keyframes?.sensorRadius?.length ? '#51c5ff' : '#444'};
                ">${obj.keyframes?.sensorRadius?.length ? '♦' : '♢'}</span>
              </div>
              <span style="font-size:0.55rem; color:#44ccff; font-weight:900;">${obj.sensorRadius || 100}px</span>
            </div>
            <input type="range" class="param-slider" data-prop="sensorRadius" min="20" max="500" value="${obj.sensorRadius || 100}" style="width:100%; accent-color:#44ccff;">
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <div style="font-size:0.5rem; color:rgba(255,255,255,0.4); font-weight:800; margin-bottom:8px;">COR DA ÁREA</div>
          <input type="color" class="nav-color-input" value="${navColor}" style="width:100%; height:32px; background:transparent; border:1px solid rgba(255,255,255,0.1); border-radius:6px; cursor:pointer; padding:2px;">
        </div>

        <div style="margin-bottom:16px;">
          <div style="font-size:0.5rem; color:rgba(255,255,255,0.4); font-weight:800; margin-bottom:6px;">GATILHO</div>
          <div style="display:flex; gap:4px;">
            ${['onEnter','onExit','onStay'].map(t => `
              <button class="sensor-trigger-btn" data-trigger="${t}" style="
                flex:1; padding:6px; border-radius:4px; cursor:pointer; font-size:0.45rem; font-weight:900;
                background:${obj.sensorTrigger === t ? 'rgba(68,204,255,0.2)' : 'rgba(255,255,255,0.03)'};
                color:${obj.sensorTrigger === t ? '#44ccff' : 'rgba(255,255,255,0.4)'};
                border:1px solid ${obj.sensorTrigger === t ? '#44ccff66' : 'rgba(255,255,255,0.08)'};
              ">${t === 'onEnter' ? 'ENTRAR' : t === 'onExit' ? 'SAIR' : 'PERMANECER'}</button>
            `).join('')}
          </div>
        </div>

        ${this.actionSection(obj, 'area_sensor', state)}

        ${groupObjects.length > 1 ? `
          <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:10px; margin-top:8px;">
            <div style="font-size:0.45rem; color:rgba(255,255,255,0.3); font-weight:800; margin-bottom:6px;">ESTADOS VINCULADOS</div>
            ${groupObjects.filter(o => o.type !== 'area_sensor' && o.type !== 'area' && o.type !== 'sensor').map(o => `
              <div style="display:flex; align-items:center; gap:6px; padding:4px 6px; background:rgba(255,255,255,0.02); border-radius:4px; margin-bottom:3px;">
                <span style="font-size:0.6rem;">🧱</span>
                <span style="font-size:0.45rem; color:rgba(255,255,255,0.4);">${o.label || o.type}</span>
                <span style="font-size:0.4rem; color:rgba(255,255,255,0.2); margin-left:auto;">${Math.round(o.w)}×${Math.round(o.h)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  public bind(container: HTMLElement, selectedObj: any, state: any, callbacks: any) {
    this.state = state;
    if (!selectedObj) return;

    const groupId = selectedObj.groupId || selectedObj.id;
    const allObjects = state?.worldMapObjects || [];

    // Find the active object for the current tab
    const getActiveObj = () => {
      // Se selectedObj é morph/asset, procurar filhos
      if (selectedObj.type === 'morph' || selectedObj.type === 'image' || selectedObj.type === 'player') {
        const child = allObjects.find((o: any) => o.parentId === selectedObj.id && o.type === this.activeTab);
        if (child) return child;
        // Se não achou filho, criar placeholder
        return selectedObj;
      }
      
      // Se é primal (collision/sensor), retornar o próprio selectedObj
      return selectedObj;
    };

    container.querySelectorAll('.a4-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = (btn as HTMLElement).dataset.tab!;
        if (this.activeTab === 'area' || this.activeTab === 'sensor') this.activeTab = 'area_sensor';
        callbacks.reRender();
      });
    });

    // Toggle primal ON/OFF
    container.querySelectorAll('.toggle-primal').forEach(btn => {
      btn.addEventListener('click', () => {
        const prop = (btn as HTMLElement).dataset.prop!;
        const val = (btn as HTMLElement).dataset.value === 'true';
        
        // Se selectedObj é morph/asset sem filho, primeiro criar o filho
        if (selectedObj.type === 'morph' || selectedObj.type === 'image' || selectedObj.type === 'player') {
          const existing = allObjects.find((o: any) => o.parentId === selectedObj.id && o.type === this.activeTab);
          if (!existing && val) {
            // Criar novo primal filho com actionActive true
            const groupId = selectedObj.groupId || selectedObj.id;
            const newPrimal: any = {
              id: `${this.activeTab}_${Date.now()}`,
              type: this.activeTab,
              x: selectedObj.x,
              y: selectedObj.y,
              w: selectedObj.w,
              h: selectedObj.h,
              label: this.activeTab === 'collision' ? 'Colisão' : 'Sensor de Área',
              color: this.activeTab === 'collision' ? '#ff4444' : '#44ccff',
              shape: 'rect',
              isVisible: true,
              isEnabled: true,
              actionActive: true, // Ativar eventos por default
              parentId: selectedObj.id,
              groupId: groupId,
              isPersistent: true,
            };
            if (this.activeTab === 'collision') newPrimal.collisionMode = 'total';
            else { newPrimal.navType = 'walkable'; newPrimal.sensorTrigger = 'onEnter'; }
            allObjects.push(newPrimal);
          }
        }
        
        const obj = getActiveObj();
        if (obj) {
          obj[prop] = val;
          callbacks.reRender();
          document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        }
      });
    });

    // Add child primal (collision/sensor) for morph/asset
    container.querySelectorAll('.add-child-primal').forEach(btn => {
      btn.addEventListener('click', () => {
        const primalType = (btn as HTMLElement).dataset.type!;
        const parentObj = selectedObj;
        const groupId = parentObj.groupId || parentObj.id;
        
        const newPrimal: any = {
          id: `${primalType}_${Date.now()}`,
          type: primalType,
          x: parentObj.x,
          y: parentObj.y,
          w: parentObj.w,
          h: parentObj.h,
          label: primalType === 'collision' ? 'Colisão' : 'Sensor de Área',
          color: primalType === 'collision' ? '#ff4444' : '#44ccff',
          shape: 'rect',
          isVisible: true,
          isEnabled: true,
          parentId: parentObj.id,
          groupId: groupId,
          isPersistent: true,
        };
        
        if (primalType === 'collision') {
          newPrimal.collisionMode = 'total';
        } else {
          newPrimal.navType = 'walkable';
          newPrimal.sensorTrigger = 'onEnter';
          newPrimal.sensorRadius = 120;
        }
        
        allObjects.push(newPrimal);
        callbacks.reRender();
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      });
    });

    // State toggle: add/remove cloned states
    container.querySelectorAll('.a4-state-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetState = (btn as HTMLElement).dataset.state!;
        const isActive = (btn as HTMLElement).dataset.active === 'true';
        const activeObj = getActiveObj();

        if (isActive) {
          // Remove the clone
          const cloneToRemove = allObjects.find((o: any) => (o.groupId || o.id) === groupId && o.type === targetState && o.id !== activeObj.id);
          if (cloneToRemove) {
            const idx = allObjects.indexOf(cloneToRemove);
            if (idx !== -1) allObjects.splice(idx, 1);
          }
        } else {
          // Clone the active object with new type
          const clone = JSON.parse(JSON.stringify(activeObj));
          clone.id = `${targetState}_${Date.now()}`;
          clone.type = targetState;
          clone.groupId = groupId;
          clone.label = `${targetState === 'area_sensor' ? 'Sensor de Área' : 'Colisão'} (clone)`;
          clone.w = activeObj.w + 20;
          clone.h = activeObj.h + 20;
          clone.x = activeObj.x - 10;
          clone.y = activeObj.y - 10;
          clone.isLocked = false;
          clone.opacity = targetState === 'area_sensor' ? 0.4 : 0.3;
          clone.color = targetState === 'collision' ? '#ff4444' : '#44ccff';
          clone.keyframes = {};

          if (targetState !== 'collision') {
            clone.collisionMode = undefined;
            clone.collisionExcluded = undefined;
            clone.linkMorphAsset = undefined;
            clone.collisionScale = undefined;
            clone.colEvents = undefined;
          }
          if (targetState !== 'area_sensor') {
            clone.navType = undefined;
            clone.sensorTrigger = undefined;
            clone.sensorRadius = undefined;
            clone.area_sensorEvents = undefined;
          }

          allObjects.push(clone);
        }

        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        callbacks.reRender();
      });
    });

    // ─── PARAM SLIDERS ───
    container.querySelectorAll('.param-slider').forEach(slider => {
      slider.addEventListener('input', (e: any) => {
        const prop = slider.getAttribute('data-prop')!;
        const val = parseFloat((e.target as HTMLInputElement).value);
        const obj = getActiveObj();
        if (prop === 'collisionScale' || prop === 'sensorRadius') {
          obj[prop] = val;
        } else if (prop === 'opacity') {
          obj[prop] = val / 100;
        } else {
          obj[prop] = val;
        }
        callbacks.reRender();
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      });
    });

    // ─── KF INDICATORS ───
    container.querySelectorAll('.kf-indicator').forEach(btn => {
      btn.addEventListener('click', () => {
        const prop = (btn as HTMLElement).dataset.prop!;
        const obj = getActiveObj();
        if (!obj.keyframes) obj.keyframes = {};
        const t = state.currentTime || 0;
        let val: number;
        if (prop === 'collisionScale') val = obj.collisionScale || 100;
        else if (prop === 'sensorRadius') val = obj.sensorRadius || 100;
        else val = obj[prop] ?? (prop === 'opacity' ? 1 : 0);

        if (!obj.keyframes[prop]) {
          obj.keyframes[prop] = [{ t, v: val }];
        } else {
          const track = obj.keyframes[prop];
          const idx = track.findIndex((p: any) => Math.abs(p.t - t) < 0.05);
          if (idx !== -1) { track.splice(idx, 1); if (!track.length) delete obj.keyframes[prop]; }
          else { track.push({ t, v: val }); track.sort((a:any,b:any)=>a.t-b.t); }
        }
        callbacks.reRender();
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      });
    });

    // ─── COLISÃO ───
    container.querySelectorAll('.col-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const obj = getActiveObj();
        obj.collisionMode = (btn as HTMLElement).dataset.mode;
        callbacks.reRender();
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      });
    });

    container.querySelectorAll('.col-exclude-item').forEach(item => {
      item.addEventListener('click', () => {
        const obj = getActiveObj();
        const id = (item as HTMLElement).dataset.id!;
        if (!obj.collisionExcluded) obj.collisionExcluded = [];
        const idx = obj.collisionExcluded.indexOf(id);
        if (idx === -1) obj.collisionExcluded.push(id);
        else obj.collisionExcluded.splice(idx, 1);
        callbacks.reRender();
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      });
    });

    const linkInput = container.querySelector('.col-link-input') as HTMLInputElement;
    if (linkInput) linkInput.addEventListener('change', () => { const obj = getActiveObj(); obj.linkMorphAsset = linkInput.value; document.dispatchEvent(new CustomEvent('worldmap-objects-changed')); });

    // ─── SENSOR TRIGGER ───
    container.querySelectorAll('.sensor-trigger-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const obj = getActiveObj();
        obj.sensorTrigger = (btn as HTMLElement).dataset.trigger;
        callbacks.reRender();
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      });
    });

    // ─── AREA ───
    container.querySelectorAll('.nav-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const obj = getActiveObj();
        obj.navType = (btn as HTMLElement).dataset.type;
        callbacks.reRender();
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      });
    });

    const navColor = container.querySelector('.nav-color-input') as HTMLInputElement;
    if (navColor) navColor.addEventListener('change', () => { const obj = getActiveObj(); obj.color = navColor.value; document.dispatchEvent(new CustomEvent('worldmap-objects-changed')); });

    // ─── TOGGLE PRIMAL ON/OFF ───
    container.querySelectorAll('.toggle-primal').forEach(btn => {
      btn.addEventListener('click', () => {
        const obj = getActiveObj();
        const prop = (btn as HTMLElement).dataset.prop!;
        const val = (btn as HTMLElement).dataset.value === 'true';
        obj[prop] = val;
        callbacks.reRender();
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      });
    });

    // ─── ADD CHILD PRIMAL (collision/sensor) ───
    container.querySelectorAll('.add-child-primal').forEach(btn => {
      btn.addEventListener('click', () => {
        const primalType = (btn as HTMLElement).dataset.type!;
        const parentObj = selectedObj;
        const groupId = parentObj.groupId || parentObj.id;
        
        const newPrimal: any = {
          id: `${primalType}_${Date.now()}`,
          type: primalType,
          x: parentObj.x,
          y: parentObj.y,
          w: parentObj.w,
          h: parentObj.h,
          label: primalType === 'collision' ? 'Colisão' : 'Sensor de Área',
          color: primalType === 'collision' ? '#ff4444' : '#44ccff',
          shape: 'rect',
          isVisible: true,
          opacity: 0.3,
          isEnabled: true,
          parentId: parentObj.id,
          groupId: groupId,
          isPersistent: true,
        };
        
        if (primalType === 'collision') {
          newPrimal.collisionMode = 'total';
        } else {
          newPrimal.navType = 'walkable';
          newPrimal.sensorTrigger = 'onEnter';
          newPrimal.sensorRadius = 120;
        }
        
        allObjects.push(newPrimal);
        callbacks.reRender();
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      });
    });

    // ─── ACTION SECTIONS ───
    ['col', 'sensor', 'area', 'area_sensor'].forEach(prefix => {
      const eventsKey = `${prefix}Events`;

      const toggleBtn = container.querySelector(`.${prefix}-action-toggle`);
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          const obj = getActiveObj();
          obj.actionActive = !obj.actionActive;
          callbacks.reRender();
          document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        });
      }

      const addBtn = container.querySelector(`.${prefix}-ev-add`);
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          let obj = getActiveObj();
          
          // Se não tem objeto válido, criar collision/sensor automaticamente
          if (!obj || obj.type === 'morph' || obj.type === 'image' || obj.type === 'player') {
            const primalType = this.activeTab;
            const groupId = selectedObj.groupId || selectedObj.id;
            obj = {
              id: `${primalType}_${Date.now()}`,
              type: primalType,
              x: selectedObj.x,
              y: selectedObj.y,
              w: selectedObj.w,
              h: selectedObj.h,
              label: primalType === 'collision' ? 'Colisão' : 'Sensor de Área',
              color: primalType === 'collision' ? '#ff4444' : '#44ccff',
              shape: 'rect',
              isVisible: true,
              isEnabled: true,
              actionActive: true,
              parentId: selectedObj.id,
              groupId: groupId,
              isPersistent: true,
            };
            if (primalType === 'collision') { obj.collisionMode = 'total'; }
            else { obj.navType = 'walkable'; obj.sensorTrigger = 'onEnter'; }
            allObjects.push(obj);
          }
          
          if (obj && !obj[eventsKey]) obj[eventsKey] = [];
          if (obj) obj[eventsKey].push({ type: '' });
          callbacks.reRender();
          document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        });
      }

      container.querySelectorAll(`.${prefix}-ev-type-btn`).forEach(btn => {
        btn.addEventListener('click', () => {
          const obj = getActiveObj();
          const idx = parseInt((btn as HTMLElement).dataset.ev!);
          const action = (btn as HTMLElement).dataset.action!;
          if (obj[eventsKey] && obj[eventsKey][idx]) {
            obj[eventsKey][idx].type = action;
          }
          callbacks.reRender();
          document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        });
      });

      container.querySelectorAll(`.${prefix}-ev-trans-btn`).forEach(btn => {
        btn.addEventListener('click', () => {
          const obj = getActiveObj();
          const idx = parseInt((btn as HTMLElement).dataset.ev!);
          const trans = (btn as HTMLElement).dataset.trans!;
          if (obj[eventsKey] && obj[eventsKey][idx]) {
            obj[eventsKey][idx].sceneTransition = trans;
          }
          callbacks.reRender();
          document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        });
      });

      container.querySelectorAll(`.${prefix}-ev-field`).forEach(input => {
        const handler = () => {
          const obj = getActiveObj();
          const idx = parseInt((input as HTMLElement).dataset.ev!);
          const field = (input as HTMLElement).dataset.field!;
          let val: any = (input as HTMLInputElement).value;
          if (field === 'damage' || field === 'portalX' || field === 'portalY') val = parseFloat(val) || 0;
          if (obj[eventsKey] && obj[eventsKey][idx]) {
            obj[eventsKey][idx][field] = val;
          }
          if ((input as HTMLInputElement).type === 'range') callbacks.reRender();
          document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        };
        input.addEventListener((input as HTMLInputElement).type === 'range' ? 'input' : 'change', handler);
      });

      container.querySelectorAll(`.${prefix}-ev-remove`).forEach(btn => {
        btn.addEventListener('click', () => {
          const obj = getActiveObj();
          const idx = parseInt((btn as HTMLElement).dataset.ev!);
          if (obj[eventsKey]) obj[eventsKey].splice(idx, 1);
          callbacks.reRender();
          document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        });
      });

      container.querySelectorAll(`.${prefix}-ev-set-portal`).forEach(btn => {
        btn.addEventListener('click', () => {
          const obj = getActiveObj();
          const idx = parseInt((btn as HTMLElement).dataset.ev!);
          const player = state.worldMapObjects?.find((o:any) => o.type === 'player');
          if (player && obj[eventsKey] && obj[eventsKey][idx]) {
            obj[eventsKey][idx].portalX = player.x || 0;
            obj[eventsKey][idx].portalY = player.y || 0;
            callbacks.reRender();
            document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
          }
        });
      });

      // Picker open buttons
      container.querySelectorAll(`.${prefix}-ev-picker-btn`).forEach(btn => {
        btn.addEventListener('click', () => {
          const obj = getActiveObj();
          const pickerId = (btn as HTMLElement).dataset.picker!;
          const pickerType = (btn as HTMLElement).dataset.type;
          const evIdx = parseInt((btn as HTMLElement).dataset.ev!);

          if (pickerType === 'sound') {
            const sounds = state?.availableSounds || [];
            if (!obj[eventsKey]) obj[eventsKey] = [];
            if (!obj[eventsKey][evIdx]) obj[eventsKey][evIdx] = {};
            const currentVal = obj[eventsKey][evIdx].audio || '';
            this.soundPicker.open(sounds, currentVal, pickerId, (value: string) => {
              if (value && value !== '__close__') {
                obj[eventsKey][evIdx].audio = value;
                document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
              }
              setTimeout(() => callbacks.reRender(), 50);
            });
          } else {
            obj._openPicker = pickerId;
            callbacks.reRender();
          }
        });
      });

      // Picker close buttons
      container.querySelectorAll(`.${prefix}-ev-picker-close`).forEach(btn => {
        btn.addEventListener('click', () => {
          const obj = getActiveObj();
          obj._openPicker = null;
          this.soundPicker.stop();
          callbacks.reRender();
        });
      });

      // Picker overlay clicks
      container.querySelectorAll(`.${prefix}-ev-picker-overlay`).forEach(overlay => {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            const obj = getActiveObj();
            obj._openPicker = null;
            this.soundPicker.stop();
            callbacks.reRender();
          }
        });
      });

      // Picker asset items
      container.querySelectorAll(`.${prefix}-ev-picker-item`).forEach(item => {
        item.addEventListener('click', () => {
          const obj = getActiveObj();
          const evIdx = parseInt((item as HTMLElement).dataset.ev!);
          const field = (item as HTMLElement).dataset.field!;
          const value = (item as HTMLElement).dataset.value!;
          if (obj[eventsKey] && obj[eventsKey][evIdx]) {
            obj[eventsKey][evIdx][field] = value;
          }
          obj._openPicker = null;
          document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
          callbacks.reRender();
        });
      });
    });
  }
}
