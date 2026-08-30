"""Billing cycle pricing for membership purchases and renewals.

Monthly billing charges the plan's monthly price unchanged. Annual billing
charges 12 months less the organization's global annual discount rate.

All money values are rounded to two decimals (PHP).
"""
from sqlalchemy.orm import Session

from app.models import GymSettings

DEFAULT_ANNUAL_DISCOUNT_PERCENTAGE = 15.0

BILLING_CYCLES = ("monthly", "annual")


def annual_discount_percentage(db: Session, organization_id) -> float:
    settings = (
        db.query(GymSettings)
        .filter(GymSettings.organization_id == organization_id)
        .first()
    )
    if settings and settings.annual_discount_percentage is not None:
        return float(settings.annual_discount_percentage)
    return DEFAULT_ANNUAL_DISCOUNT_PERCENTAGE


def normalize_billing_cycle(billing_cycle: str | None) -> str:
    cycle = (billing_cycle or "monthly").lower()
    return cycle if cycle in BILLING_CYCLES else "monthly"


def compute_billing(monthly_price, billing_cycle: str | None, discount_pct=None) -> dict:
    """Return the price breakdown for a monthly/annual billing choice.

    Returns the chosen cycle, the original total, the discount applied and
    the final amount the member is charged.
    """
    monthly = float(monthly_price or 0)
    cycle = normalize_billing_cycle(billing_cycle)
    discount_pct = float(discount_pct or 0)

    if cycle == "annual":
        original_total = round(monthly * 12, 2)
        discount_applied = round(original_total * discount_pct / 100.0, 2)
    else:
        original_total = round(monthly, 2)
        discount_applied = 0.0

    final_amount = round(original_total - discount_applied, 2)

    return {
        "billing_cycle": cycle,
        "months": 12 if cycle == "annual" else 1,
        "original_total": original_total,
        "discount_applied": discount_applied,
        "final_amount": final_amount,
        "discount_percentage": discount_pct,
    }


def billing_cycle_duration_days(billing_cycle: str | None) -> int:
    """Membership days covered by a billing cycle (monthly=30, annual=365)."""
    return 365 if normalize_billing_cycle(billing_cycle) == "annual" else 30