/**
 * StatusBar 元件單元測試
 * ============================================
 * 測試重點：
 * 1. 顯示工具名稱、座標（螢幕/世界）、圖元總數
 * 2. 捕捉 ON/OFF 顯示正確顏色（ON 用綠色、OFF 用灰色）
 * 3. 每 200ms 輪詢 engine 狀態（entityCount、snapState、zoom）
 * 4. 滑鼠移動更新座標
 * 5. 連線狀態顯示
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import StatusBar from '../src/components/StatusBar/index.jsx'

// ====================================================================
// 輔助函數：建立模擬 Engine
// ====================================================================
function createMockEngine() {
  const engine = {
    _entities: [],
    _snapState: { snapToGrid: true, ortho: false },
    _zoom: 1,
    canvas: null,

    getEntities() {
      return this._entities
    },

    getSnapState() {
      return { ...this._snapState }
    },

    getZoom() {
      return this._zoom
    },

    /**
     * 設定 canvas 元素模擬 getBoundingClientRect
     */
    _setCanvas(rect) {
      this.canvas = {
        getBoundingClientRect() {
          return rect || { left: 0, top: 0, width: 800, height: 600 }
        },
      }
    },

    /**
     * 模擬世界座標轉換
     */
    _screenToWorld(sx, sy) {
      return { x: sx / 2, y: sy / 2 }
    },
  }

  return engine
}

// ====================================================================
// 測試套件
// ====================================================================
describe('StatusBar', () => {
  let engine

  beforeEach(() => {
    engine = createMockEngine()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ----------------------------------------------------------------
  // 1. 顯示工具名稱、座標、圖元總數
  // ----------------------------------------------------------------
  it('顯示工具名稱、座標資訊與圖元總數', () => {
    engine._entities = [
      { id: 'e1', type: 'LINE' },
      { id: 'e2', type: 'CIRCLE' },
    ]
    engine._setCanvas()

    render(<StatusBar engine={engine} activeTool="line" connected={true} />)

    // 工具名稱
    expect(screen.getByText(/工具:/)).toBeInTheDocument()
    expect(screen.getByText(/line/)).toBeInTheDocument()

    // 螢幕座標（預設顯示 (0, 0)）
    const screenSpan = screen.getByText(/螢幕:/)
    expect(screenSpan).toBeInTheDocument()
    expect(screenSpan.textContent).toContain('(0, 0)')

    // 世界座標
    const worldSpan = screen.getByText(/世界:/)
    expect(worldSpan).toBeInTheDocument()
    expect(worldSpan.textContent).toContain('(0, 0)')

    // 圖元總數 = 2（初始 tick 已執行）
    const entitySpan = screen.getByText(/圖元:/)
    expect(entitySpan).toBeInTheDocument()
    expect(entitySpan.textContent).toContain('2')
  })

  // ----------------------------------------------------------------
  // 2. 捕捉 ON/OFF 顯示正確顏色
  // ----------------------------------------------------------------
  it('捕捉 ON 顯示綠色 (#a6e3a1)，OFF 顯示灰色 (#6c7086)', () => {
    // 情境一：捕捉 ON
    engine._snapState = { snapToGrid: true, ortho: false }
    engine._setCanvas()

    render(<StatusBar engine={engine} activeTool="select" connected={true} />)

    const snapEl = screen.getByText(/捕捉: ON/)
    expect(snapEl).toBeInTheDocument()
    expect(snapEl).toHaveStyle('color: #a6e3a1')

    // 正交 OFF（灰色）
    const orthoEl = screen.getByText(/正交: OFF/)
    expect(orthoEl).toHaveStyle('color: #6c7086')

    // 情境二：捕捉 OFF，正交 ON
    engine._snapState = { snapToGrid: false, ortho: true }

    // 前進 200ms 觸發 interval tick，需包在 act 中
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(screen.getByText(/捕捉: OFF/)).toHaveStyle('color: #6c7086')
    expect(screen.getByText(/正交: ON/)).toHaveStyle('color: #f9e2af')
  })

  // ----------------------------------------------------------------
  // 3. 每 200ms 輪詢 engine 狀態
  // ----------------------------------------------------------------
  it('每 200ms 輪詢 engine 狀態（entityCount、snapState、zoom）', () => {
    // 初始狀態：0 個圖元
    engine._entities = []
    engine._snapState = { snapToGrid: true, ortho: false }
    engine._zoom = 1
    engine._setCanvas()

    render(<StatusBar engine={engine} activeTool="line" connected={true} />)

    // 初始：圖元數 0
    const entitySpan1 = screen.getByText(/圖元:/)
    expect(entitySpan1.textContent).toContain('0')

    // 模擬 engine 資料變更
    engine._entities = [
      { id: 'e1', type: 'LINE' },
      { id: 'e2', type: 'CIRCLE' },
      { id: 'e3', type: 'ARC' },
    ]
    engine._snapState = { snapToGrid: false, ortho: true }
    engine._zoom = 1.5

    // 前進 200ms → 觸發 interval tick
    act(() => {
      vi.advanceTimersByTime(200)
    })

    // 圖元數變為 3
    const entitySpan2 = screen.getByText(/圖元:/)
    expect(entitySpan2.textContent).toContain('3')

    // 捕捉狀態更新
    expect(screen.getByText(/捕捉: OFF/)).toBeInTheDocument()
    expect(screen.getByText(/正交: ON/)).toBeInTheDocument()

    // 縮放顯示 150%
    const zoomSpan = screen.getByText(/縮放:/)
    expect(zoomSpan.textContent).toContain('150')
  })

  // ----------------------------------------------------------------
  // 4. 滑鼠移動更新座標顯示
  // ----------------------------------------------------------------
  it('滑鼠在 StatusBar 上移動時更新螢幕與世界座標', () => {
    engine._setCanvas({ left: 10, top: 20, width: 800, height: 600 })

    render(<StatusBar engine={engine} activeTool="select" connected={true} />)

    // 模擬滑鼠在 bar 上移動
    const bar = screen.getByText(/工具:/).closest('div')
    expect(bar).toBeInTheDocument()

    fireEvent.mouseMove(bar, {
      clientX: 210,
      clientY: 120,
    })

    // 螢幕座標: (210-10, 120-20) = (200, 100)
    expect(screen.getByText(/螢幕: \(200, 100\)/)).toBeInTheDocument()

    // 世界座標: engine._screenToWorld(200, 100) → (100, 50)
    expect(screen.getByText(/世界: \(100\.0, 50\.0\)/)).toBeInTheDocument()
  })

  // ----------------------------------------------------------------
  // 5. 連線狀態顯示
  // ----------------------------------------------------------------
  it('連線狀態顯示「已連線」（綠色）或「未連線」（紅色）', () => {
    engine._setCanvas()

    const { rerender } = render(
      <StatusBar engine={engine} activeTool="line" connected={true} />
    )

    // 已連線
    const connectedEl = screen.getByText('已連線')
    expect(connectedEl).toBeInTheDocument()
    expect(connectedEl).toHaveStyle('color: #a6e3a1')

    // 重設為未連線
    rerender(<StatusBar engine={engine} activeTool="line" connected={false} />)

    const disconnectedEl = screen.getByText('未連線')
    expect(disconnectedEl).toBeInTheDocument()
    expect(disconnectedEl).toHaveStyle('color: #f38ba8')
  })
})
