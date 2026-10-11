export class StampBrushState {
  public stampUrl: string = '';
  public stampType: string = 'image'; // 'image' or 'scene'
  public stampSceneIdx: number = 0;
  public stampSceneName: string = '';
  public opacity: number = 1;
  public size: number = 50;
  public spacing: number = 20;
  public randomMirror: boolean = false;
  public randomMirrorX: boolean = false;
  public randomMirrorY: boolean = false;
  public randomSize: number = 0;
  public randomRotation: number = 0;
  public stamps: any[] = [];
}
