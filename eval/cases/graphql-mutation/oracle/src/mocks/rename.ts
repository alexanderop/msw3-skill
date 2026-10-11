import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'

const api = graphql.link('https://api.example.com/graphql')

export const renameHandlers = [
  api.mutation<{ renameUser: { id: string; name: string } }, { id: string; name: string }>(
    'RenameUser',
    ({ variables }) => {
      if (variables.name === '') {
        return HttpResponse.json({ errors: [{ message: 'Name must not be empty' }] })
      }
      return HttpResponse.json({ data: { renameUser: { id: variables.id, name: variables.name } } })
    },
  ),
]
