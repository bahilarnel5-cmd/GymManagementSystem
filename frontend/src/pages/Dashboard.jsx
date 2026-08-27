import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'
import { Wallet, ArrowDownToLine, ArrowUpFromLine, CornerLeftDown, CornerRightUp, LineChart } from 'lucide-react'

const SUMMARY_CARDS = [
  { icon: Wallet, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', amount: '₱1,357,500.00', label: 'Cash Available', sublabel: 'All accounts' },
  { icon: ArrowDownToLine, iconBg: 'bg-sky-100', iconColor: 'text-sky-600', amount: '₱175,300.00', label: 'Cash In (MTD)', sublabel: 'Received this month' },
  { icon: ArrowUpFromLine, iconBg: 'bg-rose-100', iconColor: 'text-rose-500', amount: '₱338,500.00', label: 'Cash Out (MTD)', sublabel: 'Paid this month' },
  { icon: CornerLeftDown, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-500', amount: '₱491,000.00', label: 'Total Receivables', sublabel: 'Open, from Invoicing' },
  { icon: CornerRightUp, iconBg: 'bg-amber-100', iconColor: 'text-amber-500', amount: '₱133,500.00', label: 'Total Payables', sublabel: 'Open, from Payables' },
  { icon: LineChart, iconBg: 'bg-violet-100', iconColor: 'text-violet-500', amount: '₱1,715,000.00', label: 'Net Position', sublabel: 'Cash + Recv − Pay' },
]

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

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Financial Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {SUMMARY_CARDS.map(({ icon: Icon, iconBg, iconColor, amount, label, sublabel }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
                <Icon className={`w-4 h-4 ${iconColor}`} strokeWidth={2.25} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xl font-bold text-slate-900 tracking-tight">{amount}</span>
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <span className="text-xs text-slate-400">{sublabel}</span>
              </div>
            </div>
          ))}
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
