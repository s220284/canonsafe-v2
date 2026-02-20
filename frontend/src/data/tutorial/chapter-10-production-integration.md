Everything you've learned so far — character cards, critics, the evaluation pipeline, review queues, red-teaming, A/B testing, certification, drift monitoring — is useful only if it's integrated into the systems that actually generate and serve AI character content.

This chapter covers how to connect CanonSafe to production pipelines.

## Four Integration Patterns

There's no single "right" way to integrate character evaluation into production. The best pattern depends on your architecture, latency requirements, and risk tolerance.

### 1. SDK Integration (Direct API Calls)

The simplest pattern: your application calls the CanonSafe API directly before serving content.

```python
import requests

def generate_and_evaluate(character_id, prompt):
    # Step 1: Generate content with your AI system
    generated_content = my_ai_system.generate(prompt)

    # Step 2: Evaluate with CanonSafe
    response = requests.post(
        "https://your-canonsafe-instance.com/api/evaluations/run",
        headers={"Authorization": "Bearer YOUR_TOKEN"},
        json={
            "character_id": character_id,
            "content": generated_content,
            "modality": "text"
        }
    )
    result = response.json()

    # Step 3: Act on the decision
    if result["decision"] == "pass":
        return generated_content
    elif result["decision"] == "regenerate":
        return generate_and_evaluate(character_id, prompt)  # retry
    else:
        return fallback_response(character_id)
```

**Best for**: Applications where you control the generation code and can add API calls inline.

**Trade-off**: Adds latency to every request (evaluation takes 1-5 seconds depending on critic count and LLM provider response time).

### 2. Sidecar Pattern (Process-Level Proxy)

A sidecar process sits alongside your application and intercepts AI-generated content before it reaches the user. The application doesn't know about evaluation — the sidecar handles it transparently.

```
[User Request] → [AI App] → [Generated Content] → [Sidecar] → [CanonSafe API]
                                                      ↓
                                              [Pass? Serve] or [Block? Fallback]
```

**Best for**: Microservice architectures where you want evaluation without modifying application code.

**Trade-off**: Requires infrastructure to deploy and manage the sidecar process.

### 3. Webhook Pattern (Async Evaluation)

For non-real-time use cases, your application generates content, sends it for evaluation asynchronously, and receives the result via webhook callback.

```python
# Step 1: Submit for async evaluation
requests.post(
    "https://your-canonsafe-instance.com/api/apm/evaluate",
    json={
        "character_id": character_id,
        "content": generated_content,
        "modality": "text",
        "callback_url": "https://your-app.com/webhooks/eval-result"
    }
)

# Step 2: Receive webhook with result (later)
# POST https://your-app.com/webhooks/eval-result
# {
#   "eval_run_id": 1234,
#   "decision": "pass",
#   "overall_score": 0.92,
#   ...
# }
```

**Best for**: Batch content pipelines, content moderation queues, and cases where evaluation latency isn't user-facing.

**Trade-off**: Content is served before evaluation completes (or held in a queue until evaluation returns).

### 4. Gateway Filter (Infrastructure-Level)

Evaluation runs as a filter in your API gateway or CDN. All content passes through the gateway, which routes it to CanonSafe for evaluation before forwarding to the client.

**Best for**: Organizations with existing API gateway infrastructure (Kong, Envoy, AWS API Gateway).

**Trade-off**: Most complex to set up; requires gateway plugin development.

## The Evaluate/Enforce Two-Step Pattern

Regardless of which integration pattern you use, the interaction with CanonSafe follows a two-step pattern:

### Step 1: Evaluate

Submit content for evaluation and receive a score + decision.

```bash
curl -X POST "https://your-canonsafe.com/api/apm/evaluate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 42,
    "content": "I am your father.",
    "modality": "text"
  }'
```

Response:
```json
{
  "eval_run_id": 1234,
  "overall_score": 0.94,
  "decision": "pass",
  "critic_scores": {
    "canon-fidelity": 0.97,
    "voice-consistency": 0.92,
    "safety-brand": 0.95
  }
}
```

### Step 2: Enforce

Your application reads the decision and acts accordingly. The enforce step is *your* responsibility — CanonSafe tells you what it thinks; your application decides what to do.

Common enforcement strategies:

| Decision | Enforcement Action |
|----------|-------------------|
| Pass | Serve content to user |
| Regenerate | Re-generate with eval feedback as additional guidance |
| Quarantine | Hold content, serve fallback, await human review |
| Escalate | Block content, serve fallback, alert brand team |
| Block | Block content, serve generic fallback, log incident |

The separation of evaluate and enforce means CanonSafe doesn't need write access to your application or content pipeline. It's a read-only advisor — your systems remain in control.

## Webhook Security (HMAC-SHA256)

When CanonSafe sends webhook notifications to your systems, the payloads are signed with HMAC-SHA256 to prevent tampering.

Each webhook subscription has a unique secret. When CanonSafe sends a webhook:

1. It computes `HMAC-SHA256(payload_body, subscription_secret)`
2. It includes the signature in the `X-Webhook-Signature` header
3. Your receiver verifies the signature before processing

```python
import hmac
import hashlib

def verify_webhook(payload_body, signature_header, secret):
    expected = hmac.new(
        secret.encode(),
        payload_body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature_header)
```

### Auto-Deactivation

If a webhook delivery fails 5 consecutive times (target returns 4xx/5xx or times out), the subscription is automatically deactivated to prevent wasted resources. You can reactivate it from the webhook configuration page after fixing the target endpoint.

## Multi-Modal Evaluation

Text is the most common modality, but CanonSafe also supports:

### Image Evaluation

Images are evaluated using vision-capable LLMs (GPT-4o). The evaluation checks the image against the character's visual identity pack:

- Art style consistency
- Color palette accuracy
- Distinguishing features present
- Character proportions and design elements

```bash
curl -X POST "https://your-canonsafe.com/api/multimodal/evaluate" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "character_id": 42,
    "content_url": "https://example.com/generated-vader.png",
    "modality": "image"
  }'
```

### Audio Evaluation

Audio content is checked against the audio identity pack:

- Tone and speech style consistency
- Catchphrase usage appropriateness
- Emotional range matching
- Vocal quality characteristics

### Video Evaluation

Video evaluation combines visual and audio checks, plus temporal consistency — does the character maintain identity across the full video duration?

## Cost Monitoring

LLM-based evaluation has real costs — each critic invocation consumes API tokens. CanonSafe tracks:

- **Per-critic token usage**: Prompt tokens and completion tokens for each critic evaluation
- **Estimated cost**: Based on the provider's per-token pricing
- **Aggregate analytics**: Total evaluation cost by character, franchise, time period

This data helps you:

- Budget for evaluation costs at scale
- Identify expensive critics (consider whether they justify their cost)
- Optimize prompt lengths to reduce token consumption
- Choose between tiered evaluation (cheap rapid screen, expensive full eval) and full evaluation for everything

---

## Hands-On: Production Integration Features

### APM Page

Navigate to the **APM** (Agentic Pipeline Middleware) page. This is the integration hub showing the evaluate and enforce endpoints, along with code examples for each integration pattern.

[SCREENSHOT: APM page showing evaluate endpoint documentation and code examples]

The page provides:

- Endpoint URLs and authentication requirements
- Request/response schemas
- Code snippets in Python and cURL
- Configuration for evaluate/enforce behavior

### Webhook Configuration

Navigate to the webhook configuration (accessible from the APM page or Settings). Here you can:

- Create webhook subscriptions with target URLs
- Set the events you want to receive (evaluation completed, certification expired, drift detected)
- View the webhook secret for HMAC verification
- See delivery history (successful and failed deliveries)

[SCREENSHOT: Webhook configuration showing subscriptions list with target URLs and event types]

Click into a subscription to see its delivery history — each delivery shows the payload, response status, and timing.

[SCREENSHOT: Webhook delivery history showing individual deliveries with status codes and timestamps]

### Multi-Modal Evaluation

Navigate to the **Multi-Modal** page (under Evaluation in the sidebar). This page provides an interface for evaluating non-text content:

- Upload or link to images for visual evaluation
- Submit audio content for voice evaluation
- Results show dimension-specific scores from the visual identity or audio identity pack

[SCREENSHOT: Multi-Modal evaluation page showing image upload and visual identity evaluation results]

### API Documentation

Navigate to the **API Docs** page for comprehensive API documentation covering all endpoints. This is your reference for building integrations:

- Authentication methods
- All evaluation endpoints with request/response schemas
- Character management API
- Webhook management API
- Error handling conventions

[SCREENSHOT: API Docs page showing endpoint categories and interactive documentation]

## Putting It All Together

Here's the complete production integration checklist:

1. **Set up characters**: Define character cards with full 5-pack data
2. **Configure critics**: Set up evaluation profiles with appropriate critics and weights
3. **Run initial evaluations**: Verify the pipeline produces sensible results
4. **Red-team test**: Probe for adversarial vulnerabilities
5. **Certify**: Run test suites to establish baseline quality
6. **Set up drift monitoring**: Create baselines for ongoing monitoring
7. **Integrate**: Connect your production pipeline via SDK, sidecar, webhook, or gateway
8. **Configure webhooks**: Set up notifications for key events
9. **Monitor costs**: Track evaluation spend and optimize
10. **Iterate**: Use A/B testing and the improvement flywheel to continuously improve

This is not a one-time setup. Character evaluation is an ongoing discipline — like security testing, it's most effective when it's continuous, measured, and responsive to change.

> **Key Takeaway**: Four integration patterns (SDK, sidecar, webhook, gateway filter) connect evaluation to production pipelines. The evaluate/enforce separation keeps CanonSafe as a read-only advisor while your application retains control. HMAC-SHA256 webhook signing ensures secure async communication. Multi-modal evaluation extends coverage to images, audio, and video. Cost monitoring keeps evaluation spend visible and optimizable.
