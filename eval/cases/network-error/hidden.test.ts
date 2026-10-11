import { setupServer } from 'msw/node'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { offlineHandlers } from '../mocks/offline.ts'

const server = setupServer(...offlineHandlers)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

it('fails with a network error', async () => {
  await expect(fetch('https://api.example.com/todos')).rejects.toThrow(TypeError)
})
