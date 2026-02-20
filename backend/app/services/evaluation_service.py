"""Evaluation engine — orchestrates multi-critic, multi-modal evaluation."""
from __future__ import annotations

import math
import random
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.core import (
    Critic,
    CriticResult,
    EvalResult,
    EvalRun,
    EvaluationProfile,
    CharacterCard,
    CardVersion,
)
from app.schemas.evaluations import EvalRequest
from app.services import critic_service, consent_service, character_service


async def evaluate(db: AsyncSession, request: EvalRequest, org_id: int) -> EvalRun:
    """Run a full evaluation pipeline."""
    # 1. Get character and active version
    character = await character_service.get_character(db, request.character_id, org_id)
    if not character:
        raise ValueError("Character not found")

    card_version = await character_service.get_active_version(db, request.character_id, org_id)
    if not card_version:
        raise ValueError("No active card version for this character")

    # 2. Consent verification (hard gate)
    consent_ok, consent_reasons = await consent_service.check_consent(
        db, request.character_id, request.modality, org_id, request.territory
    )

    # 3. Create eval run
    content_str = request.content if isinstance(request.content, str) else str(request.content)
    eval_run = EvalRun(
        character_id=request.character_id,
        card_version_id=card_version.id,
        profile_id=request.profile_id,
        franchise_id=request.franchise_id or character.franchise_id,
        agent_id=request.agent_id,
        input_content={"modality": request.modality, "content": request.content},
        modality=request.modality,
        status="running",
        consent_verified=consent_ok,
        org_id=org_id,
    )
    db.add(eval_run)
    await db.flush()

    # If consent fails, block immediately
    if not consent_ok:
        eval_run.status = "completed"
        eval_run.decision = "block"
        eval_run.overall_score = 0.0
        eval_run.completed_at = datetime.utcnow()
        result = EvalResult(
            eval_run_id=eval_run.id,
            weighted_score=0.0,
            critic_scores={},
            flags=consent_reasons,
            recommendations=["Content blocked: consent verification failed"],
        )
        db.add(result)
        await db.flush()
        return eval_run

    # 4. Determine evaluation mode (sampling, tiered)
    profile = None
    if request.profile_id:
        profile = await critic_service.get_profile(db, request.profile_id)

    sampling_rate = profile.sampling_rate if profile else settings.DEFAULT_SAMPLING_RATE
    if random.random() > sampling_rate:
        eval_run.status = "completed"
        eval_run.decision = "sampled-pass"
        eval_run.sampled = True
        eval_run.completed_at = datetime.utcnow()
        await db.flush()
        return eval_run

    # 5. Get applicable critics
    configs = await critic_service.get_configs_for_character(
        db, org_id, request.character_id, request.franchise_id or character.franchise_id
    )
    enabled_configs = [c for c in configs if c.enabled]

    # Load critic objects
    critics_with_config = []
    for config in enabled_configs:
        critic = await critic_service.get_critic(db, config.critic_id)
        if critic and (critic.modality == request.modality or critic.modality == "multi"):
            critics_with_config.append((critic, config))

    # If no critics configured, use all matching-modality critics
    if not critics_with_config:
        all_critics = await critic_service.list_critics(db, org_id)
        critics_with_config = [
            (c, None) for c in all_critics
            if c.modality == request.modality or c.modality == "multi"
        ]

    # 6. Tiered evaluation
    use_tiered = profile.tiered_evaluation if profile else False
    if use_tiered and profile:
        eval_run.tier = "rapid"
        rapid_ids = set(profile.rapid_screen_critics)
        rapid_critics = [(c, cfg) for c, cfg in critics_with_config if c.id in rapid_ids]
        if rapid_critics:
            rapid_results = await critic_service.run_critics_parallel(rapid_critics, card_version, content_str)
            rapid_avg = _weighted_average(rapid_results)
            if rapid_avg >= settings.RAPID_SCREEN_THRESHOLD:
                # Passes rapid screen — run deep eval
                eval_run.tier = "full"
            else:
                # Fails rapid screen — skip deep eval
                return await _finalize_eval(db, eval_run, rapid_results)

    # 7. Run all critics in parallel
    if critics_with_config:
        critic_results = await critic_service.run_critics_parallel(
            critics_with_config, card_version, content_str
        )
    else:
        critic_results = []

    # 8. Finalize
    return await _finalize_eval(db, eval_run, critic_results)


def _weighted_average(results: List[dict]) -> float:
    total_weight = sum(r["weight"] for r in results)
    if total_weight == 0:
        return 0.0
    return sum(r["score"] * r["weight"] for r in results) / total_weight


def _determine_decision(score: float) -> str:
    if score >= 0.9:
        return "pass"
    elif score >= 0.7:
        return "regenerate"
    elif score >= 0.5:
        return "quarantine"
    elif score >= 0.3:
        return "escalate"
    else:
        return "block"


async def _synthesize_analysis(
    critic_results: List[dict],
    content: str,
    character_name: str,
    overall_score: float,
    decision: str,
) -> Optional[dict]:
    """Synthesize all critic feedback into a structured brand analysis."""
    try:
        from app.core.llm import call_llm_json

        # Build critic feedback summary for the synthesis prompt
        critic_summary_lines = []
        for r in critic_results:
            name = r.get("critic_name", f"Critic {r['critic_id']}")
            critic_summary_lines.append(
                f"- {name}: score={r['score']:.1f}/100, reasoning: {r.get('reasoning', 'N/A')[:300]}"
            )
        critic_feedback = "\n".join(critic_summary_lines)

        system_prompt = (
            "You are a brand compliance analyst for character IP governance. "
            "Given critic evaluation feedback for AI-generated content, produce a structured brand analysis. "
            "Respond ONLY with valid JSON matching this schema:\n"
            "{\n"
            '  "strengths": [{"point": "short title", "detail": "explanation"}],\n'
            '  "issues": [{"point": "short title", "detail": "explanation", "severity": "low|medium|high"}],\n'
            '  "summary": "one-paragraph strategic recommendation",\n'
            '  "improved_version": "rewritten content that fixes issues, or null if score >= 90"\n'
            "}\n"
            "Be specific and actionable. Reference the character by name."
        )

        user_prompt = (
            f"Character: {character_name}\n"
            f"Overall Score: {overall_score:.1f}/100\n"
            f"Decision: {decision}\n\n"
            f"Content Evaluated:\n{content[:1000]}\n\n"
            f"Critic Feedback:\n{critic_feedback}\n\n"
            "Produce the brand analysis JSON."
        )

        analysis = await call_llm_json(system_prompt, user_prompt)
        return analysis
    except Exception:
        return None


async def _finalize_eval(db: AsyncSession, eval_run: EvalRun, critic_results: List[dict]) -> EvalRun:
    overall_score = _weighted_average(critic_results) if critic_results else 0.0
    decision = _determine_decision(overall_score)

    eval_run.overall_score = overall_score
    eval_run.decision = decision
    eval_run.status = "completed"
    eval_run.completed_at = datetime.utcnow()

    # Build C2PA metadata
    eval_run.c2pa_metadata = {
        "canonsafe_version": "2.0.0",
        "eval_run_id": eval_run.id,
        "overall_score": overall_score,
        "decision": decision,
        "character_id": eval_run.character_id,
        "card_version_id": eval_run.card_version_id,
        "evaluated_at": eval_run.completed_at.isoformat() if eval_run.completed_at else None,
    }

    # Create eval result
    all_flags = []
    for r in critic_results:
        all_flags.extend(r.get("flags", []))

    # Compute inter-critic agreement
    critic_agreement = None
    if len(critic_results) >= 2:
        scores = [r["score"] for r in critic_results]
        mean_score = sum(scores) / len(scores)
        variance = sum((s - mean_score) ** 2 for s in scores) / len(scores)
        std_dev = math.sqrt(variance)
        # Normalize std_dev: max possible std_dev for 0-1 scores is 0.5
        # agreement_score = 1 - (std_dev / 0.5), clamped to [0, 1]
        normalized_std_dev = min(std_dev / 0.5, 1.0)
        critic_agreement = round(1.0 - normalized_std_dev, 4)
        if std_dev > 0.3:
            all_flags.append("critic_disagreement")

    # Synthesize brand analysis from critic feedback
    analysis_summary = None
    if critic_results:
        # Look up character name
        char_result = await db.execute(
            select(CharacterCard.name).where(CharacterCard.id == eval_run.character_id)
        )
        character_name = char_result.scalar_one_or_none() or f"Character #{eval_run.character_id}"
        content = eval_run.input_content.get("content", "") if isinstance(eval_run.input_content, dict) else str(eval_run.input_content)
        analysis_summary = await _synthesize_analysis(
            critic_results, content, character_name, overall_score, decision
        )

    result = EvalResult(
        eval_run_id=eval_run.id,
        weighted_score=overall_score,
        critic_scores={str(r["critic_id"]): r["score"] for r in critic_results},
        flags=all_flags,
        recommendations=_generate_recommendations(critic_results, decision),
        critic_agreement=critic_agreement,
        analysis_summary=analysis_summary,
    )
    db.add(result)
    await db.flush()

    # Create individual critic results
    for r in critic_results:
        cr = CriticResult(
            eval_result_id=result.id,
            critic_id=r["critic_id"],
            score=r["score"],
            weight=r["weight"],
            reasoning=r.get("reasoning", ""),
            flags=r.get("flags", []),
            raw_response=r,
            latency_ms=r.get("latency_ms"),
            prompt_tokens=r.get("prompt_tokens"),
            completion_tokens=r.get("completion_tokens"),
            model_used=r.get("model_used"),
            estimated_cost=r.get("estimated_cost"),
        )
        db.add(cr)

    await db.flush()

    # Auto-queue review items for quarantine/escalate decisions
    if decision in ("quarantine", "escalate"):
        from app.services import review_service
        await review_service.create_review_item(db, eval_run.id, decision, eval_run.org_id)

    # V3: Record usage
    try:
        from app.services import usage_service
        total_tokens = sum(r.get("prompt_tokens", 0) + r.get("completion_tokens", 0) for r in critic_results)
        total_cost = sum(r.get("estimated_cost", 0.0) for r in critic_results)
        await usage_service.record_eval(db, eval_run.org_id, total_tokens, total_cost)
    except Exception:
        pass

    # Dispatch webhook events
    try:
        from app.services import webhook_service
        webhook_payload = {
            "eval_run_id": eval_run.id,
            "character_id": eval_run.character_id,
            "score": overall_score,
            "decision": decision,
        }
        await webhook_service.dispatch_event(db, "eval_completed", webhook_payload, eval_run.org_id)
        if decision == "block":
            await webhook_service.dispatch_event(db, "eval_blocked", webhook_payload, eval_run.org_id)
        elif decision in ("escalate", "quarantine"):
            await webhook_service.dispatch_event(db, "eval_escalated", webhook_payload, eval_run.org_id)
    except Exception:
        pass  # Don't let webhook failures break evaluations

    return eval_run


def _generate_recommendations(results: List[dict], decision: str) -> List[str]:
    recs = []
    for r in results:
        if r["score"] < 0.5:
            recs.append(f"Critic '{r.get('critic_name', r['critic_id'])}' scored low ({r['score']:.2f}): review content for {', '.join(r.get('flags', ['issues']))}")
    if decision == "regenerate":
        recs.append("Content should be regenerated with adjustments based on critic feedback")
    elif decision == "quarantine":
        recs.append("Content quarantined for human review before publication")
    elif decision == "escalate":
        recs.append("Content escalated to senior reviewer — multiple significant issues detected")
    return recs


async def get_eval_run(db: AsyncSession, run_id: int, org_id: int) -> Optional[EvalRun]:
    result = await db.execute(
        select(EvalRun).where(EvalRun.id == run_id, EvalRun.org_id == org_id)
    )
    return result.scalar_one_or_none()


async def get_eval_result(db: AsyncSession, run_id: int) -> Optional[EvalResult]:
    result = await db.execute(
        select(EvalResult).where(EvalResult.eval_run_id == run_id)
    )
    return result.scalar_one_or_none()


async def list_eval_runs(db: AsyncSession, org_id: int, character_id: Optional[int] = None, limit: int = 50, offset: int = 0) -> List[EvalRun]:
    q = select(EvalRun).where(EvalRun.org_id == org_id)
    if character_id:
        q = q.where(EvalRun.character_id == character_id)
    q = q.order_by(EvalRun.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())
