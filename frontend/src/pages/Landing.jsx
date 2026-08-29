import { Link } from 'react-router-dom'

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
  {
    icon: 'bi-person-badge',
    title: 'Coach scheduling',
    desc: 'Assign trainers and manage session workloads.',
  },
  {
    icon: 'bi-graph-up',
    title: 'Reports & insights',
    desc: 'See revenue, attendance and renewals at a glance.',
  },
  {
    icon: 'bi-gear',
    title: 'Configurable settings',
    desc: 'Business rules, reminders and check-in policy.',
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-20 bg-[#0A1F44] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <i className="bi bi-lightning-charge-fill text-white text-sm" />
            </div>
            <span className="text-white font-semibold">GymManager</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </nav>

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Log In
            <i className="bi bi-arrow-right text-xs" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0A1F44] text-white">
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#15325E]/60 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-bold tracking-wide text-blue-300 uppercase mb-4">
              Fitness Operations Platform
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5">
              Run your gym without the spreadsheets.
            </h1>
            <p className="text-slate-300 text-base md:text-lg max-w-xl mb-8">
              Members, coaches, memberships, payments, and check-ins —
              all in one dashboard built for daily front-desk operations.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Log In to Dashboard
                <i className="bi bi-arrow-right" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors border border-white/10"
              >
                See features
              </a>
            </div>
          </div>

          {/* Attractive gym image */}
          <div className="relative hidden md:block">
            <div className="absolute -inset-3 bg-blue-500/20 blur-2xl rounded-3xl" />
            <img
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1000&q=80"
              alt="Modern gym facility with treadmills and weight equipment"
              className="relative w-full h-96 object-cover rounded-3xl shadow-2xl border border-white/10"
            />
            <div className="absolute -bottom-5 -left-5 bg-white text-gray-900 rounded-2xl shadow-xl px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <i className="bi bi-lightning-charge-fill text-white" />
              </div>
              <div>
                <p className="text-xl font-extrabold">500+</p>
                <p className="text-[11px] text-gray-500 -mt-0.5">Happy gym members</p>
              </div>
            </div>
            <div className="absolute -top-4 -right-3 bg-emerald-500 text-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2">
              <i className="bi bi-graph-up-arrow" />
              <div>
                <p className="text-sm font-bold leading-none">24/7</p>
                <p className="text-[10px] opacity-90 mt-0.5">Open access</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-xl mx-auto mb-14">
          <p className="text-xs font-bold tracking-wide text-blue-600 uppercase mb-3">Features</p>
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
            Everything the front desk needs
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-10 w-10 rounded-lg bg-[#0A1F44]/5 flex items-center justify-center mb-4">
                <i className={`bi ${f.icon} text-[#0A1F44] text-base`} />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-[#F3F4F6] border-y border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-bold tracking-wide text-blue-600 uppercase mb-3">
              How it works
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
              Set up once, run every day
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Add your members & plans', desc: 'Import or enter members, coaches, and membership plans.' },
              { step: '02', title: 'Front desk checks people in', desc: 'Staff log check-ins, sessions, and payments as they happen.' },
              { step: '03', title: 'Track it from the dashboard', desc: 'See renewals due, revenue, and attendance at a glance.' },
            ].map((s) => (
              <div key={s.step}>
                <span className="text-3xl font-bold text-[#0A1F44]/15">{s.step}</span>
                <h3 className="text-sm font-semibold text-gray-900 mt-2 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-3">
          Ready to get started?
        </h2>
        <p className="text-sm text-gray-500 mb-8">
          Sign in with your staff account to access the dashboard.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 bg-[#0A1F44] hover:bg-[#15325E] text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Log In
          <i className="bi bi-arrow-right" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-[#0A1F44] flex items-center justify-center">
              <i className="bi bi-lightning-charge-fill text-white text-[10px]" />
            </div>
            <span className="text-sm font-medium text-gray-700">GymManager</span>
          </div>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} GymManager. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
