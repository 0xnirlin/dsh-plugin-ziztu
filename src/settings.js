/**
 * Where the plugin keeps the API key and the server address: a small JSON file in
 * the Harness home ($DSH_HOME/ziztu/settings.json, owner read and write only).
 * The key is never logged and never sent back to the browser; the settings page
 * only learns whether a key is set and its last four characters.
 *
 * @module src/settings.js
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const DEFAULT_URL = 'https://getziztu.com/mcp'
export const KEY_URL = 'https://getziztu.com/app'
export const KEY_PATTERN = /^sk_sakuga_[A-Za-z0-9_-]{8,200}$/

export function resolveHome() {
  const fromEnv = process.env.DSH_HOME
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv.trim()
  return path.join(os.homedir(), '.dsh')
}

export function settingsFile() {
  return path.join(resolveHome(), 'ziztu', 'settings.json')
}

export function readSettings(file = settingsFile()) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function writeSettings(patch, file = settingsFile()) {
  const next = { ...readSettings(file), ...patch }
  for (const key of Object.keys(next)) if (next[key] === undefined || next[key] === '') delete next[key]
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
  const temporary = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temporary, JSON.stringify(next, null, 2), { mode: 0o600 })
  fs.renameSync(temporary, file)
  return next
}

/**
 * The key and address in force. The settings page wins, then the plugin row's
 * config, then the ZIZTU_API_KEY / ZIZTU_TOKEN environment variables.
 */
export function effective({ file = settingsFile(), config = {}, env = process.env } = {}) {
  const saved = readSettings(file)
  const key = firstString(saved.apiKey, config.apiKey, env.ZIZTU_API_KEY, env.ZIZTU_TOKEN)
  const url = firstString(saved.url, config.url, env.ZIZTU_MCP_URL) ?? DEFAULT_URL
  const source = firstString(saved.apiKey) ? 'settings' : firstString(config.apiKey) ? 'config' : key ? 'environment' : 'none'
  return { key, url, source }
}

function firstString(...values) {
  for (const value of values) if (typeof value === 'string' && value.trim() !== '') return value.trim()
  return undefined
}

/** Only an https Ziztu-style address, or loopback http for local testing. */
export function validUrl(value) {
  try {
    const url = new URL(value)
    if (url.username || url.password || url.hash) return false
    if (url.protocol === 'https:') return true
    return url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
  } catch {
    return false
  }
}

export function lastFour(key) {
  return typeof key === 'string' && key.length >= 4 ? key.slice(-4) : ''
}
