---
name: msw
description: Mock Service Worker (MSW) v3 rules and official best practices. Use before writing or editing any code that imports from 'msw' (msw, msw/node, msw/browser, msw/graphql, msw/vite), or when asked to mock API requests, GraphQL operations, WebSockets or Server-Sent Events, set up request mocking for Vitest/Jest/Playwright/Storybook, or write tests that intercept fetch. MSW 3 changed several v2 APIs, so code written from memory often fails to typecheck.
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

## Best practices

From the official guide (mswjs.io/docs/guides/best-practices). Apply them by default.

1. **Happy paths in shared handlers, edge cases per test.** `src/mocks/handlers.ts` describes the successful responses. Errors, empty states and slow responses go into the test that needs them, via `server.use()`. Pair that with `afterEach(() => server.resetHandlers())`. Don't add an "error mode" flag to the shared handlers.
2. **Don't assert on requests.** No spies inside resolvers, no captured request bodies, no "the handler was called" checks. Make the handler behave like the real API instead: validate the request and return an error (such as 400) when it is wrong. Then assert on what the code under test returns or renders. Use life-cycle events only for one-way requests that have no visible effect, like analytics.

   ```ts
   http.post<never, { title?: string }, Todo | { error: string }>(url, async ({ request }) => {
     const { title } = await request.json()
     if (!title) return HttpResponse.json({ error: 'title is required' }, { status: 400 })
     return HttpResponse.json({ id: 1, title, done: false }, { status: 201 })
   })
   // test: expect(await createTodo('x')).toEqual({ id: 1, title: 'x', done: false })
   ```

3. **Type handlers with generics, not casts.** `http.post<Params, RequestBody, ResponseBody>(path, resolver)` types `params`, `await request.json()` and `HttpResponse.json()`. For GraphQL, use `api.query<Query, Variables>()`. Avoid `(await request.json()) as X`.
4. **Group large APIs by domain.** Use `mocks/handlers/users.ts`, `todos.ts` and so on, each exporting `handlers`, and compose them in one place: `export const handlers = [...userHandlers, ...todoHandlers]`.
5. **Put repeated logic in a higher-order resolver** instead of copying it into every handler:

   ```ts
   function withAuth<P extends PathParams, B extends DefaultBodyType>(
     resolver: HttpResponseResolver<P, B>,
   ): HttpResponseResolver<P, B> {
     return (info) =>
       info.request.headers.get('Authorization') === 'Bearer test-token'
         ? resolver(info)
         : new HttpResponse(null, { status: 401 })
   }
   http.get(url, withAuth(() => HttpResponse.json([])))
   ```

6. **Switchable scenarios** (demos, local dev): build a map from scenario name to override handlers, and put the chosen scenario before the base handlers, because the left-most handler wins. `setupWorker(...(scenarios[name] ?? []), ...handlers)`.
7. **Browser worker:** run `npx msw init public --save`. `--save` records `msw.workerDirectory` in `package.json`, so upgrades regenerate the script. Commit `public/mockServiceWorker.js`. Don't hand-write or copy the worker file.
8. **Fail on unknown traffic in tests:** `server.listen({ onUnhandledFrame: 'error' })`.
9. **Close a server once.** In v3, calling `server.close()` on a server that is already closed throws "already disabled".

## Before you finish

1. Run the project's typecheck (`npx tsc --noEmit`). Most v2 habits in the table above show up as type errors.
2. Run the tests you touched with `vitest run` (not watch mode).

More before/after examples: [references/v2-to-v3.md](references/v2-to-v3.md).
