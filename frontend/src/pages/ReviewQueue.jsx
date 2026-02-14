import { useState, useEffect, useCallback } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

export default function ReviewQueue() {
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [characters, setCharacters] = useState([])
  const [charMap, setCharMap] = useState({})
  const [criticMap, setCriticMap] = useState({})
  const [statusFilter, setStatusFilter] = useState('pending')
  const [charFilter, setCharFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [resolveForm, setResolveForm] = useState({ override_decision: '', override_justification: '', notes: '' })
  const [showOverride, setShowOverride] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadItems = useCallback(() => {
    const params = {}
    if (statusFilter) params.status = statusFilter
    if (charFilter) params.character_id = charFilter
    api.get('/reviews', { params }).then((r) => setItems(r.data))
  }, [statusFilter, charFilter])

  const loadStats = () => {
    api.get('/reviews/stats').then((r) => setStats(r.data)).catch(() => {})
  }

  useEffect(() => {
    loadItems()
    loadStats()
    api.get('/characters').then((r) => {
      setCharacters(r.data)
      const map = {}
      r.data.forEach(c => { map[c.id] = c.name })
      setCharMap(map)
    })
    api.get('/critics').then((r) => {
      const map = {}
      r.data.forEach(c => { map[c.id] = c.name; map[String(c.id)] = c.name })
      setCriticMap(map)
    })
  }, [])

  useEffect(() => {
    loadItems()
  }, [statusFilter, charFilter, loadItems])

  const selectItem = async (item) => {
    if (selected === item.id) {
      setSelected(null)
      setDetail(null)
      return
    }
    setSelected(item.id)
    setLoadingDetail(true)
    setShowOverride(false)
    setResolveForm({ override_decision: '', override_justification: '', notes: '' })
    try {
      const res = await api.get(`/reviews/${item.id}`)
      setDetail(res.data)
    } catch {
      setDetail(null)
    }
    setLoadingDetail(false)
  }

  const handleClaim = async (itemId) => {
    setActionLoading(true)
    try {
      await api.post(`/reviews/${itemId}/claim`)
      loadItems()
      loadStats()
      if (selected === itemId) {
        const res = await api.get(`/reviews/${itemId}`)
        setDetail(res.data)
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to claim item')
    }
    setActionLoading(false)
  }

  const handleResolve = async (itemId, resolution) => {
    setActionLoading(true)
    try {
      const payload = { resolution, notes: resolveForm.notes || null }
      if (resolution === 'overridden') {
        if (!resolveForm.override_decision) {
          alert('Please select an override decision')
          setActionLoading(false)
          return
        }
        if (!resolveForm.override_justification) {
          alert('Override justification is required')
          setActionLoading(false)
          return
        }
        payload.override_decision = resolveForm.override_decision
        payload.override_justification = resolveForm.override_justification
      }
      await api.post(`/reviews/${itemId}/resolve`, payload)
      loadItems()
      loadStats()
      setSelected(null)
      setDetail(null)
      setShowOverride(false)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to resolve item')
    }
    setActionLoading(false)
  }

  const handleAutoQueue = async () => {
    setActionLoading(true)
    try {
      const res = await api.post('/reviews/auto-queue')
      alert(`Queued ${res.data.queued} items for review`)
      loadItems()
      loadStats()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to auto-queue')
    }
    setActionLoading(false)
  }

  const reasonColor = (reason) => ({
    quarantine: 'bg-orange-100 text-orange-700 border-orange-300',
    escalate: 'bg-red-100 text-red-700 border-red-300',
    critic_disagreement: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    low_confidence: 'bg-blue-100 text-blue-700 border-blue-300',
  }[reason] || 'bg-gray-100 text-gray-700 border-gray-300')

  const statusColor = (s) => ({
    pending: 'bg-yellow-100 text-yellow-700',
    claimed: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
    expired: 'bg-gray-100 text-gray-500',
  }[s] || 'bg-gray-100 text-gray-500')

  const scoreColor = (s) => {
    if (s == null) return 'text-gray-400'
    if (s >= 90) return 'text-green-600'
    if (s >= 70) return 'text-yellow-600'
    if (s >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const barColor = (s) => {
    if (s >= 90) return 'bg-green-400'
    if (s >= 70) return 'bg-yellow-400'
    if (s >= 50) return 'bg-orange-400'
    return 'bg-red-400'
  }

  const timeAgo = (dateStr) => {
    if (!dateStr) return '-'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const renderReviewPanel = () => {
    if (!detail) return null
    const ri = detail.review_item
    const run = detail.eval_run
    const res = detail.result

    return (
      <div className="bg-white rounded-lg shadow p-5 mb-4 border-l-4 border-purple-500">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Review #{ri.id} -- Eval #{run?.id}</h3>
          <button onClick={() => { setSelected(null); setDetail(null) }} className="text-gray-400 hover:text-gray-600 text-sm">Close</button>
        </div>

        {/* Review item meta */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-50 rounded p-2">
            <p className="text-xs text-gray-500">Status</p>
            <span className={`text-sm px-2 py-0.5 rounded ${statusColor(ri.status)}`}>{ri.status}</span>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-xs text-gray-500">Reason</p>
            <span className={`text-sm px-2 py-0.5 rounded border ${reasonColor(ri.reason)}`}>{ri.reason}</span>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-xs text-gray-500">Priority</p>
            <p className="text-lg font-bold">{ri.priority}</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-xs text-gray-500">Character</p>
            <p className="text-sm font-medium">{ri.character_name || charMap[ri.character_id] || `#${ri.character_id}`}</p>
          </div>
        </div>

        {/* Eval run details */}
        {run && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-500">Score</p>
                <p className={`text-xl font-bold ${scoreColor(run.overall_score)}`}>{run.overall_score?.toFixed(1) ?? 'N/A'}</p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-500">Decision</p>
                <span className={`text-sm px-2 py-0.5 rounded ${reasonColor(run.decision)}`}>{run.decision}</span>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-500">Consent</p>
                <span className={run.consent_verified ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {run.consent_verified ? 'Verified' : 'FAILED'}
                </span>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-500">Tier / Agent</p>
                <p className="text-sm">{run.tier} {run.agent_id && <span className="text-gray-400">/ {run.agent_id}</span>}</p>
              </div>
            </div>

            {/* Input content */}
            {run.input_content && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-1">Input Content</p>
                <div className="bg-gray-50 rounded p-2 text-sm">
                  {run.input_content.content || run.input_content.prompt || run.input_content.test_case || JSON.stringify(run.input_content)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Flags */}
        {res?.flags?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Flags</p>
            <div className="flex flex-wrap gap-1">
              {res.flags.map((f, i) => (
                <span key={i} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">{f}</span>
              ))}
            </div>
          </div>
        )}

        {/* Critic scores with reasoning */}
        {res?.critic_results?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Critic Scores</p>
            <div className="space-y-3">
              {res.critic_results.map((cr) => (
                <div key={cr.id} className="bg-gray-50 rounded p-2">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs text-gray-500 w-44 truncate flex-shrink-0">
                      {criticMap[cr.critic_id] || criticMap[String(cr.critic_id)] || `Critic #${cr.critic_id}`}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div className={`h-3 rounded-full ${barColor(cr.score)}`}
                        style={{ width: `${Math.min(cr.score, 100)}%` }} />
                    </div>
                    <span className={`text-sm font-mono font-bold w-12 text-right ${scoreColor(cr.score)}`}>{cr.score.toFixed(1)}</span>
                  </div>
                  {cr.reasoning && (
                    <p className="text-xs text-gray-500 mt-1 ml-1">{cr.reasoning}</p>
                  )}
                  {cr.flags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 ml-1">
                      {cr.flags.map((f, i) => (
                        <span key={i} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">{f}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Critic scores summary (when no full results) */}
        {res?.critic_scores && Object.keys(res.critic_scores).length > 0 && (!res.critic_results || res.critic_results.length === 0) && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Critic Scores (Summary)</p>
            <div className="space-y-2">
              {Object.entries(res.critic_scores).map(([slug, score]) => (
                <div key={slug} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-44 truncate flex-shrink-0">{criticMap[slug] || slug}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div className={`h-3 rounded-full ${barColor(score)}`}
                      style={{ width: `${Math.min(score, 100)}%` }} />
                  </div>
                  <span className={`text-sm font-mono font-bold w-12 text-right ${scoreColor(score)}`}>{score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {res?.recommendations?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Recommendations</p>
            <ul className="space-y-1">
              {res.recommendations.map((r, i) => (
                <li key={i} className="text-sm text-gray-600 bg-yellow-50 rounded p-2">{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Resolution info (if already resolved) */}
        {ri.status === 'resolved' && (
          <div className="mb-4 border-t pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Resolution</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded p-2">
                <p className="text-xs text-gray-500">Decision</p>
                <p className="text-sm font-medium">{ri.resolution}</p>
              </div>
              {ri.override_decision && (
                <div className="bg-orange-50 rounded p-2">
                  <p className="text-xs text-gray-500">Override To</p>
                  <p className="text-sm font-medium">{ri.override_decision}</p>
                </div>
              )}
            </div>
            {ri.override_justification && (
              <div className="mt-2 bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-500 mb-1">Override Justification</p>
                <p className="text-sm">{ri.override_justification}</p>
              </div>
            )}
            {ri.reviewer_notes && (
              <div className="mt-2 bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-500 mb-1">Reviewer Notes</p>
                <p className="text-sm">{ri.reviewer_notes}</p>
              </div>
            )}
            {ri.assigned_name && (
              <p className="text-xs text-gray-400 mt-2">Reviewed by: {ri.assigned_name}</p>
            )}
          </div>
        )}

        {/* Action buttons */}
        {ri.status !== 'resolved' && ri.status !== 'expired' && (
          <div className="border-t pt-4 mt-4">
            {ri.status === 'pending' && (
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => handleClaim(ri.id)}
                  disabled={actionLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Claim for Review
                </button>
              </div>
            )}

            {(ri.status === 'pending' || ri.status === 'claimed') && (
              <>
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-500 block mb-1">Reviewer Notes (optional)</label>
                  <textarea
                    value={resolveForm.notes}
                    onChange={(e) => setResolveForm({ ...resolveForm, notes: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Add notes about your review..."
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleResolve(ri.id, 'approved')}
                    disabled={actionLoading}
                    className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve (Keep Decision)
                  </button>
                  <button
                    onClick={() => setShowOverride(!showOverride)}
                    disabled={actionLoading}
                    className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 disabled:opacity-50"
                  >
                    Override Decision
                  </button>
                  <button
                    onClick={() => handleResolve(ri.id, 're_evaluated')}
                    disabled={actionLoading}
                    className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                  >
                    Re-evaluate
                  </button>
                </div>

                {showOverride && (
                  <div className="mt-3 bg-orange-50 rounded p-3 border border-orange-200">
                    <p className="text-xs font-medium text-orange-700 mb-2">Override Decision</p>
                    <select
                      value={resolveForm.override_decision}
                      onChange={(e) => setResolveForm({ ...resolveForm, override_decision: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm mb-2"
                    >
                      <option value="">Select new decision...</option>
                      <option value="pass">Pass</option>
                      <option value="regenerate">Regenerate</option>
                      <option value="quarantine">Quarantine</option>
                      <option value="escalate">Escalate</option>
                      <option value="block">Block</option>
                    </select>
                    <textarea
                      value={resolveForm.override_justification}
                      onChange={(e) => setResolveForm({ ...resolveForm, override_justification: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm mb-2"
                      rows={2}
                      placeholder="Justification for override (required)..."
                    />
                    <button
                      onClick={() => handleResolve(ri.id, 'overridden')}
                      disabled={actionLoading}
                      className="bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700 disabled:opacity-50"
                    >
                      Confirm Override
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Review Queue"
        subtitle="Human-in-the-loop review for flagged evaluations"
        action={
          <button onClick={handleAutoQueue} disabled={actionLoading}
            className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 disabled:opacity-50">
            Auto-Queue Recent Evals
          </button>
        }
      />

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500">Claimed</p>
            <p className="text-2xl font-bold text-blue-600">{stats.claimed}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500">Resolved (Total)</p>
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500">Resolved Today</p>
            <p className="text-2xl font-bold text-green-500">{stats.resolved_today}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500">Expired</p>
            <p className="text-2xl font-bold text-gray-400">{stats.expired}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500">Avg Resolution</p>
            <p className="text-2xl font-bold text-purple-600">
              {stats.avg_resolution_minutes != null ? `${stats.avg_resolution_minutes}m` : '--'}
            </p>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2 text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="claimed">Claimed</option>
          <option value="resolved">Resolved</option>
          <option value="expired">Expired</option>
        </select>
        <select
          value={charFilter}
          onChange={(e) => setCharFilter(e.target.value)}
          className="border rounded px-3 py-2 text-sm bg-white"
        >
          <option value="">All Characters</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Selected review detail panel */}
      {selected && (
        loadingDetail
          ? <div className="bg-white rounded-lg shadow p-8 mb-4 text-center text-gray-400">Loading review details...</div>
          : detail && renderReviewPanel()
      )}

      {/* Queue list */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 w-12">ID</th>
              <th className="text-left px-4 py-2">Character</th>
              <th className="text-left px-4 py-2 w-28">Reason</th>
              <th className="text-left px-4 py-2 w-20">Priority</th>
              <th className="text-left px-4 py-2 w-24">Status</th>
              <th className="text-left px-4 py-2 w-24">Eval ID</th>
              <th className="text-left px-4 py-2 w-24">Time in Queue</th>
              <th className="text-left px-4 py-2 w-28">Resolution</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={() => selectItem(item)}
                className={`border-t cursor-pointer transition-colors ${
                  selected === item.id ? 'bg-purple-50' : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-4 py-2 text-gray-400">{item.id}</td>
                <td className="px-4 py-2 font-medium">{charMap[item.character_id] || `#${item.character_id}`}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded border ${reasonColor(item.reason)}`}>{item.reason}</span>
                </td>
                <td className="px-4 py-2">
                  <span className={`font-mono font-bold ${item.priority >= 10 ? 'text-red-600' : item.priority >= 5 ? 'text-orange-600' : 'text-gray-600'}`}>
                    {item.priority}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColor(item.status)}`}>{item.status}</span>
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">#{item.eval_run_id}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">{timeAgo(item.created_at)}</td>
                <td className="px-4 py-2 text-xs">
                  {item.resolution
                    ? <span className="text-green-600 font-medium">{item.resolution}</span>
                    : <span className="text-gray-400">--</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-400">
            No review items{statusFilter ? ` with status "${statusFilter}"` : ''}. Use "Auto-Queue Recent Evals" to populate the queue.
          </div>
        )}
      </div>
    </div>
  )
}
