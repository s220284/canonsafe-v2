import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

const ATTACK_CATEGORIES = [
  { key: 'persona_break', label: 'Persona Break', desc: 'Make character act out of character' },
  { key: 'knowledge_probe', label: 'Knowledge Probe', desc: 'Reveal things they shouldn\'t know' },
  { key: 'safety_bypass', label: 'Safety Bypass', desc: 'Produce unsafe content' },
  { key: 'boundary_test', label: 'Boundary Test', desc: 'Test limits of defined behavior' },
  { key: 'context_manipulation', label: 'Context Manipulation', desc: 'Confuse about their world' },
]

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-600',
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
}

const DECISION_STYLES = {
  pass: 'bg-green-100 text-green-700',
  regenerate: 'bg-yellow-100 text-yellow-700',
  quarantine: 'bg-orange-100 text-orange-700',
  escalate: 'bg-red-100 text-red-700',
  block: 'bg-red-200 text-red-800',
  error: 'bg-red-200 text-red-800',
  unknown: 'bg-gray-100 text-gray-600',
}

export default function RedTeam() {
  const [sessions, setSessions] = useState([])
  const [characters, setCharacters] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [sessionDetail, setSessionDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [runningId, setRunningId] = useState(null)
  const [creating, setCreating] = useState(false)

  const [form, setForm] = useState({
    name: '',
    character_id: '',
    attack_categories: ['persona_break', 'knowledge_probe', 'safety_bypass', 'boundary_test', 'context_manipulation'],
    probes_per_category: 5,
  })

  const loadSessions = () => api.get('/red-team').then((r) => setSessions(r.data)).catch(() => {})

  useEffect(() => {
    loadSessions()
    api.get('/characters').then((r) => setCharacters(r.data)).catch(() => {})
  }, [])

  const toggleCategory = (key) => {
    setForm((f) => {
      const cats = f.attack_categories.includes(key)
        ? f.attack_categories.filter((c) => c !== key)
        : [...f.attack_categories, key]
      return { ...f, attack_categories: cats }
    })
  }

  const createSession = async (e) => {
    e.preventDefault()
    if (!form.character_id || !form.name || form.attack_categories.length === 0) return
    setCreating(true)
    try {
      await api.post('/red-team', {
        ...form,
        character_id: parseInt(form.character_id),
        probes_per_category: parseInt(form.probes_per_category),
      })
      setForm({
        name: '',
        character_id: '',
        attack_categories: ['persona_break', 'knowledge_probe', 'safety_bypass', 'boundary_test', 'context_manipulation'],
        probes_per_category: 5,
      })
      setShowCreate(false)
      loadSessions()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create session')
    }
    setCreating(false)
  }

  const loadDetail = async (id) => {
    if (selectedSession === id) {
      setSelectedSession(null)
      setSessionDetail(null)
      return
    }
    setSelectedSession(id)
    setLoadingDetail(true)
    try {
      const res = await api.get(`/red-team/${id}`)
      setSessionDetail(res.data)
    } catch {
      setSessionDetail(null)
    }
    setLoadingDetail(false)
  }

  const runSession = async (id) => {
    setRunningId(id)
    try {
      const res = await api.post(`/red-team/${id}/run`)
      setSessionDetail(res.data)
      setSelectedSession(id)
      loadSessions()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to run session')
    }
    setRunningId(null)
  }

  const resilienceColor = (score) => {
    if (score == null) return 'text-gray-400'
    if (score >= 0.9) return 'text-green-600'
    if (score >= 0.7) return 'text-yellow-600'
    if (score >= 0.5) return 'text-orange-600'
    return 'text-red-600'
  }

  const resilienceBg = (score) => {
    if (score == null) return 'bg-gray-100'
    if (score >= 0.9) return 'bg-green-50'
    if (score >= 0.7) return 'bg-yellow-50'
    if (score >= 0.5) return 'bg-orange-50'
    return 'bg-red-50'
  }

  // Compute category breakdown from session detail
  const getCategoryBreakdown = (results) => {
    if (!results || results.length === 0) return []
    const cats = {}
    results.forEach((r) => {
      if (!r.category) return
      if (!cats[r.category]) cats[r.category] = { total: 0, attacks: 0, totalScore: 0 }
      cats[r.category].total++
      cats[r.category].totalScore += (r.score || 0)
      if (r.is_successful_attack) cats[r.category].attacks++
    })
    return Object.entries(cats).map(([category, data]) => ({
      category,
      total: data.total,
      attacks: data.attacks,
      avgScore: data.total > 0 ? data.totalScore / data.total : 0,
      resilience: data.total > 0 ? 1 - (data.attacks / data.total) : 1,
    }))
  }

  return (
    <div>
      <PageHeader
        title="Red Team"
        subtitle="Adversarial probing to stress-test character fidelity"
        action={
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
          >
            {showCreate ? 'Close' : 'New Session'}
          </button>
        }
      />

      {/* Create session form */}
      {showCreate && (
        <form onSubmit={createSession} className="bg-white rounded-lg shadow p-5 mb-6 space-y-4">
          <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Create Red Team Session</h3>

          <input
            placeholder="Session Name (e.g. 'Q1 Character Stress Test')"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
            required
          />

          <select
            value={form.character_id}
            onChange={(e) => setForm({ ...form, character_id: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
            required
          >
            <option value="">Select Character...</option>
            {characters.some(c => c.is_main) && (
              <optgroup label="Main Characters">
                {characters.filter(c => c.is_main).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            )}
            {characters.some(c => !c.is_main && c.is_focus) && (
              <optgroup label="Focus Characters">
                {characters.filter(c => !c.is_main && c.is_focus).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            )}
            {characters.some(c => !c.is_main && !c.is_focus) && (
              <optgroup label="Other Characters">
                {characters.filter(c => !c.is_main && !c.is_focus).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            )}
          </select>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Attack Categories</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {ATTACK_CATEGORIES.map((cat) => (
                <label
                  key={cat.key}
                  className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                    form.attack_categories.includes(cat.key)
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.attack_categories.includes(cat.key)}
                    onChange={() => toggleCategory(cat.key)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium">{cat.label}</div>
                    <div className="text-xs text-gray-500">{cat.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="w-48">
            <label className="text-sm font-medium text-gray-700 block mb-1">Probes per Category</label>
            <input
              type="number"
              min="1"
              max="20"
              value={form.probes_per_category}
              onChange={(e) => setForm({ ...form, probes_per_category: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Total probes: {form.attack_categories.length * (parseInt(form.probes_per_category) || 0)}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Session'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="border px-4 py-2 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Sessions list */}
      <div className="space-y-3">
        {sessions.map((s) => {
          const isSelected = selectedSession === s.id
          const detail = isSelected ? sessionDetail : null
          const breakdown = detail ? getCategoryBreakdown(detail.results) : []

          return (
            <div
              key={s.id}
              className={`bg-white rounded-lg shadow transition-all ${
                isSelected ? 'ring-2 ring-red-300' : 'hover:shadow-md'
              }`}
            >
              {/* Header */}
              <div className="p-4 cursor-pointer" onClick={() => loadDetail(s.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 text-red-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      RT
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{s.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLES[s.status] || STATUS_STYLES.pending}`}>
                          {s.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm text-blue-500">{s.character_name}</span>
                        <span className="text-xs text-gray-400">
                          {(s.attack_categories || []).length} categories, {s.total_probes || 0} probes
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    {s.status === 'completed' && s.resilience_score != null && (
                      <div className={`text-center px-3 py-1 rounded ${resilienceBg(s.resilience_score)}`}>
                        <p className="text-xs text-gray-500">Resilience</p>
                        <p className={`text-2xl font-bold font-mono ${resilienceColor(s.resilience_score)}`}>
                          {(s.resilience_score * 100).toFixed(0)}%
                        </p>
                      </div>
                    )}
                    {s.status !== 'running' && s.status !== 'completed' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); runSession(s.id) }}
                        disabled={runningId === s.id}
                        className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {runningId === s.id ? 'Running...' : 'Run Session'}
                      </button>
                    )}
                    {s.status === 'completed' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); runSession(s.id) }}
                        disabled={runningId === s.id}
                        className="text-xs bg-gray-600 text-white px-3 py-1.5 rounded hover:bg-gray-700 disabled:opacity-50"
                      >
                        {runningId === s.id ? 'Re-running...' : 'Re-run'}
                      </button>
                    )}
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isSelected ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Detail panel */}
              {isSelected && (
                <div className="border-t">
                  {loadingDetail ? (
                    <div className="p-8 text-center text-gray-400">Loading session details...</div>
                  ) : !detail ? (
                    <div className="p-8 text-center text-gray-400">Failed to load session details</div>
                  ) : (
                    <div>
                      {/* Summary stats */}
                      {detail.status === 'completed' && (
                        <div className="p-4 bg-gray-50">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <div className={`rounded-lg p-3 text-center ${resilienceBg(detail.resilience_score)}`}>
                              <p className="text-xs text-gray-500 mb-1">Resilience Score</p>
                              <p className={`text-3xl font-bold font-mono ${resilienceColor(detail.resilience_score)}`}>
                                {detail.resilience_score != null ? (detail.resilience_score * 100).toFixed(0) + '%' : '--'}
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                              <p className="text-xs text-gray-500 mb-1">Total Probes</p>
                              <p className="text-3xl font-bold font-mono text-gray-700">{detail.total_probes}</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                              <p className="text-xs text-gray-500 mb-1">Successful Attacks</p>
                              <p className="text-3xl font-bold font-mono text-red-600">{detail.successful_attacks}</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                              <p className="text-xs text-gray-500 mb-1">Defended</p>
                              <p className="text-3xl font-bold font-mono text-green-600">
                                {detail.total_probes - detail.successful_attacks}
                              </p>
                            </div>
                          </div>

                          {/* Category breakdown bars */}
                          {breakdown.length > 0 && (
                            <div className="space-y-2 mb-4">
                              <h4 className="text-sm font-semibold text-gray-600">Category Breakdown</h4>
                              {breakdown.map((cat) => {
                                const label = ATTACK_CATEGORIES.find(c => c.key === cat.category)?.label || cat.category
                                const pct = (cat.resilience * 100).toFixed(0)
                                const barColor = cat.resilience >= 0.9 ? 'bg-green-400'
                                  : cat.resilience >= 0.7 ? 'bg-yellow-400'
                                  : cat.resilience >= 0.5 ? 'bg-orange-400'
                                  : 'bg-red-400'
                                return (
                                  <div key={cat.category} className="flex items-center gap-3">
                                    <span className="text-xs text-gray-600 w-40 flex-shrink-0">{label}</span>
                                    <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${barColor}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
                                        {pct}% resilient
                                      </span>
                                    </div>
                                    <span className="text-xs text-gray-500 w-24 text-right flex-shrink-0">
                                      {cat.attacks}/{cat.total} broke
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Individual probe results table */}
                      {detail.results && detail.results.length > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-gray-100 border-t">
                            <h4 className="text-sm font-semibold text-gray-600">Probe Results ({detail.results.length})</h4>
                          </div>
                          <div className="divide-y max-h-[500px] overflow-y-auto">
                            {detail.results.map((r, i) => (
                              <div
                                key={i}
                                className={`px-4 py-3 ${r.is_successful_attack ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.is_successful_attack ? 'bg-red-500' : 'bg-green-500'}`} />
                                      <span className="text-xs font-medium text-gray-500 uppercase">
                                        {ATTACK_CATEGORIES.find(c => c.key === r.category)?.label || r.category}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700 break-words">{r.prompt}</p>
                                    {r.flags && r.flags.length > 0 && (
                                      <div className="flex gap-1 flex-wrap mt-1">
                                        {r.flags.map((f, fi) => (
                                          <span key={fi} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                            {f}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`text-xs px-2 py-0.5 rounded ${DECISION_STYLES[r.decision] || DECISION_STYLES.unknown}`}>
                                      {r.decision}
                                    </span>
                                    <span className={`text-sm font-mono font-bold w-12 text-right ${
                                      r.score >= 0.7 ? 'text-green-600'
                                      : r.score >= 0.5 ? 'text-yellow-600'
                                      : 'text-red-600'
                                    }`}>
                                      {(r.score * 100).toFixed(0)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pending/empty state */}
                      {detail.status === 'pending' && (
                        <div className="p-8 text-center text-gray-400">
                          <p>Session has not been run yet.</p>
                          <button
                            onClick={() => runSession(s.id)}
                            disabled={runningId === s.id}
                            className="mt-3 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                          >
                            {runningId === s.id ? 'Running...' : 'Run Session Now'}
                          </button>
                        </div>
                      )}
                      {detail.status === 'running' && (
                        <div className="p-8 text-center text-blue-500">
                          <p className="animate-pulse">Session is currently running...</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {sessions.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
            No red team sessions yet. Create one to start adversarial testing.
          </div>
        )}
      </div>
    </div>
  )
}
