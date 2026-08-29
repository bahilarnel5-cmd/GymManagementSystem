"""
Dedicated Coach Portal. A gym_user with role="coach" and a linked coach_id
uses these endpoints to see their students, sessions, and schedule.
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    GymUser, GymCoach, GymMember, GymPayment, GymPtSession,
    GymMembership, GymMembershipPlan, MemberBooking, CoachSchedule,
)
from app.auth import require_role

router = APIRouter(prefix="/coach_portal", tags=["coach_portal"])

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _resolve_coach(payload, db):
    user_id = payload.get("sub")
    user = db.query(GymUser).filter(GymUser.id == user_id).first()
    if not user or not user.coach_id:
        raise HTTPException(status_code=403, detail="No coach profile linked to this account")
    coach = db.query(GymCoach).filter(GymCoach.id == user.coach_id).first()
    if not coach:
        raise HTTPException(status_code=403, detail="Coach profile not found")
    return user, coach


def _student_paid_info(db, member, organization_id):
    membership_row = (
        db.query(GymMembership, GymMembershipPlan)
        .join(GymMembershipPlan, GymMembership.plan_id == GymMembershipPlan.id)
        .filter(
            GymMembership.member_id == member.id,
            GymMembership.organization_id == organization_id,
        )
        .order_by(GymMembership.end_date.desc())
        .first()
    )
    membership_plan = None
    membership_status = None
    membership_ends = None
    membership_paid = False
    if membership_row:
        gm, plan = membership_row
        membership_plan = plan.name
        membership_status = gm.status
        membership_ends = gm.end_date.isoformat()

        membership_paid_sum = (
            db.query(func.coalesce(func.sum(GymPayment.amount), 0.0))
            .filter(
                GymPayment.membership_id == gm.id,
                GymPayment.organization_id == organization_id,
                GymPayment.status == "paid",
            )
            .scalar()
        ) or 0.0
        membership_paid = (
            gm.status in ("active", "pending_payment")
            and (
                float(gm.amount_paid) >= float(gm.amount_due)
                or float(membership_paid_sum) > 0
            )
        )

    coach_total = (
        db.query(func.coalesce(func.sum(GymPayment.amount), 0.0))
        .filter(
            GymPayment.member_id == member.id,
            GymPayment.organization_id == organization_id,
            GymPayment.status == "paid",
            GymPayment.payment_category == "coach",
        )
        .scalar()
    ) or 0.0

    pt_paid = (
        db.query(func.coalesce(func.sum(GymPtSession.amount_paid), 0.0))
        .filter(
            GymPtSession.member_id == member.id,
            GymPtSession.organization_id == organization_id,
            GymPtSession.amount_paid > 0,
        )
        .scalar()
    ) or 0.0

    last_paid = (
        db.query(func.max(GymPayment.paid_at))
        .filter(
            GymPayment.member_id == member.id,
            GymPayment.organization_id == organization_id,
            GymPayment.status == "paid",
        )
        .scalar()
    )

    total_paid = round(float(coach_total) + float(pt_paid), 2)
    is_paid = bool(membership_paid) or total_paid > 0
    return {
        "membership_plan": membership_plan,
        "membership_status": membership_status,
        "membership_ends": membership_ends,
        "membership_paid": membership_paid,
        "coach_total": round(float(coach_total), 2),
        "total_paid": total_paid,
        "paid": is_paid,
        "last_paid_at": last_paid.isoformat() if last_paid else None,
    }


@router.get("/dashboard")
def coach_dashboard(payload: dict = Depends(require_role("coach")), db: Session = Depends(get_db)):
    _, coach = _resolve_coach(payload, db)
    organization_id = payload.get("organization_id")

    students = db.query(GymMember).filter(
        GymMember.assigned_coach_id == coach.id,
        GymMember.organization_id == organization_id,
        GymMember.status == "active",
    ).all()

    paid_count = 0
    for m in students:
        if _student_paid_info(db, m, organization_id)["paid"]:
            paid_count += 1

    today = datetime.now(timezone.utc).date()
    todays_bookings = db.query(func.count(MemberBooking.id)).filter(
        MemberBooking.coach_id == coach.id,
        MemberBooking.status == "active",
        MemberBooking.start_date <= today,
        MemberBooking.start_date + func.make_interval(0, 0, MemberBooking.weeks, 0, 0, 0, 0) > today,
    ).scalar() or 0

    upcoming_bookings = db.query(func.count(MemberBooking.id)).filter(
        MemberBooking.coach_id == coach.id,
        MemberBooking.status == "active",
        MemberBooking.start_date >= today,
    ).scalar() or 0

    schedules = db.query(CoachSchedule).filter(
        CoachSchedule.coach_id == coach.id,
        CoachSchedule.is_active == True,  # noqa: E712
    ).all()

    return {
        "coach": {
            "id": str(coach.id),
            "full_name": coach.full_name,
            "specialization": coach.specialization,
            "hourly_rate": float(coach.hourly_rate),
            "mobile_contact": coach.mobile_contact,
            "shift_schedule": coach.shift_schedule,
        },
        "stats": {
            "total_students": len(students),
            "paid_students": paid_count,
            "unpaid_students": len(students) - paid_count,
            "todays_bookings": todays_bookings,
            "upcoming_bookings": upcoming_bookings,
            "schedule_days": len(schedules),
        },
        "schedules": [
            {
                "day_of_week": s.day_of_week,
                "day_name": DAY_NAMES[s.day_of_week],
                "shift_type": s.shift_type,
            }
            for s in schedules
        ],
    }


@router.get("/students")
def coach_students(payload: dict = Depends(require_role("coach")), db: Session = Depends(get_db)):
    _, coach = _resolve_coach(payload, db)
    organization_id = payload.get("organization_id")

    students = db.query(GymMember).filter(
        GymMember.assigned_coach_id == coach.id,
        GymMember.organization_id == organization_id,
    ).order_by(GymMember.full_name).all()

    result = []
    for m in students:
        info = _student_paid_info(db, m, organization_id)
        result.append({
            "member_id": str(m.id),
            "member_code": m.member_code,
            "full_name": m.full_name,
            "mobile_phone": m.mobile_phone,
            "status": m.status,
            **info,
        })
    return {"coach": coach.full_name, "student_count": len(result), "items": result}


@router.get("/bookings")
def coach_bookings(payload: dict = Depends(require_role("coach")), db: Session = Depends(get_db)):
    _, coach = _resolve_coach(payload, db)

    rows = (
        db.query(MemberBooking, GymMember)
        .join(GymMember, MemberBooking.member_id == GymMember.id)
        .filter(
            MemberBooking.coach_id == coach.id,
            MemberBooking.status == "active",
        )
        .order_by(MemberBooking.day_of_week, MemberBooking.start_hour)
        .all()
    )
    return {
        "coach": coach.full_name,
        "items": [
            {
                "id": str(b.id),
                "member_id": str(m.id),
                "member_name": m.full_name,
                "day_of_week": b.day_of_week,
                "day_name": DAY_NAMES[b.day_of_week],
                "start_hour": b.start_hour,
                "end_hour": b.end_hour,
                "shift_type": b.shift_type,
                "start_date": b.start_date.isoformat(),
                "weeks": b.weeks,
                "status": b.status,
            }
            for b, m in rows
        ],
    }


@router.get("/schedules")
def coach_schedules(payload: dict = Depends(require_role("coach")), db: Session = Depends(get_db)):
    _, coach = _resolve_coach(payload, db)
    rows = db.query(CoachSchedule).filter(
        CoachSchedule.coach_id == coach.id
    ).order_by(CoachSchedule.day_of_week).all()
    return {
        "coach": coach.full_name,
        "items": [
            {
                "id": str(s.id),
                "day_of_week": s.day_of_week,
                "day_name": DAY_NAMES[s.day_of_week],
                "shift_type": s.shift_type,
                "is_active": s.is_active,
            }
            for s in rows
        ],
    }