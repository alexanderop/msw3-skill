import type { SetupServer } from 'msw/node'

export function collectUnhandledRequests(server: SetupServer): Array<string> {
  const unhandled: Array<string> = []
  server.events.on('request:unhandled', ({ request }) => {
    unhandled.push(`${request.method} ${request.url}`)
  })
  return unhandled
}
