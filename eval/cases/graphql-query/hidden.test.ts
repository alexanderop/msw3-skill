import { setupServer } from 'msw/node'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { fetchUser } from '../graphql-client.ts'
import { graphqlHandlers } from '../mocks/graphql.ts'

const server = setupServer(...graphqlHandlers)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

it('mocks the GetUser query', async () => {
  expect(await fetchUser('7')).toEqual({ id: '7', name: 'Ada Lovelace' })
})
