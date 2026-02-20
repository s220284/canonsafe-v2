const chapters = [
  {
    id: 1,
    slug: 'character-governance',
    title: 'The Character Governance Problem',
    subtitle: 'Why AI characters go off-brand and what it costs',
    readingTime: '6 min',
    concepts: ['Character Drift', 'IP Risk', 'Brand Safety'],
    features: ['Dashboard', 'Characters', 'Franchises'],
  },
  {
    id: 2,
    slug: 'character-cards',
    title: 'Character Cards and the 5-Pack System',
    subtitle: 'Encoding character identity as structured, evaluatable data',
    readingTime: '8 min',
    concepts: ['5-Pack Structure', 'Canon Data', 'Version Control'],
    features: ['Character Workspace', '5-Pack Viewer'],
  },
  {
    id: 3,
    slug: 'critics',
    title: 'Critics — The Evaluation Brain',
    subtitle: 'LLM-as-judge with domain-specific rubrics and scoring',
    readingTime: '7 min',
    concepts: ['LLM-as-Judge', 'Prompt Templates', 'Weighted Scoring'],
    features: ['Critics Registry', 'Evaluation Profiles'],
  },
  {
    id: 4,
    slug: 'evaluation-pipeline',
    title: 'The Evaluation Pipeline — Content to Decision',
    subtitle: 'The complete 8-step journey from raw content to pass/block',
    readingTime: '10 min',
    concepts: ['Tiered Evaluation', 'Policy Actions', 'Brand Analysis'],
    features: ['Evaluations', 'Eval Runner', 'Results'],
  },
  {
    id: 5,
    slug: 'judge-reliability',
    title: 'Judge Reliability and Bias Mitigation',
    subtitle: 'Multi-provider execution and disagreement detection',
    readingTime: '6 min',
    concepts: ['Judge Bias', 'Multi-Provider', 'Agreement Scoring'],
    features: ['Judge Registry', 'Inter-Critic Agreement'],
  },
  {
    id: 6,
    slug: 'review-escalation',
    title: 'Human-in-the-Loop Review',
    subtitle: 'When machines need humans to make the final call',
    readingTime: '5 min',
    concepts: ['Escalation', 'Audit Trails', 'Claim-Resolve'],
    features: ['Review Queue', 'Resolution Workflow'],
  },
  {
    id: 7,
    slug: 'red-teaming',
    title: 'Adversarial Red-Teaming',
    subtitle: 'Attacking your own characters before someone else does',
    readingTime: '6 min',
    concepts: ['Attack Categories', 'Resilience Scoring', 'Probing'],
    features: ['Red Team Sessions', 'Resilience Reports'],
  },
  {
    id: 8,
    slug: 'ab-testing',
    title: 'A/B Testing with Statistical Rigor',
    subtitle: 'Replacing intuition with z-tests and t-tests',
    readingTime: '6 min',
    concepts: ['Z-Test', 'T-Test', 'Statistical Significance'],
    features: ['A/B Experiments', 'Trial Results'],
  },
  {
    id: 9,
    slug: 'certification-drift',
    title: 'Certification, Drift, and Continuous Improvement',
    subtitle: 'The lifecycle from certified to drifted to improved',
    readingTime: '8 min',
    concepts: ['Certification', 'Drift Detection', 'Improvement Flywheel'],
    features: ['Certifications', 'Drift Monitor', 'Improvement'],
  },
  {
    id: 10,
    slug: 'production-integration',
    title: 'Production Integration',
    subtitle: 'SDK, sidecar, webhooks, and multi-modal evaluation in the real world',
    readingTime: '7 min',
    concepts: ['SDK Integration', 'Webhooks', 'Multi-Modal'],
    features: ['APM', 'Webhooks', 'Multi-Modal', 'API Docs'],
  },
]

export function getChapters() {
  return chapters
}

export function getChapterBySlug(slug) {
  return chapters.find((ch) => ch.slug === slug) || null
}

export function getAdjacentChapters(slug) {
  const idx = chapters.findIndex((ch) => ch.slug === slug)
  return {
    prev: idx > 0 ? chapters[idx - 1] : null,
    next: idx < chapters.length - 1 ? chapters[idx + 1] : null,
  }
}

export default chapters
