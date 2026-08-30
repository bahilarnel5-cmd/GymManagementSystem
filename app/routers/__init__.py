from .members import router as members_router
from .coaches import router as coaches_router
from .plans import router as plans_router
from .payments import router as payments_router
from .memberships import router as memberships_router
from .pt_sessions import router as pt_sessions_router
from .checkins import router as checkins_router
from .settings import router as settings_router
from .renewals import router as renewals_router
from .dashboard import router as dashboard_router
from .auth import router as auth_router
from .coach_schedules import router as coach_schedules_router
from .member_portal import router as member_portal_router
from .activity_logs import router as activity_logs_router
from .menus import router as menus_router
from .coach_enrollments import router as coach_enrollments_router

all_routers = [
    auth_router,
    dashboard_router,
    members_router,
    coaches_router,
    plans_router,
    payments_router,
    memberships_router,
    pt_sessions_router,
    checkins_router,
    settings_router,
    renewals_router,
    coach_schedules_router,
    member_portal_router,
    activity_logs_router,
    menus_router,
    coach_enrollments_router,
]