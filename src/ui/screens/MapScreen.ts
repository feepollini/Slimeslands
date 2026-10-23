import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { HubWorldMapGameView } from './HubWorldMapGameView';

/**
 * MapScreen — Renderiza a saída real de Jogo da Engine Marker Dream
 * (Mapa Mundi Interativo + Seletor Discreto de Mapas + Viagem para Fases Jogáveis).
 */
export class MapScreen {
  private _reactRoot: Root | null = null;

  public setWorldMapInstance(_wm: any) {}

  public render(container: HTMLElement) {
    if (this._reactRoot) {
      try {
        this._reactRoot.unmount();
      } catch {}
      this._reactRoot = null;
    }

    container.innerHTML = `
      <div id="map-screen-inner" style="height: 100%; width: 100%; position: relative; overflow: hidden;"></div>
    `;
    const mountEl = container.querySelector('#map-screen-inner') as HTMLElement | null;
    if (mountEl) {
      this._reactRoot = createRoot(mountEl);
      this._reactRoot.render(React.createElement(HubWorldMapGameView));
    }
  }

  public destroy() {
    if (this._reactRoot) {
      try {
        this._reactRoot.unmount();
      } catch {}
      this._reactRoot = null;
    }
  }
}
