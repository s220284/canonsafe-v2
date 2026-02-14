import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

const TABS = [
  { key: 'image', label: 'Image' },
  { key: 'audio', label: 'Audio' },
  { key: 'video', label: 'Video' },
]

const DECISION_STYLES = {
  pass: 'bg-green-100 text-green-700',
  fail: 'bg-red-100 text-red-700',
  review: 'bg-yellow-100 text-yellow-700',
}

export default function MultiModal() {
  const [activeTab, setActiveTab] = useState('image')
  const [characters, setCharacters] = useState([])
  const [capabilities, setCapabilities] = useState(null)

  // Image form
  const [imageForm, setImageForm] = useState({ image_url: '', character_id: '', useUpload: false })
  const [imagePreview, setImagePreview] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)

  // Audio form
  const [audioForm, setAudioForm] = useState({ audio_description: '', character_id: '' })

  // Video form
  const [videoForm, setVideoForm] = useState({ video_description: '', character_id: '' })

  // Shared state
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/characters').then((r) => setCharacters(r.data)).catch(() => {})
    api.get('/multimodal/capabilities').then((r) => setCapabilities(r.data)).catch(() => {})
  }, [])

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setImagePreview(event.target.result)
      // Strip the data URL prefix to get raw base64
      const base64 = event.target.result.split(',')[1]
      setImageBase64(base64)
    }
    reader.readAsDataURL(file)
  }

  const analyzeImage = async (e) => {
    e.preventDefault()
    setAnalyzing(true)
    setResult(null)
    setError('')
    try {
      const payload = {
        character_id: parseInt(imageForm.character_id),
      }
      if (imageForm.useUpload && imageBase64) {
        payload.image_base64 = imageBase64
      } else {
        payload.image_url = imageForm.image_url
      }
      const res = await api.post('/multimodal/analyze-image', payload)
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    }
    setAnalyzing(false)
  }

  const analyzeAudio = async (e) => {
    e.preventDefault()
    setAnalyzing(true)
    setResult(null)
    setError('')
    try {
      const res = await api.post('/multimodal/analyze-audio', {
        audio_description: audioForm.audio_description,
        character_id: parseInt(audioForm.character_id),
      })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    }
    setAnalyzing(false)
  }

  const analyzeVideo = async (e) => {
    e.preventDefault()
    setAnalyzing(true)
    setResult(null)
    setError('')
    try {
      const res = await api.post('/multimodal/analyze-video', {
        video_description: videoForm.video_description,
        character_id: parseInt(videoForm.character_id),
      })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    }
    setAnalyzing(false)
  }

  const switchTab = (tab) => {
    setActiveTab(tab)
    setResult(null)
    setError('')
  }

  return (
    <div>
      <PageHeader
        title="Multi-Modal Evaluation"
        subtitle="Evaluate image, audio, and video content for character IP fidelity across all identity packs."
      />

      {/* Capabilities info */}
      {capabilities && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="font-medium text-sm text-gray-500 mb-2">Supported Modalities</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {capabilities.supported_modalities.map((mod) => (
              <div key={mod.modality} className="border rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium capitalize">{mod.modality}</span>
                  <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                    {mod.input_types.join(', ')}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{mod.description}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {mod.packs_used.map((pack) => (
                    <span key={pack} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{pack}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-blue-700 shadow'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input panel */}
        <div className="bg-white rounded-lg shadow p-4">
          {activeTab === 'image' && (
            <form onSubmit={analyzeImage} className="space-y-3">
              <h3 className="font-medium text-sm text-gray-500">Image Analysis</h3>
              <p className="text-xs text-gray-400">
                Provide an image URL or upload a file. The image will be evaluated against the character's
                visual identity pack, canon pack, and safety pack.
              </p>

              <select value={imageForm.character_id} onChange={(e) => setImageForm({ ...imageForm, character_id: e.target.value })}
                className="border rounded px-3 py-2 text-sm w-full" required>
                <option value="">Select Character *</option>
                {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="radio" name="imageInput" checked={!imageForm.useUpload}
                    onChange={() => setImageForm({ ...imageForm, useUpload: false })} />
                  <span>URL</span>
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="radio" name="imageInput" checked={imageForm.useUpload}
                    onChange={() => setImageForm({ ...imageForm, useUpload: true })} />
                  <span>Upload</span>
                </label>
              </div>

              {!imageForm.useUpload ? (
                <input placeholder="https://example.com/character-image.png" value={imageForm.image_url}
                  onChange={(e) => setImageForm({ ...imageForm, image_url: e.target.value })}
                  className="border rounded px-3 py-2 text-sm w-full" />
              ) : (
                <div>
                  <input type="file" accept="image/*" onChange={handleImageUpload}
                    className="border rounded px-3 py-2 text-sm w-full" />
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="mt-2 max-h-40 rounded border" />
                  )}
                </div>
              )}

              <button type="submit" disabled={analyzing || !imageForm.character_id}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm w-full disabled:opacity-50">
                {analyzing ? 'Analyzing...' : 'Analyze Image'}
              </button>
            </form>
          )}

          {activeTab === 'audio' && (
            <form onSubmit={analyzeAudio} className="space-y-3">
              <h3 className="font-medium text-sm text-gray-500">Audio Analysis</h3>
              <p className="text-xs text-gray-400">
                Describe the audio content in detail. The description will be evaluated against the character's
                audio identity pack, canon pack, and safety pack.
              </p>

              <select value={audioForm.character_id} onChange={(e) => setAudioForm({ ...audioForm, character_id: e.target.value })}
                className="border rounded px-3 py-2 text-sm w-full" required>
                <option value="">Select Character *</option>
                {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <textarea
                placeholder="Describe the audio content in detail. Include: voice characteristics (pitch, tone, accent), speech patterns, background sounds, music, volume levels, emotional delivery, etc."
                value={audioForm.audio_description}
                onChange={(e) => setAudioForm({ ...audioForm, audio_description: e.target.value })}
                className="border rounded px-3 py-2 text-sm w-full h-32 resize-none"
                required
              />

              <button type="submit" disabled={analyzing || !audioForm.character_id || !audioForm.audio_description.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm w-full disabled:opacity-50">
                {analyzing ? 'Analyzing...' : 'Analyze Audio'}
              </button>
            </form>
          )}

          {activeTab === 'video' && (
            <form onSubmit={analyzeVideo} className="space-y-3">
              <h3 className="font-medium text-sm text-gray-500">Video Analysis</h3>
              <p className="text-xs text-gray-400">
                Describe the video content in detail. The description will be evaluated against all four packs:
                visual identity, audio identity, canon, and safety.
              </p>

              <select value={videoForm.character_id} onChange={(e) => setVideoForm({ ...videoForm, character_id: e.target.value })}
                className="border rounded px-3 py-2 text-sm w-full" required>
                <option value="">Select Character *</option>
                {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <textarea
                placeholder="Describe the video content in detail. Include: visual elements (character appearance, colors, setting, lighting), audio elements (voice, music, effects), actions, dialogue, pacing, transitions, etc."
                value={videoForm.video_description}
                onChange={(e) => setVideoForm({ ...videoForm, video_description: e.target.value })}
                className="border rounded px-3 py-2 text-sm w-full h-32 resize-none"
                required
              />

              <button type="submit" disabled={analyzing || !videoForm.character_id || !videoForm.video_description.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm w-full disabled:opacity-50">
                {analyzing ? 'Analyzing...' : 'Analyze Video'}
              </button>
            </form>
          )}
        </div>

        {/* Results panel */}
        <div className="space-y-3">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          {result && (
            <>
              {/* Score card */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Analysis Result</h3>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    DECISION_STYLES[result.decision] || 'bg-gray-100 text-gray-600'
                  }`}>
                    {result.decision?.toUpperCase()}
                  </span>
                </div>

                {/* Score display */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${
                      result.score >= 0.8 ? 'text-green-600' :
                      result.score >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {(result.score * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-400">Fidelity Score</div>
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${
                          result.score >= 0.8 ? 'bg-green-500' :
                          result.score >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${result.score * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-2">
                  <span className="text-gray-400">Modality:</span>{' '}
                  <span className="capitalize font-medium">{result.modality}</span>
                  {result.character_name && (
                    <>
                      {' '}<span className="text-gray-400 ml-2">Character:</span>{' '}
                      <span className="font-medium">{result.character_name}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Feedback */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-sm mb-2">Detailed Feedback</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.feedback}</p>
              </div>

              {/* Pack compliance breakdown */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-sm mb-2">Pack Compliance</h3>
                <div className="text-xs text-gray-400 mb-2">
                  Packs checked: {(result.packs_checked || []).join(', ')}
                </div>
                {result.pack_compliance && Object.keys(result.pack_compliance).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(result.pack_compliance).map(([pack, data]) => (
                      <div key={pack} className="border rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{pack}</span>
                          {data.score != null && (
                            <span className={`text-xs font-bold ${
                              data.score >= 0.8 ? 'text-green-600' :
                              data.score >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {(data.score * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        {data.notes && <p className="text-xs text-gray-500">{data.notes}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No detailed pack breakdown available.</p>
                )}
              </div>

              {/* Flags */}
              {result.flags && result.flags.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold text-sm mb-2">Flags</h3>
                  <div className="flex flex-wrap gap-1">
                    {result.flags.map((flag, i) => (
                      <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">{flag}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!result && !error && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400 text-sm">
              Submit content for analysis to see results here.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
