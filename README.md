# msw3-skill

A Claude Code plugin that teaches coding agents [Mock Service Worker](https://mswjs.io/) v3, plus the eval that measures whether it helps.

MSW 3.0 shipped on 2026-09-28, after the training cutoff of most models. Agents write MSW 2 code from memory, for example `onUnhandledRequest`, `import { graphql } from 'msw'` and `graphql.query(...)`. None of it exists in v3.

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

Claude Code with Haiku 5.5, 16 tasks × 3 runs per arm. The only difference between the arms is `--plugin-dir plugin`.

| | Without plugin | With plugin |
|---|---|---|
| **Pass**: hidden tests pass and `tsc --noEmit` is clean | 96% | **100%** |
| **Quality** (blind Opus judge, rubric below) | 95% | **100%** |
| Agent cost, all 48 runs | $0.302 | **$0.235 (−22%)** |
| Mean time per run | 19 s | **14 s** |
| Skill triggered on MSW tasks | – | 100% (39/39) |
| Skill triggered on non-MSW tasks | – | 0% (0/9) |

By task group:

| Group | Runs | Pass (without → with) | Quality (without → with) | Cost (without → with) |
|---|---|---|---|---|
| v3 traps (GraphQL, `onUnhandledFrame`, `websocket:connection`, fake timers) | 18 | 100% → 100% | 95% → 100% | $0.148 → $0.101 |
| Control MSW tasks (REST, cookies, `once`, network errors, `server.use`) | 21 | 90% → 100% | 93% → 100% | $0.132 → $0.112 |
| Non-MSW tasks | 9 | 100% → 100% | 100% → 100% | $0.022 → $0.022 |

### What the plugin fixed

Without the plugin, Haiku reads `node_modules/msw` types and fixes its mistakes with `tsc`. So it passes the v3 traps that a task asks about directly. It slips on v2 habits that it adds unprompted:

- `server.listen({ onUnhandledRequest: 'error' })` in test setup. That option does not exist in v3, and Vitest doesn't typecheck, so the agent's own test run passed. This caused both pass failures.
- Parsing `request.headers.get('cookie')` by hand instead of using the `cookies` resolver argument.
- A module-level counter instead of `{ once: true }` for a one-time error response.
- Hand-rolled GraphQL matching on `http.post` instead of `graphql.link(url).mutation(...)`.
- Untyped `graphql` handlers where `variables` end up as `any`.

With the plugin, none of these showed up, and runs used about 20% fewer tool calls.

### How much to trust it

48 runs per arm give a noise floor of about ±13 points on a pass rate. So the pass and quality gains point the right way but are not proof. The cost and time gains held across task groups. This setup is also easy on the baseline: MSW 3 is installed, so the agent can read its types. A project without MSW installed, or a larger codebase, should show a bigger gap. That set doesn't exist yet.

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
  - `minimal_scope`: only the files the task needs

### Grader checks, run before any agent

| Check | Expected | Result |
|---|---|---|
| Reference solutions through the runner and grader | 100% pass | 100% |
| Empty workspace (agent did nothing) | 0% pass | 0% |
| Judge on the reference solutions | ~100% quality | 99% |
| Judge on a deliberately sloppy v2-style solution | ~0% quality | 0% |

The reference solutions also caught a v3 change that the release notes don't spell out: `graphql` no longer has `query` / `mutation` at the top level. Every operation goes through `graphql.link(url)`.

Raw per-run results, including the judge's reasons: [`.claude/hillclimb/msw/baseline/results.jsonl`](.claude/hillclimb/msw/baseline/results.jsonl) and [`.claude/hillclimb/msw/v1/results.jsonl`](.claude/hillclimb/msw/v1/results.jsonl).

### Run it yourself

```bash
cd eval/fixture && pnpm install && cd ../..
node eval/run.mjs --mode oracle                         # grader check: expect 100%
node eval/run.mjs --mode null                           # grader check: expect 0%
node eval/run.mjs --variant baseline                    # without the plugin
node eval/run.mjs --variant v1 --plugin-dir plugin      # with the plugin
node eval/judge.mjs --variant baseline
node eval/judge.mjs --variant v1
```

Flags: `--reps`, `--cases a,b`, `--concurrency`, `--model` (default `haiku`). The full run above cost $0.54 for the agent runs and about $2.20 for judging.

## License

MIT
