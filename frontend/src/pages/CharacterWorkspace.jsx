import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

const PACKS = [
  { key: 'canon_pack', label: 'Canon', color: 'bg-blue-500', desc: 'Personality, backstory, speech patterns, relationships' },
  { key: 'legal_pack', label: 'Legal', color: 'bg-purple-500', desc: 'IP restrictions, usage rights, territory limits' },
  { key: 'safety_pack', label: 'Safety', color: 'bg-red-500', desc: 'Content guardrails, prohibited topics, age ratings' },
  { key: 'visual_identity_pack', label: 'Visual', color: 'bg-green-500', desc: 'Appearance, colors, style guide, logo rules' },
  { key: 'audio_identity_pack', label: 'Audio', color: 'bg-orange-500', desc: 'Voice characteristics, music themes, sound design' },
]

function PackViewer({ data, packKey }) {
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-sm text-gray-400 italic">No data in this pack yet.</p>
  }

  if (packKey === 'canon_pack') return <CanonPackView data={data} />
  if (packKey === 'safety_pack') return <SafetyPackView data={data} />
  if (packKey === 'legal_pack') return <LegalPackView data={data} />
  if (packKey === 'visual_identity_pack') return <VisualPackView data={data} />
  if (packKey === 'audio_identity_pack') return <AudioPackView data={data} />
  return <GenericJsonView data={data} />
}

function CanonPackView({ data }) {
  const facts = data.facts || []
  const voice = data.voice || {}
  const relationships = data.relationships || []

  return (
    <div className="space-y-4">
      {facts.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Canon Facts</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {facts.map((f, i) => (
              <div key={i} className="bg-blue-50 rounded p-2">
                <span className="text-xs font-medium text-blue-600 uppercase">{f.fact_id}</span>
                <p className="text-sm text-gray-800">{f.value}</p>
                {f.source && <p className="text-xs text-gray-400 mt-1">Source: {f.source} ({(f.confidence * 100).toFixed(0)}%)</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(voice).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Voice Profile</h4>
          <div className="bg-indigo-50 rounded p-3 space-y-2">
            {voice.personality_traits && (
              <div>
                <span className="text-xs font-medium text-indigo-600">Personality:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(Array.isArray(voice.personality_traits) ? voice.personality_traits : [voice.personality_traits]).map((t, i) => (
                    <span key={i} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {voice.tone && <div><span className="text-xs font-medium text-indigo-600">Tone:</span> <span className="text-sm">{voice.tone}</span></div>}
            {voice.speech_style && <div><span className="text-xs font-medium text-indigo-600">Speech Style:</span> <span className="text-sm">{voice.speech_style}</span></div>}
            {voice.vocabulary_level && <div><span className="text-xs font-medium text-indigo-600">Vocabulary:</span> <span className="text-sm">{voice.vocabulary_level}</span></div>}
            {voice.catchphrases && voice.catchphrases.length > 0 && (
              <div>
                <span className="text-xs font-medium text-indigo-600">Catchphrases:</span>
                <div className="mt-1 space-y-1">
                  {voice.catchphrases.map((c, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium">&ldquo;{typeof c === 'string' ? c : c.phrase}&rdquo;</span>
                      {c.context && <span className="text-xs text-gray-400 ml-2">({c.context})</span>}
                      {c.frequency && <span className="text-xs text-gray-400 ml-2">[{c.frequency}]</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {voice.emotional_range && <div><span className="text-xs font-medium text-indigo-600">Emotional Range:</span> <span className="text-sm">{voice.emotional_range}</span></div>}
          </div>
        </div>
      )}

      {relationships.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Relationships</h4>
          <div className="space-y-1">
            {relationships.map((r, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-50 rounded p-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {(r.character || r.character_name || '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{r.character || r.character_name}</span>
                  <span className="text-xs text-gray-400 ml-2">({r.type || r.relationship_type})</span>
                </div>
                <p className="text-xs text-gray-500 truncate max-w-xs">{r.dynamic || r.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SafetyPackView({ data }) {
  return (
    <div className="space-y-3">
      {data.content_rating && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Content Rating:</span>
          <span className="text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">{data.content_rating}</span>
        </div>
      )}
      {data.prohibited_topics && data.prohibited_topics.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Prohibited Topics</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.prohibited_topics.map((t, i) => (
              <div key={i} className="bg-red-50 rounded p-2 flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  t.severity === 'strict' ? 'bg-red-200 text-red-700' : 'bg-yellow-200 text-yellow-700'
                }`}>{t.severity}</span>
                <span className="text-sm">{t.topic}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.required_disclosures && data.required_disclosures.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Required Disclosures</h4>
          <ul className="space-y-1">
            {data.required_disclosures.map((d, i) => (
              <li key={i} className="text-sm text-gray-600 bg-yellow-50 rounded p-2">{d}</li>
            ))}
          </ul>
        </div>
      )}
      {data.age_gating && (
        <div className="bg-gray-50 rounded p-2">
          <span className="text-xs font-medium text-gray-600">Age Gating:</span>
          <span className="text-sm ml-2">{data.age_gating.enabled ? 'Enabled' : 'Disabled'} — Recommended: {data.age_gating.recommended_age || 'N/A'}</span>
        </div>
      )}
    </div>
  )
}

function LegalPackView({ data }) {
  return (
    <div className="space-y-3">
      {data.rights_holder && (
        <div className="bg-purple-50 rounded p-3">
          <h4 className="text-sm font-semibold text-purple-700 mb-1">Rights Holder</h4>
          <p className="text-sm">{data.rights_holder.name || JSON.stringify(data.rights_holder)}</p>
          {data.rights_holder.territories && <p className="text-xs text-gray-400 mt-1">Territories: {data.rights_holder.territories.join(', ')}</p>}
        </div>
      )}
      {data.performer_consent && (
        <div className="bg-purple-50 rounded p-3">
          <h4 className="text-sm font-semibold text-purple-700 mb-1">Performer Consent</h4>
          <p className="text-sm">{data.performer_consent.type} — {data.performer_consent.performer_name}</p>
          {data.performer_consent.scope && <p className="text-xs text-gray-500 mt-1">{data.performer_consent.scope}</p>}
          {data.performer_consent.restrictions && (
            <div className="mt-2">
              {data.performer_consent.restrictions.map((r, i) => (
                <span key={i} className="inline-block text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded mr-1 mb-1">{r}</span>
              ))}
            </div>
          )}
        </div>
      )}
      {data.usage_restrictions && (
        <div className="bg-gray-50 rounded p-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Usage Restrictions</h4>
          {Object.entries(data.usage_restrictions).map(([key, val]) => (
            <div key={key} className="text-sm flex gap-2">
              <span className="text-gray-500">{key.replace(/_/g, ' ')}:</span>
              <span className={typeof val === 'boolean' ? (val ? 'text-green-600' : 'text-red-600') : ''}>{String(val)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VisualPackView({ data }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {data.art_style && <InfoItem label="Art Style" value={data.art_style} />}
        {data.species && <InfoItem label="Species" value={data.species} />}
        {data.clothing && <InfoItem label="Clothing" value={data.clothing} />}
      </div>
      {data.color_palette && data.color_palette.length > 0 && (
        <div>
          <span className="text-xs font-medium text-gray-600">Color Palette:</span>
          <div className="flex gap-2 mt-1">
            {data.color_palette.map((c, i) => (
              <span key={i} className="text-sm bg-green-50 text-green-700 px-2 py-0.5 rounded">{c}</span>
            ))}
          </div>
        </div>
      )}
      {data.distinguishing_features && data.distinguishing_features.length > 0 && (
        <div>
          <span className="text-xs font-medium text-gray-600">Distinguishing Features:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {data.distinguishing_features.map((f, i) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{f}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AudioPackView({ data }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {data.tone && <InfoItem label="Tone" value={data.tone} />}
        {data.speech_style && <InfoItem label="Speech Style" value={data.speech_style} />}
        {data.emotional_range && <InfoItem label="Emotional Range" value={data.emotional_range} />}
      </div>
      {data.catchphrases && data.catchphrases.length > 0 && (
        <div>
          <span className="text-xs font-medium text-gray-600">Catchphrases:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {data.catchphrases.map((c, i) => (
              <span key={i} className="text-sm bg-orange-50 text-orange-700 px-2 py-1 rounded">&ldquo;{typeof c === 'string' ? c : c.phrase}&rdquo;</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="bg-gray-50 rounded p-2">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  )
}

function GenericJsonView({ data }) {
  return (
    <pre className="text-xs bg-gray-50 rounded p-3 overflow-auto max-h-64 text-gray-700">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

export default function CharacterWorkspace() {
  const { id } = useParams()
  const [character, setCharacter] = useState(null)
  const [versions, setVersions] = useState([])
  const [activeVersion, setActiveVersion] = useState(null)
  const [activePack, setActivePack] = useState('canon_pack')
  const [editing, setEditing] = useState(false)
  const [packText, setPackText] = useState('{}')
  const [parseError, setParseError] = useState(null)
  const [draft, setDraft] = useState({
    canon_pack: {}, legal_pack: {}, safety_pack: {},
    visual_identity_pack: {}, audio_identity_pack: {},
  })

  useEffect(() => {
    api.get(`/characters/${id}`).then((r) => setCharacter(r.data))
    api.get(`/characters/${id}/versions`).then((r) => {
      setVersions(r.data)
      // Load the active or first published version into draft
      if (r.data.length > 0) {
        const published = r.data.find(v => v.status === 'published') || r.data[0]
        loadVersionIntoDraft(published)
        setActiveVersion(published)
      }
    })
  }, [id])

  const loadVersionIntoDraft = (version) => {
    const d = {
      canon_pack: version.canon_pack || {},
      legal_pack: version.legal_pack || {},
      safety_pack: version.safety_pack || {},
      visual_identity_pack: version.visual_identity_pack || {},
      audio_identity_pack: version.audio_identity_pack || {},
    }
    setDraft(d)
    setPackText(JSON.stringify(d[activePack], null, 2))
    setActiveVersion(version)
  }

  useEffect(() => {
    setPackText(JSON.stringify(draft[activePack], null, 2))
    setParseError(null)
  }, [activePack])

  const updatePack = (text) => {
    setPackText(text)
    try {
      const parsed = JSON.parse(text)
      setDraft({ ...draft, [activePack]: parsed })
      setParseError(null)
    } catch (e) {
      setParseError(e.message)
    }
  }

  const createVersion = async () => {
    await api.post(`/characters/${id}/versions`, {
      ...draft, changelog: 'Updated from workspace',
    })
    const r = await api.get(`/characters/${id}/versions`)
    setVersions(r.data)
    setEditing(false)
  }

  const publishVersion = async (versionId) => {
    await api.post(`/characters/${id}/versions/${versionId}/publish`)
    const [charR, verR] = await Promise.all([
      api.get(`/characters/${id}`),
      api.get(`/characters/${id}/versions`),
    ])
    setCharacter(charR.data)
    setVersions(verR.data)
  }

  if (!character) return <div className="text-gray-500 p-8">Loading character...</div>

  return (
    <div>
      <PageHeader
        title={character.name}
        subtitle={`${character.description || 'Character Card Workspace'} — v${activeVersion?.version_number || '?'}`}
        action={
          <div className="flex gap-2">
            {!editing ? (
              <button onClick={() => setEditing(true)} className="bg-yellow-500 text-white px-4 py-2 rounded text-sm">
                Edit Packs
              </button>
            ) : (
              <>
                <button onClick={createVersion} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
                  Save New Version
                </button>
                <button onClick={() => { setEditing(false); if (activeVersion) loadVersionIntoDraft(activeVersion) }}
                  className="border px-4 py-2 rounded text-sm">Cancel</button>
              </>
            )}
          </div>
        }
      />

      {/* Pack tabs */}
      <div className="flex gap-1 mb-4">
        {PACKS.map((p) => (
          <button
            key={p.key}
            onClick={() => setActivePack(p.key)}
            className={`px-4 py-2 text-sm rounded-t flex items-center gap-2 transition-colors ${
              activePack === p.key
                ? 'bg-white shadow font-medium text-gray-900'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${p.color}`} />
            {p.label}
          </button>
        ))}
      </div>

      {/* Pack content */}
      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-800">{PACKS.find(p => p.key === activePack)?.label} Pack</h3>
            <p className="text-xs text-gray-400">{PACKS.find(p => p.key === activePack)?.desc}</p>
          </div>
          {!editing && activeVersion && (
            <span className="text-xs text-gray-400">v{activeVersion.version_number} — {activeVersion.status}</span>
          )}
        </div>

        {editing ? (
          <div>
            <textarea
              value={packText}
              onChange={(e) => updatePack(e.target.value)}
              className={`w-full border rounded px-3 py-2 font-mono text-sm h-80 ${parseError ? 'border-red-300' : 'border-gray-300'}`}
              spellCheck={false}
            />
            {parseError && <p className="text-xs text-red-500 mt-1">JSON Error: {parseError}</p>}
          </div>
        ) : (
          <PackViewer data={draft[activePack]} packKey={activePack} />
        )}
      </div>

      {/* Version history */}
      <h3 className="font-semibold mb-3">Version History</h3>
      <div className="space-y-2">
        {versions.map((v) => (
          <div key={v.id} className={`bg-white rounded shadow p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${
            activeVersion?.id === v.id ? 'ring-2 ring-blue-300' : ''
          }`}
            onClick={() => { loadVersionIntoDraft(v); setEditing(false) }}>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">v{v.version_number}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                v.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>{v.status}</span>
              {v.id === character.active_version_id && (
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">Active</span>
              )}
              {v.changelog && <span className="text-xs text-gray-400 ml-2">{v.changelog}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{new Date(v.created_at).toLocaleDateString()}</span>
              {v.status !== 'published' && (
                <button onClick={(e) => { e.stopPropagation(); publishVersion(v.id) }}
                  className="text-sm text-blue-600 hover:underline">Publish</button>
              )}
            </div>
          </div>
        ))}
        {versions.length === 0 && <p className="text-sm text-gray-500">No versions yet.</p>}
      </div>
    </div>
  )
}
