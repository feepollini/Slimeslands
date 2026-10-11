import { LayerSystem, Layer, layerSystem } from '../shared/LayerSystem';

export interface LayerPanelState {
  searchQuery: string;
  filterType: string | null;
  sortBy: 'index' | 'name' | 'type';
  sortOrder: 'asc' | 'desc';
  showLocked: boolean;
  showHidden: boolean;
}

export class AELayerPanel {
  private layerSystem: LayerSystem;
  private state: LayerPanelState;
  private container: HTMLElement | null = null;
  private dragLayerId: string | null = null;

  private readonly PANEL_WIDTH = 260;

  constructor(_layerSystem?: LayerSystem) {
    this.layerSystem = _layerSystem || layerSystem;
    this.state = this.createDefaultState();
  }

  private createDefaultState(): LayerPanelState {
    return {
      searchQuery: '',
      filterType: null,
      sortBy: 'index',
      sortOrder: 'asc',
      showLocked: true,
      showHidden: true
    };
  }

  getState(): LayerPanelState {
    return this.state;
  }

  setSearchQuery(query: string): void {
    this.state.searchQuery = query;
    this.render();
  }

  setFilterType(type: string | null): void {
    this.state.filterType = type;
    this.render();
  }

  render(): string {
    const layers = this.getFilteredLayers();

    return `
      <div class="ae-layer-panel" style="
        width: ${this.PANEL_WIDTH}px;
        background: #141416;
        display: flex;
        flex-direction: column;
        height: 100%;
        border-right: 1px solid #252528;
        user-select: none;
        font-family: 'Inter', -apple-system, sans-serif;
      ">
        ${this.renderHeader()}
        ${this.renderToolbar()}
        <div class="ae-layers-list" style="
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        ">
          ${layers.map((layer, idx) => this.renderLayerItem(layer, idx)).join('')}
        </div>
        ${this.renderFooter()}
      </div>
    `;
  }

  private renderHeader(): string {
    return `
      <div class="ae-layer-panel-header" style="
        padding: 10px 12px;
        background: #1a1a1d;
        border-bottom: 1px solid #252528;
      ">
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        ">
          <span style="color: #888; font-size: 10px; font-weight: 700; letter-spacing: 1px;">
            CAMADAS
          </span>
          <span style="color: #555; font-size: 9px;">
            ${this.layerSystem.getLayers().length} camadas
          </span>
        </div>
        <div class="ae-layer-search" style="
          position: relative;
        ">
          <input type="text" 
            class="ae-layer-search-input"
            placeholder="Pesquisar camadas..." 
            value="${this.state.searchQuery}"
            style="
              width: 100%;
              padding: 6px 10px 6px 28px;
              background: #0d0d0f;
              border: 1px solid #252528;
              border-radius: 4px;
              color: #ccc;
              font-size: 11px;
              outline: none;
              box-sizing: border-box;
            "
          >
          <span style="
            position: absolute;
            left: 8px;
            top: 50%;
            transform: translateY(-50%);
            color: #555;
            font-size: 10px;
          ">🔍</span>
        </div>
      </div>
    `;
  }

  private renderToolbar(): string {
    return `
      <div class="ae-layer-toolbar" style="
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 10px;
        background: #18181a;
        border-bottom: 1px solid #1e1e22;
      ">
        <button class="ae-layer-btn" data-action="new" title="Nova Camada" style="
          width: 26px; height: 22px; background: #252528;
          border: 1px solid #333336; border-radius: 3px;
          color: #888; cursor: pointer; font-size: 12px;
        ">+</button>
        <button class="ae-layer-btn" data-action="delete" title="Excluir" style="
          width: 26px; height: 22px; background: #252528;
          border: 1px solid #333336; border-radius: 3px;
          color: #888; cursor: pointer; font-size: 12px;
        ">🗑</button>
        <div style="width: 1px; height: 16px; background: #252528; margin: 0 4px;"></div>
        <button class="ae-layer-btn" data-action="group" title="Agrupar" style="
          width: 26px; height: 22px; background: #252528;
          border: 1px solid #333336; border-radius: 3px;
          color: #888; cursor: pointer; font-size: 11px;
        ">⊞</button>
        <button class="ae-layer-btn" data-action="ungroup" title="Desagrupar" style="
          width: 26px; height: 22px; background: #252528;
          border: 1px solid #333336; border-radius: 3px;
          color: #888; cursor: pointer; font-size: 11px;
        ">⊟</button>
        <div style="width: 1px; height: 16px; background: #252528; margin: 0 4px;"></div>
        <button class="ae-layer-btn" data-action="lock" title="Bloquear" style="
          width: 26px; height: 22px; background: #252528;
          border: 1px solid #333336; border-radius: 3px;
          color: #888; cursor: pointer; font-size: 11px;
        ">🔒</button>
        <button class="ae-layer-btn" data-action="unlock" title="Desbloquear" style="
          width: 26px; height: 22px; background: #252528;
          border: 1px solid #333336; border-radius: 3px;
          color: #888; cursor: pointer; font-size: 11px;
        ">🔓</button>
        <button class="ae-layer-btn" data-action="hide" title="Ocultar" style="
          width: 26px; height: 22px; background: #252528;
          border: 1px solid #333336; border-radius: 3px;
          color: #888; cursor: pointer; font-size: 11px;
        ">👁</button>
        <button class="ae-layer-btn" data-action="show" title="Mostrar" style="
          width: 26px; height: 22px; background: #252528;
          border: 1px solid #333336; border-radius: 3px;
          color: #888; cursor: pointer; font-size: 11px;
        ">○</button>
        <div style="flex: 1;"></div>
        <button class="ae-layer-btn" data-action="sort" title="Ordenar" style="
          width: 26px; height: 22px; background: #252528;
          border: 1px solid #333336; border-radius: 3px;
          color: #888; cursor: pointer; font-size: 11px;
        ">↕</button>
      </div>
    `;
  }

  private renderLayerItem(layer: Layer, _index: number): string {
    const isSelected = this.layerSystem.isLayerSelected(layer.id);
    const hasChildren = layer.childIds.length > 0;
    const hasKeyframes = Object.keys(layer.properties).some(prop => 
      layer.properties[prop]?.keyframes?.length > 0
    );

    const typeColors: any = {
      image: '#4a9eff',
      shape: '#ff9500',
      text: '#4cff88',
      solid: '#ff3366',
      null: '#888',
      camera: '#a78bfa',
      audio: '#ffd700'
    };

    return `
      <div class="ae-layer-item ${isSelected ? 'selected' : ''}" 
        data-layer-id="${layer.id}"
        draggable="true"
        style="
          display: flex;
          align-items: center;
          padding: 6px 10px;
          background: ${isSelected ? '#2a2a3a' : 'transparent'};
          border-bottom: 1px solid #1a1a1e;
          cursor: pointer;
          transition: background 0.1s;
          position: relative;
        "
        onmouseover="this.style.background = '${isSelected ? '#2a2a3a' : '#1e1e22'}'"
        onmouseout="this.style.background = '${isSelected ? '#2a2a3a' : 'transparent'}'"
      >
        <div class="ae-layer-controls" style="
          display: flex;
          align-items: center;
          gap: 4px;
          margin-right: 8px;
        ">
          <button class="ae-layer-visibility" 
            data-layer-id="${layer.id}" 
            data-action="toggleVisibility"
            style="
              width: 18px; height: 18px;
              background: none; border: none;
              color: ${layer.visible ? '#666' : '#333'};
              cursor: pointer; font-size: 10px;
              text-align: center;
            "
          >${layer.visible ? '👁' : '○'}</button>
          <button class="ae-layer-solo"
            data-layer-id="${layer.id}"
            data-action="toggleSolo"
            style="
              width: 18px; height: 18px;
              background: none; border: none;
              color: ${layer.solo ? '#f5a623' : '#333'};
              cursor: pointer; font-size: 9px; font-weight: 700;
            "
          >S</button>
          <button class="ae-layer-lock"
            data-layer-id="${layer.id}"
            data-action="toggleLock"
            style="
              width: 18px; height: 18px;
              background: none; border: none;
              color: ${layer.locked ? '#ff6b6b' : '#333'};
              cursor: pointer; font-size: 9px;
            "
          >${layer.locked ? '🔒' : '○'}</button>
        </div>

        <div class="ae-layer-color" style="
          width: 4px;
          height: 24px;
          background: ${typeColors[layer.type] || '#555'};
          border-radius: 2px;
          margin-right: 8px;
          flex-shrink: 0;
        "></div>

        <div class="ae-layer-info" style="flex: 1; min-width: 0;">
          <div class="ae-layer-name" style="
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            color: ${layer.visible ? '#ccc' : '#555'};
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          ">
            ${hasKeyframes ? '<span style="color:#4a9eff; font-size:8px;">◆</span>' : ''}
            ${hasChildren ? '<span style="color:#666; font-size:8px;">📂</span>' : ''}
            ${layer.name}
          </div>
          <div class="ae-layer-meta" style="
            font-size: 9px;
            color: #444;
            margin-top: 2px;
          ">
            ${layer.type.toUpperCase()} · ${this.formatDuration(layer)}
          </div>
        </div>

        <div class="ae-layer-thumbnail" style="
          width: 36px;
          height: 24px;
          background: #0d0d0f;
          border-radius: 3px;
          margin-left: 8px;
          overflow: hidden;
          flex-shrink: 0;
        ">
          ${layer.assetUrl ? `<img src="${layer.assetUrl}" style="width:100%;height:100%;object-fit:cover;opacity:${layer.opacity}">` : ''}
        </div>
      </div>
    `;
  }

  private renderFooter(): string {
    const selectedLayers = this.layerSystem.getSelectedLayers();

    return `
      <div class="ae-layer-panel-footer" style="
        padding: 8px 12px;
        background: #1a1a1d;
        border-top: 1px solid #252528;
        font-size: 10px;
        color: #555;
      ">
        ${selectedLayers.length > 0 ? `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>${selectedLayers.length} selecionada(s)</span>
            <button class="ae-layer-btn" data-action="duplicate" style="
              padding: 2px 6px; background: #252528;
              border: 1px solid #333336; border-radius: 3px;
              color: #888; cursor: pointer; font-size: 9px;
            ">Duplicar</button>
            <button class="ae-layer-btn" data-action="copy" style="
              padding: 2px 6px; background: #252528;
              border: 1px solid #333336; border-radius: 3px;
              color: #888; cursor: pointer; font-size: 9px;
            ">Copiar</button>
            <button class="ae-layer-btn" data-action="paste" style="
              padding: 2px 6px; background: #252528;
              border: 1px solid #333336; border-radius: 3px;
              color: #888; cursor: pointer; font-size: 9px;
            ">Colar</button>
          </div>
        ` : '<span>Nenhuma camada selecionada</span>'}
      </div>
    `;
  }

  private getFilteredLayers(): Layer[] {
    let layers = [...this.layerSystem.getLayers()];

    if (this.state.searchQuery) {
      const query = this.state.searchQuery.toLowerCase();
      layers = layers.filter(l => l.name.toLowerCase().includes(query));
    }

    if (this.state.filterType) {
      layers = layers.filter(l => l.type === this.state.filterType);
    }

    if (!this.state.showLocked) {
      layers = layers.filter(l => !l.locked);
    }

    if (!this.state.showHidden) {
      layers = layers.filter(l => l.visible);
    }

    layers.reverse();

    return layers;
  }

  private formatDuration(layer: Layer): string {
    const duration = layer.outPoint - layer.inPoint;
    const seconds = Math.floor(duration);
    const frames = Math.floor((duration % 1) * 30);
    return `${seconds}s ${frames}f`;
  }

  bind(container: HTMLElement): void {
    this.container = container;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.container) return;

    const searchInput = this.container.querySelector('.ae-layer-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.setSearchQuery((e.target as HTMLInputElement).value);
      });
    }

    this.container.querySelectorAll('.ae-layer-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action;
        this.handleToolbarAction(action || '');
      });
    });

    this.container.querySelectorAll('.ae-layer-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const layerId = (e.currentTarget as HTMLElement).dataset.layerId;
        if (layerId) {
          this.layerSystem.selectLayer(layerId, (e as any).ctrlKey || (e as any).metaKey);
          this.render();
        }
      });

      item.addEventListener('dblclick', (e) => {
        const layerId = (e.currentTarget as HTMLElement).dataset.layerId;
        if (layerId) {
          this.editLayerName(layerId);
        }
      });

      item.addEventListener('dragstart', (e: Event) => {
        const dragEvent = e as DragEvent;
        const layerId = (e.currentTarget as HTMLElement).dataset.layerId;
        if (layerId) {
          this.dragLayerId = layerId;
          dragEvent.dataTransfer?.setData('text/plain', layerId);
        }
      });

      item.addEventListener('dragover', (e: Event) => {
        e.preventDefault();
        const layerId = (e.currentTarget as HTMLElement).dataset.layerId;
        if (layerId && layerId !== this.dragLayerId) {
          (e.currentTarget as HTMLElement).style.background = '#2a2a3a';
        }
      });

      item.addEventListener('dragleave', (e) => {
        (e.currentTarget as HTMLElement).style.background = '';
      });

      item.addEventListener('drop', (e: Event) => {
        e.preventDefault();
        const targetId = (e.currentTarget as HTMLElement).dataset.layerId;
        if (targetId && this.dragLayerId && targetId !== this.dragLayerId) {
          this.handleLayerDrop(this.dragLayerId, targetId);
        }
        this.dragLayerId = null;
        this.render();
      });
    });

    this.container.querySelectorAll('[data-action="toggleVisibility"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const layerId = (e.currentTarget as HTMLElement).dataset.layerId;
        if (layerId) {
          const layer = this.layerSystem.getLayer(layerId);
          if (layer) {
            layer.visible = !layer.visible;
            this.render();
          }
        }
      });
    });

    this.container.querySelectorAll('[data-action="toggleSolo"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const layerId = (e.currentTarget as HTMLElement).dataset.layerId;
        if (layerId) {
          const layer = this.layerSystem.getLayer(layerId);
          if (layer) {
            layer.solo = !layer.solo;
            this.render();
          }
        }
      });
    });

    this.container.querySelectorAll('[data-action="toggleLock"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const layerId = (e.currentTarget as HTMLElement).dataset.layerId;
        if (layerId) {
          const layer = this.layerSystem.getLayer(layerId);
          if (layer) {
            layer.locked = !layer.locked;
            this.render();
          }
        }
      });
    });
  }

  private handleToolbarAction(action: string): void {
    const selectedIds = this.layerSystem.getSelectedLayerIds();

    switch (action) {
      case 'new':
        this.layerSystem.addLayer({ name: 'Nova Camada ' + Date.now().toString().slice(-4) });
        break;
      case 'delete':
        selectedIds.forEach(id => this.layerSystem.removeLayer(id));
        break;
      case 'group':
        if (selectedIds.length > 1) {
          const parentId = selectedIds[0];
          for (let i = 1; i < selectedIds.length; i++) {
            this.layerSystem.setLayerParent(selectedIds[i], parentId);
          }
        }
        break;
      case 'ungroup':
        selectedIds.forEach(id => this.layerSystem.setLayerParent(id, null));
        break;
      case 'lock':
        selectedIds.forEach(id => {
          const layer = this.layerSystem.getLayer(id);
          if (layer) layer.locked = true;
        });
        break;
      case 'unlock':
        selectedIds.forEach(id => {
          const layer = this.layerSystem.getLayer(id);
          if (layer) layer.locked = false;
        });
        break;
      case 'hide':
        selectedIds.forEach(id => {
          const layer = this.layerSystem.getLayer(id);
          if (layer) layer.visible = false;
        });
        break;
      case 'show':
        selectedIds.forEach(id => {
          const layer = this.layerSystem.getLayer(id);
          if (layer) layer.visible = true;
        });
        break;
      case 'duplicate':
        selectedIds.forEach(id => this.layerSystem.duplicateLayer(id));
        break;
      case 'copy':
        this.layerSystem.copyLayers();
        break;
      case 'paste':
        this.layerSystem.pasteLayers();
        break;
      case 'sort':
        this.state.sortOrder = this.state.sortOrder === 'asc' ? 'desc' : 'asc';
        break;
    }

    this.render();
  }

  private handleLayerDrop(dragId: string, targetId: string): void {
    const targetLayer = this.layerSystem.getLayer(targetId);
    if (!targetLayer) return;

    this.layerSystem.setLayerParent(dragId, targetId);
  }

  private editLayerName(layerId: string): void {
    const layer = this.layerSystem.getLayer(layerId);
    if (!layer) return;

    const newName = prompt('Nome da camada:', layer.name);
    if (newName && newName !== layer.name) {
      layer.name = newName;
      this.render();
    }
  }
}

export const aeLayerPanel = new AELayerPanel();
