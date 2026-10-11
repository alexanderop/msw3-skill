# MSW v2 → v3: before and after

Source: the v3.0.0 release notes and the `v3.0.3` source tree.

## GraphQL needs its own entry point and a link

```ts
// Before (v2)
import { graphql, HttpResponse } from 'msw'
graphql.query('GetUser', () => HttpResponse.json({ data: { user: null } }))

// After (v3)
import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
const api = graphql.link('https://api.example.com/graphql')
api.query('GetUser', () => HttpResponse.json({ data: { user: null } }))
```

`graphql` is an optional peer dependency now; install `graphql` (v16 or v17) in the project. The `GraphQLLinkHandlers` type is now `GraphQLLink`.

## Unhandled requests

```ts
// Before
server.listen({ onUnhandledRequest: 'error' })

// After
server.listen({ onUnhandledFrame: 'error' })
```

The option covers HTTP requests and WebSocket connections ("frames"). A custom callback receives `{ frame, defaults }`. `defaults.warn()` and `defaults.error()` only print; to fail the request, use the `'error'` string strategy.

## Life-cycle event names

```ts
// Before
server.events.on('connection', …)

// After
server.events.on('websocket:connection', ({ url, protocols }) => …)
server.events.on('websocket:error', ({ url, error }) => …) // new
```

HTTP event names (`request:start`, `request:unhandled`, `response:mocked`, …) did not change. Listeners now receive an event object; destructuring `{ request, requestId }` still works.

## Fake timers

v2 patched `setTimeout` so `delay()` resolved under fake timers. v3 does not:

```ts
vi.useFakeTimers()
const pending = fetchSomething()          // handler awaits delay(2000)
await vi.advanceTimersByTimeAsync(2000)   // required in v3
await pending
```

## Cookies

```ts
// Before: worked because MSW injected a cookie string
http.get('/me', ({ request }) => request.headers.get('cookie'))

// After
http.get('/me', ({ cookies }) => cookies.session)
```

In Node.js, MSW no longer manages cookies. Send them explicitly with a `Cookie` header.

## Smaller changes

- `await worker.stop()`: it returns a Promise now.
- ESM only. Node.js ≥ 22.12, TypeScript ≥ 5.9.
- `handleRequest()` is removed. Use `defineNetwork()` from `msw/experimental`.
- `msw/native` is removed. Use `@msw/react-native`.
- `file://` requests and HTTP→WebSocket upgrades through `fetch()` now throw in Node.js, as they do without MSW.
- `bypass()` drops the `Content-Length` header.
- New: `msw/vite` plugin, `api.subscription()` for GraphQL subscriptions, interception of page navigations and form submissions, the `websocket:error` event, `msw/utils/<name>` imports (e.g. `msw/utils/delay`) for a smaller bundle.
