-- Create uploads bucket if it does not exist
-- This script is idempotent where possible.

-- 1) Ensure the bucket exists
insert into storage.buckets (id, name, public)
select 'academics', 'academics', true
where not exists (
  select 1 from storage.buckets where id = 'academics'
);

-- 2) Enable RLS for storage.objects (RLS is enabled by default). Keep note.
-- alter table storage.objects enable row level security;

-- 3) Policies: public read
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public read for academics'
  ) then
    create policy "Public read for academics"
      on storage.objects for select
      using (
        bucket_id = 'academics'
      );
  end if;
end $$;

-- 4) Policies: authenticated insert (browser session required)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated can upload to academics'
  ) then
    create policy "Authenticated can upload to academics"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'academics'
      );
  end if;
end $$;

-- 5) Policies: authenticated update and delete (optional)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated can update academics'
  ) then
    create policy "Authenticated can update academics"
      on storage.objects for update
      to authenticated
      using (
        bucket_id = 'academics'
      )
      with check (
        bucket_id = 'academics'
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated can delete academics'
  ) then
    create policy "Authenticated can delete academics"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'academics'
      );
  end if;
end $$;


