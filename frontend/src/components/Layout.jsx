import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

const navGroups = [
  {
    label: null, // no group header
    items: [{ path: '/', label: 'Dashboard' }],
  },
  {
    label: 'Characters',
    items: [
      { path: '/characters', label: 'Characters' },
      { path: '/franchises', label: 'Franchises' },
      { path: '/consent', label: 'Consent' },
    ],
  },
  {
    label: 'Evaluation',
    items: [
      { path: '/evaluations', label: 'Evaluations' },
      { path: '/critics', label: 'Critics' },
      { path: '/compare', label: 'Compare' },
      { path: '/reviews', label: 'Review Queue', badge: true },
      { path: '/multimodal', label: 'Multi-Modal' },
    ],
  },
  {
    label: 'Quality',
    items: [
      { path: '/test-suites', label: 'Test Suites' },
      { path: '/certifications', label: 'Certifications' },
      { path: '/red-team', label: 'Red Team' },
      { path: '/ab-testing', label: 'A/B Testing' },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { path: '/drift', label: 'Drift Monitor' },
      { path: '/improvement', label: 'Improvement' },
      { path: '/apm', label: 'APM' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { path: '/taxonomy', label: 'Taxonomy' },
      { path: '/exemplars', label: 'Exemplars' },
      { path: '/judges', label: 'Judge Registry' },
    ],
  },
]

const bottomNav = [
  { path: '/settings', label: 'Settings' },
  { path: '/api-docs', label: 'API Docs' },
  { path: '/tutorial', label: 'Tutorial' },
  { path: '/manual', label: 'Help & Docs' },
]

export default function Layout({ children }) {
  const { user, logout, orgOverride, exitOrgOverride } = useAuth()
  const location = useLocation()
  const [pendingCount, setPendingCount] = useState(0)
  const [collapsed, setCollapsed] = useState({})

  useEffect(() => {
    const fetchPending = () => {
      api.get('/reviews/stats').then((r) => {
        setPendingCount(r.data.pending || 0)
      }).catch(() => {})
    }
    fetchPending()
    const interval = setInterval(fetchPending, 30000)
    return () => clearInterval(interval)
  }, [])

  const toggleGroup = (label) => {
    setCollapsed(c => ({ ...c, [label]: !c[label] }))
  }

  const renderNavItem = (item) => {
    const isActive = location.pathname === item.path
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex items-center justify-between px-4 py-1.5 text-sm hover:bg-gray-800 ${
          isActive ? 'bg-gray-800 text-white' : 'text-gray-300'
        }`}
      >
        <span>{item.label}</span>
        {item.badge && pendingCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {pendingCount}
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <aside className="w-56 bg-gray-900 text-white flex flex-col flex-shrink-0 h-screen">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold">CanonSafe</h1>
          <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 mt-2"
                >
                  {group.label}
                  <span className="text-gray-600">{collapsed[group.label] ? '+' : '-'}</span>
                </button>
              )}
              {!collapsed[group.label] && group.items.map(renderNavItem)}
            </div>
          ))}

          <div className="border-t border-gray-700 mt-2 pt-2">
            {bottomNav.map(renderNavItem)}
            {user?.is_super_admin && (
              <Link
                to="/admin"
                className={`flex items-center px-4 py-1.5 text-sm hover:bg-gray-800 ${
                  location.pathname === '/admin' ? 'bg-gray-800 text-white' : 'text-yellow-400'
                }`}
              >
                Admin
              </Link>
            )}
          </div>
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button onClick={logout} className="text-sm text-gray-400 hover:text-white">
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        {orgOverride && (
          <div className="bg-yellow-400 text-yellow-900 px-4 py-2 rounded-lg mb-4 flex items-center justify-between text-sm font-medium">
            <span>God Mode: Viewing <strong>{orgOverride.name}</strong> (Org #{orgOverride.id})</span>
            <button onClick={exitOrgOverride} className="bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700">
              Exit God Mode
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
