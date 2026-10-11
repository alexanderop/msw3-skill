import { http, HttpResponse } from 'msw'

export const handlers = [http.get('https://api.example.com/todos', () => HttpResponse.json([]))]
