"""
Activity / history logs. Reads rows written by app.activity.log_action.
Designed to feed a table + drawer UI: paginated list with filters.
"""
import math
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GymActivityLog
from app.auth import require_role

router = APIRouter(prefix="/activity_logs", tags=["activity_logs"])


@router.get("/")
def list_activity_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
    action: str = Query("", max_length=50),
    entity_type: str = Query("", max_length=50),
    date_from: str = Query("", max_length=10),
    date_to: str = Query("", max_length=10),
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    organization_id = payload.get("organization_id")
    query = db.query(GymActivityLog).filter(
        GymActivityLog.organization_id == organization_id
    )

    if search:
        query = query.filter(
            GymActivityLog.actor_name.ilike(f"%{search}%")
            | GymActivityLog.description.ilike(f"%{search}%")
        )
    if action:
        query = query.filter(GymActivityLog.action == action)
    if entity_type:
        query = query.filter(GymActivityLog.entity_type == entity_type)
    if date_from:
        query = query.filter(GymActivityLog.created_at >= date_from)
    if date_to:
        query = query.filter(GymActivityLog.created_at <= f"{date_to} 23:59:59")

    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    rows = query.order_by(GymActivityLog.created_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    return {
        "items": [
            {
                "id": str(r.id),
                "actor_name": r.actor_name,
                "actor_role": r.actor_role,
                "action": r.action,
                "entity_type": r.entity_type,
                "entity_id": str(r.entity_id) if r.entity_id else None,
                "description": r.description,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }


@router.get("/actions")
def list_actions(
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Distinct action + entity_type pairs, for the drawer filter UI."""
    organization_id = payload.get("organization_id")
    rows = (
        db.query(GymActivityLog.action, GymActivityLog.entity_type)
        .filter(GymActivityLog.organization_id == organization_id)
        .distinct()
        .order_by(GymActivityLog.action)
        .all()
    )
    return [
        {"action": a, "entity_type": e}
        for a, e in rows
    ]