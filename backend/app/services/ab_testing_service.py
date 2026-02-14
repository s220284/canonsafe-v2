"""A/B Testing service — create and manage experiments comparing evaluation configs."""
from __future__ import annotations

import math
import time
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import (
    ABExperiment,
    ABTrialRun,
    EvalRun,
    EvalResult,
    CriticResult,
    CharacterCard,
    CardVersion,
    Critic,
    CriticConfiguration,
    EvaluationProfile,
)
from app.services import critic_service, consent_service, character_service


async def create_experiment(
    db: AsyncSession,
    data: Dict[str, Any],
    org_id: int,
) -> ABExperiment:
    """Create a new A/B experiment."""
    experiment = ABExperiment(
        name=data["name"],
        description=data.get("description", ""),
        experiment_type=data["experiment_type"],
        variant_a=data["variant_a"],
        variant_b=data["variant_b"],
        sample_size=data.get("sample_size", 100),
        status="draft",
        org_id=org_id,
    )
    db.add(experiment)
    await db.flush()
    return experiment


async def list_experiments(
    db: AsyncSession,
    org_id: int,
) -> List[ABExperiment]:
    """List all experiments for an org."""
    result = await db.execute(
        select(ABExperiment)
        .where(ABExperiment.org_id == org_id)
        .order_by(ABExperiment.created_at.desc())
    )
    return list(result.scalars().all())


async def get_experiment(
    db: AsyncSession,
    experiment_id: int,
    org_id: int,
) -> Optional[ABExperiment]:
    """Get experiment by ID."""
    result = await db.execute(
        select(ABExperiment).where(
            ABExperiment.id == experiment_id,
            ABExperiment.org_id == org_id,
        )
    )
    return result.scalar_one_or_none()


async def run_trial(
    db: AsyncSession,
    experiment_id: int,
    character_id: int,
    content: str,
    org_id: int,
    modality: str = "text",
) -> Dict[str, Any]:
    """Run a trial: evaluate content through both variant A and variant B configs."""
    experiment = await get_experiment(db, experiment_id, org_id)
    if not experiment:
        raise ValueError("Experiment not found")

    if experiment.status not in ("draft", "running"):
        raise ValueError(f"Experiment is {experiment.status}, cannot run trials")

    # Move to running if still draft
    if experiment.status == "draft":
        experiment.status = "running"

    # Get character and version
    character = await character_service.get_character(db, character_id, org_id)
    if not character:
        raise ValueError("Character not found")

    card_version = await character_service.get_active_version(db, character_id, org_id)
    if not card_version:
        raise ValueError("No active card version for this character")

    # Check consent
    consent_ok, consent_reasons = await consent_service.check_consent(
        db, character_id, modality, org_id
    )

    results = {}

    for variant_label, variant_config in [("a", experiment.variant_a), ("b", experiment.variant_b)]:
        start_time = time.time()

        # Create eval run for this variant
        eval_run = EvalRun(
            character_id=character_id,
            card_version_id=card_version.id,
            profile_id=variant_config.get("profile_id"),
            franchise_id=character.franchise_id,
            input_content={"modality": modality, "content": content},
            modality=modality,
            status="running",
            consent_verified=consent_ok,
            org_id=org_id,
        )
        db.add(eval_run)
        await db.flush()

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
        else:
            # Get critics — may vary based on experiment type
            configs = await critic_service.get_configs_for_character(
                db, org_id, character_id, character.franchise_id
            )
            enabled_configs = [c for c in configs if c.enabled]

            critics_with_config = []
            for config in enabled_configs:
                critic = await critic_service.get_critic(db, config.critic_id)
                if critic and (critic.modality == modality or critic.modality == "multi"):
                    # Apply variant-specific weight overrides
                    weight_overrides = variant_config.get("weight_overrides", {})
                    if str(critic.id) in weight_overrides:
                        config.weight_override = weight_overrides[str(critic.id)]
                    critics_with_config.append((critic, config))

            if not critics_with_config:
                all_critics = await critic_service.list_critics(db, org_id)
                critics_with_config = [
                    (c, None) for c in all_critics
                    if c.modality == modality or c.modality == "multi"
                ]

            # Run critics
            content_str = content if isinstance(content, str) else str(content)
            if critics_with_config:
                critic_results = await critic_service.run_critics_parallel(
                    critics_with_config, card_version, content_str
                )
            else:
                critic_results = []

            # Calculate overall score
            total_weight = sum(r["weight"] for r in critic_results) if critic_results else 0
            overall_score = (
                sum(r["score"] * r["weight"] for r in critic_results) / total_weight
                if total_weight > 0 else 0.0
            )

            # Determine decision
            if overall_score >= 0.9:
                decision = "pass"
            elif overall_score >= 0.7:
                decision = "regenerate"
            elif overall_score >= 0.5:
                decision = "quarantine"
            elif overall_score >= 0.3:
                decision = "escalate"
            else:
                decision = "block"

            eval_run.overall_score = overall_score
            eval_run.decision = decision
            eval_run.status = "completed"
            eval_run.completed_at = datetime.utcnow()

            # Collect flags
            all_flags = []
            for r in critic_results:
                all_flags.extend(r.get("flags", []))

            eval_result = EvalResult(
                eval_run_id=eval_run.id,
                weighted_score=overall_score,
                critic_scores={str(r["critic_id"]): r["score"] for r in critic_results},
                flags=all_flags,
                recommendations=[],
            )
            db.add(eval_result)
            await db.flush()

            # Store individual critic results
            for r in critic_results:
                cr = CriticResult(
                    eval_result_id=eval_result.id,
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

        elapsed_ms = int((time.time() - start_time) * 1000)

        # Calculate cost from critic results if available
        total_cost = 0.0
        if eval_run.status == "completed" and consent_ok:
            cr_result = await db.execute(
                select(EvalResult).where(EvalResult.eval_run_id == eval_run.id)
            )
            ev_result = cr_result.scalar_one_or_none()
            if ev_result:
                crs = await db.execute(
                    select(CriticResult).where(CriticResult.eval_result_id == ev_result.id)
                )
                for cr_row in crs.scalars().all():
                    if cr_row.estimated_cost:
                        total_cost += cr_row.estimated_cost

        # Record trial run
        trial = ABTrialRun(
            experiment_id=experiment_id,
            variant=variant_label,
            eval_run_id=eval_run.id,
            score=eval_run.overall_score,
            decision=eval_run.decision,
            latency_ms=elapsed_ms,
            cost=total_cost,
        )
        db.add(trial)
        await db.flush()

        results[variant_label] = {
            "eval_run_id": eval_run.id,
            "score": eval_run.overall_score,
            "decision": eval_run.decision,
            "latency_ms": elapsed_ms,
            "cost": total_cost,
        }

    return {
        "experiment_id": experiment_id,
        "character_id": character_id,
        "variant_a": results.get("a"),
        "variant_b": results.get("b"),
    }


async def get_experiment_results(
    db: AsyncSession,
    experiment_id: int,
    org_id: int,
) -> Dict[str, Any]:
    """Compute experiment results with statistical significance."""
    experiment = await get_experiment(db, experiment_id, org_id)
    if not experiment:
        raise ValueError("Experiment not found")

    # Get all trial runs
    result = await db.execute(
        select(ABTrialRun)
        .where(ABTrialRun.experiment_id == experiment_id)
        .order_by(ABTrialRun.created_at.asc())
    )
    trials = list(result.scalars().all())

    trials_a = [t for t in trials if t.variant == "a"]
    trials_b = [t for t in trials if t.variant == "b"]

    scores_a = [t.score for t in trials_a if t.score is not None]
    scores_b = [t.score for t in trials_b if t.score is not None]

    decisions_a = [t.decision for t in trials_a if t.decision is not None]
    decisions_b = [t.decision for t in trials_b if t.decision is not None]

    latencies_a = [t.latency_ms for t in trials_a if t.latency_ms is not None]
    latencies_b = [t.latency_ms for t in trials_b if t.latency_ms is not None]

    costs_a = [t.cost for t in trials_a if t.cost is not None]
    costs_b = [t.cost for t in trials_b if t.cost is not None]

    def safe_mean(lst):
        return sum(lst) / len(lst) if lst else 0.0

    def safe_std(lst):
        if len(lst) < 2:
            return 0.0
        mean = sum(lst) / len(lst)
        variance = sum((x - mean) ** 2 for x in lst) / (len(lst) - 1)
        return math.sqrt(variance)

    mean_a = safe_mean(scores_a)
    mean_b = safe_mean(scores_b)
    std_a = safe_std(scores_a)
    std_b = safe_std(scores_b)

    pass_count_a = sum(1 for d in decisions_a if d == "pass")
    pass_count_b = sum(1 for d in decisions_b if d == "pass")
    pass_rate_a = pass_count_a / len(decisions_a) if decisions_a else 0.0
    pass_rate_b = pass_count_b / len(decisions_b) if decisions_b else 0.0

    # Compute statistical significance
    # Use two-sample z-test for proportions (pass rates)
    p_value_proportions = None
    if len(decisions_a) >= 2 and len(decisions_b) >= 2:
        n_a = len(decisions_a)
        n_b = len(decisions_b)
        p_pool = (pass_count_a + pass_count_b) / (n_a + n_b) if (n_a + n_b) > 0 else 0
        if p_pool > 0 and p_pool < 1:
            se = math.sqrt(p_pool * (1 - p_pool) * (1 / n_a + 1 / n_b))
            if se > 0:
                z = abs(pass_rate_a - pass_rate_b) / se
                # Approximate two-tailed p-value using normal CDF
                p_value_proportions = 2 * (1 - _normal_cdf(z))

    # Use two-sample t-test for scores
    p_value_scores = None
    if len(scores_a) >= 2 and len(scores_b) >= 2:
        n_a = len(scores_a)
        n_b = len(scores_b)
        se = math.sqrt(std_a ** 2 / n_a + std_b ** 2 / n_b)
        if se > 0:
            t_stat = abs(mean_a - mean_b) / se
            # Approximate degrees of freedom (Welch's)
            num = (std_a ** 2 / n_a + std_b ** 2 / n_b) ** 2
            den = (
                (std_a ** 2 / n_a) ** 2 / (n_a - 1)
                + (std_b ** 2 / n_b) ** 2 / (n_b - 1)
            )
            df = num / den if den > 0 else 1
            # Approximate p-value using normal for large df
            p_value_scores = 2 * (1 - _normal_cdf(t_stat))

    # Choose the more relevant p-value
    p_value = p_value_scores if p_value_scores is not None else p_value_proportions

    # Determine winner
    winner = None
    if p_value is not None and p_value < 0.05:
        if mean_a > mean_b:
            winner = "a"
        elif mean_b > mean_a:
            winner = "b"
        else:
            winner = "inconclusive"
    elif p_value is not None:
        winner = "inconclusive"

    # Build trial history
    trial_history = [
        {
            "id": t.id,
            "variant": t.variant,
            "score": t.score,
            "decision": t.decision,
            "latency_ms": t.latency_ms,
            "cost": t.cost,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in trials
    ]

    return {
        "experiment": {
            "id": experiment.id,
            "name": experiment.name,
            "description": experiment.description,
            "status": experiment.status,
            "experiment_type": experiment.experiment_type,
            "variant_a": experiment.variant_a,
            "variant_b": experiment.variant_b,
            "sample_size": experiment.sample_size,
            "winner": experiment.winner or winner,
            "statistical_significance": experiment.statistical_significance or p_value,
            "created_at": experiment.created_at.isoformat() if experiment.created_at else None,
            "completed_at": experiment.completed_at.isoformat() if experiment.completed_at else None,
        },
        "summary": {
            "trials_a": len(trials_a),
            "trials_b": len(trials_b),
            "mean_score_a": round(mean_a, 4),
            "mean_score_b": round(mean_b, 4),
            "std_a": round(std_a, 4),
            "std_b": round(std_b, 4),
            "pass_rate_a": round(pass_rate_a, 4),
            "pass_rate_b": round(pass_rate_b, 4),
            "avg_latency_a": round(safe_mean(latencies_a), 1),
            "avg_latency_b": round(safe_mean(latencies_b), 1),
            "avg_cost_a": round(safe_mean(costs_a), 6),
            "avg_cost_b": round(safe_mean(costs_b), 6),
            "total_cost_a": round(sum(costs_a), 6),
            "total_cost_b": round(sum(costs_b), 6),
            "p_value": round(p_value, 6) if p_value is not None else None,
            "significant": p_value < 0.05 if p_value is not None else False,
            "winner": winner,
        },
        "trials": trial_history,
    }


async def complete_experiment(
    db: AsyncSession,
    experiment_id: int,
    org_id: int,
) -> ABExperiment:
    """Mark experiment as completed and record final results."""
    experiment = await get_experiment(db, experiment_id, org_id)
    if not experiment:
        raise ValueError("Experiment not found")

    if experiment.status == "completed":
        raise ValueError("Experiment is already completed")

    # Compute final results
    results = await get_experiment_results(db, experiment_id, org_id)
    summary = results["summary"]

    experiment.status = "completed"
    experiment.completed_at = datetime.utcnow()
    experiment.winner = summary["winner"]
    experiment.statistical_significance = summary["p_value"]
    experiment.results_a = {
        "trials": summary["trials_a"],
        "mean_score": summary["mean_score_a"],
        "pass_rate": summary["pass_rate_a"],
        "avg_latency": summary["avg_latency_a"],
        "avg_cost": summary["avg_cost_a"],
        "total_cost": summary["total_cost_a"],
    }
    experiment.results_b = {
        "trials": summary["trials_b"],
        "mean_score": summary["mean_score_b"],
        "pass_rate": summary["pass_rate_b"],
        "avg_latency": summary["avg_latency_b"],
        "avg_cost": summary["avg_cost_b"],
        "total_cost": summary["total_cost_b"],
    }

    await db.flush()
    return experiment


def _normal_cdf(x: float) -> float:
    """Approximate the cumulative distribution function of the standard normal distribution."""
    # Using the Abramowitz and Stegun approximation
    a1 = 0.254829592
    a2 = -0.284496736
    a3 = 1.421413741
    a4 = -1.453152027
    a5 = 1.061405429
    p = 0.3275911

    sign = 1 if x >= 0 else -1
    x = abs(x) / math.sqrt(2)
    t = 1.0 / (1.0 + p * x)
    y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * math.exp(-x * x)
    return 0.5 * (1.0 + sign * y)
