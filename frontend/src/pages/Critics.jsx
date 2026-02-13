import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

const CATEGORY_STYLES = {
  canon: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700', icon: 'B' },
  voice: { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700', icon: 'V' },
  safety: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-700', badge: 'bg-red-100 text-red-700', icon: 'S' },
  legal: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700', icon: 'L' },
  visual: { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-700', badge: 'bg-green-100 text-green-700', icon: 'Vi' },
  audio: { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', icon: 'Au' },
  'cross-modal': { bg: 'bg-teal-50', border: 'border-teal-400', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-700', icon: 'X' },
}
const defaultStyle = { bg: 'bg-gray-50', border: 'border-gray-400', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-700', icon: '?' }

const MODALITY_BADGE = {
  text: 'bg-gray-100 text-gray-600',
  image: 'bg-pink-100 text-pink-600',
  audio: 'bg-orange-100 text-orange-600',
  video: 'bg-indigo-100 text-indigo-600',
  multi: 'bg-teal-100 text-teal-600',
}

export default function Critics() {
  const [critics, setCritics] = useState([])
  const [profiles, setProfiles] = useState([])
  const [criticMap, setCriticMap] = useState({})
  const [tab, setTab] = useState('critics')
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null) // critic id being edited
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  // Create critic state
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '', slug: '', description: '', category: 'canon', modality: 'text',
    prompt_template: 'You are a {character_name} fidelity critic.\n\nCharacter Canon:\n{canon_pack}\n\nSafety Rules:\n{safety_pack}\n\n{extra_instructions}',
    default_weight: 1.0,
  })

  // Create profile state
  const [showCreateProfile, setShowCreateProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: '', slug: '', description: '', sampling_rate: 1.0,
    tiered_evaluation: false, rapid_screen_critics: [], deep_eval_critics: [],
  })
  const [selectedProfile, setSelectedProfile] = useState(null)

  const load = () => {
    api.get('/critics').then((r) => {
      setCritics(r.data)
      const map = {}
      r.data.forEach(c => { map[c.id] = c })
      setCriticMap(map)
    })
    api.get('/critics/profiles').then((r) => setProfiles(r.data))
  }
  useEffect(() => { load() }, [])

  const createCritic = async (e) => {
    e.preventDefault()
    await api.post('/critics', { ...createForm, rubric: {} })
    setCreateForm({
      name: '', slug: '', description: '', category: 'canon', modality: 'text',
      prompt_template: 'You are a {character_name} fidelity critic.\n\nCharacter Canon:\n{canon_pack}\n\nSafety Rules:\n{safety_pack}\n\n{extra_instructions}',
      default_weight: 1.0,
    })
    setShowCreate(false)
    load()
  }

  const createProfile = async (e) => {
    e.preventDefault()
    await api.post('/critics/profiles', {
      ...profileForm,
      critic_config_ids: [],
    })
    setProfileForm({ name: '', slug: '', description: '', sampling_rate: 1.0, tiered_evaluation: false, rapid_screen_critics: [], deep_eval_critics: [] })
    setShowCreateProfile(false)
    load()
  }

  const startEdit = (critic) => {
    setEditing(critic.id)
    setEditForm({
      name: critic.name,
      description: critic.description || '',
      category: critic.category || 'canon',
      modality: critic.modality || 'text',
      prompt_template: critic.prompt_template || '',
      default_weight: critic.default_weight,
      rubric: JSON.stringify(critic.rubric || {}, null, 2),
    })
  }

  const saveEdit = async (criticId) => {
    setSaving(true)
    try {
      let rubric
      try { rubric = JSON.parse(editForm.rubric) } catch { rubric = undefined }
      const payload = {
        name: editForm.name,
        description: editForm.description,
        category: editForm.category,
        modality: editForm.modality,
        prompt_template: editForm.prompt_template,
        default_weight: parseFloat(editForm.default_weight),
      }
      if (rubric !== undefined) payload.rubric = rubric
      await api.patch(`/critics/${criticId}`, payload)
      setEditing(null)
      load()
    } catch (err) {
      console.error('Save failed', err)
    }
    setSaving(false)
  }

  const cancelEdit = () => {
    setEditing(null)
    setEditForm({})
  }

  const toggleSelect = (id) => {
    setSelected(selected === id ? null : id)
    if (editing && editing !== id) cancelEdit()
  }

  const style = (cat) => CATEGORY_STYLES[cat] || defaultStyle

  const renderRubric = (rubric) => {
    if (!rubric?.dimensions?.length) return null
    return (
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-500 mb-2">Scoring Rubric</p>
        <div className="space-y-1.5">
          {rubric.dimensions.map((d, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-mono font-bold text-gray-600 w-8 text-right flex-shrink-0">
                  {(d.weight * 100).toFixed(0)}%
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{d.name.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-xs text-gray-400">{d.description}</p>
                </div>
              </div>
              <div className="w-24 bg-gray-100 rounded-full h-2 mt-1.5 flex-shrink-0">
                <div className="h-2 rounded-full bg-blue-400" style={{ width: `${d.weight * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderCriticCard = (c) => {
    const s = style(c.category)
    const isSelected = selected === c.id
    const isEditing = editing === c.id

    return (
      <div key={c.id}
        className={`bg-white rounded-lg shadow border-l-4 ${s.border} transition-all ${
          isSelected ? 'ring-2 ring-blue-300' : 'hover:shadow-md cursor-pointer'
        }`}>
        {/* Header - always visible, clickable */}
        <div className="p-4" onClick={() => toggleSelect(c.id)}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} ${s.text} flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                {s.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{c.name}</h3>
                  {c.is_system && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-500">System</span>}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{c.description || 'No description'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded ${s.badge}`}>{c.category}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${MODALITY_BADGE[c.modality] || 'bg-gray-100'}`}>{c.modality}</span>
              <span className="text-xs text-gray-400 font-mono">w={c.default_weight}</span>
            </div>
          </div>
        </div>

        {/* Expanded detail */}
        {isSelected && !isEditing && (
          <div className={`border-t px-4 pb-4 pt-3 ${s.bg}`}>
            {/* Rubric */}
            {renderRubric(c.rubric)}

            {/* Prompt template */}
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Prompt Template</p>
              <pre className="text-xs bg-white rounded p-3 overflow-auto max-h-48 border font-mono text-gray-600 whitespace-pre-wrap">
                {c.prompt_template}
              </pre>
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <span>ID: {c.id}</span>
              <span>Slug: {c.slug}</span>
              <span>Created: {new Date(c.created_at).toLocaleDateString()}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              <button onClick={(e) => { e.stopPropagation(); startEdit(c) }}
                className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">
                Edit Critic
              </button>
              <button onClick={() => setSelected(null)}
                className="border px-3 py-1.5 rounded text-sm hover:bg-white">
                Close
              </button>
            </div>
          </div>
        )}

        {/* Edit form */}
        {isEditing && (
          <div className="border-t px-4 pb-4 pt-3 bg-blue-50">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Name</label>
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm mt-0.5" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Default Weight</label>
                  <input type="number" step="0.1" value={editForm.default_weight}
                    onChange={(e) => setEditForm({ ...editForm, default_weight: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm mt-0.5" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Description</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm mt-0.5" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Category</label>
                  <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm mt-0.5">
                    {['canon', 'voice', 'safety', 'legal', 'visual', 'audio', 'cross-modal'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Modality</label>
                  <select value={editForm.modality} onChange={(e) => setEditForm({ ...editForm, modality: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm mt-0.5">
                    {['text', 'image', 'audio', 'video', 'multi'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Prompt Template</label>
                <textarea value={editForm.prompt_template}
                  onChange={(e) => setEditForm({ ...editForm, prompt_template: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm font-mono mt-0.5" rows={6} />
                <p className="text-xs text-gray-400 mt-1">
                  Placeholders: {'{character_name}'}, {'{canon_pack}'}, {'{safety_pack}'}, {'{legal_pack}'}, {'{visual_identity_pack}'}, {'{audio_identity_pack}'}, {'{content}'}, {'{extra_instructions}'}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Rubric (JSON)</label>
                <textarea value={editForm.rubric}
                  onChange={(e) => setEditForm({ ...editForm, rubric: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm font-mono mt-0.5" rows={6} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => saveEdit(c.id)} disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={cancelEdit} className="border px-4 py-2 rounded text-sm hover:bg-white">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderProfileCard = (p) => {
    const isSelected = selectedProfile === p.id
    // Resolve critic IDs to names
    const rapidCritics = (p.rapid_screen_critics || []).map(id => criticMap[id]?.name || `#${id}`)
    const deepCritics = (p.deep_eval_critics || []).map(id => criticMap[id]?.name || `#${id}`)

    return (
      <div key={p.id}
        className={`bg-white rounded-lg shadow border-l-4 border-indigo-400 transition-all ${
          isSelected ? 'ring-2 ring-indigo-300' : 'hover:shadow-md cursor-pointer'
        }`}>
        <div className="p-4" onClick={() => setSelectedProfile(isSelected ? null : p.id)}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{p.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">{p.slug}</span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{p.description || 'No description'}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0">
              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                {(p.sampling_rate * 100).toFixed(0)}% sampling
              </span>
              <span className={`px-2 py-0.5 rounded ${p.tiered_evaluation ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                {p.tiered_evaluation ? 'Tiered' : 'Flat'}
              </span>
            </div>
          </div>
        </div>

        {isSelected && (
          <div className="border-t px-4 pb-4 pt-3 bg-indigo-50">
            {/* Tiered evaluation breakdown */}
            {p.tiered_evaluation && (
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Rapid Screen Critics</p>
                  <div className="space-y-1">
                    {rapidCritics.length > 0 ? rapidCritics.map((name, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-400" />
                        <span className="text-sm">{name}</span>
                      </div>
                    )) : <p className="text-xs text-gray-400">None configured</p>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Deep Evaluation Critics</p>
                  <div className="space-y-1">
                    {deepCritics.length > 0 ? deepCritics.map((name, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-sm">{name}</span>
                      </div>
                    )) : <p className="text-xs text-gray-400">None configured</p>}
                  </div>
                </div>
              </div>
            )}

            {/* All assigned critics */}
            {!p.tiered_evaluation && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Assigned Critics</p>
                <div className="flex flex-wrap gap-1.5">
                  {(p.critic_config_ids || []).map((id, i) => (
                    <span key={i} className="text-xs bg-white border px-2 py-0.5 rounded">
                      {criticMap[id]?.name || `Config #${id}`}
                    </span>
                  ))}
                  {(!p.critic_config_ids || p.critic_config_ids.length === 0) && (
                    <span className="text-xs text-gray-400">No critics assigned</span>
                  )}
                </div>
              </div>
            )}

            {/* Pipeline visualization */}
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Evaluation Pipeline</p>
              <div className="flex items-center gap-1 text-xs overflow-auto">
                <div className="bg-white border rounded px-2 py-1 flex-shrink-0">
                  <span className="text-gray-400">1.</span> Content In
                </div>
                <span className="text-gray-300">&rarr;</span>
                <div className="bg-white border rounded px-2 py-1 flex-shrink-0">
                  <span className="text-gray-400">2.</span> Sample ({(p.sampling_rate * 100).toFixed(0)}%)
                </div>
                <span className="text-gray-300">&rarr;</span>
                {p.tiered_evaluation ? (
                  <>
                    <div className="bg-yellow-50 border border-yellow-300 rounded px-2 py-1 flex-shrink-0">
                      <span className="text-yellow-500">3.</span> Rapid Screen
                    </div>
                    <span className="text-gray-300">&rarr;</span>
                    <div className="bg-blue-50 border border-blue-300 rounded px-2 py-1 flex-shrink-0">
                      <span className="text-blue-500">4.</span> Deep Eval
                    </div>
                  </>
                ) : (
                  <div className="bg-blue-50 border border-blue-300 rounded px-2 py-1 flex-shrink-0">
                    <span className="text-blue-500">3.</span> Full Eval
                  </div>
                )}
                <span className="text-gray-300">&rarr;</span>
                <div className="bg-green-50 border border-green-300 rounded px-2 py-1 flex-shrink-0">
                  <span className="text-green-500">{p.tiered_evaluation ? '5' : '4'}.</span> Decision
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <span>ID: {p.id}</span>
              <span>Created: {new Date(p.created_at).toLocaleDateString()}</span>
            </div>

            <button onClick={() => setSelectedProfile(null)}
              className="mt-3 border px-3 py-1.5 rounded text-sm hover:bg-white">
              Close
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Critics & Profiles"
        subtitle={`${critics.length} critics, ${profiles.length} evaluation profiles — Click any card to view details`}
        action={
          <div className="flex gap-2">
            {tab === 'critics' && (
              <button onClick={() => { setShowCreate(!showCreate); setShowCreateProfile(false) }}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
                {showCreate ? 'Close' : 'New Critic'}
              </button>
            )}
            {tab === 'profiles' && (
              <button onClick={() => { setShowCreateProfile(!showCreateProfile); setShowCreate(false) }}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
                {showCreateProfile ? 'Close' : 'New Profile'}
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => { setTab('critics'); setShowCreateProfile(false) }}
          className={`px-4 py-2 text-sm rounded ${tab === 'critics' ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'}`}>
          Critics ({critics.length})
        </button>
        <button onClick={() => { setTab('profiles'); setShowCreate(false) }}
          className={`px-4 py-2 text-sm rounded ${tab === 'profiles' ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'}`}>
          Evaluation Profiles ({profiles.length})
        </button>
      </div>

      {/* Create critic form */}
      {showCreate && tab === 'critics' && (
        <form onSubmit={createCritic} className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
          <h3 className="font-medium text-sm text-gray-500">Create New Critic</h3>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="border rounded px-3 py-2 text-sm" required />
            <input placeholder="Slug (e.g. my-critic)" value={createForm.slug} onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
              className="border rounded px-3 py-2 text-sm" required />
          </div>
          <textarea placeholder="Description" value={createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm" rows={2} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500">Category</label>
              <select value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm mt-0.5">
                {['canon', 'voice', 'safety', 'legal', 'visual', 'audio', 'cross-modal'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Modality</label>
              <select value={createForm.modality} onChange={(e) => setCreateForm({ ...createForm, modality: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm mt-0.5">
                {['text', 'image', 'audio', 'video', 'multi'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Default Weight</label>
              <input type="number" step="0.1" value={createForm.default_weight}
                onChange={(e) => setCreateForm({ ...createForm, default_weight: parseFloat(e.target.value) || 1.0 })}
                className="w-full border rounded px-3 py-2 text-sm mt-0.5" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Prompt Template</label>
            <textarea value={createForm.prompt_template}
              onChange={(e) => setCreateForm({ ...createForm, prompt_template: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm font-mono mt-0.5" rows={4} />
            <p className="text-xs text-gray-400 mt-1">
              Available: {'{character_name}'}, {'{canon_pack}'}, {'{safety_pack}'}, {'{legal_pack}'}, {'{content}'}, {'{extra_instructions}'}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Create Critic</button>
            <button type="button" onClick={() => setShowCreate(false)} className="border px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Create profile form */}
      {showCreateProfile && tab === 'profiles' && (
        <form onSubmit={createProfile} className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
          <h3 className="font-medium text-sm text-gray-500">Create New Evaluation Profile</h3>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Name" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className="border rounded px-3 py-2 text-sm" required />
            <input placeholder="Slug" value={profileForm.slug} onChange={(e) => setProfileForm({ ...profileForm, slug: e.target.value })}
              className="border rounded px-3 py-2 text-sm" required />
          </div>
          <textarea placeholder="Description" value={profileForm.description}
            onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm" rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Sampling Rate</label>
              <input type="number" step="0.05" min="0" max="1" value={profileForm.sampling_rate}
                onChange={(e) => setProfileForm({ ...profileForm, sampling_rate: parseFloat(e.target.value) || 1.0 })}
                className="w-full border rounded px-3 py-2 text-sm mt-0.5" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={profileForm.tiered_evaluation}
                  onChange={(e) => setProfileForm({ ...profileForm, tiered_evaluation: e.target.checked })} />
                Tiered Evaluation
              </label>
            </div>
          </div>
          {profileForm.tiered_evaluation && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Rapid Screen Critics</label>
                <div className="space-y-1 mt-1">
                  {critics.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox"
                        checked={profileForm.rapid_screen_critics.includes(c.id)}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...profileForm.rapid_screen_critics, c.id]
                            : profileForm.rapid_screen_critics.filter(id => id !== c.id)
                          setProfileForm({ ...profileForm, rapid_screen_critics: ids })
                        }} />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Deep Eval Critics</label>
                <div className="space-y-1 mt-1">
                  {critics.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox"
                        checked={profileForm.deep_eval_critics.includes(c.id)}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...profileForm.deep_eval_critics, c.id]
                            : profileForm.deep_eval_critics.filter(id => id !== c.id)
                          setProfileForm({ ...profileForm, deep_eval_critics: ids })
                        }} />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Create Profile</button>
            <button type="button" onClick={() => setShowCreateProfile(false)} className="border px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Critics list */}
      {tab === 'critics' && (
        <div className="space-y-3">
          {critics.map(renderCriticCard)}
          {critics.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
              No critics yet. Create one to get started.
            </div>
          )}
        </div>
      )}

      {/* Profiles list */}
      {tab === 'profiles' && (
        <div className="space-y-3">
          {profiles.map(renderProfileCard)}
          {profiles.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
              No evaluation profiles yet. Create one to get started.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
