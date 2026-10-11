import { gsap } from 'gsap';
import { ParallaxLayer } from '../../../../core/types';

export function animateParallaxLayers(container: HTMLElement, layers: ParallaxLayer[]) {
    if (!layers || layers.length === 0) return;

    layers.forEach(layer => {
        const el = container.querySelector(`[data-layer-id="${layer.id}"]`) as HTMLElement;
        if (!el) return;

        // Subtle swaying motion
        const intensity = layer.speed * 20; // base intensity pixels
        
        gsap.to(el, {
            x: `+=${intensity}`,
            y: `+=${intensity / 2}`,
            rotation: 0.5,
            duration: 3 + Math.random() * 2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });

        // Slight breathing scale
        gsap.to(el, {
            scale: (layer.scale || 1) * 1.05,
            duration: 4 + Math.random() * 2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    });
}
