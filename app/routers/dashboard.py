import uuid
from datetime import datetime, timezone, timedelta, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    GymMember, GymCoach, GymMembershipPlan, GymMembership,
    GymPayment, GymCheckIn, GymRenewalRequest,
)
from app.auth import require_role
from app.schemas import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    organization_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_role("admin")),
):
    total_members = db.query(func.count(GymMember.id)).filter(
        GymMember.organization_id == organization_id
    ).scalar() or 0

    active_members = db.query(func.count(GymMember.id)).filter(
        GymMember.organization_id == organization_id,
        GymMember.status == "active",
    ).scalar() or 0

    total_coaches = db.query(func.count(GymCoach.id)).filter(
        GymCoach.organization_id == organization_id
    ).scalar() or 0

    active_memberships = db.query(func.count(GymMembership.id)).filter(
        GymMembership.organization_id == organization_id,
        GymMembership.status == "active",
    ).scalar() or 0

    expiring_soon = db.query(func.count(GymMembership.id)).filter(
        GymMembership.organization_id == organization_id,
        GymMembership.status == "active",
        GymMembership.end_date <= date.today() + timedelta(days=7),
        GymMembership.end_date >= date.today(),
    ).scalar() or 0

    total_revenue = db.query(func.coalesce(func.sum(GymPayment.amount), 0.0)).filter(
        GymPayment.organization_id == organization_id,
        GymPayment.status == "paid",
    ).scalar() or 0.0

    today_checkins = db.query(func.count(GymCheckIn.id)).filter(
        GymCheckIn.organization_id == organization_id,
        func.date(GymCheckIn.checked_in_at) == date.today(),
    ).scalar() or 0

    pending_renewals = db.query(func.count(GymRenewalRequest.id)).filter(
        GymRenewalRequest.organization_id == organization_id,
        GymRenewalRequest.status == "pending",
    ).scalar() or 0

    return DashboardStats(
        total_members=total_members,
        active_members=active_members,
        total_coaches=total_coaches,
        active_memberships=active_memberships,
        expiring_soon=expiring_soon,
        total_revenue=float(total_revenue),
        today_checkins=today_checkins,
        pending_renewals=pending_renewals,
    )


@router.get("/recent-payments")
def get_recent_payments(
    organization_id: uuid.UUID = Query(...),
    limit: int = Query(5, ge=1, le=50),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_role("admin")),
):
    from app.models import GymMember
    rows = (
        db.query(GymPayment, GymMember)
        .join(GymMember, GymPayment.member_id == GymMember.id)
        .filter(GymPayment.organization_id == organization_id)
        .order_by(GymPayment.paid_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": str(p.id),
            "receipt_no": p.receipt_no,
            "member_name": m.full_name,
            "amount": float(p.amount),
            "payment_method": p.payment_method,
            "paid_at": p.paid_at.isoformat(),
        }
        for p, m in rows
    ]


@router.get("/expiring-memberships")
def get_expiring_memberships(
    organization_id: uuid.UUID = Query(...),
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_role("admin")),
):
    rows = (
        db.query(GymMembership, GymMember, GymMembershipPlan)
        .join(GymMember, GymMembership.member_id == GymMember.id)
        .join(GymMembershipPlan, GymMembership.plan_id == GymMembershipPlan.id)
        .filter(
            GymMembership.organization_id == organization_id,
            GymMembership.status == "active",
            GymMembership.end_date <= date.today() + timedelta(days=days),
            GymMembership.end_date >= date.today(),
        )
        .order_by(GymMembership.end_date.asc())
        .all()
    )
    return [
        {
            "id": str(gm.id),
            "member_name": m.full_name,
            "member_phone": m.mobile_phone,
            "plan_name": plan.name,
            "end_date": gm.end_date.isoformat(),
            "days_left": (gm.end_date - date.today()).days,
        }
        for gm, m, plan in rows
    ]
