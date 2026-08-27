import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

const coachColors = [
  { bg: 'bg-violet-500', ring: 'ring-violet-200' },
  { bg: 'bg-blue-500', ring: 'ring-blue-200' },
  { bg: 'bg-emerald-500', ring: 'ring-emerald-200' },
  { bg: 'bg-amber-500', ring: 'ring-amber-200' },
  { bg: 'bg-rose-500', ring: 'ring-rose-200' },
]

export default function Coaches() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['coaches', page, search],
    queryFn: () => api.get(`/gym_coaches/?page=${page}&per_page=10&search=${search}`).then((r) => r.data),
  })

  const getInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Coaches</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your coaching staff</p>
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
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gym-500 focus:border-transparent outline-none bg-white shadow-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gym-600" />
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
              <div key={c.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
                {/* Header */}
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

                {/* Body */}
                <div className="relative px-5 pb-5 -mt-3">
                  <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gym-50 flex items-center justify-center">
                        <i className="bi bi-cash-stack text-gym-600 text-xs" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Rate</p>
                        <p className="text-sm font-bold text-gray-800">₱{c.hourly_rate.toLocaleString()}/hr</p>
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

                    {c.shift_schedule && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                          <i className="bi bi-clock text-amber-600 text-xs" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Schedule</p>
                          <p className="text-sm font-medium text-gray-700">{c.shift_schedule}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 mt-6 bg-white rounded-xl shadow-sm">
          <span className="text-sm text-gray-500">Page {data.page} of {data.pages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Prev</button>
            <button onClick={() => setPage(Math.min(data.pages, page + 1))} disabled={page === data.pages} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
