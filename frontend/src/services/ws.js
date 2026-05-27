class WSClient {
  constructor() {
    this.ws = null
    this.listeners = {}
    this.reconnectTimer = null
    this.reconnectDelay = 1000
    this.maxReconnectDelay = 30000
    this.connected = false
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws`

    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      this.connected = true
      this.reconnectDelay = 1000
      this.emit('connected')
    }

    this.ws.onclose = () => {
      this.connected = false
      this.emit('disconnected')
      this.scheduleReconnect()
    }

    this.ws.onerror = (err) => {
      this.emit('error', err)
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        this.emit(msg.type, msg.data)
        this.emit('message', msg)
      } catch (e) {
        console.warn('WS parse error:', e)
      }
    }
  }

  disconnect() {
    clearTimeout(this.reconnectTimer)
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connected = false
  }

  send(type, data = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WS not connected')
      return false
    }
    this.ws.send(JSON.stringify({ type, data }))
    return true
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(callback)
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback)
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data))
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
      this.connect()
    }, this.reconnectDelay)
  }

  sendLLMCommand(text) {
    return this.send('llm', { text })
  }
}

const wsClient = new WSClient()
export default wsClient
export { WSClient }
