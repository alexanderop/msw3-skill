import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

export const server = setupServer(
  http.get('https://api.example.com/todos', () => HttpResponse.json([])),
)

export function startMocking() {
  server.listen({ onUnhandledFrame: 'error' })
}
