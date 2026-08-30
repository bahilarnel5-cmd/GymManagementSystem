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

const PAYMENT_METHODS = [
  { value: 'full_payment', label: 'Full Payment', desc: 'Pay the full amount via GCash' },
  { value: 'down_payment', label: 'Down Payment', desc: 'Pay at least 30% now via GCash' },
  { value: 'cash', label: 'Cash', desc: 'Pay at the front desk — admin confirms' },
]

function downPaymentOf(amount) {
  return Math.ceil((Number(amount) || 0) * 0.3 * 100) / 100
}

export default function MemberRenewals() {
  const queryClient = useQueryClient()
  const orgId = useAuthStore((s) => s.orgId) || '11111111-1111-1111-1111-111111111111'
  const memberId = useAuthStore((s) => s.memberId)
  const [months, setMonths] = useState(1)
  const [flow, setFlow] = useState(null) // { plan, months, method, payAmount, step, renewalId?, membershipId?, ... }

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
    mutationFn: ({ planId, months, payment_method }) =>
      api
        .post(`/member/renew?plan_id=${planId}&payment_type=full&months=${months}&payment_method=${payment_method}`)
        .then((r) => r.data),
    onSuccess: (data) => {
      if (data.payment_status === 'cash_pending') {
        setFlow((f) => ({ ...f, step: 'cash-pending', renewalId: data.id, amount: data.amount }))
      } else {
        setFlow((f) => ({ ...f, step: 'pay', renewalId: data.id, amount: data.amount }))
      }
      queryClient.invalidateQueries({ queryKey: ['member-renewals'] })
    },
  })

  const availMutation = useMutation({
    mutationFn: ({ planId, months, payment_method }) =>
      api
        .post('/gym_memberships/avail', {
          organization_id: orgId,
          member_id: memberId,
          plan_id: planId,
          payment_type: 'full',
          billing_cycle: 'monthly',
          months,
          payment_method,
        })
        .then((r) => r.data),
    onSuccess: (data) => {
      if (data.payment_status === 'cash_pending') {
        setFlow((f) => ({ ...f, step: 'cash-pending', membershipId: data.id, amount: data.amount, months: data.months }))
      } else {
        setFlow((f) => ({ ...f, step: 'pay', membershipId: data.id, amount: data.amount, months: data.months }))
      }
      queryClient.invalidateQueries({ queryKey: ['member-dashboard'] })
    },
  })

  const membership = dashboard?.membership
  const hasMembership = !!membership

  const startFlow = (plan) => {
    const pricing = plan.pricing_months?.[months - 1] || {
      months,
      original_total: plan.price * months,
      discount_percentage: 0,
      discount_applied: 0,
      final_amount: plan.price * months,
      amount_saved: 0,
    }
    setFlow({
      plan,
      months,
      method: 'full_payment',
      step: 'confirm',
      amount: pricing.final_amount,
      originalTotal: pricing.original_total,
      discountApplied: pricing.discount_applied,
      pct: pricing.discount_percentage,
    })
  }

  const submit = () => {
    if (!flow) return
    if (hasMembership) {
      renewMutation.mutate({ planId: flow.plan.id, months: flow.months, payment_method: flow.method })
    } else {
      availMutation.mutate({ planId: flow.plan.id, months: flow.months, payment_method: flow.method })
    }
  }

  const submitting = renewMutation.isPending || availMutation.isPending

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Plans &amp; Renewals</h1>
        <p className="text-sm text-gray-500 mt-1">Pick a duration (1-12 months) and how you want to pay</p>
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
        <div className="flex items-center gap-2 flex-wrap">
          {plans?.[0]?.pricing_months?.[months - 1]?.discount_percentage > 0 && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              Save {plans[0].pricing_months[months - 1].discount_percentage}% with {months} month{months > 1 ? 's' : ''}
            </span>
          )}
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
            <span className="text-sm text-gray-500 pl-2">Duration</span>
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="bg-white rounded-lg px-3 py-1.5 text-sm font-medium text-violet-600 shadow-sm focus:outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>
              ))}
            </select>
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
            const pricing = p.pricing_months?.[months - 1] || {
              months,
              original_total: p.price * months,
              discount_percentage: 0,
              discount_applied: 0,
              final_amount: p.price * months,
              amount_saved: 0,
            }
            const discounted = pricing.discount_percentage > 0
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
                  {discounted ? (
                    <div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-base font-semibold text-gray-400 line-through">₱{pricing.original_total.toLocaleString()}</span>
                      </div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-medium text-gray-500">₱</span>
                        <span className="text-3xl font-extrabold text-emerald-600">{pricing.final_amount.toLocaleString()}</span>
                      </div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                        You save ₱{pricing.amount_saved.toLocaleString()} ({pricing.discount_percentage}%)
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">for {pricing.months} month{pricing.months > 1 ? 's' : ''}</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-medium text-gray-500">₱</span>
                        <span className="text-3xl font-extrabold text-gray-800">{pricing.final_amount.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">for {pricing.months} month{pricing.months > 1 ? 's' : ''}</p>
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
                    onClick={() => startFlow(p)}
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
                  <p className="text-xs text-gray-400 capitalize">
                    {new Date(r.requested_date).toLocaleDateString()} · ₱{r.amount.toLocaleString()} · {r.months_selected} month{r.months_selected > 1 ? 's' : ''} · {r.payment_method.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.payment_status === 'cash_pending' && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">Cash pending</span>
                  )}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    r.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {r.status}
                  </span>
                </div>
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
                  {flow.step === 'confirm' ? 'Confirm Your Plan' : flow.step === 'pay' ? 'Pay with GCash' : flow.step === 'cash-pending' ? 'Cash Payment' : 'Payment Submitted'}
                </h2>
                {flow.step !== 'success' && flow.step !== 'cash-pending' && <p className="text-xs text-gray-400 mt-0.5">{hasMembership ? 'Renew' : 'Avail'} your {flow.plan.name} membership</p>}
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
                    <p className="text-xs text-gray-400 mt-0.5">{flow.months} month{flow.months > 1 ? 's' : ''}</p>

                    <div className="mt-2 flex items-baseline gap-2">
                      {flow.discountApplied > 0 && (
                        <span className="text-base text-gray-400 line-through">₱{flow.originalTotal.toLocaleString()}</span>
                      )}
                      <span className="text-2xl font-bold text-emerald-600">₱{flow.amount.toLocaleString()}</span>
                    </div>
                    {flow.discountApplied > 0 && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                        You save ₱{flow.discountApplied.toLocaleString()} ({flow.pct}%)
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Payment Method</p>
                  <div className="space-y-2 mb-4">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setFlow((f) => ({ ...f, method: m.value }))}
                        className={`w-full flex items-start gap-3 text-left px-4 py-3 rounded-xl border transition-colors ${
                          flow.method === m.value
                            ? 'border-violet-500 bg-violet-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          flow.method === m.value ? 'border-violet-600' : 'border-gray-300'
                        }`}>
                          {flow.method === m.value && <span className="w-2 h-2 rounded-full bg-violet-600" />}
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-gray-800">{m.label}</span>
                          <span className="block text-xs text-gray-500">{m.desc}</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-gray-500 mb-4">
                    {flow.method === 'cash'
                      ? 'No online payment needed. Pay at the front desk — our admin will confirm your cash payment to activate your membership.'
                      : flow.method === 'down_payment'
                        ? `Pay at least ₱${downPaymentOf(flow.amount).toLocaleString()} (30%) now via GCash. The rest can be completed later.`
                        : 'Your plan will be paid online via GCash and activated once an admin verifies your payment.'}
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={submit}
                      disabled={submitting}
                      className="flex-1 bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
                    >
                      {submitting ? 'Creating request...' : flow.method === 'cash' ? 'Confirm Cash Payment' : 'Continue to Payment'}
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
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">{flow.plan.name} ({flow.months} month{flow.months > 1 ? 's' : ''})</span>
                        {flow.discountApplied > 0
                          ? <span className="font-semibold text-gray-400 line-through">₱{flow.originalTotal.toLocaleString()}</span>
                          : <span className="font-semibold text-gray-800">₱{flow.amount.toLocaleString()}</span>}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{flow.method === 'down_payment' ? 'Amount to pay (30% minimum)' : 'Amount to pay'}</span>
                        <span className="font-semibold text-emerald-600">₱{(flow.method === 'down_payment' ? downPaymentOf(flow.amount) : flow.amount).toLocaleString()}</span>
                      </div>
                      {flow.discountApplied > 0 && (
                        <p className="text-xs text-emerald-600">You save ₱{flow.discountApplied.toLocaleString()} ({flow.pct}%)</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {flow.method === 'down_payment'
                        ? `Pay at least ₱${downPaymentOf(flow.amount).toLocaleString()} via GCash; your membership activates once an admin approves the down payment.`
                        : `Pay the exact amount via GCash below. Your membership ${hasMembership ? 'renews' : 'activates'} once an admin approves your payment.`}
                    </p>
                  </div>

                  <GcashPaymentForm
                    amountPlaceholder={flow.method === 'down_payment' ? `Minimum ₱${downPaymentOf(flow.amount).toLocaleString()}` : `Exact ${flow.amount}`}
                    hint={flow.method === 'down_payment' ? 'The 30% down payment is the minimum. You may pay up to the full amount.' : 'Transfer to our GCash account and submit your proof of payment.'}
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

              {flow.step === 'cash-pending' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-orange-100 flex items-center justify-center mb-4">
                    <i className="bi bi-cash-stack text-3xl text-orange-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Cash Payment Pending</h3>
                  <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
                    {hasMembership ? "Your renewal request is ready." : "Your plan request is ready."}{' '}
                    Pay <span className="font-semibold text-gray-700">₱{flow.amount.toLocaleString()}</span>{' '}
                    at the front desk. An admin will confirm your cash payment to {hasMembership ? 'renew' : 'activate'} your membership.
                  </p>
                  <button onClick={() => setFlow(null)} className="mt-6 bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors">
                    Done
                  </button>
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