import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'

export default function Settings() {
  const queryClient = useQueryClient()
  const orgId = useAuthStore((s) => s.orgId) || '11111111-1111-1111-1111-111111111111'
  const [form, setForm] = useState({
    business_name: '', bir_tin_number: '', official_email: '', physical_address: '',
    checkin_timeout_minutes: 15, alert_desk_on_expired_checkin: true,
    require_signature_first_guest: true, sms_gateway_service: '', auto_sms_reminder_days: 3,
  })

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
        checkin_timeout_minutes: settings.checkin_timeout_minutes || 15,
        alert_desk_on_expired_checkin: settings.alert_desk_on_expired_checkin ?? true,
        require_signature_first_guest: settings.require_signature_first_guest ?? true,
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
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 max-w-2xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Business Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </div>
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Check-in Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Timeout (minutes)</label>
              <input type="number" value={form.checkin_timeout_minutes} onChange={(e) => setForm({ ...form, checkin_timeout_minutes: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div className="flex items-center gap-6 pt-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.alert_desk_on_expired_checkin} onChange={(e) => setForm({ ...form, alert_desk_on_expired_checkin: e.target.checked })} className="rounded" />
                Alert on expired check-in
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.require_signature_first_guest} onChange={(e) => setForm({ ...form, require_signature_first_guest: e.target.checked })} className="rounded" />
                Require guest signature
              </label>
            </div>
          </div>
        </div>
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Notifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">SMS Gateway</label>
              <input value={form.sms_gateway_service} onChange={(e) => setForm({ ...form, sms_gateway_service: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. Twilio" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Auto-remind before (days)</label>
              <input type="number" value={form.auto_sms_reminder_days} onChange={(e) => setForm({ ...form, auto_sms_reminder_days: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
        </div>
        <div className="pt-4">
          <button type="submit" disabled={saveMutation.isPending} className="bg-gym-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gym-700 disabled:opacity-50">
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
          {saveMutation.isSuccess && <span className="ml-3 text-sm text-green-600">Saved!</span>}
        </div>
      </form>
    </div>
  )
}
