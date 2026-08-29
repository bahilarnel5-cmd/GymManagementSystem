import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export default function CoachDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['coach-dashboard'],
    queryFn: () => api.get('/coach_portal/dashboard').then((r) => r.data),
  })

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" /></div>
  }
  if (isError || !data) {
    return <div className="bg-white rounded-2xl p-12 text-center shadow-sm"><p className="text-gray-400">Could not load coach dashboard.</p></div>
  }

  const c = data.coach
  const s = data.stats
  const stats = [
    { label: 'My Students', value: s.total_students, icon: 'bi-people', color: 'from-violet-500 to-violet-600' },
    { label: 'Paid', value: s.paid_students, icon: 'bi-check-circle', color: 'from-emerald-500 to-emerald-600' },
    { label: 'Unpaid', value: s.unpaid_students, icon: 'bi-exclamation-circle', color: 'from-rose-500 to-rose-600' },
    { label: "Today's Sessions", value: s.todays_bookings, icon: 'bi-calendar-check', color: 'from-amber-500 to-orange-600' },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Coach Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, {c.full_name}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-3 py-1.5 rounded-full shadow-sm">
          <i className="bi bi-person-badge text-amber-600" />
          {c.specialization}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((st) => (
          <div key={st.label} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className={`bg-gradient-to-br ${st.color} p-4 flex items-center gap-3`}>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <i className={`bi ${st.icon} text-white`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{st.value}</p>
                <p className="text-xs text-white/70">{st.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <i className="bi bi-calendar3 text-amber-600" />
            <h2 className="font-semibold text-gray-800">My Weekly Schedule</h2>
          </div>
          <div className="p-5">
            {data.schedules.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No schedule set. Ask the admin to assign one.</p>
            ) : (
              <div className="space-y-2">
                {data.schedules.map((s) => (
                  <div key={s.day_of_week + s.shift_type} className="flex items-center justify-between px-4 py-2.5 bg-amber-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">{s.day_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold capitalize">{s.shift_type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <i className="bi bi-person-lines-fill text-violet-600" />
            <h2 className="font-semibold text-gray-800">My Profile</h2>
          </div>
          <div className="p-5 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Rate</span><span className="font-medium text-gray-800">₱{c.hourly_rate.toLocaleString()}/hr</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Contact</span><span className="font-medium text-gray-800">{c.mobile_contact}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Schedule</span><span className="font-medium text-gray-800">{c.shift_schedule || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Upcoming bookings</span><span className="font-medium text-gray-800">{s.upcoming_bookings}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}