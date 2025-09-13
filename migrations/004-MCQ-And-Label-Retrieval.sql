-- Combined migration: MCQ tables + label-based retrieval RPC
-- Add labels column for categorization of repo/web ingested content
alter table if exists public.documents add column if not exists labels jsonb;
alter table if exists public.document_chunks add column if not exists labels jsonb;

-- Helpful index on labels keys used for filtering
create index if not exists idx_documents_labels_gin on public.documents using gin (labels);
create index if not exists idx_chunks_labels_gin on public.document_chunks using gin (labels);


-- MCQ tables for generated questions and explanations
create table if not exists public.mcq_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null,
  -- Labels
  topic text not null,
  subtopic text null,
  version text null,
  difficulty text not null check (difficulty in ('Easy','Medium','Hard')),
  bloom_level text not null check (bloom_level in ('Remember','Understand','Apply','Analyze','Evaluate','Create')),
  -- Item
  question text not null,
  options text[] not null check (array_length(options, 1) = 4),
  correct_index int not null check (correct_index between 0 and 3),
  -- Citations: array of JSON objects with url, sectionTitle, and optional document reference
  citations jsonb not null default '[]'::jsonb,
  -- Provenance labels for quick filters
  labels jsonb null,
  -- Optional linkage to ingestion scope for the user
  ingestion_id uuid null references public.ingestions(id) on delete set null
);

create table if not exists public.mcq_explanations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  mcq_id uuid not null references public.mcq_items(id) on delete cascade,
  explanation text not null
);

-- Helpful indexes
create index if not exists idx_mcq_items_user_id on public.mcq_items(user_id);
create index if not exists idx_mcq_items_labels_gin on public.mcq_items using gin (labels);
create index if not exists idx_mcq_items_topic on public.mcq_items(topic);
create index if not exists idx_mcq_items_subtopic on public.mcq_items(subtopic);
create index if not exists idx_mcq_items_version on public.mcq_items(version);

-- RLS
alter table public.mcq_items enable row level security;
alter table public.mcq_explanations enable row level security;

drop policy if exists "mcq_items_select" on public.mcq_items;
create policy "mcq_items_select" on public.mcq_items for select using (user_id = auth.uid());

drop policy if exists "mcq_items_modify" on public.mcq_items;
create policy "mcq_items_modify" on public.mcq_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "mcq_explanations_select" on public.mcq_explanations;
create policy "mcq_explanations_select" on public.mcq_explanations for select using (
  exists (
    select 1 from public.mcq_items m where m.id = mcq_explanations.mcq_id and m.user_id = auth.uid()
  )
);

drop policy if exists "mcq_explanations_modify" on public.mcq_explanations;
create policy "mcq_explanations_modify" on public.mcq_explanations for all using (
  exists (
    select 1 from public.mcq_items m where m.id = mcq_explanations.mcq_id and m.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.mcq_items m where m.id = mcq_explanations.mcq_id and m.user_id = auth.uid()
  )
);

-- Label-based hybrid retrieval function for repo/web ingested content
create or replace function public.retrieval_hybrid_by_labels(
  p_user_id uuid,
  p_topic text,
  p_query_embedding vector(1536),
  p_query_text text,
  p_subtopic text default null,
  p_version text default null,
  p_topk integer default 12,
  p_alpha double precision default 0.5
)
returns table (
  document_id uuid,
  chunk_index int,
  content text,
  tokens int,
  score double precision,
  title text,
  bucket text,
  path text
)
language sql
stable
as $$
  with candidates as (
    select d.id as document_id, d.title, d.bucket, d.path
    from public.documents d
    join public.ingestions i on d.ingestion_id = i.id
    where i.user_id = p_user_id
      and coalesce(d.labels->>'topic', '') = p_topic
      and (p_subtopic is null or coalesce(d.labels->>'subtopic','') = p_subtopic)
      and (p_version is null or coalesce(d.labels->>'version','') = p_version)
  ),
  vec as (
    select c.document_id,
           c.chunk_index,
           1.0 / (1.0 + (c.embedding <-> p_query_embedding)) as v_score,
           c.content,
           c.tokens
    from public.document_chunks c
    join candidates cand on cand.document_id = c.document_id
  ),
  fts as (
    select c.document_id,
           c.chunk_index,
           ts_rank(
             to_tsvector('english', c.content),
             plainto_tsquery('english', coalesce(p_query_text, ''))
           ) as k_rank
    from public.document_chunks c
    join candidates cand on cand.document_id = c.document_id
  ),
  fts_norm as (
    select f.document_id,
           f.chunk_index,
           case when max(f.k_rank) over () > 0 then f.k_rank / max(f.k_rank) over () else 0 end as k_score
    from fts f
  ),
  fused as (
    select v.document_id,
           v.chunk_index,
           v.content,
           v.tokens,
           (p_alpha * v.v_score + (1 - p_alpha) * coalesce(n.k_score, 0)) as fused_score
    from vec v
    left join fts_norm n on n.document_id = v.document_id and n.chunk_index = v.chunk_index
  )
  select f.document_id,
         f.chunk_index,
         f.content,
         f.tokens,
         f.fused_score as score,
         d.title,
         d.bucket,
         d.path
  from fused f
  join public.documents d on d.id = f.document_id
  order by f.fused_score desc
  limit p_topk;
$$;


