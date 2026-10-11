import { expect, it } from 'vitest'
import { slugify } from '../strings.ts'

it('slugifies', () => {
  expect(slugify('  Hello, World!  ')).toBe('hello-world')
  expect(slugify('MSW 3 -- is out')).toBe('msw-3-is-out')
})
