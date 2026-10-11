import { http, HttpResponse } from 'msw'

export const sessionHandlers = [
  http.get('https://api.example.com/me', ({ cookies }) => {
    if (cookies.session !== 'abc') {
      return new HttpResponse(null, { status: 401 })
    }
    return HttpResponse.json({ user: 'ada' })
  }),
]
