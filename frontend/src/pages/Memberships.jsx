import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export default function Memberships() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [emailModal, setEmailModal] = useState(false)
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['memberships', page, search, statusFilter],
    queryFn: () => api.get(`/gym_memberships/?page=${page}&per_page=10&search=${search}&status=${statusFilter}`).then((r) => r.data),
  })

  const emailMutation = useMutation({
    mutationFn: (payload) => api.post('/gym_memberships/send-expiry-email', payload),
    onSuccess: () => { setEmailModal(false); setEmailForm({ to: '', subject: '', body: '' }) },
  })

  const handleSendEmail = (e) => {
    e.preventDefault()
    emailMutation.mutate(emailForm)
  }

  const openEmail = (membership) => {
    setEmailForm({
      to: membership.member_email || '',
      subject: `Your ${membership.plan_name} membership is expiring soon`,
      body: `Dear ${membership.member_name},\n\nYour ${membership.plan_name} membership will expire on ${membership.end_date}. Please renew your plan to continue enjoying our services.\n\nThank you!`,
    })
    setEmailModal(true)
  }

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Memberships</h1>
      </div>

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
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">No memberships found</td></tr>
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
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEmail(m)} className="text-blue-500 hover:text-blue-700 text-xs font-medium">
                      <i className="bi bi-envelope mr-1" />Email
                    </button>
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
              <button onClick={() => openEmail(m)} className="mt-3 text-blue-500 hover:text-blue-700 text-xs font-medium">
                <i className="bi bi-envelope mr-1" />Send Expiry Email
              </button>
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

      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Send Expiry Notification</h2>
              <button onClick={() => setEmailModal(false)} className="text-gray-400 hover:text-gray-600">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">To</label>
                <input type="email" value={emailForm.to} onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Subject</label>
                <input value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Message</label>
                <textarea value={emailForm.body} onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })} rows={5} className="w-full px-3 py-2 border rounded-lg text-sm" required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={emailMutation.isPending} className="bg-gym-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gym-700 disabled:opacity-50">
                  {emailMutation.isPending ? 'Sending...' : 'Send Email'}
                </button>
                <button type="button" onClick={() => setEmailModal(false)} className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
              {emailMutation.isSuccess && <p className="text-sm text-green-600">Email sent successfully!</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
