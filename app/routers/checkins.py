import uuid
import math
from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import GymCheckIn, GymMember
from app.auth import require_role
from app.schemas import CheckInCreate

router = APIRouter(prefix="/gym_checkins", tags=["checkins"])


@router.get("/")
def list_checkins(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
    date_filter: str = Query("", max_length=10),
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = db.query(GymCheckIn, GymMember).join(
        GymMember, GymCheckIn.member_id == GymMember.id
    )
    if search:
        # Live "letter" search: alphabetic queries match names only (prefix)
        name_match = GymMember.full_name.ilike(f"{search}%")
        if any(ch.isdigit() or not ch.isalnum() for ch in search):
            query = query.filter(
                name_match
                | GymMember.member_code.ilike(f"{search}%")
            )
        else:
            query = query.filter(name_match)
    if date_filter:
        query = query.filter(func.date(GymCheckIn.checked_in_at) == date_filter)

    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    rows = query.order_by(GymCheckIn.checked_in_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    return {
        "items": [
            {
                "id": str(ci.id),
                "member_name": m.full_name,
                "member_code": m.member_code,
                "zone_class": ci.zone_class,
                "checked_in_at": ci.checked_in_at.isoformat(),
                "status": ci.status,
            }
            for ci, m in rows
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }


@router.post("/")
def check_in(payload_in: CheckInCreate, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    member = db.query(GymMember).filter(GymMember.id == payload_in.member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    active_checkin = db.query(GymCheckIn).filter(
        GymCheckIn.member_id == payload_in.member_id,
        GymCheckIn.status == "active",
    ).first()
    if active_checkin:
        raise HTTPException(status_code=400, detail="Member already checked in")

    new_checkin = GymCheckIn(
        id=uuid.uuid4(),
        organization_id=payload_in.organization_id,
        member_id=payload_in.member_id,
        zone_class=payload_in.zone_class,
        checked_in_at=datetime.now(timezone.utc),
        status="active",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_checkin)
    db.commit()
    db.refresh(new_checkin)
    return {"id": str(new_checkin.id), "checked_in_at": new_checkin.checked_in_at.isoformat()}


@router.put("/{checkin_id}/checkout")
def check_out(checkin_id: uuid.UUID, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    ci = db.query(GymCheckIn).filter(GymCheckIn.id == checkin_id).first()
    if not ci:
        raise HTTPException(status_code=404, detail="Check-in not found")
    ci.status = "checked_out"
    ci.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"checked_out": True}


@router.get("/today-count")
def today_count(
    organization_id: uuid.UUID = Query(...),
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    count = db.query(func.count(GymCheckIn.id)).filter(
        GymCheckIn.organization_id == organization_id,
        func.date(GymCheckIn.checked_in_at) == date.today(),
    ).scalar() or 0
    return {"count": count}
