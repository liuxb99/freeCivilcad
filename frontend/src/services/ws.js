/**
 * WebSocket 客戶端 → REST Polling 版本
 *
 * 在 Vercel 環境中無法使用 WebSocket（無長連線支援）。
 * 此類別保留與原始 WSClient 相同的 API 介面（connect、disconnect、
 * send、on、emit、sendLLMCommand），但底層改用 HTTP polling + REST 呼叫。
 *
 * 本地開發時若使用 uvicorn，WebSocket 仍可正常運作；
 * 前端使用此 polling 版本時，不會影響後端既有的 WebSocket 端點。
 */

const POLL_INTERVAL = 5000  // 每 5 秒 polling 一次

class WSClient {
  constructor() {
    this.listeners = {}
    this.pollTimer = null
    this.connected = false
    this._pollInterval = POLL_INTERVAL
  }

  /**
   * 開始 polling（取代 WebSocket connect）
   * 每 _pollInterval 毫秒檢查 /api/ws/status（或 /api/health）
   */
  connect() {
    if (this.pollTimer) return
    this._doPoll()
    this.pollTimer = setInterval(() => this._doPoll(), this._pollInterval)
  }

  disconnect() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    if (this.connected) {
      this.connected = false
      this.emit('disconnected')
    }
  }

  /**
   * 傳送訊息（取代 WebSocket send）
   * 支援的 type：
   *   - 'llm' → POST /api/llm/parse
   *   - 其餘型別透過對應的 REST API 處理
   */
  send(type, data = {}) {
    switch (type) {
      case 'llm': {
        const text = data.text || ''
        fetch('/api/llm/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, entities: [] }),
        })
          .then(r => r.json())
          .then(result => {
            if (result.success) {
              this.emit('llm_result', result.data)
              this.emit('message', { type: 'llm_result', data: result.data })
            } else {
              this.emit('error', { message: result.error || 'LLM 解析失敗' })
            }
          })
          .catch(err => {
            this.emit('error', { message: err.message })
          })
        return true
      }

      case 'broadcast':
        // REST 模式下不支援 broadcast，但忽略以保持相容
        console.warn('[WS] broadcast 在 REST polling 模式中不支援')
        return false

      default:
        console.warn(`[WS] 未知訊息類型: ${type}`)
        return false
    }
  }

  /** 註冊事件監聽 */
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(callback)
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback)
    }
  }

  /** 觸發事件 */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data))
    }
  }

  /** 傳送 LLM 指令（公開方法，相容原始 API） */
  sendLLMCommand(text) {
    return this.send('llm', { text })
  }

  // ─── 內部方法 ──────────────────────────────────────

  _doPoll() {
    fetch('/api/ws/status', { method: 'GET' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (!this.connected) {
          this.connected = true
          this.emit('connected')
        }
        // 若有 ws_clients 資訊，可選擇觸發事件
        if (data && typeof data.ws_clients !== 'undefined') {
          this.emit('clients', data.ws_clients)
        }
      })
      .catch(() => {
        if (this.connected) {
          this.connected = false
          this.emit('disconnected')
        }
      })
  }
}

const wsClient = new WSClient()
export default wsClient
export { WSClient }
