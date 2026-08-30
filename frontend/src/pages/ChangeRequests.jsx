import { useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

const FIELD_LABELS = {
  full_name: 'Full Name',
  phone: 'Phone Number',
  email: 'Email',
  address: 'Address',
  emergency_contact: 'Emergency Contact',
  profile_photo: 'Profile Photo',
}

const REASON_LABELS = {
  civil_status_change: 'Civil status change',
  lost_stolen_number: 'Lost / stolen number',
  email_change: 'Email change',
  address_change: 'Address change',
  legal_name_correction: 'Legal name correction',
  emergency_contact_update: 'Emergency contact update',
  profile_photo_update: 'Profile photo update',
  other: 'Other',
}

export default function ChangeRequests() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'pending'
  // In-flight guard: ignore a second review of the same request (double-click)
  // instead of firing a duplicate approve/reject request.
  const inFlight = useRef(new Set())

  const setTab = (t) => {
    if (t === 'pending') setParams({})
    else setParams({ tab: t })
  }

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['change-requests-pending'],
    queryFn: () => api.get('/gym_members/change-requests/pending?per_page=50').then((r) => r.data),
    enabled: tab === 'pending',
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['change-requests-history'],
    queryFn: () => api.get('/gym_members/change-requests/history?per_page=50').then((r) => r.data),
    enabled: tab === 'history',
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, admin_notes }) =>
      api.patch(`/gym_members/change-requests/${id}/review`, { status, admin_notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-requests-pending'] })
      queryClient.invalidateQueries({ queryKey: ['change-requests-history'] })
      queryClient.invalidateQueries({ queryKey: ['change-request-pending-count'] })
    },
  })

  const review = ({ id, status, admin_notes }) => {
    if (inFlight.current.has(id)) return
    inFlight.current.add(id)
    reviewMutation.mutate(
      { id, status, admin_notes },
      { onSettled: () => inFlight.current.delete(id) },
    )
  }

  const handleReject = (item) => {
    const notes = prompt('Reason for rejection:', '')
    if (notes === null || !notes.trim()) return
    review({ id: item.id, status: 'rejected', admin_notes: notes.trim() })
  }

  const tabs = [
    { id: 'pending', label: 'Pending Requests', icon: 'bi-inbox' },
    { id: 'history', label: 'Request History', icon: 'bi-clock-history' },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Change Requests</h1>
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-white shadow text-violet-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className={`bi ${t.icon} text-xs`} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'pending' && (
        <div>
          <p className="mb-4 text-sm text-gray-500">
            <span className="font-semibold text-amber-600">{pendingData?.total ?? 0}</span> pending {pendingData?.total === 1 ? 'request' : 'requests'} awaiting review
          </p>
          <div className="space-y-3">
            {pendingLoading ? (
              <p className="text-center py-10 text-gray-400">Loading...</p>
            ) : !pendingData?.items?.length ? (
              <p className="text-center py-10 text-gray-400">No pending change requests</p>
            ) : (
              pendingData.items.map((r) => <RequestCard key={r.id} r={r} busy={reviewMutation.isPending} onApprove={() => review({ id: r.id, status: 'approved' })} onReject={() => handleReject(r)} pending />)
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {historyLoading ? (
            <p className="text-center py-10 text-gray-400">Loading...</p>
          ) : !historyData?.items?.length ? (
            <p className="text-center py-10 text-gray-400">No reviewed change requests</p>
          ) : (
            historyData.items.map((r) => <RequestCard key={r.id} r={r} />)
          )}
        </div>
      )}
    </div>
  )
}

function RequestCard({ r, onApprove, onReject, pending, busy }) {
  const [viewImage, setViewImage] = useState(null)
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-sm font-bold">
            {r.member_name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{r.member_name}</p>
            <p className="text-xs text-gray-500">{new Date(r.submitted_at).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 capitalize">
            {FIELD_LABELS[r.field_name] || r.field_name}
          </span>
          {!pending && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {r.status}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Current</p>
          <p className="text-sm text-gray-500 break-all">{r.current_value || '—'}</p>
        </div>
        <div className="bg-violet-50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-violet-400 mb-1">Requested</p>
          <p className="text-sm font-medium text-gray-800 break-all">{r.requested_value || '—'}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
        <span className="text-xs text-gray-500">Reason: <span className="text-gray-700">{REASON_LABELS[r.reason] || r.reason}</span></span>
        {r.proof_url && (
          <button onClick={() => setViewImage(r.proof_url)} className="flex items-center gap-1 text-xs font-medium text-cyan-600 hover:text-cyan-700">
            <i className="bi bi-image" /> View proof
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-gray-700 bg-gray-50 rounded-xl p-3">“{r.explanation}”</p>
      {r.status === 'rejected' && r.admin_notes && (
        <p className="mt-2 text-xs text-red-600">Rejection note: {r.admin_notes}</p>
      )}
      {r.status === 'approved' && r.admin_notes && (
        <p className="mt-2 text-xs text-gray-500">Admin note: {r.admin_notes}</p>
      )}
      {!pending && (
        <p className="mt-2 text-xs text-gray-400">Reviewed {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : ''}{r.reviewed_by ? ` by ${r.reviewed_by}` : ''}</p>
      )}

      {pending && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={onApprove}
            disabled={onApprove === undefined || busy}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-40"
          >
            Approve &amp; Apply
          </button>
          <button
            onClick={onReject}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-40"
          >
            Reject
          </button>
        </div>
      )}

      {viewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={() => setViewImage(null)}>
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setViewImage(null)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-600">
              <i className="bi bi-x-lg text-sm" />
            </button>
            <img src={viewImage} alt="Change request proof" className="max-h-[80vh] w-full object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  )
}
