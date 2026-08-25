"""local sandbox stub - organizations and users (NOT part of gym_ module, do not hand over)

Revision ID: zzz_local_stub
Revises:
Create Date: 2026-07-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "zzz_local_stub"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "organizations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
    )
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
    )


def downgrade():
    op.drop_table("users")
    op.drop_table("organizations")