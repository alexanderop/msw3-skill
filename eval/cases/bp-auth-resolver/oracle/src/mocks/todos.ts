import { http, HttpResponse, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw'

function withAuth<Params extends PathParams, RequestBody extends DefaultBodyType>(
  resolver: HttpResponseResolver<Params, RequestBody>,
): HttpResponseResolver<Params, RequestBody> {
  return (info) => {
    if (info.request.headers.get('Authorization') !== 'Bearer test-token') {
      return new HttpResponse(null, { status: 401 })
    }
    return resolver(info)
  }
}

export const todoHandlers = [
  http.get(
    'https://api.example.com/todos',
    withAuth(() => HttpResponse.json([])),
  ),
  http.post<never, { title: string }>(
    'https://api.example.com/todos',
    withAuth(async ({ request }) => {
      const { title } = await request.json()
      return HttpResponse.json({ id: 1, title, done: false }, { status: 201 })
    }),
  ),
]
