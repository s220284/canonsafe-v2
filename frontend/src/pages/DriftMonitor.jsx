import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

const SEVERITY_STYLES = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
  warning: 'bg-yellow-100 text-yellow-700',
  info: 'bg-blue-100 text-blue-700',
}

const STATUS_STYLES = {
  ok: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', label: 'No Drift' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', label: 'Moderate Drift' },
  critical: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', label: 'Significant Drift' },
}

export default function DriftMonitor() {
  const [summary, setSummary] = useState(null)
  const [characters, setCharacters] = useState([])
  const [selectedChar, setSelectedChar] = useState('')
  const [baselines, setBaselines] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [summaryRes, charsRes] = await Promise.all([
        api.get('/drift/summary'),
        api.get('/characters'),
      ])
      setSummary(summaryRes.data)
      setCharacters(charsRes.data)

      // Load baselines and events
      const params = selectedChar ? `?character_id=${selectedChar}` : ''
      const [baselinesRes, eventsRes] = await Promise.all([
        api.get(`/drift/baselines${params}`),
        api.get(`/drift/events${params}`),
      ])
      setBaselines(baselinesRes.data)
      setEvents(eventsRes.data)
    } catch (err) {
      console.error('Failed to load drift data', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [selectedChar])

  const computeBaselines = async () => {
    if (!selectedChar) {
      setMessage('Select a character first')
      return
    }
    setComputing(true)
    setMessage('')
    try {
      const res = await api.post(`/drift/compute-baselines?character_id=${selectedChar}`)
      setMessage(res.data.message)
      loadData()
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to compute baselines')
    }
    setComputing(false)
  }

  const runDriftCheck = async () => {
    if (!selectedChar) {
      setMessage('Select a character first')
      return
    }
    setChecking(true)
    setMessage('')
    try {
      const res = await api.post(`/drift/check?character_id=${selectedChar}`)
      setMessage(res.data.message)
      loadData()
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to run drift check')
    }
    setChecking(false)
  }

  const charMap = {}
  characters.forEach(c => { charMap[c.id] = c.name })

  const totalBaselines = summary?.total_baselines || 0
  const totalEvents = summary?.total_events || 0
  const criticalChars = summary?.characters?.filter(c => c.status === 'critical').length || 0
  const warningChars = summary?.characters?.filter(c => c.status === 'warning').length || 0

  return (
    <div>
      <PageHeader
        title="Drift Monitor"
        subtitle={`${totalBaselines} baselines tracked, ${totalEvents} drift events detected`}
        action={
          <div className="flex gap-2">
            <button
              onClick={computeBaselines}
              disabled={computing || !selectedChar}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {computing ? 'Computing...' : 'Compute Baselines'}
            </button>
            <button
              onClick={runDriftCheck}
              disabled={checking || !selectedChar}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
            >
              {checking ? 'Checking...' : 'Run Drift Check'}
            </button>
          </div>
        }
      />

      {/* Message banner */}
      {message && (
        <div className="bg-blue-50 text-blue-700 text-sm px-4 py-2 rounded mb-4 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-blue-400 hover:text-blue-600 text-xs ml-4">Dismiss</button>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-xs text-gray-400">Total Baselines</p>
          <p className="text-2xl font-bold">{totalBaselines}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-xs text-gray-400">Drift Events</p>
          <p className="text-2xl font-bold text-orange-600">{totalEvents}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-xs text-gray-400">Critical Characters</p>
          <p className="text-2xl font-bold text-red-600">{criticalChars}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-xs text-gray-400">Warning Characters</p>
          <p className="text-2xl font-bold text-yellow-600">{warningChars}</p>
        </div>
      </div>

      {/* Character selector */}
      <div className="flex gap-3 mb-4">
        <select
          value={selectedChar}
          onChange={(e) => setSelectedChar(e.target.value)}
          className="border rounded px-3 py-2 text-sm bg-white"
        >
          <option value="">All Characters</option>
          {characters.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {selectedChar && (
          <button onClick={() => setSelectedChar('')} className="text-xs text-gray-400 hover:text-gray-600 px-2">
            Clear filter
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">Loading drift data...</div>
      ) : (
        <>
          {/* Character status cards */}
          {summary?.characters?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">Character Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {summary.characters
                  .filter(c => !selectedChar || c.character_id === parseInt(selectedChar))
                  .map((char) => {
                    const st = STATUS_STYLES[char.status] || STATUS_STYLES.ok
                    return (
                      <div key={char.character_id}
                        className={`rounded-lg shadow border p-4 ${st.bg} ${st.border}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm font-bold text-gray-700">
                              {(char.character_name || '?')[0]}
                            </div>
                            <h4 className="font-semibold text-sm">{char.character_name || `Character #${char.character_id}`}</h4>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${st.text} bg-white/60`}>
                            {st.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{char.baselines?.length || 0} baselines</span>
                          <span>{char.unacknowledged_count || 0} unacknowledged events</span>
                        </div>
                        {/* Status indicator icon */}
                        <div className="mt-2 flex items-center gap-1">
                          {char.status === 'ok' && (
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {char.status === 'warning' && (
                            <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          )}
                          {char.status === 'critical' && (
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                          <span className={`text-xs ${st.text}`}>
                            {char.status === 'ok' ? 'All metrics within normal range' :
                             char.status === 'warning' ? 'Some metrics showing moderate drift' :
                             'Significant drift detected - review required'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Baseline cards */}
          {baselines.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">
                Baselines {selectedChar ? `for ${charMap[selectedChar] || ''}` : ''}
              </h3>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2">Character</th>
                      <th className="text-left px-4 py-2">Critic</th>
                      <th className="text-left px-4 py-2 w-28">Baseline Score</th>
                      <th className="text-left px-4 py-2 w-24">Std Dev</th>
                      <th className="text-left px-4 py-2 w-24">Threshold</th>
                      <th className="text-left px-4 py-2 w-20">Samples</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baselines.map((b) => (
                      <tr key={b.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{b.character_name || `#${b.character_id}`}</td>
                        <td className="px-4 py-2 text-gray-600">{b.critic_name || `Critic #${b.critic_id}`}</td>
                        <td className="px-4 py-2">
                          <span className={`font-mono font-bold ${
                            b.baseline_score >= 90 ? 'text-green-600' :
                            b.baseline_score >= 70 ? 'text-yellow-600' :
                            b.baseline_score >= 50 ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {b.baseline_score.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-500 font-mono">{b.std_deviation.toFixed(2)}</td>
                        <td className="px-4 py-2 text-gray-500 font-mono">{b.threshold.toFixed(1)}</td>
                        <td className="px-4 py-2 text-gray-400">{b.sample_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Drift events */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">
              Drift Events {selectedChar ? `for ${charMap[selectedChar] || ''}` : ''}
            </h3>
            {events.length > 0 ? (
              <div className="space-y-2">
                {events.map((e) => (
                  <div key={e.id} className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
                    {/* Severity badge */}
                    <span className={`text-xs font-medium px-2.5 py-1 rounded flex-shrink-0 ${
                      SEVERITY_STYLES[e.severity] || 'bg-gray-100 text-gray-600'
                    }`}>
                      {(e.severity || 'unknown').toUpperCase()}
                    </span>

                    {/* Character & critic info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{e.character_name || `Character #${e.character_id}`}</span>
                        <span className="text-gray-400 text-xs">/</span>
                        <span className="text-sm text-gray-600">{e.critic_name || `Critic #${e.critic_id}`}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span>Baseline: <span className="font-mono text-gray-600">{e.baseline_score?.toFixed(1)}</span></span>
                        <span>Detected: <span className={`font-mono font-bold ${
                          Math.abs(e.detected_score - (e.baseline_score || 0)) > 10 ? 'text-red-600' : 'text-orange-600'
                        }`}>{e.detected_score?.toFixed(1)}</span></span>
                        <span>Deviation: <span className="font-mono text-orange-600">{e.deviation?.toFixed(2)}</span></span>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {e.created_at ? new Date(e.created_at).toLocaleString() : ''}
                    </div>

                    {/* Acknowledged indicator */}
                    {e.acknowledged && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded flex-shrink-0">ACK</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
                {baselines.length === 0
                  ? 'No baselines computed yet. Select a character and click "Compute Baselines" to get started.'
                  : 'No drift events detected. All metrics are within normal range.'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
