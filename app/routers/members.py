import uuid
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GymMember, GymUser
from app.auth import require_role
from app.schemas import MemberCreate, MemberUpdate

router = APIRouter(prefix="/gym_members", tags=["members"])


@router.get("/")
def list_members(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
    status: str = Query("", max_length=20),
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = db.query(GymMember)

    if search:
        query = query.filter(
            GymMember.full_name.ilike(f"%{search}%")
            | GymMember.member_code.ilike(f"%{search}%")
            | GymMember.email.ilike(f"%{search}%")
            | GymMember.mobile_phone.ilike(f"%{search}%")
        )
    if status:
        query = query.filter(GymMember.status == status)

    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    members = query.order_by(GymMember.created_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    return {
        "items": [
            {
                "id": str(m.id),
                "member_code": m.member_code,
                "full_name": m.full_name,
                "email": m.email,
                "mobile_phone": m.mobile_phone,
                "assigned_coach_id": str(m.assigned_coach_id) if m.assigned_coach_id else None,
                "status": m.status,
                "created_at": m.created_at.isoformat(),
            }
            for m in members
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }


@router.get("/unclaimed")
def list_unclaimed_members(db: Session = Depends(get_db)):
    claimed_ids = db.query(GymUser.member_id).filter(GymUser.member_id.isnot(None)).subquery()
    members = db.query(GymMember).filter(GymMember.id.notin_(claimed_ids)).all()
    return [
        {"id": str(m.id), "full_name": m.full_name, "member_code": m.member_code}
        for m in members
    ]


@router.post("/")
def create_member(member: MemberCreate, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    new_member = GymMember(
        id=uuid.uuid4(),
        organization_id=member.organization_id,
        member_code=member.member_code,
        full_name=member.full_name,
        email=member.email,
        mobile_phone=member.mobile_phone,
        assigned_coach_id=member.assigned_coach_id,
        status=member.status,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return {"id": str(new_member.id), "full_name": new_member.full_name}


@router.get("/{member_id}")
def get_member(member_id: uuid.UUID, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    m = db.query(GymMember).filter(GymMember.id == member_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    return {
        "id": str(m.id),
        "member_code": m.member_code,
        "full_name": m.full_name,
        "email": m.email,
        "mobile_phone": m.mobile_phone,
        "assigned_coach_id": str(m.assigned_coach_id) if m.assigned_coach_id else None,
        "status": m.status,
        "created_at": m.created_at.isoformat(),
    }


@router.put("/{member_id}")
def update_member(member_id: uuid.UUID, update: MemberUpdate, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    m = db.query(GymMember).filter(GymMember.id == member_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(m, field, value)
    m.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(m)
    return {"id": str(m.id), "full_name": m.full_name}


@router.delete("/{member_id}")
def delete_member(member_id: uuid.UUID, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    m = db.query(GymMember).filter(GymMember.id == member_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(m)
    db.commit()
    return {"deleted": True}
