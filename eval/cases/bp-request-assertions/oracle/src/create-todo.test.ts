import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest'
import { createTodo, type Todo } from './api.ts'

const server = setupServer(
  http.post<never, { title?: string }, Todo | { error: string }>(
    'https://api.example.com/todos',
    async ({ request }) => {
      const { title } = await request.json()
      if (!title) {
        return HttpResponse.json({ error: 'title is required' }, { status: 400 })
      }
      return HttpResponse.json({ id: 1, title, done: false }, { status: 201 })
    },
  ),
)

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it('creates a todo with the given title', async () => {
  expect(await createTodo('write evals')).toEqual({ id: 1, title: 'write evals', done: false })
})
