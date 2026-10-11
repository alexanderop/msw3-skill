import { http, HttpResponse } from 'msw'
import type { Todo } from '../api.ts'

export const handlers = [
  http.get<never, never, Array<Todo>>('https://api.example.com/todos', () =>
    HttpResponse.json([{ id: 1, title: 'one', done: false }]),
  ),
  http.post<never, { title: string }, Todo>('https://api.example.com/todos', async ({ request }) => {
    const { title } = await request.json()
    return HttpResponse.json({ id: 2, title, done: false }, { status: 201 })
  }),
]
