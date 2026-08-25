import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'

export default function Members() {
  const queryClient = useQueryClient()
  const orgId = useAuthStore((s) => s.orgId) || '11111111-1111-1111-1111-111111111111'
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ member_code: '', full_name: '', email: '', mobile_phone: '', status: 'active' })

  const { data, isLoading } = useQuery({
    queryKey: ['members', page, search],
    queryFn: () =>
      api.get(`/gym_members/?page=${page}&per_page=10&search=${search}`).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (newMember) => api.post('/gym_members/', { ...newMember, organization_id: orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setShowForm(false)
      setForm({ member_code: '', full_name: '', email: '', mobile_phone: '', status: 'active' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/gym_members/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Members</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-gym-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gym-700">
          {showForm ? 'Cancel' : '+ Add Member'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input placeholder="Member Code" value={form.member_code} onChange={(e) => setForm({ ...form, member_code: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
          <input placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
          <input placeholder="Mobile Phone" value={form.mobile_phone} onChange={(e) => setForm({ ...form, mobile_phone: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
          <div className="md:col-span-2">
            <button type="submit" disabled={createMutation.isPending} className="bg-gym-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gym-700 disabled:opacity-50">
              {createMutation.isPending ? 'Saving...' : 'Save Member'}
            </button>
          </div>
        </form>
      )}

      <div className="mb-4">
        <input
          placeholder="Search members..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gym-500 focus:border-transparent outline-none"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Code</th>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Phone</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No members found</td></tr>
            ) : (
              data?.items?.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{m.member_code}</td>
                  <td className="px-4 py-3 font-medium">{m.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">{m.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{m.mobile_phone}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteMutation.mutate(m.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
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
