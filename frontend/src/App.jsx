import React, { useState, useRef, useCallback, useEffect } from 'react'
import Canvas2D from './components/Canvas2D'
import Toolbar from './components/Toolbar'
import LayerPanel from './components/LayerPanel'
import CommandInput from './components/CommandInput'
import PropertyPanel from './components/PropertyPanel'
import FileMenu from './components/FileMenu'
import StatusBar from './components/StatusBar'
import { useWebSocket } from './hooks/useWebSocket'
import { canvasApi } from './services/api'
import { TOOL_KEYS } from './config/keybindings'

export default function App() {
  const canvasRef = useRef(null)
  const [activeTool, setActiveTool] = useState('SELECT')
  const [engine, setEngine] = useState(null)
  const { connected } = useWebSocket()

  const handleEngineReady = useCallback((eng) => {
    setEngine(eng)
  }, [])

  useEffect(() => {
    if (engine) {
      engine.setCommandCallback((cmdType, entityId, before, after) => {
        canvasApi.logCommand({
          type: cmdType,
          entity_id: entityId,
          before_state: before,
          after_state: after,
        }).catch(() => {})
      })
    }
  }, [engine])

  const handleToolChange = useCallback((tool) => {
    setActiveTool(tool)
    if (canvasRef.current?.engine) {
      canvasRef.current.engine.setTool(tool.toLowerCase())
    }
  }, [])

  const handleAction = useCallback((action) => {
    if (!canvasRef.current?.engine) return
    const eng = canvasRef.current.engine
    switch (action) {
      case 'UNDO': eng.undo(); eng.render(); break
      case 'REDO': eng.redo(); eng.render(); break
      case 'DELETE': eng.deleteSelected(); eng.render(); break
      case 'FIT': eng.fitToScreen(); eng.render(); break
    }
  }, [])

  const handleKeyDown = useCallback((e) => {
    if (!canvasRef.current?.engine) return
    const eng = canvasRef.current.engine

    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'z': e.preventDefault(); eng.undo(); eng.render(); return
        case 'y': e.preventDefault(); eng.redo(); eng.render(); return
        case 's': e.preventDefault(); return
        case 'o': e.preventDefault(); return
        case 'e': e.preventDefault(); return
        case 'n': e.preventDefault(); return
      }
    }

    if (!(e.ctrlKey || e.metaKey)) {
      const tool = TOOL_KEYS[e.key.toLowerCase()]
      if (tool) { handleToolChange(tool); return }
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      eng.deleteSelected(); eng.render()
    }
  }, [handleToolChange])

  return (
    <div style={styles.app} tabIndex={0} onKeyDown={handleKeyDown}>
      <Toolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onAction={handleAction}
        engine={engine}
      />

      <div style={styles.main}>
        <div style={styles.fileMenuBar}>
          <FileMenu engine={engine} />
        </div>

        <div style={styles.canvasArea}>
          <Canvas2D
            ref={canvasRef}
            tool={activeTool}
            onReady={handleEngineReady}
          />
        </div>

        <div style={styles.rightPanel}>
          <LayerPanel engine={engine} />
          <PropertyPanel engine={engine} />
        </div>
      </div>

      <CommandInput engine={engine} />

      <StatusBar engine={engine} activeTool={activeTool} connected={connected} />
    </div>
  )
}

const styles = {
  app: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1e1e2e',
    color: '#cdd6f4',
    outline: 'none',
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
  },
  fileMenuBar: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    zIndex: 100,
  },
  canvasArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    cursor: 'crosshair',
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    width: '220px',
    borderLeft: '1px solid #313244',
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '3px 12px',
    backgroundColor: '#11111b',
    borderTop: '1px solid #313244',
    fontSize: '11px',
    color: '#6c7086',
    userSelect: 'none',
  },
}
