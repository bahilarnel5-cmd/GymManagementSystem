import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SHIFT_OPTIONS = ['morning', 'evening']

export default function CoachSchedules() {
  const queryClient = useQueryClient()
  const [selectedCoach, setSelectedCoach] = useState(null)
  const [selectedDay, setSelectedDay] = useState(0)
  const [selectedShift, setSelectedShift] = useState('morning')

  const { data: coachesData } = useQuery({
    queryKey: ['coaches-all'],
    queryFn: () => api.get('/gym_coaches/?per_page=50').then((r) => r.data),
  })

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['coach-schedules', selectedCoach?.id],
    queryFn: () => api.get(`/coach_schedules/?coach_id=${selectedCoach?.id || ''}`).then((r) => r.data),
    enabled: true,
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/coach_schedules/', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coach-schedules'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/coach_schedules/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coach-schedules'] }),
  })

  const toggleSchedule = (coachId, day, shift) => {
    const existing = schedules?.find(
      (s) => s.coach_id === coachId && s.day_of_week === day && s.shift_type === shift
    )
    if (existing) {
      deleteMutation.mutate(existing.id)
    } else {
      createMutation.mutate({
        organization_id: '11111111-1111-1111-1111-111111111111',
        coach_id: coachId,
        day_of_week: day,
        shift_type: shift,
        is_active: true,
      })
    }
  }

  const coaches = coachesData?.items || []
  const filteredSchedules = selectedCoach
    ? schedules?.filter((s) => s.coach_id === selectedCoach.id) || []
    : schedules || []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Coach Schedules</h1>
        <p className="text-sm text-gray-500 mt-1">Set which coaches are available on which days and shifts</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Select Coach</label>
            <select
              value={selectedCoach?.id || ''}
              onChange={(e) => {
                const c = coaches.find((c) => c.id === e.target.value)
                setSelectedCoach(c || null)
              }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
            >
              <option value="">All Coaches</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name} — {c.specialization}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Day</th>
                {SHIFT_OPTIONS.map((s) => (
                  <th key={s} className="text-center px-5 py-3 font-medium text-gray-600 capitalize">
                    <i className={`bi ${s === 'morning' ? 'bi-sunrise' : 'bi-moon'} mr-1`} />
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={3} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : DAY_NAMES.map((day, dayIdx) => (
                <tr key={dayIdx} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-800">{day}</td>
                  {SHIFT_OPTIONS.map((shift) => {
                    const exists = filteredSchedules.some(
                      (s) => s.day_of_week === dayIdx && s.shift_type === shift
                    )
                    return (
                      <td key={shift} className="px-5 py-3 text-center">
                        <button
                          onClick={() => {
                            const coachId = selectedCoach?.id || coaches[0]?.id
                            if (coachId) toggleSchedule(coachId, dayIdx, shift)
                          }}
                          disabled={!selectedCoach && coaches.length === 0}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                            exists
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-red-50 hover:text-red-600'
                              : 'bg-gray-100 text-gray-400 hover:bg-cyan-50 hover:text-cyan-600'
                          }`}
                        >
                          {exists ? (
                            <><i className="bi bi-check-circle-fill mr-1" />Active</>
                          ) : (
                            <><i className="bi bi-plus-circle mr-1" />Set</>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCoach && (
        <div className="mt-6 bg-white rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">
            Active Schedules for <span className="text-cyan-600">{selectedCoach.full_name}</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {filteredSchedules.length === 0 ? (
              <p className="text-gray-400 text-sm">No schedules set for this coach</p>
            ) : (
              filteredSchedules.map((s) => (
                <div key={s.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-sm font-medium text-gray-700">{DAY_NAMES[s.day_of_week]}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    s.shift_type === 'morning' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {s.shift_type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
