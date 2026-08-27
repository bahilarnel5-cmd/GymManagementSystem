import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const orgId = useAuthStore((s) => s.orgId) || '11111111-1111-1111-1111-111111111111'

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get(`/dashboard/stats?organization_id=${orgId}`).then((r) => r.data),
  })

  const { data: recentPayments } = useQuery({
    queryKey: ['recent-payments'],
    queryFn: () => api.get(`/dashboard/recent-payments?organization_id=${orgId}&limit=5`).then((r) => r.data),
  })

  const { data: expiring } = useQuery({
    queryKey: ['expiring-memberships'],
    queryFn: () => api.get(`/dashboard/expiring-memberships?organization_id=${orgId}&days=7`).then((r) => r.data),
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Members" value={stats?.total_members ?? '—'} icon="👥" color="bg-blue-50" />
        <StatCard label="Active Memberships" value={stats?.active_memberships ?? '—'} icon="💳" color="bg-green-50" />
        <StatCard label="Today's Check-ins" value={stats?.today_checkins ?? '—'} icon="✅" color="bg-purple-50" />
        <StatCard label="Total Revenue" value={`₱${(stats?.total_revenue ?? 0).toLocaleString()}`} icon="💰" color="bg-amber-50" />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Financial Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">₱1,357,500.00</p>
            <p className="text-xs text-gray-500 mt-1">Cash Available</p>
            <p className="text-[10px] text-gray-400">All accounts</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">₱175,300.00</p>
            <p className="text-xs text-gray-500 mt-1">Cash In (MTD)</p>
            <p className="text-[10px] text-gray-400">Received this month</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">₱338,500.00</p>
            <p className="text-xs text-gray-500 mt-1">Cash Out (MTD)</p>
            <p className="text-[10px] text-gray-400">Paid this month</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">₱491,000.00</p>
            <p className="text-xs text-gray-500 mt-1">Total Receivables</p>
            <p className="text-[10px] text-gray-400">Open, from Invoicing</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <p className="text-2xl font-bold text-amber-600">₱133,500.00</p>
            <p className="text-xs text-gray-500 mt-1">Total Payables</p>
            <p className="text-[10px] text-gray-400">Open, from Payables</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">₱1,715,000.00</p>
            <p className="text-xs text-gray-500 mt-1">Net Position</p>
            <p className="text-[10px] text-gray-400">Cash + Recv − Pay</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Payments</h2>
          <div className="space-y-3">
            {recentPayments?.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-gray-800">{p.member_name}</p>
                  <p className="text-xs text-gray-500">{p.receipt_no}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gym-600">₱{p.amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{p.payment_method}</p>
                </div>
              </div>
            ))}
            {(!recentPayments || recentPayments.length === 0) && (
              <p className="text-gray-400 text-sm">No recent payments</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Expiring Soon (7 days)</h2>
          <div className="space-y-3">
            {expiring?.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-gray-800">{e.member_name}</p>
                  <p className="text-xs text-gray-500">{e.plan_name}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${e.days_left <= 3 ? 'text-red-600' : 'text-amber-600'}`}>
                    {e.days_left} day{e.days_left !== 1 ? 's' : ''} left
                  </p>
                  <p className="text-xs text-gray-500">{e.end_date}</p>
                </div>
              </div>
            ))}
            {(!expiring || expiring.length === 0) && (
              <p className="text-gray-400 text-sm">No memberships expiring soon</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <p className="text-3xl font-bold text-gym-600">{stats?.total_coaches ?? '—'}</p>
          <p className="text-sm text-gray-500 mt-1">Coaches</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <p className="text-3xl font-bold text-amber-600">{stats?.expiring_soon ?? '—'}</p>
          <p className="text-sm text-gray-500 mt-1">Expiring in 7 days</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <p className="text-3xl font-bold text-purple-600">{stats?.pending_renewals ?? '—'}</p>
          <p className="text-sm text-gray-500 mt-1">Pending Renewals</p>
        </div>
      </div>
    </div>
  )
}
