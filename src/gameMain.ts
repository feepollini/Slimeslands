/**
 * gameMain.ts - Entry point for playing created phases
 * Loads phase from localStorage and runs the game
 */

import './style.css';
import { RuntimeScreen } from './ui/screens/RuntimeScreen';
import { PhaseData } from './core/types';
import { t } from './core/i18n';

class GameApp {
    private container: HTMLElement;
    private screen: RuntimeScreen | null = null;

    constructor() {
        this.container = document.getElementById('app')!;
        this.init();
    }

    private async init() {
        const phaseJson = localStorage.getItem('game_current_phase');
        
        if (!phaseJson) {
            this.showNoPhaseError();
            return;
        }

        let phaseData: PhaseData;
        try {
            phaseData = JSON.parse(phaseJson);
        } catch (e) {
            this.showNoPhaseError();
            return;
        }

        if (!phaseData || !phaseData.objects) {
            this.showNoPhaseError();
            return;
        }

        this.screen = new RuntimeScreen(
            { currentPhase: phaseData },
            {
                navigate: (target: string) => {
                    if (target === 'hub' || target === 'forge') {
                        window.location.href = target === 'hub' ? 'hub.html' : 'forge.html';
                    }
                }
            }
        );

        this.container.innerHTML = this.screen.render();
        this.screen.bind(this.container);

        await this.screen.loadAndPlay(phaseData.id);
    }

    private showNoPhaseError() {
        this.container.innerHTML = `
            <div style="
                width:100%; height:100%;
                display:flex; flex-direction:column;
                align-items:center; justify-content:center;
                background:#050508;
            ">
                <div style="font-size:3rem; margin-bottom:20px;">🎮</div>
                <div style="color:#ff3366; font-size:1.2rem; font-weight:900; letter-spacing:2px; margin-bottom:10px;">
                    ${t('game.noPhase')}
                </div>
                <div style="color:rgba(255,255,255,0.5); font-size:0.9rem; margin-bottom:30px;">
                    ${t('game.noPhaseDesc')}
                </div>
                <a href="forge.html" style="
                    padding:15px 30px;
                    background:rgba(81,197,255,0.15);
                    border:2px solid rgba(81,197,255,0.4);
                    border-radius:10px;
                    color:#51c5ff; font-size:0.9rem; font-weight:900;
                    text-decoration:none; letter-spacing:2px;
                ">
                    ${t('game.goEditor')}
                </a>
            </div>
        `;
    }
}

new GameApp();
