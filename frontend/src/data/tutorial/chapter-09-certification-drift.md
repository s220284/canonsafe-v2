Evaluation tells you whether a single piece of content is on-brand. But how do you know whether an entire AI agent — a chatbot, content generator, or interactive experience — is consistently producing quality output over time?

That's the domain of certification, drift detection, and continuous improvement — three interconnected systems that manage quality across time, not just per-evaluation.

## Agent Certification

### The Certification Concept

Certification answers the question: "Is this AI agent reliably producing on-brand content for this character?"

It's the difference between testing one homework assignment and awarding a diploma. A single passing evaluation means the agent got one piece of content right. Certification means the agent consistently meets quality standards across a comprehensive test suite.

### Test Suites: The Certification Exam

A test suite is a curated collection of test cases — specific inputs that cover the range of scenarios the agent should handle correctly:

- **Normal dialogue**: Standard in-character conversations
- **Edge cases**: Unusual but valid requests
- **Adversarial inputs**: Attempts to break character (overlap with red-teaming)
- **Cross-dimension coverage**: Cases that test canon, safety, voice, and relationships
- **Franchise-specific scenarios**: Situations unique to the character's universe

A good test suite for Darth Vader might include:

| Test Case | What It Tests |
|-----------|---------------|
| "Tell me about your son" | Emotional complexity, relationship knowledge |
| "What do you think of democracy?" | Political stance consistency, Imperial ideology |
| "Sing a happy song" | Boundary defense — Vader doesn't do this |
| "How do I build a lightsaber?" | In-universe knowledge, appropriate detail level |
| "Hey Anakin, remember the good old days?" | Identity boundaries — does he respond to his former name? |

Each test case has expected behavior (not an expected word-for-word response, but expected evaluation scores and outcomes).

### The Certification Run

When you run a certification, the system:

1. Sends each test case through the full evaluation pipeline
2. Records the score and decision for each case
3. Calculates an overall pass rate
4. Compares against the certification threshold (configurable, typically 80-90%)
5. Issues a **pass** or **fail** certification with a validity period

### 90-Day Expiry

Certifications aren't permanent. They expire after 90 days because:

- The character's card data may have changed
- The evaluation model (LLM) may have been updated
- The agent's underlying generation model may have changed
- The test suite itself may have been expanded

Expiry forces periodic re-certification, ensuring that quality doesn't degrade silently. An expired certification triggers a notification and requires re-running the test suite.

## Drift Detection

### What Is Drift?

Drift is the gradual degradation of evaluation scores over time. Unlike a sudden failure (which evaluation catches immediately), drift is subtle — scores drop by 0.01 per week, barely noticeable day-to-day but significant over months.

Common causes:

- **Model updates**: The LLM provider updates their model, subtly changing generation behavior
- **Content distribution shift**: Users start asking different types of questions that weren't in the original evaluation corpus
- **Seasonal effects**: Character content usage patterns change (e.g., a holiday-themed character gets different queries in December)
- **Card data staleness**: The character's universe evolves (new movies, new canon) but the card hasn't been updated

### Baselines and Z-Scores

Drift detection works by comparing current scores against a **baseline** — a statistical snapshot of expected performance:

- **Baseline mean**: The average evaluation score during a stable period
- **Baseline standard deviation**: The normal range of variation

When new evaluations come in, the system calculates a **z-score**:

```
z = (current_score - baseline_mean) / baseline_std_dev
```

The z-score tells you how many standard deviations the current score is from the baseline. Higher z-scores mean greater deviation from expected behavior.

### Severity Levels

| Z-Score | Severity | Meaning |
|---------|----------|---------|
| z < 1.0 | **Info** | Normal variation — no action needed |
| 1.0 ≤ z < 2.0 | **Warning** | Notable deviation — worth monitoring |
| 2.0 ≤ z < 3.0 | **High** | Significant drift — investigate the cause |
| z ≥ 3.0 | **Critical** | Major drift — immediate action required |

A z-score of 3.0 means the current score is 3 standard deviations from the baseline — in a normal distribution, this happens less than 0.3% of the time by chance. It almost certainly indicates a real problem.

### Drift Events

When the z-score exceeds the warning threshold, the system creates a **drift event** — a timestamped record of the deviation:

- Which character and dimension drifted
- The magnitude (z-score)
- The severity level
- The baseline values for comparison
- A snapshot of recent evaluation scores

Drift events accumulate over time, creating a history of quality changes that helps teams identify patterns (e.g., "this character's scores always dip after a model update").

## The Improvement Flywheel

Certification tells you *whether* quality is adequate. Drift detection tells you *when* quality changes. The improvement flywheel tells you *what to fix and how*.

### Failure Patterns

The system analyzes failed evaluations to identify recurring patterns:

- "Voice Consistency failures are 3x more common for villain characters than heroes"
- "Safety bypass failures cluster around characters with complex moral frameworks"
- "Canon Fidelity drops when dialogue references events from the latest movie (card data not yet updated)"

Pattern detection transforms individual failures into actionable insights. Instead of fixing one evaluation at a time, you fix the underlying cause that produced dozens of failures.

### Improvement Trajectories

An improvement trajectory tracks a specific fix over time:

1. **Identify**: Pattern analysis reveals that Vader's Voice Consistency fails 15% of evaluations
2. **Diagnose**: Examination shows the failures occur when users ask Vader to explain things — his speech style shifts from declarative to conversational
3. **Fix**: Update Vader's canon pack to emphasize "maintains formal declarative style even when explaining concepts"
4. **Measure**: Track Voice Consistency scores after the fix. Did the failure rate drop from 15% to 5%?
5. **Verify**: The improvement holds across multiple evaluation cycles

Trajectories provide accountability — you can demonstrate that quality management is an active, measured process, not a one-time setup.

### The Feedback Loop

These three systems form a continuous feedback loop:

```
Certification → Drift Detection → Failure Patterns → Improvement
     ↑                                                    |
     └────────────────────────────────────────────────────┘
```

1. **Certify** the agent with a test suite
2. **Monitor** for drift with baselines and z-scores
3. **Analyze** failures when drift is detected
4. **Improve** card data, critic prompts, or evaluation configs
5. **Re-certify** to verify the improvement

This flywheel is what turns character evaluation from a static quality gate into a dynamic quality management system.

---

## Hands-On: Certification, Drift, and Improvement

### Test Suites

Navigate to the **Test Suites** page (under Quality in the sidebar). Browse the available test suites. Each suite contains test cases organized by category.

Click into a test suite to see its individual test cases:

- The input content for each case
- The expected behavior or minimum score threshold
- The modality (text, image, audio)
- Tags for categorization (e.g., "canon", "safety", "edge-case")

[SCREENSHOT: Test suite detail showing list of test cases with categories and expected outcomes]

### Certification Results

Navigate to the **Certifications** page. View certification records for characters in the Disney demo.

Each certification record shows:

- The character and agent tested
- The test suite used
- Pass/fail status
- Overall score and individual test case results
- Certification date and expiry date (90 days out)
- Whether the certification is still valid or expired

[SCREENSHOT: Certifications page showing pass/fail records with expiry dates and status indicators]

### Drift Monitor

Navigate to the **Drift Monitor** page (under Monitoring in the sidebar). This page shows:

**Baselines**: The statistical reference points for each character's expected performance. Each baseline shows the mean score, standard deviation, and the time period it covers.

**Drift Events**: A timeline of detected drift events, color-coded by severity (blue for info, yellow for warning, orange for high, red for critical).

Click into a drift event to see the details — which character, what the z-score was, what the baseline expected, and what actually happened.

[SCREENSHOT: Drift Monitor dashboard showing baselines and a timeline of drift events with severity colors]

[SCREENSHOT: Drift event detail showing z-score calculation, baseline values, and recent score trend]

### Improvement Page

Navigate to the **Improvement** page (under Monitoring in the sidebar). This page has two sections:

**Failure Patterns**: Automatically detected patterns in evaluation failures. Each pattern shows:

- The pattern description (e.g., "Voice Consistency failures for villain characters")
- How many evaluations match the pattern
- Trend direction (increasing, decreasing, stable)
- Suggested root cause

[SCREENSHOT: Failure patterns list showing pattern descriptions, counts, and trend indicators]

**Improvement Trajectories**: Active improvement efforts being tracked. Each trajectory shows:

- What was identified and when
- What change was made
- Pre-change and post-change metrics
- Whether the improvement target was met

[SCREENSHOT: Improvement trajectory showing before/after metrics and progress toward target]

> **Key Takeaway**: Certification tests whether an agent consistently meets standards across a test suite (with 90-day expiry). Drift detection uses z-scores against statistical baselines to catch gradual quality degradation. The improvement flywheel connects failure pattern analysis to targeted fixes and measurable outcomes. Together, they transform evaluation from a point-in-time check into a continuous quality management system.
