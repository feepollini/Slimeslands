import './style.css';
import { gsap } from 'gsap';
import { t } from './core/i18n';

class StartApp {
  private container: HTMLElement;
  private entered = false;
  private splashDone = false;

  constructor() {
    this.container = document.getElementById('start-root')!;
    this.render();
    this.bind();
    gsap.fromTo(this.container, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    gsap.fromTo('.splash-line',
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.35, ease: 'power2.out', delay: 0.3 });
    setTimeout(() => this.dismissSplash(), 3400);
  }

  private render() {
    this.container.innerHTML = `
      <div style="position:relative; width:100%; height:100%; overflow:hidden; background:#000;">
        <!-- INTRO: so o video (paisagem) contido no meio da tela; resto preto (retrato) -->
        <div id="intro-stage" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; cursor:pointer; background:#000;">
          <video id="intro-video" src="/videos/intro.mp4" muted playsinline preload="auto"
            style="width:100%; height:100%; object-fit:contain;"></video>
          <div id="intro-fade" style="position:absolute; inset:0; background:#000; opacity:0; transition:opacity 1s linear; pointer-events:none;"></div>
        </div>

        <!-- PRE-INTRO: creditos -->
        <div id="splash-credits" style="position:absolute; inset:0; z-index:50; background:#000; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; cursor:pointer; text-align:center; padding:0 24px; box-sizing:border-box;">
          <div class="splash-line" style="font-family:'Cinzel',serif; font-weight:700; font-size:0.85rem; letter-spacing:6px; text-indent:6px; color:rgba(255,255,255,0.88); text-shadow:0 2px 0 #000;">${t('start.madeBy')}</div>
          <div class="splash-line" style="font-family:'Cinzel',serif; font-size:0.65rem; letter-spacing:5px; text-indent:5px; color:#d4af37;">${t('start.by')}</div>
          <div class="splash-line" style="font-family:'Great Vibes',cursive; font-size:3.2rem; line-height:1.1; color:#ffd76a; text-shadow:0 0 26px rgba(212,175,55,0.45), 0 3px 0 #000;">Felipe Pollini</div>
          <div class="splash-line" style="position:absolute; bottom:6vh; font-size:0.6rem; letter-spacing:3px; color:rgba(255,255,255,0.35);">${t('start.tap')}</div>
        </div>
      </div>
    `;
  }

  private dismissSplash() {
    if (this.splashDone) return;
    this.splashDone = true;
    const splash = document.getElementById('splash-credits');
    const video = document.getElementById('intro-video') as HTMLVideoElement | null;
    // Comeca o video junto da transicao p/ a intro ja abrir tocando
    if (video) { try { video.play().catch(() => {}); } catch (e) { console.warn('Intro autoplay bloqueado', e); } }
    if (!splash) return;
    gsap.to(splash, {
      opacity: 0,
      duration: 0.5,
      ease: 'power1.inOut',
      onComplete: () => splash.remove()
    });
  }

  private enter() {
    if (this.entered) return;
    this.entered = true;
    gsap.to(this.container, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => { window.location.href = 'hub.html'; }
    });
  }

  private bind() {
    const video = document.getElementById('intro-video') as HTMLVideoElement;
    const stage = document.getElementById('intro-stage')!;
    const fade = document.getElementById('intro-fade')!;

    document.getElementById('splash-credits')?.addEventListener('click', () => this.dismissSplash());

    // Faltando 1s p/ acabar: escurece p/ transicao suave (sem corte no claro)
    let fading = false;
    video.addEventListener('timeupdate', () => {
      if (fading || !video.duration || isNaN(video.duration)) return;
      if (video.duration - video.currentTime <= 1) {
        fading = true;
        fade.style.opacity = '1';
      }
    });

    // Fim do video -> lobby direto (sem loop, sem corte)
    video.addEventListener('ended', () => this.enter());
    // Qualquer clique/toque na intro -> lobby direto
    stage.addEventListener('click', () => this.enter());
    window.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') this.enter(); });
    // Se o video falhar, nao prende o jogador numa tela preta
    video.addEventListener('error', () => this.enter());
  }
}

new StartApp();
