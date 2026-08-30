import uuid
import math
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    GymPayment, GymMember, GymMembership, GymMembershipPlan,
    GymPaymentSubmission, GymUser,
)
from app.auth import require_role
from app.schemas import PaymentCreate, PaymentSubmissionReview
from app.activity import log_action
from app import storage

router = APIRouter(prefix="/gym_payments", tags=["payments"])


def _get_submission(db, submission_id: uuid.UUID, org_id):
    sub = db.query(GymPaymentSubmission).filter(GymPaymentSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Payment submission not found")
    if str(sub.organization_id) != str(org_id):
        raise HTTPException(status_code=403, detail="Not authorized for this action")
    return sub


def _submission_row(sub, db):
    member = db.query(GymMember).filter(GymMember.id == sub.member_id).first()
    reviewer = db.query(GymUser).filter(GymUser.id == sub.reviewed_by).first() if sub.reviewed_by else None
    return {
        "id": str(sub.id),
        "member_id": str(sub.member_id),
        "member_name": member.full_name if member else "Unknown",
        "membership_id": str(sub.membership_id) if sub.membership_id else None,
        "renewal_id": str(sub.renewal_id) if sub.renewal_id else None,
        "enrollment_id": str(sub.enrollment_id) if sub.enrollment_id else None,
        "amount_paid": float(sub.amount_paid),
        "ref_last4": sub.ref_last4,
        "screenshot_url": storage.signed_url(sub.screenshot_path),
        "status": sub.status,
        "admin_notes": sub.admin_notes,
        "submitted_at": sub.submitted_at.isoformat(),
        "reviewed_at": sub.reviewed_at.isoformat() if sub.reviewed_at else None,
        "reviewed_by": reviewer.email if reviewer else None,
    }


@router.get("/")
def list_payments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
    status: str = Query("", max_length=20),
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = db.query(GymPayment, GymMember).join(
        GymMember, GymPayment.member_id == GymMember.id
    )
    if search:
        # Live "letter" search: alphabetic queries match names only (prefix)
        name_match = GymMember.full_name.ilike(f"{search}%")
        if any(ch.isdigit() or not ch.isalnum() for ch in search):
            query = query.filter(
                name_match
                | GymPayment.receipt_no.ilike(f"{search}%")
            )
        else:
            query = query.filter(name_match)
    if status:
        query = query.filter(GymPayment.status == status)

    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    rows = query.order_by(GymPayment.paid_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    return {
        "items": [
            {
                "id": str(p.id),
                "receipt_no": p.receipt_no,
                "member_name": m.full_name,
                "item_description": p.item_description,
                "amount": float(p.amount),
                "payment_category": p.payment_category,
                "discount_amount": float(p.discount_amount or 0),
                "discount_description": p.discount_description,
                "payment_method": p.payment_method,
                "reference_no": p.reference_no,
                "status": p.status,
                "paid_at": p.paid_at.isoformat(),
            }
            for p, m in rows
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }


@router.post("/")
def create_payment(payment: PaymentCreate, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    receipt_no = f"OR-{uuid.uuid4().hex[:6].upper()}"
    discount = max(float(payment.discount_amount or 0), 0)
    final_amount = max(float(payment.amount) - discount, 0)
    new_payment = GymPayment(
        id=uuid.uuid4(),
        organization_id=payment.organization_id,
        member_id=payment.member_id,
        membership_id=payment.membership_id,
        receipt_no=receipt_no,
        item_description=payment.item_description,
        amount=final_amount,
        payment_category=payment.payment_category,
        discount_amount=discount,
        discount_description=payment.discount_description,
        payment_method=payment.payment_method,
        reference_no=payment.reference_no,
        status="paid",
        paid_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)
    member = db.query(GymMember).filter(GymMember.id == payment.member_id).first()
    member_name = member.full_name if member else payment.member_id
    log_action(
        db, payment.organization_id, "create", "payment", entity_id=new_payment.id,
        description=(
            f"Recorded {payment.payment_category} payment {receipt_no} for {member_name} "
            f"(₱{final_amount:,.2f}"
            + (f", ₱{discount:,.2f} discount" if discount > 0 else "")
            + ")"
        ),
        actor_user_id=payload.get("sub"), actor_name="Admin", actor_role="admin",
    )
    db.commit()
    return {"id": str(new_payment.id), "receipt_no": new_payment.receipt_no}


@router.delete("/{payment_id}")
def void_payment(payment_id: uuid.UUID, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    p = db.query(GymPayment).filter(GymPayment.id == payment_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    p.status = "voided"
    p.updated_at = datetime.now(timezone.utc)
    db.commit()
    log_action(
        db, p.organization_id, "void", "payment", entity_id=p.id,
        description=f"Voided payment {p.receipt_no}",
        actor_user_id=payload.get("sub"), actor_name="Admin", actor_role="admin",
    )
    db.commit()
    return {"voided": True}


@router.post("/submit")
async def submit_payment(
    member_id: str = Form(...),
    amount_paid: float = Form(...),
    ref_last4: str = Form(...),
    file: UploadFile = File(...),
    enrollment_id: str = Form(""),
    renewal_id: str = Form(""),
    payload: dict = Depends(require_role("admin", "member")),
    db: Session = Depends(get_db),
):
    try:
        mid = uuid.UUID(member_id)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid member_id")

    # A member may only submit proof for their own account.
    if payload.get("role") == "member":
        token_mid = payload.get("member_id")
        if not token_mid or str(token_mid) != member_id:
            raise HTTPException(status_code=403, detail="Cannot submit payment for another member")

    member = db.query(GymMember).filter(GymMember.id == mid).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if not storage.storage_configured():
        raise HTTPException(status_code=503, detail="Payment proof storage is not configured")

    if amount_paid <= 0:
        raise HTTPException(status_code=422, detail="Amount must be greater than zero")

    clean_ref = "".join(ch for ch in (ref_last4 or "") if ch.isdigit())
    if len(clean_ref) != 4:
        raise HTTPException(status_code=422, detail="Reference number must be exactly 4 digits")

    # Optional coach-enrollment linkage: validate the amount against the
    # enrollment's payment method before accepting the submission.
    enrollment = None
    if enrollment_id:
        from app.models import GymCoachEnrollment
        try:
            eid = uuid.UUID(enrollment_id)
        except Exception:
            raise HTTPException(status_code=422, detail="Invalid enrollment_id")
        enrollment = db.query(GymCoachEnrollment).filter(GymCoachEnrollment.id == eid).first()
        if not enrollment:
            raise HTTPException(status_code=404, detail="Enrollment not found")
        if str(enrollment.member_id) != str(mid):
            raise HTTPException(status_code=403, detail="Enrollment does not belong to this member")
        total = float(enrollment.total_amount)
        if enrollment.payment_method == "full_payment":
            if abs(amount_paid - total) > 0.005:
                raise HTTPException(
                    status_code=422,
                    detail=f"Full payment requires exactly the total amount (₱{total:,.2f})",
                )
        elif enrollment.payment_method == "down_payment":
            min_amount = math.ceil(total * 0.30 * 100) / 100
            if amount_paid < min_amount:
                raise HTTPException(
                    status_code=422,
                    detail=f"Down payment must be at least 30% of the total (₱{min_amount:,.2f})",
                )
            if amount_paid > total + 0.005:
                raise HTTPException(
                    status_code=422,
                    detail=f"Amount cannot exceed the total (₱{total:,.2f})",
                )

    # Optional membership-renewal linkage: validate the amount against the
    # renewal request's plan price before accepting the submission.
    renewal = None
    if renewal_id:
        from app.models import GymRenewalRequest
        try:
            rid = uuid.UUID(renewal_id)
        except Exception:
            raise HTTPException(status_code=422, detail="Invalid renewal_id")
        renewal = db.query(GymRenewalRequest).filter(GymRenewalRequest.id == rid).first()
        if not renewal:
            raise HTTPException(status_code=404, detail="Renewal request not found")
        if str(renewal.member_id) != str(mid):
            raise HTTPException(status_code=403, detail="Renewal does not belong to this member")
        if renewal.status != "pending":
            raise HTTPException(status_code=400, detail="Renewal request is not pending")
        if abs(amount_paid - float(renewal.amount)) > 0.005:
            raise HTTPException(
                status_code=422,
                detail=f"Renewal payment requires exactly the plan price (₱{float(renewal.amount):,.2f})",
            )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=422, detail="Proof image is required")
    content_type = file.content_type or "image/png"

    try:
        path = storage.upload_screenshot(file_bytes, content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload proof: {str(e)}")

    latest_membership = (
        db.query(GymMembership)
        .filter(GymMembership.member_id == mid)
        .order_by(GymMembership.end_date.desc())
        .first()
    )

    new_sub = GymPaymentSubmission(
        id=uuid.uuid4(),
        organization_id=member.organization_id,
        member_id=mid,
        membership_id=renewal.membership_id if renewal else (latest_membership.id if latest_membership else None),
        renewal_id=renewal.id if renewal else None,
        enrollment_id=enrollment.id if enrollment else None,
        amount_paid=amount_paid,
        ref_last4=clean_ref,
        screenshot_path=path,
        status="pending",
        submitted_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    actor_name = payload.get("sub")
    log_action(
        db, member.organization_id, "create", "payment_submission", entity_id=new_sub.id,
        description=f"Member {member.full_name} submitted GCash proof (ref ...{clean_ref}, ₱{amount_paid:,.2f})",
        actor_user_id=payload.get("sub"), actor_name=member.full_name, actor_role="member",
    )
    db.commit()

    return {
        "id": str(new_sub.id),
        "status": new_sub.status,
        "message": "Payment submitted, pending admin verification",
    }


@router.get("/pending")
def list_pending(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = db.query(GymPaymentSubmission).filter(
        GymPaymentSubmission.organization_id == uuid.UUID(payload.get("organization_id")),
        GymPaymentSubmission.status == "pending",
    )
    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    rows = query.order_by(GymPaymentSubmission.submitted_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    return {
        "items": [_submission_row(r, db) for r in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }


@router.get("/history")
def list_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: str = Query("", max_length=20),
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = db.query(GymPaymentSubmission).filter(
        GymPaymentSubmission.organization_id == uuid.UUID(payload.get("organization_id")),
        GymPaymentSubmission.status.in_(["approved", "rejected"]),
    )
    if status in ("approved", "rejected"):
        query = query.filter(GymPaymentSubmission.status == status)
    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    rows = query.order_by(GymPaymentSubmission.reviewed_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    return {
        "items": [_submission_row(r, db) for r in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }


@router.get("/pending-count")
def pending_count(payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    count = (
        db.query(GymPaymentSubmission)
        .filter(
            GymPaymentSubmission.organization_id == uuid.UUID(payload.get("organization_id")),
            GymPaymentSubmission.status == "pending",
        )
        .count()
    )
    return {"count": count}


@router.patch("/{submission_id}/review")
def review_submission(
    submission_id: uuid.UUID,
    body: PaymentSubmissionReview,
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if body.status not in ("approved", "rejected"):
        raise HTTPException(status_code=422, detail="Status must be 'approved' or 'rejected'")

    sub = _get_submission(db, submission_id, uuid.UUID(payload.get("organization_id")))

    if sub.status == "approved":
        raise HTTPException(status_code=400, detail="Submission is already approved")

    member = db.query(GymMember).filter(GymMember.id == sub.member_id).first()

    if body.status == "approved":
        if sub.enrollment_id:
            _apply_enrollment_payment(db, sub)
        else:
            _mark_membership_paid(db, sub)
            if sub.renewal_id:
                from app.models import GymRenewalRequest
                renewal = db.query(GymRenewalRequest).filter(GymRenewalRequest.id == sub.renewal_id).first()
                if renewal:
                    renewal.status = "completed"
                    renewal.updated_at = datetime.now(timezone.utc)

    sub.status = body.status
    sub.admin_notes = body.admin_notes or None
    sub.reviewed_at = datetime.now(timezone.utc)
    sub.reviewed_by = uuid.UUID(payload.get("sub"))
    sub.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sub)

    log_action(
        db, sub.organization_id, body.status, "payment_submission", entity_id=sub.id,
        description=f"Admin {body.status} GCash submission for {member.full_name if member else 'member'} "
                    f"(ref ...{sub.ref_last4}, ₱{float(sub.amount_paid):,.2f})"
                    + (f" — {sub.admin_notes}" if sub.admin_notes else ""),
        actor_user_id=payload.get("sub"), actor_name="Admin", actor_role="admin",
    )
    db.commit()

    return _submission_row(sub, db)


def _mark_membership_paid(db, sub):
    """Reuse the renewals 'complete' behaviour: record a paid GymPayment row and
    extend the linked membership (creating one if the member has none)."""
    membership = None
    if sub.membership_id:
        membership = db.query(GymMembership).filter(GymMembership.id == sub.membership_id).first()
    if not membership:
        membership = (
            db.query(GymMembership)
            .filter(GymMembership.member_id == sub.member_id)
            .order_by(GymMembership.end_date.desc())
            .first()
        )
    member = db.query(GymMember).filter(GymMember.id == sub.member_id).first()

    extend_days = 30
    if membership:
        plan = db.query(GymMembershipPlan).filter(GymMembershipPlan.id == membership.plan_id).first()
        if plan:
            cycle = (plan.billing_cycle or "").lower()
            extend_days = {"weekly": 7, "monthly": 30, "yearly": 365}.get(cycle, 30)
        membership.end_date = membership.end_date + timedelta(days=extend_days)
        membership.status = "active"
        membership.updated_at = datetime.now(timezone.utc)
    else:
        first_plan = db.query(GymMembershipPlan).order_by(GymMembershipPlan.price.asc()).first()
        membership = GymMembership(
            id=uuid.uuid4(),
            organization_id=sub.organization_id,
            member_id=sub.member_id,
            plan_id=first_plan.id if first_plan else None,
            status="active",
            payment_type="full",
            amount_due=float(sub.amount_paid),
            amount_paid=float(sub.amount_paid),
            start_date=datetime.now(timezone.utc).date(),
            end_date=datetime.now(timezone.utc).date() + timedelta(days=extend_days),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(membership)
        sub.membership_id = membership.id

    receipt_no = f"OR-{uuid.uuid4().hex[:6].upper()}"
    new_payment = GymPayment(
        id=uuid.uuid4(),
        organization_id=sub.organization_id,
        member_id=sub.member_id,
        membership_id=membership.id,
        receipt_no=receipt_no,
        item_description=f"GCash payment (ref ...{sub.ref_last4})",
        amount=float(sub.amount_paid),
        payment_category="membership",
        discount_amount=0,
        payment_method="gcash",
        reference_no=sub.ref_last4,
        status="paid",
        paid_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_payment)


def _apply_enrollment_payment(db, sub):
    """Apply an approved GCash submission to a linked coach enrollment:
    accumulate amount_paid, update payment/enrollment status, and record a
    coach-category GymPayment row."""
    from app.models import GymCoachEnrollment, GymCoach

    enrollment = db.query(GymCoachEnrollment).filter(GymCoachEnrollment.id == sub.enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Linked coach enrollment not found")

    total = float(enrollment.total_amount)
    paid = float(enrollment.amount_paid or 0) + float(sub.amount_paid)

    if enrollment.payment_method == "full_payment":
        enrollment.payment_status = "paid"
        enrollment.amount_paid = total
    elif enrollment.payment_method == "down_payment":
        enrollment.payment_status = "partially_paid"
        enrollment.amount_paid = paid
        if paid >= total - 0.005:
            enrollment.payment_status = "paid"
            enrollment.amount_paid = total
    enrollment.enrollment_status = "active"
    enrollment.updated_at = datetime.now(timezone.utc)

    member = db.query(GymMember).filter(GymMember.id == sub.member_id).first()
    if member and member.assigned_coach_id is None:
        member.assigned_coach_id = enrollment.coach_id
        member.updated_at = datetime.now(timezone.utc)

    coach = db.query(GymCoach).filter(GymCoach.id == enrollment.coach_id).first()
    coach_label = coach.full_name if coach else "coach"

    receipt_no = f"OR-{uuid.uuid4().hex[:6].upper()}"
    new_payment = GymPayment(
        id=uuid.uuid4(),
        organization_id=sub.organization_id,
        member_id=sub.member_id,
        receipt_no=receipt_no,
        item_description=f"Coach enrollment payment - {coach_label} (ref ...{sub.ref_last4})",
        amount=float(sub.amount_paid),
        payment_category="coach",
        discount_amount=0,
        payment_method="gcash",
        reference_no=sub.ref_last4,
        status="paid",
        paid_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_payment)
