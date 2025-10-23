// backend/websocket-server.js
import { WebSocketServer } from 'ws'

// 포트 설정
const PORT = 8080
const wss = new WebSocketServer({ port: PORT })
console.log(` WebSocket Server running on ws://localhost:${PORT}`)

// 연결된 클라이언트 목록
const clients = new Set()

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress
  console.log(`🔗 Client connected: ${ip}`)
  clients.add(ws)

  ws.on('message', (msg) => {
    const data = msg.toString()
    console.log(`📩 Received: ${data}`)
    // 모든 클라이언트에 브로드캐스트
    for (const client of clients) {
      if (client.readyState === 1) {
        client.send(`[${ip}] ${data}`)
      }
    }
  })

  ws.on('close', () => {
    console.log(`❌ Client disconnected: ${ip}`)
    clients.delete(ws)
  })
})
