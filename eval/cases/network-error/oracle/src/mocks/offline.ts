import { http, HttpResponse } from 'msw'

export const offlineHandlers = [http.get('https://api.example.com/todos', () => HttpResponse.error())]
