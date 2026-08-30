import os
import smtplib
import ssl
import uuid
from datetime import datetime, timezone, timedelta, date as date_type
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.database import SessionLocal
from app.models import GymSettings, GymMembership, GymMembershipPlan, GymMember, GymEmailNotification, Organization

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "") or SMTP_USER
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "")


def email_enabled() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def send_email(to: str, subject: str, html: str):
    if not email_enabled():
        raise RuntimeError("SMTP is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASSWORD)")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM}>" if SMTP_FROM_NAME else SMTP_FROM
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    context = ssl.create_default_context()
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as server:
        server.ehlo()
        server.starttls(context=context)
        server.ehlo()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM, [to], msg.as_string())


def _frame(title: str, body_html: str, business_name: str = "") -> str:
    header = f"<h2 style='margin:0 0 4px;color:#1f2937;'>{title}</h2>" if title else ""
    footer = (
        f"<p style='margin:0;color:#6b7280;font-size:12px;'>{business_name}</p>"
        if business_name
        else ""
    )
    return f"""
    <div style="background:#f3f4f6;padding:24px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
        {header}
        {body_html}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
        {footer}
        <p style="margin:0;color:#9ca3af;font-size:11px;margin-top:6px;">This is an automated message — please do not reply.</p>
      </div>
    </div>
    """


def _plan_name(db, membership) -> str:
    plan = db.query(GymMembershipPlan).filter(GymMembershipPlan.id == membership.plan_id).first()
    return plan.name if plan else "Membership"


def check_and_email_expiry_notices():
    """Find active memberships expiring within the org's configured window and
    email the member once per membership (dedup ledger). No-op when SMTP is
    unconfigured or there's nothing expiring."""
    if not email_enabled():
        return

    db = SessionLocal()
    try:
        today = date_type.today()
        orgs = db.query(Organization).all()
        for org in orgs:
            settings = db.query(GymSettings).filter(GymSettings.organization_id == org.id).first()
            window = settings.membership_expiry_email_days if settings and settings.membership_expiry_email_days else 3
            window = max(window, 1)
            horizon = today + timedelta(days=window)

            rows = (
                db.query(GymMembership, GymMember)
                .join(GymMember, GymMembership.member_id == GymMember.id)
                .filter(
                    GymMembership.organization_id == org.id,
                    GymMembership.status == "active",
                    GymMembership.end_date >= today,
                    GymMembership.end_date <= horizon,
                )
                .all()
            )

            by_member: dict[uuid.UUID, tuple] = {}
            for membership, member in rows:
                if not member.email:
                    continue
                notified = db.query(GymEmailNotification).filter(
                    GymEmailNotification.organization_id == org.id,
                    GymEmailNotification.membership_id == membership.id,
                    GymEmailNotification.kind == "expiry",
                ).first()
                if notified:
                    continue
                by_member[membership.id] = (membership, member)

            for membership, member in by_member.values():
                plan = _plan_name(db, membership)
                days_left = (membership.end_date - today).days
                label = "expires today" if days_left == 0 else f"expires in {days_left} day{'s' if days_left != 1 else ''}"
                subject = f"Your {plan} membership {label}"
                body = _frame(
                    title=f"Hi {member.full_name.split(' ')[0] if member.full_name else 'there'},",
                    body_html=(
                        f"<p style='margin:0 0 14px;color:#374151;font-size:14px;line-height:1.5;'>"
                        f"Your <strong>{plan}</strong> membership <strong>{label}</strong> "
                        f"({membership.end_date.strftime('%b %d, %Y')}). Renew soon to keep your access uninterrupted.</p>"
                        f"<p style='margin:0 0 14px;color:#374151;font-size:14px;line-height:1.5;'>"
                        f"Plan expiring: <strong>{plan}</strong><br/>"
                        f"End date: <strong>{membership.end_date.strftime('%b %d, %Y')}</strong></p>"
                        f"<p style='margin:0;color:#6b7280;font-size:13px;'>Your membership linked to "
                        f"{member.full_name} ({member.member_code}) is nearing its end.</p>"
                    ),
                    business_name=org.name,
                )
                try:
                    send_email(member.email, subject, body)
                except Exception:
                    continue
                db.add(GymEmailNotification(
                    id=uuid.uuid4(),
                    organization_id=org.id,
                    membership_id=membership.id,
                    member_id=member.id,
                    kind="expiry",
                    sent_to=member.email,
                    sent_at=datetime.now(timezone.utc),
                    created_at=datetime.now(timezone.utc),
                ))
                db.commit()
    finally:
        db.close()