-- Enforce no duplicate question within the same attempt
-- 1) Cleanup existing duplicates (keep earliest question_order)
WITH ranked AS (
  SELECT
    id,
    attempt_id,
    question_id,
    question_order,
    ROW_NUMBER() OVER (
      PARTITION BY attempt_id, question_id
      ORDER BY question_order ASC, id ASC
    ) AS rn
  FROM public.attempt_questions
)
DELETE FROM public.attempt_questions aq
USING ranked r
WHERE aq.id = r.id
  AND r.rn > 1;

-- 2) Unique constraint on (attempt_id, question_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uq_attempt_questions_attempt_id_question_id'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uq_attempt_questions_attempt_id_question_id
             ON public.attempt_questions (attempt_id, question_id)';
  END IF;
END $$;


