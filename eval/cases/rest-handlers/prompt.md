Create `src/mocks/handlers.ts` that exports a `handlers` array of MSW request handlers for the API used in `src/api.ts`:

- `GET https://api.example.com/users/:id` responds with `{ id, name: "User <id>" }`
- `GET https://api.example.com/todos` responds with two todos
- `POST https://api.example.com/todos` responds with `{ id: 3, title, done: false }`, where `title` comes from the request body
