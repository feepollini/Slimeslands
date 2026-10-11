import './style.css';
import { gsap } from 'gsap';
import { t } from './core/i18n';

class StartApp {
  private container: HTMLElement;
  private entered = false;
  private splashDone = false;
  private dlSkip = false;

  constructor() {
    this.container = document.getElementById('start-root')!;
    void this.boot();
  }

  // 1o acesso: tela de download (video + barra real) que salva tudo no cache.
  // Depois dela, segue o fluxo normal (intro -> hub). Nunca trava o jogador.
  private async boot() {
    await this.ensurePreloaded();
    this.render();
    this.bind();
    gsap.fromTo(this.container, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    gsap.fromTo('.splash-line',
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.35, ease: 'power2.out', delay: 0.3 });
    setTimeout(() => this.dismissSplash(), 3400);
  }

  private async ensurePreloaded(): Promise<void> {
    let manifest: { version: number; files: string[] } | null = null;
    try {
      const res = await fetch('preload-manifest.json', { cache: 'no-cache' });
      if (res.ok) manifest = await res.json();
    } catch { /* sem rede/manifesto: segue p/ intro */ }
    if (!manifest || !manifest.files?.length) return;
    try {
      if (localStorage.getItem('wosw_preload_v') === String(manifest.version)) return;
    } catch { return; }
    this.renderDownload();
    const total = manifest.files.length;
    let done = 0;
    let cache: Cache | null = null;
    try { cache = await caches.open('wosw-v' + manifest.version); } catch { cache = null; }
    for (const url of manifest.files) {
      if (this.dlSkip) break;
      try {
        if (cache) await cache.add(url);
        else {
          const r = await fetch(url).catch(() => null);
          if (r) await r.arrayBuffer().catch(() => null);
        }
      } catch { /* item individual nao trava o resto */ }
      done++;
      this.paintDownload(done / total);
    }
    if (!this.dlSkip) {
      try { localStorage.setItem('wosw_preload_v', String(manifest.version)); } catch {}
    }
  }

  private renderDownload() {
    this.container.innerHTML = `
      <div id="dl-screen" style="position:relative; width:100%; height:100%; overflow:hidden; background:#000; cursor:pointer;">
        <video src="/videos/download_bg.mp4" autoplay muted loop playsinline preload="auto" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;"></video>
        <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.78) 100%);"></div>
        <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; padding:0 32px 12vh; box-sizing:border-box; gap:14px;">
          <div style="font-family:'Cinzel',serif; font-weight:900; font-size:1rem; letter-spacing:4px; text-indent:4px; color:#ffd76a; text-shadow:0 2px 0 #000;">DOWNLOADING</div>
          <div style="width:100%; max-width:380px; height:14px; border-radius:8px; background:rgba(0,0,0,0.65); border:2px solid #0e0903; overflow:hidden; box-shadow:0 2px 0 rgba(0,0,0,0.5);">
            <div id="dl-bar" style="width:0%; height:100%; background:linear-gradient(180deg,#ffe27a,#c78d12); transition:width 0.2s ease-out;"></div>
          </div>
          <div id="dl-pct" style="font-size:0.7rem; font-weight:900; letter-spacing:2px; color:#fff;">0%</div>
          <div style="font-size:0.6rem; letter-spacing:2px; color:rgba(255,255,255,0.4);">TOQUE PARA CONTINUAR</div>
        </div>
      </div>`;
    document.getElementById('dl-screen')?.addEventListener('click', () => { this.dlSkip = true; });
  }

  private paintDownload(frac: number) {
    const pct = Math.min(99, Math.round(frac * 100));
    const bar = document.getElementById('dl-bar');
    const label = document.getElementById('dl-pct');
    if (bar) bar.style.width = `${pct}%`;
    if (label) label.textContent = `${pct}%`;
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
