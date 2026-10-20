import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import App from '../../../../card_studio/src/App';
import '../../../../card_studio/src/index.css';

export class TabMatrix {
  private root: Root | null = null;
  private container: HTMLElement | null = null;

  public render(): string {
    return `<div id="forge-matrix-mount" style="width: 100%; height: 100%; overflow: hidden; position: relative;"></div>`;
  }

  public bind(parent: HTMLElement) {
    this.container = parent.querySelector('#forge-matrix-mount');
    if (!this.container) return;
    this.unmount();
    try {
      this.root = createRoot(this.container);
      this.root.render(React.createElement(App));
    } catch (err) {
      console.error('Erro ao montar Forja Matriz:', err);
    }
  }

  public unmount() {
    if (this.root) {
      try {
        this.root.unmount();
      } catch (e) {
        console.warn('TabMatrix unmount:', e);
      }
      this.root = null;
    }
  }
}
