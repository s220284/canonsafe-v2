import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

const TIER_STYLES = {
  base: { badge: 'bg-gray-100 text-gray-600', label: 'Base' },
  canonsafe_certified: { badge: 'bg-blue-100 text-blue-700', label: 'CanonSafe Certified' },
}

const TAG_COLORS = [
  'bg-blue-50 text-blue-600', 'bg-green-50 text-green-600', 'bg-purple-50 text-purple-600',
  'bg-orange-50 text-orange-600', 'bg-pink-50 text-pink-600', 'bg-teal-50 text-teal-600',
]

export default function TestSuites() {
  const [suites, setSuites] = useState([])
  const [characters, setCharacters] = useState([])
  const [charMap, setCharMap] = useState({})

  // Selection & detail
  const [selected, setSelected] = useState(null)
  const [cases, setCases] = useState([])
  const [loadingCases, setLoadingCases] = useState(false)

  // Suite editing
  const [editingSuite, setEditingSuite] = useState(null)
  const [suiteForm, setSuiteForm] = useState({})
  const [savingSuite, setSavingSuite] = useState(false)

  // Case editing
  const [editingCase, setEditingCase] = useState(null)
  const [caseForm, setCaseForm] = useState({})
  const [savingCase, setSavingCase] = useState(false)

  // Add case
  const [addingCase, setAddingCase] = useState(false)
  const [newCaseForm, setNewCaseForm] = useState({ name: '', prompt: '', expected: '', tags: '' })

  // Run suite
  const [runningSuite, setRunningSuite] = useState(null)
  const [runResult, setRunResult] = useState(null)

  // Create suite
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '', character_id: '', tier: 'base', passing_threshold: 90 })

  const load = () => api.get('/test-suites').then((r) => setSuites(r.data))
  useEffect(() => {
    load()
    api.get('/characters').then((r) => {
      setCharacters(r.data)
      const map = {}
      r.data.forEach(c => { map[c.id] = c.name })
      setCharMap(map)
    })
  }, [])

  const selectSuite = async (suite) => {
    if (selected === suite.id) {
      setSelected(null)
      setCases([])
      setEditingSuite(null)
      setEditingCase(null)
      setAddingCase(false)
      return
    }
    setSelected(suite.id)
    setEditingSuite(null)
    setEditingCase(null)
    setAddingCase(false)
    setLoadingCases(true)
    try {
      const res = await api.get(`/test-suites/${suite.id}/cases`)
      setCases(res.data)
    } catch {
      setCases([])
    }
    setLoadingCases(false)
  }

  const createSuite = async (e) => {
    e.preventDefault()
    await api.post('/test-suites', {
      ...createForm,
      character_id: parseInt(createForm.character_id),
      passing_threshold: parseFloat(createForm.passing_threshold),
    })
    setCreateForm({ name: '', description: '', character_id: '', tier: 'base', passing_threshold: 90 })
    setShowCreate(false)
    load()
  }

  // Suite edit
  const startEditSuite = (suite) => {
    setEditingSuite(suite.id)
    setSuiteForm({
      name: suite.name,
      description: suite.description || '',
      tier: suite.tier,
      passing_threshold: suite.passing_threshold,
    })
  }

  const saveSuite = async (suiteId) => {
    setSavingSuite(true)
    try {
      await api.patch(`/test-suites/${suiteId}`, {
        ...suiteForm,
        passing_threshold: parseFloat(suiteForm.passing_threshold),
      })
      setEditingSuite(null)
      load()
    } catch (err) {
      console.error('Save suite failed', err)
    }
    setSavingSuite(false)
  }

  // Case edit
  const startEditCase = (tc) => {
    setEditingCase(tc.id)
    setCaseForm({
      name: tc.name,
      input_content: JSON.stringify(tc.input_content, null, 2),
      expected_outcome: JSON.stringify(tc.expected_outcome, null, 2),
      tags: (tc.tags || []).join(', '),
    })
  }

  const saveCase = async (suiteId, caseId) => {
    setSavingCase(true)
    try {
      let input_content, expected_outcome
      try { input_content = JSON.parse(caseForm.input_content) } catch { input_content = undefined }
      try { expected_outcome = JSON.parse(caseForm.expected_outcome) } catch { expected_outcome = undefined }
      const payload = { name: caseForm.name }
      if (input_content !== undefined) payload.input_content = input_content
      if (expected_outcome !== undefined) payload.expected_outcome = expected_outcome
      payload.tags = caseForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      await api.patch(`/test-suites/${suiteId}/cases/${caseId}`, payload)
      setEditingCase(null)
      const res = await api.get(`/test-suites/${suiteId}/cases`)
      setCases(res.data)
    } catch (err) {
      console.error('Save case failed', err)
    }
    setSavingCase(false)
  }

  const deleteCase = async (suiteId, caseId) => {
    if (!confirm('Delete this test case?')) return
    await api.delete(`/test-suites/${suiteId}/cases/${caseId}`)
    const res = await api.get(`/test-suites/${suiteId}/cases`)
    setCases(res.data)
  }

  const addCase = async (suiteId) => {
    setSavingCase(true)
    try {
      await api.post(`/test-suites/${suiteId}/cases`, {
        name: newCaseForm.name,
        input_content: { prompt: newCaseForm.prompt, expected: newCaseForm.expected },
        expected_outcome: { min_score: 88.0, must_pass: true },
        tags: newCaseForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      })
      setNewCaseForm({ name: '', prompt: '', expected: '', tags: '' })
      setAddingCase(false)
      const res = await api.get(`/test-suites/${suiteId}/cases`)
      setCases(res.data)
    } catch (err) {
      console.error('Add case failed', err)
    }
    setSavingCase(false)
  }

  const runSuite = async (suiteId) => {
    setRunningSuite(suiteId)
    setRunResult(null)
    try {
      const res = await api.post(`/test-suites/${suiteId}/run`)
      setRunResult(res.data)
    } catch (err) {
      setRunResult({ error: err.response?.data?.detail || err.message })
    }
    setRunningSuite(null)
  }

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

  const decisionBadge = (d) => ({
    pass: 'bg-green-100 text-green-700',
    regenerate: 'bg-yellow-100 text-yellow-700',
    quarantine: 'bg-orange-100 text-orange-700',
    escalate: 'bg-red-100 text-red-700',
    block: 'bg-red-200 text-red-800',
    error: 'bg-red-200 text-red-800',
  }[d] || 'bg-gray-100 text-gray-600')

  const thresholdColor = (t) => {
    if (t >= 90) return 'text-green-600'
    if (t >= 85) return 'text-blue-600'
    if (t >= 80) return 'text-yellow-600'
    return 'text-orange-600'
  }

  return (
    <div>
      <PageHeader
        title="Test Suites"
        subtitle={`${suites.length} test suites, ${suites.reduce((a, s) => a, 0) || 'multiple'} test cases — Click any suite to view and edit cases`}
        action={
          <button onClick={() => setShowCreate(!showCreate)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
            {showCreate ? 'Close' : 'New Suite'}
          </button>
        }
      />

      {/* Create suite form */}
      {showCreate && (
        <form onSubmit={createSuite} className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
          <h3 className="font-medium text-sm text-gray-500">Create New Test Suite</h3>
          <input placeholder="Suite Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm" required />
          <textarea placeholder="Description" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm" rows={2} />
          <select value={createForm.character_id} onChange={(e) => setCreateForm({ ...createForm, character_id: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm" required>
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
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Tier</label>
              <select value={createForm.tier} onChange={(e) => setCreateForm({ ...createForm, tier: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm mt-0.5">
                <option value="base">Base</option>
                <option value="canonsafe_certified">CanonSafe Certified</option>
              </select>
            </div>
            <div className="w-40">
              <label className="text-xs text-gray-500">Pass Threshold</label>
              <input type="number" step="0.5" value={createForm.passing_threshold}
                onChange={(e) => setCreateForm({ ...createForm, passing_threshold: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm mt-0.5" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="border px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Suites list */}
      <div className="space-y-3">
        {suites.map((s) => {
          const isSelected = selected === s.id
          const isEditing = editingSuite === s.id
          const tier = TIER_STYLES[s.tier] || TIER_STYLES.base
          const charName = charMap[s.character_id] || `Character #${s.character_id}`

          return (
            <div key={s.id}
              className={`bg-white rounded-lg shadow transition-all ${
                isSelected ? 'ring-2 ring-blue-300' : 'hover:shadow-md'
              }`}>

              {/* Suite header - clickable */}
              <div className="p-4 cursor-pointer" onClick={() => selectSuite(s)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {charName[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{s.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${tier.badge}`}>{tier.label}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm text-blue-500">{charName}</span>
                        {s.description && <span className="text-xs text-gray-400">- {s.description}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Threshold</p>
                      <p className={`text-lg font-bold font-mono ${thresholdColor(s.passing_threshold)}`}>
                        {s.passing_threshold}
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
                  {/* Suite edit form or info bar */}
                  {isEditing ? (
                    <div className="p-4 bg-blue-50 space-y-3">
                      <h4 className="text-sm font-medium text-gray-500">Edit Suite</h4>
                      <input value={suiteForm.name} onChange={(e) => setSuiteForm({ ...suiteForm, name: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm" placeholder="Suite Name" />
                      <textarea value={suiteForm.description} onChange={(e) => setSuiteForm({ ...suiteForm, description: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm" rows={2} placeholder="Description" />
                      <div className="flex gap-3">
                        <select value={suiteForm.tier} onChange={(e) => setSuiteForm({ ...suiteForm, tier: e.target.value })}
                          className="border rounded px-3 py-2 text-sm">
                          <option value="base">Base</option>
                          <option value="canonsafe_certified">CanonSafe Certified</option>
                        </select>
                        <input type="number" step="0.5" value={suiteForm.passing_threshold}
                          onChange={(e) => setSuiteForm({ ...suiteForm, passing_threshold: e.target.value })}
                          className="border rounded px-3 py-2 text-sm w-32" placeholder="Threshold" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveSuite(s.id)} disabled={savingSuite}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50">
                          {savingSuite ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingSuite(null)} className="border px-3 py-1.5 rounded text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>ID: {s.id}</span>
                        <span>Created: {new Date(s.created_at).toLocaleDateString()}</span>
                        <span>{cases.length} test case{cases.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setRunResult(null); runSuite(s.id) }}
                          disabled={runningSuite === s.id}
                          className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 disabled:opacity-50">
                          {runningSuite === s.id ? 'Running...' : 'Run Suite'}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); startEditSuite(s) }}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                          Edit Suite
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setAddingCase(true); setEditingCase(null) }}
                          className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                          Add Case
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Add case form */}
                  {addingCase && !isEditing && (
                    <div className="p-4 bg-green-50 border-t space-y-3">
                      <h4 className="text-sm font-medium text-gray-500">Add Test Case</h4>
                      <input value={newCaseForm.name} onChange={(e) => setNewCaseForm({ ...newCaseForm, name: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm" placeholder="Test case name" required />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Input Prompt</label>
                          <textarea value={newCaseForm.prompt} onChange={(e) => setNewCaseForm({ ...newCaseForm, prompt: e.target.value })}
                            className="w-full border rounded px-3 py-2 text-sm mt-0.5" rows={2} placeholder="What do you like to do?" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Expected Response</label>
                          <textarea value={newCaseForm.expected} onChange={(e) => setNewCaseForm({ ...newCaseForm, expected: e.target.value })}
                            className="w-full border rounded px-3 py-2 text-sm mt-0.5" rows={2} placeholder="Expected response keywords" />
                        </div>
                      </div>
                      <input value={newCaseForm.tags} onChange={(e) => setNewCaseForm({ ...newCaseForm, tags: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm" placeholder="Tags (comma-separated): core, voice, safety" />
                      <div className="flex gap-2">
                        <button onClick={() => addCase(s.id)} disabled={savingCase || !newCaseForm.name}
                          className="bg-green-600 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50">
                          {savingCase ? 'Adding...' : 'Add Case'}
                        </button>
                        <button onClick={() => setAddingCase(false)} className="border px-3 py-1.5 rounded text-sm">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Run results */}
                  {runResult && selected === s.id && (
                    <div className="border-t">
                      {runResult.error ? (
                        <div className="p-4 bg-red-50 text-red-700 text-sm">{runResult.error}</div>
                      ) : (
                        <div className="p-4 bg-indigo-50">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-sm">Run Results</h4>
                            <button onClick={() => setRunResult(null)} className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                            <div className="bg-white rounded p-2">
                              <p className="text-xs text-gray-400">Avg Score</p>
                              <p className={`text-xl font-bold font-mono ${scoreColor(runResult.avg_score)}`}>{runResult.avg_score?.toFixed(1)}</p>
                            </div>
                            <div className="bg-white rounded p-2">
                              <p className="text-xs text-gray-400">Pass Rate</p>
                              <p className={`text-xl font-bold font-mono ${scoreColor(runResult.pass_rate * 100)}`}>{(runResult.pass_rate * 100).toFixed(0)}%</p>
                            </div>
                            <div className="bg-white rounded p-2">
                              <p className="text-xs text-gray-400">Passed</p>
                              <p className="text-xl font-bold text-green-600">{runResult.passed_cases}</p>
                            </div>
                            <div className="bg-white rounded p-2">
                              <p className="text-xs text-gray-400">Failed</p>
                              <p className="text-xl font-bold text-red-600">{runResult.failed_cases}</p>
                            </div>
                            <div className="bg-white rounded p-2">
                              <p className="text-xs text-gray-400">Overall</p>
                              <span className={`text-sm font-bold px-2 py-0.5 rounded ${runResult.overall_passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {runResult.overall_passed ? 'PASSED' : 'FAILED'}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            {runResult.case_results?.map((cr, i) => (
                              <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded ${cr.passed ? 'bg-white' : 'bg-red-50'}`}>
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cr.passed ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="text-sm flex-1 truncate">{cr.test_case_name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${decisionBadge(cr.decision)}`}>{cr.decision}</span>
                                <span className={`text-sm font-mono font-bold w-12 text-right ${scoreColor(cr.score)}`}>{cr.score?.toFixed(1)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Test cases */}
                  {loadingCases ? (
                    <div className="p-8 text-center text-gray-400">Loading test cases...</div>
                  ) : (
                    <div className="divide-y">
                      {cases.map((tc, idx) => {
                        const isEditingThis = editingCase === tc.id
                        return (
                          <div key={tc.id} className={`p-4 ${isEditingThis ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                            {isEditingThis ? (
                              /* Edit case form */
                              <div className="space-y-3">
                                <input value={caseForm.name} onChange={(e) => setCaseForm({ ...caseForm, name: e.target.value })}
                                  className="w-full border rounded px-3 py-2 text-sm font-medium" />
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs text-gray-500">Input Content (JSON)</label>
                                    <textarea value={caseForm.input_content}
                                      onChange={(e) => setCaseForm({ ...caseForm, input_content: e.target.value })}
                                      className="w-full border rounded px-3 py-2 text-xs font-mono mt-0.5" rows={4} />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500">Expected Outcome (JSON)</label>
                                    <textarea value={caseForm.expected_outcome}
                                      onChange={(e) => setCaseForm({ ...caseForm, expected_outcome: e.target.value })}
                                      className="w-full border rounded px-3 py-2 text-xs font-mono mt-0.5" rows={4} />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500">Tags (comma-separated)</label>
                                  <input value={caseForm.tags} onChange={(e) => setCaseForm({ ...caseForm, tags: e.target.value })}
                                    className="w-full border rounded px-3 py-2 text-sm mt-0.5" />
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => saveCase(s.id, tc.id)} disabled={savingCase}
                                    className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50">
                                    {savingCase ? 'Saving...' : 'Save'}
                                  </button>
                                  <button onClick={() => setEditingCase(null)} className="border px-3 py-1.5 rounded text-sm">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              /* View case */
                              <div>
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-300 font-mono w-6">{idx + 1}.</span>
                                    <h4 className="font-medium text-sm">{tc.name}</h4>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button onClick={() => startEditCase(tc)}
                                      className="text-xs text-blue-600 hover:text-blue-800 px-2 py-0.5 rounded hover:bg-blue-50">
                                      Edit
                                    </button>
                                    <button onClick={() => deleteCase(s.id, tc.id)}
                                      className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50">
                                      Delete
                                    </button>
                                  </div>
                                </div>
                                <div className="ml-8 mt-1.5 grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-xs text-gray-400 mb-0.5">Input</p>
                                    {tc.input_content?.prompt ? (
                                      <div className="text-sm">
                                        <p className="text-gray-700 italic">&ldquo;{tc.input_content.prompt}&rdquo;</p>
                                        {tc.input_content.expected && (
                                          <p className="text-xs text-gray-400 mt-0.5">Expected: {tc.input_content.expected}</p>
                                        )}
                                      </div>
                                    ) : (
                                      <pre className="text-xs bg-gray-50 rounded p-1.5 overflow-auto max-h-20 font-mono text-gray-500">
                                        {JSON.stringify(tc.input_content, null, 2)}
                                      </pre>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-400 mb-0.5">Expected Outcome</p>
                                    <div className="flex items-center gap-2 text-sm">
                                      {tc.expected_outcome?.min_score != null && (
                                        <span className={`font-mono font-bold ${thresholdColor(tc.expected_outcome.min_score)}`}>
                                          Min: {tc.expected_outcome.min_score}
                                        </span>
                                      )}
                                      {tc.expected_outcome?.must_pass != null && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                                          tc.expected_outcome.must_pass ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                          {tc.expected_outcome.must_pass ? 'Must Pass' : 'Optional'}
                                        </span>
                                      )}
                                      {!tc.expected_outcome?.min_score && !tc.expected_outcome?.must_pass && (
                                        <pre className="text-xs bg-gray-50 rounded p-1.5 font-mono text-gray-500">
                                          {JSON.stringify(tc.expected_outcome, null, 2)}
                                        </pre>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {tc.tags?.length > 0 && (
                                  <div className="ml-8 mt-2 flex gap-1 flex-wrap">
                                    {tc.tags.map((t, i) => (
                                      <span key={i} className={`text-xs px-2 py-0.5 rounded ${TAG_COLORS[i % TAG_COLORS.length]}`}>{t}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {cases.length === 0 && !loadingCases && (
                        <div className="p-6 text-center text-gray-400 text-sm">
                          No test cases yet. Click "Add Case" to create one.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {suites.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
            No test suites yet. Create one to get started.
          </div>
        )}
      </div>
    </div>
  )
}
