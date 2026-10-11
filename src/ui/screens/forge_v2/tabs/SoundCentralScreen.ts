/**
 * SoundCentralScreen.ts
 * Sound Central — The Forja's complete audio management hub.
 * Sub-tabs: Biblioteca | Ações | Telas Ambiente | Ferramentas
 */

import { SoundManager, SoundAsset } from '../../../utils/SoundManager';

type SoundSubMode = 'library' | 'actions' | 'screens';

interface SoundConfig {
  library: SoundAsset[];
  actions: Record<string, string>;
  screens: Record<string, string>;
  screenSettings?: Record<string, { loop: boolean }>;
  transitions: Record<string, string>;
}

// ─── ACTION DEFINITIONS ────────────────────────────────────────────────────
const ACTION_DEFS: { key: string; label: string; icon: string; group: string }[] = [
  // Combat
  { key: 'atk_basico_1', label: 'Ataque Básico 1', icon: '⚔️', group: 'Combate' },
  { key: 'atk_basico_2', label: 'Ataque Básico 2', icon: '⚔️', group: 'Combate' },
  { key: 'atk_basico_3', label: 'Ataque Básico 3 (Hyper)', icon: '⚔️', group: 'Combate' },
  { key: 'atk_especial', label: 'Ataque Especial / Definitivo', icon: '✨', group: 'Combate' },
  { key: 'parry_qte_start', label: 'Parry QTE (Início)', icon: '🛡️', group: 'Combate' },
  { key: 'parry_sucesso', label: 'Parry Sucesso', icon: '🛡️', group: 'Combate' },
  { key: 'parry_falha', label: 'Parry Falhou', icon: '💥', group: 'Combate' },
  { key: 'dano_direto', label: 'Dano Direto ao Jogador', icon: '💥', group: 'Combate' },
  { key: 'skill_usada', label: 'Habilidade / Artefato Usado', icon: '💎', group: 'Combate' },
  // Cards
  { key: 'carta_sacada', label: 'Sacar Carta do Baralho', icon: '🃏', group: 'Cartas' },
  { key: 'carta_na_mao', label: 'Receber Carta na Mão', icon: '🤚', group: 'Cartas' },
  { key: 'carta_invocada', label: 'Invocar Carta', icon: '🌟', group: 'Cartas' },
  { key: 'carta_morta', label: 'Carta Destruída', icon: '💀', group: 'Cartas' },
  { key: 'sacrificio', label: 'Sacrifício de Carta', icon: '🩸', group: 'Cartas' },
  { key: 'clique_carta', label: 'Clicar em Carta', icon: '👆', group: 'Cartas' },
  // Turn
  { key: 'inicio_turno', label: 'Início do Turno', icon: '🔔', group: 'Turno' },
  { key: 'fim_turno', label: 'Fim do Turno', icon: '🔕', group: 'Turno' },
  // Results
  { key: 'batalha_vitoria', label: 'Vitória', icon: '🏆', group: 'Resultado' },
  { key: 'batalha_derrota', label: 'Derrota / Fim de Jogo', icon: '💀', group: 'Resultado' },
  { key: 'batalha_desistencia', label: 'Desistência / Rendição', icon: '🏳️', group: 'Resultado' },
  { key: 'nivel_up', label: 'Subir de Nível / XP Gain', icon: '⬆️', group: 'Resultado' },
  { key: 'moeda_coletar', label: 'Coletar Moedas', icon: '🪙', group: 'Resultado' },
  // UI
  { key: 'clique_geral', label: 'Clique Geral (UI)', icon: '🖱️', group: 'Interface' },
  { key: 'clique_lobby', label: 'Clique — Lobby', icon: '🏠', group: 'Interface' },
  { key: 'clique_batalhar', label: 'Clique — Batalhar', icon: '⚔️', group: 'Interface' },
  { key: 'clique_perfil', label: 'Clique — Perfil', icon: '👤', group: 'Interface' },
  { key: 'clique_configuracoes', label: 'Clique — Configurações', icon: '⚙️', group: 'Interface' },
  { key: 'clique_loja', label: 'Clique — Loja', icon: '🛒', group: 'Interface' },
  { key: 'clique_deck', label: 'Clique — Deck', icon: '🗂️', group: 'Interface' },
  // States / Cinematic
  { key: 'vitoria_fanfare', label: 'Vitória — Fanfarra (Intro)', icon: '🎺', group: 'Estados de Tela' },
  { key: 'derrota_sting', label: 'Derrota — Impacto (Intro)', icon: '🎻', group: 'Estados de Tela' },
  { key: 'rendicao_confirm', label: 'Rendição — Confirmada', icon: '🏳️', group: 'Estados de Tela' },
  { key: 'coin_start', label: 'Moeda — Início / Lançamento', icon: '🪙', group: 'Estados de Tela' },
  { key: 'coin_spin', label: 'Moeda — Efeito Girando', icon: '🌪️', group: 'Estados de Tela' },
  { key: 'coin_win', label: 'Moeda — Resultado Ganho', icon: '✅', group: 'Estados de Tela' },
  { key: 'coin_lose', label: 'Moeda — Resultado Perdido', icon: '❌', group: 'Estados de Tela' },
];

const SCREEN_DEFS: { key: string; label: string; icon: string }[] = [
  { key: 'lobby', label: 'Lobby / Tela Inicial', icon: '🏠' },
  { key: 'batalha', label: 'Batalha (durante o duelo)', icon: '⚔️' },
  { key: 'difficulty', label: 'Seleção de Dificuldade', icon: '🎯' },
  { key: 'coin_flip', label: 'Cara ou Coroa', icon: '🪙' },
  { key: 'arsenal', label: 'Arsenal / Deck Builder', icon: '🗂️' },
  { key: 'loja', label: 'Loja de Itens', icon: '🛒' },
  { key: 'perfil', label: 'Perfil / Conta', icon: '👤' },
  { key: 'configuracoes', label: 'Configurações', icon: '⚙️' },
  { key: 'deck_builder', label: 'Construção de Deck', icon: '📦' },
  { key: 'map', label: 'Mapa do Mundo', icon: '🗺️' },
  { key: 'academy', label: 'Academia', icon: '🏛️' },
  { key: 'vitoria', label: 'Tela de Vitória', icon: '🏆' },
  { key: 'derrota', label: 'Tela de Derrota', icon: '💀' },
];

const TRANSITION_DEFS: { key: string; from: string; to: string; fromIcon: string; toIcon: string }[] = [
  { key: 'lobby_to_difficulty',     from: 'Lobby',          to: 'Dificuldade',    fromIcon: '🏠', toIcon: '🎯' },
  { key: 'difficulty_to_coin_flip', from: 'Dificuldade',    to: 'Cara ou Coroa',  fromIcon: '🎯', toIcon: '🪙' },
  { key: 'coin_flip_to_batalha',    from: 'Cara ou Coroa',  to: 'Batalha',        fromIcon: '🪙', toIcon: '⚔️' },
  { key: 'batalha_to_vitoria',      from: 'Batalha',        to: 'Vitória',        fromIcon: '⚔️', toIcon: '🏆' },
  { key: 'batalha_to_derrota',      from: 'Batalha',        to: 'Derrota',        fromIcon: '⚔️', toIcon: '💀' },
  { key: 'batalha_to_lobby',        from: 'Batalha',        to: 'Lobby',          fromIcon: '⚔️', toIcon: '🏠' },
  { key: 'lobby_to_arsenal',        from: 'Lobby',          to: 'Arsenal',        fromIcon: '🏠', toIcon: '🗂️' },
  { key: 'lobby_to_loja',           from: 'Lobby',          to: 'Loja',           fromIcon: '🏠', toIcon: '🛒' },
  { key: 'lobby_to_perfil',         from: 'Lobby',          to: 'Perfil',         fromIcon: '🏠', toIcon: '👤' },
  { key: 'lobby_to_configuracoes',  from: 'Lobby',          to: 'Configurações',  fromIcon: '🏠', toIcon: '⚙️' },
  { key: 'arsenal_to_lobby',        from: 'Arsenal',        to: 'Lobby',          fromIcon: '🗂️', toIcon: '🏠' },
  { key: 'loja_to_lobby',           from: 'Loja',           to: 'Lobby',          fromIcon: '🛒', toIcon: '🏠' },
  { key: 'perfil_to_lobby',         from: 'Perfil',         to: 'Lobby',          fromIcon: '👤', toIcon: '🏠' },
];

export class SoundCentralScreen {
  private config: SoundConfig = { library: [], actions: {}, screens: {}, transitions: {} };
  public subMode: SoundSubMode = 'library';
  private availableSounds: SoundAsset[] = [];
  private selectedSounds: Set<string> = new Set(); // Stores URLs
  private selectedActions: Set<string> = new Set();
  private selectedScreens: Set<string> = new Set();
  private expandedScreen: string | null = null;

  constructor(config: SoundConfig, availableSounds: string[]) {
    this.config = JSON.parse(JSON.stringify(config));
    this.availableSounds = availableSounds.map(url => ({ url, name: url.split('/').pop() || url }));
  }

  public async load(): Promise<void> {
    try {
      const res = await fetch('/api/sounds');
      this.config = await res.json();
      this.availableSounds = this.config.library || [];
    } catch (e) {
      console.error('Failed to load sounds:', e);
    }
  }

  public getConfig(): SoundConfig {
    return this.config;
  }

  public setAvailableSounds(sounds: SoundAsset[]) {
    this.availableSounds = sounds;
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────

  public render(): string {
    return `
      <div style="display:flex; flex-direction:column; width:100%; height:100%; overflow:hidden;">

        <!-- Sub-Tabs -->
        <div style="display:flex; gap:6px; padding:10px 20px; background:rgba(0,0,0,0.3); border-bottom:1px solid rgba(255,255,255,0.07); flex-shrink:0;">
          ${this.subTab('library', '📁 BIBLIOTECA', '🎵 Sons importados')}
          ${this.subTab('actions', '🎮 AÇÕES', 'Sons de combate e UI')}
          ${this.subTab('screens', '🎼 TELAS AMBIENTE', 'Música por tela')}
        </div>

        <!-- Content Area -->
        <div style="flex:1; overflow-y:auto; padding:20px;">
          ${this.subMode === 'library' ? this.renderLibrary() : ''}
          ${this.subMode === 'actions' ? this.renderActions() : ''}
          ${this.subMode === 'screens' ? this.renderScreens() : ''}
        </div>

        <!-- Footer Save -->
        <div style="flex-shrink:0; padding:12px 20px; border-top:1px solid rgba(255,255,255,0.08); display:flex; gap:10px; background:rgba(0,0,0,0.4);">
          <button id="snd-btn-import" class="editor-btn-secondary" style="flex:1;">📥 IMPORTAR DO PC</button>
          <input type="file" id="snd-file-input" accept="audio/*" multiple style="display:none;">
          <button id="snd-btn-save" class="editor-btn-primary" style="flex:2; font-size:1rem;">💾 GRAVAR SONS NO CÓDIGO</button>
        </div>
      </div>
    `;
  }

  private subTab(mode: SoundSubMode, label: string, desc: string): string {
    const active = this.subMode === mode;
    return `
      <button class="snd-sub-tab ${active ? 'active' : ''}" data-snd-mode="${mode}" style="
        background:${active ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)'};
        border:1px solid ${active ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.08)'};
        color:${active ? '#ffd700' : '#aaa'};
        border-radius:10px; padding:8px 14px; cursor:pointer; font-size:0.72rem;
        font-weight:${active ? '900' : '600'}; letter-spacing:0.5px; transition:all 0.2s;
        font-family:inherit; white-space:nowrap; flex-shrink:0;
      ">
        ${label}
        <div style="font-size:0.6rem; opacity:0.5; font-weight:400; margin-top:2px;">${desc}</div>
      </button>
    `;
  }

  // ─── LIBRARY ────────────────────────────────────────────────────────────

  private renderLibrary(): string {
    return `
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:15px;">
          ${this.availableSounds.map(snd => {
            const isSelected = this.selectedSounds.has(snd.url);
            return `
              <div class="snd-lib-item" data-snd-url="${snd.url}" style="background:rgba(255,255,255,0.03); border:1px solid ${isSelected ? '#51c5ff' : 'rgba(255,255,255,0.08)'}; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:12px; transition:0.2s; position:relative;">
                <div style="display:flex; align-items:center; gap:12px;">
                  <div style="width:40px; height:40px; background:rgba(81,197,255,0.1); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.4rem;">🎵</div>
                  <div style="flex:1; min-width:0;">
                    <input type="text" class="snd-input-rename" data-url="${snd.url}" value="${snd.name}" 
                           style="background:none; border:none; color:#fff; font-size:0.85rem; font-weight:700; width:100%; border-bottom:1px solid transparent; outline:none;" 
                           onclick="event.stopPropagation()"
                           onfocus="this.style.borderBottomColor='rgba(81,197,255,0.5)'" 
                           onblur="this.style.borderBottomColor='transparent'">
                    <div style="font-size:0.6rem; color:#555; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">${snd.url}</div>
                  </div>
                  <div style="display:flex; gap:6px;">
                    <button class="snd-btn-preview" data-url="${snd.url}" style="background:rgba(81,197,255,0.1); border:1px solid rgba(81,197,255,0.2); color:#51c5ff; border-radius:8px; padding:6px 10px; font-size:0.65rem; cursor:pointer; font-family:inherit;">▶ OUVI</button>
                    <button class="snd-btn-delete-sound" data-url="${snd.url}" style="background:rgba(255,68,68,0.1); border:1px solid rgba(255,68,68,0.2); color:#ff4444; border-radius:8px; padding:6px 10px; font-size:0.65rem; cursor:pointer; font-family:inherit;">✕</button>
                  </div>
                </div>

                <div style="display:flex; align-items:center; gap:8px; background:rgba(0,0,0,0.2); border-radius:10px; padding:6px 10px; border:1px solid rgba(255,255,255,0.05);">
                  <span style="font-size:0.65rem; color:#888; font-weight:700;">VINCULAR A:</span>
                  <select class="snd-quick-link" data-url="${snd.url}" style="flex:1; background:none; border:none; color:#51c5ff; font-size:0.68rem; font-weight:700; outline:none; cursor:pointer;">
                    <option value="" disabled selected>Selecionar ação ou tela...</option>
                    <optgroup label="Ações Combat" style="background:#111; color:#aaa;">
                      ${ACTION_DEFS.filter(a => a.group === 'Combate').map(a => `<option value="act:${a.key}">${a.icon} ${a.label}</option>`).join('')}
                    </optgroup>
                    <optgroup label="Ações Cartas" style="background:#111; color:#aaa;">
                      ${ACTION_DEFS.filter(a => a.group === 'Cartas').map(a => `<option value="act:${a.key}">${a.icon} ${a.label}</option>`).join('')}
                    </optgroup>
                    <optgroup label="Telas" style="background:#111; color:#aaa;">
                      ${SCREEN_DEFS.map(s => `<option value="scr:${s.key}">${s.icon} ${s.label}</option>`).join('')}
                    </optgroup>
                  </select>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // ─── ACTIONS ────────────────────────────────────────────────────────────

  private renderActions(): string {
    const groups = [...new Set(ACTION_DEFS.map(a => a.group))];
    const selCount = this.selectedActions.size;
    const hasSelection = selCount > 0;
    return `
      <div style="display:flex; flex-direction:column; gap:16px;">

        <!-- Toolbar header -->
        <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,68,68,0.2); border-radius:12px; padding:10px 15px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <button id="act-toggle-all" style="background:${hasSelection ? 'rgba(255,68,68,0.15)' : 'rgba(255,255,255,0.05)'}; border:1px solid ${hasSelection ? 'rgba(255,68,68,0.4)' : 'rgba(255,255,255,0.1)'}; color:${hasSelection ? '#ff8888' :'#aaa'}; border-radius:8px; padding:6px 12px; font-size:0.7rem; cursor:pointer; font-family:inherit; font-weight:800; transition:all 0.2s;">
            ${hasSelection ? '☑ ' + selCount + ' selecionada(s)' : '☐ Multi-seleção'}
          </button>
          ${hasSelection ? `
            <button id="act-sel-all" style="background:none; border:1px solid rgba(255,255,255,0.1); color:#888; border-radius:8px; padding:6px 10px; font-size:0.68rem; cursor:pointer; font-family:inherit;">Todas (${ACTION_DEFS.length})</button>
            <div style="flex:1;"></div>
            <button id="act-bulk-pick" style="background:rgba(212,175,55,0.12); border:1px solid rgba(212,175,55,0.35); color:#ffd700; border-radius:8px; padding:6px 14px; font-size:0.7rem; cursor:pointer; font-family:inherit; font-weight:800;">🎵 Atribuir</button>
            <button id="act-bulk-replace" style="background:rgba(81,197,255,0.08); border:1px solid rgba(81,197,255,0.25); color:#51c5ff; border-radius:8px; padding:6px 14px; font-size:0.7rem; cursor:pointer; font-family:inherit; font-weight:700;">🔄 Substituir</button>
            <button id="act-bulk-clear" style="background:rgba(255,100,100,0.08); border:1px solid rgba(255,100,100,0.25); color:#ff6464; border-radius:8px; padding:6px 12px; font-size:0.7rem; cursor:pointer; font-family:inherit; font-weight:700;">✕ Remover</button>
          ` : `<span style="font-size:0.65rem; color:#555;">Clique na caixa para ativar seleção múltipla e operar em lote</span>`}
        </div>

        <div style="background:rgba(255,68,68,0.08); border:1px solid rgba(255,68,68,0.2); border-radius:12px; padding:12px 15px; display:flex; gap:12px; align-items:center;">
          <div style="font-size:2rem;">🎮</div>
          <div>
            <div style="color:#ff8888; font-weight:900; font-size:0.85rem; letter-spacing:1px;">MANAGER DE AÇÕES</div>
            <div style="color:#888; font-size:0.7rem; margin-top:3px;">Associe sons a cada ação do jogo. Clique em "🎵 Escolher" para abrir a biblioteca.</div>
          </div>
        </div>

        ${groups.map(group => `
          <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.07); border-radius:12px; overflow:hidden;">
            <div style="padding:10px 15px; background:rgba(255,255,255,0.04); border-bottom:1px solid rgba(255,255,255,0.07); font-size:0.72rem; font-weight:900; color:#aaa; letter-spacing:2px; text-transform:uppercase;">
              ${group}
            </div>
            ${ACTION_DEFS.filter(a => a.group === group).map(action => {
              const assigned = this.config.actions[action.key] || '';
              const soundName = assigned ? (assigned.split('/').pop() || assigned) : '—';
              const selected = this.selectedActions.has(action.key);
              return `
                <div class="snd-action-row" data-tool-action="${action.key}" style="display:flex; align-items:center; gap:10px; padding:10px 15px; border-bottom:1px solid rgba(255,255,255,0.03); cursor:pointer; background:${selected ? 'rgba(81,197,255,0.07)' : 'transparent'}; border-left:3px solid ${selected ? '#51c5ff' : 'transparent'}; transition:all 0.12s;">
                  <div style="width:16px; height:16px; border:2px solid ${selected ? '#51c5ff' : 'rgba(255,255,255,0.15)'}; border-radius:3px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:${selected ? '#51c5ff' : 'transparent'}; transition:all 0.12s;">
                    ${selected ? '<span style="color:#000; font-size:0.55rem; font-weight:900;">✓</span>' : ''}
                  </div>
                  <div style="width:28px; text-align:center; font-size:1rem; flex-shrink:0;">${action.icon}</div>
                  <div style="flex:1; min-width:0;">
                    <div style="font-size:0.73rem; font-weight:700; color:#ddd;">${action.label}</div>
                    <div style="font-size:0.62rem; color:${assigned ? '#4cff88' : '#555'}; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                      ${assigned ? '🔊 ' + soundName : '⬜ Sem som atribuído'}
                    </div>
                  </div>
                  <div style="display:flex; gap:5px; flex-shrink:0;" onclick="event.stopPropagation()">
                    ${assigned ? `<button class="snd-btn-preview" data-url="${assigned}" style="background:rgba(76,255,136,0.08); border:1px solid rgba(76,255,136,0.2); color:#4cff88; border-radius:6px; padding:5px 8px; font-size:0.65rem; cursor:pointer; font-family:inherit;">▶</button>` : ''}
                    <button class="snd-btn-pick-action" data-action-key="${action.key}" style="background:rgba(212,175,55,0.1); border:1px solid rgba(212,175,55,0.3); color:#ffd700; border-radius:6px; padding:5px 10px; font-size:0.65rem; cursor:pointer; font-family:inherit; font-weight:700;">🎵</button>
                    ${assigned ? `<button class="snd-btn-clear-action" data-action-key="${action.key}" style="background:rgba(255,100,100,0.08); border:1px solid rgba(255,100,100,0.2); color:#ff6464; border-radius:6px; padding:5px 8px; font-size:0.65rem; cursor:pointer; font-family:inherit;">✕</button>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `).join('')}
      </div>
    `;
  }

  // ─── SCREENS ────────────────────────────────────────────────────────────

  private renderScreens(): string {
    const selCount = this.selectedScreens.size;
    const hasSelection = selCount > 0;
    return `
      <div style="display:flex; flex-direction:column; gap:16px;">

        <!-- Toolbar header -->
        <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(163,53,238,0.2); border-radius:12px; padding:10px 15px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <button id="scr-toggle-all" style="background:${hasSelection ? 'rgba(163,53,238,0.15)' : 'rgba(255,255,255,0.05)'}; border:1px solid ${hasSelection ? 'rgba(163,53,238,0.4)' : 'rgba(255,255,255,0.1)'}; color:${hasSelection ? '#a335ee' : '#aaa'}; border-radius:8px; padding:6px 12px; font-size:0.7rem; cursor:pointer; font-family:inherit; font-weight:800; transition:all 0.2s;">
            ${hasSelection ? '☑ ' + selCount + ' selecionada(s)' : '☐ Multi-seleção'}
          </button>
          ${hasSelection ? `
            <button id="scr-sel-all" style="background:none; border:1px solid rgba(255,255,255,0.1); color:#888; border-radius:8px; padding:6px 10px; font-size:0.68rem; cursor:pointer; font-family:inherit;">Todas (${SCREEN_DEFS.length})</button>
            <div style="flex:1;"></div>
            <button id="scr-bulk-pick" style="background:rgba(212,175,55,0.12); border:1px solid rgba(212,175,55,0.35); color:#ffd700; border-radius:8px; padding:6px 14px; font-size:0.7rem; cursor:pointer; font-family:inherit; font-weight:800;">🎵 Atribuir</button>
            <button id="scr-bulk-replace" style="background:rgba(81,197,255,0.08); border:1px solid rgba(81,197,255,0.25); color:#51c5ff; border-radius:8px; padding:6px 14px; font-size:0.7rem; cursor:pointer; font-family:inherit; font-weight:700;">🔄 Substituir</button>
            <button id="scr-bulk-clear" style="background:rgba(255,100,100,0.08); border:1px solid rgba(255,100,100,0.25); color:#ff6464; border-radius:8px; padding:6px 12px; font-size:0.7rem; cursor:pointer; font-family:inherit; font-weight:700;">✕ Remover</button>
          ` : `<span style="font-size:0.65rem; color:#555;">Clique na caixa para ativar seleção múltipla e operar em lote</span>`}
        </div>

        <div style="background:rgba(163,53,238,0.08); border:1px solid rgba(163,53,238,0.25); border-radius:12px; padding:12px 15px; display:flex; gap:12px; align-items:center;">
          <div style="font-size:2rem;">🎼</div>
          <div>
            <div style="color:#a335ee; font-weight:900; font-size:0.85rem; letter-spacing:1px;">AMBIENT POR TELA</div>
            <div style="color:#888; font-size:0.7rem; margin-top:3px;">Defina qual música toca em cada tela do jogo. Sons longos em loop recomendados.</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:12px;">
          ${SCREEN_DEFS.map(screen => {
            const assigned = this.config.screens[screen.key] || '';
            const soundName = assigned ? (assigned.split('/').pop() || assigned) : '';
            const selected = this.selectedScreens.has(screen.key);
            const isExpanded = this.expandedScreen === screen.key;
            const settings = (this.config.screenSettings || {})[screen.key] || { loop: true };
            const isLoop = settings.loop !== false;

            // Define which screens have internal events
            const internalEvents: Record<string, { key: string; label: string; icon: string }[]> = {
              'coin_flip': [
                { key: 'coin_start', label: 'Lancamento', icon: '🪙' },
                { key: 'coin_spin', label: 'Girando', icon: '🌪️' },
                { key: 'coin_win', label: 'Ganhou', icon: '✅' },
                { key: 'coin_lose', label: 'Perdeu', icon: '❌' },
              ],
              'vitoria': [
                { key: 'vitoria_fanfare', label: 'Fanfarra de Vitóra', icon: '🎺' },
                { key: 'moeda_coletar', label: 'Moedas Animadas', icon: '🪙' },
                { key: 'nivel_up', label: 'Subir Nível', icon: '🆙' }
              ],
              'derrota': [
                { key: 'derrota_sting', label: 'Impacto de Derrota', icon: '🎻' },
                { key: 'moeda_coletar', label: 'Moedas Animadas', icon: '🪙' },
                { key: 'batalha_desistencia', label: 'Desistência', icon: '🏳️' }
              ]
            };

            const screenEvents = internalEvents[screen.key] || [];

            return `
              <div style="background:rgba(0,0,0,0.35); border:1px solid ${isExpanded ? '#ffd700' : selected ? 'rgba(81,197,255,0.4)' : assigned ? 'rgba(163,53,238,0.4)' : 'rgba(255,255,255,0.07)'}; border-radius:12px; padding:15px; display:flex; flex-direction:column; gap:10px; transition:all 0.2s; cursor:pointer; position:relative;" class="snd-tool-screen-row" data-tool-screen="${screen.key}">
                
                <!-- Toggle Selection -->
                <div style="position:absolute; top:10px; right:10px; width:16px; height:16px; border:2px solid ${selected ? '#51c5ff' : 'rgba(255,255,255,0.15)'}; border-radius:3px; display:flex; align-items:center; justify-content:center; background:${selected ? '#51c5ff' : 'transparent'}; transition:all 0.12s;" class="snd-screen-checkbox">
                  ${selected ? '<span style="color:#000; font-size:0.55rem; font-weight:900;">✓</span>' : ''}
                </div>

                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="font-size:1.5rem;">${screen.icon}</div>
                  <div style="flex:1;">
                    <div style="font-size:0.8rem; font-weight:900; color:#fff;">${screen.label}</div>
                    <div style="font-size:0.65rem; color:#555; margin-top:2px;">key: <code style="color:#51c5ff">${screen.key}</code></div>
                  </div>
                </div>

                <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:rgba(255,255,255,0.04); border-radius:8px;">
                  <span style="font-size:0.7rem; color:${assigned ? '#a335ee' : '#555'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">
                    ${assigned ? '🔊 ' + soundName : '⬜ Sem som ambiente'}
                  </span>
                  
                  <!-- Looping Toggle -->
                  ${assigned ? `
                    <div style="display:flex; align-items:center; gap:6px; background:rgba(0,0,0,0.3); padding:4px 8px; border-radius:20px; border:1px solid rgba(255,255,255,0.08); flex-shrink:0;">
                       <span style="font-size:0.55rem; font-weight:900; color:${isLoop ? '#ffd700' : '#444'};">LOOP</span>
                       <div class="snd-screen-loop-toggle" data-key="${screen.key}" style="width:24px; height:12px; background:${isLoop ? '#ffd700' : 'rgba(255,255,255,0.1)'}; border-radius:10px; position:relative; cursor:pointer;">
                          <div style="position:absolute; top:2px; ${isLoop ? 'right:2px' : 'left:2px'}; width:8px; height:8px; border-radius:50%; background:#fff;"></div>
                       </div>
                    </div>
                  ` : ''}
                </div>

                <div style="display:flex; gap:6px;">
                  ${assigned ? `<button class="snd-btn-preview" data-url="${assigned}" style="flex:0.3; background:rgba(163,53,238,0.1); border:1px solid rgba(163,53,238,0.3); color:#a335ee; border-radius:8px; padding:7px; font-size:0.7rem; cursor:pointer; font-family:inherit;">▶</button>` : ''}
                  <button class="snd-btn-pick-screen" data-screen-key="${screen.key}" style="flex:1; background:rgba(212,175,55,0.1); border:1px solid rgba(212,175,55,0.3); color:#ffd700; border-radius:8px; padding:7px; font-size:0.7rem; cursor:pointer; font-family:inherit; font-weight:700;">🎵 Ambient</button>
                  ${assigned ? `<button class="snd-btn-clear-screen" data-screen-key="${screen.key}" style="flex:0.3; background:rgba(255,68,68,0.08); border:1px solid rgba(255,68,68,0.2); color:#ff4444; border-radius:8px; padding:7px; font-size:0.7rem; cursor:pointer; font-family:inherit;">✕</button>` : ''}
                </div>

                <!-- Internal Events Expander (for animation actions) -->
                ${screenEvents.length > 0 ? `
                  <div style="margin-top:5px;">
                     <button class="snd-btn-toggle-events" data-key="${screen.key}" style="width:100%; text-align:left; background:rgba(0,0,0,0.2); border:1px solid rgba(255,215,0,0.15); color:#ffd700; font-size:0.6rem; font-weight:800; padding:6px 10px; border-radius:8px; cursor:pointer; letter-spacing:1px; display:flex; justify-content:space-between; align-items:center;">
                        🎬 EVENTOS DE ANIMAÇÃO (${screenEvents.length})
                        <span>${isExpanded ? '▲' : '▼'}</span>
                     </button>
                     
                     ${isExpanded ? `
                        <div style="margin-top:8px; padding:8px; background:rgba(255,215,0,0.03); border:1px solid rgba(255,215,0,0.1); border-radius:8px; display:flex; flex-direction:column; gap:6px;">
                           ${screenEvents.map(evt => {
                             const evtAssigned = this.config.actions[evt.key] || '';
                             return `
                               <div style="display:flex; align-items:center; gap:8px;">
                                 <span style="font-size:0.8rem; width:20px;">${evt.icon}</span>
                                 <div style="flex:1; min-width:0;">
                                    <div style="font-size:0.6rem; font-weight:700; color:#aaa; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${evt.label}</div>
                                    <div style="font-size:0.5rem; color:${evtAssigned ? '#ffd700' : '#444'};">${evtAssigned ? evtAssigned.split('/').pop() : '—'}</div>
                                 </div>
                                 <button class="snd-btn-pick-action" data-action-key="${evt.key}" style="background:none; border:none; color:#ffd700; font-size:0.7rem; cursor:pointer;">🎵</button>
                               </div>
                             `;
                           }).join('')}
                        </div>
                     ` : ''}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>

        <!-- SONS DE TRANSIÇÃO -->
        <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,140,0,0.2); border-radius:12px; overflow:hidden;">
          <div style="padding:12px 16px; background:rgba(255,140,0,0.07); border-bottom:1px solid rgba(255,140,0,0.12); display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.2rem;">🎬</span>
            <div>
              <div style="font-size:0.78rem; font-weight:900; color:#ff8c00; letter-spacing:1px;">SONS DE TRANSIÇÃO</div>
              <div style="font-size:0.65rem; color:#666; margin-top:2px;">Som curto tocado ao mover de uma tela para outra (swoosh, stinger, etc.)</div>
            </div>
          </div>
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap:0; max-height:360px; overflow-y:auto;">
            ${TRANSITION_DEFS.map(tr => {
              const assigned = (this.config.transitions || {})[tr.key] || '';
              const soundName = assigned ? (assigned.split('/').pop() || assigned) : '';
              return `
                <div style="display:flex; align-items:center; gap:10px; padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.03); border-right:1px solid rgba(255,255,255,0.03);">
                  <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
                    <span style="font-size:1rem;">${tr.fromIcon}</span>
                    <span style="color:#ff8c00; font-size:0.8rem;">→</span>
                    <span style="font-size:1rem;">${tr.toIcon}</span>
                  </div>
                  <div style="flex:1; min-width:0;">
                    <div style="font-size:0.66rem; font-weight:700; color:#ccc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${tr.from} → ${tr.to}</div>
                    <div style="font-size:0.58rem; color:${assigned ? '#ff8c00' : '#444'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                      ${assigned ? '🔊 ' + soundName : '—'}
                    </div>
                  </div>
                  <div style="display:flex; gap:4px; flex-shrink:0;">
                    ${assigned ? `<button class="snd-btn-preview" data-url="${assigned}" style="background:rgba(255,140,0,0.1); border:1px solid rgba(255,140,0,0.2); color:#ff8c00; border-radius:6px; padding:4px 7px; font-size:0.62rem; cursor:pointer; font-family:inherit;">▶</button>` : ''}
                    <button class="snd-btn-pick-transition" data-tr-key="${tr.key}" style="background:rgba(212,175,55,0.1); border:1px solid rgba(212,175,55,0.3); color:#ffd700; border-radius:6px; padding:4px 8px; font-size:0.62rem; cursor:pointer; font-family:inherit; font-weight:700;">🎵</button>
                    ${assigned ? `<button class="snd-btn-clear-transition" data-tr-key="${tr.key}" style="background:rgba(255,68,68,0.08); border:1px solid rgba(255,68,68,0.2); color:#ff4444; border-radius:6px; padding:4px 6px; font-size:0.62rem; cursor:pointer; font-family:inherit;">✕</button>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;
  }

  // ─── SOUND PICKER MODAL ──────────────────────────────────────────────────

  public openSoundPicker(onSelect: (url: string) => void): void {
    const modal = document.createElement('div');
    modal.style.cssText = `position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:999999; display:flex; align-items:center; justify-content:center;`;
    modal.innerHTML = `
      <div style="background:#111; border:1px solid rgba(255,255,255,0.1); border-radius:20px; width:90%; max-width:680px; max-height:80vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.8);">
        <div style="padding:20px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between;">
          <div>
            <div style="font-size:1rem; font-weight:900; color:#ffd700; letter-spacing:2px;">🎵 ESCOLHER SOM</div>
            <div style="font-size:0.65rem; color:#666; margin-top:3px;">Clique em um som para selecionar. Use ▶ para ouvir.</div>
          </div>
          <button id="snd-picker-close" style="background:rgba(255,255,255,0.05); border:none; color:#888; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:1.2rem; display:flex; align-items:center; justify-content:center;">×</button>
        </div>
        <div style="padding:15px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:8px;">
          ${this.availableSounds.length === 0 ? `
            <div style="text-align:center; padding:40px; color:#555;">
              <div style="font-size:2.5rem; margin-bottom:10px;">🔇</div>
              <div>Nenhum som disponível. Importe arquivos do PC primeiro.</div>
            </div>
          ` : this.availableSounds.map(snd => {
            return `
              <div class="snd-picker-item" data-url="${snd.url}" style="display:flex; align-items:center; gap:10px; padding:10px 14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:10px; cursor:pointer; transition:all 0.15s;">
                <div style="font-size:1.2rem; width:30px; text-align:center;">🎵</div>
                <div style="flex:1; overflow:hidden;">
                  <div style="font-size:0.78rem; font-weight:700; color:#ddd; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${snd.name}</div>
                  <div style="font-size:0.62rem; color:#555;">${snd.url}</div>
                </div>
                <button class="snd-picker-preview" data-url="${snd.url}" style="background:rgba(76,255,136,0.08); border:1px solid rgba(76,255,136,0.2); color:#4cff88; border-radius:6px; padding:5px 10px; font-size:0.65rem; cursor:pointer; font-family:inherit; flex-shrink:0;">▶ OUVIR</button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#snd-picker-close')?.addEventListener('click', () => modal.remove());

    modal.querySelectorAll('.snd-picker-preview').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        SoundManager.preview((btn as HTMLElement).dataset.url!);
      });
    });

    modal.querySelectorAll('.snd-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        onSelect((item as HTMLElement).dataset.url!);
        modal.remove();
      });
    });
  }

  // ─── BIND EVENTS ────────────────────────────────────────────────────────

  public bind(container: HTMLElement, onRerender: () => void, onShowToast: (msg: string, color?: string) => void): void {

    // Sub-tab switching
    container.querySelectorAll('.snd-sub-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.subMode = (btn as HTMLElement).dataset.sndMode as SoundSubMode;
        onRerender();
      });
    });

    // Preview buttons
    container.querySelectorAll('.snd-btn-preview').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const url = (btn as HTMLElement).dataset.url!;
        SoundManager.preview(url);
      });
    });

    // Library item select toggle
    container.querySelectorAll('.snd-lib-item').forEach(item => {
      item.addEventListener('click', e => {
        if ((e.target as HTMLElement).closest('.snd-btn-preview') || (e.target as HTMLElement).closest('.snd-btn-delete-sound') || (e.target as HTMLElement).closest('.snd-input-rename') || (e.target as HTMLElement).closest('.snd-quick-link')) return;
        const url = (item as HTMLElement).dataset.sndUrl!;
        if (this.selectedSounds.has(url)) this.selectedSounds.delete(url);
        else this.selectedSounds.add(url);
        onRerender();
      });
    });

    // Rename sound in library
    container.querySelectorAll('.snd-input-rename').forEach(input => {
      input.addEventListener('change', () => {
        const url = (input as HTMLInputElement).dataset.url!;
        const newName = (input as HTMLInputElement).value;
        const entry = this.availableSounds.find(s => s.url === url);
        if (entry) {
          entry.name = newName;
          this.config.library = this.availableSounds;
          SoundManager.setConfig(this.config);
          onRerender();
        }
      });
    });

    // Quick Link Selector
    container.querySelectorAll('.snd-quick-link').forEach(sel => {
      sel.addEventListener('change', () => {
        const url = (sel as HTMLSelectElement).dataset.url!;
        const val = (sel as HTMLSelectElement).value;
        if (!val) return;

        const [type, key] = val.split(':');
        if (type === 'act') this.config.actions[key] = url;
        else if (type === 'scr') this.config.screens[key] = url;

        onShowToast(`✅ Vinculado a: ${key}`, '#4cff88');
        SoundManager.setConfig(this.config);
        onRerender();
      });
    });

    // Delete sound from library
    container.querySelectorAll('.snd-btn-delete-sound').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const url = (btn as HTMLElement).dataset.url!;
        try {
          await fetch('/api/delete-media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
          this.availableSounds = this.availableSounds.filter(s => s.url !== url);
          this.selectedSounds.delete(url);
          this.config.library = this.availableSounds;
          // Clear from all action/screen assignments
          Object.keys(this.config.actions).forEach(k => { if (this.config.actions[k] === url) this.config.actions[k] = ''; });
          Object.keys(this.config.screens).forEach(k => { if (this.config.screens[k] === url) this.config.screens[k] = ''; });
          onShowToast('✅ Som removido!', '#4cff88');
          onRerender();
        } catch {
          onShowToast('❌ Erro ao remover som', '#ff4444');
        }
      });
    });

    // Pick sound for an action
    container.querySelectorAll('.snd-btn-pick-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.actionKey!;
        this.openSoundPicker(url => {
          this.config.actions[key] = url;
          SoundManager.setConfig(this.config);
          onRerender();
        });
      });
    });

    // Clear action sound
    container.querySelectorAll('.snd-btn-clear-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.actionKey!;
        this.config.actions[key] = '';
        onRerender();
      });
    });

    // Pick sound for a screen
    container.querySelectorAll('.snd-btn-pick-screen').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.screenKey!;
        this.openSoundPicker(url => {
          this.config.screens[key] = url;
          SoundManager.setConfig(this.config);
          onRerender();
        });
      });
    });

    // Clear screen sound
    container.querySelectorAll('.snd-btn-clear-screen').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.screenKey!;
        this.config.screens[key] = '';
        onRerender();
      });
    });

    // Actions Toolbar
    document.getElementById('act-toggle-all')?.addEventListener('click', () => {
      if (this.selectedActions.size > 0) this.selectedActions.clear();
      else ACTION_DEFS.forEach(a => this.selectedActions.add(a.key));
      onRerender();
    });
    document.getElementById('act-sel-all')?.addEventListener('click', () => {
      ACTION_DEFS.forEach(a => this.selectedActions.add(a.key));
      onRerender();
    });
    document.getElementById('act-bulk-pick')?.addEventListener('click', () => {
      if (this.selectedActions.size === 0) return;
      this.openSoundPicker(url => {
        this.selectedActions.forEach(key => this.config.actions[key] = url);
        onShowToast(`✅ Som atribuído a ${this.selectedActions.size} ações!`, '#4cff88');
        SoundManager.setConfig(this.config);
        onRerender();
      });
    });
    document.getElementById('act-bulk-replace')?.addEventListener('click', () => {
      if (this.selectedActions.size === 0) return;
      this.openSoundPicker(url => {
        this.selectedActions.forEach(key => this.config.actions[key] = url);
        onShowToast(`🔄 Som substituído em ${this.selectedActions.size} ações!`, '#51c5ff');
        SoundManager.setConfig(this.config);
        onRerender();
      });
    });
    document.getElementById('act-bulk-clear')?.addEventListener('click', () => {
      const count = this.selectedActions.size;
      if (count === 0) return;
      this.selectedActions.forEach(key => this.config.actions[key] = '');
      onShowToast(`🗑️ Som removido de ${count} ações`, '#ff8800');
      onRerender();
    });

    // Screens Toolbar
    document.getElementById('scr-toggle-all')?.addEventListener('click', () => {
      if (this.selectedScreens.size > 0) this.selectedScreens.clear();
      else SCREEN_DEFS.forEach(s => this.selectedScreens.add(s.key));
      onRerender();
    });
    document.getElementById('scr-sel-all')?.addEventListener('click', () => {
      SCREEN_DEFS.forEach(s => this.selectedScreens.add(s.key));
      onRerender();
    });
    document.getElementById('scr-bulk-pick')?.addEventListener('click', () => {
      if (this.selectedScreens.size === 0) return;
      this.openSoundPicker(url => {
        this.selectedScreens.forEach(key => this.config.screens[key] = url);
        onShowToast(`✅ Som atribuído a ${this.selectedScreens.size} telas!`, '#4cff88');
        SoundManager.setConfig(this.config);
        onRerender();
      });
    });
    document.getElementById('scr-bulk-replace')?.addEventListener('click', () => {
      if (this.selectedScreens.size === 0) return;
      this.openSoundPicker(url => {
        this.selectedScreens.forEach(key => this.config.screens[key] = url);
        onShowToast(`🔄 Som substituído em ${this.selectedScreens.size} telas!`, '#51c5ff');
        SoundManager.setConfig(this.config);
        onRerender();
      });
    });
    document.getElementById('scr-bulk-clear')?.addEventListener('click', () => {
      const count = this.selectedScreens.size;
      if (count === 0) return;
      this.selectedScreens.forEach(key => this.config.screens[key] = '');
      onShowToast(`🗑️ Som removido de ${count} telas`, '#ff8800');
      onRerender();
    });

    // Transitions
    container.querySelectorAll('.snd-btn-pick-transition').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.trKey!;
        this.openSoundPicker(url => {
          if (!this.config.transitions) this.config.transitions = {};
          this.config.transitions[key] = url;
          SoundManager.setConfig(this.config);
          onRerender();
        });
      });
    });
    container.querySelectorAll('.snd-btn-clear-transition').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.trKey!;
        if (this.config.transitions) {
          this.config.transitions[key] = '';
          onRerender();
        }
      });
    });

    // Tools — row selection (Actions)
    container.querySelectorAll('.snd-action-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        const key = (row as HTMLElement).dataset.toolAction!;
        if (this.selectedActions.has(key)) this.selectedActions.delete(key);
        else this.selectedActions.add(key);
        onRerender();
      });
    });

    // Tools — row selection (Screens)
    container.querySelectorAll('.snd-tool-screen-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.snd-screen-loop-toggle')) return;
        const key = (row as HTMLElement).dataset.toolScreen!;
        if (this.selectedScreens.has(key)) this.selectedScreens.delete(key);
        else this.selectedScreens.add(key);
        onRerender();
      });
    });

    // Expand Internal Events
    container.querySelectorAll('.snd-btn-toggle-events').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = (btn as HTMLElement).dataset.key!;
        this.expandedScreen = (this.expandedScreen === key) ? null : key;
        onRerender();
      });
    });

    // Toggle Screen Loop
    container.querySelectorAll('.snd-screen-loop-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = (toggle as HTMLElement).dataset.key!;
        if (!this.config.screenSettings) this.config.screenSettings = {};
        if (!this.config.screenSettings[key]) this.config.screenSettings[key] = { loop: true };
        
        this.config.screenSettings[key].loop = !this.config.screenSettings[key].loop;
        SoundManager.setConfig(this.config);
        onRerender();
      });
    });

    // Import from PC
    const fileInput = document.getElementById('snd-file-input') as HTMLInputElement;
    document.getElementById('snd-btn-import')?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', async () => {
      if (!fileInput.files || fileInput.files.length === 0) return;
      onShowToast('Importando sons...', '#51c5ff');
      const results: SoundAsset[] = [];
      for (const file of Array.from(fileInput.files)) {
        const formData = new FormData();
        formData.append('media', file);
        try {
          const resp = await fetch('/api/upload-sound', { method: 'POST', body: formData });
          const json = await resp.json();
          if (json.success && json.url) {
            const newAsset = { url: json.url, name: file.name.split('.')[0] };
            results.push(newAsset);
            if (!this.availableSounds.find(s => s.url === json.url)) this.availableSounds.push(newAsset);
          }
        } catch (e) { console.error(e); }
      }
      if (results.length > 0) {
        onShowToast(`✅ ${results.length} son(s) importado(s)!`, '#4cff88');
        onRerender();
      } else {
        onShowToast('❌ Erro ao importar', '#ff4444');
      }
      fileInput.value = '';
    });

    // Save
    document.getElementById('snd-btn-save')?.addEventListener('click', async () => {
      const btn = document.getElementById('snd-btn-save') as HTMLButtonElement;
      btn.textContent = 'GRAVANDO...'; btn.disabled = true;
      try {
        const res = await fetch('/api/save-sounds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...this.config, library: this.availableSounds })
        });
        if (res.ok) {
          onShowToast('✅ Sons gravados no código!', '#ffd700');
          SoundManager.setConfig(this.config);
        } else throw new Error();
      } catch {
        onShowToast('❌ Falha ao gravar sons', '#ff4444');
      } finally {
        setTimeout(() => { btn.textContent = '💾 GRAVAR SONS NO CÓDIGO'; btn.disabled = false; }, 2000);
      }
    });
  }
}
