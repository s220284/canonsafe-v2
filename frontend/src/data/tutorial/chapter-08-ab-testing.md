You've tuned a critic's prompt template. Pass rates went from 78% to 84%. Is that a real improvement or random noise?

You've increased the weight of the Safety critic. Escalation rates dropped. But did overall quality change?

You've switched from a single LLM provider to dual-provider evaluation. Scores shifted. Are they more accurate or just different?

Without statistical rigor, you're guessing. A/B testing replaces intuition with evidence.

## Why Intuition Fails in Eval Tuning

Evaluation systems have multiple interacting parameters: critic prompt templates, scoring rubrics, weights, sampling rates, tiered evaluation thresholds, and model provider selection. Changing any one parameter affects downstream metrics in ways that are hard to predict.

Human intuition is particularly bad at judging:

- **Random variation**: Small sample sizes produce noisy metrics. A 6% improvement across 50 evaluations might reverse with the next 50.
- **Confounding variables**: You changed the prompt template *and* the evaluation content changed (different time of day, different users, different character distribution). Which caused the metric shift?
- **Regression to the mean**: If you measure after a particularly bad week, almost any change will look like an improvement.

A/B testing isolates the variable you changed by randomly assigning evaluations to a control group (old configuration) and a treatment group (new configuration), then applying statistical tests to determine whether the observed difference is real.

## Two-Sample Z-Test for Pass Rates

The most common A/B test in evaluation tuning compares pass rates between two configurations.

**Setup**:
- Control: Current critic configuration (e.g., original prompt template)
- Treatment: New critic configuration (e.g., revised prompt template)
- Metric: Pass rate (proportion of evaluations scoring >= 0.90)

**The test**: A two-sample z-test for proportions determines whether the difference in pass rates is statistically significant.

The z-statistic formula:

```
z = (p_treatment - p_control) / sqrt(p_pooled * (1 - p_pooled) * (1/n_treatment + 1/n_control))
```

Where `p_pooled = (passes_treatment + passes_control) / (n_treatment + n_control)`.

**Interpretation**:
- p-value < 0.05 → the difference is statistically significant at 95% confidence
- p-value >= 0.05 → you cannot conclude the difference is real (it might be noise)

**Critical nuance**: "Not significant" doesn't mean "no difference" — it means you don't have enough evidence yet. More data may reveal a real difference that wasn't detectable with the current sample size.

## Welch's T-Test for Score Means

Sometimes you care about average scores, not just pass rates. For example: did the new prompt template produce higher average scores, even if the pass rate didn't change significantly?

Welch's t-test compares means when the two groups may have different variances (which is common in evaluation data).

The t-statistic formula:

```
t = (mean_treatment - mean_control) / sqrt(var_treatment/n_treatment + var_control/n_control)
```

Degrees of freedom are calculated using the Welch-Satterthwaite equation (handled automatically by the system).

Welch's t-test is more conservative than Student's t-test because it doesn't assume equal variances. In evaluation data, variances are often unequal — a stricter critic configuration might have lower variance (scores clustered around the middle) while a looser one has higher variance (more extreme scores).

## Sample Size Considerations

Statistical tests need enough data to detect real differences. The required sample size depends on:

- **Effect size**: How large is the difference you want to detect? A 2% improvement in pass rate requires far more data than a 20% improvement.
- **Desired confidence**: 95% confidence (p < 0.05) is standard; 99% (p < 0.01) requires more data.
- **Base rate**: If your current pass rate is 95%, detecting a 2-point improvement to 97% requires very large samples (because the difference is small relative to the base).

**Rule of thumb**: For typical evaluation A/B tests, aim for at least 100 evaluations per group. For detecting small differences (< 5%), you may need 500+ per group.

Don't stop the test early when you see a "significant" result — this inflates false positive rates. Decide your sample size in advance and run the full experiment.

## Designing Good Experiments

Effective A/B tests in evaluation require:

### Clear Hypothesis
"Changing the Canon Fidelity critic's prompt to include explicit scoring anchors will increase pass rates by at least 5 percentage points."

### Single Variable
Change one thing at a time. If you change the prompt template *and* the weight simultaneously, you won't know which change caused the outcome.

### Random Assignment
Evaluations must be randomly assigned to control or treatment groups. If all morning evaluations go to control and afternoon to treatment, time-of-day effects confound your results.

### Sufficient Duration
Run the experiment long enough to capture normal variation in content. A test that runs only during a low-traffic period may not generalize.

---

## Hands-On: Running an A/B Experiment

### Creating an Experiment

Navigate to the **A/B Testing** page (under Quality in the sidebar). Click to create a new experiment.

Configure:

- **Name**: Give your experiment a descriptive name (e.g., "Canon Fidelity prompt v2 vs v1")
- **Control configuration**: The current critic configuration
- **Treatment configuration**: The modified configuration you want to test
- **Target metric**: Pass rate, average score, or a specific critic's score
- **Sample size target**: How many evaluations per group before concluding

[SCREENSHOT: A/B experiment creation form with control and treatment configuration fields]

### Running Trials

Once the experiment is active, evaluations for the target character(s) are randomly assigned to control or treatment. Each evaluation records which group it was in and the resulting score.

The experiment page shows running totals:

- Evaluations in each group
- Current pass rate per group
- Current average score per group
- Running p-value (though remember: don't act on it until sample size is reached)

[SCREENSHOT: Running A/B experiment showing trial counts, current metrics, and progress toward sample size]

### Interpreting Results

When the experiment reaches its target sample size, the results page shows:

**Pass Rate Comparison (Z-Test)**:
- Control pass rate: e.g., 0.78 (78%)
- Treatment pass rate: e.g., 0.85 (85%)
- Z-statistic: e.g., 2.34
- P-value: e.g., 0.019
- Verdict: "Statistically significant at p < 0.05" or "Not significant"

**Score Mean Comparison (T-Test)**:
- Control mean: e.g., 0.812
- Treatment mean: e.g., 0.847
- T-statistic: e.g., 2.89
- P-value: e.g., 0.004
- Verdict with confidence level

**Winner indicator**: If the result is significant, the system indicates which configuration won and by how much.

[SCREENSHOT: Completed A/B experiment results showing p-value, statistical significance, and winner badge]

### Acting on Results

If the treatment wins with statistical significance:

1. Update the critic configuration to use the new settings permanently
2. Document the change (what changed, what the measured impact was)
3. Monitor post-change metrics for a week to confirm the improvement holds in production

If the result is not significant:

1. Either increase sample size and continue the experiment, or
2. Conclude that the change has no meaningful impact and try a different approach

If the control wins:

1. The change made things worse. Revert and investigate why.

> **Key Takeaway**: A/B testing replaces intuition with statistical evidence when tuning evaluation configurations. Two-sample z-tests compare pass rates; Welch's t-tests compare average scores. Both require sufficient sample sizes to produce reliable results. Design experiments with clear hypotheses, single variables, random assignment, and predetermined sample sizes. Don't stop tests early based on interim results.
