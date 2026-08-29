import uuid
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GymMembershipPlan
from app.auth import require_role
from app.schemas import PlanCreate, PlanUpdate
from app.activity import log_action

router = APIRouter(prefix="/gym_membership_plans", tags=["plans"])


@router.get("/")
def list_plans(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    active_only: bool = Query(False),
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = db.query(GymMembershipPlan)
    if active_only:
        query = query.filter(GymMembershipPlan.is_active == True)

    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    plans = query.order_by(GymMembershipPlan.price).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "items": [
            {
                "id": str(p.id),
                "name": p.name,
                "price": float(p.price),
                "billing_cycle": p.billing_cycle,
                "features": p.features,
                "is_active": p.is_active,
                "created_at": p.created_at.isoformat(),
            }
            for p in plans
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }


@router.post("/")
def create_plan(plan: PlanCreate, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    new_plan = GymMembershipPlan(
        id=uuid.uuid4(),
        organization_id=plan.organization_id,
        name=plan.name,
        price=plan.price,
        billing_cycle=plan.billing_cycle,
        features=plan.features,
        is_active=plan.is_active,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)
    log_action(
        db, plan.organization_id, "create", "plan", entity_id=new_plan.id,
        description=f"Created membership plan {new_plan.name} (₱{float(new_plan.price):,.2f})",
        actor_user_id=payload.get("sub"), actor_name="Admin", actor_role="admin",
    )
    db.commit()
    return {"id": str(new_plan.id), "name": new_plan.name}


@router.get("/{plan_id}")
def get_plan(plan_id: uuid.UUID, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    p = db.query(GymMembershipPlan).filter(GymMembershipPlan.id == plan_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {
        "id": str(p.id),
        "name": p.name,
        "price": float(p.price),
        "billing_cycle": p.billing_cycle,
        "features": p.features,
        "is_active": p.is_active,
    }


@router.put("/{plan_id}")
def update_plan(plan_id: uuid.UUID, update: PlanUpdate, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    p = db.query(GymMembershipPlan).filter(GymMembershipPlan.id == plan_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Plan not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(p, field, value)
    p.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(p)
    return {"id": str(p.id), "name": p.name}


@router.delete("/{plan_id}")
def delete_plan(plan_id: uuid.UUID, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    p = db.query(GymMembershipPlan).filter(GymMembershipPlan.id == plan_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(p)
    db.commit()
    return {"deleted": True}
