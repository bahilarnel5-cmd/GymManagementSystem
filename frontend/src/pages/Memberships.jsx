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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Memberships</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <input placeholder="Search by member name..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-full md:w-72 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gym-500 focus:border-transparent outline-none" />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="pending_payment">Pending Payment</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-gray-500">Page {data.page} of {data.pages} ({data.total} total)</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Prev</button>
              <button onClick={() => setPage(Math.min(data.pages, page + 1))} disabled={page === data.pages} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
