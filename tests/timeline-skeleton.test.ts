// Skeleton tests for TimelineScene render
import { TimelineScene } from '../src/ui/screens/forge_v2/tabs/quest_maker/timeline_scene/TimelineScene'

describe('TimelineScene skeleton', () => {
  test('render returns string', () => {
    const ts = new TimelineScene({ currentTime: 0 })
    const html = ts.render()
    expect(typeof html).toBe('string')
  })
})
