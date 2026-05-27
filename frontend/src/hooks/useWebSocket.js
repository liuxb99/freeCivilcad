import { useEffect, useState, useCallback } from 'react'
import wsClient from '../services/ws'

export function useWebSocket() {
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)

  useEffect(() => {
    wsClient.connect()

    const unsub1 = wsClient.on('connected', () => setConnected(true))
    const unsub2 = wsClient.on('disconnected', () => setConnected(false))
    const unsub3 = wsClient.on('message', (msg) => setLastMessage(msg))

    return () => {
      unsub1(); unsub2(); unsub3()
    }
  }, [])

  const send = useCallback((type, data) => wsClient.send(type, data), [])

  return { connected, lastMessage, send, wsClient }
}
