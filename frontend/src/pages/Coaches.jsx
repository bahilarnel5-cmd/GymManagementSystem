import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export default function Coaches() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['coaches', page, search],
    queryFn: () => api.get(`/gym_coaches/?page=${page}&per_page=10&search=${search}`).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/gym_coaches/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coaches'] }),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Coaches</h1>
      </div>

      <div className="mb-4">
        <input
          placeholder="Search coaches by name, specialization, contact..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full sm:w-96 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gym-500 focus:border-transparent outline-none"
        />
      </div>

      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Specialization</th>
              <th className="text-left px-4 py-3 font-medium">Rate/hr</th>
              <th className="text-left px-4 py-3 font-medium">Contact</th>
              <th className="text-left px-4 py-3 font-medium">Shift</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No coaches found</td></tr>
            ) : (
              data?.items?.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.specialization}</td>
                  <td className="px-4 py-3 font-semibold text-gym-600">₱{c.hourly_rate.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{c.mobile_contact}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{c.shift_schedule || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteMutation.mutate(c.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
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
          <p className="text-center py-8 text-gray-400">No coaches found</p>
        ) : (
          data?.items?.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-800">{c.full_name}</p>
                  <p className="text-xs text-gray-500">{c.specialization}</p>
                </div>
                <p className="font-semibold text-gym-600">₱{c.hourly_rate.toLocaleString()}/hr</p>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p>{c.mobile_contact}</p>
                <p className="text-xs">{c.shift_schedule || '—'}</p>
              </div>
              <button onClick={() => deleteMutation.mutate(c.id)} className="mt-3 text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
            </div>
          ))
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 mt-4 bg-white rounded-xl shadow-sm">
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
