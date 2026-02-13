import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

export default function APM() {
  const [characters, setCharacters] = useState([])
  const [form, setForm] = useState({ character_id: '', content: '', modality: 'text', agent_id: '' })
  const [result, setResult] = useState(null)
  const [enforceForm, setEnforceForm] = useState({ eval_run_id: '', action: 'regenerate' })

  useEffect(() => {
    api.get('/characters').then((r) => setCharacters(r.data))
  }, [])

  const evaluate = async (e) => {
    e.preventDefault()
    const res = await api.post('/apm/evaluate', {
      ...form, character_id: parseInt(form.character_id),
    })
    setResult(res.data)
    setEnforceForm({ ...enforceForm, eval_run_id: String(res.data.eval_run_id) })
  }

  const enforce = async (e) => {
    e.preventDefault()
    await api.post('/apm/enforce', {
      eval_run_id: parseInt(enforceForm.eval_run_id),
      action: enforceForm.action,
    })
  }

  return (
    <div>
      <PageHeader title="APM Configuration" subtitle="Agentic Pipeline Middleware — SDK-style evaluate/enforce" />
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-3">Evaluate</h3>
          <form onSubmit={evaluate} className="bg-white rounded-lg shadow p-4 space-y-3">
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
            <input placeholder="Agent ID (optional)" value={form.agent_id}
              onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm" />
            <select value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm">
              {['text', 'image', 'audio', 'video'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <textarea placeholder="Content..." value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm" rows={4} required />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Evaluate</button>
          </form>
        </div>
        <div>
          <h3 className="font-semibold mb-3">Result & Enforce</h3>
          {result && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Run ID:</span><span>{result.eval_run_id}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Score:</span><span className="font-bold">{result.score?.toFixed(3) ?? 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Decision:</span><span className="font-bold">{result.decision}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Consent:</span><span>{result.consent_verified ? 'OK' : 'FAILED'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Sampled:</span><span>{result.sampled ? 'Yes' : 'No'}</span></div>
              </div>
              {result.flags?.length > 0 && (
                <div className="mt-2">
                  {result.flags.map((f, i) => (
                    <span key={i} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded mr-1">{f}</span>
                  ))}
                </div>
              )}
            </div>
          )}
          <form onSubmit={enforce} className="bg-white rounded-lg shadow p-4 space-y-3">
            <input placeholder="Eval Run ID" value={enforceForm.eval_run_id}
              onChange={(e) => setEnforceForm({ ...enforceForm, eval_run_id: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm" required />
            <select value={enforceForm.action} onChange={(e) => setEnforceForm({ ...enforceForm, action: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm">
              {['regenerate', 'quarantine', 'escalate', 'block', 'override'].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <button type="submit" className="bg-orange-600 text-white px-4 py-2 rounded text-sm">Enforce</button>
          </form>
        </div>
      </div>
      {/* API docs hint */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <p className="font-medium mb-1">SDK Integration</p>
        <code className="block bg-gray-100 rounded p-2 text-xs font-mono">
          POST /api/apm/evaluate — Submit content for evaluation<br />
          POST /api/apm/enforce — Apply enforcement action
        </code>
      </div>
    </div>
  )
}
