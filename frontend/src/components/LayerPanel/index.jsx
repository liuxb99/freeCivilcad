import React, { useState, useEffect, useCallback } from 'react'
import { layerApi } from '../../services/api'

const DEFAULT_LAYER = { id: '0', name: 'Default', color: '#ffffff', visible: true, locked: false }

export default function LayerPanel({ engine }) {
  const [layers, setLayers] = useState([DEFAULT_LAYER])
  const [activeLayer, setActiveLayer] = useState('0')
  const [newLayerName, setNewLayerName] = useState('')

  useEffect(() => {
    if (engine) {
      engine.setActiveLayer('0')
      engine.setLayerVisible('0', true)
      engine.setLayerColor('0', '#ffffff')
    }
  }, [engine])

  const handleSelectLayer = useCallback((layerId) => {
    setActiveLayer(layerId)
    if (engine) engine.setActiveLayer(layerId)
  }, [engine])

  const handleToggleVisible = useCallback((layerId, currentVisible) => {
    const newVisible = !currentVisible
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, visible: newVisible } : l))
    if (engine) engine.setLayerVisible(layerId, newVisible)
    layerApi.update(layerId, { visible: newVisible }).catch(() => {})
  }, [engine])

  const handleAddLayer = useCallback(async () => {
    const name = newLayerName.trim() || `Layer ${layers.length}`
    const colors = ['#f38ba8', '#a6e3a1', '#89b4fa', '#f9e2af', '#fab387', '#cba6f7', '#94e2d5']
    const color = colors[layers.length % colors.length]
    try {
      const newLayer = await layerApi.create(name, color)
      setLayers(prev => [...prev, { id: String(newLayer.id), name, color, visible: true, locked: false }])
      setNewLayerName('')
    } catch (e) {
      const tempId = String(Date.now())
      setLayers(prev => [...prev, { id: tempId, name, color, visible: true, locked: false }])
      setNewLayerName('')
    }
  }, [layers.length, newLayerName])

  const handleDeleteLayer = useCallback(async (layerId) => {
    if (layerId === '0') return
    try {
      await layerApi.delete(layerId)
      setLayers(prev => prev.filter(l => l.id !== layerId))
      if (activeLayer === layerId) handleSelectLayer('0')
    } catch (e) {
      console.warn('Delete layer failed:', e)
    }
  }, [activeLayer, handleSelectLayer])

  const handleColorChange = useCallback(async (layerId, color) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, color } : l))
    if (engine) engine.setLayerColor(layerId, color)
    layerApi.update(layerId, { color }).catch(() => {})
  }, [engine])

  return (
    <div style={styles.panel}>
      <div style={styles.header}>圖層</div>
      <div style={styles.addRow}>
        <input
          style={styles.input}
          placeholder="新圖層名稱"
          value={newLayerName}
          onChange={e => setNewLayerName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddLayer()}
        />
        <button style={styles.addBtn} onClick={handleAddLayer}>+</button>
      </div>
      <div style={styles.list}>
        {layers.map(layer => (
          <div
            key={layer.id}
            style={{
              ...styles.layerItem,
              backgroundColor: activeLayer === layer.id ? 'rgba(255,255,255,0.1)' : 'transparent',
            }}
            onClick={() => handleSelectLayer(layer.id)}
          >
            <span
              style={{ ...styles.eyeIcon, opacity: layer.visible ? 1 : 0.3 }}
              onClick={(e) => { e.stopPropagation(); handleToggleVisible(layer.id, layer.visible) }}
            >
              {layer.visible ? '👁' : '👁‍🗨'}
            </span>
            <input
              type="color"
              value={layer.color}
              onChange={(e) => { e.stopPropagation(); handleColorChange(layer.id, e.target.value) }}
              style={{ ...styles.colorPicker, backgroundColor: layer.color }}
              onClick={e => e.stopPropagation()}
            />
            <span style={styles.layerName}>
              {layer.name}
              {layer.id === '0' && <span style={styles.defaultBadge}>預設</span>}
            </span>
            {layer.id !== '0' && (
              <span
                style={styles.deleteBtn}
                onClick={(e) => { e.stopPropagation(); handleDeleteLayer(layer.id) }}
              >✕</span>
            )}
          </div>
        ))}
      </div>
      <div style={styles.footer}>
        {layers.length} 個圖層
      </div>
    </div>
  )
}

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
  },
  header: {
    padding: '12px',
    fontWeight: 600,
    borderBottom: '1px solid #313244',
    fontSize: '14px',
  },
  addRow: {
    display: 'flex',
    padding: '8px',
    gap: '4px',
    borderBottom: '1px solid #313244',
  },
  input: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    border: '1px solid #45475a',
    borderRadius: '4px',
    padding: '4px 8px',
    color: '#cdd6f4',
    fontSize: '12px',
    outline: 'none',
  },
  addBtn: {
    backgroundColor: '#a6e3a1',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: '4px',
    width: '26px',
    height: '26px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '16px',
    lineHeight: '26px',
    textAlign: 'center',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
  },
  layerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 8px',
    cursor: 'pointer',
    borderRadius: '4px',
    margin: '2px 4px',
  },
  eyeIcon: {
    cursor: 'pointer',
    fontSize: '14px',
    width: '20px',
    textAlign: 'center',
  },
  colorPicker: {
    width: '16px',
    height: '16px',
    border: '1px solid #45475a',
    borderRadius: '3px',
    padding: 0,
    cursor: 'pointer',
  },
  layerName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
  },
  footer: {
    padding: '8px 12px',
    borderTop: '1px solid #313244',
    fontSize: '11px',
    color: '#6c7086',
  },
}
