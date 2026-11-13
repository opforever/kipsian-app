import type { SessionUser, Student, UserType } from './types'

const STORAGE_KEY = 'kipsian.session.v1'
const V1 = '/api/proxy/v1'
const LEGACY = '/api/proxy/legacy'

export class ApiError extends Error {
  status: number
  field?: string
  constructor(message: string, status: number, field?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.field = field
  }
}

type Listener = () => void
const listeners = new Set<Listener>()

function readStored(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionUser
    // a refresh token past its expiry means the whole session is dead
    if (!parsed?.refresh || parsed.refreshExp * 1000 < Date.now()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

let current: SessionUser | null = readStored()

export const getSession = () => current

export function setSession(next: SessionUser | null) {
  current = next
  if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  else localStorage.removeItem(STORAGE_KEY)
  listeners.forEach((l) => l())
}

export function subscribeSession(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

interface Opts {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  base?: 'v1' | 'legacy'
  auth?: boolean
}

function send(path: string, opts: Opts, token?: string) {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  // never let a stalled campus network freeze the UI
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), 20_000)
  return fetch((opts.base === 'legacy' ? LEGACY : V1) + path, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    signal: abort.signal,
  }).finally(() => clearTimeout(timer))
}

async function refreshTokens(): Promise<'ok' | 'dead' | 'transient'> {
  if (!current) return 'dead'
  try {
    const res = await send('/auth/refresh-token', { method: 'POST', body: { refreshToken: current.refresh } })
    // only an explicit auth rejection kills the session — a 5xx or a DB hiccup must not sign the user out
    if (res.status === 401 || res.status === 403) return 'dead'
    if (!res.ok) return 'transient'
    const payload = await res.json()
    const data = payload?.data
    if (!data?.tokenData?.token) return 'transient'
    setSession({
      ...current,
      token: data.tokenData.token,
      tokenExp: data.tokenData.exp,
      refresh: data.refreshTokenData?.token ?? current.refresh,
      refreshExp: data.refreshTokenData?.exp ?? current.refreshExp,
    })
    return 'ok'
  } catch {
    return 'transient'
  }
}

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const authed = opts.auth !== false
  let res = await send(path, opts, authed ? current?.token : undefined)

  if (res.status === 401 && authed && current?.refresh) {
    const refreshed = await refreshTokens()
    if (refreshed === 'ok') res = await send(path, opts, current?.token)
    else if (refreshed === 'dead') setSession(null)
  }

  const text = await res.text()
  let payload: any = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = null
  }

  if (!res.ok || payload?.isSuccess === false) {
    throw new ApiError(
      payload?.error?.message ?? `Request failed (${res.status})`,
      res.status,
      payload?.error?.property,
    )
  }
  return (payload?.data ?? payload) as T
}

interface LoginPayload {
  user: Student
  users: Student[]
  userType: UserType
  tokenData: { token: string; iat: number; exp: number }
  refreshTokenData: { token: string; iat: number; exp: number }
}

export async function login(userType: UserType, username: string, password: string): Promise<SessionUser> {
  const res = await send('/auth/login', { method: 'POST', body: { userType, username, password } })
  const text = await res.text()
  let payload: any = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = null
  }
  if (!res.ok || payload?.isSuccess === false) {
    throw new ApiError(
      payload?.error?.message ?? `Sign-in failed (${res.status})`,
      res.status,
      payload?.error?.property,
    )
  }
  const data = payload.data as LoginPayload
  const session: SessionUser = {
    user: data.user,
    users: data.users?.length ? data.users : [data.user],
    userType: data.userType ?? userType,
    token: data.tokenData.token,
    tokenExp: data.tokenData.exp,
    refresh: data.refreshTokenData.token,
    refreshExp: data.refreshTokenData.exp,
  }
  setSession(session)
  return session
}

export function logout() {
  setSession(null)
}

export async function changePassword(oldPassword: string, newPassword: string, confirmPassword: string) {
  return api<unknown>('/auth/change-password', {
    method: 'POST',
    body: { oldPassword, newPassword, confirmPassword },
  })
}

/* ---------- read endpoints used by the screens ---------- */

export const fetchMe = () => api<{ user: Student; users: Student[]; userType: UserType }>('/auth/get-logged-in-user')
export const fetchAttendance = () =>
  api<{ totalPresents: number; totalAbsents: number; totalLeaves: number; totalAttendance: number }>(
    '/attendance/get-attendance',
  )
export const fetchAttendanceHistory = () =>
  api<{ attDatetime: string; attStatus: string }[]>('/attendance/get-attendance-history')
export const fetchFee = () => api<{ totalFee: number; paidFee: number }>('/fee/get-fee')
export const fetchFeeHistory = () =>
  api<
    { feeDate: string; feeSessionId: number; feeNo: number; feeReceivedAmount: number; feeBalance: number }[]
  >('/fee/get-fee-history')
export const fetchChallans = async () => {
  const rows = await api<import('./types').Challan[]>('/challan/get-all-challans')
  // the ERP sends some challans twice (same cId) — collapse them
  const seen = new Set<string>()
  return rows.filter((c) => {
    const key = c.cId || `${c.cNo}-${c.cMonth}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
export const fetchTimetable = () => api<import('./types').TimetableSection[]>('/timetable/get-timetable')
export const fetchNotifications = () => api<import('./types').AppNotification[]>('/notifications')
export const fetchNotices = () => api<import('./types').AppNotification[]>('/notice-board/get-notifications')
export const fetchResults = () => api<import('./types').TestResults>('/test/get-test')
export const fetchDeviceStatus = () => api<import('./types').DeviceStatus[]>('/notification-token/get-notification-status')
export const fetchRating = () => api<import('./types').RatingStatus>('/suggestions/rating-status')
export const fetchSubjects = () =>
  api<{ board: string; term: number; sos_type: number; subjects: { subjectId: number; subjectTitle: string }[] }>(
    '/api_student_details.php',
    { method: 'POST', base: 'legacy', body: { reg: current?.user.aReg, applicantNo: current?.user.aNo, sessionId: current?.user.sessionId } },
  )

export const PAYMENT_URL = 'https://ipg.kips.edu.pk/bop/checkoutPage.php'