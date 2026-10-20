import { gsap } from 'gsap';
import { Mobby, MobbyManager } from '../../../../core/MobbyManager';
import { CARD_TEMPLATES, SKILL_POOL, RARITIES } from '../../../../core/constants';
import { SoundManager } from '../../../utils/SoundManager';
import { Card } from '../../../../core/GameEngine';
import { isVideoUrl } from '../../../utils/BackgroundUtils';
import '../../../styles/BossBattle.css';

export class TabMobbys {
  private state: any;
  private callbacks: any;
  private selectedMobbyId: string = '';
  private currentMobby: Mobby;

  private static activeSelectedMobbyId: string = '';

  // Estado do Preview em Tempo Real
  private previewCurrentHp: number = 200;
  private previewPlayerCards: Card[] = [];
  private previewHandCards: Card[] = [];

  constructor(state: any, callbacks: any) {
    this.state = state;
    this.callbacks = callbacks;

    const list = MobbyManager.getMobbys();
    if (TabMobbys.activeSelectedMobbyId && list.some(mob => mob.id === TabMobbys.activeSelectedMobbyId)) {
      this.selectedMobbyId = TabMobbys.activeSelectedMobbyId;
    } else {
      this.selectedMobbyId = list[0]?.id || '';
      TabMobbys.activeSelectedMobbyId = this.selectedMobbyId;
    }
    this.currentMobby = MobbyManager.getMobbyById(this.selectedMobbyId) || this.createBlankMobby();
    this.previewCurrentHp = this.currentMobby.hp;

    this.initPreviewPlayerCards();
  }

  private autoSaveTimer: any = null;

  private autoSave() {
    MobbyManager.upsertMobby(this.currentMobby);
    TabMobbys.activeSelectedMobbyId = this.currentMobby.id;
    const badge = document.querySelector('#mobby-autosave-indicator');
    if (badge) {
      badge.textContent = '💾 Salvo automaticamente';
      (badge as HTMLElement).style.opacity = '1';
    }
  }

  private autoSaveDebounced(ms = 500) {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      this.autoSave();
    }, ms);
  }

  private getTemplates(): any[] {
    if (this.state && Array.isArray(this.state.templates) && this.state.templates.length > 0) {
      return this.state.templates;
    }
    return CARD_TEMPLATES;
  }

  private initPreviewPlayerCards() {
    const templates = this.getTemplates();
    this.previewPlayerCards = templates.slice(0, 3).map((tmpl, idx) => ({
      id: (tmpl as any).id || `prev_c_${idx}`,
      name: tmpl.name,
      atk: tmpl.baseAtk || 12,
      pv: tmpl.basePv || 22,
      maxPv: tmpl.basePv || 22,
      image: tmpl.image,
      manaCost: tmpl.manaCost || 2,
      staminaCost: tmpl.staminaCost || 10,
      owner: 'p' as const,
      abilityId: tmpl.abilityId,
      rarity: tmpl.preferredRarity || 'common'
    } as Card));

    // Bastante cartas na mão (6 cartas completas em leque)
    this.previewHandCards = templates.slice(3, 9).map((tmpl, idx) => ({
      id: (tmpl as any).id || `prev_h_${idx}`,
      name: tmpl.name,
      atk: tmpl.baseAtk || 14,
      pv: tmpl.basePv || 25,
      maxPv: tmpl.basePv || 25,
      image: tmpl.image,
      manaCost: tmpl.manaCost || 3,
      staminaCost: tmpl.staminaCost || 12,
      owner: 'p' as const,
      abilityId: tmpl.abilityId,
      rarity: tmpl.preferredRarity || 'rare'
    }));
  }

  private createBlankMobby(): Mobby {
    const defaultImg = this.state.availableCards?.[0] || '/cards/Slime_colosso_arranca_coluna_ancestral-11.png';
    const defaultReward = this.getTemplates()[0]?.name || 'card_default';
    return {
      id: 'mobby_' + Date.now(),
      name: 'Novo Mobby',
      description: 'Um poderoso adversário das terras congeladas.',
      image: defaultImg,
      hp: 240,
      maxHp: 240,
      atk: 16,
      rewardCardId: defaultReward,
      artifacts: ['art_escudo', 'art_golpe', 'art_queimadura', ''],
      dialogues: [
        { triggerType: 'turn_reached', triggerValue: 1, speaker: 'mobby', text: 'Você não sobreviverá a este duelo!' },
        { triggerType: 'hp_below', triggerValue: 50, speaker: 'mobby', text: 'Sinta a verdadeira fúria elemental!' }
      ],
      scale: 100,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      backgroundUrl: '',
      bgmUrl: '',
      attackSfxUrl: ''
    };
  }

  private renderRewardMiniCard(c: any, isSel: boolean): string {
    const rarityKey = (c.preferredRarity || 'common').toLowerCase();
    const rDef = (RARITIES as any)[rarityKey] || { label: 'Comum', color: '#aaaaaa', icon: '⬜' };
    const rarityColor = c.borderColor || rDef.color || '#4da6ff';
    const mana = c.manaCost ?? 1;
    const atk = c.baseAtk ?? 500;
    const pv = c.basePv ?? 1000;

    return `
      <div class="reward-card-pick-item ${isSel ? 'active' : ''}" data-cardname="${c.name}" data-rarity="${rarityKey}" style="
        flex-shrink: 0;
        width: 84px;
        height: 130px;
        border-radius: 7px;
        position: relative;
        cursor: pointer;
        background: #0d0e12;
        border: 2px solid ${isSel ? '#ffd700' : rarityColor};
        box-shadow: ${isSel ? '0 0 14px rgba(255,215,0,0.85), inset 0 0 8px rgba(255,215,0,0.3)' : `0 4px 10px rgba(0,0,0,0.7), 0 0 6px ${rarityColor}33`};
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
        user-select: none;
      " title="${c.name} • Raridade: ${rDef.label} • Mana: ${mana} • ATK: ${atk} • PV: ${pv}">
        <!-- IMAGEM / ARTE CENTRAL DA CARTA -->
        <div style="
          position: absolute;
          inset: 2px;
          border-radius: 5px;
          background-image: url('${c.image}');
          background-size: cover;
          background-position: center;
        ">
          <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.85) 85%, #000 100%);"></div>
        </div>

        <!-- TOPO: BADGES DE MANA E PV ESTILO TCG -->
        <div style="position: absolute; top: 3px; left: 3px; right: 3px; display: flex; justify-content: space-between; align-items: center; z-index: 3; pointer-events: none;">
          <div style="
            background: radial-gradient(circle, #00b4d8, #0077b6);
            border: 1px solid #90e0ef;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.6rem;
            font-weight: 900;
            color: #fff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.9);
          " title="Custo de Mana">${mana}</div>

          <div style="
            background: radial-gradient(circle, #e63946, #9b111e);
            border: 1px solid #ff758f;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.55rem;
            font-weight: 900;
            color: #fff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.9);
          " title="Pontos de Vida">${pv}</div>
        </div>

        <!-- PLACA DE NOME DA CARTA -->
        <div style="
          position: absolute;
          bottom: 22px;
          left: 3px;
          right: 3px;
          z-index: 3;
          background: rgba(10, 12, 18, 0.88);
          backdrop-filter: blur(2px);
          border: 1px solid ${rarityColor}66;
          border-radius: 3px;
          padding: 1px 3px;
          text-align: center;
        ">
          <div style="
            font-size: 0.56rem;
            font-weight: 900;
            color: #fff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-shadow: 0 1px 2px #000;
            letter-spacing: 0.2px;
          ">${c.name}</div>
        </div>

        <!-- RODAPÉ: ATK E RARIDADE -->
        <div style="
          position: absolute;
          bottom: 3px;
          left: 3px;
          right: 3px;
          z-index: 3;
          display: flex;
          justify-content: space-between;
          align-items: center;
          pointer-events: none;
        ">
          <span style="
            background: rgba(220, 53, 69, 0.9);
            color: #fff;
            font-size: 0.52rem;
            font-weight: 900;
            padding: 1px 4px;
            border-radius: 3px;
            border: 1px solid rgba(255,255,255,0.3);
          ">⚔️ ${atk}</span>

          <span style="
            font-size: 0.55rem;
            color: ${rarityColor};
            font-weight: 800;
            text-shadow: 0 0 5px ${rarityColor};
          ">${rDef.icon}</span>
        </div>

        <!-- CHECK BADGE SELECIONADO -->
        ${isSel ? `
          <div class="reward-card-check" style="
            position: absolute;
            top: -3px;
            right: -3px;
            background: linear-gradient(135deg, #ffd700, #ff9f1a);
            color: #000;
            font-size: 0.65rem;
            width: 19px;
            height: 19px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 950;
            box-shadow: 0 0 8px #ffd700;
            border: 2px solid #fff;
            z-index: 6;
          ">✓</div>
        ` : ''}
      </div>
    `;
  }

  public render(): string {
    const list = MobbyManager.getMobbys();
    const m = this.currentMobby;

    // Valores de transform da PNG
    const scale = m.scale ?? 100;
    const offX = m.offsetX ?? 0;
    const offY = m.offsetY ?? 0;
    const rot = m.rotation ?? 0;

    // Carta de recompensa encontrada e seus detalhes visuais
    const templates = this.getTemplates();
    const rewardCardTmpl = templates.find((c: any) => c.name === m.rewardCardId) || templates[0] || CARD_TEMPLATES[0];
    const rewardRarityKey = (rewardCardTmpl.preferredRarity || 'common').toLowerCase();
    const rewardRarityDef = (RARITIES as any)[rewardRarityKey] || { label: 'Comum', color: '#aaaaaa', icon: '⬜' };
    const rewardRarityColor = rewardCardTmpl.borderColor || rewardRarityDef.color || '#4da6ff';

    return `
      <div class="mobby-tab-container" style="display:flex; width:100%; height:100%; gap:14px; padding:10px; box-sizing:border-box; color:#fff; overflow:hidden; font-family:'Cinzel', 'Outfit', sans-serif;">
        
        <!-- ─── COLUNA 1: SIDEBAR (LISTA DE MOBBYS) ─── -->
        <div class="mobby-sidebar" style="width: 250px; flex-shrink: 0; background: rgba(14, 11, 22, 0.94); border: 1px solid rgba(255,215,0,0.25); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden;">
          <div style="padding: 12px; border-bottom: 1px solid rgba(255,215,0,0.2); display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size: 0.95rem; font-weight:800; color:#ffd700;">MOBBYS (3x1)</div>
              <div style="font-size:0.62rem; color:#888;">Encontros Salvos</div>
            </div>
            <button id="btn-add-mobby" style="background: linear-gradient(135deg, #ffd700, #b8860b); border:none; border-radius: 6px; color:#000; font-weight:900; padding:5px 9px; cursor:pointer; font-size:0.72rem;">+ NOVO</button>
          </div>

          <div class="mobby-list" style="flex:1; overflow-y:auto; padding:6px; display:flex; flex-direction:column; gap:6px;">
            ${list.map(mob => `
              <div class="mobby-item ${mob.id === this.selectedMobbyId ? 'selected' : ''}" data-id="${mob.id}" style="
                display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 8px; cursor: pointer; transition: 0.2s;
                background: ${mob.id === this.selectedMobbyId ? 'linear-gradient(90deg, rgba(255,215,0,0.18), rgba(255,215,0,0.05))' : 'rgba(255,255,255,0.03)'};
                border: 1px solid ${mob.id === this.selectedMobbyId ? '#ffd700' : 'rgba(255,255,255,0.08)'};
              ">
                <img src="${mob.image}" style="width: 38px; height: 38px; object-fit: contain; border-radius: 6px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,215,0,0.2);" />
                <div style="flex:1; overflow:hidden;">
                  <div style="font-weight:700; font-size:0.8rem; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${mob.name}</div>
                  <div style="font-size:0.64rem; color:#aaa; margin-top:2px;">❤️ ${mob.hp} HP &nbsp;|&nbsp; ⚔️ ${mob.atk} ATK</div>
                </div>
                ${list.length > 1 ? `
                  <button class="btn-del-mobby" data-id="${mob.id}" style="background:none; border:none; color:#ff4444; font-size:0.85rem; cursor:pointer; padding:3px;" title="Excluir">✕</button>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- ─── COLUNA 2: FORMULÁRIO DE EDIÇÃO DO MOBBY ─── -->
        <div class="mobby-editor" style="flex:1; background: rgba(16, 12, 24, 0.95); border: 1px solid rgba(255,215,0,0.25); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; min-width: 360px;">
          
          <!-- TOPBAR COM BOTÃO SALVAR -->
          <div style="padding: 10px 16px; border-bottom: 1px solid rgba(255,215,0,0.2); display:flex; justify-content:space-between; align-items:center; background: rgba(0,0,0,0.3);">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.2rem;">👾</span>
              <div>
                <div style="font-size: 0.95rem; font-weight:800; color:#fff;">Editando: <span style="color:#ffd700;">${m.name}</span></div>
                <div style="font-size:0.64rem; color:#888;">Edite parâmetros, PNG, cenário e áudio ao vivo</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
              <span id="mobby-autosave-indicator" style="font-size:0.68rem; color:#2ecc71; font-weight:700; transition:opacity 0.3s; opacity:0.9;">💾 Salvo automaticamente</span>
              <button id="btn-save-mobby" style="background: linear-gradient(135deg, #2ecc71, #27ae60); border: 1px solid #2ecc71; color:#fff; font-weight:900; padding:6px 14px; border-radius: 6px; cursor:pointer; font-size:0.75rem;">
                💾 SALVAR AGORA
              </button>
            </div>
          </div>

          <!-- CAMPOS DO FORMULÁRIO -->
          <div style="flex:1; overflow-y:auto; padding: 14px; display:flex; flex-direction:column; gap:14px;">
            
            <!-- IDENTIDADE: PNG & NOME -->
            <div style="display:flex; gap:14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding:12px;">
              <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <div style="width: 105px; height: 105px; border-radius: 10px; background: radial-gradient(circle, rgba(255,215,0,0.1) 0%, rgba(0,0,0,0.6) 80%); border: 2px dashed rgba(255,215,0,0.4); display:flex; align-items:center; justify-content:center; overflow:hidden;">
                  <img id="mobby-img-display" src="${m.image}" style="max-width: 90%; max-height: 90%; object-fit: contain; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.7));" />
                </div>
                <button id="btn-change-mobby-img" style="background: rgba(255,215,0,0.15); border: 1px solid #ffd700; color:#ffd700; border-radius:5px; padding:3px 8px; font-size:0.68rem; font-weight:700; cursor:pointer;">
                  🖼️ Trocar PNG
                </button>
              </div>

              <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
                <div>
                  <label style="font-size:0.7rem; color:#ffd700; font-weight:700; text-transform:uppercase; display:block; margin-bottom:3px;">Nome do Mobby</label>
                  <input type="text" id="inp-mobby-name" value="${m.name}" style="width:100%; box-sizing:border-box; background: rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.15); border-radius:5px; padding:6px 8px; color:#fff; font-size:0.88rem; font-weight:700;" />
                </div>
                <div>
                  <label style="font-size:0.7rem; color:#aaa; font-weight:700; text-transform:uppercase; display:block; margin-bottom:3px;">Descrição & Lore</label>
                  <textarea id="inp-mobby-desc" rows="2" style="width:100%; box-sizing:border-box; background: rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.15); border-radius:5px; padding:6px 8px; color:#ccc; font-size:0.75rem; resize:vertical;">${m.description}</textarea>
                </div>
              </div>
            </div>

            <!-- 📐 CONTROLES DE ESCALA, POSICIONAMENTO E ROTAÇÃO DA PNG DO CHEFE -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,215,0,0.25); border-radius: 10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:0.8rem; font-weight:800; color:#ffd700;">📐 ESCALA, POSIÇÃO & ROTAÇÃO DA PNG</div>
                <button id="btn-reset-transform" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#ccc; border-radius:4px; padding:2px 7px; font-size:0.62rem; cursor:pointer;" title="Redefinir escala, posição e rotação">↺ Padrão</button>
              </div>

              <!-- ESCALA -->
              <div style="display:flex; align-items:center; gap:8px;">
                <label style="font-size:0.68rem; color:#aaa; width:85px;">Escala (%):</label>
                <input type="range" id="rng-mobby-scale" min="30" max="300" step="5" value="${scale}" style="flex:1; accent-color:#ffd700; cursor:pointer;" />
                <span id="lbl-mobby-scale" style="font-size:0.75rem; font-weight:800; color:#ffd700; width:45px; text-align:right;">${scale}%</span>
              </div>

              <!-- OFFSET Y (VERTICAL) -->
              <div style="display:flex; align-items:center; gap:8px;">
                <label style="font-size:0.68rem; color:#aaa; width:85px;">Vertical (Y):</label>
                <input type="range" id="rng-mobby-offset-y" min="-180" max="180" step="2" value="${offY}" style="flex:1; accent-color:#ffd700; cursor:pointer;" />
                <span id="lbl-mobby-offset-y" style="font-size:0.75rem; font-weight:800; color:#ffd700; width:45px; text-align:right;">${offY}px</span>
              </div>

              <!-- OFFSET X (HORIZONTAL) -->
              <div style="display:flex; align-items:center; gap:8px;">
                <label style="font-size:0.68rem; color:#aaa; width:85px;">Horizontal (X):</label>
                <input type="range" id="rng-mobby-offset-x" min="-180" max="180" step="2" value="${offX}" style="flex:1; accent-color:#ffd700; cursor:pointer;" />
                <span id="lbl-mobby-offset-x" style="font-size:0.75rem; font-weight:800; color:#ffd700; width:45px; text-align:right;">${offX}px</span>
              </div>

              <!-- ROTAÇÃO -->
              <div style="display:flex; align-items:center; gap:8px;">
                <label style="font-size:0.68rem; color:#aaa; width:85px;">Rotação (°):</label>
                <input type="range" id="rng-mobby-rotation" min="-180" max="180" step="1" value="${rot}" style="flex:1; accent-color:#ffd700; cursor:pointer;" />
                <span id="lbl-mobby-rotation" style="font-size:0.75rem; font-weight:800; color:#ffd700; width:45px; text-align:right;">${rot}°</span>
              </div>
            </div>

            <!-- 🌌 CENÁRIO DE FUNDO DO DUELO (IMAGEM OU VÍDEO) -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(81,197,255,0.25); border-radius: 10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:0.8rem; font-weight:800; color:#51c5ff;">🌌 CENÁRIO DO DUELO (IMAGEM / VÍDEO)</div>
                <button id="btn-clear-bg" style="background:none; border:none; color:#ff4444; font-size:0.68rem; cursor:pointer; text-decoration:underline; display:${m.backgroundUrl ? 'inline-block' : 'none'};">✕ Usar Padrão</button>
              </div>
              <div style="display:flex; align-items:center; gap:10px;">
                <div id="mobby-bg-thumb-box" style="width:70px; height:46px; border-radius:6px; background:#000; border:1px solid rgba(255,255,255,0.2); overflow:hidden; display:flex; align-items:center; justify-content:center;">
                  ${m.backgroundUrl && isVideoUrl(m.backgroundUrl) ? `
                    <video src="${m.backgroundUrl}" muted style="width:100%; height:100%; object-fit:cover;"></video>
                  ` : (m.backgroundUrl ? `
                    <img src="${m.backgroundUrl}" style="width:100%; height:100%; object-fit:cover;" />
                  ` : `<span style="font-size:0.6rem; color:#888;">/scenary.jpg</span>`)}
                </div>
                <div style="flex:1; overflow:hidden;">
                  <button id="btn-change-bg" style="background:rgba(81,197,255,0.15); border:1px solid #51c5ff; color:#51c5ff; border-radius:5px; padding:4px 10px; font-size:0.72rem; font-weight:800; cursor:pointer;">
                    🖼️ / 🎬 Escolher Imagem ou Vídeo da Galeria
                  </button>
                  <div id="mobby-bg-path-label" style="font-size:0.62rem; color:#aaa; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${m.backgroundUrl ? m.backgroundUrl : 'Cenário padrão do jogo'}
                  </div>
                </div>
              </div>
            </div>

            <!-- 🎵 TRILHA SONORA & ÁUDIO DO MOBBY -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(224,86,253,0.25); border-radius: 10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
              <div style="font-size:0.8rem; font-weight:800; color:#e056fd;">🎵 TRILHA SONORA & SONS DO CHEFE</div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                <button id="btn-change-bgm" style="background:rgba(224,86,253,0.15); border:1px solid #e056fd; color:#e056fd; border-radius:5px; padding:6px 8px; font-size:0.68rem; font-weight:800; cursor:pointer; text-align:left;">
                  🎶 Música Tema (BGM)
                  <div id="mobby-bgm-label" style="font-size:0.58rem; color:#aaa; font-weight:400; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px;">
                    ${m.bgmUrl ? m.bgmUrl.split('/').pop() : 'Padrão (batalha)'}
                  </div>
                </button>
                <button id="btn-change-sfx" style="background:rgba(254,202,87,0.15); border:1px solid #feca57; color:#feca57; border-radius:5px; padding:6px 8px; font-size:0.68rem; font-weight:800; cursor:pointer; text-align:left;">
                  ⚔️ Som de Ataque
                  <div id="mobby-sfx-label" style="font-size:0.58rem; color:#aaa; font-weight:400; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px;">
                    ${m.attackSfxUrl ? m.attackSfxUrl.split('/').pop() : 'rugido_dragao'}
                  </div>
                </button>
              </div>
            </div>

            <!-- ATRIBUTOS & CARTA CORRESPONDENTE -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
              <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding:10px;">
                <label style="font-size:0.68rem; color:#ff6b6b; font-weight:800; display:block; margin-bottom:4px;">❤️ PONTOS DE VIDA (HP)</label>
                <input type="number" id="inp-mobby-hp" value="${m.hp}" min="10" max="2000" style="width:100%; box-sizing:border-box; background: rgba(0,0,0,0.5); border:1px solid rgba(255,107,107,0.3); border-radius:5px; padding:6px 8px; color:#fff; font-size:1rem; font-weight:800;" />
              </div>

              <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding:10px;">
                <label style="font-size:0.68rem; color:#feca57; font-weight:800; display:block; margin-bottom:4px;">⚔️ PODER DE ATAQUE</label>
                <input type="number" id="inp-mobby-atk" value="${m.atk}" min="1" max="100" style="width:100%; box-sizing:border-box; background: rgba(0,0,0,0.5); border:1px solid rgba(254,202,87,0.3); border-radius:5px; padding:6px 8px; color:#fff; font-size:1rem; font-weight:800;" />
              </div>

              <div style="grid-column: span 2; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,215,0,0.35); border-radius: 10px; padding:12px; display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-size:0.9rem;">🎴</span>
                    <label style="font-size:0.75rem; color:#ffd700; font-weight:900; letter-spacing:0.5px;">CARTA RECOMPENSA DE VITÓRIA (DROP DO CHEFE)</label>
                  </div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    <button id="btn-refresh-reward-cards" style="background:rgba(255,215,0,0.15); border:1px solid rgba(255,215,0,0.4); color:#ffd700; border-radius:4px; padding:2px 7px; font-size:0.62rem; font-weight:800; cursor:pointer;" title="Recarregar cartas atualizadas da Forja">🔄 Sincronizar</button>
                    <span id="lbl-reward-card-name" style="font-size:0.7rem; color:#ffd700; font-weight:800; background:rgba(255,215,0,0.15); padding:2px 8px; border-radius:4px; border:1px solid rgba(255,215,0,0.3);">${rewardCardTmpl.name}</span>
                  </div>
                </div>

                <!-- PREVIEW VISUAL DA CARTA REAL SELECIONADA -->
                <div id="reward-card-current-preview" style="display:flex; gap:14px; align-items:center; background:linear-gradient(135deg, rgba(20,22,32,0.9), rgba(10,12,18,0.98)); border:1px solid #ffd70055; border-radius:10px; padding:10px 14px; box-shadow:0 6px 20px rgba(0,0,0,0.6);">
                  <!-- MINIATURA DE CARTA REAL EM DESTAQUE -->
                  <div id="reward-card-big-visual" style="
                    width: 86px;
                    height: 132px;
                    flex-shrink: 0;
                    border-radius: 7px;
                    position: relative;
                    background: #0d0e12;
                    border: 2px solid ${rewardRarityColor};
                    box-shadow: 0 0 16px ${rewardRarityColor}55, 0 8px 16px rgba(0,0,0,0.8);
                    overflow: hidden;
                  ">
                    <div id="reward-preview-art" style="
                      position: absolute;
                      inset: 2px;
                      border-radius: 5px;
                      background-image: url('${rewardCardTmpl.image}');
                      background-size: cover;
                      background-position: center;
                    ">
                      <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.85) 85%, #000 100%);"></div>
                    </div>

                    <div style="position: absolute; top: 3px; left: 3px; right: 3px; display: flex; justify-content: space-between; z-index: 3;">
                      <div id="val-reward-mana-badge" style="background: radial-gradient(circle, #00b4d8, #0077b6); border: 1px solid #90e0ef; border-radius: 50%; width: 19px; height: 19px; display: flex; align-items: center; justify-content: center; font-size: 0.62rem; font-weight: 900; color: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.9);">${rewardCardTmpl.manaCost || 1}</div>
                      <div id="val-reward-pv-badge" style="background: radial-gradient(circle, #e63946, #9b111e); border: 1px solid #ff758f; border-radius: 50%; width: 19px; height: 19px; display: flex; align-items: center; justify-content: center; font-size: 0.58rem; font-weight: 900; color: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.9);">${rewardCardTmpl.basePv || 100}</div>
                    </div>

                    <div style="position: absolute; bottom: 22px; left: 3px; right: 3px; z-index: 3; background: rgba(0,0,0,0.85); border: 1px solid ${rewardRarityColor}66; border-radius: 3px; padding: 1px 3px; text-align: center;">
                      <div id="txt-reward-title-mini" style="font-size: 0.56rem; font-weight: 900; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${rewardCardTmpl.name}</div>
                    </div>

                    <div style="position: absolute; bottom: 3px; left: 3px; right: 3px; z-index: 3; display: flex; justify-content: space-between; align-items: center;">
                      <span id="val-reward-atk-badge" style="background: rgba(220, 53, 69, 0.9); color: #fff; font-size: 0.52rem; font-weight: 900; padding: 1px 4px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.3);">⚔️ ${rewardCardTmpl.baseAtk || 500}</span>
                      <span id="badge-reward-icon" style="font-size: 0.65rem; color: ${rewardRarityColor};">${rewardRarityDef.icon || '⭐'}</span>
                    </div>
                  </div>

                  <!-- DETALHES COMPLETOS DA CARTA RECOMPENSA -->
                  <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:4px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span id="txt-reward-title" style="font-size: 1rem; font-weight: 900; color: #fff; letter-spacing: 0.5px;">${rewardCardTmpl.name}</span>
                      <span id="badge-reward-rarity" style="font-size:0.6rem; font-weight:800; text-transform:uppercase; padding:2px 8px; border-radius:12px; background:${rewardRarityColor}22; border:1px solid ${rewardRarityColor}; color:${rewardRarityColor};">${rewardRarityDef.label}</span>
                    </div>
                    <div id="txt-reward-flavor" style="font-size: 0.68rem; color: #bbb; line-height: 1.3; font-style: italic;">
                      ${rewardCardTmpl.flavorText || 'Carta lendária concedida aos duelistas vitoriosos.'}
                    </div>
                    <div style="display:flex; gap:12px; margin-top:4px; font-size:0.7rem; color:#eee;">
                      <span>💎 <strong id="val-reward-mana" style="color:#00b4d8;">${rewardCardTmpl.manaCost || 1}</strong> Mana</span>
                      <span>⚔️ <strong id="val-reward-atk" style="color:#ff6b6b;">${rewardCardTmpl.baseAtk || 500}</strong> ATK</span>
                      <span>❤️ <strong id="val-reward-pv" style="color:#2ecc71;">${rewardCardTmpl.basePv || 100}</strong> PV</span>
                    </div>
                    <div style="font-size:0.62rem; color:#ffd700; font-weight:700; margin-top:2px;">
                      ✨ Ao derrotar o chefe na arena, a carta é forjada e adicionada ao inventário!
                    </div>
                  </div>
                </div>

                <!-- CONTROLE DE FILTRO & BUSCA DE CARTAS -->
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:4px;">
                  <div style="display:flex; align-items:center; gap:4px; flex:1;">
                    <input type="text" id="inp-search-reward-card" placeholder="🔍 Buscar carta no baralho..." style="width:100%; box-sizing:border-box; background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.15); border-radius:5px; padding:4px 8px; color:#fff; font-size:0.7rem;" />
                  </div>
                  <div style="display:flex; gap:4px; flex-shrink:0;">
                    <button class="btn-filter-reward-rarity active" data-rarity="all" style="background:rgba(255,215,0,0.2); border:1px solid #ffd700; color:#ffd700; font-size:0.6rem; font-weight:800; border-radius:4px; padding:3px 6px; cursor:pointer;">Todas</button>
                    <button class="btn-filter-reward-rarity" data-rarity="legendary" style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.15); color:#ffd700; font-size:0.6rem; font-weight:800; border-radius:4px; padding:3px 6px; cursor:pointer;">⭐</button>
                    <button class="btn-filter-reward-rarity" data-rarity="epic" style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.15); color:#b44eff; font-size:0.6rem; font-weight:800; border-radius:4px; padding:3px 6px; cursor:pointer;">🔮</button>
                    <button class="btn-filter-reward-rarity" data-rarity="rare" style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.15); color:#4da6ff; font-size:0.6rem; font-weight:800; border-radius:4px; padding:3px 6px; cursor:pointer;">🔷</button>
                    <button class="btn-filter-reward-rarity" data-rarity="common" style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.15); color:#aaa; font-size:0.6rem; font-weight:800; border-radius:4px; padding:3px 6px; cursor:pointer;">⬜</button>
                  </div>
                </div>

                <!-- CARROSSEL DE SELEÇÃO VISUAL DAS CARTAS REAIS -->
                <div id="reward-cards-carousel" style="display:flex; gap:8px; overflow-x:auto; padding:6px 2px; scrollbar-width:thin;">
                  ${templates.map((c: any) => {
                    const isSel = c.name === (m.rewardCardId || rewardCardTmpl.name);
                    return this.renderRewardMiniCard(c, isSel);
                  }).join('')}
                </div>

                <select id="sel-mobby-reward" style="width:100%; box-sizing:border-box; background: rgba(0,0,0,0.7); border:1px solid rgba(255,215,0,0.3); border-radius:5px; padding:5px 8px; color:#ffd700; font-size:0.75rem; font-weight:700;">
                  ${templates.map((c: any) => `
                    <option value="${c.name}" ${c.name === (m.rewardCardId || rewardCardTmpl.name) ? 'selected' : ''}>${c.name} (${c.preferredRarity || 'comum'})</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <!-- 4 SLOTS CIRCULARES DE ARTEFATOS -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding:12px;">
              <div style="font-size:0.85rem; font-weight:800; color:#ffd700; margin-bottom:8px;">🔮 4 ARTEFATOS DO MOBBY (USO NO DUELO)</div>
              <div style="display:flex; justify-content:space-between; gap:8px;">
                ${[0, 1, 2, 3].map(slotIdx => {
                  const currentArtId = m.artifacts[slotIdx] || '';
                  return `
                    <div style="display:flex; flex-direction:column; align-items:center; gap:4px; flex:1;">
                      <select class="sel-slot-artifact" data-slot="${slotIdx}" style="width:100%; background:rgba(0,0,0,0.7); border:1px solid rgba(255,255,255,0.15); color:#ccc; font-size:0.65rem; border-radius:4px; padding:3px;">
                        <option value="">Vazio</option>
                        ${SKILL_POOL.map(s => `
                          <option value="${s.id}" ${s.id === currentArtId ? 'selected' : ''}>${s.name}</option>
                        `).join('')}
                      </select>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- DIÁLOGOS NO DUELO -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div style="font-size:0.85rem; font-weight:800; color:#ffd700;">💬 DIÁLOGOS & INTERAÇÕES NO DUELO</div>
                <button id="btn-add-dialogue" style="background: rgba(255,215,0,0.15); border: 1px solid #ffd700; color:#ffd700; border-radius:5px; padding:3px 8px; font-size:0.68rem; font-weight:800; cursor:pointer;">+ FALA</button>
              </div>

              <div id="mobby-dialogues-container" style="display:flex; flex-direction:column; gap:8px;">
                ${m.dialogues.map((dlg, dIdx) => `
                  <div class="dlg-item" data-didx="${dIdx}" style="display:flex; gap:8px; align-items:center; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:6px 8px;">
                    <select class="dlg-trigger-type" data-didx="${dIdx}" style="background:rgba(0,0,0,0.7); border:1px solid rgba(255,255,255,0.2); color:#fff; font-size:0.68rem; border-radius:4px; padding:3px;">
                      <option value="hp_below" ${dlg.triggerType === 'hp_below' ? 'selected' : ''}>Abaixo de % HP</option>
                      <option value="turn_reached" ${dlg.triggerType === 'turn_reached' ? 'selected' : ''}>Ao Iniciar Turno</option>
                    </select>
                    <input type="number" class="dlg-trigger-val" data-didx="${dIdx}" value="${dlg.triggerValue}" style="width:48px; background:rgba(0,0,0,0.7); border:1px solid rgba(255,255,255,0.2); color:#ffd700; font-size:0.68rem; border-radius:4px; padding:3px;" />
                    <input type="text" class="dlg-text" data-didx="${dIdx}" value="${dlg.text}" style="flex:1; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.15); border-radius:4px; padding:4px 6px; color:#fff; font-size:0.75rem;" />
                    <button class="btn-del-dlg" data-didx="${dIdx}" style="background:none; border:none; color:#ff5252; cursor:pointer; font-size:0.85rem;" title="Remover">✕</button>
                  </div>
                `).join('')}
              </div>
            </div>

          </div>
        </div>

        <!-- ─── COLUNA 3: PREVIEW REAL DA ARENA 3x1 EM CONTAINER RETRATO ALONGADO MODERNO (19.5:9) ─── -->
        <div class="mobby-live-preview-col" style="width: 430px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; overflow: hidden;">
          
          <!-- BARRA DE CONTROLE DO PREVIEW E TESTES -->
          <div style="padding: 8px 12px; background: rgba(18, 14, 25, 0.95); border: 1px solid rgba(255,215,0,0.3); border-radius: 12px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:0.75rem; color:#ffd700; font-weight:900; letter-spacing:1px;">ESPELHO DA BATALHA 3x1</span>
                <span style="font-size:0.55rem; background:#2ecc71; color:#000; font-weight:900; padding:1px 5px; border-radius:4px;">19.5:9 RETRATO</span>
              </div>
              <div style="display:flex; gap:6px;">
                <button id="btn-preview-reset" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#ccc; border-radius:4px; padding:3px 7px; font-size:0.65rem; cursor:pointer;" title="Restaurar HP e estado inicial">🔄 Reset</button>
                <button id="btn-preview-fullscreen" style="background:linear-gradient(135deg, #00b4d8, #0077b6); border:none; color:#fff; border-radius:4px; padding:3px 8px; font-size:0.65rem; font-weight:800; cursor:pointer;" title="Abrir página completa">↗️ Tela Cheia</button>
              </div>
            </div>

            <!-- BOTÕES DE TESTES COMPACTOS -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;">
              <button id="btn-test-gelatina" style="background:linear-gradient(135deg, #e74c3c, #c0392b); border:1px solid #ff7675; color:#fff; border-radius:5px; padding:5px 2px; font-size:0.65rem; font-weight:800; cursor:pointer;" title="Testar dano no chefe">
                💥 Dano
              </button>
              <button id="btn-test-investida" style="background:linear-gradient(135deg, #f39c12, #d35400); border:1px solid #f1c40f; color:#fff; border-radius:5px; padding:5px 2px; font-size:0.65rem; font-weight:800; cursor:pointer;" title="Investida do chefe contra o jogador">
                ⚡ Investida
              </button>
              <button id="btn-test-dialogue" style="background:linear-gradient(135deg, #8e44ad, #6c3483); border:1px solid #bb86fc; color:#fff; border-radius:5px; padding:5px 2px; font-size:0.65rem; font-weight:800; cursor:pointer;" title="Testar diálogo de duelo">
                💬 Fala
              </button>
              <button id="btn-test-reward" style="background:linear-gradient(135deg, #ffd700, #b8860b); border:1px solid #fff; color:#000; border-radius:5px; padding:5px 2px; font-size:0.65rem; font-weight:900; cursor:pointer;" title="Testar derrota do chefe se transformando na carta">
                ✨ Derrota
              </button>
            </div>
          </div>

          <!-- ─── CONTAINER RETRATO: A ARENA OFICIAL DO DUELO EMBUTIDA (100% IDÊNTICA AO JOGO CHEIO) ─── -->
          <div class="forge-portrait-phone-frame" id="sim-arena-display" style="
            width: 405px; height: 875px; max-height: calc(100vh - 110px);
            aspect-ratio: 9 / 19.5; border-radius: 40px; border: 4px solid rgba(255, 215, 0, 0.75);
            box-shadow: 0 20px 55px rgba(0, 0, 0, 0.95), 0 0 30px rgba(255, 215, 0, 0.25);
            position: relative; overflow: hidden; display: flex; flex-direction: column;
            margin: 0 auto; background: #000;
          ">
            <!-- NOTCH DO SMARTPHONE (DYNAMIC ISLAND STYLE) -->
            <div class="forge-portrait-phone-notch" style="position:absolute; top:8px; left:50%; transform:translateX(-50%); width:96px; height:16px; background:rgba(0,0,0,0.95); border-radius:14px; z-index:120; pointer-events:none; border:1px solid rgba(255,255,255,0.15); box-shadow:0 2px 8px rgba(0,0,0,0.8);"></div>

            <!-- TELA OFICIAL DA BATALHA DE CHEFE -->
            <iframe id="prev-boss-iframe" src="boss_battle.html?mobby=${encodeURIComponent(m.id)}&preview=1" style="
              width: 100%; height: 100%; border: none; border-radius: 36px; background: #000; display: block;
            "></iframe>
          </div>

        </div>

      </div>
    `;
  }

  public bind(container: HTMLElement): void {
    // ─── SELEÇÃO E EXCLUSÃO NA LISTA ESQUERDA ───
    container.querySelectorAll('.mobby-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('btn-del-mobby')) return;
        const id = (el as HTMLElement).dataset.id!;
        this.selectedMobbyId = id;
        this.currentMobby = MobbyManager.getMobbyById(id) || this.createBlankMobby();
        this.previewCurrentHp = this.currentMobby.hp;
        this.callbacks.reRender();
      });
    });

    container.querySelectorAll('.btn-del-mobby').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id!;
        if (confirm('Deseja excluir este Mobby?')) {
          MobbyManager.deleteMobby(id);
          const list = MobbyManager.getMobbys();
          this.selectedMobbyId = list[0]?.id || '';
          TabMobbys.activeSelectedMobbyId = this.selectedMobbyId;
          this.currentMobby = MobbyManager.getMobbyById(this.selectedMobbyId) || this.createBlankMobby();
          this.previewCurrentHp = this.currentMobby.hp;
          this.callbacks.reRender();
        }
      });
    });

    container.querySelector('#btn-add-mobby')?.addEventListener('click', () => {
      const blank = this.createBlankMobby();
      MobbyManager.upsertMobby(blank);
      this.selectedMobbyId = blank.id;
      TabMobbys.activeSelectedMobbyId = blank.id;
      this.currentMobby = blank;
      this.previewCurrentHp = blank.hp;
      this.callbacks.reRender();
    });

    // ─── EDIÇÃO EM TEMPO REAL DO FORMULÁRIO COM AUTO-SAVE AUTOMÁTICO ───
    container.querySelector('#inp-mobby-name')?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      this.currentMobby.name = val;
      const prevName = container.querySelector('#prev-boss-name');
      if (prevName) prevName.textContent = val;
      this.autoSave();
    });

    container.querySelector('#inp-mobby-desc')?.addEventListener('input', (e) => {
      this.currentMobby.description = (e.target as HTMLTextAreaElement).value;
      this.autoSave();
    });

    container.querySelector('#inp-mobby-hp')?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value) || 100;
      this.currentMobby.hp = val;
      this.currentMobby.maxHp = val;
      this.previewCurrentHp = val;
      this.updateLivePreviewHp(container);
      this.autoSave();
    });

    container.querySelector('#inp-mobby-atk')?.addEventListener('input', (e) => {
      this.currentMobby.atk = parseInt((e.target as HTMLInputElement).value) || 10;
      this.autoSave();
    });

    // ─── SELETOR VISUAL DA CARTA RECOMPENSA (CARROSSEL + PREVIEW + SELECT) ───
    const updateRewardCardVisual = (cardName: string) => {
      this.currentMobby.rewardCardId = cardName;
      this.autoSave();

      const templates = this.getTemplates();
      const card = templates.find((c: any) => c.name === cardName) || templates[0];
      if (card) {
        const rewardRarityKey = (card.preferredRarity || 'common').toLowerCase();
        const rDef = (RARITIES as any)[rewardRarityKey] || { label: 'Comum', color: '#aaaaaa', icon: '⬜' };
        const rarityColor = card.borderColor || rDef.color || '#4da6ff';

        const artEl = container.querySelector('#reward-preview-art') as HTMLElement;
        const txtTitle = container.querySelector('#txt-reward-title');
        const txtTitleMini = container.querySelector('#txt-reward-title-mini');
        const lblName = container.querySelector('#lbl-reward-card-name');
        const badgeRarity = container.querySelector('#badge-reward-rarity') as HTMLElement;
        const badgeIcon = container.querySelector('#badge-reward-icon');
        const valManaBadge = container.querySelector('#val-reward-mana-badge');
        const valPvBadge = container.querySelector('#val-reward-pv-badge');
        const valAtkBadge = container.querySelector('#val-reward-atk-badge');
        const valMana = container.querySelector('#val-reward-mana');
        const valAtk = container.querySelector('#val-reward-atk');
        const valPv = container.querySelector('#val-reward-pv');
        const flavorEl = container.querySelector('#txt-reward-flavor');
        const bigVisual = container.querySelector('#reward-card-big-visual') as HTMLElement;
        const selEl = container.querySelector('#sel-mobby-reward') as HTMLSelectElement;

        if (artEl) artEl.style.backgroundImage = `url('${card.image}')`;
        if (txtTitle) txtTitle.textContent = card.name;
        if (txtTitleMini) txtTitleMini.textContent = card.name;
        if (lblName) lblName.textContent = card.name;
        if (badgeRarity) {
          badgeRarity.textContent = rDef.label;
          badgeRarity.style.color = rarityColor;
          badgeRarity.style.borderColor = rarityColor;
          badgeRarity.style.background = `${rarityColor}22`;
        }
        if (badgeIcon) {
          badgeIcon.textContent = rDef.icon || '⭐';
          (badgeIcon as HTMLElement).style.color = rarityColor;
        }
        if (valManaBadge) valManaBadge.textContent = String(card.manaCost || 1);
        if (valPvBadge) valPvBadge.textContent = String(card.basePv || 100);
        if (valAtkBadge) valAtkBadge.textContent = `⚔️ ${card.baseAtk || 500}`;
        if (valMana) valMana.textContent = String(card.manaCost || 1);
        if (valAtk) valAtk.textContent = String(card.baseAtk || 500);
        if (valPv) valPv.textContent = String(card.basePv || 100);
        if (flavorEl) flavorEl.textContent = card.flavorText || 'Carta lendária concedida aos duelistas vitoriosos.';
        if (bigVisual) {
          bigVisual.style.borderColor = rarityColor;
          bigVisual.style.boxShadow = `0 0 16px ${rarityColor}55, 0 8px 16px rgba(0,0,0,0.8)`;
        }
        if (selEl && selEl.value !== card.name) selEl.value = card.name;

        // Atualiza destaque visual dos cards no carrossel
        container.querySelectorAll('.reward-card-pick-item').forEach(item => {
          const itName = (item as HTMLElement).dataset.cardname;
          const isCurrent = itName === card.name;
          const itCard = templates.find((c: any) => c.name === itName);
          const itRDef = (RARITIES as any)[(itCard?.preferredRarity || 'common').toLowerCase()] || { color: '#aaaaaa' };
          const itColor = itCard?.borderColor || itRDef.color || '#4da6ff';

          (item as HTMLElement).style.borderColor = isCurrent ? '#ffd700' : itColor;
          (item as HTMLElement).style.boxShadow = isCurrent ? '0 0 14px rgba(255,215,0,0.85), inset 0 0 8px rgba(255,215,0,0.3)' : `0 4px 10px rgba(0,0,0,0.7), 0 0 6px ${itColor}33`;
          (item as HTMLElement).classList.toggle('active', isCurrent);

          let checkEl = item.querySelector('.reward-card-check');
          if (isCurrent && !checkEl) {
            const chk = document.createElement('div');
            chk.className = 'reward-card-check';
            chk.style.cssText = 'position:absolute; top:-3px; right:-3px; background:linear-gradient(135deg, #ffd700, #ff9f1a); color:#000; font-size:0.65rem; width:19px; height:19px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:950; box-shadow:0 0 8px #ffd700; border:2px solid #fff; z-index:6;';
            chk.textContent = '✓';
            item.appendChild(chk);
          } else if (!isCurrent && checkEl) {
            checkEl.remove();
          }
        });
      }

      // Notifica o preview ao vivo no iframe
      const iframe = container.querySelector('#prev-boss-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'UPDATE_REWARD_CARD',
          payload: { rewardCardId: cardName }
        }, '*');
      }
    };

    // Filtro por texto de busca de cartas
    const inpSearchReward = container.querySelector('#inp-search-reward-card') as HTMLInputElement;
    const filterRarityBtns = container.querySelectorAll('.btn-filter-reward-rarity');
    let currentFilterRarity = 'all';

    const filterCards = () => {
      const q = (inpSearchReward?.value || '').trim().toLowerCase();
      container.querySelectorAll('.reward-card-pick-item').forEach(item => {
        const cardName = (item as HTMLElement).dataset.cardname || '';
        const cardRarity = ((item as HTMLElement).dataset.rarity || '').toLowerCase();
        const matchesQuery = !q || cardName.toLowerCase().includes(q);
        const matchesRarity = currentFilterRarity === 'all' || cardRarity === currentFilterRarity;
        (item as HTMLElement).style.display = (matchesQuery && matchesRarity) ? 'flex' : 'none';
      });
    };

    inpSearchReward?.addEventListener('input', filterCards);

    filterRarityBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterRarityBtns.forEach(b => {
          (b as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
          (b as HTMLElement).style.background = 'rgba(0,0,0,0.5)';
        });
        (btn as HTMLElement).style.borderColor = '#ffd700';
        (btn as HTMLElement).style.background = 'rgba(255,215,0,0.2)';
        currentFilterRarity = (btn as HTMLElement).dataset.rarity || 'all';
        filterCards();
      });
    });

    // Botão de sincronização dinâmica de cartas da Forja
    container.querySelector('#btn-refresh-reward-cards')?.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/load-cards');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            this.state.templates = data;
          }
        }
      } catch (_) {}
      this.callbacks.reRender();
      this.callbacks.showToast('Cartas sincronizadas com a Forja!', '#ffd700');
    });

    // Clique direto nos cards visuais do carrossel
    container.querySelectorAll('.reward-card-pick-item').forEach(item => {
      item.addEventListener('click', () => {
        const cardName = (item as HTMLElement).dataset.cardname;
        if (cardName) {
          updateRewardCardVisual(cardName);
          this.callbacks.showToast(`Recompensa: ${cardName}`, '#ffd700');
        }
      });
    });

    // Alteração pelo select
    container.querySelector('#sel-mobby-reward')?.addEventListener('change', (e) => {
      const cardName = (e.target as HTMLSelectElement).value;
      updateRewardCardVisual(cardName);
    });

    container.querySelectorAll('.sel-slot-artifact').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const slotIdx = parseInt((sel as HTMLElement).dataset.slot!);
        const val = (e.target as HTMLSelectElement).value;
        this.currentMobby.artifacts[slotIdx] = val;
        this.autoSave();

        // Atualizar visualmente o artefato correspondente no preview ao vivo
        const skill = SKILL_POOL.find(s => s.id === val);
        const artBtn = container.querySelector(`.prev-skill-btn[data-slot="${slotIdx}"]`) as HTMLElement;
        if (artBtn) {
          artBtn.dataset.art = val;
          artBtn.textContent = val ? (skill?.icon || '✨') : '?';
          artBtn.title = skill ? `Usar ${skill.name} no Chefe!` : 'Slot de Artefato';
          artBtn.style.borderColor = val ? '#ffd700' : 'rgba(255,215,0,0.3)';
          artBtn.style.boxShadow = val ? '0 0 8px rgba(255,215,0,0.4)' : 'transparent';
        }
      });
    });

    // ─── CONTROLE DE ESCALA, POSICIONAMENTO E ROTAÇÃO AO VIVO COM AUTO-SAVE ───
    const applySpriteTransform = () => {
      const scale = this.currentMobby.scale ?? 100;
      const offX = this.currentMobby.offsetX ?? 0;
      const offY = this.currentMobby.offsetY ?? 0;
      const rot = this.currentMobby.rotation ?? 0;
      
      const iframe = container.querySelector('#prev-boss-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'UPDATE_BOSS_TRANSFORM',
          payload: { scale, offsetX: offX, offsetY: offY, rotation: rot }
        }, '*');
      }
      try {
        const wrap = iframe?.contentDocument?.getElementById('boss-sprite-transform-wrap');
        if (wrap) {
          wrap.style.transform = `translate(${offX}px, ${offY}px) rotate(${rot}deg) scale(${scale / 100})`;
        }
      } catch (e) {}
    };

    const addSliderListener = (id: string, prop: 'scale' | 'offsetY' | 'offsetX' | 'rotation', unit: string) => {
      const el = container.querySelector(id) as HTMLInputElement | null;
      if (!el) return;
      el.addEventListener('input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value) || 0;
        (this.currentMobby as any)[prop] = val;
        const lbl = container.querySelector(`#lbl-mobby-${prop === 'offsetY' ? 'offset-y' : prop === 'offsetX' ? 'offset-x' : prop}`);
        if (lbl) lbl.textContent = `${val}${unit}`;
        applySpriteTransform();
        this.autoSaveDebounced();
      });
      el.addEventListener('change', () => {
        this.autoSave();
      });
    };

    addSliderListener('#rng-mobby-scale', 'scale', '%');
    addSliderListener('#rng-mobby-offset-y', 'offsetY', 'px');
    addSliderListener('#rng-mobby-offset-x', 'offsetX', 'px');
    addSliderListener('#rng-mobby-rotation', 'rotation', '°');

    container.querySelector('#btn-reset-transform')?.addEventListener('click', () => {
      this.currentMobby.scale = 100;
      this.currentMobby.offsetX = 0;
      this.currentMobby.offsetY = 0;
      this.currentMobby.rotation = 0;
      const rngScale = container.querySelector('#rng-mobby-scale') as HTMLInputElement;
      const rngOffY = container.querySelector('#rng-mobby-offset-y') as HTMLInputElement;
      const rngOffX = container.querySelector('#rng-mobby-offset-x') as HTMLInputElement;
      const rngRot = container.querySelector('#rng-mobby-rotation') as HTMLInputElement;
      const lblScale = container.querySelector('#lbl-mobby-scale');
      const lblOffY = container.querySelector('#lbl-mobby-offset-y');
      const lblOffX = container.querySelector('#lbl-mobby-offset-x');
      const lblRot = container.querySelector('#lbl-mobby-rotation');
      if (rngScale) rngScale.value = '100';
      if (rngOffY) rngOffY.value = '0';
      if (rngOffX) rngOffX.value = '0';
      if (rngRot) rngRot.value = '0';
      if (lblScale) lblScale.textContent = '100%';
      if (lblOffY) lblOffY.textContent = '0px';
      if (lblOffX) lblOffX.textContent = '0px';
      if (lblRot) lblRot.textContent = '0°';
      applySpriteTransform();
      this.autoSave();
    });

    // ─── ESCOLHA DE CENÁRIO (IMAGEM OU VÍDEO) SEM RECARREGAR A TELA ───
    container.querySelector('#btn-change-bg')?.addEventListener('click', () => {
      this.callbacks.openMediaPicker((url: string) => {
        this.currentMobby.backgroundUrl = url;
        this.autoSave();
        try {
          const raw = localStorage.getItem('forge_scenarios');
          const data = raw ? JSON.parse(raw) : {};
          data[`boss_mobby_${this.currentMobby.id}`] = url;
          localStorage.setItem('forge_scenarios', JSON.stringify(data));
        } catch (_) {}
        this.updateLiveScenarioBackground(container);
        this.callbacks.showToast(`Cenário atualizado e salvo!`, '#51c5ff');
      });
    });

    container.querySelector('#btn-clear-bg')?.addEventListener('click', () => {
      this.currentMobby.backgroundUrl = '';
      this.autoSave();
      try {
        const raw = localStorage.getItem('forge_scenarios');
        if (raw) {
          const data = JSON.parse(raw);
          delete data[`boss_mobby_${this.currentMobby.id}`];
          localStorage.setItem('forge_scenarios', JSON.stringify(data));
        }
      } catch (_) {}
      this.updateLiveScenarioBackground(container);
      this.callbacks.showToast(`Cenário redefinido para o padrão!`, '#aaa');
    });

    // ─── ESCOLHA DE SONS (BGM & SFX) SEM RECARREGAR A TELA ───
    container.querySelector('#btn-change-bgm')?.addEventListener('click', () => {
      this.callbacks.openMediaPicker((url: string) => {
        this.currentMobby.bgmUrl = url;
        this.autoSave();
        const lbl = container.querySelector('#mobby-bgm-label');
        if (lbl) lbl.textContent = url.split('/').pop() || 'Personalizada';
        this.callbacks.showToast(`Trilha BGM definida e salva!`, '#e056fd');
      });
    });

    container.querySelector('#btn-change-sfx')?.addEventListener('click', () => {
      this.callbacks.openMediaPicker((url: string) => {
        this.currentMobby.attackSfxUrl = url;
        this.autoSave();
        const lbl = container.querySelector('#mobby-sfx-label');
        if (lbl) lbl.textContent = url.split('/').pop() || 'Personalizado';
        this.callbacks.showToast(`Som de ataque salvo!`, '#feca57');
      });
    });

    // Trocar PNG com auto-save sem recarregar a tela
    container.querySelector('#btn-change-mobby-img')?.addEventListener('click', () => {
      this.callbacks.openMediaPicker((url: string) => {
        this.currentMobby.image = url;
        this.autoSave();
        const img = container.querySelector('#mobby-img-display') as HTMLImageElement;
        const prevImg = container.querySelector('#prev-mobby-sprite') as HTMLImageElement;
        const prevAvatar = container.querySelector('#prev-boss-avatar-icon') as HTMLElement;
        const sidebarImg = container.querySelector(`.mobby-item[data-id="${this.currentMobby.id}"] img`) as HTMLImageElement;
        if (img) img.src = url;
        if (prevImg) prevImg.src = url;
        if (prevAvatar) prevAvatar.style.backgroundImage = `url('${url}')`;
        if (sidebarImg) sidebarImg.src = url;
      });
    });

    // Diálogos com auto-save sem recarregar a tela
    container.querySelector('#btn-add-dialogue')?.addEventListener('click', () => {
      this.currentMobby.dialogues.push({
        triggerType: 'hp_below',
        triggerValue: 30,
        speaker: 'mobby',
        text: 'Não pense que venceu!'
      });
      this.autoSave();
      this.renderDialoguesList(container);
    });

    this.bindDialogueEvents(container);

    // SALVAR MANUAL (CONFIRMAÇÃO ADICIONAL - ZERO RECARREGAMENTO)
    container.querySelector('#btn-save-mobby')?.addEventListener('click', () => {
      this.autoSave();
      this.callbacks.showToast(`Mobby "${this.currentMobby.name}" salvo com sucesso!`, '#2ecc71');
    });

    // ─── AÇÕES INTERATIVAS DO PREVIEW AO VIVO ───

    // Clique direto no sprite ou slot do Mobby para dar dano de teste
    container.querySelector('#prev-boss-sprite-slot')?.addEventListener('click', () => {
      this.simulateDamageOnPreview(container, 30);
    });

    // Clique na alça de ataque simulada
    container.querySelector('#prev-btn-attack-prompt')?.addEventListener('click', () => {
      this.simulateDamageOnPreview(container, 30);
    });

    // CLIQUE NOS SLOTS DE ARTEFATOS NO PREVIEW (USANDO ARTEFATO CONTRA O MOBBY!)
    container.querySelectorAll('.prev-skill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const artId = (btn as HTMLElement).dataset.art;
        this.useArtifactOnBoss(artId || '', container);
      });
    });

    // Botão "Dano / Gelatina"
    container.querySelector('#btn-test-gelatina')?.addEventListener('click', () => {
      const iframe = container.querySelector('#prev-boss-iframe') as HTMLIFrameElement;
      try {
        const bossSlot = iframe?.contentDocument?.getElementById('boss-sprite-slot');
        if (bossSlot) {
          bossSlot.click();
        } else {
          const sprite = iframe?.contentDocument?.getElementById('mobby-sprite');
          if (sprite) {
            sprite.classList.remove('boss-hit-red-silhouette');
            void sprite.offsetWidth;
            sprite.classList.add('boss-hit-red-silhouette');
            setTimeout(() => sprite?.classList.remove('boss-hit-red-silhouette'), 460);
          }
        }
      } catch (e) {}
    });

    // Botão "Testar Investida"
    container.querySelector('#btn-test-investida')?.addEventListener('click', () => {
      const iframe = container.querySelector('#prev-boss-iframe') as HTMLIFrameElement;
      try {
        const sprite = iframe?.contentDocument?.getElementById('mobby-sprite');
        if (sprite) {
          sprite.classList.add('boss-jelly-attack');
          setTimeout(() => sprite.classList.remove('boss-jelly-attack'), 550);
        }
      } catch (e) {}
    });

    // Botão "Testar Diálogo"
    container.querySelector('#btn-test-dialogue')?.addEventListener('click', () => {
      this.openPreviewDialogue(container);
    });

    // Botão "Testar Derrota / Transformação na Carta"
    container.querySelector('#btn-test-reward')?.addEventListener('click', () => {
      const iframe = container.querySelector('#prev-boss-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'TEST_VICTORY_REWARD' }, '*');
        this.callbacks.showToast('Testando transformação do Chefe na carta!', '#ffd700');
      }
    });

    // Botão "Reset"
    container.querySelector('#btn-preview-reset')?.addEventListener('click', () => {
      this.resetPreviewState(container);
    });

    // Botão "Tela Cheia"
    container.querySelector('#btn-preview-fullscreen')?.addEventListener('click', () => {
      MobbyManager.upsertMobby(this.currentMobby);
      window.open(`boss_battle.html?mobby=${encodeURIComponent(this.currentMobby.id)}`, '_blank');
    });
  }

  // ─── USO DE ARTEFATO CONTRA O MOBBY NO PREVIEW ───
  private useArtifactOnBoss(artId: string, container: HTMLElement) {
    const skill = SKILL_POOL.find(s => s.id === artId);
    const artName = skill?.name || 'Artefato Ancestral';
    const artDmg = skill?.power || 40;

    try { SoundManager.playAction('magia_impacto', 0.8); } catch (_) {}

    // Artefatos causam dano e atordoam/queimam o mobby
    this.previewCurrentHp = Math.max(0, this.previewCurrentHp - artDmg);
    this.updateLivePreviewHp(container);

    const sprite = container.querySelector('#prev-mobby-sprite') as HTMLElement;
    const floatEl = container.querySelector('#prev-dmg-float') as HTMLElement;

    if (floatEl) {
      floatEl.textContent = `-${artDmg} ✨ ${artName}`;
      gsap.killTweensOf(floatEl);
      gsap.fromTo(floatEl, 
        { opacity: 1, y: 0, scale: 1.4 }, 
        { opacity: 0, y: -30, scale: 0.9, duration: 0.8, ease: 'power2.out' }
      );
    }

    // APLICAR FILTRO VERMELHO ESTRITAMENTE SOBRE A PNG DO CHEFE
    if (sprite) {
      sprite.classList.remove('boss-hit-red-silhouette');
      void sprite.offsetWidth; // Força reflow
      sprite.classList.add('boss-hit-red-silhouette');

      gsap.killTweensOf(sprite);
      gsap.timeline()
        .to(sprite, { scaleX: 1.4, scaleY: 0.6, duration: 0.08, ease: 'power2.out' })
        .to(sprite, { scaleX: 0.75, scaleY: 1.35, duration: 0.12, ease: 'power1.inOut' })
        .to(sprite, { scaleX: 1.1, scaleY: 0.92, duration: 0.1, ease: 'power1.inOut' })
        .to(sprite, { scaleX: 1, scaleY: 1, duration: 0.2, ease: 'elastic.out(1.2, 0.4)' });
    }

    if (this.previewCurrentHp <= 0) {
      setTimeout(() => this.simulateDefeatOnPreview(container), 300);
    }
  }

  // ─── MÉTODOS DE ANIMAÇÃO DO PREVIEW ───
  private updateLivePreviewHp(container: HTMLElement) {
    const num = container.querySelector('#prev-hp-e') as HTMLElement;
    const maxNum = container.querySelector('#prev-maxhp-e') as HTMLElement;

    if (num) num.textContent = String(this.previewCurrentHp);
    if (maxNum) maxNum.textContent = String(this.currentMobby.maxHp);
  }

  private simulateDamageOnPreview(container: HTMLElement, dmg: number) {
    this.previewCurrentHp = Math.max(0, this.previewCurrentHp - dmg);
    this.updateLivePreviewHp(container);

    const sprite = container.querySelector('#prev-mobby-sprite') as HTMLElement;
    const floatEl = container.querySelector('#prev-dmg-float') as HTMLElement;

    try { SoundManager.playAction('dano_sofrido_pv', 0.8); } catch (_) {}

    // Número de dano flutuante
    if (floatEl) {
      floatEl.textContent = `-${dmg}`;
      gsap.killTweensOf(floatEl);
      gsap.fromTo(floatEl, 
        { opacity: 1, y: 0, scale: 1.3 }, 
        { opacity: 0, y: -26, scale: 0.9, duration: 0.65, ease: 'power2.out' }
      );
    }

    // APLICAR FILTRO VERMELHO ESTRITAMENTE SOBRE A PNG (SEM QUADRADO)
    if (sprite) {
      sprite.classList.remove('boss-hit-red-silhouette');
      void sprite.offsetWidth; // Força reflow para reiniciar animação do filtro vermelho
      sprite.classList.add('boss-hit-red-silhouette');

      // Gelatina de impacto
      gsap.killTweensOf(sprite);
      gsap.timeline()
        .to(sprite, {
          scaleX: 1.38,
          scaleY: 0.62,
          duration: 0.08,
          ease: 'power2.out'
        })
        .to(sprite, {
          scaleX: 0.74,
          scaleY: 1.3,
          duration: 0.11,
          ease: 'power1.inOut'
        })
        .to(sprite, {
          scaleX: 1.12,
          scaleY: 0.9,
          duration: 0.1,
          ease: 'power1.inOut'
        })
        .to(sprite, {
          scaleX: 1,
          scaleY: 1,
          duration: 0.15,
          ease: 'elastic.out(1.2, 0.4)'
        });
    }

    if (this.previewCurrentHp <= 0) {
      setTimeout(() => this.simulateDefeatOnPreview(container), 300);
    }
  }

  private simulateMobbyAttackOnPreview(container: HTMLElement) {
    const sprite = container.querySelector('#prev-mobby-sprite') as HTMLElement;
    const playerSlots = container.querySelectorAll('.forge-portrait-phone-frame .slot-p');

    try { SoundManager.playAction('rugido_dragao', 0.7); } catch (_) {}

    if (sprite) {
      gsap.killTweensOf(sprite);
      gsap.timeline()
        // Comprime na preparação
        .to(sprite, { scaleX: 1.25, scaleY: 0.68, y: 10, duration: 0.28, ease: 'power2.in' })
        // Investida com salto
        .to(sprite, {
          scaleX: 0.9,
          scaleY: 1.25,
          y: 65,
          duration: 0.2,
          ease: 'power3.in',
          onComplete: () => {
            try { SoundManager.playAction('impacto_pesado', 0.9); } catch (_) {}
            playerSlots.forEach(s => {
              gsap.fromTo(s, { y: 0 }, { y: 6, yoyo: true, repeat: 3, duration: 0.05 });
            });
          }
        })
        // Retorno quicando
        .to(sprite, { scaleX: 1.15, scaleY: 0.88, y: 0, duration: 0.25, ease: 'power2.out' })
        .to(sprite, { scaleX: 1, scaleY: 1, duration: 0.2, ease: 'elastic.out(1.2, 0.4)' });
    }
  }

  private openPreviewDialogue(container: HTMLElement) {
    const box = container.querySelector('#prev-dlg-box') as HTMLElement;
    const body = container.querySelector('#prev-dlg-body') as HTMLElement;
    const avatar = container.querySelector('#prev-dlg-avatar') as HTMLImageElement;
    const speaker = container.querySelector('#prev-dlg-speaker') as HTMLElement;

    if (box) {
      if (body) body.textContent = `"${this.currentMobby.dialogues[0]?.text || 'Você não sairá vivo!'}"`;
      if (avatar) avatar.src = this.currentMobby.image;
      if (speaker) speaker.textContent = this.currentMobby.name;
      box.style.display = 'flex';
      gsap.fromTo(box, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.25 });
    }
  }

  private simulateDefeatOnPreview(container: HTMLElement) {
    const sprite = container.querySelector('#prev-mobby-sprite') as HTMLElement;
    const victoryBox = container.querySelector('#prev-victory-box') as HTMLElement;

    try { SoundManager.playAction('boss_defeat_roar', 0.9); } catch (_) {}

    if (sprite) {
      gsap.timeline()
        .to(sprite, {
          x: '+=5',
          yoyo: true,
          repeat: 12,
          duration: 0.05,
          ease: 'power1.inOut'
        })
        .to(sprite, {
          filter: 'brightness(8) drop-shadow(0 0 40px #ffffff) drop-shadow(0 0 80px #ffd700)',
          scale: 1.15,
          duration: 0.9,
          ease: 'power2.in'
        })
        .to(sprite, {
          scale: 1.5,
          opacity: 0,
          duration: 0.35,
          ease: 'power4.out',
          onComplete: () => {
            try { SoundManager.playAction('victory_fanfare', 0.9); } catch (_) {}
            if (victoryBox) {
              victoryBox.style.display = 'flex';
              gsap.fromTo(victoryBox, { opacity: 0 }, { opacity: 1, duration: 0.4 });
              const rewardWrap = container.querySelector('#prev-reward-wrap');
              if (rewardWrap) {
                gsap.fromTo(rewardWrap, 
                  { scale: 0.1, opacity: 0, rotateY: 180 }, 
                  { scale: 0.85, opacity: 1, rotateY: 0, duration: 0.9, ease: 'back.out(1.4)' }
                );
              }
            }
          }
        });
    }
  }



  // ─── RESET DO PREVIEW (RECARREGA O IFRAME DA ARENA OFICIAL) ───
  private resetPreviewState(container: HTMLElement) {
    const iframe = container.querySelector('#prev-boss-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = `boss_battle.html?mobby=${encodeURIComponent(this.currentMobby.id)}&preview=1`;
    }
    this.callbacks.showToast('Arena reiniciada!', '#2ecc71');
  }

  // ─── ATUALIZAÇÃO DO CENÁRIO AO VIVO NO DOM (SEM RECARREGAR A TELA) ───
  private updateLiveScenarioBackground(container: HTMLElement) {
    const bgUrl = this.currentMobby.backgroundUrl || '';
    const isVid = !!(bgUrl && isVideoUrl(bgUrl));

    // Notificar a arena oficial no iframe para atualizar o cenário instantaneamente
    const iframe = container.querySelector('#prev-boss-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'UPDATE_SCENARIO',
        payload: { backgroundUrl: bgUrl }
      }, '*');
    }

    // Atualizar thumbnail e labels no formulário
    const thumbBox = container.querySelector('#mobby-bg-thumb-box');
    if (thumbBox) {
      if (isVid) {
        thumbBox.innerHTML = `<video src="${bgUrl}" muted style="width:100%; height:100%; object-fit:cover;"></video>`;
      } else if (bgUrl) {
        thumbBox.innerHTML = `<img src="${bgUrl}" style="width:100%; height:100%; object-fit:cover;" />`;
      } else {
        thumbBox.innerHTML = `<span style="font-size:0.6rem; color:#888;">/scenary.jpg</span>`;
      }
    }

    const pathLabel = container.querySelector('#mobby-bg-path-label');
    if (pathLabel) {
      pathLabel.textContent = bgUrl || 'Cenário padrão do jogo';
    }

    const clearBtn = container.querySelector('#btn-clear-bg') as HTMLElement | null;
    if (clearBtn) {
      clearBtn.style.display = bgUrl ? 'inline-block' : 'none';
    }
  }

  // ─── ATUALIZAÇÃO DE DIÁLOGOS AO VIVO NO DOM (SEM RECARREGAR A TELA) ───
  private renderDialoguesList(container: HTMLElement) {
    const listEl = container.querySelector('#mobby-dialogues-container');
    if (!listEl) return;

    listEl.innerHTML = this.currentMobby.dialogues.map((dlg, dIdx) => `
      <div class="dlg-item" data-didx="${dIdx}" style="display:flex; gap:8px; align-items:center; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:6px 8px;">
        <select class="dlg-trigger-type" data-didx="${dIdx}" style="background:rgba(0,0,0,0.7); border:1px solid rgba(255,255,255,0.2); color:#fff; font-size:0.68rem; border-radius:4px; padding:3px;">
          <option value="hp_below" ${dlg.triggerType === 'hp_below' ? 'selected' : ''}>Abaixo de % HP</option>
          <option value="turn_reached" ${dlg.triggerType === 'turn_reached' ? 'selected' : ''}>Ao Iniciar Turno</option>
        </select>
        <input type="number" class="dlg-trigger-val" data-didx="${dIdx}" value="${dlg.triggerValue}" style="width:48px; background:rgba(0,0,0,0.7); border:1px solid rgba(255,255,255,0.2); color:#ffd700; font-size:0.68rem; border-radius:4px; padding:3px;" />
        <input type="text" class="dlg-text" data-didx="${dIdx}" value="${dlg.text}" style="flex:1; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.15); border-radius:4px; padding:4px 6px; color:#fff; font-size:0.75rem;" />
        <button class="btn-del-dlg" data-didx="${dIdx}" style="background:none; border:none; color:#ff5252; cursor:pointer; font-size:0.85rem;" title="Remover">✕</button>
      </div>
    `).join('');

    this.bindDialogueEvents(container);
  }

  private bindDialogueEvents(container: HTMLElement) {
    container.querySelectorAll('.btn-del-dlg').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.didx!);
        this.currentMobby.dialogues.splice(idx, 1);
        this.autoSave();
        this.renderDialoguesList(container);
      });
    });

    container.querySelectorAll('.dlg-trigger-type').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt((sel as HTMLElement).dataset.didx!);
        this.currentMobby.dialogues[idx].triggerType = (e.target as HTMLSelectElement).value as any;
        this.autoSave();
      });
    });

    container.querySelectorAll('.dlg-trigger-val').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt((inp as HTMLElement).dataset.didx!);
        this.currentMobby.dialogues[idx].triggerValue = parseInt((e.target as HTMLInputElement).value) || 0;
        this.autoSave();
      });
    });

    container.querySelectorAll('.dlg-text').forEach(txt => {
      txt.addEventListener('input', (e) => {
        const idx = parseInt((txt as HTMLElement).dataset.didx!);
        this.currentMobby.dialogues[idx].text = (e.target as HTMLInputElement).value;
        this.autoSave();
      });
    });
  }
}
