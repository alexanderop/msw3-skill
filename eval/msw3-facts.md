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
