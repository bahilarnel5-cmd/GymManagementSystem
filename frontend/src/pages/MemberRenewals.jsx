import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'
import GcashPaymentForm from '../components/GcashPaymentForm'

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

function computeBilling(monthly, cycle, pct) {
  const m = Math.round((Number(monthly) || 0) * 100) / 100
  if (cycle !== 'annual') {
    return { cycle: 'monthly', original: m, discount: 0, final: m, pct: 0 }
  }
  const original = Math.round(m * 12 * 100) / 100
  const discount = Math.round((original * (Number(pct) || 0)) / 100 * 100) / 100
  return {
    cycle: 'annual',
    original,
    discount,
    final: Math.round((original - discount) * 100) / 100,
    pct: Number(pct) || 0,
  }
}

export default function MemberRenewals() {
  const queryClient = useQueryClient()
  const orgId = useAuthStore((s) => s.orgId) || '11111111-1111-1111-1111-111111111111'
  const memberId = useAuthStore((s) => s.memberId)
  const [cycle, setCycle] = useState('monthly')
  const [flow, setFlow] = useState(null) // { plan, cycle, step, renewalId?, membershipId?, amount, ... }

  const { data: plans, isLoading } = useQuery({
    queryKey: ['member-plans'],
    queryFn: () => api.get('/member/plans').then((r) => r.data),
  })

  const { data: settings } = useQuery({
    queryKey: ['annual-discount'],
    queryFn: () => api.get('/gym_settings/annual-discount').then((r) => r.data),
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
    mutationFn: ({ planId, billing_cycle }) =>
      api.post(`/member/renew?plan_id=${planId}&payment_type=full&billing_cycle=${billing_cycle}`).then((r) => r.data),
    onSuccess: (data) => {
      setFlow((f) => ({ ...f, step: 'pay', renewalId: data.id, amount: data.amount }))
      queryClient.invalidateQueries({ queryKey: ['member-renewals'] })
    },
  })

  const availMutation = useMutation({
    mutationFn: ({ planId, billing_cycle }) =>
      api
        .post('/gym_memberships/avail', {
          organization_id: orgId,
          member_id: memberId,
          plan_id: planId,
          payment_type: 'full',
          billing_cycle,
        })
        .then((r) => r.data),
    onSuccess: (data) => {
      setFlow((f) => ({ ...f, step: 'pay', membershipId: data.id, amount: data.amount }))
      queryClient.invalidateQueries({ queryKey: ['member-dashboard'] })
    },
  })

  const membership = dashboard?.membership
  const hasMembership = !!membership
  const pct = settings?.annual_discount_percentage ?? plans?.[0]?.annual_discount_percentage ?? 15

  const startFlow = (plan, chosenCycle) => {
    const billing = computeBilling(plan.price, chosenCycle, pct)
    setFlow({
      plan,
      cycle: chosenCycle,
      step: 'confirm',
      amount: billing.final,
      originalTotal: billing.original,
      discountApplied: billing.discount,
      pct: billing.pct,
    })
  }

  const submit = () => {
    if (hasMembership) {
      renewMutation.mutate({ planId: flow.plan.id, billing_cycle: flow.cycle })
    } else {
      availMutation.mutate({ planId: flow.plan.id, billing_cycle: flow.cycle })
    }
  }

  const submitting = renewMutation.isPending || availMutation.isPending

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Plans &amp; Renewals</h1>
        <p className="text-sm text-gray-500 mt-1">Choose a billing cycle and manage your membership</p>
      </div>

      {hasMembership ? (
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
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <p className="text-sm font-medium text-gray-700">You don&apos;t have a membership plan yet</p>
          <p className="text-xs text-gray-400 mt-1">Pick a plan below and complete your payment to get started.</p>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Available Plans</h2>
        <div className="flex items-center gap-2">
          {cycle === 'annual' && pct > 0 && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              Save {pct}% on annual billing
            </span>
          )}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setCycle('monthly')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${cycle === 'monthly' ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setCycle('annual')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${cycle === 'annual' ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Annual
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {isLoading ? (
          <div className="col-span-3 flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        ) : (
          plans?.map((p) => {
            const style = getPlanStyle(p.name)
            const billing = computeBilling(p.price, cycle, pct)
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
                  {billing.cycle === 'annual' ? (
                    <div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-base font-semibold text-gray-400 line-through">₱{billing.original.toLocaleString()}</span>
                      </div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-medium text-gray-500">₱</span>
                        <span className="text-3xl font-extrabold text-emerald-600">{billing.final.toLocaleString()}</span>
                      </div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                        You save ₱{billing.discount.toLocaleString()}
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">per year</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-medium text-gray-500">₱</span>
                        <span className="text-3xl font-extrabold text-gray-800">{p.price.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">per month</p>
                    </div>
                  )}
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
                    onClick={() => startFlow(p, cycle)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                  >
                    {hasMembership ? 'Renew with this plan' : 'Avail this plan'}
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
                  <p className="text-xs text-gray-400">
                    {new Date(r.requested_date).toLocaleDateString()} · ₱{r.amount.toLocaleString()} · {r.billing_cycle}
                  </p>
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

      {flow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {flow.step === 'confirm' ? 'Confirm Your Plan' : flow.step === 'pay' ? 'Pay with GCash' : 'Payment Submitted'}
                </h2>
                {flow.step !== 'success' && <p className="text-xs text-gray-400 mt-0.5">{hasMembership ? 'Renew' : 'Avail'} your {flow.plan.name} membership</p>}
              </div>
              <button onClick={() => setFlow(null)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600">
                <i className="bi bi-x-lg text-sm" />
              </button>
            </div>

            <div className="p-6">
              {flow.step === 'confirm' && (
                <div>
                  <div className="bg-gray-50 rounded-xl p-4 mb-5">
                    <p className="text-sm text-gray-600">Plan</p>
                    <p className="font-bold text-gray-800">{flow.plan.name}</p>

                    {flow.cycle === 'annual' ? (
                      <div className="mt-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-base text-gray-400 line-through">₱{flow.originalTotal.toLocaleString()}</span>
                          <span className="text-2xl font-bold text-emerald-600">₱{flow.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                            You save ₱{flow.discountApplied.toLocaleString()} ({flow.pct}%)
                          </span>
                          <span className="text-xs text-gray-400">per year</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-lg font-bold text-violet-600 mt-1">₱{flow.plan.price.toLocaleString()} / month</p>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mb-4">Your plan will be paid online via GCash and activated once an admin verifies your payment.</p>

                  <div className="flex gap-3">
                    <button
                      onClick={submit}
                      disabled={submitting}
                      className="flex-1 bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
                    >
                      {submitting ? 'Creating request...' : 'Continue to Payment'}
                    </button>
                    <button onClick={() => setFlow(null)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                  </div>
                  {(renewMutation.isError || availMutation.isError) && (
                    <p className="text-sm text-red-500 mt-3">
                      {(renewMutation.error || availMutation.error)?.response?.data?.detail || 'Failed'}
                    </p>
                  )}
                </div>
              )}

              {flow.step === 'pay' && (
                <div>
                  <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm">
                    {flow.cycle === 'annual' ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between"><span className="text-gray-500">{flow.plan.name} (annual)</span><span className="font-semibold text-gray-400 line-through">₱{flow.originalTotal.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Amount to pay</span><span className="font-semibold text-emerald-600">₱{flow.amount.toLocaleString()}</span></div>
                        <p className="text-xs text-emerald-600">You save ₱{flow.discountApplied.toLocaleString()} on annual billing</p>
                      </div>
                    ) : (
                      <div className="flex justify-between"><span className="text-gray-500">{flow.plan.name} (monthly)</span><span className="font-semibold text-gray-800">₱{flow.amount.toLocaleString()}</span></div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Pay the exact amount via GCash below. Your membership {hasMembership ? 'renews' : 'activates'} once an admin approves your payment.
                    </p>
                  </div>

                  <GcashPaymentForm
                    amountPlaceholder={`Exact ${flow.amount}`}
                    hint="Transfer to our GCash account and submit your proof of payment."
                    extra={(fd) => {
                      if (flow.renewalId) fd.append('renewal_id', flow.renewalId)
                      if (flow.membershipId) fd.append('membership_id', flow.membershipId)
                    }}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ['member-dashboard'] })
                      setFlow((f) => ({ ...f, step: 'success' }))
                    }}
                  />
                </div>
              )}

              {flow.step === 'success' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                    <i className="bi bi-check-lg text-3xl text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Payment Submitted</h3>
                  <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
                    Your payment proof is now pending admin verification. Your membership will{' '}
                    {hasMembership ? 'be renewed' : 'be activated'} once it&apos;s approved.
                  </p>
                  <button onClick={() => setFlow(null)} className="mt-6 bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors">
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}