import { Bell, Megaphone } from 'lucide-react'
import { fetchNotices, fetchNotifications } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { shortDate, timeAgo } from '../lib/format'
import { Card, EmptyState, ErrorNote, PageHeader, SectionTitle, Skeleton } from '../components/ui'

export default function Notifications() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [alerts, notices] = await Promise.allSettled([fetchNotifications(), fetchNotices()])
    return {
      alerts: alerts.status === 'fulfilled' ? alerts.value : [],
      notices: notices.status === 'fulfilled' ? notices.value : [],
    }
  }, [])

  if (error) return <ErrorNote message={error} onRetry={reload} />

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Alerts pushed to your account and campus notices." />

      <Card className="p-5 sm:p-6">
        <SectionTitle hint={data ? `${data.alerts.length} alerts` : undefined}>Account alerts</SectionTitle>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[86px]" />
            ))}
          </div>
        ) : data?.alerts.length ? (
          <ul className="space-y-3">
            {data.alerts.map((n) => (
              <li key={n.tfnId} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <Bell size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[13.5px] font-semibold text-ink-900">{n.tfnTitle}</p>
                      <span className="text-[11.5px] whitespace-nowrap text-ink-400" title={shortDate(n.tfnCreated)}>
                        {timeAgo(n.tfnCreated)}
                      </span>
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed whitespace-pre-line text-ink-500">{n.tfnBody}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No alerts" body="Attendance and fee alerts will show up here." />
        )}
      </Card>

      <Card className="mt-4 p-5 sm:p-6">
        <SectionTitle hint={data ? `${data.notices.length} notices` : undefined}>Notice board</SectionTitle>
        {loading ? (
          <Skeleton className="h-[86px]" />
        ) : data?.notices.length ? (
          <ul className="space-y-3">
            {data.notices.map((n) => (
              <li key={n.tfnId} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-300/25 text-gold-500">
                    <Megaphone size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-ink-900">{n.tfnTitle}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed whitespace-pre-line text-ink-500">{n.tfnBody}</p>
                    <p className="mt-1.5 text-[11.5px] text-ink-400">{shortDate(n.tfnCreated)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No notices published"
            body="Campus-wide announcements will appear here."
            icon={<Megaphone size={18} />}
          />
        )}
      </Card>
    </div>
  )
}