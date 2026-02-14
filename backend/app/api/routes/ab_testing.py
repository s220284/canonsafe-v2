"""A/B Testing routes — create experiments, run trials, compare variants."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_editor
from app.models.core import User
from app.services import ab_testing_service

router = APIRouter()


# ─── Schemas ───────────────────────────────────────────────────

class CreateExperimentRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    experiment_type: str  # critic_weight, prompt_template, model, profile
    variant_a: dict
    variant_b: dict
    sample_size: int = 100


class RunTrialRequest(BaseModel):
    character_id: int
    content: str
    modality: str = "text"


# ─── Create Experiment ─────────────────────────────────────────

@router.post("")
async def create_experiment(
    req: CreateExperimentRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    """Create a new A/B experiment."""
    experiment = await ab_testing_service.create_experiment(
        db,
        data={
            "name": req.name,
            "description": req.description,
            "experiment_type": req.experiment_type,
            "variant_a": req.variant_a,
            "variant_b": req.variant_b,
            "sample_size": req.sample_size,
        },
        org_id=user.org_id,
    )
    await db.commit()
    return {
        "id": experiment.id,
        "name": experiment.name,
        "status": experiment.status,
        "experiment_type": experiment.experiment_type,
        "sample_size": experiment.sample_size,
        "created_at": experiment.created_at.isoformat() if experiment.created_at else None,
    }


# ─── List Experiments ──────────────────────────────────────────

@router.get("")
async def list_experiments(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all A/B experiments for the org."""
    experiments = await ab_testing_service.list_experiments(db, user.org_id)
    return [
        {
            "id": exp.id,
            "name": exp.name,
            "description": exp.description,
            "status": exp.status,
            "experiment_type": exp.experiment_type,
            "sample_size": exp.sample_size,
            "winner": exp.winner,
            "statistical_significance": exp.statistical_significance,
            "created_at": exp.created_at.isoformat() if exp.created_at else None,
            "completed_at": exp.completed_at.isoformat() if exp.completed_at else None,
        }
        for exp in experiments
    ]


# ─── Get Experiment with Results ───────────────────────────────

@router.get("/{experiment_id}")
async def get_experiment(
    experiment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get experiment details with computed results."""
    try:
        results = await ab_testing_service.get_experiment_results(
            db, experiment_id, user.org_id
        )
        return results
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ─── Run Trial ─────────────────────────────────────────────────

@router.post("/{experiment_id}/run-trial")
async def run_trial(
    experiment_id: int,
    req: RunTrialRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    """Run a trial for both variants of the experiment."""
    try:
        result = await ab_testing_service.run_trial(
            db,
            experiment_id=experiment_id,
            character_id=req.character_id,
            content=req.content,
            org_id=user.org_id,
            modality=req.modality,
        )
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Complete Experiment ───────────────────────────────────────

@router.post("/{experiment_id}/complete")
async def complete_experiment(
    experiment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    """Finalize experiment and determine winner."""
    try:
        experiment = await ab_testing_service.complete_experiment(
            db, experiment_id, user.org_id
        )
        await db.commit()
        return {
            "id": experiment.id,
            "name": experiment.name,
            "status": experiment.status,
            "winner": experiment.winner,
            "statistical_significance": experiment.statistical_significance,
            "results_a": experiment.results_a,
            "results_b": experiment.results_b,
            "completed_at": experiment.completed_at.isoformat() if experiment.completed_at else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
