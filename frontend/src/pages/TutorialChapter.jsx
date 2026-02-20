import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { getChapterBySlug, getAdjacentChapters } from '../data/tutorial/chapters'

// Import all chapter markdown files as raw strings
const mdModules = import.meta.glob('../data/tutorial/*.md', { query: '?raw', import: 'default' })

const STORAGE_KEY = 'canonsafe-tutorial-progress'

function markRead(slug) {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    p[slug] = true
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch { /* ignore */ }
}

function ScreenshotPlaceholder({ description }) {
  return (
    <div className="my-4 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <div className="text-gray-400 text-sm font-medium">SCREENSHOT</div>
      <div className="text-gray-500 text-sm mt-1">{description}</div>
    </div>
  )
}

// Custom renderers for react-markdown
const components = {
  h1: ({ children }) => <h1 className="text-3xl font-bold text-gray-900 mt-8 mb-4">{children}</h1>,
  h2: ({ children }) => <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3 pb-2 border-b border-gray-200">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2">{children}</h3>,
  h4: ({ children }) => <h4 className="text-lg font-semibold text-gray-700 mt-4 mb-2">{children}</h4>,
  p: ({ children }) => {
    // Check if this paragraph is a screenshot placeholder
    if (typeof children === 'string' || (Array.isArray(children) && children.length === 1 && typeof children[0] === 'string')) {
      const text = Array.isArray(children) ? children[0] : children
      const match = typeof text === 'string' && text.match(/^\[SCREENSHOT:\s*(.+)\]$/)
      if (match) return <ScreenshotPlaceholder description={match[1]} />
    }
    return <p className="text-gray-700 leading-relaxed mb-4">{children}</p>
  },
  ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-700">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-blue-400 bg-blue-50 px-4 py-3 my-4 rounded-r-lg text-gray-700">
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.startsWith('language-')
    if (isBlock) {
      return (
        <code className="block bg-gray-900 text-gray-100 rounded-lg p-4 my-4 overflow-x-auto text-sm font-mono whitespace-pre">
          {children}
        </code>
      )
    }
    return <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>
  },
  pre: ({ children }) => <pre className="my-4">{children}</pre>,
  table: ({ children }) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border border-gray-200 rounded-lg text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
  th: ({ children }) => <th className="px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">{children}</th>,
  td: ({ children }) => <td className="px-4 py-2 text-gray-600 border-b border-gray-100">{children}</td>,
  hr: () => <hr className="my-8 border-gray-200" />,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  a: ({ href, children }) => (
    <a href={href} className="text-blue-600 hover:text-blue-800 underline" target={href?.startsWith('http') ? '_blank' : undefined} rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}>
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    <figure className="my-4">
      <img src={src} alt={alt} className="rounded-lg border border-gray-200 max-w-full" />
      {alt && <figcaption className="text-center text-sm text-gray-500 mt-2">{alt}</figcaption>}
    </figure>
  ),
}

export default function TutorialChapter() {
  const { chapter: slug } = useParams()
  const navigate = useNavigate()
  const [markdown, setMarkdown] = useState('')
  const [loading, setLoading] = useState(true)

  const chapter = getChapterBySlug(slug)
  const { prev, next } = getAdjacentChapters(slug)

  useEffect(() => {
    if (!chapter) {
      navigate('/tutorial', { replace: true })
      return
    }

    setLoading(true)
    // Find the matching markdown module
    const key = Object.keys(mdModules).find((k) => k.includes(slug))
    if (key) {
      mdModules[key]().then((content) => {
        setMarkdown(content)
        setLoading(false)
        markRead(slug)
        window.scrollTo(0, 0)
      })
    } else {
      setMarkdown('# Coming Soon\n\nThis chapter is being written.')
      setLoading(false)
    }
  }, [slug, chapter, navigate])

  if (!chapter) return null

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link to="/tutorial" className="text-sm text-blue-600 hover:text-blue-800">
          &larr; Back to Tutorial
        </Link>
      </div>

      {/* Chapter header */}
      <div className="mb-8 pb-6 border-b border-gray-200">
        <div className="text-sm text-gray-500 font-medium mb-1">Chapter {chapter.id} of 10</div>
        <h1 className="text-3xl font-bold text-gray-900">{chapter.title}</h1>
        <p className="text-gray-500 mt-1">{chapter.subtitle}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-xs text-gray-400">{chapter.readingTime} read</span>
          {chapter.concepts.map((c) => (
            <span key={c} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{c}</span>
          ))}
        </div>
      </div>

      {/* Markdown content */}
      {loading ? (
        <div className="text-gray-400 py-12 text-center">Loading chapter...</div>
      ) : (
        <div className="prose-custom">
          <ReactMarkdown components={components}>{markdown}</ReactMarkdown>
        </div>
      )}

      {/* Chapter navigation */}
      <div className="mt-12 pt-6 border-t border-gray-200 flex items-center justify-between">
        {prev ? (
          <Link
            to={`/tutorial/${prev.slug}`}
            className="flex flex-col items-start text-sm hover:text-blue-600"
          >
            <span className="text-gray-400 text-xs">&larr; Previous</span>
            <span className="font-medium text-gray-700 hover:text-blue-600">
              Ch {prev.id}: {prev.title}
            </span>
          </Link>
        ) : <div />}
        {next ? (
          <Link
            to={`/tutorial/${next.slug}`}
            className="flex flex-col items-end text-sm hover:text-blue-600"
          >
            <span className="text-gray-400 text-xs">Next &rarr;</span>
            <span className="font-medium text-gray-700 hover:text-blue-600">
              Ch {next.id}: {next.title}
            </span>
          </Link>
        ) : (
          <Link
            to="/tutorial"
            className="flex flex-col items-end text-sm hover:text-blue-600"
          >
            <span className="text-gray-400 text-xs">Finish</span>
            <span className="font-medium text-gray-700 hover:text-blue-600">Back to Tutorial Index</span>
          </Link>
        )}
      </div>
    </div>
  )
}
