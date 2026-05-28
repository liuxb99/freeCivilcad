/**
 * EditTools 完整測試套件
 * ============================================
 * 包含既有存在性檢查（15 項）＋ 六個編輯工具的實際操作測試（12 項以上）
 * 合計 ≥ 27 項測試
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  isEditCommand,
  getEditToolCursor,
  handleEditMouseDown,
  handleEditMouseMove,
  handleEditMouseUp,
  drawEditPreview
} from '../src/components/Canvas2D/EditTools.js'
import { COPY_DX, COPY_DY, OFFSET_DISTANCE } from '../src/config/constants.js'

// ====================================================================
// 輔助函數：建立模擬 Engine 物件
// ====================================================================
function createMockEngine(initialEntities = []) {
  const entities = initialEntities.map((e, i) => ({
    id: String(i + 1),
    layer: '0',
    color: '#cdd6f4',
    lineWidth: 2,
    ...e
  }))

  let nextId = entities.length + 1
  const events = { entityAdded: [], entityRemoved: [], modified: [], select: [] }

  const historyCmds = []

  const engine = {
    // ---- 狀態 ----
    _entities: entities,
    _isDrawing: false,
    _drawingEntity: null,
    _drawingPhase: 0,
    _editState: null,
    _history: {
      stack: [],
      ptr: -1,
      execute(cmd) {
        cmd.execute()
        this.stack.length = this.ptr + 1
        this.stack.push(cmd)
        this.ptr = this.stack.length - 1
      },
      undo() {
        if (this.ptr >= 0) { this.stack[this.ptr].undo(); this.ptr--; return true }
        return false
      },
      redo() {
        if (this.ptr < this.stack.length - 1) { this.ptr++; this.stack[this.ptr].execute(); return true }
        return false
      },
    },
    _handlers: {},

    // ---- 輔助方法 ----
    _nextId() {
      return String(nextId++)
    },

    _makeEntity(type, props) {
      const e = {
        id: this._nextId(),
        type,
        layer: '0',
        color: '#cdd6f4',
        lineWidth: 2,
        ...JSON.parse(JSON.stringify(props))
      }
      return e
    },

    _makeAddCmd(entity) {
      const self = this
      return {
        execute() { self._entities.push(entity) },
        undo() {
          const i = self._entities.indexOf(entity)
          if (i >= 0) self._entities.splice(i, 1)
        }
      }
    },

    _makeRemoveCmd(entity) {
      const self = this
      let idx = -1
      return {
        execute() {
          idx = self._entities.indexOf(entity)
          if (idx >= 0) self._entities.splice(idx, 1)
        },
        undo() {
          if (idx >= 0) self._entities.splice(idx, 0, entity)
        }
      }
    },

    _makeMoveCmd(entity, before) {
      const self = this
      const b = JSON.parse(JSON.stringify(before))
      return {
        execute() {},
        undo() { Object.assign(entity, JSON.parse(JSON.stringify(b))); self._emit('select', entity) }
      }
    },

    _invalidateSnapshot() {},

    _moveEntity(e, dx, dy) {
      if (e.type === 'LINE') {
        e.x1 += dx; e.y1 += dy; e.x2 += dx; e.y2 += dy
      } else if (e.type === 'CIRCLE' || e.type === 'ARC') {
        e.cx += dx; e.cy += dy
      } else if (e.type === 'POLYGON') {
        for (const v of e.vertices) { v.x += dx; v.y += dy }
      } else if (e.type === 'TEXT') {
        e.x += dx; e.y += dy
      }
    },

    _logCommand() {},

    _emit(event, ...args) {
      if (events[event]) {
        // 無參數事件（如 modified）推入 true 表示觸發過
        events[event].push(args.length === 0 ? true : args.length === 1 ? args[0] : args)
      }
    },

    render() {
      this._renderCount = (this._renderCount || 0) + 1
    },

    _hitTest(wx, wy) {
      const th = 8
      for (let i = this._entities.length - 1; i >= 0; i--) {
        const e = this._entities[i]
        if (e.type === 'LINE') {
          const dx = e.x2 - e.x1
          const dy = e.y2 - e.y1
          const ls = dx * dx + dy * dy
          if (ls === 0) {
            if (Math.hypot(wx - e.x1, wy - e.y1) < th) return e
          } else {
            let t = ((wx - e.x1) * dx + (wy - e.y1) * dy) / ls
            t = Math.max(0, Math.min(1, t))
            if (Math.hypot(wx - (e.x1 + t * dx), wy - (e.y1 + t * dy)) < th) return e
          }
        } else if (e.type === 'CIRCLE') {
          const d = Math.hypot(wx - e.cx, wy - e.cy)
          if (Math.abs(d - e.radius) < th) return e
        } else if (e.type === 'POLYGON') {
          const verts = e.vertices
          for (let j = 0; j < verts.length; j++) {
            const k = (j + 1) % verts.length
            const dx = verts[k].x - verts[j].x
            const dy = verts[k].y - verts[j].y
            const ls = dx * dx + dy * dy
            if (ls === 0) {
              if (Math.hypot(wx - verts[j].x, wy - verts[j].y) < th) return e
            } else {
              let t = ((wx - verts[j].x) * dx + (wy - verts[j].y) * dy) / ls
              t = Math.max(0, Math.min(1, t))
              if (Math.hypot(wx - (verts[j].x + t * dx), wy - (verts[j].y + t * dy)) < th) return e
            }
          }
        } else if (e.type === 'TEXT') {
          if (Math.hypot(wx - e.x, wy - e.y) < th * 3) return e
        }
      }
      return null
    },

    // 公開事件記錄供測試驗證
    _events: events
  }

  return engine
}

// ====================================================================
// 既有存在性檢查（維持 15 項）
// ====================================================================
describe('EditTools', () => {
  describe('isEditCommand', () => {
    it('should return true for copy', () => expect(isEditCommand('copy')).toBe(true))
    it('should return true for rotate', () => expect(isEditCommand('rotate')).toBe(true))
    it('should return true for mirror', () => expect(isEditCommand('mirror')).toBe(true))
    it('should return true for offset', () => expect(isEditCommand('offset')).toBe(true))
    it('should return true for trim', () => expect(isEditCommand('trim')).toBe(true))
    it('should return true for rect', () => expect(isEditCommand('rect')).toBe(true))
    it('should return false for select', () => expect(isEditCommand('select')).toBe(false))
    it('should return false for unknown', () => expect(isEditCommand('line')).toBe(false))
  })

  describe('getEditToolCursor', () => {
    it('should return copy cursor for copy', () => expect(getEditToolCursor('copy')).toBe('copy'))
    it('should return default cursor for unknown', () => expect(getEditToolCursor('select')).toBe('default'))
  })

  describe('handleEditMouseDown', () => {
    it('should be an exported function', () => {
      expect(typeof handleEditMouseDown).toBe('function')
    })
  })

  describe('handleEditMouseMove', () => {
    it('should be an exported function', () => {
      expect(typeof handleEditMouseMove).toBe('function')
    })
  })

  describe('handleEditMouseUp', () => {
    it('should be an exported function', () => {
      expect(typeof handleEditMouseUp).toBe('function')
    })
  })

  describe('drawEditPreview', () => {
    it('should be an exported function', () => {
      expect(typeof drawEditPreview).toBe('function')
    })
  })

  describe('isEditCommand integration', () => {
    it('should handle all edit tools in one group', () => {
      const editTools = ['copy', 'rotate', 'mirror', 'offset', 'trim', 'rect', 'move']
      for (const t of editTools) {
        expect(isEditCommand(t)).toBe(true)
      }
    })
  })
})

// ====================================================================
// 實際操作測試：RECT
// ====================================================================
describe('EditTools — RECT (矩形繪製)', () => {
  it('第一次點擊：進入繪製狀態，建立 _drawingEntity', () => {
    const engine = createMockEngine()
    const p1 = { x: 10, y: 20 }

    handleEditMouseDown(engine, p1.x, p1.y, 'rect')

    expect(engine._isDrawing).toBe(true)
    expect(engine._drawingEntity).not.toBeNull()
    expect(engine._drawingEntity.type).toBe('POLYGON')
    expect(engine._drawingEntity.vertices).toHaveLength(4)
    // 四個頂點皆在 p1
    for (const v of engine._drawingEntity.vertices) {
      expect(v.x).toBe(p1.x)
      expect(v.y).toBe(p1.y)
    }
    expect(engine._drawingPhase).toBe(1)
    expect(engine._renderCount).toBe(1)
  })

  it('第二次點擊在不同位置：產生 POLYGON 並加入 entities', () => {
    const engine = createMockEngine()
    const p1 = { x: 10, y: 20 }
    const p2 = { x: 50, y: 80 }

    // 第一次點擊
    handleEditMouseDown(engine, p1.x, p1.y, 'rect')
    expect(engine._entities).toHaveLength(0) // 尚未加入

    // 第二次點擊
    handleEditMouseDown(engine, p2.x, p2.y, 'rect')

    // _isDrawing 重置
    expect(engine._isDrawing).toBe(false)
    expect(engine._drawingEntity).toBeNull()

    // entities 新增了一個 POLYGON（4 頂點）
    expect(engine._entities).toHaveLength(1)
    const poly = engine._entities[0]
    expect(poly.type).toBe('POLYGON')
    expect(poly.vertices).toHaveLength(4)
    // 預期頂點：p1, (p2.x, p1.y), p2, (p1.x, p2.y)
    expect(poly.vertices[0]).toEqual({ x: p1.x, y: p1.y })
    expect(poly.vertices[1]).toEqual({ x: p2.x, y: p1.y })
    expect(poly.vertices[2]).toEqual({ x: p2.x, y: p2.y })
    expect(poly.vertices[3]).toEqual({ x: p1.x, y: p2.y })

    // 事件發出
    expect(engine._events.entityAdded).toHaveLength(1)
    expect(engine._events.modified).toHaveLength(1)
  })

  it('第二次點擊在相同位置：不新增 entity', () => {
    const engine = createMockEngine()
    const p = { x: 10, y: 20 }

    handleEditMouseDown(engine, p.x, p.y, 'rect')
    handleEditMouseDown(engine, p.x, p.y, 'rect')

    // 距離 < 0.1 → 不新增
    expect(engine._entities).toHaveLength(0)
    expect(engine._isDrawing).toBe(false)
    expect(engine._drawingEntity).toBeNull()
  })
})

// ====================================================================
// 實際操作測試：COPY
// ====================================================================
describe('EditTools — COPY (複製)', () => {
  it('點擊 LINE：新增一條偏移後的 LINE', () => {
    const engine = createMockEngine([
      { type: 'LINE', x1: 0, y1: 0, x2: 100, y2: 0 }
    ])

    // 點擊在線段中點附近
    handleEditMouseDown(engine, 50, 0, 'copy')

    expect(engine._entities).toHaveLength(2)
    const original = engine._entities[0]
    const copy = engine._entities[1]

    expect(copy.type).toBe('LINE')
    expect(copy.id).not.toBe(original.id)
    // COPY_DX = 10, COPY_DY = 10 (from constants)
    expect(copy.x1).toBe(original.x1 + COPY_DX)
    expect(copy.y1).toBe(original.y1 + COPY_DY)
    expect(copy.x2).toBe(original.x2 + COPY_DX)
    expect(copy.y2).toBe(original.y2 + COPY_DY)

    // 事件驗證
    expect(engine._events.entityAdded).toHaveLength(1)
    expect(engine._events.modified).toHaveLength(1)
  })

  it('點擊空白區域：不新增任何 entity', () => {
    const engine = createMockEngine([
      { type: 'LINE', x1: 0, y1: 0, x2: 100, y2: 0 }
    ])

    handleEditMouseDown(engine, 999, 999, 'copy')

    expect(engine._entities).toHaveLength(1)
    expect(engine._events.entityAdded).toHaveLength(0)
  })

  it('點擊 CIRCLE：新增偏移後的圓', () => {
    const engine = createMockEngine([
      { type: 'CIRCLE', cx: 50, cy: 50, radius: 30 }
    ])

    // 點在圓周上（右側邊緣）以命中
    handleEditMouseDown(engine, 80, 50, 'copy')

    expect(engine._entities).toHaveLength(2)
    const original = engine._entities[0]
    const copy = engine._entities[1]

    expect(copy.type).toBe('CIRCLE')
    expect(copy.cx).toBe(original.cx + COPY_DX)
    expect(copy.cy).toBe(original.cy + COPY_DY)
    expect(copy.radius).toBe(original.radius)
  })
})

// ====================================================================
// 實際操作測試：ROTATE
// ====================================================================
describe('EditTools — ROTATE (旋轉)', () => {
  it('點擊圖元：設定 _editState 含 target、base 和 startAngle', () => {
    const engine = createMockEngine([
      { type: 'LINE', x1: 0, y1: 0, x2: 100, y2: 0 }
    ])

    handleEditMouseDown(engine, 50, 0, 'rotate')

    expect(engine._editState).not.toBeNull()
    expect(engine._editState.target).toBe(engine._entities[0])
    expect(engine._editState.baseX).toBe(50)
    expect(engine._editState.baseY).toBe(0)
    // startAngle = atan2(0 - 0, 50 - 0) = 0
    expect(engine._editState.startAngle).toBeCloseTo(0)
    // previewAngle 初始化為 0
    expect(engine._editState.previewAngle).toBe(0)
  })

  it('拖曳滑鼠：previewAngle 隨游標更新，圖元座標變化', () => {
    const engine = createMockEngine([
      { type: 'LINE', x1: 0, y1: 0, x2: 100, y2: 0 }
    ])
    const line = engine._entities[0]

    // 點擊圖元 (base 在 (50, 0))
    handleEditMouseDown(engine, 50, 0, 'rotate')

    // 拖曳到 (50, 50) — 正上方，角度 = PI/2
    handleEditMouseMove(engine, 50, 50, 'rotate')

    expect(engine._editState.previewAngle).toBeCloseTo(Math.PI / 2, 5)
    // 圖元座標已旋轉（旋轉中心在原點 (0,0)，故 y1 從 0 變為 0.5）
    expect(line.y1).not.toBe(0)
  })

  it('放開滑鼠：_editState 清空，rendered', () => {
    const engine = createMockEngine([
      { type: 'LINE', x1: 0, y1: 0, x2: 100, y2: 0 }
    ])

    handleEditMouseDown(engine, 50, 0, 'rotate')
    handleEditMouseMove(engine, 50, 50, 'rotate')
    const renderBefore = engine._renderCount

    handleEditMouseUp(engine, 50, 50, 'rotate')

    expect(engine._editState).toBeNull()
    expect(engine._renderCount).toBeGreaterThan(renderBefore)
  })
})

// ====================================================================
// 實際操作測試：MIRROR
// ====================================================================
describe('EditTools — MIRROR (鏡射)', () => {
  it('第一次點擊圖元：設定 mirrorTarget 和 mirrorP1', () => {
    const engine = createMockEngine([
      { type: 'LINE', x1: 5, y1: 10, x2: 15, y2: 10 }
    ])

    // 點擊在線段上
    handleEditMouseDown(engine, 10, 10, 'mirror')

    expect(engine._editState).not.toBeNull()
    expect(engine._editState.mirrorTarget).toBe(engine._entities[0])
    expect(engine._editState.mirrorP1).toEqual({ x: 10, y: 10 })
  })

  it('第二次點擊空白區域：產生鏡射複本', () => {
    const engine = createMockEngine([
      { type: 'LINE', x1: 5, y1: 10, x2: 15, y2: 10 }
    ])
    const original = engine._entities[0]

    // 第一次點擊：選取圖元（p1 在 (10, 10)）
    handleEditMouseDown(engine, 10, 10, 'mirror')
    // 第二次點擊在 (0,0)：距離線段夠遠，故不命中 → 觸發鏡射
    handleEditMouseDown(engine, 0, 0, 'mirror')

    expect(engine._entities).toHaveLength(2)
    const mirror = engine._entities[1]

    expect(mirror.type).toBe('LINE')
    expect(mirror.id).not.toBe(original.id)

    // _editState 清空
    expect(engine._editState).toBeNull()
  })

  it('第二次點擊在空白且無 mirrorState：不動作', () => {
    const engine = createMockEngine([
      { type: 'LINE', x1: 0, y1: 0, x2: 10, y2: 0 }
    ])

    // 直接點擊空白 (沒有第一次選取)
    handleEditMouseDown(engine, 999, 999, 'mirror')

    expect(engine._entities).toHaveLength(1)
    expect(engine._editState).toBeNull()
  })
})

// ====================================================================
// 實際操作測試：MOVE (移動)
// ====================================================================
describe('EditTools — MOVE (移動)', () => {
  it('點擊圖元：選取並記錄起始位置到 _editState', () => {
    const engine = createMockEngine([
      { type: 'LINE', x1: 0, y1: 0, x2: 100, y2: 0 }
    ])

    // 點擊在線段中點附近
    handleEditMouseDown(engine, 50, 0, 'move')

    // 應選取該圖元
    expect(engine._selectedEntity).toBe(engine._entities[0])
    expect(engine._editState).not.toBeNull()
    expect(engine._editState.target).toBe(engine._entities[0])
    expect(engine._editState.dragStart).toEqual({ x: 50, y: 0 })
    expect(engine._editState.beforeState).toBeDefined()
    // select 事件發出
    expect(engine._events.select).toHaveLength(1)
    expect(engine._events.select[0]).toBe(engine._entities[0])
  })

  it('拖曳滑鼠：圖元位置隨之移動', () => {
    const engine = createMockEngine([
      { type: 'LINE', x1: 0, y1: 0, x2: 100, y2: 0 }
    ])
    const line = engine._entities[0]

    // 點擊選取
    handleEditMouseDown(engine, 50, 0, 'move')

    // 拖曳到 (60, 20) — 增量 (10, 20)
    handleEditMouseMove(engine, 60, 20, 'move')

    // 線段應移動 (10, 20)
    expect(line.x1).toBe(10)
    expect(line.y1).toBe(20)
    expect(line.x2).toBe(110)
    expect(line.y2).toBe(20)

    // 再次拖曳 (80, 40) — 增量 (20, 20)
    handleEditMouseMove(engine, 80, 40, 'move')

    expect(line.x1).toBe(30)
    expect(line.y1).toBe(40)
    expect(line.x2).toBe(130)
    expect(line.y2).toBe(40)
  })

  it('放開滑鼠：提交變更並清空 _editState', () => {
    const engine = createMockEngine([
      { type: 'LINE', x1: 0, y1: 0, x2: 100, y2: 0 }
    ])
    const line = engine._entities[0]

    handleEditMouseDown(engine, 50, 0, 'move')
    handleEditMouseMove(engine, 60, 20, 'move')

    const renderCountBefore = engine._renderCount

    handleEditMouseUp(engine, 60, 20, 'move')

    // _editState 清空
    expect(engine._editState).toBeNull()
    // 位置已固定（不再回彈）
    expect(line.x1).toBe(10)
    expect(line.y1).toBe(20)
    expect(line.x2).toBe(110)
    expect(line.y2).toBe(20)
    // 有重新渲染
    expect(engine._renderCount).toBeGreaterThan(renderCountBefore)
    // modified 事件觸發
    expect(engine._events.modified).toHaveLength(1)
  })

  it('點擊空白區域：取消選取', () => {
    const engine = createMockEngine([
      { type: 'LINE', x1: 0, y1: 0, x2: 100, y2: 0 }
    ])

    // 先選取圖元
    handleEditMouseDown(engine, 50, 0, 'move')
    expect(engine._selectedEntity).toBe(engine._entities[0])

    // 點擊空白區域
    handleEditMouseDown(engine, 999, 999, 'move')

    expect(engine._selectedEntity).toBeNull()
    expect(engine._editState).toBeNull()
    // select(null) 事件發出
    const lastSelect = engine._events.select[engine._events.select.length - 1]
    expect(lastSelect).toBeNull()
  })

  it('支援 undo/redo — 放開後可復原位置', () => {
    const engine = createMockEngine([
      { type: 'LINE', x1: 0, y1: 0, x2: 100, y2: 0 }
    ])
    const line = engine._entities[0]

    // 移動線段
    handleEditMouseDown(engine, 50, 0, 'move')
    handleEditMouseMove(engine, 60, 20, 'move')
    handleEditMouseUp(engine, 60, 20, 'move')

    expect(line.x1).toBe(10)
    expect(line.y1).toBe(20)

    // undo：回到原始位置
    const undoCmd = engine._history.stack[engine._history.ptr]
    engine._history.undo()
    // 位置應復原（undo 時 _makeMoveCmd 的 undo 會將 entity 還原為 beforeState）
    // 注意：_makeMoveCmd 的 undo 使用 deepClone，但 undo 是 history 內直接執行的
    // 但 entity 的值只透過命令改變，history 的 undo 呼叫 cmd.undo()
    // 而 cmd 的 undo 是 Object.assign(entity, deepClone(before))
    // 所以 undo 後 entity 應回到 (0,0)-(100,0)
    expect(line.x1).toBe(0)
    expect(line.y1).toBe(0)
    expect(line.x2).toBe(100)
    expect(line.y2).toBe(0)
  })
})

// ====================================================================
// 實際操作測試：OFFSET
// ====================================================================
describe('EditTools — OFFSET (偏移)', () => {
  it('點擊 LINE：產生平行偏移的新線段', () => {
    const engine = createMockEngine([
      { type: 'LINE', x1: 0, y1: 0, x2: 100, y2: 0 }
    ])
    const original = engine._entities[0]

    // 點擊線段
    handleEditMouseDown(engine, 50, 0, 'offset')

    expect(engine._entities).toHaveLength(2)
    const offset = engine._entities[1]

    expect(offset.type).toBe('LINE')
    expect(offset.id).not.toBe(original.id)
    // 水平線 (dx=100, dy=0) → nx = -0/100 = 0, ny = 100/100 = 1 ... wait
    // len = hypot(100, 0) = 100
    // nx = -0/100 * OFFSET_DISTANCE = 0, ny = 100/100 * OFFSET_DISTANCE = OFFSET_DISTANCE
    // 不對，公式是: nx = -dy/len * dist, ny = dx/len * dist
    // nx = -0/100 * 15 = 0, ny = 100/100 * 15 = 15
    // 所以線向上平移 15 單位
    expect(offset.x1).toBe(original.x1 + 0)        // nx = 0
    expect(offset.y1).toBe(original.y1 + OFFSET_DISTANCE) // ny = 15
    expect(offset.x2).toBe(original.x2 + 0)
    expect(offset.y2).toBe(original.y2 + OFFSET_DISTANCE)

    // 事件驗證
    expect(engine._events.entityAdded).toHaveLength(1)
    expect(engine._events.modified).toHaveLength(1)
  })

  it('點擊 CIRCLE：產生半徑增加的同心圓', () => {
    const engine = createMockEngine([
      { type: 'CIRCLE', cx: 50, cy: 50, radius: 30 }
    ])
    const original = engine._entities[0]

    // 點在圓周上（右側邊緣）以命中
    handleEditMouseDown(engine, 80, 50, 'offset')

    expect(engine._entities).toHaveLength(2)
    const offset = engine._entities[1]

    expect(offset.type).toBe('CIRCLE')
    expect(offset.cx).toBe(original.cx)
    expect(offset.cy).toBe(original.cy)
    expect(offset.radius).toBe(original.radius + OFFSET_DISTANCE)
  })

  it('點擊空白區域：不動作', () => {
    const engine = createMockEngine([
      { type: 'LINE', x1: 0, y1: 0, x2: 100, y2: 0 }
    ])

    handleEditMouseDown(engine, 999, 999, 'offset')

    expect(engine._entities).toHaveLength(1)
    expect(engine._events.entityAdded).toHaveLength(0)
  })
})

// ====================================================================
// 實際操作測試：TRIM
// ====================================================================
describe('EditTools — TRIM (修剪/刪除)', () => {
  it('點擊圖元：從 entities 移除', () => {
    const engine = createMockEngine([
      { type: 'LINE', x1: 0, y1: 0, x2: 100, y2: 0 },
      { type: 'CIRCLE', cx: 50, cy: 50, radius: 30 }
    ])

    // 點擊第一條線
    handleEditMouseDown(engine, 50, 0, 'trim')

    expect(engine._entities).toHaveLength(1)
    expect(engine._entities[0].type).toBe('CIRCLE')

    expect(engine._events.entityRemoved).toHaveLength(1)
    expect(engine._events.modified).toHaveLength(1)
  })

  it('點擊空白區域：不影響 entities', () => {
    const engine = createMockEngine([
      { type: 'LINE', x1: 0, y1: 0, x2: 100, y2: 0 }
    ])

    handleEditMouseDown(engine, 999, 999, 'trim')

    expect(engine._entities).toHaveLength(1)
    expect(engine._events.entityRemoved).toHaveLength(0)
  })

  it('連續修剪多個圖元', () => {
    const engine = createMockEngine([
      { type: 'LINE', x1: 0, y1: 0, x2: 10, y2: 0 },
      { type: 'LINE', x1: 0, y1: 20, x2: 10, y2: 20 },
      { type: 'LINE', x1: 0, y1: 40, x2: 10, y2: 40 }
    ])

    handleEditMouseDown(engine, 5, 0, 'trim')   // 刪除第 1 條
    expect(engine._entities).toHaveLength(2)

    handleEditMouseDown(engine, 5, 20, 'trim')  // 刪除第 2 條
    expect(engine._entities).toHaveLength(1)

    handleEditMouseDown(engine, 5, 40, 'trim')  // 刪除第 3 條
    expect(engine._entities).toHaveLength(0)

    expect(engine._events.entityRemoved).toHaveLength(3)
  })
})

// ====================================================================
// 整合測試：編輯工具間互相切換不衝突
// ====================================================================
describe('EditTools — 整合測試', () => {
  it('RECT → COPY → TRIM 順序操作', () => {
    const engine = createMockEngine()

    // 1. RECT 畫矩形
    handleEditMouseDown(engine, 10, 10, 'rect')
    handleEditMouseDown(engine, 50, 50, 'rect')
    expect(engine._entities).toHaveLength(1)

    // 2. COPY 複製矩形
    // 矩形頂點：(10,10)-(50,10)-(50,50)-(10,50)
    // 點擊在 (30,30) — 接近頂點連線
    // POLYGON hitTest: 檢查每條邊
    handleEditMouseDown(engine, 30, 10, 'copy')
    expect(engine._entities).toHaveLength(2)

    // 3. TRIM 刪除矩形
    handleEditMouseDown(engine, 30, 10, 'trim')
    expect(engine._entities).toHaveLength(1)
  })
})
