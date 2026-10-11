import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { collectUnhandledRequests } from '../mocks/unhandled.ts'

const server = setupServer(http.get('https://api.example.com/todos', () => HttpResponse.json([])))
const unhandled = collectUnhandledRequests(server)
beforeAll(() => server.listen({ onUnhandledFrame: () => {} }))
afterAll(() => server.close())

it('records only unhandled requests', async () => {
  await fetch('https://api.example.com/todos')
  await fetch('http://127.0.0.1:59999/nope', { method: 'DELETE' }).catch(() => {})
  expect(unhandled).toEqual(['DELETE http://127.0.0.1:59999/nope'])
})
