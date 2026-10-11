import { ws } from 'msw'

const chat = ws.link('wss://chat.example.com')

export const chatHandlers = [
  chat.addEventListener('connection', ({ client }) => {
    client.addEventListener('message', (event) => {
      client.send(`echo:${event.data}`)
    })
  }),
]
