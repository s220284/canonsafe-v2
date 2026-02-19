import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

export default function Franchises() {
  const [franchises, setFranchises] = useState([])
  const [charCounts, setCharCounts] = useState({})
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', description: '' })

  const load = () => api.get('/franchises').then((r) => setFranchises(r.data))
  useEffect(() => {
    load()
    api.get('/characters').then((r) => {
      const counts = {}
      r.data.forEach(c => {
        if (c.franchise_id) {
          counts[c.franchise_id] = (counts[c.franchise_id] || 0) + 1
        }
      })
      setCharCounts(counts)
    })
  }, [])

  const create = async (e) => {
    e.preventDefault()
    await api.post('/franchises', form)
    setForm({ name: '', slug: '', description: '' })
    setShowCreate(false)
    load()
  }

  return (
    <div>
      <PageHeader
        title="Franchises"
        subtitle={`${franchises.length} franchises — Manage IP franchises and view cross-character health`}
        action={
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
            New Franchise
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
      <div className="grid gap-4 md:grid-cols-2">
        {franchises.map((f) => (
          <div key={f.id} className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center text-xl font-bold">
                {f.name[0]}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{f.name}</h3>
                <p className="text-xs text-gray-400">{f.slug}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-3">{f.description || 'No description'}</p>
            <div className="flex gap-4 text-xs text-gray-400 mb-3">
              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{charCounts[f.id] || 0} characters</span>
              {f.settings?.content_rating && (
                <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded">Rated {f.settings.content_rating}</span>
              )}
              {f.settings?.age_recommendation && (
                <span className="bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded">Ages {f.settings.age_recommendation}</span>
              )}
            </div>
            <div className="flex gap-2 border-t pt-3">
              <Link to={`/characters?franchise=${f.id}`}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                View Characters
              </Link>
              <span className="text-gray-300">|</span>
              <Link to={`/franchises/${f.id}/health`}
                className="text-sm text-gray-500 hover:text-gray-700">
                Health Dashboard
              </Link>
            </div>
          </div>
        ))}
        {franchises.length === 0 && (
          <p className="text-gray-500 text-sm col-span-full">No franchises yet. Create one to get started.</p>
        )}
      </div>
    </div>
  )
}
