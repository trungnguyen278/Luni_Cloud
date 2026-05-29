"""Widen interactions.direction to varchar(20).

Revision ID: 002
Revises: 001
Create Date: 2026-05-29
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "interactions",
        "direction",
        type_=sa.String(20),
        existing_type=sa.String(10),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "interactions",
        "direction",
        type_=sa.String(10),
        existing_type=sa.String(20),
        existing_nullable=False,
    )
