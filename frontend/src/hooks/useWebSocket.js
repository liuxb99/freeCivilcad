import { useEffect, useState, useCallback } from 'react'
import wsClient from '../services/ws'

/**
 * useWebSocket hook — 同時支援 WebSocket 與 REST polling
 *
 * 在 Vercel 部署環境中（無 WebSocket 支援），ws.js 會自動降級為
 * REST polling（每 5 秒檢查 /api/ws/status）。
 * 前端開發（npm run dev + uvicorn）仍可使用 WebSocket。
 *
 * 回傳值：
 *   - connected: boolean — 與後端的連線狀態
 *   - lastMessage: any — 最後收到的訊息（用於觸發重新渲染）
 *   - send: (type, data) => boolean — 傳送訊息
 *   - wsClient: WSClient 實例
 */
export function useWebSocket() {
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)

  useEffect(() => {
    // 啟動連線（polling 或 WebSocket）
    wsClient.connect()

    const unsub1 = wsClient.on('connected', () => setConnected(true))
    const unsub2 = wsClient.on('disconnected', () => setConnected(false))
    const unsub3 = wsClient.on('message', (msg) => setLastMessage(msg))

    return () => {
      unsub1(); unsub2(); unsub3()
      wsClient.disconnect()
    }
  }, [])

  const send = useCallback((type, data) => wsClient.send(type, data), [])

  return { connected, lastMessage, send, wsClient }
}
