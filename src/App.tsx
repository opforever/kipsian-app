import { useEffect, type ReactElement } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Shell from './components/Shell'
import { useSession } from './lib/useSession'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Attendance from './pages/Attendance'
import Fees from './pages/Fees'
import Timetable from './pages/Timetable'
import AcademicCalendar from './pages/AcademicCalendar'
import Leave from './pages/Leave'
import Results from './pages/Results'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'

function Guard({ children }: { children: ReactElement }) {
  const session = useSession()
  if (!session) return <Navigate to="/login" replace />
  return children
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Guard>
              <Shell />
            </Guard>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="fees" element={<Fees />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="calendar" element={<AcademicCalendar />} />
          <Route path="leave" element={<Leave />} />
          <Route path="results" element={<Results />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}