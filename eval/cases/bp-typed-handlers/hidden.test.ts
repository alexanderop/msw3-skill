import { setupServer } from 'msw/node'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { commentHandlers } from '../mocks/comments.ts'

const server = setupServer(...commentHandlers)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

it('creates a comment', async () => {
  const response = await fetch('https://api.example.com/posts/p7/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: 'ada', text: 'hi' }),
  })
  expect(response.status).toBe(201)
  expect(await response.json()).toEqual({ id: 'c1', postId: 'p7', author: 'ada', text: 'hi' })
})
