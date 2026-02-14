import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

const nav = [
  { path: '/', label: 'Dashboard' },
  { path: '/characters', label: 'Characters' },
  { path: '/franchises', label: 'Franchises' },
  { path: '/critics', label: 'Critics' },
  { path: '/evaluations', label: 'Evaluations' },
  { path: '/compare', label: 'Compare' },
  { path: '/reviews', label: 'Review Queue', badge: true },
  { path: '/test-suites', label: 'Test Suites' },
  { path: '/certifications', label: 'Certifications' },
  { path: '/taxonomy', label: 'Taxonomy' },
  { path: '/exemplars', label: 'Exemplars' },
  { path: '/red-team', label: 'Red Team' },
  { path: '/ab-testing', label: 'A/B Testing' },
  { path: '/drift', label: 'Drift Monitor' },
  { path: '/improvement', label: 'Improvement' },
  { path: '/apm', label: 'APM' },
  { path: '/judges', label: 'Judge Registry' },
  { path: '/multimodal', label: 'Multi-Modal' },
  { path: '/consent', label: 'Consent' },
  { path: '/settings', label: 'Settings' },
  { path: '/manual', label: 'User Manual' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const fetchPending = () => {
      api.get('/reviews/stats').then((r) => {
        setPendingCount(r.data.pending || 0)
      }).catch(() => {})
    }
    fetchPending()
    const interval = setInterval(fetchPending, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar — fixed to viewport */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col flex-shrink-0 h-screen">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold">CanonSafe V2</h1>
          <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {nav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-800 ${
                location.pathname === item.path ? 'bg-gray-800 text-white' : 'text-gray-300'
              }`}
            >
              <span>{item.label}</span>
              {item.badge && pendingCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {pendingCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button onClick={logout} className="text-sm text-gray-400 hover:text-white">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content — scrolls independently */}
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
