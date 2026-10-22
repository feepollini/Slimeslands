/**
 * QuickActionsToolbar.ts
 * Toolbar flutuante com ações rápidas para o editor
 */

export class QuickActionsToolbar {
  private state: any = null;
  private callbacks: any = null;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private posX = 10;
  private posY = 100;
  private _container: HTMLElement | null = null;

  private actions = [
    { id: 'undo', label: '↩', title: 'Desfazer (Ctrl+Z)', color: '#51c5ff', shortcut: 'Ctrl+Z' },
    { id: 'redo', label: '↪', title: 'Refazer (Ctrl+X)', color: '#51c5ff', shortcut: 'Ctrl+X' },
    { id: 'sep1', type: 'separator' },
    { id: 'duplicate', label: '📋', title: 'Duplicar (Ctrl+D)', color: '#ffd700', shortcut: 'Ctrl+D' },
    { id: 'delete', label: '🗑', title: 'Excluir (Del)', color: '#ff4444', shortcut: 'Del' },
    { id: 'sep2', type: 'separator' },
    { id: 'lock', label: '🔒', title: 'Bloquear', color: '#a78bfa', action: 'lock' },
    { id: 'hide', label: '👁', title: 'Ocultar', color: '#4cff88', action: 'hide' },
    { id: 'sep3', type: 'separator' },
    { id: 'hub', label: '🏠', title: 'Abrir Quest Hub', color: '#ff44aa' },
    { id: 'grid', label: '📐', title: 'Grade', color: '#fff', type: 'toggle' },
    { id: 'snap', label: '🧲', title: 'Ajustar ao Grid', color: '#fff', type: 'toggle' },
  ];

  public render(state: any): string {
    this.state = state;
    
    return `
      <div id="quick-actions-toolbar" style="
        position: fixed;
        left: ${this.posX}px;
        top: ${this.posY}px;
        background: rgba(10, 10, 18, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        z-index: 5000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
        ${this.isDragging ? 'cursor: grabbing;' : ''}
      ">
        <div class="qa-drag-handle" style="
          position: absolute;
          top: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 30px;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          cursor: grab;
        "></div>
        
        <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 4px;">
          ${this.actions.map(action => {
            if (action.type === 'separator') {
              return `<div style="height:1px; background:rgba(255,255,255,0.1); margin: 2px 0;"></div>`;
            }
            
            let isActive = false;
            if (action.id === 'grid') isActive = state.showGrid !== false;
            if (action.id === 'snap') isActive = state.snapToGrid !== false;
            
            return `
              <button class="qa-action-btn" data-action="${action.id}" style="
                width: 36px;
                height: 36px;
                border-radius: 8px;
                border: 1px solid ${isActive ? action.color : 'rgba(255,255,255,0.1)'};
                background: ${isActive ? action.color + '20' : 'rgba(0,0,0,0.3)'};
                color: ${isActive ? action.color : '#888'};
                font-size: 0.9rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s;
                position: relative;
              " title="${action.title || ''}">
                ${action.label}
                ${action.shortcut ? `
                  <span style="
                    position: absolute;
                    bottom: 1px;
                    right: 2px;
                    font-size: 0.35rem;
                    color: #444;
                    font-weight: 900;
                  ">${action.shortcut}</span>
                ` : ''}
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  public bind(_container: HTMLElement, state: any, callbacks: any) {
    this._container = _container;
    this.state = state;
    this.callbacks = callbacks;

    const toolbar = _container.querySelector('#quick-actions-toolbar') as HTMLElement;
    if (!toolbar) return;

    const handle = toolbar.querySelector('.qa-drag-handle') as HTMLElement;
    if (handle) {
      handle.addEventListener('mousedown', (e: any) => {
        this.isDragging = true;
        this.dragStartX = e.clientX - this.posX;
        this.dragStartY = e.clientY - this.posY;
        (toolbar as HTMLElement).style.cursor = 'grabbing';
      });
    }

    document.addEventListener('mousemove', (e: any) => {
      if (this.isDragging) {
        this.posX = e.clientX - this.dragStartX;
        this.posY = e.clientY - this.dragStartY;
        toolbar.style.left = this.posX + 'px';
        toolbar.style.top = this.posY + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        (toolbar as HTMLElement).style.cursor = 'grab';
      }
    });

    toolbar.querySelectorAll('.qa-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const actionId = (btn as HTMLElement).dataset.action;
        this.executeAction(actionId || '');
      });
    });
  }

  private executeAction(actionId: string) {
    if (!this.callbacks) return;

    switch (actionId) {
      case 'undo':
        this.callbacks.undo?.();
        break;
      case 'redo':
        this.callbacks.redo?.();
        break;
      case 'duplicate':
        document.dispatchEvent(new CustomEvent('wm-command', { detail: { cmd: 'duplicate' } }));
        break;
      case 'delete':
        document.dispatchEvent(new CustomEvent('wm-command', { detail: { cmd: 'delete-sel' } }));
        break;
      case 'lock':
        this.toggleProperty('isLocked', true);
        break;
      case 'hide':
        this.toggleProperty('isVisible', false);
        break;
      case 'hub':
        document.dispatchEvent(new CustomEvent('wm-command', { detail: { cmd: 'open-hub' } }));
        break;
      case 'grid':
        this.state.showGrid = this.state.showGrid === false ? true : false;
        document.dispatchEvent(new CustomEvent('ui-options-changed', { detail: this.state }));
        this.callbacks.reRender?.();
        break;
      case 'snap':
        this.state.snapToGrid = this.state.snapToGrid === false ? true : false;
        this.callbacks.reRender?.();
        break;
    }
  }

  private toggleProperty(prop: string, value: any) {
    const selectedIds = this.state.selectedIds || [];
    if (selectedIds.length === 0) return;

    this.state.worldMapObjects = this.state.worldMapObjects.map((obj: any) => {
      if (selectedIds.includes(obj.id)) {
        return { ...obj, [prop]: value };
      }
      return obj;
    });

    document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
    this.callbacks.reRender?.();
  }

  public destroy() {
    const toolbar = document.getElementById('quick-actions-toolbar');
    if (toolbar) toolbar.remove();
  }
}
