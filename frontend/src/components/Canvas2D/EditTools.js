export function isEditCommand(cmd) {
  return ['copy', 'rotate', 'mirror', 'offset', 'trim', 'rect'].includes(cmd)
}

export function getEditToolCursor(tool) {
  const map = { copy: 'copy', rotate: 'grab', mirror: 'crosshair', offset: 'cell', trim: 'pointer', rect: 'crosshair' }
  return map[tool] || 'default'
}

export function handleEditMouseDown(engine, worldX, worldY, editTool) {
  if (editTool === 'rect') {
    if (!engine._isDrawing) {
      engine._isDrawing = true
      engine._drawingEntity = engine._makeEntity('POLYGON', { vertices: [{ x: worldX, y: worldY }, { x: worldX, y: worldY }, { x: worldX, y: worldY }, { x: worldX, y: worldY }] })
      engine._drawingPhase = 1
      engine.render()
    } else {
      const de = engine._drawingEntity
      if (de && de.vertices && de.vertices.length >= 2) {
        const v0 = de.vertices[0]
        if (Math.abs(worldX - v0.x) > 0.1 || Math.abs(worldY - v0.y) > 0.1) {
          const cmd = engine._makeAddCmd(engine._makeEntity('POLYGON', { vertices: [v0, { x: worldX, y: v0.y }, { x: worldX, y: worldY }, { x: v0.x, y: worldY }] }))
          engine._history.execute(cmd)
          engine._emit('entityAdded', engine._entities[engine._entities.length - 1])
          engine._emit('modified')
        }
      }
      engine._isDrawing = false
      engine._drawingEntity = null
      engine.render()
    }
    return
  }

  if (editTool === 'copy') {
    const hit = engine._hitTest(worldX, worldY)
    if (!hit) return
    const copy = JSON.parse(JSON.stringify(hit))
    copy.id = engine._nextId()
    copy.x = (copy.x || 0) + 10
    copy.y = (copy.y || 0) + 10
    if (copy.type === 'LINE') { copy.x1 += 10; copy.y1 += 10; copy.x2 += 10; copy.y2 += 10 }
    else if (copy.type === 'CIRCLE' || copy.type === 'ARC') { copy.cx += 10; copy.cy += 10 }
    else if (copy.type === 'POLYGON' && copy.vertices) { for (const v of copy.vertices) { v.x += 10; v.y += 10 } }
    else if (copy.type === 'TEXT') { copy.x += 10; copy.y += 10 }
    else if (copy.type === 'DIMENSION') {
      if (copy.dimType === 'linear') { copy.x1 += 10; copy.y1 += 10; copy.x2 += 10; copy.y2 += 10 }
      else if (copy.dimType === 'radius') { copy.cx += 10; copy.cy += 10 }
      else if (copy.dimType === 'angle') { copy.vertexX += 10; copy.vertexY += 10 }
    }
    const cmd = engine._makeAddCmd(copy)
    engine._history.execute(cmd)
    engine._emit('entityAdded', engine._entities[engine._entities.length - 1])
    engine._emit('modified')
    engine.render()
    return
  }

  if (editTool === 'rotate') {
    const hit = engine._hitTest(worldX, worldY)
    if (!hit) return
    engine._editState = { target: hit, baseX: worldX, baseY: worldY, startAngle: 0, previewAngle: 0 }
    engine._editState.startAngle = Math.atan2(worldY - hit.cy || worldY - hit.y1 || 0, worldX - hit.cx || worldX - hit.x1 || 0)
    return
  }

  if (editTool === 'mirror') {
    const hit = engine._hitTest(worldX, worldY)
    if (!hit) {
      if (engine._editState && engine._editState.mirrorP1) {
        const p2 = { x: worldX, y: worldY }
        const p1 = engine._editState.mirrorP1
        const target = engine._editState.mirrorTarget
        if (target) {
          const dx = p2.x - p1.x, dy = p2.y - p1.y
          const len = Math.hypot(dx, dy)
          if (len > 0.01) {
            const copy = JSON.parse(JSON.stringify(target))
            copy.id = engine._nextId()
            const rx = p1.x, ry = p1.y
            const nx = dx / len, ny = dy / len
            const d = 2 * ((copy.x1 || copy.cx || copy.x || 0) - rx) * nx + 2 * ((copy.y1 || copy.cy || copy.y || 0) - ry) * ny
            if (copy.type === 'LINE') { copy.x1 -= d * nx; copy.y1 -= d * ny; copy.x2 -= d * nx; copy.y2 -= d * ny }
            else if (copy.type === 'CIRCLE' || copy.type === 'ARC') { copy.cx -= d * nx; copy.cy -= d * ny }
            else if (copy.type === 'POLYGON' && copy.vertices) { for (const v of copy.vertices) { v.x -= d * nx; v.y -= d * ny } }
            else if (copy.type === 'TEXT') { copy.x -= d * nx; copy.y -= d * ny }
            const cmd = engine._makeAddCmd(copy)
            engine._history.execute(cmd)
            engine._emit('entityAdded', engine._entities[engine._entities.length - 1])
            engine._emit('modified')
            engine.render()
          }
        }
        engine._editState = null
        return
      }
      return
    }
    engine._editState = { mirrorTarget: hit, mirrorP1: { x: worldX, y: worldY } }
    return
  }

  if (editTool === 'offset') {
    const hit = engine._hitTest(worldX, worldY)
    if (!hit) return
    const dist = 15
    const copy = JSON.parse(JSON.stringify(hit))
    copy.id = engine._nextId()
    if (copy.type === 'LINE') {
      const dx = copy.x2 - copy.x1, dy = copy.y2 - copy.y1
      const len = Math.hypot(dx, dy)
      if (len > 0.01) {
        const nx = -dy / len * dist, ny = dx / len * dist
        copy.x1 += nx; copy.y1 += ny; copy.x2 += nx; copy.y2 += ny
      }
    } else if (copy.type === 'CIRCLE') {
      copy.radius += dist
    }
    const cmd = engine._makeAddCmd(copy)
    engine._history.execute(cmd)
    engine._emit('entityAdded', engine._entities[engine._entities.length - 1])
    engine._emit('modified')
    engine.render()
    return
  }

  if (editTool === 'trim') {
    const hit = engine._hitTest(worldX, worldY)
    if (!hit) return
    const cmd = engine._makeRemoveCmd(hit)
    engine._history.execute(cmd)
    engine._logCommand('DELETE_ENTITY', hit.id, hit, null)
    engine._emit('entityRemoved', hit.id)
    engine._emit('modified')
    engine.render()
    return
  }
}

export function handleEditMouseMove(engine, worldX, worldY, editTool) {
  if (editTool === 'rect' && engine._isDrawing && engine._drawingEntity && engine._drawingEntity.vertices) {
    const v = engine._drawingEntity.vertices
    v[1] = { x: worldX, y: v[0].y }
    v[2] = { x: worldX, y: worldY }
    v[3] = { x: v[0].x, y: worldY }
    engine.render()
    return true
  }

  if (editTool === 'rotate' && engine._editState && engine._editState.target) {
    const es = engine._editState
    const angle = Math.atan2(worldY - es.baseY, worldX - es.baseX)
    es.previewAngle = angle
    const target = es.target
    const dx = worldX - es.baseX, dy = worldY - es.baseY
    const dist = Math.hypot(dx, dy)
    Object.assign(target, JSON.parse(JSON.stringify(es._saved || es.target)))
    if (!es._saved) es._saved = JSON.parse(JSON.stringify(target))
    const dist2 = Math.hypot(dx, dy)
    if (dist2 > 5) {
      const ox = target.cx || target.x1 || target.x || 0
      const oy = target.cy || target.y1 || target.y || 0
      const cosA = dx / dist2, sinA = dy / dist2
      engine._moveEntity(target, -ox, -oy)
      if (target.type === 'LINE') {
        const rx = target.x1 * cosA - target.y1 * sinA, ry = target.x1 * sinA + target.y1 * cosA
        const rx2 = target.x2 * cosA - target.y2 * sinA, ry2 = target.x2 * sinA + target.y2 * cosA
        target.x1 = rx + ox + dx * 0.01; target.y1 = ry + oy + dy * 0.01
        target.x2 = rx2 + ox + dx * 0.01; target.y2 = ry2 + oy + dy * 0.01
      }
    }
    engine.render()
    return true
  }

  if (editTool === 'mirror' && engine._editState && engine._editState.mirrorP1) {
    engine._editState.mirrorPreview = { x: worldX, y: worldY }
    engine.render()
    return true
  }
  return false
}

export function handleEditMouseUp(engine, worldX, worldY, editTool) {
  if (editTool === 'rotate' && engine._editState && engine._editState.target) {
    const es = engine._editState
    if (es._saved) {
      const after = JSON.parse(JSON.stringify(es.target))
      Object.assign(es.target, es._saved)
      const moved = JSON.parse(JSON.stringify(es.target))
      Object.assign(es.target, after)
      const cmd = engine._makeMoveCmd(es.target, moved)
      engine._history.execute(cmd)
      engine._logCommand('MOVE_ENTITY', es.target.id, moved, after)
      engine._emit('modified')
    }
    engine._editState = null
    engine.render()
  }
}

export function drawEditPreview(engine, ctx) {
  if (engine._editState && engine._editState.mirrorP1 && engine._editState.mirrorPreview) {
    const p1 = engine._editState.mirrorP1
    const p2 = engine._editState.mirrorPreview
    ctx.save()
    ctx.strokeStyle = '#89b4fa'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    const s1 = engine._worldToScreen(p1.x, p1.y)
    const s2 = engine._worldToScreen(p2.x, p2.y)
    ctx.beginPath(); ctx.moveTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.stroke()
    ctx.restore()
  }
}
