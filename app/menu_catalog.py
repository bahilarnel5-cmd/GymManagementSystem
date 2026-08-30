"""Sidebar menu catalog and default per-role assignments.

Admins can tweak which of these items each role sees from the Settings page
("Sidebar & Roles" tab). Defaults live here and are seeded on first boot.
"""
import uuid
from datetime import datetime, timezone

from app.models import GymRoleMenu

MENUS = [
    # Admin
    {"menu_id": "dashboard", "role": "admin", "label": "Dashboard", "icon": "bi-speedometer2", "path": "/dashboard", "sort_order": 0},
    {"menu_id": "members", "role": "admin", "label": "Members", "icon": "bi-people", "path": "/members", "sort_order": 1},
    {"menu_id": "coaches", "role": "admin", "label": "Coaches", "icon": "bi-person-badge", "path": "/coaches", "sort_order": 2},
    {"menu_id": "plans", "role": "admin", "label": "Membership Plans", "icon": "bi-card-list", "path": "/plans", "sort_order": 4},
    {"menu_id": "memberships", "role": "admin", "label": "Memberships", "icon": "bi-credit-card", "path": "/memberships", "sort_order": 5},
    {"menu_id": "payments", "role": "admin", "label": "Payments", "icon": "bi-cash-coin", "path": "/payments", "sort_order": 6},
    {"menu_id": "change_requests", "role": "admin", "label": "Change Requests", "icon": "bi-pencil-square", "path": "/change-requests", "sort_order": 7},
    {"menu_id": "activity_logs", "role": "admin", "label": "Activity Logs", "icon": "bi-clock-history", "path": "/activity-logs", "sort_order": 8},
    {"menu_id": "settings", "role": "admin", "label": "Settings", "icon": "bi-gear", "path": "/settings", "sort_order": 9},
    # Member
    {"menu_id": "dashboard", "role": "member", "label": "Dashboard", "icon": "bi-speedometer2", "path": "/member/dashboard", "sort_order": 0},
    {"menu_id": "coaches", "role": "member", "label": "Coaches", "icon": "bi-person-badge", "path": "/member/coaches", "sort_order": 1},
    {"menu_id": "renewals", "role": "member", "label": "Renewals", "icon": "bi-arrow-repeat", "path": "/member/renewals", "sort_order": 2},
    {"menu_id": "profile", "role": "member", "label": "My Profile", "icon": "bi-person-circle", "path": "/member/profile", "sort_order": 3},
]

# Built-in roles. Staff accounts may use any extra role name; their permission
# set is stored in gym_role_menus and defaults to the admin portal sections.
ROLES = ["admin", "member"]


def _portal_for(role):
    """Member logins keep the member portal; every other role is a staff role
    that uses the admin portal."""

    return "member" if role == "member" else "admin"


def _section_for(role, menu_id):
    """Best catalog entry for a section in a given role's portal.

    Prefers the entry native to the role's portal (member role -> member
    portal, everything else -> admin portal), then falls back to the other
    portal's entry so admin can freely mix member-portal sections (and vice
    versa) into any role.
    """

    prefer = _portal_for(role)
    for m in MENUS:
        if m["role"] == prefer and m["menu_id"] == menu_id:
            return m
    for m in MENUS:
        if m["menu_id"] == menu_id:
            return m
    return None


def _native_session(role, menu_id):
    """True when a section is native to the role's portal (enabled by default)."""

    return any(m["role"] == _portal_for(role) and m["menu_id"] == menu_id for m in MENUS)


def all_sections():
    """Deduplicated union of every section across all portals, for the Settings
    'Sidebar & Roles' permission grid.

    Admin-portal entries come first in the catalog, so they win the label/icon
    for sections that exist in both portals (Dashboard, Coaches).
    """

    sections = []
    seen = set()
    for m in MENUS:
        if m["menu_id"] in seen:
            continue
        seen.add(m["menu_id"])
        sections.append(m)
    return sections


def seed_role_menus(db, organization_id):
    """Insert default menu rows for an org if none exist yet.

    Only rows that are missing (by role + menu_id) are added. Existing rows —
    including any the admin has toggled off — are left untouched, so this is
    safe to call repeatedly even after the org already has menus.
    """
    existing = db.query(GymRoleMenu).filter(
        GymRoleMenu.organization_id == organization_id
    ).all()
    existing_keys = {(r.role, r.menu_id) for r in existing}
    catalog_keys = {(m["role"], m["menu_id"]) for m in MENUS}

    now = datetime.now(timezone.utc)
    changed = False

    # Drop rows for menu items that no longer exist in the catalog,
    # so removed sections disappear from every role's sidebar.
    for row in existing:
        if (row.role, row.menu_id) not in catalog_keys:
            db.delete(row)
            changed = True

    for m in MENUS:
        if (m["role"], m["menu_id"]) in existing_keys:
            continue
        row = GymRoleMenu(
            id=uuid.uuid4(),
            organization_id=organization_id,
            role=m["role"],
            menu_id=m["menu_id"],
            label=m["label"],
            icon=m["icon"],
            path=m["path"],
            enabled=True,
            sort_order=m["sort_order"],
            created_at=now,
            updated_at=now,
        )
        db.add(row)
        changed = True
    if changed:
        db.commit()