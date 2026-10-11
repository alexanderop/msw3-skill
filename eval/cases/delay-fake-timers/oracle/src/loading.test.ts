import { delay, http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { loadWithStatus } from './api.ts'

const server = setupServer(
  http.get('https://api.example.com/todos', async () => {
    await delay(2000)
    return HttpResponse.json([])
  }),
)

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => vi.useRealTimers())
afterAll(() => server.close())

it('reports loading, then done', async () => {
  vi.useFakeTimers()
  const statuses: Array<string> = []
  const pending = loadWithStatus((status) => statuses.push(status))

  await vi.advanceTimersByTimeAsync(1000)
  expect(statuses).toEqual(['loading'])

  await vi.advanceTimersByTimeAsync(1000)
  await pending
  expect(statuses).toEqual(['loading', 'done'])
})
