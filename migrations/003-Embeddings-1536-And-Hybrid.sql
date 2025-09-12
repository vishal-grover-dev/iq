-- Combined migration: switch to 1536-d embeddings and add hybrid retrieval

-- 1) Ensure FTS index on content
create index if not exists idx_chunks_content_fts
  on public.document_chunks
  using gin (to_tsvector('english', content));

-- 2) Switch embeddings to 1536-d (clean replace of old 1024-d column)
drop index if exists idx_chunks_embedding_ivfflat;
alter table if exists public.document_chunks drop column if exists embedding;
alter table if exists public.document_chunks add column embedding vector(1536) not null;
create index if not exists idx_chunks_embedding_ivfflat
  on public.document_chunks using ivfflat (embedding vector_l2_ops) with (lists = 100);

-- 3) Hybrid retrieval function updated to 1536-d query embedding
create or replace function public.retrieval_hybrid(
  p_user_id uuid,
  p_board text,
  p_grade text,
  p_subject text,
  p_query_embedding vector(1536),
  p_query_text text,
  p_resource_type text default null,
  p_chapter_number text default null,
  p_chapter_name text default null,
  p_topk integer default 8,
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
      and i.metadata->>'board' = p_board
      and i.metadata->>'grade' = p_grade
      and i.metadata->>'subject' = p_subject
      and (p_resource_type is null or i.metadata->>'resourceType' = p_resource_type)
      and (p_chapter_number is null or i.metadata->>'chapterNumber' = p_chapter_number)
      and (p_chapter_name is null or i.metadata->>'chapterName' = p_chapter_name)
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


