import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import GymUser, GymMember
from app.auth import hash_password, verify_password, create_access_token, decode_token
from app.schemas import RegisterRequest, LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=dict)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    member = db.query(GymMember).filter(GymMember.id == payload.member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member record not found")

    # Uniqueness is per-org (see DB contract §5) — scope the email check to the member's org.
    existing = db.query(GymUser).filter(
        GymUser.organization_id == member.organization_id,
        GymUser.email == payload.email,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = GymUser(
        id=uuid.uuid4(),
        organization_id=member.organization_id,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role="member",
        member_id=member.id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"id": str(new_user.id), "email": new_user.email, "role": new_user.role}


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    # NOTE: email is now unique per-org, not globally (DB contract §5). In your
    # local single-org sandbox this lookup is still safe, but once integrated
    # into multi-tenant Argo, login needs an org selector too, or this will
    # break the moment two orgs share a gym_users.email.
    user = db.query(GymUser).filter(GymUser.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token({
        "sub": str(user.id),
        "role": user.role,
        "organization_id": str(user.organization_id),
        "member_id": str(user.member_id) if user.member_id else None,
    })
    return TokenResponse(access_token=token, role=user.role, member_id=str(user.member_id) if user.member_id else None)


@router.get("/me")
def get_me(payload: dict = Depends(decode_token)):
    return payload
