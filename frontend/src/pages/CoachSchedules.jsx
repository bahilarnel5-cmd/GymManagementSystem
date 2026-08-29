import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export default function CoachSchedules() {
  const { data, isLoading } = useQuery({
    queryKey: ['coach-schedules'],
    queryFn: () => api.get('/coach_portal/schedules').then((r) => r.data),
  })

  const items = data?.items || []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Schedule</h1>
        <p className="text-sm text-gray-500 mt-1">Weekly duty schedule set by the administrator</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" /></div>
        ) : items.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center shadow-sm">
            <i className="bi bi-calendar3 text-4xl text-gray-300 mb-3 block" />
            <p className="text-gray-400">No schedule assigned. Ask the admin to set one up.</p>
          </div>
        ) : items.map((s) => (
          <div key={s.id} className={`bg-white rounded-2xl shadow-sm border p-5 ${s.is_active ? 'border-amber-200' : 'border-gray-100 opacity-60'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-800">{s.day_name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${s.is_active ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>
                {s.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-gray-500 capitalize">{s.shift_type} shift</p>
          </div>
        ))}
      </div>
    </div>
  )
}