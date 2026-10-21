import './style.css';
import './ui/styles/Arsenal.css';
import './ui/styles/Landscape.css';
import { ArsenalScreen } from './ui/screens/ArsenalScreen';
import { ArsenalScreenLandscape } from './ui/screens_landscape/ArsenalScreenLandscape';
import { OrientationManager } from './ui/OrientationManager';
import { CARD_TEMPLATES, SKILL_POOL } from './core/constants';
import { getMergedGameTemplatesSync } from './ui/screens/forge_v2/utils/HestridiaMatrixRenderer';
import SCENARIOS from './core/scenarios.json';
import { applyScenarioBackground, getActiveScenario } from './ui/utils/BackgroundUtils';

class ArsenalApp {
  private container: HTMLElement;
  private portraitArsenal: ArsenalScreen;
  private landscapeArsenal: ArsenalScreenLandscape;

  constructor() {
    this.container = document.getElementById('app')!;
    const onConfirm = (deckCards: any[], deckSkills: any[], selectedBoard: string) => {
      localStorage.setItem(
        'battle_prep',
        JSON.stringify({
          cards: deckCards,
          skills: deckSkills,
          board: selectedBoard,
        })
      );
      window.location.href = 'battle.html';
    };

    const merged = getMergedGameTemplatesSync(CARD_TEMPLATES);
    this.portraitArsenal = new ArsenalScreen(merged, SKILL_POOL, [], onConfirm, false);
    this.landscapeArsenal = new ArsenalScreenLandscape(merged, SKILL_POOL, [], onConfirm, false);

    this.init();
    OrientationManager.subscribe(() => this.renderActive());
  }

  private init() {
    applyScenarioBackground(getActiveScenario('arsenal', (SCENARIOS as any).arsenal));
    this.renderActive();
  }

  private renderActive() {
    if (OrientationManager.isLandscape()) {
      this.landscapeArsenal.render(this.container);
    } else {
      this.portraitArsenal.render(this.container);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ArsenalApp();
});
