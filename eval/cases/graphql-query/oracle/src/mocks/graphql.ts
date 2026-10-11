import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'

const api = graphql.link('https://api.example.com/graphql')

export const graphqlHandlers = [
  api.query<{ user: { id: string; name: string } }, { id: string }>('GetUser', ({ variables }) =>
    HttpResponse.json({ data: { user: { id: variables.id, name: 'Ada Lovelace' } } }),
  ),
]
