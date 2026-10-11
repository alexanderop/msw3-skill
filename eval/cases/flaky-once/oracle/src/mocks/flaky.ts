import { http, HttpResponse } from 'msw'

export const flakyHandlers = [
  http.get('https://api.example.com/todos', () => new HttpResponse(null, { status: 503 }), { once: true }),
  http.get('https://api.example.com/todos', () => HttpResponse.json([])),
]
