import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export default function Payments() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['payments', page, search],
    queryFn: () => api.get(`/gym_payments/?page=${page}&per_page=10&search=${search}`).then((r) => r.data),
  })

  const voidMutation = useMutation({
    mutationFn: (id) => api.delete(`/gym_payments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
      </div>

      <div className="mb-4">
        <input placeholder="Search by name or receipt no..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gym-500 focus:border-transparent outline-none" />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Receipt</th>
              <th className="text-left px-4 py-3 font-medium">Member</th>
              <th className="text-left px-4 py-3 font-medium">Description</th>
              <th className="text-left px-4 py-3 font-medium">Amount</th>
              <th className="text-left px-4 py-3 font-medium">Method</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">No payments found</td></tr>
            ) : (
              data?.items?.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.receipt_no}</td>
                  <td className="px-4 py-3 font-medium">{p.member_name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.item_description}</td>
                  <td className="px-4 py-3 font-semibold text-gym-600">₱{p.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{p.payment_method}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{new Date(p.paid_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    {p.status === 'paid' && (
                      <button onClick={() => { if (confirm('Void this payment?')) voidMutation.mutate(p.id) }} className="text-red-500 hover:text-red-700 text-xs font-medium">Void</button>
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
