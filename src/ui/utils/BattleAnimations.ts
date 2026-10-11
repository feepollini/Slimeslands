import { gsap } from 'gsap';
import { spawnCombatBurst } from './ParticleUtils';

/**
 * Visual effects and animations for Legends of Winter battle system.
 * Ported from battleMain.ts to reduce file size and increase modularity.
 */

export function spawnParticles(x: number, y: number, color = '#ff4400', count = 18) {
  const c = document.getElementById('particle-container');
  if (!c) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `background:${color};left:${x}px;top:${y}px;
      position:absolute;width:6px;height:6px;border-radius:50%;pointer-events:none;`;
    c.appendChild(p);
    const angle = (Math.PI * 2 * i) / count;
    const dist = 50 + Math.random() * 80;
    gsap.to(p, {
      x: Math.cos(angle) * dist, y: Math.sin(angle) * dist,
      opacity: 0, scale: 0.1, duration: 0.6 + Math.random() * 0.3, ease: 'power2.out',
      onComplete: () => p.remove(),
    });
  }
}

export function deathExplosion(el: Element, onDone?: () => void) {
  const rect = el.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  spawnParticles(centerX, centerY, '#ff2200', 30);
  spawnParticles(centerX, centerY, '#ffaa00', 20);
  spawnParticles(centerX, centerY, '#ffffff', 10);

  // Screen shake on death
  gsap.to(document.getElementById('board'), { x: 10, y: -5, duration: 0.05, repeat: 7, yoyo: true });

  gsap.to(el, {
    scale: 2.2,
    opacity: 0,
    filter: 'brightness(15) blur(20px)',
    duration: 0.6,
    ease: 'power3.in',
    onComplete: onDone,
  });
}

export function spawnFloatingText(slotIdx: number, text: string, color = '#ff4444', fontSize = '1.1rem') {
  const slot = document.querySelector(`[data-idx="${slotIdx}"]`);
  const container = document.getElementById('float-container');
  if (!slot || !container) return;
  const rect = slot.getBoundingClientRect();
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `
    position:fixed;
    left:${rect.left + rect.width / 2}px;
    top:${rect.top + rect.height / 2}px;
    transform:translate(-50%,-50%);
    color:${color};
    font-size:${fontSize};
    font-weight:900;
    font-family:'Orbitron',monospace;
    text-shadow:0 0 8px ${color},0 0 20px ${color};
    pointer-events:none;
    white-space:nowrap;
    z-index:9001;
  `;
  container.appendChild(el);
  gsap.fromTo(el,
    { opacity: 1, y: 0, scale: 0.6 },
    { opacity: 0, y: -60, scale: 1.3, duration: 0.9, ease: 'power2.out', onComplete: () => el.remove() }
  );
}

export function triggerAbilityAnim(trigger: { abilityId: string; cardIdx: number; value?: number; color: string; triggerText: string; icon: string }) {
  const val = trigger.value !== undefined ? ` ${trigger.value}` : '';
  spawnFloatingText(trigger.cardIdx, `${trigger.icon} ${trigger.triggerText}${val}`, trigger.color, '0.9rem');
  const slotEl = document.querySelector(`[data-idx="${trigger.cardIdx}"] .card-face`) as HTMLElement | null;
  if (!slotEl) return;
  const glow = trigger.color;
  switch (trigger.abilityId) {
    case 'reflect':
      gsap.timeline()
        .to(slotEl, { boxShadow: `0 0 30px 10px ${glow}`, duration: 0.1 })
        .to(slotEl, { boxShadow: '0 0 0px 0px transparent', duration: 0.4 });
      break;
    case 'resilience':
      gsap.timeline()
        .to(slotEl, { scale: 1.15, filter: `brightness(3) drop-shadow(0 0 20px ${glow})`, duration: 0.15 })
        .to(slotEl, { scale: 1, filter: 'none', duration: 0.4, ease: 'elastic.out(1,0.3)' });
      break;
    case 'rivalry':
      gsap.timeline()
        .to(slotEl, { x: 5, repeat: 5, yoyo: true, duration: 0.05 })
        .to(slotEl, { x: 0, duration: 0.1 });
      break;
  }
}

export async function animateCapsulePv(idx: number, oldPv: number, newPv: number): Promise<void> {
  const slot = document.querySelector(`[data-idx="${idx}"]`);
  if (!slot) return Promise.resolve();
  const pvCapsule = slot.querySelector('.capsule.pv, .premium-pv-badge');
  if (!pvCapsule) return Promise.resolve();

  const diff = newPv - oldPv;
  if (diff === 0) return Promise.resolve();

  return new Promise(resolve => {
    const isPremium = pvCapsule.classList.contains('premium-pv-badge');
    pvCapsule.textContent = isPremium ? `${newPv}` : `❤️${newPv}`;
    const color = diff > 0 ? '#4eff4e' : '#ff4e4e';
    gsap.timeline({ onComplete: resolve })
      .fromTo(pvCapsule, { scale: 1.5, color: color, filter: 'brightness(2)' }, { scale: 1, color: isPremium ? '' : '#fff', filter: 'brightness(1)', duration: 0.5, ease: 'back.out' });
  });
}

export async function animateManaChange(side: 'p' | 'e', oldVal: number, newVal: number): Promise<void> {
  if (side === 'e') return Promise.resolve();
  const segments = document.querySelectorAll(`#segments-mana-p .attr-segment`);
  if (!segments.length) return Promise.resolve();
  const diff = newVal - oldVal;
  if (diff === 0) return Promise.resolve();

  return new Promise(resolve => {
    const tl = gsap.timeline({ onComplete: resolve });
    const container = document.getElementById(`segments-mana-p`);
    if (container) {
        const rect = container.getBoundingClientRect();
        const floatTxt = document.createElement('div');
        floatTxt.textContent = diff > 0 ? `+${diff}` : `${diff}`;
        floatTxt.style.cssText = `position:fixed; left:${rect.right + 10}px; top:${rect.top}px; color:#51c5ff; font-weight:900; font-size:1.2rem; pointer-events:none; z-index:10000; text-shadow:0 0 10px #51c5ff;`;
        document.body.appendChild(floatTxt);
        gsap.to(floatTxt, { y: -40, opacity: 0, scale: 1.5, duration: 0.8, ease: 'power2.out', onComplete: () => floatTxt.remove() });
    }

    segments.forEach((seg, i) => {
      if (i < newVal) seg.classList.add('active');
      else seg.classList.remove('active');
    });

    if (diff > 0) {
      for (let i = oldVal; i < newVal; i++) {
        if (segments[i]) tl.fromTo(segments[i], { scale: 2.5, filter: 'brightness(3)' }, { scale: 1, filter: 'brightness(1)', duration: 0.4 }, (i - oldVal) * 0.1);
      }
    } else {
      for (let i = newVal; i < oldVal; i++) {
        if (segments[i]) tl.to(segments[i], { scale: 0.5, opacity: 0.3, duration: 0.3 }, (oldVal - 1 - i) * 0.1);
      }
    }
  });
}

export async function animateStaminaChange(side: 'p' | 'e', oldVal: number, newVal: number): Promise<void> {
  if (side === 'e') return Promise.resolve();
  const segments = document.querySelectorAll(`#segments-stam-p .attr-segment`);
  if (!segments.length) return Promise.resolve();
  const diff = newVal - oldVal;
  if (diff === 0) return Promise.resolve();

  return new Promise(resolve => {
    const tl = gsap.timeline({ onComplete: resolve });
    const container = document.getElementById(`segments-stam-p`);
    if (container) {
        const rect = container.getBoundingClientRect();
        const floatTxt = document.createElement('div');
        floatTxt.textContent = diff > 0 ? `+${diff}` : `${diff}`;
        floatTxt.style.cssText = `position:fixed; left:${rect.right + 10}px; top:${rect.top}px; color:#ffd700; font-weight:900; font-size:1.2rem; pointer-events:none; z-index:10000; text-shadow:0 0 10px #ffd700;`;
        document.body.appendChild(floatTxt);
        gsap.to(floatTxt, { y: -40, opacity: 0, scale: 1.5, duration: 0.8, ease: 'power2.out', onComplete: () => floatTxt.remove() });
    }

    segments.forEach((seg, i) => {
      if (i < newVal) seg.classList.add('active');
      else seg.classList.remove('active');
    });

    if (diff > 0) {
      for (let i = oldVal; i < newVal; i++) {
        if (segments[i]) tl.fromTo(segments[i], { scale: 2.5, filter: 'brightness(3)' }, { scale: 1, filter: 'brightness(1)', duration: 0.4 }, (i - oldVal) * 0.1);
      }
    } else {
      for (let i = newVal; i < oldVal; i++) {
        if (segments[i]) tl.to(segments[i], { scale: 0.5, opacity: 0.3, duration: 0.3 }, (oldVal - 1 - i) * 0.1);
      }
    }
  });
}

export async function playVFX(vfxId: string, targetEl: HTMLElement, _sourceEl?: HTMLElement, containerEl?: HTMLElement): Promise<void> {
    if (!targetEl || !vfxId) return Promise.resolve();
    
    const overlay = document.createElement('div');
    overlay.className = 'vfx-overlay';
    
    const isFullscreen = vfxId.includes('cataclysm') || vfxId.includes('celestial') || vfxId.includes('void');
    const viewport = containerEl || document.body;

    if (isFullscreen) {
        const isBody = viewport === document.body;
        overlay.style.cssText = `position:${isBody ? 'fixed' : 'absolute'};inset:0;pointer-events:none;z-index:9999;display:flex;align-items:center;justify-content:center;overflow:hidden;transform:translateZ(0);`;
        viewport.appendChild(overlay);
    } else {
        // Exaggerated Local Effect: Move overlay to container level so it can be larger than target
        if (containerEl) {
            const vRect = containerEl.getBoundingClientRect();
            const tRect = targetEl.getBoundingClientRect();
            const centerX = (tRect.left + tRect.width / 2) - vRect.left;
            const centerY = (tRect.top + tRect.height / 2) - vRect.top;

            // HUGE OVERLAY: 400x400 centered on target
            overlay.style.cssText = `position:absolute;width:400px;height:400px;left:${centerX}px;top:${centerY}px;transform:translate(-50%,-50%);pointer-events:none;z-index:9000;overflow:visible;`;
            containerEl.appendChild(overlay);
        } else {
            const tPos = window.getComputedStyle(targetEl).position;
            if (tPos === 'static') targetEl.style.position = 'relative';
            overlay.style.cssText = `position:absolute;inset:-100px;pointer-events:none;z-index:100;border-radius:inherit;overflow:hidden;transform:translateZ(0);`;
            targetEl.appendChild(overlay);
        }
    }

    return new Promise(resolve => {
        const cleanup = () => { overlay.remove(); resolve(); };
        const tl = gsap.timeline({ onComplete: cleanup });

        switch(vfxId) {
            case 'vfx_slash_basic': {
                const slash = document.createElement('div');
                slash.style.cssText = `position:absolute;width:400%;height:15px;background:linear-gradient(90deg, transparent, #fff, transparent);top:50%;left:-150%;transform:rotate(45deg) scaleX(0);box-shadow:0 0 40px #fff;z-index:2;`;
                const slash2 = document.createElement('div');
                slash2.style.cssText = `position:absolute;width:400%;height:6px;background:rgba(255,255,255,0.7);top:50%;left:-150%;transform:rotate(30deg) scaleX(0);box-shadow:0 0 20px #fff;opacity:0.6;z-index:1;`;
                overlay.appendChild(slash);
                overlay.appendChild(slash2);
                
                tl.to(slash, { scaleX: 1, duration: 0.12, ease: 'expo.in' })
                  .to(slash2, { scaleX: 1, duration: 0.1, ease: 'expo.in' }, "-=0.08")
                  .add(() => spawnCombatBurst(overlay, '#ffffff', 30, 180))
                  .to([slash, slash2], { opacity: 0, scaleY: 5, duration: 0.15 });
                
                gsap.to(targetEl, { x: 12, y: 12, yoyo: true, repeat: 4, duration: 0.04 });
                break;
            }
            case 'vfx_heavy_blunt': {
                const impact = document.createElement('div');
                impact.style.cssText = `position:absolute;inset:-100px;background:radial-gradient(circle, #ffd700 10%, #ff4400 40%, transparent 70%);opacity:0;mix-blend-mode:screen;`;
                const shock = document.createElement('div');
                shock.style.cssText = `position:absolute;width:80px;height:80px;border:5px solid #fff;border-radius:50%;left:50%;top:50%;transform:translate(-50%,-50%) scale(0);opacity:0.9;`;
                overlay.appendChild(impact);
                overlay.appendChild(shock);
                
                tl.to(impact, { opacity: 1, scale: 2.5, duration: 0.1, ease: 'power4.out' })
                  .to(shock, { scale: 5, opacity: 0, duration: 0.5 }, 0)
                  .add(() => spawnCombatBurst(overlay, '#ffbb00', 45, 250))
                  .to(impact, { opacity: 0, scale: 3.5, duration: 0.8 });
                
                gsap.to(targetEl, { scale: 0.75, rotation: 5, duration: 0.08, yoyo: true, repeat: 1 });
                gsap.to(document.body, { y: 25, duration: 0.05, yoyo: true, repeat: 10 });
                break;
            }
            case 'vfx_dimensional_slash': {
                const tear = document.createElement('div');
                tear.style.cssText = `position:absolute;width:250%;height:300%;background:#000;top:-100%;left:50%;transform:translateX(-50%) scaleX(0) rotate(-25deg);box-shadow:0 0 80px #a335ee;border-left:8px solid #a335ee;border-right:8px solid #a335ee;filter:blur(1px);z-index:2;`;
                const vacuum = document.createElement('div');
                vacuum.style.cssText = `position:absolute;inset:-200px;background:radial-gradient(circle, #a335ee 0%, transparent 70%);opacity:0;mix-blend-mode:overlay;z-index:1;`;
                overlay.appendChild(tear);
                overlay.appendChild(vacuum);
                
                tl.to(vacuum, { opacity: 1, scale: 0.5, duration: 0.3, ease: 'power2.in' })
                  .to(tear, { scaleX: 0.8, duration: 0.2, ease: 'power4.out' })
                  .add(() => spawnCombatBurst(overlay, '#a335ee', 40, 300))
                  .to(targetEl, { scale: 0.5, opacity: 0.4, rotation: -10, duration: 0.2 }, "-=0.1")
                  .to(tear, { scaleX: 0, duration: 0.5, delay: 0.4, ease: 'power2.in' })
                  .to(targetEl, { scale: 1.3, opacity: 1, rotation: 0, duration: 0.4, ease: 'back.out' }, "-=0.2")
                  .to(vacuum, { opacity: 0, duration: 0.6 }, "-=0.5");
                
                gsap.fromTo(targetEl, { filter: 'hue-rotate(240deg) brightness(3)' }, { filter: 'none', duration: 1.2, delay: 0.3 });
                break;
            }
            case 'vfx_celestial_judgment': {
                const flashFill = document.createElement('div');
                flashFill.style.cssText = `position:absolute;inset:-1000px;background:#fff;opacity:0;z-index:100;`;
                overlay.appendChild(flashFill);
                
                tl.to(flashFill, { opacity: 1, duration: 0.5, ease: 'power2.in' });
                
                for(let i=0; i<5; i++) {
                   const beam = document.createElement('div');
                   const xOff = (i - 2) * 80;
                   beam.style.cssText = `position:absolute;width:60px;height:300vh;background:linear-gradient(to bottom, #fff, #ffffaa, transparent);top:-300vh;left:calc(50% + ${xOff}px);transform:translateX(-50%);box-shadow:0 0 100px #fff;opacity:0;z-index:5;`;
                   overlay.appendChild(beam);
                   tl.to(beam, { top: '-50vh', opacity: 1, duration: 0.15, delay: i*0.1 }, 0.4);
                   tl.to(beam, { opacity: 0, scaleX: 0, duration: 0.8 }, 0.6 + i*0.1);
                }

                tl.add(() => spawnCombatBurst(overlay, '#ffffaa', 60, 400), 0.5)
                  .to(flashFill, { opacity: 0, duration: 2.0 }, 0.5);
                  
                gsap.to(document.body, { x: 30, y: -30, rotation: 3, yoyo: true, repeat: 20, duration: 0.04, delay: 0.5 });
                break;
            }
            case 'vfx_fire_persistent':
            case 'vfx_fire_cataclysm': {
                const heat = document.createElement('div');
                heat.style.cssText = `position:absolute;inset:-50px;background:#ff4400;opacity:0;mix-blend-mode:color-dodge;filter:blur(30px);z-index:1;`;
                overlay.appendChild(heat);
                
                tl.to(heat, { opacity: 0.7, duration: 0.3 })
                  .add(() => {
                      for(let i=0; i<6; i++) {
                          setTimeout(() => spawnCombatBurst(overlay, '#ff8800', 10, 100), i*80);
                      }
                  })
                  .to(heat, { opacity: 0, duration: 1.2 });
                
                gsap.to(targetEl, { filter: 'brightness(3) saturate(3) hue-rotate(-20deg)', duration: 0.4, yoyo: true, repeat: 1 });
                gsap.to(document.body, { filter: 'sepia(1) contrast(1.5)', duration: 0.8, yoyo: true, repeat: 1 });
                break;
            }
            case 'vfx_ice_prison':
            case 'vfx_absolute_zero': {
                const flash = document.createElement('div');
                flash.style.cssText = `position:absolute;inset:0;background:#51c5ff;opacity:0;mix-blend-mode:screen;z-index:2;`;
                const crystal = document.createElement('div');
                crystal.style.cssText = `position:absolute;inset:-10px;border:4px solid #fff;background:rgba(255,255,255,0.2);backdrop-filter:blur(10px);opacity:0;z-index:1;clip-path:polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);`;
                overlay.appendChild(flash);
                overlay.appendChild(crystal);
                
                tl.to(flash, { opacity: 0.6, duration: 0.1 })
                  .to(crystal, { opacity: 1, scale: 1.2, duration: 0.3, ease: 'back.out' })
                  .add(() => spawnCombatBurst(overlay, '#51c5ff', 20, 80))
                  .to(flash, { opacity: 0, duration: 0.4 })
                  .to(crystal, { opacity: 0, scale: 1.5, duration: 0.8, delay: 0.4 });
                
                gsap.to(targetEl, { filter: 'saturate(0) brightness(1.5) blur(1px)', duration: 0.3, yoyo: true, repeat: 1 });
                break;
            }
            case 'vfx_toxic_miasma': {
                for (let i = 0; i < 4; i++) {
                   const cloud = document.createElement('div');
                   cloud.style.cssText = `position:absolute;inset:-100px;background:radial-gradient(circle, rgba(76,255,136,0.6) 0%, transparent 70%);opacity:0;filter:blur(30px);z-index:${i};`;
                   overlay.appendChild(cloud);
                   tl.to(cloud, { opacity: 0.8, scale: 2.0, x: (i-1.5)*50, y: (i%2===0?-30:30), duration: 0.6 + i*0.2, ease: 'sine.out' }, i*0.1);
                   tl.to(cloud, { opacity: 0, scale: 2.5, duration: 1.0, delay: 0.5 });
                }
                tl.add(() => spawnCombatBurst(overlay, '#4cff88', 25, 200));
                gsap.to(targetEl, { filter: 'sepia(1) hue-rotate(90deg) brightness(0.5)', duration: 0.8, yoyo: true, repeat: 1 });
                break;
            }
            case 'vfx_blood_drain':
            case 'vfx_blood_sacrifice': {
                const splash = document.createElement('div');
                splash.style.cssText = `position:absolute;inset:-50px;background:rgba(200,0,0,0.8);opacity:0;mix-blend-mode:multiply;border-radius:50%;filter:blur(20px);`;
                overlay.appendChild(splash);
                tl.to(splash, { opacity: 1, scale: 2, duration: 0.2 })
                  .add(() => spawnCombatBurst(overlay, '#ff0000', 30, 150))
                  .to(splash, { opacity: 0, scale: 2.5, duration: 0.8 });
                gsap.to(targetEl, { filter: 'invert(1) hue-rotate(180deg) contrast(200%)', scale: 0.9, duration: 0.2, yoyo: true, repeat: 1 });
                break;
            }
            case 'vfx_holy_aegis': {
                const dome = document.createElement('div');
                dome.style.cssText = `position:absolute;inset:-10px;border-radius:50%;border:2px solid #ffffaa;box-shadow:0 0 15px #ffffaa;opacity:0;transform:scale(0.8);`;
                overlay.appendChild(dome);
                tl.to(dome, { opacity: 1, scale: 1.1, duration: 0.3, ease: 'back.out(2)' })
                  .to(dome, { opacity: 0, scale: 1.2, duration: 0.5, delay: 0.2 });
                break;
            }
            case 'vfx_phantom_strike':
            case 'vfx_phantom_step': {
                const ghost = document.createElement('div');
                ghost.style.cssText = `position:absolute;inset:0;background:rgba(170,170,255,0.3);opacity:0;`;
                overlay.appendChild(ghost);
                tl.to(ghost, { opacity: 1, scale: 1.1, duration: 0.1 })
                  .to(ghost, { opacity: 0, scale: 1.3, duration: 0.4 });
                gsap.to(targetEl, { opacity: 0.5, duration: 0.1, yoyo: true, repeat: 3 });
                break;
            }
            case 'vfx_void_implosion':
            case 'vfx_siphon_cast': {
                const voidSphere = document.createElement('div');
                voidSphere.style.cssText = `position:absolute;width:50px;height:50px;background:#000;border-radius:50%;left:50%;top:50%;transform:translate(-50%,-50%) scale(0);box-shadow:0 0 20px #a335ee;`;
                overlay.appendChild(voidSphere);
                tl.to(voidSphere, { scale: 3, duration: 0.4, ease: 'power2.in' })
                  .to(voidSphere, { scale: 0, duration: 0.1 });
                  
                gsap.to(targetEl, { filter: 'brightness(0)', duration: 0.4, yoyo: true, repeat: 1 });
                break;
            }
            case 'vfx_claw_flurry': {
                tl.add(() => {
                    [[-30, 20], [0, -10], [30, 30]].forEach(([x,y], i) => {
                        setTimeout(() => {
                            const claw = document.createElement('div');
                            claw.style.cssText = `position:absolute;width:120%;height:3px;background:linear-gradient(90deg, transparent, #ff3333, transparent);top:50%;left:-10%;transform:translate(${x}px, ${y}px) rotate(${15 + i*20}deg) scaleX(0);box-shadow:0 0 10px #ff3333;`;
                            overlay.appendChild(claw);
                            gsap.to(claw, { scaleX: 1, duration: 0.05, ease: 'power2.in', onComplete: () => { gsap.to(claw, { opacity: 0, scaleY: 2, duration: 0.1 }); } });
                            gsap.to(targetEl, { x: (i%2===0?-4:4), y: 3, yoyo: true, repeat: 1, duration: 0.03 });
                        }, i * 100);
                    });
                });
                tl.to(targetEl, { delay: 0.4, onComplete: () => {} });
                break;
            }
            case 'vfx_pierce_light': {
                const ray = document.createElement('div');
                ray.style.cssText = `position:absolute;width:20px;height:200%;background:#fff;top:-50%;left:50%;transform:translateX(-50%) rotate(45deg);box-shadow:0 0 30px #ffffaa;opacity:0;mix-blend-mode:overlay;`;
                overlay.appendChild(ray);
                tl.to(ray, { opacity: 1, duration: 0.1 })
                  .to(ray, { width: '200%', opacity: 0, duration: 0.3, ease: 'power4.out' });
                gsap.fromTo(targetEl, { filter: 'brightness(3) saturate(0)' }, { filter: 'none', duration: 0.4 });
                break;
            }
            case 'vfx_seismic_slam': {
                const rock = document.createElement('div');
                rock.style.cssText = `position:absolute;bottom:-20px;left:-20px;right:-20px;height:40px;background:rgba(204,136,85,0.8);border-radius:50%;filter:blur(8px);opacity:0;transform:scaleY(0.2);`;
                overlay.appendChild(rock);
                tl.to(rock, { opacity: 1, scaleY: 2, duration: 0.1 })
                  .to(rock, { opacity: 0, scaleX: 1.5, scaleY: 0.5, duration: 0.4 });
                gsap.to(targetEl, { y: -20, duration: 0.1, yoyo: true, repeat: 1, ease: 'power2.out' });
                gsap.to(document.body, { y: 15, duration: 0.05, yoyo: true, repeat: 5 });
                break;
            }
            case 'vfx_acid_rain': {
                for (let i = 0; i < 15; i++) {
                   const drop = document.createElement('div');
                   drop.style.cssText = `position:absolute;width:4px;height:20px;background:#55ff22;top:-30px;left:${Math.random()*100}%;border-radius:10px;box-shadow:0 0 8px #55ff22;opacity:0.8;`;
                   overlay.appendChild(drop);
                   gsap.to(drop, { top: '100%', opacity: 0, duration: 0.2 + Math.random()*0.2, delay: Math.random()*0.3 });
                }
                tl.to(targetEl, { filter: 'hue-rotate(60deg) saturate(2)', duration: 0.6, yoyo: true, repeat: 1 });
                break;
            }
            case 'vfx_electro_shock': {
                const flash = document.createElement('div');
                flash.style.cssText = `position:absolute;inset:0;background:#ffe500;mix-blend-mode:screen;opacity:0;`;
                overlay.appendChild(flash);
                tl.to(flash, { opacity: 0.9, duration: 0.05, repeat: 5, yoyo: true });
                gsap.to(targetEl, { x: 3, y: -3, duration: 0.05, repeat: 5, yoyo: true });
                break;
            }
            case 'vfx_nature_blessing': {
                for (let i = 0; i < 8; i++) {
                   const leaf = document.createElement('div');
                   leaf.style.cssText = `position:absolute;width:12px;height:12px;background:#2ecc71;border-radius:0 10px 0 10px;top:50%;left:50%;opacity:0;`;
                   overlay.appendChild(leaf);
                   gsap.fromTo(leaf, 
                     { x: 0, y: 0, rotation: Math.random()*360, opacity: 1 }, 
                     { x: (Math.random()-0.5)*100, y: (Math.random()-0.5)*100 - 50, rotation: '+=180', opacity: 0, duration: 0.8 + Math.random()*0.4 }
                   );
                }
                tl.to(targetEl, { delay: 1, onComplete: () => {} });
                break;
            }
            case 'vfx_rage_aura': {
                const heat = document.createElement('div');
                heat.style.cssText = `position:absolute;inset:-15px;background:radial-gradient(circle, rgba(255,34,34,0.4) 0%, transparent 70%);opacity:0;mix-blend-mode:screen;filter:blur(5px);`;
                overlay.appendChild(heat);
                tl.to(heat, { opacity: 1, duration: 0.3 }).to(heat, { opacity: 0.4, scale: 1.1, duration: 0.1, yoyo: true, repeat: 3 }).to(heat, { opacity: 0, duration: 0.4 });
                break;
            }
            case 'vfx_crystal_barrier': {
                const crystal = document.createElement('div');
                crystal.style.cssText = `position:absolute;inset:0;border:8px solid rgba(170,255,255,0.6);border-radius:inherit;clip-path:polygon(10% 0, 90% 0, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0 90%, 0 10%);opacity:0;box-shadow:inset 0 0 20px #aaffff;`;
                overlay.appendChild(crystal);
                tl.to(crystal, { opacity: 1, duration: 0.2 }).to(crystal, { opacity: 0, scale: 1.2, duration: 0.4, delay: 0.3 });
                break;
            }
            case 'vfx_tsunami_crush': {
                const wave = document.createElement('div');
                wave.style.cssText = `position:absolute;width:600%;height:300%;background:linear-gradient(to right, transparent, #0055ff, #00bbff, rgba(255,255,255,0.9));top:-100%;left:-600%;opacity:0.9;transform:skewX(-30deg);filter:blur(5px);z-index:10;`;
                overlay.appendChild(wave);
                tl.to(wave, { left: '200%', duration: 0.8, ease: 'power2.in' })
                  .add(() => spawnCombatBurst(overlay, '#51c5ff', 40, 350));
                gsap.to(targetEl, { x: 80, rotation: 15, duration: 0.4, yoyo: true, repeat: 1, delay: 0.2, ease: 'power2.out' });
                gsap.to(document.body, { x: -20, duration: 0.1, yoyo: true, repeat: 8 });
                break;
            }
            case 'vfx_time_fracture': {
                tl.to(targetEl, { filter: 'grayscale(1) invert(1)', duration: 0.1 })
                  .to(targetEl, { scale: 0.9, duration: 0.5, ease: 'steps(5)' })
                  .to(targetEl, { filter: 'none', scale: 1, duration: 0.1 });
                for(let i = 0; i < 5; i++) {
                   const slice = document.createElement('div');
                   slice.style.cssText = `position:absolute;width:120%;height:2px;background:#fff;top:${Math.random()*100}%;left:-10%;transform:rotate(${(Math.random()-0.5)*90}deg);box-shadow:0 0 10px #fff;opacity:0;`;
                   overlay.appendChild(slice);
                   gsap.to(slice, { opacity: 1, delay: 0.1 + i*0.1, duration: 0.05 });
                   gsap.to(slice, { opacity: 0, delay: 0.6, duration: 0.1 });
                }
                gsap.to(document.body, { filter: 'sepia(1) hue-rotate(-90deg)', duration: 0.6, yoyo: true, repeat: 1 });
                break;
            }
            case 'vfx_meteor_strike': {
                const shadow = document.createElement('div');
                shadow.style.cssText = `position:absolute;inset:-1000px;background:#000;opacity:0;z-index:50;`;
                const fireball = document.createElement('div');
                fireball.style.cssText = `position:absolute;width:200px;height:200px;background:radial-gradient(circle, #fff, #ffcc00, #ff4400, transparent);border-radius:50%;top:-500px;left:50%;transform:translateX(-50%);box-shadow:0 0 100px #ff4400;z-index:60;`;
                overlay.appendChild(shadow);
                overlay.appendChild(fireball);

                tl.to(shadow, { opacity: 0.7, duration: 0.6 })
                  .to(fireball, { top: '50%', scale: 1.5, duration: 0.5, ease: 'power2.in' }, 0.4)
                  .add(() => {
                      spawnCombatBurst(overlay, '#ff8800', 80, 500);
                      const f = document.createElement('div');
                      f.style.cssText = `position:absolute;inset:-1000px;background:#fff;z-index:100;opacity:0;`;
                      overlay.appendChild(f);
                      gsap.to(f, { opacity: 1, duration: 0.1, yoyo: true, repeat: 1, onComplete: () => f.remove() });
                  })
                  .to(fireball, { opacity: 0, scale: 4, duration: 0.2 })
                  .to(shadow, { opacity: 0, duration: 0.8 });
                  
                gsap.to(document.body, { y: 40, x: 20, rotation: 4, duration: 0.05, repeat: 15, yoyo: true, delay: 0.9 });
                gsap.to(targetEl, { scale: 0.6, y: 100, duration: 0.1, yoyo: true, repeat: 1, delay: 0.9 });
                break;
            }
            default: {
                const fallback = document.createElement('div');
                fallback.style.cssText = `position:absolute;inset:0;background:rgba(255,255,255,0.5);opacity:0;`;
                overlay.appendChild(fallback);
                tl.to(fallback, { opacity: 1, duration: 0.1 }).to(fallback, { opacity: 0, duration: 0.2 });
                gsap.to(targetEl, { x: 5, yoyo: true, repeat: 3, duration: 0.05 });
                break;
            }
        }
    });
}
