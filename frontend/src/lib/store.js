import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  role: localStorage.getItem('role') || null,
  orgId: localStorage.getItem('orgId') || null,

  login: (token, role, orgId) => {
    localStorage.setItem('token', token)
    localStorage.setItem('role', role)
    if (orgId) localStorage.setItem('orgId', orgId)
    set({ token, role, orgId })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('orgId')
    set({ token: null, role: null, orgId: null })
  },

  isAuthenticated: () => !!localStorage.getItem('token'),
}))
