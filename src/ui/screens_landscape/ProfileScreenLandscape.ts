import { ProfileScreen } from '../screens/ProfileScreen';
import { SoundManager } from '../utils/SoundManager';
import { ProgressionManager } from '../../core/ProgressionManager';
import { t } from '../../core/i18n';
import { renderOrnateWindowHtml, renderGoldDividerHHtml, renderGoldDividerVHtml } from '../components/OrnateFrameHtml';

/**
 * ProfileScreenLandscape — Janela Ornamentada Pearl & Gold (Screen04PerfilAcademiaAjustes.tsx) adaptada para Paisagem.
 */
export class ProfileScreenLandscape extends ProfileScreen {
  private onOpenSettingsLs?: () => void;
  private onBackToHubLs?: () => void;

  constructor(onOpenSettings?: () => void, onBackToHub?: () => void) {
    super(onOpenSettings);
    this.onOpenSettingsLs = onOpenSettings;
    this.onBackToHubLs = onBackToHub;
  }

  public override render(container: HTMLElement) {
    const playerData = ProgressionManager.getPlayerData();
    const userLevel = Math.max(1, playerData.level || 1);
    const nextXp = ProgressionManager.getNextLevelXpRequirement(playerData.level);
    const currentXp = playerData.xp || 50;
    const xpPct = Math.min(100, Math.max(12, Math.round((currentXp / Math.max(1, nextXp)) * 100)));

    const bodyHtml = `
      <div style="display:grid; grid-template-columns:repeat(12, minmax(0, 1fr)); gap:16px; align-items:stretch; height:100%;">
        <!-- Coluna Esquerda (6 cols): Avatar + Nome + Nível + EXP + Conquistas -->
        <div style="grid-column:span 6 / span 6; display:flex; flex-direction:column; justify-content:space-between; gap:10px;">
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="border-radius:9999px; padding:4px; border:1px solid #c9ab6c; background:#f7f1e3; flex-shrink:0;">
              <div style="width:98px; height:98px; border-radius:9999px; background:url('/cards/1.jpg') center/cover, linear-gradient(180deg, #d3d6da 0%, #c9cdd2 100%); border:1.5px solid #b5bac0; display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; overflow:hidden;">
                <span style="position:absolute; bottom:4px; background:rgba(9,27,46,0.78); color:#fff3c2; font-family:var(--font-display); font-size:8px; padding:1px 6px; border-radius:999px; letter-spacing:0.08em;">AVATAR</span>
              </div>
            </div>

            <div style="flex:1; display:flex; flex-direction:column; gap:7px; min-width:0;">
              <div>
                <span style="font-family:var(--font-display); font-size:10px; font-weight:600; letter-spacing:0.08em; color:#0c1e33; text-transform:uppercase; display:block; margin-bottom:2px;">
                  NOME DO JOGADOR
                </span>
                <div class="pearl-pill" style="border-radius:7px; padding:6px 10px; font-size:11px; letter-spacing:0.06em; color:#142230; text-transform:uppercase; font-weight:600;">
                  ${t('header.name')}
                </div>
              </div>

              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-family:var(--font-display); font-size:10px; font-weight:600; letter-spacing:0.08em; color:#0c1e33; text-transform:uppercase;">
                  ${t('profile.level')}
                </span>
                <div class="pearl-pill" style="border-radius:7px; padding:4px 12px; font-size:11px; letter-spacing:0.06em; color:#142230; text-transform:uppercase; font-weight:700;">
                  NV. ${userLevel}
                </div>
              </div>

              <div>
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:2px;">
                  <span style="font-family:var(--font-display); font-size:10px; font-weight:600; letter-spacing:0.08em; color:#0c1e33; text-transform:uppercase;">
                    EXP
                  </span>
                  <span style="font-family:var(--font-serif-num); font-size:10px; color:#2c4159; font-weight:700;">
                    ${currentXp} / ${nextXp}
                  </span>
                </div>
                <div style="width:100%; height:10px; border-radius:9999px; background:#c9cdd2; overflow:hidden; display:flex;">
                  <div style="width:${xpPct}%; height:100%; background:#062356; border-radius:9999px;"></div>
                </div>
              </div>
            </div>
          </div>

          ${renderGoldDividerHHtml('margin: 2px 0;')}

          <div class="pearl-subcard" style="border-radius:13px; padding:10px 12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <span style="font-family:var(--font-display); font-size:10.5px; font-weight:600; letter-spacing:0.08em; color:#0c1e33; text-transform:uppercase;">
                CONQUISTAS
              </span>
              <span style="font-family:var(--font-display); font-size:9.5px; letter-spacing:0.06em; color:#172536; text-transform:uppercase;">
                VER TODAS ›
              </span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:6px;">
              ${['🏆', '⚔️', '🛡️', '💎', '👑']
                .map(
                  (ico, idx) => `
                <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
                  <div class="wire-slot" style="width:44px; height:44px; border-radius:9999px; display:flex; align-items:center; justify-content:center; font-size:15px;">
                    ${idx < 3 ? ico : '<span style="font-size:18px; color:#646b73; font-weight:300;">+</span>'}
                  </div>
                  <span style="font-family:var(--font-display); font-size:7.5px; letter-spacing:0.06em; color:#172536; text-transform:uppercase;">
                    INSÍGNIA
                  </span>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </div>

        <!-- Coluna Direita (6 cols): Divisor + 2x2 Stats + Botões -->
        <div style="grid-column:span 6 / span 6; display:flex; align-items:stretch; gap:12px;">
          ${renderGoldDividerVHtml('margin: 0 2px;')}
          <div style="flex:1; display:flex; flex-direction:column; justify-content:space-between; gap:10px;">
            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:9px; flex:1;">
              ${[
                { label: t('profile.wins') || 'VITÓRIAS', val: '12' },
                { label: t('profile.losses') || 'DERROTAS', val: '4' },
                { label: t('profile.cards') || 'CARTAS', val: '884' },
                { label: 'ARTEFATOS', val: '24' },
              ]
                .map(
                  (st) => `
                <div class="pearl-subcard" style="border-radius:11px; padding:10px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;">
                  <span style="font-family:var(--font-display); font-size:10px; font-weight:600; letter-spacing:0.08em; color:#0c1e33; text-transform:uppercase;">
                    ${st.label}
                  </span>
                  <div class="wire-slot" style="width:100%; padding:6px 0; border-radius:6px; font-family:var(--font-serif-num); font-size:15px; font-weight:700; color:#142230; text-align:center;">
                    ${st.val}
                  </div>
                </div>
              `
                )
                .join('')}
            </div>

            ${renderGoldDividerHHtml('margin: 2px 0;')}

            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:10px;">
              <button type="button" id="btn-achievements" class="btn-royal-gold">
                <div class="btn-royal-inner" style="padding:10px; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; display:flex; align-items:center; justify-content:center;">
                  CONQUISTAS
                </div>
              </button>
              <button type="button" id="btn-prof-settings-row" class="btn-pearl-gold">
                <div class="btn-pearl-inner" style="padding:10px; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; display:flex; align-items:center; justify-content:center;">
                  CONFIGURAÇÕES
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = `
      <div class="profile-screen profile-ls-screen navy-backdrop" style="height:100%; width:100%; display:flex; align-items:center; justify-content:center; padding:8px 20px 68px; box-sizing:border-box; overflow:hidden;">
        ${renderOrnateWindowHtml({
          title: 'PERFIL',
          closeBtnId: 'btn-prof-close-ls',
          compactHeader: true,
          bodyHtml,
          containerStyle: 'width:100%; max-width:860px; max-height:100%;',
          bodyStyle: 'padding:12px 18px 16px; overflow-y:auto;',
        })}
      </div>
    `;

    this.bindLandscapeEvents();
  }

  private bindLandscapeEvents() {
    document.getElementById('btn-achievements')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.5);
    });

    document.getElementById('btn-prof-settings-row')?.addEventListener('click', () => {
      SoundManager.playAction('clique_configuracoes');
      this.onOpenSettingsLs?.();
    });

    document.getElementById('btn-prof-close-ls')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.5);
      if (this.onBackToHubLs) this.onBackToHubLs();
      else this.onOpenSettingsLs?.();
    });
  }
}
