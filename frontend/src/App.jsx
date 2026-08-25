import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './lib/store'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Coaches from './pages/Coaches'
import Plans from './pages/Plans'
import Memberships from './pages/Memberships'
import Payments from './pages/Payments'
import CheckIns from './pages/CheckIns'
import Settings from './pages/Settings'

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/members" element={<Members />} />
                <Route path="/coaches" element={<Coaches />} />
                <Route path="/plans" element={<Plans />} />
                <Route path="/memberships" element={<Memberships />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/check-ins" element={<CheckIns />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
