import { http, HttpResponse } from 'msw'
import type { User } from '../../api.ts'

export const handlers = [
  http.get<{ id: string }, never, User>('https://api.example.com/users/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, name: `User ${params.id}` }),
  ),
]
