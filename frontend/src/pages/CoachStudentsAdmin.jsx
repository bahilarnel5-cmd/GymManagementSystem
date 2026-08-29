import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export default function CoachStudents() {
  const [expandedCoach, setExpandedCoach] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['coach-students-summary'],
    queryFn: () => api.get('/gym_coaches/students-summary').then((r) => r.data),
  })

  const coaches = data?.items || []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Coach &amp; Students</h1>
        <p className="text-sm text-gray-500 mt-1">Students assigned per coach and who has paid</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600"><i className="bi bi-person-badge" /></div>
          <div><p className="text-2xl font-bold text-gray-800">{data?.total_coaches ?? 0}</p><p className="text-xs text-gray-500">Coaches</p></div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600"><i className="bi bi-people" /></div>
          <div><p className="text-2xl font-bold text-gray-800">{data?.total_assigned_students ?? 0}</p><p className="text-xs text-gray-500">Assigned Students</p></div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600"><i className="bi bi-person-dash" /></div>
          <div><p className="text-2xl font-bold text-gray-800">{data?.unassigned_students ?? 0}</p><p className="text-xs text-gray-500">Unassigned</p></div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gym-600" /></div>
      ) : coaches.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <i className="bi bi-diagram-3 text-4xl text-gray-300 mb-3 block" />
          <p className="text-gray-400">No coaches yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {coaches.map((c) => (
            <div key={c.coach_id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedCoach(expandedCoach === c.coach_id ? null : c.coach_id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 font-bold">
                    {c.coach_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">{c.coach_name}</p>
                    <p className="text-xs text-gray-400">{c.specialization}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500">{c.student_count} students</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">{c.paid_count} paid</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">{c.unpaid_count} unpaid</span>
                  </div>
                  <i className={`bi ${expandedCoach === c.coach_id ? 'bi-chevron-up' : 'bi-chevron-down'} text-gray-400`} />
                </div>
              </button>

              {expandedCoach === c.coach_id && (
                <div className="border-t border-gray-100 overflow-x-auto">
                  {c.students.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-gray-400 text-center">No students assigned to this coach.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="text-left px-5 py-2.5 font-medium">Student</th>
                          <th className="text-left px-5 py-2.5 font-medium">Code</th>
                          <th className="text-left px-5 py-2.5 font-medium">Plan</th>
                          <th className="text-left px-5 py-2.5 font-medium">Coach paid</th>
                          <th className="text-left px-5 py-2.5 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {c.students.map((s) => (
                          <tr key={s.member_id} className="hover:bg-gray-50">
                            <td className="px-5 py-3 font-medium text-gray-800">{s.full_name}</td>
                            <td className="px-5 py-3 font-mono text-xs text-gray-500">{s.member_code}</td>
                            <td className="px-5 py-3 text-gray-600">{s.membership_plan || '—'}</td>
                            <td className="px-5 py-3 text-gray-600">₱{s.coach_total.toLocaleString()}</td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {s.paid ? 'Paid' : 'Unpaid'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}