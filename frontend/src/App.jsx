import React, { useState, useRef, useCallback, useEffect } from 'react'
import Canvas2D from './components/Canvas2D'
import Toolbar from './components/Toolbar'
import LayerPanel from './components/LayerPanel'
import CommandInput from './components/CommandInput'
import PropertyPanel from './components/PropertyPanel'
import FileMenu from './components/FileMenu'
import StatusBar from './components/StatusBar'
import WelcomePage from './components/WelcomePage'
import { useWebSocket } from './hooks/useWebSocket'
import { canvasApi } from './services/api'

export default function App() {
  const canvasRef = useRef(null)
  const [activeTool, setActiveTool] = useState('SELECT')
  const [engine, setEngine] = useState(null)
  const [showWelcome, setShowWelcome] = useState(true)
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
    setActiveTool(tool.toUpperCase())
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
    // 僅處理瀏覽器默認行為攔截（不與 engine 重疊）
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 's': e.preventDefault(); return
        case 'o': e.preventDefault(); return
        case 'e': e.preventDefault(); return
        case 'n': e.preventDefault(); return
      }
    }
    // 其餘快捷鍵（工具切換、Undo/Redo、Delete 等）統一由 engine-input.js 處理
  }, [])

  const handleGoHome = useCallback(() => {
    setShowWelcome(true)
  }, [])

  // 顯示歡迎頁
  if (showWelcome) {
    return <WelcomePage onStart={() => setShowWelcome(false)} />
  }

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
          <FileMenu engine={engine} onGoHome={handleGoHome} />
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
