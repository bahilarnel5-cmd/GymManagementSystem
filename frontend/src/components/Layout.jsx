import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../lib/store'

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'bi-speedometer2' },
  { to: '/members', label: 'Members', icon: 'bi-people' },
  { to: '/coaches', label: 'Coaches', icon: 'bi-person-badge' },
  { to: '/plans', label: 'Plans', icon: 'bi-card-checklist' },
  { to: '/memberships', label: 'Memberships', icon: 'bi-credit-card' },
  { to: '/payments', label: 'Payments', icon: 'bi-cash-coin' },
  { to: '/check-ins', label: 'Check-ins', icon: 'bi-box-arrow-in-right' },
  { to: '/settings', label: 'Settings', icon: 'bi-gear' },
]

function currentTitle(pathname) {
  const match = navItems.find((item) =>
    item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)
  )
  return match ? match.label : 'GymManager'
}

export default function Layout({ children }) {
  const logout = useAuthStore((s) => s.logout)
  const role = useAuthStore((s) => s.role)
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = (role || 'GM').slice(0, 2).toUpperCase()

  return (
    <div className="flex h-screen bg-[#F3F4F6]">
      {/* Sidebar — fixed 240px dark shell, flat nav, no nested items */}
      <aside className="w-[240px] shrink-0 bg-[#0F172A] flex flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-white/10">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <i className="bi bi-lightning-charge-fill text-white text-sm" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">GymManager</p>
            <p className="text-[11px] text-slate-400">Fitness Ops</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 pb-2 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
            Operations
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1E293B] text-white'
                    : 'text-slate-400 hover:bg-[#1E293B]/60 hover:text-slate-100'
                }`
              }
            >
              <i className={`bi ${item.icon} text-base w-4 text-center`} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <i className="bi bi-box-arrow-right text-base w-4 text-center" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header — sticky 64px dark bar: page title, org pill, notifications, avatar */}
        <header className="h-16 shrink-0 sticky top-0 z-10 bg-[#0F172A] border-b border-white/10 flex items-center justify-between px-6">
          <h1 className="text-white text-[15px] font-semibold">
            {currentTitle(location.pathname)}
          </h1>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300">
              <i className="bi bi-building text-slate-400" />
              Argo HQ
            </span>

            <button className="relative h-9 w-9 rounded-full flex items-center justify-center text-slate-300 hover:bg-white/10 transition-colors">
              <i className="bi bi-bell text-base" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="h-9 w-9 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center hover:bg-blue-500 transition-colors"
              >
                {initials}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white shadow-md border border-gray-200 py-1 z-20">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-medium text-gray-900 capitalize">{role || 'User'}</p>
                    <p className="text-[11px] text-gray-500">Signed in</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <i className="bi bi-box-arrow-right" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Canvas */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
