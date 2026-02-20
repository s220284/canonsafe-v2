import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function OnboardingBanner() {
  const [data, setData] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    api.get('/org/onboarding').then(r => setData(r.data)).catch(() => {})
  }, [])

  if (!data || data.completed || dismissed) return null

  const handleDismiss = async () => {
    setDismissed(true)
    try { await api.post('/org/onboarding/dismiss') } catch {}
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-blue-900">Getting Started</h3>
          <p className="text-sm text-blue-700">Complete these steps to set up your workspace</p>
        </div>
        <button onClick={handleDismiss} className="text-sm text-blue-500 hover:text-blue-700">Dismiss</button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-blue-100 rounded-full h-2 mb-3">
        <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${(data.progress || 0) * 100}%` }} />
      </div>
      <p className="text-xs text-blue-600 mb-3">{data.done_count} of {data.total} completed</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {data.steps.map(step => (
          <Link
            key={step.id}
            to={step.link}
            className={`flex items-center gap-2 p-2 rounded text-sm ${
              step.done ? 'bg-green-50 text-green-700' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs ${
              step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step.done ? '\u2713' : '\u00B7'}
            </span>
            <span className="truncate">{step.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
