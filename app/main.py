import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine, Base
from app.routers import all_routers

import app.models  # noqa: F401 — ensure all models are registered

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gym Management API", version="2.0.0")

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
    return {"message": "Gym Management API v2.0 is running"}


@app.get("/health/db")
def check_db():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"database": "connected"}
    except Exception as e:
        return {"database": "error", "detail": str(e)}
