-- MCQ embeddings + content-key for near-duplicate prevention
alter table if exists public.mcq_items
  add column if not exists embedding vector(1536),
  add column if not exists content_key text;

create unique index if not exists uq_mcq_items_content_key
  on public.mcq_items(content_key)
  where content_key is not null;

-- Recommended ANN index (requires pgvector); tune lists as needed
create index if not exists idx_mcq_items_embedding
  on public.mcq_items using ivfflat (embedding vector_l2_ops) with (lists = 100);

-- Neighbor search for semantic duplicate detection
create or replace function public.retrieval_mcq_neighbors(
  p_user_id uuid,
  p_topic text,
  p_embedding vector(1536),
  p_subtopic text default null,
  p_topk integer default 10
)
returns table (
  mcq_id uuid,
  topic text,
  subtopic text,
  difficulty text,
  bloom_level text,
  question text,
  options text[],
  score double precision
)
language sql
stable
as $$
  select
    m.id as mcq_id,
    m.topic,
    m.subtopic,
    m.difficulty,
    m.bloom_level,
    m.question,
    m.options,
    1.0 / (1.0 + (m.embedding <-> p_embedding)) as score
  from public.mcq_items m
  where m.user_id = p_user_id
    and m.topic = p_topic
    and (p_subtopic is null or coalesce(m.subtopic,'') = p_subtopic)
    and m.embedding is not null
  order by m.embedding <-> p_embedding asc
  limit p_topk;
$$;


