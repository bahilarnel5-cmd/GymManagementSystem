import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../lib/store'
import { useState } from 'react'
import { useMenus } from '../lib/useMenus'

const memberIconColors = {
  '/member/dashboard': 'from-blue-400 to-blue-600',
  '/member/coaches': 'from-violet-400 to-violet-600',
  '/member/renewals': 'from-emerald-400 to-emerald-600',
  '/member/profile': 'from-pink-400 to-rose-600',
}

export default function MemberLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const logout = useAuthStore((s) => s.logout)
  const role = useAuthStore((s) => s.role)
  const memberId = useAuthStore((s) => s.memberId)
  const location = useLocation()
  const navigate = useNavigate()
  const { menus } = useMenus()

  const memberNavItems = menus

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col text-white transition-transform duration-300 w-64 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{ background: 'linear-gradient(180deg, #0c1929 0%, #132743 40%, #1a3358 100%)' }}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/[0.06]">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <i className="bi bi-person-fill text-white text-sm" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight">GymManager</span>
            <p className="text-[10px] text-slate-400 -mt-0.5">Member Portal</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-slate-400 hover:text-white lg:hidden">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="px-5 pt-5 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Navigation</p>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {memberNavItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b ${memberIconColors[item.path]}`} />
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive
                    ? `bg-gradient-to-br ${memberIconColors[item.path]} shadow-md`
                    : 'bg-white/[0.05]'
                }`}>
                  <i className={`bi ${item.icon} text-sm ${isActive ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
              <i className="bi bi-person-fill text-xs text-violet-200" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 capitalize">Member</p>
              <p className="text-[10px] text-slate-500">Member Portal</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center">
              <i className="bi bi-box-arrow-left text-sm" />
            </div>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 lg:hidden p-1">
            <i className="bi bi-list text-2xl" />
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full capitalize">Member</span>
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
