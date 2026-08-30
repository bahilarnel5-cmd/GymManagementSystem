"""Demo-mode overrides for the GCash checkout flow.

Set DEMO_MODE=1 (env var) to force every member-facing payable amount
(membership avail, renewal, coach enrollment) to a fixed ₱5.00 for a live
demo, WITHOUT touching the stored coach/plan prices. The GCash receiving
details below are the gym's real account (also used in normal mode).

Leave DEMO_MODE unset/0 (the default) for real pricing.
"""
import os

DEMO_AMOUNT = 5.00
RECEIVING_NAME = "Arnel Bahil"
RECEIVING_NUMBER = "09690226049"


def demo_enabled() -> bool:
    return os.getenv("DEMO_MODE", "0").strip().lower() in ("1", "true", "yes", "on")


def demo_amount(real_amount) -> float:
    """Payable amount to display + expect in demo mode; else the real amount."""
    if demo_enabled():
        return DEMO_AMOUNT
    return float(real_amount or 0)


def demo_payment_info() -> dict:
    """GCash receiving details served to the checkout screen, plus demo flags."""
    return {
        "receiving_name": RECEIVING_NAME,
        "receiving_number": RECEIVING_NUMBER,
        "demo_mode": demo_enabled(),
        "demo_amount_due": DEMO_AMOUNT if demo_enabled() else None,
    }