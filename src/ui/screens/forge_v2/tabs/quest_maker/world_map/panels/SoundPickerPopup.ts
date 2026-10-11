export class SoundPickerPopup {
  private currentAudio: HTMLAudioElement | null = null;
  private playingUrl: string | null = null;

  constructor() {}

  public open(sounds: string[], currentSelection: string, pickerId: string, onPick: (value: string) => void) {
    this.close();

    const overlay = document.createElement('div');
    overlay.className = 'sound-picker-overlay';
    overlay.id = pickerId;
    overlay.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75);
      z-index:9999; display:flex; align-items:center; justify-content:center;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background:#111; border:1px solid #333; border-radius:12px; padding:20px;
      max-width:500px; width:90%; max-height:75vh; overflow-y:auto;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;';
    header.innerHTML = `
      <span style="font-size:0.7rem; color:#a78bfa; font-weight:900; letter-spacing:1px;">🔊 SELECIONAR ÁUDIO</span>
      <button class="sound-picker-close" style="background:none; border:none; color:#fff; font-size:1.2rem; cursor:pointer;">✕</button>
    `;

    const list = document.createElement('div');
    list.style.cssText = 'display:flex; flex-direction:column; gap:6px;';

    sounds.forEach(url => {
      const name = url.split('/').pop() || url;
      const isSelected = currentSelection === url;
      const isPlaying = this.playingUrl === url;

      const item = document.createElement('div');
      item.className = 'sound-picker-item';
      item.dataset.url = url;
      item.style.cssText = `
        display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:8px; cursor:pointer;
        background:${isSelected ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.02)'};
        border:1px solid ${isSelected ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.06)'};
        transition:0.15s;
      `;

      const playBtn = document.createElement('button');
      playBtn.className = 'sound-play-btn';
      playBtn.dataset.url = url;
      playBtn.style.cssText = `
        width:32px; height:32px; border-radius:50%; border:none; cursor:pointer;
        background:${isPlaying ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.08)'};
        color:#a78bfa; font-size:0.8rem; display:flex; align-items:center; justify-content:center;
        flex-shrink:0;
      `;
      playBtn.textContent = isPlaying ? '⏸' : '▶';

      const info = document.createElement('div');
      info.style.cssText = 'flex:1; min-width:0;';
      info.innerHTML = `
        <div style="font-size:0.6rem; color:#fff; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</div>
        <div style="font-size:0.45rem; color:rgba(255,255,255,0.3); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${url}</div>
      `;

      item.appendChild(playBtn);
      item.appendChild(info);

      if (isSelected) {
        const check = document.createElement('span');
        check.style.cssText = 'font-size:0.7rem; color:#a78bfa; flex-shrink:0;';
        check.textContent = '✓';
        item.appendChild(check);
      }

      item.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.sound-play-btn')) return;
        e.stopPropagation();
        e.preventDefault();
        this.close();
        setTimeout(() => onPick(url), 60);
      });

      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePlay(url);
        this.refreshPlayingState(list, url);
      });

      list.appendChild(item);
    });

    if (sounds.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'font-size:0.55rem; opacity:0.3; text-align:center; padding:30px;';
      empty.textContent = 'Nenhum áudio disponível';
      list.appendChild(empty);
    }

    panel.appendChild(header);
    panel.appendChild(list);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    header.querySelector('.sound-picker-close')?.addEventListener('click', () => this.close());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });
  }

  public close() {
    const existing = document.querySelector('.sound-picker-overlay, [id^="sound-picker-"]');
    if (existing) existing.remove();
    this.stop();
  }

  public togglePlay(url: string) {
    if (this.playingUrl === url) {
      this.stop();
      return;
    }
    this.stop();
    this.currentAudio = new Audio(url);
    this.currentAudio.play().catch(() => {});
    this.playingUrl = url;
    this.currentAudio.addEventListener('ended', () => { this.playingUrl = null; });
  }

  public stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.playingUrl = null;
  }

  private refreshPlayingState(list: HTMLElement, _playingUrl: string) {
    list.querySelectorAll('.sound-play-btn').forEach((btn: Element) => {
      const el = btn as HTMLElement;
      const url = el.dataset.url!;
      const isPlaying = this.playingUrl === url;
      el.textContent = isPlaying ? '⏸' : '▶';
      el.style.background = isPlaying ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.08)';
    });
  }
}
