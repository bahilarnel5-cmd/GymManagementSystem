import { useState, useEffect } from 'react'
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
    { id: 'business', label: 'Business Info', icon: 'bi-building' },
    { id: 'notifications', label: 'Notifications', icon: 'bi-bell' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-gym-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className={`bi ${tab.icon}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'members' && <MembersForm orgId={orgId} queryClient={queryClient} />}
      {activeTab === 'coaches' && <CoachesForm orgId={orgId} queryClient={queryClient} />}
      {activeTab === 'plans' && <PlansForm orgId={orgId} queryClient={queryClient} />}
      {activeTab === 'business' && <BusinessInfo orgId={orgId} queryClient={queryClient} />}
      {activeTab === 'notifications' && <NotificationsSettings orgId={orgId} queryClient={queryClient} />}
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
    <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Add New Member</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Member Code</label>
          <input placeholder="e.g. M001" value={form.member_code} onChange={(e) => setForm({ ...form, member_code: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
          <input placeholder="Juan Dela Cruz" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
          <input type="email" placeholder="juan@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Mobile Phone</label>
          <input placeholder="09171234567" value={form.mobile_phone} onChange={(e) => setForm({ ...form, mobile_phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={createMutation.isPending} className="bg-gym-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gym-700 disabled:opacity-50">
            {createMutation.isPending ? 'Saving...' : 'Add Member'}
          </button>
        </div>
        {createMutation.isSuccess && <p className="md:col-span-2 text-sm text-green-600">Member added successfully!</p>}
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
    <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Add New Coach</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
          <input placeholder="Coach Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Specialization</label>
          <input placeholder="e.g. Strength Training, Cardio, Yoga" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Hourly Rate (₱)</label>
          <input type="number" placeholder="500" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Mobile Contact</label>
          <input placeholder="09171234567" value={form.mobile_contact} onChange={(e) => setForm({ ...form, mobile_contact: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-600 mb-1">Shift Schedule</label>
          <input placeholder="e.g. Mon-Fri 6AM-2PM, Sat 8AM-12NN" value={form.shift_schedule} onChange={(e) => setForm({ ...form, shift_schedule: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div className="md:col-span-2">
          <button type="submit" disabled={createMutation.isPending} className="bg-gym-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gym-700 disabled:opacity-50">
            {createMutation.isPending ? 'Saving...' : 'Add Coach'}
          </button>
        </div>
        {createMutation.isSuccess && <p className="md:col-span-2 text-sm text-green-600">Coach added successfully!</p>}
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
    <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Add New Membership Plan</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Plan Name</label>
          <input placeholder="e.g. Starter, Standard, VIP" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Price (₱)</label>
          <input type="number" placeholder="999" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Billing Cycle</label>
          <select value={form.billing_cycle} onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annually">Annually</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-600 mb-1">Benefits / Scope (comma-separated)</label>
          <textarea placeholder="e.g. Cardio Deck, Strength Zone, Free Weights, Locker Rooms" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div className="md:col-span-2">
          <button type="submit" disabled={createMutation.isPending} className="bg-gym-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gym-700 disabled:opacity-50">
            {createMutation.isPending ? 'Saving...' : 'Add Plan'}
          </button>
        </div>
        {createMutation.isSuccess && <p className="md:col-span-2 text-sm text-green-600">Plan added successfully!</p>}
      </form>
    </div>
  )
}

function BusinessInfo({ orgId, queryClient }) {
  const [form, setForm] = useState({ business_name: '', bir_tin_number: '', official_email: '', physical_address: '' })

  const { data: settings } = useQuery({
    queryKey: ['settings', orgId],
    queryFn: () => api.get('/gym_settings/' + orgId).then((r) => r.data),
  })

  useEffect(() => {
    if (settings) {
      setForm({
        business_name: settings.business_name || '',
        bir_tin_number: settings.bir_tin_number || '',
        official_email: settings.official_email || '',
        physical_address: settings.physical_address || '',
      })
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: (data) => api.put('/gym_settings/', { ...data, organization_id: orgId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  const handleSubmit = (e) => { e.preventDefault(); saveMutation.mutate(form) }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Business Information</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Business Name</label>
          <input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">BIR TIN Number</label>
          <input value={form.bir_tin_number} onChange={(e) => setForm({ ...form, bir_tin_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Official Email</label>
          <input value={form.official_email} onChange={(e) => setForm({ ...form, official_email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Physical Address</label>
          <input value={form.physical_address} onChange={(e) => setForm({ ...form, physical_address: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div className="md:col-span-2">
          <button type="submit" disabled={saveMutation.isPending} className="bg-gym-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gym-700 disabled:opacity-50">
            {saveMutation.isPending ? 'Saving...' : 'Save Business Info'}
          </button>
          {saveMutation.isSuccess && <span className="ml-3 text-sm text-green-600">Saved!</span>}
        </div>
      </form>
    </div>
  )
}

function NotificationsSettings({ orgId, queryClient }) {
  const [form, setForm] = useState({ sms_gateway_service: '', auto_sms_reminder_days: 3 })

  const { data: settings } = useQuery({
    queryKey: ['settings', orgId],
    queryFn: () => api.get('/gym_settings/' + orgId).then((r) => r.data),
  })

  useEffect(() => {
    if (settings) {
      setForm({
        sms_gateway_service: settings.sms_gateway_service || '',
        auto_sms_reminder_days: settings.auto_sms_reminder_days || 3,
      })
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: (data) => api.put('/gym_settings/', { ...data, organization_id: orgId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  const handleSubmit = (e) => { e.preventDefault(); saveMutation.mutate(form) }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Notifications</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">SMS Gateway</label>
          <input value={form.sms_gateway_service} onChange={(e) => setForm({ ...form, sms_gateway_service: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. Twilio" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Auto-remind before (days)</label>
          <input type="number" value={form.auto_sms_reminder_days} onChange={(e) => setForm({ ...form, auto_sms_reminder_days: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div className="md:col-span-2">
          <button type="submit" disabled={saveMutation.isPending} className="bg-gym-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gym-700 disabled:opacity-50">
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
          {saveMutation.isSuccess && <span className="ml-3 text-sm text-green-600">Saved!</span>}
        </div>
      </form>
    </div>
  )
}
