import { ArsenalScreen } from '../screens/ArsenalScreen';
import { Skill } from '../../core/GameEngine';

export class ArsenalScreenLandscape extends ArsenalScreen {
  constructor(
    templates: any[],
    artifacts: Skill[],
    boards: string[],
    onConfirm?: (cards: any[], artifacts: Skill[], board: string) => void,
    isPrepMode = false
  ) {
    super(templates, artifacts, boards, onConfirm, isPrepMode);
    this.isLandscapeMode = true;
  }
}
