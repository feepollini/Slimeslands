import { MapScreen } from '../screens/MapScreen';

/**
 * MapScreenLandscape — Cópia adaptada da tela de Mapa para Modo Paisagem (Landscape / Web Widescreen).
 */
export class MapScreenLandscape extends MapScreen {
  public override render(container: HTMLElement) {
    super.render(container);
    const mapRoot = container.querySelector('#map-screen-container') as HTMLElement | null;
    if (mapRoot) {
      mapRoot.style.paddingTop = '8px';
      mapRoot.style.paddingBottom = '8px';
    }
  }
}
