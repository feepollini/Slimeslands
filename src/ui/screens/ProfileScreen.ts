import { SoundManager } from '../utils/SoundManager';
import { ProgressionManager } from '../../core/ProgressionManager';
import { t } from '../../core/i18n';
import { renderOrnateWindowHtml, renderGoldDividerHHtml } from '../components/OrnateFrameHtml';

export class ProfileScreen {
  private onOpenSettings?: () => void;

  constructor(onOpenSettings?: () => void) {
    this.onOpenSettings = onOpenSettings;
  }

  public render(container: HTMLElement) {
    const playerData = ProgressionManager.getPlayerData();
    const userLevel = Math.max(1, playerData.level || 1);
    const nextXp = ProgressionManager.getNextLevelXpRequirement(playerData.level);
    const currentXp = playerData.xp || 50;
    const xpPct = Math.min(100, Math.max(12, Math.round((currentXp / Math.max(1, nextXp)) * 100)));

    const bodyHtml = `
      <!-- Top Avatar + Player Info (Fiel a Screen04PerfilAcademiaAjustes.tsx) -->
      <div style="display:flex; align-items:center; gap:14px;">
        <div style="border-radius:9999px; padding:4px; border:1px solid #c9ab6c; background:#f7f1e3; flex-shrink:0;">
          <div style="width:96px; height:96px; border-radius:9999px; background:url('/cards/1.jpg') center/cover, linear-gradient(180deg, #d3d6da 0%, #c9cdd2 100%); border:1.5px solid #b5bac0; display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; overflow:hidden; box-shadow:inset 0 1px 2px rgba(255,255,255,0.45);">
            <span style="position:absolute; bottom:4px; background:rgba(9,27,46,0.78); color:#fff3c2; font-family:var(--font-display); font-size:8px; padding:1px 6px; border-radius:999px; letter-spacing:0.08em;">AVATAR</span>
          </div>
        </div>

        <div style="flex:1; display:flex; flex-direction:column; gap:8px; min-width:0;">
          <div>
            <span style="font-family:var(--font-display); font-size:10px; font-weight:600; letter-spacing:0.08em; color:#0c1e33; text-transform:uppercase; display:block; margin-bottom:3px;">
              NOME DO JOGADOR
            </span>
            <div class="pearl-pill" style="border-radius:7px; padding:6px 10px; font-size:11px; letter-spacing:0.06em; color:#142230; text-transform:uppercase; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${t('header.name')}
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-family:var(--font-display); font-size:10px; font-weight:600; letter-spacing:0.08em; color:#0c1e33; text-transform:uppercase;">
              ${t('profile.level')}
            </span>
            <div class="pearl-pill" style="border-radius:7px; padding:4px 14px; font-size:11px; letter-spacing:0.06em; color:#142230; text-transform:uppercase; font-weight:700;">
              NV. ${userLevel}
            </div>
          </div>

          <div>
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:3px;">
              <span style="font-family:var(--font-display); font-size:10px; font-weight:600; letter-spacing:0.08em; color:#0c1e33; text-transform:uppercase;">
                EXP
              </span>
              <span style="font-family:var(--font-serif-num); font-size:10px; color:#2c4159; font-weight:700;">
                ${currentXp} / ${nextXp}
              </span>
            </div>
            <div style="width:100%; height:11px; border-radius:9999px; background:#c9cdd2; overflow:hidden; display:flex;">
              <div style="width:${xpPct}%; height:100%; background:#062356; border-radius:9999px;"></div>
            </div>
          </div>
        </div>
      </div>

      ${renderGoldDividerHHtml('margin: 4px 0;')}

      <!-- 2x2 Stats Cards Grid -->
      <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:9px;">
        ${[
          { label: t('profile.wins') || 'VITÓRIAS', val: '12' },
          { label: t('profile.losses') || 'DERROTAS', val: '4' },
          { label: t('profile.cards') || 'CARTAS', val: '884' },
          { label: 'ARTEFATOS', val: '24' },
        ]
          .map(
            (st) => `
          <div class="pearl-subcard" style="border-radius:11px; padding:9px 10px; display:flex; flex-direction:column; align-items:center; gap:6px;">
            <span style="font-family:var(--font-display); font-size:10px; font-weight:600; letter-spacing:0.08em; color:#0c1e33; text-transform:uppercase;">
              ${st.label}
            </span>
            <div class="wire-slot" style="width:100%; padding:5px 0; border-radius:6px; font-family:var(--font-serif-num); font-size:14px; font-weight:700; color:#142230; text-align:center;">
              ${st.val}
            </div>
          </div>
        `
          )
          .join('')}
      </div>

      ${renderGoldDividerHHtml('margin: 4px 0;')}

      <!-- 2 Buttons Row: CONQUISTAS | CONFIGURAÇÕES -->
      <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:10px;">
        <button type="button" id="btn-achievements" class="btn-royal-gold">
          <div class="btn-royal-inner" style="padding:9px 10px; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; display:flex; align-items:center; justify-content:center;">
            CONQUISTAS
          </div>
        </button>
        <button type="button" id="btn-prof-settings-row" class="btn-pearl-gold">
          <div class="btn-pearl-inner" style="padding:9px 10px; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; display:flex; align-items:center; justify-content:center;">
            CONFIGURAÇÕES
          </div>
        </button>
      </div>

      <!-- Bottom CONQUISTAS Insignia Box -->
      <div class="pearl-subcard" style="border-radius:13px; padding:10px 12px; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <span style="font-family:var(--font-display); font-size:10.5px; font-weight:600; letter-spacing:0.08em; color:#0c1e33; text-transform:uppercase;">
            CONQUISTAS
          </span>
          <button type="button" id="btn-view-all-insignias" style="background:none; border:none; font-family:var(--font-display); font-size:9.5px; letter-spacing:0.06em; color:#172536; text-transform:uppercase; display:flex; align-items:center; gap:4px; cursor:pointer;">
            <span>VER TODAS</span>
            <span>›</span>
          </button>
        </div>

        <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:6px;">
          ${['🏆', '⚔️', '🛡️', '💎', '👑']
            .map(
              (ico, idx) => `
            <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
              <div class="wire-slot" style="width:46px; height:46px; border-radius:9999px; display:flex; align-items:center; justify-content:center; font-size:16px;">
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
    `;

    container.innerHTML = `
      <div class="profile-screen navy-backdrop" style="height:100%; width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:12px 14px 86px; box-sizing:border-box; overflow-y:auto;">
        ${renderOrnateWindowHtml({
          title: 'PERFIL',
          closeBtnId: 'btn-prof-settings',
          bodyHtml,
          containerStyle: 'width:100%; max-width:440px;',
          bodyStyle: 'padding:12px 18px 18px; gap:10px; justify-content:space-between;',
        })}
      </div>
    `;

    this.bind();
  }

  protected bind() {
    document.getElementById('btn-achievements')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.5);
    });

    const handleSettings = () => {
      SoundManager.playAction('clique_configuracoes');
      this.onOpenSettings?.();
    };

    document.getElementById('btn-prof-settings')?.addEventListener('click', handleSettings);
    document.getElementById('btn-prof-settings-row')?.addEventListener('click', handleSettings);
  }
}
