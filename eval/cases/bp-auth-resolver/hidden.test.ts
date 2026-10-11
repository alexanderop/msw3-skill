import { setupServer } from 'msw/node'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { todoHandlers } from '../mocks/todos.ts'

const server = setupServer(...todoHandlers)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

const auth = { Authorization: 'Bearer test-token' }

it('requires the token on both endpoints', async () => {
  expect((await fetch('https://api.example.com/todos')).status).toBe(401)
  expect((await fetch('https://api.example.com/todos', { method: 'POST', body: '{}' })).status).toBe(401)
  expect((await fetch('https://api.example.com/todos', { headers: { Authorization: 'Bearer nope' } })).status).toBe(401)
})

it('serves authorized requests', async () => {
  expect(await (await fetch('https://api.example.com/todos', { headers: auth })).json()).toEqual([])
  const created = await fetch('https://api.example.com/todos', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'x' }),
  })
  expect(created.status).toBe(201)
  expect(await created.json()).toEqual({ id: 1, title: 'x', done: false })
})
