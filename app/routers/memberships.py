import uuid
import math
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GymMembership, GymMember, GymMembershipPlan
from app.auth import require_role
from app.schemas import MembershipCreate, MembershipUpdate, AvailPlanIn
from app.pricing import compute_billing, annual_discount_percentage, billing_cycle_duration_days, normalize_billing_cycle

router = APIRouter(prefix="/gym_memberships", tags=["memberships"])


@router.get("/")
def list_memberships(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
    status: str = Query("", max_length=20),
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = (
        db.query(GymMembership, GymMember, GymMembershipPlan)
        .join(GymMember, GymMembership.member_id == GymMember.id)
        .join(GymMembershipPlan, GymMembership.plan_id == GymMembershipPlan.id)
    )
    if search:
        query = query.filter(GymMember.full_name.ilike(f"{search}%"))
    if status:
        query = query.filter(GymMembership.status == status)

    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    rows = query.order_by(GymMembership.end_date.asc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    formatted_rows = []
    for gm, m, plan in rows:
        days_left = None
        if gm.end_date:
            days_left = (gm.end_date - datetime.now(timezone.utc).date()).days
        formatted_rows.append({
            "id": str(gm.id),
            "member_name": m.full_name,
            "member_phone": m.mobile_phone,
            "member_email": m.email,
            "plan_name": plan.name,
            "status": gm.status,
            "payment_type": gm.payment_type,
            "amount_due": float(gm.amount_due),
            "amount_paid": float(gm.amount_paid),
            "start_date": gm.start_date.isoformat(),
            "end_date": gm.end_date.isoformat(),
            "days_left": days_left,
            "expiring_soon": (
                gm.status in ("active", "pending_payment")
                and days_left is not None
                and 0 <= days_left <= 7
            ),
            "last_contacted_at": gm.last_contacted_at.isoformat() if gm.last_contacted_at else None,
        })

    return {
        "items": formatted_rows,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }


@router.get("/expiring")
def list_expiring_memberships(
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Memberships expiring within the next 7 days (automated notification)."""
    window = (datetime.now(timezone.utc).date() + timedelta(days=7)).isoformat()
    today = datetime.now(timezone.utc).date().isoformat()
    rows = (
        db.query(GymMembership, GymMember, GymMembershipPlan)
        .join(GymMember, GymMembership.member_id == GymMember.id)
        .join(GymMembershipPlan, GymMembership.plan_id == GymMembershipPlan.id)
        .filter(
            GymMembership.status.in_(["active", "pending_payment"]),
            GymMembership.end_date >= today,
            GymMembership.end_date <= window,
        )
        .order_by(GymMembership.end_date.asc())
        .all()
    )
    return {
        "items": [
            {
                "id": str(gm.id),
                "member_id": str(m.id),
                "member_name": m.full_name,
                "member_email": m.email,
                "member_phone": m.mobile_phone,
                "plan_name": plan.name,
                "end_date": gm.end_date.isoformat(),
                "days_left": (gm.end_date - datetime.now(timezone.utc).date()).days,
            }
            for gm, m, plan in rows
        ]
    }


@router.post("/")
def create_membership(membership: MembershipCreate, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    new_membership = GymMembership(
        id=uuid.uuid4(),
        organization_id=membership.organization_id,
        member_id=membership.member_id,
        plan_id=membership.plan_id,
        status=membership.status,
        payment_type=membership.payment_type,
        amount_due=membership.amount_due,
        amount_paid=membership.amount_paid,
        start_date=membership.start_date,
        end_date=membership.end_date,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_membership)
    db.commit()
    db.refresh(new_membership)
    return {"id": str(new_membership.id)}


@router.post("/avail")
def avail_plan(payload_in: AvailPlanIn, payload: dict = Depends(require_role("admin", "member")), db: Session = Depends(get_db)):
    org_id = uuid.UUID(payload.get("organization_id")) if payload.get("organization_id") else payload_in.organization_id

    member = db.query(GymMember).filter(GymMember.id == payload_in.member_id).first()
    if not member or member.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Member not found")

    plan = db.query(GymMembershipPlan).filter(GymMembershipPlan.id == payload_in.plan_id, GymMembershipPlan.is_active == True).first()
    if not plan or plan.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Plan not found")

    cycle = normalize_billing_cycle(payload_in.billing_cycle)
    pricing = compute_billing(plan.price, cycle, annual_discount_percentage(db, org_id))

    start = datetime.now(timezone.utc)
    end = start + timedelta(days=billing_cycle_duration_days(cycle))

    new_membership = GymMembership(
        id=uuid.uuid4(),
        organization_id=org_id,
        member_id=payload_in.member_id,
        plan_id=payload_in.plan_id,
        status="pending_payment",
        payment_type=payload_in.payment_type,
        billing_cycle=pricing["billing_cycle"],
        amount_due=pricing["final_amount"],
        discount_applied=pricing["discount_applied"],
        final_amount=pricing["final_amount"],
        amount_paid=0,
        start_date=start,
        end_date=end,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_membership)
    db.commit()
    db.refresh(new_membership)
    return {
        "id": str(new_membership.id),
        "amount": float(new_membership.amount_due),
        "billing_cycle": new_membership.billing_cycle,
        "discount_applied": float(new_membership.discount_applied or 0),
        "original_total": pricing["original_total"],
        "final_amount": float(new_membership.final_amount),
        "message": "Plan availed. Complete payment to activate membership.",
    }


@router.put("/{membership_id}")
def update_membership(membership_id: uuid.UUID, update: MembershipUpdate, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    gm = db.query(GymMembership).filter(GymMembership.id == membership_id).first()
    if not gm:
        raise HTTPException(status_code=404, detail="Membership not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(gm, field, value)
    gm.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(gm)
    return {"id": str(gm.id)}


@router.delete("/{membership_id}")
def delete_membership(membership_id: uuid.UUID, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    gm = db.query(GymMembership).filter(GymMembership.id == membership_id).first()
    if not gm:
        raise HTTPException(status_code=404, detail="Membership not found")
    db.delete(gm)
    db.commit()
    return {"deleted": True}
