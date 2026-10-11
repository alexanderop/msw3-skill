Create `src/mocks/ws-tracking.ts` that exports `trackWebSocketConnections(server: SetupServer): Array<string>`.

It must use MSW's life-cycle events on the given server to record the URL (as a string) of every WebSocket connection that MSW intercepts. Return the array; it keeps filling as new connections happen.
