-- Ingestion events table for step-level observability
create table if not exists public.ingestion_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ingestion_id uuid not null references public.ingestions(id) on delete cascade,
  stage text not null,
  level text not null default 'info' check (level in ('info','warn','error')),
  message text not null,
  meta jsonb null
);

create index if not exists idx_ingestion_events_ingestion_id on public.ingestion_events(ingestion_id);
create index if not exists idx_ingestion_events_created_at on public.ingestion_events(created_at desc);

-- RLS
alter table public.ingestion_events enable row level security;

drop policy if exists "ingestion_events_select" on public.ingestion_events;
create policy "ingestion_events_select" on public.ingestion_events for select using (
  exists (
    select 1 from public.ingestions i where i.id = ingestion_events.ingestion_id and i.user_id = auth.uid()
  )
);

drop policy if exists "ingestion_events_modify" on public.ingestion_events;
create policy "ingestion_events_modify" on public.ingestion_events for all using (
  exists (
    select 1 from public.ingestions i where i.id = ingestion_events.ingestion_id and i.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.ingestions i where i.id = ingestion_events.ingestion_id and i.user_id = auth.uid()
  )
);


