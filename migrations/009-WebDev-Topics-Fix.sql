-- 009-WebDev-Topics-Fix.sql
-- Purpose: Correct mis-labeled topics for web.dev/learn pages to HTML/CSS/PWA
-- Notes: This migration captures the backfill that was applied manually. Do not modify past migrations.

-- Update documents.labels.topic for web.dev learn pages
WITH updates AS (
  SELECT id,
         CASE
           WHEN path LIKE 'https://web.dev/learn/html%' THEN 'HTML'
           WHEN path LIKE 'https://web.dev/learn/css%' THEN 'CSS'
           WHEN path LIKE 'https://web.dev/learn/pwa%' THEN 'PWA'
           ELSE (labels->>'topic')
         END AS new_topic
  FROM documents
  WHERE path LIKE 'https://web.dev/learn/%'
)
UPDATE documents d
SET labels = jsonb_set(coalesce(d.labels, '{}'::jsonb), '{topic}', to_jsonb(u.new_topic::text), true)
FROM updates u
WHERE d.id = u.id
  AND coalesce(d.labels->>'topic','') IS DISTINCT FROM u.new_topic;

-- Update document_chunks.labels.topic accordingly
UPDATE document_chunks dc
SET labels = jsonb_set(
  coalesce(dc.labels, '{}'::jsonb),
  '{topic}',
  to_jsonb(
    CASE
      WHEN d.path LIKE 'https://web.dev/learn/html%' THEN 'HTML'
      WHEN d.path LIKE 'https://web.dev/learn/css%' THEN 'CSS'
      WHEN d.path LIKE 'https://web.dev/learn/pwa%' THEN 'PWA'
      ELSE coalesce(dc.labels->>'topic','')
    END::text
  ),
  true
)
FROM documents d
WHERE dc.document_id = d.id
  AND d.path LIKE 'https://web.dev/learn/%'
  AND coalesce(dc.labels->>'topic','') IS DISTINCT FROM (
    CASE
      WHEN d.path LIKE 'https://web.dev/learn/html%' THEN 'HTML'
      WHEN d.path LIKE 'https://web.dev/learn/css%' THEN 'CSS'
      WHEN d.path LIKE 'https://web.dev/learn/pwa%' THEN 'PWA'
      ELSE coalesce(dc.labels->>'topic','')
    END
  );


