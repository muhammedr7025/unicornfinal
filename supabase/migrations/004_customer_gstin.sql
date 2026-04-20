-- ============================================================
-- Migration 004: Add GSTIN column to customers
-- ============================================================

ALTER TABLE customers ADD COLUMN gstin TEXT;
