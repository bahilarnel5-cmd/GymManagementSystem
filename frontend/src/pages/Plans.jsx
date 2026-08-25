import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'

export default function Plans() {
  const queryClient = useQueryClient()
  const orgId = useAuthStore((s) => s.orgId) || '11111111-1111-1111-1111-111111111111'
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', price: '', billing_cycle: 'monthly', features: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/gym_membership_plans/?per_page=50').then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (p) => api.post('/gym_membership_plans/', { ...p, organization_id: orgId, price: parseFloat(p.price) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['plans'] }); setShowForm(false); setForm({ name: '', price: '', billing_cycle: 'monthly', features: '' }) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/gym_membership_plans/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  })

  const handleSubmit = (e) => { e.preventDefault(); createMutation.mutate(form) }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Membership Plans</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-gym-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gym-700">
          {showForm ? 'Cancel' : '+ Add Plan'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input placeholder="Plan Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
          <input placeholder="Price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
          <select value={form.billing_cycle} onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })} className="px-3 py-2 border rounded-lg text-sm">
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annually">Annually</option>
          </select>
          <input placeholder="Features (comma-separated)" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
          <div className="md:col-span-2">
            <button type="submit" disabled={createMutation.isPending} className="bg-gym-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gym-700 disabled:opacity-50">
              {createMutation.isPending ? 'Saving...' : 'Save Plan'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <p className="text-gray-400 col-span-3 text-center py-8">Loading...</p>
        ) : data?.items?.map((p) => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm p-6 border-t-4 border-gym-500">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{p.name}</h3>
                <p className="text-2xl font-bold text-gym-600 mt-1">₱{p.price.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">per {p.billing_cycle}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {p.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {p.features && (
              <div className="mb-4">
                {p.features.split(',').map((f, i) => (
                  <span key={i} className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded mr-1 mb-1">{f.trim()}</span>
                ))}
              </div>
            )}
            <button onClick={() => deleteMutation.mutate(p.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
          </div>
        ))}
      </div>
    </div>
  )
}
