// Lightweight test stubs for environments without Jest typings
declare function describe(name: string, fn: Function): void;
declare function test(name: string, fn: Function): void;
declare function expect(value: any): any;

describe('LocalStorage Scenes', () => {
  test('save to forge_scenes and load back', () => {
    const scenes = [{ id: 'scene1', name: 'Test', objects: [] }];
    // @ts-ignore
    localStorage.setItem('forge_scenes', JSON.stringify(scenes));
    // @ts-ignore
    const loaded = JSON.parse(localStorage.getItem('forge_scenes') || '[]');
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe('scene1');
  });
});
