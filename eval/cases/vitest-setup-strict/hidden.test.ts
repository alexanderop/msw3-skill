import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { listTodos } from '../api.ts'

let realServer: Server
let realUrl: string

beforeAll(async () => {
  realServer = createServer((_req, res) => res.end('real'))
  await new Promise<void>((resolve) => realServer.listen(0, '127.0.0.1', resolve))
  realUrl = `http://127.0.0.1:${(realServer.address() as AddressInfo).port}/`
})
afterAll(() => realServer.close())

it('mocks todos through the global setup', async () => {
  expect(await listTodos()).toEqual([])
})

it('fails unhandled requests', async () => {
  await expect(fetch(realUrl)).rejects.toThrow()
})
