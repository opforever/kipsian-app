/**
 * Thin pass-through proxy (single function, no catch-all filename — Vercel would not route
 * `api/proxy/[...path].ts`, so the path arrives via a rewrite in vercel.json):
 *
 *   /api/proxy/v1/<path>      -> https://students.kips.edu.pk/api/v1/<path>
 *   /api/proxy/legacy/<path>  -> https://377.kips.edu.pk/apis/portal/students/<path>
 *
 * The KIPS API answers with no Access-Control-Allow-Origin header, so a browser hosted on any
 * other domain cannot call it directly. This makes the call server-side and returns the same
 * JSON. Nothing is stored; the legacy PHP routes additionally get the X-API-KEY they require.
 */
const V1 = 'https://students.kips.edu.pk/api/v1'
const LEGACY = 'https://377.kips.edu.pk/apis/portal/students'
const LEGACY_KEY = (globalThis as any).process?.env?.KIPS_API_KEY ?? 'fDK9T1qraRbT3cQtL8NZyovMNAy7jwQY'

const one = (v: unknown): string => (Array.isArray(v) ? v.join('/') : typeof v === 'string' ? v : '')

export default async function handler(req: any, res: any) {
  // the rewrite supplies ns/p; fall back to the URL so a direct hit still works
  let ns = one(req.query?.ns)
  let rest = one(req.query?.p)

  if (!ns || !rest) {
    const path = String(req.url ?? '').split('?')[0]
    const m = path.match(/^\/api\/proxy\/([^/]+)\/?(.*)$/)
    if (m) {
      ns = ns || m[1]
      rest = rest || m[2]
    }
  }

  rest = rest.replace(/^\/+/, '')
  if (!ns || (!rest && ns !== 'v1' && ns !== 'legacy')) {
    res.status(400).json({ isSuccess: false, error: { message: 'Missing proxy path' } })
    return
  }
  if (!rest) {
    res.status(400).json({ isSuccess: false, error: { message: `Missing path after /${ns}` } })
    return
  }

  const base = ns === 'legacy' ? LEGACY : V1
  const qs = String(req.url ?? '').includes('?')
    ? String(req.url).slice(String(req.url).indexOf('?'))
    : ''

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (req.headers?.authorization) headers.Authorization = String(req.headers.authorization)
  if (ns === 'legacy') headers['X-API-KEY'] = LEGACY_KEY

  const method = req.method ?? 'GET'
  const init: RequestInit = { method, headers, redirect: 'follow' }
  if (method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json'
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
  }

  try {
    const upstream = await fetch(`${base}/${rest}${qs}`, init)
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