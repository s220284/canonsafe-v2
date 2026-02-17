import { useState, useEffect } from 'react'

// ─── Reusable Components ──────────────────────────────────────────

function Section({ id, title, children }) {
  return (
    <section id={id} className="mb-12 scroll-mt-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">{title}</h2>
      {children}
    </section>
  )
}

function SubSection({ id, title, children }) {
  return (
    <div id={id} className="mb-8 scroll-mt-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-3">{title}</h3>
      {children}
    </div>
  )
}

function InfoCard({ title, color, children }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-900',
  }
  return (
    <div className={`rounded-lg border p-4 mb-3 ${colors[color] || colors.gray}`}>
      {title && <h4 className="font-semibold mb-1">{title}</h4>}
      <div className="text-sm">{children}</div>
    </div>
  )
}

function CodeBlock({ title, children }) {
  return (
    <div className="mb-4">
      {title && <p className="text-xs font-mono text-gray-500 mb-1">{title}</p>}
      <pre className="bg-gray-900 text-green-300 text-xs p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
        {children}
      </pre>
    </div>
  )
}

function PipelineStep({ number, title, description, color }) {
  const colors = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-600',
    purple: 'bg-purple-600',
  }
  return (
    <div className="flex items-start gap-4 mb-4">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${colors[color] || colors.blue} text-white flex items-center justify-center text-sm font-bold`}>
        {number}
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
    </div>
  )
}

function DecisionBadge({ label, color, range }) {
  const colors = {
    green: 'bg-green-100 text-green-800 border-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    darkred: 'bg-red-200 text-red-900 border-red-400',
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${colors[color]}`}>
      {label} ({range})
    </span>
  )
}

function StepByStep({ steps }) {
  return (
    <ol className="space-y-3 mb-4">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
          <div className="text-sm text-gray-700 flex-1">{step}</div>
        </li>
      ))}
    </ol>
  )
}

function KeyValue({ label, children }) {
  return (
    <div className="flex items-start gap-2 mb-1">
      <span className="text-xs font-medium text-gray-500 w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-700">{children}</span>
    </div>
  )
}

function Tip({ children }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 mb-3 text-sm text-blue-800 flex items-start gap-2">
      <span className="flex-shrink-0 text-blue-500 font-bold">Tip:</span>
      <div>{children}</div>
    </div>
  )
}

function Warning({ children }) {
  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 mb-3 text-sm text-orange-800 flex items-start gap-2">
      <span className="flex-shrink-0 text-orange-600 font-bold">Warning:</span>
      <div>{children}</div>
    </div>
  )
}

// ─── Table of Contents Data ─────────────────────────────────────────

const TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'getting-started', label: 'Getting Started', children: [
    { id: 'gs-first-login', label: 'First Login' },
    { id: 'gs-create-character', label: 'Creating a Character' },
    { id: 'gs-build-card', label: 'Building a Card' },
    { id: 'gs-first-eval', label: 'Running an Evaluation' },
    { id: 'gs-reading-results', label: 'Reading Results' },
  ]},
  { id: 'core-concepts', label: 'Core Concepts', children: [
    { id: 'character-cards', label: 'Character Cards' },
    { id: 'five-pack', label: 'The 5-Pack System' },
    { id: 'critics', label: 'Critics' },
    { id: 'eval-profiles', label: 'Evaluation Profiles' },
    { id: 'main-focus', label: 'Main & Focus Characters' },
  ]},
  { id: 'eval-pipeline', label: 'Evaluation Pipeline', children: [
    { id: 'pipeline-steps', label: 'The 6 Steps' },
    { id: 'pipeline-scoring', label: 'How Scoring Works' },
    { id: 'pipeline-flags', label: 'Flags & Overrides' },
  ]},
  { id: 'feature-guide', label: 'Feature Guide', children: [
    { id: 'feat-dashboard', label: 'Dashboard' },
    { id: 'feat-characters', label: 'Characters' },
    { id: 'feat-workspace', label: 'Character Workspace' },
    { id: 'feat-franchises', label: 'Franchises' },
    { id: 'feat-health', label: 'Franchise Health' },
    { id: 'feat-critics', label: 'Critics & Profiles' },
    { id: 'feat-evaluations', label: 'Evaluations' },
    { id: 'feat-test-suites', label: 'Test Suites' },
    { id: 'feat-certifications', label: 'Agent Certification' },
    { id: 'feat-taxonomy', label: 'Taxonomy' },
    { id: 'feat-exemplars', label: 'Exemplars' },
    { id: 'feat-improvement', label: 'Improvement' },
    { id: 'feat-apm', label: 'APM' },
    { id: 'feat-compare', label: 'Compare' },
    { id: 'feat-reviews', label: 'Review Queue' },
    { id: 'feat-drift', label: 'Drift Monitor' },
    { id: 'feat-redteam', label: 'Red Team' },
    { id: 'feat-abtesting', label: 'A/B Testing' },
    { id: 'feat-judges', label: 'Judges' },
    { id: 'feat-multimodal', label: 'Multi-Modal' },
    { id: 'feat-consent', label: 'Consent' },
    { id: 'feat-settings', label: 'Settings' },
  ]},
  { id: 'decisions', label: 'Decision Categories' },
  { id: 'certification', label: 'Agent Certification', children: [
    { id: 'cert-tiers', label: 'Certification Tiers' },
    { id: 'cert-lifecycle', label: 'Certification Lifecycle' },
    { id: 'cert-howto', label: 'How to Certify' },
  ]},
  { id: 'improvement-flywheel', label: 'Improvement Flywheel', children: [
    { id: 'fly-patterns', label: 'Failure Patterns' },
    { id: 'fly-trajectories', label: 'Trajectories' },
    { id: 'fly-loop', label: 'The Feedback Loop' },
  ]},
  { id: 'taxonomy-system', label: 'Taxonomy System', children: [
    { id: 'tax-categories', label: 'Categories' },
    { id: 'tax-tags', label: 'Tags' },
    { id: 'tax-howto', label: 'How to Use Taxonomy' },
  ]},
  { id: 'exemplar-library', label: 'Exemplar Library', children: [
    { id: 'ex-purpose', label: 'Purpose' },
    { id: 'ex-howto', label: 'How to Use Exemplars' },
    { id: 'ex-auto', label: 'Auto-Promotion' },
  ]},
  { id: 'apm-sdk', label: 'APM SDK Integration', children: [
    { id: 'apm-evaluate', label: 'Evaluate Endpoint' },
    { id: 'apm-enforce', label: 'Enforce Endpoint' },
    { id: 'apm-workflow', label: 'Integration Workflow' },
    { id: 'apm-errors', label: 'Error Handling' },
  ]},
  { id: 'c2pa', label: 'C2PA Content Provenance' },
  { id: 'best-practices', label: 'Best Practices', children: [
    { id: 'bp-cards', label: 'Writing Good Cards' },
    { id: 'bp-critics', label: 'Tuning Critics' },
    { id: 'bp-testing', label: 'Building Test Suites' },
    { id: 'bp-monitoring', label: 'Monitoring & Alerts' },
  ]},
  { id: 'troubleshooting', label: 'Troubleshooting' },
  { id: 'glossary', label: 'Glossary' },
]

// ─── Sidebar ToC ────────────────────────────────────────────────────

function TableOfContents({ activeId }) {
  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="space-y-1">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contents</p>
      {TOC.map((item) => (
        <div key={item.id}>
          <button
            onClick={() => scrollTo(item.id)}
            className={`block w-full text-left px-2 py-1 text-sm rounded transition-colors ${
              activeId === item.id ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {item.label}
          </button>
          {item.children && (
            <div className="ml-3 mt-1 space-y-0.5">
              {item.children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => scrollTo(child.id)}
                  className={`block w-full text-left px-2 py-0.5 text-xs rounded transition-colors ${
                    activeId === child.id ? 'text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {child.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function UserManual() {
  const [activeId, setActiveId] = useState('overview')

  useEffect(() => {
    const allIds = []
    TOC.forEach((item) => {
      allIds.push(item.id)
      if (item.children) item.children.forEach((c) => allIds.push(c.id))
    })

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    )

    allIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex gap-8 max-w-7xl mx-auto">
      {/* Sticky sidebar ToC */}
      <aside className="hidden lg:block w-56 flex-shrink-0">
        <div className="sticky top-6 max-h-[calc(100vh-4rem)] overflow-y-auto pr-4">
          <TableOfContents activeId={activeId} />
        </div>
      </aside>

      {/* Scrollable content */}
      <div className="flex-1 min-w-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">CanonSafe V2 User Manual</h1>
        <p className="text-gray-500 mb-8">Complete guide to the Character IP Governance Platform</p>

        {/* ══════════════════════════════════════════════════════════════
            1. OVERVIEW
            ══════════════════════════════════════════════════════════════ */}
        <Section id="overview" title="Overview">
          <p className="text-gray-700 mb-4">
            <strong>CanonSafe V2</strong> is a character IP governance platform that protects fictional characters
            from drift, misrepresentation, and brand-safety violations in AI-generated content. It provides a
            structured evaluation pipeline that scores every piece of content against the character's official
            identity before it reaches audiences.
          </p>
          <InfoCard title="The Problem" color="red">
            When AI systems generate content featuring licensed characters, they can produce outputs that contradict
            canon facts, break voice consistency, introduce age-inappropriate material, or violate legal restrictions.
            Without governance, character IP erodes over time — a phenomenon called <strong>character drift</strong>.
            An AI might make Peppa Pig say something a 4-year-old character would never say, or depict her in art
            styles that violate the brand's visual identity. At scale, these errors compound and damage the brand.
          </InfoCard>
          <InfoCard title="The Solution" color="green">
            CanonSafe V2 establishes a <strong>Character Card</strong> as the single source of truth for each character,
            then evaluates every AI output against that card using configurable <strong>LLM-based critics</strong>.
            Content is scored, classified, and either approved, sent for regeneration, quarantined, escalated, or blocked
            — with full provenance tracking via C2PA metadata. The platform creates a continuous improvement loop
            that automatically detects problems, suggests fixes, and tracks whether those fixes actually work.
          </InfoCard>
          <InfoCard title="Who Uses CanonSafe" color="blue">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>IP Managers</strong> — define character identity via cards and packs, set evaluation policies</li>
              <li><strong>Content Reviewers</strong> — review quarantined content, handle escalations, approve overrides</li>
              <li><strong>AI Engineers</strong> — integrate CanonSafe into agent pipelines via the APM SDK, certify agents</li>
              <li><strong>Quality Analysts</strong> — monitor evaluation metrics, identify failure patterns, track improvement</li>
              <li><strong>Legal/Compliance</strong> — manage consent verifications, territory restrictions, C2PA provenance</li>
            </ul>
          </InfoCard>
        </Section>

        {/* ══════════════════════════════════════════════════════════════
            2. GETTING STARTED
            ══════════════════════════════════════════════════════════════ */}
        <Section id="getting-started" title="Getting Started">
          <p className="text-gray-700 mb-4">
            This section walks you through the complete workflow from first login to running your first evaluation.
            Follow these steps in order to get a character fully set up and ready for governance.
          </p>

          <SubSection id="gs-first-login" title="Step 1: First Login">
            <p className="text-gray-700 mb-3">
              Log in with the credentials provided by your administrator. After authentication, you'll land on the
              <strong> Dashboard</strong>, which shows system-wide statistics and recent activity.
            </p>
            <StepByStep steps={[
              'Navigate to the CanonSafe login page and enter your email and password.',
              'After login, you\'ll see the Dashboard with stat cards for characters, franchises, evaluations, and critics.',
              'Check the sidebar navigation to familiarize yourself with the available pages.',
              'Note your role (admin, editor, viewer) shown in Settings — this determines what you can create or modify.',
            ]} />
            <Tip>
              If you're an admin, your first task should be creating a Franchise to organize your characters under.
              If characters already exist, explore the Dashboard to understand the current state of the system.
            </Tip>
          </SubSection>

          <SubSection id="gs-create-character" title="Step 2: Creating Your First Character">
            <p className="text-gray-700 mb-3">
              Characters are the core entity in CanonSafe. Each character needs a name, a URL-friendly slug, and
              optionally a description and franchise assignment.
            </p>
            <StepByStep steps={[
              'Navigate to Characters in the sidebar.',
              'Click "New Character" in the top right.',
              'Enter the character name (e.g., "Peppa Pig"), a slug (e.g., "peppa-pig"), and a description.',
              'Click "Create" — the character card appears in the grid.',
              'Click the character card to open the Character Workspace.',
            ]} />
            <InfoCard title="Naming Conventions" color="gray">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Name</strong> — the display name, exactly as it should appear everywhere (e.g., "Peppa Pig")</li>
                <li><strong>Slug</strong> — a URL-safe identifier, lowercase with hyphens (e.g., "peppa-pig"). Must be unique within your organization.</li>
                <li><strong>Description</strong> — a brief summary for context. This is not used in evaluation — the 5-Pack system handles that.</li>
              </ul>
            </InfoCard>
            <Tip>
              If you have characters that are the primary focus of your governance work, toggle the <strong>Main</strong> checkbox
              on their card. Main characters always appear first in all dropdown menus and the character grid, making them
              easier to find. Use <strong>Focus</strong> for characters you're currently working on improving.
            </Tip>
          </SubSection>

          <SubSection id="gs-build-card" title="Step 3: Building the Character Card (5-Pack System)">
            <p className="text-gray-700 mb-3">
              After creating a character, you need to populate its identity via the 5-Pack system. Each pack
              captures a different dimension of the character's identity. The more thorough your packs, the better
              CanonSafe's critics can evaluate content.
            </p>
            <StepByStep steps={[
              'Open the Character Workspace by clicking a character card.',
              'You\'ll see five tabs: Canon, Legal, Safety, Visual Identity, and Audio Identity.',
              'Start with the Canon Pack — this is the most important pack for evaluation quality.',
              'Enter structured JSON data for each field (personality, backstory, speech patterns, relationships).',
              'Move through each pack tab, filling in all relevant information.',
              'When satisfied, click "Publish Version" to create an immutable snapshot.',
              'The published version becomes the active version used for all evaluations.',
            ]} />
            <Warning>
              Published versions are immutable. If you need to make changes, edit the current draft and publish a new version.
              The previous version is preserved in the version history for audit purposes. Never delete character history — it's
              essential for understanding how evaluation results change over time.
            </Warning>
          </SubSection>

          <SubSection id="gs-first-eval" title="Step 4: Running Your First Evaluation">
            <p className="text-gray-700 mb-3">
              With a character card built and published, you can now evaluate content against it. Navigate to the
              Evaluations page to submit content for scoring.
            </p>
            <StepByStep steps={[
              'Navigate to Evaluations in the sidebar.',
              'Click "New Evaluation" to open the evaluation form.',
              'Select your character from the dropdown (Main characters appear at the top).',
              'Choose the modality (text, image, audio, or video) — start with text.',
              'Optionally specify a territory (e.g., "US") for consent checking.',
              'Paste or type the AI-generated content to evaluate.',
              'Click "Run Evaluation" — results appear immediately above the history table.',
            ]} />
            <InfoCard title="What to Evaluate" color="blue">
              Evaluate any content that an AI system generates featuring your character. This includes:
              dialogue lines, story passages, character descriptions, image prompts, image captions, audio scripts,
              video scripts, social media posts, marketing copy, educational material, or any other content where
              the character appears or is referenced.
            </InfoCard>
          </SubSection>

          <SubSection id="gs-reading-results" title="Step 5: Understanding Evaluation Results">
            <p className="text-gray-700 mb-3">
              Every evaluation produces a detailed result with multiple data points. Here's how to read them:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <InfoCard title="Overall Score" color="blue">
                A weighted average of all critic scores, from 0 to 100. This is the primary metric. Scores above 90
                generally pass, 70-89 need regeneration, below 70 require human review.
              </InfoCard>
              <InfoCard title="Decision" color="green">
                The automated decision: pass, regenerate, quarantine, escalate, or block. Based on the overall score
                plus any flag-based overrides from individual critics.
              </InfoCard>
              <InfoCard title="Brand Analysis" color="purple">
                An AI-synthesized analysis that translates raw critic scores into actionable insights. Contains four sections:
                <strong> What Works</strong> (strengths with green checkmarks), <strong>What Is Off or Risky</strong> (issues
                with severity badges), a <strong>Strategic Recommendation</strong>, and optionally a
                <strong> Suggested Improved Version</strong> of the content that fixes identified issues.
              </InfoCard>
              <InfoCard title="Critic Scores (Expandable)" color="indigo">
                Individual scores from each configured critic (Canon Fidelity, Voice Consistency, Safety, etc.).
                Visualized as colored bars — green (90+), yellow (70-89), orange (50-69), red (below 50).
                <strong> Click any critic bar to expand</strong> its full LLM reasoning text underneath.
              </InfoCard>
              <InfoCard title="Flags & Recommendations" color="orange">
                Specific issues flagged by critics (e.g., "out-of-character dialogue", "age-inappropriate content")
                and actionable recommendations for improvement. Share these with the AI engineering team.
              </InfoCard>
              <InfoCard title="C2PA Content Credentials" color="gray">
                Collapsible provenance metadata embedded in the evaluation record. Includes CanonSafe version,
                evaluation run ID, overall score, decision, character ID, and timestamp. Used for tamper-evident
                audit trails that travel with the content downstream.
              </InfoCard>
            </div>
            <Tip>
              Click any row in the evaluation history table to expand its full details. Click any critic score bar
              to reveal the detailed LLM reasoning behind that score. The Brand Analysis section provides the
              most value for demos and stakeholder communication — it translates numbers into narrative.
            </Tip>
          </SubSection>
        </Section>

        {/* ══════════════════════════════════════════════════════════════
            3. CORE CONCEPTS
            ══════════════════════════════════════════════════════════════ */}
        <Section id="core-concepts" title="Core Concepts">

          <SubSection id="character-cards" title="Character Cards">
            <p className="text-gray-700 mb-3">
              A <strong>Character Card</strong> is the master identity document for a fictional character. It is
              immutably versioned — every change creates a new version, preserving full audit history. Each card
              belongs to an organization and optionally to a franchise.
            </p>
            <p className="text-gray-700 mb-3">
              Cards have three lifecycle states:
            </p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <InfoCard title="Draft" color="yellow">
                Initial state. The character is being set up. Can be edited freely. Not used for production evaluation.
              </InfoCard>
              <InfoCard title="Active" color="green">
                Published and in use. The character's active version is used by all evaluations. This is the production state.
              </InfoCard>
              <InfoCard title="Archived" color="gray">
                Retired from active use. Historical data is preserved. Can be reactivated if needed.
              </InfoCard>
            </div>
            <p className="text-gray-700 mb-3">
              Each character card can have multiple versions. Only one version is "active" at a time — this is the
              version that critics use when evaluating content. When you publish a new version, it automatically
              becomes the active version. Previous versions are preserved and can be referenced to understand how
              the character identity has evolved.
            </p>
          </SubSection>

          <SubSection id="five-pack" title="The 5-Pack System">
            <p className="text-gray-700 mb-4">
              Every Character Card version contains five structured data packs that fully define the character's identity.
              Together, these five packs give critics the context they need to evaluate content accurately.
            </p>
            <div className="space-y-3 mb-4">
              <InfoCard title="1. Canon Pack — Who is this character?" color="blue">
                <p className="mb-2">The most important pack. Contains everything that defines the character's personality and story:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Personality traits</strong> — core character attributes (cheerful, curious, bossy, kind)</li>
                  <li><strong>Backstory</strong> — origin story, family history, key life events</li>
                  <li><strong>Speech patterns</strong> — how the character talks (vocabulary level, catchphrases, sentence structure)</li>
                  <li><strong>Relationships</strong> — connections to other characters with relationship types and dynamics</li>
                  <li><strong>Canonical facts</strong> — things that are definitively true (age, species, home, favorite activities)</li>
                  <li><strong>Anti-canon</strong> — things the character would NEVER do or say (critical for safety)</li>
                </ul>
              </InfoCard>
              <InfoCard title="2. Legal Pack — What are the IP rules?" color="purple">
                <p className="mb-2">Governs the legal boundaries of character use:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Rights holder</strong> — who owns the IP and contact information</li>
                  <li><strong>Performer consent</strong> — voice actors, motion capture artists, likeness rights</li>
                  <li><strong>Territory restrictions</strong> — where the character can be used (US, EU, APAC, etc.)</li>
                  <li><strong>Usage rights</strong> — what kinds of content are permitted (commercial, educational, etc.)</li>
                  <li><strong>Derivative work policies</strong> — rules about modified versions of the character</li>
                </ul>
              </InfoCard>
              <InfoCard title="3. Safety Pack — What are the guardrails?" color="red">
                <p className="mb-2">Defines content safety boundaries:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Prohibited topics</strong> — subjects the character must never engage with, with severity levels</li>
                  <li><strong>Content rating</strong> — target audience age rating (G, PG, PG-13, etc.)</li>
                  <li><strong>Age-gating</strong> — specific content restrictions based on target audience</li>
                  <li><strong>Required disclosures</strong> — mandatory labels or warnings</li>
                  <li><strong>Brand-safety rules</strong> — content that would damage the brand even if technically "safe"</li>
                </ul>
              </InfoCard>
              <InfoCard title="4. Visual Identity Pack — What does the character look like?" color="green">
                <p className="mb-2">Controls visual representation:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Art style</strong> — official art style and acceptable variations</li>
                  <li><strong>Color palette</strong> — exact colors for the character (hex codes, Pantone references)</li>
                  <li><strong>Physical features</strong> — species, body shape, distinguishing marks, clothing</li>
                  <li><strong>Style guide references</strong> — links to official style documentation</li>
                  <li><strong>Prohibited depictions</strong> — visual representations that are never acceptable</li>
                </ul>
              </InfoCard>
              <InfoCard title="5. Audio Identity Pack — What does the character sound like?" color="orange">
                <p className="mb-2">Defines sonic identity:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Voice characteristics</strong> — pitch, tone, accent, speaking speed</li>
                  <li><strong>Emotional range</strong> — what emotions the character expresses and how</li>
                  <li><strong>Catchphrases</strong> — signature phrases and how frequently they should appear</li>
                  <li><strong>Music themes</strong> — associated music, jingles, or sound effects</li>
                  <li><strong>Sound design guidelines</strong> — audio branding rules</li>
                </ul>
              </InfoCard>
            </div>
          </SubSection>

          <SubSection id="critics" title="Critics">
            <p className="text-gray-700 mb-3">
              A <strong>Critic</strong> is an LLM-based evaluation module. Each critic has a prompt template,
              a scoring rubric with weighted dimensions, and a category (canon, voice, safety, legal, visual, audio, or cross-modal).
              Critics are the engines that actually analyze content against the character card.
            </p>
            <p className="text-gray-700 mb-3">
              Critics are reusable and configurable. The same critic can have different weight overrides, threshold
              overrides, and extra instructions per organization, franchise, or individual character via
              <strong> Critic Configurations</strong>. This means you can use the same "Voice Consistency" critic
              across all characters but tune it to be stricter for main characters.
            </p>
            <InfoCard title="Built-in Critics" color="gray">
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Canon Fidelity</strong> — Checks fact accuracy, relationship accuracy, and personality consistency.
                  Compares content against the Canon Pack. Flags contradictions, out-of-character behavior, and factual errors.</li>
                <li><strong>Voice Consistency</strong> — Evaluates tone match, vocabulary level, catchphrase usage, and speech patterns.
                  Compares against the Canon Pack's speech patterns and the Audio Identity Pack's voice characteristics.</li>
                <li><strong>Safety &amp; Brand</strong> — Checks for prohibited topic avoidance, age appropriateness, and brand alignment.
                  Compares against the Safety Pack. This is often used as a rapid-screen critic for tiered evaluation.</li>
                <li><strong>Relationship Accuracy</strong> — Verifies correct relationship types and dynamics between characters.
                  Critical for multi-character interactions.</li>
                <li><strong>Legal Compliance</strong> — Checks consent compliance, territory restrictions, and usage rights.
                  Compares against the Legal Pack. Triggers hard blocks on consent violations.</li>
              </ul>
            </InfoCard>
            <Tip>
              You can create custom critics for specialized evaluation needs. For example, a "Cultural Sensitivity" critic
              for international content, or a "Merchandise Suitability" critic for products featuring the character.
              Custom critics use the same prompt template and rubric system as built-in critics.
            </Tip>
          </SubSection>

          <SubSection id="eval-profiles" title="Evaluation Profiles">
            <p className="text-gray-700 mb-3">
              An <strong>Evaluation Profile</strong> is a named collection of critic configurations that defines
              how evaluation runs are executed. Profiles allow you to create different evaluation strategies
              for different scenarios.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <InfoCard title="Sampling Rate" color="blue">
                Controls what percentage of content gets evaluated (0.0 to 1.0). At 1.0, every piece of content
                is evaluated. At 0.1, only 10% of content is randomly selected. Use lower rates for high-volume
                production pipelines where evaluating everything would be too expensive.
              </InfoCard>
              <InfoCard title="Tiered Evaluation" color="purple">
                When enabled, content first passes through rapid screen critics (typically just safety). Content that
                fails the rapid screen is immediately rejected without running the full critic battery, saving cost.
                Content that passes gets the full deep evaluation.
              </InfoCard>
            </div>
            <InfoCard title="When to Use Different Profiles" color="gray">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Development</strong> — 100% sampling, all critics, full evaluation. Catch everything while building.</li>
                <li><strong>Staging</strong> — 100% sampling, tiered evaluation. Test the tiered flow before production.</li>
                <li><strong>Production (low volume)</strong> — 100% sampling, tiered evaluation. Evaluate everything efficiently.</li>
                <li><strong>Production (high volume)</strong> — 10-50% sampling, tiered evaluation. Balance cost with coverage.</li>
                <li><strong>Certification testing</strong> — 100% sampling, all critics, strictest thresholds.</li>
              </ul>
            </InfoCard>
          </SubSection>

          <SubSection id="main-focus" title="Main & Focus Characters">
            <p className="text-gray-700 mb-3">
              CanonSafe supports two priority levels for characters to help you organize your workflow:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <InfoCard title="Main Characters" color="yellow">
                Core characters that are always front and center. These appear first in all character dropdowns
                and at the top of the Characters page. Toggle the "Main" checkbox on any character card.
                Typically your 3-5 most important characters (e.g., Peppa, George, Mummy, Daddy, Suzy).
              </InfoCard>
              <InfoCard title="Focus Characters" color="blue">
                Characters you're currently working on improving. Maybe they have low evaluation scores, or you're
                building out their packs. Toggle the "Focus" checkbox. These appear after Main characters in
                dropdowns and get their own section on the Characters page.
              </InfoCard>
            </div>
            <p className="text-gray-700 mb-3">
              All character dropdown menus across the platform (Evaluations, Test Suites, Certifications, APM)
              use grouped sections: Main Characters, Focus Characters, and Other Characters. This makes it fast
              to find the character you need, even when managing dozens of characters.
            </p>
          </SubSection>
        </Section>

        {/* ══════════════════════════════════════════════════════════════
            4. EVALUATION PIPELINE
            ══════════════════════════════════════════════════════════════ */}
        <Section id="eval-pipeline" title="Evaluation Pipeline">

          <SubSection id="pipeline-steps" title="The 6-Step Pipeline">
            <p className="text-gray-700 mb-6">
              Every piece of AI-generated character content passes through a six-step evaluation pipeline.
              Understanding this pipeline is essential for interpreting results and configuring the system.
            </p>
            <div className="bg-gray-50 rounded-xl p-6 mb-4">
              <PipelineStep number={1} title="Consent Verification (Hard Gate)" color="red"
                description="Checks that valid performer consent exists for the character, modality, and territory. If consent is missing or expired, evaluation is blocked immediately — no content passes without consent. This is a legal requirement and cannot be overridden by score." />
              <PipelineStep number={2} title="Statistical Sampling" color="yellow"
                description="Based on the evaluation profile's sampling rate, determines whether this content is selected for evaluation. At 100% sampling, every piece of content is evaluated. Non-sampled content receives a 'sampled-pass' decision — it was not evaluated but was allowed through." />
              <PipelineStep number={3} title="Tiered Evaluation (Rapid Screen)" color="blue"
                description="If tiered evaluation is enabled, content first passes through rapid screen critics (typically safety only). Content that fails the rapid screen is immediately rejected without running the full battery. This saves cost on obviously problematic content." />
              <PipelineStep number={4} title="Parallel Critic Scoring" color="purple"
                description="All configured critics evaluate the content in parallel. Each critic receives the content plus the relevant character card packs as context, then produces a score (0-100), reasoning text, and optional flags. Critics run independently and do not influence each other." />
              <PipelineStep number={5} title="Decision Engine" color="green"
                description="The weighted average of all critic scores determines the overall score. Score thresholds map to decisions: Pass (>=90), Regenerate (70-89), Quarantine (50-69), Escalate (30-49), Block (<30). Critical flags from individual critics can override the score-based decision downward." />
              <PipelineStep number={6} title="C2PA Metadata Embedding" color="orange"
                description="The evaluation result, decision, and provenance chain are embedded as C2PA metadata in the content. This creates a tamper-evident record of the governance decision that travels with the content downstream." />
            </div>
          </SubSection>

          <SubSection id="pipeline-scoring" title="How Scoring Works">
            <p className="text-gray-700 mb-3">
              The overall score is a weighted average of all active critic scores. Each critic has a default weight (usually 1.0),
              which can be overridden via critic configurations. The formula is:
            </p>
            <CodeBlock title="Scoring Formula">
{`overall_score = sum(critic_score * critic_weight) / sum(critic_weight)

Example with 3 critics:
  Canon Fidelity:      score=95, weight=1.5  → 142.5
  Voice Consistency:   score=88, weight=1.0  → 88.0
  Safety & Brand:      score=92, weight=2.0  → 184.0

  Total weighted:    142.5 + 88.0 + 184.0 = 414.5
  Total weight:      1.5 + 1.0 + 2.0 = 4.5
  Overall score:     414.5 / 4.5 = 92.1 → PASS`}
            </CodeBlock>
            <Tip>
              Higher weights mean that critic has more influence on the final score. A common configuration is to
              give Safety a weight of 2.0 so that safety violations have outsized impact on the overall score,
              ensuring unsafe content is more likely to be caught even if other critics score it highly.
            </Tip>
          </SubSection>

          <SubSection id="pipeline-flags" title="Flags & Overrides">
            <p className="text-gray-700 mb-3">
              Individual critics can flag specific issues they detect during evaluation. Flags are categorized by severity
              and can trigger decision overrides regardless of the overall score.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <InfoCard title="Info Flags" color="blue">
                Informational only. Do not affect the decision. Used for notes like "character uses modern slang
                that may not be canonical" or "content is borderline but acceptable."
              </InfoCard>
              <InfoCard title="Warning Flags" color="yellow">
                May trigger a downgrade. A pass can become a regenerate. Used for issues that aren't critical but
                should be addressed, like minor voice inconsistencies.
              </InfoCard>
              <InfoCard title="Critical Flags" color="red">
                Force an immediate block or escalate, regardless of score. Used for hard violations like consent
                failures, prohibited content, or trademark misuse. Even a score of 100 will be blocked if a
                critical flag is raised.
              </InfoCard>
            </div>
          </SubSection>
        </Section>

        {/* ══════════════════════════════════════════════════════════════
            5. FEATURE GUIDE
            ══════════════════════════════════════════════════════════════ */}
        <Section id="feature-guide" title="Feature Guide">
          <p className="text-gray-700 mb-4">
            Detailed guide to every page and feature in the CanonSafe platform. Use this as a reference when
            you need to understand what a specific page does and how to use it effectively.
          </p>

          <SubSection id="feat-dashboard" title="Dashboard">
            <p className="text-gray-700 mb-3">
              The Dashboard is your home base. It provides a system-wide overview with four stat cards showing
              total characters, franchises, evaluation runs, and active critics. Below the stats, recent activity
              is displayed showing the latest evaluations and character updates.
            </p>
            <InfoCard title="What to Look For" color="blue">
              <ul className="list-disc list-inside space-y-1">
                <li>Sudden drops in evaluation counts may indicate pipeline issues</li>
                <li>The "recent characters" section shows main characters first — check their status</li>
                <li>Use the Dashboard as a daily check to ensure the system is functioning normally</li>
              </ul>
            </InfoCard>
          </SubSection>

          <SubSection id="feat-characters" title="Characters">
            <p className="text-gray-700 mb-3">
              The Characters page is the central hub for managing all character cards. Characters are displayed
              in a grid layout organized into three sections: <strong>Main Characters</strong> (yellow header),
              <strong> Focus Characters</strong> (blue header), and <strong>All Characters</strong>.
            </p>
            <InfoCard title="Key Actions" color="gray">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Create</strong> — click "New Character", fill in name/slug/description, submit</li>
                <li><strong>Toggle Main</strong> — check the "Main" checkbox in the card footer to mark as a main character</li>
                <li><strong>Toggle Focus</strong> — check the "Focus" checkbox to mark as a focus character</li>
                <li><strong>Open Workspace</strong> — click anywhere on the card (except the checkboxes) to open the 5-Pack editor</li>
              </ul>
            </InfoCard>
            <p className="text-gray-700 mb-3">
              Each card shows the character name, status badge (draft/active/archived), franchise name,
              active version number, and Main/Focus badges. The colored avatar circle uses the character's first letter.
            </p>
          </SubSection>

          <SubSection id="feat-workspace" title="Character Workspace (5-Pack Editor)">
            <p className="text-gray-700 mb-3">
              The Workspace is the primary editing interface for a character's identity. It features a tabbed editor
              with one tab per pack. Each pack is editable as structured JSON with syntax highlighting.
            </p>
            <StepByStep steps={[
              'Click on a character card to open its Workspace.',
              'Select a pack tab (Canon, Legal, Safety, Visual Identity, Audio Identity).',
              'Edit the JSON content for that pack. The editor validates JSON syntax as you type.',
              'Switch between tabs — your changes are preserved as you navigate.',
              'When all packs are ready, click "Publish Version" to create an immutable snapshot.',
              'The new version is automatically set as the active version for evaluations.',
              'View the version history panel to see all past versions and their changelogs.',
            ]} />
            <Warning>
              Always write meaningful changelogs when publishing versions. A good changelog like "Added muddy puddles
              catchphrase to Canon Pack, restricted violence references in Safety Pack" is invaluable when investigating
              why evaluation scores changed after a version update.
            </Warning>
          </SubSection>

          <SubSection id="feat-franchises" title="Franchises">
            <p className="text-gray-700 mb-3">
              Franchises group related characters under a single IP umbrella. For example, the "Peppa Pig" franchise
              contains Peppa, George, Mummy Pig, Daddy Pig, Suzy Sheep, and all other characters from the show.
              Franchises have settings including rights holder information, content rating, and age recommendations.
            </p>
            <InfoCard title="Why Use Franchises" color="blue">
              <ul className="list-disc list-inside space-y-1">
                <li>Aggregate evaluation metrics across all characters in the franchise</li>
                <li>Apply taxonomy tags that propagate to all characters in the franchise</li>
                <li>Set franchise-wide evaluation policies and critic configurations</li>
                <li>Track cross-character consistency and world-building consistency</li>
                <li>Manage franchise health with dedicated health monitoring pages</li>
              </ul>
            </InfoCard>
          </SubSection>

          <SubSection id="feat-health" title="Franchise Health">
            <p className="text-gray-700 mb-3">
              Franchise Health provides aggregated evaluation metrics across all characters in a franchise. This
              is the go-to page for understanding overall franchise performance.
            </p>
            <InfoCard title="Health Metrics" color="green">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Total Evaluations</strong> — how many evaluations ran across all franchise characters</li>
                <li><strong>Average Score</strong> — mean evaluation score across all franchise evaluations</li>
                <li><strong>Pass Rate</strong> — percentage of evaluations that received a "pass" decision</li>
                <li><strong>Cross-Character Consistency</strong> — how similarly characters behave when interacting</li>
                <li><strong>World-Building Consistency</strong> — whether the franchise's shared world is portrayed consistently</li>
                <li><strong>Health Score</strong> — composite metric combining all above factors</li>
              </ul>
            </InfoCard>
          </SubSection>

          <SubSection id="feat-critics" title="Critics & Profiles">
            <p className="text-gray-700 mb-3">
              This page has two tabs. The <strong>Critics</strong> tab lists all evaluation modules — both built-in
              system critics and custom critics you've created. The <strong>Evaluation Profiles</strong> tab
              manages named collections of critic configurations.
            </p>
            <StepByStep steps={[
              'On the Critics tab, review the built-in critics to understand what each evaluates.',
              'Create custom critics by providing a name, prompt template, rubric, and category.',
              'On the Profiles tab, create evaluation profiles that combine specific critics with weights.',
              'Configure sampling rates and tiered evaluation settings per profile.',
              'Assign profiles to specific use cases (development, staging, production).',
            ]} />
          </SubSection>

          <SubSection id="feat-evaluations" title="Evaluations">
            <p className="text-gray-700 mb-3">
              The Evaluations page is the operational center for running and reviewing evaluations. It has three
              sections: the evaluation form (top), the current result (middle), and the history table (bottom).
            </p>
            <InfoCard title="Running an Evaluation" color="blue">
              <ul className="list-disc list-inside space-y-1">
                <li>Click "New Evaluation" to open the form</li>
                <li>Select a character (Main characters appear first, then Focus, then Others)</li>
                <li>Choose modality (text, image, audio, video) and optionally specify a territory</li>
                <li>Paste the AI-generated content and click "Run Evaluation"</li>
                <li>Results appear immediately above the history table with full detail</li>
              </ul>
            </InfoCard>
            <InfoCard title="Brand Analysis" color="purple">
              Every new evaluation generates an AI-synthesized Brand Analysis that combines all critic feedback
              into a structured, human-readable report. This section appears between the flags and critic scores:
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li><strong>What Works</strong> — strengths identified across critics, shown with green checkmarks</li>
                <li><strong>What Is Off or Risky</strong> — issues with severity badges (low/medium/high)</li>
                <li><strong>Strategic Recommendation</strong> — a one-paragraph actionable summary</li>
                <li><strong>Suggested Improved Version</strong> — a rewritten version of the content that fixes identified issues (only shown when issues exist)</li>
              </ul>
              <p className="mt-2 text-xs">Note: Evaluations run before this feature was added will not show the Brand Analysis section.</p>
            </InfoCard>
            <InfoCard title="Expandable Critic Reasoning" color="indigo">
              Each critic score bar is clickable. Click a critic to expand its full LLM reasoning text —
              the detailed explanation of why the critic assigned that score, what it found in the content,
              and what specific aspects of the character card it compared against. Click again to collapse.
            </InfoCard>
            <InfoCard title="Reading the History Table" color="gray">
              <ul className="list-disc list-inside space-y-1">
                <li>Scores are color-coded: green (90+), yellow (70-89), orange (50-69), red (below 50)</li>
                <li>Click any row to expand the full evaluation detail with critic breakdown</li>
                <li>The "Decision" column shows the outcome as a colored badge</li>
                <li>Use "Agent" column to filter by which AI system produced the content</li>
                <li>Export evaluations as CSV using the "Export CSV" button</li>
              </ul>
            </InfoCard>
          </SubSection>

          <SubSection id="feat-test-suites" title="Test Suites">
            <p className="text-gray-700 mb-3">
              Test Suites are structured collections of test cases used to validate that an AI agent can produce
              quality content for a specific character. Each suite targets a character, has a tier (Base or
              CanonSafe Certified), and a passing threshold score.
            </p>
            <StepByStep steps={[
              'Click "New Suite" and select a character, tier, and passing threshold.',
              'Click on a suite to expand it and see its test cases.',
              'Click "Add Case" to add test cases with input prompts and expected outcomes.',
              'Edit existing cases inline — click "Edit" next to any case.',
              'Tag test cases for organization (e.g., "core", "voice", "safety", "edge-case").',
              'Use suites for Agent Certification (see next section).',
            ]} />
            <InfoCard title="Writing Good Test Cases" color="blue">
              <ul className="list-disc list-inside space-y-1">
                <li>Cover the character's core traits (what they SHOULD do)</li>
                <li>Include negative cases (what they should NOT do)</li>
                <li>Test edge cases and boundary scenarios</li>
                <li>Set realistic expected outcomes — not everything needs to be 100%</li>
                <li>Use tags to organize cases by category</li>
              </ul>
            </InfoCard>
          </SubSection>

          <SubSection id="feat-certifications" title="Agent Certification (Page)">
            <p className="text-gray-700 mb-3">
              The Certifications page shows all agent certifications with their status, scores, and details.
              Summary stat cards at the top show total certifications, pass/fail counts, and unique agents tested.
              Use filters to narrow by agent or status.
            </p>
            <InfoCard title="Page Features" color="gray">
              <ul className="list-disc list-inside space-y-1">
                <li>Click any certification card to expand critic breakdown and case results</li>
                <li>Use "Edit Status" to manually update certification status or score</li>
                <li>"Certify Agent" opens the form to run a new certification against a test suite</li>
                <li>Expired certifications show a red "EXPIRED" label</li>
                <li>Filter by agent ID to see all certifications for a specific AI system</li>
              </ul>
            </InfoCard>
          </SubSection>

          <SubSection id="feat-taxonomy" title="Taxonomy">
            <p className="text-gray-700 mb-3">
              The Taxonomy page provides a structured classification system for evaluation rules and content policies.
              It uses a two-panel layout: categories on the left, tags on the right. Click a category to filter
              its tags. Both categories and tags are fully editable with inline editing, creating, and deleting.
            </p>
            <StepByStep steps={[
              'Create categories to organize your evaluation rules (e.g., "Content Safety", "Character Fidelity").',
              'Click a category to filter the tags panel to show only that category\'s tags.',
              'Add tags within categories — each tag defines a specific rule with severity level.',
              'Set applicable modalities for each tag (text, image, audio, video).',
              'Enable "Propagate to franchise" to apply the tag across all characters in a franchise.',
              'Edit evaluation rules (JSON) to define automated enforcement actions.',
              'Click any tag to expand and see all its details, then use Edit/Delete buttons.',
            ]} />
          </SubSection>

          <SubSection id="feat-exemplars" title="Exemplars">
            <p className="text-gray-700 mb-3">
              The Exemplar Library stores high-quality, approved character content as reference examples. Exemplars
              are organized by character and can be filtered by modality, minimum score, and character. Each exemplar
              card is expandable with full content view, editing, and deletion.
            </p>
            <StepByStep steps={[
              'Use filters at the top to narrow by character, modality, or minimum score.',
              'Click any exemplar card to expand its full content (prompt, response, metadata).',
              'Use "Add Exemplar" to manually add a high-quality example with prompt/response and score.',
              'Click "Edit" in the expanded view to modify content, tags, or scores.',
              'Delete exemplars that no longer represent the character\'s current identity.',
            ]} />
            <Tip>
              Exemplars with scores above 95 are automatically created when evaluations score that high (auto-promotion).
              These auto-promoted exemplars are tagged "auto-promoted" so you can distinguish them from manually curated ones.
            </Tip>
          </SubSection>

          <SubSection id="feat-improvement" title="Improvement">
            <p className="text-gray-700 mb-3">
              The Improvement page surfaces two types of insights to help you systematically improve character governance:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <InfoCard title="Failure Patterns" color="red">
                <p className="mb-1">Recurring issues detected across evaluations:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Recurring Low Score</strong> — a critic consistently scores below threshold</li>
                  <li><strong>Boundary Violation</strong> — content crosses character boundaries</li>
                  <li><strong>Drift</strong> — gradual deviation from baseline behavior</li>
                </ul>
                <p className="mt-1">Each pattern includes frequency, severity, and a suggested fix.</p>
              </InfoCard>
              <InfoCard title="Improvement Trajectories" color="green">
                <p className="mb-1">Metric trends over time for a character or franchise:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Track specific metrics with timestamped data points</li>
                  <li>Trends classified as improving, stable, or degrading</li>
                  <li>Verify that card updates or critic tuning actually improved scores</li>
                </ul>
              </InfoCard>
            </div>
          </SubSection>

          <SubSection id="feat-apm" title="APM (Agentic Pipeline Middleware)">
            <p className="text-gray-700 mb-3">
              APM provides the programmatic interface for integrating CanonSafe into AI agent pipelines.
              The two-column interface lets you test the <strong>Evaluate</strong> endpoint (submit content
              for scoring) and the <strong>Enforce</strong> endpoint (apply decisions to content).
            </p>
            <InfoCard title="Using the APM Page" color="blue">
              <ul className="list-disc list-inside space-y-1">
                <li>Left column: select a character, enter agent ID, choose modality, type content, click "Evaluate"</li>
                <li>Right column: the evaluation result appears with score, decision, consent status, and flags</li>
                <li>The eval run ID auto-populates in the Enforce form so you can quickly test enforcement</li>
                <li>Choose an enforcement action (regenerate, quarantine, escalate, block, override) and click "Enforce"</li>
                <li>Use this page to test your API integration before deploying to production</li>
              </ul>
            </InfoCard>
          </SubSection>

          <SubSection id="feat-compare" title="Compare">
            <p className="text-gray-700 mb-3">
              The Compare page enables pairwise comparison of evaluation results across three modes:
            </p>
            <InfoCard title="Compare Two Runs" color="blue">
              Select two existing evaluation run IDs and compare them side-by-side. See score differences
              per critic, flag differences, and whether decisions match. Useful for comparing the same content
              evaluated at different times or with different profiles.
            </InfoCard>
            <InfoCard title="Head-to-Head Characters" color="green">
              Submit the same content and evaluate it against two different characters simultaneously.
              Reveals how content performs across characters — for example, the same dialogue may pass for
              one character but fail for another.
            </InfoCard>
            <InfoCard title="Version Comparison" color="purple">
              Evaluate the same content against two different card versions of the same character.
              Shows exactly how card changes affect evaluation outcomes — essential for validating
              card improvements before publishing.
            </InfoCard>
          </SubSection>

          <SubSection id="feat-reviews" title="Review Queue">
            <p className="text-gray-700 mb-3">
              The Review Queue is the human-in-the-loop (HITL) interface where reviewers examine flagged content.
              Evaluations that receive "quarantine" or "escalate" decisions are automatically queued here.
            </p>
            <InfoCard title="Review Workflow" color="yellow">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Claim</strong> — assign a pending review item to yourself</li>
                <li><strong>Examine</strong> — view the full evaluation detail, critic scores, and reasoning</li>
                <li><strong>Resolve</strong> — approve the original decision, override it (e.g., upgrade "quarantine" to "pass"), or send for re-evaluation</li>
                <li>All resolutions require justification and are logged with a full audit trail</li>
              </ul>
            </InfoCard>
          </SubSection>

          <SubSection id="feat-drift" title="Drift Monitor">
            <p className="text-gray-700 mb-3">
              Drift Monitor tracks whether evaluation scores are gradually deviating from established baselines.
              Drift often indicates that the AI model being evaluated has changed behavior over time.
            </p>
            <InfoCard title="How Drift Detection Works" color="orange">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Baselines</strong> — establish a normal scoring range per character + critic combination</li>
                <li><strong>Z-scores</strong> — new evaluations are compared against baseline mean and standard deviation</li>
                <li><strong>Severity levels</strong> — info (z&lt;1), warning (1-2), high (2-3), critical (z&gt;=3)</li>
                <li>Drift events are logged and can be acknowledged once investigated</li>
              </ul>
            </InfoCard>
          </SubSection>

          <SubSection id="feat-redteam" title="Red Team">
            <p className="text-gray-700 mb-3">
              The Red Team page runs adversarial robustness testing against characters. It generates attack
              probes designed to break character, extract knowledge, or bypass safety guardrails.
            </p>
            <InfoCard title="Attack Categories" color="red">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Persona Break</strong> — attempts to make the character act out of character</li>
                <li><strong>Knowledge Probe</strong> — tries to extract information the character shouldn't know</li>
                <li><strong>Safety Bypass</strong> — attempts to generate prohibited content</li>
                <li><strong>Boundary Test</strong> — pushes edge cases in content guidelines</li>
                <li><strong>Context Manipulation</strong> — uses misleading context to alter character behavior</li>
              </ul>
            </InfoCard>
            <InfoCard title="Resilience Score" color="gray">
              After a session completes, a resilience score is calculated: 1.0 minus (successful attacks / total probes).
              A score of 1.0 means the character withstood all adversarial probes. Lower scores indicate areas
              where the character card or critics need strengthening.
            </InfoCard>
          </SubSection>

          <SubSection id="feat-abtesting" title="A/B Testing">
            <p className="text-gray-700 mb-3">
              The A/B Testing page creates experiments that compare two evaluation configurations with
              statistical rigor. Use it to determine whether changing critic weights, prompt templates,
              or models actually improves evaluation quality.
            </p>
            <InfoCard title="Experiment Types" color="blue">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Critic Weight</strong> — compare different weight configurations</li>
                <li><strong>Prompt Template</strong> — test revised critic prompt templates</li>
                <li><strong>Model</strong> — compare LLM model performance (e.g., GPT-4o-mini vs Claude)</li>
                <li><strong>Profile</strong> — compare entire evaluation profiles end-to-end</li>
              </ul>
            </InfoCard>
            <InfoCard title="Statistical Analysis" color="green">
              Results include z-test for pass rate proportions and Welch's t-test for score means.
              The experiment reports a p-value and declares a winner when statistical significance is reached,
              or "inconclusive" when the sample size is insufficient.
            </InfoCard>
          </SubSection>

          <SubSection id="feat-judges" title="Judges">
            <p className="text-gray-700 mb-3">
              The Judges page is a registry for custom LLM judge models. While CanonSafe defaults to
              GPT-4o-mini with Anthropic fallback, you can register additional judge models for
              specialized evaluation needs.
            </p>
            <InfoCard title="Judge Properties" color="indigo">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Model Type</strong> — OpenAI-compatible, Anthropic, HuggingFace, or custom endpoint</li>
                <li><strong>Capabilities</strong> — which modalities the judge supports (text, image, audio, video)</li>
                <li><strong>Pricing</strong> — input/output cost per million tokens for cost tracking</li>
                <li><strong>Health Status</strong> — monitored automatically (healthy, degraded, down)</li>
              </ul>
            </InfoCard>
          </SubSection>

          <SubSection id="feat-multimodal" title="Multi-Modal Evaluation">
            <p className="text-gray-700 mb-3">
              The Multi-Modal page handles evaluation of non-text content: images, audio, and video.
              Each modality uses specialized evaluation pipelines.
            </p>
            <InfoCard title="Supported Modalities" color="purple">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Image</strong> — evaluated using GPT-4o vision against the Visual Identity Pack (art style, color palette, distinguishing features)</li>
                <li><strong>Audio</strong> — evaluated against the Audio Identity Pack (tone, speech style, catchphrases)</li>
                <li><strong>Video</strong> — combined visual + audio evaluation with frame-by-frame analysis</li>
              </ul>
            </InfoCard>
          </SubSection>

          <SubSection id="feat-consent" title="Consent">
            <p className="text-gray-700 mb-3">
              The Consent page manages performer consent verification records. Every evaluation checks
              consent as a hard gate — if valid consent doesn't exist, evaluation is blocked immediately.
            </p>
            <InfoCard title="Consent Checks" color="red">
              Five verification checks are performed:
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li><strong>Temporal</strong> — is the consent currently valid (not expired)?</li>
                <li><strong>Territorial</strong> — does consent cover the requested territory?</li>
                <li><strong>Modality</strong> — does consent cover the requested modality (text, image, audio, video)?</li>
                <li><strong>Usage</strong> — does the intended use fall within consent restrictions?</li>
                <li><strong>Strike</strong> — is there an active performer strike that suspends consent?</li>
              </ul>
            </InfoCard>
          </SubSection>

          <SubSection id="feat-settings" title="Settings">
            <p className="text-gray-700 mb-3">
              The Settings page displays your account information including email, full name, role, and organization.
              It also provides API documentation references and platform version details. Admin users can manage
              organization settings from this page.
            </p>
          </SubSection>
        </Section>

        {/* ══════════════════════════════════════════════════════════════
            6. DECISION CATEGORIES
            ══════════════════════════════════════════════════════════════ */}
        <Section id="decisions" title="Decision Categories">
          <p className="text-gray-700 mb-4">
            Every evaluation produces a decision based on the weighted average score. These five categories define
            the possible outcomes and their enforcement actions:
          </p>
          <div className="space-y-3">
            <InfoCard title="Pass" color="green">
              <div className="flex items-center justify-between mb-2">
                <span>Content approved for delivery. Meets all character identity and safety requirements.</span>
                <DecisionBadge label="Pass" color="green" range=">=90" />
              </div>
              <p className="text-xs text-green-700 mt-1">
                <strong>Action:</strong> Content is released to the end user. C2PA metadata is embedded with a "pass" record.
                No human review required. This is the ideal outcome.
              </p>
            </InfoCard>
            <InfoCard title="Regenerate" color="yellow">
              <div className="flex items-center justify-between mb-2">
                <span>Content has minor issues. Sent back to the agent for regeneration with critic feedback.</span>
                <DecisionBadge label="Regenerate" color="yellow" range="70-89" />
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                <strong>Action:</strong> Content is not delivered. The agent receives the evaluation feedback (flags, recommendations,
                critic scores) and should generate a new version. The regenerated content goes through evaluation again.
                Most agents improve on the second attempt.
              </p>
            </InfoCard>
            <InfoCard title="Quarantine" color="orange">
              <div className="flex items-center justify-between mb-2">
                <span>Content has significant issues. Held for manual review before any action.</span>
                <DecisionBadge label="Quarantine" color="orange" range="50-69" />
              </div>
              <p className="text-xs text-orange-700 mt-1">
                <strong>Action:</strong> Content is queued for human review. A content reviewer examines the evaluation results,
                checks the flags, and decides whether to approve (override), request regeneration, or escalate. Quarantined
                content never reaches users without human approval.
              </p>
            </InfoCard>
            <InfoCard title="Escalate" color="red">
              <div className="flex items-center justify-between mb-2">
                <span>Serious violations detected. Escalated to senior reviewers or legal team.</span>
                <DecisionBadge label="Escalate" color="red" range="30-49" />
              </div>
              <p className="text-xs text-red-700 mt-1">
                <strong>Action:</strong> Content is flagged for senior review, typically involving legal, compliance, or brand
                leadership. These are not routine issues — they represent potential IP violations, legal risks, or serious
                brand-safety concerns that require organizational decision-making.
              </p>
            </InfoCard>
            <InfoCard title="Block" color="red">
              <div className="flex items-center justify-between mb-2">
                <span>Critical violation. Content is permanently blocked and cannot be delivered.</span>
                <DecisionBadge label="Block" color="darkred" range="<30" />
              </div>
              <p className="text-xs text-red-700 mt-1">
                <strong>Action:</strong> Content is permanently blocked. Cannot be overridden without admin privileges.
                The block event is logged for audit purposes. Blocked content typically involves egregious safety violations,
                clear IP infringement, or consent failures. Investigation of the underlying cause should be immediate.
              </p>
            </InfoCard>
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════════════════
            7. AGENT CERTIFICATION
            ══════════════════════════════════════════════════════════════ */}
        <Section id="certification" title="Agent Certification">
          <p className="text-gray-700 mb-4">
            Agent Certification validates that an AI agent can reliably produce in-character content before it's
            allowed to generate content in production. Think of it as a quality gate for AI systems.
          </p>

          <SubSection id="cert-tiers" title="Certification Tiers">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <InfoCard title="Base Tier" color="blue">
                <p className="mb-2">Minimum viable certification. The agent must pass a core test suite covering:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Fundamental character traits and personality</li>
                  <li>Basic safety and content rating compliance</li>
                  <li>Key relationships portrayed correctly</li>
                  <li>No critical anti-canon violations</li>
                </ul>
                <p className="mt-2 font-medium">Typical threshold: 85-90%</p>
              </InfoCard>
              <InfoCard title="CanonSafe Certified Tier" color="purple">
                <p className="mb-2">Premium certification. Requires passing extended test suites including:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>All Base tier requirements</li>
                  <li>Voice consistency across diverse scenarios</li>
                  <li>Edge cases and adversarial prompts</li>
                  <li>Cross-character interaction accuracy</li>
                  <li>Cultural sensitivity and localization</li>
                </ul>
                <p className="mt-2 font-medium">Typical threshold: 90-95%</p>
              </InfoCard>
            </div>
          </SubSection>

          <SubSection id="cert-lifecycle" title="Certification Lifecycle">
            <InfoCard title="Status Flow" color="gray">
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Pending</strong> — certification requested, test suite execution in progress. The system is running
                  every test case in the suite against the agent and scoring the results.</li>
                <li><strong>Passed</strong> — agent met all thresholds. Certification granted. The agent is approved to generate
                  content for this character at this tier level.</li>
                <li><strong>Failed</strong> — agent did not meet thresholds. Results summary shows weakest areas (e.g., "voice
                  consistency scored 72, below 85 threshold"). The agent needs improvement before re-certification.</li>
                <li><strong>Expired</strong> — certifications are valid for 90 days. After expiration, the agent must re-certify.
                  This ensures that agent updates haven't degraded quality since the last certification.</li>
              </ul>
            </InfoCard>
          </SubSection>

          <SubSection id="cert-howto" title="How to Certify an Agent">
            <StepByStep steps={[
              'Create test suites for each character the agent will work with (Test Suites page).',
              'Add comprehensive test cases covering core traits, safety, edge cases, and relationships.',
              'Navigate to the Certifications page and click "Certify Agent".',
              'Enter the agent ID, select the character, card version, test suite, and tier.',
              'Click "Run Certification" — the system executes all test cases and produces a score.',
              'Review the results: overall score, per-critic breakdown, and individual case pass/fail.',
              'If the agent passed, it is certified. If it failed, check the weakest areas and improve the agent.',
              'Re-certify after improvements. Compare scores with the previous attempt to verify improvement.',
            ]} />
          </SubSection>
        </Section>

        {/* ══════════════════════════════════════════════════════════════
            8. IMPROVEMENT FLYWHEEL
            ══════════════════════════════════════════════════════════════ */}
        <Section id="improvement-flywheel" title="Continuous Improvement Flywheel">
          <p className="text-gray-700 mb-4">
            CanonSafe V2 implements a continuous improvement loop that automatically detects issues,
            suggests interventions, and measures outcomes. This flywheel is the key to maintaining and
            improving character quality over time.
          </p>

          <SubSection id="fly-patterns" title="Failure Pattern Detection">
            <p className="text-gray-700 mb-3">
              The system automatically identifies recurring evaluation failures and classifies them:
            </p>
            <div className="space-y-2 mb-3">
              <InfoCard title="Recurring Low Score" color="yellow">
                A specific critic consistently scores below its threshold for a character. For example, if
                Voice Consistency scores below 80 on 5+ evaluations, a pattern is created. The suggested fix
                might be "Expand speech patterns in Canon Pack with more example dialogues."
              </InfoCard>
              <InfoCard title="Boundary Violation" color="orange">
                Content crosses established character boundaries despite having pack data that should prevent it.
                This indicates either the pack data is incomplete or the critic prompt template needs refinement.
              </InfoCard>
              <InfoCard title="Drift" color="red">
                Gradual deviation from baseline character behavior over time. Detected by comparing recent
                evaluation scores against established baselines. Drift often indicates that the AI model has
                been updated in ways that subtly change character output.
              </InfoCard>
            </div>
            <p className="text-gray-700 mb-3">
              Each pattern includes a frequency count, severity (low/medium/high/critical), status (open/acknowledged/resolved),
              and a suggested fix generated from the evaluation data. Patterns are surfaced on the Improvement page.
            </p>
          </SubSection>

          <SubSection id="fly-trajectories" title="Improvement Trajectories">
            <p className="text-gray-700 mb-3">
              Trajectories track specific metrics over time for a character or franchise. Each trajectory
              records data points with dates and values, and automatically classifies the trend:
            </p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <InfoCard title="Improving" color="green">
                The metric is trending upward. The intervention (card update, critic tuning, agent fix) is working.
                Continue monitoring to ensure the improvement sustains.
              </InfoCard>
              <InfoCard title="Stable" color="blue">
                The metric is holding steady. No significant change detected. This is the expected state for
                well-calibrated characters after initial setup.
              </InfoCard>
              <InfoCard title="Degrading" color="red">
                The metric is trending downward. Something has changed — possibly an agent update, a card version
                change, or external factors. Investigate immediately.
              </InfoCard>
            </div>
          </SubSection>

          <SubSection id="fly-loop" title="The Feedback Loop">
            <p className="text-gray-700 mb-3">
              The flywheel connects three feedback loops that work together:
            </p>
            <StepByStep steps={[
              'Evaluation scores feed into failure pattern detection, automatically identifying recurring issues.',
              'Failure patterns generate suggested fixes for character cards and critic configurations.',
              'You apply fixes — updating packs, tuning critic weights, adding test cases.',
              'Improvement trajectories measure whether those fixes actually improved scores.',
              'The cycle repeats: new evaluations generate new data, patterns are detected, fixes are suggested.',
            ]} />
            <Tip>
              Don't try to fix everything at once. Start with the highest-severity failure patterns and work down.
              After applying a fix, wait for at least 10-20 new evaluations before checking the trajectory to ensure
              you have enough data points to see a meaningful trend.
            </Tip>
          </SubSection>
        </Section>

        {/* ══════════════════════════════════════════════════════════════
            9. TAXONOMY SYSTEM
            ══════════════════════════════════════════════════════════════ */}
        <Section id="taxonomy-system" title="Taxonomy System">

          <SubSection id="tax-categories" title="Categories">
            <p className="text-gray-700 mb-3">
              Top-level categories organize related evaluation concerns. Categories support hierarchical nesting
              via parent-child relationships. The built-in categories are:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <InfoCard title="Content Safety" color="red">
                Age-appropriateness rules, prohibited content definitions, harmful material detection.
                Highest-priority category for children's IP like Peppa Pig.
              </InfoCard>
              <InfoCard title="Character Fidelity" color="blue">
                Canon accuracy requirements, voice consistency rules, personality drift detection.
                The core of character governance.
              </InfoCard>
              <InfoCard title="Brand Protection" color="purple">
                IP integrity policies, trademark usage rules, off-brand content detection.
                Protects the commercial value of the character.
              </InfoCard>
              <InfoCard title="Accessibility" color="green">
                Inclusive language guidelines, representation rules, accommodation requirements.
                Ensures content is welcoming to all audiences.
              </InfoCard>
            </div>
          </SubSection>

          <SubSection id="tax-tags" title="Tags">
            <p className="text-gray-700 mb-3">
              Tags are attached to categories and define specific evaluation rules. Each tag has several configurable properties:
            </p>
            <div className="space-y-2 mb-3">
              <KeyValue label="Severity">Low, medium, high, or critical. Determines the impact on evaluation scoring.</KeyValue>
              <KeyValue label="Evaluation Rules">JSON configuration defining enforcement actions (flag, regenerate, quarantine, block) and thresholds.</KeyValue>
              <KeyValue label="Modalities">Which content types the tag applies to (text, image, audio, video). A tag can apply to multiple modalities.</KeyValue>
              <KeyValue label="Franchise Propagation">When enabled, the tag automatically applies to all characters in the same franchise.</KeyValue>
            </div>
          </SubSection>

          <SubSection id="tax-howto" title="How to Use the Taxonomy System">
            <StepByStep steps={[
              'Navigate to the Taxonomy page. You\'ll see categories on the left, tags on the right.',
              'Click a category to filter and see only its tags.',
              'Create new categories for evaluation areas not covered by the defaults.',
              'Add tags with specific severity levels — critical tags cause immediate blocks.',
              'Set applicable modalities so tags only fire for relevant content types.',
              'Enable franchise propagation for tags that should apply across all characters in an IP.',
              'Define evaluation rules in JSON format to specify automated enforcement actions.',
              'Click any tag to expand its details, then use Edit/Delete to manage it.',
            ]} />
            <Tip>
              Start with a few high-severity tags for critical safety rules, then gradually add lower-severity
              tags as you understand your evaluation patterns. Too many critical tags initially will cause excessive
              blocking while you calibrate the system.
            </Tip>
          </SubSection>
        </Section>

        {/* ══════════════════════════════════════════════════════════════
            10. EXEMPLAR LIBRARY
            ══════════════════════════════════════════════════════════════ */}
        <Section id="exemplar-library" title="Exemplar Library">

          <SubSection id="ex-purpose" title="Purpose">
            <p className="text-gray-700 mb-3">
              The Exemplar Library stores gold-standard examples of character content. These serve multiple purposes:
            </p>
            <InfoCard title="Why Exemplars Matter" color="blue">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Training reference</strong> — show AI agents what "good" looks like for a character</li>
                <li><strong>Evaluation calibration</strong> — verify critics score exemplar content highly (if they don't, the critic needs tuning)</li>
                <li><strong>Onboarding</strong> — new team members can quickly understand the character's voice by reviewing exemplars</li>
                <li><strong>Regression testing</strong> — run exemplars through evaluations after updates to ensure scores haven't degraded</li>
                <li><strong>Quality benchmarking</strong> — set a quality bar that all AI-generated content should aim for</li>
              </ul>
            </InfoCard>
          </SubSection>

          <SubSection id="ex-howto" title="How to Use Exemplars">
            <StepByStep steps={[
              'Navigate to the Exemplar Library page.',
              'Use filters to find exemplars by character, modality, or minimum score.',
              'Click any exemplar to expand and see the full prompt, response, and metadata.',
              'To add a new exemplar manually, click "Add Exemplar" and enter the prompt, response, score, and tags.',
              'To edit an existing exemplar, expand it and click "Edit" — change content, tags, or score.',
              'To remove an exemplar, expand it and click "Delete".',
              'Review auto-promoted exemplars (tagged "auto-promoted") to decide whether to keep or curate them.',
            ]} />
          </SubSection>

          <SubSection id="ex-auto" title="Auto-Promotion">
            <p className="text-gray-700 mb-3">
              When an evaluation scores above 95%, CanonSafe automatically creates an exemplar from that content.
              This ensures your library grows organically with proven high-quality examples.
            </p>
            <InfoCard title="Auto-Promotion Details" color="green">
              <ul className="list-disc list-inside space-y-1">
                <li>Threshold: 95% overall score (configurable)</li>
                <li>Auto-promoted exemplars are tagged "auto-promoted"</li>
                <li>They link back to their source evaluation run for traceability</li>
                <li>Review them periodically — some high-scoring content may not be ideal exemplars</li>
                <li>Delete auto-promoted exemplars that don't represent the character well</li>
              </ul>
            </InfoCard>
          </SubSection>
        </Section>

        {/* ══════════════════════════════════════════════════════════════
            11. APM SDK INTEGRATION
            ══════════════════════════════════════════════════════════════ */}
        <Section id="apm-sdk" title="APM SDK Integration">
          <p className="text-gray-700 mb-4">
            The Agentic Pipeline Middleware (APM) provides REST endpoints for integrating CanonSafe into
            any AI agent pipeline. This is how you connect your AI systems to CanonSafe for automated governance.
          </p>

          <SubSection id="apm-evaluate" title="POST /api/apm/evaluate">
            <p className="text-gray-700 mb-3">Submit content for evaluation against a character card.</p>
            <CodeBlock title="Request">
{`POST /api/apm/evaluate
Content-Type: application/json
Authorization: Bearer <token>

{
  "character_id": 1,
  "agent_id": "my-agent-v1",
  "content": "I love jumping in muddy puddles!",
  "modality": "text",
  "territory": "US"
}`}
            </CodeBlock>
            <CodeBlock title="Response (Pass)">
{`{
  "eval_run_id": 142,
  "overall_score": 95.2,
  "decision": "pass",
  "consent_verified": true,
  "sampled": false,
  "critic_scores": {
    "canon-fidelity": 97.1,
    "voice-consistency": 94.8,
    "safety-brand": 98.0,
    "relationship-accuracy": 91.5,
    "legal-compliance": 95.0
  },
  "flags": [],
  "recommendations": [],
  "c2pa_metadata": {
    "evaluation_score": 95.2,
    "decision": "pass",
    "character": "Peppa Pig",
    "card_version": 3
  }
}`}
            </CodeBlock>
            <CodeBlock title="Response (Regenerate)">
{`{
  "eval_run_id": 143,
  "overall_score": 78.4,
  "decision": "regenerate",
  "consent_verified": true,
  "sampled": false,
  "critic_scores": {
    "canon-fidelity": 82.0,
    "voice-consistency": 65.2,
    "safety-brand": 95.0,
    "relationship-accuracy": 78.1,
    "legal-compliance": 92.0
  },
  "flags": ["voice-inconsistency-detected"],
  "recommendations": [
    "Character's speech pattern uses vocabulary above target age level",
    "Consider using simpler sentence structures and more childlike expressions"
  ]
}`}
            </CodeBlock>
            <InfoCard title="Request Parameters" color="gray">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>character_id</strong> (required) — the ID of the character to evaluate against</li>
                <li><strong>content</strong> (required) — the AI-generated content to evaluate</li>
                <li><strong>modality</strong> (required) — "text", "image", "audio", or "video"</li>
                <li><strong>agent_id</strong> (optional) — identifier for the AI system that produced the content</li>
                <li><strong>territory</strong> (optional) — geographic territory for consent verification (e.g., "US", "EU")</li>
              </ul>
            </InfoCard>
          </SubSection>

          <SubSection id="apm-enforce" title="POST /api/apm/enforce">
            <p className="text-gray-700 mb-3">Apply an enforcement action to evaluated content.</p>
            <CodeBlock title="Request">
{`POST /api/apm/enforce
Content-Type: application/json
Authorization: Bearer <token>

{
  "eval_run_id": 142,
  "action": "pass",
  "override_reason": null
}`}
            </CodeBlock>
            <CodeBlock title="Response">
{`{
  "status": "enforced",
  "action": "pass",
  "eval_run_id": 142,
  "timestamp": "2026-02-12T10:30:00Z"
}`}
            </CodeBlock>
            <InfoCard title="Available Actions" color="gray">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>regenerate</strong> — request the agent to regenerate the content</li>
                <li><strong>quarantine</strong> — hold content for human review</li>
                <li><strong>escalate</strong> — escalate to senior review</li>
                <li><strong>block</strong> — permanently block the content</li>
                <li><strong>override</strong> — approve content despite a non-pass decision (requires override_reason)</li>
              </ul>
            </InfoCard>
          </SubSection>

          <SubSection id="apm-workflow" title="Integration Workflow">
            <p className="text-gray-700 mb-3">
              Here's the recommended pattern for integrating CanonSafe into an AI agent pipeline:
            </p>
            <CodeBlock title="Python Integration Example">
{`import requests

CANONSAFE_URL = "https://your-canonsafe-instance.com/api"
API_TOKEN = "your-api-token"
HEADERS = {"Authorization": f"Bearer {API_TOKEN}"}

def generate_and_evaluate(character_id, prompt, agent_id="my-agent"):
    # Step 1: Generate content with your AI agent
    content = your_ai_agent.generate(prompt)

    # Step 2: Evaluate with CanonSafe
    eval_response = requests.post(
        f"{CANONSAFE_URL}/apm/evaluate",
        headers=HEADERS,
        json={
            "character_id": character_id,
            "content": content,
            "modality": "text",
            "agent_id": agent_id,
        }
    ).json()

    # Step 3: Act on the decision
    decision = eval_response["decision"]

    if decision == "pass":
        return content  # Safe to deliver

    elif decision == "regenerate":
        # Retry with feedback
        feedback = eval_response["recommendations"]
        content = your_ai_agent.generate(
            prompt,
            feedback=feedback
        )
        # Re-evaluate the regenerated content
        return generate_and_evaluate(
            character_id, prompt, agent_id
        )

    elif decision in ("quarantine", "escalate", "block"):
        # Enforce the decision
        requests.post(
            f"{CANONSAFE_URL}/apm/enforce",
            headers=HEADERS,
            json={
                "eval_run_id": eval_response["eval_run_id"],
                "action": decision,
            }
        )
        return None  # Content not deliverable`}
            </CodeBlock>
          </SubSection>

          <SubSection id="apm-errors" title="Error Handling">
            <p className="text-gray-700 mb-3">
              Common error scenarios and how to handle them:
            </p>
            <div className="space-y-2 mb-3">
              <InfoCard title="401 Unauthorized" color="red">
                Your API token is invalid or expired. Check your authentication configuration in Settings.
              </InfoCard>
              <InfoCard title="404 Character Not Found" color="orange">
                The character_id doesn't exist or doesn't belong to your organization. Verify the ID.
              </InfoCard>
              <InfoCard title="422 Validation Error" color="yellow">
                Missing required fields or invalid data types. Check that character_id is an integer,
                content is a string, and modality is one of the accepted values.
              </InfoCard>
              <InfoCard title="Consent Blocked" color="red">
                The response will have consent_verified: false and decision: "block". This means there's no valid
                consent record for this character/modality/territory combination. Add a consent verification
                record before retrying.
              </InfoCard>
            </div>
          </SubSection>
        </Section>

        {/* ══════════════════════════════════════════════════════════════
            12. C2PA CONTENT PROVENANCE
            ══════════════════════════════════════════════════════════════ */}
        <Section id="c2pa" title="C2PA Content Provenance">
          <p className="text-gray-700 mb-4">
            <strong>C2PA (Coalition for Content Provenance and Authenticity)</strong> is an open standard for
            certifying the source and history of digital content. CanonSafe V2 embeds C2PA metadata into
            every evaluated piece of content, creating a tamper-evident governance record.
          </p>
          <InfoCard title="What Gets Embedded" color="blue">
            <ul className="list-disc list-inside space-y-1">
              <li>Evaluation score and decision (pass/regenerate/quarantine/escalate/block)</li>
              <li>Character identity (name and card version used for evaluation)</li>
              <li>Agent identity (which AI agent produced the content)</li>
              <li>Timestamp and evaluation run reference ID</li>
              <li>Critic scores summary with individual critic identifiers</li>
              <li>Organization and franchise context</li>
            </ul>
          </InfoCard>
          <InfoCard title="Why It Matters" color="green">
            <p className="mb-2">C2PA metadata serves several critical purposes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Audit trail</strong> — proves that content was evaluated and what the result was</li>
              <li><strong>Downstream verification</strong> — platforms receiving the content can verify its governance status</li>
              <li><strong>Legal protection</strong> — documents that due diligence was performed for IP compliance</li>
              <li><strong>Tamper evidence</strong> — any modification to the content or metadata is detectable</li>
              <li><strong>Portability</strong> — the governance record travels with the content, independent of CanonSafe</li>
            </ul>
          </InfoCard>
        </Section>

        {/* ══════════════════════════════════════════════════════════════
            13. BEST PRACTICES
            ══════════════════════════════════════════════════════════════ */}
        <Section id="best-practices" title="Best Practices">

          <SubSection id="bp-cards" title="Writing Good Character Cards">
            <div className="space-y-2 mb-3">
              <InfoCard title="Be Specific, Not Vague" color="blue">
                <p className="mb-1">Instead of "Peppa is friendly", write:</p>
                <p className="italic">"Peppa is enthusiastic and welcoming. She greets friends with excitement, often
                  using exclamation marks. She invites others to join activities and shares her toys, though she can
                  be bossy about how games should be played."</p>
              </InfoCard>
              <InfoCard title="Include Anti-Canon" color="red">
                Defining what a character would NEVER do is as important as what they would do. Anti-canon entries
                help critics catch content that violates character boundaries. Example: "Peppa never uses sarcasm,
                never references real-world violence, never speaks in complex sentences."
              </InfoCard>
              <InfoCard title="Use Examples" color="green">
                In the speech patterns section, include 5-10 example dialogues that demonstrate the character's
                voice. These give critics concrete reference points for evaluating voice consistency.
              </InfoCard>
              <InfoCard title="Update Regularly" color="yellow">
                Character cards should evolve as you learn from evaluation data. If critics consistently flag
                certain content that you consider acceptable, update the card to explicitly permit it.
                If patterns emerge that the card doesn't address, add new entries.
              </InfoCard>
            </div>
          </SubSection>

          <SubSection id="bp-critics" title="Tuning Critics">
            <div className="space-y-2 mb-3">
              <InfoCard title="Start with Default Weights" color="blue">
                Use the default critic weights (1.0) initially. Run 50+ evaluations to establish baseline scores.
                Only adjust weights after you understand the system's natural scoring distribution.
              </InfoCard>
              <InfoCard title="Use Weight to Prioritize" color="purple">
                If safety is your top concern, increase the Safety critic's weight to 1.5 or 2.0. This makes
                safety failures have a larger impact on the overall score without changing how the critic evaluates.
              </InfoCard>
              <InfoCard title="Custom Instructions" color="green">
                Use the "extra instructions" field in critic configurations to add character-specific context.
                For example, for a child character: "This character is 4 years old. All vocabulary should be
                age-appropriate. Reject any content with words above a first-grade reading level."
              </InfoCard>
              <InfoCard title="Validate with Exemplars" color="orange">
                After tuning a critic, run your exemplar library through evaluation. If exemplars that you know
                are high quality score poorly, the critic's configuration needs adjustment. Exemplars should
                consistently score above 90.
              </InfoCard>
            </div>
          </SubSection>

          <SubSection id="bp-testing" title="Building Effective Test Suites">
            <div className="space-y-2 mb-3">
              <InfoCard title="Cover All Dimensions" color="blue">
                A good test suite tests canon accuracy, voice consistency, safety compliance, relationship accuracy,
                and legal compliance. Don't focus exclusively on one dimension — agents may excel in one area
                while failing in another.
              </InfoCard>
              <InfoCard title="Include Adversarial Cases" color="red">
                Add test cases specifically designed to trick the agent into breaking character. Examples: "Tell me
                something scary" (for a children's character), "What do you think about [competitor brand]",
                "Pretend you're a different character."
              </InfoCard>
              <InfoCard title="Set Realistic Thresholds" color="yellow">
                A 100% threshold means every single test case must pass perfectly. This is rarely realistic.
                Start with 85-90% for Base tier and 90-95% for CanonSafe Certified. Adjust based on observed performance.
              </InfoCard>
              <InfoCard title="Version Your Suites" color="green">
                As you add test cases, previous certification results remain valid for their period. New agents
                get certified against the current suite. Track which suite version was used for each certification.
              </InfoCard>
            </div>
          </SubSection>

          <SubSection id="bp-monitoring" title="Monitoring & Continuous Improvement">
            <div className="space-y-2 mb-3">
              <InfoCard title="Daily Check" color="blue">
                Visit the Dashboard and Improvement page daily. Look for new failure patterns, degrading
                trajectories, and unusual drops in evaluation volume (which may indicate pipeline issues).
              </InfoCard>
              <InfoCard title="Weekly Review" color="purple">
                Review the evaluation history for each main character weekly. Look for patterns in regeneration
                reasons and quarantine rates. Are the same issues recurring? Time to update the character card.
              </InfoCard>
              <InfoCard title="Monthly Audit" color="green">
                Audit the exemplar library monthly. Remove examples that no longer represent the character well.
                Review certification expiry dates — expired certifications mean agents are running uncertified.
              </InfoCard>
              <InfoCard title="After Agent Updates" color="orange">
                Whenever an AI agent is updated (new model version, prompt changes, etc.), immediately run its
                certification test suites again. Agent updates are the #1 cause of character drift.
              </InfoCard>
            </div>
          </SubSection>
        </Section>

        {/* ══════════════════════════════════════════════════════════════
            14. TROUBLESHOOTING
            ══════════════════════════════════════════════════════════════ */}
        <Section id="troubleshooting" title="Troubleshooting">
          <div className="space-y-3">
            <InfoCard title="Evaluations are scoring too low" color="yellow">
              <ul className="list-disc list-inside space-y-1">
                <li>Check the Character Card packs — are they detailed enough? Vague packs produce low scores.</li>
                <li>Review individual critic scores to identify which critic is failing.</li>
                <li>Check for overly strict critic configurations or thresholds.</li>
                <li>Verify the active card version is the correct one (not an outdated draft).</li>
                <li>Run exemplar content through evaluation — if exemplars fail, the critics need tuning, not the content.</li>
              </ul>
            </InfoCard>
            <InfoCard title="Evaluations are scoring too high (missing violations)" color="orange">
              <ul className="list-disc list-inside space-y-1">
                <li>The Safety Pack may be missing prohibited topics that should be listed.</li>
                <li>Critic weights may be too low for the critics that should catch these violations.</li>
                <li>Add more specific anti-canon entries to the Canon Pack.</li>
                <li>Consider adding custom critics for specific violation types the built-in critics miss.</li>
                <li>Check if tiered evaluation is accidentally screening out content before deep evaluation.</li>
              </ul>
            </InfoCard>
            <InfoCard title="Consent verification is blocking everything" color="red">
              <ul className="list-disc list-inside space-y-1">
                <li>Navigate to the Character Workspace and check the consent verifications.</li>
                <li>Verify that consent records exist for the correct modality (text, image, audio, video).</li>
                <li>Check territory restrictions — consent may exist for "US" but not "EU".</li>
                <li>Verify consent validity dates — expired consent blocks evaluation.</li>
                <li>Check for strike clauses — if a performer strike is active, consent is suspended.</li>
              </ul>
            </InfoCard>
            <InfoCard title="Character dropdown is empty or missing characters" color="blue">
              <ul className="list-disc list-inside space-y-1">
                <li>Verify you're logged into the correct organization.</li>
                <li>Characters are organization-scoped — you can only see characters in your org.</li>
                <li>Check that characters have been created (Characters page).</li>
                <li>If characters exist but aren't appearing in dropdowns, clear your browser cache.</li>
              </ul>
            </InfoCard>
            <InfoCard title="Agent certification keeps failing" color="purple">
              <ul className="list-disc list-inside space-y-1">
                <li>Check which test cases are failing — the results summary shows individual case pass/fail.</li>
                <li>Review the weakest areas identified in the certification results.</li>
                <li>Lower the passing threshold temporarily to understand the score distribution.</li>
                <li>Work with the AI engineering team to improve the agent's performance on failing cases.</li>
                <li>Consider whether the test cases are realistic — overly strict cases cause unnecessary failures.</li>
              </ul>
            </InfoCard>
            <InfoCard title="The Improvement page shows no data" color="gray">
              <ul className="list-disc list-inside space-y-1">
                <li>Failure patterns are generated automatically after enough evaluations. Run more evaluations.</li>
                <li>Trajectories are created when enough data points exist. Wait for more evaluation runs.</li>
                <li>Check that the seed data was loaded correctly during initial setup.</li>
              </ul>
            </InfoCard>
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════════════════
            15. GLOSSARY
            ══════════════════════════════════════════════════════════════ */}
        <Section id="glossary" title="Glossary">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 w-48">Term</th>
                  <th className="text-left px-4 py-2">Definition</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  ['A/B Experiment', 'A controlled test comparing two evaluation configurations with statistical significance analysis.'],
                  ['Agent', 'An AI system that generates content featuring licensed characters.'],
                  ['Agent Certification', 'The process of validating that an agent can reliably produce in-character content by running it against a test suite.'],
                  ['Anti-Canon', 'Things a character would NEVER do or say. Critical for catching violations.'],
                  ['APM', 'Agentic Pipeline Middleware — the REST API for integrating CanonSafe into agent pipelines.'],
                  ['Brand Analysis', 'An AI-synthesized summary of evaluation results that translates critic scores into strengths, issues, strategic recommendations, and suggested content improvements.'],
                  ['C2PA', 'Coalition for Content Provenance and Authenticity — an open standard for content provenance metadata.'],
                  ['Canon Pack', 'The core identity pack defining personality, backstory, speech patterns, relationships, and canonical facts.'],
                  ['Character Card', 'The master identity document for a fictional character, containing all 5 packs.'],
                  ['Character Drift', 'Gradual deviation from the official character identity over time in AI-generated content.'],
                  ['Consent Verification', 'Legal check that valid performer consent exists for a character, modality, and territory.'],
                  ['Critic', 'An LLM-based evaluation module that scores content against specific aspects of the character card.'],
                  ['Critic Configuration', 'Per-org/franchise/character overrides for critic weights, thresholds, and instructions.'],
                  ['Custom Judge', 'A registered LLM model that can be used as an evaluation judge, supporting multiple providers and modalities.'],
                  ['Decision', 'The outcome of an evaluation: pass, regenerate, quarantine, escalate, or block.'],
                  ['Drift Baseline', 'The established normal scoring range for a character+critic combination.'],
                  ['Drift Event', 'A detected deviation from the drift baseline, indicating potential character drift.'],
                  ['Evaluation Profile', 'A named collection of critic configurations defining how evaluations are executed.'],
                  ['Evaluation Run', 'A single evaluation request containing content, character reference, and modality.'],
                  ['Exemplar', 'A high-quality, approved piece of character content stored as a reference example.'],
                  ['Failure Pattern', 'A recurring evaluation issue detected across multiple runs.'],
                  ['Five-Pack / 5-Pack', 'The five structured data packs that define a character: Canon, Legal, Safety, Visual Identity, Audio Identity.'],
                  ['Flag', 'A specific issue detected by a critic during evaluation (info, warning, or critical severity).'],
                  ['Focus Character', 'A character currently being worked on or improved, sorted after Main characters.'],
                  ['Franchise', 'A group of related characters under a single IP umbrella (e.g., "Peppa Pig").'],
                  ['Franchise Health', 'Aggregated evaluation metrics across all characters in a franchise.'],
                  ['Hard Gate', 'A check that blocks evaluation entirely if it fails (e.g., consent verification).'],
                  ['Head-to-Head', 'A comparison mode that evaluates the same content against two different characters simultaneously.'],
                  ['HITL', 'Human-in-the-loop — the review process where human reviewers examine flagged evaluation results.'],
                  ['Improvement Trajectory', 'A tracked metric over time for a character or franchise, showing trend direction.'],
                  ['Main Character', 'A primary character that appears first in all dropdowns and the character grid.'],
                  ['Override', 'An enforcement action that approves content despite a non-pass evaluation decision.'],
                  ['Rapid Screen', 'A fast initial evaluation using a subset of critics, used in tiered evaluation.'],
                  ['Red Team', 'Adversarial robustness testing that generates attack probes to test character resilience.'],
                  ['Resilience Score', 'Red team metric: 1.0 minus (successful attacks / total probes). Higher is more resilient.'],
                  ['Review Item', 'A flagged evaluation result queued for human review in the HITL Review Queue.'],
                  ['Sampling Rate', 'The percentage of content that is selected for evaluation (0.0 to 1.0).'],
                  ['Slug', 'A URL-safe identifier for a resource (lowercase, hyphens instead of spaces).'],
                  ['Taxonomy', 'A structured classification system for evaluation rules and content policies.'],
                  ['Test Case', 'A single input/expected-output pair within a test suite.'],
                  ['Test Suite', 'A collection of test cases targeting a specific character, used for agent certification.'],
                  ['Tiered Evaluation', 'A two-stage evaluation: rapid screen first, then full evaluation for passing content.'],
                  ['Webhook', 'An HTTP callback triggered by evaluation events (completion, block, escalation) with HMAC-SHA256 signed payloads.'],
                ].map(([term, def]) => (
                  <tr key={term}>
                    <td className="px-4 py-2 font-medium text-gray-900">{term}</td>
                    <td className="px-4 py-2 text-gray-600">{def}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Footer */}
        <div className="border-t border-gray-200 mt-12 pt-6 pb-8 text-center text-sm text-gray-400">
          CanonSafe V2 — Character IP Governance Platform — User Manual
        </div>
      </div>
    </div>
  )
}
