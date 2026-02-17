import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

export default function Evaluations() {
  const [runs, setRuns] = useState([])
  const [characters, setCharacters] = useState([])
  const [charMap, setCharMap] = useState({})
  const [criticMap, setCriticMap] = useState({})
  const [showEval, setShowEval] = useState(false)
  const [form, setForm] = useState({ character_id: '', content: '', modality: 'text', territory: '' })
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [c2paOpen, setC2paOpen] = useState(false)
  const [expandedCritic, setExpandedCritic] = useState(null)

  const exportCSV = async () => {
    try {
      const res = await api.get('/export/evaluations?format=csv', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `evaluations_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed', err)
    }
  }

  const load = () => api.get('/evaluations').then((r) => setRuns(r.data))
  useEffect(() => {
    load()
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

  const runEval = async (e) => {
    e.preventDefault()
    setResult(null)
    setSelected(null)
    setDetail(null)
    const res = await api.post('/evaluations', {
      ...form, character_id: parseInt(form.character_id),
    })
    setResult(res.data)
    load()
  }

  const selectRun = async (run) => {
    if (selected === run.id) {
      setSelected(null)
      setDetail(null)
      return
    }
    setSelected(run.id)
    setLoadingDetail(true)
    try {
      const res = await api.get(`/evaluations/${run.id}`)
      setDetail(res.data)
    } catch {
      setDetail(null)
    }
    setLoadingDetail(false)
  }

  const decisionColor = (d) => ({
    pass: 'bg-green-100 text-green-700', regenerate: 'bg-yellow-100 text-yellow-700',
    quarantine: 'bg-orange-100 text-orange-700', escalate: 'bg-red-100 text-red-700',
    block: 'bg-red-200 text-red-800', 'sampled-pass': 'bg-blue-100 text-blue-700',
  }[d] || 'bg-gray-100')

  // API returns scores on 0-1 scale; UI displays 0-100
  const pct = (s) => (s == null ? null : s <= 1 ? s * 100 : s)

  const scoreColor = (s) => {
    const v = pct(s)
    if (v == null) return 'text-gray-400'
    if (v >= 90) return 'text-green-600'
    if (v >= 70) return 'text-yellow-600'
    if (v >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const barColor = (s) => {
    const v = pct(s)
    if (v >= 90) return 'bg-green-400'
    if (v >= 70) return 'bg-yellow-400'
    if (v >= 50) return 'bg-orange-400'
    return 'bg-red-400'
  }

  const renderDetail = (d) => {
    if (!d) return null
    const run = d.eval_run
    const res = d.result
    return (
      <div className="bg-white rounded-lg shadow p-5 mb-4 border-l-4 border-blue-500">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Evaluation #{run.id} — {charMap[run.character_id] || `#${run.character_id}`}</h3>
          <button onClick={() => { setSelected(null); setDetail(null) }} className="text-gray-400 hover:text-gray-600 text-sm">Close</button>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-50 rounded p-2">
            <p className="text-xs text-gray-500">Score</p>
            <p className={`text-xl font-bold ${scoreColor(run.overall_score)}`}>{run.overall_score != null ? pct(run.overall_score).toFixed(1) : 'N/A'}</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-xs text-gray-500">Decision</p>
            <span className={`text-sm px-2 py-0.5 rounded ${decisionColor(run.decision)}`}>{run.decision}</span>
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

        {/* Brand Analysis */}
        {res?.analysis_summary && (
          <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-700">Brand Analysis</p>
            </div>
            <div className="p-4 space-y-4">
              {/* Strengths */}
              {res.analysis_summary.strengths?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">What Works</p>
                  <div className="space-y-1.5">
                    {res.analysis_summary.strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
                        <div><span className="font-medium text-gray-800">{s.point}</span>{s.detail && <span className="text-gray-500"> — {s.detail}</span>}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issues */}
              {res.analysis_summary.issues?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wide">What Is Off or Risky</p>
                  <div className="space-y-1.5">
                    {res.analysis_summary.issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className={`mt-0.5 flex-shrink-0 ${issue.severity === 'high' ? 'text-red-500' : 'text-amber-500'}`}>&#9888;</span>
                        <div className="flex-1">
                          <span className="font-medium text-gray-800">{issue.point}</span>
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                            issue.severity === 'high' ? 'bg-red-100 text-red-700' :
                            issue.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{issue.severity}</span>
                          {issue.detail && <p className="text-gray-500 mt-0.5">{issue.detail}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strategic Recommendation */}
              {res.analysis_summary.summary && (
                <div>
                  <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">Strategic Recommendation</p>
                  <div className="bg-blue-50 border border-blue-100 rounded p-3 text-sm text-blue-900">
                    {res.analysis_summary.summary}
                  </div>
                </div>
              )}

              {/* Improved Version */}
              {res.analysis_summary.improved_version && (
                <div>
                  <p className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">Suggested Improved Version</p>
                  <div className="bg-purple-50 border border-purple-100 rounded p-3 text-sm text-purple-900 whitespace-pre-wrap">
                    {res.analysis_summary.improved_version}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Critic scores */}
        {res?.critic_results?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Critic Scores <span className="text-gray-400 font-normal">(click to expand reasoning)</span></p>
            <div className="space-y-1">
              {res.critic_results.map((cr) => (
                <div key={cr.id}>
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded px-1 py-1 -mx-1 transition-colors"
                    onClick={() => setExpandedCritic(expandedCritic === cr.id ? null : cr.id)}
                  >
                    <span className={`text-xs text-gray-400 w-4 transition-transform ${expandedCritic === cr.id ? 'rotate-90' : ''}`}>&#9654;</span>
                    <span className="text-xs text-gray-500 w-40 truncate flex-shrink-0" title={cr.model_used || ''}>
                      {criticMap[cr.critic_id] || criticMap[String(cr.critic_id)] || `Critic #${cr.critic_id}`}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div className={`h-4 rounded-full ${barColor(cr.score)}`}
                        style={{ width: `${Math.min(pct(cr.score), 100)}%` }} />
                    </div>
                    <span className={`text-sm font-mono font-bold w-12 text-right ${scoreColor(cr.score)}`}>{pct(cr.score).toFixed(1)}</span>
                    <span className="text-xs text-gray-400 w-14 text-right">{cr.latency_ms}ms</span>
                    {cr.estimated_cost != null && cr.estimated_cost > 0 && (
                      <span className="text-xs text-gray-300 w-16 text-right" title={`${cr.prompt_tokens || 0}+${cr.completion_tokens || 0} tokens`}>
                        ${cr.estimated_cost.toFixed(4)}
                      </span>
                    )}
                  </div>
                  {expandedCritic === cr.id && cr.reasoning && (
                    <div className="ml-8 mt-1 mb-2 p-3 bg-gray-50 border border-gray-100 rounded text-xs text-gray-600 whitespace-pre-wrap">
                      {cr.reasoning}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Critic scores from aggregated dict (for seed data evals without full critic_results) */}
        {res?.critic_scores && Object.keys(res.critic_scores).length > 0 && (!res.critic_results || res.critic_results.length === 0) && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Critic Scores (Summary)</p>
            <div className="space-y-2">
              {Object.entries(res.critic_scores).map(([slug, score]) => (
                <div key={slug} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-44 truncate flex-shrink-0">{criticMap[slug] || slug}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div className={`h-4 rounded-full ${barColor(score)}`}
                      style={{ width: `${Math.min(pct(score), 100)}%` }} />
                  </div>
                  <span className={`text-sm font-mono font-bold w-12 text-right ${scoreColor(score)}`}>{pct(score).toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {res?.recommendations?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Recommendations</p>
            <ul className="space-y-1">
              {res.recommendations.map((r, i) => (
                <li key={i} className="text-sm text-gray-600 bg-yellow-50 rounded p-2">{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* C2PA Content Credentials */}
        {run.c2pa_metadata && Object.keys(run.c2pa_metadata).length > 0 && (
          <div className="mt-4 border-t pt-3">
            <button
              onClick={() => setC2paOpen(!c2paOpen)}
              className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 w-full text-left"
            >
              <span className={`transition-transform ${c2paOpen ? 'rotate-90' : ''}`}>&#9654;</span>
              Content Credentials (C2PA)
              <span className="ml-auto text-gray-400 text-xs font-normal">
                v{run.c2pa_metadata.canonsafe_version || '?'}
              </span>
            </button>
            {c2paOpen && (
              <div className="mt-2 bg-gray-50 rounded p-3 space-y-2">
                {/* Highlighted key fields */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { label: 'CanonSafe Version', key: 'canonsafe_version' },
                    { label: 'Eval Run ID', key: 'eval_run_id' },
                    { label: 'Overall Score', key: 'overall_score', fmt: (v) => v != null ? pct(Number(v)).toFixed(1) : 'N/A' },
                    { label: 'Decision', key: 'decision' },
                    { label: 'Character ID', key: 'character_id' },
                    { label: 'Evaluated At', key: 'evaluated_at', fmt: (v) => v ? new Date(v).toLocaleString() : 'N/A' },
                  ].map(({ label, key, fmt }) => (
                    <div key={key} className="bg-white rounded p-2 border border-gray-100">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-sm font-medium text-gray-700">
                        {fmt ? fmt(run.c2pa_metadata[key]) : (run.c2pa_metadata[key] ?? 'N/A')}
                      </p>
                    </div>
                  ))}
                </div>
                {/* Full JSON (collapsible detail) */}
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-600">Full C2PA Metadata (JSON)</summary>
                  <pre className="mt-1 bg-white rounded p-2 overflow-auto text-gray-500 border border-gray-100">
                    {JSON.stringify(run.c2pa_metadata, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Evaluations"
        subtitle={`${runs.length} evaluation runs — Click any row to view details`}
        action={
          <div className="flex gap-2">
            <button onClick={exportCSV} className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50">
              Export CSV
            </button>
            <button onClick={() => { setShowEval(!showEval); setResult(null) }} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
              {showEval ? 'Close' : 'New Evaluation'}
            </button>
          </div>
        }
      />

      {/* New evaluation form */}
      {showEval && (
        <form onSubmit={runEval} className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
          <select value={form.character_id} onChange={(e) => setForm({ ...form, character_id: e.target.value })}
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
            <select value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value })}
              className="border rounded px-3 py-2 text-sm">
              {['text', 'image', 'audio', 'video'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input placeholder="Territory (optional)" value={form.territory}
              onChange={(e) => setForm({ ...form, territory: e.target.value })}
              className="border rounded px-3 py-2 text-sm flex-1" />
          </div>
          <textarea placeholder="Content to evaluate..." value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm" rows={4} required />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Run Evaluation</button>
        </form>
      )}

      {/* Live result from new evaluation */}
      {result && renderDetail(result)}

      {/* Selected run detail */}
      {selected && !result && (
        loadingDetail
          ? <div className="bg-white rounded-lg shadow p-8 mb-4 text-center text-gray-400">Loading evaluation details...</div>
          : detail && renderDetail(detail)
      )}

      {/* History table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 w-12">ID</th>
              <th className="text-left px-4 py-2">Character</th>
              <th className="text-left px-4 py-2 w-20">Score</th>
              <th className="text-left px-4 py-2 w-28">Decision</th>
              <th className="text-left px-4 py-2 w-16">Tier</th>
              <th className="text-left px-4 py-2 w-28">Agent</th>
              <th className="text-left px-4 py-2 w-24">Date</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}
                onClick={() => selectRun(r)}
                className={`border-t cursor-pointer transition-colors ${
                  selected === r.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}>
                <td className="px-4 py-2 text-gray-400">{r.id}</td>
                <td className="px-4 py-2 font-medium">{charMap[r.character_id] || `#${r.character_id}`}</td>
                <td className={`px-4 py-2 font-mono font-bold ${scoreColor(r.overall_score)}`}>
                  {r.overall_score != null ? pct(r.overall_score).toFixed(1) : '-'}
                </td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${decisionColor(r.decision)}`}>{r.decision}</span>
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">{r.tier}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">{r.agent_id || '-'}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {runs.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-400">No evaluations yet. Run one above.</div>
        )}
      </div>
    </div>
  )
}
