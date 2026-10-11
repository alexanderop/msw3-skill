#!/usr/bin/env node
// Runs every case in eval/cases against `claude -p` (or the oracle / null solution),
// grades the workspace it leaves behind, and writes .claude/hillclimb/msw/<variant>/.
//
//   node eval/run.mjs --variant baseline                       # Claude Code without the plugin
//   node eval/run.mjs --variant v1 --plugin-dir plugin         # Claude Code with the plugin
//   node eval/run.mjs --mode oracle                            # grader self-check, expect 100%
//   node eval/run.mjs --mode null                              # grader self-check, expect 0%
//
// Flags: --reps N (default 3), --cases a,b, --concurrency N (default 4), --model haiku, --timeout-s 420
import { spawn } from 'node:child_process'
import { appendFile, cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { parseArgs } from 'node:util'
import { tmpdir } from 'node:os'

const ROOT = resolve(import.meta.dirname, '..')
const FIXTURE = join(ROOT, 'eval/fixture')
const CASES = join(ROOT, 'eval/cases')
const FLOW = join(ROOT, '.claude/hillclimb/msw')

const { values: args } = parseArgs({
  options: {
    variant: { type: 'string', default: 'baseline' },
    mode: { type: 'string', default: 'agent' },
    'plugin-dir': { type: 'string' },
    reps: { type: 'string', default: '3' },
    cases: { type: 'string' },
    concurrency: { type: 'string', default: '4' },
    model: { type: 'string', default: 'haiku' },
    'timeout-s': { type: 'string', default: '420' },
  },
})

const mode = args.mode
const variant = mode === 'agent' ? args.variant : `_${mode}`
const reps = mode === 'agent' ? Number(args.reps) : 1
const outDir = join(FLOW, variant)
const workRoot = join(process.env.EVAL_WORK_DIR ?? tmpdir(), 'msw-eval', variant)
const pluginDir = args['plugin-dir'] ? resolve(args['plugin-dir']) : undefined

function run(cmd, cmdArgs, { cwd, timeoutMs = 120_000, input, env = {} } = {}) {
  return new Promise((done) => {
    const child = spawn(cmd, cmdArgs, { cwd, env: { ...process.env, CI: '1', FORCE_COLOR: '0', ...env } })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)
    child.stdout.on('data', (d) => (stdout += d))
    child.stderr.on('data', (d) => (stderr += d))
    if (input !== undefined) child.stdin.end(input)
    else child.stdin.end()
    child.on('close', (code) => {
      clearTimeout(timer)
      done({ code, stdout, stderr, timedOut })
    })
  })
}

async function listFiles(dir, base = dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await listFiles(path, base)))
    else out.push(relative(base, path))
  }
  return out
}

async function changedFiles(workspace) {
  const changed = []
  for (const file of await listFiles(workspace)) {
    const before = join(FIXTURE, file)
    if (!existsSync(before)) changed.push(file)
    else if ((await readFile(before, 'utf8')) !== (await readFile(join(workspace, file), 'utf8'))) changed.push(file)
  }
  return changed
}

async function loadCases() {
  const ids = (await readdir(CASES)).filter((id) => !args.cases || args.cases.split(',').includes(id))
  return Promise.all(
    ids.sort().map(async (id) => ({
      id,
      prompt: await readFile(join(CASES, id, 'prompt.md'), 'utf8'),
      hasHidden: existsSync(join(CASES, id, 'hidden.test.ts')),
      ...JSON.parse(await readFile(join(CASES, id, 'case.json'), 'utf8')),
    })),
  )
}

const SYSTEM_APPEND =
  'You are working in a TypeScript project. Finish the task completely without asking questions. Do not run npm/pnpm install; dependencies are already installed.'

async function runAgent(c, workspace) {
  const cliArgs = [
    '-p', c.prompt,
    '--model', args.model,
    '--setting-sources', 'project',
    '--strict-mcp-config',
    '--permission-mode', 'bypassPermissions',
    '--output-format', 'stream-json', '--verbose',
    '--append-system-prompt', SYSTEM_APPEND,
  ]
  if (pluginDir) cliArgs.push('--plugin-dir', pluginDir)
  const started = Date.now()
  // bash keeps the user's zsh profile (aliases like `rm -i`) out of the agent's Bash tool.
  const result = await run('claude', cliArgs, {
    cwd: workspace,
    timeoutMs: Number(args['timeout-s']) * 1000,
    env: { SHELL: '/bin/bash' },
  })
  const events = result.stdout
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)]
      } catch {
        return []
      }
    })
  return { result, events, latency_s: (Date.now() - started) / 1000 }
}

function toTrace(c, events) {
  const trace = [{ role: 'user', content: c.prompt }]
  for (const event of events) {
    if (event.type === 'assistant') {
      for (const block of event.message.content ?? []) {
        if (block.type === 'text' && block.text.trim()) trace.push({ role: 'assistant', content: block.text })
        if (block.type === 'tool_use')
          trace.push({ role: 'tool_call', name: block.name, content: JSON.stringify(block.input, null, 2) })
      }
    }
    if (event.type === 'user' && Array.isArray(event.message?.content)) {
      for (const block of event.message.content) {
        if (block.type !== 'tool_result') continue
        const text = Array.isArray(block.content)
          ? block.content.map((b) => b.text ?? '').join('\n')
          : String(block.content ?? '')
        trace.push({ role: 'tool_result', content: text.slice(0, 4000) })
      }
    }
  }
  return trace
}

function skillUsage(events) {
  let triggered = false
  let toolCalls = 0
  for (const event of events) {
    if (event.type !== 'assistant') continue
    for (const block of event.message.content ?? []) {
      if (block.type !== 'tool_use') continue
      toolCalls++
      const input = JSON.stringify(block.input ?? {})
      if (block.name === 'Skill' && /msw/i.test(input)) triggered = true
      if (block.name === 'Read' && /skills\/msw\//.test(input)) triggered = true
    }
  }
  return { triggered, toolCalls }
}

async function grade(c, workspace) {
  const testFiles = [...(c.agentTests ?? [])]
  if (c.hasHidden) {
    await mkdir(join(workspace, 'src/__hidden__'), { recursive: true })
    await cp(join(CASES, c.id, 'hidden.test.ts'), join(workspace, 'src/__hidden__', `${c.id}.test.ts`))
    testFiles.push(`src/__hidden__/${c.id}.test.ts`)
  }
  const missing = testFiles.filter((f) => !existsSync(join(workspace, f)))
  const tests =
    missing.length === 0 &&
    (await run('npx', ['vitest', 'run', ...testFiles], { cwd: workspace, timeoutMs: 90_000 })).code === 0
  const tsc = await run('npx', ['tsc', '--noEmit', '-p', '.'], { cwd: workspace, timeoutMs: 90_000 })
  const typecheck = tsc.code === 0
  let required = true
  for (const pattern of c.require ?? []) {
    const sources = await Promise.all(
      (c.agentTests ?? []).filter((f) => existsSync(join(workspace, f))).map((f) => readFile(join(workspace, f), 'utf8')),
    )
    if (!sources.some((s) => new RegExp(pattern).test(s))) required = false
  }
  return { tests, typecheck, required, tscOutput: tsc.stdout.slice(0, 2000) }
}

async function runCase(c, rep) {
  const workspace = join(workRoot, `${c.id}_rep${rep}`)
  await rm(workspace, { recursive: true, force: true })
  await mkdir(workRoot, { recursive: true })
  await run('cp', ['-cR', FIXTURE, workspace])

  let agent = { events: [], latency_s: 0, result: { code: 0, timedOut: false } }
  if (mode === 'oracle') await run('cp', ['-R', `${join(CASES, c.id, 'oracle')}/.`, workspace])
  if (mode === 'agent') agent = await runAgent(c, workspace)

  const final = agent.events.findLast?.((e) => e.type === 'result')
  if (mode === 'agent' && (agent.result.timedOut || !final)) {
    await writeFile(join(outDir, 'traces', `${c.id}_rep${rep}.error.json`), JSON.stringify(toTrace(c, agent.events), null, 2))
    await appendFile(
      join(outDir, 'errors.jsonl'),
      JSON.stringify({
        prompt_id: c.id,
        rep,
        failure_class: agent.result.timedOut ? 'timeout' : 'harness',
        stderr: agent.result.stderr.slice(-2000),
      }) + '\n',
    )
    return
  }

  const changed = (await changedFiles(workspace)).filter((f) => !f.startsWith('src/__hidden__/'))
  const g = await grade(c, workspace)
  const { triggered, toolCalls } = skillUsage(agent.events)
  const pass = g.tests && g.typecheck && g.required && changed.length > 0
  const modelUsage = final?.modelUsage ?? {}
  const row = {
    prompt_id: c.id,
    prompt: c.prompt,
    tags: c.tags,
    rep,
    status: 'ok',
    stop_reason: final?.subtype ?? null,
    grade: {
      pass: pass ? 1 : 0,
      tests: g.tests ? 1 : 0,
      typecheck: g.typecheck ? 1 : 0,
      skill_used: triggered ? 1 : 0,
    },
    model: Object.keys(modelUsage)[0] ?? args.model,
    usage: {
      input_tokens: final?.usage?.input_tokens ?? 0,
      output_tokens: final?.usage?.output_tokens ?? 0,
      cache_read_input_tokens: final?.usage?.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens: final?.usage?.cache_creation_input_tokens ?? 0,
    },
    cost_usd: final?.total_cost_usd ?? 0,
    latency_s: agent.latency_s,
    tool_calls: toolCalls,
    turns: final?.num_turns ?? 0,
    meta: { changed, tsc: g.typecheck ? '' : g.tscOutput, required: g.required, workspace },
  }
  await appendFile(join(outDir, 'results.jsonl'), JSON.stringify(row) + '\n')
  await writeFile(join(outDir, 'traces', `${c.id}_rep${rep}.json`), JSON.stringify(toTrace(c, agent.events), null, 2))
  console.log(`${pass ? 'PASS' : 'FAIL'} ${c.id} rep${rep}${triggered ? ' [skill]' : ''} $${row.cost_usd.toFixed(4)} ${row.latency_s.toFixed(0)}s`)
}

async function main() {
  if (mode !== 'agent') await rm(outDir, { recursive: true, force: true })
  await mkdir(join(outDir, 'traces'), { recursive: true })
  const done = new Set()
  if (existsSync(join(outDir, 'results.jsonl'))) {
    for (const line of (await readFile(join(outDir, 'results.jsonl'), 'utf8')).split('\n').filter(Boolean)) {
      const row = JSON.parse(line)
      done.add(`${row.prompt_id}:${row.rep}`)
    }
  }
  const cases = await loadCases()
  const queue = cases.flatMap((c) => Array.from({ length: reps }, (_, rep) => ({ c, rep }))).filter(
    ({ c, rep }) => !done.has(`${c.id}:${rep}`),
  )
  console.log(`${variant}: ${queue.length} runs (${cases.length} cases x ${reps} reps, ${done.size} already done)`)
  const workers = Array.from({ length: Number(args.concurrency) }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) await runCase(job.c, job.rep)
  })
  await Promise.all(workers)

  const rows = (await readFile(join(outDir, 'results.jsonl'), 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const byTag = {}
  for (const row of rows) for (const tag of [row.tags[0], 'all']) (byTag[tag] ??= []).push(row)
  for (const [tag, list] of Object.entries(byTag)) {
    const mean = (k) => list.reduce((s, r) => s + r.grade[k], 0) / list.length
    const cost = list.reduce((s, r) => s + r.cost_usd, 0)
    console.log(
      `${tag.padEnd(9)} n=${String(list.length).padEnd(3)} pass=${(mean('pass') * 100).toFixed(0)}% tests=${(mean('tests') * 100).toFixed(0)}% tsc=${(mean('typecheck') * 100).toFixed(0)}% skill=${(mean('skill_used') * 100).toFixed(0)}% cost=$${cost.toFixed(3)}`,
    )
  }
}

await main()
