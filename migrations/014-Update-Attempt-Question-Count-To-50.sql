-- Migration: Align evaluation attempts to 50-question format

-- Cap existing attempts to 50 questions
update public.user_attempts
set
  total_questions = 50,
  questions_answered = least(questions_answered, 50),
  correct_count = least(correct_count, 50)
where total_questions <> 50;

-- Remove attempt questions beyond the new range to prevent constraint violations
delete from public.attempt_questions
where question_order > 50;

-- Update default total question count
alter table public.user_attempts
  alter column total_questions set default 50;

-- Refresh question order constraint to enforce 1-50 range
alter table public.attempt_questions
  drop constraint if exists attempt_questions_question_order_check;

alter table public.attempt_questions
  add constraint attempt_questions_question_order_check
  check (question_order between 1 and 50);

