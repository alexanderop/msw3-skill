Create `src/mocks/node.ts` for using MSW in Node.js. It should export:

- `server`: an MSW server with one handler, `GET https://api.example.com/todos`, responding with an empty array
- `startMocking()`: starts the server so that any request without a matching handler fails, instead of only printing a warning and going to the network
