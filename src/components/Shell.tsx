import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarCheck2,
  CalendarClock,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  UserRound,
  Wallet,
} from 'lucide-react'
import { fetchNotifications, logout } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { useSession } from '../lib/useSession'
import { Avatar } from './ui'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck2 },
  { to: '/fees', label: 'Fees', icon: Wallet },
  { to: '/timetable', label: 'Timetable', icon: CalendarClock },
  { to: '/results', label: 'Results', icon: GraduationCap },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: UserRound },
]

const MOBILE_NAV = NAV.filter((n) => ['/', '/attendance', '/fees', '/results', '/profile'].includes(n.to))

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/kips-mark.png" alt="" className="h-9 w-9 rounded-xl bg-white object-contain p-0.5 shadow-soft" />
      {!compact && (
        <div className="leading-tight">
          <p className="text-[15px] font-extrabold tracking-[-0.01em] text-ink-900">KIPSIAN</p>
          <p className="text-[11px] font-medium tracking-wide text-ink-400 uppercase">Student &amp; Parent</p>
        </div>
      )}
    </div>
  )
}

export default function Shell() {
  const session = useSession()
  const navigate = useNavigate()
  const user = session?.user
  const { data: notifications } = useAsync(fetchNotifications, [])
  const unread = notifications?.length ?? 0

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh">
      {/* desktop rail */}
      <aside className="fixed top-0 bottom-0 left-0 z-30 hidden w-[260px] flex-col border-r border-line bg-white/85 px-4 py-5 backdrop-blur lg:flex">
        <div className="px-2">
          <Logo />
        </div>

        <nav className="mt-7 flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              <Icon size={17} strokeWidth={2.1} />
              <span className="flex-1">{label}</span>
              {to === '/notifications' && unread > 0 && (
                <span className="tnum rounded-full bg-brand-600 px-1.5 py-0.5 text-[10.5px] font-bold text-white">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 rounded-2xl border border-line bg-canvas/70 p-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={user?.aName ?? 'KIPS'} src={user?.aPic} size={38} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-ink-900">{user?.aName}</p>
              <p className="tnum truncate text-[11.5px] text-ink-500">{user?.aReg}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white py-2 text-[12.5px] font-semibold text-ink-700 transition hover:bg-bad-50 hover:text-bad-500"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-white/85 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <NavLink
            to="/notifications"
            aria-label="Notifications"
            className="relative grid h-9 w-9 place-items-center rounded-xl border border-line text-ink-700"
          >
            <Bell size={16} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[9.5px] font-bold text-white">
                {unread}
              </span>
            )}
          </NavLink>
          <NavLink to="/profile" aria-label="Profile">
            <Avatar name={user?.aName ?? 'KIPS'} src={user?.aPic} size={34} />
          </NavLink>
        </div>
      </header>

      <main className="lg:pl-[260px]">
        <div className="mx-auto max-w-[1200px] px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-9 lg:pb-16">
          <Outlet />
        </div>
      </main>

      {/* mobile bottom nav */}
      <nav className="fixed bottom-0 z-30 w-full border-t border-line bg-white/95 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between">
          {MOBILE_NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex w-full flex-col items-center gap-1 rounded-xl px-0.5 py-1.5 text-[10px] font-semibold tracking-tight ${
                  isActive ? 'text-brand-700' : 'text-ink-400'
                }`
              }
            >
              <Icon size={19} strokeWidth={2.1} />
              <span className="w-full truncate text-center">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}