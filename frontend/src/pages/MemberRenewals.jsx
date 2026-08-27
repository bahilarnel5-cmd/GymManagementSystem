import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

const planStyles = {
  starter: { gradient: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50', icon: 'bi-lightning-charge' },
  standard: { gradient: 'from-blue-400 to-indigo-500', bg: 'bg-blue-50', icon: 'bi-rocket-takeoff' },
  vip: { gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', icon: 'bi-crown' },
}

function getPlanStyle(name) {
  const lower = (name || '').toLowerCase()
  if (lower.includes('vip') || lower.includes('premium')) return planStyles.vip
  if (lower.includes('standard')) return planStyles.standard
  return planStyles.starter
}

export default function MemberRenewals() {
  const queryClient = useQueryClient()
  const [selectedPlan, setSelectedPlan] = useState(null)

  const { data: plans, isLoading } = useQuery({
    queryKey: ['member-plans'],
    queryFn: () => api.get('/member/plans').then((r) => r.data),
  })

  const { data: renewals } = useQuery({
    queryKey: ['member-renewals'],
    queryFn: () => api.get('/member/renewals').then((r) => r.data),
  })

  const { data: dashboard } = useQuery({
    queryKey: ['member-dashboard'],
    queryFn: () => api.get('/member/dashboard').then((r) => r.data),
  })

  const renewMutation = useMutation({
    mutationFn: (planId) => api.post(`/member/renew?plan_id=${planId}&payment_type=full`),
    onSuccess: () => {
      setSelectedPlan(null)
      queryClient.invalidateQueries({ queryKey: ['member-renewals'] })
    },
  })

  const membership = dashboard?.membership

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Renewals</h1>
        <p className="text-sm text-gray-500 mt-1">Browse plans and manage your membership renewal</p>
      </div>

      {membership && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">Current Plan</p>
            <p className="text-lg font-bold text-gray-800">{membership.plan_name}</p>
            <p className="text-xs text-gray-400">Expires: {membership.end_date} ({membership.days_left} days left)</p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
            membership.status_label === 'expired' ? 'bg-red-100 text-red-700' :
            membership.status_label === 'critical' ? 'bg-red-100 text-red-700' :
            membership.status_label === 'warning' ? 'bg-amber-100 text-amber-700' :
            'bg-emerald-100 text-emerald-700'
          }`}>
            {membership.status_label === 'expired' ? 'Expired' :
             membership.status_label === 'critical' ? 'Expiring Soon' :
             membership.status_label === 'warning' ? 'Expiring in 7 days' :
             'Active'}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-800 mb-4">Available Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {isLoading ? (
          <div className="col-span-3 flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        ) : (
          plans?.map((p) => {
            const style = getPlanStyle(p.name)
            return (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden">
                <div className={`bg-gradient-to-r ${style.gradient} p-5`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <i className={`bi ${style.icon} text-white text-lg`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{p.name}</h3>
                      <p className="text-xs text-white/70 capitalize">{p.billing_cycle}</p>
                    </div>
                  </div>
                </div>
                <div className={`${style.bg} px-5 py-4 text-center -mt-3 rounded-t-2xl`}>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-sm font-medium text-gray-500">₱</span>
                    <span className="text-3xl font-extrabold text-gray-800">{p.price.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">per {p.billing_cycle}</p>
                </div>
                <div className="px-5 py-4">
                  {p.features ? (
                    <ul className="space-y-2">
                      {p.features.split(',').map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <i className="bi bi-check-lg text-emerald-500 text-sm mt-0.5 shrink-0" />
                          <span className="text-sm text-gray-600">{f.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-3">No features listed</p>
                  )}
                </div>
                <div className="px-5 pb-4">
                  <button
                    onClick={() => setSelectedPlan(p)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                  >
                    Renew with this plan
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {renewals && renewals.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Renewal Requests</h2>
          <div className="space-y-3">
            {renewals.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">Renewal Request</p>
                  <p className="text-xs text-gray-400">{new Date(r.requested_date).toLocaleDateString()} · ₱{r.amount.toLocaleString()}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  r.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Confirm Renewal</h2>
                <p className="text-xs text-gray-400 mt-0.5">Submit a renewal request for this plan</p>
              </div>
              <button onClick={() => setSelectedPlan(null)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600">
                <i className="bi bi-x-lg text-sm" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <p className="text-sm text-gray-600">Plan</p>
              <p className="font-bold text-gray-800">{selectedPlan.name}</p>
              <p className="text-lg font-bold text-violet-600 mt-1">₱{selectedPlan.price.toLocaleString()} / {selectedPlan.billing_cycle}</p>
            </div>

            <p className="text-xs text-gray-500 mb-4">A pending renewal request will be sent to the admin for approval.</p>

            <div className="flex gap-3">
              <button
                onClick={() => renewMutation.mutate(selectedPlan.id)}
                disabled={renewMutation.isPending}
                className="bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {renewMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
              <button onClick={() => setSelectedPlan(null)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            </div>
            {renewMutation.isError && <p className="text-sm text-red-500 mt-2">{renewMutation.error?.response?.data?.detail || 'Failed'}</p>}
            {renewMutation.isSuccess && <p className="text-sm text-emerald-600 mt-2">Renewal request submitted!</p>}
          </div>
        </div>
      )}
    </div>
  )
}
