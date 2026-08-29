import uuid
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GymPayment, GymMember
from app.auth import require_role
from app.schemas import PaymentCreate
from app.activity import log_action

router = APIRouter(prefix="/gym_payments", tags=["payments"])


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
