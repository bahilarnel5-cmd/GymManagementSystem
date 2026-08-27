import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../lib/store'
import api from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      login(data.access_token, data.role, null, data.member_id)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2.5 justify-center mb-8">
          <div className="h-9 w-9 rounded-lg bg-[#0A1F44] flex items-center justify-center">
            <i className="bi bi-lightning-charge-fill text-white text-sm" />
          </div>
          <span className="text-lg font-semibold text-gray-900">GymManager</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Welcome back</h2>
            <p className="text-sm text-gray-500 mt-1">Sign in to access your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-3 rounded-lg text-sm border border-rose-100">
                <i className="bi bi-exclamation-circle" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <i className="bi bi-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <i className="bi bi-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-sm`} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0A1F44] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#15325E] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <i className="bi bi-arrow-repeat animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <i className="bi bi-arrow-right" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Protected access · Authorized personnel only
        </p>
      </div>
    </div>
  )
}
