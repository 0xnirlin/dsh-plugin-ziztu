// Run: node --test test/
// A fake Streamable HTTP MCP server stands in for Ziztu. Nothing here touches the network beyond 127.0.0.1.
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createMcpClient, parseRpcBody } from '../src/mcp-http.js'
import { buildDefinitions, publicToolName, extractText } from '../src/tools.js'
import { effective, KEY_PATTERN, validUrl, writeSettings, readSettings } from '../src/settings.js'
import { rejection } from '../src/fence.js'

const GOOD = 'sk_sakuga_testtesttesttest'
const TOOLS = [
  { name: 'get_credits', description: 'Credit balance.\nMore.', inputSchema: { type: 'object', properties: {} } },
  { name: 'quote', description: 'Price a step.', inputSchema: { type: 'object', properties: { shots: { type: 'number' } } } },
]

function fakeServer({ sse = false } = {}) {
  const seen = []
  const server = http.createServer((req, res) => {
    let body = ''
    req.on('data', c => { body += c })
    req.on('end', () => {
      seen.push({ method: req.method, auth: req.headers.authorization, body })
      if (req.headers.authorization !== `Bearer ${GOOD}`) {
        res.writeHead(401, { 'content-type': 'application/json' })
        return res.end('{"error":"nope"}')
      }
      if (req.method !== 'POST') { res.writeHead(405); return res.end() }
      const msg = JSON.parse(body)
      if (msg.id === undefined) { res.writeHead(202); return res.end() }
      let result
      if (msg.method === 'initialize') result = { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'fake', version: '1' } }
      else if (msg.method === 'tools/list') result = { tools: TOOLS }
      else if (msg.method === 'tools/call') {
        result = msg.params.name === 'get_credits'
          ? { content: [{ type: 'text', text: 'balance 40' }], structuredContent: { balance: 40 } }
          : { isError: true, content: [{ type: 'text', text: 'max_credits is required' }] }
      }
      const payload = JSON.stringify({ jsonrpc: '2.0', id: msg.id, result })
      if (sse) {
        res.writeHead(200, { 'content-type': 'text/event-stream' })
        return res.end(`event: message\ndata: ${payload}\n\n`)
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(payload)
    })
  })
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, seen, url: `http://127.0.0.1:${server.address().port}/mcp` })))
}

for (const sse of [false, true]) {
  test(`client lists and calls tools (${sse ? 'event stream' : 'json'})`, async () => {
    const { server, seen, url } = await fakeServer({ sse })
    try {
      const client = createMcpClient({ url, headers: { authorization: `Bearer ${GOOD}` } })
      const tools = await client.listTools()
      assert.deepEqual(tools.map(t => t.name), ['get_credits', 'quote'])
      const result = await client.callTool('get_credits', {})
      assert.equal(result.content[0].text, 'balance 40')
      assert.ok(seen.some(s => s.body.includes('notifications/initialized')))
    } finally { server.close() }
  })
}

test('a wrong key gives a plain 401 message that does not contain the key', async () => {
  const { server, url } = await fakeServer()
  try {
    const client = createMcpClient({ url, headers: { authorization: 'Bearer sk_sakuga_wrongwrongwrong' } })
    await assert.rejects(client.listTools(), error => {
      assert.equal(error.status, 401)
      assert.ok(!error.message.includes('wrongwrong'))
      return true
    })
  } finally { server.close() }
})

test('an unreachable server reports a network error, not a crash', async () => {
  const client = createMcpClient({ url: 'http://127.0.0.1:9/mcp', timeoutMs: 2000 })
  await assert.rejects(client.listTools(), /Could not reach the server/)
})

test('event stream parsing picks the reply with the matching id', () => {
  const text = 'data: {"jsonrpc":"2.0","method":"notifications/progress"}\n\ndata: {"jsonrpc":"2.0","id":7,"result":{"ok":true}}\n\n'
  assert.deepEqual(parseRpcBody(text, 'text/event-stream', 7).result, { ok: true })
})

test('public tool names follow mcp__server__tool and stay within 64 characters', () => {
  assert.equal(publicToolName('ziztu', 'get_credits'), 'mcp__ziztu__get_credits')
  const long = publicToolName('ziztu', 'x'.repeat(100))
  assert.ok(long.length <= 64 && long.startsWith('mcp__ziztu__'))
  assert.notEqual(publicToolName('ziztu', 'a.b'), publicToolName('ziztu', 'a_b'))
})

test('definitions register under public names, run, and turn isError into a thrown error', async () => {
  const { server, url } = await fakeServer()
  try {
    const client = createMcpClient({ url, headers: { authorization: `Bearer ${GOOD}` } })
    const definitions = buildDefinitions({ serverName: 'ziztu', tools: await client.listTools(), client, callTimeoutMs: 5000 })
    assert.deepEqual([...definitions.keys()], ['mcp__ziztu__get_credits', 'mcp__ziztu__quote'])
    const ok = await definitions.get('mcp__ziztu__get_credits').execute({}, {})
    assert.equal(ok.structuredContent.balance, 40)
    assert.equal(definitions.get('mcp__ziztu__get_credits').output.render({}, ok)[0].text, 'balance 40')
    await assert.rejects(definitions.get('mcp__ziztu__quote').execute({}, {}), /max_credits is required/)
  } finally { server.close() }
})

test('extractText names non-text blocks and never throws on odd input', () => {
  assert.equal(extractText([{ type: 'text', text: 'a' }, { type: 'image', mimeType: 'image/png' }, null], 't'), 'a\n[image: image/png]\n[unsupported content]')
  assert.equal(extractText(undefined, 't'), '(t returned no text)')
})

test('settings: file wins over config over environment; file is private; key pattern', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-'))
  const file = path.join(dir, 'ziztu', 'settings.json')
  const env = { ZIZTU_API_KEY: 'sk_sakuga_fromenvironment' }
  assert.equal(effective({ file, config: {}, env }).source, 'environment')
  assert.equal(effective({ file, config: { apiKey: 'sk_sakuga_fromconfig1' }, env }).key, 'sk_sakuga_fromconfig1')
  writeSettings({ apiKey: GOOD }, file)
  assert.equal(effective({ file, config: { apiKey: 'sk_sakuga_fromconfig1' }, env }).key, GOOD)
  assert.equal(fs.statSync(file).mode & 0o077, 0)
  writeSettings({ apiKey: '' }, file)
  assert.equal(readSettings(file).apiKey, undefined)
  assert.ok(KEY_PATTERN.test(GOOD) && !KEY_PATTERN.test('hello'))
  assert.ok(validUrl('https://getziztu.com/mcp') && validUrl('http://127.0.0.1:5321/mcp'))
  assert.ok(!validUrl('http://evil.example/mcp') && !validUrl('https://u:p@x.example/'))
})

test('fence: loopback only, same origin only', () => {
  const ok = { headers: { host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080' } }
  assert.equal(rejection(ok, undefined), undefined)
  assert.equal(rejection({ headers: { host: 'evil.example' } }, undefined), 403)
  assert.equal(rejection({ headers: { host: '127.0.0.1:3080', origin: 'http://evil.example' } }, undefined), 403)
  assert.equal(rejection({ headers: { host: '127.0.0.1:3080', 'sec-fetch-site': 'cross-site' } }, undefined), 403)
  assert.equal(rejection(ok, { admit: () => ({ rejection: 401 }) }), 401)
})

test('apply() registers the server tools on ctx.tools and removes them on dispose', async () => {
  const { server, url } = await fakeServer()
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-home-'))
  const before = { DSH_HOME: process.env.DSH_HOME, ZIZTU_API_KEY: process.env.ZIZTU_API_KEY, ZIZTU_TOKEN: process.env.ZIZTU_TOKEN }
  process.env.DSH_HOME = home
  delete process.env.ZIZTU_API_KEY
  delete process.env.ZIZTU_TOKEN
  try {
    const { apply } = await import('../index.js')
    const registered = new Map()
    const effects = []
    const ctx = {
      logger: { info() {}, warn() {}, error() {} },
      tools: { register(def) { registered.set(def.name, def); return () => registered.delete(def.name) } },
      effect(fn) { effects.push(fn()) },
    }
    apply(ctx, { apiKey: GOOD, url })
    for (let i = 0; i < 50 && registered.size === 0; i++) await new Promise(r => setTimeout(r, 40))
    assert.deepEqual([...registered.keys()].sort(), ['mcp__ziztu__get_credits', 'mcp__ziztu__quote'])
    for (const dispose of effects) dispose()
    assert.equal(registered.size, 0)
  } finally {
    for (const [k, v] of Object.entries(before)) { if (v === undefined) delete process.env[k]; else process.env[k] = v }
    server.close()
  }
})
