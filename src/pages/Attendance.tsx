import { CalendarCheck2, CalendarX2, CalendarMinus } from 'lucide-react'
import { fetchAttendance, fetchAttendanceHistory } from '../lib/api'
import { useAsync } from '../lib/hooks'
import type { AttendanceEntry } from '../lib/types'
import { attendancePercent, dayMonth, shortDate } from '../lib/format'
import { Card, EmptyState, ErrorNote, PageHeader, Pill, Ring, Skeleton, Stat } from '../components/ui'

const toneFor = (status: string) =>
  status?.toUpperCase() === 'P' ? 'good' : status?.toUpperCase() === 'A' ? 'bad' : 'warn'
const labelFor = (status: string) =>
  status?.toUpperCase() === 'P' ? 'Present' : status?.toUpperCase() === 'A' ? 'Absent' : status?.toUpperCase() === 'L' ? 'Leave' : status

export default function Attendance() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [summary, history] = await Promise.all([fetchAttendance(), fetchAttendanceHistory()])
    return { summary, history: [...history].sort((a, b) => b.attDatetime.localeCompare(a.attDatetime)) }
  }, [])

  if (error) return <ErrorNote message={error} onRetry={reload} />

  const pct = data ? attendancePercent(data.summary.totalPresents, data.summary.totalAttendance) : 0

  // month buckets, newest first
  const months = new Map<string, AttendanceEntry[]>()
  for (const entry of data?.history ?? []) {
    const key = entry.attDatetime.slice(0, 7)
    if (!months.has(key)) months.set(key, [])
    months.get(key)!.push(entry)
  }

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Every class day recorded by your campus, newest first." />

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="flex items-center gap-6 p-6">
          {loading ? <Skeleton className="h-[132px] w-[132px] rounded-full" /> : <Ring value={pct} size={132} label="this session" />}
          <div className="flex-1 space-y-1">
            <p className="text-[12.5px] font-semibold tracking-wide text-ink-400 uppercase">Attendance rate</p>
            <p className="text-[15px] font-semibold text-ink-900">
              {loading ? '—' : pct >= 90 ? 'Excellent standing' : pct >= 75 ? 'On track' : 'Below 75% — please review'}
            </p>
            <p className="text-[12.5px] leading-relaxed text-ink-500">
              {data ? `${data.summary.totalPresents} of ${data.summary.totalAttendance} marked days attended.` : 'Loading…'}
            </p>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[124px]" />)
          ) : (
            <>
              <Stat label="Present" value={data!.summary.totalPresents} icon={<CalendarCheck2 size={16} />} tone="good" />
              <Stat label="Absent" value={data!.summary.totalAbsents} icon={<CalendarX2 size={16} />} tone="bad" />
              <Stat label="Leave" value={data!.summary.totalLeaves} icon={<CalendarMinus size={16} />} tone="warn" />
            </>
          )}
        </div>
      </div>

      <Card className="mt-4 p-5 sm:p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold text-ink-800">Day-by-day record</h2>
          <span className="text-[12px] font-medium text-ink-400">
            {data?.history.length ? `${data.history.length} entries` : ''}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : data?.history.length ? (
          <div className="space-y-6">
            {[...months.entries()].map(([month, entries]) => {
              const present = entries.filter((e) => e.attStatus.toUpperCase() === 'P').length
              return (
                <div key={month}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[12.5px] font-semibold tracking-wide text-ink-500 uppercase">
                      {shortDate(`${month}-01`).replace(/^\d+ /, '')}
                    </p>
                    <p className="tnum text-[12px] text-ink-400">
                      {present}/{entries.length} present
                    </p>
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {entries.map((entry) => (
                      <li
                        key={entry.attDatetime + entry.attStatus}
                        className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2"
                      >
                        <span className="tnum text-[13px] font-medium text-ink-800">{dayMonth(entry.attDatetime)}</span>
                        <Pill tone={toneFor(entry.attStatus)}>{labelFor(entry.attStatus)}</Pill>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState title="No attendance recorded yet" body="Entries appear as your teachers mark the register." />
        )}
      </Card>
    </div>
  )
}