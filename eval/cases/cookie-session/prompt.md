Create `src/mocks/session.ts` that exports `sessionHandlers`: MSW handlers for `GET https://api.example.com/me` (called by `getMe` in `src/api.ts`).

- If the request has a `session` cookie with the value `abc`, respond 200 with `{ user: "ada" }`.
- Otherwise respond 401.
