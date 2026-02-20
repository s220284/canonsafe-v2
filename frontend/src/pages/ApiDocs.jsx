import PageHeader from '../components/PageHeader'

export default function ApiDocs() {
  return (
    <div>
      <PageHeader title="API Documentation" subtitle="Integrate your AI agents with CanonSafe" />

      <div className="max-w-3xl space-y-6">
        {/* Authentication */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Authentication</h2>
          <p className="text-sm text-gray-600 mb-3">
            CanonSafe supports two authentication methods:
          </p>
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm">1. JWT Token (for web UI)</h4>
              <p className="text-xs text-gray-500 mb-1">Obtained via POST /api/auth/login, passed as Bearer token.</p>
              <pre className="bg-gray-50 rounded p-3 text-xs overflow-x-auto">Authorization: Bearer eyJhbGci...</pre>
            </div>
            <div>
              <h4 className="font-medium text-sm">2. API Key (for agent integration)</h4>
              <p className="text-xs text-gray-500 mb-1">Created in Settings &gt; API Keys. Passed via X-API-Key header.</p>
              <pre className="bg-gray-50 rounded p-3 text-xs overflow-x-auto">X-API-Key: csf_a1b2c3d4e5f6...</pre>
            </div>
          </div>
        </section>

        {/* Core Endpoints */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Core Endpoints</h2>
          <div className="space-y-4">
            <Endpoint method="POST" path="/api/evaluations" description="Run an evaluation on AI-generated content.">
              {`{
  "character_id": 1,
  "content": "Hello, I'm Peppa! Let's jump in muddy puddles!",
  "modality": "text",
  "agent_id": "my-agent-v1"
}`}
            </Endpoint>

            <Endpoint method="POST" path="/api/apm/evaluate" description="Agentic Pipeline Middleware — evaluate and get enforcement decision.">
              {`{
  "character_id": 1,
  "content": "Generated content here...",
  "modality": "text",
  "mode": "enforce"
}`}
            </Endpoint>

            <Endpoint method="GET" path="/api/characters" description="List all characters in your organization." />

            <Endpoint method="GET" path="/api/characters/{id}" description="Get character details including active card version." />

            <Endpoint method="GET" path="/api/evaluations" description="List evaluation history with optional filters." />
          </div>
        </section>

        {/* Code Examples */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Code Examples</h2>

          <div className="mb-4">
            <h4 className="font-medium text-sm mb-2">Python (requests)</h4>
            <pre className="bg-gray-900 text-green-400 rounded p-3 text-xs overflow-x-auto">{`import requests

API_URL = "https://your-canonsafe-url.com/api"
API_KEY = "csf_your_api_key_here"

# Run an evaluation
response = requests.post(
    f"{API_URL}/evaluations",
    headers={"X-API-Key": API_KEY},
    json={
        "character_id": 1,
        "content": "Hello! I love jumping in muddy puddles!",
        "modality": "text",
        "agent_id": "my-chatbot-v2",
    },
)

result = response.json()
print(f"Score: {result['eval_run']['overall_score']}")
print(f"Decision: {result['eval_run']['decision']}")
`}</pre>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">cURL</h4>
            <pre className="bg-gray-900 text-green-400 rounded p-3 text-xs overflow-x-auto">{`# Run an evaluation
curl -X POST "https://your-canonsafe-url.com/api/evaluations" \\
  -H "X-API-Key: csf_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "character_id": 1,
    "content": "Hello! I am Peppa Pig!",
    "modality": "text"
  }'

# List characters
curl "https://your-canonsafe-url.com/api/characters" \\
  -H "X-API-Key: csf_your_api_key_here"
`}</pre>
          </div>
        </section>

        {/* Rate Limits */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Rate Limits</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b">
              <th className="text-left py-2">Endpoint</th>
              <th className="text-left py-2">Limit</th>
              <th className="text-left py-2">Window</th>
            </tr></thead>
            <tbody>
              <tr className="border-b"><td className="py-2">POST /api/evaluations</td><td>100 requests</td><td>60 seconds</td></tr>
              <tr className="border-b"><td className="py-2">POST /api/apm/evaluate</td><td>100 requests</td><td>60 seconds</td></tr>
              <tr><td className="py-2">GET endpoints</td><td>300 requests</td><td>60 seconds</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-2">Rate limits are per organization. A 429 response includes a Retry-After header.</p>
        </section>

        {/* Scopes */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">API Key Scopes</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b">
              <th className="text-left py-2">Scope</th>
              <th className="text-left py-2">Access</th>
            </tr></thead>
            <tbody>
              <tr className="border-b"><td className="py-2 font-mono text-xs">evaluations</td><td>Run and read evaluations</td></tr>
              <tr className="border-b"><td className="py-2 font-mono text-xs">characters:read</td><td>Read character data</td></tr>
              <tr className="border-b"><td className="py-2 font-mono text-xs">apm</td><td>Use Agentic Pipeline Middleware</td></tr>
              <tr><td className="py-2 font-mono text-xs">certifications</td><td>Run agent certifications</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-2">If no scopes are specified, the key has access to all endpoints at editor level.</p>
        </section>

        {/* Webhooks */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Webhooks</h2>
          <p className="text-sm text-gray-600 mb-3">
            Subscribe to events via Settings &gt; Webhooks. Payloads are signed with HMAC-SHA256.
          </p>
          <h4 className="font-medium text-sm mb-2">Available Events</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li><code className="text-xs">eval_completed</code> — Every evaluation completes</li>
            <li><code className="text-xs">eval_blocked</code> — Content blocked (score &lt; 0.3)</li>
            <li><code className="text-xs">eval_escalated</code> — Content quarantined or escalated</li>
            <li><code className="text-xs">test</code> — Test webhook delivery</li>
          </ul>
          <h4 className="font-medium text-sm mt-3 mb-2">Verifying Signatures</h4>
          <pre className="bg-gray-900 text-green-400 rounded p-3 text-xs overflow-x-auto">{`import hmac, hashlib

def verify_webhook(payload_body, signature, secret):
    expected = hmac.new(
        secret.encode(), payload_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)
`}</pre>
        </section>

        <div className="text-center text-sm text-gray-400 py-4">
          <a href="/api/docs" target="_blank" className="text-blue-600 hover:underline">
            Interactive API documentation (Swagger UI)
          </a>
        </div>
      </div>
    </div>
  )
}

function Endpoint({ method, path, description, children }) {
  const methodColor = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PATCH: 'bg-yellow-100 text-yellow-800',
    DELETE: 'bg-red-100 text-red-800',
  }[method] || 'bg-gray-100 text-gray-800'

  return (
    <div className="border rounded p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${methodColor}`}>{method}</span>
        <code className="text-sm font-mono">{path}</code>
      </div>
      <p className="text-xs text-gray-500">{description}</p>
      {children && (
        <pre className="bg-gray-50 rounded p-2 text-xs mt-2 overflow-x-auto">{children}</pre>
      )}
    </div>
  )
}
