import uuid
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr


# ---- Auth ----

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    member_id: uuid.UUID


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    member_id: Optional[str] = None


# ---- Members ----

class MemberCreate(BaseModel):
    organization_id: uuid.UUID
    member_code: str
    full_name: str
    email: Optional[str] = None
    mobile_phone: str
    assigned_coach_id: Optional[uuid.UUID] = None
    status: str = "active"


class MemberUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    mobile_phone: Optional[str] = None
    assigned_coach_id: Optional[uuid.UUID] = None
    status: Optional[str] = None


class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    organization_id: uuid.UUID
    member_code: str
    full_name: str
    email: Optional[str]
    mobile_phone: str
    assigned_coach_id: Optional[uuid.UUID]
    status: str
    created_at: datetime
    updated_at: datetime


# ---- Coaches ----

class CoachCreate(BaseModel):
    organization_id: uuid.UUID
    full_name: str
    specialization: str
    hourly_rate: float
    mobile_contact: str
    shift_schedule: Optional[str] = None


class CoachUpdate(BaseModel):
    full_name: Optional[str] = None
    specialization: Optional[str] = None
    hourly_rate: Optional[float] = None
    mobile_contact: Optional[str] = None
    shift_schedule: Optional[str] = None


class CoachResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    organization_id: uuid.UUID
    full_name: str
    specialization: str
    hourly_rate: float
    mobile_contact: str
    shift_schedule: Optional[str]
    created_at: datetime
    updated_at: datetime


# ---- Membership Plans ----

class PlanCreate(BaseModel):
    organization_id: uuid.UUID
    name: str
    price: float
    billing_cycle: str = "monthly"
    features: Optional[str] = None
    is_active: bool = True


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    billing_cycle: Optional[str] = None
    features: Optional[str] = None
    is_active: Optional[bool] = None


class PlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    price: float
    billing_cycle: str
    features: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ---- Memberships ----

class MembershipCreate(BaseModel):
    organization_id: uuid.UUID
    member_id: uuid.UUID
    plan_id: uuid.UUID
    payment_type: str = "full"
    amount_due: float = 0
    amount_paid: float = 0
    start_date: date
    end_date: date
    status: str = "active"


class MembershipUpdate(BaseModel):
    plan_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    payment_type: Optional[str] = None
    amount_due: Optional[float] = None
    amount_paid: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    last_contacted_at: Optional[datetime] = None


class MembershipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    member_name: str
    member_phone: str
    plan_name: str
    status: str
    payment_type: str
    amount_due: float
    amount_paid: float
    start_date: date
    end_date: date
    last_contacted_at: Optional[datetime]


# ---- Payments ----

class PaymentCreate(BaseModel):
    organization_id: uuid.UUID
    member_id: uuid.UUID
    membership_id: Optional[uuid.UUID] = None
    item_description: str
    amount: float
    payment_category: str = "membership"
    discount_amount: float = 0
    discount_description: Optional[str] = None
    payment_method: str
    reference_no: Optional[str] = None


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    receipt_no: str
    member_name: str
    item_description: str
    amount: float
    payment_category: str
    discount_amount: float
    discount_description: Optional[str]
    payment_method: str
    reference_no: Optional[str]
    status: str
    paid_at: datetime


class PaymentSubmissionReview(BaseModel):
    status: str
    admin_notes: Optional[str] = None


# ---- PT Sessions ----

class PtSessionCreate(BaseModel):
    organization_id: uuid.UUID
    member_id: uuid.UUID
    coach_id: uuid.UUID
    session_date: datetime
    payment_type: str = "full"
    amount: float


class PtSessionUpdate(BaseModel):
    status: Optional[str] = None
    amount_paid: Optional[float] = None
    session_date: Optional[datetime] = None


class PtSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    member_name: str
    coach_name: str
    session_date: datetime
    status: str
    payment_type: str
    amount: float
    amount_paid: float


# ---- Check-ins ----

class CheckInCreate(BaseModel):
    organization_id: uuid.UUID
    member_id: uuid.UUID
    zone_class: Optional[str] = None


class CheckInResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    member_name: str
    member_code: str
    zone_class: Optional[str]
    checked_in_at: datetime
    status: str


# ---- Settings ----

class SettingsCreate(BaseModel):
    organization_id: uuid.UUID
    business_name: str
    bir_tin_number: Optional[str] = None
    official_email: Optional[str] = None
    physical_address: Optional[str] = None
    checkin_timeout_minutes: int = 15
    alert_desk_on_expired_checkin: bool = True
    require_signature_first_guest: bool = True
    sms_gateway_service: Optional[str] = None
    auto_sms_reminder_days: int = 3


class SettingsUpdate(BaseModel):
    business_name: Optional[str] = None
    bir_tin_number: Optional[str] = None
    official_email: Optional[str] = None
    physical_address: Optional[str] = None
    checkin_timeout_minutes: Optional[int] = None
    alert_desk_on_expired_checkin: Optional[bool] = None
    require_signature_first_guest: Optional[bool] = None
    sms_gateway_service: Optional[str] = None
    auto_sms_reminder_days: Optional[int] = None


class SettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    organization_id: uuid.UUID
    business_name: str
    bir_tin_number: Optional[str]
    official_email: Optional[str]
    physical_address: Optional[str]
    checkin_timeout_minutes: int
    alert_desk_on_expired_checkin: bool
    require_signature_first_guest: bool
    sms_gateway_service: Optional[str]
    auto_sms_reminder_days: int


# ---- Renewal Requests ----

class RenewalRequestCreate(BaseModel):
    organization_id: uuid.UUID
    member_id: uuid.UUID
    membership_id: uuid.UUID
    requested_date: datetime
    payment_type: str = "full"
    amount: float


class RenewalRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    member_name: str
    membership_id: uuid.UUID
    requested_date: datetime
    payment_type: str
    amount: float
    status: str


class RenewalCompleteIn(BaseModel):
    extend_days: int = 30


# ---- Avail Plan ----

class AvailPlanIn(BaseModel):
    organization_id: uuid.UUID
    member_id: uuid.UUID
    plan_id: uuid.UUID
    payment_type: str = "full"
    amount_due: float


# ---- Dashboard ----

class DashboardStats(BaseModel):
    total_members: int
    active_members: int
    total_coaches: int
    active_memberships: int
    expiring_soon: int
    total_revenue: float
    today_checkins: int
    pending_renewals: int


# ---- Pagination ----

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    per_page: int
    pages: int


# ---- Coach Schedules ----

class CoachScheduleCreate(BaseModel):
    organization_id: uuid.UUID
    coach_id: uuid.UUID
    day_of_week: int
    shift_type: str
    is_active: bool = True


class CoachScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    coach_id: uuid.UUID
    day_of_week: int
    shift_type: str
    is_active: bool


# ---- Member Bookings ----

class MemberBookingCreate(BaseModel):
    organization_id: uuid.UUID
    coach_id: uuid.UUID
    member_id: uuid.UUID
    day_of_week: int
    start_hour: int
    end_hour: int
    shift_type: str
    start_date: date
    weeks: int = 1


class MemberBookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    coach_name: str
    coach_specialization: str
    day_of_week: int
    start_hour: int
    end_hour: int
    shift_type: str
    start_date: date
    weeks: int
    status: str
    created_at: datetime


# ---- Member Portal ----

class MemberDashboardResponse(BaseModel):
    member: dict
    membership: Optional[dict]
    recent_payments: list
    recent_bookings: list
    stats: dict


class CoachSlotResponse(BaseModel):
    day_of_week: int
    date: str
    shift_type: str
    start_hour: int
    end_hour: int
    available: bool
    booked_by_me: bool


# ---- Coach Portal Accounts ----

class CoachAccountCreate(BaseModel):
    coach_id: uuid.UUID
    email: EmailStr
    password: str


# ---- Role Menu Config ----

class MenuItemUpdate(BaseModel):
    menu_id: str
    enabled: bool


class RoleMenuUpdate(BaseModel):
    role: str
    items: list[MenuItemUpdate]
