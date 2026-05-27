import React, { useState, useEffect, useRef } from 'react'

export default function StatusBar({ engine, activeTool, connected }) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [snapState, setSnapState] = useState({ snapToGrid: true, ortho: false })
  const [entityCount, setEntityCount] = useState(0)
  const [zoom, setZoom] = useState(1)
  const timerRef = useRef(null)

  useEffect(() => {
    const tick = () => {
      if (!engine) return
      setEntityCount(engine.getEntities?.().length || 0)
      try { setSnapState(engine.getSnapState()) } catch (e) {}
      try { setZoom(Math.round(engine.getZoom() * 100)) } catch (e) {}
    }
    tick()
    timerRef.current = setInterval(tick, 200)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [engine])

  const handleCanvasMove = (e) => {
    if (!engine || !engine.canvas) return
    const rect = engine.canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = engine._screenToWorld ? engine._screenToWorld(sx, sy) : null
    setPos({
      screen: `(${Math.round(sx)}, ${Math.round(sy)})`,
      world: world ? `(${world.x.toFixed(1)}, ${world.y.toFixed(1)})` : '-',
    })
  }

  return (
    <div style={styles.bar} onMouseMove={handleCanvasMove}>
      <span style={styles.item}>工具: {activeTool}</span>
      <span style={styles.item}>螢幕: {pos.screen || '(0, 0)'}</span>
      <span style={styles.item}>世界: {pos.world || '(0, 0)'}</span>
      <span style={styles.item}>圖元: {entityCount}</span>
      <span style={{ ...styles.item, color: snapState.snapToGrid ? '#a6e3a1' : '#6c7086' }}>捕捉: {snapState.snapToGrid ? 'ON' : 'OFF'}</span>
      <span style={{ ...styles.item, color: snapState.ortho ? '#f9e2af' : '#6c7086' }}>正交: {snapState.ortho ? 'ON' : 'OFF'}</span>
      <span style={styles.item}>縮放: {zoom}%</span>
      <span style={{ ...styles.item, color: connected ? '#a6e3a1' : '#f38ba8', marginLeft: 'auto' }}>
        {connected ? '已連線' : '未連線'}
      </span>
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '3px 12px',
    backgroundColor: '#11111b',
    borderTop: '1px solid #313244',
    fontSize: '11px',
    color: '#6c7086',
    userSelect: 'none',
  },
  item: {
    whiteSpace: 'nowrap',
  },
}
