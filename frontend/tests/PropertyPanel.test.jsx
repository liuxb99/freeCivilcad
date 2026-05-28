/**
 * PropertyPanel 元件單元測試
 * ============================================
 * 測試重點：
 * 1. 未選取圖元時顯示「未選取圖元」
 * 2. LINE 圖元正確顯示 x1/y1/x2/y2
 * 3. CIRCLE 圖元正確顯示 cx/cy/radius
 * 4. 點擊數值欄位切換為 <input>（autoFocus）
 * 5. Enter 提交修改（verify updateEntity 被呼叫）
 * 6. Escape 取消編輯（恢復原始值）
 * 7. blur 自動提交修改
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import PropertyPanel from '../src/components/PropertyPanel/index.jsx'

// ====================================================================
// 輔助函數：建立模擬 Engine
// ====================================================================
function createMockEngine() {
  const engine = {
    _selected: null,
    _handlerMap: {},

    /**
     * 註冊事件監聽
     * @param {string} event - 事件名稱（'select' | 'modified'）
     * @param {Function} handler - 回呼函數
     * @returns {Function} 取消監聽的函數
     */
    on(event, handler) {
      if (!this._handlerMap[event]) {
        this._handlerMap[event] = []
      }
      this._handlerMap[event].push(handler)
      // 回傳取消監聽函數
      return () => {
        const list = this._handlerMap[event]
        if (list) {
          const idx = list.indexOf(handler)
          if (idx >= 0) list.splice(idx, 1)
        }
      }
    },

    /**
     * 觸發事件（供測試使用）
     */
    _emit(event, ...args) {
      const list = this._handlerMap[event]
      if (list) {
        for (const h of list) {
          h(...args)
        }
      }
    },

    /**
     * 取得當前選取圖元
     */
    getSelected() {
      return this._selected
    },

    /**
     * 設定選取圖元並觸發 select 事件
     */
    _select(entity) {
      this._selected = entity
      this._emit('select', entity)
    },

    /**
     * 更新圖元（模擬）
     */
    updateEntity(id, props) {
      if (!this._selected) return
      if (this._selected.id !== id) return
      Object.assign(this._selected, props)
      this._emit('modified')
    },
  }

  return engine
}

// ====================================================================
// 通用的 LINE / CIRCLE 測試資料
// ====================================================================
const LINE_ENTITY = {
  id: 'e1',
  type: 'LINE',
  color: '#cdd6f4',
  layer: '0',
  x1: 100,
  y1: 200,
  x2: 300,
  y2: 400,
}

const CIRCLE_ENTITY = {
  id: 'e2',
  type: 'CIRCLE',
  color: '#a6e3a1',
  layer: '1',
  cx: 250,
  cy: 180,
  radius: 50,
}

// ====================================================================
// 測試套件
// ====================================================================
describe('PropertyPanel', () => {
  let engine

  beforeEach(() => {
    engine = createMockEngine()
  })

  // ----------------------------------------------------------------
  // 1. 未選取圖元時顯示「未選取圖元」
  // ----------------------------------------------------------------
  it('未選取圖元時顯示「未選取圖元」', () => {
    render(<PropertyPanel engine={engine} />)
    expect(screen.getByText('未選取圖元')).toBeInTheDocument()
  })

  // ----------------------------------------------------------------
  // 2. LINE 顯示 x1/y1/x2/y2
  // ----------------------------------------------------------------
  it('LINE 圖元正確顯示起點/終點座標', () => {
    render(<PropertyPanel engine={engine} />)

    // 模擬選取 LINE 圖元（需包在 act 中以等待 state 更新）
    act(() => {
      engine._select(LINE_ENTITY)
    })

    // 驗證屬性標籤與數值出現
    expect(screen.getByText('起點 X')).toBeInTheDocument()
    expect(screen.getByText('起點 Y')).toBeInTheDocument()
    expect(screen.getByText('終點 X')).toBeInTheDocument()
    expect(screen.getByText('終點 Y')).toBeInTheDocument()

    // 驗證數值（Math.round 後）
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('300')).toBeInTheDocument()
    expect(screen.getByText('400')).toBeInTheDocument()
  })

  // ----------------------------------------------------------------
  // 3. CIRCLE 顯示 cx/cy/radius
  // ----------------------------------------------------------------
  it('CIRCLE 圖元正確顯示圓心與半徑', () => {
    render(<PropertyPanel engine={engine} />)

    act(() => {
      engine._select(CIRCLE_ENTITY)
    })

    expect(screen.getByText('圓心 X')).toBeInTheDocument()
    expect(screen.getByText('圓心 Y')).toBeInTheDocument()
    expect(screen.getByText('半徑')).toBeInTheDocument()

    expect(screen.getByText('250')).toBeInTheDocument()
    expect(screen.getByText('180')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  // ----------------------------------------------------------------
  // 4. 點擊數值欄位切換為 <input>（autoFocus）
  // ----------------------------------------------------------------
  it('點擊可編輯數值欄位時切入編輯模式（顯示 input）', () => {
    render(<PropertyPanel engine={engine} />)

    act(() => {
      engine._select(LINE_ENTITY)
    })

    // 點擊「終點 X」的數值欄位（300）
    const valueSpan = screen.getByText('300')
    expect(valueSpan.tagName).toBe('SPAN')
    fireEvent.click(valueSpan)

    // 檢查是否出現 <input>
    const input = screen.getByDisplayValue('300')
    expect(input.tagName).toBe('INPUT')
    expect(document.activeElement).toBe(input)
  })

  // ----------------------------------------------------------------
  // 5. Enter 提交修改
  // ----------------------------------------------------------------
  it('按 Enter 提交修改並呼叫 updateEntity', () => {
    const updateSpy = []
    engine.updateEntity = (id, props) => {
      updateSpy.push({ id, props })
      if (engine._selected) {
        Object.assign(engine._selected, props)
        engine._emit('modified')
      }
    }

    render(<PropertyPanel engine={engine} />)

    act(() => {
      engine._select({ ...LINE_ENTITY })
    })

    // 點擊「終點 X」數值
    fireEvent.click(screen.getByText('300'))

    // 修改 input 值
    const input = screen.getByDisplayValue('300')
    fireEvent.change(input, { target: { value: '500' } })

    // 按 Enter 提交
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    // 驗證 updateEntity 被呼叫
    expect(updateSpy).toHaveLength(1)
    expect(updateSpy[0].id).toBe('e1')
    expect(updateSpy[0].props).toEqual({ x2: 500 })
  })

  // ----------------------------------------------------------------
  // 6. Escape 取消編輯（恢復原始值）
  // ----------------------------------------------------------------
  it('按 Escape 取消編輯，恢復原始值', () => {
    render(<PropertyPanel engine={engine} />)

    act(() => {
      engine._select({ ...LINE_ENTITY })
    })

    // 點擊「終點 X」數值
    fireEvent.click(screen.getByText('300'))

    // 修改 input 值
    const input = screen.getByDisplayValue('300')
    fireEvent.change(input, { target: { value: '500' } })

    // 按 Escape 取消
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' })

    // input 消失，恢復顯示原始值
    expect(screen.queryByDisplayValue('500')).toBeNull()
    expect(screen.getByText('300')).toBeInTheDocument()
  })

  // ----------------------------------------------------------------
  // 7. blur 自動提交修改
  // ----------------------------------------------------------------
  it('blur 時自動提交修改並呼叫 updateEntity', () => {
    const updateSpy = []
    engine.updateEntity = (id, props) => {
      updateSpy.push({ id, props })
      if (engine._selected) {
        Object.assign(engine._selected, props)
        engine._emit('modified')
      }
    }

    render(<PropertyPanel engine={engine} />)

    act(() => {
      engine._select({ ...LINE_ENTITY })
    })

    // 點擊「終點 X」數值
    fireEvent.click(screen.getByText('300'))

    // 修改 input 值
    const input = screen.getByDisplayValue('300')
    fireEvent.change(input, { target: { value: '777' } })

    // blur（失去焦點）
    fireEvent.blur(input)

    // 驗證 updateEntity 被呼叫
    expect(updateSpy).toHaveLength(1)
    expect(updateSpy[0].id).toBe('e1')
    expect(updateSpy[0].props).toEqual({ x2: 777 })
  })
})
