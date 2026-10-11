/**
 * SmartLayersPanel.ts
 * Tree view com grouping visual para objetos do mundo
 */

export class SmartLayersPanel {
  private state: any = null;
  private expandedGroups: Set<string> = new Set();
  private searchQuery = '';

  public render(state: any): string {
    this.state = state;
    const objects = state.worldMapObjects || [];
    const selectedIds = state.selectedIds || [];

    const grouped = this.buildHierarchy(objects);

    return `
      <div style="display:flex; flex-direction:column; height:100%; overflow:hidden; background:#08080c;">
        
        <!-- SEARCH -->
        <div style="padding:10px; background:#0d0d15; border-bottom:1px solid #1a1a2e; flex-shrink:0;">
          <input type="text" id="smart-layers-search" value="${this.searchQuery}" placeholder="🔍 Buscar camadas..." style="
            width:100%; padding:8px 12px 8px 30px; background:rgba(0,0,0,0.4);
            border:1px solid rgba(255,255,255,0.1); border-radius:6px;
            color:#fff; font-size:0.6rem; outline:none;
          ">
        </div>

        <!-- ACTIONS BAR -->
        <div style="padding:8px 10px; display:flex; gap:6px; background:rgba(0,0,0,0.3); border-bottom:1px solid #1a1a2e; flex-shrink:0;">
          <button id="smart-expand-all" style="
            padding:4px 10px; background:rgba(81,197,255,0.1); border:1px solid rgba(81,197,255,0.2);
            border-radius:4px; color:#51c5ff; font-size:0.5rem; font-weight:900; cursor:pointer;
          ">EXPANDIR</button>
          <button id="smart-collapse-all" style="
            padding:4px 10px; background:rgba(167,139,250,0.1); border:1px solid rgba(167,139,250,0.2);
            border-radius:4px; color:#a78bfa; font-size:0.5rem; font-weight:900; cursor:pointer;
          ">COLAPSAR</button>
        </div>

        <!-- TREE -->
        <div id="smart-layers-tree" style="flex:1; overflow-y:auto; padding:8px;">
          ${grouped.length === 0 ? `
            <div style="padding:30px; text-align:center; opacity:0.3;">
              <div style="font-size:2rem; margin-bottom:10px;">🌳</div>
              <div style="font-size:0.6rem;">Nenhum objeto no mapa</div>
            </div>
          ` : grouped.map(item => this.renderTreeItem(item, 0, selectedIds)).join('')}
        </div>

        <!-- FOOTER -->
        <div style="padding:8px 12px; background:#0d0d15; border-top:1px solid #1a1a2e; flex-shrink:0; display:flex; justify-content:space-between;">
          <span style="font-size:0.5rem; color:#666;">${objects.length} objetos</span>
          <span style="font-size:0.5rem; color:#51c5ff;">${selectedIds.length} selecionado(s)</span>
        </div>
      </div>
    `;
  }

  private buildHierarchy(objects: any[]): any[] {
    const groups: Map<string, any> = new Map();
    const orphans: any[] = [];

    const filtered = this.searchQuery 
      ? objects.filter((o: any) => {
          const name = (o.label || o.type || '').toLowerCase();
          return name.includes(this.searchQuery.toLowerCase());
        })
      : objects;

    filtered.forEach(obj => {
      if (obj.type === 'group' || obj.type === 'phase') {
        if (!groups.has(obj.id)) {
          groups.set(obj.id, { ...obj, children: [], type: 'group' });
        }
      }
    });

    filtered.forEach(obj => {
      if (obj.parentId && groups.has(obj.parentId)) {
        const parent = groups.get(obj.parentId);
        if (parent) parent.children.push(obj);
      } else if (!obj.parentId && obj.type !== 'group' && obj.type !== 'phase') {
        orphans.push(obj);
      }
    });

    const result: any[] = [];
    groups.forEach(g => result.push(g));
    orphans.forEach(o => result.push(o));

    return result;
  }

  private renderTreeItem(item: any, depth: number, selectedIds: string[]): string {
    const isGroup = item.type === 'group' || item.type === 'phase';
    const isExpanded = this.expandedGroups.has(item.id);
    const isSelected = selectedIds.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const indent = depth * 16;

    const getIcon = () => {
      if (item.type === 'player') return '👤';
      if (item.type === 'camera') return '📹';
      if (item.type === 'collision') return '🧱';
      if (item.type === 'area_sensor') return '◫';
      if (item.type === 'morph') return item.assetUrl ? '🖼️' : '📦';
      if (item.type === 'phase') return '🎮';
      if (item.type === 'group') return '📁';
      return '📄';
    };

    const getColor = () => {
      if (item.type === 'player') return '#4cff88';
      if (item.type === 'camera') return '#51c5ff';
      if (item.type === 'collision') return '#ff4444';
      if (item.type === 'area_sensor') return '#44ccff';
      if (item.type === 'phase') return '#ffd700';
      if (item.type === 'group') return '#a78bfa';
      return '#888';
    };

    const color = getColor();

    const childrenHtml = isExpanded && hasChildren
      ? item.children.map((child: any) => this.renderTreeItem(child, depth + 1, selectedIds)).join('')
      : '';

    return `
      <div class="tree-item" data-id="${item.id}" style="margin-bottom:2px;">
        <div class="tree-row" data-id="${item.id}" style="
          display:flex; align-items:center; gap:6px; padding:8px 10px;
          background:${isSelected ? 'rgba(81,197,255,0.15)' : 'transparent'};
          border-left:2px solid ${isSelected ? color : 'transparent'};
          border-radius:6px; cursor:pointer; transition:0.15s;
          margin-left:${indent}px;
        " onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='${isSelected ? 'rgba(81,197,255,0.15)' : 'transparent'}'">
          
          ${hasChildren ? `
            <span class="tree-toggle" data-id="${item.id}" style="
              width:16px; height:16px; display:flex; align-items:center; justify-content:center;
              font-size:0.6rem; color:#666; cursor:pointer;
            ">${isExpanded ? '▼' : '▶'}</span>
          ` : '<span style="width:16px;"></span>'}
          
          <span style="font-size:0.8rem;">${getIcon()}</span>
          
          <span style="flex:1; font-size:0.55rem; color:${isSelected ? '#fff' : color}; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${item.label || item.type}
          </span>
          
          <div style="display:flex; gap:4px;">
            ${item.isLocked ? '<span style="font-size:0.5rem; color:#ffd700;">🔒</span>' : ''}
            ${item.isVisible === false ? '<span style="font-size:0.5rem; color:#666;">👁</span>' : ''}
          </div>
        </div>
        ${childrenHtml}
      </div>
    `;
  }

  public bind(container: HTMLElement, state: any, callbacks: any) {
    this.state = state;

    const searchInput = container.querySelector('#smart-layers-search') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e: any) => {
        this.searchQuery = e.target.value;
        this.rerender(container, state, callbacks);
      });
    }

    container.querySelector('#smart-expand-all')?.addEventListener('click', () => {
      const objects = state.worldMapObjects || [];
      objects.forEach((o: any) => {
        if (o.type === 'group' || o.type === 'phase') {
          this.expandedGroups.add(o.id);
        }
      });
      this.rerender(container, state, callbacks);
    });

    container.querySelector('#smart-collapse-all')?.addEventListener('click', () => {
      this.expandedGroups.clear();
      this.rerender(container, state, callbacks);
    });

    container.querySelectorAll('.tree-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e: any) => {
        e.stopPropagation();
        const id = toggle.getAttribute('data-id');
        if (id) {
          if (this.expandedGroups.has(id)) {
            this.expandedGroups.delete(id);
          } else {
            this.expandedGroups.add(id);
          }
          this.rerender(container, state, callbacks);
        }
      });
    });

    container.querySelectorAll('.tree-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-id');
        if (!id) return;

        const isCtrl = (window as any).event?.ctrlKey || (window as any).event?.metaKey;
        
        if (isCtrl) {
          const current = state.selectedIds || [];
          if (current.includes(id)) {
            state.selectedIds = current.filter((i: string) => i !== id);
          } else {
            state.selectedIds = [...current, id];
          }
        } else {
          state.selectedIds = [id];
          state.selectedId = id;
        }

        document.dispatchEvent(new CustomEvent('worldmap-selection-changed'));
        this.rerender(container, state, callbacks);
      });

      row.addEventListener('dblclick', () => {
        const id = row.getAttribute('data-id');
        if (id) {
          const obj = state.worldMapObjects?.find((o: any) => o.id === id);
          if (obj && (obj.type === 'group' || obj.type === 'phase')) {
            if (this.expandedGroups.has(id)) {
              this.expandedGroups.delete(id);
            } else {
              this.expandedGroups.add(id);
            }
            this.rerender(container, state, callbacks);
          }
        }
      });
    });
  }

  private rerender(container: HTMLElement, state: any, callbacks: any) {
    container.innerHTML = this.render(state);
    this.bind(container, state, callbacks);
  }
}
