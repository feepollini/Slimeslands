import { spawnSparkParticles, spawnAtmosphericFog, spawnMagicSwirl } from './ParticleUtils';

export function isVideoUrl(url: string): boolean {
    return /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url || '');
}

function syncScenarioVideo(el: HTMLElement, suffix: string, videoUrl: string) {
    const SCN_VIDEO_FADE = 0.9; // segundos de blend antes do fim: sem corte seco, parece infinito

    interface ScnVideoState {
        url: string;
        active: number;
        swapping: boolean;
        timer: number | null;
    }

    const scnVideoStates: Map<string, ScnVideoState> =
        ((globalThis as any).__scnVideoStates as Map<string, ScnVideoState>) ||
        (((globalThis as any).__scnVideoStates = new Map<string, ScnVideoState>()) as Map<string, ScnVideoState>);

    const scnLayers = (wrap: HTMLElement): HTMLVideoElement[] => [
        wrap.children[0] as HTMLVideoElement,
        wrap.children[1] as HTMLVideoElement
    ];

    const scnTick = (wrapId: string, forced = false) => {
        const wrap = document.getElementById(wrapId);
        const st = scnVideoStates.get(wrapId);
        if (!wrap || !st || !st.url || st.swapping) return;
        const layers = scnLayers(wrap);
        const a = layers[st.active];
        if (!a.duration || isNaN(a.duration)) return;
        if (!forced && (a.duration - a.currentTime) > SCN_VIDEO_FADE) return;

        // Fim do loop: a 2a camada entra do zero com fade-in enquanto a atual some
        st.swapping = true;
        const nextIdx = 1 - st.active;
        const b = layers[nextIdx];
        b.src = st.url;
        b.currentTime = 0;
        b.style.opacity = '0';
        const doBlend = () => {
            b.style.opacity = '1';
            a.style.opacity = '0';
            st.timer = window.setTimeout(() => {
                a.pause();
                st.active = nextIdx;
                st.swapping = false;
                st.timer = null;
            }, 750);
        };
        try {
            b.play().then(doBlend).catch(() => { st.swapping = false; });
        } catch (e) { st.swapping = false; }
    };

    const wrapId = `scn-video-bg-${suffix}`;
    let wrap = document.getElementById(wrapId);

    if (!videoUrl) {
        if (wrap) {
            const st = scnVideoStates.get(wrapId);
            if (st && st.timer !== null) window.clearTimeout(st.timer);
            scnVideoStates.delete(wrapId);
            wrap.remove();
        }
        return;
    }

    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = wrapId;
        wrap.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;background:#000;';
        for (let i = 0; i < 2; i++) {
            const v = document.createElement('video');
            v.autoplay = true;
            v.muted = true;
            v.preload = 'auto';
            v.setAttribute('playsinline', '');
            v.setAttribute('muted', '');
            v.setAttribute('disablepictureinpicture', '');
            v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.7s ease;';
            wrap.appendChild(v);
        }
        el.appendChild(wrap);
        scnVideoStates.set(wrapId, { url: '', active: 0, swapping: false, timer: null });
        const boundLayers = scnLayers(wrap);
        boundLayers.forEach((v) => {
            v.addEventListener('timeupdate', () => scnTick(wrapId));
            v.addEventListener('ended', () => scnTick(wrapId, true));
        });
    }

    const st = scnVideoStates.get(wrapId)!;
    const layers = scnLayers(wrap);

    if (st.url !== videoUrl) {
        // Troca de video: reseta as duas camadas e entra com fade-in (sem pop)
        if (st.timer !== null) { window.clearTimeout(st.timer); st.timer = null; }
        st.url = videoUrl;
        st.active = 0;
        st.swapping = false;
        const a = layers[0];
        const b = layers[1];
        b.pause();
        b.removeAttribute('src');
        b.load();
        b.style.opacity = '0';
        a.style.opacity = '0';
        a.src = videoUrl;
        a.currentTime = 0;
        try { a.play().catch(() => {}); } catch (e) { console.warn('Video autoplay bloqueado', e); }
        const show = () => { a.style.opacity = '1'; };
        if (a.readyState >= 3) show();
        else a.oncanplay = show;
    } else {
        // Mesmo video (ex. ajuste em tempo real no editor): so garante que esta tocando
        const a = layers[st.active];
        if (a.paused && !st.swapping) { try { a.play().catch(() => {}); } catch (e) { /* silencio */ } }
    }
}

export function generateSvgPattern(type: string, color: string, opacity: number, size = 100, density = 5): string {
    const op = (opacity / 100).toFixed(2);
    let svg = '';

    switch (type) {
        case 'pulse_grid':
            svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><defs><radialGradient id='g' cx='50%' cy='50%' r='50%'><stop offset='0%' stop-color='${color}' stop-opacity='${op}'/><stop offset='100%' stop-color='${color}' stop-opacity='0'/></radialGradient></defs><rect width='100%' height='100%' fill='none' stroke='${color}' stroke-width='0.5' opacity='0.2'/><circle cx='50%' cy='50%' r='40%' fill='url(#g)'><animate attributeName='r' values='0%;45%;0%' dur='${(11-density)}s' repeatCount='indefinite'/></circle></svg>`;
            break;
        case 'neon_rings':
            svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><circle cx='50%' cy='50%' r='30%' fill='none' stroke='${color}' stroke-width='2' opacity='${op}'><animate attributeName='r' values='10%;40%;10%' dur='${(11-density)*1.5}s' repeatCount='indefinite'/><animate attributeName='stroke-width' values='1;4;1' dur='${(11-density)*1.5}s' repeatCount='indefinite'/></circle><circle cx='50%' cy='50%' r='20%' fill='none' stroke='${color}' stroke-width='1' opacity='${(opacity/200).toFixed(2)}'><animate attributeName='r' values='5%;25%;5%' dur='${(11-density)}s' repeatCount='indefinite'/></circle></svg>`;
            break;
        case 'waves':
            const h = size / 2;
            svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size*2}' height='${size}'><path d='M 0 ${h} Q ${size/2} ${size} ${size} ${h} T ${size*2} ${h}' fill='none' stroke='${color}' stroke-width='3' opacity='${op}'><animate attributeName='d' values='M 0 ${h} Q ${size/2} ${size} ${size} ${h} T ${size*2} ${h}; M 0 ${h} Q ${size/2} 0 ${size} ${h} T ${size*2} ${h}; M 0 ${h} Q ${size/2} ${size} ${size} ${h} T ${size*2} ${h}' dur='${(11-density).toFixed(1)}s' repeatCount='indefinite'/></path></svg>`;
            break;
        case 'stars':
            svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><circle cx='20%' cy='30%' r='2' fill='${color}' opacity='${op}'><animate attributeName='opacity' values='0;${op};0' dur='2s' repeatCount='indefinite'/></circle><circle cx='70%' cy='60%' r='1.5' fill='${color}' opacity='${op}'><animate attributeName='opacity' values='0;${op};0' dur='3s' repeatCount='indefinite'/></circle><circle cx='40%' cy='80%' r='2.5' fill='${color}' opacity='${op}'><animate attributeName='opacity' values='0;${op};0' dur='2.5s' repeatCount='indefinite'/></circle></svg>`;
            break;
        case 'lines':
            svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><line x1='0' y1='0' x2='${size}' y2='${size}' stroke='${color}' stroke-width='1' opacity='${op}'><animate attributeName='stroke-dasharray' values='0,${size};${size},0' dur='${(11-density)/2}s' repeatCount='indefinite'/></line></svg>`;
            break;
        case 'hex':
            svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size*0.86}'><path d='M ${size/4} 0 L ${size*3/4} 0 L ${size} ${size*0.43} L ${size*3/4} ${size*0.86} L ${size/4} ${size*0.86} L 0 ${size*0.43} Z' fill='none' stroke='${color}' stroke-width='1' opacity='${op}'/></svg>`;
            break;
        default:
            return '';
    }

    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function applyScenarioBackground(bgVal: string) {
    if (!bgVal) return;

    let animStyle = '';

    try {
        const applyToElement = (el: HTMLElement, isBody: boolean) => {
            const suffix = isBody ? 'global' : 'inner';
            
            if (bgVal.startsWith('{') && bgVal.includes('"mode"')) {
                const bgObj = JSON.parse(bgVal);
                const bgIsVideo = !!(bgObj.url && bgObj.mediaType !== 'image' && (bgObj.mediaType === 'video' || isVideoUrl(bgObj.url)));

                // --- SETUP CSS ANIMATION FOR IMAGES --- //
                // Filtros (vhs/chroma/wave/pulse) foram feitos p/ imagem estatica:
                // com contrast/saturate alto, estouram o video. Video toca limpo.
                let filterAnimClass = '';
                if (!bgIsVideo && bgObj.filter && bgObj.filter !== 'none') {
                    const intval = bgObj.filterVal || 50;
                    filterAnimClass = `scn-${suffix}-${bgObj.filter}`;
                    if (bgObj.filter === 'vhs') {
                        animStyle += `@keyframes scn-${suffix}-vhs { 0% { filter: contrast(1.5) saturate(2) hue-rotate(-15deg) drop-shadow(4px 0 red) drop-shadow(-4px 0 cyan); } 5% { filter: contrast(2) saturate(3) hue-rotate(10deg) drop-shadow(8px 0 red) drop-shadow(-8px 0 cyan); } 10% { filter: contrast(1.5) saturate(2) hue-rotate(-15deg) drop-shadow(4px 0 red) drop-shadow(-4px 0 cyan); } 100% { filter: contrast(1.5) saturate(2) hue-rotate(-15deg) drop-shadow(4px 0 red) drop-shadow(-4px 0 cyan); } }\n`;
                    } else if (bgObj.filter === 'chroma') {
                        animStyle += `@keyframes scn-${suffix}-chroma { 0% { filter: drop-shadow(${intval/10}px 0 red) drop-shadow(-${intval/10}px 0 cyan); } 50% { filter: drop-shadow(${intval/5}px 0 red) drop-shadow(-${intval/5}px 0 cyan); } 100% { filter: drop-shadow(${intval/10}px 0 red) drop-shadow(-${intval/10}px 0 cyan); } }`;
                    } else if (bgObj.filter === 'wave') {
                        animStyle += `@keyframes scn-${suffix}-wave { 0% { filter: blur(${intval/15}px) contrast(1.5); } 50% { filter: blur(${intval/5}px) contrast(1.8); } 100% { filter: blur(${intval/15}px) contrast(1.5); } }`;
                    } else if (bgObj.filter === 'pulse_hue') {
                        animStyle += `@keyframes scn-${suffix}-pulse_hue { 0% { filter: hue-rotate(0deg) saturate(2) brightness(1); } 50% { filter: hue-rotate(${intval*3.6}deg) saturate(5) brightness(1.5); } 100% { filter: hue-rotate(0deg) saturate(2) brightness(1); } }\n`;
                    }
                }

                // --- SETUP CSS ANIMATION FOR BACKGROUND PATTERNS --- //
                if (bgObj.pattern) {
                    const layerOrder = bgObj.layers || ['pat', 'grad', 'img'];
                    const patIdx = layerOrder.indexOf('pat');
                    if (patIdx !== -1) {
                        const pos0 = layerOrder.map((l: string, i: number) => i === patIdx ? '0 0' : (l === 'img' ? 'center' : '0 0')).join(', ');
                        const pos100 = layerOrder.map((l: string, i: number) => i === patIdx ? '1000px 1000px' : (l === 'img' ? 'center' : '0 0')).join(', ');
                        animStyle += `@keyframes scn-${suffix}-pan { 0% { background-position: ${pos0}; } 100% { background-position: ${pos100}; } }`;
                    }
                }

                const bgImgs: string[] = [];
                const blends: string[] = [];
                const sizes: string[] = [];

                const layerOrder = bgObj.layers || ['pat', 'grad', 'img'];
                const allowMix = bgObj.mode === 'mix';
                const allowImage = bgObj.mode === 'image' || allowMix;
                const allowGradPat = bgObj.mode === 'grad_pat' || allowMix;
                
                layerOrder.forEach((l: string) => {
                    if (l === 'pat' && bgObj.pattern && allowGradPat) {
                        bgImgs.push(bgObj.pattern);
                        blends.push(bgObj.patBlend || 'normal');
                        sizes.push('auto');
                    } else if (l === 'grad' && bgObj.gradient && allowGradPat) {
                        bgImgs.push(bgObj.gradient);
                        blends.push(bgObj.gradBlend || 'normal');
                        sizes.push('cover'); // Gradient should usually cover
                    } else if (l === 'img' && bgObj.url && allowImage) {
                        bgImgs.push(`url('${bgObj.url}')`);
                        blends.push('normal');
                        sizes.push('cover');
                    }
                });

                const animCombo = [
                    (filterAnimClass && allowImage) ? `${filterAnimClass} 3s infinite` : '', 
                    (bgObj.pattern && allowGradPat) ? `scn-${suffix}-pan ${Math.max(2, 30 - ((bgObj.patSpeed||5)*2))}s linear infinite` : ''
                ].filter(Boolean).join(', ');

                const videoUrl = (allowImage && bgIsVideo) ? bgObj.url : '';

                el.style.backgroundImage = bgImgs.join(', ');
                el.style.backgroundBlendMode = blends.join(', ');
                el.style.backgroundSize = sizes.join(', ');
                el.style.backgroundPosition = bgImgs.map(() => 'center').join(', ');
                el.style.setProperty('animation', (animCombo || 'none'), 'important');
                
                // If it's a fixed filter without animation, apply directly (legacy support)
                if (!bgIsVideo && bgObj.filter && bgObj.filter !== 'none' && !filterAnimClass && allowImage) {
                    el.style.filter = bgObj.filter;
                } else if (!filterAnimClass) {
                    el.style.filter = 'none';
                } else {
                    // Animation is active, don't set filter inline to avoid potential conflicts
                    el.style.filter = ''; 
                }

                // --- VIDEO LAYER (mp4/webm/mov: <video> com autoplay, em vez de so imagem) --- //
                syncScenarioVideo(el, suffix, videoUrl);

                // --- SETUP PARTICLES --- //
                if (bgObj.particles && bgObj.particles.type !== 'none') {
                    let pLayer = document.getElementById(`scn-p-layer-${suffix}`);
                    if (!pLayer) {
                        pLayer = document.createElement('div');
                        pLayer.id = `scn-p-layer-${suffix}`;
                        pLayer.style.cssText = 'position:absolute; inset:0; pointer-events:none; z-index:10; overflow:hidden;';
                        el.appendChild(pLayer);
                    }
                    
                    const pType = bgObj.particles.type;
                    const pColor = bgObj.particles.color || '#ffaa00';
                    const pCount = bgObj.particles.count || 20;

                    if (pType === 'sparks') spawnSparkParticles(pLayer, pColor, pCount);
                    else if (pType === 'fog') spawnAtmosphericFog(pLayer, pColor, Math.ceil(pCount/3));
                    else if (pType === 'swirl') spawnMagicSwirl(pLayer, pColor, pCount);
                } else {
                    document.getElementById(`scn-p-layer-${suffix}`)?.remove();
                }

            } else {
                // Legacy fallback
                const legacyVideo = (bgVal.startsWith('/') || bgVal.startsWith('http')) && isVideoUrl(bgVal) ? bgVal : '';
                syncScenarioVideo(el, suffix, legacyVideo);
                el.style.animation = 'none';
                el.style.backgroundBlendMode = 'normal';
                if (legacyVideo) {
                    el.style.backgroundImage = 'none';
                    el.style.filter = 'none';
                } else if (bgVal.startsWith('linear-gradient') || bgVal.startsWith('radial-gradient')) {
                    el.style.backgroundImage = bgVal;
                    el.style.backgroundSize = 'cover';
                } else if (bgVal.startsWith('data:image')) {
                    el.style.backgroundImage = `url("${bgVal}")`;
                    el.style.backgroundSize = 'auto';
                } else {
                    el.style.backgroundImage = bgVal.startsWith('/') || bgVal.startsWith('http') ? `url('${bgVal}')` : bgVal;
                    el.style.backgroundSize = 'cover';
                }
            }
        };

        // Apply to Body Layer (Global)
        let bgLayer = document.getElementById('scn-live-bg-layer');
        if (!bgLayer) {
            bgLayer = document.createElement('div');
            bgLayer.id = 'scn-live-bg-layer';
            bgLayer.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:-10; pointer-events:none; margin:0; padding:0;';
            document.body.prepend(bgLayer);
            document.body.style.background = 'transparent'; // Ensure body isn't blocking it
        }
        applyToElement(bgLayer as HTMLElement, true);

        // Apply to Phone Preview (Local if editor)
        const phone = document.getElementById('phone-preview');
        if (phone) applyToElement(phone, false);

    } catch (e) {
        console.error("Error applying scenario:", e);
    }

    // Apply Animations Style
    let styleTag = document.getElementById('scn-global-dynamic-style');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'scn-global-dynamic-style';
        document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = animStyle;
}

