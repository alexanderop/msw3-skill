Set up MSW for every Vitest test in this project:

- `src/mocks/server.ts` exports `server`, an MSW server with a handler for `GET https://api.example.com/todos` that responds with an empty array.
- Add a Vitest setup file that starts the server before all tests, resets runtime handlers after each test, and closes it after all tests. Register it in `vitest.config.ts`.
- Any request without a matching handler must make the request fail, not just print a warning.
