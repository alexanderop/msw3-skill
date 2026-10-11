---
name: msw
description: Mock Service Worker (MSW) v3 rules. Use before writing or editing any code that imports from 'msw' (msw, msw/node, msw/browser, msw/graphql, msw/vite), or when asked to mock API requests, GraphQL operations, WebSockets or Server-Sent Events, set up request mocking for Vitest/Jest/Playwright/Storybook, or write tests that intercept fetch. MSW 3 changed several v2 APIs, so code written from memory often fails to typecheck.
---

# MSW 3

MSW 3.0 shipped on 2026-09-28. What you remember is most likely MSW 2, and several v2 patterns no longer compile or behave differently. Check the installed version first:

```bash
node -p "require('./node_modules/msw/package.json').version"
```

If it is `3.x`, follow this file. When unsure about an API, read the types in `node_modules/msw/lib/**/*.d.ts` instead of guessing.

## The v2 habits that break in v3

| v2 (wrong in v3) | v3 |
|---|---|
| `import { graphql } from 'msw'` | `import { graphql } from 'msw/graphql'` |
| `graphql.query('GetUser', …)` | `graphql.link(url).query('GetUser', …)`. A link is required; there is no top-level `graphql.query` / `graphql.mutation` |
| `server.listen({ onUnhandledRequest: 'error' })` | `server.listen({ onUnhandledFrame: 'error' })`. Same for `worker.start()` |
| `server.events.on('connection', …)` | `server.events.on('websocket:connection', ({ url }) => …)`. `url` is a `URL` |
| `worker.stop()` | `await worker.stop()` (returns a Promise) |
| `delay()` resolves under fake timers | MSW no longer works around fake timers. Advance them: `await vi.advanceTimersByTimeAsync(ms)` |
| `request.headers.get('cookie')` | Use the `cookies` resolver argument: `({ cookies }) => cookies.session` |
| `require('msw')` | ESM only. Node ≥ 22.12, TypeScript ≥ 5.9 |
| `handleRequest()`, `msw/native` | Removed. Use `defineNetwork()` from `msw/experimental`, or `@msw/react-native` |

`ws.link(url).addEventListener('connection', …)` is unchanged. Only the server-level life-cycle event was renamed.

## Imports

```ts
import { http, HttpResponse, delay, passthrough, bypass, ws, sse } from 'msw'
import { graphql } from 'msw/graphql'
import { setupServer } from 'msw/node'      // Node: Vitest, Jest
import { setupWorker } from 'msw/browser'   // browser
```

## Patterns

**HTTP handlers**

```ts
export const handlers = [
  http.get('https://api.example.com/users/:id', ({ params }) =>
    HttpResponse.json({ id: params.id }),
  ),
  http.post('https://api.example.com/todos', async ({ request }) => {
    const body = (await request.json()) as { title: string }
    return HttpResponse.json({ id: 1, ...body }, { status: 201 })
  }),
  http.get('https://api.example.com/offline', () => HttpResponse.error()), // network error
  http.get('https://api.example.com/flaky', () => new HttpResponse(null, { status: 503 }), { once: true }),
]
```

**GraphQL**

```ts
import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'

const api = graphql.link('https://api.example.com/graphql')

export const graphqlHandlers = [
  api.query<{ user: { id: string } }, { id: string }>('GetUser', ({ variables }) =>
    HttpResponse.json({ data: { user: { id: variables.id } } }),
  ),
  api.mutation('RenameUser', () =>
    HttpResponse.json({ errors: [{ message: 'Name must not be empty' }] }),
  ),
]
```

`api.operation(resolver)` matches any operation. `api.subscription(name, resolver)` is new in v3.

**Vitest setup**

```ts
// vitest.setup.ts, registered in vitest.config.ts → test.setupFiles
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './src/mocks/node'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())   // drop server.use() overrides between tests
afterAll(() => server.close())
```

Override a handler for one test with `server.use(http.get(…))`. `onUnhandledFrame` accepts `'bypass' | 'warn' | 'error'` or a callback `({ frame, defaults }) => …`. Inside a callback, `defaults.error()` only prints; it does not fail the request.

**Delays with fake timers**

```ts
vi.useFakeTimers()
const pending = loadTodos()                   // handler does: await delay(2000)
await vi.advanceTimersByTimeAsync(2000)
await pending
```

**Life-cycle events**

```ts
server.events.on('request:unhandled', ({ request }) => log(`${request.method} ${request.url}`))
server.events.on('websocket:connection', ({ url }) => urls.push(url.href))
```

HTTP events: `request:start`, `request:match`, `request:unhandled`, `request:end`, `response:mocked`, `response:bypass`. WebSocket events: `websocket:connection`, `websocket:error`.

**WebSocket**

```ts
const chat = ws.link('wss://chat.example.com')
export const chatHandlers = [
  chat.addEventListener('connection', ({ client }) => {
    client.addEventListener('message', (event) => client.send(`echo:${event.data}`))
  }),
]
```

**Vite dev server** (new in v3): add `msw()` from `msw/vite` to `plugins`, then in the app entry:

```ts
if (import.meta.env.DEV) {
  const { network } = await import('virtual:msw')
  const { handlers } = await import('./mocks/handlers')
  network.configure({ handlers })
  await network.enable()
}
```

## Before you finish

1. Run the project's typecheck (`npx tsc --noEmit`). Most v2 habits in the table above show up as type errors.
2. Run the tests you touched with `vitest run` (not watch mode).

More before/after examples: [references/v2-to-v3.md](references/v2-to-v3.md).
