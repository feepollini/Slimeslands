import { StoreScreen } from '../screens/StoreScreen';

export class StoreScreenLandscape extends StoreScreen {
  constructor(customData?: any) {
    super(customData);
    this.isLandscapeMode = true;
  }
}
