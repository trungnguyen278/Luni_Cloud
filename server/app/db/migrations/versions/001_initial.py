"""Initial schema — all tables.

Revision ID: 001
Revises: None
Create Date: 2025-05-28
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === USERS ===
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("password", sa.String(255), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="user"),
        sa.Column("avatar_url", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
    )

    # === REFRESH TOKENS ===
    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token", sa.String(512), unique=True, nullable=False),
        sa.Column("device_info", sa.Text, nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index("idx_refresh_tokens_user", "refresh_tokens", ["user_id"])
    op.create_index("idx_refresh_tokens_expires", "refresh_tokens", ["expires_at"])

    # === DEVICES ===
    op.create_table(
        "devices",
        sa.Column("id", sa.String(17), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False, server_default="Luni"),
        sa.Column("model", sa.String(50), nullable=False),
        sa.Column("fw_version", sa.String(20), nullable=True),
        sa.Column("hw_version", sa.String(20), nullable=True),
        sa.Column("location", sa.String(100), nullable=True),
        sa.Column(
            "timezone", sa.String(50), server_default="Asia/Ho_Chi_Minh"
        ),
        sa.Column("latitude", sa.Double, nullable=True),
        sa.Column("longitude", sa.Double, nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column(
            "config",
            postgresql.JSONB,
            nullable=False,
            server_default='{"volume": 60, "brightness": 100, "log_level": "info", "auto_ota": false, "sleep_schedule": null}',
        ),
        sa.Column("device_token", sa.String(128), nullable=False),
        sa.Column("is_online", sa.Boolean, server_default=sa.text("false")),
        sa.Column("last_state", postgresql.JSONB, nullable=True),
        sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # === DEVICE SHARES ===
    op.create_table(
        "device_shares",
        sa.Column(
            "device_id",
            sa.String(17),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "permission",
            sa.String(20),
            nullable=False,
            server_default="control",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # === DEVICE LOGS ===
    op.create_table(
        "device_logs",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "device_id",
            sa.String(17),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "source", sa.String(10), nullable=False, server_default="device"
        ),
        sa.Column("level", sa.String(10), nullable=False),
        sa.Column("tag", sa.String(50), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "idx_logs_device_level",
        "device_logs",
        ["device_id", "level", sa.text("created_at DESC")],
    )
    op.create_index(
        "idx_logs_created", "device_logs", [sa.text("created_at DESC")]
    )

    # === SERVER LOGS ===
    op.create_table(
        "server_logs",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("level", sa.String(10), nullable=False),
        sa.Column("module", sa.String(100), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("request_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("device_id", sa.String(17), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "idx_server_logs_level",
        "server_logs",
        ["level", sa.text("created_at DESC")],
    )
    op.create_index(
        "idx_server_logs_module",
        "server_logs",
        ["module", sa.text("created_at DESC")],
    )
    op.create_index(
        "idx_server_logs_request",
        "server_logs",
        ["request_id"],
        postgresql_where=sa.text("request_id IS NOT NULL"),
    )

    # === USAGE STATS ===
    op.create_table(
        "usage_stats",
        sa.Column(
            "device_id",
            sa.String(17),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("date", sa.Date, primary_key=True),
        sa.Column("interactions", sa.Integer, server_default="0"),
        sa.Column("audio_secs", sa.Integer, server_default="0"),
        sa.Column("uptime_secs", sa.Integer, server_default="0"),
        sa.Column("errors", sa.Integer, server_default="0"),
        sa.Column("warnings", sa.Integer, server_default="0"),
        sa.Column("avg_rssi", sa.SmallInteger, nullable=True),
        sa.Column("min_battery", sa.SmallInteger, nullable=True),
    )
    op.create_index(
        "idx_stats_date", "usage_stats", [sa.text("date DESC")]
    )

    # === FIRMWARE ===
    op.create_table(
        "firmware",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("version", sa.String(20), nullable=False),
        sa.Column("model", sa.String(50), nullable=False),
        sa.Column("storage_url", sa.Text, nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("size", sa.Integer, nullable=False),
        sa.Column("changelog", sa.Text, nullable=True),
        sa.Column("channel", sa.String(20), server_default="stable"),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("version", "model", name="uq_firmware_version_model"),
    )

    # === OTA HISTORY ===
    op.create_table(
        "ota_history",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "device_id",
            sa.String(17),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "firmware_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("firmware.id"),
            nullable=False,
        ),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("progress", sa.SmallInteger, server_default="0"),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "idx_ota_device",
        "ota_history",
        ["device_id", sa.text("started_at DESC")],
    )

    # === INTERACTIONS ===
    op.create_table(
        "interactions",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "device_id",
            sa.String(17),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("direction", sa.String(10), nullable=False),
        sa.Column("source", sa.String(10), nullable=False),
        sa.Column("input_text", sa.Text, nullable=True),
        sa.Column("output_text", sa.Text, nullable=True),
        sa.Column("emotion", sa.String(30), nullable=True),
        sa.Column("audio_secs", sa.Double, nullable=True),
        sa.Column("latency_ms", sa.Integer, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "idx_interactions_device",
        "interactions",
        ["device_id", sa.text("created_at DESC")],
    )
    op.create_index(
        "idx_interactions_user",
        "interactions",
        ["user_id", sa.text("created_at DESC")],
    )


def downgrade() -> None:
    op.drop_table("interactions")
    op.drop_table("ota_history")
    op.drop_table("firmware")
    op.drop_table("usage_stats")
    op.drop_table("server_logs")
    op.drop_table("device_logs")
    op.drop_table("device_shares")
    op.drop_table("devices")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
