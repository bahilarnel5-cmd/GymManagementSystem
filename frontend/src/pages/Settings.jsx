import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'

export default function Settings() {
  const queryClient = useQueryClient()
  const orgId = useAuthStore((s) => s.orgId) || '11111111-1111-1111-1111-111111111111'
  const [activeTab, setActiveTab] = useState('members')

  const tabs = [
    { id: 'members', label: 'Members', icon: 'bi-people', color: 'from-emerald-400 to-emerald-600' },
    { id: 'coaches', label: 'Coaches', icon: 'bi-person-badge', color: 'from-violet-400 to-violet-600' },
    { id: 'plans', label: 'Membership Plans', icon: 'bi-card-list', color: 'from-amber-400 to-amber-600' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage members, coaches, and membership plans</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 ${
              activeTab === tab.id
                ? 'border-gym-500 bg-gym-50 shadow-md shadow-gym-100'
                : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tab.color} flex items-center justify-center shadow-md`}>
              <i className={`bi ${tab.icon} text-white text-sm`} />
            </div>
            <div className="text-left">
              <p className={`text-sm font-semibold ${activeTab === tab.id ? 'text-gym-700' : 'text-gray-700'}`}>{tab.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {tab.id === 'members' ? 'Add new members' : tab.id === 'coaches' ? 'Add coaching staff' : 'Create plan tiers'}
              </p>
            </div>
            {activeTab === tab.id && (
              <div className="absolute top-3 right-3">
                <div className="w-2 h-2 rounded-full bg-gym-500" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Form content */}
      <div className="max-w-2xl">
        {activeTab === 'members' && <MembersForm orgId={orgId} queryClient={queryClient} />}
        {activeTab === 'coaches' && <CoachesForm orgId={orgId} queryClient={queryClient} />}
        {activeTab === 'plans' && <PlansForm orgId={orgId} queryClient={queryClient} />}
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

function CoachesForm({ orgId, queryClient }) {
  const [form, setForm] = useState({ full_name: '', specialization: '', hourly_rate: '', mobile_contact: '', shift_schedule: '' })

  const createMutation = useMutation({
    mutationFn: (c) => api.post('/gym_coaches/', { ...c, organization_id: orgId, hourly_rate: parseFloat(c.hourly_rate) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaches'] })
      setForm({ full_name: '', specialization: '', hourly_rate: '', mobile_contact: '', shift_schedule: '' })
    },
  })

  const handleSubmit = (e) => { e.preventDefault(); createMutation.mutate(form) }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-violet-500 to-violet-600 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <i className="bi bi-person-badge text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Add New Coach</h2>
            <p className="text-violet-100 text-xs">Register a coaching staff member</p>
          </div>
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
        <div className="pt-2">
          <button type="submit" disabled={createMutation.isPending} className="bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {createMutation.isPending ? 'Saving...' : 'Add Coach'}
          </button>
        </div>
        {createMutation.isSuccess && (
          <div className="flex items-center gap-2 text-sm text-violet-600 bg-violet-50 px-4 py-2 rounded-xl">
            <i className="bi bi-check-circle-fill" /> Coach added successfully!
          </div>
        )}
      </form>
    </div>
  )
}

function PlansForm({ orgId, queryClient }) {
  const [form, setForm] = useState({ name: '', price: '', billing_cycle: 'monthly', features: '' })

  const createMutation = useMutation({
    mutationFn: (p) => api.post('/gym_membership_plans/', { ...p, organization_id: orgId, price: parseFloat(p.price) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setForm({ name: '', price: '', billing_cycle: 'monthly', features: '' })
    },
  })

  const handleSubmit = (e) => { e.preventDefault(); createMutation.mutate(form) }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <i className="bi bi-plus-circle text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Add New Plan</h2>
            <p className="text-amber-100 text-xs">Create a membership plan tier</p>
          </div>
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
        <div className="pt-2">
          <button type="submit" disabled={createMutation.isPending} className="bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors">
            {createMutation.isPending ? 'Saving...' : 'Add Plan'}
          </button>
        </div>
        {createMutation.isSuccess && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-xl">
            <i className="bi bi-check-circle-fill" /> Plan added successfully!
          </div>
        )}
      </form>
    </div>
  )
}
