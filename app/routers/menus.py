"""
Role-based sidebar configuration. Admins assign which sidebar sections each
role sees from a single merged grid; the frontend layouts fetch their own
role's list from here.

Staff roles (any role other than "member") share the admin portal and get the
same API access — their permission set is sidebar-only, defined by the rows
stored here for that role.
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GymRoleMenu, GymUser
from app.auth import hash_password, decode_token, require_role
from app.menu_catalog import MENUS, ROLES, all_sections, _section_for
from app.schemas import StaffAccountCreate, RoleMenuUpdate

router = APIRouter(prefix="/gym_menus", tags=["menus"])


@router.get("/me")
def get_my_menu(payload: dict = Depends(decode_token), db: Session = Depends(get_db)):
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
        catalog = [m for m in MENUS if m["role"] == role]
        # Fall back to that role's native portal only for built-in roles; a
        # custom staff role with no rows simply gets no sidebar.
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
    """All roles (built-in + staff/custom) with the full merged section grid
    and enabled flags — the single unified list for the Settings UI."""
    organization_id = payload.get("organization_id")
    rows = (
        db.query(GymRoleMenu)
        .filter(GymRoleMenu.organization_id == organization_id)
        .all()
    )
    by_role = {}
    for r in rows:
        by_role.setdefault(r.role, {})[r.menu_id] = r

    role_names = set(by_role)
    role_names.update(ROLES)
    for (user_role,) in db.query(GymUser.role).filter(GymUser.organization_id == organization_id).all():
        role_names.add(user_role)
    ordered = [r for r in ROLES if r in role_names] + sorted(r for r in role_names if r not in ROLES)

    sections = all_sections()
    roles_out = []
    for role in ordered:
        items = []
        for s in sections:
            menu_id = s["menu_id"]
            db_row = by_role.get(role, {}).get(menu_id)
            native = any(m["role"] == ("member" if role == "member" else "admin") and m["menu_id"] == menu_id for m in MENUS)
            items.append({
                "menu_id": menu_id,
                "label": db_row.label if db_row else s["label"],
                "icon": db_row.icon if db_row else s["icon"],
                "path": db_row.path if db_row else s["path"],
                "enabled": bool(db_row.enabled) if db_row else native,
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
    organization_id = payload.get("organization_id")
    now = datetime.now(timezone.utc)
    enabled_map = {it.menu_id: it.enabled for it in update.items}
    sections = {s["menu_id"]: s for s in all_sections()}

    for menu_id, enabled in enabled_map.items():
        if menu_id not in sections:
            continue
        m = _section_for(role, menu_id)
        if m is None:
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
            row.label = m["label"]
            row.icon = m["icon"]
            row.path = m["path"]
            row.sort_order = m["sort_order"]
            row.updated_at = now
        else:
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


@router.post("/accounts")
def create_staff_account(
    payload_in: StaffAccountCreate,
    payload: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Create a staff account. The role (e.g. 'cashier') defines which sidebar
    sections the account sees — member-type self-registration is unchanged."""
    organization_id = payload.get("organization_id")
    role = payload_in.role.strip().lower().replace(" ", "_")
    if not role:
        raise HTTPException(status_code=400, detail="Role is required")
    if role == "member":
        raise HTTPException(status_code=400, detail="Member accounts are created through member registration")

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
        role=role,
        member_id=None,
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    from app.activity import log_action
    log_action(
        db, organization_id, "create", "staff_account",
        entity_id=user.id,
        description=f"Created {role} staff account for {payload_in.email}",
        actor_user_id=payload.get("sub"), actor_name="Admin", actor_role="admin",
    )
    db.commit()
    return {"id": str(user.id), "email": user.email, "role": user.role}