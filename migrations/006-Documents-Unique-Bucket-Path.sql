-- Add a unique index to prevent duplicate documents per bucket/path
-- Do not alter existing migrations; append a new one per project rules.

do $$ begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'documents'
      and indexname = 'ux_documents_bucket_path'
  ) then
    create unique index ux_documents_bucket_path on public.documents(bucket, path);
  end if;
end $$;


