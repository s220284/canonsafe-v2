import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

const tabs = ['Account', 'Organization', 'Users', 'API Keys', 'Audit Log']

export default function Settings() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('Account')
  const isAdmin = user?.role === 'admin'

  return (
    <div>
      <PageHeader title="Settings" subtitle="Account, organization, and team management" />
      <div className="border-b mb-6">
        <nav className="flex gap-1">
          {tabs.map(tab => {
            if (['Organization','Users','API Keys','Audit Log'].includes(tab) && !isAdmin) return null
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab}
              </button>
            )
          })}
        </nav>
      </div>
      {activeTab === 'Account' && <AccountTab />}
      {activeTab === 'Organization' && isAdmin && <OrganizationTab />}
      {activeTab === 'Users' && isAdmin && <UsersTab />}
      {activeTab === 'API Keys' && isAdmin && <ApiKeysTab />}
      {activeTab === 'Audit Log' && isAdmin && <AuditLogTab />}
    </div>
  )
}

function AccountTab() {
  const { user } = useAuth()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [msg, setMsg] = useState('')

  const handleChangePw = async (e) => {
    e.preventDefault()
    setMsg('')
    try {
      await api.post('/auth/change-password', { current_password: currentPw, new_password: newPw })
      setMsg('Password changed successfully.')
      setCurrentPw(''); setNewPw('')
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Error changing password')
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-4">Account Information</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{user?.email}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Name</span><span>{user?.full_name || 'Not set'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Role</span><span className="capitalize">{user?.role}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Organization</span><span>{user?.org_name || `Org #${user?.org_id}`}</span></div>
          {user?.is_super_admin && <div className="flex justify-between"><span className="text-gray-500">Super Admin</span><span className="text-green-600 font-medium">Yes</span></div>}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-4">Change Password</h3>
        {msg && <div className={`text-sm p-2 rounded mb-3 ${msg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg}</div>}
        <form onSubmit={handleChangePw} className="space-y-3">
          <input type="password" placeholder="Current password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required className="w-full border rounded px-3 py-2 text-sm" />
          <input type="password" placeholder="New password" value={newPw} onChange={e => setNewPw(e.target.value)} required className="w-full border rounded px-3 py-2 text-sm" />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Change Password</button>
        </form>
      </div>
    </div>
  )
}

function OrganizationTab() {
  const [org, setOrg] = useState(null)
  const [form, setForm] = useState({ display_name: '', industry: '' })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.get('/org').then(r => {
      setOrg(r.data)
      setForm({ display_name: r.data.display_name || '', industry: r.data.industry || '' })
    }).catch(() => {})
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const r = await api.patch('/org', form)
      setOrg(r.data)
      setMsg('Organization updated.')
    } catch { setMsg('Error updating.') }
  }

  if (!org) return <div className="text-sm text-gray-500">Loading...</div>

  return (
    <div className="max-w-lg">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-4">Organization Settings</h3>
        {msg && <div className="text-sm bg-green-50 text-green-700 p-2 rounded mb-3">{msg}</div>}
        <div className="space-y-3 text-sm mb-4">
          <div className="flex justify-between"><span className="text-gray-500">Name</span><span>{org.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="capitalize">{org.plan}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Slug</span><span>{org.slug}</span></div>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Display Name</label>
            <input value={form.display_name} onChange={e => setForm(f => ({...f, display_name: e.target.value}))} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Industry</label>
            <input value={form.industry} onChange={e => setForm(f => ({...f, industry: e.target.value}))} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Save</button>
        </form>
      </div>
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [invEmail, setInvEmail] = useState('')
  const [invRole, setInvRole] = useState('viewer')
  const [msg, setMsg] = useState('')

  const load = () => {
    api.get('/users').then(r => setUsers(r.data)).catch(() => {})
    api.get('/users/invitations').then(r => setInvitations(r.data)).catch(() => {})
  }
  useEffect(load, [])

  const handleInvite = async (e) => {
    e.preventDefault()
    setMsg('')
    try {
      const r = await api.post('/users/invite', { email: invEmail, role: invRole })
      setMsg(`Invitation sent! Token: ${r.data.token}`)
      setInvEmail(''); setShowInvite(false); load()
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Error inviting')
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole })
      load()
    } catch {}
  }

  const handleToggleActive = async (userId, isActive) => {
    try {
      await api.post(`/users/${userId}/${isActive ? 'deactivate' : 'reactivate'}`)
      load()
    } catch {}
  }

  const handleRevoke = async (invId) => {
    try { await api.delete(`/users/invitations/${invId}`); load() } catch {}
  }

  const copyLink = (token) => {
    const url = `${window.location.origin}/accept-invitation?token=${token}`
    navigator.clipboard.writeText(url)
    setMsg('Link copied to clipboard!')
  }

  return (
    <div className="space-y-6">
      {msg && <div className="text-sm bg-blue-50 text-blue-700 p-3 rounded">{msg}</div>}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h3 className="font-semibold">Team Members ({users.length})</h3>
          <button onClick={() => setShowInvite(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">Invite User</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="text-left px-4 py-2">Email</th><th className="text-left px-4 py-2">Name</th>
            <th className="text-left px-4 py-2">Role</th><th className="text-left px-4 py-2">Status</th>
            <th className="text-left px-4 py-2">Actions</th>
          </tr></thead>
          <tbody className="divide-y">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.full_name || '—'}</td>
                <td className="px-4 py-2">
                  <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)} className="border rounded px-2 py-1 text-xs">
                    <option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <button onClick={() => handleToggleActive(u.id, u.is_active)} className="text-xs text-gray-500 hover:text-gray-700">
                    {u.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invitations.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b"><h3 className="font-semibold">Pending Invitations</h3></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="text-left px-4 py-2">Email</th><th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2">Expires</th><th className="text-left px-4 py-2">Actions</th>
            </tr></thead>
            <tbody className="divide-y">
              {invitations.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{inv.email}</td>
                  <td className="px-4 py-2 capitalize">{inv.role}</td>
                  <td className="px-4 py-2 text-gray-400">{new Date(inv.expires_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 space-x-2">
                    <button onClick={() => copyLink(inv.token)} className="text-xs text-blue-600 hover:underline">Copy Link</button>
                    <button onClick={() => handleRevoke(inv.id)} className="text-xs text-red-600 hover:underline">Revoke</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="font-semibold mb-4">Invite User</h3>
            <form onSubmit={handleInvite} className="space-y-3">
              <input type="email" placeholder="Email" value={invEmail} onChange={e => setInvEmail(e.target.value)} required className="w-full border rounded px-3 py-2 text-sm" />
              <select value={invRole} onChange={e => setInvRole(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                <option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option>
              </select>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Send Invitation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ApiKeysTab() {
  const [keys, setKeys] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyResult, setNewKeyResult] = useState(null)

  const load = () => { api.get('/api-keys').then(r => setKeys(r.data)).catch(() => {}) }
  useEffect(load, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const r = await api.post('/api-keys', { name: newKeyName })
      setNewKeyResult(r.data)
      setNewKeyName(''); load()
    } catch {}
  }

  const handleRevoke = async (id) => {
    try { await api.delete(`/api-keys/${id}`); load() } catch {}
  }

  return (
    <div className="space-y-6">
      {newKeyResult && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-2">API Key Created — Copy it now! It won't be shown again.</h4>
          <code className="block bg-white border rounded p-2 text-sm font-mono break-all">{newKeyResult.full_key}</code>
          <button onClick={() => { navigator.clipboard.writeText(newKeyResult.full_key); setNewKeyResult(null) }} className="mt-2 text-sm text-blue-600 hover:underline">Copy & Dismiss</button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h3 className="font-semibold">API Keys</h3>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">Create Key</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">Prefix</th>
            <th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">Last Used</th>
            <th className="text-left px-4 py-2">Actions</th>
          </tr></thead>
          <tbody className="divide-y">
            {keys.map(k => (
              <tr key={k.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{k.name}</td>
                <td className="px-4 py-2 font-mono text-gray-500">{k.key_prefix}...</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${k.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {k.is_active ? 'Active' : 'Revoked'}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Never'}</td>
                <td className="px-4 py-2">
                  {k.is_active && <button onClick={() => handleRevoke(k.id)} className="text-xs text-red-600 hover:underline">Revoke</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="font-semibold mb-4">Create API Key</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <input type="text" placeholder="Key name (e.g., Production Agent)" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} required className="w-full border rounded px-3 py-2 text-sm" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function AuditLogTab() {
  const [logs, setLogs] = useState([])
  const [actionFilter, setActionFilter] = useState('')

  useEffect(() => {
    const params = actionFilter ? `?action=${actionFilter}` : ''
    api.get(`/audit${params}`).then(r => setLogs(r.data)).catch(() => {})
  }, [actionFilter])

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="border rounded px-3 py-2 text-sm">
          <option value="">All Actions</option>
          <option value="user.login">Login</option>
          <option value="user.register">Register</option>
          <option value="user.invite">Invite</option>
          <option value="eval.run">Evaluation</option>
          <option value="character.create">Character Create</option>
          <option value="character.update">Character Update</option>
          <option value="character.delete">Character Delete</option>
          <option value="cert.create">Certification</option>
          <option value="redteam.run">Red Team</option>
          <option value="apikey.create">API Key Create</option>
        </select>
      </div>
      <div className="bg-white rounded-lg shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="text-left px-4 py-2">Time</th><th className="text-left px-4 py-2">Action</th>
            <th className="text-left px-4 py-2">Resource</th><th className="text-left px-4 py-2">User ID</th>
            <th className="text-left px-4 py-2">Detail</th>
          </tr></thead>
          <tbody className="divide-y">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-400 text-xs whitespace-nowrap">{timeAgo(log.created_at)}</td>
                <td className="px-4 py-2"><span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{log.action}</span></td>
                <td className="px-4 py-2 text-xs">{log.resource_type ? `${log.resource_type}#${log.resource_id}` : '—'}</td>
                <td className="px-4 py-2 text-xs text-gray-500">{log.user_id || '—'}</td>
                <td className="px-4 py-2 text-xs text-gray-400 max-w-xs truncate">{log.detail ? JSON.stringify(log.detail) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <div className="p-4 text-sm text-gray-400 text-center">No audit entries found</div>}
      </div>
    </div>
  )
}
