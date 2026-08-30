import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GymRenewalRequest, GymMembership, GymMember, GymPayment
from app.auth import require_role
from app.schemas import RenewalRequestCreate, RenewalCompleteIn
from app.activity import log_action
from app.pricing import months_duration_days

router = APIRouter(prefix="/gym_renewal_requests", tags=["renewals"])


@router.get("/")
def list_renewal_requests(
    status: str = Query("", max_length=20),
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = (
        db.query(GymRenewalRequest, GymMember)
        .join(GymMember, GymRenewalRequest.member_id == GymMember.id)
    )
    if status:
        query = query.filter(GymRenewalRequest.status == status)

    rows = query.order_by(GymRenewalRequest.requested_date.asc()).all()
    return [
        {
            "id": str(r.id),
            "member_name": m.full_name,
            "membership_id": str(r.membership_id),
            "requested_date": r.requested_date.isoformat(),
            "payment_type": r.payment_type,
            "billing_cycle": r.billing_cycle,
            "months_selected": r.months_selected,
            "payment_method": r.payment_method,
            "payment_status": r.payment_status,
            "final_amount": float(r.final_amount),
            "amount": float(r.amount),
            "status": r.status,
        }
        for r, m in rows
    ]


@router.post("/")
def create_renewal_request(payload_in: RenewalRequestCreate, payload: dict = Depends(require_role("admin", "member")), db: Session = Depends(get_db)):
    cycle = normalize_billing_cycle(payload_in.billing_cycle)
    new_request = GymRenewalRequest(
        id=uuid.uuid4(),
        organization_id=payload_in.organization_id,
        member_id=payload_in.member_id,
        membership_id=payload_in.membership_id,
        requested_date=payload_in.requested_date,
        payment_type=payload_in.payment_type,
        billing_cycle=cycle,
        amount=payload_in.amount,
        final_amount=payload_in.amount,
        status="pending",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return {"id": str(new_request.id)}


@router.put("/{request_id}/complete")
def complete_renewal(request_id: uuid.UUID, payload_in: RenewalCompleteIn, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    # FOR UPDATE: serialize concurrent confirms so only one can complete the
    # renewal and write an activity-log entry.
    req = db.query(GymRenewalRequest).filter(GymRenewalRequest.id == request_id).with_for_update().first()
    if not req:
        raise HTTPException(status_code=404, detail="Renewal request not found")
    if req.payment_method != "cash":
        raise HTTPException(status_code=422, detail="Complete applies only to cash renewals")
    if req.payment_status != "cash_pending" or req.status != "pending":
        raise HTTPException(status_code=400, detail="Renewal is not awaiting cash confirmation")

    membership = db.query(GymMembership).filter(GymMembership.id == req.membership_id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    extend_days = months_duration_days(req.months_selected)

    membership.end_date = membership.end_date + timedelta(days=extend_days)
    membership.status = "active"
    membership.billing_cycle = req.billing_cycle
    membership.months_selected = req.months_selected
    membership.payment_method = req.payment_method
    membership.payment_status = "paid"
    membership.amount_paid = float(req.final_amount)
    membership.discount_applied = req.discount_applied
    membership.final_amount = float(req.final_amount)
    membership.updated_at = datetime.now(timezone.utc)

    receipt_no = f"OR-{uuid.uuid4().hex[:6].upper()}"
    new_payment = GymPayment(
        id=uuid.uuid4(),
        organization_id=req.organization_id,
        member_id=req.member_id,
        membership_id=req.membership_id,
        receipt_no=receipt_no,
        item_description=f"Membership renewal ({req.payment_method}, {req.months_selected} month(s))",
        amount=float(req.final_amount),
        payment_method="cash",
        status="paid",
        discount_amount=float(req.discount_applied or 0),
        discount_description=f"Duration discount ({req.months_selected} month(s))" if req.discount_applied else None,
        paid_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_payment)

    req.payment_status = "paid"
    req.status = "completed"
    req.updated_at = datetime.now(timezone.utc)

    member = db.query(GymMember).filter(GymMember.id == req.member_id).first()
    db.commit()

    log_action(
        db, req.organization_id, "confirm_cash", "renewal_request", entity_id=req.id,
        description=(
            f"Admin confirmed cash renewal for {member.full_name if member else 'member'} "
            f"({req.months_selected} month(s), ₱{float(req.final_amount):,.2f})"
        ),
        actor_user_id=payload.get("sub"), actor_name="Admin", actor_role="admin",
    )
    db.commit()
    return {"completed": True, "new_end_date": membership.end_date.isoformat()}


@router.get("/member/{member_id}")
def member_portal(member_id: uuid.UUID, payload: dict = Depends(require_role("admin", "member")), db: Session = Depends(get_db)):
    member = db.query(GymMember).filter(GymMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    from app.models import GymMembershipPlan, GymPtSession, GymCoach

    membership = (
        db.query(GymMembership, GymMembershipPlan)
        .join(GymMembershipPlan, GymMembership.plan_id == GymMembershipPlan.id)
        .filter(GymMembership.member_id == member_id)
        .order_by(GymMembership.end_date.desc())
        .first()
    )

    upcoming_sessions = (
        db.query(GymPtSession, GymCoach)
        .join(GymCoach, GymPtSession.coach_id == GymCoach.id)
        .filter(GymPtSession.member_id == member_id, GymPtSession.status.in_(["requested", "scheduled"]))
        .order_by(GymPtSession.session_date.asc())
        .all()
    )

    pending_renewals = (
        db.query(GymRenewalRequest)
        .filter(GymRenewalRequest.member_id == member_id, GymRenewalRequest.status == "pending")
        .order_by(GymRenewalRequest.requested_date.asc())
        .all()
    )

    return {
        "member": {
            "id": str(member.id),
            "full_name": member.full_name,
            "member_code": member.member_code,
            "status": member.status,
        },
        "membership": (
            {
                "id": str(membership[0].id),
                "plan_name": membership[1].name,
                "status": membership[0].status,
                "start_date": membership[0].start_date.isoformat(),
                "end_date": membership[0].end_date.isoformat(),
            }
            if membership else None
        ),
        "upcoming_sessions": [
            {
                "id": str(s.id),
                "coach_name": c.full_name,
                "session_date": s.session_date.isoformat(),
                "status": s.status,
            }
            for s, c in upcoming_sessions
        ],
        "pending_renewals": [
            {
                "id": str(r.id),
                "requested_date": r.requested_date.isoformat(),
                "amount": float(r.amount),
                "status": r.status,
            }
            for r in pending_renewals
        ],
    }
