import { useAuth } from '../contexts/AuthContext'
import PageHeader from '../components/PageHeader'

export default function Settings() {
  const { user } = useAuth()

  return (
    <div>
      <PageHeader title="Settings" subtitle="Account and organization settings" />
      <div className="bg-white rounded-lg shadow p-6 max-w-lg">
        <h3 className="font-semibold mb-4">Account</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span>{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Name</span>
            <span>{user?.full_name || 'Not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Role</span>
            <span className="capitalize">{user?.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Organization ID</span>
            <span>{user?.org_id}</span>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 max-w-lg mt-4">
        <h3 className="font-semibold mb-4">API Configuration</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">API Docs</span>
            <a href="/api/docs" target="_blank" className="text-blue-600 hover:underline">/api/docs</a>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Version</span>
            <span>2.0.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}
