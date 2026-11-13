import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Thin pass-through proxy.
 *
 *   /api/proxy/v1/<path>      -> https://students.kips.edu.pk/api/v1/<path>
 *   /api/proxy/legacy/<path>  -> https://377.kips.edu.pk/apis/portal/students/<path>
 *
 * The KIPS API answers with no Access-Control-Allow-Origin header, so a browser
 * hosted on any other domain (Vercel, a college subdomain, localhost) cannot call
 * it directly. This function makes the call server-side and returns the same JSON.
 * Nothing is stored — it is a pipe with the X-API-KEY that the legacy PHP endpoints
 * require added for the /legacy routes.
 */
const V1 = 'https://students.kips.edu.pk/api/v1'
const LEGACY = 'https://377.kips.edu.pk/apis/portal/students'
const LEGACY_KEY = process.env.KIPS_API_KEY ?? 'fDK9T1qraRbT3cQtL8NZyovMNAy7jwQY'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const raw = req.query.path
  const segments = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : []
  if (segments.length === 0) {
    res.status(400).json({ isSuccess: false, error: { message: 'Missing proxy path' } })
    return
  }

  // segments[0] is the namespace: 'v1' or 'legacy'. It selects the upstream host and is
  // NOT part of the upstream path — /api/proxy/v1/auth/login -> .../api/v1/auth/login
  const namespace = segments[0]
  const isLegacy = namespace === 'legacy'
  const base = isLegacy ? LEGACY : V1
  const tail = segments.slice(1)
  if (tail.length === 0) {
    res.status(400).json({ isSuccess: false, error: { message: `Missing path after /${namespace}` } })
    return
  }
  const qs = req.url && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (req.headers.authorization) headers.Authorization = String(req.headers.authorization)
  if (isLegacy) headers['X-API-KEY'] = LEGACY_KEY

  const init: RequestInit = { method: req.method ?? 'GET', headers, redirect: 'follow' }
  if (init.method !== 'GET' && init.method !== 'HEAD') {
    headers['Content-Type'] = 'application/json'
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
  }

  try {
    const upstream = await fetch(`${base}/${tail.join('/')}${qs}`, init)
    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    res.send(text)
  } catch (err) {
    res.status(502).json({
      isSuccess: false,
      error: { name: 'Bad Gateway', message: `Upstream unreachable: ${(err as Error).message}` },
    })
  }
}