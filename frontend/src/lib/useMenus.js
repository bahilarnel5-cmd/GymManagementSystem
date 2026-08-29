import { useQuery } from '@tanstack/react-query'
import api from './api'

export function useMenus() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-menus'],
    queryFn: () => api.get('/gym_menus/me').then((r) => r.data),
  })
  return { menus: data?.menus || [], isLoading }
}
