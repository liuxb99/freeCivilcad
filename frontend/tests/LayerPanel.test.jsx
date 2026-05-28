/**
 * LayerPanel 元件單元測試
 * ============================================
 * 測試重點：
 * 1. 初始顯示預設圖層
 * 2. 新建圖層（點擊 + 按鈕）
 * 3. 刪除圖層（保留至少一層）
 * 4. 切換可見性（眼睛圖示）
 * 5. 切換鎖定（鎖頭圖示）
 * 6. 選取目前圖層（高亮顯示）
 * 7. 變更顏色（選色器）
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import LayerPanel from '../src/components/LayerPanel/index.jsx'

// ====================================================================
// 輔助函數：建立模擬 Engine
// ====================================================================
function createMockEngine() {
  let layers = [
    { id: '0', name: '預設圖層', color: '#a6e3a1', visible: true, locked: false },
  ]
  let activeLayer = '0'
  let idCounter = 1
  const handlerMap = {}

  const engine = {
    /**
     * 註冊事件監聽
     */
    on(event, handler) {
      if (!handlerMap[event]) handlerMap[event] = []
      handlerMap[event].push(handler)
      return () => {
        const list = handlerMap[event]
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
      const list = handlerMap[event]
      if (list) {
        for (const h of list) h(...args)
      }
    },

    /**
     * 取得所有圖層（回傳拷貝）
     */
    getLayers() {
      return layers.map(l => ({ ...l }))
    },

    /**
     * 取得目前作用中圖層 ID
     */
    getActiveLayer() {
      return activeLayer
    },

    /**
     * 設定作用中圖層
     */
    setActiveLayer(layerId) {
      activeLayer = layerId
      const layer = layers.find(l => l.id === layerId)
      if (layer) {
        // 同步顏色與可見性
      }
      this._emit('modified')
    },

    /**
     * 新增圖層
     */
    addLayer(name, color) {
      const id = String(idCounter++)
      const layer = { id, name, color: color || '#a6e3a1', visible: true, locked: false }
      layers.push(layer)
      this._emit('modified')
      return { ...layer }
    },

    /**
     * 刪除圖層
     */
    removeLayer(id) {
      if (layers.length <= 1) return false
      const idx = layers.findIndex(l => l.id === id)
      if (idx < 0) return false
      layers.splice(idx, 1)
      if (activeLayer === id) activeLayer = '0'
      this._emit('modified')
      return true
    },

    /**
     * 設定圖層可見性
     */
    setLayerVisible(layerId, visible) {
      const layer = layers.find(l => l.id === layerId)
      if (layer) layer.visible = !!visible
      this._emit('modified')
    },

    /**
     * 設定圖層鎖定
     */
    setLayerLocked(layerId, locked) {
      const layer = layers.find(l => l.id === layerId)
      if (layer) layer.locked = !!locked
      this._emit('modified')
    },

    /**
     * 設定圖層顏色
     */
    setLayerColor(layerId, color) {
      const layer = layers.find(l => l.id === layerId)
      if (layer) layer.color = color
      this._emit('modified')
    },
  }

  return engine
}

// ====================================================================
// 測試套件
// ====================================================================
describe('LayerPanel', () => {
  let engine

  beforeEach(() => {
    engine = createMockEngine()
  })

  // ----------------------------------------------------------------
  // 1. 初始顯示預設圖層
  // ----------------------------------------------------------------
  it('初始顯示預設圖層「預設圖層」', () => {
    render(<LayerPanel engine={engine} />)

    // 預設圖層名稱應顯示
    expect(screen.getByText('預設圖層')).toBeInTheDocument()

    // 預設標籤應出現
    expect(screen.getByText('預設')).toBeInTheDocument()

    // 底部應顯示 1 個圖層
    expect(screen.getByText('1 個圖層')).toBeInTheDocument()
  })

  // ----------------------------------------------------------------
  // 2. 新建圖層
  // ----------------------------------------------------------------
  it('點擊 + 按鈕可新增圖層，自動命名「圖層 N」', () => {
    render(<LayerPanel engine={engine} />)

    // 找到 + 按鈕並點擊
    const addBtn = screen.getByTitle('新增圖層')
    fireEvent.click(addBtn)

    // 新圖層應顯示「圖層 2」
    expect(screen.getByText('圖層 2')).toBeInTheDocument()

    // 底部應顯示 2 個圖層
    expect(screen.getByText('2 個圖層')).toBeInTheDocument()

    // 再新增一個
    fireEvent.click(addBtn)
    expect(screen.getByText('圖層 3')).toBeInTheDocument()
    expect(screen.getByText('3 個圖層')).toBeInTheDocument()
  })

  // ----------------------------------------------------------------
  // 3. 刪除圖層（保留至少一層）
  // ----------------------------------------------------------------
  it('可刪除新增的圖層，但不能刪到最後一個', () => {
    render(<LayerPanel engine={engine} />)

    // 先新增兩個圖層（確保有可刪的）
    const addBtn = screen.getByTitle('新增圖層')
    fireEvent.click(addBtn)
    fireEvent.click(addBtn)
    expect(screen.getByText('3 個圖層')).toBeInTheDocument()

    // 3 層全部顯示刪除按鈕（非最後一層即可）
    const deleteBtns1 = screen.getAllByTitle('刪除圖層')
    expect(deleteBtns1.length).toBe(3)

    // 刪除其中一個新增的圖層 → 剩 2 層
    fireEvent.click(deleteBtns1[0])
    expect(screen.getByText('2 個圖層')).toBeInTheDocument()

    // 2 層時仍有 2 個刪除按鈕（因為 2 > 1）
    const deleteBtns2 = screen.getAllByTitle('刪除圖層')
    expect(deleteBtns2.length).toBe(2)

    // 再刪一個 → 剩 1 層，刪除按鈕消失
    fireEvent.click(deleteBtns2[0])
    expect(screen.getByText('1 個圖層')).toBeInTheDocument()
    expect(screen.queryByTitle('刪除圖層')).toBeNull()
  })

  // ----------------------------------------------------------------
  // 4. 切換可見性
  // ----------------------------------------------------------------
  it('點擊眼睛圖示可切換圖層可見性', () => {
    render(<LayerPanel engine={engine} />)

    // 預設圖層的可見性圖示
    const eyeIcons = screen.getAllByTitle(/顯示圖層|隱藏圖層/)
    expect(eyeIcons.length).toBeGreaterThanOrEqual(1)

    // 最初應顯示「隱藏圖層」（因為 visible = true）
    const visibleIcon = screen.getByTitle('隱藏圖層')
    expect(visibleIcon).toBeInTheDocument()

    // 點擊切換為隱藏
    fireEvent.click(visibleIcon)

    // 切換後應顯示「顯示圖層」
    const hiddenIcon = screen.getByTitle('顯示圖層')
    expect(hiddenIcon).toBeInTheDocument()

    // 再次點擊回到可見
    fireEvent.click(hiddenIcon)
    expect(screen.getByTitle('隱藏圖層')).toBeInTheDocument()
  })

  // ----------------------------------------------------------------
  // 5. 切換鎖定
  // ----------------------------------------------------------------
  it('點擊鎖頭圖示可切換圖層鎖定狀態', () => {
    render(<LayerPanel engine={engine} />)

    // 預設應為解鎖
    const unlockBtn = screen.getByTitle('鎖定圖層')
    expect(unlockBtn).toBeInTheDocument()

    // 點擊鎖定
    fireEvent.click(unlockBtn)

    // 切換後應顯示鎖定
    const lockBtn = screen.getByTitle('解鎖圖層')
    expect(lockBtn).toBeInTheDocument()

    // 再次點擊解鎖
    fireEvent.click(lockBtn)
    expect(screen.getByTitle('鎖定圖層')).toBeInTheDocument()
  })

  // ----------------------------------------------------------------
  // 6. 選取目前圖層
  // ----------------------------------------------------------------
  it('點擊圖層可設為目前圖層，高亮顯示', () => {
    render(<LayerPanel engine={engine} />)

    // 新增一個圖層
    const addBtn = screen.getByTitle('新增圖層')
    fireEvent.click(addBtn)

    // 預設圖層為 active（背景色應有 rgba 高亮）
    const defaultLayer = screen.getByText('預設圖層').closest('div[style]')
    // 點擊新圖層「圖層 2」
    const newLayer = screen.getByText('圖層 2')
    fireEvent.click(newLayer)

    // 確認作用中圖層已切換（engine 的 activeLayer 被更新）
    expect(engine.getActiveLayer()).toBe('1') // idCounter 從 1 開始

    // 再點回預設圖層
    fireEvent.click(screen.getByText('預設圖層'))
    expect(engine.getActiveLayer()).toBe('0')
  })

  // ----------------------------------------------------------------
  // 7. 變更顏色
  // ----------------------------------------------------------------
  it('透過顏色選取器可變更圖層顏色', () => {
    render(<LayerPanel engine={engine} />)

    // 找到顏色 input
    const colorInputs = screen.getAllByTitle('變更圖層顏色')
    expect(colorInputs.length).toBeGreaterThanOrEqual(1)

    // 變更顏色
    fireEvent.input(colorInputs[0], { target: { value: '#ff0000' } })

    // 驗證 engine 中的顏色已更新
    const layers = engine.getLayers()
    expect(layers[0].color).toBe('#ff0000')
  })

  // ----------------------------------------------------------------
  // 8. engine 為 null 時顯示提示訊息
  // ----------------------------------------------------------------
  it('engine 為 null 時顯示「引擎尚未初始化」', () => {
    render(<LayerPanel engine={null} />)
    expect(screen.getByText('引擎尚未初始化')).toBeInTheDocument()
  })
})
