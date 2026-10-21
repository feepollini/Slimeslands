import { ProfileScreen } from '../screens/ProfileScreen';
import { SoundManager } from '../utils/SoundManager';
import { ProgressionManager } from '../../core/ProgressionManager';
import { t } from '../../core/i18n';

/**
 * ProfileScreenLandscape — Layout horizontal espaçoso de Perfil para Modo Paisagem (Mobile, Tablet e Web).
 */
export class ProfileScreenLandscape extends ProfileScreen {
  private onOpenSettingsLs?: () => void;

  constructor(onOpenSettings?: () => void, _onBackToHub?: () => void) {
    super(onOpenSettings);
    this.onOpenSettingsLs = onOpenSettings;
  }

  public override render(container: HTMLElement) {
    const playerData = ProgressionManager.getPlayerData();
    const userLevel = Math.max(1, playerData.level || 1);
    const nextXp = ProgressionManager.getNextLevelXpRequirement(playerData.level);
    const currentXp = playerData.xp || 0;
    const xpPct = Math.min(100, Math.max(8, Math.round((currentXp / Math.max(1, nextXp)) * 100)));

    container.innerHTML = `
      <div class="profile-screen profile-ls-screen">
        <div class="profile-ls-shell">
          <!-- CONTEÚDO HORIZONTAL ESPAÇOSO EM 2 COLUNAS -->
          <div class="profile-ls-grid">
            <!-- COLUNA ESQUERDA: AVATAR EM DESTAQUE, IDENTIDADE E PROGRESSÃO DE XP -->
            <div class="profile-ls-card profile-ls-identity-card">
              <div class="profile-ls-hero-row">
                <div class="prof-avatar-large profile-ls-avatar"></div>
                <div class="profile-ls-identity-info">
                  <div class="profile-ls-level-badge">${t('profile.level')} ${userLevel}</div>
                  <h2 class="profile-ls-name">${t('header.name')}</h2>
                  <span class="profile-ls-subtitle">MESTRE DE HESTRIDIA</span>
                </div>
              </div>

              <div class="profile-ls-xp-box">
                <div class="profile-ls-xp-header">
                  <span>${t('profile.exp')}</span>
                  <span>${currentXp} / ${nextXp} XP</span>
                </div>
                <div class="profile-ls-xp-track">
                  <div class="profile-ls-xp-fill" style="width: ${xpPct}%;"></div>
                </div>
              </div>
            </div>

            <!-- COLUNA DIREITA: ESTATÍSTICAS AMPLAS E BOTÕES DE AÇÃO -->
            <div class="profile-ls-right-col">
              <div class="profile-ls-stats-grid">
                <div class="profile-ls-stat-box">
                  <span class="profile-ls-stat-icon">⚔️</span>
                  <div class="profile-ls-stat-meta">
                    <span class="profile-ls-stat-val">12</span>
                    <span class="profile-ls-stat-lbl">${t('profile.wins')}</span>
                  </div>
                </div>
                <div class="profile-ls-stat-box">
                  <span class="profile-ls-stat-icon">🛡️</span>
                  <div class="profile-ls-stat-meta">
                    <span class="profile-ls-stat-val">4</span>
                    <span class="profile-ls-stat-lbl">${t('profile.losses')}</span>
                  </div>
                </div>
                <div class="profile-ls-stat-box">
                  <span class="profile-ls-stat-icon">🃏</span>
                  <div class="profile-ls-stat-meta">
                    <span class="profile-ls-stat-val">884</span>
                    <span class="profile-ls-stat-lbl">${t('profile.cards')}</span>
                  </div>
                </div>
                <div class="profile-ls-stat-box">
                  <span class="profile-ls-stat-icon">✨</span>
                  <div class="profile-ls-stat-meta">
                    <span class="profile-ls-stat-val">24</span>
                    <span class="profile-ls-stat-lbl">SKILLS</span>
                  </div>
                </div>
              </div>

              <div class="profile-ls-actions-row">
                <button id="btn-achievements" class="prof-ach-btn profile-ls-action-btn gold">
                  <span>🏆</span>
                  <span>${t('profile.trophies')}</span>
                </button>
                <button id="btn-prof-settings-row" class="prof-settings-row-btn profile-ls-action-btn dark">
                  <span>⚙️</span>
                  <span>${t('set.title')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindLandscapeEvents();
  }

  private bindLandscapeEvents() {
    document.getElementById('btn-achievements')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.5);
    });

    const handleSettings = () => {
      SoundManager.playAction('clique_configuracoes');
      this.onOpenSettingsLs?.();
    };

    document.getElementById('btn-prof-settings')?.addEventListener('click', handleSettings);
    document.getElementById('btn-prof-settings-row')?.addEventListener('click', handleSettings);
  }
}


