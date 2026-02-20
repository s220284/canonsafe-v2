"""Transactional email service (Phase 2).

Until SMTP is configured, these functions are no-ops that log instead of sending.
Admin manually shares invitation links in Phase 1.
"""
from __future__ import annotations

import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_invitation_email(
    email: str,
    org_name: str,
    inviter_name: str,
    accept_url: str,
):
    """Send an invitation email to a new user."""
    if not settings.SMTP_HOST:
        logger.info(f"[EMAIL STUB] Invitation to {email} for {org_name} by {inviter_name}: {accept_url}")
        return False

    return await _send_email(
        to=email,
        subject=f"You've been invited to {org_name} on CanonSafe",
        body=f"""
Hi,

{inviter_name} has invited you to join {org_name} on CanonSafe.

Click the link below to accept your invitation and create your account:
{accept_url}

This link expires in 7 days.

— The CanonSafe Team
""",
    )


async def send_password_reset_email(email: str, reset_url: str):
    """Send a password reset email."""
    if not settings.SMTP_HOST:
        logger.info(f"[EMAIL STUB] Password reset for {email}: {reset_url}")
        return False

    return await _send_email(
        to=email,
        subject="Reset your CanonSafe password",
        body=f"""
Hi,

We received a request to reset your CanonSafe password.

Click the link below to set a new password:
{reset_url}

This link expires in 1 hour. If you didn't request this, you can safely ignore this email.

— The CanonSafe Team
""",
    )


async def send_welcome_email(email: str, full_name: str, org_name: str):
    """Send a welcome email to a new user."""
    if not settings.SMTP_HOST:
        logger.info(f"[EMAIL STUB] Welcome email to {email} ({full_name}) for {org_name}")
        return False

    return await _send_email(
        to=email,
        subject=f"Welcome to CanonSafe, {full_name or 'there'}!",
        body=f"""
Hi {full_name or 'there'},

Welcome to CanonSafe! You've been added to {org_name}.

Get started by visiting your dashboard:
{settings.FRONTEND_URL}

— The CanonSafe Team
""",
    )


async def _send_email(to: str, subject: str, body: str) -> bool:
    """Send an email via SMTP."""
    try:
        import smtplib
        from email.mime.text import MIMEText

        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = settings.FROM_EMAIL
        msg["To"] = to

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.FROM_EMAIL, [to], msg.as_string())
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return False
