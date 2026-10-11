import { gsap } from 'gsap';
import { ParallaxLayer } from '../../core/types';

export function animateParallaxLayers(container: HTMLElement, layers: ParallaxLayer[]) {
    if (!layers || layers.length === 0) return;

    layers.forEach(layer => {
        const el = container.querySelector(`[data-layer-id="${layer.id}"]`) as HTMLElement;
        if (!el) return;

        // Reset previous animations
        gsap.killTweensOf(el);
        gsap.set(el, { clearProps: "all" });
        
        // Re-apply base styles that might clones stripped
        el.style.backgroundImage = `url('${layer.url}')`;
        el.style.zIndex = (layer.z || 1).toString();
        el.style.opacity = (layer.opacity || 1).toString();
        el.style.mixBlendMode = layer.blendMode || 'normal';
        el.style.transform = `scale(${layer.scale || 1}) translate(${layer.initialX || 0}px, ${layer.initialY || 0}px)`;
        if (layer.imageFilter) el.style.filter = layer.imageFilter;

        const anim = layer.animation || 'sway';
        const power = (layer.animationIntensity ?? 1);
        const dur = (4 - (power * 2)) + Math.random(); // Higher power = faster

        if (anim === 'sway') {
            gsap.to(el, {
                x: `+=${20 * power}`,
                rotation: 0.5 * power,
                duration: dur,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });
        } else if (anim === 'zoom') {
            gsap.to(el, {
                scale: (layer.scale || 1) * (1 + (0.2 * power)),
                duration: dur * 1.5,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });
        } else if (anim === 'pulse') {
            gsap.to(el, {
                opacity: (layer.opacity || 1) * 0.4,
                duration: dur / 2,
                repeat: -1,
                yoyo: true,
                ease: "power2.inOut"
            });
        } else if (anim === 'float') {
            gsap.to(el, {
                y: `-=${30 * power}`,
                duration: dur * 1.2,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });
        } else if (anim === 'slide') {
            gsap.to(el, {
                x: `+=${50 * power}`,
                duration: dur * 2,
                repeat: -1,
                yoyo: true,
                ease: "none"
            });
        }
    });
}
