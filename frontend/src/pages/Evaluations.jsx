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
            <p className={`text-xl font-bold ${scoreColor(run.overall_score)}`}>{run.overall_score?.toFixed(1) ?? 'N/A'}</p>
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

        {/* Critic scores */}
        {res?.critic_results?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Critic Scores</p>
            <div className="space-y-2">
              {res.critic_results.map((cr) => (
                <div key={cr.id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-44 truncate flex-shrink-0">
                    {criticMap[cr.critic_id] || criticMap[String(cr.critic_id)] || `Critic #${cr.critic_id}`}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div className={`h-4 rounded-full ${barColor(cr.score)}`}
                      style={{ width: `${Math.min(cr.score, 100)}%` }} />
                  </div>
                  <span className={`text-sm font-mono font-bold w-12 text-right ${scoreColor(cr.score)}`}>{cr.score.toFixed(1)}</span>
                  <span className="text-xs text-gray-400 w-14 text-right">{cr.latency_ms}ms</span>
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
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Recommendations</p>
            <ul className="space-y-1">
              {res.recommendations.map((r, i) => (
                <li key={i} className="text-sm text-gray-600 bg-yellow-50 rounded p-2">{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* C2PA */}
        {run.c2pa_metadata && Object.keys(run.c2pa_metadata).length > 0 && (
          <div className="mt-4 border-t pt-3">
            <p className="text-xs font-medium text-gray-400 mb-1">C2PA Provenance Metadata</p>
            <pre className="text-xs bg-gray-50 rounded p-2 overflow-auto text-gray-500">
              {JSON.stringify(run.c2pa_metadata, null, 2)}
            </pre>
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
          <button onClick={() => { setShowEval(!showEval); setResult(null) }} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
            {showEval ? 'Close' : 'New Evaluation'}
          </button>
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
                  {r.overall_score?.toFixed(1) ?? '-'}
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
