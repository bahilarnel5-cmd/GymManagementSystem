import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'

export default function CheckIns() {
  const queryClient = useQueryClient()
  const orgId = useAuthStore((s) => s.orgId) || '11111111-1111-1111-1111-111111111111'
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ member_id: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['checkins', page, search],
    queryFn: () => api.get(`/gym_check_ins/?page=${page}&per_page=10&search=${search}`).then((r) => r.data),
  })

  const { data: members } = useQuery({
    queryKey: ['members-list'],
    queryFn: () => api.get('/gym_members/?per_page=200').then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (m) => api.post('/gym_check_ins/', { ...m, organization_id: orgId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['checkins'] }); setShowForm(false); setForm({ member_id: '' }) },
  })

  const handleSubmit = (e) => { e.preventDefault(); createMutation.mutate(form) }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Check-ins</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-gym-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gym-700">
          {showForm ? 'Cancel' : '+ New Check-in'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-6 flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Member</label>
            <select value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required>
              <option value="">Choose a member...</option>
              {members?.items?.map((m) => <option key={m.id} value={m.id}>{m.full_name} ({m.member_code})</option>)}
            </select>
          </div>
          <button type="submit" disabled={createMutation.isPending} className="bg-gym-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gym-700 disabled:opacity-50 whitespace-nowrap">
            {createMutation.isPending ? 'Saving...' : 'Check In'}
          </button>
        </form>
      )}

      <div className="mb-4">
        <input placeholder="Search check-ins..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-full sm:w-96 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gym-500 focus:border-transparent outline-none" />
      </div>

      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Member</th>
              <th className="text-left px-4 py-3 font-medium">Member Code</th>
              <th className="text-left px-4 py-3 font-medium">Check-in Time</th>
              <th className="text-left px-4 py-3 font-medium">Check-out Time</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">No check-ins found</td></tr>
            ) : (
              data?.items?.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.member_name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.member_code}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{new Date(c.check_in_time).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{c.check_out_time ? new Date(c.check_out_time).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === 'checked_in' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
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
        ) : data?.items?.length === 0 ? (
          <p className="text-center py-8 text-gray-400">No check-ins found</p>
        ) : (
          data?.items?.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-800">{c.member_name}</p>
                  <p className="text-xs text-gray-500 font-mono">{c.member_code}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === 'checked_in' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p className="text-xs">In: {new Date(c.check_in_time).toLocaleString()}</p>
                <p className="text-xs">Out: {c.check_out_time ? new Date(c.check_out_time).toLocaleString() : '—'}</p>
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
