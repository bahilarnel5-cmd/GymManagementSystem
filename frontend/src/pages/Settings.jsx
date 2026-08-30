import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'

const coachColors = [
  { bg: 'bg-violet-500', ring: 'ring-violet-200' },
  { bg: 'bg-blue-500', ring: 'ring-blue-200' },
  { bg: 'bg-emerald-500', ring: 'ring-emerald-200' },
  { bg: 'bg-amber-500', ring: 'ring-amber-200' },
  { bg: 'bg-rose-500', ring: 'ring-rose-200' },
]

export default function Settings() {
  const queryClient = useQueryClient()
  const orgId = useAuthStore((s) => s.orgId) || '11111111-1111-1111-1111-111111111111'
  const [activeTab, setActiveTab] = useState('members')

  const tabs = [
    { id: 'members', label: 'Members', icon: 'bi-people' },
    { id: 'coaches', label: 'Coaches', icon: 'bi-person-badge' },
    { id: 'plans', label: 'Membership Plans', icon: 'bi-card-list' },
    { id: 'roles', label: 'Sidebar & Roles', icon: 'bi-list-check' },
  ]

  return (
    <div>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage members, coaches, plans, and role-based sidebar</p>
        </div>

        {/* Simple navbar-style tabs matching the settings UI */}
        <div className="mb-6 inline-flex flex-wrap items-center gap-1 p-1 bg-gray-100 rounded-xl border border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-gym-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className={`bi ${tab.icon} text-xs`} />
              {tab.label}
            </button>
          ))}
        </div>

        <div>
          {activeTab === 'members' && <MembersForm orgId={orgId} queryClient={queryClient} />}
          {activeTab === 'coaches' && <CoachesManager orgId={orgId} queryClient={queryClient} />}
          {activeTab === 'plans' && <PlansManager orgId={orgId} queryClient={queryClient} />}
          {activeTab === 'roles' && <SidebarRoles queryClient={queryClient} />}
        </div>
      </div>
    </div>
  )
}

function MembersForm({ orgId, queryClient }) {
  const [form, setForm] = useState({ member_code: '', full_name: '', email: '', mobile_phone: '', status: 'active' })

  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: () => api.get('/gym_members/?per_page=200').then((r) => r.data),
  })
  const members = membersData?.items || []

  const nextCode = useMemo(() => {
    const used = new Set(members.map((m) => m.member_code))
    let maxNum = -1
    let format = 'AG-10001'
    for (const code of members) {
      const match = String(code || '').match(/^(\D*)(\d+)$/)
      if (match) {
        const num = parseInt(match[2], 10)
        if (num > maxNum) {
          maxNum = num
          format = match[1] + String(match[2])
        }
      }
    }
    if (maxNum < 0) return ''
    const prefix = format.replace(/\d+$/, '')
    const numStr = String(format.match(/\d+$/)[0])
    let next = (maxNum + 1).toString()
    while (next.length < numStr.length) next = '0' + next
    const candidate = prefix + next
    return used.has(candidate) ? '' : candidate
  }, [members])

  const createMutation = useMutation({
    mutationFn: (newMember) => api.post('/gym_members/', { ...newMember, organization_id: orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setForm({ member_code: '', full_name: '', email: '', mobile_phone: '', status: 'active' })
    },
  })

  const handleSubmit = (e) => { e.preventDefault(); createMutation.mutate(form) }

  const handleCodeChange = (value) => setForm({ ...form, member_code: value.toUpperCase() })
  const handlePhoneChange = (value) => setForm({ ...form, mobile_phone: formatMobilePhone(value) })

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <i className="bi bi-person-plus text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Add New Member</h2>
            <p className="text-emerald-100 text-xs">Register a new gym member</p>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Member Code</label>
            <input
              placeholder="e.g. AG-10006"
              value={form.member_code}
              onChange={(e) => handleCodeChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              required
            />
            {nextCode && (
              <button
                type="button"
                onClick={() => setForm({ ...form, member_code: nextCode })}
                className="mt-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                <i className="bi bi-magic mr-1" />Next in sequence: {nextCode}
              </button>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
            <input placeholder="Juan Dela Cruz" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
            <input type="email" placeholder="juan@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mobile Phone</label>
            <input
              placeholder="+63 969 022 6049"
              value={form.mobile_phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="pt-2">
          <button type="submit" disabled={createMutation.isPending} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {createMutation.isPending ? 'Saving...' : 'Add Member'}
          </button>
        </div>
        {createMutation.isSuccess && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl">
            <i className="bi bi-check-circle-fill" /> Member added successfully!
          </div>
        )}
      </form>
    </div>
  )
}

function formatMobilePhone(input) {
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

function CoachesManager({ orgId, queryClient }) {
  const [editing, setEditing] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  const { data: coachesData, isLoading } = useQuery({
    queryKey: ['coaches'],
    queryFn: () => api.get('/gym_coaches/?per_page=50').then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/gym_coaches/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coaches'] }),
  })

  const coaches = coachesData?.items || []
  const getInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Coaches ({coaches.length})</h2>
        <button
          onClick={() => { setEditing(null); setShowAdd(!showAdd) }}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <i className={`bi ${showAdd ? 'bi-x-lg' : 'bi-plus-lg'} text-xs`} />
          {showAdd ? 'Close' : 'Add Coach'}
        </button>
      </div>

      {showAdd && <CoachForm orgId={orgId} queryClient={queryClient} onDone={() => setShowAdd(false)} />}

      {editing && (
        <CoachForm
          orgId={orgId}
          queryClient={queryClient}
          editData={editing}
          onDone={() => setEditing(null)}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" /></div>
      ) : coaches.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <i className="bi bi-person-badge text-4xl text-gray-300 mb-3 block" />
          <p className="text-gray-400">No coaches yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {coaches.map((c, idx) => {
            const color = coachColors[idx % coachColors.length]
            const expanded = expandedId === c.id
            return (
              <div key={c.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group h-fit">
                <button
                  onClick={() => setExpandedId(expanded ? null : c.id)}
                  className="w-full text-left cursor-pointer"
                  aria-expanded={expanded}
                >
                  <div className={`${color.bg} p-5 pb-8 relative transition-colors ${expanded ? '' : 'group-hover:brightness-95'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg ring-2 ${color.ring}`}>
                        {getInitials(c.full_name)}
                      </div>
                      <div className="text-white flex-1 min-w-0">
                        <h3 className="font-bold text-sm">{c.full_name}</h3>
                        <p className="text-white/70 text-xs">{c.specialization}</p>
                      </div>
                      <i className={`bi bi-chevron-down text-white/80 text-lg transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  <div className="relative px-5 pb-5 -mt-3">
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                            <i className="bi bi-cash-stack text-violet-600 text-xs" />
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Rate</p>
                            <p className="text-sm font-bold text-gray-800">₱{c.hourly_rate.toLocaleString()}/hr</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <i className={`bi bi-chevron-down text-[10px] transition-transform duration-200 inline-block ${expanded ? 'rotate-180' : ''}`} />
                          {expanded ? 'Hide details' : 'View details'}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="px-5 pb-5 -mt-1">
                    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                            <i className="bi bi-telephone text-blue-600 text-xs" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Phone</p>
                            <p className="text-sm font-medium text-gray-700 break-words">{c.mobile_contact}</p>
                          </div>
                        </div>
                        {c.shift_schedule && (
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                              <i className="bi bi-clock text-amber-600 text-xs" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Shift Schedule</p>
                              <p className="text-sm font-medium text-gray-700 break-words">{c.shift_schedule}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-gray-100 pt-4">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => { setEditing(c); setShowAdd(false) }}
                            className="flex-1 py-2.5 rounded-xl text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors flex items-center justify-center gap-1"
                          >
                            <i className="bi bi-pencil" /> Edit
                          </button>
                          <button
                            onClick={() => { if (confirm(`Delete ${c.full_name}?`)) deleteMutation.mutate(c.id) }}
                            className="flex-1 py-2.5 rounded-xl text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                          >
                            <i className="bi bi-trash" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CoachForm({ orgId, queryClient, editData, onDone }) {
  const isEdit = !!editData
  const [form, setForm] = useState({
    full_name: editData?.full_name || '',
    specialization: editData?.specialization || '',
    hourly_rate: editData?.hourly_rate || '',
    mobile_contact: editData?.mobile_contact || '',
    shift_schedule: editData?.shift_schedule || '',
  })

  const createMutation = useMutation({
    mutationFn: (c) => api.post('/gym_coaches/', { ...c, organization_id: orgId, hourly_rate: parseFloat(c.hourly_rate) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaches'] })
      onDone()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (c) => api.put(`/gym_coaches/${editData.id}`, { ...c, hourly_rate: parseFloat(c.hourly_rate) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaches'] })
      onDone()
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isEdit) updateMutation.mutate(form)
    else createMutation.mutate(form)
  }

  const mutation = isEdit ? updateMutation : createMutation

  return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-violet-200 overflow-hidden">
      <div className="bg-gradient-to-r from-violet-500 to-violet-600 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <i className={`bi ${isEdit ? 'bi-pencil-square' : 'bi-person-plus'} text-white`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{isEdit ? 'Edit Coach' : 'Add New Coach'}</h2>
              <p className="text-violet-100 text-xs">{isEdit ? 'Update coach details' : 'Register a coaching staff member'}</p>
            </div>
          </div>
          <button onClick={onDone} className="text-white/70 hover:text-white"><i className="bi bi-x-lg" /></button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
            <input placeholder="Coach Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Specialization</label>
            <input placeholder="e.g. Strength Training, Yoga, HIIT" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Hourly Rate (₱)</label>
            <input type="number" placeholder="500" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mobile Contact</label>
            <input placeholder="09171234567" value={form.mobile_contact} onChange={(e) => setForm({ ...form, mobile_contact: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none" required />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Shift Schedule</label>
            <input placeholder="e.g. Mon-Fri 6AM-2PM, Sat 8AM-12NN" value={form.shift_schedule} onChange={(e) => setForm({ ...form, shift_schedule: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={mutation.isPending} className="bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Coach' : 'Add Coach'}
          </button>
          <button type="button" onClick={onDone} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
        </div>
        {mutation.isError && <p className="text-sm text-red-500">{mutation.error?.response?.data?.detail || 'Error'}</p>}
        {mutation.isSuccess && (
          <div className="flex items-center gap-2 text-sm text-violet-600 bg-violet-50 px-4 py-2 rounded-xl">
            <i className="bi bi-check-circle-fill" /> {isEdit ? 'Coach updated!' : 'Coach added successfully!'}
          </div>
        )}
      </form>
    </div>
  )
}

function PlansManager({ orgId, queryClient }) {
  const [editing, setEditing] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [discountInput, setDiscountInput] = useState(null)

  const { data: plansData, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/gym_membership_plans/?per_page=50').then((r) => r.data),
  })

  const { data: settings } = useQuery({
    queryKey: ['settings-discount'],
    queryFn: () => api.get('/gym_settings/annual-discount').then((r) => r.data),
  })

  useEffect(() => {
    if (settings != null && discountInput == null) {
      setDiscountInput(String(settings.annual_discount_percentage))
    }
  }, [settings, discountInput])

  const discountMutation = useMutation({
    mutationFn: (value) =>
      api.patch('/gym_settings/annual-discount', { annual_discount_percentage: value }).then((r) => r.data),
    onSuccess: (data) => {
      setDiscountInput(String(data.annual_discount_percentage))
      queryClient.setQueryData(['settings-discount'], data)
      queryClient.invalidateQueries({ queryKey: ['member-plans'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/gym_membership_plans/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  })

  const plans = plansData?.items || []

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Annual Billing Discount</h3>
            <p className="text-xs text-gray-400 mt-1">
              Applied to 12 months of a membership plan, e.g. monthly price × 12 minus this percent.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3">
              <input
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={discountInput ?? ''}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="w-16 py-2 bg-transparent text-sm font-semibold text-gray-800 outline-none"
              />
              <span className="text-sm text-gray-400">%</span>
            </div>
            <button
              onClick={() => discountMutation.mutate(parseFloat(discountInput))}
              disabled={discountMutation.isPending || discountInput == null || discountInput === ''}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {discountMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        {discountMutation.isError && (
          <p className="text-sm text-red-500 mt-2">{discountMutation.error?.response?.data?.detail || 'Failed to update'}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Membership Plans ({plans.length})</h2>
        <button
          onClick={() => { setEditing(null); setShowAdd(!showAdd) }}
          className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors"
        >
          <i className={`bi ${showAdd ? 'bi-x-lg' : 'bi-plus-lg'} text-xs`} />
          {showAdd ? 'Close' : 'Add Plan'}
        </button>
      </div>

      {showAdd && <PlanForm orgId={orgId} queryClient={queryClient} onDone={() => setShowAdd(false)} />}

      {editing && (
        <PlanForm
          orgId={orgId}
          queryClient={queryClient}
          editData={editing}
          onDone={() => setEditing(null)}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" /></div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <i className="bi bi-card-list text-4xl text-gray-300 mb-3 block" />
          <p className="text-gray-400">No plans yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
              <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white">{p.name}</h3>
                    <p className="text-xs text-white/70 capitalize">{p.billing_cycle}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.is_active ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="px-4 py-4">
                <p className="text-2xl font-extrabold text-gray-800">₱{p.price.toLocaleString()}<span className="text-xs font-normal text-gray-400">/{p.billing_cycle}</span></p>
                {p.features && (
                  <div className="mt-3 space-y-1">
                    {p.features.split(',').slice(0, 3).map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <i className="bi bi-check-lg text-amber-500 text-[10px]" /> {f.trim()}
                      </div>
                    ))}
                    {p.features.split(',').length > 3 && (
                      <p className="text-[10px] text-gray-400">+{p.features.split(',').length - 3} more</p>
                    )}
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => { setEditing(p); setShowAdd(false) }}
                    className="flex-1 py-2 rounded-xl text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <i className="bi bi-pencil" /> Edit
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete ${p.name} plan?`)) deleteMutation.mutate(p.id) }}
                    className="flex-1 py-2 rounded-xl text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <i className="bi bi-trash" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PlanForm({ orgId, queryClient, editData, onDone }) {
  const isEdit = !!editData
  const [form, setForm] = useState({
    name: editData?.name || '',
    price: editData?.price || '',
    billing_cycle: editData?.billing_cycle || 'monthly',
    features: editData?.features || '',
  })

  const createMutation = useMutation({
    mutationFn: (p) => api.post('/gym_membership_plans/', { ...p, organization_id: orgId, price: parseFloat(p.price) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      onDone()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (p) => api.put(`/gym_membership_plans/${editData.id}`, { ...p, price: parseFloat(p.price) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      onDone()
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isEdit) updateMutation.mutate(form)
    else createMutation.mutate(form)
  }

  const mutation = isEdit ? updateMutation : createMutation

  return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-amber-200 overflow-hidden">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <i className={`bi ${isEdit ? 'bi-pencil-square' : 'bi-plus-circle'} text-white`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{isEdit ? 'Edit Plan' : 'Add New Plan'}</h2>
              <p className="text-amber-100 text-xs">{isEdit ? 'Update plan details' : 'Create a membership plan tier'}</p>
            </div>
          </div>
          <button onClick={onDone} className="text-white/70 hover:text-white"><i className="bi bi-x-lg" /></button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Plan Name</label>
            <input placeholder="e.g. Starter, Standard, VIP" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Price (₱)</label>
            <input type="number" placeholder="999" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Billing Cycle</label>
            <select value={form.billing_cycle} onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Benefits / Scope (comma-separated)</label>
            <textarea placeholder="e.g. Cardio Deck, Strength Zone, Free Weights, Locker Rooms" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} rows={3} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={mutation.isPending} className="bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors">
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Plan' : 'Add Plan'}
          </button>
          <button type="button" onClick={onDone} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
        </div>
        {mutation.isError && <p className="text-sm text-red-500">{mutation.error?.response?.data?.detail || 'Error'}</p>}
        {mutation.isSuccess && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-xl">
            <i className="bi bi-check-circle-fill" /> {isEdit ? 'Plan updated!' : 'Plan added successfully!'}
          </div>
        )}
      </form>
    </div>
  )
}

function SidebarRoles({ queryClient }) {
  const [label, setLabel] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selected, setSelected] = useState(() => new Set())

  const { data: sectionsData, isLoading } = useQuery({
    queryKey: ['role-sections'],
    queryFn: () => api.get('/gym_menus/sections').then((r) => r.data),
  })
  const sections = sectionsData?.items || []

  const { data: usersData } = useQuery({
    queryKey: ['staff-accounts'],
    queryFn: () => api.get('/auth/users').then((r) => r.data),
  })
  const accounts = (usersData || []).filter((u) => u.role !== 'member')

  const createMutation = useMutation({
    mutationFn: (c) => api.post('/gym_menus/accounts', c),
    onSuccess: () => {
      setLabel(''); setEmail(''); setPassword(''); setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ['staff-accounts'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/gym_menus/accounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-accounts'] }),
  })

  const toggleSection = (menuId) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(menuId)) next.delete(menuId)
      else next.add(menuId)
      return next
    })
  }

  const handleCreate = (e) => {
    e.preventDefault()
    createMutation.mutate({
      role: label,
      email,
      password,
      items: sections.map((s) => ({ menu_id: s.menu_id, enabled: selected.has(s.menu_id) })),
    })
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
            <i className="bi bi-list-check text-gray-600 text-sm" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Sidebar &amp; Roles</h2>
            <p className="text-xs text-gray-400">Pick the sidebar sections, then create the account — one flow</p>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sidebar sections</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setSelected(new Set(sections.map((s) => s.menu_id)))} className="text-xs font-medium text-gray-500 hover:text-gray-800">Select all</button>
              <span className="text-gray-300">·</span>
              <button type="button" onClick={() => setSelected(new Set())} className="text-xs font-medium text-gray-500 hover:text-gray-800">Clear</button>
            </div>
          </div>

          <form onSubmit={handleCreate}>
            {isLoading ? (
              <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-gray-500" /></div>
            ) : (
              <div className="flex flex-wrap justify-center gap-2.5">
                {sections.map((s) => {
                  const on = selected.has(s.menu_id)
                  return (
                    <button
                      key={s.menu_id}
                      type="button"
                      onClick={() => toggleSection(s.menu_id)}
                      aria-pressed={on}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                        on ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <i className={`bi ${s.icon} ${on ? 'text-white' : 'text-gray-400'} text-sm`} />
                      <span className="text-xs font-medium">{s.label}</span>
                      {on && <i className="bi bi-check2 text-[10px]" />}
                    </button>
                  )
                })}
              </div>
            )}

            <p className="text-xs text-gray-400 text-center mt-4">
              {selected.size} of {sections.length} sections selected{selected.size > 0 ? ' — this account will only see these' : ''}
            </p>

            <div className="border-t border-gray-100 mt-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Account label</label>
                  <input placeholder="e.g. Cashier, Front Desk" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none" required />
                  {label.trim() && (
                    <p className="mt-1 text-[10px] text-gray-400">“{label.trim()}” · {selected.size} sections</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                  <input type="email" placeholder="staff@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
                  <input type="password" placeholder="Set a password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none" required />
                </div>
              </div>

              {selected.size === 0 && (
                <p className="mt-3 text-xs text-amber-600 flex items-center gap-1">
                  <i className="bi bi-exclamation-triangle" /> No sections selected — this account will sign in to an empty portal.
                </p>
              )}

              <div className="flex items-center gap-3 pt-4">
                <button type="submit" disabled={createMutation.isPending} className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {createMutation.isPending ? 'Creating...' : <><i className="bi bi-person-plus mr-1.5" /> Create Account</>}
                </button>
                {createMutation.isError && <p className="text-sm text-red-500">{createMutation.error?.response?.data?.detail || 'Error'}</p>}
              </div>
              {createMutation.isSuccess && (
                <p className="mt-3 text-sm text-gray-700 flex items-center gap-1.5">
                  <i className="bi bi-check-circle-fill text-emerald-600" /> Account created — it signs in with only the selected sections.
                </p>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Existing staff accounts</h3>
          <p className="text-xs text-gray-400">Accounts with custom permission sets (member accounts are excluded)</p>
        </div>
        {accounts.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400">No staff accounts yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {accounts.map((u) => (
              <li key={u.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                    <i className="bi bi-person text-sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.email}</p>
                    <p className="text-[10px] text-gray-400">
                      Role: <span className="capitalize">{u.role.replace(/_/g, ' ')}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { if (confirm(`Remove ${u.email} (${u.role.replace(/_/g, ' ')})?`)) deleteMutation.mutate(u.id) }}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <i className="bi bi-trash" /> Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}