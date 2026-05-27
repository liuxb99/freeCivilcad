import { describe, it, expect } from 'vitest'
import SnapManager, { getEntityPoints, findNearestPoint, findLineIntersections } from './SnapManager.js'

describe('getEntityPoints', () => {
  it('returns endpoints and midpoints for LINE', () => {
    const entities = [{ type: 'LINE', x1: 0, y1: 0, x2: 10, y2: 10 }]
    const pts = getEntityPoints(entities)
    expect(pts.endpoints.length).toBe(2)
    expect(pts.midpoints.length).toBe(1)
    expect(pts.midpoints[0]).toEqual({ x: 5, y: 5, entity: entities[0] })
  })

  it('handles POLYGON vertices', () => {
    const entities = [{ type: 'POLYGON', vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }] }]
    const pts = getEntityPoints(entities)
    expect(pts.endpoints.length).toBe(3)
    expect(pts.midpoints.length).toBe(3)
    expect(pts.allLines.length).toBe(3)
  })

  it('returns center for CIRCLE', () => {
    const entities = [{ type: 'CIRCLE', cx: 5, cy: 5, radius: 3 }]
    const pts = getEntityPoints(entities)
    expect(pts.endpoints.length).toBe(1)
    expect(pts.endpoints[0]).toEqual({ x: 5, y: 5, entity: entities[0] })
  })
})

describe('findNearestPoint', () => {
  it('finds nearest point within threshold', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 5, y: 5 }]
    const hit = findNearestPoint({ x: 5.1, y: 5.1 }, points, 1)
    expect(hit).toEqual({ x: 5, y: 5 })
  })

  it('returns null if no point within threshold', () => {
    const points = [{ x: 0, y: 0 }, { x: 100, y: 100 }]
    const hit = findNearestPoint({ x: 50, y: 50 }, points, 10)
    expect(hit).toBeNull()
  })
})

describe('findLineIntersections', () => {
  it('finds intersection of two crossing lines', () => {
    const lines = [
      { x1: 0, y1: 0, x2: 10, y2: 10 },
      { x1: 0, y1: 10, x2: 10, y2: 0 }
    ]
    const pts = findLineIntersections(lines)
    expect(pts.length).toBe(1)
    expect(pts[0].x).toBeCloseTo(5)
    expect(pts[0].y).toBeCloseTo(5)
  })

  it('returns empty for parallel lines', () => {
    const lines = [
      { x1: 0, y1: 0, x2: 10, y2: 0 },
      { x1: 0, y1: 5, x2: 10, y2: 5 }
    ]
    const pts = findLineIntersections(lines)
    expect(pts.length).toBe(0)
  })
})

describe('SnapManager', () => {
  it('snaps to grid', () => {
    const snap = new SnapManager({ snapToGrid: true, snapToEndpoint: false, snapToMidpoint: false, snapToIntersection: false, gridSize: 20, threshold: 20 })
    const result = snap.snap({ x: 0.3, y: 0.6 }, [])
    expect(result.x).toBe(0)
    expect(result.y).toBe(0)
    expect(snap.snapIndicator.type).toBe('grid')
  })

  it('snaps to endpoint', () => {
    const snap = new SnapManager({ snapToGrid: false, snapToEndpoint: true, snapToMidpoint: false, snapToIntersection: false, threshold: 20 })
    const entities = [{ type: 'LINE', x1: 100, y1: 100, x2: 200, y2: 200 }]
    const result = snap.snap({ x: 100.4, y: 100.4 }, entities)
    expect(result.x).toBeCloseTo(100)
    expect(result.y).toBeCloseTo(100)
    expect(snap.snapIndicator.type).toBe('endpoint')
  })

  it('snaps to midpoint', () => {
    const snap = new SnapManager({ snapToGrid: false, snapToEndpoint: false, snapToMidpoint: true, snapToIntersection: false, gridSize: 20, threshold: 20 })
    const entities = [{ type: 'LINE', x1: 0, y1: 0, x2: 100, y2: 0 }]
    const result = snap.snap({ x: 49.6, y: 0.5 }, entities)
    expect(result.x).toBe(50)
    expect(result.y).toBe(0)
    expect(snap.snapIndicator.type).toBe('midpoint')
  })

  it('applies ortho constraint', () => {
    const snap = new SnapManager({ snapToGrid: false, snapToEndpoint: false, snapToMidpoint: false, snapToIntersection: false, threshold: 20 })
    snap.ortho = true
    const result = snap.snap({ x: 50, y: 30, originX: 0, originY: 0 }, [])
    expect(result.x).toBe(50)
    expect(result.y).toBe(0)
    expect(snap.snapIndicator.type).toBe('ortho')
  })
})
