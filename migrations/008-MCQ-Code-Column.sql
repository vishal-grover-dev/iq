-- 008-MCQ-Code-Column.sql
-- Adds an optional code column to store code snippets for MCQ items.
-- Do not modify previous migrations.

ALTER TABLE IF EXISTS public.mcq_items
  ADD COLUMN IF NOT EXISTS code text;

COMMENT ON COLUMN public.mcq_items.code IS 'Optional code snippet associated with the MCQ (may include fenced markdown).';
