import { setupServer } from 'msw/node'
import { expect, it } from 'vitest'
import { listTodos } from '../api.ts'
import { handlersForUrl } from '../mocks/scenarios.ts'

async function load(url: string) {
  const server = setupServer(...handlersForUrl(url))
  server.listen({ onUnhandledFrame: 'error' })
  try {
    return await listTodos()
  } finally {
    server.close()
  }
}

it('defaults to success', async () => {
  expect(await load('http://localhost:5173/todos')).toHaveLength(2)
})

it('supports empty and error scenarios', async () => {
  expect(await load('http://localhost:5173/todos?scenario=empty')).toEqual([])
  await expect(load('http://localhost:5173/todos?scenario=error')).rejects.toThrow('500')
})
