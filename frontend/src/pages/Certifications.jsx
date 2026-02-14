import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

const STATUS_STYLES = {
  passed: { badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  certified: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  failed: { badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  pending: { badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  expired: { badge: 'bg-gray-200 text-gray-600', dot: 'bg-gray-400' },
}

const TIER_STYLES = {
  base: 'bg-gray-100 text-gray-600',
  canonsafe_certified: 'bg-blue-100 text-blue-700',
}

const AGENT_COLORS = {
  'demo-agent-v1': 'bg-indigo-100 text-indigo-700',
  'demo-agent-v2': 'bg-teal-100 text-teal-700',
  'demo-agent-v3': 'bg-orange-100 text-orange-700',
}

export default function Certifications() {
  const [certs, setCerts] = useState([])
  const [characters, setCharacters] = useState([])
  const [charMap, setCharMap] = useState({})
  const [suites, setSuites] = useState([])
  const [suiteMap, setSuiteMap] = useState({})

  // Selection
  const [selected, setSelected] = useState(null)

  // Editing
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  // Create
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ agent_id: '', character_id: '', card_version_id: '', tier: 'base', test_suite_id: '' })
  const [certifying, setCertifying] = useState(false)
  const [certError, setCertError] = useState('')

  // Filter
  const [filterAgent, setFilterAgent] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const exportCSV = async () => {
    try {
      const res = await api.get('/export/certifications?format=csv', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `certifications_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed', err)
    }
  }

  const load = () => api.get('/certifications').then((r) => setCerts(r.data))
  useEffect(() => {
    load()
    api.get('/characters').then((r) => {
      setCharacters(r.data)
      const map = {}
      r.data.forEach(c => { map[c.id] = c.name })
      setCharMap(map)
    })
    api.get('/test-suites').then((r) => {
      setSuites(r.data)
      const map = {}
      r.data.forEach(s => { map[s.id] = s.name })
      setSuiteMap(map)
    })
  }, [])

  const certify = async (e) => {
    e.preventDefault()
    setCertifying(true)
    setCertError('')
    try {
      await api.post('/certifications', {
        ...form,
        character_id: parseInt(form.character_id),
        card_version_id: parseInt(form.card_version_id),
        test_suite_id: parseInt(form.test_suite_id),
      })
      setShowCreate(false)
      setForm({ agent_id: '', character_id: '', card_version_id: '', tier: 'base', test_suite_id: '' })
      load()
    } catch (err) {
      setCertError(err.response?.data?.detail || err.message)
    }
    setCertifying(false)
  }

  // Auto-populate card_version_id when character is selected
  const handleCharacterSelect = async (charId) => {
    setForm({ ...form, character_id: charId, card_version_id: '' })
    if (charId) {
      try {
        const res = await api.get(`/characters/${charId}`)
        if (res.data.active_version_id) {
          setForm(f => ({ ...f, card_version_id: String(res.data.active_version_id) }))
        }
      } catch {}
    }
  }

  const toggleSelect = (id) => {
    if (selected === id) {
      setSelected(null)
      setEditing(null)
    } else {
      setSelected(id)
      setEditing(null)
    }
  }

  const startEdit = (cert) => {
    setEditing(cert.id)
    setEditForm({
      status: cert.status,
      score: cert.score ?? '',
    })
  }

  const saveEdit = async (certId) => {
    setSaving(true)
    try {
      const payload = { status: editForm.status }
      if (editForm.score !== '' && editForm.score != null) payload.score = parseFloat(editForm.score)
      await api.patch(`/certifications/${certId}`, payload)
      setEditing(null)
      load()
    } catch (err) {
      console.error('Save failed', err)
    }
    setSaving(false)
  }

  const scoreColor = (s) => {
    if (s == null) return 'text-gray-400'
    if (s >= 90) return 'text-green-600'
    if (s >= 80) return 'text-yellow-600'
    if (s >= 70) return 'text-orange-600'
    return 'text-red-600'
  }

  const barColor = (s) => {
    if (s >= 90) return 'bg-green-400'
    if (s >= 80) return 'bg-yellow-400'
    if (s >= 70) return 'bg-orange-400'
    return 'bg-red-400'
  }

  const decisionBadge = (d) => ({
    pass: 'bg-green-100 text-green-700',
    regenerate: 'bg-yellow-100 text-yellow-700',
    quarantine: 'bg-orange-100 text-orange-700',
    escalate: 'bg-red-100 text-red-700',
    error: 'bg-red-200 text-red-800',
  }[d] || 'bg-gray-100 text-gray-600')

  // Filters
  const agents = [...new Set(certs.map(c => c.agent_id))].sort()
  const filtered = certs.filter(c => {
    if (filterAgent && c.agent_id !== filterAgent) return false
    if (filterStatus && c.status !== filterStatus) return false
    return true
  })

  const passed = certs.filter(c => c.status === 'passed' || c.status === 'certified').length
  const failed = certs.filter(c => c.status === 'failed').length

  return (
    <div>
      <PageHeader
        title="Agent Certification"
        subtitle={`${certs.length} certifications — ${passed} passed, ${failed} failed — Click any card to view details`}
        action={
          <div className="flex gap-2">
            <button onClick={exportCSV} className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50">
              Export CSV
            </button>
            <button onClick={() => setShowCreate(!showCreate)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
              {showCreate ? 'Close' : 'Certify Agent'}
            </button>
          </div>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-2xl font-bold">{certs.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-xs text-gray-400">Passed/Certified</p>
          <p className="text-2xl font-bold text-green-600">{passed}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-xs text-gray-400">Failed</p>
          <p className="text-2xl font-bold text-red-600">{failed}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-xs text-gray-400">Agents Tested</p>
          <p className="text-2xl font-bold text-indigo-600">{agents.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}
          className="border rounded px-3 py-2 text-sm bg-white">
          <option value="">All Agents</option>
          {agents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded px-3 py-2 text-sm bg-white">
          <option value="">All Statuses</option>
          <option value="certified">Certified</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
          <option value="expired">Expired</option>
        </select>
        {(filterAgent || filterStatus) && (
          <button onClick={() => { setFilterAgent(''); setFilterStatus('') }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2">
            Clear filters
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={certify} className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
          <h3 className="font-medium text-sm text-gray-500">Run Agent Certification</h3>
          <p className="text-xs text-gray-400">Select a character and test suite, then run the full certification pipeline. Each test case will be evaluated through the LLM critic framework.</p>
          {certError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded">{certError}</div>}
          <input placeholder="Agent ID (e.g. peppa-agent-v1)" value={form.agent_id}
            onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm" required />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.character_id} onChange={(e) => handleCharacterSelect(e.target.value)}
              className="border rounded px-3 py-2 text-sm" required>
              <option value="">Character...</option>
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
            <div className="relative">
              <input placeholder="Card Version ID" value={form.card_version_id}
                onChange={(e) => setForm({ ...form, card_version_id: e.target.value })}
                className="border rounded px-3 py-2 text-sm w-full" required />
              {form.card_version_id && <span className="absolute right-2 top-2.5 text-xs text-green-500">auto</span>}
            </div>
            <select value={form.test_suite_id} onChange={(e) => setForm({ ...form, test_suite_id: e.target.value })}
              className="border rounded px-3 py-2 text-sm" required>
              <option value="">Test Suite...</option>
              {suites.filter(s => !form.character_id || s.character_id === parseInt(form.character_id)).map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({charMap[s.character_id] || '?'})</option>
              ))}
            </select>
            <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}
              className="border rounded px-3 py-2 text-sm">
              <option value="base">Base</option>
              <option value="canonsafe_certified">CanonSafe Certified</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={certifying} className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50">
              {certifying ? 'Running Certification...' : 'Run Certification'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="border px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Certifications list */}
      <div className="space-y-3">
        {filtered.map((c) => {
          const isSelected = selected === c.id
          const isEditing = editing === c.id
          const st = STATUS_STYLES[c.status] || STATUS_STYLES.pending
          const charName = charMap[c.character_id] || `Character #${c.character_id}`
          const rs = c.results_summary || {}
          const isExpired = c.expires_at && new Date(c.expires_at) < new Date()

          return (
            <div key={c.id}
              className={`bg-white rounded-lg shadow transition-all ${
                isSelected ? 'ring-2 ring-blue-300' : 'hover:shadow-md'
              }`}>

              {/* Card header - clickable */}
              <div className="p-4 cursor-pointer" onClick={() => toggleSelect(c.id)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Status dot + avatar */}
                    <div className="relative">
                      <div className="w-11 h-11 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                        {charName[0]}
                      </div>
                      <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${st.dot}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{charName}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${AGENT_COLORS[c.agent_id] || 'bg-gray-100 text-gray-600'}`}>
                          {c.agent_id}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${TIER_STYLES[c.tier] || 'bg-gray-100'}`}>
                          {c.tier === 'canonsafe_certified' ? 'CanonSafe Certified' : 'Base'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                        <span>v{c.card_version_id}</span>
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                        {isExpired && <span className="text-red-500 font-medium">EXPIRED</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded font-medium ${st.badge}`}>{c.status.toUpperCase()}</span>
                    <div className="text-right">
                      <p className={`text-xl font-bold font-mono ${scoreColor(c.score)}`}>
                        {c.score?.toFixed(1) ?? 'N/A'}
                      </p>
                    </div>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${isSelected ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {isSelected && (
                <div className="border-t">
                  {/* Actions bar */}
                  <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>ID: {c.id}</span>
                      {rs.total_tests != null && (
                        <span>Tests: {rs.passed}/{rs.total_tests} passed</span>
                      )}
                      {rs.weakest_area && (
                        <span>Weakest: <span className="text-orange-500">{rs.weakest_area}</span></span>
                      )}
                      {c.expires_at && (
                        <span>Expires: {new Date(c.expires_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); startEdit(c) }}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                      Edit Status
                    </button>
                  </div>

                  {/* Edit form */}
                  {isEditing && (
                    <div className="px-4 py-3 bg-blue-50 border-t space-y-3">
                      <h4 className="text-sm font-medium text-gray-500">Edit Certification</h4>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500">Status</label>
                          <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="w-full border rounded px-3 py-2 text-sm mt-0.5">
                            <option value="pending">Pending</option>
                            <option value="passed">Passed</option>
                            <option value="certified">Certified</option>
                            <option value="failed">Failed</option>
                            <option value="expired">Expired</option>
                          </select>
                        </div>
                        <div className="w-32">
                          <label className="text-xs text-gray-500">Score</label>
                          <input type="number" step="0.1" value={editForm.score}
                            onChange={(e) => setEditForm({ ...editForm, score: e.target.value })}
                            className="w-full border rounded px-3 py-2 text-sm mt-0.5" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(c.id)} disabled={saving}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50">
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setEditing(null)} className="border px-3 py-1.5 rounded text-sm">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Critic breakdown */}
                  {rs.critic_breakdown && Object.keys(rs.critic_breakdown).length > 0 && (
                    <div className="px-4 py-3 border-t">
                      <p className="text-xs font-medium text-gray-500 mb-2">Critic Score Breakdown</p>
                      <div className="space-y-2">
                        {Object.entries(rs.critic_breakdown).map(([name, score]) => (
                          <div key={name} className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 w-44 truncate flex-shrink-0">{name}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
                              <div className={`h-3.5 rounded-full ${barColor(score)}`}
                                style={{ width: `${Math.min(score, 100)}%` }} />
                            </div>
                            <span className={`text-sm font-mono font-bold w-12 text-right ${scoreColor(score)}`}>
                              {score.toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Case results */}
                  {rs.case_results?.length > 0 && (
                    <div className="border-t">
                      <div className="px-4 py-2">
                        <p className="text-xs font-medium text-gray-500">
                          Test Case Results ({rs.case_results.filter(r => r.passed).length}/{rs.case_results.length} passed)
                        </p>
                      </div>
                      <div className="divide-y">
                        {rs.case_results.map((cr, i) => (
                          <div key={i} className={`px-4 py-2 flex items-center gap-3 ${cr.passed ? '' : 'bg-red-50/50'}`}>
                            <span className="text-xs text-gray-300 font-mono w-5 text-right flex-shrink-0">{i + 1}</span>
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cr.passed ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-sm flex-1 truncate">{cr.test_case_name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${decisionBadge(cr.decision)}`}>
                              {cr.decision}
                            </span>
                            <span className={`text-sm font-mono font-bold w-12 text-right ${scoreColor(cr.score)}`}>
                              {cr.score.toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Close button */}
                  <div className="px-4 py-3 border-t bg-gray-50">
                    <button onClick={() => { setSelected(null); setEditing(null) }}
                      className="border px-3 py-1.5 rounded text-sm hover:bg-white">
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
            {certs.length === 0 ? 'No certifications yet. Certify an agent to get started.' : 'No certifications match current filters.'}
          </div>
        )}
      </div>
    </div>
  )
}
