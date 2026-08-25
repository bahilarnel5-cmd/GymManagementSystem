-- Gym Management System - PostgreSQL Schema
-- For Supabase or any PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Table: organizations
-- ============================================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL DEFAULT 'My Gym'
);

-- Seed default organization
INSERT INTO organizations (id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'Demo Gym')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Table: gym_coaches
-- Must be created before gym_members (members reference coaches)
-- ============================================================
CREATE TABLE gym_coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    specialization VARCHAR(150) NOT NULL,
    hourly_rate NUMERIC(10,2) NOT NULL,
    mobile_contact VARCHAR(30) NOT NULL,
    shift_schedule VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_gym_coaches_organization_id ON gym_coaches(organization_id);

-- ============================================================
-- Table: gym_members
-- ============================================================
CREATE TABLE gym_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_code VARCHAR(20) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    mobile_phone VARCHAR(30) NOT NULL,
    assigned_coach_id UUID REFERENCES gym_coaches(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_gym_members_organization_id ON gym_members(organization_id);

-- ============================================================
-- Table: gym_membership_plans
-- ============================================================
CREATE TABLE gym_membership_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
    features TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_gym_membership_plans_organization_id ON gym_membership_plans(organization_id);

-- ============================================================
-- Table: gym_memberships
-- ============================================================
CREATE TABLE gym_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES gym_members(id),
    plan_id UUID NOT NULL REFERENCES gym_membership_plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    payment_type VARCHAR(20) NOT NULL DEFAULT 'full',
    amount_due NUMERIC(10,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    last_contacted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_gym_memberships_organization_id ON gym_memberships(organization_id);
CREATE INDEX idx_gym_memberships_member_id ON gym_memberships(member_id);

-- ============================================================
-- Table: gym_pt_sessions
-- ============================================================
CREATE TABLE gym_pt_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES gym_coaches(id),
    member_id UUID NOT NULL REFERENCES gym_members(id),
    session_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    payment_type VARCHAR(20) NOT NULL DEFAULT 'full',
    amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_gym_pt_sessions_organization_id ON gym_pt_sessions(organization_id);

-- ============================================================
-- Table: gym_payments
-- ============================================================
CREATE TABLE gym_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES gym_members(id),
    membership_id UUID REFERENCES gym_memberships(id),
    receipt_no VARCHAR(30) NOT NULL,
    item_description VARCHAR(200) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    reference_no VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'paid',
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_gym_payments_organization_id ON gym_payments(organization_id);

-- ============================================================
-- Table: gym_check_ins
-- ============================================================
CREATE TABLE gym_check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES gym_members(id),
    zone_class VARCHAR(100),
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_gym_check_ins_organization_id ON gym_check_ins(organization_id);

-- ============================================================
-- Table: gym_settings
-- ============================================================
CREATE TABLE gym_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    business_name VARCHAR(150) NOT NULL,
    bir_tin_number VARCHAR(50),
    official_email VARCHAR(150),
    physical_address TEXT,
    checkin_timeout_minutes INTEGER NOT NULL DEFAULT 15,
    alert_desk_on_expired_checkin BOOLEAN NOT NULL DEFAULT TRUE,
    require_signature_first_guest BOOLEAN NOT NULL DEFAULT TRUE,
    sms_gateway_service VARCHAR(50),
    auto_sms_reminder_days INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- ============================================================
-- Table: gym_users
-- ============================================================
CREATE TABLE gym_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    member_id UUID REFERENCES gym_members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gym_users_organization_id ON gym_users(organization_id);

-- ============================================================
-- Table: gym_renewal_requests
-- ============================================================
CREATE TABLE gym_renewal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES gym_members(id),
    membership_id UUID NOT NULL REFERENCES gym_memberships(id),
    requested_date TIMESTAMPTZ NOT NULL,
    payment_type VARCHAR(20) NOT NULL DEFAULT 'full',
    amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gym_renewal_requests_organization_id ON gym_renewal_requests(organization_id);
