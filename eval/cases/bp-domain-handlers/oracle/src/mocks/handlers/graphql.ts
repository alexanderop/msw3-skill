import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import type { User } from '../../api.ts'

const api = graphql.link('https://api.example.com/graphql')

export const handlers = [
  api.query<{ user: User }, { id: string }>('GetUser', ({ variables }) =>
    HttpResponse.json({ data: { user: { id: variables.id, name: 'Ada Lovelace' } } }),
  ),
  api.mutation<{ renameUser: User }, { id: string; name: string }>('RenameUser', ({ variables }) =>
    HttpResponse.json({ data: { renameUser: { id: variables.id, name: variables.name } } }),
  ),
]
