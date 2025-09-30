-- Migration: User attempts and attempt questions for evaluation feature
-- Creates tables to track 60-question evaluation attempts with multi-session support

-- User attempts table: tracks evaluation attempts per user
create table if not exists public.user_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  status text not null check (status in ('in_progress', 'completed', 'abandoned')) default 'in_progress',
  total_questions int not null default 60,
  questions_answered int not null default 0,
  correct_count int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  metadata jsonb not null default '{
    "session_count": 1,
    "pause_count": 0,
    "time_spent_seconds": 0,
    "last_session_at": null
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Attempt questions table: links questions to attempts with user answers
create table if not exists public.attempt_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.user_attempts(id) on delete cascade,
  question_id uuid not null references public.mcq_items(id) on delete restrict,
  question_order int not null check (question_order between 1 and 60),
  user_answer_index int null check (user_answer_index between 0 and 3),
  is_correct boolean null,
  answered_at timestamptz null,
  time_spent_seconds int null check (time_spent_seconds >= 0),
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Ensure unique question order per attempt
  constraint uq_attempt_questions_order unique (attempt_id, question_order)
);

-- Indexes for performance
create index if not exists idx_user_attempts_user_status on public.user_attempts(user_id, status);
create index if not exists idx_user_attempts_completed_at on public.user_attempts(completed_at desc) where completed_at is not null;
create index if not exists idx_attempt_questions_attempt_id on public.attempt_questions(attempt_id);
create index if not exists idx_attempt_questions_question_id on public.attempt_questions(question_id);
create index if not exists idx_attempt_questions_attempt_order on public.attempt_questions(attempt_id, question_order);
create index if not exists idx_attempt_questions_answered_at on public.attempt_questions(attempt_id, answered_at) where answered_at is not null;

-- RLS policies
alter table public.user_attempts enable row level security;
alter table public.attempt_questions enable row level security;

-- User attempts: users can only access their own attempts
drop policy if exists "user_attempts_select" on public.user_attempts;
create policy "user_attempts_select" on public.user_attempts 
  for select using (user_id = auth.uid());

drop policy if exists "user_attempts_insert" on public.user_attempts;
create policy "user_attempts_insert" on public.user_attempts 
  for insert with check (user_id = auth.uid());

drop policy if exists "user_attempts_update" on public.user_attempts;
create policy "user_attempts_update" on public.user_attempts 
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Attempt questions: users can only access questions from their own attempts
drop policy if exists "attempt_questions_select" on public.attempt_questions;
create policy "attempt_questions_select" on public.attempt_questions 
  for select using (
    exists (
      select 1 from public.user_attempts ua 
      where ua.id = attempt_questions.attempt_id and ua.user_id = auth.uid()
    )
  );

drop policy if exists "attempt_questions_insert" on public.attempt_questions;
create policy "attempt_questions_insert" on public.attempt_questions 
  for insert with check (
    exists (
      select 1 from public.user_attempts ua 
      where ua.id = attempt_questions.attempt_id and ua.user_id = auth.uid()
    )
  );

drop policy if exists "attempt_questions_update" on public.attempt_questions;
create policy "attempt_questions_update" on public.attempt_questions 
  for update using (
    exists (
      select 1 from public.user_attempts ua 
      where ua.id = attempt_questions.attempt_id and ua.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.user_attempts ua 
      where ua.id = attempt_questions.attempt_id and ua.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_user_attempts_updated_at on public.user_attempts;
create trigger update_user_attempts_updated_at
  before update on public.user_attempts
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_attempt_questions_updated_at on public.attempt_questions;
create trigger update_attempt_questions_updated_at
  before update on public.attempt_questions
  for each row execute function public.update_updated_at_column();
