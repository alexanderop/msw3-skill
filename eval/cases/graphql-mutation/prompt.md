Create `src/mocks/rename.ts` that exports `renameHandlers`: MSW handlers for the `RenameUser` mutation sent by `src/graphql-client.ts`.

- Respond with `renameUser: { id, name }` built from the mutation variables.
- If `name` is an empty string, respond with a GraphQL error whose message is `Name must not be empty`.
