import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('https://api.example.com/me', ({ cookies }) =>
    cookies.session === 'abc' ? HttpResponse.json({ user: 'ada' }) : new HttpResponse(null, { status: 401 }),
  ),
]
