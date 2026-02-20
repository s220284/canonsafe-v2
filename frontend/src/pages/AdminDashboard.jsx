import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

export default function AdminDashboard() {
  const { switchOrg } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [orgs, setOrgs] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', display_name: '', industry: '', plan: 'trial' })
  const [msg, setMsg] = useState('')

  const load = () => {
    api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {})
    api.get('/admin/orgs').then(r => setOrgs(r.data)).catch(() => {})
  }
  useEffect(load, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setMsg('')
    try {
      await api.post('/admin/orgs', form)
      setForm({ name: '', display_name: '', industry: '', plan: 'trial' })
      setShowCreate(false)
      load()
      setMsg('Organization created.')
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Error creating org')
    }
  }

  const handleToggleActive = async (org) => {
    try {
      await api.patch(`/admin/orgs/${org.id}`, { is_active: !org.is_active })
      load()
    } catch {}
  }

  const handlePlanChange = async (orgId, plan) => {
    try { await api.patch(`/admin/orgs/${orgId}`, { plan }); load() } catch {}
  }

  const handleSeed = async (orgId, dataset) => {
    try {
      await api.post(`/admin/orgs/${orgId}/seed?dataset=${dataset}`)
      setMsg(`Demo data seeded for org #${orgId}`)
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Error seeding data')
    }
  }

  const [inviteOrgId, setInviteOrgId] = useState(null)
  const [invEmail, setInvEmail] = useState('')
  const [invRole, setInvRole] = useState('admin')

  const handleInvite = async (e) => {
    e.preventDefault()
    try {
      const r = await api.post(`/admin/orgs/${inviteOrgId}/invite`, { email: invEmail, role: invRole })
      setMsg(`Invitation sent! Token: ${r.data.token}`)
      setInviteOrgId(null); setInvEmail('')
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Error inviting')
    }
  }

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Super-admin control plane — manage all organizations" />

      {msg && <div className="bg-blue-50 text-blue-700 p-3 rounded mb-4 text-sm">{msg}</div>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            { label: 'Organizations', value: stats.organizations, color: 'bg-blue-500' },
            { label: 'Total Users', value: stats.total_users, color: 'bg-green-500' },
            { label: 'Active Users', value: stats.active_users, color: 'bg-emerald-500' },
            { label: 'Characters', value: stats.total_characters, color: 'bg-purple-500' },
            { label: 'Evaluations', value: stats.total_evaluations, color: 'bg-orange-500' },
            { label: 'Franchises', value: stats.total_franchises, color: 'bg-indigo-500' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-lg shadow p-4">
              <div className={`w-2 h-2 rounded-full ${c.color} mb-2`} />
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-sm text-gray-500">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h3 className="font-semibold">All Organizations</h3>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">Create Organization</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="text-left px-4 py-2">Name</th>
            <th className="text-left px-4 py-2">Industry</th>
            <th className="text-left px-4 py-2">Plan</th>
            <th className="text-left px-4 py-2">Status</th>
            <th className="text-left px-4 py-2">Actions</th>
          </tr></thead>
          <tbody className="divide-y">
            {orgs.map(org => (
              <tr key={org.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <div className="font-medium">{org.display_name || org.name}</div>
                  <div className="text-xs text-gray-400">{org.slug}</div>
                </td>
                <td className="px-4 py-2 text-gray-500">{org.industry || '—'}</td>
                <td className="px-4 py-2">
                  <select value={org.plan} onChange={e => handlePlanChange(org.id, e.target.value)} className="border rounded px-2 py-1 text-xs">
                    <option value="trial">Trial</option>
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${org.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {org.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2 space-x-2">
                  <button onClick={() => { switchOrg(org.id, org.display_name || org.name); navigate('/') }} className="text-xs text-yellow-600 font-semibold hover:underline">Enter</button>
                  <button onClick={() => setInviteOrgId(org.id)} className="text-xs text-blue-600 hover:underline">Invite</button>
                  <button onClick={() => handleSeed(org.id, 'demo_small')} className="text-xs text-purple-600 hover:underline">Seed</button>
                  <button onClick={() => handleToggleActive(org)} className="text-xs text-gray-500 hover:underline">
                    {org.is_active ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="font-semibold mb-4">Create Organization</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <input type="text" placeholder="Organization Name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required className="w-full border rounded px-3 py-2 text-sm" />
              <input type="text" placeholder="Display Name (optional)" value={form.display_name} onChange={e => setForm(f => ({...f, display_name: e.target.value}))} className="w-full border rounded px-3 py-2 text-sm" />
              <input type="text" placeholder="Industry (optional)" value={form.industry} onChange={e => setForm(f => ({...f, industry: e.target.value}))} className="w-full border rounded px-3 py-2 text-sm" />
              <select value={form.plan} onChange={e => setForm(f => ({...f, plan: e.target.value}))} className="w-full border rounded px-3 py-2 text-sm">
                <option value="trial">Trial</option><option value="starter">Starter</option>
                <option value="professional">Professional</option><option value="enterprise">Enterprise</option>
              </select>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {inviteOrgId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="font-semibold mb-4">Invite User to Org #{inviteOrgId}</h3>
            <form onSubmit={handleInvite} className="space-y-3">
              <input type="email" placeholder="Email" value={invEmail} onChange={e => setInvEmail(e.target.value)} required className="w-full border rounded px-3 py-2 text-sm" />
              <select value={invRole} onChange={e => setInvRole(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                <option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option>
              </select>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setInviteOrgId(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
