-- Add labels column for categorization of repo/web ingested content
alter table if exists public.documents add column if not exists labels jsonb;
alter table if exists public.document_chunks add column if not exists labels jsonb;

-- Helpful index on labels keys used for filtering
create index if not exists idx_documents_labels_gin on public.documents using gin (labels);
create index if not exists idx_chunks_labels_gin on public.document_chunks using gin (labels);
