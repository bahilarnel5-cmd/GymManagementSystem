import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../lib/store'
import api from '../lib/api'

const features = [
  {
    icon: 'bi-people',
    title: 'Member management',
    desc: 'Track profiles, plans, and status in one place.',
  },
  {
    icon: 'bi-calendar-check',
    title: 'Bookings & check-ins',
    desc: 'Real-time attendance and PT session scheduling.',
  },
  {
    icon: 'bi-cash-coin',
    title: 'Payments & renewals',
    desc: 'Automated billing cycles and renewal reminders.',
  },
]

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
      login(data.access_token, data.role)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left — navy marketing panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#0A1F44] text-white flex-col justify-between overflow-hidden">
        {/* decorative glow */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#15325E]/60 blur-3xl" />

        <div className="relative z-10 px-12 pt-12">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <i className="bi bi-lightning-charge-fill text-white text-sm" />
            </div>
            <span className="text-lg font-semibold">GymManager</span>
          </div>
        </div>

        <div className="relative z-10 px-12 max-w-lg">
          <p className="text-xs font-bold tracking-wide text-blue-300 uppercase mb-4">
            Fitness Operations Platform
          </p>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Run your gym without the spreadsheets.
          </h1>
          <p className="text-slate-300 text-[15px] leading-relaxed mb-10">
            Members, coaches, memberships, payments, and check-ins —
            all in one dashboard built for daily front-desk operations.
          </p>

          <div className="space-y-5">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-white/10 flex items-center justify-center">
                  <i className={`bi ${f.icon} text-blue-300 text-base`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-sm text-slate-400">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 px-12 pb-10">
          <div className="h-px bg-white/10 mb-6" />
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} GymManager. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right — login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-[#F9FAFB]">
        <div className="w-full max-w-sm">
          {/* mobile-only brand, since the navy panel is hidden below lg */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="h-9 w-9 rounded-lg bg-[#0A1F44] flex items-center justify-center">
              <i className="bi bi-lightning-charge-fill text-white text-sm" />
            </div>
            <span className="text-lg font-semibold text-gray-900">GymManager</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900">Welcome back</h2>
            <p className="text-sm text-gray-500 mt-1.5">
              Sign in to access your dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-3 rounded-lg text-sm border border-rose-100">
                <i className="bi bi-exclamation-circle" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
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
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
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

          <p className="text-center text-xs text-gray-400 mt-8">
            Protected access · Authorized personnel only
          </p>
        </div>
      </div>
    </div>
  )
}
