import contextlib
import logging
import os
import urllib.parse
from collections.abc import AsyncGenerator
from datetime import date, datetime

from sqlalchemy import JSON as JSON_TYPE
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    create_engine,
    func,
    text,
)
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, scoped_session, sessionmaker


def _default_database_url() -> str:
    """Return a sensible default PostgreSQL URL.

    - Inside Docker: prefer service hostname "postgres" (same compose network)
    - Outside Docker: default to localhost
    Override any case with the DATABASE_URL env var.
    """
    try:
        in_docker = os.path.exists("/.dockerenv") or os.environ.get("IN_DOCKER") == "1"
    except Exception:
        in_docker = False
    if in_docker:
        return "postgresql+psycopg://postgres:postgres@postgres:5432/whatsapp_bot"
    return "postgresql+psycopg://postgres:postgres@localhost:5432/whatsapp_bot"


def _normalize_database_url(url: str) -> str:
    """If running inside Docker and URL points to localhost, rewrite host to 'postgres'.

    This avoids accidental use of 127.0.0.1/::1 inside the backend container.
    """
    try:
        in_docker = os.path.exists("/.dockerenv") or os.environ.get("IN_DOCKER") == "1"
        if not in_docker:
            return url
        parsed = urllib.parse.urlsplit(url)
        # Only adjust for postgresql schemes
        if not parsed.scheme.startswith("postgresql"):
            return url
        hostname = parsed.hostname or ""
        if hostname in {"localhost", "127.0.0.1", "::1"}:
            # Rebuild netloc with 'postgres' hostname
            userinfo = parsed.username or ""
            if parsed.password:
                userinfo = f"{userinfo}:{parsed.password}"
            if userinfo:
                userinfo = f"{userinfo}@"
            port = f":{parsed.port}" if parsed.port else ""
            new_netloc = f"{userinfo}postgres{port}"
            return urllib.parse.urlunsplit((parsed.scheme, new_netloc, parsed.path, parsed.query, parsed.fragment))
        return url
    except Exception:
        return url


DATABASE_URL = _normalize_database_url(os.environ.get("DATABASE_URL") or _default_database_url())


def _derive_async_url(url: str) -> str:
    """Derive an async SQLAlchemy URL from a sync URL.

    Example: postgresql+psycopg -> postgresql+asyncpg
    """
    if "+" in url:
        dialect, driver_and_rest = url.split("+", 1)
        driver, rest = driver_and_rest.split("://", 1)
        # Force async driver for PostgreSQL
        if dialect == "postgresql":
            return f"postgresql+asyncpg://{rest}"
    # Fallback: assume postgresql without explicit driver
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


# SQLAlchemy engine and session factory (sync)
engine: Engine = create_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
)
SessionLocal = scoped_session(sessionmaker(bind=engine, autoflush=False, expire_on_commit=False))

# Async engine/session for libraries that require AsyncSession (e.g., fastapi-users)
async_engine: AsyncEngine = create_async_engine(_derive_async_url(DATABASE_URL), echo=False, future=True)
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    autoflush=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


class CustomerModel(Base):
    __tablename__ = "customers"

    wa_id: Mapped[str] = mapped_column(String, primary_key=True)
    customer_name: Mapped[str | None] = mapped_column(String, nullable=True)
    # Optional age field; keep nullable to avoid forcing data for all existing customers
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Date when the age value was recorded/reset. Used to auto-increment age yearly.
    age_recorded_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    # JSON/JSONB document data
    document: Mapped[object | None] = mapped_column(JSON_TYPE, nullable=True)
    is_blocked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    is_favorite: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    __table_args__ = (Index("idx_customers_wa_id", "wa_id"),)


class ConversationModel(Base):
    __tablename__ = "conversation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    wa_id: Mapped[str] = mapped_column(String, ForeignKey("customers.wa_id"), nullable=False, index=True)
    role: Mapped[str | None] = mapped_column(String, nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    date: Mapped[str | None] = mapped_column(String, nullable=True)
    time: Mapped[str | None] = mapped_column(String, nullable=True)

    __table_args__ = (
        Index("idx_conversation_wa_id", "wa_id"),
        Index("idx_conversation_wa_id_date_time", "wa_id", "date", "time"),
    )


class ReservationModel(Base):
    __tablename__ = "reservations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    wa_id: Mapped[str] = mapped_column(String, ForeignKey("customers.wa_id"), nullable=False, index=True)
    date: Mapped[str] = mapped_column(String, nullable=False, index=True)
    time_slot: Mapped[str] = mapped_column(String, nullable=False, index=True)
    type: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="active")
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp()
    )

    __table_args__ = (
        CheckConstraint("type IN (0, 1)", name="ck_reservations_type"),
        CheckConstraint("status IN ('active','cancelled')", name="ck_reservations_status"),
        Index("idx_reservations_wa_id", "wa_id"),
        Index("idx_reservations_date_time", "date", "time_slot"),
        Index("idx_reservations_status", "status"),
        Index("idx_reservations_wa_id_status", "wa_id", "status"),
        Index("idx_reservations_date_time_status", "date", "time_slot", "status"),
        Index("idx_reservations_wa_id_updated_at", "wa_id", "updated_at"),  # For latest_reservations CTE
    )


class VacationPeriodModel(Base):
    __tablename__ = "vacation_periods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    duration_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp()
    )

    __table_args__ = (
        CheckConstraint("duration_days IS NULL OR duration_days >= 1", name="ck_vacation_duration_positive"),
        CheckConstraint("end_date IS NULL OR start_date <= end_date", name="ck_vacation_start_before_end"),
        Index("idx_vacations_start", "start_date"),
        Index("idx_vacations_end", "end_date"),
    )


class NotificationEventModel(Base):
    __tablename__ = "notification_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False, index=True)
    # ISO 8601 UTC timestamp string (matches websocket broadcast timestamp)
    ts_iso: Mapped[str] = mapped_column(String, nullable=False, index=True)
    # Raw payload as JSON string (so frontend can reconstruct message-specific text)
    data: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=text("CURRENT_TIMESTAMP"))

    __table_args__ = (
        Index("idx_notification_events_type_ts", "event_type", "ts_iso"),
        Index("idx_notification_events_created_at", "created_at"),
    )


class InboundMessageQueueModel(Base):
    __tablename__ = "inbound_message_queue"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # WhatsApp message id for idempotency; nullable to handle edge cases without message id
    message_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    # Minimal fields needed to re-process
    wa_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")  # pending|processing|done|failed
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp(), index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp()
    )
    # When claimed by a worker
    locked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)

    __table_args__ = (
        # De-duplication for known message ids (skip NULLs to allow inserts when unknown)
        Index(
            "uq_inbound_message_queue_message_id_not_null",
            "message_id",
            unique=True,
            postgresql_where=text("message_id IS NOT NULL"),
        )
        if "postgresql" in str(engine.url)
        else Index("idx_inbound_message_queue_message_id", "message_id"),
        Index("idx_inbound_queue_status_created", "status", "created_at"),
    )


def init_models() -> None:
    """Create database tables if they do not exist."""
    # Ensure auth models are imported so metadata includes them
    try:
        from app.auth import models as _auth_models  # noqa: F401
    except Exception:
        # Auth module may not be present in some environments
        pass
    # Ensure config models are imported
    try:
        from app.services.domain.config import config_models as _config_models  # noqa: F401
    except Exception:
        # Config module may not be present in some environments
        pass
    Base.metadata.create_all(bind=engine)  # type: ignore

    # Lightweight migration (PostgreSQL-safe): ensure optional columns exist
    try:
        with engine.begin() as conn:
            try:
                conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS plpython3u;")
                conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS aws_s3;")
            except Exception as extension_error:  # noqa: BLE001
                logging.warning("Failed to initialize aws_s3 extension: %s", extension_error)
            # Enable pg_trgm extension for fuzzy text search
            with contextlib.suppress(Exception):
                conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

            # Ensure partial unique index for message_id on Postgres (idempotency)
            with contextlib.suppress(Exception):
                conn.exec_driver_sql(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_inbound_message_queue_message_id_not_null ON inbound_message_queue (message_id) WHERE message_id IS NOT NULL;"
                )
            conn.exec_driver_sql("ALTER TABLE IF EXISTS customers ADD COLUMN IF NOT EXISTS age INTEGER;")
            conn.exec_driver_sql("ALTER TABLE IF EXISTS customers ADD COLUMN IF NOT EXISTS age_recorded_at DATE;")
            conn.exec_driver_sql(
                "ALTER TABLE IF EXISTS customers ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;"
            )
            conn.exec_driver_sql(
                "ALTER TABLE IF EXISTS customers ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;"
            )
            # Try JSONB first (Postgres), fallback to JSON for other engines
            try:
                conn.exec_driver_sql("ALTER TABLE IF EXISTS customers ADD COLUMN IF NOT EXISTS document JSONB;")
            except Exception:
                with contextlib.suppress(Exception):
                    conn.exec_driver_sql("ALTER TABLE IF EXISTS customers ADD COLUMN IF NOT EXISTS document JSON;")
            with contextlib.suppress(Exception):
                conn.exec_driver_sql(
                    "UPDATE customers SET age_recorded_at = CURRENT_DATE WHERE age_recorded_at IS NULL AND age IS NOT NULL;"
                )

            # Create Arabic normalization function for better fuzzy matching
            with contextlib.suppress(Exception):
                conn.exec_driver_sql("""
                    CREATE OR REPLACE FUNCTION normalize_arabic(text) RETURNS text AS $$
                    BEGIN
                        RETURN TRANSLATE($1,
                            'أإآٱةىَُِّْ',
                            'اااا' || 'ه' || 'ي' || ''
                        );
                    END;
                    $$ LANGUAGE plpgsql IMMUTABLE;
                """)

            # Create GIN indexes for pg_trgm search on customers table
            with contextlib.suppress(Exception):
                conn.exec_driver_sql(
                    "CREATE INDEX IF NOT EXISTS idx_customers_wa_id_trgm ON customers USING gin (wa_id gin_trgm_ops);"
                )
            with contextlib.suppress(Exception):
                conn.exec_driver_sql(
                    "CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin (customer_name gin_trgm_ops);"
                )

            # Create GIN index on normalized customer names for better Arabic search
            with contextlib.suppress(Exception):
                conn.exec_driver_sql(
                    "CREATE INDEX IF NOT EXISTS idx_customers_name_normalized_trgm ON customers USING gin (normalize_arabic(customer_name) gin_trgm_ops);"
                )
    except Exception:
        # Best-effort migration; ignore if fails in restricted contexts
        pass


def get_session() -> Session:
    """Get a new SQLAlchemy session.

    Returns a session that the caller must close. Prefer usage as:
        with get_session() as session:
            ...
    """
    return SessionLocal()


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield an AsyncSession for async database operations.

    Usage:
        async with get_async_session() as session:
            ...
    """
    async with AsyncSessionLocal() as session:
        yield session


# Initialize tables on import to preserve previous behavior
# Disabled for UI-only mode - no database required
# init_models()
