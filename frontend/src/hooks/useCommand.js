import { useCallback, useRef } from 'react'
import { llmApi } from '../services/api'
import wsClient from '../services/ws'

function normalizeCommands(commands) {
  return commands.map(cmd => {
    if (cmd.params) {
      return { type: cmd.type, ...cmd.params }
    }
    return cmd
  })
}

export function useCommand(engine) {
  const historyRef = useRef([])
  const historyIndexRef = useRef(-1)

  const executeCadCommands = useCallback((commands) => {
    if (!engine) return { success: false, error: 'Engine not ready' }

    const results = []
    for (const cmd of commands) {
      try {
        switch (cmd.type) {
          case 'LINE':
            engine.addEntity({ type: 'LINE', x1: cmd.x1, y1: cmd.y1, x2: cmd.x2, y2: cmd.y2, color: cmd.color || '#cdd6f4', lineWidth: 2 })
            results.push({ success: true, type: 'LINE' })
            break
          case 'CIRCLE':
            engine.addEntity({ type: 'CIRCLE', cx: cmd.cx, cy: cmd.cy, r: cmd.r, color: cmd.color || '#cdd6f4', lineWidth: 2 })
            results.push({ success: true, type: 'CIRCLE' })
            break
          case 'ARC':
            engine.addEntity({ type: 'ARC', cx: cmd.cx, cy: cmd.cy, r: cmd.r, startAngle: cmd.startAngle || 0, endAngle: cmd.endAngle || Math.PI * 1.5, color: cmd.color || '#cdd6f4', lineWidth: 2 })
            results.push({ success: true, type: 'ARC' })
            break
          case 'RECTANGLE':
            engine.addEntity({ type: 'POLYGON', vertices: [
              { x: cmd.x1, y: cmd.y1 },
              { x: cmd.x2, y: cmd.y1 },
              { x: cmd.x2, y: cmd.y2 },
              { x: cmd.x1, y: cmd.y2 },
            ], color: cmd.color || '#cdd6f4', lineWidth: 2 })
            results.push({ success: true, type: 'RECTANGLE' })
            break
          case 'POLYGON':
            engine.addEntity({ type: 'POLYGON', vertices: cmd.vertices || [], color: cmd.color || '#cdd6f4', lineWidth: 2 })
            results.push({ success: true, type: 'POLYGON' })
            break
          case 'DELETE':
            if (cmd.id !== undefined) {
              engine.removeEntity(cmd.id)
              results.push({ success: true, type: 'DELETE' })
            } else {
              const selected = engine.getSelected()
              if (selected) {
                engine.deleteSelected()
                results.push({ success: true, type: 'DELETE' })
              } else {
                results.push({ success: false, error: 'No entity to delete' })
              }
            }
            break
          case 'MOVE':
            if (cmd.id !== undefined) {
              const entity = engine.getEntities().find(e => e.id === cmd.id)
              if (entity) {
                engine.selectById(cmd.id)
              }
            }
            engine.moveSelected(cmd.dx || 0, cmd.dy || 0)
            results.push({ success: true, type: 'MOVE' })
            break
          case 'SELECT':
            if (cmd.id !== undefined) {
              const found = engine.selectById(cmd.id)
              results.push({ success: !!found, type: 'SELECT', data: found })
            } else {
              const found = engine.selectEntity(cmd.x, cmd.y)
              results.push({ success: !!found, type: 'SELECT', data: found })
            }
            break
          case 'CLEAR':
            engine.clear()
            results.push({ success: true, type: 'CLEAR' })
            break
          default:
            results.push({ success: false, error: `Unknown command type: ${cmd.type}` })
        }
      } catch (e) {
        results.push({ success: false, error: e.message })
      }
    }
    engine.render()
    return { success: true, data: results }
  }, [engine])

  const parseAndExecute = useCallback(async (text) => {
    try {
      const result = await llmApi.parse(text)
      if (result && result.commands) {
        const flat = normalizeCommands(result.commands)
        return executeCadCommands(flat)
      }
    } catch (e) {
    }

    wsClient.sendLLMCommand(text)
    return { success: true, via: 'websocket', pending: true }
  }, [executeCadCommands])

  const pushHistory = useCallback((text, result) => {
    historyRef.current.push({ text, result, time: Date.now() })
    if (historyRef.current.length > 50) historyRef.current.shift()
    historyIndexRef.current = historyRef.current.length
  }, [])

  const getHistory = useCallback(() => historyRef.current, [])

  return {
    executeCadCommands,
    parseAndExecute,
    pushHistory,
    getHistory,
  }
}
