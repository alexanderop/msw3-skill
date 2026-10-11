import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest'
import { listTodos } from './api.ts'

const server = setupServer(
  http.get('https://api.example.com/todos', () => HttpResponse.json([{ id: 1, title: 'a', done: false }])),
)

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it('loads todos', async () => {
  expect(await listTodos()).toHaveLength(1)
})

it('throws on a server error', async () => {
  server.use(http.get('https://api.example.com/todos', () => new HttpResponse(null, { status: 500 })))
  await expect(listTodos()).rejects.toThrow('500')
})
