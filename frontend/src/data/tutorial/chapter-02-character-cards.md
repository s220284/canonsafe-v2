Before you can evaluate AI-generated character content, you need a precise, machine-readable definition of what that character *is*. Not a vague creative brief — a structured data model that captures every dimension an evaluation system needs to check.

This is the Character Card, and it's the foundation everything else in evaluation is built on.

## Why Structure Matters

Consider how a human brand manager evaluates character content. They hold a mental model of the character — personality, speech patterns, visual look, safety constraints, legal restrictions — and compare content against that model. The evaluation is implicit, holistic, and impossible to automate.

To make evaluation automated, you need to externalize that mental model into explicit, structured data. Each dimension becomes a separate data pack that critics can reference independently:

- "Is this dialogue consistent with the character's voice?" → check the **canon pack**
- "Does this image use the right art style and colors?" → check the **visual identity pack**
- "Does this content violate any safety constraints?" → check the **safety pack**
- "Are we legally allowed to use this character this way?" → check the **legal pack**
- "Does the audio match the character's speech patterns?" → check the **audio identity pack**

This decomposition is deliberate. It means you can have different critics check different dimensions, weight them differently per franchise, and pinpoint exactly which dimension failed when something goes wrong.

## The 5-Pack System

Every character in CanonSafe has a Card Version that contains five structured JSON packs:

### 1. Canon Pack — Who the Character Is

The canon pack captures the character's factual identity: biographical facts, voice/personality description, and relationships.

```json
{
  "facts": [
    {
      "fact_id": "age",
      "value": "4 years old",
      "source": "Series Bible",
      "confidence": 1.0
    }
  ],
  "voice": {
    "personality_traits": ["cheerful", "confident"],
    "tone": "upbeat and enthusiastic",
    "speech_style": "simple, age-appropriate",
    "vocabulary_level": "simple",
    "catchphrases": [
      { "phrase": "I love jumping in muddy puddles!", "frequency": "often" }
    ],
    "emotional_range": "Joy, excitement, occasional frustration"
  },
  "relationships": [
    {
      "character_name": "George Pig",
      "relationship_type": "sibling",
      "description": "Younger brother"
    }
  ]
}
```

Every fact has a confidence score and source attribution. This matters for evaluation: a critic checking canon can weigh high-confidence facts more heavily than speculative ones.

### 2. Legal Pack — What's Legally Permitted

The legal pack captures rights holder information, performer consent status, and usage restrictions.

```json
{
  "rights_holder": {
    "name": "Lucasfilm / Disney",
    "territories": ["Worldwide"]
  },
  "performer_consent": {
    "type": "AI_VOICE_REFERENCE",
    "performer_name": "James Earl Jones (estate)",
    "scope": "AI-generated voice for licensed products",
    "restrictions": ["No political content", "No parody without approval"]
  },
  "usage_restrictions": {
    "commercial_use": true,
    "attribution_required": true,
    "derivative_works": false
  }
}
```

This isn't just metadata — it's a **hard gate** in the evaluation pipeline. If consent verification fails, the evaluation blocks immediately without running any critics. More on this in Chapter 4.

### 3. Safety Pack — What's Off-Limits

The safety pack defines content ratings, prohibited topics, required disclosures, and age-gating rules.

```json
{
  "content_rating": "G",
  "prohibited_topics": [
    {
      "topic": "violence",
      "severity": "strict",
      "rationale": "Children's brand — no depictions of violence"
    },
    {
      "topic": "adult_humor",
      "severity": "strict",
      "rationale": "Target audience is ages 2-5"
    }
  ],
  "required_disclosures": [
    "This is an AI-generated character experience"
  ],
  "age_gating": {
    "enabled": false,
    "minimum_age": 0,
    "recommended_age": "2-5 years"
  }
}
```

Notice how the safety pack differs dramatically between franchises. A G-rated children's character has strict prohibitions on violence and adult content. A PG-13 Star Wars villain like Darth Vader has different constraints — violence within canon context is acceptable, but real-world harmful advice is not.

### 4. Visual Identity Pack — How the Character Looks

```json
{
  "art_style": "2D animated, simple shapes",
  "color_palette": ["Pink", "Red", "Light Pink"],
  "species": "pig",
  "clothing": "Red dress",
  "distinguishing_features": ["Round snout", "Rosy cheeks", "Top-of-head eyes"]
}
```

This pack drives image and video evaluation. When a multi-modal critic examines a generated image, it checks whether the art style, colors, and distinguishing features match the card.

### 5. Audio Identity Pack — How the Character Sounds

```json
{
  "tone": "deep, commanding, mechanical resonance",
  "speech_style": "formal, declarative, measured pauses",
  "catchphrases": [
    "I find your lack of faith disturbing.",
    "The Force is strong with this one."
  ],
  "emotional_range": "Controlled anger, cold authority, rare moments of conflict"
}
```

For characters with signature voices — Darth Vader's breathing, Ariel's singing, Yoda's inverted syntax — the audio identity pack provides the evaluation baseline.

## Version Control for Identity

Character identity isn't static. A character might evolve across seasons, films, or franchise decisions. CanonSafe handles this with **Card Versions** — each version is a complete snapshot of all 5 packs, and versions are immutable once created.

This means:

- You can **compare** evaluations across versions (did the new canon pack improve pass rates?)
- You can **audit** which version was active when a specific evaluation ran
- You can **roll back** to a previous version if a change causes problems
- You can **A/B test** two versions to measure impact (Chapter 8)

---

## Hands-On: Exploring Character Cards

### Darth Vader — A Complex Villain

Navigate to **Characters** and click on Darth Vader. The Character Workspace opens with the 5-Pack viewer.

**Canon Pack**: Notice the rich relationship data — connections to Luke, Leia, Palpatine, Obi-Wan. The voice section captures Vader's formal, commanding speech style with iconic catchphrases. These facts are what a Canon Fidelity critic uses to judge whether generated dialogue sounds like Vader.

[SCREENSHOT: Vader Character Workspace — Canon Pack tab showing facts, voice, relationships]

**Safety Pack**: Vader is rated PG-13, not G. Violence within canon context (lightsaber combat, Force choke) is acknowledged, but real-world harmful advice is strictly prohibited. This nuance — allowing in-universe darkness while preventing real-world harm — is exactly what structured safety packs enable.

[SCREENSHOT: Vader Safety Pack showing PG-13 rating and prohibited topics]

### Ariel — A Children's Brand Character

Now navigate to Ariel (Disney Princess franchise). Compare her 5-pack to Vader's.

**Audio Identity Pack**: Ariel's pack references her signature song "Part of Your World" and describes a warm, curious vocal quality. This is the kind of data that an audio evaluation critic uses — not just "does it sound right?" but "does it match the specific vocal characteristics defined in the card?"

[SCREENSHOT: Ariel Audio Identity Pack showing signature songs and vocal qualities]

**Safety Pack**: G-rated, with strict prohibitions on violence, adult content, and any romantic content beyond age-appropriate levels. The contrast with Vader's PG-13 pack illustrates why safety configuration must be per-character, not per-system.

### Cultural Sensitivity: Moana and Jasmine

Navigate to Moana or Jasmine and examine their safety packs. These characters have additional cultural sensitivity protections — prohibitions on cultural mockery, historical revisionism, and stereotyping. This is tagged data that activates the Cultural Authenticity critic with heightened scrutiny.

[SCREENSHOT: Moana or Jasmine safety pack showing cultural sensitivity protections]

### Version History

On any character's workspace, check the version history panel. You can see when card versions were created, what changed, and which version is currently active. In production, teams use this to track how character definitions evolve over time and correlate changes with evaluation outcomes.

[SCREENSHOT: Version history panel showing multiple card versions with timestamps]

> **Key Takeaway**: The 5-Pack system decomposes character identity into five structured dimensions — canon, legal, safety, visual, and audio. This structure enables automated evaluation: each dimension can be checked independently by specialized critics, and each failure can be precisely diagnosed and tracked.
