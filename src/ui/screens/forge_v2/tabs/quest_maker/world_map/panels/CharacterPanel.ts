export class CharacterPanel {
  private activeTab: string = 'visual';
  private expandedSection: string | null = 'idle';
  private assetPickerOpen: { section: string, dir?: string, type: 'asset' | 'sound' | 'pack' } | null = null;

  constructor() {}

  public render(selectedObj: any, state: any, _callbacks: any): string {
    if (!selectedObj || (selectedObj.type !== 'player' && selectedObj.type !== 'npc')) {
      return `<div style="padding:40px; text-align:center; opacity:0.2; font-size:0.8rem; font-weight:900; letter-spacing:1px;">Selecione um personagem</div>`;
    }

    const char = selectedObj;
    const charData = char.charData || {};
    const visualAsset = charData.visualAsset || '';
    const moveSpeed = charData.moveSpeed || 3;
    const animSections = ['idle', 'move', 'run', 'extra1', 'extra2', 'extra3'];
    const animLabels: any = { idle: '🧘 OCIOSO', move: '🚶 ANDAR', run: '🏃 CORRER', extra1: '⚡ AÇÃO EXTRA 1', extra2: '⚡ AÇÃO EXTRA 2', extra3: '⚡ AÇÃO EXTRA 3' };
    const moveDirs = ['up', 'down', 'left', 'right'];
    const moveDirLabels: any = { up: '⬆ CIMA', down: '⬇ BAIXO', left: '⬅ ESQUERDA', right: '➡ DIREITA' };
    const allAssets = state?.availableCards || [];
    const questAssets = state?.questAssets || [];
    const allSounds = state?.availableSounds || [];
    const customSprites = state?.customSprites || [];

    const tabs = [
      { id: 'visual', label: 'VISUAL', icon: '🎨', color: '#ffd700' },
      { id: 'anims', label: 'ANIMAÇÕES', icon: '🎞️', color: '#51c5ff' },
      { id: 'sounds', label: 'SONS', icon: '🔊', color: '#a78bfa' },
      { id: 'physics', label: 'FÍSICA', icon: '🧱', color: '#ff4444' },
      { id: 'sensor', label: 'SENSOR', icon: '📡', color: '#44ccff' },
    ];

    const tabBar = `
      <div style="display:flex; gap:4px; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.06); background:rgba(0,0,0,0.2); flex-wrap:wrap;">
        ${tabs.map(t => `
          <button class="a5-tab" data-tab="${t.id}" style="
            flex:1; min-width:50px; padding:6px 4px; border:none; border-radius:4px; cursor:pointer; font-size:0.45rem; font-weight:900; letter-spacing:0.5px;
            background:${this.activeTab === t.id ? `${t.color}20` : 'transparent'};
            color:${this.activeTab === t.id ? t.color : 'rgba(255,255,255,0.35)'};
            border:1px solid ${this.activeTab === t.id ? `${t.color}44` : 'transparent'};
            transition:0.2s;
          ">${t.icon} ${t.label}</button>
        `).join('')}
      </div>
    `;

    const animSectionRow = (sec: string, isSoundTab: boolean) => {
      const expanded = this.expandedSection === sec;
      const secData = charData[sec] || {};
      const isMoveSection = sec === 'move' || sec === 'run';

      const assetBtn = (label: string, currentVal: string, section: string, dir?: string) => {
        const hasVal = currentVal && currentVal.length > 0;
        const pickerOpen = this.assetPickerOpen && this.assetPickerOpen.section === section && this.assetPickerOpen.dir === dir && this.assetPickerOpen.type === (isSoundTab ? 'sound' : 'asset');

        return `
          <div style="margin-bottom:6px;">
            <div style="display:flex; align-items:center; gap:4px;">
              <span style="font-size:0.45rem; color:rgba(255,255,255,0.4); min-width:50px;">${label}</span>
              <button class="char-picker-btn" data-section="${section}" data-dir="${dir || ''}" data-type="${isSoundTab ? 'sound' : 'asset'}" style="
                flex:1; padding:5px 8px; border-radius:4px; cursor:pointer; font-size:0.5rem; font-weight:700;
                background:${hasVal ? 'rgba(81,197,255,0.1)' : 'rgba(255,255,255,0.03)'};
                border:1px solid ${hasVal ? 'rgba(81,197,255,0.3)' : 'rgba(255,255,255,0.08)'};
                color:${hasVal ? '#51c5ff' : 'rgba(255,255,255,0.3)'};
                text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
              ">${hasVal ? currentVal.split('/').pop() || currentVal : (isSoundTab ? '🔊 Escolher som' : '🖼️ Escolher asset')}</button>
              ${hasVal ? `<button class="char-clear-btn" data-section="${section}" data-dir="${dir || ''}" data-type="${isSoundTab ? 'sound' : 'asset'}" style="
                padding:4px 6px; background:none; border:1px solid rgba(255,255,255,0.1); border-radius:4px;
                color:#ff4444; font-size:0.5rem; cursor:pointer;
              ">✕</button>` : ''}
            </div>
            ${pickerOpen ? this.renderAssetSoundPicker(section, dir, isSoundTab ? 'sound' : 'asset', allAssets, questAssets, allSounds, customSprites) : ''}
          </div>
        `;
      };

      const speedSlider = (label: string, val: number, section: string, dir?: string, min: number = 1, max: number = 10, step: number = 0.5) => {
        const dirSuffix = dir ? ` data-dir="${dir}"` : '';
        return `
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span style="font-size:0.4rem; color:rgba(255,255,255,0.3); min-width:30px;">${label}</span>
            <input type="range" class="char-speed-slider" data-section="${section}"${dirSuffix} data-field="speed" min="${min}" max="${max}" step="${step}" value="${val}" style="flex:1; accent-color:#51c5ff;">
            <span style="font-size:0.45rem; color:#51c5ff; font-weight:900; width:20px;">${val}</span>
          </div>
        `;
      };

      return `
        <div style="margin-bottom:6px; border:1px solid rgba(255,255,255,0.06); border-radius:6px; overflow:hidden;">
          <button class="a5-section-toggle" data-section="${sec}" style="
            width:100%; display:flex; align-items:center; justify-content:space-between;
            padding:8px 10px; background:rgba(255,255,255,0.02); border:none; cursor:pointer;
            color:#fff; font-size:0.5rem; font-weight:900; letter-spacing:0.5px;
          ">
            <span>${animLabels[sec]}</span>
            <span style="font-size:0.55rem; opacity:0.4; transition:0.2s; transform:${expanded ? 'rotate(0)' : 'rotate(-90deg)'}">▼</span>
          </button>
          ${expanded ? `
            <div style="padding:8px 10px; border-top:1px solid rgba(255,255,255,0.04);">
              ${isMoveSection ? `
                ${moveDirs.map(dir => {
                  const dirData = secData[dir] || {};
                  const dirAsset = dirData.asset || '';
                  const dirSound = dirData.sound || '';
                  const dirSpeed = dirData.speed || moveSpeed;
                  return `
                    <div style="margin-bottom:8px; padding:6px; background:rgba(0,0,0,0.15); border-radius:4px;">
                      <div style="font-size:0.45rem; color:rgba(255,255,255,0.5); font-weight:800; margin-bottom:4px;">${moveDirLabels[dir]}</div>
                      ${assetBtn('Anim:', dirAsset, sec, dir)}
                      ${assetBtn('Som:', dirSound, sec, dir)}
                      ${speedSlider('Vel:', dirSpeed, sec, dir, 1, 10, 0.5)}
                    </div>
                  `;
                }).join('')}
              ` : `
                ${assetBtn('Anim:', secData.asset || '', sec)}
                ${assetBtn('Som:', secData.sound || '', sec)}
                ${sec === 'idle' ? speedSlider('Vel:', secData.speed || 1, sec, undefined, 0.5, 5, 0.1) : ''}
                ${sec.startsWith('extra') ? speedSlider('Vel:', secData.speed || 1, sec, undefined, 0.5, 10, 0.5) : ''}
              `}
            </div>
          ` : ''}
        </div>
      `;
    };

    let content = '';
    if (this.activeTab === 'visual') {
      content = `
        <div style="padding:12px;">
          <div style="font-size:0.5rem; color:#ffd700; font-weight:800; margin-bottom:10px; letter-spacing:1px;">ASSET VISUAL OFICIAL</div>
          <div style="display:flex; gap:4px; margin-bottom:12px;">
            <button class="char-visual-picker" data-type="asset" style="
              flex:1; padding:6px; border-radius:4px; cursor:pointer; font-size:0.5rem; font-weight:900;
              background:rgba(255,215,0,0.1); border:1px solid rgba(255,215,0,0.3); color:#ffd700;
            ">📦 QUEST ASSETS</button>
            <button class="char-visual-picker" data-type="gallery" style="
              flex:1; padding:6px; border-radius:4px; cursor:pointer; font-size:0.5rem; font-weight:900;
              background:rgba(81,197,255,0.1); border:1px solid rgba(81,197,255,0.3); color:#51c5ff;
            ">🖼️ GALERIA</button>
            <button class="char-visual-picker" data-type="sprites" style="
              flex:1; padding:6px; border-radius:4px; cursor:pointer; font-size:0.5rem; font-weight:900;
              background:rgba(255,51,102,0.1); border:1px solid rgba(255,51,102,0.3); color:#ff3366;
            ">🎞️ SPRITES CRIADOS</button>
          </div>
          ${visualAsset ? `<div style="width:100%; height:80px; border-radius:6px; background:url('${visualAsset}') center/cover; border:1px solid rgba(255,255,255,0.1); margin-bottom:8px;"></div>` : ''}
          ${visualAsset ? `<div style="font-size:0.45rem; color:rgba(255,255,255,0.3); margin-bottom:12px;">${visualAsset}</div>` : ''}
        </div>
      `;
    } else if (this.activeTab === 'anims') {
      content = `
        <div style="padding:12px;">
          <div style="font-size:0.5rem; color:#51c5ff; font-weight:800; margin-bottom:10px; letter-spacing:1px;">ANIMAÇÕES DO PERSONAGEM</div>
          <button class="char-picker-btn" data-type="pack" style="width:100%; padding:10px; margin-bottom:12px; border-radius:6px; background:rgba(255,215,0,0.1); border:1px dashed rgba(255,215,0,0.4); color:#ffd700; font-weight:900; font-size:0.55rem; cursor:pointer;">
             ➕ VINCULAR PASTA DE SPRITE (AUTO-COMPLETAR ACTIONS)
          </button>
          ${this.assetPickerOpen?.type === 'pack' ? this.renderAssetSoundPicker('anims', undefined, 'pack', allAssets, questAssets, allSounds, customSprites, state.customSpritePacks) : ''}
          ${animSections.map(sec => animSectionRow(sec, false)).join('')}
          <div style="margin-top:12px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.06);">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
              <div style="font-size:0.5rem; color:rgba(255,255,255,0.4); font-weight:800;">VELOCIDADE BASE</div>
              <span style="font-size:0.55rem; color:#51c5ff; font-weight:900;">${moveSpeed}</span>
            </div>
            <input type="range" class="char-base-speed-slider" min="1" max="10" step="0.5" value="${moveSpeed}" style="width:100%; accent-color:#51c5ff;">
          </div>
        </div>
      `;
    } else if (this.activeTab === 'sounds') {
      content = `
        <div style="padding:12px;">
          <div style="font-size:0.5rem; color:#a78bfa; font-weight:800; margin-bottom:10px; letter-spacing:1px;">SONS POR ANIMAÇÃO</div>
          ${animSections.map(sec => animSectionRow(sec, true)).join('')}
        </div>
      `;
    } else if (this.activeTab === 'physics') {
      const colMode = char.collisionMode || 'total';
      content = `
        <div style="padding:12px;">
          <div style="font-size:0.5rem; color:#ff4444; font-weight:800; margin-bottom:10px; letter-spacing:1px;">FÍSICA DE COLISÃO</div>
          <div style="display:flex; gap:6px; margin-bottom:12px;">
            <button class="char-col-mode" data-mode="total" style="
              flex:1; padding:8px; border-radius:6px; cursor:pointer; font-size:0.55rem; font-weight:900;
              background:${colMode === 'total' ? 'rgba(255,68,68,0.2)' : 'rgba(255,255,255,0.03)'};
              color:${colMode === 'total' ? '#ff4444' : 'rgba(255,255,255,0.4)'};
              border:1px solid ${colMode === 'total' ? '#ff444466' : 'rgba(255,255,255,0.08)'};
            ">TOTAL</button>
            <button class="char-col-mode" data-mode="partial" style="
              flex:1; padding:8px; border-radius:6px; cursor:pointer; font-size:0.55rem; font-weight:900;
              background:${colMode === 'partial' ? 'rgba(255,165,0,0.2)' : 'rgba(255,255,255,0.03)'};
              color:${colMode === 'partial' ? '#ffa500' : 'rgba(255,255,255,0.4)'};
              border:1px solid ${colMode === 'partial' ? '#ffa50066' : 'rgba(255,255,255,0.08)'};
            ">PARCIAL</button>
          </div>
          <div style="font-size:0.5rem; color:rgba(255,255,255,0.3); margin-bottom:6px;">HITBOX SIZE</div>
          <div style="display:flex; gap:8px; margin-bottom:12px;">
            <div style="flex:1;">
              <div style="font-size:0.4rem; color:rgba(255,255,255,0.3); margin-bottom:3px;">W</div>
              <input type="range" class="char-hitbox-w" min="10" max="200" value="${char.w || 50}" style="width:100%; accent-color:#ff4444;">
              <div style="font-size:0.45rem; color:#ff4444; text-align:center;">${char.w || 50}</div>
            </div>
            <div style="flex:1;">
              <div style="font-size:0.4rem; color:rgba(255,255,255,0.3); margin-bottom:3px;">H</div>
              <input type="range" class="char-hitbox-h" min="10" max="200" value="${char.h || 50}" style="width:100%; accent-color:#ff4444;">
              <div style="font-size:0.45rem; color:#ff4444; text-align:center;">${char.h || 50}</div>
            </div>
          </div>
          <div style="font-size:0.5rem; color:rgba(255,255,255,0.3); margin-bottom:6px;">APENAS ANDAR EM ÁREAS DEMARCADAS</div>
          <button class="char-walkable-toggle" style="
            width:100%; padding:6px; border-radius:4px; cursor:pointer; font-size:0.5rem; font-weight:900;
            background:${char.restrictToWalkable ? 'rgba(68,255,68,0.2)' : 'rgba(255,255,255,0.03)'};
            color:${char.restrictToWalkable ? '#44ff44' : 'rgba(255,255,255,0.4)'};
            border:1px solid ${char.restrictToWalkable ? '#44ff4466' : 'rgba(255,255,255,0.08)'};
          ">${char.restrictToWalkable ? '☑ ATIVADO' : '☐ DESATIVADO'}</button>
        </div>
      `;
    } else if (this.activeTab === 'sensor') {
      const proxRadius = charData.proximityRadius || 80;
      const proxAction = charData.proximityAction || 'none';
      content = `
        <div style="padding:12px;">
          <div style="font-size:0.5rem; color:#44ccff; font-weight:800; margin-bottom:10px; letter-spacing:1px;">SENSOR DE PROXIMIDADE</div>
          <div style="margin-bottom:12px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
              <div style="font-size:0.5rem; color:rgba(255,255,255,0.4); font-weight:800;">RAIO DE DETECÇÃO</div>
              <span style="font-size:0.55rem; color:#44ccff; font-weight:900;">${proxRadius}px</span>
            </div>
            <input type="range" class="char-prox-radius" min="20" max="300" value="${proxRadius}" style="width:100%; accent-color:#44ccff;">
          </div>
          <div style="font-size:0.5rem; color:rgba(255,255,255,0.4); font-weight:800; margin-bottom:6px;">AÇÃO AO DETECTAR</div>
          <div style="display:flex; flex-direction:column; gap:3px;">
            ${[
              { id: 'none', label: 'NENHUMA' },
              { id: 'alert', label: 'ALERTAR NPC' },
              { id: 'dialog', label: 'INICIAR DIÁLOGO' },
              { id: 'combat', label: 'INICIAR COMBATE' },
              { id: 'follow', label: 'SEGUIR JOGADOR' },
            ].map(a => `
              <button class="char-prox-action" data-action="${a.id}" style="
                padding:7px 10px; border-radius:4px; cursor:pointer; font-size:0.5rem; font-weight:900;
                background:${proxAction === a.id ? 'rgba(68,204,255,0.15)' : 'rgba(255,255,255,0.03)'};
                color:${proxAction === a.id ? '#44ccff' : 'rgba(255,255,255,0.4)'};
                border:1px solid ${proxAction === a.id ? '#44ccff66' : 'rgba(255,255,255,0.08)'};
              ">${a.label}</button>
            `).join('')}
          </div>
        </div>
      `;
    }

    return `
      <div style="height:100%; display:flex; flex-direction:column; background:#0a0a0f;">
        ${tabBar}
        <div style="flex:1; overflow-y:auto;">${content}</div>
      </div>
    `;
  }

  private renderAssetSoundPicker(section: string, dir: string | undefined, type: 'asset' | 'sound' | 'pack', allAssets: any[], questAssets: any[], allSounds: any[], customSprites: any[] = [], customPacks: any[] = []): string {
    const dirSuffix = dir ? `-${dir}` : '';
    const pickerId = `picker-${section}${dirSuffix}-${type}`;
    const items = type === 'sound' ? allSounds : [...(questAssets || []), ...(allAssets || [])];

    return `
      <div id="${pickerId}" style="
        position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75);
        z-index:9999; display:flex; align-items:center; justify-content:center;
      ">
        <div style="
          background:#111; border:1px solid #333; border-radius:10px; padding:16px;
          max-width:450px; width:90%; max-height:70vh; overflow-y:auto;
        ">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="font-size:0.6rem; color:${type === 'sound' ? '#a78bfa' : '#ffd700'}; font-weight:900; letter-spacing:1px;">
              ${type === 'sound' ? '🔊 SELECIONAR SOM' : (type === 'pack' ? '📂 VINCULAR PASTA DE SPRITE' : '🖼️ SELECIONAR ASSET')}
            </div>
            <button class="picker-close-btn" data-picker="${pickerId}" style="background:none; border:none; color:#fff; font-size:1.1rem; cursor:pointer;">✕</button>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${type !== 'pack' ? items.map((a:any) => {
              const url = typeof a === 'string' ? a : (a.url || a);
              if (type === 'sound') {
                return `
                  <button class="picker-sound-item" data-url="${url}" data-section="${section}" data-dir="${dir || ''}" style="
                    padding:6px 10px; background:rgba(167,139,250,0.1); border:1px solid rgba(167,139,250,0.2);
                    border-radius:4px; color:#a78bfa; font-size:0.45rem; font-weight:700; cursor:pointer;
                    max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
                  ">🔊 ${url.split('/').pop() || url}</button>
                `;
              }
              return `
                <div class="picker-asset-item" data-url="${url}" data-section="${section}" data-dir="${dir || ''}" style="
                  width:calc(25% - 5px); aspect-ratio:1/1; border-radius:4px; cursor:pointer;
                  background-color:rgba(0,0,0,0.3); border:2px solid rgba(255,255,255,0.08);
                  transition:0.15s; overflow:hidden; display:flex; align-items:center; justify-content:center;
                " onmouseover="this.style.borderColor='#ffd700'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'">
                  <img src="${url}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23333%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Crect x=%273%27 y=%273%27 width=%2718%27 height=%2718%27 rx=%272%27 ry=%272%27%3E%3C/rect%3E%3Ccircle cx=%278.5%27 cy=%278.5%27 r=%271.5%27%3E%3C/circle%3E%3Cpolyline points=%2721 15 16 10 5 21%27%3E%3C/polyline%3E%3C/svg%3E';">
                </div>
              `;
            }).join('') : ''}
            
            ${type === 'pack' ? customPacks.map((pack:any) => {
              const defaultAction = pack.actions?.[0];
              const previewDir = defaultAction?.directions?.down || defaultAction?.directions?.up || defaultAction?.directions?.left || defaultAction?.directions?.right;
              const previewUrl = previewDir ? (previewDir.type === 'png' ? previewDir.frames?.[0] : (previewDir.type === 'gif' ? previewDir.gifUrl : previewDir.videoUrl)) : '';
              return `
                <div class="picker-pack-item" data-id="${pack.id}" style="
                  width:calc(50% - 3px); border-radius:6px; cursor:pointer; background:rgba(255,255,255,0.03);
                  border:1px solid rgba(255,215,0,0.2); transition:0.15s; display:flex; align-items:center; gap:10px; padding:8px;
                " onmouseover="this.style.background='rgba(255,215,0,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                  <div style="width:40px; height:40px; border-radius:4px; overflow:hidden; background-color:#000; border:1px solid rgba(255,255,255,0.1);">
                    <img src="${previewUrl}" style="width:100%; height:100%; object-fit:contain; image-rendering:pixelated;" onerror="this.parentElement.innerHTML='<span style=%22font-size:1rem; opacity:0.1; line-height:40px; width:40px; display:block; text-align:center;%22>🎬</span>'">
                  </div>
                  <div style="flex:1;">
                    <div style="font-size:0.6rem; color:#ffd700; font-weight:900;">${pack.name}</div>
                    <div style="font-size:0.45rem; color:#888;">ID: ${pack.id} • ${pack.actions?.length || 0} Ações</div>
                  </div>
                </div>
              `;
            }).join('') : ''}

            ${(items.length === 0 && type !== 'pack' && customSprites.length === 0) ? `<div style="font-size:0.5rem; opacity:0.3; text-align:center; width:100%; padding:20px;">Nenhum ${type === 'sound' ? 'som' : 'asset'} disponível</div>` : ''}
            ${(customPacks.length === 0 && type === 'pack') ? `<div style="font-size:0.5rem; opacity:0.3; text-align:center; width:100%; padding:20px;">Nenhuma pasta de Sprite Animado criada.</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  public bind(container: HTMLElement, selectedObj: any, state: any, callbacks: any) {
    if (!selectedObj) return;
    if (!selectedObj.charData) selectedObj.charData = {};
    const charData = selectedObj.charData;

    container.querySelectorAll('.a5-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = (btn as HTMLElement).dataset.tab!;
        this.expandedSection = null;
        this.assetPickerOpen = null;
        callbacks.reRender();
      });
    });

    container.querySelectorAll('.a5-section-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const sec = (btn as HTMLElement).dataset.section!;
        this.expandedSection = this.expandedSection === sec ? null : sec;
        this.assetPickerOpen = null;
        callbacks.reRender();
      });
    });

    // Asset/Sound/Pack picker buttons
    container.querySelectorAll('.char-picker-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const section = (btn as HTMLElement).dataset.section || 'global';
        const dir = (btn as HTMLElement).dataset.dir || undefined;
        const type = ((btn as HTMLElement).dataset.type as 'asset' | 'sound' | 'pack') || 'asset';
        this.assetPickerOpen = { section, dir, type };
        callbacks.reRender();
      });
    });

    // Clear buttons
    container.querySelectorAll('.char-clear-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const section = (btn as HTMLElement).dataset.section!;
        const dir = (btn as HTMLElement).dataset.dir;
        const type = (btn as HTMLElement).dataset.type;
        if (dir) {
          if (charData[section] && charData[section][dir]) {
            if (type === 'sound') delete charData[section][dir].sound;
            else delete charData[section][dir].asset;
          }
        } else {
          if (charData[section]) {
            if (type === 'sound') delete charData[section].sound;
            else delete charData[section].asset;
          }
        }
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        callbacks.reRender();
      });
    });

    // Picker close
    container.querySelectorAll('.picker-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.assetPickerOpen = null;
        callbacks.reRender();
      });
    });

    // Picker overlay click to close
    const overlay = container.querySelector('[id^="picker-"]') as HTMLElement;
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.assetPickerOpen = null;
          callbacks.reRender();
        }
      });
    }

    // Picker asset items
    container.querySelectorAll('.picker-asset-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = (item as HTMLElement).dataset.url!;
        const section = (item as HTMLElement).dataset.section!;
        const dir = (item as HTMLElement).dataset.dir;
        if (dir) {
          if (!charData[section]) charData[section] = {};
          if (!charData[section][dir]) charData[section][dir] = {};
          charData[section][dir].asset = url;
        } else {
          if (!charData[section]) charData[section] = {};
          charData[section].asset = url;
        }
        this.assetPickerOpen = null;
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        callbacks.reRender();
      });
    });

    // Picker Pack Auto-Fill
    container.querySelectorAll('.picker-pack-item').forEach(item => {
      item.addEventListener('click', () => {
        const packId = (item as HTMLElement).dataset.id!;
        const pack = (state.customSpritePacks || []).find((p:any) => p.id === packId);
        if (pack && pack.actions) {
           const mapActionToSection = (actionName: string, sectionStr: string) => {
              // Flexible matching: IDLE_STATIC should match "Idle"
              const act = pack.actions.find((a:any) => a.name.toLowerCase().includes(actionName.toLowerCase()));
              if (act && act.directions) {
                 if (!charData[sectionStr]) charData[sectionStr] = {};
                 ['up', 'down', 'left', 'right'].forEach(dir => {
                    const dirData = act.directions[dir];
                    if (dirData) {
                       if (!charData[sectionStr][dir]) charData[sectionStr][dir] = {};
                       // Prioritize GIF > Video > PNG
                       let urlToSet = '';
                       if (dirData.type === 'gif' && dirData.gifUrl) urlToSet = dirData.gifUrl;
                       else if (dirData.type === 'video' && dirData.videoUrl) urlToSet = dirData.videoUrl;
                       else if (dirData.type === 'png' && dirData.frames?.length > 0) urlToSet = dirData.frames[0];
                       
                       // Link full animation data to charData
                       if (urlToSet) {
                          charData[sectionStr][dir].asset = urlToSet;
                       }
                       if (dirData.frames) charData[sectionStr][dir].frames = dirData.frames;
                       if (dirData.frameRate) charData[sectionStr][dir].frameRate = dirData.frameRate;
                       if (dirData.type) charData[sectionStr][dir].animType = dirData.type;
                       if (dirData.gifUrl) charData[sectionStr][dir].gifUrl = dirData.gifUrl;
                       if (dirData.videoUrl) charData[sectionStr][dir].videoUrl = dirData.videoUrl;
                    }
                 });
              }
           };

           // Mapeamento Mágico das ações default
           mapActionToSection('Idle', 'idle');
           mapActionToSection('Andar', 'move');
           mapActionToSection('Correr', 'run');
           mapActionToSection('Interação', 'extra1');
        }
        
        this.assetPickerOpen = null;
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        callbacks.reRender();
      });
    });

    // Picker sound items
    container.querySelectorAll('.picker-sound-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = (item as HTMLElement).dataset.url!;
        const section = (item as HTMLElement).dataset.section!;
        const dir = (item as HTMLElement).dataset.dir;
        if (dir) {
          if (!charData[section]) charData[section] = {};
          if (!charData[section][dir]) charData[section][dir] = {};
          charData[section][dir].sound = url;
        } else {
          if (!charData[section]) charData[section] = {};
          charData[section].sound = url;
        }
        this.assetPickerOpen = null;
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        callbacks.reRender();
      });
    });

    // Visual picker buttons
    container.querySelectorAll('.char-visual-picker').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = (btn as HTMLElement).dataset.type;
        let assets: any[] = [];
        if (type === 'gallery') assets = state.availableCards || [];
        else if (type === 'sprites') {
           assets = (state.customSprites || []).map((s:any) => `custom_sprite:${s.id}`);
        }
        else assets = state.questAssets || [];

        if (assets.length > 0) {
          charData.visualAsset = assets[0];
          document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
          callbacks.reRender();
        }
      });
    });

    // Speed sliders
    container.querySelectorAll('.char-speed-slider').forEach(slider => {
      slider.addEventListener('input', () => {
        const el = slider as HTMLInputElement;
        const sec = el.dataset.section!;
        const dir = el.dataset.dir;
        const field = el.dataset.field!;
        const val = parseFloat(el.value);
        if (!charData[sec]) charData[sec] = {};
        if (dir) {
          if (!charData[sec][dir]) charData[sec][dir] = {};
          charData[sec][dir][field] = val;
        } else {
          charData[sec][field] = val;
        }
        callbacks.reRender();
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      });
    });

    // Base speed
    const baseSpeed = container.querySelector('.char-base-speed-slider') as HTMLInputElement;
    if (baseSpeed) {
      baseSpeed.addEventListener('input', () => {
        charData.moveSpeed = parseFloat(baseSpeed.value);
        callbacks.reRender();
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      });
    }

    // Physics tab
    container.querySelectorAll('.char-col-mode').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedObj.collisionMode = (btn as HTMLElement).dataset.mode;
        callbacks.reRender();
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      });
    });

    const hitboxW = container.querySelector('.char-hitbox-w') as HTMLInputElement;
    if (hitboxW) hitboxW.addEventListener('input', () => { selectedObj.w = parseInt(hitboxW.value); callbacks.reRender(); document.dispatchEvent(new CustomEvent('worldmap-objects-changed')); });
    const hitboxH = container.querySelector('.char-hitbox-h') as HTMLInputElement;
    if (hitboxH) hitboxH.addEventListener('input', () => { selectedObj.h = parseInt(hitboxH.value); callbacks.reRender(); document.dispatchEvent(new CustomEvent('worldmap-objects-changed')); });

    const walkableToggle = container.querySelector('.char-walkable-toggle');
    if (walkableToggle) {
      walkableToggle.addEventListener('click', () => {
        selectedObj.restrictToWalkable = !selectedObj.restrictToWalkable;
        callbacks.reRender();
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      });
    }

    // Sensor tab
    const proxRadius = container.querySelector('.char-prox-radius') as HTMLInputElement;
    if (proxRadius) {
      proxRadius.addEventListener('input', () => {
        charData.proximityRadius = parseInt(proxRadius.value);
        callbacks.reRender();
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      });
    }

    container.querySelectorAll('.char-prox-action').forEach(btn => {
      btn.addEventListener('click', () => {
        charData.proximityAction = (btn as HTMLElement).dataset.action;
        callbacks.reRender();
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      });
    });
  }
}
