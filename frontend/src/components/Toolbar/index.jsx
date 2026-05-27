import React from 'react'

const drawingTools = [
  { id: 'SELECT', label: '↖', title: '選取 (V)' },
  { id: 'HAND', label: '✋', title: '平移 (H)' },
  { id: 'LINE', label: '╱', title: '直線 (L)' },
  { id: 'CIRCLE', label: '○', title: '圓 (C)' },
  { id: 'ARC', label: '⌒', title: '弧 (A)' },
  { id: 'POLYGON', label: '⬠', title: '多邊形 (P)' },
  { id: 'RECT', label: '▭', title: '矩形 (R)' },
  { id: 'TEXT', label: 'T', title: '文字 (T)' },
  { id: 'DIM', label: '📏', title: '尺寸標註 (D)' },
]

const editTools = [
  { id: 'COPY', label: '⊞', title: '複製 (X)' },
  { id: 'MIRROR', label: '⇔', title: '鏡射 (M)' },
]

const actions = [
  { id: 'UNDO', label: '↩', title: '復原 Ctrl+Z' },
  { id: 'REDO', label: '↪', title: '重做 Ctrl+Y' },
  { id: 'DELETE', label: '✕', title: '刪除 Delete' },
  { id: 'FIT', label: '⊡', title: '適合畫面' },
]

export default function Toolbar({ activeTool, onToolChange, onAction, engine }) {
  return (
    <div style={styles.toolbar}>
      <div style={styles.group}>
        {drawingTools.map(t => (
          <button
            key={t.id}
            style={{
              ...styles.toolBtn,
              backgroundColor: activeTool === t.id ? 'rgba(137,180,250,0.2)' : 'transparent',
              color: activeTool === t.id ? '#89b4fa' : '#cdd6f4',
              borderColor: activeTool === t.id ? '#89b4fa' : 'transparent',
            }}
            onClick={() => onToolChange(t.id)}
            title={t.title}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={styles.divider} />

      <div style={styles.group}>
        {editTools.map(t => (
          <button
            key={t.id}
            style={{
              ...styles.toolBtn,
              backgroundColor: activeTool === t.id ? 'rgba(249,226,175,0.2)' : 'transparent',
              color: activeTool === t.id ? '#f9e2af' : '#cdd6f4',
              borderColor: activeTool === t.id ? '#f9e2af' : 'transparent',
            }}
            onClick={() => onToolChange(t.id)}
            title={t.title}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={styles.group}>
        {actions.map(a => (
          <button
            key={a.id}
            style={styles.toolBtn}
            onClick={() => onAction(a.id)}
            title={a.title}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div style={styles.logo}>
        FreeCivilCAD
      </div>
    </div>
  )
}

const styles = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    backgroundColor: '#181825',
    borderBottom: '1px solid #313244',
    userSelect: 'none',
  },
  group: {
    display: 'flex',
    gap: '2px',
  },
  toolBtn: {
    width: '34px',
    height: '34px',
    border: '1px solid transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#cdd6f4',
    backgroundColor: 'transparent',
    transition: 'all 0.15s',
  },
  divider: {
    width: '1px',
    height: '24px',
    backgroundColor: '#313244',
    margin: '0 6px',
  },
  logo: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#6c7086',
    letterSpacing: '1px',
  },
}
