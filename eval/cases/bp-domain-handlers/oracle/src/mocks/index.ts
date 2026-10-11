import { handlers as graphqlHandlers } from './handlers/graphql.ts'
import { handlers as sessionHandlers } from './handlers/session.ts'
import { handlers as todoHandlers } from './handlers/todos.ts'
import { handlers as userHandlers } from './handlers/users.ts'

export const handlers = [...userHandlers, ...todoHandlers, ...sessionHandlers, ...graphqlHandlers]
