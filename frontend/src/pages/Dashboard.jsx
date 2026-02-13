import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

export default function Dashboard() {
  const [stats, setStats] = useState({ characters: 0, franchises: 0, evaluations: 0, critics: 0, passRate: 0, exemplars: 0 })
  const [recentEvals, setRecentEvals] = useState([])
  const [recentChars, setRecentChars] = useState([])
  const [charMap, setCharMap] = useState({})

  useEffect(() => {
    Promise.all([
      api.get('/characters').catch(() => ({ data: [] })),
      api.get('/franchises').catch(() => ({ data: [] })),
      api.get('/evaluations').catch(() => ({ data: [] })),
      api.get('/critics').catch(() => ({ data: [] })),
      api.get('/exemplars').catch(() => ({ data: [] })),
    ]).then(([chars, fran, evals, critics, exemplars]) => {
      const evalsData = evals.data || []
      const passCount = evalsData.filter(e => e.decision === 'pass').length
      const passRate = evalsData.length > 0 ? (passCount / evalsData.length * 100).toFixed(1) : 0

      // Build character ID -> name map
      const map = {}
      ;(chars.data || []).forEach(c => { map[c.id] = c })
      setCharMap(map)

      setStats({
        characters: (chars.data || []).length,
        franchises: (fran.data || []).length,
        evaluations: evalsData.length,
        critics: (critics.data || []).length,
        passRate,
        exemplars: (exemplars.data || []).length,
      })
      setRecentEvals(evalsData.slice(0, 8))
      setRecentChars((chars.data || []).slice(0, 6))
    })
  }, [])

  const decisionColor = (d) => ({
    pass: 'text-green-600', regenerate: 'text-yellow-600', quarantine: 'text-orange-600',
    escalate: 'text-red-600', block: 'text-red-700', 'sampled-pass': 'text-blue-600',
  }[d] || 'text-gray-500')

  const decisionBg = (d) => ({
    pass: 'bg-green-100 text-green-700', regenerate: 'bg-yellow-100 text-yellow-700',
    quarantine: 'bg-orange-100 text-orange-700', escalate: 'bg-red-100 text-red-700',
    block: 'bg-red-200 text-red-800',
  }[d] || 'bg-gray-100 text-gray-600')

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  const cards = [
    { label: 'Characters', value: stats.characters, color: 'bg-blue-500', icon: '15 active' },
    { label: 'Franchises', value: stats.franchises, color: 'bg-green-500', icon: 'Peppa Pig' },
    { label: 'Evaluations', value: stats.evaluations, color: 'bg-purple-500', icon: 'completed' },
    { label: 'Pass Rate', value: `${stats.passRate}%`, color: 'bg-emerald-500', icon: 'overall' },
    { label: 'Critics', value: stats.critics, color: 'bg-orange-500', icon: 'active' },
    { label: 'Exemplars', value: stats.exemplars, color: 'bg-indigo-500', icon: 'curated' },
  ]

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="CanonSafe V2 — Character IP Governance Platform" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-lg shadow p-4">
            <div className={`w-2 h-2 rounded-full ${c.color} mb-2`} />
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="text-xs text-gray-400 mt-1">{c.icon}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold">Recent Evaluations</h3>
            <Link to="/evaluations" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {recentEvals.map((ev) => {
              const char = charMap[ev.character_id]
              return (
                <div key={ev.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                      {(char?.name || '?')[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{char?.name || `Character #${ev.character_id}`}</p>
                      <p className="text-xs text-gray-400">{ev.modality} — {ev.tier} — {timeAgo(ev.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-mono font-bold ${decisionColor(ev.decision)}`}>
                      {ev.overall_score?.toFixed(1) ?? '—'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${decisionBg(ev.decision)}`}>
                      {ev.decision || 'pending'}
                    </span>
                  </div>
                </div>
              )
            })}
            {recentEvals.length === 0 && (
              <div className="px-4 py-6 text-sm text-gray-400 text-center">No evaluations yet</div>
            )}
          </div>
        </div>

        {/* Quick Actions + System Status */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/evaluations" className="block w-full text-left px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                Run Evaluation
              </Link>
              <Link to="/characters" className="block w-full text-left px-3 py-2 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100">
                Manage Characters
              </Link>
              <Link to="/certifications" className="block w-full text-left px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded hover:bg-purple-100">
                Agent Certification
              </Link>
              <Link to="/improvement" className="block w-full text-left px-3 py-2 text-sm bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100">
                View Improvement
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">System Status</h3>
            <div className="space-y-2 text-sm">
              {[
                ['Evaluation Engine', 'Active'],
                ['Consent Verification', 'Active'],
                ['LLM Provider', 'Connected'],
                ['C2PA Integration', 'Ready'],
                ['Drift Detection', 'Monitoring'],
              ].map(([label, status]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-green-600 font-medium text-xs">{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Characters */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">Characters</h3>
          <Link to="/characters" className="text-xs text-blue-600 hover:underline">View all {stats.characters}</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4">
          {recentChars.map((c) => (
            <Link key={c.id} to={`/characters/${c.id}`}
              className="text-center p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold mx-auto mb-2">
                {c.name[0]}
              </div>
              <p className="text-sm font-medium truncate">{c.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded ${
                c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>{c.status}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
