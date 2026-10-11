// Fullscreen automático: cada página HTML é um documento novo e o navegador
// derruba o fullscreen na navegação. Então cada entrada tenta ativar e, se o
// navegador exigir gesto, ativa no 1o toque/tecla. A preferência é lembrada:
// sair manualmente (ESC) desliga o auto até o jogador ligar de novo.
const FS_KEY = 'wosw_fullscreen';

export function wantFullscreen(): boolean {
  try { return localStorage.getItem(FS_KEY) !== '0'; } catch { return true; }
}

export function setFullscreenPref(on: boolean) {
  try { localStorage.setItem(FS_KEY, on ? '1' : '0'); } catch {}
}

export async function enterFullscreen(): Promise<boolean> {
  try {
    if (!document.fullscreenEnabled) return false;
    if (document.fullscreenElement) return true;
    await document.documentElement.requestFullscreen();
    return true;
  } catch { return false; }
}

export function autoFullscreen() {
  try {
    if (!document.fullscreenEnabled || !wantFullscreen()) return;
  } catch { return; }
  const cleanup = () => {
    window.removeEventListener('pointerdown', kick);
    window.removeEventListener('keydown', kick);
  };
  const kick = () => {
    try {
      if (!wantFullscreen()) return cleanup();
      if (document.fullscreenElement) return cleanup();
    } catch { return cleanup(); }
    void enterFullscreen().then((ok) => { if (ok) cleanup(); });
  };
  void enterFullscreen();
  window.addEventListener('pointerdown', kick);
  window.addEventListener('keydown', kick);
  document.addEventListener('fullscreenchange', () => {
    // Saiu sem ser por navegação (ESC/gesto): respeita e lembra.
    if (!document.fullscreenElement) setFullscreenPref(false);
    else setFullscreenPref(true);
  });
}
