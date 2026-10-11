import { expect, it } from 'vitest'
import { API_URL } from './api.ts'

it('points at the example API', () => {
  expect(API_URL).toBe('https://api.example.com')
})
