"""All SQLAlchemy models for CanonSafe V2."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    return datetime.utcnow()


# ─── Organization & Users ───────────────────────────────────────

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    settings = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utcnow)

    users = relationship("User", back_populates="organization")
    franchises = relationship("Franchise", back_populates="organization")
    characters = relationship("CharacterCard", back_populates="organization")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(50), default="viewer")  # admin, editor, viewer
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)

    organization = relationship("Organization", back_populates="users")


# ─── Franchise ──────────────────────────────────────────────────

class Franchise(Base):
    __tablename__ = "franchises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False)
    description = Column(Text)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    settings = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utcnow)

    __table_args__ = (UniqueConstraint("slug", "org_id", name="uq_franchise_slug_org"),)

    organization = relationship("Organization", back_populates="franchises")
    characters = relationship("CharacterCard", back_populates="franchise")
    evaluation_aggregates = relationship("FranchiseEvaluationAggregate", back_populates="franchise")


# ─── Character Card & Versioned Packs ──────────────────────────

class CharacterCard(Base):
    __tablename__ = "character_cards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False)
    description = Column(Text)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    franchise_id = Column(Integer, ForeignKey("franchises.id"), nullable=True)
    active_version_id = Column(Integer, nullable=True)  # FK added after CardVersion defined
    status = Column(String(50), default="draft")  # draft, active, archived
    is_main = Column(Boolean, default=False)
    is_focus = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    __table_args__ = (UniqueConstraint("slug", "org_id", name="uq_character_slug_org"),)

    organization = relationship("Organization", back_populates="characters")
    franchise = relationship("Franchise", back_populates="characters")
    versions = relationship("CardVersion", back_populates="character", foreign_keys="CardVersion.character_id")
    consent_verifications = relationship("ConsentVerification", back_populates="character")
    certifications = relationship("AgentCertification", back_populates="character")
    exemplars = relationship("ExemplarContent", back_populates="character")


class CardVersion(Base):
    """Immutable versioned snapshot of a character's 5 packs."""
    __tablename__ = "card_versions"

    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey("character_cards.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    status = Column(String(50), default="draft")  # draft, published, archived

    # The 5 packs — stored as JSON blobs
    canon_pack = Column(JSON, default=dict)       # personality, backstory, speech patterns, relationships
    legal_pack = Column(JSON, default=dict)        # IP restrictions, usage rights, territory limits
    safety_pack = Column(JSON, default=dict)       # content guardrails, prohibited topics, age ratings
    visual_identity_pack = Column(JSON, default=dict)  # appearance, colors, style guide, logo rules
    audio_identity_pack = Column(JSON, default=dict)   # voice characteristics, music themes, sound design

    changelog = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    __table_args__ = (UniqueConstraint("character_id", "version_number", name="uq_card_version"),)

    character = relationship("CharacterCard", back_populates="versions", foreign_keys=[character_id])


# ─── Critics Framework ─────────────────────────────────────────

class Critic(Base):
    """A reusable evaluation critic (e.g., 'Voice Consistency Critic')."""
    __tablename__ = "critics"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    category = Column(String(100))  # canon, legal, safety, visual, audio, cross-modal
    modality = Column(String(50), default="text")  # text, image, audio, video, multi
    prompt_template = Column(Text, nullable=False)  # template with {placeholders}
    rubric = Column(JSON, default=dict)  # scoring rubric definition
    default_weight = Column(Float, default=1.0)
    is_system = Column(Boolean, default=False)  # built-in vs custom
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)  # null = global
    created_at = Column(DateTime, default=utcnow)

    configurations = relationship("CriticConfiguration", back_populates="critic")


class CriticConfiguration(Base):
    """Per-org/franchise/character critic overrides."""
    __tablename__ = "critic_configurations"

    id = Column(Integer, primary_key=True, index=True)
    critic_id = Column(Integer, ForeignKey("critics.id"), nullable=False)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    franchise_id = Column(Integer, ForeignKey("franchises.id"), nullable=True)
    character_id = Column(Integer, ForeignKey("character_cards.id"), nullable=True)
    enabled = Column(Boolean, default=True)
    weight_override = Column(Float, nullable=True)
    threshold_override = Column(Float, nullable=True)
    extra_instructions = Column(Text)
    created_at = Column(DateTime, default=utcnow)

    critic = relationship("Critic", back_populates="configurations")


class EvaluationProfile(Base):
    """Named collection of critic configurations for a specific eval scenario."""
    __tablename__ = "evaluation_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False)
    description = Column(Text)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    critic_config_ids = Column(JSON, default=list)  # list of CriticConfiguration IDs
    sampling_rate = Column(Float, default=1.0)
    tiered_evaluation = Column(Boolean, default=False)
    rapid_screen_critics = Column(JSON, default=list)
    deep_eval_critics = Column(JSON, default=list)
    created_at = Column(DateTime, default=utcnow)

    __table_args__ = (UniqueConstraint("slug", "org_id", name="uq_profile_slug_org"),)


# ─── Test Suites & Agent Certification ─────────────────────────

class TestSuite(Base):
    __tablename__ = "test_suites"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    character_id = Column(Integer, ForeignKey("character_cards.id"), nullable=False)
    card_version_id = Column(Integer, ForeignKey("card_versions.id"), nullable=True)
    tier = Column(String(50), default="base")  # base, canonsafe_certified
    passing_threshold = Column(Float, default=0.8)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)

    test_cases = relationship("TestCase", back_populates="test_suite")


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    suite_id = Column(Integer, ForeignKey("test_suites.id"), nullable=False)
    name = Column(String(255), nullable=False)
    input_content = Column(JSON, nullable=False)  # {"modality": "text", "content": "..."}
    expected_outcome = Column(JSON, default=dict)  # expected scores/flags
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=utcnow)

    test_suite = relationship("TestSuite", back_populates="test_cases")


class AgentCertification(Base):
    __tablename__ = "agent_certifications"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(String(255), nullable=False)
    character_id = Column(Integer, ForeignKey("character_cards.id"), nullable=False)
    card_version_id = Column(Integer, ForeignKey("card_versions.id"), nullable=False)
    tier = Column(String(50), nullable=False)  # base, canonsafe_certified
    status = Column(String(50), default="pending")  # pending, passed, failed, expired
    score = Column(Float, nullable=True)
    results_summary = Column(JSON, default=dict)
    certified_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)

    character = relationship("CharacterCard", back_populates="certifications")


# ─── Evaluation Runs & Results ──────────────────────────────────

class EvalRun(Base):
    """A single evaluation request (may contain multiple modalities)."""
    __tablename__ = "eval_runs"

    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey("character_cards.id"), nullable=False)
    card_version_id = Column(Integer, ForeignKey("card_versions.id"), nullable=True)
    profile_id = Column(Integer, ForeignKey("evaluation_profiles.id"), nullable=True)
    franchise_id = Column(Integer, ForeignKey("franchises.id"), nullable=True)
    agent_id = Column(String(255), nullable=True)
    input_content = Column(JSON, nullable=False)  # {"modality": "text", "content": "..."}
    modality = Column(String(50), default="text")
    status = Column(String(50), default="pending")  # pending, running, completed, failed
    tier = Column(String(50), default="full")  # rapid, full
    sampled = Column(Boolean, default=False)  # was this a sampled eval?
    overall_score = Column(Float, nullable=True)
    decision = Column(String(50), nullable=True)  # pass, regenerate, quarantine, escalate, block
    consent_verified = Column(Boolean, default=True)
    c2pa_metadata = Column(JSON, default=dict)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)
    completed_at = Column(DateTime, nullable=True)

    results = relationship("EvalResult", back_populates="eval_run")


class EvalResult(Base):
    """Aggregated result for an eval run."""
    __tablename__ = "eval_results"

    id = Column(Integer, primary_key=True, index=True)
    eval_run_id = Column(Integer, ForeignKey("eval_runs.id"), nullable=False)
    weighted_score = Column(Float, nullable=False)
    critic_scores = Column(JSON, default=dict)  # {critic_id: score}
    flags = Column(JSON, default=list)
    recommendations = Column(JSON, default=list)
    created_at = Column(DateTime, default=utcnow)

    eval_run = relationship("EvalRun", back_populates="results")
    critic_results = relationship("CriticResult", back_populates="eval_result")


class CriticResult(Base):
    """Individual critic score within an eval result."""
    __tablename__ = "critic_results"

    id = Column(Integer, primary_key=True, index=True)
    eval_result_id = Column(Integer, ForeignKey("eval_results.id"), nullable=False)
    critic_id = Column(Integer, ForeignKey("critics.id"), nullable=False)
    score = Column(Float, nullable=False)
    weight = Column(Float, default=1.0)
    reasoning = Column(Text)
    flags = Column(JSON, default=list)
    raw_response = Column(JSON, default=dict)
    latency_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    eval_result = relationship("EvalResult", back_populates="critic_results")


# ─── Consent Verification ──────────────────────────────────────

class ConsentVerification(Base):
    __tablename__ = "consent_verifications"

    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey("character_cards.id"), nullable=False)
    performer_name = Column(String(255), nullable=False)
    consent_type = Column(String(100), nullable=False)  # likeness, voice, motion_capture
    territories = Column(JSON, default=list)  # ["US", "EU", "APAC"]
    modalities = Column(JSON, default=list)  # ["text", "image", "audio", "video"]
    usage_restrictions = Column(JSON, default=list)
    valid_from = Column(DateTime, nullable=False)
    valid_until = Column(DateTime, nullable=True)
    strike_clause = Column(Boolean, default=False)
    strike_active = Column(Boolean, default=False)
    document_ref = Column(String(500))  # reference to legal document
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)

    character = relationship("CharacterCard", back_populates="consent_verifications")


# ─── Exemplar Library ───────────────────────────────────────────

class ExemplarContent(Base):
    __tablename__ = "exemplar_contents"

    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey("character_cards.id"), nullable=False)
    modality = Column(String(50), nullable=False)
    content = Column(JSON, nullable=False)  # content reference or inline
    eval_score = Column(Float, nullable=False)
    eval_run_id = Column(Integer, ForeignKey("eval_runs.id"), nullable=True)
    tags = Column(JSON, default=list)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)

    character = relationship("CharacterCard", back_populates="exemplars")


# ─── Continuous Improvement ─────────────────────────────────────

class FailurePattern(Base):
    __tablename__ = "failure_patterns"

    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey("character_cards.id"), nullable=True)
    franchise_id = Column(Integer, ForeignKey("franchises.id"), nullable=True)
    critic_id = Column(Integer, ForeignKey("critics.id"), nullable=True)
    pattern_type = Column(String(100), nullable=False)  # recurring_low_score, boundary_violation, drift
    description = Column(Text, nullable=False)
    frequency = Column(Integer, default=1)
    severity = Column(String(50), default="medium")  # low, medium, high, critical
    suggested_fix = Column(Text)
    status = Column(String(50), default="open")  # open, acknowledged, resolved
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class ImprovementTrajectory(Base):
    __tablename__ = "improvement_trajectories"

    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey("character_cards.id"), nullable=True)
    franchise_id = Column(Integer, ForeignKey("franchises.id"), nullable=True)
    metric_name = Column(String(255), nullable=False)
    data_points = Column(JSON, default=list)  # [{date, value}]
    trend = Column(String(50))  # improving, stable, degrading
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


# ─── Franchise Evaluation Aggregate ────────────────────────────

class FranchiseEvaluationAggregate(Base):
    __tablename__ = "franchise_evaluation_aggregates"

    id = Column(Integer, primary_key=True, index=True)
    franchise_id = Column(Integer, ForeignKey("franchises.id"), nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    total_evals = Column(Integer, default=0)
    avg_score = Column(Float, nullable=True)
    pass_rate = Column(Float, nullable=True)
    cross_character_consistency = Column(Float, nullable=True)
    world_building_consistency = Column(Float, nullable=True)
    health_score = Column(Float, nullable=True)
    breakdown = Column(JSON, default=dict)  # per-character breakdown
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)

    franchise = relationship("Franchise", back_populates="evaluation_aggregates")


# ─── Taxonomy ───────────────────────────────────────────────────

class TaxonomyCategory(Base):
    __tablename__ = "taxonomy_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False)
    description = Column(Text)
    parent_id = Column(Integer, ForeignKey("taxonomy_categories.id"), nullable=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)

    __table_args__ = (UniqueConstraint("slug", "org_id", name="uq_taxcat_slug_org"),)

    tags = relationship("TaxonomyTag", back_populates="category")


class TaxonomyTag(Base):
    __tablename__ = "taxonomy_tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False)
    category_id = Column(Integer, ForeignKey("taxonomy_categories.id"), nullable=False)
    evaluation_rules = Column(JSON, default=dict)  # {critic_id: {weight, threshold, severity}}
    severity = Column(String(50), default="medium")
    applicable_modalities = Column(JSON, default=list)  # ["text", "image", "audio"]
    propagate_to_franchise = Column(Boolean, default=False)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)

    __table_args__ = (UniqueConstraint("slug", "category_id", name="uq_tag_slug_cat"),)

    category = relationship("TaxonomyCategory", back_populates="tags")


# ─── Drift Detection ───────────────────────────────────────────

class DriftBaseline(Base):
    __tablename__ = "drift_baselines"

    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey("character_cards.id"), nullable=False)
    card_version_id = Column(Integer, ForeignKey("card_versions.id"), nullable=False)
    critic_id = Column(Integer, ForeignKey("critics.id"), nullable=False)
    baseline_score = Column(Float, nullable=False)
    std_deviation = Column(Float, default=0.0)
    sample_count = Column(Integer, default=0)
    threshold = Column(Float, default=0.1)  # drift alert if score deviates by this
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class DriftEvent(Base):
    __tablename__ = "drift_events"

    id = Column(Integer, primary_key=True, index=True)
    baseline_id = Column(Integer, ForeignKey("drift_baselines.id"), nullable=False)
    detected_score = Column(Float, nullable=False)
    deviation = Column(Float, nullable=False)
    eval_run_id = Column(Integer, ForeignKey("eval_runs.id"), nullable=True)
    severity = Column(String(50), default="warning")  # info, warning, critical
    acknowledged = Column(Boolean, default=False)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)
