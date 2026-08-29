import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './lib/store'
import Layout from './components/Layout'
import MemberLayout from './components/MemberLayout'
import CoachLayout from './components/CoachLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Coaches from './pages/Coaches'
import Plans from './pages/Plans'
import Memberships from './pages/Memberships'
import Payments from './pages/Payments'
import Settings from './pages/Settings'
import ActivityLogs from './pages/ActivityLogs'
import CoachStudentsAdmin from './pages/CoachStudentsAdmin'
import MemberDashboard from './pages/MemberDashboard'
import MemberCoaches from './pages/MemberCoaches'
import MemberRenewals from './pages/MemberRenewals'
import MemberProfile from './pages/MemberProfile'
import MemberGcash from './pages/MemberGcash'
import CoachDashboard from './pages/CoachDashboard'
import CoachStudents from './pages/CoachStudents'
import CoachBookings from './pages/CoachBookings'
import CoachSchedule from './pages/CoachSchedules'

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" />
}

function PublicOnlyRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  const role = useAuthStore((s) => s.role)
  if (token) {
    const home = role === 'admin' ? '/dashboard' : role === 'coach' ? '/coach/dashboard' : '/member/dashboard'
    return <Navigate to={home} />
  }
  return children
}

function AdminRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/coaches" element={<Coaches />} />
        <Route path="/coach-students" element={<CoachStudentsAdmin />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/memberships" element={<Memberships />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/activity-logs" element={<ActivityLogs />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Layout>
  )
}

function MemberRoutes() {
  return (
    <MemberLayout>
      <Routes>
        <Route path="/member/dashboard" element={<MemberDashboard />} />
        <Route path="/member/coaches" element={<MemberCoaches />} />
        <Route path="/member/renewals" element={<MemberRenewals />} />
        <Route path="/member/profile" element={<MemberProfile />} />
        <Route path="/member/gcash" element={<MemberGcash />} />
        <Route path="*" element={<Navigate to="/member/dashboard" />} />
      </Routes>
    </MemberLayout>
  )
}

function CoachRoutes() {
  return (
    <CoachLayout>
      <Routes>
        <Route path="/coach/dashboard" element={<CoachDashboard />} />
        <Route path="/coach/students" element={<CoachStudents />} />
        <Route path="/coach/bookings" element={<CoachBookings />} />
        <Route path="/coach/schedules" element={<CoachSchedule />} />
        <Route path="*" element={<Navigate to="/coach/dashboard" />} />
      </Routes>
    </CoachLayout>
  )
}

export default function App() {
  const role = useAuthStore((s) => s.role)

  const HomeRoutes = role === 'admin' ? <AdminRoutes /> : role === 'coach' ? <CoachRoutes /> : <MemberRoutes />

  return (
    <Routes>
      <Route path="/" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            {HomeRoutes}
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
