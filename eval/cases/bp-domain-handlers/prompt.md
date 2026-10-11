Mock this app's whole API with MSW so tests can use it. Export the complete handler list as `handlers` from `src/mocks/index.ts`.

- `GET https://api.example.com/users/:id` → `{ id, name: "User <id>" }`
- `GET https://api.example.com/todos` → two todos; `POST https://api.example.com/todos` → `{ id: 3, title, done: false }`
- `GET https://api.example.com/me` → 200 `{ user: "ada" }` when the `session` cookie is `abc`, otherwise 401
- GraphQL at `https://api.example.com/graphql`: `GetUser` → `{ id, name: "Ada Lovelace" }`, `RenameUser` → `{ id, name }` from the variables
