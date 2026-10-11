// Advanced tests for KeyframeManager - ensureTime/clone/move behaviors
declare function describe(name: string, fn: Function): void;
declare function test(name: string, fn: Function): void;
declare function expect(value: any): any;
import { KeyframeManager } from '../src/ui/shared/KeyframeManager'

describe('KeyframeManager - advanced', () => {
  function freshObj(): any { return { keyframes: {}, currentTime: 0, x: 0 }; }

  test('ensureKeyframeAtTime seeds a keyframe at given time', () => {
    const obj = freshObj();
    KeyframeManager.ensureKeyframeAtTime(obj, 'x', 3, 15, 'linear');
    const track = obj.keyframes.x;
    const kfs = Array.isArray(track?.keyframes) ? track.keyframes : [];
    expect(kfs.length).toBe(1);
    expect(kfs[0].t).toBe(3);
    expect(kfs[0].v).toBe(15);
  });

  test('getNearestKeyframeTime returns nearest keyframe', () => {
    const obj = freshObj();
    KeyframeManager.ensureKeyframeAtTime(obj, 'x', 0, 0, 'linear');
    KeyframeManager.ensureKeyframeAtTime(obj, 'x', 10, 10, 'linear');
    const nearest = KeyframeManager.getNearestKeyframeTime(obj, 'x', 6);
    expect(nearest).toBe(10);
  });

  test('deleteKeyframeAtTime removes the target keyframe', () => {
    const obj = freshObj();
    KeyframeManager.ensureKeyframeAtTime(obj, 'x', 0, 0, 'linear');
    KeyframeManager.ensureKeyframeAtTime(obj, 'x', 5, 5, 'linear');
    const ok = KeyframeManager.deleteKeyframeAtTime(obj, 'x', 0);
    expect(ok).toBe(true);
    const kfs = obj.keyframes.x.keyframes;
    expect(kfs.find((kf: any) => kf.t === 0)).toBeUndefined();
  });
});
