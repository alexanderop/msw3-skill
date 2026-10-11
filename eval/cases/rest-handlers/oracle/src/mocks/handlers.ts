import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('https://api.example.com/users/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, name: `User ${params.id}` }),
  ),
  http.get('https://api.example.com/todos', () =>
    HttpResponse.json([
      { id: 1, title: 'one', done: false },
      { id: 2, title: 'two', done: true },
    ]),
  ),
  http.post('https://api.example.com/todos', async ({ request }) => {
    const { title } = (await request.json()) as { title: string }
    return HttpResponse.json({ id: 3, title, done: false })
  }),
]
