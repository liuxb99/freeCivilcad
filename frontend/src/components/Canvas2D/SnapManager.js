import { GRID_SIZE, SNAP_THRESHOLD } from '../../config/constants.js'

export function getEntityPoints(entities) {
  const pts = { endpoints: [], midpoints: [], allLines: [] }
  for (const e of entities) {
    if (e.type === 'LINE') {
      pts.endpoints.push({ x: e.x1, y: e.y1, entity: e })
      pts.endpoints.push({ x: e.x2, y: e.y2, entity: e })
      pts.midpoints.push({ x: (e.x1 + e.x2) / 2, y: (e.y1 + e.y2) / 2, entity: e })
      pts.allLines.push(e)
    } else if (e.type === 'CIRCLE' || e.type === 'ARC') {
      pts.endpoints.push({ x: e.cx, y: e.cy, entity: e })
    } else if (e.type === 'POLYGON' && e.vertices) {
      for (const v of e.vertices) {
        pts.endpoints.push({ x: v.x, y: v.y, entity: e })
      }
      for (let i = 0; i < e.vertices.length; i++) {
        const a = e.vertices[i], b = e.vertices[(i + 1) % e.vertices.length]
        pts.midpoints.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, entity: e })
        pts.allLines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
      }
    } else if (e.type === 'TEXT') {
      pts.endpoints.push({ x: e.x, y: e.y, entity: e })
    } else if (e.type === 'DIMENSION' && e.dimType === 'linear') {
      pts.endpoints.push({ x: e.x1, y: e.y1, entity: e })
      pts.endpoints.push({ x: e.x2, y: e.y2, entity: e })
      pts.midpoints.push({ x: (e.x1 + e.x2) / 2, y: (e.y1 + e.y2) / 2, entity: e })
    }
  }
  return pts
}

export function findNearestPoint(pos, points, threshold) {
  let best = null, bestDist = threshold
  for (const p of points) {
    const d = Math.hypot(pos.x - p.x, pos.y - p.y)
    if (d < bestDist) { bestDist = d; best = p }
  }
  return best
}

export function findLineIntersections(lines, threshold) {
  const results = []
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const a = lines[i], b = lines[j]
      const dax = a.x2 - a.x1, day = a.y2 - a.y1
      const dbx = b.x2 - b.x1, dby = b.y2 - b.y1
      const denom = dax * dby - day * dbx
      if (Math.abs(denom) < 1e-10) continue
      const t = ((b.x1 - a.x1) * dby - (b.y1 - a.y1) * dbx) / denom
      const u = ((b.x1 - a.x1) * day - (b.y1 - a.y1) * dax) / denom
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        results.push({ x: a.x1 + t * dax, y: a.y1 + t * day })
      }
    }
  }
  return results
}

export default class SnapManager {
  constructor(options = {}) {
    this.snapToGrid = options.snapToGrid !== undefined ? options.snapToGrid : true
    this.snapToEndpoint = options.snapToEndpoint !== undefined ? options.snapToEndpoint : true
    this.snapToMidpoint = options.snapToMidpoint !== undefined ? options.snapToMidpoint : true
    this.snapToIntersection = options.snapToIntersection !== undefined ? options.snapToIntersection : true
    this.ortho = false
    this.gridSize = options.gridSize || GRID_SIZE
    this.threshold = options.threshold || SNAP_THRESHOLD
    this.snapIndicator = null
    this._cache = { entities: null, points: null, intersections: null }
  }

  _invalidateCache() { this._cache.entities = null }

  snap(pos, entities) {
    this.snapIndicator = null
    let snapped = { x: pos.x, y: pos.y }, snapType = null, snapDist = this.threshold * 0.05

    if (this.snapToGrid) {
      const gx = Math.round(pos.x / this.gridSize) * this.gridSize
      const gy = Math.round(pos.y / this.gridSize) * this.gridSize
      const d = Math.hypot(pos.x - gx, pos.y - gy)
      if (d < snapDist) { snapped = { x: gx, y: gy }; snapType = 'grid'; snapDist = d }
    }

    if (this.snapToEndpoint || this.snapToMidpoint || this.snapToIntersection) {
      if (this._cache.entities !== entities) {
        const pts = getEntityPoints(entities || [])
        this._cache.points = pts
        this._cache.intersections = findLineIntersections(pts.allLines)
        this._cache.entities = entities
      }
      const pts = this._cache.points

      if (this.snapToEndpoint) {
        const hit = findNearestPoint(pos, pts.endpoints, snapDist)
        if (hit) { snapped = { x: hit.x, y: hit.y }; snapType = 'endpoint'; snapDist = Math.hypot(pos.x - hit.x, pos.y - hit.y) }
      }

      if (this.snapToMidpoint) {
        const hit = findNearestPoint(pos, pts.midpoints, snapDist)
        if (hit) { snapped = { x: hit.x, y: hit.y }; snapType = 'midpoint'; snapDist = Math.hypot(pos.x - hit.x, pos.y - hit.y) }
      }

      if (this.snapToIntersection) {
        const hit = findNearestPoint(pos, this._cache.intersections, snapDist)
        if (hit) { snapped = { x: hit.x, y: hit.y }; snapType = 'intersection'; snapDist = Math.hypot(pos.x - hit.x, pos.y - hit.y) }
      }
    }

    if (this.ortho && snapType === null) {
      const dx = pos.x - (pos.originX || 0), dy = pos.y - (pos.originY || 0)
      if (Math.abs(dx) > Math.abs(dy)) {
        snapped = { x: pos.x, y: pos.originY !== undefined ? pos.originY : pos.y }
      } else {
        snapped = { x: pos.originX !== undefined ? pos.originX : pos.x, y: pos.y }
      }
      snapType = 'ortho'
    }

    if (snapType) {
      this.snapIndicator = { x: snapped.x, y: snapped.y, type: snapType }
    }
    return snapped
  }

  getColorForType(type) {
    const colors = { grid: '#585b70', endpoint: '#a6e3a1', midpoint: '#89b4fa', intersection: '#f9e2af', ortho: '#f38ba8' }
    return colors[type] || '#cdd6f4'
  }
}
