-- Migration: 20260524_create_support_feedbacks.sql
-- Author: antigravity
-- Purpose: Create support_feedbacks table for storing dashboard user support requests
-- Rollback: DROP TABLE IF EXISTS support_feedbacks;

CREATE TABLE IF NOT EXISTS support_feedbacks (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    tenant_name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_feedbacks_tenant_id ON support_feedbacks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_feedbacks_user_id ON support_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_support_feedbacks_deleted_at ON support_feedbacks(deleted_at);
