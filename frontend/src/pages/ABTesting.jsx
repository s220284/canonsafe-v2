import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-700',
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const EXPERIMENT_TYPES = [
  { value: 'critic_weight', label: 'Critic Weights' },
  { value: 'prompt_template', label: 'Prompt Template' },
  { value: 'model', label: 'Model Comparison' },
  { value: 'profile', label: 'Evaluation Profile' },
]

export default function ABTesting() {
  const [experiments, setExperiments] = useState([])
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedExp, setSelectedExp] = useState(null)
  const [expDetail, setExpDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Create form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    experiment_type: 'critic_weight',
    variant_a: '{}',
    variant_b: '{}',
    sample_size: 100,
  })

  // Trial form state
  const [trialForm, setTrialForm] = useState({
    character_id: '',
    content: '',
    modality: 'text',
  })
  const [runningTrial, setRunningTrial] = useState(false)
  const [completing, setCompleting] = useState(false)

  const loadExperiments = async () => {
    setLoading(true)
    try {
      const [expRes, charRes] = await Promise.all([
        api.get('/ab-testing'),
        api.get('/characters'),
      ])
      setExperiments(expRes.data)
      setCharacters(charRes.data)
    } catch (err) {
      console.error('Failed to load experiments', err)
    }
    setLoading(false)
  }

  const loadDetail = async (id) => {
    setDetailLoading(true)
    setError('')
    try {
      const res = await api.get(`/ab-testing/${id}`)
      setExpDetail(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load experiment details')
    }
    setDetailLoading(false)
  }

  useEffect(() => {
    loadExperiments()
  }, [])

  useEffect(() => {
    if (selectedExp) {
      loadDetail(selectedExp)
    }
  }, [selectedExp])

  const createExperiment = async () => {
    setError('')
    setMessage('')
    try {
      let variant_a, variant_b
      try {
        variant_a = JSON.parse(form.variant_a)
      } catch {
        setError('Variant A config is not valid JSON')
        return
      }
      try {
        variant_b = JSON.parse(form.variant_b)
      } catch {
        setError('Variant B config is not valid JSON')
        return
      }

      await api.post('/ab-testing', {
        name: form.name,
        description: form.description,
        experiment_type: form.experiment_type,
        variant_a,
        variant_b,
        sample_size: parseInt(form.sample_size) || 100,
      })
      setMessage('Experiment created successfully')
      setShowCreate(false)
      setForm({ name: '', description: '', experiment_type: 'critic_weight', variant_a: '{}', variant_b: '{}', sample_size: 100 })
      loadExperiments()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create experiment')
    }
  }

  const runTrial = async () => {
    if (!trialForm.character_id || !trialForm.content) {
      setError('Character and content are required to run a trial')
      return
    }
    setRunningTrial(true)
    setError('')
    setMessage('')
    try {
      const res = await api.post(`/ab-testing/${selectedExp}/run-trial`, {
        character_id: parseInt(trialForm.character_id),
        content: trialForm.content,
        modality: trialForm.modality,
      })
      setMessage(`Trial complete - A: ${res.data.variant_a?.score?.toFixed(3) ?? 'N/A'} | B: ${res.data.variant_b?.score?.toFixed(3) ?? 'N/A'}`)
      loadDetail(selectedExp)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to run trial')
    }
    setRunningTrial(false)
  }

  const completeExperiment = async () => {
    setCompleting(true)
    setError('')
    setMessage('')
    try {
      const res = await api.post(`/ab-testing/${selectedExp}/complete`)
      setMessage(`Experiment completed. Winner: ${res.data.winner || 'inconclusive'}`)
      loadDetail(selectedExp)
      loadExperiments()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to complete experiment')
    }
    setCompleting(false)
  }

  const summary = expDetail?.summary
  const experiment = expDetail?.experiment
  const trials = expDetail?.trials || []

  return (
    <div>
      <PageHeader
        title="A/B Testing"
        subtitle={`${experiments.length} experiment${experiments.length !== 1 ? 's' : ''}`}
        action={
          <button
            onClick={() => { setShowCreate(!showCreate); setSelectedExp(null); setExpDetail(null) }}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            {showCreate ? 'Cancel' : 'New Experiment'}
          </button>
        }
      />

      {/* Messages */}
      {message && (
        <div className="bg-green-50 text-green-700 text-sm px-4 py-2 rounded mb-4 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-green-400 hover:text-green-600 text-xs ml-4">Dismiss</button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-xs ml-4">Dismiss</button>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Create Experiment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="e.g. Weight Tuning v1 vs v2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.experiment_type}
                onChange={(e) => setForm({ ...form, experiment_type: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm bg-white"
              >
                {EXPERIMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="What are you testing?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variant A Config (JSON)</label>
              <textarea
                value={form.variant_a}
                onChange={(e) => setForm({ ...form, variant_a: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm font-mono h-32"
                placeholder='{"weight_overrides": {"1": 1.5}}'
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variant B Config (JSON)</label>
              <textarea
                value={form.variant_b}
                onChange={(e) => setForm({ ...form, variant_b: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm font-mono h-32"
                placeholder='{"weight_overrides": {"1": 2.0}}'
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sample Size (per variant)</label>
              <input
                type="number"
                value={form.sample_size}
                onChange={(e) => setForm({ ...form, sample_size: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
                min="1"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={createExperiment}
              disabled={!form.name}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-blue-700"
            >
              Create Experiment
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">Loading experiments...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Experiment List */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">Experiments</h3>
            {experiments.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400 text-sm">
                No experiments yet. Create one to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {experiments.map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => { setSelectedExp(exp.id); setShowCreate(false) }}
                    className={`w-full text-left bg-white rounded-lg shadow p-4 hover:bg-gray-50 transition border-2 ${
                      selectedExp === exp.id ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">{exp.name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_STYLES[exp.status] || 'bg-gray-100 text-gray-600'}`}>
                        {exp.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{exp.experiment_type}</span>
                      {exp.winner && <span className="font-medium text-green-600">Winner: {exp.winner.toUpperCase()}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Experiment Detail */}
          <div className="lg:col-span-2">
            {selectedExp ? (
              detailLoading ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">Loading experiment details...</div>
              ) : expDetail ? (
                <div className="space-y-4">
                  {/* Experiment Header */}
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">{experiment.name}</h3>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded ${STATUS_STYLES[experiment.status] || 'bg-gray-100'}`}>
                        {experiment.status}
                      </span>
                    </div>
                    {experiment.description && (
                      <p className="text-sm text-gray-500 mb-2">{experiment.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>Type: {experiment.experiment_type}</span>
                      <span>Target: {experiment.sample_size} per variant</span>
                      {experiment.created_at && <span>Created: {new Date(experiment.created_at).toLocaleDateString()}</span>}
                    </div>
                  </div>

                  {/* Results Summary */}
                  {summary && (
                    <div className="bg-white rounded-lg shadow p-4">
                      <h4 className="text-sm font-semibold text-gray-500 mb-3">Results Summary</h4>

                      {/* Winner badge */}
                      {summary.winner && (
                        <div className={`mb-4 p-3 rounded-lg text-center ${
                          summary.winner === 'a' ? 'bg-blue-50 text-blue-700' :
                          summary.winner === 'b' ? 'bg-purple-50 text-purple-700' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          <span className="text-lg font-bold">
                            {summary.winner === 'inconclusive' ? 'Inconclusive' : `Variant ${summary.winner.toUpperCase()} Wins`}
                          </span>
                          {summary.p_value !== null && (
                            <span className="ml-2 text-sm opacity-75">
                              (p={summary.p_value?.toFixed(4)}{summary.significant ? ' - statistically significant' : ' - not significant'})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Comparison grid */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="font-medium text-gray-500">Metric</div>
                        <div className="font-medium text-blue-600 text-center">Variant A</div>
                        <div className="font-medium text-purple-600 text-center">Variant B</div>

                        <div className="text-gray-600">Trials</div>
                        <div className="text-center font-mono">{summary.trials_a}</div>
                        <div className="text-center font-mono">{summary.trials_b}</div>

                        <div className="text-gray-600">Mean Score</div>
                        <div className={`text-center font-mono font-bold ${summary.mean_score_a >= summary.mean_score_b ? 'text-green-600' : 'text-gray-600'}`}>
                          {summary.mean_score_a?.toFixed(4)}
                        </div>
                        <div className={`text-center font-mono font-bold ${summary.mean_score_b >= summary.mean_score_a ? 'text-green-600' : 'text-gray-600'}`}>
                          {summary.mean_score_b?.toFixed(4)}
                        </div>

                        <div className="text-gray-600">Std Dev</div>
                        <div className="text-center font-mono text-gray-500">{summary.std_a?.toFixed(4)}</div>
                        <div className="text-center font-mono text-gray-500">{summary.std_b?.toFixed(4)}</div>

                        <div className="text-gray-600">Pass Rate</div>
                        <div className={`text-center font-mono font-bold ${summary.pass_rate_a >= summary.pass_rate_b ? 'text-green-600' : 'text-gray-600'}`}>
                          {(summary.pass_rate_a * 100).toFixed(1)}%
                        </div>
                        <div className={`text-center font-mono font-bold ${summary.pass_rate_b >= summary.pass_rate_a ? 'text-green-600' : 'text-gray-600'}`}>
                          {(summary.pass_rate_b * 100).toFixed(1)}%
                        </div>

                        <div className="text-gray-600">Avg Latency (ms)</div>
                        <div className={`text-center font-mono ${summary.avg_latency_a <= summary.avg_latency_b ? 'text-green-600' : 'text-gray-600'}`}>
                          {summary.avg_latency_a?.toFixed(0)}
                        </div>
                        <div className={`text-center font-mono ${summary.avg_latency_b <= summary.avg_latency_a ? 'text-green-600' : 'text-gray-600'}`}>
                          {summary.avg_latency_b?.toFixed(0)}
                        </div>

                        <div className="text-gray-600">Avg Cost</div>
                        <div className={`text-center font-mono ${summary.avg_cost_a <= summary.avg_cost_b ? 'text-green-600' : 'text-gray-600'}`}>
                          ${summary.avg_cost_a?.toFixed(4)}
                        </div>
                        <div className={`text-center font-mono ${summary.avg_cost_b <= summary.avg_cost_a ? 'text-green-600' : 'text-gray-600'}`}>
                          ${summary.avg_cost_b?.toFixed(4)}
                        </div>
                      </div>

                      {/* Statistical significance */}
                      {summary.p_value !== null && (
                        <div className="mt-4 pt-3 border-t text-sm">
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500">P-value:</span>
                            <span className={`font-mono font-bold ${summary.significant ? 'text-green-600' : 'text-orange-600'}`}>
                              {summary.p_value?.toFixed(6)}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              summary.significant ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {summary.significant ? 'Significant (p < 0.05)' : 'Not Significant'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Variant Configs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg shadow p-4">
                      <h4 className="text-sm font-semibold text-blue-600 mb-2">Variant A Config</h4>
                      <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-40 font-mono">
                        {JSON.stringify(experiment.variant_a, null, 2)}
                      </pre>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                      <h4 className="text-sm font-semibold text-purple-600 mb-2">Variant B Config</h4>
                      <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-40 font-mono">
                        {JSON.stringify(experiment.variant_b, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Run Trial Form */}
                  {experiment.status !== 'completed' && experiment.status !== 'cancelled' && (
                    <div className="bg-white rounded-lg shadow p-4">
                      <h4 className="text-sm font-semibold text-gray-500 mb-3">Run Trial</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Character</label>
                          <select
                            value={trialForm.character_id}
                            onChange={(e) => setTrialForm({ ...trialForm, character_id: e.target.value })}
                            className="w-full border rounded px-3 py-2 text-sm bg-white"
                          >
                            <option value="">Select character...</option>
                            {characters.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Modality</label>
                          <select
                            value={trialForm.modality}
                            onChange={(e) => setTrialForm({ ...trialForm, modality: e.target.value })}
                            className="w-full border rounded px-3 py-2 text-sm bg-white"
                          >
                            <option value="text">Text</option>
                            <option value="image">Image</option>
                            <option value="audio">Audio</option>
                            <option value="video">Video</option>
                          </select>
                        </div>
                        <div className="flex items-end gap-2">
                          <button
                            onClick={runTrial}
                            disabled={runningTrial || !trialForm.character_id || !trialForm.content}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-blue-700 whitespace-nowrap"
                          >
                            {runningTrial ? 'Running...' : 'Run Trial'}
                          </button>
                          <button
                            onClick={completeExperiment}
                            disabled={completing || !summary || (summary.trials_a === 0 && summary.trials_b === 0)}
                            className="border border-green-600 text-green-600 px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-green-50 whitespace-nowrap"
                          >
                            {completing ? 'Completing...' : 'Complete Experiment'}
                          </button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="block text-xs text-gray-500 mb-1">Content</label>
                        <textarea
                          value={trialForm.content}
                          onChange={(e) => setTrialForm({ ...trialForm, content: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm h-24"
                          placeholder="Enter content to evaluate through both variants..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Trial History */}
                  {trials.length > 0 && (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                      <div className="px-4 py-3 border-b">
                        <h4 className="text-sm font-semibold text-gray-500">Trial History ({trials.length} trials)</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left px-4 py-2">ID</th>
                              <th className="text-left px-4 py-2">Variant</th>
                              <th className="text-left px-4 py-2">Score</th>
                              <th className="text-left px-4 py-2">Decision</th>
                              <th className="text-left px-4 py-2">Latency</th>
                              <th className="text-left px-4 py-2">Cost</th>
                              <th className="text-left px-4 py-2">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trials.map((t) => (
                              <tr key={t.id} className="border-t hover:bg-gray-50">
                                <td className="px-4 py-2 text-gray-400">#{t.id}</td>
                                <td className="px-4 py-2">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                    t.variant === 'a' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                  }`}>
                                    {t.variant.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-4 py-2 font-mono font-bold">
                                  <span className={
                                    t.score >= 0.9 ? 'text-green-600' :
                                    t.score >= 0.7 ? 'text-yellow-600' :
                                    t.score >= 0.5 ? 'text-orange-600' : 'text-red-600'
                                  }>
                                    {t.score?.toFixed(3) ?? 'N/A'}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-xs">
                                  <span className={`px-2 py-0.5 rounded ${
                                    t.decision === 'pass' ? 'bg-green-100 text-green-700' :
                                    t.decision === 'regenerate' ? 'bg-yellow-100 text-yellow-700' :
                                    t.decision === 'quarantine' ? 'bg-orange-100 text-orange-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {t.decision || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-4 py-2 font-mono text-gray-500">{t.latency_ms}ms</td>
                                <td className="px-4 py-2 font-mono text-gray-500">${t.cost?.toFixed(4) ?? '0.0000'}</td>
                                <td className="px-4 py-2 text-gray-400 text-xs">
                                  {t.created_at ? new Date(t.created_at).toLocaleString() : ''}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : null
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
                Select an experiment from the list to view details, or create a new one.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
