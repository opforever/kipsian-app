import { Clock, MapPin } from 'lucide-react'
import { fetchTimetable } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { WEEKDAYS, kipsDayOf, lectureDays } from '../lib/format'
import type { Lecture } from '../lib/types'
import { Card, EmptyState, ErrorNote, PageHeader, Pill, Skeleton } from '../components/ui'

const SLOTS = Array.from({ length: 9 }, (_, i) => `lecture${i + 1}`)

export default function Timetable() {
  const { data, loading, error, reload } = useAsync(fetchTimetable, [])

  if (error) return <ErrorNote message={error} onRetry={reload} />

  const section = data?.[0]
  const room = section?.sosScheduleRoomNumber

  // keep every slot, including breaks (a slot with times but no subject)
  const slots = SLOTS.map((k) => section?.[k as `lecture${number}`]).filter((l): l is Lecture => Boolean(l))
  const times = [...new Set(slots.map((l) => l.sosScheduleTimeStart))].sort()
  const classes = slots.filter((l) => l.subTitle)
  const today = kipsDayOf(new Date())

  const at = (time: string, day: number) =>
    classes.find((l) => l.sosScheduleTimeStart === time && lectureDays(l.sosLectureDays).includes(day))
  const isBreak = (time: string) => !slots.some((l) => l.sosScheduleTimeStart === time && l.subTitle)

  const teachers = [...new Set(classes.map((l) => [l.sFName, l.sLName].filter(Boolean).join(' ')).filter(Boolean))]

  return (
    <div>
      <PageHeader
        title="Timetable"
        subtitle="Weekly class schedule for your section."
        action={room ? <span className="chip"><MapPin size={12} /> Room {room}</span> : undefined}
      />

      {loading ? (
        <Skeleton className="h-[420px]" />
      ) : classes.length ? (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] table-fixed border-collapse">
                <colgroup>
                  <col className="w-[92px]" />
                  {WEEKDAYS.map((d) => (
                    <col key={d} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 border-b border-line bg-white px-4 py-3 text-left text-[11.5px] font-semibold tracking-wide text-ink-400 uppercase">
                      Time
                    </th>
                    {WEEKDAYS.map((d, i) => (
                      <th
                        key={d}
                        className={`border-b border-line px-2 py-3 text-center text-[11.5px] font-semibold tracking-wide uppercase ${
                          i + 1 === today ? 'bg-brand-50 text-brand-700' : 'bg-white text-ink-400'
                        }`}
                      >
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {times.map((time) => {
                    const first = slots.find((l) => l.sosScheduleTimeStart === time)!
                    if (isBreak(time)) {
                      return (
                        <tr key={time}>
                          <td className="border-b border-line px-4 py-2">
                            <p className="tnum text-[11.5px] font-medium text-ink-400">{time}</p>
                          </td>
                          <td colSpan={6} className="border-b border-line px-2 py-2">
                            <p className="text-center text-[11px] font-medium tracking-wide text-ink-400 uppercase">
                              Break · {first.sosScheduleTimeStart}–{first.sosScheduleTimeEnd}
                            </p>
                          </td>
                        </tr>
                      )
                    }
                    return (
                      <tr key={time} className="align-top">
                        <td className="sticky left-0 z-10 border-b border-line bg-white px-4 py-3">
                          <p className="tnum text-[12.5px] font-semibold text-ink-800">{time}</p>
                          <p className="tnum text-[11px] text-ink-400">{first.sosScheduleTimeEnd}</p>
                        </td>
                        {WEEKDAYS.map((d, i) => {
                          const lecture = at(time, i + 1)
                          return (
                            <td
                              key={d}
                              className={`border-b border-line p-1.5 ${i + 1 === today ? 'bg-brand-50/40' : ''}`}
                            >
                              {lecture ? (
                                <div className="rounded-lg border border-brand-100 bg-brand-50/70 px-2 py-1.5">
                                  <p
                                    className="line-clamp-2 text-[12px] leading-tight font-semibold text-brand-900"
                                    title={lecture.subTitle}
                                  >
                                    {lecture.subTitle}
                                  </p>
                                  <p
                                    className="mt-0.5 line-clamp-1 text-[10.5px] leading-tight text-ink-500"
                                    title={[lecture.sFName, lecture.sLName].filter(Boolean).join(' ')}
                                  >
                                    {[lecture.sFName, lecture.sLName].filter(Boolean).join(' ') || 'TBA'}
                                  </p>
                                </div>
                              ) : (
                                <div className="grid h-[44px] place-items-center rounded-lg border border-dashed border-line/70">
                                  <span className="text-[10.5px] text-ink-400/80">free</span>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="mt-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-500">
                <Clock size={13} /> {classes.length} classes scheduled
              </span>
              <span className="text-ink-400">·</span>
              {teachers.slice(0, 8).map((t) => (
                <Pill key={t} tone="muted">
                  {t}
                </Pill>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <EmptyState title="No timetable published" body="Your campus has not published a schedule for this section yet." />
      )}
    </div>
  )
}