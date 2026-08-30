"""gym_coaches.email column.

Adds an optional email contact field to coach records. The coaching fee
(rate) is stored in `hourly_rate` and the phone contact in `mobile_contact`,
both of which already exist, so only `email` is added here.

Revision ID: gym_005
Revises: gym_004
Create Date: 2026-08-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "gym_005"
down_revision = "gym_004"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    return column in {c["name"] for c in inspect(bind).get_columns(table)}


def upgrade():
    if not _has_column("gym_coaches", "email"):
        op.add_column(
            "gym_coaches",
            sa.Column("email", sa.String(length=150), nullable=True),
        )


def downgrade():
    try:
        op.drop_column("gym_coaches", "email")
    except Exception:
        pass
