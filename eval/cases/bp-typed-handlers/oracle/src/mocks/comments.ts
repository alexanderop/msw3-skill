import { http, HttpResponse } from 'msw'

type CommentParams = { postId: string }
type CommentBody = { author: string; text: string }
type Comment = CommentBody & { id: string; postId: string }

export const commentHandlers = [
  http.post<CommentParams, CommentBody, Comment>(
    'https://api.example.com/posts/:postId/comments',
    async ({ params, request }) => {
      const { author, text } = await request.json()
      return HttpResponse.json({ id: 'c1', postId: params.postId, author, text }, { status: 201 })
    },
  ),
]
