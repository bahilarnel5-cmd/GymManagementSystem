import uuid
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GymCoach, GymMember
from app.auth import require_role
from app.schemas import CoachCreate, CoachUpdate
from app.activity import log_action
from .coach_portal import _student_paid_info

router = APIRouter(prefix="/gym_coaches", tags=["coaches"])


@router.get("/")
def list_coaches(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
    payload: dict = Depends(require_role("admin", "member")),
    db: Session = Depends(get_db),
):
    query = db.query(GymCoach)
    if search:
        query = query.filter(
            GymCoach.full_name.ilike(f"{search}%")
            | GymCoach.specialization.ilike(f"{search}%")
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
    log_action(
        db, coach.organization_id, "create", "coach", entity_id=new_coach.id,
        description=f"Added coach {new_coach.full_name} ({new_coach.specialization})",
        actor_user_id=payload.get("sub"), actor_name="Admin", actor_role="admin",
    )
    db.commit()
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
    log_action(
        db, c.organization_id, "update", "coach", entity_id=c.id,
        description=f"Updated coach {c.full_name}",
        actor_user_id=payload.get("sub"), actor_name="Admin", actor_role="admin",
    )
    db.commit()
    return {"id": str(c.id), "full_name": c.full_name}


@router.delete("/{coach_id}")
def delete_coach(coach_id: uuid.UUID, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    c = db.query(GymCoach).filter(GymCoach.id == coach_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Coach not found")
    coach_name = c.full_name
    org_id = c.organization_id
    db.delete(c)
    db.commit()
    log_action(
        db, org_id, "delete", "coach", entity_id=coach_id,
        description=f"Deleted coach {coach_name}",
        actor_user_id=payload.get("sub"), actor_name="Admin", actor_role="admin",
    )
    db.commit()
    return {"deleted": True}


@router.get("/students-summary")
def students_summary(payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    """Coach-and-student table: students per coach + who has paid."""
    organization_id = payload.get("organization_id")
    coaches = db.query(GymCoach).filter(
        GymCoach.organization_id == organization_id
    ).order_by(GymCoach.full_name).all()

    result = []
    total_assigned = 0
    for c in coaches:
        students = db.query(GymMember).filter(
            GymMember.assigned_coach_id == c.id,
            GymMember.organization_id == organization_id,
        ).order_by(GymMember.full_name).all()
        student_rows = []
        paid = 0
        for m in students:
            info = _student_paid_info(db, m, organization_id)
            student_rows.append({
                "member_id": str(m.id),
                "member_code": m.member_code,
                "full_name": m.full_name,
                "mobile_phone": m.mobile_phone,
                "status": m.status,
                **info,
            })
            if info["paid"]:
                paid += 1
        total_assigned += len(student_rows)
        result.append({
            "coach_id": str(c.id),
            "coach_name": c.full_name,
            "specialization": c.specialization,
            "student_count": len(student_rows),
            "paid_count": paid,
            "unpaid_count": len(student_rows) - paid,
            "students": student_rows,
        })

    unassigned = db.query(GymMember).filter(
        GymMember.assigned_coach_id.is_(None),
        GymMember.organization_id == organization_id,
    ).count()

    return {
        "items": result,
        "total_coaches": len(coaches),
        "total_assigned_students": total_assigned,
        "unassigned_students": unassigned,
    }
