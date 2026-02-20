import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api'

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
)

const EyeSlashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
)

function PasswordField({ placeholder, value, onChange, showPassword, onToggle }) {
  return (
    <div className="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        className="w-full border rounded px-3 py-2 text-sm pr-10"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
      >
        {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
      </button>
    </div>
  )
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  // If token present: reset mode. Otherwise: request mode.
  if (token) return <ResetMode token={token} />
  return <RequestMode />
}

function RequestMode() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [tokenResult, setTokenResult] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg(''); setTokenResult('')
    setSubmitting(true)
    try {
      const res = await api.post('/auth/password-reset-request', { email })
      setMsg(res.data.message)
      if (res.data.token) {
        setTokenResult(res.data.token)
      }
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Error requesting reset')
    } finally {
      setSubmitting(false)
    }
  }

  const resetUrl = tokenResult ? `${window.location.origin}/reset-password?token=${tokenResult}` : ''

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Reset Password</h1>
        <p className="text-center text-gray-500 mb-6">Enter your email to receive a reset link</p>

        {msg && <div className="bg-blue-50 text-blue-700 p-3 rounded mb-4 text-sm">{msg}</div>}

        {tokenResult && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
            <p className="text-sm text-yellow-800 mb-1 font-medium">Reset link (share with user):</p>
            <code className="text-xs break-all">{resetUrl}</code>
            <button onClick={() => navigator.clipboard.writeText(resetUrl)} className="block mt-1 text-xs text-blue-600 hover:underline">Copy link</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email address" value={email}
            onChange={e => setEmail(e.target.value)} required
            className="w-full border rounded px-3 py-2 text-sm" />
          <button type="submit" disabled={submitting}
            className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {submitting ? 'Requesting...' : 'Request Reset'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          <a href="/login" className="text-blue-600 hover:underline">Back to login</a>
        </p>
      </div>
    </div>
  )
}

function ResetMode({ token }) {
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setMsg('')
    if (password !== confirmPw) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }

    setSubmitting(true)
    try {
      const res = await api.post('/auth/password-reset', { token, new_password: password })
      setMsg(res.data.message)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error resetting password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Set New Password</h1>
        <p className="text-center text-gray-500 mb-6">Choose a new password for your account</p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
        {msg && (
          <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">
            {msg} <a href="/login" className="font-medium underline">Sign in</a>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            placeholder="New password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            showPassword={showPassword}
            onToggle={() => setShowPassword(!showPassword)}
          />
          <PasswordField
            placeholder="Confirm new password"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            showPassword={showConfirm}
            onToggle={() => setShowConfirm(!showConfirm)}
          />
          <button type="submit" disabled={submitting}
            className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {submitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          <a href="/login" className="text-blue-600 hover:underline">Back to login</a>
        </p>
      </div>
    </div>
  )
}
