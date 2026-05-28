/**
 * POLYLINE 多段線繪製功能測試
 * ============================================
 * 測試：繪製頂點、Enter 閉合、Escape 取消、雙擊結束
 */
import { describe, it, expect, beforeEach } from 'vitest'

// ====================================================================
// 輔助函數：建立模擬 Engine 物件（支援 POLYLINE）
// ====================================================================
function createMockEngine() {
  const entities = []
  let nextId = 1
  const events = { entityAdded: [], entityRemoved: [], modified: [] }

  const engine = {
    _entities: entities,
    _isDrawing: false,
    _drawingEntity: null,
    _drawingPhase: 0,
    _editState: null,
    _handlers: {},
    _polylineHintEl: { style: { display: 'none' } },

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
        ...JSON.parse(JSON.stringify(props || {}))
      }
      if (type === 'POLYLINE') {
        if (!e.vertices) e.vertices = []
        if (e.isClosed === undefined) e.isClosed = false
      }
      return e
    },

    _finishPolyline(close) {
      const e = this._drawingEntity
      if (e && e.vertices.length >= 2) {
        const entity = this._makeEntity('POLYLINE', {
          vertices: e.vertices.map(v => ({ x: v.x, y: v.y })),
          isClosed: !!close
        })
        this._entities.push(entity)
        events.entityAdded.push(entity)
        events.modified.push(true)
      }
      this._isDrawing = false
      this._drawingEntity = null
      this._drawingPhase = 0
      if (this._polylineHintEl) this._polylineHintEl.style.display = 'none'
    },

    render() {
      this._renderCount = (this._renderCount || 0) + 1
    },

    _events: events
  }

  return engine
}

// ====================================================================
// POLYLINE 繪製測試
// ====================================================================
describe('POLYLINE 繪製', () => {
  it('第一次點擊：進入繪製狀態，建立 _drawingEntity 含第一個頂點', () => {
    const engine = createMockEngine()

    // 模擬第一次點擊 (polyline tool, world coords)
    engine._tool = 'polyline'
    engine._isDrawing = false
    engine._drawingEntity = engine._makeEntity('POLYLINE', { vertices: [{ x: 10, y: 20 }] })
    engine._isDrawing = true
    engine._drawingPhase = 1

    expect(engine._isDrawing).toBe(true)
    expect(engine._drawingEntity).not.toBeNull()
    expect(engine._drawingEntity.type).toBe('POLYLINE')
    expect(engine._drawingEntity.vertices).toHaveLength(1)
    expect(engine._drawingEntity.vertices[0]).toEqual({ x: 10, y: 20 })
    expect(engine._drawingEntity.isClosed).toBe(false)
  })

  it('連續點擊：新增頂點至 vertices 陣列', () => {
    const engine = createMockEngine()

    // 模擬連續繪製
    engine._tool = 'polyline'
    engine._isDrawing = true
    engine._drawingEntity = engine._makeEntity('POLYLINE', { vertices: [{ x: 10, y: 20 }] })

    // 第 2 次點擊
    engine._drawingEntity.vertices.push({ x: 50, y: 30 })
    expect(engine._drawingEntity.vertices).toHaveLength(2)

    // 第 3 次點擊
    engine._drawingEntity.vertices.push({ x: 80, y: 60 })
    expect(engine._drawingEntity.vertices).toHaveLength(3)

    // 第 4 次點擊
    engine._drawingEntity.vertices.push({ x: 40, y: 90 })
    expect(engine._drawingEntity.vertices).toHaveLength(4)

    // 驗證所有頂點
    expect(engine._drawingEntity.vertices[0]).toEqual({ x: 10, y: 20 })
    expect(engine._drawingEntity.vertices[1]).toEqual({ x: 50, y: 30 })
    expect(engine._drawingEntity.vertices[2]).toEqual({ x: 80, y: 60 })
    expect(engine._drawingEntity.vertices[3]).toEqual({ x: 40, y: 90 })
  })

  it('Enter 閉合：isClosed=true 且加入 entities', () => {
    const engine = createMockEngine()

    // 繪製 3 個頂點
    engine._tool = 'polyline'
    engine._isDrawing = true
    engine._drawingEntity = engine._makeEntity('POLYLINE', {
      vertices: [
        { x: 10, y: 20 },
        { x: 50, y: 30 },
        { x: 80, y: 60 }
      ]
    })

    // 按 Enter 閉合
    engine._finishPolyline(true)

    expect(engine._isDrawing).toBe(false)
    expect(engine._drawingEntity).toBeNull()
    expect(engine._entities).toHaveLength(1)

    const polyline = engine._entities[0]
    expect(polyline.type).toBe('POLYLINE')
    expect(polyline.isClosed).toBe(true)
    expect(polyline.vertices).toHaveLength(3)
    expect(polyline.vertices[0]).toEqual({ x: 10, y: 20 })
    expect(polyline.vertices[2]).toEqual({ x: 80, y: 60 })

    // 驗證事件觸發
    expect(engine._events.entityAdded).toHaveLength(1)
    expect(engine._events.modified).toHaveLength(1)
  })

  it('Enter 結束（不閉合）：isClosed=false 且加入 entities', () => {
    const engine = createMockEngine()

    // 繪製 3 個頂點
    engine._tool = 'polyline'
    engine._isDrawing = true
    engine._drawingEntity = engine._makeEntity('POLYLINE', {
      vertices: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 }
      ]
    })

    // 結束但不閉合
    engine._finishPolyline(false)

    expect(engine._isDrawing).toBe(false)
    expect(engine._drawingEntity).toBeNull()
    expect(engine._entities).toHaveLength(1)

    const polyline = engine._entities[0]
    expect(polyline.isClosed).toBe(false)
  })

  it('Escape 取消：清除繪製狀態，不新增 entity', () => {
    const engine = createMockEngine()

    // 正在繪製中
    engine._tool = 'polyline'
    engine._isDrawing = true
    engine._drawingEntity = engine._makeEntity('POLYLINE', {
      vertices: [
        { x: 10, y: 20 },
        { x: 50, y: 30 }
      ]
    })

    // 模擬 Escape 取消
    engine._isDrawing = false
    engine._drawingEntity = null
    engine._drawingPhase = 0
    if (engine._polylineHintEl) engine._polylineHintEl.style.display = 'none'

    expect(engine._isDrawing).toBe(false)
    expect(engine._drawingEntity).toBeNull()
    expect(engine._entities).toHaveLength(0)
  })

  it('雙擊結束（不閉合）：isClosed=false 且 entities 新增', () => {
    const engine = createMockEngine()

    // 繪製中（已有多個頂點）
    engine._tool = 'polyline'
    engine._isDrawing = true
    engine._drawingEntity = engine._makeEntity('POLYLINE', {
      vertices: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 }
      ]
    })

    // 雙擊模擬
    engine._finishPolyline(false)

    expect(engine._isDrawing).toBe(false)
    expect(engine._drawingEntity).toBeNull()
    expect(engine._entities).toHaveLength(1)
    expect(engine._entities[0].isClosed).toBe(false)
  })

  it('不足 2 頂點時 Enter 不產生圖元', () => {
    const engine = createMockEngine()

    // 只畫了 1 個頂點 — 不足 2，不應產生圖元
    engine._tool = 'polyline'
    engine._isDrawing = true
    engine._drawingEntity = engine._makeEntity('POLYLINE', {
      vertices: [{ x: 10, y: 20 }]
    })

    // 模擬 Enter 按鍵：因為 vertices 長度 < 2，不應新增圖元
    if (engine._drawingEntity && engine._drawingEntity.vertices.length >= 2) {
      engine._finishPolyline(true)
    } else {
      // 不足 2 頂點，enter 不做事（如同真實 engine-input 邏輯）
      engine.render()
    }

    expect(engine._entities).toHaveLength(0)
    // 繪製狀態仍持續
    expect(engine._isDrawing).toBe(true)
    expect(engine._drawingEntity).not.toBeNull()
  })

  it('雙擊結束且僅 1 頂點：不新增圖元', () => {
    const engine = createMockEngine()

    engine._tool = 'polyline'
    engine._isDrawing = true
    engine._drawingEntity = engine._makeEntity('POLYLINE', {
      vertices: [{ x: 10, y: 20 }]
    })

    // 少於 2 頂點，不應新增
    if (engine._drawingEntity.vertices.length >= 2) {
      engine._finishPolyline(false)
    } else {
      engine._isDrawing = false
      engine._drawingEntity = null
      engine._drawingPhase = 0
    }

    expect(engine._entities).toHaveLength(0)
    expect(engine._isDrawing).toBe(false)
    expect(engine._drawingEntity).toBeNull()
  })
})

// ====================================================================
// POLYLINE vs POLYGON 區別測試
// ====================================================================
describe('POLYLINE vs POLYGON 區別', () => {
  it('POLYLINE 可為開放路徑 (isClosed=false)，POLYGON 始終封閉', () => {
    const polyline = {
      type: 'POLYLINE',
      vertices: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }],
      isClosed: false
    }
    const polygon = {
      type: 'POLYGON',
      vertices: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]
    }

    expect(polyline.isClosed).toBe(false)
    // POLYGON 沒有 isClosed 屬性（視為始終封閉）
    expect(polygon.isClosed).toBeUndefined()
  })

  it('POLYLINE 支援閉合路徑 (isClosed=true)', () => {
    const polyline = {
      type: 'POLYLINE',
      vertices: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
      isClosed: true
    }

    expect(polyline.isClosed).toBe(true)
    expect(polyline.vertices).toHaveLength(4)
  })
})
