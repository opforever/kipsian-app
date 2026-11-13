import { ArrowUpRight, FileText, GraduationCap } from 'lucide-react'
import { fetchResults, fetchSubjects, markSheetUrl } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { useSession } from '../lib/useSession'
import { Card, EmptyState, ErrorNote, PageHeader, Pill, Progress, SectionTitle, Skeleton } from '../components/ui'

export default function Results() {
  const session = useSession()!
  const sheet = markSheetUrl(session.user)
  const { data, loading, error, reload } = useAsync(async () => {
    const [results, subjects] = await Promise.allSettled([fetchResults(), fetchSubjects()])
    return {
      results: results.status === 'fulfilled' ? results.value : null,
      subjects: subjects.status === 'fulfilled' ? subjects.value : null,
    }
  }, [])

  if (error) return <ErrorNote message={error} onRetry={reload} />

  const results = data?.results
  const totals = results?.testResults?.subjectTotals ?? []
  const grand = results?.testResults?.grandTotal
  const graded = totals.filter((s) => s.totalMarks > 0)
  const hasMarks = (results?.testTotalMarks ?? 0) > 0

  return (
    <div>
      <PageHeader title="Results" subtitle="Test and assessment marks posted by your campus." />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[140px]" />
          <Skeleton className="h-[320px]" />
        </div>
      ) : (
        <>
          <Card className="relative overflow-hidden p-6">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(520px 220px at 0% 0%, var(--color-brand-50) 0%, transparent 70%)',
              }}
            />
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white">
                  <GraduationCap size={24} />
                </span>
                <div>
                  <p className="text-[12.5px] font-semibold tracking-wide text-ink-400 uppercase">Session total</p>
                  <p className="tnum mt-1 text-[28px] leading-none font-bold tracking-[-0.02em] text-ink-900">
                    {results?.testObtainedMarks ?? 0}
                    <span className="text-[16px] font-semibold text-ink-400"> / {results?.testTotalMarks ?? 0}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[11.5px] font-semibold tracking-wide text-ink-400 uppercase">Subjects</p>
                  <p className="tnum mt-1 text-[20px] font-bold text-ink-900">{totals.length}</p>
                </div>
                <div>
                  <p className="text-[11.5px] font-semibold tracking-wide text-ink-400 uppercase">Graded</p>
                  <p className="tnum mt-1 text-[20px] font-bold text-ink-900">{graded.length}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="mt-4 p-5 sm:p-6">
            <SectionTitle hint={hasMarks ? `${graded.length} of ${totals.length} graded` : undefined}>
              Subject breakdown
            </SectionTitle>

            {totals.length ? (
              <ul className="space-y-3">
                {totals.map((s) => {
                  const pct = s.totalMarks ? Math.round((s.obtainedMarks / s.totalMarks) * 100) : 0
                  return (
                    <li key={s.subjectId} className="rounded-2xl border border-line bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[13.5px] font-semibold text-ink-900">{s.subjectTitle}</span>
                          {s.totalMarks === 0 && <Pill tone="muted">not graded</Pill>}
                        </div>
                        <span className="tnum text-[13px] font-semibold text-ink-800">
                          {s.totalMarks === 0 ? '—' : `${s.obtainedMarks} / ${s.totalMarks}`}
                          {s.totalMarks > 0 && <span className="ml-2 text-ink-400">{pct}%</span>}
                        </span>
                      </div>
                      <div className="mt-2.5">
                        <Progress value={pct} tone={pct >= 80 ? 'good' : pct >= 50 ? 'brand' : 'gold'} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState title="No subjects configured" body="Your campus has not published a result sheet for this session yet." />
            )}

            {grand && hasMarks && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-brand-50/70 px-4 py-3">
                <p className="text-[13px] font-semibold text-brand-900">Grand total</p>
                <p className="tnum text-[14px] font-bold text-brand-900">
                  {grand.obtainedMarks} / {grand.totalMarks}
                  {grand.percentage != null && <span className="ml-2 font-semibold text-brand-700">{grand.percentage}%</span>}
                </p>
              </div>
            )}

            {!hasMarks && (
              <p className="mt-4 rounded-xl border border-dashed border-line bg-canvas/60 px-4 py-3 text-[12.5px] text-ink-500">
                Marks appear here as soon as your campus posts the graded paper. {data?.subjects ? `Enrolled subjects: ${data.subjects.subjects.map((s) => s.subjectTitle).join(', ')}.` : ''}
              </p>
            )}
          </Card>

          <Card className="mt-4 flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <FileText size={17} />
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-ink-900">Campus mark sheet</p>
                <p className="mt-0.5 max-w-[46ch] text-[12.5px] leading-relaxed text-ink-500">
                  The PTM result sheet your campus publishes for section {session.user.secId} — opens as a printable
                  document in a new tab.
                </p>
              </div>
            </div>
            <a href={sheet} target="_blank" rel="noreferrer" className="btn-ghost h-11 px-4 text-[13px]">
              Open mark sheet <ArrowUpRight size={14} />
            </a>
          </Card>
        </>
      )}
    </div>
  )
}
