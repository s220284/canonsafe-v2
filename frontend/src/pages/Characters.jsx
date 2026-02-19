import { useState, useEffect, useMemo } from 'react'
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

const SPECIES_EMOJI = {
  pig: '\u{1F437}', rabbit: '\u{1F430}', sheep: '\u{1F411}', cat: '\u{1F431}',
  dog: '\u{1F436}', pony: '\u{1F434}', zebra: '\u{1F993}', elephant: '\u{1F418}',
  donkey: '\u{1F434}', fox: '\u{1F98A}', kangaroo: '\u{1F998}', wolf: '\u{1F43A}',
  gazelle: '\u{1F98C}', giraffe: '\u{1F992}',
}

function getSpecies(c) {
  const desc = (c.description || '').toLowerCase()
  for (const s of Object.keys(SPECIES_EMOJI)) {
    if (desc.includes(s)) return s
  }
  const nameLower = c.name.toLowerCase()
  if (nameLower.includes('pig')) return 'pig'
  if (nameLower.includes('rabbit') || nameLower.includes('lapin')) return 'rabbit'
  if (nameLower.includes('sheep')) return 'sheep'
  if (nameLower.includes('cat') || nameLower.includes('leopard')) return 'cat'
  if (nameLower.includes('dog') || nameLower.includes('labrador') || nameLower.includes('corgi') || nameLower.includes('coyote')) return 'dog'
  if (nameLower.includes('pony') || nameLower.includes('stallion')) return 'pony'
  if (nameLower.includes('zebra')) return 'zebra'
  if (nameLower.includes('elephant')) return 'elephant'
  if (nameLower.includes('donkey')) return 'donkey'
  if (nameLower.includes('fox')) return 'fox'
  if (nameLower.includes('kangaroo') || nameLower.includes('joey')) return 'kangaroo'
  if (nameLower.includes('wolf')) return 'wolf'
  if (nameLower.includes('gazelle')) return 'gazelle'
  if (nameLower.includes('giraffe')) return 'giraffe'
  if (nameLower.includes('tooth fairy')) return 'pig'
  return 'unknown'
}

export default function Characters() {
  const [characters, setCharacters] = useState([])
  const [franchises, setFranchises] = useState([])
  const [franchiseMap, setFranchiseMap] = useState({})
  const [franchiseFilter, setFranchiseFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', description: '' })
  const [search, setSearch] = useState('')
  const [speciesFilter, setSpeciesFilter] = useState('all')
  const [sortBy, setSortBy] = useState('priority')
  const [viewMode, setViewMode] = useState('grid')

  const load = () => {
    const params = franchiseFilter !== 'all' ? `?franchise_id=${franchiseFilter}` : ''
    api.get(`/characters${params}`).then((r) => setCharacters(r.data))
  }
  useEffect(() => {
    api.get('/franchises').then((r) => {
      setFranchises(r.data)
      const map = {}
      r.data.forEach(f => { map[f.id] = f.name })
      setFranchiseMap(map)
    })
  }, [])
  useEffect(() => { load() }, [franchiseFilter])

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

  // Derive species list from data
  const speciesList = useMemo(() => {
    const set = new Set()
    characters.forEach(c => set.add(getSpecies(c)))
    return Array.from(set).sort()
  }, [characters])

  // Filter and sort
  const filtered = useMemo(() => {
    let list = [...characters]

    // Search
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
      )
    }

    // Species filter
    if (speciesFilter !== 'all') {
      list = list.filter(c => getSpecies(c) === speciesFilter)
    }

    // Sort
    switch (sortBy) {
      case 'priority':
        list.sort((a, b) => {
          if (a.is_main !== b.is_main) return a.is_main ? -1 : 1
          if (a.is_focus !== b.is_focus) return a.is_focus ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        break
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'species':
        list.sort((a, b) => {
          const sa = getSpecies(a), sb = getSpecies(b)
          if (sa !== sb) return sa.localeCompare(sb)
          return a.name.localeCompare(b.name)
        })
        break
      case 'status':
        list.sort((a, b) => {
          if (a.status !== b.status) return a.status === 'active' ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        break
      default:
        break
    }

    return list
  }, [characters, search, speciesFilter, sortBy])

  // Grouped view for priority sort
  const mainChars = filtered.filter(c => c.is_main)
  const focusChars = filtered.filter(c => !c.is_main && c.is_focus)
  const otherChars = filtered.filter(c => !c.is_main && !c.is_focus)

  // Species-grouped view
  const speciesGroups = useMemo(() => {
    if (sortBy !== 'species') return {}
    const groups = {}
    filtered.forEach(c => {
      const s = getSpecies(c)
      if (!groups[s]) groups[s] = []
      groups[s].push(c)
    })
    return groups
  }, [filtered, sortBy])

  const renderCard = (c, i) => (
    <Link key={c.id} to={`/characters/${c.id}`}
      className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex flex-col">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
          {SPECIES_EMOJI[getSpecies(c)] || c.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{c.name}</h3>
            {c.is_main && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 flex-shrink-0">Main</span>}
            {c.is_focus && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex-shrink-0">Focus</span>}
          </div>
          <p className="text-xs text-gray-400 capitalize">{getSpecies(c)}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-2 line-clamp-2 flex-1">{c.description || 'No description'}</p>
      <div className="flex items-center gap-4 border-t pt-2">
        <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer"
          onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={c.is_main}
            onChange={(e) => { e.preventDefault(); e.stopPropagation(); toggleMain(c.id, c.is_main) }}
            className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-400 w-3.5 h-3.5" />
          Main
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer"
          onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={c.is_focus}
            onChange={(e) => { e.preventDefault(); e.stopPropagation(); toggleFocus(c.id, c.is_focus) }}
            className="rounded border-gray-300 text-blue-500 focus:ring-blue-400 w-3.5 h-3.5" />
          Focus
        </label>
        <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${c.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
          {c.status}
        </span>
      </div>
    </Link>
  )

  const renderRow = (c) => (
    <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/characters/${c.id}`}>
      <td className="px-3 py-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-base">{SPECIES_EMOJI[getSpecies(c)] || ''}</span>
          <span className="font-medium">{c.name}</span>
          {c.is_main && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">Main</span>}
          {c.is_focus && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Focus</span>}
        </div>
      </td>
      <td className="px-3 py-2 text-xs text-gray-500 capitalize">{getSpecies(c)}</td>
      <td className="px-3 py-2 text-xs">
        <span className={`px-1.5 py-0.5 rounded ${c.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
          {c.status}
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={c.is_main}
              onChange={() => toggleMain(c.id, c.is_main)}
              className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-400 w-3.5 h-3.5" />
            Main
          </label>
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={c.is_focus}
              onChange={() => toggleFocus(c.id, c.is_focus)}
              className="rounded border-gray-300 text-blue-500 focus:ring-blue-400 w-3.5 h-3.5" />
            Focus
          </label>
        </div>
      </td>
    </tr>
  )

  let globalIdx = 0

  const renderSection = (title, chars, colorClass) => {
    if (chars.length === 0) return null
    return (
      <div key={title}>
        <h2 className={`text-sm font-semibold uppercase tracking-wide mb-2 mt-4 ${colorClass}`}>
          {title} ({chars.length})
        </h2>
        {viewMode === 'grid' ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-4">
            {chars.map((c) => renderCard(c, globalIdx++))}
          </div>
        ) : (
          <table className="w-full bg-white rounded-lg shadow text-left mb-4">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Species</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Flags</th>
              </tr>
            </thead>
            <tbody>{chars.map(renderRow)}</tbody>
          </table>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Characters"
        subtitle={`${characters.length} character cards${franchiseFilter !== 'all' ? ` in ${franchiseMap[franchiseFilter] || 'franchise'}` : ''}`}
        action={
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
            New Character
          </button>
        }
      />

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow p-3 mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search characters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded px-3 py-1.5 text-sm pl-8"
          />
          <svg className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Franchise filter */}
        {franchises.length > 1 && (
          <select
            value={franchiseFilter}
            onChange={(e) => setFranchiseFilter(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value="all">All Franchises</option>
            {franchises.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        )}

        {/* Species filter */}
        <select
          value={speciesFilter}
          onChange={(e) => setSpeciesFilter(e.target.value)}
          className="border rounded px-2 py-1.5 text-sm"
        >
          <option value="all">All Species ({characters.length})</option>
          {speciesList.map(s => (
            <option key={s} value={s}>
              {SPECIES_EMOJI[s] || ''} {s.charAt(0).toUpperCase() + s.slice(1)} ({characters.filter(c => getSpecies(c) === s).length})
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border rounded px-2 py-1.5 text-sm"
        >
          <option value="priority">Sort: Priority (Main first)</option>
          <option value="name">Sort: A-Z</option>
          <option value="species">Sort: Species</option>
          <option value="status">Sort: Status</option>
        </select>

        {/* View toggle */}
        <div className="flex border rounded overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-2.5 py-1.5 text-sm ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            title="Grid view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-2.5 py-1.5 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            title="List view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Count */}
        <span className="text-xs text-gray-400">
          {filtered.length} of {characters.length}
        </span>
      </div>

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

      {/* Render characters */}
      {sortBy === 'priority' && (
        <>
          {renderSection('Main Characters', mainChars, 'text-yellow-700')}
          {renderSection('Focus Characters', focusChars, 'text-blue-700')}
          {renderSection('All Characters', otherChars, 'text-gray-500')}
        </>
      )}

      {sortBy === 'species' && (
        Object.keys(speciesGroups).sort().map(species => (
          renderSection(
            `${SPECIES_EMOJI[species] || ''} ${species.charAt(0).toUpperCase() + species.slice(1)} Family`,
            speciesGroups[species],
            'text-gray-700'
          )
        ))
      )}

      {(sortBy === 'name' || sortBy === 'status') && (
        viewMode === 'grid' ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((c) => renderCard(c, globalIdx++))}
          </div>
        ) : (
          <table className="w-full bg-white rounded-lg shadow text-left">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Species</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Flags</th>
              </tr>
            </thead>
            <tbody>{filtered.map(renderRow)}</tbody>
          </table>
        )
      )}

      {filtered.length === 0 && characters.length > 0 && (
        <p className="text-gray-500 text-sm text-center py-8">No characters match your search/filter.</p>
      )}
      {characters.length === 0 && (
        <p className="text-gray-500 text-sm">No characters yet. Create one to get started.</p>
      )}
    </div>
  )
}
