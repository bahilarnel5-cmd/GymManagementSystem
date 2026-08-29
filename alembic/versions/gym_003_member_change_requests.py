"""gym_member_change_requests table + new member profile columns.

Adds the member info change-request workflow table and the backing
gym_members columns for fields that previously had nowhere to live
(address, emergency_contact, profile_photo).

Revision ID: gym_003
Revises: gym_002
Create Date: 2026-08-29
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import inspect

revision = "gym_003"
down_revision = "gym_002"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return inspect(bind).has_table(name)


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    return column in {c["name"] for c in inspect(bind).get_columns(table)}


def upgrade():
    # Backing columns on gym_members (idempotent on shared/live DBs).
    if _has_table("gym_members"):
        if not _has_column("gym_members", "address"):
            op.add_column("gym_members", sa.Column("address", sa.Text, nullable=True))
        if not _has_column("gym_members", "emergency_contact"):
            op.add_column("gym_members", sa.Column("emergency_contact", sa.String(200), nullable=True))
        if not _has_column("gym_members", "profile_photo"):
            op.add_column("gym_members", sa.Column("profile_photo", sa.String(300), nullable=True))

    if _has_table("gym_member_change_requests"):
        return
    op.create_table(
        "gym_member_change_requests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("member_id", UUID(as_uuid=True), sa.ForeignKey("gym_members.id"), nullable=False),
        sa.Column("field_name", sa.String(50), nullable=False),
        sa.Column("current_value", sa.Text, nullable=True),
        sa.Column("requested_value", sa.Text, nullable=False),
        sa.Column("reason", sa.String(50), nullable=False),
        sa.Column("explanation", sa.Text, nullable=False),
        sa.Column("proof_url", sa.String(300), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("admin_notes", sa.Text, nullable=True),
        sa.Column("submitted_at", sa.DateTime, nullable=False),
        sa.Column("reviewed_at", sa.DateTime, nullable=True),
        sa.Column("reviewed_by", UUID(as_uuid=True), sa.ForeignKey("gym_users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index(
        "ix_gym_member_change_requests_org_status",
        "gym_member_change_requests",
        ["organization_id", "status"],
    )
    op.create_index(
        "ix_gym_member_change_requests_member",
        "gym_member_change_requests",
        ["member_id"],
    )


def downgrade():
    if _has_table("gym_member_change_requests"):
        op.drop_index("ix_gym_member_change_requests_member", table_name="gym_member_change_requests")
        op.drop_index("ix_gym_member_change_requests_org_status", table_name="gym_member_change_requests")
        op.drop_table("gym_member_change_requests")
    if _has_table("gym_members"):
        for col in ("profile_photo", "emergency_contact", "address"):
            if _has_column("gym_members", col):
                op.drop_column("gym_members", col)
