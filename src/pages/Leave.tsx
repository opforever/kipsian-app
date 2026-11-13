import { useState, type FormEvent } from 'react'
import { CalendarPlus, Info, Loader2, TriangleAlert } from 'lucide-react'
import { applyLeave, fetchLeaves } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { shortDate } from '../lib/format'
import { Card, EmptyState, ErrorNote, PageHeader, Pill, SectionTitle, Skeleton } from '../components/ui'

const TYPES = ['Sick leave', 'Casual leave', 'Emergency leave', 'Other']

const statusTone = (s: string) => {
  const v = (s || '').toUpperCase()
  if (v.startsWith('A')) return 'good' as const
  if (v.startsWith('R') || v.startsWith('C')) return 'bad' as const
  return 'warn' as const
}
const statusLabel = (s: string) => {
  const v = (s || '').toUpperCase()
  if (v.startsWith('A')) return 'Approved'
  if (v.startsWith('R')) return 'Rejected'
  if (v.startsWith('C')) return 'Cancelled'
  if (v.startsWith('P')) return 'Pending'
  return s || 'Pending'
}

const isSunday = (value: string) => new Date(`${value}T00:00:00`).getDay() === 0

export default function Leave() {
  const { data, loading, error, reload } = useAsync(fetchLeaves, [])
  const [open, setOpen] = useState(false)
  const [type, setType] = useState(TYPES[0])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const problems: string[] = []
  if (from && to && to < from) problems.push('The end date cannot be before the start date.')
  if (from && isSunday(from)) problems.push('Leave cannot start on a Sunday.')
  if (to && isSunday(to)) problems.push('Leave cannot end on a Sunday.')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (problems.length) {
      setFormError(problems[0])
      return
    }
    setBusy(true)
    try {
      await applyLeave({
        aLeaveDateFrom: from,
        aLeaveDateTo: to,
        aLeaveDescription: details || reason,
        aLeaveReason: reason || type,
        aLeaveType: type,
      })
      setSent(true)
      setOpen(false)
      setFrom('')
      setTo('')
      setReason('')
      setDetails('')
      reload()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not submit the application')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Leave"
        subtitle="Apply for leave and track what the campus has approved."
        action={
          <button onClick={() => setOpen((v) => !v)} className="btn-primary h-11 px-4 text-[13px]">
            <CalendarPlus size={15} /> {open ? 'Close form' : 'Apply for leave'}
          </button>
        }
      />

      {sent && (
        <p className="mb-4 rounded-xl border border-good-500/20 bg-good-50 px-4 py-3 text-[13px] font-medium text-good-500">
          Application submitted — your campus will review it.
        </p>
      )}

      {open && (
        <Card className="mb-4 p-5 sm:p-6">
          <SectionTitle hint="Dates cannot fall on a Sunday">New application</SectionTitle>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="ltype">
                Leave type
              </label>
              <select id="ltype" className="input" value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="lreason">
                Reason
              </label>
              <input
                id="lreason"
                className="input"
                placeholder="e.g. Fever"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="lfrom">
                From
              </label>
              <input
                id="lfrom"
                type="date"
                className="input tnum"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="lto">
                To
              </label>
              <input
                id="lto"
                type="date"
                className="input tnum"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="ldetails">
                Details (optional)
              </label>
              <textarea
                id="ldetails"
                className="input h-24 py-3"
                placeholder="Anything the campus should know"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>

            {(formError || problems.length > 0) && (
              <div className="flex items-start gap-2.5 rounded-xl border border-bad-500/20 bg-bad-50 px-3.5 py-3 sm:col-span-2">
                <TriangleAlert size={15} className="mt-0.5 shrink-0 text-bad-500" />
                <p className="text-[12.5px] font-medium text-bad-500">{formError ?? problems[0]}</p>
              </div>
            )}

            <div className="sm:col-span-2">
              <button type="submit" disabled={busy} className="btn-primary w-full sm:w-auto">
                {busy ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Submitting…
                  </>
                ) : (
                  'Submit application'
                )}
              </button>
            </div>
          </form>
        </Card>
      )}

      {error && <ErrorNote message={error} onRetry={reload} />}

      <Card className="p-5 sm:p-6">
        <SectionTitle hint={data ? `${data.length} on record` : undefined}>My applications</SectionTitle>
        {loading ? (
          <Skeleton className="h-24" />
        ) : data?.length ? (
          <ul className="space-y-3">
            {data.map((l) => (
              <li key={l.aLeaveId} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[13.5px] font-semibold text-ink-900">
                      {l.aLeaveType || 'Leave'} · {l.aLeaveDays || 1} day{(l.aLeaveDays ?? 1) > 1 ? 's' : ''}
                    </p>
                    <p className="tnum mt-0.5 text-[12px] text-ink-500">
                      {shortDate(l.aLeaveDateFrom)} — {shortDate(l.aLeaveDateTo)}
                    </p>
                  </div>
                  <Pill tone={statusTone(l.aLeaveStatus)}>{statusLabel(l.aLeaveStatus)}</Pill>
                </div>
                {(l.aLeaveReason || l.aLeaveDescription) && (
                  <p className="mt-2 text-[12.5px] text-ink-600">{l.aLeaveReason || l.aLeaveDescription}</p>
                )}
                {l.aLeaveOn && <p className="mt-1 text-[11.5px] text-ink-400">Applied {shortDate(l.aLeaveOn)}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No leaves applied yet" body="Applications you submit appear here with the campus decision." />
        )}
      </Card>

      {data && data.length === 0 && !open && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-white/70 px-4 py-3 text-[12.5px] leading-relaxed text-ink-500">
          <Info size={14} className="mt-0.5 shrink-0 text-brand-600" />
          Leave applications are reviewed by your campus office. If the form is rejected with a permission message, your
          account is not enabled for leave yet — ask the campus to turn it on.
        </p>
      )}
    </div>
  )
}