import { setupServer } from 'msw/node'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { getMe } from '../api.ts'
import { sessionHandlers } from '../mocks/session.ts'

const server = setupServer(...sessionHandlers)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

it('authorizes a valid session cookie', async () => {
  const response = await getMe('abc')
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ user: 'ada' })
})

it('rejects missing or wrong sessions', async () => {
  expect((await getMe()).status).toBe(401)
  expect((await getMe('zzz')).status).toBe(401)
})
