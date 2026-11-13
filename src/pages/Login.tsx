import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, BellRing, Eye, EyeOff, IdCard, Info, KeyRound, ShieldCheck, TriangleAlert } from 'lucide-react'
import { login } from '../lib/api'
import { useSession } from '../lib/useSession'
import type { UserType } from '../lib/types'
import { Spinner } from '../components/ui'
import { friendlyError } from '../lib/format'

const FEATURES = [
  { icon: BellRing, text: 'Attendance, day by day — with instant alerts' },
  { icon: ShieldCheck, text: 'Fee challans, receipts and online payment' },
  { icon: IdCard, text: 'Timetable, marks and campus notices in one place' },
]

export default function Login() {
  const session = useSession()
  const navigate = useNavigate()
  const [userType, setUserType] = useState<UserType>('student')
  const [username, setUsername] = useState('')

  // 13 bare digits in parent mode are a CNIC — the API only matches the dashed form
  const formatId = (value: string, type: UserType) => {
    const digits = value.replace(/\D/g, '')
    if (type === 'parent' && digits.length === 13) return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`
    return value
  }
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(userType, username.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed'
      setError(friendlyError(message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.04fr_0.96fr]">
      {/* ---------- brand panel ---------- */}
      <aside className="relative hidden overflow-hidden bg-brand-900 px-12 py-12 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              'radial-gradient(900px 520px at 12% -10%, #2d8ecc 0%, transparent 60%), radial-gradient(760px 460px at 105% 110%, #0f5f9c 0%, transparent 62%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(70% 60% at 40% 30%, black, transparent)',
          }}
        />

        <div className="relative flex h-full flex-col">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white p-1 shadow-lift">
              <img src="/kips-mark.png" alt="KIPS" className="h-full w-full object-contain" />
            </span>
            <div>
              <p className="text-[17px] leading-none font-extrabold tracking-[-0.01em] text-white">KIPSIAN</p>
              <p className="mt-1 text-[11.5px] font-medium tracking-[0.14em] text-brand-200 uppercase">
                Student &amp; Parent Portal
              </p>
            </div>
          </div>

          <div className="my-auto max-w-[520px]">
            <h1 className="max-w-[19ch] text-[42px] leading-[1.06] font-bold tracking-[-0.03em] text-white">
              Everything about your college day, in one place.
            </h1>
            <p className="mt-5 max-w-[42ch] text-[15px] leading-relaxed text-brand-100/90">
              The KIPS app, rebuilt for the browser. Sign in with the registration number and password issued by your
              campus office.
            </p>

            <ul className="mt-9 space-y-4">
              {FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/10 text-brand-100">
                    <Icon size={15} />
                  </span>
                  <span className="text-[13.5px] leading-relaxed text-brand-50/90">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-6">
            <p className="text-[12px] tracking-wide text-brand-200/85">KIPS Colleges · 6th Road Boys Campus</p>
            <p className="text-[12px] text-brand-200/70">Powered by KIPS ERP</p>
          </div>
        </div>
      </aside>

      {/* ---------- form panel ---------- */}
      <main className="flex min-h-dvh flex-col justify-center bg-canvas px-5 py-10 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white p-1 shadow-soft">
              <img src="/kips-mark.png" alt="KIPS" className="h-full w-full object-contain" />
            </span>
            <div>
              <p className="text-[15px] leading-none font-extrabold text-ink-900">KIPSIAN</p>
              <p className="mt-1 text-[10.5px] font-medium tracking-[0.14em] text-ink-400 uppercase">
                Student &amp; Parent Portal
              </p>
            </div>
          </div>

          <h2 className="text-[27px] leading-tight font-bold tracking-[-0.02em] text-ink-900">Sign in</h2>
          <p className="mt-1.5 text-[14px] text-ink-500">Use the credentials issued by your campus office.</p>

          <div className="mt-7 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-white p-1 shadow-soft">
            {(['student', 'parent'] as UserType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setUserType(type)}
                className={`h-10 rounded-xl text-[13.5px] font-semibold capitalize transition ${
                  userType === type
                    ? 'bg-brand-100 text-brand-900 ring-1 ring-brand-200'
                    : 'text-ink-500 hover:bg-brand-50/60 hover:text-ink-800'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="reg" className="label">
                {userType === 'student' ? 'Registration number' : 'Parent CNIC'}
              </label>
              <input
                id="reg"
                className="input tnum"
                placeholder={userType === 'student' ? 'e.g. 26-4-9-1-1574857' : 'e.g. 11101-1486033-5'}
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setUsername((v) => formatId(v, userType))}
                required
              />
            </div>

            <div>
              <label htmlFor="pw" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="pw"
                  className="input pr-12"
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-ink-400 transition hover:bg-brand-50 hover:text-ink-700"
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-bad-500/20 bg-bad-50 px-3.5 py-3">
                <TriangleAlert size={16} className="mt-0.5 shrink-0 text-bad-500" />
                <p className="text-[13px] font-medium text-bad-500">{error}</p>
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? (
                <>
                  <Spinner /> Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-line bg-white/70 px-3.5 py-3">
            <Info size={15} className="mt-0.5 shrink-0 text-brand-600" />
            <p className="text-[12.5px] leading-relaxed text-ink-500">
              No account, or forgotten password? Ask your campus office to reissue it —{' '}
              <a
                href="https://wa.me/923450900376"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand-700 underline decoration-brand-200 underline-offset-2"
              >
                message KIPS support
              </a>
              .
            </p>
          </div>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-[11.5px] text-ink-400">
            <KeyRound size={12} /> Secured by your KIPS ERP account ·{' '}
            <Link to="/login" className="hover:text-ink-700">
              v1.0 web
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}