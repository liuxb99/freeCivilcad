// engine-commands.js — 命令執行相關（DXF 匯出、undo/redo 委派等）
import { Engine } from './engine-core.js'
import { canvasApi } from '../../services/api.js'

Engine.prototype.undo = function () {
  const result = this._history.undo()
  if (result) { this._invalidateSnapshot(); this._emit('modified'); this.render(); this._tryBackendUndo() }
  return result
}

Engine.prototype.redo = function () {
  const result = this._history.redo()
  if (result) { this._invalidateSnapshot(); this._emit('modified'); this.render(); this._tryBackendRedo() }
  return result
}

Engine.prototype.canUndo = function () { return this._history.canUndo() }

Engine.prototype.canRedo = function () { return this._history.canRedo() }

Engine.prototype.setCommandCallback = function (fn) { this._onCommand = fn }

Engine.prototype._tryBackendUndo = async function () {
  try { await canvasApi.undoCommand() } catch (e) { /* offline-safe */ }
}

Engine.prototype._tryBackendRedo = async function () {
  try { await canvasApi.redoCommand() } catch (e) { /* offline-safe */ }
}

// ==================== DXF 匯出 ====================

Engine.prototype.exportDXF = function () {
  let s = '0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n'
  for (const e of this._entities) {
    if (e.type === 'LINE') {
      s += '0\nLINE\n8\n' + e.layer + '\n10\n' + e.x1 + '\n20\n' + e.y1 + '\n11\n' + e.x2 + '\n21\n' + e.y2 + '\n'
    } else if (e.type === 'CIRCLE') {
      s += '0\nCIRCLE\n8\n' + e.layer + '\n10\n' + e.cx + '\n20\n' + e.cy + '\n40\n' + e.radius + '\n'
    } else if (e.type === 'ARC') {
      s += '0\nARC\n8\n' + e.layer + '\n10\n' + e.cx + '\n20\n' + e.cy + '\n40\n' + e.radius + '\n50\n' + (e.startAngle * 180 / Math.PI) + '\n51\n' + (e.endAngle * 180 / Math.PI) + '\n'
    } else if (e.type === 'POLYGON') {
      s += '0\nLWPOLYLINE\n8\n' + e.layer + '\n90\n' + e.vertices.length + '\n70\n1\n'
      for (const v of e.vertices) { s += '10\n' + v.x + '\n20\n' + v.y + '\n' }
    } else if (e.type === 'POLYLINE') {
      const flag = e.isClosed ? 1 : 0
      s += '0\nLWPOLYLINE\n8\n' + e.layer + '\n90\n' + e.vertices.length + '\n70\n' + flag + '\n'
      for (const v of e.vertices) { s += '10\n' + v.x + '\n20\n' + v.y + '\n' }
    } else if (e.type === 'TEXT') {
      s += '0\nTEXT\n8\n' + e.layer + '\n10\n' + e.x + '\n20\n' + e.y + '\n40\n1\n1\n' + e.text + '\n'
    } else if (e.type === 'DIMENSION') {
      if (e.dimType === 'linear') {
        s += '0\nLINE\n8\n' + e.layer + '\n10\n' + e.x1 + '\n20\n' + e.y1 + '\n11\n' + e.x2 + '\n21\n' + e.y2 + '\n'
        const dx = e.x2 - e.x1, dy = e.y2 - e.y1
        const len = Math.hypot(dx, dy)
        if (len > 0) {
          const nx = -dy / len, ny = dx / len
          const ox = nx * (e.offset || 15), oy = ny * (e.offset || 15)
          s += '0\nLINE\n8\n' + e.layer + '\n10\n' + (e.x1 + ox) + '\n20\n' + (e.y1 + oy) + '\n11\n' + (e.x2 + ox) + '\n21\n' + (e.y2 + oy) + '\n'
        }
      } else if (e.dimType === 'radius') {
        const a = e.leaderAngle || -Math.PI / 4
        const tx = e.cx + (e.radius + 15) * Math.cos(a)
        const ty = e.cy + (e.radius + 15) * Math.sin(a)
        s += '0\nLINE\n8\n' + e.layer + '\n10\n' + e.cx + '\n20\n' + e.cy + '\n11\n' + tx + '\n21\n' + ty + '\n'
      } else if (e.dimType === 'angle') {
        const r = e.arcRadius || 20
        const steps = 12
        for (let i = 0; i < steps; i++) {
          const t0 = e.angleStart + (e.angleEnd - e.angleStart) * i / steps
          const t1 = e.angleStart + (e.angleEnd - e.angleStart) * (i + 1) / steps
          s += '0\nLINE\n8\n' + e.layer + '\n10\n' + (e.vertexX + r * Math.cos(t0)) + '\n20\n' + (e.vertexY + r * Math.sin(t0)) + '\n11\n' + (e.vertexX + r * Math.cos(t1)) + '\n21\n' + (e.vertexY + r * Math.sin(t1)) + '\n'
        }
      }
    }
  }
  s += '0\nENDSEC\n0\nEOF'
  return s
}
