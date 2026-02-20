import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [invitation, setInvitation] = useState(null)
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided.')
      setLoading(false)
      return
    }
    // Try to get invitation details (the accept-invitation endpoint will validate)
    setLoading(false)
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPw) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post('/users/accept-invitation', {
        token, password, full_name: fullName,
      })
      // Auto-login
      localStorage.setItem('token', res.data.access_token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error accepting invitation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Join CanonSafe</h1>
        <p className="text-center text-gray-500 mb-6">Accept your invitation and create your account</p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

        {!token ? (
          <div className="text-center text-gray-500">
            <p>No invitation token found.</p>
            <a href="/login" className="text-blue-600 hover:underline mt-2 inline-block">Go to login</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" placeholder="Full Name" value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" />
            <input type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} required
              className="w-full border rounded px-3 py-2 text-sm" />
            <input type="password" placeholder="Confirm Password" value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)} required
              className="w-full border rounded px-3 py-2 text-sm" />
            <button type="submit" disabled={submitting}
              className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account? <a href="/login" className="text-blue-600 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}
