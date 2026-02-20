import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

export default function UsageDashboard() {
  const [details, setDetails] = useState(null)
  const [breakdown, setBreakdown] = useState([])
  const [licenseStatus, setLicenseStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/org/usage/details').catch(() => ({ data: null })),
      api.get('/org/usage/breakdown?months=6').catch(() => ({ data: [] })),
      api.get('/license/status').catch(() => ({ data: null })),
    ]).then(([d, b, l]) => {
      setDetails(d.data)
      setBreakdown(b.data || [])
      setLicenseStatus(l.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-sm text-gray-500 p-6">Loading usage data...</div>

  const UsageBar = ({ label, current, max }) => {
    const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0
    const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-blue-500'
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{label}</span>
          <span className="font-medium">{current.toLocaleString()} / {max.toLocaleString()}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className={`${color} rounded-full h-2.5 transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }

  // Simple bar chart using div heights
  const maxEvals = Math.max(...breakdown.map(b => b.eval_count || 0), 1)

  return (
    <div>
      <PageHeader title="Usage Dashboard" subtitle="Monthly usage, costs, and license limits" />

      {/* Current month stats */}
      {details && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Evaluations', value: details.eval_count, color: 'bg-blue-500' },
            { label: 'API Calls', value: details.api_call_count, color: 'bg-green-500' },
            { label: 'LLM Tokens', value: details.llm_tokens_used.toLocaleString(), color: 'bg-purple-500' },
            { label: 'Est. Cost', value: `$${details.estimated_cost.toFixed(2)}`, color: 'bg-orange-500' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-lg shadow p-4">
              <div className={`w-2 h-2 rounded-full ${c.color} mb-2`} />
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-sm text-gray-500">{c.label}</p>
              <p className="text-xs text-gray-400 mt-1">{details.period}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* License Limits */}
        {licenseStatus && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">License Limits</h3>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 capitalize">{licenseStatus.license.plan}</span>
            </div>
            <div className="space-y-4">
              <UsageBar label="Users" current={licenseStatus.usage.users} max={licenseStatus.limits.max_users} />
              <UsageBar label="Characters" current={licenseStatus.usage.characters} max={licenseStatus.limits.max_characters} />
              <UsageBar label="Evals (this month)" current={licenseStatus.usage.evals_this_month} max={licenseStatus.limits.max_evals_per_month} />
            </div>
          </div>
        )}

        {/* Monthly Usage Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Monthly Evaluations</h3>
          {breakdown.length > 0 ? (
            <div className="flex items-end gap-2 h-40">
              {[...breakdown].reverse().map((b, i) => (
                <div key={b.period} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex justify-center mb-1">
                    <span className="text-xs text-gray-500 font-medium">{b.eval_count || 0}</span>
                  </div>
                  <div
                    className="w-full bg-blue-500 rounded-t min-h-[4px]"
                    style={{ height: `${Math.max(((b.eval_count || 0) / maxEvals) * 120, 4)}px` }}
                  />
                  <span className="text-xs text-gray-400 mt-1">{b.period.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400 text-center py-8">No usage data yet</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Characters */}
        {details && details.top_characters?.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b">
              <h3 className="font-semibold">Top Characters by Eval Count</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="text-left px-4 py-2">Character</th>
                <th className="text-right px-4 py-2">Evals</th>
                <th className="text-right px-4 py-2">Avg Score</th>
              </tr></thead>
              <tbody className="divide-y">
                {details.top_characters.map((c, i) => (
                  <tr key={c.character_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                        {c.character_name[0]}
                      </span>
                      {c.character_name}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{c.eval_count}</td>
                    <td className="px-4 py-2 text-right font-mono">{c.avg_score?.toFixed(2) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Cost Breakdown */}
        {breakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b">
              <h3 className="font-semibold">Cost Breakdown by Month</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="text-left px-4 py-2">Period</th>
                <th className="text-right px-4 py-2">Evals</th>
                <th className="text-right px-4 py-2">Tokens</th>
                <th className="text-right px-4 py-2">Cost</th>
              </tr></thead>
              <tbody className="divide-y">
                {breakdown.map(b => (
                  <tr key={b.period} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{b.period}</td>
                    <td className="px-4 py-2 text-right font-mono">{b.eval_count}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{b.llm_tokens_used.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-mono">${b.estimated_cost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
