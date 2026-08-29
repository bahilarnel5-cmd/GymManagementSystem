import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

function formatPhone(input) {
  let digits = String(input || '').replace(/\D/g, '')
  if (digits.startsWith('63')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = digits.slice(1)
  digits = digits.slice(0, 10)
  let out = '+63'
  if (digits.length > 0) out += ' ' + digits.slice(0, 3)
  if (digits.length > 3) out += ' ' + digits.slice(3, 6)
  if (digits.length > 6) out += ' ' + digits.slice(6, 10)
  return out
}

export default function MemberProfile() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['member-profile'],
    queryFn: () => api.get('/member/profile').then((r) => r.data),
  })

  useEffect(() => {
    if (data && form === null) {
      setForm({ full_name: data.full_name, email: data.email || '', mobile_phone: data.mobile_phone || '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const updateMutation = useMutation({
    mutationFn: (payload) => api.put('/member/profile', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-profile'] })
      queryClient.invalidateQueries({ queryKey: ['member-dashboard'] })
    },
  })

  const getInitials = (name) => (name || 'M').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    )
  }

  const member = data

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate(form)
  }

  const field = 'bg-white rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none w-full'

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Review and update your personal information</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-violet-500 to-indigo-600 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl ring-2 ring-white/30">
              {getInitials(member.full_name)}
            </div>
            <div className="text-white">
              <h2 className="text-xl font-bold">{member.full_name}</h2>
              <p className="text-white/70 text-sm">Member · {member.member_code}</p>
            </div>
            <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${
              member.status === 'active' ? 'bg-emerald-400/20 text-emerald-50' : 'bg-white/20 text-white'
            }`}>
              {member.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 p-6">
          <div className="bg-violet-50 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-violet-400 mb-1">Member Code</p>
            <p className="text-sm font-bold text-gray-800 font-mono">{member.member_code}</p>
          </div>
          <div className="bg-violet-50 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-violet-400 mb-1">Full Name</p>
            <p className="text-sm font-bold text-gray-800">{member.full_name}</p>
          </div>
          <div className="bg-violet-50 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-violet-400 mb-1">Email</p>
            <p className="text-sm font-bold text-gray-800 break-all">{member.email || '—'}</p>
          </div>
          <div className="bg-violet-50 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-violet-400 mb-1">Mobile</p>
            <p className="text-sm font-bold text-gray-800">{member.mobile_phone}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500 to-indigo-600 p-5">
          <h2 className="text-lg font-semibold text-white">Edit Information</h2>
          <p className="text-violet-100 text-xs">Update your contact details</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
              <input className={field} value={form?.full_name || ''} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" className={field} placeholder="you@email.com" value={form?.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mobile Phone</label>
              <input className={field} placeholder="+63 969 022 6049" value={form?.mobile_phone || ''} onChange={(e) => setForm({ ...form, mobile_phone: formatPhone(e.target.value) })} required />
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            {updateMutation.isSuccess && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                <i className="bi bi-check-circle-fill" /> Saved successfully!
              </span>
            )}
            {updateMutation.isError && (
              <span className="text-sm text-red-500">
                {updateMutation.error?.response?.data?.detail || 'Failed to save'}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
