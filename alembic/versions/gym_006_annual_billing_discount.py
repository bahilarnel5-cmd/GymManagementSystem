"""Annual billing discount.

Adds a global annual discount rate to gym settings and records the chosen
billing cycle, discount applied, and final charged amount on membership and
renewal-request records so historical pricing stays accurate.

Revision ID: gym_006
Revises: gym_005
Create Date: 2026-08-31
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "gym_006"
down_revision = "gym_005"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    return column in {c["name"] for c in inspect(bind).get_columns(table)}


def upgrade():
    if not _has_column("gym_settings", "annual_discount_percentage"):
        op.add_column(
            "gym_settings",
            sa.Column("annual_discount_percentage", sa.Numeric(5, 2), nullable=False, server_default="15"),
        )

    if not _has_column("gym_memberships", "billing_cycle"):
        op.add_column(
            "gym_memberships",
            sa.Column("billing_cycle", sa.String(length=20), nullable=False, server_default="monthly"),
        )
    if not _has_column("gym_memberships", "discount_applied"):
        op.add_column(
            "gym_memberships",
            sa.Column("discount_applied", sa.Numeric(10, 2), nullable=True),
        )
    if not _has_column("gym_memberships", "final_amount"):
        op.add_column(
            "gym_memberships",
            sa.Column("final_amount", sa.Numeric(10, 2), nullable=False, server_default="0"),
        )

    if not _has_column("gym_renewal_requests", "billing_cycle"):
        op.add_column(
            "gym_renewal_requests",
            sa.Column("billing_cycle", sa.String(length=20), nullable=False, server_default="monthly"),
        )
    if not _has_column("gym_renewal_requests", "discount_applied"):
        op.add_column(
            "gym_renewal_requests",
            sa.Column("discount_applied", sa.Numeric(10, 2), nullable=True),
        )
    if not _has_column("gym_renewal_requests", "final_amount"):
        op.add_column(
            "gym_renewal_requests",
            sa.Column("final_amount", sa.Numeric(10, 2), nullable=False, server_default="0"),
        )


def downgrade():
    for col in ("final_amount", "discount_applied", "billing_cycle"):
        try:
            op.drop_column("gym_renewal_requests", col)
        except Exception:
            pass
    for col in ("final_amount", "discount_applied", "billing_cycle"):
        try:
            op.drop_column("gym_memberships", col)
        except Exception:
            pass
    try:
        op.drop_column("gym_settings", "annual_discount_percentage")
    except Exception:
        pass