import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../lib/store'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/members', label: 'Members', icon: '👥' },
  { to: '/coaches', label: 'Coaches', icon: '🏋️' },
  { to: '/plans', label: 'Plans', icon: '📋' },
  { to: '/memberships', label: 'Memberships', icon: '💳' },
  { to: '/payments', label: 'Payments', icon: '💰' },
  { to: '/check-ins', label: 'Check-ins', icon: '✅' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Layout({ children }) {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gym-700">GymManager</h1>
          <p className="text-xs text-gray-500 mt-1">Management System</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gym-50 text-gym-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
