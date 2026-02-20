/**
 * Workflow definitions for guided step-by-step panels.
 * Each workflow is shown on the relevant page as a collapsible guide.
 */

export const workflows = {
  evaluations: {
    title: "Evaluate Your First Character",
    description: "Learn to run a character evaluation and understand the results.",
    steps: [
      { title: "Pick a character", description: "Select a character from the dropdown that has an active card version.", link: "/characters", linkLabel: "Characters" },
      { title: "Enter sample content", description: "Type or paste content that an AI agent might generate for this character." },
      { title: "Run the evaluation", description: "Click 'Run Evaluation' and wait for the multi-critic analysis to complete." },
      { title: "Review the scores", description: "Check the overall score, individual critic scores, and the decision (pass/regenerate/quarantine/escalate/block)." },
      { title: "Read the brand analysis", description: "Expand the analysis summary to see strengths, issues, and improvement suggestions." },
    ],
  },

  critics: {
    title: "Set Up a Critic and Run an Evaluation",
    description: "Create a custom critic with a prompt template and rubric, then verify it works.",
    steps: [
      { title: "Create a new critic", description: "Click 'New Critic' and provide a name, category, and modality." },
      { title: "Write a prompt template", description: "Use {character_name}, {content}, and {canon_pack} placeholders in your template." },
      { title: "Define the rubric", description: "Set scoring criteria (e.g., 0-0.3 = poor, 0.7-1.0 = excellent) as JSON." },
      { title: "Set the weight", description: "Configure how much this critic's score influences the overall evaluation." },
      { title: "Run an evaluation", description: "Go to Evaluations and run a test to see your critic in action.", link: "/evaluations", linkLabel: "Evaluations" },
    ],
  },

  reviews: {
    title: "Review a Quarantined Item",
    description: "Practice the human-in-the-loop review workflow.",
    steps: [
      { title: "Submit borderline content", description: "Run an evaluation that scores between 0.5-0.69 to trigger quarantine.", link: "/evaluations", linkLabel: "Evaluations" },
      { title: "Find it in the queue", description: "The quarantined item appears automatically in the review queue." },
      { title: "Claim the item", description: "Click 'Claim' to assign it to yourself for review." },
      { title: "Examine the evaluation", description: "Review the critic scores, reasoning, and flags." },
      { title: "Resolve with justification", description: "Choose a resolution (approved/overridden/re-evaluated) and provide your reasoning." },
    ],
  },

  redTeam: {
    title: "Run a Red Team Session",
    description: "Test character resilience against adversarial prompts.",
    steps: [
      { title: "Create a session", description: "Select a character and name your red team session." },
      { title: "Select attack categories", description: "Choose from: persona_break, knowledge_probe, safety_bypass, boundary_test, context_manipulation." },
      { title: "Run the session", description: "Click 'Run' to generate adversarial probes and evaluate them." },
      { title: "Analyze results", description: "Review the resilience score and individual probe outcomes." },
      { title: "Improve defenses", description: "Use insights to update character cards and safety packs.", link: "/characters", linkLabel: "Characters" },
    ],
  },

  certifications: {
    title: "Certify an Agent",
    description: "Run a full certification test suite for an AI agent.",
    steps: [
      { title: "Create a test suite", description: "Go to Test Suites and create a suite with test cases for your character.", link: "/test-suites", linkLabel: "Test Suites" },
      { title: "Add test cases", description: "Include diverse scenarios covering canon adherence, safety, and edge cases." },
      { title: "Run certification", description: "Create a new certification specifying the agent, character, and tier." },
      { title: "Review results", description: "Check the certification score and results summary." },
      { title: "Verify validity", description: "Certifications are valid for 90 days. Monitor the expiry date." },
    ],
  },
}
