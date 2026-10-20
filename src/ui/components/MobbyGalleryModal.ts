import { gsap } from 'gsap';
import { MobbyManager } from '../../core/MobbyManager';
import { SKILL_POOL } from '../../core/constants';
import { SoundManager } from '../utils/SoundManager';

export class MobbyGalleryModal {

  public static render(): string {
    const mobbys = MobbyManager.getMobbys();

    return `
      <div id="mobby-gallery-overlay" class="mobby-gallery-overlay" style="
        position: fixed; inset: 0; background: rgba(5, 3, 8, 0.88); backdrop-filter: blur(14px);
        z-index: 9999; display: none; align-items: center; justify-content: center; padding: 20px;
        opacity: 0; user-select: none; font-family: 'Cinzel', 'Outfit', sans-serif;
      ">
        <div class="mobby-gallery-window" style="
          width: min(840px, 95vw); max-height: 88vh; background: linear-gradient(165deg, rgba(20, 15, 26, 0.98) 0%, rgba(10, 7, 14, 0.99) 100%);
          border: 2px solid rgba(255, 215, 0, 0.5); border-radius: 20px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(255, 215, 0, 0.2);
          display: flex; flex-direction: column; overflow: hidden; position: relative;
        ">
          <!-- CABEÇALHO -->
          <div style="padding: 16px 22px; border-bottom: 1px solid rgba(255, 215, 0, 0.25); display: flex; justify-content: space-between; align-items: center; background: rgba(0, 0, 0, 0.35);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.8rem;">👾</span>
              <div>
                <h2 style="margin: 0; font-family: 'Cinzel', serif; font-size: 1.25rem; font-weight: 900; color: #ffd700; letter-spacing: 2px;">
                  ENCONTROS DE MOBBYS (3x1)
                </h2>
                <div style="font-size: 0.72rem; color: #aaa; margin-top: 2px;">
                  Selecione um chefe criado e salvo na Forja v2 para enfrentar na arena
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 12px;">
              <button id="btn-gallery-go-forge" style="
                background: rgba(255, 215, 0, 0.15); border: 1px solid rgba(255, 215, 0, 0.5); border-radius: 8px;
                color: #ffd700; font-family: 'Cinzel', serif; font-size: 0.75rem; font-weight: 800; padding: 6px 14px;
                cursor: pointer; transition: 0.2s;
              ">🛠️ CRIAR NA FORJA</button>
              <button id="btn-close-mobby-gallery" style="
                background: none; border: none; color: #ff6b6b; font-size: 1.4rem; cursor: pointer; padding: 4px;
              " title="Fechar">✕</button>
            </div>
          </div>

          <!-- LISTA / GRID DE ENCONTROS -->
          <div class="mobby-gallery-grid" style="
            flex: 1; overflow-y: auto; padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 16px; box-sizing: border-box;
          ">
            ${mobbys.map(mob => {
              const artCount = mob.artifacts.filter(a => !!a).length;
              return `
                <div class="mobby-encounter-card" style="
                  background: linear-gradient(180deg, rgba(30, 22, 40, 0.7) 0%, rgba(14, 10, 20, 0.95) 100%);
                  border: 1px solid rgba(255, 215, 0, 0.35); border-radius: 14px; padding: 14px; display: flex;
                  flex-direction: column; gap: 10px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6); position: relative;
                  transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
                ">
                  <!-- SPRITE DO MOBBY -->
                  <div style="
                    width: 100%; height: 130px; border-radius: 10px; background: radial-gradient(circle, rgba(255, 215, 0, 0.12) 0%, rgba(0, 0, 0, 0.75) 75%);
                    border: 1px solid rgba(255, 215, 0, 0.2); display: flex; align-items: center; justify-content: center; overflow: hidden;
                  ">
                    <img src="${mob.image}" style="max-width: 85%; max-height: 85%; object-fit: contain; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.8));" />
                  </div>

                  <!-- IDENTIDADE -->
                  <div>
                    <div style="font-family: 'Cinzel', serif; font-size: 1rem; font-weight: 800; color: #fff8e7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${mob.name}
                    </div>
                    <div style="font-size: 0.68rem; color: #888; margin-top: 2px; line-height: 1.3; height: 32px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                      ${mob.description}
                    </div>
                  </div>

                  <!-- STATUS -->
                  <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0, 0, 0, 0.4); border-radius: 6px; padding: 6px 10px;">
                    <div style="font-size: 0.72rem; color: #ff6b6b; font-weight: 800;">❤️ ${mob.hp} HP</div>
                    <div style="font-size: 0.72rem; color: #feca57; font-weight: 800;">⚔️ ${mob.atk} ATK</div>
                    <div style="font-size: 0.72rem; color: #90e0ef; font-weight: 700;">🔮 ${artCount} Arts</div>
                  </div>

                  <!-- RECOMPENSA -->
                  <div style="font-size: 0.65rem; color: #ffd700; display: flex; align-items: center; gap: 4px;">
                    <span>🎴 Recompensa:</span>
                    <span style="color: #fff; font-weight: 700;">${mob.rewardCardId}</span>
                  </div>

                  <!-- BOTÃO BATALHAR -->
                  <button class="btn-start-mobby-fight" data-id="${mob.id}" style="
                    margin-top: 4px; background: linear-gradient(135deg, #ffd700 0%, #b8860b 100%); border: 1px solid #fff;
                    border-radius: 8px; color: #000; font-family: 'Cinzel', serif; font-size: 0.82rem; font-weight: 900;
                    padding: 9px 0; cursor: pointer; letter-spacing: 1.5px; transition: transform 0.15s, box-shadow 0.15s;
                    box-shadow: 0 4px 14px rgba(255, 215, 0, 0.35);
                  ">BATALHAR (3x1) ⚔️</button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  public static bind(root: HTMLElement): void {
    const overlay = root.querySelector('#mobby-gallery-overlay') as HTMLElement | null;
    const closeBtn = root.querySelector('#btn-close-mobby-gallery');
    const forgeBtn = root.querySelector('#btn-gallery-go-forge');

    const close = () => {
      if (!overlay) return;
      gsap.to(overlay, {
        opacity: 0, duration: 0.25, onComplete: () => {
          overlay.style.display = 'none';
        }
      });
    };

    closeBtn?.addEventListener('click', close);
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    forgeBtn?.addEventListener('click', () => {
      window.location.href = 'forge.html';
    });

    // Cliques para iniciar batalha
    root.querySelectorAll('.btn-start-mobby-fight').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id!;
        SoundManager.playAction('clique_geral', 0.6);
        gsap.to(document.body, {
          opacity: 0, duration: 0.3, onComplete: () => {
            window.location.href = `boss_battle.html?mobby=${encodeURIComponent(id)}`;
          }
        });
      });
    });
  }

  public static open(): void {
    let overlay = document.getElementById('mobby-gallery-overlay');
    if (!overlay) {
      const div = document.createElement('div');
      div.innerHTML = this.render();
      document.body.appendChild(div.firstElementChild!);
      overlay = document.getElementById('mobby-gallery-overlay');
      if (overlay) this.bind(document.body);
    } else {
      // Re-renderizar conteúdo para caso tenha mobbys novos
      const parent = overlay.parentElement;
      if (parent) {
        overlay.remove();
        const div = document.createElement('div');
        div.innerHTML = this.render();
        parent.appendChild(div.firstElementChild!);
        this.bind(document.body);
        overlay = document.getElementById('mobby-gallery-overlay');
      }
    }

    if (overlay) {
      overlay.style.display = 'flex';
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      const win = overlay.querySelector('.mobby-gallery-window');
      if (win) {
        gsap.fromTo(win, { scale: 0.9, y: 20 }, { scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.2)' });
      }
    }
  }
}
