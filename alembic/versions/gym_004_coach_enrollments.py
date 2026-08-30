"""gym_coach_enrollments table + payment_submissions.enrollment_id column.

Adds the coach enrollment workflow table and links GCash payment
submissions to an enrollment (in addition to membership/renewal).

Revision ID: gym_004
Revises: gym_003
Create Date: 2026-08-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy import inspect

revision = "gym_004"
down_revision = "gym_003"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return inspect(bind).has_table(name)


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    return column in {c["name"] for c in inspect(bind).get_columns(table)}


def upgrade():
    # Link column on gym_payment_submissions (idempotent on shared/live DBs).
    if _has_table("gym_payment_submissions"):
        if not _has_column("gym_payment_submissions", "enrollment_id"):
            op.add_column(
                "gym_payment_submissions",
                sa.Column("enrollment_id", UUID(as_uuid=True), sa.ForeignKey("gym_coach_enrollments.id"), nullable=True),
            )

    if _has_table("gym_coach_enrollments"):
        return
    op.create_table(
        "gym_coach_enrollments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("member_id", UUID(as_uuid=True), sa.ForeignKey("gym_members.id"), nullable=False, index=True),
        sa.Column("coach_id", UUID(as_uuid=True), sa.ForeignKey("gym_coaches.id"), nullable=False, index=True),
        sa.Column("selected_days", ARRAY(sa.Integer), nullable=False),
        sa.Column("payment_method", sa.String(20), nullable=False),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("amount_paid", sa.Numeric(10, 2), nullable=False),
        sa.Column("payment_status", sa.String(20), nullable=False),
        sa.Column("enrollment_status", sa.String(20), nullable=False),
        sa.Column("enrolled_at", sa.DateTime, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_gym_coach_enrollments_org", "gym_coach_enrollments", ["organization_id"])
    op.create_index("ix_gym_coach_enrollments_member", "gym_coach_enrollments", ["member_id"])
    op.create_index("ix_gym_coach_enrollments_coach", "gym_coach_enrollments", ["coach_id"])


def downgrade():
    if _has_table("gym_coach_enrollments"):
        op.drop_index("ix_gym_coach_enrollments_coach", table_name="gym_coach_enrollments")
        op.drop_index("ix_gym_coach_enrollments_member", table_name="gym_coach_enrollments")
        op.drop_index("ix_gym_coach_enrollments_org", table_name="gym_coach_enrollments")
        op.drop_table("gym_coach_enrollments")
    if _has_table("gym_payment_submissions"):
        if _has_column("gym_payment_submissions", "enrollment_id"):
            op.drop_column("gym_payment_submissions", "enrollment_id")
