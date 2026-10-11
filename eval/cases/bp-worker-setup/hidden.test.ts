import { existsSync, readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { handlers } from '../mocks/handlers.ts'

it('ships the worker script in public/', () => {
  expect(existsSync('public/mockServiceWorker.js')).toBe(true)
})

it('records the worker directory so upgrades regenerate the script', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  expect([pkg.msw?.workerDirectory].flat()).toContainEqual(expect.stringMatching(/^(\.\/)?public\/?$/))
})

it('exports the handlers', () => {
  expect(handlers.length).toBeGreaterThan(0)
})
