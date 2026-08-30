import uuid
import math
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    GymCoach, GymMember, GymCoachEnrollment, CoachSchedule,
)
from app.auth import require_role
from app.schemas import CoachEnrollmentCreate
from app.activity import log_action

router = APIRouter(prefix="/gym_coach_enrollments", tags=["coach_enrollments"])

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
VALID_PAYMENT_METHODS = {"full_payment", "down_payment", "cash"}
VALID_PAYMENT_STATUSES = {"pending", "partially_paid", "paid", "cash_pending"}
VALID_ENROLLMENT_STATUSES = {"pending_payment", "active", "cancelled"}
ACTIVE_STATUSES = {"pending_payment", "active"}


def _coach_available_days(db, coach_id) -> set[int]:
    rows = db.query(CoachSchedule).filter(
        CoachSchedule.coach_id == coach_id,
        CoachSchedule.is_active == True,  # noqa: E712
    ).all()
    return {r.day_of_week for r in rows}


def _enrollment_row(db, e: GymCoachEnrollment) -> dict:
    member = db.query(GymMember).filter(GymMember.id == e.member_id).first()
    coach = db.query(GymCoach).filter(GymCoach.id == e.coach_id).first()
    return {
        "id": str(e.id),
        "member_id": str(e.member_id),
        "member_name": member.full_name if member else "Unknown",
        "coach_id": str(e.coach_id),
        "coach_name": coach.full_name if coach else "Unknown",
        "coach_specialization": coach.specialization if coach else None,
        "selected_days": e.selected_days,
        "selected_day_names": [DAY_NAMES[d] for d in (e.selected_days or []) if 0 <= d < 7],
        "payment_method": e.payment_method,
        "total_amount": float(e.total_amount),
        "amount_paid": float(e.amount_paid),
        "payment_status": e.payment_status,
        "enrollment_status": e.enrollment_status,
        "enrolled_at": e.enrolled_at.isoformat(),
    }


@router.post("/")
def create_enrollment(
    body: CoachEnrollmentCreate,
    payload: dict = Depends(require_role("member")),
    db: Session = Depends(get_db),
):
    member_id = payload.get("member_id")
    if not member_id:
        raise HTTPException(status_code=400, detail="No member linked to this account")
    mid = uuid.UUID(member_id)

    member = db.query(GymMember).filter(GymMember.id == mid).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    coach = db.query(GymCoach).filter(GymCoach.id == body.coach_id).first()
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found")
    if str(coach.organization_id) != str(member.organization_id):
        raise HTTPException(status_code=403, detail="Coach not in your organization")

    if body.payment_method not in VALID_PAYMENT_METHODS:
        raise HTTPException(status_code=422, detail="Invalid payment_method")

    days = body.selected_days
    if not days:
        raise HTTPException(status_code=422, detail="At least one day must be selected")
    if len(set(days)) != len(days):
        raise HTTPException(status_code=422, detail="Duplicate days selected")

    available_days = _coach_available_days(db, coach.id)
    invalid = [d for d in days if d not in available_days]
    if invalid:
        raise HTTPException(
            status_code=422,
            detail=f"Selected day(s) not available for this coach: {[DAY_NAMES[d] for d in sorted(invalid)]}",
        )

    existing_active = db.query(GymCoachEnrollment).filter(
        GymCoachEnrollment.member_id == mid,
        GymCoachEnrollment.enrollment_status.in_(ACTIVE_STATUSES),
    ).first()
    if existing_active:
        raise HTTPException(
            status_code=400,
            detail="You already have an active or pending enrollment. End it before enrolling again.",
        )

    total_amount = float(coach.hourly_rate) * len(days)

    if body.payment_method == "cash":
        payment_status = "cash_pending"
        enrollment_status = "pending_payment"
        amount_paid = 0
    else:  # full_payment / down_payment
        payment_status = "pending"
        enrollment_status = "pending_payment"
        amount_paid = 0

    enrollment = GymCoachEnrollment(
        id=uuid.uuid4(),
        organization_id=member.organization_id,
        member_id=mid,
        coach_id=coach.id,
        selected_days=days,
        payment_method=body.payment_method,
        total_amount=total_amount,
        amount_paid=amount_paid,
        payment_status=payment_status,
        enrollment_status=enrollment_status,
        enrolled_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    log_action(
        db, member.organization_id, "create", "coach_enrollment", entity_id=enrollment.id,
        description=(
            f"Member {member.full_name} enrolled with coach {coach.full_name} "
            f"({len(days)} day(s), {body.payment_method}, ₱{total_amount:,.2f})"
        ),
        actor_user_id=payload.get("sub"), actor_name=member.full_name, actor_role="member",
    )
    db.commit()

    return _enrollment_row(db, enrollment)


@router.get("/my-enrollments")
def list_my_enrollments(
    payload: dict = Depends(require_role("member")),
    db: Session = Depends(get_db),
):
    member_id = payload.get("member_id")
    if not member_id:
        raise HTTPException(status_code=400, detail="No member linked to this account")
    mid = uuid.UUID(member_id)

    rows = db.query(GymCoachEnrollment).filter(
        GymCoachEnrollment.member_id == mid,
    ).order_by(GymCoachEnrollment.enrolled_at.desc()).all()

    return {
        "items": [_enrollment_row(db, e) for e in rows],
        "total": len(rows),
    }


@router.get("/")
def list_all_enrollments(
    coach_id: uuid.UUID | None = Query(None),
    enrollment_status: str = Query("", max_length=20),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = db.query(GymCoachEnrollment).filter(
        GymCoachEnrollment.organization_id == uuid.UUID(payload.get("organization_id"))
    )
    if coach_id:
        query = query.filter(GymCoachEnrollment.coach_id == coach_id)
    if enrollment_status:
        query = query.filter(GymCoachEnrollment.enrollment_status == enrollment_status)

    total = query.count()
    pages = max(1, math.ceil(total / per_page))
    rows = query.order_by(GymCoachEnrollment.enrolled_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    return {
        "items": [_enrollment_row(db, e) for e in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }


@router.get("/{enrollment_id}")
def get_enrollment(
    enrollment_id: uuid.UUID,
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    e = db.query(GymCoachEnrollment).filter(GymCoachEnrollment.id == enrollment_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    return _enrollment_row(db, e)


@router.patch("/{enrollment_id}/cancel")
def cancel_own_enrollment(
    enrollment_id: uuid.UUID,
    payload: dict = Depends(require_role("member")),
    db: Session = Depends(get_db),
):
    member_id = payload.get("member_id")
    e = db.query(GymCoachEnrollment).filter(GymCoachEnrollment.id == enrollment_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    if not member_id or str(e.member_id) != str(member_id):
        raise HTTPException(status_code=403, detail="Not your enrollment")

    if e.enrollment_status not in ("pending_payment",):
        raise HTTPException(status_code=400, detail="Only a pending enrollment can be cancelled")

    e.enrollment_status = "cancelled"
    e.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(e)
    return _enrollment_row(db, e)



@router.patch("/{enrollment_id}/confirm-cash")
def confirm_cash(
    enrollment_id: uuid.UUID,
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    e = db.query(GymCoachEnrollment).filter(GymCoachEnrollment.id == enrollment_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    if str(e.organization_id) != str(payload.get("organization_id")):
        raise HTTPException(status_code=403, detail="Not authorized for this action")

    if e.payment_method != "cash":
        raise HTTPException(status_code=422, detail="Confirm-cash only applies to cash enrollments")
    if e.payment_status != "cash_pending":
        raise HTTPException(status_code=400, detail="Enrollment is not awaiting cash confirmation")

    e.payment_status = "paid"
    e.amount_paid = e.total_amount
    e.enrollment_status = "active"
    e.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(e)

    member = db.query(GymMember).filter(GymMember.id == e.member_id).first()
    coach = db.query(GymCoach).filter(GymCoach.id == e.coach_id).first()
    log_action(
        db, e.organization_id, "confirm_cash", "coach_enrollment", entity_id=e.id,
        description=(
            f"Admin confirmed cash payment for {member.full_name if member else 'member'}'s "
            f"enrollment with {coach.full_name if coach else 'coach'}"
        ),
        actor_user_id=payload.get("sub"), actor_name="Admin", actor_role="admin",
    )
    db.commit()

    return _enrollment_row(db, e)
