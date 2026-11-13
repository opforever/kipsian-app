import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react'
import { initials } from '../lib/format'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em] text-ink-900 sm:text-[30px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[14px] text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-800">{children}</h2>
      {hint && <span className="text-[12px] font-medium text-ink-400">{hint}</span>}
    </div>
  )
}

type Tone = 'brand' | 'good' | 'warn' | 'bad' | 'muted'
const toneClass: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-800 border-brand-100',
  good: 'bg-good-50 text-good-500 border-good-500/20',
  warn: 'bg-warn-50 text-warn-500 border-warn-500/20',
  bad: 'bg-bad-50 text-bad-500 border-bad-500/20',
  muted: 'bg-canvas text-ink-500 border-line',
}

export function Pill({ children, tone = 'muted' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold ${toneClass[tone]}`}
    >
      {children}
    </span>
  )
}

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
  progress,
  target,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: Tone
  progress?: number
  target?: number
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-semibold tracking-wide text-ink-500 uppercase">{label}</p>
        {icon && (
          <span className={`grid h-9 w-9 place-items-center rounded-xl border ${toneClass[tone]}`}>{icon}</span>
        )}
      </div>
      <p className="tnum mt-3 text-[26px] leading-none font-bold tracking-[-0.02em] text-ink-900">{value}</p>
      {typeof progress === 'number' && (
        <div className="relative mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
            <div
              className={`h-full rounded-full ${tone === 'good' ? 'bg-good-500' : tone === 'warn' ? 'bg-gold-400' : 'bg-brand-600'}`}
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
          {typeof target === 'number' && (
            <span
              title={`target ${target}%`}
              className="absolute -top-0.5 h-2.5 w-[2px] rounded-full bg-ink-400/70"
              style={{ left: `${Math.min(100, target)}%` }}
            />
          )}
        </div>
      )}
      {hint && <p className="mt-2 text-[12px] text-ink-500">{hint}</p>}
    </div>
  )
}

export function Ring({
  value,
  size = 132,
  label,
  caption,
}: {
  value: number
  size?: number
  label?: string
  caption?: string
}) {
  const stroke = 11
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-400)" />
            <stop offset="100%" stopColor="var(--color-brand-700)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-brand-100)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * c} ${c}`}
          className="transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <div className="absolute text-center">
        <p className="tnum text-[24px] leading-none font-bold text-ink-900">{clamped}%</p>
        {label && <p className="mt-1 text-[11.5px] font-medium text-ink-500">{label}</p>}
      </div>
      {caption && <span className="sr-only">{caption}</span>}
    </div>
  )
}

export function Progress({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'good' | 'gold' }) {
  const bg = tone === 'good' ? 'bg-good-500' : tone === 'gold' ? 'bg-gold-400' : 'bg-brand-600'
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-brand-100">
      <div
        className={`h-full rounded-full ${bg} transition-[width] duration-700`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export function Avatar({
  name,
  src,
  size = 56,
}: {
  name: string
  src?: string
  size?: number
}) {
  const usable = src && /^https?:\/\//i.test(src)
  if (usable) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-2xl object-cover ring-2 ring-white"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="grid place-items-center rounded-2xl font-bold text-white ring-2 ring-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        backgroundImage: 'linear-gradient(140deg, var(--color-brand-400), var(--color-brand-700))',
      }}
    >
      {initials(name)}
    </div>
  )
}

export function EmptyState({
  title,
  body,
  icon,
}: {
  title: string
  body?: string
  icon?: ReactNode
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-canvas/60 px-6 py-12 text-center">
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl border border-line bg-white text-ink-400">
        {icon ?? <Inbox size={18} />}
      </div>
      <p className="text-[14px] font-semibold text-ink-800">{title}</p>
      {body && <p className="mt-1 max-w-sm text-[13px] text-ink-500">{body}</p>}
    </div>
  )
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-bad-500/20 bg-bad-50 p-4">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-bad-500" />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-bad-500">{message}</p>
        <p className="mt-0.5 text-[12.5px] text-ink-500">The portal could not load this section.</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-800">
          <RefreshCw size={13} /> Retry
        </button>
      )}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-brand-100/60 ${className}`} />
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-white/40 border-t-white"
      style={{ width: size, height: size }}
    />
  )
}