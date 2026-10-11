import { setupServer } from 'msw/node'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { renameUser } from '../graphql-client.ts'
import { renameHandlers } from '../mocks/rename.ts'

const server = setupServer(...renameHandlers)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

it('renames the user', async () => {
  expect(await renameUser('1', 'Grace')).toEqual({ id: '1', name: 'Grace' })
})

it('returns a GraphQL error for an empty name', async () => {
  await expect(renameUser('1', '')).rejects.toThrow('Name must not be empty')
})
