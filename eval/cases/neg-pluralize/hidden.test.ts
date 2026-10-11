import { expect, it } from 'vitest'
import { pluralize } from '../strings.ts'

it('pluralizes', () => {
  expect(pluralize(1, 'todo')).toBe('1 todo')
  expect(pluralize(0, 'todo')).toBe('0 todos')
  expect(pluralize(3, 'todo')).toBe('3 todos')
})
