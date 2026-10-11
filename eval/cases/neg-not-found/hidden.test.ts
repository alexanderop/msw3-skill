import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { getUser } from '../api.ts'

const server = setupServer(
  http.get('https://api.example.com/users/:id', ({ params }) =>
    params.id === 'missing'
      ? new HttpResponse(null, { status: 404 })
      : HttpResponse.json({ id: params.id, name: 'Ada' }),
  ),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

it('throws for a missing user', async () => {
  await expect(getUser('missing')).rejects.toThrow('User missing not found')
  expect(await getUser('1')).toEqual({ id: '1', name: 'Ada' })
})
