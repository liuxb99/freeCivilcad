// engine-render.js — 渲染管線（grid、entities、selection、snap indicator、dim preview、edit preview）
import { Engine } from './engine-core.js'
import { drawPreviewDimension } from './DimensionTool.js'
import { drawEditPreview } from './EditTools.js'
import { ARROW_SIZE, SNAP_INDICATOR_RADIUS_INNER, SNAP_INDICATOR_RADIUS_OUTER } from '../../config/constants.js'

// ==================== 座標轉換 ====================

Engine.prototype._worldToScreen = function (wx, wy) {
  return {
    x: wx * this._zoom * this._gridSize + this._panX,
    y: wy * this._zoom * this._gridSize + this._panY
  }
}

// ==================== 網格繪製 ====================

Engine.prototype._drawGrid = function (ctx) {
  if (!this._showGrid) return
  const g = this._gridSize
  const w = this.canvas.width
  const h = this.canvas.height
  ctx.save()
  ctx.lineWidth = 0.5
  ctx.strokeStyle = '#2a2a3a'
  ctx.beginPath()
  const ox = this._panX % (g * 5 * this._zoom)
  const oy = this._panY % (g * 5 * this._zoom)
  for (let x = ox; x < w; x += g * 5 * this._zoom) { ctx.moveTo(x, 0); ctx.lineTo(x, h) }
  for (let y = oy; y < h; y += g * 5 * this._zoom) { ctx.moveTo(0, y); ctx.lineTo(w, y) }
  ctx.stroke()
  ctx.strokeStyle = '#222236'
  ctx.beginPath()
  for (let x = this._panX % (g * this._zoom); x < w; x += g * this._zoom) { ctx.moveTo(x, 0); ctx.lineTo(x, h) }
  for (let y = this._panY % (g * this._zoom); y < h; y += g * this._zoom) { ctx.moveTo(0, y); ctx.lineTo(w, y) }
  ctx.stroke()
  if (this._panX >= 0 && this._panX < w && this._panY >= 0 && this._panY < h) {
    ctx.strokeStyle = '#585b70'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(this._panX, 0); ctx.lineTo(this._panX, h)
    ctx.moveTo(0, this._panY); ctx.lineTo(w, this._panY)
    ctx.stroke()
  }
  ctx.restore()
}

// ==================== 實體繪製 ====================

Engine.prototype._drawEntity = function (ctx, entity, highlight) {
  ctx.save()
  ctx.strokeStyle = entity.color
  ctx.lineWidth = (entity.lineWidth || 2) * this._zoom
  ctx.lineCap = 'round'
  if (highlight) {
    ctx.shadowColor = entity.color
    ctx.shadowBlur = 12
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = (entity.lineWidth || 2) * this._zoom * 1.3
  }
  if (entity.type === 'LINE') {
    const s1 = this._worldToScreen(entity.x1, entity.y1)
    const s2 = this._worldToScreen(entity.x2, entity.y2)
    ctx.beginPath(); ctx.moveTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.stroke()
  } else if (entity.type === 'CIRCLE') {
    const s = this._worldToScreen(entity.cx, entity.cy)
    const r = entity.radius * this._zoom * this._gridSize
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.stroke()
    if (!highlight) {
      ctx.fillStyle = entity.color
      ctx.beginPath(); ctx.arc(s.x, s.y, 3 * this._zoom, 0, Math.PI * 2); ctx.fill()
    }
  } else if (entity.type === 'ARC') {
    const s = this._worldToScreen(entity.cx, entity.cy)
    const r = entity.radius * this._zoom * this._gridSize
    ctx.beginPath(); ctx.arc(s.x, s.y, r, entity.startAngle, entity.endAngle); ctx.stroke()
    if (!highlight) {
      ctx.fillStyle = entity.color
      const e1 = this._worldToScreen(entity.cx + entity.radius * Math.cos(entity.startAngle), entity.cy + entity.radius * Math.sin(entity.startAngle))
      const e2 = this._worldToScreen(entity.cx + entity.radius * Math.cos(entity.endAngle), entity.cy + entity.radius * Math.sin(entity.endAngle))
      ctx.beginPath(); ctx.arc(e1.x, e1.y, 3 * this._zoom, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(e2.x, e2.y, 3 * this._zoom, 0, Math.PI * 2); ctx.fill()
    }
  } else if (entity.type === 'POLYGON') {
    const verts = entity.vertices
    if (verts.length < 2) { ctx.restore(); return }
    ctx.beginPath()
    const p0 = this._worldToScreen(verts[0].x, verts[0].y)
    ctx.moveTo(p0.x, p0.y)
    for (let i = 1; i < verts.length; i++) {
      const p = this._worldToScreen(verts[i].x, verts[i].y)
      ctx.lineTo(p.x, p.y)
    }
    ctx.closePath(); ctx.stroke()
    if (!highlight) {
      ctx.fillStyle = entity.color; ctx.globalAlpha = 0.08
      ctx.fill(); ctx.globalAlpha = 1
      for (const v of verts) {
        const p = this._worldToScreen(v.x, v.y)
        ctx.beginPath(); ctx.arc(p.x, p.y, 3 * this._zoom, 0, Math.PI * 2); ctx.fill()
      }
    }
  } else if (entity.type === 'POLYLINE') {
    const verts = entity.vertices
    if (verts.length < 2) { ctx.restore(); return }
    ctx.beginPath()
    const p0 = this._worldToScreen(verts[0].x, verts[0].y)
    ctx.moveTo(p0.x, p0.y)
    for (let i = 1; i < verts.length; i++) {
      const p = this._worldToScreen(verts[i].x, verts[i].y)
      ctx.lineTo(p.x, p.y)
    }
    if (entity.isClosed) ctx.closePath()
    ctx.stroke()
    if (!highlight) {
      for (const v of verts) {
        const p = this._worldToScreen(v.x, v.y)
        ctx.beginPath(); ctx.arc(p.x, p.y, 3 * this._zoom, 0, Math.PI * 2); ctx.fill()
      }
    }
  } else if (entity.type === 'TEXT') {
    if (entity.text) {
      const p = this._worldToScreen(entity.x, entity.y)
      const fs = (entity.fontSize || 1) * this._zoom * this._gridSize
      ctx.font = fs + 'px "Microsoft JhengHei", sans-serif'
      ctx.fillStyle = highlight ? '#ffffff' : entity.color
      ctx.textBaseline = 'bottom'
      ctx.fillText(entity.text, p.x, p.y)
    }
  } else if (entity.type === 'DIMENSION') {
    const dimColor = highlight ? '#ffffff' : (entity.color || '#a6e3a1')
    if (entity.dimType === 'linear') {
      const { x1, y1, x2, y2 } = entity
      const offset = entity.offset || 15
      const s1 = this._worldToScreen(x1, y1)
      const s2 = this._worldToScreen(x2, y2)
      const dx = s2.x - s1.x, dy = s2.y - s1.y
      const len = Math.hypot(dx, dy)
      if (len > 0.01) {
        const nx = -dy / len, ny = dx / len
        const ox = nx * offset, oy = ny * offset
        const lx1 = s1.x + ox, ly1 = s1.y + oy
        const lx2 = s2.x + ox, ly2 = s2.y + oy
        ctx.strokeStyle = dimColor
        ctx.fillStyle = dimColor
        ctx.lineWidth = 1.5 * this._zoom
        ctx.setLineDash([4 * this._zoom, 4 * this._zoom])
        ctx.beginPath()
        ctx.moveTo(s1.x, s1.y); ctx.lineTo(lx1, ly1)
        ctx.moveTo(s2.x, s2.y); ctx.lineTo(lx2, ly2)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.lineWidth = 1.5 * this._zoom
        ctx.beginPath()
        ctx.moveTo(lx1, ly1); ctx.lineTo(lx2, ly2)
        ctx.stroke()
        const arrowSize = ARROW_SIZE * this._zoom
        const a1 = Math.atan2(ly2 - ly1, lx2 - lx1)
        ctx.beginPath()
        ctx.moveTo(lx1, ly1)
        ctx.lineTo(lx1 - arrowSize * Math.cos(a1 - 0.4), ly1 - arrowSize * Math.sin(a1 - 0.4))
        ctx.lineTo(lx1 - arrowSize * Math.cos(a1 + 0.4), ly1 - arrowSize * Math.sin(a1 + 0.4))
        ctx.closePath()
        ctx.fill()
        const a2 = Math.atan2(ly1 - ly2, lx1 - lx2)
        ctx.beginPath()
        ctx.moveTo(lx2, ly2)
        ctx.lineTo(lx2 - arrowSize * Math.cos(a2 - 0.4), ly2 - arrowSize * Math.sin(a2 - 0.4))
        ctx.lineTo(lx2 - arrowSize * Math.cos(a2 + 0.4), ly2 - arrowSize * Math.sin(a2 + 0.4))
        ctx.closePath()
        ctx.fill()
        const midX = (lx1 + lx2) / 2, midY = (ly1 + ly2) / 2
        const worldLen = Math.hypot(x2 - x1, y2 - y1)
        const displayText = entity.text || String(Math.round(worldLen * 10) / 10)
        ctx.font = (12 * this._zoom) + 'px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(displayText, midX, midY - 4 * this._zoom)
      }
    } else if (entity.dimType === 'radius') {
      const { cx, cy } = entity
      const radius = entity.radius || 0
      const leaderAngle = entity.leaderAngle !== undefined ? entity.leaderAngle : -Math.PI / 4
      const s = this._worldToScreen(cx, cy)
      const r = radius * this._zoom * this._gridSize
      const ex = s.x + r * Math.cos(leaderAngle)
      const ey = s.y + r * Math.sin(leaderAngle)
      const ext = 15 * this._zoom
      const tx = s.x + (r + ext) * Math.cos(leaderAngle)
      const ty = s.y + (r + ext) * Math.sin(leaderAngle)
      ctx.strokeStyle = dimColor
      ctx.fillStyle = dimColor
      ctx.lineWidth = 1.5 * this._zoom
      ctx.beginPath()
      ctx.moveTo(ex, ey); ctx.lineTo(tx, ty)
      ctx.stroke()
      const a = Math.atan2(ty - ey, tx - ex)
      const arrowSize = ARROW_SIZE * this._zoom
      ctx.beginPath()
      ctx.moveTo(ex, ey)
      ctx.lineTo(ex + arrowSize * Math.cos(a + 2.7), ey + arrowSize * Math.sin(a + 2.7))
      ctx.lineTo(ex + arrowSize * Math.cos(a - 2.7), ey + arrowSize * Math.sin(a - 2.7))
      ctx.closePath()
      ctx.fill()
      const displayText = entity.text || ('R=' + Math.round(radius * 10) / 10)
      ctx.font = (12 * this._zoom) + 'px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(displayText, tx + 4 * this._zoom, ty)
    } else if (entity.dimType === 'angle') {
      const { vertexX, vertexY, angleStart, angleEnd } = entity
      const arcRadius = entity.arcRadius || 20
      const s = this._worldToScreen(vertexX, vertexY)
      const r = arcRadius * this._zoom * this._gridSize
      const start = Math.min(angleStart, angleEnd)
      const end = Math.max(angleStart, angleEnd)
      ctx.strokeStyle = dimColor
      ctx.fillStyle = dimColor
      ctx.lineWidth = 1.5 * this._zoom
      ctx.beginPath()
      ctx.arc(s.x, s.y, r, start, end)
      ctx.stroke()
      const arrowSize = ARROW_SIZE * this._zoom
      for (const angle of [start, end]) {
        const ax = s.x + r * Math.cos(angle)
        const ay = s.y + r * Math.sin(angle)
        const perpAngle = angle + Math.PI / 2
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(ax + arrowSize * Math.cos(perpAngle + 0.5), ay + arrowSize * Math.sin(perpAngle + 0.5))
        ctx.lineTo(ax - arrowSize * Math.cos(perpAngle - 0.5), ay - arrowSize * Math.sin(perpAngle - 0.5))
        ctx.closePath()
        ctx.fill()
      }
      const midAngle = (start + end) / 2
      const textR = r + 16 * this._zoom
      const tx = s.x + textR * Math.cos(midAngle)
      const ty = s.y + textR * Math.sin(midAngle)
      const angleDeg = Math.round((end - start) * 180 / Math.PI * 10) / 10
      const displayText = entity.text || (angleDeg + '\u00b0')
      ctx.font = (12 * this._zoom) + 'px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(displayText, tx, ty)
    }
  }
  ctx.restore()
}

// ==================== 選取框繪製 ====================

Engine.prototype._drawSelectionBox = function (ctx, entity) {
  ctx.save()
  ctx.strokeStyle = '#89b4fa'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3])
  let b
  if (entity.type === 'LINE') {
    const s1 = this._worldToScreen(entity.x1, entity.y1)
    const s2 = this._worldToScreen(entity.x2, entity.y2)
    b = { l: Math.min(s1.x, s2.x), t: Math.min(s1.y, s2.y), r: Math.max(s1.x, s2.x), btm: Math.max(s1.y, s2.y) }
  } else if (entity.type === 'CIRCLE' || entity.type === 'ARC') {
    const s = this._worldToScreen(entity.cx, entity.cy)
    const r = (entity.radius || 0) * this._zoom * this._gridSize
    b = { l: s.x - r, t: s.y - r, r: s.x + r, btm: s.y + r }
  } else if (entity.type === 'POLYGON') {
    const verts = entity.vertices
    if (verts.length === 0) { ctx.restore(); return }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const v of verts) {
      const p = this._worldToScreen(v.x, v.y)
      if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y
    }
    b = { l: minX, t: minY, r: maxX, btm: maxY }
  } else if (entity.type === 'POLYLINE') {
    const verts = entity.vertices
    if (verts.length === 0) { ctx.restore(); return }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const v of verts) {
      const p = this._worldToScreen(v.x, v.y)
      if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y
    }
    b = { l: minX, t: minY, r: maxX, btm: maxY }
  } else if (entity.type === 'TEXT') {
    const p = this._worldToScreen(entity.x, entity.y)
    const fs = (entity.fontSize || 1) * this._zoom * this._gridSize
    b = { l: p.x - 4, t: p.y - fs - 4, r: p.x + 4, btm: p.y + 4 }
  } else if (entity.type === 'DIMENSION') {
    if (entity.dimType === 'linear') {
      const s1 = this._worldToScreen(entity.x1, entity.y1)
      const s2 = this._worldToScreen(entity.x2, entity.y2)
      b = { l: Math.min(s1.x, s2.x), t: Math.min(s1.y, s2.y), r: Math.max(s1.x, s2.x), btm: Math.max(s1.y, s2.y) }
    } else if (entity.dimType === 'radius') {
      const s = this._worldToScreen(entity.cx, entity.cy)
      const r = (entity.radius || 0) * this._zoom * this._gridSize
      b = { l: s.x - r, t: s.y - r, r: s.x + r, btm: s.y + r }
    } else if (entity.dimType === 'angle') {
      const s = this._worldToScreen(entity.vertexX, entity.vertexY)
      const r = (entity.arcRadius || 20) * this._zoom * this._gridSize
      b = { l: s.x - r, t: s.y - r, r: s.x + r, btm: s.y + r }
    }
  }
  if (b) { const pad = 8; ctx.strokeRect(b.l - pad, b.t - pad, b.r - b.l + pad * 2, b.btm - b.t + pad * 2) }
  ctx.setLineDash([]); ctx.fillStyle = '#89b4fa'
  if (b) {
    const corners = [
      { x: b.l - 8, y: b.t - 8 },
      { x: b.r + 8, y: b.t - 8 },
      { x: b.l - 8, y: b.btm + 8 },
      { x: b.r + 8, y: b.btm + 8 }
    ]
    for (const c of corners) { ctx.beginPath(); ctx.arc(c.x, c.y, 4, 0, Math.PI * 2); ctx.fill() }
  }
  ctx.restore()
}

// ==================== 快照渲染 ====================

Engine.prototype._renderSnapshot = function () {
  const w = this.canvas.width
  const h = this.canvas.height
  const ctx = this.snapshotCtx
  ctx.fillStyle = '#1e1e2e'; ctx.fillRect(0, 0, w, h)
  this._drawGrid(ctx)
  const entities = this._entities
  for (let i = 0; i < entities.length; i++) {
    const layerId = entities[i].layer || '0'
    if (this._layerVisibility[layerId] === false) continue
    this._drawEntity(ctx, entities[i], false)
  }
}

Engine.prototype._invalidateSnapshot = function () { this._snapshotValid = false }

// ==================== 主渲染 ====================

Engine.prototype.render = function () {
  if (!this._snapshotValid) {
    this._renderSnapshot()
    this._snapshotValid = true
  }
  const ctx = this.ctx
  ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  ctx.drawImage(this.snapshotCanvas, 0, 0)
  if (this._snap.snapIndicator) {
    const p = this._worldToScreen(this._snap.snapIndicator.x, this._snap.snapIndicator.y)
    const c = this._snap.getColorForType(this._snap.snapIndicator.type)
    ctx.strokeStyle = c; ctx.fillStyle = c
    ctx.beginPath(); ctx.arc(p.x, p.y, SNAP_INDICATOR_RADIUS_INNER * this._zoom, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(p.x, p.y, SNAP_INDICATOR_RADIUS_OUTER * this._zoom, 0, Math.PI * 2); ctx.stroke()
  }
  drawPreviewDimension(this, ctx)
  drawEditPreview(this, ctx)
  if (this._selectedEntity) {
    this._drawEntity(ctx, this._selectedEntity, true)
    this._drawSelectionBox(ctx, this._selectedEntity)
  }
  if (this._isDrawing && this._drawingEntity) {
    this._drawEntity(ctx, this._drawingEntity, false)
    if (this._drawingEntity.type === 'POLYGON' && this._drawingEntity.vertices) {
      for (const v of this._drawingEntity.vertices) {
        const p = this._worldToScreen(v.x, v.y)
        ctx.fillStyle = '#a6e3a1'
        ctx.beginPath(); ctx.arc(p.x, p.y, 4 * this._zoom, 0, Math.PI * 2); ctx.fill()
      }
    }
    if (this._drawingEntity.type === 'POLYLINE' && this._drawingEntity.vertices) {
      for (const v of this._drawingEntity.vertices) {
        const p = this._worldToScreen(v.x, v.y)
        ctx.fillStyle = '#cba6f7'
        ctx.beginPath(); ctx.arc(p.x, p.y, 4 * this._zoom, 0, Math.PI * 2); ctx.fill()
      }
    }
  }
}

// ==================== 縮放與平移 ====================

Engine.prototype._zoomBy = function (factor, centerX, centerY) {
  const cx = centerX !== undefined ? centerX : this.canvas.width / 2
  const cy = centerY !== undefined ? centerY : this.canvas.height / 2
  const wx = (cx - this._panX) / (this._zoom * this._gridSize)
  const wy = (cy - this._panY) / (this._zoom * this._gridSize)
  this._zoom *= factor
  this._zoom = Math.max(0.1, Math.min(10, this._zoom))
  this._panX = cx - wx * this._zoom * this._gridSize
  this._panY = cy - wy * this._zoom * this._gridSize
  this._invalidateSnapshot()
  this.render()
}

Engine.prototype._onWheel = function (e) {
  if (this._destroyed) return
  e.preventDefault()
  const rect = this.canvas.getBoundingClientRect()
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top
  const factor = e.deltaY < 0 ? 1.1 : 0.9
  this._zoomBy(factor, sx, sy)
}

Engine.prototype.zoom = function (factor) {
  this._zoomBy(factor)
}

Engine.prototype.pan = function (dx, dy) {
  this._panX += dx
  this._panY += dy
  this._invalidateSnapshot()
  this.render()
}

Engine.prototype.fitToScreen = function () {
  if (this._entities.length === 0) {
    this._zoom = 1; this._panX = 0; this._panY = 0
    this._invalidateSnapshot(); this.render()
    return
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const e of this._entities) {
    if (e.type === 'LINE') { minX = Math.min(minX, e.x1, e.x2); minY = Math.min(minY, e.y1, e.y2); maxX = Math.max(maxX, e.x1, e.x2); maxY = Math.max(maxY, e.y1, e.y2) }
    else if (e.type === 'CIRCLE' || e.type === 'ARC') { minX = Math.min(minX, e.cx - e.radius); minY = Math.min(minY, e.cy - e.radius); maxX = Math.max(maxX, e.cx + e.radius); maxY = Math.max(maxY, e.cy + e.radius) }
    else if (e.type === 'POLYGON') { for (const v of e.vertices) { minX = Math.min(minX, v.x); minY = Math.min(minY, v.y); maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y) } }
    else if (e.type === 'POLYLINE') { for (const v of e.vertices) { minX = Math.min(minX, v.x); minY = Math.min(minY, v.y); maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y) } }
    else if (e.type === 'TEXT') { minX = Math.min(minX, e.x); minY = Math.min(minY, e.y); maxX = Math.max(maxX, e.x); maxY = Math.max(maxY, e.y) }
    else if (e.type === 'DIMENSION') {
      if (e.dimType === 'linear') { minX = Math.min(minX, e.x1, e.x2); minY = Math.min(minY, e.y1, e.y2); maxX = Math.max(maxX, e.x1, e.x2); maxY = Math.max(maxY, e.y1, e.y2) }
      else if (e.dimType === 'radius') { minX = Math.min(minX, e.cx - e.radius); minY = Math.min(minY, e.cy - e.radius); maxX = Math.max(maxX, e.cx + e.radius); maxY = Math.max(maxY, e.cy + e.radius) }
      else if (e.dimType === 'angle') { minX = Math.min(minX, e.vertexX); minY = Math.min(minY, e.vertexY); maxX = Math.max(maxX, e.vertexX); maxY = Math.max(maxY, e.vertexY) }
    }
  }
  if (!isFinite(minX)) { this._zoom = 1; this._panX = 0; this._panY = 0; this._invalidateSnapshot(); this.render(); return }
  const padding = 2
  const worldW = (maxX - minX) + padding * 2
  const worldH = (maxY - minY) + padding * 2
  if (worldW === 0 || worldH === 0) { this._zoom = 1; this._panX = 0; this._panY = 0; this._invalidateSnapshot(); this.render(); return }
  const screenW = this.canvas.width
  const screenH = this.canvas.height
  const zoomX = screenW / (worldW * this._gridSize)
  const zoomY = screenH / (worldH * this._gridSize)
  this._zoom = Math.min(zoomX, zoomY)
  this._zoom = Math.max(0.1, Math.min(10, this._zoom))
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  this._panX = screenW / 2 - centerX * this._zoom * this._gridSize
  this._panY = screenH / 2 - centerY * this._zoom * this._gridSize
  this._invalidateSnapshot()
  this.render()
}
