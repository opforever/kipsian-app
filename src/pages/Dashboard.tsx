import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BellRing,
  CalendarCheck2,
  CalendarX2,
  ChevronRight,
  Clock,
  GraduationCap,
  MapPin,
  Wallet,
} from 'lucide-react'
import {
  fetchAttendance,
  fetchAttendanceHistory,
  fetchChallans,
  fetchFee,
  fetchNotifications,
  fetchTimetable,
} from '../lib/api'
import { useAsync } from '../lib/hooks'
import { useSession } from '../lib/useSession'
import type { Lecture } from '../lib/types'
import {
  attendancePercent,
  dayMonth,
  kipsDayOf,
  lectureDays,
  longDate,
  money,
  shortDate,
  timeAgo,
} from '../lib/format'
import { Avatar, Card, EmptyState, ErrorNote, Pill, Progress, Ring, SectionTitle, Skeleton, Stat } from '../components/ui'

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export default function Dashboard() {
  const session = useSession()
  const user = session!.user
  const [bannerOpen, setBannerOpen] = useState(true)
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const { data, loading, error, reload } = useAsync(async () => {
    const [att, hist, fee, challans, tt, notes] = await Promise.allSettled([
      fetchAttendance(),
      fetchAttendanceHistory(),
      fetchFee(),
      fetchChallans(),
      fetchTimetable(),
      fetchNotifications(),
    ])
    const all = [att, hist, fee, challans, tt, notes]
    // if every call failed, surface the error instead of an empty-looking dashboard
    const failed = all.filter((r) => r.status === 'rejected')
    if (failed.length === all.length) throw (failed[0] as PromiseRejectedResult).reason

    return {
      attendance: att.status === 'fulfilled' ? att.value : null,
      history: hist.status === 'fulfilled' ? [...hist.value].sort((a, b) => b.attDatetime.localeCompare(a.attDatetime)) : [],
      fee: fee.status === 'fulfilled' ? fee.value : null,
      challans: challans.status === 'fulfilled' ? challans.value : [],
      timetable: tt.status === 'fulfilled' ? tt.value : [],
      notifications: notes.status === 'fulfilled' ? notes.value : [],
      partial: failed.length > 0,
    }
  }, [])

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-[26px] font-bold tracking-[-0.02em]">Overview</h1>
        <ErrorNote message={error} onRetry={reload} />
      </div>
    )
  }

  const att = data?.attendance
  const pct = att ? attendancePercent(att.totalPresents, att.totalAttendance) : 0
  const due = data?.fee ? Math.max(0, data.fee.totalFee - data.fee.paidFee) : 0
  const unpaid = (data?.challans ?? []).filter((c) => !c.isPaid)
  const nextChallan = [...unpaid].sort((a, b) => a.cDueDate.localeCompare(b.cDueDate))[0]
  const paidPct = data?.fee && data.fee.totalFee ? Math.round((data.fee.paidFee / data.fee.totalFee) * 100) : 0

  const lectures = (data?.timetable?.[0] ? (Object.values(data.timetable[0]) as unknown[]) : []).filter(
    (v): v is Lecture => Boolean(v && typeof v === 'object' && 'subTitle' in (v as object)),
  )
  const todayLectures = lectures.filter((l) => l.subTitle && lectureDays(l.sosLectureDays).includes(kipsDayOf(now)))
  const currentPeriod = todayLectures.find(
    (l) => nowMinutes >= minutes(l.sosScheduleTimeStart) && nowMinutes < minutes(l.sosScheduleTimeEnd),
  )
  const nextPeriod = todayLectures.find((l) => minutes(l.sosScheduleTimeStart) > nowMinutes)

  const recent = (data?.history ?? []).slice(0, 42)
  const absences = (data?.history ?? []).filter((h) => h.attStatus?.toUpperCase() === 'A').slice(0, 4)
  const latest = data?.history?.[0]
  const hour = now.getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user.aName.split(' ')[0]

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12.5px] font-semibold tracking-wide text-brand-600 uppercase">{longDate(now)}</p>
          <h1 className="mt-1 text-[26px] leading-tight font-bold tracking-[-0.02em] text-ink-900 sm:text-[30px]">
            {greet}, {firstName}
          </h1>
        </div>
        <span className="chip">
          <MapPin size={12} /> {user.campTitle}
        </span>
      </header>

      {data?.partial && (
        <p className="rounded-xl border border-gold-400/40 bg-gold-300/15 px-3.5 py-2 text-[12.5px] text-ink-700">
          Some sections could not be refreshed just now — the numbers below may be out of date.
        </p>
      )}

      {user.studentPortalFirstLogin === 1 && bannerOpen && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-400/40 bg-gold-300/15 px-4 py-3">
          <p className="text-[13px] font-medium text-ink-800">
            <span className="font-bold">First time here.</span> Set your own password so nobody else can sign in with
            your registration number.
          </p>
          <Link
            to="/profile#password"
            className="inline-flex items-center gap-1.5 rounded-xl bg-ink-900 px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            Set password <ChevronRight size={13} />
          </Link>
          <button
            onClick={() => setBannerOpen(false)}
            aria-label="Dismiss"
            className="rounded-lg px-1.5 py-0.5 text-[16px] leading-none text-ink-400 hover:text-ink-700"
          >
            ×
          </button>
        </div>
      )}

      {/* identity + the two facts that are not repeated below */}
      <Card className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(620px 240px at 6% 0%, var(--color-brand-50) 0%, transparent 70%), radial-gradient(420px 220px at 100% 120%, #eaf5ff 0%, transparent 65%)',
          }}
        />
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <Avatar name={user.aName} src={user.aPic} size={62} />
            <div className="min-w-0">
              <h2 className="truncate text-[19px] leading-tight font-bold tracking-[-0.01em] text-ink-900">
                {user.aName}
              </h2>
              <p className="tnum mt-1 text-[13px] font-medium text-ink-500">{user.aReg}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Pill tone="brand">{user.disciplineTitle}</Pill>
                <Pill>Section {user.secId}</Pill>
                <Pill tone="muted">Session {user.sessionId}</Pill>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-2 sm:gap-x-8 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8">
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-ink-400 uppercase">Installments</p>
              <p className="tnum mt-1 text-[15px] font-bold text-ink-900">
                {loading ? '—' : unpaid.length ? `${unpaid.length} pending` : 'Cleared'}
              </p>
              <p className="text-[11.5px] text-ink-500">
                {nextChallan
                  ? `${nextChallan.cDueDate < new Date().toISOString().slice(0, 10) ? 'overdue since' : 'next'} ${shortDate(nextChallan.cDueDate)}`
                  : 'nothing pending'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-ink-400 uppercase">Last marked</p>
              <p className="mt-1 text-[15px] font-bold text-ink-900">
                {loading ? '—' : latest ? (latest.attStatus.toUpperCase() === 'P' ? 'Present' : latest.attStatus.toUpperCase() === 'A' ? 'Absent' : 'Leave') : '—'}
              </p>
              <p className="text-[11.5px] text-ink-500">{latest ? dayMonth(latest.attDatetime) : 'no records yet'}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px]" />)
        ) : (
          <>
            <Stat
              label="Attendance"
              value={`${pct}%`}
              hint={`${(data?.history ?? []).length} day records`}
              icon={<CalendarCheck2 size={16} />}
              progress={pct}
              target={75}
            />
            <Stat
              label="Fee due"
              value={money(due)}
              hint={unpaid.length ? `${unpaid.length} instalment${unpaid.length > 1 ? 's' : ''} pending` : 'Nothing outstanding'}
              icon={<Wallet size={16} />}
              tone={due > 0 ? 'warn' : 'good'}
            />
            <Stat
              label="Paid to date"
              value={money(data?.fee?.paidFee ?? 0)}
              hint={`${paidPct}% of ${money(data?.fee?.totalFee ?? 0)}`}
              icon={<GraduationCap size={16} />}
              tone="good"
              progress={paidPct}
            />
            <Stat
              label="Alerts"
              value={data?.notifications.length ?? 0}
              hint={`latest ${timeAgo(data?.notifications[0]?.tfnCreated)}`}
              icon={<BellRing size={16} />}
              tone="brand"
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        {/* attendance */}
        <Card className="p-5 sm:p-6">
          <SectionTitle hint={att ? `${(data?.history ?? []).length} day records` : undefined}>Attendance</SectionTitle>
          {loading ? (
            <Skeleton className="h-[188px]" />
          ) : (
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <Ring value={pct} label="overall" />
                <div className="space-y-1.5 text-[12.5px]">
                  <p className="flex items-center gap-2 text-ink-700">
                    <i className="h-2.5 w-2.5 rounded-[3px] bg-good-500" /> {att?.totalPresents ?? 0} present
                  </p>
                  <p className="flex items-center gap-2 text-ink-700">
                    <i className="h-2.5 w-2.5 rounded-[3px] bg-bad-500" /> {att?.totalAbsents ?? 0} absent
                  </p>
                  <p className="flex items-center gap-2 text-ink-700">
                    <i className="h-2.5 w-2.5 rounded-[3px] bg-gold-400" /> {att?.totalLeaves ?? 0} leave
                  </p>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-1">
                  {recent.map((h) => (
                    <span
                      key={h.attDatetime}
                      title={`${dayMonth(h.attDatetime)} — ${h.attStatus}`}
                      className={`h-3.5 w-3.5 rounded-[3px] ${
                        h.attStatus?.toUpperCase() === 'P'
                          ? 'bg-good-500/85'
                          : h.attStatus?.toUpperCase() === 'A'
                            ? 'bg-bad-500/85'
                            : 'bg-gold-400/90'
                      }`}
                    />
                  ))}
                </div>
                {recent.length > 1 && (
                  <p className="tnum mt-2 text-[11px] text-ink-400">
                    {dayMonth(recent[recent.length - 1].attDatetime)} → {dayMonth(recent[0].attDatetime)}
                  </p>
                )}

                {absences.length > 0 && (
                  <div className="mt-4 rounded-xl border border-line bg-canvas/60 p-3">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-500">
                      <CalendarX2 size={12} /> Recent absences
                    </p>
                    <p className="tnum text-[12.5px] text-ink-700">
                      {absences.map((a) => dayMonth(a.attDatetime)).join(' · ')}
                    </p>
                  </div>
                )}
                <Link to="/attendance" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-700">
                  Full attendance record <ChevronRight size={14} />
                </Link>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
                  Counts are register entries; the percentage is calculated by the campus over the days the register
                  was marked.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* today */}
        <Card className="p-5 sm:p-6">
          <SectionTitle hint={todayLectures.length ? `${todayLectures.length} periods` : undefined}>
            Today’s classes
          </SectionTitle>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : todayLectures.length ? (
            <ul className="divide-y divide-line">
              {todayLectures.map((l, i) => {
                const live = currentPeriod === l
                return (
                  <li
                    key={i}
                    className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 ${live ? 'bg-brand-50/70' : ''}`}
                  >
                    <span className="tnum w-[74px] shrink-0 text-[11.5px] font-semibold text-brand-700">
                      {l.sosScheduleTimeStart}
                      <span className="block font-medium text-ink-400">{l.sosScheduleTimeEnd}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-ink-900">
                        {l.subTitle}
                        {live && <Pill tone="good">now</Pill>}
                      </span>
                      {[l.sFName, l.sLName].filter(Boolean).join(' ') ? (
                        <span className="block truncate text-[11.5px] text-ink-400">
                          {[l.sFName, l.sLName].filter(Boolean).join(' ')}
                        </span>
                      ) : (
                        <span className="block text-[11.5px] text-ink-400 italic">Teacher to be assigned</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState title="No classes today" body="Check the weekly timetable for the full schedule." icon={<Clock size={18} />} />
          )}
          {nextPeriod && !currentPeriod && (
            <p className="mt-3 text-[11.5px] text-ink-400">
              Next up at <span className="tnum font-semibold text-ink-700">{nextPeriod.sosScheduleTimeStart}</span> ·{' '}
              {nextPeriod.subTitle}
            </p>
          )}
          <Link to="/timetable" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-700">
            Weekly timetable <ChevronRight size={14} />
          </Link>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink-800">Latest alerts</h2>
            <Link to="/notifications" className="text-[12.5px] font-semibold text-brand-700">
              View all
            </Link>
          </div>
          {loading ? (
            <Skeleton className="h-16" />
          ) : data?.notifications.length ? (
            <ul className="divide-y divide-line">
              {data.notifications.slice(0, 3).map((n) => (
                <li key={n.tfnId} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                    <BellRing size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink-900">{n.tfnTitle}</p>
                    <p className="mt-0.5 line-clamp-1 text-[12.5px] text-ink-500">{n.tfnBody.replace(/\s+/g, ' ')}</p>
                  </div>
                  <span className="shrink-0 text-[11.5px] text-ink-400">{timeAgo(n.tfnCreated)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No alerts yet" body="Attendance and fee notifications will appear here." />
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <SectionTitle hint={`${paidPct}% cleared`}>Fee progress</SectionTitle>
          {loading ? (
            <Skeleton className="h-16" />
          ) : (
            <>
              <Progress value={paidPct} tone={due > 0 ? 'brand' : 'good'} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-ink-500">
                <span className="tnum">
                  Paid {money(data?.fee?.paidFee ?? 0)} of {money(data?.fee?.totalFee ?? 0)}
                </span>
                <Link to="/fees" className="font-semibold text-brand-700">
                  Challans
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}