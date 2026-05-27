import React, { useRef, useState } from 'react'
import { fileApi } from '../../services/api'

export default function FileMenu({ engine }) {
  const fileInputRef = useRef(null)
  const dxfInputRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [status, setStatus] = useState(null)

  const showStatus = (msg, isError = false) => {
    setStatus({ msg, isError })
    setTimeout(() => setStatus(null), 3000)
  }

  const handleSaveJSON = () => {
    if (!engine) return
    try {
      const json = engine.exportJSON()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `drawing_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showStatus('JSON 已儲存')

      fileApi.save(`drawing_${Date.now()}.json`, JSON.parse(json)).catch(() => {})
    } catch (e) {
      showStatus('儲存失敗: ' + e.message, true)
    }
    setMenuOpen(false)
  }

  const handleLoadJSON = () => {
    fileInputRef.current?.click()
    setMenuOpen(false)
  }

  const onJSONFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !engine) return

    try {
      const text = await file.text()
      const success = engine.importJSON(text)
      if (success) {
        engine.render()
        showStatus(`JSON 已載入 (${file.name})`)
      } else {
        showStatus('JSON 格式錯誤', true)
      }
    } catch (e) {
      showStatus('載入失敗: ' + e.message, true)
    }
    e.target.value = ''
  }

  const handleImportDXF = () => {
    dxfInputRef.current?.click()
    setMenuOpen(false)
  }

  const onDXFFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !engine) return

    try {
      const result = await fileApi.importDXF(file)
      if (result && result.entities) {
        result.entities.forEach(entity => engine.addEntity(entity))
        engine.render()
        showStatus(`DXF 已匯入 (${result.entities.length} 個圖元)`)
      }
    } catch (e) {
      showStatus('DXF 匯入失敗: ' + e.message, true)
    }
    e.target.value = ''
  }

  const handleExportDXF = () => {
    if (!engine) return
    try {
      const dxf = engine.exportDXF()
      const blob = new Blob([dxf], { type: 'application/dxf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `drawing_${new Date().toISOString().slice(0, 10)}.dxf`
      a.click()
      URL.revokeObjectURL(url)
      showStatus('DXF 已匯出')
    } catch (e) {
      showStatus('DXF 匯出失敗: ' + e.message, true)
    }
    setMenuOpen(false)
  }

  const handleNew = () => {
    if (!engine) return
    if (engine.getEntities().length > 0) {
      if (!confirm('清除所有圖元？未儲存的更改將丟失。')) return
    }
    engine.clear()
    engine.render()
    showStatus('已建立新畫布')
    setMenuOpen(false)
  }

  const menuItems = [
    { label: '新畫布', shortcut: 'Ctrl+N', action: handleNew },
    { label: '儲存 JSON', shortcut: 'Ctrl+S', action: handleSaveJSON },
    { label: '載入 JSON', shortcut: 'Ctrl+O', action: handleLoadJSON },
    { label: '匯入 DXF', shortcut: '', action: handleImportDXF },
    { label: '匯出 DXF', shortcut: 'Ctrl+E', action: handleExportDXF },
  ]

  return (
    <div style={{ position: 'relative' }}>
      <button
        style={styles.menuBtn}
        onClick={() => setMenuOpen(!menuOpen)}
        title="檔案選單"
      >
        ☰
      </button>

      {menuOpen && (
        <>
          <div style={styles.overlay} onClick={() => setMenuOpen(false)} />
          <div style={styles.dropdown}>
            {menuItems.map((item, i) => (
              <div key={i} style={styles.menuItem} onClick={item.action}>
                <span>{item.label}</span>
                {item.shortcut && <span style={styles.shortcut}>{item.shortcut}</span>}
              </div>
            ))}
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={onJSONFileChange}
      />
      <input
        ref={dxfInputRef}
        type="file"
        accept=".dxf"
        style={{ display: 'none' }}
        onChange={onDXFFileChange}
      />

      {status && (
        <div style={{
          ...styles.status,
          color: status.isError ? '#f38ba8' : '#a6e3a1',
        }}>
          {status.msg}
        </div>
      )}
    </div>
  )
}

const styles = {
  menuBtn: {
    backgroundColor: 'transparent',
    color: '#cdd6f4',
    border: '1px solid #45475a',
    borderRadius: '6px',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: 1,
  },
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    backgroundColor: '#181825',
    border: '1px solid #313244',
    borderRadius: '8px',
    minWidth: '180px',
    zIndex: 1000,
    padding: '4px',
    marginTop: '4px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  },
  menuItem: {
    padding: '8px 12px',
    cursor: 'pointer',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#cdd6f4',
  },
  shortcut: {
    color: '#6c7086',
    fontSize: '11px',
  },
  status: {
    position: 'fixed',
    bottom: '48px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#181825',
    border: '1px solid #313244',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '13px',
    zIndex: 1001,
    whiteSpace: 'nowrap',
  },
}
