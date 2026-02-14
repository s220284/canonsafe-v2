import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

const CONSENT_TYPE_STYLES = {
  voice: 'bg-purple-100 text-purple-700',
  likeness: 'bg-blue-100 text-blue-700',
  full: 'bg-emerald-100 text-emerald-700',
}

const MODALITY_STYLES = {
  text: 'bg-gray-100 text-gray-600',
  image: 'bg-indigo-100 text-indigo-700',
  audio: 'bg-pink-100 text-pink-700',
  video: 'bg-orange-100 text-orange-700',
}

const ALL_MODALITIES = ['text', 'image', 'audio', 'video']

function getExpiryStatus(validUntil) {
  if (!validUntil) return 'active'
  const now = new Date()
  const expiry = new Date(validUntil)
  if (expiry < now) return 'expired'
  const daysLeft = (expiry - now) / (1000 * 60 * 60 * 24)
  if (daysLeft <= 30) return 'expiring'
  return 'active'
}

const EXPIRY_STYLES = {
  active: { badge: 'bg-green-100 text-green-700', dot: 'bg-green-500', label: 'ACTIVE' },
  expiring: { badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500', label: 'EXPIRING SOON' },
  expired: { badge: 'bg-red-100 text-red-700', dot: 'bg-red-500', label: 'EXPIRED' },
}

export default function Consent() {
  const [consents, setConsents] = useState([])
  const [characters, setCharacters] = useState([])
  const [charMap, setCharMap] = useState({})

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    character_id: '',
    performer_name: '',
    consent_type: 'voice',
    territories: '',
    modalities: [],
    valid_from: '',
    valid_until: '',
    strike_clause: false,
    usage_restrictions: '',
    document_ref: '',
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Strike confirmation
  const [strikeConfirm, setStrikeConfirm] = useState(null)
  const [striking, setStriking] = useState(false)

  // Consent check widget
  const [checkForm, setCheckForm] = useState({ character_id: '', modality: '', territory: '' })
  const [checkResult, setCheckResult] = useState(null)
  const [checking, setChecking] = useState(false)

  // Filter
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const load = () => api.get('/consent').then((r) => setConsents(r.data))

  useEffect(() => {
    load()
    api.get('/characters').then((r) => {
      setCharacters(r.data)
      const map = {}
      r.data.forEach(c => { map[c.id] = c.name })
      setCharMap(map)
    })
  }, [])

  const createConsent = async (e) => {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    try {
      const territories = form.territories.split(',').map(t => t.trim()).filter(Boolean)
      await api.post('/consent', {
        character_id: parseInt(form.character_id),
        performer_name: form.performer_name,
        consent_type: form.consent_type,
        territories,
        modalities: form.modalities,
        usage_restrictions: form.usage_restrictions.split(',').map(r => r.trim()).filter(Boolean),
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        strike_clause: form.strike_clause,
        document_ref: form.document_ref || null,
      })
      setShowCreate(false)
      setForm({
        character_id: '',
        performer_name: '',
        consent_type: 'voice',
        territories: '',
        modalities: [],
        valid_from: '',
        valid_until: '',
        strike_clause: false,
        usage_restrictions: '',
        document_ref: '',
      })
      load()
    } catch (err) {
      setCreateError(err.response?.data?.detail || err.message)
    }
    setCreating(false)
  }

  const activateStrike = async (consentId) => {
    setStriking(true)
    try {
      await api.post(`/consent/${consentId}/strike`)
      setStrikeConfirm(null)
      load()
    } catch (err) {
      console.error('Strike activation failed', err)
    }
    setStriking(false)
  }

  const checkConsent = async (e) => {
    e.preventDefault()
    setChecking(true)
    setCheckResult(null)
    try {
      const res = await api.post('/consent/check', {
        character_id: parseInt(checkForm.character_id),
        modality: checkForm.modality,
        territory: checkForm.territory,
        usage_type: checkForm.usage_type || null,
      })
      setCheckResult(res.data)
    } catch (err) {
      setCheckResult({ error: err.response?.data?.detail || err.message })
    }
    setChecking(false)
  }

  const toggleModality = (mod) => {
    setForm(f => ({
      ...f,
      modalities: f.modalities.includes(mod)
        ? f.modalities.filter(m => m !== mod)
        : [...f.modalities, mod],
    }))
  }

  // Filters
  const filtered = consents.filter(c => {
    if (filterType && c.consent_type !== filterType) return false
    if (filterStatus) {
      const status = getExpiryStatus(c.valid_until)
      if (status !== filterStatus) return false
    }
    return true
  })

  const activeCount = consents.filter(c => getExpiryStatus(c.valid_until) === 'active').length
  const expiringCount = consents.filter(c => getExpiryStatus(c.valid_until) === 'expiring').length
  const expiredCount = consents.filter(c => getExpiryStatus(c.valid_until) === 'expired').length
  const strikeCount = consents.filter(c => c.strike_activated).length

  return (
    <div>
      <PageHeader
        title="Consent Management"
        subtitle={`${consents.length} consent records — ${activeCount} active, ${expiringCount} expiring, ${expiredCount} expired`}
        action={
          <button onClick={() => setShowCreate(!showCreate)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
            {showCreate ? 'Close' : 'New Consent'}
          </button>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-2xl font-bold">{consents.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-xs text-gray-400">Active</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-xs text-gray-400">Expiring Soon</p>
          <p className="text-2xl font-bold text-yellow-600">{expiringCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-xs text-gray-400">Strikes Activated</p>
          <p className="text-2xl font-bold text-red-600">{strikeCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="border rounded px-3 py-2 text-sm bg-white">
          <option value="">All Types</option>
          <option value="voice">Voice</option>
          <option value="likeness">Likeness</option>
          <option value="full">Full</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded px-3 py-2 text-sm bg-white">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="expiring">Expiring Soon</option>
          <option value="expired">Expired</option>
        </select>
        {(filterType || filterStatus) && (
          <button onClick={() => { setFilterType(''); setFilterStatus('') }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2">
            Clear filters
          </button>
        )}
      </div>

      {/* Create consent form */}
      {showCreate && (
        <form onSubmit={createConsent} className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
          <h3 className="font-medium text-sm text-gray-500">Create Consent Record</h3>
          <p className="text-xs text-gray-400">Register a new performer consent agreement for a character. All fields marked with * are required.</p>
          {createError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded">{createError}</div>}
          <div className="grid grid-cols-2 gap-3">
            <select value={form.character_id} onChange={(e) => setForm({ ...form, character_id: e.target.value })}
              className="border rounded px-3 py-2 text-sm" required>
              <option value="">Character... *</option>
              {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input placeholder="Performer Name *" value={form.performer_name}
              onChange={(e) => setForm({ ...form, performer_name: e.target.value })}
              className="border rounded px-3 py-2 text-sm" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.consent_type} onChange={(e) => setForm({ ...form, consent_type: e.target.value })}
              className="border rounded px-3 py-2 text-sm" required>
              <option value="voice">Voice</option>
              <option value="likeness">Likeness</option>
              <option value="full">Full</option>
            </select>
            <input placeholder="Territories (comma-separated, e.g. US, EU, APAC)" value={form.territories}
              onChange={(e) => setForm({ ...form, territories: e.target.value })}
              className="border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Modalities *</label>
            <div className="flex gap-3">
              {ALL_MODALITIES.map(mod => (
                <label key={mod} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={form.modalities.includes(mod)}
                    onChange={() => toggleModality(mod)}
                    className="rounded border-gray-300" />
                  <span className="capitalize">{mod}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Valid From</label>
              <input type="date" value={form.valid_from}
                onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                className="border rounded px-3 py-2 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Valid Until</label>
              <input type="date" value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                className="border rounded px-3 py-2 text-sm w-full" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-0.5 block">Usage Restrictions (comma-separated)</label>
            <textarea placeholder="e.g. no-parody, no-adult-content, editorial-only" value={form.usage_restrictions}
              onChange={(e) => setForm({ ...form, usage_restrictions: e.target.value })}
              className="border rounded px-3 py-2 text-sm w-full h-16 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Document Reference (e.g. contract ID or URL)" value={form.document_ref}
              onChange={(e) => setForm({ ...form, document_ref: e.target.value })}
              className="border rounded px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm px-3 py-2 border rounded cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={form.strike_clause}
                onChange={(e) => setForm({ ...form, strike_clause: e.target.checked })}
                className="rounded border-gray-300" />
              <span>Include Strike Clause</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={creating} className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50">
              {creating ? 'Creating...' : 'Create Consent'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="border px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Consent Check Widget */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="font-medium text-sm text-gray-500 mb-2">Consent Check</h3>
        <p className="text-xs text-gray-400 mb-3">Verify whether consent exists for a specific character, modality, and territory combination.</p>
        <form onSubmit={checkConsent} className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="text-xs text-gray-500 mb-0.5 block">Character</label>
            <select value={checkForm.character_id} onChange={(e) => setCheckForm({ ...checkForm, character_id: e.target.value })}
              className="border rounded px-3 py-2 text-sm" required>
              <option value="">Select...</option>
              {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-0.5 block">Modality</label>
            <select value={checkForm.modality} onChange={(e) => setCheckForm({ ...checkForm, modality: e.target.value })}
              className="border rounded px-3 py-2 text-sm" required>
              <option value="">Select...</option>
              {ALL_MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-0.5 block">Territory</label>
            <input placeholder="e.g. US" value={checkForm.territory}
              onChange={(e) => setCheckForm({ ...checkForm, territory: e.target.value })}
              className="border rounded px-3 py-2 text-sm w-28" required />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-0.5 block">Usage Type</label>
            <input placeholder="optional" value={checkForm.usage_type || ''}
              onChange={(e) => setCheckForm({ ...checkForm, usage_type: e.target.value })}
              className="border rounded px-3 py-2 text-sm w-28" />
          </div>
          <button type="submit" disabled={checking} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50">
            {checking ? 'Checking...' : 'Check'}
          </button>
        </form>
        {checkResult && (
          <div className={`mt-3 px-3 py-2 rounded text-sm ${
            checkResult.error
              ? 'bg-red-50 text-red-700'
              : checkResult.allowed || checkResult.consented
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
          }`}>
            {checkResult.error
              ? checkResult.error
              : checkResult.allowed || checkResult.consented
                ? 'Consent GRANTED — usage is permitted for this combination.'
                : `Consent DENIED — ${checkResult.reason || 'no matching consent record found.'}`
            }
            {checkResult.consent_id && (
              <span className="ml-2 text-xs opacity-75">(Consent ID: {checkResult.consent_id})</span>
            )}
          </div>
        )}
      </div>

      {/* Consent list */}
      <div className="space-y-3">
        {filtered.map((c) => {
          const expiryStatus = getExpiryStatus(c.valid_until)
          const es = EXPIRY_STYLES[expiryStatus]
          const charName = charMap[c.character_id] || `Character #${c.character_id}`
          const ctStyle = CONSENT_TYPE_STYLES[c.consent_type] || 'bg-gray-100 text-gray-600'

          return (
            <div key={c.id}
              className={`bg-white rounded-lg shadow hover:shadow-md transition-all ${
                expiryStatus === 'expired' ? 'border-l-4 border-red-400' :
                expiryStatus === 'expiring' ? 'border-l-4 border-yellow-400' : ''
              }`}>

              {/* Card header */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Avatar with status dot */}
                    <div className="relative">
                      <div className="w-11 h-11 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">
                        {charName[0]}
                      </div>
                      <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${es.dot}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{charName}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${ctStyle}`}>
                          {c.consent_type?.toUpperCase()}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${es.badge}`}>
                          {c.strike_activated ? 'STRIKE ACTIVATED' : es.label}
                        </span>
                        {c.strike_activated && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-600 text-white font-medium">
                            STRUCK
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                        <span>Performer: <span className="text-gray-600">{c.performer_name}</span></span>
                        {c.document_ref && <span>Ref: {c.document_ref}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.strike_clause && !c.strike_activated && expiryStatus !== 'expired' && (
                      strikeConfirm === c.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-red-600 mr-1">Confirm?</span>
                          <button onClick={() => activateStrike(c.id)} disabled={striking}
                            className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:opacity-50">
                            {striking ? '...' : 'Yes'}
                          </button>
                          <button onClick={() => setStrikeConfirm(null)}
                            className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">
                            No
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setStrikeConfirm(c.id)}
                          className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200">
                          Activate Strike
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Details row */}
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                  <div>
                    <span className="text-gray-400">Territories: </span>
                    {(c.territories || []).length > 0
                      ? c.territories.map((t, i) => (
                          <span key={i} className="inline-block bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mr-1">{t}</span>
                        ))
                      : <span className="text-gray-300">None</span>
                    }
                  </div>
                  <div>
                    <span className="text-gray-400">Modalities: </span>
                    {(c.modalities || []).map((m, i) => (
                      <span key={i} className={`inline-block px-1.5 py-0.5 rounded mr-1 ${MODALITY_STYLES[m] || 'bg-gray-100 text-gray-600'}`}>{m}</span>
                    ))}
                  </div>
                  <div>
                    <span className="text-gray-400">Valid: </span>
                    <span>{c.valid_from ? new Date(c.valid_from).toLocaleDateString() : 'N/A'}</span>
                    <span className="mx-1">-</span>
                    <span className={expiryStatus === 'expired' ? 'text-red-600 font-medium' : expiryStatus === 'expiring' ? 'text-yellow-600 font-medium' : ''}>
                      {c.valid_until ? new Date(c.valid_until).toLocaleDateString() : 'No expiry'}
                    </span>
                  </div>
                </div>

                {/* Usage restrictions */}
                {(c.usage_restrictions || []).length > 0 && (
                  <div className="mt-2 text-xs">
                    <span className="text-gray-400">Restrictions: </span>
                    {c.usage_restrictions.map((r, i) => (
                      <span key={i} className="inline-block bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded mr-1">{r}</span>
                    ))}
                  </div>
                )}

                {/* Expiry warning banner */}
                {expiryStatus === 'expiring' && !c.strike_activated && (
                  <div className="mt-2 bg-yellow-50 text-yellow-700 text-xs px-3 py-1.5 rounded flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    This consent expires within 30 days. Consider renewing.
                  </div>
                )}
                {expiryStatus === 'expired' && !c.strike_activated && (
                  <div className="mt-2 bg-red-50 text-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    This consent has expired. Usage under this consent is no longer permitted.
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
            {consents.length === 0 ? 'No consent records yet. Create a consent to get started.' : 'No consent records match current filters.'}
          </div>
        )}
      </div>
    </div>
  )
}
