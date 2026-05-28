// engine-core.js — 核心狀態管理與 Entity CRUD
import { HistoryManager } from './HistoryManager.js'
import SnapManager from './SnapManager.js'
import { isEditCommand } from './EditTools.js'
import { GRID_SIZE } from '../../config/constants.js'

const DEFAULT_COLORS = {
  LINE: '#f38ba8',
  CIRCLE: '#89b4fa',
  ARC: '#f9e2af',
  POLYGON: '#a6e3a1',
  POLYLINE: '#cba6f7',
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
    this._gridSize = GRID_SIZE
    this._zoom = 1
    this._panX = 0
    this._panY = 0
    this._mouseScreenX = 0
    this._mouseScreenY = 0
    this._snapshotValid = false
    this._snapshotMode = true
    this._layers = [
      { id: '0', name: '預設圖層', color: '#a6e3a1', visible: true, locked: false }
    ]
    this._layerVisibility = { '0': true }
    this._layerColors = { '0': '#a6e3a1' }
    this._layerLocked = {}
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

  // ==================== 內部輔助方法 ====================

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
    if (type === 'POLYLINE') {
      if (!e.vertices) e.vertices = []
      if (e.isClosed === undefined) e.isClosed = false
    }
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
      } else if (e.type === 'POLYLINE') {
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
    else if (e.type === 'POLYLINE') { for (const v of e.vertices) { v.x += dx; v.y += dy } }
    else if (e.type === 'TEXT') { e.x += dx; e.y += dy }
    else if (e.type === 'DIMENSION') {
      if (e.dimType === 'linear') { e.x1 += dx; e.y1 += dy; e.x2 += dx; e.y2 += dy }
      else if (e.dimType === 'radius') { e.cx += dx; e.cy += dy }
      else if (e.dimType === 'angle') { e.vertexX += dx; e.vertexY += dy }
    }
  }

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

    const plh = document.createElement('div')
    plh.id = '__engine_polyline_hint'
    plh.textContent = '點按新增頂點 • Enter 閉合 • Esc 取消 • 雙擊結束'
    plh.style.cssText = 'position:fixed;bottom:36px;left:50%;transform:translateX(-50%);background:#313244;color:#cba6f7;padding:4px 16px;border-radius:4px;font-size:12px;z-index:9999;display:none;pointer-events:none;white-space:nowrap'
    document.body.appendChild(plh)
    this._polylineHintEl = plh
  }

  _removeOverlays() {
    if (this._textInputOverlay && this._textInputOverlay.parentNode) {
      this._textInput.removeEventListener('keydown', this._onTextInputKeyDown)
      this._textInputOverlay.parentNode.removeChild(this._textInputOverlay)
    }
    if (this._polygonHintEl && this._polygonHintEl.parentNode) {
      this._polygonHintEl.parentNode.removeChild(this._polygonHintEl)
    }
    if (this._polylineHintEl && this._polylineHintEl.parentNode) {
      this._polylineHintEl.parentNode.removeChild(this._polylineHintEl)
    }
    this._textInputOverlay = null
    this._textInput = null
    this._polygonHintEl = null
    this._polylineHintEl = null
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

  _finishPolyline(close) {
    const e = this._drawingEntity
    if (e && e.vertices.length >= 2) {
      const cmd = this._makeAddCmd(this._makeEntity('POLYLINE', {
        vertices: e.vertices.map(v => ({ x: v.x, y: v.y })),
        isClosed: !!close
      }))
      this._history.execute(cmd)
      const added = this._entities[this._entities.length - 1]
      this._logCommand('ADD_ENTITY', added.id, null, { ...added })
      this._emit('entityAdded', added)
      this._emit('modified')
    }
    this._isDrawing = false
    this._drawingEntity = null
    this._drawingPhase = 0
    if (this._polylineHintEl) this._polylineHintEl.style.display = 'none'
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

  _emit(event, ...args) {
    const handlers = this._handlers[event]
    if (handlers) {
      for (const fn of handlers) { fn(...args) }
    }
  }

  _getActiveColor() {
    const layer = this._activeLayer || '0'
    return this._layerColors?.[layer] || '#a6e3a1'
  }

  _logCommand(type, entityId, before, after) {
    if (this._onCommand) {
      this._onCommand(type, entityId, before, after)
    }
  }

  // ==================== 公開 CRUD API ====================

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

  // ==================== 工具與狀態管理 ====================

  setTool(tool) {
    if (tool === this._tool && (tool === 'polygon' || tool === 'polyline') && this._isDrawing) return
    if (this._isDrawing && this._drawingEntity && this._tool === 'polygon') {
      if (this._drawingEntity.vertices.length >= 3) { this._finishPolygon() }
    }
    if (this._isDrawing && this._drawingEntity && this._tool === 'polyline') {
      if (this._drawingEntity.vertices.length >= 2) { this._finishPolyline(false) }
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
    if (tool !== 'polyline') {
      this._isDrawing = false
      this._drawingEntity = null
      this._drawingPhase = 0
      if (this._polylineHintEl) this._polylineHintEl.style.display = 'none'
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

  setActiveLayer(layerId) {
    this._activeLayer = layerId
    const layer = this._layers.find(l => l.id === layerId)
    if (layer) {
      this._layerColors[layerId] = layer.color
      this._layerVisibility[layerId] = layer.visible
    }
  }
  getActiveLayer() { return this._activeLayer }

  /** 回傳所有圖層的拷貝陣列 */
  getLayers() { return this._layers.map(l => ({ ...l })) }

  /** 新增圖層，自動產生 ID，回傳新圖層物件 */
  addLayer(name, color) {
    const id = this._nextId()
    const layer = { id, name, color: color || '#a6e3a1', visible: true, locked: false }
    this._layers.push(layer)
    this._layerVisibility[id] = true
    this._layerColors[id] = layer.color
    this._layerLocked[id] = false
    this._invalidateSnapshot()
    this._emit('modified')
    return { ...layer }
  }

  /** 刪除圖層（不得刪除最後一個圖層或 '0' 以外由呼叫方控制）*/
  removeLayer(id) {
    if (this._layers.length <= 1) return false
    const idx = this._layers.findIndex(l => l.id === id)
    if (idx < 0) return false
    this._layers.splice(idx, 1)
    delete this._layerVisibility[id]
    delete this._layerColors[id]
    delete this._layerLocked[id]
    // 將屬於該圖層的圖元移至預設圖層
    for (const e of this._entities) {
      if (e.layer === id) e.layer = '0'
    }
    if (this._activeLayer === id) this.setActiveLayer('0')
    this._invalidateSnapshot()
    this._emit('modified')
    return true
  }

  /** 設定圖層鎖定狀態 */
  setLayerLocked(id, locked) {
    const layer = this._layers.find(l => l.id === id)
    if (!layer) return
    layer.locked = !!locked
    this._layerLocked[id] = !!locked
    this._emit('modified')
  }

  /** 查詢圖層鎖定狀態 */
  getLayerLocked(id) {
    return !!this._layerLocked[id]
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

  getZoom() { return this._zoom }

  setSnapshotMode(enable) {
    this._snapshotMode = enable
    if (!enable) this._snapshotValid = false
  }

  setLayerVisible(layerId, visible) {
    this._layerVisibility[layerId] = visible
    const layer = this._layers.find(l => l.id === layerId)
    if (layer) layer.visible = !!visible
    this._invalidateSnapshot()
    this.render()
  }

  setLayerColor(layerId, color) {
    this._layerColors[layerId] = color
    const layer = this._layers.find(l => l.id === layerId)
    if (layer) layer.color = color
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

  // ==================== JSON 匯入/匯出 ====================

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
}

export { Engine }
export { deepClone, ptSegDist, normA, DEFAULT_COLORS }
