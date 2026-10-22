import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import App from '../../../../marker_dream/src/App';
import '../../../../marker_dream/src/index.css';

export class TabMarkerDream {
  private root: Root | null = null;
  private container: HTMLElement | null = null;

  public render(): string {
    return `<div id="forge-markerdream-mount" style="width: 100%; height: 100%; overflow: hidden; position: relative;"></div>`;
  }

  public bind(parent: HTMLElement) {
    this.container = parent.querySelector('#forge-markerdream-mount');
    if (!this.container) return;
    this.unmount();
    try {
      this.root = createRoot(this.container);
      this.root.render(React.createElement(App));
    } catch (err) {
      console.error('Erro ao montar Marker Dream:', err);
    }
  }

  public unmount() {
    if (this.root) {
      try {
        this.root.unmount();
      } catch (e) {
        console.warn('TabMarkerDream unmount:', e);
      }
      this.root = null;
    }
  }
}
