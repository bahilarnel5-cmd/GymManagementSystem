import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GymSettings, Organization
from app.auth import require_role
from app.pricing import DEFAULT_ANNUAL_DISCOUNT_PERCENTAGE
from app.schemas import SettingsCreate, SettingsUpdate, AnnualDiscountUpdate

router = APIRouter(prefix="/gym_settings", tags=["settings"])


@router.get("/annual-discount")
def get_annual_discount(payload: dict = Depends(require_role("admin", "member")), db: Session = Depends(get_db)):
    org = payload.get("organization_id")
    if not org:
        raise HTTPException(status_code=400, detail="Missing organization")
    settings = db.query(GymSettings).filter(GymSettings.organization_id == uuid.UUID(org)).first()
    value = DEFAULT_ANNUAL_DISCOUNT_PERCENTAGE
    if settings and settings.annual_discount_percentage is not None:
        value = float(settings.annual_discount_percentage)
    return {"annual_discount_percentage": round(value, 2)}


@router.patch("/annual-discount")
def update_annual_discount(body: AnnualDiscountUpdate, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    org = payload.get("organization_id")
    if not org:
        raise HTTPException(status_code=400, detail="Missing organization")
    org_id = uuid.UUID(org)
    settings = db.query(GymSettings).filter(GymSettings.organization_id == org_id).first()
    if not settings:
        org_row = db.query(Organization).filter(Organization.id == org_id).first()
        settings = GymSettings(
            id=uuid.uuid4(),
            organization_id=org_id,
            business_name=org_row.name if org_row else "My Gym",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(settings)
    settings.annual_discount_percentage = round(body.annual_discount_percentage, 2)
    settings.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(settings)
    return {"annual_discount_percentage": float(settings.annual_discount_percentage)}


@router.get("/{organization_id}")
def get_settings(organization_id: uuid.UUID, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    s = db.query(GymSettings).filter(GymSettings.organization_id == organization_id).first()
    if not s:
        return None
    return {
        "id": str(s.id),
        "organization_id": str(s.organization_id),
        "business_name": s.business_name,
        "bir_tin_number": s.bir_tin_number,
        "official_email": s.official_email,
        "physical_address": s.physical_address,
        "checkin_timeout_minutes": s.checkin_timeout_minutes,
        "alert_desk_on_expired_checkin": s.alert_desk_on_expired_checkin,
        "require_signature_first_guest": s.require_signature_first_guest,
        "sms_gateway_service": s.sms_gateway_service,
        "auto_sms_reminder_days": s.auto_sms_reminder_days,
        "annual_discount_percentage": float(s.annual_discount_percentage) if s.annual_discount_percentage is not None else DEFAULT_ANNUAL_DISCOUNT_PERCENTAGE,
    }


@router.put("/")
def upsert_settings(settings: SettingsCreate, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    existing = db.query(GymSettings).filter(
        GymSettings.organization_id == settings.organization_id
    ).first()

    if existing:
        for field, value in settings.model_dump(exclude={"organization_id"}).items():
            setattr(existing, field, value)
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return {"id": str(existing.id), "business_name": existing.business_name}
    else:
        new_settings = GymSettings(
            id=uuid.uuid4(),
            organization_id=settings.organization_id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            **settings.model_dump(exclude={"organization_id"}),
        )
        db.add(new_settings)
        db.commit()
        db.refresh(new_settings)
        return {"id": str(new_settings.id), "business_name": new_settings.business_name}
