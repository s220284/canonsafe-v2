Automated evaluation handles the clear cases — content that's obviously on-brand passes, content that's obviously wrong gets blocked. But what about the gray zone? Content that scores between 0.30 and 0.69 — the quarantine and escalation range — needs human judgment.

This is where the Human-in-the-Loop (HITL) review system comes in.

## Why Automated Systems Need Human Oversight

Even the best evaluation system will encounter content it can't confidently judge. Common scenarios:

- **Creative ambiguity**: A character says something that's technically not in their established canon but feels plausible and enriching. Is it drift or character development?
- **Context-dependent safety**: Darth Vader threatening someone is in-character; the question is whether the specific threat crosses a line from canon-appropriate to genuinely disturbing.
- **Cultural nuance**: Content involving culturally significant characters (Moana, Jasmine, Mulan) may require human sensitivity that LLMs can approximate but not guarantee.
- **Novel situations**: The character encounters a scenario not covered by their card data. No evaluation rubric can anticipate everything.

In these cases, automated evaluation provides the initial assessment and supporting evidence, but a human makes the final call. The system's job is to surface the right content to the right reviewer with the right context.

## The Quarantine vs. Escalation Distinction

Both quarantine and escalation route content to human review, but they represent different urgency levels:

**Quarantine (score 0.50 - 0.69)**: Content has issues but isn't dangerous. It needs review at normal priority. A reviewer might approve it with minor concerns noted, send it back for regeneration, or reject it.

**Escalation (score 0.30 - 0.49)**: Content has serious problems — potential brand damage, safety concerns, or major identity violations. It needs priority review, possibly by senior brand managers or legal teams. Escalated items appear with higher visibility in the review queue.

This distinction matters for workflow efficiency. A team reviewing hundreds of items daily needs to know which ones require immediate attention versus which ones can wait for the next review cycle.

## The Claim-Examine-Resolve Workflow

The review process follows a three-step pattern designed for accountability and auditability:

### 1. Claim

A reviewer claims a review item, taking ownership. This prevents duplicate work — once claimed, other reviewers see it as "in progress" and move to the next item. The claim is timestamped and attributed to the reviewer.

### 2. Examine

The reviewer examines the content alongside the evaluation evidence:

- The original content that was evaluated
- Each critic's score and natural-language reasoning
- The character's card data for reference
- The overall score and policy decision
- Any judge disagreement flags
- Historical context (has this character had similar issues before?)

This evidence package gives the reviewer everything they need to make an informed decision without re-evaluating from scratch.

### 3. Resolve

The reviewer makes a decision and records their justification:

- **Approve**: The content is acceptable despite the automated score. The reviewer explains why.
- **Reject**: The content should be blocked. The reviewer explains what's wrong.
- **Regenerate**: The content should be regenerated with specific guidance from the reviewer.

Every resolution includes a text justification that becomes part of the permanent audit trail. This is essential for compliance — regulators and stakeholders can trace exactly who reviewed what, when, and why they made their decision.

## Audit Trails for Compliance

The review system maintains a complete audit trail:

- When the item was created (evaluation timestamp)
- When it was claimed (and by whom)
- When it was resolved (and by whom, with what decision)
- The full evaluation evidence available at review time
- The reviewer's written justification

This trail serves multiple purposes:

- **Regulatory compliance**: Demonstrate that human oversight exists in your AI content pipeline
- **Quality assurance**: Track reviewer decision patterns to identify training needs
- **Dispute resolution**: When stakeholders disagree about a decision, the trail provides context
- **Process improvement**: Analyze which types of content most frequently need human review to improve automated evaluation

---

## Hands-On: The Review Queue

### Finding Review Items

Navigate to the **Review Queue** page (under Evaluation in the sidebar). The sidebar badge shows the count of pending review items — items that have been quarantined or escalated but not yet claimed.

[SCREENSHOT: Review Queue page showing list of pending review items with severity indicators]

The queue displays:

- Character name and franchise
- Evaluation score and decision (quarantine or escalate)
- Timestamp
- Claim status (unclaimed, claimed by whom)

Items are sorted by priority — escalated items appear before quarantined items.

### Generating a Review Item

To see the full workflow, run an evaluation designed to land in the quarantine zone. Navigate to **Evaluations**, select a character, and submit content that's a mix of on-brand and off-brand elements:

```
"I am Darth Vader, Lord of the Sith. The dark side gives me strength.
But sometimes I wonder if there's a better path. Maybe the Jedi had
some good ideas after all. I do enjoy a good sunset on Tatooine."
```

This content has Vader's voice and correct self-identification, but the sentimentality and casual tone push it into borderline territory. Depending on critic weights, it should score in the 0.50-0.69 range — quarantine.

### Claiming a Review Item

Go back to the Review Queue. Find the new item. Click to claim it. The item's status changes to "claimed" with your name and timestamp.

[SCREENSHOT: Review item detail showing full evaluation evidence — critic scores, reasoning, character card reference]

### Examining the Evidence

The review detail page shows everything you need:

- **Content**: The text that was evaluated
- **Overall score**: The weighted average across critics
- **Critic breakdown**: Each critic's individual score and reasoning
- **Character context**: Key card data for reference
- **Flags**: Any disagreement flags or special conditions

Read through the critic reasoning. In this case, you might see Canon Fidelity scoring reasonably well (Vader did have inner conflict) while Voice Consistency scores lower (the casual tone is wrong for Vader).

### Resolving the Item

Make your decision and write your justification. For this example, a reasonable resolution might be:

> "Reject — regenerate. Vader's inner conflict is canon-appropriate (ref: Return of the Jedi), but the casual, colloquial tone ('I do enjoy a good sunset') is fundamentally wrong for the character. Regenerate with formal, declarative speech style as defined in the audio identity pack."

Submit the resolution. The item moves to resolved status with your decision, justification, and timestamp in the permanent record.

[SCREENSHOT: Resolution form with decision dropdown and justification text area]

### Watching the Badge Update

After resolving, check the sidebar. The Review Queue badge count has decreased by one. This real-time feedback helps teams track their review backlog.

[SCREENSHOT: Sidebar showing updated Review Queue badge count after resolution]

> **Key Takeaway**: Automated evaluation handles clear pass/block cases, but borderline content (quarantine 0.50-0.69, escalate 0.30-0.49) needs human review. The claim-examine-resolve workflow ensures accountability: every review is attributed, evidenced, and justified. The audit trail serves compliance, quality assurance, and process improvement needs.
