"""
Role-based sidebar configuration. Admins assign which sidebar items each role
sees; the frontend layouts fetch their own role's list from here.
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GymRoleMenu, GymUser, GymCoach
from app.auth import hash_password, require_role
from app.menu_catalog import MENUS, ROLES
from app.schemas import CoachAccountCreate, RoleMenuUpdate

router = APIRouter(prefix="/gym_menus", tags=["menus"])


def _catalog_for(role):
    return [m for m in MENUS if m["role"] == role]


@router.get("/me")
def get_my_menu(payload: dict = Depends(require_role("admin", "member", "coach")), db: Session = Depends(get_db)):
    """Menus visible to the calling user's role (enabled only)."""
    organization_id = payload.get("organization_id")
    role = payload.get("role")

    rows = (
        db.query(GymRoleMenu)
        .filter(
            GymRoleMenu.organization_id == organization_id,
            GymRoleMenu.role == role,
            GymRoleMenu.enabled == True,  # noqa: E712
        )
        .order_by(GymRoleMenu.sort_order)
        .all()
    )
    if not rows:
        catalog = _catalog_for(role)
        return {"role": role, "menus": [
            {"menu_id": m["menu_id"], "label": m["label"], "icon": m["icon"], "path": m["path"]}
            for m in catalog
        ]}
    return {"role": role, "menus": [
        {"menu_id": r.menu_id, "label": r.label, "icon": r.icon, "path": r.path}
        for r in rows
    ]}


@router.get("/roles")
def get_role_menus(payload: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    """All roles with the full menu catalog and enabled flags (Settings UI)."""
    organization_id = payload.get("organization_id")
    rows = (
        db.query(GymRoleMenu)
        .filter(GymRoleMenu.organization_id == organization_id)
        .all()
    )
    by_role = {}
    for r in rows:
        by_role.setdefault(r.role, {})[r.menu_id] = r

    roles_out = []
    for role in ROLES:
        items = []
        for m in _catalog_for(role):
            db_row = by_role.get(role, {}).get(m["menu_id"])
            items.append({
                "menu_id": m["menu_id"],
                "label": m["label"],
                "icon": m["icon"],
                "path": m["path"],
                "enabled": bool(db_row.enabled) if db_row else True,
            })
        roles_out.append({"role": role, "items": items})
    return {"roles": roles_out}


@router.put("/roles/{role}")
def update_role_menus(
    role: str,
    update: RoleMenuUpdate,
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if role not in ROLES:
        raise HTTPException(status_code=404, detail="Unknown role")

    organization_id = payload.get("organization_id")
    now = datetime.now(timezone.utc)
    enabled_map = {it.menu_id: it.enabled for it in update.items}
    catalog = {m["menu_id"]: m for m in _catalog_for(role)}

    for menu_id, enabled in enabled_map.items():
        if menu_id not in catalog:
            continue
        row = (
            db.query(GymRoleMenu)
            .filter(
                GymRoleMenu.organization_id == organization_id,
                GymRoleMenu.role == role,
                GymRoleMenu.menu_id == menu_id,
            )
            .first()
        )
        if row:
            row.enabled = enabled
            row.updated_at = now
        else:
            m = catalog[menu_id]
            db.add(GymRoleMenu(
                id=uuid.uuid4(),
                organization_id=organization_id,
                role=role,
                menu_id=menu_id,
                label=m["label"],
                icon=m["icon"],
                path=m["path"],
                enabled=enabled,
                sort_order=m["sort_order"],
                created_at=now,
                updated_at=now,
            ))
    db.commit()
    return {"role": role, "updated": True}


@router.post("/coach-accounts")
def create_coach_account(
    payload_in: CoachAccountCreate,
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Give a coach a login so they can use the Coach Portal."""
    organization_id = payload.get("organization_id")
    coach = db.query(GymCoach).filter(GymCoach.id == payload_in.coach_id).first()
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found")

    existing = db.query(GymUser).filter(
        GymUser.organization_id == organization_id,
        GymUser.email == payload_in.email,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    now = datetime.now(timezone.utc)
    user = GymUser(
        id=uuid.uuid4(),
        organization_id=organization_id,
        email=payload_in.email,
        hashed_password=hash_password(payload_in.password),
        role="coach",
        member_id=None,
        coach_id=coach.id,
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    from app.activity import log_action
    log_action(
        db, organization_id, "create", "coach_account",
        entity_id=user.id,
        description=f"Created coach portal account for {coach.full_name} ({payload_in.email})",
        actor_user_id=payload.get("sub"), actor_name="Admin", actor_role="admin",
    )
    db.commit()
    return {"id": str(user.id), "email": user.email, "coach_id": str(coach.id)}