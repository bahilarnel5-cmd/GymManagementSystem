"""gym_payment_submissions table (GCash proof-of-payment submissions)

Revision ID: gym_002
Revises: gym_001
Create Date: 2026-08-29
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import inspect

revision = "gym_002"
down_revision = "gym_001"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return inspect(bind).has_table(name)


def upgrade():
    if _has_table("gym_payment_submissions"):
        return
    op.create_table(
        "gym_payment_submissions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("member_id", UUID(as_uuid=True), sa.ForeignKey("gym_members.id"), nullable=False, index=True),
        sa.Column("membership_id", UUID(as_uuid=True), sa.ForeignKey("gym_memberships.id"), nullable=True),
        sa.Column("renewal_id", UUID(as_uuid=True), sa.ForeignKey("gym_renewal_requests.id"), nullable=True),
        sa.Column("amount_paid", sa.Numeric(10, 2), nullable=False),
        sa.Column("ref_last4", sa.String(4), nullable=False),
        sa.Column("screenshot_path", sa.String(300), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("admin_notes", sa.Text, nullable=True),
        sa.Column("submitted_at", sa.DateTime, nullable=False),
        sa.Column("reviewed_at", sa.DateTime, nullable=True),
        sa.Column("reviewed_by", UUID(as_uuid=True), sa.ForeignKey("gym_users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index(
        "ix_gym_payment_submissions_org_status",
        "gym_payment_submissions",
        ["organization_id", "status"],
    )


def downgrade():
    if _has_table("gym_payment_submissions"):
        op.drop_index("ix_gym_payment_submissions_org_status", table_name="gym_payment_submissions")
        op.drop_table("gym_payment_submissions")
