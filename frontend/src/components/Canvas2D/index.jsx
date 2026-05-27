import { useRef, forwardRef, useImperativeHandle } from 'react'
import { useCanvas2D } from '../../hooks/useCanvas2D'

const Canvas2D = forwardRef((props, ref) => {
  const canvasRef = useRef(null)
  const { engine, containerRef } = useCanvas2D(canvasRef, props)

  useImperativeHandle(ref, () => ({
    engine,
    getEngine: () => engine
  }))

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: engine?.getCursor?.() || 'crosshair'
        }}
      />
    </div>
  )
})

Canvas2D.displayName = 'Canvas2D'
export default Canvas2D
