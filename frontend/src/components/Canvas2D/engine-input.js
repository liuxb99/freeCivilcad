// engine-input.js — 滑鼠與鍵盤事件處理
import { Engine } from './engine-core.js'
import { handleDimMouseDown, onMouseMove } from './DimensionTool.js'
import { handleEditMouseDown, handleEditMouseMove, handleEditMouseUp, isEditCommand } from './EditTools.js'
import { TOOL_KEYS, ACTION_KEYS } from '../../config/keybindings.js'

// ==================== 滑鼠事件 ====================

Engine.prototype._onMouseDown = function (e) {
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
      this._dragBeforeState = JSON.parse(JSON.stringify(hit))
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

  if (this._tool === 'polyline') {
    if (!this._isDrawing) {
      this._isDrawing = true
      this._drawingEntity = this._makeEntity('POLYLINE', { vertices: [{ x: world.x, y: world.y }] })
      this._drawingPhase = 1
      if (this._polylineHintEl) this._polylineHintEl.style.display = 'block'
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

Engine.prototype._onMouseMove = function (e) {
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

Engine.prototype._onMouseUp = function (e) {
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
      const after = JSON.parse(JSON.stringify(this._selectedEntity))
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

// ==================== 雙擊事件 ====================

Engine.prototype._onDblClick = function (e) {
  if (this._destroyed) return
  if (this._tool === 'polygon' && this._isDrawing && this._drawingEntity) {
    const verts = this._drawingEntity.vertices
    if (verts.length >= 3) {
      verts.pop()
      this._finishPolygon()
    }
  }
  if (this._tool === 'polyline' && this._isDrawing && this._drawingEntity) {
    const verts = this._drawingEntity.vertices
    if (verts.length >= 2) {
      this._finishPolyline(false)
    }
  }
}

// ==================== 文字輸入鍵盤事件 ====================

Engine.prototype._onTextInputKeyDown = function (e) {
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

// ==================== 鍵盤快捷鍵 ====================

Engine.prototype._onKeyDown = function (e) {
  if (this._destroyed) return
  // 文字輸入模式下，只處理 Escape 取消
  if (this._textInputOverlay && this._textInputOverlay.style.display !== 'none') {
    if (e.key === 'Escape') {
      this._textInputOverlay.style.display = 'none'
      this._textInput.value = ''
      this.setTool('select')
    }
    return
  }

  const key = e.key.toLowerCase()

  // ===== Ctrl/Meta 組合鍵（ACTION_KEYS） =====
  if (e.ctrlKey || e.metaKey) {
    const action = ACTION_KEYS[key]
    if (action === 'UNDO') {
      e.preventDefault()
      if (e.shiftKey) { this.redo() } else { this.undo() }
      this.render()
      return
    }
    if (action === 'REDO') {
      e.preventDefault()
      this.redo()
      this.render()
      return
    }
    // 其他 Ctrl 組合鍵由上層（App.jsx）處理 preventDefault
    return
  }

  // ===== 輸入焦點保護：若 focus 在 input 內，不處理工具快捷鍵 =====
  if (e.target.closest('input') || e.target.closest('textarea')) return

  // ===== Shift+M → MIRROR（MOVE 已佔用 'm'） =====
  if (e.shiftKey && key === 'm') {
    this.setTool('mirror')
    return
  }

  // ===== 工具切換（TOOL_KEYS） =====
  const toolName = TOOL_KEYS[key]
  if (toolName) {
    this.setTool(toolName.toLowerCase())
    return
  }

  // ===== 特殊功能鍵（非工具切換、非 Ctrl 組合） =====
  if (key === 's') {
    this.toggleSnap()
    return
  }

  if (key === 'Delete' || key === 'Backspace') {
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
    return
  }

  if (key === 'Escape') {
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
      return
    }
    if (this._isDrawing && this._drawingEntity && this._tool === 'polyline') {
      this._isDrawing = false
      this._drawingEntity = null
      this._drawingPhase = 0
      if (this._polylineHintEl) this._polylineHintEl.style.display = 'none'
      this.render()
      return
    }
    this.setTool('select')
    return
  }

  if (key === 'Enter' && this._tool === 'polygon' && this._isDrawing && this._drawingEntity && this._drawingEntity.vertices.length >= 3) {
    this._finishPolygon()
    return
  }

  if (key === 'Enter' && this._tool === 'polyline' && this._isDrawing && this._drawingEntity && this._drawingEntity.vertices.length >= 2) {
    this._finishPolyline(true)
    return
  }
}

// ==================== 事件繫結/解綁 ====================

Engine.prototype._bindEvents = function () {
  this.canvas.addEventListener('mousedown', this._onMouseDown)
  this.canvas.addEventListener('mousemove', this._onMouseMove)
  this.canvas.addEventListener('mouseup', this._onMouseUp)
  this.canvas.addEventListener('dblclick', this._onDblClick)
  this.canvas.addEventListener('wheel', this._onWheel, { passive: false })
  this.canvas.addEventListener('contextmenu', (e) => e.preventDefault())
  document.addEventListener('keydown', this._onKeyDown)
  this._onResize = () => {
    this._setupSize()
    this.render()
  }
  window.addEventListener('resize', this._onResize)
}

Engine.prototype._unbindEvents = function () {
  this.canvas.removeEventListener('mousedown', this._onMouseDown)
  this.canvas.removeEventListener('mousemove', this._onMouseMove)
  this.canvas.removeEventListener('mouseup', this._onMouseUp)
  this.canvas.removeEventListener('dblclick', this._onDblClick)
  this.canvas.removeEventListener('wheel', this._onWheel)
  document.removeEventListener('keydown', this._onKeyDown)
  if (this._onResize) window.removeEventListener('resize', this._onResize)
}
