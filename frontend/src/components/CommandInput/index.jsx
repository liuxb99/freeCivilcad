import React, { useState, useRef, useEffect } from 'react'
import { useCommand } from '../../hooks/useCommand'

const suggestions = [
  { cmd: 'LINE', desc: '畫一條線從 x1,y1 到 x2,y2' },
  { cmd: 'CIRCLE', desc: '畫一個圓心 cx,cy 半徑 r' },
  { cmd: 'ARC', desc: '畫一條弧' },
  { cmd: 'RECTANGLE', desc: '畫一個矩形' },
  { cmd: 'POLYGON', desc: '畫多邊形' },
  { cmd: 'DELETE', desc: '刪除選取圖元或 id' },
  { cmd: 'MOVE', desc: '移動 dx,dy' },
  { cmd: 'SELECT', desc: '選取 x,y 位置的圖元' },
  { cmd: 'CLEAR', desc: '清除所有圖元' },
  { cmd: 'UNDO', desc: '復原上一步' },
  { cmd: 'REDO', desc: '重做一步' },
]

export default function CommandInput({ engine, onResult }) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState([])
  const [history, setHistory] = useState([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const inputRef = useRef(null)
  const command = useCommand(engine)

  const handleSubmit = async () => {
    const text = input.trim()
    if (!text) return

    setHistory(prev => [...prev, text])
    setHistoryIdx(prev => prev + 1)

    let newResult
    if (text.toUpperCase() === 'UNDO') {
      if (engine) { engine.undo(); engine.render() }
      newResult = { text, status: 'success', message: '已復原' }
    } else if (text.toUpperCase() === 'REDO') {
      if (engine) { engine.redo(); engine.render() }
      newResult = { text, status: 'success', message: '已重做' }
    } else if (text.toUpperCase() === 'CLEAR' || text.toUpperCase() === '清除') {
      if (engine) { engine.clear(); engine.render() }
      newResult = { text, status: 'success', message: '已清除所有圖元' }
    } else {
      const res = await command.parseAndExecute(text)
      newResult = { text, status: res.success ? 'success' : 'error', message: res.error || `已執行 ${res.data?.length || 0} 個命令` }
    }

    setResult(newResult)
    setInput('')
    setShowSuggestions(false)
    if (onResult) onResult(newResult)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
    else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0) {
        const idx = Math.max(0, historyIdx - 1)
        setHistoryIdx(idx)
        setInput(history[history.length - 1 - idx] || '')
      }
    }
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIdx > 0) {
        const idx = historyIdx - 1
        setHistoryIdx(idx)
        setInput(history[history.length - 1 - idx] || '')
      } else {
        setHistoryIdx(-1)
        setInput('')
      }
    }
    else if (e.key === 'Escape') setShowSuggestions(false)
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    setInput(val)
    if (val.length > 0) {
      setFilteredSuggestions(suggestions.filter(s =>
        s.cmd.toLowerCase().startsWith(val.toLowerCase()) || s.desc.includes(val)
      ))
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.inputRow}>
        <span style={styles.prompt}>⌘</span>
        <input
          ref={inputRef}
          style={styles.input}
          placeholder="輸入自然語言 CAD 指令，例如「畫一條從 0,0 到 100,50 的線」"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => input && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        <button style={styles.sendBtn} onClick={handleSubmit} disabled={!input.trim()}>↵</button>
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div style={styles.suggestions}>
          {filteredSuggestions.map(s => (
            <div
              key={s.cmd}
              style={styles.suggestionItem}
              onMouseDown={() => { setInput(s.cmd + ' '); inputRef.current?.focus() }}
            >
              <span style={styles.suggestionCmd}>{s.cmd}</span>
              <span style={styles.suggestionDesc}>{s.desc}</span>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div style={{
          ...styles.result,
          color: result.status === 'success' ? '#a6e3a1' : '#f38ba8'
        }}>
          {result.message}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    position: 'relative',
    borderTop: '1px solid #313244',
    backgroundColor: '#1e1e2e',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px',
    gap: '8px',
  },
  prompt: {
    color: '#6c7086',
    fontSize: '16px',
  },
  input: {
    flex: 1,
    backgroundColor: '#181825',
    border: '1px solid #45475a',
    borderRadius: '6px',
    padding: '8px 12px',
    color: '#cdd6f4',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  sendBtn: {
    backgroundColor: '#89b4fa',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: '4px',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  suggestions: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#181825',
    border: '1px solid #313244',
    borderBottom: 'none',
    borderRadius: '6px 6px 0 0',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  suggestionItem: {
    padding: '6px 12px',
    cursor: 'pointer',
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
  },
  suggestionCmd: {
    color: '#89b4fa',
    fontWeight: 600,
    minWidth: '60px',
  },
  suggestionDesc: {
    color: '#6c7086',
  },
  result: {
    padding: '4px 12px 8px',
    fontSize: '12px',
  },
}
