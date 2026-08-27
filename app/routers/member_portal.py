import uuid
from datetime import datetime, timezone, date as date_type, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import get_db
from app.models import (
    GymMember, GymMembership, GymMembershipPlan, GymPayment,
    GymPtSession, GymCoach, GymRenewalRequest, CoachSchedule, MemberBooking,
)
from app.auth import require_role
from app.schemas import MemberBookingCreate

router = APIRouter(prefix="/member", tags=["member_portal"])

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


@router.get("/dashboard")
def member_dashboard(payload: dict = Depends(require_role("admin", "member")), db: Session = Depends(get_db)):
    member_id = payload.get("member_id")
    if not member_id:
        raise HTTPException(status_code=400, detail="No member linked to this account")

    mid = uuid.UUID(member_id)
    member = db.query(GymMember).filter(GymMember.id == mid).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    membership = (
        db.query(GymMembership, GymMembershipPlan)
        .join(GymMembershipPlan, GymMembership.plan_id == GymMembershipPlan.id)
        .filter(GymMembership.member_id == mid)
        .order_by(GymMembership.end_date.desc())
        .first()
    )

    today = date_type.today()
    membership_info = None
    if membership:
        m, plan = membership
        days_left = (m.end_date - today).days
        total_days = (m.end_date - m.start_date).days
        elapsed = total_days - days_left if days_left >= 0 else total_days
        progress = min(max((elapsed / total_days * 100) if total_days > 0 else 0, 0), 100) if total_days > 0 else 100

        if days_left < 0:
            status_label = "expired"
        elif days_left <= 3:
            status_label = "critical"
        elif days_left <= 7:
            status_label = "warning"
        else:
            status_label = "active"

        membership_info = {
            "id": str(m.id),
            "plan_name": plan.name,
            "status": m.status,
            "start_date": m.start_date.isoformat(),
            "end_date": m.end_date.isoformat(),
            "days_left": max(days_left, 0),
            "progress": round(progress, 1),
            "status_label": status_label,
            "amount_due": float(m.amount_due),
            "amount_paid": float(m.amount_paid),
        }

    recent_payments = (
        db.query(GymPayment)
        .filter(GymPayment.member_id == mid)
        .order_by(GymPayment.paid_at.desc())
        .limit(10)
        .all()
    )

    recent_bookings = (
        db.query(MemberBooking, GymCoach)
        .join(GymCoach, MemberBooking.coach_id == GymCoach.id)
        .filter(MemberBooking.member_id == mid)
        .order_by(MemberBooking.created_at.desc())
        .limit(10)
        .all()
    )

    total_bookings = db.query(MemberBooking).filter(MemberBooking.member_id == mid, MemberBooking.status == "active").count()
    total_payments = db.query(GymPayment).filter(GymPayment.member_id == mid, GymPayment.status == "paid").count()

    from sqlalchemy import text
    checkin_count = db.execute(text("SELECT COUNT(*) FROM gym_check_ins WHERE member_id = :mid"), {"mid": str(mid)}).scalar() or 0

    return {
        "member": {
            "id": str(member.id),
            "full_name": member.full_name,
            "member_code": member.member_code,
            "email": member.email,
            "mobile_phone": member.mobile_phone,
            "status": member.status,
        },
        "membership": membership_info,
        "recent_payments": [
            {
                "id": str(p.id),
                "receipt_no": p.receipt_no,
                "item_description": p.item_description,
                "amount": float(p.amount),
                "payment_method": p.payment_method,
                "paid_at": p.paid_at.isoformat(),
            }
            for p in recent_payments
        ],
        "recent_bookings": [
            {
                "id": str(b.id),
                "coach_name": c.full_name,
                "day_of_week": b.day_of_week,
                "day_name": DAY_NAMES[b.day_of_week],
                "start_hour": b.start_hour,
                "end_hour": b.end_hour,
                "shift_type": b.shift_type,
                "start_date": b.start_date.isoformat(),
                "weeks": b.weeks,
                "status": b.status,
            }
            for b, c in recent_bookings
        ],
        "stats": {
            "total_bookings": total_bookings,
            "total_payments": total_payments,
            "checkins": checkin_count,
        },
    }


@router.get("/coaches")
def list_coaches_for_member(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
    payload: dict = Depends(require_role("admin", "member")),
    db: Session = Depends(get_db),
):
    query = db.query(GymCoach)
    if search:
        query = query.filter(
            GymCoach.full_name.ilike(f"%{search}%")
            | GymCoach.specialization.ilike(f"%{search}%")
        )

    total = query.count()
    pages = max(1, -(-total // per_page))
    coaches = query.order_by(GymCoach.full_name).offset((page - 1) * per_page).limit(per_page).all()

    today = date_type.today()
    results = []
    for c in coaches:
        schedules = db.query(CoachSchedule).filter(
            and_(CoachSchedule.coach_id == c.id, CoachSchedule.is_active == True)
        ).all()
        schedule_summary = {}
        for s in schedules:
            day = DAY_NAMES[s.day_of_week]
            if day not in schedule_summary:
                schedule_summary[day] = []
            schedule_summary[day].append(s.shift_type)

        results.append({
            "id": str(c.id),
            "full_name": c.full_name,
            "specialization": c.specialization,
            "hourly_rate": float(c.hourly_rate),
            "mobile_contact": c.mobile_contact,
            "shift_schedule": c.shift_schedule,
            "weekly_schedule": schedule_summary,
        })

    return {"items": results, "total": total, "page": page, "per_page": per_page, "pages": pages}


@router.get("/coaches/{coach_id}/slots")
def get_coach_available_slots(
    coach_id: uuid.UUID,
    date: str = Query(..., description="YYYY-MM-DD"),
    payload: dict = Depends(require_role("admin", "member")),
    db: Session = Depends(get_db),
):
    target_date = date_type.fromisoformat(date)
    dow = target_date.weekday()

    schedule = db.query(CoachSchedule).filter(
        and_(
            CoachSchedule.coach_id == coach_id,
            CoachSchedule.day_of_week == dow,
            CoachSchedule.is_active == True,
        )
    ).first()

    if not schedule:
        return {"shift": None, "slots": [], "date": date, "day_name": DAY_NAMES[dow]}

    if schedule.shift_type == "morning":
        all_slots = [(7, 9), (8, 10), (9, 11), (10, 12), (13, 15)]
    else:
        all_slots = [(15, 17), (16, 18), (17, 19), (18, 20), (19, 21)]

    existing_bookings = db.query(MemberBooking).filter(
        and_(
            MemberBooking.coach_id == coach_id,
            MemberBooking.day_of_week == dow,
            MemberBooking.shift_type == schedule.shift_type,
            MemberBooking.status == "active",
            MemberBooking.start_date <= target_date,
            MemberBooking.start_date + timedelta(weeks=MemberBooking.weeks) > target_date,
        )
    ).all()

    member_id = payload.get("member_id")
    slots = []
    for start_h, end_h in all_slots:
        booked = False
        booked_by_me = False
        for b in existing_bookings:
            if start_h < b.end_hour and end_h > b.start_hour:
                booked = True
                if member_id and str(b.member_id) == member_id:
                    booked_by_me = True

        slots.append({
            "start_hour": start_h,
            "end_hour": end_h,
            "available": not booked,
            "booked_by_me": booked_by_me,
        })

    return {"shift": schedule.shift_type, "date": date, "day_name": DAY_NAMES[dow], "slots": slots}


@router.post("/bookings")
def create_booking(payload_in: MemberBookingCreate, payload: dict = Depends(require_role("member")), db: Session = Depends(get_db)):
    member_id = payload.get("member_id")
    if not member_id:
        raise HTTPException(status_code=400, detail="No member linked to this account")

    mid = uuid.UUID(member_id)
    if str(mid) != str(payload_in.member_id):
        raise HTTPException(status_code=403, detail="Cannot book for another member")

    coach = db.query(GymCoach).filter(GymCoach.id == payload_in.coach_id).first()
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found")

    schedule = db.query(CoachSchedule).filter(
        and_(
            CoachSchedule.coach_id == payload_in.coach_id,
            CoachSchedule.day_of_week == payload_in.day_of_week,
            CoachSchedule.shift_type == payload_in.shift_type,
            CoachSchedule.is_active == True,
        )
    ).first()
    if not schedule:
        raise HTTPException(status_code=400, detail="Coach is not available on this day/shift")

    booking_end_date = payload_in.start_date + timedelta(weeks=payload_in.weeks)
    existing = db.query(MemberBooking).filter(
        and_(
            MemberBooking.coach_id == payload_in.coach_id,
            MemberBooking.day_of_week == payload_in.day_of_week,
            MemberBooking.shift_type == payload_in.shift_type,
            MemberBooking.status == "active",
            MemberBooking.start_date <= booking_end_date,
            MemberBooking.start_date + timedelta(weeks=MemberBooking.weeks) > payload_in.start_date,
        )
    ).all()

    target_start = payload_in.start_hour
    target_end = payload_in.end_hour
    for b in existing:
        if target_start < b.end_hour and target_end > b.start_hour:
            raise HTTPException(status_code=400, detail="This time slot is already booked")

    new_booking = MemberBooking(
        id=uuid.uuid4(),
        organization_id=payload_in.organization_id,
        coach_id=payload_in.coach_id,
        member_id=mid,
        day_of_week=payload_in.day_of_week,
        start_hour=payload_in.start_hour,
        end_hour=payload_in.end_hour,
        shift_type=payload_in.shift_type,
        start_date=payload_in.start_date,
        weeks=payload_in.weeks,
        status="active",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return {"id": str(new_booking.id), "message": "Booking created successfully"}


@router.get("/bookings")
def list_my_bookings(payload: dict = Depends(require_role("member")), db: Session = Depends(get_db)):
    member_id = payload.get("member_id")
    if not member_id:
        raise HTTPException(status_code=400, detail="No member linked to this account")

    mid = uuid.UUID(member_id)
    bookings = (
        db.query(MemberBooking, GymCoach)
        .join(GymCoach, MemberBooking.coach_id == GymCoach.id)
        .filter(MemberBooking.member_id == mid)
        .order_by(MemberBooking.created_at.desc())
        .all()
    )

    return [
        {
            "id": str(b.id),
            "coach_name": c.full_name,
            "coach_specialization": c.specialization,
            "day_of_week": b.day_of_week,
            "day_name": DAY_NAMES[b.day_of_week],
            "start_hour": b.start_hour,
            "end_hour": b.end_hour,
            "shift_type": b.shift_type,
            "start_date": b.start_date.isoformat(),
            "weeks": b.weeks,
            "status": b.status,
            "created_at": b.created_at.isoformat(),
        }
        for b, c in bookings
    ]


@router.delete("/bookings/{booking_id}")
def cancel_booking(booking_id: uuid.UUID, payload: dict = Depends(require_role("member")), db: Session = Depends(get_db)):
    member_id = payload.get("member_id")
    if not member_id:
        raise HTTPException(status_code=400, detail="No member linked to this account")

    mid = uuid.UUID(member_id)
    booking = db.query(MemberBooking).filter(MemberBooking.id == booking_id, MemberBooking.member_id == mid).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != "active":
        raise HTTPException(status_code=400, detail="Booking is not active")

    booking.status = "cancelled"
    booking.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Booking cancelled"}


@router.get("/plans")
def list_plans_for_member(payload: dict = Depends(require_role("member")), db: Session = Depends(get_db)):
    plans = db.query(GymMembershipPlan).filter(GymMembershipPlan.is_active == True).order_by(GymMembershipPlan.price.asc()).all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "price": float(p.price),
            "billing_cycle": p.billing_cycle,
            "features": p.features,
        }
        for p in plans
    ]


@router.post("/renew")
def request_renewal(
    plan_id: uuid.UUID = Query(...),
    payment_type: str = Query("full"),
    payload: dict = Depends(require_role("member")),
    db: Session = Depends(get_db),
):
    member_id = payload.get("member_id")
    if not member_id:
        raise HTTPException(status_code=400, detail="No member linked to this account")

    mid = uuid.UUID(member_id)

    plan = db.query(GymMembershipPlan).filter(GymMembershipPlan.id == plan_id, GymMembershipPlan.is_active == True).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    current_membership = (
        db.query(GymMembership)
        .filter(GymMembership.member_id == mid)
        .order_by(GymMembership.end_date.desc())
        .first()
    )
    if not current_membership:
        raise HTTPException(status_code=400, detail="No existing membership found")

    renewal = GymRenewalRequest(
        id=uuid.uuid4(),
        organization_id=current_membership.organization_id,
        member_id=mid,
        membership_id=current_membership.id,
        requested_date=datetime.now(timezone.utc),
        payment_type=payment_type,
        amount=float(plan.price),
        status="pending",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(renewal)
    db.commit()
    db.refresh(renewal)
    return {"id": str(renewal.id), "message": "Renewal request submitted"}


@router.get("/renewals")
def list_my_renewals(payload: dict = Depends(require_role("member")), db: Session = Depends(get_db)):
    member_id = payload.get("member_id")
    if not member_id:
        raise HTTPException(status_code=400, detail="No member linked to this account")

    mid = uuid.UUID(member_id)
    renewals = (
        db.query(GymRenewalRequest)
        .filter(GymRenewalRequest.member_id == mid)
        .order_by(GymRenewalRequest.requested_date.desc())
        .all()
    )

    return [
        {
            "id": str(r.id),
            "membership_id": str(r.membership_id),
            "requested_date": r.requested_date.isoformat(),
            "payment_type": r.payment_type,
            "amount": float(r.amount),
            "status": r.status,
        }
        for r in renewals
    ]
