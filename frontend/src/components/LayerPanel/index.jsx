import React, { useState, useEffect, useCallback, useRef } from 'react'

/**
 * LayerPanel — 圖層面板
 *
 * 功能：
 *   1. 新建圖層（自動命名「圖層 N」）
 *   2. 刪除圖層（保留至少一層）
 *   3. 切換可見性（眼睛圖示）
 *   4. 切換鎖定（鎖頭圖示）
 *   5. 選取目前圖層（高亮顯示）
 *   6. 顏色選取（色塊 → 顏色選擇器）
 *
 * 與 engine 整合：
 *   - engine.getLayers() 讀取圖層列表
 *   - engine.addLayer() / removeLayer() / setLayerVisible() /
 *     setLayerLocked() / setActiveLayer() / setLayerColor() 同步操作
 */
export default function LayerPanel({ engine }) {
  const [layers, setLayers] = useState([])
  const [activeLayer, setActiveLayer] = useState('0')
  // 用來記住 layerApi 的更新（避免未定義引擎時操作失敗）
  const mountedRef = useRef(true)

  // ------------------------------------------------------------------
  // 從 engine 同步圖層資料
  // ------------------------------------------------------------------
  const syncLayers = useCallback(() => {
    if (!engine) return
    const list = engine.getLayers()
    setLayers(list)
    const active = engine.getActiveLayer()
    setActiveLayer(active || '0')
  }, [engine])

  // 初次掛載與 engine 變動時同步
  useEffect(() => {
    syncLayers()
  }, [syncLayers])

  // 訂閱 engine 的 modified 事件，保持面板同步
  useEffect(() => {
    if (!engine) return
    const unsub = engine.on('modified', syncLayers)
    return () => { if (unsub) unsub() }
  }, [engine, syncLayers])

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  // ------------------------------------------------------------------
  // 工具函數：自動命名
  // ------------------------------------------------------------------
  const nextLayerName = useCallback(() => {
    const count = layers.length
    return `圖層 ${count + 1}`
  }, [layers.length])

  // ------------------------------------------------------------------
  // 色盤（自動分配用）
  // ------------------------------------------------------------------
  const LAYER_COLORS = ['#f38ba8', '#a6e3a1', '#89b4fa', '#f9e2af', '#fab387', '#cba6f7', '#94e2d5', '#f5c2e7']

  const pickColor = useCallback((index) => {
    return LAYER_COLORS[index % LAYER_COLORS.length]
  }, [])

  // ------------------------------------------------------------------
  // 1. 新建圖層
  // ------------------------------------------------------------------
  const handleAddLayer = useCallback(() => {
    if (!engine) return
    const name = nextLayerName()
    const color = pickColor(layers.length)
    engine.addLayer(name, color)
    // engine.addLayer 已觸發 modified → syncLayers 自動更新 state
  }, [engine, layers.length, nextLayerName, pickColor])

  // ------------------------------------------------------------------
  // 2. 刪除圖層（不可刪除最後一個）
  // ------------------------------------------------------------------
  const handleDeleteLayer = useCallback((layerId) => {
    if (!engine) return
    if (layers.length <= 1) return
    engine.removeLayer(layerId)
    // removeLayer 已觸發 modified → syncLayers 自動更新
  }, [engine, layers.length])

  // ------------------------------------------------------------------
  // 3. 切換可見性
  // ------------------------------------------------------------------
  const handleToggleVisible = useCallback((layerId, currentVisible) => {
    if (!engine) return
    engine.setLayerVisible(layerId, !currentVisible)
  }, [engine])

  // ------------------------------------------------------------------
  // 4. 切換鎖定
  // ------------------------------------------------------------------
  const handleToggleLocked = useCallback((layerId, currentLocked) => {
    if (!engine) return
    engine.setLayerLocked(layerId, !currentLocked)
  }, [engine])

  // ------------------------------------------------------------------
  // 5. 選取目前圖層
  // ------------------------------------------------------------------
  const handleSelectLayer = useCallback((layerId) => {
    if (!engine) return
    // 若圖層已鎖定，不允許設為作用中圖層（但仍可點選檢視）
    const layer = layers.find(l => l.id === layerId)
    if (layer && layer.locked) return
    engine.setActiveLayer(layerId)
    setActiveLayer(layerId)
  }, [engine, layers])

  // ------------------------------------------------------------------
  // 6. 變更顏色
  // ------------------------------------------------------------------
  const handleColorChange = useCallback((layerId, color) => {
    if (!engine) return
    engine.setLayerColor(layerId, color)
  }, [engine])

  // ------------------------------------------------------------------
  // 渲染
  // ------------------------------------------------------------------
  if (!engine) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>圖層</div>
        <div style={{ padding: '12px', color: '#6c7086', fontSize: '12px' }}>
          引擎尚未初始化
        </div>
      </div>
    )
  }

  return (
    <div style={styles.panel}>
      {/* 標題列 */}
      <div style={styles.header}>
        <span>圖層</span>
        <button
          style={styles.addBtn}
          onClick={handleAddLayer}
          title="新增圖層"
        >
          +
        </button>
      </div>

      {/* 圖層列表 */}
      <div style={styles.list}>
        {layers.map((layer, index) => {
          const isActive = activeLayer === layer.id
          const isLast = layers.length <= 1

          return (
            <div
              key={layer.id}
              style={{
                ...styles.layerItem,
                backgroundColor: isActive ? 'rgba(137, 180, 250, 0.15)' : 'transparent',
                borderLeft: isActive ? '3px solid #89b4fa' : '3px solid transparent',
                opacity: layer.visible ? 1 : 0.45,
              }}
              onClick={() => handleSelectLayer(layer.id)}
            >
              {/* 可見性切換 */}
              <span
                style={styles.iconBtn}
                onClick={(e) => { e.stopPropagation(); handleToggleVisible(layer.id, layer.visible) }}
                title={layer.visible ? '隱藏圖層' : '顯示圖層'}
              >
                {layer.visible ? '👁' : '👁‍🗨'}
              </span>

              {/* 鎖定切換 */}
              <span
                style={{
                  ...styles.iconBtn,
                  color: layer.locked ? '#f9e2af' : '#6c7086',
                }}
                onClick={(e) => { e.stopPropagation(); handleToggleLocked(layer.id, layer.locked) }}
                title={layer.locked ? '解鎖圖層' : '鎖定圖層'}
              >
                {layer.locked ? '🔒' : '🔓'}
              </span>

              {/* 顏色色塊 */}
              <input
                type="color"
                value={layer.color}
                onChange={(e) => { e.stopPropagation(); handleColorChange(layer.id, e.target.value) }}
                onClick={(e) => e.stopPropagation()}
                style={styles.colorPicker}
                title="變更圖層顏色"
              />

              {/* 圖層名稱 */}
              <span style={styles.layerName} title={layer.name}>
                {layer.name}
                {layer.id === '0' && <span style={styles.defaultBadge}>預設</span>}
              </span>

              {/* 刪除按鈕（保留至少一層） */}
              {!isLast && (
                <span
                  style={styles.deleteBtn}
                  onClick={(e) => { e.stopPropagation(); handleDeleteLayer(layer.id) }}
                  title="刪除圖層"
                >
                  ✕
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* 底部資訊 */}
      <div style={styles.footer}>
        {layers.length} 個圖層
      </div>
    </div>
  )
}

// ====================================================================
// 樣式
// ====================================================================
const styles = {
  panel: {
    width: '220px',
    backgroundColor: '#181825',
    borderLeft: '1px solid #313244',
    display: 'flex',
    flexDirection: 'column',
    fontSize: '13px',
    color: '#cdd6f4',
    userSelect: 'none',
    minHeight: 0,
    flexShrink: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    fontWeight: 600,
    fontSize: '14px',
    borderBottom: '1px solid #313244',
  },
  addBtn: {
    backgroundColor: '#a6e3a1',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: '4px',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '16px',
    lineHeight: '24px',
    textAlign: 'center',
    padding: 0,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 0',
  },
  layerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 8px',
    cursor: 'pointer',
    margin: '1px 4px',
    borderRadius: '0 4px 4px 0',
    transition: 'background-color 0.15s',
  },
  iconBtn: {
    cursor: 'pointer',
    fontSize: '12px',
    width: '18px',
    textAlign: 'center',
    flexShrink: 0,
  },
  colorPicker: {
    width: '14px',
    height: '14px',
    border: '1px solid #45475a',
    borderRadius: '3px',
    padding: 0,
    cursor: 'pointer',
    flexShrink: 0,
  },
  layerName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '12px',
    marginLeft: '2px',
  },
  defaultBadge: {
    marginLeft: '4px',
    fontSize: '10px',
    color: '#6c7086',
  },
  deleteBtn: {
    cursor: 'pointer',
    color: '#f38ba8',
    fontSize: '12px',
    width: '16px',
    textAlign: 'center',
    flexShrink: 0,
    opacity: 0.7,
  },
  footer: {
    padding: '6px 12px',
    borderTop: '1px solid #313244',
    fontSize: '11px',
    color: '#6c7086',
  },
}
