import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Characters from './pages/Characters'
import CharacterWorkspace from './pages/CharacterWorkspace'
import Franchises from './pages/Franchises'
import FranchiseHealth from './pages/FranchiseHealth'
import Critics from './pages/Critics'
import Evaluations from './pages/Evaluations'
import TestSuites from './pages/TestSuites'
import Certifications from './pages/Certifications'
import Taxonomy from './pages/Taxonomy'
import Exemplars from './pages/Exemplars'
import Improvement from './pages/Improvement'
import APM from './pages/APM'
import ReviewQueue from './pages/ReviewQueue'
import DriftMonitor from './pages/DriftMonitor'
import Consent from './pages/Consent'
import Settings from './pages/Settings'
import UserManual from './pages/UserManual'
import Compare from './pages/Compare'
import RedTeam from './pages/RedTeam'
import ABTesting from './pages/ABTesting'
import Judges from './pages/Judges'
import MultiModal from './pages/MultiModal'
// V3 pages
import AdminDashboard from './pages/AdminDashboard'
import AcceptInvitation from './pages/AcceptInvitation'
import ResetPassword from './pages/ResetPassword'
import ApiDocs from './pages/ApiDocs'
import Tutorial from './pages/Tutorial'
import TutorialChapter from './pages/TutorialChapter'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  const { user, loading } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={
        loading ? null : user ? <Navigate to="/" replace /> : <Login />
      } />
      {/* V3: Public routes (no Layout wrapper) */}
      <Route path="/accept-invitation" element={<AcceptInvitation />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/characters" element={<ProtectedRoute><Characters /></ProtectedRoute>} />
      <Route path="/characters/:id" element={<ProtectedRoute><CharacterWorkspace /></ProtectedRoute>} />
      <Route path="/franchises" element={<ProtectedRoute><Franchises /></ProtectedRoute>} />
      <Route path="/franchises/:id/health" element={<ProtectedRoute><FranchiseHealth /></ProtectedRoute>} />
      <Route path="/critics" element={<ProtectedRoute><Critics /></ProtectedRoute>} />
      <Route path="/evaluations" element={<ProtectedRoute><Evaluations /></ProtectedRoute>} />
      <Route path="/compare" element={<ProtectedRoute><Compare /></ProtectedRoute>} />
      <Route path="/reviews" element={<ProtectedRoute><ReviewQueue /></ProtectedRoute>} />
      <Route path="/test-suites" element={<ProtectedRoute><TestSuites /></ProtectedRoute>} />
      <Route path="/certifications" element={<ProtectedRoute><Certifications /></ProtectedRoute>} />
      <Route path="/taxonomy" element={<ProtectedRoute><Taxonomy /></ProtectedRoute>} />
      <Route path="/exemplars" element={<ProtectedRoute><Exemplars /></ProtectedRoute>} />
      <Route path="/drift" element={<ProtectedRoute><DriftMonitor /></ProtectedRoute>} />
      <Route path="/improvement" element={<ProtectedRoute><Improvement /></ProtectedRoute>} />
      <Route path="/apm" element={<ProtectedRoute><APM /></ProtectedRoute>} />
      <Route path="/red-team" element={<ProtectedRoute><RedTeam /></ProtectedRoute>} />
      <Route path="/ab-testing" element={<ProtectedRoute><ABTesting /></ProtectedRoute>} />
      <Route path="/judges" element={<ProtectedRoute><Judges /></ProtectedRoute>} />
      <Route path="/multimodal" element={<ProtectedRoute><MultiModal /></ProtectedRoute>} />
      <Route path="/consent" element={<ProtectedRoute><Consent /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/manual" element={<ProtectedRoute><UserManual /></ProtectedRoute>} />
      {/* V3: Admin + API docs routes */}
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/api-docs" element={<ProtectedRoute><ApiDocs /></ProtectedRoute>} />
      <Route path="/tutorial" element={<ProtectedRoute><Tutorial /></ProtectedRoute>} />
      <Route path="/tutorial/:chapter" element={<ProtectedRoute><TutorialChapter /></ProtectedRoute>} />
    </Routes>
  )
}
