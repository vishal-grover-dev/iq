-- Migration 011: Fix React useMemo/useCallback Hook Labels
-- Date: 2025-09-30
-- Issue: useMemo and useCallback docs were mislabeled as "Hooks: useState"
-- Impact: 2 documents, 33 chunks

-- Update useMemo document label
UPDATE documents 
SET labels = jsonb_set(labels, '{subtopic}', '"Hooks: useMemo"')
WHERE bucket = 'web' 
  AND path = 'https://react.dev/reference/react/useMemo'
  AND labels->>'topic' = 'React';

-- Update useCallback document label
UPDATE documents 
SET labels = jsonb_set(labels, '{subtopic}', '"Hooks: useCallback"')
WHERE bucket = 'web' 
  AND path = 'https://react.dev/reference/react/useCallback'
  AND labels->>'topic' = 'React';

-- Update useMemo document_chunks labels
UPDATE document_chunks 
SET labels = jsonb_set(labels, '{subtopic}', '"Hooks: useMemo"')
WHERE document_id IN (
  SELECT id FROM documents 
  WHERE bucket = 'web' 
    AND path = 'https://react.dev/reference/react/useMemo'
    AND labels->>'topic' = 'React'
);

-- Update useCallback document_chunks labels
UPDATE document_chunks 
SET labels = jsonb_set(labels, '{subtopic}', '"Hooks: useCallback"')
WHERE document_id IN (
  SELECT id FROM documents 
  WHERE bucket = 'web' 
    AND path = 'https://react.dev/reference/react/useCallback'
    AND labels->>'topic' = 'React'
);

-- Verification: Show updated labels and chunk counts
SELECT 
  labels->>'subtopic' as subtopic,
  title,
  path,
  (SELECT COUNT(*) FROM document_chunks c WHERE c.document_id = d.id) as chunk_count
FROM documents d
WHERE d.path IN (
  'https://react.dev/reference/react/useMemo',
  'https://react.dev/reference/react/useCallback'
)
ORDER BY path;
