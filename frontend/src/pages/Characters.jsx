import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

const AVATAR_COLORS = [
  'bg-pink-100 text-pink-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-yellow-100 text-yellow-700',
  'bg-red-100 text-red-700',
  'bg-cyan-100 text-cyan-700',
]

export default function Characters() {
  const [characters, setCharacters] = useState([])
  const [franchiseMap, setFranchiseMap] = useState({})
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', description: '' })

  const load = () => api.get('/characters').then((r) => setCharacters(r.data))
  useEffect(() => {
    load()
    api.get('/franchises').then((r) => {
      const map = {}
      r.data.forEach(f => { map[f.id] = f.name })
      setFranchiseMap(map)
    })
  }, [])

  const create = async (e) => {
    e.preventDefault()
    await api.post('/characters', form)
    setForm({ name: '', slug: '', description: '' })
    setShowCreate(false)
    load()
  }

  const toggleMain = async (charId, current) => {
    await api.patch(`/characters/${charId}`, { is_main: !current })
    load()
  }

  const toggleFocus = async (charId, current) => {
    await api.patch(`/characters/${charId}`, { is_focus: !current })
    load()
  }

  const mainChars = characters.filter(c => c.is_main)
  const focusChars = characters.filter(c => !c.is_main && c.is_focus)
  const otherChars = characters.filter(c => !c.is_main && !c.is_focus)

  const renderCard = (c, i) => (
    <Link key={c.id} to={`/characters/${c.id}`}
      className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
          {c.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{c.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
              c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>{c.status}</span>
            {c.is_main && <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 flex-shrink-0">Main</span>}
            {c.is_focus && <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 flex-shrink-0">Focus</span>}
          </div>
          {c.franchise_id && (
            <p className="text-xs text-blue-500">{franchiseMap[c.franchise_id] || 'Franchise'}</p>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-2 line-clamp-2 flex-1">{c.description || 'No description'}</p>
      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
        <span>v{c.active_version_id || '—'}</span>
        <span>ID: {c.id}</span>
      </div>
      <div className="flex items-center gap-4 border-t pt-2">
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer"
          onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={c.is_main}
            onChange={(e) => { e.preventDefault(); e.stopPropagation(); toggleMain(c.id, c.is_main) }}
            className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-400" />
          Main
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer"
          onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={c.is_focus}
            onChange={(e) => { e.preventDefault(); e.stopPropagation(); toggleFocus(c.id, c.is_focus) }}
            className="rounded border-gray-300 text-blue-500 focus:ring-blue-400" />
          Focus
        </label>
      </div>
    </Link>
  )

  let globalIdx = 0

  return (
    <div>
      <PageHeader
        title="Characters"
        subtitle={`${characters.length} character cards — Manage character cards and their identity packs`}
        action={
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
            New Character
          </button>
        }
      />
      {showCreate && (
        <form onSubmit={create} className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm" required />
          <input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm" required />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm" rows={2} />
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="border px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Main Characters */}
      {mainChars.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-yellow-700 uppercase tracking-wide mb-2 mt-2">Main Characters</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {mainChars.map((c) => renderCard(c, globalIdx++))}
          </div>
        </>
      )}

      {/* Focus Characters */}
      {focusChars.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-2">Focus Characters</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {focusChars.map((c) => renderCard(c, globalIdx++))}
          </div>
        </>
      )}

      {/* Other Characters */}
      {otherChars.length > 0 && (
        <>
          {(mainChars.length > 0 || focusChars.length > 0) && (
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">All Characters</h2>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {otherChars.map((c) => renderCard(c, globalIdx++))}
          </div>
        </>
      )}

      {characters.length === 0 && (
        <p className="text-gray-500 text-sm">No characters yet. Create one to get started.</p>
      )}
    </div>
  )
}
