import React, { useState, useEffect } from 'react'

export default function PropertyPanel({ engine }) {
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    if (!engine) return
    const handler = (entity) => { setSelected(entity); setEditing(null) }
    const cleanup = engine.on('select', handler)
    const cleanup2 = engine.on('modified', () => {
      setSelected(engine.getSelected())
    })
    return () => { cleanup(); cleanup2() }
  }, [engine])

  const startEdit = (key, value) => {
    if (key.startsWith('__')) return
    setEditing(key)
    setEditValue(String(value))
  }

  const commitEdit = () => {
    if (!selected || editing === null) return
    const id = selected.id
    const val = parseFloat(editValue)
    if (editing === 'text') {
      engine.updateEntity(id, { text: editValue })
    } else if (editing === 'layer') {
      engine.updateEntity(id, { layer: editValue })
    } else if (!isNaN(val)) {
      const path = editing.split('.')
      const props = {}
      if (path.length === 1) {
        props[path[0]] = val
      } else {
        const nested = {}
        nested[path[1]] = val
        props[path[0]] = { ...((selected.geometry || selected)[path[0]] || {}), ...nested }
      }
      engine.updateEntity(id, props)
    }
    setEditing(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitEdit()
    else if (e.key === 'Escape') setEditing(null)
    e.stopPropagation()
  }

  if (!selected) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>屬性</div>
        <div style={styles.empty}>未選取圖元</div>
      </div>
    )
  }

  const geometry = selected.geometry || selected

  const getProperties = () => {
    const props = [
      { key: '__id', label: 'ID', value: selected.id, editable: false },
      { key: '__type', label: '類型', value: selected.type, editable: false },
      { key: 'layer', label: '圖層', value: selected.layer || '0', editable: true },
      { key: '__color', label: '顏色', value: selected.color, editable: false },
    ]
    switch (selected.type) {
      case 'LINE':
        props.push(
          { key: 'x1', label: '起點 X', value: Math.round(geometry.x1), editable: true },
          { key: 'y1', label: '起點 Y', value: Math.round(geometry.y1), editable: true },
          { key: 'x2', label: '終點 X', value: Math.round(geometry.x2), editable: true },
          { key: 'y2', label: '終點 Y', value: Math.round(geometry.y2), editable: true },
        )
        break
      case 'CIRCLE':
        props.push(
          { key: 'cx', label: '圓心 X', value: Math.round(geometry.cx), editable: true },
          { key: 'cy', label: '圓心 Y', value: Math.round(geometry.cy), editable: true },
          { key: 'radius', label: '半徑', value: Math.round(geometry.radius ?? geometry.r), editable: true },
        )
        break
      case 'ARC':
        props.push(
          { key: 'cx', label: '圓心 X', value: Math.round(geometry.cx), editable: true },
          { key: 'cy', label: '圓心 Y', value: Math.round(geometry.cy), editable: true },
          { key: 'radius', label: '半徑', value: Math.round(geometry.radius ?? geometry.r), editable: true },
          { key: 'startAngle', label: '起始角(°)', value: Math.round(geometry.startAngle * 180 / Math.PI), editable: true },
          { key: 'endAngle', label: '結束角(°)', value: Math.round(geometry.endAngle * 180 / Math.PI), editable: true },
        )
        break
      case 'POLYGON':
        props.push(
          { key: '__verts', label: '頂點數', value: geometry.vertices?.length || 0, editable: false },
        )
        break
      case 'TEXT':
        props.push(
          { key: 'x', label: '位置 X', value: Math.round(geometry.x), editable: true },
          { key: 'y', label: '位置 Y', value: Math.round(geometry.y), editable: true },
          { key: 'text', label: '文字', value: geometry.text, editable: true },
          { key: 'fontSize', label: '大小', value: geometry.fontSize || 16, editable: true },
        )
        break
      case 'DIMENSION':
        props.push({ key: '__dimType', label: '標註類型', value: geometry.dimType === 'linear' ? '線性' : geometry.dimType === 'radius' ? '半徑' : '角度', editable: false })
        break
    }
    return props
  }

  const renderValue = (p) => {
    if (!p.editable) {
      return <span style={styles.value}>{String(p.value)}</span>
    }
    if (editing === p.key) {
      return (
        <input
          style={styles.input}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      )
    }
    return (
      <span style={{ ...styles.value, cursor: 'pointer' }} onClick={() => startEdit(p.key, p.value)}>
        {String(p.value)}
      </span>
    )
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>屬性</div>
      <div style={styles.content}>
        {getProperties().map((p, i) => (
          <div key={i} style={styles.row}>
            <span style={styles.label}>{p.label}</span>
            {renderValue(p)}
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  panel: {
    width: '200px',
    backgroundColor: '#181825',
    borderLeft: '1px solid #313244',
    fontSize: '13px',
    color: '#cdd6f4',
    userSelect: 'none',
    overflow: 'hidden',
  },
  header: {
    padding: '12px',
    fontWeight: 600,
    borderBottom: '1px solid #313244',
    fontSize: '14px',
  },
  empty: {
    padding: '24px 12px',
    textAlign: 'center',
    color: '#6c7086',
    fontSize: '12px',
  },
  content: {
    padding: '8px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  label: {
    color: '#6c7086',
  },
  value: {
    color: '#cdd6f4',
    fontWeight: 500,
    textAlign: 'right',
    maxWidth: '100px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  input: {
    width: '80px',
    backgroundColor: '#313244',
    border: '1px solid #89b4fa',
    borderRadius: '3px',
    color: '#cdd6f4',
    fontSize: '11px',
    padding: '2px 4px',
    textAlign: 'right',
    outline: 'none',
  },
}
