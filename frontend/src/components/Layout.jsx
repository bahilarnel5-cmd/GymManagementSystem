import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../lib/store'
import { useState } from 'react'

const navItems = [
  { to: '/dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
  { to: '/members', icon: 'bi-people', label: 'Members' },
  { to: '/coaches', icon: 'bi-person-badge', label: 'Coaches' },
  { to: '/plans', icon: 'bi-card-list', label: 'Plans' },
  { to: '/memberships', icon: 'bi-credit-card', label: 'Memberships' },
  { to: '/payments', icon: 'bi-cash-coin', label: 'Payments' },
  { to: '/check-ins', icon: 'bi-calendar-check', label: 'Check-ins' },
  { to: '/settings', icon: 'bi-gear', label: 'Settings' },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const logout = useAuthStore((s) => s.logout)
  const role = useAuthStore((s) => s.role)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[#0A1F44] text-white transition-transform duration-200 w-60
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <i className="bi bi-lightning-charge-fill text-white text-sm" />
            </div>
            <span className="text-sm font-semibold truncate">GymManager</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-slate-400 hover:text-white lg:hidden"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <i className={`bi ${item.icon} text-base`} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <i className="bi bi-box-arrow-left text-base" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-60">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900 lg:hidden p-1"
          >
            <i className="bi bi-list text-2xl" />
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full capitalize">
              {role}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
