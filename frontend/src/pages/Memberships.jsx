import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'

export default function Memberships() {
  const queryClient = useQueryClient()
  const orgId = useAuthStore((s) => s.orgId) || '11111111-1111-1111-1111-111111111111'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ member_id: '', plan_id: '', payment_type: 'full', amount_due: '', amount_paid: '', start_date: '', end_date: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['memberships', page, search, statusFilter],
    queryFn: () => api.get(`/gym_memberships/?page=${page}&per_page=10&search=${search}&status=${statusFilter}`).then((r) => r.data),
  })

  const { data: members } = useQuery({
    queryKey: ['members-list'],
    queryFn: () => api.get('/gym_members/?per_page=200').then((r) => r.data),
  })

  const { data: plans } = useQuery({
    queryKey: ['plans-list'],
    queryFn: () => api.get('/gym_membership_plans/?per_page=50').then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (m) => api.post('/gym_memberships/', { ...m, organization_id: orgId, amount_due: parseFloat(m.amount_due || 0), amount_paid: parseFloat(m.amount_paid || 0) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['memberships'] }); setShowForm(false); setForm({ member_id: '', plan_id: '', payment_type: 'full', amount_due: '', amount_paid: '', start_date: '', end_date: '' }) },
  })

  const handleSubmit = (e) => { e.preventDefault(); createMutation.mutate(form) }

  const statusColor = (s) => {
    switch (s) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'expired': return 'bg-red-100 text-red-700'
      case 'pending_payment': return 'bg-amber-100 text-amber-700'
      default: return 'bg-gray-100 text-gray-500'
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Memberships</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-gym-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gym-700">
          {showForm ? 'Cancel' : '+ Add Membership'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <select value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required>
            <option value="">Select Member</option>
            {members?.items?.map((m) => <option key={m.id} value={m.id}>{m.full_name} ({m.member_code})</option>)}
          </select>
          <select value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required>
            <option value="">Select Plan</option>
            {plans?.items?.map((p) => <option key={p.id} value={p.id}>{p.name} - ₱{p.price}</option>)}
          </select>
          <select value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value })} className="px-3 py-2 border rounded-lg text-sm">
            <option value="full">Full Payment</option>
            <option value="partial">Partial Payment</option>
          </select>
          <input placeholder="Amount Due" type="number" value={form.amount_due} onChange={(e) => setForm({ ...form, amount_due: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
          <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
          <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
          <div className="md:col-span-2">
            <button type="submit" disabled={createMutation.isPending} className="bg-gym-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gym-700 disabled:opacity-50">
              {createMutation.isPending ? 'Saving...' : 'Save Membership'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <input placeholder="Search by member name..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-full sm:w-72 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gym-500 focus:border-transparent outline-none" />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="pending_payment">Pending Payment</option>
        </select>
      </div>

      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Member</th>
              <th className="text-left px-4 py-3 font-medium">Plan</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Payment</th>
              <th className="text-left px-4 py-3 font-medium">Start</th>
              <th className="text-left px-4 py-3 font-medium">End</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No memberships found</td></tr>
            ) : (
              data?.items?.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{m.member_name}</p>
                    <p className="text-xs text-gray-500">{m.member_phone}</p>
                  </td>
                  <td className="px-4 py-3 font-medium">{m.plan_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(m.status)}`}>{m.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs">Due: ₱{m.amount_due.toLocaleString()}</p>
                    <p className="text-xs text-gym-600">Paid: ₱{m.amount_paid.toLocaleString()}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{m.start_date}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{m.end_date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {isLoading ? (
          <p className="text-center py-8 text-gray-400">Loading...</p>
        ) : data?.items?.length === 0 ? (
          <p className="text-center py-8 text-gray-400">No memberships found</p>
        ) : (
          data?.items?.map((m) => (
            <div key={m.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-800">{m.member_name}</p>
                  <p className="text-xs text-gray-500">{m.plan_name}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(m.status)}`}>{m.status}</span>
              </div>
              <div className="mt-2 text-sm text-gray-600 grid grid-cols-2 gap-1">
                <p>Due: ₱{m.amount_due.toLocaleString()}</p>
                <p className="text-gym-600">Paid: ₱{m.amount_paid.toLocaleString()}</p>
                <p className="text-xs">{m.start_date} — {m.end_date}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 mt-4 bg-white rounded-xl shadow-sm">
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
