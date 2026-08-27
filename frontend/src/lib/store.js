import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  role: localStorage.getItem('role') || null,
  orgId: localStorage.getItem('orgId') || null,
  memberId: localStorage.getItem('memberId') || null,

  login: (token, role, orgId, memberId) => {
    localStorage.setItem('token', token)
    localStorage.setItem('role', role)
    if (orgId) localStorage.setItem('orgId', orgId)
    if (memberId) localStorage.setItem('memberId', memberId)
    set({ token, role, orgId, memberId })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('orgId')
    localStorage.removeItem('memberId')
    set({ token: null, role: null, orgId: null, memberId: null })
  },

  isAuthenticated: () => !!localStorage.getItem('token'),
}))
