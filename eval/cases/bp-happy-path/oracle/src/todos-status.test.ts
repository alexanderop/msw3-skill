import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest'
import { loadWithStatus } from './api.ts'
import { server } from './mocks/node.ts'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it('ends with done on success', async () => {
  const statuses: Array<string> = []
  await loadWithStatus((status) => statuses.push(status))
  expect(statuses).toEqual(['loading', 'done'])
})

it('ends with error when the server fails', async () => {
  server.use(http.get('https://api.example.com/todos', () => new HttpResponse(null, { status: 500 })))
  const statuses: Array<string> = []
  await expect(loadWithStatus((status) => statuses.push(status))).rejects.toThrow()
  expect(statuses).toEqual(['loading', 'error'])
})
