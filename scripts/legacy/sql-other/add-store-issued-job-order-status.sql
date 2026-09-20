-- Add STORE_ISSUED to job_order_status enum (required for SRV workflow)
--
-- Fixes error:
--   invalid input value for enum job_order_status: "STORE_ISSUED"
--
-- Run in Supabase SQL Editor.

ALTER TYPE public.job_order_status
  ADD VALUE IF NOT EXISTS 'STORE_ISSUED';
