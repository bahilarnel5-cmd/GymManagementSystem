import uuid
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GymMember, GymUser, GymMemberChangeRequest
from app.auth import require_role
from app.schemas import MemberCreate, MemberUpdate, MemberChangeRequestReview
from app.activity import log_action
from app import storage

router = APIRouter(prefix="/gym_members", tags=["members"])

# field_name (frontend/API value) -> gym_members column
FIELD_COLUMNS = {
    "full_name": "full_name",
    "phone": "mobile_phone",
    "email": "email",
    "address": "address",
    "emergency_contact": "emergency_contact",
    "profile_photo": "profile_photo",
}

# Reasons that require an uploaded proof image (identity-sensitive).
PROOF_REQUIRED_REASONS = {"civil_status_change", "legal_name_correction"}

VALID_REASONS = {
    "civil_status_change", "lost_stolen_number", "email_change", "address_change",
    "legal_name_correction", "emergency_contact_update", "profile_photo_update", "other",
}


def format_phone(raw):
    """Normalize a PH mobile to '+63 XXX XXX XXXX'."""
    digits = "".join(ch for ch in str(raw or "") if ch.isdigit())
    if digits.startswith("63"):
        digits = digits[2:]
    if digits.startswith("0"):
        digits = digits[1:]
    digits = digits[:10]
    out = "+63"
    if len(digits) > 0:
        out += " " + digits[:3]
    if len(digits) > 3:
        out += " " + digits[3:6]
    if len(digits) > 6:
        out += " " + digits[6:10]
    return out


def _current_value(member, field_name):
    col = FIELD_COLUMNS.get(field_name)
    if not col:
        return None
    return getattr(member, col, None)


def _change_request_row(req, db):
    member = db.query(GymMember).filter(GymMember.id == req.member_id).first()
    reviewer = db.query(GymUser).filter(GymUser.id == req.reviewed_by).first() if req.reviewed_by else None
    return {
        "id": str(req.id),
        "member_id": str(req.member_id),
        "member_name": member.full_name if member else "Unknown",
        "field_name": req.field_name,
        "current_value": req.current_value,
        "requested_value": req.requested_value,
        "reason": req.reason,
        "explanation": req.explanation,
        "proof_url": storage.signed_url(req.proof_url, storage.CHANGE_REQUEST_BUCKET) if req.proof_url else None,
        "status": req.status,
        "admin_notes": req.admin_notes,
        "submitted_at": req.submitted_at.isoformat(),
        "reviewed_at": req.reviewed_at.isoformat() if req.reviewed_at else None,
        "reviewed_by": reviewer.email if reviewer else None,
    }


def _get_request(db, request_id, org_id):
    req = db.query(GymMemberChangeRequest).filter(GymMemberChangeRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Change request not found")
    if str(req.organization_id) != str(org_id):
        raise HTTPException(status_code=403, detail="Not authorized for this action")
    return req


@router.get("/")
def list_members(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
    status: str = Query("", max_length=20),
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = db.query(GymMember)

    if search:
        # Live "letter" search: alphabetic queries match names only (prefix),
        # so typing "A" shows members whose name starts with "A".
        name_match = GymMember.full_name.ilike(f"{search}%")
        if any(ch.isdigit() or not ch.isalnum() for ch in search):
            # Searching by code / email / phone (contains digits or symbols)
            query = query.filter(
                name_match
                | GymMember.member_code.ilike(f"{search}%")
                | GymMember.email.ilike(f"{search}%")
                | GymMember.mobile_phone.ilike(f"{search}%")
            )
        else:
            query = query.filter(name_match)
    if status:
        query = query.filter(GymMember.status == status)

    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    members = query.order_by(GymMember.created_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    return {
        "items": [
            {
                "id": str(m.id),
                "member_code": m.member_code,
                "full_name": m.full_name,
                "email": m.email,
                "mobile_phone": m.mobile_phone,
                "assigned_coach_id": str(m.assigned_coach_id) if m.assigned_coach_id else None,
                "status": m.status,
                "created_at": m.created_at.isoformat(),
            }
            for m in members
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }


@router.get("/unclaimed")
def list_unclaimed_members(db: Session = Depends(get_db)):
    claimed_ids = db.query(GymUser.member_id).filter(GymUser.member_id.isnot(None)).subquery()
    members = db.query(GymMember).filter(GymMember.id.notin_(claimed_ids)).all()
    return [
        {"id": str(m.id), "full_name": m.full_name, "member_code": m.member_code}
        for m in members
    ]


@router.post("/change-requests")
async def create_change_request(
    field_name: str = Form(...),
    requested_value: str = Form(...),
    reason: str = Form(...),
    explanation: str = Form(...),
    file: UploadFile | None = File(default=None),
    payload: dict = Depends(require_role("member")),
    db: Session = Depends(get_db),
):
    member_id = payload.get("member_id")
    if not member_id:
        raise HTTPException(status_code=400, detail="No member linked to this account")
    mid = uuid.UUID(member_id)

    member = db.query(GymMember).filter(GymMember.id == mid).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if field_name not in FIELD_COLUMNS:
        raise HTTPException(status_code=422, detail="Invalid field_name")
    if reason not in VALID_REASONS:
        raise HTTPException(status_code=422, detail="Invalid reason")
    if not explanation or not explanation.strip():
        raise HTTPException(status_code=422, detail="Explanation is required")
    if not requested_value or not requested_value.strip():
        raise HTTPException(status_code=422, detail="Requested value is required")

    proof_path = None
    proof_required = reason in PROOF_REQUIRED_REASONS

    if file is not None:
        file_bytes = await file.read()
        if file_bytes:
            if not storage.storage_configured():
                raise HTTPException(status_code=503, detail="Proof storage is not configured")
            content_type = file.content_type or "image/png"
            try:
                proof_path = storage.upload_screenshot(file_bytes, content_type, bucket=storage.CHANGE_REQUEST_BUCKET)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to upload proof: {str(e)}")

    if proof_required and not proof_path:
        raise HTTPException(
            status_code=422,
            detail="A proof image is required for this request reason"
        )

    current_val = _current_value(member, field_name)
    if field_name == "profile_photo" and proof_path:
        # The uploaded proof IS the new profile photo.
        requested_value = proof_path

    new_req = GymMemberChangeRequest(
        id=uuid.uuid4(),
        organization_id=member.organization_id,
        member_id=mid,
        field_name=field_name,
        current_value=str(current_val) if current_val is not None else None,
        requested_value=requested_value,
        reason=reason,
        explanation=explanation,
        proof_url=proof_path,
        status="pending",
        submitted_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)

    log_action(
        db, member.organization_id, "create", "member_change_request", entity_id=new_req.id,
        description=f"Member {member.full_name} requested {field_name} change",
        actor_user_id=payload.get("sub"), actor_name=member.full_name, actor_role="member",
    )
    db.commit()

    return {
        "id": str(new_req.id),
        "status": new_req.status,
        "message": "Request submitted, pending admin review",
    }


@router.get("/change-requests/pending")
def list_change_requests_pending(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = db.query(GymMemberChangeRequest).filter(
        GymMemberChangeRequest.organization_id == uuid.UUID(payload.get("organization_id")),
        GymMemberChangeRequest.status == "pending",
    )
    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    rows = query.order_by(GymMemberChangeRequest.submitted_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()
    return {
        "items": [_change_request_row(r, db) for r in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }


@router.get("/change-requests/history")
def list_change_requests_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: str = Query("", max_length=20),
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = db.query(GymMemberChangeRequest).filter(
        GymMemberChangeRequest.organization_id == uuid.UUID(payload.get("organization_id")),
        GymMemberChangeRequest.status.in_(["approved", "rejected"]),
    )
    if status in ("approved", "rejected"):
        query = query.filter(GymMemberChangeRequest.status == status)
    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    rows = query.order_by(GymMemberChangeRequest.reviewed_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()
    return {
        "items": [_change_request_row(r, db) for r in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }


@router.get("/change-requests/mine")
def list_my_change_requests(
    payload: dict = Depends(require_role("member")),
    db: Session = Depends(get_db),
):
    member_id = payload.get("member_id")
    if not member_id:
        raise HTTPException(status_code=400, detail="No member linked to this account")
    mid = uuid.UUID(member_id)
    rows = (
        db.query(GymMemberChangeRequest)
        .filter(GymMemberChangeRequest.member_id == mid)
        .order_by(GymMemberChangeRequest.submitted_at.desc())
        .all()
    )
    return [_change_request_row(r, db) for r in rows]


@router.get("/change-requests/pending-count")
def change_requests_pending_count(
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    count = (
        db.query(GymMemberChangeRequest)
        .filter(
            GymMemberChangeRequest.organization_id == uuid.UUID(payload.get("organization_id")),
            GymMemberChangeRequest.status == "pending",
        )
        .count()
    )
    return {"count": count}


@router.patch("/change-requests/{request_id}/review")
def review_change_request(
    request_id: uuid.UUID,
    body: MemberChangeRequestReview,
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if body.status not in ("approved", "rejected"):
        raise HTTPException(status_code=422, detail="Status must be 'approved' or 'rejected'")

    req = _get_request(db, request_id, uuid.UUID(payload.get("organization_id")))
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Request is already reviewed")

    member = db.query(GymMember).filter(GymMember.id == req.member_id).first()

    if body.status == "approved":
        col = FIELD_COLUMNS.get(req.field_name)
        if not col or not member:
            raise HTTPException(status_code=422, detail="Cannot approve: field not mappable")
        new_value = req.requested_value
        if req.field_name == "phone":
            new_value = format_phone(new_value)
        setattr(member, col, new_value)
        member.updated_at = datetime.now(timezone.utc)

    req.status = body.status
    req.admin_notes = body.admin_notes or None
    req.reviewed_at = datetime.now(timezone.utc)
    req.reviewed_by = uuid.UUID(payload.get("sub"))
    req.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(req)

    log_action(
        db, req.organization_id, body.status, "member_change_request", entity_id=req.id,
        description=f"Admin {body.status} change request for {member.full_name if member else 'member'} "
                    f"({req.field_name})"
                    + (f" — {req.admin_notes}" if req.admin_notes else ""),
        actor_user_id=payload.get("sub"), actor_name="Admin", actor_role="admin",
    )
    db.commit()

    return _change_request_row(req, db)


@router.post("/")
def create_member(member: MemberCreate, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    new_member = GymMember(
        id=uuid.uuid4(),
        organization_id=member.organization_id,
        member_code=member.member_code,
        full_name=member.full_name,
        email=member.email,
        mobile_phone=member.mobile_phone,
        assigned_coach_id=member.assigned_coach_id,
        status=member.status,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    log_action(
        db, member.organization_id, "create", "member", entity_id=new_member.id,
        description=f"Registered member {new_member.full_name} ({new_member.member_code})",
        actor_user_id=payload.get("sub"), actor_name="Admin", actor_role="admin",
    )
    db.commit()
    return {"id": str(new_member.id), "full_name": new_member.full_name}


@router.get("/{member_id}")
def get_member(member_id: uuid.UUID, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    m = db.query(GymMember).filter(GymMember.id == member_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    return {
        "id": str(m.id),
        "member_code": m.member_code,
        "full_name": m.full_name,
        "email": m.email,
        "mobile_phone": m.mobile_phone,
        "assigned_coach_id": str(m.assigned_coach_id) if m.assigned_coach_id else None,
        "status": m.status,
        "created_at": m.created_at.isoformat(),
    }


@router.put("/{member_id}")
def update_member(member_id: uuid.UUID, update: MemberUpdate, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    m = db.query(GymMember).filter(GymMember.id == member_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(m, field, value)
    m.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(m)
    log_action(
        db, m.organization_id, "update", "member", entity_id=m.id,
        description=f"Updated member {m.full_name}",
        actor_user_id=payload.get("sub"), actor_name="Admin", actor_role="admin",
    )
    db.commit()
    return {"id": str(m.id), "full_name": m.full_name}


@router.delete("/{member_id}")
def delete_member(member_id: uuid.UUID, payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    m = db.query(GymMember).filter(GymMember.id == member_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    member_name = m.full_name
    org_id = m.organization_id
    db.delete(m)
    db.commit()
    log_action(
        db, org_id, "delete", "member", entity_id=member_id,
        description=f"Deleted member {member_name}",
        actor_user_id=payload.get("sub"), actor_name="Admin", actor_role="admin",
    )
    db.commit()
    return {"deleted": True}
