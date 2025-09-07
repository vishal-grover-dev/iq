-- Enable required extensions (idempotent)
create extension if not exists pgcrypto;
create extension if not exists vector;

-- Ingestions table
create table if not exists public.ingestions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null,
  content_category text not null,
  metadata jsonb not null,
  objects jsonb not null,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  error text null
);

-- Documents table
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  ingestion_id uuid not null references public.ingestions(id) on delete cascade,
  bucket text not null,
  path text not null,
  mime_type text null,
  num_pages int null,
  title text null
);

-- Document chunks with 1024-d embeddings for mxbai-embed-large-v1
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  tokens int not null,
  embedding vector(1024) not null
);

-- Indexes
create index if not exists idx_ingestions_user_id on public.ingestions(user_id);
create index if not exists idx_documents_ingestion_id on public.documents(ingestion_id);
create index if not exists idx_chunks_document_id on public.document_chunks(document_id);
create index if not exists idx_chunks_doc_chunk_index on public.document_chunks(document_id, chunk_index);
create index if not exists idx_chunks_embedding_ivfflat on public.document_chunks using ivfflat (embedding vector_l2_ops) with (lists = 100);

-- RLS policies
alter table public.ingestions enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;

-- Base RLS policies (assumes auth.uid())
drop policy if exists "ingestions_select" on public.ingestions;
create policy "ingestions_select" on public.ingestions for select using (user_id = auth.uid());

drop policy if exists "ingestions_modify" on public.ingestions;
create policy "ingestions_modify" on public.ingestions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "documents_select" on public.documents;
create policy "documents_select" on public.documents for select using (
  exists (
    select 1 from public.ingestions i where i.id = documents.ingestion_id and i.user_id = auth.uid()
  )
);

drop policy if exists "documents_modify" on public.documents;
create policy "documents_modify" on public.documents for all using (
  exists (
    select 1 from public.ingestions i where i.id = documents.ingestion_id and i.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.ingestions i where i.id = documents.ingestion_id and i.user_id = auth.uid()
  )
);

drop policy if exists "chunks_select" on public.document_chunks;
create policy "chunks_select" on public.document_chunks for select using (
  exists (
    select 1 from public.documents d join public.ingestions i on d.ingestion_id = i.id
    where d.id = document_chunks.document_id and i.user_id = auth.uid()
  )
);

drop policy if exists "chunks_modify" on public.document_chunks;
create policy "chunks_modify" on public.document_chunks for all using (
  exists (
    select 1 from public.documents d join public.ingestions i on d.ingestion_id = i.id
    where d.id = document_chunks.document_id and i.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.documents d join public.ingestions i on d.ingestion_id = i.id
    where d.id = document_chunks.document_id and i.user_id = auth.uid()
  )
);



-- Storage: Ensure RAG bucket and policies
insert into storage.buckets (id, name, public)
select 'rag', 'rag', true
where not exists (
  select 1 from storage.buckets where id = 'rag'
);

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public read for rag'
  ) then
    create policy "Public read for rag"
      on storage.objects for select
      using (
        bucket_id = 'rag'
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated can upload to rag'
  ) then
    create policy "Authenticated can upload to rag"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'rag'
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated can update rag'
  ) then
    create policy "Authenticated can update rag"
      on storage.objects for update
      to authenticated
      using (
        bucket_id = 'rag'
      )
      with check (
        bucket_id = 'rag'
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated can delete rag'
  ) then
    create policy "Authenticated can delete rag"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'rag'
      );
  end if;
end $$;

-- DEV ONLY: Allow public insert to rag bucket (remove in production)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public can upload to rag (DEV)'
  ) then
    create policy "Public can upload to rag (DEV)"
      on storage.objects for insert
      to public
      with check (
        bucket_id = 'rag'
      );
  end if;
end $$;

