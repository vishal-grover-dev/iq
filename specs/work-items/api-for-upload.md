# API for Upload & Embeddings (v1)

## Summary

- Purpose: Persist upload metadata, then generate text chunks and vector embeddings into pgvector (Supabase).
  - Embeddings provider: Hugging Face Inference API using Mixedbread "MxBai Embed Large V1" (1024-d) via a server-only HTTP client (axios interceptors).
  - Keep the embedding dimension standardized at 1024 to match database schema and retrieval.

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
  - `embedding` vector(1024) — matches Mixedbread MxBai Embed Large V1 output dimension

Suggested RLS:

- `ingestions.user_id = auth.uid()` for row access; `documents` and `document_chunks` inherit via join on `ingestion_id`.

## Pipeline

1. Persist `ingestions` row with `status='pending'`.
2. Insert `documents` for each uploaded object.
3. Enqueue background task (or do inline for v1 small PDFs):
   - Fetch file from Supabase Storage (service role)
   - Parse to text (PDF.js for PDF; DOCX via Mammoth later)
   - Chunk text (LangChain `RecursiveCharacterTextSplitter` 1–2k chars, 10–15% overlap)
   - Get embeddings with Hugging Face Inference (MxBai Embed Large V1, 1024-d) via server-only axios client
   - Upsert to `document_chunks` (content, tokens, embedding)
4. Update `ingestions.status='completed'` and return summary.

## Implementation Notes

- Storage bucket constant: use `SUPABASE_RAG_BUCKET`.
- Path building: `buildAcademicDirectoryPath(ctx)` already used in `upload.services.ts`.
- Client upload remains on the browser using anon key; the API only reads metadata and performs ingestion.
- Use Supabase server client with Service Role for Storage reads and DB writes.

## Embedding Models (HF/OR)

- mxbai-embed-large (Mixedbread, 1024-d) — Standard for this project. Use Hugging Face Inference by default.
- BAAI/bge-m3 (BAAI, 1024-d): All‑in‑one family; solid semantic embeddings.
- nomic-ai/nomic-embed-text-v1.5 (Nomic, 768-d): Lightweight; good cost/quality tradeoff.
- jinaai/jina-embeddings-v2-base-en (Jina, 768-d): Competitive on MTEB; English-focused.
- Snowflake/snowflake-arctic-embed-l (1024-d): High-quality, permissive license.

Notes:

- Standardize on a single embedding space across indexing and queries. Project default: 1024‑d (mxbai/bge‑m3/arctic‑embed‑l). If switching to 768‑d (nomic/jina), migrate the column to `vector(768)`.
- "Free" status on OpenRouter can change; prefer Hugging Face for embeddings by default. Probe availability and fall back between HF and OR as needed.

## Pseudocode (Next.js Route Handler)

## Client Flow

- After `uploadAcademicFiles` completes, call `POST /api/ingest/academic` with the metadata + uploaded object info.
- On 200 OK, show success toast and navigate/CTA to Questions page.

## Open Questions / v2

- Background queue for large docs.
- Support DOCX, images (OCR), subtitles.
- Switch to a stronger reranker for retrieval.
