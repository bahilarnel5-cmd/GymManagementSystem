import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import GcashPaymentForm from '../components/GcashPaymentForm'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const methodLabel = (m) => ({ full_payment: 'Full Payment', down_payment: 'Down Payment', cash: 'Cash' }[m] || String(m || '').replace(/_/g, ' '))

const enrollBadge = (s) => {
  const map = {
    active: 'bg-emerald-100 text-emerald-700',
    pending_payment: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return map[s] || 'bg-gray-100 text-gray-700'
}

const mostRecentLabel = (s) => {
  const t = String(s || '').replace(/_/g, ' ')
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '—'
}

export default function MemberCoaches() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null) // { coach, days:[], step, method, enrollment, paidMsg }
  const [openGroups, setOpenGroups] = useState(() => new Set())
  const [openCoaches, setOpenCoaches] = useState(() => new Set())
  const queryClient = useQueryClient()

  const { data: myEnrollments } = useQuery({
    queryKey: ['my-coach-enrollments'],
    queryFn: () => api.get('/gym_coach_enrollments/my-enrollments').then((r) => r.data),
  })

  const cancelMutation = useMutation({
    mutationFn: (id) => api.patch(`/gym_coach_enrollments/${id}/cancel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-coach-enrollments'] }),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['member-coaches', search],
    queryFn: () => api.get(`/member/coaches?search=${search}&per_page=50`).then((r) => r.data),
  })

  const getInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const openCoach = (coach) => {
    setSelected({ coach, days: [], step: 'days', method: null, enrollment: null, paidMsg: null })
  }

  const myList = myEnrollments?.items || []

  // One summary row per coach — each group is this member's history with that
  // coach, already sorted most-recent-first by the API.
  const groups = []
  const byCoach = new Map()
  for (const en of myList) {
    const key = en.coach_id || en.coach_name
    if (!byCoach.has(key)) byCoach.set(key, [])
    byCoach.get(key).push(en)
  }
  for (const list of byCoach.values()) groups.push(list)

  const toggleGroup = (key) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleCoach = (id) => {
    setOpenCoaches((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Coaches</h1>
          <p className="text-sm text-gray-500 mt-1">Meet your coaching staff — click a coach to enroll</p>
        </div>
        <div className="text-sm text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
          {data?.total ?? 0} total
        </div>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            placeholder="Search coaches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-white shadow-sm"
          />
        </div>
      </div>

      {groups.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">My Enrollments</h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {groups.map((enrollments) => {
                const key = enrollments[0].coach_id || enrollments[0].coach_name
                const coach = enrollments[0]
                const open = openGroups.has(key)
                return (
                  <div key={key}>
                    <button
                      onClick={() => toggleGroup(key)}
                      className="w-full text-left cursor-pointer group flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                      aria-expanded={open}
                    >
                      <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-sm shrink-0">
                        {getInitials(coach.coach_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-gray-800 truncate">{coach.coach_name}</p>
                        <p className="text-xs text-gray-400">
                          {enrollments.length} enrollment{enrollments.length === 1 ? '' : 's'} — most recent: {mostRecentLabel(coach.enrollment_status)}
                        </p>
                      </div>
                      <div className="w-6 flex justify-end">
                        <i className={`bi bi-chevron-down text-gray-400 text-sm transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {open && (
                      <div className="px-5 pb-5">
                        <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="text-gray-500 text-[11px] uppercase tracking-wider">
                              <tr className="border-b border-gray-200">
                                <th className="px-4 py-2.5 text-left font-semibold">Day</th>
                                <th className="px-4 py-2.5 text-left font-semibold">Payment Method</th>
                                <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {enrollments.map((en) => (
                                <tr key={en.id}>
                                  <td className="px-4 py-3 text-gray-600">{en.selected_day_names?.join(', ') || '—'}</td>
                                  <td className="px-4 py-3 text-gray-600">{methodLabel(en.payment_method)}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap ${enrollBadge(en.enrollment_status)}`}>
                                        {String(en.enrollment_status).replace(/_/g, ' ')}
                                      </span>
                                      {en.enrollment_status === 'pending_payment' && (
                                        <button
                                          onClick={() => { if (confirm('Cancel this pending enrollment?')) cancelMutation.mutate(en.id) }}
                                          disabled={cancelMutation.isPending}
                                          className="text-xs font-medium text-red-500 hover:text-red-700 whitespace-nowrap"
                                        >
                                          Cancel
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <h2 className="text-sm font-semibold text-gray-700 mb-3">All Coaches</h2>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      ) : data?.items?.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
          <i className="bi bi-person-badge text-4xl text-gray-300 mb-3 block" />
          <p className="text-gray-400">No coaches found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {data?.items?.map((c) => {
              const open = openCoaches.has(c.id)
              return (
                <div key={c.id}>
                  <button
                    onClick={() => toggleCoach(c.id)}
                    className="w-full text-left cursor-pointer group flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    aria-expanded={open}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-sm shrink-0">
                        {getInitials(c.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-800 truncate">{c.full_name}</p>
                        <p className="text-xs text-gray-400 md:hidden">{c.specialization}</p>
                      </div>
                    </div>
                    <div className="hidden md:block w-1/3 text-sm text-gray-500 truncate">{c.specialization}</div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-sm font-semibold text-gray-800">₱{c.hourly_rate.toLocaleString()}/day</span>
                      <i className={`bi bi-chevron-down text-gray-400 text-sm transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {open && (
                    <div className="px-5 pb-5">
                      <div className="bg-gray-50 rounded-lg border border-gray-100 p-4 space-y-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                            <i className="bi bi-telephone text-gray-500 text-xs" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Contact</p>
                            <p className="text-sm font-medium text-gray-700 break-words">{c.mobile_contact}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                            <i className="bi bi-calendar-week text-gray-500 text-xs" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Available Days</p>
                            <p className="text-sm font-medium text-gray-700">
                              {Object.keys(c.weekly_schedule || {}).length > 0
                                ? Object.keys(c.weekly_schedule || {}).join(', ')
                                : 'No set schedule'}
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-gray-100 pt-3">
                          <button
                            onClick={() => openCoach(c)}
                            className="w-full py-2.5 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                          >
                            Enroll
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {selected && (
        <EnrollModal
          selected={selected}
          setSelected={setSelected}
        />
      )}
    </div>
  )
}

function EnrollModal({ selected, setSelected }) {
  const queryClient = useQueryClient()
  const closedRef = useRef(false)
  const canceledRef = useRef(false)

  const availableDays = DAYS.filter((d) => (selected.coach.weekly_schedule || {})[d])

  const cancelEnrollment = useMutation({
    mutationFn: (id) => api.patch(`/gym_coach_enrollments/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-coach-enrollments'] })
    },
  })

  const cancelPending = (id) => {
    if (canceledRef.current) return
    canceledRef.current = true
    cancelEnrollment.mutate(id)
  }

  // Full close = cancel and reset the enrollment attempt. No partial state remains.
  const closeFlow = () => {
    closedRef.current = true
    if (selected.step === 'gcash' && selected.enrollment) {
      cancelPending(selected.enrollment.id)
    }
    setSelected(null)
  }

  const { mutate: createEnrollment, isPending: creating, isError, error } = useMutation({
    mutationFn: (body) => api.post('/gym_coach_enrollments/', body).then((r) => r.data),
    onSuccess: (enrollment) => {
      queryClient.invalidateQueries({ queryKey: ['member-coaches'] })
      queryClient.invalidateQueries({ queryKey: ['my-coach-enrollments'] })
      // Modal was closed while the request was in flight: don't resume the flow.
      if (closedRef.current) {
        if (enrollment.payment_method !== 'cash') cancelPending(enrollment.id)
        return
      }
      if (enrollment.payment_method === 'cash') {
        setSelected({ ...selected, step: 'success', enrollment })
      } else {
        setSelected({ ...selected, step: 'gcash', enrollment, method: enrollment.payment_method })
      }
    },
  })

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') closeFlow()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  const totalPerDay = selected.coach.hourly_rate
  let total = 0
  if (selected.step === 'payment' || selected.step === 'gcash') {
    total = totalPerDay * (selected.days || []).length
  }
  const downMin = Math.ceil(total * 0.3 * 100) / 100

  const toggleDay = (d) => {
    setSelected({
      ...selected,
      days: selected.days.includes(d)
        ? selected.days.filter((x) => x !== d)
        : [...selected.days, d],
    })
  }

  const errMsg = (err) => err?.response?.data?.detail || 'Something went wrong'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeFlow}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-violet-600 flex items-center justify-center text-white font-bold">
              {selected.coach.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <h2 className="font-bold text-gray-800">{selected.coach.full_name}</h2>
              <p className="text-xs text-gray-500">{selected.coach.specialization}</p>
            </div>
          </div>
          <button onClick={closeFlow} className="text-gray-400 hover:text-gray-600"><i className="bi bi-x-lg" /></button>
        </div>

        <div className="p-6">
          {/* STEP: success */}
          {selected.step === 'success' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <i className="bi bi-check-lg text-3xl text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">
                {selected.enrollment?.payment_method === 'cash' ? 'Enrollment Requested' : 'Enrollment Created'}
              </h3>
              <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
                {selected.paidMsg || 'Please pay in cash at the front desk. Your enrollment will be activated once payment is confirmed by an admin.'}
              </p>
              <div className="mt-5 bg-gray-50 rounded-xl p-4 text-sm text-left space-y-1.5">
                <div className="flex justify-between"><span className="text-gray-500">Days</span><span className="font-medium text-gray-800">{selected.enrollment?.selected_day_names?.join(', ') || selected.days.join(', ')}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Payment method</span><span className="font-medium text-gray-800 capitalize">{String(selected.enrollment?.payment_method || '').replace('_', ' ')}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-semibold text-gym-600">₱{parseFloat(selected.enrollment?.total_amount || 0).toLocaleString()}</span></div>
              </div>
              <button onClick={closeFlow} className="mt-6 bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700">Done</button>
            </div>
          )}

          {/* STEP: days */}
          {selected.step === 'days' && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Select your training day(s)</p>
              <p className="text-xs text-gray-400 mb-4">Multiple days allowed — ₱{totalPerDay.toLocaleString()} per day</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableDays.length === 0 ? (
                  <p className="col-span-full text-sm text-gray-400 text-center py-4">This coach has no set weekly schedule yet.</p>
                ) : (
                  availableDays.map((d) => {
                    const on = selected.days.includes(d)
                    return (
                      <button
                        key={d}
                        onClick={() => toggleDay(d)}
                        className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                          on ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-700 border-gray-200 hover:border-violet-300'
                        }`}
                      >
                        {d}
                      </button>
                    )
                  })
                )}
              </div>
              {selected.days.length > 0 && (
                <p className="text-xs text-gray-500 mt-3">Selected: <span className="font-medium text-violet-600">{selected.days.join(', ')}</span></p>
              )}
              <button
                onClick={() => setSelected({ ...selected, step: 'payment' })}
                disabled={selected.days.length === 0}
                className="mt-6 w-full bg-violet-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-40"
              >
                Continue to Payment
              </button>
            </div>
          )}

          {/* STEP: payment */}
          {selected.step === 'payment' && (
            <div>
              <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm flex items-center justify-between">
                <span className="text-gray-500">{selected.days.length} day(s) × ₱{totalPerDay.toLocaleString()}</span>
                <span className="font-bold text-gym-600 text-lg">₱{total.toLocaleString()}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Choose a payment method</p>
              <div className="space-y-2.5">
                {[
                  { id: 'full_payment', label: 'Full Payment', desc: `Pay the full ₱${total.toLocaleString()} now via GCash`, icon: 'bi-cash-coin' },
                  { id: 'down_payment', label: 'Down Payment', desc: `Pay at least 30% (₱${downMin.toLocaleString()}) now, rest later`, icon: 'bi-bank' },
                  { id: 'cash', label: 'Cash', desc: 'Pay in person at the front desk', icon: 'bi-wallet2' },
                ].map((m) => {
                  const on = selected.method === m.id
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelected({ ...selected, method: m.id })}
                      className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                        on ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-violet-200'
                      }`}
                    >
                      <i className={`bi ${m.icon} text-lg mt-0.5 ${on ? 'text-violet-600' : 'text-gray-400'}`} />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{m.label}</p>
                        <p className="text-xs text-gray-500">{m.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {isError && <p className="text-sm text-red-500 mt-3">{errMsg(error)}</p>}

              <button
                onClick={() => createEnrollment({ coach_id: selected.coach.id, selected_days: selected.days.map(d => DAYS.indexOf(d)), payment_method: selected.method })}
                disabled={!selected.method || creating}
                className="mt-6 w-full bg-violet-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-40"
              >
                {creating ? 'Creating...' : 'Confirm Enrollment'}
              </button>
              <button
                onClick={() => setSelected({ ...selected, step: 'days' })}
                className="mt-2 w-full text-sm text-gray-500 hover:text-gray-700 py-1"
              >
                ← Back to days
              </button>
            </div>
          )}

          {/* STEP: gcash */}
          {selected.step === 'gcash' && (
            <div>
              <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold text-gym-600">₱{total.toLocaleString()}</span></div>
                {selected.method === 'down_payment' && (
                  <div className="flex justify-between mt-1"><span className="text-gray-500">Minimum down (30%)</span><span className="font-medium text-gray-700">₱{downMin.toLocaleString()}</span></div>
                )}
              </div>

              <GcashPaymentForm
                accent="violet"
                amountPlaceholder={selected.method === 'full_payment' ? `Full ${total}` : `Min ${downMin}`}
                hint={selected.method === 'full_payment' ? 'Enter the full total amount in GCash below.' : 'Enter any amount from the 30% minimum up to the total.'}
                extra={(fd) => fd.append('enrollment_id', selected.enrollment.id)}
                onSuccess={() => {
                  setSelected({ ...selected, step: 'success', paidMsg: 'Your payment proof has been submitted. Enrollment will be activated once an admin verifies your payment.' })
                  queryClient.invalidateQueries({ queryKey: ['member-coaches'] })
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
