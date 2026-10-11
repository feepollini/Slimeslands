export class EventExecutor {
  private centerCameraCallback: () => void;
  private state: any;

  constructor(centerCameraCallback: () => void, state: any) {
    this.centerCameraCallback = centerCameraCallback;
    this.state = state;
  }

  execute(events: any[], source: any, player: any) {
    console.log('[EventExecutor] execute called with events:', events?.length, 'source:', source?.id);
    for (const ev of events) {
      if (!ev.type || ev.type === 'none') continue;

      const detail: any = {
        action: ev.type,
        sourceId: source.id,
        sourceLabel: source.label,
        sourceType: source.type,
        playerId: player.id,
      };

      if (ev.type === 'showDialog') {
        detail.dialogText = ev.dialogText;
        if (ev.dialogText) {
          alert(`💬 ${source.label}:\n${ev.dialogText}`);
        }
      }
      else if (ev.type === 'playScene') {
        detail.sceneId = ev.sceneId;
        detail.transition = ev.sceneTransition || 'fade';
        this.executePlayScene(ev, player, source);
      }
      else if (ev.type === 'phaseChange') detail.phaseId = ev.phaseId;
      else if (ev.type === 'playAudio') {
        detail.audioFile = ev.audio;
        if (ev.audio) {
          try {
            const audio = new Audio(ev.audio);
            audio.volume = 0.7;
            audio.play().catch(() => {});
          } catch (e) {
            console.error(`Audio play failed: ${ev.audio}`, e);
          }
        }
      }
      else if (ev.type === 'spawnEntity') detail.spawnId = ev.spawnId;
      else if (ev.type === 'dealDamage') {
        detail.damage = ev.damage || 0;
        console.log(`⚔️ Dano: ${ev.damage} de ${source.label}`);
      }
      else if (ev.type === 'deliverItem') {
        detail.itemId = ev.itemId;
        console.log(`📦 Item entregue: ${ev.itemId}`);
      }
      else if (ev.type === 'animatedInteraction') {
        detail.interactionId = ev.interactionId;
        console.log(`🎭 Interação: ${ev.interactionId}`);
      }
      else if (ev.type === 'portal') {
        detail.portalX = ev.portalX || 0;
        detail.portalY = ev.portalY || 0;
        player.x = ev.portalX || 0;
        player.y = ev.portalY || 0;
        this.centerCameraCallback();
      }

      document.dispatchEvent(new CustomEvent('sensor-trigger', { detail }));
    }
  }

  private executePlayScene(ev: any, player: any, source: any) {
    const savedScenes = this.state?.savedScenes || [];
    const scene = savedScenes.find((s: any) => s.name === ev.sceneId || s.id === ev.sceneId);
    if (!scene) {
      console.warn(`Scene not found: ${ev.sceneId}`);
      return;
    }

    const objects = this.state?.worldMapObjects || [];
    const transition = ev.sceneTransition || 'fade';
    const triggerX = source?.x || 0;
    const triggerY = source?.y || 0;
    const isLocal = scene.saveMode === 'local';

    // Find scene center
    let sceneCX = 0, sceneCY = 0, count = 0;
    scene.objects.forEach((o: any) => { sceneCX += o.x || 0; sceneCY += o.y || 0; count++; });
    if (count > 0) { sceneCX /= count; sceneCY /= count; }

    if (isLocal) {
      // LOCAL SCENE: camera moves to scene location
      // First check which objects already exist vs need spawning
      const existingIds = new Set(objects.map((o: any) => o.id));
      const toSpawn: any[] = [];
      const toUpdate: any[] = [];

      scene.objects.forEach((o: any) => {
        if (existingIds.has(o.id)) {
          toUpdate.push(o);
        } else {
          toSpawn.push(o);
        }
      });

      // Spawn missing objects instantly before camera arrives
      toSpawn.forEach((o: any) => {
        objects.push({ ...o });
      });

      // Update existing objects - blend their properties
      toUpdate.forEach((sceneObj: any) => {
        const existing = objects.find((wo: any) => wo.id === sceneObj.id);
        if (existing) {
          // Store original positions for blend
          existing._origX = existing.x;
          existing._origY = existing.y;
          existing._origW = existing.w;
          existing._origH = existing.h;
          existing._targetX = sceneObj.x;
          existing._targetY = sceneObj.y;
          existing._targetW = sceneObj.w;
          existing._targetH = sceneObj.h;
          existing._targetOpacity = sceneObj.opacity;
          existing._isBlending = true;
          existing._blendStart = performance.now();
          existing._blendDuration = 600;
        }
      });

      if (transition === 'camera_pan') {
        // Camera pans to scene, objects blend during pan
        document.dispatchEvent(new CustomEvent('scene-pan-to', {
          detail: { x: sceneCX, y: sceneCY, player, duration: 1000 }
        }));
        // Start blend animation
        this.startBlendAnimation();
      } else {
        // Fade: screen goes black, objects blend, screen returns
        this.fadeTransition(() => {
          toUpdate.forEach((sceneObj: any) => {
            const existing = objects.find((wo: any) => wo.id === sceneObj.id);
            if (existing) {
              existing.x = sceneObj.x;
              existing.y = sceneObj.y;
              existing.w = sceneObj.w;
              existing.h = sceneObj.h;
              existing.opacity = sceneObj.opacity ?? 1;
              existing._isBlending = false;
            }
          });
          document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
        });
      }
    } else {
      // MOTIONS SCENE: objects spawn at trigger position
      const offsetX = triggerX - sceneCX;
      const offsetY = triggerY - sceneCY;

      // Check which objects already exist (blend) vs need spawning
      const existingIds = new Set(objects.map((o: any) => o.id));
      const toSpawn: any[] = [];
      const toUpdate: any[] = [];

      scene.objects.forEach((o: any) => {
        if (existingIds.has(o.id)) {
          toUpdate.push(o);
        } else {
          toSpawn.push(o);
        }
      });

      // Spawn missing objects instantly before camera arrives
      toSpawn.forEach((o: any) => {
        const clone = JSON.parse(JSON.stringify(o));
        clone.id = clone.id + '_scene_' + Date.now();
        clone.x = (o.x || 0) + offsetX;
        clone.y = (o.y || 0) + offsetY;
        objects.push(clone);
      });

      // Update existing objects with blend
      toUpdate.forEach((sceneObj: any) => {
        const existing = objects.find((wo: any) => wo.id === sceneObj.id);
        if (existing) {
          existing._origX = existing.x;
          existing._origY = existing.y;
          existing._targetX = (sceneObj.x || 0) + offsetX;
          existing._targetY = (sceneObj.y || 0) + offsetY;
          existing._targetOpacity = sceneObj.opacity;
          existing._isBlending = true;
          existing._blendStart = performance.now();
          existing._blendDuration = 400;
        }
      });

      this.fadeTransition(() => {
        toUpdate.forEach((sceneObj: any) => {
          const existing = objects.find((wo: any) => wo.id === sceneObj.id);
          if (existing) {
            existing.x = (sceneObj.x || 0) + offsetX;
            existing.y = (sceneObj.y || 0) + offsetY;
            existing.opacity = sceneObj.opacity ?? 1;
            existing._isBlending = false;
          }
        });
        document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));
      });
    }
  }

  private startBlendAnimation() {
    const animate = () => {
      const objects = this.state?.worldMapObjects || [];
      let stillBlending = false;

      objects.forEach((o: any) => {
        if (!o._isBlending) return;
        stillBlending = true;
        const elapsed = performance.now() - o._blendStart;
        const progress = Math.min(elapsed / o._blendDuration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);

        if (o._origX !== undefined && o._targetX !== undefined) {
          o.x = o._origX + (o._targetX - o._origX) * eased;
        }
        if (o._origY !== undefined && o._targetY !== undefined) {
          o.y = o._origY + (o._targetY - o._origY) * eased;
        }
        if (o._origW !== undefined && o._targetW !== undefined) {
          o.w = o._origW + (o._targetW - o._origW) * eased;
        }
        if (o._origH !== undefined && o._targetH !== undefined) {
          o.h = o._origH + (o._targetH - o._origH) * eased;
        }
        if (o._targetOpacity !== undefined) {
          o.opacity = o._targetOpacity;
        }

        if (progress >= 1) {
          o._isBlending = false;
          delete o._origX; delete o._origY; delete o._origW; delete o._origH;
          delete o._targetX; delete o._targetY; delete o._targetW; delete o._targetH;
          delete o._targetOpacity; delete o._blendStart; delete o._blendDuration;
        }
      });

      document.dispatchEvent(new CustomEvent('worldmap-objects-changed'));

      if (stillBlending) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  private fadeTransition(callback: () => void) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      background:#000; z-index:9999; opacity:0;
      transition:opacity 0.3s ease; pointer-events:none;
    `;
    document.body.appendChild(overlay);

    // Fade in
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });

    // Execute callback during black
    setTimeout(() => {
      callback();

      // Fade out
      overlay.style.opacity = '0';
      setTimeout(() => { overlay.remove(); }, 300);
    }, 400);
  }
}
