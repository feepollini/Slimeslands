import { gsap } from 'gsap';

export function spawnSparkParticles(container: HTMLElement, color = '#ffaa00', count = 30) {
  // Clear existing particles if they are marked
  const existing = container.querySelectorAll('.particle-effect-item');
  existing.forEach(p => p.remove());

  for (let i = 0; i < count; i++) {
    const spark = document.createElement('div');
    spark.className = 'particle-effect-item';
    const size = Math.random() * 3 + 1;
    spark.style.cssText = `
      position:absolute;
      left:${Math.random() * 100}%;
      top:${Math.random() * 100}%;
      width:${size}px;
      height:${size}px;
      background:${color};
      border-radius:50%;
      filter:blur(1px) drop-shadow(0 0 5px ${color});
      opacity:0;
      pointer-events:none;
      z-index:5;
    `;
    container.appendChild(spark);

    gsap.to(spark, {
      opacity: Math.random() * 0.8 + 0.2,
      y: -100 - Math.random() * 200,
      x: (Math.random() - 0.5) * 100,
      duration: 3 + Math.random() * 4,
      repeat: -1,
      delay: Math.random() * 5,
      ease: 'power1.out',
      onRepeat: () => {
        gsap.set(spark, { left: `${Math.random() * 100}%`, top: '100%', y: 0 });
      }
    });
  }
}

export function spawnAtmosphericFog(container: HTMLElement, color = '#ffffff', count = 10) {
    const existing = container.querySelectorAll('.particle-effect-item');
    existing.forEach(p => p.remove());

    for (let i = 0; i < count; i++) {
        const fog = document.createElement('div');
        fog.className = 'particle-effect-item';
        const size = 150 + Math.random() * 200;
        fog.style.cssText = `
          position:absolute;
          left:${Math.random() * 120 - 10}%;
          top:${Math.random() * 120 - 10}%;
          width:${size}px;
          height:${size}px;
          background:${color};
          border-radius:50%;
          filter:blur(80px);
          opacity:0;
          pointer-events:none;
          z-index:2;
        `;
        container.appendChild(fog);

        gsap.to(fog, {
            opacity: Math.random() * 0.15 + 0.05,
            x: (Math.random() - 0.5) * 150,
            y: (Math.random() - 0.5) * 150,
            scale: 1.5,
            duration: 8 + Math.random() * 10,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        });
    }
}

export function spawnMagicSwirl(container: HTMLElement, color = '#a335ee', count = 20) {
    const existing = container.querySelectorAll('.particle-effect-item');
    existing.forEach(p => p.remove());

    for (let i = 0; i < count; i++) {
        const dot = document.createElement('div');
        dot.className = 'particle-effect-item';
        dot.style.cssText = `
          position:absolute;
          left:50%;
          top:50%;
          width:4px;
          height:4px;
          background:${color};
          border-radius:50%;
          box-shadow: 0 0 10px ${color};
          pointer-events:none;
          opacity:0;
          z-index:6;
        `;
        container.appendChild(dot);

        const angle = Math.random() * Math.PI * 2;
        const radius = 50 + Math.random() * 150;
        
        gsap.to(dot, {
            opacity: 1,
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            duration: 2 + Math.random() * 3,
            repeat: -1,
            ease: 'power1.inOut',
            onRepeat: () => {
                gsap.set(dot, { x: 0, y: 0, opacity: 0 });
            }
        });
    }
}

/** One-shot burst for impacts (cleans itself up) */
export function spawnCombatBurst(container: HTMLElement, color = '#ffffff', count = 15, range = 100) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    const size = Math.random() * 4 + 2;
    p.style.cssText = `
      position:absolute;
      left:50%;
      top:50%;
      width:${size}px;
      height:${size}px;
      background:${color};
      border-radius:2px;
      transform:translate(-50%,-50%);
      pointer-events:none;
      z-index:100;
      box-shadow: 0 0 10px ${color};
    `;
    container.appendChild(p);

    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * range + 50;
    
    gsap.to(p, {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      opacity: 0,
      scale: 0.1,
      duration: 0.5 + Math.random() * 0.5,
      ease: 'power2.out',
      onComplete: () => p.remove()
    });
  }
}
