import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

const MODEL_TYPES = [
  { value: 'openai_compatible', label: 'OpenAI Compatible' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'huggingface', label: 'HuggingFace' },
  { value: 'custom_endpoint', label: 'Custom Endpoint' },
]

const CAPABILITIES = ['text', 'image', 'audio', 'video']

const HEALTH_STYLES = {
  healthy: { dot: 'bg-green-500', label: 'Healthy', badge: 'bg-green-100 text-green-700' },
  degraded: { dot: 'bg-yellow-500', label: 'Degraded', badge: 'bg-yellow-100 text-yellow-700' },
  down: { dot: 'bg-red-500', label: 'Down', badge: 'bg-red-100 text-red-700' },
  unknown: { dot: 'bg-gray-400', label: 'Unknown', badge: 'bg-gray-100 text-gray-600' },
}

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  model_type: 'openai_compatible',
  endpoint_url: '',
  model_name: '',
  api_key_ref: '',
  default_temperature: 0.0,
  default_max_tokens: 2048,
  capabilities: [],
  pricing: { input_per_1m: '', output_per_1m: '' },
}

export default function Judges() {
  const [judges, setJudges] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Detail / test panel
  const [selectedJudge, setSelectedJudge] = useState(null)
  const [testPrompt, setTestPrompt] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)
  const [healthChecking, setHealthChecking] = useState(null)

  const load = () => api.get('/judges').then((r) => setJudges(r.data)).catch(() => {})

  useEffect(() => { load() }, [])

  const createJudge = async (e) => {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    try {
      const pricing = {}
      if (form.pricing.input_per_1m) pricing.input_per_1m = parseFloat(form.pricing.input_per_1m)
      if (form.pricing.output_per_1m) pricing.output_per_1m = parseFloat(form.pricing.output_per_1m)
      await api.post('/judges', {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        model_type: form.model_type,
        endpoint_url: form.endpoint_url || null,
        model_name: form.model_name || null,
        api_key_ref: form.api_key_ref || null,
        default_temperature: parseFloat(form.default_temperature) || 0.0,
        default_max_tokens: parseInt(form.default_max_tokens) || 2048,
        capabilities: form.capabilities,
        pricing,
      })
      setShowCreate(false)
      setForm({ ...emptyForm })
      load()
    } catch (err) {
      setCreateError(err.response?.data?.detail || err.message)
    }
    setCreating(false)
  }

  const runHealthCheck = async (judgeId) => {
    setHealthChecking(judgeId)
    try {
      const res = await api.post(`/judges/${judgeId}/health-check`)
      // Update the judge in state
      setJudges(prev => prev.map(j => j.id === judgeId ? res.data : j))
      if (selectedJudge?.id === judgeId) setSelectedJudge(res.data)
    } catch (err) {
      console.error('Health check failed', err)
    }
    setHealthChecking(null)
  }

  const testJudge = async () => {
    if (!selectedJudge || !testPrompt.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.post(`/judges/${selectedJudge.id}/test`, {
        system_prompt: 'You are a character IP evaluation judge.',
        user_prompt: testPrompt,
      })
      setTestResult(res.data)
    } catch (err) {
      setTestResult({ success: false, error: err.response?.data?.detail || err.message })
    }
    setTesting(false)
  }

  const deleteJudge = async (judgeId) => {
    if (!confirm('Deactivate this judge?')) return
    try {
      await api.delete(`/judges/${judgeId}`)
      if (selectedJudge?.id === judgeId) setSelectedJudge(null)
      load()
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  const toggleCapability = (cap) => {
    setForm(f => ({
      ...f,
      capabilities: f.capabilities.includes(cap)
        ? f.capabilities.filter(c => c !== cap)
        : [...f.capabilities, cap],
    }))
  }

  const healthyCount = judges.filter(j => j.health_status === 'healthy').length
  const degradedCount = judges.filter(j => j.health_status === 'degraded').length
  const downCount = judges.filter(j => j.health_status === 'down').length

  return (
    <div>
      <PageHeader
        title="Custom Judge Registry"
        subtitle={`${judges.length} judges registered -- ${healthyCount} healthy, ${degradedCount} degraded, ${downCount} down`}
        action={
          <button onClick={() => setShowCreate(!showCreate)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
            {showCreate ? 'Close' : 'Register Judge'}
          </button>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-xs text-gray-400">Total Judges</p>
          <p className="text-2xl font-bold">{judges.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-xs text-gray-400">Healthy</p>
          <p className="text-2xl font-bold text-green-600">{healthyCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-xs text-gray-400">Degraded</p>
          <p className="text-2xl font-bold text-yellow-600">{degradedCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-xs text-gray-400">Down</p>
          <p className="text-2xl font-bold text-red-600">{downCount}</p>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={createJudge} className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
          <h3 className="font-medium text-sm text-gray-500">Register New Judge</h3>
          <p className="text-xs text-gray-400">Register a custom or fine-tuned model as a critic backend (e.g., Prometheus 2-style judges).</p>
          {createError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded">{createError}</div>}
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Name *" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border rounded px-3 py-2 text-sm" required />
            <input placeholder="Slug *" value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="border rounded px-3 py-2 text-sm" required />
          </div>
          <textarea placeholder="Description" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="border rounded px-3 py-2 text-sm w-full h-16 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.model_type} onChange={(e) => setForm({ ...form, model_type: e.target.value })}
              className="border rounded px-3 py-2 text-sm">
              {MODEL_TYPES.map(mt => <option key={mt.value} value={mt.value}>{mt.label}</option>)}
            </select>
            <input placeholder="Model Name (e.g. gpt-4o-mini)" value={form.model_name}
              onChange={(e) => setForm({ ...form, model_name: e.target.value })}
              className="border rounded px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Endpoint URL" value={form.endpoint_url}
              onChange={(e) => setForm({ ...form, endpoint_url: e.target.value })}
              className="border rounded px-3 py-2 text-sm" />
            <input placeholder="API Key Ref (e.g. openai, anthropic, env:MY_KEY)" value={form.api_key_ref}
              onChange={(e) => setForm({ ...form, api_key_ref: e.target.value })}
              className="border rounded px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Temperature</label>
              <input type="number" step="0.1" min="0" max="2" value={form.default_temperature}
                onChange={(e) => setForm({ ...form, default_temperature: e.target.value })}
                className="border rounded px-3 py-2 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Max Tokens</label>
              <input type="number" min="1" value={form.default_max_tokens}
                onChange={(e) => setForm({ ...form, default_max_tokens: e.target.value })}
                className="border rounded px-3 py-2 text-sm w-full" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Capabilities</label>
            <div className="flex gap-3">
              {CAPABILITIES.map(cap => (
                <label key={cap} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={form.capabilities.includes(cap)}
                    onChange={() => toggleCapability(cap)}
                    className="rounded border-gray-300" />
                  <span className="capitalize">{cap}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Input Price (per 1M tokens)</label>
              <input type="number" step="0.01" placeholder="0.15" value={form.pricing.input_per_1m}
                onChange={(e) => setForm({ ...form, pricing: { ...form.pricing, input_per_1m: e.target.value } })}
                className="border rounded px-3 py-2 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Output Price (per 1M tokens)</label>
              <input type="number" step="0.01" placeholder="0.60" value={form.pricing.output_per_1m}
                onChange={(e) => setForm({ ...form, pricing: { ...form.pricing, output_per_1m: e.target.value } })}
                className="border rounded px-3 py-2 text-sm w-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={creating} className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50">
              {creating ? 'Registering...' : 'Register Judge'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="border px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Judge list */}
        <div className="lg:col-span-2 space-y-3">
          {judges.map((judge) => {
            const hs = HEALTH_STYLES[judge.health_status] || HEALTH_STYLES.unknown
            const isSelected = selectedJudge?.id === judge.id

            return (
              <div key={judge.id}
                onClick={() => { setSelectedJudge(judge); setTestResult(null) }}
                className={`bg-white rounded-lg shadow hover:shadow-md transition-all cursor-pointer p-4 ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                        {judge.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${hs.dot}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{judge.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${hs.badge}`}>{hs.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                        <span>{MODEL_TYPES.find(mt => mt.value === judge.model_type)?.label || judge.model_type}</span>
                        {judge.model_name && <span className="text-gray-500">{judge.model_name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); runHealthCheck(judge.id) }}
                      disabled={healthChecking === judge.id}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-50">
                      {healthChecking === judge.id ? 'Checking...' : 'Health Check'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteJudge(judge.id) }}
                      className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100">
                      Deactivate
                    </button>
                  </div>
                </div>
                {judge.description && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">{judge.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {(judge.capabilities || []).map((cap) => (
                    <span key={cap} className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded capitalize">{cap}</span>
                  ))}
                </div>
                {judge.last_health_check && (
                  <p className="text-xs text-gray-400 mt-1">Last check: {new Date(judge.last_health_check).toLocaleString()}</p>
                )}
              </div>
            )
          })}
          {judges.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
              No judges registered yet. Click "Register Judge" to add a custom model.
            </div>
          )}
        </div>

        {/* Detail / Test panel */}
        <div className="space-y-3">
          {selectedJudge ? (
            <>
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-sm mb-3">Judge Details</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name</span>
                    <span className="text-gray-700 font-medium">{selectedJudge.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Slug</span>
                    <span className="text-gray-700">{selectedJudge.slug}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Model Type</span>
                    <span className="text-gray-700">{MODEL_TYPES.find(mt => mt.value === selectedJudge.model_type)?.label}</span>
                  </div>
                  {selectedJudge.model_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Model</span>
                      <span className="text-gray-700">{selectedJudge.model_name}</span>
                    </div>
                  )}
                  {selectedJudge.endpoint_url && (
                    <div>
                      <span className="text-gray-400 block">Endpoint</span>
                      <span className="text-gray-700 text-xs break-all">{selectedJudge.endpoint_url}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Temperature</span>
                    <span className="text-gray-700">{selectedJudge.default_temperature}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Tokens</span>
                    <span className="text-gray-700">{selectedJudge.default_max_tokens}</span>
                  </div>
                  {selectedJudge.api_key_ref && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">API Key Ref</span>
                      <span className="text-gray-700">{selectedJudge.api_key_ref}</span>
                    </div>
                  )}
                  {selectedJudge.pricing && Object.keys(selectedJudge.pricing).length > 0 && (
                    <div>
                      <span className="text-gray-400 block">Pricing</span>
                      <div className="text-gray-700">
                        {selectedJudge.pricing.input_per_1m != null && <span>Input: ${selectedJudge.pricing.input_per_1m}/1M</span>}
                        {selectedJudge.pricing.output_per_1m != null && <span className="ml-2">Output: ${selectedJudge.pricing.output_per_1m}/1M</span>}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created</span>
                    <span className="text-gray-700">{new Date(selectedJudge.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Test panel */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-sm mb-2">Test Judge</h3>
                <p className="text-xs text-gray-400 mb-2">Send a test prompt to verify the judge responds correctly.</p>
                <textarea
                  placeholder="Enter a test prompt..."
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  className="border rounded px-3 py-2 text-sm w-full h-20 resize-none mb-2"
                />
                <button onClick={testJudge} disabled={testing || !testPrompt.trim()}
                  className="bg-indigo-600 text-white px-4 py-2 rounded text-sm w-full disabled:opacity-50">
                  {testing ? 'Testing...' : 'Send Test Prompt'}
                </button>
                {testResult && (
                  <div className={`mt-3 px-3 py-2 rounded text-sm ${
                    testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {testResult.success ? (
                      <div>
                        <div className="font-medium mb-1">Response ({testResult.latency_ms}ms)</div>
                        <div className="text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">{testResult.response_text}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium mb-1">Error</div>
                        <div className="text-xs">{testResult.error}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400 text-sm">
              Select a judge to view details and run tests.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
