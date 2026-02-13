import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

const SEVERITY_STYLES = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-200 text-red-800',
}

const MODALITY_COLORS = {
  text: 'bg-blue-50 text-blue-600',
  image: 'bg-green-50 text-green-600',
  audio: 'bg-purple-50 text-purple-600',
  video: 'bg-orange-50 text-orange-600',
}

export default function Taxonomy() {
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])

  // Selection
  const [selectedCat, setSelectedCat] = useState(null)

  // Create forms
  const [showCatForm, setShowCatForm] = useState(false)
  const [showTagForm, setShowTagForm] = useState(false)
  const [catForm, setCatForm] = useState({ name: '', slug: '', description: '' })
  const [tagForm, setTagForm] = useState({ name: '', slug: '', category_id: '', severity: 'medium', applicable_modalities: [], propagate_to_franchise: false, evaluation_rules: {} })

  // Edit state
  const [editingCat, setEditingCat] = useState(null)
  const [editCatForm, setEditCatForm] = useState({})
  const [editingTag, setEditingTag] = useState(null)
  const [editTagForm, setEditTagForm] = useState({})
  const [saving, setSaving] = useState(false)

  // Expanded tag detail
  const [expandedTag, setExpandedTag] = useState(null)

  const load = () => {
    api.get('/taxonomy/categories').then((r) => setCategories(r.data))
    api.get('/taxonomy/tags').then((r) => setTags(r.data))
  }
  useEffect(() => { load() }, [])

  // Category CRUD
  const createCat = async (e) => {
    e.preventDefault()
    await api.post('/taxonomy/categories', catForm)
    setCatForm({ name: '', slug: '', description: '' })
    setShowCatForm(false)
    load()
  }

  const startEditCat = (cat) => {
    setEditingCat(cat.id)
    setEditCatForm({ name: cat.name, slug: cat.slug, description: cat.description || '' })
  }

  const saveCat = async (catId) => {
    setSaving(true)
    await api.patch(`/taxonomy/categories/${catId}`, editCatForm)
    setEditingCat(null)
    load()
    setSaving(false)
  }

  const deleteCat = async (catId) => {
    if (!confirm('Delete this category and all its tags?')) return
    await api.delete(`/taxonomy/categories/${catId}`)
    if (selectedCat === catId) setSelectedCat(null)
    load()
  }

  // Tag CRUD
  const createTag = async (e) => {
    e.preventDefault()
    await api.post('/taxonomy/tags', {
      ...tagForm,
      category_id: parseInt(tagForm.category_id || selectedCat),
    })
    setTagForm({ name: '', slug: '', category_id: '', severity: 'medium', applicable_modalities: [], propagate_to_franchise: false, evaluation_rules: {} })
    setShowTagForm(false)
    load()
  }

  const startEditTag = (tag) => {
    setEditingTag(tag.id)
    setEditTagForm({
      name: tag.name,
      slug: tag.slug,
      severity: tag.severity,
      applicable_modalities: tag.applicable_modalities || [],
      propagate_to_franchise: tag.propagate_to_franchise,
      evaluation_rules: JSON.stringify(tag.evaluation_rules || {}, null, 2),
    })
  }

  const saveTag = async (tagId) => {
    setSaving(true)
    try {
      let evaluation_rules
      try { evaluation_rules = JSON.parse(editTagForm.evaluation_rules) } catch { evaluation_rules = undefined }
      const payload = {
        name: editTagForm.name,
        slug: editTagForm.slug,
        severity: editTagForm.severity,
        applicable_modalities: editTagForm.applicable_modalities,
        propagate_to_franchise: editTagForm.propagate_to_franchise,
      }
      if (evaluation_rules !== undefined) payload.evaluation_rules = evaluation_rules
      await api.patch(`/taxonomy/tags/${tagId}`, payload)
      setEditingTag(null)
      load()
    } catch (err) {
      console.error('Save tag failed', err)
    }
    setSaving(false)
  }

  const deleteTag = async (tagId) => {
    if (!confirm('Delete this tag?')) return
    await api.delete(`/taxonomy/tags/${tagId}`)
    load()
  }

  const toggleModality = (mod) => {
    setEditTagForm(prev => ({
      ...prev,
      applicable_modalities: prev.applicable_modalities.includes(mod)
        ? prev.applicable_modalities.filter(m => m !== mod)
        : [...prev.applicable_modalities, mod],
    }))
  }

  const toggleNewTagModality = (mod) => {
    setTagForm(prev => ({
      ...prev,
      applicable_modalities: prev.applicable_modalities.includes(mod)
        ? prev.applicable_modalities.filter(m => m !== mod)
        : [...prev.applicable_modalities, mod],
    }))
  }

  // Filtered tags
  const filteredTags = selectedCat ? tags.filter(t => t.category_id === selectedCat) : tags
  const catMap = {}
  categories.forEach(c => { catMap[c.id] = c.name })

  return (
    <div>
      <PageHeader title="Taxonomy" subtitle={`${categories.length} categories, ${tags.length} tags — Click a category to filter tags`} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column: Categories ────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">Categories</h3>
            <button onClick={() => { setShowCatForm(!showCatForm); setEditingCat(null) }}
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
              {showCatForm ? 'Cancel' : '+ Add'}
            </button>
          </div>

          {/* Create category form */}
          {showCatForm && (
            <form onSubmit={createCat} className="bg-white rounded-lg shadow p-3 mb-3 space-y-2">
              <input placeholder="Name" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                className="w-full border rounded px-2 py-1.5 text-sm" required />
              <input placeholder="Slug" value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                className="w-full border rounded px-2 py-1.5 text-sm" required />
              <textarea placeholder="Description (optional)" value={catForm.description}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                className="w-full border rounded px-2 py-1.5 text-sm" rows={2} />
              <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm w-full">Create Category</button>
            </form>
          )}

          {/* "All" filter */}
          <button
            onClick={() => setSelectedCat(null)}
            className={`w-full text-left rounded-lg p-3 mb-2 text-sm transition-colors ${
              selectedCat === null ? 'bg-blue-600 text-white shadow' : 'bg-white shadow hover:bg-gray-50'
            }`}>
            <div className="flex items-center justify-between">
              <span className="font-medium">All Categories</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${selectedCat === null ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {tags.length}
              </span>
            </div>
          </button>

          {/* Category cards */}
          <div className="space-y-2">
            {categories.map((c) => {
              const isSelected = selectedCat === c.id
              const isEditing = editingCat === c.id
              const tagCount = tags.filter(t => t.category_id === c.id).length

              return (
                <div key={c.id} className={`rounded-lg shadow transition-all ${isSelected ? 'ring-2 ring-blue-400 bg-blue-50' : 'bg-white hover:shadow-md'}`}>
                  {isEditing ? (
                    <div className="p-3 space-y-2">
                      <input value={editCatForm.name} onChange={(e) => setEditCatForm({ ...editCatForm, name: e.target.value })}
                        className="w-full border rounded px-2 py-1.5 text-sm" />
                      <input value={editCatForm.slug} onChange={(e) => setEditCatForm({ ...editCatForm, slug: e.target.value })}
                        className="w-full border rounded px-2 py-1.5 text-sm" />
                      <textarea value={editCatForm.description} onChange={(e) => setEditCatForm({ ...editCatForm, description: e.target.value })}
                        className="w-full border rounded px-2 py-1.5 text-sm" rows={2} placeholder="Description" />
                      <div className="flex gap-2">
                        <button onClick={() => saveCat(c.id)} disabled={saving}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50">
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingCat(null)} className="border px-3 py-1 rounded text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 cursor-pointer" onClick={() => setSelectedCat(isSelected ? null : c.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{c.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                              {tagCount}
                            </span>
                          </div>
                          {c.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{c.description}</p>}
                        </div>
                        <div className="flex gap-1 ml-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => startEditCat(c)}
                            className="text-xs text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded hover:bg-blue-50">
                            Edit
                          </button>
                          <button onClick={() => deleteCat(c.id)}
                            className="text-xs text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-50">
                            Del
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right columns: Tags ────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">
              Tags {selectedCat ? <span className="text-blue-600 font-normal">in {catMap[selectedCat]}</span> : ''}
              <span className="text-gray-400 font-normal text-sm ml-2">({filteredTags.length})</span>
            </h3>
            <button onClick={() => { setShowTagForm(!showTagForm); setEditingTag(null) }}
              className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
              {showTagForm ? 'Cancel' : '+ Add Tag'}
            </button>
          </div>

          {/* Create tag form */}
          {showTagForm && (
            <form onSubmit={createTag} className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Name" value={tagForm.name} onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                  className="border rounded px-2 py-1.5 text-sm" required />
                <input placeholder="Slug" value={tagForm.slug} onChange={(e) => setTagForm({ ...tagForm, slug: e.target.value })}
                  className="border rounded px-2 py-1.5 text-sm" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={tagForm.category_id || selectedCat || ''} onChange={(e) => setTagForm({ ...tagForm, category_id: e.target.value })}
                  className="border rounded px-2 py-1.5 text-sm" required>
                  <option value="">Category...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={tagForm.severity} onChange={(e) => setTagForm({ ...tagForm, severity: e.target.value })}
                  className="border rounded px-2 py-1.5 text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Applicable Modalities</label>
                <div className="flex gap-2">
                  {['text', 'image', 'audio', 'video'].map((m) => (
                    <label key={m} className="flex items-center gap-1 text-sm cursor-pointer">
                      <input type="checkbox" checked={tagForm.applicable_modalities.includes(m)}
                        onChange={() => toggleNewTagModality(m)} className="rounded" />
                      {m}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={tagForm.propagate_to_franchise}
                  onChange={(e) => setTagForm({ ...tagForm, propagate_to_franchise: e.target.checked })}
                  className="rounded" />
                Propagate to franchise
              </label>
              <button type="submit" className="bg-green-600 text-white px-4 py-1.5 rounded text-sm">Create Tag</button>
            </form>
          )}

          {/* Tags list */}
          <div className="space-y-2">
            {filteredTags.map((t) => {
              const isEditing = editingTag === t.id
              const isExpanded = expandedTag === t.id

              return (
                <div key={t.id} className={`bg-white rounded-lg shadow transition-all ${isExpanded ? 'ring-2 ring-green-300' : 'hover:shadow-md'}`}>
                  {isEditing ? (
                    /* ── Edit tag form ──────────────────── */
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input value={editTagForm.name} onChange={(e) => setEditTagForm({ ...editTagForm, name: e.target.value })}
                          className="border rounded px-2 py-1.5 text-sm" placeholder="Name" />
                        <input value={editTagForm.slug} onChange={(e) => setEditTagForm({ ...editTagForm, slug: e.target.value })}
                          className="border rounded px-2 py-1.5 text-sm" placeholder="Slug" />
                      </div>
                      <select value={editTagForm.severity} onChange={(e) => setEditTagForm({ ...editTagForm, severity: e.target.value })}
                        className="w-full border rounded px-2 py-1.5 text-sm">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Applicable Modalities</label>
                        <div className="flex gap-2">
                          {['text', 'image', 'audio', 'video'].map((m) => (
                            <label key={m} className="flex items-center gap-1 text-sm cursor-pointer">
                              <input type="checkbox" checked={editTagForm.applicable_modalities.includes(m)}
                                onChange={() => toggleModality(m)} className="rounded" />
                              {m}
                            </label>
                          ))}
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={editTagForm.propagate_to_franchise}
                          onChange={(e) => setEditTagForm({ ...editTagForm, propagate_to_franchise: e.target.checked })}
                          className="rounded" />
                        Propagate to franchise
                      </label>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Evaluation Rules (JSON)</label>
                        <textarea value={editTagForm.evaluation_rules}
                          onChange={(e) => setEditTagForm({ ...editTagForm, evaluation_rules: e.target.value })}
                          className="w-full border rounded px-2 py-1.5 text-xs font-mono" rows={4} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveTag(t.id)} disabled={saving}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50">
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingTag(null)} className="border px-3 py-1.5 rounded text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    /* ── Tag display ────────────────────── */
                    <>
                      <div className="p-3 cursor-pointer" onClick={() => setExpandedTag(isExpanded ? null : t.id)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                            <span className="font-medium text-sm">{t.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${SEVERITY_STYLES[t.severity] || SEVERITY_STYLES.medium}`}>
                              {t.severity}
                            </span>
                            {!selectedCat && (
                              <span className="text-xs text-gray-400">{catMap[t.category_id]}</span>
                            )}
                            {t.propagate_to_franchise && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">franchise</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex gap-1">
                              {(t.applicable_modalities || []).map((m) => (
                                <span key={m} className={`text-xs px-1.5 py-0.5 rounded ${MODALITY_COLORS[m] || 'bg-gray-100'}`}>{m}</span>
                              ))}
                            </div>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="border-t px-4 py-3 bg-gray-50">
                          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Slug</p>
                              <p className="font-mono text-gray-600">{t.slug}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Category</p>
                              <p className="text-gray-600">{catMap[t.category_id] || `#${t.category_id}`}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Franchise Propagation</p>
                              <p className={t.propagate_to_franchise ? 'text-indigo-600 font-medium' : 'text-gray-400'}>
                                {t.propagate_to_franchise ? 'Enabled' : 'Disabled'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Created</p>
                              <p className="text-gray-600">{new Date(t.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {t.evaluation_rules && Object.keys(t.evaluation_rules).length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-400 mb-1">Evaluation Rules</p>
                              <pre className="text-xs bg-white border rounded p-2 font-mono overflow-auto max-h-32">
                                {JSON.stringify(t.evaluation_rules, null, 2)}
                              </pre>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); startEditTag(t) }}
                              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Edit</button>
                            <button onClick={(e) => { e.stopPropagation(); deleteTag(t.id) }}
                              className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Delete</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
            {filteredTags.length === 0 && (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400 text-sm">
                {selectedCat ? 'No tags in this category. Click "+ Add Tag" to create one.' : 'No tags yet. Create a category first, then add tags.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
