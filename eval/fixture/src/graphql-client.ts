import { API_URL, type User } from './api.ts'

async function request<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> }
  if (body.errors?.length) {
    throw new Error(body.errors[0]!.message)
  }
  return body.data as T
}

export async function fetchUser(id: string): Promise<User> {
  const data = await request<{ user: User }>(
    `query GetUser($id: ID!) { user(id: $id) { id name } }`,
    { id },
  )
  return data.user
}

export async function renameUser(id: string, name: string): Promise<User> {
  const data = await request<{ renameUser: User }>(
    `mutation RenameUser($id: ID!, $name: String!) { renameUser(id: $id, name: $name) { id name } }`,
    { id, name },
  )
  return data.renameUser
}
