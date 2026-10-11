export class SensorEngine {
  private objects: any[];
  private executeEventsCallback: (events: any[], source: any, player: any) => void;

  constructor(objects: any[], executeEventsCallback: (events: any[], source: any, player: any) => void) {
    this.objects = objects;
    this.executeEventsCallback = executeEventsCallback;
  }

  checkTriggers(player: any) {
    const px = player.x;
    const py = player.y;
    const pw = player.w || 50;
    const ph = player.h || 50;

    for (const obj of this.objects) {
      if (obj.isVisible === false) continue;
      if (obj.isEnabled === false) continue;

      const isCollisionType = obj.type === 'collision' || (obj.type === 'vector' && (obj._targetType === 'collision' || obj.collisionMode !== undefined));
      const isAreaSensorType = obj.type === 'area_sensor' || obj.type === 'sensor' || obj.type === 'area' || (obj.type === 'vector' && (obj._targetType === 'area_sensor' || obj.navType !== undefined));
      if (!isCollisionType && !isAreaSensorType) continue;

      let eventsKey: string;
      if (obj.type === 'collision') eventsKey = 'colEvents';
      else if (obj.type === 'vector') eventsKey = obj._targetType === 'collision' ? 'colEvents' : 'area_sensorEvents';
      else if (obj.type === 'area_sensor') eventsKey = 'area_sensorEvents';
      else eventsKey = `${obj.type}Events`;

      const events = obj[eventsKey];
      if (!events || events.length === 0) continue;

      let isInSensor = false;

      if (isCollisionType) {
        // Se tem parent morph, usar dimensões do parent
        let parentObj: any = null;
        if (obj.parentId) {
          parentObj = this.objects.find((o: any) => o.id === obj.parentId);
        }
        
        const scale = (obj.collisionScale || 100) / 100;
        const useW = parentObj ? parentObj.w : obj.w;
        const useH = parentObj ? parentObj.h : obj.h;
        const useX = parentObj ? parentObj.x : obj.x;
        const useY = parentObj ? parentObj.y : obj.y;
        
        const ow = useW * scale;
        const oh = useH * scale;
        const ox = useX + (useW - ow) / 2;
        const oy = useY + (useH - oh) / 2;
        isInSensor = px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy;
      } else {
        // Area sensor / sensor: use distance-based radius
        // Se tem parent morph, usar dimensões do parent
        let parentObj: any = null;
        if (obj.parentId) {
          parentObj = this.objects.find((o: any) => o.id === obj.parentId);
        }
        
        const playerCX = px + pw / 2;
        const playerCY = py + ph / 2;
        const useX = parentObj ? parentObj.x : obj.x;
        const useY = parentObj ? parentObj.y : obj.y;
        const useW = parentObj ? parentObj.w : (obj.w || 100);
        const useH = parentObj ? parentObj.h : (obj.h || 100);
        
        const objCX = useX + useW / 2;
        const objCY = useY + useH / 2;
        const radius = obj.sensorRadius || Math.max(useW, useH);
        const dist = Math.hypot(playerCX - objCX, playerCY - objCY);
        isInSensor = dist <= radius;
      }

      const wasInSensor = obj._playerInSensor || false;
      const trigger = obj.sensorTrigger || 'onEnter';

      if (trigger === 'onEnter' && !wasInSensor && isInSensor) {
        this.executeEventsCallback(events, obj, player);
      } else if (trigger === 'onExit' && wasInSensor && !isInSensor) {
        this.executeEventsCallback(events, obj, player);
      } else if (trigger === 'onStay' && isInSensor) {
        if (!obj._sensorCooldown || Date.now() - obj._sensorCooldown > 1000) {
          this.executeEventsCallback(events, obj, player);
          obj._sensorCooldown = Date.now();
        }
      }

      obj._playerInSensor = isInSensor;
    }
  }

  checkInteractTriggers(player: any) {
    const px = player.x;
    const py = player.y;
    const pw = player.w || 50;
    const ph = player.h || 50;

    for (const obj of this.objects) {
      if (obj.isVisible === false) continue;
      if (obj.isEnabled === false) continue;
      if (obj.sensorTrigger !== 'onInteract') continue;

      const playerCX = px + pw / 2;
      const playerCY = py + ph / 2;
      const objCX = obj.x + (obj.w || 100) / 2;
      const objCY = obj.y + (obj.h || 100) / 2;
      const radius = (obj.sensorRadius || Math.max(obj.w || 100, obj.h || 100)) * 1.5; // Slight range boost for interaction
      const dist = Math.hypot(playerCX - objCX, playerCY - objCY);

      if (dist <= radius) {
        let eventsKey: string;
        if (obj.type === 'collision') eventsKey = 'colEvents';
        else if (obj.type === 'vector') eventsKey = obj._targetType === 'collision' ? 'colEvents' : 'area_sensorEvents';
        else if (obj.type === 'area_sensor') eventsKey = 'area_sensorEvents';
        else eventsKey = `${obj.type}Events`;

        const events = obj[eventsKey];
        if (events && events.length > 0) {
          this.executeEventsCallback(events, obj, player);
        }
      }
    }
  }
}
