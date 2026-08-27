import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatHour(h) {
  if (h === 0 || h === 24) return '12 AM'
  if (h === 12) return '12 NN'
  if (h < 12) return `${h} AM`
  return `${h - 12} PM`
}

function getWeekDates(baseDate) {
  const d = new Date(baseDate)
  const day = d.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + mondayOffset)
  const dates = []
  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday)
    dt.setDate(monday.getDate() + i)
    dates.push(dt)
  }
  return dates
}

function toLocalDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export default function MemberCoaches() {
  const queryClient = useQueryClient()
  const [selectedCoach, setSelectedCoach] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [shiftFilter, setShiftFilter] = useState('')
  const [bookingModal, setBookingModal] = useState(false)
  const [bookingForm, setBookingForm] = useState({ start_hour: '', weeks: 1 })
  const [search, setSearch] = useState('')

  const weekDates = getWeekDates(toLocalDateStr(selectedDate))
  const todayStr = toLocalDateStr(new Date())

  const { data: coachesData, isLoading } = useQuery({
    queryKey: ['member-coaches', search],
    queryFn: () => api.get(`/member/coaches?search=${search}&per_page=50`).then((r) => r.data),
  })

  const { data: slotsData } = useQuery({
    queryKey: ['coach-slots', selectedCoach?.id, toLocalDateStr(selectedDate)],
    queryFn: () => api.get(`/member/coaches/${selectedCoach.id}/slots?date=${toLocalDateStr(selectedDate)}`).then((r) => r.data),
    enabled: !!selectedCoach,
  })

  const bookMutation = useMutation({
    mutationFn: (form) => {
      const [sh, eh] = form.start_hour.split('-').map(Number)
      return api.post('/member/bookings', {
        organization_id: '11111111-1111-1111-1111-111111111111',
        coach_id: selectedCoach.id,
        member_id: localStorage.getItem('memberId'),
        day_of_week: selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1,
        start_hour: sh,
        end_hour: eh,
        shift_type: slotsData?.shift || 'morning',
        start_date: toLocalDateStr(selectedDate),
        weeks: form.weeks,
      })
    },
    onSuccess: () => {
      setBookingModal(false)
      setBookingForm({ start_hour: '', weeks: 1 })
      queryClient.invalidateQueries({ queryKey: ['coach-slots'] })
      queryClient.invalidateQueries({ queryKey: ['member-dashboard'] })
    },
  })

  const morningSlots = slotsData?.slots?.filter(s => s.start_hour < 12) || []
  const eveningSlots = slotsData?.slots?.filter(s => s.start_hour >= 12) || []
  const displaySlots = shiftFilter === 'evening' ? eveningSlots : morningSlots

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Coaches</h1>
        <p className="text-sm text-gray-500 mt-1">Browse coaches and book your training slots</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            placeholder="Search coaches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-white shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coach list */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Available Coaches</h2>
          {isLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600" /></div>
          ) : (
            coachesData?.items?.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedCoach(c); setSelectedDate(new Date()) }}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
                  selectedCoach?.id === c.id
                    ? 'border-violet-400 bg-violet-50 shadow-md'
                    : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                    selectedCoach?.id === c.id ? 'bg-violet-500' : 'bg-gray-400'
                  }`}>
                    {c.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{c.full_name}</p>
                    <p className="text-xs text-gray-400">{c.specialization}</p>
                  </div>
                </div>
                {Object.keys(c.weekly_schedule || {}).length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {Object.entries(c.weekly_schedule).map(([day, shifts]) => (
                      <span key={day} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-500">
                        {day.slice(0, 3)}: {shifts.join(', ')}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Calendar + Slots */}
        <div className="lg:col-span-2">
          {selectedCoach ? (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{selectedCoach.full_name}</h2>
                  <p className="text-sm text-gray-400">{selectedCoach.specialization}</p>
                </div>
              </div>

              {/* Week navigation */}
              <div className="flex items-center gap-2 mb-5">
                <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 7); setSelectedDate(d) }} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                  <i className="bi bi-chevron-left text-xs" />
                </button>
                <div className="flex-1 grid grid-cols-7 gap-1">
                  {weekDates.map((d) => {
                    const ds = toLocalDateStr(d)
                    const isSelected = ds === toLocalDateStr(selectedDate)
                    const isToday = ds === todayStr
                    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
                    return (
                      <button
                        key={ds}
                        onClick={() => setSelectedDate(d)}
                        className={`flex flex-col items-center py-2 rounded-xl text-xs transition-all ${
                          isSelected
                            ? 'bg-violet-500 text-white shadow-md'
                            : isToday
                              ? 'bg-violet-50 text-violet-700'
                              : 'hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <span className="text-[10px] font-medium">{DAY_SHORT[dow]}</span>
                        <span className="text-sm font-bold mt-0.5">{d.getDate()}</span>
                      </button>
                    )
                  })}
                </div>
                <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 7); setSelectedDate(d) }} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                  <i className="bi bi-chevron-right text-xs" />
                </button>
              </div>

              {/* Shift toggle */}
              {slotsData?.shift && (
                <div className="flex gap-2 mb-5">
                  <button
                    onClick={() => setShiftFilter('')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      shiftFilter === '' ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All Slots
                  </button>
                  <button
                    onClick={() => setShiftFilter('morning')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      shiftFilter === 'morning' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <i className="bi bi-sunrise mr-1" />Morning (7AM–3PM)
                  </button>
                  <button
                    onClick={() => setShiftFilter('evening')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      shiftFilter === 'evening' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <i className="bi bi-moon mr-1" />Evening (3PM–9PM)
                  </button>
                </div>
              )}

              {/* Slots */}
              {!slotsData?.shift ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                  <i className="bi bi-calendar-x text-3xl text-gray-300 mb-2 block" />
                  <p className="text-gray-400 text-sm">No schedule available for this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shiftFilter === '' ? (
                    <>
                      {morningSlots.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <i className="bi bi-sunrise" /> Morning Slots
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {morningSlots.map((s) => (
                              <SlotButton key={s.start_hour} slot={s} onBook={() => { setBookingForm({ start_hour: `${s.start_hour}-${s.end_hour}`, weeks: 1 }); setBookingModal(true) }} />
                            ))}
                          </div>
                        </div>
                      )}
                      {eveningSlots.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <i className="bi bi-moon" /> Evening Slots
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {eveningSlots.map((s) => (
                              <SlotButton key={s.start_hour} slot={s} onBook={() => { setBookingForm({ start_hour: `${s.start_hour}-${s.end_hour}`, weeks: 1 }); setBookingModal(true) }} />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {displaySlots.map((s) => (
                        <SlotButton key={s.start_hour} slot={s} onBook={() => { setBookingForm({ start_hour: `${s.start_hour}-${s.end_hour}`, weeks: 1 }); setBookingModal(true) }} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <i className="bi bi-person-badge text-4xl text-gray-300 mb-3 block" />
              <p className="text-gray-400">Select a coach to view availability</p>
            </div>
          )}
        </div>
      </div>

      {bookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Book Slot</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedCoach?.full_name} · {DAY_NAMES[selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1]} · {toLocalDateStr(selectedDate)}
                </p>
              </div>
              <button onClick={() => setBookingModal(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600">
                <i className="bi bi-x-lg text-sm" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); bookMutation.mutate(bookingForm) }} className="space-y-4">
              <div className="bg-violet-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600">Selected Time Slot</p>
                <p className="text-lg font-bold text-violet-700">
                  {(() => { const [sh, eh] = bookingForm.start_hour.split('-').map(Number); return `${formatHour(sh)} – ${formatHour(eh)}` })()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Duration (weeks)</label>
                <select
                  value={bookingForm.weeks}
                  onChange={(e) => setBookingForm({ ...bookingForm, weeks: parseInt(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                >
                  {[1, 2, 3, 4, 6, 8, 12].map((w) => (
                    <option key={w} value={w}>{w} week{w > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
                <p>You will be booked for <strong>every {DAY_NAMES[selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1]}</strong> for {bookingForm.weeks} week{bookingForm.weeks > 1 ? 's' : ''}.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={bookMutation.isPending} className="bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {bookMutation.isPending ? 'Booking...' : 'Confirm Booking'}
                </button>
                <button type="button" onClick={() => setBookingModal(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
              {bookMutation.isError && <p className="text-sm text-red-500">{bookMutation.error?.response?.data?.detail || 'Booking failed'}</p>}
              {bookMutation.isSuccess && <p className="text-sm text-emerald-600">Booking confirmed!</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function SlotButton({ slot, onBook }) {
  const bg = slot.available
    ? slot.booked_by_me
      ? 'bg-violet-100 border-violet-300 hover:bg-violet-200'
      : 'bg-white border-gray-200 hover:border-violet-300 hover:bg-violet-50'
    : 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'

  return (
    <button
      onClick={() => slot.available && !slot.booked_by_me && onBook()}
      disabled={!slot.available || slot.booked_by_me}
      className={`p-3 rounded-xl border-2 text-left transition-all ${bg}`}
    >
      <p className="text-sm font-bold text-gray-800">
        {formatHour(slot.start_hour)} – {formatHour(slot.end_hour)}
      </p>
      <p className="text-[10px] mt-0.5">
        {slot.booked_by_me ? (
          <span className="text-violet-600 font-semibold">Your booking</span>
        ) : slot.available ? (
          <span className="text-emerald-600 font-medium">Available</span>
        ) : (
          <span className="text-gray-400">Booked</span>
        )}
      </p>
    </button>
  )
}
