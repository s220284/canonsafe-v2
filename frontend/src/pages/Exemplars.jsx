import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

const MODALITY_COLORS = {
  text: 'bg-blue-50 text-blue-600',
  image: 'bg-green-50 text-green-600',
  audio: 'bg-purple-50 text-purple-600',
  video: 'bg-orange-50 text-orange-600',
}

export default function Exemplars() {
  const [exemplars, setExemplars] = useState([])
  const [characters, setCharacters] = useState([])
  const [charMap, setCharMap] = useState({})
  const [filter, setFilter] = useState({ modality: '', min_score: 0, character_id: '' })

  // Create
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    character_id: '', modality: 'text', eval_score: '', tags: '',
    prompt: '', response: '',
  })

  // Selection / expand
  const [selected, setSelected] = useState(null)

  // Editing
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  const load = () => {
    const params = {}
    if (filter.modality) params.modality = filter.modality
    if (filter.min_score) params.min_score = filter.min_score
    if (filter.character_id) params.character_id = filter.character_id
    api.get('/exemplars', { params }).then((r) => setExemplars(r.data))
  }

  useEffect(() => {
    api.get('/characters').then((r) => {
      setCharacters(r.data)
      const map = {}
      r.data.forEach(c => { map[c.id] = c.name })
      setCharMap(map)
    })
  }, [])
  useEffect(() => { load() }, [filter])

  const scoreColor = (s) => {
    if (s >= 95) return 'text-green-600'
    if (s >= 90) return 'text-blue-600'
    if (s >= 85) return 'text-yellow-600'
    return 'text-orange-600'
  }

  const scoreBg = (s) => {
    if (s >= 95) return 'bg-green-400'
    if (s >= 90) return 'bg-blue-400'
    if (s >= 85) return 'bg-yellow-400'
    return 'bg-orange-400'
  }

  // Create exemplar
  const create = async (e) => {
    e.preventDefault()
    const content = {}
    if (createForm.prompt) content.prompt = createForm.prompt
    if (createForm.response) content.response = createForm.response
    await api.post('/exemplars', {
      character_id: parseInt(createForm.character_id),
      modality: createForm.modality,
      eval_score: parseFloat(createForm.eval_score),
      content,
      tags: createForm.tags.split(',').map(t => t.trim()).filter(Boolean),
    })
    setCreateForm({ character_id: '', modality: 'text', eval_score: '', tags: '', prompt: '', response: '' })
    setShowCreate(false)
    load()
  }

  // Edit
  const startEdit = (ex) => {
    setEditing(ex.id)
    setEditForm({
      modality: ex.modality,
      eval_score: ex.eval_score,
      tags: (ex.tags || []).join(', '),
      content: JSON.stringify(ex.content, null, 2),
    })
  }

  const saveEdit = async (exId) => {
    setSaving(true)
    try {
      let content
      try { content = JSON.parse(editForm.content) } catch { content = undefined }
      const payload = {
        modality: editForm.modality,
        eval_score: parseFloat(editForm.eval_score),
        tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      }
      if (content !== undefined) payload.content = content
      await api.patch(`/exemplars/${exId}`, payload)
      setEditing(null)
      load()
    } catch (err) {
      console.error('Save failed', err)
    }
    setSaving(false)
  }

  const deleteExemplar = async (exId) => {
    if (!confirm('Delete this exemplar?')) return
    await api.delete(`/exemplars/${exId}`)
    if (selected === exId) setSelected(null)
    load()
  }

  // Group by character
  const grouped = {}
  exemplars.forEach(ex => {
    const name = charMap[ex.character_id] || `Character #${ex.character_id}`
    if (!grouped[name]) grouped[name] = []
    grouped[name].push(ex)
  })
  const groupNames = Object.keys(grouped).sort()

  return (
    <div>
      <PageHeader
        title="Exemplar Library"
        subtitle={`${exemplars.length} high-scoring content examples — Click to expand, edit, or add new exemplars`}
        action={
          <button onClick={() => setShowCreate(!showCreate)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
            {showCreate ? 'Close' : 'Add Exemplar'}
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filter.character_id} onChange={(e) => setFilter({ ...filter, character_id: e.target.value })}
          className="border rounded px-3 py-2 text-sm bg-white">
          <option value="">All Characters</option>
          {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filter.modality} onChange={(e) => setFilter({ ...filter, modality: e.target.value })}
          className="border rounded px-3 py-2 text-sm bg-white">
          <option value="">All Modalities</option>
          {['text', 'image', 'audio', 'video'].map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-500">Min Score:</label>
          <input type="number" step="0.1" value={filter.min_score || ''}
            onChange={(e) => setFilter({ ...filter, min_score: parseFloat(e.target.value) || 0 })}
            className="border rounded px-2 py-2 text-sm w-20" placeholder="0" />
        </div>
        {(filter.modality || filter.min_score || filter.character_id) && (
          <button onClick={() => setFilter({ modality: '', min_score: 0, character_id: '' })}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 self-center">Clear filters</button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={create} className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
          <h3 className="font-medium text-sm text-gray-500">Add New Exemplar</h3>
          <div className="grid grid-cols-2 gap-3">
            <select value={createForm.character_id} onChange={(e) => setCreateForm({ ...createForm, character_id: e.target.value })}
              className="border rounded px-3 py-2 text-sm" required>
              <option value="">Character...</option>
              {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={createForm.modality} onChange={(e) => setCreateForm({ ...createForm, modality: e.target.value })}
              className="border rounded px-3 py-2 text-sm">
              {['text', 'image', 'audio', 'video'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" step="0.1" placeholder="Eval Score (e.g. 96.5)" value={createForm.eval_score}
              onChange={(e) => setCreateForm({ ...createForm, eval_score: e.target.value })}
              className="border rounded px-3 py-2 text-sm" required />
            <input placeholder="Tags (comma-separated)" value={createForm.tags}
              onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })}
              className="border rounded px-3 py-2 text-sm" />
          </div>
          <textarea placeholder="Prompt / Input" value={createForm.prompt}
            onChange={(e) => setCreateForm({ ...createForm, prompt: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm" rows={2} />
          <textarea placeholder="Response / Output (the exemplar content)" value={createForm.response}
            onChange={(e) => setCreateForm({ ...createForm, response: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm" rows={3} />
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Create Exemplar</button>
            <button type="button" onClick={() => setShowCreate(false)} className="border px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Grouped exemplar list */}
      {groupNames.map((groupName) => (
        <div key={groupName} className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {groupName}
            <span className="text-gray-400 font-normal ml-2">({grouped[groupName].length})</span>
          </h3>
          <div className="space-y-2">
            {grouped[groupName].map((ex) => {
              const isSelected = selected === ex.id
              const isEditing = editing === ex.id

              return (
                <div key={ex.id} className={`bg-white rounded-lg shadow transition-all ${isSelected ? 'ring-2 ring-blue-300' : 'hover:shadow-md'}`}>
                  {isEditing ? (
                    /* ── Edit form ───────────────────── */
                    <div className="p-4 space-y-3">
                      <h4 className="text-sm font-medium text-gray-500">Edit Exemplar #{ex.id}</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <select value={editForm.modality} onChange={(e) => setEditForm({ ...editForm, modality: e.target.value })}
                          className="border rounded px-2 py-1.5 text-sm">
                          {['text', 'image', 'audio', 'video'].map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <input type="number" step="0.1" value={editForm.eval_score}
                          onChange={(e) => setEditForm({ ...editForm, eval_score: e.target.value })}
                          className="border rounded px-2 py-1.5 text-sm" placeholder="Score" />
                        <input value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                          className="border rounded px-2 py-1.5 text-sm" placeholder="Tags (comma-separated)" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Content (JSON)</label>
                        <textarea value={editForm.content}
                          onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                          className="w-full border rounded px-2 py-1.5 text-xs font-mono" rows={6} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(ex.id)} disabled={saving}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50">
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setEditing(null)} className="border px-3 py-1.5 rounded text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    /* ── Card display ────────────────── */
                    <>
                      <div className="p-4 cursor-pointer" onClick={() => setSelected(isSelected ? null : ex.id)}>
                        <div className="flex items-center gap-3">
                          {/* Score badge */}
                          <div className="flex-shrink-0 text-center">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm ${scoreBg(ex.eval_score)}`}>
                              {ex.eval_score.toFixed(1)}
                            </div>
                          </div>

                          {/* Content preview */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded ${MODALITY_COLORS[ex.modality] || 'bg-gray-100'}`}>{ex.modality}</span>
                              {ex.eval_run_id && <span className="text-xs text-gray-400">eval #{ex.eval_run_id}</span>}
                              {(ex.tags || []).map((t, i) => (
                                <span key={i} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{t}</span>
                              ))}
                            </div>
                            {ex.content?.prompt ? (
                              <p className="text-sm text-gray-600 truncate">
                                <span className="text-gray-400">Q:</span> {ex.content.prompt}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-500 truncate">{JSON.stringify(ex.content).slice(0, 100)}</p>
                            )}
                          </div>

                          {/* Expand arrow */}
                          <svg className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isSelected ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isSelected && (
                        <div className="border-t">
                          <div className="p-4">
                            {/* Full content */}
                            {ex.content?.prompt && (
                              <div className="mb-3">
                                <p className="text-xs font-medium text-gray-400 mb-1">Prompt</p>
                                <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 italic">
                                  &ldquo;{ex.content.prompt}&rdquo;
                                </div>
                              </div>
                            )}
                            {ex.content?.response && (
                              <div className="mb-3">
                                <p className="text-xs font-medium text-gray-400 mb-1">Response (Exemplar)</p>
                                <div className="bg-green-50 rounded p-3 text-sm text-gray-800 border-l-4 border-green-400">
                                  {ex.content.response}
                                </div>
                              </div>
                            )}
                            {!ex.content?.prompt && !ex.content?.response && (
                              <div className="mb-3">
                                <p className="text-xs font-medium text-gray-400 mb-1">Content</p>
                                <pre className="text-xs bg-gray-50 rounded p-3 overflow-auto max-h-48 font-mono">
                                  {JSON.stringify(ex.content, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Metadata */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                              <div className="bg-gray-50 rounded p-2">
                                <p className="text-xs text-gray-400">Score</p>
                                <p className={`font-bold font-mono ${scoreColor(ex.eval_score)}`}>{ex.eval_score.toFixed(1)}</p>
                              </div>
                              <div className="bg-gray-50 rounded p-2">
                                <p className="text-xs text-gray-400">Modality</p>
                                <p>{ex.modality}</p>
                              </div>
                              <div className="bg-gray-50 rounded p-2">
                                <p className="text-xs text-gray-400">Eval Run</p>
                                <p>{ex.eval_run_id ? `#${ex.eval_run_id}` : 'Manual'}</p>
                              </div>
                              <div className="bg-gray-50 rounded p-2">
                                <p className="text-xs text-gray-400">Created</p>
                                <p>{new Date(ex.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>

                            {/* Tags */}
                            {(ex.tags || []).length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs text-gray-400 mb-1">Tags</p>
                                <div className="flex gap-1 flex-wrap">
                                  {ex.tags.map((t, i) => (
                                    <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{t}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="px-4 py-3 border-t bg-gray-50 flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); startEdit(ex) }}
                              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Edit</button>
                            <button onClick={(e) => { e.stopPropagation(); deleteExemplar(ex.id) }}
                              className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Delete</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* No grouping fallback */}
      {exemplars.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
          No exemplars found. {filter.modality || filter.min_score || filter.character_id ? 'Try adjusting your filters.' : 'Add one to get started.'}
        </div>
      )}
    </div>
  )
}
