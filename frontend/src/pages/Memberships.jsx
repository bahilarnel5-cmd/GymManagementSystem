import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export default function Memberships() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['memberships', page, search, statusFilter],
    queryFn: () => api.get(`/gym_memberships/?page=${page}&per_page=10&search=${search}&status=${statusFilter}`).then((r) => r.data),
  })

  // Automated: memberships expiring within the next 7 days.
  const { data: expiringData, isLoading: expiringLoading } = useQuery({
    queryKey: ['memberships-expiring'],
    queryFn: () => api.get('/gym_memberships/expiring').then((r) => r.data),
  })

  const confirmCash = useMutation({
    mutationFn: (id) => api.patch(`/gym_memberships/${id}/confirm-cash`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] })
      queryClient.invalidateQueries({ queryKey: ['memberships-expiring'] })
    },
  })

  const { data: renewalsData } = useQuery({
    queryKey: ['renewal-requests'],
    queryFn: () => api.get('/gym_renewal_requests/?per_page=100').then((r) => r.data),
  })

  const confirmRenewalCash = useMutation({
    mutationFn: (id) => api.put(`/gym_renewal_requests/${id}/complete`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewal-requests'] })
      queryClient.invalidateQueries({ queryKey: ['memberships'] })
    },
  })

  const cashRenewals = (renewalsData || []).filter(
    (r) => r.payment_method === 'cash' && r.payment_status === 'cash_pending' && r.status === 'pending',
  )

  const expiring = expiringData?.items || []

  const statusColor = (s) => {
    switch (s) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'expired': return 'bg-red-100 text-red-700'
      case 'pending_payment': return 'bg-amber-100 text-amber-700'
      default: return 'bg-gray-100 text-gray-500'
    }
  }

  const paymentStatusColor = (s) => {
    switch (s) {
      case 'paid': return 'bg-green-100 text-green-700'
      case 'partially_paid': return 'bg-blue-100 text-blue-700'
      case 'cash_pending': return 'bg-orange-100 text-orange-700'
      case 'pending': return 'bg-amber-100 text-amber-700'
      default: return 'bg-gray-100 text-gray-500'
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Memberships</h1>
          <p className="text-sm text-gray-500 mt-1">Member subscriptions — expiring plans are notified automatically</p>
        </div>
      </div>

      {/* Cash renewals awaiting confirmation */}
      {cashRenewals.length > 0 && (
        <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-orange-100/70 border-b border-orange-200">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-sm">
              <i className="bi bi-cash-stack text-white text-xs" />
            </div>
            <div>
              <p className="text-sm font-semibold text-orange-800">Cash renewals awaiting confirmation ({cashRenewals.length})</p>
              <p className="text-xs text-orange-600">Member paid in cash — confirm receipt to renew their membership</p>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {cashRenewals.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 border-b border-orange-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.member_name}</p>
                  <p className="text-xs text-gray-500">{r.months_selected} month{r.months_selected > 1 ? 's' : ''} · ₱{r.final_amount.toLocaleString()}</p>
                </div>
                <button
                  onClick={() => confirmRenewalCash.mutate(r.id)}
                  disabled={confirmRenewalCash.isPending}
                  className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-100 border border-orange-300 rounded-lg px-3 py-1.5 hover:bg-orange-200 disabled:opacity-50 transition-colors"
                >
                  <i className="bi bi-cash-coin" /> Confirm Cash Received
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Automated expiry notification banner */}
      {expiring.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-amber-100/70 border-b border-amber-200">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-sm">
              <i className="bi bi-bell-fill text-white text-xs" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">Memberships expiring soon ({expiring.length})</p>
              <p className="text-xs text-amber-600">Plans ending within the next 7 days</p>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {expiringLoading ? (
              <p className="px-5 py-4 text-sm text-amber-600">Checking expiring memberships...</p>
            ) : (
              expiring.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3 border-b border-amber-100 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-white border border-amber-200 flex items-center justify-center text-amber-600 text-[10px] font-bold">
                    {m.member_name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.member_name}</p>
                    <p className="text-xs text-gray-500">{m.plan_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-amber-700">
                      {m.days_left === 0 ? 'Expires today' : `${m.days_left} day${m.days_left === 1 ? '' : 's'} left`}
                    </p>
                    <p className="text-[10px] text-gray-400">{m.end_date}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input placeholder="Search by member name (starts with)..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gym-500 focus:border-transparent outline-none bg-white shadow-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white shadow-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="pending_payment">Pending Payment</option>
        </select>
      </div>

      <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80 text-gray-600">
            <tr>
              <th className="text-left px-5 py-3.5 font-medium">Member</th>
              <th className="text-left px-5 py-3.5 font-medium">Plan</th>
              <th className="text-left px-5 py-3.5 font-medium">Status</th>
              <th className="text-left px-5 py-3.5 font-medium">Payment</th>
              <th className="text-left px-5 py-3.5 font-medium">Method</th>
              <th className="text-left px-5 py-3.5 font-medium">Start</th>
              <th className="text-left px-5 py-3.5 font-medium">End</th>
              <th className="text-right px-5 py-3.5 font-medium">Expiry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No memberships found</td></tr>
            ) : (
              data?.items?.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-800">{m.member_name}</p>
                    <p className="text-xs text-gray-400">{m.member_phone}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-gray-700">{m.plan_name}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(m.status)}`}>{m.status}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs text-gray-500">Due: ₱{m.amount_due.toLocaleString()}</p>
                    <p className="text-xs font-medium text-gym-600">Paid: ₱{m.amount_paid.toLocaleString()}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${paymentStatusColor(m.payment_status)}`}>
                      {String(m.payment_status).replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs font-medium text-gray-700">{m.months_selected} mo · {String(m.payment_method).replace('_', ' ')}</p>
                    {m.payment_method === 'cash' && m.payment_status === 'cash_pending' && (
                      <button
                        onClick={() => confirmCash.mutate(m.id)}
                        disabled={confirmCash.isPending}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                      >
                        <i className="bi bi-cash-stack" /> Confirm Cash Received
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{m.start_date}</td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{m.end_date}</td>
                  <td className="px-5 py-3.5 text-right">
                    {m.expiring_soon ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium bg-amber-50 px-2.5 py-1 rounded-lg">
                        <i className="bi bi-exclamation-triangle-fill text-[10px]" /> 7d
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">{m.days_left != null ? `${m.days_left}d` : '—'}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {isLoading ? (
          <p className="text-center py-12 text-gray-400">Loading...</p>
        ) : data?.items?.length === 0 ? (
          <p className="text-center py-12 text-gray-400">No memberships found</p>
        ) : (
          data?.items?.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-800">{m.member_name}</p>
                  <p className="text-xs text-gray-400">{m.plan_name}</p>
                </div>
                {m.expiring_soon ? (
                  <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium bg-amber-50 px-2.5 py-1 rounded-lg">
                    <i className="bi bi-exclamation-triangle-fill text-[10px]" /> Expiring soon
                  </span>
                ) : (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(m.status)}`}>{m.status}</span>
                )}
              </div>
              <div className="mt-3 text-sm text-gray-600 grid grid-cols-2 gap-1">
                <p>Due: ₱{m.amount_due.toLocaleString()}</p>
                <p className="text-gym-600 font-medium">Paid: ₱{m.amount_paid.toLocaleString()}</p>
                <p className="text-xs text-gray-400 col-span-2">{m.start_date} — {m.end_date}</p>
                <p className="text-xs text-gray-500 col-span-2">
                  {m.months_selected} mo · {String(m.payment_method).replace('_', ' ')} ·{' '}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${paymentStatusColor(m.payment_status)}`}>
                    {String(m.payment_status).replace('_', ' ')}
                  </span>
                </p>
                {m.payment_method === 'cash' && m.payment_status === 'cash_pending' && (
                  <button
                    onClick={() => confirmCash.mutate(m.id)}
                    disabled={confirmCash.isPending}
                    className="mt-1 col-span-2 inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                  >
                    <i className="bi bi-cash-stack" /> Confirm Cash Received
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 mt-4 bg-white rounded-xl shadow-sm">
          <span className="text-sm text-gray-500">Page {data.page} of {data.pages} ({data.total} total)</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Prev</button>
            <button onClick={() => setPage(Math.min(data.pages, page + 1))} disabled={page === data.pages} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
