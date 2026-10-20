/**
 * Turns MCP tools into harness tool definitions, named the way the harness's own
 * MCP client names them: mcp__<serverName>__<rawName>, at most 64 characters of
 * [A-Za-z0-9_-], with a short hash when a name had to change.
 *
 * @module src/tools.js
 */
import { createHash } from 'node:crypto'

const MAX_LENGTH = 64
const BAD_CHARS = /[^A-Za-z0-9_-]/g
const HASH_LENGTH = 12

export function publicToolName(serverName, rawName) {
  const joined = `mcp__${serverName}__${rawName}`
  const normalized = joined.replace(BAD_CHARS, '_')
  if (normalized === joined && normalized.length <= MAX_LENGTH) return normalized
  const hash = createHash('sha256').update(`${serverName}\0${rawName}`).digest('hex').slice(0, HASH_LENGTH)
  return `${normalized.slice(0, MAX_LENGTH - HASH_LENGTH - 1)}_${hash}`
}

/** Join the text blocks; name the others so the model knows something was there. */
export function extractText(content, toolName) {
  const parts = []
  for (const block of Array.isArray(content) ? content : []) {
    if (block === null || typeof block !== 'object') { parts.push('[unsupported content]'); continue }
    switch (block.type) {
      case 'text': if (typeof block.text === 'string') parts.push(block.text); break
      case 'image': parts.push(`[image: ${block.mimeType ?? 'unknown'}]`); break
      case 'audio': parts.push(`[audio: ${block.mimeType ?? 'unknown'}]`); break
      case 'resource':
      case 'resource_link': parts.push(block.uri ? `[resource: ${block.uri}]` : '[resource]'); break
      default: parts.push(`[unsupported content type: ${block.type}]`)
    }
  }
  return parts.join('\n') || `(${toolName} returned no text)`
}

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: { content: { type: 'array', items: {} }, structuredContent: {} },
  required: ['content'],
  additionalProperties: false,
}

/**
 * Build the definitions for one tool list.
 * @returns {Map<string, object>} public name -> definition for ctx.tools.register
 */
export function buildDefinitions({ serverName, tools, client, callTimeoutMs }) {
  const definitions = new Map()
  for (const tool of tools) {
    if (typeof tool?.name !== 'string' || tool.name === '') continue
    const name = publicToolName(serverName, tool.name)
    if (definitions.has(name)) throw new Error(`The server listed the tool "${tool.name}" more than once.`)
    definitions.set(name, {
      name,
      description: tool.description ?? '',
      parameters: tool.inputSchema ?? { type: 'object', properties: {} },
      output: {
        schema: OUTPUT_SCHEMA,
        render(_args, value) {
          return [{ type: 'text', text: extractText(value.content, tool.name) }]
        },
      },
      async execute(args, exec) {
        const result = await client.callTool(tool.name, typeof args === 'object' && args !== null ? args : {}, {
          signal: exec?.signal,
          timeout: callTimeoutMs,
        })
        const content = Array.isArray(result?.content) ? result.content : [{ type: 'text', text: JSON.stringify(result ?? null) }]
        if (result?.isError === true) throw new Error(extractText(content, tool.name))
        return {
          content,
          ...(result?.structuredContent !== undefined ? { structuredContent: result.structuredContent } : {}),
        }
      },
    })
  }
  return definitions
}
