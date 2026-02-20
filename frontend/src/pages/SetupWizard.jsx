import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to CanonSafe',
    description: 'The Character IP Governance Platform helps you manage, evaluate, and certify AI-generated character content across all modalities.',
  },
  {
    id: 'license',
    title: 'License',
    description: 'If you have a license key, enter it below. Otherwise, you can continue on the free trial plan.',
    checkId: null, // no onboarding step for this
  },
  {
    id: 'org_profile',
    title: 'Set Up Your Organization',
    description: 'Configure your organization profile to get started.',
    checkId: 'org_profile',
  },
  {
    id: 'franchise',
    title: 'Create Your First Franchise',
    description: 'Franchises group related characters together (e.g., "Star Wars", "Peppa Pig").',
    checkId: 'franchise',
  },
  {
    id: 'character',
    title: 'Add a Character',
    description: 'Characters are the core of CanonSafe. Add your first character with its identity card.',
    checkId: 'character',
  },
  {
    id: 'evaluation',
    title: 'Run Your First Evaluation',
    description: 'Test the evaluation engine by running a quick evaluation on your character.',
    checkId: 'evaluation',
  },
  {
    id: 'invite',
    title: 'Invite Your Team',
    description: 'Invite team members to collaborate on character governance.',
    checkId: 'invite',
  },
  {
    id: 'done',
    title: 'All Set!',
    description: 'You\'re ready to start using CanonSafe. You can always come back to these settings later.',
  },
]

export default function SetupWizard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [onboarding, setOnboarding] = useState(null)
  const [loading, setLoading] = useState(true)

  // License activation state
  const [licenseKey, setLicenseKey] = useState('')
  const [licenseMsg, setLicenseMsg] = useState('')

  // Org profile state
  const [orgForm, setOrgForm] = useState({ display_name: '', industry: '' })
  const [orgMsg, setOrgMsg] = useState('')

  // Franchise state
  const [franchiseName, setFranchiseName] = useState('')
  const [franchiseMsg, setFranchiseMsg] = useState('')

  // Invite state
  const [invEmail, setInvEmail] = useState('')
  const [invRole, setInvRole] = useState('editor')
  const [invMsg, setInvMsg] = useState('')

  useEffect(() => {
    api.get('/org/onboarding').then(r => {
      setOnboarding(r.data)
      if (r.data.completed) {
        navigate('/')
      }
    }).catch(() => {}).finally(() => setLoading(false))

    api.get('/org').then(r => {
      setOrgForm({ display_name: r.data.display_name || '', industry: r.data.industry || '' })
    }).catch(() => {})
  }, [navigate])

  const refreshOnboarding = () => {
    api.get('/org/onboarding').then(r => setOnboarding(r.data)).catch(() => {})
  }

  const step = STEPS[currentStep]
  const isStepDone = (checkId) => {
    if (!onboarding?.steps) return false
    const s = onboarding.steps.find(st => st.id === checkId)
    return s?.done || false
  }

  const handleActivateLicense = async (e) => {
    e.preventDefault()
    setLicenseMsg('')
    try {
      const r = await api.post('/license/activate', { key: licenseKey })
      setLicenseMsg(`License activated! Plan: ${r.data.plan}`)
      setLicenseKey('')
    } catch (err) {
      setLicenseMsg(err.response?.data?.detail || 'Error activating license')
    }
  }

  const handleSaveOrg = async (e) => {
    e.preventDefault()
    setOrgMsg('')
    try {
      await api.patch('/org', orgForm)
      setOrgMsg('Organization updated!')
      refreshOnboarding()
    } catch {
      setOrgMsg('Error saving')
    }
  }

  const handleCreateFranchise = async (e) => {
    e.preventDefault()
    setFranchiseMsg('')
    try {
      await api.post('/franchises', { name: franchiseName, description: '' })
      setFranchiseMsg('Franchise created!')
      setFranchiseName('')
      refreshOnboarding()
    } catch (err) {
      setFranchiseMsg(err.response?.data?.detail || 'Error creating franchise')
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInvMsg('')
    try {
      const r = await api.post('/users/invite', { email: invEmail, role: invRole })
      setInvMsg(`Invitation sent! Token: ${r.data.token}`)
      setInvEmail('')
      refreshOnboarding()
    } catch (err) {
      setInvMsg(err.response?.data?.detail || 'Error inviting')
    }
  }

  const handleFinish = async () => {
    try {
      await api.post('/org/onboarding/dismiss')
    } catch {}
    navigate('/')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">Step {currentStep + 1} of {STEPS.length}</span>
          <span className="text-sm text-gray-400">{onboarding ? `${onboarding.done_count || 0}/${onboarding.total || 6} tasks complete` : ''}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 rounded-full h-2 transition-all" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-bold mb-2">{step.title}</h2>
        <p className="text-gray-500 text-sm mb-6">{step.description}</p>

        {/* Step Content */}
        {step.id === 'welcome' && (
          <div className="space-y-3 text-sm text-gray-600">
            <p>CanonSafe provides:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>5-Pack Character Cards (canon, legal, safety, visual, audio)</li>
              <li>Multi-modal evaluation engine with configurable critics</li>
              <li>Agent certification with automated test suites</li>
              <li>Drift detection, red-teaming, and A/B testing</li>
              <li>Team management with role-based access control</li>
            </ul>
          </div>
        )}

        {step.id === 'license' && (
          <div>
            {licenseMsg && <div className={`text-sm p-2 rounded mb-3 ${licenseMsg.includes('activated') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{licenseMsg}</div>}
            <form onSubmit={handleActivateLicense} className="space-y-3">
              <input type="text" placeholder="CSF-PRO-XXXXXXXX-XXXXXXXX-XXXXXXXX" value={licenseKey} onChange={e => setLicenseKey(e.target.value)} className="w-full border rounded px-3 py-2 text-sm font-mono" />
              <button type="submit" disabled={!licenseKey} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">Activate License</button>
            </form>
            <p className="text-xs text-gray-400 mt-3">No license key? You can skip this step and use the trial plan.</p>
          </div>
        )}

        {step.id === 'org_profile' && (
          <div>
            {isStepDone('org_profile') && <div className="text-sm bg-green-50 text-green-700 p-2 rounded mb-3">Organization profile is set up!</div>}
            {orgMsg && <div className="text-sm bg-green-50 text-green-700 p-2 rounded mb-3">{orgMsg}</div>}
            <form onSubmit={handleSaveOrg} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Display Name</label>
                <input value={orgForm.display_name} onChange={e => setOrgForm(f => ({...f, display_name: e.target.value}))} className="w-full border rounded px-3 py-2 text-sm" placeholder="Your Company Name" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Industry</label>
                <input value={orgForm.industry} onChange={e => setOrgForm(f => ({...f, industry: e.target.value}))} className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. Entertainment, Education, Gaming" />
              </div>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Save</button>
            </form>
          </div>
        )}

        {step.id === 'franchise' && (
          <div>
            {isStepDone('franchise') && <div className="text-sm bg-green-50 text-green-700 p-2 rounded mb-3">You already have a franchise!</div>}
            {franchiseMsg && <div className={`text-sm p-2 rounded mb-3 ${franchiseMsg.includes('created') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{franchiseMsg}</div>}
            <form onSubmit={handleCreateFranchise} className="space-y-3">
              <input type="text" placeholder="Franchise name (e.g., Star Wars)" value={franchiseName} onChange={e => setFranchiseName(e.target.value)} required className="w-full border rounded px-3 py-2 text-sm" />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Create Franchise</button>
            </form>
            <p className="text-xs text-gray-400 mt-2">Or <Link to="/franchises" className="text-blue-600 hover:underline">go to Franchises</Link> to manage existing ones.</p>
          </div>
        )}

        {step.id === 'character' && (
          <div>
            {isStepDone('character') && <div className="text-sm bg-green-50 text-green-700 p-2 rounded mb-3">You already have characters!</div>}
            <p className="text-sm text-gray-600 mb-3">Characters require the full 5-pack workspace to set up properly.</p>
            <Link to="/characters" className="inline-block bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Go to Characters</Link>
          </div>
        )}

        {step.id === 'evaluation' && (
          <div>
            {isStepDone('evaluation') && <div className="text-sm bg-green-50 text-green-700 p-2 rounded mb-3">You've already run evaluations!</div>}
            <p className="text-sm text-gray-600 mb-3">Run an evaluation to see the engine in action.</p>
            <Link to="/evaluations" className="inline-block bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Go to Evaluations</Link>
          </div>
        )}

        {step.id === 'invite' && (
          <div>
            {isStepDone('invite') && <div className="text-sm bg-green-50 text-green-700 p-2 rounded mb-3">You've already invited team members!</div>}
            {invMsg && <div className={`text-sm p-2 rounded mb-3 ${invMsg.includes('sent') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{invMsg}</div>}
            <form onSubmit={handleInvite} className="space-y-3">
              <input type="email" placeholder="Team member email" value={invEmail} onChange={e => setInvEmail(e.target.value)} required className="w-full border rounded px-3 py-2 text-sm" />
              <select value={invRole} onChange={e => setInvRole(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Send Invitation</button>
            </form>
          </div>
        )}

        {step.id === 'done' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">Your organization is set up and ready to go.</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-30"
          >
            Back
          </button>
          <div className="flex gap-2">
            {step.id !== 'done' && step.id !== 'welcome' && (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Skip
              </button>
            )}
            {step.id === 'done' ? (
              <button
                onClick={handleFinish}
                className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700"
              >
                Go to Dashboard
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700"
              >
                {currentStep === 0 ? 'Get Started' : 'Continue'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
