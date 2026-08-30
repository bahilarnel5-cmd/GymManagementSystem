import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'

// GCash details shown to members. Replace the QR image / account with your gym's
// real GCash details. (You can point QR_SRC at a public URL or a local asset.)
export const GCASH_ACCOUNT_NAME = 'GymManager Suporta'
export const GCASH_ACCOUNT_NUMBER = '0917 123 4567'

const accents = {
  emerald: {
    button: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
    file: 'file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100',
    input: 'focus:ring-emerald-500',
  },
  violet: {
    button: 'bg-violet-600 hover:bg-violet-700 focus:ring-violet-500',
    file: 'file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100',
    input: 'focus:ring-violet-500',
  },
}

export default function GcashPaymentForm({ accent = 'emerald', amountPlaceholder, hint, extra, onSuccess }) {
  const queryClient = useQueryClient()
  const memberId = useAuthStore((s) => s.memberId)
  const [amount, setAmount] = useState('')
  const [refLast4, setRefLast4] = useState('')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const fileRef = useRef(null)
  const a = accents[accent] || accents.emerald

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const clearFile = () => {
    setFile(null)
    setPreviewUrl(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const submitMutation = useMutation({
    mutationFn: (fd) => api.post('/gym_payments/submit', fd).then((r) => r.data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['payment-submissions'] })
      queryClient.invalidateQueries({ queryKey: ['payment-submissions-pending'] })
      queryClient.invalidateQueries({ queryKey: ['payment-pending-count'] })
      setAmount('')
      setRefLast4('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      onSuccess?.(result)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('member_id', memberId)
    fd.append('amount_paid', String(parseFloat(amount) || 0))
    fd.append('ref_last4', refLast4)
    fd.append('file', file)
    extra?.(fd)
    submitMutation.mutate(fd)
  }

  const handleRef = (v) => {
    const digits = v.replace(/\D/g, '')
    setRefLast4(digits.slice(0, 4))
  }

  const openGcash = () => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (!isMobile) {
      window.open('https://www.gcash.com', '_blank', 'noopener,noreferrer')
      return
    }
    let opened = false
    const onBlur = () => { opened = true }
    window.addEventListener('blur', onBlur)
    const el = document.createElement('a')
    el.href = 'gcash://'
    document.body.appendChild(el)
    el.click()
    el.remove()
    setTimeout(() => {
      window.removeEventListener('blur', onBlur)
      if (!opened) window.open('https://www.gcash.com', '_blank', 'noopener,noreferrer')
    }, 900)
  }

  return (
    <div>
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 mb-4">
        <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm mb-2"><i className="bi bi-phone" /> Scan to Pay</div>
        <div className="w-36 h-36 mx-auto bg-white rounded-xl border-2 border-dashed border-blue-200 flex items-center justify-center mb-3">
          <i className="bi bi-qr-code text-6xl text-blue-300" />
        </div>
        <div className="bg-white rounded-lg px-3 py-2 text-center shadow-sm">
          <p className="text-sm font-semibold text-gray-800">{GCASH_ACCOUNT_NAME}</p>
          <p className="text-xs text-gray-500">{GCASH_ACCOUNT_NUMBER}</p>
        </div>
        <button
          type="button"
          onClick={openGcash}
          className={`mt-3 w-full ${a.button} text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors`}
        >
          <i className="bi bi-phone" /> Open GCash App
        </button>
        <p className="text-[11px] text-gray-400 text-center mt-1.5">
          Opens the GCash app — you'll still need to scan the QR code or enter the number shown above
        </p>
      </div>

      {hint && <p className="text-xs text-gray-400 mb-3">{hint}</p>}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Amount Paid (₱)</label>
          <input
            type="number" min="0" step="0.01" placeholder={amountPlaceholder || 'e.g. 1000'}
            value={amount} onChange={(e) => setAmount(e.target.value)}
            className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 ${a.input} focus:border-transparent outline-none`}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Last 4 Digits of Reference No.</label>
          <input
            type="text" inputMode="numeric" placeholder="e.g. 1234"
            value={refLast4} onChange={(e) => handleRef(e.target.value)}
            className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 ${a.input} focus:border-transparent outline-none`}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Proof Screenshot</label>
          <input
            ref={fileRef}
            type="file" accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className={`w-full text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0 ${a.file} file:text-sm file:font-medium`}
            required
          />
          {file && (
            <div className="mt-2.5 flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-2.5">
              {previewUrl && (
                <img src={previewUrl} alt="Payment proof preview" className="w-14 h-14 rounded-lg object-cover border border-gray-200 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                <p className="text-[11px] text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                type="button"
                onClick={clearFile}
                className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-100 transition-colors"
              >
                <i className="bi bi-x-lg" /> Remove
              </button>
            </div>
          )}
        </div>
        {submitMutation.isError && (
          <p className="text-sm text-red-500">{submitMutation.error?.response?.data?.detail || 'Failed to submit payment'}</p>
        )}
        <button
          type="submit"
          disabled={submitMutation.isPending}
          className={`w-full ${a.button} text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors`}
        >
          {submitMutation.isPending ? 'Submitting...' : 'Submit Payment'}
        </button>
      </form>
    </div>
  )
}