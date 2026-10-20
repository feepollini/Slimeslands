import './style.css';
import './ui/styles/Editor.css';
import { ForgeApp } from './ui/screens/forge_v2/ForgeApp';
import { CARD_TEMPLATES, SKILL_POOL, CARD_ABILITIES, RARITIES } from './core/constants';
import scenariosData from './core/scenarios.json';
import storeData from './core/store.json';
import assetsData from './core/assets.json';
import soundsData from './core/sounds.json';

document.addEventListener('DOMContentLoaded', async () => {
    const root = document.getElementById('forge-root');
    if (!root) {
        console.error('Forge root element not found!');
        return;
    }
    
    const initialState: any = {
        templates: JSON.parse(JSON.stringify(CARD_TEMPLATES)),
        abilities: JSON.parse(JSON.stringify(CARD_ABILITIES || [])),
        skills: JSON.parse(JSON.stringify(SKILL_POOL || [])),
        scenarios: JSON.parse(JSON.stringify(scenariosData)),
        storeItems: JSON.parse(JSON.stringify(storeData)),
        assetRegistry: JSON.parse(JSON.stringify(assetsData || {})),
        soundsData: JSON.parse(JSON.stringify(soundsData || {})),
        rarities: JSON.parse(JSON.stringify(RARITIES || {})),
        availableCards: [],
        availableSounds: []
    };

    try {
        const res = await fetch('/api/load-cards');
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                initialState.templates = data;
            }
        }
    } catch {}

    try {
        const res = await fetch('/api/images');
        if (res.ok) {
            const data = await res.json();
            initialState.availableCards = data.cards || [];
        }
    } catch {}

    try {
        const res = await fetch('/api/sounds');
        if (res.ok) {
            const data = await res.json();
            initialState.availableSounds = data.sounds || [];
        }
    } catch {}

    try {
        const res = await fetch('/api/load-sprites');
        if (res.ok) {
            const data = await res.json();
            initialState.customSpritePacks = data.packs || [];
            initialState.customGallerySprites = data.gallery || [];
        }
    } catch {}

    const forge = new ForgeApp(root, initialState, {
        onExit: () => {
            window.location.href = 'hub.html';
        }
    });

    forge.render();
});
