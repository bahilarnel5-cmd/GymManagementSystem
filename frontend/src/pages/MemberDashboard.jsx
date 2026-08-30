import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'

function getStatusColor(label) {
  switch (label) {
    case 'expired': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', badge: 'bg-red-100 text-red-700', bar: 'bg-red-500' }
    case 'critical': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', badge: 'bg-red-100 text-red-700', bar: 'bg-red-500' }
    case 'warning': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' }
    default: return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' }
  }
}

function getStatusLabel(label) {
  switch (label) {
    case 'expired': return 'Expired'
    case 'critical': return 'Expiring Soon'
    case 'warning': return 'Expiring in 7 days'
    default: return 'Active'
  }
}

export default function MemberDashboard() {
  const memberId = useAuthStore((s) => s.memberId)

  const { data, isLoading } = useQuery({
    queryKey: ['member-dashboard'],
    queryFn: () => api.get('/member/dashboard').then((r) => r.data),
    enabled: !!memberId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    )
  }

  const member = data?.member
  const membership = data?.membership
  const payments = data?.recent_payments || []
  const bookings = data?.recent_bookings || []
  const enrollments = data?.recent_enrollments || []
  const activeCoaches = enrollments.filter((e) => e.enrollment_status === 'active')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Welcome, {member?.full_name || 'Member'}</h1>
        <p className="text-sm text-gray-500 mt-1">Code: {member?.member_code}</p>
      </div>

      {membership ? (
        <div className={`rounded-2xl border-2 p-6 mb-8 ${getStatusColor(membership.status_label).bg} ${getStatusColor(membership.status_label).border}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-bold text-gray-800">{membership.plan_name}</h2>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(membership.status_label).badge}`}>
                  {getStatusLabel(membership.status_label)}
                </span>
              </div>
              <p className="text-sm text-gray-500">Your current membership plan</p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-extrabold ${getStatusColor(membership.status_label).text}`}>
                {membership.days_left}
              </p>
              <p className="text-xs text-gray-500">days remaining</p>
            </div>
          </div>

          <div className="w-full bg-white/60 rounded-full h-2.5 mb-5">
            <div
              className={`h-2.5 rounded-full ${getStatusColor(membership.status_label).bar} transition-all duration-500`}
              style={{ width: `${membership.progress}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Start Date</p>
              <p className="text-sm font-bold text-gray-700">{membership.start_date}</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">End Date</p>
              <p className="text-sm font-bold text-gray-700">{membership.end_date}</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Amount Due</p>
              <p className="text-sm font-bold text-gray-700">₱{membership.amount_due.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Amount Paid</p>
              <p className="text-sm font-bold text-emerald-600">₱{membership.amount_paid.toLocaleString()}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-100 rounded-2xl p-8 text-center mb-8">
          <i className="bi bi-credit-card text-4xl text-gray-300 mb-3 block" />
          <p className="text-gray-500 font-medium">No active membership</p>
          <p className="text-sm text-gray-400 mt-1">Visit the Renewals page to get started</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-6 mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">My Current Coaches</h2>
            <p className="text-xs text-gray-400 mt-0.5">Your active coach availments right now</p>
          </div>
          <span className="hidden sm:block w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <i className="bi bi-person-badge text-violet-500" />
          </span>
        </div>
        {activeCoaches.length === 0 ? (
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-4">
            <i className="bi bi-person-x text-xl text-gray-300" />
            <div>
              <p className="text-sm font-medium text-gray-600">No active coach yet</p>
              <p className="text-xs text-gray-400 mt-0.5">Visit the Coaches page to avail a coaching plan</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCoaches.map((e) => (
              <div key={e.id} className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-bold text-gray-800">{e.coach_name}</p>
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                    Active
                  </span>
                </div>
                <p className="text-xs text-gray-500">{e.coach_specialization || 'Coach'}</p>
                {e.selected_day_names.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-1">{e.selected_day_names.join(', ')}</p>
                )}
                <div className="mt-3 pt-3 border-t border-violet-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Paid</span>
                  <span className="text-sm font-bold text-gray-800">₱{e.amount_paid.toLocaleString()} / ₱{e.total_amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Payments</h2>
          <div className="space-y-3">
            {payments.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No payments yet</p>
            ) : (
              payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.item_description}</p>
                    <p className="text-xs text-gray-400">{p.receipt_no}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">₱{p.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400">{new Date(p.paid_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Bookings</h2>
          <div className="space-y-3">
            {bookings.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No bookings yet</p>
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{b.coach_name}</p>
                    <p className="text-xs text-gray-400">{b.day_name} {b.start_hour}:00–{b.end_hour}:00 ({b.shift_type})</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    b.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {b.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      <div className="bg-white rounded-2xl shadow-sm p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Coach Availments</h2>
          <div className="space-y-3">
            {enrollments.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No coach availments yet</p>
            ) : (
              enrollments.map((e) => (
                <div key={e.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{e.coach_name}</p>
                    <p className="text-xs text-gray-400">
                      {e.coach_specialization || 'Coach'}
                      {e.selected_day_names.length > 0 ? ` · ${e.selected_day_names.join(', ')}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">₱{e.total_amount.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400">
                        {e.payment_status === 'cash_pending' ? 'Awaiting cash confirmation' :
                         e.payment_status === 'pending' ? 'Awaiting GCash approval' :
                         e.payment_status === 'partially_paid' ? `Paid ₱${e.amount_paid.toLocaleString()} (partial)` :
                         `Paid ₱${e.amount_paid.toLocaleString()}`}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      e.enrollment_status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      e.enrollment_status === 'pending_payment' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {e.enrollment_status === 'pending_payment' ? 'Pending Payment' : e.enrollment_status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
