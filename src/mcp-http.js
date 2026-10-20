/**
 * A small MCP client for Streamable HTTP, written against Node's built-in fetch.
 *
 * A plugin installed by path resolves no bare dependencies, so this file imports
 * nothing. It speaks the three calls the harness needs: initialize, tools/list
 * and tools/call. Ziztu's hosted server is stateless and answers in JSON, but the
 * client also reads a text/event-stream answer and keeps an Mcp-Session-Id when a
 * server hands one out, so it works against any Streamable HTTP server.
 *
 * @module src/mcp-http.js
 */

export const PROTOCOL_VERSION = '2025-06-18'

/** An error that carries the HTTP status and a short, key-free message. */
export class McpHttpError extends Error {
  constructor(message, { status, code } = {}) {
    super(message)
    this.name = 'McpHttpError'
    this.status = status
    this.code = code
  }
}

/**
 * Read the JSON-RPC message out of a response body. A JSON body is parsed as is.
 * An event stream is scanned for the message whose id matches the request.
 */
export function parseRpcBody(text, contentType, id) {
  const type = String(contentType ?? '').toLowerCase()
  if (type.includes('text/event-stream')) {
    let found
    for (const block of text.split(/\r?\n\r?\n/)) {
      const data = block
        .split(/\r?\n/)
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).replace(/^ /, ''))
        .join('\n')
      if (data === '') continue
      let message
      try { message = JSON.parse(data) } catch { continue }
      if (message && message.id === id && (message.result !== undefined || message.error !== undefined)) found = message
    }
    if (found === undefined) throw new McpHttpError('The server answered with an event stream that has no reply to this request.')
    return found
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new McpHttpError('The server did not answer with JSON.')
  }
}

/** Turn an HTTP failure into a message a person can act on. Never includes the key. */
export function describeHttpFailure(status) {
  if (status === 401) return 'The server refused the API key (401). Check that the key is complete, has not been revoked, and was made for the full connector.'
  if (status === 403) return 'The server refused this call (403). The key may be missing a scope such as generate or export.'
  if (status === 404) return 'No MCP server at this address (404).'
  if (status === 429) return 'Too many requests (429). Wait a minute and try again.'
  if (status >= 500) return `The server had a problem (${status}). Try again in a moment.`
  return `The server answered ${status}.`
}

export function createMcpClient({ url, headers = {}, fetchImpl = globalThis.fetch, clientInfo = { name: 'dsh-plugin-ziztu', version: '0.1.0' }, timeoutMs = 30_000 }) {
  let nextId = 1
  let sessionId
  let initialized = false

  async function post(body, { signal, timeout = timeoutMs, expectReply = true } = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(new Error('timeout')), timeout)
    const onAbort = () => controller.abort(signal.reason)
    if (signal) {
      if (signal.aborted) controller.abort(signal.reason)
      else signal.addEventListener('abort', onAbort, { once: true })
    }
    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          'mcp-protocol-version': PROTOCOL_VERSION,
          ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
          ...headers,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      const session = response.headers.get('mcp-session-id')
      if (session) sessionId = session
      if (!response.ok) {
        // Drain the body so the socket is released; never surface it (it can echo headers).
        await response.text().catch(() => '')
        if (response.status === 404 && sessionId && initialized) {
          sessionId = undefined
          initialized = false
          throw new McpHttpError('The session ended.', { status: 404, code: 'session-expired' })
        }
        throw new McpHttpError(describeHttpFailure(response.status), { status: response.status })
      }
      if (!expectReply) {
        await response.text().catch(() => '')
        return undefined
      }
      const text = await response.text()
      const message = parseRpcBody(text, response.headers.get('content-type'), body.id)
      if (message.error) throw new McpHttpError(String(message.error.message ?? 'The server returned an error.'), { code: message.error.code })
      return message.result
    } catch (error) {
      if (error instanceof McpHttpError) throw error
      if (controller.signal.aborted) {
        const reason = controller.signal.reason
        if (reason instanceof Error && reason.message === 'timeout') throw new McpHttpError('The call took too long and was stopped.', { code: 'timeout' })
        throw new McpHttpError('The call was cancelled.', { code: 'aborted' })
      }
      throw new McpHttpError(`Could not reach the server: ${error?.cause?.code ?? error?.message ?? 'network error'}.`, { code: 'network' })
    } finally {
      clearTimeout(timer)
      if (signal) signal.removeEventListener('abort', onAbort)
    }
  }

  async function initialize(options) {
    const result = await post({
      jsonrpc: '2.0',
      id: nextId++,
      method: 'initialize',
      params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo },
    }, options)
    initialized = true
    await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, { ...options, expectReply: false }).catch(() => {})
    return result
  }

  /** Run a request; if a stateful server dropped the session, start over once. */
  async function request(method, params, options) {
    if (!initialized) await initialize(options)
    try {
      return await post({ jsonrpc: '2.0', id: nextId++, method, ...(params ? { params } : {}) }, options)
    } catch (error) {
      if (error?.code !== 'session-expired') throw error
      await initialize(options)
      return post({ jsonrpc: '2.0', id: nextId++, method, ...(params ? { params } : {}) }, options)
    }
  }

  return {
    initialize,
    async listTools(options) {
      const tools = []
      let cursor
      do {
        const page = await request('tools/list', cursor ? { cursor } : undefined, options)
        if (!Array.isArray(page?.tools)) throw new McpHttpError('The server returned a tool list in a shape this plugin cannot read.')
        tools.push(...page.tools)
        cursor = page.nextCursor
      } while (cursor)
      return tools
    },
    callTool(name, args, options) {
      return request('tools/call', { name, arguments: args ?? {} }, options)
    },
    async close() {
      if (!sessionId) return
      const id = sessionId
      sessionId = undefined
      initialized = false
      try {
        await fetchImpl(url, { method: 'DELETE', headers: { 'mcp-session-id': id, ...headers } })
      } catch { /* the server may already be gone */ }
    },
  }
}
