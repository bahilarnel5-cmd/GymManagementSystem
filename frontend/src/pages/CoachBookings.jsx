import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export default function CoachBookings() {
  const { data, isLoading } = useQuery({
    queryKey: ['coach-bookings'],
    queryFn: () => api.get('/coach_portal/bookings').then((r) => r.data),
  })

  const bookings = data?.items || []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Sessions</h1>
        <p className="text-sm text-gray-500 mt-1">Booked training sessions with your students</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Day</th>
                <th className="text-left px-4 py-3 font-medium">Time</th>
                <th className="text-left px-4 py-3 font-medium">Student</th>
                <th className="text-left px-4 py-3 font-medium">Shift</th>
                <th className="text-left px-4 py-3 font-medium">Starts</th>
                <th className="text-left px-4 py-3 font-medium">Weeks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No booked sessions yet.</td></tr>
              ) : bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{b.day_name}</td>
                  <td className="px-4 py-3 text-gray-600">{b.start_hour}:00 – {b.end_hour}:00</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{b.member_name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 capitalize">{b.shift_type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.start_date}</td>
                  <td className="px-4 py-3 text-gray-600">{b.weeks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}