import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export default function Memberships() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [emailModal, setEmailModal] = useState(false)
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' })
  const [bulkOpen, setBulkOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['memberships', page, search, statusFilter],
    queryFn: () => api.get(`/gym_memberships/?page=${page}&per_page=10&search=${search}&status=${statusFilter}`).then((r) => r.data),
  })

  const emailMutation = useMutation({
    mutationFn: (payload) => api.post('/gym_memberships/send-expiry-email', payload),
    onSuccess: () => { setEmailModal(false); setEmailForm({ to: '', subject: '', body: '' }); setBulkOpen(false) },
  })

  const handleSendEmail = (e) => {
    e.preventDefault()
    emailMutation.mutate(emailForm)
  }

  const openIndividualEmail = (membership) => {
    setEmailForm({
      to: membership.member_email || '',
      subject: `Your ${membership.plan_name} membership is expiring soon`,
      body: `Dear ${membership.member_name},\n\nYour ${membership.plan_name} membership will expire on ${membership.end_date}. Please renew your plan to continue enjoying our services.\n\nThank you!`,
    })
    setEmailModal(true)
    setDropdownOpen(null)
  }

  const openBulkEmail = () => {
    setEmailForm({
      to: '',
      subject: 'Your membership is expiring soon',
      body: `Dear Member,\n\nYour membership plan is about to expire. Please renew your plan to continue enjoying our services.\n\nThank you!`,
    })
    setEmailModal(true)
    setBulkOpen(false)
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Memberships</h1>
          <p className="text-sm text-gray-500 mt-1">Manage member subscriptions and send notifications</p>
        </div>

        {/* Bulk email button with dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex">
            <button
              onClick={() => setBulkOpen(!bulkOpen)}
              className="flex items-center gap-2 bg-gym-600 text-white px-4 py-2 rounded-l-xl text-sm font-medium hover:bg-gym-700 transition-colors"
            >
              <i className="bi bi-envelope-fill" />
              Send Expiry Email
            </button>
            <button
              onClick={() => setBulkOpen(!bulkOpen)}
              className="bg-gym-600 text-white px-2.5 py-2 rounded-r-xl border-l border-gym-500 hover:bg-gym-700 transition-colors"
            >
              <i className={`bi bi-chevron-${bulkOpen ? 'up' : 'down'} text-xs`} />
            </button>
          </div>

          {bulkOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-30">
              <button
                onClick={() => { setBulkOpen(false); openBulkEmail() }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <i className="bi bi-people text-blue-600 text-xs" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Send to All</p>
                  <p className="text-xs text-gray-400">All expiring members</p>
                </div>
              </button>
              <div className="border-t border-gray-100 my-1" />
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Or select individual</p>
              {data?.items?.filter(m => m.status === 'active' || m.status === 'pending_payment').slice(0, 5).map((m) => (
                <button
                  key={m.id}
                  onClick={() => openIndividualEmail(m)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gym-50 flex items-center justify-center text-gym-600 text-[10px] font-bold">
                    {m.member_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-medium truncate">{m.member_name}</p>
                    <p className="text-xs text-gray-400">{m.plan_name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input placeholder="Search by member name..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gym-500 focus:border-transparent outline-none bg-white shadow-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white shadow-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="pending_payment">Pending Payment</option>
        </select>
      </div>

      <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80 text-gray-600">
            <tr>
              <th className="text-left px-5 py-3.5 font-medium">Member</th>
              <th className="text-left px-5 py-3.5 font-medium">Plan</th>
              <th className="text-left px-5 py-3.5 font-medium">Status</th>
              <th className="text-left px-5 py-3.5 font-medium">Payment</th>
              <th className="text-left px-5 py-3.5 font-medium">Start</th>
              <th className="text-left px-5 py-3.5 font-medium">End</th>
              <th className="text-right px-5 py-3.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No memberships found</td></tr>
            ) : (
              data?.items?.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-800">{m.member_name}</p>
                    <p className="text-xs text-gray-400">{m.member_phone}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-gray-700">{m.plan_name}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(m.status)}`}>{m.status}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs text-gray-500">Due: ₱{m.amount_due.toLocaleString()}</p>
                    <p className="text-xs font-medium text-gym-600">Paid: ₱{m.amount_paid.toLocaleString()}</p>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{m.start_date}</td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{m.end_date}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => openIndividualEmail(m)} className="inline-flex items-center gap-1.5 text-blue-500 hover:text-blue-700 text-xs font-medium bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                      <i className="bi bi-envelope" />Email
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
          <p className="text-center py-12 text-gray-400">Loading...</p>
        ) : data?.items?.length === 0 ? (
          <p className="text-center py-12 text-gray-400">No memberships found</p>
        ) : (
          data?.items?.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-800">{m.member_name}</p>
                  <p className="text-xs text-gray-400">{m.plan_name}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(m.status)}`}>{m.status}</span>
              </div>
              <div className="mt-3 text-sm text-gray-600 grid grid-cols-2 gap-1">
                <p>Due: ₱{m.amount_due.toLocaleString()}</p>
                <p className="text-gym-600 font-medium">Paid: ₱{m.amount_paid.toLocaleString()}</p>
                <p className="text-xs text-gray-400 col-span-2">{m.start_date} — {m.end_date}</p>
              </div>
              <button onClick={() => openIndividualEmail(m)} className="mt-3 inline-flex items-center gap-1.5 text-blue-500 hover:text-blue-700 text-xs font-medium bg-blue-50 px-3 py-1.5 rounded-lg">
                <i className="bi bi-envelope" />Send Expiry Email
              </button>
            </div>
          ))
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 mt-4 bg-white rounded-xl shadow-sm">
          <span className="text-sm text-gray-500">Page {data.page} of {data.pages} ({data.total} total)</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Prev</button>
            <button onClick={() => setPage(Math.min(data.pages, page + 1))} disabled={page === data.pages} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Send Expiry Notification</h2>
                <p className="text-xs text-gray-400 mt-0.5">Notify members about their expiring membership</p>
              </div>
              <button onClick={() => setEmailModal(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors">
                <i className="bi bi-x-lg text-sm" />
              </button>
            </div>
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">To</label>
                <input type="email" value={emailForm.to} onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gym-500 focus:border-transparent outline-none" placeholder="member@email.com" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Subject</label>
                <input value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gym-500 focus:border-transparent outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Message</label>
                <textarea value={emailForm.body} onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })} rows={5} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gym-500 focus:border-transparent outline-none resize-none" required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={emailMutation.isPending} className="bg-gym-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gym-700 disabled:opacity-50 transition-colors">
                  {emailMutation.isPending ? 'Sending...' : 'Send Email'}
                </button>
                <button type="button" onClick={() => setEmailModal(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              </div>
              {emailMutation.isSuccess && <p className="text-sm text-green-600">Email sent successfully!</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
