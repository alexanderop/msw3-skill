import type { SetupServer } from 'msw/node'

export function trackWebSocketConnections(server: SetupServer): Array<string> {
  const urls: Array<string> = []
  server.events.on('websocket:connection', ({ url }) => {
    urls.push(url.href)
  })
  return urls
}
