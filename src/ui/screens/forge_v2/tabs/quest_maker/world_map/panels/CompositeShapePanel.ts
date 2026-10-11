import { WorldMapMain } from '../WorldMapMain';

export class CompositeShapePanel {
  private _state: any = {};
  private _callbacks: any = null;
  private _allObjects: any[] = [];

  render(state: any, callbacks: any): string {
    this._state = state;
    this._callbacks = callbacks;
    this._allObjects = state.worldMapObjects || [];
    const selectedId = state.selectedId;
    const selectedObj = this._allObjects.find((o: any) => o.id === selectedId);
    
    if (!selectedObj) {
      return this._renderEmpty('Selecione um objeto');
    }

    const isMorphOrAsset = selectedObj.type === 'morph' || selectedObj.type === 'image' || selectedObj.type === 'asset';
    
    if (!isMorphOrAsset) {
      return this._renderEmpty('Selecione um asset ou morph');
    }

    const childCollisions = this._allObjects.filter((o: any) => o.parentId === selectedObj.id && o.type === 'collision');
    const childSensors = this._allObjects.filter((o: any) => o.parentId === selectedObj.id && (o.type === 'area_sensor' || o.type === 'sensor'));

    const collision = childCollisions[0];
    const sensor = childSensors[0];

    return `
      <div style="padding:12px; display:flex; flex-direction:column; gap:16px;">
        <div style="font-size:0.65rem; font-weight:900; color:#ff4466; letter-spacing:1px; padding-bottom:8px; border-bottom:1px solid rgba(255,68,68,0.2);">
          ◇ FORMAS COMPOSTAS (A6)
        </div>
        
        ${this._renderCollisionSection(collision, selectedObj)}
        ${this._renderSensorSection(sensor, selectedObj)}
        
        <button class="apply-composite-shapes" data-parent-id="${selectedObj.id}" style="
          padding:10px; background:rgba(255,68,68,0.1); border:1px solid rgba(255,68,68,0.3);
          border-radius:6px; color:#ff4466; font-size:0.55rem; font-weight:900; cursor:pointer;
          margin-top:8px;
        ">💾 APLICAR FORMAS COMPOSTAS</button>
      </div>
    `;
  }

  private _renderEmpty(msg: string): string {
    return `<div style="padding:20px; text-align:center; color:#666; font-size:0.6rem;">${msg}</div>`;
  }

  private _renderCollisionSection(collision: any, parent: any): string {
    const shape = collision?.shape || 'rect';
    const scaleW = collision?.w ? collision.w / (parent?.w || 100) : 1;
    const scaleH = collision?.h ? collision.h / (parent?.h || 100) : 1;
    
    return `
      <div style="background:rgba(255,68,68,0.05); border:1px solid rgba(255,68,68,0.15); border-radius:8px; padding:12px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <span style="font-size:0.8rem;">🧱</span>
          <span style="font-size:0.55rem; font-weight:900; color:#ff4466;">FORMA DE COLISÃO</span>
          <span style="font-size:0.4rem; color:rgba(255,68,68,0.5);">${collision ? '✓ Vinculada' : '✗ Não vinculada'}</span>
        </div>
        
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; margin-bottom:12px;">
          <button class="shape-select collision" data-shape="rect" data-type="collision" style="
            padding:8px 4px; border:1px solid ${shape === 'rect' ? '#ff4466' : 'rgba(255,68,68,0.2)'};
            border-radius:4px; background:${shape === 'rect' ? 'rgba(255,68,68,0.2)' : 'transparent'};
            color:#ff4466; font-size:0.45rem; cursor:pointer;
          ">▢</button>
          <button class="shape-select collision" data-shape="circle" data-type="collision" style="
            padding:8px 4px; border:1px solid ${shape === 'circle' ? '#ff4466' : 'rgba(255,68,68,0.2)'};
            border-radius:4px; background:${shape === 'circle' ? 'rgba(255,68,68,0.2)' : 'transparent'};
            color:#ff4466; font-size:0.45rem; cursor:pointer;
          ">●</button>
          <button class="shape-select collision" data-shape="capsule" data-type="collision" style="
            padding:8px 4px; border:1px solid ${shape === 'capsule' ? '#ff4466' : 'rgba(255,68,68,0.2)'};
            border-radius:4px; background:${shape === 'capsule' ? 'rgba(255,68,68,0.2)' : 'transparent'};
            color:#ff4466; font-size:0.45rem; cursor:pointer;
          ">⬭</button>
          <button class="shape-select collision" data-shape="triangle" data-type="collision" style="
            padding:8px 4px; border:1px solid ${shape === 'triangle' ? '#ff4466' : 'rgba(255,68,68,0.2)'};
            border-radius:4px; background:${shape === 'triangle' ? 'rgba(255,68,68,0.2)' : 'transparent'};
            color:#ff4466; font-size:0.45rem; cursor:pointer;
          ">▲</button>
        </div>
        
        <div style="display:flex; gap:12px;">
          <div style="flex:1;">
            <label style="font-size:0.45rem; color:#ff4466; display:block; margin-bottom:4px;">Escala Largura</label>
            <input type="range" class="collision-scale" data-prop="w" min="0.1" max="3" step="0.1" value="${scaleW}" style="width:100%; accent-color:#ff4466;">
            <span class="collision-scale-val" style="font-size:0.4rem; color:#ff4466;">${(scaleW * 100).toFixed(0)}%</span>
          </div>
          <div style="flex:1;">
            <label style="font-size:0.45rem; color:#ff4466; display:block; margin-bottom:4px;">Escala Altura</label>
            <input type="range" class="collision-scale" data-prop="h" min="0.1" max="3" step="0.1" value="${scaleH}" style="width:100%; accent-color:#ff4466;">
            <span class="collision-scale-val" style="font-size:0.4rem; color:#ff4466;">${(scaleH * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    `;
  }

  private _renderSensorSection(sensor: any, parent: any): string {
    const shape = sensor?.shape || 'rect';
    const scaleW = sensor?.w ? sensor.w / (parent?.w || 100) : 1.2;
    const scaleH = sensor?.h ? sensor.h / (parent?.h || 100) : 1.2;
    
    return `
      <div style="background:rgba(68,204,255,0.05); border:1px solid rgba(68,204,255,0.15); border-radius:8px; padding:12px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <span style="font-size:0.8rem;">◫</span>
          <span style="font-size:0.55rem; font-weight:900; color:#44ccff;">FORMA DE SENSOR</span>
          <span style="font-size:0.4rem; color:rgba(68,204,255,0.5);">${sensor ? '✓ Vinculada' : '✗ Não vinculada'}</span>
        </div>
        
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; margin-bottom:12px;">
          <button class="shape-select sensor" data-shape="rect" data-type="sensor" style="
            padding:8px 4px; border:1px solid ${shape === 'rect' ? '#44ccff' : 'rgba(68,204,255,0.2)'};
            border-radius:4px; background:${shape === 'rect' ? 'rgba(68,204,255,0.2)' : 'transparent'};
            color:#44ccff; font-size:0.45rem; cursor:pointer;
          ">▢</button>
          <button class="shape-select sensor" data-shape="circle" data-type="sensor" style="
            padding:8px 4px; border:1px solid ${shape === 'circle' ? '#44ccff' : 'rgba(68,204,255,0.2)'};
            border-radius:4px; background:${shape === 'circle' ? 'rgba(68,204,255,0.2)' : 'transparent'};
            color:#44ccff; font-size:0.45rem; cursor:pointer;
          ">●</button>
          <button class="shape-select sensor" data-shape="capsule" data-type="sensor" style="
            padding:8px 4px; border:1px solid ${shape === 'capsule' ? '#44ccff' : 'rgba(68,204,255,0.2)'};
            border-radius:4px; background:${shape === 'capsule' ? 'rgba(68,204,255,0.2)' : 'transparent'};
            color:#44ccff; font-size:0.45rem; cursor:pointer;
          ">⬭</button>
          <button class="shape-select sensor" data-shape="triangle" data-type="sensor" style="
            padding:8px 4px; border:1px solid ${shape === 'triangle' ? '#44ccff' : 'rgba(68,204,255,0.2)'};
            border-radius:4px; background:${shape === 'triangle' ? 'rgba(68,204,255,0.2)' : 'transparent'};
            color:#44ccff; font-size:0.45rem; cursor:pointer;
          ">▲</button>
        </div>
        
        <div style="display:flex; gap:12px;">
          <div style="flex:1;">
            <label style="font-size:0.45rem; color:#44ccff; display:block; margin-bottom:4px;">Escala Largura</label>
            <input type="range" class="sensor-scale" data-prop="w" min="0.1" max="3" step="0.1" value="${scaleW}" style="width:100%; accent-color:#44ccff;">
            <span class="sensor-scale-val" style="font-size:0.4rem; color:#44ccff;">${(scaleW * 100).toFixed(0)}%</span>
          </div>
          <div style="flex:1;">
            <label style="font-size:0.45rem; color:#44ccff; display:block; margin-bottom:4px;">Escala Altura</label>
            <input type="range" class="sensor-scale" data-prop="h" min="0.1" max="3" step="0.1" value="${scaleH}" style="width:100%; accent-color:#44ccff;">
            <span class="sensor-scale-val" style="font-size:0.4rem; color:#44ccff;">${(scaleH * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    `;
  }

  bind(container: HTMLElement, state: any, callbacks: any) {
    this._state = state;
    this._callbacks = callbacks;
    this._allObjects = state.worldMapObjects || [];

    container.querySelectorAll('.shape-select').forEach(btn => {
      btn.addEventListener('click', () => {
        const shape = (btn as HTMLElement).dataset.shape;
        const type = (btn as HTMLElement).dataset.type;
        
        const allBtns = container.querySelectorAll(`.shape-select.${type}`);
        allBtns.forEach((b: any) => {
          b.style.borderColor = 'rgba(255,255,255,0.1)';
          b.style.background = 'transparent';
        });
        (btn as HTMLElement).style.borderColor = type === 'collision' ? '#ff4466' : '#44ccff';
        (btn as HTMLElement).style.background = type === 'collision' ? 'rgba(255,68,68,0.2)' : 'rgba(68,204,255,0.2)';
        
        (btn as HTMLElement).dataset.selected = shape;
      });
    });

    container.querySelectorAll('.collision-scale').forEach(input => {
      input.addEventListener('input', (e: any) => {
        const val = e.target.value;
        const prop = e.target.dataset.prop;
        const label = container.querySelector(`.collision-scale-val`);
        if (label) label.textContent = (val * 100).toFixed(0) + '%';
      });
    });

    container.querySelectorAll('.sensor-scale').forEach(input => {
      input.addEventListener('input', (e: any) => {
        const val = e.target.value;
        const prop = e.target.dataset.prop;
        const label = container.querySelector(`.sensor-scale-val`);
        if (label) label.textContent = (val * 100).toFixed(0) + '%';
      });
    });

    container.querySelectorAll('.apply-composite-shapes').forEach(btn => {
      btn.addEventListener('click', () => {
        const parentId = (btn as HTMLElement).dataset.parentId;
        const parent = this._allObjects.find((o: any) => o.id === parentId);
        if (!parent) return;

        const collisionBtn = container.querySelector('.shape-select.collision[data-selected]') as HTMLElement;
        const sensorBtn = container.querySelector('.shape-select.sensor[data-selected]') as HTMLElement;
        
        const collisionScaleW = (container.querySelector('.collision-scale[data-prop="w"]') as HTMLInputElement)?.value || '1';
        const collisionScaleH = (container.querySelector('.collision-scale[data-prop="h"]') as HTMLInputElement)?.value || '1';
        const sensorScaleW = (container.querySelector('.sensor-scale[data-prop="w"]') as HTMLInputElement)?.value || '1.2';
        const sensorScaleH = (container.querySelector('.sensor-scale[data-prop="h"]') as HTMLInputElement)?.value || '1.2';

        let collisionShape = collisionBtn?.dataset.shape || 'rect';
        let sensorShape = sensorBtn?.dataset.shape || 'rect';

        const existingCollision = this._allObjects.find((o: any) => o.parentId === parentId && o.type === 'collision');
        const existingSensor = this._allObjects.find((o: any) => o.parentId === parentId && (o.type === 'area_sensor' || o.type === 'sensor'));

        if (existingCollision) {
          existingCollision.shape = collisionShape;
          existingCollision.w = parent.w * parseFloat(collisionScaleW);
          existingCollision.h = parent.h * parseFloat(collisionScaleH);
        } else {
          const newCollision: any = {
            id: 'collision_' + Date.now(),
            type: 'collision',
            x: parent.x,
            y: parent.y,
            w: parent.w * parseFloat(collisionScaleW),
            h: parent.h * parseFloat(collisionScaleH),
            shape: collisionShape,
            label: 'Colisão',
            color: '#ff4444',
            isVisible: true,
            isEnabled: true,
            parentId: parentId,
            groupId: parent.groupId || parentId,
            isPersistent: true,
            collisionMode: 'total',
          };
          this._allObjects.push(newCollision);
        }

        if (existingSensor) {
          existingSensor.shape = sensorShape;
          existingSensor.w = parent.w * parseFloat(sensorScaleW);
          existingSensor.h = parent.h * parseFloat(sensorScaleH);
        } else {
          const newSensor: any = {
            id: 'area_sensor_' + Date.now(),
            type: 'area_sensor',
            x: parent.x,
            y: parent.y,
            w: parent.w * parseFloat(sensorScaleW),
            h: parent.h * parseFloat(sensorScaleH),
            shape: sensorShape,
            label: 'Sensor de Área',
            color: '#44ccff',
            isVisible: true,
            opacity: 0.2,
            parentId: parentId,
            groupId: parent.groupId || parentId,
            isPersistent: true,
            navType: 'walkable',
            sensorTrigger: 'onEnter',
          };
          this._allObjects.push(newSensor);
        }

        callbacks.reRender();
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      });
    });
  }
}