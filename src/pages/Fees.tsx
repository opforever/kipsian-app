import { ArrowUpRight, CheckCircle2, CreditCard, ReceiptText, Wallet } from 'lucide-react'
import { PAYMENT_URL, fetchChallans, fetchFee, fetchFeeHistory } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { money, monthLabel, shortDate } from '../lib/format'
import { Card, EmptyState, ErrorNote, PageHeader, Pill, Progress, SectionTitle, Skeleton, Stat } from '../components/ui'

export default function Fees() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [summary, challans, history] = await Promise.all([fetchFee(), fetchChallans(), fetchFeeHistory()])
    return {
      summary,
      challans: [...challans].sort((a, b) => (a.cMonth < b.cMonth ? 1 : -1)),
      history: [...history].sort((a, b) => (a.feeDate === b.feeDate ? b.feeNo - a.feeNo : a.feeDate < b.feeDate ? 1 : -1)),
    }
  }, [])

  if (error) return <ErrorNote message={error} onRetry={reload} />

  const total = data?.summary.totalFee ?? 0
  const paid = data?.summary.paidFee ?? 0
  const due = Math.max(0, total - paid)
  const pct = total ? Math.round((paid / total) * 100) : 0
  const today = new Date().toISOString().slice(0, 10)
  const unpaid = data?.challans.filter((c) => !c.isPaid) ?? []

  return (
    <div>
      <PageHeader
        title="Fees"
        subtitle="Challans, online payment and every receipt on record."
        action={
          <a
            href={PAYMENT_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost h-11 px-4 text-[13px]"
          >
            <CreditCard size={15} /> Payment portal
          </a>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card className="self-start p-5 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[12.5px] font-semibold tracking-wide text-ink-400 uppercase">Outstanding</p>
              <p className="tnum mt-1 text-[30px] leading-none font-bold tracking-[-0.02em] text-ink-900">
                {loading ? '—' : money(due)}
              </p>
            </div>
            <div className="text-right">
              <p className="tnum text-[13px] text-ink-500">
                Paid <span className="font-semibold text-ink-800">{money(paid)}</span>
              </p>
              <p className="tnum text-[12.5px] text-ink-400">of {money(total)} annual</p>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={pct} tone={due > 0 ? 'brand' : 'good'} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px]">
            <span className="inline-flex items-center gap-1.5 text-ink-600">
              <i className="h-2 w-2 rounded-full bg-brand-600" /> Paid {pct}%
            </span>
            <span className="inline-flex items-center gap-1.5 text-ink-600">
              <i className="h-2 w-2 rounded-full bg-brand-100" /> Outstanding {100 - pct}%
            </span>
            <span className="text-ink-400">Challan status is synced from the campus ERP.</span>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {loading ? (
            <>
              <Skeleton className="h-[104px]" />
              <Skeleton className="h-[104px]" />
            </>
          ) : (
            <>
              <Stat
                label="Open challans"
                value={unpaid.length}
                hint={unpaid[0] ? `Next due ${shortDate(unpaid[0].cDueDate)}` : 'All installments cleared'}
                icon={<Wallet size={16} />}
                tone={unpaid.length ? 'warn' : 'good'}
              />
              <Stat
                label="Receipts"
                value={data?.history.length ?? 0}
                hint="Recorded payments"
                icon={<ReceiptText size={16} />}
                tone="brand"
              />
            </>
          )}
        </div>
      </div>

      <Card className="mt-4 p-5 sm:p-6">
        <SectionTitle hint={`${data?.challans.length ?? 0} issued`}>Challans</SectionTitle>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[132px]" />
            ))}
          </div>
        ) : data?.challans.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.challans.map((c) => (
              <div
                key={c.cId}
                className={`flex flex-col self-start rounded-2xl border p-4 ${
                  c.isPaid ? 'border-line bg-canvas/50' : 'border-brand-200 bg-brand-50/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[13.5px] font-semibold text-ink-900">{monthLabel(c.cMonth)}</p>
                    <p className="tnum mt-0.5 text-[11.5px] text-ink-400">
                      Instalment {c.cInstallmentNo} · Ref {c.cRefNo}
                    </p>
                  </div>
                  <Pill tone={c.isPaid ? 'good' : c.cDueDate < today ? 'bad' : 'warn'}>
                    {c.isPaid ? 'Paid' : c.cDueDate < today ? 'Overdue' : 'Unpaid'}
                  </Pill>
                </div>

                <p className="tnum mt-3 text-[22px] leading-none font-bold text-ink-900">{money(c.cGrandTotal)}</p>

                <div className="mt-2 space-y-0.5 text-[11.5px] text-ink-500">
                  <p>Issued {shortDate(c.cDate)}</p>
                  <p>
                    Due{' '}
                    <span className={`font-semibold ${!c.isPaid && c.cDueDate < today ? 'text-bad-500' : 'text-ink-700'}`}>
                      {shortDate(c.cDueDate)}
                    </span>
                    {!c.isPaid && c.cExpiryDate ? ` · expires ${shortDate(c.cExpiryDate)}` : ''}
                  </p>
                  {c.isPaid && c.cPaymentDate && (
                    <p className="inline-flex items-center gap-1 text-good-500">
                      <CheckCircle2 size={12} /> Paid {shortDate(c.cPaymentDate)}
                    </p>
                  )}
                </div>

                {!c.isPaid && c.canPayChallan && (
                  <a
                    href={PAYMENT_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary mt-auto h-10 w-full text-[13px]"
                  >
                    Pay now <ArrowUpRight size={14} />
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No challans issued" body="Fee challans for the session will show up here." />
        )}
      </Card>

      <Card className="mt-4 p-5 sm:p-6">
        <SectionTitle hint="latest first">Payment history</SectionTitle>
        {loading ? (
          <Skeleton className="h-24" />
        ) : data?.history.length ? (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[520px] border-separate border-spacing-y-1 px-2 text-left">
              <thead>
                <tr className="text-[11.5px] font-semibold tracking-wide text-ink-400 uppercase">
                  <th className="pb-2 font-semibold">Date</th>
                  <th className="pb-2 font-semibold">Receipt</th>
                  <th className="pb-2 text-right font-semibold">Received</th>
                  <th className="pb-2 text-right font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((r) => (
                  <tr key={`${r.feeNo}-${r.feeDate}`} className="text-[13px]">
                    <td className="tnum rounded-l-xl bg-canvas/60 px-3 py-2.5 font-medium text-ink-800">
                      {shortDate(r.feeDate)}
                    </td>
                    <td className="tnum bg-canvas/60 px-3 py-2.5 text-ink-500">#{r.feeNo}</td>
                    <td className="tnum bg-canvas/60 px-3 py-2.5 text-right font-semibold text-good-500">
                      {money(r.feeReceivedAmount)}
                    </td>
                    <td className="tnum rounded-r-xl bg-canvas/60 px-3 py-2.5 text-right text-ink-700">
                      {money(r.feeBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No payments recorded" body="Receipts appear here after the campus posts your payment." />
        )}
      </Card>
    </div>
  )
}