// Minimal ambient typings to allow TS to compile tests in non-Jest environments
declare function describe(name: string, fn: Function): void;
declare function test(name: string, fn: Function): void;
declare function expect(value: any): any;
import { KeyframeManager, InterpolationType } from '../src/ui/shared/KeyframeManager'

describe('KeyframeManager - core functionality', () => {
  const freshObj = (): any => ({ keyframes: {}, currentTime: 0, // mock object
  x: 0 })

  test('seed first keyframe when toggling on a new track', () => {
    const obj = freshObj()
    const ok = KeyframeManager.toggleProperty(obj, 'x', 5, 1)
    expect(ok).toBe(true)
    expect(obj.keyframes.x).toBeDefined()
    const kfs = obj.keyframes.x.keyframes
    expect(Array.isArray(kfs)).toBe(true)
    expect(kfs.length).toBe(1)
    expect(kfs[0].t).toBe(1)
    expect(kfs[0].v).toBe(5)
  })

  test('setValue adds a new keyframe at a given time', () => {
    const obj = freshObj()
    KeyframeManager.toggleProperty(obj, 'x', 0, 0) // seed at t=0
    KeyframeManager.setValue(obj, 'x', 10, 2)
    const kfs = obj.keyframes.x.keyframes
    expect(kfs.length).toBeGreaterThanOrEqual(2)
    expect(kfs.find((k: any) => k.t === 2 && k.v === 10)).toBeTruthy()
  })

  test('linear interpolation between two keyframes', () => {
    const obj = freshObj()
    KeyframeManager.toggleProperty(obj, 'x', 0, 0)
    KeyframeManager.setValue(obj, 'x', 0, 0)
    KeyframeManager.setValue(obj, 'x', 50, 5)
    KeyframeManager.setValue(obj, 'x', 100, 10)
    const valAt5 = KeyframeManager.getValueAtTime(obj, 'x', 5)
    expect(valAt5).toBeCloseTo(50)
  })

  test('hold interpolation returns previous value', () => {
    const obj = freshObj()
    KeyframeManager.toggleProperty(obj, 'x', 0, 0)
    KeyframeManager.setValue(obj, 'x', 100, 10)
    KeyframeManager.setInterpolation(obj, 'x', 0, 'hold')
    const v = KeyframeManager.getValueAtTime(obj, 'x', 5)
    expect(v).toBe(0)
  })

  test('copyKeyframes transfers with offset', () => {
    const a: any = {
      keyframes: {
        pos: {
          keyframes: [ { t:0, v:1, interp:'linear' }, { t:5, v:2, interp:'linear' } ],
          active: true,
          defaultValue: 0
        }
      },
      currentTime: 0
    };
    const b: any = { keyframes: {} }
    KeyframeManager.copyKeyframes(a, 'pos', b, 'pos', 3)
    const ks = b.keyframes.pos.keyframes
    expect(ks.length).toBe(2)
    expect(ks[0].t).toBe(3)
    expect(ks[1].t).toBe(8)
  })
})
