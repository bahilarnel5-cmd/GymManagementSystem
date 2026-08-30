import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

const coachColors = [
  { bg: 'bg-violet-500', ring: 'ring-violet-200' },
  { bg: 'bg-blue-500', ring: 'ring-blue-200' },
  { bg: 'bg-emerald-500', ring: 'ring-emerald-200' },
  { bg: 'bg-amber-500', ring: 'ring-amber-200' },
  { bg: 'bg-rose-500', ring: 'ring-rose-200' },
]

const tabs = [
  { id: 'coaches', label: 'Coaches', icon: 'bi-person-badge' },
  { id: 'enrollments', label: 'Enrollments', icon: 'bi-people' },
]

export default function Coaches() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'coaches'
  const setTab = (id) => setParams(id === 'coaches' ? {} : { tab: id })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Coaching</h1>
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-white shadow text-violet-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className={`bi ${t.icon} text-xs`} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'coaches' && <CoachesGrid />}
      {tab === 'enrollments' && <Enrollments />}
    </div>
  )
}

function CoachesGrid() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['coaches', page, search],
    queryFn: () => api.get(`/gym_coaches/?page=${page}&per_page=10&search=${search}`).then((r) => r.data),
  })

  const getInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div>
      <div className="mb-6">
        <div className="relative max-w-md">
          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            placeholder="Search coaches..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gym-500 focus:border-transparent outline-none bg-white shadow-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gym-600" />
        </div>
      ) : data?.items?.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
          <i className="bi bi-person-badge text-4xl text-gray-300 mb-3 block" />
          <p className="text-gray-400">No coaches found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data?.items?.map((c, idx) => {
            const color = coachColors[idx % coachColors.length]
            return (
              <div key={c.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
                <div className={`${color.bg} p-5 pb-8 relative`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg ring-2 ${color.ring}`}>
                      {getInitials(c.full_name)}
                    </div>
                    <div className="text-white">
                      <h3 className="font-bold text-sm">{c.full_name}</h3>
                      <p className="text-white/70 text-xs">{c.specialization}</p>
                    </div>
                  </div>
                </div>

                <div className="relative px-5 pb-5 -mt-3">
                  <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gym-50 flex items-center justify-center">
                        <i className="bi bi-cash-stack text-gym-600 text-xs" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Rate</p>
                        <p className="text-sm font-bold text-gray-800">₱{c.hourly_rate.toLocaleString()}/day</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                        <i className="bi bi-telephone text-blue-600 text-xs" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Contact</p>
                        <p className="text-sm font-medium text-gray-700">{c.mobile_contact}</p>
                      </div>
                    </div>

                    {c.shift_schedule && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                          <i className="bi bi-clock text-amber-600 text-xs" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Schedule</p>
                          <p className="text-sm font-medium text-gray-700">{c.shift_schedule}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 mt-6 bg-white rounded-xl shadow-sm">
          <span className="text-sm text-gray-500">Page {data.page} of {data.pages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Prev</button>
            <button onClick={() => setPage(Math.min(data.pages, page + 1))} disabled={page === data.pages} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}

const methodLabel = (m) => ({ full_payment: 'Full Payment', down_payment: 'Down Payment', cash: 'Cash' }[m] || m)

function Enrollments() {
  const queryClient = useQueryClient()
  const [coachFilter, setCoachFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: coachesData } = useQuery({
    queryKey: ['coaches-all'],
    queryFn: () => api.get('/gym_coaches/?per_page=100').then((r) => r.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['coach-enrollments', coachFilter, statusFilter],
    queryFn: () => {
      const p = new URLSearchParams({ per_page: '100' })
      if (coachFilter) p.set('coach_id', coachFilter)
      if (statusFilter) p.set('enrollment_status', statusFilter)
      return api.get(`/gym_coach_enrollments/?${p.toString()}`).then((r) => r.data)
    },
  })

  const confirmCash = useMutation({
    mutationFn: (id) => api.patch(`/gym_coach_enrollments/${id}/confirm-cash`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coach-enrollments'] }),
  })

  const list = data?.items || []

  const statusBadge = (s) => {
    const map = {
      paid: 'bg-green-100 text-green-700',
      partially_paid: 'bg-amber-100 text-amber-700',
      pending: 'bg-gray-100 text-gray-700',
      cash_pending: 'bg-orange-100 text-orange-700',
    }
    return map[s] || 'bg-gray-100 text-gray-700'
  }
  const enrollBadge = (s) => {
    const map = {
      active: 'bg-emerald-100 text-emerald-700',
      pending_payment: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700',
    }
    return map[s] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <select value={coachFilter} onChange={(e) => setCoachFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
          <option value="">All coaches</option>
          {(coachesData?.items || []).map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
          <option value="">All enrollment statuses</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Member</th>
              <th className="text-left px-4 py-3 font-medium">Coach</th>
              <th className="text-left px-4 py-3 font-medium">Days</th>
              <th className="text-left px-4 py-3 font-medium">Method</th>
              <th className="text-left px-4 py-3 font-medium">Paid / Total</th>
              <th className="text-left px-4 py-3 font-medium">Payment</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">No coach enrollments yet</td></tr>
            ) : (
              list.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{e.member_name}</td>
                  <td className="px-4 py-3 text-gray-700">{e.coach_name}</td>
                  <td className="px-4 py-3 text-gray-600">{e.selected_day_names?.join(', ')}</td>
                  <td className="px-4 py-3 text-gray-600">{methodLabel(e.payment_method)}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gym-600">₱{e.amount_paid.toLocaleString()}</span>
                    <span className="text-gray-400"> / ₱{e.total_amount.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(e.payment_status)}`}>{String(e.payment_status).replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${enrollBadge(e.enrollment_status)}`}>{String(e.enrollment_status).replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {e.payment_method === 'cash' && e.payment_status === 'cash_pending' && (
                      <button
                        onClick={() => { if (confirm(`Confirm cash received from ${e.member_name}?`)) confirmCash.mutate(e.id) }}
                        disabled={confirmCash.isPending}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Confirm Cash Received
                      </button>
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
          <p className="text-center py-8 text-gray-400">Loading...</p>
        ) : list.length === 0 ? (
          <p className="text-center py-10 text-gray-400">No coach enrollments yet</p>
        ) : (
          list.map((e) => (
            <div key={e.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{e.member_name}</p>
                  <p className="text-xs text-gray-500">{e.coach_name} · {methodLabel(e.payment_method)}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${enrollBadge(e.enrollment_status)}`}>{String(e.enrollment_status).replace('_', ' ')}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{e.selected_day_names?.join(', ')}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-semibold text-gym-600">₱{e.amount_paid.toLocaleString()}</span>
                <span className="text-gray-400 text-sm">/ ₱{e.total_amount.toLocaleString()}</span>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge(e.payment_status)}`}>{String(e.payment_status).replace('_', ' ')}</span>
              </div>
              {e.payment_method === 'cash' && e.payment_status === 'cash_pending' && (
                <button
                  onClick={() => { if (confirm(`Confirm cash received from ${e.member_name}?`)) confirmCash.mutate(e.id) }}
                  disabled={confirmCash.isPending}
                  className="mt-3 w-full py-2 rounded-lg text-xs font-medium bg-green-600 text-white disabled:opacity-50"
                >
                  Confirm Cash Received
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
