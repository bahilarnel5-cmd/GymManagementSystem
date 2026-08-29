import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'

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

      <div className="max-w-4xl">
        {activeTab === 'members' && <MembersForm orgId={orgId} queryClient={queryClient} />}
        {activeTab === 'coaches' && <CoachesManager orgId={orgId} queryClient={queryClient} />}
        {activeTab === 'plans' && <PlansManager orgId={orgId} queryClient={queryClient} />}
        {activeTab === 'roles' && <RolesManager orgId={orgId} queryClient={queryClient} />}
      </div>
    </div>
  )
}

function MembersForm({ orgId, queryClient }) {
  const [form, setForm] = useState({ member_code: '', full_name: '', email: '', mobile_phone: '', status: 'active' })

  const createMutation = useMutation({
    mutationFn: (newMember) => api.post('/gym_members/', { ...newMember, organization_id: orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setForm({ member_code: '', full_name: '', email: '', mobile_phone: '', status: 'active' })
    },
  })

  const handleSubmit = (e) => { e.preventDefault(); createMutation.mutate(form) }

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
            <input placeholder="e.g. M001" value={form.member_code} onChange={(e) => setForm({ ...form, member_code: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" required />
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
            <input placeholder="09171234567" value={form.mobile_phone} onChange={(e) => setForm({ ...form, mobile_phone: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" required />
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

function CoachesManager({ orgId, queryClient }) {
  const [editing, setEditing] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const { data: coachesData, isLoading } = useQuery({
    queryKey: ['coaches'],
    queryFn: () => api.get('/gym_coaches/?per_page=50').then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/gym_coaches/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coaches'] }),
  })

  const coaches = coachesData?.items || []

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coaches.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm">
                    {c.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{c.full_name}</p>
                    <p className="text-xs text-gray-400">{c.specialization}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <i className="bi bi-cash-stack text-violet-500" /> ₱{c.hourly_rate.toLocaleString()}/hr
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <i className="bi bi-telephone text-violet-500" /> {c.mobile_contact}
                </div>
                {c.shift_schedule && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <i className="bi bi-clock text-violet-500" /> {c.shift_schedule}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditing(c); setShowAdd(false) }}
                  className="flex-1 py-2 rounded-xl text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors flex items-center justify-center gap-1"
                >
                  <i className="bi bi-pencil" /> Edit
                </button>
                <button
                  onClick={() => { if (confirm(`Delete ${c.full_name}?`)) deleteMutation.mutate(c.id) }}
                  className="flex-1 py-2 rounded-xl text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                >
                  <i className="bi bi-trash" /> Delete
                </button>
              </div>
            </div>
          ))}
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

  const { data: plansData, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/gym_membership_plans/?per_page=50').then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/gym_membership_plans/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  })

  const plans = plansData?.items || []

  return (
    <div className="space-y-6">
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

function RolesManager({ orgId, queryClient }) {
  const [expandedRole, setExpandedRole] = useState('admin')
  const { data, isLoading } = useQuery({
    queryKey: ['role-menus'],
    queryFn: () => api.get('/gym_menus/roles').then((r) => r.data),
  })
  const roles = data?.roles || []

  const saveMutation = useMutation({
    mutationFn: (payload) => api.put(`/gym_menus/roles/${payload.role}`, { role: payload.role, items: payload.items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-menus'] })
      queryClient.invalidateQueries({ queryKey: ['my-menus'] })
    },
  })

  const toggleItem = (role, items, menuId) => {
    const next = items.map((it) => it.menu_id === menuId ? { ...it, enabled: !it.enabled } : it)
    saveMutation.mutate({ role, items: next })
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <i className="bi bi-list-check text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Role-Based Sidebar</h2>
            <p className="text-indigo-100 text-xs">Choose which menu items each role can see</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
        ) : (
          <div className="divide-y divide-gray-100">
            {roles.map((role) => (
              <div key={role.role}>
                <button
                  onClick={() => setExpandedRole(expandedRole === role.role ? null : role.role)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-800 capitalize">{role.role}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{role.items.filter(i => i.enabled).length} items</span>
                    <i className={`bi ${expandedRole === role.role ? 'bi-chevron-up' : 'bi-chevron-down'} text-gray-400`} />
                  </span>
                </button>
                {expandedRole === role.role && (
                  <div className="px-5 pb-5 space-y-2">
                    {role.items.map((item) => (
                      <div key={item.menu_id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-50">
                        <div className="flex items-center gap-2.5">
                          <i className={`bi ${item.icon} text-indigo-500 text-sm`} />
                          <span className="text-sm text-gray-700">{item.label}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{item.path}</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={() => toggleItem(role.role, role.items, item.menu_id)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:bg-indigo-600 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <CoachAccountForm orgId={orgId} />
    </div>
  )
}

function CoachAccountForm({ orgId }) {
  const queryClientInternal = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ coach_id: '', email: '', password: '' })

  const { data: coachesData } = useQuery({
    queryKey: ['coaches'],
    queryFn: () => api.get('/gym_coaches/?per_page=100').then((r) => r.data),
  })
  const coaches = coachesData?.items || []

  const createMutation = useMutation({
    mutationFn: (c) => api.post('/gym_menus/coach-accounts', c),
    onSuccess: () => {
      setForm({ coach_id: '', email: '', password: '' })
      setShowForm(false)
      queryClientInternal.invalidateQueries({ queryKey: ['role-menus'] })
    },
  })

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <i className="bi bi-person-plus text-violet-600" />
          <h2 className="font-semibold text-gray-800">Coach Portal Accounts</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <i className={`bi ${showForm ? 'bi-x-lg' : 'bi-plus-lg'} text-xs`} />
          {showForm ? 'Close' : 'Give a Coach a Login'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }}
          className="p-5 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Coach</label>
              <select value={form.coach_id} onChange={(e) => setForm({ ...form, coach_id: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none" required>
                <option value="">Select a coach...</option>
                {coaches.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" placeholder="coach@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
              <input type="text" placeholder="Set a password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none" required />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={createMutation.isPending} className="w-full bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {createMutation.isPending ? 'Creating...' : 'Create Login'}
              </button>
            </div>
          </div>
          {createMutation.isError && <p className="text-sm text-red-500">{createMutation.error?.response?.data?.detail || 'Error'}</p>}
          {createMutation.isSuccess && <p className="text-sm text-violet-600">Coach login created! They can now sign in to the Coach Portal.</p>}
        </form>
      )}
    </div>
  )
}
