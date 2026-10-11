import { ws } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { trackWebSocketConnections } from '../mocks/ws-tracking.ts'

const chat = ws.link('wss://chat.example.com')
const server = setupServer(chat.addEventListener('connection', () => {}))
const urls = trackWebSocketConnections(server)

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

it('records intercepted WebSocket connections', async () => {
  const socket = new WebSocket('wss://chat.example.com')
  await new Promise((resolve, reject) => {
    socket.onopen = resolve
    socket.onerror = reject
  })
  socket.close()
  expect(urls.some((url) => url.startsWith('wss://chat.example.com'))).toBe(true)
})
