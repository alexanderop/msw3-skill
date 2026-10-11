export const API_URL = 'https://api.example.com'

export type User = { id: string; name: string }
export type Todo = { id: number; title: string; done: boolean }

export async function getUser(id: string): Promise<User> {
  const response = await fetch(`${API_URL}/users/${id}`)
  return response.json() as Promise<User>
}

export async function listTodos(): Promise<Array<Todo>> {
  const response = await fetch(`${API_URL}/todos`)
  if (!response.ok) {
    throw new Error(`Failed to load todos: ${response.status}`)
  }
  return response.json() as Promise<Array<Todo>>
}

export async function createTodo(title: string): Promise<Todo> {
  const response = await fetch(`${API_URL}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  return response.json() as Promise<Todo>
}

export async function getMe(sessionId?: string): Promise<Response> {
  return fetch(`${API_URL}/me`, {
    headers: sessionId ? { Cookie: `session=${sessionId}` } : {},
  })
}

export async function loadWithStatus(
  onStatus: (status: 'loading' | 'done' | 'error') => void,
): Promise<Array<Todo>> {
  onStatus('loading')
  try {
    const todos = await listTodos()
    onStatus('done')
    return todos
  } catch (error) {
    onStatus('error')
    throw error
  }
}
