import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'

const GCASH_ACCOUNT_NAME = 'GymManager Suporta'
const GCASH_ACCOUNT_NUMBER = '0917 123 4567'

const coachColors = [
  { bg: 'bg-violet-500', ring: 'ring-violet-200' },
  { bg: 'bg-blue-500', ring: 'ring-blue-200' },
  { bg: 'bg-emerald-500', ring: 'ring-emerald-200' },
  { bg: 'bg-amber-500', ring: 'ring-amber-200' },
  { bg: 'bg-rose-500', ring: 'ring-rose-200' },
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function MemberCoaches() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null) // { coach, days:[], step, method, enrollment, paidMsg }
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

      {myList.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">My Enrollments</h2>
          <div className="space-y-2.5">
            {myList.map((en) => (
              <div key={en.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center gap-3">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{en.coach_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{en.selected_day_names?.join(', ')} · {String(en.payment_method).replace('_', ' ')}</p>
                </div>
                <span className={`ml-auto px-2.5 py-1 rounded-full text-xs font-medium ${
                  en.enrollment_status === 'active' ? 'bg-emerald-100 text-emerald-700'
                  : en.enrollment_status === 'pending_payment' ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-500'
                }`}>
                  {String(en.enrollment_status).replace('_', ' ')}
                </span>
                <span className="text-sm font-semibold text-gym-600">₱{en.amount_paid.toLocaleString()}<span className="text-gray-400 text-xs font-normal"> / ₱{en.total_amount.toLocaleString()}</span></span>
                {en.enrollment_status === 'pending_payment' && (
                  <button
                    onClick={() => { if (confirm('Cancel this pending enrollment?')) cancelMutation.mutate(en.id) }}
                    disabled={cancelMutation.isPending}
                    className="text-xs font-medium text-red-500 hover:text-red-700"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data?.items?.map((c, idx) => {
            const color = coachColors[idx % coachColors.length]
            return (
              <button
                key={c.id}
                onClick={() => openCoach(c)}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md hover:ring-2 hover:ring-violet-200 transition-all duration-200 overflow-hidden group text-left cursor-pointer"
              >
                <div className={`${color.bg} p-5 pb-8 relative`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg ring-2 ${color.ring}`}>
                      {getInitials(c.full_name)}
                    </div>
                    <div className="text-white">
                      <h3 className="font-bold text-sm">{c.full_name}</h3>
                      <p className="text-white/70 text-xs">{c.specialization}</p>
                    </div>
                  </div>
                </div>

                <div className="relative px-5 pb-5 -mt-3">
                  <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                        <i className="bi bi-cash-stack text-violet-600 text-xs" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Rate</p>
                        <p className="text-sm font-bold text-gray-800">₱{c.hourly_rate.toLocaleString()}/day</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                        <i className="bi bi-telephone text-blue-600 text-xs" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Contact</p>
                        <p className="text-sm font-medium text-gray-700">{c.mobile_contact}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                        <i className="bi bi-calendar-week text-amber-600 text-xs" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Available Days</p>
                        <p className="text-sm font-medium text-gray-700">
                          {Object.keys(c.weekly_schedule || {}).length > 0
                            ? Object.keys(c.weekly_schedule || {}).join(', ')
                            : 'No set schedule'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {selected && (
        <EnrollModal
          selected={selected}
          setSelected={setSelected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function EnrollModal({ selected, setSelected, onClose }) {
  const queryClient = useQueryClient()
  const memberId = useAuthStore((s) => s.memberId)

  const availableDays = DAYS.filter((d) => (selected.coach.weekly_schedule || {})[d])

  const { mutate: createEnrollment, isPending: creating, isError, error } = useMutation({
    mutationFn: (body) => api.post('/gym_coach_enrollments/', body).then((r) => r.data),
    onSuccess: (enrollment) => {
      if (enrollment.payment_method === 'cash') {
        setSelected({ ...selected, step: 'success', enrollment })
      } else {
        setSelected({ ...selected, step: 'gcash', enrollment, method: enrollment.payment_method })
      }
      queryClient.invalidateQueries({ queryKey: ['member-coaches'] })
    },
  })

  const { mutate: submitPayment, isPending: submitting, isError: payError, error: payErr } = useMutation({
    mutationFn: (fd) => api.post('/gym_payments/submit', fd).then((r) => r.data),
    onSuccess: () => {
      setSelected({ ...selected, step: 'success', paidMsg: 'Your payment proof has been submitted. Enrollment will be activated once an admin verifies your payment.' })
      queryClient.invalidateQueries({ queryKey: ['member-coaches'] })
    },
  })

  const [amount, setAmount] = useState('')
  const [refLast4, setRefLast4] = useState('')
  const [file, setFile] = useState(null)

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

  const handleRef = (v) => {
    const digits = v.replace(/\D/g, '')
    setRefLast4(digits.slice(0, 4))
  }

  const handleGcashSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('member_id', memberId)
    fd.append('enrollment_id', selected.enrollment.id)
    fd.append('amount_paid', String(parseFloat(amount) || 0))
    fd.append('ref_last4', refLast4)
    fd.append('file', file)
    submitPayment(fd)
  }

  const errMsg = (err) => err?.response?.data?.detail || 'Something went wrong'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="bi bi-x-lg" /></button>
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
              <button onClick={onClose} className="mt-6 bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700">Done</button>
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
                <p className="text-xs text-gray-400 mt-2">
                  {selected.method === 'full_payment' ? 'Enter the full total amount in GCash below.' : 'Enter any amount from the 30% minimum up to the total.'}
                </p>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 mb-4">
                <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm mb-2"><i className="bi bi-phone" /> Scan to Pay</div>
                <div className="w-36 h-36 mx-auto bg-white rounded-xl border-2 border-dashed border-blue-200 flex items-center justify-center mb-3">
                  <i className="bi bi-qr-code text-6xl text-blue-300" />
                </div>
                <div className="bg-white rounded-lg px-3 py-2 text-center shadow-sm">
                  <p className="text-sm font-semibold text-gray-800">{GCASH_ACCOUNT_NAME}</p>
                  <p className="text-xs text-gray-500">{GCASH_ACCOUNT_NUMBER}</p>
                </div>
              </div>

              <form onSubmit={handleGcashSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Amount Paid (₱)</label>
                  <input
                    type="number" min="0" step="0.01" placeholder={selected.method === 'full_payment' ? `Full ${total}` : `Min ${downMin}`}
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Last 4 Digits of Reference No.</label>
                  <input
                    type="text" inputMode="numeric" placeholder="e.g. 1234"
                    value={refLast4} onChange={(e) => handleRef(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Proof Screenshot</label>
                  <input
                    type="file" accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-violet-50 file:text-violet-700 file:text-sm file:font-medium hover:file:bg-violet-100"
                    required
                  />
                </div>
                {payError && <p className="text-sm text-red-500">{errMsg(payErr)}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-violet-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Payment'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
