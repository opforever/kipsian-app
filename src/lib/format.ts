export const money = (n: number | null | undefined) =>
  typeof n === 'number' ? `Rs ${n.toLocaleString('en-PK')}` : '—'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function shortDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return value
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function monthLabel(value?: string | null) {
  if (!value) return '—'
  const [y, m] = value.split('-')
  const idx = Number(m) - 1
  return MONTHS[idx] ? `${MONTHS[idx]} ${y}` : value
}

export function dayMonth(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return value
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function longDate(d = new Date()) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return `${days[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function timeAgo(value?: string | null) {
  if (!value) return ''
  const d = new Date(value.replace(' ', 'T'))
  const diff = Date.now() - d.getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `${Math.max(mins, 1)} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days} d ago`
  return shortDate(value)
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

export function maskCnic(value: string) {
  if (!value) return '—'
  return value.replace(/\d(?=\d{3})/g, '•')
}

export function attendancePercent(presents: number, total: number) {
  if (!total) return 0
  return Math.round((presents / total) * 100)
}

/** KIPS stores lecture days as "1-6" (Mon–Sat), "1-3", "0" (no class). */
export function lectureDays(spec: string): number[] {
  if (!spec || spec === '0') return []
  const [from, to] = spec.split('-').map(Number)
  if (Number.isNaN(from)) return []
  const end = Number.isNaN(to) ? from : to
  return Array.from({ length: Math.max(0, end - from + 1) }, (_, i) => from + i)
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** JS getDay(): 0=Sun … 6=Sat → KIPS 1=Mon … 6=Sat */
export const kipsDayOf = (d = new Date()) => d.getDay()
/** Turn terse API errors into something a student can act on. */
const FRIENDLY: [RegExp, string][] = [
  [/database operation failed/i, 'KIPS servers are busy right now. Please try again in a moment.'],
  [/user does not exists/i, 'No account found for that registration number.'],
  [/invalid username or password/i, 'That password is not right. Please try again.'],
  [/jwt malformed|invalid token|unauthor/i, 'Your session expired. Please sign in again.'],
  [/econnrefused|failed to fetch|networkerror/i, 'Cannot reach KIPS right now. Check your connection.'],
]

export function friendlyError(message: string) {
  for (const [pattern, text] of FRIENDLY) if (pattern.test(message)) return text
  return message
}
