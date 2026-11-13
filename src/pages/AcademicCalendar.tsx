import { useEffect, useState } from 'react'
import { CalendarClock, CalendarRange, ChevronLeft, ChevronRight, ClipboardList, Loader2, Sparkles } from 'lucide-react'
import { fetchCalendar, fetchSubjects, type CalendarWeek } from '../lib/api'
import { shortDate } from '../lib/format'
import { Card, EmptyState, ErrorNote, PageHeader, Pill, Skeleton } from '../components/ui'

const ACTIVITY_LABELS: Record<string, string> = {
  sccd: 'Student council / clubs',
  rap: 'Rapid assessment',
  ptm: 'Parent-teacher meeting',
  feedback: 'Feedback',
  guestAlumni: 'Guest / alumni session',
  sc: 'Study circle',
  funActivity: 'Fun activity',
  visits: 'Visit',
  thoughtOfWeek: 'Thought of the week',
  others: 'Other',
}

const iso = (d: Date) => d.toISOString().slice(0, 10)
const cache = new Map<string, CalendarWeek>()
const shift = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return iso(d)
}

export default function AcademicCalendar() {
  const [subjects, setSubjects] = useState<{ subjectId: number; subjectTitle: string }[]>([])
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [date, setDate] = useState(iso(new Date()))
  const [week, setWeek] = useState<CalendarWeek | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetchSubjects()
      .then((s) => {
        if (!alive) return
        setSubjects(s.subjects)
        setSubjectId((prev) => prev ?? s.subjects[0]?.subjectId ?? null)
      })
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (subjectId == null) return
    let alive = true
    setError(null)
    const key = `${subjectId}:${date}`
    const cached = cache.get(key)
    if (cached) {
      setWeek(cached)
      setLoading(false)
      return () => {
        alive = false
      }
    }
    setLoading(true)
    fetchCalendar(subjectId, date)
      .then((w) => {
        cache.set(key, w)
        if (!alive) return
        setWeek(w)
        setLoading(false)
      })
      .catch((e: Error) => {
        if (!alive) return
        setError(e.message)
        setWeek(null)
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [subjectId, date])

  const activities = week ? Object.entries(week.coCurricular ?? {}).filter(([, v]) => v && String(v).trim()) : []
  const topics = (week?.courseCoverage ?? '')
    .split(/[\n,]+/)
    .map((t) => t.trim().replace(/\s{2,}/g, ' '))
    .filter(Boolean)

  return (
    <div>
      <PageHeader
        title="Academic calendar"
        subtitle="What your class is covering each week, test dates and co-curricular activities."
        action={
          <div className="flex items-center gap-1 rounded-xl border border-line bg-white p-1">
            <button
              onClick={() => setDate((d) => shift(d, -7))}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-brand-50"
              aria-label="Previous week"
            >
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setDate(iso(new Date()))} className="px-2 text-[12px] font-semibold text-ink-700">
              This week
            </button>
            <button
              onClick={() => setDate((d) => shift(d, 7))}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-brand-50"
              aria-label="Next week"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {subjects.map((s) => (
          <button
            key={s.subjectId}
            onClick={() => setSubjectId(s.subjectId)}
            className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition ${
              subjectId === s.subjectId
                ? 'border-brand-200 bg-brand-100 text-brand-900'
                : 'border-line bg-white text-ink-500 hover:border-brand-200 hover:text-brand-800'
            }`}
          >
            {s.subjectTitle}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorNote message={error} onRetry={() => setDate((d) => d)} />
      ) : loading ? (
        <Skeleton className="h-[320px]" />
      ) : !week ? (
        <EmptyState title="No plan for this week" body="Your campus has not published a plan for this subject and week." icon={<CalendarRange size={18} />} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-ink-400 uppercase">
                  Week {week.week} · {week.subject}
                </p>
                <h2 className="mt-1 text-[18px] font-bold tracking-[-0.01em] text-ink-900">
                  {shortDate(week.weekStart)} — {shortDate(week.weekEnd)}
                </h2>
              </div>
              {week.lectures > 0 && <Pill tone="muted">{week.lectures} lectures</Pill>}
            </div>

            <div className="mt-5">
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-ink-500 uppercase">
                <ClipboardList size={13} /> Course coverage
              </p>
              {topics.length ? (
                <ul className="space-y-1.5">
                  {topics.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-ink-800">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                      {t}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-ink-400">Nothing published for this week.</p>
              )}
            </div>


          </Card>

          <div className="space-y-4">
          <Card className="p-5 sm:p-6">
            <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-ink-500 uppercase">
              <CalendarClock size={13} /> Test due
            </p>
            {week.testDue ? (
              <p className="text-[13.5px] font-medium whitespace-pre-line text-ink-900">{week.testDue}</p>
            ) : (
              <p className="text-[12.5px] text-ink-400">No test scheduled for this week.</p>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-ink-500 uppercase">
              <Sparkles size={13} /> Co-curricular
            </p>
            {activities.length ? (
              <ul className="space-y-2">
                {activities.map(([key, value]) => (
                  <li key={key} className="rounded-xl border border-line bg-canvas/50 px-3 py-2">
                    <p className="text-[11px] font-semibold tracking-wide text-ink-400 uppercase">
                      {ACTIVITY_LABELS[key] ?? key}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-ink-800">{String(value)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-line bg-canvas/40 px-3 py-6 text-center text-[12.5px] text-ink-400">
                Nothing scheduled this week.
              </p>
            )}
          </Card>
          </div>
        </div>
      )}

      {loading && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-ink-400">
          <Loader2 size={12} className="animate-spin" /> syncing week…
        </p>
      )}
    </div>
  )
}