import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, CheckCircle2, Eye, EyeOff, KeyRound, LogOut, ShieldCheck, Smartphone, TriangleAlert } from 'lucide-react'
import { changePassword, fetchDeviceStatus, logout } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { useSession } from '../lib/useSession'
import { longDate, maskCnic, shortDate } from '../lib/format'
import { Avatar, Card, PageHeader, Pill, SectionTitle, Skeleton, Spinner } from '../components/ui'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="text-[12.5px] text-ink-400">{label}</dt>
      <dd className="max-w-[62%] text-right text-[13px] font-medium text-ink-900">{value}</dd>
    </div>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className="input pr-11"
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-ink-400 transition hover:bg-brand-50 hover:text-ink-700"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

const POLICY = [
  { test: (v: string) => v.length >= 12, label: 'At least 12 characters' },
  { test: (v: string) => /[A-Z]/.test(v), label: 'One uppercase letter' },
  { test: (v: string) => /[a-z]/.test(v), label: 'One lowercase letter' },
  { test: (v: string) => /\d/.test(v), label: 'One number' },
  { test: (v: string) => /[^A-Za-z0-9]/.test(v), label: 'One symbol' },
]

export default function Profile() {
  const session = useSession()!
  const user = session.user
  const navigate = useNavigate()

  const device = useAsync(fetchDeviceStatus, [])
  const [revealCnic, setRevealCnic] = useState(false)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const valid = POLICY.every((p) => p.test(newPw)) && newPw === confirmPw && oldPw.length > 0

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!valid) {
      setError('Check the requirements below before saving.')
      return
    }
    setBusy(true)
    try {
      await changePassword(oldPw, newPw, confirmPw)
      setDone(true)
      setTimeout(() => {
        logout()
        navigate('/login', { replace: true })
      }, 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password')
    } finally {
      setBusy(false)
    }
  }

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <PageHeader
        title="Profile"
        subtitle="Your KIPS student record and account settings."
        action={
          <button onClick={signOut} className="btn-ghost h-11 px-4 text-[13px] text-bad-500 lg:hidden">
            <LogOut size={15} /> Sign out
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <Avatar name={user.aName} src={user.aPic} size={60} />
              <div className="min-w-0">
                <h2 className="truncate text-[17px] font-bold tracking-[-0.01em] text-ink-900">{user.aName}</h2>
                <p className="tnum mt-0.5 text-[12.5px] text-ink-500">{user.aReg}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Pill tone="brand">{session.userType}</Pill>
                  {user.studentPortalFirstLogin === 1 && <Pill tone="warn">first login</Pill>}
                </div>
              </div>
            </div>

            <dl className="mt-5">
              <Row label="Father / guardian" value={user.aFname || '—'} />
              <Row
                label="Guardian CNIC"
                value={
                  <button
                    onClick={() => setRevealCnic((v) => !v)}
                    className="inline-flex items-center gap-1.5 font-mono text-[12.5px]"
                  >
                    {revealCnic ? user.aFCnic || '—' : maskCnic(user.aFCnic)}
                    {revealCnic ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                }
              />
              <Row label="Mobile" value={<span className="tnum">{user.aMContact || '—'}</span>} />
              <Row label="Landline" value={<span className="tnum">{user.aLContact || '—'}</span>} />
              <Row label="Address" value={`${user.aCAddress || '—'}${user.aCCity ? `, ${user.aCCity}` : ''}`} />
            </dl>
          </Card>

          <Card className="p-5">
            <SectionTitle>Academic</SectionTitle>
            <dl>
              <Row label="Campus" value={user.campTitle || '—'} />
              <Row label="Discipline" value={`${user.disciplineTitle} · ${user.secId}`} />
              <Row label="Programme" value={user.pTitle || '—'} />
              <Row label="Session" value={user.sessionId} />
              <Row label="Admitted" value={shortDate(user.aDoa)} />
              <Row label="Applicant no." value={<span className="tnum">{user.aNo}</span>} />
              <Row label="Nationality" value={user.aNationality || '—'} />
            </dl>
          </Card>

          <Card className="p-5">
            <SectionTitle>Notification device</SectionTitle>
            {device.loading ? (
              <Skeleton className="h-12" />
            ) : device.error ? (
              <p className="text-[12.5px] text-ink-500">{device.error}</p>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-line bg-canvas/60 p-3.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-brand-700">
                  <Smartphone size={16} />
                </span>
                <div className="min-w-0 text-[12.5px] text-ink-600">
                  <p className="font-semibold text-ink-900">
                    {device.data?.[0]?.sfntDeviceType ?? 'No device registered'}
                  </p>
                  <p className="tnum mt-0.5 truncate text-ink-400">
                    ID {device.data?.[0]?.sfntDeviceId ? `${device.data[0].sfntDeviceId.slice(0, 10)}…` : '—'}
                  </p>
                  <p className="mt-1 text-ink-500">
                    Push alerts {device.data?.[0]?.sfntSendPushNotifications ? 'on' : 'off'} · Notice board{' '}
                    {device.data?.[0]?.sfntSendNoticeBoardNotifications ? 'on' : 'off'}
                  </p>
                </div>
              </div>
            )}
            <p className="mt-2 text-[11.5px] text-ink-400">
              Registered by the mobile app. Sign in there to change push settings.
            </p>
          </Card>
        </div>

        <div className="space-y-4" id="password">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <KeyRound size={16} />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-ink-900">Change password</h2>
                <p className="text-[12px] text-ink-400">You will be signed out after saving.</p>
              </div>
            </div>

            {done ? (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-good-500/20 bg-good-50 p-4">
                <CheckCircle2 size={18} className="mt-0.5 text-good-500" />
                <div>
                  <p className="text-[13.5px] font-semibold text-good-500">Password changed</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-500">Signing you out so you can sign in again…</p>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-5 space-y-4">
                <PasswordField
                  id="old"
                  label="Current password"
                  value={oldPw}
                  onChange={setOldPw}
                  autoComplete="current-password"
                />
                <PasswordField
                  id="new"
                  label="New password"
                  value={newPw}
                  onChange={setNewPw}
                  autoComplete="new-password"
                />
                <div>
                  <PasswordField
                    id="confirm"
                    label="Confirm new password"
                    value={confirmPw}
                    onChange={setConfirmPw}
                    autoComplete="new-password"
                  />
                  {confirmPw.length > 0 && confirmPw !== newPw && (
                    <p className="mt-1.5 text-[12px] font-medium text-bad-500">Passwords do not match.</p>
                  )}
                </div>

                <ul className="grid gap-1.5 rounded-xl border border-line bg-canvas/60 p-3">
                  {POLICY.map((p) => {
                    const ok = p.test(newPw)
                    return (
                      <li
                        key={p.label}
                        className={`flex items-center gap-2 text-[12px] ${ok ? 'text-good-500' : 'text-ink-400'}`}
                      >
                        <span
                          className={`grid h-4 w-4 place-items-center rounded-[5px] border ${
                            ok ? 'border-good-500 bg-good-500 text-white' : 'border-ink-400/40 bg-white'
                          }`}
                        >
                          {ok && <Check size={10} strokeWidth={3} />}
                        </span>
                        {p.label}
                      </li>
                    )
                  })}
                </ul>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-bad-500/20 bg-bad-50 px-3.5 py-3">
                    <TriangleAlert size={15} className="mt-0.5 shrink-0 text-bad-500" />
                    <p className="text-[12.5px] font-medium text-bad-500">{error}</p>
                  </div>
                )}

                <button type="submit" disabled={busy || !valid} className="btn-primary w-full">
                  {busy ? (
                    <>
                      <Spinner /> Saving…
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} /> Update password
                    </>
                  )}
                </button>
              </form>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle>Session</SectionTitle>
            <dl>
              <Row label="Signed in as" value={session.userType} />
              <Row label="Access valid until" value={shortDate(new Date(session.tokenExp * 1000).toISOString())} />
              <Row label="Refresh valid until" value={shortDate(new Date(session.refreshExp * 1000).toISOString())} />
              <Row label="Today" value={longDate()} />
            </dl>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">
              This browser keeps a signed session for up to 30 days. Sign out on shared computers.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}