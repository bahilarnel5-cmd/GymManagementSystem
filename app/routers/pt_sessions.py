import uuid
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GymPtSession, GymMember, GymCoach
from app.auth import require_role
from app.schemas import PtSessionCreate, PtSessionUpdate

router = APIRouter(prefix="/gym_pt_sessions", tags=["pt_sessions"])


@router.get("/")
def list_pt_sessions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
    status: str = Query("", max_length=20),
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = (
        db.query(GymPtSession, GymMember, GymCoach)
        .join(GymMember, GymPtSession.member_id == GymMember.id)
        .join(GymCoach, GymPtSession.coach_id == GymCoach.id)
    )
    if search:
        query = query.filter(
            GymMember.full_name.ilike(f"%{search}%")
            | GymCoach.full_name.ilike(f"%{search}%")
        )
    if status:
        query = query.filter(GymPtSession.status == status)

    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    rows = query.order_by(GymPtSession.session_date.asc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    return {
        "items": [
            {
                "id": str(s.id),
                "member_name": m.full_name,
                "coach_name": c.full_name,
                "session_date": s.session_date.isoformat(),
                "status": s.status,
                "payment_type": s.payment_type,
                "amount": float(s.amount),
                "amount_paid": float(s.amount_paid),
            }
            for s, m, c in rows
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }


@router.post("/")
def create_pt_session(session_in: PtSessionCreate, payload: dict = Depends(require_role("admin", "member")), db: Session = Depends(get_db)):
    new_session = GymPtSession(
        id=uuid.uuid4(),
        organization_id=session_in.organization_id,
        coach_id=session_in.coach_id,
        member_id=session_in.member_id,
        session_date=session_in.session_date,
        status="requested",
        payment_type=session_in.payment_type,
        amount=session_in.amount,
        amount_paid=0,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return {"id": str(new_session.id)}


@router.put("/{session_id}")
def update_pt_session(session_id: uuid.UUID, update: PtSessionUpdate, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    s = db.query(GymPtSession).filter(GymPtSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    s.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": str(s.id)}
