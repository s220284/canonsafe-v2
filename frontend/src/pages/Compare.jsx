import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

const MODES = [
  { key: 'runs', label: 'Compare Runs' },
  { key: 'head_to_head', label: 'Head-to-Head' },
  { key: 'versions', label: 'Compare Versions' },
]

const decisionColor = (d) => ({
  pass: 'bg-green-100 text-green-700',
  regenerate: 'bg-yellow-100 text-yellow-700',
  quarantine: 'bg-orange-100 text-orange-700',
  escalate: 'bg-red-100 text-red-700',
  block: 'bg-red-200 text-red-800',
  'sampled-pass': 'bg-blue-100 text-blue-700',
}[d] || 'bg-gray-100 text-gray-700')

const scoreColor = (s) => {
  if (s == null) return 'text-gray-400'
  if (s >= 90) return 'text-green-600'
  if (s >= 70) return 'text-yellow-600'
  if (s >= 50) return 'text-orange-600'
  return 'text-red-600'
}

export default function Compare() {
  const [mode, setMode] = useState('runs')
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])

  // Form state for each mode
  const [runsForm, setRunsForm] = useState({ run_id_a: '', run_id_b: '' })
  const [h2hForm, setH2hForm] = useState({ content: '', modality: 'text', character_id_a: '', character_id_b: '' })
  const [versionsForm, setVersionsForm] = useState({ character_id: '', version_a: '', version_b: '', content: '', modality: 'text' })

  useEffect(() => {
    api.get('/characters').then((r) => setCharacters(r.data)).catch(() => {})
    api.get('/compare/history').then((r) => setHistory(r.data)).catch(() => {})
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      let res
      if (mode === 'runs') {
        res = await api.post('/compare/runs', {
          run_id_a: parseInt(runsForm.run_id_a),
          run_id_b: parseInt(runsForm.run_id_b),
        })
      } else if (mode === 'head_to_head') {
        res = await api.post('/compare/head-to-head', {
          content: h2hForm.content,
          modality: h2hForm.modality,
          character_id_a: parseInt(h2hForm.character_id_a),
          character_id_b: parseInt(h2hForm.character_id_b),
        })
      } else {
        res = await api.post('/compare/versions', {
          character_id: parseInt(versionsForm.character_id),
          version_a: parseInt(versionsForm.version_a),
          version_b: parseInt(versionsForm.version_b),
          content: versionsForm.content,
          modality: versionsForm.modality,
        })
      }
      setResult(res.data)
      // Refresh history
      api.get('/compare/history').then((r) => setHistory(r.data)).catch(() => {})
    } catch (err) {
      setError(err.response?.data?.detail || 'Comparison failed')
    }
    setLoading(false)
  }

  const renderCharacterSelect = (value, onChange, label) => (
    <select value={value} onChange={onChange} className="w-full border rounded px-3 py-2 text-sm" required>
      <option value="">{label}</option>
      {characters.some(c => c.is_main) && (
        <optgroup label="Main Characters">
          {characters.filter(c => c.is_main).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </optgroup>
      )}
      {characters.some(c => !c.is_main && c.is_focus) && (
        <optgroup label="Focus Characters">
          {characters.filter(c => !c.is_main && c.is_focus).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </optgroup>
      )}
      {characters.some(c => !c.is_main && !c.is_focus) && (
        <optgroup label="Other Characters">
          {characters.filter(c => !c.is_main && !c.is_focus).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </optgroup>
      )}
    </select>
  )

  const modalitySelect = (value, onChange) => (
    <select value={value} onChange={onChange} className="border rounded px-3 py-2 text-sm">
      {['text', 'image', 'audio', 'video'].map(m => <option key={m} value={m}>{m}</option>)}
    </select>
  )

  // ─── Comparison Results Display ─────────────────────────────

  const renderResults = () => {
    if (!result) return null
    const { side_a, side_b, comparison } = result
    const runA = side_a.eval_run
    const runB = side_b.eval_run
    const scoreA = runA.overall_score
    const scoreB = runB.overall_score
    const diff = comparison.score_diff

    // Label for sides
    let labelA = `Run #${runA.id}`
    let labelB = `Run #${runB.id}`
    if (result.mode === 'head_to_head' && result.character_a) {
      labelA = result.character_a.name
      labelB = result.character_b.name
    } else if (result.mode === 'versions' && result.version_a) {
      labelA = `v${result.version_a.version_number}`
      labelB = `v${result.version_b.version_number}`
    }

    return (
      <div className="space-y-4 mt-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Side A */}
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <p className="text-xs text-gray-500 mb-1">Side A - {labelA}</p>
            <p className={`text-3xl font-bold ${scoreColor(scoreA)}`}>
              {scoreA != null ? scoreA.toFixed(2) : 'N/A'}
            </p>
            <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${decisionColor(runA.decision)}`}>
              {runA.decision || 'N/A'}
            </span>
          </div>

          {/* Diff Center */}
          <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center justify-center">
            <p className="text-xs text-gray-500 mb-1">Difference</p>
            <div className="flex items-center gap-2">
              {diff > 0 && <span className="text-green-500 text-lg">&larr;</span>}
              <p className={`text-2xl font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {diff > 0 ? '+' : ''}{diff.toFixed(2)}
              </p>
              {diff < 0 && <span className="text-red-500 text-lg">&rarr;</span>}
            </div>
            <p className={`text-xs mt-1 ${comparison.decisions_match ? 'text-green-600' : 'text-orange-600'}`}>
              {comparison.decisions_match ? 'Decisions match' : 'Decisions differ'}
            </p>
          </div>

          {/* Side B */}
          <div className="bg-white rounded-lg shadow p-4 border-r-4 border-purple-500">
            <p className="text-xs text-gray-500 mb-1">Side B - {labelB}</p>
            <p className={`text-3xl font-bold ${scoreColor(scoreB)}`}>
              {scoreB != null ? scoreB.toFixed(2) : 'N/A'}
            </p>
            <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${decisionColor(runB.decision)}`}>
              {runB.decision || 'N/A'}
            </span>
          </div>
        </div>

        {/* Decision Badges Side-by-Side */}
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs font-medium text-gray-500 mb-3">Decision Comparison</p>
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">{labelA}</p>
              <span className={`text-sm px-3 py-1 rounded font-medium ${decisionColor(runA.decision)}`}>
                {runA.decision || 'N/A'}
              </span>
            </div>
            <span className="text-gray-300 text-xl">vs</span>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">{labelB}</p>
              <span className={`text-sm px-3 py-1 rounded font-medium ${decisionColor(runB.decision)}`}>
                {runB.decision || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Critic Comparison Table */}
        {comparison.critic_diffs.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs font-medium text-gray-500 mb-3">Critic Score Comparison</p>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Critic</th>
                  <th className="text-right px-3 py-2 w-20">Score A</th>
                  <th className="px-3 py-2 w-48">Comparison</th>
                  <th className="text-left px-3 py-2 w-20">Score B</th>
                  <th className="text-right px-3 py-2 w-20">Diff</th>
                </tr>
              </thead>
              <tbody>
                {comparison.critic_diffs.map((cd, i) => {
                  const sA = cd.score_a
                  const sB = cd.score_b
                  const maxVal = Math.max(sA || 0, sB || 0, 1)
                  const barWidthA = sA != null ? (sA / 100) * 100 : 0
                  const barWidthB = sB != null ? (sB / 100) * 100 : 0
                  const diffVal = cd.diff
                  return (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 text-gray-700 font-medium">{cd.critic_name}</td>
                      <td className={`px-3 py-2 text-right font-mono font-bold ${scoreColor(sA)}`}>
                        {sA != null ? sA.toFixed(1) : '-'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative h-5">
                          {/* Bar A (blue, from left) */}
                          <div className="absolute top-0 left-0 h-2.5 bg-blue-400 rounded-l"
                            style={{ width: `${barWidthA}%`, maxWidth: '100%' }} />
                          {/* Bar B (purple, from left, offset down) */}
                          <div className="absolute bottom-0 left-0 h-2.5 bg-purple-400 rounded-l"
                            style={{ width: `${barWidthB}%`, maxWidth: '100%' }} />
                        </div>
                      </td>
                      <td className={`px-3 py-2 font-mono font-bold ${scoreColor(sB)}`}>
                        {sB != null ? sB.toFixed(1) : '-'}
                      </td>
                      <td className={`px-3 py-2 text-right font-mono font-bold ${
                        diffVal == null ? 'text-gray-400'
                          : diffVal > 0 ? 'text-green-600'
                          : diffVal < 0 ? 'text-red-600'
                          : 'text-gray-500'
                      }`}>
                        {diffVal != null ? (diffVal > 0 ? '+' : '') + diffVal.toFixed(1) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Flags Comparison */}
        {(comparison.flags_only_a.length > 0 || comparison.flags_only_b.length > 0 || comparison.flags_common.length > 0) && (
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs font-medium text-gray-500 mb-3">Flags Comparison</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-blue-600 font-medium mb-2">Only in A</p>
                <div className="flex flex-wrap gap-1">
                  {comparison.flags_only_a.length === 0
                    ? <span className="text-xs text-gray-400">None</span>
                    : comparison.flags_only_a.map((f, i) => (
                      <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{f}</span>
                    ))
                  }
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium mb-2">Common</p>
                <div className="flex flex-wrap gap-1">
                  {comparison.flags_common.length === 0
                    ? <span className="text-xs text-gray-400">None</span>
                    : comparison.flags_common.map((f, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{f}</span>
                    ))
                  }
                </div>
              </div>
              <div>
                <p className="text-xs text-purple-600 font-medium mb-2">Only in B</p>
                <div className="flex flex-wrap gap-1">
                  {comparison.flags_only_b.length === 0
                    ? <span className="text-xs text-gray-400">None</span>
                    : comparison.flags_only_b.map((f, i) => (
                      <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{f}</span>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Content Preview */}
        {result.content && (
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Input Content</p>
            <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap">{result.content}</div>
          </div>
        )}
      </div>
    )
  }

  // ─── History table ──────────────────────────────────────────

  const renderHistory = () => {
    if (history.length === 0) return null
    return (
      <div className="mt-8">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Recent Comparisons</h3>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2">Mode</th>
                <th className="text-left px-4 py-2">Details</th>
                <th className="text-right px-4 py-2">Score Diff</th>
                <th className="text-center px-4 py-2">Decisions</th>
                <th className="text-left px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{h.mode}</span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600">
                    {h.mode === 'runs' && `Run #${h.run_id_a} vs Run #${h.run_id_b}`}
                    {h.mode === 'head_to_head' && `${h.character_name_a || h.character_id_a} vs ${h.character_name_b || h.character_id_b}`}
                    {h.mode === 'versions' && `${h.character_name || h.character_id} v${h.version_a} vs v${h.version_b}`}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono font-bold ${
                    h.score_diff > 0 ? 'text-green-600' : h.score_diff < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {h.score_diff > 0 ? '+' : ''}{h.score_diff?.toFixed(2) || '0'}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${h.decisions_match ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                      {h.decisions_match ? 'Match' : 'Differ'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-400">
                    {h.created_at ? new Date(h.created_at).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Pairwise Comparison"
        subtitle="Compare two eval runs, test head-to-head, or compare card versions"
      />

      {/* Mode Selector */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setResult(null); setError(null) }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === m.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Forms */}
      <form onSubmit={submit} className="bg-white rounded-lg shadow p-5 space-y-4">
        {mode === 'runs' && (
          <>
            <p className="text-sm text-gray-500">Enter two evaluation run IDs to compare their results side-by-side.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Run ID A</label>
                <input
                  type="number"
                  value={runsForm.run_id_a}
                  onChange={(e) => setRunsForm({ ...runsForm, run_id_a: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="e.g. 1"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Run ID B</label>
                <input
                  type="number"
                  value={runsForm.run_id_b}
                  onChange={(e) => setRunsForm({ ...runsForm, run_id_b: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="e.g. 2"
                  required
                />
              </div>
            </div>
          </>
        )}

        {mode === 'head_to_head' && (
          <>
            <p className="text-sm text-gray-500">Evaluate the same content against two different characters.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Character A</label>
                {renderCharacterSelect(h2hForm.character_id_a, (e) => setH2hForm({ ...h2hForm, character_id_a: e.target.value }), 'Select Character A...')}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Character B</label>
                {renderCharacterSelect(h2hForm.character_id_b, (e) => setH2hForm({ ...h2hForm, character_id_b: e.target.value }), 'Select Character B...')}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Modality</label>
              {modalitySelect(h2hForm.modality, (e) => setH2hForm({ ...h2hForm, modality: e.target.value }))}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Content</label>
              <textarea
                value={h2hForm.content}
                onChange={(e) => setH2hForm({ ...h2hForm, content: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
                rows={4}
                placeholder="Enter content to evaluate against both characters..."
                required
              />
            </div>
          </>
        )}

        {mode === 'versions' && (
          <>
            <p className="text-sm text-gray-500">Compare how the same content scores across two card versions of a character.</p>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Character</label>
              {renderCharacterSelect(versionsForm.character_id, (e) => setVersionsForm({ ...versionsForm, character_id: e.target.value }), 'Select Character...')}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Version A (number)</label>
                <input
                  type="number"
                  value={versionsForm.version_a}
                  onChange={(e) => setVersionsForm({ ...versionsForm, version_a: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="e.g. 1"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Version B (number)</label>
                <input
                  type="number"
                  value={versionsForm.version_b}
                  onChange={(e) => setVersionsForm({ ...versionsForm, version_b: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="e.g. 2"
                  min="1"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Modality</label>
              {modalitySelect(versionsForm.modality, (e) => setVersionsForm({ ...versionsForm, modality: e.target.value }))}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Content</label>
              <textarea
                value={versionsForm.content}
                onChange={(e) => setVersionsForm({ ...versionsForm, content: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
                rows={4}
                placeholder="Enter content to evaluate with both versions..."
                required
              />
            </div>
          </>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded p-3">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Comparing...' : 'Compare'}
        </button>
      </form>

      {/* Results */}
      {renderResults()}

      {/* History */}
      {renderHistory()}
    </div>
  )
}
