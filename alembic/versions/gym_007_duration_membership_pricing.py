"""Duration-based membership pricing + payment methods.

Adds the gym_duration_discounts table (per-org, months 1-12 each with an
editable discount %) and duration/payment fields on membership and renewal
records: months_selected, payment_method (full_payment/down_payment/cash) and
payment_status (pending/partially_paid/paid/cash_pending). Lastly seeds the
default 1-12 month discount curve for every existing organization.

Revision ID: gym_007
Revises: gym_006
Create Date: 2026-08-31
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
import uuid

revision = "gym_007"
down_revision = "gym_006"
branch_labels = None
depends_on = None

DEFAULT_DURATION_DISCOUNTS = {
    1: 0, 2: 2, 3: 4, 4: 6, 5: 8, 6: 10,
    7: 12, 8: 14, 9: 16, 10: 18, 11: 20, 12: 25,
}


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    return column in {c["name"] for c in inspect(bind).get_columns(table)}


def _has_table(table: str) -> bool:
    bind = op.get_bind()
    return table in {t.name for t in inspect(bind).get_table_names()}


def upgrade():
    if not _has_table("gym_duration_discounts"):
        op.create_table(
            "gym_duration_discounts",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("organization_id", sa.UUID(), nullable=False),
            sa.Column("months", sa.Integer(), nullable=False),
            sa.Column("discount_percentage", sa.Numeric(5, 2), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("created_by", sa.UUID(), nullable=True),
            sa.Column("updated_by", sa.UUID(), nullable=True),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("organization_id", "months", name="uq_gym_duration_discount_org_months"),
        )
        op.create_index(
            "ix_gym_duration_discounts_organization_id",
            "gym_duration_discounts",
            ["organization_id"],
        )

    for table in ("gym_memberships", "gym_renewal_requests"):
        if not _has_column(table, "months_selected"):
            op.add_column(table, sa.Column("months_selected", sa.Integer(), nullable=False, server_default="1"))
        if not _has_column(table, "payment_method"):
            op.add_column(table, sa.Column("payment_method", sa.String(length=20), nullable=False, server_default="full_payment"))
        if not _has_column(table, "payment_status"):
            op.add_column(table, sa.Column("payment_status", sa.String(length=20), nullable=False, server_default="pending"))

    # Seed default 1-12 month discounts for every existing organization.
    bind = op.get_bind()
    orgs = bind.execute(sa.text("SELECT id FROM organizations")).fetchall()
    for (org_id,) in orgs:
        for months, pct in DEFAULT_DURATION_DISCOUNTS.items():
            bind.execute(
                sa.text(
                    "INSERT INTO gym_duration_discounts "
                    "(id, organization_id, months, discount_percentage, created_at, updated_at) "
                    "VALUES (:id, :org, :months, :pct, now(), now()) "
                    "ON CONFLICT DO NOTHING"
                ),
                {
                    "id": uuid.uuid4(),
                    "org": org_id,
                    "months": months,
                    "pct": pct,
                },
            )


def downgrade():
    for table in ("gym_memberships", "gym_renewal_requests"):
        for col in ("payment_status", "payment_method", "months_selected"):
            try:
                op.drop_column(table, col)
            except Exception:
                pass
    try:
        op.drop_index("ix_gym_duration_discounts_organization_id", table_name="gym_duration_discounts")
        op.drop_table("gym_duration_discounts")
    except Exception:
        pass