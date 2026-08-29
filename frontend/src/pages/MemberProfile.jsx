import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

const FIELD_OPTIONS = [
  { value: 'full_name', label: 'Full Name' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'email', label: 'Email' },
  { value: 'address', label: 'Address' },
  { value: 'emergency_contact', label: 'Emergency Contact' },
  { value: 'profile_photo', label: 'Profile Photo' },
]

const REASON_OPTIONS = [
  { value: 'civil_status_change', label: 'Civil status change' },
  { value: 'lost_stolen_number', label: 'Lost / stolen phone number' },
  { value: 'email_change', label: 'Email change' },
  { value: 'address_change', label: 'Address change' },
  { value: 'legal_name_correction', label: 'Legal name correction' },
  { value: 'emergency_contact_update', label: 'Emergency contact update' },
  { value: 'profile_photo_update', label: 'Profile photo update' },
  { value: 'other', label: 'Other' },
]

const PROOF_REQUIRED_REASONS = ['civil_status_change', 'legal_name_correction']

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

const emptyForm = () => ({
  field_name: 'full_name',
  requested_value: '',
  reason: 'other',
  explanation: '',
  file: null,
})

export default function MemberProfile() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())

  const { data: member, isLoading } = useQuery({
    queryKey: ['member-profile'],
    queryFn: () => api.get('/member/profile').then((r) => r.data),
  })

  const { data: myRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['my-change-requests'],
    queryFn: () => api.get('/gym_members/change-requests/mine').then((r) => r.data),
    enabled: !!member,
  })

  const submitMutation = useMutation({
    mutationFn: (formData) => api.post('/gym_members/change-requests', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-change-requests'] })
      setShowForm(false)
      setForm(emptyForm())
      document.getElementById('change-proof-file').value = ''
    },
  })

  const proofRequired = PROOF_REQUIRED_REASONS.includes(form.reason) || form.field_name === 'profile_photo'

  const handleSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('field_name', form.field_name)
    fd.append('requested_value', form.requested_value)
    fd.append('reason', form.reason)
    fd.append('explanation', form.explanation)
    if (form.file) fd.append('file', form.file)
    submitMutation.mutate(fd)
  }

  if (isLoading || !member) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    )
  }

  const getInitials = (name) => (name || 'M').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  const info = [
    { label: 'Full Name', value: member.full_name },
    { label: 'Member Code', value: member.member_code },
    { label: 'Email', value: member.email || '—' },
    { label: 'Mobile', value: member.mobile_phone },
    { label: 'Address', value: member.address || '—' },
    { label: 'Emergency Contact', value: member.emergency_contact || '—' },
  ]
  const field = 'bg-white rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none w-full'

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Your information is admin-managed. Request a change and an admin will review it.</p>
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
            <button
              onClick={() => setShowForm(!showForm)}
              className="ml-auto px-4 py-2 rounded-xl bg-white text-violet-700 text-sm font-medium hover:bg-violet-50 transition-colors flex items-center gap-2"
            >
              <i className={`bi ${showForm ? 'bi-x-lg' : 'bi-pencil-square'} text-xs`} />
              {showForm ? 'Close' : 'Request a Change'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
          {info.map((row) => (
            <div key={row.label} className="bg-violet-50 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-violet-400 mb-1">{row.label}</p>
              <p className="text-sm font-bold text-gray-800 break-all">{row.value}</p>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-violet-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-violet-500 to-indigo-600 p-5">
            <h2 className="text-lg font-semibold text-white">Request Information Change</h2>
            <p className="text-violet-100 text-xs">An admin will review and approve your request before it's applied</p>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Field to Change</label>
                <select value={form.field_name} onChange={(e) => setForm({ ...form, field_name: e.target.value })} className={field}>
                  {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Reason</label>
                <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={field}>
                  {REASON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Current Value
              </label>
              <input value={member[form.field_name === 'phone' ? 'mobile_phone' : form.field_name] || '—'} disabled className={`${field} bg-gray-50 text-gray-500`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">New Value</label>
              <input
                value={form.requested_value}
                onChange={(e) => setForm({ ...form, requested_value: form.field_name === 'phone' ? formatPhone(e.target.value) : e.target.value })}
                placeholder={form.field_name === 'profile_photo' ? 'Uploaded once you attach an image below' : 'Enter the new value'}
                className={field}
                required={form.field_name !== 'profile_photo'}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Explanation <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.explanation}
                onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                placeholder="Explain why you're requesting this change"
                rows={3}
                className={field}
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Proof Photo
                </label>
                {proofRequired && (
                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Proof required for this reason</span>
                )}
              </div>
              <input
                id="change-proof-file"
                type="file" accept="image/*"
                onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
                className="w-full text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-violet-50 file:text-violet-700 file:text-sm file:font-medium hover:file:bg-violet-100"
              />
              {!proofRequired && <p className="text-[11px] text-gray-400 mt-1">Optional for this reason — your explanation is sufficient.</p>}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
              {submitMutation.isSuccess && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                  <i className="bi bi-check-circle-fill" /> Request submitted, pending admin review
                </span>
              )}
              {submitMutation.isError && (
                <span className="text-sm text-red-500">{submitMutation.error?.response?.data?.detail || 'Failed to submit request'}</span>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500 to-indigo-600 p-5">
          <h2 className="text-lg font-semibold text-white">My Change Requests</h2>
        </div>
        {requestsLoading ? (
          <p className="p-6 text-sm text-gray-400 text-center">Loading...</p>
        ) : !myRequests?.length ? (
          <p className="p-6 text-sm text-gray-400 text-center">No change requests yet</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {myRequests.map((r) => (
              <div key={r.id} className="p-4 flex items-start gap-3">
                <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  r.status === 'approved' ? 'bg-green-100 text-green-600'
                  : r.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  <i className={`bi ${r.status === 'approved' ? 'bi-check-lg' : r.status === 'rejected' ? 'bi-x-lg' : 'bi-clock'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800 capitalize">{r.field_name.replace(/_/g, ' ')}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      r.status === 'approved' ? 'bg-green-100 text-green-700'
                      : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>{r.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Current: <span className="text-gray-400">{r.current_value || '—'}</span> → Requested: <span className="text-gray-700">{r.requested_value || '—'}</span></p>
                  <p className="text-xs text-gray-500">{r.reason.replace(/_/g, ' ')} · {new Date(r.submitted_at).toLocaleDateString()}</p>
                  {r.admin_notes && <p className="text-xs text-gray-500 mt-0.5">Admin note: <span className="text-gray-600">{r.admin_notes}</span></p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
