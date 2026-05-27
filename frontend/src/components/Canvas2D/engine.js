import { HistoryManager } from './HistoryManager.js'
import { handleDimMouseDown, commitDimension, drawPreviewDimension, onMouseMove, getLineAngle } from './DimensionTool.js'
import SnapManager from './SnapManager.js'
import { handleEditMouseDown, handleEditMouseMove, handleEditMouseUp, drawEditPreview, isEditCommand, getEditToolCursor } from './EditTools.js'
import { canvasApi } from '../../services/api.js'

const DEFAULT_COLORS = {
  LINE: '#f38ba8',
  CIRCLE: '#89b4fa',
  ARC: '#f9e2af',
  POLYGON: '#a6e3a1',
  TEXT: '#f5c2e7',
  DIMENSION: '#a6e3a1'
}

function deepClone(o) { return JSON.parse(JSON.stringify(o)) }

function ptSegDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const ls = dx * dx + dy * dy
  if (ls === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / ls
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function normA(a) {
  return ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
}

class Engine {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.snapshotCanvas = document.createElement('canvas')
    this.snapshotCtx = this.snapshotCanvas.getContext('2d')

    this._idCounter = 1
    this._entities = []
    this._selectedEntity = null
    this._tool = 'select'
    this._activeLayer = '0'
    this._isDrawing = false
    this._isDragging = false
    this._isPanning = false
    this._drawingEntity = null
    this._drawingPhase = 0
    this._panStart = null
    this._panOffsetStart = null
    this._dragStart = null
    this._dragBeforeState = null
    this._showGrid = true
    this._gridSize = 20
    this._zoom = 1
    this._panX = 0
    this._panY = 0
    this._mouseScreenX = 0
    this._mouseScreenY = 0
    this._snapshotValid = false
    this._snapshotMode = true
    this._layerVisibility = {}
    this._layerColors = {}
    this._handlers = {}
    this._destroyed = false

    this._snap = new SnapManager()
    this._ortho = false
    this._snapOrigin = null
    this._editTool = null
    this._editState = null

    this._history = new HistoryManager(60)
    this._onCommand = null

    this._textInputOverlay = null
    this._polygonHintEl = null
    this._dimState = null
    this._dimPreview = null
    this._dimLine1 = null

    this._onMouseDown = this._onMouseDown.bind(this)
    this._onMouseMove = this._onMouseMove.bind(this)
    this._onMouseUp = this._onMouseUp.bind(this)
    this._onDblClick = this._onDblClick.bind(this)
    this._onWheel = this._onWheel.bind(this)
    this._onKeyDown = this._onKeyDown.bind(this)
    this._onTextInputKeyDown = this._onTextInputKeyDown.bind(this)

    this._setupSize()
    this._createOverlays()
    this._bindEvents()
    this._emit('modified')
    this.render()
  }

  _nextId() { return String(this._idCounter++) }

  _makeEntity(type, props) {
    const e = {
      id: this._nextId(),
      type,
      layer: this._activeLayer,
      color: DEFAULT_COLORS[type] || '#cdd6f4',
      lineWidth: 2
    }
    Object.assign(e, props)
    if (type === 'POLYGON' && !e.vertices) e.vertices = []
    return e
  }

  _screenToWorld(sx, sy) {
    return {
      x: (sx - this._panX) / (this._zoom * this._gridSize),
      y: (sy - this._panY) / (this._zoom * this._gridSize)
    }
  }

  _hitTest(wx, wy) {
    const th = 8 / (this._zoom * this._gridSize)
    const entities = this._entities
    for (let i = entities.length - 1; i >= 0; i--) {
      const e = entities[i]
      const layerId = e.layer || '0'
      if (this._layerVisibility[layerId] === false) continue
      if (e.type === 'LINE') {
        if (ptSegDist(wx, wy, e.x1, e.y1, e.x2, e.y2) < th) return e
      } else if (e.type === 'CIRCLE') {
        if (Math.abs(Math.hypot(wx - e.cx, wy - e.cy) - e.radius) < th) return e
      } else if (e.type === 'ARC') {
        const d = Math.hypot(wx - e.cx, wy - e.cy)
        if (Math.abs(d - e.radius) < th) {
          let a = Math.atan2(wy - e.cy, wx - e.cx)
          let sa = normA(e.startAngle), ea = normA(e.endAngle), aa = normA(a)
          if (sa <= ea) { if (aa >= sa && aa <= ea) return e }
          else { if (aa >= sa || aa <= ea) return e }
        }
      } else if (e.type === 'POLYGON') {
        const verts = e.vertices
        for (let j = 0; j < verts.length; j++) {
          const k = (j + 1) % verts.length
          if (ptSegDist(wx, wy, verts[j].x, verts[j].y, verts[k].x, verts[k].y) < th) return e
        }
      } else if (e.type === 'TEXT') {
        if (Math.hypot(wx - e.x, wy - e.y) < th * 3) return e
      } else if (e.type === 'DIMENSION') {
        if (e.dimType === 'linear') {
          const dx = e.x2 - e.x1, dy = e.y2 - e.y1
          const len = Math.hypot(dx, dy)
          if (len > 0.01) {
            const nx = -dy / len, ny = dx / len
            const off = e.offset || 15
            const lx1 = e.x1 + nx * off, ly1 = e.y1 + ny * off
            const lx2 = e.x2 + nx * off, ly2 = e.y2 + ny * off
            if (ptSegDist(wx, wy, lx1, ly1, lx2, ly2) < th) return e
          }
        } else if (e.dimType === 'radius') {
          const { cx, cy } = e
          const radius = e.radius || 0
          const la = e.leaderAngle !== undefined ? e.leaderAngle : -Math.PI / 4
          const ext = 15
          const ex = cx + radius * Math.cos(la)
          const ey = cy + radius * Math.sin(la)
          const tx = cx + (radius + ext) * Math.cos(la)
          const ty = cy + (radius + ext) * Math.sin(la)
          if (ptSegDist(wx, wy, ex, ey, tx, ty) < th) return e
        } else if (e.dimType === 'angle') {
          const { vertexX, vertexY, angleStart, angleEnd } = e
          const ar = e.arcRadius || 20
          const d = Math.hypot(wx - vertexX, wy - vertexY)
          if (Math.abs(d - ar) < th) {
            const a = Math.atan2(wy - vertexY, wx - vertexX)
            const sa = normA(angleStart), ea = normA(angleEnd), aa = normA(a)
            if (sa <= ea) { if (aa >= sa && aa <= ea) return e }
            else { if (aa >= sa || aa <= ea) return e }
          }
        }
      }
    }
    return null
  }

  _moveEntity(e, dx, dy) {
    if (e.type === 'LINE') { e.x1 += dx; e.y1 += dy; e.x2 += dx; e.y2 += dy }
    else if (e.type === 'CIRCLE' || e.type === 'ARC') { e.cx += dx; e.cy += dy }
    else if (e.type === 'POLYGON') { for (const v of e.vertices) { v.x += dx; v.y += dy } }
    else if (e.type === 'TEXT') { e.x += dx; e.y += dy }
    else if (e.type === 'DIMENSION') {
      if (e.dimType === 'linear') { e.x1 += dx; e.y1 += dy; e.x2 += dx; e.y2 += dy }
      else if (e.dimType === 'radius') { e.cx += dx; e.cy += dy }
      else if (e.dimType === 'angle') { e.vertexX += dx; e.vertexY += dy }
    }
  }

  _drawGrid(ctx) {
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

  _drawEntity(ctx, entity, highlight) {
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
          const arrowSize = 5 * this._zoom
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
        const arrowSize = 5 * this._zoom
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
        const arrowSize = 4 * this._zoom
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

  _drawSelectionBox(ctx, entity) {
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

  _renderSnapshot() {
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

  _invalidateSnapshot() { this._snapshotValid = false }

  _setupSize() {
    const parent = this.canvas.parentElement
    if (!parent) return
    const rect = parent.getBoundingClientRect()
    const w = Math.round(rect.width)
    const h = Math.round(rect.height)
    if (w === 0 || h === 0) return
    this.canvas.width = w
    this.canvas.height = h
    this.snapshotCanvas.width = w
    this.snapshotCanvas.height = h
    this._invalidateSnapshot()
  }

  _createOverlays() {
    const ti = document.createElement('div')
    ti.id = '__engine_text_input'
    ti.style.cssText = 'position:fixed;z-index:9999;display:none'
    const inp = document.createElement('input')
    inp.type = 'text'
    inp.placeholder = '輸入文字後 Enter 確認'
    inp.style.cssText = 'width:200px;padding:6px 10px;font-size:14px;background:#313244;border:2px solid #89b4fa;border-radius:6px;color:#cdd6f4;outline:none'
    ti.appendChild(inp)
    document.body.appendChild(ti)
    this._textInputOverlay = ti
    this._textInput = inp
    inp.addEventListener('keydown', this._onTextInputKeyDown)

    const ph = document.createElement('div')
    ph.id = '__engine_polygon_hint'
    ph.textContent = '雙擊完成多邊形 • Enter 閉合 • Esc 取消'
    ph.style.cssText = 'position:fixed;bottom:36px;left:50%;transform:translateX(-50%);background:#313244;color:#f9e2af;padding:4px 16px;border-radius:4px;font-size:12px;z-index:9999;display:none;pointer-events:none;white-space:nowrap'
    document.body.appendChild(ph)
    this._polygonHintEl = ph
  }

  _removeOverlays() {
    if (this._textInputOverlay && this._textInputOverlay.parentNode) {
      this._textInput.removeEventListener('keydown', this._onTextInputKeyDown)
      this._textInputOverlay.parentNode.removeChild(this._textInputOverlay)
    }
    if (this._polygonHintEl && this._polygonHintEl.parentNode) {
      this._polygonHintEl.parentNode.removeChild(this._polygonHintEl)
    }
    this._textInputOverlay = null
    this._textInput = null
    this._polygonHintEl = null
  }

  _finishPolygon() {
    const e = this._drawingEntity
    if (e && e.vertices.length >= 3) {
      const cmd = this._makeAddCmd(this._makeEntity('POLYGON', { vertices: e.vertices.map(v => ({ x: v.x, y: v.y })) }))
      this._history.execute(cmd)
      const added = this._entities[this._entities.length - 1]
      this._logCommand('ADD_ENTITY', added.id, null, { ...added })
      this._emit('entityAdded', added)
      this._emit('modified')
    }
    this._isDrawing = false
    this._drawingEntity = null
    this._drawingPhase = 0
    if (this._polygonHintEl) this._polygonHintEl.style.display = 'none'
    this.render()
  }

  _zoomBy(factor, centerX, centerY) {
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

  _makeAddCmd(entity) {
    const self = this
    return {
      execute() { self._entities.push(entity); self._invalidateSnapshot(); self._snap._invalidateCache() },
      undo() {
        const i = self._entities.indexOf(entity)
        if (i >= 0) self._entities.splice(i, 1)
        if (self._selectedEntity === entity) { self._selectedEntity = null; self._emit('select', null) }
        self._invalidateSnapshot()
      }
    }
  }

  _makeRemoveCmd(entity) {
    const self = this
    let idx = -1
    return {
      execute() {
        idx = self._entities.indexOf(entity)
        if (idx >= 0) self._entities.splice(idx, 1)
        if (self._selectedEntity === entity) { self._selectedEntity = null; self._emit('select', null) }
        self._invalidateSnapshot(); self._snap._invalidateCache()
      },
      undo() {
        if (idx >= 0) { self._entities.splice(idx, 0, entity); self._invalidateSnapshot() }
      }
    }
  }

  _makeMoveCmd(entity, before) {
    const self = this
    const b = deepClone(before)
    return {
      execute() { self._invalidateSnapshot() },
      undo() { Object.assign(entity, deepClone(b)); self._invalidateSnapshot(); self._emit('select', entity) }
    }
  }

  updateEntity(id, props) {
    const entity = this._entities.find(e => e.id === id)
    if (!entity) return
    const before = deepClone(entity)
    Object.assign(entity, props)
    const cmd = this._makeUpdateCmd(entity, before)
    this._history.execute(cmd)
    this._invalidateSnapshot()
    this._snap._invalidateCache()
    this._emit('select', entity)
    this.render()
  }

  _makeUpdateCmd(entity, before) {
    const self = this
    const b = deepClone(before)
    return {
      execute() { self._invalidateSnapshot(); self._snap._invalidateCache(); self._emit('select', entity) },
      undo() { Object.assign(entity, deepClone(b)); self._invalidateSnapshot(); self._snap._invalidateCache(); self._emit('select', entity) }
    }
  }

  _getSnappedPos(sx, sy) {
    const world = this._screenToWorld(sx, sy)
    if (!this._snap.snapToGrid && !this._snap.snapToEndpoint &&
        !this._snap.snapToMidpoint && !this._snap.snapToIntersection && !this._ortho) {
      return world
    }
    return this._snap.snap({ x: world.x, y: world.y, screenX: sx, screenY: sy }, this._entities)
  }

  _onMouseDown(e) {
    if (this._destroyed) return
    const rect = this.canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = this._getSnappedPos(sx, sy)
    this._mouseDownPos = { sx, sy, wx: world.x, wy: world.y }
    this._mouseScreenX = sx
    this._mouseScreenY = sy
    if (this._ortho && !this._isPanning) this._snapOrigin = { x: world.x, y: world.y }

    if (this._tool === 'pan' || (e.button === 1 && this._tool === 'select')) {
      this._isPanning = true
      this._panStart = { x: sx, y: sy }
      this._panOffsetStart = { x: this._panX, y: this._panY }
      e.preventDefault()
      return
    }

    if (this._tool === 'select') {
      const hit = this._hitTest(world.x, world.y)
      if (hit) {
        this._selectedEntity = hit
        this._isDragging = true
        this._dragStart = { x: world.x, y: world.y }
        this._dragBeforeState = deepClone(hit)
        this._invalidateSnapshot()
        this._emit('select', hit)
        this.render()
      } else {
        this._selectedEntity = null
        this._emit('select', null)
        this.render()
      }
      return
    }

    if (this._tool === 'line' && !this._isDrawing) {
      this._isDrawing = true
      this._drawingEntity = this._makeEntity('LINE', { x1: world.x, y1: world.y, x2: world.x, y2: world.y })
      this.render()
      return
    }

    if (this._tool === 'circle' && !this._isDrawing) {
      this._isDrawing = true
      this._drawingEntity = this._makeEntity('CIRCLE', { cx: world.x, cy: world.y, radius: 0 })
      this.render()
      return
    }

    if (this._tool === 'arc' && !this._isDrawing) {
      this._isDrawing = true
      this._drawingEntity = this._makeEntity('ARC', { cx: world.x, cy: world.y, radius: 0, startAngle: 0, endAngle: 0 })
      this.render()
      return
    }

    if (this._tool === 'polygon') {
      if (!this._isDrawing) {
        this._isDrawing = true
        this._drawingEntity = this._makeEntity('POLYGON', { vertices: [{ x: world.x, y: world.y }] })
        this._drawingPhase = 1
        if (this._polygonHintEl) this._polygonHintEl.style.display = 'block'
        this.render()
      } else {
        this._drawingEntity.vertices.push({ x: world.x, y: world.y })
        this.render()
      }
      return
    }

    if (this._tool === 'text') {
      const ti = this._textInputOverlay
      const inp = this._textInput
      if (ti && inp) {
        ti.style.display = 'block'
        ti.style.left = (e.clientX + 10) + 'px'
        ti.style.top = (e.clientY + 10) + 'px'
        inp.value = ''
        inp._worldX = world.x
        inp._worldY = world.y
        inp.focus()
      }
      return
    }

    if (this._tool === 'dim') {
      handleDimMouseDown(this, world.x, world.y)
      return
    }

    if (isEditCommand(this._tool)) {
      handleEditMouseDown(this, world.x, world.y, this._tool)
      return
    }
  }

  _onMouseMove(e) {
    if (this._destroyed) return
    const rect = this.canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    let world = this._screenToWorld(sx, sy)
    if (this._snapOrigin && this._ortho) {
      world = this._snap.snap({ x: world.x, y: world.y, screenX: sx, screenY: sy, originX: this._snapOrigin.x, originY: this._snapOrigin.y }, this._entities)
    } else if (this._snap.snapToGrid || this._snap.snapToEndpoint || this._snap.snapToMidpoint || this._snap.snapToIntersection) {
      world = this._snap.snap({ x: world.x, y: world.y, screenX: sx, screenY: sy }, this._entities)
    }
    this._mouseScreenX = sx
    this._mouseScreenY = sy

    if (this._isPanning && this._panStart) {
      this._panX = this._panOffsetStart.x + (sx - this._panStart.x)
      this._panY = this._panOffsetStart.y + (sy - this._panStart.y)
      this._invalidateSnapshot()
      this.render()
      return
    }

    if (this._isDragging && this._selectedEntity && this._dragStart) {
      const dx = world.x - this._dragStart.x
      const dy = world.y - this._dragStart.y
      this._moveEntity(this._selectedEntity, dx, dy)
      this._dragStart = { x: world.x, y: world.y }
      this._invalidateSnapshot()
      this._emit('select', this._selectedEntity)
      this.render()
      return
    }

    if (this._isDrawing && this._drawingEntity) {
      const de = this._drawingEntity
      if (de.type === 'LINE') {
        de.x2 = world.x; de.y2 = world.y
      } else if (de.type === 'CIRCLE') {
        de.radius = Math.hypot(world.x - de.cx, world.y - de.cy)
      } else if (de.type === 'ARC') {
        de.radius = Math.hypot(world.x - de.cx, world.y - de.cy)
        de.endAngle = Math.atan2(world.y - de.cy, world.x - de.cx)
      }
      this.render()
      return
    }

    if (this._tool === 'dim') {
      if (onMouseMove(this, world)) return
    }

    if (isEditCommand(this._tool)) {
      if (handleEditMouseMove(this, world.x, world.y, this._tool)) return
    }

    this._emit('mousemove', { screenX: sx, screenY: sy, worldX: world.x, worldY: world.y })
  }

  _onMouseUp(e) {
    if (this._destroyed) return
    const rect = this.canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = this._screenToWorld(sx, sy)

    if (this._isPanning) {
      this._isPanning = false
      return
    }

    if (this._isDragging) {
      this._isDragging = false
      if (this._selectedEntity && this._dragBeforeState) {
        const after = deepClone(this._selectedEntity)
        if (JSON.stringify(after) !== JSON.stringify(this._dragBeforeState)) {
          const cmd = this._makeMoveCmd(this._selectedEntity, this._dragBeforeState)
          this._history.execute(cmd)
          this._logCommand('MOVE_ENTITY', this._selectedEntity.id, this._dragBeforeState, after)
          this._emit('modified')
        }
      }
      this._dragBeforeState = null
      return
    }

    if (this._isDrawing && this._drawingEntity) {
      const de = this._drawingEntity
      if (de.type === 'LINE') {
        if (Math.hypot(de.x2 - de.x1, de.y2 - de.y1) > 0.1) {
          const cmd = this._makeAddCmd(this._makeEntity('LINE', { x1: de.x1, y1: de.y1, x2: de.x2, y2: de.y2 }))
          this._history.execute(cmd)
          const added = this._entities[this._entities.length - 1]
          this._logCommand('ADD_ENTITY', added.id, null, { ...added })
          this._emit('entityAdded', added)
          this._emit('modified')
        }
        this._isDrawing = false; this._drawingEntity = null; this.render()
      } else if (de.type === 'CIRCLE') {
        if (de.radius > 0.1) {
          const cmd = this._makeAddCmd(this._makeEntity('CIRCLE', { cx: de.cx, cy: de.cy, radius: de.radius }))
          this._history.execute(cmd)
          const added = this._entities[this._entities.length - 1]
          this._logCommand('ADD_ENTITY', added.id, null, { ...added })
          this._emit('entityAdded', added)
          this._emit('modified')
        }
        this._isDrawing = false; this._drawingEntity = null; this.render()
      } else if (de.type === 'ARC') {
        if (de.radius > 0.1) {
          const cmd = this._makeAddCmd(this._makeEntity('ARC', { cx: de.cx, cy: de.cy, radius: de.radius, startAngle: de.startAngle, endAngle: de.endAngle }))
          this._history.execute(cmd)
          const added = this._entities[this._entities.length - 1]
          this._logCommand('ADD_ENTITY', added.id, null, { ...added })
          this._emit('entityAdded', added)
          this._emit('modified')
        }
        this._isDrawing = false; this._drawingEntity = null; this.render()
      }
    }

    if (isEditCommand(this._tool)) {
      handleEditMouseUp(this, world.x, world.y, this._tool)
    }
  }

  _getActiveColor() {
    const layer = this.activeLayer || '0'
    return this._layerColors?.[layer] || '#a6e3a1'
  }

  _onDblClick(e) {
    if (this._destroyed) return
    if (this._tool === 'polygon' && this._isDrawing && this._drawingEntity) {
      const verts = this._drawingEntity.vertices
      if (verts.length >= 3) {
        verts.pop()
        this._finishPolygon()
      }
    }
  }

  _onWheel(e) {
    if (this._destroyed) return
    e.preventDefault()
    const rect = this.canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    this._zoomBy(factor, sx, sy)
  }

  _onTextInputKeyDown(e) {
    if (e.key === 'Enter') {
      const inp = this._textInput
      const text = inp.value.trim()
      if (text && inp._worldX !== undefined) {
        const cmd = this._makeAddCmd(this._makeEntity('TEXT', { x: inp._worldX, y: inp._worldY, text, fontSize: 1 }))
        this._history.execute(cmd)
        const added = this._entities[this._entities.length - 1]
        this._logCommand('ADD_ENTITY', added.id, null, { ...added })
        this._emit('entityAdded', added)
        this._emit('modified')
        this.render()
      }
      this._textInputOverlay.style.display = 'none'
      inp.value = ''
      this.setTool('select')
    } else if (e.key === 'Escape') {
      this._textInputOverlay.style.display = 'none'
      this._textInput.value = ''
      this.setTool('select')
    }
  }

  _onKeyDown(e) {
    if (this._destroyed) return
    if (this._textInputOverlay && this._textInputOverlay.style.display !== 'none') {
      if (e.key === 'Escape') {
        this._textInputOverlay.style.display = 'none'
        this._textInput.value = ''
        this.setTool('select')
      }
      return
    }
    if (e.key === 'v' || e.key === 'V') this.setTool('select')
    else if (e.key === 'l' || e.key === 'L') this.setTool('line')
    else if (e.key === 'c' || e.key === 'C') this.setTool('circle')
    else if (e.key === 'a' || e.key === 'A') this.setTool('arc')
    else if (e.key === 'p' || e.key === 'P') this.setTool('polygon')
    else if (e.key === 't' || e.key === 'T') this.setTool('text')
    else if (e.key === 'd' || e.key === 'D') this.setTool('dim')
    else if (e.key === 'h' || e.key === 'H') this.setTool('pan')
    else if (e.key === 's' && !(e.ctrlKey || e.metaKey)) { this.toggleSnap() }
    else if (e.key === 'o' && !(e.ctrlKey || e.metaKey)) { this.toggleOrtho() }
    else if (e.key === 'r' && !(e.ctrlKey || e.metaKey)) { this.setTool('rect') }
    else if (e.key === 'm' && !(e.ctrlKey || e.metaKey)) { this.setTool('mirror') }
    else if (e.key === 'x' && !(e.ctrlKey || e.metaKey)) { this.setTool('copy') }
    else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (e.shiftKey) { this.redo() } else { this.undo() }
      this.render()
    }
    else if ((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      this.redo()
      this.render()
    }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this._selectedEntity && !e.target.closest('input')) {
        const before = { ...this._selectedEntity }
        const removedId = this._selectedEntity.id
        const cmd = this._makeRemoveCmd(this._selectedEntity)
        this._history.execute(cmd)
        this._logCommand('DELETE_ENTITY', removedId, before, null)
        this._emit('entityRemoved', removedId)
        this._emit('modified')
        this.render()
      }
    }
    else if (e.key === 'Escape') {
      if (this._dimState) {
        this._dimState = null
        this._dimPreview = null
        this._dimLine1 = null
        this.render()
        return
      }
      if (this._isDrawing && this._drawingEntity && this._tool === 'polygon') {
        this._isDrawing = false
        this._drawingEntity = null
        this._drawingPhase = 0
        if (this._polygonHintEl) this._polygonHintEl.style.display = 'none'
        this.render()
      }
      this.setTool('select')
    }
    else if (e.key === 'Enter' && this._tool === 'polygon' && this._isDrawing && this._drawingEntity && this._drawingEntity.vertices.length >= 3) {
      this._finishPolygon()
    }
  }

  _bindEvents() {
    this.canvas.addEventListener('mousedown', this._onMouseDown)
    this.canvas.addEventListener('mousemove', this._onMouseMove)
    this.canvas.addEventListener('mouseup', this._onMouseUp)
    this.canvas.addEventListener('dblclick', this._onDblClick)
    this.canvas.addEventListener('wheel', this._onWheel, { passive: false })
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault())
    document.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('resize', this._onResize = () => {
      this._setupSize()
      this.render()
    })
  }

  _unbindEvents() {
    this.canvas.removeEventListener('mousedown', this._onMouseDown)
    this.canvas.removeEventListener('mousemove', this._onMouseMove)
    this.canvas.removeEventListener('mouseup', this._onMouseUp)
    this.canvas.removeEventListener('dblclick', this._onDblClick)
    this.canvas.removeEventListener('wheel', this._onWheel)
    document.removeEventListener('keydown', this._onKeyDown)
    if (this._onResize) window.removeEventListener('resize', this._onResize)
  }

  _emit(event, ...args) {
    const handlers = this._handlers[event]
    if (handlers) {
      for (const fn of handlers) { fn(...args) }
    }
  }

  // ==================== Public API ====================

  setTool(tool) {
    if (tool === this._tool && tool === 'polygon' && this._isDrawing) return
    if (this._isDrawing && this._drawingEntity && this._tool === 'polygon') {
      if (this._drawingEntity.vertices.length >= 3) { this._finishPolygon() }
    }
    const prev = this._tool
    this._tool = tool
    this._editState = null
    if (tool !== 'polygon') {
      this._isDrawing = false
      this._drawingEntity = null
      this._drawingPhase = 0
      if (this._polygonHintEl) this._polygonHintEl.style.display = 'none'
    }
    if (tool !== 'dim') {
      this._dimState = null
      this._dimPreview = null
      this._dimLine1 = null
    }
    if (tool !== 'text' && this._textInputOverlay) { this._textInputOverlay.style.display = 'none' }
    if (tool === 'select' || tool === 'pan') {
    } else if (!isEditCommand(tool)) {
      this._selectedEntity = null
      this._emit('select', null)
    }
    if (prev !== tool) this._emit('toolChanged', tool)
  }

  getTool() { return this._tool }

  setActiveLayer(layerId) { this._activeLayer = layerId }
  getActiveLayer() { return this._activeLayer }

  addEntity(entity) {
    const e = this._makeEntity(entity.type || 'LINE', entity)
    const cmd = this._makeAddCmd(e)
    this._history.execute(cmd)
    this._logCommand('ADD_ENTITY', e.id, null, { ...e })
    this._emit('entityAdded', e)
    this._emit('modified')
    return e
  }

  removeEntity(id) {
    const idx = this._entities.findIndex(e => e.id === id)
    if (idx < 0) return false
    const entity = this._entities[idx]
    const before = { ...entity }
    const cmd = this._makeRemoveCmd(entity)
    this._history.execute(cmd)
    this._logCommand('DELETE_ENTITY', id, before, null)
    this._emit('entityRemoved', id)
    this._emit('modified')
    return true
  }

  getEntities() { return this._entities }

  setEntities(entities) {
    this._entities = entities.slice()
    this._selectedEntity = null
    this._history = new HistoryManager(60)
    this._invalidateSnapshot()
    this._emit('select', null)
    this._emit('modified')
    this.render()
  }

  clear() {
    this._entities = []
    this._selectedEntity = null
    this._history = new HistoryManager(60)
    this._invalidateSnapshot()
    this._emit('select', null)
    this._emit('modified')
    this.render()
  }

  selectEntity(x, y) {
    const hit = this._hitTest(x, y)
    this._selectedEntity = hit
    this._emit('select', hit)
    this._invalidateSnapshot()
    this.render()
    return hit
  }

  selectById(id) {
    const entity = this._entities.find(e => e.id === id)
    if (entity) {
      this._selectedEntity = entity
      this._emit('select', entity)
      this._invalidateSnapshot()
      this.render()
    }
    return entity || null
  }

  moveSelected(dx, dy) {
    if (!this._selectedEntity) return
    const before = deepClone(this._selectedEntity)
    this._moveEntity(this._selectedEntity, dx, dy)
    const after = deepClone(this._selectedEntity)
    const cmd = this._makeMoveCmd(this._selectedEntity, before)
    this._history.execute(cmd)
    this._logCommand('MOVE_ENTITY', this._selectedEntity.id, before, after)
    this._invalidateSnapshot()
    this._emit('modified')
    this.render()
  }

  deleteSelected() {
    if (!this._selectedEntity) return
    const entity = this._selectedEntity
    const before = { ...entity }
    const cmd = this._makeRemoveCmd(entity)
    this._history.execute(cmd)
    this._logCommand('DELETE_ENTITY', entity.id, before, null)
    this._emit('entityRemoved', entity.id)
    this._emit('modified')
    this.render()
  }

  getSelected() { return this._selectedEntity }

  undo() {
    const result = this._history.undo()
    if (result) { this._invalidateSnapshot(); this._emit('modified'); this.render(); this._tryBackendUndo() }
    return result
  }

  redo() {
    const result = this._history.redo()
    if (result) { this._invalidateSnapshot(); this._emit('modified'); this.render(); this._tryBackendRedo() }
    return result
  }

  async _tryBackendUndo() {
    try { await canvasApi.undoCommand() } catch (e) { /* offline-safe */ }
  }

  async _tryBackendRedo() {
    try { await canvasApi.redoCommand() } catch (e) { /* offline-safe */ }
  }

  canUndo() { return this._history.canUndo() }
  canRedo() { return this._history.canRedo() }

  setCommandCallback(fn) { this._onCommand = fn }

  _logCommand(type, entityId, before, after) {
    if (this._onCommand) {
      this._onCommand(type, entityId, before, after)
    }
  }

  zoom(factor) {
    this._zoomBy(factor)
  }

  pan(dx, dy) {
    this._panX += dx
    this._panY += dy
    this._invalidateSnapshot()
    this.render()
  }

  fitToScreen() {
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

  render() {
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
      ctx.beginPath(); ctx.arc(p.x, p.y, 5 * this._zoom, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(p.x, p.y, 8 * this._zoom, 0, Math.PI * 2); ctx.stroke()
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
    }
  }

  toggleSnap() {
    this._snap.snapToGrid = !this._snap.snapToGrid
    this._invalidateSnapshot(); this.render()
  }

  toggleOrtho() {
    this._ortho = !this._ortho
    if (!this._ortho) this._snapOrigin = null
    this._invalidateSnapshot(); this.render()
  }

  getSnapState() {
    return { snapToGrid: this._snap.snapToGrid, ortho: this._ortho }
  }

  getZoom() {
    return this._zoom
  }

  setSnapshotMode(enable) {
    this._snapshotMode = enable
    if (!enable) this._snapshotValid = false
  }

  exportDXF() {
    let s = '0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n'
    for (const e of this._entities) {
      if (e.type === 'LINE') {
        s += '0\nLINE\n8\n' + e.layer + '\n10\n' + e.x1 + '\n20\n' + e.y1 + '\n11\n' + e.x2 + '\n21\n' + e.y2 + '\n'
      } else if (e.type === 'CIRCLE') {
        s += '0\nCIRCLE\n8\n' + e.layer + '\n10\n' + e.cx + '\n20\n' + e.cy + '\n40\n' + e.radius + '\n'
      } else if (e.type === 'ARC') {
        s += '0\nARC\n8\n' + e.layer + '\n10\n' + e.cx + '\n20\n' + e.cy + '\n40\n' + e.radius + '\n50\n' + (e.startAngle * 180 / Math.PI) + '\n51\n' + (e.endAngle * 180 / Math.PI) + '\n'
      } else if (e.type === 'POLYGON') {
        s += '0\nLWPOLYLINE\n8\n' + e.layer + '\n90\n' + e.vertices.length + '\n70\n1\n'
        for (const v of e.vertices) { s += '10\n' + v.x + '\n20\n' + v.y + '\n' }
      } else if (e.type === 'TEXT') {
        s += '0\nTEXT\n8\n' + e.layer + '\n10\n' + e.x + '\n20\n' + e.y + '\n40\n1\n1\n' + e.text + '\n'
      } else if (e.type === 'DIMENSION') {
        if (e.dimType === 'linear') {
          s += '0\nLINE\n8\n' + e.layer + '\n10\n' + e.x1 + '\n20\n' + e.y1 + '\n11\n' + e.x2 + '\n21\n' + e.y2 + '\n'
          const dx = e.x2 - e.x1, dy = e.y2 - e.y1
          const len = Math.hypot(dx, dy)
          if (len > 0) {
            const nx = -dy / len, ny = dx / len
            const ox = nx * (e.offset || 15), oy = ny * (e.offset || 15)
            s += '0\nLINE\n8\n' + e.layer + '\n10\n' + (e.x1 + ox) + '\n20\n' + (e.y1 + oy) + '\n11\n' + (e.x2 + ox) + '\n21\n' + (e.y2 + oy) + '\n'
          }
        } else if (e.dimType === 'radius') {
          const a = e.leaderAngle || -Math.PI / 4
          const tx = e.cx + (e.radius + 15) * Math.cos(a)
          const ty = e.cy + (e.radius + 15) * Math.sin(a)
          s += '0\nLINE\n8\n' + e.layer + '\n10\n' + e.cx + '\n20\n' + e.cy + '\n11\n' + tx + '\n21\n' + ty + '\n'
        } else if (e.dimType === 'angle') {
          const r = e.arcRadius || 20
          const steps = 12
          for (let i = 0; i < steps; i++) {
            const t0 = e.angleStart + (e.angleEnd - e.angleStart) * i / steps
            const t1 = e.angleStart + (e.angleEnd - e.angleStart) * (i + 1) / steps
            s += '0\nLINE\n8\n' + e.layer + '\n10\n' + (e.vertexX + r * Math.cos(t0)) + '\n20\n' + (e.vertexY + r * Math.sin(t0)) + '\n11\n' + (e.vertexX + r * Math.cos(t1)) + '\n21\n' + (e.vertexY + r * Math.sin(t1)) + '\n'
          }
        }
      }
    }
    s += '0\nENDSEC\n0\nEOF'
    return s
  }

  exportJSON() {
    return JSON.stringify({
      version: '1.0',
      entities: this._entities,
      nextId: this._idCounter
    })
  }

  importJSON(json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json
      if (!data.entities || !Array.isArray(data.entities)) return false
      this._entities = data.entities
      this._idCounter = data.nextId || Math.max(...data.entities.map(e => parseInt(e.id, 10) || 0), 0) + 1
      this._selectedEntity = null
      this._history = new HistoryManager(60)
      this._invalidateSnapshot()
      this._emit('select', null)
      this._emit('modified')
      this.render()
      return true
    } catch (e) {
      return false
    }
  }

  setLayerVisible(layerId, visible) {
    this._layerVisibility[layerId] = visible
    this._invalidateSnapshot()
    this.render()
  }

  setLayerColor(layerId, color) {
    this._layerColors[layerId] = color
    for (const e of this._entities) {
      if (e.layer === layerId) e.color = color
    }
    this._invalidateSnapshot()
    this.render()
  }

  getLayerVisibility() { return { ...this._layerVisibility } }

  getLayerColors() { return { ...this._layerColors } }

  on(event, callback) {
    if (!this._handlers[event]) this._handlers[event] = []
    this._handlers[event].push(callback)
    return () => {
      const h = this._handlers[event]
      if (h) this._handlers[event] = h.filter(fn => fn !== callback)
    }
  }

  getCursor() {
    if (this._tool === 'select') return 'default'
    if (this._tool === 'pan') return 'grab'
    return 'crosshair'
  }

  resize() {
    this._setupSize()
    this.render()
  }

  destroy() {
    this._destroyed = true
    this._unbindEvents()
    this._removeOverlays()
    this._entities = []
    this._selectedEntity = null
    this._drawingEntity = null
    this._handlers = {}
  }
}

export { Engine }
