function getLineAngle(line) {
  const g = line.geometry || line
  return Math.atan2(g.y2 - g.y1, g.x2 - g.x1)
}

function lineIntersection(a1, a2, b1, b2) {
  const dax = a2.x - a1.x, day = a2.y - a1.y
  const dbx = b2.x - b1.x, dby = b2.y - b1.y
  const denom = dax * dby - day * dbx
  if (Math.abs(denom) < 1e-10) return null
  const t = ((b1.x - a1.x) * dby - (b1.y - a1.y) * dbx) / denom
  return { x: a1.x + t * dax, y: a1.y + t * day }
}

function handleDimMouseDown(engine, x, y) {
  if (!engine._dimState) {
    const hit = engine._hitTest(x, y)
    if (hit && hit.type === 'CIRCLE') {
      const g = hit.geometry || hit
      engine._dimState = { type: 'radius', entity: hit, phase: 'leader', cx: g.cx, cy: g.cy, radius: g.radius || g.r }
    } else if (hit && hit.type === 'LINE') {
      engine._dimLine1 = hit
      engine._dimState = { type: 'angle', line1: hit, phase: 'line2' }
    } else {
      engine._dimState = { type: 'linear', phase: 'p1', x1: x, y1: y }
    }
  } else if (engine._dimState.phase === 'p1') {
    engine._dimState.phase = 'offset'
    engine._dimState.x2 = x
    engine._dimState.y2 = y
  } else if (engine._dimState.phase === 'offset') {
    commitDimension(engine)
  } else if (engine._dimState.phase === 'line2') {
    const hit = engine._hitTest(x, y)
    if (hit && hit.type === 'LINE') {
      engine._dimState.line2 = hit
      engine._dimState.phase = 'arc_offset'
      const g1 = engine._dimState.line1.geometry || engine._dimState.line1
      const g2 = hit.geometry || hit
      const intersection = lineIntersection(
        { x: g1.x1, y: g1.y1 }, { x: g1.x2, y: g1.y2 },
        { x: g2.x1, y: g2.y1 }, { x: g2.x2, y: g2.y2 }
      )
      if (intersection) {
        engine._dimState.vertexX = intersection.x
        engine._dimState.vertexY = intersection.y
      } else {
        engine._dimState.vertexX = g1.x1
        engine._dimState.vertexY = g1.y1
      }
      engine._dimState.arcRadius = 20
    }
  } else if (engine._dimState.phase === 'arc_offset') {
    commitDimension(engine)
  } else if (engine._dimState.phase === 'leader') {
    commitDimension(engine)
  }
  engine.render()
}

function commitDimension(engine) {
  const ds = engine._dimState
  if (!ds) return

  let entity
  if (ds.type === 'linear') {
    const { x1, y1, x2, y2 } = ds
    const offset = Math.max(10, Math.min(100, ds.offset || 15))
    entity = {
      id: engine._nextId(),
      type: 'DIMENSION',
      dimType: 'linear',
      x1, y1, x2, y2,
      offset,
      color: engine._getActiveColor(),
      lineWidth: 1.5,
      layer: engine.activeLayer || '0',
    }
  } else if (ds.type === 'radius') {
    const angle = ds.leaderAngle || -Math.PI / 4
    entity = {
      id: engine._nextId(),
      type: 'DIMENSION',
      dimType: 'radius',
      cx: ds.cx, cy: ds.cy,
      radius: ds.radius,
      leaderAngle: angle,
      color: engine._getActiveColor(),
      lineWidth: 1.5,
      layer: engine.activeLayer || '0',
    }
  } else if (ds.type === 'angle') {
    const l1 = getLineAngle(ds.line1)
    const l2 = getLineAngle(ds.line2)
    entity = {
      id: engine._nextId(),
      type: 'DIMENSION',
      dimType: 'angle',
      vertexX: ds.vertexX,
      vertexY: ds.vertexY,
      angleStart: Math.min(l1, l2),
      angleEnd: Math.max(l1, l2),
      arcRadius: ds.arcRadius || 20,
      color: engine._getActiveColor(),
      lineWidth: 1.5,
      layer: engine.activeLayer || '0',
    }
  }

  if (entity) {
    const cmd = engine._makeAddCmd(entity)
    engine._history.execute(cmd)
    engine._logCommand('ADD_ENTITY', entity.id, null, { ...entity })
    engine._emit('entityAdded', entity)
    engine._emit('modified')
  }

  engine._dimState = null
  engine._dimPreview = null
  engine._dimLine1 = null
  engine.render()
}

function drawPreviewDimension(engine, ctx) {
  const preview = engine._dimPreview
  if (!preview) return

  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.setLineDash([5, 5])
  ctx.lineWidth = 1

  if (preview.type === 'linear') {
    const { x1, y1, x2, y2 } = preview
    const offset = preview.offset !== undefined ? preview.offset : 15
    const s1 = engine._worldToScreen(x1, y1)
    const s2 = engine._worldToScreen(x2, y2)
    const dx = s2.x - s1.x, dy = s2.y - s1.y
    const len = Math.hypot(dx, dy)
    if (len > 0) {
      const nx = -dy / len, ny = dx / len
      const ox = nx * offset, oy = ny * offset
      ctx.strokeStyle = '#a6e3a1'
      ctx.beginPath()
      ctx.moveTo(s1.x + ox, s1.y + oy)
      ctx.lineTo(s2.x + ox, s2.y + oy)
      ctx.stroke()
    }
  } else if (preview.type === 'radius') {
    const { cx, cy, radius } = preview
    const leaderAngle = preview.leaderAngle !== undefined ? preview.leaderAngle : -Math.PI / 4
    const s = engine._worldToScreen(cx, cy)
    const r = radius * engine._zoom * engine._gridSize
    const ext = 15 * engine._zoom
    const ex = s.x + r * Math.cos(leaderAngle)
    const ey = s.y + r * Math.sin(leaderAngle)
    const tx = s.x + (r + ext) * Math.cos(leaderAngle)
    const ty = s.y + (r + ext) * Math.sin(leaderAngle)
    ctx.strokeStyle = '#a6e3a1'
    ctx.beginPath()
    ctx.moveTo(ex, ey)
    ctx.lineTo(tx, ty)
    ctx.stroke()
  } else if (preview.type === 'angle') {
    let vx, vy
    if (preview.vertexX !== undefined) {
      vx = preview.vertexX; vy = preview.vertexY
    } else {
      const g = preview.line1.geometry || preview.line1
      vx = g.x1; vy = g.y1
    }
    const s = engine._worldToScreen(vx, vy)
    const r = (preview.arcRadius || 20) * engine._zoom * engine._gridSize
    const l1 = getLineAngle(preview.line1)
    const l2 = getLineAngle(preview.line2)
    ctx.strokeStyle = '#a6e3a1'
    ctx.beginPath()
    ctx.arc(s.x, s.y, r, Math.min(l1, l2), Math.max(l1, l2))
    ctx.stroke()
  }

  ctx.restore()
}

function onMouseMove(engine, world) {
  if (engine._dimState) {
    if (engine._dimState.phase === 'offset') {
      const dx = engine._dimState.x2 - engine._dimState.x1
      const dy = engine._dimState.y2 - engine._dimState.y1
      const len = Math.hypot(dx, dy)
      if (len > 0) {
        const nx = -dy / len, ny = dx / len
        const offset = ((world.x - engine._dimState.x1) * nx + (world.y - engine._dimState.y1) * ny)
        engine._dimPreview = { ...engine._dimState, offset: Math.round(offset) }
      }
    } else if (engine._dimState.phase === 'leader') {
      const cx = engine._dimState.cx, cy = engine._dimState.cy
      const angle = Math.atan2(world.y - cy, world.x - cx)
      engine._dimPreview = { ...engine._dimState, leaderAngle: angle }
    } else if (engine._dimState.phase === 'arc_offset') {
      let vx, vy
      if (engine._dimState.vertexX !== undefined) {
        vx = engine._dimState.vertexX; vy = engine._dimState.vertexY
      } else {
        const g = engine._dimState.line1.geometry || engine._dimState.line1
        vx = g.x1; vy = g.y1
      }
      const arcRadius = Math.hypot(world.x - vx, world.y - vy)
      engine._dimPreview = { ...engine._dimState, arcRadius }
    }
    engine.render()
    return true
  }
  return false
}

export { handleDimMouseDown, commitDimension, drawPreviewDimension, onMouseMove, getLineAngle, lineIntersection }
