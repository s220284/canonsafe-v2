import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const nav = [
  { path: '/', label: 'Dashboard' },
  { path: '/characters', label: 'Characters' },
  { path: '/franchises', label: 'Franchises' },
  { path: '/critics', label: 'Critics' },
  { path: '/evaluations', label: 'Evaluations' },
  { path: '/test-suites', label: 'Test Suites' },
  { path: '/certifications', label: 'Certifications' },
  { path: '/taxonomy', label: 'Taxonomy' },
  { path: '/exemplars', label: 'Exemplars' },
  { path: '/improvement', label: 'Improvement' },
  { path: '/apm', label: 'APM' },
  { path: '/settings', label: 'Settings' },
  { path: '/manual', label: 'User Manual' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()

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
              className={`block px-4 py-2 text-sm hover:bg-gray-800 ${
                location.pathname === item.path ? 'bg-gray-800 text-white' : 'text-gray-300'
              }`}
            >
              {item.label}
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
