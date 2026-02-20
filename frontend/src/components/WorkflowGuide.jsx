import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function WorkflowGuide({ workflow }) {
  const [open, setOpen] = useState(false)
  const [completed, setCompleted] = useState({})

  if (!workflow) return null

  const toggleStep = (idx) => {
    setCompleted(c => ({ ...c, [idx]: !c[idx] }))
  }

  const doneCount = Object.values(completed).filter(Boolean).length

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div>
          <span className="text-sm font-semibold text-indigo-900">{workflow.title}</span>
          <span className="text-xs text-indigo-600 ml-2">({doneCount}/{workflow.steps.length} steps)</span>
        </div>
        <span className="text-indigo-400">{open ? '\u25B2' : '\u25BC'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-sm text-indigo-700 mb-3">{workflow.description}</p>
          {workflow.steps.map((step, idx) => (
            <div key={idx} className={`flex items-start gap-3 p-2 rounded ${completed[idx] ? 'bg-green-50' : 'bg-white'}`}>
              <button
                onClick={() => toggleStep(idx)}
                className={`mt-0.5 w-5 h-5 flex items-center justify-center rounded border text-xs flex-shrink-0 ${
                  completed[idx] ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                }`}
              >
                {completed[idx] ? '\u2713' : idx + 1}
              </button>
              <div>
                <p className={`text-sm font-medium ${completed[idx] ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
                {step.link && (
                  <Link to={step.link} className="text-xs text-indigo-600 hover:underline">Go to {step.linkLabel || 'page'} &rarr;</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
