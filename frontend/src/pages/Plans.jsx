import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

const planStyles = {
  starter: {
    gradient: 'from-emerald-400 to-teal-500',
    bg: 'bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: 'bi-lightning-charge',
    accent: 'text-emerald-600',
    border: 'border-emerald-200',
  },
  standard: {
    gradient: 'from-blue-400 to-indigo-500',
    bg: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    icon: 'bi-rocket-takeoff',
    accent: 'text-blue-600',
    border: 'border-blue-200',
  },
  vip: {
    gradient: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
    icon: 'bi-crown',
    accent: 'text-amber-600',
    border: 'border-amber-200',
  },
}

function getPlanStyle(name) {
  const lower = (name || '').toLowerCase()
  if (lower.includes('vip') || lower.includes('premium')) return planStyles.vip
  if (lower.includes('standard')) return planStyles.standard
  return planStyles.starter
}

export default function Plans() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/gym_membership_plans/?per_page=50').then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/gym_membership_plans/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Membership Plans</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your gym membership tiers and pricing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {isLoading ? (
          <div className="col-span-3 flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gym-600" />
          </div>
        ) : (
          data?.items?.map((p, idx) => {
            const style = getPlanStyle(p.name)
            return (
              <div key={p.id} className={`relative group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${idx === 2 ? 'md:-mt-4 md:mb-[-16px]' : ''}`}>
                {/* Header gradient */}
                <div className={`bg-gradient-to-r ${style.gradient} p-6 pb-10`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <i className={`bi ${style.icon} text-white text-lg`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{p.name}</h3>
                        <p className="text-xs text-white/70 capitalize">{p.billing_cycle}</p>
                      </div>
                    </div>
                    {p.is_active ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white">Active</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/60">Inactive</span>
                    )}
                  </div>
                </div>

                {/* Price section */}
                <div className={`relative ${style.bg} px-6 py-5 text-center -mt-4 rounded-t-2xl`}>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-sm font-medium text-gray-500">₱</span>
                    <span className="text-4xl font-extrabold text-gray-800">{p.price.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">per {p.billing_cycle}</p>
                </div>

                {/* Features */}
                <div className="px-6 py-5">
                  {p.features ? (
                    <ul className="space-y-2.5">
                      {p.features.split(',').map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <div className={`mt-0.5 w-4 h-4 rounded-full ${style.badge} flex items-center justify-center shrink-0`}>
                            <i className="bi bi-check-lg text-[10px] font-bold" />
                          </div>
                          <span className="text-sm text-gray-600 leading-snug">{f.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400 italic text-center py-4">No features listed</p>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-5">
                  <button
                    onClick={() => { if (confirm(`Delete ${p.name} plan?`)) deleteMutation.mutate(p.id) }}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 border border-red-200 transition-colors"
                  >
                    Delete Plan
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
