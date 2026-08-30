"""Billing cycle pricing for membership purchases and renewals.

Monthly billing charges the plan's monthly price unchanged. Annual billing
charges 12 months less the organization's global annual discount rate.

Duration pricing lets members prepay 1-12 months; each month tier has its own
discount from the gym_duration_discounts table. All money values are rounded
to two decimals (PHP).
"""
from sqlalchemy.orm import Session

from app.models import GymSettings, GymDurationDiscount

DEFAULT_ANNUAL_DISCOUNT_PERCENTAGE = 15.0

BILLING_CYCLES = ("monthly", "annual")

VALID_PAYMENT_METHODS = ("full_payment", "down_payment", "cash")

DOWN_PAYMENT_PERCENTAGE = 30.0

# Default duration discounts (months -> %) used when an org has no rows yet.
DEFAULT_DURATION_DISCOUNTS = {
    1: 0, 2: 2, 3: 4, 4: 6, 5: 8, 6: 10,
    7: 12, 8: 14, 9: 16, 10: 18, 11: 20, 12: 25,
}


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


def normalize_payment_method(payment_method: str | None) -> str:
    method = (payment_method or "full_payment").lower()
    return method if method in VALID_PAYMENT_METHODS else "full_payment"


def duration_discount_percentage(db: Session, organization_id, months: int) -> float:
    """Discount % for prepaying `months` (1-12) of membership. Falls back to
    the default curve when the org hasn't customized its duration discounts."""
    discount = (
        db.query(GymDurationDiscount)
        .filter(
            GymDurationDiscount.organization_id == organization_id,
            GymDurationDiscount.months == months,
        )
        .first()
    )
    if discount and discount.discount_percentage is not None:
        return float(discount.discount_percentage)
    return float(DEFAULT_DURATION_DISCOUNTS.get(months, 0))


def ensure_duration_discounts(db: Session, organization_id):
    """Insert the default 1-12 month discount curve for any missing months.
    Idempotent; safe to call on every membership-related request."""
    import uuid
    from datetime import datetime, timezone

    existing = {
        r[0]
        for r in db.query(GymDurationDiscount.months)
        .filter(GymDurationDiscount.organization_id == organization_id)
        .all()
    }
    now = datetime.now(timezone.utc)
    added = False
    for months, pct in DEFAULT_DURATION_DISCOUNTS.items():
        if months not in existing:
            db.add(GymDurationDiscount(
                id=uuid.uuid4(),
                organization_id=organization_id,
                months=months,
                discount_percentage=pct,
                created_at=now,
                updated_at=now,
            ))
            added = True
    if added:
        db.commit()


def billing_cycle_for_months(months: int) -> str:
    return "annual" if months >= 12 else "monthly"


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


def compute_duration_pricing(monthly_price, months: int | None, discount_pct=None) -> dict:
    """Price breakdown for prepaying `months` (1-12) of a membership.

    Returns the month count, original total before discount, discount
    percentage, discount applied, the final charged amount, and the amount
    saved (synonymous with discount applied) for display to members.
    """
    monthly = float(monthly_price or 0)
    months = max(1, min(12, int(months or 1)))
    discount_pct = float(discount_pct or 0)

    original_total = round(monthly * months, 2)
    discount_applied = round(original_total * discount_pct / 100.0, 2)
    final_amount = round(original_total - discount_applied, 2)

    return {
        "months": months,
        "billing_cycle": billing_cycle_for_months(months),
        "original_total": original_total,
        "discount_percentage": discount_pct,
        "discount_applied": discount_applied,
        "final_amount": final_amount,
        "amount_saved": discount_applied,
    }


def billing_cycle_duration_days(billing_cycle: str | None) -> int:
    """Membership days covered by a billing cycle (monthly=30, annual=365)."""
    return 365 if normalize_billing_cycle(billing_cycle) == "annual" else 30


def months_duration_days(months: int) -> int:
    return max(1, min(12, int(months or 1))) * 30