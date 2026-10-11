import { setupServer } from 'msw/node'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { listTodos } from '../api.ts'
import { flakyHandlers } from '../mocks/flaky.ts'

const server = setupServer(...flakyHandlers)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

it('fails once, then succeeds', async () => {
  await expect(listTodos()).rejects.toThrow('503')
  expect(await listTodos()).toEqual([])
  expect(await listTodos()).toEqual([])
})
