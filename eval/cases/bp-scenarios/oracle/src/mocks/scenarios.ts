import { http, HttpResponse, type RequestHandler } from 'msw'

const todos = 'https://api.example.com/todos'

const handlers = [
  http.get(todos, () =>
    HttpResponse.json([
      { id: 1, title: 'one', done: false },
      { id: 2, title: 'two', done: true },
    ]),
  ),
]

export const scenarios: Record<string, Array<RequestHandler>> = {
  empty: [http.get(todos, () => HttpResponse.json([]))],
  error: [http.get(todos, () => new HttpResponse(null, { status: 500 }))],
}

export function handlersForUrl(url: string): Array<RequestHandler> {
  const name = new URL(url).searchParams.get('scenario') ?? ''
  return [...(scenarios[name] ?? []), ...handlers]
}
