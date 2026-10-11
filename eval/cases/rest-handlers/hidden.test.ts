import { setupServer } from 'msw/node'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { createTodo, getUser, listTodos } from '../api.ts'
import { handlers } from '../mocks/handlers.ts'

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

it('mocks users, todos and todo creation', async () => {
  expect(await getUser('42')).toEqual({ id: '42', name: 'User 42' })
  expect(await listTodos()).toHaveLength(2)
  expect(await createTodo('write evals')).toEqual({ id: 3, title: 'write evals', done: false })
})
