# MSW 3.0.3 facts for the judge

Verified against the msw `v3.0.3` source. Use these to decide whether code is valid MSW 3. Do not reward or penalize style choices that are not covered here or in the rubric.

- `http`, `HttpResponse`, `delay`, `passthrough`, `bypass`, `ws`, `sse` import from `msw`. `setupServer` imports from `msw/node`, `setupWorker` from `msw/browser`. The subpaths `msw/http`, `msw/ws` and `msw/sse` are also valid entry points.
- `graphql` imports only from `msw/graphql`, and only exposes `graphql.link(url)`, which returns `{ query, mutation, operation, subscription }`. There is no top-level `graphql.query`.
- `server.listen()` / `worker.start()` take `{ onUnhandledFrame: 'bypass' | 'warn' | 'error' | callback }`. `onUnhandledRequest` does not exist in v3. In a callback, `defaults.error()` only prints.
- Server life-cycle events: `request:start`, `request:match`, `request:unhandled`, `request:end`, `response:mocked`, `response:bypass`, `websocket:connection`, `websocket:error`. `ws.link(url).addEventListener('connection', …)` is the WebSocket handler API and is unchanged.
- `delay()` uses the real `setTimeout`; with fake timers the test must advance timers.
- The `cookies` resolver argument holds parsed request cookies.
- `server.use()` prepends runtime handlers; `server.resetHandlers()` removes them; `{ once: true }` makes a handler respond once.
- `HttpResponse.json()`, `HttpResponse.text()`, `HttpResponse.error()` (network error) and `new HttpResponse(body, init)` are the response helpers.

## Official best practices (mswjs.io/docs/guides/best-practices)

- Happy paths live in shared handlers (`handlers.ts`); error and edge states are added per test with `server.use()` and removed with `server.resetHandlers()`. Don't encode error states in the shared handlers.
- Large APIs: group handlers by domain in separate modules and compose them into one `handlers` array.
- Avoid request assertions in tests (checking that a request was made, its URL/body, or that a handler was called). Instead, validate the request inside the handler (return an error response such as 400 when it's invalid) and assert on how the application reacts. Life-cycle events are reserved for one-way requests with no observable effect (analytics, monitoring).
- Use the generic arguments for type safety: `http.post<Params, RequestBody, ResponseBody>()` and `api.query<Query, Variables>()`.
- Abstract logic repeated across handlers into higher-order response resolvers (e.g. `withAuth(resolver)`) or utility functions.
- Switchable dev scenarios: a map of scenario name → override handlers, prepended before the base handlers (left-most wins).
- Browser: generate the worker with `npx msw init <public-dir> --save` (records `msw.workerDirectory` in package.json so upgrades regenerate it) and commit `mockServiceWorker.js`.
- Tests: `onUnhandledFrame: 'error'` in the test setup so unknown requests fail.
