import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export default function CoachStudents() {
  const { data, isLoading } = useQuery({
    queryKey: ['coach-students'],
    queryFn: () => api.get('/coach_portal/students').then((r) => r.data),
  })

  const records = data?.items || []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Students</h1>
        <p className="text-sm text-gray-500 mt-1">{data?.coach} — {records.length} assigned students</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Student</th>
                <th className="text-left px-4 py-3 font-medium">Code</th>
                <th className="text-left px-4 py-3 font-medium">Plan</th>
                <th className="text-left px-4 py-3 font-medium">Membership</th>
                <th className="text-left px-4 py-3 font-medium">Coach Paid</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No students assigned to you yet.</td></tr>
              ) : records.map((r) => (
                <tr key={r.member_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs">
                        {r.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span className="font-medium text-gray-800">{r.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.member_code}</td>
                  <td className="px-4 py-3 text-gray-600">{r.membership_plan || '—'}</td>
                  <td className="px-4 py-3">
                    {r.membership_plan ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.membership_paid ? 'bg-green-100 text-green-700' : (r.membership_status === 'active' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}`}>
                        {r.membership_paid ? 'Paid' : r.membership_status || '—'}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">₱{r.coach_total.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {r.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}