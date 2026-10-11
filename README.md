# msw3-skill

A Claude Code plugin that teaches coding agents [Mock Service Worker](https://mswjs.io/) v3, plus the eval that measures whether it helps.

It covers the v3 API changes and the official best practices. MSW 3.0 shipped on 2026-09-28, after the training cutoff of most models. Agents write MSW 2 code from memory, for example `onUnhandledRequest`, `import { graphql } from 'msw'` and `graphql.query(...)`. None of it exists in v3.

## Install

```bash
/plugin marketplace add alexanderop/msw3-skill
/plugin install msw3@msw3-skill
```

Or load it for one session:

```bash
git clone https://github.com/alexanderop/msw3-skill
claude --plugin-dir msw3-skill/plugin
```

The skill is `msw3:msw` ([`plugin/skills/msw/SKILL.md`](plugin/skills/msw/SKILL.md)). Claude Code loads it on its own when a task involves MSW.

## Results

Claude Code with Haiku 5.5, 23 tasks × 3 runs per arm (69 runs). The arms differ only in `--plugin-dir`:

- **Baseline:** no plugin
- **v1:** the skill with v3 API changes only
- **v2:** v1 plus the [official MSW best practices](https://mswjs.io/docs/guides/best-practices) (current version)

| | Baseline | v1 | **v2** |
|---|---|---|---|
| **Pass**: hidden tests pass and `tsc --noEmit` is clean | 93% | 100% | **100%** |
| **Quality** (blind Opus judge, rubric below) | 89% | 95% | **99%** |
| Judge's `best_practices` criterion | 65% (32/49) | 65% (33/51) | **94% (48/51)** |
| Agent cost, all 69 runs | $0.461 | $0.359 | **$0.416** |
| Mean time per run | 21 s | 16 s | **22 s** |
| Skill triggered on MSW tasks | – | 100% | **100%** (60/60) |
| Skill triggered on non-MSW tasks | – | 0% | **0%** (0/9) |

By task group (quality, baseline → v1 → v2):

| Group | Runs per arm | Pass | Quality |
|---|---|---|---|
| v3 traps (GraphQL, `onUnhandledFrame`, `websocket:connection`, fake timers) | 18 | 100 → 100 → 100% | 95 → 100 → 100% |
| Control MSW tasks (REST, cookies, `once`, network errors, `server.use`) | 21 | 90 → 100 → 100% | 91 → 97 → 100% |
| Best-practice tasks (see below) | 21 | 86 → 100 → 100% | 77 → 85 → **97%** |
| Non-MSW tasks | 9 | 100 → 100 → 100% | 100 → 100 → 100% |

### What the v3 rules fixed (v1)

Without the plugin, Haiku reads `node_modules/msw` types and fixes its mistakes with `tsc`, so it passes the v3 traps that a task asks about directly. It slips on v2 habits that it adds unprompted:

- `server.listen({ onUnhandledRequest: 'error' })` in test setup. That option does not exist in v3, and Vitest doesn't typecheck, so the agent's own test run passed. This caused every baseline pass failure.
- Parsing `request.headers.get('cookie')` by hand instead of using the `cookies` resolver argument.
- A module-level counter instead of `{ once: true }` for a one-time error response.
- Hand-rolled GraphQL matching on `http.post` instead of `graphql.link(url).mutation(...)`.

### What the best practices fixed (v2)

The best-practice prompts never name the practice; they describe a normal task. Quality per task, baseline → v1 → v2:

| Task | What the docs recommend | Quality |
|---|---|---|
| Test that `createTodo` sends the title | Validate the body in the handler and assert on the result, not on the request | 0.50 → 0.78 → **1.00** |
| Mock the whole API | Group handlers by domain and compose them | 0.57 → 0.80 → **1.00** |
| Success and error tests | Happy path in shared handlers, error via `server.use()` | 0.83 → 0.83 → **1.00** |
| Two endpoints that need auth | Higher-order resolver (`withAuth`) instead of copying the check | 0.80 → 0.87 → **1.00** |
| Typed comment endpoint | `http.post<Params, Body, Response>` instead of casts | 0.93 → 0.87 → **1.00** |
| Browser setup | `npx msw init public --save`, commit the worker | 0.93 → 1.00 → 1.00 |
| Demo scenarios via `?scenario=` | Prepend scenario overrides to the base handlers | 0.80 → 0.80 → 0.80 |

Known gap: in the scenario task, all three arms return each scenario's handlers on their own instead of putting them in front of the shared base handlers.

v2 costs more than v1 ($0.416 vs $0.359), because the agent does more work on the best-practice tasks. It still costs less than no plugin ($0.461).

### How much to trust it

69 runs per arm give a noise floor of about ±12 points on a rate. The jump on `best_practices` (65% → 94%) is well above that. The pass-rate and v3-quality gains point the right way but are not proof on their own. This setup is also easy on the baseline: MSW 3 is installed, so the agent can read its types. A project without MSW installed should show a bigger gap. That set doesn't exist yet.

## How the eval works

Each case in [`eval/cases/<id>/`](eval/cases) has:

- `prompt.md`: the task the agent gets
- `hidden.test.ts`: tests the agent never sees, copied in after it finishes
- `oracle/`: a reference solution, used to check the grader
- `case.json`: tags, plus the agent-written test files and patterns to check, for cases where the agent writes the tests itself

[`eval/run.mjs`](eval/run.mjs) copies [`eval/fixture`](eval/fixture) (a small TypeScript app with `msw@3.0.3`, Vitest 5 and TypeScript 7) into a fresh directory per run. It then runs `claude -p` there with `--setting-sources project --strict-mcp-config`, so user settings, CLAUDE.md, plugins and MCP servers don't affect the result. A run **passes** when the hidden tests pass, `tsc --noEmit` is clean, and the agent changed files.

[`eval/judge.mjs`](eval/judge.mjs) then grades the changed files:

- **Hygiene** (deterministic): no `any` or `@ts-ignore`, no leftover scratch or debug files, no `console.log`.
- **Quality** (Opus, blind to the arm, structured output): the share of these criteria the code meets:
  - `v3_correct`: only APIs that exist in MSW 3, checked against [`eval/msw3-facts.md`](eval/msw3-facts.md)
  - `idiomatic`: MSW helpers instead of hand-rolled equivalents
  - `test_hygiene`: listen / resetHandlers / close, and failing on unhandled requests
  - `type_safety`: typed bodies and variables, no `any`
  - `best_practices`: follows the official MSW best practices that apply to the task
  - `minimal_scope`: only the files the task needs

### Grader checks, run before any agent

| Check | Expected | Result |
|---|---|---|
| Reference solutions through the runner and grader | 100% pass | 100% |
| Empty workspace (agent did nothing) | 0% pass | 0% |
| Judge on the reference solutions | ~100% quality | 98% |
| Judge on a deliberately sloppy v2-style solution | ~0% quality | 0% |
| Judge on a test that spies on the request body | `best_practices` = 0 | 0 |

The reference solutions also caught two v3 behaviors that the release notes don't spell out:
- `graphql` no longer has `query` / `mutation` at the top level. Every operation goes through `graphql.link(url)`.
- Calling `server.close()` twice throws "already disabled".

Raw per-run results, including the judge's reasons: [`.claude/hillclimb/msw/baseline/results.jsonl`](.claude/hillclimb/msw/baseline/results.jsonl) and [`.claude/hillclimb/msw/v1/results.jsonl`](.claude/hillclimb/msw/v1/results.jsonl) and [`.claude/hillclimb/msw/v2/results.jsonl`](.claude/hillclimb/msw/v2/results.jsonl).

### Run it yourself

```bash
cd eval/fixture && pnpm install && cd ../..
node eval/run.mjs --mode oracle                         # grader check: expect 100%
node eval/run.mjs --mode null                           # grader check: expect 0%
node eval/run.mjs --variant baseline                    # without the plugin
node eval/run.mjs --variant v2 --plugin-dir plugin      # with the plugin
node eval/judge.mjs --variant baseline
node eval/judge.mjs --variant v2
```

Flags: `--reps`, `--cases a,b`, `--concurrency`, `--model` (default `haiku`). One arm costs about $0.45 in agent runs and $2.30 in Opus judging.

## License

MIT
