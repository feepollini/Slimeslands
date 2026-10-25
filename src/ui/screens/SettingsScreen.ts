import { SoundManager } from '../utils/SoundManager';
import { t, getLang, setLang, getSkipIntro, setSkipIntro, LANGS, Lang } from '../../core/i18n';
import { renderOrnateWindowHtml, renderGoldDividerHHtml } from '../components/OrnateFrameHtml';

export class SettingsScreen {
  private onOpenForjaV2: () => void;
  private onBack?: () => void;
  private activeTab: 'AUDIO' | 'IDIOMA' | 'GRAFICOS' = 'AUDIO';
  private particulas = true;
  private holografia = true;
  private sombras = true;

  constructor(onOpenForjaV2: () => void, onBack?: () => void) {
    this.onOpenForjaV2 = onOpenForjaV2;
    this.onBack = onBack;
  }

  public render(container: HTMLElement) {
    const volSfx = Math.round(SoundManager.sfxVolume * 100);
    const volAmbient = Math.round(SoundManager.ambientVolume * 100);
    const volGeneral = Math.round((volSfx + volAmbient) / 2);

    const bodyHtml = `
      <!-- 3 Segmented Tabs: ÁUDIO | IDIOMA | GRÁFICOS (Fiel a Screen04PerfilAcademiaAjustes.tsx) -->
      <div class="pearl-pill" style="border-radius:9999px; padding:2px; display:grid; grid-template-columns:repeat(3, 1fr);">
        ${(['AUDIO', 'IDIOMA', 'GRAFICOS'] as const)
          .map((tab) => {
            const label = tab === 'AUDIO' ? 'ÁUDIO' : tab === 'IDIOMA' ? 'IDIOMA' : 'GRÁFICOS';
            const isSel = this.activeTab === tab;
            return isSel
              ? `<button type="button" class="btn-royal-gold set-tab-btn" data-tab="${tab}">
                   <div class="btn-royal-inner" style="padding:7px 8px; font-size:10.5px; display:flex; align-items:center; justify-content:center;">${label}</div>
                 </button>`
              : `<button type="button" class="set-tab-btn" data-tab="${tab}" style="background:transparent; border:none; padding:7px 8px; font-family:var(--font-display); font-size:10.5px; letter-spacing:0.06em; color:#142230; text-transform:uppercase; cursor:pointer;">
                   ${label}
                 </button>`;
          })
          .join('')}
      </div>

      <!-- Audio Sliders Card -->
      <div class="pearl-subcard" style="border-radius:13px; padding:12px 14px; display:flex; flex-direction:column; gap:12px;">
        ${[
          { id: 'general', label: 'GERAL', val: volGeneral },
          { id: 'ambient', label: 'MÚSICA', val: volAmbient },
          { id: 'sfx', label: 'EFEITOS', val: volSfx },
        ]
          .map(
            (row) => `
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-family:var(--font-display); font-size:10.5px; font-weight:600; letter-spacing:0.08em; color:#0c1e33; text-transform:uppercase; width:64px;">
              ${row.label}
            </span>
            <svg viewBox="0 0 24 24" style="width:15px; height:15px; color:#091e3a; flex-shrink:0;" fill="currentColor">
              <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07l1.41 1.41a7 7 0 000-9.9l-1.41 1.42z" />
            </svg>
            <input
              type="range"
              id="slider-${row.id}"
              min="0"
              max="100"
              value="${row.val}"
              class="nova-v12-range"
              style="flex:1;"
            />
            <span id="val-${row.id}" style="font-family:var(--font-serif-num); font-size:11px; font-weight:700; color:#0c1e33; width:32px; text-align:right;">
              ${row.val}%
            </span>
          </div>
        `
          )
          .join('')}
      </div>

      ${renderGoldDividerHHtml('margin: 2px 0;')}

      <!-- IDIOMA Section -->
      <div class="pearl-subcard" style="border-radius:13px; padding:10px 12px; display:flex; flex-direction:column; gap:8px;">
        <span style="font-family:var(--font-display); font-size:10.5px; font-weight:600; letter-spacing:0.08em; color:#0c1e33; text-transform:uppercase;">
          IDIOMA
        </span>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px;">
          ${LANGS.map((l) => {
            const active = getLang() === l.id;
            const label = l.id === 'pt' ? 'Português' : l.id === 'en' ? 'English' : 'Español';
            return active
              ? `<button type="button" class="lang-opt btn-royal-gold" data-lang="${l.id}">
                   <div class="btn-royal-inner" style="padding:6px 8px; font-size:10px; display:flex; align-items:center; justify-content:center;">${label}</div>
                 </button>`
              : `<button type="button" class="lang-opt pearl-pill" data-lang="${l.id}" style="border-radius:9999px; padding:6px 8px; font-size:10px; color:#142230; cursor:pointer;">
                   ${label}
                 </button>`;
          }).join('')}
        </div>
      </div>

      ${renderGoldDividerHHtml('margin: 2px 0;')}

      <!-- GRÁFICOS & PREFERÊNCIAS Section -->
      <div class="pearl-subcard" style="border-radius:13px; padding:11px 14px; display:flex; flex-direction:column; gap:8px;">
        <span style="font-family:var(--font-display); font-size:10.5px; font-weight:600; letter-spacing:0.08em; color:#0c1e33; text-transform:uppercase;">
          GRÁFICOS
        </span>

        ${[
          { id: 'particulas', label: 'PARTÍCULAS', val: this.particulas },
          { id: 'holografia', label: 'HOLOGRAFIA', val: this.holografia },
          { id: 'sombras', label: 'SOMBRAS', val: this.sombras },
          { id: 'skip-intro', label: t('set.skip') || 'PULAR INTRO', val: getSkipIntro() },
        ]
          .map(
            (tog) => `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:2px 0; border-bottom:1px solid rgba(229,216,190,0.6);">
            <span style="font-family:var(--font-display); font-size:10px; letter-spacing:0.06em; color:#142230; text-transform:uppercase;">
              ${tog.label}
            </span>
            <button
              type="button"
              class="gfx-toggle-btn"
              data-toggle="${tog.id}"
              style="width:40px; height:20px; border-radius:9999px; padding:2px; border:none; cursor:pointer; transition:background 0.2s; background:${
                tog.val ? '#062356' : '#989ea6'
              }; display:flex; align-items:center; justify-content:${tog.val ? 'flex-end' : 'flex-start'};"
            >
              <div style="width:16px; height:16px; border-radius:9999px; background:#ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
            </button>
          </div>
        `
          )
          .join('')}

        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding-top:4px;">
          <span style="font-family:var(--font-display); font-size:10px; letter-spacing:0.06em; color:#142230; text-transform:uppercase;">
            QUALIDADE
          </span>
          <div class="pearl-pill" style="border-radius:8px; padding:5px 12px; flex:1; display:flex; align-items:center; justify-content:space-between; font-size:11px; color:#142230;">
            <span>Ultra (60 FPS)</span>
            <span>⌄</span>
          </div>
        </div>
      </div>

      <!-- Bottom Buttons: APLICAR | RESTAURAR PADRÕES + FORJA V2 -->
      <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; padding-top:2px;">
        <button type="button" id="btn-settings-apply" class="btn-royal-gold">
          <div class="btn-royal-inner" style="padding:9px 10px; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; display:flex; align-items:center; justify-content:center;">
            APLICAR
          </div>
        </button>
        <button type="button" id="btn-settings-reset" class="btn-pearl-gold">
          <div class="btn-pearl-inner" style="padding:9px 10px; font-size:10px; letter-spacing:0.08em; text-transform:uppercase; display:flex; align-items:center; justify-content:center;">
            RESTAURAR PADRÕES
          </div>
        </button>
      </div>

      <button type="button" id="btn-open-forja-v2" class="btn-pearl-gold" style="width:100%;">
        <div class="btn-pearl-inner" style="padding:7px 12px; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; display:flex; align-items:center; justify-content:center; gap:6px;">
          <span>⚒️</span>
          <span>ABRIR FORJA V2 & ESTÚDIO</span>
        </div>
      </button>

      <style>
        .nova-v12-range {
          -webkit-appearance: none;
          height: 10px;
          border-radius: 9999px;
          background: #c9cdd2;
          outline: none;
        }
        .nova-v12-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: #fbf6ea;
          border: 2px solid #c89838;
          box-shadow: 0 2px 5px rgba(0,0,0,0.35);
          cursor: pointer;
        }
      </style>
    `;

    container.innerHTML = `
      <div class="settings-screen navy-backdrop" style="height:100%; width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:12px 14px 86px; box-sizing:border-box; overflow-y:auto;">
        ${renderOrnateWindowHtml({
          title: 'AJUSTES',
          closeBtnId: 'btn-settings-back',
          bodyHtml,
          containerStyle: 'width:100%; max-width:440px;',
          bodyStyle: 'padding:12px 18px 18px; gap:10px; justify-content:space-between;',
        })}
      </div>
    `;

    this.bind(container);
  }

  private bind(container: HTMLElement) {
    const sliderGeneral = document.getElementById('slider-general') as HTMLInputElement | null;
    const sliderSfx = document.getElementById('slider-sfx') as HTMLInputElement | null;
    const sliderAmbient = document.getElementById('slider-ambient') as HTMLInputElement | null;
    const valGeneral = document.getElementById('val-general');
    const valSfx = document.getElementById('val-sfx');
    const valAmbient = document.getElementById('val-ambient');

    const updateVolumes = () => {
      const sfx = (parseInt(sliderSfx?.value || '70', 10) || 0) / 100;
      const ambient = (parseInt(sliderAmbient?.value || '70', 10) || 0) / 100;
      SoundManager.setVolume(sfx, ambient);
      if (valSfx && sliderSfx) valSfx.textContent = `${sliderSfx.value}%`;
      if (valAmbient && sliderAmbient) valAmbient.textContent = `${sliderAmbient.value}%`;
      const avg = Math.round(((sfx + ambient) / 2) * 100);
      if (sliderGeneral) sliderGeneral.value = String(avg);
      if (valGeneral) valGeneral.textContent = `${avg}%`;
    };

    sliderGeneral?.addEventListener('input', () => {
      const v = sliderGeneral.value;
      if (sliderSfx) sliderSfx.value = v;
      if (sliderAmbient) sliderAmbient.value = v;
      updateVolumes();
    });
    sliderSfx?.addEventListener('input', updateVolumes);
    sliderAmbient?.addEventListener('input', updateVolumes);

    document.querySelectorAll('.set-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        SoundManager.playAction('clique_geral', 0.45);
        this.activeTab = ((btn as HTMLElement).dataset.tab as any) || 'AUDIO';
        this.render(container);
      });
    });

    document.querySelectorAll('.gfx-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        SoundManager.playAction('clique_geral', 0.45);
        const key = (btn as HTMLElement).dataset.toggle;
        if (key === 'particulas') this.particulas = !this.particulas;
        else if (key === 'holografia') this.holografia = !this.holografia;
        else if (key === 'sombras') this.sombras = !this.sombras;
        else if (key === 'skip-intro') setSkipIntro(!getSkipIntro());
        this.render(container);
      });
    });

    document.getElementById('btn-settings-back')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.5);
      this.onBack?.();
    });

    document.getElementById('btn-settings-apply')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.55);
      this.onBack?.();
    });

    document.getElementById('btn-settings-reset')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.5);
      SoundManager.setVolume(0.7, 0.7);
      this.particulas = true;
      this.holografia = true;
      this.sombras = true;
      this.render(container);
    });

    document.getElementById('btn-open-forja-v2')?.addEventListener('click', () => {
      SoundManager.playAction('clique_geral', 0.6);
      this.onOpenForjaV2();
    });

    document.querySelectorAll('.lang-opt').forEach((btn: Element) => {
      btn.addEventListener('click', () => {
        SoundManager.playAction('clique_geral', 0.5);
        setLang((btn as HTMLElement).dataset.lang as Lang);
        window.location.href = 'hub.html';
      });
    });
  }
}
