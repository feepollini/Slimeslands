import { LayersHeader } from '../../../../../../shared/LayersHeader';
import { KeyframeManager } from '../../../../../../shared/KeyframeManager';

const PROP_DEFS = [
  { key:'x', label:'Position X', color:'#ff4466', min:-2000, max:4000, step:1, mul:1, unit:'px' },
  { key:'y', label:'Position Y', color:'#44ccff', min:-2000, max:4000, step:1, mul:1, unit:'px' },
  { key:'w', label:'Width', color:'#51c5ff', min:0, max:4000, step:1, mul:1, unit:'px' },
  { key:'h', label:'Height', color:'#51c5ff', min:0, max:4000, step:1, mul:1, unit:'px' },
  { key:'scaleX', label:'Scale X', color:'#ff9500', min:0.01, max:5, step:0.01, mul:100, unit:'%' },
  { key:'scaleY', label:'Scale Y', color:'#ff9500', min:0.01, max:5, step:0.01, mul:100, unit:'%' },
  { key:'rotation', label:'Rotation', color:'#a78bfa', min:-360, max:360, step:0.1, mul:1, unit:'°' },
  { key:'opacity', label:'Opacity', color:'#4cff88', min:0, max:100, step:1, mul:100, unit:'%' },
  { key:'pivotX', label:'Anchor X', color:'#ffd700', min:0, max:1, step:0.01, mul:1, unit:'' },
  { key:'pivotY', label:'Anchor Y', color:'#ffd700', min:0, max:1, step:0.01, mul:1, unit:'' },
];

const LAYER_ROW_H = 24;

export class ArtboardsPanel {
  private searchTerm: string = '';
  private layersHeader = new LayersHeader();
  private _state: any = {};
  private _objects: any[] = [];
  private _callbacks: any = null;
  private _clickHandler: ((e: any) => void) | null = null;
  private _dblclickHandler: ((e: any) => void) | null = null;
  private _inputHandler: ((e: any) => void) | null = null;
  private _dragStartHandler: ((e: DragEvent) => void) | null = null;
  private _dragEndHandler: ((e: DragEvent) => void) | null = null;
  private _dragOverHandler: ((e: DragEvent) => void) | null = null;
  private _dragLeaveHandler: ((e: DragEvent) => void) | null = null;
  private _dropHandler: ((e: DragEvent) => void) | null = null;
  private _globalChangeHandler: (() => void) | null = null;

  constructor() {
    this._globalChangeHandler = () => {
      this._callbacks?.reRender();
    };
    this._inputHandler = (e: any) => {
      this.searchTerm = e.target.value;
      this._callbacks?.reRender();
      setTimeout(() => {
        const input = document.getElementById('layer-search') as HTMLInputElement;
        if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
      }, 10);
    };
  }

  public render(state: any, _callbacks: any): string {
    const objects = state.worldMapObjects || [];
    const selectedIds = state.selectedIds || [];
    const expandedGroups = state.expandedGroupIds || [];
    const expandedParams = state.expandedLayerIds || [];

    const groupMap = new Map<string, any[]>();
    const childToGroup = new Map<string, string>();
    
    for (const obj of objects) {
      if (obj._isGroup || obj.type === 'group') {
        if (!groupMap.has(obj.id)) groupMap.set(obj.id, []);
      }
      if (obj.groupId) {
        const children = groupMap.get(obj.groupId) || [];
        if (!children.includes(obj.id)) children.push(obj.id);
        groupMap.set(obj.groupId, children);
        childToGroup.set(obj.id, obj.groupId);
      }
    }
    
    const orderedObjects: any[] = [];
    const addedIds = new Set<string>();
    
    const addWithChildren = (obj: any, depth: number = 0) => {
      if (addedIds.has(obj.id)) return;
      addedIds.add(obj.id);
      const isGroupExpanded = expandedGroups.includes(obj.id);
      const children = groupMap.get(obj.id) || [];
      orderedObjects.push({ ...obj, _depth: depth, _isGroupExpanded: isGroupExpanded, _hasChildren: children.length > 0 });
      if (isGroupExpanded) {
        for (const childId of children) {
          const child = objects.find((o: any) => o.id === childId);
          if (child) addWithChildren(child, depth + 1);
        }
      }
    };
    
    for (const obj of objects) {
      if (!childToGroup.has(obj.id) && !addedIds.has(obj.id)) {
        if (obj._isGroup || obj.type === 'group') {
          addWithChildren(obj, 0);
        } else {
          orderedObjects.push({ ...obj, _depth: 0, _isGroupExpanded: false, _hasChildren: false });
          addedIds.add(obj.id);
        }
      }
    }
    
    for (const obj of objects) {
      if ((obj._isGroup || obj.type === 'group') && !addedIds.has(obj.id)) {
        addWithChildren(obj, 0);
      }
    }

    const getTypeColor = (type: string) => {
      const colors: any = { player: '#4cff88', camera: '#51c5ff', morph: '#a78bfa', collision: '#ff4444', area_sensor: '#44ccff', group: '#ffd700', phase: '#ff9500' };
      return colors[type] || '#666';
    };

    const getTypeIcon = (type: string) => {
      const icons: any = { player: '👤', morph: '🖼️', collision: '🧱', area_sensor: '📡', group: '📂', stamp_layer: '🔖', vector: '🖊️', camera: '📷', phase: '∞' };
      return icons[type] || '⬡';
    };

    const layerItem = (obj: any, index: number) => {
      const isSelected = selectedIds.includes(obj.id);
      const isVisible = obj.isVisible !== false;
      const isLocked = obj.isLocked === true;
      const tc = getTypeColor(obj.type);
      const showParams = expandedParams.includes(obj.id);
      const inPt = obj.inPoint ?? 0;
      const outPt = obj.outPt ?? 5;
      const isGroup = obj.type === 'group' || obj._isGroup;
      const depth = obj._depth || 0;
      const isGroupExpanded = obj._isGroupExpanded;
      const hasChildren = obj._hasChildren;
      const hasLinked = !!obj.parentId;
      
      const expandBtn = hasChildren 
        ? `<button class="ae-exp" data-id="${obj.id}" title="Expandir grupo" style="width:14px;height:14px;background:none;border:none;color:#888;cursor:pointer;font-size:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">${isGroupExpanded ? '▼' : '▶'}</button>` 
        : '<span style="width:14px;flex-shrink:0;"></span>';
      
      const paramsBtn = `<button class="ae-params" data-id="${obj.id}" title="Parâmetros" style="width:14px;height:14px;background:none;border:none;color:#666;cursor:pointer;font-size:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">${showParams ? '▾' : '▸'}</button>`;

      return `
        <div class="ae-layer-row ${isSelected?'sel':''}" data-id="${obj.id}" data-index="${index}" draggable="true" style="height:${LAYER_ROW_H}px;display:flex;align-items:center;padding:0 6px;border-bottom:1px solid #151520;background:${isSelected?'rgba(74,158,255,0.08)':'transparent'};cursor:grab;gap:3px;margin-left:${depth * 16}px;">
          ${expandBtn}
          <button class="ae-vis" data-id="${obj.id}" style="width:18px;height:18px;background:none;border:none;color:${isVisible?'#777':'#333'};cursor:pointer;font-size:11px;flex-shrink:0;">${isVisible?'👁':'–'}</button>
          <button class="ae-lock" data-id="${obj.id}" style="width:18px;height:18px;background:none;border:none;color:${isLocked?'#f55':'#333'};cursor:pointer;font-size:10px;flex-shrink:0;">${isLocked?'🔒':'·'}</button>
          <div style="width:4px;height:18px;background:${tc};border-radius:2px;flex-shrink:0;"></div>
          <span style="font-size:11px;flex-shrink:0;">${getTypeIcon(obj.type)}</span>
          ${isGroup ? '<span style="font-size:9px;flex-shrink:0;color:#ffd700;" title="Grupo">📂</span>' : ''}
          ${hasLinked ? '<span style="font-size:9px;flex-shrink:0;color:#4cff88;" title="Vinculado">🔗</span>' : ''}
          <span style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:11px;color:${isVisible?'#ccc':'#555'};font-weight:600;">${obj.label||obj.type}</span>
          ${paramsBtn}
          <span style="font-size:8px;color:#444;font-family:'SF Mono',monospace;">${inPt.toFixed(1)}–${outPt.toFixed(1)}</span>
        </div>
        ${showParams ? this._inlineParams(obj) : ''}
      `;
    };

    return `
      <div style="height:100%; display:flex; flex-direction:column; background:#0a0a0f;">
        ${this.layersHeader.render(state)}
        <div style="padding:6px 8px;">
          <input type="text" id="layer-search" placeholder="Buscar..." value="${this.searchTerm}" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:4px; font-size:0.6rem; color:#51c5ff; padding:6px 10px; outline:none;">
        </div>
        <div id="layers-list-container" style="flex:1; overflow-y:auto; overflow-x:hidden;">
          ${orderedObjects.map((obj: any, idx: number) => layerItem(obj, idx)).join('')}
          ${orderedObjects.length === 0 ? '<div style="font-size:11px; opacity:0.2; text-align:center; padding:20px; color:#444;">Nenhuma camada</div>' : ''}
        </div>
      </div>
    `;
  }

  private _inlineParams(obj: any): string {
    const rows: string[] = [];
    rows.push(`<div style="padding:4px 10px;font-size:8px;font-weight:800;color:#555;letter-spacing:1px;text-transform:uppercase;background:#0c0c10;border-bottom:1px solid #151520;">Transform</div>`);
    for (const d of PROP_DEFS) {
      const raw = obj[d.key] ?? 0;
      const dv = Math.round((raw * d.mul) * 100) / 100;
      const pct = Math.max(0, Math.min(100, ((raw - d.min) / (d.max - d.min)) * 100));
      const hasKf = KeyframeManager.hasKeyframes(obj, d.key);
      const active = KeyframeManager.isPropertyActive(obj, d.key);
      const kfTimes = KeyframeManager.getKeyframeTimes(obj, d.key);
      const kfCount = kfTimes.length;
      const kfDot = hasKf ? (active ? '#4a9eff' : '#ffd700') : '#333';
      rows.push(`<div style="display:flex;align-items:center;gap:4px;padding:4px 10px;border-bottom:1px solid #121218;background:#0e0e12;">
        <span class="tl-kf-toggle" data-prop="${d.key}" data-layer="${obj.id}" style="cursor:pointer;font-size:11px;color:${kfDot};width:16px;text-align:center;flex-shrink:0;">${hasKf?'◆':'◇'}</span>
        <span style="font-size:9px;color:#888;width:64px;flex-shrink:0;">${d.label}</span>
        <div class="tl-slider-track" data-prop="${d.key}" data-layer="${obj.id}" data-min="${d.min}" data-max="${d.max}" style="flex:1;height:8px;background:#1a1a22;border-radius:4px;position:relative;cursor:pointer;">
          <div style="position:absolute;top:0;left:0;height:100%;width:${pct}%;background:${d.color}40;border-radius:4px;"></div>
          <div class="tl-slider-thumb" data-prop="${d.key}" data-layer="${obj.id}" data-min="${d.min}" data-max="${d.max}" style="position:absolute;top:50%;left:${pct}%;width:14px;height:14px;background:${d.color};border:2px solid #111;border-radius:50%;transform:translate(-50%,-50%);cursor:grab;"></div>
        </div>
        <input type="number" class="tl-num" data-prop="${d.key}" data-layer="${obj.id}" value="${dv}" step="${d.step}" style="width:50px;background:#08080c;border:1px solid #1a1a22;color:${d.color};font-size:9px;padding:3px 4px;text-align:right;font-family:'SF Mono',monospace;border-radius:3px;">
        <span style="font-size:8px;color:#444;width:16px;flex-shrink:0;">${d.unit}</span>
        ${hasKf?`<span style="font-size:8px;color:#555;">${kfCount}kf</span>`:''}
      </div>`);
    }
    return rows.join('');
  }

  public bind(container: HTMLElement, state: any, callbacks: any) {
    const objects = state.worldMapObjects || [];
    this.layersHeader.bind(container, state, callbacks);
    if (this._globalChangeHandler) {
      document.removeEventListener('worldmap-objects-changed', this._globalChangeHandler);
      document.removeEventListener('worldmap-selection-changed', this._globalChangeHandler);
      document.addEventListener('worldmap-objects-changed', this._globalChangeHandler);
      document.addEventListener('worldmap-selection-changed', this._globalChangeHandler);
    }

    const searchInput = container.querySelector('#layer-search') as HTMLInputElement;
    if (searchInput && this._inputHandler) {
      searchInput.addEventListener('input', this._inputHandler);
    }

    this._state = state;
    this._objects = objects;
    this._callbacks = callbacks;

    if (this._clickHandler) container.removeEventListener('click', this._clickHandler);
    if (this._dblclickHandler) container.removeEventListener('dblclick', this._dblclickHandler);
    if (this._inputHandler) container.removeEventListener('input', this._inputHandler);
    if (this._dragStartHandler) {
      const lc = container.querySelector('#layers-list-container') as HTMLElement;
      if (lc) {
        lc.removeEventListener('dragstart', this._dragStartHandler);
        lc.removeEventListener('dragend', this._dragEndHandler!);
        lc.removeEventListener('dragover', this._dragOverHandler!);
        lc.removeEventListener('dragleave', this._dragLeaveHandler!);
        lc.removeEventListener('drop', this._dropHandler!);
      }
    }

    this._clickHandler = (e: any) => {
      const target = e.target as HTMLElement;

      // Toggle expand (grupo)
      const expBtn = target.closest('.ae-exp') as HTMLElement;
      if (expBtn) {
        e.stopPropagation();
        const id = expBtn.dataset.id!;
        const expanded = this._state.expandedGroupIds || [];
        if (expanded.includes(id)) {
          this._state.expandedGroupIds = expanded.filter((i: string) => i !== id);
        } else {
          this._state.expandedGroupIds = [...expanded, id];
        }
        this._callbacks.reRender();
        return;
      }

      // Toggle params
      const paramsBtn = target.closest('.ae-params') as HTMLElement;
      if (paramsBtn) {
        e.stopPropagation();
        const id = paramsBtn.dataset.id!;
        const expanded = this._state.expandedLayerIds || [];
        if (expanded.includes(id)) {
          this._state.expandedLayerIds = expanded.filter((i: string) => i !== id);
        } else {
          this._state.expandedLayerIds = [...expanded, id];
        }
        this._callbacks.reRender();
        return;
      }

      // Visibility toggle
      const visBtn = target.closest('.ae-vis') as HTMLElement;
      if (visBtn) {
        e.stopPropagation();
        const obj = this._objects.find((o: any) => o.id === visBtn.dataset.id);
        if (obj) obj.isVisible = !obj.isVisible;
        this._callbacks.reRender();
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        return;
      }

      // Lock toggle
      const lockBtn = target.closest('.ae-lock') as HTMLElement;
      if (lockBtn) {
        e.stopPropagation();
        const obj = this._objects.find((o: any) => o.id === lockBtn.dataset.id);
        if (obj) obj.isLocked = !obj.isLocked;
        this._callbacks.reRender();
        return;
      }

      // Layer row selection
      const layerRow = target.closest('.ae-layer-row') as HTMLElement;
      if (layerRow && !target.closest('.ae-vis') && !target.closest('.ae-lock') && !target.closest('.ae-exp') && !target.closest('.ae-params')) {
        e.stopPropagation();
        const id = layerRow.dataset.id!;
        const isCtrl = e.ctrlKey || e.metaKey;
        const isShift = e.shiftKey;
        const clickedObj = this._objects.find((o: any) => o.id === id);
        const isGroup = clickedObj && (clickedObj.type === 'group' || clickedObj._isGroup);
        const groupChildren = clickedObj?._childIds || [];
        let newSelection: string[] = [];
        
        if (isCtrl) {
          if (this._state.selectedIds.includes(id)) {
            if (isGroup) newSelection = this._state.selectedIds.filter((sid: string) => sid !== id && !groupChildren.includes(sid));
            else newSelection = this._state.selectedIds.filter((sid: string) => sid !== id);
          } else {
            if (isGroup) newSelection = [...this._state.selectedIds, id, ...groupChildren.filter((cid: string) => !this._state.selectedIds.includes(cid))];
            else newSelection = [...this._state.selectedIds, id];
          }
        } else if (isShift && this._state.selectedIds.length > 0) {
          const lastSelected = this._state.selectedIds[this._state.selectedIds.length - 1];
          const lastObj = this._objects.find((o: any) => o.id === lastSelected);
          const lastIsGroup = lastObj && (lastObj.type === 'group' || lastObj._isGroup);
          const lastChildren = lastObj?._childIds || [];
          if (lastIsGroup) newSelection = [id, ...lastChildren];
          else if (isGroup) newSelection = [lastSelected, ...groupChildren];
          else newSelection = [lastSelected, id];
        } else {
          if (isGroup) newSelection = [id, ...groupChildren];
          else newSelection = [id];
        }
        
        this._state.selectedIds = newSelection;
        this._state.selectedId = id;
        document.dispatchEvent(new CustomEvent('worldmap-selection-changed'));
        this._callbacks.reRender();
        return;
      }

      // Keyframe toggle
      const kfBtn = target.closest('.tl-kf-toggle') as HTMLElement;
      if (kfBtn) {
        e.stopPropagation();
        const layerId = kfBtn.dataset.layer!;
        const prop = kfBtn.dataset.prop!;
        const obj = this._objects.find((o: any) => o.id === layerId);
        if (!obj) return;
        const currentValue = obj[prop] ?? 0;
        KeyframeManager.toggleProperty(obj, prop, currentValue);
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        this._callbacks.reRender();
        return;
      }
    };
    container.addEventListener('click', this._clickHandler);

    this._dblclickHandler = (e: any) => {
      const label = (e.target as HTMLElement).closest('.layer-label') as HTMLElement;
      if (label) {
        e.stopPropagation();
        const obj = this._objects.find((o: any) => o.id === label.dataset.id);
        const newLabel = prompt('Renomear:', obj?.label || '');
        if (newLabel && obj) { obj.label = newLabel; this._callbacks.reRender(); }
      }
    };
    container.addEventListener('dblclick', this._dblclickHandler);

    this._inputHandler = (e: any) => {
      const el = e.target as HTMLInputElement;
      if (!el.classList.contains('tl-param-slider') && !el.classList.contains('tl-param-num')) return;
      const layerId = el.dataset.layer!;
      const prop = el.dataset.prop!;
      let val = Number(el.value);
      const obj = this._objects.find((o: any) => o.id === layerId);
      if (!obj) return;
      if (prop === 'opacity') val /= 100;
      
      if (['x', 'y', 'w', 'h', 'rotation'].includes(prop)) {
        document.dispatchEvent(new CustomEvent('worldmap-request-property-update', { detail: { id: layerId, prop, value: val } }));
      } else {
        obj[prop] = val;
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      }
      this._callbacks.reRender();
    };
    container.addEventListener('input', this._inputHandler);

    // Drag and drop
    const listContainer = container.querySelector('#layers-list-container') as HTMLElement;
    if (listContainer) {
      let dragId: string | null = null;
      let dragIndex = -1;
      
      this._dragStartHandler = (e: DragEvent) => {
        const row = (e.target as HTMLElement).closest('.ae-layer-row') as HTMLElement;
        if (row) {
          dragId = row.dataset.id || null;
          dragIndex = parseInt(row.dataset.index || '-1');
          (e.target as HTMLElement).style.opacity = '0.5';
          e.dataTransfer!.effectAllowed = 'move';
        }
      };
      
      this._dragEndHandler = (e: DragEvent) => {
        (e.target as HTMLElement).style.opacity = '1';
        dragId = null;
        dragIndex = -1;
        listContainer.querySelectorAll('.ae-layer-row').forEach(el => {
          (el as HTMLElement).style.borderTop = '';
          (el as HTMLElement).style.borderBottom = '';
        });
      };
      
      this._dragOverHandler = (e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        const row = (e.target as HTMLElement).closest('.ae-layer-row') as HTMLElement;
        if (!row || !dragId) return;
        const targetId = row.dataset.id;
        const targetIndex = parseInt(row.dataset.index || '-1');
        if (targetId === dragId || targetIndex === dragIndex) return;
        
        listContainer.querySelectorAll('.ae-layer-row').forEach(el => {
          (el as HTMLElement).style.borderTop = '';
          (el as HTMLElement).style.borderBottom = '';
        });
        
        const rect = row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) row.style.borderTop = '2px solid #51c5ff';
        else row.style.borderBottom = '2px solid #51c5ff';
      };
      
      this._dragLeaveHandler = (e: DragEvent) => {
        const row = (e.target as HTMLElement).closest('.ae-layer-row') as HTMLElement;
        if (row) { row.style.borderTop = ''; row.style.borderBottom = ''; }
      };
      
      this._dropHandler = (e: DragEvent) => {
        e.preventDefault();
        if (!dragId || dragIndex === -1) return;
        
        const row = (e.target as HTMLElement).closest('.ae-layer-row') as HTMLElement;
        if (!row) return;
        
        const targetId = row.dataset.id;
        const targetIndex = parseInt(row.dataset.index || '-1');
        if (targetId === dragId || targetIndex === dragIndex) return;
        
        const objects = this._state.worldMapObjects || [];
        const dragObj = objects.find((o: any) => o.id === dragId);
        const targetObj = objects.find((o: any) => o.id === targetId);
        if (!dragObj || !targetObj) return;
        
        // Prevent circular reference
        if (this.isDescendant(targetObj, dragId, objects)) return;

        const dragObjIdx = objects.indexOf(dragObj);
        if (dragObjIdx === -1) return;
        objects.splice(dragObjIdx, 1);
        
        const rect = row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        
        const isTargetGroup = targetObj._isGroup || targetObj.type === 'camera' || targetObj.type === 'group';
        
        if (e.clientY < midY && isTargetGroup) {
          document.dispatchEvent(new CustomEvent('worldmap-request-parent-change', { detail: { childId: dragId, parentId: targetId } }));
          // Add to objects list near target
          objects.splice(objects.indexOf(targetObj), 0, dragObj);
        } else {
          // dropping between, unparent
          document.dispatchEvent(new CustomEvent('worldmap-request-parent-change', { detail: { childId: dragId, parentId: null } }));
          let newIdx = targetIndex;
          if (e.clientY >= midY) {
            newIdx = targetIndex >= dragIndex ? targetIndex : targetIndex + 1;
          } else {
            newIdx = targetIndex >= dragIndex ? targetIndex - 1 : targetIndex;
          }
          objects.splice(newIdx, 0, dragObj);
        }
        
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        this._callbacks.reRender();
        dragId = null;
      };
      
      listContainer.addEventListener('dragstart', this._dragStartHandler);
      listContainer.addEventListener('dragend', this._dragEndHandler);
      listContainer.addEventListener('dragover', this._dragOverHandler);
      listContainer.addEventListener('dragleave', this._dragLeaveHandler);
      listContainer.addEventListener('drop', this._dropHandler);
    }
  }

  private isDescendant(parent: any, childId: string, objects: any[]): boolean {
    const children = parent._childIds || [];
    for (const id of children) {
      if (id === childId) return true;
      const child = objects.find((o: any) => o.id === id);
      if (child && this.isDescendant(child, childId, objects)) return true;
    }
    return false;
  }
}