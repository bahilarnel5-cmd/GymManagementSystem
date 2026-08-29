import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

const actionStyles = {
  login: 'bg-blue-100 text-blue-700',
  create: 'bg-green-100 text-green-700',
  update: 'bg-amber-100 text-amber-700',
  delete: 'bg-red-100 text-red-700',
  void: 'bg-red-100 text-red-700',
}

export default function ActivityLogs() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs', page, search],
    queryFn: () => api.get(`/activity_logs/?page=${page}&per_page=15&search=${search}`).then((r) => r.data),
  })

  const rows = data?.items || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Activity Logs</h1>
          <p className="text-sm text-gray-500 mt-1">History of system actions and user activity</p>
        </div>
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors"
        >
          <i className={`bi ${drawerOpen ? 'bi-x-lg' : 'bi-sliders'} text-xs`} />
          {drawerOpen ? 'Hide Filters' : 'Filters'}
        </button>
      </div>

      <div className="mb-4">
        <input
          placeholder="Search by actor or description..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full sm:w-96 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
        />
      </div>

      {drawerOpen && <ActivityFilters search={search} setSearch={setSearch} setPage={setPage} />}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Time</th>
                <th className="text-left px-4 py-3 font-medium">Actor</th>
                <th className="text-left px-4 py-3 font-medium">Action</th>
                <th className="text-left px-4 py-3 font-medium">Entity</th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No activity logged yet.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{r.actor_name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">{r.actor_role}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionStyles[r.action] || 'bg-gray-100 text-gray-600'} capitalize`}>{r.action}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{r.entity_type}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-md truncate">{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 mt-4 bg-white rounded-xl shadow-sm">
          <span className="text-sm text-gray-500">Page {data.page} of {data.pages} ({data.total} total)</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Prev</button>
            <button onClick={() => setPage(Math.min(data.pages, page + 1))} disabled={page === data.pages} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ActivityFilters({ search, setSearch, setPage }) {
  const { data: actions } = useQuery({
    queryKey: ['activity-actions'],
    queryFn: () => api.get('/activity_logs/actions').then((r) => r.data),
  })
  return (
    <div className="mb-4 bg-white rounded-2xl shadow-sm border border-orange-100 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Quick actions</p>
      <div className="flex flex-wrap gap-2">
        {['login', 'create', 'update', 'delete', 'void'].map((a) => (
          <button
            key={a}
            onClick={() => { setSearch(a); setPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${search === a ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}
          >
            {a}
          </button>
        ))}
        <button onClick={() => { setSearch(''); setPage(1) }} className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">Clear all</button>
      </div>
      {actions && actions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">By category</p>
          <div className="flex flex-wrap gap-2">
            {actions.slice(0, 20).map((a) => (
              <button
                key={a.action + a.entity_type}
                onClick={() => { setSearch(a.action); setPage(1) }}
                className="px-3 py-1.5 rounded-full text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors capitalize"
              >
                {a.action} · {a.entity_type}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}