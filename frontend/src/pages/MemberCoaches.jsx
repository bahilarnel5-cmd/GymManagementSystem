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

export default function MemberCoaches() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['member-coaches', search],
    queryFn: () => api.get(`/member/coaches?search=${search}&per_page=50`).then((r) => r.data),
  })

  const getInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Coaches</h1>
          <p className="text-sm text-gray-500 mt-1">Meet your coaching staff</p>
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
                    {Object.keys(c.weekly_schedule || {}).length > 0 && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                          <i className="bi bi-clock text-amber-600 text-xs" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Weekly Schedule</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(c.weekly_schedule).map(([day, shifts]) => (
                              <span key={day} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-500">
                                {day.slice(0, 3)}: {shifts.join(', ')}
                              </span>
                            ))}
                          </div>
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
    </div>
  )
}
