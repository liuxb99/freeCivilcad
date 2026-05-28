import { useRef, useEffect, useState } from 'react'
import { Engine } from '../components/Canvas2D/engine'

export function useCanvas2D(canvasRef, props = {}) {
  const engineRef = useRef(null)
  const containerRef = useRef(null)
  const [engine, setEngine] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = new Engine(canvas)
    // 建構子已自動呼叫 _setupSize / _createOverlays / _bindEvents / render
    engineRef.current = engine
    setEngine(engine)
    if (props.onReady) props.onReady(engine)

    const ro = new ResizeObserver(() => {
      engine.resize()
    })
    if (containerRef.current) ro.observe(containerRef.current)

    const unsubs = []
    if (props.onSelect) unsubs.push(engine.on('select', props.onSelect))
    if (props.onModified) unsubs.push(engine.on('modified', props.onModified))
    if (props.onToolChanged) unsubs.push(engine.on('toolChanged', props.onToolChanged))
    if (props.onEntityAdded) unsubs.push(engine.on('entityAdded', props.onEntityAdded))
    if (props.onEntityRemoved) unsubs.push(engine.on('entityRemoved', props.onEntityRemoved))

    return () => {
      ro.disconnect()
      unsubs.forEach(fn => fn())
      engine.destroy()
      engineRef.current = null
      setEngine(null)
    }
  }, [canvasRef])

  useEffect(() => {
    if (engine && props.tool !== undefined) engine.setTool(props.tool)
  }, [engine, props.tool])

  useEffect(() => {
    if (engine && props.activeLayer !== undefined) engine.setActiveLayer(props.activeLayer)
  }, [engine, props.activeLayer])

  useEffect(() => {
    if (engine && props.showGrid !== undefined) {
      engine._showGrid = props.showGrid
      engine._invalidateSnapshot()
      engine.render()
    }
  }, [engine, props.showGrid])

  return { engine, containerRef }
}
