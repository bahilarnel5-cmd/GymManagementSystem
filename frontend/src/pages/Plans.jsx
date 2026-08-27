import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export default function Plans() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/gym_membership_plans/?per_page=50').then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/gym_membership_plans/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Membership Plans</h1>
      </div>

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
