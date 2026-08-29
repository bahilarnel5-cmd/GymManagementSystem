import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'

// GCash details shown to members. Replace the QR image / account with your gym's
// real GCash details. (You can point QR_SRC at a public URL or a local asset.)
const GCASH_ACCOUNT_NAME = 'GymManager Suporta'
const GCASH_ACCOUNT_NUMBER = '0917 123 4567'

export default function MemberGcash() {
  const queryClient = useQueryClient()
  const memberId = useAuthStore((s) => s.memberId)
  const [amount, setAmount] = useState('')
  const [refLast4, setRefLast4] = useState('')
  const [file, setFile] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const submitMutation = useMutation({
    mutationFn: (formData) => api.post('/gym_payments/submit', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-submissions'] })
      setSubmitted(true)
      setAmount('')
      setRefLast4('')
      setFile(null)
      document.getElementById('proof-file').value = ''
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('member_id', memberId)
    fd.append('amount_paid', String(parseFloat(amount) || 0))
    fd.append('ref_last4', refLast4)
    fd.append('file', file)
    submitMutation.mutate(fd)
  }

  const handleRef = (v) => {
    const digits = v.replace(/\D/g, '')
    setRefLast4(digits.slice(0, 4))
  }

  if (submitted) {
    return (
      <div className="max-w-xl">
        <div className="bg-white rounded-2xl shadow-sm border-2 border-emerald-200 p-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <i className="bi bi-check-lg text-3xl text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Payment Submitted</h1>
          <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
            Your payment proof is now pending admin verification. You'll be notified once it's approved.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-6 bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            Submit Another Payment
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pay with GCash</h1>
        <p className="text-sm text-gray-500 mt-1">Transfer to our GCash account and submit your proof of payment</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-5">
            <div className="flex items-center gap-2 text-white">
              <i className="bi bi-phone text-sm" />
              <h2 className="font-semibold">Scan to Pay</h2>
            </div>
            <p className="text-blue-100 text-xs mt-0.5">Open your GCash app and scan this QR</p>
          </div>
          <div className="p-6 flex flex-col items-center">
            <div className="w-52 h-52 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center mb-4">
              <i className="bi bi-qr-code text-7xl text-gray-300" />
            </div>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 w-full">
              <i className="bi bi-person-circle text-2xl text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-gray-800">{GCASH_ACCOUNT_NAME}</p>
                <p className="text-xs text-gray-500">{GCASH_ACCOUNT_NUMBER}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-5">
            <h2 className="text-lg font-semibold text-white">Submit Proof of Payment</h2>
            <p className="text-emerald-100 text-xs">Enter transfer details and upload the screenshot</p>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Amount Paid (₱)</label>
              <input
                type="number" min="0" step="0.01" placeholder="e.g. 1000"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Last 4 Digits of Reference No.</label>
              <input
                type="text" inputMode="numeric" placeholder="e.g. 1234"
                value={refLast4} onChange={(e) => handleRef(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Proof Screenshot</label>
              <input
                id="proof-file" type="file" accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-emerald-50 file:text-emerald-700 file:text-sm file:font-medium hover:file:bg-emerald-100"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit Payment'}
            </button>
            {submitMutation.isError && (
              <p className="text-sm text-red-500">{submitMutation.error?.response?.data?.detail || 'Failed to submit payment'}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
