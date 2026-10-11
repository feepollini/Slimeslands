export class LayersHeader {
  private _boundHandlers: Map<string, EventListener> = new Map();

  public render(state?: any): string {
    const selectedIds = state?.selectedIds || [];
    const objects = state?.worldMapObjects || [];
    
    const hasSelection = selectedIds.length > 0;
    const hasMultiple = selectedIds.length > 1;
    const hasLinkable = selectedIds.length >= 2;
    const canUnlink = selectedIds.some((id: string) => {
      const obj = objects.find((o: any) => o.id === id);
      return obj?.parentId;
    });

    return `
      <div style="padding:6px; border-bottom:1px solid rgba(255,255,255,0.06); background:rgba(0,0,0,0.3);">
        <div style="display:flex; gap:3px; margin-bottom:4px;">
          <button class="lh-btn" data-action="new-scene" title="Nova Cena" style="
            flex:1; padding:5px 3px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
            border-radius:3px; color:#fff; font-size:0.5rem; font-weight:800; cursor:pointer;
          ">📁 Cena</button>
          <button class="lh-btn" data-action="new-layer" title="Nova Camada" style="
            flex:1; padding:5px 3px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
            border-radius:3px; color:#fff; font-size:0.5rem; font-weight:800; cursor:pointer;
          ">+ Layer</button>
        </div>
        <div style="display:flex; gap:3px; margin-bottom:4px;">
          <button class="lh-btn" data-action="group" title="${hasMultiple ? 'Agrupar selecionados' : 'Criar grupo'}" style="
            flex:1; padding:5px 3px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
            border-radius:3px; color:#fff; font-size:0.5rem; font-weight:800; cursor:pointer;
          ">📂 ${hasMultiple ? 'Agrupar' : 'Grupo'}</button>
          <button class="lh-btn" data-action="ungroup" title="Desagrupar" ${!hasMultiple ? 'disabled' : ''} style="
            flex:1; padding:5px 3px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
            border-radius:3px; color:#fff; font-size:0.5rem; font-weight:800; cursor:pointer;${!hasMultiple ? 'opacity:0.4;' : ''}
          ">⊟ Desagrup</button>
          <button class="lh-btn" data-action="link" title="${canUnlink ? 'Desvincular' : (hasLinkable ? 'Vincular transformação' : 'Selecione 2+ itens')}" ${!canUnlink && !hasLinkable ? 'disabled' : ''} style="
            flex:1; padding:5px 3px; background:rgba(76,255,136,0.08); border:1px solid rgba(76,255,136,0.2);
            border-radius:3px; color:${canUnlink ? '#ff6666' : '#4cff88'}; font-size:0.5rem; font-weight:800; cursor:pointer;${!canUnlink && !hasLinkable ? 'opacity:0.4;' : ''}
          ">${canUnlink ? '⛓️ Desvinc' : '🔗 Vincular'}</button>
        </div>
        <div style="display:flex; gap:3px; margin-bottom:4px;">
          <button class="lh-btn" data-action="lock" title="Travar" style="
            flex:1; padding:5px 3px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
            border-radius:3px; color:#fff; font-size:0.5rem; font-weight:800; cursor:pointer;
          ">🔒 Travar</button>
          <button class="lh-btn" data-action="hide" title="Ocultar" style="
            flex:1; padding:5px 3px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
            border-radius:3px; color:#fff; font-size:0.5rem; font-weight:800; cursor:pointer;
          ">👁️ Ocultar</button>
          <button class="lh-btn" data-action="delete" title="Deletar" ${!hasSelection ? 'disabled' : ''} style="
            flex:1; padding:5px 3px; background:rgba(255,68,68,0.15); border:1px solid rgba(255,68,68,0.3);
            border-radius:3px; color:#ff4444; font-size:0.5rem; font-weight:800; cursor:pointer;${!hasSelection ? 'opacity:0.4;' : ''}
          ">🗑️ Del</button>
        </div>
        <div style="display:flex; align-items:center; gap:4px; margin-bottom:4px;">
          <span style="font-size:0.45rem; color:rgba(255,255,255,0.4); flex-shrink:0;">Opac:</span>
          <input type="range" id="lh-opacity" min="0" max="100" value="100" style="flex:1; accent-color:#51c5ff; height:3px;">
          <span id="lh-opacity-val" style="font-size:0.45rem; color:#51c5ff; font-weight:800; width:25px; text-align:right;">100%</span>
        </div>
        <button class="lh-btn" data-action="save-scene" title="Salvar Cena" style="
          width:100%; padding:6px 3px; background:rgba(81,197,255,0.15); border:1px solid rgba(81,197,255,0.3);
          border-radius:3px; color:#51c5ff; font-size:0.55rem; font-weight:900; cursor:pointer;
        ">💾 SALVAR CENA</button>
        <button class="lh-btn" data-action="load-scene" title="Carregar Cena" style="
          width:100%; padding:6px 3px; background:rgba(167,139,250,0.1); border:1px solid rgba(167,139,250,0.2);
          border-radius:3px; color:#a78bfa; font-size:0.55rem; font-weight:900; cursor:pointer;
        ">📂 CARREGAR CENA</button>
      </div>
    `;
  }

  public bind(container: HTMLElement, state: any, callbacks: any) {
    this._boundHandlers.forEach((_handler: EventListener) => {
      container.removeEventListener('click', _handler);
    });
    this._boundHandlers.clear();

    const opacitySlider = container.querySelector('#lh-opacity') as HTMLInputElement;
    const opacityVal = container.querySelector('#lh-opacity-val') as HTMLElement;
    if (opacitySlider && opacityVal) {
      const objects = state.worldMapObjects || [];
      const selectedIds = state.selectedIds || [];
      if (state.selectedId) {
        const obj = objects.find((o: any) => o.id === state.selectedId);
        if (obj) opacitySlider.value = String(Math.round((obj.opacity ?? 1) * 100));
      }
      opacityVal.textContent = opacitySlider.value + '%';
      
      const opacityHandler = () => {
        opacityVal.textContent = opacitySlider.value + '%';
        const val = parseInt(opacitySlider.value) / 100;
        selectedIds.forEach((id: string) => {
          const obj = objects.find((o: any) => o.id === id);
          if (obj) obj.opacity = val;
        });
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      };
      opacitySlider.addEventListener('input', opacityHandler);
    }

    const clickHandler = (e: Event) => {
      const btn = (e.target as HTMLElement).closest('.lh-btn') as HTMLElement;
      if (!btn) return;
      
      const action = btn.dataset.action!;
      const objects = state.worldMapObjects || [];
      const selectedIds = state.selectedIds || [];

      if (action === 'new-scene') {
        const sceneId = 'scene_' + Date.now();
        objects.push({
          id: sceneId, type: 'camera', label: 'Cena ' + Date.now().toString().slice(-4),
          x: 0, y: 0, w: 1920, h: 1080, isVisible: true, opacity: 1, artboardId: sceneId, isPersistent: true,
        });
        // Vincular objetos selecionados à nova cena
        if (selectedIds.length > 0) {
          selectedIds.forEach((id: string) => {
            const obj = objects.find((o: any) => o.id === id);
            if (obj) {
              obj.parentId = sceneId;
              obj.artboardId = sceneId;
            }
          });
        }
      } else if (action === 'new-layer') {
        objects.push({
          id: 'layer_' + Date.now(), type: 'morph', label: 'Camada ' + Date.now().toString().slice(-4),
          x: 0, y: 0, w: 100, h: 100, isVisible: true, opacity: 1, artboardId: 'default', isPersistent: true,
        });
      } else if (action === 'group') {
        if (selectedIds.length > 1) {
          const groupId = 'group_' + Date.now();
          
          // Calcular bounds dos objetos selecionados
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          const selectedObjs = selectedIds.map((id: string) => objects.find((o: any) => o.id === id)).filter(Boolean);
          
          for (const obj of selectedObjs) {
            minX = Math.min(minX, obj.x);
            minY = Math.min(minY, obj.y);
            maxX = Math.max(maxX, obj.x + (obj.w || 0));
            maxY = Math.max(maxY, obj.y + (obj.h || 0));
          }
          
          const groupW = maxX - minX || 1;
          const groupH = maxY - minY || 1;
          
          // Grupo container - organização lógica (groupId), NÃO transform hierárquica
          // Para hierarquia de transformação, use "Vincular"
          objects.push({
            id: groupId, type: 'group', label: 'Grupo ' + Date.now().toString().slice(-4), _isGroup: true,
            x: minX, y: minY, w: groupW, h: groupH,
            _childIds: [...selectedIds],
            isVisible: true, opacity: 1, artboardId: 'default', isPersistent: true,
          });
          
          // Marcar filhos com parentId para herdar transformações do grupo
          selectedObjs.forEach((obj: any) => {
            obj.groupId = groupId;
            obj.parentId = groupId; // Vincular para herdar transformações do pai
          });
          
          // Manter filhos selecionados também
          state.selectedIds = [...selectedIds, groupId];
          state.selectedId = groupId;
        } else if (selectedIds.length === 1) {
          const name = prompt('Nome do grupo:', 'Novo Grupo');
          if (name) {
            const obj = objects.find((o: any) => o.id === selectedIds[0]);
            const objX = obj?.x || 0;
            const objY = obj?.y || 0;
            const objW = obj?.w || 100;
            const objH = obj?.h || 100;
            const newGroupId = 'group_' + Date.now();
            
            objects.push({
              id: newGroupId, type: 'group', label: name, _isGroup: true,
              x: objX, y: objY, w: objW, h: objH,
              _childIds: [selectedIds[0]],
              isVisible: true, opacity: 1, artboardId: 'default', isPersistent: true,
            });
            (obj as any).groupId = newGroupId;
            (obj as any).parentId = newGroupId; // Vincular para herdar transformações
          }
        }
      } else if (action === 'ungroup') {
        // Desagrupar - remover parentId e groupId dos filhos e deletar grupo
        const groupObj = objects.find((o: any) => o.id === selectedIds[0] && (o.type === 'group' || o._isGroup));
        if (groupObj && groupObj._childIds) {
          groupObj._childIds.forEach((childId: string) => {
            const child = objects.find((o: any) => o.id === childId);
            if (child) {
              delete child.groupId;
              delete child.parentId; // Remover vínculo de transformação
            }
          });
          // Remover grupo
          state.worldMapObjects = objects.filter((o: any) => o.id !== groupObj.id);
          state.selectedIds = groupObj._childIds || [];
          state.selectedId = state.selectedIds[0] || null;
        }
      } else if (action === 'link') {
        const canUnlink = selectedIds.some((id: string) => {
          const obj = objects.find((o: any) => o.id === id);
          return obj?.parentId;
        });
        if (canUnlink) {
          // Desvincular
          selectedIds.forEach((id: string) => {
            const obj = objects.find((o: any) => o.id === id);
            if (obj && obj.parentId) {
              obj.parentId = null;
              delete obj.linkParentId;
            }
          });
        } else if (selectedIds.length >= 2) {
          // Vincular primeiro como "pai" (para referência futura)
          const parentId = selectedIds[0];
          const parent = objects.find((o: any) => o.id === parentId);
          
          if (parent) {
            // Armazenar linkParentId como referência (não altera render)
            for (let i = 1; i < selectedIds.length; i++) {
              const child = objects.find((o: any) => o.id === selectedIds[i]);
              if (child) {
                child.parentId = parentId;
                child.linkParentId = parentId; // Para possível uso futuro
              }
            }
          }
        }
      } else if (action === 'delete' && selectedIds.length > 0) {
        // === FASE 3: Delete Cascade ===
        const toDelete = new Set<string>();
        
        const collectDeletions = (id: string) => {
          if (toDelete.has(id)) return;
          
          const obj = objects.find((o: any) => o.id === id);
          if (!obj) return;
          
          toDelete.add(id);
          
          // Se é grupo, deletar todos os filhos também
          if (obj._isGroup || obj.type === 'group') {
            if (obj._childIds) {
              obj._childIds.forEach((childId: string) => collectDeletions(childId));
            }
          }
          
          // Se tem parentId, não deletar o pai automaticamente (só deleta oq foi selecionado)
        };
        
        // Primeiro coletar tudo que será deletado
        for (const id of selectedIds) {
          collectDeletions(id);
        }
        
        // Também verificar objetos órfãos após deletar os pais
        const remaining = objects.filter((o: any) => !toDelete.has(o.id));
        for (const obj of remaining) {
          if (obj.parentId && toDelete.has(obj.parentId)) {
            toDelete.add(obj.id);
          }
          if (obj.groupId && toDelete.has(obj.groupId)) {
            toDelete.add(obj.id);
          }
        }
        
        state.worldMapObjects = objects.filter((o: any) => !toDelete.has(o.id));
        state.selectedId = null;
        state.selectedIds = [];
      } else if (action === 'lock') {
        selectedIds.forEach((id: string) => {
          const obj = objects.find((o: any) => o.id === id);
          if (obj) obj.isLocked = !obj.isLocked;
        });
      } else if (action === 'hide') {
        selectedIds.forEach((id: string) => {
          const obj = objects.find((o: any) => o.id === id);
          if (obj) obj.isVisible = obj.isVisible === false ? true : false;
        });
      } else if (action === 'save-scene') {
        document.dispatchEvent(new CustomEvent('open-scene-save-dialog'));
        return;
      } else if (action === 'load-scene') {
        document.dispatchEvent(new CustomEvent('open-scene-load-dialog'));
        return;
      }

      document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      document.dispatchEvent(new CustomEvent('worldmap-selection-changed'));
      callbacks.reRender();
    };

    container.addEventListener('click', clickHandler);
    this._boundHandlers.set('click', clickHandler);
  }
}