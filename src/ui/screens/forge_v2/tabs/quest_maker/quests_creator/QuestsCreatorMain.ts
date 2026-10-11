import { QuestPreview } from './QuestPreview';

export class QuestsCreatorMain {
  private _preview: QuestPreview;

  constructor(private _state: any, private _core: any, private _callbacks: any) {
    this._preview = new QuestPreview();
  }

  public render(): string {
    return this._preview.render(this._state);
  }

  public bind(container: HTMLElement) {
    this._preview.bind(container, this._state);
  }

  public setWorldMapInstance(wm: any) {
    this._preview.setWorldMapInstance(wm);
  }
}
