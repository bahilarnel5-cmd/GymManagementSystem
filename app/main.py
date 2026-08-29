import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine, Base, SessionLocal
from app.routers import all_routers
from app.menu_catalog import seed_role_menus

import app.models  # noqa: F401 — ensure all models are registered

Base.metadata.create_all(bind=engine)


def ensure_schema():
    """Idempotently add columns that were introduced after a table existed.

    During a first deploy (fresh DB) create_all already creates these columns,
    so each ALTER ... IF NOT EXISTS is a no-op. On an existing DB (the live
    Supabase one) this safely adds them without a manual migration.
    """
    statements = [
        "ALTER TABLE gym_users ADD COLUMN IF NOT EXISTS coach_id UUID",
        "ALTER TABLE gym_payments ADD COLUMN IF NOT EXISTS payment_category VARCHAR(20) NOT NULL DEFAULT 'membership'",
        "ALTER TABLE gym_payments ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0",
        "ALTER TABLE gym_payments ADD COLUMN IF NOT EXISTS discount_description VARCHAR(200)",
    ]
    conn = engine.connect().execution_options(isolation_level="AUTOCOMMIT")
    try:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except Exception:
                pass  # table missing on a brand-new org or column already handled
    finally:
        conn.close()


ensure_schema()

# Seed default role-based sidebar menus for every existing org.
from app.models import Organization  # noqa: E402

with SessionLocal() as db:
    for org in db.query(Organization).all():
        seed_role_menus(db, org.id)

app = FastAPI(title="Gym Management API", version="2.1.0")

# Default to the deployed Vercel domain + local dev so the app works out of
# the box even if the CORS_ORIGINS env var isn't set on the host.
cors_origins = os.getenv(
    "CORS_ORIGINS",
    "https://gymmanagementsystemnew.vercel.app,http://localhost:5173",
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in all_routers:
    app.include_router(router)


@app.get("/")
def read_root():
    return {"message": "Gym Management API v2.1 is running"}


@app.get("/health/db")
def check_db():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"database": "connected"}
    except Exception as e:
        return {"database": "error", "detail": str(e)}