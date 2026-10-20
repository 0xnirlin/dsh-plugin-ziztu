/**
 * Ziztu for DeepSeek Harness: Host half.
 *
 * Connects the harness to Ziztu's hosted MCP server (https://getziztu.com/mcp)
 * with the user's own API key and registers the server's tools as
 * mcp__ziztu__<tool>. The key is entered on the plugin's settings page (or set in
 * the plugin row's config, or in ZIZTU_API_KEY) and stays on this machine.
 *
 * The plugin needs only the `tools` service. The settings page's HTTP routes are
 * mounted when a web server exists, in their own fiber, so a headless harness
 * still gets the tools.
 *
 * @module index.js
 */

import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createMcpClient } from './src/mcp-http.js'
import { buildDefinitions } from './src/tools.js'
import { DEFAULT_URL, KEY_PATTERN, KEY_URL, effective, lastFour, readSettings, validUrl, writeSettings } from './src/settings.js'
import { hasWriteHeader, rejection } from './src/fence.js'

export const name = 'ziztu'
export const inject = ['tools']

const SERVER_NAME = 'ziztu'
const CALL_TIMEOUT_MS = 180_000
const API = '/api/ziztu'
/** The name the key goes by in the harness credential store (and in the environment). */
const CREDENTIAL_NAME = 'ZIZTU_API_KEY'

function packageVersion() {
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url))
    return String(JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version ?? '')
  } catch {
    return ''
  }
}
export const version = packageVersion()

export function apply(ctx, config = {}) {
  const logger = ctx.logger ?? console
  let generation = 0
  let disposers = []
  let client
  let state = { status: 'idle', message: '', tools: [] }
  let resolved = effective({ config })

  /** The harness credential store, when this composition has one. Looked up at call time. */
  function store() {
    try { return ctx.get?.('credentials') } catch { return undefined }
  }

  /** The key in force: the credential store first (what the settings page saves), then the file, config and environment. */
  async function loadSettings() {
    const base = effective({ config })
    const credentials = store()
    if (credentials) {
      try {
        const hit = await credentials.resolve(CREDENTIAL_NAME)
        if (hit && typeof hit.value === 'string' && hit.value.trim() !== '') {
          return { ...base, key: hit.value.trim(), source: hit.source === 'environment' ? 'environment' : 'credentials' }
        }
      } catch (error) {
        logger.warn?.(`ziztu: credential store unavailable: ${error?.message ?? error}`)
      }
    }
    return base
  }

  async function saveKey(key) {
    const credentials = store()
    if (credentials) {
      try {
        const info = await credentials.describe(CREDENTIAL_NAME)
        if (info?.writable !== false) {
          await credentials.set(CREDENTIAL_NAME, key)
          writeSettings({ apiKey: '' })
          return
        }
      } catch (error) {
        logger.warn?.(`ziztu: could not use the credential store, saving to the settings file: ${error?.message ?? error}`)
      }
    }
    writeSettings({ apiKey: key })
  }

  async function removeKey() {
    const credentials = store()
    if (credentials) {
      try { await credentials.unset(CREDENTIAL_NAME) } catch { /* nothing stored there */ }
    }
    writeSettings({ apiKey: '' })
  }

  function dropTools() {
    for (const dispose of disposers) {
      try { dispose() } catch { /* already gone */ }
    }
    disposers = []
    const old = client
    client = undefined
    if (old) void old.close().catch(() => {})
  }

  async function connect() {
    const mine = ++generation
    dropTools()
    resolved = await loadSettings()
    if (mine !== generation) return state
    const { key, url } = resolved
    if (!key) {
      state = { status: 'no-key', message: 'Add your Ziztu API key to connect.', tools: [] }
      return state
    }
    state = { status: 'connecting', message: 'Connecting to Ziztu.', tools: [] }
    const next = createMcpClient({ url, headers: { authorization: `Bearer ${key}` } })
    try {
      const listed = await next.listTools()
      if (mine !== generation) { void next.close().catch(() => {}); return state }
      const definitions = buildDefinitions({ serverName: SERVER_NAME, tools: listed, client: next, callTimeoutMs: CALL_TIMEOUT_MS })
      const registered = []
      try {
        for (const definition of definitions.values()) registered.push(ctx.tools.register(definition))
      } catch (error) {
        for (const dispose of registered) { try { dispose() } catch { /* ignore */ } }
        throw error
      }
      client = next
      disposers = registered
      state = {
        status: 'connected',
        message: `${definitions.size} Ziztu tools are ready.`,
        tools: [...definitions.values()].map(d => ({ name: d.name, description: String(d.description).split('\n')[0].slice(0, 200) })),
      }
      logger.info?.(`ziztu: connected, ${definitions.size} tools`)
    } catch (error) {
      if (mine !== generation) return state
      void next.close().catch(() => {})
      state = { status: 'error', message: error?.message ?? 'Could not connect.', tools: [] }
      logger.warn?.(`ziztu: ${state.message}`)
    }
    return state
  }

  function publicState() {
    const { key, url, source } = resolved
    return {
      status: state.status,
      message: state.message,
      tools: state.tools,
      toolCount: state.tools.length,
      hasKey: Boolean(key),
      keyEnd: lastFour(key),
      keySource: source,
      url,
      defaultUrl: DEFAULT_URL,
      keyPage: KEY_URL,
      version,
    }
  }

  async function readJson(req) {
    const chunks = []
    let size = 0
    for await (const chunk of req) {
      size += chunk.length
      if (size > 16_384) throw Object.assign(new Error('too large'), { status: 413 })
      chunks.push(chunk)
    }
    const text = Buffer.concat(chunks).toString('utf8')
    if (text.trim() === '') return {}
    try { return JSON.parse(text) } catch { throw Object.assign(new Error('bad json'), { status: 400 }) }
  }

  function send(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify(body))
  }

  async function handler(req, res) {
    const refused = rejection(req, ctx.get?.('connection'))
    if (refused !== undefined) return send(res, refused, { error: 'forbidden' })
    const route = String(req.url ?? '').split('?')[0].slice(API.length) || '/'
    try {
      if (req.method === 'GET' && (route === '/state' || route === '/')) return send(res, 200, publicState())
      if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })
      if (!hasWriteHeader(req)) return send(res, 403, { error: 'forbidden' })
      if (route === '/reconnect') {
        await connect()
        return send(res, 200, publicState())
      }
      if (route === '/settings') {
        const body = await readJson(req)
        const patch = {}
        let newKey
        if (typeof body.apiKey === 'string' && body.apiKey.trim() !== '') {
          newKey = body.apiKey.trim()
          if (!KEY_PATTERN.test(newKey)) return send(res, 400, { error: 'That does not look like a Ziztu API key. Keys start with sk_sakuga_.' })
        }
        if (typeof body.url === 'string') {
          const url = body.url.trim()
          if (url !== '' && url !== DEFAULT_URL && !validUrl(url)) return send(res, 400, { error: 'The server address must start with https://.' })
          patch.url = url === DEFAULT_URL ? '' : url
        }
        if (Object.keys(patch).length > 0) writeSettings(patch)
        if (body.clearKey === true) await removeKey()
        if (newKey) await saveKey(newKey)
        await connect()
        return send(res, 200, publicState())
      }
      return send(res, 404, { error: 'not found' })
    } catch (error) {
      const status = error?.status ?? 500
      if (status === 500) logger.error?.(`ziztu: settings route failed: ${error?.message ?? error}`)
      return send(res, status, { error: status === 500 ? 'internal error' : String(error.message) })
    }
  }

  // If the credential store appears after this plugin loaded, look again so a stored key is picked up.
  ctx.inject?.(['credentials'], () => { void connect() })

  ctx.inject?.(['webServer'], scoped => {
    scoped.effect(() => scoped.webServer.register({ kind: 'prefix', path: API, handler }), 'ziztu: settings routes')
  })

  ctx.effect(() => () => {
    generation += 1
    dropTools()
  }, 'ziztu: connection')

  // Connect in the background: a slow or absent network must not hold activation.
  void connect()

  // Reading the file once at load keeps a clear error out of the log if it is unreadable.
  readSettings()
}
