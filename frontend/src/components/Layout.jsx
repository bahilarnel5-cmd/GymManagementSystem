import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../lib/store'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import api from '../lib/api'
import { useMenus } from '../lib/useMenus'

const iconColors = {
  '/dashboard': 'from-blue-400 to-blue-600',
  '/members': 'from-emerald-400 to-emerald-600',
  '/coaches': 'from-violet-400 to-violet-600',
  '/plans': 'from-amber-400 to-amber-600',
  '/memberships': 'from-pink-400 to-pink-600',
  '/payments': 'from-cyan-400 to-cyan-600',
  '/activity-logs': 'from-orange-400 to-orange-600',
  '/settings': 'from-slate-400 to-slate-600',
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)
  const logout = useAuthStore((s) => s.logout)
  const role = useAuthStore((s) => s.role)
  const location = useLocation()
  const navigate = useNavigate()
  const { menus } = useMenus()

  const { data: expiringData } = useQuery({
    queryKey: ['memberships-expiring'],
    queryFn: () => api.get('/gym_memberships/expiring').then((r) => r.data),
    enabled: role === 'admin',
  })
  const expiring = expiringData?.items || []

  const { data: pendingCount } = useQuery({
    queryKey: ['payment-pending-count'],
    queryFn: () => api.get('/gym_payments/pending-count').then((r) => r.data),
    enabled: role === 'admin',
    refetchInterval: 30000,
  })

  const { data: pendingPaymentsData } = useQuery({
    queryKey: ['payment-notif-list'],
    queryFn: () => api.get('/gym_payments/pending?per_page=10').then((r) => r.data),
    enabled: role === 'admin' && notifOpen,
  })
  const pendingPayments = pendingPaymentsData?.items || []
  const paymentCount = pendingCount?.count || 0

  const { data: changeRequestCount } = useQuery({
    queryKey: ['change-request-pending-count'],
    queryFn: () => api.get('/gym_members/change-requests/pending-count').then((r) => r.data),
    enabled: role === 'admin',
    refetchInterval: 30000,
  })
  const changeRequestCr = changeRequestCount?.count || 0

  const { data: pendingChangeRequestsData } = useQuery({
    queryKey: ['change-request-notif-list'],
    queryFn: () => api.get('/gym_members/change-requests/pending?per_page=10').then((r) => r.data),
    enabled: role === 'admin' && notifOpen,
  })
  const pendingChangeRequests = pendingChangeRequestsData?.items || []

  const notifTotal = paymentCount + changeRequestCr

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/[0.06]">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <i className="bi bi-lightning-charge-fill text-white text-sm" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight">GymManager</span>
            <p className="text-[10px] text-slate-400 -mt-0.5">Management System</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-slate-400 hover:text-white lg:hidden">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Section label */}
        <div className="px-5 pt-5 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Main Menu</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {menus.map((item) => {
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
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b ${iconColors[item.path] || 'from-blue-400 to-blue-600'}`} />
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive
                    ? `bg-gradient-to-br ${iconColors[item.path] || 'from-blue-400 to-blue-600'} shadow-md`
                    : 'bg-white/[0.05]'
                }`}>
                  <i className={`bi ${item.icon} text-sm ${isActive ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* User / Logout */}
        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
              <i className="bi bi-person-fill text-xs text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate capitalize">{role}</p>
              <p className="text-[10px] text-slate-500">Staff Account</p>
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

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 lg:hidden p-1">
            <i className="bi bi-list text-2xl" />
          </button>
          <div className="flex items-center gap-3 ml-auto">
            {role === 'admin' && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <i className="bi bi-bell text-lg" />
                  {(notifTotal > 0 || expiring.length > 0) && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {notifTotal > 0 ? notifTotal : expiring.length}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-40">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-800">Notifications</p>
                      <button onClick={() => { setNotifOpen(false); navigate('/memberships') }} className="text-xs text-gym-600 hover:text-gym-700 font-medium">
                        View all
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {changeRequestCr > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-violet-50/60 flex items-center justify-between">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">Change Requests</p>
                            <span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded-full">{changeRequestCr}</span>
                          </div>
                          {pendingChangeRequests.map((r) => (
                            <button
                              key={r.id}
                              onClick={() => { setNotifOpen(false); navigate('/change-requests?tab=pending') }}
                              className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50"
                            >
                              <div className="mt-0.5 w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-[10px] font-bold shrink-0">
                                <i className="bi bi-pencil-square text-xs" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800">{r.member_name}</p>
                                <p className="text-xs text-gray-500 capitalize">{r.field_name.replace(/_/g, ' ')} change</p>
                                <p className="text-[10px] font-semibold text-violet-600 mt-0.5">{new Date(r.submitted_at).toLocaleDateString()}</p>
                              </div>
                            </button>
                          ))}
                          <button
                            onClick={() => { setNotifOpen(false); navigate('/change-requests?tab=pending') }}
                            className="w-full text-center py-2 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border-b border-gray-50 transition-colors"
                          >
                            View All Change Requests
                          </button>
                        </div>
                      )}
                      {paymentCount > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-amber-50/60 flex items-center justify-between">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Payment Requests</p>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">{paymentCount}</span>
                          </div>
                          {pendingPayments.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => { setNotifOpen(false); navigate('/payments?tab=requests') }}
                              className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50"
                            >
                              <div className="mt-0.5 w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 text-[10px] font-bold shrink-0">
                                <i className="bi bi-wallet2 text-xs" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800">{s.member_name}</p>
                                <p className="text-xs text-gray-500">₱{s.amount_paid.toLocaleString()} · ref ...{s.ref_last4}</p>
                                <p className="text-[10px] font-semibold text-cyan-600 mt-0.5">{new Date(s.submitted_at).toLocaleDateString()}</p>
                              </div>
                            </button>
                          ))}
                          <button
                            onClick={() => { setNotifOpen(false); navigate('/payments?tab=requests') }}
                            className="w-full text-center py-2 text-xs font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border-b border-gray-50 transition-colors"
                          >
                            View All Payment Requests
                          </button>
                        </div>
                      )}
                      {expiring.length === 0 && paymentCount === 0 && changeRequestCr === 0 ? (
                        <p className="px-4 py-6 text-sm text-gray-400 text-center">No notifications</p>
                      ) : expiring.length > 0 && (
                        <>
                          <div className="px-4 py-2 bg-amber-50/60">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Expiring Memberships</p>
                          </div>
                          {expiring.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => { setNotifOpen(false); navigate('/memberships') }}
                              className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                            >
                              <div className="mt-0.5 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-[10px] font-bold shrink-0">
                                {m.member_name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800">{m.member_name}</p>
                                <p className="text-xs text-gray-500">{m.plan_name} expires {m.end_date}</p>
                                <p className="text-[10px] font-semibold text-amber-600 mt-0.5">
                                  {m.days_left === 0 ? 'Expires today' : `${m.days_left} day${m.days_left === 1 ? '' : 's'} left`}
                                </p>
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full capitalize">{role}</span>
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
