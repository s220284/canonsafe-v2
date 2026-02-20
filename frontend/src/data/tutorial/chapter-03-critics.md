You now have structured character data in the 5-Pack. The next question is: how do you actually *evaluate* content against that data?

The answer is critics — specialized LLM-based judges, each focused on a specific evaluation dimension, each with its own prompt template and scoring rubric.

## The LLM-as-Judge Paradigm

Traditional content evaluation relies on rules: keyword blocklists, regex patterns, classifier models trained on labeled data. These approaches work for binary decisions (safe/unsafe) but fail at nuanced character evaluation. Is this dialogue "in character" for Luke Skywalker? Does this image "look right" for Ariel? These are judgment calls that require understanding context, not matching patterns.

The LLM-as-judge approach uses large language models as evaluators. Instead of writing rules, you write **prompt templates** that instruct the LLM on what to evaluate, what criteria to apply, and how to score. The character's 5-Pack data is injected into these prompts at evaluation time, giving the LLM the domain knowledge it needs to make character-specific judgments.

This approach has three major advantages:

1. **Nuance**: LLMs can assess subjective qualities like "does this sound like Vader?" in ways that rule-based systems cannot
2. **Adaptability**: Adding a new character or franchise means writing new card data, not new evaluation code
3. **Explainability**: LLMs can provide natural-language reasoning for their scores, creating an audit trail

And one major risk:

- **Bias**: A single LLM judge can have systematic biases (position bias, verbosity preference, model self-preference). Chapter 5 covers how to mitigate this.

## Anatomy of a Critic

Each critic in CanonSafe has:

| Component | Purpose |
|-----------|---------|
| **Name & Slug** | Human-readable identifier (e.g., "Force Lore", slug `sw-force-lore`) |
| **Prompt Template** | The evaluation instructions with variable placeholders |
| **Scoring Rubric** | What constitutes a 1.0, 0.7, 0.5, 0.3, or 0.0 |
| **Modality** | What content types this critic can evaluate (text, image, audio, multi) |
| **Weight** | How much this critic's score contributes to the final weighted average |

### Prompt Templates and Variable Substitution

A critic's prompt template is the core of its evaluation logic. It's a structured prompt that includes placeholders for character-specific data:

```
You are evaluating content for the character "{character_name}".

Character canon data:
{canon_pack}

Safety constraints:
{safety_pack}

Content to evaluate:
{content}

Score this content from 0.0 to 1.0 on canon fidelity.
Provide your reasoning.
```

At evaluation time, `{character_name}` becomes "Darth Vader", `{canon_pack}` becomes Vader's full canon JSON, and `{content}` becomes the AI-generated text being evaluated. The same critic template works for any character — the card data makes it character-specific.

This variable substitution is what makes the system scalable. You don't write a "Vader critic" and an "Ariel critic" — you write a "Canon Fidelity critic" that adapts to any character through its card data.

### Scoring Rubrics

Critics return a score between 0.0 and 1.0. But what does "0.7" mean? Without a rubric, scores are arbitrary. Each critic defines scoring anchors:

| Score Range | Meaning |
|-------------|---------|
| 0.9 - 1.0 | Excellent — fully consistent with character identity |
| 0.7 - 0.89 | Acceptable — minor deviations, could be improved |
| 0.5 - 0.69 | Concerning — noticeable issues that need human review |
| 0.3 - 0.49 | Poor — significant violations of character identity |
| 0.0 - 0.29 | Failing — content is fundamentally wrong or harmful |

These ranges map directly to policy actions in the evaluation pipeline (Chapter 4): pass, regenerate, quarantine, escalate, block.

### Weighted Scoring

Not all critics are equally important for every franchise. In a children's franchise, the Safety & Brand critic might carry the highest weight because protecting young audiences is paramount. In a lore-heavy franchise like Star Wars, Canon Fidelity might be weighted highest.

Weights are configured per **critic configuration** — the binding between a critic and a franchise/character:

| Critic | Weight (Star Wars) | Weight (Disney Princess) |
|--------|-------------------|------------------------|
| Canon Fidelity / Story Canon | 0.25 | 0.20 |
| Voice Consistency / Voice & Song | 0.20 | 0.20 |
| Safety & Brand / Family Safety | 0.20 | 0.30 |
| Faction/Cultural Alignment | 0.20 | 0.20 |
| Lore/Values Specialist | 0.15 | 0.10 |

The final evaluation score is a weighted average: `Σ(critic_score × weight) / Σ(weights)`.

### Hierarchical Configuration

Critic configurations cascade through three levels:

1. **Organization level**: Default critics and weights for all characters
2. **Franchise level**: Override weights or add franchise-specific critics
3. **Character level**: Override for specific characters who need special treatment

This hierarchy means you can set sensible defaults organization-wide, then specialize where needed — extra cultural sensitivity critics for certain characters, stricter safety weights for children's properties, additional lore critics for deep-canon franchises.

---

## Hands-On: Exploring Critics

### Star Wars Critics

Navigate to the **Critics** page. If you're logged into the Disney demo, you'll see critics for both franchises. The Star Wars franchise has five critics:

| Critic | Slug | What It Evaluates |
|--------|------|-------------------|
| Force Lore | `sw-force-lore` | Accuracy of Force mythology, Jedi/Sith lore, and galactic history |
| Faction Alignment | `sw-faction-alignment` | Whether characters stay true to their faction allegiance (Rebel, Empire, etc.) |
| Canon Fidelity | `sw-canon-fidelity` | Consistency with established Star Wars canon events and timeline |
| Voice Consistency | `sw-voice-consistency` | Whether dialogue matches the character's speech patterns and personality |
| Safety & Brand | `sw-safety-brand` | Brand safety, content rating compliance, real-world harm prevention |

Click into any critic to see its prompt template. Notice how the template references card data variables — the same template evaluates dialogue for Luke, Vader, Yoda, or any other Star Wars character.

[SCREENSHOT: Star Wars critics grid showing all 5 critics with slugs and descriptions]

### Disney Princess Critics

Now filter or scroll to the Disney Princess critics. Notice how they're tailored to a completely different franchise:

| Critic | Slug | What It Evaluates |
|--------|------|-------------------|
| Princess Values | `dp-princess-values` | Alignment with modern Disney Princess brand values (courage, kindness, agency) |
| Cultural Authenticity | `dp-cultural-authenticity` | Respectful representation of cultural elements (especially for Moana, Jasmine, Mulan, Tiana, Pocahontas, Merida) |
| Story Canon | `dp-story-canon` | Consistency with each princess's established story |
| Voice & Song | `dp-voice-song` | Voice characterization including signature songs and musical identity |
| Family Safety & Brand | `dp-safety-brand` | G-rated content compliance, age-appropriate language, brand safety |

The Cultural Authenticity critic is particularly interesting — it only exists because the Disney Princess franchise includes characters from diverse cultural backgrounds. This is hierarchical configuration in action: a franchise-level critic that wouldn't make sense at the organization level.

[SCREENSHOT: Disney Princess critics grid showing all 5 critics]

### Critic Detail and Configuration

Click into a critic to see its full configuration. You'll find:

- The prompt template with variable placeholders
- The scoring rubric
- The weight assigned to this critic within its franchise
- Whether it's enabled or disabled

[SCREENSHOT: Critic detail view showing prompt template with {character_name} and {canon_pack} variables]

### Understanding Evaluation Profiles

An **Evaluation Profile** bundles critic configurations for a specific use case. For example, you might have a "Quick Screen" profile with 2 lightweight critics and a "Full Evaluation" profile with all 5. Profiles also control sampling rate and tiered evaluation settings.

Navigate to the profile configuration to see how critics are grouped and weighted within profiles.

[SCREENSHOT: Evaluation Profile showing critic selection and weight configuration]

> **Key Takeaway**: Critics are the evaluation engine's brain. Each critic is a specialized LLM-based judge with a prompt template, scoring rubric, and configurable weight. The same critic template works for any character through variable substitution of 5-Pack data. Critics are configured hierarchically (org → franchise → character) and grouped into evaluation profiles.
