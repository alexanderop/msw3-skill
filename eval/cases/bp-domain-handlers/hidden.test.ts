import { setupServer } from 'msw/node'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { createTodo, getMe, getUser, listTodos } from '../api.ts'
import { fetchUser, renameUser } from '../graphql-client.ts'
import { handlers } from '../mocks/index.ts'

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

it('mocks the whole API', async () => {
  expect(await getUser('5')).toEqual({ id: '5', name: 'User 5' })
  expect(await listTodos()).toHaveLength(2)
  expect(await createTodo('x')).toEqual({ id: 3, title: 'x', done: false })
  expect((await getMe('abc')).status).toBe(200)
  expect((await getMe()).status).toBe(401)
  expect(await fetchUser('9')).toEqual({ id: '9', name: 'Ada Lovelace' })
  expect(await renameUser('9', 'Grace')).toEqual({ id: '9', name: 'Grace' })
})
