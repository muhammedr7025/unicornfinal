-- ============================================================
-- Migration 006: Add project_name and enquiry_id to quotes
-- ============================================================

ALTER TABLE quotes ADD COLUMN project_name TEXT;
ALTER TABLE quotes ADD COLUMN enquiry_id TEXT;
