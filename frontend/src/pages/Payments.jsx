import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'

export default function Payments() {
  const queryClient = useQueryClient()
  const orgId = useAuthStore((s) => s.orgId) || '11111111-1111-1111-1111-111111111111'
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showRecord, setShowRecord] = useState(false)

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
        <button
          onClick={() => setShowRecord(!showRecord)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${showRecord ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-cyan-600 text-white hover:bg-cyan-700'}`}
        >
          <i className={`bi ${showRecord ? 'bi-x-lg' : 'bi-plus-lg'} text-xs`} />
          {showRecord ? 'Close' : 'Record Payment'}
        </button>
      </div>

      {showRecord && <RecordPaymentForm orgId={orgId} queryClient={queryClient} onDone={() => setShowRecord(false)} />}

      <div className="mb-4">
        <input placeholder="Search by name or receipt no..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-full sm:w-96 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gym-500 focus:border-transparent outline-none" />
      </div>

      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Receipt</th>
              <th className="text-left px-4 py-3 font-medium">Member</th>
              <th className="text-left px-4 py-3 font-medium">Description</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Amount</th>
              <th className="text-left px-4 py-3 font-medium">Method</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-gray-400">No payments found</td></tr>
            ) : (
              data?.items?.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.receipt_no}</td>
                  <td className="px-4 py-3 font-medium">{p.member_name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.item_description}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.payment_category === 'coach' ? 'bg-violet-100 text-violet-700' : 'bg-cyan-100 text-cyan-700'} capitalize`}>{p.payment_category || 'membership'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gym-600">₱{p.amount.toLocaleString()}</span>
                    {p.discount_amount > 0 && (
                      <span className="block text-[10px] text-red-500">-₱{p.discount_amount.toLocaleString()} {p.discount_description ? `(${p.discount_description})` : 'discount'}</span>
                    )}
                  </td>
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
      </div>

      <div className="md:hidden space-y-3">
        {isLoading ? (
          <p className="text-center py-8 text-gray-400">Loading...</p>
        ) : data?.items?.length === 0 ? (
          <p className="text-center py-8 text-gray-400">No payments found</p>
        ) : (
          data?.items?.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-800">{p.member_name}</p>
                  <p className="text-xs text-gray-500 font-mono">{p.receipt_no}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.payment_category === 'coach' ? 'bg-violet-100 text-violet-700' : 'bg-cyan-100 text-cyan-700'} capitalize`}>{p.payment_category || 'membership'}</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p>{p.item_description}</p>
                <div className="flex items-center justify-between mt-1">
                  <div>
                    <span className="font-semibold text-gym-600">₱{p.amount.toLocaleString()}</span>
                    {p.discount_amount > 0 && <span className="block text-[10px] text-red-500">-₱{p.discount_amount.toLocaleString()}</span>}
                  </div>
                  <span className="text-xs">{p.payment_method} · {new Date(p.paid_at).toLocaleDateString()}</span>
                </div>
              </div>
              {p.status === 'paid' && (
                <button onClick={() => { if (confirm('Void this payment?')) voidMutation.mutate(p.id) }} className="mt-3 text-red-500 hover:text-red-700 text-xs font-medium">Void</button>
              )}
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

function RecordPaymentForm({ orgId, queryClient, onDone }) {
  const [form, setForm] = useState({
    member_id: '',
    item_description: '',
    amount: '',
    payment_category: 'membership',
    discount_amount: '',
    discount_description: '',
    payment_method: 'cash',
    reference_no: '',
  })

  const { data: membersData } = useQuery({
    queryKey: ['payment-members'],
    queryFn: () => api.get('/gym_members/?per_page=100').then((r) => r.data),
  })
  const members = membersData?.items || []

  const createMutation = useMutation({
    mutationFn: (p) => api.post('/gym_payments/', {
      ...p,
      organization_id: orgId,
      amount: parseFloat(p.amount) || 0,
      discount_amount: parseFloat(p.discount_amount) || 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['recent-payments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setForm({
        member_id: '', item_description: '', amount: '', payment_category: 'membership',
        discount_amount: '', discount_description: '', payment_method: 'cash', reference_no: '',
      })
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  const listAmount = parseFloat(form.amount) || 0
  const listDiscount = parseFloat(form.discount_amount) || 0
  const total = Math.max(listAmount - listDiscount, 0)

  return (
    <div className="mb-6 bg-white rounded-2xl shadow-sm border-2 border-cyan-200 overflow-hidden">
      <div className="bg-gradient-to-r from-cyan-500 to-teal-500 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <i className="bi bi-cash-coin text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Record New Payment</h2>
              <p className="text-cyan-100 text-xs">Apply discounts and classify by type</p>
            </div>
          </div>
          <button onClick={onDone} className="text-white/70 hover:text-white"><i className="bi bi-x-lg" /></button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Member</label>
            <select value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none" required>
              <option value="">Select member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name} ({m.member_code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
            <input placeholder="e.g. Monthly membership, PT session" value={form.item_description} onChange={(e) => setForm({ ...form, item_description: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Payment Type</label>
            <select value={form.payment_category} onChange={(e) => setForm({ ...form, payment_category: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none">
              <option value="membership">Membership</option>
              <option value="coach">Coach-related</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Gross Amount (₱)</label>
            <input type="number" min="0" placeholder="1000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Discount (₱)</label>
            <input type="number" min="0" placeholder="0" value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Discount Note</label>
            <input placeholder="e.g. Loyalty promo, referral" value={form.discount_description} onChange={(e) => setForm({ ...form, discount_description: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Method</label>
            <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none">
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="gcash">GCash</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Reference No.</label>
            <input placeholder="Optional" value={form.reference_no} onChange={(e) => setForm({ ...form, reference_no: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <button type="submit" disabled={createMutation.isPending} className="bg-cyan-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-cyan-700 disabled:opacity-50 transition-colors">
            {createMutation.isPending ? 'Saving...' : 'Record Payment'}
          </button>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total to collect</p>
            <p className="text-xl font-bold text-gym-600">₱{total.toLocaleString()}</p>
            {listDiscount > 0 && <p className="text-[10px] text-red-500">includes ₱{listDiscount.toLocaleString()} discount</p>}
          </div>
        </div>
        {createMutation.isError && <p className="text-sm text-red-500">{createMutation.error?.response?.data?.detail || 'Error recording payment'}</p>}
        {createMutation.isSuccess && (
          <div className="flex items-center gap-2 text-sm text-cyan-700 bg-cyan-50 px-4 py-2 rounded-xl">
            <i className="bi bi-check-circle-fill" /> Payment recorded successfully!
          </div>
        )}
      </form>
    </div>
  )
}
