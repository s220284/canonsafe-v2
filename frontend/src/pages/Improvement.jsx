import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

function Sparkline({ data, trend }) {
  if (!data || data.length < 2) return null
  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const width = 200
  const height = 40
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  const color = trend === 'improving' ? '#22c55e' : trend === 'degrading' ? '#ef4444' : '#6b7280'

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-10" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      {/* End dot */}
      {values.length > 0 && (
        <circle cx={(values.length - 1) / (values.length - 1) * width}
          cy={height - ((values[values.length - 1] - min) / range) * (height - 4) - 2}
          r="3" fill={color} />
      )}
    </svg>
  )
}

export default function Improvement() {
  const [summary, setSummary] = useState({ failure_patterns: [], trajectories: [], suggestions: [] })
  const [charMap, setCharMap] = useState({})

  useEffect(() => {
    api.get('/improvement/summary').then((r) => setSummary(r.data))
    api.get('/characters').then((r) => {
      const map = {}
      r.data.forEach(c => { map[c.id] = c.name })
      setCharMap(map)
    })
  }, [])

  const detectPatterns = async () => {
    await api.post('/improvement/detect-patterns')
    api.get('/improvement/summary').then((r) => setSummary(r.data))
  }

  const severityColor = (s) => ({
    critical: 'bg-red-200 text-red-700',
    high: 'bg-red-100 text-red-600',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-blue-100 text-blue-600',
  }[s] || 'bg-gray-100 text-gray-600')

  const trendColor = (t) => ({
    improving: 'bg-green-100 text-green-600',
    degrading: 'bg-red-100 text-red-600',
    stable: 'bg-gray-100 text-gray-600',
  }[t] || 'bg-gray-100 text-gray-600')

  const trendArrow = (t) => ({
    improving: '\u2191', degrading: '\u2193', stable: '\u2192',
  }[t] || '')

  return (
    <div>
      <PageHeader
        title="Continuous Improvement"
        subtitle={`${summary.failure_patterns.length} failure patterns, ${summary.trajectories.length} trajectories`}
        action={
          <button onClick={detectPatterns} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
            Detect Patterns
          </button>
        }
      />

      {/* Suggestions */}
      {summary.suggestions.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Improvement Suggestions ({summary.suggestions.length})</h3>
          <ul className="space-y-2">
            {summary.suggestions.map((s, i) => (
              <li key={i} className="text-sm text-yellow-700 flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5">&#9679;</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failure Patterns */}
        <div>
          <h3 className="font-semibold mb-3">Failure Patterns</h3>
          <div className="space-y-2">
            {summary.failure_patterns.map((p) => (
              <div key={p.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${severityColor(p.severity)}`}>{p.severity}</span>
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{p.pattern_type}</span>
                  <span className="text-xs text-gray-400">x{p.frequency}</span>
                  {p.character_id && (
                    <span className="text-xs text-blue-600 ml-auto font-medium">
                      {charMap[p.character_id] || `#${p.character_id}`}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 mb-2">{p.description}</p>
                {p.suggested_fix && (
                  <div className="bg-green-50 border border-green-100 rounded p-2">
                    <p className="text-xs text-green-700"><span className="font-medium">Suggested fix:</span> {p.suggested_fix}</p>
                  </div>
                )}
              </div>
            ))}
            {summary.failure_patterns.length === 0 && <p className="text-sm text-gray-500 p-4">No patterns detected.</p>}
          </div>
        </div>

        {/* Trajectories */}
        <div>
          <h3 className="font-semibold mb-3">Improvement Trajectories</h3>
          <div className="space-y-2">
            {summary.trajectories.map((t) => {
              const lastVal = t.data_points?.length > 0 ? t.data_points[t.data_points.length - 1].value : null
              const firstVal = t.data_points?.length > 0 ? t.data_points[0].value : null
              return (
                <div key={t.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">{t.metric_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${trendColor(t.trend)}`}>
                      {trendArrow(t.trend)} {t.trend || 'unknown'}
                    </span>
                    {t.character_id && (
                      <span className="text-xs text-blue-600 ml-auto font-medium">
                        {charMap[t.character_id] || `#${t.character_id}`}
                      </span>
                    )}
                  </div>
                  {t.data_points?.length > 1 && (
                    <div className="mb-2">
                      <Sparkline data={t.data_points} trend={t.trend} />
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{t.data_points?.length || 0} data points</span>
                    {firstVal != null && lastVal != null && (
                      <span>{firstVal.toFixed(1)} &rarr; {lastVal.toFixed(1)}</span>
                    )}
                    {t.data_points?.length > 0 && (
                      <span>{t.data_points[0].date} &mdash; {t.data_points[t.data_points.length - 1].date}</span>
                    )}
                  </div>
                </div>
              )
            })}
            {summary.trajectories.length === 0 && <p className="text-sm text-gray-500 p-4">No trajectories yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
