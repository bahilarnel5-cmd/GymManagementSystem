"""gym_ module tables

Revision ID: gym_001
Revises: zzz_local_stub
Create Date: 2026-07-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import inspect

revision = "gym_001"
down_revision = "zzz_local_stub"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return inspect(bind).has_table(name)


def upgrade():
    if not _has_table("gym_coaches"):
        op.create_table(
            "gym_coaches",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("full_name", sa.String(150), nullable=False),
            sa.Column("specialization", sa.String(150), nullable=False),
            sa.Column("hourly_rate", sa.Numeric(10, 2), nullable=False),
            sa.Column("mobile_contact", sa.String(30), nullable=False),
            sa.Column("shift_schedule", sa.String(100), nullable=True),
            sa.Column("created_at", sa.DateTime, nullable=False),
            sa.Column("updated_at", sa.DateTime, nullable=False),
            sa.Column("created_by", UUID(as_uuid=True), nullable=True),
            sa.Column("updated_by", UUID(as_uuid=True), nullable=True),
        )

    if not _has_table("gym_members"):
        op.create_table(
            "gym_members",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("member_code", sa.String(20), nullable=False),
            sa.Column("full_name", sa.String(150), nullable=False),
            sa.Column("email", sa.String(150), nullable=True),
            sa.Column("mobile_phone", sa.String(30), nullable=False),
            sa.Column("assigned_coach_id", UUID(as_uuid=True), sa.ForeignKey("gym_coaches.id"), nullable=True),
            sa.Column("status", sa.String(20), nullable=False),
            sa.Column("created_at", sa.DateTime, nullable=False),
            sa.Column("updated_at", sa.DateTime, nullable=False),
            sa.Column("created_by", UUID(as_uuid=True), nullable=True),
            sa.Column("updated_by", UUID(as_uuid=True), nullable=True),
            sa.UniqueConstraint("organization_id", "member_code", name="uq_gym_members_org_code"),
        )
        op.create_index("ix_gym_members_org_status", "gym_members", ["organization_id", "status"])

    if not _has_table("gym_membership_plans"):
        op.create_table(
            "gym_membership_plans",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("name", sa.String(100), nullable=False),
            sa.Column("price", sa.Numeric(10, 2), nullable=False),
            sa.Column("billing_cycle", sa.String(20), nullable=False),
            sa.Column("features", sa.Text, nullable=True),
            sa.Column("is_active", sa.Boolean, nullable=False),
            sa.Column("created_at", sa.DateTime, nullable=False),
            sa.Column("updated_at", sa.DateTime, nullable=False),
            sa.Column("created_by", UUID(as_uuid=True), nullable=True),
            sa.Column("updated_by", UUID(as_uuid=True), nullable=True),
        )

    if not _has_table("gym_memberships"):
        op.create_table(
            "gym_memberships",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("member_id", UUID(as_uuid=True), sa.ForeignKey("gym_members.id"), nullable=False, index=True),
            sa.Column("plan_id", UUID(as_uuid=True), sa.ForeignKey("gym_membership_plans.id"), nullable=False),
            sa.Column("status", sa.String(20), nullable=False),
            sa.Column("payment_type", sa.String(20), nullable=False),
            sa.Column("amount_due", sa.Numeric(10, 2), nullable=False),
            sa.Column("amount_paid", sa.Numeric(10, 2), nullable=False),
            sa.Column("start_date", sa.Date, nullable=False),
            sa.Column("end_date", sa.Date, nullable=False),
            sa.Column("last_contacted_at", sa.DateTime, nullable=True),
            sa.Column("created_at", sa.DateTime, nullable=False),
            sa.Column("updated_at", sa.DateTime, nullable=False),
            sa.Column("created_by", UUID(as_uuid=True), nullable=True),
            sa.Column("updated_by", UUID(as_uuid=True), nullable=True),
        )

    if not _has_table("gym_pt_sessions"):
        op.create_table(
            "gym_pt_sessions",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("coach_id", UUID(as_uuid=True), sa.ForeignKey("gym_coaches.id"), nullable=False),
            sa.Column("member_id", UUID(as_uuid=True), sa.ForeignKey("gym_members.id"), nullable=False),
            sa.Column("session_date", sa.DateTime, nullable=False),
            sa.Column("status", sa.String(20), nullable=False),
            sa.Column("payment_type", sa.String(20), nullable=False),
            sa.Column("amount", sa.Numeric(10, 2), nullable=False),
            sa.Column("amount_paid", sa.Numeric(10, 2), nullable=False),
            sa.Column("created_at", sa.DateTime, nullable=False),
            sa.Column("updated_at", sa.DateTime, nullable=False),
            sa.Column("created_by", UUID(as_uuid=True), nullable=True),
            sa.Column("updated_by", UUID(as_uuid=True), nullable=True),
        )

    if not _has_table("gym_payments"):
        op.create_table(
            "gym_payments",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("member_id", UUID(as_uuid=True), sa.ForeignKey("gym_members.id"), nullable=False),
            sa.Column("membership_id", UUID(as_uuid=True), sa.ForeignKey("gym_memberships.id"), nullable=True),
            sa.Column("receipt_no", sa.String(30), nullable=False),
            sa.Column("item_description", sa.String(200), nullable=False),
            sa.Column("amount", sa.Numeric(10, 2), nullable=False),
            sa.Column("payment_method", sa.String(30), nullable=False),
            sa.Column("reference_no", sa.String(50), nullable=True),
            sa.Column("status", sa.String(20), nullable=False),
            sa.Column("paid_at", sa.DateTime, nullable=False),
            sa.Column("created_at", sa.DateTime, nullable=False),
            sa.Column("updated_at", sa.DateTime, nullable=False),
            sa.Column("created_by", UUID(as_uuid=True), nullable=True),
            sa.Column("updated_by", UUID(as_uuid=True), nullable=True),
            sa.UniqueConstraint("organization_id", "receipt_no", name="uq_gym_payments_org_receipt"),
        )

    if not _has_table("gym_check_ins"):
        op.create_table(
            "gym_check_ins",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("member_id", UUID(as_uuid=True), sa.ForeignKey("gym_members.id"), nullable=False),
            sa.Column("zone_class", sa.String(100), nullable=True),
            sa.Column("checked_in_at", sa.DateTime, nullable=False),
            sa.Column("status", sa.String(20), nullable=False),
            sa.Column("created_at", sa.DateTime, nullable=False),
            sa.Column("updated_at", sa.DateTime, nullable=False),
            sa.Column("created_by", UUID(as_uuid=True), nullable=True),
            sa.Column("updated_by", UUID(as_uuid=True), nullable=True),
        )

    if not _has_table("gym_settings"):
        op.create_table(
            "gym_settings",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, unique=True),
            sa.Column("business_name", sa.String(150), nullable=False),
            sa.Column("bir_tin_number", sa.String(50), nullable=True),
            sa.Column("official_email", sa.String(150), nullable=True),
            sa.Column("physical_address", sa.Text, nullable=True),
            sa.Column("checkin_timeout_minutes", sa.Integer, nullable=False),
            sa.Column("alert_desk_on_expired_checkin", sa.Boolean, nullable=False),
            sa.Column("require_signature_first_guest", sa.Boolean, nullable=False),
            sa.Column("sms_gateway_service", sa.String(50), nullable=True),
            sa.Column("auto_sms_reminder_days", sa.Integer, nullable=False),
            sa.Column("created_at", sa.DateTime, nullable=False),
            sa.Column("updated_at", sa.DateTime, nullable=False),
            sa.Column("created_by", UUID(as_uuid=True), nullable=True),
            sa.Column("updated_by", UUID(as_uuid=True), nullable=True),
        )

    if not _has_table("gym_users"):
        op.create_table(
            "gym_users",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("email", sa.String(255), nullable=False),
            sa.Column("hashed_password", sa.String(255), nullable=False),
            sa.Column("role", sa.String(20), nullable=False),
            sa.Column("member_id", UUID(as_uuid=True), sa.ForeignKey("gym_members.id"), nullable=True),
            sa.Column("created_at", sa.DateTime, nullable=False),
            sa.Column("updated_at", sa.DateTime, nullable=False),
            sa.Column("created_by", UUID(as_uuid=True), nullable=True),
            sa.Column("updated_by", UUID(as_uuid=True), nullable=True),
            sa.UniqueConstraint("organization_id", "email", name="uq_gym_users_org_email"),
        )

    if not _has_table("gym_renewal_requests"):
        op.create_table(
            "gym_renewal_requests",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("member_id", UUID(as_uuid=True), sa.ForeignKey("gym_members.id"), nullable=False),
            sa.Column("membership_id", UUID(as_uuid=True), sa.ForeignKey("gym_memberships.id"), nullable=False),
            sa.Column("requested_date", sa.DateTime, nullable=False),
            sa.Column("payment_type", sa.String(20), nullable=False),
            sa.Column("amount", sa.Numeric(10, 2), nullable=False),
            sa.Column("status", sa.String(20), nullable=False),
            sa.Column("created_at", sa.DateTime, nullable=False),
            sa.Column("updated_at", sa.DateTime, nullable=False),
            sa.Column("created_by", UUID(as_uuid=True), nullable=True),
            sa.Column("updated_by", UUID(as_uuid=True), nullable=True),
        )


def downgrade():
    op.drop_table("gym_renewal_requests")
    op.drop_table("gym_users")
    op.drop_table("gym_settings")
    op.drop_table("gym_check_ins")
    op.drop_table("gym_payments")
    op.drop_table("gym_pt_sessions")
    op.drop_table("gym_memberships")
    op.drop_table("gym_membership_plans")
    op.drop_table("gym_members")
    op.drop_table("gym_coaches")
