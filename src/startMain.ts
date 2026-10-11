import './style.css';
import { gsap } from 'gsap';
import { t } from './core/i18n';
import { autoFullscreen } from './ui/utils/fullscreen';

type PreloadFile = { u: string; s: number; h: string };
type PreloadManifest = { version: number; files: PreloadFile[] };
type PreloadSaved = { v: number; m: Record<string, string> };
const PRELOAD_MAP_KEY = 'wosw_preload_map';

function readSavedMap(): PreloadSaved | null {
  try {
    const raw = localStorage.getItem(PRELOAD_MAP_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (typeof o?.v === 'number' && o?.m && typeof o.m === 'object') return o as PreloadSaved;
  } catch {}
  return null;
}

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
    autoFullscreen();
    await this.ensurePreloaded();
    this.render();
    this.bind();
    gsap.fromTo(this.container, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    gsap.fromTo('.splash-line',
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.35, ease: 'power2.out', delay: 0.3 });
    setTimeout(() => this.dismissSplash(), 3400);
  }

  // Download inteligente: busca o manifesto e baixa SÓ o que for novo ou mudou
  // (compara hash). Remove do cache o que saiu do manifesto. Nunca trava.
  private async ensurePreloaded(): Promise<void> {
    let manifest: PreloadManifest | null = null;
    try {
      const res = await fetch('preload-manifest.json', { cache: 'no-cache' });
      if (res.ok) manifest = await res.json();
    } catch { /* sem rede/manifesto: segue p/ intro */ }
    if (!manifest || !manifest.files?.length) return;
    const ver = manifest.version;
    const saved = readSavedMap();
    const wanted = new Map(manifest.files.map((f) => [f.u, f.h]));
    const missing = manifest.files.filter((f) => saved?.m[f.u] !== f.h);
    let cache: Cache | null = null;
    try { cache = await caches.open('wosw-v' + ver); } catch { cache = null; }
    // Limpa do cache o que nao existe mais (e caches de versoes antigas)
    try {
      if (cache && saved) {
        const keys = await cache.keys();
        await Promise.all(keys.map((req) => {
          const url = new URL(req.url).pathname;
          if (!wanted.has(url)) return cache!.delete(req);
          return Promise.resolve(false);
        }));
      }
      const names = await caches.keys().catch(() => [] as string[]);
      await Promise.all(names.filter((n) => n.startsWith('wosw-v') && n !== 'wosw-v' + ver).map((n) => caches.delete(n)));
    } catch { /* limpeza é melhor esforço */ }
    if (!missing.length && saved?.v === ver) return; // tudo certo: pula a tela
    this.renderDownload();
    const total = manifest.files.length;
    let done = total - missing.length;
    this.paintDownload(total ? done / total : 1);
    for (const f of missing) {
      if (this.dlSkip) break;
      try {
        if (cache) await cache.add(f.u);
        else {
          const r = await fetch(f.u).catch(() => null);
          if (r) await r.arrayBuffer().catch(() => null);
        }
      } catch { /* item individual nao trava o resto */ }
      done++;
      this.paintDownload(done / total);
    }
    if (!this.dlSkip) {
      const m: Record<string, string> = {};
      manifest.files.forEach((f) => { m[f.u] = f.h; });
      try { localStorage.setItem(PRELOAD_MAP_KEY, JSON.stringify({ v: ver, m })); } catch {}
    }
  }

  private renderDownload() {
    this.container.innerHTML = `
      <div id="dl-screen" style="position:relative; width:100%; height:100%; overflow:hidden; background:#000; cursor:pointer;">
        <video src="/videos/download_bg.mp4" autoplay muted loop playsinline preload="auto" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;"></video>
        <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.82) 100%);"></div>
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
        <!-- INTRO: emblema com fade in -> segura -> fade out -->
        <div id="intro-stage" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; cursor:pointer; background:#000; opacity:0; transition:opacity 1.2s ease;">
          <img id="intro-emblem" src="/images/emblem.png" alt="World of Slimes in War" style="width:min(78vw, 420px); height:auto; object-fit:contain; filter:drop-shadow(0 0 34px rgba(0,0,0,0.9));" />
        </div>

        <!-- PRE-INTRO: creditos -->
        <div id="splash-credits" style="position:absolute; inset:0; z-index:50; background:#000; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; cursor:pointer; text-align:center; padding:0 24px; box-sizing:border-box;">
          <div class="splash-line" style="font-family:'Cinzel',serif; font-weight:700; font-size:0.85rem; letter-spacing:6px; text-indent:6px; color:rgba(255,255,255,0.88); text-shadow:0 2px 0 #000;">${t('start.madeBy')}</div>
          <div class="splash-line" style="font-family:'Cinzel',serif; font-size:0.65rem; letter-spacing:5px; text-indent:5px; color:#d4af37;">${t('start.by')}</div>
          <div class="splash-line" style="width:130px; height:1px; background:linear-gradient(90deg, transparent, #d4af37, transparent);"></div>
          <div class="splash-line" style="font-family:'Cinzel',serif; font-weight:900; font-size:1.9rem; letter-spacing:10px; text-indent:10px; color:#f5e6c4; text-shadow:0 0 18px rgba(212,175,55,0.35), 0 2px 0 #000;">FELIPE POLLINI</div>
          <div class="splash-line" style="position:absolute; bottom:6vh; font-size:0.6rem; letter-spacing:3px; color:rgba(255,255,255,0.35);">${t('start.tap')}</div>
        </div>
      </div>
    `;
  }

  private dismissSplash() {
    if (this.splashDone) return;
    this.splashDone = true;
    const splash = document.getElementById('splash-credits');
    if (!splash) { this.startEmblem(); return; }
    gsap.to(splash, {
      opacity: 0,
      duration: 0.5,
      ease: 'power1.inOut',
      onComplete: () => { splash.remove(); this.startEmblem(); }
    });
  }

  // Emblema: fade in (1.2s) -> segura -> fade out (0.8s) -> hub
  private startEmblem() {
    const stage = document.getElementById('intro-stage') as HTMLElement | null;
    if (!stage) { this.enter(); return; }
    requestAnimationFrame(() => { stage.style.opacity = '1'; });
    window.setTimeout(() => {
      stage.style.transition = 'opacity 0.8s ease';
      stage.style.opacity = '0';
    }, 2800);
    window.setTimeout(() => this.enter(), 3700);
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
    const stage = document.getElementById('intro-stage')!;
    const emblem = document.getElementById('intro-emblem') as HTMLImageElement | null;

    document.getElementById('splash-credits')?.addEventListener('click', () => this.dismissSplash());

    // Qualquer clique/toque na intro -> lobby direto
    stage.addEventListener('click', () => this.enter());
    window.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') this.enter(); });
    // Se o emblema falhar, nao prende o jogador numa tela preta
    emblem?.addEventListener('error', () => this.enter());
  }
}

new StartApp();
