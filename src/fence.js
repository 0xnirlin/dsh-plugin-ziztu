/**
 * The request fence for the plugin's HTTP routes. The web server runs a prefix
 * longer than its own /api before its admission check, so the plugin asks the
 * harness's `connection` service when there is one, and otherwise applies the
 * same rule itself: loopback Host only, no cross-site fetch, and an Origin or
 * Referer that matches Host. State-changing calls also need the custom header the
 * settings page sends, which a cross-origin form cannot set.
 *
 * @module src/fence.js
 */

const LOOPBACK = new Set(['127.0.0.1', '[::1]', '::1', 'localhost'])

function authority(value) {
  if (typeof value !== 'string' || value.trim() === '') return null
  try {
    const url = new URL(value.includes('://') ? value.trim() : `http://${value.trim()}`)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return { scheme: url.protocol, host: url.hostname.toLowerCase(), port: url.port || (url.protocol === 'https:' ? '443' : '80') }
  } catch {
    return null
  }
}

/** @returns {number|undefined} an HTTP status to refuse with, or undefined to proceed */
export function rejection(req, connection) {
  try {
    const admit = connection?.admit
    if (typeof admit === 'function') {
      const result = admit.call(connection, req)
      const status = result && typeof result === 'object' ? result.rejection : undefined
      return status
    }
    const legacy = connection?.requestRejection
    if (typeof legacy === 'function') return legacy.call(connection, req)
  } catch {
    return 503
  }
  const host = authority(req.headers.host)
  if (host === null || !LOOPBACK.has(host.host)) return 403
  if (String(req.headers['sec-fetch-site'] ?? '').toLowerCase() === 'cross-site') return 403
  for (const name of ['origin', 'referer']) {
    const raw = req.headers[name]
    if (typeof raw !== 'string' || raw.trim() === '') continue
    const other = authority(raw)
    if (other === null || other.scheme !== host.scheme || other.host !== host.host || other.port !== host.port) return 403
  }
  return undefined
}

export function hasWriteHeader(req) {
  return req.headers['x-ziztu-dsh'] === '1'
}
