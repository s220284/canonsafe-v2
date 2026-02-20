import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getChapters } from '../data/tutorial/chapters'

const STORAGE_KEY = 'canonsafe-tutorial-progress'

function getProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export default function Tutorial() {
  const chapters = getChapters()
  const [progress, setProgress] = useState({})

  useEffect(() => {
    setProgress(getProgress())
  }, [])

  const readCount = Object.keys(progress).filter((k) => progress[k]).length

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">CanonSafe Eval Masterclass</h1>
        <p className="text-gray-600 mt-2 text-lg">
          A comprehensive guide to AI character evaluations — from theory to production.
        </p>
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
          <span>10 chapters</span>
          <span className="text-gray-300">|</span>
          <span>~70 min total reading</span>
          <span className="text-gray-300">|</span>
          <span>{readCount}/10 completed</span>
        </div>
        {readCount > 0 && (
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(readCount / 10) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {chapters.map((ch) => {
          const isRead = progress[ch.slug]
          return (
            <Link
              key={ch.slug}
              to={`/tutorial/${ch.slug}`}
              className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isRead ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {isRead ? '\u2713' : ch.id}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Chapter {ch.id}: {ch.title}
                    </h2>
                    <p className="text-gray-500 text-sm mt-0.5">{ch.subtitle}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {ch.concepts.map((c) => (
                        <span key={c} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                          {c}
                        </span>
                      ))}
                      {ch.features.map((f) => (
                        <span key={f} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-4">{ch.readingTime}</span>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="mt-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-800">About this tutorial</h3>
        <p className="text-sm text-gray-600 mt-2">
          Each chapter teaches evaluation concepts (theory) then demonstrates them hands-on in CanonSafe
          using Disney demo data — 27 characters across Star Wars and Disney Princess franchises.
          Work through them in order for the best experience, or jump to any chapter that interests you.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Screenshots are marked with placeholder boxes. Your admin can replace them with actual
          screenshots from your deployment.
        </p>
      </div>
    </div>
  )
}
