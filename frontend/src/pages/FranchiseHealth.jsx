import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import api from '../services/api'

export default function FranchiseHealth() {
  const { id } = useParams()
  const [health, setHealth] = useState(null)

  useEffect(() => {
    api.get(`/franchises/${id}/health`).then((r) => setHealth(r.data))
  }, [id])

  if (!health) return <div className="text-gray-500 p-8">Loading franchise health...</div>

  // Scores from backend are on 0-100 scale
  const fmtScore = (v) => v != null ? v.toFixed(1) : 'N/A'
  const fmtPercent = (v) => v != null ? `${(v * 100).toFixed(1)}%` : 'N/A'

  const metrics = [
    { label: 'Total Evaluations', value: health.total_evals, color: 'text-blue-600' },
    { label: 'Average Score', value: fmtScore(health.avg_score), color: 'text-purple-600' },
    { label: 'Pass Rate', value: fmtPercent(health.pass_rate), color: 'text-green-600' },
    { label: 'Cross-Character Consistency', value: fmtPercent(health.cross_character_consistency), color: 'text-indigo-600' },
    { label: 'World-Building Consistency', value: fmtPercent(health.world_building_consistency), color: 'text-teal-600' },
    { label: 'Health Score', value: fmtScore(health.health_score), color: 'text-emerald-600' },
  ]

  // Sort characters by score descending
  const breakdown = Object.entries(health.character_breakdown || {}).sort((a, b) => b[1] - a[1])

  const scoreBarColor = (score) => {
    if (score >= 90) return 'bg-green-500'
    if (score >= 80) return 'bg-yellow-500'
    if (score >= 70) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div>
      <PageHeader title={`${health.franchise_name || 'Franchise'} Health`} subtitle="Franchise-level evaluation metrics and per-character breakdown" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">{m.label}</p>
            <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {breakdown.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-4">Per-Character Breakdown</h3>
          <div className="space-y-3">
            {breakdown.map(([charName, score]) => (
              <div key={charName} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {charName[0]}
                </div>
                <span className="text-sm text-gray-700 w-36 truncate flex-shrink-0">{charName}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div className={`h-4 rounded-full transition-all ${scoreBarColor(score)}`}
                    style={{ width: `${Math.min(score, 100)}%` }} />
                </div>
                <span className={`text-sm font-mono font-bold w-12 text-right ${
                  score >= 90 ? 'text-green-600' : score >= 80 ? 'text-yellow-600' : 'text-red-600'
                }`}>{score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {breakdown.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No character breakdown data available for this period.
        </div>
      )}
    </div>
  )
}
