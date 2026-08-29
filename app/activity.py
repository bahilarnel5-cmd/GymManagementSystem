"""Activity/history logging helper.

Adds a row to gym_activity_logs. The helper only adds the object to the
session; callers keep their existing commit logic so log writes ride along
in the same transaction as the action they describe.
"""
import uuid

from app.models import GymActivityLog


def log_action(
    db,
    organization_id,
    action,
    entity_type,
    entity_id=None,
    description="",
    actor_user_id=None,
    actor_name="System",
    actor_role="admin",
):
    entry = GymActivityLog(
        id=uuid.uuid4(),
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        actor_name=actor_name[:150] if actor_name else "System",
        actor_role=actor_role or "admin",
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=(description or "")[:1000],
    )
    db.add(entry)
    return entry