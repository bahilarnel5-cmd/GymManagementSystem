import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export default function CheckIns() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [dateFilter, setDateFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['checkins', page, search, dateFilter],
    queryFn: () => api.get(`/gym_checkins/?page=${page}&per_page=15&search=${search}&date_filter=${dateFilter}`).then((r) => r.data),
  })

  const checkoutMutation = useMutation({
    mutationFn: (id) => api.put(`/gym_checkins/${id}/checkout`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checkins'] }),
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Check-ins</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <input placeholder="Search by name or code..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-full md:w-72 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gym-500 focus:border-transparent outline-none" />
        <input type="date" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setPage(1) }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        {dateFilter && (
          <button onClick={() => { setDateFilter(''); setPage(1) }} className="text-sm text-gray-500 hover:text-gray-700">Clear date</button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Member</th>
              <th className="text-left px-4 py-3 font-medium">Code</th>
              <th className="text-left px-4 py-3 font-medium">Zone/Class</th>
              <th className="text-left px-4 py-3 font-medium">Check-in Time</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No check-ins found</td></tr>
            ) : (
              data?.items?.map((ci) => (
                <tr key={ci.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{ci.member_name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{ci.member_code}</td>
                  <td className="px-4 py-3 text-gray-600">{ci.zone_class || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{new Date(ci.checked_in_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ci.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{ci.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {ci.status === 'active' && (
                      <button onClick={() => checkoutMutation.mutate(ci.id)} className="text-amber-600 hover:text-amber-800 text-xs font-medium">Check out</button>
                    )}
                  </td>
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
