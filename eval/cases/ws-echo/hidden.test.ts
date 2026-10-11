import { setupServer } from 'msw/node'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { chatHandlers } from '../mocks/chat.ts'

const server = setupServer(...chatHandlers)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

it('echoes client messages', async () => {
  const socket = new WebSocket('wss://chat.example.com')
  const reply = new Promise<string>((resolve) => {
    socket.onmessage = (event) => resolve(String(event.data))
  })
  socket.onopen = () => socket.send('hi')
  expect(await reply).toBe('echo:hi')
  socket.close()
})
