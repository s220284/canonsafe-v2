You understand character cards (the data) and critics (the judges). Now let's trace the complete journey of a piece of AI-generated content from submission to decision. This is the evaluation pipeline — the 8-step process that turns raw content into an actionable verdict.

## The 8-Step Pipeline

When content is submitted for evaluation, it passes through eight sequential stages:

### Step 1: Fetch Character and Card Version

The pipeline loads the character record and its **active card version** — the current snapshot of all 5 packs. This ensures evaluations always run against the latest approved identity definition.

If the character doesn't exist or has no active version, the pipeline fails immediately with a clear error. No card version means no evaluation criteria.

### Step 2: Consent Hard Gate

Before any evaluation logic runs, the pipeline checks **performer consent**. This is a hard gate — not a soft score. If the character has performer consent requirements (voice actors, likeness rights), the system verifies:

- **Temporal scope**: Is the consent still valid (not expired)?
- **Territorial scope**: Is the content being generated in a permitted territory?
- **Modality scope**: Does the consent cover this content type (text, voice, image)?
- **Usage scope**: Does the intended use match the consent terms?
- **Strike clause**: Has the performer or estate invoked a withdrawal?

If any check fails, the evaluation returns immediately with a **block** decision and a score of 0.0. No critics are run. This protects against generating content that violates consent agreements, regardless of how on-brand it might be.

### Step 3: Create Evaluation Run

The pipeline creates an `EvalRun` record — the container for this evaluation's results. It captures:

- Which character and card version are being evaluated
- What content was submitted (text, image reference, audio reference)
- The content modality (text, image, video, audio)
- Which franchise the character belongs to
- Timestamp and status tracking

This record is the audit trail. Every evaluation is logged, queryable, and traceable.

### Step 4: Sampling Gate

For high-volume production deployments, evaluating every single piece of content may be unnecessary or cost-prohibitive. The sampling gate provides a configurable shortcut:

- If the random draw falls within the sampling rate, evaluation continues normally
- If not, the run is marked as **sampled-pass** — assumed to pass without full evaluation

A 100% sampling rate means every piece of content is evaluated. A 10% rate means 1-in-10 gets full evaluation. The optimal rate depends on your risk tolerance, content volume, and evaluation budget.

### Step 5: Determine Applicable Critics

Not every critic applies to every evaluation. The pipeline resolves which critics to run by:

1. Loading critic configurations for the character's org, franchise, and character level
2. Filtering to enabled configurations only
3. Matching critic modality to the content modality (a text critic doesn't evaluate images)

This is where the hierarchical configuration system (Chapter 3) comes into play. A character might inherit 3 org-level critics, 2 franchise-level critics, and 1 character-specific critic.

### Step 6: Tiered Evaluation

For efficiency, the pipeline supports **tiered evaluation** — a rapid screen followed by full evaluation only when needed:

- **Rapid screen**: Run a fast, lightweight evaluation (perhaps 1-2 key critics). If the score is clearly passing (above threshold) or clearly failing (below threshold), stop here.
- **Full evaluation**: If the rapid screen score is in the ambiguous middle zone, run all critics for a complete assessment.

This reduces cost and latency for content that's obviously good or obviously bad, while reserving full evaluation power for borderline cases.

### Step 7: Parallel Critic Execution

Each applicable critic runs independently against the content. For each critic, the pipeline:

1. Assembles the prompt from the critic's template, substituting character card data
2. Sends the prompt to the LLM (or multiple LLMs — see Chapter 5)
3. Parses the response: numeric score (0.0-1.0) + reasoning text
4. Records the critic result with token usage and cost

Critics run in parallel when possible, reducing latency. Each critic result is stored as a `CriticResult` record linked to the evaluation run.

### Step 8: Finalize

The pipeline aggregates individual critic scores into a final result:

**Weighted average**: `overall_score = Σ(critic_score × weight) / Σ(weights)`

**Inter-critic agreement**: The pipeline calculates the standard deviation of critic scores. High disagreement (σ > 0.3) is flagged — it means critics saw very different things in the content, which may warrant human review.

**Brand analysis**: A summary of how the content performs across the five character identity dimensions (canon, legal, safety, visual, audio).

**Policy decision**: The overall score maps to a policy action:

| Score Range | Decision | What Happens |
|-------------|----------|-------------|
| >= 0.90 | **Pass** | Content is approved for use |
| 0.70 - 0.89 | **Regenerate** | Content should be regenerated with guidance |
| 0.50 - 0.69 | **Quarantine** | Content is held for human review |
| 0.30 - 0.49 | **Escalate** | Content is flagged for senior review |
| < 0.30 | **Block** | Content is rejected outright |

**Webhooks**: If configured, the pipeline fires webhook events to notify external systems of the evaluation result. (Chapter 10 covers webhooks.)

---

## The Five Policy Decisions Explained

Understanding when and why each policy action fires is critical for tuning your evaluation system.

### Pass (>= 0.90)

The content is consistent with the character's identity across all dimensions evaluated. No action needed — the content can be used as-is.

In practice, a pass doesn't mean the content is *perfect* — it means it's within acceptable bounds. Minor stylistic variations are expected and healthy. Evaluation should catch drift, not enforce robotic uniformity.

### Regenerate (0.70 - 0.89)

The content is mostly okay but has issues worth correcting. Common causes:

- Slightly off-voice dialogue that could be tightened
- Minor canon inaccuracies that are easy to fix
- Tone that's close but not quite right for the character

The regenerate decision is the system saying "try again with specific guidance." The evaluation result includes recommendations that can be fed back to the generation system.

### Quarantine (0.50 - 0.69)

The content has significant issues that automated systems can't resolve confidently. It needs human eyes. The content is held in the **Review Queue** (Chapter 6) until a reviewer claims, examines, and resolves it.

### Escalate (0.30 - 0.49)

The content has serious problems — potential brand damage, safety concerns, or major character violations. Escalation triggers higher-priority review and may involve senior brand managers or legal review.

### Block (< 0.30)

The content is fundamentally wrong or harmful. It's rejected immediately with no path to recovery. Common causes:

- Safety violations (harmful content from a children's character)
- Complete character identity failure (entirely wrong character behavior)
- Consent violations (already caught at Step 2, but can also surface in content analysis)

---

## Hands-On: Running Evaluations

Let's run three evaluations against Luke Skywalker to see the full spectrum of pipeline decisions.

### Navigate to Evaluations

Go to the **Evaluations** page. Select Luke Skywalker from the character dropdown. You'll use the text modality for these examples.

[SCREENSHOT: Evaluations page with character selector and evaluation form]

### Evaluation 1: Canon-Consistent Dialogue (Expecting: Pass)

Submit content that's clearly in character for Luke:

```
"The Force isn't just about power — it's about balance, about finding
the light even in the darkest places. My father found his way back.
That taught me that no one is ever truly lost."
```

This dialogue is consistent with Luke's character arc: his belief in redemption, his connection to the Force, his reference to Vader's return to the light. Expect a **pass** decision with a high overall score.

Look at the result breakdown:

- **Canon Fidelity**: High score — references established character themes
- **Voice Consistency**: High score — matches Luke's reflective, hopeful speech style
- **Force Lore**: High score — accurate Force philosophy
- **Faction Alignment**: High score — consistent with Jedi/Rebel perspective
- **Safety & Brand**: High score — appropriate content

[SCREENSHOT: Evaluation result showing Pass decision with high scores across all critics]

### Evaluation 2: Mildly Off-Brand (Expecting: Regenerate)

Now submit content with subtle issues:

```
"Yeah, the Force is pretty cool I guess. Vader was kind of a jerk but
whatever, people change. Hey, have you tried the new droid models?
They're way better than R2 units."
```

This content has Luke's general sentiments but the wrong voice — too casual, too modern, dismissive of his emotional connection to Vader and R2-D2. Expect a **regenerate** decision.

Examine the critic-level scores. Voice Consistency and Canon Fidelity will be lower, while Safety & Brand remains high (the content isn't harmful, just off-brand). The recommendation will suggest regenerating with more authentic voice characteristics.

[SCREENSHOT: Evaluation result showing Regenerate decision with mixed critic scores]

### Evaluation 3: Severely Off-Brand (Expecting: Block)

Finally, submit content that fundamentally violates Luke's character:

```
"The Jedi were fools. The dark side is the only true path to power.
I should have joined the Emperor when I had the chance. Compassion
is weakness — only strength matters."
```

This is the antithesis of Luke's character — it contradicts his core beliefs, his arc, and his faction alignment. Expect a **block** decision with low scores across Canon Fidelity, Voice Consistency, Faction Alignment, and Force Lore.

[SCREENSHOT: Evaluation result showing Block decision with low scores and red flags]

### Comparing All Three

The Evaluations page shows your run history. Compare the three runs side by side. Notice:

- The score distribution across critics changes dramatically
- The inter-critic agreement is high for clear pass/block cases but may drop for borderline content
- Each result includes natural-language reasoning explaining *why* the score is what it is

This explainability is one of the key advantages of LLM-based evaluation — you don't just get a number, you get a rationale that humans can review and verify.

[SCREENSHOT: Evaluation history showing all three runs with score columns and decision badges]

### Understanding the Brand Analysis

Each evaluation includes a brand analysis summary — a dimension-by-dimension assessment of how the content aligns with the character's identity. Expand the brand analysis section on any evaluation result to see:

- Canon alignment score and commentary
- Safety compliance assessment
- Voice consistency rating
- Overall brand health indicator

This high-level view is particularly useful for non-technical stakeholders who need to understand evaluation results without diving into individual critic scores.

[SCREENSHOT: Expanded brand analysis section showing dimension scores and commentary]

> **Key Takeaway**: The evaluation pipeline is an 8-step process: fetch card → check consent → create run → sample → determine critics → tiered eval → parallel critic execution → finalize. The final score maps to five policy actions (pass, regenerate, quarantine, escalate, block) that drive automated content decisions. Every step is logged, every score has reasoning, and every decision is auditable.
