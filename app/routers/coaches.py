import uuid
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GymCoach
from app.auth import require_role
from app.schemas import CoachCreate, CoachUpdate

router = APIRouter(prefix="/gym_coaches", tags=["coaches"])


@router.get("/")
def list_coaches(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = db.query(GymCoach)
    if search:
        query = query.filter(
            GymCoach.full_name.ilike(f"%{search}%")
            | GymCoach.specialization.ilike(f"%{search}%")
        )

    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    coaches = query.order_by(GymCoach.full_name).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "items": [
            {
                "id": str(c.id),
                "full_name": c.full_name,
                "specialization": c.specialization,
                "hourly_rate": float(c.hourly_rate),
                "mobile_contact": c.mobile_contact,
                "shift_schedule": c.shift_schedule,
                "created_at": c.created_at.isoformat(),
            }
            for c in coaches
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }


@router.post("/")
def create_coach(coach: CoachCreate, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    new_coach = GymCoach(
        id=uuid.uuid4(),
        organization_id=coach.organization_id,
        full_name=coach.full_name,
        specialization=coach.specialization,
        hourly_rate=coach.hourly_rate,
        mobile_contact=coach.mobile_contact,
        shift_schedule=coach.shift_schedule,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_coach)
    db.commit()
    db.refresh(new_coach)
    return {"id": str(new_coach.id), "full_name": new_coach.full_name}


@router.get("/{coach_id}")
def get_coach(coach_id: uuid.UUID, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    c = db.query(GymCoach).filter(GymCoach.id == coach_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Coach not found")
    return {
        "id": str(c.id),
        "full_name": c.full_name,
        "specialization": c.specialization,
        "hourly_rate": float(c.hourly_rate),
        "mobile_contact": c.mobile_contact,
        "shift_schedule": c.shift_schedule,
    }


@router.put("/{coach_id}")
def update_coach(coach_id: uuid.UUID, update: CoachUpdate, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    c = db.query(GymCoach).filter(GymCoach.id == coach_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Coach not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(c, field, value)
    c.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(c)
    return {"id": str(c.id), "full_name": c.full_name}


@router.delete("/{coach_id}")
def delete_coach(coach_id: uuid.UUID, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    c = db.query(GymCoach).filter(GymCoach.id == coach_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Coach not found")
    db.delete(c)
    db.commit()
    return {"deleted": True}
