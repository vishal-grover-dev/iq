# API for Upload & Embeddings (v1)

## Summary

- Purpose: Persist upload metadata, then generate text chunks and vector embeddings into pgvector (Supabase).
  - Embeddings provider: OpenAI `text-embedding-3-small` (1536-d) via server-only OpenAI SDK.
  - Keep the embedding dimension standardized at 1536 to match database schema and retrieval.

## API Endpoint

- Method: POST
- Path: `/api/ingest/academic`****
- Auth: Supabase Auth (user must be authenticated). Attach JWT in cookies/headers.
- Input: JSON (multipart not required here; files are already uploaded to Storage via browser anon key).

### Request Body
****
Includes the following top-level fields:

- contentCategory: text; e.g., Academic.
- metadata: json object; category-specific fields. For Academic, expects keys such as board, grade, subject, resourceType, chapterNumber (optional), chapterName (optional). For other categories (e.g., Video Subtitles), the shape can differ without schema migration.
- uploadedObjects: array of objects containing originalFileName, storagePath, bucket.

Notes:

- `storagePath` is the object key returned by `uploadAcademicFiles`, derived from `buildAcademicDirectoryPath(ctx) + fileNameWithTimestamp(name)`.
- Bucket name: hard-coded constant (per project rule).

### Response

On success:

- ok: boolean
- ingestionId: uuid string
- message: string
- chunks: number (total chunks processed)
- vectors: number (total vectors stored)

On error:

## Data Model (DB)

- Table: `ingestions`

  - `id` uuid (pk, default gen_random_uuid())
  - `created_at` timestamptz default now()
  - `user_id` uuid (references auth.users)
  - `content_category` text
  - `metadata` jsonb (category-specific fields; for Academic: { board, grade, subject, resourceType, chapterNumber?, chapterName? })
  - `objects` jsonb (array of { originalFileName, bucket, storagePath })
  - `status` text check in ('pending','processing','completed','failed') default 'pending'
  - `error` text null

- Table: `documents`

  - `id` uuid (pk)
  - `ingestion_id` uuid (fk -> ingestions.id)
  - `bucket` text
  - `path` text
  - `mime_type` text
  - `num_pages` int null
  - `title` text null

- Table: `document_chunks`
  - `id` uuid (pk)
  - `document_id` uuid (fk -> documents.id)
  - `chunk_index` int
  - `content` text
  - `tokens` int
  - `embedding` vector(1536) — matches OpenAI `text-embedding-3-small` output dimension

Suggested RLS:

- `ingestions.user_id = auth.uid()` for row access; `documents` and `document_chunks` inherit via join on `ingestion_id`.

## Pipeline

1. Persist `ingestions` row with `status='pending'`.
2. Insert `documents` for each uploaded object.
3. Enqueue background task (or do inline for v1 small PDFs):
   - Fetch file from Supabase Storage (service role)
   - Parse to text (PDF.js for PDF; DOCX via Mammoth later)
   - Chunk text (LangChain `RecursiveCharacterTextSplitter` 1–2k chars, 10–15% overlap)
   - Get embeddings with OpenAI `text-embedding-3-small` (1536-d) via server OpenAI SDK
   - Upsert to `document_chunks` (content, tokens, embedding)
4. Update `ingestions.status='completed'` and return summary.

## Implementation Notes

- Storage bucket constant: use `SUPABASE_RAG_BUCKET`.
- Path building: `buildAcademicDirectoryPath(ctx)` already used in `upload.services.ts`.
- Client upload remains on the browser using anon key; the API only reads metadata and performs ingestion.
- Use Supabase server client with Service Role for Storage reads and DB writes.

## Embedding Model

- OpenAI `text-embedding-3-small` (1536-d) — Standard for this project. Use for both indexing and queries.

Notes:

- Standardize on a single embedding space across indexing and queries. Project default: 1536‑d. If changing providers/models, create a new migration.

## Pseudocode (Next.js Route Handler)

## Client Flow

- After `uploadAcademicFiles` completes, call `POST /api/ingest/academic` with the metadata + uploaded object info.
- On 200 OK, show success toast and navigate/CTA to Questions page.

## Open Questions / v2

- Background queue for large docs.
- Support DOCX, images (OCR), subtitles.
- Switch to a stronger reranker for retrieval.
