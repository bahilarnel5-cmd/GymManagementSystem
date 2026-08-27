import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import get_db
from app.models import CoachSchedule, GymCoach
from app.auth import require_role
from app.schemas import CoachScheduleCreate

router = APIRouter(prefix="/coach_schedules", tags=["coach_schedules"])

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

MORNING_SLOTS = [(7, 9), (8, 10), (9, 11), (10, 12), (13, 15)]
EVENING_SLOTS = [(15, 17), (16, 18), (17, 19), (18, 20), (19, 21)]


@router.get("/")
def list_schedules(
    coach_id: str = Query(""),
    day_of_week: int = Query(-1),
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = db.query(CoachSchedule)
    if coach_id:
        query = query.filter(CoachSchedule.coach_id == uuid.UUID(coach_id))
    if day_of_week >= 0:
        query = query.filter(CoachSchedule.day_of_week == day_of_week)

    schedules = query.all()
    return [
        {
            "id": str(s.id),
            "coach_id": str(s.coach_id),
            "day_of_week": s.day_of_week,
            "day_name": DAY_NAMES[s.day_of_week],
            "shift_type": s.shift_type,
            "is_active": s.is_active,
        }
        for s in schedules
    ]


@router.post("/")
def create_schedule(payload_in: CoachScheduleCreate, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    existing = db.query(CoachSchedule).filter(
        and_(
            CoachSchedule.coach_id == payload_in.coach_id,
            CoachSchedule.day_of_week == payload_in.day_of_week,
            CoachSchedule.shift_type == payload_in.shift_type,
        )
    ).first()
    if existing:
        existing.is_active = payload_in.is_active
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return {"id": str(existing.id), "updated": True}

    new_schedule = CoachSchedule(
        id=uuid.uuid4(),
        organization_id=payload_in.organization_id,
        coach_id=payload_in.coach_id,
        day_of_week=payload_in.day_of_week,
        shift_type=payload_in.shift_type,
        is_active=payload_in.is_active,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    return {"id": str(new_schedule.id)}


@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: uuid.UUID, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    s = db.query(CoachSchedule).filter(CoachSchedule.id == schedule_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(s)
    db.commit()
    return {"deleted": True}


@router.get("/slots/{coach_id}")
def get_coach_slots(
    coach_id: uuid.UUID,
    date: str = Query(..., description="YYYY-MM-DD"),
    payload: dict = Depends(require_role("admin", "member")),
    db: Session = Depends(get_db),
):
    from app.models import MemberBooking
    from datetime import date as date_type

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
        return {"shift": None, "slots": []}

    if schedule.shift_type == "morning":
        all_slots = MORNING_SLOTS
    else:
        all_slots = EVENING_SLOTS

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

    def is_slot_overlapping(s_start, s_end, b_start, b_end):
        return s_start < b_end and s_end > b_start

    member_id = payload.get("member_id")
    slots = []
    for start_h, end_h in all_slots:
        booked = False
        booked_by_me = False
        for b in existing_bookings:
            if is_slot_overlapping(start_h, end_h, b.start_hour, b.end_hour):
                booked = True
                if member_id and str(b.member_id) == member_id:
                    booked_by_me = True

        slots.append({
            "start_hour": start_h,
            "end_hour": end_h,
            "available": not booked,
            "booked_by_me": booked_by_me,
        })

    return {"shift": schedule.shift_type, "date": date, "day_of_week": dow, "slots": slots}
