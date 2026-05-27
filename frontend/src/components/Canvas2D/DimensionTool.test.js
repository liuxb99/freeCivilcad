import { describe, it, expect } from 'vitest'
import { getLineAngle, lineIntersection, handleDimMouseDown } from './DimensionTool'

describe('getLineAngle', () => {
  it('returns 0 for a horizontal line to the right', () => {
    const angle = getLineAngle({ geometry: { x1: 0, y1: 0, x2: 10, y2: 0 } })
    expect(angle).toBeCloseTo(0)
  })

  it('returns PI for a horizontal line to the left', () => {
    const angle = getLineAngle({ geometry: { x1: 0, y1: 0, x2: -10, y2: 0 } })
    expect(angle).toBeCloseTo(Math.PI)
  })

  it('returns PI/2 for a vertical line upward', () => {
    const angle = getLineAngle({ geometry: { x1: 0, y1: 0, x2: 0, y2: -10 } })
    expect(angle).toBeCloseTo(-Math.PI / 2)
  })

  it('returns PI/4 for a 45-degree diagonal', () => {
    const angle = getLineAngle({ geometry: { x1: 0, y1: 0, x2: 10, y2: 10 } })
    expect(angle).toBeCloseTo(Math.PI / 4)
  })

  it('works with flat geometry (no nested .geometry)', () => {
    const angle = getLineAngle({ x1: 0, y1: 0, x2: 10, y2: 0 })
    expect(angle).toBeCloseTo(0)
  })
})

describe('lineIntersection', () => {
  it('finds intersection of crossing lines', () => {
    const a1 = { x: 0, y: 0 }, a2 = { x: 10, y: 10 }
    const b1 = { x: 0, y: 10 }, b2 = { x: 10, y: 0 }
    const pt = lineIntersection(a1, a2, b1, b2)
    expect(pt).toBeTruthy()
    expect(pt.x).toBeCloseTo(5)
    expect(pt.y).toBeCloseTo(5)
  })

  it('returns null for parallel lines', () => {
    const a1 = { x: 0, y: 0 }, a2 = { x: 10, y: 10 }
    const b1 = { x: 0, y: 5 }, b2 = { x: 10, y: 15 }
    const pt = lineIntersection(a1, a2, b1, b2)
    expect(pt).toBeNull()
  })

  it('returns null for coincident parallel lines', () => {
    const a1 = { x: 0, y: 0 }, a2 = { x: 10, y: 10 }
    const b1 = { x: 5, y: 5 }, b2 = { x: 15, y: 15 }
    const pt = lineIntersection(a1, a2, b1, b2)
    expect(pt).toBeNull()
  })
})

describe('handleDimMouseDown', () => {
  it('starts a linear dim state on empty click', () => {
    let rendered = false
    const mockEngine = {
      _dimState: null,
      _dimPreview: null,
      _dimLine1: null,
      _hitTest() { return null },
      _nextId() { return 'mock1' },
      _getActiveColor() { return '#a6e3a1' },
      _makeAddCmd() { return { execute() {}, undo() {} } },
      _history: { execute() {} },
      _logCommand() {},
      _emit() {},
      render() { rendered = true },
      activeLayer: '0',
    }
    handleDimMouseDown(mockEngine, 100, 200)
    expect(mockEngine._dimState).toBeTruthy()
    expect(mockEngine._dimState.type).toBe('linear')
    expect(mockEngine._dimState.phase).toBe('p1')
    expect(mockEngine._dimState.x1).toBe(100)
    expect(mockEngine._dimState.y1).toBe(200)
    expect(rendered).toBe(true)
  })

  it('starts a radius dim state on CIRCLE hit', () => {
    let rendered = false
    const mockEngine = {
      _dimState: null,
      _dimPreview: null,
      _dimLine1: null,
      _hitTest() { return { type: 'CIRCLE', geometry: { cx: 50, cy: 50, r: 30 } } },
      _nextId() { return 'mock1' },
      _getActiveColor() { return '#a6e3a1' },
      _makeAddCmd() { return { execute() {}, undo() {} } },
      _history: { execute() {} },
      _logCommand() {},
      _emit() {},
      render() { rendered = true },
      activeLayer: '0',
    }
    handleDimMouseDown(mockEngine, 50, 50)
    expect(mockEngine._dimState).toBeTruthy()
    expect(mockEngine._dimState.type).toBe('radius')
    expect(mockEngine._dimState.phase).toBe('leader')
    expect(mockEngine._dimState.cx).toBe(50)
    expect(mockEngine._dimState.cy).toBe(50)
    expect(mockEngine._dimState.radius).toBe(30)
    expect(rendered).toBe(true)
  })
})
